import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const ts=createRequire(import.meta.url)('typescript'),cache={};
function load(name){
 if(cache[name])return cache[name];
 const exports={};cache[name]=exports;
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../src/lib/${name}.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,structuredClone,require:p=>load(p.replace('./',''))});return exports;
}
const {renderBlueprint,savedReference}=load('footballBlueprint');
const {referenceBlueprint,catalogReference}=load('referenceCatalog');
const {getStructure,defenseCanvasY}=load('football');
const ends=c=>c.lines.map(l=>{const p=c.offLook.find(p=>`off:${p.id}`===l.anchor);return {label:p?.label,x:p.x+l.points.at(-1)[0],y:p.y+l.points.at(-1)[1]}});
test('common concepts and supported formations compile without clipping or detached routes',()=>{
 for(const name of ['snag','smash','mesh','stick','flood','four verticals','tite','mint','bear','even','snag from trips','snag from bunch','smash from bunch','stick from trips','flood from bunch','snag from trips left','stick left','flood left']){
  const {call}=catalogReference(`draw ${name}`,'3-4'); assert.ok(call,name);assert.equal(call.offLook.length,11,name);
  for(const l of call.lines){assert.equal(JSON.stringify(l.points[0]),'[0,0]');const p=call.offLook.find(p=>`off:${p.id}`===l.anchor);for(const [x,y]of l.points){assert.ok(p.x+x>=2&&p.x+x<=98,name);assert.ok(p.y+y>=2&&p.y+y<=85,name)}}
 }
});
test('Snag stays a same-side three-level triangle from spread, trips and bunch',()=>{
 for(const f of ['',' from trips',' from bunch'])for(const side of ['right','left']){
  const c=catalogReference(`draw snag${f} ${side}`,'3-4').call,e=ends(c),sg=e.find(p=>p.label==='Z'),co=e.find(p=>p.label==='Y'),fl=e.find(p=>p.label!=='Z'&&p.label!=='Y');
  assert.ok(co.y>sg.y&&sg.y>fl.y);assert.ok(side==='right'?fl.x>sg.x:fl.x<sg.x);assert.equal(c.lines[0].arrowStyle,'none');
 }
});
test('techniques anchor to actual guards and tackles regardless of defensive roster structure',()=>{
 for(const id of ['3-4','4-3','4-2-5'])for(const [name,expected]of [['tite',[43.5,50,56.5]],['bear',[44.5,50,55.5]]]){
  const c=catalogReference(`draw ${name}` ,id).call,s=getStructure(id);
  const xs=Object.keys(c.defOffsets).map(i=>s.slots[i].x+c.defOffsets[i][0]);assert.equal(JSON.stringify(xs),JSON.stringify(expected));
  for(const i of Object.keys(c.defOffsets))assert.equal(s.slots[i].y*.45+38+c.defOffsets[i][1],44.2);
 }
});
test('ambiguous custom calls do not silently get the conventional template',()=>{
 for(const q of ['draw our eagle','draw snag against cover 3','draw snag from wing t','draw my mesh','draw tite with a pressure','do not draw snag'])assert.equal(referenceBlueprint(q),null,q);
});
test('saved diagrams are exact matches, copied without mutating source; duplicate names ask',()=>{
 const original=catalogReference('draw bear','3-4').call;original.name='Eagle';
 const copy=savedReference('draw our Eagle',[original]).call;copy.offLook[0].x=3;assert.notEqual(original.offLook[0].x,3);
 assert.equal(savedReference('draw Eagle with a blitz',[original]),null);
 assert.ok(savedReference('draw Eagle',[original,original]).question);
});
test('invalid geometry, duplicates, unknown players and missing knowledge never render',()=>{
 for(const mutate of [b=>b.routes[0].player='NO',b=>b.routes[0].width=100,b=>b.routes[0].depth=NaN,b=>b.routes.push({...b.routes[0]}),b=>b.routes[0].player='C']){
  const b=referenceBlueprint('draw smash');mutate(b);assert.throws(()=>renderBlueprint(b,'3-4'));
 }
 const b=referenceBlueprint('draw tite');b.defenders[0].depth=10;assert.throws(()=>renderBlueprint(b,'3-4'));
 b.question='Which front and blocking rules?';assert.equal(renderBlueprint(b,'3-4').call,null);
});
test('explicit pressure paths and coverage zones attach to the declared defender',()=>{
 const b=referenceBlueprint('draw tite');b.paths=[{side:'def',player:'N',kind:'route',points:[{width:1,depth:-1}],assignment:'Attack right A gap'}];
 b.zones=[{player:'E1',width:-8,depth:5,radiusWidth:4,radiusDepth:2,assignment:'Illustrative hook drop'}];
 const c=renderBlueprint(b,'3-4').call;assert.equal(c.lines[0].anchor,'def:1');assert.equal(c.zones.length,1);assert.match(c.assignments[0],/hook/);
});
test('route labels remain visible and formations never substitute silently across catalog variants',()=>{
 for(const concept of ['snag','smash','mesh','stick','flood','four verticals','tite','bear','even'])for(const formation of ['2x2','trips','bunch','empty'])for(const side of ['left','right']){
  const blueprint=referenceBlueprint(`draw ${concept} from ${formation} ${side}`);
  if(!blueprint)continue;
  const {call}=renderBlueprint(blueprint,'3-4');assert.ok(call.offLook.every(p=>p.showLabel),`${concept} ${formation}`);
 }
});
test('wrong named combination and unsupported tight-end techniques are refused',()=>{
 const b=referenceBlueprint('draw snag from bunch');b.routes[0].route='vertical';assert.throws(()=>renderBlueprint(b,'3-4'),/core route/);
 const f=referenceBlueprint('draw tite');f.defenders[0].technique='9';assert.throws(()=>renderBlueprint(f,'3-4'),/tight end/);
 f.formation='Doubles TE (11)';f.defenders[0].side='right';f.defenders=f.defenders.slice(0,1);assert.ok(renderBlueprint(f,'3-4').call);
});
test('diagram API uses the assignment schema and rejects malformed model geometry',async()=>{
 let response=referenceBlueprint('draw smash'),sent;
 const server={};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/server/ai.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:server,AbortSignal,process:{env:{}},require:p=>p.includes('coachKnowledge')?{COACH_KNOWLEDGE:''}:load(p.split('/').at(-1)),fetch:async(_url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(response)}]}]})}}});
 const good=await server.runJob({job:'diagram',input:{question:'draw a conventional smash variant with the stated assignments'}});assert.equal(good.version,'football-v1');assert.ok(sent.text.format.schema.properties.routes);assert.equal(sent.text.format.schema.properties.lines,undefined);
 response.routes[0].depth=100;
 const bad=await server.runJob({job:'diagram',input:{question:'draw a conventional smash variant with the stated assignments'}});assert.match(bad.question,/couldn’t draw/);assert.equal(renderBlueprint(bad,'3-4').call,null);
 response={...response,question:'What alignments and assignments define your Eagle call?'};
 const unknown=await server.runJob({job:'diagram',input:{question:'draw our Eagle'}});assert.equal(renderBlueprint(unknown,'3-4').call,null);
});
