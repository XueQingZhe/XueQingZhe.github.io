import { getCollection, type CollectionEntry } from 'astro:content';
import topicSettings from '../data/publisher-topics.json';

export type ContentSection = 'notes' | 'tutorials' | 'work';
type SectionEntry = { collection: string; data: { section?: ContentSection; kind?: string; draft?: boolean } };
type IdentityEntry = { collection: string; id: string; data: { legacyUrl?: string; replaces?: string; title?: string } };
export type ArticleEntry = CollectionEntry<'notes'> | CollectionEntry<'published'> | CollectionEntry<'legacy'>;
type WorkData = CollectionEntry<'work'>['data'];
type TopicOverride = Partial<WorkData> & {notes?:string[]};
const topicConfig = topicSettings.topics as Record<string,TopicOverride>;

export function sectionOf(entry: SectionEntry): ContentSection {
  if (entry.collection === 'work') return 'work';
  return entry.data.section ?? (entry.data.kind === 'work' ? 'work' : entry.data.kind === 'tutorial' ? 'tutorials' : 'notes');
}
export function articleKey(entry: {collection:string;id:string}) { return `${entry.collection}:${entry.id}`; }
export function workKey(n: { collection: string; id: string }) { return n.collection === 'published' ? `published:${n.id}` : n.id; }

/** Canonical addresses are inherited by synchronized replacements, never by the generated filename. */
function canonicalUrl(n: IdentityEntry) {
  let url = n.data.legacyUrl;
  if (!url && n.data.replaces) {
    const [collection,...slug]=n.data.replaces.split(':');
    if(collection === 'notes' || collection === 'work') url=`/${collection}/${slug.join(':')}/`;
  }
  url ||= n.collection === 'work' ? `/work/${n.id}/` : `/notes/${n.id}/`;
  if(!url.startsWith('/') || url.startsWith('//') || !url.endsWith('/') || /[?#\\]/.test(url) || url.split('/').some(part=>part==='.'||part==='..')) throw Error(`无效的公开文章地址：${url}`);
  return url;
}
export function noteUrl(n: IdentityEntry) { return canonicalUrl(n); }
export function workUrl(n: IdentityEntry) { return canonicalUrl(n); }
export function entryAliases(n: IdentityEntry) {
  const aliases=[articleKey(n),n.id];
  if(n.data.replaces){aliases.push(n.data.replaces,n.data.replaces.slice(n.data.replaces.indexOf(':')+1));}
  return [...new Set(aliases)];
}
function matchesReference(entry: IdentityEntry, reference: string) { return entryAliases(entry).includes(reference); }

/** Suppress synchronized originals before lists, relationships and static paths are generated. */
async function visibleContent() {
  const [notes,legacy,work,published]=await Promise.all([getCollection('notes'),getCollection('legacy'),getCollection('work'),getCollection('published')]);
  const originals=[...notes,...legacy,...work],originalKeys=new Map(originals.map(entry=>[articleKey(entry),entry]));
  const active=published.filter(entry=>!entry.data.draft).map(entry=>{
    const original=entry.data.replaces?originalKeys.get(entry.data.replaces):undefined;
    if(!original)return entry;
    return {...entry,data:{...entry.data,
      ...(entry.data.work===undefined&&'work' in original.data?{work:original.data.work}:{}),
      ...(entry.data.notes===undefined&&'notes' in original.data?{notes:original.data.notes}:{}),
    }};
  }),replaced=new Map<string,string>();
  for(const entry of active){
    const target=entry.data.replaces;if(!target)continue;
    const original=originalKeys.get(target);
    if(!original)throw Error(`同步目标不存在：${target}`);
    if(replaced.has(target))throw Error(`同一文章被重复同步：${target}`);
    if(canonicalUrl(entry)!==canonicalUrl(original))throw Error(`同步文章必须保留原地址：${target}`);
    replaced.set(target,entry.id);
  }
  const visible=[...originals.filter(entry=>!entry.data.draft&&!replaced.has(articleKey(entry))),...active];
  const urls=new Map<string,string>();
  for(const entry of visible){
    const url=decodeURIComponent(canonicalUrl(entry));
    if(urls.has(url))throw Error(`公开文章地址重复：${url}（${urls.get(url)} / ${articleKey(entry)}）`);
    urls.set(url,articleKey(entry));
  }
  return visible;
}
export async function allArticles() {
  return (await visibleContent()).filter((entry):entry is ArticleEntry=>entry.collection!=='work').sort((a,b)=>b.data.date.valueOf()-a.data.date.valueOf());
}
export async function allNotes() { return (await allArticles()).filter(n => sectionOf(n) === 'notes'); }
export async function tutorials() {
  return (await allArticles()).filter(n => sectionOf(n) === 'tutorials').sort((a,b) => articleOrder(a)-articleOrder(b) || a.data.date.valueOf()-b.data.date.valueOf());
}
export function articleOrder(entry: ArticleEntry) { return 'order' in entry.data ? entry.data.order : 100; }
export function articleSeries(entry: ArticleEntry) { return 'series' in entry.data ? entry.data.series?.trim() || '' : ''; }

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
  const works=(await visibleContent()).filter(entry=>sectionOf(entry)==='work').map(entry=>{
    const replaces='replaces' in entry.data ? entry.data.replaces : undefined;
    const aliases=[...(replaces?[replaces.slice(replaces.indexOf(':')+1),replaces]:[]),workKey(entry),articleKey(entry),...entryAliases(entry)];
    const override=aliases.map(key=>topicConfig[key]).find(Boolean) ?? {};
    const data={...entry.data,...override} as WorkData & {date?:Date};
    return {...entry,data:{...data,summary:data.summary ?? '',cover:data.cover ?? '',year:data.year ?? data.date?.getUTCFullYear() ?? new Date().getUTCFullYear()},topicNotesExplicit:Object.hasOwn(override,'notes')};
  });
  return works.sort((a,b)=>b.data.year-a.data.year||a.data.order-b.data.order);
}
export type TopicEntry=Awaited<ReturnType<typeof allWork>>[number];

/** Explicit topic configuration is authoritative, including an empty list used to detach every child. */
export function topicArticles(topic:TopicEntry,articles:ArticleEntry[]) {
  const explicit=topic.data.notes ? (Array.isArray(topic.data.notes)?topic.data.notes:[topic.data.notes]) : [];
  const candidates=articles.filter(entry=>sectionOf(entry)!=='work');
  const output:ArticleEntry[]=[],seen=new Set<string>();
  const add=(entry:ArticleEntry|undefined)=>{if(entry&&!seen.has(articleKey(entry))){seen.add(articleKey(entry));output.push(entry);}};
  for(const reference of explicit){
    // Namespaced references resolve replacement aliases; old bare note slugs stay compatible.
    const exact=candidates.find(entry=>articleKey(entry)===reference||('replaces' in entry.data&&entry.data.replaces===reference));
    const legacyNote=!reference.includes(':')?candidates.find(entry=>matchesReference(entry,`notes:${reference}`)):undefined;
    add(exact??legacyNote??candidates.find(entry=>matchesReference(entry,reference)));
  }
  if(!topic.topicNotesExplicit){
    const inferred=candidates.filter(entry=>entry.data.work&&matchesReference(topic,entry.data.work)).sort((a,b)=>articleOrder(a)-articleOrder(b)||a.data.date.valueOf()-b.data.date.valueOf()||articleKey(a).localeCompare(articleKey(b)));
    inferred.forEach(add);
  }
  return output;
}
export function articleTopics(entry:ArticleEntry,topics:TopicEntry[],articles:ArticleEntry[]) {
  return topics.flatMap(topic=>{
    const items=topicArticles(topic,articles),index=items.findIndex(item=>articleKey(item)===articleKey(entry));
    return index<0?[]:[{topic,index,items,prev:items[index-1]??null,next:items[index+1]??null}];
  });
}
export function articleNeighbors(entry: ArticleEntry, all: ArticleEntry[]) {
  const section = sectionOf(entry), series = articleSeries(entry);
  const siblings = all.filter(n => sectionOf(n) === section && (!(section === 'tutorials' || series) || articleSeries(n) === series));
  siblings.sort((a,b) => section === 'tutorials' ? articleOrder(a)-articleOrder(b) || a.data.date.valueOf()-b.data.date.valueOf() : b.data.date.valueOf()-a.data.date.valueOf());
  const index = siblings.findIndex(n => articleKey(n) === articleKey(entry));
  return {prev:siblings[index-1] ?? null,next:siblings[index+1] ?? null};
}

/** One owner per canonical path, even when an imported article changes its collection or section. */
export async function detailPages() {
  const [articles,works]=await Promise.all([allArticles(),allWork()]);
  return [
    ...articles.filter(entry=>sectionOf(entry)!=='work').map(entry=>({url:noteUrl(entry),entry,...articleNeighbors(entry,articles),isWork:false})),
    ...works.map((entry,index)=>({url:workUrl(entry),entry,prev:works[index-1]??null,next:works[index+1]??null,isWork:true})),
  ];
}
