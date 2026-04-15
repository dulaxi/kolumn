-- Purge former workspace member names from card assignees.
--
-- Context: assignees are stored as display-name strings (not user ids) so
-- free-text external collaborators like "Legal team" can be assigned.
-- When a real member leaves or is removed from a workspace, their name
-- stayed on every card they were assigned to — indistinguishable from a
-- legitimate external in the picker.
--
-- This migration installs two things:
--   1) A trigger that removes the leaving user's current display_name from
--      `cards.assignees` on every board in that workspace, plus clears the
--      legacy `assignee_name` column when it matches.
--   2) A one-shot retro cleanup for existing stale assignments on workspace
--      boards.
--
-- Tradeoff: a legit external whose name exactly matches an ex-member will
-- also be removed. User can re-add via free-text in the assignee picker.

CREATE OR REPLACE FUNCTION public.purge_leaver_from_workspace_cards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  leaver_name text;
BEGIN
  SELECT display_name INTO leaver_name FROM public.profiles WHERE id = OLD.user_id;
  IF leaver_name IS NULL OR leaver_name = '' THEN
    RETURN OLD;
  END IF;

  UPDATE public.cards
  SET
    assignees = array_remove(assignees, leaver_name),
    assignee_name = CASE
      WHEN assignee_name = leaver_name THEN ''
      ELSE assignee_name
    END
  WHERE board_id IN (
    SELECT id FROM public.boards WHERE workspace_id = OLD.workspace_id
  )
  AND (leaver_name = ANY(assignees) OR assignee_name = leaver_name);

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_workspace_member_leave_purge_cards ON public.workspace_members;
CREATE TRIGGER on_workspace_member_leave_purge_cards
AFTER DELETE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.purge_leaver_from_workspace_cards();

-- Retro cleanup: strip assignee names that aren't current workspace members
-- from cards on all existing workspace boards.
WITH current_member_names AS (
  SELECT DISTINCT b.id AS board_id, p.display_name
  FROM public.boards b
  JOIN public.workspace_members wm ON wm.workspace_id = b.workspace_id
  JOIN public.profiles p ON p.id = wm.user_id
  WHERE b.workspace_id IS NOT NULL AND p.display_name IS NOT NULL AND p.display_name <> ''
),
card_cleanup AS (
  SELECT
    c.id,
    COALESCE(
      ARRAY_AGG(a) FILTER (
        WHERE a IN (SELECT display_name FROM current_member_names WHERE board_id = c.board_id)
      ),
      '{}'
    ) AS kept_assignees
  FROM public.cards c
  JOIN public.boards b ON b.id = c.board_id
  LEFT JOIN LATERAL unnest(c.assignees) AS a ON true
  WHERE b.workspace_id IS NOT NULL
  GROUP BY c.id
)
UPDATE public.cards c
SET
  assignees = cc.kept_assignees,
  assignee_name = CASE
    WHEN cc.kept_assignees = '{}' THEN ''
    WHEN c.assignee_name = ANY(cc.kept_assignees) THEN c.assignee_name
    ELSE cc.kept_assignees[1]
  END
FROM card_cleanup cc
WHERE c.id = cc.id
  AND c.assignees IS DISTINCT FROM cc.kept_assignees;
