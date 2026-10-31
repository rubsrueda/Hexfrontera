/* HEXFRONTIER · parámetros de juego.
   Todos los números de equilibrio viven aquí; el motor, el generador de mapas
   y la IA solo leen de HF.CFG. Edita este archivo para reajustar el juego. */
(function (G) {
  const HF = G.HF = G.HF || {};
  HF.CFG = {
    // Vista del tablero: inclinación de la cámara sobre el plano del mapa.
    // 1 = vista cenital plana · 0.62 = perspectiva de diorama (por defecto,
    // unos 51° respecto a la vertical). Los sprites siempre se dibujan de pie.
    // spriteStretch compensa el aplastado del suelo: las imágenes se estiran
    // en vertical desde su base para ganar volumen.
    view: { tilt: 0.62, spriteStretch: 1.15, startZoom: 1.8 },
    // Música clásica dinámica (js/music.js). enabled:false deja el sintetizador
    // procedural de util.js, útil para builds 100% offline.
    music: { enabled: true, volume: 0.3, fade: 1.8, warRadius: 2 },
    // recursos iniciales de cada facción
    start: { gold: 30, food: 20, wood: 25 },

    // ingresos por turno de las casillas propias con suministro
    income: {
      sedentaryGold: 3,                       // CIV_TYPE_SEDENTARY
      terrain: { LLANO: { gold: 1 }, MONTANA: { gold: 1 }, RIO: { food: 1 }, COLINA: {} },
      resource: { ORO: { gold: 3 }, TRIGO: { food: 3 }, MADERA: { wood: 3 } },
      enclaveMult: 2                          // EXTRACTIVE_ENCLAVE multiplica los recursos
    },
    // [oro, comida] que produce cada edificio (3 camp., 4 pueblo, 5 ciudad, 6 bastión)
    buildingProd: { 3: [1, 1], 4: [2, 4], 5: [4, 8], 6: [1, 2] },
    // producción extra del recurso de la casilla según el edificio construido encima
    // (se suma al rendimiento base del recurso: camino 0, campamento +1, pueblo +2, bastión +2, ciudad +3)
    buildingResBonus: { 2: 0, 3: 1, 4: 2, 6: 2, 5: 3 },
    // defensa que aporta un edificio
    buildingDef: { 3: 1, 4: 1, 5: 2, 6: 3 },
    // nivel de evolución: un edificio solo puede sustituirse por uno de nivel superior
    buildingLevel: { 0: 0, 1: 0, 2: 1, 3: 2, 4: 3, 6: 4, 5: 5 },
    buildingRank: { 3: 1, 4: 2, 6: 3, 5: 4 },
    buildingCost: {
      2: { wood: 5 }, 3: { wood: 15 }, 4: { wood: 25, food: 25 },
      5: { wood: 60, food: 60 }, 6: { wood: 30, gold: 20 }
    },
    siegeDowngrade: { 5: 4, 4: 3, 3: 0, 6: 3 },   // edificio -> edificio tras un asedio

    // talar un árbol al entrar en su casilla
    chopWood: 10, chopWoodEnclave: 20,
    treeSpreadChance: 0.08,                   // por árbol y vecino libre (llano/colina, sin edificio ni unidad) cada ronda

    // --- expansión "efecto acuario" ---
    seasons: {
      length: 6,                              // turnos por estación
      springTreeMult: 2,                      // primavera duplica la propagación de árboles
      summerShipMove: 1,                      // verano: +1 casilla de navegación en MAR
      autumnWheatFood: 1                      // otoño: +1 comida por casilla de trigo
    },
    roads: { fastCost: 0.25 },                // camino/asentamiento -> camino/asentamiento
    commerce: { routeGold: 2, maxRoutes: 3 }, // +2 oro por extremo y ruta, máximo 3
    loan: { amount: 50, perTurn: 6, turns: 10 }, // +50 oro, -6/turno durante 10 turnos
    barks: { chance: 0.4, life: 2 },          // probabilidad y duración de las burbujas de tropa
    ambience: { maxParticles: 25, clouds: 3, fps: 15 }, // límites del tablero animado

    // unidades: coste, mantenimiento por turno según nivel (up = comida, upGold = oro), edificios de origen,
    // movimiento (casillas propias) y rango de ataque
    units: {
      // Mantenimiento exponencial diferenciado: N1 accesible, N2 inversión, N3 joya.
      // Comida refleja el consumo biológico/logístico; oro refleja equipamiento y salarios.
      // INF: base del imperio. ENG: misma comida que INF, +oro técnico. ARC: oro elevado (munición).
      // CAB: el mayor devorador de grano. SIE: el mayor pozo de oro. BAR: tripulaciones navales.
      INF: { name: 'Infantería', icon: '💂', cost: { gold: 10, food: 5 }, up: [1, 3, 7], upGold: [1, 2, 5], from: [3, 4, 5, 6], move: 3, moveHeavy: 1, atkRange: 1, def: 0 },
      ENG: { name: 'Ingeniero', icon: '🔧', cost: { gold: 25, food: 5, wood: 5 }, up: [1, 3, 7], upGold: [1, 3, 6], from: [3, 4, 5, 6], move: 4, moveHeavy: 1, atkRange: 1, def: 0 },
      ARC: { name: 'Arquero', icon: '🏹', cost: { gold: 15, wood: 5 }, up: [1, 3, 6], upGold: [2, 4, 8], from: [4, 5, 6], move: 3, atkRange: 1, atk: 1, def: 0, shoot: 2, shootHill: 3 },
      CAB: { name: 'Caballería', icon: '♞', cost: { gold: 20, food: 10 }, up: [3, 6, 11], upGold: [2, 5, 10], from: [5], move: 6, atkRange: 2, atkRangeMobile: 3, atk: 2, def: 1, defKnight: 2 },
      SIE: { name: 'Asedio', icon: '💣', cost: { gold: 25, wood: 15, food: 10 }, up: [2, 5, 8], upGold: [3, 7, 13], from: [4, 5, 6], move: 2, atkRange: 1, atk: 1, def: 0, shoot: 2 },
      BAR: { name: 'Barco', icon: '⛵', cost: { gold: 30, wood: 25 }, up: [2, 4, 8], upGold: [2, 4, 8], from: [3, 4, 5, 6], naval: true, move: 5, atk: 2, def: 1, shoot: 2 }
    },
    mountainUnits: ['ENG'],                   // solo los ingenieros cruzan montañas y ríos sin camino
    recruitRadius: 3,                         // casillas máximas desde un edificio de origen
    fuseMax: 3, fuseMaxAscetic: 2,            // nivel máximo al fusionar
    fuseTypes: ['INF', 'ENG', 'ARC', 'CAB', 'SIE', 'BAR'],  // tipos de unidad fusionables (cada nivel extra suma +1 ataque y +1 defensa en las no-infantería)
    shipCarry: true,  // los barcos pueden transportar 1 unidad de tierra (embarcar desde costa, desembarcar en costa)
    isolatedCampMin: 3, // casillas propias incomunicadas necesarias para fundar un campamento (nueva provincia)

    combat: {
      hillDef: 1, mountainDef: 2,             // bonus de defensa de infantería por terreno
      bastionAura: 2,                         // defensa mínima de casillas contiguas a un bastión
      chargeBonus: 1,                         // bonus de carga de caballería
      shootDeg: 1, shootDegChisel: 2,         // degradación por disparo
      testudoMax: 2
    },

    deficit: { tombTurns: 3, martyrGrace: 2 },

    // --- parámetros de las doctrinas con gancho en el motor ---
    // Cada constante se lee desde engine.js; los tags viven en data.js (HF.DOCT).
    doctrine: {
      // B1.1.2 · PRAETORIAN_GUARD: Tier 4 (4/4), máximo de pretorianos por facción
      pretorianTier: 4, pretorianAtk: 4, pretorianDef: 4, pretorianMax: 1,
      // B2.1.1 · PARTHIAN_RETREAT: movimiento residual para retroceder un hexágono
      parthianRetreatMv: 1,
      // B3.2.1 · AMBUSH_CAMOUFLAGE: ataque extra al golpear desde un bosque
      ambushBonus: 2,
      // B3.2.2 · VANGUARD_SACRIFICE: ataque que pierde el agresor al matar un recluta
      vanguardDebuff: 1,
      // B3.3.1 · WALL_EMBRASURES: degradación que aplica un bastión al disparar
      wallEmbrasuresDeg: 1,
      // B3.3.3 · LAST_STAND_FORT: defensa de la ciudad durante el turno del último bastión
      lastStandDef: 1,
      // A3.3.2 · SCORCHED_EARTH: turnos que la casilla abandonada queda en cenizas
      scorchedTurns: 4,
      // B3.1.3 · PHOSPHORUS_FIRE: turnos que arde el bosque incendiado
      phosphorusBurn: 2,
      // B3.2.2 · CALTROP_SNARE: coste de colocar la trampa y turnos de la tumba resultante
      caltropCost: { gold: 5 }, caltropTomb: 3,
      // A3.1.2 · PACKABLE_YURTS: madera devuelta al empacar el campamento
      packRefund: 15,
      // C3.1.1 · HOSTILE_TAKEOVER: oro del soborno de un pueblo/bastión enemigo
      takeoverCost: { gold: 40 },
      // C2.1.1 · PYRAMID_STAND_15T: coste de la pirámide y turnos que debe resistir
      wonderCost: { gold: 150 }, wonderStandTurns: 15,
      // C3.2.1 · INDUCED_BANKRUPTCY: tropas rivales muertas por cerco que dan la victoria
      inducedDeaths: 3
    },

    // condiciones de victoria por doctrina
    win: { survivalTurn: 50, gold: 500, hegemony: 0.75, goldenEra: 30, blitzTurn: 15 },

    // tamaños y biomas de mapa
    sizes: {
      small: { name: 'Pequeño', R: 7, minF: 2, maxF: 2 },
      medium: { name: 'Mediano', R: 12, minF: 2, maxF: 4 },
      large: { name: 'Enorme', R: 18, minF: 4, maxF: 6 }
    },
    biomes: {
      plains: { name: 'Llanuras', sea: .10, hill: .12, mtn: .05, tree: .12 },
      forest: { name: 'Bosques', sea: .10, hill: .15, mtn: .06, tree: .35 },
      archipelago: { name: 'Archipiélago', sea: .5, hill: .10, mtn: .04, tree: .12 },
      mountains: { name: 'Montañas', sea: .10, hill: .25, mtn: .15, tree: .12 }
    },

    // generación de recursos en el mapa
    mapgen: {
      wheatMoisture: .55, wheatChance: .5,
      goldHillChance: .25,
      woodChance: { LLANO: .14, COLINA: .2 },
      capitalRing: .62,                       // distancia de las capitales al centro (fracción del radio)
      guaranteed: { radius: 2, wheat: 2, wood: 2 },  // recursos garantizados cerca de cada capital
      archipelago: { minGap: .5, noise: .12 }  // separación mínima entre centros de isla (fracción del radio del mapa) y ruido de costa
    },

    // IA
    ai: {
      recruitPerTurn: 3, recruitPerTurnEasy: 1,
      archerEvery: 3, archerFromTurn: 4,      // cada N unidades intenta un arquero
      siegeEvery: 5, siegeFromTurn: 8,
      maxShips: 2, shipFromTurn: 3,           // barcos de transporte de la IA
      settlementsBase: 3, settlementsPerTurns: 10,
      foodReserve: 30
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
