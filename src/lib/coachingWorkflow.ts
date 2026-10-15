import type { GamePlan, MeetingTopic, Opponent, StaffMeeting, PracticeSelection } from './store';
import type { PracticePool, PracticeRep } from './practice';
import { opponentOverview } from './opponentOverview';
import { decisionText, emptyMeeting } from './meeting';

export const GAME_PLAN_SECTIONS = [
 {id:'players',title:'Key Personnel',category:'Key Players',focus:'Identify their best players, understand how they use them, and determine how to limit them.'},
 {id:'identity',title:'Offensive Identity & Tendencies',category:'Offensive Identity',focus:'Identify primary run/pass concepts, formations, personnel and situational tendencies. Look for indicators that reveal the play.'},
 {id:'packages',title:'Personnel & Defensive Packages',category:'Personnel',focus:'Match our personnel against theirs. Choose packages for each grouping and identify matchup advantages and weaknesses.'},
 {id:'threats',title:'Primary Threats & Concerns',category:'Coaching Points',focus:'Identify what they do best, where they stress our defense, and potential personnel or scheme weaknesses.'},
 {id:'answers',title:'Defensive Game Plan',category:'Defensive Answers',focus:'Run Defense · Alignments · Calls · Pass Defense · Soundness: establish the answers and check every responsibility.'},
 {id:'situations',title:'Situational Game Plan',category:'Situational',focus:'Early downs, third downs, red zone, goal line, short yardage, special situations and anticipated adjustments.'},
 {id:'practice',title:'Practice & Contingencies',category:'Practice Priorities',focus:'Choose the most important looks to practice, prepare scripts and diagrams, and establish adjustments and Plan B.'},
] as const;
// These are the coach's planning sequence, not a ranking of offensive plays.
export function scoutingTopics(o:Opponent): MeetingTopic[] {
 const v=opponentOverview(o);
 const evidence:Record<string,string>={
  players:v.players.map(p=>`${p.jersey?'#'+p.jersey+' ':''}${p.name} · ${p.pos??''} · ${p.notes??''}`).join('\n'),
  identity:[o.offensiveStyle,o.tempo,v.runRate==null?'':`${v.runRate}% run`,v.run?`Primary run: ${v.run.name}`:'',v.pass?`Primary pass: ${v.pass.name}`:'',...o.personnelUsage.map(p=>`${p.group}${p.pct==null?'':` · ${p.pct}%`}`),...o.formations.map(f=>f.name)].filter(Boolean).join('\n'),
  packages:'Review our current personnel and installed system above. Package selections remain your decision.',
  threats:v.priorities.map(p=>`${p.title}: ${p.evidence}`).join('\n'),
  answers:'Use your installed calls and saved responsibilities. Missing fits, coverage rules or checks need review before approval.',
  situations:[o.redZone,...Object.entries(v.downDistance).flatMap(([down,row])=>Object.entries(row).filter(([,rate])=>rate!=null).map(([distance,rate])=>`${down} ${distance}: ${rate}% run`))].filter(Boolean).join('\n'),
  practice:'Choose practice looks from your approved answers. Record contingency triggers and Plan B before taking the plan to the field.',
 };
 return GAME_PLAN_SECTIONS.map(x=>({id:`workflow:${x.id}`,title:x.title,category:x.category,detail:x.focus,evidence:evidence[x.id]||'No scouting information saved yet. Add what you know or work with your staff.',section:x.id,scouting:true}));
}
export function workflowTopics(m:StaffMeeting):MeetingTopic[]{
 const all=orderedTopics(m);
 return GAME_PLAN_SECTIONS.flatMap(s=>{const t=all.find(t=>t.id===`workflow:${s.id}`);return t?[t]:[];});
}
export function initializeMeeting(o:Opponent,previous?:StaffMeeting): StaffMeeting {
  const m=previous??emptyMeeting(), fresh=scoutingTopics(o), known=new Set(m.topics?.map(p=>p.id));
  return {...m,topics:[...(m.topics??[]),...fresh.filter(p=>!known.has(p.id))],scoutingUpdatedAt:m.scoutingUpdatedAt??Date.now()};
}
export function refreshScouting(o:Opponent,m:StaffMeeting): StaffMeeting {
  const fresh=scoutingTopics(o),byId=new Map(fresh.map(p=>[p.id,p]));
  return {...m,scoutingUpdatedAt:Date.now(),topics:[...(m.topics??[]).map(p=>p.scouting&&byId.has(p.id)?byId.get(p.id)!:p),...fresh.filter(p=>!m.topics?.some(old=>old.id===p.id))]};
}
export function orderedTopics(m:StaffMeeting): MeetingTopic[] {
  const topics=[...(m.topics??[])];
  for(const d of m.decisions) if(!topics.some(p=>p.id===d.id)) topics.push({id:d.id,title:d.title,evidence:d.evidence,playIds:d.playIds,detail:'Saved decision',section:'plays',category:d.category});
  const order=m.order??[];
  return topics.filter(p=>!m.hidden?.includes(p.id)).sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?order.length:ai)-(bi<0?order.length:bi);});
}
export function moveTopic(m:StaffMeeting,id:string,direction:-1|1): StaffMeeting {
  const order=orderedTopics(m).map(p=>p.id),i=order.indexOf(id),j=i+direction;
  if(i<0||j<0||j>=order.length)return m;
  [order[i],order[j]]=[order[j],order[i]];return {...m,order};
}
// Views of current approved decisions; drafts never enter the practice answers.
export function connectPractice(pool:PracticePool,selection:PracticeSelection,plan?:GamePlan):PracticePool {
  const decisions=plan?.meeting?.decisions??[];
  const manual=(selection.manual??[]).map(p=>{
    const d=decisions.find(d=>d.id===p.decisionId);
    return {id:p.id,kind:'look',personnel:p.personnel,formation:p.formation,formationMeaning:'',backfield:'',play:p.play,playMeaning:'',direction:'',hash:'',motion:'',situation:p.situation,downDistance:'',playIds:[],stats:{n:0,runRate:null,avgGain:null,successRate:null,explosive:0,explosiveRate:null,tds:0},why:'Coach-entered practice look',note:p.note,answer:d?decisionText(d):null,hasAnswer:!!d,conceptIds:[],score:0,scoreParts:{frequency:0,success:0,stress:0},flags:['Coach added'],recommended:true} satisfies PracticeRep;
  });
  const reps=[...pool.reps,...manual].map(r=>{
    const approved=decisions.filter(d=>d.playIds.some(id=>r.playIds.includes(id)));
    const patched={...r,...selection.repEdits?.[r.id],id:r.id};
    if((plan?.meeting || !plan) && !manual.some(p=>p.id===r.id)) return {...patched,answer:approved.length?approved.map(d=>decisionText(d)).join(' | '):null,hasAnswer:approved.length>0};
    return patched;
  });
  return {...pool,reps};
}

// Explicit coach action only. Existing looks and their edits are never replaced.
export function practiceFromDecision(selection:PracticeSelection|undefined,plan:GamePlan|undefined,decisionId:string,look:{id:string;play:string;formation:string;situation:string}):Partial<PracticeSelection>|null {
  if(!look.play.trim() || !plan?.meeting?.decisions.some(d=>d.id===decisionId) || selection?.manual?.some(r=>r.decisionId===decisionId)) return null;
  return {manual:[...(selection?.manual??[]),{...look,play:look.play.trim(),formation:look.formation.trim(),situation:look.situation.trim(),personnel:'',note:'',decisionId}],included:[...new Set([...(selection?.included??[]),look.id])]};
}

export const SECTION_PROMPTS:Record<string,string[]>={
 players:['Best players & how they use them','How we limit them'],
 identity:['Primary run & pass concepts','Formations, personnel & tendencies','Indicators to watch'],
 packages:['Personnel matchups','Packages by offensive personnel','Advantages & weaknesses'],
 threats:['What we must take away','Where they stress our defense','Personnel & scheme concerns'],
 answers:['Run Defense','Alignments','Calls','Pass Defense','Soundness'],
 situations:['Early downs & third downs','Red zone, goal line & short yardage','Special situations & anticipated adjustments'],
 practice:['Priority plays & practice looks','Teaching points & diagrams','Adjustments & Plan B'],
};
