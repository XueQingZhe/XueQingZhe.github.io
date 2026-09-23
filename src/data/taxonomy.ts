/* ---------------------------------------------------------------------------
 * 统一词表
 *
 * 老站上有三套互不相通的标签体系（博客的 display_tags、projects.md 里硬编码的
 * display_categories、20KB 手写的 tagsFilters.md），所以「按技术栈找东西」做不到。
 * 这里是唯一的一套，work / notes 共用，过滤器和搜索索引都从这里生成。
 *
 * 加新标签就往下加一行。label 是显示名，key 是写在 frontmatter 里的值。
 * ------------------------------------------------------------------------- */

export type Facet = "engine" | "tech" | "role";

export interface Term {
  key: string;
  label: string;
}

export const TAXONOMY: Record<Facet, Term[]> = {
  engine: [
    { key: "Unity", label: "Unity" },
    { key: "URP", label: "URP" },
    { key: "UE5", label: "Unreal 5" },
    { key: "Blender", label: "Blender" },
  ],
  tech: [
    { key: "NPR", label: "NPR" },
    { key: "Shader", label: "Shader" },
    { key: "HLSL", label: "HLSL" },
    { key: "Compute", label: "Compute Shader" },
    { key: "Raymarching", label: "Raymarching" },
    { key: "PostProcess", label: "后处理" },
    { key: "RenderFeature", label: "RenderFeature" },
    { key: "Outline", label: "描边" },
    { key: "SDF", label: "SDF" },
    { key: "TAA", label: "TAA" },
  ],
  role: [
    { key: "Shader", label: "Shader" },
    { key: "Tooling", label: "工具" },
    { key: "Art", label: "美术" },
    { key: "Pipeline", label: "管线" },
  ],
};

export const FACET_LABEL: Record<Facet, string> = {
  engine: "引擎",
  tech: "技术",
  role: "角色",
};

/** frontmatter 里写的 key → 显示用的 label；词表里没有就原样显示。 */
export function labelOf(facet: Facet, key: string): string {
  return TAXONOMY[facet].find((t) => termIdentity(t.key) === termIdentity(key))?.label ?? key;
}

export function termIdentity(value:string) { return value.trim().toLowerCase(); }

/** One spelling and one count per document, including terms outside the vocabulary. */
export function normalizeFacetValues(facet:Facet, values:string[], vocabulary:string[]=[]):string[] {
  const spellings=new Map(TAXONOMY[facet].map(term=>[termIdentity(term.key),term.key]));
  for(const value of [...vocabulary,...values].map(value=>value.trim()).filter(Boolean).sort()){
    const key=termIdentity(value);if(!spellings.has(key))spellings.set(key,value);
  }
  return [...new Set(values.map(termIdentity).filter(Boolean))].map(key=>spellings.get(key)!);
}
