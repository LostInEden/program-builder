import {computeTells,tellSentence,situationOf,situationLabel} from './tendencies';
import type { Opponent, Play, StaffMeeting } from './store';

export const SCOUT_SECTIONS = ['Offensive Identity','Key Personnel','Formations & Personnel','Run & Pass Concepts','Situational Tendencies','Key Takeaways'] as const;
export type ScoutSection = typeof SCOUT_SECTIONS[number];
export type ScoutSource = {id:string; name:string; game?:string; gameDate?:string; fingerprint:string; createdAt:number; sheet?:{name:string;headers:string[];rows:Record<string,string>[]}; mapping?:Record<string,string|null|undefined>};
export type ScoutObservation = {id:string; text:string; source:string; createdAt:number; replaces?:string; organized?:{section:ScoutSection; quote:string}[]};
export type ScoutItem = {id:string; title:string; detail:string; playIds:string[]; source?:string};
export type ScoutReportSection = {title:ScoutSection; items:ScoutItem[]};
export function activeObservations(o:Opponent) {
 const entries=o.scoutObservations??[]; const replaced=new Set(entries.map(e=>e.replaces));
 return entries.filter(e=>!replaced.has(e.id));
}
export function validateOrganization(value:unknown,text:string):ScoutObservation['organized'] {
 const items=(value as {items?:unknown[]})?.items;
 if(!Array.isArray(items))throw new Error('Invalid scout organization');
 return items.map(raw=>{const x=raw as {section:ScoutSection;quote:string};if(!SCOUT_SECTIONS.includes(x.section)||typeof x.quote!=='string'||!x.quote.trim()||!text.includes(x.quote))throw new Error('Organization must quote the supplied scouting information.');return {section:x.section,quote:x.quote};});
}
/** Append by source. Same file cannot inflate the sample; different games retain identical-looking snaps. */
export function appendScoutImport(o:Opponent, incoming:Play[], source:ScoutSource):Partial<Opponent> {
 if(o.scoutSources?.some(s=>s.fingerprint===source.fingerprint))throw new Error('This report has already been imported. Earlier snaps are unchanged.');
 const plays=[...(o.plays??[]),...incoming.map((p,i)=>({...p,id:`${source.id}:${i}`,scoutSourceId:source.id}))];
 return {plays,playsImported:plays.length,scoutSources:[...(o.scoutSources??[]),source]};
}
function split(plays:Play[]) {
 const known=plays.filter(p=>p.playType==='Run'||p.playType==='Pass'),runs=known.filter(p=>p.playType==='Run').length;
 return known.length?`${Math.round(runs/known.length*100)}% run / ${Math.round((known.length-runs)/known.length*100)}% pass · ${runs}/${known.length} tagged snaps${known.length<10?' · limited sample':''}`:'Run/pass not tagged';
}
export function cumulativeScout(o:Opponent):ScoutReportSection[] {
 const sections=SCOUT_SECTIONS.map(title=>({title,items:[] as ScoutItem[]}));
 const add=(section:number,id:string,title:string,detail='',plays:Play[]=[],source?:string)=>{if(title.trim())sections[section].items.push({id,title,detail,playIds:plays.map(p=>p.id),source});};
 const plays=o.plays??[];
 if(o.offensiveStyle||o.tempo)add(0,'identity',[o.offensiveStyle,o.tempo].filter(Boolean).join(' · '),'Saved opponent information');
 if(plays.length)add(0,'run-pass',split(plays),`${plays.length} total snaps; ${plays.filter(p=>!p.playType).length} unclassified.`,plays);
 else if(o.runRate!=null)add(0,'manual-run',`${o.runRate}% run`,'Coach-entered rate; sample size not supplied.');
 for(const p of o.keyPlayers??[])add(1,`player:${p.id}`,[p.jersey&&`#${p.jersey}`,p.name,p.pos].filter(Boolean).join(' '),p.notes??'');
 const groups=(field:'formation'|'personnel'|'motion'|'play'|'player',section:number)=>{
  const tagged=plays.filter(p=>p[field]?.trim());const buckets=new Map<string,Play[]>();
  for(const p of tagged){const key=p[field].trim().replace(/\s+/g,' ').toUpperCase();buckets.set(key,[...(buckets.get(key)??[]),p]);}
  for(const [name,rows] of [...buckets].sort((a,b)=>b[1].length-a[1].length)){
   const games=new Set(rows.map(p=>o.scoutSources?.find(s=>s.id===p.scoutSourceId)?.game?.trim()).filter(Boolean));
   const gains=rows.filter(p=>p.gain!=null);
   add(section,`${field}:${name}`,`${field==='personnel'?'Personnel ':field==='motion'?'Motion ':''}${name}`,`${rows.length}/${tagged.length} ${field}-tagged snaps · ${split(rows)}${games.size>1?` · observed in ${games.size} games`:''}${field==='play'&&gains.length?` · ${(gains.reduce((n,p)=>n+p.gain!,0)/gains.length).toFixed(1)} yards/play (${gains.length} gain-tagged)`:''}`,rows);
  }
 };
 groups('player',1);groups('formation',2);groups('personnel',2);groups('motion',2);groups('play',3);
 for(const f of (o.formations??[]).filter(f=>f.notes||!plays.some(p=>p.formation.trim().toLowerCase()===f.name.trim().toLowerCase())))add(2,`saved-formation:${f.id}`,f.name,[f.notes,f.snapsPct!=null?`${f.snapsPct}% usage (saved scouting entry)`:null].filter(Boolean).join(' · '));
 for(const p of (o.personnelUsage??[]).filter(g=>!plays.some(p=>p.personnel.trim().toLowerCase()===g.group.trim().toLowerCase())))add(2,`saved-personnel:${p.id}`,p.group,p.pct!=null?`${p.pct}% usage (saved scouting entry)`: 'Saved grouping');
 for(const c of o.concepts??[])add(3,`saved-concept:${c.id}`,c.name,[c.type,c.notes].filter(Boolean).join(' · '));
 for(const [name,rows] of [['1st down',plays.filter(p=>p.down===1)],['3rd down',plays.filter(p=>p.down===3)],['Short yardage (1–2)',plays.filter(p=>p.distance!=null&&p.distance>0&&p.distance<=2)]] as [string,Play[]][]){if(rows.length)add(4,name,name,split(rows),rows);}
 const situationKeys=new Map<string,Play[]>();for(const p of plays){const sit=situationOf(p);if(sit){const key=situationLabel(sit);situationKeys.set(key,[...(situationKeys.get(key)??[]),p]);}}
 for(const [name,rows] of situationKeys)add(4,`situation:${name}`,name,split(rows),rows);
 for(const t of computeTells(plays).actionable.slice(0,8))add(5,`tell:${t.id}`,tellSentence(t),`${t.hits}/${t.n} tagged opportunities · observed association, not a prediction`,plays.filter(p=>t.matchIds.includes(p.id)));
 if(!plays.length&&o.downDistance)for(const [down,distances] of Object.entries(o.downDistance))for(const [distance,rate] of Object.entries(distances)){if(rate!=null)add(4,`manual:${down}:${distance}`,`${down} down · ${distance}`,`${rate}% run / ${100-rate}% pass · coach-entered; sample size not supplied.`);}
 if(o.redZone)add(4,'red-zone','Red zone',o.redZone);
 for(const n of o.matchupNotes??[])add(5,`note:${n.id}`,n.label||'Scouting note',n.value);
 if(o.notes)add(5,'legacy-notes','Saved observations',o.notes);
 for(const e of activeObservations(o)){
  const organized=e.organized??[];
  for(const [i,item] of organized.entries())add(SCOUT_SECTIONS.indexOf(item.section),`${e.id}:${i}`,item.quote,'Coach / source observation',[],e.source);
  // Keep unclassified text accessible without silently dropping a paragraph.
  const remainder=organized.reduce((text,item)=>text.replace(item.quote,''),e.text).trim();
  if(remainder)add(5,`${e.id}:raw`,remainder,organized.length?'Additional source information':'Observation — organization pending',[],e.source);
 }
 const dated=(o.scoutSources??[]).filter(s=>s.gameDate&&s.game).sort((a,b)=>a.gameDate!.localeCompare(b.gameDate!));
 const latest=dated.at(-1);
 if(latest){const recent=plays.filter(p=>o.scoutSources?.find(s=>s.id===p.scoutSourceId)?.game===latest.game&&p.playType);const prior=plays.filter(p=>{const s=o.scoutSources?.find(s=>s.id===p.scoutSourceId);return s?.gameDate&&s.gameDate<latest.gameDate!&&s.game!==latest.game&&p.playType;});
  if(recent.length>=20&&prior.length>=20){const rate=(r:Play[])=>r.filter(p=>p.playType==='Run').length/r.length;const diff=Math.round((rate(recent)-rate(prior))*100);if(Math.abs(diff)>=15)add(5,'recent-change',`Recent run-rate change: ${diff>0?'+':''}${diff} percentage points`,`${latest.game}: ${split(recent)}. Earlier dated games: ${split(prior)}. Descriptive change; game context may explain it.`,[...recent,...prior]);}
 }
 sections[4].items.sort((a,b)=>{const rank=(i:ScoutItem)=>i.id==='red-zone'?0:/3rd|Short yardage/.test(i.title)?1:2;return rank(a)-rank(b);});
 return sections;
}
export function scoutTopic(meeting:StaffMeeting,item:ScoutItem):StaffMeeting {
 const id=`scout:${item.id}`;
 const topic={id,title:item.title,detail:'Develop a defensive answer using our installed scheme and personnel.',evidence:[item.detail,item.source].filter(Boolean).join(' · '),section:'threats',playIds:item.playIds,scouting:true};
 return {...meeting,topics:[...(meeting.topics??[]).filter(t=>t.id!==id),topic],hidden:meeting.hidden?.filter(t=>t!==id)};
}
