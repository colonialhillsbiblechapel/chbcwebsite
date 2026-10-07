import { inkFor, sceneUrl } from './art/scene.ts';
import { tuneName } from './service';
import type { SlideData } from './slides';
import { wordsSize } from './fit';
import { SundaySlide } from './SundaySlide';

/**
 * One slide for the screen in the chapel, set like the chapel's PowerPoint decks: a warm paper
 * page; on the title slide "HYMN 251", the first line in a large italic and the author; then the
 * words, centred, as large as they will fit. Sizes follow the slide itself (container units), so
 * a slide is equally crisp on a projector, a television or a small preview.
 *
 * A hymn with a background (sealed with its words) shows its watercolour scene along the bottom of
 * the title slide — under its name, a verse and who wrote it — and the same scene as a low strip
 * under the words on every other slide. The words always sit on open paper above the picture, so
 * they stay crystal clear.
 */
interface Props {
  slide?: SlideData;
  /** Blank the screen (between hymns, or during the reading): black, or white as in PowerPoint. */
  blank?: boolean | 'black' | 'white';
  className?: string;
}

const PAGE = 'bg-[radial-gradient(ellipse_at_50%_38%,#fcf9f2,#efe8da_88%)] text-[#1f1a17]';

/** Heights of the drawn pictures, as a share of the slide's height (they are 1920 × 460 and × 200). */
const TITLE_ART = 42.6;
const BAND_ART = 18.5;

/** Long titles get a smaller size so they still sit on two or three lines. */
function titleSize(title: string, room: number) {
  const scale = Math.max(0.5, Math.min(1, 26 / Math.max(title.length, 1))) * room;
  return `min(${(14 * scale).toFixed(2)}cqh, ${(8.6 * scale).toFixed(2)}cqw)`;
}

/**
 * The paper behind every slide, and the hymn's picture if it has one. The paper's grain is a
 * still image: drawn live (as an SVG noise filter) it could show hairline seams at full screen,
 * where the browser paints it in tiles.
 */
function Page({ art }: { art?: { src: string; height: number } }) {
  return (
    <>
      <img src="/hymns/art/paper.jpg" alt="" className="absolute inset-0 size-full object-cover" />
      {art && (
        <img
          src={art.src}
          alt=""
          className="absolute inset-x-0 bottom-0 w-full object-cover object-bottom"
          style={{ height: `${art.height}cqh` }}
        />
      )}
    </>
  );
}

export function Slide({ slide, blank, className = '' }: Props) {
  const frame = `overflow-hidden [container-type:size] ${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} ${className}`;
  if (blank === 'white') {
    return <div className={`bg-white ${frame}`} role="img" aria-label="White screen" />;
  }
  if (blank || !slide) {
    return <div className={`bg-black ${frame}`} role="img" aria-label="Blank screen" />;
  }
  if (slide.kind === 'welcome' || slide.kind === 'program')
    return <SundaySlide slide={slide} className={frame} />;
  const background = slide.background;
  const theme = background?.scene;
  const seed = Number(slide.chosen.hymn.number.replace(/\D/g, '')) || 1;

  if (slide.kind === 'title') {
    const { hymn } = slide.chosen;
    const words = slide.words;
    const title = background?.name ?? hymn.title;
    const verse = background?.verse;
    return (
      <div className={`${PAGE} ${frame}`}>
        <Page
          art={theme ? { src: sceneUrl(theme, 'title', seed), height: TITLE_ART } : undefined}
        />
        <div
          className="absolute inset-x-0 top-0 flex flex-col items-center justify-center px-[7cqw] text-center font-serif"
          style={{ bottom: theme ? `${TITLE_ART - 9}cqh` : '0' }}
        >
          <p className="text-[4.4cqh] font-bold tracking-[0.42em] text-[#2b2420] uppercase">
            Hymn&nbsp;&nbsp;{hymn.number}
          </p>
          <h2
            className="mt-[2cqh] max-w-[86cqw] leading-[1.06] font-semibold text-balance italic"
            style={{
              fontSize: titleSize(title, !theme ? 1 : verse ? 0.74 : 0.86),
              color: theme ? inkFor(theme) : '#4a1d26',
            }}
          >
            {title}
          </h2>
          {theme && verse && (
            <figure className="m-0 mt-[3cqh] max-w-[76cqw]">
              <blockquote
                className="text-[3.5cqh] leading-[1.32] text-balance italic"
                style={{ color: inkFor(theme) }}
              >
                {verse.quote}
              </blockquote>
              <figcaption className="mt-[0.8cqh] text-[2.9cqh] text-[#3f3530]">
                {verse.ref}
              </figcaption>
            </figure>
          )}
          {words?.author && (
            <p
              className={`${!theme ? 'mt-[5cqh] text-[4cqh]' : verse ? 'mt-[2.4cqh] text-[2.8cqh]' : 'mt-[3cqh] text-[4cqh]'} max-w-[80cqw] leading-snug text-balance text-[#4b3f39] italic`}
            >
              {words.author}
            </p>
          )}
          {tuneName(hymn.tune) && !verse && (
            <p className="mt-[1.5cqh] text-[3.1cqh] text-[#5f534b]">Tune: {tuneName(hymn.tune)}</p>
          )}
          {words?.copyright && (
            <p className="mt-[1.5cqh] max-w-[80cqw] text-[2.3cqh] text-[#5f534b]">
              © {words.copyright}
            </p>
          )}
        </div>
      </div>
    );
  }

  const space = theme ? 100 - BAND_ART - 6 : 100;
  return (
    <div className={`${PAGE} ${frame}`}>
      <Page art={theme ? { src: sceneUrl(theme, 'band', seed), height: BAND_ART } : undefined} />
      <div
        className="absolute inset-x-0 top-0 flex flex-col items-center justify-center px-[5cqw] text-center font-serif leading-[1.3]"
        style={{
          bottom: theme ? `${BAND_ART}cqh` : '0',
          fontSize: wordsSize(slide.lines, space * 0.8),
        }}
      >
        {slide.lines.map((line, i) => (
          <p key={i} className="max-w-[92cqw] text-balance">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
