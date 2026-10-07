import { offensivePresets, LOS_Y, YD } from './football';
import { renderBlueprint, type FootballBlueprint } from './footballBlueprint';

// Deliberately small, explicit examples. A name with a tag, opponent, personal
// scheme qualifier or unknown formation must go through clarification/modeling.
export function referenceBlueprint(input:string): FootballBlueprint|null {
  const q=input.toLowerCase().replace(/[?.!,]/g,' ').replace(/\s+/g,' ').trim();
  if(/\b(our|my|custom|against|versus|vs|motion|tag|instead|change|not|don't|coverage|cover|blitz|pressure)\b/.test(q)) return null;
  const subject=q.replace(/^(?:(?:please|can you|could you)\s+)*(?:(?:draw|show|sketch|illustrate|create|make)(?: me)?\s+)?(?:(?:a|the)\s+)?(?:(?:diagram|drawing|picture)\s+(?:of\s+)?)?/,'').replace(/^(?:what is|explain)\s+/,'').replace(/\s+(?:concept|front|formation|play|for me|again)$/,'');
  const match=subject.match(/^(snag|smash|mesh|stick|flood|four verticals|4 verts|tite|mint|bear|even)(?: (?:out of|from|in) (trips|bunch|2x2|doubles|empty))?(?: (left|right))?$/);
  if(!match) return null;
  const [,concept,formation='2x2',side='right']=match;
  const b:FootballBlueprint={version:'football-v1',title:`${concept[0].toUpperCase()+concept.slice(1)} — reference`,explanation:'Conventional example; your terminology and assignments may differ.',assumptions:'Illustrative depths. Left/right are screen-side examples; offense attacks down-screen. Unshown routes, blocking, run fits and coverage rules are not assumed.',question:'',formation:formation==='trips'?'Trips Right (3x1)':formation==='bunch'?'Bunch Right (3x1)':formation==='empty'?'Empty (3x2)':'Gun Spread (2x2)',mirror:side==='left',offense:[],routes:[],defenders:[],paths:[],zones:[]};
  const route=(player:string,route:FootballBlueprint['routes'][number]['route'],depth:number,width=0)=>b.routes.push({player,route,depth,width});
  const front=(label:string,technique:string,side:'left'|'middle'|'right')=>b.defenders.push({label,technique,side,width:0,depth:1});
  switch(concept){
    case 'snag':
      // #1 snag, #2 corner, #3/back flat. Explicitly accommodate trips/bunch.
      if(formation==='empty') return null;
      route('Z','snag',5,8); route('Y','corner',8,formation==='bunch'?9:6);
      route(formation==='trips'||formation==='bunch'?'H':'T','flat',2,formation==='2x2'||formation==='doubles'?20:10); break;
    case 'smash': route('Z','hitch',5); route('Y','corner',8,formation==='bunch'?9:6); break;
    case 'mesh':
      if(formation!=='2x2'&&formation!=='doubles') return null;
      route('H','cross',5,37); route('Y','cross',6,37); break;
    case 'stick':
      if(formation==='empty') return null;
      route('Z','vertical',16); route('Y','hitch',5); route(formation==='trips'||formation==='bunch'?'H':'T','flat',2,formation==='2x2'||formation==='doubles'?20:10); break;
    case 'flood':
      if(formation==='empty') return null;
      route('Z','vertical',17); route('Y','out',10,formation==='bunch'?9:7); route(formation==='trips'||formation==='bunch'?'H':'T','flat',2,formation==='2x2'||formation==='doubles'?20:10); break;
    case 'four verticals': case '4 verts':
      if(formation==='empty'||formation==='bunch') return null;
      for(const p of ['X','H','Y','Z']) route(p,'vertical',17); break;
    case 'tite': case 'mint':
      front('E1','4i','left'); front('N','0','middle'); front('E2','4i','right'); break;
    case 'bear': front('T1','3','left'); front('N','0','middle'); front('T2','3','right'); break;
    case 'even': front('E1','5','left'); front('T1','2','left'); front('T2','2','right'); front('E2','5','right'); break;
  }
  if(b.routes.some(r=>r.player==='T'&&r.route==='flat')) {
    // Align the back on the concept side; do not send the flat to the other side.
    const preset=offensivePresets[b.formation];
    b.offense=preset.map(p=>({label:p.label,width:((p.label==='T'?58:p.x)-50)/(100/(160/3))*(b.mirror?-1:1),depth:(p.y-LOS_Y)/YD}));
    if(b.mirror) for(const p of b.offense) if(/^[LR][GT]$/.test(p.label)) p.label=(p.label[0]==='L'?'R':'L')+p.label[1];
    b.formation='custom'; b.mirror=false;
    b.assumptions+=' Spread 2×2, with the back offset toward the illustrated concept.';
  }
  if(b.defenders.length) b.assumptions='Only the interior/front alignment is shown against spread offense. Edge support, linebackers, coverage and gap responsibilities depend on your call and are not inferred from alignment.' + (concept==='even'?' Even uses a heads-up 5–2–2–5 example.':'');
  return b;
}
export function catalogReference(question:string,structureId:string) {
  const b=referenceBlueprint(question);
  if(!b) return null;
  try { return renderBlueprint(b,structureId); }
  catch { return null; } // Unknown geometry must use clarification, never crash chat.
}
