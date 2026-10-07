import { avatarTone, initials } from './library';

const SIZES = {
  sm: 'size-6 text-[0.6rem]',
  md: 'size-9 text-[0.78rem]',
  lg: 'size-10 text-[0.85rem]',
};

/** A speaker's initials in a circle, in a colour from the chapel palette. */
export function Avatar({ speaker, size = 'md' }: { speaker: string; size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden="true"
      className={`font-ui text-paper inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide ${SIZES[size]} ${avatarTone(speaker)}`}
    >
      {initials(speaker)}
    </span>
  );
}
