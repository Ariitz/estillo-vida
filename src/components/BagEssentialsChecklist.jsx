import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Check,
  Plus,
  Trash2,
  Edit3,
  X,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Tag,
  Key,
  Smartphone,
  Smile,
  ShieldCheck
} from 'lucide-react';
import { safeString, sanitizeBagEssential } from '../utils/sanitizers';

export default function BagEssentialsChecklist({
  bagEssentials = [],
  setBagEssentials,
  showToast,
  isCompact = false
}) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [newItem, setNewItem] = useState({
    name: '',
    category: 'essentials',
    categoryLabel: 'Básicos',
    notes: ''
  });

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'hygiene', label: '🧴 Higiene & Cuidado', defaultLabel: 'Higiene' },
    { id: 'tech', label: '📱 Tecnología & Accesorios', defaultLabel: 'Tecnología' },
    { id: 'essentials', label: '🔑 Imprescindibles & Finanzas', defaultLabel: 'Básicos' },
    { id: 'wellness', label: '🍬 Extras & Bienestar', defaultLabel: 'Extras' }
  ];

  const totalCount = bagEssentials.length;
  const packedCount = bagEssentials.filter(i => i.packed).length;
  const progressPct = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;
  const allPacked = totalCount > 0 && packedCount === totalCount;

  // Toggle packed state
  const handleToggle = (id) => {
    setBagEssentials((prev) =>
      prev.map(item => item.id === id ? { ...item, packed: !item.packed } : item)
    );
  };

  // Reset all packed
  const handleResetAll = () => {
    setBagEssentials((prev) => prev.map(item => ({ ...item, packed: false })));
    if (showToast) showToast('info', 'Bolso Reiniciado', 'Todos los elementos listos para una nueva salida.');
  };

  // Mark all packed
  const handleMarkAll = () => {
    setBagEssentials((prev) => prev.map(item => ({ ...item, packed: true })));
    if (showToast) showToast('success', '¡Todo Listo!', 'Todos los elementos marcados en el bolso.');
  };

  // Delete item
  const handleDelete = (id, name) => {
    if (!window.confirm(`¿Deseas eliminar "${name}" de tu lista de cosas para salir?`)) return;
    setBagEssentials((prev) => prev.filter(i => i.id !== id));
    if (showToast) showToast('success', 'Eliminado', `"${name}" retirado de la lista.`);
  };

  // Add item
  const handleAddItem = (e) => {
    e.preventDefault();
    const cleanName = newItem.name.trim();
    if (!cleanName) return;

    const matchedCat = categories.find(c => c.id === newItem.category);
    const item = sanitizeBagEssential({
      id: 'bag-' + Date.now(),
      name: cleanName,
      category: newItem.category,
      categoryLabel: matchedCat?.defaultLabel || 'Esencial',
      packed: false,
      notes: newItem.notes.trim()
    });

    setBagEssentials((prev) => [...prev, item]);
    setNewItem({
      name: '',
      category: 'essentials',
      categoryLabel: 'Básicos',
      notes: ''
    });
    setShowAddModal(false);
    if (showToast) showToast('success', 'Elemento Agregado', `"${cleanName}" añadido a tu bolso de salida.`);
  };

  // Save edit item
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const cleanName = editingItem.name.trim();
    if (!cleanName) return;

    const matchedCat = categories.find(c => c.id === editingItem.category);
    setBagEssentials((prev) =>
      prev.map(i => i.id === editingItem.id ? {
        ...i,
        name: cleanName,
        category: editingItem.category,
        categoryLabel: matchedCat?.defaultLabel || i.categoryLabel,
        notes: (editingItem.notes || '').trim()
      } : i)
    );

    setEditingItem(null);
    if (showToast) showToast('success', 'Actualizado', `"${cleanName}" actualizado.`);
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    if (filterCategory === 'all') return bagEssentials;
    return bagEssentials.filter(i => i.category === filterCategory);
  }, [bagEssentials, filterCategory]);

  return (
    <div className="space-y-5">

      {/* HEADER PROGRESS BANNER */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#171a24] to-[#11131a] border border-[#e0a96d]/25 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e0a96d]/15 border border-[#e0a96d]/30 flex items-center justify-center text-[#e0a96d] shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-outfit">
                Checklist de Salida: Bolso & Esenciales
              </h3>
              <p className="text-xs text-slate-400">
                Todo lo que debes asegurarte de llevar cada vez que sales de casa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleResetAll}
              className="px-3 py-1.5 rounded-xl bg-[#11131a] hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Desmarcar todos para una nueva salida"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Desmarcar Todo
            </button>
            <button
              onClick={handleMarkAll}
              className="px-3 py-1.5 rounded-xl bg-[#11131a] hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Marcar todos como listos"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Marcar Todo
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#e0a96d] hover:bg-[#b37d46] text-[#0b0c10] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300">
              {allPacked ? '🎉 ¡Bolso listo! Tienes todo para salir' : `${packedCount} de ${totalCount} cosas listas en el bolso`}
            </span>
            <span className={`font-mono font-bold ${allPacked ? 'text-emerald-400' : 'text-[#e0a96d]'}`}>
              {progressPct}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#0b0c10] border border-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                allPacked
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-[#e0a96d] to-amber-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
              filterCategory === cat.id
                ? 'bg-[#171a24] text-[#e0a96d] border-[#e0a96d]/40 shadow-sm font-bold'
                : 'bg-[#11131a] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ITEMS LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {filteredItems.map((item) => {
          const isPacked = Boolean(item.packed);
          return (
            <div
              key={item.id}
              onClick={() => handleToggle(item.id)}
              className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                isPacked
                  ? 'bg-[#11131a]/60 border-emerald-500/25 opacity-75'
                  : 'bg-[#171a24] border-slate-800 hover:border-[#e0a96d]/40'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                    isPacked
                      ? 'bg-emerald-500 border-emerald-400 text-[#0b0c10]'
                      : 'bg-[#11131a] border-slate-700 text-transparent group-hover:border-[#e0a96d]'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold truncate ${isPacked ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                      {item.name}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                  item.category === 'hygiene'
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                    : item.category === 'tech'
                    ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                    : item.category === 'essentials'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                }`}>
                  {item.categoryLabel || 'Esencial'}
                </span>

                <div className="opacity-0 group-hover:opacity-100 flex items-center transition-all ml-1">
                  <button
                    onClick={() => setEditingItem({ ...item })}
                    className="p-1 text-slate-400 hover:text-[#e0a96d] rounded cursor-pointer"
                    title="Editar elemento"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-1 text-slate-400 hover:text-red-400 rounded cursor-pointer"
                    title="Eliminar elemento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-xs bg-[#11131a] rounded-2xl border border-slate-800">
          No hay elementos en esta categoría. Haz clic en "+ Agregar" para añadir uno nuevo.
        </div>
      )}

      {/* MODAL: AGREGAR ELEMENTO */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171a24] border border-[#e0a96d]/30 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-outfit">
                <ShoppingBag className="w-5 h-5 text-[#e0a96d]" /> Agregar al Bolso de Salida
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Nombre del elemento:</label>
                <input
                  type="text"
                  placeholder="ej. Cargador rápido, Lentes de sol, Labial"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Categoría:</label>
                <select
                  value={newItem.category}
                  onChange={(e) => {
                    const cat = categories.find(c => c.id === e.target.value);
                    setNewItem({
                      ...newItem,
                      category: e.target.value,
                      categoryLabel: cat?.defaultLabel || 'Esencial'
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                >
                  <option value="hygiene">🧴 Higiene & Cuidado Personal</option>
                  <option value="tech">📱 Tecnología & Accesorios</option>
                  <option value="essentials">🔑 Imprescindibles & Finanzas</option>
                  <option value="wellness">🍬 Extras & Bienestar</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Nota adicional (opcional):</label>
                <input
                  type="text"
                  placeholder="ej. En bolsa interna / Verificar carga"
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] font-black hover:bg-[#b37d46] cursor-pointer"
                >
                  Guardar Elemento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ELEMENTO */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10]/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#171a24] border border-[#e0a96d]/30 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-outfit">
                <Edit3 className="w-5 h-5 text-[#e0a96d]" /> Editar Elemento
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Nombre:</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Categoría:</label>
                <select
                  value={editingItem.category}
                  onChange={(e) => {
                    const cat = categories.find(c => c.id === e.target.value);
                    setEditingItem({
                      ...editingItem,
                      category: e.target.value,
                      categoryLabel: cat?.defaultLabel || editingItem.categoryLabel
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                >
                  <option value="hygiene">🧴 Higiene & Cuidado Personal</option>
                  <option value="tech">📱 Tecnología & Accesorios</option>
                  <option value="essentials">🔑 Imprescindibles & Finanzas</option>
                  <option value="wellness">🍬 Extras & Bienestar</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Nota:</label>
                <input
                  type="text"
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#11131a] border border-slate-700 text-slate-100 focus:border-[#e0a96d] outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-[#11131a] text-slate-400 hover:text-slate-200 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#e0a96d] text-[#0b0c10] font-black hover:bg-[#b37d46] cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
