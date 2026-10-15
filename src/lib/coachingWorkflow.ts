import type { GamePlan, MeetingTopic, Opponent, StaffMeeting, PracticeSelection } from './store';
import type { PracticePool, PracticeRep } from './practice';
import { opponentOverview } from './opponentOverview';
import { decisionText, emptyMeeting } from './meeting';

// Scouting fills evidence only. No defensive decision is generated here.
export function scoutingTopics(o:Opponent): MeetingTopic[] {
  const v=opponentOverview(o);
  const topics: [string,string,string,string][] = [
    ['identity','Offensive Identity',[o.offensiveStyle,o.tempo,v.runRate==null?'':`${v.runRate}% run`].filter(Boolean).join(' · '),'Offensive Identity'],
    ['personnel','Opponent Personnel',o.personnelUsage.map(p=>`${p.group}${p.pct==null?'':` · ${p.pct}%`}`).join('\n'),'Personnel'],
    ['formations','Formations and Tendencies',o.formations.map(f=>`${f.name}${f.snapsPct==null?'':` · ${f.snapsPct}%`}`).join('\n'),'Formations / Checks'],
    ['players','Primary Offensive Threats',v.players.map(p=>`${p.jersey?'#'+p.jersey+' ':''}${p.name} · ${p.pos??''} · ${p.notes??''}`).join('\n'),'Key Players'],
    ['run','Run-game Considerations',v.run?`${v.run.name}: ${v.run.notes??''}`:'','Run Plan'],
    ['pass','Passing-game Considerations',v.pass?`${v.pass.name}: ${v.pass.notes??''}`:'','Pass Plan'],
    ['answers','Defensive Answers','','Defensive Answers'],
    ['situations','Situational Game Planning',[o.redZone,...Object.entries(v.downDistance).flatMap(([down,row])=>Object.entries(row).filter(([,rate])=>rate!=null).map(([distance,rate])=>`${down} ${distance}: ${rate}% run`))].filter(Boolean).join('\n'),'Situational'],
    ['pressures','Pressures and Adjustments','','Pressure Plan'],
    ['practice','Practice Priorities','','Practice Priorities'],
    ['notes','Additional Coaching Notes',o.notes??'','Additional Notes'],
  ];
  return [...topics.map(([id,title,evidence,category])=>({id:`organizer:${id}`,title,category,evidence:evidence||'No scouting information attached. Add notes or work manually.',detail:evidence?'Saved opponent information':'Coach-led planning',section:id,scouting:true})),...v.priorities.map(p=>({...p,id:`${p.section}:${p.title}`,scouting:true}))];
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
