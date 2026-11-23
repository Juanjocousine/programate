import curriculum from "../content/java-pilot.json";
import type { Concept, Item } from "./bank";

export const JAVA_SUBJECT = "java-pilot";
export const units = curriculum;
export const javaGroups = ["Fundamentos", "Control de flujo", "Funciones y métodos", "POO", "Colecciones y ficheros"];

export const javaConcepts: Concept[] = units.filter((unit) => unit.lesson).map((unit) => ({
  id: `java-${unit.id}`,
  title: unit.title,
  topic: javaGroups[unit.group],
  confusion: "",
  subjectId: JAVA_SUBJECT,
  terms: [],
  routes: [],
}));

export const javaItems: Item[] = units.flatMap((unit) => (unit.lesson?.questions ?? []).map(
  ([stem, correct, distractor1, distractor2, hint, explanation], index) => {
    const choices = [correct, distractor1, distractor2];
    const letters = ["a", "b", "c"];
    return {
      id: `java-${unit.id}-${index + 1}`,
      kind: "multiple-choice",
      subjectId: JAVA_SUBJECT,
      conceptId: `java-${unit.id}`,
      subconceptId: `java-${unit.id}`,
      difficulty: index + 1,
      stem,
      origin: "Piloto original de Java",
      note: null,
      verification: "provisional",
      options: letters.map((letter, position) => ({ letter, text: choices[(position + 3 - index) % 3] })),
      correct: [letters[index]],
      code: index < 2 ? unit.lesson?.code : undefined,
      examHint: hint,
      generalRationale: explanation,
    };
  },
));
