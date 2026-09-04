// Ordered registry for /compare and /compare/<slug>. Mirrors the pattern in
// src/content/solutions/index.js. Order matches how the three competitors
// are named on the landing page FAQ and in _KOLUMN-BRIEF.md: Asana, Trello,
// Notion — kept here as Trello, Asana, Notion to match _competitor-monday.md
// §"Top-line recommendation" build order; either order is defensible, this
// one is alphabetical-ish by how the pages were built.
import * as trello from './trello'
import * as asana from './asana'
import * as notion from './notion'

export const COMPARISON_SLUGS = ['trello', 'asana', 'notion']

// Slug-keyed registry — the primary lookup used by ComparisonPage.
export const COMPARISONS = {
  trello,
  asana,
  notion,
}

// Ordered list form, for the /compare hub grid and marketing-routes.js.
export const COMPARISONS_LIST = COMPARISON_SLUGS.map((slug) => COMPARISONS[slug])
