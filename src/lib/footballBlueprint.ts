import type { Call } from './store';
import { offensivePresets, getStructure, defenseCanvasY, LOS_Y, YD } from './football';

// Football assignments, never model-selected pixel coordinates. One renderer is
// shared by preview and Play Art, so resizing cannot alter a route's depth.
const obj = (properties: Record<string, object>) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });
const str = { type: 'string' }, num = { type: 'number' };
const arr = (items: object) => ({ type: 'array', items });
const choice = (values: string[]) => ({ type: 'string', enum: values });
export const ROUTES = ['vertical','hitch','snag','slant','out','in','corner','post','flat','cross','wheel','comeback'] as const;
const TECHNIQUES = ['landmark','0','1','2i','2','3','4i','4','5','6i','6','9'];
export const BLUEPRINT_SCHEMA = obj({
  version: choice(['football-v1']), title: str, explanation: str, assumptions: str, question: str,
  formation: choice([...Object.keys(offensivePresets), 'custom', 'none']),
  mirror: { type: 'boolean' },
  // width is signed yards from the ball (screen right positive); depth is
  // signed yards beyond LOS (offense negative, defense positive).
  offense: arr(obj({ label: str, width: num, depth: num })),
  routes: arr(obj({ player: str, route: choice([...ROUTES]), depth: num, width: num })),
  defenders: arr(obj({ label: str, technique: choice(TECHNIQUES), side: choice(['left','middle','right']), width: num, depth: num })),
  paths: arr(obj({ side: choice(['off','def']), player: str, kind: choice(['block','motion','route']), points: arr(obj({ width: num, depth: num })), assignment: str })),
  zones: arr(obj({ player: str, width: num, depth: num, radiusWidth: num, radiusDepth: num, assignment: str })),
});
export type FootballBlueprint = {
  version: 'football-v1'; title: string; explanation: string; assumptions: string; question: string;
  formation: string; mirror: boolean;
  offense: {label:string;width:number;depth:number}[];
  routes: {player:string;route:typeof ROUTES[number];depth:number;width:number}[];
  defenders: {label:string;technique:string;side:'left'|'middle'|'right';width:number;depth:number}[];
  paths: {side:'off'|'def';player:string;kind:'block'|'motion'|'route';points:{width:number;depth:number}[];assignment:string}[];
  zones: {player:string;width:number;depth:number;radiusWidth:number;radiusDepth:number;assignment:string}[];
};
const COLORS = ['#315EFB','#7C3AED','#16824B','#B45309','#BE185D'];
const X_YARD = 100 / (160 / 3);
const techniqueOffset: Record<string,number> = { '0':0,'1':1.5,'2i':2.5,'2':4,'3':5.5,'4i':6.5,'4':8,'5':9.5,'6i':12,'6':13.5,'9':15 };
function number(n: unknown, min:number, max:number): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) throw new Error('Assignment is outside the usable field. Clarify the alignment or route depth.');
  return n;
}
function label(s: unknown): string {
  if (typeof s !== 'string' || !/^[A-Z0-9]{1,2}$/i.test(s)) throw new Error('Each player needs a unique one- or two-character label.');
  return s.toUpperCase();
}
const point = (width:number,depth:number): [number,number] => [50 + number(width,-25,25)*X_YARD, LOS_Y + number(depth,-16,19)*YD];

export function renderBlueprint(value: unknown, structureId:string): {call:Call|null;question:string} {
  if (!value || typeof value !== 'object') throw new Error('Missing football assignments.');
  const b = value as FootballBlueprint;
  for (const key of ['title','explanation','assumptions','question'] as const) if (typeof b[key] !== 'string' || b[key].length > (key === 'title' ? 100 : 2000)) throw new Error('Invalid reference description.');
  if (b.question.trim()) return {call:null,question:b.question};
  if (b.version !== 'football-v1' || typeof b.mirror !== 'boolean') throw new Error('Unknown football drawing format.');
  for (const [key, max] of [['offense',11],['routes',11],['defenders',11],['paths',24],['zones',11]] as const) if (!Array.isArray(b[key]) || b[key].length > max) throw new Error('Too many assignments for a football play.');
  if(b.routes.length+b.paths.length>24) throw new Error('Too many drawing paths.');
  const preset = offensivePresets[b.formation];
  if (!preset && !['custom','none'].includes(b.formation)) throw new Error('Specify a supported formation or the custom player alignments.');
  if (b.formation !== 'custom' && b.offense.length) throw new Error('Do not mix a preset with custom alignments.');
  const off: Call["offLook"] = preset ? preset.map(p=>({...p,displayLabel:p.label, showLabel:true, x:b.mirror?100-p.x:p.x})) : b.offense.map((p,i)=>{
    const [x,y]=point(p.width,number(p.depth,-16,0)); return {id:`off-${i}`,label:label(p.label),displayLabel:label(p.label),showLabel:true,x,y};
  });
  // Mirroring swaps the offensive line's names as well as the coordinates.
  if (preset && b.mirror) for (const p of off) { if (/^[LR][GT]$/.test(p.label)) p.label=p.displayLabel=(p.label[0]==='L'?'R':'L')+p.label[1]; }
  const structure=getStructure(structureId);
  const call:Call={id:'football-reference',name:b.title,section:b.defenders.length?'Fronts':'Checks & Adjustments',offForm:b.formation,offConcept:b.title,offLook:off,defOffsets:{},defAppearance:Object.fromEntries(structure.slots.map((_,i)=>[i,{hidden:true}])),lines:[],zones:[],assignments:{},texts:[],notes:''};
  const names=new Set<string>();
  for(const p of off) { if(names.has(p.label)) throw new Error('Duplicate offensive player label.'); names.add(p.label); }
  const defenders=b.defenders.map((d,i)=>{
    const name=label(d.label), depth=number(d.depth,.5,18);
    if(!TECHNIQUES.includes(d.technique) || !['left','middle','right'].includes(d.side)) throw new Error('Unknown defensive technique.');
    if(d.technique!=='landmark' && ((d.technique==='0') !== (d.side==='middle') || depth>2)) throw new Error('A line technique must align at the line of scrimmage.');
    const [landmark,y]=point(d.width,depth);
    let x=d.technique==='landmark'?landmark:50+(d.side==='left'?-1:1)*techniqueOffset[d.technique];
    if(['6i','6','9'].includes(d.technique)) {
      const sign=d.side==='left'?-1:1;
      const te=off.find(p=>['Y','TE'].includes(p.label) && (p.x-50)*sign>8 && Math.abs(p.x-50)<=20 && p.y>=38);
      if(!te) throw new Error('A tight-end technique needs an attached tight end on that side.');
      x=te.x+sign*(d.technique==='6i'?-1.5:d.technique==='9'?1.5:0);
    }
    if(!structure.slots[i]) throw new Error('Too many defenders.');
    const slot=structure.slots[i]; call.defOffsets[i]=[x-slot.x,y-defenseCanvasY(slot.y)];
    call.defAppearance![i]={displayLabel:name,hidden:false};
    return {id:`def:${i}`,label:name,x,y};
  });
  if(new Set(defenders.map(p=>p.label)).size!==defenders.length) throw new Error('Use distinct defensive labels, such as C1 and C2.');
  if(!off.length&&!defenders.length) throw new Error('No player alignments supplied.');
  for (const side of [off,defenders]) for(let i=0;i<side.length;i++) for(let j=i+1;j<side.length;j++) if(Math.hypot(side[i].x-side[j].x,side[i].y-side[j].y)<2) throw new Error('Two players overlap. Clarify their splits.');
  const expected: Record<string,string[]> = {snag:['snag','corner','flat'],smash:['hitch','corner'],mesh:['cross','cross'],flood:['vertical','out','flat']};
  const named=b.title.toLowerCase().match(/\b(snag|smash|mesh|flood)\b/)?.[1];
  if(named && b.routes.length && !b.paths.length) {
    const remaining=b.routes.map(r=>r.route as string);
    for(const route of expected[named]) { const i=remaining.indexOf(route); if(i<0) throw new Error(`The ${named} assignments do not match its core route combination. Clarify the variation.`); remaining.splice(i,1); }
  }
  const assignments:string[]=[];
  const used=new Set<string>();
  b.routes.forEach((r,i)=>{
    const p=off.find(p=>p.label===label(r.player));
    if(!p || used.has(p.id) || /^(?:[LR][GT]|C|Q)$/.test(p.label)) throw new Error('Route needs one eligible receiver, with no duplicate assignment.');
    used.add(p.id);
    if(!ROUTES.includes(r.route)) throw new Error('Unknown route.');
    const depth=number(r.depth,0,17), width=number(r.width,0,50)*X_YARD, y=LOS_Y+depth*YD;
    if(y<=p.y) throw new Error('A route must develop beyond its starting alignment.');
    const outward=p.x>=50?1:-1, inward=-outward;
    let pts:[number,number][]=[[p.x,p.y]];
    let arrow=true;
    switch(r.route){
      case 'vertical': pts.push([p.x,y]); break;
      case 'hitch': pts.push([p.x,y],[p.x,y-YD]); arrow=false; break;
      case 'snag': pts.push([p.x+inward*width,y]); arrow=false; break;
      case 'slant': pts.push([p.x,LOS_Y+YD],[p.x+inward*width,y]); break;
      case 'flat': pts.push([p.x+outward*Math.min(width,4),LOS_Y],[p.x+outward*width,y]); break;
      case 'corner': case 'post': pts.push([p.x,y],[p.x+(r.route==='corner'?outward:inward)*width,y+4*YD]); break;
      case 'out': case 'in': case 'cross': pts.push([p.x,y],[p.x+(r.route==='out'?outward:inward)*width,y]); break;
      case 'wheel': pts.push([p.x+outward*width,LOS_Y+2*YD],[p.x+outward*width,y]); break;
      case 'comeback': pts.push([p.x,y],[p.x+outward*width,y-3*YD]); break;
    }
    if(r.route!=='vertical'&&r.route!=='hitch'&&width===0) throw new Error('A breaking route needs a nonzero width.');
    if(pts.some(([x,y])=>x<2||x>98||y<2||y>85)) throw new Error('Route runs off the field. Clarify receiver split or route width.');
    pts=pts.filter((p,i)=>i===0||Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1])>.1);
    const color=COLORS[i%COLORS.length]; p.color=color;
    call.lines.push({id:`route-${i}`,anchor:`off:${p.id}`,kind:'route',points:pts.map(([x,y])=>[x-p.x,y-p.y]),color,arrowStyle:arrow?'end':'none',smooth:false,thickness:'normal'});
    assignments.push(`${p.label}: ${r.route}, ${depth} yd${r.width?`, ${r.width} yd across`:''}`);
  });
  for(const [i,path] of b.paths.entries()){
    const p=path.side==='off'?off.find(p=>p.label===label(path.player)):defenders.find(p=>p.label===label(path.player));
    if(!p || !['off','def'].includes(path.side)|| !['block','motion','route'].includes(path.kind) || !Array.isArray(path.points)||path.points.length<1||path.points.length>8||typeof path.assignment!=='string') throw new Error('Invalid player assignment.');
    const anchor=path.side==='off'?`off:${p.id}`:p.id;
    if(call.lines.some(l=>l.anchor===anchor)) throw new Error('Multiple conflicting paths for one player.');
    call.lines.push({id:`path-${i}`,anchor,kind:path.kind,points:[[0,0],...path.points.map(pt=>{const [x,y]=point(pt.width,pt.depth);return [x-p.x,y-p.y] as [number,number];})],color:COLORS[(b.routes.length+i)%COLORS.length],thickness:'normal'});
    assignments.push(`${p.label}: ${path.assignment}`);
  }
  for(const [i,z] of b.zones.entries()){
    const d=defenders.find(d=>d.label===label(z.player));
    if(!d || typeof z.assignment!=='string') throw new Error('Coverage zone needs an assigned defender.');
    const [x,y]=point(z.width,number(z.depth,0,18)),rx=number(z.radiusWidth,1,12)*X_YARD,ry=number(z.radiusDepth,1,6)*YD;
    if(x-rx<1||x+rx>99||y-ry<1||y+ry>86) throw new Error('Coverage zone is outside the field.');
    call.zones.push({id:`zone-${i}`,x,y,rx,ry,side:'def'});
    call.assignments[defenders.indexOf(d)]=z.assignment;
    assignments.push(`${d.label}: ${z.assignment}`);
  }
  const alignments=b.defenders.map(d=>`${d.label}: ${d.technique==='landmark'?`${d.width} yd from ball, ${d.depth} yd deep`:`${d.side} ${d.technique}-technique`}`);
  call.notes=`AI reference — coach review needed. Offense attacks down-screen.\n${b.explanation}\n\n${[...alignments,...assignments].join('\n')}\n\nAssumptions: ${b.assumptions || 'Only the displayed assignments are illustrated; no unshown assignment is implied.'}`;
  return {call,question:''};
}

// Exact names only; never choose the first fuzzy match or silently remove a tag.
export function savedReference(question:string,calls:Call[]): {call:Call|null;question:string}|null {
  const normalized=question.toLowerCase().replace(/[?.!]/g,'').replace(/^(?:please\s+)?(?:can you\s+)?(?:draw|show|sketch|illustrate)(?: me)?(?: a diagram of| the diagram of| a| the)?\s+/,'').replace(/^(?:my|our|saved)\s+/,'').trim();
  const hits=calls.filter(c=>c.name.trim().toLowerCase()===normalized);
  if(hits.length>1) return {call:null,question:`You have multiple drawings named ${hits[0].name}. Which category should I use?`};
  if(hits.length===1) return {call:structuredClone(hits[0]),question:''};
  return null;
}
