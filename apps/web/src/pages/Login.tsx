import { startTransition, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChartColumnBig, LockKeyhole, Mail } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { apiLogin, apiMe, ApiError } from "../services/api-client";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { token } = await apiLogin(email, password);
      localStorage.setItem("auth_token", token);
      const currentUser = await apiMe();
      login(token, email, currentUser.role);
      startTransition(() => navigate("/dashboard"));
    } catch (requestError) {
      localStorage.removeItem("auth_token");
      const message =
        requestError instanceof ApiError ? requestError.message : "Não foi possível entrar com as credenciais atuais.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(29,78,216,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(180,83,9,0.12),transparent_28%),linear-gradient(180deg,#fcfbf8,#f3efe7)] px-6 py-12">
      <div className="absolute left-[8%] top-[10%] h-64 w-64 rounded-full bg-brand-500/10 blur-[90px]" />
      <div className="absolute bottom-[8%] right-[10%] h-72 w-72 rounded-full bg-amber-500/10 blur-[110px]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden lg:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500">Inteligência de funis competitivos</p>
          <h1 className="mt-5 max-w-2xl text-6xl font-semibold leading-[1.02] tracking-[-0.06em] text-ink-strong">
            Veja o funil do concorrente antes do mercado falar sobre ele.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-text-secondary">
            Monitore sites, perfis públicos, ramificações de funis, emails de ciclo de vida e mudanças estratégicas em um painel analítico único feito para times de crescimento e agências.
          </p>
        </div>
        <div className="rounded-[32px] border border-white/70 bg-white/92 p-8 shadow-[0_40px_100px_rgba(15,23,42,0.14)] backdrop-blur lg:p-10">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-ink-strong text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
              <ChartColumnBig className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500">Acesso ao espaço de trabalho</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-text-primary">Entrar</h2>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-2xl border border-border-subtle bg-white px-12 text-sm text-text-primary outline-none transition focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20" />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-text-primary">Senha</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-2xl border border-border-subtle bg-white px-12 text-sm text-text-primary outline-none transition focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20" />
              </div>
            </label>
            <button type="submit" disabled={isLoading} className="flex h-12 w-full items-center justify-center rounded-2xl bg-ink-strong text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)] transition hover:opacity-95 disabled:opacity-70">
              {isLoading ? "Entrando..." : "Entrar no painel"}
            </button>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </form>
          <p className="mt-6 text-xs leading-6 text-text-muted">Use suas credenciais do espaço de trabalho para acessar o painel.</p>
        </div>
      </div>
    </div>
  );
}
