/**
 * Divides a song's lines into slides of at most four lines, as the hymns are, so the words can be
 * as large on the screen as the hymns'. Where it divides, in order of preference: between stanzas
 * (or where the chapel's own deck began a new slide), after a full stop, after a comma, after any
 * other line — but never inside a sung line that the deck wrapped onto two lines ("…than houses or"
 * / "lands,"). Groups are kept as even as the words allow. No word is changed or moved.
 */
export const MOST = 4;

/** How good a place it is to divide after line `i` (higher is better; -1 = never). */
function quality(lines: string[], i: number, breaks: Set<number>) {
  if (breaks.has(i + 1)) return 4;
  const line = lines[i]?.trim() ?? '';
  const next = lines[i + 1]?.trim() ?? '';
  if (/[.!?]["”’)\]]*$/.test(line)) return 3;
  if (/[;:—–-]["”’)\]]*$/.test(line)) return 2;
  if (/,["”’)\]]*$/.test(line)) return 1;
  // No closing mark and the next line goes on in lower case: one sung line, wrapped.
  if (/^[a-z]/.test(next)) return -1;
  return 0;
}

/**
 * Splits `lines` into slides of at most MOST lines. `breaks` are line indexes where a new stanza or
 * deck slide begins (a preferred place to divide).
 */
export function splitLines(lines: string[], breaks: Iterable<number> = []): string[][] {
  if (lines.length <= MOST) return [lines];
  const at = new Set(breaks);
  const n = lines.length;
  // Cheapest way to cover lines [0, end): best[end] = { cost, from }.
  const best: { cost: number; from: number; slides: number }[] = [{ cost: 0, from: -1, slides: 0 }];
  for (let end = 1; end <= n; end++) {
    let pick = { cost: Infinity, from: -1, slides: 0 };
    for (let size = 1; size <= MOST && size <= end; size++) {
      const start = end - size;
      const before = best[start];
      if (!before || before.cost === Infinity) continue;
      const q = end === n ? 4 : quality(lines, end - 1, at);
      const cut = q < 0 ? 1000 : (4 - q) * 3;
      // Prefer even groups and as few slides as the words need.
      const cost = before.cost + cut + (MOST - size) ** 2 + 2;
      if (cost < pick.cost) pick = { cost, from: start, slides: before.slides + 1 };
    }
    best[end] = pick;
  }
  const groups: string[][] = [];
  for (let end = n; end > 0; end = best[end]?.from ?? 0) {
    const from = best[end]?.from ?? 0;
    groups.unshift(lines.slice(from, end));
  }
  return groups;
}
