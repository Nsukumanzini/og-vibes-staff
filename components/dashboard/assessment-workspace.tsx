"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, ClipboardCheck, Download, FileUp, Plus, Scale, Send, TimerReset } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { AssessmentBrief, AssessmentRubric, AssignmentSubmission, ModuleWithProgramme, Profile } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";

const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const area = `${field} min-h-24 py-3`;
const safeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, "_");
const studentName = (submission: AssignmentSubmission) => submission.profiles?.nickname?.trim() || [submission.profiles?.name, submission.profiles?.surname].filter(Boolean).join(" ") || "Student";

export function AssessmentWorkspace({ profile, modules, initialBriefs, initialSubmissions, initialRubrics }: { profile: Profile; modules: ModuleWithProgramme[]; initialBriefs: AssessmentBrief[]; initialSubmissions: AssignmentSubmission[]; initialRubrics: AssessmentRubric[] }) {
  const supabase = createClient();
  const [briefs, setBriefs] = useState(initialBriefs);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [rubrics, setRubrics] = useState(initialRubrics);
  const [tab, setTab] = useState<"briefs" | "grading" | "extensions">("briefs");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [criteria, setCriteria] = useState([{ criterion: "Content knowledge", description: "", maxPoints: 50 }, { criterion: "Application and presentation", description: "", maxPoints: 50 }]);
  const [form, setForm] = useState({ moduleId: modules[0]?.id ?? "", title: "", type: "Assignment", instructions: "", dueAt: "", weight: "", venue: "", duration: "", allowLate: false, publish: false });
  const selectedSubmission = submissions.find((item) => item.id === selectedSubmissionId) ?? null;
  const selectedBrief = briefs.find((brief) => brief.id === selectedSubmission?.brief_id) ?? null;
  const selectedRubric = rubrics.filter((rubric) => rubric.brief_id === selectedBrief?.id).sort((a, b) => a.position - b.position);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const pendingExtensions = submissions.filter((item) => item.extension_requested && ["none", "pending"].includes(item.extension_status ?? "none"));
  const pendingGrades = submissions.filter((item) => item.submitted_at && item.withdrawn_at == null && item.grade == null);
  const totalRubricPoints = selectedRubric.reduce((sum, item) => sum + Number(item.max_points), 0);
  const enteredRubricPoints = selectedRubric.reduce((sum, item) => sum + Number(rubricScores[item.id] ?? 0), 0);

  async function createBrief() {
    // The variable represents an academic module, not Node's module object.
    // eslint-disable-next-line @next/next/no-assign-module-variable
    const module = modules.find((item) => item.id === form.moduleId);
    if (!module || !form.title.trim() || !form.dueAt) return setNotice("Choose a module, enter a title and select a due date.");
    if (criteria.some((item) => !item.criterion.trim() || item.maxPoints <= 0)) return setNotice("Every rubric criterion needs a name and positive points.");
    setBusy(true); setNotice("");
    const id = crypto.randomUUID();
    let storagePath: string | null = null;
    try {
      if (attachment) {
        storagePath = `${profile.id}/briefs/${id}/${Date.now()}_${safeName(attachment.name)}`;
        const { error: uploadError } = await supabase.storage.from("assessment-resources").upload(storagePath, attachment, { contentType: attachment.type || "application/octet-stream" });
        if (uploadError) throw uploadError;
      }
      const payload = { id, module_id: module.id, lecturer_id: profile.id, level: module.level, title: form.title.trim(), subject: module.name, instructions: form.instructions.trim() || null, due_at: new Date(form.dueAt).toISOString(), allow_late: form.allowLate, published: form.publish, assessment_type: form.type, venue: form.venue.trim() || null, duration_minutes: form.duration ? Number(form.duration) : null, weight_percent: form.weight ? Number(form.weight) : null, attachment_storage_path: storagePath, attachment_file_name: attachment?.name ?? null, attachment_mime_type: attachment?.type || null, attachment_file_size_bytes: attachment?.size ?? null };
      const rubricRows = criteria.map((item, position) => ({ brief_id: id, criterion: item.criterion.trim(), description: item.description.trim() || null, max_points: item.maxPoints, position }));
      const { data, error } = await supabase.rpc("create_assessment_bundle", { brief: payload, rubric: rubricRows });
      if (error) throw error;
      const result = data as { brief: AssessmentBrief; rubrics: AssessmentRubric[] };
      setBriefs((current) => [result.brief, ...current]); setRubrics((current) => [...current, ...result.rubrics]); setAttachment(null); setForm((current) => ({ ...current, title: "", instructions: "", dueAt: "", weight: "", venue: "", duration: "", publish: false })); setNotice(form.publish ? "Assessment and rubric published as one protected transaction." : "Assessment and rubric saved together as a draft.");
    } catch (error) { if (storagePath) await supabase.storage.from("assessment-resources").remove([storagePath]); setNotice(error instanceof Error ? error.message : "Assessment could not be created."); } finally { setBusy(false); }
  }

  async function togglePublish(brief: AssessmentBrief) {
    const published = !brief.published; const { error } = await supabase.from("assessment_briefs").update({ published, updated_at: new Date().toISOString() }).eq("id", brief.id); if (error) return setNotice(error.message); setBriefs((current) => current.map((item) => item.id === brief.id ? { ...item, published } : item));
  }

  async function openStorage(bucket: string, path: string | null, fallback?: string | null) {
    if (path) {
      let result = await supabase.storage.from(bucket).createSignedUrl(path, 600);
      if (result.error && bucket === "assessment-resources") result = await supabase.storage.from("academic-content").createSignedUrl(path, 600);
      if (result.error || !result.data) return setNotice(result.error?.message ?? "Unable to open this file.");
      window.open(result.data.signedUrl, "_blank", "noopener,noreferrer"); return;
    }
    if (fallback) window.open(fallback, "_blank", "noopener,noreferrer");
  }

  function selectForGrading(submission: AssignmentSubmission) {
    setSelectedSubmissionId(submission.id); setScore(submission.score?.toString() ?? submission.grade?.replace(/[^0-9.]/g, "") ?? ""); setFeedback(submission.feedback ?? ""); setRubricScores(submission.rubric_scores ?? {});
  }

  async function saveGrade() {
    if (!selectedSubmission) return;
    const maximum = totalRubricPoints || Number(selectedSubmission.max_score ?? 100); const numericScore = selectedRubric.length ? enteredRubricPoints : Number(score);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > maximum) return setNotice(`Enter a score between 0 and ${maximum}.`);
    setBusy(true); const percentage = maximum ? (numericScore / maximum) * 100 : 0;
    const payload = { score: numericScore, max_score: maximum, grade: `${numericScore}/${maximum} (${percentage.toFixed(1)}%)`, feedback: feedback.trim() || null, rubric_scores: rubricScores, graded_at: new Date().toISOString(), graded_by: profile.id, status: "graded" };
    const { error } = await supabase.from("assignment_submissions").update(payload).eq("id", selectedSubmission.id);
    setBusy(false); if (error) return setNotice(error.message); setSubmissions((current) => current.map((item) => item.id === selectedSubmission.id ? { ...item, ...payload } : item)); setNotice("Grade and feedback saved for the student.");
  }

  async function reviewExtension(submission: AssignmentSubmission, status: "approved" | "declined", newDueAt?: string) {
    if (status === "approved" && !newDueAt) return setNotice("Choose the approved submission deadline.");
    const payload = { extension_status: status, extension_reviewed_at: new Date().toISOString(), extension_reviewed_by: profile.id, extension_new_due_at: status === "approved" ? new Date(newDueAt!).toISOString() : null, extension_response: status === "approved" ? "Extension approved by lecturer." : "Extension request declined by lecturer." };
    const { error } = await supabase.from("assignment_submissions").update(payload).eq("id", submission.id); if (error) return setNotice(error.message); setSubmissions((current) => current.map((item) => item.id === submission.id ? { ...item, ...payload } : item)); setNotice(`Extension ${status}.`);
  }

  return <div className="space-y-6"><header className="rounded-3xl bg-[linear-gradient(135deg,#071a39,#144fbb_55%,#0aa5a8)] p-7 text-white shadow-2xl shadow-blue-900/20"><div className="flex items-center gap-3"><span className="rounded-2xl bg-white/15 p-3"><ClipboardCheck className="h-6 w-6"/></span><div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-200">Assessment centre</p><h1 className="text-3xl font-black">Briefs, grading & extensions</h1><p className="mt-1 text-sm text-blue-100">Build complete assessment packs, apply rubrics and manage every submission decision.</p></div></div><div className="mt-6 flex flex-wrap gap-2">{[["briefs","Assessment briefs",briefs.length],["grading","Grading queue",pendingGrades.length],["extensions","Extensions",pendingExtensions.length]].map(([value,label,count]) => <button key={String(value)} onClick={() => setTab(value as typeof tab)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === value ? "bg-white text-blue-950" : "bg-white/10 text-white hover:bg-white/20"}`}>{String(label)} <span className="ml-1 opacity-60">{String(count)}</span></button>)}</div></header>{notice && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{notice}</div>}
    {tab === "briefs" && <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]"><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Create an assessment</h2><p className="mt-1 text-sm text-slate-500">The brief, attachment and marking rubric are saved as one academic record.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><select className={field} value={form.moduleId} onChange={(e) => setForm({ ...form, moduleId: e.target.value })}><option value="">Choose module</option>{modules.map((module) => <option key={module.id} value={module.id}>{module.code ? `${module.code} · ` : ""}{module.name}</option>)}</select><select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Assignment</option><option>Project</option><option>Practical</option><option>Test</option><option>Portfolio</option></select><input className={field} placeholder="Assessment title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/><input className={field} type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })}/><textarea className={`${area} sm:col-span-2`} placeholder="Instructions and submission requirements" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })}/><input className={field} type="number" min="0" max="100" placeholder="Course weight %" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })}/><input className={field} placeholder="Venue (if applicable)" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}/><label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-3 text-sm font-bold text-blue-700 sm:col-span-2"><FileUp className="h-4 w-4"/>{attachment?.name || "Attach brief or supporting document"}<input type="file" className="sr-only" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}/></label></div><div className="mt-5 rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between"><div><p className="font-black">Marking rubric</p><p className="text-xs text-slate-500">Criteria total: {criteria.reduce((sum,item) => sum + Number(item.maxPoints || 0),0)} points</p></div><Button size="sm" variant="outline" onClick={() => setCriteria((current) => [...current,{criterion:"",description:"",maxPoints:10}])}><Plus/> Criterion</Button></div><div className="mt-3 space-y-2">{criteria.map((item,index) => <div key={index} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-[1fr_1.4fr_90px_auto]"><input className={field} placeholder="Criterion" value={item.criterion} onChange={(e) => setCriteria((current) => current.map((row,i) => i === index ? {...row,criterion:e.target.value} : row))}/><input className={field} placeholder="Description" value={item.description} onChange={(e) => setCriteria((current) => current.map((row,i) => i === index ? {...row,description:e.target.value} : row))}/><input className={field} type="number" min="1" value={item.maxPoints} onChange={(e) => setCriteria((current) => current.map((row,i) => i === index ? {...row,maxPoints:Number(e.target.value)} : row))}/><button className="px-2 text-xs font-bold text-rose-600" onClick={() => setCriteria((current) => current.filter((_,i) => i !== index))}>Remove</button></div>)}</div></div><div className="mt-4 flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.allowLate} onChange={(e) => setForm({...form,allowLate:e.target.checked})}/> Accept late submissions</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.publish} onChange={(e) => setForm({...form,publish:e.target.checked})}/> Publish immediately</label><Button className="ml-auto rounded-xl" onClick={createBrief} disabled={busy}><Send/>{busy ? "Saving…" : "Save assessment"}</Button></div></section><section className="space-y-3"><h2 className="px-1 text-xl font-black">Assessment library</h2>{briefs.map((brief) => <article key={brief.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-blue-600">{brief.assessment_type} · {modules.find((module) => module.id === brief.module_id)?.code ?? brief.subject}</p><h3 className="mt-1 text-lg font-black">{brief.title}</h3></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${brief.published ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{brief.published ? "Published" : "Draft"}</span></div><div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5"/>{brief.due_at ? new Date(brief.due_at).toLocaleString() : "No deadline"}</span><span className="inline-flex items-center gap-1"><Scale className="h-3.5 w-3.5"/>{rubrics.filter((item) => item.brief_id === brief.id).reduce((sum,item) => sum + Number(item.max_points),0)} points</span></div><div className="mt-4 flex flex-wrap gap-2">{brief.attachment_storage_path && <Button size="sm" variant="outline" onClick={() => openStorage("assessment-resources",brief.attachment_storage_path)}><Download/> {brief.attachment_file_name || "Brief"}</Button>}<Button size="sm" variant={brief.published ? "outline" : "default"} onClick={() => togglePublish(brief)}>{brief.published ? "Move to draft" : "Publish to students"}</Button></div></article>)}{!briefs.length && <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-slate-500">No assessment briefs yet.</div>}</section></div>}
    {tab === "grading" && <div className="grid gap-5 lg:grid-cols-[360px_1fr]"><section className="space-y-2 rounded-3xl border border-slate-200 bg-white p-4"><h2 className="px-2 text-lg font-black">Submitted work</h2>{submissions.filter((item) => item.submitted_at && !item.withdrawn_at).map((submission) => <button key={submission.id} onClick={() => selectForGrading(submission)} className={`w-full rounded-2xl border p-4 text-left ${selectedSubmissionId === submission.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-200"}`}><div className="flex justify-between gap-2"><p className="font-bold">{studentName(submission)}</p><span className="text-xs font-black text-blue-700">{submission.grade ?? "Pending"}</span></div><p className="mt-1 truncate text-xs text-slate-500">{submission.title} · {submission.file_name ?? "Submission"}</p></button>)}</section><section className="rounded-3xl border border-slate-200 bg-white p-6">{selectedSubmission ? <><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-blue-600">{studentName(selectedSubmission)}</p><h2 className="text-2xl font-black">{selectedSubmission.title}</h2><p className="text-sm text-slate-500">Submitted {selectedSubmission.submitted_at ? new Date(selectedSubmission.submitted_at).toLocaleString() : "—"}</p></div><Button variant="outline" onClick={() => openStorage("assignment_submissions",selectedSubmission.storage_path,selectedSubmission.document_url)}><Download/> Open submission</Button></div>{selectedRubric.length ? <div className="mt-6 space-y-3"><div className="flex justify-between"><h3 className="font-black">Rubric grading</h3><span className="text-sm font-bold text-blue-700">{enteredRubricPoints}/{totalRubricPoints}</span></div>{selectedRubric.map((criterion) => <div key={criterion.id} className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[1fr_110px]"><div><p className="font-bold">{criterion.criterion}</p><p className="text-xs text-slate-500">{criterion.description}</p></div><label className="text-xs font-bold text-slate-500">Score / {criterion.max_points}<input className={`${field} mt-1`} type="number" min="0" max={criterion.max_points} value={rubricScores[criterion.id] ?? ""} onChange={(e) => setRubricScores({...rubricScores,[criterion.id]:Number(e.target.value)})}/></label></div>)}</div> : <label className="mt-6 block text-sm font-bold">Score out of {selectedSubmission.max_score ?? 100}<input className={`${field} mt-2`} type="number" min="0" max={selectedSubmission.max_score ?? 100} value={score} onChange={(e) => setScore(e.target.value)}/></label>}<label className="mt-4 block text-sm font-bold">Student feedback<textarea className={`${area} mt-2`} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Give clear, constructive feedback"/></label><Button className="mt-4 rounded-xl" onClick={saveGrade} disabled={busy}><CheckCircle2/> Save grade & feedback</Button></> : <div className="grid min-h-96 place-items-center text-center"><div><ClipboardCheck className="mx-auto h-12 w-12 text-slate-300"/><p className="mt-3 font-bold">Select a submission to grade</p></div></div>}</section></div>}
    {tab === "extensions" && <section className="space-y-3">{pendingExtensions.map((submission) => <ExtensionCard key={submission.id} submission={submission} onReview={reviewExtension}/>) }{!pendingExtensions.length && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center"><TimerReset className="mx-auto h-12 w-12 text-emerald-500"/><h2 className="mt-3 text-xl font-black">Extension queue is clear</h2><p className="text-sm text-slate-500">New student requests will appear here.</p></div>}</section>}
  </div>;
}

function ExtensionCard({ submission, onReview }: { submission: AssignmentSubmission; onReview: (submission: AssignmentSubmission, status: "approved" | "declined", date?: string) => void }) {
  const [date, setDate] = useState("");
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 lg:grid-cols-[1fr_250px_auto]"><div><p className="text-xs font-black uppercase tracking-wider text-amber-600">Extension request</p><h2 className="text-lg font-black">{studentName(submission)} · {submission.title}</h2><p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{submission.late_reason || "No reason was provided."}</p></div><label className="text-sm font-bold text-slate-700">New deadline<input type="datetime-local" className={`${field} mt-2`} value={date} onChange={(e) => setDate(e.target.value)}/></label><div className="flex items-end gap-2"><Button variant="outline" onClick={() => onReview(submission,"declined")}>Decline</Button><Button onClick={() => onReview(submission,"approved",date)}>Approve</Button></div></div></article>;
}
