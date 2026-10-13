"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, CheckCircle2, Clock3, Download, MapPin, RefreshCw, Trash2, UsersRound } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { AttendanceRecord, AttendanceSessionRecord, ModuleWithProgramme, OnlineClassRecord, Profile } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";

const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function studentName(record: AttendanceRecord) {
  return record.student?.nickname?.trim() || [record.student?.name, record.student?.surname].filter(Boolean).join(" ") || record.student?.email || "Student";
}

function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export function AttendanceManager({ profile, modules, onlineClasses, initialSessions, initialRecords }: { profile: Profile; modules: ModuleWithProgramme[]; onlineClasses: OnlineClassRecord[]; initialSessions: AttendanceSessionRecord[]; initialRecords: AttendanceRecord[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [sessions, setSessions] = useState(initialSessions);
  const [records, setRecords] = useState(initialRecords);
  const [selectedId, setSelectedId] = useState(initialSessions[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ moduleId: modules[0]?.id ?? "", title: "", type: "physical", date: new Date().toISOString().slice(0, 10), start: "09:00", end: "10:00", venue: "", onlineClassId: "" });
  const selected = sessions.find((session) => session.id === selectedId) ?? null;
  const roster = records.filter((record) => record.session_id === selectedId).sort((a, b) => studentName(a).localeCompare(studentName(b)));
  const counts = useMemo(() => Object.fromEntries(["present", "absent", "late", "excused"].map((status) => [status, roster.filter((record) => record.status === status).length])), [roster]);

  useEffect(() => {
    const channel = supabase.channel(`staff-attendance-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, async (payload) => {
        const changed = (payload.new ?? payload.old) as { session_id?: string };
        if (!changed.session_id || !sessions.some((session) => session.id === changed.session_id)) return;
        const { data } = await supabase.from("attendance_records").select("id, session_id, student_id, status, check_in_at, note, source, attendance_seconds, required_seconds, last_synced_at").eq("session_id", changed.session_id);
        if (!data) return;
        setRecords((current) => [...current.filter((record) => record.session_id !== changed.session_id), ...data.map((record) => ({ ...record, student: current.find((item) => item.student_id === record.student_id)?.student ?? null })) as AttendanceRecord[]]);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profile.id, sessions, supabase]);

  async function createSession() {
    if (!form.moduleId || !form.title.trim() || !form.date) return setNotice("Choose a module, date and session title.");
    setBusy(true); setNotice("");
    try {
      const startsAt = form.start ? new Date(`${form.date}T${form.start}`).toISOString() : null;
      const endsAt = form.end ? new Date(`${form.date}T${form.end}`).toISOString() : null;
      const { data, error } = await supabase.from("attendance_sessions").insert({ module_id: form.moduleId, lecturer_id: profile.id, online_class_id: form.type === "online" && form.onlineClassId ? form.onlineClassId : null, title: form.title.trim(), session_type: form.type, session_date: form.date, starts_at: startsAt, ends_at: endsAt, venue: form.type === "physical" ? form.venue.trim() || null : "Online", status: "open" }).select("id, module_id, lecturer_id, online_class_id, title, session_type, session_date, starts_at, ends_at, venue, notes, status, created_at").single();
      if (error) throw error;
      // The variable represents an academic module, not Node's module object.
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = modules.find((item) => item.id === data.module_id);
      const created = { ...data, module: module ? { name: module.name, code: module.code } : null } as AttendanceSessionRecord;
      const { data: seeded, error: rosterError } = await supabase.from("attendance_records").select("id, session_id, student_id, status, check_in_at, note, source, attendance_seconds, required_seconds, last_synced_at").eq("session_id", data.id);
      if (rosterError) throw rosterError;
      const studentIds = (seeded ?? []).map((row) => row.student_id);
      const { data: profiles } = studentIds.length ? await supabase.from("profiles").select("id, name, surname, nickname, email").in("id", studentIds) : { data: [] };
      const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));
      setSessions((current) => [created, ...current]);
      setRecords((current) => [...current, ...(seeded ?? []).map((item) => ({ ...item, student: profileMap.get(item.student_id) ?? null })) as AttendanceRecord[]]);
      setSelectedId(data.id); setForm((current) => ({ ...current, title: "", venue: "" })); setNotice("Attendance register created with the current module roster.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not create attendance register."); } finally { setBusy(false); }
  }

  async function updateRecord(record: AttendanceRecord, status: AttendanceRecord["status"]) {
    const previous = records;
    setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status, check_in_at: status === "present" || status === "late" ? new Date().toISOString() : null } : item));
    const { error } = await supabase.from("attendance_records").update({ status, check_in_at: status === "present" || status === "late" ? new Date().toISOString() : null, marked_by: profile.id, source: "manual", updated_at: new Date().toISOString() }).eq("id", record.id);
    if (error) { setRecords(previous); setNotice(error.message); }
  }

  async function updateSessionStatus(status: AttendanceSessionRecord["status"]) {
    if (!selected) return;
    const { error } = await supabase.from("attendance_sessions").update({ status, updated_at: new Date().toISOString() }).eq("id", selected.id);
    if (error) return setNotice(error.message);
    setSessions((current) => current.map((session) => session.id === selected.id ? { ...session, status } : session));
  }

  async function syncOnlineAttendance() {
    if (!selected?.online_class_id) return setNotice("Link this register to an online class before syncing attendance.");
    setBusy(true); setNotice("");
    const { data, error } = await supabase.rpc("sync_online_attendance_session", { target_session_id: selected.id });
    if (error) { setBusy(false); return setNotice(error.message); }
    const { data: refreshed, error: refreshError } = await supabase.from("attendance_records").select("id, session_id, student_id, status, check_in_at, note, source, attendance_seconds, required_seconds, last_synced_at").eq("session_id", selected.id);
    setBusy(false); if (refreshError) return setNotice(refreshError.message);
    setRecords((current) => [...current.filter((record) => record.session_id !== selected.id), ...(refreshed ?? []).map((record) => ({ ...record, student: current.find((item) => item.student_id === record.student_id)?.student ?? null })) as AttendanceRecord[]]);
    setNotice(`Online participation synchronized for ${Number(data ?? 0)} student record(s). Manual overrides were preserved.`);
  }

  async function deleteSession() {
    if (!selected || !confirm(`Delete “${selected.title}” and its attendance register?`)) return;
    const { error } = await supabase.from("attendance_sessions").delete().eq("id", selected.id);
    if (error) return setNotice(error.message);
    setSessions((current) => current.filter((session) => session.id !== selected.id));
    setRecords((current) => current.filter((record) => record.session_id !== selected.id));
    setSelectedId(sessions.find((session) => session.id !== selected.id)?.id ?? "");
    setNotice("Attendance register deleted.");
  }

  function exportRegister() {
    if (!selected) return;
    const rows = [["Session", "Module", "Date", "Student", "Email", "Status", "Check in", "Source", "Minutes attended", "Required minutes"], ...roster.map((record) => [selected.title, selected.module?.code ?? selected.module?.name, selected.session_date, studentName(record), record.student?.email, record.status, record.check_in_at, record.source, record.attendance_seconds == null ? "" : (record.attendance_seconds / 60).toFixed(1), record.required_seconds == null ? "" : (record.required_seconds / 60).toFixed(1)])];
    const blob = new Blob([rows.map((row) => row.map(csv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `attendance-${selected.session_date}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="space-y-6">
    <header className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#061a3a,#0b56c8_58%,#08a5c8)] p-7 text-white shadow-2xl shadow-blue-900/20"><div className="flex max-w-3xl items-center gap-3"><span className="rounded-2xl bg-white/15 p-3 backdrop-blur"><CalendarCheck2 className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-[.22em] text-cyan-200">Academic operations</p><h1 className="text-3xl font-black tracking-tight">Attendance register</h1><p className="mt-1 text-sm text-blue-100">Run physical and online registers, update participation live and export audit-ready records.</p></div></div></header>
    <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-xl shadow-slate-200/40 lg:grid-cols-[1.2fr_1fr]">
      <div><h2 className="text-lg font-black text-slate-950">New register</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><select className={field} value={form.moduleId} onChange={(e) => setForm({ ...form, moduleId: e.target.value })}><option value="">Choose module</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.code ? `${module.code} · ` : ""}{module.name}</option>)}</select><input className={field} placeholder="Session title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="physical">Physical class</option><option value="online">Online class</option></select><input className={field} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /><input className={field} type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /><input className={field} type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />{form.type === "physical" ? <input className={field} placeholder="Venue or room" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /> : <select className={field} value={form.onlineClassId} onChange={(e) => setForm({ ...form, onlineClassId: e.target.value })}><option value="">Link an online class (optional)</option>{onlineClasses.map((item) => <option key={item.id} value={item.id}>{item.topic ?? item.subject ?? "Online class"}</option>)}</select>}</div><Button className="mt-4 rounded-xl" onClick={createSession} disabled={busy}>{busy ? "Creating…" : "Create register"}</Button>{notice && <p className="mt-3 text-sm font-medium text-slate-600">{notice}</p>}</div>
      <div className="rounded-2xl bg-slate-950 p-5 text-white"><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Register workflow</p><div className="mt-4 space-y-4">{[[UsersRound, "Roster is automatic", "Registered students are added when the register is created."],[Clock3, "Live status capture", "Mark present, late, absent or excused with one click."],[Download, "Portable records", "Export the selected register as CSV for moderation."]].map(([Icon,title,text]) => <div key={String(title)} className="flex gap-3"><Icon className="mt-0.5 h-5 w-5 text-cyan-300"/><div><p className="font-bold">{String(title)}</p><p className="text-xs leading-5 text-slate-300">{String(text)}</p></div></div>)}</div></div>
    </section>
    <section className="grid gap-5 lg:grid-cols-[320px_1fr]"><div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="px-2 text-lg font-black">Registers</h2><div className="mt-3 space-y-2">{sessions.map((session) => <button key={session.id} onClick={() => setSelectedId(session.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === session.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-200"}`}><div className="flex items-center justify-between gap-2"><p className="font-bold text-slate-900">{session.title}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase">{session.status}</span></div><p className="mt-1 text-xs text-slate-500">{session.module?.code ?? session.module?.name} · {session.session_date}</p><p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><MapPin className="h-3 w-3" />{session.session_type === "online" ? "Online" : session.venue || "Venue not set"}</p></button>)}{!sessions.length && <p className="px-2 py-8 text-sm text-slate-500">Create your first attendance register.</p>}</div></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">{selected ? <><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-blue-600">{selected.module?.code ?? selected.module?.name}</p><h2 className="text-2xl font-black">{selected.title}</h2></div><div className="flex flex-wrap gap-2">{selected.session_type === "online" && <Button size="sm" variant="outline" onClick={syncOnlineAttendance} disabled={busy}><RefreshCw/> Sync online</Button>}<select className="h-9 rounded-lg border border-slate-200 px-2 text-sm" value={selected.status} onChange={(e) => updateSessionStatus(e.target.value as AttendanceSessionRecord["status"])}><option value="scheduled">Scheduled</option><option value="open">Open</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option></select><Button size="sm" variant="outline" onClick={exportRegister}><Download/> CSV</Button><Button size="icon" variant="outline" aria-label="Delete attendance register" onClick={deleteSession}><Trash2 className="h-4 w-4 text-rose-600"/></Button></div></div><div className="my-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(counts).map(([status,count]) => <div key={status} className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold capitalize text-slate-500">{status}</p><p className="text-xl font-black">{count}</p></div>)}</div><div className="space-y-2">{roster.map((record) => <div key={record.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{studentName(record)}</p><p className="text-xs text-slate-500">{record.student?.email}</p>{record.attendance_seconds != null && <p className="mt-1 text-xs font-semibold text-blue-700">Online: {(record.attendance_seconds / 60).toFixed(1)} / {((record.required_seconds ?? 0) / 60).toFixed(1)} minutes{record.source === "manual" ? " · manually reviewed" : ""}</p>}</div><div className="flex flex-wrap gap-1">{(["present","late","absent","excused"] as const).map((status) => <button key={status} onClick={() => updateRecord(record,status)} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold capitalize ${record.status === status ? status === "present" ? "bg-emerald-600 text-white" : status === "late" ? "bg-amber-500 text-white" : status === "excused" ? "bg-blue-600 text-white" : "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{status}</button>)}</div></div>)}{!roster.length && <p className="py-10 text-center text-sm text-slate-500">No registered students were available when this register was created.</p>}</div></> : <div className="flex min-h-72 flex-col items-center justify-center text-center"><CheckCircle2 className="h-10 w-10 text-slate-300"/><p className="mt-3 font-bold">Select a register</p><p className="text-sm text-slate-500">Choose a session to capture attendance.</p></div>}</div></section>
  </div>;
}
