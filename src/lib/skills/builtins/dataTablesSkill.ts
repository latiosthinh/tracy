import type { SkillDefinition } from '@/src/types/skills';

export const dataTablesSkill: SkillDefinition = {
  id: 'table-pagination',
  name: 'Data Table & Pagination Specialist',
  description:
    'Patterns for testing grid tables, column sorting, pagination controls, loading skeleton states, and scoped row action locators.',
  version: '1.0.0',
  domain: 'tables',
  systemPromptInjection: `[Skill: table-pagination]
- Scoped Row Locators: Scope row-level actions deterministically using row identifiers or unique cell text (e.g., \`tr:has-text("User A") >> button[aria-label="Edit"]\` or \`[role="row"]:has-text("INV-1001")\`).
- Column Header Sorting: Test sort triggers by clicking column headers (\`th button\`, \`[role="columnheader"]\`) and asserting sort order indicators (\`[aria-sort="ascending"]\`, \`[aria-sort="descending"]\`) alongside rearranged row content.
- Pagination Controls: Navigate pages via explicit previous/next buttons (\`button[aria-label="Next page"]\`, \`button:has-text("Next")\`) or direct page numbers. Assert that page index indicators update accurately.
- Loading Skeletons & Spinners: Always wait for table skeleton loaders (\`[data-testid*="skeleton"]\`, \`.table-loading\`, \`[role="progressbar"]\`) to disappear before inspecting cell counts or interacting with rows.
- Dynamic Cell Assertions: Assert table contents against deterministic columns rather than brittle row-index-only assumptions.`,
  tags: ['tables', 'grids', 'pagination', 'sorting', 'data-grids'],
};
