import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { CATEGORY_LABELS, type Category } from '@/lib/media-shared';
import { Avatar } from './Avatar';
import type { Filters, Option } from './library';

interface Props {
  filters: Filters;
  total: number;
  categories: Record<Category, number>;
  series: Option[];
  conferences: Option[];
  speakers: Option[];
  hasHistory: boolean;
  onFilter: (patch: Partial<Filters>) => void;
  onClearHistory: () => void;
}

const SPEAKERS_SHOWN = 7;
const CLEAR: Partial<Filters> = {
  category: 'all',
  series: '',
  conference: '',
  speaker: '',
  query: '',
};

function Item({
  active,
  label,
  count,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  children?: ComponentChildren;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className="font-ui text-ink-soft hover:bg-ink/[0.06] aria-pressed:bg-ink/[0.08] aria-pressed:text-ink flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[0.92rem] transition-colors aria-pressed:font-semibold"
      >
        {children}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="text-muted text-[0.78rem] tabular-nums">{count}</span>
      </button>
    </li>
  );
}

function Heading({ children }: { children: ComponentChildren }) {
  return (
    <h2 className="font-ui text-muted px-3 pt-5 pb-2 text-[0.75rem] font-semibold tracking-[0.14em] uppercase">
      {children}
    </h2>
  );
}

/** The library's guide, like YouTube's left-hand column. */
export function Sidebar(props: Props) {
  const { filters, onFilter } = props;
  const [allSpeakers, setAllSpeakers] = useState(false);
  const browsingAll =
    filters.category === 'all' && !filters.series && !filters.conference && !filters.speaker;
  const speakers = allSpeakers ? props.speakers : props.speakers.slice(0, SPEAKERS_SHOWN);

  return (
    <nav aria-label="Library" className="font-ui">
      <ul>
        <Item
          active={browsingAll}
          label="All messages"
          count={props.total}
          onClick={() => onFilter(CLEAR)}
        />
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((category) => (
          <Item
            key={category}
            active={filters.category === category && !filters.series && !filters.conference}
            label={CATEGORY_LABELS[category]}
            count={props.categories[category]}
            onClick={() => onFilter({ ...CLEAR, category })}
          />
        ))}
      </ul>

      <Heading>Series</Heading>
      <ul>
        {props.series.map((s) => (
          <Item
            key={s.key}
            active={filters.series === s.key}
            label={s.label}
            count={s.count}
            onClick={() => onFilter({ ...CLEAR, series: s.key })}
          />
        ))}
      </ul>

      <Heading>Houston Bible Conference</Heading>
      <ul>
        {props.conferences.map((c) => (
          <Item
            key={c.key}
            active={filters.conference === c.key}
            label={c.label.replace(' Houston Bible Conference', ' Conference')}
            count={c.count}
            onClick={() => onFilter({ ...CLEAR, conference: c.key })}
          />
        ))}
      </ul>

      <Heading>Speakers</Heading>
      <ul>
        {speakers.map((s) => (
          <Item
            key={s.key}
            active={filters.speaker === s.key}
            label={s.label}
            count={s.count}
            onClick={() => onFilter({ ...CLEAR, speaker: s.key })}
          >
            <Avatar speaker={s.label} size="sm" />
          </Item>
        ))}
      </ul>
      {props.speakers.length > SPEAKERS_SHOWN && (
        <button
          type="button"
          onClick={() => setAllSpeakers(!allSpeakers)}
          className="text-ink-soft hover:bg-ink/[0.06] mt-1 min-h-10 rounded-xl px-3 py-2 text-[0.92rem]"
        >
          {allSpeakers ? 'Show fewer' : `Show all ${props.speakers.length} speakers`}
        </button>
      )}

      {props.hasHistory && (
        <p className="border-rule mt-6 border-t px-3 pt-4">
          <button
            type="button"
            onClick={props.onClearHistory}
            className="text-muted decoration-rule hover:text-ink text-[0.82rem] underline underline-offset-4"
          >
            Clear watch history
          </button>
        </p>
      )}
    </nav>
  );
}
