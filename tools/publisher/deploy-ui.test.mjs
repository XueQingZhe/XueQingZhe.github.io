import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright';

const siteUrl = 'https://example.github.io/';
const workflowUrl = 'https://github.com/example/example.github.io/actions/runs/123';
const idle = { busy: false, phase: 'idle', message: '尚无发布任务。', siteUrl };
const building = { busy: true, phase: 'building', message: '正在云端构建网站。', siteUrl, workflowUrl };
const success = { busy: false, phase: 'success', message: 'GitHub Pages 已完成上线。', siteUrl, workflowUrl };
const review = {
  id: 'review-1', repository: 'example/example.github.io', branch: 'main', canPublish: true,
  changes: [
    { status: 'A', path: 'content/published/notes/public-note.md' },
    { status: 'M', path: 'public/published-assets/diagram.webp' },
    { status: 'D', path: 'content/published/notes/withdrawn.md' },
  ],
  blockers: [], commits: [], siteUrl,
};

async function fixture(t, initialStatus = idle) {
  const source = (await fs.readFile(new URL('./index.html', import.meta.url), 'utf8'))
    .replace('__TOKEN__', 'a'.repeat(64)).replace('__PREVIEW_URL__', 'http://127.0.0.1:4325/');
  const mock = { status: structuredClone(initialStatus), review: structuredClone(review), calls: [], startError: null };
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const send = (body, status = 200) => { res.writeHead(status); res.end(JSON.stringify(body)); };
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(source); }
    if (req.url === '/publisher.css') { res.setHeader('Content-Type', 'text/css'); return res.end(await fs.readFile(new URL('./publisher.css', import.meta.url), 'utf8')); }
    if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
    let raw = ''; for await (const data of req) raw += data;
    const data = JSON.parse(raw || '{}');
    mock.calls.push({ method: req.method, url: req.url, data, token: req.headers['x-publisher-token'] });
    if (req.url === '/api/scan') return send({ sections:[{value:'notes'},{value:'tutorials'},{value:'work'}],metadata:{},notes: [], selected: [], assets: {}, missingSelected: [], ffmpeg: false });
    if (req.url === '/api/deploy/status') return send(mock.status);
    if (req.url === '/api/deploy/review' && req.method === 'POST') return send(mock.review);
    if (req.url === '/api/deploy/start' && req.method === 'POST') {
      if (mock.startError) return send({ error: mock.startError }, 409);
      mock.status = structuredClone(building); return send(mock.status);
    }
    return send({ error: 'Unexpected mock request: ' + req.url }, 404);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  browser = await chromium.launch({ headless: true, ...(process.env.PUBLISHER_TEST_BROWSER ? { channel: process.env.PUBLISHER_TEST_BROWSER } : {}) });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.setDefaultTimeout(5000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}/`;
  await page.goto(url);
  await page.waitForFunction(() => !document.querySelector('main').hasAttribute('aria-busy'));
  return { page, mock, errors, count: route => mock.calls.filter(call => call.url === '/api/' + route).length };
}

async function refresh(page, phase) {
  await page.locator('#deployRefresh').click();
  await page.waitForFunction(expected => document.querySelector('#deployStatus').dataset.phase === expected && !document.querySelector('#deployRefresh').disabled, phase);
}

test('publishing shows the exact public file review and requires confirmation before starting', async t => {
  const { page, mock, count, errors } = await fixture(t);
  assert.equal(count('deploy/start'), 0);
  await page.locator('#publishReview').click();
  await page.locator('#deployReview').waitFor({ state: 'visible' });
  assert.deepEqual(await page.locator('#deployFiles code').allTextContents(), review.changes.map(item => item.path));
  assert.match(await page.locator('#deployTarget').innerText(), /example\/example\.github\.io · main/);
  assert.equal(count('deploy/start'), 0, 'reviewing files must not publish them');
  await page.locator('#deployCancel').click();
  assert.equal(await page.locator('#deployReview').isVisible(), false);
  assert.equal(count('deploy/start'), 0, 'canceling the review must not publish');
  await page.locator('#publishReview').click();
  await page.locator('#deployConfirm').click();
  await page.waitForFunction(() => document.querySelector('#deployStatus').dataset.phase === 'building');
  assert.equal(count('deploy/start'), 1);
  const start = mock.calls.find(call => call.url === '/api/deploy/start');
  assert.equal(start.method, 'POST'); assert.deepEqual(start.data, { id: 'review-1' });
  assert.equal(start.token, 'a'.repeat(64));
  for (const id of ['search', 'folder', 'rescan', 'analyze', 'publishReview']) {
    assert.equal(await page.locator('#' + id).isDisabled(), true, id + ' stays locked during publishing');
  }
  assert.equal(await page.locator('#deployRefresh').isEnabled(), true, 'status remains available while publishing');
  assert.equal(await page.locator('#deployReview').isVisible(), false);
  const pollsBefore = count('deploy/status'); await refresh(page, 'building');
  assert.equal(count('deploy/status'), pollsBefore + 1);
  assert.equal(await page.locator('[data-deploy-step="build"]').getAttribute('aria-current'), 'step');
  mock.status = structuredClone(success); await refresh(page, 'success');
  assert.equal(await page.locator('#deploySite').getAttribute('href'), siteUrl);
  assert.equal(await page.locator('#deployWorkflow').getAttribute('href'), workflowUrl);
  assert.equal(await page.locator('#publishReview').isEnabled(), true);
  assert.equal(await page.locator('.deploy-steps .done').count(), 4);
  assert.deepEqual(errors, []);
});

test('reopening during deployment restores progress and resumes note controls after completion', async t => {
  const { page, mock, count, errors } = await fixture(t, building);
  assert.equal(count('scan'), 0, 'do not scan mutable publisher state during deployment');
  assert.equal(await page.locator('#search').isDisabled(), true);
  assert.equal(await page.locator('#deployRefresh').isEnabled(), true);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#deployStatus').dataset.phase === 'building' && !document.querySelector('main').hasAttribute('aria-busy'));
  assert.equal(count('scan'), 0);
  assert.equal(await page.locator('#publishReview').isDisabled(), true);
  assert.equal(await page.locator('#deployWorkflow').getAttribute('href'), workflowUrl);
  mock.status = structuredClone(success); await refresh(page, 'success');
  await page.waitForFunction(() => !document.querySelector('#analyze').disabled && document.querySelector('#count').textContent.includes('共 0 篇'));
  assert.equal(count('scan'), 1, 'scan once after restored deployment finishes');
  assert.equal(await page.locator('#search').isEnabled(), true);
  assert.deepEqual(errors, []);
});

test('failed deployment can be reviewed and retried, while start errors remain visible', async t => {
  const { page, mock, count, errors } = await fixture(t, { ...idle, phase: 'error', message: '上传失败：网络暂时不可用。', workflowUrl });
  assert.match(await page.locator('#deployStatus').innerText(), /网络暂时不可用/);
  assert.equal(await page.locator('#publishReview').innerText(), '检查并重试发布');
  await page.locator('#publishReview').click();
  mock.startError = '待发布内容已变化，请重新检查。';
  await page.locator('#deployConfirm').click();
  await page.waitForFunction(() => document.querySelector('#message').textContent.includes('待发布内容已变化'));
  assert.equal(count('deploy/start'), 1);
  assert.equal(await page.locator('#publishReview').isEnabled(), true);
  mock.startError = null; mock.review.id = 'review-retry';
  await page.locator('#publishReview').click();
  await page.locator('#deployConfirm').click();
  await page.waitForFunction(() => document.querySelector('#deployStatus').dataset.phase === 'building');
  assert.equal(count('deploy/start'), 2);
  assert.equal(mock.calls.filter(call => call.url === '/api/deploy/start').at(-1).data.id, 'review-retry');
  assert.deepEqual(errors, []);
});

test('publication blockers are displayed and cannot be confirmed', async t => {
  const { page, mock, count, errors } = await fixture(t);
  mock.review = { ...structuredClone(review), canPublish: false, blockers: ['有未经审核的文件，请先处理。', { message: '远端存在新版本，请先同步。' }] };
  await page.locator('#publishReview').click();
  await page.locator('#deployReview').waitFor({ state: 'visible' });
  assert.match(await page.locator('#deployBlockers').innerText(), /未经审核的文件/);
  assert.match(await page.locator('#deployBlockers').innerText(), /远端存在新版本/);
  assert.equal(await page.locator('#deployConfirm').isDisabled(), true);
  assert.equal(count('deploy/start'), 0);
  assert.deepEqual(errors, []);
});
