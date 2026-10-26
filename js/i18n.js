(function (G) {
  const HF = G.HF = G.HF || {};
  HF.LOCALES = {
    es: {
      HUB_TITLE: 'HEXFRONTIER',
      HUB_SUBTITLE: 'Estrategia hexagonal por turnos',
      BTN_CONTINUE: '▶ Continuar',
      BTN_CAMPAIGN: '⚔️ Campaña',
      BTN_NEW_GAME: '🎲 Nueva partida',
      BTN_ONLINE: '🌐 En línea',
      BTN_DAILY: '🏆 Diario',
      BTN_NEWS: '📢',
      DOCK_TRIBE: 'Tribu',
      DOCK_MAPS: 'Mapas',
      DOCK_STATS: 'Stats',
      DOCK_SETTINGS: 'Ajustes',
      DOCK_WIKI: 'Códice',
      SETTINGS: 'Ajustes',
      SOUND: '🔊 Sonido',
      VIBRATE: '📳 Vibración',
      GRID: '▦ Rejilla del mapa',
      LANGUAGE: '🌐 Idioma',
      RESET: '🗑 Borrar todos los datos',
      RESET_CONFIRM: '¿Borrar todos los datos locales?',
      LOCAL_DATA: 'Todos los datos se guardan localmente en este dispositivo.',
      GAME_BUILD: 'Construir',
      GAME_RECRUIT: 'Reclutar',
      GAME_UNDO: 'Deshacer',
      GAME_END: 'Fin turno',
      GAME_MENU: 'Pausa',
      GAME_CONTINUE: '▶ Continuar',
      GAME_CENTER: '⌖ Centrar mapa',
      GAME_SAVE_EXIT: '💾 Guardar y salir',
      GAME_ABANDON: '🏳 Abandonar',
      GAME_CODEX: '📖 Códice',
      VIEW_NORMAL: 'Normal',
      VIEW_COMBAT: 'Combate',
      VIEW_POLITIC: 'Político',
      VIEW_RESOURCE: 'Recursos',
      CODEX_TITLE: '📖 Códice Táctico',
      CODEX_INTRO: 'Consulta las reglas principales sin salir de la partida.',
      CODEX_TAB_LAYERS: '🗺️ Las 6 capas',
      CODEX_TAB_COMBAT: '⚔️ Combate y Tiers',
      CODEX_TAB_SUPPLY: '🔗 Suministro',
      CODEX_TAB_SETTLEMENTS: '🏙️ Asentamientos',
      CODEX_TAB_CREDO: '🕊️ Credo',
      CODEX_LAYERS: '<p>Cada hexágono es una ficha con seis capas:</p><ul><li><b>1 · Terreno:</b> llano, colina, montaña, río o mar. Define el movimiento y parte de la defensa.</li><li><b>2 · Recursos:</b> oro, trigo o madera; alimentan provincias y economía.</li><li><b>3 · Asentamientos:</b> árbol, camino, campamento, pueblo, ciudad o bastión.</li><li><b>4 · Soberanía:</b> el dueño de la casilla y su provincia de suministro.</li><li><b>5 · Capitales:</b> el centro político de cada facción; perderlas elimina.</li><li><b>6 · Unidades y tumbas:</b> ejércitos, niveles, carga naval y restos de batalla.</li></ul><p class="dim small">La vista <b>Político</b> resalta la capa 4; la vista <b>Recursos</b>, la capa 2; la vista <b>Combate</b>, la capa 6.</p>',
      CODEX_COMBAT: '<p>El combate es determinista: <b>A &gt; D</b>. Si el ataque supera la defensa, la casilla cae; si no, el ataque se rechaza.</p><ul><li><b>Tiers:</b> una unidad N1 puede fusionarse con otra N1 para crear N2. N3 es élite; el Pretoriano es N4.</li><li><b>Defensa:</b> suma la base de la unidad, el terreno de infantería y el edificio. Las unidades aliadas y el aura de bastión <b>no suman</b>: prevalece el valor más alto.</li><li><b>Zona de control:</b> las unidades adyacentes protegen con su defensa; los bastiones proyectan un aura defensiva.</li><li><b>Roles:</b> los arqueros degradan defensas, el asedio castiga edificios vacíos y los barcos transportan tropas.</li></ul><p class="dim small">En la vista <b>Combate</b>, toca una unidad para ver su nivel y el desglose exacto de su defensa.</p>',
      CODEX_SUPPLY: '<p>Una provincia vive si conserva una línea terrestre hasta un asentamiento propio. Si la línea se corta, sus casillas quedan <b>AISLADO</b>.</p><ul><li>Sin suministro no se recaudan recursos ni se recluta.</li><li>El déficit de comida u oro provoca deserción escalonada: primero las unidades más caras.</li><li>Los cortes de suministro enemigo también generan aislamiento y son una vía de victoria.</li></ul><p class="dim small">Los números de suministro se recalculan al mover, capturar, construir o empacar.</p>',
      CODEX_SETTLEMENTS: '<p>La progresión civil es <b>Campamento → Pueblo / Bastión → Ciudad</b>.</p><ul><li><b>Campamento:</b> primera base y refugio de provincia.</li><li><b>Pueblo:</b> punto comercial y de reclutamiento.</li><li><b>Ciudad:</b> capital provincial; defensa y crecimiento.</li><li><b>Bastión:</b> fortaleza; proyecta aura defensiva y puede albergar el monumento.</li><li>Los <b>caminos</b> multiplican el movimiento y conectan rutas comerciales.</li></ul><p class="dim small">Los recursos de la capa 2 se recogen en el radio de la provincia; las rutas comerciales pagan en sus dos extremos.</p>',
      CODEX_CREDO: '<p>El credo de tu tribu se elige en tres niveles: <b>Alma</b>, <b>Arma</b> y <b>Victoria</b>.</p><ul><li>Cada nivel desbloquea una doctrina pasiva que cambia economía, combate o logística.</li><li>Las doctrinas se combinan; no hay una build única correcta.</li><li>Puedes editar el credo desde la pantalla <b>Tribu</b> antes de empezar.</li></ul><p class="dim small">Las doctrinas «En juego» modifican el motor; las de catálogo son diseño futuro y no fingen estar activas.</p>',
      EDITOR_TITLE: 'Editor de mapas',
      EDITOR_SIZE: 'Tamaño',
      EDITOR_RANDOM: '🎲 Aleatorio',
      EDITOR_CLEAR: '🧹 Vaciar',
      EDITOR_EXPORT: '📤 Exportar',
      EDITOR_IMPORT: '📥 Importar',
      EDITOR_SAVE: '💾 Guardar',
      EDITOR_LOAD: '📂 Abrir',
      EDITOR_PLAY: '▶ Probar',
      REPLAY_TITLE: '🎬 Repetición Táctica',
      REPLAY_EXIT: '✖ Salir',
      REPLAY_TURN: 'Turno',
      REPLAY_ACTION: 'Acción',
      YES: 'Sí',
      NO: 'No',
      CLOSE: 'Cerrar',
      COMING_SOON: 'próximamente',
      NO_MULTIPLAYER: 'sin multijugador'
    },
    en: {
      HUB_TITLE: 'HEXFRONTIER',
      HUB_SUBTITLE: 'Turn-based Hexagonal Strategy',
      BTN_CONTINUE: '▶ Continue',
      BTN_CAMPAIGN: '⚔️ Campaign',
      BTN_NEW_GAME: '🎲 New Game',
      BTN_ONLINE: '🌐 Online',
      BTN_DAILY: '🏆 Daily',
      BTN_NEWS: '📢',
      DOCK_TRIBE: 'Tribe',
      DOCK_MAPS: 'Maps',
      DOCK_STATS: 'Stats',
      DOCK_SETTINGS: 'Settings',
      DOCK_WIKI: 'Codex',
      SETTINGS: 'Settings',
      SOUND: '🔊 Sound',
      VIBRATE: '📳 Vibration',
      GRID: '▦ Map grid',
      LANGUAGE: '🌐 Language',
      RESET: '🗑 Delete all data',
      RESET_CONFIRM: 'Delete all local data?',
      LOCAL_DATA: 'All data is stored locally on this device.',
      GAME_BUILD: 'Build',
      GAME_RECRUIT: 'Recruit',
      GAME_UNDO: 'Undo',
      GAME_END: 'End turn',
      GAME_MENU: 'Pause',
      GAME_CONTINUE: '▶ Continue',
      GAME_CENTER: '⌖ Center map',
      GAME_SAVE_EXIT: '💾 Save and exit',
      GAME_ABANDON: '🏳 Surrender',
      GAME_CODEX: '📖 Codex',
      VIEW_NORMAL: 'Normal',
      VIEW_COMBAT: 'Combat',
      VIEW_POLITIC: 'Political',
      VIEW_RESOURCE: 'Resources',
      CODEX_TITLE: '📖 Tactical Codex',
      CODEX_INTRO: 'Read the core rules without leaving the game.',
      CODEX_TAB_LAYERS: '🗺️ The 6 layers',
      CODEX_TAB_COMBAT: '⚔️ Combat & Tiers',
      CODEX_TAB_SUPPLY: '🔗 Supply',
      CODEX_TAB_SETTLEMENTS: '🏙️ Settlements',
      CODEX_TAB_CREDO: '🕊️ Creed',
      CODEX_LAYERS: '<p>Every hex is a tile with six layers:</p><ul><li><b>1 · Terrain:</b> plains, hills, mountains, river or sea. It defines movement and part of defense.</li><li><b>2 · Resources:</b> gold, wheat or wood; they feed provinces and the economy.</li><li><b>3 · Settlements:</b> tree, road, camp, village, city or bastion.</li><li><b>4 · Sovereignty:</b> the tile owner and its supply province.</li><li><b>5 · Capitals:</b> the political center of each faction; losing them eliminates it.</li><li><b>6 · Units and tombs:</b> armies, tiers, naval cargo and battle remains.</li></ul><p class="dim small">The <b>Political</b> view highlights layer 4; <b>Resources</b> layer 2; <b>Combat</b> layer 6.</p>',
      CODEX_COMBAT: '<p>Combat is deterministic: <b>A &gt; D</b>. If attack beats defense, the tile falls; otherwise the attack is repelled.</p><ul><li><b>Tiers:</b> an N1 unit can merge with another N1 to become N2. N3 is elite; the Praetorian is N4.</li><li><b>Defense:</b> unit base + infantry terrain + building. Allied units and bastion auras <b>do not stack</b>: the highest value prevails.</li><li><b>Zone of control:</b> adjacent units protect with their defense; bastions project a defensive aura.</li><li><b>Roles:</b> archers degrade defenses, siege punishes empty buildings and ships carry troops.</li></ul><p class="dim small">In <b>Combat</b> view, tap a unit to see its tier and exact defense breakdown.</p>',
      CODEX_SUPPLY: '<p>A province lives while it keeps a land line to one of its settlements. If the line is cut, its tiles become <b>ISOLATED</b>.</p><ul><li>Without supply you collect no resources and cannot recruit.</li><li>Food or gold deficit causes staged desertion: the most expensive units leave first.</li><li>Enemy supply cuts also isolate territory and are a path to victory.</li></ul><p class="dim small">Supply is recalculated when moving, capturing, building or packing.</p>',
      CODEX_SETTLEMENTS: '<p>The civic progression is <b>Camp → Village / Bastion → City</b>.</p><ul><li><b>Camp:</b> first base and provincial refuge.</li><li><b>Village:</b> trade and recruitment hub.</li><li><b>City:</b> provincial capital; defense and growth.</li><li><b>Bastion:</b> fortress; projects a defensive aura and can host the monument.</li><li><b>Roads</b> multiply movement and connect trade routes.</li></ul><p class="dim small">Layer-2 resources are collected within the province radius; trade routes pay at both ends.</p>',
      CODEX_CREDO: '<p>Your tribe creed is chosen in three tiers: <b>Soul</b>, <b>Weapon</b> and <b>Victory</b>.</p><ul><li>Each tier unlocks a passive doctrine that changes economy, combat or logistics.</li><li>Doctrines combine; there is no single correct build.</li><li>Edit your creed from the <b>Tribe</b> screen before starting.</li></ul><p class="dim small">«In play» doctrines modify the engine; catalogue doctrines are future design and never pretend to be active.</p>',
      EDITOR_TITLE: 'Map Editor',
      EDITOR_SIZE: 'Size',
      EDITOR_RANDOM: '🎲 Random',
      EDITOR_CLEAR: '🧹 Clear',
      EDITOR_EXPORT: '📤 Export',
      EDITOR_IMPORT: '📥 Import',
      EDITOR_SAVE: '💾 Save',
      EDITOR_LOAD: '📂 Open',
      EDITOR_PLAY: '▶ Test',
      REPLAY_TITLE: '🎬 Tactical Replay',
      REPLAY_EXIT: '✖ Exit',
      REPLAY_TURN: 'Turn',
      REPLAY_ACTION: 'Action',
      YES: 'Yes',
      NO: 'No',
      CLOSE: 'Close',
      COMING_SOON: 'coming soon',
      NO_MULTIPLAYER: 'no multiplayer'
    }
  };
  // Cada idioma nuevo hereda el inglés como red de seguridad para los textos
  // largos del Códice; los textos principales se traducen aquí.
  const L = tr => Object.assign({}, HF.LOCALES.en, tr);

  HF.LOCALES.zh = L({
    HUB_SUBTITLE: '回合制六边形策略',
    BTN_CONTINUE: '▶ 继续', BTN_CAMPAIGN: '⚔️ 战役', BTN_NEW_GAME: '🎲 新游戏', BTN_ONLINE: '🌐 在线', BTN_DAILY: '🏆 每日挑战',
    DOCK_TRIBE: '部族', DOCK_MAPS: '地图', DOCK_STATS: '统计', DOCK_SETTINGS: '设置', DOCK_WIKI: '图鉴',
    SETTINGS: '设置', SOUND: '🔊 声音', VIBRATE: '📳 振动', GRID: '▦ 地图网格', LANGUAGE: '🌐 语言',
    RESET: '🗑 删除所有数据', RESET_CONFIRM: '删除所有本地数据？', LOCAL_DATA: '所有数据仅保存在本设备上。',
    GAME_BUILD: '建造', GAME_RECRUIT: '招募', GAME_UNDO: '撤销', GAME_END: '结束回合', GAME_MENU: '暂停',
    GAME_CONTINUE: '▶ 继续', GAME_CENTER: '⌖ 居中地图', GAME_SAVE_EXIT: '💾 保存并退出', GAME_ABANDON: '🏳 放弃', GAME_CODEX: '📖 图鉴',
    VIEW_NORMAL: '普通', VIEW_COMBAT: '战斗', VIEW_POLITIC: '政治', VIEW_RESOURCE: '资源',
    CODEX_TITLE: '📖 战术图鉴', CODEX_INTRO: '无需离开游戏即可查看核心规则。',
    CODEX_TAB_LAYERS: '🗺️ 六层世界', CODEX_TAB_COMBAT: '⚔️ 战斗与阶级', CODEX_TAB_SUPPLY: '🔗 补给',
    CODEX_TAB_SETTLEMENTS: '🏙️ 聚落', CODEX_TAB_CREDO: '🕊️ 信条',
    EDITOR_TITLE: '地图编辑器', EDITOR_SIZE: '尺寸', EDITOR_RANDOM: '🎲 随机', EDITOR_CLEAR: '🧹 清空',
    EDITOR_EXPORT: '📤 导出', EDITOR_IMPORT: '📥 导入', EDITOR_SAVE: '💾 保存', EDITOR_LOAD: '📂 打开', EDITOR_PLAY: '▶ 测试',
    REPLAY_TITLE: '🎬 战术回放', REPLAY_EXIT: '✖ 退出', REPLAY_TURN: '回合', REPLAY_ACTION: '动作',
    YES: '是', NO: '否', CLOSE: '关闭', COMING_SOON: '即将推出'
  });

  HF.LOCALES.hi = L({
    HUB_SUBTITLE: 'बारी-बारी षट्कोणीय रणनीति',
    BTN_CONTINUE: '▶ जारी रखें', BTN_CAMPAIGN: '⚔️ अभियान', BTN_NEW_GAME: '🎲 नया खेल', BTN_ONLINE: '🌐 ऑनलाइन', BTN_DAILY: '🏆 दैनिक',
    DOCK_TRIBE: 'जनजाति', DOCK_MAPS: 'मानचित्र', DOCK_STATS: 'आँकड़े', DOCK_SETTINGS: 'सेटिंग्स', DOCK_WIKI: 'कोडेक्स',
    SETTINGS: 'सेटिंग्स', SOUND: '🔊 ध्वनि', VIBRATE: '📳 कंपन', GRID: '▦ मानचित्र ग्रिड', LANGUAGE: '🌐 भाषा',
    RESET: '🗑 सारा डेटा हटाएँ', RESET_CONFIRM: 'सारा स्थानीय डेटा हटाएँ?', LOCAL_DATA: 'सारा डेटा इसी डिवाइस पर सहेजा जाता है।',
    GAME_BUILD: 'निर्माण', GAME_RECRUIT: 'भर्ती', GAME_UNDO: 'पूर्ववत', GAME_END: 'बारी समाप्त', GAME_MENU: 'रोकें',
    GAME_CONTINUE: '▶ जारी रखें', GAME_CENTER: '⌖ मानचित्र केंद्रित करें', GAME_SAVE_EXIT: '💾 सहेजें और बाहर जाएँ', GAME_ABANDON: '🏳 त्यागें', GAME_CODEX: '📖 कोडेक्स',
    VIEW_NORMAL: 'सामान्य', VIEW_COMBAT: 'युद्ध', VIEW_POLITIC: 'राजनीतिक', VIEW_RESOURCE: 'संसाधन',
    CODEX_TITLE: '📖 सामरिक कोडेक्स', CODEX_INTRO: 'खेल छोड़े बिना मुख्य नियम पढ़ें।',
    CODEX_TAB_LAYERS: '🗺️ छह परतें', CODEX_TAB_COMBAT: '⚔️ युद्ध और स्तर', CODEX_TAB_SUPPLY: '🔗 आपूर्ति',
    CODEX_TAB_SETTLEMENTS: '🏙️ बस्तियाँ', CODEX_TAB_CREDO: '🕊️ विश्वास',
    EDITOR_TITLE: 'मानचित्र संपादक', EDITOR_SIZE: 'आकार', EDITOR_RANDOM: '🎲 यादृच्छिक', EDITOR_CLEAR: '🧹 खाली करें',
    EDITOR_EXPORT: '📤 निर्यात', EDITOR_IMPORT: '📥 आयात', EDITOR_SAVE: '💾 सहेजें', EDITOR_LOAD: '📂 खोलें', EDITOR_PLAY: '▶ परखें',
    REPLAY_TITLE: '🎬 सामरिक पुनरावृत्ति', REPLAY_EXIT: '✖ बाहर', REPLAY_TURN: 'बारी', REPLAY_ACTION: 'क्रिया',
    YES: 'हाँ', NO: 'नहीं', CLOSE: 'बंद करें', COMING_SOON: 'जल्द आ रहा है'
  });

  HF.LOCALES.fr = L({
    HUB_SUBTITLE: 'Stratégie hexagonale au tour par tour',
    BTN_CONTINUE: '▶ Continuer', BTN_CAMPAIGN: '⚔️ Campagne', BTN_NEW_GAME: '🎲 Nouvelle partie', BTN_ONLINE: '🌐 En ligne', BTN_DAILY: '🏆 Quotidien',
    DOCK_TRIBE: 'Tribu', DOCK_MAPS: 'Cartes', DOCK_STATS: 'Stats', DOCK_SETTINGS: 'Réglages', DOCK_WIKI: 'Codex',
    SETTINGS: 'Réglages', SOUND: '🔊 Son', VIBRATE: '📳 Vibration', GRID: '▦ Grille', LANGUAGE: '🌐 Langue',
    RESET: '🗑 Supprimer toutes les données', RESET_CONFIRM: 'Supprimer toutes les données locales ?', LOCAL_DATA: 'Toutes les données sont stockées sur cet appareil.',
    GAME_BUILD: 'Construire', GAME_RECRUIT: 'Recruter', GAME_UNDO: 'Annuler', GAME_END: 'Fin du tour', GAME_MENU: 'Pause',
    GAME_CONTINUE: '▶ Continuer', GAME_CENTER: '⌖ Centrer la carte', GAME_SAVE_EXIT: '💾 Sauvegarder et quitter', GAME_ABANDON: '🏳 Abandonner', GAME_CODEX: '📖 Codex',
    VIEW_NORMAL: 'Normal', VIEW_COMBAT: 'Combat', VIEW_POLITIC: 'Politique', VIEW_RESOURCE: 'Ressources',
    CODEX_TITLE: '📖 Codex tactique', CODEX_INTRO: 'Consultez les règles principales sans quitter la partie.',
    CODEX_TAB_LAYERS: '🗺️ Les 6 couches', CODEX_TAB_COMBAT: '⚔️ Combat et Tiers', CODEX_TAB_SUPPLY: '🔗 Approvisionnement',
    CODEX_TAB_SETTLEMENTS: '🏙️ Colonies', CODEX_TAB_CREDO: '🕊️ Credo',
    EDITOR_TITLE: 'Éditeur de cartes', EDITOR_SIZE: 'Taille', EDITOR_RANDOM: '🎲 Aléatoire', EDITOR_CLEAR: '🧹 Vider',
    EDITOR_EXPORT: '📤 Exporter', EDITOR_IMPORT: '📥 Importer', EDITOR_SAVE: '💾 Sauver', EDITOR_LOAD: '📂 Ouvrir', EDITOR_PLAY: '▶ Tester',
    REPLAY_TITLE: '🎬 Rediffusion tactique', REPLAY_EXIT: '✖ Quitter', REPLAY_TURN: 'Tour', REPLAY_ACTION: 'Action',
    YES: 'Oui', NO: 'Non', CLOSE: 'Fermer', COMING_SOON: 'bientôt'
  });

  HF.LOCALES.ar = L({
    HUB_SUBTITLE: 'استراتيجية سداسية بنظام الأدوار',
    BTN_CONTINUE: '▶ متابعة', BTN_CAMPAIGN: '⚔️ الحملة', BTN_NEW_GAME: '🎲 لعبة جديدة', BTN_ONLINE: '🌐 عبر الإنترنت', BTN_DAILY: '🏆 التحدي اليومي',
    DOCK_TRIBE: 'القبيلة', DOCK_MAPS: 'الخرائط', DOCK_STATS: 'الإحصاءات', DOCK_SETTINGS: 'الإعدادات', DOCK_WIKI: 'الموسوعة',
    SETTINGS: 'الإعدادات', SOUND: '🔊 الصوت', VIBRATE: '📳 الاهتزاز', GRID: '▦ شبكة الخريطة', LANGUAGE: '🌐 اللغة',
    RESET: '🗑 حذف كل البيانات', RESET_CONFIRM: 'حذف كل البيانات المحلية؟', LOCAL_DATA: 'تُحفظ كل البيانات على هذا الجهاز.',
    GAME_BUILD: 'بناء', GAME_RECRUIT: 'تجنيد', GAME_UNDO: 'تراجع', GAME_END: 'إنهاء الدور', GAME_MENU: 'إيقاف',
    GAME_CONTINUE: '▶ متابعة', GAME_CENTER: '⌖ توسيط الخريطة', GAME_SAVE_EXIT: '💾 حفظ وخروج', GAME_ABANDON: '🏳 استسلام', GAME_CODEX: '📖 الموسوعة',
    VIEW_NORMAL: 'عادي', VIEW_COMBAT: 'قتال', VIEW_POLITIC: 'سياسي', VIEW_RESOURCE: 'موارد',
    CODEX_TITLE: '📖 الموسوعة التكتيكية', CODEX_INTRO: 'اطّلع على القواعد الأساسية دون مغادرة اللعبة.',
    CODEX_TAB_LAYERS: '🗺️ الطبقات الست', CODEX_TAB_COMBAT: '⚔️ القتال والمستويات', CODEX_TAB_SUPPLY: '🔗 الإمداد',
    CODEX_TAB_SETTLEMENTS: '🏙️ المستوطنات', CODEX_TAB_CREDO: '🕊️ العقيدة',
    EDITOR_TITLE: 'محرر الخرائط', EDITOR_SIZE: 'الحجم', EDITOR_RANDOM: '🎲 عشوائي', EDITOR_CLEAR: '🧹 مسح',
    EDITOR_EXPORT: '📤 تصدير', EDITOR_IMPORT: '📥 استيراد', EDITOR_SAVE: '💾 حفظ', EDITOR_LOAD: '📂 فتح', EDITOR_PLAY: '▶ تجربة',
    REPLAY_TITLE: '🎬 إعادة تكتيكية', REPLAY_EXIT: '✖ خروج', REPLAY_TURN: 'الدور', REPLAY_ACTION: 'الإجراء',
    YES: 'نعم', NO: 'لا', CLOSE: 'إغلاق', COMING_SOON: 'قريباً'
  });

  HF.LOCALES.bn = L({
    HUB_SUBTITLE: 'পাল্টা-পাল্টি ষড়ভুজ কৌশল',
    BTN_CONTINUE: '▶ চালিয়ে যান', BTN_CAMPAIGN: '⚔️ অভিযান', BTN_NEW_GAME: '🎲 নতুন খেলা', BTN_ONLINE: '🌐 অনলাইন', BTN_DAILY: '🏆 দৈনিক',
    DOCK_TRIBE: 'গোত্র', DOCK_MAPS: 'মানচিত্র', DOCK_STATS: 'পরিসংখ্যান', DOCK_SETTINGS: 'সেটিংস', DOCK_WIKI: 'কোডেক্স',
    SETTINGS: 'সেটিংস', SOUND: '🔊 শব্দ', VIBRATE: '📳 কম্পন', GRID: '▦ মানচিত্র গ্রিড', LANGUAGE: '🌐 ভাষা',
    RESET: '🗑 সব ডেটা মুছুন', RESET_CONFIRM: 'সব স্থানীয় ডেটা মুছবেন?', LOCAL_DATA: 'সব ডেটা এই ডিভাইসে সংরক্ষিত থাকে।',
    GAME_BUILD: 'নির্মাণ', GAME_RECRUIT: 'নিয়োগ', GAME_UNDO: 'পূর্বাবস্থা', GAME_END: 'পালা শেষ', GAME_MENU: 'বিরতি',
    GAME_CONTINUE: '▶ চালিয়ে যান', GAME_CENTER: '⌖ মানচিত্র কেন্দ্রীভূত করুন', GAME_SAVE_EXIT: '💾 সংরক্ষণ করে বের হন', GAME_ABANDON: '🏳 আত্মসমর্পণ', GAME_CODEX: '📖 কোডেক্স',
    VIEW_NORMAL: 'সাধারণ', VIEW_COMBAT: 'যুদ্ধ', VIEW_POLITIC: 'রাজনৈতিক', VIEW_RESOURCE: 'সম্পদ',
    CODEX_TITLE: '📖 কৌশলগত কোডেক্স', CODEX_INTRO: 'খেলা না ছেড়ে মূল নিয়মগুলো দেখুন।',
    CODEX_TAB_LAYERS: '🗺️ ছয় স্তর', CODEX_TAB_COMBAT: '⚔️ যুদ্ধ ও স্তর', CODEX_TAB_SUPPLY: '🔗 সরবরাহ',
    CODEX_TAB_SETTLEMENTS: '🏙️ বসতি', CODEX_TAB_CREDO: '🕊️ বিশ্বাস',
    EDITOR_TITLE: 'মানচিত্র সম্পাদক', EDITOR_SIZE: 'আকার', EDITOR_RANDOM: '🎲 এলোমেলো', EDITOR_CLEAR: '🧹 খালি করুন',
    EDITOR_EXPORT: '📤 রপ্তানি', EDITOR_IMPORT: '📥 আমদানি', EDITOR_SAVE: '💾 সংরক্ষণ', EDITOR_LOAD: '📂 খুলুন', EDITOR_PLAY: '▶ পরীক্ষা',
    REPLAY_TITLE: '🎬 কৌশলগত পুনঃপ্রদর্শন', REPLAY_EXIT: '✖ বের হন', REPLAY_TURN: 'পালা', REPLAY_ACTION: 'ক্রিয়া',
    YES: 'হ্যাঁ', NO: 'না', CLOSE: 'বন্ধ', COMING_SOON: 'শীঘ্রই'
  });

  HF.LOCALES.pt = L({
    HUB_SUBTITLE: 'Estratégia hexagonal por turnos',
    BTN_CONTINUE: '▶ Continuar', BTN_CAMPAIGN: '⚔️ Campanha', BTN_NEW_GAME: '🎲 Novo jogo', BTN_ONLINE: '🌐 Online', BTN_DAILY: '🏆 Diário',
    DOCK_TRIBE: 'Tribo', DOCK_MAPS: 'Mapas', DOCK_STATS: 'Estatísticas', DOCK_SETTINGS: 'Configurações', DOCK_WIKI: 'Códice',
    SETTINGS: 'Configurações', SOUND: '🔊 Som', VIBRATE: '📳 Vibração', GRID: '▦ Grelha do mapa', LANGUAGE: '🌐 Idioma',
    RESET: '🗑 Eliminar todos os dados', RESET_CONFIRM: 'Eliminar todos os dados locais?', LOCAL_DATA: 'Todos os dados são guardados neste dispositivo.',
    GAME_BUILD: 'Construir', GAME_RECRUIT: 'Recrutar', GAME_UNDO: 'Anular', GAME_END: 'Terminar turno', GAME_MENU: 'Pausa',
    GAME_CONTINUE: '▶ Continuar', GAME_CENTER: '⌖ Centrar mapa', GAME_SAVE_EXIT: '💾 Guardar e sair', GAME_ABANDON: '🏳 Render-se', GAME_CODEX: '📖 Códice',
    VIEW_NORMAL: 'Normal', VIEW_COMBAT: 'Combate', VIEW_POLITIC: 'Político', VIEW_RESOURCE: 'Recursos',
    CODEX_TITLE: '📖 Códice tático', CODEX_INTRO: 'Consulte as regras principais sem sair da partida.',
    CODEX_TAB_LAYERS: '🗺️ As 6 camadas', CODEX_TAB_COMBAT: '⚔️ Combate e Tiers', CODEX_TAB_SUPPLY: '🔗 Abastecimento',
    CODEX_TAB_SETTLEMENTS: '🏙️ Povoações', CODEX_TAB_CREDO: '🕊️ Credo',
    EDITOR_TITLE: 'Editor de mapas', EDITOR_SIZE: 'Tamanho', EDITOR_RANDOM: '🎲 Aleatório', EDITOR_CLEAR: '🧹 Limpar',
    EDITOR_EXPORT: '📤 Exportar', EDITOR_IMPORT: '📥 Importar', EDITOR_SAVE: '💾 Guardar', EDITOR_LOAD: '📂 Abrir', EDITOR_PLAY: '▶ Testar',
    REPLAY_TITLE: '🎬 Repetição tática', REPLAY_EXIT: '✖ Sair', REPLAY_TURN: 'Turno', REPLAY_ACTION: 'Ação',
    YES: 'Sim', NO: 'Não', CLOSE: 'Fechar', COMING_SOON: 'em breve'
  });

  HF.LOCALES.ru = L({
    HUB_SUBTITLE: 'Пошаговая гексагональная стратегия',
    BTN_CONTINUE: '▶ Продолжить', BTN_CAMPAIGN: '⚔️ Кампания', BTN_NEW_GAME: '🎲 Новая игра', BTN_ONLINE: '🌐 Сеть', BTN_DAILY: '🏆 Ежедневно',
    DOCK_TRIBE: 'Племя', DOCK_MAPS: 'Карты', DOCK_STATS: 'Статистика', DOCK_SETTINGS: 'Настройки', DOCK_WIKI: 'Кодекс',
    SETTINGS: 'Настройки', SOUND: '🔊 Звук', VIBRATE: '📳 Вибрация', GRID: '▦ Сетка карты', LANGUAGE: '🌐 Язык',
    RESET: '🗑 Удалить все данные', RESET_CONFIRM: 'Удалить все локальные данные?', LOCAL_DATA: 'Все данные хранятся на этом устройстве.',
    GAME_BUILD: 'Строить', GAME_RECRUIT: 'Набрать', GAME_UNDO: 'Отменить', GAME_END: 'Конец хода', GAME_MENU: 'Пауза',
    GAME_CONTINUE: '▶ Продолжить', GAME_CENTER: '⌖ Центрировать карту', GAME_SAVE_EXIT: '💾 Сохранить и выйти', GAME_ABANDON: '🏳 Сдаться', GAME_CODEX: '📖 Кодекс',
    VIEW_NORMAL: 'Обычный', VIEW_COMBAT: 'Бой', VIEW_POLITIC: 'Политика', VIEW_RESOURCE: 'Ресурсы',
    CODEX_TITLE: '📖 Тактический кодекс', CODEX_INTRO: 'Основные правила, не покидая игру.',
    CODEX_TAB_LAYERS: '🗺️ Шесть слоёв', CODEX_TAB_COMBAT: '⚔️ Бой и уровни', CODEX_TAB_SUPPLY: '🔗 Снабжение',
    CODEX_TAB_SETTLEMENTS: '🏙️ Поселения', CODEX_TAB_CREDO: '🕊️ Кредо',
    EDITOR_TITLE: 'Редактор карт', EDITOR_SIZE: 'Размер', EDITOR_RANDOM: '🎲 Случайно', EDITOR_CLEAR: '🧹 Очистить',
    EDITOR_EXPORT: '📤 Экспорт', EDITOR_IMPORT: '📥 Импорт', EDITOR_SAVE: '💾 Сохранить', EDITOR_LOAD: '📂 Открыть', EDITOR_PLAY: '▶ Проверить',
    REPLAY_TITLE: '🎬 Тактический повтор', REPLAY_EXIT: '✖ Выйти', REPLAY_TURN: 'Ход', REPLAY_ACTION: 'Действие',
    YES: 'Да', NO: 'Нет', CLOSE: 'Закрыть', COMING_SOON: 'скоро'
  });

  HF.LOCALES.de = L({
    HUB_SUBTITLE: 'Rundenbasierte Hex-Strategie',
    BTN_CONTINUE: '▶ Weiter', BTN_CAMPAIGN: '⚔️ Kampagne', BTN_NEW_GAME: '🎲 Neues Spiel', BTN_ONLINE: '🌐 Online', BTN_DAILY: '🏆 Täglich',
    DOCK_TRIBE: 'Stamm', DOCK_MAPS: 'Karten', DOCK_STATS: 'Statistik', DOCK_SETTINGS: 'Einstellungen', DOCK_WIKI: 'Kodex',
    SETTINGS: 'Einstellungen', SOUND: '🔊 Ton', VIBRATE: '📳 Vibration', GRID: '▦ Kartenraster', LANGUAGE: '🌐 Sprache',
    RESET: '🗑 Alle Daten löschen', RESET_CONFIRM: 'Alle lokalen Daten löschen?', LOCAL_DATA: 'Alle Daten werden auf diesem Gerät gespeichert.',
    GAME_BUILD: 'Bauen', GAME_RECRUIT: 'Rekrutieren', GAME_UNDO: 'Rückgängig', GAME_END: 'Zug beenden', GAME_MENU: 'Pause',
    GAME_CONTINUE: '▶ Weiter', GAME_CENTER: '⌖ Karte zentrieren', GAME_SAVE_EXIT: '💾 Speichern & verlassen', GAME_ABANDON: '🏳 Aufgeben', GAME_CODEX: '📖 Kodex',
    VIEW_NORMAL: 'Normal', VIEW_COMBAT: 'Kampf', VIEW_POLITIC: 'Politik', VIEW_RESOURCE: 'Ressourcen',
    CODEX_TITLE: '📖 Taktischer Kodex', CODEX_INTRO: 'Die wichtigsten Regeln ohne die Partie zu verlassen.',
    CODEX_TAB_LAYERS: '🗺️ Die 6 Schichten', CODEX_TAB_COMBAT: '⚔️ Kampf & Tiers', CODEX_TAB_SUPPLY: '🔗 Versorgung',
    CODEX_TAB_SETTLEMENTS: '🏙️ Siedlungen', CODEX_TAB_CREDO: '🕊️ Credo',
    EDITOR_TITLE: 'Karteneditor', EDITOR_SIZE: 'Größe', EDITOR_RANDOM: '🎲 Zufällig', EDITOR_CLEAR: '🧹 Leeren',
    EDITOR_EXPORT: '📤 Export', EDITOR_IMPORT: '📥 Import', EDITOR_SAVE: '💾 Speichern', EDITOR_LOAD: '📂 Öffnen', EDITOR_PLAY: '▶ Testen',
    REPLAY_TITLE: '🎬 Taktische Wiederholung', REPLAY_EXIT: '✖ Beenden', REPLAY_TURN: 'Zug', REPLAY_ACTION: 'Aktion',
    YES: 'Ja', NO: 'Nein', CLOSE: 'Schließen', COMING_SOON: 'bald'
  });

  HF.LOCALES.ja = L({
    HUB_SUBTITLE: 'ターン制ヘクサゴン戦略',
    BTN_CONTINUE: '▶ 続ける', BTN_CAMPAIGN: '⚔️ キャンペーン', BTN_NEW_GAME: '🎲 新しいゲーム', BTN_ONLINE: '🌐 オンライン', BTN_DAILY: '🏆 デイリー',
    DOCK_TRIBE: '部族', DOCK_MAPS: 'マップ', DOCK_STATS: '統計', DOCK_SETTINGS: '設定', DOCK_WIKI: '図鑑',
    SETTINGS: '設定', SOUND: '🔊 サウンド', VIBRATE: '📳 振動', GRID: '▦ マップグリッド', LANGUAGE: '🌐 言語',
    RESET: '🗑 全データを削除', RESET_CONFIRM: 'ローカルデータをすべて削除しますか？', LOCAL_DATA: 'データはこの端末に保存されます。',
    GAME_BUILD: '建設', GAME_RECRUIT: '徴兵', GAME_UNDO: '元に戻す', GAME_END: 'ターン終了', GAME_MENU: '一時停止',
    GAME_CONTINUE: '▶ 続ける', GAME_CENTER: '⌖ マップを中央に', GAME_SAVE_EXIT: '💾 保存して終了', GAME_ABANDON: '🏳 降伏', GAME_CODEX: '📖 図鑑',
    VIEW_NORMAL: '通常', VIEW_COMBAT: '戦闘', VIEW_POLITIC: '政治', VIEW_RESOURCE: '資源',
    CODEX_TITLE: '📖 戦術図鑑', CODEX_INTRO: 'ゲームを離れずに基本ルールを確認できます。',
    CODEX_TAB_LAYERS: '🗺️ 六つの層', CODEX_TAB_COMBAT: '⚔️ 戦闘と階級', CODEX_TAB_SUPPLY: '🔗 補給',
    CODEX_TAB_SETTLEMENTS: '🏙️ 集落', CODEX_TAB_CREDO: '🕊️ 信条',
    EDITOR_TITLE: 'マップエディター', EDITOR_SIZE: 'サイズ', EDITOR_RANDOM: '🎲 ランダム', EDITOR_CLEAR: '🧹 クリア',
    EDITOR_EXPORT: '📤 エクスポート', EDITOR_IMPORT: '📥 インポート', EDITOR_SAVE: '💾 保存', EDITOR_LOAD: '📂 開く', EDITOR_PLAY: '▶ テスト',
    REPLAY_TITLE: '🎬 戦術リプレイ', REPLAY_EXIT: '✖ 終了', REPLAY_TURN: 'ターン', REPLAY_ACTION: 'アクション',
    YES: 'はい', NO: 'いいえ', CLOSE: '閉じる', COMING_SOON: '近日公開'
  });

  HF.LOCALES.ko = L({
    HUB_SUBTITLE: '턴제 육각형 전략',
    BTN_CONTINUE: '▶ 계속', BTN_CAMPAIGN: '⚔️ 캠페인', BTN_NEW_GAME: '🎲 새 게임', BTN_ONLINE: '🌐 온라인', BTN_DAILY: '🏆 일일',
    DOCK_TRIBE: '부족', DOCK_MAPS: '지도', DOCK_STATS: '통계', DOCK_SETTINGS: '설정', DOCK_WIKI: '도감',
    SETTINGS: '설정', SOUND: '🔊 소리', VIBRATE: '📳 진동', GRID: '▦ 지도 격자', LANGUAGE: '🌐 언어',
    RESET: '🗑 모든 데이터 삭제', RESET_CONFIRM: '모든 로컬 데이터를 삭제할까요?', LOCAL_DATA: '모든 데이터는 이 기기에 저장됩니다.',
    GAME_BUILD: '건설', GAME_RECRUIT: '모집', GAME_UNDO: '되돌리기', GAME_END: '턴 종료', GAME_MENU: '일시정지',
    GAME_CONTINUE: '▶ 계속', GAME_CENTER: '⌖ 지도 중앙', GAME_SAVE_EXIT: '💾 저장 후 종료', GAME_ABANDON: '🏳 항복', GAME_CODEX: '📖 도감',
    VIEW_NORMAL: '일반', VIEW_COMBAT: '전투', VIEW_POLITIC: '정치', VIEW_RESOURCE: '자원',
    CODEX_TITLE: '📖 전술 도감', CODEX_INTRO: '게임을 떠나지 않고 핵심 규칙을 확인하세요.',
    CODEX_TAB_LAYERS: '🗺️ 여섯 겹', CODEX_TAB_COMBAT: '⚔️ 전투와 등급', CODEX_TAB_SUPPLY: '🔗 보급',
    CODEX_TAB_SETTLEMENTS: '🏙️ 정착지', CODEX_TAB_CREDO: '🕊️ 신조',
    EDITOR_TITLE: '지도 편집기', EDITOR_SIZE: '크기', EDITOR_RANDOM: '🎲 무작위', EDITOR_CLEAR: '🧹 비우기',
    EDITOR_EXPORT: '📤 내보내기', EDITOR_IMPORT: '📥 가져오기', EDITOR_SAVE: '💾 저장', EDITOR_LOAD: '📂 열기', EDITOR_PLAY: '▶ 시험',
    REPLAY_TITLE: '🎬 전술 다시보기', REPLAY_EXIT: '✖ 나가기', REPLAY_TURN: '턴', REPLAY_ACTION: '행동',
    YES: '예', NO: '아니요', CLOSE: '닫기', COMING_SOON: '곧 출시'
  });

  HF.LOCALES.it = L({
    HUB_SUBTITLE: 'Strategia esagonale a turni',
    BTN_CONTINUE: '▶ Continua', BTN_CAMPAIGN: '⚔️ Campagna', BTN_NEW_GAME: '🎲 Nuova partita', BTN_ONLINE: '🌐 Online', BTN_DAILY: '🏆 Giornaliero',
    DOCK_TRIBE: 'Tribù', DOCK_MAPS: 'Mappe', DOCK_STATS: 'Statistiche', DOCK_SETTINGS: 'Impostazioni', DOCK_WIKI: 'Codice',
    SETTINGS: 'Impostazioni', SOUND: '🔊 Suono', VIBRATE: '📳 Vibrazione', GRID: '▦ Griglia mappa', LANGUAGE: '🌐 Lingua',
    RESET: '🗑 Elimina tutti i dati', RESET_CONFIRM: 'Eliminare tutti i dati locali?', LOCAL_DATA: 'Tutti i dati sono salvati su questo dispositivo.',
    GAME_BUILD: 'Costruisci', GAME_RECRUIT: 'Recluta', GAME_UNDO: 'Annulla', GAME_END: 'Fine turno', GAME_MENU: 'Pausa',
    GAME_CONTINUE: '▶ Continua', GAME_CENTER: '⌖ Centra mappa', GAME_SAVE_EXIT: '💾 Salva ed esci', GAME_ABANDON: '🏳 Arrenditi', GAME_CODEX: '📖 Codice',
    VIEW_NORMAL: 'Normale', VIEW_COMBAT: 'Combattimento', VIEW_POLITIC: 'Politico', VIEW_RESOURCE: 'Risorse',
    CODEX_TITLE: '📖 Codice tattico', CODEX_INTRO: 'Consulta le regole principali senza lasciare la partita.',
    CODEX_TAB_LAYERS: '🗺️ I 6 livelli', CODEX_TAB_COMBAT: '⚔️ Combattimento e Tiers', CODEX_TAB_SUPPLY: '🔗 Rifornimenti',
    CODEX_TAB_SETTLEMENTS: '🏙️ Insediamenti', CODEX_TAB_CREDO: '🕊️ Credo',
    EDITOR_TITLE: 'Editor mappe', EDITOR_SIZE: 'Dimensione', EDITOR_RANDOM: '🎲 Casuale', EDITOR_CLEAR: '🧹 Svuota',
    EDITOR_EXPORT: '📤 Esporta', EDITOR_IMPORT: '📥 Importa', EDITOR_SAVE: '💾 Salva', EDITOR_LOAD: '📂 Apri', EDITOR_PLAY: '▶ Prova',
    REPLAY_TITLE: '🎬 Replay tattico', REPLAY_EXIT: '✖ Esci', REPLAY_TURN: 'Turno', REPLAY_ACTION: 'Azione',
    YES: 'Sì', NO: 'No', CLOSE: 'Chiudi', COMING_SOON: 'presto'
  });

  HF.LANGS = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'zh', name: '简体中文', flag: '🇨🇳' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
  ];

  HF.t = function (key, fallback) {
    const s = HF.settings ? HF.settings() : {};
    const dict = HF.LOCALES[s.lang] || HF.LOCALES.es;
    if (dict[key] != null) return dict[key];
    const base = HF.LOCALES.en || HF.LOCALES.es;
    return base[key] != null ? base[key] : (fallback != null ? fallback : key);
  };
  HF.lang = () => {
    const lang = HF.settings ? (HF.settings().lang || 'es') : 'es';
    return HF.LOCALES[lang] ? lang : 'es';
  };
  HF.setLang = lang => {
    if (!HF.LOCALES[lang]) lang = 'es';
    const s = HF.settings ? HF.settings() : {};
    s.lang = lang; HF.store.set('settings', s);
    if (G.document && G.document.documentElement) {
      G.document.documentElement.lang = lang;
      G.document.documentElement.dir = (HF.LANGS.find(x => x.code === lang) || {}).rtl ? 'rtl' : 'ltr';
    }
    if (HF.bgm) HF.bgm.refresh();
    return lang;
  };
  if (G.document && G.document.documentElement) {
    const lang = HF.lang();
    G.document.documentElement.lang = lang;
    G.document.documentElement.dir = (HF.LANGS.find(x => x.code === lang) || {}).rtl ? 'rtl' : 'ltr';
  }
})(typeof window !== 'undefined' ? window : globalThis);
