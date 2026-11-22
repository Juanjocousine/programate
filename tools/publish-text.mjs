/**
 * Quita referencias a la práctica, los apuntes o la carpeta de una persona.
 * No cambia el concepto que pregunta el enunciado.
 */

const REPLACEMENTS = [
  ["Depende de tu práctica: si en Aules usan otra URL, manda lo de Aules.", "Si el enunciado da otra URL, manda esa."],
  ["URL de conexión de tu práctica:", "URL de conexión JDBC:"],
  ["En tu práctica, el orden correcto es:", "El orden correcto al usar JDBC es:"],
  ["tus intentos de los tests de Aules", "tests de autoevaluación"],
  ["guía de Aules", "guía del módulo"],
  ["tus apuntes de 1º todavía no están cargados", "los apuntes de 1.º no están en el banco"],
  ["En tus apuntes está la guía del profe de Odoo 17 en una máquina virtual.", "Odoo 17 puede instalarse en una máquina virtual."],
  ["Caso de tus apuntes:", "Caso de ejemplo:"],
  ["¿Dónde se ponen los módulos propios en la guía del profe?", "¿Dónde se ponen los módulos propios de Odoo?"],
  ["los de tus apuntes", "del temario"],
  ["en tus apuntes", "en el temario"],
  ["En tus apuntes", "En el temario"],
  ["tu carpeta personal", "la carpeta desde la que se lanza"],
  ["en tus prácticas", "en este uso"],
];

export function neutralizePersonal(value) {
  let text = value;
  for (const [from, to] of REPLACEMENTS) text = text.replaceAll(from, to);
  return text;
}

export function neutralizeValue(value) {
  if (typeof value === "string") return neutralizePersonal(value);
  if (Array.isArray(value)) return value.map((item) => neutralizeValue(item));
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = neutralizeValue(item);
    return out;
  }
  return value;
}
