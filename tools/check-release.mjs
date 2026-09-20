import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('dist'),problems=[];let bytes=0,files=0,largest={path:'',bytes:0};
async function walk(dir) {
  for(const entry of await fs.readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name),rel=path.relative(root,file).replaceAll('\\','/');
    if(entry.isSymbolicLink()){problems.push(`Symbolic link: ${rel}`);continue}
    if(entry.isDirectory()){
      if(/(^|\/)(?:node_modules|private-publisher|\.git|\.obsidian|tools)(?:\/|$)/.test(rel))problems.push(`Private/tool directory: ${rel}`);
      await walk(file);continue;
    }
    const size=(await fs.stat(file)).size;files++;bytes+=size;
    if(size>largest.bytes)largest={path:rel,bytes:size};
    if(size>=100*1024*1024)problems.push(`File exceeds GitHub 100 MiB limit: ${rel}`);
    if(/(^|\/)(?:\.env(?:\..*)?|selection\.json|transaction\.json|core\.mjs|server\.mjs)$/.test(rel))problems.push(`Private/tool file: ${rel}`);
    if(/\.(?:html|js|css|json|xml|md|txt)$/.test(rel)&&size<12e6){
      const text=await fs.readFile(file,'utf8');
      if(/(?:F:[\\/]+我的笔记|G:[\\/]+p站图片|private-publisher|publisher-asset:|__TOKEN__|__PREVIEW_URL__)/.test(text))problems.push(`Local-only reference: ${rel}`);
    }
  }
}
await walk(root);
for(const file of ['index.html','.nojekyll','404.html','pagefind/pagefind.js','sitemap-index.xml','robots.txt'])if(!await fs.stat(path.join(root,file)).catch(()=>null))problems.push(`Missing required file: ${file}`);
if(bytes>1024**3)problems.push('Published site exceeds 1 GiB');
const report={files,bytes,mebibytes:Math.round(bytes/1024**2*10)/10,largest,problems};
console.log(JSON.stringify(report,null,2));if(problems.length)process.exitCode=1;
