export type DiffLineType = 'added' | 'removed' | 'unchanged' | 'modified';

export interface DiffLine {
  type: DiffLineType;
  originalLineNumber?: number;
  modifiedLineNumber?: number;
  text: string;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  unchanged: number;
}

/**
 * Compute line diff using LCS (Longest Common Subsequence) dynamic programming.
 * ponytail: O(N*M) DP LCS table. Upgrade to Myers diff if YAML files exceed 50k lines.
 */
export function computeLineDiff(originalText: string, modifiedText: string): DiffLine[] {
  const origLines = originalText.split(/\r?\n/);
  const modLines = modifiedText.split(/\r?\n/);

  const n = origLines.length;
  const m = modLines.length;

  // Build DP table for LCS
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (origLines[i] === modLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to construct diff lines
  const result: DiffLine[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === modLines[j - 1]) {
      result.push({
        type: 'unchanged',
        originalLineNumber: i,
        modifiedLineNumber: j,
        text: origLines[i - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({
        type: 'added',
        modifiedLineNumber: j,
        text: modLines[j - 1],
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.push({
        type: 'removed',
        originalLineNumber: i,
        text: origLines[i - 1],
      });
      i--;
    }
  }

  return result.reverse();
}

/**
 * Calculate addition and deletion counts from diff lines.
 */
export function getDiffStats(diffLines: DiffLine[]): DiffStats {
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const line of diffLines) {
    if (line.type === 'added') additions++;
    else if (line.type === 'removed') deletions++;
    else if (line.type === 'unchanged') unchanged++;
  }

  return { additions, deletions, unchanged };
}
