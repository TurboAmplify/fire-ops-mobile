/**
 * Fuzzy matching for personnel names extracted from photos of paper shift
 * tickets. AI OCR frequently misreads handwriting (e.g. "Les Madsen" reads as
 * "Les Madstun"). When importing, we want to recognise that the name almost
 * certainly refers to a known crew member already in the org and snap to that
 * canonical spelling instead of creating a phantom new operator.
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Standard Levenshtein distance. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/** Similarity 0..1 based on edit distance. */
function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/**
 * Try to match an OCR'd name against a list of known names. Returns the best
 * canonical match and a score 0..1, or null if nothing crosses the threshold.
 *
 * Strategy:
 *   1. Exact normalized equality wins.
 *   2. First-name match + last-name similarity ≥ 0.6 wins.
 *   3. Whole-name similarity ≥ 0.75 wins.
 */
export function fuzzyMatchName(
  candidate: string,
  knownNames: string[],
  minScore = 0.75
): { match: string; score: number } | null {
  const c = normalize(candidate);
  if (!c) return null;
  let best: { match: string; score: number } | null = null;
  const cParts = c.split(" ");
  const cFirst = cParts[0];
  const cLast = cParts.slice(1).join(" ");

  for (const known of knownNames) {
    if (!known) continue;
    const n = normalize(known);
    if (!n) continue;
    if (n === c) return { match: known, score: 1 };

    const wholeScore = similarity(c, n);

    // First/last name decomposition — handles surname OCR errors well
    const nParts = n.split(" ");
    const nFirst = nParts[0];
    const nLast = nParts.slice(1).join(" ");
    let combinedScore = wholeScore;
    if (cFirst && nFirst && cFirst === nFirst && cLast && nLast) {
      const lastScore = similarity(cLast, nLast);
      // Strong bonus when first names match exactly
      combinedScore = Math.max(wholeScore, 0.5 + 0.5 * lastScore);
    }

    if (!best || combinedScore > best.score) {
      best = { match: known, score: combinedScore };
    }
  }

  if (best && best.score >= minScore) return best;
  return null;
}
