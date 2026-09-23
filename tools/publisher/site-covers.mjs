import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import sharp from 'sharp';
import {parseFragment} from 'parse5';
import {boundedSite} from './site-content.mjs';
import {mediaReferences} from './cover-media.mjs';

const images=new Set(['.png','.jpg','.jpeg','.webp','.avif','.gif','.svg']);
const videos=new Set(['.mp4','.webm','.mov','.m4v']);
const mediaType=value=>images.has(path.posix.extname(value).toLowerCase())?'image':videos.has(path.posix.extname(value).toLowerCase())?'video':null;
const canonical=value=>'/'+decodeURIComponent(value.replace(/^\//,'')).split('/').map(encodeURIComponent).join('/');
const fail=message=>Object.assign(Error(message),{status:400});
export class SiteCovers {
  constructor({site,publisher=null,parseFrontmatter=raw=>({body:raw.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,''),data:{}})}){this.site=site;this.publisher=publisher;this.parseFrontmatter=parseFrontmatter;this.secret=crypto.randomBytes(32);this.files=null;this.scannedAt=0;}
  signature(file,kind='thumbnail'){return crypto.createHmac('sha256',this.secret).update(kind+':'+file).digest('hex');}
  async file(value){
    if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//'))throw Error('网站素材路径无效');
    const relative=decodeURIComponent(value.slice(1));
    if(!mediaType(relative))throw Error('请选择网站图片或视频');
    const file=await boundedSite(this.site,'public/'+relative);
    if(!(await fs.stat(file)).isFile())throw Error('请选择网站素材文件');
    return file;
  }
  async scan(){
    if(this.files&&Date.now()-this.scannedAt<60_000)return this.files;
    const result=[];
    const walk=async dir=>{for(const item of await fs.readdir(dir,{withFileTypes:true})){if(item.name.startsWith('.')||item.isSymbolicLink())continue;const file=path.join(dir,item.name);if(item.isDirectory())await walk(file);else if(item.isFile()&&mediaType(file)){const relative=path.relative(path.join(this.site,'public'),file).replaceAll('\\','/');result.push('/'+relative.split('/').map(encodeURIComponent).join('/'));}}};
    const dir=await boundedSite(this.site,'public');await walk(dir);this.files=result.sort();this.scannedAt=Date.now();return this.files;
  }
  url(value,entry){
    if(typeof value!=='string'||/^(?:[a-z]+:|\/\/)/i.test(value))return null;
    try{const url=new URL(value,'http://publisher'+(entry?.url||'/'));if(url.origin!=='http://publisher')return null;return canonical(url.pathname)}catch{return null}
  }
  entry(key){const matches=entry=>!entry.draft&&!entry.replacedBy&&(entry.key===key||entry.canonicalKey===key||entry.metadata?.replaces===key);return (this.publisher?.siteContent??[]).find(matches)??this.publisher?.topicSources?.().find(matches);}
  async references(entry,all){
    const refs=new Set(),posters=new Map(),available=new Set(all);
    const add=value=>{const target=this.url(value,entry);if(target&&available.has(target)){refs.add(target);return target}return null};
    const cover=add(entry.metadata?.cover),video=add(entry.metadata?.coverVideo);
    if(video&&cover&&images.has(path.posix.extname(cover).toLowerCase()))posters.set(video,cover);
    if(entry.path&&/\.mdx?$/i.test(entry.path)){
      const raw=await fs.readFile(await boundedSite(this.site,entry.path),'utf8'),body=this.parseFrontmatter(raw).body;
      for(const ref of mediaReferences(body))add(ref);
      const walk=node=>{if(node.nodeName==='video'){const attrs=Object.fromEntries((node.attrs??[]).map(attr=>[attr.name,attr.value])),poster=this.url(attrs.poster,entry);const sources=[attrs.src,...(node.childNodes??[]).filter(child=>child.nodeName==='source').flatMap(child=>(child.attrs??[]).filter(attr=>attr.name==='src').map(attr=>attr.value))];for(const value of sources){const video=this.url(value,entry);if(refs.has(video)&&refs.has(poster)&&mediaType(poster)==='image')posters.set(video,poster)}}for(const child of node.childNodes??[])walk(child)};
      walk(parseFragment(body));
    }
    for(const ref of refs)if(videos.has(path.posix.extname(ref).toLowerCase())&&!posters.has(ref)){const poster=ref.replace(/\.[^.]+$/,'-poster.jpg');if(available.has(poster)){posters.set(ref,poster);refs.add(poster)}}
    return {refs,posters};
  }
  async item(value,{posters=new Map(),sources=[]}={}){
    const file=await this.file(value),info=await fs.stat(file),type=mediaType(value),poster=posters.get(value),image=type==='image'?value:poster;
    const preview=new URLSearchParams({file:value,kind:'preview',ticket:this.signature(value,'preview')});
    const thumbnail=image?new URLSearchParams({file:image,ticket:this.signature(image)}):null;
    return {value:poster||value,path:decodeURIComponent(value),name:path.basename(file),type,bytes:info.size,selectable:type==='image'||!!poster,...type==='video'?{coverVideo:value,...!poster?{reason:'此视频还没有静态封面，请先重新生成文章副本，或选择正文图片。'}:{}}:{},thumbnailUrl:thumbnail?'/api/site-cover-preview?'+thumbnail:'',previewUrl:'/api/site-cover-preview?'+preview,sources};
  }
  async list(params){
    const q=(params.get('q')||'').trim().toLocaleLowerCase(),scope=params.get('scope')||'all',offset=Number(params.get('offset')||0),limit=Number(params.get('limit')||24),type=params.get('type')||'image';
    if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>60||q.length>200||!['all','note','members'].includes(scope)||!['all','image','video'].includes(type))throw fail('图片筛选条件无效');
    const all=await this.scan(),used=new Set(),posters=new Map(),sources=new Map();
    const keys=scope==='note'?[params.get('note')]:scope==='members'?params.getAll('member'):[];
    if(scope==='note'&&(!keys[0]||!this.entry(keys[0])))throw fail('请先选择网站中的文章');
    if(keys.length>500||keys.some(key=>!this.entry(key)))throw fail('合集成员已改变，请重新打开合集');
    for(const key of keys){const entry=this.entry(key),refs=await this.references(entry,all);for(const ref of refs.refs){used.add(ref);if(!sources.has(ref))sources.set(ref,[]);sources.get(ref).push({title:entry.title,url:entry.url})}for(const [video,poster] of refs.posters)posters.set(video,poster);}
    // All-assets is explicit. Preserve known video posters there as well.
    if(scope==='all')for(const entry of this.publisher?.siteContent??[])if(!entry.draft&&!entry.replacedBy){const refs=await this.references(entry,all);for(const [video,poster] of refs.posters)posters.set(video,poster);}
    const base=scope==='all'?all:[...used];
    const files=base.filter(file=>(type==='all'||mediaType(file)===type)&&(!q||decodeURIComponent(file).toLocaleLowerCase().includes(q)||(sources.get(file)??[]).some(source=>source.title.toLocaleLowerCase().includes(q))));
    let items;try{items=await Promise.all(files.slice(offset,offset+limit).map(value=>this.item(value,{posters,sources:sources.get(value)??[]})))}catch(error){if(error.code!=='ENOENT'||!this.files)throw error;this.files=null;return this.list(params)}
    for(const item of items)item.referenced=used.has('/'+item.path.slice(1).split('/').map(encodeURIComponent).join('/'));
    const cover=params.get('cover'),entry=params.get('note')?this.entry(params.get('note')):null;
    const currentValue=entry?.metadata?.cover===cover&&entry.metadata.coverVideo?this.url(entry.metadata.coverVideo,entry):cover;
    const current=currentValue?.startsWith('/')?await this.item(currentValue,{posters}).catch(()=>null):null;
    return {items,current,total:files.length,offset,limit,hasMore:offset+limit<files.length,scope,ffmpeg:true};
  }
  async validateSelection(metadata){
    if(!metadata?.coverVideo)return;
    const all=await this.scan();
    for(const entry of this.publisher?.siteContent??[]){
      if(entry.draft||entry.replacedBy)continue;
      const refs=await this.references(entry,all);
      if(refs.posters.get(metadata.coverVideo)===metadata.cover)return;
    }
    throw fail('视频与静态封面不匹配，请从文章素材中重新选择');
  }
  async serve(req,res,url){
    const value=url.searchParams.get('file'),kind=url.searchParams.get('kind')||'thumbnail',ticket=url.searchParams.get('ticket')||'',expected=this.signature(value||'',kind);
    if(!['thumbnail','preview'].includes(kind)||!/^[a-f0-9]{64}$/.test(ticket)||!crypto.timingSafeEqual(Buffer.from(ticket),Buffer.from(expected)))throw Error('素材预览凭证无效');
    const file=await this.file(value);
    if(kind==='preview'&&mediaType(value)==='video'){
      const info=await fs.stat(file),ext=path.extname(file).toLowerCase(),headers={'Content-Type':ext==='.webm'?'video/webm':ext==='.mov'?'video/quicktime':'video/mp4','Accept-Ranges':'bytes','Content-Length':info.size};
      let start=0,end=info.size-1,status=200;
      if(req.headers?.range){const match=req.headers.range.match(/^bytes=(\d*)-(\d*)$/);if(match&&(match[1]||match[2])){if(!match[1])start=Math.max(0,info.size-Number(match[2]));else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}}if(!match||!match[1]&&!match[2]||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}status=206;headers['Content-Length']=end-start+1;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;}
      res.writeHead(status,headers);if(req.method==='HEAD'||!info.size){res.end();return}await pipeline(createReadStream(file,{start,end}),res);return;
    }
    const data=await sharp(file,{animated:false}).resize({width:420,height:280,fit:'inside',withoutEnlargement:true}).webp().toBuffer();
    res.writeHead(200,{'Content-Type':'image/webp','Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);
  }
}
