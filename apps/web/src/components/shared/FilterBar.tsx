import type { ReactNode } from "react";

export function FilterBar({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{left}</div>
      {right ? <div className="flex flex-wrap items-center gap-3">{right}</div> : null}
    </div>
  );
}
