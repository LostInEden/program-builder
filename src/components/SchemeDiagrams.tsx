"use client";

import { useRouter } from "next/navigation";
import { useStore, type Concept, type ConceptKind } from "@/lib/store";
import { diagramConcept, diagramSection } from "@/lib/schemeDiagrams";
import PlayCardSVG from "./PlayCardSVG";

export default function SchemeDiagrams({ concept, kind }: { concept?: Concept; kind: ConceptKind }) {
  const router = useRouter();
  const { calls, concepts, groups, activeGroupId, overrides, addCall, updateCall, setActiveCall } = useStore();
  const structureId = groups.find(g => g.id === activeGroupId)?.structureId ?? "3-4";
  const diagrams = calls.filter(call => concept ? diagramConcept(call, concepts)?.id === concept.id : call.section === diagramSection[kind]);
  const open = (id: string) => { setActiveCall(id); router.push("/scheme/playbook"); };
  const create = () => {
    const id = addCall(diagramSection[kind]);
    if (concept) updateCall(id, { schemeConceptId: concept.id, name: concept.name,
      ...(kind === "front" ? { defFront: concept.name } : kind === "coverage" ? { defCoverage: concept.name } : {}) });
    open(id);
  };
  return <section className="rounded-xl border border-line bg-card p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3"><h3 className="font-bold">{concept ? "Diagrams" : "Saved Play Art"}</h3>
      <button onClick={create} className="text-sm font-semibold text-grass">Draw {concept ? concept.name : "a diagram"} →</button></div>
    {!diagrams.length && <p className="mt-2 text-sm text-dim">{concept ? "No diagram linked yet. Draw this scheme item, or link an existing drawing in Play details." : "No drawings in this category yet."}</p>}
    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{diagrams.map(call => <button key={call.id} onClick={() => {
      if (concept && !call.schemeConceptId) updateCall(call.id, { schemeConceptId: concept.id });
      open(call.id);
    }} className="overflow-hidden rounded-lg border border-line text-left hover:border-grass">
      <div className="bg-[#FFFFFF] p-2"><PlayCardSVG call={call} structureId={structureId} overrides={overrides} defStyle="letters" /></div>
      <div className="px-3 py-2 text-sm font-semibold">{call.name}<span className="block text-xs font-normal text-dim">Edit in Play Art →</span></div>
    </button>)}</div>
  </section>;
}
