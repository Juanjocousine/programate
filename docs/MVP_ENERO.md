# MVP de Programación de 1.º DAM

## Auditoría inicial

La base es el commit `a584f59318dbaba8c197f183737784e6ddb80cea`. Se revisaron el traspaso, la arquitectura, el estado, los problemas conocidos, el banco y el flujo de estudio. La base arrancó en Vite y se verificaron Inicio, Rutas, Practicar, Simulacro de Acceso a Datos, Progreso y Planes en Chromium. Pasaron 38 pruebas y la validación. La comparación opcional con los HTML privados quedó omitida porque esos archivos están excluidos del proyecto.

La aplicación conserva Vite, TypeScript sin framework, el registro de progreso en el navegador, los motores de puntuación, XP, dominio y repaso, el catálogo de planes y el banco 2.1 de 305 preguntas. El piloto se integra en memoria a partir de `content/java-pilot.json`, con identificadores propios. Sigue siendo posible abrir copias de progreso anteriores.

## Arranque

Requiere una versión de Node compatible con Vite 7, como Node 22.12 o superior en la serie 22.

```sh
npm ci
npm run dev
npm test
npm run validate
npm run build
```

Abre la dirección que indica Vite. El panel permite continuar una lección o sesión, buscar temas y acceder a las asignaturas, repasos y exámenes. Un perfil nuevo parte con cero actividad. Los porcentajes de la ruta salen del motor de dominio y contemplan las unidades pendientes del itinerario.

## Contenido y evaluación

- Banco DAM 2.1: preguntas y explicaciones existentes, sujetas a los niveles de revisión declarados en sus datos originales.
- Piloto original provisional: algoritmos, variables, operadores, condicionales y bucles, con tres ejercicios por unidad. Los cinco ejemplos se ejecutaron con OpenJDK 21 durante la validación. Queda pendiente la revisión pedagógica y la adaptación al temario oficial.
- Diez unidades aún requieren lección y ejercicios. Ficheros depende del temario oficial. El JSON define las unidades y sus grupos.
- La pista aparece tras el primer error en una pregunta del piloto. El reintento inmediato se registra con la marca de reintento del motor y no suma XP ni dominio. El resultado de los simulacros es orientativo. Acceso a Datos conserva sus reglas y opciones originales.
- Enero y febrero de 2027 son meses de planificación. La fecha exacta y el programa de examen requieren confirmación.

Referencias de Java para contrastar el piloto: [Language Basics](https://dev.java/learn/language-basics/) y [Java Language Specification 21](https://docs.oracle.com/javase/specs/jls/se21/html/).

## Laboratorio y planes

El laboratorio corrige actividades de análisis y de completar código mediante respuestas predefinidas. El editor guarda un borrador local. Free, Pro y Premium siguen siendo planes de estudio de catálogo.

La futura ejecución de Java requerirá un servicio independiente. Un servidor autorizará cada trabajo y reservará su cuota antes de enviarlo a una cola. Un proceso efímero por trabajo compilará y ejecutará el código con límites de CPU, memoria, tiempo, procesos y salida, sistema de archivos de solo lectura salvo un directorio temporal y red deshabilitada. Se destruirá el entorno al terminar y se devolverá al cliente únicamente el resultado autorizado y acotado. El control de permisos y los límites se aplicarán en el servidor y en el ejecutor.
