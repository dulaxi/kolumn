// Content for /blog (index) and /blog/<slug> (post). Plain JS data, no
// markdown loader — see src/content/tutorials.js for the same convention.
// Posts are undated on purpose: no fabricated publication dates or author
// names. Body blocks are consumed by src/components/marketing/Prose.jsx.
//
// Feature claims here are checked against docs/superpowers/specs/marketing/
// _KOLUMN-BRIEF.md: chat is read-only, notes/transcripts are pasted (never
// "connected"), and SOC 2 / formal compliance status is stated as unknown,
// not promised.

export const BLOG_TAGS = [
  { id: 'product', label: 'Product' },
  { id: 'engineering', label: 'Engineering' },
]

export const BLOG_POSTS = [
  {
    slug: 'why-kolumn-stayed-a-kanban',
    title: 'Why Kolumn stayed a kanban',
    summary:
      'Every project tool grows fields, views, and rituals until the board is the least-used screen. We kept the board and moved the busywork to the AI instead.',
    tag: 'product',
    icon: 'Kanban',
    body: [
      {
        type: 'paragraph',
        text: 'Most project management tools start as a board and end as a configuration surface: custom fields, saved views, automation rules, a workflow you have to diagram before anyone can use it. Somewhere in that growth the board itself — the thing you actually look at every day — becomes the least-used screen in the app.',
      },
      { type: 'heading', level: 2, text: 'What we didn’t add' },
      {
        type: 'list',
        items: [
          'No custom-field builder. A card has a title, description, icon, priority, due date, labels, a checklist, and assignees — the same fields on every board, on purpose.',
          'No second view. There is one board view: columns and cards. Nothing to switch between, nothing to keep in sync.',
          'No workflow rules to configure before the board is useful. You can drag a card into a column on the first minute you open Kolumn.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Ruling those out was not a technical limitation — it was the decision that shaped everything else. If a feature only pays off after setup, it doesn’t ship.',
      },
      { type: 'heading', level: 2, text: 'What we added instead' },
      {
        type: 'paragraph',
        text: 'The busywork that used to justify custom fields — turning a meeting note into three tasks, moving a batch of cards, summarizing what changed this week — goes to the AI instead. The pill on every board takes plain language and does the typing. Chat answers questions about your boards without touching them. Neither one adds a new surface to the board itself; they operate the same columns and cards you’d edit by hand.',
      },
      {
        type: 'paragraph',
        text: 'The result is a board that still looks like a board a year in, because there was never a reason to make it look like anything else.',
      },
    ],
  },
  {
    slug: 'how-the-pill-decides',
    title: 'How the pill decides whether to call the AI',
    summary:
      'Line breaks and commas are handled locally; anything that reads like an instruction goes to the model. The heuristic, the cases it gets wrong, and why it’s still a regex.',
    tag: 'engineering',
    icon: 'TextAa',
    body: [
      {
        type: 'paragraph',
        text: 'The pill on every board looks like one text field, but it has two completely different code paths behind it. One is a few lines of string splitting that runs in the browser. The other is a round trip to the model. Deciding which one to use, correctly, before the request goes anywhere, is most of the interesting work.',
      },
      { type: 'heading', level: 2, text: 'The fast path' },
      {
        type: 'paragraph',
        text: 'If the text you paste has line breaks, the pill splits on them and creates one card per line — no AI call, no waiting, no message spent. If it has commas instead, the pill splits on those the same way, as long as the text looks like a list:',
      },
      { type: 'code', text: 'Order lanyards, confirm the caterer, print name badges' },
      {
        type: 'paragraph',
        text: 'Three cards, instantly. This path exists because most of what people paste into a task box already is a list — a set of things copied out of a doc or an email — and running that through a model would be slower and less predictable than just splitting the string.',
      },
      { type: 'heading', level: 2, text: 'When it goes to the model' },
      {
        type: 'paragraph',
        text: 'The fast path backs off the moment a comma-separated line looks like a sentence instead of a list — specifically, when it starts with something that reads as an instruction: “Add…”, “Create…”, “Make…”, “New…”, or “I need/want/would…”. That heuristic exists because a sentence like this one is not a list, even though it has commas in it:',
      },
      { type: 'code', text: 'Add a card to follow up with the venue about parking, due Friday, high priority' },
      {
        type: 'paragraph',
        text: 'Splitting that on commas would produce three garbled cards instead of one correct one. Recognizing the leading verb and handing the whole sentence to the model instead is what gets the due date and the priority set correctly on a single card.',
      },
      { type: 'heading', level: 2, text: 'Where it gets it wrong' },
      {
        type: 'paragraph',
        text: 'A list whose first item happens to start with “Add” — “Add the new hire, review benefits, order a laptop” — reads as prose to the heuristic and goes to the model as one request, even though a human would probably have meant three separate cards. The model usually recovers by making three cards anyway, but it’s an extra round trip the fast path was supposed to avoid.',
      },
      { type: 'heading', level: 2, text: 'Why a regex' },
      {
        type: 'paragraph',
        text: 'It would be easy to reach for a small classifier here, and at some point that might be the right call. For now the failure cases are rare enough, and cheap enough to recover from, that a readable regex the whole team can reason about beats a model call that decides whether to make a model call.',
      },
    ],
  },
  {
    slug: 'what-we-dont-do-with-your-boards',
    title: 'What we don’t do with your boards',
    summary:
      'Row-level security on every table, members-only access, export and delete in Settings, and no training on your content. The specifics, and the one thing we can’t promise yet.',
    tag: 'engineering',
    icon: 'ShieldCheck',
    body: [
      {
        type: 'paragraph',
        text: 'A privacy page tends to be a list of promises. This is closer to a list of mechanisms — the specific things that make each promise true, so you don’t have to take our word for it.',
      },
      { type: 'heading', level: 2, text: 'Row-level security on every table' },
      {
        type: 'paragraph',
        text: 'Boards, columns, cards, notes, workspaces — every table that holds your data has row-level security policies in Postgres, enforced by the database itself, not by application code that could have a bug in it. A query for a board you’re not a member of returns nothing, at the database layer, regardless of what the client asks for.',
      },
      { type: 'heading', level: 2, text: 'Members-only access' },
      {
        type: 'paragraph',
        text: 'A board is visible only to the people added to it, either directly or through a workspace. There is no public-by-default board, no shareable link that bypasses membership, no admin view of other people’s boards.',
      },
      { type: 'heading', level: 2, text: 'Export and delete' },
      {
        type: 'paragraph',
        text: 'Settings has both, and neither requires contacting anyone. You can export your data or delete your account yourself, whenever you want.',
      },
      { type: 'heading', level: 2, text: 'What we can’t promise yet' },
      {
        type: 'paragraph',
        text: 'We don’t train models on your board content. What we haven’t done is complete a formal third-party compliance audit — SOC 2 or similar. If that’s a requirement for your team, ask us directly and we’ll tell you honestly where things stand rather than imply a certification we don’t have.',
      },
    ],
  },
]

export function getPost(slug) {
  return BLOG_POSTS.find((p) => p.slug === slug) || null
}

export function relatedPosts(post, count = 3) {
  return BLOG_POSTS.filter((p) => p.slug !== post.slug)
    .sort((a, b) => (a.tag === post.tag ? -1 : 0) - (b.tag === post.tag ? -1 : 0))
    .slice(0, count)
}
