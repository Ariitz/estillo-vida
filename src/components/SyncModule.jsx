import React, { useState } from 'react';
import { Cloud, CloudLightning, Wifi, WifiOff, RefreshCw, Download, Upload, Copy, Check, Info, HelpCircle, Key, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function SyncModule({
  firebaseConfig,
  setFirebaseConfig,
  isSyncActive,
  setIsSyncActive,
  onPull,
  onPush,
  showToast,
  syncLoading,
  lastSyncTime,
  isAutoSyncEnabled,
  setIsAutoSyncEnabled,
  geminiApiKey,
  setGeminiApiKey
}) {
  const [showConfig, setShowConfig] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleInputChange = (field, value) => {
    setFirebaseConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCopyKey = () => {
    if (!firebaseConfig.syncKey) return;
    navigator.clipboard.writeText(firebaseConfig.syncKey);
    setCopied(true);
    showToast('info', 'Clave Copiada', 'La clave de sincronización se copió al portapapeles.');
    setTimeout(() => setCopied(false), 2000);
  };

  const generateRandomKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'aura-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleInputChange('syncKey', result);
    showToast('info', 'Clave Generada', `Se generó la clave aleatoria: ${result}`);
  };

  const isConfigValid = 
    firebaseConfig.apiKey?.trim() && 
    firebaseConfig.projectId?.trim() && 
    firebaseConfig.syncKey?.trim();

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Sync Status Banner */}
      <div className={`border p-6 rounded-xl shadow-lg transition-all duration-300 ${
        isSyncActive 
          ? 'bg-emerald-500/5 border-emerald-500/20' 
          : 'bg-[#171a24] border-[#e0a96d]/15'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-full shrink-0 ${
              isSyncActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#e0a96d]/10 text-[#e0a96d]'
            }`}>
              {isSyncActive ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 font-outfit">
                {isSyncActive ? 'Sincronización Activa' : 'Sincronización en la Nube Desactivada'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                {isSyncActive 
                  ? `Conectado a Firebase Firestore. Tus datos se mantendrán sincronizados usando la clave "${firebaseConfig.syncKey}".`
                  : 'Guarda tus datos de forma segura en Firestore para acceder a ellos desde tu celular, tablet u otra computadora.'
                }
              </p>
              {lastSyncTime && (
                <div className="text-[10px] text-slate-500 font-semibold mt-2 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  <span>Última sincronización: {lastSyncTime}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto">
            {isSyncActive ? (
              <button
                onClick={() => {
                  setIsSyncActive(false);
                  showToast('warning', 'Desconectado', 'Sincronización en la nube desactivada localmente.');
                }}
                className="w-full md:w-auto border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-xs font-bold py-2.5 px-5 rounded-lg cursor-pointer transition-all"
              >
                Desconectar
              </button>
            ) : (
              <button
                disabled={!isConfigValid}
                onClick={() => {
                  if (isConfigValid) {
                    setIsSyncActive(true);
                    showToast('success', 'Conectando...', 'Inicializando conexión a Firebase Firestore.');
                  }
                }}
                className={`w-full md:w-auto text-xs font-bold py-2.5 px-5 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  isConfigValid 
                    ? 'btn-rose-gold cursor-pointer' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Cloud className="w-4 h-4" />
                <span>Activar y Conectar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle Column: Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <Key className="w-4 h-4 text-[#e0a96d]" />
                <span>Parámetros de Firebase & Sincronización</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-xs text-[#e0a96d] hover:text-[#f5d4af] cursor-pointer font-bold"
              >
                {showConfig ? 'Ocultar campos' : 'Mostrar campos'}
              </button>
            </div>

            {showConfig && (
              <div className="space-y-4">
                
                {/* Sync Key (Passphrase) */}
                <div className="p-4 bg-[#0b0c10] border border-[#e0a96d]/10 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      Clave de Sincronización (Sync Key)
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomKey}
                      className="text-[10px] text-[#e0a96d] hover:underline cursor-pointer font-bold"
                    >
                      Generar aleatoria
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej. mi-frase-secreta-nexus"
                      value={firebaseConfig.syncKey || ''}
                      onChange={(e) => handleInputChange('syncKey', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="flex-1 bg-[#171a24] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs font-mono focus:outline-none focus:border-[#e0a96d]"
                    />
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      disabled={!firebaseConfig.syncKey}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg border border-slate-700 cursor-pointer transition-colors"
                      title="Copiar clave"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    * Ingresa exactamente esta misma clave en tu otro dispositivo para sincronizar los datos. Se recomienda usar guiones y minúsculas.
                  </p>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
                    <span>API Key (de Firebase)</span>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                    >
                      {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showApiKey ? 'Ocultar' : 'Ver'}</span>
                    </button>
                  </label>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="AIzaSy..."
                    value={firebaseConfig.apiKey || ''}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs font-mono focus:outline-none focus:border-[#e0a96d]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Project ID */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Project ID</label>
                    <input
                      type="text"
                      placeholder="ej. mi-proyecto-estilo-vida"
                      value={firebaseConfig.projectId || ''}
                      onChange={(e) => handleInputChange('projectId', e.target.value)}
                      className="w-full bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs font-mono focus:outline-none focus:border-[#e0a96d]"
                    />
                  </div>

                  {/* Auth Domain */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Auth Domain (Opcional)</label>
                    <input
                      type="text"
                      placeholder="ej. mi-proyecto.firebaseapp.com"
                      value={firebaseConfig.authDomain || ''}
                      onChange={(e) => handleInputChange('authDomain', e.target.value)}
                      className="w-full bg-[#0b0c10] border border-slate-800 rounded-lg py-2 px-3 text-slate-400 text-xs font-mono focus:outline-none focus:border-[#e0a96d]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Messaging Sender ID */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Messaging Sender ID (Opcional)</label>
                    <input
                      type="text"
                      placeholder="ej. 123456789012"
                      value={firebaseConfig.messagingSenderId || ''}
                      onChange={(e) => handleInputChange('messagingSenderId', e.target.value)}
                      className="w-full bg-[#0b0c10] border border-slate-800 rounded-lg py-2 px-3 text-slate-400 text-xs font-mono focus:outline-none focus:border-[#e0a96d]"
                    />
                  </div>

                  {/* App ID */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">App ID (Opcional)</label>
                    <input
                      type="text"
                      placeholder="ej. 1:12345:web:abcd123"
                      value={firebaseConfig.appId || ''}
                      onChange={(e) => handleInputChange('appId', e.target.value)}
                      className="w-full bg-[#0b0c10] border border-slate-800 rounded-lg py-2 px-3 text-slate-400 text-xs font-mono focus:outline-none focus:border-[#e0a96d]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gemini AI Configuration Card */}
          <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 font-outfit flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#e0a96d]" />
                <span>Inteligencia Artificial (Google Gemini)</span>
              </h4>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                geminiApiKey?.trim() 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {geminiApiKey?.trim() ? 'IA Conectada' : 'Pendiente'}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Potencia el **Armario Virtual Inteligente** con visión computacional para reconocer prendas por foto y autollenar su categoría, corte, color y etiquetas.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Gemini API Key</span>
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  {showGeminiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showGeminiKey ? 'Ocultar' : 'Ver'}</span>
                </button>
              </label>

              <div className="flex gap-2">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  placeholder="AIzaSy... o AQ.Ab..."
                  value={geminiApiKey || ''}
                  onChange={(e) => {
                    setGeminiApiKey(e.target.value);
                  }}
                  className="flex-1 bg-[#0b0c10] border border-[#e0a96d]/20 rounded-lg py-2 px-3 text-slate-100 text-xs font-mono focus:outline-none focus:border-[#e0a96d]"
                />
                {geminiApiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setGeminiApiKey('');
                      showToast('warning', 'Clave eliminada', 'Se removió la Gemini API Key local.');
                    }}
                    className="bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 text-xs font-bold px-3 py-2 rounded-lg border border-slate-700 cursor-pointer transition-colors"
                  >
                    Borrar
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-slate-500 pt-1">
                <span>* Se almacena localmente y se sincroniza automáticamente entre todos tus dispositivos mediante tu nube de Firestore.</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#e0a96d] hover:underline font-bold flex items-center gap-1 shrink-0"
                >
                  Obtener API Key gratis &rarr;
                </a>
              </div>
            </div>
          </div>

          {/* Sync Operations Card (Visible only when configured) */}
          {isSyncActive && (
            <div className="bg-[#171a24] border border-emerald-500/20 p-6 rounded-xl space-y-4 shadow-lg animate-fade-in">
              <h4 className="text-base font-bold text-slate-100 font-outfit border-b border-slate-800 pb-3">
                Acciones de Datos manuales
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Pull Button */}
                <button
                  disabled={syncLoading}
                  onClick={onPull}
                  className="bg-[#0b0c10] hover:bg-slate-800 border border-slate-700 text-slate-200 p-5 rounded-xl flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer group"
                >
                  <div className="p-3 bg-[#e0a96d]/10 text-[#e0a96d] rounded-full group-hover:scale-110 transition-transform">
                    {syncLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                  </div>
                  <div>
                    <span className="block text-sm font-bold">Descargar de la Nube</span>
                    <span className="block text-[10px] text-slate-500 mt-1 max-w-[200px]">
                      Reemplaza tu información local con lo que está guardado en el servidor.
                    </span>
                  </div>
                </button>

                {/* Push Button */}
                <button
                  disabled={syncLoading}
                  onClick={onPush}
                  className="bg-[#0b0c10] hover:bg-slate-800 border border-slate-700 text-slate-200 p-5 rounded-xl flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer group"
                >
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full group-hover:scale-110 transition-transform">
                    {syncLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                  </div>
                  <div>
                    <span className="block text-sm font-bold">Subir a la Nube</span>
                    <span className="block text-[10px] text-slate-500 mt-1 max-w-[200px]">
                      Sube tu información local y sobrescribe la versión del servidor.
                    </span>
                  </div>
                </button>

              </div>

              {/* Autosync toggle */}
              <div className="flex items-center justify-between p-3.5 bg-[#0b0c10] border border-slate-800 rounded-lg">
                <div className="space-y-0.5">
                  <span className="block text-xs font-bold text-slate-200">Auto-Guardar en la nube</span>
                  <span className="block text-[10px] text-slate-500">
                    Sube tus datos automáticamente a Firebase cada vez que hagas un cambio.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                    isAutoSyncEnabled ? 'bg-[#e0a96d]' : 'bg-slate-800'
                  }`}
                  aria-label="Toggle autosync"
                >
                  <div className={`bg-[#0b0c10] w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                    isAutoSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Setup Tutorial */}
        <div className="space-y-6">
          
          <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl space-y-4 shadow-lg text-xs leading-relaxed text-slate-300">
            <h4 className="text-sm font-bold text-slate-100 font-outfit border-b border-slate-800 pb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#e0a96d]" />
              <span>¿Cómo crear tu base de datos gratis?</span>
            </h4>
            
            <ol className="list-decimal pl-4 space-y-3">
              <li>
                Entra a <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-[#e0a96d] hover:underline font-semibold">Firebase Console</a> con tu cuenta de Google.
              </li>
              <li>
                Haz clic en **Agregar proyecto** y ponle un nombre (ej. `mi-estilo-de-vida`). No necesitas activar Google Analytics.
              </li>
              <li>
                En el menú lateral, ve a **Build / Firestore Database** y haz clic en **Crear base de datos**.
              </li>
              <li>
                Selecciona **Iniciar en modo de prueba** (esto permite leer y escribir libremente sin autenticación compleja de inicio) y haz clic en **Crear**.
              </li>
              <li>
                Ve a la **Configuración del proyecto** (icono de engrane en la esquina superior izquierda).
              </li>
              <li>
                Abajo en "Tus apps", haz clic en el icono web {"</>"} para registrar una app. Ponle cualquier nombre (ej. "web-app").
              </li>
              <li>
                Copia las llaves de configuración (`apiKey` y `projectId`) que te proporciona Firebase y pégalas aquí.
              </li>
              <li>
                Define un **Sync Key** en ambos dispositivos, ¡y disfruta de tu agenda 100% sincronizada!
              </li>
            </ol>
          </div>

          <div className="bg-[#171a24] border border-[#e0a96d]/15 p-6 rounded-xl space-y-3 shadow-lg">
            <h4 className="text-sm font-bold text-slate-100 font-outfit flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#e0a96d]" />
              <span>¿Es seguro?</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal">
              Sí. Los datos se transmiten directamente entre tu navegador y tu proyecto de Firebase. AURA Nexus no tiene ningún servidor intermediario que lea tu información. Tus datos de armario, finanzas y salud te pertenecen exclusivamente a ti.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
