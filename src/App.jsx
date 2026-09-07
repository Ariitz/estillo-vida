import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Tag,
  MapPin,
  Shirt,
  BookOpen,
  Clock,
  Menu,
  X,
  Droplet,
  CloudSun,
  Home,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Cloud,
  HeartPulse,
  Activity,
  Bot,
  Sparkles,
  MessageSquare
} from 'lucide-react';

// Firebase Client SDK
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

// Import modules
import ScheduleModule from './components/ScheduleModule';
import PriceComparatorModule from './components/PriceComparatorModule';
import ExperiencesModule from './components/ExperiencesModule';
import WardrobeModule from './components/WardrobeModule';
import ManualsModule from './components/ManualsModule';
import TimersModule from './components/TimersModule';
import HealthTrackerModule from './components/HealthTrackerModule';
import CopilotModule from './components/CopilotModule';
import SyncModule from './components/SyncModule';
import Toast from './components/Toast';

// ==========================================
// DEFAULT / MOCK DATASETS
// ==========================================

const initialSchedule = [
  { id: 1, time: '06:00 AM', title: 'Estiramientos en cama', desc: 'Abrazo de rodillas (30s), Giro espinal supino (30s/lado), Gato-vaca.', category: 'morning', completed: false },
  { id: 2, time: '06:15 AM', title: 'Higiene oral preventiva', desc: 'Cepillo suave a 45°, raspador lingual de cobre/acero, hilo dental.', category: 'morning', completed: false },
  { id: 3, time: '06:20 AM', title: 'Hidratación primaria & Pesaje', desc: 'Tomar agua tibia sola o con limón. Pesarse en ayunas (peso objetivo).', category: 'morning', completed: false },
  { id: 4, time: '07:00 AM', title: 'Entrenamiento matutino', desc: 'Lagartijas / push-ups para elevación de busto y fuerza postural.', category: 'morning', completed: false },
  { id: 5, time: '07:45 AM', title: 'Ducha metodológica', desc: 'Shampoo de chile/romero, acondicionador de medios a puntas (5 min), jabón de arroz, limpiador facial CeraVe, enjuague frío.', category: 'morning', completed: false },
  { id: 6, time: '08:15 AM', title: 'Secado y cuidado corporal', desc: 'Turbante de microfibra, crema de urea en codos/talones, crema hidratante con FPS 30+.', category: 'morning', completed: false },
  { id: 7, time: '08:45 AM', title: 'Desayuno denso + Suplementación', desc: 'Multivitamínico, Omega-3, Calcio + D3, Biotina, Colágeno disuelto.', category: 'morning', completed: false },
  { id: 8, time: '12:00 PM', title: 'Reaplicación de FPS (Mediodía)', desc: 'Matificar con papel de arroz y aplicar bruma de rosas + protector FPS.', category: 'afternoon', completed: false },
  { id: 9, time: '04:00 PM', title: 'Reaplicación de FPS (Tarde)', desc: 'Brindarle frescura al rostro con bruma de rosas y protector FPS.', category: 'afternoon', completed: false },
  { id: 10, time: '05:00 PM', title: 'Hora del Té', desc: 'Té verde o negro acompañado de sándwiches de pepino y requesón en triángulos sin corteza.', category: 'afternoon', completed: false },
  { id: 11, time: '09:30 PM', title: 'Noche & Skincare rotativo', desc: 'Noches Retinol + CeraVe PM vs Noches Concha Nácar + Teatrical Aclaradora. Perspirex/Drysol (2 veces por semana).', category: 'night', completed: false },
  { id: 12, time: '10:00 PM', title: 'Citrato de Magnesio & Relajación', desc: 'Tomar magnesio, elevar piernas a 90° por 10 min y descanso zen.', category: 'night', completed: false }
];

const initialHousehold = [
  {
    id: 'h-1',
    name: 'Papel Higiénico Premium',
    category: 'Higiene',
    stores: [
      { storeName: 'Costco', price: 450, quantity: 40, unitPrice: 450 / 40 },
      { storeName: "Sam's Club", price: 420, quantity: 32, unitPrice: 420 / 32 },
      { storeName: 'Tiendas 3B', price: 95, quantity: 8, unitPrice: 95 / 8 }
    ],
    preferredStore: "Sam's Club",
    repurchaseVerdict: 'yes',
    notes: 'El de Sam\'s es más suave aunque el de Costco sea marginalmente más barato por rollo.'
  },
  {
    id: 'h-2',
    name: 'Crema Hidratante Facial CeraVe',
    category: 'Skincare',
    stores: [
      { storeName: 'Farmacias Guadalajara', price: 380, quantity: 1, unitPrice: 380 },
      { storeName: 'Amazon', price: 320, quantity: 1, unitPrice: 320 }
    ],
    preferredStore: 'Amazon',
    repurchaseVerdict: 'yes',
    notes: 'Textura excelente, rinde varios meses.'
  },
  {
    id: 'h-3',
    name: 'Pasta Dental Preventiva',
    category: 'Dental',
    stores: [
      { storeName: 'Bodega Aurrera', price: 65, quantity: 1, unitPrice: 65 },
      { storeName: 'Tiendas 3B', price: 45, quantity: 1, unitPrice: 45 }
    ],
    preferredStore: 'Tiendas 3B',
    repurchaseVerdict: 'yes',
    notes: 'Limpieza dental profunda al mejor precio.'
  }
];

const initialExperiences = [
  {
    id: 'exp-1',
    name: 'Café Filtrado V60 (Chiapas)',
    type: 'place',
    category: 'Cafeterías',
    status: 'completed',
    rating: 5,
    cost: '$$',
    verdict: 'yes',
    placeOrBrand: 'Cafetería de Especialidad Centro',
    date: '2026-08-10',
    notes: 'Excelente extracción balanceada, notas a frutos rojos y cacao.'
  },
  {
    id: 'exp-2',
    name: 'Crema Corporal Almendras',
    type: 'product',
    category: 'Cuidado Personal',
    status: 'completed',
    rating: 5,
    cost: '$$$',
    verdict: 'yes',
    placeOrBrand: 'L\'Occitane',
    date: '2026-08-15',
    notes: 'Huele espectacular y repara talones agrietados. Vale cada peso.'
  },
  {
    id: 'exp-3',
    name: 'Perfume Árabe Yara',
    type: 'product',
    category: 'Tiendas Especializadas',
    status: 'pending',
    rating: 0,
    cost: '$$',
    verdict: 'maybe',
    placeOrBrand: 'Lattafa / Armaf',
    notes: 'Perfume frutal dulce muy recomendado en foros geek chic. Pendiente de probar.'
  }
];

const initialWardrobe = [
  { id: 'w-1', name: 'Playera de Evangelion Eva-01', category: 'tops', isClean: true, color: 'Negro con morado', tags: ['anime', 'geek', 'algodón'] },
  { id: 'w-2', name: 'Playera Serial Experiments Lain', category: 'tops', isClean: true, color: 'Blanco', tags: ['anime', 'geek'] },
  { id: 'w-3', name: 'Sudadera Oversize Gris con Forro Satén', category: 'outerwear', isClean: true, color: 'Gris', tags: ['satén', 'anti-frizz', 'cómodo'] },
  { id: 'w-4', name: 'Pantalón Cargo Tiro Alto', category: 'bottoms', isClean: true, color: 'Negro', tags: ['cargo', 'bolsillos'] },
  { id: 'w-5', name: 'Leggings de Compresión Gruesos', category: 'bottoms', isClean: true, color: 'Azul Marino', tags: ['compresión', 'gruesos'] },
  { id: 'w-6', name: 'Blazer Estructurado Joya', category: 'outerwear', isClean: true, color: 'Rojo Vino', tags: ['joya', 'estructurado'] },
  { id: 'w-7', name: 'Tenis Blancos Limpios', category: 'footwear', isClean: true, color: 'Blanco', tags: ['básicos', 'piel'] },
  { id: 'w-8', name: 'Botas de Piel', category: 'footwear', isClean: true, color: 'Negro', tags: ['cuero', 'casual'] },
  { id: 'w-9', name: 'Mochila Reforzada Doble Laptop', category: 'accessories', isClean: true, color: 'Negro', tags: ['viaje', 'trabajo'] },
  { id: 'w-10', name: 'Scrunchie de Satén', category: 'accessories', isClean: true, color: 'Verde Salvia', tags: ['satén', 'anti-frizz'] }
];

const initialSelfCareActivities = [
  {
    id: 'sc-1',
    title: 'Manicura & Pedicura Casera',
    frequency: 'weekly',
    daysInterval: 7,
    lastCompletedDate: '2026-08-28',
    category: 'beauty',
    notes: 'Limado suave, nutrición de cutículas y cuidado de uñas.',
    protocol: 'Usa el esmalte amargo Mavala Stop y el anillo de enfoque/fidget si sientes ansiedad por morder tus uñas o jalar tu cabello (Protocolo Contra Ansiedad).'
  },
  {
    id: 'sc-2',
    title: 'Masajes / Drenaje Linfático',
    frequency: 'monthly',
    daysInterval: 30,
    lastCompletedDate: '2026-08-10',
    category: 'wellness',
    notes: 'Sesión para desinflamar, reactivar circulación y liberar toxinas y tensión muscular.',
    protocol: 'Masaje manual o drenaje linfático suave. Mantener hidratación de 500ml de agua post-sesión.'
  },
  {
    id: 'sc-3',
    title: 'Corte de Cabello & Diseño de Cejas',
    frequency: 'quarterly',
    daysInterval: 90,
    lastCompletedDate: '2026-06-15',
    category: 'hair',
    notes: 'Despunte saludable de puntas 1b/1c y perfilado de cejas simétrico.',
    protocol: 'Corte de puntas para prevenir horzuela sin perder largo. Evitar adelgazar en exceso.'
  },
  {
    id: 'sc-4',
    title: 'Oftalmólogo (Salud Visual)',
    frequency: 'annual',
    daysInterval: 365,
    lastCompletedDate: '2025-11-20',
    category: 'health',
    notes: 'Monitoreo de agudeza visual, presión intraocular y salud de córnea tras fatiga por pantallas.',
    protocol: 'Chequeo preventivo anual con cirujano oftalmólogo.'
  },
  {
    id: 'sc-5',
    title: 'Ginecólogo (Control Preventivo)',
    frequency: 'annual',
    daysInterval: 365,
    lastCompletedDate: '2025-10-12',
    category: 'health',
    notes: 'Chequeo preventivo, ultrasonido pélvico y Papanicolaou.',
    protocol: 'Agendar preferentemente en la primera semana posterior al fin del ciclo menstrual.'
  },
  {
    id: 'sc-6',
    title: 'Podólogo / Salud de Pies',
    frequency: 'annual',
    daysInterval: 365,
    lastCompletedDate: '2026-02-05',
    category: 'health',
    notes: 'Cuidado clínico de pies, eliminación de callosidades y salud ungueal.',
    protocol: 'Revisión podológica preventiva anual.'
  },
  {
    id: 'sc-7',
    title: 'Odontología (Limpieza & Bruxismo)',
    frequency: 'biannual',
    daysInterval: 180,
    lastCompletedDate: '2026-03-10',
    category: 'health',
    notes: 'Limpieza dental profunda y ajuste de guarda oclusiva nocturna rígida.',
    protocol: 'Chequeo semestral para prevenir desgaste dental por estrés o tensión mandibular.'
  }
];

const initialHealthSymptoms = [
  {
    id: 'hlth-1',
    title: 'Molestia en espalda baja y tobillo derecho al manejar',
    category: 'pain_posture',
    bodyZone: 'Espalda baja / Lumbar',
    painLevel: 6,
    trigger: 'Al manejar (>30 min)',
    frequency: 'Al realizar la actividad',
    notes: 'Rigidez en zona lumbar L4-S1 y sobretensión en tendón de Aquiles derecho por uso constante del acelerador en tráfico.',
    status: 'active',
    createdAt: '2026-08-20',
    aiTriage: {
      specialist: 'Ortopedista / Fisioterapeuta o Fisiatra',
      specialistDescription: 'Especialista en biomecánica articular y ergonomía de columna y extremidades inferiores.',
      priority: 'Atención Recomendada',
      physiologicalExplanation: 'La conducción prolongada somete al pie derecho a una flexión dorsal continua sobre los pedales, tensando la cadena posterior y aplanando la curva lumbar por falta de apoyo en el respaldo del auto.',
      immediateReliefTips: [
        'Ajustar la distancia del asiento del auto: rodillas a 120° con talón apoyado firmemente frente al freno.',
        'Colocar un cojín o toalla enrollada en la curva lumbar baja del asiento del automóvil.',
        'Realizar pausas activas cada 45-60 min: estiramiento de isquiotibiales y círculos suaves de tobillo.',
        'Aplicar compresas tibias por 15 minutos en la noche en la zona lumbar.'
      ],
      consultationQuestions: [
        '¿Recomienda una radiografía de columna lumbosacra o ecografía de tobillo para descartar pinzamiento o tendinopatía?',
        '¿Qué ejercicios de fortalecimiento de core y glúteos debo realizar para proteger la espalda baja?',
        '¿Sería beneficioso usar plantillas ortopédicas personalizadas para manejar y caminar?'
      ],
      lifestyleHabits: [
        'Evitar llevar objetos o carteras en los bolsillos traseros al sentarse.',
        'Ajustar la altura del volante para relajar hombros y trapecios.'
      ],
      redFlags: 'Dolor que baje con adormecimiento u hormigueo por la pierna hacia los dedos del pie o pérdida de fuerza.'
    }
  },
  {
    id: 'hlth-2',
    title: 'Piel reseca y talones agrietados',
    category: 'aesthetic_skin',
    bodyZone: 'Piel (Talones / Manos / Cuerpo)',
    painLevel: 4,
    trigger: 'En clima seco o con aire acondicionado',
    frequency: 'Diario / Constante',
    notes: 'Piel tirante en extremidades y engrosamiento/resequedad en talones a pesar de usar crema hidratante estándar.',
    status: 'treatment',
    createdAt: '2026-08-22',
    aiTriage: {
      specialist: 'Dermatólogo Clínico',
      specialistDescription: 'Médico especialista en barrera cutánea, queratodermias y cosmecéutica de grado dermatológico.',
      priority: 'Preventivo',
      physiologicalExplanation: 'Pérdida de agua transepidérmica e hiperqueratosis en zonas de apoyo mecánico (talones) por déficit de ceramidas y factores naturales de hidratación.',
      immediateReliefTips: [
        'Aplicar crema emoliente con Urea al 10% - 20% sobre la piel ligeramente húmeda tras salir de la ducha.',
        'Evitar el uso de agua excesivamente caliente al bañarse y usar syndets sin fragancias abrasivas.',
        'Usar calcetines de algodón suaves tras la crema de urea para potenciar la absorción nocturna.'
      ],
      consultationQuestions: [
        '¿Qué porcentaje de urea o ácido láctico es el más recomendable para mi tipo de piel?',
        '¿Requiere descartar eccema asteatósico o dermatitis de contacto?'
      ],
      lifestyleHabits: [
        'Mantener ingesta hídrica de al menos 2.5 litros de agua al día.',
        'Duchas breves menores a 8 minutos.'
      ],
      redFlags: 'Fisuras sangrantes profundas o signos de infección con calor y enrojecimiento.'
    }
  },
  {
    id: 'hlth-3',
    title: 'Frizz capilar y encrespamiento estático (Cabello 1b/1c)',
    category: 'aesthetic_skin',
    bodyZone: 'Cabello & Cuero cabelludo',
    painLevel: 3,
    trigger: 'En clima seco o con aire acondicionado',
    frequency: 'Frecuente (3-4 veces por semana)',
    notes: 'Cabello lacio/ondulado fino con tendencia al frizz en la coronilla y puntas abiertas.',
    status: 'active',
    createdAt: '2026-08-25',
    aiTriage: {
      specialist: 'Tricólogo / Dermatólogo Capilar',
      specialistDescription: 'Especialista en estructura del tallo piloso, cutícula capilar y salud del cuero cabelludo.',
      priority: 'Preventivo',
      physiologicalExplanation: 'La cutícula capilar deshidratada o porosa absorbe la humedad ambiental de forma desigual, generando dilatación de la fibra y encrespamiento estático típico del patrón 1b/1c.',
      immediateReliefTips: [
        'Dormir con funda de almohada o gorro de satén para eliminar la fricción mecánica.',
        'Secar únicamente con toalla de microfibra presionando suavemente sin frotar.',
        'Sellar puntas con 2 gotas de aceite de argán o jojoba tras el acondicionador sin enjuague.'
      ],
      consultationQuestions: [
        '¿Qué tratamiento de reestructuración lipídica o botox capilar de consultorio recomienda?',
        '¿Presento porosidad alta que requiera selladores de cutícula específicos?'
      ],
      lifestyleHabits: [
        'Cepillado suave con cepillo de cerdas de madera natural dos veces al día.',
        'Uso de protector térmico antes de la secadora.'
      ],
      redFlags: 'Caída de cabello en mechones abundantes o áreas circulares con descamación.'
    }
  },
  {
    id: 'hlth-4',
    title: 'Tensión mandibular y bruxismo matutino',
    category: 'general',
    bodyZone: 'Rostro / Mandíbula (ATM)',
    painLevel: 5,
    trigger: 'Al despertar por las mañanas',
    frequency: 'Diario / Constante',
    notes: 'Despertar con rigidez en maseteros, cansancio en la mandíbula y dolor de cabeza tensional leve.',
    status: 'active',
    createdAt: '2026-08-26',
    aiTriage: {
      specialist: 'Odontólogo Especialista en ATM / Rehabilitación Oral',
      specialistDescription: 'Especialista en articulación temporomandibular, oclusión y protección contra el desgaste dental nocturno.',
      priority: 'Atención Recomendada',
      physiologicalExplanation: 'Hiperactividad de los músculos maseteros y temporales durante la fase REM del sueño que comprime el disco articular de la ATM y desgasta el esmalte dental.',
      immediateReliefTips: [
        'Compresas tibias en los lados de la cara (músculos maseteros) 10 minutos antes de dormir.',
        'Posición de descanso lingual: lengua suavemente pegada al paladar superior sin apretar dientes.',
        'Tomar citrato de magnesio nocturno para favorecer la relajación muscular profunda.'
      ],
      consultationQuestions: [
        '¿Presento desgaste oclusal en las piezas dentales que amerite guarda rígida de acrílico?',
        '¿Se recomienda aplicar fisioterapia maxilofacial o toxina botulínica en maseteros?'
      ],
      lifestyleHabits: [
        'Evitar masticar chicle o morder objetos duros.',
        'Higiene del sueño sin pantallas 30 minutos antes de acostarse.'
      ],
      redFlags: 'Bloqueo articular que impida abrir o cerrar la boca o chasquido agudo con dolor al comer.'
    }
  }
];

export default function App() {
  // Navigation & UI States
  const [activeModule, setActiveModule] = useState('schedule');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Persistent States loaded from localStorage (with presets fallback)
  const [weight, setWeight] = useState(() => {
    const saved = localStorage.getItem('aura-weight');
    return saved ? parseFloat(saved) : 92.0;
  });

  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem('aura-height');
    return saved ? parseFloat(saved) : 1.60;
  });

  const [waterIntake, setWaterIntake] = useState(() => {
    const saved = localStorage.getItem('aura-water');
    return saved ? parseInt(saved) : 0;
  });

  const getSavedArray = (key, fallback) => {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn(`Error parsing localStorage key "${key}":`, e);
    }
    return fallback;
  };

  const [schedule, setSchedule] = useState(() =>
    getSavedArray('aura-schedule', initialSchedule)
  );

  const [selfCareActivities, setSelfCareActivities] = useState(() =>
    getSavedArray('aura-selfcare', initialSelfCareActivities)
  );

  const [healthSymptoms, setHealthSymptoms] = useState(() =>
    getSavedArray('aura-health-tracker', initialHealthSymptoms)
  );

  const [householdItems, setHouseholdItems] = useState(() =>
    getSavedArray('aura-household', initialHousehold)
  );

  const [experiences, setExperiences] = useState(() =>
    getSavedArray('aura-experiences', initialExperiences)
  );

  const [wardrobe, setWardrobe] = useState(() =>
    getSavedArray('aura-wardrobe', initialWardrobe)
  );

  const [customOutfits, setCustomOutfits] = useState(() =>
    getSavedArray('aura-outfits', [])
  );

  const [customManuals, setCustomManuals] = useState(() =>
    getSavedArray('aura-manuals', [])
  );

  const [customTimers, setCustomTimers] = useState(() =>
    getSavedArray('aura-timers', [])
  );

  // Sync health symptoms to localStorage
  useEffect(() => {
    localStorage.setItem('aura-health-tracker', JSON.stringify(healthSymptoms));
  }, [healthSymptoms]);

  // ==========================================
  // CLOUD SYNC STATE DECLARATIONS
  // ==========================================
  const [firebaseConfig, setFirebaseConfig] = useState(() => {
    const saved = localStorage.getItem('aura-firebase-config');
    return saved ? JSON.parse(saved) : {
      apiKey: '',
      projectId: '',
      authDomain: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
      syncKey: ''
    };
  });

  const [isSyncActive, setIsSyncActive] = useState(() => {
    return localStorage.getItem('aura-sync-active') === 'true';
  });

  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(() => {
    const saved = localStorage.getItem('aura-sync-auto');
    return saved ? saved === 'true' : true;
  });

  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem('aura-last-sync-time') || '';
  });

  const [db, setDb] = useState(null);

  // Sync control refs to prevent race conditions and unwanted auto-overwrites
  const isInitialMountRef = useRef(true);
  const isRemoteUpdateRef = useRef(false);
  const lastLocalUpdateRef = useRef(parseInt(localStorage.getItem('aura-last-updated') || '0', 10));

  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('aura-gemini-key') || '';
  });

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('aura-gemini-key', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem('aura-firebase-config', JSON.stringify(firebaseConfig));
  }, [firebaseConfig]);

  useEffect(() => {
    localStorage.setItem('aura-sync-active', isSyncActive.toString());
  }, [isSyncActive]);

  useEffect(() => {
    localStorage.setItem('aura-sync-auto', isAutoSyncEnabled.toString());
  }, [isAutoSyncEnabled]);

  useEffect(() => {
    localStorage.setItem('aura-last-sync-time', lastSyncTime);
  }, [lastSyncTime]);

  // Dynamic Firebase Initialization
  useEffect(() => {
    if (!isSyncActive) {
      setDb(null);
      return;
    }

    const { apiKey, projectId, syncKey } = firebaseConfig;
    if (!apiKey || !projectId || !syncKey) {
      setIsSyncActive(false);
      return;
    }

    try {
      const appName = 'aura-nexus-sync';
      const app = getApps().find(a => a.name === appName) 
        ? getApp(appName) 
        : initializeApp(firebaseConfig, appName);
      
      const firestoreInstance = getFirestore(app);
      setDb(firestoreInstance);
      showToast('success', 'Nube Conectada', 'Estableciendo comunicación con Cloud Firestore.');
    } catch (error) {
      console.error("Firebase init error:", error);
      showToast('error', 'Error de Conexión', 'No se pudo conectar a Firebase. Verifica la configuración.');
      setIsSyncActive(false);
    }
  }, [isSyncActive, firebaseConfig]);

  // Helper pack/unpack methods
  const getSyncData = () => {
    return {
      weight,
      height,
      waterIntake,
      schedule,
      selfCareActivities: selfCareActivities || [],
      healthSymptoms: healthSymptoms || [],
      householdItems,
      experiences,
      wardrobe,
      customOutfits,
      customManuals,
      customTimers,
      geminiApiKey: (geminiApiKey || localStorage.getItem('aura-gemini-key') || '').trim(),
      lastUpdated: Date.now()
    };
  };

  const setAllStatesFromData = (data) => {
    if (!data) return;
    if (data.weight !== undefined) {
      setWeight(data.weight);
      localStorage.setItem('aura-weight', data.weight.toString());
    }
    if (data.height !== undefined) {
      setHeight(data.height);
      localStorage.setItem('aura-height', data.height.toString());
    }
    if (data.waterIntake !== undefined) {
      setWaterIntake(data.waterIntake);
      localStorage.setItem('aura-water', data.waterIntake.toString());
    }
    if (Array.isArray(data.schedule)) {
      setSchedule(data.schedule);
      localStorage.setItem('aura-schedule', JSON.stringify(data.schedule));
    }
    if (Array.isArray(data.selfCareActivities)) {
      setSelfCareActivities(data.selfCareActivities);
      localStorage.setItem('aura-selfcare', JSON.stringify(data.selfCareActivities));
    }
    if (Array.isArray(data.healthSymptoms)) {
      setHealthSymptoms(data.healthSymptoms);
      localStorage.setItem('aura-health-tracker', JSON.stringify(data.healthSymptoms));
    }
    if (Array.isArray(data.householdItems)) {
      setHouseholdItems(data.householdItems);
      localStorage.setItem('aura-household', JSON.stringify(data.householdItems));
    }
    if (Array.isArray(data.experiences)) {
      setExperiences(data.experiences);
      localStorage.setItem('aura-experiences', JSON.stringify(data.experiences));
    }
    if (Array.isArray(data.wardrobe)) {
      setWardrobe(data.wardrobe);
      localStorage.setItem('aura-wardrobe', JSON.stringify(data.wardrobe));
    }
    if (Array.isArray(data.customOutfits)) {
      setCustomOutfits(data.customOutfits);
      localStorage.setItem('aura-outfits', JSON.stringify(data.customOutfits));
    }
    if (Array.isArray(data.customManuals)) {
      setCustomManuals(data.customManuals);
      localStorage.setItem('aura-manuals', JSON.stringify(data.customManuals));
    }
    if (Array.isArray(data.customTimers)) {
      setCustomTimers(data.customTimers);
      localStorage.setItem('aura-timers', JSON.stringify(data.customTimers));
    }
    if (typeof data.geminiApiKey === 'string' && data.geminiApiKey.trim()) {
      setGeminiApiKey(data.geminiApiKey.trim());
      localStorage.setItem('aura-gemini-key', data.geminiApiKey.trim());
    }
  };

  const handlePull = async () => {
    if (!db || !firebaseConfig.syncKey) {
      showToast('error', 'Error', 'La base de datos no está inicializada o falta la clave.');
      return;
    }
    setSyncLoading(true);
    try {
      const docRef = doc(db, 'users', firebaseConfig.syncKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        isRemoteUpdateRef.current = true;
        const cloudTimestamp = cloudData.lastUpdated || Date.now();
        lastLocalUpdateRef.current = cloudTimestamp;
        localStorage.setItem('aura-last-updated', cloudTimestamp.toString());
        
        setAllStatesFromData(cloudData);
        const timeStr = new Date().toLocaleTimeString();
        setLastSyncTime(timeStr);
        showToast('success', 'Sincronizado', 'Datos descargados de la nube con éxito.');
      } else {
        showToast('warning', 'Sin Registro', 'No hay datos guardados para esta clave en la nube.');
      }
    } catch (error) {
      console.error("Pull error:", error);
      showToast('error', 'Fallo de Descarga', 'No se pudo descargar de la nube: ' + error.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePush = async () => {
    if (!db || !firebaseConfig.syncKey) {
      showToast('error', 'Error', 'La base de datos no está inicializada o falta la clave.');
      return;
    }
    setSyncLoading(true);
    try {
      const now = Date.now();
      lastLocalUpdateRef.current = now;
      localStorage.setItem('aura-last-updated', now.toString());

      const docRef = doc(db, 'users', firebaseConfig.syncKey);
      await setDoc(docRef, {
        ...getSyncData(),
        lastUpdated: now
      });
      const timeStr = new Date().toLocaleTimeString();
      setLastSyncTime(timeStr);
      showToast('success', 'Sincronizado', 'Datos subidos a la nube con éxito.');
    } catch (error) {
      console.error("Push error:", error);
      showToast('error', 'Fallo de Subida', 'No se pudo subir a la nube: ' + error.message);
    } finally {
      setSyncLoading(false);
    }
  };

  // Real-time Cloud Listener & Safe Auto-Pull on connect
  useEffect(() => {
    if (!db || !isSyncActive || !firebaseConfig.syncKey) return;

    const docRef = doc(db, 'users', firebaseConfig.syncKey);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      // Ignore our own local pending write
      if (docSnap.metadata?.hasPendingWrites) return;

      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        const cloudTimestamp = cloudData.lastUpdated || 0;

        // If cloud data is newer than what we currently have loaded, update state
        if (cloudTimestamp > lastLocalUpdateRef.current) {
          isRemoteUpdateRef.current = true;
          lastLocalUpdateRef.current = cloudTimestamp;
          localStorage.setItem('aura-last-updated', cloudTimestamp.toString());
          setAllStatesFromData(cloudData);
          setLastSyncTime(new Date().toLocaleTimeString());
        }
      }
    }, (error) => {
      console.error("Firestore real-time listener error:", error);
    });

    return () => unsubscribe();
  }, [db, isSyncActive, firebaseConfig.syncKey]);

  // Debounced Auto-Sync on change (Protects against pushing unedited defaults)
  useEffect(() => {
    // Avoid auto-sync on initial component mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // Avoid pushing back data that was just downloaded from cloud
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (!db || !isSyncActive || !isAutoSyncEnabled || !firebaseConfig.syncKey) return;

    const now = Date.now();
    lastLocalUpdateRef.current = now;
    localStorage.setItem('aura-last-updated', now.toString());

    const handler = setTimeout(async () => {
      try {
        const docRef = doc(db, 'users', firebaseConfig.syncKey);
        await setDoc(docRef, {
          ...getSyncData(),
          lastUpdated: now
        });
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (error) {
        console.error("Autosync write error:", error);
      }
    }, 1500);

    return () => clearTimeout(handler);
  }, [
    db,
    isSyncActive,
    isAutoSyncEnabled,
    weight,
    height,
    waterIntake,
    schedule,
    selfCareActivities,
    householdItems,
    experiences,
    wardrobe,
    customOutfits,
    customManuals,
    customTimers,
    geminiApiKey
  ]);

  // ==========================================
  // SYNC TO LOCAL STORAGE
  // ==========================================
  useEffect(() => {
    localStorage.setItem('aura-weight', weight.toString());
  }, [weight]);

  useEffect(() => {
    localStorage.setItem('aura-height', height.toString());
  }, [height]);

  useEffect(() => {
    localStorage.setItem('aura-water', waterIntake.toString());
  }, [waterIntake]);

  useEffect(() => {
    localStorage.setItem('aura-schedule', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('aura-selfcare', JSON.stringify(selfCareActivities));
  }, [selfCareActivities]);

  useEffect(() => {
    localStorage.setItem('aura-household', JSON.stringify(householdItems));
  }, [householdItems]);

  useEffect(() => {
    localStorage.setItem('aura-experiences', JSON.stringify(experiences));
  }, [experiences]);

  useEffect(() => {
    localStorage.setItem('aura-wardrobe', JSON.stringify(wardrobe));
  }, [wardrobe]);

  useEffect(() => {
    localStorage.setItem('aura-outfits', JSON.stringify(customOutfits));
  }, [customOutfits]);

  useEffect(() => {
    localStorage.setItem('aura-manuals', JSON.stringify(customManuals));
  }, [customManuals]);

  useEffect(() => {
    localStorage.setItem('aura-timers', JSON.stringify(customTimers));
  }, [customTimers]);

  // ==========================================
  // TOAST FEEDBACK HANDLERS
  // ==========================================
  const showToast = (type, title, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const handleCloseToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Water goal & percent for Sidebar Widget
  const waterGoal = Math.round(weight * 35);
  const waterPercent = Math.min(100, Math.round((waterIntake / waterGoal) * 100));

  // Breadcrumbs title mapper
  const moduleTitles = {
    schedule: 'Rutina Diaria & Cronograma',
    copilot: 'AURA Copilot & Conversor de Rutinas IA',
    health: 'Tracker de Dolor, Postura & Diagnóstico IA',
    comparator: 'Comparador de Precios & Alacena',
    experiences: 'Bitácora de Experiencias',
    wardrobe: 'Armario Virtual Geek Chic',
    manuals: 'Biblioteca de Estilo de Vida',
    timers: 'Temporizadores de Tratamientos',
    sync: 'Sincronización en la Nube'
  };

  // Menu items list
  const menuItems = [
    { id: 'schedule', label: 'Rutina Diaria', icon: <Calendar className="w-5 h-5" /> },
    { id: 'copilot', label: 'Chat Copilot IA', icon: <Bot className="w-5 h-5 text-[#e0a96d]" /> },
    { id: 'health', label: 'Dolor & Salud IA', icon: <HeartPulse className="w-5 h-5" /> },
    { id: 'comparator', label: 'Comparador de Precios', icon: <Tag className="w-5 h-5" /> },
    { id: 'experiences', label: 'Bitácora & Reviews', icon: <MapPin className="w-5 h-5" /> },
    { id: 'wardrobe', label: 'Armario Virtual', icon: <Shirt className="w-5 h-5" /> },
    { id: 'manuals', label: 'Manuales de Estilo', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'timers', label: 'Temporizadores', icon: <Clock className="w-5 h-5" /> },
    { id: 'sync', label: 'Sincronizar Nube', icon: <Cloud className="w-5 h-5" /> },
  ];

  return (
    <div className="flex min-h-screen bg-[#0b0c10] text-slate-100 antialiased overflow-x-hidden font-sans">

      {/* SIDEBAR NAVIGATION */}
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-[#0b0c10]/80 z-30 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 bg-[#11131a] border-r border-[#e0a96d]/15 z-40
        flex flex-col justify-between transition-all duration-300
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Sidebar Header Brand */}
        <div>
          <div className="flex items-center justify-between p-5 border-b border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-[#e0a96d]/10 border border-[#e0a96d]/30 flex items-center justify-center shrink-0">
                <span className="text-[#e0a96d] font-black text-lg font-outfit tracking-tighter">AN</span>
              </div>
              {!sidebarCollapsed && (
                <span className="font-outfit font-black text-md tracking-wider text-slate-100">
                  AURA <span className="text-[#e0a96d]">Nexus</span>
                </span>
              )}
            </div>

            {/* Mobile close menu */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-200 cursor-pointer"
              aria-label="Cerrar menú lateral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 mt-4">
            {menuItems.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveModule(item.id);
                    setMobileOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer group
                    ${isActive
                      ? 'bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/20 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#171a24] border border-transparent'}
                  `}
                  aria-label={item.label}
                >
                  <span className={`shrink-0 transition-colors ${isActive ? 'text-[#e0a96d]' : 'text-slate-400 group-hover:text-slate-300'}`}>
                    {item.icon}
                  </span>
                  {(!sidebarCollapsed) && (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer & Interactive Water Widget */}
        <div className="p-4 border-t border-slate-800 space-y-4">

          {/* Hydration Sidebar Widget */}
          {!sidebarCollapsed && (
            <div className="p-3.5 bg-[#171a24] border border-[#e0a96d]/10 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1 uppercase tracking-wider">
                  <Droplet className="w-3.5 h-3.5 text-[#e0a96d]" /> H₂O Hoy
                </span>
                <span className="text-[#e0a96d]">{waterPercent}%</span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-200">{waterIntake} ml</span>
                <span className="text-[9px] text-slate-500 font-semibold">Meta: {waterGoal}ml</span>
              </div>

              {/* Mini progress bar */}
              <div className="w-full bg-[#0b0c10] h-1.5 rounded-full overflow-hidden border border-slate-900">
                <div
                  className="bg-[#e0a96d] h-full progress-bar-transition rounded-full"
                  style={{ width: `${waterPercent}%` }}
                />
              </div>

              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => {
                    setWaterIntake(waterIntake + 250);
                    showToast('info', 'Consumo de Agua', 'Consumo: +250 ml de agua');
                  }}
                  className="flex-1 bg-[#0b0c10] hover:bg-[#e0a96d]/5 border border-[#e0a96d]/15 text-[9px] font-bold py-1 px-1 rounded text-center transition-colors cursor-pointer text-slate-300"
                >
                  +250ml
                </button>
                <button
                  onClick={() => {
                    setWaterIntake(waterIntake + 500);
                    showToast('info', 'Consumo de Agua', 'Consumo: +500 ml de agua');
                  }}
                  className="flex-1 bg-[#0b0c10] hover:bg-[#e0a96d]/5 border border-[#e0a96d]/15 text-[9px] font-bold py-1 px-1 rounded text-center transition-colors cursor-pointer text-slate-300"
                >
                  +500ml
                </button>
              </div>
            </div>
          )}

          {/* Collapse sidebar trigger */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center w-full py-2 bg-[#171a24] hover:bg-[#e0a96d]/5 border border-slate-800 hover:border-[#e0a96d]/20 rounded-lg text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            aria-label={sidebarCollapsed ? 'Expandir barra' : 'Colapsar barra'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT BODY */}
      <main className={`
        flex-1 min-h-screen flex flex-col transition-all duration-300
        ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}
      `}>

        {/* HEADER */}
        <header className="bg-[#11131a] border-b border-[#e0a96d]/15 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-20">

          <div className="flex items-center gap-3">
            {/* Hamburger button for mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-slate-300 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Breadcrumb Module Title */}
            <div className="breadcrumbs">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">AURA Nexus</span>
              <span className="text-base font-extrabold text-slate-100 font-outfit">
                {moduleTitles[activeModule]}
              </span>
            </div>
          </div>

          {/* Simulated widgets in Header */}
          <div className="flex items-center gap-4">

            {/* Weather Widget */}
            <div className="hidden sm:flex items-center gap-2 bg-[#171a24] border border-[#e0a96d]/10 px-3 py-1.5 rounded-xl text-xs">
              <CloudSun className="w-4 h-4 text-[#e0a96d] shrink-0" />
              <span className="text-slate-300 font-medium">Soleado, 24°C</span>
            </div>

            {/* Environment Widget */}
            <div className="hidden md:flex items-center gap-2 bg-[#171a24] border border-[#e0a96d]/10 px-3 py-1.5 rounded-xl text-xs">
              <Home className="w-4 h-4 text-[#e0a96d] shrink-0" />
              <span className="text-slate-300 font-medium">Home Office</span>
            </div>

            {/* User Profile Avatar */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#e0a96d] to-[#f5d4af] text-[#0b0c10] font-bold text-xs flex items-center justify-center select-none shadow">
                AN
              </div>
              <div className="hidden xl:block text-left">
                <span className="text-xs font-semibold text-slate-200 block leading-tight">Arianna A.</span>
                <span className="text-[9px] text-slate-500 block">Lead Engineer</span>
              </div>
            </div>

          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <div className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeModule === 'schedule' && (
            <ScheduleModule
              weight={weight}
              setWeight={setWeight}
              height={height}
              setHeight={setHeight}
              waterIntake={waterIntake}
              setWaterIntake={setWaterIntake}
              schedule={schedule}
              setSchedule={setSchedule}
              selfCareActivities={selfCareActivities}
              setSelfCareActivities={setSelfCareActivities}
              showToast={showToast}
            />
          )}

          {activeModule === 'copilot' && (
            <CopilotModule
              geminiApiKey={geminiApiKey}
              householdItems={householdItems}
              setHouseholdItems={setHouseholdItems}
              selfCareActivities={selfCareActivities}
              setSelfCareActivities={setSelfCareActivities}
              customTimers={customTimers}
              setCustomTimers={setCustomTimers}
              schedule={schedule}
              setSchedule={setSchedule}
              showToast={showToast}
              setActiveModule={setActiveModule}
            />
          )}

          {activeModule === 'health' && (
            <HealthTrackerModule
              healthSymptoms={healthSymptoms}
              setHealthSymptoms={setHealthSymptoms}
              geminiApiKey={geminiApiKey}
              showToast={showToast}
            />
          )}

          {activeModule === 'comparator' && (
            <PriceComparatorModule
              householdItems={householdItems}
              setHouseholdItems={setHouseholdItems}
              showToast={showToast}
              geminiApiKey={geminiApiKey}
            />
          )}

          {activeModule === 'experiences' && (
            <ExperiencesModule
              experiences={experiences}
              setExperiences={setExperiences}
              showToast={showToast}
              geminiApiKey={geminiApiKey}
            />
          )}

          {activeModule === 'wardrobe' && (
            <WardrobeModule
              wardrobe={wardrobe}
              setWardrobe={setWardrobe}
              customOutfits={customOutfits}
              setCustomOutfits={setCustomOutfits}
              showToast={showToast}
              geminiApiKey={geminiApiKey}
              setGeminiApiKey={setGeminiApiKey}
            />
          )}

          {activeModule === 'manuals' && (
            <ManualsModule
              customManuals={customManuals}
              setCustomManuals={setCustomManuals}
              showToast={showToast}
            />
          )}

          {activeModule === 'timers' && (
            <TimersModule
              customTimers={customTimers}
              setCustomTimers={setCustomTimers}
              showToast={showToast}
            />
          )}

          {activeModule === 'sync' && (
            <SyncModule
              firebaseConfig={firebaseConfig}
              setFirebaseConfig={setFirebaseConfig}
              isSyncActive={isSyncActive}
              setIsSyncActive={setIsSyncActive}
              onPull={handlePull}
              onPush={handlePush}
              showToast={showToast}
              syncLoading={syncLoading}
              lastSyncTime={lastSyncTime}
              isAutoSyncEnabled={isAutoSyncEnabled}
              setIsAutoSyncEnabled={setIsAutoSyncEnabled}
              geminiApiKey={geminiApiKey}
              setGeminiApiKey={setGeminiApiKey}
            />
          )}
        </div>

        {/* TOAST SYSTEM */}
        <Toast toasts={toasts} onClose={handleCloseToast} />

        {/* FLOATING COPILOT LAUNCHER BUTTON */}
        {activeModule !== 'copilot' && (
          <button
            onClick={() => setActiveModule('copilot')}
            className="fixed bottom-6 right-6 z-30 p-3.5 bg-gradient-to-r from-[#e0a96d] to-[#b37d46] text-[#0b0c10] rounded-full shadow-2xl hover:scale-105 transition-all cursor-pointer flex items-center gap-2 group font-bold text-xs"
            title="Abrir AURA Copilot & Conversor de Rutinas IA"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="hidden sm:inline font-outfit font-black">Copilot IA</span>
          </button>
        )}

      </main>

    </div>
  );
}
