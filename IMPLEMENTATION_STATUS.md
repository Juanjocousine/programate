# Estado de la implementación

20 de noviembre de 2026. La aplicación se abre en local. No hay servidor, cuentas, pagos ni tutor.

## Qué funciona

- Banco 2.1 completo: 305 preguntas, 32 conceptos, 40 conceptos finos, 278 términos, 29 explicaciones, 10 confusiones, 9 seguimientos y 28 reglas. Los apuntes HTML no van dentro.
- Motor de repaso con la regla de no subir la caja el mismo día del fallo, dominio por concepto fino, preparación de examen separada, errores recurrentes, prioridad de lo flojo e historial de simulacros.
- Pantallas: Inicio, Rutas, concepto, Practicar, sesión, Simulacro de Acceso a Datos, Repaso, Mi progreso y Planes.
- Rutas con preguntas: Acceso a Datos, Diseño de interfaces, SGE, PSP y Digitalización. Java reúne los conceptos que ya existen dentro de Acceso a Datos. Programación y Bases de datos son solo diccionario. DAW, SMR, ASIR, IA, web, Python, JavaScript, Git y proyectos salen como «Próximamente», sin lecciones falsas.
- El progreso se guarda solo en `localStorage`, clave `programate.progress`. Se eligió `localStorage` porque el registro es JSON pequeño (tope de cálculo: 10.000 respuestas) y es el mismo mecanismo que la chuleta. No hace falta IndexedDB.
- Exportar, importar con confirmación, rechazo de JSON roto y apartado de la copia dañada.
- XP, nivel, objetivo diario opcional y racha. Un acierto repetido el mismo día no da XP. No hay ranking.
- Planes leídos de `config/plans.study.json`. Free es el uso real. Pro y Premium se muestran como más adelante. Los precios están marcados como importes de estudio.

## Pruebas

`npm test`: 38 pruebas en verde y validación de contenido correcta. Antes había 21; se han añadido las de la 2.1, el archivo de progreso y el banco.

Recorrido en Chrome automatizado (no es un teléfono ni Safari ni Firefox): abrir inicio, entrar en Acceso a Datos, responder una pregunta real, ver la corrección, recargar y conservar el registro, entregar un simulacro, abrir progreso, repaso y planes. Cero errores de consola en ese recorrido.

## Cómo está partido

- `engine/`: reglas, sin interfaz.
- `content/bank.json`: contenido.
- `src/`: pantallas.
- `sources/`: HTML intactos.
