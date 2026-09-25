import type { Call, Concept, ConceptKind, PlaybookSection } from "./store";

export const diagramSection: Record<ConceptKind, PlaybookSection> = {
  front: "Fronts", coverage: "Coverages", pressure: "Pressures", adjustment: "Checks & Adjustments",
};
const normalized = (value: string) => value.trim().toLowerCase();

export function diagramConcept(call: Call, concepts: Concept[]): Concept | undefined {
  if (call.schemeConceptId !== undefined) return concepts.find(c => c.id === call.schemeConceptId);
  // Recover existing drawings only when the section and exact name identify one item.
  const matches = concepts.filter(c => diagramSection[c.kind] === call.section &&
    [call.name, c.kind === "front" ? call.defFront : c.kind === "coverage" ? call.defCoverage : undefined]
      .some(name => name && normalized(name) === normalized(c.name)));
  return matches.length === 1 ? matches[0] : undefined;
}
