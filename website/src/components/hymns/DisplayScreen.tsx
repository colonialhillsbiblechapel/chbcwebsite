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
  const [filled, setFilled] = useState(false);
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
    const fill = () => void document.documentElement.requestFullscreen?.().catch(() => undefined);
    // Full screen at once if the browser lets this site do so by itself ("Automatic full screen").
    fill();
    const onFullscreen = () => setFilled(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreen);
    const onKey = (event: KeyboardEvent) => {
      const ours = actionFor(event) || /^[0-9]$/.test(event.key) || event.key === 'Enter';
      if (!ours) return;
      event.preventDefault();
      // Until this screen is full, the first press of the clicker fills it (as starting a show).
      if (!document.fullscreenElement && event.key !== 'Escape') fill();
      else if (actionFor(event) !== 'fullscreen') pass(keyOf(event));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreen);
      bc.close();
      channel.current = null;
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
  const goFullscreen = () =>
    void document.documentElement.requestFullscreen?.().catch(() => undefined);

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
      role="presentation"
    >
      <Slide
        slide={shown.content ?? slides[shown.slide]}
        blank={shown.blank}
        className="absolute inset-0"
      />
      {!filled && (
        <p className="absolute inset-x-0 top-6 mx-auto w-fit rounded-full bg-black/70 px-6 py-3 text-[1.05rem] text-white">
          Press the clicker, or click here, to fill this screen
        </p>
      )}
    </div>
  );
}
