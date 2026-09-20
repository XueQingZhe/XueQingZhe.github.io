import { getCollection } from 'astro:content';
export async function allNotes() {
  const groups = await Promise.all([getCollection('notes'), getCollection('published'), getCollection('legacy')]);
  return groups.flat().filter(n => !n.data.draft && n.data.kind !== 'tutorial').sort((a,b) => b.data.date.valueOf()-a.data.date.valueOf());
}
export function noteUrl(n: any) { return n.data.legacyUrl || `/notes/${n.id}/`; }
export async function tutorials() { return (await getCollection('legacy')).filter(n=>!n.data.draft && n.data.kind==='tutorial'); }
