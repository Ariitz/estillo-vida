import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  Bot,
  User,
  ShoppingBag,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Loader2,
  HelpCircle,
  Plus,
  RefreshCw,
  HeartPulse,
  ListPlus,
  Check,
  Zap,
  Tag
} from 'lucide-react';
import { parseRoutineWithCopilot } from '../utils/geminiService';
import { sanitizeHouseholdItem, sanitizeSelfCareItem } from '../utils/sanitizers';

export default function CopilotModule({
  geminiApiKey = '',
  householdItems = [],
  setHouseholdItems,
  selfCareActivities = [],
  setSelfCareActivities,
  customTimers = [],
  setCustomTimers,
  schedule = [],
  setSchedule,
  showToast,
  setActiveModule
}) {
  const [messages, setMessages] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('aura-copilot-messages');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error parsing copilot history:", e);
        }
      }
    }
    return [
      {
        id: 'msg-welcome',
        sender: 'copilot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `### 👑 ¡Hola! Soy AURA Copilot, tu Asistente de Estilo de Vida & Inteligencia Artificial

Puedo ayudarte a:
1. **Analizar y estructurar cualquier rutina o recomendación** (skincare, entrenamiento, suplementos, hábitos).
2. **Generar listas de compras automáticas** para tu *Comparador de Precios*.
3. **Configurar tu Calendario de Autocuidado** para frecuencias no diarias (un día sí/un día no, 3-4x/semana, etc.).
4. **Crear Temporizadores y Horarios** con un solo clic.

Prueba pegando una rutina o haz clic en cualquiera de las sugerencias rápidas abajo:`,
        actions: {
          products: [
            { name: 'Serum de Retinol Facial 0.3%', category: 'Skincare', notes: 'Renovación nocturna días alternos' },
            { name: 'Crema Concha Nácar Teatrical', category: 'Skincare', notes: 'Aclarado e hidratación profunda' },
            { name: 'Máscara LED Facial de Luz Roja', category: 'Skincare', notes: 'Terapia de colágeno 3-4x/semana' },
            { name: 'Mascarilla Coreana de Arroz', category: 'Skincare', notes: 'Hidratación día por medio' }
          ],
          selfCare: [
            {
              title: 'Máscara LED Roja (12 min)',
              frequency: 'custom',
              daysInterval: 2,
              category: 'skincare',
              notes: 'Sesión de luz roja 10-15 min sobre piel limpia.',
              protocol: '3 a 4 veces por semana en días alternos.'
            },
            {
              title: 'Mascarilla Coreana de Arroz',
              frequency: 'custom',
              daysInterval: 2,
              category: 'skincare',
              notes: 'Aplicar durante 15 minutos un día sí y un día no.',
              protocol: 'Cadencia día por medio para luminosidad.'
            }
          ],
          timers: [
            { name: 'Máscara LED Roja (12 min)', durationSeconds: 720, category: 'skincare', description: 'Fototerapia facial de colágeno.' },
            { name: 'Mascarilla de Arroz (15 min)', durationSeconds: 900, category: 'skincare', description: 'Tiempo de absorción.' }
          ],
          schedule: [
            { time: '22:00', title: 'Rutina de Skincare Nocturna & Activos Alternos', tag: 'beauty', isRoutine: true }
          ]
        },
        executedActions: {
          products: false,
          selfCare: false,
          timers: false,
          schedule: false
        }
      }
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aura-copilot-messages', JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickPrompts = [
    {
      label: '🌸 Rutina de Skincare & Activos No Diarios',
      text: 'Módulo de Skincare y Frecuencias No Diarias:\n\nMatriz interactiva de activos nocturnos para evitar sobreexposición: días de Retinol vs. días de Concha Nácar + Teatrical Aclaradora.\n\nTemporizador y recordatorio para la Máscara LED roja (3 a 4 veces por semana, 10-15 minutos).\n\nRecordatorio de Mascarilla Coreana de Arroz (un día sí, un día no).'
    },
    {
      label: '🛒 Despensa Saludable y Suplementación',
      text: 'Quiero organizar mis compras saludables: Proteína aislada de suero, Creatina monohidratada, Citrato de magnesio para dormir, Café en grano tostado sam\'s y Avena en hojuelas entera.'
    },
    {
      label: '🦴 Plan Postural para Conducir y Oficina',
      text: 'Tengo dolor en espalda baja y tobillo al manejar y rigidez en cuello en la laptop. Organízame pausas activas, estiramientos de 5 min y recordatorios posturales.'
    }
  ];

  const handleSendMessage = async (textToSend) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isProcessing) return;

    const userMsg = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: prompt
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setIsProcessing(true);

    try {
      showToast('info', 'AURA Copilot Analizando', 'Extrayendo compras, autocuidado y temporizadores...');
      const response = await parseRoutineWithCopilot(prompt, messages, geminiApiKey);

      const botMsg = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'copilot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.replyText,
        actions: response.actions,
        executedActions: {
          products: false,
          selfCare: false,
          timers: false,
          schedule: false
        }
      };

      setMessages(prev => [...prev, botMsg]);
      showToast('success', 'Plan Generado', 'Se estructuraron las acciones para tus módulos.');
    } catch (err) {
      console.error("Copilot error:", err);
      showToast('error', 'Error de Asistente', err.message || 'No se pudo procesar tu mensaje.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Action Executers with strict sanitization
  const handleAddProductsToComparator = (msgId, products = []) => {
    if (!products || !Array.isArray(products) || products.length === 0) return;

    const newItems = products
      .filter(p => p && (typeof p === 'object' || typeof p === 'string'))
      .map(p => {
        const itemObj = typeof p === 'string' ? { name: p } : p;
        const validStores = (Array.isArray(itemObj.stores) ? itemObj.stores : [])
          .filter(s => s && typeof s === 'object')
          .map(s => {
            const price = parseFloat(s.price) || 0;
            const quantity = parseFloat(s.quantity) || 1;
            return {
              storeName: s.storeName || s.name || s.store || 'Amazon',
              price: price,
              quantity: quantity,
              unitPrice: quantity > 0 ? price / quantity : 0
            };
          })
          .filter(s => s.price > 0 && s.quantity > 0);

        const rawItem = {
          id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          name: typeof itemObj.name === 'string' ? itemObj.name : (itemObj.name?.title || itemObj.name?.name || 'Producto'),
          category: typeof itemObj.category === 'string' ? itemObj.category : 'Skincare',
          stores: validStores,
          preferredStore: validStores[0]?.storeName || '',
          repurchaseVerdict: 'yes',
          notes: typeof itemObj.notes === 'string' ? itemObj.notes : (Array.isArray(itemObj.notes) ? itemObj.notes.join('. ') : 'Agregado automáticamente por AURA Copilot.')
        };

        return sanitizeHouseholdItem(rawItem);
      })
      .filter(Boolean);

    if (newItems.length === 0) return;

    setHouseholdItems(prev => [...(Array.isArray(prev) ? prev : []), ...newItems]);
    setMessages(prev => (Array.isArray(prev) ? prev : []).map(m => m.id === msgId ? {
      ...m,
      executedActions: { ...(m.executedActions || {}), products: true }
    } : m));

    showToast('success', 'Productos Agregados', `Se añadieron ${newItems.length} productos al Comparador de Precios.`);
  };

  const handleAddSelfCareToCalendar = (msgId, selfCareList = []) => {
    if (!selfCareList || !Array.isArray(selfCareList) || selfCareList.length === 0) return;

    const newActivities = selfCareList
      .filter(sc => sc && (typeof sc === 'object' || typeof sc === 'string'))
      .map(sc => {
        const scObj = typeof sc === 'string' ? { title: sc } : sc;
        const interval = parseInt(scObj.daysInterval, 10) || 2;
        const rawSc = {
          id: 'sc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          title: typeof scObj.title === 'string' ? scObj.title : (scObj.title?.name || 'Actividad de Autocuidado'),
          frequency: 'custom',
          customValue: interval,
          customUnit: 'days',
          daysInterval: interval,
          lastCompletedDate: new Date().toISOString().split('T')[0],
          category: scObj.category === 'skincare' ? 'beauty' : (scObj.category || 'beauty'),
          notes: typeof scObj.notes === 'string' ? scObj.notes : (Array.isArray(scObj.notes) ? scObj.notes.join('. ') : ''),
          protocol: typeof scObj.protocol === 'string' ? scObj.protocol : 'Cadencia configurada por AURA Copilot.'
        };
        return sanitizeSelfCareItem(rawSc);
      })
      .filter(Boolean);

    if (newActivities.length === 0) return;

    setSelfCareActivities(prev => [...(Array.isArray(prev) ? prev : []), ...newActivities]);
    setMessages(prev => (Array.isArray(prev) ? prev : []).map(m => m.id === msgId ? {
      ...m,
      executedActions: { ...(m.executedActions || {}), selfCare: true }
    } : m));

    showToast('success', 'Autocuidado Programado', `Se añadieron ${newActivities.length} actividades al Calendario de Autocuidado.`);
  };

  const handleAddTimers = (msgId, timersList = []) => {
    if (!timersList || !Array.isArray(timersList) || timersList.length === 0) return;

    const newTimers = timersList
      .filter(t => t && (typeof t === 'object' || typeof t === 'string'))
      .map(t => {
        const tObj = typeof t === 'string' ? { title: t } : t;
        const durationSecs = parseInt(tObj.duration || tObj.durationSeconds, 10) || 600;
        const tName = typeof tObj.name === 'string' ? tObj.name : (typeof tObj.title === 'string' ? tObj.title : 'Temporizador');
        return {
          id: 'timer-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          title: tName,
          name: tName,
          duration: durationSecs,
          durationSeconds: durationSecs,
          category: typeof tObj.category === 'string' ? tObj.category : 'skincare',
          description: typeof tObj.description === 'string' ? tObj.description : 'Configurado por AURA Copilot.'
        };
      });

    if (newTimers.length === 0) return;

    setCustomTimers(prev => [...(Array.isArray(prev) ? prev : []), ...newTimers]);
    setMessages(prev => (Array.isArray(prev) ? prev : []).map(m => m.id === msgId ? {
      ...m,
      executedActions: { ...(m.executedActions || {}), timers: true }
    } : m));

    showToast('success', 'Temporizadores Listos', `Se crearon ${newTimers.length} temporizadores.`);
  };

  const handleAddScheduleBlock = (msgId, scheduleList = []) => {
    if (!scheduleList || !Array.isArray(scheduleList) || scheduleList.length === 0) return;

    const newBlocks = scheduleList
      .filter(s => s && (typeof s === 'object' || typeof s === 'string'))
      .map(s => {
        const sObj = typeof s === 'string' ? { title: s } : s;
        const timeStr = typeof sObj.time === 'string' ? sObj.time : '10:00 PM';
        // Infer category from time
        let cat = 'night';
        if (timeStr.includes('AM')) {
          cat = 'morning';
        } else {
          const hour = parseInt(timeStr.split(':')[0], 10) || 12;
          cat = (hour < 6 || hour === 12) ? 'afternoon' : 'night';
        }

        return {
          id: 'sch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          time: timeStr,
          title: typeof sObj.title === 'string' ? sObj.title : 'Bloque de Rutina',
          desc: typeof sObj.desc === 'string' ? sObj.desc : (typeof sObj.notes === 'string' ? sObj.notes : 'Configurado por AURA Copilot'),
          category: typeof sObj.category === 'string' ? sObj.category : cat,
          completed: false,
          tag: typeof sObj.tag === 'string' ? sObj.tag : 'beauty',
          isRoutine: sObj.isRoutine !== undefined ? Boolean(sObj.isRoutine) : true
        };
      });

    if (newBlocks.length === 0) return;

    setSchedule(prev => [...(Array.isArray(prev) ? prev : []), ...newBlocks]);
    setMessages(prev => (Array.isArray(prev) ? prev : []).map(m => m.id === msgId ? {
      ...m,
      executedActions: { ...(m.executedActions || {}), schedule: true }
    } : m));

    showToast('success', 'Horario Actualizado', `Se integraron ${newBlocks.length} bloques a tu Horario Diario.`);
  };

  const handleClearChat = () => {
    if (window.confirm("¿Deseas reiniciar la conversación con AURA Copilot?")) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('aura-copilot-messages');
      }
      setMessages([]);
      showToast('info', 'Chat Reiniciado', 'Historial de conversación despejado.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
      {/* Header Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e0a96d] to-[#b37d46] flex items-center justify-center text-[#0b0c10] font-black shadow-lg shadow-[#e0a96d]/20 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-100 font-outfit">
                AURA Copilot & Conversor de Rutinas IA
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Gemini 2.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pega cualquier texto, protocolo o rutina y la IA extraerá compras, frecuencias y temporizadores.
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer bg-[#0b0c10] border border-slate-800 hover:border-rose-500/30 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Limpiar Chat</span>
        </button>
      </div>

      {/* Quick Prompts Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
          <Zap className="w-3.5 h-3.5 text-[#e0a96d]" />
          <span>Sugerencias:</span>
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp.text)}
            className="text-[11px] font-semibold text-slate-300 hover:text-[#e0a96d] bg-[#171a24] hover:bg-slate-800 border border-[#e0a96d]/20 hover:border-[#e0a96d]/40 px-3 py-1.5 rounded-full shrink-0 cursor-pointer transition-all flex items-center gap-1.5"
          >
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl flex-1 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-3">
            <Bot className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm">¿En qué rutina o plan de estilo de vida te gustaría trabajar hoy?</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isBot = msg.sender === 'copilot';
            const hasProducts = msg.actions?.products?.length > 0;
            const hasSelfCare = msg.actions?.selfCare?.length > 0;
            const hasTimers = msg.actions?.timers?.length > 0;
            const hasSchedule = msg.actions?.schedule?.length > 0;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isBot
                      ? 'bg-gradient-to-br from-[#e0a96d] to-[#b37d46] text-[#0b0c10]'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {isBot ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl p-4 sm:p-5 space-y-3 text-xs leading-relaxed ${
                    isBot
                      ? 'bg-[#171a24] border border-[#e0a96d]/20 text-slate-200 shadow-xl'
                      : 'bg-[#e0a96d]/15 border border-[#e0a96d]/40 text-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 border-b border-slate-800/60 pb-2 text-[10px] text-slate-400">
                    <span className="font-bold">{isBot ? 'AURA Copilot' : 'Tú'}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Markdown / Body Text */}
                  <div className="whitespace-pre-wrap leading-relaxed space-y-2 font-normal text-slate-200">
                    {msg.text}
                  </div>

                  {/* Action Cards (If extracted by AI) */}
                  {isBot && (hasProducts || hasSelfCare || hasTimers || hasSchedule) && (
                    <div className="pt-3 border-t border-slate-800 space-y-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#e0a96d]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Acciones Inteligentes Listas para Agregar a tus Módulos:</span>
                      </div>

                      {/* 1. Products to Price Comparator */}
                      {hasProducts && (
                        <div className="bg-[#0b0c10] border border-amber-500/20 p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                              <ShoppingBag className="w-4 h-4" />
                              Compras Necesarias ({msg.actions.products.length} Insumos)
                            </span>
                            <button
                              disabled={msg.executedActions?.products}
                              onClick={() => handleAddProductsToComparator(msg.id, msg.actions.products)}
                              className={`text-[11px] font-bold py-1 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                                msg.executedActions?.products
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'btn-rose-gold shadow-sm'
                              }`}
                            >
                              {msg.executedActions?.products ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Agregados a Compras</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Agregar al Comparador</span>
                                </>
                              )}
                            </button>
                          </div>
                          <ul className="space-y-1 text-slate-300">
                            {msg.actions.products.map((p, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-[11px]">
                                <span className="text-[#e0a96d] font-bold">•</span>
                                <div>
                                  <strong className="text-slate-100">{p.name}</strong>{' '}
                                  <span className="text-slate-400">({p.category})</span>
                                  {p.notes && <p className="text-[10px] text-slate-500">{p.notes}</p>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 2. Self Care Activities to Calendar */}
                      {hasSelfCare && (
                        <div className="bg-[#0b0c10] border border-purple-500/20 p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-400 text-xs flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              Autocuidado Periódico ({msg.actions.selfCare.length} Actividades)
                            </span>
                            <button
                              disabled={msg.executedActions?.selfCare}
                              onClick={() => handleAddSelfCareToCalendar(msg.id, msg.actions.selfCare)}
                              className={`text-[11px] font-bold py-1 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                                msg.executedActions?.selfCare
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'btn-rose-gold shadow-sm'
                              }`}
                            >
                              {msg.executedActions?.selfCare ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Agregadas a Calendario</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Agregar a Autocuidado</span>
                                </>
                              )}
                            </button>
                          </div>
                          <ul className="space-y-1.5 text-slate-300">
                            {msg.actions.selfCare.map((sc, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-[11px]">
                                <span className="text-purple-400 font-bold">•</span>
                                <div>
                                  <strong className="text-slate-100">{sc.title}</strong>{' '}
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
                                    {sc.protocol || `Cada ${sc.daysInterval || 2} días`}
                                  </span>
                                  {sc.notes && <p className="text-[10px] text-slate-500">{sc.notes}</p>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 3. Timers */}
                      {hasTimers && (
                        <div className="bg-[#0b0c10] border border-sky-500/20 p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sky-400 text-xs flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              Temporizadores Listos ({msg.actions.timers.length})
                            </span>
                            <button
                              disabled={msg.executedActions?.timers}
                              onClick={() => handleAddTimers(msg.id, msg.actions.timers)}
                              className={`text-[11px] font-bold py-1 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                                msg.executedActions?.timers
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'btn-rose-gold shadow-sm'
                              }`}
                            >
                              {msg.executedActions?.timers ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Creados en Temporizadores</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Crear Temporizadores</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {msg.actions.timers.map((t, idx) => (
                              <div key={idx} className="bg-[#171a24] border border-sky-500/30 px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-2">
                                <span className="font-bold text-slate-200">{t.name}</span>
                                <span className="text-[10px] font-mono text-sky-400 font-bold">
                                  {Math.round(t.durationSeconds / 60)} min
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 4. Schedule Blocks */}
                      {hasSchedule && (
                        <div className="bg-[#0b0c10] border border-emerald-500/20 p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              Horario Diario ({msg.actions.schedule.length} Bloques)
                            </span>
                            <button
                              disabled={msg.executedActions?.schedule}
                              onClick={() => handleAddScheduleBlock(msg.id, msg.actions.schedule)}
                              className={`text-[11px] font-bold py-1 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                                msg.executedActions?.schedule
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'btn-rose-gold shadow-sm'
                              }`}
                            >
                              {msg.executedActions?.schedule ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Integrado al Horario</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Agregar al Horario</span>
                                </>
                              )}
                            </button>
                          </div>
                          <ul className="space-y-1 text-slate-300">
                            {msg.actions.schedule.map((sch, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-[11px]">
                                <span className="font-mono text-[#e0a96d] font-bold">{sch.time}</span>
                                <span>{sch.title}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isProcessing && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e0a96d] to-[#b37d46] text-[#0b0c10] flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-[#171a24] border border-[#e0a96d]/20 rounded-2xl p-4 text-xs text-slate-300 space-y-1">
              <p className="font-bold text-[#e0a96d] flex items-center gap-2">
                <span>Estructurando estrategia y desglosando acciones...</span>
              </p>
              <p className="text-[10px] text-slate-400">
                Analizando frecuencias, compras necesarias, temporizadores y compatibilidad de hábitos.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="glass-panel p-3 rounded-2xl flex items-end gap-3 shrink-0"
      >
        <textarea
          rows="2"
          placeholder="Escribe o pega cualquier rutina, lista o recomendación médica/estética..."
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className="flex-1 bg-[#0b0c10] border border-[#e0a96d]/20 rounded-xl py-2.5 px-3.5 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] resize-none leading-relaxed"
        />
        <button
          type="submit"
          disabled={!inputPrompt.trim() || isProcessing}
          className="btn-rose-gold text-xs font-bold py-3 px-5 rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
}
