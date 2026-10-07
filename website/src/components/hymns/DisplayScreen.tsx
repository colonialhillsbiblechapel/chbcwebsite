import { useEffect, useMemo, useState } from 'preact/hooks';
import { CHANNEL, type DisplayMessage } from './display';
import { resolve, type ServiceItem } from './service';
import { Slide } from './Slide';
import { slidesFor } from './slides';
import { lyrics, open, rememberedKey, type HymnIndexData, type Words } from './vault';

const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

/**
 * The projector screen (/hymns/screen/, opened by "Second screen"): only the slide, controlled
 * from the hymns window. It opens the hymns with the unlock key from that window — it never asks
 * for the password.
 */
export function DisplayScreen() {
  const [data, setData] = useState<HymnIndexData>();
  const [shown, setShown] = useState<{ item?: ServiceItem; slide: number; blank: boolean }>({
    slide: 0,
    blank: true,
  });
  const [words, setWords] = useState<Map<string, Words>>();
  const [hint, setHint] = useState(true);

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
      if (message.type === 'end') setShown({ slide: 0, blank: true });
      if (message.type !== 'state') return;
      if (message.key)
        void open(fromBase64(message.key))
          .then(setData)
          .catch(() => undefined);
      setShown({ item: message.item, slide: message.slide, blank: message.blank });
    };
    bc.postMessage({ type: 'hello' } satisfies DisplayMessage);
    const timer = window.setTimeout(() => setHint(false), 6000);
    return () => {
      bc.close();
      window.clearTimeout(timer);
    };
  }, []);

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
      className="font-ui fixed inset-0 cursor-none bg-black"
      onClick={goFullscreen}
      onKeyDown={(e) => (e.key === 'f' || e.key === 'F') && goFullscreen()}
      role="presentation"
    >
      <Slide slide={slides[shown.slide]} blank={shown.blank} className="absolute inset-0" />
      {hint && (
        <p className="absolute inset-x-0 top-6 mx-auto w-fit rounded-full bg-black/60 px-5 py-2.5 text-[0.95rem] text-white/90">
          Projector screen · click here for full screen · control it from the hymns window
        </p>
      )}
    </div>
  );
}
