import { visit } from 'unist-util-visit';
export function remarkObsidian() {
  return tree => {
    visit(tree, node=>{
      if(node.type==='math'||node.type==='inlineMath')node.value=node.value.replace(/\u200b/g,'');
      if(node.type==='inlineMath'&&/\\begin\{(?:equation|align|gather)/.test(node.value)){
        node.data={...node.data,hName:'div',hProperties:{className:['math','math-display']},hChildren:[{type:'text',value:node.value}]};
      }
    });
    visit(tree, 'blockquote', node => {
      const first = node.children[0];
      if (first?.type !== 'paragraph' || first.children[0]?.type !== 'text') return;
      const value = first.children[0].value;
      const m = value.match(/^\[!([\w-]+)\]([+-])?([^\n]*)(?:\n|$)/);
      if (!m) return;
      const title = m[3].trim() || ({note:'笔记',tip:'提示',warning:'注意',danger:'警告',info:'说明',example:'示例',quote:'引用'}[m[1].toLowerCase()] || m[1]);
      first.children[0].value = value.slice(m[0].length);
      node.data = { hName: m[2] ? 'details' : 'aside', hProperties: { className: ['callout'], ...(m[2] === '+' ? {open:true} : {}) } };
      const heading = { type:'paragraph', children:[{type:'text',value:title}], data:{ hName:m[2]?'summary':'div', hProperties:{className:['callout-title']} } };
      if (!first.children.some(n=>n.value || n.type!=='text')) node.children.shift();
      node.children.unshift(heading);
    });
    const ids = new Map();
    visit(tree, 'paragraph', node => {
      const last = node.children.at(-1); if (last?.type !== 'text') return;
      const m = last.value.match(/\s+\^([\w-]+)\s*$/); if (!m) return;
      last.value = last.value.slice(0,m.index); const id='block-'+m[1], count=ids.get(id)||0;ids.set(id,count+1);
      node.data={...node.data,hProperties:{...node.data?.hProperties,id:count?id+'-'+count:id}};
    });
  };
}
