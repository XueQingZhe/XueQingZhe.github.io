import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { slug as githubSlug } from 'github-slugger';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

const parser = unified().use(remarkParse).use(remarkGfm);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const slash = value => value.replaceAll('\\', '/');
const within = (root, file) => { const relative = path.relative(root, file); return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative); };
const normalizeBody = value => value.replaceAll('\r\n', '\n').trim();
const normalizeTitle = value => String(value).normalize('NFKC').toLocaleLowerCase().replace(/[\p{P}\p{S}\s]/gu, '');
const candidateTitle = value => normalizeTitle(String(value).normalize('NFKC').replace(/^\s*(?:UE|Unreal\s*Engine)\s*\d+(?:\.\d+)*[\s:：-]*/i, '').replace(/\s*\((?:修订(?:版)?|旧版)\)\s*$/i, ''));
const textFingerprint = body => {
  const walk = node => node.type === 'image' || node.type === 'imageReference' || node.type === 'definition' || node.type === 'html' ? '' : node.value ?? (node.children ?? []).map(walk).join('');
  // Exporters rewrite Obsidian embeds and prose wrapping. These fingerprints only
  // propose a manual association, so formatting whitespace is deliberately ignored.
  return walk(parser.parse(body.replace(/!\[\[[^\]\r\n]+\]\]/g, ''))).normalize('NFKC').replace(/\s+/g, '');
};
const roots = [['notes', 'src/content/notes'], ['legacy', 'src/content/legacy'], ['work', 'src/content/work'], ['published', 'content/published/notes']];

export async function boundedSite(site, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || /(^|[\\/])\.\.([\\/]|$)/.test(relative)) throw Error('网站内容路径越界');
  let current = site;
  for (const part of relative.split(/[\\/]/)) { current = path.join(current, part); if ((await fs.lstat(current)).isSymbolicLink()) throw Error('网站内容不能使用符号链接'); }
  if (!within(await fs.realpath(site), await fs.realpath(current))) throw Error('网站内容真实路径越界');
  return current;
}

export async function readSiteContent(site, parse) {
  const entries = [];
  for (const [collection, root] of roots) {
    let directory; try { directory = await boundedSite(site, root); } catch (error) { if (error.code === 'ENOENT' || /符号链接/.test(error.message)) continue; throw error; }
    const walk = async dir => {
      for (const item of await fs.readdir(dir, { withFileTypes: true })) {
        if (item.isSymbolicLink() || item.name.startsWith('.')) continue;
        const file = path.join(dir, item.name);
        if (item.isDirectory()) { await walk(file); continue; }
        if (!item.isFile() || !/\.mdx?$/i.test(item.name)) continue;
        const relative = slash(path.relative(site, file)), raw = await fs.readFile(await boundedSite(site, relative), 'utf8');
        let parsed; try { parsed = parse(raw); } catch { continue; }
        const data = parsed.data, relativeId = slash(path.relative(directory, file)).replace(/\.mdx?$/i, '');
        const id = typeof data.slug === 'string' && data.slug ? data.slug : relativeId.split('/').map(segment => githubSlug(segment)).join('/').replace(/\/index$/, '');
        if (!id || /(^|\/)\.\.($|\/)/.test(id)) continue;
        const key = `${collection}:${id}`, section = collection === 'work' ? 'work' : data.section ?? ({ work: 'work', tutorial: 'tutorials' }[data.kind] ?? 'notes');
        const legacyUrl = typeof data.legacyUrl === 'string' && /^\/(?!\/)/.test(data.legacyUrl) && !/[?#\\]/.test(data.legacyUrl) ? data.legacyUrl : '';
        const url = legacyUrl || `/${collection === 'work' ? 'work' : 'notes'}/${id}/`;
        const metadata = { ...data, section, title: typeof data.title === 'string' ? data.title : path.basename(relativeId), tags: data.tags ?? data.tech ?? [], ...(data.date == null && collection === 'work' && Number.isInteger(data.year) ? { date: `${data.year}-01-01` } : {}) };
        const fingerprint = textFingerprint(parsed.body);
        entries.push({ key, collection, id, path: relative, title: metadata.title, url, section, metadata, work: typeof data.work === 'string' ? data.work : '', notes: typeof data.notes === 'string' ? [data.notes] : Array.isArray(data.notes) ? data.notes.filter(item => typeof item === 'string') : [], digest: hash(raw), bodyDigest: hash(normalizeBody(parsed.body)), fingerprint: fingerprint.length >= 40 ? hash(fingerprint) : '', normalizedTitle: normalizeTitle(metadata.title), candidateTitle: candidateTitle(metadata.title), contentId: typeof data.contentId === 'string' ? data.contentId : '', draft: data.draft === true || data.publish === false, replaces: typeof data.replaces === 'string' ? data.replaces : '', linkable: collection !== 'published', active: data.draft !== true && data.publish !== false });
      }
    };
    await walk(directory);
  }
  const replacements = new Map(entries.filter(entry => entry.replaces && !entry.draft).map(entry => [entry.replaces, entry.key]));
  for (const entry of entries) if (replacements.has(entry.key)) { entry.active = false; entry.replacedBy = replacements.get(entry.key); }
  return entries.sort((a, b) => a.key.localeCompare(b.key, 'zh-CN'));
}

export function siteCandidates(raw, title, entries, parse) {
  const body = parse(raw).body, bodyDigest = hash(normalizeBody(body)), fingerprint = textFingerprint(body), normalizedTitle = normalizeTitle(title);
  const eligible = entries.filter(entry => !entry.draft && entry.active && entry.linkable);
  const exact = normalizeBody(body) ? eligible.filter(entry => entry.bodyDigest === bodyDigest) : [];
  if (exact.length) return { state: 'candidate', candidates: exact.map(entry => entry.key), reason: exact.length === 1 ? '正文一致，关联后沿用网站网址与属性' : '多篇网站文章正文相同，请选择关联对象' };
  const sameText = fingerprint.length >= 40 ? eligible.filter(entry => entry.fingerprint === hash(fingerprint)) : [];
  if (sameText.length) return { state: 'candidate', candidates: sameText.map(entry => entry.key), reason: sameText.length === 1 ? '正文文字一致，图片或格式可能不同，请确认关联' : '多篇文章文字相同，请选择关联对象' };
  const sameTitle = normalizedTitle ? eligible.filter(entry => entry.normalizedTitle === normalizedTitle) : [];
  if (sameTitle.length) return { state: 'candidate', candidates: sameTitle.map(entry => entry.key), reason: '发现同名网站文章，正文可能已有修改，请确认关联' };
  const variant = candidateTitle(title), variants = variant ? eligible.filter(entry => entry.candidateTitle === variant) : [];
  return variants.length ? { state: 'candidate', candidates: variants.map(entry => entry.key), reason: '标题主体相同，版本标记或正文可能不同，请确认关联' } : { state: 'none', candidates: [], reason: '' };
}

export function publicSiteEntry(entry) {
  const { bodyDigest, fingerprint, normalizedTitle, candidateTitle, ...visible } = entry;
  return visible;
}
