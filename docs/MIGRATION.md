# Migración desde Mi Chuleta DAM 2.0

## La fuente queda congelada

`sources/MiChuleta_DAM_2.0.html` es una copia byte a byte del archivo original.

- Tamaño: 799.428 bytes.
- SHA-256: `30499b3f39a302c5cf476f03053e13e2969e9574864aee2cf778d49d820007b8`.

El validador recalcula el hash. Si alguien edita el HTML o el registro de la fuente, la validación falla. No se extrae contenido reescribiéndolo.

La aplicación es un solo archivo: estilos, una página con búsqueda y navegación por hash, y `window.__DATA` antes del motor. No tiene manifiesto ni service worker. El progreso vive en `localStorage` con la clave `mcdam2.progress` y versión de esquema 2.

## Qué hay dentro

| Bloque | Cantidad | Notas para la migración |
| --- | --- | --- |
| Preguntas | 220, ids únicos | `ad` 89, `di` 30, `sge` 66, `psp` 35. PMDM no tiene test |
| Tipo | 185 de opción, 35 de autoevaluación | Las 35 son todas de PSP. No traen `src` ni explicación |
| Procedencia | 158 `orig`, 27 `new`, 35 sin campo | Las 27 nuevas están en `ad-n` |
| Explicación por opción | 89, todas las de AD | DI, SGE y PSP no la tienen. No se completa de memoria |
| Dificultad | 42 básicas, 170 medias, 8 avanzadas | Valores 1, 2 y 3 |
| Conceptos | 28 | AD 21, DI 1, SGE 4, PSP 2. DI es un solo cajón para 30 preguntas |
| Diccionario | 278 | AD 157, DI 28, PMDM 24, PSP 21, SGE 17, BD 19, Programación 12 |
| Pares síntoma/causa | 22 | Solo AD. Siguen en el HTML |
| Reglas cortas | 10 | Siguen en el HTML |
| Documentos | 6 | Guías de AD (dos), DI, PMDM, PSP y SGE. Son HTML, no lecciones |
| Asignaturas con fecha de examen | 5 | AD, DI, PMDM, PSP, SGE |
| Otros | 2 | Programación y Bases de datos: hay diccionario y el texto dice que los apuntes no están cargados |

Los 220 ids encajan en `ad`, `ad-n`, `di`, `sge` o `psp` más dígitos. No hay duplicados. En las preguntas de opción, el indicador de respuesta múltiple coincide siempre con el número de letras correctas. Hay 11 preguntas marcadas como «de código» cuyo fragmento va en el enunciado y no en el campo `code`.

Programación de 1.º, en el diccionario, son estos títulos y nada más: algoritmo, pseudocódigo y diagrama de flujo, compilador e intérprete, IDE, depuración, tipos de error, recursividad, scanner, switch, do-while, método estático y de instancia, sobrecarga. No hay preguntas. El Java evaluable está dentro de Acceso a Datos: colecciones, comparación, streams, ficheros, JSON, JDBC e Hibernate.

## Correspondencia de campos

Pregunta de opción:

| Fuente | Entidad `item` |
| --- | --- |
| `id` | `id`, sin cambio |
| `s`, `c`, `d` | `subjectId`, `conceptId`, `difficulty` |
| `k: "mc"` | `kind: "multiple-choice"` |
| `q`, `code` | `stem`, `code` (se omite si viene vacío) |
| `o`, `a`, `ox` | `options[].text`, `correct`, `options[].rationale` |
| `w`, `ej`, `tr`, `ver` | `generalRationale`, `example`, `examHint`, `verification` |
| `m`, `cod`, `b`, `src` | `multiple`, `presentsCode`, `bankLabel`, `origin` |

Autoevaluación: `k: "qa"` pasa a `kind: "self-check"` y `a` (un texto) pasa a `expectedAnswer`. En el registro de progreso esas respuestas llevan `sf: 1` y no entran en la nota estimada.

Concepto: la clave es el id; `n` es el título; `t` es el tema; `conf` es la confusión que la fuente quiere distinguir; `s` es el módulo de origen, no un candado de la ruta; `terms` son títulos de diccionario.

Diccionario: `t` título, `a` módulo, `g` tema, `d` definición, `f` analogía, `e` pista de examen, `x` fragmento. El id nuevo del término no sustituye a `t`.

## Qué no se migra todavía

- El HTML de los apuntes. Trocearlo a mano en esta fase sería reescribir o perder contexto. Cada chunk será una lección solo cuando se pueda citar sin reformular.
- Las 219 preguntas que no son `ad01`. Sus ids se quedan en la fuente. La lección de muestra los enumera para `col.elegir`: `ad01`, `ad02`, `ad03`, `ad04`, `ad05`, `ad-n01`, `ad-n02`.
- Fechas, consignas de un examen concreto y la frase del tutor que incluye un nombre.
- Los pares de errores y las diez reglas, hasta tener un tipo propio. Copiarlos dentro de una lección como si fueran texto nuevo mezclaría cosas distintas.
- PMDM, DI, PSP y SGE como rutas. PMDM tiene apuntes y diccionario, y cero preguntas.

## Orden de la extracción futura

1. Congelar el HTML. Hecho.
2. Extraer fuentes, conceptos y términos de AD sin cambiar ids ni textos. El ejemplo demuestra el corte con `col.elegir`.
3. Extraer las 89 preguntas de AD. El validador ya compara enunciado, opciones, respuesta y explicaciones con el HTML.
4. Montar lecciones que solo citen esos términos y esas preguntas. Varias rutas pueden citar la misma lección.
5. Dejar DI y SGE en `needs-review` si se importan, porque no traen explicación por opción. PSP se importa como autoevaluación, sin fabricar opciones.
6. No dar por verificada una pregunta `new` solo porque el campo `ver` dice que se ejecutó. Ese dato se copia a `verification`. El estado `verified-by-execution` lo pone una persona, no el extractor.

El extractor futuro tiene que ser aburrido: leer `__DATA`, volcar campos y fallar si un id del paquete no coincide con la fuente. El ejemplo actual se generó así y el validador lo vuelve a comprobar.

## Riesgos de la migración

- Los apuntes son HTML largo y a veces hablan en segunda persona de prácticas concretas. Separar el temario de lo personal es un trabajo de revisión, no un reemplazo automático.
- Un concepto de DI agrupa 30 preguntas. Partirlo en conceptos más finos crearía ids que la fuente no tiene. Hasta que se decida, se conserva `di.teoria`.
- Corregir una errata en una pregunta legada no se hace editando el HTML ni el texto a escondidas. Hace falta una revisión con estado explícito. Hoy el validador impide esa edición silenciosa.
