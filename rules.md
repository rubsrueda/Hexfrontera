# ESPECIFICACIÓN FUNCIONAL Y PRUEBAS: PROYECTO HEXFRONTIER
> **Instrucción de Ejecución:** Este documento contiene las especificaciones completas del juego híbrido (control territorial determinista estilo *Antiyoi* + desarrollo de tribus y ciudades estilo *Hexonia*). Cada componente está compuesto por una **Definición** técnica y su respectiva **Prueba** de verificación. Implementa el código cumpliendo estrictamente estas pruebas de aceptación.

## 0. Introducción 

Al diseñar el juego tal como lo tenemos ahora, **hemos encontrado un "Océano Azul" (un espacio vacío en el mercado)** que ninguno de esos cuatro gigantes está cubriendo. 

Aquí tienes el análisis estratégico de producto de por qué este juego tiene **fuerza comercial real para destacar:**

### 1. El Mapa del Mercado: ¿Dónde fallan los gigantes?

| Juego | ¿Qué hace bien? | ¿Dónde se equivoca o aburre? |
| :--- | :--- | :--- |
| **Antiyoy** | Tensión táctica brutal, líneas de suministro implacables, partidas rápidas. | **Es un juego sin alma:** eres un color plano, no hay identidad, no hay recursos reales, no hay personalización. Es casi un puzle matemático abstracto. |
| **Polytopia / Hexonia** | Arte carismático, exploración con niebla, tribus coleccionables. | **El combate es tedioso:** golpear barras de vida (HP) por turnos, contraataques molestos. **Las fronteras no importan:** puedes atravesar el mapa sin preocuparte por tus líneas de suministro. Las tribus son fijas y no las puedes modificar. |
| **Civilization** | Profundidad infinita, historia viva, mil formas de ganar. | **Es inasumible para el jugador moderno:** partidas de 8 a 20 horas, 50 menús flotantes, imposible de disfrutar en un trayecto de metro de 15 minutos en móvil. |

### 2. Los 3 Pilares que hacen a TU JUEGO único (Tus "Killers Features")

#### Pilar A: "Logística Implacable" (Lo que Polytopia nunca se atrevió a hacer)
En *Polytopia* o *Hexonia*, si mandas un soldado al otro lado del mapa, no le pasa nada. 
En **HEXFRONTIER**, el mapa es un organismo vivo: si el enemigo maniobra con un jinete y corta el hexágono que conecta a tu ejército con su ciudad, **tus tropas quedan aisladas y empiezan a desertar**. 
* **Por qué vende:** Introduce la adrenalina del ajedrez y del cerco militar en partidas de 15 minutos. No gana el que tiene el ejército más grande, sino el que sabe cortar carreteras y asfixiar al rival.

#### Pilar B: La Forja de Identidad (Tú no compras una tribu, tú eres el creador)
En *Hexonia* tienes que jugar como ellos diseñaron a los vikingos o a los romanos. 
En **HEXFRONTIER**, mediante tus 3 decisiones de Credo (*Alma, Arma, Victoria*):
* La jugadora que quiere **hacer casitas y relajarse** construye su bastión, cultiva trigo y gana construyendo la **Maravilla/Monumento**.
* El jugador agresivo forja una **horda nómada** que vive de quemar pastos y estrangular líneas de suministro.
* El jugador calculador crea una **legión pesada** que avanza lenta como un muro.
* **Por qué vende:** El sentido de pertenencia (*ownership*). Nadie dice *"jugué con la tribu A"*, dicen *"gané con MI civilización, con mis colores y mi filosofía"*.

#### Pilar C: "Cero Fricción: Todo Ocurre en el Tablero"
Al eliminar el árbol de tecnología y concentrar todo en:
1. **La cuadrícula de 6 capas** (Terreno, Recursos, Asentamientos, Unidades).
2. **Los dos cajones de pulgar** (`[⛺]` y `[💂]`).
* **Por qué vende:** El juego se siente como un juego de mesa físico moderno (estilo *Catan* o *Through the Breach* cruzado con *Slay*). El jugador nunca abandona el tablero. No hay pantallas de carga de árboles de ciencia, no hay menús infinitos. Es pura táctica con una sola mano.

---

### 3. El Posicionamiento de Producto: ¿Quién va a jugar a esto?

Tu público objetivo existe y hoy está insatisfecho:

       [ALTA PROFUNDIDAD / IDENTIDAD]
                     │
                     │       ★ HEXFRONTIER (Tu juego)
                     │       (Profundo, identitario, 15 min, táctico)
       Civilization  │
                     │
─────────────────────┼─────────────────────► [PARTIDAS RÁPIDAS / MÓVIL]
                     │  Polytopia / Hexonia
                     │  (Rápido, pero combate con HP y tribus rígidas)
                     │
       Antiyoy       │
       (Puro puzle,  │
        cero alma)   │
       [BAJA IDENTIDAD / MATEMÁTICO]

1. **El jugador quemado de Polytopia:** Que ya se cansó de partidas donde gana el que spamea más gigantes o arqueros y busca un combate limpio, determinista y con maniobras reales de cerco.
2. **El fan de Antiyoy:** Que ama la mecánica de cortar provincias y la bancarrota, pero siempre soñó con un juego que tuviera recursos reales (comida, madera, oro), barcos, asedio y una civilización propia.
3. **El jugador de PC/Móvil que no tiene 5 horas para Civilization:** Que quiere la sensación de progreso de un imperio histórico, pero que su vida solo le deja jugar 15 minutos antes de dormir.

### Veredicto Estratégico

**Sí tiene espacio, y un espacio enorme.** 

No estamos compitiendo por ver quién hace el árbol de tecnología más largo ni el 3D más pesado. Estamos creando **el juego de control territorial táctico y suministros definitivo**, con una identidad visual pixel art impecable y una libertad de civilización que nadie en móvil está ofreciendo hoy.

Haber quitado el árbol de tecnología fue la decisión más inteligente del proyecto: **dejaste de ser un clon de *Hexonia* para convertirte en una bestia propia.**


## 1. ARRANQUE Y PANTALLA DE ACCESO INICIAL (BOOT & TITLE)

### 1.1. Carga Limpia, Layout y Puerta de Entrada (Hub Principal)

┌────────────────────────────────────────────────────────┐
│ [🏆 Desafío Diario]                  [📢 Noticias/RRSS]│  <-- Live Ops & Social
│                                                        │
│                      HEXFRONTIER                       │  <-- Logotipo / Cabecera
│                                                        │
│               ┌────────────────────────┐               │
│               │   CONTINUAR (Turno X)  │               │
│               └────────────────────────┘               │
│               ┌────────────────────────┐               │  <-- Zona Central:
│               │        CAMPAÑA         │               │      Botones de Texto
│               └────────────────────────┘               │      (Acceso Rápido)
│               ┌────────────────────────┐               │
│               │     NUEVA PARTIDA      │               │
│               └────────────────────────┘               │
│                                                        │
│  [🛡️ Tribu]   [🗺️ Editor]   [📊 Stats]   [⚙️ Ajustes]   │  <-- Dock Inferior:
└────────────────────────────────────────────────────────┘      Iconos Pixel Art 32-bit


* **Definición:** Al ejecutar la aplicación, el motor inicializa la vista principal en orientación vertical/adaptable en menos de 2 segundos. La pantalla distribuye la interfaz en cuatro zonas con jerarquía diferenciada:

  1. **Esquinas Superiores (Acciones Secundarias / Live):**
     * **Superior Izquierda (Badge interactivo):** "Desafío Diario". Muestra un icono de trofeo pixel art y un contador regresivo de días restantes. Carga el mapa comunitario destacado de la semana.
     * **Superior Derecha (Icono pixel art):** "Noticias". Abre un panel modal emergente con enlaces directos a las comunidades oficiales (Reddit, TikTok, Discord, etc.).

  2. **Cabecera Central:**
     * Logotipo estilizado con la tipografía oficial: "HEXFRONTIER".

  3. **Área Central (Botones Principales de Texto):**
     * **Botón "Continuar":** Reanuda la última partida guardada (destacado con borde luminoso si existe guardado; atenuado y no interactivo si no existe).
     * **Botón "Campaña":** Accede al mapa de progresión de niveles estandarizados.
     * **Botón "Nueva Partida":** Abre la configuración de escaramuzas personalizadas contra la IA.

  4. **Dock Inferior (Barra de Utilidades - Iconos Pixel Art de 32 bits):**
     * **Icono "Tribu" (Escudo/Estandarte):** Abre el editor persistente de la facción del jugador.
     * **Icono "Crear Mapas" (Pincel/Hexágono):** Accede al editor de mapas y herramientas de exportación/importación.
     * **Icono "Estadísticas" (Gráfico/Trofeo):** Abre el historial del jugador (partidas ganadas, hexágonos conquistados, tribus derrotadas).
     * **Icono "Ajustes" (Engranaje):** Abre el menú de configuración de audio (SFX/Música) e idioma.

* **Prueba:**
  1. **Prueba de Carga y Ergonomía Visual:**
     * Abro la aplicación en un dispositivo móvil.
     * **Resultado esperado:** Los tres botones centrales de texto ocupan el área central cómoda para los pulgares; la barra inferior muestra los 4 iconos de 32 bits perfectamente alineados y nítidos (sin pixel-blur o escalado borroso); el título queda despejado en la parte superior.
  2. **Prueba del Modal de Noticias:**
     * Pulso el icono de "Noticias" en la esquina superior derecha.
     * **Resultado esperado:** Se despliega un modal centrado con los botones de redes sociales externas y un botón "Cerrar (X)"; el juego queda en pausa de fondo.
  3. **Prueba de Persistencia en el Dock Inferior:**
     * Pulso el icono de "Tribu", realizo un cambio estético y vuelvo atrás.
     * **Resultado esperado:** La transición de vuelta al menú principal es instantánea y el icono de "Tribu" refleja visualmente el nuevo color o blasón guardado.
  4. **Prueba del Desafío Diario Offline:**
     * Desconecto el dispositivo de la red y pulso "Desafío Diario".
     * **Resultado esperado:** La aplicación no crashea; detecta ausencia de red y carga una semilla local de desafío Diario por defecto, indicando en pantalla el mensaje *"Jugando en modo Desconexión"*.


### Mapa de Opciones a Desarrollar:
1. **🛡️ Tribu (Dock Inferior):** El editor de civilización, personalización estética, blasones y asignación de rasgos/doctrinas.

2. **⚔️ Campaña (Botón Central):** Estructura del mapa de niveles, condiciones de victoria/desbloqueo y progresión fija.
3. **🎲 Nueva Partida (Botón Central):** Generador de partidas personalizadas (tamaño de mapa, biomas, cantidad de IAs rivales y condiciones de escaramuza).

	**Continuar, seguimos en el último punto que estábamos y se guardó.

4. **🗺️ Crear Mapas (Dock Inferior):** El editor de cuadrícula hexagonal, paleta de herramientas (biomas, ciudades, niebla) y exportación/importación.
5. **🏆 Desafío Diario (Superior Izquierda):** Sistema de rotación, semilla de mapa comunitario y registro de puntuación.
6. **📊 Estadísticas:** Métricas registradas 
7. **⚙️ Ajustes (Dock Inferior):** configuración del sistema.
8. **📢 Noticias (Superior Derecha):** Modal y redirecciones externas.

## 2. DOCK: SISTEMA "TRIBU" (EL ÁRBOL DE JERARQUÍA PROFUNDA)

Este planteamiento busca una narrativa (Systemic Storytelling). 
Que la creaciónde una civilización no se sienta como una hoja de cálculo,
sino como un dilema ético y existencial que escribe la historia de tu pueblo.

1. La Calibración Matemática y de Alcance (Advertencia PMO)

Si cada rama tiene 3 niveles jerárquicos donde cada decisión se bifurca en 3
opciones:

  - Nivel 1: 3 opciones.
  - Nivel 2: 3 \times 3 = 9 caminos.
  - Nivel 3: 9 \times 3 = 27 identidades finales por rama.

Si combinas Alma (27) \times Arma (27) \times Victoria (27), el espacio
resultante no son 729... ¡son 19.683 civilizaciones posibles!

La Trampa de Producción: Si intentamos programar 27 mecánicas de código únicas
para el Alma, 27 para el Arma y 27 para la Victoria (27 + 27 + 27 = 81
subsistemas aislados), el proyecto tardará 3 años en programarse y será
imposible de balancear.

La Solución Maestra (Arquitectura Modular por Modificadores):
Para que esto sea programable en minutos por un equipo de agentes de IA,
cada decisión debe tocar los mismos 5 cables del motor de juego (cambiando su
comportamiento binario: Activa regla A / Desactiva regla B):

1.  Física del Territorio: ¿La ciudad se mueve? (Sí/No/Por Agua).
2.  Línea de Suministro: ¿Cómo calcula el grafo la pérdida de conexión?
    (Distancia / Corte / Inexistente).
3.  Motor Económico: ¿De dónde viene el oro? (Granjas fijas / Saqueo / Interés
    en banco).
4.  Resolución de Frente: ¿Quién gana la casilla? (Fuerza bruta / Apoyo
    adyacente / Disparo a distancia).
5.  Condición de Disparador (Trigger): ¿Qué evento dispara la pantalla de
    victoria? (Conquista / Turnos resistidos / Oro acumulado).

	
2. El Espejo de las 3 Ramas (Alma, Arma y Victoria)

Para que el sistema sea simétrico, las otras dos ramas deben seguir exactamente
la misma pureza conceptual de 3 Dilemas Consecutivos que diseñaste para el Alma:

┌────────────────────────────────────────────────────────────────────────┐
│                        EL PRISMA DE CIVILIZACIÓN                       │
├─────────────────────┬──────────────────────────┬───────────────────────┤
│    RAMA 1: ALMA     │      RAMA 2: ARMA        │   RAMA 3: VICTORIA    │
│   (¿Cómo existes?)  │     (¿Cómo luchas?)      │    (¿Cómo ganas?)     │
├─────────────────────┼──────────────────────────┼───────────────────────┤
│ 1. Espacio          │ 1. Composición de Fuerza │ 1. Horizonte Temporal │
│   (Tierra/Mar/Nómada)│   (Masa/Élite/Distancia) │   (Rush/Medio/Lento)  │
│ 2. Cohesión         │ 2. Maniobra y Logística  │ 2. Foco del Conflicto │
│   (Ley/Fe/Casta)    │   (Lenta/Relámpago/Embosc)│ (Militar/Econ/Monum) │
│ 3. Alteridad        │ 3. Impacto de Choque     │ 3. Criterio de Gracia │
│   (Integr/Enclave/  │   (Aniquilación/Asedio/  │   (Rendición/Extinción│
│    Sustitución)     │    Estrangulamiento)     │    /Trascendencia)    │
└─────────────────────┴──────────────────────────┴───────────────────────┘

### 2.1. Arquitectura de Selección: El Cuestionario de los 3 Dilemas
* **Definición:** La configuración de la civilización se resuelve mediante un árbol de navegación de 3 niveles de profundidad con 3 opciones para cada uno de los 3 Pilares (*Alma, Arma, Victoria*).
  * El jugador no ve las 27 combinaciones finales de golpe.
  * La interfaz presenta un flujo secuencial: elegir Nivel 1 desbloquea 3 sub-opciones contextuales para el Nivel 2, y esta a su vez despliega las 3 hojas del Nivel 3.
  * Cada elección aplica el principio de **"Puerta que se abre, puerta que se cierra"**: otorga una regla operativa activa (`Rule_Override_True`) y anula otra regla básica del juego (`Rule_Disabled`).

* **Prueba:**
  1. Entro en el editor de "Tribu" y pulso en el pilar "Alma".
  2. **Resultado esperado:** En pantalla solo se muestran 3 tarjetas iniciales: `[A1] Raíz Terrestre`, `[A2] Flujo Oceánico` y `[A3] Dispersión Móvil`. Las opciones de Nivel 2 y 3 no son visibles aún.
  3. Selecciono `[A1] Raíz Terrestre`.
  4. **Resultado esperado:** La pantalla realiza un zoom suave hacia adelante; la tarjeta `[A1]` queda como nodo padre en la parte superior y se despliegan en abanico las 3 opciones de cohesión: `[A1.1] Burocracia`, `[A1.2] Teocracia` y `[A1.3] Casta Feudal`.

### 2.2. Ejecución Mecánica del Árbol
* **Definición:** El motor procesa las decisiones del Alma alterando los métodos de generación de ingresos, cálculo de grafos y gestión de poblaciones según la siguiente tabla de estados:


Aquí tienes el **Catálogo Maestro Completo de las 3 Ramas (Alma, Arma y Victoria)** con sus **27 hojas finales por rama** (81 nodos finales en total).

Está diseñado con una columna adicional clave para el motor de juego: **`Tag / Variable del Motor`**, lo que permite exportar este catálogo directamente a un archivo `JSON` o base de datos que el código de la partida pueda leer, validar y ejecutar sin hardcodear lógica aislada.

---

#### CATÁLOGO DE DOCTRINAS SISTÉMICAS: PROYECTO HEXFRONTIER

---

##### RAMA A: EL ALMA (Economía, Demografía y Territorio)

###### A1. Raíz Terrestre (Sedentario)
*Las ciudades son fijas. Gran desarrollo de infraestructura y acumulación agrícola.*

| Nodo ID | Nombre | Regla Abierta (`Bonus / Mecánica On`) | Regla Cerrada (`Sombra / Mecánica Off`) | Tag / Variable de Motor |
| :--- | :--- | :--- | :--- | :--- |
| **A1** | **Raíz Terrestre** | Desbloquea Granjas Avanzadas ($+3$ oro/turno). | Las ciudades no pueden desmantelarse ni moverse. | `CIV_TYPE_SEDENTARY` |
| **A1.1** | ↳ **Burocracia** | Cada 4 casillas conectadas a la capital dan $+1$ oro. | Fundar nuevas ciudades cuesta $+25\%$ acumulativo. | `GOV_BUREAUCRACY` |
| **A1.1.1** | ↳ ↳ **Integración Universal** | Las casillas capturadas conservan sus granjas intactas. | Caer en déficit provoca revuelta: casillas se vuelven neutrales. | `INTEGRATION_PRESERVE` |
| **A1.1.2** | ↳ ↳ **Enclave de Explotación** | Recursos naturales (minas/bosques) dan doble rendimiento. | Las casillas capturadas no generan lealtad si no hay tropa encima. | `EXTRACTIVE_ENCLAVE` |
| **A1.1.3** | ↳ ↳ **Sustitución Demográfica** | Las casillas propias son 100% inmunes a revueltas y cortes. | Casilla capturada arde: inutilizable durante 3 turnos. | `SETTLER_PURGE` |
| **A1.2** | ↳ **Teocracia Monumental** | Unidades dentro del territorio tienen $+1$ de defensa moral. | El árbol de tecnología cuesta un $+50\%$ de oro extra. | `GOV_THEOCRACY` |
| **A1.2.1** | ↳ ↳ **Devoción Fanática** | Las tropas en bancarrota no desertan durante 2 turnos. | Al 3er turno de déficit, el 100% del ejército desaparece de golpe. | `ZEALOT_MARTYRDOM` |
| **A1.2.2** | ↳ ↳ **Herejía Inquisitorial** | Eliminar una unidad enemiga en tu tierra otorga $+10$ de oro. | No puedes firmar pactos de no agresión ni comerciar. | `INQUISITION_PURITY` |
| **A1.2.3** | ↳ ↳ **Ascetismo Agrario** | Granjas y templos tienen coste de mantenimiento cero. | Prohibido el reclutamiento de unidades Tier 3 (Paladines). | `ASCETIC_COMMUNE` |
| **A1.3** | ↳ **Casta Feudal** | La infantería pesada se recluta un 20% más barata. | Los hexágonos sin granja aportan $0$ de oro (sin impuestos civiles). | `GOV_FEUDAL_NOBILITY`|
| **A1.3.1** | ↳ ↳ **Servidumbre Hereditaria** | Reparar y construir granjas cuesta la mitad de oro. | El radio de visión de la niebla de guerra se reduce a 1 casilla. | `SERFDOM_CHAIN` |
| **A1.3.2** | ↳ ↳ **Orden de Caballería** | Los Jinetes cuentan como defensores pesados (Defensa 2). | El coste de mantenimiento de caballería se duplica. | `KNIGHTLY_ORDER` |
| **A1.3.3** | ↳ ↳ **Señorío Fortificado** | Torres y castillos se construyen en 1 turno sin coste de acción. | Las tropas tardan 2 turnos en cruzar del feudo a tierra neutral. | `FORTIFIED_ESTATE` |

---

###### A2. Flujo Oceánico (Talasocrático)
*El poder radica en los mares, ríos y el comercio ribereño.*

| Nodo ID | Nombre | Regla Abierta (`Bonus / Mecánica On`) | Regla Cerrada (`Sombra / Mecánica Off`) | Tag / Variable de Motor |
| :--- | :--- | :--- | :--- | :--- |
| **A2** | **Flujo Oceánico** | Embarcar no consume turno; casillas de agua dan $+1$ oro. | Granjas a $>2$ casillas del agua producen $-1$ oro. | `CIV_TYPE_THALASSOCRACY` |
| **A2.1** | ↳ **Talasocracia Mercantil** | Rutas comerciales de agua dan un $+15\%$ del oro global. | Las tropas terrestres sufren deserción acelerada tierra adentro. | `GOV_MARITIME_TRADE` |
| **A2.1.1** | ↳ ↳ **Rutas de la Seda Marina** | Cada puerto conectado a otra ciudad da $+3$ de oro. | Bloquear una casilla marina corta el suministro de toda la red. | `SILK_SEA_ROUTE` |
| **A2.1.2** | ↳ ↳ **Monopolio Portuario** | Comprar barcos y puertos cuesta 30% menos. | Prohibida la construcción de Torres de Asedio terrestres. | `PORT_MONOPOLY` |
| **A2.1.3** | ↳ ↳ **Factoría Costera** | Se pueden fundar factorías en islas neutrales al instante. | Las factorías no defienden por sí mismas; requieren flotas. | `COASTAL_FACTORY` |
| **A2.2** | ↳ **Asalto Corsario (Vikingo)**| Saquear una casilla costera roba el 100% de su producción. | Tus ciudades tienen un $50\%$ menos de muralla/defensa natural. | `GOV_CORSAIR_RAID` |
| **A2.2.1** | ↳ ↳ **Pillaje de Riberas** | Desembarcar y quemar una granja otorga $+15$ de oro inmediato.| Las casillas saqueadas no pueden anexionarse a tu imperio. | `SHORE_PILLAGE` |
| **A2.2.2** | ↳ ↳ **Drakkars Temerarios** | Los barcos pueden atacar casillas de tierra a 1 hexágono. | Si el barco es destruido, todas las tropas a bordo mueren. | `DRAKKAR_STRIKE` |
| **A2.2.3** | ↳ ↳ **Fuego de Ensenada** | Prender fuego a un puerto enemigo bloquea su tesorería 1 turno.| Mantenimiento naval el triple de caro en aguas heladas. | `COVE_BLAZE` |
| **A2.3** | ↳ **Comunidades Anfibias** | Las marismas y pantanos cuentan como casillas de llanura fértil.| No se pueden construir caminos de piedra terrestres. | `GOV_AMPHIBIOUS` |
| **A2.3.1** | ↳ ↳ **Marismas Sagradas** | El enemigo sufre penalización de movimiento al pisar tu pantano.| Las ciudades en pantano crecen un $30\%$ más lento. | `SACRED_SWAMP` |
| **A2.3.2** | ↳ ↳ **Flota Doméstica** | Cada barco en tu costa genera $+1$ de comida y estabilidad. | Los barcos fuera de tus fronteras sufren atrición constante. | `HOME_FLOTILLA` |
| **A2.3.3** | ↳ ↳ **Aislamiento Isleño** | Ciudades en islas son inmunes a sabotajes y catapultas. | Mover tropas entre islas cuesta 3 de oro por unidad. | `ISLAND_SANCTUARY` |

---

###### A3. Dispersión Móvil (Nómada / Fronterizo)
*La civilización no echa raíces. Se desplaza, desmantela y vive de la estepa.*

| Nodo ID | Nombre | Regla Abierta (`Bonus / Mecánica On`) | Regla Cerrada (`Sombra / Mecánica Off`) | Tag / Variable de Motor |
| :--- | :--- | :--- | :--- | :--- |
| **A3** | **Dispersión Móvil** | La Capital es un campamento móvil que se desplaza 1 hex/turno. | Prohibida la construcción de murallas de piedra y torres. | `CIV_TYPE_NOMAD` |
| **A3.1** | ↳ **Clan Pastoril** | Cada hexágono libre de árboles y estructuras da $+1$ comida. | Construir granjas fijas está bloqueado por dogma. | `GOV_PASTORAL_CLAN` |
| **A3.1.1** | ↳ ↳ **Trashumancia Estacional**| Mover el campamento a un nuevo bioma da $+20$ oro inmediato. | Quedarse quieto en el mismo sitio $>4$ turnos genera atrición. | `SEASONAL_MIGRATION` |
| **A3.1.2** | ↳ ↳ **Yurtas Desmontables** | Empacar y mover una estructura cuesta solo 1 punto de acción. | Las estructuras desmontadas son vulnerables a ser capturadas. | `PACKABLE_YURTS` |
| **A3.1.3** | ↳ ↳ **Rebaños Libres** | Los rebaños capturan automáticamente hexágonos neutrales adyacentes.| Los rebaños son eliminados al contacto con una tropa enemiga.| `WILD_HERDS` |
| **A3.2** | ↳ **Horda de Choque** | Cortar una línea de suministro otorga $+5$ de oro por casilla aislada.| Ciudades capturadas deben ser saqueadas; no se pueden retener.| `GOV_HORDE_SHOCK` |
| **A3.2.1** | ↳ ↳ **Economía del Botín** | El 80% de tus ingresos provienen de matar tropas rivales. | Los ingresos fijos por hexágono propio se reducen a 0. | `BOOTY_ECONOMY` |
| **A3.2.2** | ↳ ↳ **Terror Psicológico** | Capturar una capital enemiga hace huir a las tropas vecinas.| Si sufres una derrota decisiva, el 50% de tus jinetes desertan.| `TERROR_DOCTRINE` |
| **A3.2.3** | ↳ ↳ **Tributo a Galope** | Las facciones menores te pagan 2 oro/turno si no las atacas.| Si dejas de mover tropas en su frontera, el pacto se cancela.| `TRIBUTE_RIDERS` |
| **A3.3** | ↳ **Guerilla Silvana** | Las tropas son invisibles en bosques y colinas hasta atacar. | En terreno despejado/llanura pierden $-1$ en defensa. | `GOV_FOREST_GUERRILLA`|
| **A3.3.1** | ↳ ↳ **Red de Guías** | Mover tropas por terreno difícil no consume puntos extra. | No puedes reclutar unidades de asedio pesado ni arietes. | `SCOUT_NETWORK` |
| **A3.3.2** | ↳ ↳ **Tierra Quemada** | Retirarse de una casilla la reduce a cenizas (inútil 4 turnos).| Solo puedes recuperar esa casilla si la limpia un colono. | `SCORCHED_EARTH` |
| **A3.3.3** | ↳ ↳ **Emboscada Fronteriza** | Atacar desde un bosque ignora la defensa del rival. | Atacar a una ciudad fortificada duplica el daño recibido. | `BORDER_AMBUSH` |

---

##### RAMA B: EL ARMA (Doctrina Militar y Tácticas)

###### B1. Fuerza Pesada y Línea de Frente (Lógica Romana / Falange)
*Infantería blindada, formaciones cerradas, avance aplastante.*

| Nodo ID | Nombre | Regla Abierta (`Bonus / Mecánica On`) | Regla Cerrada (`Sombra / Mecánica Off`) | Tag / Variable de Motor |
| :--- | :--- | :--- | :--- | :--- |
| **B1** | **Fuerza Pesada** | La infantería adyacente comparte bono defensivo ($+1$ defensa mutua).| Solo mueven 1 casilla por turno en cualquier terreno. | `TACTIC_HEAVY_LINE` |
| **B1.1** | ↳ **Disciplina de Legión**| La infantería no sufre penalización al defender contra caballería.| Cuesta un $+30\%$ de oro extra investigar caballería. | `MIL_LEGION_DISCIPLINE`|
| **B1.1.1** | ↳ ↳ **Testudo Impenetrable** | Inmunes a ataques a distancia (arqueros) si están en grupo de 3.| En formación Testudo no pueden atacar, solo resistir. | `TESTUDO_SHIELD` |
| **B1.1.2** | ↳ ↳ **Guardia de Élite** | Las unidades Tier 3 pueden fusionarse en Tier 4 (Pretoriano).| Solo se puede tener un Pretoriano activo a la vez. | `PRAETORIAN_GUARD` |
| **B1.1.3** | ↳ ↳ **Castramentación** | Unidades de infantería pueden erigir un fuerte provisional.| Construir el fuerte consume la acción de la unidad por 2 turnos.| `CASTRAMETATION` |
| **B1.2** | ↳ **Enjambre de Leva** | Las unidades Tier 1 cuestan la mitad de oro (5 en vez de 10). | Su fuerza defensiva es 0 si no tienen apoyo adyacente. | `MIL_LEVY_SWARM` |
| **B1.2.1** | ↳ ↳ **Picas Comunales** | Los reclutas destruyen a la caballería si son cargados de frente.| Vulnerables al máximo frente a proyectiles a distancia. | `PIKE_WALL` |
| **B1.2.2** | ↳ ↳ **Sacrificio de Vanguardia**| Al morir un recluta, debilita la defensa enemiga en $-1$. | Mueren automáticamente si su línea de suministro es cortada. | `VANGUARD_SACRIFICE` |
| **B1.2.3** | ↳ ↳ **Marea Campesina** | Puedes mover hasta 3 reclutas a una misma casilla para fusionar gratis.| Mantener más de 10 reclutas reduce ingresos agrícolas un 20%. | `PEASANT_TIDE` |
| **B1.3** | ↳ **Ingeniería de Sitio**| Las catapultas destruyen murallas y torres a 2 casillas de distancia.| Las máquinas de asedio requieren 1 turno de ensamblaje (inmóviles).| `MIL_SIEGE_ENGINEERING`|
| **B1.3.1** | ↳ ↳ **Balística Incendiaria** | Los proyectiles prenden fuego a las granjas enemigas impactadas.| Consume 2 de oro de munición por cada disparo ejecutado. | `INCENDIARY_BALLISTICS`|
| **B1.3.2** | ↳ ↳ **Zapadores Minadores** | Ignora defensas de empalizada cruzando por debajo del hexágono.| Si el zapador es detectado antes de detonar, muere al instante.| `MINING_SAPPERS` |
| **B1.3.3** | ↳ ↳ **Foso Circundante** | Rodear una ciudad enemiga bloquea todo su reclutamiento.| Mantener el cerco inmoviliza a las tropas asediadoras. | `CIRCUMVALLATION` |

---

###### B2. Guerra de Maniobra y Caballería (Mongola / Mameluca)
*Velocidad extrema, hostigamiento, flanqueo constante.*

| Nodo ID | Nombre | Regla Abierta (`Bonus / Mecánica On`) | Regla Cerrada (`Sombra / Mecánica Off`) | Tag / Variable de Motor |
| :--- | :--- | :--- | :--- | :--- |
| **B2** | **Guerra de Maniobra**| Los jinetes avanzan 2 casillas en terreno hostil (en vez de 1). | La caballería no puede capturar hexágonos con murallas/ciudades.| `TACTIC_MOBILE_WAR` |
| **B2.1** | ↳ **Hostigadores a Caballo**| Atacan a 2 casillas de distancia usando arcos ecuestres. | Su coste de mantenimiento por turno es de 5 monedas (caros). | `MIL_HORSE_ARCHERS` |
| **B2.1.1** | ↳ ↳ **Disparo Parto** | Disparan a distancia y pueden retroceder 1 hexágono tras el tiro.| Si son acorralados contra el borde del mapa, mueren sin luchar.| `PARTHIAN_RETREAT` |
| **B2.1.2** | ↳ ↳ **Lluvia de la Estepa** | 3 jinetes disparando a la misma casilla aniquilan la tropa enemiga.| Agotan sus flechas: requieren volver a territorio amigo en 3 turnos.| `STEPPE_BARRAGE` |
| **B2.1.3** | ↳ ↳ **Círculo de Hostigamiento**| Los jinetes adyacentes a un enemigo le reducen la defensa a 0.| Sufren un $100\%$ más de daño si son emboscados en bosques. | `CANTABRIAN_CIRCLE` |
| **B2.2** | ↳ **Choque Blindado** | Carga frontal demoledora: Derriba unidades Tier 2 sin fusionar. | Requieren 2 casillas de carrerilla en línea recta para cargar. | `MIL_SHOCK_CAVALRY` |
| **B2.2.1** | ↳ ↳ **Lanzas Cataphractas** | La caballería pesada tiene Ataque 3 y Defensa 2. | Cuestan 35 monedas; perder una genera penalización de moral. | `CATAPHRACT_LANCE` |
| **B2.2.2** | ↳ ↳ **Estampida de Guerra** | Empujan al defensor a la casilla trasera al atacarlo. | No pueden operar en terreno montañoso o de pantano. | `WAR_STAMPEDE` |
| **B2.2.3** | ↳ ↳ **Persecución Implacable**| Si derrotan a una tropa, avanzan inmediatamente a su casilla gratis.| No pueden detenerse voluntariamente tras ganar un choque. | `PURSUIT_FRENZY` |
| **B2.3** | ↳ **Batidores Ligeros** | Ignoran la niebla de guerra: ven a 3 hexágonos de distancia. | Ataque 1 y Defensa 0 (no aptos para combate directo). | `MIL_LIGHT_SCOUTS` |
| **B2.3.1** | ↳ ↳ **Raid de Suministros** | Cortar una línea enemiga paraliza el movimiento rival 1 turno. | El explorador queda revelado en el mapa al cortar la línea. | `SUPPLY_RAID` |
| **B2.3.2** | ↳ ↳ **Fantasma de la Estepa**| El explorador no puede ser atacado si tiene un hexágono libre de huida.| Incapaz de defender ciudades o granjas propias. | `STEPPE_GHOST` |
| **B2.3.3** | ↳ ↳ **Retirada Fingida** | Atraen a la tropa enemiga hacia adelante forzando su movimiento.| Si el enemigo no muerde el cebo, la tropa queda desprotegida. | `FEIGNED_RETREAT` |

---

###### B3. Balística, Asimetría y Control de Zona (Arquería / Guerrilla)
*Guerra a distancia, veneno, trampas y dominio del terreno.*

| Nodo ID | Nombre | Regla Abierta (`Bonus / Mecánica On`) | Regla Cerrada (`Sombra / Mecánica Off`) | Tag / Variable de Motor |
| :--- | :--- | :--- | :--- | :--- |
| **B3** | **Control de Zona** | Los arqueros proyectan una zona de amenaza de 2 hexágonos. | En combate cuerpo a cuerpo cualquier enemigo los mata al instante.| `TACTIC_AREA_DENIAL` |
| **B3.1** | ↳ **Maestría Balística** | El alcance de arqueros aumenta a 3 casillas desde colinas. | No pueden atacar casillas cubiertas por niebla de guerra. | `MIL_BALLISTIC_MASTERY`|
| **B3.1.1** | ↳ ↳ **Fuego de Interdicción** | Disparan automáticamente en el turno del rival si este entra a su rango.| Consumen 1 de oro de la tesorería por cada tiro reactivo. | `OVERWATCH_INTERDICTION`|
| **B3.1.2** | ↳ ↳ **Flechas con Punta de Cincel**| El ataque a distancia reduce la armadura de las torres en $-2$.| Requiere tecnología de herrería desbloqueada. | `CHISEL_TIP_ARROWS` |
| **B3.1.3** | ↳ ↳ **Fuego de Fósforo** | Incendia bosques enemigos impidiendo el paso durante 2 turnos. | Quema tanto casillas enemigas como aliadas si el viento cambia.| `PHOSPHORUS_FIRE` |
| **B3.2** | ↳ **Guerra Oculta** | Las unidades aliadas son invisibles en su propio territorio. | Si salen a territorio neutral, son reveladas permanentemente. | `MIL_SHADOW_WAR` |
| **B3.2.1** | ↳ ↳ **Camuflaje de Emboscada**| Atacar desde la invisibilidad otorga $+2$ de ataque de sorpresa. | Pierden la invisibilidad inmediatamente después del ataque. | `AMBUSH_CAMOUFLAGE` |
| **B3.2.2** | ↳ ↳ **Abrojos y Trampas** | Puedes colocar trampas en casillas neutras que matan al primer paso.| Colocar una trampa consume el turno de la tropa y 5 monedas. | `CALTROP_SNARE` |
| **B3.2.3** | ↳ ↳ **Veneno Neurotóxico** | Las unidades enemigas heridas pierden 1 tier al final de su turno.| La producción de comida de la casilla envenenada cae a 0. | `NEUROTOXIC_VENOM` |
| **B3.3** | ↳ **Guarnición Inmóvil** | Las torres y empalizadas duplican su resistencia pasiva. | Las unidades militares no pueden salir de las torres asignadas. | `MIL_STATIC_GARRISON` |
| **B3.3.1** | ↳ ↳ **Troneras de Muralla** | Las torres disparan flechas defensivas a 2 casillas de distancia.| Cuesta 2 de mantenimiento por turno cada torre artillada. | `WALL_EMBRASURES` |
| **B3.3.2** | ↳ ↳ **Alerta de Almenaras** | Revela el mapa completo alrededor de las torres en un radio de 4.| Si una almenara cae, la niebla vuelve al instante. | `BEACON_ALERT` |
| **B3.3.3** | ↳ ↳ **Último Bastión** | Una ciudad asediada resiste 5 turnos sin rendirse tras caer muros.| Si es finalmente tomada, todo su territorio se pierde de golpe. | `LAST_STAND_FORT` |

---

##### RAMA C: LA VICTORIA (Pacing, Objetivos y Fin de Partida)

###### C1. Dominación Militar (Conquista / Blitz / Aniquilación)
*Ganar rápido, destruir al mando rival o pintar el mapa de tu color.*

| Nodo ID | Nombre | Regla Abierta (`Bonus / Mecánica On`) | Regla Cerrada (`Sombra / Mecánica Off`) | Tag / Variable de Motor |
| :--- | :--- | :--- | :--- | :--- |
| **C1** | **Dominación Total** | Conquistar capitales enemigas es el objetivo prioritario. | La victoria por maravillas o economía está desactivada. | `VICTORY_DOMINATION` |
| **C1.1** | ↳ **Guerra Relámpago (Blitz)**| Ganas si conquistas la capital enemiga antes del turno 15. | Si llegas al turno 16 sin ganar, la moral colapsa (pierdes). | `WIN_BLITZKRIEG` |
| **C1.1.1** | ↳ ↳ **Decapitación de Mando** | Capturar la capital rival elimina al instante todo su ejército. | La capital enemiga cuenta con un defensor de élite inmóvil. | `DECAPITATION_STRIKE` |
| **C1.1.2** | ↳ ↳ **Colapso en Dominó** | Capturar una ciudad hace que las granjas vecinas se rindan solas.| No puedes cosechar oro de las granjas rendidas por 3 turnos. | `DOMINO_COLLAPSE` |
| **C1.1.3** | ↳ ↳ **Rendición por Shock** | Si destruyes 3 tropas enemigas en un turno, el rival cede 2 casillas.| Requiere mantener siempre superioridad numérica en tropas. | `SHOCK_SURRENDER` |
| **C1.2** | ↳ **Guerra de Desgaste** | Ganas al destruir el 100% de los cuarteles y tropas enemigas. | El coste de las unidades aumenta un 5% por cada turno transcurrido.| `WIN_ATTRITION_TOTAL` |
| **C1.2.1** | ↳ ↳ **Erradicación de Bastiones**| Demoler todas las torres enemigas activa la victoria inmediata. | Las torres enemigas devuelven daño de fuego antes de caer. | `BASTION_ERADICATION` |
| **C1.2.2** | ↳ ↳ **Asfixia de Trincheras** | Reducir el territorio enemigo a $<5$ casillas gana la partida. | Tropas enemigas en sus últimas casillas ganan $+2$ de defensa. | `TRENCH_SUFFOCATION` |
| **C1.2.3** | ↳ ↳ **Rendición por Hambre** | Si el rival sufre bancarrota 2 turnos seguidos, ganas la partida.| Si caes tú en bancarrota 1 solo turno, pierdes tú. | `STARVATION_WIN` |
| **C1.3** | ↳ **Hegemonía Territorial** | Ganas al controlar el 75% de los hexágonos del mapa. | Mantener tantas casillas genera costes exponenciales de frontera.| `WIN_HEGEMONY_MAP` |
| **C1.3.1** | ↳ ↳ **Mancha Voraz** | Capturar una casilla neutra es gratis (no consume oro). | Las casillas capturadas tardan 2 turnos en conectarse al grafo. | `EXPANSION_VORACIOUS` |
| **C1.3.2** | ↳ ↳ **Cerco Geográfico** | Rodear completamente el territorio enemigo activa la victoria.| Rodear exige tener tropas en cada vértice de la frontera. | `GEOGRAPHIC_RING` |
| **C1.3.3** | ↳ ↳ **Pax Imperialis** | Tras alcanzar el 60% del mapa, empieza una cuenta atrás de 10 turnos.| Si el rival te quita un solo hexágono, el contador se reinicia. | `PAX_IMPERIALIS` |

---

###### C2. Trascendencia y Monumentos (La Constructora / Victoria Lenta)
*Hacer casitas, construir una obra magna y ganar mediante la resistencia estoica.*

| Nodo ID | Nombre | Regla Abierta (`Bonus / Mecánica On`) | Regla Cerrada (`Sombra / Mecánica Off`) | Tag / Variable de Motor |
| :--- | :--- | :--- | :--- | :--- |
| **C2** | **Trascendencia Magna** | Ganas construyendo y protegiendo un Monumento Histórico. | Tus tropas sufren penalización de ataque fuera de tu territorio.| `VICTORY_WONDER` |
| **C2.1** | ↳ **La Gran Obra** | Desbloquea la construcción de la Maravilla (150 oro, 4 casillas).| Construir la obra consume el 50% de tus ingresos durante la obra.| `WIN_WONDER_BUILD` |
| **C2.1.1** | ↳ ↳ **Pirámide Eterna** | Ganas si mantienes la Pirámide intacta durante 15 turnos. | La posición de la Pirámide es visible a través de la niebla. | `PYRAMID_STAND_15T` |
| **C2.1.2** | ↳ ↳ **Torre del Saber** | Se construye en una sola casilla; acelera tecnologías al máximo.| Si es atacada por una catapulta, colapsa en un solo turno. | `TOWER_OF_WISDOM` |
| **C2.1.3** | ↳ ↳ **Utopía Agraria** | Ganas al alcanzar 10 Granjas de Nivel 3 contiguas e intactas. | Las tropas militares no pueden pisar las casillas agrarias. | `AGRARIAN_UTOPIA` |
| **C2.2** | ↳ **Hegemonía Cultural** | Ganas si tu influencia territorial absorbe la capital enemiga. | No puedes declarar la guerra ni atacar tropas enemigas tú primero.| `WIN_CULTURAL_ABSORB` |
| **C2.2.1** | ↳ ↳ **El Gran Jubileo** | Generas puntos de cultura por cada turno con la tesorería llena.| Al llegar a 100 puntos ganas; gastar oro te quita puntos. | `JUBILEE_POINTS` |
| **C2.2.2** | ↳ ↳ **Peregrinación Sagrada**| Los enemigos que pisen tu templo se vuelven neutrales pacifistas.| Solo puedes construir un templo en todo el mapa. | `SACRED_PILGRIMAGE` |
| **C2.2.3** | ↳ ↳ **Faro Continental** | El faro revela el mapa entero; si dura 20 turnos ganas la partida.| Todos los enemigos se alían automáticamente contra ti. | `CONTINENTAL_BEACON` |
| **C2.3** | ↳ **Resistencia de Tiempo**| Ganas si la partida alcanza el Turno 50 y tu capital está viva.| A partir del turno 30, las IAs rivales entran en modo asedio total.| `WIN_SURVIVAL_T50` |
| **C2.3.1** | ↳ ↳ **Bastión Inconmovible** | La capital resiste cualquier ataque si tiene al menos 1 granja viva.| No puedes expandir tus fronteras a más de 3 casillas de distancia.| `UNSHAKABLE_KEEP` |
| **C2.3.2** | ↳ ↳ **La Edad Dorada** | Mantener balance positivo durante 30 turnos seguidos da la victoria.| Un solo turno con balance negativo reinicia la cuenta a 0. | `GOLDEN_ERA_STREAK` |
| **C2.3.3** | ↳ ↳ **Pacto de Concordia** | Ofreces oro a los rivales; si mantienes la paz 20 turnos, ganas.| Cualquier escaramuza fronteriza accidental cancela el pacto.| `CONCORDIA_TREATY` |

---

###### C3. Asfixia Logística y Monopolio (Guerra Económica / Mercader / Guerrilla)
*Arruinar al vecino, comprar el tablero o estrangular los suministros sin dar un solo golpe directo.*

| Nodo ID | Nombre | Regla Abierta (`Bonus / Mecánica On`) | Regla Cerrada (`Sombra / Mecánica Off`) | Tag / Variable de Motor |
| :--- | :--- | :--- | :--- | :--- |
| **C3** | **Guerra Económica** | Ganas quebrando la tesorería rival o monopolizando el oro. | La fuerza de combate directa de tu infantería está reducida en $-1$.| `VICTORY_FINANCIAL` |
| **C3.1** | ↳ **Banca Central y Monopolio**| Ganas al acumular 500 monedas de oro en la tesorería activa. | El mantenimiento de tus tropas se cobra con un 10% de recargo.| `WIN_GOLD_ACCUMULATE` |
| **C3.1.1** | ↳ ↳ **OPA Hostil (Soborno)** | Puedes pagar 40 monedas para comprar cualquier hexágono enemigo.| No puedes comprar la casilla de la Capital enemiga directamente.| `HOSTILE_TAKEOVER` |
| **C3.1.2** | ↳ ↳ **Control Mercantil** | Controlar todos los nodos de comercio del mapa gana la partida.| Los nodos están defendidos por piratas o bandidos neutrales. | `MERCANTILE_CARTEL` |
| **C3.1.3** | ↳ ↳ **Burbuja Especulativa**| Prestas oro a los rivales; si no pagan con intereses en 5 turnos, ganas.| El rival puede negarse a pagar declarándote la guerra total. | `DEBT_SPECULATION` |
| **C3.2** | ↳ **Estrangulamiento Logístico**| Ganas si el 70% del territorio enemigo entra en estado `AISLADO`.| Para aislar casillas debes infiltrarte; tus tropas mueren fácil.| `WIN_LOGISTIC_CHOKE` |
| **C3.2.1** | ↳ ↳ **Bancarrota Inducida** | Si logras que el enemigo pierda 3 tropas por hambruna, ganas. | Solo aplica si provocaste la bancarrota cortándole carreteras. | `INDUCED_BANKRUPTCY` |
| **C3.2.2** | ↳ ↳ **Bloqueo de Arterias** | Bloquear los 3 caminos principales del rival durante 5 turnos gana.| Bloquear te obliga a mantener tropas expuestas en territorio hostil.| `ARTERY_BLOCKADE` |
| **C3.2.3** | ↳ ↳ **Guerra de Corsarios** | Saquear todos los convoyes marítimos del rival gana la partida.| Si pierdes tu flota insignia, tu economía colapsa 5 turnos. | `CORSAIR_DOMINANCE` |
| **C3.3** | ↳ **Tributo y Vasallaje** | Obligar al enemigo a firmar un pacto de tributo gana la partida.| Requiere haber cercado su capital con tropas sin destruirla. | `WIN_VASSALAGE_PACT` |
| **C3.3.1** | ↳ ↳ **Red de Extorsión** | Exiges la mitad del ingreso del rival si tienes mayor ejército.| Si tu ejército cae por debajo del suyo, el tributo se invierte.| `EXTORTION_NETWORK` |
| **C3.3.2** | ↳ ↳ **Embargo Total** | Prohíbes al rival construir granjas si controlas sus fronteras.| Requiere presencia militar ininterrumpida en cada paso clave. | `BORDER_EMBARGO` |
| **C3.3.3** | ↳ ↳ **Protectorado Dorado**| Pagas el mantenimiento del rival a cambio de que no pueda atacar.| Si acumulas 30 turnos de protectorado, anexionas su reino y ganas.| `GOLDEN_PROTECTORATE` |

---

##### ¿Cómo interpreta esto el motor de juego en código?
Cuando el jugador confirma su tribu, el sistema no tiene que lidiar con reglas complejas; simplemente crea un objeto JSON ligero con los **Tags seleccionados**. Ejemplo para una jugadora que quiere *"hacer casitas, construir torres y ganar con la Pirámide"*:

{
  "tribe_id": "cust_player_01",
  "name": "Custodios del Nilo",
  "alma_path": ["A1", "A1.2", "A1.2.3"], // Sedentario -> Teocracia -> Ascetismo Agrario
  "arma_path": ["B3", "B3.3", "B3.3.1"], // Control de Zona -> Guarnición -> Troneras de Muralla
  "victoria_path": ["C2", "C2.1", "C2.1.1"], // Trascendencia -> La Gran Obra -> Pirámide Eterna
  "active_rules": [
    "CIV_TYPE_SEDENTARY",
    "GOV_THEOCRACY",
    "ASCETIC_COMMUNE",
    "TACTIC_AREA_DENIAL",
    "MIL_STATIC_GARRISON",
    "WALL_EMBRASURES",
    "VICTORY_WONDER",
    "WIN_WONDER_BUILD",
    "PYRAMID_STAND_15T"
  ]
}

El motor de la partida solo revisa si un `Tag` está presente en la lista `active_rules` para habilitar o alterar los métodos de cálculo correspondientes. Con esta arquitectura cerrada, el **Punto 2 (Tribu)** queda 100% blindado y listo para desarrollo.

### 2.3. BATERÍA DE PRUEBAS DE ACEPTACIÓN: MÓDULO "TRIBU" (QA TEST SUITE)

> **Criterio de Aprobación del Módulo:** Ninguna versión del código será enviada a producción si no supera el 100% de las siguientes 10 pruebas automatizadas y funcionales.

---

### GRUPO 1: PRUEBAS DE NAVEGACIÓN E INTEGRIDAD DEL ÁRBOL (UI/UX)

#### [TEST-TRIBU-01] Despliegue Secuencial del Árbol (Sin Salto de Niveles)
* **Definición:** La interfaz no debe permitir seleccionar una hoja de Nivel 3 sin haber seleccionado previamente sus nodos ancestros de Nivel 1 y Nivel 2.
* **Precondición:** El jugador abre el editor de "Tribu" con un perfil nuevo en blanco.
* **Paso a paso:**
  1. Hago clic en la pestaña "Alma".
  2. Intento forzar un clic en el nodo `[A1.1.1] Integración Universal`.
* **Resultado Esperado:**
  * El sistema ignora el clic en `A1.1.1` o muestra el nodo con opacidad al 30% y un icono de candado.
  * Solo los nodos `A1`, `A2` y `A3` son interactivos.
  * Al pulsar `A1`, se renderizan con animación de apertura los nodos `A1.1`, `A1.2` y `A1.3`.

#### [TEST-TRIBU-02] Reseteo en Cascada por Cambio de Ancestro (Data Integrity)
* **Definición:** Si el jugador cambia una decisión en un nivel superior (Nivel 1 o 2), todas las selecciones de los niveles descendientes deben borrarse inmediatamente para evitar combinaciones ilegales en el árbol.
* **Precondición:** El jugador tiene seleccionada la ruta `A1 (Sedentario) -> A1.1 (Burocracia) -> A1.1.1 (Integración)`.
* **Paso a paso:**
  1. Retrocedo en la interfaz y cambio mi selección de Nivel 1 a `A3 (Dispersión Móvil)`.
  2. Inspecciono el estado de memoria del perfil.
* **Resultado Esperado:**
  * Los nodos `A1.1` y `A1.1.1` son deseleccionados y purgados del array de configuración.
  * La interfaz despliega las opciones hijas de Nivel 2 exclusivas de nómadas (`A3.1`, `A3.2`, `A3.3`).
  * El botón "Guardar Tribu" pasa a estado **inhabilitado** hasta que el jugador complete los 3 niveles de la nueva rama.

---

### GRUPO 2: SERIALIZACIÓN Y GENERACIÓN DEL PERFIL JSON

#### [TEST-TRIBU-03] Generación Determinista de Tags del Motor
* **Definición:** Al completar los 3 pilares (*Alma, Arma, Victoria*), el sistema debe compilar un archivo JSON local `tribe_profile.json` que contenga exactamente los 9 tags técnicos correspondientes (3 por pilar).
* **Precondición:** El jugador selecciona en la interfaz:
  * Alma: `A1 -> A1.2 -> A1.2.3` (Sedentario / Teocracia / Ascetismo Agrario).
  * Arma: `B3 -> B3.3 -> B3.3.1` (Control de Zona / Guarnición / Troneras de Muralla).
  * Victoria: `C2 -> C2.1 -> C2.1.1` (Trascendencia / Gran Obra / Pirámide Eterna).
* **Paso a paso:**
  1. Escribo el nombre "Monjes del Muro" y elijo el color `#FFCC00`.
  2. Pulso el botón "Guardar Tribu".
  3. Abro y leo el archivo `tribe_profile.json` generado en disco.
* **Resultado Esperado:**
  * El archivo existe y es sintácticamente válido.
  * El array `active_rules` contiene **exactamente** la siguiente lista:
    `["CIV_TYPE_SEDENTARY", "GOV_THEOCRACY", "ASCETIC_COMMUNE", "TACTIC_AREA_DENIAL", "MIL_STATIC_GARRISON", "WALL_EMBRASURES", "VICTORY_WONDER", "WIN_WONDER_BUILD", "PYRAMID_STAND_15T"]`.
  * No existen tags duplicados ni nulos.

---

### GRUPO 3: SIMULACIÓN EN PARTIDA (IN-GAME RULE OVERRIDES)

#### [TEST-TRIBU-04] Validación de Mecánica: "La Constructora / Ascetismo Agrario"
* **Definición:** Validar que la regla abierta de `A1.2.3` (Granjas con mantenimiento cero) y su regla cerrada (Prohibición de reclutar Tier 3) se aplican correctamente en el tablero.
* **Precondición:** Partida iniciada con el perfil del `TEST-TRIBU-03` (`ASCETIC_COMMUNE` activo).
* **Paso a paso:**
  1. Construyo 3 Granjas contiguas en mi territorio.
  2. Reviso el panel de balance económico en el HUD superior.
  3. Intento fusionar dos unidades Tier 2 (Guardias) o reclutar directamente una unidad Tier 3 (Paladín).
* **Resultado Esperado:**
  * El mantenimiento de las granjas figura como `0 oro/turno` (en lugar del coste base del juego).
  * La interfaz de fusión bloquea la acción con el mensaje emergente: *"El dogma de tu civilización prohíbe las unidades de élite Tier 3"*.

#### [TEST-TRIBU-05] Validación de Mecánica: "La Sombra de la Integración (Revuelta)"
* **Definición:** Validar que si el jugador posee el tag `INTEGRATION_PRESERVE` (`A1.1.1`) y su balance económico cae a déficit negativo, las casillas conquistadas se vuelven neutrales.
* **Precondición:** El jugador capturó 2 casillas enemigas con granjas intactas. La tesorería acumulada es de 0 monedas.
* **Paso a paso:**
  1. Recluto tropas masivamente hasta que el balance del turno sea $-5$ de oro.
  2. Pulso "Fin de Turno".
* **Resultado Esperado:**
  * El motor procesa el déficit.
  * Se dispara el evento `TRIGGER_REVOLT`: las 2 casillas capturadas pierden el color del jugador, expulsan las tropas aliadas hacia la casilla propia más cercana y vuelven a ser neutrales de color gris.

#### [TEST-TRIBU-06] Validación de Combate: "El Jinete Parto (Dispara y Corre)"
* **Definición:** Validar que una civilización con `PARTHIAN_RETREAT` (`B2.1.1`) permite a sus jinetes disparar a distancia y retener 1 punto de movimiento residual para huir.
* **Precondición:** Perfil con Arma `B2 -> B2.1 -> B2.1.1`. Hay un Jinete propio a 2 casillas de un Recluta enemigo. La casilla trasera está vacía.
* **Paso a paso:**
  1. Selecciono el Jinete y ordeno ataque sobre el Recluta enemigo.
  2. Tras completarse la animación de ataque, intento mover al Jinete a la casilla trasera.
* **Resultado Esperado:**
  * El Recluta enemigo recibe el impacto del ataque a distancia.
  * El Jinete no queda agotado/grisáceo; el indicador de movimiento muestra `1 punto restante`.
  * El Jinete retrocede con éxito a la casilla trasera y finaliza su turno.

#### [TEST-TRIBU-07] Validación de Combate: "Testudo Romana vs. Hostigamiento"
* **Definición:** Validar que el tag `TESTUDO_SHIELD` (`B1.1.1`) otorga inmunidad contra daño de proyectiles si hay 3 infanterías en formación triangular.
* **Precondición:** 3 unidades de infantería aliadas colocadas en hexágonos adyacentes mutuos formando un triángulo. Un Arquero enemigo se sitúa a 2 casillas.
* **Paso a paso:**
  1. El Arquero enemigo dispara contra una de las infanterías en formación.
* **Resultado Esperado:**
  * Se renderiza el efecto visual de escudos bloqueando las flechas.
  * La unidad atacada no sufre penalización de defensa ni degradación de tier.
  * El log de combate registra: *"Ataque bloqueado por Formación Testudo (Defensa Absoluta contra Proyectiles)"*.

---

### GRUPO 4: PRUEBAS DE CONDICIÓN DE VICTORIA (GAME LOOP ENDING)

#### [TEST-TRIBU-08] Victoria por Maravilla: Cuenta Atrás de la Pirámide
* **Definición:** Validar que el tag `PYRAMID_STAND_15T` (`C2.1.1`) activa un contador visible de 15 turnos al erigir la Pirámide y finaliza la partida al llegar a 0.
* **Precondición:** Jugador con 150 de oro y 4 casillas de granjas contiguas libres.
* **Paso a paso:**
  1. Coloco la estructura "Pirámide Eterna".
  2. Avanzo 15 turnos consecutivos asegurando que ninguna tropa enemiga capture ni dañe la casilla de la Pirámide.
* **Resultado Esperado:**
  * En el turno en que se construye, el HUD muestra: *"Defiende la Pirámide: 15 turnos restantes"*.
  * En cada Fin de Turno el contador se decrementa en 1 de forma síncrona.
  * Al completarse el turno 15 con la Pirámide viva, el juego congela la simulación y dispara el modal: *"¡Victoria Monumental alcanzada!"*, bloqueando cualquier acción militar subsiguiente.

#### [TEST-TRIBU-09] Victoria Blitzkrieg: Penalización por Expiración
* **Definición:** Validar que una civilización con `WIN_BLITZKRIEG` (`C1.1`) pierde automáticamente la partida si no conquista la capital rival antes de finalizar el turno 15.
* **Precondición:** Perfil configurado con Blitzkrieg. El jugador tiene un ejército superior pero no ha tomado la capital enemiga al turno 14.
* **Paso a paso:**
  1. Mantengo mis tropas defendiendo y pulso "Fin de Turno" para pasar del turno 15 al 16 sin capturar la capital rival.
* **Resultado Esperado:**
  * Al iniciar el Turno 16, el motor evalúa la condición de fallo de tiempo.
  * La partida se detiene inmediatamente y muestra la pantalla: *"Derrota: El ímpetu bélico de tu civilización ha colapsado (Tiempo de Blitz agotado)"*.

---

### GRUPO 5: CASOS LÍMITE Y SEGURIDAD (EDGE CASES)

#### [TEST-TRIBU-10] Prevención de Inyección y Corrupción de Datos
* **Definición:** Si el archivo local `tribe_profile.json` es alterado externamente con tags inexistentes o combinaciones prohibidas (ej. hackeo manual o guardado corrupto), el juego debe auto-repararse sin colapsar.
* **Precondición:** El usuario edita manualmente el archivo JSON e inserta:
  `"active_rules": ["TAG_HACKEADO_999", "CIV_TYPE_SEDENTARY", "CIV_TYPE_NOMAD"]` (conflicto: sedentario y nómada a la vez).
* **Paso a paso:**
  1. Abro la aplicación.
  2. El módulo "Tribu" lee el archivo en el arranque.
* **Resultado Esperado:**
  * El validador de esquemas detecta la contradicción de tipos y el tag desconocido.
  * El sistema no produce un crash (`NullPointerException`); restablece silenciosamente el perfil a la configuración por defecto (Tribu Equilibrada Estándar).
  * Se genera una advertencia en el log de depuración: `[WARN] Perfil de tribu corrupto. Restaurando valores seguros de fábrica`.
  
  
  
  
## 3. BOTÓN CENTRAL: SISTEMA "NUEVA PARTIDA" (CONFIGURADOR Y GENERADOR)

### 3.1. Puerta de Entrada y Selector de Sub-Modos
* **Definición:** Al presionar "Nueva Partida" en el menú central, la pantalla abre un panel modal de selección con tres caminos de juego:
  1. **Modo Escaramuza (Vs. IA):** Partida local inmediata contra facciones controladas por el procesador.
  2. **Modo Partida en Línea:** Multijugador por turnos (Lobby privado con código de sala o Emparejamiento Rápido 1v1).
  3. **Modo Mapas de la Comunidad:** Explorador de mapas creados por otros jugadores en el editor (permite ordenar por "Más votados", "Nuevos" o introducir una clave de semilla/código de mapa manual).

* **Prueba:**
  1. Pulso "Nueva Partida" desde el menú principal.
  2. **Resultado esperado:** Se renderiza el selector con las tres tarjetas ("Escaramuza", "En Línea", "Comunidad"); el juego no inicia ninguna carga pesada hasta que el jugador elige una de las tres vías. Al seleccionar "Escaramuza", se despliega la pantalla de parámetros de partida (Punto 3.2).

### 3.2. Parámetros de Configuración de la Partida
* **Definición:** La pantalla de configuración de partida presenta 3 selectores esenciales antes de pulsar el botón "Generar Mundo":

#### A. Selector de Tamaño del Mapa (Escala y Ritmo)
| Opción | Radio Hexagonal ($R$) | Cantidad Aprox. de Casillas | Jugadores / Facciones | Tiempo Estimado |
| :--- | :--- | :--- | :--- | :--- |
| **Pequeño** | $R = 7$ | 127 hexágonos | 2 (1v1) | $\sim 10$ minutos |
| **Mediano** | $R = 12$ | 397 hexágonos | 2 a 4 facciones | $\sim 20$ minutos |
| **Enorme** | $R = 18$ | 919 hexágonos | 4 a 6 facciones | $\sim 45$ minutos |

#### B. Selector de Bioma Predominante
* **Llanuras:** Terreno balanceado (70% pastos, 20% bosques talables, 10% colinas). Ideal para principiantes y expansión estándar.
* **Desierto:** Terreno árido (60% arena, 20% oasis con bonus de oro, 20% dunas). Costes agrícolas más caros; alta movilidad para caballería.
* **Archipiélago:** Terreno marítimo (55% agua navegable, 45% islas conectadas por pasos estrechos o puertos). Fuerza el uso de flotas y transporte acuático.
* **Tundra:** Terreno ártico (60% nieve, 30% pinares densos, 10% hielo intransitable). Rápido acceso a madera; las líneas de suministro sufren si se alejan de ciudades cálidas.
* **Mixto:** Algoritmo de ruido procedural (Perlin Noise / Voronoi) que distribuye todos los biomas en parches naturales conectados.

#### C. Selector de Niebla de Guerra (Visibilidad)
* **Completa (Fog of War Estándar):** El mapa comienza 100% negro/oculto excepto en el radio de visión de la Capital ($D \le 2$). Para ver el terreno, accidentes y tropas enemigas, se debe explorar físicamente con tropas.
* **Explorada (Estilo Ajedrez / *Antiyoi*):** La geografía completa del mapa (biomas, montañas, agua y recursos) es visible desde el turno 1. Sin embargo, las **unidades militares y torres enemigas** solo son visibles si están dentro del radio de visión activo de una unidad o ciudad propia.

* **Prueba:**
  1. En el configurador elijo: Tamaño "Pequeño", Bioma "Desierto", Niebla "Explorada".
  2. Pulso "Generar Mundo".
  3. **Resultado esperado:** La transición al mapa ocurre en $< 1.5$ segundos. El mapa tiene exactamente radio 7; la mayoría de las casillas son de color arena; la geografía de todo el mapa es visible, pero las tropas enemigas en el extremo opuesto no se renderizan hasta enviar una unidad a su zona de control.

---

### 3.3. Algoritmo de Inicialización del Mundo y Despliegue de Niebla

* **Definición:** Al confirmar los parámetros, el generador ejecuta una secuencia de cuatro fases deterministas:
  1. **Fase 1: Malla y Bioma:** Genera la cuadrícula hexagonal en coordenadas cúbicas $(q, r, s)$. Aplica la paleta visual del bioma seleccionado y ubica obstáculos (ríos, montañas, árboles).
  2. **Fase 2: Spawning Equitativo:** Calcula la distancia euclidiana entre bordes y coloca las Ciudades Capitales de cada facción garantizando una distancia mínima de seguridad:
     $$D_{min} \ge \frac{\text{Diámetro del Mapa}}{N^\circ \text{ de Facciones}} + 2$$
     Cada Capital se inicializa con sus 6 casillas adyacentes asignadas al color de su respectiva facción.
  3. **Fase 3: Inyección de Doctrinas de la Tribu:** El jugador y las IAs cargan sus tags de civilización (`ALMA`, `ARMA`, `VICTORIA`). Si el jugador tiene afinidad a un bioma específico, el generador sustituye el terreno inmediato de su capital por dicho bioma.
  4. **Fase 4: Máscara de Niebla:** Cada celda computa su estado de visibilidad para el jugador local bajo una máquina de estados:
     * `0 = UNEXPLORED` (Totalmente opaca, bloquea interacción y vista).
     * `1 = DISCOVERED` (Geografía visible, pero en penumbra; tropas enemigas ocultas).
     * `2 = VISIBLE` (Radio de visión directo: interactivo, visible al 100%).

* **Prueba:**
  1. Inicio una partida en mapa "Mediano" con 4 facciones y Niebla "Completa".
  2. Inspecciono la posición de las 4 capitales mediante la consola de desarrollo.
  3. **Resultado esperado:** Ninguna capital está a menos de 6 casillas de otra; las 4 capitales tienen exactamente 6 hexágonos propios a su alrededor; para la cámara del jugador, todas las casillas a distancia $\ge 3$ están en estado `UNEXPLORED`.

### 3.4. BATERÍA DE PRUEBAS DE ACEPTACIÓN (TEST SUITE)

#### [TEST-NP-01] Generación Precisa de Tamaño de Malla
* **Definición:** Validar que el selector de tamaño instancia el número exacto de hexágonos según la fórmula de anillo hexagonal:
  $$\text{Total Casillas} = 3 \cdot R^2 + 3 \cdot R + 1$$
* **Paso a paso:**
  1. Configuro una partida con Tamaño "Pequeño" ($R = 7$).
  2. Ejecuto el test de conteo de entidades `HexCell` en el gestor de mapa.
* **Resultado Esperado:** El contador arroja exactamente $3 \cdot (49) + 3 \cdot (7) + 1 = 169$ casillas instanciadas en memoria (incluyendo bordes de agua perimetrales de confinamiento).

#### [TEST-NP-02] Verificación de Bioma Archipiélago (Conectividad Náutica)
* **Definición:** En bioma "Archipiélago", al menos el 50% de las casillas deben ser de tipo `AGUA`, pero todas las islas con capital deben tener al menos 1 casilla de costa para permitir embarque.
* **Paso a paso:**
  1. Genero 10 mapas procedurales sucesivos con bioma "Archipiélago".
  2. Evalúo los tipos de celda de cada iteración.
* **Resultado Esperado:** En el 100% de las iteraciones, la proporción de casillas de agua está entre $50\%$ y $60\%$; ninguna capital queda encerrada en tierra sin acceso directo a costa navegable.

#### [TEST-NP-03] Comportamiento de Niebla de Guerra: Revelado Dinámico
* **Definición:** Mover una unidad militar hacia la frontera debe actualizar las celdas adyacentes de `UNEXPLORED` a `VISIBLE` en tiempo real.
* **Precondición:** Partida con Niebla "Completa". Hay una casilla en estado `UNEXPLORED` a 3 hexágonos de la capital.
* **Paso a paso:**
  1. Muevo un Recluta (visión = 1) desde la frontera propia hacia territorio neutral.
* **Resultado Esperado:** La niebla se disipa en abanico revelando las casillas adyacentes a la nueva posición del Recluta; las celdas cambian de `0 (UNEXPLORED)` a `2 (VISIBLE)` y sus recursos/árboles se vuelven interactivos.

#### [TEST-NP-04] Carga de Mapa de la Comunidad por Identificador
* **Definición:** El submodo "Jugar Mapas de la Comunidad" debe permitir pegar una cadena de texto (código Base64 o ID numérico) y reconstruir el mapa exactamente igual a la creación del autor.
* **Precondición:** Se dispone del código de mapa válido `MAP-TEST-8842`.
* **Paso a paso:**
  1. Entro en "Nueva Partida" $\to$ "Mapas de la Comunidad".
  2. Introduzco el código `MAP-TEST-8842` en el campo de texto y pulso "Cargar Mapa".
* **Resultado Esperado:** El sistema no llama al generador procedural aleatorio; deserializa la matriz del mapa del autor con sus ciudades y biomas fijos y arranca la partida en el turno 1.

#### [TEST-NP-05] Concurrencia en Partida en Línea (Lobby Room)
* **Definición:** Al seleccionar "Partida en Línea", el sistema debe generar una clave de sala alfanumérica de 6 dígitos que sincroniza a dos jugadores locales antes de instanciar el mapa.
* **Paso a paso:**
  1. Jugador 1 pulso "Partida en Línea" $\to$ "Crear Sala".
  2. Jugador 2 en otro dispositivo pulsa "Unirse a Sala" e introduce el código del Jugador 1.
* **Resultado Esperado:** Ambos clientes muestran la pantalla de "Sala Lista"; ambos ven el nombre y blasón de la tribu del adversario; al pulsar el anfitrión "Empezar", la misma semilla matemática de mapa se ejecuta en ambos dispositivos de forma idéntica.
  


## 4. SISTEMA EN PARTIDA: INTERFAZ DE TABLERO Y HUD TÁCTICO (IN-GAME BOARD UI/UX)

### 4.1. Layout General y Distribución de Pantalla
* **Definición:** La pantalla de juego en partida distribuye los controles táctiles bajo una jerarquía periférica que mantiene libre el área central del mapa, Al iniciar cualquier partida, la pantalla adopta una vista cenital/isométrica con desplazamiento libre (Pan & Zoom táctil). La interfaz superpuesta (HUD) es no intrusiva y se divide en 3 zonas fijas:


Resumen/Turno        Economía Tripartita           Chat   Ajustes
┌──────────────────────────────────────────────────────────────┐
│ [🏆T12]    [💰45(+6)] [🌾20(+2)] [🌲15(+3)]    [💬]   [⚙️] │  <-- HUD Superior (Telemetría)
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                      TABLERO HEXAGONAL                       │
│                                                              │
│               [⬡]   💬    [⬡]         [⬡]                   │  <-- Lienzo Central Interactivo
│                    [⬡]         [⬡]         [⬡]              │      (Burbujas de aviso dinámicas)
│               [⬡]         [🏰]        [⬡]                   │
│                                                              │
├──────────────────────────────────────────────────────────────┤  <-- HUD Inferior (Controles)
│      [↩️]             [⛺]       [💂]               [⏩]    │
└──────────────────────────────────────────────────────────────┘
    Deshacer         Edificios   Unidades         Terminar Turno

#### Lo que hace sobresaliente a este layout:

1. **La Economía Tripartita (`💰 Oro`, `🌾 Comida`, `🌲 Madera`):**
 Con tres recursos le das sentido orgánico a cada estilo de juego:
     * **Comida `🌾`:** Sostiene al ejército y hace crecer las ciudades. La jugadora que "hace casitas" se enfoca aquí. Si falta comida, hay hambruna.
     * **Madera `🌲`:** Sirve para levantar empalizadas, torres y fabricar arcos/asedio. Talar árboles ya no es solo despejar el mapa: ¡te da madera para construir!
     * **Oro `💰`:** Para tecnologías, sobornos, rutas mercantiles y unidades de élite.
2. **El Botón "Deshacer" `[↩️]` (Anti-Misclick):**
   * En móvil, tocar por error un hexágono equivocado con el dedo gordo arruina una partida de 20 minutos. El botón "Deshacer" es la bendición más grande de calidad de vida (*QoL*), siempre que tenga una regla clara: **solo puedes deshacer movimientos que no hayan revelado niebla de guerra ni iniciado combates**.
3. **Los Dos Menús Desplegables en el Pulgar (`[⛺]` y `[💂]`):**
   * Es la solución más limpia posible: en vez de llenar la pantalla de 10 botones diminutos, tienes solo **dos cajones maestros**. Al tocar `[⛺]` se abren tus 4 edificios; al tocar `[💂]` se abren tus 4 unidades. Todo a mano del pulgar.
Opciones edificios: Opciones unidades:
        [⛺]            [💂]                                             
        [♜]            [🏹]
        [🏠]            [♞]
        [🏰]            [💣]
nota: para los emojis podría usarse algo así: 
<!-- Icono de Cañón Real Homologado por Icons8 -->
<img src="https://icons8.com" alt="Cañón" width="24" height="24">

4. **Mensajes Diegéticos Flotantes `💬` en el Tablero:**
   * En lugar de pop-ups molestos que bloquean la pantalla, los avisos aparecen como globitos de cómic sobre las casillas (ej. una ciudad que dice *"¡Falta comida!"*, un soldado que avisa *"¡Emboscada!"* o emotes rápidos en multijugador) y desaparecen solos al tocarlos o tras 3 segundos.

* **Prueba:**
  1. Inicio una partida nueva.
  2. **Resultado esperado:** El HUD superior e inferior ocupan menos del 10% de la altura total de la pantalla, dejando más del 80% libre para la visualización del mapa; al realizar un gesto de pellizco (Pinch-to-zoom), el mapa se amplía/reduce suavemente entre un rango de escala de $0.5 a 2.0 sin deformar los iconos en pixel art.
la zona inferior ocupa menos del 10% de la altura total de la pantalla.

### 4.2. HUD Superior: Telemetría y Recursos
* **Definición:** Muestra permanentemente en la parte superior:
  1. **[🏆 T12]:** Turno actual y posición de ranking/objetivo.
  2. **Recursos Tripartitos:** Cada uno muestra su reserva y su balance neto proyectado para el siguiente turno:
     * **[💰 Oro]:** Mantenimiento de tropas de élite, tecnologías y comercio.
     * **[🌾 Comida]:** Mantenimiento de población. Si cae por debajo de 0, se dispara la deserción/hambruna.
     * **[🌲 Madera]:** Requisito para erigir edificios y fabricar armas de asedio/arquería. Se obtiene talando bosques o en aserraderos.
  3. **[💬 Chat / Registro]:** Abre el panel de registro de eventos (en solitario) o chat/emotes (en multijugador).
  4. **[⚙️ Ajustes]:** Menú de pausa, sonido, rendimiento y opción de rendición/salida.

* **Prueba:**
  1. Inicio de turno con 15 de madera. Ordeno talar un bosque propio que otorga $+10$ de madera.
  2. **Resultado esperado:** La reserva de madera se actualiza instantáneamente a `[🌲 25(+3)]`; la casilla talada cambia su sprite a llanura despejada.

---

### 4.3. Lienzo Central y Burbujas de Alerta Contextual `💬`
* **Definición:** Los eventos del juego no interrumpen con ventanas modales agresivas; se comunican mediante burbujas de diálogo flotantes con iconos pixel art ancladas a los hexágonos:
  * *Alerta de Suministro:* Una casilla cortada muestra una burbuja con una cadena rota `🔗❌`.
  * *Alerta de Crecimiento:* Una ciudad lista para subir de nivel muestra `🌾⬆️`.
  * *Multijugador:* Emotes rápidos enviados por el rival flotan sobre su capital y se desvanecen tras 3 segundos.
* **Prueba:**
  1. Un enemigo corta la línea de suministro de una granja aliada.
  2. **Resultado esperado:** Aparece una burbuja `💬` con el icono de alerta sobre la granja; al tocar la burbuja con el dedo, se disuelve con una animación de desvanecimiento suave y la cámara centra brevemente el hexágono afectado.

---

### 4.4. HUD Inferior: Menús Desplegables de Pulgar y Acciones

#### A. Botón Deshacer `[↩️]` (Undo)
* **Definición:** Permite revertir la última acción del turno actual con dos restricciones estrictas de seguridad:
  * *Acciones Reversibles:* Mover una tropa dentro de territorio propio o construir una estructura en el turno en curso.
  * *Acciones Irreversibles (Bloquean el Undo):* Movimientos que hayan descubierto niebla de guerra nueva, ataques/fusiones de combate ejecutados o acciones del turno anterior.
* **Prueba:**
  1. Muevo un Recluta de la casilla A a la casilla B (ambas propias y conocidas). Pulso `[↩️]`.
  2. **Resultado esperado:** El Recluta vuelve a la casilla A y recupera su punto de acción.
  3. Muevo el Recluta hacia una casilla inexplorada que despeja niebla de guerra.
  4. **Resultado esperado:** El botón `[↩️]` pasa inmediatamente a estado deshabilitado (gris), impidiendo reiniciar el movimiento tras obtener información oculta.

#### B. Cajón Desplegable de Edificios `[⛺]`
* **Definición:** Al tocar el icono `[⛺]`, se despliegan en vertical hacia arriba los 4 tipos de infraestructura para colocar en casillas propias válidas:
  * **[⛺] Puesto / Campamento:** Extiende la línea de suministro territorial (Coste: Madera).
  * **[♜] Torre de Guardia:** Otorga Defensa 2 a casillas adyacentes (Coste: Madera + Oro).
  * **[🏠] Granja / Aldea:** Genera comida $+4$ por turno (Coste: Oro + Madera).
  * **[🏰] Bastión / Monumento:** Fortaleza pesada o Maravilla de victoria (Coste masivo de los 3 recursos).

#### C. Cajón Desplegable de Unidades `[💂]`
* **Definición:** Al tocar el icono `[💂]`, se despliegan hacia arriba las 4 opciones de reclutamiento para colocar en casillas conectadas a una Ciudad:
  * **[💂] Infantería (Recluta):** Captura casillas, fusionable (Coste: Comida + Oro).
  * **[🏹] Arquero:** Ataque a distancia y control de zona (Coste: Madera + Oro).
  * **[♞] Jinete:** Movilidad 2 casillas hostiles, corte de suministros (Coste: Comida + Oro).
  * **[💣] Asedio / Insignia:** Catapulta derriba-muros o la Unidad Insignia del jugador (Coste alto de los 3 recursos).

#### D. Botón Fin de Turno `[⏩]`
* **Definición:** Botón de avance de fase situado en la esquina inferior derecha. Muestra un anillo de color verde si todas las unidades han actuado, o ámbar si quedan unidades con movimientos pendientes.
* **Prueba:**
  1. Toco el icono `[💂]` en el dock inferior.
  2. **Resultado esperado:** Se despliega el abanico vertical con las 4 unidades; toco `[🏹] Arquero`; las casillas válidas de despliegue alrededor de mi ciudad se iluminan en verde; selecciono una casilla y el arquero se materializa descontando madera y oro. El menú desplegable se repliega automáticamente.



* **Prueba:**
  1. Un jinete enemigo corta la casilla que conecta mi granja con mi capital.
  2. **Resultado esperado:** En el mismo frame en que la casilla es cortada, la granja pasa de borde sólido a borde discontinuo parpadeante; aparece un icono de advertencia flotante (exclamación roja) sobre la casilla indicando estado `AISLADO`.

---




### 4.5. Modelo de Datos y Renderizado Multicapa por Casilla (Hex Layer Stack)

* **Definición:** Cada hexágono del mapa (`HexCell`) es una entidad modular compuesta por 6 capas ortogonales e independientes. El motor procesa los datos y renderiza la visualización respetando estrictamente el orden de profundidad (Z-Index):

| Capa | Nombre | Tipo de Dato | Valores Posibles | Representación Visual |
| :--- | :--- | :--- | :--- | :--- |
| **Capa 1** | **Terreno Base** | `Enum` | `LLANO`, `COLINA`, `MONTAÑA`, `RIO`, `MAR` | **Color de fondo base:** Verde claro (Llano), Ocre (Colina), Gris roca (Montaña), Azul (Río/Mar). Determina coste de movimiento. |
| **Capa 2** | **Recurso Natural** | `Enum` | `NINGUNO`, `ORO`, `TRIGO`, `MADERA` | **Icono lateral diminuto (32-bit):** Anclado en el vértice superior izquierdo del hexágono. |
| **Capa 3** | **Edificio / Infraestructura**| `Enum` | `NINGUNO`, `ARBOL`,`CAMINO`, `CAMPAMENTO`, `PUEBLO`, `CIUDAD`, `GRANJA`, `TORRE`, `BASTIÓN` | **Sprite isométrico central:** Ilustración de la estructura anclada al suelo. |
| **Capa 4** | **Dueño (Faction ID)** | `Int` | `-1 (Neutral)`, `0 (Jugador 1)`, `1..N (IAs/Rivales)` | **Fondo y Contorno:** Tinte translúcido del color dinástico sobre el suelo y borde perimetral continuo. |
| **Capa 5** | **Es Capital** | `Boolean` | `TRUE`, `FALSE` | **Insignia flotante:** Corona o estrella dorada en el vértice superior del hexágono. Toda provincia válida debe tener exactamente una casilla con `TRUE`. |
| **Capa 6** | **Contenido Dinámico** | `Enum / Object` | `VACIO`, `TUMBA`, `UNIDAD(Ref)` | **Sprite interactivo prioritario:** Centrado en la casilla (el árbol bloquea paso; la unidad tiene animación idle; la tumba desaparece en 3 turnos). |


#### 4.5.1 Cómo se compone visualmente el Hexágono (Render Stack / Z-Index)

Para que ningún elemento tape a otro, el orden de dibujado (*Z-Index*) y la posición en pantalla deben ser milimétricos:

        [⭐ Capa 5: Corona Capital (Superior)]
            /                           \
        [🌾 Capa 2: Icono Recurso]       \
          (Esquina Sup-Izq)                \
        /                                    \
       |     [🏰 Capa 3: Edificio Base/Arbol]|
       |      [💂 Capa 6: Unidad/Tumba]      |  <-- Centro del Hexágono
        \     (Sobre el edificio)           /
         \                                 /
          \                               /
   [🎨 Capa 1: Terreno Base (Color)] + [🛡️ Capa 4: Dueño ID (Tinte y Borde)]


##### Ajuste Fino de Compatibilidad (Matriz de Coexistencia)

cada casilla tiene estas 6 capas son propiedades, características.

* **¿Pueden convivir todas las Capas solo la capa 6 se superpone a la 3 (Edificio) como íconos.   
  👉 **SÍ.** Si hay una Ciudad (Capa 3) y una Tropa (Capa 6), la tropa actúa como **Guarnición defensiva**.

La Capa 3 admite Edificios, el Arbol es un tipo de edificio natural que anula los beneficios económicos de la casilla:  
  `NINGUNO` |`Arbol` | `CAMINO` | `CAMPAMENTO` |`BASTIÓN` |`PUEBLO` | `CIUDAD` |

La Capa 6 admite unidades:  
  `NINGUNO` |`Tumba` | `UNIDAD` |

#### Reglas de Coexistencia y Exclusión Mutua:
1. Si se despliega una unidad militar (`Capa 6 == UNIDAD`) sobre una casilla con edificio (`Capa 3 == CIUDAD` o `TORRE`), la unidad adopta el estado `EN_GUARNICIÓN`, sumando la defensa del edificio a su propia defensa.
2. Si una provincia queda dividida en dos fragmentos por un corte territorial y una mitad se queda sin `Capa 5 == TRUE`, el edificio de mayor jerarquía de ese fragmento huérfano es promovido automáticamente a Capital (`es_capital = TRUE`).
2.1 Si una provincia queda dividida en dos fragmentos por un corte territorial y una mitad se queda sin `Capa 3 == CAMPAMENTO` O SUPERIOR, SE CREA EL edificio `CAMPAMENTO`.


* **Prueba de Renderizado y Datos:**
  1. Instancio una casilla con la siguiente configuración:
     * Capa 1: `COLINA`
     * Capa 2: `ORO`
     * Capa 3: `CIUDAD`
     * Capa 4: `Jugador_Azul`
     * Capa 5: `TRUE`
     * Capa 6: `Guardia (Tier 2)`
  2. **Resultado esperado:**
     * En memoria, la celda se serializa en un payload compacto: `{"c1":"COLINA","c2":"ORO","c3":"CIUDAD","c4":0,"c5":true,"c6":{"type":"GUARD"}}`.
     * En pantalla, se renderiza la colina teñida de azul; se aprecia el icono de pepita de oro en la esquina superior izquierda; en el centro se dibuja la ciudad con el Guardia patrullando sobre sus almenas; sobre el conjunto flota una corona dorada indicando que es la Capital de la provincia.


### 4.6. Sistema de Interacción Táctil y Overlays de Movimiento
* **Definición:** El movimiento de tropas se realiza mediante **Arrastrar y Soltar (Drag & Drop)** o **Doble Toque (Tap-to-Move)**:
  * Al arrastrar una unidad, el motor dibuja un overlay sobre los hexágonos circundantes:
    * **Verde translúcido:** Casilla propia o neutral conquistable con éxito garantizado.
    * **Azul brillante:** Casilla ocupada por una tropa aliada fusionable ($T1 + T1 = T2$).
    * **Rojo oscuro con cruz:** Casilla enemiga inexpugnable (la defensa rival es mayor o igual que el ataque de la unidad).
    * **Gris / Fuera de rango:** Casillas fuera del alcance de movimiento de la unidad para el turno en curso.

* **Prueba:**
  1. Selecciono un Recluta (Ataque 1) y lo arrastro hacia una casilla enemiga que está protegida por una Torre (Defensa 2).
  2. **Resultado esperado:** La casilla de la Torre se tiñe de rojo oscuro con un icono de candado/cruz; al soltar el dedo sobre ella, la unidad no se mueve, regresa elásticamente a su posición inicial y el dispositivo emite una vibración háptica corta de error.
  3. Arrastro el mismo Recluta sobre otro Recluta propio.
  4. **Resultado esperado:** La casilla aliada se ilumina en azul con el texto "+FUSIÓN (T2)"; al soltar el dedo, se funden en un Guardia.

### 4.7. BATERÍA DE PRUEBAS DE ACEPTACIÓN: SISTEMA EN PARTIDA (QA TEST SUITE)

> **Criterio de Aprobación:** La escena de partida no se considerará terminada si no supera el 100% de estas 10 pruebas automatizadas y funcionales.

#### [TEST-IN-01] Proporciones del HUD y Safe Areas
* **Definición:** Validar que en cualquier pantalla ($16:9$, $19.5:9$, $21:9$) las barras de interfaz no superen el 10% vertical superior e inferior, asegurando > 80% de área táctil libre.
* **Paso a paso:**
  1. Lanzo la escena de partida en un emulador con resolución $1170 \times 2532$ (iPhone con notch y barra inferior).
  2. Mido la altura en píxeles del HUD superior y del HUD inferior.
* **Resultado Esperado:**
  * El HUD superior mide $\le 253$ px (< 10%).
  * El HUD inferior mide $\le 253$ px (< 10%).
  * El área libre para el mapa mide $\ge 2026$ px ($>80\%$).
  * El gesto de zoom (Pinch-to-zoom) escala suavemente entre $0.5\times$ y $2.0\times$.

#### [TEST-IN-02] Recolección de Madera y Actualización de Balances
* **Definición:** Validar que talar un bosque propio otorga madera instantánea y recalcula la telemetría del HUD superior.
* **Precondición:** Reserva: `[🌲 10(+2)]`. Hay un hexágono propio con `Capa 3 == ARBOL`.
* **Paso a paso:**
  1. Selecciono el hexágono con árbol y ejecuto la acción "Talar".
* **Resultado Esperado:**
  * La reserva de madera en el HUD cambia inmediatamente a `[🌲 20(+2)]`.
  * La `Capa 3` de la casilla pasa a ser `NINGUNO` (suelo despejado).
  * La casilla queda libre para construir granjas o torres.

#### [TEST-IN-03] Ciclo de Vida de las Burbujas Diegéticas `💬`
* **Definición:** Validar que los avisos sobre el mapa se desvanecen automáticamente tras 3 segundos o al tocarlos.
* **Precondición:** Se genera un aviso `🔗❌` sobre una casilla que ha quedado aislada.
* **Paso a paso:**
  1. Caso A: No toco la pantalla durante 3.1 segundos.
  2. Caso B: Genero otra burbuja y la toco con el dedo antes de los 3 segundos.
* **Resultado Esperado:**
  * Caso A: La burbuja hace fade-out a los 3 segundos y se destruye en memoria.
  * Caso B: Al tocarla, desaparece de inmediato y la cámara centra suavemente la casilla afectada.

#### [TEST-IN-04] Restricción de Seguridad del Botón Deshacer `[↩️]`
* **Definición:** Validar que el botón `[↩️]` se bloquea si el movimiento reveló información oculta protegida por la niebla de guerra o inició combate.
* **Precondición:** Partida con Niebla "Completa". Tropa propia en la frontera.
* **Paso a paso:**
  1. Muevo la tropa a una casilla propia conocida y pulso `[↩️]`.
  2. Muevo la tropa hacia una casilla con niebla que revela terreno inexplorado e intento pulsar `[↩️]`.
* **Resultado Esperado:**
  * En el paso 1: La tropa regresa a su casilla origen y recupera su acción.
  * En el paso 2: El botón `[↩️]` se oscurece a gris (inactivo) e impide retroceder tras obtener información oculta.

#### [TEST-IN-05] Despliegue de Cajones de Pulgar (`[⛺]` y `[💂]`)
* **Definición:** Tocar un cajón desplegable debe abrir sus 4 opciones y cerrar automáticamente el otro cajón si estuviera abierto.
* **Paso a paso:**
  1. Toco el icono `[⛺]` de Edificios.
  2. Sin seleccionar ningún edificio, toco el icono `[💂]` de Unidades.
* **Resultado Esperado:**
  * Al paso 1: Se despliegan verticalmente hacia arriba `[⛺]`, `[♜]`, `[🏠]`, `[🏰]`.
  * Al paso 2: El menú de edificios se cierra y se abren hacia arriba `[💂]`, `[🏹]`, `[♞]`, `[💣]`. Nunca conviven ambos menús abiertos a la vez.

#### [TEST-IN-06] Consistencia de Serialización del Hex Layer Stack
* **Definición:** Validar que guardar y recargar una celda con sus 6 capas activas produce un estado idéntico de datos y renderizado.
* **Paso a paso:**
  1. Creo una casilla con: `c1: COLINA`, `c2: ORO`, `c3: CIUDAD`, `c4: 0`, `c5: TRUE`, `c6: GUARDIA`.
  2. Guardo la partida, salgo y recargo.
* **Resultado Esperado:**
  * Los 6 campos recuperan sus valores exactos.
  * En pantalla se dibuja la colina teñida de azul, el icono de oro en la esquina superior izquierda, la ciudad en el centro con el Guardia patrullando y la corona dorada de Capital flotando arriba.

#### [TEST-IN-07] Suma Defensiva de Guarnición (`Capa 3 + Capa 6`)
* **Definición:** Validar que una unidad sobre una Torre o Ciudad suma la defensa del edificio a su propia estadística.
* **Precondición:** Torre de Guardia aliada (Defensa 2, en Capa 3) ocupada por un Recluta (Ataque 1 / Defensa 1, en Capa 6).
* **Paso a paso:**
  1. Un enemigo ataca la casilla con un Guardia (Ataque 2).
* **Resultado Esperado:**
  * La defensa total de la casilla se calcula como $2 + 1 = 3$.
  * El ataque de fuerza 2 es rechazado (2 < 3).
  * Ni la torre ni el recluta sufren daños.

#### [TEST-IN-08] Auto-Promoción de Capital en Provincia Huérfana
* **Definición:** Al cortar un territorio en dos, el fragmento que pierde la capital original debe designar una nueva capital automáticamente en el edificio de mayor rango disponible.
* **Precondición:** Provincia con 1 Ciudad Capital y 1 Pueblo conectado por 2 casillas intermedias.
* **Paso a paso:**
  1. Un enemigo captura la casilla intermedia, separando el Pueblo de la Ciudad Capital.
* **Resultado Esperado:**
  * El subgrafo huérfano detecta la ausencia de capital.
  * La casilla del Pueblo actualiza su valor a `es_capital = TRUE` (Capa 5), aparece la corona sobre ella y se le asigna una tesorería independiente.

#### [TEST-IN-09] Feedback Háptico y Visual en Arrastre Inválido
* **Definición:** Arrastrar una unidad contra un objetivo con defensa superior debe mostrar overlay rojo con candado y rebotar al soltar.
* **Precondición:** Recluta propio (Ataque 1) contiguo a un Paladín enemigo (Defensa 3).
* **Paso a paso:**
  1. Arrastro el Recluta sobre la casilla del Paladín y suelto el dedo.
* **Resultado Esperado:**
  * La casilla enemiga se resalta en rojo oscuro con el icono `🔒`.
  * Al soltar, el Recluta regresa elásticamente a su casilla original.
  * El móvil emite una vibración corta (50 ms) y no se descuentan acciones.

#### [TEST-IN-10] Detección Instantánea de Casilla Aislada (`OUT_OF_SUPPLY`)
* **Definición:** Validar que una casilla cortada de su capital pasa visual y lógicamente a estado aislado en el mismo frame.
* **Paso a paso:**
  1. Una tropa enemiga corta el único hexágono de conexión entre una granja aliada y su capital.
* **Resultado Esperado:**
  * En ese mismo instante, el contorno de la granja pasa a línea discontinua roja parpadeante.
  * La producción de comida de esa granja pasa a $0$.
  * Se genera automáticamente la burbuja flotante `🔗❌` sobre ella.

































## 5 Algoritmo Procedural de Generación del Tablero (Procedural Map Pipeline)

* **Definición:** El generador de mapas opera como un pipeline determinista alimentado por una semilla pseudoaleatoria entera (`int64 Seed`). 
La creación del mundo se ejecuta en 7 fases secuenciales sobre una cuadrícula hexagonal de coordenadas cúbicas $(q, r, s)$:

### FASE 1: Tectónica y Mapa de Alturas (Elevación Base - Capa 1)
El motor genera un mapa de alturas normalizado $H(x, y) \in [0.0, 1.0]$ utilizando Ruido Perlin Fractal (3 octavas, persistencia 0.5, lacunaridad 2.0).
* **Borde Insular Obligatorio:** Se aplica una función de degradado radial (*Island Falloff Mask*) desde el centro del mapa para forzar que el anillo perimetral exterior sea siempre mar cerrado:
  $$H_{final} = H(x, y) - \left( \frac{\text{distancia al centro}}{\text{radio máximo}} \right)^2$$
* **Asignación de Elevación (Capa 1 Inicial):**
  * $H_{final} < 0.28 \to$ **`MAR`** (Agua profunda, bloquea infantería terrestre).
  * $0.28 \le H_{final} < 0.70 \to$ **`LLANO`** (Coste de movimiento base: 1 PA).
  * $0.70 \le H_{final} < 0.88 \to$ **`COLINA`** (Coste de movimiento base: 2 PA; otorga $+1$ rango de visión).
  * $H_{final} \ge 0.88 \to$ **`MONTAÑA`** (Impasable; bloquea movimiento, suministros y visión).

### FASE 2: Red Hidrológica y Trazo de Ríos (Generación de `RIO` en Capa 1)
Los ríos no aparecen al azar: nacen en zonas altas y buscan el nivel del mar siguiendo la gravedad (*Gradient Descent Pathfinding*):
1. **Nacientes (Manantiales):** El motor selecciona entre 2 y 5 casillas de tipo `MONTAÑA` o `COLINA` con la mayor elevación local.
2. **Algoritmo de Descenso:** Desde cada manantial, el flujo busca en cada paso el hexágono vecino con el valor de altura $H$ más bajo:
   * La casilla de paso se transforma a: **`Capa 1 = RIO`**.
   * *Propiedad del Río:* La casilla `RIO` es transitable por tierra pero tiene coste de movimiento 2 PA (o requiere tecnología de puentes); otorga bono de fertilidad a sus riberas.
3. **Desembocadura o Lago:** El flujo termina cuando el río toca una casilla de `MAR`. Si el río queda atrapado en una depresión sin salida hacia el mar (pozo local), la última casilla se convierte en un lago interior de agua dulce.

### FASE 3: Clima, Humedad y Biomasa (Humedad Secundaria)
Se calcula una segunda capa de ruido independiente: el Mapa de Humedad $M(x, y) \in [0.0, 1.0]$, influenciada por la cercanía al agua:
* Toda casilla adyacente a `MAR` o `RIO` recibe un bono de $+0.30$ a su valor de humedad $M$.
* **Cruce de Elevación y Humedad (Determinación de Biomas):**
  * Humedad baja ($M < 0.30$) $\to$ **Bioma Desértico/Árido** (Llanos de arena, cactus, oasis).
  * Humedad media ($0.30 \le M < 0.70$) $\to$ **Bioma Templado** (Praderas, tierras cultivables).
  * Humedad alta ($M \ge 0.70$) $\to$ **Bioma Húmedo** (Pinares densos, pantanos, selva).
  * *Excepción ártica:* Si el selector de partida configuró "Tundra", el mapa de temperaturas se desplaza hacia frío global, sustituyendo las llanuras por casillas de nieve y hielo.

### FASE 4: Distribución Orgánica de Recursos y Bosques (Capas 2 y 3)
Los recursos no se espolvorean como confeti; se generan en cúmulos orgánicos mediante **Autómatas Celulares**:

1. **Bosques y Madera (`Capa 3 = ARBOL` y `Capa 2 = MADERA`):**
   * Se plantan "semillas de bosque" en casillas de humedad alta ($M \ge 0.60$).
   * Se ejecutan 2 iteraciones de un autómata celular: una casilla vacía se convierte en bosque si tiene 3 o más vecinos con bosque. Esto crea masas forestales contiguas y realistas.
2. **Yacimientos de Oro (`Capa 2 = ORO`):**
   * Solo pueden spawnear en casillas de `COLINA` o casillas adyacentes a `MONTAÑA` ($25\%$ de probabilidad en colinas).
3. **Trigo y Cultivos (`Capa 2 = TRIGO`):**
   * Solo spawnean en casillas de `LLANO` que tengan $M \ge 0.40$. Probabilidad del $50\%$ si están directamente adyacentes a una casilla de `RIO`.

### FASE 5: Nodos Menores y Aldeas Neutrales (Capa 3)
* Para evitar mapas vacíos entre capitales, el motor siembra **Asentamientos Neutrales Menores**:
  * En el territorio neutral entre civilizaciones se instancian entre 2 y 6 casillas con:
    `Capa 3 = PUEBLO`, `Capa 4 = -1 (Neutral)`, `Capa 5 = FALSE`.
  * Estos pueblos neutrales no tienen ejército móvil; están defendidos por una milicia pasiva local de nivel 1. Capturarlos permite anexionar territorio secundario sin tener que colonizar desde cero.

### FASE 6: Spawning Equitativo y Test de Transitabilidad (Fair Spawning)
Esta fase garantiza que la partida sea justa y que nadie pierda por mala suerte geográfica:
1. **Posicionamiento Equidistante:** Se divide el mapa en cuadrantes Voronoi según el número de jugadores ($N$). Cada Capital se coloca en el centroide de su cuadrante.
2. **Validación del Anillo Natal (Radio $R \le 2$ desde la Capital):**
   * El generador limpia las 6 casillas inmediatas de la Capital: ninguna puede ser `MONTAÑA` ni `MAR`.
   * Se fuerza la aparición de: mínimo 2 casillas con `TRIGO`, 1 bosque con `MADERA` y al menos 1 `COLINA`.
3. **Test de Conectividad Obligatorio (Algoritmo A* / Flood-Fill de Tierra):**
   * El motor traza un camino de búsqueda $A^*$ entre la Capital del Jugador y cada una de las Capitales rivales.
   * **Regla de Rechazo:** Si una cordillera de montañas o un río infranqueable aísla a una capital impidiendo que exista un camino terrestre continuo hacia los rivales, **la semilla se descarta de inmediato** y el generador vuelve a iterar automáticamente (máximo 50 intentos hasta encontrar una semilla matemáticamente justa).

### FASE 7: Inyección del Sesgo Doctrinal de la Tribu (Tribe Hook)
* Una vez aprobado el mapa, el generador lee el perfil de la tribu del jugador local:
  * Si posee una doctrina de afinidad territorial (ej. `CIV_TYPE_NOMAD`, `GOV_AMPHIBIOUS`, o afinidad a Desierto/Nieve):
    * Se ejecuta un *Flood-Fill* radial desde la Capital del jugador hasta distancia 3.
    * Transforma el bioma de esa zona para que coincida con la afinidad del jugador (ej. convierte el pasto en estepa arenosa o nieve), **pero preservando intactos los recursos (Capa 2)** ya calculados en la Fase 6.

### BATERÍA DE PRUEBAS DE ACEPTACIÓN: GENERACIÓN DE MAPA (MAP GEN SUITE)

#### [TEST-MAP-01] Descenso Topográfico del Río
* **Definición:** Validar que ninguna casilla de `RIO` fluya cuesta arriba y que toda red fluvial desemboque en `MAR` o lago.
* **Paso a paso:**
  1. Genero 50 mapas con semillas aleatorias.
  2. Rastro cada casilla con `Capa 1 == RIO` desde su origen hasta su fin.
* **Resultado Esperado:** En el 100% de los casos, la elevación $H$ de la casilla de río $N+1$ es menor o igual a la casilla $N$; ningún río queda cortado abruptamente en medio de una colina sin formar agua acumulada.

#### [TEST-MAP-02] Integridad de Bosques Celulares (Agrupamiento Orgánico)
* **Definición:** Validar que los árboles no aparecen como celdas solitarias desconectadas en el desierto, sino en masas forestales cohesionadas.
* **Paso a paso:**
  1. Escaneo todas las casillas con `Capa 3 == ARBOL` en un mapa templado.
  2. Calculo cuántos árboles tienen al menos otro árbol en sus 6 casillas adyacentes.
* **Resultado Esperado:** Al menos el $85\%$ de los árboles del mapa forman parte de un bosque de 2 o más casillas contiguas; el 0% de árboles aparece en casillas con humedad árida ($M < 0.20$).

#### [TEST-MAP-03] Test de Transitabilidad y Cero Aislamiento (Anti-Stuck Spawn)
* **Definición:** Garantizar que ninguna facción nace atrapada dentro de un círculo cerrado de montañas o agua sin salida.
* **Paso a paso:**
  1. Instancio una partida con 4 jugadores en tamaño Mediano.
  2. Ejecuto un algoritmo BFS de búsqueda de caminos desde la Capital 1 hacia la Capital 2, 3 y 4 utilizando solo casillas transitables terrestres (`LLANO`, `COLINA`, `RIO`).
* **Resultado Esperado:** El BFS retorna una ruta válida hacia las 3 capitales rivales sin error; la distancia de la ruta más corta es de al menos 8 hexágonos de distancia.

#### [TEST-MAP-04] Paridad de Recursos en el Anillo Natal
* **Definición:** Comprobar que todas las facciones arrancan con paridad de oportunidades económicas en su radio inmediato ($R \le 2$).
* **Paso a paso:**
  1. Evalúo los recursos presentes en las casillas a distancia $\le 2$ de cada una de las capitales generadas.
* **Resultado Esperado:** En el 100% de los spawns, cada jugador cuenta con: exactamente $\ge 2$ casillas de `TRIGO`, $\ge 1$ casilla de `MADERA` y cero casillas de `MONTAÑA` inmediatamente adyacentes (distancia 1) a la casilla central de la Capital.





## 2. GENERACIÓN DE TABLERO Y VISIBILIDAD

### 2.1. Tablero Hexagonal y Niebla de Guerra
* **Definición:** El mapa es una cuadrícula de hexágonos regulares con coordenadas cúbicas $(q, r, s)$ donde $q + r + s = 0$. La Niebla de Guerra cubre todo el mapa excepto los hexágonos situados a una distancia máxima de 2 casillas de la Ciudad Capital del jugador.
* **Prueba:**
  1. Se genera un mapa aleatorio de tamaño mediano (radio de 12 hexágonos).
  2. Inspecciono la visualización del jugador 1.
  3. **Resultado esperado:** Solo las celdas a distancia $\le 2$ de la Ciudad Capital son visibles (revelando terreno y recursos); las celdas a distancia $\ge 3$ están cubiertas por una capa opaca que oculta unidades y accidentes geográficos.

---

## 3. IDENTIDAD TERRITORIAL Y LÍNEAS DE SUMINISTRO

### 3.1. Propiedad de Hexágonos y Contigüidad
* **Definición:** Cada hexágono tiene un estado de propiedad: `Neutral` o `Jugador(ID)`. Los hexágonos de un mismo jugador forman una provincia si están conectados lado a lado. Cada hexágono propio debe tener un camino ininterrumpido de casillas del mismo color que conduzca a una Ciudad propia. Si este camino se rompe, el hexágono entra en estado `AISLADO`.
* **Prueba:**
  1. El jugador posee una línea continua de 5 hexágonos: $[H_1 (Ciudad), H_2, H_3, H_4, H_5]$.
  2. Una unidad enemiga captura $H_3$.
  3. **Resultado esperado:** $H_1$ y $H_2$ permanecen en estado `CONECTADO`. Las casillas $H_4$ y $H_5$ cambian su estado de suministro inmediatamente a `AISLADO` y se muestra un contorno visual intermitente sobre ellas.

---

## 4. SISTEMA MILITAR Y COMBATE DETERMINISTA

### 4.1. Jerarquía de Tiers de Infantería
* **Definición:** Las unidades de infantería no tienen barra de vida (HP) ni probabilidad de fallo. Existen 3 niveles con valores fijos:
  * Tier 1 (Recluta): Ataque 1, Defensa 1, Coste: 10 monedas, Mantenimiento: 2 monedas/turno.
  * Tier 2 (Guardia): Ataque 2, Defensa 2, Coste: 20 monedas (o fusión), Mantenimiento: 6 monedas/turno.
  * Tier 3 (Paladín): Ataque 3, Defensa 3, Coste: 30 monedas (o fusión), Mantenimiento: 18 monedas/turno.
* **Prueba:**
  1. Selecciono la Ciudad con 10 de oro en tesorería y pulso "Reclutar T1".
  2. **Resultado esperado:** Se descuentan 10 de oro; aparece un Recluta en una casilla propia vacía adyacente; el mantenimiento del turno aumenta en 2.

### 4.2. Fusión de Unidades (Mecánica *Antiyoi*)
* **Definición:** Arrastrar una unidad propia sobre otra unidad propia de infantería las fusiona sumando sus tiers, hasta un máximo de Tier 3.
  * $T1 + T1 = T2$
  * $T2 + T1 = T3$
* **Prueba:**
  1. Muevo un Recluta (T1) sobre la casilla ocupada por otro Recluta (T1).
  2. **Resultado esperado:** Las dos unidades desaparecen y son reemplazadas por un único Guardia (T2) en esa casilla; el mantenimiento total de la provincia pasa de 4 ($2 + 2$) a 6.

### 4.3. Zona de Control y Resolución de Invasión
* **Definición:** Un hexágono propio está defendido por el valor de defensa más alto entre:
  * La unidad situada en esa casilla.
  * Una unidad propia ubicada en cualquier casilla directamente adyacente.
  * Una Torre de defensa (Defensa = 2).
  Una casilla solo puede ser conquistada por un atacante cuyo valor de Ataque sea estrictamente **mayor** que la Defensa total de la casilla.
* **Prueba:**
  1. Una casilla enemiga vacía está al lado de un Guardia enemigo (Defensa 2).
  2. Intento mover un Recluta propio (Ataque 1) hacia esa casilla vacía.
  3. **Resultado esperado:** La interfaz bloquea el movimiento mostrando un indicador rojo de "Fuerza insuficiente (1 vs 2)".
  4. Muevo un Paladín propio (Ataque 3) a la misma casilla.
  5. **Resultado esperado:** La casilla cambia al color del jugador atacante; el Paladín ocupa la casilla con éxito.

### 4.4. Unidades Tácticas Especiales (Mecánica *Hexonia*)
* **Definición:**
  * **Arquero:** Coste 15, Mantenimiento 4. Ataque a distancia (rango 2 casillas). No captura terreno. Al atacar una casilla enemiga, reduce su valor de defensa en $-1$ durante el turno en curso.
  * **Jinete:** Coste 20, Mantenimiento 5. Ataque 1, Defensa 1. Puede desplazarse 2 casillas a través de territorio neutral o enemigo (a diferencia de la infantería que avanza solo 1 paso en avance hostil).
* **Prueba:**
  1. Un hexágono enemigo tiene Defensa 2.
  2. Selecciono un Arquero a 2 casillas de distancia y ataco el hexágono.
  3. Intento avanzar con un Recluta propio (Ataque 1) sobre esa misma casilla.
  4. **Resultado esperado:** Tras el disparo del Arquero, la defensa del hexágono se muestra temporalmente como 1; el Recluta propio (Ataque 1) ahora sí puede avanzar y capturar el hexágono.

---

## 5. ECONOMÍA, CIUDADES Y BANCA ROTA ESCALONADA

### 5.1. Ingreso por Ciudad y Cosecha de Recursos
* **Definición:** Las ciudades recolectan automáticamente los recursos presentes en su anillo circundante (frutas: $+2$ oro, canteras: $+3$ oro). Los hexágonos base normales sin recursos aportan $+1$ oro. La tesorería de la provincia es la suma de los ingresos de sus casillas menos el mantenimiento de sus unidades.
* **Prueba:**
  1. Una provincia cuenta con: 1 Ciudad, 4 hexágonos planos ($+4$), 1 arbusto de fruta cosechado ($+2$) y 1 Recluta ($-2$).
  2. Pulso el botón "Fin de Turno".
  3. **Resultado esperado:** La tesorería acumulada se incrementa exactamente en $+4$ monedas ($4 + 2 - 2$).

### 5.2. Deserción Escalonada por Déficit (Anti-Muerte Súbita)
* **Definición:** Si al presionar "Fin de Turno", el saldo resulta negativo ($\text{Tesorería} + \text{Balance} < 0$), no muere todo el ejército. En su lugar:
  1. La unidad con mayor mantenimiento se degrada un Tier ($T3 \to T2$, o $T2 \to T1$, o $T1 \to \text{eliminada}$).
  2. La tesorería queda fijada en 0.
* **Prueba:**
  1. La tesorería del jugador es de 1 moneda. El ingreso es $+2$ y el mantenimiento es $-6$ (Balance: $-4$). El ejército consta de un Paladín (T3).
  2. Pulso "Fin de Turno".
  3. **Resultado esperado:** La tesorería no cae a $-3$, se fija en 0; el Paladín (T3) se convierte inmediatamente en un Guardia (T2); aparece una alerta visual: *"Deserción por falta de suministros"*.

## 6. SISTEMAS Y MECÁNICAS CORE DEL MOTOR DE JUEGO (CORE RULES ENGINE)

> **Regla de Arquitectura:** Cada subsistema del motor se define mediante su **Regla Base (Vanilla)**, su matriz de **Ganchos de Tribu (Hooks)** que sobreescriben la lógica estándar y sus respectivas **Pruebas de Aceptación**.

### 6.1. MOVIMIENTO, TERRENO Y MANIOBRA

#### 6.1.1. Puntos de Acción (PA) y Costes de Desplazamiento
* **Regla Base (Vanilla):** Toda unidad militar dispone de **1 Acción por Turno** (Mover, Atacar).
  1. **Red Amiga Conectada (*Highway Move*):** Si la unidad se desplaza entre casillas propias contiguas con edificio `CAMINO` en estado `CONECTADO`, el movimiento tiene coste de **0.5 PA** (a cualquier casilla propia que no esté ocupada) y finaliza el turno de la unidad.
  2. **Avance Hostil / Invasión:** Moverse hacia una casilla neutral o enemiga consume **1 PA** y finaliza el turno de la unidad.
     * *Infantería (T1, T2, T3):* Rango de avance hostil = **1 hexágono**.
     * *Caballería (Jinetes):* Rango de avance hostil = **2 hexágonos** en terreno llano.
  
#### 6.1.2. Las 5 Familias Militares
Cada unidad pertenece a una de las 5 clases fundamentales con estadísticas base (Vanilla):

| Clase de Unidad | Rol Principal | PA Base | Ataque Base | Defensa Base | Capacidad Especial |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. INFANTERÍA** | Conquista y Línea | 1 PA | 1 (T1) a 3 (T3) | 1 (T1) a 3 (T3) | **Captura casillas** y puede fusionarse ($T1+T1=T2$). |
| **2. CABALLERÍA** | Incursión y Flanqueo | 2 PA | 2 | 1 | **Maniobra hostil:** Avanza 2 casillas en terreno despejado. No fusiona. |
| **3. ARQUEROS** | Balística y Soporte | 1 PA | 1 | 0 (Cuerpo a cuerpo) | **Ataque a distancia (Rango 2):** Aplica $-1$ a la defensa enemiga. |
| **4. ASEDIO** | Demolición | 1 PA | 1 (vs Tropa) / **4 (vs Edificio)**| 0 | **Destructor de muros:** Rango 2. Requiere 1 turno inmóvil para disparar. |
| **5. BARCOS** | Dominio Náutico | 2 PA | 2 | 2 | **Navegación pura:** No puede pisar tierra firme. Transporta o bombardea costas. |

#### 6.1.3. Matriz Exhaustiva: Comportamiento de Unidad $\times$ Terreno Base (Capa 1)

Esta tabla es la ley física que el motor consulta para cada movimiento, Y ES TOTALMENTE PARAMETRIZABLE, Por lo que puede cambiar en el tiempo:

| Terreno (Capa 1) | 1. INFANTERÍA | 2. CABALLERÍA | 3. ARQUEROS | 4. ASEDIO (Cañón) | 5. BARCOS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`LLANO`** | • Coste: 1 PA.<br>• Transitable.<br>• Combate normal. | • Coste: 1 PA.<br>• **Bono de Carga:** Si mueve 2 casillas rectas, $+1$ Ataque. | • Coste: 1 PA.<br>• Rango estándar (2 casillas). | • Coste: 1 PA.<br>• Puede moverse y disparar si no movió antes. | ❌ **IMPASABLE**<br>(Encalla/Destruido). |
| **`COLINA`** | • Coste: 1 PA.<br>• Otorga $+1$ Defensa si se defiende en ella. | • Coste: 2 PA (agota turno).<br>• Pierde el Bono de Carga. | • Coste: 1 PA.<br>• **Ojo de Halcón:** Su rango de tiro aumenta a **3 casillas**. | • Coste: 2 PA (agota turno).<br>• No puede disparar en el turno que entra. | ❌ **IMPASABLE**. |
| **`MONTAÑA`** | Coste: 2 PA | ❌ **IMPASABLE**<br>(Bloqueo absoluto base). | Coste: 2 PA | ❌ **IMPASABLE**<br>(Bloqueo absoluto base). | ❌ **IMPASABLE**. |
| **`RIO`** | • Coste: Agota el turno al cruzar.<br>• Si hay `CAMINO`, cruza gratis a 1 PA. | • Coste: Agota turno completo.<br>• Defensa local reducida a 0 mientras esté en el agua. | • Coste: Agota turno.<br>• Puede disparar a través del río sin penalización. | ❌ **IMPASABLE sin puente** (`CAMINO`). No puede cruzar a vado. | • **Navegable:** Coste 1 PA.<br>• Puede remontar el río hacia el interior continental. |
| **`MAR`** | • **Embarque:** Requiere agotar el turno en costa para mutar a *Balsa de Transporte* (Atk 0 / Def 1). | ❌ **NO EMBARCA DIRECTAMENTE**.<br>Requiere un Puerto (`PUEBLO`/`CIUDAD` costera) para subir a transporte. | • **Embarque en Balsa:** Puede disparar desde el agua pero con rango reducido a 1. | ❌ **NO EMBARCA EN BALSA**.<br>Solo se transporta mediante Barcos de Transporte dedicados. | • **Dominio Total:** Coste 1 PA.<br>• Mueve 2 casillas por turno en aguas profundas. |

#### 6.1.4. AUDITORÍA Y ARQUITECTURA DE LAS 81 DOCTRINAS (TRIBE HOOKS)

Para garantizar que **ninguna de las 81 doctrinas quede huérfana**, el motor no usa código disperso. Utiliza un **Despachador Central de Eventos (*Hook Dispatcher*)** con 5 puntos de inyección únicos. 

Cada una de las 81 variables pertenece a uno de estos 5 cables del motor:

```text
                                [MOTOR DE JUEGO]
                                       │
     ┌──────────────────┬──────────────┴─────┬──────────────────┐
     ▼                  ▼                    ▼                  ▼
[1. HOOK_MOVE]    [2. HOOK_COMBAT]     [3. HOOK_SUPPLY]   [4. HOOK_ECONOMY]
(Matriz Terreno)   (Ataque/Defensa)     (Grafo/Deserción)   (Oro/Trigo/Madera)
     │                  │                    │                  │
(Afecta a 12 tags) (Afecta a 24 tags)   (Afecta a 18 tags) (Afecta a 27 tags de Victoria)
```

##### Mapeo Exhaustivo de Doctrinas que alteran la Matriz de Movimiento y Terreno:

Aquí tienes la lista completa de todas las doctrinas del catálogo que sobreescriben la tabla anterior:

1. **`CIV_TYPE_THALASSOCRACY` (A2):** La Infantería y Caballería embarcan en `MAR` a coste 0 PA (sin agotar turno).
2. **`DRAKKAR_STRIKE` (A2.2.2):** Los Barcos pueden ejecutar ataques terrestres sobre casillas de `LLANO` o `COLINA` a distancia 1.
3. **`SACRED_SWAMP` (A2.3.1):** Las unidades enemigas sufren coste doble de PA al cruzar ríos o pantanos propios.
4. **`CIV_TYPE_NOMAD` (A3):** La Caballería no sufre penalización de 2 PA en `COLINA` (mueve a coste 1 PA).
5. **`SCOUT_NETWORK` (A3.3.1):** La Infantería puede cruzar `MONTAÑA` a coste de 2 PA (desbloquea el paso impasable).
6. **`BORDER_AMBUSH` (A3.3.3):** Estar en bosque o colina otorga invisibilidad a Infantería y Arqueros hasta atacar.
7. **`TACTIC_HEAVY_LINE` (B1):** La Infantería tiene fijado su movimiento a 1 hexágono máximo en cualquier terreno (incluso en red amiga).
8. **`CASTRAMETATION` (B1.1.3):** La Infantería puede construir una empalizada de campaña en `LLANO` consumiendo su turno.
9. **`TACTIC_MOBILE_WAR` (B2):** La Caballería ignora la penalización de `COLINA` y puede avanzar 3 casillas en avance hostil.
10. **`PARTHIAN_RETREAT` (B2.1.1):** Si la Caballería ataca a distancia, recibe inmediatamente $+1$ punto de retirada si la casilla trasera es `LLANO`.
11. **`WAR_STAMPEDE` (B2.2.2):** La Caballería empuja al defensor un hexágono hacia atrás si el terreno trasero es transitable.
12. **`OVERWATCH_INTERDICTION` (B3.1.1):** Los Arqueros en `COLINA` disparan automáticamente en el turno del rival si este cruza un `RIO` a la vista.

*(Todas las demás doctrinas restantes de las 81 pertenecen a Combate, Suministro, Economía o Victoria, y se inyectan en sus apartados correspondientes).*



#### 6.1.5 BATERÍA DE PRUEBAS DE ACEPTACIÓN: UNIDADES $\times$ TERRENO

#### [TEST-MOV-00] Arquero en Colina: Activación de Ojo de Halcón
  1. Unidad de Infantería propia se encuentra en una casilla de pasto propia conectada a la capital.
  2. Muevo la unidad a otra casilla propia conectada a 2 hexágonos de distancia.
  3. **Resultado esperado:** La unidad se desplaza el doble de lo que haría si no hay camino y no es su territorio.
  4. Desde allí, ordeno avanzar hacia un hexágono neutral vecino.
  5. **Resultado esperado:** La unidad captura el hexágono neutral, su sprite se atenúa a escala de grises y su PA pasa a 0 para el resto del turno.


#### [TEST-MOV-01] Arquero en Colina: Activación de Ojo de Halcón
* **Definición:** Validar que un Arquero sobre `COLINA` incrementa su rango de tiro de 2 a 3 hexágonos.
* **Precondición:** Arquero propio en casilla de `LLANO`. Unidad enemiga a 3 casillas de distancia en línea visual.
* **Paso a paso:**
  1. Selecciono el Arquero en el llano e intento atacar a la tropa enemiga a distancia 3.
  2. Muevo el Arquero a una casilla adyacente de tipo `COLINA`.
  3. En el siguiente turno, intento atacar a la misma tropa a distancia 3.
* **Resultado Esperado:**
  * En el paso 1: El ataque está bloqueado (fuera de rango 2).
  * En el paso 3: El objetivo a distancia 3 se ilumina en rojo; el disparo se ejecuta con éxito degradando la defensa rival.

#### [TEST-MOV-02] Barco vs. Terreno Terrestre (Impasabilidad)
* **Definición:** Validar que un Barco solo puede navegar por `MAR` o `RIO` y tiene prohibido entrar en `LLANO`.
* **Precondición:** Barco propio en casilla de costa (`MAR`). Casilla adyacente es `LLANO` y otra vecina es `RIO`.
* **Paso a paso:**
  1. Intento arrastrar el Barco hacia la casilla de `LLANO`.
  2. Arrastro el Barco hacia la casilla de `RIO`.
* **Resultado Esperado:**
  * En el paso 1: La casilla de tierra muestra overlay rojo de bloqueo; el barco no se mueve y vibra.
  * En el paso 2: El barco entra con éxito navegando por el río tierra adentro consumiendo 1 PA.

#### [TEST-MOV-03] Caballería: Carga en Llano vs. Freno en Colina
* **Definición:** Validar que la caballería obtiene bono de ataque en línea recta sobre llano, pero pierde la bonificación y gasta todo su turno si entra en colina.
* **Precondición:** Jinete propio con 2 PA en `LLANO`. A 2 casillas de distancia recta en `LLANO` hay un Recluta enemigo. En otra ruta alternativa hay una `COLINA`.
* **Paso a paso:**
  1. Caso A: Muevo el jinete 2 casillas rectas sobre `LLANO` e impacto al enemigo.
  2. Caso B: Muevo el jinete hacia la casilla de `COLINA`.
* **Resultado Esperado:**
  * En el Caso A: El log registra: *"Carga de Caballería: Ataque $2 + 1 = 3$"*; el Recluta es destruido.
  * En el Caso B: El jinete entra en la colina y sus PA pasan inmediatamente de 2 a 0 (agotado); no puede atacar en ese turno.

#### [TEST-MOV-04] Asedio: Restricción Fluvial sin Camino
* **Definición:** Validar que una Catapulta no puede cruzar un `RIO` si no existe una estructura de `CAMINO` (puente).
* **Precondición:** Catapulta propia adyacente a casilla de `RIO` sin camino.
* **Paso a paso:**
  1. Intento cruzar el río con la Catapulta hacia la otra orilla.
  2. Construyo un `CAMINO` en la casilla de río con una unidad civil.
  3. Intento cruzar nuevamente con la Catapulta.
* **Resultado Esperado:**
  * En el paso 1: Movimiento bloqueado (*"El asedio pesado no puede cruzar agua a vado"*).
  * En el paso 3: La Catapulta cruza a través del puente consumiendo su PA.

#### [TEST-MOV-05] Validación de Gancho: El Jinete Parto (`PARTHIAN_RETREAT`)
* **Definición:** Validar que la doctrina `B2.1.1` otorga retirada táctica de 1 casilla a la caballería tras disparar.
* **Precondición:** Facción con doctrina `PARTHIAN_RETREAT`. Jinete a 2 casillas de un enemigo. La casilla inmediatamente posterior del jinete es un `LLANO` vacío.
* **Paso a paso:**
  1. El jinete dispara su arco a distancia contra el enemigo.
* **Resultado Esperado:**
  * El proyectil impacta al rival.
  * El motor evalúa el hook `PARTHIAN_RETREAT` y no agota los PA del jinete: le deja exactamente 1 punto de retroceso forzado.
  * El jinete retrocede al hexágono posterior de forma automática o manual, quedando fuera del alcanc

### 6.2. MATRIZ DE COMBATE DETERMINISTA, FUSIONES Y ASEDIO

#### 6.2.1. Resolución de Combate sin Azar (Zero-RNG)
* **Regla Base (Vanilla):** No existen barras de vida (HP), golpes críticos ni fallos. El combate se resuelve por comparación directa entre el **Poder de Ataque del Agresor** ($A$) y el **Valor Defensivo de la Casilla Objetivo** ($D$):
  $$D = \max(Defensa_{\text{Tropa Local}}, Defensa_{\text{Edificio}}) + Bono_{\text{Zona de Control}}$$
  * **Si $A > D$:** El atacante captura la casilla con éxito absoluto.
    * La unidad o edificio defensor es destruido (la tropa eliminada genera una `TUMBA` en Capa 6 si la casilla no es ocupada por el agresor ARQUEROS, ASEDIO) .
    * El atacante ocupa el hexágono y su PA pasa a 0 INFANTERIA, CABALLERIA, BARCOS.
  * **Si $A \le D$:** **Movimiento Ilegal**. El motor bloquea la orden, reproduce feedback visual rojo de bloqueo y la unidad atacante no se mueve.

#### 6.2.2. Jerarquía de Tiers y Fórmulas de Fusión
* **Regla Base:** La UNIDAD se fusiona arrastrando una tropa activa sobre otra tropa propia dentro del mismo turno:
  * Tier 1 (Recluta): Ataque 1, Defensa 1 (Coste: 10g, 5 comida).
  * Tier 2 (Guardia): Ataque 2, Defensa 2 $\to$ Resultado de fusionar: $T1 + T1$.
  * Tier 3 (Paladín): Ataque 3, Defensa 3 $\to$ Resultado de fusionar: $T2 + T1$.
  * La fusión agota las acciones de ambas unidades para el turno en curso.

#### 6.2.3. Unidades Tácticas: Arquería y Asedio
* **Arquero (Ataque a Distancia):**
  * Rango de tiro: 2 casillas en línea visual despejada.
  * Acción: No captura el hexágono. Al disparar, aplica el estado temporal `DEFENSA_DEGRADADA` (reduce la $D$ de la casilla objetivo en $-1$ durante el turno activo).
* **Asedio:**
  * Rango de tiro: 2 casillas. Ataque contra tropas = 1; **Ataque contra Edificios (Capa 3) = 4**.
  * si la casilla no tiene unidad, Degrada un Edificio, por ejemplo `CIUDAD` a `PUEBLO`.
  * si la casilla tiene unidad, se mide la resolución del combate y no afecta al edificio.


#### 6.2.4. REGISTRO EXHAUSTIVO DE LAS 24 VARIABLES DE COMBATE (TRIBE HOOKS)

El motor evalúa estas 24 doctrinas en el cálculo de Ataque, Defensa, Rango y Resolución:

##### Grupo A: Infantería Pesada y Defensas (6 Doctrinas)
1. **`[TESTUDO_SHIELD]` (B1.1.1):** Si 2 o más infanterías aliadas son adyacentes, cada una suma $+1$ a su Defensa por cada infantería vecina contra ataques a distancia.
2. **`[PRAETORIAN_GUARD]` (B1.1.2):** Desbloquea la fusión de dos Paladines ($T3 + T3$) en un **Tier 4 (Pretoriano)**: Ataque 4, Defensa 4 (límite: 1 activo a la vez).
3. **`[PIKE_WALL]` (B1.2.1):** Los Reclutas (T1) duplican su Defensa ($D = 2$) si son atacados frontalmente por Caballería.
4. **`[VANGUARD_SACRIFICE]` (B1.2.2):** Al morir un Recluta propio en defensa, reduce permanentemente en $-1$ el ataque de la unidad enemiga que lo mató durante ese turno.
5. **`[PEASANT_TIDE]` (B1.2.3):** Permite fusionar 3 Reclutas en una sola casilla para crear un Guardia (T2) con coste de 0 de oro.
6. **`[KNIGHTLY_ORDER]` (A1.3.2):** Los Jinetes cuentan como defensores pesados (Defensa base 2 en lugar de 1).

##### Grupo B: Asedio, Destrucción e Ingeniería (6 Doctrinas)
7. **`[INCENDIARY_BALLISTICS]` (B1.3.1):** Los proyectiles de asedio prenden fuego a las granjas: si impactan una granja, la reducen a cenizas (inutilizable 3 turnos).
8. **`[MINING_SAPPERS]` (B1.3.2):** El asedio puede ignorar murallas y empalizadas, detonando directamente sobre la casilla objetivo a distancia 1.
9. **`[CIRCUMVALLATION]` (B1.3.3):** Rodear una ciudad enemiga con 3 o más unidades bloquea por completo su capacidad de reclutar tropas de guarnición.
10. **`[BASTION_ERADICATION]` (C1.2.1):** Demoler una torre o bastión con asedio otorga $+15$ de oro de botín inmediato.
11. **`[DRAKKAR_STRIKE]` (A2.2.2):** Los Barcos tienen la capacidad de actuar como unidades de Asedio costero contra casillas de tierra a 1 hexágono.
12. **`[COVE_BLAZE]` (A2.2.3):** Prender fuego a un puerto enemigo con barcos bloquea el reclutamiento naval rival durante 2 turnos.

##### Grupo C: Caballería y Maniobra de Choque (6 Doctrinas)
13. **`[STEPPE_BARRAGE]` (B2.1.2):** Si 2 o más arqueros a caballo disparan a la misma casilla en el mismo turno, la segunda flecha elimina a la tropa enemiga sin importar su Tier.
14. **`[CANTABRIAN_CIRCLE]` (B2.1.3):** La caballería que dispare en movimiento continuo reduce a 0 la defensa de la casilla objetivo durante ese turno.
15. **`[CATAPHRACT_LANCE]` (B2.2.1):** Desbloquea la Caballería Pesada (Catafracto): Ataque 3, Defensa 2 (puede capturar casillas con torres).
16. **`[WAR_STAMPEDE]` (B2.2.2):** Si la caballería ataca y vence a una unidad, empuja los restos forzando al enemigo a ceder el hexágono trasero.
17. **`[PURSUIT_FRENZY]` (B2.2.3):** Si la caballería destruye a un enemigo, avanza automáticamente a su casilla y recupera 1 PA para volver a atacar o mover.
18. **`[PARTHIAN_RETREAT]` (B2.1.1):** Tras disparar su arco a distancia, el jinete recibe 1 punto de retroceso hacia una casilla vacía propia o neutral.

##### Grupo D: Arquería, Emboscadas y Bastiones (6 Doctrinas)
19. **`[CHISEL_TIP_ARROWS]` (B3.1.2):** Las flechas de arqueros reducen la defensa de las Torres y Bastiones en $-2$ (en lugar de $-1$).
20. **`[PHOSPHORUS_FIRE]` (B3.1.3):** Los arqueros pueden disparar flechas incendiarias a bosques enemigos, obligando a cualquier tropa oculta en ellos a salir a campo abierto.
21. **`[AMBUSH_CAMOUFLAGE]` (B3.2.1):** Atacar desde un bosque o pantano donde la tropa estaba invisible otorga $+2$ de Ataque sorpresa en el primer asalto.
22. **`[NEUROTOXIC_VENOM]` (B3.2.3):** El disparo de arquero envenena al defensor: si sobrevive al asedio, pierde 1 Tier al final de su propio turno.
23. **`[WALL_EMBRASURES]` (B3.3.1):** Las Torres de Guardia y Bastiones disparan flechas automáticas defensivas a 2 casillas de distancia en el turno rival.
24. **`[LAST_STAND_FORT]` (B3.3.3):** Una ciudad con guarnición resiste 1 ataque letal adicional con su defensa fijada en 1 antes de ser tomada.


#### 6.2.5 PRUEBA DE ACEPTACIÓN FORMAL (TEST-COMBAT-SIEGE)

##### [TEST-COMBAT-01] Comprobación de la Regla de Asedio: Guarnición vs. Edificio Vacío
* **Definición:** Validar que una Catapulta ataca a la guarnición sin dañar la ciudad si la casilla está ocupada, y degrada la ciudad si está vacía.
* **Precondición:** 
  * Casilla A: `CIUDAD` enemiga ocupada por un Recluta (Guarnición en Capa 6).
  * Casilla B: `CIUDAD` enemiga sin unidad (`Capa 6 == VACIO`).
  * Catapulta propia lista para disparar a 2 hexágonos de distancia.
* **Paso a paso:**
  1. Ordeno a la Catapulta disparar sobre la Casilla A (con guarnición).
  2. Evalúo el estado de la Casilla A.
  3. En la siguiente partida/turno, ordeno disparar sobre la Casilla B (vacía).
  4. Evalúo el estado de la Casilla B.
* **Resultado Esperado:**
  * En la Casilla A: El Recluta absorbe el impacto (combate contra tropa); la `CIUDAD` en Capa 3 permanece intacta como `CIUDAD`.
  * En la Casilla B: No hay tropa; el impacto afecta a la Capa 3 degradándola instantáneamente de `CIUDAD` a `PUEBLO`.

##### [TEST-COMBAT-02] Comprobación de la Regla de Asedio: Guarnición vs. Edificio Vacío
  1. Una casilla enemiga tiene una Torre de Guardia (Defensa 2).
  2. Intento conquistarla directamente con un Recluta (Ataque 1).
  3. **Resultado esperado:** La acción es rechazada por el motor ($1 \le 2$).
  4. Ordeno a un Arquero propio situado a 2 casillas disparar sobre la Torre.
  5. **Resultado esperado:** La defensa de la casilla se reduce visualmente de 2 a 1.
  6. Arrastro un Guardia propio (Ataque 2) sobre la Torre.
  7. **Resultado esperado:** Como $2 > 1$, el Guardia destruye la Torre, conquista el hexágono y se tiñe de color propio.

### 6.3. GRAFO DE SUMINISTRO, AISLAMIENTO Y DESERCIÓN

#### 6.3.1. Algoritmo de Contigüidad Territorial (BFS Flood-Fill)
* **Regla Base (Vanilla):** En cada cambio de estado del mapa, el motor ejecuta una búsqueda en anchura (BFS) a partir de cada casilla con `es_capital = TRUE` (Capa 5):
  1. Se recorren exclusivamente hexágonos contiguos que compartan el mismo `Dueño_ID` (Capa 4).
  2. Todo hexágono alcanzable recibe el estado: **`CONECTADO`**.
  3. Todo hexágono del jugador que no pueda trazar una ruta continua hacia su Capital recibe el estado: **`AISLADO (Out of Supply)`**.
* **Impacto del Estado Aislado:**
  * La casilla deja de tributar: su producción de Oro `💰`, Comida `🌾` y Madera `🌲` cae a **0**.
  * No se pueden reclutar tropas ni construir edificios dentro de casillas aisladas.
  * Mínimo deben existir 2 casillas conectadas para que pueda considerarse en estado Conectado.

#### 6.3.2. Ciclo de Deserción Escalonada por Bancarrota

* **Regla Base (Vanilla):** Al presionar "Fin de Turno", el motor ejecuta el balance financiero en 3 pasos deterministas:

  $$\text{Balance Neto} = \text{Ingresos (Oro / Comida)} - \text{Mantenimiento Total (Tropas + Estructuras)}$$
  $$\text{Reserva Final} = \text{Reserva Actual} + \text{Balance Neto}$$

  * **Paso 1: Chequeo de Déficit:** Si $\text{Reserva Final} < 0$ en Oro `💰` o Comida `🌾`:
    * La reserva se trunca inmediatamente a $0$ (nunca existen números negativos en almacén).
    * Se declara el estado de la provincia como: `QUIEBRA_FINANCIERA` o `HAMBRUNA_AGRARIA`.
  * **Paso 2: Cascada de Deserción Escalonada:**
    1. El motor busca en el mapa la unidad militar del jugador con el mayor coste de mantenimiento.
    2. La unidad se degrada un rango:
       $$T3 \text{ (Paladín)} \to T2 \text{ (Guardia)} \quad\mid\quad T2 \to T1 \text{ (Recluta)} \quad\mid\quad T1 \to \text{Muere (deja TUMBA)}$$
    3. Se recalculan los costes de mantenimiento del ejército.
    4. El bucle se repite hasta que el balance vuelva a ser $\ge 0$ o no queden tropas vivas.
  * **Paso 3: Notificación Diegética:** Aparece la burbuja flotante `💬` con la alerta `🌾💀` sobre las casillas afectadas.

##### 6.3.2.1 GANCHOS DE TRIBU EXHAUSTIVOS: LAS 12 DOCTRINAS DE ESTE SUBSISTEMA

El motor de finanzas y deserción evalúa obligatoriamente estas 12 variables:

###### A. Modificadores de la Fórmula de Balance (4 Doctrinas)
1. **`[ASCETIC_COMMUNE]` (A1.2.3):** El mantenimiento de Granjas y Aldeas se fija en 0 permanente, impidiendo que la infraestructura agrícola provoque bancarrota.
2. **`[KNIGHTLY_ORDER]` (A1.3.2):** El mantenimiento por turno de toda la Caballería se multiplica por $2.0$, aumentando el riesgo de entrar en deserción acelerada si no se expanden los campos.
3. **`[PEASANT_TIDE]` (B1.2.3):** Si el jugador mantiene más de 10 Reclutas (T1) simultáneos, los ingresos agrícolas globales caen un $20\%$, forzando al jugador a enviarlos a morir o fusionarlos para no quebrar.
4. **`[GOLDEN_PROTECTORATE]` (C3.3.3):** El coste de mantenimiento del ejército de una facción rival se deduce directamente de la tesorería del jugador (mientras el pacto esté activo).

###### B. Alteraciones al Proceso de Deserción y Atrición (4 Doctrinas)
5. **`[ZEALOT_MARTYRDOM]` (A1.2.1):** Las unidades son inmunes a la degradación escalonada durante los primeros 2 turnos consecutivos de déficit. Al 3er turno sin superávit, el 100% del ejército desaparece simultáneamente.
6. **`[INTEGRATION_PRESERVE]` (A1.1.1):** Si el turno cierra con déficit ($\text{Reserva} == 0$), las casillas conquistadas no pagan impuestos y sufren revuelta inmediata, expulsando tropas y volviéndose neutrales independientes.
7. **`[HOME_FLOTILLA]` (A2.3.2):** Todo Barco propio situado fuera de las fronteras territoriales sufre atrición por hambruna marina automática (pierde 1 nivel de fuerza al final de cada turno sin tocar puerto amigo).
8. **`[SEASONAL_MIGRATION]` (A3.1.1):** Si el campamento nómada permanece inmóvil en el mismo hexágono durante más de 4 turnos, se activa la deserción por agotamiento de pastos (1 tropa aleatoria muere cada turno que siga estático).

###### C. Condiciones de Victoria/Derrota Disparadas por este Ciclo (4 Doctrinas)
9. **`[STARVATION_WIN]` (C1.2.3):** Si el rival entra en estado de bancarrota/hambruna durante 2 turnos seguidos, el jugador gana la partida inmediatamente. Sombra: Si el jugador entra en bancarrota 1 solo turno, pierde la partida.
10. **`[INDUCED_BANKRUPTCY]` (C3.2.1):** Si el jugador logra que 3 unidades enemigas mueran por deserción escalonada (mediante corte de suministros o bloqueo de rutas), se dispara la victoria económica automática.
11. **`[GOLDEN_ERA_STREAK]` (C2.3.2):** El contador de la Edad de Oro requiere 30 turnos con balance positivo. Si este ciclo detecta un solo turno con balance $< 0$, el contador de victoria se reinicia a 0.
12. **`[TERROR_DOCTRINE]` (A3.2.2):** Si el jugador pierde su combate principal en el turno, al presionar "Fin de Turno" se fuerza una deserción psicológica instantánea del 50% de los jinetes restantes en el mapa.

##### 6.3.2.2 PRUEBAS DE ACEPTACIÓN FORMAL (TEST SUITE 5.3.2)

###### [TEST-SUPPLY-01] Deserción Escalonada Estándar vs. Muerte Súbita
* **Definición:** Validar que un déficit de $-4$ degrada primero al Paladín (T3) a Guardia (T2) reduciendo el mantenimiento sin matar a las demás unidades.
* **Precondición:** Comida: 0. Balance: $-4$. Ejército: 1 Paladín (mantenimiento 6) y 1 Recluta (mantenimiento 2).
* **Paso a paso:**
  1. Presiono "Fin de Turno".
* **Resultado Esperado:**
  * El Paladín se convierte en Guardia (T2, mantenimiento baja a 3).
  * El nuevo balance pasa a ser $-1$ (aún en déficit).
  * El bucle ejecuta una segunda iteración: el Guardia se degrada a Recluta (T1, mantenimiento baja a 1).
  * El balance se estabiliza; el segundo Recluta original permanece vivo.

###### [TEST-SUPPLY-02] Inmunidad Temporal y Colapso Fanático (`ZEALOT_MARTYRDOM`)
* **Definición:** Validar que una tribu fanática resiste 2 turnos en déficit y colapsa al tercero.
* **Precondición:** Tribu con `ZEALOT_MARTYRDOM`. Reserva de Comida: 0, balance negativo. 2 Guardias en el mapa.
* **Paso a paso:**
  1. Turno 1 en déficit: Fin de Turno.
  2. Turno 2 en déficit: Fin de Turno.
  3. Turno 3 en déficit: Fin de Turno.
* **Resultado Esperado:**
  * Turno 1 y 2: Ningún guardia se degrada; el HUD muestra advertencia: *"Gracia de Devoción (Turno X/2)"*.
  * Turno 3: Se termina la gracia; ambos guardias mueren simultáneamente en el mismo frame y son reemplazados por lápidas.

###### [TEST-SUPPLY-03] Disparo de Victoria por Bancarrota Inducida (`INDUCED_BANKRUPTCY`)
* **Definición:** Validar que cortar el suministro del rival y provocar la muerte de 3 tropas por deserción dispara la victoria.
* **Precondición:** Jugador con doctrina `INDUCED_BANKRUPTCY`. La IA rival tiene tropas aisladas sin comida.
* **Paso a paso:**
  1. Mantengo el cerco y paso turno.
  2. La IA entra en su ciclo de fin de turno y sufre la deserción y muerte de 3 Reclutas por falta de suministros.
* **Resultado Esperado:**
  * El contador del hook `INDUCED_BANKRUPTCY` registra 3/3 bajas por hambruna.
  * La partida se detiene inmediatamente mostrando: *"¡Victoria por Estrangulamiento Financiero!"*.

### 6.4. ECONOMÍA, ASENTAMIENTOS Y CONSTRUCCIÓN

#### 6.4.1. Jerarquía de Asentamientos (Capa 3 > CAMINO)
* **Regla Base (Vanilla):** Toda estructura en Capa 3 con jerarquía superior a `CAMINO` es un **Asentamiento**. Los asentamientos actúan como los únicos núcleos urbanos capaces de proyectar soberanía, recolectar los recursos naturales de la Capa 2 (`TRIGO`, `ORO`, `MADERA`) dentro de su radio de influencia ($R$) y sostener tropas:

| Asentamiento (Capa 3) | Tipo / Rol | Coste de Construcción / Ascenso | Radio Recolección ($R$) | Producción Base | Defensa Local ($D$) | Capacidad de Reclutamiento |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`CAMPAMENTO`** | Asentamiento Inicial / Puesto Fronterizo | 15 Madera `🌲` (en casilla propia conectada) | $R = 0$ (solo su hexágono) | $+1$ Oro, $+1$ Comida | $D = 1$ | Recluta (T1) |
| **`BASTIÓN`** | Asentamiento Militar Fortificado | 30 Madera `🌲` + 20 Oro `💰` (o asciende desde Campamento) | $R = 1$ hexágono adyacente | $+1$ Oro, $+2$ Comida | **$D = 3$** (proyecta $D=2$ a casillas vecinas) | Recluta (T1), Arquero, Asedio (Cañón) |
| **`PUEBLO`** | Asentamiento Civil / Agrícola Medio | 25 Madera `🌲` + 25 Comida `🌾` (asciende desde Campamento) | $R = 1$ hexágono adyacente | $+2$ Oro, $+4$ Comida | $D = 1$ | Recluta (T1), Arquero |
| **`CIUDAD`** | Gran Metrópoli / Capital | 60 Madera `🌲` + 60 Comida `🌾` (asciende desde Pueblo o Bastión)| $R = 2$ hexágonos de distancia | $+4$ Oro, $+8$ Comida | $D = 2$ | **Todas las unidades + Jinete + Unidad Insignia** |


#### 6.4.2. Mecánica de Recolección de Recursos (Capa 2)
* **Regla Base:** Una casilla con recurso natural (`TRIGO`, `ORO`, `MADERA`) solo suma sus beneficios a la telemetría del HUD superior si se encuentra dentro del radio de recolección ($R$) de un asentamiento propio conectado:
  * Casilla de `TRIGO` dentro del radio $\to$ otorga **$+3$ de Comida `🌾` / turno**.
  * Casilla de `ORO` dentro del radio $\to$ otorga **$+3$ de Oro `💰` / turno**.
  * Casilla de `MADERA` con árbol dentro del radio $\to$ permite que el asentamiento extraiga **$+1$ de Madera `🌲` pasiva / turno** sin talar el árbol, o bien la unidad puede talarlo para obtener $+10$ de madera inmediata.
* *Sin intermediarios:* No existen edificios de "mina" ni de "granja"; el asentamiento explota el suelo directamente mediante su población.

#### 6.4.3. Infraestructura de Transporte: El `CAMINO` (Capa 3)
* **Regla Base:**
  * **Coste:** 5 Madera `🌲`. Se construye directamente sobre cualquier casilla propia conectada que tenga `Capa 3 == NINGUNO`.
  * **Efectos en la Red:**
    * *En `COLINA` o `MONTAÑA` transitada:* Reduce el coste de movimiento de la unidad a 1 PA plano (elimina la penalización de terreno quebrado).
    * *En `RIO`:* Construye un puente; permite a la Infantería, Caballería y Asedio cruzar el río a coste 1 PA sin agotar el turno.
    * *Conectividad Logística:* Aumenta en $+1$ hexágono la distancia máxima a la que un Campamento o Bastión puede estar de la Capital antes de sufrir riesgo de aislamiento.


#### 6.4.4. GANCHOS DE TRIBU (TRIBE HOOKS) ASOCIADOS A ASENTAMIENTOS

Revisión limpia y estricta de las doctrinas del catálogo que operan sobre este subsistema:

1. **`[ASCETIC_COMMUNE]` (A1.2.3):** Los asentamientos no consumen comida para su propio mantenimiento base; toda la comida recolectada va íntegra a sostener tropas.
2. **`[SERFDOM_CHAIN]` (A1.3.1):** Ascender un `CAMPAMENTO` a `PUEBLO` o `BASTIÓN` cuesta un $50\%$ menos de madera.
3. **`[FORTIFIED_ESTATE]` (A1.3.3):** Los `BASTIONES` se construyen instantáneamente en 1 turno sin consumir la acción de la unidad que lo erige.
4. **`[COASTAL_FACTORY]` (A2.1.3):** Permite fundar `CAMPAMENTOS` directamente en islas o costas neutrales sin requerir conexión territorial contigua con la Capital.
5. **`[PACKABLE_YURTS]` (A3.1.2):** Los `CAMPAMENTOS` pueden desmantelarse y moverse 1 hexágono por turno (recuperando los 15 de madera si se destruyen voluntariamente).
6. **`[WALL_EMBRASURES]` (B3.3.1):** Los `BASTIONES` adquieren la capacidad de disparar saetas defensivas a 2 casillas de distancia en el turno del rival.
7. **`[AGRARIAN_UTOPIA]` (C2.1.3):** Condición de victoria: Alcanzar 3 `CIUDADES` de Nivel Máximo con todos sus hexágonos de radio 2 explotando casillas de `TRIGO`.
8. **`[HOSTILE_TAKEOVER]` (C3.1.1):** La República Comercial puede pagar 40 monedas de oro para sobornar y anexar un `PUEBLO` o `BASTIÓN` enemigo sin necesidad de atacarlo con catapultas.

#### 6.4.5. PRUEBAS DE ACEPTACIÓN FORMAL (TEST SUITE 5.4)

#### [TEST-ECO-01] Recolección por Radio de Asentamiento
* **Definición:** Validar que un hexágono con `TRIGO` no aporta comida si está a distancia 2 de un Campamento ($R=0$), pero sí al ascenderlo a Ciudad ($R=2$).
* **Precondición:** Campamento propio. A distancia 2 existe una casilla con `Capa 2 == TRIGO`. Balance de comida: $+1$.
* **Paso a paso:**
  1. Compruebo el balance en el HUD: es $+1$.
  2. Aporto los recursos y asciendo el Campamento a Pueblo ($R=1$).
  3. Compruebo el balance: sigue en $+4$ (producción base de pueblo, pero el trigo a distancia 2 aún no entra en radio).
  4. Aporto recursos y asciendo el Pueblo a Ciudad ($R=2$).
* **Resultado Esperado:** Al convertirse en `CIUDAD`, el trigo a distancia 2 entra en el radio de recolección; el balance de comida salta automáticamente a $+11$ ($+8$ base de ciudad $+ 3$ por el trigo de Capa 2).

#### [TEST-ECO-02] El Bastión como Fortaleza y Núcleo de Reclutamiento
* **Definición:** Validar que el `BASTIÓN` tiene Defensa 3, proyecta Defensa 2 a vecinos y permite reclutar Asedio.
* **Precondición:** Casilla propia con `BASTIÓN`.
* **Paso a paso:**
  1. Inspecciono la defensa de la casilla del Bastión y la de un llano adyacente vacío.
  2. Abro el cajón de unidades `[💂]` seleccionando el Bastión.
* **Resultado Esperado:**
  * La casilla del Bastión tiene $D = 3$.
  * La casilla vecina muestra un escudo de proyección defensiva con $D = 2$.
  * El cajón de unidades tiene habilitada la opción de reclutar el Cañón de Asedio `[💣]`.

#### [TEST-ECO-03] Función del Camino sobre Río y Montaña
* **Definición:** Validar que un `CAMINO` sobre `RIO` permite cruce sin agotar turno a una unidad pesada.
* **Precondición:** Infantería propia con 1 PA frente a casilla de `RIO` que contiene un `CAMINO`.
* **Paso a paso:**
  1. Muevo la infantería a la casilla del río con camino.
* **Resultado Esperado:** La infantería no queda atascada; cruza la casilla con coste normal de 1 PA como si fuera llano y puede continuar su avance si dispone de puntos residuales.

### 6.5. DINÁMICA AMBIENTAL: ENTORNO VIVO (FLORA, FUEGO Y DESCOMPOSICIÓN)

#### 6.5.1. Propagación, Explotación y Tala de Bosques (`Capa 3 == ARBOL`)
* **Regla Base (Vanilla):**
  1. **Tala de Árboles:** Una unidad militar o civil en una casilla con `Capa 3 == ARBOL` que ejecute la acción "Talar" consume su turno completo. Otorga de inmediato **$+10$ de Madera `🌲`** a la tesorería y transforma la casilla en suelo despejado (`Capa 3 = NINGUNO`).
  2. **Propagación Orgánica:** En cada ciclo de fin de turno, toda casilla que contenga bosque tiene una probabilidad del **$8\%$** de extender un nuevo brote (`ARBOL`) a una casilla vecina vacía de tipo `LLANO`, siempre que no contenga asentamientos, caminos ni tropas.

#### 6.5.2. Ciclo de Tumbas, Incendios y Cenizas (Estados Temporales)
* **Regla Base (Vanilla):**
  1. **Tumbas (`Capa 6 == TUMBA`):** Toda unidad que muere en combate o por deserción deja una tumba con contador de **3 turnos**:
     * Mientras persista, la casilla está bloqueada: no se pueden fundar asentamientos ni construir caminos en ella.
     * En cada fin de turno, el contador se decrementa ($3 \to 2 \to 1 \to 0$). Al llegar a 0, la tumba se disuelve en el suelo y la casilla queda en `Capa 6 = VACIO`.
  2. **Casilla Incendiada / Cenizas:** Determinados ataques o tácticas prenden fuego al suelo:
     * La casilla se torna de color ceniza y muestra llamas animadas.
     * Es **intransitable** e inutilizable mientras dure el fuego; al extinguirse, queda en `NINGUNO` y libre.

---

#### 6.5.3. GANCHOS DE TRIBU EXHAUSTIVOS: LAS 6 DOCTRINAS AMBIENTALES

Estas son las 6 doctrinas del catálogo que alteran la flora, la tala, el fuego y las tumbas:

##### A. Tala y Bosques (2 Doctrinas)
1. **`[EXTRACTIVE_ENCLAVE]` (A1.1.2):** Talar un bosque propio otorga el doble de rendimiento: **$+20$ de Madera `🌲`** (en lugar del estándar de $+10$).
2. **`[PHOSPHORUS_FIRE]` (B3.1.3):** Los arqueros pueden disparar flechas de fósforo a casillas con `ARBOL`: el árbol es destruido por fuego sin dar madera y la casilla arde como infranqueable durante 2 turnos, quemando a cualquier tropa que estuviera emboscada en él.

##### B. Fuego, Cenizas y Destrucción de Suelo (2 Doctrinas)
3. **`[SCORCHED_EARTH]` (A3.3.2):** Retirarse voluntariamente de una casilla no deja la celda libre; la reduce a cenizas volcánicas intransitables que tardan 4 turnos completos en disolverse antes de poder volver a usarse.
4. **`[SETTLER_PURGE]` (A1.1.3):** Al capturar una casilla enemiga, el suelo queda en estado de ceniza y escombros durante 3 turnos, impidiendo fundar asentamientos o recolectar recursos hasta que la población colona se asiente.

##### C. Tumbas y Reliquias (2 Doctrinas)
5. **`[ZEALOT_MARTYRDOM]` (A1.2.1):** Las tumbas dejadas por tropas aliadas no son solo un estorbo; actúan como relicarios sagrados que otorgan **$+1$ de Defensa** a todas las casillas adyacentes propias mientras el contador de la tumba siga activo.
6. **`[CALTROP_SNARE]` (B3.2.2):** Las tropas pueden sembrar "Trampas de Abrojos" en casillas neutrales vacías (Capa 6): permanecen invisibles y matan instantáneamente a la primera tropa ligera enemiga que las pise, transformando la trampa en una tumba normal.

---

#### 6.5.4. PRUEBA DE ACEPTACIÓN FORMAL (TEST-ENV-01)

##### [TEST-ENV-01] Ciclo de Tumba y Bloqueo de Asentamiento
* **Definición:** Validar que una tumba bloquea la fundación de un campamento o camino y que se disuelve al cumplirse el turno 3.
* **Precondición:** Recluta propio muere en un hexágono llano propio conectado. Se dispone de 15 de madera para fundar un Campamento.
* **Paso a paso:**
  1. Verifico la casilla tras la muerte del recluta.
  2. Intento fundar un Campamento (`Capa 3 = CAMPAMENTO`) en esa casilla.
  3. Avanzo 3 turnos consecutivos vigilando el contador de la tumba.
  4. Intento fundar el Campamento en el turno 4.
* **Resultado Esperado:**
  * En el paso 1: La casilla tiene `Capa 6 == TUMBA` con contador en 3.
  * En el paso 2: La interfaz rechaza la acción mostrando: *"Casilla ocupada por tumba (3 turnos restantes)"*.
  * En el paso 3: El contador decrementa en cada fin de turno: $3 \to 2 \to 1 \to 0$.
  * En el paso 4: La tumba desaparece de pantalla; la casilla pasa a `Capa 6 == VACIO`; el Campamento se funda con éxito descontando los 15 de madera.

### 6.6. BATERÍA DE PRUEBAS DE ACEPTACIÓN: CORE RULES ENGINE (QA TEST SUITE)

> **Criterio de Aprobación del Motor:** El núcleo de simulación no podrá integrarse a producción si falla cualquiera de estas 8 pruebas automatizadas de integración.

#### [TEST-CORE-01] Desplazamiento Libre en Red Amiga vs. Freno Hostil
* **Definición:** Validar que el grafo propio permite salto de casillas a través de 'camino' a coste reducido y que el avance hostil frena la unidad a 1 paso.
* **Paso a paso:**
  1. Tropa propia en casilla aliada con ruta despejada hacia 4 hexágonos propios contiguos.
  2. Muevo la unidad al extremo del territorio propio.
  3. Desde la frontera, muevo la unidad a un hexágono neutral vecino.
* **Resultado Esperado:** El primer trayecto no consume la acción de la unidad (PA se mantiene en 1); el paso a tierra neutral cambia el dueño de la celda, reduce los PA a 0 y tiñe la tropa en gris.

#### [TEST-CORE-02] Combate Determinista y Destrucción de Defensor
* **Definición:** Comprobar que una fuerza superior elimina al defensor sin margen de fallo y genera una tumba.
* **Precondición:** Guardia propio (Ataque 2) adyacente a Recluta enemigo (Defensa 1).
* **Paso a paso:**
  1. Ordeno al Guardia atacar al Recluta rival.
* **Resultado Esperado:** El Recluta enemigo es destruido sin infligir contraataque; el Guardia ocupa el hexágono; en la casilla aparece una `TUMBA` con contador en 3 que no estorba al nuevo ocupante.

#### [TEST-CORE-03] Ablandamiento por Ataque a Distancia de Arquero
* **Definición:** Comprobar que el disparo de un arquero degrada temporalmente la defensa de una casilla blindada.
* **Precondición:** Torre enemiga con Defensa 2. Recluta propio con Ataque 1. Arquero propio a 2 hexágonos de distancia.
* **Paso a paso:**
  1. El Arquero ataca la Torre a distancia.
  2. El Recluta avanza a continuación sobre la Torre.
* **Resultado Esperado:** El disparo reduce la defensa efectiva de la Torre a 1; el Recluta (Ataque 1) puede ahora conquistar la casilla porque la defensa fue degradada ($1 \ge 1$ con estado ablandado); la Torre queda derribada.

#### [TEST-CORE-04] Detección de Partición de Grafo y Pérdida de Recursos
* **Definición:** Comprobar que aislar un sector productivo pone sus recursos a cero de inmediato.
* **Precondición:** Una provincia genera $+8$ de trigo mediante 2 granjas conectadas a la capital.
* **Paso a paso:**
  1. Una unidad enemiga captura la casilla de cuello de botella que une las granjas con la ciudad.
* **Resultado Esperado:** El BFS detecta la desconexión; las granjas pasan a estado `AISLADO`; la telemetría del HUD superior actualiza el balance de comida de $+8$ a $+0$ en el mismo turno.

#### [TEST-CORE-05] Cascada de Deserción Escalonada por Falta de Comida
* **Definición:** Validar que el déficit degrada primero a la tropa más costosa sin aniquilar al resto.
* **Precondición:** Reserva de Comida: 0. Balance de turno: $-3$. El ejército consta de 1 Paladín (T3) y 2 Reclutas (T1).
* **Paso a paso:**
  1. Pulso "Fin de Turno".
* **Resultado Esperado:** El Paladín (T3) se degrada a Guardia (T2); su coste de mantenimiento disminuye en consecuencia; los dos Reclutas (T1) permanecen vivos e intactos en el mapa.

#### [TEST-CORE-06] Ascenso de Asentamiento y Expansión de Recolección
* **Definición:** Comprobar que subir de Campamento a Pueblo amplía el radio de recolección a $R \le 1$.
* **Precondición:** Campamento rodeado por una colina con mineral de oro a distancia 1 que no produce ingresos. El jugador tiene 20 de madera y 20 de comida.
* **Paso a paso:**
  1. Asciendo el Campamento a Pueblo.
* **Resultado Esperado:** La estructura cambia a `PUEBLO`; el radio de influencia abarca la colina con oro; el balance de ingresos en el HUD superior suma automáticamente $+3$ de oro/turno.

#### [TEST-CORE-07] Tala de Bosque y Obtención Inmediata de Madera
* **Definición:** Validar que talar consume la acción de la unidad y entrega $+10$ de madera inmediata.
* **Precondición:** Reserva: `[🌲 0]`. Recluta propio en casilla con árbol.
* **Paso a paso:**
  1. Selecciono la acción "Talar Bosque".
* **Resultado Esperado:** La reserva de madera se actualiza a `[🌲 10]`; la casilla queda despejada (`Capa 3 = NINGUNO`); el Recluta agota su acción para el resto del turno.

#### [TEST-CORE-08] Ejecución de Gancho de Tribu: Testudo Romana
* **Definición:** Validar que el tag `TESTUDO_SHIELD` suma defensa adicional por infanterías adyacentes.
* **Precondición:** Jugador con doctrina `TESTUDO_SHIELD`. Dos Reclutas propios (Defensa base 1) colocados lado a lado.
* **Paso a paso:**
  1. Un Guardia enemigo (Ataque 2) intenta capturar la casilla de uno de los Reclutas.
* **Resultado Esperado:** La defensa del Recluta se calcula como $Defensa_{Base} (1) + Bono_{Vecino} (1) = 2$; el ataque del Guardia (fuerza 2) es repelido por empate; ambos soldados sobreviven.











## 7. FLUJO DE TURNO Y CONDICIÓN DE VICTORIA / DERROTA

### 7.1. Resolución del Botón "Fin de Turno"
* **Definición:** El botón "Fin de Turno" procesa de forma síncrona las siguientes fases:
  1. Cobro de rentas y pago de mantenimiento del Jugador.
  2. Comprobación y aplicación de deserción si hay déficit.
  3. Reabastecimiento de puntos de movimiento y ataque para todas las unidades propias.
  4. Ejecución del turno de la IA rival.
  5. Devolución del control al Jugador para el siguiente turno.
* **Prueba:**
  1. Agoto los movimientos de todas mis tropas e inicio el Fin de Turno.
  2. **Resultado esperado:** Los iconos de las unidades pasan de gris a activos; los ingresos se suman en la barra superior; los movimientos enemigos ocurren de forma visible y rápida; el contador de turnos pasa de $Turno\ 1$ a $Turno\ 2$.

### 7.2. Condición de Victoria

* **Definición:** Un jugador gana la partida cuando captura todas las Ciudades de las facciones enemigas en el mapa.
* **Prueba:**
  1. En una partida contra una facción enemiga con una sola Ciudad restante, muevo un Paladín al hexágono donde se ubica dicha Ciudad.
  2. **Resultado esperado:** La Ciudad enemiga adopta el color del jugador; el juego pausa la partida inmediatamente y muestra la pantalla emergente: *"¡Victoria! Territorio Dominado"* con el botón "Volver al Menú".

  Darle vida a la **Inteligencia Artificial (IA)** ahora es el paso maestro. Un juego de estrategia táctico por turnos vive o muere por su IA rival: si es tonta, aburre en 2 partidas; si hace trampas con recursos infinitos, frustra; y si tarda 10 segundos en pensar cada turno, el jugador desinstala la aplicación.



## 8. SISTEMA DE INTELIGENCIA ARTIFICIAL RIVAL (AI DECISION ENGINE)

> **Principio de Diseño:** La IA es 100% determinista, no recibe recursos infinitos ("no hace trampas ocultas") y debe resolver su turno en menos de **500 milisegundos** por facción en dispositivos móviles.

La IA **juega con las mismas reglas del jugador**: tiene su propia tribu con su Credo (*Alma, Arma, Victoria*) y sus decisiones están moldeadas por esa personalidad.

Inspirados en la genialidad de *Antiyoy* (cuya IA resuelve turnos en 50 milisegundos mediante heurísticas matemáticas limpias) y en la identidad de facciones de *Hexonia*, la IA de **HEXFRONTIER** no usa redes neuronales lentas ni cajas negras: utiliza una **IA de Utilidad Basada en Reglas y Grafos (Utility AI)**.

### 8.1. ARQUITECTURA DEL MOTOR DE IA (PIPELINE EN 4 FASES)

* **Definición:** Cuando el jugador pulsa "Fin de Turno", el control pasa secuencialmente a cada facción controlada por el procesador. Cada IA ejecuta su turno en 4 fases estrictas y cronológicas:

[FASE 1: AUDITORÍA DE SEGURIDAD] ──► [FASE 2: MACROGESTIÓN URBANA] ──► [FASE 3: MANIOBRA MILITAR] ──► [FASE 4: FIN DE TURNO]
   Calcula tesorería futura            Ascenso de asentamientos           Caza cuellos de botella        Comprueba objetivos
   (Freno total anti-suicidio)         y tala de madera prioritaria       y resuelve combates A > D      de Victoria

### 8.2. DESGLOSE DE LAS 4 FASES DE DECISIÓN

### 8.2.1. Fase 1: Auditoría Financiera y Filtro de Seguridad (Anti-Bancarrota)
* **Regla Base:** La IA jamás reclutará una unidad ni construirá una estructura si la proyección financiera para los próximos 2 turnos arroja déficit ($\text{Reserva} + \text{Balance} < 0$).
  * Calcula:
    $$\text{Margen Seguro} = \text{Reserva Actual} + (\text{Balance Proyectado} \times 2)$$
  * Si $\text{Margen Seguro} \le 0$: La IA entra en modo `EMERGENCIA_ECONÓMICA`. Se prohíbe reclutar y se prioriza disolver la tropa más costosa si ya está en hambruna activa.

### 8.2.2. Fase 2: Macrogestión Urbana y Recursos (Capas 2 y 3)
* **Regla Base:** La IA analiza las casillas dentro y en los bordes de sus asentamientos:
  1. **Prioridad de Madera:** Si la reserva de Madera `🌲` es menor a 15 y existe un `ARBOL` en casilla propia conectada, envía a la tropa más cercana a talarlo para cobrar $+10$ de madera inmediata.
  2. **Prioridad de Crecimiento:** Si tiene madera y comida acumulada, evalúa el ascenso de asentamientos en este orden estricto:
     * Si la frontera enemiga está a distancia $\le 2$ hexágonos: Asciende `CAMPAMENTO` a **`BASTIÓN`** (defensa prioritaria).
     * Si la frontera está en paz o lejana: Asciende `CAMPAMENTO` a **`PUEBLO`** y luego a **`CIUDAD`** para maximizar el radio de recolección de `TRIGO` y `ORO`.
  3. **Puentes Logísticos:** Si una casilla de `RIO` propia separa dos núcleos urbanos o bloquea el paso de tropas pesadas, invierte 5 de madera para erigir un `CAMINO`.

### 8.2.3. Fase 3: Microtáctica Militar y Heurística de Corte
* **Regla Base:** La IA evalúa el mapa mediante una **Función de Puntuación de Utilidad ($U$)** para cada acción legal:
  $$U = (V_{\text{Objetivo}} \times 3) + V_{\text{Defensa Local}} - \text{Riesgo de Aislamiento}$$

  1. **La Heurística Asesina de Corte (Inspirada en *Antiyoy*):**
     * La IA escanea la frontera del jugador humano buscando "Puntos de Articulación" (hexágonos puente cuya captura rompería el grafo del jugador, aislando granjas o ciudades).
     * Si detecta un punto de corte defendido por $D < A_{\text{IA}}$, **asigna la máxima prioridad ($U = 999$) a capturar esa casilla**, estrangulando el suministro del jugador antes de buscar combates frontales.
  2. **Resolución de Combate Local ($A > D$):**
     * Si $A_{\text{IA}} > D_{\text{Objetivo}}$: Ejecuta la invasión y captura la celda.
     * Si $A_{\text{IA}} \le D_{\text{Objetivo}}$:
       * ¿Tiene un Arquero a rango 2? Dispara para aplicar `DEFENSA_DEGRADADA` (reduce $D$ en $-1$).
       * ¿Sigue siendo $A \le D$? Busca una tropa aliada adyacente para **fusionarse** ($T1+T1=T2$) e intentar el ataque con el nuevo Tier en el mismo turno.
       * Si no puede ganar: Mantiene la posición en su casilla o retrocede hacia un `BASTIÓN` aliado.
  3. **Guarnición Inteligente:** Nunca deja una `CIUDAD` o `BASTIÓN` fronterizo vacío (`Capa 6 == VACIO`) si el rival tiene tropas a distancia de movimiento.

### 8.2.4. Fase 4: Adaptación al Credo de la Tribu Rival
* **Regla Base:** La personalidad de la IA no es genérica; los pesos de su función de utilidad ($U$) se modulan según el Credo que le haya tocado:
  * **IA con Alma Nómada (`CIV_TYPE_NOMAD`):** Ignora la construcción de Bastiones; gasta el 80% de sus recursos en Caballería e incursiones de corte relámpago.
  * **IA con Victoria Monumental (`VICTORY_WONDER`):** Juega en modo "Tortuga"; levanta Bastiones en círculo alrededor de su capital, acumula recursos y no ataca fuera de sus fronteras a menos que sea provocada.
  * **IA con Alma Talasocrática (`CIV_TYPE_THALASSOCRACY`):** Prioriza asentamientos costeros y construye flotas para asaltar las riberas del jugador desde el agua.

---

### 8.3. NIVELES DE DIFICULTAD (HEURÍSTICA PURA, CERO TRAMPAS)

La dificultad no altera la cantidad de oro ni comida que recibe la IA (economía limpia); altera la **profundidad de cálculo y la capacidad de anticipación**:

| Parámetro | Dificultad Fácil (Aprendiz) | Dificultad Normal (Estratega) | Dificultad Difícil (Gran Maestro) |
| :--- | :--- | :--- | :--- |
| **Horizonte Financiero** | 1 turno de cálculo. | 2 turnos de cálculo anticipado. | 3 turnos de cálculo (cero riesgo de bancarrota). |
| **Detección de Corte Territorial** | Inexistente (ataca frontalmente). | Detecta cuellos de botella obvios. | **Radar de grafo activo:** Busca activamente partir tu imperio en dos. |
| **Uso de Fusión y Tácticas** | Rara vez fusiona; no usa asedio contra edificios. | Fusiona tropas si se ve bloqueada; usa arqueros para ablandar. | Coordina combos: *Asedio ablanda $\to$ Arquero remata $\to$ Jinete corta retirada*. |
| **Tiempo de Resolución** | $\le 80 \text{ ms}$ | $\le 150 \text{ ms}$ | $\le 300 \text{ ms}$ |

---

### 8.4. BATERÍA DE PRUEBAS DE ACEPTACIÓN: MOTOR DE IA (AI TEST SUITE)

#### [TEST-AI-01] Protocolo de Seguridad Anti-Bancarrota (Cero Suicidio Económico)
* **Definición:** Validar que la IA no recluta una tropa si su mantenimiento provocará déficit en el turno posterior.
* **Precondición:** IA con 12 de oro y 8 de comida. Ingresos netos: $+1$ oro, $+1$ comida. Reclutar un Recluta cuesta 10 de oro y demanda 2 de comida de mantenimiento por turno (lo que llevaría el balance de comida a $-1$).
* **Paso a paso:**
  1. Se cede el turno a la IA en dificultad Normal o Difícil.
  2. Se audita la memoria de acciones de la IA durante su turno.
* **Resultado Esperado:** La IA no recluta al Recluta; prefiere conservar su tesorería y pasar turno o invertir en un `CAMINO` de madera que no consume comida de mantenimiento.

#### [TEST-AI-02] Detección y Ejecución de Corte de Suministro
* **Definición:** Comprobar que la IA en dificultad Difícil prioriza capturar un hexágono desprotegido que aísla 3 casillas del jugador, por encima de atacar a una tropa enemiga solitaria.
* **Precondición:** 
  * Opción A: Un Recluta del jugador humano defendiendo un pasto sin importancia estratégica ($U_{\text{base}} = 10$).
  * Opción B: Un hexágono vacío de camino que conecta la Ciudad del jugador con dos hexágonos de trigo ($U_{\text{corte}} = 999$).
  * La IA dispone de un Jinete con rango para alcanzar cualquiera de las dos opciones.
* **Paso a paso:**
  1. Se ejecuta el turno de la IA.
* **Resultado Esperado:** El Jinete de la IA ignora al Recluta humano y avanza directamente sobre el hexágono de camino (Opción B); el trigo del jugador entra en estado `AISLADO` al cerrarse la fase.

#### [TEST-AI-03] Límite Estricto de Tiempo de Cómputo (Performance SLA)
* **Definición:** Validar que en un mapa de tamaño Enorme con 4 facciones IA en dificultad Difícil, el tiempo total de procesamiento de los turnos de la IA no supere los 1.500 ms en conjunto.
* **Precondición:** Mapa de radio $R=18$ en el turno 25 (con más de 40 tropas y 15 asentamientos activos simultáneamente).
* **Paso a paso:**
  1. El jugador pulsa "Fin de Turno".
  2. Se inicia un cronómetro de alta precisión (`System.Diagnostics.Stopwatch`).
  3. Se detiene el cronómetro en el momento exacto en que la cámara regresa al jugador para el Turno 26.
* **Resultado Esperado:** El tiempo total transcurrido es $\le 1.200 \text{ ms}$; el framerate de la interfaz no sufre congelamientos bruscos (*no ANR - Application Not Responding*).

#### [TEST-AI-04] Coordinación Táctica: Fusión para Superar Defensa
* **Definición:** Comprobar que si la IA tiene dos Reclutas (Tier 1) frente a un Guardia enemigo (Tier 2), no se suicida atacando individualmente ($1 \le 2$); los fusiona para crear un Guardia ($T1+T1=T2$) y asegurar la posición.
* **Precondición:** Guardia del jugador humano con Defensa 2 en su frontera. La IA tiene dos Reclutas (Ataque 1) en casillas contiguas entre sí.
* **Paso a paso:**
  1. Se ejecuta el turno de la IA.
* **Resultado Esperado:** Ningún Recluta de la IA ataca individualmente al Guardia humano; la IA arrastra un Recluta sobre el otro fusionándolos en un Guardia (Ataque 2 / Defensa 2); coloca a su nuevo Guardia bloqueando el paso y finaliza el turno sin bajas absurdas.

## 9. SISTEMA DE JUEGO: MODO CAMPAÑA (CAMPAIGN & TACTICAL PROGRESSION)

> **Propósito del Módulo:** Estructurar el viaje individual del jugador a través de mapas fijos no procedurales, equilibrando el aprendizaje progresivo de las mecánicas core con desafíos de maestría táctica.

### 9.1. ESTRUCTURA GLOBAL Y MAPA DE ACTOS (OVERWORLD)

* **Definición:** Al presionar "Campaña" en el menú principal, la pantalla despliega un mapa de progresión dividido en **5 Capítulos (Actos)** temáticos. Cada capítulo contiene 6 niveles (30 niveles en total para la versión base):

[ACTO I: EL DESPERTAR] ──► [ACTO II: LA MARCA DEL AGUA] ──► [ACTO III: LOS BASTIONES] ──► [ACTO IV: GUERRA TOTAL] ──► [ACTO V: TRASCENDENCIA]
  Llanuras y Praderas         Ríos, Puentes y Flotas          Colinas y Asedio Pesado       Niebla y Múltiples Frentes   Puzles Maestros Extremos
  (Niveles 1 al 6)            (Niveles 7 al 12)               (Niveles 13 al 18)            (Niveles 19 al 24)           (Niveles 25 al 30)

* **Reglas de Desbloqueo y Ramificación:**
  * **Progresión Semilineal:** Dentro de cada Acto, los niveles se distribuyen en un árbol con pequeñas bifurcaciones (ej. superar el Nivel 2 desbloquea la ruta $3A$ de combate o la ruta $3B$ económica).
  * **Puerta de Acceso a Nuevo Acto:** Para desbloquear el siguiente Acto no basta con ganar el último nivel; se exige un umbral mínimo de **Estrellas de Maestría** acumuladas (ej. 12 estrellas para abrir el Acto II).

### 9.2. ONBOARDING ORGÁNICO: LA CURVA DE APRENDIZAJE (ACTO I)

* **Definición:** Quedan estrictamente prohibidos los tutoriales con textos largos o flechas invasivas que congelen la pantalla. Los primeros 4 niveles enseñan mediante el **diseño de niveles restrictivo (Puzzle-First)**:

| Nivel | Nombre Temático | Configuración del Tablero | Lección Mecánica Orgánica |
| :--- | :--- | :--- | :--- |
| **Nivel 1** | *El Primer Paso* | Mapa diminuto (15 hexágonos). 1 Recluta propio frente a 1 Recluta enemigo en llano. | Enseña: Movimiento hostil de 1 paso y captura básica ($A > D$). |
| **Nivel 2** | *La Falange* | El enemigo tiene 1 Guardia (Defensa 2). El jugador tiene 2 Reclutas propios contiguos. | Enseña: La fusión obligatoria ($T1 + T1 = T2$) para superar una defensa superior. |
| **Nivel 3** | *La Cuerda al Cuello* | El rival tiene un ejército masivo pero sobreextendido; una casilla de camino conecta su capital con su trigo. | Enseña: **El corte de suministros**. Maniobrar para aislar esa casilla hace que el ejército enemigo quiebre por hambre en el turno siguiente. |
| **Nivel 4** | *Piedra y Madera* | Un Bastión enemigo bloquea el paso hacia la meta. Casilla con bosque a mano. | Enseña: Talar para obtener madera, ascender a Pueblo y reclutar el Cañón de Asedio para demoler el Bastión. |

* **Prueba:**
  1. Inicio el Nivel 2 de la campaña.
  2. Intento atacar al Guardia enemigo (Defensa 2) con un solo Recluta (Ataque 1).
  3. **Resultado esperado:** El motor bloquea la acción con vibración háptica; no hay textos molestos; el jugador se ve forzado a arrastrar su primer Recluta sobre el segundo para fusionar a un Guardia propio (Ataque 2) y resolver el nivel.

---

### 9.3. SISTEMA DE RECOMPENSAS Y MAESTRÍA (3 ESTRELLAS POR NIVEL)

* **Definición:** Cada nivel de campaña evalúa el desempeño del jugador al concluir la partida, otorgando de 0 a 3 Estrellas:
  1. **⭐ Primera Estrella (Victoria Base):** Otorgada automáticamente por cumplir la condición primaria de victoria del nivel (ej. capturar la capital rival o construir la Maravilla).
  2. **⭐⭐ Segunda Estrella (Eficiencia / Ritmo):** Otorgada si la victoria se alcanza antes del **Turno Límite** fijado para ese nivel (ej. *"Gana antes del Turno 12"*).
  3. **⭐⭐⭐ Tercera Estrella (Maestría Táctica):** Otorgada si se cumple una restricción temática de alta exigencia:
     * *Reto Logístico:* "Gana sin que ninguna de tus casillas entre en estado `AISLADO`".
     * *Reto Económico:* "Gana sin sufrir ninguna deserción por falta de comida".
     * *Reto Bélico:* "Gana habiendo cortado al menos 2 líneas de suministro enemigas".
     * *Reto Defensivo:* "Gana sin que ningún Bastión propio sufra daño de asedio".

* **Uso de las Estrellas:** Acumular estrellas desbloquea:
  * Nuevos Blasones e Iconos en pixel art para el editor de "Tribu" (Punto 2).
  * Acceso a los niveles secretos $X.5$ de cada Acto (niveles de desafío extremo).

* **Prueba:**
  1. Completo el Nivel 5 en el Turno 10 (el límite era Turno 12) sin sufrir deserciones (reto de la 3ª estrella).
  2. **Resultado esperado:** La pantalla de victoria muestra la animación secuencial de las 3 estrellas iluminándose con sonido de trofeo; el HUD actualiza el contador global de estrellas sumando $+3$; en el mapa de campaña el nodo del Nivel 5 queda marcado con "3/3 ⭐".

### 9.4. INTEGRACIÓN DE LA TRIBU EN CAMPAÑA

* **Definición:** El jugador disputa la campaña utilizando la **Tribu personalizada** que forjó en el Punto 2 (sus colores, blasón y las doctrinas de su Credo activo):
  * **Asimetría de Escenario:** En cada nivel, las facciones rivales tienen un Credo predefinido por diseño para plantear desafíos asimétricos específicos:
    * *Ejemplo (Nivel 8):* Te enfrentas a una tribu con doctrina `CIV_TYPE_THALASSOCRACY` (asaltantes fluviales) en un mapa dominado por ríos.
    * *Ejemplo (Nivel 14):* Te enfrentas a una tribu con doctrina `TACTIC_HEAVY_LINE` (legión pesada blindada) atrincherada tras bastiones de montaña.
  * Si el jugador se ve estancado en un nivel, tiene la libertad de volver al menú de "Tribu", reajustar sus doctrinas de Alma, Arma o Victoria para contrarrestar la estrategia rival, y regresar al nivel.

### 9.5. PERSISTENCIA DE CAMPAÑA (`campaign_progress.json`)

* **Definición:** El avance se serializa automáticamente en el almacenamiento local en un archivo JSON independiente:
  ```json
  {
    "unlocked_act": 2,
    "total_stars": 16,
    "levels": {
      "lvl_01": { "cleared": true, "stars": 3, "best_turn": 4 },
      "lvl_02": { "cleared": true, "stars": 3, "best_turn": 6 },
      "lvl_03": { "cleared": true, "stars": 2, "best_turn": 11 },
      "lvl_04": { "cleared": true, "stars": 1, "best_turn": 18 },
      "lvl_05": { "cleared": false, "stars": 0, "best_turn": null }
    }
  }
  ```
* **Prueba:**
  1. Supero el Nivel 3 obteniendo 2 estrellas.
  2. Fuerza el cierre de la app desde la multitarea del sistema operativo.
  3. Abro de nuevo la app y accedo a "Campaña".
  4. **Resultado esperado:** El Nivel 3 figura completado con 2 estrellas; el Nivel 4 aparece desbloqueado y disponible para jugar; el archivo local refleja `cleared: true` y `stars: 2`.

### 9.6. BATERÍA DE PRUEBAS DE ACEPTACIÓN: MODO CAMPAÑA (TEST SUITE)

#### [TEST-CAM-01] Bloqueo de Nivel Secuencial
* **Definición:** Validar que un jugador no puede seleccionar el Nivel 4 si no ha superado previamente el Nivel 3.
* **Precondición:** Perfil con niveles 1 y 2 completados; nivel 3 pendiente.
* **Paso a paso:**
  1. Abro el mapa de campaña.
  2. Pulso sobre el nodo del Nivel 4.
* **Resultado Esperado:** El nodo del Nivel 4 se muestra con un candado; al tocarlo, emite un sonido sordo de bloqueo y vibra suavemente, impidiendo el arranque de la partida.

#### [TEST-CAM-02] Umbral de Estrellas para Desbloqueo de Acto
* **Definición:** Validar que el Acto II permanece sellado si no se alcanza el mínimo de 12 estrellas en el Acto I.
* **Precondición:** Jugador ha ganado los 6 niveles del Acto I, pero solo obtuvo 1 estrella en cada uno (Total: 6 estrellas).
* **Paso a paso:**
  1. Intento pulsar el banner de entrada al Acto II.
* **Resultado Esperado:** El Acto II no se abre; la interfaz muestra un letrero flotante: *"Requiere 12 ⭐ para abrir este capítulo (Tienes 6/12 ⭐)"*.

#### [TEST-CAM-03] Validación del Reto de Tercera Estrella: Cero Deserción
* **Definición:** Comprobar que si el jugador entra en bancarrota y sufre la deserción de una tropa, la 3ª estrella se invalida aunque gane la partida.
* **Precondición:** Partida en Nivel con reto: *"Gana sin sufrir deserciones"*.
* **Paso a paso:**
  1. En el Turno 5, caigo en déficit y un Recluta muere por falta de comida.
  2. Me recupero económicamente y conquisto la capital enemiga ganando la partida.
* **Resultado Esperado:** La pantalla de victoria otorga la Estrella 1 (ganar); pero la Estrella 3 permanece atenuada/gris con el texto en rojo: *"Fallido: 1 unidad desertó"*.


Anotado: registramos formalmente este apartado como **Punto 10: 🗺️ SUITE "CREAR MAPAS" (EDITOR Y EXPORTACIÓN UGC)**.

El editor de mapas no es una función secundaria; en juegos de estrategia minimalistas como *Antiyoy*, el editor es **el corazón de la rejugabilidad infinita** y la herramienta interna para construir las campañas. 

Su diseño debe permitir dos cosas:
1. **Pintado intuitivo sobre las 6 Capas:** Poder tocar o arrastrar el dedo para pintar terreno, recursos, asentamientos, facciones y unidades de forma desacoplada y sin fricción.
2. **Motor de Validación Automática (*Pre-Flight Check*):** El editor no puede permitir que un usuario guarde o exporte un mapa roto (ej. sin capitales, con 1 solo jugador o con facciones atrapadas en montañas).

## 10. DOCK: SUITE "CREAR MAPAS" (EDITOR HEXAGONAL Y MOTOR UGC)

> **Propósito del Módulo:** Proveer una herramienta de autoría en tiempo real para diseñar, validar, probar y exportar mapas mediante el modelo de datos de las 6 Capas, habilitando la generación de contenido por parte de la comunidad (UGC).

### 10.1. LAYOUT DEL EDITOR Y NAVEGACIÓN

* **Definición:** Al presionar el icono de "Crear Mapas" en el dock inferior del menú principal, la aplicación abre el lienzo de edición. La interfaz distribuye las herramientas de forma periférica:

┌──────────────────────────────────────────────────────────────┐
│ [⬅️ Salir]  [Tamaño: R12]   [🧹 Limpiar]   [✅ Validar] [▶️ Probar]│  <-- Barra Superior (Gestión)
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                   LIENZO DE EDICIÓN HEXAGONAL                │
│                     (Pan, Pinch-Zoom libre)                  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [🖌️ Pincel]  [🪣 Relleno]  [🔍 Gotero]  [❌ Borrar]           │  <-- Barra de Herramientas
├──────────────────────────────────────────────────────────────┤
│ [C1: Terreno] [C2: Recurso] [C3: Asent.] [C4: Color] [C6: Tropa]│ <-- Selector de Capa Activa
└──────────────────────────────────────────────────────────────┘

* **Modos de Brocha:**
  * **`[🖌️ Pincel]`:** Pinta individualmente o por arrastre continuo celda por celda.
  * **`[🪣 Relleno (Flood-Fill)]`:** Pinta todas las celdas contiguas que compartan el mismo valor en la capa seleccionada.
  * **`[🔍 Gotero]`:** Selecciona un hexágono del mapa y clona automáticamente sus valores de capa en la paleta activa.
  * **`[❌ Borrador]`:** Devuelve la capa seleccionada a su valor neutro (`NINGUNO`, `VACIO`, `-1 Neutral`).

* **Prueba:**
  1. Entro en "Crear Mapas".
  2. Selecciono la herramienta `[🪣 Relleno]` con la capa activa `Capa 1: RIO`. Toco una masa de llanura verde.
  3. **Resultado esperado:** Toda la masa contigua de casillas llanas cambia instantáneamente a color azul de `RIO` en un solo frame; el resto del mapa permanece intacto.

### 10.2. EL PINCEL MULTICAPA (PALETAS DE DIBUJADO)

* **Definición:** El editor organiza la barra inferior en 5 selectores que corresponden a la arquitectura de capas del motor (Punto 4.5):

1. **Paleta C1 (Terreno Base):** Permite pintar: `LLANO`, `COLINA`, `MONTAÑA`, `RIO`, `MAR`.
2. **Paleta C2 (Recurso Natural):** Permite estampar iconos en la esquina superior izquierda: `TRIGO`, `ORO`, `MADERA`, `NINGUNO`.
3. **Paleta C3 (Asentamientos e Infraestructura):** Permite colocar en el centro: `CAMPAMENTO`, `BASTIÓN`, `PUEBLO`, `CIUDAD`, `CAMINO`, `ARBOL`, `NINGUNO`.
4. **Paleta C4 & C5 (Soberanía y Capitales):**
   * Selector de Facciones (Colores: *Azul, Rojo, Verde, Amarillo, Violeta, Gris Neutral*).
   * Conmutador booleano: `[⭐ Asignar Capital]` (Capa 5: `TRUE` / `FALSE`).
5. **Paleta C6 (Unidades Iniciales):** Permite desplegar tropas pre-colocadas: `Recluta (T1)`, `Guardia (T2)`, `Paladín (T3)`, `Arquero`, `Jinete`, `Asedio`, `Barco`, `Tumba`.

#### Reglas de Exclusión Mutua en Tiempo de Edición (Safety Engine)
Para evitar que el usuario pinte mapas con bugs o combinaciones ilegales, el editor aplica autocorrección en tiempo real:
* Si el usuario pinta `Capa 1 == MAR` sobre una casilla que tenía una unidad terrestre (`Capa 6`), la unidad se transforma automáticamente en `Barco` o se elimina.
* Si el usuario pinta un `CAMPAMENTO` (Capa 3) sobre un hexágono que contenía un `ARBOL`, el árbol se borra automáticamente.
* Si el usuario activa `es_capital = TRUE` sobre un asentamiento, el motor busca si esa misma facción ya tenía otra capital en la misma provincia y apaga la corona anterior (garantizando exactamente 1 Capital por provincia).

* **Prueba:**
  1. En una casilla de pasto vacía, coloco un `ARBOL` (Capa 3).
  2. Sin borrar el árbol, selecciono `BASTIÓN` (Capa 3) y pinto sobre la misma casilla.
  3. **Resultado esperado:** El árbol desaparece; el sprite del Bastión ocupa el centro de la celda; no conviven ambos elementos superpuestos en memoria.

### 10.3. MOTOR DE VALIDACIÓN PRE-FLIGHT (`[✅ Validar]`)

* **Definición:** Un mapa no puede ser probado (`[▶️ Probar]`), guardado ni exportado si no supera el algoritmo de validación interna al presionar el botón `[✅ Validar]`:

                                [BOTÓN VALIDAR]
                                       │
     ┌──────────────────┬──────────────┴─────┬──────────────────┐
     ▼                  ▼                    ▼                  ▼
[CHECK 1: FACCIONES] [CHECK 2: CAPITALES]  [CHECK 3: SUELO]  [CHECK 4: CAMINOS]
¿Mínimo 2 facciones   ¿Cada bando tiene     ¿Ninguna Capital  ¿Existe camino
 en el mapa?           exactamente 1 Capital? en Mar o Montaña? entre Capitales?

* **Errores de Validación y Notificación:**
  * **Error E01 (Facciones Insuficientes):** El mapa tiene menos de 2 facciones con territorio. *Mensaje: "Se requieren al menos 2 jugadores/colores en el mapa".*
  * **Error E02 (Capital Faltante):** Una facción tiene territorio pero ninguna casilla con `es_capital = TRUE`. *Mensaje: "La Facción [Color] no tiene Capital asignada".*
  * **Error E03 (Capital Inválida):** Una Capital está colocada sobre `MAR` o `MONTAÑA`. *Mensaje: "Las Capitales solo pueden fundarse en tierra transitable".*
  * **Error E04 (Aislamiento Total / Ruta Inexistente):** El algoritmo BFS detecta que una Capital no tiene ningún camino navegable o terrestre para alcanzar al resto de jugadores. *Mensaje: "El Jugador [Color] está completamente atrapado por montañas/mar sin salida".*

* **Prueba:**
  1. Dibujo un mapa con 2 jugadores. Asigno capital al Jugador Azul, pero olvido colocarle la capital al Jugador Rojo.
  2. Pulso el botón `[✅ Validar]`.
  3. **Resultado esperado:** El sistema detiene el proceso; la cámara hace un salto panorámico centrando el territorio rojo; aparece un mensaje modal de alerta: *"Error E02: La Facción Roja no tiene Capital asignada"*; el botón de "Exportar" permanece bloqueado.


### 10.4. SERIALIZACIÓN, IMPORTACIÓN Y EXPORTACIÓN (CÓDIGO UGC)

* **Definición:** Los mapas diseñados en el editor se serializan en un formato ultraligero de cadena alfanumérica plana (String compacta codificada en Base64 con algoritmo Run-Length Encoding - RLE):
  * **Estructura del Payload:**
    `[VersiónMotor]:[Radio]:[SemillaEstética]:[MatrizHexágonosComprimida]`
  * **Botón "Copiar Código":** Copia la cadena al portapapeles del sistema operativo para compartirla por WhatsApp, Discord, Reddit, etc.
  * **Botón "Pegar Código":** Lee el portapapeles; si la cadena es válida, reconstruye el mapa en pantalla en menos de 300 ms.
  * **Botón "Probar Mapa":** Abre inmediatamente una partida de escaramuza contra la IA sobre el mapa diseñado para testear la jugabilidad antes de compartirlo.

* **Prueba:**
  1. Diseño un mapa de radio 7, lo valido con éxito y pulso "Copiar Código".
  2. Limpio el editor pulsando `[🧹 Limpiar]` (el mapa queda en blanco).
  3. Pulso "Pegar Código" e introduzco la cadena copiada.
  4. **Resultado esperado:** El editor reconstruye el mapa de forma idéntica celda por celda; las 6 capas, colores y capitales quedan en sus posiciones exactas originales.

### 10.5. BATERÍA DE PRUEBAS DE ACEPTACIÓN: EDITOR (TEST SUITE)

#### [TEST-EDT-01] Prevención de Guardado de Mapas Rotos
* **Definición:** Validar que el editor bloquea la exportación si no se supera el 100% de los checks de validación.
* **Precondición:** Mapa diseñado con 2 facciones pero con una cordillera cerrada de montañas que aísla por completo a una de ellas.
* **Paso a paso:**
  1. Pulso "Validar".
* **Resultado Esperado:**
  * El motor ejecuta el test de conectividad BFS.
  * Detecta la imposibilidad de trazado de rutas entre ambas capitales.
  * Muestra el error `E04 (Aislamiento Total)`.
  * La opción de "Exportar Código" permanece oculta o deshabilitada.

#### [TEST-EDT-02] Integridad de Serialización y Roundtrip (Exportar $\to$ Importar)
* **Definición:** Comprobar que exportar un mapa a string alfanumérica y volver a importarlo produce una matriz de datos $100\%$ binariamente idéntica.
* **Paso a paso:**
  1. Diseño un mapa complejo con: río central, colinas con oro, un bastión, 2 reclutas y 2 capitales.
  2. Genero el código de exportación $S_1$.
  3. Importo $S_1$ en una instancia limpia de la app y vuelvo a generar el código de exportación $S_2$.
* **Resultado Esperado:** La cadena $S_1$ es exactamente idéntica a $S_2$ carácter por carácter; no hay pérdida de capas ni desplazamiento de coordenadas $(q, r, s)$.

#### [TEST-EDT-03] Flood-Fill Confinado por Capas
* **Definición:** Validar que la herramienta de Bote de Pintura (`[🪣 Relleno]`) solo altera las casillas contiguas que compartan el valor original y no se desborda al resto del mapa.
* **Precondición:** Un parche de 6 casillas de pasto rodeado completamente por un anillo de montañas.
* **Paso a paso:**
  1. Selecciono la herramienta `[🪣 Relleno]` con `Capa 1: MAR`.
  2. Toco una de las casillas de pasto dentro del anillo de montañas.
* **Resultado Esperado:** Las 6 casillas de pasto interiores se transforman en agua (`MAR`); las montañas circundantes y el pasto exterior al anillo permanecen intactos.

#### [TEST-EDT-04] Rendimiento de Pintado por Arrastre (60 FPS)
* **Definición:** Comprobar que arrastrar el dedo rápidamente sobre la pantalla pintando terreno no produce caídas de framerate ni saltos de casillas.
* **Paso a paso:**
  1. Selecciono la brocha `[🖌️ Pincel]` con `Capa 3: CAMINO`.
  2. Realizo un trazo continuo rápido cruzando 20 hexágonos en diagonal en menos de 1 segundo.
* **Resultado Esperado:** Los 20 hexágonos reciben el camino sin omitir casillas intermedias; la tasa de refresco se mantiene estable a 60 FPS durante todo el gesto táctil.

Aquí tienes la especificación formal del **Punto 11: 💾 SISTEMA DE PERSISTENCIA, GUARDADO Y BOTÓN "CONTINUAR"**.

En un juego móvil o de partidas rápidas, un sistema de guardado mediocre arruina la experiencia del usuario (batería que se apaga, llamada telefónica entrante que cierra la app, o guardados corruptos que borran 30 minutos de partida). 

El sistema debe operar bajo tres principios técnicos innegociables:
1. **Escritura Atómica (Cero corrupción):** Nunca se escribe directamente sobre el archivo principal; se escribe en un temporal y se renombra. Si el móvil se apaga a mitad de escritura, no se pierde el progreso.
2. **Autosave Silencioso:** Guarda automáticamente al final de cada turno y al enviar la app a segundo plano (*background*).
3. **Limpieza de Ciclo de Vida:** Al ganar o perder la partida, el archivo de guardado se destruye automáticamente para que el botón "Continuar" del menú principal se apague limpiamente.

## 11. SISTEMA DE PERSISTENCIA, GUARDADO Y BOTÓN "CONTINUAR" (SAVE ENGINE)

> **Propósito del Módulo:** Gestionar el ciclo de vida del estado vivo de la partida, garantizando la persistencia automática ante interrupciones del sistema operativo, integridad atómica de datos y reactivación inmediata desde el Hub Principal mediante el botón "Continuar".

### 11.1. DISPARADORES Y CICLO DE VIDA DEL GUARDADO (SAVE LIFECYCLE)

* **Definición:** El motor de guardado opera en segundo plano y responde a 3 eventos de persistencia y 2 eventos de invalidación:

               ┌── [1. Fin de Turno (Síncrono)]
               ├── [2. App a Segundo Plano / Pausa (OS Event)] ──► [ESCRITURA ATÓMICA] ──► savegame_active.json
               └── [3. Botón "Guardar y Salir" en Menú Pausa]
                                                                                               │
   ┌── [Victoria / Derrota Alcanzada] ─────────────────────────────────────────────────────────┤
   └── [Iniciar "Nueva Partida" pisando la previa] ────────────► [BORRADO DEL ARCHIVO] ────────┘

1. **Disparadores de Escritura Automática:**
   * **Fin de Turno:** Al completarse la fase de resolución de todas las IAs y devolver el control al jugador.
   * **Pérdida de Foco (*OnApplicationPause* / *OnWindowFocusChanged*):** Si el jugador recibe una llamada, bloquea la pantalla o cambia de aplicación.
   * **Salida Voluntaria:** Al pulsar "Guardar y Salir" en el menú de pausa `[⚙️]`.
2. **Disparadores de Invalidación / Borrado:**
   * **Conclusión de Partida:** En el frame exacto en que se dispara la pantalla de Victoria o Derrota, `savegame_active.json` es eliminado de disco.
   * **Sobreescritura:** Si el jugador pulsa "Nueva Partida" en el menú principal existiendo un guardado previo, se exige confirmación modal (*"Se perderá la partida en curso"*); al aceptar, el archivo previo se purga.

### 11.2. ESQUEMA DEL PAYLOAD DE GUARDADO (`savegame_active.json`)

* **Definición:** La partida completa se serializa en una estructura JSON plana y ligera (< 150 KB para mapas Enormes):
{
  "version": "1.0.0",
  "timestamp": 1729814400,
  "game_mode": "SKIRMISH", 
  "map_metadata": {
    "radius": 12,
    "seed": 884219,
    "biome": "TEMPERATE",
    "fog_mode": "FULL_FOG"
  },
  "turn_state": {
    "current_turn": 14,
    "active_player_index": 0
  },
  "factions": [
    {
      "id": 0,
      "is_human": true,
      "tribe_name": "Clan del Río",
      "color_hex": "#1E3A8A",
      "crest_id": 2,
      "active_rules": ["CIV_TYPE_SEDENTARY", "GOV_THEOCRACY", "TESTUDO_SHIELD", "VICTORY_WONDER", "PYRAMID_STAND_15T"],
      "resources": { "gold": 45, "food": 20, "wood": 15 },
      "is_alive": true
    },
    {
      "id": 1,
      "is_human": false,
      "tribe_name": "Horda de la Estepa",
      "color_hex": "#DC2626",
      "crest_id": 5,
      "active_rules": ["CIV_TYPE_NOMAD", "TACTIC_MOBILE_WAR", "WIN_BLITZKRIEG"],
      "resources": { "gold": 12, "food": 8, "wood": 30 },
      "is_alive": true
    }
  ],
  "grid": [
    {
      "q": 0, "r": 0, "s": 0,
      "c1": "LLANO",
      "c2": "TRIGO",
      "c3": "CIUDAD",
      "c4": 0,
      "c5": true,
      "c6": { "type": "GUARD", "tier": 2, "pa": 1 },
      "fog": "VISIBLE"
    }
  ]
}

* **Optimización de Malla:** Las casillas que conserven su estado virgen idéntico a la semilla procedural solo guardan sus deltas de modificación para reducir el tamaño del archivo y acelerar la lectura en móviles.

### 11.3. COMPORTAMIENTO DEL BOTÓN "CONTINUAR" EN EL HUB

* **Definición:** En la pantalla principal (Punto 1.1), el estado del botón "Continuar" depende exclusivamente de la comprobación en el arranque:
  1. **Comprobación Pre-Render (< 30 ms):** El motor verifica la existencia y legibilidad de `savegame_active.json`.
  2. **Estado Activo (Partida Existente):**
     * El botón se muestra resaltado con su color dinástico y un borde pulsante suave.
     * Muestra un subtexto informativo: *"Turno X - [Nombre de Tribu]"*.
     * Al pulsarlo, carga la escena de partida, restaura la posición exacta de la cámara, niebla y telemetría en $< 800$ ms.
  3. **Estado Inactivo (Sin Partida):**
     * El botón se muestra en gris oscuro atenuado (opacidad 35%).
     * Texto: *"Continuar (Sin partida)"*.
     * Los eventos de clic/toque están bloqueados; no reproduce sonido ni animación.

* **Prueba:**
  1. Tengo una partida activa en el turno 8. Cierro la app y la vuelvo a abrir.
  2. **Resultado esperado:** El botón "Continuar" aparece activo con el texto *"Turno 8 - Clan del Río"*; al pulsarlo, el juego me deposita en el turno 8 con los mismos recursos y la misma visión de niebla.
  3. En esa partida, el enemigo captura mi última ciudad y pierdo. Salgo al menú principal.
  4. **Resultado esperado:** El archivo de guardado fue purgado; el botón "Continuar" aparece en gris inactivo.

### 11.4. RESILIENCIA Y ESCRITURA ATÓMICA (ANTI-CORRUPCIÓN)

* **Definición:** Para impedir que la muerte súbita de la batería o un cuelgue del sistema operativo dejen el archivo a medio escribir (corrompiéndolo para siempre), la persistencia sigue el protocolo de **Escritura Atómica en Dos Pasos**:
  1. Se serializa la partida en un archivo temporal: `savegame_active.tmp`.
  2. Se verifica que el archivo temporal sea un JSON válido y legible.
  3. Se ejecuta un renombrado atómico del sistema de archivos (`File.Replace` / `rename()`) de `.tmp` a `.json`.
  4. Si ocurre un fallo en el paso 1 o 2, el archivo `savegame_active.json` anterior permanece intacto, permitiendo retroceder al inicio del turno en lugar de perder la partida completa.

---

### 11.5. BATERÍA DE PRUEBAS DE ACEPTACIÓN: SAVE ENGINE (TEST SUITE)

#### [TEST-SAV-01] Persistencia por Interrupción de Segundo Plano (OS Pause)
* **Definición:** Validar que pausar la aplicación forzosamente guarda el estado exacto sin intervención del usuario.
* **Precondición:** Partida en curso en el Turno 5 con 32 de oro.
* **Paso a paso:**
  1. Sin pulsar fin de turno ni menú de pausa, minimizo la aplicación (envío al home del sistema operativo).
  2. Mediante el gestor de tareas del sistema operativo, fuerzo el cierre inmediato del proceso (Kill Process).
  3. Abro la aplicación desde cero.
  4. Pulso "Continuar".
* **Resultado Esperado:** La partida se reanuda en el Turno 5; la reserva de oro marca exactamente 32; todas las tropas conservan la posición previa a la minimización.

#### [TEST-SAV-02] Purga de Guardado tras Victoria o Derrota
* **Definición:** Comprobar que ganar o perder destruye el archivo físico e inhabilita el botón del menú principal.
* **Precondición:** Partida a 1 movimiento de ganar mediante captura de capital rival.
* **Paso a paso:**
  1. Muevo mi tropa y capturo la capital enemiga.
  2. Se dispara la pantalla de Victoria.
  3. Pulso "Volver al Menú Principal".
  4. Evalúo el sistema de archivos y la interfaz del Hub.
* **Resultado Esperado:**
  * El archivo `savegame_active.json` no existe en disco.
  * En el Hub Principal, el botón "Continuar" aparece en gris deshabilitado.

#### [TEST-SAV-03] Prevención de Corrupción por Escritura Atómica
* **Definición:** Validar que si la escritura se interrumpe abruptamente, el motor restaura la versión segura previa.
* **Precondición:** Partida guardada legítima del Turno 4.
* **Paso a paso:**
  1. En el Turno 5, se inicia el proceso de guardado y se simula un corte de energía inyectando un archivo temporal truncado/corrupto `savegame_active.tmp`.
  2. Se relanza la aplicación.
* **Resultado Esperado:**
  * El motor detecta que `.tmp` está corrupto y lo descarta.
  * Lee el `savegame_active.json` intacto del Turno 4.
  * El juego reanuda en el Turno 4 sin crashear ni arrojar errores de parseo JSON.

#### [TEST-SAV-04] Idempotencia de Reanudación de Niebla y Visibilidad
* **Definición:** Validar que al reanudar una partida con Niebla "Completa", las casillas inexploradas no se revelan accidentalmente por un fallo de carga.
* **Precondición:** Mapa con niebla completa donde solo 12 hexágonos son visibles.
* **Paso a paso:**
  1. Guardo y salgo al menú.
  2. Pulso "Continuar".
* **Resultado Esperado:** La máscara de niebla se renderiza idéntica: exactamente los mismos 12 hexágonos son visibles; las tropas enemigas ocultas en la penumbra permanecen no renderizadas en pantalla.
Aquí tienes la especificación formal del **Punto 12: 🏆 DESAFÍO DIARIO (DAILY CHALLENGE & COMPETITIVE RETENTION)**.

## 12. SISTEMA EN VIVO: DESAFÍO DIARIO (DAILY CHALLENGE & LEADERBOARD)

> **Propósito del Módulo:** Proveer un escenario táctico único cada 24 horas (sincronizado a nivel global a las 00:00 UTC) donde todos los jugadores disputan la misma partida para competir en un ranking de eficiencia por turnos, integrando mapas comunitarios y garantizando juego offline mediante semillas deterministas locales.

### 12.1. CICLO DE ROTACIÓN Y GENERACIÓN DEL ESCENARIO DIARIO

* **Definición:** El Desafío Diario se actualiza automáticamente cada medianoche (00:00:00 UTC). La partida del día se obtiene mediante un pipeline de dos vías:
  1. **Vía Servidor (Online):** El backend selecciona un mapa destacado de la comunidad (creado en el Punto 10) validado con alta valoración de votos, o una semilla procedural curada.
  2. **Vía Resiliencia Local (Offline Fallback):** Si el dispositivo no tiene conexión a internet en el arranque, el motor utiliza como semilla numérica la fecha del calendario local en formato entero:
     $$\text{Seed} = (\text{Año} \times 10000) + (\text{Mes} \times 100) + \text{Día} \quad \text{(Ej. 20261024)}$$
     Esto garantiza que dos jugadores sin conexión en el mismo día jueguen exactamente el mismo mapa generado proceduralmente.
* **Condiciones de Partida:**
  * Mapa de tamaño Pequeño ($R=7$) o Mediano ($R=12$).
  * La configuración inicial del tablero (Capa 1 a Capa 6) es idéntica para todos los participantes.
  * El jugador compite con la **Tribu personalizada** que haya forjado en el Punto 2.

* **Prueba:**
  1. Abro el juego conectado a internet a las 23:59 UTC. Veo el desafío del día activo.
  2. Espero al cambio de fecha a las 00:00 UTC.
  3. **Resultado esperado:** El badge superior izquierdo parpadea; el contador regresivo se reinicia a `23h 59m`; al pulsar sobre la tarjeta, se descarga en segundo plano la nueva configuración del día sin necesidad de reiniciar la app.

### 12.2. SISTEMA DE PUNTUACIÓN Y TELEMETRÍA COMPETITIVA

* **Definición:** El objetivo del Desafío Diario no es solo ganar, sino resolver el escenario con la máxima eficiencia táctica. El ranking clasifica a los jugadores bajo una jerarquía matemática estricta:

  1. **Criterio Primario (Menor Número de Turnos):**
     $$\text{Puntuación Principal} = \text{Turnos Transcurridos hasta la Victoria}$$
     (Ganar en Turno 7 supera a ganar en Turno 8).
  2. **Criterio de Desempate (Superávit de Recursos):**
     Si dos jugadores ganan en el mismo turno, desempata el valor de sus reservas acumuladas al momento de ganar:
     $$\text{Puntos de Desempate} = \text{Oro} + \text{Comida} + \text{Madera}$$
  3. **Segundo Desempate (Bajas Mínimas):**
     Menor cantidad de unidades propias perdidas en combate o por deserción.

* **Categorías de Maestría (Insignias Diarias):**
  * **🥇 Corona de Oro:** Finalizar dentro del Top 10% de mejores puntuaciones del día.
  * **🥈 Escudo de Plata:** Finalizar dentro del Top 25%.
  * **🥉 Estandarte de Bronce:** Victoria completada (cualquier cantidad de turnos).
  * **💀 Calavera:** Derrota o capitulación.

### 12.3. POLÍTICA DE INTENTOS Y TABLA DE CLASIFICACIÓN (LEADERBOARD)

* **Definición:**
  * **Primer Intento (Puntuación Oficial de Clasificación):** Solo el primer intento del día sube el resultado a la tabla global de líderes (*Global Leaderboard*). Esto premia la improvisación táctica a ciegas.
  * **Modo Práctica (Reintentos Ilimitados):** Una vez completado o perdido el primer intento, el jugador puede volver a jugar el mapa del día cuantas veces desee para practicar o probar diferentes doctrinas de su Tribu, pero sus marcas subsiguientes se marcan como *"Práctica (Sin rango)"*.
  * **La Tabla Global:** Muestra el Top 100 de jugadores mundiales (Nombre de Tribu, Blasón, Turnos y Recursos) y la posición relativa del usuario (ej. *"Estás en el puesto #412 - Top 8%"*).

* **Prueba:**
  1. Juego el Desafío Diario por primera vez y gano en el Turno 11.
  2. Vuelvo a jugar el mapa en modo práctica y gano en el Turno 7.
  3. Reviso la tabla de clasificación.
  4. **Resultado esperado:** En el leaderboard oficial mi marca permanece registrada en el Turno 11 con la etiqueta *"Oficial"*; el registro local muestra el récord personal de Turno 7 bajo la etiqueta *"Práctica"*.

### 12.4. RECOMPENSAS Y PERSISTENCIA (`daily_challenge.json`)

* **Definición:** Los resultados se persisten localmente y alimentan el perfil del jugador:
  {
    "last_played_date": "2026-10-24",
    "official_attempt": {
      "completed": true,
      "victory": true,
      "turns": 11,
      "surplus": 74,
      "tier_medal": "GOLD",
      "synced": true
    },
    "history": {
      "total_played": 42,
      "gold_medals": 12,
      "silver_medals": 18,
      "bronze_medals": 10,
      "current_streak": 7
    }
  }

  * **Racha de Días (Daily Streak):** Superar el desafío durante 7 días consecutivos desbloquea un blasón animado exclusivo para la Tribu.

### 12.5. BATERÍA DE PRUEBAS DE ACEPTACIÓN: DESAFÍO DIARIO (TEST SUITE)

#### [TEST-DAY-01] Determinismo Idéntico de Semilla Offline
* **Definición:** Validar que dos dispositivos desconectados de la red generan exactamente el mismo mapa al tener la misma fecha de sistema.
* **Precondición:** Dos terminales (Dispositivo A y Dispositivo B) en modo avión con la fecha fijada manualmente en `2026-10-24`.
* **Paso a paso:**
  1. Abro el Desafío Diario en el Dispositivo A y en el Dispositivo B.
  2. Comparo las casillas centrales y los recursos de Capa 2 en ambos terminales.
* **Resultado Esperado:** Ambas pantallas renderizan un mapa 100% idéntico; las posiciones de los ríos, el trigo, los árboles y las capitales rivales coinciden hexágono por hexágono.

#### [TEST-DAY-02] Sincronización Diferida tras Reconexión (Offline to Online Sync)
* **Definición:** Si el jugador gana el desafío sin internet, la puntuación debe guardarse en cola local (`synced: false`) y transmitirse al backend automáticamente al restablecerse la red.
* **Precondición:** Terminal sin conexión a internet.
* **Paso a paso:**
  1. Juego el desafío diario oficial y gano en Turno 9.
  2. Verifico el archivo local: `synced` está en `false`.
  3. Activo el Wi-Fi / Datos móviles y vuelvo a enfocar la app.
* **Resultado Esperado:** El gestor de red detecta conexión activa en segundo plano; despacha la petición `POST /api/daily/score`; el archivo local actualiza a `synced: true`; mi marca aparece en el leaderboard global sin pérdida de datos.

#### [TEST-DAY-03] Bloqueo de Múltiples Intentos Oficiales (Anti-Cheat / Anti-Exploit)
* **Definición:** Comprobar que forzar el cierre de la app a mitad de la partida oficial no reinicia el intento.
* **Precondición:** Primer intento oficial en curso en el Turno 4.
* **Paso a paso:**
  1. Veo que voy perdiendo y fuerzo el cierre inmediato de la aplicación (Kill Process).
  2. Relanzo la aplicación y accedo al Desafío Diario.
* **Resultado Esperado:** El sistema no me permite empezar desde el Turno 1 con ventaja de información; el motor detecta la partida interrumpida mediante el autosave (Punto 11) y me reanuda en el Turno 4, o bien registra el intento como capitulación si el jugador decide abandonar.

#### [TEST-DAY-04] Criterio de Desempate en Clasificación
* **Definición:** Validar que a igualdad de turnos, el jugador con mayor superávit de recursos (`💰 + 🌾 + 🌲`) ocupa el puesto superior.
* **Precondición:** 
  * Jugador A: Victoria en Turno 10, Superávit: $45$ oro, $20$ comida, $15$ madera (Total: 80).
  * Jugador B: Victoria en Turno 10, Superávit: $30$ oro, $10$ comida, $10$ madera (Total: 50).
* **Paso a paso:**
  1. El servidor ordena la tabla de clasificación.
* **Resultado Esperado:** El Jugador A figura en la posición superior inmediata sobre el Jugador B ($Turno\ 10\ [80\ pts] > Turno\ 10\ [50\ pts]$).
Tienes una visión de producto impecable. Tratar las estadísticas como una simple lista aburrida en el menú principal es un error común. 

Diseñar **las tres pantallas bajo una misma arquitectura visual y de datos** crea una experiencia coherente y profesional:
1. **La Pantalla de Información en Partida (Live Scoreboard):** Se abre al tocar el icono `[🏆 T12]` en la barra superior durante el juego para ver cómo vas contra tus rivales en tiempo real.
2. **La Pantalla de Cierre de Partida (End-Game Debrief):** El informe detallado que salta al ganar o perder (con el resumen de bajas, recursos, estrellas y la gráfica de territorio turno a turno).
3. **El Perfil Global del Usuario (Dock `[📊 Estadísticas]`):** El historial acumulado de tu vida como jugador (tu ratio de victorias, tu doctrina favorita y tus medallas).

## 13. SISTEMA DE TELEMETRÍA, ESTADÍSTICAS Y PANTALLAS DE BALANCE (STATS ENGINE)

> **Propósito del Módulo:** Registrar, procesar y presentar la telemetría táctica del jugador a través de tres vistas interconectadas: el monitor en vivo durante la partida, el informe de balance post-partida y el perfil histórico permanente en el menú principal.


### 13.1. EL MODELO DE DATOS UNIFICADO DE TELEMETRÍA (METRIC ENGINE)

* **Definición:** El motor rastrea en cada turno y de forma síncrona cuatro vectores de métricas para todas las facciones activas en el mapa:
  1. **Vector Militar:** Tropas reclutadas, tropas enemigas eliminadas, bajas propias sufridas, número de fusiones ($T1 \to T2 \to T3$), líneas de suministro enemigas cortadas.
  2. **Vector Territorial:** Hexágonos conquistados, porcentaje del mapa bajo control, asentamientos fundados (`CAMPAMENTO`, `BASTIÓN`, `PUEBLO`, `CIUDAD`).
  3. **Vector Económico:** Oro `💰`, Comida `🌾` y Madera `🌲` recolectados acumulados; turnos pasados en déficit; bajas por deserción/hambruna.
  4. **Vector Cronológico (Línea de Tiempo):** Matriz que almacena al final de cada turno:
     $$\text{Registro}(Turno) = \{ \text{Casillas Controladas}, \text{Fuerza Militar}, \text{Oro Total} \}$$

### 13.2. PANTALLA A: MONITOR EN VIVO DURANTE LA PARTIDA (IN-GAME SCOREBOARD)

* **Definición:** Al tocar el indicador `[🏆 T12]` en el HUD superior (Punto 4), se despliega un panel modal translúcido sin pausar la simulación de fondo:

┌──────────────────────────────────────────────────────────────┐
│                    BALANCE TÁCTICO - TURNO 12                │
│                                                   [✖️ Cerrar]│
├──────────────────────────────────────────────────────────────┤
│ PROGRESO DE VICTORIA:                                        │
│ [██████████████░░░░░░] 65% - "Pirámide Eterna (Turno 10/15)" │
├──────────────────────────────────────────────────────────────┤
│ COMPARATIVA DE FACCIONES:                                    │
│ 1. 🛡️ [Tu Tribu]     : 42 Hex (45%) | ⚔️ Fza: 14 | 💰 45 oro  │
│ 2. 🔴 Horda Roja     : 30 Hex (32%) | ⚔️ Fza: 18 | 💰 12 oro  │
│ 3. 🟢 Clan Verde     : 22 Hex (23%) | ⚔️ Fza:  6 | 💰  4 oro  │
├──────────────────────────────────────────────────────────────┤
│ 🔗 SUMINISTRO: 40 Conectados | 2 Aislados (Advertencia)      │
└──────────────────────────────────────────────────────────────┘

* **Regla de Niebla de Guerra:** En partidas con Niebla "Completa", los valores militares y de oro de los rivales se muestran como estimaciones aproximadas basadas en las tropas vistas, o con signos de interrogación (`?`) si la facción no ha sido contactada.

* **Prueba:**
  1. Durante una partida, toco el indicador `[🏆 T12]` en la barra superior.
  2. **Resultado esperado:** Se abre el modal centrado en menos de 100 ms; las barras de porcentaje de territorio coinciden exactamente con la suma de casillas de Capa 4 en el mapa; al tocar fuera del modal o la cruz `[✖️]`, el panel se cierra suavemente.

### 13.3. PANTALLA B: INFORME DE CIERRE DE PARTIDA (END-GAME DEBRIEF)

* **Definición:** Al cumplirse cualquier condición de Victoria o Derrota, el motor congela el tablero y transiciona a la pantalla de Cierre de Partida:

┌──────────────────────────────────────────────────────────────┐
│                  ¡VICTORIA MONUMENTAL!                       │
│              "Tu civilización ha trascendido"                │
│                         ⭐⭐⭐                               │  <-- Estrellas (en Campaña)
├──────────────────────────────────────────────────────────────┤
│ RENDIMIENTO:                                                 │
│ • Turnos Totales    : 14            • Bajas Enemigas : 9     │
│ • Bajas Propias     : 1             • Cortes Sumin.  : 3     │
│ • Superávit Final   : 💰45 🌾20 🌲15 • Asentamientos  : 4    │
├──────────────────────────────────────────────────────────────┤
│ LÍNEA DE TIEMPO (EVOLUCIÓN TERRITORIAL):                     │
│ 50%┌───/\────────────────── [Azul: Tu Tribu]                 │
│ 25%│  /  \───────/\──────── [Rojo: Horda Rival]              │
│  0%└──┴────┴─────┴────┴──► (Turnos 1 al 14)                  │
├──────────────────────────────────────────────────────────────┤
│   [🔄 Reintentar]     [📤 Compartir]     [🏠 Menú Principal] │
└──────────────────────────────────────────────────────────────┘

* **Elementos Interactivos:**
  * **Gráfica de Línea de Tiempo:** Gráfica vectorial sencilla de 2 ejes (Eje X: Turnos; Eje Y: Hexágonos controlados) que muestra el auge y caída de cada bando.
  * **Botón "Compartir":** Genera una tarjeta visual recortada en formato imagen/captura con el resultado, el blasón de tu tribu y la gráfica para compartir en redes.

* **Prueba:**
  1. Derroto a la última capital rival en el Turno 14.
  2. **Resultado esperado:** Transición fluida con fanfarria de sonido; la pantalla muestra *"¡Victoria!"*; la gráfica dibuja la curva de crecimiento de mi territorio en azul y la caída del enemigo en rojo hasta tocar el 0%; el botón "Menú Principal" purga el guardado activo y regresa al Hub.

### 13.4. PANTALLA C: PERFIL HISTÓRICO DEL USUARIO (DOCK `[📊 ESTADÍSTICAS]`)

* **Definición:** Al tocar el icono de estadísticas en el menú principal, se abre el registro permanente del jugador acumulado a lo largo de todas sus sesiones:

┌──────────────────────────────────────────────────────────────┐
│                 EXPEDIENTE DE CIVILIZACIÓN                   │
│                                                   [⬅️ Volver]│
├──────────────────────────────────────────────────────────────┤
│ 🛡️ [Blasón Pixel Art]  "CLAN DEL RÍO"                         │
│ • Rango General   : Gran Estratega    • Nivel de Cuenta: 24  │
│ • Tiempo de Juego : 14h 32m           • Partidas Totales: 58 │
├──────────────────────────────────────────────────────────────┤
│ TELEMETRÍA GLOBAL:                                           │
│ • Ratio de Victorias : 72% (42 V / 16 D)                     │
│ • Hexágonos Conquistados : 3.420                             │
│ • Líneas de Suministro Cortadas : 124                        │
│ • Deserciones Provocadas al Rival : 88                       │
├──────────────────────────────────────────────────────────────┤
│ PREFERENCIAS TÁCTICAS:                                       │
│ • Doctrina más jugada : [B2.1.1] Disparo Parto (Caballería)  │
│ • Condición de Victoria favorita : Conquista Militar (60%)   │
│ • Desafíos Diarios superados : 18 (🥇 5 | 🥈 8 | 🥉 5)        │
└──────────────────────────────────────────────────────────────┘

### 13.5. PERSISTENCIA DE TELEMETRÍA (`player_statistics.json`)

* **Definición:** El perfil estadístico se almacena en disco y se actualiza al cierre de cada partida:
  {
    "lifetime": {
      "games_started": 58,
      "games_won": 42,
      "games_lost": 16,
      "total_turns_played": 812,
      "total_playtime_seconds": 52320,
      "hexes_captured": 3420,
      "units_recruited": 540,
      "units_lost": 112,
      "enemies_killed": 430,
      "supply_lines_cut": 124,
      "starvations_induced": 88
    },
    "doctrine_usage_counter": {
      "CIV_TYPE_SEDENTARY": 22,
      "CIV_TYPE_NOMAD": 36,
      "PARTHIAN_RETREAT": 30,
      "TESTUDO_SHIELD": 12
    },
    "victories_by_type": {
      "DOMINATION": 25,
      "WONDER": 10,
      "FINANCIAL": 7
    }
  }

### 13.6. BATERÍA DE PRUEBAS DE ACEPTACIÓN: ESTADÍSTICAS (TEST SUITE)

#### [TEST-STA-01] Actualización Inmediata del Monitor en Vivo
* **Definición:** Validar que capturar 2 casillas en el turno actual actualiza inmediatamente el porcentaje de territorio en el modal de balance.
* **Precondición:** El jugador posee 10 casillas de un mapa de 100 ($10\%$).
* **Paso a paso:**
  1. Capturo 2 casillas neutrales con un Recluta.
  2. Abro el monitor tocando `[🏆 T12]`.
* **Resultado Esperado:** La línea de la tribu del jugador refleja instantáneamente: `12 Hex (12%)`; la suma de porcentajes de todas las facciones se mantiene coherente.

#### [TEST-STA-02] Generación Correcta de la Curva de Línea de Tiempo
* **Definición:** Validar que la gráfica de cierre post-partida contiene exactamente tantos puntos de datos en el eje X como turnos duró la partida.
* **Precondición:** Partida que concluye en el Turno 9.
* **Paso a paso:**
  1. Conquisto la última ciudad enemiga en el Turno 9.
  2. Se abre la pantalla de Cierre de Partida.
  3. Inspecciono el objeto de datos que alimenta la gráfica vectorial.
* **Resultado Esperado:** La serie de datos contiene exactamente 9 nodos cronológicos para cada jugador ($T_1$ a $T_9$); el último punto del rival marca 0 casillas y el del jugador marca el máximo territorial alcanzado.

#### [TEST-STA-03] Persistencia Acumulativa en el Perfil Histórico
* **Definición:** Validar que las bajas y conquistas de una partida finalizada se suman sin pérdida al archivo `player_statistics.json`.
* **Precondición:** Perfil histórico registra 100 hexágonos conquistados y 5 victorias.
* **Paso a paso:**
  1. Juego una partida corta, capturo 15 hexágonos y gano la partida.
  2. Salgo al menú principal y entro en el dock `[📊 Estadísticas]`.
* **Resultado Esperado:** El expediente del jugador muestra: `Hexágonos Conquistados: 115` ($100 + 15$) y `Victorias: 6` ($5 + 1$); el ratio de victorias se recalcula matemáticamente.

#### [TEST-STA-04] Precisión del Contador de Doctrinas Favoritas
* **Definición:** Comprobar que el sistema incrementa el contador de la doctrina específica que el jugador utilizó durante la partida.
* **Precondición:** Jugador disputa una partida con `CIV_TYPE_NOMAD`.
* **Paso a paso:**
  1. Concluyo la partida (victoria o derrota).
  2. Leo el archivo `player_statistics.json`.
* **Resultado Esperado:** El valor de `doctrine_usage_counter["CIV_TYPE_NOMAD"]` se incrementa en $+1$; el campo "Doctrina más jugada" en la interfaz muestra la etiqueta con mayor frecuencia histórica.

Aquí tienes la especificación formal del **Punto 14: ⚙️ SISTEMA DE AJUSTES Y CONFIGURACIÓN TÉCNICA (SETTINGS ENGINE)**.

En un juego de estrategia territorial donde el color de los hexágonos y el tacto en pantalla son vitales, el menú de ajustes no es un simple formulario: debe resolver problemas críticos de **accesibilidad (daltonismo para distinguir fronteras)**, **ergonomía móvil (modo zurdo y respuesta háptica)** y **ahorro de batería** para sesiones largas.

## 14. DOCK: SISTEMA DE AJUSTES Y CONFIGURACIÓN TÉCNICA (SETTINGS ENGINE)

> **Propósito del Módulo:** Proveer control total al usuario sobre el rendimiento técnico, ergonomía táctil, canales de audio, accesibilidad visual y gestión de datos locales, accesible tanto desde el dock del Hub Principal como desde el menú de pausa en partida.

### 14.1. ARQUITECTURA VISUAL Y CATEGORÍAS DEL PANEL DE AJUSTES

* **Definición:** Al tocar el icono de "Ajustes" `[⚙️]`, se abre un panel modal de pantalla completa dividido en 5 pestañas de navegación rápida:

┌──────────────────────────────────────────────────────────────┐
│                    CONFIGURACIÓN DEL SISTEMA                 │
│                                                   [⬅️ Volver]│
├──────────────────────────────────────────────────────────────┤
│ [🔊 Audio]  [🎮 Juego]  [👁️ Gráficos]  [🌐 Idioma]  [💾 Datos] │  <-- Pestañas
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              PANEL DE PARÁMETROS DE LA PESTAÑA               │
│               (Deslizadores, Toggles y Selectores)           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Versión: v1.0.0-PROD          [Restablecer Ajustes de Fábrica]│
└──────────────────────────────────────────────────────────────┘

### 14.2. DESGLOSE DETALLADO POR PESTAÑAS DE CONFIGURACIÓN

#### 14.2.1. Pestaña 1: Audio y Sonido (`[🔊 Audio]`)
* **Regla Base:** El motor gestiona el sonido a través de 3 buses independientes con volumen regulable de $0\%$ a $100\%$:
  * **Volumen General (Master):** Atenúa todas las salidas de audio.
  * **Efectos de Sonido (SFX):** Golpes de combate, clics de hexágono, desmoronamiento de bastiones y fanfarrias.
  * **Música Ambiental:** Pistas musicales retro-tácticas de fondo (incluye toggle: *"Pausar música al minimizar"*).

#### 14.2.2. Pestaña 2: Ergonomía y Controles (`[🎮 Juego]`)
* **Regla Base:** Opciones diseñadas para optimizar la partida a una sola mano en pantallas táctiles:
  * **Modo Zurdo (Left-Handed Mode):** Invierte horizontalmente el HUD inferior: coloca el botón "Fin de Turno" `[⏩]` a la izquierda y el botón "Deshacer" `[↩️]` a la derecha.
  * **Vibración Háptica (Haptic Feedback):** Activa o apaga las micro-vibraciones del móvil al cometer movimientos ilegales ($A \le D$), fusionar tropas o pulsar botones.
  * **Seguridad de Fin de Turno:**
    * *Modo A (Solo en Peligro):* Solo pide confirmación si la tesorería entra en déficit/hambruna (por defecto).
    * *Modo B (Siempre Confirmar):* Exige doble toque en el botón `[⏩]` en todos los turnos para evitar pases accidentales.
  * **Velocidad de Turno de la IA:** Selector de ritmo de animación de los movimientos rivales (*Instantáneo, Rápido [1.5x], Normal [1.0x]*).

#### 14.2.3. Pestaña 3: Accesibilidad Visual y Gráficos (`[👁️ Gráficos]`)
* **Regla Base:**
  * **Filtros para Daltonismo (Colorblind Modes):** En un juego de control territorial, confundir el color de una frontera es fatal. Incluye 4 perfiles que recalibran la paleta de colores de las 6 facciones:
    * `NORMAL`: Paleta estándar de alto contraste.
    * `DEUTERANOPIA`: Ajuste para ceguera al verde (sustituye verdes y rojos por azules profundos y amarillos puros).
    * `PROTANOPIA`: Ajuste para ceguera al rojo.
    * `TRITANOPIA`: Ajuste para ceguera al azul.
  * **Símbolos de Apoyo de Facción:** Conmutador que estampa un pequeño icono del blasón en cada hexágono para identificar al dueño sin depender del color.
  * **Tasa de Refresco (FPS):**
    * *60 FPS (Fluido):* Máxima suavidad de paneo y zoom.
    * *30 FPS (Ahorro de Batería):* Reduce el consumo energético y el calentamiento en un 40%.

#### 14.2.4. Pestaña 4: Idioma y Localización (`[🌐 Idioma]`)
* **Regla Base:** Selector de localización sin necesidad de reiniciar la app:
  * Español, Inglés, Francés, Alemán, Portugués, Ruso, Chino Simplificado y Japonés.
  * Todos los textos del motor se leen de tablas clave-valor (`locale_es.json`, `locale_en.json`).

#### 14.2.5. Pestaña 5: Gestión de Datos y Privacidad (`[💾 Datos]`)
* **Regla Base:**
  * **Exportar Copia de Seguridad:** Genera un archivo `.backup` con el perfil de la Tribu, mapas creados y estadísticas.
  * **Importar Copia:** Restaura un respaldo previo.
  * **Restablecer Todo de Fábrica:** Botón rojo de peligro. Exige escribir la palabra *"BORRAR"* en un campo de texto para purgar todos los datos locales y reiniciar el juego como recién instalado.

### 14.3. PERSISTENCIA DE CONFIGURACIÓN (`settings_config.json`)

* **Definición:** Los ajustes se guardan inmediatamente en almacenamiento local al modificarse:
  {
    "audio": {
      "master_volume": 0.8,
      "sfx_volume": 1.0,
      "music_volume": 0.6,
      "mute_on_background": true
    },
    "gameplay": {
      "left_handed_mode": false,
      "haptic_feedback_enabled": true,
      "confirm_end_turn_mode": "ON_DEFICIT_ONLY",
      "ai_turn_speed": "FAST"
    },
    "video": {
      "target_fps": 60,
      "colorblind_mode": "NONE",
      "faction_symbols_overlay": true
    },
    "localization": {
      "current_language": "es_MX"
    }
  }

### 14.4. BATERÍA DE PRUEBAS DE ACEPTACIÓN: AJUSTES (TEST SUITE)

#### [TEST-SET-01] Cambio Dinámico a Modo Zurdo (Flip de HUD)
* **Definición:** Validar que activar el modo zurdo invierte la posición física de los botones de acción sin recargar la partida.
* **Precondición:** Partida activa en pantalla. El botón "Fin de Turno" está anclado a la esquina inferior derecha.
* **Paso a paso:**
  1. Abro el menú de ajustes en partida (`[⚙️]`).
  2. Activo el interruptor *"Modo Zurdo"*.
  3. Cierro el menú de ajustes regresando al tablero.
* **Resultado Esperado:**
  * El botón "Fin de Turno" `[⏩]` ahora se renderiza anclado a la esquina inferior izquierda.
  * El botón "Deshacer" `[↩️]` se ubica en la esquina inferior derecha.
  * El orden de los cajones centrales `[⛺]` y `[💂]` se adapta a la nueva simetría.

#### [TEST-SET-02] Verificación del Filtro de Daltonismo en Fronteras
* **Definición:** Comprobar que seleccionar Deuteranopia sustituye el color verde de la facción por un color contrastado seguro.
* **Paso a paso:**
  1. En Ajustes $\to$ Gráficos, cambio el perfil de color a `DEUTERANOPIA`.
  2. Cargo un mapa con una facción verde y una roja contiguas.
* **Resultado Esperado:** El shader del mapa sustituye los colores problemáticos por la paleta segura homologada; la diferencia territorial es 100% legible para usuarios con déficit visual de canal verde.

#### [TEST-SET-03] Limitación de Tasa de Refresco a 30 FPS
* **Definición:** Validar que el conmutador de ahorro de batería fija el límite de frames del motor a 30 FPS exactos.
* **Paso a paso:**
  1. Activo el contador de rendimiento de depuración en pantalla.
  2. Selecciono *"30 FPS (Ahorro de Batería)"*.
  3. Muevo la cámara y hago zoom en el mapa durante 10 segundos.
* **Resultado Esperado:** La tasa de refresco reportada por el motor se clava en $30.0 \pm 1.0$ FPS, reduciendo el consumo de GPU.

#### [TEST-SET-04] Protocolo de Seguridad en Borrado de Fábrica
* **Definición:** Validar que no se puede resetear el juego por error si no se escribe la confirmación textual exacta.
* **Paso a paso:**
  1. Entro en Ajustes $\to$ Datos $\to$ "Restablecer de Fábrica".
  2. Escribo "borrar" (en minúsculas o texto erróneo) y pulso "Aceptar".
  3. Escribo "BORRAR" (mayúsculas exactas) y pulso "Aceptar".
* **Resultado Esperado:**
  * En el paso 2: El botón de confirmación se mantiene bloqueado o arroja advertencia: *"Texto de confirmación incorrecto"*; los datos no se tocan.
  * En el paso 3: El sistema purga la base de datos local y reinicia la aplicación mostrando el Hub Principal limpio como en el primer arranque.

## 15. SISTEMA EN VIVO: NOTICIAS Y ENLACES COMUNITARIOS (COMMUNITY ENGINE)

> **Propósito del Módulo:** Proveer un canal de comunicación directo y no intrusivo con los jugadores desde el Hub Principal para anunciar notas de parche, destacar mapas de la comunidad y redirigir tráfico hacia las plataformas oficiales (Discord, Reddit, TikTok), garantizando funcionamiento offline sin dependencias críticas de red.

### 15.1. ACCESO Y LAYOUT DEL MODAL DE NOVEDADES

* **Definición:** Al tocar el icono de "Noticias" `[📢]` en la esquina superior derecha del menú principal (Punto 1.1), se despliega un panel modal centrado con estética de pergamino táctico / marco en pixel art:

┌──────────────────────────────────────────────────────────────┐
│                    NOVEDADES DE HEXFRONTIER                  │
│                                                   [✖️ Cerrar]│
├──────────────────────────────────────────────────────────────┤
│ 🏆 DESTACADO DE LA SEMANA:                                   │
│ "El Paso de las Termópilas" - Mapa creado por @Legionario99  │
│ [▶️ Jugar Ahora]  (Carga el código de mapa directamente)      │
├──────────────────────────────────────────────────────────────┤
│ 📜 NOTAS DEL PARCHE (v1.0.4):                                │
│ • Balance: El Bastión ahora resiste 1 impacto de cañón extra.│
│ • Editor: Se añade la herramienta Gotero para clonar celdas. │
├──────────────────────────────────────────────────────────────┤
│ ÚNETE A LA COMUNIDAD:                                        │
│  [💬 Discord]   [👽 Reddit]   [📱 TikTok]   [⭐ Calificar]   │
└──────────────────────────────────────────────────────────────┘

### 15.2. CANAL DE ENLACES EXTERNOS Y SEGURIDAD (DEEP LINKS)

* **Definición:** La interacción con los botones de redes sociales sigue el protocolo seguro del sistema operativo:
  1. **Llamada Segura al Navegador/App:** El motor no incrusta navegadores web internos vulnerables (*no In-App WebViews pesadas*). Utiliza la pasarela nativa del sistema operativo (`Application.OpenURL()` / `Intent` de Android / `openURL` de iOS).
  2. **Detección de Aplicación Instalada (Deep Linking):**
     * Si el usuario tiene instalada la app nativa (ej. Discord o Reddit), el enlace abre directamente el servidor o subreddit oficial dentro de la aplicación.
     * Si no la tiene instalada, abre el enlace en el navegador web predeterminado del dispositivo.
  3. **Lista de Enlaces Homologados:**
     * `[💬 Discord]`: Enlace de invitación permanente a la comunidad de creadores de mapas y balance táctico.
     * `[👽 Reddit]`: Acceso al subreddit oficial `r/HexFrontier`.
     * `[📱 TikTok / YouTube]`: Canal de clips con partidas destacadas, jugadas maestras y tutoriales de diseño de mapas.
     * `[⭐ Calificar]`: Redirección directa a la ficha de la tienda oficial (Google Play Store / Apple App Store / Steam) para incentivar reseñas positivas.

### 15.3. SISTEMA DE INDICADOR DE NOVEDADES (UNREAD BADGE)

* **Definición:** Para avisar al jugador de noticias importantes sin lanzar pop-ups invasivos que interrumpan el arranque:
  * Si el servidor publica un nuevo anuncio con un `news_id` superior al último leído por el usuario, el icono `[📢]` en el menú principal muestra un **punto rojo brillante (*Badge*)** en su esquina superior derecha.
  * Al pulsar el icono y abrir el modal, el motor marca el `news_id` como leído en disco y el punto rojo desaparece inmediatamente.

### 15.4. CACHÉ LOCAL Y RESILIENCIA OFFLINE (`community_news.json`)

* **Definición:** El contenido del panel se descarga en segundo plano con un timeout estricto de **800 ms** para no frenar la fluidez del juego:
  * **Si hay conexión:** Descarga el payload JSON actualizado y lo guarda en la memoria caché local.
  * **Si no hay conexión:** Lee el archivo local `community_news.json` almacenado en caché.
  * **Si es el primer arranque sin internet:** Muestra una plantilla de fábrica estática con el mensaje de bienvenida del equipo de desarrollo, la versión actual y los créditos del juego, sin arrojar errores de red ni pantallas en blanco.

### 15.5. BATERÍA DE PRUEBAS DE ACEPTACIÓN: NOTICIAS (TEST SUITE)

#### [TEST-NEWS-01] Apertura Segura de Enlaces Externos
* **Definición:** Validar que tocar el botón de Discord minimiza el juego de forma segura sin congelar el hilo principal de renderizado.
* **Paso a paso:**
  1. Abro el modal de Noticias.
  2. Pulso el botón `[💬 Discord]`.
* **Resultado Esperado:**
  * El sistema operativo intercepta la petición y abre la aplicación de Discord o el navegador web en la URL oficial.
  * El motor de juego entra limpiamente en estado de pausa (*OnApplicationPause*), disparando el guardado atómico preventivo (Punto 11).

#### [TEST-NEWS-02] Ciclo de Vida del Indicador de No Leído (Unread Dot)
* **Definición:** Comprobar que el punto rojo de notificación desaparece permanentemente tras abrir el panel.
* **Precondición:** Existe un anuncio con ID `news_2026_10` que no ha sido leído por el jugador.
* **Paso a paso:**
  1. Lanzo la app y observo el icono `[📢]` en la esquina superior derecha.
  2. Toco el icono `[📢]` y leo el anuncio.
  3. Cierro el modal y regreso al menú principal.
* **Resultado Esperado:**
  * En el paso 1: El icono muestra el punto rojo de notificación sobre su sprite.
  * En el paso 2 y 3: El identificador se guarda localmente como visto; el punto rojo se desvanece y no vuelve a aparecer en futuros arranques para esa misma noticia.

#### [TEST-NEWS-03] Botón de Acción Inmediata: Jugar Mapa Destacado
* **Definición:** Validar que el botón `[▶️ Jugar Ahora]` en el anuncio del mapa comunitario inicia una partida directa sin tener que copiar y pegar códigos manualmente.
* **Precondición:** El anuncio semanal incluye el mapa destacado de la comunidad con código `MAP-TERMOPILAS-99`.
* **Paso a paso:**
  1. Toco `[▶️ Jugar Ahora]` dentro del panel de noticias.
* **Resultado Esperado:** El juego cierra el modal, carga internamente el código de mapa en el motor de juego e inicializa una partida de escaramuza en el Turno 1 con dicho mapa en menos de 1 segundo.

#### [TEST-NEWS-04] Carga Offline sin Degradación Visual
* **Definición:** Comprobar que abrir el menú de noticias en modo avión nunca muestra pantallas de error de conexión HTTP (404/500).
* **Precondición:** Dispositivo en modo avión sin conexión a red.
* **Paso a paso:**
  1. Toco el icono `[📢]`.
* **Resultado Esperado:** El panel se abre instantáneamente mostrando la información en caché local o el mensaje de bienvenida de fábrica; los botones de redes sociales permanecen visibles pero muestran un aviso tenue si se tocan: *"Requiere conexión a internet"*.
