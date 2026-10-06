import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const ts = createRequire(import.meta.url)('typescript');
const exports = {};
const slots = [{ x:50,y:20 },{ x:60,y:30 }];
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/referenceDiagram.ts', import.meta.url),'utf8'), {compilerOptions:{ module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022 }}).outputText, {exports, require:()=>({getStructure:()=>({slots}),defenseCanvasY:y=>38+y*.45})});
const { parseReference } = exports;
const example = () => ({title:'Example', explanation:'Reference only', assumptions:'Illustrative route', question:'', offense:[{label:'X',x:10,y:40}], defense:[{slot:0,label:'M',x:50,y:50}], lines:[{side:'off',player:0,kind:'route',points:[{x:10,y:40},{x:10,y:60},{x:25,y:65}]}]});
test('normalizes absolute model paths into anchored canvas coordinates',()=>{
 const result=parseReference(example(),'test');
 assert.equal(JSON.stringify(result.call.lines[0].points),'[[0,0],[0,20],[15,25]]');
 assert.equal(result.call.defOffsets[0][1],3);
 assert.equal(result.call.defAppearance[1].hidden,true);
 assert.equal(result.call.schemeConceptId,undefined);
});
test('missing knowledge returns a question, never a fabricated diagram',()=>{
 const result=parseReference({...example(),question:'Which gap does Mike fit?'},'test');
 assert.equal(result.call,null);
 assert.match(result.question,/Mike/);
});
test('rejects invalid coordinates, nonexistent anchors and detached paths',()=>{
 for(const mutate of [v=>v.offense[0].x=NaN,v=>v.defense[0].slot=99,v=>v.lines[0].player=9,v=>v.lines[0].points[0].x=60,v=>v.offense[0].label='TOO LONG']){
   const v=example();mutate(v);assert.throws(()=>parseReference(v,'test'));
 }
});
test('rejects excessive objects and duplicate defensive slots',()=>{
 const v=example();v.defense.push({...v.defense[0]});assert.throws(()=>parseReference(v,'test'));
 const big=example();big.offense=Array(12).fill(big.offense[0]);assert.throws(()=>parseReference(big,'test'));
});
