"use client";

import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  Clipboard,
  Clock3,
  Link2,
  MailPlus,
  RefreshCw,
  ShieldCheck,
  UserMinus,
  Users,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { academicPeriodForNcvLevel, NCV_LEVEL_OPTIONS, ncvLevelLabel } from "@/lib/academic-period";
import { createClient } from "@/lib/supabase/client";
import type { ModuleInvitationRecord, ModuleWithProgramme, StudentRegistration } from "@/lib/supabase/queries";

const inputClass = "h-11 w-full rounded-xl border border-border/80 bg-background/85 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

type CreatedInvitation = {
  invitation_id: string;
  invitation_token: string;
  resolved_student_id: string | null;
  resolved_email: string | null;
  invitation_expires_at: string;
};

export function ModuleInvitationManager({
  modules,
  initialRegistrations,
  initialInvitations,
  studentAppUrl,
}: {
  modules: ModuleWithProgramme[];
  initialRegistrations: StudentRegistration[];
  initialInvitations: ModuleInvitationRecord[];
  studentAppUrl: string;
}) {
  const year = new Date().getFullYear();
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [academicYear, setAcademicYear] = useState(year);
  const [ncvLevel, setNcvLevel] = useState(academicPeriodForNcvLevel(modules[0]?.level));
  const [expiryDays, setExpiryDays] = useState(14);
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [lastAndroidLink, setLastAndroidLink] = useState<string | null>(null);

  const selectedModule = modules.find((item) => item.id === moduleId);
  const moduleRegistrations = useMemo(
    () => registrations.filter((item) => item.module_id === moduleId),
    [registrations, moduleId],
  );
  const moduleInvitations = useMemo(
    () => invitations.filter((item) => item.module_id === moduleId),
    [invitations, moduleId],
  );

  async function searchStudents() {
    const phrase = studentSearch.trim().replace(/[,%()]/g, " ");
    if (phrase.length < 2) {
      setStudentResults([]);
      return;
    }
    setSearchingStudents(true);
    setError(null);
    const { data, error: searchError } = await createClient()
      .from("profiles")
      .select("id, name, surname, nickname, email, student_number, level, course")
      .eq("role", "student")
      .eq("account_status", "active")
      .or(`name.ilike.%${phrase}%,surname.ilike.%${phrase}%`)
      .order("surname", { ascending: true })
      .limit(12);
    setSearchingStudents(false);
    if (searchError) {
      setError(searchError.message);
      return;
    }
    setStudentResults((data ?? []) as StudentSearchResult[]);
  }

  async function createInvitation(kind: "student" | "link") {
    if (!moduleId) return;
    if (kind === "student" && !selectedStudent) {
      setError("Search for and select a student first.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    setLastLink(null);
    setLastAndroidLink(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_module_invitation", {
      target_module_id: moduleId,
      target_email: null,
      target_student_id: kind === "student" ? selectedStudent?.id ?? null : null,
      target_academic_year: academicYear,
      target_semester: ncvLevel,
      expiry_days: expiryDays,
    });
    if (rpcError) {
      setBusy(false);
      setError(rpcError.message);
      return;
    }
    const created = (Array.isArray(data) ? data[0] : data) as CreatedInvitation | null;
    if (!created) {
      setBusy(false);
      setError("Supabase did not return the invitation.");
      return;
    }
    const separator = studentAppUrl.includes("?") ? "&" : "?";
    const link = `${studentAppUrl}${separator}moduleToken=${encodeURIComponent(created.invitation_token)}`;
    const androidLink = `ogvibes://module-invite?moduleToken=${encodeURIComponent(created.invitation_token)}`;
    setLastLink(link);
    setLastAndroidLink(androidLink);
    setStudentSearch("");
    setStudentResults([]);
    setSelectedStudent(null);
    setInvitations((current) => [{
      id: created.invitation_id,
      module_id: moduleId,
      lecturer_id: "",
      student_id: created.resolved_student_id,
      invited_email: created.resolved_email,
      academic_year: academicYear,
      semester: ncvLevel,
      status: "pending",
      expires_at: created.invitation_expires_at,
      created_at: new Date().toISOString(),
      responded_at: null,
      modules: selectedModule ? { name: selectedModule.name, code: selectedModule.code, level: selectedModule.level } : null,
    }, ...current.filter((item) => !(item.module_id === moduleId && item.status === "pending" && created.resolved_email && item.invited_email === created.resolved_email))]);
    let pushSummary = "No registered app account was found, so share the secure link directly.";
    if (created.resolved_student_id) {
      const { data: pushData, error: pushError } = await supabase.functions.invoke("call-push", {
        body: { action: "send_module_invite", invitationId: created.invitation_id },
      });
      if (pushError) {
        pushSummary = `The invitation is saved, but push delivery failed: ${pushError.message}`;
      } else {
        const sent = Number(pushData?.sent ?? 0);
        const failed = Number(pushData?.failed ?? 0);
        pushSummary = sent > 0
          ? `Push delivered to ${sent} registered device${sent === 1 ? "" : "s"}${failed ? `; ${failed} delivery attempt${failed === 1 ? "" : "s"} failed` : ""}.`
          : "The invitation is available in-app, but this student has no active push-enabled device.";
      }
    }
    await navigator.clipboard?.writeText(link).catch(() => undefined);
    setMessage(kind === "student"
      ? `Invitation created and copied. ${pushSummary}`
      : "Secure class invitation link created and copied.");
    setBusy(false);
  }

  async function copyLink() {
    if (!lastLink) return;
    await navigator.clipboard.writeText(lastLink);
    setMessage("Invitation link copied.");
  }

  async function copyAndroidLink() {
    if (!lastAndroidLink) return;
    await navigator.clipboard.writeText(lastAndroidLink);
    setMessage("Android app invitation link copied.");
  }

  async function revoke(invitation: ModuleInvitationRecord) {
    if (!confirm("Revoke this pending invitation? The link will stop working immediately.")) return;
    const { error: rpcError } = await createClient().rpc("revoke_module_invitation", { invitation_id: invitation.id });
    if (rpcError) return setError(rpcError.message);
    setInvitations((current) => current.map((item) => item.id === invitation.id ? { ...item, status: "revoked" } : item));
    setMessage("Invitation revoked.");
  }

  async function removeStudent(registration: StudentRegistration) {
    if (!confirm(`Remove ${registration.name} ${registration.surname} from ${registration.module_name}? Module content will no longer be available.`)) return;
    const { error: rpcError } = await createClient().rpc("remove_student_from_module", {
      target_student_id: registration.student_id,
      target_module_id: registration.module_id,
      target_academic_year: registration.academic_year,
      target_semester: registration.semester,
    });
    if (rpcError) return setError(rpcError.message);
    setRegistrations((current) => current.filter((item) => !(
      item.student_id === registration.student_id && item.module_id === registration.module_id
      && item.academic_year === registration.academic_year && item.semester === registration.semester
    )));
    setMessage("Student removed. Their module access has been cancelled.");
  }

  if (!modules.length) return <Card className="glass-card"><CardContent className="p-10 text-center text-sm text-muted-foreground">An administrator must assign at least one module before invitations can be sent.</CardContent></Card>;

  return <div className="space-y-6">
    <section className="hero-panel rounded-4xl border border-white/50 p-6 shadow-[0_24px_80px_-38px_rgba(15,34,80,.45)] sm:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between"><div className="max-w-3xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-primary"><BookOpenCheck className="h-4 w-4"/>Controlled enrollment</div><h1 className="text-3xl font-black tracking-[-.035em] text-slate-950 sm:text-4xl">My modules</h1><p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Invite students securely, monitor responses, and manage the active roster that controls all module content.</p></div><div className="grid grid-cols-2 gap-3"><Metric label="My modules" value={modules.length}/><Metric label="Active students" value={new Set(registrations.map((item) => item.student_id)).size}/></div></div>
    </section>
    {(message || error) && <div role="status" aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error ?? message}</div>}
    <Card className="glass-card"><CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto_auto_auto] md:items-end"><Field label="Working module"><select className={inputClass} value={moduleId} onChange={(event) => { const nextModuleId = event.target.value; setModuleId(nextModuleId); setNcvLevel(academicPeriodForNcvLevel(modules.find((module) => module.id === nextModuleId)?.level)); setLastLink(null); setLastAndroidLink(null); }}>{modules.map((module) => <option key={module.id} value={module.id}>{module.code ? `${module.code} · ` : ""}{module.name}</option>)}</select></Field><Field label="Academic year"><input className={`${inputClass} md:w-32`} type="number" min="2020" max="2100" value={academicYear} onChange={(event) => setAcademicYear(Number(event.target.value))}/></Field><Field label="NCV level"><select className={`${inputClass} md:w-40`} value={ncvLevel} onChange={(event) => setNcvLevel(Number(event.target.value))}>{NCV_LEVEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Link expires"><select className={`${inputClass} md:w-36`} value={expiryDays} onChange={(event) => setExpiryDays(Number(event.target.value))}><option value={1}>1 day</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></Field></CardContent></Card>
    <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <div className="space-y-6"><Card className="glass-card"><CardHeader><CardTitle className="flex items-center gap-2"><MailPlus className="h-5 w-5 text-primary"/>Invite a student</CardTitle><CardDescription>Search active OG Vibes student accounts by first name or surname, then send an invitation for the selected module.</CardDescription></CardHeader><CardContent className="space-y-4"><Field label="Find a student"><div className="flex gap-2"><input className={inputClass} placeholder="First name or surname" value={studentSearch} onChange={(event) => { setStudentSearch(event.target.value); setSelectedStudent(null); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchStudents(); } }}/><Button type="button" variant="outline" className="h-11 shrink-0" disabled={searchingStudents} onClick={() => void searchStudents()}>{searchingStudents ? "Searching…" : "Search"}</Button></div></Field>{selectedStudent && <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3"><p className="font-bold text-slate-900">{studentName(selectedStudent)}</p><p className="mt-1 text-xs text-slate-600">{selectedStudent.student_number ?? selectedStudent.email}{selectedStudent.level ? ` · ${selectedStudent.level}` : ""}</p></div>}{studentResults.length > 0 && <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-border/70 bg-white/70 p-2">{studentResults.map((student) => <button key={student.id} type="button" onClick={() => { setSelectedStudent(student); setStudentResults([]); }} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-900">{studentName(student)}</span><span className="block truncate text-xs text-slate-500">{student.student_number ?? student.email}{student.course ? ` · ${student.course}` : ""}</span></span><span className="shrink-0 text-xs font-bold text-primary">Select</span></button>)}</div>}{studentSearch.trim().length >= 2 && !searchingStudents && studentResults.length === 0 && !selectedStudent && <p className="text-xs text-slate-500">Search to find an active student account.</p>}<Button className="h-11 w-full rounded-xl" disabled={busy || !selectedStudent} onClick={() => createInvitation("student")}><MailPlus className="h-4 w-4"/>{busy ? "Creating…" : "Send invitation"}</Button></CardContent></Card><Card className="glass-card"><CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary"/>Private class link</CardTitle><CardDescription>Any authenticated student with this one-time, expiring link can accept the module.</CardDescription></CardHeader><CardContent className="space-y-4"><Button variant="outline" className="h-11 w-full rounded-xl" disabled={busy} onClick={() => createInvitation("link")}><Link2 className="h-4 w-4"/>Generate and copy link</Button>{lastLink && <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4"><p className="break-all text-xs text-slate-600">{lastLink}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={copyLink}><Clipboard className="h-4 w-4"/>Copy web/PWA link</Button><Button size="sm" variant="outline" onClick={copyAndroidLink}><Clipboard className="h-4 w-4"/>Copy Android link</Button></div></div>}</CardContent></Card></div>
      <div className="space-y-6"><Card className="glass-card"><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary"/>Active roster</CardTitle><CardDescription>{selectedModule?.name} · accepted registrations only</CardDescription></CardHeader><CardContent className="space-y-3">{moduleRegistrations.length === 0 ? <Empty text="No students have accepted an invitation for this module yet."/> : moduleRegistrations.map((student) => <div key={`${student.student_id}-${student.academic_year}-${student.semester}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-white/65 p-4"><div><p className="font-black text-slate-900">{student.nickname ?? `${student.name} ${student.surname}`}</p><p className="mt-1 text-sm text-muted-foreground">{student.student_number ?? student.email} · {student.academic_year} · {ncvLevelLabel(student.semester)}</p></div><Button size="sm" variant="outline" className="text-red-600" onClick={() => removeStudent(student)}><UserMinus className="h-4 w-4"/>Remove</Button></div>)}</CardContent></Card><Card className="glass-card"><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary"/>Invitation activity</CardTitle><CardDescription>Pending and historical invitations stay available for accountability.</CardDescription></CardHeader><CardContent className="space-y-3">{moduleInvitations.length === 0 ? <Empty text="No invitations have been created for this module."/> : moduleInvitations.map((invitation) => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-white/65 p-4"><div><div className="flex items-center gap-2"><p className="font-bold">{invitation.invited_email ?? "Private class link"}</p><StatusBadge status={invitation.status}/></div><p className="mt-1 text-xs text-muted-foreground">{invitation.academic_year} · {ncvLevelLabel(invitation.semester)} · expires {invitation.expires_at ? new Date(invitation.expires_at).toLocaleDateString("en-ZA") : "unknown"}</p></div>{invitation.status === "pending" && <Button size="sm" variant="outline" onClick={() => revoke(invitation)}><XCircle className="h-4 w-4"/>Revoke</Button>}</div>)}</CardContent></Card></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3"><Trust icon={ShieldCheck} title="Database enforced" text="RLS blocks access without an active registration."/><Trust icon={CheckCircle2} title="Explicit acceptance" text="Opening a link never enrolls a student silently."/><Trust icon={RefreshCw} title="Reversible" text="Revoke invitations or cancel a registration at any time."/></div>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-2 text-sm font-bold text-slate-700"><span>{label}</span>{children}</label>; }
type StudentSearchResult = { id: string; name: string; surname: string; nickname: string | null; email: string; student_number: string | null; level: string | null; course: string | null; };
function studentName(student: StudentSearchResult) { return student.nickname?.trim() || `${student.name} ${student.surname}`.trim() || student.email; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="min-w-32 rounded-2xl border border-white/65 bg-white/70 px-4 py-3"><p className="text-2xl font-black text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>; }
function StatusBadge({ status }: { status: ModuleInvitationRecord["status"] }) { const variant = status === "accepted" ? "success" : status === "pending" ? "warning" : "muted"; return <Badge variant={variant}>{status}</Badge>; }
function Trust({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) { return <div className="rounded-2xl border border-white/60 bg-white/60 p-4 backdrop-blur"><Icon className="h-5 w-5 text-primary"/><p className="mt-3 text-sm font-black text-slate-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div>; }
