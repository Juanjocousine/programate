# Motor de aprendizaje

La especificación ejecutable está en `engine/learning.mjs`. Las pruebas están en `engine/learning.test.mjs`. Describen el comportamiento de Mi Chuleta DAM 2.0. No es un algoritmo distinto.

El progreso es un registro de eventos. La caja de repaso, el vencimiento y el nivel se calculan recorriendo el registro en orden de tiempo. Así se puede exportar, unir y volver a calcular sin una segunda fuente de verdad.

## Evento

Cada respuesta guarda:

- `t`: marca de tiempo en milisegundos.
- `id`: id de la pregunta, como máximo 40 caracteres.
- `r`: `o` acierto, `k` fallo, `b` en blanco.
- `m`: `apr`, `err`, `due`, `cod` o `sim`.
- `sc`: puntos guardados, entre −1 y 1.
- `s` y `c`: módulo y concepto, opcionales pero útiles si la pregunta desapareciera del banco.
- `sf: 1` solo en la autoevaluación. Esas respuestas no entran en la nota estimada.

Al unir dos registros se conservan las respuestas cuya pareja `t` + `id` no esté ya. El tope del registro en la aplicación actual es 10.000 eventos.

## Repaso espaciado

Intervalos, en días: 0, 1, 3, 7, 14, 30. La caja va de 0 a 5.

- Acierto: sube la racha. Si ese día local todavía no había subido, la caja avanza un peldaño, como máximo hasta 5, y el vencimiento queda a `intervalo[caja]` días. Un segundo acierto el mismo día no mueve la caja ni el vencimiento.
- Fallo: caja a 0, racha a 0, vence ahora.
- En blanco: la caja baja un peldaño, sin bajar de 0, y vence ahora.

El día es la fecha local del dispositivo, igual que en la fuente. El plazo suma múltiplos de 86.400.000 ms, no «el mismo reloj del día siguiente». En un cambio de hora esas dos cuentas no coinciden. Se conserva así para no cambiar el comportamiento ya usado. Cambiarlo sería una decisión nueva.

Una pregunta nunca vista no está vencida. El repaso de hoy solo incluye preguntas ya respondidas cuyo vencimiento ha llegado. Las nuevas salen en una sesión de aprender, no en la cola de repaso. Con el registro vacío, la chuleta propone empezar por 10 preguntas de opción de Acceso a Datos.

## Nivel de una pregunta

- 0 si no hay respuestas, o si la última no fue un acierto.
- 1 si la caja es al menos 1 y la última respuesta fue un acierto.
- 2 si la caja es al menos 3 y la última fue un acierto. La interfaz lo llama «Dominado».

Eso es dominio de una pregunta, no de un concepto.

## Dominio de un concepto

Con el registro de ese concepto:

- Sin respuestas: nivel 0.
- Nivel 2 solo si hay al menos 3 respuestas, la precisión de las últimas 10 es 0,8 o más, y al menos la mitad de sus preguntas (redondeando hacia arriba) están en nivel de pregunta 2.
- Si no llega a eso y la precisión reciente es 0,5 o más: nivel 1.
- En otro caso: nivel 0.
- Con menos de 3 respuestas, la interfaz debe decir que hay pocos datos.

Un concepto es débil si tiene al menos 2 respuestas y la precisión de las últimas 10 es menor que 0,7. Se ordena por `(1 − precisión) × min(respuestas, 10)`.

El dominio es del concepto. Las dos rutas leen el mismo estado.

## Qué pregunta toca

La sesión adaptativa puntúa cada candidata y toma la mayor. Con el azar de la fuente (de 0 a 5) y estas sumas:

- Nunca vista: +12. Si el concepto tiene precisión reciente menor que 0,6, +10 más.
- Ya vista y vencida: +30, y hasta +20 según los días de retraso (2 puntos por día, tope 20).
- Última respuesta distinta de acierto: +25.
- Nivel 2 y todavía no vencida: −20.
- Respondida hace menos de una hora: −15.
- Precisión reciente del concepto: `+20 × (1 − precisión)`, también si la pregunta es nueva.
- Misma concepto que la pregunta anterior de la sesión: −8.

El azar desempata. Las pruebas fijan el azar en 0 para poder afirmar el resto.

## Puntuación

Hay dos momentos y no hay que mezclarlos.

**Simulacro.** Usa la regla de la pregunta.

- AD, una respuesta: acierto 1, fallo −0,33, blanco 0.
- AD, varias: acierto exacto 1. Marcar todas las opciones cuenta como blanco. Un acierto parcial reparte `aciertos / correctas − fallos / incorrectas`, limitado a [−1, 1] y redondeado a dos decimales. La fuente llama a ese reparto interpretación, porque la frase documentada es «múltiple +1 / −1», no la fórmula.
- Otra asignatura: acierto 1, cualquier otra cosa 0.
- La nota sobre 10 del simulacro es `max(0, redondeo(puntos / preguntas × 100) / 10)`. No baja de 0.

**Aprender, errores, repaso y código.** El acierto o el fallo se clasifican con la misma regla, pero el punto que se guarda es 1 o 0. No se guarda el −0,33. La nota estimada usa los puntos guardados de las últimas 30 respuestas que no sean autoevaluación, y solo si hay al menos 20. Se limita a 0–10. La propia interfaz avisa de que repetir preguntas conocidas la infla y de que no es la nota del examen.

## Qué no hace el motor

No elige el calendario de exámenes. No ejecuta código. No llama a un modelo. No sube el progreso a ningún sitio.

## Reglas añadidas desde la versión 2.1

`engine/learning21.mjs` y el cambio de `applyAnswer` siguen el archivo 2.1, no un diseño nuevo. Las pruebas de la 2.0 siguen pasando.

- Un acierto el mismo día de un fallo, o con la marca de reintento `rt`, no sube la caja. Cuenta como recuerdo de hoy. El dominio del concepto fino ignora los eventos con `rt`.
- El nivel fino de un subconcepto va de 0 a 3. El 3 exige al menos tres intentos reales, 80 % reciente, aciertos en dos días distintos y la última respuesta correcta. El nivel del concepto es la media de sus subconceptos.
- La preparación de examen solo lee simulacros cuyo tipo no sea repaso de errores. Cero simulacros es «sin datos», uno es «poco» y a partir de dos es una orientación. No es una probabilidad.
- La pregunta única de Acceso a Datos sigue en +1 / −0,33. La múltiple puede configurarse: reparto proporcional, +1/−1 o sin penalización. Las dos primeras múltiples se etiquetan como interpretación.
- En la práctica la puntuación guardada es 1 o 0.
- La experiencia no suma si el acierto es un reintento, si es el mismo día del fallo o si esa pregunta ya se acertó hoy.

La nota estimada de la 2.0, hecha con ejercicios sueltos, ya no se muestra como preparación. Sigue en el código por las pruebas antiguas y no sale en la interfaz.

