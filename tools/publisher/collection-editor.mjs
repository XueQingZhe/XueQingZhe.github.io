import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { boundedSite } from './site-content.mjs';
import { contentKey } from './content-settings.mjs';

const object = value => value && typeof value === 'object' && !Array.isArray(value);
const serialize = value => JSON.stringify(value, null, 2) + '\n';
const imageTypes = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg']);
const fields = new Set(['title', 'summary', 'cover', 'tags', 'engine', 'role', 'year', 'featured', 'order', 'category', 'date']);

export class CollectionEditor {
  constructor({ publisher, normalize }) {
    this.publisher = publisher; this.normalize = normalize;
    this.journal = path.join(publisher.state, 'collection-save.json');
  }
  targets() { return { content: this.publisher.contentSettings.pendingFile, topics: this.publisher.topics.pendingFile }; }
  async raw(file) {
    const stat = await fs.lstat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (!stat) return null;
    if (!stat.isFile() || stat.isSymbolicLink()) throw Error('合集草稿不能是目录或链接');
    return fs.readFile(file, 'utf8');
  }
  async recover() {
    const raw = await this.raw(this.journal);
    if (raw == null) return;
    const journal = JSON.parse(raw), targets = this.targets();
    if (journal.version !== 1 || !object(journal.before) || Object.keys(targets).some(key => journal.before[key] !== null && typeof journal.before[key] !== 'string')) throw Error('合集保存恢复记录无效');
    // Recovery destinations are fixed; private journal contents cannot pick paths.
    for (const [key, file] of Object.entries(targets)) {
      if (journal.before[key] == null) await fs.rm(file, { force: true });
      else { await fs.writeFile(file + '.collection-restore', journal.before[key]); await fs.rename(file + '.collection-restore', file); }
      await fs.rm(file + '.collection-next', { force: true });
    }
    await fs.rm(this.journal);
  }
  async commit(content, topics) {
    await this.recover();
    const targets = this.targets(), before = {};
    for (const [key, file] of Object.entries(targets)) before[key] = await this.raw(file);
    const values = { content: serialize(content), topics: serialize(topics) };
    try {
      for (const [key, file] of Object.entries(targets)) await fs.writeFile(file + '.collection-next', values[key]);
      await fs.writeFile(this.journal + '.tmp', serialize({ version: 1, before }));
      await fs.rename(this.journal + '.tmp', this.journal);
      for (const file of Object.values(targets)) await fs.rename(file + '.collection-next', file);
      await fs.rm(this.journal);
    } catch (error) {
      await this.recover();
      throw error;
    } finally {
      for (const file of Object.values(targets)) await fs.rm(file + '.collection-next', { force: true }).catch(() => {});
      await fs.rm(this.journal + '.tmp', { force: true }).catch(() => {});
    }
  }
  async save(input) {
    if (!object(input) || Object.keys(input).some(key => !['key', 'metadata', 'notes'].includes(key)) || !object(input.metadata) || Object.keys(input.metadata).some(key => !fields.has(key))) throw Error('合集设置包含无效字段');
    if (input.key !== undefined && (typeof input.key !== 'string' || !input.key.trim() || input.key.length > 300)) throw Error('作品合集标识无效');
    await this.recover();
    const p = this.publisher, entries = p.topicSources(), catalog = await p.topics.scan(entries);
    const topic = input.key ? catalog.topics.find(topic => topic.key === input.key) : null;
    if (input.key && (!topic || topic.workType !== 'collection')) throw Error('请选择已有作品合集；普通文章请添加到独立新建的合集');
    const original = topic ? entries.find(entry => entry.section === 'work' && entry.url === topic.url) : null;
    const id = original?.id ?? `collection-${crypto.randomUUID().slice(0, 12)}`, key = topic?.key ?? `collections:${id}`;
    const patch = this.normalize(input.metadata);
    const metadata = this.normalize({ ...(original ? Object.fromEntries([...fields].filter(field => original.metadata?.[field] != null).map(field => [field, original.metadata[field]])) : { year: new Date().getFullYear(), tags: [], order: 100 }), ...patch, title: patch.title ?? topic?.title, summary: patch.summary ?? topic?.summary, section: 'work', workType: 'collection' });
    if (!metadata.summary?.trim()) throw Error('请填写作品合集摘要');
    const cover = metadata.cover ?? '', unchangedCover = !!original && (!Object.hasOwn(patch, 'cover') || cover === (original.metadata.cover ?? ''));
    const creating = !original || original.collection === 'collections' && original.pending;
    if (creating && (!cover || cover === '/covers/placeholder.svg')) throw Error('请为新合集选择独立封面');
    if (cover && !unchangedCover || creating) {
      if (/^https:\/\//i.test(cover)) { /* External image URLs stay external. */ }
      else {
        if (!/^\/(?!\/)/.test(cover) || cover === '/covers/placeholder.svg') throw Error('请选择网站图片作为合集封面，或填写 HTTPS 图片网址');
        try {
          const decoded = decodeURIComponent(cover);
          if (!imageTypes.has(path.posix.extname(decoded).toLowerCase())) throw Error('not an image');
          const file = await boundedSite(p.site, 'public' + decoded);
          if (!(await fs.stat(file)).isFile()) throw Error('not a file');
        } catch { throw Error('合集封面不存在或不是可用的网站图片，请重新选择'); }
      }
    }
    const aliases = original ? [original.key, original.id, original.replaces, original.metadata?.replaces].filter(Boolean) : [key, id];
    if (!Array.isArray(input.notes) || input.notes.length > 500 || new Set(input.notes).size !== input.notes.length || input.notes.some(ref => typeof ref !== 'string' || aliases.includes(ref) || !catalog.articles.some(article => article.key === ref))) throw Error('合集成员无效、重复或不再公开，请重新选择；合集不能包含自身或其他合集');
    const content = (await p.contentSettings.state()).pending.data, topics = (await p.topics.state()).pending.data;
    // Explicit membership stays equal in both stores, including after older overrides.
    metadata.notes = [...input.notes];
    if (original) {
      const canonical = contentKey(original);
      content.entries[canonical] = { ...content.entries[canonical], ...metadata };
    } else content.collections[id] = metadata;
    topics.topics[key] = { ...topics.topics[key], notes: [...input.notes] };
    await this.commit(content, topics);
    return { key, id, metadata, pending: true };
  }
}
