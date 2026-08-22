import React, { useState } from 'react';
import { Plus, Trash2, Check, RefreshCw, PlusCircle, Ruler, Droplets, Trash, Edit3, Save, X } from 'lucide-react';

export default function ScheduleModule({
  weight,
  setWeight,
  height,
  setHeight,
  waterIntake,
  setWaterIntake,
  schedule,
  setSchedule,
  showToast
}) {
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('08:00 AM');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('morning');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Water goal: weight * 35 ml
  const waterGoal = Math.round(weight * 35);
  const waterPercent = Math.min(100, Math.round((waterIntake / waterGoal) * 100));

  // BMI (IMC)
  const imc = (weight / (height * height)).toFixed(1);
  const getImcStatus = (val) => {
    if (val < 18.5) return { label: 'Bajo peso', color: 'text-amber-400' };
    if (val < 25) return { label: 'Normal', color: 'text-emerald-400' };
    if (val < 30) return { label: 'Sobrepeso', color: 'text-amber-400' };
    return { label: 'Obesidad', color: 'text-rose-500' };
  };
  const imcStatus = getImcStatus(parseFloat(imc));

  const handleAddActivity = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem = {
      id: Date.now(),
      time: newTime,
      title: newTitle,
      desc: newDesc,
      category: newCategory,
      completed: false
    };

    setSchedule([...schedule, newItem]);
    setNewTitle('');
    setNewDesc('');
    setIsAdding(false);
    showToast('success', 'Actividad Añadida', `Se ha programado "${newTitle}"`);
  };

  const handleToggleComplete = (id) => {
    const updated = schedule.map(item => {
      if (item.id === id) {
        const nextState = !item.completed;
        if (nextState) {
          showToast('success', 'Tarea Completada', `¡Buen trabajo con: ${item.title}!`);
        }
        return { ...item, completed: nextState };
      }
      return item;
    });
    setSchedule(updated);
  };

  const handleDeleteItem = (id, title) => {
    setSchedule(schedule.filter(item => item.id !== id));
    showToast('info', 'Actividad Eliminada', `Se eliminó "${title}"`);
  };

  const handleEditClick = (item) => {
    setEditingItem({ ...item });
  };

  const handleSaveEdit = () => {
    if (!editingItem.title.trim()) return;
    setSchedule(schedule.map(item => item.id === editingItem.id ? editingItem : item));
    showToast('success', 'Actividad Actualizada', `Se guardó "${editingItem.title}"`);
    setEditingItem(null);
  };

  // Group by category
  const categories = {
    morning: { label: 'Mañana (05:00 AM - 11:59 AM)', items: schedule.filter(i => i.category === 'morning' || i.category === 'hygiene') },
    afternoon: { label: 'Tarde (12:00 PM - 06:59 PM)', items: schedule.filter(i => i.category === 'afternoon') },
    night: { label: 'Noche (07:00 PM - 04:59 AM)', items: schedule.filter(i => i.category === 'night') }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Profiler and Water Intake Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Card */}
        <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[#e0a96d]/10 text-[#e0a96d]">
                <Ruler className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 font-outfit">Perfil Antropométrico</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Peso Corporal (kg)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setWeight(val);
                    }}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:border-[#e0a96d] transition-colors"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-500">kg</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Estatura (m)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={height}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setHeight(val);
                    }}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:border-[#e0a96d] transition-colors"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-500">m</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0b0c10] border border-[#e0a96d]/10 p-4 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Índice de Masa Corporal (IMC)</span>
              <span className="text-2xl font-extrabold text-[#e0a96d] font-outfit">{imc} kg/m²</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Estado</span>
              <span className={`text-sm font-bold ${imcStatus.color}`}>{imcStatus.label}</span>
            </div>
          </div>
        </div>

        {/* Water Hydration Card */}
        <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden">
          {/* Waves background overlay */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-[#e0a96d]/5 pointer-events-none transition-all duration-700" 
            style={{ height: `${waterPercent}%` }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#e0a96d]/10 text-[#e0a96d]">
                  <Droplets className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-100 font-outfit">Consumo Hídrico Diario</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium bg-[#0b0c10] border border-[#e0a96d]/15 px-2.5 py-1 rounded-full">
                Meta: {(waterGoal / 1000).toFixed(2)} L ({waterGoal} ml)
              </span>
            </div>

            <div className="flex justify-between items-baseline mb-2">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#e0a96d] font-outfit">{waterIntake}</span>
                <span className="text-xs text-slate-400 font-semibold">/ {waterGoal} ml</span>
              </div>
              <span className="text-sm font-bold text-[#e0a96d]">{waterPercent}%</span>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full bg-[#0b0c10] h-3 rounded-full overflow-hidden mb-5 border border-[#e0a96d]/10">
              <div 
                className="bg-gradient-to-right from-[#e0a96d] to-[#f5d4af] h-full progress-bar-transition rounded-full"
                style={{ width: `${waterPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 relative z-10">
            <button
              onClick={() => {
                setWaterIntake(waterIntake + 250);
                showToast('info', 'Consumo de Agua', 'Añadido +250 ml de agua');
              }}
              className="bg-[#0b0c10] border border-[#e0a96d]/20 hover:border-[#e0a96d]/50 hover:bg-[#e0a96d]/5 text-slate-200 text-xs font-semibold py-2 px-1.5 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1"
            >
              <span>+250 ml</span>
              <span className="text-[10px] text-slate-500 font-normal">Taza chica</span>
            </button>
            <button
              onClick={() => {
                setWaterIntake(waterIntake + 500);
                showToast('info', 'Consumo de Agua', 'Añadido +500 ml de agua');
              }}
              className="bg-[#0b0c10] border border-[#e0a96d]/20 hover:border-[#e0a96d]/50 hover:bg-[#e0a96d]/5 text-slate-200 text-xs font-semibold py-2 px-1.5 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1"
            >
              <span>+500 ml</span>
              <span className="text-[10px] text-slate-500 font-normal">Vaso termo</span>
            </button>
            <button
              onClick={() => {
                setWaterIntake(0);
                showToast('warning', 'Consumo Reiniciado', 'Se ha restablecido el contador de agua');
              }}
              className="bg-[#0b0c10] border border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/5 text-rose-400 text-xs font-semibold py-2 px-1.5 rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
              aria-label="Reiniciar contador de agua"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span>Reset</span>
            </button>
          </div>
        </div>

      </div>

      {/* Routine Timeline */}
      <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-100 font-outfit">Cronograma de Rutina Diaria</h3>
            <p className="text-xs text-slate-400 mt-1">Completa y gestiona tus rituales diarios programados.</p>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Actividad</span>
          </button>
        </div>

        {/* Add Form Container */}
        {isAdding && (
          <form onSubmit={handleAddActivity} className="mb-6 p-4 bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Hora</label>
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="Ej. 06:00 AM"
                  className="w-full bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Título de la Actividad</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Estiramiento matutino"
                  className="w-full bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción / Método</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Ej. Abrazo de rodillas 30s, Gato-vaca..."
                className="w-full bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] h-20 resize-none"
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Fase del Día</label>
                <div className="flex gap-2">
                  {['morning', 'afternoon', 'night'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer border ${
                        newCategory === cat 
                          ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]' 
                          : 'bg-[#171a24] border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {cat === 'morning' ? 'Mañana' : cat === 'afternoon' ? 'Tarde' : 'Noche'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                >
                  Programar
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Timeline List */}
        <div className="space-y-6">
          {Object.entries(categories).map(([key, section]) => (
            <div key={key} className="space-y-3">
              <h4 className="text-xs font-bold text-[#e0a96d] tracking-wider uppercase bg-[#0b0c10] px-3 py-1.5 rounded-lg border border-[#e0a96d]/10">
                {section.label}
              </h4>
              
              {section.items.length === 0 ? (
                <p className="text-xs text-slate-500 italic pl-3">No hay actividades registradas para esta fase.</p>
              ) : (
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div 
                      key={item.id} 
                      className={`p-3.5 rounded-lg flex items-start justify-between gap-4 transition-all border ${
                        item.completed 
                          ? 'bg-[#0b0c10]/40 border-slate-800/40 opacity-60' 
                          : 'bg-[#0b0c10] border-[#e0a96d]/10 hover:border-[#e0a96d]/30'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleComplete(item.id)}
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                            item.completed 
                              ? 'bg-[#e0a96d] border-[#e0a96d] text-[#0b0c10]' 
                              : 'border-slate-600 hover:border-[#e0a96d]'
                          }`}
                          aria-label={`Marcar ${item.title} como ${item.completed ? 'incompleta' : 'completa'}`}
                        >
                          {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[#e0a96d] font-outfit">{item.time}</span>
                            <h5 className={`text-sm font-semibold text-slate-200 truncate ${item.completed ? 'line-through text-slate-500' : ''}`}>
                              {item.title}
                            </h5>
                          </div>
                          {item.desc && (
                            <p className={`text-xs text-slate-400 mt-1 whitespace-pre-line leading-relaxed ${item.completed ? 'text-slate-600' : ''}`}>
                              {item.desc}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
                          title="Editar actividad"
                          aria-label={`Editar ${item.title}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.title)}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title="Eliminar actividad"
                          aria-label={`Eliminar ${item.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal Dialog */}
      {editingItem && (
        <div className="fixed inset-0 bg-[#0b0c10]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#171a24] border border-[#e0a96d]/20 rounded-xl p-6 max-w-md w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-100 font-outfit">Editar Actividad</h3>
              <button 
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Hora</label>
                <input
                  type="text"
                  value={editingItem.time}
                  onChange={(e) => setEditingItem({ ...editingItem, time: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Título</label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción / Método</label>
                <textarea
                  value={editingItem.desc}
                  onChange={(e) => setEditingItem({ ...editingItem, desc: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d] h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Fase del Día</label>
                <div className="flex gap-2">
                  {['morning', 'afternoon', 'night'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, category: cat })}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer border ${
                        editingItem.category === cat 
                          ? 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d]' 
                          : 'bg-[#0b0c10] border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {cat === 'morning' ? 'Mañana' : cat === 'afternoon' ? 'Tarde' : 'Noche'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="btn-rose-gold text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
