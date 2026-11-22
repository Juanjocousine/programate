# Traspaso a Codex

Fecha de esta nota: 22 de noviembre de 2026. La copia de trabajo es `C:\Users\juanj\OneDrive\Escritorio\Proyectos\Programate`. No hay otra copia más avanzada en `C:\Users\juanj\proyectos`.

Esta nota distingue lo que ya se puede usar de lo que solo está diseñado. No hay que rehacer la arquitectura para continuar.

## Estado real

Hay una aplicación local, con Vite y TypeScript, sin framework de interfaz. El motor está en `engine/` y no depende de la pantalla. El contenido educativo está en `content/bank.json`. El progreso del alumno vive en el navegador (`localStorage`, clave `programate.progress`).

No hay cuentas, servidor, pagos, tutor ni ejecución de código del alumno.

`npm test` (22 de noviembre de 2026): 38 pruebas en verde y validación de contenido correcta.

## Terminado

- Banco de Mi Chuleta DAM 2.1: 305 preguntas, 32 conceptos, 40 conceptos finos, 278 términos, 29 explicaciones, 10 confusiones, 9 seguimientos de código y 28 reglas.
- Rutas con preguntas: Acceso a Datos, Diseño de interfaces, SGE, PSP y Digitalización.
- Fundamentos de Java: 20 conceptos que ya existían dentro de Acceso a Datos. No hay un curso de Java desde cero.
- Programación de 1.º y Bases de datos: solo diccionario, sin preguntas.
- Práctica con corrección, simulacro de Acceso a Datos, repaso espaciado, progreso, exportación e importación.
- Gamificación corta: XP, nivel, objetivo diario opcional y racha. Un acierto repetido el mismo día no da XP. No hay ranking.
- Catálogo Free, Pro y Premium en `config/plans.study.json`. En la aplicación solo está activo el uso local, equivalente a Free. Pro y Premium se muestran como funciones futuras. No hay cobro.

## Diseñado y no construido

- Sincronización entre dispositivos, cuentas y autorización en servidor (`engine/billing.mjs` y los esquemas de suscripción). El código de permisos tiene pruebas, pero no hay backend.
- Tutor, ejecución aislada de código y práctica profesional.
- Stripe. El catálogo lo deja apagado a propósito.
- Service worker y caché offline.
- Apuntes HTML de la chuleta como lecciones.
- Temarios de DAW, SMR, ASIR, IA, Python, JavaScript, Git y proyectos. En la interfaz salen como «Próximamente».
- Rediseño visual. La interfaz actual es clara y propia. La estética de circuitos, cian y violeta no está hecha.

## Arquitectura

- `src/`: pantallas y almacenamiento en el navegador.
- `engine/learning.mjs` y `engine/learning21.mjs`: repaso, puntuación y dominio.
- `engine/progress-file.mjs`: copia de progreso, versión 1.
- `engine/xp.mjs`: experiencia y racha.
- `engine/billing.mjs`: permisos del modelo de planes, sin cobro.
- `schemas/` y `examples/`: contrato de contenido de la fase 0. El ejemplo `ad01` sigue atado a la fuente 2.0.
- `content/bank.json`: banco que usa la aplicación.
- `sources/`: los dos HTML de Mi Chuleta se quedan solo en el ordenador. `.gitignore` impide subirlos. No hacen falta para instalar, arrancar ni pasar las pruebas de la copia pública. Si están, una prueba extra compara el banco con ellos.

La pregunta única de Acceso a Datos vale +1 / −0,33. La múltiple no tiene fórmula escrita: la pantalla ofrece reparto proporcional, +1/−1 o sin penalización, y lo marca como interpretación.

## Contenido disponible

| Asignatura | Preguntas | Qué hay |
| --- | --- | --- |
| Acceso a Datos | 107 | Preguntas, explicaciones por opción, simulacro |
| Sistemas de gestión empresarial | 90 | Preguntas, sin la regla de examen de AD |
| Digitalización | 43 | Preguntas nuevas de la 2.1 |
| Programación de servicios y procesos | 35 | Autoevaluación, sin opciones corregidas |
| Diseño de interfaces | 30 | Preguntas, sin explicación por opción |
| Programación multimedia | 0 | Diccionario en la fuente, sin ruta de preguntas |
| Programación 1.º | 0 | Doce términos de diccionario |
| Bases de datos 1.º | 0 | Diccionario |

Los apuntes largos y el calendario de exámenes no están en el banco.

## Problemas conocidos

Están detallados en `KNOWN_ISSUES.md`. Los que importan para seguir:

- Sin `npm run dev` la aplicación no arranca. No hay caché offline.
- Entregar un simulacro con preguntas en blanco las deja pendientes de repaso.
- La nota del simulacro no es una nota oficial.
- En el banco público, las referencias a una práctica o carpeta concretas se han sustituido por un enunciado genérico. La pregunta no cambia de objetivo.

## Prioridad siguiente

1. Los HTML de Mi Chuleta se quedan en local y fuera de Git. El banco público ya no depende de ellos.
2. Preparar Programación de 1.º DAM para enero de 2027. Hoy solo hay diccionario: no inventar preguntas.
3. No cambiar la arquitectura ni aplicar todavía el rediseño futurista.

El orden más largo está en `ROADMAP.md`.
