import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2, Clock, Volume2, X } from 'lucide-react';

export default function TimersModule({
  customTimers,
  setCustomTimers,
  showToast
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [timerTitle, setTimerTitle] = useState('');
  const [timerMins, setTimerMins] = useState(5);
  const [timerSecs, setTimerSecs] = useState(0);

  const defaultTimers = [
    { id: 't-led', title: 'Máscara de Luz LED Roja', duration: 15 * 60 },
    { id: 't-stretch', title: 'Intervalos de Estiramiento', duration: 30 },
    { id: 't-cold', title: 'Compresa Fría / Antifaz de Gel', duration: 3 * 60 }
  ];

  const allTimers = [...defaultTimers, ...customTimers];

  const playSynthesizedChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playNote = (frequency, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      // Synthesize a beautiful, clean chime (C5 then G5)
      playNote(523.25, now, 0.6); // C5
      playNote(783.99, now + 0.2, 1.0); // G5
    } catch (e) {
      console.warn("Audio Context blocked or failed:", e);
    }
  };

  const handleAddTimer = (e) => {
    e.preventDefault();
    if (!timerTitle.trim()) return;

    const totalSecs = (parseInt(timerMins) || 0) * 60 + (parseInt(timerSecs) || 0);
    if (totalSecs <= 0) return;

    const newTimer = {
      id: 'custom-' + Date.now(),
      title: timerTitle,
      duration: totalSecs
    };

    setCustomTimers([...customTimers, newTimer]);
    setTimerTitle('');
    setIsAdding(false);
    showToast('success', 'Temporizador Creado', `Se añadió "${timerTitle}" (${timerMins}m ${timerSecs}s)`);
  };

  const handleDeleteCustom = (id, title) => {
    setCustomTimers(customTimers.filter(t => t.id !== id));
    showToast('warning', 'Temporizador Eliminado', `Se removió "${title}"`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header and Add Action */}
      <div className="flex justify-between items-center bg-[#171a24] p-4 rounded-xl border border-[#e0a96d]/15">
        <div>
          <h3 className="text-base font-bold text-slate-100 font-outfit">Temporizadores de Tratamiento</h3>
          <p className="text-xs text-slate-400 mt-0.5">Controla los tiempos para tus mascarillas, compresas y rutinas.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="btn-rose-gold text-xs font-bold py-2 px-5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Timer</span>
        </button>
      </div>

      {/* Add Custom Timer Form */}
      {isAdding && (
        <form onSubmit={handleAddTimer} className="bg-[#171a24] border border-[#e0a96d]/20 p-5 rounded-xl space-y-4 shadow-xl animate-fade-in">
          <h3 className="text-base font-bold text-slate-100 font-outfit">Nuevo Temporizador Personalizado</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Temporizador</label>
              <input
                type="text"
                placeholder="Ej. Tiempo de Reposo Té"
                value={timerTitle}
                onChange={(e) => setTimerTitle(e.target.value)}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-[#e0a96d]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Minutos</label>
              <input
                type="number"
                min="0"
                max="180"
                value={timerMins}
                onChange={(e) => setTimerMins(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Segundos</label>
              <input
                type="number"
                min="0"
                max="59"
                value={timerSecs}
                onChange={(e) => setTimerSecs(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none"
                required
              />
            </div>
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
              Crear Timer
            </button>
          </div>
        </form>
      )}

      {/* Timers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allTimers.map(timer => (
          <TimerCard
            key={timer.id}
            timer={timer}
            onDelete={handleDeleteCustom}
            playChime={playSynthesizedChime}
            showToast={showToast}
          />
        ))}
      </div>

    </div>
  );
}

function TimerCard({ timer, onDelete, playChime, showToast }) {
  const [timeLeft, setTimeLeft] = useState(timer.duration);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  const isCustom = timer.id.startsWith('custom-');

  // Format time display MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            playChime();
            showToast('success', '¡Tiempo Completado!', `Tratamiento finalizado: ${timer.title}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, timer.title, playChime, showToast]);

  // Reset time left if duration changes
  useEffect(() => {
    setTimeLeft(timer.duration);
    setIsRunning(false);
  }, [timer.duration]);

  const handlePlayPause = () => {
    if (timeLeft <= 0) {
      setTimeLeft(timer.duration);
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(timer.duration);
  };

  // Progress percentage
  const pct = Math.round((timeLeft / timer.duration) * 100);

  return (
    <div className="bg-[#171a24] border border-[#e0a96d]/15 p-5 rounded-xl shadow-lg flex flex-col justify-between space-y-5">
      <div>
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#e0a96d]" />
            <h4 className="font-bold text-sm text-slate-100 font-outfit truncate max-w-[150px]" title={timer.title}>
              {timer.title}
            </h4>
          </div>
          
          {isCustom && (
            <button
              onClick={() => onDelete(timer.id, timer.title)}
              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Eliminar timer"
              aria-label={`Eliminar timer ${timer.title}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Large Countdown timer display */}
        <div className="text-center py-6">
          <span className="text-4xl font-extrabold text-[#e0a96d] font-outfit tracking-wider">
            {formatTime(timeLeft)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">Duración: {formatTime(timer.duration)}</span>
        </div>

        {/* Simple Progress Bar */}
        <div className="w-full bg-[#0b0c10] h-1.5 rounded-full overflow-hidden border border-slate-900">
          <div 
            className="bg-gradient-to-right from-[#e0a96d] to-[#f5d4af] h-full progress-bar-transition rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Controls row */}
      <div className="flex justify-center gap-3">
        <button
          onClick={handlePlayPause}
          className={`flex items-center gap-1.5 text-xs font-bold py-2 px-5 rounded-lg border transition-all cursor-pointer ${
            isRunning 
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20' 
              : 'bg-[#e0a96d] text-[#0b0c10] border-[#e0a96d] hover:bg-[#f5d4af]'
          }`}
          aria-label={isRunning ? 'Pausar' : 'Iniciar'}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 stroke-[3]" />
              <span>Pausa</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-[#0b0c10] stroke-[3]" />
              <span>Iniciar</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleReset}
          className="border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          title="Reiniciar temporizador"
          aria-label="Reiniciar temporizador"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        <button
          onClick={() => {
            playChime();
            showToast('info', 'Prueba de Alarma', `Se probó el timbre para "${timer.title}"`);
          }}
          className="border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs py-2 px-2.5 rounded-lg transition-colors cursor-pointer"
          title="Probar sonido"
          aria-label="Probar sonido de alarma"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
