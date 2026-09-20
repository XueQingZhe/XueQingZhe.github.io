import fs from 'node:fs/promises';

// Keep the deployed artifact tied to its source revision, including tool-only updates.
const commit = process.env.GITHUB_SHA;
if (!/^[a-f0-9]{40}$/i.test(commit || '')) throw Error('A full GITHUB_SHA is required to stamp a release.');
await fs.writeFile(new URL('../dist/site-version.json', import.meta.url), JSON.stringify({ commit }) + '\n');
