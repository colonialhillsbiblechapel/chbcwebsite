import { wordsSize } from './fit';
import type { ProgramTheme, SlideData } from './slides';

/**
 * The Sunday welcome slides, each set on its own watercolour from the chapel's welcome deck, in
 * the manner of the chapel's welcome pictures: navy type on warm paper, letter-spaced capitals,
 * a gold brush stroke, a gold reference.
 *
 * - The welcome: one of the finished pictures, or the deck's welcome with the day's date.
 * - The chorus ("Let us sing") above the deck's soft hills; our welcome song in blue; the birthday
 *   song in gold; the anniversary song in rose. The words always sit on open paper.
 */
type SundaySlideData = Extract<SlideData, { kind: 'welcome' | 'program' }>;

const ART = '/hymns/welcome';
const NAVY = '#15284f';
const INK = '#172c54';
const GOLD = '#8a6424';

const THEMES: Record<ProgramTheme, { image: string; accent: string; ground: number }> = {
  // `ground`: how much of the slide's foot (in % of its height) the painting keeps to itself.
  chorus: { image: 'chorus', accent: '#335f80', ground: 20 },
  welcome: { image: 'song', accent: '#2e4f8c', ground: 9 },
  birthday: { image: 'birthday', accent: '#8a5a20', ground: 16 },
  anniversary: { image: 'anniversary', accent: '#844456', ground: 15 },
};

const Paper = ({ src }: { src: string }) => (
  <img src={src} alt="" decoding="async" className="absolute inset-0 size-full object-cover" />
);

/** The gold brush stroke of the welcome pictures, lifted off its paper. */
const Brush = ({ width }: { width: number }) => (
  <img
    src={`${ART}/brush.png`}
    alt=""
    className="mx-auto block"
    style={{ width: `${width}cqw`, aspectRatio: '1240 / 160' }}
  />
);

/** Capitals letter-spaced like the pictures' "BIBLE CHAPEL", sized so a long title still fits. */
function capsSize(title: string, largest: number, room = 78) {
  const byWidth = room / (Math.max(title.length, 1) * 0.86);
  return `min(${largest}cqh, ${byWidth.toFixed(2)}cqw)`;
}

export function SundaySlide({ slide, className }: { slide: SundaySlideData; className: string }) {
  if (slide.kind === 'welcome') {
    if (slide.picture !== 'dated') {
      return (
        <div
          className={`bg-[#f6f3ec] ${className}`}
          role="img"
          aria-label="Welcome to Colonial Hills Bible Chapel"
        >
          <Paper src={`${ART}/picture-${slide.picture}.jpg`} />
        </div>
      );
    }
    // The deck's welcome, set like the pictures, with the greeting and the date of the day.
    return (
      <div className={`bg-[#f6f3ec] ${className}`}>
        <Paper src={`${ART}/welcome.jpg`} />
        <div
          className="absolute inset-y-0 flex w-[64cqw] flex-col items-center justify-center text-center"
          style={{ left: '27cqw', color: NAVY }}
        >
          <p
            className="font-display text-[6.6cqh] leading-none font-semibold italic"
            style={{ color: GOLD }}
          >
            {slide.greeting}
          </p>
          <p
            className="mt-[2.6cqh] font-serif text-[3.1cqh] font-semibold tracking-[0.34em] uppercase"
            style={{ color: '#2e4f8c' }}
          >
            Welcome to
          </p>
          <h2
            className="font-display mt-[0.6cqh] text-[15.5cqh] leading-[1.02] font-medium italic"
            style={{ color: NAVY }}
          >
            Colonial Hills
          </h2>
          <p className="mt-[0.8cqh] font-serif text-[5.4cqh] font-semibold tracking-[0.3em] uppercase">
            Bible Chapel
          </p>
          <div className="mt-[2.6cqh]">
            <Brush width={23} />
          </div>
          <p className="mt-[2.6cqh] font-serif text-[4.4cqh]">{slide.date}</p>
          <p
            className="font-display mt-[0.6cqh] text-[4.6cqh] font-medium italic"
            style={{ color: '#2e4f8c' }}
          >
            We’re so glad you’re here
          </p>
          <blockquote
            className="font-display mt-[3.4cqh] text-[3.5cqh] leading-[1.3] italic"
            style={{ color: '#3e4a63' }}
          >
            “This is the day which the LORD hath made;
            <br />
            we will rejoice and be glad in it.”
          </blockquote>
          <p
            className="mt-[1.2cqh] font-serif text-[2.4cqh] font-semibold tracking-[0.28em] uppercase"
            style={{ color: GOLD }}
          >
            Psalm 118:24
          </p>
        </div>
      </div>
    );
  }

  const theme = THEMES[slide.theme];
  const chorus = slide.theme === 'chorus';

  if (slide.role === 'title') {
    // The song's own slide, as in the chapel's decks: what it is, its name and the gold stroke.
    return (
      <div className={`bg-[#f6f3ec] ${className}`}>
        <Paper src={`${ART}/${theme.image}.jpg`} />
        <div
          className="absolute inset-x-[8cqw] top-0 flex flex-col items-center justify-center text-center"
          style={{ bottom: `${theme.ground}cqh` }}
        >
          <p
            className="font-serif text-[3.2cqh] font-semibold tracking-[0.42em] uppercase"
            style={{ color: theme.accent }}
          >
            {slide.eyebrow}
          </p>
          {chorus ? (
            <h2
              className="font-display mt-[2.4cqh] leading-[1.1] font-semibold tracking-[0.1em] text-balance uppercase"
              style={{ color: NAVY, fontSize: capsSize(slide.title, 9.5, 84) }}
            >
              {slide.title}
            </h2>
          ) : (
            <h2
              className="font-display mt-[1.6cqh] text-[14cqh] leading-[1.02] font-medium text-balance italic"
              style={{ color: NAVY }}
            >
              {slide.title}
            </h2>
          )}
          <div className="mt-[3.4cqh]">
            <Brush width={26} />
          </div>
        </div>
        {slide.credits && slide.credits.length > 0 && (
          <p
            className="absolute inset-x-[10cqw] bottom-[2.2cqh] text-center font-serif text-[1.9cqh] text-balance"
            style={{ color: '#2c3550' }}
          >
            {slide.credits.join(' · ')}
          </p>
        )}
      </div>
    );
  }

  // The words: set exactly as the hymns' words are (Slide.tsx) — as large as the space allows,
  // each sung line on one line of the screen, on open paper above the painting.
  const space = 100 - theme.ground - 6;
  return (
    <div className={`bg-[#f6f3ec] ${className}`}>
      <Paper src={`${ART}/${theme.image}.jpg`} />
      <div
        className="absolute inset-x-0 top-0 flex flex-col items-center justify-center px-[5cqw] text-center font-serif leading-[1.3]"
        style={{
          bottom: `${theme.ground}cqh`,
          color: INK,
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
