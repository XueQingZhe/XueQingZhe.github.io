import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const hash = createHash('sha256');
for (const file of ['site-covers.mjs', 'publication-status.mjs', 'site-content.mjs', 'content-settings.mjs', 'collection-editor.mjs', 'topics.mjs', 'cover-media.mjs', 'catalog.mjs', 'core.mjs', 'server.mjs', 'deploy.mjs', 'index.html', 'publisher.css', 'version.mjs']) {
  hash.update(await readFile(new URL(file, import.meta.url)));
}
export const publisherVersion = hash.digest('hex');
