import { lazy } from 'react'
import { PRICING, pricingJsonLd } from './pricing'
import { FEATURES_HUB, FEATURE_PAGES } from './features'
import { SOLUTIONS_LIST } from './solutions'
import { TEMPLATES } from './templates'
import { COMPARISONS_LIST } from './comparisons'
import { META as CONNECTORS_META, connectorsJsonLd } from './connectors'
import { CUSTOMER_STORIES } from './customers'
import { TUTORIALS } from './tutorials'
import { BLOG_POSTS } from './blog'
import { SUPPORT_META, SUPPORT_CATEGORIES } from './support'
import { STATUS_META } from './status'
import { ABOUT_META } from './about'
import { CAREERS_META } from './careers'
import { SECURITY_META } from './security'
import { USAGE_POLICY } from './legal/usage-policy'
import { RESPONSIBLE_DISCLOSURE } from './legal/responsible-disclosure'
import { PRIVACY_CHOICES } from './legal/privacy-choices'

// Canonical origin for canonical/OG URLs and the sitemap. No trailing slash.
export const SITE_URL = 'https://kolumn.app'

// Public routes that exist outside this registry and may be linked from the
// marketing chrome. Anything else must be a MARKETING_ROUTES path. '/' is
// registered below (MARKETING_ROUTES) even though App.jsx routes it to
// LandingPage directly, not through MarketingLayout.
export const KNOWN_ROUTES = ['/onboarding', '/terms', '/privacy', '/#sign-in']

// ---------------------------------------------------------------------------
// Route factories. Each returns one MARKETING_ROUTES entry. `props` (when
// present) is spread onto `Component` by MarketingRoutes.jsx and
// src/prerender-entry.jsx — some detail pages read their item via useParams
// (route-shape-agnostic, see e.g. TemplatePage.jsx), but every registry
// entry here uses a literal, one-per-slug `path` (required so prerendering
// and the sitemap get a real URL + unique meta per slug, not one `:slug`
// pattern) — so those pages also accept an optional prop that overrides
// useParams. SolutionPage and LegalDocPage take their whole item as a prop
// (`solution` / `doc`) with no useParams fallback at all.
// ---------------------------------------------------------------------------

function legalRoute(path, doc) {
  return {
    path,
    title: `${doc.title} — Kolumn`,
    description: doc.description,
    Component: lazy(() => import('../pages/marketing/LegalDocPage')),
    load: () => import('../pages/marketing/LegalDocPage'),
    props: { doc },
  }
}

function featurePageRoute(slug) {
  const { meta } = FEATURE_PAGES[slug]
  return {
    path: `/features/${slug}`,
    title: meta.title,
    description: meta.description,
    ogTitle: meta.ogTitle,
    Component: lazy(() => import('../pages/marketing/FeaturePage')),
    load: () => import('../pages/marketing/FeaturePage'),
    props: { slug },
  }
}

function solutionRoute(solution) {
  return {
    path: `/solutions/${solution.slug}`,
    title: `${solution.name} — Kolumn`,
    description: solution.seo.description,
    Component: lazy(() => import('../pages/marketing/SolutionPage')),
    load: () => import('../pages/marketing/SolutionPage'),
    props: { solution },
  }
}

function templateRoute(template) {
  return {
    path: `/templates/${template.slug}`,
    title: `${template.name} — Kolumn`,
    description: template.description,
    Component: lazy(() => import('../pages/marketing/TemplatePage')),
    load: () => import('../pages/marketing/TemplatePage'),
    props: { slug: template.slug },
  }
}

function comparisonRoute({ META, COMPARISON }) {
  return {
    path: `/compare/${COMPARISON.slug}`,
    title: META.title,
    description: META.description,
    ogTitle: META.ogTitle,
    ogDescription: META.ogDescription,
    Component: lazy(() => import('../pages/marketing/ComparisonPage')),
    load: () => import('../pages/marketing/ComparisonPage'),
    props: { comparison: COMPARISON },
  }
}

function customerStoryRoute(story) {
  return {
    path: `/customers/${story.slug}`,
    title: `${story.name} — Kolumn`,
    description: story.summary,
    Component: lazy(() => import('../pages/marketing/CustomerStoryPage')),
    load: () => import('../pages/marketing/CustomerStoryPage'),
    props: { slug: story.slug },
  }
}

// 'share-one-board' would otherwise title-collide with the support article
// at the same title ("Share a single board — Kolumn") — scope this one to
// its section so the two URLs have distinct <title>s.
const TUTORIAL_TITLE_OVERRIDES = {
  'share-one-board': 'Tutorial: Share a single board — Kolumn',
}

function tutorialRoute(tutorial) {
  return {
    path: `/tutorials/${tutorial.slug}`,
    title: TUTORIAL_TITLE_OVERRIDES[tutorial.slug] || `${tutorial.title} — Kolumn`,
    description: tutorial.summary,
    Component: lazy(() => import('../pages/marketing/TutorialPage')),
    load: () => import('../pages/marketing/TutorialPage'),
    props: { slug: tutorial.slug },
    // No body yet — SupportArticlePage/TutorialPage render a "coming soon"
    // state instead of an empty page. Reachable, but excluded from the
    // sitemap and noindexed (see scripts/prerender.mjs / headMeta.js) so
    // search engines don't index 29 near-empty stub pages.
    thin: !tutorial.body,
  }
}

// The two long-form posts' `summary` copy (shown on the blog index and the
// post header) runs past the 155-char meta-description limit — rather than
// trim visible marketing copy, each override below is a fresh sentence for
// the <meta description> only.
const BLOG_META_DESCRIPTION_OVERRIDES = {
  'how-the-pill-decides':
    'Line breaks and commas are handled locally; anything that reads like an instruction goes to the model. Why the pill is still a regex.',
  'what-we-dont-do-with-your-boards':
    'Row-level security on every table, members-only access, export and delete in Settings, and no training on your content. The specifics.',
}

function blogPostRoute(post) {
  return {
    path: `/blog/${post.slug}`,
    title: `${post.title} — Kolumn`,
    description: BLOG_META_DESCRIPTION_OVERRIDES[post.slug] || post.summary,
    Component: lazy(() => import('../pages/marketing/BlogPostPage')),
    load: () => import('../pages/marketing/BlogPostPage'),
    props: { slug: post.slug },
  }
}

function supportArticleRoute(article) {
  return {
    path: `/support/${article.slug}`,
    title: `${article.title} — Kolumn`,
    description: article.summary,
    Component: lazy(() => import('../pages/marketing/SupportArticlePage')),
    load: () => import('../pages/marketing/SupportArticlePage'),
    props: { slug: article.slug },
    // See TUTORIAL_TITLE_OVERRIDES — same "coming soon" thin-content note.
    thin: !article.body,
  }
}

// One entry per prerendered marketing page. This list drives App.jsx routes,
// head meta (title/description/canonical/OG/JSON-LD), the nav dead-link test,
// scripts/prerender.mjs, sitemap.xml and robots.txt.
// The homepage. Registered here so it is prerendered and gets its own
// title/description/canonical like every other route — but it is NOT a
// MarketingLayout page (LandingPage has its own nav/footer and renders
// outside MarketingLayout in both App.jsx and src/prerender-entry.jsx).
// Keep this title/description in sync with the static fallback in
// index.html (used before this route is applied and as the source template
// the prerender step overwrites).
const HOME_ROUTE = {
  path: '/',
  title: 'Kolumn — AI-powered kanban for teams',
  description:
    'Kolumn is a kanban board with an AI that creates, moves, and updates cards when you type what you need. Free to start, no setup.',
  ogTitle: 'Kolumn — AI-powered kanban',
  Component: lazy(() => import('../pages/LandingPage')),
  load: () => import('../pages/LandingPage'),
}

export const MARKETING_ROUTES = [
  HOME_ROUTE,
  {
    path: '/pricing',
    title: PRICING.meta.title,
    description: PRICING.meta.description,
    ogTitle: PRICING.meta.ogTitle,
    ogDescription: PRICING.meta.ogDescription,
    jsonLd: pricingJsonLd,
    Component: lazy(() => import('../pages/marketing/PricingPage')),
    // Prerendering needs the resolved module (not the lazy() wrapper) so
    // MarketingLayout's inner Suspense boundary never actually suspends
    // during the SSR pass — see src/prerender-entry.jsx. Same factory,
    // exposed separately so the browser keeps code-splitting via Component.
    load: () => import('../pages/marketing/PricingPage'),
  },

  // Compare -----------------------------------------------------------------
  {
    path: '/compare',
    title: 'Compare Kolumn — Kolumn',
    description:
      'Three honest comparisons — Kolumn vs Trello, Asana, and Notion — with dated sources and a genuine reason to pick the other product.',
    Component: lazy(() => import('../pages/marketing/ComparisonsPage')),
    load: () => import('../pages/marketing/ComparisonsPage'),
  },
  ...COMPARISONS_LIST.map(comparisonRoute),

  // Features ------------------------------------------------------------
  {
    path: '/features',
    title: FEATURES_HUB.meta.title,
    description: FEATURES_HUB.meta.description,
    ogTitle: FEATURES_HUB.meta.ogTitle,
    Component: lazy(() => import('../pages/marketing/FeaturesPage')),
    load: () => import('../pages/marketing/FeaturesPage'),
  },
  featurePageRoute('pill'),
  featurePageRoute('chat'),

  // Solutions -------------------------------------------------------------
  {
    path: '/solutions',
    title: 'Solutions — Kolumn',
    description:
      'One kanban, eight ways to use it — startups, small business, nonprofits, students, legal, healthcare, support, and engineering teams.',
    Component: lazy(() => import('../pages/marketing/SolutionsPage')),
    load: () => import('../pages/marketing/SolutionsPage'),
  },
  ...SOLUTIONS_LIST.map(solutionRoute),

  // Templates ---------------------------------------------------------------
  {
    path: '/templates',
    title: 'Templates — Kolumn',
    description:
      'Pick a template and get a board with columns and starter cards already on it. Rename or delete anything — a normal board from second one.',
    Component: lazy(() => import('../pages/marketing/TemplatesPage')),
    load: () => import('../pages/marketing/TemplatesPage'),
  },
  ...TEMPLATES.map(templateRoute),

  // Connectors ---------------------------------------------------------------
  {
    path: '/connectors',
    title: 'Capture from anywhere — Kolumn',
    description: CONNECTORS_META.description,
    jsonLd: connectorsJsonLd,
    Component: lazy(() => import('../pages/marketing/ConnectorsPage')),
    load: () => import('../pages/marketing/ConnectorsPage'),
  },

  // Customers -----------------------------------------------------------
  {
    path: '/customers',
    title: 'Customer stories — Kolumn',
    description:
      'Kolumn has no customer logos yet — four worked scenarios show the kinds of teams the product is built for, board by board.',
    Component: lazy(() => import('../pages/marketing/CustomersPage')),
    load: () => import('../pages/marketing/CustomersPage'),
  },
  ...CUSTOMER_STORIES.map(customerStoryRoute),

  // Tutorials -----------------------------------------------------------
  {
    path: '/tutorials',
    title: 'Tutorials — Kolumn',
    description:
      'Short guides to the parts of Kolumn worth learning on purpose. Most take under ten minutes and end with something on your board.',
    Component: lazy(() => import('../pages/marketing/TutorialsPage')),
    load: () => import('../pages/marketing/TutorialsPage'),
  },
  ...TUTORIALS.map(tutorialRoute),

  // Blog ------------------------------------------------------------------
  {
    path: '/blog',
    title: 'Blog — Kolumn',
    description:
      "Notes from building a kanban that stayed a kanban — product decisions, engineering details, and what we don't do with your data.",
    Component: lazy(() => import('../pages/marketing/BlogPage')),
    load: () => import('../pages/marketing/BlogPage'),
  },
  ...BLOG_POSTS.map(blogPostRoute),

  // Changelog ---------------------------------------------------------------
  {
    path: '/changelog',
    title: 'Changelog — Kolumn',
    description:
      "Every change you'd notice, dated and tagged. No version numbers — Kolumn is a web app, so the version you have is the one that's live.",
    Component: lazy(() => import('../pages/marketing/ChangelogPage')),
    load: () => import('../pages/marketing/ChangelogPage'),
  },

  // Support -------------------------------------------------------------
  {
    path: '/support',
    title: 'Support — Kolumn',
    description: SUPPORT_META.description,
    Component: lazy(() => import('../pages/marketing/SupportPage')),
    load: () => import('../pages/marketing/SupportPage'),
  },
  ...SUPPORT_CATEGORIES.flatMap((category) => category.articles.map(supportArticleRoute)),

  // Status ----------------------------------------------------------------
  {
    path: '/status',
    title: 'Status — Kolumn',
    description: STATUS_META.description,
    Component: lazy(() => import('../pages/marketing/StatusPage')),
    load: () => import('../pages/marketing/StatusPage'),
  },

  // Company -----------------------------------------------------------
  {
    path: '/about',
    title: 'About — Kolumn',
    description: ABOUT_META.description,
    Component: lazy(() => import('../pages/marketing/AboutPage')),
    load: () => import('../pages/marketing/AboutPage'),
  },
  {
    path: '/careers',
    title: 'Careers — Kolumn',
    description: CAREERS_META.description,
    Component: lazy(() => import('../pages/marketing/CareersPage')),
    load: () => import('../pages/marketing/CareersPage'),
  },
  {
    path: '/security',
    title: 'Security — Kolumn',
    description: SECURITY_META.description,
    Component: lazy(() => import('../pages/marketing/SecurityPage')),
    load: () => import('../pages/marketing/SecurityPage'),
  },

  // Legal -------------------------------------------------------------------
  legalRoute('/legal/usage-policy', {
    ...USAGE_POLICY,
    description:
      "Who this policy applies to, what's allowed on Kolumn, and what happens if you don't follow it — for every account, board, and AI request.",
  }),
  legalRoute('/legal/responsible-disclosure', {
    ...RESPONSIBLE_DISCLOSURE,
    description:
      "How to report a security issue in Kolumn: what's in scope, what counts as a vulnerability, and how to reach us.",
  }),
  legalRoute('/legal/privacy-choices', {
    ...PRIVACY_CHOICES,
    description:
      "What Kolumn stores in your browser, which analytics and error tools we use, and where to find your account's privacy controls.",
  }),
]

export function findMarketingRoute(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return MARKETING_ROUTES.find((r) => r.path === clean) || null
}
