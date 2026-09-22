import fs from 'node:fs/promises';
import path from 'node:path';

const sectionValues = new Set(['notes', 'tutorials', 'work']);
const presetKinds = new Map([['tag', 'tags'], ['series', 'series'], ['category', 'categories']]);
const inside = (root, file) => { const relative = path.relative(root, file); return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative); };
const term = (value, limit = 100) => typeof value === 'string' && value.length <= limit && !/[\u0000-\u001f\u007f]/.test(value) ? value.trim() : '';
const terms = value => [...new Set((Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,，]/) : []).map(v => term(v)).filter(Boolean))];

export function catalogPreset(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['kind', 'value', 'section'].includes(key)) || !presetKinds.has(input.kind)) throw Error('词库类型必须为 tag、series 或 category');
  const value = term(input.value, input.kind === 'tag' ? 100 : 200);
  if (!value) throw Error('词条不能为空、包含控制字符或超过字数限制');
  if (input.section !== undefined && !sectionValues.has(input.section)) throw Error('词条归属栏目无效');
  return { kind: input.kind, value, ...(input.kind === 'tag' ? {} : { section: input.section ?? 'notes' }) };
}

async function publicFiles(site, relative) {
  let directory = site;
  for (const part of relative.split('/')) {
    directory = path.join(directory, part);
    const entry = await fs.lstat(directory).catch(() => null);
    if (!entry?.isDirectory() || entry.isSymbolicLink()) return [];
  }
  const files = [];
  const walk = async current => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || entry.name.startsWith('.')) continue;
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && /\.mdx?$/i.test(file) && inside(site, await fs.realpath(file))) files.push(file);
    }
  };
  await walk(directory); return files;
}

async function labelsFromTaxonomy(site) {
  const labels = { tags: new Map(), engine: new Map(), role: new Map() };
  const file = path.join(site, 'src/data/taxonomy.ts');
  const info = await fs.lstat(file).catch(() => null);
  if (!info?.isFile() || info.isSymbolicLink() || !inside(site, await fs.realpath(file))) return labels;
  const source = await fs.readFile(file, 'utf8');
  // Read only literal double-quoted key/label pairs; never execute site code.
  const taxonomy = source.match(/export\s+const\s+TAXONOMY\b[\s\S]*?=\s*\{([\s\S]*?)\n\s*\};/)?.[1] ?? '';
  for (const [sourceKey, targetKey] of [['tech', 'tags'], ['engine', 'engine'], ['role', 'role']]) {
    const block = taxonomy.match(new RegExp('\\b' + sourceKey + '\\s*:\\s*\\[([\\s\\S]*?)\\]'))?.[1] ?? '';
    for (const pair of block.matchAll(/\{\s*key\s*:\s*("(?:\\.|[^"\\])*")\s*,\s*label\s*:\s*("(?:\\.|[^"\\])*")\s*\}/g)) {
      try { const value = term(JSON.parse(pair[1])), label = term(JSON.parse(pair[2]), 200); if (value && label) labels[targetKey].set(value, label); } catch { /* Non-literal entries keep their original labels. */ }
    }
  }
  return labels;
}

export async function collectCatalog({ site, local = [], presets = [], parse, siteEntries = null }) {
  site = await fs.realpath(site);
  const labels = await labelsFromTaxonomy(site);
  const buckets = Object.fromEntries(['tags', 'series', 'categories', 'engine', 'role'].map(kind => [kind, new Map()]));
  const add = (kind, value, document = null, section = null) => {
    value = term(value, kind === 'series' || kind === 'categories' ? 200 : 100); if (!value) return;
    const scoped = kind === 'series' || kind === 'categories';
    if (scoped && !sectionValues.has(section)) return;
    const key = JSON.stringify(scoped ? [section, value] : [value]);
    if (!buckets[kind].has(key)) buckets[kind].set(key, { value, label: labels[kind]?.get(value) ?? value, ...(scoped ? { section } : {}), documents: new Set() });
    if (document) buckets[kind].get(key).documents.add(document);
  };
  const consume = (metadata, document, section) => {
    for (const value of terms([...(Array.isArray(metadata.tags) ? metadata.tags : terms(metadata.tags)), ...(Array.isArray(metadata.tech) ? metadata.tech : terms(metadata.tech))])) add('tags', value, document);
    for (const kind of ['engine', 'role']) for (const value of terms(metadata[kind])) add(kind, value, document);
    add('series', metadata.series, document, section); add('categories', metadata.category, document, section);
  };
  for (const [relative, defaultSection] of siteEntries ? [] : [['src/content/notes', 'notes'], ['src/content/legacy', 'notes'], ['src/content/work', 'work'], ['content/published/notes', 'notes']]) {
    for (const file of await publicFiles(site, relative)) {
      try {
        const metadata = parse(await fs.readFile(file, 'utf8')).data;
        if (metadata.draft === true || metadata.publish === false) continue;
        const section = metadata.section ?? ({ article: 'notes', tutorial: 'tutorials', work: 'work' }[metadata.kind] ?? defaultSection);
        const document = term(metadata.contentId, 200) ? 'id:' + metadata.contentId : 'site:' + file;
        consume(metadata, document, section);
        // The site also lists this legacy journal under the learning entrance.
        if (relative === 'src/content/legacy' && section === 'notes' && term(metadata.series, 200) === '我独自升级') consume(metadata, document, 'tutorials');
      } catch { /* Malformed public sources cannot add catalog entries. */ }
    }
  }
  for (const entry of siteEntries ?? []) if (entry.active && !entry.draft) consume(entry.metadata, entry.contentId ? 'id:' + entry.contentId : 'site:' + entry.key, entry.metadata.section);
  for (const note of local) consume(note.metadata, 'id:' + note.id, note.metadata.section);
  for (const preset of presets) {
    try { const normalized = catalogPreset(preset); add(presetKinds.get(normalized.kind), normalized.value, null, normalized.section); } catch { /* Ignore invalid private entries without rewriting them. */ }
  }
  for (const kind of ['tags', 'engine', 'role']) for (const value of labels[kind].keys()) add(kind, value);
  return Object.fromEntries(Object.entries(buckets).map(([kind, values]) => [kind, [...values.values()].map(({ documents, ...value }) => ({ ...value, count: documents.size })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'zh-CN') || (a.section ?? '').localeCompare(b.section ?? ''))]));
}
