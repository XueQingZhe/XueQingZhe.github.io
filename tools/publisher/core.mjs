import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import YAML from 'yaml';
import sharp from 'sharp';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkStringify from 'remark-stringify';
import GithubSlugger from 'github-slugger';
import { parseFragment } from 'parse5';
import { normalizeDisplayMath } from '../markdown-utils.mjs';
import { collectCatalog, catalogPreset } from './catalog.mjs';
import { readSiteContent, siteCandidates, publicSiteEntry, boundedSite, reconciliationMatches } from './site-content.mjs';
import { TopicStore } from './topics.mjs';
import { ContentSettingsStore, contentKey } from './content-settings.mjs';
import { CollectionEditor } from './collection-editor.mjs';

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
const writer = unified().use(remarkStringify, { fences: true, bullet: '-' }).use(remarkGfm).use(remarkMath);
const excluded = new Set(['.obsidian', '.trash', '.git', '.stversions', 'node_modules', 'Real-Time-Rendering-4th-CN-master', 'Real-Time-Rendering-4th-Bibliography-Collection', 'Cpp-Primer-Plus-6th-main', 'C-plusplus-notes-chinese--master', 'EffectiveModernCppChinese-master', 'IGP-DirectX12-Chinese-master']);
const mediaExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.mp4', '.webm', '.mov', '.m4v', '.pdf']);
const videoExts = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const modes = new Set(['lossless', 'optimized', 'original', 'video']);
const slash = s => s.replaceAll('\\', '/');
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const inside = (root, file) => { const rel = path.relative(root, file); return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };
const exists = async p => !!(await fs.stat(p).catch(() => null));
const plain = node => node.value ?? (node.children ?? []).map(plain).join('');
const safeUrl = s => /^(https?:|mailto:|#)/i.test(s);
const textNode = value => ({ type: 'text', value });
const escapeHtml = s => String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const childrenOf = function* (node) { for (const child of node.children ?? []) { yield child; yield* childrenOf(child); } };
const blockId = node => node.type === 'paragraph' && node.children.at(-1)?.type === 'text' ? node.children.at(-1).value.match(/\s+\^([\w-]+)\s*$/)?.[1] : undefined;
export const sections = [{ value: 'notes', label: '渲染手记' }, { value: 'tutorials', label: '学习系列' }, { value: 'work', label: '作品与实践' }];
const metadataFields = ['section', 'category', 'title', 'date', 'summary', 'tags', 'series', 'order', 'cover', 'engine', 'role', 'year', 'featured', 'work', 'notes', 'workType'];
const imageExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);
function metadataValue(key, value) {
  if (key === 'notes') {
    const list = typeof value === 'string' ? [value] : value;
    if (!Array.isArray(list) || list.length > 500 || list.some(item => typeof item !== 'string' || item.length > 300 || /[\u0000-\u001f]/.test(item))) throw Error('关联文章必须是有效文章标识列表');
    return [...new Set(list.map(item => item.trim()).filter(Boolean))];
  }
  if (['tags', 'engine', 'role'].includes(key)) {
    const list = typeof value === 'string' ? value.split(/[,，]/) : value;
    if (!Array.isArray(list) || list.length > 50 || list.some(item => typeof item !== 'string' || item.length > 100)) throw Error(`${key} 必须是最多 50 项的文字列表`);
    return [...new Set(list.map(item => item.trim()).filter(Boolean))];
  }
  if (key === 'featured') { if (typeof value !== 'boolean') throw Error('featured 必须为 true 或 false'); return value; }
  if (key === 'order' || key === 'year') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (key === 'year' ? !Number.isInteger(value) || value < 2000 || value > 2100 : Math.abs(value) > 100000)) throw Error(`${key} 数值无效`);
    return value;
  }
  if (key === 'date') {
    if (!(typeof value === 'string' || value instanceof Date)) throw Error('date 日期无效');
    const date = new Date(value);
    if (!Number.isFinite(date.valueOf()) || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && date.toISOString().slice(0, 10) !== value)) throw Error('date 日期无效');
    return date.toISOString().slice(0, 10);
  }
  const limit = key === 'summary' ? 2000 : key === 'cover' ? 2048 : key === 'work' ? 300 : 200;
  if (typeof value !== 'string' || value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw Error(`${key} 必须是 ${limit} 字以内的文字`);
  const text = value.trim();
  if (key === 'category' && /[\r\n\t\u007f]/.test(text)) throw Error('子栏目名称必须为单行文字');
  if (key === 'title' && !text) throw Error('标题不能为空');
  if (key === 'section' && !sections.some(section => section.value === text)) throw Error('栏目必须为渲染手记、学习系列或作品与实践');
  if (key === 'workType' && !['', 'single', 'collection'].includes(text)) throw Error('作品类型必须为独立作品或作品合集');
  if (key === 'cover' && text) {
    if (/^https:\/\//i.test(text)) { const url = new URL(text); if (url.username || url.password) throw Error('封面网址不能含账号密码'); }
    else if (/^(?:[a-z]+:|\/\/|\\\\)/i.test(text) || path.isAbsolute(text) && !text.startsWith('/')) throw Error('封面仅支持笔记库内图片路径或 HTTPS 网址');
  }
  return text;
}
function normalizeOverride(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !metadataFields.includes(key))) throw Error('元数据包含无效字段');
  return Object.fromEntries(metadataFields.filter(key => Object.hasOwn(value, key)).map(key => [key, metadataValue(key, value[key])]));
}
function effectiveMetadata(data, entry, rel, override = entry.metadata ?? {}, errors = null) {
  const defaults = { section: 'notes', category: '', title: path.basename(rel, '.md'), date: entry.firstSeen, summary: '', tags: [], series: '', order: 100, cover: '', engine: [], role: [], year: Number(entry.firstSeen.slice(0, 4)), featured: false, work: '', notes: [], workType: '' };
  const inherited = { ...data, section: data.section ?? (data.kind === 'work' ? 'work' : data.kind === 'tutorial' || typeof data.series === 'string' && data.series.trim() ? 'tutorials' : 'notes'), tags: data.tags ?? data.tech ?? [] };
  const result = Object.fromEntries(metadataFields.map(key => {
    try { return [key, metadataValue(key, Object.hasOwn(data.__publisherSettings ?? {}, key) ? data.__publisherSettings[key] : Object.hasOwn(override, key) ? override[key] : inherited[key] ?? defaults[key])]; }
    catch (error) { if (!errors) throw error; errors.push(error.message); return [key, metadataValue(key, defaults[key])]; }
  }));
  if (!Object.hasOwn(override, 'year') && data.year == null) result.year = Number(result.date.slice(0, 4));
  return result;
}

export function frontmatter(raw) {
  const normalized = raw.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  const data = match ? YAML.parse(match[1], { maxAliasCount: 20 }) : {};
  if (data && (typeof data !== 'object' || Array.isArray(data))) throw Error('正文属性必须是对象');
  return { data: data ?? {}, body: match ? normalized.slice(match[0].length) : normalized };
}

export class Publisher {
  constructor({ vault, site, state }) {
    this.vault = path.resolve(vault); this.site = path.resolve(site); this.state = path.resolve(state);
    if (inside(this.site, this.state) || inside(this.vault, this.state)) throw Error('私有工作目录必须在网站和笔记库外');
    this.plans = new Map(); this.stages = new Map(); this.busy = false;
    this.topics = new TopicStore({ site: this.site, state: this.state });
    this.contentSettings = new ContentSettingsStore({ site: this.site, state: this.state, normalize: normalizeOverride });
    this.collectionEditor = new CollectionEditor({ publisher: this, normalize: normalizeOverride });
  }
  async init() {
    await fs.mkdir(this.state, { recursive: true });
    this.db = JSON.parse(await fs.readFile(path.join(this.state, 'selection.json'), 'utf8').catch(() => '{"entries":{},"selected":[],"assets":{}}'));
    this.db.assets ??= {};
    await this.collectionEditor.recover();
    await this.recover();
  }
  async save(db = this.db) {
    const file = path.join(this.state, 'selection.json');
    await fs.writeFile(file + '.tmp', JSON.stringify(db, null, 2)); await fs.rename(file + '.tmp', file);
  }
  async saveCollection(input) { return this.collectionEditor.save(input); }
  async bounded(rel) {
    if (typeof rel !== 'string' || !rel || path.isAbsolute(rel) || /(^|[\\/])\.\.([\\/]|$)/.test(rel)) throw Error('路径越界');
    const p = path.resolve(this.vault, rel);
    if (!inside(this.vault, p)) throw Error('路径越界');
    let current = this.vault;
    for (const part of path.relative(this.vault, p).split(path.sep)) {
      if (excluded.has(part) || part.startsWith('.stfolder')) throw Error('目录禁止导出');
      current = path.join(current, part);
      const info = await fs.lstat(current);
      if (info.isSymbolicLink()) throw Error('不接受符号链接或目录联接');
    }
    if (!inside(await fs.realpath(this.vault), await fs.realpath(p))) throw Error('真实路径越界');
    return p;
  }
  async scan() {
    this.siteContent = await this.contentSettings.decorate(await readSiteContent(this.site, frontmatter), (await this.topics.state()).current.data);
    const files = [];
    const walk = async dir => {
      for (const item of await fs.readdir(dir, { withFileTypes: true })) {
        if (excluded.has(item.name) || item.name.startsWith('.stfolder') || item.isSymbolicLink()) continue;
        const p = path.join(dir, item.name);
        if (item.isDirectory()) await walk(p);
        else if (item.isFile()) files.push(slash(path.relative(this.vault, p)));
      }
    };
    await walk(this.vault);
    this.files = files; this.fileSet = new Set(files);
    for (const key of Object.keys(this.db.assets)) if (!this.fileSet.has(key)) delete this.db.assets[key];
    const notes = [], scanned = []; this.sourceMetadata = new Map(); this.vaultMetadata = new Map();
    for (const rel of files.filter(s => /\.md$/i.test(s))) {
      const raw = await fs.readFile(await this.bounded(rel), 'utf8');
      let data = {}, error = '';
      try { data = frontmatter(raw).data; } catch (e) { error = e.message; }
      scanned.push({ rel, raw, bytes: Buffer.byteLength(raw), data, error, digest: hash(raw) });
      this.vaultMetadata.set(rel, data);
    }
    // Auto-follow moves only when both the old and new side have one match.
    const newDigests = new Map();
    for (const item of scanned) if (!this.db.entries[item.rel]) newDigests.set(item.digest, (newDigests.get(item.digest) ?? 0) + 1);
    const reconciled = reconciliationMatches(scanned, this.siteContent, frontmatter);
    for (const { rel, raw, bytes, data, error, digest } of scanned) {
      let entry = this.db.entries[rel];
      if (!entry) {
        const matches = Object.entries(this.db.entries).filter(([old, e]) => !this.fileSet.has(old) && e.digest === digest);
        if (matches.length === 1 && newDigests.get(digest) === 1) {
          const [old, saved] = matches[0]; entry = saved;
          this.db.selected = this.db.selected.map(s => s === old ? rel : s); delete this.db.entries[old];
        } else { const id = crypto.randomUUID(); entry = { id, slug: `n-${id.slice(0, 12)}`, firstSeen: new Date().toISOString().slice(0, 10) }; }
        this.db.entries[rel] = entry;
      }
      entry.digest = digest;
      const matchedKey = reconciled.get(rel);
      if (!entry.siteLink && !entry.siteLinkIgnored && matchedKey && !this.siteContent.some(item => item.collection === 'published' && item.contentId === entry.id) && !Object.entries(this.db.entries).some(([other, value]) => other !== rel && value.siteLink === matchedKey)) {
        entry.siteLink = matchedKey; entry.autoLinked = true;
      }
      const linked = entry.siteLink ? this.siteContent.find(item => item.key === entry.siteLink) : null;
      const sourceData = this.inheritedSource(rel, entry, data); this.sourceMetadata.set(rel, sourceData);
      const blocked = !!error || data.draft === true || data.publish === false;
      const metadataErrors = [];
      const metadata = effectiveMetadata(sourceData, entry, rel, entry.metadata ?? {}, metadataErrors);
      const sourceMetadata = effectiveMetadata(sourceData, entry, rel, {}, []), metadataError = metadataErrors.join('；');
      const managed = this.siteContent.find(item => item.collection === 'published' && item.contentId === entry.id);
      const siteMatch = entry.siteLink ? { state: linked ? 'linked' : 'missing', key: entry.siteLink, candidates: [], automatic: !!entry.autoLinked, reason: linked ? entry.autoLinked ? '正文与媒体唯一一致，已自动核对并保留网站网址' : '已明确关联网站文章，更新将沿用原网址' : '已关联的网站源文件不存在，请重新关联' } : managed ? { state: 'linked', key: managed.key, candidates: [], reason: '发布身份与网站副本一致' } : error ? { state: 'none', candidates: [], reason: '' } : siteCandidates(raw, metadata.title, this.siteContent, frontmatter);
      notes.push({ path: rel, id: entry.id, slug: entry.slug, title: metadata.title, metadata, sourceMetadata, sourceYearExplicit: sourceData.year != null, metadataOverride: entry.metadata ?? {}, metadataDigest: hash(JSON.stringify(metadata)), metadataError, siteMatch, aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : [], selected: this.db.selected.includes(rel), blocked, error: error || metadataError, candidate: data.publish === true, bytes, digest });
    }
    this.notes = notes; await this.save();
    const previous = await this.manifest();
    for (const note of notes) {
      const prior = previous.notes?.[note.id], generated = this.siteContent.find(item => item.collection === 'published' && item.id === note.slug && item.contentId === note.id);
      const linked = this.siteContent.find(item => item.key === this.db.entries[note.path].siteLink);
      const { work, notes: relatedNotes, workType, ...preRelationsMetadata } = note.metadata;
      const { workType: unusedWorkType, ...beforeWorkType } = note.metadata;
      const metadataMatches = prior?.metadataDigest === note.metadataDigest || !workType && prior?.metadataDigest === hash(JSON.stringify(beforeWorkType)) || !prior?.fileDigest && !work && !relatedNotes.length && prior?.metadataDigest === hash(JSON.stringify(preRelationsMetadata));
      const changed = prior && (prior.digest !== note.digest || !metadataMatches || (prior.siteSourceDigest ?? '') !== (linked?.digest ?? ''));
      note.status = prior ? (!generated || changed || prior.fileDigest && generated.digest !== prior.fileDigest ? '有更新' : !prior.fileDigest ? '已有副本·待校验' : '已生成副本') : note.siteMatch.state === 'linked' ? '已关联网站文章' : note.siteMatch.state === 'candidate' ? '网站已有·待关联' : '未生成';
      if (prior && !generated) note.statusReason = '网站副本已缺失，需要重新生成';
      else if (prior?.fileDigest && generated && prior.fileDigest !== generated.digest) note.statusReason = '网站副本内容与登记记录不一致';
      else if (note.status === '已有副本·待校验') note.statusReason = '旧发布记录，网站文件已存在；重新生成后完成校验';
    }
    for (const item of this.siteContent) { const owner = notes.find(note => this.db.entries[note.path].siteLink === item.key || item.contentId && note.id === item.contentId); if (owner) { item.linkedPath = owner.path; item.managed = item.collection === 'published'; } }
    return { notes, siteContent: this.siteContent.map(publicSiteEntry), contentSettings: await this.contentSettings.scan(this.siteContent), selected: this.db.selected, missingSelected: this.db.selected.filter(s=>!notes.some(n=>n.path===s)), assets: this.db.assets, metadata: this.metadataOverrides(), sections, catalog: await this.catalog(), previous: Object.values(previous.notes ?? {}), ffmpeg: await this.ffmpeg() !== null };
  }
  inheritedSource(rel, entry = this.db.entries[rel], raw = this.vaultMetadata?.get(rel) ?? {}) {
    const linked = entry.siteLink ? this.siteContent?.find(item => item.key === entry.siteLink) : this.siteContent?.find(item => item.contentId && item.contentId === entry.id);
    if (!linked) return raw;
    const source = { ...linked.metadata, ...raw };
    if (raw.kind != null && raw.section == null) source.section = raw.kind === 'work' ? 'work' : raw.kind === 'tutorial' || source.series?.trim() ? 'tutorials' : source.section;
    if (raw.tags == null && raw.tech != null) source.tags = raw.tech;
    if (Object.keys(linked.settings ?? {}).length) source.__publisherSettings = linked.settings;
    return source;
  }
  async linkSite(rel, key) {
    if (!this.notes?.some(note => note.path === rel)) throw Error('只能关联已扫描的笔记');
    const entry = this.db.entries[rel], target = this.siteContent?.find(item => item.key === key);
    if (key !== null && (typeof key !== 'string' || !target?.linkable || target.draft)) throw Error('请选择可关联的网站源文章，已生成副本不能重复接管');
    if (key !== null && target.replacedBy && this.siteContent.find(item => item.key === target.replacedBy)?.contentId !== entry.id) throw Error('这篇网站文章已有替代副本，请先处理原关联');
    if (key !== null && Object.entries(this.db.entries).some(([other, value]) => other !== rel && value.siteLink === key)) throw Error('这篇网站文章已关联另一篇笔记，请先解除原关联');
    const next = structuredClone(this.db);
    delete next.entries[rel].autoLinked;
    if (key === null) { delete next.entries[rel].siteLink; next.entries[rel].siteLinkIgnored = true; } else { next.entries[rel].siteLink = key; delete next.entries[rel].siteLinkIgnored; }
    await this.save(next); this.db = next; return this.scan();
  }
  topicSources() {
    const selected = new Set(this.db.selected), entries = (this.siteContent ?? []).filter(item => {
      if (item.collection !== 'published') return true;
      const owner = this.notes?.find(note => note.id === item.contentId);
      return !owner || selected.has(owner.path);
    }).map(publicSiteEntry);
    for (const item of entries) if (item.replacedBy && !entries.some(replacement => replacement.key === item.replacedBy)) { delete item.replacedBy; item.active = true; }
    for (const note of this.notes ?? []) if (selected.has(note.path) && !note.blocked) {
      const metadata = effectiveMetadata(this.sourceMetadata.get(note.path), this.db.entries[note.path], note.path, this.db.entries[note.path].metadata ?? {}, []);
      const linked = this.db.entries[note.path].siteLink, current = entries.find(item => item.collection === 'published' && item.contentId === note.id);
      if (current) { current.metadata = { ...current.metadata, ...metadata }; current.title = metadata.title; current.section = metadata.section; current.notes = metadata.notes; current.work = metadata.work; continue; }
      if (linked) { const source = entries.find(item => item.key === linked); if (source) { source.metadata = { ...source.metadata, ...metadata }; source.title = metadata.title; source.section = metadata.section; source.notes = metadata.notes; source.work = metadata.work; } continue; }
      entries.push({ key: 'published:' + note.slug, collection: 'published', id: note.slug, title: metadata.title, section: metadata.section, metadata, notes: metadata.notes, work: metadata.work, pending: true, url: `/notes/${note.slug}/` });
    }
    return entries;
  }
  metadataOverrides() { return Object.fromEntries(this.notes.map(note => [note.path, this.db.entries[note.path]?.metadata ?? {}])); }
  async catalog() {
    const local = (this.notes ?? []).map(note => ({ id: note.id, metadata: effectiveMetadata(this.sourceMetadata.get(note.path), this.db.entries[note.path], note.path, this.db.entries[note.path].metadata ?? {}, []) }));
    return collectCatalog({ site: this.site, local, presets: this.db.catalogPresets ?? [], parse: frontmatter, siteEntries: this.siteContent });
  }
  async addCatalog(input) {
    const preset = catalogPreset(input), existing = this.db.catalogPresets ?? [];
    const current = await this.catalog(), bucket = { tag: 'tags', series: 'series', category: 'categories' }[preset.kind];
    if (current[bucket].some(item => item.value === preset.value && item.section === preset.section)) return current;
    if (existing.length >= 500) throw Error('自定义词库最多保存 500 个词条');
    const next = structuredClone(this.db); next.catalogPresets = [...existing, preset];
    await this.save(next); this.db = next; return this.catalog();
  }
  async select(selected, assetModes = {}, metadata = {}) {
    if (!Array.isArray(selected) || selected.some(s => !this.notes?.some(n => n.path === s))) throw Error('请选择扫描结果中的笔记');
    const unique = [...new Set(selected)];
    if (this.notes.some(n => unique.includes(n.path) && n.blocked)) throw Error('草稿、禁止发布或属性错误的笔记不能选中');
    if (!assetModes || typeof assetModes !== 'object' || Array.isArray(assetModes) || !metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw Error('附件或元数据设置无效');
    for (const [key, value] of Object.entries(assetModes)) if (!modes.has(value) || !this.fileSet.has(key)) throw Error('附件设置无效');
    const next = structuredClone(this.db);
    for (const [rel, override] of Object.entries(metadata)) {
      if (!this.notes.some(note => note.path === rel)) throw Error('只能设置扫描结果中的笔记元数据');
      if (override === null) delete next.entries[rel].metadata;
      else next.entries[rel].metadata = normalizeOverride(override);
    }
    for (const rel of new Set([...unique, ...Object.keys(metadata)])) effectiveMetadata(this.sourceMetadata.get(rel), next.entries[rel], rel);
    next.selected = unique; Object.assign(next.assets, assetModes);
    await this.save(next); this.db = next;
  }
  async manifest() { return JSON.parse(await fs.readFile(path.join(this.state, 'current.json'), 'utf8').catch(() => '{"notes":{},"assets":[]}')); }
  async relink(oldPath, newPath) {
    if(this.fileSet.has(oldPath)||!this.db.entries[oldPath]||!this.notes.some(n=>n.path===newPath&&!n.blocked))throw Error('只能重新关联已缺失的笔记路径');
    const previous=await this.manifest();if(previous.notes[this.db.entries[newPath]?.id])throw Error('目标已经有独立公开身份，不能覆盖');
    this.db.entries[newPath]={...this.db.entries[oldPath],digest:this.notes.find(n=>n.path===newPath).digest};delete this.db.entries[oldPath];
    this.db.selected=[...new Set(this.db.selected.map(s=>s===oldPath?newPath:s))];
    this.sourceMetadata.set(newPath, this.inheritedSource(newPath));
    const target=this.notes.find(n=>n.path===newPath);Object.assign(target,{id:this.db.entries[newPath].id,slug:this.db.entries[newPath].slug,selected:this.db.selected.includes(newPath)});
    const metadataErrors = [];
    target.metadata = effectiveMetadata(this.sourceMetadata.get(newPath), this.db.entries[newPath], newPath, this.db.entries[newPath].metadata ?? {}, metadataErrors);
    target.sourceMetadata = effectiveMetadata(this.sourceMetadata.get(newPath), this.db.entries[newPath], newPath, {}, []);
    target.metadataOverride = this.db.entries[newPath].metadata ?? {};
    target.metadataDigest = hash(JSON.stringify(target.metadata)); target.title = target.metadata.title;
    target.metadataError = metadataErrors.join('；'); target.error = target.metadataError;
    await this.save();
  }
  async resolve(target, source, noteOnly = false) {
    const clean = decodeURIComponent(target.split('#')[0]).replaceAll('\\', '/');
    if (/^(?:[a-z]+:|\/\/)/i.test(clean) || clean.includes('\0')) throw Error(`不允许的引用路径：${target}`);
    const base = clean;
    const candidates = [];
    const add = p => { p = slash(path.posix.normalize(p)); if (this.fileSet.has(p) && (!noteOnly || /\.md$/i.test(p)) && !candidates.includes(p)) candidates.push(p); };
    if (base) {
      const rootRelative = base.startsWith('/');
      const variants = value => { add(value); if (!path.extname(base)) add(value + '.md'); };
      if (!rootRelative) variants(path.posix.join(path.posix.dirname(source), base));
      if (!candidates.length) variants(base.replace(/^\/+/, ''));
    } else add(source);
    let matches = candidates;
    if (!matches.length) {
      const name = base.toLocaleLowerCase();
      const suffix = f => f.toLocaleLowerCase() === name || f.toLocaleLowerCase().endsWith('/' + name);
      const eligible = this.files.filter(f => !noteOnly || /\.md$/i.test(f));
      if (!base.startsWith('/') && !/(^|\/)\.\.?($|\/)/.test(base)) matches = eligible.filter(f => suffix(f) || (!path.extname(base) && suffix(f.replace(/\.md$/i, ''))));
      if (noteOnly && !base.includes('/') && !matches.length) matches = this.notes.filter(n => n.aliases.includes(base)).map(n => n.path);
    }
    if (matches.length !== 1) throw Error(`${matches.length ? '同名引用有歧义' : '找不到引用'}：${target}`);
    await this.bounded(matches[0]); return matches[0];
  }
  async analyze() {
    const scanned = await this.scan();
    const selected = [...this.db.selected];
    if (selected.some(s => !this.notes.some(n => n.path === s && !n.blocked))) throw Error('已选笔记缺失或被标记为草稿，请重新检查选择');
    const set = new Set(selected), assets = new Map(), sources = new Map(), output = [], errors = [], warnings = [], assetDefaults = {};
    // MOV/M4V covers need a browser-compatible copy. An explicit strategy still wins.
    for (const rel of selected) {
      const cover = this.notes.find(note => note.path === rel)?.metadata.cover;
      if (cover && !/^https:\/\//i.test(cover)) try { const file = await this.resolve(cover, rel); if (['.mov', '.m4v'].includes(path.extname(file).toLowerCase())) assetDefaults[file] = 'video'; } catch { /* Report unresolved covers with their note below. */ }
    }
    const read = async rel => { if (!sources.has(rel)) sources.set(rel, await fs.readFile(await this.bounded(rel), 'utf8')); return frontmatter(sources.get(rel)); };
    const noteLink = async (target, source) => {
      const rel = await this.resolve(target, source, true);
      if (!set.has(rel)) throw Error(`引用了未选中的笔记：${target}（不会自动发布）`);
      const note = this.notes.find(n => n.path === rel);
      if (!note) throw Error('引用目标不是笔记');
      const fragment = decodeURIComponent(target.split('#').slice(1).join('#'));
      let anchor = '';
      if (fragment) {
        const doc = parser.parse(normalizeDisplayMath((await read(rel)).body)), slugger = new GithubSlugger();
        if (fragment.startsWith('^')) {
          if (![...childrenOf(doc)].some(n => blockId(n) === fragment.slice(1))) throw Error(`找不到块：${target}`);
          anchor = `block-${fragment.slice(1)}`;
        } else {
          for (const n of childrenOf(doc)) if (n.type === 'heading') { const id = slugger.slug(plain(n)); if (plain(n) === fragment || id === fragment) { anchor = id; break; } }
          if (!anchor) throw Error(`找不到标题：${target}`);
        }
      }
      const linked = this.siteContent.find(item => item.key === this.db.entries[rel].siteLink);
      return { rel, url: `${linked?.url ?? `/notes/${note.slug}/`}${anchor ? '#' + anchor : ''}` };
    };
    const media = async (target, source) => {
      const rel = await this.resolve(target, source), ext = path.extname(rel).toLowerCase();
      if (!mediaExts.has(ext)) throw Error(`不支持直接发布此附件类型：${ext}`);
      const full = await this.bounded(rel), data = await fs.readFile(full), digest = hash(data);
      const mode = this.db.assets[rel] ?? assetDefaults[rel] ?? 'lossless', key = digest + ':' + mode;
      if (!assets.has(key)) assets.set(key, { key, path: rel, digest, bytes: data.length, mode, ext, sources: [rel], referencedBy: [source] });
      else { const a = assets.get(key); if (!a.sources.includes(rel)) a.sources.push(rel); if (!a.referencedBy.includes(source)) a.referencedBy.push(source); }
      return { type: 'image', url: `publisher-asset:${key}`, alt: '' };
    };
    const convert = async (rel, stack = []) => {
      if (stack.includes(rel) || stack.length >= 5) throw Error('笔记嵌入存在循环或超过 5 层');
      const { data, body } = await read(rel);
      if (data.draft === true || data.publish === false) throw Error('笔记已禁止发布');
      const tree = parser.parse(normalizeDisplayMath(body));
      const walk = async parent => {
        if (!parent.children) return;
        const out = [];
        for (const node of parent.children) {
          if (node.type === 'code' && /^(dataview|dataviewjs|tasks|mermaid)$/i.test(node.lang ?? '')) throw Error(`需先导出静态版本：${node.lang}`);
          if (node.type === 'html') {
            const nodes = parseFragment(node.value).childNodes.filter(n=>n.nodeName!=='#text'||n.value.trim());
            const replacements=[];
            for(const element of nodes){
              if(!['img','video'].includes(element.nodeName))throw Error('HTML 仅允许图片和视频；脚本、iframe、样式及其他 HTML 需先整理');
              const attrs=Object.fromEntries((element.attrs||[]).map(a=>[a.name,a.value]));
              if(Object.keys(attrs).some(k=>!['src','alt','title','poster','controls','muted','playsinline','loop','autoplay','preload','width','height','type'].includes(k)))throw Error('HTML 媒体包含不允许的属性');
              const children=(element.childNodes||[]).filter(n=>n.nodeName!=='#text'||n.value.trim());
              if(children.some(n=>n.nodeName!=='source'))throw Error('视频 HTML 含不支持的子内容');
              if(children.length>1)throw Error('请为导出视频指定单一媒体源');
              const source=children[0];
              if(source?.attrs.some(a=>!['src','type'].includes(a.name)))throw Error('视频源含不允许的属性');
              const target=attrs.src||source?.attrs.find(a=>a.name==='src')?.value;
              if(!target)throw Error('HTML 媒体缺少 src');
              const resolved=async value=>/^https?:\/\//i.test(value)?value:(await media(value,rel)).url;
              const url=await resolved(target);
              if(element.nodeName==='img'){
                const image={type:'image',url,alt:attrs.alt||'',...(attrs.title?{title:attrs.title}:{})};
                replacements.push(parent.type==='root'?{type:'paragraph',children:[image]}:image);
              }else{
                const poster=attrs.poster?await resolved(attrs.poster):'';
                replacements.push({type:'html',value:`<video controls playsinline preload="none" src="${escapeHtml(url)}"${poster?` poster="${escapeHtml(poster)}"`:''}${attrs.muted!==undefined?' muted':''}></video>`});
              }
            }
            out.push(...replacements);continue;
          }
          if (node.type === 'image' || node.type === 'link' || node.type === 'definition') {
            const pdfImage = node.type === 'image' && /\.pdf(?:#|$)/i.test(node.url);
            if (/^(https?:)\/\//i.test(node.url)) { warnings.push(`${rel}：外部资源 ${node.url} 保留为外链，未下载`); }
            else if (safeUrl(node.url)) { /* already safe */ }
            else if (/^[a-z]+:/i.test(node.url)) throw Error('链接含不允许的协议');
            else if (/\.md(?:#|$)/i.test(node.url) || (!path.extname(node.url.split('#')[0]) && node.type !== 'image')) node.url = (await noteLink(node.url, rel)).url;
            else { const asset = await media(node.url, rel); node.url = asset.url; }
            if (pdfImage) { node.type = 'link'; node.children = [textNode(node.alt || '打开 PDF')]; delete node.alt; }
          }
          if (node.type === 'text') {
            let value = node.value.replace(/%%[\s\S]*?%%/g, '');
            if (value.includes('%%')) throw Error('跨段作者注释需先整理，避免隐私文字进入副本');
            const regex = /(!?)\[\[([^\]]+)\]\]/g; let cursor = 0, match;
            while ((match = regex.exec(value))) {
              out.push(textNode(value.slice(cursor, match.index)));
              const [target, label] = match[2].split('|');
              const isMedia = mediaExts.has(path.extname(target.split('#')[0]).toLowerCase());
              if (isMedia) {
                const item = await media(target, rel);
                item.alt = label && !/^\d+(?:x\d+)?$/.test(label) ? label : '';
                out.push(match[1] && !/\.pdf(?:#|$)/i.test(target) ? item : { type: 'link', url: item.url, children: [textNode(label || path.basename(target))] });
              } else if (match[1]) {
                const linked = await noteLink(target, rel);
                const embedded = await convert(linked.rel, [...stack, rel]);
                const heading = decodeURIComponent(target.split('#').slice(1).join('#'));
                let children = embedded.children;
                if (heading?.startsWith('^')) {
                  children = [...childrenOf(embedded)].filter(n => blockId(n) === heading.slice(1)).slice(0,1);
                } else if (heading) {
                  const slugger = new GithubSlugger();
                  const matched = [...childrenOf(embedded)].find(n => n.type === 'heading' && slugger.slug(plain(n)) === linked.url.split('#')[1]);
                  const start = children.indexOf(matched);
                  if (start < 0) throw Error('嵌入标题不存在');
                  let end = start + 1; while (end < children.length && !(children[end].type === 'heading' && children[end].depth <= children[start].depth)) end++;
                  children = children.slice(start, end);
                }
                if (parent.type !== 'paragraph' || parent.children.length !== 1 || value.trim() !== match[0]) throw Error('笔记嵌入请独占一个段落');
                parent._embed = { type: 'blockquote', children: [{ type: 'paragraph', children: [{ type: 'link', url: linked.url, children: [textNode('引用：' + (label || path.basename(linked.rel, '.md')))] }] }, ...children] };
              } else out.push({ type: 'link', url: (await noteLink(target, rel)).url, children: [textNode(label || target.split('#')[0])] });
              cursor = regex.lastIndex;
            }
            out.push(textNode(value.slice(cursor))); continue;
          }
          await walk(node); out.push(node._embed ?? node);
        }
        parent.children = out.filter(n => n.type !== 'text' || n.value);
      };
      await walk(tree); return tree;
    };
    for (const rel of selected) {
      try {
        const item = this.notes.find(n => n.path === rel), { data } = await read(rel);
        if (item.metadataError) throw Error(item.metadataError);
        const linked = this.db.entries[rel].siteLink ? this.siteContent.find(entry => entry.key === this.db.entries[rel].siteLink) : null;
        if (this.db.entries[rel].siteLink && (!linked || linked.draft)) throw Error('已关联的网站文章缺失或不再公开，请重新关联');
        const metadata = effectiveMetadata(this.inheritedSource(rel, this.db.entries[rel], data), this.db.entries[rel], rel);
        if (metadata.section === 'tutorials' && !metadata.series) throw Error('研习文章需要选择或创建一个系列，请在发布设置中补充');
        if (!data.date && !linked?.metadata.date && !Object.hasOwn(this.db.entries[rel].metadata ?? {}, 'date')) warnings.push(`${rel}：没有 date，采用首次登记日期 ${metadata.date}`);
        if (metadata.section === 'work' && (!metadata.cover || !metadata.summary)) throw Error('作品与实践需要填写封面和摘要，请在发布设置中补充');
        if (metadata.section === 'work' && (!Number.isInteger(metadata.year) || metadata.year < 2000 || metadata.year > 2100)) throw Error('作品年份必须在 2000 至 2100 之间，请在发布设置中补充作品年份');
        const siteSource = linked ?? this.siteContent.find(entry => entry.contentId === item.id);
        const inheritedCover = siteSource && metadata.cover === siteSource.metadata.cover && (siteSource.settings?.cover != null || data.cover == null && !Object.hasOwn(this.db.entries[rel].metadata ?? {}, 'cover'));
        const existingPublicCover = !inheritedCover && /^\/(?!\/)/.test(metadata.cover) && (imageExts.has(path.posix.extname(metadata.cover).toLowerCase()) || /\.svg$/i.test(metadata.cover)) && !await this.resolve(metadata.cover, rel).then(() => true).catch(() => false) && await boundedSite(this.site, 'public' + decodeURIComponent(metadata.cover)).then(file => fs.stat(file)).then(stat => stat.isFile()).catch(() => false);
        let cover = metadata.cover, coverVideo = inheritedCover ? siteSource.metadata.coverVideo ?? '' : '';
        if (cover && !/^https:\/\//i.test(cover) && !inheritedCover && !existingPublicCover) {
          const resolved = await this.resolve(cover, rel);
          const ext = path.extname(resolved).toLowerCase();
          if (!imageExts.has(ext) && !videoExts.has(ext)) throw Error('封面必须是图片或视频附件');
          const item = await media(cover, rel), asset = assets.get(item.url.slice('publisher-asset:'.length));
          if (videoExts.has(ext)) {
            asset.coverVideo = true;
            if (!await this.ffmpeg()) throw Error('视频封面需要 FFmpeg 生成静态封面，请安装视频工具或改选图片');
            if (['.mov', '.m4v'].includes(ext) && asset.mode !== 'video') throw Error('MOV / M4V 视频封面需要转为 MP4，请在附件审核中选择“转为 MP4”');
            coverVideo = item.url; cover = `publisher-poster:${asset.key}`;
          } else {
            if (asset.mode === 'video') throw Error('图片封面不能转为视频，请为封面选择保留原件或静态图片压缩');
            cover = item.url;
          }
        } else if (cover && !inheritedCover && !existingPublicCover) warnings.push(`${rel}：外部封面 ${cover} 保留为外链，未下载`);
        const tree = await convert(rel);
        const kind = { notes: 'article', tutorials: 'tutorial', work: 'work' }[metadata.section];
        const { engine, role, year, featured, workType, ...commonMetadata } = metadata;
        const retained = linked ? Object.fromEntries(['media', 'glow', 'status', 'coverAlt', 'repo', 'track', 'review_status'].filter(key => Object.hasOwn(linked.metadata, key)).map(key => [key, linked.metadata[key]])) : {};
        const meta = { ...retained, ...commonMetadata, cover, ...(coverVideo ? { coverVideo } : {}), kind, contentId: item.id, draft: false, tech: metadata.tags, ...(metadata.section === 'work' ? { engine, role, year, featured, ...(workType ? { workType } : {}) } : {}), ...(typeof data.review_status === 'string' ? { review_status: data.review_status } : {}), ...(linked ? { replaces: linked.key, legacyUrl: linked.url } : {}) };
        const markdown='---\n'+YAML.stringify(meta)+'---\n\n'+writer.stringify(tree);
        output.push({ id: item.id, slug: item.slug, title: metadata.title, path: rel, section: metadata.section, kind, metadata, ...(linked ? { replaces: linked.key, legacyUrl: linked.url, siteSourceDigest: linked.digest } : {}), metadataDigest: hash(JSON.stringify(metadata)), digest: item.digest, renderDigest:hash(markdown), markdown });
      } catch (e) { errors.push({ path: rel, message: e.message }); }
    }
    const previous = await this.manifest();
    let topicSnapshot = null, settingsSnapshot = null;
    try { topicSnapshot = await this.topics.snapshot(this.topicSources()); } catch (error) { errors.push({ path: '作品专题', message: error.message }); }
    try { settingsSnapshot = await this.contentSettings.snapshot(this.siteContent); } catch (error) { errors.push({ path: '发布设置', message: error.message }); }
    const withdrawals = Object.entries(previous.notes).filter(([id]) => !output.some(n => n.id === id)).map(([id, item]) => {
      const replaces = item.replaces || this.siteContent.find(entry => entry.collection === 'published' && entry.contentId === id)?.replaces;
      const original = replaces && this.siteContent.find(entry => entry.key === replaces && !entry.draft);
      return { title: original?.title ?? item.title, restored: !!original };
    });
    const plan = { id: crypto.randomUUID(), selected, output, assets: [...assets.values()], assetDefaults, sources: [...sources].map(([rel, raw]) => ({ path: rel, digest: hash(raw) })), errors, warnings: [...new Set(warnings)], changes: { added: output.filter(n => !previous.notes[n.id] && !n.replaces).map(n => n.title), updated: output.filter(n => !previous.notes[n.id] ? !!n.replaces : previous.notes[n.id].renderDigest !== n.renderDigest).map(n => n.title), removed: withdrawals.filter(item => !item.restored).map(item => item.title), restored: withdrawals.filter(item => item.restored).map(item => item.title) } };
    plan.siteSources = selected.map(rel => this.siteContent.find(item => item.key === this.db.entries[rel].siteLink)).filter(Boolean).map(({ key, path, digest }) => ({ key, path, digest }));
    plan.topics = topicSnapshot; plan.changes.topics = topicSnapshot?.changes ?? [];
    plan.contentSettings = settingsSnapshot; plan.changes.contentSettings = settingsSnapshot?.changes ?? [];
    plan.catalog = scanned.catalog;
    this.plans.set(plan.id, plan); return plan;
  }
  async assertApplied() {
    let plan;
    try {
      plan = await this.analyze();
      if (plan.errors.length) throw Error('发布设置尚未通过检查，请先修正并写入本地预览：' + plan.errors.map(item => `${item.path}：${item.message}`).slice(0, 3).join('；'));
      const previous = await this.manifest();
      const generatedChanged = plan.output.some(note => {
        const prior = previous.notes?.[note.id];
        const current = this.siteContent.find(entry => entry.collection === 'published' && entry.contentId === note.id && entry.id === note.slug);
        return prior && (!current || prior.fileDigest && current.digest !== prior.fileDigest);
      });
      const assetsPresent = await Promise.all((previous.assets ?? []).map(name => boundedSite(this.site, 'public/published-assets/' + name).then(file => fs.stat(file)).then(stat => stat.isFile()).catch(() => false)));
      if (generatedChanged || assetsPresent.includes(false) || Object.values(plan.changes).some(items => Array.isArray(items) && items.length)) throw Error('还有尚未写入本地预览的内容或发布设置。请先“检查待发布变更”并“写入本地预览”，确认后再发布到 GitHub Pages。');
      return { ok: true };
    } finally {
      // A deployment check must not accumulate actionable staging plans.
      if (plan) this.plans.delete(plan.id);
    }
  }
  async ffmpeg() {
    const local=path.join(this.state,'python','imageio_ffmpeg','binaries');
    const executable=(await fs.readdir(local).catch(()=>[])).find(f=>/^ffmpeg.*\.exe$/i.test(f));
    if(executable)return path.join(local,executable);
    try { const { default: exe } = await import('ffmpeg-static'); return exe && (await fs.stat(exe)).size > 0 ? exe : null; } catch { return null; }
  }
  async verify(plan, { applied = false } = {}) {
    if (JSON.stringify(this.db.selected) !== JSON.stringify(plan.selected)) throw Error('选择已改变，请重新分析');
    for (let i=0;i<plan.selected.length;i++) {
      const entry=this.db.entries[plan.selected[i]], output=plan.output[i];
      if(!entry||entry.id!==output?.id||entry.slug!==output?.slug)throw Error('公开身份已改变，请重新分析并审核');
      if ((entry.siteLink ?? '') !== (output.replaces ?? '')) throw Error('网站关联已改变，请重新分析并审核');
      if (hash(JSON.stringify(effectiveMetadata(this.sourceMetadata.get(plan.selected[i]), entry, plan.selected[i]))) !== output.metadataDigest) throw Error('发布设置已改变，请重新分析并审核');
    }
    for (const s of [...plan.sources, ...plan.assets.flatMap(a => a.sources.map(p => ({ path: p, digest: a.digest })))]) {
      if (hash(await fs.readFile(await this.bounded(s.path))) !== s.digest) throw Error('源文件已变化，请重新分析并审核');
    }
    for (const a of plan.assets) if (a.sources.some(s => (this.db.assets[s] ?? plan.assetDefaults?.[s] ?? 'lossless') !== a.mode)) throw Error('压缩策略已改变，请重新分析');
    for (const source of plan.siteSources ?? []) if (hash(await fs.readFile(await boundedSite(this.site, source.path))) !== source.digest) throw Error('已关联的网站文章已改变，请重新分析并审核');
    if (plan.topics) await this.topics.verify(plan.topics, { applied });
    if (plan.contentSettings) await this.contentSettings.verify(plan.contentSettings, { applied });
  }
  async transform(asset) {
    const key = hash((asset.coverVideo ? 'cover-v1:' : 'v1:') + asset.key), cache = path.join(this.state, 'cache', key);
    const manifest = path.join(cache, 'result.json');
    if (await exists(manifest)) return { ...JSON.parse(await fs.readFile(manifest, 'utf8')), cache, reused: true };
    await fs.mkdir(cache, { recursive: true });
    const input = await this.bounded(asset.path), original = await fs.readFile(input);
    let data = original, ext = asset.ext, poster = null;
    if (asset.mode === 'video') {
      if (!videoExts.has(ext) && ext !== '.gif') throw Error('视频模式只适用于视频或 GIF');
      const exe = await this.ffmpeg(); if (!exe) throw Error('FFmpeg 不可用，请选择保留原件');
      const file = path.join(cache, 'video.mp4');
      await run(exe, ['-nostdin', '-y', '-i', input, '-map_metadata', '-1', '-vf', "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2", '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', file]);
      data = await fs.readFile(file); ext = '.mp4';
      const p = path.join(cache, 'poster.jpg');
      await run(exe, ['-nostdin', '-y', '-i', file, '-frames:v', '1', p]); poster = `${key}-poster.jpg`;
      await fs.rename(p, path.join(cache, poster));
    } else if (asset.mode !== 'original' && ['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(ext)) {
      const meta = await sharp(original).metadata();
      if ((meta.pages ?? 1) === 1) {
        let pipeline = sharp(original).rotate().keepIccProfile();
        if (asset.mode === 'optimized') pipeline = pipeline.resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true });
        const candidate = await pipeline.webp(asset.mode === 'lossless' ? { lossless: true, effort: 4 } : { quality: 83, effort: 4 }).toBuffer();
        if (candidate.length < original.length) { data = candidate; ext = '.webp'; }
      }
    }
    if(videoExts.has(ext)&&!poster){const exe=await this.ffmpeg();if(exe){poster=`${key}-poster.jpg`;await run(exe,['-nostdin','-y','-i',input,'-frames:v','1','-vf',asset.coverVideo?'scale=1280:720:force_original_aspect_ratio=decrease':'scale=640:-2',path.join(cache,poster)]);}}
    if (asset.coverVideo && !poster) throw Error('无法生成视频封面的静态图片，请检查 FFmpeg 后重新生成');
    const filename = key + ext;
    await fs.writeFile(path.join(cache, filename), data);
    const result = { filename, bytes: data.length, originalBytes: asset.bytes, poster, video: videoExts.has(ext) };
    await fs.writeFile(manifest, JSON.stringify(result)); return { ...result, cache, reused: false };
  }
  async prepare(id, approved) {
    const plan = this.plans.get(id); if (!plan || plan.errors.length) throw Error('请先完成有效分析');
    if (!Array.isArray(approved) || plan.assets.some(a => !approved.includes(a.key))) throw Error('请明确审核全部附件');
    await this.verify(plan);
    const idStage = crypto.randomUUID(), dir = path.join(this.state, 'stages', idStage);
    await fs.mkdir(path.join(dir, 'notes'), { recursive: true }); await fs.mkdir(path.join(dir, 'assets'), { recursive: true });
    const transformed = [];
    for (const a of plan.assets) {
      const r = await this.transform(a);
      await fs.copyFile(path.join(r.cache, r.filename), path.join(dir, 'assets', r.filename));
      if (r.poster) await fs.copyFile(path.join(r.cache, r.poster), path.join(dir, 'assets', r.poster));
      transformed.push({ ...a, ...r });
    }
    for (const note of plan.output) {
      let md = note.markdown;
      for (const a of transformed) {
        md = md.replaceAll(`publisher-asset:${a.key}`, '/published-assets/' + a.filename);
        if (a.poster) md = md.replaceAll(`publisher-poster:${a.key}`, '/published-assets/' + a.poster);
      }
      if (md.includes('publisher-asset:') || md.includes('publisher-poster:')) throw Error('存在未解析附件或视频封面');
      note.fileDigest = hash(md);
      await fs.writeFile(path.join(dir, 'notes', note.slug + '.md'), md);
    }
    if (plan.topics) await this.topics.stage(plan.topics, dir);
    if (plan.contentSettings) await this.contentSettings.stage(plan.contentSettings, dir);
    await this.verify(plan);
    const stage = { id: idStage, plan, dir, transformed }; this.stages.set(idStage, stage);
    return { id: idStage, notes: plan.output.map(n => ({ title: n.title, slug: n.slug })), assets: transformed.map(({ cache, ...a }) => a), changes: plan.changes };
  }
  async managedTargets() {
    const pairs = [['notes', path.join(this.site, 'content', 'published', 'notes')], ['assets', path.join(this.site, 'public', 'published-assets')], ['topics', this.topics.file], ['contentSettings', this.contentSettings.file]];
    for (const [name, p] of pairs) {
      await fs.mkdir(path.dirname(p), { recursive: true });
      if (!inside(await fs.realpath(this.site), await fs.realpath(path.dirname(p)))) throw Error('输出目录越界');
      if ((await fs.lstat(p).catch(() => null))?.isSymbolicLink()) throw Error('输出目录不能是符号链接');
      if(['notes','assets'].includes(name)&&!await exists(path.join(this.state,'current.json'))&&!await exists(path.join(this.state,'transaction.json'))&&await exists(p)&&(await fs.readdir(p)).length)throw Error('发现不属于本发布器的已有内容，请先建立归属清单，不能覆盖');
    }
    return pairs;
  }
  async recover() {
    const journal = path.join(this.state, 'transaction.json');
    if (!await exists(journal)) return;
    const t = JSON.parse(await fs.readFile(journal, 'utf8'));
    const conflicts = [];
    if (t.preview) {
      const dest = path.join(this.site, 'dist');
      // The previous build stays in its backup until recovery finishes, making
      // recovery repeatable even if the process stops while restoring files.
      if (await exists(t.preview.backup)) {
        await fs.rm(dest, { recursive: true, force: true });
        await fs.cp(t.preview.backup, dest, { recursive: true });
      } else if (!t.preview.had) {
        await fs.rm(dest, { recursive: true, force: true });
      }
    }
    for (const [name, dest] of await this.managedTargets()) {
      if (!Object.hasOwn(t.had, name)) continue;
      const settingsDigest = name === 'topics' ? t.topicsDigest : name === 'contentSettings' ? t.contentSettingsDigest : null;
      if (settingsDigest && await exists(dest)) {
        const current = await fs.readFile(dest), original = t.had[name] ? await fs.readFile(path.join(t.backup, name)) : null;
        if (hash(current) !== settingsDigest && (!original || !current.equals(original))) {
          let conflict = path.join(t.backup, `${name}-conflict.json`);
          // A repeated recovery must not overwrite an earlier preserved edit.
          try { await fs.writeFile(conflict, current, { flag: 'wx' }); }
          catch (error) {
            if (error.code !== 'EEXIST') throw error;
            conflict = path.join(t.backup, `${name}-conflict-${crypto.randomUUID()}.json`);
            await fs.writeFile(conflict, current, { flag: 'wx' });
          }
          conflicts.push(conflict);
        }
      }
      await fs.rm(dest, { recursive: true, force: true });
      if (t.had[name]) await fs.cp(path.join(t.backup, name), dest, { recursive: true });
    }
    if (t.previous) await fs.writeFile(path.join(this.state, 'current.json'), t.previous);
    else await fs.rm(path.join(this.state, 'current.json'), { force: true });
    await fs.rm(journal);
    if (t.preview) {
      await fs.rm(t.preview.prepared, { recursive: true, force: true }).catch(() => {});
      await fs.rm(t.preview.backup, { recursive: true, force: true }).catch(() => {});
    }
    return { conflicts };
  }
  async apply(id, validate = null, { previewDirectory = null } = {}) {
    const stage = this.stages.get(id); if (!stage) throw Error('暂存副本不存在，请重新生成');
    await this.verify(stage.plan);
    const targets = await this.managedTargets(), backup = path.join(this.state, 'backups', crypto.randomUUID()), had = {};
    await fs.mkdir(backup, { recursive: true });
    for (const [name, dest] of targets) { had[name] = await exists(dest); if (had[name]) await fs.cp(dest, path.join(backup, name), { recursive: true }); }
    const previous = await fs.readFile(path.join(this.state, 'current.json'), 'utf8').catch(() => null);
    let preview = null;
    if (previewDirectory) {
      const prepared = path.resolve(previewDirectory);
      if (path.dirname(prepared) !== this.site || !path.basename(prepared).startsWith('.publisher-build-')) throw Error('预览构建必须使用网站内的独立暂存目录');
      if ((await fs.lstat(path.join(this.site, 'dist')).catch(() => null))?.isSymbolicLink()) throw Error('预览目录不能是符号链接');
      preview = { prepared, backup: path.join(this.site, '.publisher-previous-' + crypto.randomUUID()), had: await exists(path.join(this.site, 'dist')) };
    }
    const journal = path.join(this.state, 'transaction.json');
    const topicsDigest = stage.plan.topics ? hash(await fs.readFile(path.join(stage.dir, 'topics'))) : null;
    const contentSettingsDigest = stage.plan.contentSettings ? hash(await fs.readFile(path.join(stage.dir, 'contentSettings'))) : null;
    await fs.writeFile(journal + '.tmp', JSON.stringify({ backup, had, previous, preview, topicsDigest, contentSettingsDigest }));
    await fs.rename(journal + '.tmp', journal);
    try {
      for (const [name, dest] of targets) { await fs.rm(dest, { recursive: true, force: true }); await fs.cp(path.join(stage.dir, name), dest, { recursive: true }); }
      if(validate)await validate();
      await this.verify(stage.plan, { applied: true });
      if (preview) {
        if ((await fs.lstat(preview.prepared)).isSymbolicLink() || !await exists(path.join(preview.prepared, 'index.html'))) throw Error('预览构建结果无效');
        if (preview.had) await fs.rename(path.join(this.site, 'dist'), preview.backup);
        await fs.rename(preview.prepared, path.join(this.site, 'dist'));
      }
      const current = { notes: Object.fromEntries(stage.plan.output.map(n => [n.id, { title: n.title, slug: n.slug, digest: n.digest, metadataDigest: n.metadataDigest, fileDigest: n.fileDigest, siteSourceDigest: n.siteSourceDigest ?? '', replaces: n.replaces ?? '', renderDigest:n.renderDigest }])), assets: stage.transformed.flatMap(a => [a.filename, ...(a.poster ? [a.poster] : [])]), generatedAt: new Date().toISOString() };
      await fs.writeFile(path.join(this.state, 'current.json'), JSON.stringify(current));
      await fs.rm(path.join(this.state, 'transaction.json'));
      if (stage.plan.topics) await this.topics.finish(stage.plan.topics).catch(() => {});
      if (stage.plan.contentSettings) await this.contentSettings.finish(stage.plan.contentSettings).catch(() => {});
      if (preview) await fs.rm(preview.backup, { recursive: true, force: true }).catch(() => {});
      this.stages.delete(id); return { notes: stage.plan.output.length, assets: stage.transformed.length, message: '已写入本地网站副本，尚未上传或上线' };
    } catch (e) {
      const recovered = await this.recover();
      if (recovered?.conflicts.length) e.message += `；构建期间的外部设置修改已保留，恢复文件：${recovered.conflicts.join('、')}`;
      throw e;
    }
  }
}

async function run(exe, args) {
  await new Promise((resolve, reject) => {
    const p = spawn(exe, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }); let log = '';
    p.stderr.on('data', d => { log = (log + d).slice(-3000); });
    p.on('error', reject); p.on('exit', code => code === 0 ? resolve() : reject(Error('媒体转换失败：' + log)));
  });
}
