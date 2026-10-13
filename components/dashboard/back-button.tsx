"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const visited = useRef<string[]>([]);
  useEffect(() => {
    const previous = visited.current.indexOf(pathname);
    if (previous >= 0) visited.current = visited.current.slice(0, previous + 1);
    else visited.current.push(pathname);
  }, [pathname]);
  function goBack() {
    const target = visited.current.at(-2) ?? '/dashboard';
    router.push(target);
  }
  return <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-muted" onClick={goBack}><ArrowLeft className="h-4 w-4" aria-hidden="true"/>Back</button>;
}
