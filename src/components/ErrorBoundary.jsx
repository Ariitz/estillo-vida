import React from 'react';
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("AURA Nexus ErrorBoundary caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#171a24] border border-rose-500/30 rounded-2xl p-8 max-w-xl mx-auto my-8 text-center space-y-4 shadow-2xl animate-fade-in">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-100 font-outfit">
              Ocurrió un inconveniente al cargar esta sección
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Detectamos un conflicto temporal en los datos de este módulo. Tus datos están seguros.
            </p>
          </div>
          {this.state.error?.message && (
            <div className="bg-[#0b0c10] border border-slate-800 p-3 rounded-lg text-left overflow-x-auto">
              <span className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Detalle del error:</span>
              <code className="text-xs text-rose-300 font-mono break-all">{this.state.error.message}</code>
            </div>
          )}
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="btn-rose-gold text-xs font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reintentar / Restaurar Módulo</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
