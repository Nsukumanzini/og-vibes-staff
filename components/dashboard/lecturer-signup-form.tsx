"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type ProgrammeOption = { id: string; name: string };
type ModuleOption = { id: string; programme_id: string; level: string; name: string; code: string | null };

export function LecturerSignupForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    programmeId: "",
    moduleIds: [] as string[],
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadAcademicCatalog() {
      setCatalogLoading(true);
      const [programmeResult, moduleResult] = await Promise.all([
        supabase.from("programmes").select("id,name").order("name"),
        supabase.from("modules").select("id,programme_id,level,name,code").order("level").order("name"),
      ]);
      if (!active) return;
      const catalogError = programmeResult.error ?? moduleResult.error;
      if (catalogError) {
        setError("The academic catalogue could not be loaded. Please try again shortly.");
      } else {
        const availableProgrammes = (programmeResult.data ?? []) as ProgrammeOption[];
        setProgrammes(availableProgrammes);
        setModules((moduleResult.data ?? []) as ModuleOption[]);
        setFormData((current) => ({
          ...current,
          programmeId: current.programmeId || availableProgrammes[0]?.id || "",
        }));
      }
      setCatalogLoading(false);
    }
    void loadAcademicCatalog();
    return () => { active = false; };
  }, [supabase]);

  const availableModules = useMemo(
    () => modules.filter((module) => module.programme_id === formData.programmeId),
    [formData.programmeId, modules],
  );

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function chooseProgramme(programmeId: string) {
    setFormData((current) => ({ ...current, programmeId, moduleIds: [] }));
  }

  function toggleModule(moduleId: string) {
    setFormData((current) => ({
      ...current,
      moduleIds: current.moduleIds.includes(moduleId)
        ? current.moduleIds.filter((id) => id !== moduleId)
        : [...current.moduleIds, moduleId],
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!formData.programmeId) return setError("Choose the programme you teach.");
    if (!formData.moduleIds.length) return setError("Choose at least one module you teach.");
    if (formData.password.length < 8) return setError("Use a password with at least 8 characters.");
    if (formData.password !== formData.confirmPassword) return setError("Passwords do not match.");

    setIsSubmitting(true);
    const { data: registrationFlag, error: registrationFlagError } = await supabase
      .from("app_feature_flags")
      .select("enabled,disabled_message")
      .eq("feature_key", "registrations")
      .maybeSingle();
    if (registrationFlagError) {
      setError("Registration availability could not be checked. Please try again.");
      setIsSubmitting(false);
      return;
    }
    if (registrationFlag?.enabled === false) {
      setError(registrationFlag.disabled_message || "New registrations are temporarily paused.");
      setIsSubmitting(false);
      return;
    }

    const trimmedName = formData.fullName.trim();
    const nameParts = trimmedName.split(/\s+/).filter(Boolean);
    const name = nameParts[0] ?? trimmedName;
    const surname = nameParts.slice(1).join(" ") || "";
    const selectedProgramme = programmes.find((programme) => programme.id === formData.programmeId);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email.trim(),
      password: formData.password,
      options: {
        data: {
          name,
          surname,
          account_type: "lecturer",
          programme_id: formData.programmeId,
          programme_name: selectedProgramme?.name ?? "",
          module_ids: formData.moduleIds,
          campus: "",
          level: "",
          gender: "",
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      await supabase.auth.signOut();
      router.replace("/pending-approval?verified=1");
      router.refresh();
      return;
    }

    window.sessionStorage.setItem("og-vibes-staff-verification-email", formData.email.trim());
    router.replace("/verify-email");
    router.refresh();
  }

  return (
    <div className="w-full max-w-2xl rounded-3xl border border-border/70 bg-background/90 p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur sm:p-8">
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-background/90 shadow-sm">
          <Image src="/assets/logo.jpeg" alt="OG Vibes Staff logo" width={40} height={40} className="object-cover" />
        </div>
        <div><p className="text-lg font-semibold tracking-tight text-foreground">OG Vibes Staff</p><p className="text-sm text-muted-foreground">Lecturer application</p></div>
      </div>

      <div className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary"><Sparkles className="h-4 w-4" />Join your academic workspace</div>
        <p className="mt-2 text-sm text-muted-foreground">Choose the programme and modules you teach. An administrator will verify and approve your access before the dashboard opens.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="fullName"><input id="fullName" name="fullName" required autoComplete="name" value={formData.fullName} onChange={handleChange} placeholder="Jane Doe" className={inputClass} /></Field>
          <Field label="Work email" htmlFor="email"><input id="email" name="email" type="email" required autoComplete="email" value={formData.email} onChange={handleChange} placeholder="lecturer@college.ac.za" className={inputClass} /></Field>
        </div>

        <Field label="Programme" htmlFor="programmeId">
          <select id="programmeId" name="programmeId" required disabled={catalogLoading} value={formData.programmeId} onChange={(event) => chooseProgramme(event.target.value)} className={inputClass}>
            <option value="">{catalogLoading ? "Loading programmes…" : "Choose programme"}</option>
            {programmes.map((programme) => <option key={programme.id} value={programme.id}>{programme.name}</option>)}
          </select>
        </Field>

        <fieldset className="rounded-2xl border border-border/70 bg-muted/20 p-4">
          <legend className="px-2 text-sm font-semibold text-foreground">Modules you teach</legend>
          <p className="mb-3 text-xs text-muted-foreground">Select one or more modules from the chosen programme. Approval assigns only the modules the administrator accepts.</p>
          {catalogLoading ? <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading modules…</div> : availableModules.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {availableModules.map((module) => {
                const selected = formData.moduleIds.includes(module.id);
                return <label key={module.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${selected ? "border-primary/40 bg-primary/10" : "border-border bg-background hover:border-primary/25"}`}>
                  <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggleModule(module.id)} />
                  <span aria-hidden="true" className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{selected ? <Check className="h-3.5 w-3.5" /> : null}</span>
                  <span><b className="block text-sm text-foreground">{module.code ? `${module.code} · ` : ""}{module.name}</b><small className="text-xs text-muted-foreground">{module.level}</small></span>
                </label>;
              })}
            </div>
          ) : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No modules have been added to this programme yet. Please contact the administrator.</p>}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="password"><input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" value={formData.password} onChange={handleChange} placeholder="At least 8 characters" className={inputClass} /></Field>
          <Field label="Confirm password" htmlFor="confirmPassword"><input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat password" className={inputClass} /></Field>
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>Creating an account does not grant lecturer access immediately. Your programme and module requests must be approved first.</span></div></div>
        {error && <div role="alert" aria-live="polite" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <Button type="submit" className="h-11 gap-2 rounded-xl" disabled={isSubmitting || catalogLoading || !programmes.length}>{isSubmitting ? "Creating account…" : "Submit lecturer application"}<ArrowRight className="h-4 w-4" /></Button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4 text-sm text-muted-foreground"><div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />For lecturers and academic staff</div><Link href="/login" className="font-medium text-primary transition-colors hover:text-primary/80">Sign in instead</Link></div>
    </div>
  );
}

const inputClass = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><label htmlFor={htmlFor} className="text-sm font-medium text-foreground">{label}</label>{children}</div>;
}
