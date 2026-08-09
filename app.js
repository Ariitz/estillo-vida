/**
 * AURA Nexus - Core Application Script
 * Arquitectura SPA, Manejo de Estado y Lógica de Submódulos
 */

// ==========================================================================
// ESTADO GLOBAL DE LA APLICACIÓN (DATABASE CON PERSISTENCIA)
// ==========================================================================
let db = {
  theme: 'dark', // 'dark' | 'light'
  activeModule: 'sec-dashboard',
  activeSubTab: 'tab-higiene',
  hygieneRoutineTime: 'morning', // 'morning' | 'afternoon' | 'night'
  
  // Submódulo 1: Higiene y Rutinas
  routines: {
    morning: [
      { id: 'm1', text: 'Lavado de cara con limpiador suave', checked: false },
      { id: 'm2', text: 'Aplicar tónico hidratante', checked: false },
      { id: 'm3', text: 'Crema hidratante ligera', checked: false },
      { id: 'm4', text: 'Protector solar FPS 50+ (Indispensable exterior)', checked: false },
      { id: 'm5', text: 'Higiene bucal y cepillado', checked: false }
    ],
    afternoon: [
      { id: 'a1', text: 'Refrescar rostro con bruma hidratante', checked: false },
      { id: 'a2', text: 'Reaplicación de protector solar (si sales)', checked: false },
      { id: 'a3', text: 'Higiene de manos y sanitización', checked: false }
    ],
    night: [
      { id: 'n1', text: 'Doble limpieza facial (desmaquillante/limpiador)', checked: false },
      { id: 'n2', text: 'Aplicación de suero reparador / nutritivo', checked: false },
      { id: 'n3', text: 'Crema de noche regeneradora o corporal', checked: false },
      { id: 'n4', text: 'Uso de seda capilar o gorro de satén para dormir', checked: false },
      { id: 'n5', text: 'Higiene bucal completa con hilo dental', checked: false }
    ]
  },
  hairWashHistory: [], // Timestamps de lavados
  hairContext: 'home', // 'home' | 'public'
  
  products: [
    { id: 'p1', name: 'Bloqueador Solar FPS 50+', category: 'Cutáneo', expiration: '2027-02-15' },
    { id: 'p2', name: 'Crema Hidratante Cerave', category: 'Cutáneo', expiration: '2026-11-20' },
    { id: 'p3', name: 'Aceite de Argán Capilar', category: 'Capilar', expiration: '2026-09-01' },
    { id: 'p4', name: 'Bruma Facial de Rosas (Viejo)', category: 'Cutáneo', expiration: '2026-04-10' } // Vencida
  ],

  // Submódulo 2: Closet & Outfits
  closet: [
    { id: 'c1', name: 'Camiseta Anime Evangelion Eva-01', category: 'tshirts', detail: 'Negra, algodón suave' },
    { id: 'c2', name: 'Camiseta Gráfica Serial Experiments Lain', category: 'tshirts', detail: 'Blanca, holgada' },
    { id: 'c3', name: 'Hoodie Oversize Gris con Forro de Satén', category: 'hoodies', detail: 'Ideal para evitar frizz' },
    { id: 'c4', name: 'Sudadera Cómoda Negra Tacto Suave', category: 'hoodies', detail: 'Muy cómoda para home office' },
    { id: 'c5', name: 'Pantalón Jogger Algodón Negro', category: 'pants', detail: 'Cintura elástica, bolsillos amplios' },
    { id: 'c6', name: 'Jeans Flexibles Confort Estirable', category: 'pants', detail: 'Color azul oscuro' },
    { id: 'c7', name: 'Tenis Ergonómicos de Marcha Negra', category: 'shoes', detail: 'Suela amortiguada, sin cordones' },
    { id: 'c8', name: 'Sandalias de Casa Acojinas', category: 'shoes', detail: 'Suela memory foam' },
    { id: 'c9', name: 'Scrunchie de Satén Verde Salvia', category: 'accessories', detail: 'Sujeción suave antirotura' },
    { id: 'c10', name: 'Collar de Cadena Delgada con Dije de Luna', category: 'accessories', detail: 'Plata esterlina minimalista' },
    { id: 'c11', name: 'Mochila de Viaje Táctica 40L (Doble Laptop)', category: 'travel', detail: 'Resistente al agua, compartimento reforzado' }
  ],
  selectedOutfitScenario: 'home-office',

  // Submódulo 3: Salud & Medicamentos
  medications: [
    { id: 'm1', name: 'Levotiroxina', dose: '100 mcg', frequency: 'Cada 24 horas (en ayuno)', endDate: '2027-08-30', sideEffects: 'Ninguno reportado' },
    { id: 'm2', name: 'Complejo B / Suplemento', dose: '1 cápsula', frequency: 'Con el almuerzo', endDate: '2026-10-15', sideEffects: 'Coloración en orina' }
  ],
  wellbeingJournal: [
    { date: '2026-07-28', energy: 8, sleep: 8.0, sleepQuality: 'buena', symptoms: 'Ninguno' },
    { date: '2026-07-29', energy: 6, sleep: 6.5, sleepQuality: 'regular', symptoms: 'Ligera tensión cervical' }
  ],
  waterGlasses: 2, // Vasos tomados hoy

  // Submódulo 4: Entorno & Logística
  environmentMode: 'home', // 'home' | 'travel'
  activeBreaksCount: 1, // Pausas activas hoy
  travelChecklist: [
    { id: 'tc1', text: 'Laptops (Trabajo + Personal) y cargadores USB-C/propios', checked: false },
    { id: 'tc2', text: 'Periféricos y Cables (Mouse, audífonos con cancelación de ruido, cable HDMI/Ethernet)', checked: false },
    { id: 'tc3', text: 'Ropa: 3 camisetas (anime/gráficas), 2 hoodies/sudaderas cómodas, pants/joggers, ropa interior', checked: false },
    { id: 'tc4', text: 'Calzado: Tenis ergonómicos para marcha + sandalias cómodas de descanso', checked: false },
    { id: 'tc5', text: 'Kit de Higiene Personal (Limpiador facial, crema hidratante, protector solar, desodorante, cepillo/pasta)', checked: false },
    { id: 'tc6', text: 'Kit de Cuidado Capilar (Champú de viaje, acondicionador, cepillo, gorro y scrunchies de satén)', checked: false },
    { id: 'tc7', text: 'Mochila táctica de alta capacidad (40L para doble laptop) acomodada ergonómicamente', checked: false },
    { id: 'tc8', text: 'Accesorios mínimos (Collar minimalista, lentes de sol, scrunchies de satén extra)', checked: false },
    { id: 'tc9', text: 'Logística de perrita (Premios olorosos, correa corta, arnés de doble anclaje, plato colapsable, porción de comida, cartilla)', checked: false },
    { id: 'tc10', text: 'Documentos personales, llaves, cartera, cargador portátil (powerbank)', checked: false }
  ],
  microLogs: [
    { id: 'ml1', activity: 'Venta de Café Molido Especialidad (Origen Chiapas)', desc: '2 bolsas de 500g (Molido Medio)', amount: 380 },
    { id: 'ml2', activity: 'Venta de Filtros y Tazas de Café', desc: '1 kit de goteo V60 + filtros de papel', amount: 240 }
  ],
  petRoutine: [
    { id: 'pr1', text: 'Medicación de Hipotiroidismo (Dosis Levotiroxina Mañana)', checked: false },
    { id: 'pr2', text: 'Suplemento articular (Condroprotector para displasia de cadera)', checked: false },
    { id: 'pr3', text: 'Paseo a paso lento y sobre terreno plano (Correa corta y arnés doble)', checked: false },
    { id: 'pr4', text: 'Medicación de Hipotiroidismo (Dosis Levotiroxina Noche)', checked: false },
    { id: 'pr5', text: 'Revisión y limpieza ocular (Seguimiento de cataratas/nubes en los ojos)', checked: false },
    { id: 'pr6', text: 'Sesión de gestos visuales y contacto suave (Compensar sordera/pérdida de visión)', checked: false },
    { id: 'pr7', text: 'Alimentación balanceada dosificada', checked: false }
  ],

  // Submódulo 5: Asistente Matutino
  checkinState: {
    completed: false,
    currentStep: 1,
    stayOrGo: null, // 'stay' | 'go'
    weather: null,   // 'sunny' | 'rainy' | 'mild'
    energy: null     // 'high' | 'medium' | 'low'
  },

  // Base Modules Adicionales (Placeholders Dinámicos)
  projectsBase: [
    { id: 'pb1', name: 'Optimización de Rutina de Viaje', desc: 'Diseñar el kit logístico ideal para transporte con doble laptop.' },
    { id: 'pb2', name: 'Inventario de Closet', desc: 'Depurar prendas de invierno y catalogar camisetas gráficas.' }
  ],
  tasksBase: [
    { id: 'tb1', projectId: 'pb1', desc: 'Comprar organizador de cables elástico', priority: 'alta', done: false },
    { id: 'tb2', projectId: 'pb1', desc: 'Pesar mochila con carga máxima de laptops', priority: 'media', done: true },
    { id: 'tb3', projectId: 'pb2', desc: 'Clasificar collares y accesorios del cabello', priority: 'baja', done: false }
  ],
  companions: [
    { id: 'co1', name: 'Rocky', role: 'Mascota (Mestizo Reactivo)', routine: 'Paseos (6 AM / 8 PM) - Comida (8 AM / 7 PM)' },
    { id: 'co2', name: 'Sofía', role: 'Pareja / Roomie', routine: 'Gimnasio (7 AM) - Trabajo remoto (9 AM - 5 PM) - Cocinar (7:30 PM)' }
  ]
};

// ==========================================================================
// INICIALIZACIÓN Y PERSISTENCIA DE DATOS
// ==========================================================================
function loadDatabase() {
  const localData = localStorage.getItem('aura_nexus_db');
  if (localData) {
    try {
      db = JSON.parse(localData);
    } catch (e) {
      console.error("Error cargando base de datos local, restableciendo...", e);
    }
  } else {
    saveDatabase(); // Guardar el estado inicial por defecto
  }
}

function saveDatabase() {
  localStorage.setItem('aura_nexus_db', JSON.stringify(db));
}

// ==========================================================================
// CONTROLADOR DE NAVEGACIÓN SPA Y SIDEBAR
// ==========================================================================
function initNavigation() {
  const menuItems = document.querySelectorAll('.menu-item');
  const modules = document.querySelectorAll('.module-view');
  const titleSpan = document.getElementById('currentSectionTitle');

  // Navegación Sidebar
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('data-target');
      
      // Actualizar estado en Sidebar
      menuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // Actualizar modulos
      modules.forEach(mod => mod.classList.remove('active'));
      const activeMod = document.getElementById(targetId);
      if (activeMod) {
        activeMod.classList.add('active');
      }

      // Actualizar Título
      titleSpan.innerText = item.querySelector('.menu-text').innerText;
      db.activeModule = targetId;
      saveDatabase();

      // Cerrar menú móvil al navegar
      document.getElementById('appSidebar').classList.remove('mobile-active');

      // Renderizar datos específicos al entrar al módulo
      renderCurrentModuleView(targetId);
    });
  });

  // Navegación Sub-tabs (Módulo Estilo de Vida)
  const subTabBtns = document.querySelectorAll('.sub-tab-btn');
  const subModules = document.querySelectorAll('.sub-module-content');

  subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSub = btn.getAttribute('data-sub');
      
      subTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      subModules.forEach(sub => sub.classList.remove('active'));
      const activeSub = document.getElementById(targetSub);
      if (activeSub) {
        activeSub.classList.add('active');
      }

      db.activeSubTab = targetSub;
      saveDatabase();
      renderCurrentSubmoduleView(targetSub);
    });
  });

  // Restaurar sección activa desde la base de datos al iniciar
  if (db.activeModule) {
    const activeBtn = document.querySelector(`[data-target="${db.activeModule}"]`);
    if (activeBtn) {
      activeBtn.click();
    }
  }

  if (db.activeSubTab) {
    const activeSubBtn = document.querySelector(`[data-sub="${db.activeSubTab}"]`);
    if (activeSubBtn) {
      activeSubBtn.click();
    }
  }
}

// Configuración del Sidebar colapsable
function initSidebarCollapsing() {
  const sidebar = document.getElementById('appSidebar');
  const toggleBtn = document.getElementById('toggleSidebar');
  const mobileBtn = document.getElementById('mobileMenuBtn');

  // Colapsar en Escritorio
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  // Menú Móvil
  mobileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('mobile-active');
  });

  // Cerrar haciendo clic fuera
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !mobileBtn.contains(e.target)) {
      sidebar.classList.remove('mobile-active');
    }
  });
}

// Renderización general según el módulo cargado
function renderCurrentModuleView(moduleId) {
  if (moduleId === 'sec-dashboard') {
    renderDashboard();
  } else if (moduleId === 'sec-estilo-vida') {
    renderCurrentSubmoduleView(db.activeSubTab);
  } else if (moduleId === 'sec-proyectos') {
    renderProjectsBase();
    renderTasksBase();
  } else if (moduleId === 'sec-companeros') {
    renderCompanions();
  } else if (moduleId === 'sec-configuracion') {
    renderSettings();
  }
}

function renderCurrentSubmoduleView(subTabId) {
  if (subTabId === 'tab-higiene') {
    renderRoutineChecklist();
    renderHairSection();
    renderProductsTable();
  } else if (subTabId === 'tab-armario') {
    renderClosetGrid();
    generateOutfitRecommendation();
  } else if (subTabId === 'tab-salud') {
    renderMedicationsList();
    renderWellbeingJournalForm();
  } else if (subTabId === 'tab-entorno') {
    renderEnvironmentSection();
    renderMicroLogsList();
    renderPetRoutineSection();
  } else if (subTabId === 'tab-asistente') {
    renderAssistantView();
  }
}

// ==========================================================================
// MOTOR DE TEMAS (DARK / LIGHT MODE)
// ==========================================================================
function initThemeEngine() {
  const themeToggle = document.getElementById('themeToggleBtn');
  
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark-mode');
    db.theme = isDark ? 'dark' : 'light';
    saveDatabase();
    updateThemeUIElements();
  });

  // Escuchar cambios del sistema operativo si no se ha guardado preferencia
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    const savedTheme = localStorage.getItem("app-theme");
    if (!savedTheme) {
      document.documentElement.classList.toggle('dark-mode', e.matches);
      updateThemeUIElements();
    }
  });

  updateThemeUIElements();
}

function updateThemeUIElements() {
  const themeLabel = document.getElementById('settingsThemeToggle');
  const isDark = document.documentElement.classList.contains('dark-mode');
  
  if (themeLabel) {
    themeLabel.innerText = isDark ? 'Modo Oscuro: Activado' : 'Modo Oscuro: Desactivado';
  }
}

function toggleGlobalTheme() {
  const isDark = document.documentElement.classList.toggle('dark-mode');
  db.theme = isDark ? 'dark' : 'light';
  saveDatabase();
  updateThemeUIElements();
}

// ==========================================================================
// SUBMÓDULO 1: HIGIENE, RUTINAS Y CAPILAR
// ==========================================================================

// Cambiar hora de rutina (Mañana, Tarde, Noche)
function switchRoutineTime(time) {
  db.hygieneRoutineTime = time;
  
  // Actualizar botones activos
  const buttons = document.querySelectorAll('.routine-selector .btn');
  buttons.forEach(b => b.classList.remove('active'));
  
  const targetIndex = time === 'morning' ? 0 : time === 'afternoon' ? 1 : 2;
  buttons[targetIndex].classList.add('active');

  renderRoutineChecklist();
}

// Renderizar checklist de rutina
function renderRoutineChecklist() {
  const container = document.getElementById('routineChecklist');
  const activeTime = db.hygieneRoutineTime || 'morning';
  const list = db.routines[activeTime];
  
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<p class="text-muted">No hay tareas programadas para esta rutina.</p>`;
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="checklist-item ${item.checked ? 'checked' : ''}" onclick="toggleRoutineItem('${activeTime}', '${item.id}')">
      <div class="checkbox-custom">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span>${item.text}</span>
    </div>
  `).join('');

  // Actualizar anillo del dashboard
  calculateHygieneProgress();
}

// Marcar/Desmarcar item de rutina
function toggleRoutineItem(time, itemId) {
  const item = db.routines[time].find(i => i.id === itemId);
  if (item) {
    item.checked = !item.checked;
    saveDatabase();
    renderRoutineChecklist();
  }
}

// Calcular progreso total de higiene diaria
function calculateHygieneProgress() {
  const total = db.routines.morning.length + db.routines.afternoon.length + db.routines.night.length;
  const checked = [...db.routines.morning, ...db.routines.afternoon, ...db.routines.night].filter(i => i.checked).length;
  
  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;
  
  // Actualizar Dashboard Ring
  const progressRing = document.getElementById('hygieneProgressRing');
  const progressText = document.getElementById('hygieneProgressText');
  
  if (progressRing && progressText) {
    const radius = progressRing.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
    progressRing.style.strokeDashoffset = offset;
    progressText.innerText = `${percentage}%`;
  }
}

// Registrar lavado de cabello
function registerHairWash() {
  const now = new Date();
  db.hairWashHistory.push(now.toISOString());
  saveDatabase();
  renderHairSection();
}

// Renderizar sección capilar
function renderHairSection() {
  const lastWashLabel = document.getElementById('lastWashLabel');
  if (!lastWashLabel) return;

  if (db.hairWashHistory.length === 0) {
    lastWashLabel.innerText = 'No se han registrado lavados de cabello.';
    return;
  }

  const lastWashDate = new Date(db.hairWashHistory[db.hairWashHistory.length - 1]);
  const diffTime = Math.abs(new Date() - lastWashDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    lastWashLabel.innerText = 'Último lavado: ¡Hoy mismo!';
  } else if (diffDays === 1) {
    lastWashLabel.innerText = 'Último lavado: Ayer';
  } else {
    lastWashLabel.innerText = `Último lavado: Hace ${diffDays} días`;
  }

  updateHairSuggestion();
}

// Actualizar sugerencias de peinado contextual
function updateHairSuggestion() {
  const select = document.getElementById('hairContextSelect');
  const suggestionBox = document.getElementById('hairSuggestionBox');
  if (!select || !suggestionBox) return;

  const choice = select.value;
  db.hairContext = choice;
  saveDatabase();

  if (choice === 'home') {
    suggestionBox.innerHTML = `
      <strong>✨ Recomendación (En Casa / Descanso):</strong> Recogido rápido con accesorios suaves (scrunchies de satén). 
      Evita tensiones excesivas en el cuero cabelludo y el roce con la ropa.
    `;
  } else {
    suggestionBox.innerHTML = `
      <strong>✨ Recomendación (Público / Salida):</strong> Peinado suelto estilizado o trenzado suave elegante. 
      Lleva un scrunchie de satén en tu bolso por si necesitas recogerlo rápidamente con comodidad.
    `;
  }
}

// Renderizar tabla de inventario de productos y vencimientos
function renderProductsTable() {
  const tbody = document.querySelector('#productsTable tbody');
  if (!tbody) return;

  if (db.products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No hay productos registrados.</td></tr>`;
    return;
  }

  const today = new Date();

  tbody.innerHTML = db.products.map(p => {
    const expDate = new Date(p.expiration);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let statusClass = 'badge-success';
    let statusText = 'Ok';

    if (diffDays <= 0) {
      statusClass = 'badge-danger';
      statusText = 'Vencido';
    } else if (diffDays <= 30) {
      statusClass = 'badge-accent';
      statusText = 'Próximo a Vencer';
    }

    return `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td>${p.expiration}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>
          <button class="btn btn-sm btn-outline text-danger" onclick="deleteProduct('${p.id}')">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Guardar nuevo producto
function saveNewProduct(e) {
  e.preventDefault();
  const name = document.getElementById('prodName').value;
  const category = document.getElementById('prodCat').value;
  const expiration = document.getElementById('prodExpiration').value;

  const newProd = {
    id: 'p_' + Date.now(),
    name,
    category,
    expiration
  };

  db.products.push(newProd);
  saveDatabase();
  renderProductsTable();
  closeModal('modalAddProduct');
  document.getElementById('formAddProduct').reset();
}

function deleteProduct(id) {
  db.products = db.products.filter(p => p.id !== id);
  saveDatabase();
  renderProductsTable();
}

// ==========================================================================
// SUBMÓDULO 2: ARMARIO DIGITAL Y OUTFIITS
// ==========================================================================

function renderClosetGrid(categoryFilter = 'all') {
  const grid = document.getElementById('closetItemsGrid');
  if (!grid) return;

  const items = categoryFilter === 'all' 
    ? db.closet 
    : db.closet.filter(item => item.category === categoryFilter);

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state text-center grid-col-span-2">
      <div class="empty-icon">👕</div>
      <p>No hay prendas registradas en esta categoría.</p>
    </div>`;
    return;
  }

  // Iconos representativos según categoría
  const getIcon = (cat) => {
    switch (cat) {
      case 'tshirts': return '👕';
      case 'hoodies': return '🧥';
      case 'pants': return '👖';
      case 'shoes': return '👟';
      case 'accessories': return '🧣';
      case 'travel': return '🎒';
      default: return '👔';
    }
  };

  grid.innerHTML = items.map(item => `
    <div class="closet-card">
      <button class="btn-delete-closet" onclick="deleteClosetItem('${item.id}')">&times;</button>
      <div class="closet-item-icon">${getIcon(item.category)}</div>
      <div class="closet-item-name">${item.name}</div>
      <div class="closet-item-detail">${item.detail || ''}</div>
    </div>
  `).join('');
}

// Iniciar filtros del Closet
function initClosetTabs() {
  const tabs = document.querySelectorAll('#closetCategoryTabs .closet-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.getAttribute('data-cat');
      renderClosetGrid(cat);
    });
  });
}

// Generador de outfits basado en escenario y reglas de comodidad
function generateOutfitRecommendation() {
  const select = document.getElementById('outfitScenarioSelect');
  const resultBox = document.getElementById('outfitRecommendationResult');
  if (!select || !resultBox) return;

  const scenario = select.value;
  db.selectedOutfitScenario = scenario;
  saveDatabase();

  // Filtrar piezas por categoría
  const filterCat = (cat) => db.closet.filter(item => item.category === cat);
  const tshirts = filterCat('tshirts');
  const hoodies = filterCat('hoodies');
  const pants = filterCat('pants');
  const shoes = filterCat('shoes');
  const accessories = filterCat('accessories');
  const travel = filterCat('travel');

  // Elegir elemento aleatorio o seguro
  const getPiece = (arr, fallbackName) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)].name : fallbackName;

  let outfitHtml = '';
  
  if (scenario === 'home-office') {
    outfitHtml = `
      <h3>🏠 Outfit: Cómodo y Funcional</h3>
      <p class="text-xs text-muted mb-sm">Regla: Ropa holgada ideal para estar sentado frente al monitor sin rigidez.</p>
      <div class="outfit-item-combo">
        <div class="outfit-combo-piece"><span class="piece-tag">Superior</span> <span>${getPiece(hoodies, 'Sudadera Suave Cómoda')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Inferior</span> <span>${getPiece(pants, 'Joggers Elásticos')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Calzado</span> <span>${getPiece(shoes.filter(s => s.name.toLowerCase().includes('pantufla') || s.name.toLowerCase().includes('casa')), 'Pantuflas Acojinas')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Cabello</span> <span>${getPiece(accessories.filter(a => a.name.toLowerCase().includes('scrunchie')), 'Scrunchie de Satén')}</span></div>
      </div>
    `;
  } else if (scenario === 'casual-outing') {
    outfitHtml = `
      <h3>🚶 Outfit: Salidas Casuales</h3>
      <p class="text-xs text-muted mb-sm">Regla: Estilo cómodo y urbano, ideal para hacer mandados o reuniones sencillas.</p>
      <div class="outfit-item-combo">
        <div class="outfit-combo-piece"><span class="piece-tag">Superior</span> <span>${getPiece(tshirts, 'Camiseta Gráfica de Algodón')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Superior 2</span> <span>${getPiece(hoodies, 'Hoodie Casual')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Inferior</span> <span>${getPiece(pants, 'Pantalón Jogger / Jeans')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Calzado</span> <span>${getPiece(shoes.filter(s => s.name.toLowerCase().includes('tenis') || s.name.toLowerCase().includes('sneaker')), 'Tenis Cómodos')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Accesorio</span> <span>${getPiece(accessories, 'Collar Minimalista')}</span></div>
      </div>
    `;
  } else if (scenario === 'travel-cargo') {
    outfitHtml = `
      <h3>✈️ Outfit: Traslado con Carga</h3>
      <p class="text-xs text-muted mb-sm">Regla: Prendas de alta resistencia, calzado ergonómico y bolso de laptop doble.</p>
      <div class="outfit-item-combo">
        <div class="outfit-combo-piece"><span class="piece-tag">Prenda</span> <span>${getPiece(hoodies, 'Sudadera Cómoda')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Inferior</span> <span>${getPiece(pants, 'Joggers amplios')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Calzado</span> <span>${getPiece(shoes.filter(s => s.name.toLowerCase().includes('tenis') || s.name.toLowerCase().includes('marcha')), 'Tenis Ergonómicos de Marcha')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Equipaje</span> <span>${getPiece(travel, 'Mochila Táctica Doble Laptop')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Cabello</span> <span>${getPiece(accessories.filter(a => a.name.toLowerCase().includes('scrunchie')), 'Scrunchie de Satén (Para evitar enredos)')}</span></div>
      </div>
    `;
  } else if (scenario === 'events-conventions') {
    outfitHtml = `
      <h3>🎨 Outfit: Eventos / Convenciones</h3>
      <p class="text-xs text-muted mb-sm">Regla: Estilo geek/personalizado con calzado súper cómodo para caminatas largas.</p>
      <div class="outfit-item-combo">
        <div class="outfit-combo-piece"><span class="piece-tag">Camiseta</span> <span>${getPiece(tshirts.filter(t => t.name.toLowerCase().includes('anime') || t.name.toLowerCase().includes('evangelion') || t.name.toLowerCase().includes('lain')), 'Camiseta Anime Evangelion')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Capa</span> <span>${getPiece(hoodies, 'Sudadera con cremallera')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Inferior</span> <span>${getPiece(pants, 'Jeans Flexibles')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Calzado</span> <span>${getPiece(shoes.filter(s => s.name.toLowerCase().includes('tenis')), 'Tenis de Marcha Confort')}</span></div>
        <div class="outfit-combo-piece"><span class="piece-tag">Accesorios</span> <span>${getPiece(accessories, 'Collar Minimalista')}</span></div>
      </div>
    `;
  }

  resultBox.innerHTML = outfitHtml;
}

// Guardar prenda
function saveNewClosetItem(e) {
  e.preventDefault();
  const name = document.getElementById('closetItemName').value;
  const category = document.getElementById('closetItemCat').value;
  const detail = document.getElementById('closetItemDetail').value;

  const newItem = {
    id: 'c_' + Date.now(),
    name,
    category,
    detail
  };

  db.closet.push(newItem);
  saveDatabase();
  
  // Sincronizar tab activa
  const activeTab = document.querySelector('#closetCategoryTabs .closet-tab.active');
  const catFilter = activeTab ? activeTab.getAttribute('data-cat') : 'all';
  renderClosetGrid(catFilter);
  generateOutfitRecommendation();
  
  closeModal('modalAddCloset');
  document.getElementById('formAddCloset').reset();
}

function deleteClosetItem(id) {
  db.closet = db.closet.filter(item => item.id !== id);
  saveDatabase();
  
  const activeTab = document.querySelector('#closetCategoryTabs .closet-tab.active');
  const catFilter = activeTab ? activeTab.getAttribute('data-cat') : 'all';
  renderClosetGrid(catFilter);
  generateOutfitRecommendation();
}

// ==========================================================================
// SUBMÓDULO 3: SALUD INTEGRAL Y MEDICAMENTOS
// ==========================================================================

function renderMedicationsList() {
  const container = document.getElementById('medicationsList');
  if (!container) return;

  if (db.medications.length === 0) {
    container.innerHTML = `<p class="text-muted text-center py-lg">No hay medicamentos estrictos registrados.</p>`;
    return;
  }

  const today = new Date();

  container.innerHTML = db.medications.map(m => {
    const endDate = new Date(m.endDate);
    const isActive = endDate >= today;

    return `
      <div class="med-card">
        <button class="btn-delete-closet" onclick="deleteMedication('${m.id}')">&times;</button>
        <div class="med-card-title">
          <h4>${m.name} <span class="text-sm text-muted">(${m.dose})</span></h4>
          <span class="med-status-badge ${isActive ? 'med-ok' : 'med-danger'}">
            ${isActive ? 'Activo' : 'Finalizado'}
          </span>
        </div>
        <div class="med-detail">📅 Frecuencia: <strong>${m.frequency}</strong></div>
        <div class="med-detail">⏳ Fin de Tratamiento: ${m.endDate}</div>
        <div class="med-detail text-xs">⚠️ Efecto secundario común: <em>${m.sideEffects || 'Ninguno'}</em></div>
      </div>
    `;
  }).join('');
}

// Guardar medicamento
function saveNewMedication(e) {
  e.preventDefault();
  const name = document.getElementById('medName').value;
  const dose = document.getElementById('medDose').value;
  const frequency = document.getElementById('medFrequency').value;
  const endDate = document.getElementById('medEndDate').value;
  const sideEffects = document.getElementById('medSideEffects').value;

  const newMed = {
    id: 'm_' + Date.now(),
    name,
    dose,
    frequency,
    endDate,
    sideEffects
  };

  db.medications.push(newMed);
  saveDatabase();
  renderMedicationsList();
  closeModal('modalAddMedication');
  document.getElementById('formAddMedication').reset();
}

function deleteMedication(id) {
  db.medications = db.medications.filter(m => m.id !== id);
  saveDatabase();
  renderMedicationsList();
}

// Diario de bienestar
function renderWellbeingJournalForm() {
  const energyInput = document.getElementById('inputEnergy');
  const energyVal = document.getElementById('energyValue');
  
  if (energyInput && energyVal) {
    energyInput.addEventListener('input', () => {
      energyVal.innerText = energyInput.value;
    });
  }
}

function saveWellbeingDay(e) {
  e.preventDefault();
  const energy = parseInt(document.getElementById('inputEnergy').value);
  const sleep = parseFloat(document.getElementById('inputSleep').value);
  const sleepQuality = document.getElementById('inputSleepQuality').value;
  const symptoms = document.getElementById('inputSymptoms').value || 'Ninguno';

  const todayStr = new Date().toISOString().split('T')[0];

  // Buscar si ya existe registro hoy
  const existingIdx = db.wellbeingJournal.findIndex(day => day.date === todayStr);
  
  const dayRecord = {
    date: todayStr,
    energy,
    sleep,
    sleepQuality,
    symptoms
  };

  if (existingIdx !== -1) {
    db.wellbeingJournal[existingIdx] = dayRecord;
  } else {
    db.wellbeingJournal.push(dayRecord);
  }

  saveDatabase();
  alert('Registro de bienestar diario guardado correctamente.');
  document.getElementById('wellbeingForm').reset();
  if (document.getElementById('energyValue')) {
    document.getElementById('energyValue').innerText = '7';
  }
}

// Hidratación
function updateWaterGlassCount() {
  const text = document.getElementById('waterGlassCount');
  const visual = document.getElementById('waterLevelVisual');
  
  if (text && visual) {
    text.innerText = `${db.waterGlasses} / 8 Vasos`;
    const height = Math.min((db.waterGlasses / 8) * 100, 100);
    visual.style.height = `${height}%`;
  }
}

function addWaterGlass() {
  if (db.waterGlasses >= 12) {
    db.waterGlasses = 0; // Reiniciar si supera el limite
  } else {
    db.waterGlasses += 1;
  }
  saveDatabase();
  updateWaterGlassCount();
}



// ==========================================================================
// SUBMÓDULO 4: ESTILO DE VIDA, LOGÍSTICA Y MASCOTAS
// ==========================================================================

// Conmutar Entornos
function toggleEnvironmentMode() {
  const btn = document.getElementById('btnToggleEnv');
  const label = document.getElementById('envModeLabel');
  
  if (db.environmentMode === 'home') {
    db.environmentMode = 'travel';
    label.innerText = 'Modo Traslado / Viaje';
    btn.classList.add('active');
  } else {
    db.environmentMode = 'home';
    label.innerText = 'Home Office';
    btn.classList.remove('active');
  }

  saveDatabase();
  renderEnvironmentSection();
  
  // Actualizar indicador del Header
  const headerWidget = document.getElementById('headerEnvWidget');
  if (headerWidget) {
    headerWidget.querySelector('.widget-icon').innerText = db.environmentMode === 'home' ? '🏠' : '✈️';
    headerWidget.querySelector('.widget-label').innerText = db.environmentMode === 'home' ? 'Home Office' : 'Traslado / Viaje';
  }
}

function renderEnvironmentSection() {
  const panelHO = document.getElementById('envPanelHomeOffice');
  const panelTravel = document.getElementById('envPanelTravel');
  const btn = document.getElementById('btnToggleEnv');
  const label = document.getElementById('envModeLabel');

  if (!panelHO || !panelTravel) return;

  if (db.environmentMode === 'home') {
    panelHO.classList.add('active');
    panelTravel.classList.remove('active');
    if (btn) btn.classList.remove('active');
    if (label) label.innerText = 'Home Office';
    updateActiveBreaksProgress();
  } else {
    panelHO.classList.remove('active');
    panelTravel.classList.add('active');
    if (btn) btn.classList.add('active');
    if (label) label.innerText = 'Modo Traslado / Viaje';
    renderTravelChecklist();
  }
}

// Pausas Activas Home Office
function completeActiveBreak() {
  if (db.activeBreaksCount >= 4) {
    db.activeBreaksCount = 0; // Reiniciar
  } else {
    db.activeBreaksCount += 1;
  }
  saveDatabase();
  updateActiveBreaksProgress();
}

function updateActiveBreaksProgress() {
  const text = document.getElementById('hoBreaksText');
  const bar = document.getElementById('hoBreaksProgress');
  
  if (text && bar) {
    text.innerText = `${db.activeBreaksCount} / 4 Completadas`;
    bar.style.width = `${(db.activeBreaksCount / 4) * 100}%`;
  }
}

// Checklist Traslado / Viaje
function renderTravelChecklist() {
  const container = document.getElementById('travelChecklistContainer');
  if (!container) return;

  container.innerHTML = db.travelChecklist.map(item => `
    <div class="checklist-item ${item.checked ? 'checked' : ''}" onclick="toggleTravelItem('${item.id}')">
      <div class="checkbox-custom">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span>${item.text}</span>
    </div>
  `).join('');
}

function toggleTravelItem(itemId) {
  const item = db.travelChecklist.find(i => i.id === itemId);
  if (item) {
    item.checked = !item.checked;
    saveDatabase();
    renderTravelChecklist();
  }
}

// Bitácora Microemprendimientos
function renderMicroLogsList() {
  const container = document.getElementById('microLogsList');
  if (!container) return;

  if (db.microLogs.length === 0) {
    container.innerHTML = `<p class="text-muted text-center">No hay registros de ventas o hobbys.</p>`;
    return;
  }

  container.innerHTML = db.microLogs.map(l => `
    <div class="companion-routine-item" style="margin-bottom: 8px;">
      <div>
        <strong>${l.activity}</strong><br>
        <span class="text-xs text-muted">${l.desc}</span>
      </div>
      <div class="flex-column align-center justify-between">
        <span class="badge badge-success">$${l.amount.toFixed(2)}</span>
        <button class="btn btn-sm text-danger" style="padding: 0 4px; font-size:0.75rem;" onclick="deleteMicroLog('${l.id}')">Eliminar</button>
      </div>
    </div>
  `).join('');
}

function saveNewMicroLog(e) {
  e.preventDefault();
  const activity = document.getElementById('microActName').value;
  const desc = document.getElementById('microDesc').value;
  const amount = parseFloat(document.getElementById('microAmount').value);

  const newLog = {
    id: 'ml_' + Date.now(),
    activity,
    desc,
    amount
  };

  db.microLogs.push(newLog);
  saveDatabase();
  renderMicroLogsList();
  closeModal('modalAddMicroLog');
  document.getElementById('formAddMicroLog').reset();
}

function deleteMicroLog(id) {
  db.microLogs = db.microLogs.filter(l => l.id !== id);
  saveDatabase();
  renderMicroLogsList();
}

// Rutina de Mascotas y Seguridad
function renderPetRoutineSection() {
  const container = document.getElementById('petChecklistContainer');
  if (!container) return;

  container.innerHTML = db.petRoutine.map(item => `
    <div class="checklist-item ${item.checked ? 'checked' : ''}" onclick="togglePetRoutineItem('${item.id}')">
      <div class="checkbox-custom">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span>${item.text}</span>
    </div>
  `).join('');
}

function togglePetRoutineItem(itemId) {
  const item = db.petRoutine.find(i => i.id === itemId);
  if (item) {
    item.checked = !item.checked;
    saveDatabase();
    renderPetRoutineSection();
  }
}

// ==========================================================================
// SUBMÓDULO 5: ASISTENTE INTELIGENTE Y CHECK-IN
// ==========================================================================

function openMorningCheckIn() {
  db.activeSubTab = 'tab-asistente';
  const subBtn = document.querySelector('[data-sub="tab-asistente"]');
  if (subBtn) subBtn.click();
  
  // Cambiar modulo a estilo de vida si no está
  const modBtn = document.querySelector('[data-target="sec-estilo-vida"]');
  if (modBtn) modBtn.click();
}

function selectCheckinOption(field, value) {
  db.checkinState[field] = value;
  
  if (db.checkinState.currentStep < 3) {
    db.checkinState.currentStep += 1;
  } else {
    // Check-in Completo
    db.checkinState.completed = true;
    
    // Auto-aplicar Entorno
    db.environmentMode = db.checkinState.stayOrGo === 'stay' ? 'home' : 'travel';
    db.hairContext = db.checkinState.stayOrGo === 'stay' ? 'home' : 'public';
  }

  saveDatabase();
  renderAssistantView();
  renderEnvironmentSection();
  renderHairSection();
}

function resetCheckin() {
  db.checkinState = {
    completed: false,
    currentStep: 1,
    stayOrGo: null,
    weather: null,
    energy: null
  };
  saveDatabase();
  renderAssistantView();
}

function renderAssistantView() {
  const wizard = document.getElementById('checkinWizard');
  const suggestionsBox = document.getElementById('checkinSuggestionsContainer');
  
  if (!wizard || !suggestionsBox) return;

  // Renderizar Wizard
  if (!db.checkinState.completed) {
    wizard.style.display = 'block';
    const steps = wizard.querySelectorAll('.wizard-step');
    steps.forEach(step => {
      const stepNum = parseInt(step.getAttribute('data-step'));
      step.classList.toggle('active', stepNum === db.checkinState.currentStep);
    });

    suggestionsBox.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧠</div>
        <h3>Check-in Pendiente</h3>
        <p>Por favor responde las preguntas de la izquierda para diseñar tu Directiva de hoy.</p>
      </div>
    `;
  } else {
    wizard.style.display = 'none';
    
    // Generar Sugerencias Basadas en el Check-in
    const data = db.checkinState;
    const skincareTip = data.weather === 'sunny' 
      ? '☀️ Clima soleado: Usa limpiador suave + Tónico + Hidratante + Protector solar FPS 50+ de amplio espectro (Reaplicar cada 4 horas en exterior).'
      : data.weather === 'rainy' 
        ? '🌧️ Clima húmedo/lluvioso: Enfoque en sellado hidratante para prevenir deshidratación y frizz. Lleva un gorro o funda de satén en tu equipaje si viajas.'
        : '⛅ Clima templado: Hidratación clásica ligera de mañana y noche.';

    const hairTip = data.stayOrGo === 'stay'
      ? '🏠 Estilo en Casa: Cabello recogido cómodo y suave con scrunchie de satén para proteger las puntas.'
      : '💼 Estilo de Salida: Peinado estilizado o recogido pulcro. Evita usar ganchos metálicos que dañen la fibra capilar.';

    const outfitScenario = data.stayOrGo === 'stay' ? 'home-office' : 'casual-outing';
    
    const filterCat = (cat) => db.closet.filter(item => item.category === cat);
    const getPiece = (arr, fallback) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)].name : fallback;
    const outfitTip = data.stayOrGo === 'stay'
      ? `Vestuario: ${getPiece(filterCat('hoodies'), 'Sudadera Cómoda')} + ${getPiece(filterCat('pants'), 'Joggers')} + Sandalias de casa.`
      : `Vestuario: ${getPiece(filterCat('tshirts'), 'Camiseta Gráfica')} + ${getPiece(filterCat('hoodies'), 'Sudadera')} + ${getPiece(filterCat('pants'), 'Jeans')} + Tenis Ergonómicos.`;

    const energyTip = data.energy === 'low'
      ? '💤 Energía baja: Ritmo de trabajo suave. Realiza una pausa activa y enfócate en tareas de baja demanda cognitiva.'
      : data.energy === 'medium'
        ? '🔋 Energía media: Balance de trabajo y descanso. Postura erguida y pausas cada 2 horas.'
        : '🔥 Energía alta: ¡Excelente! Ideal para avanzar en proyectos clave y tareas de alto enfoque.';

    const petTip = data.stayOrGo === 'stay'
      ? '🐾 Cuidado en Casa: Monitorea la postura de tu perrita por su displasia. Bríndale su condroprotector y mantén al día su Levotiroxina (ayunas/noche).'
      : '🐾 Seguridad en Exterior: Al salir, camina a paso lento sobre terreno plano. Mantén correa corta y arnés doble ante otros animales. Como ve/escucha menos, guíala de manera predecible.';

    const medsDue = db.medications.map(m => `<li>${m.name} (${m.dose}) - ${m.frequency}</li>`).join('');

    suggestionsBox.innerHTML = `
      <div class="suggestions-list-box">
        <div class="suggestion-item">
          <div class="suggestion-item-icon">🧴</div>
          <div>
            <div class="suggestion-item-title">Cuidado de la Piel</div>
            <p>${skincareTip}</p>
          </div>
        </div>

        <div class="suggestion-item">
          <div class="suggestion-item-icon">💇</div>
          <div>
            <div class="suggestion-item-title">Estilo Capilar</div>
            <p>${hairTip}</p>
          </div>
        </div>

        <div class="suggestion-item">
          <div class="suggestion-item-icon">👕</div>
          <div>
            <div class="suggestion-item-title">Outfit Recomendado</div>
            <p>${outfitTip}</p>
          </div>
        </div>

        <div class="suggestion-item">
          <div class="suggestion-item-icon">🐾</div>
          <div>
            <div class="suggestion-item-title">Perrita Pastor Alemán</div>
            <p>${petTip}</p>
          </div>
        </div>

        <div class="suggestion-item">
          <div class="suggestion-item-icon">⚡</div>
          <div>
            <div class="suggestion-item-title">Enfoque Energético</div>
            <p>${energyTip}</p>
          </div>
        </div>

        <div class="suggestion-item" style="border-left-color: var(--color-accent);">
          <div class="suggestion-item-icon">💊</div>
          <div>
            <div class="suggestion-item-title">Medicamentos del Día</div>
            <ul style="margin-left: 16px; font-size: 0.8rem;">
              ${medsDue || '<li>No hay medicamentos críticos registrados para hoy.</li>'}
            </ul>
          </div>
        </div>
      </div>
    `;

    // Sincronizar el Clima en el widget de la cabecera
    const weatherWidget = document.getElementById('headerWeatherWidget');
    if (weatherWidget) {
      const icon = data.weather === 'sunny' ? '☀️' : data.weather === 'rainy' ? '🌧️' : '⛅';
      const label = data.weather === 'sunny' ? 'Soleado, 26°C' : data.weather === 'rainy' ? 'Lluvia, 18°C' : 'Templado, 22°C';
      weatherWidget.querySelector('.widget-icon').innerText = icon;
      weatherWidget.querySelector('.widget-label').innerText = label;
    }
  }
}

// Renders dinámicos en el dashboard
function renderDashboard() {
  const medList = document.getElementById('dashboardMedList');
  const petList = document.getElementById('dashboardPetList');
  const suggestions = document.getElementById('dashboardSuggestionsList');

  // 1. Medicamentos en Dashboard
  if (medList) {
    if (db.medications.length === 0) {
      medList.innerHTML = `<li class="text-muted">Sin medicamentos pendientes.</li>`;
    } else {
      medList.innerHTML = db.medications.map(m => `
        <li style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
          <span>💊 <strong>${m.name}</strong> - ${m.dose}</span>
          <span class="text-muted">${m.frequency}</span>
        </li>
      `).join('');
    }
  }

  // 2. Mascotas en Dashboard
  if (petList) {
    const list = db.petRoutine;
    if (list.length === 0) {
      petList.innerHTML = `<p class="text-muted text-xs">Sin rutinas de mascota configuradas.</p>`;
    } else {
      petList.innerHTML = `
        <div class="flex-column gap-sm">
          ${list.map(item => `
            <div class="flex-row align-center gap-sm text-xs" style="display:flex; opacity: ${item.checked ? 0.6 : 1}">
              <input type="checkbox" ${item.checked ? 'checked' : ''} disabled>
              <span style="${item.checked ? 'text-decoration: line-through' : ''}">${item.text}</span>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  // 3. Recomendaciones Inteligentes (Dashboard)
  if (suggestions) {
    if (!db.checkinState.completed) {
      suggestions.innerHTML = `
        <p class="text-muted mb-md">Aún no has hecho el check-in matutino hoy.</p>
        <button class="btn btn-sm btn-primary" onclick="openMorningCheckIn()">Comenzar Check-in</button>
      `;
    } else {
      const data = db.checkinState;
      const weatherText = data.weather === 'sunny' ? 'Día soleado: no olvides protector solar facial SPF 50+' : data.weather === 'rainy' ? 'Día húmedo: protege tu cabello del frizz y sella la hidratación' : 'Día templado: hidratación clásica';
      const travelText = data.stayOrGo === 'stay' ? 'Home Office: pausas activas posturales cada 2h' : 'Fuera de casa: revisa tu equipaje extendido (kit higiene, ropa, doble laptop)';
      const petText = data.stayOrGo === 'stay' ? 'En casa: cuida su postura (displasia) y dale Levotiroxina' : 'En calle: arnés doble, correa corta, camina lento sobre plano';

      suggestions.innerHTML = `
        <div class="flex-column gap-sm">
          <div class="text-xs" style="background: var(--color-primary-alpha); padding: 8px; border-radius: 4px; border-left: 3px solid var(--color-primary);">
            🧴 <strong>Piel:</strong> ${weatherText}
          </div>
          <div class="text-xs" style="background: var(--color-primary-alpha); padding: 8px; border-radius: 4px; border-left: 3px solid var(--color-primary);">
            🎒 <strong>Logística:</strong> ${travelText}
          </div>
          <div class="text-xs" style="background: var(--color-primary-alpha); padding: 8px; border-radius: 4px; border-left: 3px solid var(--color-primary);">
            💇 <strong>Pelo:</strong> ${data.stayOrGo === 'stay' ? 'En casa: recogido con scrunchie de satén' : 'En público: peinado estilizado'}
          </div>
          <div class="text-xs" style="background: var(--color-primary-alpha); padding: 8px; border-radius: 4px; border-left: 3px solid var(--color-primary);">
            🐾 <strong>Perrita (12 años):</strong> ${petText}
          </div>
        </div>
      `;
    }
  }

  calculateHygieneProgress();
  updateWaterGlassCount();
}

// ==========================================================================
// MÓDULOS DE PROYECTOS Y COMPAÑEROS (BASE PLATFORM DE COMPLEMENTO)
// ==========================================================================

let activeBaseProjectId = 'pb1';

function renderProjectsBase() {
  const container = document.getElementById('projectsBaseGrid');
  if (!container) return;

  if (db.projectsBase.length === 0) {
    container.innerHTML = `<p class="text-muted text-xs">No hay proyectos.</p>`;
    return;
  }

  container.innerHTML = db.projectsBase.map(p => `
    <div class="project-base-card ${p.id === activeBaseProjectId ? 'active' : ''}" onclick="selectBaseProject('${p.id}')">
      <h4>${p.name}</h4>
      <p>${p.desc || ''}</p>
    </div>
  `).join('');

  // Llenar selectores de proyectos en modales
  const select = document.getElementById('taskProjSelect');
  if (select) {
    select.innerHTML = db.projectsBase.map(p => `
      <option value="${p.id}">${p.name}</option>
    `).join('');
  }

  // Llenar filtro
  const filter = document.getElementById('taskProjectFilter');
  if (filter) {
    filter.innerHTML = db.projectsBase.map(p => `
      <option value="${p.id}" ${p.id === activeBaseProjectId ? 'selected' : ''}>${p.name}</option>
    `).join('');
  }
}

function selectBaseProject(id) {
  activeBaseProjectId = id;
  renderProjectsBase();
  renderTasksBase();
}

function renderTasksBase() {
  const container = document.getElementById('tasksBaseContainer');
  if (!container) return;

  const tasks = db.tasksBase.filter(t => t.projectId === activeBaseProjectId);

  if (tasks.length === 0) {
    container.innerHTML = `<p class="text-muted text-sm text-center py-md">No hay tareas pendientes en este proyecto.</p>`;
    return;
  }

  container.innerHTML = tasks.map(t => `
    <div class="task-item ${t.done ? 'done' : ''}">
      <div class="task-item-content">
        <input type="checkbox" ${t.done ? 'checked' : ''} onclick="toggleTaskBase('${t.id}')">
        <span style="${t.done ? 'text-decoration: line-through' : ''}">${t.desc}</span>
      </div>
      <div>
        <span class="badge ${t.priority === 'alta' ? 'badge-danger' : t.priority === 'media' ? 'badge-accent' : 'badge-primary'}">${t.priority}</span>
        <button class="btn btn-sm text-danger" style="padding:0; margin-left: 8px;" onclick="deleteTaskBase('${t.id}')">&times;</button>
      </div>
    </div>
  `).join('');
}

function filterTasksByProject() {
  const filter = document.getElementById('taskProjectFilter');
  if (filter) {
    activeBaseProjectId = filter.value;
    renderProjectsBase();
    renderTasksBase();
  }
}

function saveNewProjectBase(e) {
  e.preventDefault();
  const name = document.getElementById('projBaseName').value;
  const desc = document.getElementById('projBaseDesc').value;

  const newProj = {
    id: 'pb_' + Date.now(),
    name,
    desc
  };

  db.projectsBase.push(newProj);
  activeBaseProjectId = newProj.id;
  saveDatabase();
  renderProjectsBase();
  renderTasksBase();
  closeModal('modalAddProjectBase');
  document.getElementById('formAddProjectBase').reset();
}

function saveNewTaskBase(e) {
  e.preventDefault();
  const projectId = document.getElementById('taskProjSelect').value;
  const desc = document.getElementById('taskBaseDesc').value;
  const priority = document.getElementById('taskBasePriority').value;

  const newTask = {
    id: 'tb_' + Date.now(),
    projectId,
    desc,
    priority,
    done: false
  };

  db.tasksBase.push(newTask);
  saveDatabase();
  renderTasksBase();
  closeModal('modalAddTaskBase');
  document.getElementById('formAddTaskBase').reset();
}

function toggleTaskBase(id) {
  const task = db.tasksBase.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveDatabase();
    renderTasksBase();
  }
}

function deleteTaskBase(id) {
  db.tasksBase = db.tasksBase.filter(t => t.id !== id);
  saveDatabase();
  renderTasksBase();
}

// Gestión de Compañeros
function renderCompanions() {
  const container = document.getElementById('companionsContainer');
  if (!container) return;

  if (db.companions.length === 0) {
    container.innerHTML = `<p class="text-muted">No hay compañeros o familiares registrados.</p>`;
    return;
  }

  container.innerHTML = db.companions.map(c => `
    <div class="companion-card">
      <div class="flex-row justify-between align-center mb-sm">
        <div>
          <h3>${c.name}</h3>
          <span class="badge badge-primary">${c.role || 'Colaborador'}</span>
        </div>
        <button class="btn btn-sm text-danger" onclick="deleteCompanero('${c.id}')">&times;</button>
      </div>
      <p class="text-xs text-muted" style="border-top: 1px solid var(--border-color); padding-top:8px;">
        <strong>Rutina Clave:</strong> ${c.routine || 'Sin mapear'}
      </p>
    </div>
  `).join('');
}

function saveNewCompanero(e) {
  e.preventDefault();
  const name = document.getElementById('companionName').value;
  const role = document.getElementById('companionRole').value;
  const routine = document.getElementById('companionRoutine').value;

  const newComp = {
    id: 'co_' + Date.now(),
    name,
    role,
    routine
  };

  db.companions.push(newComp);
  saveDatabase();
  renderCompanions();
  closeModal('modalAddCompanero');
  document.getElementById('formAddCompanero').reset();
}

function deleteCompanero(id) {
  db.companions = db.companions.filter(c => c.id !== id);
  saveDatabase();
  renderCompanions();
}

// ==========================================================================
// CONFIGURACIÓN, RESPALDOS E IMPORTACIÓN JSON
// ==========================================================================

function renderSettings() {
  updateThemeUIElements();
}

// Reiniciar base de datos a estado original
function resetAllApplicationData() {
  if (confirm("⚠️ ¿Estás seguro de que deseas restablecer todos los datos? Se borrará todo el inventario, medicamentos, outfits y registros.")) {
    localStorage.removeItem('aura_nexus_db');
    location.reload();
  }
}

// Exportar archivo JSON
function exportDataJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `aura_nexus_respaldo_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Importar archivo JSON
function importDataJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const importedDb = JSON.parse(evt.target.result);
      
      // Validación básica
      if (importedDb.routines && importedDb.closet && importedDb.products) {
        db = importedDb;
        saveDatabase();
        alert("¡Datos importados con éxito! La aplicación se recargará.");
        location.reload();
      } else {
        alert("El archivo no tiene el formato de respaldo de AURA Nexus correcto.");
      }
    } catch (err) {
      alert("Error leyendo el archivo JSON. Asegúrate de que es un respaldo válido.");
    }
  };
  reader.readAsText(file);
}

// ==========================================================================
// VENTANAS MODALES (ABRIR/CERRAR)
// ==========================================================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
  }
}

// Exponer funciones necesarias globalmente para eventos onclick en HTML
window.openAddProductModal = () => openModal('modalAddProduct');
window.openAddClosetModal = () => openModal('modalAddCloset');
window.openAddMedicationModal = () => openModal('modalAddMedication');
window.openAddMicroLogModal = () => openModal('modalAddMicroLog');
window.openAddProjectBaseModal = () => openModal('modalAddProjectBase');
window.openAddTaskBaseModal = () => openModal('modalAddTaskBase');
window.openAddCompaneroModal = () => openModal('modalAddCompanero');
window.closeModal = (id) => closeModal(id);

// ==========================================================================
// INICIALIZACIÓN GLOBAL DE APLICACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadDatabase();
  initThemeEngine();
  initNavigation();
  initSidebarCollapsing();
  initClosetTabs();
  
  // Renderizar la vista inicial activa
  renderCurrentModuleView(db.activeModule || 'sec-dashboard');
});
