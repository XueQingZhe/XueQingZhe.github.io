import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {boundedSite} from './site-content.mjs';

const types=new Set(['.png','.jpg','.jpeg','.webp','.avif','.gif','.svg']);
export class SiteCovers {
  constructor({site}){this.site=site;this.secret=crypto.randomBytes(32);this.files=null;this.scannedAt=0;}
  signature(file){return crypto.createHmac('sha256',this.secret).update(file).digest('hex');}
  async file(value){
    if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//'))throw Error('网站图片路径无效');
    const relative=decodeURIComponent(value.slice(1));
    if(!types.has(path.extname(relative).toLowerCase()))throw Error('请选择网站图片');
    const file=await boundedSite(this.site,'public/'+relative);
    if(!(await fs.stat(file)).isFile())throw Error('请选择网站图片文件');
    return file;
  }
  async scan(){
    if(this.files&&Date.now()-this.scannedAt<60_000)return this.files;
    const result=[];
    const walk=async dir=>{for(const item of await fs.readdir(dir,{withFileTypes:true})){if(item.name.startsWith('.')||item.isSymbolicLink())continue;const file=path.join(dir,item.name);if(item.isDirectory())await walk(file);else if(item.isFile()&&types.has(path.extname(file).toLowerCase())){const relative=path.relative(path.join(this.site,'public'),file).replaceAll('\\','/');result.push('/'+relative.split('/').map(encodeURIComponent).join('/'));}}};
    const dir=await boundedSite(this.site,'public');await walk(dir);this.files=result.sort();this.scannedAt=Date.now();return this.files;
  }
  async item(value){
    const file=await this.file(value),info=await fs.stat(file),params=new URLSearchParams({file:value,ticket:this.signature(value)});
    return {value,path:decodeURIComponent(value),name:path.basename(file),type:'image',bytes:info.size,selectable:true,thumbnailUrl:'/api/site-cover-preview?'+params,previewUrl:'/api/site-cover-preview?'+params};
  }
  async list(params){
    const q=(params.get('q')||'').toLocaleLowerCase(),offset=Number(params.get('offset')||0),limit=Number(params.get('limit')||24);
    if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>60||q.length>200||params.has('type')&&!['all','image','video',''].includes(params.get('type')))throw Error('图片筛选条件无效');
    const all=await this.scan(),files=params.get('type')==='video'?[]:all.filter(file=>!q||decodeURIComponent(file).toLocaleLowerCase().includes(q));
    let items;
    try{items=await Promise.all(files.slice(offset,offset+limit).map(value=>this.item(value)))}catch(error){if(error.code!=='ENOENT'||!this.files)throw error;this.files=null;return this.list(params)}
    const cover=params.get('cover');
    const current=cover?.startsWith('/')?await this.item(cover).catch(()=>null):null;
    return {items,current,total:files.length,offset,limit,hasMore:offset+limit<files.length,ffmpeg:true};
  }
  async serve(req,res,url){
    const value=url.searchParams.get('file'),ticket=url.searchParams.get('ticket')||'',expected=this.signature(value||'');
    if(!/^[a-f0-9]{64}$/.test(ticket)||!crypto.timingSafeEqual(Buffer.from(ticket),Buffer.from(expected)))throw Error('图片预览凭证无效');
    const data=await sharp(await this.file(value),{animated:false}).resize({width:420,height:280,fit:'inside',withoutEnlargement:true}).webp().toBuffer();
    res.writeHead(200,{'Content-Type':'image/webp','Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);
  }
}
