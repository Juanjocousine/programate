# Esquema de contenido

Las claves de los JSON están en inglés para que el contrato sea estable. Los textos académicos quedan en el idioma de la fuente, español.

Un paquete es un manifiesto más una serie de archivos. El manifiesto de muestra es `examples/content-pack.json`. `schemaVersion` es `1`.

## Entidades

| Entidad | Qué es | Qué no es |
| --- | --- | --- |
| `source` | De dónde sale el material, con hash, licencia y si contiene datos personales | No es una lección |
| `concept` | Una idea reutilizable entre rutas. Su id de la fuente se conserva (`col.elegir`) | No es una lección ni una pregunta |
| `term` | Una entrada de diccionario, copiada | El id `term.ad.arraylist` es nuevo porque el diccionario no tenía ids. El título legado no se cambia |
| `item` | Pregunta de test o autoevaluación | No ejecuta código |
| `lesson` | Orden de términos y preguntas ya existentes | En la versión 1 no tiene un bloque de prosa libre |
| `exercise` | Práctica aparte. Escribir código exige `runtime: "isolated-worker"` y el permiso `code.runs`. Un proyecto exige `practice.professional` | El paquete de muestra no trae ninguno: no hay enunciado que copiar sin inventarlo. El permiso no es el nombre de un plan |
| `competency` | Resultado de aprendizaje o competencia | Si el texto oficial no está en la fuente, `statement` es `null` |
| `route` | Orden de lecciones para FP o para la ruta profesional | No duplica el concepto |
| `scoring-profile` | Regla de puntuación, separada del texto de la pregunta | No es una nota del alumno |

El evento de progreso está en `schemas/progress-event.schema.json`. No es contenido académico. Una ficha de ejemplo tiene que llevar `fixture: true` para no guardar respuestas reales en el repositorio.

## Procedencia, licencia, versión y revisión

Cada pieza de contenido, salvo la fuente, lleva:

- `provenance.sourceId`, `locator`, `transform` y `extractedAt`.
- `transform` vale `verbatim` (texto igual), `verbatim-assembly` (solo se ordenan textos ya existentes) o `structural-only` (hay estructura, pero no un texto académico nuevo).
- `revision.version`, entero que sube cuando cambia el texto.
- `revision.status`: `extracted`, `needs-review`, `reviewed`, `verified-by-execution` o `retired`.

`retired` no borra el id. Una pregunta retirada deja de programarse y sigue en el banco.

La fuente declara `license`. Si no consta, el valor es `unspecified`. No se puede marcar `redistribution: "cleared"` con la licencia sin especificar, ni si `personalData` es verdadero.

Autoría: si la fuente no nombra autor, `authors` es una lista vacía y `authorsNote` lo dice. No se rellena con un nombre supuesto.

## Identificadores

- Pregunta legada: `ad01`, `ad-n27`, `di01`, `sge01`, `psp01`. Máximo 40 caracteres, que es el límite con el que la chuleta acepta un registro.
- Una pregunta nueva usa el prefijo `item.` y no puede imitar el patrón legado.
- El id de concepto de la fuente se conserva. Un concepto que no esté en el HTML no puede atribuirse a esa fuente.
- El id de un término nuevo no altera el título del diccionario.

## Lección

Una lección de la versión 1 solo tiene bloques `term` (role `explain`) e `item` (role `check`). Así se evita colar un texto didáctico nuevo en un campo markdown.

`sample.coverage` puede ser `partial`. Entonces `knownSourceItemIds` lista las preguntas de ese concepto que siguen en el HTML, y `includedItemIds` solo las que el paquete trae. El validador comprueba que esas preguntas existen y pertenecen al concepto.

## Competencia

`competency.ad.ra2` es el ejemplo del hueco, no una competencia de colecciones. La fuente dice «RA2 · JDBC» en títulos de apuntes. No trae el enunciado oficial del currículo, así que `statement` es `null` y `statementStatus` es `official-wording-not-in-source`. `conceptIds` está vacío: no se relaciona RA2 con `col.elegir`.

## Puntuación

Hay dos perfiles porque la fuente distingue dos reglas:

- `scoring.ad.documented`: única +1 / −0,33, múltiple +1 / −1, en blanco 0. El código, además, reparte el punto de la múltiple y lo llama interpretación. El perfil guarda la frase y esa advertencia.
- `scoring.plain`: acierto 1 y el resto 0. La propia fuente dice que no hay regla de penalización documentada para el resto de asignaturas.

## Paquete que puede escribir Claude

El manifiesto usa `generator: "claude"`. Cada entidad sigue el esquema de su carpeta. El validador rechaza el paquete si:

- el JSON no cumple el esquema o sobra una clave;
- una referencia apunta a un id que no está en el paquete;
- una pregunta, un concepto o un término atribuidos al HTML no coinciden letra por letra con él;
- un id legado se reutiliza para otro enunciado;
- el estado de revisión es `reviewed`, `verified-by-execution` o `retired`;
- aparece una etiqueta `script`;
- un ejercicio `write-code` no pide runtime aislado;
- la fuente con datos personales se marca como redistribuible.

Un humano puede pasar después el estado a `reviewed`. El archivo importado no lo hace solo.

## Qué no depende del plan

Lecciones, conceptos, términos, preguntas, rutas y competencias no llevan precio ni plan. El estudio que describen está en Free, Pro y Premium. Cerrar el acceso a `ad01` o al repaso según la suscripción no cabe en este esquema.

El catálogo de planes está fuera del paquete académico, en `config/plans.study.json`, con sus esquemas `plan-catalog`, `subscription` y `usage-counter`. Ahí se cambian cupos e importes de estudio. Una lección no se entera.

Cuando exista un ejercicio de escribir código, su campo `capability` será `code.runs`. Cuando exista un proyecto, será `practice.professional`. Esas claves se resuelven en el catálogo. Poner `premium` en el ejercicio sería una condición dispersa y el esquema no lo permite.

El registro de progreso tampoco guarda el plan. Bajar de suscripción deja el registro igual. La suscripción y el contador de consumo son registros de cuenta, no contenido.

## Validación

`npm run validate` comprueba esquemas, referencias, hash del HTML, coincidencia del ejemplo con la fuente y el catálogo de planes. El catálogo de estudio tiene que seguir con Stripe apagado, los tres planes, el estudio básico en todos ellos y los cupos en orden Free, Pro, Premium. `npm test` añade las pruebas del motor, de los permisos y de la política de importación.
