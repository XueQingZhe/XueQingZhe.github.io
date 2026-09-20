import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';

const ROOTS = ['content/published/notes', 'public/published-assets', 'src/content', 'public/assets'];
const REPOSITORY = 'XueQingZhe/XueQingZhe.github.io';
const SITE_URL = 'https://xueqingzhe.github.io/';
const allowed = file => ROOTS.some(root => file.startsWith(root + '/'));
const clean = value => String(value).replace(/https?:\/\/[^\s/@]+:[^\s/@]+@/g, 'https://[redacted]@').replace(/(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)/g, '[redacted]');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Local-only deployment service. An explicit reviewed snapshot is required for each push. */
export class GitPublisher {
  constructor({ site, state, validate = async () => {}, remote = 'origin', branch = 'main', proxy = process.env.PUBLISHER_GIT_PROXY, allowLocalRemote = false, monitor }) {
    this.site = path.resolve(site); this.state = path.resolve(state); this.validate = validate;
    this.remote = remote; this.branch = branch; this.proxy = proxy; this.allowLocalRemote = allowLocalRemote;
    this.monitor = monitor || (context => this.monitorGitHub(context));
    this.reviews = new Map(); this._busy = false;
    this.record = { phase: 'idle', message: '可以检查待发布的文章。', ownedCommits: [], siteUrl: SITE_URL };
  }
  get busy() { return this._busy; }
  status() { const { ownedCommits, ...visible } = this.record; return { ...visible, busy: this._busy }; }
  async init() {
    if (this.state === this.site || this.state.startsWith(this.site + path.sep)) throw Error('发布记录必须放在网站目录之外');
    await fs.mkdir(this.state, { recursive: true });
    try { this.record = { ...this.record, ...JSON.parse(await fs.readFile(path.join(this.state, 'deployment.json'), 'utf8')) }; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!['idle', 'success', 'error'].includes(this.record.phase)) await this.update({ phase: 'error', message: this.record.pushed ? '上次监测中断。提交已上传，请重新检查并继续确认上线状态。' : '上次发布中断。请重新检查待发布内容后重试。' });
    return this;
  }
  async update(patch) {
    this.record = { ...this.record, ...patch, updatedAt: new Date().toISOString() };
    const file = path.join(this.state, 'deployment.json'), temporary = file + '.tmp';
    await fs.writeFile(temporary, JSON.stringify(this.record, null, 2));
    await fs.rename(temporary, file);
  }
  git(args, { env = {}, accepted = [0] } = {}) {
    const config = ['-c', 'credential.interactive=never', '-c', 'core.quotepath=false'];
    if (this.proxy) config.push('-c', `http.proxy=${this.proxy}`);
    return new Promise((resolve, reject) => {
      const child = spawn('git', [...config, ...args], { cwd: this.site, windowsHide: true, shell: false, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '', err = ''; const timer = setTimeout(() => child.kill(), args[0] === 'push' ? 15 * 60_000 : 120_000);
      child.stdout.on('data', data => { out += data; }); child.stderr.on('data', data => { err = (err + data).slice(-8000); });
      child.on('error', error => { clearTimeout(timer); reject(Error(clean(error.message))); });
      child.on('close', code => { clearTimeout(timer); if (accepted.includes(code)) resolve({ out: out.trimEnd(), code }); else reject(Error(clean(err || `Git 操作未完成（${code}）`))); });
    });
  }
  async checkRemote() {
    if (this.remote !== 'origin' || this.branch !== 'main') throw Error('文章发布仅支持 origin 的 main 分支');
    for (const args of [['remote', 'get-url', '--all', this.remote], ['remote', 'get-url', '--push', '--all', this.remote]]) {
      const urls = (await this.git(args)).out.split(/\r?\n/);
      if (urls.length !== 1) throw Error('检测到多个 Git 远程地址，请先整理仓库配置');
      const url = urls[0], official = /^(?:https:\/\/github\.com\/XueQingZhe\/XueQingZhe\.github\.io(?:\.git)?|git@github\.com:XueQingZhe\/XueQingZhe\.github\.io(?:\.git)?|ssh:\/\/git@github\.com\/XueQingZhe\/XueQingZhe\.github\.io(?:\.git)?)$/i.test(url);
      if (!official && !(this.allowLocalRemote && !/^[a-z][a-z\d+.-]*:\/\//i.test(url) && !url.includes('@'))) throw Error('仓库地址不是已配置的个人网站，已停止发布');
    }
  }
  async remoteHead() {
    await this.git(['fetch', '--no-tags', this.remote, `refs/heads/${this.branch}`]);
    return (await this.git(['rev-parse', 'FETCH_HEAD'])).out;
  }
  async fileHash(file) {
    const parts = file.split('/'); let current = this.site;
    for (const part of parts) {
      current = path.join(current, part);
      try { if ((await fs.lstat(current)).isSymbolicLink()) throw Error(`发布内容包含符号链接：${file}`); }
      catch (error) { if (error.code === 'ENOENT') return 'deleted'; throw error; }
    }
    const hash = crypto.createHash('sha256');
    for await (const chunk of createReadStream(current)) hash.update(chunk);
    return hash.digest('hex');
  }
  async snapshot() {
    const head = (await this.git(['rev-parse', 'HEAD'])).out;
    const indexPath = path.resolve(this.site, (await this.git(['rev-parse', '--git-path', 'index'])).out);
    const index = digest(await fs.readFile(indexPath));
    const files = [...new Set((await this.git(['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...ROOTS])).out.split('\0').filter(Boolean))].sort();
    const hashes = [];
    for (const file of files) { const hash = await this.fileHash(file); if (hash !== 'deleted') hashes.push([file, hash]); }
    return { head, index, indexPath, files: digest(JSON.stringify(hashes)) };
  }
  async review() {
    if (this.busy) throw Error('正在发布，请稍候');
    const result = { id: crypto.randomUUID(), repository: REPOSITORY, branch: this.branch, siteUrl: SITE_URL, changes: [], commits: [], canPublish: false, upToDate: false, blockers: [] };
    try {
      await this.checkRemote();
      const top = await fs.realpath(path.resolve((await this.git(['rev-parse', '--show-toplevel'])).out));
      const actualSite = await fs.realpath(this.site);
      if ((process.platform === 'win32' ? top.toLowerCase() !== actualSite.toLowerCase() : top !== actualSite)) throw Error('请从网站发布仓库启动管理器');
      if ((await this.git(['diff', '--cached', '--name-only'])).out) result.blockers.push('Git 暂存区已有内容，请先完成或取消暂存，再使用文章发布按钮。');
      const raw = (await this.git(['status', '--porcelain=v1', '-z', '--untracked-files=all'])).out.split('\0').filter(Boolean);
      for (let i = 0; i < raw.length; i++) {
        const status = raw[i].slice(0, 2), file = raw[i].slice(3);
        if (/[RC]/.test(status[0])) i++;
        if (allowed(file)) result.changes.push({ path: file, status: status.trim() });
      }
      const remoteHead = await this.remoteHead();
      const snapshot = await this.snapshot();
      if ((await this.git(['merge-base', '--is-ancestor', remoteHead, snapshot.head], { accepted: [0, 1] })).code !== 0) result.blockers.push('GitHub 已有本地尚未同步的修改，请先同步网站仓库；不会覆盖线上内容。');
      const ahead = (await this.git(['log', '--format=%H%x09%s', `${remoteHead}..${snapshot.head}`])).out;
      result.commits = ahead ? ahead.split('\n').map(line => { const [sha, ...subject] = line.split('\t'); return { sha, subject: subject.join('\t') }; }) : [];
      if (result.commits.some(commit => !this.record.ownedCommits.includes(commit.sha))) result.blockers.push('存在文章发布工具之外的未上传提交，请先单独发布这些网站修改。');
      await this.git(['var', 'GIT_AUTHOR_IDENT']);
      result.upToDate = !result.changes.length && remoteHead === snapshot.head;
      // A push may reach GitHub even when the connection drops before Git reports success.
      // The remote SHA is authoritative; our persisted ownership proves this is our job.
      const uploaded = this.record.pushed || this.record.ownedCommits.includes(snapshot.head);
      const retryMonitor = result.upToDate && this.record.commit === snapshot.head && uploaded && this.record.phase !== 'success';
      result.canPublish = !result.blockers.length && (!!result.changes.length || !!result.commits.length || retryMonitor);
      this.reviews.clear(); this.reviews.set(result.id, { ...result, snapshot, remoteHead });
    } catch (error) { result.blockers.push(clean(error.message)); }
    return result;
  }
  async start(id) {
    if (this.busy) throw Error('正在发布，请稍候');
    const review = this.reviews.get(id);
    if (!review || !review.canPublish) throw Error('请重新检查待发布内容');
    this.reviews.clear(); this._busy = true;
    try { await this.update({ phase: 'checking', message: '正在构建网站并检查文章与资源。' }); }
    catch (error) { this._busy = false; throw error; }
    this._job = this.run(review).catch(async error => { await this.update({ phase: 'error', message: clean(error.message) }); }).finally(() => { this._busy = false; });
    return this.status();
  }
  async assertSnapshot(expected) {
    const actual = await this.snapshot();
    if (actual.head !== expected.head || actual.index !== expected.index || actual.files !== expected.files) throw Error('文章、附件或 Git 状态在检查后发生变化，请重新检查再发布。');
  }
  async commit(review) {
    const lockPath = review.snapshot.indexPath + '.lock'; let lock;
    try { lock = await fs.open(lockPath, 'wx'); } catch (error) { if (error.code === 'EEXIST') throw Error('另一个 Git 操作正在进行，请稍后重试'); throw error; }
    const temporaryIndex = path.join(this.state, `deploy-index-${crypto.randomUUID()}`);
    try {
      await this.assertSnapshot(review.snapshot);
      await fs.copyFile(review.snapshot.indexPath, temporaryIndex);
      const env = { GIT_INDEX_FILE: temporaryIndex };
      // An isolated index and explicit paths ensure unrelated working files never enter the commit.
      for (const change of review.changes) await this.git(['--literal-pathspecs', 'add', '--', change.path], { env });
      await this.git(['-c', 'core.hooksPath=', '-c', 'commit.gpgsign=false', 'commit', '-m', '发布文章 · ' + new Date().toISOString().slice(0, 16).replace('T', ' ')], { env });
      const commit = (await this.git(['rev-parse', 'HEAD'])).out;
      await lock.writeFile(await fs.readFile(temporaryIndex)); await lock.close(); lock = null;
      await fs.rename(lockPath, review.snapshot.indexPath);
      await this.update({ commit, pushed: false, workflowUrl: null, ownedCommits: [...this.record.ownedCommits, commit].slice(-100) });
      return commit;
    } finally { if (lock) await lock.close(); await fs.rm(lockPath, { force: true }); await fs.rm(temporaryIndex, { force: true }); await fs.rm(temporaryIndex + '.lock', { force: true }); }
  }
  async run(review) {
    await this.assertSnapshot(review.snapshot);
    await this.validate();
    await this.assertSnapshot(review.snapshot);
    await this.checkRemote();
    if (await this.remoteHead() !== review.remoteHead) throw Error('GitHub 分支已更新，请重新检查；本次未上传。');
    let commit = review.snapshot.head;
    if (review.changes.length) {
      await this.update({ phase: 'committing', message: `正在保存 ${review.changes.length} 项文章与资源修改。` });
      commit = await this.commit(review);
    } else await this.update({ commit });
    const current = await this.snapshot();
    if (current.head !== commit || current.files !== review.snapshot.files) throw Error('保存提交期间文章或附件发生变化，本次未上传。请重新检查。');
    if (commit !== review.remoteHead) {
      await this.update({ phase: 'pushing', message: '正在上传 GitHub，随后会自动构建。', commit });
      await this.checkRemote();
      await this.git(['push', this.remote, `${commit}:refs/heads/${this.branch}`]);
    }
    await this.update({ phase: 'building', pushed: true, message: '提交已上传，正在等待 GitHub 构建。', commit });
    await this.monitor({ commit, repository: REPOSITORY, branch: this.branch, siteUrl: SITE_URL, update: patch => this.update(patch) });
    await this.update({ phase: 'success', message: 'GitHub Pages 已完成发布，可以打开线上网站。' });
  }
  async apiSettings() {
    if (this._apiSettings) return this._apiSettings;
    const proxy = this.proxy || (await this.git(['config', '--get', 'http.proxy'], { accepted: [0, 1] })).out || null;
    // Existing credential helper only; no interactive login, logging, or token persistence.
    const token = await new Promise(resolve => {
      const child = spawn('git', ['-c', 'credential.interactive=never', 'credential', 'fill'], { cwd: this.site, shell: false, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }, stdio: ['pipe', 'pipe', 'ignore'] });
      let output = ''; const timer = setTimeout(() => child.kill(), 20_000);
      child.stdout.on('data', data => { output += data; });
      child.on('error', () => { clearTimeout(timer); resolve(null); });
      child.on('close', code => { clearTimeout(timer); resolve(code === 0 ? output.split(/\r?\n/).find(line => line.startsWith('password='))?.slice(9) : null); });
      child.stdin.on('error', () => {}); child.stdin.end('protocol=https\nhost=github.com\n\n');
    });
    this._apiSettings = { proxy, token }; return this._apiSettings;
  }
  async api(resource) {
    const { proxy, token } = await this.apiSettings();
    const url = new URL(`https://api.github.com/repos/${REPOSITORY}/${resource}`);
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'water-garden-publisher', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    let status, body;
    if (!proxy) {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
      status = response.status; body = await response.text();
    } else {
      const proxyUrl = new URL(proxy);
      if (!['http:', 'https:'].includes(proxyUrl.protocol)) throw Error('GitHub 状态查询需要 HTTP 或 HTTPS 代理');
      ({ status, body } = await new Promise((resolve, reject) => {
        const transport = proxyUrl.protocol === 'https:' ? https : http;
        const connect = transport.request({ hostname: proxyUrl.hostname, port: proxyUrl.port || (proxyUrl.protocol === 'https:' ? 443 : 80), method: 'CONNECT', path: 'api.github.com:443', headers: { Host: 'api.github.com:443', ...(proxyUrl.username ? { 'Proxy-Authorization': 'Basic ' + Buffer.from(decodeURIComponent(proxyUrl.username) + ':' + decodeURIComponent(proxyUrl.password)).toString('base64') } : {}) } });
        connect.setTimeout(20_000, () => connect.destroy(Error('GitHub 代理连接超时'))); connect.on('error', reject);
        connect.on('connect', (response, socket, head) => {
          if (response.statusCode !== 200) { socket.destroy(); reject(Error(`GitHub 代理连接失败（HTTP ${response.statusCode}）`)); return; }
          if (head.length) socket.unshift(head);
          const agent = new https.Agent(); agent.createConnection = () => tls.connect({ socket, servername: 'api.github.com' });
          const request = https.get(url, { agent, headers }, response => {
            let body = ''; response.setEncoding('utf8'); response.on('data', chunk => { body += chunk; });
            response.on('end', () => { agent.destroy(); resolve({ status: response.statusCode, body }); }); response.on('error', error => { agent.destroy(); reject(error); });
          });
          request.setTimeout(20_000, () => request.destroy(Error('GitHub 状态查询超时'))); request.on('error', error => { agent.destroy(); reject(error); });
        }); connect.end();
      }));
    }
    if (status < 200 || status >= 300) throw Error(`GitHub 状态查询暂不可用（HTTP ${status}）；提交已保留，可重新检查后重试。`);
    return JSON.parse(body);
  }
  async monitorGitHub({ commit, update }) {
    const deadline = Date.now() + 25 * 60_000;
    let sourceRun, deploymentCommit, lastError = null;
    while (Date.now() < deadline) {
      try {
        if (!sourceRun) {
          const data = await this.api(`actions/workflows/deploy.yml/runs?head_sha=${commit}&event=push&per_page=10`);
          const run = data.workflow_runs?.find(item => item.head_sha === commit && item.head_branch === this.branch);
          if (run) {
            await update({ phase: 'building', workflowUrl: run.html_url, message: 'GitHub 正在检查并构建网站。' });
            if (run.status === 'completed' && run.conclusion !== 'success') throw Object.assign(Error(`GitHub 构建未成功（${run.conclusion}），请打开构建详情。`), { definitive: true });
            if (run.conclusion === 'success') sourceRun = run;
          }
        }
        if (sourceRun && !deploymentCommit) {
          const commits = await this.api('commits?sha=gh-pages&per_page=15');
          deploymentCommit = commits.find(item => item.commit?.message?.includes(commit))?.sha;
          await update({ phase: 'deploying', message: '网站构建通过，正在等待 GitHub Pages 完成上线。' });
        }
        if (deploymentCommit) {
          const data = await this.api(`actions/runs?head_sha=${deploymentCommit}&per_page=30`);
          const run = data.workflow_runs?.find(item => item.head_sha === deploymentCommit && (item.name === 'pages build and deployment' || item.path?.includes('pages/pages-build-deployment')));
          if (run) {
            await update({ phase: 'deploying', workflowUrl: run.html_url, deploymentCommit, message: 'GitHub Pages 正在发布网站。' });
            if (run.status === 'completed' && run.conclusion !== 'success') throw Object.assign(Error(`GitHub Pages 未完成发布（${run.conclusion}），请打开部署详情。`), { definitive: true });
            if (run.conclusion === 'success') return;
          }
        }
        lastError = null;
      } catch (error) { if (error.definitive) throw error; lastError = error; }
      await delay(this._apiSettings?.token ? 20_000 : 60_000);
    }
    throw lastError || Error('提交已上传，但等待部署超时；请打开 GitHub 构建详情，或重新检查后继续确认上线状态。');
  }
}
