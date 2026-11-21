# Cierre técnico — Fase 4 (21-11-2026)

## Estado

- **Web:** el usuario reporta prueba funcional manual en navegador sin errores aparentes. No equivale a pruebas automatizadas.
- **Entorno:** esta PC corporativa no permite instalar Node.js/npm ni Android SDK por falta de privilegios administrativos. Es un bloqueo temporal de entorno; el proyecto se migrará a otra computadora.
- **Pruebas/builds:** `npm test`, `npm run build`, APK y Steam no se ejecutaron ni están verificados. Fase 4 se cierra como auditoría estática y checklist inicial, no como certificación de beta nativa.

## Empaquetado estático

- **Steam Windows x64:** `wrappers/package.json` declara `npm run steam` → stage + Electron Builder `--win --x64 --dir`; salida configurada: `wrappers/dist/win-unpacked/`. `electron-builder.yml` requiere `wrappers/build/icon.ico` (ICO); no fija dimensiones en píxeles. Falta `wrappers/build/` y también los iconos `.icns`/`.png` para los targets macOS/Linux. No hay manifiestos/configuración SteamPipe/depot ni comando de publicación; son necesarios para publicar, no para generar la carpeta local.
- **Android:** Capacitor está declarado (`appId` `com.hexfrontier.game`, `webDir` `www`, dependencias y scripts `cap:add:android`/`cap:android`). No existe `wrappers/android/`, Gradle wrapper, APK/AAB ni configuración de firma. La carpeta nativa debe generarse y sincronizarse en el otro equipo. No hay lockfile de dependencias en `wrappers/`; esto afecta la reproducibilidad, no la configuración base del flujo.

## Continuación tras migración

1. `empaquetado`: preparar runtime/JDK/SDK y dependencias, añadir el icono Windows, generar Android y construir APK debug y carpeta Steam; registrar salidas y bloqueos.
2. `tester`: ejecutar pruebas automatizadas/build web; instalar y probar APK y Steam con checklist jugable; separar resultados de debug y release.

Las tareas están en `Actividades/actividades_pendientes/`. No guardar keystores, contraseñas ni credenciales en el repositorio.
