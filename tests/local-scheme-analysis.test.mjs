import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const ts=createRequire(import.meta.url)('typescript');
function load(name,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../src/lib/${name}.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:k=>imports[k]});return exports;}
const football=load('football'),{localSchemeAnalysis}=load('localSchemeAnalysis',{'./football':football});
const call=()=>({id:'test',name:'Coach front',structureId:'3-4',defOffsets:{},assignments:{}});
test('missing assignments and missing structure never become concerns',()=>{assert.equal(localSchemeAnalysis([call()]).concerns.length,0);assert.equal(localSchemeAnalysis([{...call(),structureId:undefined}]).evaluated.length,0);assert.equal(localSchemeAnalysis([]).concerns.length,0);});
test('off-field saved alignment is supported and input remains intact',()=>{const c=call();c.defOffsets[0]=[-200,0];const before=JSON.stringify(c);const result=localSchemeAnalysis([c]);assert.equal(result.concerns.length,1);assert.match(result.concerns[0].issue,/outside/);assert.equal(result.concerns[0].severity,'potential');assert.equal(JSON.stringify(c),before);});
test('hidden markers are not counted as alignment concerns',()=>{const c=call();c.defOffsets[0]=[-200,0];c.defAppearance={0:{hidden:true}};assert.equal(localSchemeAnalysis([c]).concerns.length,0);});
test('exact overlaps identified without inventing assignment conflicts',()=>{const c=call(),slots=football.getStructure('3-4').slots;c.defOffsets[1]=[slots[0].x-slots[1].x,football.defenseCanvasY(slots[0].y)-football.defenseCanvasY(slots[1].y)];const r=localSchemeAnalysis([c]);assert.ok(r.concerns.some(x=>x.issue.includes('overlap')));assert.ok(r.limits.some(x=>x.includes('Run fits')));});
