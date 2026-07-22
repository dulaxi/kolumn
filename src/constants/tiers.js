// User-facing tier copy for the Billing pane.
//
// Numbers/claims here mirror two sources of truth — keep both in sync if
// either changes:
//   - supabase/functions/chat/tier.ts (FREE_DAILY_LIMIT = 20; PRO_ONLY_TOOLS
//     gates which of the AI tools free users can reach)
//   - src/data/plans.js (canonical marketing bullets for the pricing/
//     onboarding plan cards — reused verbatim/condensed here so this copy
//     never drifts from what we sell)
export const TIERS = {
  free: {
    label: 'Free',
    includes: 'AI card creation — 20 messages/day · unlimited boards & cards · real-time collaboration',
  },
  pro: {
    label: 'Pro',
    includes: 'Unlimited AI messages · Claude can move, update, and reorganize cards · priority support',
  },
  team: {
    label: 'Team',
    includes: 'Everything in Pro · multiple workspaces with shared boards · member roles & admin controls',
  },
}
