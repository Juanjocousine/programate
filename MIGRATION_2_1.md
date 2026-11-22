# Migración de Mi Chuleta DAM 2.1

Comprobado el 20 de noviembre de 2026 sobre las copias locales. No se ha modificado ninguno de los HTML originales.

## Archivos congelados

| Versión | Copia | Bytes | SHA-256 |
| --- | --- | --- | --- |
| 2.0 | `sources/MiChuleta_DAM_2.0.html` | 799.428 | `30499b3f39a302c5cf476f03053e13e2969e9574864aee2cf778d49d820007b8` |
| 2.1 | `sources/MiChuleta_DAM_2.1.html` | 2.247.609 | `035c02bad4c217f1101f6928a0a7b1af7e7c56aae03b6bb2fdf6f06f26dad351` |

La 2.1 declara `ver: "2.1"`. El campo de la fuente es 305 preguntas. El recuento del programa da 305, no se ha aceptado la cifra sin leer el archivo.

## Preguntas

- 305 en la 2.1. 220 en la 2.0.
- Añadidas: 85. Eliminadas: 0.
- Las 220 antiguas siguen con el mismo id. El único campo nuevo en esas 220 es `sc` (concepto fino). Enunciado, opciones, respuesta y explicaciones no cambian.
- Por asignatura en la 2.1: Acceso a Datos 107 (antes 89), SGE 90 (antes 66), Digitalización 43 (nueva), DI 30, PSP 35.
- Tipo: 227 de opción y 78 de autoevaluación.
- Los 43 ids `dig1_01` … `dig3_14` no cabían en el patrón antiguo `ad|ad-n|di|sge|psp`. El esquema ahora también admite `dig` + dígitos + `_` + dígitos. No se han renombrado.
- Hay 0 ids duplicados y 0 preguntas aisladas por no validar.

Cuatro enunciados (`ad34`, `ad41`, `ad51`, `sge223`) hablan en segunda persona de una práctica o de una carpeta. Es el texto del examen, así que siguen en el banco local con `localContext`. No se publican.

## Resto del banco

| Bloque | 2.1 | Decisión |
| --- | --- | --- |
| Conceptos | 32 | Se añaden `sge.E`, `dig.q1`, `dig.q2`, `dig.q3`. Ninguno se borra ni cambia de texto |
| Conceptos finos `sc` | 40 | Nuevos. Entran en la aplicación |
| Diccionario | 278 | Idéntico a la 2.0 |
| Explicaciones `K` | 29 | Entran |
| Confusiones | 10 | Entran |
| Seguimientos de código | 9 | Entran |
| Reglas | 28 | Entran |
| Pares síntoma/causa | 22 | Entran |
| Apuntes HTML `docs` | crecen mucho | No entran. Mezclan temario, hojas de examen y comentarios de prácticas |
| Fechas `when`, `wl`, `how` | personales | No entran |

El diccionario de Programación (1.º) y de Bases de datos sigue sin preguntas. La aplicación los enseña como glosario.

## Motor

La 2.1 mantiene intervalos 0, 1, 3, 7, 14 y 30 días, la clave `mcdam2.progress` y el día local. Cambia el dominio:

- Un acierto el mismo día del fallo, o un reintento marcado `rt`, no sube la caja.
- El dominio fino no cuenta los reintentos.
- Hace falta acertar en dos días distintos para el nivel alto.
- La preparación de examen solo mira simulacros, nunca la práctica suelta.
- Desaparece la «nota estimada» como si fuera probabilidad. En la interfaz no se muestra.
- La múltiple de Acceso a Datos sigue sin una fórmula escrita. La aplicación deja elegir reparto proporcional, +1/−1 o sin penalización, y lo etiqueta como interpretación. La única de AD sigue en +1 / −0,33.

El progreso de la chuleta es el esquema 3 y migra desde 1 y 2 dentro de aquel HTML. Programate guarda en otra clave, `programate.progress`, versión 1. Importar un JSON de la chuleta copia respuestas y simulacros, y pide confirmación antes de reemplazar.

## Esquema de la fase 0

El ejemplo `ad01` y el validador contra la 2.0 no se han tocado. El banco completo vive en `content/bank.json`, generado por `tools/extract-bank.mjs`, fuera del paquete de ejemplo. Lo que no encaja no se ha borrado: queda en `content/isolated.json` (hoy vacío).

## Qué no debe salir de este ordenador

Los dos HTML, el banco y el progreso. No hay licencia declarada. Hay nombre y apellidos en los apuntes, que por eso no van en la aplicación. No se ha publicado ni se ha hecho commit.