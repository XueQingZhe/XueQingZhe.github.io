import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { boundedSite } from './site-content.mjs';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export const contentKey = entry => entry.replaces || entry.metadata?.replaces || entry.key;
const serialize = data => JSON.stringify(data, null, 2) + '\n';
const empty = () => ({ version: 1, entries: {}, collections: {} });

export class ContentSettingsStore {
  constructor({ site, state, normalize }) {
    this.site = site; this.normalize = normalize;
    this.file = path.join(site, 'src/data/publisher-content.json');
    this.pendingFile = path.join(state, 'content-settings-draft.json');
  }
  async read(file) {
    const stat = await fs.lstat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (stat?.isSymbolicLink() || stat && !stat.isFile()) throw Error('内容设置不能是链接或目录');
    if (stat && file === this.file) await boundedSite(this.site, 'src/data/publisher-content.json');
    const raw = stat ? await fs.readFile(file, 'utf8') : '', data = raw ? JSON.parse(raw) : empty();
    if (data.version !== 1 || !object(data.entries) || data.collections != null && !object(data.collections)) throw Error('内容设置格式无效');
    data.collections ??= {};
    for (const [key, metadata] of Object.entries(data.entries)) {
      if (!/^(?:notes|legacy|work|published|collections):[^\u0000-\u001f]+$/.test(key)) throw Error('内容设置标识无效');
      this.normalize(metadata);
    }
    for (const [key, metadata] of Object.entries(data.collections)) {
      if (!/^collection-[a-z0-9-]+$/.test(key) || !object(metadata)) throw Error('作品合集标识无效');
      this.normalize(metadata);
    }
    return { raw, data };
  }
  async state() {
    const current = await this.read(this.file), pending = await this.read(this.pendingFile), document = structuredClone(current.data);
    for (const group of ['entries', 'collections']) for (const [key, metadata] of Object.entries(pending.data[group])) document[group][key] = { ...document[group][key], ...metadata };
    return { current, pending, document };
  }
  async writePending(data) {
    await fs.mkdir(path.dirname(this.pendingFile), { recursive: true });
    await fs.writeFile(this.pendingFile + '.tmp', serialize(data)); await fs.rename(this.pendingFile + '.tmp', this.pendingFile);
  }
  async decorate(entries, topicDocument = { topics: {} }) {
    const { current, pending, document } = await this.state();
    const decorated = entries.map(entry => {
      const key = contentKey(entry), topicKey = key.startsWith('work:') ? key.slice(5) : key;
      const topic = entry.section === 'work' ? topicDocument.topics[topicKey] ?? topicDocument.topics[key] ?? {} : {};
      const topicMetadata = Object.fromEntries(['title', 'summary'].filter(field => Object.hasOwn(topic, field)).map(field => [field, topic[field]]));
      const currentMetadata = { ...entry.metadata, ...topicMetadata, ...current.data.entries[key] };
      const settings = document.entries[key] ?? {}, metadata = { ...currentMetadata, ...settings };
      return { ...entry, canonicalKey: key, currentMetadata, metadata, title: metadata.title, section: metadata.section, notes: metadata.notes ?? entry.notes, work: metadata.work ?? entry.work, settings, settingsPending: Object.hasOwn(pending.data.entries, key) };
    });
    for (const [id, data] of Object.entries(document.collections)) {
      const key = `collections:${id}`, currentMetadata = current.data.collections[id] ? { ...current.data.collections[id], ...current.data.entries[key] } : null;
      const metadata = { ...data, ...document.entries[key] };
      decorated.push({ key, canonicalKey: key, collection: 'collections', id, path: 'src/data/publisher-content.json', digest: hash(current.raw), title: metadata.title, url: `/work/${id}/`, section: metadata.section ?? 'work', metadata, currentMetadata, settings: document.entries[key] ?? {}, settingsPending: Object.hasOwn(pending.data.collections, id) || Object.hasOwn(pending.data.entries, key), pending: !currentMetadata, notes: metadata.notes ?? [], work: '', contentId: '', draft: false, linkable: false, active: true });
    }
    return decorated;
  }
  async scan(entries) {
    const { pending } = await this.state();
    return { entries: entries.filter(entry => entry.active && !entry.draft).map(entry => ({ key: contentKey(entry), title: entry.title, metadata: entry.metadata, currentMetadata: entry.currentMetadata ?? null, pending: !!entry.settingsPending, linkedPath: entry.linkedPath ?? null })), pending: Object.keys(pending.data.entries).length > 0 || Object.keys(pending.data.collections).length > 0 };
  }
  async save(input, entries) {
    if (!object(input) || Object.keys(input).some(key => !['key', 'metadata'].includes(key))) throw Error('内容设置包含无效字段');
    const entry = entries.find(entry => entry.active && !entry.draft && contentKey(entry) === input.key);
    if (!entry) throw Error('网站中找不到这篇内容，请重新核对');
    const metadata = this.normalize(input.metadata);
    if (metadata.cover && !/^\/(?!\/)/.test(metadata.cover) && !/^https:\/\//i.test(metadata.cover)) throw Error('网站封面请使用网站内图片地址或 HTTPS 图片网址');
    const effective = { ...entry.metadata, ...metadata };
    if (entry.collection === 'collections' && (effective.section !== 'work' || effective.workType !== 'collection')) throw Error('新建的作品合集不能改为其他内容类型或单篇作品，请保留合集形式');
    if (effective.section === 'tutorials' && !effective.series?.trim()) throw Error('研习文章需要选择或创建一个系列');
    if (effective.section === 'work' && !effective.summary?.trim()) throw Error('作品需要填写摘要');
    const { pending } = await this.state();
    pending.data.entries[input.key] = { ...pending.data.entries[input.key], ...metadata };
    await this.writePending(pending.data);
    return { key: input.key, metadata: effective, pending: true };
  }
  async createCollection(input) {
    if (!object(input) || Object.keys(input).some(key => !['title', 'summary', 'cover', 'year'].includes(key))) throw Error('作品合集包含无效字段');
    const id = `collection-${crypto.randomUUID().slice(0, 12)}`;
    const metadata = this.normalize({ section: 'work', workType: 'collection', title: input.title, summary: input.summary, cover: input.cover || '/covers/placeholder.svg', year: input.year ?? new Date().getFullYear(), notes: [], tags: [], order: 100 });
    if (!metadata.summary) throw Error('作品合集需要填写摘要');
    if (!/^\/(?!\/)/.test(metadata.cover) && !/^https:\/\//i.test(metadata.cover)) throw Error('合集封面请使用网站内图片地址或 HTTPS 图片网址');
    const { pending } = await this.state(); pending.data.collections[id] = metadata; await this.writePending(pending.data);
    return { key: `collections:${id}`, id, metadata, pending: true };
  }
  async snapshot(entries) {
    const { current, pending, document } = await this.state();
    const changes = [...Object.keys(pending.data.entries), ...Object.keys(pending.data.collections).map(id => `collections:${id}`)].filter((key, i, keys) => keys.indexOf(key) === i).map(key => {
      const entry = entries.find(entry => entry.active && !entry.draft && contentKey(entry) === key);
      if (!entry) throw Error('待写入内容已不存在，请重新核对');
      return { key, title: entry.title, metadata: entry.metadata, added: entry.pending === true };
    });
    const sources = entries.filter(entry => changes.some(change => change.key === contentKey(entry)) && entry.collection !== 'collections' && entry.collection !== 'published').map(({ path, digest }) => ({ path, digest }));
    return { document, changes, sources, digest: hash(current.raw), pendingDigest: hash(pending.raw) };
  }
  async verify(snapshot, { applied = false } = {}) {
    const { current, pending } = await this.state();
    if (hash(current.raw) !== (applied ? hash(serialize(snapshot.document)) : snapshot.digest) || hash(pending.raw) !== snapshot.pendingDigest) throw Error('内容设置已改变，请重新分析并审核');
    for (const source of snapshot.sources) {
      const file = await boundedSite(this.site, source.path).catch(() => null);
      if (!file || hash(await fs.readFile(file)) !== source.digest) throw Error('内容设置涉及的网站文章已改变，请重新分析并审核');
    }
  }
  async stage(snapshot, dir) { await fs.writeFile(path.join(dir, 'contentSettings'), serialize(snapshot.document)); }
  async finish(snapshot) {
    const pending = await this.read(this.pendingFile);
    if (hash(pending.raw) === snapshot.pendingDigest) await fs.rm(this.pendingFile, { force: true });
  }
}
