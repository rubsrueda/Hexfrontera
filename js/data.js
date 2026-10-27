(function (G) {
  const HF = G.HF;

  // id|nombre|tag
  const RAW = `A1|Raíz Terrestre|CIV_TYPE_SEDENTARY
A1.1|Burocracia|GOV_BUREAUCRACY
A1.1.1|Integración Universal|INTEGRATION_PRESERVE
A1.1.2|Enclave de Explotación|EXTRACTIVE_ENCLAVE
A1.1.3|Sustitución Demográfica|SETTLER_PURGE
A1.2|Teocracia Monumental|GOV_THEOCRACY
A1.2.1|Devoción Fanática|ZEALOT_MARTYRDOM
A1.2.2|Herejía Inquisitorial|INQUISITION_PURITY
A1.2.3|Ascetismo Agrario|ASCETIC_COMMUNE
A1.3|Casta Feudal|GOV_FEUDAL_NOBILITY
A1.3.1|Servidumbre Hereditaria|SERFDOM_CHAIN
A1.3.2|Orden de Caballería|KNIGHTLY_ORDER
A1.3.3|Señorío Fortificado|FORTIFIED_ESTATE
A2|Flujo Oceánico|CIV_TYPE_THALASSOCRACY
A2.1|Talasocracia Mercantil|GOV_MARITIME_TRADE
A2.1.1|Rutas de la Seda Marina|SILK_SEA_ROUTE
A2.1.2|Monopolio Portuario|PORT_MONOPOLY
A2.1.3|Factoría Costera|COASTAL_FACTORY
A2.2|Asalto Corsario|GOV_CORSAIR_RAID
A2.2.1|Pillaje de Riberas|SHORE_PILLAGE
A2.2.2|Drakkars Temerarios|DRAKKAR_STRIKE
A2.2.3|Fuego de Ensenada|COVE_BLAZE
A2.3|Comunidades Anfibias|GOV_AMPHIBIOUS
A2.3.1|Marismas Sagradas|SACRED_SWAMP
A2.3.2|Flota Doméstica|HOME_FLOTILLA
A2.3.3|Aislamiento Isleño|ISLAND_SANCTUARY
A3|Dispersión Móvil|CIV_TYPE_NOMAD
A3.1|Clan Pastoril|GOV_PASTORAL_CLAN
A3.1.1|Trashumancia Estacional|SEASONAL_MIGRATION
A3.1.2|Yurtas Desmontables|PACKABLE_YURTS
A3.1.3|Rebaños Libres|WILD_HERDS
A3.2|Horda de Choque|GOV_HORDE_SHOCK
A3.2.1|Economía del Botín|BOOTY_ECONOMY
A3.2.2|Terror Psicológico|TERROR_DOCTRINE
A3.2.3|Tributo a Galope|TRIBUTE_RIDERS
A3.3|Guerrilla Silvana|GOV_FOREST_GUERRILLA
A3.3.1|Red de Guías|SCOUT_NETWORK
A3.3.2|Tierra Quemada|SCORCHED_EARTH
A3.3.3|Emboscada Fronteriza|BORDER_AMBUSH
B1|Fuerza Pesada|TACTIC_HEAVY_LINE
B1.1|Disciplina de Legión|MIL_LEGION_DISCIPLINE
B1.1.1|Testudo Impenetrable|TESTUDO_SHIELD
B1.1.2|Guardia de Élite|PRAETORIAN_GUARD
B1.1.3|Castramentación|CASTRAMETATION
B1.2|Enjambre de Leva|MIL_LEVY_SWARM
B1.2.1|Picas Comunales|PIKE_WALL
B1.2.2|Sacrificio de Vanguardia|VANGUARD_SACRIFICE
B1.2.3|Marea Campesina|PEASANT_TIDE
B1.3|Ingeniería de Sitio|MIL_SIEGE_ENGINEERING
B1.3.1|Balística Incendiaria|INCENDIARY_BALLISTICS
B1.3.2|Zapadores Minadores|MINING_SAPPERS
B1.3.3|Foso Circundante|CIRCUMVALLATION
B2|Guerra de Maniobra|TACTIC_MOBILE_WAR
B2.1|Hostigadores a Caballo|MIL_HORSE_ARCHERS
B2.1.1|Disparo Parto|PARTHIAN_RETREAT
B2.1.2|Lluvia de la Estepa|STEPPE_BARRAGE
B2.1.3|Círculo de Hostigamiento|CANTABRIAN_CIRCLE
B2.2|Choque Blindado|MIL_SHOCK_CAVALRY
B2.2.1|Lanzas Cataphractas|CATAPHRACT_LANCE
B2.2.2|Estampida de Guerra|WAR_STAMPEDE
B2.2.3|Persecución Implacable|PURSUIT_FRENZY
B2.3|Batidores Ligeros|MIL_LIGHT_SCOUTS
B2.3.1|Raid de Suministros|SUPPLY_RAID
B2.3.2|Fantasma de la Estepa|STEPPE_GHOST
B2.3.3|Retirada Fingida|FEIGNED_RETREAT
B3|Control de Zona|TACTIC_AREA_DENIAL
B3.1|Maestría Balística|MIL_BALLISTIC_MASTERY
B3.1.1|Fuego de Interdicción|OVERWATCH_INTERDICTION
B3.1.2|Flechas de Cincel|CHISEL_TIP_ARROWS
B3.1.3|Fuego de Fósforo|PHOSPHORUS_FIRE
B3.2|Guerra Oculta|MIL_SHADOW_WAR
B3.2.1|Camuflaje de Emboscada|AMBUSH_CAMOUFLAGE
B3.2.2|Abrojos y Trampas|CALTROP_SNARE
B3.2.3|Veneno Neurotóxico|NEUROTOXIC_VENOM
B3.3|Guarnición Inmóvil|MIL_STATIC_GARRISON
B3.3.1|Troneras de Muralla|WALL_EMBRASURES
B3.3.2|Alerta de Almenaras|BEACON_ALERT
B3.3.3|Último Bastión|LAST_STAND_FORT
C1|Dominación Total|VICTORY_DOMINATION
C1.1|Guerra Relámpago|WIN_BLITZKRIEG
C1.1.1|Decapitación de Mando|DECAPITATION_STRIKE
C1.1.2|Colapso en Dominó|DOMINO_COLLAPSE
C1.1.3|Rendición por Shock|SHOCK_SURRENDER
C1.2|Guerra de Desgaste|WIN_ATTRITION_TOTAL
C1.2.1|Erradicación de Bastiones|BASTION_ERADICATION
C1.2.2|Asfixia de Trincheras|TRENCH_SUFFOCATION
C1.2.3|Rendición por Hambre|STARVATION_WIN
C1.3|Hegemonía Territorial|WIN_HEGEMONY_MAP
C1.3.1|Mancha Voraz|EXPANSION_VORACIOUS
C1.3.2|Cerco Geográfico|GEOGRAPHIC_RING
C1.3.3|Pax Imperialis|PAX_IMPERIALIS
C2|Trascendencia Magna|VICTORY_WONDER
C2.1|La Gran Obra|WIN_WONDER_BUILD
C2.1.1|Pirámide Eterna|PYRAMID_STAND_15T
C2.1.2|Torre del Saber|TOWER_OF_WISDOM
C2.1.3|Utopía Agraria|AGRARIAN_UTOPIA
C2.2|Hegemonía Cultural|WIN_CULTURAL_ABSORB
C2.2.1|El Gran Jubileo|JUBILEE_POINTS
C2.2.2|Peregrinación Sagrada|SACRED_PILGRIMAGE
C2.2.3|Faro Continental|CONTINENTAL_BEACON
C2.3|Resistencia de Tiempo|WIN_SURVIVAL_T50
C2.3.1|Bastión Inconmovible|UNSHAKABLE_KEEP
C2.3.2|La Edad Dorada|GOLDEN_ERA_STREAK
C2.3.3|Pacto de Concordia|CONCORDIA_TREATY
C3|Guerra Económica|VICTORY_FINANCIAL
C3.1|Banca Central|WIN_GOLD_ACCUMULATE
C3.1.1|OPA Hostil|HOSTILE_TAKEOVER
C3.1.2|Control Mercantil|MERCANTILE_CARTEL
C3.1.3|Burbuja Especulativa|DEBT_SPECULATION
C3.2|Estrangulamiento Logístico|WIN_LOGISTIC_CHOKE
C3.2.1|Bancarrota Inducida|INDUCED_BANKRUPTCY
C3.2.2|Bloqueo de Arterias|ARTERY_BLOCKADE
C3.2.3|Guerra de Corsarios|CORSAIR_DOMINANCE
C3.3|Tributo y Vasallaje|WIN_VASSALAGE_PACT
C3.3.1|Red de Extorsión|EXTORTION_NETWORK
C3.3.2|Embargo Total|BORDER_EMBARGO
C3.3.3|Protectorado Dorado|GOLDEN_PROTECTORATE`;

  HF.DOCT = {};
  for (const line of RAW.split('\n')) {
    const [id, name, tag] = line.split('|');
    HF.DOCT[id] = { id, name, tag, level: id.split('.').length, parent: id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null };
  }
  HF.PILLARS = [
    { key: 'alma', root: 'A', name: 'Alma', icon: '🕊️', q: '¿Cómo existes?' },
    { key: 'arma', root: 'B', name: 'Arma', icon: '⚔️', q: '¿Cómo luchas?' },
    { key: 'victoria', root: 'C', name: 'Victoria', icon: '👑', q: '¿Cómo ganas?' }
  ];
  HF.children = id => Object.values(HF.DOCT).filter(d => d.parent === id);
  HF.roots = letter => Object.values(HF.DOCT).filter(d => d.level === 1 && d.id[0] === letter);

  // Descripciones funcionales; las 18 doctrinas nuevas tienen su gancho en engine.js
  HF.IMPL = {
    Alma: {
      CIV_TYPE_SEDENTARY: 'Ciudades fijas. +3 oro por turno.',
      CIV_TYPE_NOMAD: 'Caballería sin penalización de colina y menor coste de mantenimiento.',
      EXTRACTIVE_ENCLAVE: 'Talar da +20 madera en lugar de +10.',
      ASCETIC_COMMUNE: 'Las fusiones solo llegan a nivel 2; -1 de mantenimiento en infantería e ingenieros.',
      ZEALOT_MARTYRDOM: 'Con déficit tienes 2 turnos de gracia, luego pierdes todas las unidades.',
      INTEGRATION_PRESERVE: 'Con déficit, las casillas conquistadas se rebelan.',
      SERFDOM_CHAIN: '-50% de madera en mejoras.',
      GOV_FEUDAL_NOBILITY: '-20% coste de infantería.',
      KNIGHTLY_ORDER: 'Caballería defensa 2 y mantenimiento x2.',
      // --- logística, entorno y asentamientos ---
      CIV_TYPE_THALASSOCRACY: 'Las unidades de tierra se hacen a la mar sin puerto ni barco: entrar en río o mar cuesta 1 paso y la unidad aún puede atacar.',
      SCOUT_NETWORK: 'Los ingenieros tienen +1 de movimiento y operan sin penalización en montañas y ríos.',
      SACRED_SWAMP: 'La unidad enemiga que entra en un río propio agota allí su turno: no puede moverse ni atacar más ese turno.',
      FORTIFIED_ESTATE: 'El bastión se erige al instante: no consume acción de unidad ni requiere esperar al turno siguiente.',
      PACKABLE_YURTS: 'Sobre un campamento propio la unidad puede Empacar: lo retira y devuelve 15 de madera para reubicarlo.',
      SCORCHED_EARTH: 'Al abandonar una casilla propia hacia territorio seguro, la casilla queda en cenizas 4 turnos: el enemigo no puede capturarla ni construir en ella.'
    },
    Arma: {
      TACTIC_HEAVY_LINE: 'Infantería con alcance 1; si parte de una ciudad o pueblo, alcance 3.',
      TACTIC_MOBILE_WAR: 'Caballería alcance 3 y sin penalización de colina.',
      TESTUDO_SHIELD: '+1 defensa por infantería o ingeniero adyacente (máx. 2).',
      PIKE_WALL: 'La caballería enemiga pierde su carga.',
      MIL_LEVY_SWARM: 'Infantería nivel 1 a mitad de coste.',
      CHISEL_TIP_ARROWS: 'Los arqueros degradan 2 de defensa.',
      // --- combate, tácticas y fusión ---
      PRAETORIAN_GUARD: 'Fusiona dos infanterías Tier 3 en un Pretoriano Tier 4 (4/4). Solo puede haber uno vivo por facción.',
      PARTHIAN_RETREAT: 'La caballería que ataca, a distancia o en combate, y sobrevive conserva 1 de movimiento para retroceder un hexágono si tiene una casilla propia libre al lado.',
      AMBUSH_CAMOUFLAGE: 'Atacar desde una casilla con bosque suma +2 al ataque de ese choque.',
      VANGUARD_SACRIFICE: 'Cuando un recluta Tier 1 propio muere defendiendo, el atacante enemigo sufre -1 de ataque hasta el final de ese turno.',
      WALL_EMBRASURES: 'Los bastiones disparan solos al primer enemigo que termina su movimiento a 2 casillas: le aplican 1 de degradación una vez por turno.',
      LAST_STAND_FORT: 'Una ciudad con guarnición absorbe el primer asalto que supere su defensa: la guarnición baja a Tier 1 y la ciudad defiende 1 durante ese turno.',
      PHOSPHORUS_FIRE: 'Los arqueros pueden incendiar bosques enemigos a su alcance: el árbol desaparece y la casilla arde 2 turnos como intransitable, expulsando a quien se oculte en ella.',
      CALTROP_SNARE: 'La infantería coloca una trampa invisible (5 oro) en una casilla neutra contigua; el primer enemigo que la pisa muere y deja una tumba.'
    },
    Victoria: {
      WIN_BLITZKRIEG: 'Ganas dominando; si pasa el turno 15 pierdes.',
      WIN_SURVIVAL_T50: 'Sobrevive hasta el turno 50.',
      WIN_GOLD_ACCUMULATE: 'Acumula 500 de oro.',
      WIN_HEGEMONY_MAP: 'Controla el 75% de la tierra.',
      GOLDEN_ERA_STREAK: 'Saldo positivo 30 turnos seguidos.',
      // --- condiciones de victoria y guerra económica ---
      PYRAMID_STAND_15T: 'Sobre un bastión propio se erige la Pirámide (150 oro). Si resiste intacta 15 turnos, la partida termina con victoria automática.',
      DECAPITATION_STRIKE: 'Capturar la capital (ciudad con cap) de un rival elimina al instante todas sus tropas restantes en el mapa.',
      HOSTILE_TAKEOVER: 'Con 40 de oro en la provincia conectada soborna un pueblo o bastión enemigo adyacente (nunca la capital): pasa a tu color sin combate.',
      INDUCED_BANKRUPTCY: 'Cada tropa rival que muere de hambruna o deserción estando aislada suma 1; al llegar a 3, victoria por asfixia financiera.'
    }
  };

  // Texto de catálogo (regla abierta de rules.md) para los nodos aún sin gancho de motor.
  // La UI muestra HF.IMPL (efecto real) cuando existe y cae a HF.CATALOG en el resto.
  HF.CATALOG = {
    GOV_BUREAUCRACY: "Cada 4 casillas conectadas a la capital dan +1 oro.",
    SETTLER_PURGE: "Las casillas propias son 100% inmunes a revueltas y cortes.",
    GOV_THEOCRACY: "Unidades dentro del territorio tienen +1 de defensa moral.",
    INQUISITION_PURITY: "Eliminar una unidad enemiga en tu tierra otorga +10 de oro.",
    GOV_MARITIME_TRADE: "Rutas comerciales de agua dan un +15% del oro global.",
    SILK_SEA_ROUTE: "Cada puerto conectado a otra ciudad da +3 de oro.",
    PORT_MONOPOLY: "Comprar barcos y puertos cuesta 30% menos.",
    COASTAL_FACTORY: "Se pueden fundar factorías en islas neutrales al instante.",
    GOV_CORSAIR_RAID: "Saquear una casilla costera roba el 100% de su producción.",
    SHORE_PILLAGE: "Desembarcar y quemar una granja otorga +15 de oro inmediato.",
    DRAKKAR_STRIKE: "Los barcos pueden atacar casillas de tierra a 1 hexágono.",
    COVE_BLAZE: "Prender fuego a un puerto enemigo bloquea su tesorería 1 turno.",
    GOV_AMPHIBIOUS: "Las marismas y pantanos cuentan como casillas de llanura fértil.",
    HOME_FLOTILLA: "Cada barco en tu costa genera +1 de comida y estabilidad.",
    ISLAND_SANCTUARY: "Ciudades en islas son inmunes a sabotajes y catapultas.",
    GOV_PASTORAL_CLAN: "Cada hexágono libre de árboles y estructuras da +1 comida.",
    SEASONAL_MIGRATION: "Mover el campamento a un nuevo bioma da +20 oro inmediato.",
    WILD_HERDS: "Los rebaños capturan automáticamente hexágonos neutrales adyacentes.",
    GOV_HORDE_SHOCK: "Cortar una línea de suministro otorga +5 de oro por casilla aislada.",
    BOOTY_ECONOMY: "El 80% de tus ingresos provienen de matar tropas rivales.",
    TERROR_DOCTRINE: "Capturar una capital enemiga hace huir a las tropas vecinas.",
    TRIBUTE_RIDERS: "Las facciones menores te pagan 2 oro/turno si no las atacas.",
    GOV_FOREST_GUERRILLA: "Las tropas son invisibles en bosques y colinas hasta atacar.",
    BORDER_AMBUSH: "Atacar desde un bosque ignora la defensa del rival.",
    MIL_LEGION_DISCIPLINE: "La infantería no sufre penalización al defender contra caballería.",
    CASTRAMETATION: "Unidades de infantería pueden erigir un fuerte provisional.",
    PEASANT_TIDE: "Puedes mover hasta 3 reclutas a una misma casilla para fusionar gratis.",
    MIL_SIEGE_ENGINEERING: "Las catapultas destruyen murallas y torres a 2 casillas de distancia.",
    INCENDIARY_BALLISTICS: "Los proyectiles prenden fuego a las granjas enemigas impactadas.",
    MINING_SAPPERS: "Ignora defensas de empalizada cruzando por debajo del hexágono.",
    CIRCUMVALLATION: "Rodear una ciudad enemiga bloquea todo su reclutamiento.",
    MIL_HORSE_ARCHERS: "Atacan a 2 casillas de distancia usando arcos ecuestres.",
    STEPPE_BARRAGE: "3 jinetes disparando a la misma casilla aniquilan la tropa enemiga.",
    CANTABRIAN_CIRCLE: "Los jinetes adyacentes a un enemigo le reducen la defensa a 0.",
    MIL_SHOCK_CAVALRY: "Carga frontal demoledora: Derriba unidades Tier 2 sin fusionar.",
    CATAPHRACT_LANCE: "La caballería pesada tiene Ataque 3 y Defensa 2.",
    WAR_STAMPEDE: "Empujan al defensor a la casilla trasera al atacarlo.",
    PURSUIT_FRENZY: "Si derrotan a una tropa, avanzan inmediatamente a su casilla gratis.",
    MIL_LIGHT_SCOUTS: "Ignoran la niebla de guerra: ven a 3 hexágonos de distancia.",
    SUPPLY_RAID: "Cortar una línea enemiga paraliza el movimiento rival 1 turno.",
    STEPPE_GHOST: "El explorador no puede ser atacado si tiene un hexágono libre de huida.",
    FEIGNED_RETREAT: "Atraen a la tropa enemiga hacia adelante forzando su movimiento.",
    TACTIC_AREA_DENIAL: "Los arqueros proyectan una zona de amenaza de 2 hexágonos.",
    MIL_BALLISTIC_MASTERY: "El alcance de arqueros aumenta a 3 casillas desde colinas.",
    OVERWATCH_INTERDICTION: "Disparan automáticamente en el turno del rival si este entra a su rango.",
    MIL_SHADOW_WAR: "Las unidades aliadas son invisibles en su propio territorio.",
    NEUROTOXIC_VENOM: "Las unidades enemigas heridas pierden 1 tier al final de su turno.",
    MIL_STATIC_GARRISON: "Las torres y empalizadas duplican su resistencia pasiva.",
    BEACON_ALERT: "Revela el mapa completo alrededor de las torres en un radio de 4.",
    VICTORY_DOMINATION: "Conquistar capitales enemigas es el objetivo prioritario.",
    DOMINO_COLLAPSE: "Capturar una ciudad hace que las granjas vecinas se rindan solas.",
    SHOCK_SURRENDER: "Si destruyes 3 tropas enemigas en un turno, el rival cede 2 casillas.",
    WIN_ATTRITION_TOTAL: "Ganas al destruir el 100% de los cuarteles y tropas enemigas.",
    BASTION_ERADICATION: "Demoler todas las torres enemigas activa la victoria inmediata.",
    TRENCH_SUFFOCATION: "Reducir el territorio enemigo a <5 casillas gana la partida.",
    STARVATION_WIN: "Si el rival sufre bancarrota 2 turnos seguidos, ganas la partida.",
    EXPANSION_VORACIOUS: "Capturar una casilla neutra es gratis (no consume oro).",
    GEOGRAPHIC_RING: "Rodear completamente el territorio enemigo activa la victoria.",
    PAX_IMPERIALIS: "Tras alcanzar el 60% del mapa, empieza una cuenta atrás de 10 turnos.",
    VICTORY_WONDER: "Ganas construyendo y protegiendo un Monumento Histórico.",
    WIN_WONDER_BUILD: "Desbloquea la construcción de la Maravilla (150 oro, 4 casillas).",
    TOWER_OF_WISDOM: "Se construye en una sola casilla; acelera tecnologías al máximo.",
    AGRARIAN_UTOPIA: "Ganas al alcanzar 10 Granjas de Nivel 3 contiguas e intactas.",
    WIN_CULTURAL_ABSORB: "Ganas si tu influencia territorial absorbe la capital enemiga.",
    JUBILEE_POINTS: "Generas puntos de cultura por cada turno con la tesorería llena.",
    SACRED_PILGRIMAGE: "Los enemigos que pisen tu templo se vuelven neutrales pacifistas.",
    CONTINENTAL_BEACON: "El faro revela el mapa entero; si dura 20 turnos ganas la partida.",
    UNSHAKABLE_KEEP: "La capital resiste cualquier ataque si tiene al menos 1 granja viva.",
    CONCORDIA_TREATY: "Ofreces oro a los rivales; si mantienes la paz 20 turnos, ganas.",
    VICTORY_FINANCIAL: "Ganas quebrando la tesorería rival o monopolizando el oro.",
    MERCANTILE_CARTEL: "Controlar todos los nodos de comercio del mapa gana la partida.",
    DEBT_SPECULATION: "Prestas oro a los rivales; si no pagan con intereses en 5 turnos, ganas.",
    WIN_LOGISTIC_CHOKE: "Ganas si el 70% del territorio enemigo entra en estado AISLADO.",
    ARTERY_BLOCKADE: "Bloquear los 3 caminos principales del rival durante 5 turnos gana.",
    CORSAIR_DOMINANCE: "Saquear todos los convoyes marítimos del rival gana la partida.",
    WIN_VASSALAGE_PACT: "Obligar al enemigo a firmar un pacto de tributo gana la partida.",
    EXTORTION_NETWORK: "Exiges la mitad del ingreso del rival si tienes mayor ejército.",
    BORDER_EMBARGO: "Prohíbes al rival construir granjas si controlas sus fronteras.",
    GOLDEN_PROTECTORATE: "Pagas el mantenimiento del rival a cambio de que no pueda atacar."
  };

  // Nodos intermedios que llevan a una doctrina con efecto real.
  HF.ROUTE = {};
  for (const pillar of Object.keys(HF.IMPL)) {
    for (const tag of Object.keys(HF.IMPL[pillar])) {
      let d = Object.values(HF.DOCT).find(x => x.tag === tag);
      while (d && d.parent) { const p = HF.DOCT[d.parent]; if (!p) break; HF.ROUTE[p.tag] = 1; d = p; }
    }
  }
  HF.doctrineInfo = (pillar, d) => {
    const eff = HF.IMPL[pillar] && HF.IMPL[pillar][d.tag];
    if (eff) return { status: 'on', text: eff };
    return { status: HF.ROUTE[d.tag] ? 'route' : 'catalog', text: HF.CATALOG[d.tag] || '' };
  };

  HF.defaultTribe = () => ({
    tribe_id: 'local', name: 'Mi Tribu', color: '#3b82f6', crest: '🦅',
    alma_path: ['A1', 'A1.1', 'A1.1.1'], arma_path: ['B1', 'B1.1', 'B1.1.1'], victoria_path: ['C1', 'C1.3', 'C1.3.1'],
    active_rules: []
  });
  HF.compileTribe = t => {
    t.active_rules = [...t.alma_path, ...t.arma_path, ...t.victoria_path].map(id => HF.DOCT[id].tag);
    return t;
  };
  HF.validPath = (p, letter) => Array.isArray(p) && p.length === 3 && p.every((id, i) => HF.DOCT[id] && HF.DOCT[id].level === i + 1 && id[0] === letter && (i === 0 || HF.DOCT[id].parent === p[i - 1]));
  HF.validateProfile = t => {
    if (t && HF.validPath(t.alma_path, 'A') && HF.validPath(t.arma_path, 'B') && HF.validPath(t.victoria_path, 'C') && /^#[0-9a-f]{6}$/i.test(t.color || '')) return HF.compileTribe(t);
    console.warn('[WARN] Perfil de tribu corrupto. Restaurando valores seguros de fábrica');
    return HF.compileTribe(HF.defaultTribe());
  };
  HF.loadTribe = () => {
    const p = HF.store.get('tribe_profile', null);
    return p ? HF.validateProfile(p) : HF.compileTribe(HF.defaultTribe());
  };
  HF.PRESETS = [
    ['A1', 'A1.1', 'A1.1.2', 'B1', 'B1.1', 'B1.1.1', 'C1', 'C1.3', 'C1.3.1'],
    ['A3', 'A3.2', 'A3.2.1', 'B2', 'B2.2', 'B2.2.1', 'C1', 'C1.1', 'C1.1.1'],
    ['A1', 'A1.3', 'A1.3.2', 'B3', 'B3.1', 'B3.1.2', 'C2', 'C2.1', 'C2.1.1'],
    ['A1', 'A1.2', 'A1.2.3', 'B1', 'B1.2', 'B1.2.1', 'C3', 'C3.1', 'C3.1.2'],
    ['A3', 'A3.1', 'A3.1.1', 'B2', 'B2.1', 'B2.1.1', 'C2', 'C2.3', 'C2.3.2']
  ].map(a => ({ alma_path: a.slice(0, 3), arma_path: a.slice(3, 6), victoria_path: a.slice(6) }));

  HF.COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#f97316'];
  HF.CRESTS = ['🦅', '🐺', '🐻', '🦁', '🐉', '🦂', '🐗', '🦌', '⚓', '☀️', '🌙', '💀'];
  HF.AI_NAMES = ['Rojos', 'Verdes', 'Dorados', 'Violetas', 'Naranjas'];

  HF.T = { LLANO: 0, COLINA: 1, MONTANA: 2, RIO: 3, MAR: 4 };
  HF.TNAME = ['Llano', 'Colina', 'Montaña', 'Río', 'Mar'];
  HF.RES = { NINGUNO: 0, ORO: 1, TRIGO: 2, MADERA: 3 };
  HF.B = { NINGUNO: 0, ARBOL: 1, CAMINO: 2, CAMPAMENTO: 3, PUEBLO: 4, CIUDAD: 5, BASTION: 6 };
  HF.BNAME = ['', 'Árbol', 'Camino', 'Campamento', 'Pueblo', 'Ciudad', 'Bastión'];
  HF.BICON = ['', '🌲', '🛤', '⛺', '🏠', '🏙', '🏰'];
  // los valores numéricos se definen en config.js
  const CFG = HF.CFG;
  HF.BLEVEL = CFG.buildingLevel;
  HF.RANK = CFG.buildingRank;
  HF.BDEF = CFG.buildingDef;
  HF.PROD = CFG.buildingProd;
  HF.UNITS = CFG.units;
  HF.BCOST = CFG.buildingCost;
  HF.SIZES = CFG.sizes;
  HF.BIOMES = CFG.biomes;
})(typeof window !== 'undefined' ? window : globalThis);
