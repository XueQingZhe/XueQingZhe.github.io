import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const url='http://127.0.0.1:4325/';
process.chdir(site);
const run=(script,args=[])=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,[script,...args],{cwd:site,stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`构建失败 (${code})`)))});
const probe=()=>new Promise(resolve=>{const request=http.get(url,response=>{let body='';response.setEncoding('utf8');response.on('data',data=>body+=data);response.on('end',()=>resolve(body.includes('吟处雪轻遮')?'site':'occupied'))});request.setTimeout(1500,()=>request.destroy());request.on('error',()=>resolve('free'))});
const open=()=>spawn('cmd.exe',['/d','/c','start','',url],{windowsHide:true,stdio:'ignore'});
try{
 if(!await fs.stat(path.join(site,'dist/index.html')).catch(()=>null)){await run('node_modules/astro/astro.js',['build','--force']);await run('node_modules/pagefind/lib/runner/bin.cjs',['--site','dist'])}
 const state=await probe();
 if(state==='occupied')throw new Error('4325 端口已被其他服务占用，请先关闭该服务。');
 if(state==='site'){console.log(`新版预览已在运行：${url}`);open()}
 else{const server=spawn(process.execPath,['tools/preview.mjs'],{cwd:site,env:{...process.env,SITE_PORT:'4325'},stdio:['ignore','pipe','inherit'],windowsHide:true});let opened=false;server.stdout.on('data',chunk=>{process.stdout.write(chunk);if(!opened&&chunk.toString().includes('4325')){opened=true;open();console.log('保持此窗口开启即可持续预览。关闭窗口可停止本次服务。')}});server.once('error',e=>console.error(e));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.kill();process.exit()})}
}catch(error){console.error(error.message);process.exitCode=1}
