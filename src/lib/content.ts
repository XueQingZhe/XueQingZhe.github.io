import { getCollection, type CollectionEntry } from 'astro:content';
import topicSettings from '../data/publisher-topics.json';
import contentSettings from '../data/publisher-content.json';

export type ContentSection = 'notes' | 'tutorials' | 'work';
type SourceEntry = CollectionEntry<'notes'> | CollectionEntry<'published'> | CollectionEntry<'legacy'> | CollectionEntry<'work'>;
type SectionEntry = { collection: string; data: { section?: ContentSection; kind?: string; series?:string; draft?: boolean } };
type IdentityEntry = { collection: string; id: string; data: { legacyUrl?: string; replaces?: string; title?: string } };
type ContentData = CollectionEntry<'published'>['data'] & { date:Date; summary:string; cover:string; year:number };
type ContentOverride = Partial<ContentData> & {tags?:string[]};
export type ArticleEntry = Omit<SourceEntry,'collection'|'data'> & {collection:SourceEntry['collection']|'collections';data:ContentData;topicNotesExplicit:boolean};
export type TopicEntry = ArticleEntry;
const topicConfig = topicSettings.topics as Record<string,ContentOverride>;
const settings = contentSettings as {version:number;entries:Record<string,ContentOverride>;collections?:Record<string,ContentOverride>};

export function sectionOf(entry: SectionEntry): ContentSection {
  return entry.data.section ?? (entry.collection==='work'||entry.collection==='collections'||entry.data.kind==='work' ? 'work' : entry.data.kind==='tutorial'||entry.data.series?.trim() ? 'tutorials' : 'notes');
}
export function articleKey(entry: {collection:string;id:string}) { return `${entry.collection}:${entry.id}`; }
export function workKey(entry: {collection:string;id:string}) { return entry.collection==='published'||entry.collection==='collections' ? articleKey(entry) : entry.id; }
function stableKey(entry:IdentityEntry) { return entry.data.replaces ?? articleKey(entry); }

/** Routing belongs to the original identity, independently of its current content type. */
function canonicalUrl(entry: IdentityEntry) {
  let url=entry.data.legacyUrl;
  if(!url&&entry.data.replaces){const [collection,...slug]=entry.data.replaces.split(':');if(collection==='notes'||collection==='work')url=`/${collection}/${slug.join(':')}/`;}
  url ||= entry.collection==='work'||entry.collection==='collections' ? `/work/${entry.id}/` : `/notes/${entry.id}/`;
  if(!url.startsWith('/')||url.startsWith('//')||!url.endsWith('/')||/[?#\\]/.test(url)||url.split('/').some(part=>part==='.'||part==='..'))throw Error(`无效的公开文章地址：${url}`);
  return url;
}
export function noteUrl(entry:IdentityEntry) { return canonicalUrl(entry); }
export function workUrl(entry:IdentityEntry) { return canonicalUrl(entry); }
export function entryAliases(entry:IdentityEntry) {
  return [...new Set([articleKey(entry),entry.id,...(entry.data.replaces?[entry.data.replaces,entry.data.replaces.slice(entry.data.replaces.indexOf(':')+1)]:[])])];
}
function matchesReference(entry:IdentityEntry,reference:string) { return entryAliases(entry).includes(reference); }
function topicOverride(entry:IdentityEntry) {
  const replaces=entry.data.replaces;
  const aliases=[...(replaces?[replaces.slice(replaces.indexOf(':')+1),replaces]:[]),workKey(entry),articleKey(entry),...entryAliases(entry)];
  return aliases.map(key=>topicConfig[key]).find(Boolean) ?? {};
}

/** Website settings are final metadata; identity fields and canonical URLs stay with their source. */
function normalize(entry:SourceEntry|{collection:'collections';id:string;data:ContentOverride;body:string}):ArticleEntry {
  const identity=entry as IdentityEntry;
  const override=settings.entries[stableKey(identity)] ?? settings.entries[articleKey(entry)] ?? {};
  const preliminary={...entry.data,...override};
  const topic=sectionOf({collection:entry.collection,data:preliminary})==='work'?topicOverride(identity):{};
  const values={...entry.data,...topic,...override} as ContentOverride;
  const date=new Date(values.date ?? `${values.year??2000}-01-01`);
  if(Number.isNaN(date.valueOf()))throw Error(`文章日期无效：${articleKey(entry)}`);
  const section=entry.collection==='collections'?'work':sectionOf({collection:entry.collection,data:values});
  const data={...values,title:values.title??entry.id,summary:values.summary??'',date,year:values.year??date.getUTCFullYear(),section,
    kind:section==='work'?'work':section==='tutorials'?'tutorial':'article',category:values.category??'',
    tech:override.tags??override.tech??topic.tags??values.tech??values.tags??[],engine:values.engine??[],role:values.role??[],media:values.media??[],
    cover:values.cover||'/covers/placeholder.svg',order:values.order??100,featured:values.featured??false,status:values.status??'shipped',
    draft:values.draft??false,legacyUrl:'legacyUrl' in entry.data?entry.data.legacyUrl:undefined,replaces:'replaces' in entry.data?entry.data.replaces:undefined,
  } as ContentData;
  if(entry.collection==='collections')data.workType='collection';
  return {...entry,data,topicNotesExplicit:Object.hasOwn(override,'notes')||Object.hasOwn(topic,'notes')} as ArticleEntry;
}

async function visibleContent() {
  const [notes,legacy,work,published]=await Promise.all([getCollection('notes'),getCollection('legacy'),getCollection('work'),getCollection('published')]);
  const originals=[...notes,...legacy,...work],originalKeys=new Map(originals.map(entry=>[articleKey(entry),entry]));
  const active=published.map(entry=>{
    const original=entry.data.replaces?originalKeys.get(entry.data.replaces):undefined;
    return normalize(!original?entry:{...entry,data:{...entry.data,
      ...(entry.data.work===undefined&&'work' in original.data?{work:original.data.work}:{}),
      ...(entry.data.notes===undefined&&'notes' in original.data?{notes:original.data.notes}:{}),
      ...(entry.data.workType===undefined&&'workType' in original.data?{workType:original.data.workType}:{}),
    }});
  }).filter(entry=>!entry.data.draft),replaced=new Set<string>();
  for(const entry of active){
    const target=entry.data.replaces;if(!target)continue;
    const original=originalKeys.get(target);
    if(!original)throw Error(`同步目标不存在：${target}`);
    if(replaced.has(target))throw Error(`同一文章被重复同步：${target}`);
    if(canonicalUrl(entry)!==canonicalUrl(original))throw Error(`同步文章必须保留原地址：${target}`);
    replaced.add(target);
  }
  const collections=Object.entries(settings.collections??{}).map(([id,data])=>normalize({collection:'collections',id,data:{...data,section:'work',workType:'collection'},body:''}));
  const visible=[...originals.filter(entry=>!replaced.has(articleKey(entry))).map(normalize),...active,...collections].filter(entry=>!entry.data.draft);
  const urls=new Map<string,string>();
  for(const entry of visible){const url=decodeURIComponent(canonicalUrl(entry));if(urls.has(url))throw Error(`公开文章地址重复：${url}（${urls.get(url)} / ${articleKey(entry)}）`);urls.set(url,articleKey(entry));}
  for(const entry of visible)if(sectionOf(entry)==='work'&&!entry.data.workType){
    const explicit=entry.data.notes?(Array.isArray(entry.data.notes)?entry.data.notes:[entry.data.notes]):[];
    const inferred=!entry.topicNotesExplicit&&visible.some(child=>child.data.work&&matchesReference(entry,child.data.work));
    entry.data.workType=entry.topicNotesExplicit||explicit.length||inferred?'collection':'single';
  }
  return visible;
}

/** The journal is the complete public index, with one item per canonical address. */
export async function allArticles() { return (await visibleContent()).sort((a,b)=>b.data.date.valueOf()-a.data.date.valueOf()||articleKey(a).localeCompare(articleKey(b))); }
export async function allNotes() { return allArticles(); }
export async function allWork() { return (await visibleContent()).filter(entry=>sectionOf(entry)==='work').sort((a,b)=>b.data.year-a.data.year||articleOrder(a)-articleOrder(b)); }
export async function tutorials() { return (await allArticles()).filter(entry=>sectionOf(entry)==='tutorials').sort((a,b)=>articleOrder(a)-articleOrder(b)||a.data.date.valueOf()-b.data.date.valueOf()); }
export function articleOrder(entry:ArticleEntry) { return entry.data.order??100; }
export function articleSeries(entry:ArticleEntry) { return entry.data.series?.trim()||''; }
export function articleKind(entry:ArticleEntry) { return sectionOf(entry)==='work'?(entry.data.workType==='collection'?'collection':'work'):sectionOf(entry)==='tutorials'?'tutorial':'article'; }
export function articleKindLabel(entry:ArticleEntry) { return {article:'普通文章',work:'独立作品',collection:'作品合集',tutorial:'研习系列文章'}[articleKind(entry)]; }
export function categoryCounts(entries:{data:{category?:string}}[]) {
  const counts=new Map<string,number>();for(const entry of entries){const category=entry.data.category?.trim();if(category)counts.set(category,(counts.get(category)??0)+1);}
  return [...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0],'zh-CN'));
}

/** Explicit lists are ordered and authoritative, including [] for a deliberate detach. */
export function topicArticles(topic:TopicEntry,articles:ArticleEntry[]) {
  if(topic.data.workType==='single')return [];
  const explicit=topic.data.notes?(Array.isArray(topic.data.notes)?topic.data.notes:[topic.data.notes]):[];
  const candidates=articles.filter(entry=>(sectionOf(entry)!=='work'||entry.data.workType!=='collection')&&articleKey(entry)!==articleKey(topic));
  const output:ArticleEntry[]=[],seen=new Set<string>();
  const add=(entry:ArticleEntry|undefined)=>{if(entry&&!seen.has(articleKey(entry))){seen.add(articleKey(entry));output.push(entry);}};
  for(const reference of explicit){
    const exact=candidates.find(entry=>articleKey(entry)===reference||entry.data.replaces===reference);
    const oldNote=!reference.includes(':')?candidates.find(entry=>matchesReference(entry,`notes:${reference}`)):undefined;
    add(exact??oldNote??candidates.find(entry=>matchesReference(entry,reference)));
  }
  if(!topic.topicNotesExplicit)candidates.filter(entry=>entry.data.work&&matchesReference(topic,entry.data.work)).sort((a,b)=>articleOrder(a)-articleOrder(b)||a.data.date.valueOf()-b.data.date.valueOf()||articleKey(a).localeCompare(articleKey(b))).forEach(add);
  return output;
}
export function articleTopics(entry:ArticleEntry,topics:TopicEntry[],articles:ArticleEntry[]) {
  return topics.flatMap(topic=>{const items=topicArticles(topic,articles),index=items.findIndex(item=>articleKey(item)===articleKey(entry));return index<0?[]:[{topic,index,items,prev:items[index-1]??null,next:items[index+1]??null}];});
}
export function articleNeighbors(entry:ArticleEntry,all:ArticleEntry[]) {
  const section=sectionOf(entry),series=articleSeries(entry);
  const siblings=all.filter(item=>sectionOf(item)===section&&(section!=='tutorials'||articleSeries(item)===series));
  siblings.sort((a,b)=>section==='tutorials'?articleOrder(a)-articleOrder(b)||a.data.date.valueOf()-b.data.date.valueOf():b.data.date.valueOf()-a.data.date.valueOf());
  const index=siblings.findIndex(item=>articleKey(item)===articleKey(entry));return {prev:siblings[index-1]??null,next:siblings[index+1]??null};
}
export async function detailPages() {
  const articles=await allArticles(),works=articles.filter(entry=>sectionOf(entry)==='work').sort((a,b)=>b.data.year-a.data.year||articleOrder(a)-articleOrder(b));
  return [...articles.filter(entry=>sectionOf(entry)!=='work').map(entry=>({url:noteUrl(entry),entry,...articleNeighbors(entry,articles),isWork:false})),...works.map((entry,index)=>({url:workUrl(entry),entry,prev:works[index-1]??null,next:works[index+1]??null,isWork:true}))];
}
