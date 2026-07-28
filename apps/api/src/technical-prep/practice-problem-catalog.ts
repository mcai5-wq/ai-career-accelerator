import { Prisma, ProblemDifficulty } from '@prisma/client';

// Turns a company name into a URL-safe, unique-ish key. Falls back to a
// random suffix if the name is all punctuation/whitespace (e.g. "???"),
// so the Company.slug unique constraint can never collide on an empty string.
export function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return slug || `company-${Math.random().toString(36).slice(2, 10)}`;
}

// Fallback only — used when the ai-service is unavailable/unconfigured and
// there's no previously-cached breakdown for this company either (see
// TechnicalPrepService.generateTopicBreakdown). The real path asks the
// ai-service to weight actual topics for the specific company + role.
export const DEFAULT_TOPIC_BREAKDOWN = [
  {
    topic: 'Arrays & Strings',
    weight: 30,
    rationale:
      'Foundation for most technical interviews — expect at least one array/string-heavy question.',
  },
  {
    topic: 'Trees & Graphs',
    weight: 20,
    rationale:
      'Common for traversal, search, and dependency-ordering problems.',
  },
  {
    topic: 'Dynamic Programming',
    weight: 20,
    rationale: 'Frequently tests optimization thinking and edge-case handling.',
  },
  {
    topic: 'System Design',
    weight: 15,
    rationale: 'Usually shows up for mid-to-senior level rounds.',
  },
  {
    topic: 'Behavioral',
    weight: 15,
    rationale: 'Every interview loop includes at least one behavioral round.',
  },
] satisfies Prisma.JsonArray;

// A small, fixed catalog of well-known public problems — real titles/URLs,
// no problem content reproduced. Seeded lazily (see ensureCatalogSeeded in
// the service) the first time any session is created, so there's no manual
// `prisma db seed` step to run.
export const PRACTICE_PROBLEM_CATALOG: Array<{
  title: string;
  slug: string;
  difficulty: ProblemDifficulty;
  topics: string[];
  externalUrl: string;
}> = [
  {
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'EASY',
    topics: ['arrays', 'hash-map'],
    externalUrl: 'https://leetcode.com/problems/two-sum/',
  },
  {
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    difficulty: 'EASY',
    topics: ['stack'],
    externalUrl: 'https://leetcode.com/problems/valid-parentheses/',
  },
  {
    title: 'Merge Two Sorted Lists',
    slug: 'merge-two-sorted-lists',
    difficulty: 'EASY',
    topics: ['linked-list'],
    externalUrl: 'https://leetcode.com/problems/merge-two-sorted-lists/',
  },
  {
    title: 'Best Time to Buy and Sell Stock',
    slug: 'best-time-to-buy-and-sell-stock',
    difficulty: 'EASY',
    topics: ['arrays', 'dynamic-programming'],
    externalUrl:
      'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    difficulty: 'MEDIUM',
    topics: ['strings', 'sliding-window'],
    externalUrl:
      'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
  },
  {
    title: 'Number of Islands',
    slug: 'number-of-islands',
    difficulty: 'MEDIUM',
    topics: ['graphs', 'dfs-bfs'],
    externalUrl: 'https://leetcode.com/problems/number-of-islands/',
  },
  {
    title: 'Course Schedule',
    slug: 'course-schedule',
    difficulty: 'MEDIUM',
    topics: ['graphs', 'topological-sort'],
    externalUrl: 'https://leetcode.com/problems/course-schedule/',
  },
  {
    title: 'Merge Intervals',
    slug: 'merge-intervals',
    difficulty: 'MEDIUM',
    topics: ['arrays', 'sorting'],
    externalUrl: 'https://leetcode.com/problems/merge-intervals/',
  },
  {
    title: 'LRU Cache',
    slug: 'lru-cache',
    difficulty: 'MEDIUM',
    topics: ['design', 'hash-map', 'linked-list'],
    externalUrl: 'https://leetcode.com/problems/lru-cache/',
  },
  {
    title: 'Word Break',
    slug: 'word-break',
    difficulty: 'MEDIUM',
    topics: ['dynamic-programming', 'strings'],
    externalUrl: 'https://leetcode.com/problems/word-break/',
  },
  {
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    difficulty: 'HARD',
    topics: ['arrays', 'two-pointers'],
    externalUrl: 'https://leetcode.com/problems/trapping-rain-water/',
  },
  {
    title: 'Median of Two Sorted Arrays',
    slug: 'median-of-two-sorted-arrays',
    difficulty: 'HARD',
    topics: ['arrays', 'binary-search'],
    externalUrl: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
  },
];

// Every distinct tag actually used in the catalog above — this is the exact
// vocabulary the ai-service is told to weight topics from (plus "System
// Design"/"Behavioral", which don't map to catalog problems but are still
// useful for the displayed breakdown). Constraining the AI to this fixed
// list, rather than letting it invent free-form topic names, is what makes
// matching an AI-weighted topic back to catalog problems reliable — see
// TechnicalPrepService.selectProblemsForBreakdown.
export const CATALOG_TOPIC_TAGS = Array.from(
  new Set(PRACTICE_PROBLEM_CATALOG.flatMap((problem) => problem.topics)),
).sort();

// Cosmetic only — lets the topic breakdown display as "Dynamic Programming"
// instead of the raw "dynamic-programming" tag, without needing a separate
// "pretty name" field the AI would have to keep in sync.
export const TOPIC_TAG_DISPLAY_NAMES: Record<string, string> = {
  arrays: 'Arrays',
  'hash-map': 'Hash Maps',
  stack: 'Stacks',
  'linked-list': 'Linked Lists',
  'dynamic-programming': 'Dynamic Programming',
  strings: 'Strings',
  'sliding-window': 'Sliding Window',
  graphs: 'Graphs',
  'dfs-bfs': 'Graph Traversal (DFS/BFS)',
  'topological-sort': 'Topological Sort',
  sorting: 'Sorting',
  design: 'Data Structure Design',
  'two-pointers': 'Two Pointers',
  'binary-search': 'Binary Search',
};
