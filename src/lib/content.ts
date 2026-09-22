import { getCollection, type CollectionEntry } from 'astro:content';

export type ContentSection = 'notes' | 'tutorials' | 'work';
type SectionEntry = { collection: string; data: { section?: ContentSection; kind?: string; draft?: boolean } };
export type ArticleEntry = CollectionEntry<'notes'> | CollectionEntry<'published'> | CollectionEntry<'legacy'>;

export function sectionOf(entry: SectionEntry): ContentSection {
  if (entry.collection === 'work') return 'work';
  return entry.data.section ?? (entry.data.kind === 'work' ? 'work' : entry.data.kind === 'tutorial' ? 'tutorials' : 'notes');
}

/** Every public article, including published tutorials and work with stable /notes URLs. */
export async function allArticles() {
  const groups = await Promise.all([getCollection('notes'), getCollection('published'), getCollection('legacy')]);
  return groups.flat().filter(n => !n.data.draft).sort((a,b) => b.data.date.valueOf()-a.data.date.valueOf());
}

export async function allNotes() { return (await allArticles()).filter(n => sectionOf(n) === 'notes'); }
export async function tutorials() {
  return (await allArticles()).filter(n => sectionOf(n) === 'tutorials').sort((a,b) => articleOrder(a)-articleOrder(b) || a.data.date.valueOf()-b.data.date.valueOf());
}
export function articleOrder(entry: ArticleEntry) { return 'order' in entry.data ? entry.data.order : 100; }
export function articleSeries(entry: ArticleEntry) { return 'series' in entry.data ? entry.data.series?.trim() || '' : ''; }
export function noteUrl(n: { collection?: string; id: string; data: { legacyUrl?: string; title?: string } }) {
  return n.collection !== 'published' && n.data.legacyUrl ? n.data.legacyUrl : `/notes/${n.id}/`;
}
export function workUrl(n: { collection: string; id: string }) { return n.collection === 'published' ? `/notes/${n.id}/` : `/work/${n.id}/`; }
export function workKey(n: { collection: string; id: string }) { return n.collection === 'published' ? `published:${n.id}` : n.id; }

/** A category exists publicly only when a visible entry in this section uses it. */
export function categoryCounts(entries: {data:{category?:string}}[]) {
  const counts = new Map<string,number>();
  for (const entry of entries) {
    const category = entry.data.category?.trim();
    if (category) counts.set(category,(counts.get(category) ?? 0)+1);
  }
  return [...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0],'zh-CN'));
}

export async function allWork() {
  const [existing,published] = await Promise.all([getCollection('work'),getCollection('published')]);
  const converted = published.filter(n => !n.data.draft && sectionOf(n) === 'work').map(n => ({...n,data:{
    ...n.data, summary:n.data.summary!, cover:n.data.cover!, year:n.data.year ?? n.data.date.getUTCFullYear(),
  }}));
  return [...existing.filter(n => !n.data.draft),...converted].sort((a,b) => b.data.year-a.data.year || a.data.order-b.data.order);
}

export function articleNeighbors(entry: ArticleEntry, all: ArticleEntry[]) {
  const section = sectionOf(entry), series = articleSeries(entry);
  const siblings = all.filter(n => sectionOf(n) === section && (!(section === 'tutorials' || series) || articleSeries(n) === series));
  siblings.sort((a,b) => section === 'tutorials' ? articleOrder(a)-articleOrder(b) || a.data.date.valueOf()-b.data.date.valueOf() : b.data.date.valueOf()-a.data.date.valueOf());
  const index = siblings.findIndex(n => n.collection === entry.collection && n.id === entry.id);
  return {prev:siblings[index-1] ?? null,next:siblings[index+1] ?? null};
}
