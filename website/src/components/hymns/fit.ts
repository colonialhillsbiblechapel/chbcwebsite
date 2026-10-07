/**
 * Sizes words to fill a slide: each line of the song on one line of the screen, as large as the
 * space allows (in container units, so a slide is equally crisp on a projector or a preview).
 */

let measurer: { ctx: CanvasRenderingContext2D; font: string } | null | undefined;

/** A line's width in ems, measured in the slide's own typeface (EB Garamond). */
function ems(text: string): number {
  if (measurer === undefined && typeof document !== 'undefined') {
    const ctx = document.createElement('canvas').getContext('2d');
    const probe = document.createElement('span');
    probe.className = 'font-serif';
    document.body.append(probe);
    measurer = ctx && { ctx, font: getComputedStyle(probe).fontFamily };
    probe.remove();
  }
  if (!measurer) return text.length * 0.44;
  measurer.ctx.font = `100px ${measurer.font}`;
  return measurer.ctx.measureText(text).width / 100;
}

/**
 * The largest size at which the words fill the space: each line of the hymn on one line of the
 * screen, as in the chapel's decks. Only if that would make the words too small to read from the
 * back do long lines wrap.
 */
export function wordsSize(lines: string[], space: number, { width = 88, max = 9 } = {}) {
  const ASPECT = 16 / 9; // compare widths and heights on a widescreen television
  const LINE = 1.3;
  const widths = lines.map(ems);
  const fit = (limit: number) => {
    const rows = widths.reduce((n, w) => n + Math.max(1, Math.ceil(w / limit)), 0);
    const widest = Math.min(limit, Math.max(...widths, 1));
    const byWidth = width / widest; // in cqw
    const byHeight = space / (rows * LINE); // in cqh
    return { byWidth, byHeight, size: Math.min(max, byHeight, byWidth * ASPECT) };
  };
  const longest = Math.max(...widths, 1);
  const whole = fit(Infinity);
  const wrapped = fit(longest * 0.56);
  const best = whole.size >= 6 || whole.size >= wrapped.size ? whole : wrapped;
  return `min(${max}cqh, ${best.byHeight.toFixed(2)}cqh, ${best.byWidth.toFixed(2)}cqw)`;
}
