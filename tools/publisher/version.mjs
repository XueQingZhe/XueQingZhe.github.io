import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const hash = createHash('sha256');
for (const file of ['cover-media.mjs', 'catalog.mjs', 'core.mjs', 'server.mjs', 'deploy.mjs', 'index.html', 'publisher.css', 'version.mjs']) {
  hash.update(await readFile(new URL(file, import.meta.url)));
}
export const publisherVersion = hash.digest('hex');
