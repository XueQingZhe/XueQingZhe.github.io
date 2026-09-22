import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CONTENT_FILE = 'src/data/publisher-content.json';
const TOPIC_FILE = 'src/data/publisher-topics.json';
const CACHE_MS = 60_000;
const FETCH_TIMEOUT = 15_000;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const normalize = value => Array.isArray(value) ? value.map(normalize) : record(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value;
const equivalent = (left, right) => JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
const unknown = reason => ({ state: 'unknown', label: '未核实', reason });
const modified = reason => ({ state: 'modified', label: '待上传修改', reason });
const local = reason => ({ state: 'local', label: '仅本地', reason });
const uploaded = () => ({ state: 'uploaded', label: '已上传', reason: '源文件与相关发布设置和 origin/main 一致；此状态不代表 GitHub Pages 已部署。' });

function config(raw, kind) {
  if (!raw) return {};
  const data = JSON.parse(raw);
  if (!record(data) || (data[kind] !== undefined && !record(data[kind]))) throw Error('发布配置格式无效');
  return data[kind] || {};
}

function contentPatch(entry, entries) {
  const original = entry.replaces || entry.metadata?.replaces;
  return { ...(original && record(entries[original]) ? entries[original] : {}), ...(record(entries[entry.key]) ? entries[entry.key] : {}) };
}

function topicPatch(entry, topics) {
  if (entry.section !== 'work' && entry.collection !== 'collections') return {};
  const original = entry.replaces || entry.metadata?.replaces;
  const key = original?.startsWith('work:') ? original.slice(5) : entry.collection === 'published' ? entry.key : entry.id;
  const candidates = [key, ...(original?.startsWith('work:') ? [original] : []), entry.key, entry.id, original, original?.slice(original.indexOf(':') + 1)].filter(Boolean);
  return candidates.map(key => topics[key]).find(record) || {};
}

/** Reports source upload status against a freshly fetched origin/main, never deployment status. */
export class PublicationStatus {
  constructor({ site }) {
    this.site = path.resolve(site);
    this.remoteCommit = null;
    this.checkedAt = null;
    this.attemptedAt = 0;
    this.stale = true;
    this.refreshing = null;
  }

  git(args, { timeout = 10_000, input } = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('git', ['-c', 'credential.interactive=never', '-c', 'core.quotepath=false', ...args], {
        cwd: this.site, windowsHide: true, shell: false,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', GIT_OPTIONAL_LOCKS: '0' },
        stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      });
      let out = '', error = '', exceeded = false;
      const timer = setTimeout(() => { exceeded = true; child.kill(); }, timeout);
      child.stdout.on('data', chunk => { out += chunk; if (out.length > 20_000_000) { exceeded = true; child.kill(); } });
      child.stderr.on('data', chunk => { error = (error + chunk).slice(-2000); });
      child.on('error', () => { clearTimeout(timer); reject(Error('Git 状态检查不可用')); });
      child.on('close', code => {
        clearTimeout(timer);
        if (!exceeded && code === 0) resolve(out);
        else reject(Error(exceeded ? 'Git 状态检查超时' : error ? 'Git 状态检查未完成' : 'Git 状态检查不可用'));
      });
      if (input !== undefined) { child.stdin.on('error', () => {}); child.stdin.end(input); }
    });
  }

  async refresh({ force = false } = {}) {
    if (this.refreshing) return this.refreshing;
    if (!force && this.attemptedAt && Date.now() - this.attemptedAt < CACHE_MS) return;
    this.attemptedAt = Date.now();
    this.refreshing = (async () => {
      try {
        // Fetch only reads the remote. It does not merge, stage, commit, push or alter FETCH_HEAD.
        await this.git(['-c', 'http.lowSpeedLimit=1', '-c', 'http.lowSpeedTime=10', 'fetch', '--no-tags', '--no-write-fetch-head', '--no-recurse-submodules', 'origin', '+refs/heads/main:refs/remotes/origin/main'], { timeout: FETCH_TIMEOUT });
        const commit = (await this.git(['rev-parse', '--verify', 'refs/remotes/origin/main^{commit}'])).trim();
        if (!/^[a-f0-9]{40,64}$/.test(commit)) throw Error('远端版本无效');
        this.remoteCommit = commit; this.checkedAt = new Date().toISOString(); this.stale = false;
      } catch {
        this.stale = true;
        if (!this.remoteCommit) {
          try { const commit = (await this.git(['rev-parse', '--verify', 'refs/remotes/origin/main^{commit}'])).trim(); if (/^[a-f0-9]{40,64}$/.test(commit)) this.remoteCommit = commit; } catch { /* A repository may have no fetched main branch yet. */ }
        }
      }
    })().finally(() => { this.refreshing = null; });
    return this.refreshing;
  }

  async localFile(relative) {
    if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..')) throw Error('无法核实源文件路径');
    let file = this.site;
    for (const part of relative.split('/')) {
      file = path.join(file, part);
      let stat;
      try { stat = await fs.lstat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
      if (stat.isSymbolicLink()) throw Error('无法核实符号链接源文件');
    }
    if (!(await fs.stat(file)).isFile()) throw Error('源文件不是普通文件');
    return file;
  }

  async scan(entries, { refresh = false } = {}) {
    await this.refresh({ force: refresh });
    const result = { entries: {}, remoteCommit: this.remoteCommit, checkedAt: this.checkedAt, stale: this.stale };
    const remoteCommit = result.remoteCommit;
    const reasons = this.checkedAt ? '本次无法连接 Git 远端，上次核实结果已过期；请刷新后再判断是否上传。' : '暂时无法核实 origin/main；请检查 Git 远端连接后刷新。';
    if (this.stale || !this.remoteCommit) {
      for (const entry of entries) result.entries[entry.key] = unknown(reasons);
      return result;
    }
    let tree, localContent, remoteContent, localTopics, remoteTopics;
    try {
      const output = await this.git(['ls-tree', '-r', '-z', '--full-tree', remoteCommit]);
      tree = new Map(output.split('\0').filter(Boolean).map(row => { const tab = row.indexOf('\t'), [mode, type, hash] = row.slice(0, tab).split(' '); return [row.slice(tab + 1), { mode, type, hash }]; }));
      const readLocal = async relative => { const file = await this.localFile(relative); return file ? fs.readFile(file, 'utf8') : ''; };
      const readRemote = async relative => tree.has(relative) ? this.git(['show', remoteCommit + ':' + relative]) : '';
      [localContent, remoteContent, localTopics, remoteTopics] = await Promise.all([readLocal(CONTENT_FILE), readRemote(CONTENT_FILE), readLocal(TOPIC_FILE), readRemote(TOPIC_FILE)]);
    } catch {
      result.stale = true;
      for (const entry of entries) result.entries[entry.key] = unknown('无法读取 Git 版本或发布设置，请稍后刷新。');
      return result;
    }
    let contentLocal, contentRemote, collectionsLocal, collectionsRemote, topicsLocal, topicsRemote;
    try {
      contentLocal = config(localContent, 'entries'); contentRemote = config(remoteContent, 'entries');
      collectionsLocal = config(localContent, 'collections'); collectionsRemote = config(remoteContent, 'collections');
      topicsLocal = config(localTopics, 'topics'); topicsRemote = config(remoteTopics, 'topics');
    } catch {
      for (const entry of entries) result.entries[entry.key] = unknown('发布配置 JSON 无效，无法核实相关设置是否已上传。');
      return result;
    }
    const hashes = new Map();
    const sourceHash = relative => {
      if (!hashes.has(relative)) hashes.set(relative, (async () => {
        if (!await this.localFile(relative)) return null;
        return (await this.git(['hash-object', '--path=' + relative, '--', relative])).trim();
      })());
      return hashes.get(relative);
    };
    const compare = async entry => {
      try {
        // Private drafts have their own UI indicator. Upload status describes the
        // public files on disk, whose metadata can differ from an editor draft.
        entry = { ...entry, metadata: entry.currentMetadata ?? entry.metadata, section: entry.currentMetadata?.section ?? entry.section };
        if (entry.collection === 'collections' || entry.key.startsWith('collections:')) {
          const id = entry.id || entry.key.slice('collections:'.length);
          if (!record(collectionsLocal[id])) return entry.settingsPending ? local('集合尚未写入网站公开配置，仍在本地暂存。') : unknown('本地集合配置已变化，请重新扫描。');
          if (!record(collectionsRemote[id])) return local('这个集合仅存在于本地发布设置，尚未上传到 origin/main。');
          if (!equivalent(collectionsLocal[id], collectionsRemote[id])) return modified('这个集合的设置与 origin/main 不一致。');
        } else {
          const hash = await sourceHash(entry.path), remote = tree.get(entry.path);
          if (!hash) return remote ? modified('本地源文件已删除，origin/main 仍有旧版本。') : unknown('本地源文件已不存在，请重新扫描。');
          if (!remote) return local('这个源文件尚未出现在 origin/main。');
          if (remote.type !== 'blob' || remote.mode === '120000') return unknown('远端源文件不是可核实的普通文件。');
          if (hash !== remote.hash) return modified('本地源文件与 origin/main 不一致。');
        }
        const localPatch = { ...topicPatch(entry, topicsLocal), ...contentPatch(entry, contentLocal) };
        const remotePatch = { ...topicPatch(entry, topicsRemote), ...contentPatch(entry, contentRemote) };
        if (!equivalent(localPatch, remotePatch)) return modified('这篇内容的栏目、标签或专题设置与 origin/main 不一致。');
        return uploaded();
      } catch { return unknown('无法核实这篇内容的本地源文件或 Git 属性。'); }
    };
    // Keep Git processes bounded while avoiding one serial process per article.
    let index = 0;
    await Promise.all(Array.from({ length: Math.min(4, entries.length) }, async () => {
      while (index < entries.length) { const entry = entries[index++]; result.entries[entry.key] = await compare(entry); }
    }));
    return result;
  }
}
