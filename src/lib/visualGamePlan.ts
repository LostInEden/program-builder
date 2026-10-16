import type { Call, DiagramAttachment, Opponent } from './store';
import { getStructure, offensivePresets, defenseCanvasY, FIELD_H } from './football';
import { opponentOverview } from './opponentOverview';

export function scoutLooks(o:Opponent) {
 const v=opponentOverview(o);
 return [
  ...(o.diagrams??[]).map(d=>({key:d.id,name:d.call.name,evidence:'Saved opponent diagram',diagram:d})),
  ...(v.formation?[{key:`formation:${v.formation.name}`,name:v.formation.name,evidence:`Top formation · ${v.formation.snapsPct??'Unknown'}% usage`,diagram:undefined}]:[]),
  ...[v.run,v.pass].filter(x=>!!x).map(x=>({key:`concept:${x!.name}`,name:x!.name,evidence:`${x!.type} · ${x!.notes||'Saved scouting concept'}`,diagram:undefined})),
 ];
}
export function formationDraft(name:string,preset:string,structureId:string):Call {
 return {id:'visual-draft',name,section:'Checks & Adjustments',offForm:preset,offConcept:'',offLook:structuredClone(offensivePresets[preset]??[]),lines:[],zones:[],texts:[],defOffsets:{},assignments:{},notes:'',defAppearance:Object.fromEntries(getStructure(structureId).slots.map((_,i)=>[i,{hidden:true}]))};
}
// Only explicitly defensive objects transfer. Free lines have no reliable ownership.
export function applyDefense(look:Call,defense:Call):Call {
 return {...structuredClone(look),defFront:defense.defFront||defense.name,defCoverage:defense.defCoverage,defOffsets:structuredClone(defense.defOffsets),defAppearance:structuredClone(defense.defAppearance??{}),assignments:structuredClone(defense.assignments),
 lines:[...look.lines.filter(l=>!l.anchor.startsWith('def:')),...defense.lines.filter(l=>l.anchor.startsWith('def:')).map(l=>({...structuredClone(l),id:`defense:${l.id}`}))],
 zones:[...look.zones.filter(z=>z.side!=='def'),...defense.zones.filter(z=>z.side==='def').map(z=>({...structuredClone(z),id:`defense:${z.id}`}))]};
}
export const diagramRevision=(call:Call)=>JSON.stringify(call);
export function diagramChecks(call:Call,structureId:string):string[] {
 const slots=getStructure(structureId).slots;
 const visible=slots.map((s,i)=>({s,i})).filter(({i})=>!call.defAppearance?.[i]?.hidden);
 const issues:string[]=[];
 if(visible.length!==11)issues.push(`${visible.length} visible defenders; confirm the intended personnel before approval.`);
 if(call.offLook.length!==11)issues.push(`${call.offLook.length} offensive players shown; confirm the opponent look.`);
 if(visible.some(({i})=>!call.assignments[i]?.trim()))issues.push('Some responsibilities are not recorded. Alignment and arrows alone do not establish every run fit or coverage rule.');
 const positions=visible.map(({s,i})=>({i,x:s.x+(call.defOffsets[i]?.[0]??0),y:defenseCanvasY(s.y)+(call.defOffsets[i]?.[1]??0)}));
 if(positions.some(p=>p.x<0||p.x>100||p.y<0||p.y>FIELD_H+12))issues.push('A defender is outside the drawing field; review the alignment.');
 if(positions.some((p,i)=>positions.slice(i+1).some(q=>Math.hypot(p.x-q.x,p.y-q.y)<1.5)))issues.push('Defender markers overlap; clarify the alignment.');
 if(call.lines.some(l=>l.anchor.startsWith('off:')&&!call.offLook.some(p=>p.id===l.anchor.slice(4))))issues.push('An offensive path has no matching player; repair its anchor.');
 if(!call.defCoverage?.trim())issues.push('Coverage is not identified; coverage responsibilities cannot be validated.');
 if(Object.values(call.defOffsets).some(p=>p.some(n=>!Number.isFinite(n)))||call.offLook.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))issues.push('Invalid player coordinates need correction.');
 issues.push('Personnel matchups, motion checks and football soundness require coaching review. These checks are not a soundness certification.');
 return issues;
}
export function readyVisualDiagram(d:DiagramAttachment) {
 return !d.visual || (!!d.visual.confirmed && d.visual.review?.revision===diagramRevision(d.call));
}
