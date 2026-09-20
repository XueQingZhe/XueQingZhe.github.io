import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const site=path.resolve(process.env.SITE_ROOT||process.env.PUBLISHER_SITE||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const root=path.join(site,'dist'),port=Number(process.env.SITE_PORT||4325);
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.wasm':'application/wasm','.xml':'application/xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.mp4':'video/mp4','.webm':'video/webm','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.pdf':'application/pdf'};
http.createServer(async(req,res)=>{try{
 if(req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);return res.end()}
const url=new URL(req.url,`http://127.0.0.1:${port}`);let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(req.method==='GET'&&url.pathname==='/api/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({service:'garden-preview',site,root}))}
 if(['/__visual-reference/day.webp','/__visual-reference/night.webp'].includes(url.pathname)){
   const name=path.basename(url.pathname),ref=path.resolve(root,'../../private-publisher/visual-reference',name);
   const data=await fs.readFile(ref).catch(()=>null);if(!data){res.writeHead(404);return res.end()}
   res.writeHead(200,{'Content-Type':'image/webp','Cache-Control':'private, max-age=3600','X-Robots-Tag':'noindex, nofollow'});return res.end(data);
 }
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end()}
 let stat=await fs.stat(file).catch(()=>null);if(stat?.isDirectory()){file=path.join(file,'index.html');stat=await fs.stat(file).catch(()=>null)}
 if(!stat?.isFile()){res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});return res.end(await fs.readFile(path.join(root,'404.html')).catch(()=>Buffer.from('Not found')))}
 const real=await fs.realpath(file);if(!real.startsWith(await fs.realpath(root)+path.sep)){res.writeHead(403);return res.end()}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Accept-Ranges','bytes');
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),stat.size-1):stat.size-1;if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end()}const handle=await fs.open(file);const data=Buffer.alloc(end-start+1);await handle.read(data,0,data.length,start);await handle.close();res.writeHead(206,{'Content-Length':data.length,'Content-Range':`bytes ${start}-${end}/${stat.size}`});return res.end(data)}
 res.setHeader('Content-Length',stat.size);res.writeHead(200);if(req.method==='HEAD')return res.end();res.end(await fs.readFile(file));
}catch{res.writeHead(500);res.end('Local preview error')}}).listen(port,'127.0.0.1',()=>console.log(`网站预览：http://127.0.0.1:${port}`));
