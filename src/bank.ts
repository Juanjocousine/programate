import raw from "../content/bank.json";

export interface Option {
  letter: string;
  text: string;
  rationale?: string;
}

export interface Item {
  id: string;
  kind: "multiple-choice" | "self-check";
  subjectId: string;
  conceptId: string;
  subconceptId: string;
  difficulty: number | null;
  stem: string;
  origin: string | null;
  note: string | null;
  verification: string | null;
  localContext?: boolean;
  options?: Option[];
  correct?: string[];
  multiple?: boolean;
  code?: string;
  presentsCode?: boolean;
  generalRationale?: string;
  example?: string;
  examHint?: string;
  bankLabel?: string;
  expectedAnswer?: string;
}

export interface Concept {
  id: string;
  title: string;
  topic: string;
  confusion: string;
  subjectId: string;
  terms: string[];
  routes: string[];
}

export interface Bank {
  sourceVersion: string;
  subjects: { id: string; name: string; short: string; description: string }[];
  glossaries: { id: string; name: string; note: string }[];
  concepts: Concept[];
  subconcepts: { id: string; title: string; conceptId: string }[];
  items: Item[];
  terms: {
    subjectId: string;
    title: string;
    topic: string;
    definition: string;
    analogy: string;
    examHint: string;
    snippet: string;
  }[];
  knowledge: {
    subconceptId: string;
    easy: string;
    example: string;
    compare: string[][] | null;
    traceId: string;
  }[];
  confusions: { id: string; title: string; subconceptIds: string[] }[];
  traces: {
    id: string;
    t?: string;
    sc?: string;
    lines?: string[];
    steps?: { l?: number; v?: Record<string, unknown>; s?: string }[];
  }[];
  rules: { id: string; text: string; ref: string }[];
  symptomPairs: { id: string; symptom: string; cause: string }[];
}

export const bank = raw as Bank;

const concepts = new Map(bank.concepts.map((concept) => [concept.id, concept]));
const subs = new Map(bank.subconcepts.map((sub) => [sub.id, sub]));
const items = new Map(bank.items.map((item) => [item.id, item]));

export function conceptById(id: string) {
  return concepts.get(id);
}

export function subconceptById(id: string) {
  return subs.get(id);
}

export function itemById(id: string) {
  return items.get(id);
}

export function itemsForConcept(conceptId: string) {
  return bank.items.filter((item) => item.conceptId === conceptId);
}

export function itemsForSubject(subjectId: string) {
  return bank.items.filter((item) => item.subjectId === subjectId);
}

export function subjectName(id: string) {
  return (
    bank.subjects.find((subject) => subject.id === id)?.name ||
    bank.glossaries.find((glossary) => glossary.id === id)?.name ||
    id
  );
}
