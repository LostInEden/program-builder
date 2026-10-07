import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const ts=createRequire(import.meta.url)('typescript'), exports={};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/snagReference.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>({getStructure:()=>({slots:Array(11).fill({})}),LOS_Y:42,YD:2.2})});
const {isBasicSnagRequest,resolveSnagRequest,snagReference}=exports;
test('draw snag routes locally while customized requests are not silently substituted',()=>{
 for(const text of ['draw snag','Can you draw snag?','show me the snag concept','please draw a basic snag']) assert.ok(isBasicSnagRequest(text),text);
 for(const text of ['draw our snag','draw snag from bunch','draw snag versus Cover 3','do not draw snag','draw smash']) assert.equal(isBasicSnagRequest(text),false,text);
});
test('let me see it follows the current Snag topic, not older unrelated history',()=>{
 assert.equal(resolveSnagRequest('Let me see it',[{role:'coach',text:'draw snag'},{role:'counterscheme',text:'Snag explanation'}]),true);
 assert.equal(resolveSnagRequest('Let me see it',[{role:'coach',text:'draw snag'},{role:'coach',text:'draw smash'}]),false);
});
test('Snag has 11 offensive players, no assumed defense, and the three correct routes',()=>{
 const c=snagReference('test');assert.equal(c.offLook.length,11);assert.ok(Object.values(c.defAppearance).every(p=>p.hidden));assert.equal(c.lines.length,3);
 const ends=Object.fromEntries(c.lines.map(l=>{const p=c.offLook.find(p=>'off:'+p.id===l.anchor), end=l.points.at(-1);assert.equal(JSON.stringify(l.points[0]),'[0,0]');return[p.id,[p.x+end[0],p.y+end[1]]]}));
 assert.equal(ends.z[1],42+5*2.2);assert.ok(ends.z[0]<91);assert.equal(c.lines[0].arrowStyle,'none');
 assert.ok(ends.y[0]>72 && ends.y[1]>ends.z[1]);assert.ok(ends.b[0]>58 && ends.b[1]<ends.z[1]);
 assert.equal(c.schemeConceptId,undefined);
});
