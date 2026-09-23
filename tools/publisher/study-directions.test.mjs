import {test} from 'node:test';
import assert from 'node:assert/strict';
import {studyDirection,studyDirectionLabel,studyGroups} from '../../src/lib/study.ts';

const entry=(data={},collection='notes')=>({collection,data});
test('unclassified writing and custom series belong to solo while explicit disciplines stay separate',()=>{
  for(const data of [{},{section:'notes'},{series:'数学基础'},{series:'我独自升级',engine:['Unity']}]){
    assert.equal(studyDirection(entry(data)),'solo');assert.equal(studyDirectionLabel(entry(data)),'我独自升级');
  }
  for(const [data,expected]of [[{series:'URP渲染笔记'},'unity'],[{series:'HDRP Lighting'},'unity'],[{category:'Unity'},'unity'],[{engine:['UE5.5']},'ue'],[{series:'UE-角色渲染'},'ue'],[{engine:['Unreal Engine']},'ue'],[{series:'Blender模型笔记'},'blender']])assert.equal(studyDirection(entry(data)),expected);
  for(const article of [entry({section:'work',workType:'single'}),entry({section:'work',workType:'collection'}),entry({},'work'),entry({},'collections')])assert.equal(studyDirection(article),null);
});
test('shared named series have one directory and loose articles cannot swallow a work',()=>{
  const first=entry({series:'灯光练习'}),second=entry({series:'灯光练习',engine:['Unity']}),loose=entry({title:'Perlin'}),work=entry({section:'work'});
  const groups=studyGroups([first,second,loose,work]);
  assert.equal(groups.length,2);assert.equal(groups[0].id,'series-灯光练习');assert.equal(groups[0].direction,'unity');assert.deepEqual(groups[0].items,[first,second]);
  assert.equal(groups[1].id,'study-solo-notes');assert.equal(groups[1].direction,'solo');assert.deepEqual(groups[1].items,[loose]);
});
