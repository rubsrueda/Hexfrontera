# Cierre — Multijugador (21-11-2026)

## Implementado
- Copiado de código con confirmación visual, aviso temporal y respaldo `execCommand` si falla Clipboard API.
- "Mis salas" persistente con identidad de jugador por sala, estado, turno y reentrada; conserva membresía al volver a la lista y tras recargar.
- Salas públicas, búsqueda rápida y lista de partidas públicas disponibles.
- Sala privada conservada, con opción de rellenar asientos libres con rivales IA y entrar directamente.
- Nueva configuración de visibilidad pública/privada al crear una sala.
- Bots marcados como facciones IA en el tablero multijugador.

## Integración
- Cambios de cliente: `js/online.js`, `js/screens.js`.
- Esquema y RPC: `sql/hf_multiplayer.sql`.
- Supabase requiere ejecutar el SQL actualizado para habilitar las RPC públicas, de salas guardadas y bots.
- La migración no elimina tablas/partidas existentes. "Volver a Mis salas" conserva la membresía; la lista busca primero en el navegador y luego en Supabase.
- Ver pasos de configuración en `supabase/README.md` → Multijugador.

## Validación
- Validación automatizada local no ejecutable en esta PC porque Node.js/npm no están disponibles.
- Mensajes de conectividad distinguen navegador sin red, timeout, fallo de red/CORS, dominio bloqueado y permisos HTTP; ya no presentan todo fallo de Supabase como "offline".
- Tras la aplicación del SQL por el usuario, `ping`, `fn_hf_list_public_rooms` y `fn_hf_list_my_rooms` respondieron correctamente en el navegador compartido.
- Se creó una sala privada de prueba con un bot, se abrió el tablero y se terminó un turno: Supabase y la interfaz avanzaron al turno 2.
- Quedan pendientes las pruebas de copia, reentrada y partida entre dos jugadores reales, así como las pruebas automatizadas.
