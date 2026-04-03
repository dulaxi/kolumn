-- Migration: Auto-create "Getting Started" tutorial board for new users
-- This replaces the client-side createSampleBoard logic with a database trigger.

create or replace function public.create_getting_started_board()
returns trigger as $$
declare
  board_id uuid := gen_random_uuid();
  try_col_id uuid := gen_random_uuid();
  prog_col_id uuid := gen_random_uuid();
  almost_col_id uuid := gen_random_uuid();
  done_col_id uuid := gen_random_uuid();
  display_name text;
  tomorrow text;
begin
  display_name := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));
  tomorrow := to_char(now() + interval '1 day', 'YYYY-MM-DD') || 'T23:59:59';

  -- Create board (handle_new_board trigger auto-adds owner to board_members)
  insert into public.boards (id, name, icon, owner_id, next_task_number)
  values (board_id, 'Getting Started', 'Target', new.id, 10);

  -- Create columns
  insert into public.columns (id, board_id, title, position) values
    (try_col_id, board_id, 'Try These', 0),
    (prog_col_id, board_id, 'In Progress', 1),
    (almost_col_id, board_id, 'Almost There', 2),
    (done_col_id, board_id, 'Done', 3);

  -- Create tutorial cards
  insert into public.cards (board_id, column_id, position, task_number, global_task_number, title, description, assignee_name, priority, due_date, icon, labels, checklist, completed) values
    (board_id, try_col_id, 0, 1, 1, 'Drag me to In Progress →',
     'Click and drag cards between columns to update their status. Try moving this card to the next column.',
     display_name, 'high', tomorrow::timestamptz, 'GripVertical',
     '[{"text":"Start Here","color":"blue"}]'::jsonb, '[]'::jsonb, false),

    (board_id, try_col_id, 1, 2, 2, 'Click me to see the detail panel',
     'Cards expand into a detail panel where you can edit everything — description, labels, due dates, checklists, and more.',
     '', 'medium', null, 'PanelRight',
     '[{"text":"Explore","color":"purple"}]'::jsonb, '[]'::jsonb, false),

    (board_id, try_col_id, 2, 3, 3, 'Try checking off items below',
     '', '', 'medium', null, 'ListChecks',
     '[{"text":"Checklist","color":"green"}]'::jsonb,
     '[{"text":"Check this item off","done":true},{"text":"Then this one","done":false},{"text":"And this one too","done":false}]'::jsonb, false),

    (board_id, try_col_id, 3, 4, 4, 'Create your own card',
     'Hit the + button at the bottom of any column, or press N anywhere on the board.',
     '', 'medium', null, 'Plus',
     '[{"text":"Your Turn","color":"yellow"}]'::jsonb, '[]'::jsonb, false),

    (board_id, prog_col_id, 0, 5, 5, 'Invite a teammate',
     'Click "Share" in the top bar to invite someone by email. You can collaborate on boards in real time.',
     display_name, 'medium', null, 'UserPlus',
     '[{"text":"Collaborate","color":"pink"}]'::jsonb, '[]'::jsonb, false),

    (board_id, prog_col_id, 1, 6, 6, 'Set a due date on this card',
     'Open this card and pick a date — it will show up on the calendar and dashboard timeline.',
     '', 'medium', null, 'CalendarDays',
     '[{"text":"Your Turn","color":"yellow"}]'::jsonb, '[]'::jsonb, false),

    (board_id, almost_col_id, 0, 7, 7, 'Visit the Dashboard',
     'Check out your stats, calendar heatmap, and daily streak. It updates as you complete tasks.',
     '', 'medium', null, 'LayoutDashboard',
     '[{"text":"Explore","color":"purple"}]'::jsonb, '[]'::jsonb, false),

    (board_id, almost_col_id, 1, 8, 8, 'Add a label to any card',
     'Open a card, scroll to Labels, pick a color and type a name. Labels help you filter tasks.',
     '', 'medium', null, 'Tag',
     '[{"text":"Feature","color":"blue"},{"text":"Labels","color":"green"},{"text":"Like These","color":"red"}]'::jsonb, '[]'::jsonb, false),

    (board_id, done_col_id, 0, 9, 9, 'Sign up for Kolumn',
     '', '', 'medium', null, 'PartyPopper',
     '[{"text":"Setup","color":"green"}]'::jsonb, '[]'::jsonb, true);

  return new;
end;
$$ language plpgsql security definer;

-- Fire after the profile trigger so display_name is available
create trigger on_auth_user_created_getting_started
  after insert on auth.users
  for each row execute function public.create_getting_started_board();
