import type {Call} from './store';
import type {Concern,ExceptionResult} from './schemeExceptions';
import {getStructure,defenseCanvasY,FIELD_H} from './football';

/** Offline checks are limited to visible saved alignments. Never infer assignments. */
export function localSchemeAnalysis(calls:Call[]):ExceptionResult{
 const result:ExceptionResult={concerns:[],evaluated:[],limits:['Run fits, coverage rules, pressure replacement and personnel matchups require the connected football review. Local alignment checks do not verify those responsibilities.']};
 for(const call of calls){
  const structureId=call.fullDefense?.structureId??call.structureId;
  if(!structureId)continue;
  const structure=getStructure(structureId);
  if(structure.id!==structureId)continue;
  const positions=structure.slots.flatMap((s,i)=>{
   if(call.defAppearance?.[i]?.hidden)return [];
   const offset=call.defOffsets[i]??[0,0];
   const x=s.x+offset[0],y=defenseCanvasY(s.y)+offset[1];
   return Number.isFinite(x)&&Number.isFinite(y)?[{i,label:s.pos,x,y}]:[];
  });
  if(!positions.length)continue;
  result.evaluated.push(`${call.name}: visible defender locations and overlapping alignments.`);
  const add=(issue:string,why:string,fix:string,quote:string)=>{
   const concern:Concern={severity:'potential',issue,why,fix,source:`call:${call.id}`,evidence:[{source:`call:${call.id}`,quote}],diagram:true,correction:null};
   result.concerns.push(concern);
  };
  for(const p of positions){
   if(p.x<0||p.x>100||p.y<0||p.y>FIELD_H+12)add(`${p.label} is outside the drawing field`,`${call.name} places this defender beyond the usable field. The saved picture cannot represent that alignment as drawn.`,`Open ${call.name} and move ${p.label} to the intended on-field alignment.`,`Saved slot ${p.i+1}: x ${p.x.toFixed(1)}, y ${p.y.toFixed(1)}.`);
  }
  for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
   const a=positions[i],b=positions[j];
   if(Math.hypot(a.x-b.x,a.y-b.y)<1.5)add(`${a.label} and ${b.label} overlap`,`${call.name} draws two defenders at effectively the same spot. Confirm their actual spacing; this does not establish a run-fit or coverage conflict.`,`Separate the two markers to show the intended alignment in ${call.name}.`,`Saved slots ${a.i+1} and ${b.i+1}: (${a.x.toFixed(1)}, ${a.y.toFixed(1)}) and (${b.x.toFixed(1)}, ${b.y.toFixed(1)}).`);
  }
 }
 if(!result.evaluated.length)result.limits.unshift('No saved defensive drawing with a known structure was available for local alignment checks.');
 return result;
}
