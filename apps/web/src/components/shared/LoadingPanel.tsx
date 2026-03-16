export function LoadingPanel({ label = "Carregando módulo de inteligência..." }: { label?: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-border-subtle bg-white/75 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col items-center gap-4">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500/20 border-t-brand-500" />
        <p className="text-sm font-medium text-text-secondary">{label}</p>
      </div>
    </div>
  );
}
