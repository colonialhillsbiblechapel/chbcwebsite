import { getCollection, getEntry, render } from 'astro:content';
import { isoDay, todayInHouston } from './dates';
import { readDoctrine } from './doctrines';

export async function getSettings() {
  const entry = await getEntry('settings', 'site');
  if (!entry) throw new Error('Missing src/content/settings/site.yaml');
  return entry.data;
}

export async function getMeetings() {
  const entries = await getCollection('meetings');
  return entries.map((e) => e.data).sort((a, b) => a.order - b.order);
}

/** Events that haven't finished yet (Houston time), soonest first. */
export async function getUpcomingEvents() {
  const today = todayInHouston();
  const entries = await getCollection('events');
  return entries
    .map((e) => ({ id: e.id, ...e.data, lastDay: isoDay(e.data.endDate ?? e.data.date) }))
    .filter((e) => e.lastDay >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** All entries of a collection that has an `order` field, in that order. */
async function ordered<C extends 'beliefs' | 'missionaries' | 'links' | 'doctrines'>(
  collection: C,
) {
  const entries = await getCollection(collection);
  return entries.sort((a, b) => a.data.order - b.data.order);
}

export const getBeliefs = async () => (await ordered('beliefs')).map((e) => e.data);
export const getMissionaries = () => ordered('missionaries');
export const getLinkCategories = async () => (await ordered('links')).map((e) => e.data);

/**
 * The Statement of Doctrines & Practices: the Declaration of Faith introduction and the topics in
 * order, each read into blocks (see doctrines.ts).
 */
export async function getDoctrines() {
  const intro = await getEntry('pages', 'doctrines');
  if (!intro) throw new Error('Missing src/content/pages/doctrines.md');
  const topics = (await ordered('doctrines')).map((entry) => {
    const blocks = readDoctrine(entry.body ?? '', entry.id);
    return {
      id: entry.id,
      ...entry.data,
      blocks,
      subsections: blocks.filter((b) => b.kind === 'h3'),
    };
  });
  return {
    introduction: { title: intro.data.title, blocks: readDoctrine(intro.body ?? '') },
    topics,
  };
}

/** A long-form page text: its title/subtitle and the rendered Markdown body. */
export async function getPage(id: 'welcome' | 'history' | 'gospel') {
  const entry = await getEntry('pages', id);
  if (!entry) throw new Error(`Missing src/content/pages/${id}.md`);
  return { ...entry.data, Content: (await render(entry)).Content };
}

interface Address {
  street: string;
  city: string;
  region: string;
  postalCode: string;
}

/** "Houston, TX 77060" */
export function cityLine(address: Address): string {
  return `${address.city}, ${address.region} ${address.postalCode}`;
}

export function directionsLinks(address: Address) {
  const q = encodeURIComponent(`${address.street}, ${cityLine(address)}`);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    apple: `https://maps.apple.com/?daddr=${q}`,
  };
}
