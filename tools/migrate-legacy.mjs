/** Copies only existing website content. Never reads the private Vault. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import YAML from 'yaml';
import sharp from 'sharp';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import { visit } from 'unist-util-visit';
import { normalizeDisplayMath } from './markdown-utils.mjs';
import { fileURLToPath } from 'node:url';
const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), old=path.resolve(site,'../MyBlog/XueQingZhe.github.io');
const report={articles:[],assets:[],missing:[],verifiedUrls:[],inferredUrls:[]};
const digest=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
const fm=raw=>{const m=raw.replaceAll('\r\n','\n').match(/^---\n([\s\S]*?)\n---\n?/);return {data:m?YAML.parse(m[1]):{},body:m?raw.replaceAll('\r\n','\n').slice(m[0].length):raw}};
const all=async dir=>{const out=[];for(const f of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())out.push(...await all(p));else out.push(p)}return out};
const deployed=execFileSync('git',['-c','core.quotepath=false','ls-tree','-r','--name-only','origin/gh-pages','--','blog','tutorials'],{cwd:old,encoding:'utf8',maxBuffer:20e6}).trim().split('\n');
const titles=new Map();
const normalizeTitle=s=>s.replace(/\s+/g,' ').trim();
for(const p of deployed.filter(p=>/^blog\/\d{4}\/.+\/index.html$/.test(p))){const html=execFileSync('git',['show','origin/gh-pages:'+p],{cwd:old,encoding:'utf8',maxBuffer:30e6});const title=html.match(/<title>\s*([\s\S]*?)\s*\|/i)?.[1].replaceAll('&amp;','&').trim();if(title)titles.set(normalizeTitle(title),'/'+p.replace(/index.html$/,''))}
await fs.mkdir(path.join(site,'src/content/legacy'),{recursive:true});
const originals=[];
const normalizeMedia=body=>{
 const protectedRanges=[];visit(unified().use(remarkParse).use(remarkMath).parse(body),n=>{if(['code','inlineCode','math','inlineMath'].includes(n.type)&&n.position)protectedRanges.push([n.position.start.offset,n.position.end.offset])});
 return body.replace(/(!?\[[^\]]*\]\()(\/assets\/[^\n]*?\.(?:png|jpe?g|gif|webp|svg|mp4|webm|pdf))(?:\|\d+(?:x\d+)?)?\)/gi,(all,start,url,offset)=>protectedRanges.some(([a,b])=>offset>=a&&offset<b)?all:start+encodeURI(decodeURIComponent(url)).replace(/[()]/g,c=>c==='('?'%28':'%29')+')');
};
for(const kind of ['_posts','_tutorials'])for(const file of (await all(path.join(old,kind))).filter(p=>p.endsWith('.md'))){
 const {data,body}=fm(await fs.readFile(file,'utf8')); const title=String(data.title||path.basename(file,'.md'));
 const date=new Date(data.date||path.basename(file).slice(0,10)); if(!Number.isFinite(date.valueOf()))throw Error('Invalid date '+file);
 let url=data.permalink||titles.get(normalizeTitle(title));
 if(!url)throw Error('Cannot verify old URL: '+file);
 if(deployed.includes(url.replace(/^\//,'')+'index.html'))report.verifiedUrls.push(url);else report.inferredUrls.push(url);
 const tutorial=kind==='_tutorials';const series=tutorial?String(data.tutorial_series||'角色渲染教程'):'我独自升级';
 const out={title,date:date.toISOString().slice(0,10),summary:typeof data.description==='string'?data.description:'',tech:Array.isArray(data.tags)?data.tags:[],kind:tutorial?'tutorial':'article',series,order:tutorial?Number(data.chapter_index??100):Number(title.match(/Lv\.(\d+)/)?.[1]??100),review_status:tutorial?'needs-review':undefined,legacyUrl:url,draft:false};
 const normalized=normalizeMedia(normalizeDisplayMath(body.replace(/\{\{\s*['"]([^'"]+)['"]\s*\|\s*(?:relative_url|absolute_url)\s*\}\}/g,'$1')));
 if(/\{%|\{\{/.test(normalized))throw Error('Unresolved Liquid: '+file);
 const id=(tutorial?'tutorial-':'post-')+digest(url);
 await fs.writeFile(path.join(site,'src/content/legacy',id+'.md'),'---\n'+YAML.stringify(out)+'---\n\n'+normalized);
 report.articles.push({source:path.relative(old,file).replaceAll('\\','/'),url,id,kind:out.kind}); originals.push(normalized);
}
// The current work / notes contain real, already-migrated project articles.
for(const dir of ['work','notes'])for(const f of await all(path.join(site,'src/content',dir)))if(f.endsWith('.md')){const raw=await fs.readFile(f,'utf8'),normalized=normalizeMedia(raw);if(raw!==normalized)await fs.writeFile(f,normalized);originals.push(normalized)};
const refs=new Set();
for(const text of originals){
 // Space-containing Markdown targets and quoted HTML URLs are both common in the old site.
 for(const m of text.matchAll(/(?:src|href|poster)\s*=\s*["'](\/assets\/[^"']+)["']/g))refs.add(decodeURIComponent(m[1]));
 for(const m of text.matchAll(/!?\[[^\]]*\]\((\/assets\/[^\n]*?\.(?:png|jpe?g|gif|webp|svg|mp4|webm|pdf))\)/gi))refs.add(decodeURIComponent(m[1]));
 for(const m of text.matchAll(/^(?:cover|\s+src|\s+poster):\s*["']?(\/assets\/[^"'\r\n]+)["']?/gm))refs.add(decodeURIComponent(m[1].trim()));
}
for(const url of refs){const rel=url.split('#')[0].split('?')[0].replace(/^\//,'');const src=path.resolve(old,rel);if(!src.startsWith(old+path.sep))throw Error('Asset escaped old site');const dest=path.join(site,'public',rel);try{const from=await fs.stat(src),to=await fs.stat(dest).catch(()=>null);if(!to||from.size!==to.size||from.mtimeMs>to.mtimeMs){await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(src,dest)}report.assets.push(url)}catch(e){if(e.code==='ENOENT')report.missing.push(url);else throw e}}
// Compact cover derivatives; original article assets and URLs remain intact.
await fs.mkdir(path.join(site,'public/covers/generated'),{recursive:true});
for(const f of (await all(path.join(site,'src/content/work'))).filter(p=>p.endsWith('.md'))){const raw=await fs.readFile(f,'utf8'),{data}=fm(raw);if(data.draft||!data.cover?.startsWith('/assets/'))continue;const src=path.join(site,'public',decodeURIComponent(data.cover));try{const name=digest(data.cover)+'.webp';await sharp(src).resize({width:960,height:600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toFile(path.join(site,'public/covers/generated',name));await fs.writeFile(f,raw.replace(data.cover,'/covers/generated/'+name))}catch(e){report.missing.push(data.cover)}}
await fs.mkdir(path.join(site,'docs'),{recursive:true});await fs.writeFile(path.join(site,'docs/migration-manifest.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({articles:report.articles.length,copiedAssets:report.assets.length,missing:report.missing,verifiedUrls:report.verifiedUrls.length,unverifiedUrls:report.inferredUrls.length},null,2));
