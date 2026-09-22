import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { GitPublisher } from './deploy.mjs';

const execute = promisify(execFile);
async function git(cwd, ...args) { return (await execute('git', args, { cwd, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } })).stdout.trim(); }
async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'garden-deploy-'));
  const site = path.join(root, 'site'), remote = path.join(root, 'remote.git'), state = path.join(root, 'private');
  await fs.mkdir(site); await git(root, 'init', '--bare', '--initial-branch=main', remote);
  await git(site, 'init', '--initial-branch=main'); await git(site, 'config', 'user.name', 'Publisher test'); await git(site, 'config', 'user.email', 'publisher@example.test');
  await git(site, 'remote', 'add', 'origin', remote);
  async function write(file, content) { await fs.mkdir(path.dirname(path.join(site, file)), { recursive: true }); await fs.writeFile(path.join(site, file), content); }
  await write('src/content/note.md', '# Before\n'); await write('src/style.css', 'old'); await write('public/assets/old.txt', 'old');
  await git(site, 'add', '.'); await git(site, 'commit', '-m', 'Initial'); await git(site, 'push', 'origin', 'HEAD:main');
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));
  let validations = 0, monitors = 0;
  const publisher = await new GitPublisher({ site, state, allowLocalRemote: true, validate: async () => { validations++; }, monitor: async ({ update }) => { monitors++; await update({ phase: 'deploying', workflowUrl: 'https://example.test/run' }); }, ...options }).init();
  return { root, site, state, remote, write, publisher, counts: () => ({ validations, monitors }) };
}
async function publish(publisher) { const review = await publisher.review(); assert.equal(review.canPublish, true, JSON.stringify(review.blockers)); await publisher.start(review.id); await publisher._job; return publisher.status(); }

test('publishes only reviewed article files and preserves unrelated working edits', async t => {
  const f = await fixture(t);
  await f.write('src/content/note.md', '# Published\n'); await f.write('src/style.css', 'local design'); await f.write('private.txt', 'do not publish');
  await f.write('public/published-assets/new.txt', 'image'); await fs.rm(path.join(f.site, 'public/assets/old.txt'));
  const review = await f.publisher.review();
  assert.deepEqual(review.changes.map(item => item.path).sort(), ['public/assets/old.txt', 'public/published-assets/new.txt', 'src/content/note.md']);
  assert.equal((await f.publisher.start(review.id)).busy, true); await f.publisher._job;
  assert.equal(f.publisher.status().phase, 'success'); assert.equal(f.publisher.busy, false);
  assert.equal(await git(f.remote, 'show', 'main:src/content/note.md'), '# Published');
  assert.equal(await git(f.remote, 'show', 'main:src/style.css'), 'old');
  assert.equal(await git(f.site, 'diff', '--cached', '--name-only'), '');
  assert.match(await git(f.site, 'status', '--short'), /M src\/style\.css/);
  assert.equal((await f.publisher.review()).upToDate, true);
  assert.deepEqual(f.counts(), { validations: 1, monitors: 1 });
});

test('blocks existing staged changes without changing the index or HEAD', async t => {
  const f = await fixture(t); await f.write('src/style.css', 'staged'); await git(f.site, 'add', 'src/style.css'); await f.write('src/content/note.md', 'article');
  const before = await git(f.site, 'diff', '--cached'); const head = await git(f.site, 'rev-parse', 'HEAD');
  const review = await f.publisher.review(); assert.equal(review.canPublish, false); assert.match(review.blockers.join(), /暂存/);
  await assert.rejects(f.publisher.start(review.id), /重新检查/);
  assert.equal(await git(f.site, 'diff', '--cached'), before); assert.equal(await git(f.site, 'rev-parse', 'HEAD'), head);
});

test('topic configuration is included in reviewed deployment and protected against later edits', async t => {
  const f = await fixture(t);
  const file = 'src/data/publisher-topics.json';
  await f.write(file, JSON.stringify({version:1,topics:{ue:{notes:['notes:overlay']}}}));
  const review = await f.publisher.review();
  assert.equal(review.canPublish,true);assert.ok(review.changes.some(item=>item.path===file));
  await f.write(file, JSON.stringify({version:1,topics:{ue:{notes:[]}}}));
  await f.publisher.start(review.id);await f.publisher._job;
  assert.equal(f.publisher.status().phase,'error');
  assert.equal((await publish(f.publisher)).phase,'success');
  assert.deepEqual(JSON.parse(await git(f.remote,'show','main:'+file)).topics.ue.notes,[]);
});

test('rejects article changes after review and during validation', async t => {
  const f = await fixture(t); await f.write('src/content/note.md', 'reviewed'); const before = await git(f.remote, 'rev-parse', 'main');
  const review = await f.publisher.review(); await f.write('src/content/note.md', 'unreviewed');
  await f.publisher.start(review.id); await f.publisher._job; assert.equal(f.publisher.status().phase, 'error'); assert.match(f.publisher.status().message, /发生变化/);
  f.publisher.validate = () => f.write('src/content/note.md', 'changed during build');
  assert.equal((await publish(f.publisher)).phase, 'error'); assert.equal(await git(f.remote, 'rev-parse', 'main'), before);
});

test('remote updates after review are never overwritten', async t => {
  const f = await fixture(t); await f.write('src/content/note.md', 'article'); const review = await f.publisher.review();
  const other = path.join(f.root, 'other'); await git(f.root, 'clone', f.remote, other); await git(other, 'config', 'user.name', 'Other'); await git(other, 'config', 'user.email', 'other@example.test');
  await fs.writeFile(path.join(other, 'other.txt'), 'remote change'); await git(other, 'add', '.'); await git(other, 'commit', '-m', 'Remote edit'); await git(other, 'push');
  const before = await git(f.remote, 'rev-parse', 'main'); await f.publisher.start(review.id); await f.publisher._job;
  assert.equal(f.publisher.status().phase, 'error'); assert.equal(await git(f.remote, 'rev-parse', 'main'), before);
  assert.match((await f.publisher.review()).blockers.join(), /尚未同步/);
});

test('rejects unrelated commits ahead of the remote', async t => {
  const f = await fixture(t); await f.write('src/style.css', 'feature'); await git(f.site, 'add', '.'); await git(f.site, 'commit', '-m', 'Unpublished feature');
  await f.write('src/content/note.md', 'article'); const review = await f.publisher.review();
  assert.equal(review.canPublish, false); assert.match(review.blockers.join(), /工具之外/);
});

test('a failed push is retried after restart without duplicating the commit', async t => {
  const f = await fixture(t); await f.write('src/content/note.md', 'article');
  const normalGit = f.publisher.git.bind(f.publisher); f.publisher.git = (args, options) => args[0] === 'push' ? Promise.reject(Error('simulated network failure')) : normalGit(args, options);
  assert.equal((await publish(f.publisher)).phase, 'error'); const commit = await git(f.site, 'rev-parse', 'HEAD');
  const resumed = await new GitPublisher({ site: f.site, state: f.state, allowLocalRemote: true, monitor: async () => {} }).init();
  const review = await resumed.review(); assert.equal(review.commits.length, 1); assert.equal(review.changes.length, 0);
  assert.equal((await publish(resumed)).phase, 'success'); assert.equal(await git(f.site, 'rev-parse', 'HEAD'), commit); assert.equal(await git(f.remote, 'rev-parse', 'main'), commit);
});

test('monitoring failure keeps uploaded state and resumes without another commit', async t => {
  const f = await fixture(t, { monitor: async () => { throw Error('monitor offline'); } }); await f.write('src/content/note.md', 'article');
  assert.equal((await publish(f.publisher)).phase, 'error'); assert.equal(f.publisher.status().pushed, true); const commit = f.publisher.status().commit;
  const resumed = await new GitPublisher({ site: f.site, state: f.state, allowLocalRemote: true, monitor: async () => {} }).init();
  const review = await resumed.review(); assert.equal(review.upToDate, true); assert.equal(review.canPublish, true);
  assert.equal((await publish(resumed)).phase, 'success'); assert.equal(await git(f.remote, 'rev-parse', 'main'), commit);
});

test('a push accepted remotely before a connection error resumes monitoring without another push', async t => {
  const f = await fixture(t); await f.write('src/content/note.md', 'article');
  const normalGit = f.publisher.git.bind(f.publisher);
  f.publisher.git = async (args, options) => {
    const result = await normalGit(args, options);
    if (args[0] === 'push') throw Error('connection lost after remote accepted push');
    return result;
  };
  assert.equal((await publish(f.publisher)).phase, 'error'); assert.equal(f.publisher.status().pushed, false);
  const commit = await git(f.site, 'rev-parse', 'HEAD'); assert.equal(await git(f.remote, 'rev-parse', 'main'), commit);
  let monitors = 0, pushes = 0;
  const resumed = await new GitPublisher({ site: f.site, state: f.state, allowLocalRemote: true, monitor: async () => { monitors++; } }).init();
  const resumedGit = resumed.git.bind(resumed);
  resumed.git = (args, options) => { if (args[0] === 'push') { pushes++; throw Error('unexpected repeated push'); } return resumedGit(args, options); };
  const review = await resumed.review(); assert.equal(review.upToDate, true); assert.equal(review.canPublish, true); assert.equal(review.commits.length, 0);
  await resumed.start(review.id); await resumed._job;
  assert.equal(resumed.status().phase, 'success'); assert.equal(resumed.status().pushed, true);
  assert.equal(await git(f.site, 'rev-parse', 'HEAD'), commit); assert.equal(pushes, 0); assert.equal(monitors, 1);
});

test('a failed recovery validation preserves the uploaded commit for another monitoring retry', async t => {
  const f = await fixture(t, { monitor: async () => { throw Error('monitor offline'); } }); await f.write('src/content/note.md', 'article');
  await publish(f.publisher); const commit = f.publisher.status().commit;
  f.publisher.validate = async () => { throw Error('local build unavailable'); };
  assert.equal((await publish(f.publisher)).phase, 'error');
  assert.equal(f.publisher.status().commit, commit); assert.equal(f.publisher.status().pushed, true);
  const review = await f.publisher.review(); assert.equal(review.canPublish, true); assert.equal(review.upToDate, true);
});

test('success requires both the source workflow and Pages workflow for its generated deployment SHA', async t => {
  const f = await fixture(t); const commit = 'a'.repeat(40), deployment = 'b'.repeat(40), updates = [];
  f.publisher.api = async resource => resource.startsWith('actions/workflows/') ? { workflow_runs: [{ head_sha: commit, head_branch: 'main', status: 'completed', conclusion: 'success', html_url: 'https://example.test/source' }] } : resource.startsWith('commits?') ? [{ sha: deployment, commit: { message: `Deploying @ ${commit}` } }] : { workflow_runs: [{ head_sha: deployment, name: 'pages build and deployment', status: 'completed', conclusion: 'success', html_url: 'https://example.test/pages' }] };
  await f.publisher.monitorGitHub({ commit, update: async update => { updates.push(update); } });
  assert.equal(updates.at(-1).deploymentCommit, deployment); assert.equal(updates.at(-1).workflowUrl, 'https://example.test/pages');
  f.publisher.api = async () => ({ workflow_runs: [{ head_sha: commit, head_branch: 'main', status: 'completed', conclusion: 'failure' }] });
  await assert.rejects(f.publisher.monitorGitHub({ commit, update: async () => {} }), /构建未成功/);
});

test('wrong remotes and symlink article sources cannot be published', async t => {
  const f = await fixture(t); await f.write('src/content/note.md', 'article');
  const production = await new GitPublisher({ site: f.site, state: f.state }).init(); assert.match((await production.review()).blockers.join(), /仓库地址/);
  const outside = path.join(f.root, 'outside'); await fs.mkdir(outside); await fs.writeFile(path.join(outside, 'secret.md'), 'private');
  await fs.symlink(outside, path.join(f.site, 'src/content/private'), 'junction');
  const review = await f.publisher.review(); assert.equal(review.canPublish, false); assert.match(review.blockers.join(), /符号链接/);
});

test('interrupted deployment resets to a truthful recoverable error', async t => {
  const f = await fixture(t); await f.publisher.update({ phase: 'building', pushed: true, commit: 'a'.repeat(40) });
  const recovered = await new GitPublisher({ site: f.site, state: f.state }).init();
  assert.equal(recovered.busy, false); assert.equal(recovered.status().phase, 'error'); assert.match(recovered.status().message, /监测中断/);
});
