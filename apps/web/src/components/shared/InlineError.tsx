import { AlertTriangle } from "lucide-react";

export function InlineError({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-rose-200 bg-rose-50/80 p-5 text-rose-900 shadow-[0_12px_30px_rgba(225,29,72,0.08)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-rose-800/80">{description}</p>
        </div>
      </div>
    </div>
  );
}
