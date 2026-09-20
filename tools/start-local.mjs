import net from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { publisherVersion } from './publisher/version.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let previewPort = Number(process.env.SITE_PORT || 4325);
let publisherPort = Number(process.env.PUBLISHER_PORT || 4875);
let previewUrl, publisherUrl;
const openTarget = process.argv.find(arg => arg.startsWith('--open='))?.slice(7);
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
async function availablePort(preferred, service, explicit) {
  for(let port=preferred;port<=preferred+(explicit?0:20);port++) {
    if(!await listening(port))return port;
    const current=await identity(port);
    if(current?.service===service&&path.resolve(current.site||'.')===site&&(service!=='garden-publisher'||current.version===publisherVersion))return port;
  }
  throw Error(`端口 ${preferred} 附近没有可用地址，请指定其他端口。`);
}
function openBrowser(url) {
  const [command,args] = process.platform === 'win32'
    ? ['rundll32.exe',['url.dll,FileProtocolHandler',url]]
    : process.platform === 'darwin' ? ['open',[url]] : ['xdg-open',[url]];
  const browser = spawn(command,args,{stdio:'ignore',windowsHide:true,detached:true});
  browser.once('error',()=>console.log(`未能自动打开浏览器，请手动访问：${url}`));
  browser.unref();
}
async function ensureService(port,script,service,label) {
  if(await listening(port)) {
    const current=await identity(port);
    if(current?.service!==service||path.resolve(current.site||'.')!==site) throw Error(`${label}端口 ${port} 被其他服务或旧版服务占用，请关闭旧窗口后重试。`);
    if(service==='garden-publisher'&&current.previewUrl.replace(/\/$/,'')!==previewUrl.replace(/\/$/,'')) throw Error('现有发布管理器的预览地址不一致，请关闭旧窗口后重试。');
    if(service==='garden-publisher'&&current.version!==publisherVersion)throw Error('此端口上的管理器版本较旧，请换一个端口或关闭旧启动窗口。');
    console.log(`${label}已运行，沿用现有服务。`);return;
  }
  const child=spawn(process.execPath,[path.join(site,script)],{cwd:site,stdio:'inherit',windowsHide:true,env:{...process.env,SITE_ROOT:site,PUBLISHER_SITE:site,SITE_PORT:String(previewPort),PUBLISHER_PORT:String(publisherPort),PUBLISHER_PREVIEW_URL:previewUrl}});
  children.push(child);
  let failure;child.once('error',error=>{failure=error});
  for(let i=0;i<40;i++) {
    if(failure)throw failure;
    if(child.exitCode!==null)throw Error(label+'启动失败，退出码 '+child.exitCode);
    const current=await identity(port);
    if(current?.service===service&&path.resolve(current.site||'.')===site)return;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error(label+'启动超时');
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const child of children)child.kill();process.exit()});
try {
  previewPort=await availablePort(previewPort,'garden-preview',!!process.env.SITE_PORT);
  publisherPort=await availablePort(publisherPort,'garden-publisher',!!process.env.PUBLISHER_PORT);
  previewUrl=`http://127.0.0.1:${previewPort}/`;
  publisherUrl=`http://127.0.0.1:${publisherPort}/`;
  if(!await fs.stat(path.join(site,'dist','index.html')).catch(()=>null)) {
    console.log('首次启动，正在构建网站…');
    await run('node_modules/astro/astro.js',['build','--force']);
    await run('node_modules/pagefind/lib/runner/bin.cjs',['--site','dist']);
  }
  await ensureService(previewPort,'tools/preview.mjs','garden-preview','网站预览');
  await ensureService(publisherPort,'tools/publisher/server.mjs','garden-publisher','笔记发布管理器');
  console.log(`\n网站：${previewUrl}\n文章发布管理器：${publisherUrl}\n启动后仅在本机运行，不会自动上传。审核并写入本地后，点击“发布到 GitHub Pages”才会上线。\n请保留此窗口；关闭窗口会停止本次启动的服务。`);
  if(openTarget==='publisher')openBrowser(publisherUrl);
  else if(openTarget==='site')openBrowser(previewUrl);
}catch(error){for(const child of children)child.kill();console.error(error.message);process.exitCode=1}
