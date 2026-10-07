import { useEffect, useRef, useState } from 'preact/hooks';
import { HymnApp } from './HymnApp';
import { Icon } from './icons';
import {
  fetchSealed,
  forgetKey,
  open,
  rememberKey,
  rememberedKey,
  unlock,
  WrongPassword,
  type HymnIndexData,
} from './vault';

type State =
  | { kind: 'checking' }
  | { kind: 'locked'; error?: string }
  | { kind: 'unlocking' }
  | { kind: 'open'; data: HymnIndexData };

/**
 * The hymn index behind a password. The page itself holds no hymn data: the sealed file is
 * opened in the browser only when the right password is entered.
 */
export function HymnVault() {
  const [state, setState] = useState<State>({ kind: 'checking' });
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  // Reopen straight away if this visit (or this device, if chosen) was already unlocked.
  useEffect(() => {
    const key = rememberedKey();
    if (!key) {
      setState({ kind: 'locked' });
      return;
    }
    open(key)
      .then((data) => setState({ kind: 'open', data }))
      .catch(() => {
        forgetKey(); // sealed again since, or tampered with
        setState({ kind: 'locked' });
      });
  }, []);

  useEffect(() => {
    if (state.kind === 'locked') field.current?.focus({ preventScroll: true });
  }, [state.kind]);

  const submit = async (event: Event) => {
    event.preventDefault();
    if (!password) return;
    setState({ kind: 'unlocking' });
    try {
      const key = await unlock(password);
      const data = await open(key);
      rememberKey(key, remember);
      setPassword('');
      setState({ kind: 'open', data });
    } catch (error) {
      setState({
        kind: 'locked',
        error:
          error instanceof WrongPassword
            ? 'That password isn’t right. Please try again.'
            : 'The hymn index couldn’t be opened. Please check your connection and try again.',
      });
    }
  };

  const lock = () => {
    forgetKey();
    setState({ kind: 'locked' });
  };

  if (state.kind === 'open') return <HymnApp data={state.data} onLock={lock} />;

  const busy = state.kind === 'unlocking' || state.kind === 'checking';
  const error = state.kind === 'locked' ? state.error : undefined;

  return (
    <div className="font-ui mx-auto max-w-md">
      <form
        onSubmit={submit}
        className="border-rule relative border bg-white/70 p-7 shadow-[0_30px_60px_-40px_rgb(23_20_15/0.5)] sm:p-10"
        aria-labelledby="unlock-title"
        noValidate
      >
        <span className="bg-gold-tint text-gold-ink ring-gold/30 flex size-14 items-center justify-center rounded-full ring-1 ring-inset">
          <Icon name="lock" className="size-7" />
        </span>
        <h2 id="unlock-title" className="font-display text-ink mt-6 text-[2rem] leading-tight">
          For our fellowship
        </h2>
        <p className="text-ink-soft mt-3 text-[0.98rem] leading-relaxed">
          The hymn index is for the members of Colonial Hills Bible Chapel. Enter the password to
          open it.
        </p>

        <label htmlFor="hymns-password" className="text-ink mt-8 block text-[0.9rem] font-medium">
          Password
        </label>
        <div className="border-rule bg-paper focus-within:border-ink/60 mt-2 flex min-h-12 items-center rounded-lg border">
          <input
            ref={field}
            id="hymns-password"
            type={visible ? 'text' : 'password'}
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
            autoComplete="current-password"
            autoCapitalize="off"
            spellcheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'hymns-error' : undefined}
            disabled={busy}
            className="min-w-0 flex-1 bg-transparent px-4 text-[1rem] outline-none"
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-pressed={visible}
            className="text-muted hover:text-ink mr-1 flex size-10 items-center justify-center rounded-md"
          >
            <Icon name={visible ? 'eyeSlash' : 'eye'} className="size-5" />
            <span className="sr-only">Show password</span>
          </button>
        </div>
        <p id="hymns-error" role="alert" className="text-pew mt-3 min-h-6 text-[0.9rem]">
          {error}
        </p>

        <label className="text-ink-soft mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-[0.92rem]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember((e.target as HTMLInputElement).checked)}
            className="accent-ink size-4"
          />
          Remember on this device
        </label>

        <button
          type="submit"
          disabled={busy || !password}
          onPointerEnter={() => void fetchSealed().catch(() => undefined)}
          className="bg-ink text-paper mt-6 inline-flex min-h-13 w-full items-center justify-center gap-3 text-[0.8rem] font-medium tracking-[0.24em] uppercase transition-colors hover:bg-[#2b261d] disabled:opacity-50"
        >
          {state.kind === 'unlocking' ? 'Unlocking…' : 'Unlock'}
        </button>

        <p className="text-muted mt-6 text-[0.82rem] leading-relaxed">
          The index is opened privately in your browser; it is never sent anywhere.
        </p>
      </form>
    </div>
  );
}
