# 1. El Eslogan: 10/10
> *"El juego de estrategia honesto, profundo y táctico que respeta tu tiempo y tu bolsillo."*

Es **perfecto**. No le cambies ni una coma.
* **"Honesto":** Ataca directo el dolor del jugador contra las microtransacciones basura.
* **"Profundo y táctico":** Filtra a los jugadores casuales de *Candy Crush* y atrae al público maduro de ajedrez, *Polytopia* y *Antiyoy*.
* **"Respeta tu tiempo y tu bolsillo":** Justifica que las partidas duren 15 minutos y que se pague una sola vez.

# 2. Mejoras de Interfaz:
1. Mejorar la información de estadísticas y de la partida final. 

Agregar el tiempo jugado en la partida.

2. Multiidioma (Traducir a 49 Idiomas de ser necesario)

Agregar la ayuda y mensajes en todos los idiomas según el diccionario.

3. Ir a la siguiente unidad para no dejar unidades sin acción (unidades con las dos activas)
Las deserciones parecen no funcionar.

# 3. Mejoras del Motor:

1. Partidas en Red.

	Que sea funcional hoy no es real.
	
2. Mapas en red. 

		Hoy noes real el desafio diario. 
		Hoy no es real jugar mapas de jugadores.
		Hoy no es eral jugar mapas propios.

3. 	Interacción con otros jugadores 		
		Hoy no es real que puedas evaluarte con respecto a la comunidad. 
		Hoy las estadísticas son una mierda que no indica nada.

	1. **Repositorio de Mapas de la Comunidad Real:**  
	En vez de copiar un código de texto largo en WhatsApp, cuando un jugador pulsa *"Publicar"* en tu Editor (Punto 10), el juego envía un JSON diminuto a una base de datos gratuita. En el menú de "Mapas de la Comunidad", cualquier jugador puede ver una lista con los mapas más votados y tocarlos para jugar con un solo clic.
	2. **Leaderboard del Desafío Diario Real:**  
	Al ganar el desafío del día, el juego manda una sola fila a la tabla: `[NombreTribu, Turnos, Fecha]`. El ranking global del día se calcula solo y devuelve el Top 50 mundial.
	3. **Coste mensual para ti:** **$0.00 USD**. Ambas plataformas ofrecen hasta 50,000 lecturas diarias gratuitas, más que suficiente para tus primeros 30,000 jugadores.

# 4. Propuestas de Redes: 
		
	V.I. El Gancho Visual de TikTok y YouTube Shorts: 
	
	Clip: Una IA enemiga con un ejército gigante avanzando hacia tu ciudad.
	Texto en pantalla para la prueba en modo Campaña: "Cuando cortas las líneas de suministro en vez de pelear de frente en mi juego de estrategia."

	V.II Página web con una wiki información del juego, su potencial, una ventana de la comunidad y honestidad. 
	
	V.III. El Asalto a Reddit y Comunidades de Resistencia
	
		Dónde: r/AndroidGaming, r/iosgaming, r/turnbasedstrategy, r/indiegames.

		El mensaje que funciona (Cero tono corporativo):
		"Hola a todos. Cansado de que los juegos de estrategia en móvil sean clones de Clash of Clans llenos de anuncios de 30 segundos y micropagos abusivos, he pasado los últimos meses programando HexFrontier. Es un micro-4X por turnos con líneas de suministro implacables estilo Antiyoy, pero donde tú forjas tu propia civilización. La demo es 100% gratis, sin anuncios obligatorios, y el juego completo cuesta una sola compra de $3 USD. Me encantaría que la comunidad de estrategia me dé su feedback honesto."
	
Tu estrategia de redes, precios y posicionamiento está **en el camino del éxito**:
* El clip de **TikTok de 15 segundos cortando carreteras** es dinamita pura para el algoritmo.
* El post de **Reddit en `r/AndroidGaming`** con ese texto honesto y transparente tiene un 90% de probabilidades de llegar a la portada del subreddit si lo acompañas de un GIF limpio en pixel art.


# 5. Capitalización: 

	Fijas el precio base oficial en $5.99 USD.
	
		Pagina Web para jugar desde web.
		Google Play / Playstore. 
			Cuando el jugador supera el Nivel 3 del Acto I de la Campaña (momento de máxima dopamina, cuando acaba de entender lo divertido que es cortar suministros), le aparece una tarjeta limpia con estética de pergamino:
			“Has demostrado dotes de mando. Desbloquea la experiencia completa por el Precio de Estreno de $2.99 USD (Precio regular: $5.99 USD). Disponible durante tus primeros días en la frontera.”
			**El "Timing de Dopamina" para la oferta de $2.99 en el Nivel 3:**
   			* Poner la oferta justo al terminar el nivel donde aprendes a cortar suministros es **psicología de conversión pura**. El jugador acaba de experimentar la satisfacción de asfixiar a una IA y tiene el cerebro lleno de dopamina; es el segundo exacto donde su resistencia al pago es mínima.

	
		HTML5 Canvas y JavaScript, puedes meterlo dentro de Electron y publicarlo en Steam por 5.99USD
			Descuento de Lanzamiento (Launch Discount): 25% a 4.49 USD.
			Descuentos de temporada: 						a 4.99 USD.
				
		El mismo jugador, la misma cuenta, en las 4 Plataformas. (Web, Apple Playstore, Google Play, Steam) 
		👉 **La solución real que sí funciona:**
			* **Diferencia "Cross-Buy" de "Cross-Save":**
  			* **Cross-Save (Guardado cruzado):** Sí. El jugador puede mover su partida y su tribu entre el móvil y el PC mediante los códigos de exportación en la nube.
  			* **Compra por tienda:** Se cobra en cada plataforma según su valor (PC en Steam a $5.99 porque incluye todo; móvil a descarga gratis + $2.99 IAP). Es exactamente lo que hace *Polytopia* y nadie se queja.

	* La escala de precios (**$5.99 anclaje $\to$ $2.99 oferta de bienvenida tras el Nivel 3**) es la fórmula que mejor convierte en el ecosistema móvil.

# 6. SISTEMA FREEMIUM, BARRERAS DE PAGO Y BANNER DE $2.99 (`js/progress.js`, `js/screens.js`, `js/game.js`)

### Requerimiento
Implementar la lógica de cuenta `Free` vs `Premium`:
* `HF.isPremium()`: Lee de `HF.store.get('is_premium', false)`.

### Restricciones para Usuarios Gratuitos:
1. **Campaña:** El Acto I (Niveles 1 al 6) es gratuito. Intentar abrir los Actos II, III, IV o V bloquea la entrada y abre el modal de compra.
2. **Nueva Partida:** Los mapas de tamaño "Enorme" (`R=18`) están bloqueados con un candado 🔒. Solo se permiten mapas Pequeños y Medianos.
3. **Editor de Mapas:** Se permite pintar y jugar localmente, pero el botón `[📤 Exportar Código]` está bloqueado con candado para usuarios Free.

### El Banner Oportuno ($2.99 USD) tras el Nivel 3:
* En `game.js`, dentro de `showEnd()`:
  * Si `g.mode === 'campaign'` y `g.meta.idx === 2` (Nivel 3 del Acto I, el nivel donde el jugador corta suministros por primera vez) y `!HF.isPremium()`:
  * Disparar un modal emergente con estética de pergamino dorado antes de volver al menú:
    ```html
    <h3>👑 Has demostrado dotes de mando</h3>
    <p>Desbloquea los 30 niveles de Campaña, mapas Enormes y el Editor completo por el <b>Precio de Estreno de $2.99 USD</b> (Precio regular: $5.99 USD).</p>
    <button class="pri big" id="buyUnlock">Desbloquear Todo ($2.99)</button>
    <button id="closePromo">Continuar Gratis</button>
    ```
  * Al pulsar `buyUnlock`, simular la compra exitosa fijando `HF.store.set('is_premium', true)` y actualizando la interfaz inmediatamente.

---

# 7. INFRAESTRUCTURA REAL PARA DESAFÍO Y MAPAS (`js/network.js` o API Client)

### Requerimiento
Dejar de depender exclusivamente de copiar y pegar cadenas Base64 a mano y de semillas desconectadas.

### Implementación: Módulo de Conexión Ligero (`HF.cloud`)
Crear un archivo o módulo cliente que consuma una API REST gratuita (como Supabase o Firebase REST con clave pública):
1. **Mapas de la Comunidad Reales:**
   * `HF.cloud.getCommunityMaps(callback)`: Realiza un `fetch` que devuelve los 20 mapas más votados (`id`, `name`, `author`, `code`, `votes`).
   * `HF.cloud.publishMap(name, code, author)`: Envía el mapa validado a la base de datos pública.
   * En `editor.js`: Sustituir la necesidad de copiar códigos al portapapeles por una pestaña *"Comunidad"* que liste estos mapas y los cargue con un solo clic en `[▶ Jugar]`.
2. **Ranking del Desafío Diario Real:**
   * Al ganar el desafío del día, enviar: `{ date: YYYYMMDD, tribe: name, turns: N, surplus: S }`.
   * En `screens.js` (pantalla `daily`), mostrar la tabla con el Top 20 de mejores jugadores del día en tiempo real.
   * *Modo de Contingencia:* Si el `fetch` falla por falta de internet en menos de 1 segundo, activar silenciosamente el fallback local actual sin congelar la app.

---


2. `js/screens.js`, `js/game.js` y `js/progress.js`: Bloqueo de contenido Free/Premium y modal de compra a $2.99 en el Nivel 3.