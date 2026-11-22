# Hoja de ruta

La fase 0 termina en este repositorio. No sigue sola hacia el MVP: antes hacen falta las respuestas de la última sección.

## Fases

### 0. Fundación

Documentos, esquemas, un ejemplo fiel a la fuente, validador y motor con pruebas. Sin interfaz y sin despliegue.

Criterio de aceptación: `npm test` pasa; el hash del HTML coincide; el ejemplo no cambia ningún id ni ningún texto académico; un paquete automático no puede marcarse como revisado.

### 1. MVP

Depende de la fase 0 y de saber la licencia, el alcance real de Fundamentos de Java y si el simulacro debe usar la frase +1/−1 o el reparto proporcional.

Incluye:

- extraer Acceso a Datos y los conceptos de Java que ya están en la fuente;
- las dos rutas, compartiendo conceptos;
- lecciones que solo citan ese material;
- práctica, repaso vencido, simulacro y progreso local con exportación;
- PWA de una columna, con tema, tamaño de letra y uso táctil y de teclado.

No incluye cuentas, ejecutor, tutor ni cobro. Quien abra la PWA estudia con lo que el catálogo llama Free, sin servidor. No rellena el temario de 1.º que la fuente declara ausente.

Criterio de aceptación: una persona puede estudiar el concepto de muestra en las dos rutas, fallar una pregunta, verla vencer según el motor, cerrar el navegador y recuperar el registro. La misma comprobación en un ancho de móvil y en uno de escritorio. El validador sigue pasando. No hay servicio desplegado.

### 2. Resto del material ya presente

DI, SGE, PSP y los apuntes de PMDM, después de revisión. DI y SGE no traen explicación por opción. PSP son autoevaluaciones sin explicación guardada. Lo que redacte un modelo entra como `needs-review`.

Criterio de aceptación: cada pregunta migrada coincide con su id y su enunciado, o está retirada sin borrar el id.

### 3. Cuentas, sincronización y permisos

Solo con autorización explícita de coste y de proveedor. El evento de progreso no cambia. El servidor resuelve el catálogo: sin suscripción de pago, el plan efectivo es Free. Las funciones medidas responden `quota` o `not-included` y no llaman a un proveedor. Stripe sigue apagado.

Criterio de aceptación: dos dispositivos con permiso `progress.sync` unen registros sin duplicar la misma respuesta. Una cuenta Free sigue viendo sus lecciones, sus tests y su repaso. Un intento de tutor o de ejecución no sale del servidor y no descuenta dos veces la misma reserva.

### 4. Ejecutor aislado

Depende del contrato de `exercise`, del permiso `code.runs` y de `docs/SECURITY.md`. Hasta entonces, `write-code` no es publicable.

Criterio de aceptación: sin reserva de cupo no hay proceso. Un programa que intenta salir del límite de tiempo, de memoria o de red no afecta a la PWA ni al progreso, y el código no se envía a un tercero. Agotar el cupo deja el estudio local intacto.

### 5. Tutor

Depende de un banco revisado y del permiso `tutor.turns`. Responde citando ese banco.

Criterio de aceptación: una pregunta fuera del banco obtiene una negativa clara. El prompt no incluye el registro de progreso ni datos personales de la fuente. Sin cupo, no hay llamada al modelo.

### 6. Otros ciclos y la ruta web

DAW, SMR, ASIR, IA, Big Data y el tramo de aplicaciones web completas. Cada uno espera su fuente. No se adelanta el temario. Entrar en un ciclo nuevo no depende del plan: el contenido fundamental sigue en Free.

### 7. Suscripción individual

Solo después de una autorización expresa para contratar Stripe y asumir el coste. Hasta ese momento no se instala el SDK, no se crean claves y no se publica un precio. El trabajo, cuando toque, es el adaptador: Checkout, webhooks firmados, renovación, fallo de pago, gracia, cancelación al fin del periodo y cambio de plan. Los importes dejan el estado `study` y pasan a `published` con su `stripePriceId`. El presupuesto mensual global tiene que tener un número antes de activar el cobro.

Criterio de aceptación: un pago confirmado por webhook cambia el plan efectivo; un mensaje del navegador no lo cambia. Un impago fuera de gracia vuelve a Free y el registro de respuestas sigue completo. `npm test` sigue rechazando un catálogo que se declare listo para cobrar sin presupuesto y sin precios publicados.

### 8. Centros educativos

Diseñada y apagada (`organizations.implemented: false`). Cuando se abra: organización, plazas, contacto de facturación y el permiso más amplio entre la plaza y la suscripción personal. Salir del centro no borra el aprendizaje.

Criterio de aceptación: con la bandera en falso, una plaza de centro no modifica los permisos. Con la bandera en verdadero, en una prueba posterior, la plaza suma permisos y el registro permanece.

## Dependencias

- La fase 1 no empieza mientras el ejemplo no valide.
- Publicar, aunque sea un sitio estático, depende de la licencia y de sacar los datos personales de la copia que se suba.
- El ejecutor, el tutor y el cobro no bloquean el MVP.
- Activar Stripe depende de la fase 3 y de una autorización distinta. Los centros dependen de que el resolutor de permisos ya exista.
- Partir el concepto único de DI en varios conceptos es un cambio de ids de concepto. No bloquea Acceso a Datos y no se hace dentro de la extracción mecánica.

## Prioridad

1. Proteger ids, textos y datos personales.
2. Tener el banco de AD y el Java ya existente en las dos rutas.
3. Poder estudiar sin red y sin cuenta.
4. Después, sincronizar con permisos en el servidor, ejecutar y preguntar a un tutor dentro del cupo.
5. Cobrar solo cuando el catálogo deje de ser de estudio y haya autorización. El paso a Free conserva el progreso.

## Preguntas que bloquean la fase 1

1. ¿El nombre público del producto es Programate?
2. ¿Esta copia del HTML puede salir de este ordenador? Hoy la recomendación es que no: no hay licencia y hay datos de estudio personales. Un remoto, si lo hubiera, tendría que ser privado y no debería servir el HTML tal cual.
3. ¿El MVP lo usa una persona, un grupo de clase o cualquiera?
4. ¿Quién es autor del banco y de los apuntes, y con qué licencia se pueden transformar?
5. ¿El texto oficial de los resultados de aprendizaje lo vas a aportar desde el currículo, o dejamos solo etiquetas como RA2 mientras no esté?
6. Fundamentos de Java: ¿el MVP se limita al Java que ya está dentro de Acceso a Datos y a los 12 términos de Programación, o vas a traer otra fuente para el resto?
7. En las preguntas múltiples de AD, ¿el simulacro debe aplicar +1/−1 como frase cerrada, o el reparto proporcional que el código marca como interpretación?
8. ¿Confirmas que el MVP no tiene cuentas ni servidor y que el progreso se queda en el dispositivo hasta nueva autorización?
9. ¿DI, PSP, SGE y los apuntes de PMDM se conservan en el repositorio aunque no sean rutas del MVP?
10. ¿La interfaz del MVP sigue en español de España, como la aplicación actual?

La fase 1 sigue sin cuentas y sin cobro. Estas preguntas no la bloquean; bloquean la fase 7:

11. ¿Los importes de estudio (0 €, 6,99 € y 12,99 € al mes) sirven como punto de partida cuando se publique el precio, o hay que cambiar el catálogo antes?
12. ¿Free debe seguir con cero turnos de tutor y cero ejecuciones, para no generar coste, o quieres una cuota de prueba?
13. ¿Desde qué país y con qué IVA se emitiría el cobro?
14. Cuando existan centros, ¿la factura es por plaza o por centro cerrado?
