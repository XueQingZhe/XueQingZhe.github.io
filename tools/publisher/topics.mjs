import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { boundedSite } from './site-content.mjs';

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const own = (value, key) => Object.hasOwn(value, key);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, max) => typeof value === 'string' && value.trim() && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
const list = value => Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];
const topicKey = entry => ['published', 'collections'].includes(entry.collection) ? `${entry.collection}:${entry.id}` : entry.id;
const aliases = entry => [entry.key,entry.id,entry.metadata?.replaces,entry.metadata?.replaces?.split(':').slice(1).join(':')].filter(Boolean);
const articleKey = entry => entry.metadata?.replaces || entry.key;

export class TopicStore {
  constructor({site, state}) {
    this.site = site;
    this.file = path.join(site, 'src/data/publisher-topics.json');
    this.pendingFile = path.join(state, 'topics-draft.json');
  }
  async read(file) {
    const stat = await fs.lstat(file).catch(error => {if(error.code === 'ENOENT') return null; throw error;});
    if(stat?.isSymbolicLink() || stat && !stat.isFile()) throw Error('专题配置不能是链接或目录');
    const raw = stat ? await fs.readFile(file, 'utf8') : '';
    const data = raw ? JSON.parse(raw) : {version:1, topics:{}};
    if(data.version !== 1 || !object(data.topics)) throw Error('专题配置格式无效');
    return {raw, data};
  }
  async state() {
    const current = await this.read(this.file), pending = await this.read(this.pendingFile);
    const topics={...current.data.topics};
    for(const [key,patch] of Object.entries(pending.data.topics))topics[key]={...topics[key],...patch};
    return {current,pending,document:{version:1,topics}};
  }
  async scan(entries) {
    const {pending,document} = await this.state();
    const isCollection=entry=>{
      if(entry.section!=='work')return false;
      if(entry.metadata?.workType)return entry.metadata.workType==='collection';
      const config=[topicKey(entry),...aliases(entry)].map(key=>document.topics[key]).find(Boolean);
      return config&&own(config,'notes')||list(entry.notes??entry.metadata?.notes).length>0||entries.some(child=>aliases(entry).includes(child.work??child.metadata?.work));
    };
    const available = entries.filter(e => !e.draft && !isCollection(e) && !e.replacedBy);
    const visible = available.filter(e => e.metadata?.withdrawn !== true);
    const resolve = key => available.find(e => e.key === key || e.metadata?.replaces === key) ?? (!key.includes(':') ? available.find(e=>aliases(e).includes('notes:'+key)) : null) ?? available.find(e => aliases(e).includes(key));
    const topics = entries.filter(e => !e.draft && !e.replacedBy && e.section === 'work').map(entry => {
      const key = entry.metadata?.replaces?.startsWith('work:') ? entry.metadata.replaces.slice(5) : topicKey(entry);
      const overrideKeys=[key,...(entry.metadata?.replaces?.startsWith('work:')?[entry.metadata.replaces]:[]),entry.key,...aliases(entry)];
      const override = overrideKeys.map(key=>document.topics[key]).find(Boolean) ?? {};
      const inherited = list(entry.notes ?? entry.metadata?.notes);
      const references = own(override,'notes') ? override.notes : [...inherited,...available.filter(e => [key,...aliases(entry)].includes(e.work ?? e.metadata?.work)).map(e => e.key)];
      const notes = [...new Set(references.map(ref => resolve(ref) ? articleKey(resolve(ref)) : ref))];
      const cover=entry.metadata?.cover??'';
      let coverVideo=entry.metadata?.coverVideo;
      // Older collections saved only a member's poster. Recover only one exact
      // poster/video match; an explicit empty video always requests a still image.
      if(!own(entry.metadata??{},'coverVideo')&&isCollection(entry)&&cover){
        const candidates=[...new Set(notes.map(resolve).filter(member=>member?.metadata?.withdrawn!==true&&member?.metadata?.cover===cover&&member.metadata.coverVideo).map(member=>member.metadata.coverVideo))];
        if(candidates.length===1)coverVideo=candidates[0];
      }
      return {key,workType:isCollection(entry)?'collection':'single',title:entry.settings?.title ?? override.title ?? entry.title,summary:entry.settings?.summary ?? override.summary ?? entry.metadata?.summary ?? '',cover,...coverVideo!==undefined?{coverVideo}:{},notes,visibleNotes:notes.filter(ref=>visible.some(entry=>articleKey(entry)===ref)),withdrawn:entry.metadata?.withdrawn===true,url:entry.url,pending:own(pending.data.topics,key),overrides:{title:own(override,'title'),summary:own(override,'summary')}};
    });
    const article = e => ({key:articleKey(e),title:e.title,url:e.url,cover:e.metadata?.cover??'',...own(e.metadata??{},'coverVideo')?{coverVideo:e.metadata.coverVideo}:{},summary:e.metadata?.summary??'',section:e.section,pending:!!e.pending});
    return {topics,articles:visible.map(article),withdrawnArticles:available.filter(e=>e.metadata?.withdrawn===true).map(e=>({...article(e),withdrawn:true})),pending:Object.keys(pending.data.topics).length>0};
  }
  async save(input, entries) {
    if(!object(input) || Object.keys(input).some(key => !['key','title','summary','notes'].includes(key))) throw Error('专题设置包含无效字段');
    const catalog = await this.scan(entries), topic = catalog.topics.find(t => t.key === input.key);
    if(!topic) throw Error('网站中找不到这个作品专题，请重新扫描');
    if(!text(input.title,200) || !text(input.summary,2000)) throw Error('请填写专题标题和摘要');
    const self=entries.find(e=>e.section==='work'&&e.url===topic.url);
    const memberAllowed = key => catalog.articles.some(a => a.key === key) || topic.notes.includes(key) && catalog.withdrawnArticles.some(a => a.key === key);
    if(!Array.isArray(input.notes) || input.notes.length > 500 || input.notes.some(key => typeof key !== 'string' || self&&aliases(self).includes(key) || !memberAllowed(key)) || new Set(input.notes).size !== input.notes.length) throw Error('关联文章无效、重复或已经撤回，请重新选择');
    const {pending} = await this.state();
    const patch={notes:input.notes};
    if(input.title.trim()!==topic.title || topic.overrides.title)patch.title=input.title.trim();
    if(input.summary.trim()!==topic.summary || topic.overrides.summary)patch.summary=input.summary.trim();
    pending.data.topics[input.key] = patch;
    await fs.mkdir(path.dirname(this.pendingFile),{recursive:true});
    await fs.writeFile(this.pendingFile+'.tmp',JSON.stringify(pending.data,null,2)+'\n');
    await fs.rename(this.pendingFile+'.tmp',this.pendingFile);
    return this.scan(entries);
  }
  async snapshot(entries) {
    const {current,pending,document} = await this.state(), catalog = await this.scan(entries);
    const knownArticles = [...catalog.articles, ...catalog.withdrawnArticles];
    for(const [key,value] of Object.entries(pending.data.topics)) {
      if(!catalog.topics.some(t => t.key === key)) throw Error('待写入的专题已不存在，请重新扫描');
      if(catalog.topics.find(t=>t.key===key).notes.some(ref => !knownArticles.some(a => a.key === ref))) throw Error('专题包含已缺失或不再公开的文章，请重新调整关联文章');
    }
    const changedKeys=Object.keys(pending.data.topics);
    // These website originals stay in place when generated replacements are installed.
    // Keep their identities and draft state stable through the reviewed transaction.
    const sources=changedKeys.length?entries.filter(entry=>!['published','collections'].includes(entry.collection)&&entry.path&&entry.digest).map(({path,digest})=>({path,digest})):[];
    return {document,sources,digest:digest(current.raw),pendingDigest:digest(pending.raw),changes:changedKeys.map(key=>({key,title:catalog.topics.find(t=>t.key===key).title,notes:catalog.topics.find(t=>t.key===key).notes.map(ref=>({key:ref,title:knownArticles.find(a=>a.key===ref)?.title ?? ref,...knownArticles.find(a=>a.key===ref)?.withdrawn?{withdrawn:true}:{}}))}))};
  }
  async verify(snapshot, {applied=false}={}) {
    const {current,pending} = await this.state();
    const expected = applied ? digest(JSON.stringify(snapshot.document,null,2)+'\n') : snapshot.digest;
    if(digest(current.raw)!==expected || digest(pending.raw)!==snapshot.pendingDigest) throw Error('专题设置已改变，请重新分析并审核');
    for(const source of snapshot.sources??[]){
      const file=await boundedSite(this.site,source.path).catch(()=>null);
      if(!file || digest(await fs.readFile(file))!==source.digest)throw Error('专题涉及的网站文章已改变，请重新分析并审核');
    }
  }
  async stage(snapshot, dir) {
    await fs.writeFile(path.join(dir,'topics'),JSON.stringify(snapshot.document,null,2)+'\n');
  }
  async finish(snapshot) {
    const pending = await this.read(this.pendingFile);
    if(digest(pending.raw)===snapshot.pendingDigest) await fs.rm(this.pendingFile,{force:true});
  }
}
