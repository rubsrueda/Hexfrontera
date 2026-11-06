/* ===========================================================================
 * lore-data.js — Textos de la pantalla de introducción (HexFrontier)
 * Fuente: especificacion_pantalla_lore.md, punto 2 "Diseño visual".
 *
 * Estructura:
 *   HF.LORE.pages  → metadatos comunes (id, arte y maquetación)
 *   HF.LORE.langs  → un diccionario de textos por idioma (los 13 de HF.LANGS)
 *
 * Script clásico: expone window.HF.LORE (sin módulos, sin bundler).
 * =========================================================================== */
(function (G) {
  var HF = G.HF = G.HF || {};

  HF.LORE = {
    /* ---------------------------------------------------------------------
     * Estructura común (no se traduce).
     * layout: 'art'   → ilustración a sangre (recorte + ken burns)
     *         'shot'  → captura de juego: se muestra completa, enmarcada
     *         'strip' → tira panorámica (barra superior / botones)
     * ------------------------------------------------------------------- */
    pages: [
      { id: 'imperio', art: 'art/escena.png', layout: 'art' },
      { id: 'juego', art: 'art/pantalla.png', layout: 'shot' },
      { id: 'mapa', art: 'art/mapa.png', layout: 'shot' },
      { id: 'informacion', art: 'art/informacion.png', layout: 'strip' },
      { id: 'ordenes', art: 'art/botones.png', layout: 'strip' }
    ],

    /* --------------------------------------------------------------------- */
    langs: {

      /* ---------------------------------------------------------------- ES */
      es: {
        kicker: 'CRÓNICAS DE LA FRONTERA',
        chapter: 'Capítulo I · El Cálculo del Acero',
        dontShowAgain: 'No volver a mostrar esta introducción',
        labels: { prev: '← ATRÁS', next: 'SIGUIENTE →', start: 'ENTRAR AL TABLERO', skip: 'Saltar introducción' },
        pages: {
          imperio: {
            title: 'EL FIN DE UN IMPERIO',
            blocks: [
              { p: 'Año 500 d.C. El Imperio de Occidente es solo un recuerdo.' },
              { p: 'Sobre sus cenizas, los antiguos Federati han dejado de ser guerreros a sueldo para convertirse en señores soberanos. En un mundo donde los caminos han colapsado y el comercio se ha extinguido, la supervivencia depende de la autarquía: fortificar la colina, segar el trigo y talar el bosque.' },
              { p: 'Sin un estado que dicte justicia, la guerra no es una excepción, es la norma. Para estos señores armados, el control de cada desfiladero, río y cosecha se decide a sangre y fuego.' },
              { lead: 'Tu feudo está rodeado. Impon tu lealtad o perece.' }
            ]
          },
          juego: {
            title: 'LA BATALLA POR LA FRONTERA',
            blocks: [
              { p: 'Partidas tácticas y dinámicas de 20 minutos sobre un tablero hexagonal donde dos señores se enfrentan por la supremacía del territorio.' },
              { ul: [
                { b: 'Gestiona tus Tierras y sus Recursos:', t: 'domina las casillas con oro, trigo y madera para sostener tu economía de guerra y expandir tus dominios.' },
                { b: 'Construye y Recluta:', t: 'erige asentamientos y levanta divisiones militares desde tu bastión para dominar las casillas clave.' },
                { b: 'Conquista:', t: 'estrangula las líneas de suministro de tu rival y erradica su ciudad para reclamar el territorio.' }
              ] }
            ]
          },
          mapa: {
            title: 'EL TEATRO DE OPERACIONES',
            blocks: [
              { p: 'El mundo está forjado por hexágonos de llanura, colina y montaña, donde brotan valiosos recursos como trigo, madera y oro.' },
              { p: 'Los bosques densos bloquean el paso y deben ser talados por tus soldados para despejar la tierra. Cada casilla teñida con tus colores alimenta las arcas de tu civilización y expande tu dominio.' }
            ]
          },
          informacion: {
            title: 'CONTROL DE RECURSOS Y ESTADO',
            blocks: [
              { p: 'En la parte superior de la pantalla dispones del menú principal, el indicador de turno y el estado de tus reservas.' },
              { p: 'Desde aquí vigilas el flujo de tus tres bienes esenciales (oro, trigo y madera) y sus balances por turno, además de alternar entre las diferentes vistas tácticas: normal, de combate, política y de recursos.' }
            ]
          },
          ordenes: {
            title: 'DOCTRINA DE ACCIÓN',
            blocks: [
              { p: 'En la base de operaciones se sitúan tus órdenes fundamentales: erigir asentamientos para desarrollar y asegurar terreno, reclutar divisiones militares para el frente, deshacer maniobras si necesitas corregir una estrategia, y finalizar el turno cuando tus movimientos estén fijados.' },
              { lead: 'Tu objetivo principal es claro: conquistar y eliminar todas las ciudades rivales.' }
            ]
          }
        }
      },

      /* ---------------------------------------------------------------- EN */
      en: {
        kicker: 'CHRONICLES OF THE FRONTIER',
        chapter: 'Chapter I · The Calculus of Steel',
        dontShowAgain: "Don't show this introduction again",
        labels: { prev: '← BACK', next: 'NEXT →', start: 'ENTER THE BOARD', skip: 'Skip introduction' },
        pages: {
          imperio: {
            title: 'THE END OF AN EMPIRE',
            blocks: [
              { p: '500 AD. The Western Empire is only a memory.' },
              { p: 'Upon its ashes, the old Federati have ceased to be mercenaries and become sovereign lords. In a world where roads have collapsed and trade has died out, survival depends on autarky: fortify the hill, reap the wheat and fell the forest.' },
              { p: 'With no state to dispense justice, war is not the exception but the rule. For these armed lords, control of every pass, river and harvest is settled in blood and fire.' },
              { lead: 'Your fief is surrounded. Impose your loyalty or perish.' }
            ]
          },
          juego: {
            title: 'THE BATTLE FOR THE FRONTIER',
            blocks: [
              { p: 'Tactical, dynamic 20-minute matches on a hexagonal board where two lords clash for supremacy over the territory.' },
              { ul: [
                { b: 'Manage your Lands and their Resources:', t: 'control the tiles with gold, wheat and wood to sustain your war economy and expand your domains.' },
                { b: 'Build and Recruit:', t: 'raise settlements and muster military divisions from your bastion to dominate the key tiles.' },
                { b: 'Conquer:', t: "strangle your rival's supply lines and eradicate their city to claim the territory." }
              ] }
            ]
          },
          mapa: {
            title: 'THE THEATRE OF OPERATIONS',
            blocks: [
              { p: 'The world is forged from hexes of plain, hill and mountain, where valuable resources such as wheat, wood and gold sprout.' },
              { p: 'Dense forests block the way and must be cleared by your soldiers. Every tile tinted with your colours feeds your civilization’s coffers and expands your domain.' }
            ]
          },
          informacion: {
            title: 'RESOURCES AND STATUS',
            blocks: [
              { p: 'At the top of the screen you have the main menu, the turn indicator and the state of your reserves.' },
              { p: 'From there you watch the flow of your three essential goods (gold, wheat and wood) and their per-turn balances, and switch between the tactical views: normal, combat, politics and resources.' }
            ]
          },
          ordenes: {
            title: 'DOCTRINE OF ACTION',
            blocks: [
              { p: 'At your base of operations sit your fundamental orders: raise settlements to develop and secure ground, recruit military divisions for the front, undo manoeuvres if you must correct a strategy, and end the turn once your moves are set.' },
              { lead: 'Your main objective is clear: conquer and eliminate every rival city.' }
            ]
          }
        }
      },

      /* ---------------------------------------------------------------- FR */
      fr: {
        kicker: 'CHRONIQUES DE LA FRONTIÈRE',
        chapter: "Chapitre I · Le Calcul de l'Acier",
        dontShowAgain: 'Ne plus afficher cette introduction',
        labels: { prev: '← RETOUR', next: 'SUIVANT →', start: 'ENTRER SUR LE PLATEAU', skip: "Passer l'introduction" },
        pages: {
          imperio: {
            title: "LA FIN D'UN EMPIRE",
            blocks: [
              { p: "An 500 apr. J.-C. L'Empire d'Occident n'est plus qu'un souvenir." },
              { p: "Sur ses cendres, les anciens Federati ont cessé d'être des guerriers à solde pour devenir des seigneurs souverains. Dans un monde où les routes se sont effondrées et où le commerce s'est éteint, la survie dépend de l'autarcie : fortifier la colline, moissonner le blé et abattre la forêt." },
              { p: "Sans État pour rendre la justice, la guerre n'est pas une exception, c'est la norme. Pour ces seigneurs armés, le contrôle de chaque défilé, rivière et récolte se règle dans le sang et le feu." },
              { lead: 'Ton fief est encerclé. Impose ta loyauté ou péris.' }
            ]
          },
          juego: {
            title: 'LA BATAILLE POUR LA FRONTIÈRE',
            blocks: [
              { p: "Des parties tactiques et dynamiques de 20 minutes sur un plateau hexagonal où deux seigneurs s'affrontent pour la suprématie du territoire." },
              { ul: [
                { b: 'Gère tes Terres et leurs Ressources :', t: "domine les cases d'or, de blé et de bois pour soutenir ton économie de guerre et étendre tes domaines." },
                { b: 'Construis et Recrute :', t: 'érige des campements et lève des divisions militaires depuis ton bastion pour dominer les cases clés.' },
                { b: 'Conquiers :', t: 'étrangle les lignes de ravitaillement de ton rival et éradique sa cité pour revendiquer le territoire.' }
              ] }
            ]
          },
          mapa: {
            title: 'LE THÉÂTRE DES OPÉRATIONS',
            blocks: [
              { p: "Le monde est façonné d'hexagones de plaine, de colline et de montagne, où poussent des ressources précieuses comme le blé, le bois et l'or." },
              { p: 'Les forêts denses bloquent le passage et doivent être abattues par tes soldats pour dégager la terre. Chaque case teintée de tes couleurs alimente les caisses de ta civilisation et étend ton domaine.' }
            ]
          },
          informacion: {
            title: 'CONTRÔLE DES RESSOURCES ET DU STATUT',
            blocks: [
              { p: "En haut de l'écran, tu disposes du menu principal, de l'indicateur de tour et de l'état de tes réserves." },
              { p: 'De là, tu surveilles le flux de tes trois biens essentiels (or, blé et bois) et leurs bilans par tour, et tu alternes entre les différentes vues tactiques : normale, de combat, politique et de ressources.' }
            ]
          },
          ordenes: {
            title: "DOCTRINE D'ACTION",
            blocks: [
              { p: "À la base d'opérations se trouvent tes ordres fondamentaux : ériger des campements pour développer et sécuriser le terrain, recruter des divisions militaires pour le front, annuler des manœuvres s'il faut corriger une stratégie, et terminer le tour une fois tes mouvements fixés." },
              { lead: 'Ton objectif principal est clair : conquérir et éliminer toutes les cités rivales.' }
            ]
          }
        }
      },

      /* ---------------------------------------------------------------- DE */
      de: {
        kicker: 'CHRONIKEN DER GRENZE',
        chapter: 'Kapitel I · Die Berechnung des Stahls',
        dontShowAgain: 'Diese Einführung nicht mehr anzeigen',
        labels: { prev: '← ZURÜCK', next: 'WEITER →', start: 'BRETT BETRETEN', skip: 'Einführung überspringen' },
        pages: {
          imperio: {
            title: 'DAS ENDE EINES IMPERIUMS',
            blocks: [
              { p: '500 n. Chr. Das Westreich ist nur noch eine Erinnerung.' },
              { p: 'Auf seinen Trümmern haben die alten Federati aufgehört, Söldner zu sein, und sind souveräne Herren geworden. In einer Welt, in der die Straßen zerfallen und der Handel erloschen ist, hängt das Überleben von Autarkie ab: den Hügel befestigen, den Weizen ernten und den Wald roden.' },
              { p: 'Ohne einen Staat, der Recht spricht, ist Krieg keine Ausnahme, sondern die Regel. Für diese bewaffneten Herren entscheidet sich die Kontrolle über jeden Pass, jeden Fluss und jede Ernte in Blut und Feuer.' },
              { lead: 'Dein Lehen ist umzingelt. Erzwinge deine Gefolgschaft oder geh zugrunde.' }
            ]
          },
          juego: {
            title: 'DER KAMPF UM DIE GRENZE',
            blocks: [
              { p: 'Taktische, dynamische Partien von 20 Minuten auf einem hexagonalen Brett, auf dem zwei Herren um die Vorherrschaft über das Gebiet ringen.' },
              { ul: [
                { b: 'Verwalte deine Ländereien und ihre Ressourcen:', t: 'beherrsche die Felder mit Gold, Weizen und Holz, um deine Kriegswirtschaft zu tragen und deine Gebiete auszudehnen.' },
                { b: 'Baue und rekrutiere:', t: 'errichte Siedlungen und stelle Militärdivisionen von deiner Bastion auf, um die Schlüsselfelder zu beherrschen.' },
                { b: 'Erobere:', t: 'schnüre die Versorgungslinien deines Rivalen ab und vernichte seine Stadt, um das Gebiet zu beanspruchen.' }
              ] }
            ]
          },
          mapa: {
            title: 'DER SCHAUPLATZ DER OPERATIONEN',
            blocks: [
              { p: 'Die Welt besteht aus Hexagonen aus Ebene, Hügel und Gebirge, auf denen wertvolle Ressourcen wie Weizen, Holz und Gold wachsen.' },
              { p: 'Dichte Wälder versperren den Weg und müssen von deinen Soldaten gerodet werden. Jedes Feld in deinen Farben füllt die Kassen deiner Zivilisation und dehnt deine Herrschaft aus.' }
            ]
          },
          informacion: {
            title: 'ROHSTOFFE UND STATUS',
            blocks: [
              { p: 'Oben auf dem Bildschirm findest du das Hauptmenü, die Rundenanzeige und den Stand deiner Vorräte.' },
              { p: 'Von dort überwachst du den Fluss deiner drei wesentlichen Güter (Gold, Weizen und Holz) und ihre Bilanzen pro Runde und wechselst zwischen den taktischen Ansichten: normal, Kampf, Politik und Ressourcen.' }
            ]
          },
          ordenes: {
            title: 'DOKTRIN DES HANDELNS',
            blocks: [
              { p: 'An deiner Operationsbasis stehen deine grundlegenden Befehle: Siedlungen errichten, um Gelände zu entwickeln und zu sichern, Militärdivisionen für die Front rekrutieren, Manöver rückgängig machen, wenn du eine Strategie korrigieren musst, und die Runde beenden, sobald deine Züge feststehen.' },
              { lead: 'Dein Hauptziel ist klar: erobere und vernichte alle feindlichen Städte.' }
            ]
          }
        }
      },

      /* ---------------------------------------------------------------- IT */
      it: {
        kicker: 'CRONACHE DELLA FRONTIERA',
        chapter: "Capitolo I · Il Calcolo dell'Acciaio",
        dontShowAgain: 'Non mostrare più questa introduzione',
        labels: { prev: '← INDIETRO', next: 'AVANTI →', start: 'ENTRA NEL TABELLONE', skip: "Salta l'introduzione" },
        pages: {
          imperio: {
            title: 'LA FINE DI UN IMPERO',
            blocks: [
              { p: "Anno 500 d.C. L'Impero d'Occidente è solo un ricordo." },
              { p: "Sulle sue ceneri, gli antichi Federati hanno smesso di essere mercenari per diventare signori sovrani. In un mondo dove le strade sono crollate e il commercio si è estinto, la sopravvivenza dipende dall'autarchia: fortificare la collina, mietere il grano e abbattere la foresta." },
              { p: "Senza uno stato che amministri la giustizia, la guerra non è un'eccezione, è la norma. Per questi signori armati, il controllo di ogni passo, fiume e raccolto si decide a sangue e fuoco." },
              { lead: 'Il tuo feudo è circondato. Imponi la tua lealtà o perisci.' }
            ]
          },
          juego: {
            title: 'LA BATTAGLIA PER LA FRONTIERA',
            blocks: [
              { p: 'Partite tattiche e dinamiche da 20 minuti su un tabellone esagonale dove due signori si sfidano per la supremazia del territorio.' },
              { ul: [
                { b: 'Gestisci le tue Terre e le loro Risorse:', t: "domina le caselle con oro, grano e legno per sostenere la tua economia di guerra ed espandere i tuoi domini." },
                { b: 'Costruisci e Recluta:', t: 'erigi insediamenti e levanta divisioni militari dal tuo bastione per dominare le caselle chiave.' },
                { b: 'Conquista:', t: 'strangola le linee di rifornimento del rivale ed eradica la sua città per rivendicare il territorio.' }
              ] }
            ]
          },
          mapa: {
            title: 'IL TEATRO DELLE OPERAZIONI',
            blocks: [
              { p: 'Il mondo è forgiato da esagoni di pianura, collina e montagna, dove crescono risorse preziose come grano, legno e oro.' },
              { p: 'Le foreste fitte bloccano il passaggio e devono essere abbattute dai tuoi soldati per liberare la terra. Ogni casella tinta dei tuoi colori alimenta le casse della tua civiltà ed espande il tuo dominio.' }
            ]
          },
          informacion: {
            title: 'CONTROLLO DELLE RISORSE E DELLO STATO',
            blocks: [
              { p: "Nella parte alta dello schermo hai il menu principale, l'indicatore di turno e lo stato delle tue riserve." },
              { p: 'Da qui vigili il flusso dei tuoi tre beni essenziali (oro, grano e legno) e i loro bilanci per turno, e alterni tra le diverse viste tattiche: normale, di combattimento, politica e delle risorse.' }
            ]
          },
          ordenes: {
            title: "DOTTRINA D'AZIONE",
            blocks: [
              { p: 'Alla base operativa si trovano i tuoi ordini fondamentali: erigere insediamenti per sviluppare e assicurare il terreno, reclutare divisioni militari per il fronte, annullare manovre se devi correggere una strategia, e terminare il turno quando le tue mosse sono fissate.' },
              { lead: 'Il tuo obiettivo principale è chiaro: conquistare ed eliminare tutte le città rivali.' }
            ]
          }
        }
      },

      /* ---------------------------------------------------------------- PT */
      pt: {
        kicker: 'CRÓNICAS DA FRONTEIRA',
        chapter: 'Capítulo I · O Cálculo do Aço',
        dontShowAgain: 'Não mostrar esta introdução novamente',
        labels: { prev: '← VOLTAR', next: 'SEGUINTE →', start: 'ENTRAR NO TABULEIRO', skip: 'Saltar introdução' },
        pages: {
          imperio: {
            title: 'O FIM DE UM IMPÉRIO',
            blocks: [
              { p: 'Ano 500 d.C. O Império do Ocidente é apenas uma memória.' },
              { p: 'Sobre as suas cinzas, os antigos Federati deixaram de ser guerreiros assalariados para se tornarem senhores soberanos. Num mundo onde os caminhos colapsaram e o comércio se extinguiu, a sobrevivência depende da autarquia: fortificar a colina, ceifar o trigo e derrubar a floresta.' },
              { p: 'Sem um estado que faça justiça, a guerra não é exceção, é a norma. Para estes senhores armados, o controlo de cada desfiladeiro, rio e colheita decide-se a sangue e fogo.' },
              { lead: 'O teu feudo está cercado. Impõe a tua lealdade ou perece.' }
            ]
          },
          juego: {
            title: 'A BATALHA PELA FRONTEIRA',
            blocks: [
              { p: 'Partidas táticas e dinâmicas de 20 minutos num tabuleiro hexagonal onde dois senhores se enfrentam pela supremacia do território.' },
              { ul: [
                { b: 'Gere as tuas Terras e os seus Recursos:', t: 'domina as casas com ouro, trigo e madeira para sustentar a tua economia de guerra e expandir os teus domínios.' },
                { b: 'Constrói e Recruta:', t: 'ergue povoações e levanta divisões militares a partir do teu bastião para dominar as casas-chave.' },
                { b: 'Conquista:', t: 'estrangula as linhas de abastecimento do rival e erradica a sua cidade para reclamar o território.' }
              ] }
            ]
          },
          mapa: {
            title: 'O TEATRO DE OPERAÇÕES',
            blocks: [
              { p: 'O mundo é forjado por hexágonos de planície, colina e montanha, onde brotam recursos valiosos como trigo, madeira e ouro.' },
              { p: 'As florestas densas bloqueiam a passagem e têm de ser derrubadas pelos teus soldados para libertar a terra. Cada casa tingida com as tuas cores alimenta os cofres da tua civilização e expande o teu domínio.' }
            ]
          },
          informacion: {
            title: 'CONTROLO DE RECURSOS E ESTADO',
            blocks: [
              { p: 'No topo do ecrã tens o menu principal, o indicador de turno e o estado das tuas reservas.' },
              { p: 'A partir daí vigias o fluxo dos teus três bens essenciais (ouro, trigo e madeira) e os seus balanços por turno, além de alternar entre as vistas táticas: normal, de combate, política e de recursos.' }
            ]
          },
          ordenes: {
            title: 'DOUTRINA DE AÇÃO',
            blocks: [
              { p: 'Na base de operações estão as tuas ordens fundamentais: erguer povoações para desenvolver e assegurar terreno, recrutar divisões militares para a frente, desfazer manobras se precisares de corrigir uma estratégia, e terminar o turno quando os teus movimentos estiverem fixados.' },
              { lead: 'O teu objetivo principal é claro: conquistar e eliminar todas as cidades rivais.' }
            ]
          }
        }
      },

      /* ---------------------------------------------------------------- RU */
      ru: {
        kicker: 'ХРОНИКИ ГРАНИЦЫ',
        chapter: 'Глава I · Расчёт стали',
        dontShowAgain: 'Больше не показывать это вступление',
        labels: { prev: '← НАЗАД', next: 'ДАЛЕЕ →', start: 'ВОЙТИ НА ПОЛЕ', skip: 'Пропустить вступление' },
        pages: {
          imperio: {
            title: 'КОНЕЦ ИМПЕРИИ',
            blocks: [
              { p: '500 год н. э. Западная империя — лишь воспоминание.' },
              { p: 'На её пепле прежние федераты перестали быть наёмниками и стали суверенными господами. В мире, где дороги разрушены, а торговля угасла, выживание зависит от самодостаточности: укрепить холм, сжать пшеницу и вырубить лес.' },
              { p: 'Без государства, вершащего суд, война не исключение, а правило. Для этих вооружённых господ контроль над каждым перевалом, рекой и урожаем решается кровью и огнём.' },
              { lead: 'Твой феод окружён. Навяжи свою верность или погибни.' }
            ]
          },
          juego: {
            title: 'БИТВА ЗА ГРАНИЦУ',
            blocks: [
              { p: 'Тактические динамичные партии по 20 минут на шестиугольном поле, где два господина сражаются за господство над территорией.' },
              { ul: [
                { b: 'Управляй своими землями и ресурсами:', t: 'владей клетками с золотом, пшеницей и деревом, чтобы держать военную экономику и расширять владения.' },
                { b: 'Строй и набирай:', t: 'возводи поселения и поднимай воинские соединения из своей цитадели, чтобы захватить ключевые клетки.' },
                { b: 'Покоряй:', t: 'перережь пути снабжения соперника и уничтожь его город, чтобы заявить права на территорию.' }
              ] }
            ]
          },
          mapa: {
            title: 'ТЕАТР ВОЕННЫХ ДЕЙСТВИЙ',
            blocks: [
              { p: 'Мир сложен из гексов равнины, холма и горы, где произрастают ценные ресурсы: пшеница, дерево и золото.' },
              { p: 'Густые леса преграждают путь, и твои солдаты должны их вырубать, чтобы освободить землю. Каждая клетка в твоих цветах наполняет казну цивилизации и расширяет твои владения.' }
            ]
          },
          informacion: {
            title: 'РЕСУРСЫ И СОСТОЯНИЕ',
            blocks: [
              { p: 'В верхней части экрана находятся главное меню, указатель хода и состояние твоих запасов.' },
              { p: 'Отсюда ты следишь за потоком трёх основных благ (золото, пшеница и дерево) и их балансом за ход, а также переключаешь тактические виды: обычный, боевой, политический и ресурсный.' }
            ]
          },
          ordenes: {
            title: 'ДОКТРИНА ДЕЙСТВИЙ',
            blocks: [
              { p: 'В основе операций лежат твои главные приказы: возводить поселения, чтобы развивать и закреплять землю; набирать воинские соединения для фронта; отменять манёвры, если нужно исправить стратегию; и завершать ход, когда движения определены.' },
              { lead: 'Твоя главная цель ясна: покорить и уничтожить все города соперников.' }
            ]
          }
        }
      },

      /* ---------------------------------------------------------------- ZH */
      zh: {
        kicker: '边境编年史',
        chapter: '第一章 · 钢铁的算计',
        dontShowAgain: '不再显示此介绍',
        labels: { prev: '← 返回', next: '下一步 →', start: '进入棋盘', skip: '跳过介绍' },
        pages: {
          imperio: {
            title: '帝国的终结',
            blocks: [
              { p: '公元500年。西方帝国只剩回忆。' },
              { p: '在它的灰烬之上，昔日的联邦兵不再是雇佣战士，而成为自主的领主。道路崩塌、贸易消亡的世界里，生存取决于自给自足：加固山丘、收割小麦、砍伐森林。' },
              { p: '没有主持正义的国家，战争便不是例外，而是常态。对这些武装领主而言，每一条隘口、河流与收成的控制权，都以血与火决定。' },
              { lead: '你的封地被包围了。让他们臣服，或者灭亡。' }
            ]
          },
          juego: {
            title: '边境之战',
            blocks: [
              { p: '在六边形棋盘上进行20分钟的战术快节奏对局，两位领主争夺领土的霸权。' },
              { ul: [
                { b: '经营你的土地与资源：', t: '占领带有黄金、小麦与木材的格子，以支撑战争经济并扩张领地。' },
                { b: '建造与招募：', t: '从你的堡垒兴建聚落、组建军团，以控制关键格子。' },
                { b: '征服：', t: '掐断对手的补给线，摧毁其城市，从而宣示领土。' }
              ] }
            ]
          },
          mapa: {
            title: '作战舞台',
            blocks: [
              { p: '世界由平原、丘陵与山脉的六边形构成，其中生长着小麦、木材与黄金等珍贵资源。' },
              { p: '茂密的森林阻断道路，必须由你的士兵砍伐以清理土地。每一格染上你的颜色，都会充实文明的国库并扩张你的领地。' }
            ]
          },
          informacion: {
            title: '资源与状态控制',
            blocks: [
              { p: '屏幕上方有主菜单、回合指示以及你的储备状况。' },
              { p: '在这里你监视三种必需物资（黄金、小麦和木材）的流动与每回合收支，并可在不同战术视图间切换：普通、战斗、政治与资源。' }
            ]
          },
          ordenes: {
            title: '行动准则',
            blocks: [
              { p: '在作战基地上是你的基本指令：兴建聚落以发展并确保土地、招募军团投入前线、在需要修正策略时撤销操作，以及在移动确定后结束回合。' },
              { lead: '你的主要目标很明确：征服并消灭所有敌对城市。' }
            ]
          }
        }
      },

      /* ---------------------------------------------------------------- JA */
      ja: {
        kicker: '辺境の年代記',
        chapter: '第一章 · 鋼の計算',
        dontShowAgain: 'この紹介を今後表示しない',
        labels: { prev: '← 戻る', next: '次へ →', start: '盤面へ入る', skip: '紹介をスキップ' },
        pages: {
          imperio: {
            title: '帝国の終焉',
            blocks: [
              { p: '西暦500年。西方帝国はもはや記憶にすぎない。' },
              { p: 'その灰の上で、かつてのフェデラティは傭兵であることをやめ、自立した領主となった。街道が崩れ、交易が絶えた世界では、生存は自給自足にかかっている。丘を要塞化し、小麦を刈り、森を伐り開くのだ。' },
              { p: '正義を定める国家がなければ、戦争は例外ではなく常態となる。武装した領主たちにとって、すべての峠、川、そして収穫の支配は血と炎で決まる。' },
              { lead: '汝の封土は包囲されている。忠誠を強いよ、さもなくば滅びよ。' }
            ]
          },
          juego: {
            title: '辺境をめぐる戦い',
            blocks: [
              { p: '六角形の盤上で、二人の領主が領土の覇権を争う、20分の戦術的でテンポの速い対戦。' },
              { ul: [
                { b: '土地と資源を管理せよ：', t: '金、小麦、木材のマスを支配し、戦時の経済を支えて領地を広げる。' },
                { b: '建設と徴兵：', t: '本拠から集落を築き、軍団を編成して要所のマスを支配する。' },
                { b: '征服せよ：', t: '相手の補給線を絞り、その都市を根絶やしにして領土を宣言する。' }
              ] }
            ]
          },
          mapa: {
            title: '作戦の舞台',
            blocks: [
              { p: '世界は平原・丘陵・山岳の六角形で形づくられ、小麦・木材・金といった貴重な資源が芽吹く。' },
              { p: '深い森は進路を塞ぎ、兵士が伐り開かねばならない。汝の色に染まったマスは文明の財庫を満たし、支配を広げる。' }
            ]
          },
          informacion: {
            title: '資源と状態の管理',
            blocks: [
              { p: '画面上部にはメインメニュー、ターン表示、そして備蓄の状態がある。' },
              { p: 'ここで三つの必需物資（金・小麦・木材）の流れとターンごとの収支を見守り、通常・戦闘・政治・資源の各戦術ビューを切り替えられる。' }
            ]
          },
          ordenes: {
            title: '行動の教義',
            blocks: [
              { p: '作戦基地には基本命令が並ぶ。土地を開発し確保するための集落の建設、前線への軍団の徴兵、戦略を修正するための操作の取り消し、そして移動を確定した後のターン終了。' },
              { lead: '主目標は明快だ。すべての敵都市を征服し、排除せよ。' }
            ]
          }
        }
      },

      /* ---------------------------------------------------------------- KO */
      ko: {
        kicker: '변경 연대기',
        chapter: '제1장 · 강철의 계산',
        dontShowAgain: '이 인트로를 다시 표시하지 않기',
        labels: { prev: '← 뒤로', next: '다음 →', start: '보드로 입장', skip: '인트로 건너뛰기' },
        pages: {
          imperio: {
            title: '제국의 종말',
            blocks: [
              { p: '서기 500년. 서방 제국은 이제 기억일 뿐이다.' },
              { p: '그 재 위에서 옛 페데라티는 용병을 그치고 자립한 영주가 되었다. 길이 무너지고 교역이 사라진 세계에서 생존은 자급자족에 달려 있다. 언덕을 요새화하고, 밀을 거두고, 숲을 베어라.' },
              { p: '정의를 세울 국가가 없으니 전쟁은 예외가 아니라 일상이다. 이 무장한 영주들에게 모든 고갯길과 강, 수확의 지배권은 피와 불로 결정된다.' },
              { lead: '그대의 영지는 포위되었다. 충성을 강요하거나, 멸망하라.' }
            ]
          },
          juego: {
            title: '변경을 위한 전투',
            blocks: [
              { p: '육각형 보드 위에서 두 영주가 영토의 패권을 다투는 20분의 전술적이고 역동적인 대국.' },
              { ul: [
                { b: '땅과 자원을 관리하라:', t: '금, 밀, 목재 타일을 장악해 전시 경제를 지탱하고 영역을 넓혀라.' },
                { b: '건설과 모집:', t: '본거지에서 정착지를 세우고 군단을 일으켜 핵심 타일을 지배하라.' },
                { b: '정복하라:', t: '상대의 보급선을 조이고 도시를 말살해 영토를 차지하라.' }
              ] }
            ]
          },
          mapa: {
            title: '작전의 무대',
            blocks: [
              { p: '세계는 평야·구릉·산악의 육각형으로 이루어져 있으며, 밀·목재·금 같은 귀중한 자원이 자란다.' },
              { p: '울창한 숲은 길을 막으므로 병사들이 베어 내야 한다. 그대의 색으로 물든 타일마다 문명의 금고를 채우고 영역을 넓힌다.' }
            ]
          },
          informacion: {
            title: '자원과 상태 관리',
            blocks: [
              { p: '화면 상단에는 메인 메뉴, 턴 표시, 그리고 비축량 상태가 있다.' },
              { p: '여기서 세 가지 필수 물자(금·밀·목재)의 흐름과 턴당 수지를 살피고, 일반·전투·정치·자원의 전술 보기를 전환한다.' }
            ]
          },
          ordenes: {
            title: '행동 교리',
            blocks: [
              { p: '작전 기지에는 기본 명령이 있다. 땅을 개발하고 확보하기 위한 정착지 건설, 전선을 위한 군단 모집, 전략을 바로잡기 위한 되돌리기, 그리고 이동을 확정한 뒤의 턴 종료.' },
              { lead: '주된 목표는 분명하다. 모든 적 도시를 정복하고 제거하라.' }
            ]
          }
        }
      },

      /* ---------------------------------------------------------------- HI */
      hi: {
        kicker: 'सीमांत की गाथा',
        chapter: 'अध्याय I · इस्पात का गणित',
        dontShowAgain: 'यह परिचय दोबारा न दिखाएँ',
        labels: { prev: '← पीछे', next: 'आगे →', start: 'बोर्ड पर उतरें', skip: 'परिचय छोड़ें' },
        pages: {
          imperio: {
            title: 'एक साम्राज्य का अंत',
            blocks: [
              { p: 'ईस्वी 500। पश्चिमी साम्राज्य अब केवल एक स्मृति है।' },
              { p: 'उसकी राख पर, पुराने फ़ेडेराती अब वेतनभोगी योद्धा नहीं, स्वतंत्र सरदार बन गए हैं। जहाँ मार्ग ढह चुके हैं और व्यापार बुझ चुका है, वहाँ उत्तरजीविता आत्मनिर्भरता पर टिकी है: पहाड़ी को किलेबंद करो, गेहूँ काटो और वन काटो।' },
              { p: 'जहाँ न्याय का कोई राज्य नहीं, वहाँ युद्ध अपवाद नहीं, नियम है। इन सशस्त्र सरदारों के लिए हर दर्रा, नदी और फ़सल का नियंत्रण रक्त और आग से तय होता है।' },
              { lead: 'तुम्हारी जागीर घिरी हुई है। अपनी निष्ठा थोपो या मिट जाओ।' }
            ]
          },
          juego: {
            title: 'सीमांत के लिए युद्ध',
            blocks: [
              { p: 'षट्कोणीय बोर्ड पर 20 मिनट के रणनीतिक और गतिशील मुक़ाबले, जहाँ दो सरदार क्षेत्र की सर्वोच्चता के लिए भिड़ते हैं।' },
              { ul: [
                { b: 'अपनी भूमि और संसाधन सँभालो:', t: 'सोना, गेहूँ और लकड़ी वाले खानों पर अधिकार करो ताकि युद्ध-अर्थव्यवस्था टिके और सीमाएँ बढ़ें।' },
                { b: 'निर्माण और भर्ती:', t: 'अपने दुर्ग से बस्तियाँ बनाओ और सैन्य टुकड़ियाँ खड़ी करो ताकि मुख्य खानों पर राज हो।' },
                { b: 'विजय:', t: 'प्रतिद्वंद्वी की आपूर्ति लाइनें घोंटो और उसका नगर मिटाकर क्षेत्र पर दावा करो।' }
              ] }
            ]
          },
          mapa: {
            title: 'संचालन का रंगमंच',
            blocks: [
              { p: 'यह संसार मैदान, पहाड़ी और पर्वत के षट्कोणों से बना है, जहाँ गेहूँ, लकड़ी और सोना जैसे बहुमूल्य संसाधन उगते हैं।' },
              { p: 'घने वन मार्ग रोकते हैं और तुम्हारे सैनिकों को उन्हें काटकर भूमि खोलनी होती है। तुम्हारे रंग में रँगा हर खान तुम्हारी सभ्यता का कोष भरता है और तुम्हारा अधिकार बढ़ाता है।' }
            ]
          },
          informacion: {
            title: 'संसाधन और स्थिति नियंत्रण',
            blocks: [
              { p: 'स्क्रीन के ऊपर मुख्य मेन्यू, बारी-सूचक और तुम्हारे भंडार की स्थिति है।' },
              { p: 'यहीं से तुम तीन आवश्यक वस्तुओं (सोना, गेहूँ और लकड़ी) का प्रवाह और प्रति-बारी संतुलन देखते हो, और सामान्य, युद्ध, राजनीति व संसाधन के रणनीतिक दृश्यों के बीच बदलते हो।' }
            ]
          },
          ordenes: {
            title: 'कर्म का सिद्धांत',
            blocks: [
              { p: 'संचालन-आधार पर तुम्हारे मूल आदेश होते हैं: भूमि विकसित और सुरक्षित करने के लिए बस्तियाँ बनाना, मोर्चे के लिए सैन्य टुकड़ियाँ भरना, रणनीति सुधारने के लिए चालें पलटना, और चालें तय होने पर बारी समाप्त करना।' },
              { lead: 'तुम्हारा मुख्य लक्ष्य स्पष्ट है: सभी प्रतिद्वंद्वी नगरों को जीतो और मिटाओ।' }
            ]
          }
        }
      },

      /* ---------------------------------------------------------------- BN */
      bn: {
        kicker: 'সীমান্তের ইতিবৃত্ত',
        chapter: 'প্রথম অধ্যায় · ইস্পাতের হিসাব',
        dontShowAgain: 'এই পরিচিতি আর দেখাবেন না',
        labels: { prev: '← পিছনে', next: 'পরবর্তী →', start: 'বোর্ডে প্রবেশ', skip: 'পরিচিতি এড়িয়ে যান' },
        pages: {
          imperio: {
            title: 'এক সাম্রাজ্যের অবসান',
            blocks: [
              { p: 'খ্রিষ্টাব্দ ৫০০। পশ্চিমা সাম্রাজ্য এখন কেবল স্মৃতি।' },
              { p: 'তার ছাইয়ের উপর পুরোনো ফেদেরাতি আর ভাড়াটে যোদ্ধা নয়, সার্বভৌম প্রভু। যেখানে পথ ভেঙে পড়েছে ও বাণিজ্য নিভে গেছে, সেখানে টিকে থাকা নির্ভর করে স্বনির্ভরতার উপর: পাহাড় দুর্গম করো, গম কাটো আর বন কেটে ফেলো।' },
              { p: 'যেখানে বিচার করার রাষ্ট্র নেই, সেখানে যুদ্ধ ব্যতিক্রম নয়, নিয়ম। এই সশস্ত্র প্রভুদের কাছে প্রতিটি গিরিপথ, নদী ও ফসলের নিয়ন্ত্রণ রক্ত ও আগুনেই নির্ধারিত হয়।' },
              { lead: 'তোমার জায়গির ঘেরাও করা। আনুগত্য চাপিয়ে দাও, নয়তো বিনাশ।' }
            ]
          },
          juego: {
            title: 'সীমান্তের যুদ্ধ',
            blocks: [
              { p: 'ষড়ভুজ বোর্ডে ২০ মিনিটের কৌশলী ও গতিশীল লড়াই, যেখানে দুই প্রভু ভূখণ্ডের প্রাধান্যের জন্য মুখোমুখি হয়।' },
              { ul: [
                { b: 'তোমার ভূমি ও সম্পদ সামলাও:', t: 'সোনা, গম ও কাঠের ঘর দখল করো, যাতে যুদ্ধ-অর্থনীতি চলে ও রাজ্য বাড়ে।' },
                { b: 'নির্মাণ ও নিয়োগ:', t: 'দুর্গ থেকে বসতি গড়ো ও সৈন্যদল তোলো, যাতে মূল ঘরগুলো দখলে থাকে।' },
                { b: 'বিজয়:', t: 'প্রতিদ্বন্দ্বীর সরবরাহ লাইন চেপে ধরো এবং তার নগর নিঃশেষ করে ভূখণ্ড দাবি করো।' }
              ] }
            ]
          },
          mapa: {
            title: 'অভিযানের রঙ্গমঞ্চ',
            blocks: [
              { p: 'এই জগৎ সমতল, পাহাড়ি ও পর্বতের ষড়ভুজে গড়া, যেখানে গম, কাঠ ও সোনার মতো মূল্যবান সম্পদ জন্মায়।' },
              { p: 'ঘন বন পথ আটকায়, তোমার সৈন্যদের তা কেটে জমি পরিষ্কার করতে হয়। তোমার রঙে রাঙা প্রতিটি ঘর তোমার সভ্যতার ভান্ডার ভরে ও অধিকার বাড়ায়।' }
            ]
          },
          informacion: {
            title: 'সম্পদ ও অবস্থা নিয়ন্ত্রণ',
            blocks: [
              { p: 'পর্দার উপরে মূল মেনু, পালার সূচক ও তোমার মজুদের অবস্থা আছে।' },
              { p: 'এখান থেকেই তুমি তিনটি অপরিহার্য পণ্যের (সোনা, গম ও কাঠ) প্রবাহ ও প্রতি-পালার হিসাব দেখো, এবং সাধারণ, যুদ্ধ, রাজনীতি ও সম্পদ—এই কৌশলী দৃশ্যগুলো বদলাও।' }
            ]
          },
          ordenes: {
            title: 'কর্মের নীতি',
            blocks: [
              { p: 'অভিযান-ঘাঁটিতে তোমার মূল আদেশগুলো থাকে: জমি গড়ে তুলতে ও সুরক্ষিত করতে বসতি স্থাপন, রণক্ষেত্রের জন্য সৈন্যদল নিয়োগ, কৌশল শুধরাতে চাল প্রত্যাহার, এবং চাল চূড়ান্ত হলে পালা শেষ।' },
              { lead: 'তোমার মূল লক্ষ্য স্পষ্ট: সব প্রতিদ্বন্দ্বী নগর জয় করে নিঃশেষ করো।' }
            ]
          }
        }
      },

      /* ---------------------------------------------------------------- AR (RTL) */
      ar: {
        kicker: 'سجلات الحدود',
        chapter: 'الفصل الأول · حساب الفولاذ',
        dontShowAgain: 'عدم إظهار هذه المقدمة مجددًا',
        labels: { prev: 'السابق →', next: '← التالي', start: 'ادخل اللوح', skip: 'تخطي المقدمة' },
        pages: {
          imperio: {
            title: 'نهاية إمبراطورية',
            blocks: [
              { p: 'عام 500 ميلادي. الإمبراطورية الغربية لم تبقَ إلا ذكرى.' },
              { p: 'على رمادها، كفّ الفديراتي القدماء عن كونهم مرتزقة وأصبحوا سادة ذوي سيادة. في عالم انهارت فيه الطرق وانطفأت التجارة، يتوقف البقاء على الاكتفاء الذاتي: تحصين التل، وحصاد القمح، وقطع الغابة.' },
              { p: 'بلا دولة تُقيم العدل، فالحرب ليست استثناءً بل قاعدة. لهؤلاء السادة المسلحين، تُحسم السيطرة على كل ممر ونهر وحصاد بالدم والنار.' },
              { lead: 'إقطاعيتك محاصرة. افرض ولاءك أو اهلك.' }
            ]
          },
          juego: {
            title: 'معركة الحدود',
            blocks: [
              { p: 'مباريات تكتيكية سريعة من 20 دقيقة على لوح سداسي يتصارع فيه سيدان على السيادة على الأرض.' },
              { ul: [
                { b: 'أدر أرضك وموارده:', t: 'سيطر على الخلايا ذات الذهب والقمح والخشب لدعم اقتصاد الحرب وتوسيع نطاقك.' },
                { b: 'ابنِ وجنّد:', t: 'أنشئ مستوطنات وأقم فرقًا عسكرية من معقلك للسيطرة على الخلايا المفتاحية.' },
                { b: 'اغزُ:', t: 'اخنق خطوط إمداد خصمك واستأصل مدينته لتطالب بالأرض.' }
              ] }
            ]
          },
          mapa: {
            title: 'مسرح العمليات',
            blocks: [
              { p: 'العالم مبني من سداسيات السهل والتل والجبل، حيث تنمو موارد ثمينة كالقمح والخشب والذهب.' },
              { p: 'الغابات الكثيفة تسد الطريق، وعلى جنودك قطعها لتحرير الأرض. كل خلية مصبوغة بألوانك تغذي خزائن حضارتك وتوسع نطاقك.' }
            ]
          },
          informacion: {
            title: 'الموارد والحالة',
            blocks: [
              { p: 'في أعلى الشاشة تجد القائمة الرئيسية ومؤشر الدور وحالة مخزونك.' },
              { p: 'من هناك تراقب تدفق سلعك الأساسية الثلاث (الذهب والقمح والخشب) وأرصدتها لكل دور، وتتنقل بين العروض التكتيكية: العادي والقتالي والسياسي وعرض الموارد.' }
            ]
          },
          ordenes: {
            title: 'عقيدة العمل',
            blocks: [
              { p: 'في قاعدة العمليات تقع أوامرك الأساسية: إقامة المستوطنات لتطوير الأرض وتأمينها، وتجنيد الفرق العسكرية للجبهة، والتراجع عن المناورات إذا احتجت تصحيح استراتيجية، وإنهاء الدور حين تُثبَّت تحركاتك.' },
              { lead: 'هدفك الرئيسي واضح: اغزُ كل المدن المنافسة وأزلْها.' }
            ]
          }
        }
      }
    }
  };
})(window);
