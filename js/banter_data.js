/* =========================================================================
   FEDERATI: BANTER & DIALOGUE CORPUS
   Inspirado en el humor de LucasArts y Daedalic Entertainment:
   - The Secret of Monkey Island (Ron Gilbert)
   - Day of the Tentacle (Tim Schafer, Dave Grossman)
   - Sam & Max Hit the Road (Steve Purcell)
   - Grim Fandango (Tim Schafer)
   - Thimbleweed Park (Ron Gilbert, Gary Winnick)
   - Saga Deponia (Jan Müller-Michaelis / Daedalic)
   ========================================================================= */
(function (G) {
  const HF = G.HF = G.HF || {};

  HF.BANTER_DATABASE = {
    /* ---------------------------------------------------------------------
       1. GENERADOR COMBINATORIO INFINITO (MAD-LIBS SINTÁCTICO)
       Genera más de 10.000 variaciones combinando aperturas, defectos y remates
       --------------------------------------------------------------------- */
    generator: {
      insult_lead: [
        "¡Tu insignificante guardia", "¡El bufón que diseñó tu estandarte", "¡Esa triste excusa de regimiento",
        "¡Vuestra lamentable línea de vanguardia", "¡El herrero borracho que forjó vuestros cascos",
        "¡Toda vuestra doctrina militar", "¡Ese general de hojalata que os comanda",
        "¡Vuestra patética cuadrilla de mercenarios", "¡La milicia de pacotilla que tenéis por ejército"
      ],
      insult_body: [
        "carece del intelecto táctico de", "despide el hedor rancio de", "marcha con la gracia de",
        "se desmorona con la fragilidad de", "inspira exactamente el mismo pavor que",
        "tiene la puntería y el juicio de", "gestiona sus suministros como", "fue reclutada en el vertedero por"
      ],
      insult_target: [
        "un pollo de goma con una polea en el medio!", "un tentáculo mutante con delirios de conquista!",
        "una paloma mensajera con vértigo y miopía!", "un montón de chatarra oxidada sacada de Deponia!",
        "un vendedor de ataúdes de segunda mano!", "un perro de peluche hiperactivo con placa de policía!",
        "un burócrata del Departamento de la Muerte!", "un reloj de arena atascado con puré de nabos!",
        "un calcetín sudado relleno de piedras de río!", "un pirata zombi con reuma en la pata de palo!"
      ],
      retort_lead: [
        "¡Eso dirías si supieras cuál es el lado afilado de la pica,",
        "¡Qué oportuno! Viniendo de alguien que",
        "¡Ahorra saliva para redactar tu acta de rendición,",
        "¡Me fascina que tu cerebro gestione caminar y hablar a la vez,",
        "¡Tu emperador llorará de vergüenza cuando",
        "¡Deberías meter la cabeza en un caldero hirviendo, porque",
        "¡Ese insulto tiene menos filo que una cuchara de madera, ya que"
      ],
      retort_punch: [
        "peleas como un granjero ciego!", "llevas la cota de malla puesta al revés desde el turno uno!",
        "tu montura se acaba de comer el mapa de campaña!", "tu bastión parece una letrina comunal sin techo!",
        "te desmayaste al cruzar el primer arroyo!", "tus órdenes militares las dicta una rata con hipo!",
        "en mi próxima reencarnación pediré no tener que mirar tu cara!",
        "mi perro tiene un vocabulario bélico más intimidante que el tuyo!"
      ]
    },

    /* ---------------------------------------------------------------------
       2. DUELOS DE INSULTOS EN LA FRONTERA (ALIADO VS RIVAL ADYACENTE)
       Estructura Call & Response: Paso A -> Paso B (+1400ms)
       --------------------------------------------------------------------- */
    frontier_duels: [
      // --- Homenaje: Monkey Island ---
      {
        a: "¡Lleváis las armaduras tan oxidadas que os oímos marchar desde el menú principal!",
        b: "¡Al menos tenemos armadura! ¡Vosotros parecéis extras de una comparsa sin presupuesto!"
      },
      {
        a: "¡Pronto estaréis abonando las parcelas de trigo de mi señor!",
        b: "¡Primero tendrías que aprender a no tropezar con tu propia vaina, aficionado!"
      },
      {
        a: "¡He visto lechugas en el mercado de Melee Island con más porte militar que tú!",
        b: "¡Y aun así esa lechuga sabría flanquear mejor que tu gloriosa vanguardia!"
      },
      {
        a: "¡Mi espada va a atravesar tu pecho como si fueras manteca tibia!",
        b: "¡Tu espada no cortaría ni una factura impagada de Stan el de los barcos!"
      },
      {
        a: "¡Os advierto que tengo la fuerza de diez titanes y la furia de un volcán!",
        b: "¡Qué pena que tengas la puntería de un mono con cataratas!"
      },
      {
        a: "¡Ríndete antes de que manchemos este bonito hexágono con tu incompetencia!",
        b: "¡La única mancha aquí es tu lamentable sentido de la estrategia!"
      },

      // --- Homenaje: Sam & Max ---
      {
        a: "¡Mi querido adversario, vuestra proximidad geográfica ofende a la física y a mi sentido estético!",
        b: "¡Hablas demasiado raro para alguien que está a tiro de piedra de ser decapitado!"
      },
      {
        a: "¡Un paso más en esta frontera y convertiremos tu osamenta en confeti para desfiles!",
        b: "¡Me encantaría veros intentarlo, bolas de pelo con complejo de infantería!"
      },
      {
        a: "¡Nuestra artillería tiene órdenes de erradicar cualquier partícula molecular de vuestro ser!",
        b: "¡Vuestra artillería no acertaría a una montaña aunque chocase de frente contra ella!"
      },

      // --- Homenaje: Grim Fandango ---
      {
        a: "Tus soldados tienen cara de querer comprar un billete sin retorno al Noveno Infierno.",
        b: "Lo compraríamos solo por no tener que aguantar tu cháchara barata de aduana."
      },
      {
        a: "El filo de mi guadaña tiene grabado tu nombre con letras doradas, amigo.",
        b: "Guárdate la poesía para tu lápida, Calavera de saldo."
      },
      {
        a: "Esa bandera vuestra da lástima. Ni los cuervos se posarían en vuestro campamento.",
        b: "Nos da igual la bandera mientras vuestros campos de grano sigan ardiendo igual de bien."
      },

      // --- Homenaje: Saga Deponia ---
      {
        a: "¡Aparta de mi frontera! ¡Tengo un plan maestro tan brillante que me asusto a mí mismo!",
        b: "¡La última vez que tuviste un plan quemaste tu propio campamento y perdiste tres carretas!"
      },
      {
        a: "¡Sois basura orgánica estorbando en mi camino hacia el dominio continental!",
        b: "¡Y tú eres chatarra parlante que se desarma en cuanto sople el viento de otoño!"
      },
      {
        a: "¡Mi genialidad táctica es incomprendida por mentes inferiores como la tuya!",
        b: "Lo único que no comprendemos es cómo conseguiste atarte las botas esta mañana."
      },

      // --- Homenaje: Day of the Tentacle ---
      {
        a: "¡Si no retrocedes tres pasos, llamaré a mis colegas del futuro para que borren a tus ancestros!",
        b: "¡Si supieras viajar en el tiempo habrías evitado nacer con esa cara de membrillo!"
      },
      {
        a: "¡Vuestro bastión incumple catorce leyes de mampostería y un tratado de salud pública!",
        b: "¡Cuando te disparemos las piedras de asedio veremos si el informe pericial sigue intacto!"
      },

      // --- Homenaje: Thimbleweed Park ---
      {
        a: "Esta invasión no tiene ningún sentido narrativo. Nadie ordenó un combate en este sector.",
        b: "Las órdenes son matar a los de tu color. Las preguntas metafísicas déjalas para el forense, a-whoo-hoo."
      },
      {
        a: "Todo este mapa parece diseñado por un lunático pixelado que disfruta viéndonos sufrir.",
        b: "Menos lloriquear y más desenvainar, que el tiempo de turno se agota."
      }
    ],

    /* ---------------------------------------------------------------------
       3. EL CANCILLER INDECISO (INACTIVIDAD DEL JUGADOR > 18 SEGUNDOS)
       Las unidades rompen la cuarta pared mirando al jugador / cursor
       --------------------------------------------------------------------- */
    idle_gossip: [
      [
        { role: "INF", text: "Esa flecha blanca gigantesca del cielo lleva dos minutos congelada sobre mi cabeza." },
        { role: "ANY", text: "No pestañees. Si no te mueves, el Canciller cree que eres una piedra del decorado." },
        { role: "INF", text: "Me está entrando calambre en los gemelos de fingir que soy una roca." }
      ],
      [
        { role: "ARC", text: "¿Nuestras vidas dependen de un tipo que lleva veinte segundos mirando una colina vacía?" },
        { role: "CAB", text: "Silencio, bruto. Dicen en la corte que está calculando una maniobra maestra de ajedrez." },
        { role: "ARC", text: "Se le ha caído el sándwich en el teclado o se ha dormido, te lo aseguro yo." }
      ],
      [
        { role: "BAR", text: "Tres semanas meciéndome en estas olas. Ya he nombrado a todos los mejillones del casco." },
        { role: "ANY", text: "¡Pues rema hacia tierra y deja de quejarte!" },
        { role: "BAR", text: "¡No puedo remar sin la orden de la flecha blanca, cenutrio! ¡Es la ley del código!" }
      ],
      [
        { role: "SIE", text: "Mi mecanismo de torsión se está agarrotando. La grasa de eje tiene telarañas." },
        { role: "INF", text: "Agradece que estás quieto. A nosotros nos van a mandar a morir de hambre en cuanto haga clic." }
      ],
      [
        { role: "INF", text: "¿Habéis notado que cuando suena esa música clásica tan culta siempre nos cortan las carreteras?" },
        { role: "ANY", text: "Es para que la muerte por inanición se sienta más refinada y de época, recluta." }
      ],
      [
        { role: "CAB", text: "Mi caballo se está comiendo el césped del hexágono vecino sin mi permiso." },
        { role: "ANY", text: "Déjalo comer. Es lo más productivo que ha pasado en este ejército en los últimos diez minutos." }
      ],
      [
        { role: "ARC", text: "Oye, Canciller... la batería del móvil se está gastando y yo sigo con la cuerda del arco tensada." },
        { role: "INF", text: "Shh, no le hables directamente a la pantalla que se asusta y nos manda a la nieve." }
      ]
    ],

    /* ---------------------------------------------------------------------
       4. PÁNICO LOGÍSTICO Y HAMBRUNA (SUMINISTRO CORTADO / CUPO NEGATIVO)
       Grim Fandango & Deponia energy: cinismo fúnebre y caos total
       --------------------------------------------------------------------- */
    supply_panic: [
      [
        { role: "INF", text: "Canciller... ¿esa columna de humo negro detrás de nosotros era el puente de la calzada?" },
        { role: "ANY", text: "Sí. Y la carreta con el tocino y el queso estaba encima cruzándolo. Estamos muertos." },
        { role: "INF", text: "Genial. Mi plan de jubilación acaba de ser cancelado por el departamento de intendencia." }
      ],
      [
        { role: "CAB", text: "¡Las líneas están rotas! ¡No hay trigo! ¡Los caballos me están mirando con ojos gastronómicos!" },
        { role: "ANY", text: "Duerme con la armadura puesta si no quieres amanecer convertido en cecina de campaña." }
      ],
      [
        { role: "SIE", text: "Tengo un plan magistral para solucionar la falta de comida." },
        { role: "INF", text: "¿Reconectar la carretera con la capital?" },
        { role: "SIE", text: "No. Disparamos piedras al aire en trayectoria vertical y rezamos para que caiga maná del cielo." },
        { role: "INF", text: "Voy a cavar mi propia tumba ahora mismo para ahorrar trabajo." }
      ],
      [
        { role: "ARC", text: "Las raciones se acabaron hace tres turnos. Me he comido las plumas de repuesto del carcaj." },
        { role: "ANY", text: "¿Y a qué saben?" },
        { role: "ARC", text: "A derrota inminente sazonada con polvo de colina." }
      ],
      [
        { role: "INF", text: "Si caemos en déficit, la regla del juego dice que yo me desintegro primero por ser recluta barato." },
        { role: "ANY", text: "Consuélate pensando que dejas una bonita lápida que estorbará el paso del enemigo tres turnos." },
        { role: "INF", text: "¡Qué gran honor patriótico, me llena de orgullo inmobiliario!" }
      ]
    ],

    /* ---------------------------------------------------------------------
       5. RENCILLAS ENTRE CUERPOS DEL EJÉRCITO (ALIADOS ADYACENTES)
       Choque de egos estilo Day of the Tentacle y Sam & Max
       --------------------------------------------------------------------- */
    corps_rivalry: [
      {
        pair: ["INF", "CAB"],
        a: "¡Dile a tu rocín que deje de salpicarme barro en el jubón, señorito de las espuelas!",
        b: "Si tus piececitos anduvieran más de un hexágono por turno, irías delante del barro, caracol con pica."
      },
      {
        pair: ["INF", "SIE"],
        a: "¡Cuidado con hacia dónde apuntas esa máquina de percusión, loco de los engranajes!",
        b: "La trayectoria balística era perfecta, muchacho. Tu cráneo simplemente no figuraba en mis ecuaciones."
      },
      {
        pair: ["ARC", "INF"],
        a: "Abrid paso a la élite táctica. Nosotros ganamos guerras sin mancharnos las botas de fango.",
        b: "Sois muy valientes a dos casillas de distancia, pero os soplan de cerca y corréis como conejos en celo."
      },
      {
        pair: ["CAB", "ARC"],
        a: "¿Esas flechas que disparas llevan veneno o simplemente esperas matar al rival de aburrimiento?",
        b: "Espera a que te flanqueen en un desfiladero y verás cómo suplicas que te cubra la retirada, jinete de feria."
      },
      {
        pair: ["BAR", "INF"],
        a: "¡Eh, infantes! ¡Mucho escudo reluciente, pero os ponéis verdes en cuanto subís a una balsa de transporte!",
        b: "¡Cállate y acércate a la orilla si quieres ver lo rápido que te convertimos en astillas de leña!"
      },
      {
        pair: ["SIE", "CAB"],
        a: "Apartad a los cuadrúpedos del camino. Estamos calibrando el tiro parabólico hacia el bastión.",
        b: "Como le hagáis un rasguño a la crin de mi yegua, os meto la palanca de torsión por donde la espalda pierde su nombre."
      },
      {
        pair: ["INF", "CAB"],
        a: "¡Tu caballo me ha confundido con un abrevadero!",
        b: "Al menos él sabe dónde está el agua; tú aún buscas la capital en el mapa."
      },
      {
        pair: ["INF", "SIE"],
        a: "¡Vuestra catapulta apunta a nuestra propia tienda!",
        b: "Era un tiro de advertencia... para que dejarais de roncar."
      },
      {
        pair: ["ARC", "INF"],
        a: "¿No os da vergüenza esconderos tras esos escudos mientras nosotros apuntamos?",
        b: "Esconderse es una técnica de supervivencia; deberíais probarla entre flechas."
      },
      {
        pair: ["CAB", "ARC"],
        a: "¡Disparad a los de enfrente, no a la crin de mi caballo!",
        b: "El viento, la prisa y vuestra crin son un trío difícil de contentar."
      },
      {
        pair: ["BAR", "INF"],
        a: "¡Desde aquí arriba veo todo el desastre que llamáis formación!",
        b: "Y desde aquí abajo olemos todo el pescado que llamáis provisiones."
      },
      {
        pair: ["SIE", "CAB"],
        a: "¡Apartad ese caballo del mecanismo! ¡Se ha comido la cuerda de tensión!",
        b: "Pues tirad con la otra. Y dejad de darle ideas raras a mi yegua."
      }
    ],

    /* ---------------------------------------------------------------------
       6. EDIFICIOS Y ASENTAMIENTOS (VOCES DE ESTRUCTURAS Y CAPATACES)
       Burocracia exasperante, quejas de obra y orgullo urbano
       --------------------------------------------------------------------- */
    settlement_barks: {
      camp: [
        "Esto no es un campamento militar, Canciller: son cuatro lonas raídas y una cabra atada a un poste.",
        "Tenemos más goteras que tela. Si no juntas 25 de madera para hacernos un Pueblo, la próxima lluvia nos disuelve.",
        "Huele a repollo hervido y calcetines mojados. Exijo una partida presupuestaria para ambientadores de pino.",
        "Aquí dormimos cinco en una lona y el perro ocupa la mejor esquina. Necesitamos un pueblo, señor.",
        "El cocinero ha bautizado el guiso 'asedio de invierno'. No pregunte por los ingredientes."
      ],
      bastion_empty: [
        "Cuatro varas de piedra de sillar, foso de brea y almenas talladas... ¡y ni un solo soldado dentro custodiando!",
        "Como venga un cañón rival de visita, este bastión se rinde solo por falta de personal.",
        "Las corrientes de aire aquí dentro son dignas de un mausoleo. ¡Mándame una guarnición o alquilo las torres!"
      ],
      bastion_garrisoned: [
        "Guarnición apostada y calderos de aceite hirviendo listos. Que vengan esos miserables a probar la mampostería.",
        "Aquí dentro estamos apretados como sardinas en barril, pero al menos la piedra frena las flechas."
      ],
      village: [
        "Los campesinos están contentos: hoy solo hemos requisado la mitad de la cosecha de grano para las tropas.",
        "El mercado huele a pan tierno y cerveza tibia. No mande soldados de permiso aquí, señor, que nos espantan la clientela.",
        "Crecemos a buen ritmo. Asegúrese de que las calzadas sigan limpias de maleza y de forajidos.",
        "El mercado pide calzada y el herrero pide carbón. Nadie pide menos impuestos, lo cual es sospechoso.",
        "Los niños juegan a los asedios en la plaza. Le ruego que no les enseñe el juego real."
      ],
      city: [
        "La metrópoli prospera, Canciller. Las arcas tintinean y los artesanos fabrican pertrechos para la gloria del imperio.",
        "Si alguna vez caen los muros de esta capital, no se moleste en firmar la paz: la historia nos borrará del mapa.",
        "El panadero dice que el trigo está contado. El pueblo, que el pan está caro. Yo digo que nos falta una calzada.",
        "Los artesanos piden más madera y los recaudadores más oro. Usted decida qué lamento escuchar primero.",
        "La capital huele a humo y a tinta de mapas. Señal de que algo se está tramando... o de que arde el archivo.",
        "Hay tres carretas esperando en la puerta. Dos traen grano; la tercera, preguntas."
      ],
      road: [
        "Calzada de piedra pulida: velocidad cuádruple para las legiones y cero barro en los carromatos de avituallamiento."
      ]
    },

    /* ---------------------------------------------------------------------
       6b. APERTURA DE PARTIDA (CAPITAL + PRIMERA UNIDAD)
       Diálogo garantizado al empezar, cuando aún no hay dos unidades.
       --------------------------------------------------------------------- */
    opening: [
      [
        { role: "CITY", text: "Canciller, la capital resiste. Una unidad monta guardia en la puerta." },
        { role: "ANY", text: "¿Solo una? Entonces que el enemigo traiga sillas, esto será una charla." },
        { role: "CITY", text: "No confunda valor con logística, señor. Aún no tenemos ni una calzada." }
      ],
      [
        { role: "CITY", text: "Las arcas están abiertas y el trigo cuenta sus granos. ¿Qué ordena, Canciller?" },
        { role: "ANY", text: "Que nadie toque el trigo. Primero los caminos, después el pan." },
        { role: "CITY", text: "Sabia decisión. La última vez que alguien dijo eso, el pan llegó en carreta... volcada." }
      ],
      [
        { role: "CITY", text: "La frontera está en silencio. Demasiado silencio para mi gusto." },
        { role: "ANY", text: "El silencio es barato. Las murallas, no." },
        { role: "CITY", text: "Pues empecemos por lo barato: una piedra a la vez." }
      ],
      [
        { role: "CITY", text: "El mapa está desplegado, Canciller. ¿Por dónde empezamos?" },
        { role: "ANY", text: "Por no perder la capital antes del almuerzo." },
        { role: "CITY", text: "Ambición modesta. Me gusta. Empiece por una calzada y veremos." }
      ]
    ],

    /* ---------------------------------------------------------------------
       7. RESPUESTAS DE INTERRUPCIÓN "¡A CALLAR!"
       Micro-burbujas instantáneas cuando el jugador toca una pieza que habla
       --------------------------------------------------------------------- */
    interruptions: [
      "¡Glup! ¡El Canciller nos mira!",
      "¡A formar, que viene orden!",
      "¡Bueno, bueno, ya voy!",
      "¡Cierro el pico y muevo el pie!",
      "¡Menos charla y más suela de bota!",
      "¡Por el mísero sueldo que cobro no discuto!",
      "¡A la orden, excelencia!",
      "¡Hablamos luego, si seguimos vivos!",
      "¡Traga saliva y ponte firme!",
      "¡Se acabó el recreo, muchachos!",
      "¡Ya muevo la ficha, no me mires con esa cara!",
      "¡A sus órdenes, mi táctico señor!",
      "¡Ya va, ya va, no me chille!",
      "¡Que me quito el yelmo y todo!",
      "¡Por fin una orden que no sea cavar!",
      "¡A ver si esta vez no nos mandan a la nieve!",
      "¡Marcho, aunque no sé a dónde!",
      "¡Silencio de cuartel, que hay trabajo!",
      "¡Ni una palabra más, mi señor!",
      "¡Que me llamen cuando haya pan!",
      "¡A la carga, que se enfría la sopa!",
      "¡Obedeciendo, que es gerundio!"
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
