# Seguridad y datos

## Qué hay que proteger

La fuente es material de estudio de una persona. Incluye un nombre en el prompt del tutor, fechas de examen, rutas de carpetas y nombres de prácticas. El paquete de ejemplo no copia el prompt ni el calendario. Cita, porque es el texto de la fuente, la frase de Programación de 1.º que dice que los apuntes todavía no están cargados.

`sources/MiChuleta_DAM_2.0.html` queda en este directorio para poder comprobar la migración. No está autorizado a publicarse. La ficha de la fuente tiene `personalData: true`, `license: "unspecified"` y `redistribution: "not-cleared"`. El validador rechaza marcar como redistribuible una fuente con datos personales o sin licencia.

Hasta que haya una decisión de licencia y una copia sin datos personales, no se crea un remoto ni un sitio público.

## Autenticación

El MVP no tiene cuentas. El progreso no sale del dispositivo, salvo que la persona exporte el JSON. No hay contraseñas, cookies de sesión ni proveedor de identidad que configurar.

Una sincronización posterior, si se autoriza, debería:

- separar el contenido público o de centro de los datos personales;
- poder unir registros sin pedir la caja de Leitner, porque se recalcula;
- permitir borrar el registro y llevarse una copia antes;
- no usar el nombre que hoy está escrito en el prompt de la chuleta.

No se elige proveedor en esta fase. Elegirlo sería abrir un servicio.

## Contenido que entra de fuera

Claude, o un script, puede proponer un paquete. Antes de incorporarlo:

- tiene que cumplir los esquemas;
- las preguntas legadas tienen que coincidir con la fuente;
- no puede declararse revisado;
- no se acepta HTML con `script`;
- un ejercicio de escribir código sin runtime aislado es inválido.

El estado `reviewed` lo pone una persona después de leer el paquete. `verified-by-execution` tampoco lo pone el modelo: hace falta una ejecución real, y esa ejecución todavía no existe.

## Ejecución de código

En el MVP no se ejecuta código del alumno. Las preguntas «de código» son de opción: se lee un fragmento y se elige. Eso no abre un proceso.

Cuando exista un ejecutor, el esquema ya exige `runtime: "isolated-worker"` para `write-code`. Ese worker, cuando se construya, tiene que cumplir todo esto a la vez:

- proceso o máquina distinta de la PWA, con tiempo, memoria y salida limitados;
- sin red, sin secretos y sin acceso al progreso ni al sistema de archivos de la persona;
- el código del alumno no se envía a un servicio de terceros como camino por defecto;
- un fallo del ejecutor no ejecuta el código en el hilo de la página «para que al menos funcione».

Compilar en el navegador, o reenviar el código a una API gratuita, no cumple esa condición. No se activa ninguna de las dos sin una decisión expresa.

## Tutor

El tutor completo es posterior. Cuando exista, la pregunta y los fragmentos citados salen del paquete ya revisado. No se manda el HTML entero, ni el registro de progreso, ni un nombre fijo dentro del prompt. Tiene que poder decir que no lo sabe. La chuleta actual solo funciona dentro del entorno de Claude y no es el diseño a copiar.

## Superficie de esta fase

No hay servidor, formulario ni clave. `npm install` descarga el validador Ajv, que es una dependencia de desarrollo. No hay telemetría. El registro de ejemplo en `examples/progress/` es una ficha falsa (`fixture: true`), no una respuesta de nadie.
