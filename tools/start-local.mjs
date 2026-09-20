import net from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const previewPort = Number(process.env.SITE_PORT || 4325);
const publisherPort = Number(process.env.PUBLISHER_PORT || 4875);
const previewUrl = `http://127.0.0.1:${previewPort}/`;
const children = [];
const listening = port => new Promise(resolve => {
  const socket = net.connect({host:'127.0.0.1',port});
  socket.setTimeout(1500);
  socket.once('connect',()=>{socket.destroy();resolve(true)});
  socket.once('error',()=>resolve(false));
  socket.once('timeout',()=>{socket.destroy();resolve(false)});
});
async function run(script,args=[]) {
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(site,script),...args],{cwd:site,stdio:'inherit',windowsHide:true});
    child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('构建失败，退出码 '+code)));
  });
}
async function identity(port) {
  return fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(2000)}).then(r=>r.ok?r.json():null).catch(()=>null);
}
async function ensureService(port,script,service,label) {
  if(await listening(port)) {
    const current=await identity(port);
    if(current?.service!==service||path.resolve(current.site||'.')!==site) throw Error(`${label}端口 ${port} 被其他服务或旧版服务占用，请关闭旧窗口后重试。`);
    if(service==='garden-publisher'&&current.previewUrl.replace(/\/$/,'')!==previewUrl.replace(/\/$/,'')) throw Error('现有发布管理器的预览地址不一致，请关闭旧窗口后重试。');
    console.log(`${label}已运行，沿用现有服务。`);return;
  }
  const child=spawn(process.execPath,[path.join(site,script)],{cwd:site,stdio:'inherit',windowsHide:true,env:{...process.env,SITE_PORT:String(previewPort),PUBLISHER_PORT:String(publisherPort),PUBLISHER_PREVIEW_URL:previewUrl}});
  children.push(child);
  let failure;child.once('error',error=>{failure=error});
  for(let i=0;i<40;i++) {
    if(failure)throw failure;
    if(child.exitCode!==null)throw Error(label+'启动失败，退出码 '+child.exitCode);
    if((await identity(port))?.service===service)return;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error(label+'启动超时');
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const child of children)child.kill();process.exit()});
try {
  if(!await fs.stat(path.join(site,'dist','index.html')).catch(()=>null)) {
    console.log('首次启动，正在构建网站…');
    await run('node_modules/astro/astro.js',['build','--force']);
    await run('node_modules/pagefind/lib/runner/bin.cjs',['--site','dist']);
  }
  await ensureService(previewPort,'tools/preview.mjs','garden-preview','网站预览');
  await ensureService(publisherPort,'tools/publisher/server.mjs','garden-publisher','笔记发布管理器');
  console.log(`\n网站：${previewUrl}\n笔记管理：http://127.0.0.1:${publisherPort}/\n仅本机访问。不会上传笔记或部署。关闭窗口可停止本次启动的服务。`);
}catch(error){for(const child of children)child.kill();console.error(error.message);process.exitCode=1}
