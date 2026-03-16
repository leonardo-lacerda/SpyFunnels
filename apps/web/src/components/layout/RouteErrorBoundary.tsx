import { useRouteError, Link } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";

export function RouteErrorBoundary() {
    const error = useRouteError() as Error;

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-canvas p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">Algo deu errado</h1>
            <p className="text-sm text-text-secondary max-w-md mb-8">
                Encontramos um erro ao carregar este módulo de inteligência. Use o botão abaixo para voltar com segurança.
            </p>

            {error && (
                <div className="bg-surface-2 border border-red-500/20 p-4 rounded-lg text-left w-full max-w-lg mb-8 overflow-auto">
                    <p className="text-xs font-mono text-red-500">{error.message || "Erro de renderização desconhecido"}</p>
                </div>
            )}

            <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-6 py-3 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Painel
            </Link>
        </div>
    );
}
