import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const ts=createRequire(import.meta.url)('typescript');
function load(name,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../src/lib/${name}.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,structuredClone,require:k=>imports[k]});return exports;}
const fd=load('fullDefense'),l=load('installLearning',{'./fullDefense':fd});
const call=()=>({id:'a',assignments:{0:'Original coaching words'},defOffsets:{},fullDefense:{structureId:'3-4',duties:{},components:{}}});
const rule={id:'r',text:'N owns A',scope:'general',role:'N',duties:{runFit:'A gap'}};
test('teach, suggest, confirm, persist and reuse preserves original assignments',()=>{const rules=l.addConfirmedRule([],rule),c=call(),before=JSON.stringify(c);const p=l.exactRuleSuggestions(rules,c,['N']);assert.equal(p.assignments.length,1);const next=l.acceptSuggestion(c,fd.defenseRevision(c),p.assignments[0]);assert.equal(JSON.stringify(c),before);assert.match(next.assignments[0],/Original coaching words/);assert.equal(JSON.parse(JSON.stringify(next)).fullDefense.duties[0].runFit,'A gap');assert.equal(l.exactRuleSuggestions(rules,{...call(),id:'b'},['N']).assignments.length,1);});
test('call exceptions stay scoped; duplicate rules not added',()=>{const r={...rule,scope:'call',callId:'a'};assert.equal(l.applicableRules([r],'b').length,0);assert.equal(l.addConfirmedRule([r],{...r,id:'new'}).length,1);});
test('ambiguous roles, hidden players and conflicting rules are left unknown',()=>{assert.equal(l.exactRuleSuggestions([rule],call(),['N','N']).assignments.length,0);assert.equal(l.exactRuleSuggestions([rule],{...call(),defAppearance:{0:{hidden:true}}},['N']).assignments.length,0);assert.equal(l.exactRuleSuggestions([rule,{...rule,id:'x',duties:{runFit:'B gap'}}],call(),['N']).assignments.length,0);});
test('invented rule citations and invalid slots are rejected',()=>{const p={assignments:[{slot:0,duties:{runFit:'A'},why:'Saved rule',ruleIds:['invented']}],unknowns:[]};assert.throws(()=>l.parseInstallProposal(p,['N'],[rule]));p.assignments[0].ruleIds=['r'];p.assignments[0].slot=11;assert.throws(()=>l.parseInstallProposal(p,['N'],[rule]));});
test('diagram edits invalidate suggestions; accepting invalidates old approval',()=>{const c=call(),r=fd.defenseRevision(c),a={slot:0,duties:{runFit:'A'},why:'Rule',ruleIds:['r']};c.fullDefense.approvedRevision=r;assert.equal(fd.approvedDefense(l.acceptSuggestion(c,r,a)),false);c.defOffsets[0]=[3,0];assert.throws(()=>l.acceptSuggestion(c,r,a));});
