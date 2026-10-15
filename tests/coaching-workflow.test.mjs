import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const ts=createRequire(import.meta.url)('typescript');
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../src/lib/${file}.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{if(!(name in deps))throw Error(name);return deps[name];}});return exports;}
const meeting=load('meeting');
const workflow=load('coachingWorkflow',{'./meeting':meeting,'./opponentOverview':{opponentOverview:o=>({runRate:60,players:[],downDistance:{},priorities:[],run:null,pass:null})}});
const opponent={id:'o',offensiveStyle:'Spread',tempo:'Fast',personnelUsage:[],formations:[],notes:'Scout notes'};
const selection={included:[],excluded:[],order:[],days:{}};
const decision={...meeting.blankAnswer(),id:'d',title:'Counter',evidence:'Observed',playIds:['p'],call:'Eagle',approvedAt:1,diagrams:[{id:'art',structureId:'s',call:{name:'Eagle',lines:[]}}]};
const roundtrip=x=>JSON.parse(JSON.stringify(x));
test('new organizer contains scouting but no strategic answers',()=>{const m=workflow.initializeMeeting(opponent);assert.equal(m.topics.length,7);assert.equal(m.decisions.length,0);assert.equal(Object.keys(m.drafts).length,0);assert.match(m.topics[1].evidence,/Spread/);assert.equal(meeting.decisionText(meeting.blankAnswer()),'');});
test('refresh and reload preserve decisions, drafts, attachments, questions and discussion',()=>{const m={...workflow.initializeMeeting(opponent),decisions:[decision],drafts:{d:{...decision,call:'Different suggestion'}},notes:{d:'Coach note'},questions:{d:'Who replaces?'},conversations:{d:[{role:'coach',text:'Keep Eagle'}]},hidden:['workflow:answers'],order:['workflow:identity']};const next=roundtrip(workflow.refreshScouting({...opponent,notes:'Updated scout'},m));for(const key of ['decisions','drafts','notes','questions','conversations','hidden','order'])assert.deepEqual(next[key],roundtrip(m[key]));assert.match(next.topics.find(t=>t.id==='workflow:identity').evidence,/Spread/);assert.equal(workflow.orderedTopics(next)[0].id,'workflow:identity');assert.ok(!workflow.orderedTopics(next).some(t=>t.id==='workflow:answers'));});
test('reordering and repeated initialization retain existing work',()=>{const m=workflow.initializeMeeting(opponent);const moved=workflow.moveTopic(m,m.topics[1].id,-1);assert.equal(workflow.orderedTopics(moved)[0].id,m.topics[1].id);assert.equal(workflow.initializeMeeting(opponent,moved).topics.length,m.topics.length);assert.equal(m.topics[0].id,'workflow:players');});
test('only explicit approval supplies practice answers; drafts never replace approved calls',()=>{const pool={reps:[{id:'r',playIds:['p'],answer:'Automatic suggestion',hasAnswer:true}]};assert.equal(workflow.connectPractice(pool,selection).reps[0].answer,null);let m={...meeting.emptyMeeting(),drafts:{d:decision}};let plan={meeting:m};assert.equal(workflow.connectPractice(pool,selection,plan).reps[0].answer,null);m=meeting.approveDecision(m,decision);plan={meeting:{...m,drafts:{d:{...decision,call:'Wrong draft'}}}};assert.match(workflow.connectPractice(pool,selection,plan).reps[0].answer,/Eagle/);assert.doesNotMatch(workflow.connectPractice(pool,selection,plan).reps[0].answer,/Wrong/);assert.equal(Object.keys(m.drafts).length,0);assert.equal(workflow.connectPractice(pool,selection,{meeting:{...m,decisions:[]}}).reps[0].answer,null);});
test('manual practice works with no snaps, retains edits and uses a linked approved decision',()=>{const sel={...selection,manual:[{id:'manual:m',play:'Counter',formation:'Trips',personnel:'11',situation:'Third and short',note:'Walk through',decisionId:'d'}],repEdits:{'manual:m':{formation:'Bunch'}},repetitions:{'manual:m':4},schedule:{Mon:{label:'Install',tempo:'Walk',purpose:'Fit review'}}};const pool=workflow.connectPractice({reps:[]},roundtrip(sel),{meeting:{...meeting.emptyMeeting(),decisions:[decision]}});assert.equal(pool.reps.length,1);assert.equal(pool.reps[0].stats.n,0);assert.equal(pool.reps[0].stats.runRate,null);assert.equal(pool.reps[0].formation,'Bunch');assert.match(pool.reps[0].answer,/Eagle/);assert.equal(sel.manual[0].formation,'Trips');});
const {concise}=load('ai/concise');
test('short answers preserve decimal values and keep full detail available',()=>{const text='Set a 2.5 yard split. Check the release. Keep leverage. Explain the replacement.';const result=concise(text,'What should we do?');assert.equal(result.text,'Set a 2.5 yard split. Check the release. Keep leverage.');assert.equal(result.deeper,text);assert.equal(concise(text,'Explain further').text,text);});

test('practice handoff requires approval, preserves existing work and refuses duplicate clicks',()=>{
 const look={id:'manual:new',play:' Counter ',formation:' Trips ',situation:'Short yardage'};
 const plan={meeting:{...meeting.emptyMeeting(),decisions:[decision]}};
 assert.equal(workflow.practiceFromDecision(undefined,undefined,'d',look),null);
 assert.equal(workflow.practiceFromDecision(undefined,plan,'d',{...look,play:' '}),null);
 const before={...selection,manual:[{id:'old',play:'Mesh'}],included:['old'],notes:'Preserve notes'};
 const patch=workflow.practiceFromDecision(before,plan,'d',look);
 assert.equal(patch.manual[1].play,'Counter');assert.equal(patch.manual[1].decisionId,'d');
 assert.equal(patch.manual[0].id,'old');assert.deepEqual(Array.from(patch.included),['old','manual:new']);
 assert.equal(workflow.practiceFromDecision({...before,...patch},plan,'d',look),null);
 assert.equal(before.manual.length,1);assert.equal(before.notes,'Preserve notes');
});

test('exact seven-section progression supersedes old ranking without deleting earlier work',()=>{
 const old={...meeting.emptyMeeting(),topics:[{id:'plays:Wide Zone',title:'Wide Zone',section:'plays',evidence:'48 snaps',detail:'Run concept'}],order:['plays:Wide Zone'],notes:{'plays:Wide Zone':'Keep'},decisions:[decision]};
 const m=workflow.initializeMeeting(opponent,old);
 assert.deepEqual(Array.from(workflow.workflowTopics(m),t=>t.title),['Key Personnel','Offensive Identity & Tendencies','Personnel & Defensive Packages','Primary Threats & Concerns','Defensive Game Plan','Situational Game Plan','Practice & Contingencies']);
 assert.equal(m.topics.length,8);assert.equal(m.notes['plays:Wide Zone'],'Keep');assert.equal(m.decisions[0],decision);
 assert.equal(workflow.initializeMeeting(opponent,m).topics.length,8);
});
test('section answers carry into approved decision text and practice without inventing calls',()=>{
 const answer={...decision,call:'',responses:{'Run Defense':'Fit Counter with our Eagle rules','Soundness':'Confirm force replacement'}};
 assert.match(meeting.decisionText(answer),/Run Defense: Fit Counter/);
 const pool=workflow.connectPractice({reps:[{id:'r',playIds:['p']}]},selection,{meeting:{...meeting.emptyMeeting(),decisions:[answer]}});
 assert.match(pool.reps[0].answer,/Confirm force replacement/);
 assert.doesNotMatch(pool.reps[0].answer,/Call:/);
});
