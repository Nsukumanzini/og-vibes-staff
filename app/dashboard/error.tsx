"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto grid min-h-[60vh] max-w-2xl place-items-center px-4 text-center">
      <div className="w-full rounded-3xl border border-amber-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-black text-slate-950">This workspace could not load</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          Your data is safe. Check the connection and try again. If the problem continues, contact the OG Vibes administrator.
        </p>
        <Button className="mt-6 rounded-xl" onClick={reset}><RefreshCw className="h-4 w-4" /> Try again</Button>
      </div>
    </section>
  );
}
