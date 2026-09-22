import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PublicationStatus } from './publication-status.mjs';
import { GitPublisher } from './deploy.mjs';

const execute = promisify(execFile);
async function git(cwd, ...args) { return (await execute('git', args, { cwd, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' } })).stdout.trim(); }
const contentFile = 'src/data/publisher-content.json', topicsFile = 'src/data/publisher-topics.json';
const entry = (key, file, section = 'notes') => ({ key, id: key.slice(key.indexOf(':') + 1), collection: key.split(':')[0], path: file, section, metadata: {} });

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publication-status-'));
  const site = path.join(root, 'site'), remote = path.join(root, 'origin.git');
  await fs.mkdir(site); await git(root, 'init', '--bare', '--initial-branch=main', remote);
  await git(site, 'init', '--initial-branch=main'); await git(site, 'config', 'user.name', 'Status test'); await git(site, 'config', 'user.email', 'status@example.test'); await git(site, 'config', 'core.autocrlf', 'true');
  await git(site, 'remote', 'add', 'origin', remote);
  const write = async (file, value) => { await fs.mkdir(path.dirname(path.join(site, file)), { recursive: true }); await fs.writeFile(path.join(site, file), value); };
  const content = { version: 1, entries: {}, collections: {} }, topics = { version: 1, topics: {} };
  const entries = [entry('notes:first', 'src/content/notes/first.md'), entry('notes:second', 'src/content/notes/second.md'), entry('work:ue', 'src/content/work/ue.md', 'work'), entry('work:water', 'src/content/work/water.md', 'work')];
  await write('.gitattributes', '*.md text eol=lf\n*.json text eol=lf\n');
  for (const item of entries) await write(item.path, '# ' + item.id + '\n\nOriginal content.\n');
  await write(contentFile, JSON.stringify(content, null, 2) + '\n'); await write(topicsFile, JSON.stringify(topics, null, 2) + '\n');
  await git(site, 'add', '.'); await git(site, 'commit', '-m', 'Synthetic initial'); await git(site, 'push', 'origin', 'HEAD:main');
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 }));
  const status = new PublicationStatus({ site });
  return { root, site, remote, write, entries, content, topics, status };
}

test('uploaded status compares origin blobs with Git-normalized working files without changing HEAD or index', async t => {
  const f = await fixture(t);
  await f.write(f.entries[0].path, '# first\r\n\r\nOriginal content.\r\n');
  const head = await git(f.site, 'rev-parse', 'HEAD'), staged = await git(f.site, 'diff', '--cached'), working = await git(f.site, 'status', '--porcelain');
  const result = await f.status.scan(f.entries);
  for (const item of f.entries) assert.equal(result.entries[item.key].state, 'uploaded');
  assert.equal(result.remoteCommit, await git(f.remote, 'rev-parse', 'main'));
  assert.equal(result.stale, false); assert.ok(Date.parse(result.checkedAt));
  assert.match(result.entries['notes:first'].reason, /不代表.*部署/);
  assert.equal(await git(f.site, 'rev-parse', 'HEAD'), head); assert.equal(await git(f.site, 'diff', '--cached'), staged); assert.equal(await git(f.site, 'status', '--porcelain'), working);
});

test('new generated files are local and existing modified or deleted sources need upload', async t => {
  const f = await fixture(t); await f.status.scan(f.entries);
  await f.write(f.entries[0].path, '# Locally modified\n'); await fs.rm(path.join(f.site, f.entries[1].path));
  const generated = entry('published:n-new', 'content/published/notes/n-new.md'); await f.write(generated.path, '# New article\n');
  const result = await f.status.scan([...f.entries, generated]);
  assert.equal(result.entries['notes:first'].state, 'modified'); assert.equal(result.entries['notes:second'].state, 'modified');
  assert.equal(result.entries['published:n-new'].state, 'local'); assert.equal(result.entries['work:ue'].state, 'uploaded');
});

test('semantic content and topic changes affect their own entries rather than every article sharing a config file', async t => {
  const f = await fixture(t); await f.status.scan(f.entries);
  await f.write(contentFile, JSON.stringify({ collections: {}, entries: { 'notes:first': { tags: ['Shader'], category: 'Graphics' } }, version: 1 }));
  await f.write(topicsFile, JSON.stringify({ topics: { ue: { notes: ['notes:first'], title: 'UE topic' } }, version: 1 }));
  const result = await f.status.scan(f.entries);
  assert.equal(result.entries['notes:first'].state, 'modified'); assert.equal(result.entries['work:ue'].state, 'modified');
  assert.equal(result.entries['notes:second'].state, 'uploaded'); assert.equal(result.entries['work:water'].state, 'uploaded');
  await f.write(contentFile, '{"collections":{},"entries":{},"version":1}'); await f.write(topicsFile, '{"topics":{},"version":1}');
  const reformatted = await f.status.scan(f.entries);
  for (const item of f.entries) assert.equal(reformatted.entries[item.key].state, 'uploaded', 'JSON formatting and object-key order do not constitute per-entry changes');
});

test('virtual collections compare their own semantic records and recognize new collections', async t => {
  const f = await fixture(t);
  f.content.collections = { ue: { title: 'UE', notes: ['notes:first'], summary: 'Engine study' }, water: { title: 'Water', notes: [], summary: 'Water study' } };
  await f.write(contentFile, JSON.stringify(f.content)); await git(f.site, 'add', contentFile); await git(f.site, 'commit', '-m', 'Synthetic collections'); await git(f.site, 'push', 'origin', 'HEAD:main');
  const collections = ['ue', 'water', 'new'].map(id => entry('collections:' + id, contentFile, 'work'));
  f.content.collections.ue.title = 'UE changed'; f.content.collections.new = { title: 'New', notes: [], summary: 'Local collection' };
  await f.write(contentFile, JSON.stringify(f.content));
  const result = await f.status.scan(collections);
  assert.equal(result.entries['collections:ue'].state, 'modified'); assert.equal(result.entries['collections:water'].state, 'uploaded'); assert.equal(result.entries['collections:new'].state, 'local');
  const pending = await f.status.scan([{ ...entry('collections:draft', contentFile, 'work'), settingsPending: true }]);
  assert.equal(pending.entries['collections:draft'].state, 'local'); assert.match(pending.entries['collections:draft'].reason, /尚未写入/);
});

test('private metadata drafts do not change the upload state of the public version', async t => {
  const f = await fixture(t);
  await f.write(topicsFile, JSON.stringify({ version: 1, topics: { ue: { title: 'Changed local topic' } } }));
  const pending = { ...f.entries[2], section: 'notes', currentMetadata: { section: 'work' }, metadata: { section: 'notes' }, settingsPending: true };
  const result = await f.status.scan([pending]);
  assert.equal(result.entries['work:ue'].state, 'modified', 'the unchanged public work still receives its public topic settings despite a private section draft');
});

test('canonical replacement metadata is compared with current-key settings taking final precedence', async t => {
  const f = await fixture(t);
  const replacement = { ...entry('published:n-ue', 'content/published/notes/n-ue.md', 'work'), replaces: 'work:ue', metadata: { replaces: 'work:ue' } };
  await f.write(replacement.path, '# Replacement\n');
  f.content.entries = { 'work:ue': { title: 'Inherited' }, 'published:n-ue': { title: 'Final title' } };
  f.topics.topics = { ue: { title: 'Old topic' } };
  await f.write(contentFile, JSON.stringify(f.content)); await f.write(topicsFile, JSON.stringify(f.topics));
  await git(f.site, 'add', '.'); await git(f.site, 'commit', '-m', 'Synthetic replacement'); await git(f.site, 'push', 'origin', 'HEAD:main');
  f.content.entries['work:ue'].title = 'A shadowed title'; f.topics.topics.ue.title = 'A shadowed topic title';
  await f.write(contentFile, JSON.stringify(f.content)); await f.write(topicsFile, JSON.stringify(f.topics));
  assert.equal((await f.status.scan([replacement])).entries[replacement.key].state, 'uploaded', 'shadowed metadata does not change the effective replacement settings');
  f.content.entries['published:n-ue'].title = 'Actually changed'; await f.write(contentFile, JSON.stringify(f.content));
  assert.equal((await f.status.scan([replacement])).entries[replacement.key].state, 'modified');
});

test('remote snapshots cache for one minute while an explicit refresh reads a changed main branch', async t => {
  const f = await fixture(t);
  const first = await f.status.scan(f.entries); let fetches = 0;
  const runGit = f.status.git.bind(f.status); f.status.git = (args, options) => { if (args.includes('fetch')) fetches++; return runGit(args, options); };
  const clone = path.join(f.root, 'other'); await git(f.root, 'clone', f.remote, clone); await git(clone, 'config', 'user.name', 'Other'); await git(clone, 'config', 'user.email', 'other@example.test');
  await fs.writeFile(path.join(clone, f.entries[0].path), '# Remote update\n'); await git(clone, 'add', '.'); await git(clone, 'commit', '-m', 'Remote update'); await git(clone, 'push', 'origin', 'HEAD:main');
  const cached = await f.status.scan(f.entries); assert.equal(fetches, 0); assert.equal(cached.remoteCommit, first.remoteCommit); assert.equal(cached.entries['notes:first'].state, 'uploaded');
  const refreshed = await f.status.scan(f.entries, { refresh: true }); assert.equal(fetches, 1); assert.notEqual(refreshed.remoteCommit, first.remoteCommit); assert.equal(refreshed.entries['notes:first'].state, 'modified');
});

test('an unavailable origin yields unknown status with explicit stale cached provenance', async t => {
  const f = await fixture(t);
  const before = await f.status.scan(f.entries);
  await git(f.site, 'remote', 'set-url', 'origin', path.join(f.root, 'missing.git'));
  const failed = await f.status.scan(f.entries, { refresh: true });
  assert.equal(failed.stale, true); assert.equal(failed.remoteCommit, before.remoteCommit); assert.equal(failed.checkedAt, before.checkedAt);
  for (const item of f.entries) assert.equal(failed.entries[item.key].state, 'unknown');
  assert.match(failed.entries['notes:first'].reason, /过期/);
  const freshInstance = await new PublicationStatus({ site: f.site }).scan(f.entries);
  assert.equal(freshInstance.checkedAt, null); assert.equal(freshInstance.stale, true); assert.equal(freshInstance.entries['notes:first'].state, 'unknown');
});

test('a directory without Git and invalid publication JSON produce truthful unknown results', async t => {
  const f = await fixture(t);
  const plain = path.join(f.root, 'plain'); await fs.mkdir(plain);
  const unavailable = await new PublicationStatus({ site: plain }).scan(f.entries);
  assert.equal(unavailable.remoteCommit, null); assert.equal(unavailable.entries['notes:first'].state, 'unknown');
  await f.write(contentFile, '{ broken');
  const invalid = await f.status.scan(f.entries); assert.equal(invalid.entries['notes:first'].state, 'unknown'); assert.match(invalid.entries['notes:first'].reason, /JSON/);
});

test('deployment reviews include only the exact content settings file and detect edits after review', async t => {
  const f = await fixture(t);
  const publisher = await new GitPublisher({ site: f.site, state: path.join(f.root, 'deployment'), allowLocalRemote: true, monitor: async () => {} }).init();
  await f.write(contentFile, JSON.stringify({ ...f.content, entries: { 'notes:first': { title: 'Public override' } } }));
  await f.write(contentFile + '.private', 'must not be reviewed');
  const review = await publisher.review(); assert.equal(review.canPublish, true); assert.deepEqual(review.changes.map(item => item.path), [contentFile]);
  await f.write(contentFile, JSON.stringify({ ...f.content, entries: { 'notes:first': { title: 'Changed after review' } } }));
  await assert.rejects(publisher.assertSnapshot(review.snapshot || publisher.reviews.get(review.id).snapshot), /发生变化/);
  assert.equal(await git(f.remote, 'rev-parse', 'main'), await git(f.site, 'rev-parse', 'HEAD'), 'the review test never pushes or commits changes');
});

test('the configuration allowlist cannot include files placed under a same-named directory', async t => {
  const f = await fixture(t);
  const publisher = await new GitPublisher({ site: f.site, state: path.join(f.root, 'deployment'), allowLocalRemote: true, monitor: async () => {} }).init();
  await fs.rm(path.join(f.site, contentFile)); await f.write(contentFile + '/private.txt', 'must not enter a publication commit');
  const review = await publisher.review();
  assert.equal(review.changes.some(item => item.path === contentFile + '/private.txt'), false);
  assert.equal(review.changes.some(item => item.path === contentFile), true, 'only the previously tracked configuration file deletion is eligible');
});
