/* HEXFRONTIER · parámetros de juego.
   Todos los números de equilibrio viven aquí; el motor, el generador de mapas
   y la IA solo leen de HF.CFG. Edita este archivo para reajustar el juego. */
(function (G) {
  const HF = G.HF = G.HF || {};
  HF.CFG = {
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
    treeSpreadChance: 0.05,                   // por árbol y vecino libre (llano/colina, sin edificio ni unidad) cada ronda

    // unidades: coste, mantenimiento por turno según nivel (up = comida, upGold = oro), edificios de origen,
    // movimiento (casillas propias) y rango de ataque
    units: {
      INF: { name: 'Infantería', icon: '💂', cost: { gold: 10, food: 5 }, up: [1, 3, 6], upGold: [1, 2, 4], from: [3, 4, 5, 6], move: 4, moveHeavy: 1, atkRange: 1, def: 0 },
      ARC: { name: 'Arquero', icon: '🏹', cost: { gold: 15, wood: 5 }, up: [2, 3, 5], upGold: [1, 2, 3], from: [4, 5, 6], move: 4, atkRange: 1, atk: 1, def: 0, shoot: 2, shootHill: 3 },
      CAB: { name: 'Caballería', icon: '♞', cost: { gold: 20, food: 10 }, up: [3, 5, 7], upGold: [2, 4, 6], from: [5], move: 6, atkRange: 2, atkRangeMobile: 3, atk: 2, def: 1, defKnight: 2 },
      SIE: { name: 'Asedio', icon: '💣', cost: { gold: 25, wood: 15, food: 10 }, up: [3, 5, 7], upGold: [2, 3, 5], from: [4, 5, 6], move: 2, atkRange: 1, atk: 1, def: 0, shoot: 2 },
      BAR: { name: 'Barco', icon: '⛵', cost: { gold: 30, wood: 25 }, up: [2, 3, 5], upGold: [1, 2, 3], from: [3, 4, 5, 6], naval: true, move: 5, atk: 2, def: 1, shoot: 2 }
    },
    mountainUnits: ['INF', 'ARC'],           // unidades terrestres que pueden entrar en montaña
    recruitRadius: 3,                         // casillas máximas desde un edificio de origen
    fuseMax: 3, fuseMaxAscetic: 2,            // nivel máximo al fusionar
    fuseTypes: ['INF', 'ARC', 'CAB', 'SIE', 'BAR'],  // tipos de unidad fusionables (cada nivel extra suma +1 ataque y +1 defensa en las no-infantería)
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
