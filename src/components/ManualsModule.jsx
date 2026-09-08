import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Plus, Search, Trash2, Heart, HelpCircle, Save } from 'lucide-react';
import { sanitizeManualList } from '../utils/sanitizers';

export default function ManualsModule({
  customManuals,
  setCustomManuals,
  showToast
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  
  // New manual form states
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState('General');
  const [manualContent, setManualContent] = useState('');

  const defaultManuals = [
    {
      id: 'm-skincare',
      category: 'Skincare & Aclarado',
      title: 'Protocolo de Cuidado Facial & Aclarado Profundo',
      content: `• **Mascarilla Coreana de Arroz (Aclarado Natural):**
  Lava arroz orgánico y reserva la segunda agua. Pon a hervir el arroz con poca agua hasta que esté suave. Licúalo hasta obtener una consistencia cremosa. Aplica fría por 15 minutos dos veces por semana para atenuar manchas.
  
• **Uso de Neat 3B Face Saver Gel:**
  Aplica una capa delgada en frente, bozo superior y mejillas antes del maquillaje o protector solar. Este gel antitranspirante previene el sudor facial extremo en climas húmedos.
  
• **Skin Icing Matutino:**
  Pasa un cubo de hielo envuelto en un paño de microfibra por el rostro en movimientos ascendentes durante 1-2 minutos. Minimiza poros abiertos, desinflama bolsas oculares y reactiva la circulación capilar facial.`
    },
    {
      id: 'm-hair',
      category: 'Cuidado Capilar (Tipo 1b/1c)',
      title: 'Control de Frizz y Protección Estilística',
      content: `• **Cepillo de Cerdas de Madera Orgánica:**
  Cepilla de puntas a raíz dos veces al día. Las cerdas de madera distribuyen el sebo natural a lo largo de la fibra capilar, disminuyendo el frizz estático típico del cabello fino 1b/1c.
  
• **Hair Mists Sin Alcohol:**
  Rocía brumas hidratantes enriquecidas con pantenol o agua de rosas a 20 cm de distancia. Evita alcoholes desecantes que dañan las puntas y causan puntas abiertas.
  
• **Peinado Protector en el Automóvil:**
  Nunca apoyes la nuca en la cabecera con el cabello suelto. Haz una coleta baja holgada con una dona de satén o recoge con una pinza de carey alta, dejando caer flequillos/tendrils laterales para enmarcar la cara sin tensar.`
    },
    {
      id: 'm-health',
      category: 'Salud Médica Anual',
      title: 'Calendario Preventivo de Especialidades Médicas',
      content: `• **Ginecología (Control Anual):**
  Agendar chequeo preventivo, ultrasonido pélvico y mastografía/Papanicolaou en la primera semana posterior al fin del ciclo menstrual.
  
• **Oftalmología (Cirujano Oftalmólogo):**
  Monitoreo de presión intraocular y salud de córnea, especialmente tras fatiga visual digital por Home Office.
  
• **Odontología Especializada (Bruxismo):**
  Revisión y ajuste de guarda oclusiva rígida semestral para proteger piezas dentales del desgaste nocturno y aliviar tensión articular temporomandibular.
  
• **Ortopedia / Fisioterapia:**
  Chequeo de alineación rotuliana y tobillo dos veces al año. Rutinas preventivas de fuerza para cuádriceps que protejan rodillas.`
    },
    {
      id: 'm-nails',
      category: 'Higiene Íntima & Uñas',
      title: 'Higiene Delicada y Estética de Manos',
      content: `• **Protocolo Vulvar Externo:**
  Lavar exclusivamente el área externa con jabón syndet con pH fisiológico (Sebamed o Lactacyd). Nunca realizar duchas vaginales internas; secar con toallas de algodón limpias exclusivas.
  
• **Manicura Francesa con Estampador de Silicona:**
  Aplica esmalte blanco en el estampador de silicona y presiona la punta de la uña con un ángulo de 45° para trazar una línea francesa perfecta y simétrica de forma rápida en casa.
  
• **Control de Onicofagia (Morderse las Uñas):**
  Aplica el barniz amargo Mavala Stop en las uñas y cutículas. Utiliza un anillo fidget giratorio de oro rosa para canalizar la ansiedad táctil y evitar llevarse las manos a la boca.`
    },
    {
      id: 'm-etiquette',
      category: 'Etiqueta & Manners',
      title: 'Compostura Social y Modales de Estilo',
      content: `• **Protocolo del Pan en la Mesa:**
  Nunca cortes el pan con el cuchillo ni muerdas el bollo entero. Toma un trozo pequeño con los dedos (del tamaño de un bocado), úntale mantequilla si lo deseas, y llévatelo a la boca. Repite trozo a trozo.
  
• **Postura y Compostura en Cafeterías de Especialidad:**
  Si trabajas con tu laptop, mantén la espalda erguida, evita encorvar los hombros y no cruces las piernas por tiempos prolongados para mantener una postura regia y saludable.
  
• **Eventos de Gala:**
  Sostener copas siempre por el tallo (nunca por el cáliz) para evitar calentar la bebida y dejar huellas dactilares grasosas en el cristal.`
    }
  ];

  const safeCustomManuals = sanitizeManualList(customManuals);
  const allManuals = [...defaultManuals, ...safeCustomManuals];

  const handleToggle = (id) => {
    setOpenSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddManual = (e) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualContent.trim()) return;

    const newManual = {
      id: 'custom-' + Date.now(),
      category: manualCategory.trim() || 'General',
      title: manualTitle.trim(),
      content: manualContent.trim()
    };

    setCustomManuals(prev => [...(Array.isArray(prev) ? prev : []), newManual]);
    setManualTitle('');
    setManualContent('');
    setIsAdding(false);
    showToast('success', 'Manual Guardado', `Se guardó "${manualTitle}" en tu biblioteca.`);
  };

  const handleDeleteCustomManual = (id, title) => {
    setCustomManuals(prev => (Array.isArray(prev) ? prev : []).filter(m => m && m.id !== id));
    showToast('warning', 'Manual Eliminado', `Se retiró el manual "${title || 'Manual'}".`);
  };

  // Filter manuals
  const filtered = allManuals.filter(m => {
    if (!m) return false;
    const term = (searchTerm || '').toLowerCase();
    const title = String(m.title || '').toLowerCase();
    const category = String(m.category || '').toLowerCase();
    const content = String(m.content || '').toLowerCase();
    return title.includes(term) || 
      category.includes(term) || 
      content.includes(term);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-[#171a24] p-4 rounded-xl border border-[#e0a96d]/15">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar manual o protocolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 pl-10 pr-4 text-slate-100 text-sm focus:outline-none focus:border-[#e0a96d] transition-colors"
          />
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="btn-rose-gold text-xs font-bold py-2 px-5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Guía</span>
        </button>
      </div>

      {/* Add Manual Form */}
      {isAdding && (
        <form onSubmit={handleAddManual} className="bg-[#171a24] border border-[#e0a96d]/20 p-5 rounded-xl space-y-4 shadow-xl animate-fade-in">
          <h3 className="text-base font-bold text-slate-100 font-outfit">Agregar Nuevo Manual / Protocolo</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Título del Manual</label>
              <input
                type="text"
                placeholder="Ej. Guía de Meditación Nocturna"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Categoría</label>
              <input
                type="text"
                placeholder="Ej. Bienestar, Etiqueta, Ejercicio"
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Instrucciones / Protocolos detallados</label>
            <textarea
              placeholder="Usa viñetas con • para organizar los pasos o escribe el protocolo libremente..."
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2.5 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] h-36 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-rose-gold text-xs font-bold py-2 px-5 rounded-lg cursor-pointer transition-all"
            >
              Guardar Guía
            </button>
          </div>
        </form>
      )}

      {/* Accordion Layout */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-[#171a24] p-12 text-center rounded-xl border border-slate-800">
            <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay manuales que coincidan con la búsqueda.</p>
          </div>
        ) : (
          filtered.map((manual, idx) => {
            if (!manual) return null;
            const mid = manual.id || `m-idx-${idx}`;
            const isOpen = !!openSections[mid];
            const isCustom = String(mid).startsWith('custom-');
            
            return (
              <div 
                key={mid} 
                className={`bg-[#171a24] border rounded-xl overflow-hidden shadow-md transition-all ${
                  isOpen ? 'border-[#e0a96d]/40' : 'border-[#e0a96d]/10'
                }`}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => handleToggle(manual.id)}
                  className="w-full flex items-center justify-between p-4 bg-[#171a24] hover:bg-[#e0a96d]/5 text-left transition-all cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <div className="min-w-0 pr-4">
                    <span className="text-[9px] uppercase font-bold text-[#e0a96d] bg-[#e0a96d]/10 px-2 py-0.5 rounded border border-[#e0a96d]/10">
                      {manual.category}
                    </span>
                    <h4 className="font-bold text-sm text-slate-100 font-outfit mt-2 truncate">
                      {manual.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering accordion toggle
                          handleDeleteCustomManual(manual.id, manual.title);
                        }}
                        className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Eliminar guía"
                        aria-label={`Eliminar guía ${manual.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#e0a96d]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Accordion Content */}
                {isOpen && (
                  <div className="p-5 bg-[#0b0c10]/60 border-t border-slate-800/80 animate-fade-in text-xs text-slate-300 leading-relaxed space-y-4">
                    <div className="whitespace-pre-line leading-relaxed font-normal">
                      {manual.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
