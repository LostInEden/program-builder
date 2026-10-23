import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const ts=createRequire(import.meta.url)('typescript');
function load(name,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../src/lib/${name}.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:k=>imports[k]});return exports;}
const tendencies=load('tendencies',{'@/lib/store':{},'@/lib/knowledge':{}});
const scout=load('livingScout',{'./tendencies':tendencies});
const opponent=()=>({id:'o',plays:[],keyPlayers:[],formations:[],concepts:[],personnelUsage:[],matchupNotes:[],notes:'Original notes',redZone:'',runRate:null,firstDownRun:null});
const snap=(type='Run')=>({id:'legacy',num:'1',playType:type,play:'Counter',formation:'Trey',personnel:'11',motion:'',player:'',down:1,distance:10,hash:'',yardLine:'',backfield:'',strength:'',direction:'',result:'',gain:null,extra:{}});
const source=(id)=>({id,name:id,game:id,fingerprint:id,createdAt:1});
test('two games append and preserve saved notes, diagrams, concepts and assignments',()=>{let o={...opponent(),plays:[snap()],concepts:[{id:'c',name:'Coach concept',notes:'Correction'}],diagrams:[{id:'d'}]};const original=JSON.stringify(o);const patch=scout.appendScoutImport(o,[snap()],source('game1'));assert.equal(patch.plays.length,2);assert.equal(JSON.stringify(o),original);o={...o,...patch};o={...o,...scout.appendScoutImport(o,[snap('Pass')],source('game2'))};assert.equal(o.plays.length,3);assert.ok(JSON.stringify(scout.cumulativeScout(o)).includes("67% run"));assert.equal(o.notes,'Original notes');assert.equal(o.concepts[0].notes,'Correction');assert.equal(o.diagrams[0].id,'d');});
test('same source cannot inflate counts; same snap in different games remains',()=>{const o={...opponent(),...scout.appendScoutImport(opponent(),[snap()],source('a'))};assert.throws(()=>scout.appendScoutImport(o,[snap()],source('a')),/already/);assert.equal(scout.appendScoutImport(o,[snap()],source('b')).plays.length,2);});
test('corrections retain originals but superseded observation leaves active report',()=>{const o={...opponent(),scoutObservations:[{id:'a',text:'Old observation',source:'film'},{id:'b',text:'Corrected observation',replaces:'a',source:'film'}]};assert.equal(scout.activeObservations(o).length,1);const text=JSON.stringify(scout.cumulativeScout(o));assert.ok(text.includes('Corrected observation'));assert.ok(!text.includes('Old observation'));assert.equal(o.scoutObservations.length,2);});
test('model organization cannot introduce words or lose unclassified source text',()=>{assert.throws(()=>scout.validateOrganization({items:[{section:'Key Personnel',quote:'invented'}]},'Actual evidence'));const organized=scout.validateOrganization({items:[{section:'Key Personnel',quote:'QB runs.'}]},'QB runs. More unknown detail.');const report=scout.cumulativeScout({...opponent(),scoutObservations:[{id:'a',source:'film',text:'QB runs. More unknown detail.',organized}]});assert.ok(JSON.stringify(report).includes('More unknown detail.'));});
test('unknown play types excluded, limited sample disclosed, expanded sections maintained',()=>{const report=scout.cumulativeScout({...opponent(),plays:[snap(),snap('')]});assert.equal(report.length,11);assert.ok(JSON.stringify(report).includes('100% run / 0% pass'));assert.ok(JSON.stringify(report).includes('limited sample'));assert.ok(!JSON.stringify(report).includes('50% run'));});
test('recent change requires dated sufficient samples',()=>{const sources=[{...source('a'),gameDate:'2026-09-01'},{...source('b'),gameDate:'2026-09-08'}];const o={...opponent(),scoutSources:sources,plays:[...Array.from({length:20},(_,i)=>({...snap(),id:`a${i}`,scoutSourceId:'a'})),...Array.from({length:20},(_,i)=>({...snap('Pass'),id:`b${i}`,scoutSourceId:'b'}))]};assert.ok(JSON.stringify(scout.cumulativeScout(o)).includes('-100 percentage points'));assert.ok(!JSON.stringify(scout.cumulativeScout({...o,plays:o.plays.slice(0,21)})).includes('percentage points'));});
test('scout handoff preserves approved decisions, drafts, and existing topics',()=>{const m={decisions:[{id:'approved'}],drafts:{keep:{call:'Okie'}},conversations:{},topics:[{id:'existing'}]};const i={id:'formation:Trey',title:'Trey',detail:'8 tagged snaps',playIds:['p1']};const next=scout.scoutTopic(m,i);assert.equal(next.decisions[0].id,'approved');assert.equal(next.drafts.keep.call,'Okie');assert.equal(next.topics.length,2);assert.equal(scout.scoutTopic(next,i).topics.length,2);});

test('run/pass menus separate identical concept names and retain contextual tags',()=>{
 const run={...snap(),id:'r',player:'#3',direction:'Left',gain:8};
 const pass={...snap('Pass'),id:'p',player:'#9',gain:4};
 const o={...opponent(),plays:[run,pass],concepts:[]};
 const before=JSON.stringify(o),report=scout.cumulativeScout(o);
 const r=report.find(s=>s.title==='Run Game').items[0],p=report.find(s=>s.title==='Pass Game').items[0];
 assert.ok(r.detail.includes('#3'));assert.ok(r.detail.includes('LEFT'));assert.ok(r.detail.includes('8.0 yards/play'));
 assert.deepEqual(Array.from(p.playIds),['p']);assert.equal(JSON.stringify(o),before);
});
test('defense and special teams keep explicit observations without inventing missing information',()=>{
 const observations=[['Opponent Defense','Odd front with edge pressure.'],['Special Teams','Punter #9.'],['Film Updates & Verification','Left guard number uncertain.']].map(([section,text],i)=>({id:String(i),text,source:'film',organized:[{section,quote:text}]}));
 const report=scout.cumulativeScout({...opponent(),scoutObservations:observations});
 for(const e of observations)assert.equal(report.find(s=>s.title===e.organized[0].section).items[0].title,e.text);
 assert.equal(scout.cumulativeScout(opponent()).find(s=>s.title==='Opponent Defense').items.length,0);
});
