import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { boundedSite } from './site-content.mjs';

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const own = (value, key) => Object.hasOwn(value, key);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, max) => typeof value === 'string' && value.trim() && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
const list = value => Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];
const topicKey = entry => entry.collection === 'published' ? `published:${entry.id}` : entry.id;
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
    const visible = entries.filter(e => !e.draft && e.section !== 'work' && !e.replacedBy);
    const resolve = key => visible.find(e => e.key === key || e.metadata?.replaces === key) ?? (!key.includes(':') ? visible.find(e=>aliases(e).includes('notes:'+key)) : null) ?? visible.find(e => aliases(e).includes(key));
    const topics = entries.filter(e => !e.draft && !e.replacedBy && e.section === 'work').map(entry => {
      const key = entry.metadata?.replaces?.startsWith('work:') ? entry.metadata.replaces.slice(5) : topicKey(entry);
      const overrideKeys=[key,...(entry.metadata?.replaces?.startsWith('work:')?[entry.metadata.replaces]:[]),entry.key,...aliases(entry)];
      const override = overrideKeys.map(key=>document.topics[key]).find(Boolean) ?? {};
      const inherited = list(entry.notes ?? entry.metadata?.notes);
      const references = own(override,'notes') ? override.notes : [...inherited,...visible.filter(e => [key,...aliases(entry)].includes(e.work ?? e.metadata?.work)).map(e => e.key)];
      const notes = [...new Set(references.map(ref => resolve(ref) ? articleKey(resolve(ref)) : ref))];
      return {key,title:override.title ?? entry.title,summary:override.summary ?? entry.metadata?.summary ?? '',notes,url:entry.url,pending:own(pending.data.topics,key),overrides:{title:own(override,'title'),summary:own(override,'summary')}};
    });
    return {topics,articles:visible.map(e => ({key:articleKey(e),title:e.title,url:e.url,pending:!!e.pending})),pending:Object.keys(pending.data.topics).length>0};
  }
  async save(input, entries) {
    if(!object(input) || Object.keys(input).some(key => !['key','title','summary','notes'].includes(key))) throw Error('专题设置包含无效字段');
    const catalog = await this.scan(entries), topic = catalog.topics.find(t => t.key === input.key);
    if(!topic) throw Error('网站中找不到这个作品专题，请重新扫描');
    if(!text(input.title,200) || !text(input.summary,2000)) throw Error('请填写专题标题和摘要');
    if(!Array.isArray(input.notes) || input.notes.length > 500 || input.notes.some(key => typeof key !== 'string' || !catalog.articles.some(a => a.key === key)) || new Set(input.notes).size !== input.notes.length) throw Error('关联文章无效、重复或已经撤回，请重新选择');
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
    for(const [key,value] of Object.entries(pending.data.topics)) {
      if(!catalog.topics.some(t => t.key === key)) throw Error('待写入的专题已不存在，请重新扫描');
      if(catalog.topics.find(t=>t.key===key).notes.some(ref => !catalog.articles.some(a => a.key === ref))) throw Error('专题包含不再公开的文章，请重新调整关联文章');
    }
    const changedKeys=Object.keys(pending.data.topics);
    // These website originals stay in place when generated replacements are installed.
    // Keep their identities and draft state stable through the reviewed transaction.
    const sources=changedKeys.length?entries.filter(entry=>entry.collection!=='published'&&entry.path&&entry.digest).map(({path,digest})=>({path,digest})):[];
    return {document,sources,digest:digest(current.raw),pendingDigest:digest(pending.raw),changes:changedKeys.map(key=>({key,title:catalog.topics.find(t=>t.key===key).title,notes:catalog.topics.find(t=>t.key===key).notes.map(ref=>({key:ref,title:catalog.articles.find(a=>a.key===ref)?.title ?? ref}))}))};
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
