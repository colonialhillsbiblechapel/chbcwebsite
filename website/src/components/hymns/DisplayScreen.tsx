import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CHANNEL, type Blank, type DisplayMessage, type ProjectorKey } from './display';
import { actionFor, keyOf, wheelStepper } from './keys';
import { resolve, type ServiceItem } from './service';
import { Slide } from './Slide';
import { slidesFor, type SlideData } from './slides';
import { lyrics, open, rememberedKey, type HymnIndexData, type Words } from './vault';

const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

/**
 * The projector screen (/hymns/screen/, opened on the second screen): only the slide, controlled
 * from the hymns window. It opens the hymns with the unlock key from that window — it never asks
 * for the password. When this window is the one in front, the clicker, a click (on), a right
 * click (back) and the wheel still work: they are passed to the presenter.
 */
export function DisplayScreen() {
  const [data, setData] = useState<HymnIndexData>();
  const [shown, setShown] = useState<{
    item?: ServiceItem;
    content?: SlideData;
    slide: number;
    blank: Blank;
  }>({
    slide: 0,
    blank: 'black',
  });
  const [words, setWords] = useState<Map<string, Words>>();
  const [hint, setHint] = useState(true);
  const channel = useRef<BroadcastChannel | null>(null);
  const wheel = useRef(wheelStepper());

  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    const remembered = rememberedKey();
    if (remembered)
      void open(remembered)
        .then(setData)
        .catch(() => undefined);

    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (event: MessageEvent<DisplayMessage>) => {
      const message = event.data;
      if (message.type === 'end') setShown({ slide: 0, blank: 'black' });
      if (message.type !== 'state') return;
      if (message.key)
        void open(fromBase64(message.key))
          .then(setData)
          .catch(() => undefined);
      setShown({
        item: message.item,
        content: message.content,
        slide: message.slide,
        blank: message.blank,
      });
    };
    channel.current = bc;
    bc.postMessage({ type: 'hello' } satisfies DisplayMessage);
    const pass = (press: ProjectorKey) =>
      bc.postMessage({ type: 'press', press } satisfies DisplayMessage);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'f' || event.key === 'F') return; // handled below, here
      if (actionFor(event) || /^[0-9]$/.test(event.key) || event.key === 'Enter') {
        event.preventDefault();
        pass(keyOf(event));
      }
    };
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => setHint(false), 6000);
    return () => {
      window.removeEventListener('keydown', onKey);
      bc.close();
      channel.current = null;
      window.clearTimeout(timer);
    };
  }, []);
  const pass = (key: string) =>
    channel.current?.postMessage({
      type: 'press',
      press: { key, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false },
    } satisfies DisplayMessage);

  // The words of the hymnal being shown, opened once the index is open.
  const bookId = shown.item?.book;
  useEffect(() => {
    if (!data || !bookId) return;
    void lyrics(bookId)
      .then(setWords)
      .catch(() => undefined);
  }, [data, bookId]);

  const chosen = data && shown.item ? resolve([shown.item], data)[0] : undefined;
  const slides = useMemo(
    () => (chosen ? slidesFor(chosen, words?.get(chosen.hymn.number)) : []),
    [chosen, words],
  );
  const goFullscreen = () => {
    setHint(false);
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div
      className={`font-ui fixed inset-0 cursor-none ${shown.blank === 'black' ? 'bg-black' : 'bg-[#f6f3ec]'}`}
      // The first click makes this window full screen; after that a click goes on, as in PowerPoint.
      onClick={() => (document.fullscreenElement ? pass('ArrowRight') : goFullscreen())}
      onContextMenu={(event) => {
        event.preventDefault();
        pass('ArrowLeft');
      }}
      onWheel={(event) => {
        const by = wheel.current(event);
        if (by) pass(by === 1 ? 'ArrowRight' : 'ArrowLeft');
      }}
      onKeyDown={(e) => (e.key === 'f' || e.key === 'F') && goFullscreen()}
      role="presentation"
    >
      <Slide
        slide={shown.content ?? slides[shown.slide]}
        blank={shown.blank}
        className="absolute inset-0"
      />
      {hint && (
        <p className="absolute inset-x-0 top-6 mx-auto w-fit rounded-full bg-black/60 px-5 py-2.5 text-[0.95rem] text-white/90">
          Projector screen · click here for full screen · the clicker works in either window
        </p>
      )}
    </div>
  );
}
