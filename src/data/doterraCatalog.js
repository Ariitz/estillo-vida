/**
 * AURA Nexus - Catálogo Oficial dōTERRA y Biblioteca de Aceites Esenciales
 * Base de datos enriquecida con propiedades botánicas, métodos de aplicación,
 * advertencias de seguridad, aromaterapia emocional y sinergias curadas.
 */

export const DOTERRA_CATALOG = [
  // ==========================================
  // ACEITES INDIVIDUALES (SINGLE OILS)
  // ==========================================
  {
    id: 'lavender',
    name: 'Lavanda',
    trademarkName: 'Lavender',
    botanicalName: 'Lavandula angustifolia',
    brand: 'dōTERRA',
    type: 'single',
    category: 'calm',
    categoryLabel: 'Calma & Sueño',
    aroma: 'Floral, dulce, herbáceo y empolvado',
    methods: ['A', 'T', 'I'], // Aromático, Tópico, Interno
    sensitivity: 'N', // Neat (Puro/Sin diluir)
    photosensitive: false,
    emotionalProperty: 'El aceite de la comunicación honesta, paz mental y serenidad',
    keyBenefits: [
      'Induce calma profunda y mejora la calidad del sueño REM',
      'Alivia irritaciones cutáneas, picaduras y quemaduras leves',
      'Reduce la tensión muscular y la ansiedad cotidiana'
    ],
    description: 'Conocida universalmente como la reina de los aceites esenciales por su inigualable poder calmante y versatilidad regeneradora.',
    defaultInInventory: true,
    level: '100%',
    notes: 'Básico indispensable en buró y difusor nocturno.'
  },
  {
    id: 'peppermint',
    name: 'Menta',
    trademarkName: 'Peppermint',
    botanicalName: 'Mentha piperita',
    brand: 'dōTERRA',
    type: 'single',
    category: 'focus',
    categoryLabel: 'Enfoque & Energía',
    aroma: 'Mentolado, fresco, penetrante y revitalizante',
    methods: ['A', 'T', 'I'],
    sensitivity: 'S', // Sensitive (Diluir en piel sensible)
    photosensitive: false,
    emotionalProperty: 'El aceite de un corazón animado, claridad y vigor intelectual',
    keyBenefits: [
      'Despierta la concentración mental instantánea y combate el sueño diurno',
      'Alivia dolores de cabeza y tensión en sienes o nuca con sensación refrescante',
      'Favorece una digestión ligera y despeja las vías respiratorias'
    ],
    description: 'Un disparo de energía botánica pura con alto contenido de mentol para despertar los sentidos y reactivar la productividad.',
    defaultInInventory: true,
    level: '100%',
    notes: 'Ideal antes de estudiar o entrenar.'
  },
  {
    id: 'frankincense',
    name: 'Incienso',
    trademarkName: 'Frankincense',
    botanicalName: 'Boswellia carterii',
    brand: 'dōTERRA',
    type: 'single',
    category: 'mood',
    categoryLabel: 'Conexión & Celular',
    aroma: 'Cálido, resinoso, amaderado, especiado y balsámico',
    methods: ['A', 'T', 'I'],
    sensitivity: 'N',
    photosensitive: false,
    emotionalProperty: 'El rey de los aceites: el aceite de la verdad, conexión espiritual y sabiduría',
    keyBenefits: [
      'Potencia la regeneración celular y la luminosidad de la piel (skincare glow)',
      'Favorece estados meditativos profundos, reduciendo la rumiación mental',
      'Potencia el efecto de cualquier otro aceite esencial cuando se usan en sinergia'
    ],
    description: 'Considerado oro líquido en la aromaterapia milenaria por su capacidad para calmar el sistema nervioso y regenerar la piel.',
    defaultInInventory: true,
    level: '75%',
    notes: '1 gota sublingual o en la crema de noche.'
  },
  {
    id: 'wild-orange',
    name: 'Naranja Silvestre',
    trademarkName: 'Wild Orange',
    botanicalName: 'Citrus sinensis',
    brand: 'dōTERRA',
    type: 'single',
    category: 'mood',
    categoryLabel: 'Alegría & Ánimo',
    aroma: 'Cítrico, dulce, fresco y efervescente',
    methods: ['A', 'T', 'I'],
    sensitivity: 'N',
    photosensitive: true, // ¡Fotosensible!
    emotionalProperty: 'El aceite de la abundancia, la alegría creativa y el optimismo',
    keyBenefits: [
      'Eleva el estado de ánimo y disipa sentimientos de tristeza o pesimismo',
      'Purifica el aire ambiental y elimina olores pesados',
      'Aporta un sabor revitalizante al agua y brinda soporte antioxidante'
    ],
    description: 'Extraído en frío de la cáscara de naranja, es un rayo de sol embotellado que disuelve el estrés y energiza cualquier espacio.',
    defaultInInventory: true,
    level: '100%',
    notes: 'Precaución: Evitar la luz solar directa hasta 12 horas después de su aplicación tópica.'
  },
  {
    id: 'lemon',
    name: 'Limón',
    trademarkName: 'Lemon',
    botanicalName: 'Citrus limon',
    brand: 'dōTERRA',
    type: 'single',
    category: 'immunity',
    categoryLabel: 'Detox & Claridad',
    aroma: 'Cítrico brillante, limpio, fresco y ácido',
    methods: ['A', 'T', 'I'],
    sensitivity: 'N',
    photosensitive: true,
    emotionalProperty: 'El aceite de la concentración mental y la purificación',
    keyBenefits: [
      'Apoya la desintoxicación natural del cuerpo y la función hepática saludable',
      'Despeja la niebla mental y ayuda a memorizar conceptos complejos',
      'Poderoso limpiador y desengrasante natural de superficies'
    ],
    description: 'Fresco y vigorizante, ideal para consumir en ayunas en agua tibia o difundir para un ambiente impecable y nítido.',
    defaultInInventory: true,
    level: '100%',
    notes: 'No aplicar sobre piel antes de exponerse al sol.'
  },
  {
    id: 'tea-tree',
    name: 'Árbol de Té (Melaleuca)',
    trademarkName: 'Tea Tree',
    botanicalName: 'Melaleuca alternifolia',
    brand: 'dōTERRA',
    type: 'single',
    category: 'immunity',
    categoryLabel: 'Límites & Piel',
    aroma: 'Herbáceo, verde, medicinal y refrescante',
    methods: ['A', 'T'],
    sensitivity: 'S',
    photosensitive: false,
    emotionalProperty: 'El aceite de los límites energéticos saludables y la liberación de la toxicidad',
    keyBenefits: [
      'Incomparable para brotes de acné, imperfecciones y cuidado de uñas',
      'Potente purificador antimicrobiano para cutis y cuero cabelludo',
      'Ayuda a poner límites firmes frente a relaciones o ambientes drenantes'
    ],
    description: 'El guardián botánico por excelencia con más de 90 compuestos activos purificantes.',
    defaultInInventory: false,
    level: '100%',
    notes: 'Aplicar directamente sobre brotes con un hisopo.'
  },
  {
    id: 'eucalyptus',
    name: 'Eucalipto',
    trademarkName: 'Eucalyptus',
    botanicalName: 'Eucalyptus radiata',
    brand: 'dōTERRA',
    type: 'single',
    category: 'respiratory',
    categoryLabel: 'Respiración & Apertura',
    aroma: 'Alcanforado, aéreo, penetrante y verde',
    methods: ['A', 'T'],
    sensitivity: 'S',
    photosensitive: false,
    emotionalProperty: 'El aceite del bienestar y la sensación de liberación y expansión',
    keyBenefits: [
      'Abre las vías respiratorias y promueve una respiración profunda y fluida',
      'Excelente en la ducha para crear una experiencia de spa y descongestión',
      'Alivia la tensión muscular en el pecho y cuello'
    ],
    description: 'Ideal para difundir en temporadas de cambios de estación o cuando se requiere claridad respiratoria total.',
    defaultInInventory: false,
    level: '100%',
    notes: 'No ingerir. Perfecto para gotas en el piso de la regadera con vapor caliente.'
  },
  {
    id: 'rosemary',
    name: 'Romero',
    trademarkName: 'Rosemary',
    botanicalName: 'Rosmarinus officinalis',
    brand: 'dōTERRA',
    type: 'single',
    category: 'focus',
    categoryLabel: 'Memoria & Enfoque',
    aroma: 'Herbáceo, fresco, verde y alcanforado',
    methods: ['A', 'T', 'I'],
    sensitivity: 'S',
    photosensitive: false,
    emotionalProperty: 'El aceite del conocimiento, la transición mental y la memoria',
    keyBenefits: [
      'Aumenta la retención de memoria y la velocidad de procesamiento cognitivo',
      'Estimula la microcirculación en el cuero cabelludo para fortalecer el cabello',
      'Reduce la fatiga mental tras jornadas largas frente a la pantalla'
    ],
    description: 'El mejor aliado para sesiones intensas de estudio, programación o análisis donde se exige máximo rendimiento cerebral.',
    defaultInInventory: false,
    level: '100%',
    notes: 'Excelente combinado con Menta en el difusor de oficina.'
  },
  {
    id: 'cedarwood',
    name: 'Cedro',
    trademarkName: 'Cedarwood',
    botanicalName: 'Juniperus virginiana',
    brand: 'dōTERRA',
    type: 'single',
    category: 'calm',
    categoryLabel: 'Enraizamiento & Sueño',
    aroma: 'Amaderado cálido, terroso, reconfortante y seco',
    methods: ['A', 'T'],
    sensitivity: 'N',
    photosensitive: false,
    emotionalProperty: 'El aceite de la pertenencia, comunidad y enraizamiento emocional',
    keyBenefits: [
      'Induce la relajación profunda y la liberación natural de melatonina',
      'Calma la hiperactividad mental y la sensación de desarraigo o soledad',
      'Excelente acondicionador para el cuero cabelludo y cutis graso'
    ],
    description: 'Aroma boscoso envolvente que transmite la solidez inmutable de un árbol milenario.',
    defaultInInventory: false,
    level: '100%',
    notes: 'Combinar con Lavanda en difusor 30 minutos antes de dormir.'
  },
  {
    id: 'bergamot',
    name: 'Bergamota',
    trademarkName: 'Bergamot',
    botanicalName: 'Citrus bergamia',
    brand: 'dōTERRA',
    type: 'single',
    category: 'mood',
    categoryLabel: 'Autoestima & Confianza',
    aroma: 'Cítrico refinado, dulce, floral y ligeramente especiado (aroma a té Earl Grey)',
    methods: ['A', 'T', 'I'],
    sensitivity: 'N',
    photosensitive: true, // ¡Altamente fotosensible!
    emotionalProperty: 'El aceite de la autoaceptación, la autoestima y el amor propio',
    keyBenefits: [
      'Calma la autocrítica destructiva, la vergüenza y el síndrome del impostor',
      'Combina simultáneamente propiedades calmantes y energizantes',
      'Purifica la piel (aplicación nocturna únicamente)'
    ],
    description: 'Único entre los cítricos por su capacidad de calmar y relajar mientras disipa el desánimo y nutre el amor propio.',
    defaultInInventory: false,
    level: '100%',
    notes: '¡Evitar la exposición al sol durante 12-24 horas tras aplicación tópica!'
  },
  {
    id: 'copaiba',
    name: 'Copaiba',
    trademarkName: 'Copaiba',
    botanicalName: 'Copaifera reticulata',
    brand: 'dōTERRA',
    type: 'single',
    category: 'relief',
    categoryLabel: 'Alivio & Sistema Nervioso',
    aroma: 'Amaderado suave, dulce, resinoso y cálido',
    methods: ['A', 'T', 'I'],
    sensitivity: 'N',
    photosensitive: false,
    emotionalProperty: 'El aceite de la revelación, el perdón y el alivio emocional',
    keyBenefits: [
      'Poderoso antioxidante con altos niveles de beta-cariofileno (apoyo al sistema endocannabinoide)',
      'Alivia molestias musculares, articulares y procesos inflamatorios',
      'Seda el sistema nervioso y promueve una piel lisa y tersa'
    ],
    description: 'El gran aliado para calmar el cuerpo y la mente sin efectos psicotrópicos, actuando directamente sobre los receptores CB2.',
    defaultInInventory: false,
    level: '100%',
    notes: '1-2 gotas sublinguales para calmar la ansiedad nocturna o dolores corporales.'
  },
  {
    id: 'oregano',
    name: 'Orégano',
    trademarkName: 'Oregano',
    botanicalName: 'Origanum vulgare',
    brand: 'dōTERRA',
    type: 'single',
    category: 'immunity',
    categoryLabel: 'Escudo & Desapego',
    aroma: 'Fuerte, herbáceo, picante y alcanforado',
    methods: ['A', 'T', 'I'],
    sensitivity: 'D', // ¡Siempre Diluir! Aceite Caliente
    photosensitive: false,
    emotionalProperty: 'El aceite de la no-dependencia, el desapego y la humildad',
    keyBenefits: [
      'Uno de los antimicrobianos e inmunomoduladores naturales más potentes del planeta',
      'Soporte inmunológico intensivo durante temporadas invernales',
      'Potente apoyo antioxidante'
    ],
    description: 'Un aceite "caliente" que debe ser manejado con respeto: siempre diluir generosamente con aceite de coco fraccionado.',
    defaultInInventory: false,
    level: '100%',
    notes: '¡PRECAUCIÓN! Aceite cáustico/caliente. Jamás aplicar puro en piel.'
  },
  {
    id: 'vetiver',
    name: 'Vetiver',
    trademarkName: 'Vetiver',
    botanicalName: 'Vetiveria zizanioides',
    brand: 'dōTERRA',
    type: 'single',
    category: 'calm',
    categoryLabel: 'Anclaje & Mente Fija',
    aroma: 'Pesado, terroso, amaderado, ahumado y dulce',
    methods: ['A', 'T', 'I'],
    sensitivity: 'N',
    photosensitive: false,
    emotionalProperty: 'El aceite del arraigo profundo, el centramiento y la estabilidad emocional',
    keyBenefits: [
      'Apaga el "ruido mental" y el sobrepensamiento obsesivo en segundos',
      'Ideal para personas con déficit de atención, hiperactividad o mente dispersa',
      'Favorece un sueño profundo e ininterrumpido'
    ],
    description: 'Extraído de las raíces profundas de la planta, es el tranquilizante botánico más anclador que existe.',
    defaultInInventory: false,
    level: '100%',
    notes: 'Textura espesa. Aplicar 1 gota en la planta de los pies al acostarse.'
  },
  {
    id: 'lemongrass',
    name: 'Zacate de Limón (Lemongrass)',
    trademarkName: 'Lemongrass',
    botanicalName: 'Cymbopogon flexuosus',
    brand: 'dōTERRA',
    type: 'single',
    category: 'relief',
    categoryLabel: 'Circulación & Limpieza',
    aroma: 'Cítrico herbáceo, ahumado, fresco y terroso',
    methods: ['A', 'T', 'I'],
    sensitivity: 'D',
    photosensitive: false,
    emotionalProperty: 'El aceite de la limpieza energética y la eliminación de bloqueos',
    keyBenefits: [
      'Estimula la circulación sanguínea y alivia la pesadez en piernas o músculos',
      'Repelente natural contra insectos',
      'Tónico tonificante para piel y articulaciones'
    ],
    description: 'Excelente para masajes post-entrenamiento diluido con aceite portador.',
    defaultInInventory: false,
    level: '100%',
    notes: 'Diluir siempre para evitar irritación dérmica.'
  },
  {
    id: 'clary-sage',
    name: 'Salvia Esclarea',
    trademarkName: 'Clary Sage',
    botanicalName: 'Salvia sclarea',
    brand: 'dōTERRA',
    type: 'single',
    category: 'mood',
    categoryLabel: 'Equilibrio Hormonal & Claridad',
    aroma: 'Herbáceo, terroso, floral y ligeramente dulce',
    methods: ['A', 'T', 'I'],
    sensitivity: 'N',
    photosensitive: false,
    emotionalProperty: 'El aceite de la intuición, la visión clara y la receptividad',
    keyBenefits: [
      'Regula y alivia cólicos menstruales y síntomas del síndrome premenstrual (PMS)',
      'Equilibra las fluctuaciones hormonales y reduce bochornos',
      'Induce sueños lúcidos y calma la angustia emocional'
    ],
    description: 'La gran aliada de la salud femenina y el balance hormonal natural.',
    defaultInInventory: false,
    level: '100%',
    notes: 'Masajear en el abdomen bajo con aceite de coco durante el ciclo menstrual.'
  },

  // ==========================================
  // MEZCLAS REGISTRADAS dōTERRA (PROPRIETARY BLENDS)
  // ==========================================
  {
    id: 'on-guard',
    name: 'On Guard',
    trademarkName: 'On Guard (Mezcla Protectora)',
    botanicalName: 'Wild Orange, Clove, Cinnamon, Eucalyptus, Rosemary',
    brand: 'dōTERRA',
    type: 'blend',
    category: 'immunity',
    categoryLabel: 'Defensa & Escudo',
    aroma: 'Cálido, especiado, cítrico y amaderado (Navidad embotellada)',
    methods: ['A', 'T', 'I'],
    sensitivity: 'D', // Contiene canela y clavo (Diluir)
    photosensitive: false,
    emotionalProperty: 'El aceite de la protección energética, los límites seguros y la invulnerabilidad',
    keyBenefits: [
      'Refuerza las defensas naturales del sistema inmunológico',
      'Purifica el aire eliminando patógenos ambientales',
      'Excelente enjuague bucal purificante para encías y garganta'
    ],
    description: 'La mezcla insignia más famosa de dōTERRA, formulada con aceites botánicos con alta capacidad antioxidante comprobada.',
    defaultInInventory: true,
    level: '100%',
    notes: 'Un básico para temporadas frías o para limpiar la energía de espacios concurridos.'
  },
  {
    id: 'balance',
    name: 'Balance',
    trademarkName: 'Balance (Mezcla Enraizadora)',
    botanicalName: 'Spruce, Ho Wood, Frankincense, Blue Tansy, Blue Chamomile, Osmanthus',
    brand: 'dōTERRA',
    type: 'blend',
    category: 'mood',
    categoryLabel: 'Enraizamiento & Ansiedad',
    aroma: 'Amaderado, dulce, terroso y celestial',
    methods: ['A', 'T'],
    sensitivity: 'N',
    photosensitive: false,
    emotionalProperty: 'El aceite del equilibrio interior, la presencia y la paciencia',
    keyBenefits: [
      'Disuelve la ansiedad aguda, ataques de pánico y la sensación de agobio',
      'Conecta con el momento presente cuando la mente viaja al futuro con angustia',
      'Favorece la tranquilidad corporal y la armonización del sistema circulatorio'
    ],
    description: 'Con un característico tono azul por el Blue Tansy, es el antídoto definitivo para la mente dispersa y el estrés moderno.',
    defaultInInventory: true,
    level: '100%',
    notes: 'Aplicar 2 gotas en la planta de los pies cada mañana al despertar.'
  },
  {
    id: 'adaptiv',
    name: 'Adaptiv',
    trademarkName: 'Adaptiv (Mezcla Calmante)',
    botanicalName: 'Wild Orange, Lavender, Copaiba, Spearmint, Magnolia, Rosemary, Neroli, Sweetgum',
    brand: 'dōTERRA',
    type: 'blend',
    category: 'calm',
    categoryLabel: 'Anti-Estrés & Adaptación',
    aroma: 'Dulce, cítrico, floral, fresco y sutilmente mentolado',
    methods: ['A', 'T'],
    sensitivity: 'N',
    photosensitive: false,
    emotionalProperty: 'El aceite de la adaptabilidad, la resiliencia y el alivio de la sobrecarga',
    keyBenefits: [
      'Ayuda a gestionar el estrés laboral, deadlines y transiciones vitales complejas',
      'Mejora el estado de ánimo mientras mantiene la calma sin causar somnolencia',
      'Ideal para personas con sobrecarga cognitiva o multitasking excesivo'
    ],
    description: 'Formulado específicamente para los desafíos neurológicos del siglo XXI: calma sin adormecer y eleva el enfoque.',
    defaultInInventory: true,
    level: '100%',
    notes: 'Tener siempre a la mano en el escritorio o en roll-on en el bolso.'
  },
  {
    id: 'serenity',
    name: 'Serenity',
    trademarkName: 'Serenity (Mezcla de Descanso)',
    botanicalName: 'Lavender, Cedarwood, Coriander, Ylang Ylang, Marjoram, Roman Chamomile, Vetiver, Vanilla',
    brand: 'dōTERRA',
    type: 'blend',
    category: 'calm',
    categoryLabel: 'Sueño Reparador & Paz',
    aroma: 'Cálido, floral, dulce, reconfortante y empolvado',
    methods: ['A', 'T'],
    sensitivity: 'N',
    photosensitive: false,
    emotionalProperty: 'El aceite de la rendición, el descanso pacífico y la disolución de miedos',
    keyBenefits: [
      'Induce un sueño profundo y combate el insomnio crónico o la dificultad para conciliar',
      'Calma tensiones emocionales y desacelera el ritmo cardíaco alterado',
      'Crea un santuario de descanso en la habitación'
    ],
    description: 'La mezcla de relajación por antonomasia. Apaga los pensamientos recurrentes y prepara el cuerpo para un descanso restaurador.',
    defaultInInventory: true,
    level: '100%',
    notes: '4-5 gotas en el difusor de recámara 30 minutos antes de acostarse.'
  },
  {
    id: 'deep-blue',
    name: 'Deep Blue',
    trademarkName: 'Deep Blue (Mezcla Calmante Muscular)',
    botanicalName: 'Wintergreen, Camphor, Peppermint, Ylang Ylang, Helichrysum, Blue Tansy, Blue Chamomile, Osmanthus',
    brand: 'dōTERRA',
    type: 'blend',
    category: 'relief',
    categoryLabel: 'Músculos & Articulaciones',
    aroma: 'Mentolado, dulce, alcanforado y fresco',
    methods: ['T'], // Solo Tópico
    sensitivity: 'S',
    photosensitive: false,
    emotionalProperty: 'El aceite de la aceptación del dolor físico y la liberación de la resistencia',
    keyBenefits: [
      'Alivio penetrante e instantáneo para dolores de espalda, cuello y articulaciones',
      'Excelente masaje recuperador post-entrenamiento o tras horas sentado en la computadora',
      'Efecto frío-calor que relaja contracturas musculares profundas'
    ],
    description: 'La solución terapéutica para el cuerpo cansado o adolorido. Nunca ingerir.',
    defaultInInventory: true,
    level: '100%',
    notes: '¡Solo uso tópico! Masajear diluido en hombros, lumbares o piernas.'
  },
  {
    id: 'breathe',
    name: 'Breathe (Easy Air)',
    trademarkName: 'Breathe / Easy Air (Mezcla Respiratoria)',
    botanicalName: 'Laurel Leaf, Eucalyptus, Peppermint, Melaleuca, Lemon, Cardamom, Ravintsara, Ravensara',
    brand: 'dōTERRA',
    type: 'blend',
    category: 'respiratory',
    categoryLabel: 'Vías Libres & Descongestión',
    aroma: 'Fresco, mentolado, aéreo y vigorizante',
    methods: ['A', 'T'],
    sensitivity: 'S',
    photosensitive: false,
    emotionalProperty: 'El aceite de la respiración profunda, la vitalidad y el abrazo de la vida',
    keyBenefits: [
      'Minimiza los efectos de amenazas estacionales y congestión nasal',
      'Facilita la respiración nocturna reduciendo ronquidos y despertares',
      'Despeja la cabeza pesada y la sensación de claustrofobia'
    ],
    description: 'Sensación inmediata de aire puro de montaña directo a los pulmones.',
    defaultInInventory: true,
    level: '100%',
    notes: 'Aplicar 1 gota con aceite portador en el pecho o difundir toda la noche.'
  },
  {
    id: 'digestzen',
    name: 'DigestZen (ZenGest)',
    trademarkName: 'DigestZen / ZenGest (Mezcla Digestiva)',
    botanicalName: 'Anise, Peppermint, Ginger, Caraway, Coriander, Tarragon, Fennel',
    brand: 'dōTERRA',
    type: 'blend',
    category: 'digestive',
    categoryLabel: 'Digestión & Alivio Estomacal',
    aroma: 'Especiado, dulce, anisado y mentolado',
    methods: ['A', 'T', 'I'],
    sensitivity: 'N',
    photosensitive: false,
    emotionalProperty: 'El aceite de la asimilación de experiencias y la digestión de la vida',
    keyBenefits: [
      'Alivia pesadez, gases, acidez, indigestión y distensión abdominal en minutos',
      'Ayuda a calmar mareos por movimiento en viajes o autos',
      'Favorece la absorción y digestión saludable de alimentos copiosos'
    ],
    description: 'El domador estomacal oficial: 1 gota en un vaso de agua o masajeada circularmente en el ombligo obra maravillas.',
    defaultInInventory: false,
    level: '100%',
    notes: 'Indispensable en comidas pesadas o salidas a restaurantes.'
  },
  {
    id: 'pasttense',
    name: 'PastTense',
    trademarkName: 'PastTense (Mezcla contra la Tensión)',
    botanicalName: 'Wintergreen, Lavender, Peppermint, Frankincense, Cilantro, Marjoram, Roman Chamomile, Basil, Rosemary',
    brand: 'dōTERRA',
    type: 'blend',
    category: 'relief',
    categoryLabel: 'Cero Migraña & Tensión',
    aroma: 'Fresco, mentolado, herbáceo y penetrante',
    methods: ['A', 'T'],
    sensitivity: 'S',
    photosensitive: false,
    emotionalProperty: 'El aceite de la liberación de la rigidez, el control y la presión excesiva',
    keyBenefits: [
      'Fórmula magistral para disolver dolores de cabeza por estrés y tensión cervical',
      'Relaja los músculos de la mandíbula (bruxismo) y hombros contraídos',
      'Presentación ideal en roll-on para llevar a todas partes'
    ],
    description: 'El rescate de bolsillo cuando sientes la cabeza a punto de explotar o los hombros como rocas.',
    defaultInInventory: false,
    level: '100%',
    notes: 'Aplicar en sienes (lejos de los ojos), nuca y detrás de las orejas.'
  },
  {
    id: 'citrus-bliss',
    name: 'Citrus Bliss',
    trademarkName: 'Citrus Bliss (Mezcla Vigorizante)',
    botanicalName: 'Wild Orange, Lemon, Grapefruit, Mandarin, Bergamot, Tangerine, Clementine, Vanilla Bean',
    brand: 'dōTERRA',
    type: 'blend',
    category: 'energy',
    categoryLabel: 'Felicidad & Vitalidad',
    aroma: 'Cítrico dulce, avainillado, cremoso y alegre (como helado de mandarina)',
    methods: ['A', 'T'],
    sensitivity: 'N',
    photosensitive: true,
    emotionalProperty: 'El aceite de la chispa creativa, la motivación y el entusiasmo juvenil',
    keyBenefits: [
      'Disipa el desánimo, la apatía y la baja energía matutina',
      'Estimula la creatividad y el flujo de ideas',
      'Neutraliza olores y llena la casa de un aroma a limpieza gourmet'
    ],
    description: 'Una explosión de cítricos maduros envueltos en vainilla pura que arranca una sonrisa instantánea.',
    defaultInInventory: false,
    level: '100%',
    notes: 'Fotosensible. Ideal para difusor de sala, cocina o estudio.'
  },
  {
    id: 'purify',
    name: 'Purify',
    trademarkName: 'Purify (Mezcla Limpiadora)',
    botanicalName: 'Lemon, Lime, Siberian Fir, Austrian Fir, Pine, Citronella, Melaleuca, Cilantro',
    brand: 'dōTERRA',
    type: 'blend',
    category: 'immunity',
    categoryLabel: 'Purificación & Aire Limpio',
    aroma: 'Fresco, herbal, cítrico y boscoso',
    methods: ['A', 'T'],
    sensitivity: 'N',
    photosensitive: false,
    emotionalProperty: 'El aceite de la purificación del espacio, renovación y limpieza de ataduras',
    keyBenefits: [
      'Elimina olores persistentes de cocina, humedad o mascotas',
      'Purifica el aire tras visitas o periodos de enfermedad',
      'Alivia picaduras de insectos e irritaciones leves'
    ],
    description: 'El reset aromático definitivo para renovar la energía y el aire de cualquier habitación.',
    defaultInInventory: false,
    level: '100%',
    notes: 'Difundir para refrescar la casa en minutos.'
  }
];

// ==========================================
// RECETARIO CURADO DE DIFUSORES Y ROLL-ONS
// ==========================================
export const DEFAULT_DIFFUSER_BLENDS = [
  {
    id: 'blend-focus-master',
    name: 'Mente Láser & Flow de Trabajo',
    category: 'focus',
    categoryLabel: 'Enfoque & Productividad',
    type: 'diffuser',
    targetVibe: 'Concentración total sin distracciones ni fatiga mental',
    ingredients: [
      { oilId: 'peppermint', oilName: 'Menta', drops: 3 },
      { oilId: 'wild-orange', oilName: 'Naranja Silvestre', drops: 3 },
      { oilId: 'frankincense', oilName: 'Incienso', drops: 2 }
    ],
    totalDrops: 8,
    bestTime: 'Mañanas o tardes de trabajo intenso',
    notes: 'La menta despeja, la naranja eleva el ánimo y el incienso ancla el foco.'
  },
  {
    id: 'blend-deep-sleep',
    name: 'Santuario de Sueño Profundo',
    category: 'calm',
    categoryLabel: 'Sueño Reparador',
    type: 'diffuser',
    targetVibe: 'Desconectar la mente acelerada y lograr descanso REM reparador',
    ingredients: [
      { oilId: 'serenity', oilName: 'Serenity (o Lavanda)', drops: 4 },
      { oilId: 'cedarwood', oilName: 'Cedro', drops: 2 },
      { oilId: 'frankincense', oilName: 'Incienso', drops: 2 }
    ],
    totalDrops: 8,
    bestTime: '30 min antes de acostarse en la recámara',
    notes: 'El cedro estimula la liberación de melatonina y la lavanda relaja el sistema nervioso.'
  },
  {
    id: 'blend-calm-anxiety',
    name: 'Respiro & Calma Anti-Ansiedad',
    category: 'calm',
    categoryLabel: 'Paz Mental',
    type: 'diffuser',
    targetVibe: 'Aliviar la opresión en el pecho, sobrecarga y mente inquieta',
    ingredients: [
      { oilId: 'balance', oilName: 'Balance', drops: 3 },
      { oilId: 'adaptiv', oilName: 'Adaptiv (o Lavanda)', drops: 3 },
      { oilId: 'wild-orange', oilName: 'Naranja Silvestre', drops: 2 }
    ],
    totalDrops: 8,
    bestTime: 'Momentos de agobio o al regresar a casa',
    notes: 'Sinergia de enraizamiento y adaptógenos botánicos que calman el pulso acelerado.'
  },
  {
    id: 'blend-immune-shield',
    name: 'Escudo Protector & Aire Puro',
    category: 'immunity',
    categoryLabel: 'Inmunidad & Defensa',
    type: 'diffuser',
    targetVibe: 'Limpiar gérmenes del ambiente y reforzar defensas biológicas',
    ingredients: [
      { oilId: 'on-guard', oilName: 'On Guard', drops: 4 },
      { oilId: 'lemon', oilName: 'Limón', drops: 2 },
      { oilId: 'tea-tree', oilName: 'Árbol de Té (o Eucalipto)', drops: 2 }
    ],
    totalDrops: 8,
    bestTime: 'Días fríos, cambios de clima o visitas',
    notes: 'Aroma especiado y limpio que purifica el aire de patógenos.'
  },
  {
    id: 'blend-spa-retreat',
    name: 'Ritual Spa de Lujo en Casa',
    category: 'mood',
    categoryLabel: 'Glow & Bienestar',
    type: 'diffuser',
    targetVibe: 'Ambiente de hotel boutique y relajación de cinco estrellas',
    ingredients: [
      { oilId: 'eucalyptus', oilName: 'Eucalipto', drops: 3 },
      { oilId: 'lavender', oilName: 'Lavanda', drops: 3 },
      { oilId: 'peppermint', oilName: 'Menta', drops: 2 }
    ],
    totalDrops: 8,
    bestTime: 'Sesiones de skincare, baños de tina o domingos de self-care',
    notes: 'Sensación fresca y herbal que recrea la atmósfera de un sauna escandinavo.'
  },
  {
    id: 'blend-headache-relief',
    name: 'Roll-on Cero Migraña & Cuello Libre',
    category: 'relief',
    categoryLabel: 'Alivio de Tensión',
    type: 'rollon',
    targetVibe: 'Alivio inmediato de dolor de cabeza, tensión en sienes y nuca',
    ingredients: [
      { oilId: 'peppermint', oilName: 'Menta', drops: 6 },
      { oilId: 'frankincense', oilName: 'Incienso', drops: 4 },
      { oilId: 'lavender', oilName: 'Lavanda', drops: 4 }
    ],
    carrierMl: 10,
    totalDrops: 14,
    bestTime: 'Aplicar al primer síntoma de dolor de cabeza o tensión',
    notes: 'Rellenar roll-on de 10ml con Aceite Fraccionado de Coco. Aplicar en sienes y cuello.'
  }
];

// ==========================================
// ARQUETIPOS DE ESTADO DE ÁNIMO
// ==========================================
export const MOOD_ARCHETYPES = [
  {
    id: 'burnout',
    emoji: '⚡',
    label: 'Agotamiento Mental',
    subtitle: 'Fatiga, sin energía, saturación de pantallas',
    targetEmotion: 'Vigor, claridad y revitalización intelectual',
    recommendedOils: ['peppermint', 'wild-orange', 'rosemary', 'lemon']
  },
  {
    id: 'anxiety',
    emoji: '🌪️',
    label: 'Estrés & Ansiedad',
    subtitle: 'Nerviosismo, opresión, rumiación mental',
    targetEmotion: 'Enraizamiento, paz interior y respiración profunda',
    recommendedOils: ['balance', 'adaptiv', 'lavender', 'frankincense']
  },
  {
    id: 'sadness',
    emoji: '🌧️',
    label: 'Desánimo o Tristeza',
    subtitle: 'Baja vibra, falta de motivación o alegría',
    targetEmotion: 'Optimismo, calidez y elevación del espíritu',
    recommendedOils: ['wild-orange', 'bergamot', 'citrus-bliss', 'frankincense']
  },
  {
    id: 'racing-mind',
    emoji: '🤯',
    label: 'Mente Acelerada / Insomnio',
    subtitle: 'No puedo apagar el cerebro para dormir',
    targetEmotion: 'Rendición pacífica y sueño REM ininterrumpido',
    recommendedOils: ['serenity', 'cedarwood', 'lavender', 'vetiver']
  },
  {
    id: 'unfocused',
    emoji: '🎯',
    label: 'Falta de Foco / Procrastinación',
    subtitle: 'Dispersión, bloqueo creativo, falta de inicio',
    targetEmotion: 'Mente láser, determinación y flujo de trabajo',
    recommendedOils: ['peppermint', 'rosemary', 'lemon', 'frankincense']
  },
  {
    id: 'irritation',
    emoji: '🕊️',
    label: 'Irritabilidad & Tensión',
    subtitle: 'Impaciencia, enojo, tensión física acumulada',
    targetEmotion: 'Serenidad, soltar el control y suavidad',
    recommendedOils: ['pasttense', 'lavender', 'bergamot', 'deep-blue']
  }
];
