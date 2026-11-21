# QA post-migración — Android y Steam

**Agente:** tester  
**Cuándo:** después de que empaquetado entregue APK debug y build Steam Windows.

- Ejecutar `npm test`, `npm run build` y `npm run check:secrets` en la raíz; registrar resultados.
- Instalar el APK en emulador/dispositivo y probar arranque, partida, movimiento/combate, guardado/reanudación, controles táctiles y modo sin conexión.
- Probar Steam Windows: arranque, partida, guardado al cerrar y persistencia al reabrir; revisar consola/errores críticos.
- Reportar por plataforma lo probado, dispositivo/entorno, fallos reproducibles y bloqueos. No inferir publicación/SteamPipe ni firma desde una build debug.

**Aceptación:** pruebas automatizadas y checklist de cada build con resultado explícito; defectos críticos tienen pasos de reproducción.
