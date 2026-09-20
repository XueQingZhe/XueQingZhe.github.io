import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
/** Obsidian accepts same-line $$ blocks. Normalize delimiters, never formula content. */
export function normalizeDisplayMath(source){
 const protectedRanges=[];visit(unified().use(remarkParse).parse(source),node=>{if(['code','inlineCode'].includes(node.type)&&node.position){const a=node.position.start.offset,b=node.position.end.offset;protectedRanges.push([a,b,node.type==='inlineCode'||/^(?:`{3,}|~{3,})/.test(source.slice(a,b).trimStart())])}});
 const front=source.match(/^---\r?\n[\s\S]*?\r?\n---/);if(front)protectedRanges.push([0,front[0].length,true]);
 let opening=true;
 return source.replace(/(?<!\\)\$\$/g,(match,offset)=>{if(protectedRanges.some(([a,b,hard])=>offset>=a&&offset<b&&(hard||opening)))return match;const text=opening?'\n\n$$\n':'\n$$\n\n';opening=!opening;return text});
}
