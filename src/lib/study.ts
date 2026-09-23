type StudyEntry={collection?:string;data:{section?:string;kind?:string;workType?:string;series?:string;category?:string;engine?:string[]}};
export const STUDY_DIRECTIONS=[
  {key:'solo',name:'我独自升级',eyebrow:'SOLO LEVELING'},
  {key:'unity',name:'Unity',eyebrow:'REALTIME / UNITY'},
  {key:'ue',name:'UE',eyebrow:'REALTIME / UNREAL'},
  {key:'blender',name:'Blender',eyebrow:'DCC / BLENDER'},
] as const;
export type StudyDirection=typeof STUDY_DIRECTIONS[number]['key'];
const directionPatterns:[StudyDirection,RegExp][]=[
  ['solo',/^我独自升级(?:$|[\s·/_-])/i],
  ['unity',/^(?:unity|urp|hdrp)(?=$|[\s·/_-]|[^a-z0-9])/i],
  ['ue',/^(?:ue(?:\d+(?:\.\d+)?)?|unreal(?:\s+engine)?)(?=$|[\s·/_-]|[^a-z0-9])/i],
  ['blender',/^blender(?=$|[\s·/_-]|[^a-z0-9])/i],
];
const namedDirection=(value:string|undefined)=>directionPatterns.find(([,pattern])=>pattern.test(value?.trim()||''))?.[0];
/** Work keeps its own identity; all other articles belong to one study direction. */
export function studyDirection(entry:StudyEntry):StudyDirection|null {
  const {data}=entry;
  if(data.section==='work'||(!data.section&&(entry.collection==='work'||entry.collection==='collections'||data.kind==='work')))return null;
  return namedDirection(data.series)??namedDirection(data.category)
    ??data.engine?.map(namedDirection).find((direction):direction is StudyDirection=>!!direction)
    ??'solo';
}
export function studyDirectionLabel(entry:StudyEntry):string|null {
  const key=studyDirection(entry);return STUDY_DIRECTIONS.find(direction=>direction.key===key)?.name??null;
}
/** Preserve each named series as one directory; unclassified notes share a direction's loose-note directory. */
export function studyGroups<T extends StudyEntry>(entries:T[]) {
  const grouped=new Map<string,{name:string;direction:StudyDirection;items:T[];loose:boolean}>();
  for(const entry of entries){
    const direction=studyDirection(entry);if(!direction)continue;
    const series=entry.data.series?.trim()||'',key=series?`series:${series}`:`loose:${direction}`;
    let group=grouped.get(key);
    if(!group){group={name:series||`${STUDY_DIRECTIONS.find(item=>item.key===direction)!.name} · 随记`,direction,items:[],loose:!series};grouped.set(key,group);}
    // A series with an engine on only some chapters still belongs to one direction.
    if(group.direction==='solo'&&direction!=='solo'&&!namedDirection(series))group.direction=direction;
    group.items.push(entry);
  }
  return [...grouped.values()].map(group=>({...group,id:group.loose?`study-${group.direction}-notes`:`series-${group.name}`}));
}
