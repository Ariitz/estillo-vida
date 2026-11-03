import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Sparkles, X, Check, Pencil } from 'lucide-react';

/**
 * Centered in-app modal for duplicate / similarity detection across AURA Nexus modules.
 * Replaces native browser window.confirm() dialogs so no browser URL header is shown.
 */
export default function SimilarityDialogModal({
  isOpen,
  title = 'Posible Similitud',
  description = 'Detectamos un registro muy parecido que ya guardaste anteriormente:',
  existingLabel = 'Ya registrado',
  existingName = '',
  existingMeta = '',
  existingNotes = '',
  newLabel = 'Nuevo registro a guardar',
  newName = '',
  newMeta = '',
  confirmText = 'Sí, agregar de todos modos',
  cancelText = 'Cancelar / Revisar',
  editExistingText = 'Editar el ya registrado',
  onConfirm,
  onCancel,
  onEditExisting
}) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-[#0b0c10]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-[#171a24] border border-[#e0a96d]/40 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl animate-modal-pop my-auto space-y-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base sm:text-lg font-bold text-slate-100 font-outfit">
                  {title}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#e0a96d]/15 text-[#e0a96d] border border-[#e0a96d]/30">
                  AURA Detector
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar aviso de similitud"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comparison Cards */}
        <div className="space-y-2.5">
          {/* Existing Item */}
          <div className="p-3.5 rounded-xl bg-[#0b0c10] border border-amber-500/35 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>• {existingLabel}:</span>
              </span>
              {existingMeta && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {existingMeta}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-100">
              "{existingName}"
            </p>
            {existingNotes && (
              <p className="text-[11px] text-slate-400 italic line-clamp-2 pt-0.5">
                {existingNotes}
              </p>
            )}
          </div>

          {/* New Item */}
          <div className="p-3.5 rounded-xl bg-[#0b0c10] border border-[#e0a96d]/30 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#e0a96d]">
                • {newLabel}:
              </span>
              {newMeta && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {newMeta}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-100">
              "{newName}"
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 text-center pt-1">
          ¿Deseas agregarlo como un registro nuevo de todos modos?
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            {cancelText}
          </button>

          {onEditExisting && (
            <button
              type="button"
              onClick={onEditExisting}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{editExistingText}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className="btn-rose-gold px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

