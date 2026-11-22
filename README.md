# Programate

Aplicación local para estudiar programación. Esta versión carga el banco de Mi Chuleta DAM 2.1, guarda el progreso en el navegador y no tiene cuentas ni pagos.

Tecnologías: Node.js 20, Vite 7, TypeScript y JavaScript sin framework de interfaz. El contenido se valida con Ajv. No hay base de datos ni backend.

Los archivos `sources/MiChuleta_DAM_2.0.html` y `sources/MiChuleta_DAM_2.1.html` se quedan solo en el ordenador. Están en `.gitignore`, igual que `sources/privacy-needles.local.txt`. El banco de `content/bank.json` basta para estudiar, y las pruebas se ejecutan sin esos HTML. Si los HTML están junto al proyecto, una prueba adicional los compara con el banco.

## Requisitos

Node.js 20 o superior, en Windows.

## Instalar

En PowerShell, dentro de esta carpeta:

```powershell
npm install
```

## Abrir la aplicación

```powershell
npm run dev
```

Vite escribe una dirección local, normalmente `http://localhost:5173/`. Ábrela en el navegador. Para parar el servidor, Ctrl+C.

El progreso queda en ese navegador. Exportarlo está en Progreso.

## Probar

```powershell
npm test
```

Ejecuta las pruebas del motor, de los planes, del archivo de progreso y del banco, y después la validación de esquemas. Tiene que terminar sin fallos.

Solo la validación de esquemas y planes:

```powershell
npm run validate
```

## Documentos

- `MIGRATION_2_1.md`: qué hay en la 2.1 y qué se ha integrado.
- `IMPLEMENTATION_STATUS.md`: qué hace esta versión.
- `KNOWN_ISSUES.md`: límites conocidos.
- `NEXT_STEPS.md`: qué conviene hacer después.
- `HANDOFF_CODEX.md`: qué está hecho y qué solo está diseñado.
- `ROADMAP.md`: prioridades hasta 2027. El plan técnico anterior sigue en `docs/ROADMAP.md`.
- `docs/`: visión, arquitectura, esquema, motor y seguridad de la fase 0.
