/* FEDERATI · parámetros de juego.
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
    // Enlaces para compartir mapas y repeticiones.
    // `base` = URL pública donde está publicado el juego. Si se deja vacía se
    // usa el origen actual solo cuando es accesible desde otros dispositivos;
    // en file://, app:// o localhost no hay enlace y se comparte el CÓDIGO del
    // mapa/repetición (que sí funciona en cualquier equipo).
    // `legacy` = dominios antiguos: si un dispositivo los tiene guardados como
    // "dirección pública", se migran solos a `base` para no compartir enlaces
    // muertos (ver HF.migrateShareBase en js/util.js).
    share: {
      base: 'https://federati.org/',
      legacy: ['https://rubsrueda.github.io/Hexfrontera/']
    },
    // Endurecimiento del cliente (js/security.js) y de la nube
    // (sql/security_hardening.sql).
    //   allowedHosts: dominios donde el juego puede usar los servicios en línea.
    //     En cualquier otro host el juego sigue jugable en local, pero se corta
    //     la nube (clon/hotlink). file://, app:// y localhost siempre se permiten.
    //   hardBlock: true = además muestra una pantalla de bloqueo en dominios ajenos.
    //   strictServerValidation: true = las puntuaciones, votos y licencia se
    //     piden a las RPC validadas; si aún no están desplegadas, se degrada a la
    //     ruta antigua para no romper el juego.
    security: {
      allowedHosts: ['federati.org', 'www.federati.org', 'rubsrueda.github.io'],
      hardBlock: false,
      strictServerValidation: true
    },
    // Comentarios de los jugadores (js/feedback.js). Rellena `accessKey` con la
    // clave de Web3Forms (https://web3forms.com) para recibirlos por correo.
    // Si se deja vacía, el formulario sigue funcionando y los comentarios se
    // guardan en el dispositivo hasta configurar el buzón. `endpoint` permite
    // usar un servicio propio compatible.
    feedback: {
      accessKey: '32df175e-b0c6-4395-8811-672297a41896',
      endpoint: 'https://api.web3forms.com/submit',
      subject: 'Hexfrontier · comentario de jugador'
    },
    // Encuestas dinámicas (js/event-feedback.js + sql/event_feedback.sql).
    //   enabled:        false apaga el módulo sin tocar la base de datos.
    //   dismissDays:    días de enfriamiento tras pulsar «Ahora no».
    //   waitForIdleMs:  espera máxima a que se cierre el modal de fin de
    //                   partida antes de mostrar la encuesta.
    eventFeedback: {
      enabled: true,
      dismissDays: 3,
      waitForIdleMs: 45000
    },
    // Licencia completa (Ajustes → Cuenta y licencia).
    // En la WEB el pago es con PayPal: pago único de 4.99 USD. El botón oficial
    // lo monta js/payment.js y las órdenes se crean/capturan en la Edge
    // Function `paypal` (supabase/functions/paypal). El Client ID es PÚBLICO;
    // el Secret vive sólo en el entorno seguro de Supabase.
    // `checkout` / `checkoutPromo` son enlaces de tienda para las versiones de
    // escritorio/móvil (Steam, Google Play, etc.). Si se dejan vacíos, el
    // proceso es manual: el jugador envía su solicitud desde Ajustes con su ID
    // y su correo, y el autor activa la licencia en Supabase. El cliente nunca
    // activa premium por su cuenta: la verdad está en el servidor.
    // `promo: true` muestra el precio de bienvenida de las tiendas.
    payment: {
      checkout: '',
      checkoutPromo: '',
      promo: false,
      paypal: {
        // Client ID PÚBLICO. Ahora apunta al sandbox; para producción cambia
        // este valor por el live y sigue supabase/README.md §6.
        // Sandbox: https://developer.paypal.com/dashboard/applications/sandbox
        clientId: 'BAAzMca-gFwyI_OCBTq3saM218wESAcqIxXMeHU8wd5hAaBUzhHCxpHvFF3zUFzOoOluVHgbsQjM0CztUo',
        currency: 'USD',
        amount: '4.99',
        enabled: true
      }
    },
    // Música clásica dinámica (js/music.js). enabled:false deja el sintetizador
    // procedural de util.js, útil para builds 100% offline.
    music: { enabled: true, volume: 0.3, fade: 1.8, warRadius: 2 },
    // Relato áudio das repeticións (js/replay-caster.js).
    //   enabled: false apaga o comentarista (o visor segue funcionando).
    //   engine: 'auto' usa `endpoint` se está definido; 'speech' forza a Web
    //     Speech API; 'remote' usa o gateway de audio.
    //   endpoint: URL que recibe POST {text, lang, style:'commentator'} e
    //     devolve audio/mpeg (ou {url}). Sen endpoint, Web Speech API.
    //   voice: nome de voz do sistema (opcional).
    //   rate/pitch: intensidade do comentarista (0.5–2).
    replayCaster: {
      enabled: true,
      engine: 'auto',
      endpoint: '',
      voice: '',
      rate: 1.12,
      pitch: 1.18
    },
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
    buildingProd: {     
    // [Gold, Food] per turn
    3: [1, 1],   // Camp
    4: [2, 2],   // Village
    5: [4, 4],   // City
    6: [3, 3],   // Bastion
    },
    // producción extra del recurso de la casilla según el edificio construido encima
    // (se suma al rendimiento base del recurso: camino 0, campamento +1, pueblo +2, bastión +2, ciudad +3)
    buildingResBonus: { 2: 1, 3: 2, 4: 3, 6: 4, 5: 5 },
    // defensa que aporta un edificio
    buildingDef: { 3: 1, 4: 1, 5: 2, 6: 3 },
    // nivel de evolución: un edificio solo puede sustituirse por uno de nivel superior
    buildingLevel: { 0: 0, 1: 0, 2: 1, 3: 2, 4: 3, 6: 4, 5: 5 },
    buildingRank: { 3: 1, 4: 2, 6: 3, 5: 4 },
    buildingCost: {
      2: { wood: 10 }, 3: { wood: 15, food: 15, gold: 15  }, 4: { wood: 25, food: 25, gold: 25 },
      5: { wood: 60, food: 60, gold: 60 }, 6: { wood: 30, food: 30, gold: 30 }
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
    // Peligro ambiental: tormentas en alta mar.
    //   spawnChance   probabilidad por ronda de que nazca una tormenta nueva
    //   max           tormentas vivas a la vez
    //   minLife/maxLife  duración en turnos (se sortea entre ambos)
    //   minCoastDist  sólo nacen a >= 2 anillos de la costa (mar abierto)
    //   lethalCoastDist  a partir de aquí (>= 2) la tormenta hunde al barco;
    //                 en distancia <= 1 el barco se resguarda en la costa
    //   minGap        separación mínima entre tormentas (hexágonos)
    storm: {
      enabled: true,
      spawnChance: 0.35,
      max: 3,
      minLife: 3,
      maxLife: 6,
      minCoastDist: 2,
      lethalCoastDist: 2,
      minGap: 2
    },
    commerce: {
      maxRoutes: 3,        // rutas terrestres (parejas más lejanas por calzada)
      maxSeaRoutes: 3,     // rutas marítimas (parejas más lejanas por agua)
      caravanSpeed: 4,     // casillas que avanza la caravana por turno
      caravanGold: 5,      // oro que devenga por turno (se entrega al llegar)
      blockTurns: 2        // rondas que queda rota la ruta tras un saqueo
    },
    loan: { amount: 50, perTurn: 6, turns: 10 }, // +50 oro, -6/turno durante 10 turnos
    // Banca de la capital: precio = (producción oro / producción recurso) * fee.
    bank: { fee: 1.1 },
    barks: { chance: 0.5, life: 2 },          // probabilidad y duración de las burbujas de tropa
    // Diálogos vivos entre unidades y edificios (js/banter.js).
    banter: {
      idle: 13,           // segundos sin tocar la pantalla → chisme de la tropa
      cooldown: 6,        // segundos mínimos entre conversaciones
      perTurn: 1,         // conversaciones máximas por turno
      delay: 16.4,         // retardo entre pregunta y respuesta (Call & Response)
      life: 12.4,          // duración de una burbuja normal
      interruptLife: 1.2, // duración de "¡A callar!"
      enemyChance: .45,   // duelo al quedar adyacente a un enemigo
      allyChance: .45,    // rencilla al quedar adyacente a un aliado de otro cuerpo
      buildingChance: .45, // probabilidad de que un edificio suelte su frase
      ambientStart: 2.2,  // primera charla ambiental tras abrir el tablero
      ambientEvery: 15,    // cada cuánto se comprueba si toca otra charla
      ambientGap: 30       // silencio tras terminar una conversación
    },
    ambience: { maxParticles: 25, clouds: 3, fps: 15 }, // límites del tablero animado

    // unidades: coste, mantenimiento por turno según nivel (up = comida, upGold = oro), edificios de origen,
    // movimiento (casillas propias) y rango de ataque
    units: {
      // Mantenimiento exponencial diferenciado: N1 accesible, N2 inversión, N3 joya.
      // Comida refleja el consumo biológico/logístico; oro refleja equipamiento y salarios.
      // INF: base del imperio. ENG: misma comida que INF, +oro técnico. ARC: oro elevado (munición).
      // CAB: el mayor devorador de grano. SIE: el mayor pozo de oro. BAR: tripulaciones navales.

     INF: {
       name: 'Infantería', icon: '💂',
       cost: { gold: 10, food: 10 },
       up: [2, 6, 18], upGold: [2, 6, 18],
       from: [3, 4, 5, 6], move: 3, moveHeavy: 1, atkRange: 1, def: 0
     },
     ENG: {
       name: 'Ingeniero', icon: '🔧',
       cost: { gold: 25, food: 10, wood: 10 },
       up: [2, 6, 18], upGold: [2, 6, 18],
       from: [3, 4, 5, 6], move: 2, moveHeavy: 1, atkRange: 0, def: 0
     },
     ARC: {
       name: 'Arquero', icon: '🏹',
       cost: { gold: 20, wood: 10 },
       up: [2, 6, 18], upGold: [2, 6, 18],
       from: [4, 5, 6], move: 3, atkRange: 1, atk: 1, def: 0, shoot: 2, shootHill: 3
     },
     CAB: {
       name: 'Caballería', icon: '♞',
       cost: { gold: 30, food: 30 },
       up: [3, 9, 27], upGold: [3, 9, 27],
       from: [5], move: 6, atkRange: 2, atkRangeMobile: 3, atk: 2, def: 1, defKnight: 2
     },
     SIE: {
       name: 'Asedio', icon: '💣',
       cost: { gold: 50, wood: 50, food: 30 },
       up: [3, 9, 27], upGold: [3, 9, 27],
       from: [4, 5, 6], move: 2, atkRange: 1, atk: 1, def: 0, shoot: 2, shootHill: 3
     },
     BAR: {
       name: 'Barco', icon: '⛵',
       cost: { gold: 60, wood: 60 },
       up: [3, 9, 27], upGold: [3, 9, 27],
       from: [3, 4, 5, 6], naval: true, move: 5, atk: 2, def: 1, shoot: 2
     }
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

    deficit: { tombTurns: 3, martyrGrace: 2, commission: 0.5 },
    // Tumba de una unidad propia: al pisarla se consume y hay un 5% de que
    // ocurra algo (recuperar la unidad, recursos, edificio ≤ bastión o nada).
    tomb: { chance: 0.05, recover: 0.35, resources: 0.35, building: 0.2 },

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

    // DIPLOMACIA — Pacto Sagrado / Frontalidad Logística
    diplomacy: {
      // Pacto Sagrado (NAP)
      nap: {
        minDuration: 5, maxDuration: 30, breakPenalty: 0,        // 0 = SAGRADO
        borderLockDefault: true, visionSharingDefault: false,
        renewalGracePeriod: 3
      },
      // Acuerdos Comerciales
      trade: {
        maxRoutesPerTreaty: 3, routeInterdictionLoss: 0.5,
        routeSetupCost: 10, minRouteValue: 2
      },
      // Préstamos / Banca
      loans: {
        baseInterestRate: 0.10, maxInterestRate: 0.50,
        creditScoreImpact: { onTimePayment: +1, latePayment: -5, default: -20, earlyRepayment: +3 },
        collateralTypes: ['trade_route', 'city_income', 'unit_production'],
        defaultSeizureRate: 0.30, maxActiveLoansPerFaction: 3
      },
      // Confianza / Reputación
      trust: {
        baseTrust: 50, decayPerTurn: 1,
        napBreakPenalty: 50, loanDefaultPenalty: 30,
        tradeBetrayalPenalty: 20, warDeclarationPenalty: 15, giftBonus: 5
      },
      // IA Diplomacia
      ai: {
        napUrgencyThreshold: 2, loanDesperationThreshold: -20,
        tradeAsymmetryThreshold: 2.0,
        maxNAPDurationVsThreat: { low: 25, medium: 15, high: 8 }
      }
    },

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
