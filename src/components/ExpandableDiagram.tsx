"use client";
import {useRef} from 'react';
import {useStore,type Call} from '@/lib/store';
import PlayCardSVG from './PlayCardSVG';

/** Read-only enlargement. Editing continues through the existing StudioCanvas entry points. */
export default function ExpandableDiagram({call,structureId}:{call:Call;structureId:string}) {
 const overrides=useStore(s=>s.overrides),dialog=useRef<HTMLDialogElement>(null);
 const art=<PlayCardSVG call={call} structureId={structureId} overrides={overrides} defStyle="letters" preview/>;
 return <><button type="button" aria-label={`Expand ${call.name} diagram`} className="block w-full rounded-lg border border-line overflow-hidden text-left hover:border-grass print:hidden" onClick={()=>dialog.current?.showModal()}><div className="h-40 bg-[var(--art-field)] p-1">{art}</div><span className="block px-2 py-1 text-xs text-grass">Expand drawing ↗</span></button><div className="hidden print:block h-44">{art}</div><dialog ref={dialog} aria-label={`${call.name} drawing`} className="m-auto w-[min(960px,94vw)] max-h-[94dvh] rounded-xl border border-line bg-card p-4 text-ink backdrop:bg-black/50"><div className="flex items-center justify-between gap-3 mb-3"><h2 className="font-bold">{call.name}</h2><button className="rounded border border-line px-3 py-2 text-sm" onClick={()=>dialog.current?.close()}>Close</button></div><div className="h-[65dvh] bg-[var(--art-field)] rounded-lg">{art}</div></dialog></>;
}
