import { ArrowRight, Clock3, MailOpen, WandSparkles } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import type { EmailMessage } from "../../../types/intelligence";
import { formatEmailIntent, formatEmailTag } from "../../../utils/labels";

export function EmailSequence({ emails }: { emails: EmailMessage[] }) {
  const ordered = [...emails].sort((a, b) => a.stepIndex - b.stepIndex);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-text-primary">Inteligência de emails</h2>
          <p className="mt-1 text-sm text-text-secondary">Tempo de sequência, transições de oferta e intenção de CTA reconstruídos a partir de inboxes capturados.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          <WandSparkles className="h-3.5 w-3.5 text-brand-500" />
          Ciclo de nutrição de 10 dias
        </div>
      </div>
      <div className="relative ml-3 border-l border-border-subtle pl-8">
        {ordered.map((email, index) => (
          <div key={email.id} className="relative pb-8 last:pb-0">
            <span className="absolute -left-[38px] top-4 h-5 w-5 rounded-full border-4 border-canvas bg-brand-500 shadow-[0_0_0_4px_rgba(255,255,255,0.88)]" />
            {index > 0 ? (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                <ArrowRight className="h-3 w-3" />
                Etapa {email.stepIndex}
              </div>
            ) : null}
            <Card className="border-white/70 bg-white/92 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-strong text-white">
                      <MailOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">{email.sequence}</p>
                      <h3 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-text-primary">{email.subject}</h3>
                      <p className="mt-1 text-sm text-text-secondary">{email.sender}</p>
                    </div>
                  </div>
                  <p className="max-w-2xl text-sm leading-7 text-text-secondary">{email.previewText}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{formatEmailIntent(email.intent)}</Badge>
                    {email.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{formatEmailTag(tag)}</Badge>
                    ))}
                    <Badge variant="outline">CTA: {email.ctaText}</Badge>
                  </div>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-2/80 px-4 py-3 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {new Date(email.receivedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
