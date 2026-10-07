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

test('older screenshot reply and natural drawing requests resolve to the checked template',()=>{
 for(const question of ['Draw a diagram of snag','Can you draw snag for me?','I want to see the snag play','draw snag again']) assert.equal(exports.snagReferenceIntent(question),'standard');
 assert.equal(exports.snagReferenceIntent('Let me see it', 'Here is a simple Snag sketch, corner, snag and flat.'),'standard');
 assert.equal(exports.snagReferenceIntent('Draw smash','Snag is also available'),null);
 assert.equal(exports.snagReferenceIntent('draw Snag from trips'),'custom');
 const history=[{role:'coach',text:'draw snag from bunch'},{role:'counterscheme',text:'Snag example'},{role:'coach',text:'let me see it'}];
 assert.equal(exports.referenceQuestion('let me see it',history),'draw snag from bunch');
});
test('repeated follow-ups retain Snag intent',()=>{
 assert.equal(resolveSnagRequest('Show it again',[{role:'coach',text:'draw snag'},{role:'counterscheme',text:'diagram'},{role:'coach',text:'let me see it'}]),true);
});
test('server uses canonical Snag geometry without invoking a model, including old clients',async()=>{
 const server={};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/server/ai.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
   exports:server,require:path=>path.includes('snagReference')?exports:path.includes('coachKnowledge')?{COACH_KNOWLEDGE:''}:{REFERENCE_SCHEMA:{}},process:{env:{}},fetch:()=>{throw new Error('Must not call model for Snag');}
 });
 const result=await server.runJob({job:'diagram',input:{question:'Let me see it',answer:'Here is a Snag reference.'}});
 assert.equal(result.referenceConcept,'snag');assert.equal(result.offense.length,11);assert.equal(result.lines.length,3);
 const direct=await server.runJob({job:'diagram',input:{question:'Draw a diagram of snag'}});
 assert.equal(JSON.stringify(result),JSON.stringify(direct));
 const custom=await server.runJob({job:'diagram',input:{question:'draw snag from bunch'}});
 assert.ok(custom.question);assert.equal(custom.lines.length,0);
});

test('exact live conversation: definition, request for diagram, follow-up, punctuated command',()=>{
 const history=[{role:'coach',text:'What is snag?'},{role:'counterscheme',text:'Snag is a quick pass concept.'},{role:'coach',text:'Can you give me a diagram'},{role:'counterscheme',text:'Yes I can sketch Snag.'}];
 assert.equal(resolveSnagRequest('Can you give me a diagram',history.slice(0,2)),true);
 assert.equal(resolveSnagRequest('Let me see it',history),true);
 assert.equal(exports.referenceQuestion('Let me see it',history),'What is snag?');
 assert.equal(exports.snagReferenceIntent('Can you give me a diagram','Yes I can sketch Snag.'),'standard');
 assert.equal(isBasicSnagRequest('create. diagram of snag'),true);
});
