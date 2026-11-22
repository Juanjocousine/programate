# Visión de producto

Programate es una academia de programación para dos usos que comparten el mismo conocimiento:

1. Formación profesional: DAM, DAW, SMR, ASIR y, más adelante, especializaciones de IA y Big Data.
2. Desarrollo profesional: de los fundamentos a aplicaciones web completas y competencias avanzadas.

La experiencia prevista combina lecciones cortas, preguntas adaptativas, repaso espaciado, lectura de código, ejercicios ejecutables y proyectos. Esta fase no construye esa experiencia. Fija qué entra en el primer producto y qué queda fuera.

La materia prima es `sources/MiChuleta_DAM_2.0.html`, una aplicación de estudio ya usable. El producto nuevo no la sustituye hasta que el banco esté extraído, validado y revisado.

## A quién sirve

- **Estudiante de FP.** Empieza por 2.º de DAM y, dentro de DAM, por Acceso a Datos. El resto de ciclos no tiene contenido en la fuente.
- **Persona que aprende por cuenta propia.** La ruta de fundamentos de Java reutiliza conceptos del banco. No es todavía un curso desde cero: la fuente dice que los apuntes de Programación de 1.º no están cargados.
- **Quien prepara contenido.** Una persona o Claude escribe un paquete JSON. No entra en la aplicación hasta que el validador lo acepta y una revisión humana cambia su estado.

No hay, en el MVP, un panel de profesor, cuentas de centro ni certificación oficial.

## Itinerarios

Los itinerarios ordenan lecciones. No son dueños de los conceptos.

| Itinerario | Perfil | Qué hay hoy en la fuente |
| --- | --- | --- |
| Acceso a Datos | FP, DAM | 89 preguntas, 21 conceptos, apuntes y diccionario |
| Fundamentos de Java | Profesional | 12 términos de diccionario de Programación y el repaso de Java que vive dentro de Acceso a Datos |

Una lección puede pertenecer a los dos. El dominio de un concepto es de la persona, no de la ruta: si lo trabaja en DAM, cuenta también en la ruta profesional.

El ejemplo del repositorio hace exactamente eso con `col.elegir` (elegir la colección adecuada).

## Principios

- El concepto, la lección, el ejercicio y la pregunta son cosas distintas.
- Una pregunta conserva su identificador. `ad01` sigue siendo `ad01`.
- No se redacta material académico para rellenar huecos. Si la fuente no trae el texto oficial de un resultado de aprendizaje, el campo queda vacío y el estado lo dice.
- Cada pieza cita fuente, autoría si consta, licencia, versión y estado de revisión.
- El mismo concepto se puede usar en FP y en la ruta profesional.
- El primer cliente es una PWA que se lee bien en el móvil. No hay aplicación nativa en el MVP.
- El código del alumno no se ejecuta sin aislamiento. En el MVP no se ejecuta.
- No se despliega nada ni se abre un servicio de pago sin autorización.

## Alcance del MVP

El MVP cubre solo esto:

- Acceso a Datos de DAM, con el material que ya está en la fuente.
- Fundamentos de Java limitados a lo que esa fuente ya contiene. El resto espera una fuente real.
- Las dos rutas anteriores, sobre un único banco de conceptos.
- Preguntas con explicación por opción donde la fuente ya la trae. En Acceso a Datos son las 89. DI y SGE traen una explicación general, no el detalle de cada opción. PSP son 35 autoevaluaciones: la respuesta es un texto, sin opciones y sin explicación guardada. No se inventa lo que falta.
- Repaso espaciado con el mismo criterio que la aplicación actual.
- Progreso individual en el dispositivo, exportable.
- Una interfaz de lección clara, adaptable al tamaño de pantalla, al tamaño de letra y al tema claro u oscuro.

## Fuera del MVP

- Editor donde el alumno escribe código y se ejecuta.
- Tutor de IA completo. La pantalla Claude de la chuleta depende de un entorno que no controlamos y nombra a una persona concreta. No se migra.
- DAW, SMR, ASIR, IA y Big Data.
- DI, PSP, SGE y los apuntes de PMDM como rutas del producto. Siguen en el HTML para una fase posterior.
- Cuentas, sincronización, notas de clase y pagos.
- El calendario de exámenes de la fuente. Son fechas de una persona, no temario.

## Cómo se sabe que el MVP está listo

- Las dos rutas abren lecciones del banco compartido sin duplicar conceptos.
- Una lección muestra el texto citado y, al final, una pregunta con la explicación de cada opción.
- Acertar o fallar cambia el vencimiento del repaso y se puede reconstruir solo con el registro de respuestas.
- Cerrar y volver a abrir conserva el progreso en ese dispositivo, y exportarlo e importarlo no pierde respuestas.
- El paquete de contenido pasa el validador. Un paquete de Claude no puede declararse revisado por sí solo.
- La interfaz se usa con el dedo y con teclado en un ancho de móvil y en un ancho de escritorio.
- No hay servicio backend ni ejecución de código.
