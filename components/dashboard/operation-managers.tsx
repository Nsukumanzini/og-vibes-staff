"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileUp,
  GraduationCap,
  MessageSquareText,
  Plus,
  Radio,
  Search,
  Send,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type {
  AnnouncementRecord,
  AssessmentBrief,
  AssignmentSubmission,
  ICassMarkRecord,
  ModuleWithProgramme,
  OnlineClassRecord,
  PastPaperRecord,
  Profile,
  SlideRecord,
  StaffMessageRecord,
  StudentRegistration,
  TimetableRecord,
} from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { academicPeriodForNcvLevel, ncvLevelLabel } from "@/lib/academic-period";

const inputClass =
  "h-11 w-full rounded-xl border border-border/80 bg-background/80 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
const areaClass = `${inputClass} min-h-28 py-3`;

function youtubeVideoId(input: string) {
  const value = input.trim();
  const validId = /^[A-Za-z0-9_-]{11}$/;
  if (validId.test(value)) return value;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let candidate: string | null = null;
    if (host === 'youtu.be') candidate = url.pathname.split('/').filter(Boolean)[0] ?? null;
    if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      const parts = url.pathname.split('/').filter(Boolean);
      candidate = parts[0] === 'watch'
        ? url.searchParams.get('v')
        : ['live', 'embed', 'shorts'].includes(parts[0] ?? '')
          ? parts[1] ?? null
          : null;
    }
    return candidate && validId.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function canonicalYoutubeUrl(input: string) {
  const id = youtubeVideoId(input);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

function WorkspaceHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
}) {
  return (
    <section className="hero-panel relative overflow-hidden rounded-[2rem] border border-white/50 p-6 shadow-[0_24px_80px_-38px_rgba(15,34,80,.45)] sm:p-8">
      <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-primary backdrop-blur">
            <Icon className="h-4 w-4" /> {eyebrow}
          </div>
          <h1 className="text-3xl font-black tracking-[-.035em] text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function StatusMessage({ message, error }: { message?: string | null; error?: string | null }) {
  if (!message && !error) return null;
  return (
    <div role="status" aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
      {error ?? message}
    </div>
  );
}

export function AlertsManager({ initialAlerts, profile }: { initialAlerts: AnnouncementRecord[]; profile: Profile }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "", urgency: "info", pinned: false });

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null); setMessage(null);
    const supabase = createClient();
    const slug = `${form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;
    const { data, error: publishError } = await supabase.from("app_content").insert({
      section: "announcements",
      slug,
      title: form.title.trim(),
      subtitle: profile.department || "OG Vibes Campus",
      data: { body: form.body.trim(), role: `${profile.name} ${profile.surname}`.trim(), urgency: form.urgency, is_pinned: form.pinned },
      is_active: true,
      created_by: profile.id,
    }).select("id, slug, title, subtitle, data, is_active, created_at, updated_at, created_by").single();
    setBusy(false);
    if (publishError) return setError(publishError.message);
    setAlerts((current) => [data as AnnouncementRecord, ...current]);
    setForm({ title: "", body: "", urgency: "info", pinned: false });
    setMessage("Announcement published. It is now visible on the student Alerts screen.");
    router.refresh();
  }

  async function toggle(alert: AnnouncementRecord) {
    const supabase = createClient();
    const { error: updateError } = await supabase.from("app_content").update({ is_active: !alert.is_active, updated_at: new Date().toISOString() }).eq("id", alert.id);
    if (updateError) return setError(updateError.message);
    setAlerts((current) => current.map((item) => item.id === alert.id ? { ...item, is_active: !item.is_active } : item));
  }

  async function remove(alert: AnnouncementRecord) {
    if (!confirm(`Delete “${alert.title}”?`)) return;
    const { error: deleteError } = await createClient().from("app_content").delete().eq("id", alert.id);
    if (deleteError) return setError(deleteError.message);
    setAlerts((current) => current.filter((item) => item.id !== alert.id));
  }

  return <div className="space-y-6">
    <WorkspaceHeader eyebrow="Student communication" title="Alerts & announcements" description="Publish verified updates that appear immediately inside the student app, with urgency and pinning controls." icon={BellRing}>
      <div className="grid grid-cols-2 gap-3"><Metric label="Published" value={alerts.filter((item) => item.is_active).length}/><Metric label="Critical" value={alerts.filter((item) => String(item.data?.urgency).match(/critical|emergency/)).length}/></div>
    </WorkspaceHeader>
    <StatusMessage message={message} error={error}/>
    <div className="grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
      <Card className="glass-card"><CardHeader><CardTitle>New announcement</CardTitle><CardDescription>Students receive this through the shared app_content feed.</CardDescription></CardHeader><CardContent>
        <form onSubmit={publish} className="space-y-4">
          <Field label="Title"><input className={inputClass} required maxLength={100} value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="Campus network maintenance"/></Field>
          <Field label="Message"><textarea className={areaClass} required maxLength={1200} value={form.body} onChange={(e)=>setForm({...form,body:e.target.value})} placeholder="Tell students exactly what is changing and what action to take."/></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Urgency"><select className={inputClass} value={form.urgency} onChange={(e)=>setForm({...form,urgency:e.target.value})}><option value="info">Information</option><option value="warning">Important</option><option value="critical">Critical</option></select></Field><label className="flex h-11 items-center gap-3 self-end rounded-xl border border-border/80 bg-background/80 px-3 text-sm font-medium"><input type="checkbox" checked={form.pinned} onChange={(e)=>setForm({...form,pinned:e.target.checked})}/> Pin to top</label></div>
          <Button className="h-11 w-full rounded-xl" disabled={busy}><Send className="h-4 w-4"/>{busy?"Publishing…":"Publish to students"}</Button>
        </form>
      </CardContent></Card>
      <Card className="glass-card"><CardHeader><CardTitle>Announcement history</CardTitle><CardDescription>Pause or remove announcements you created.</CardDescription></CardHeader><CardContent className="space-y-3">
        {alerts.length===0?<Empty text="No announcements yet. Publish the first official update."/>:alerts.map((alert)=><div key={alert.id} className="rounded-2xl border border-border/70 bg-white/65 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-900">{alert.title}</p><Badge variant={alert.is_active?"success":"muted"}>{alert.is_active?"Live":"Paused"}</Badge></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{String(alert.data?.body ?? alert.subtitle ?? "")}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>toggle(alert)}>{alert.is_active?"Pause":"Republish"}</Button><Button size="icon" variant="outline" aria-label="Delete announcement" onClick={()=>remove(alert)}><Trash2 className="h-4 w-4"/></Button></div></div>
        </div>)}
      </CardContent></Card>
    </div>
  </div>;
}

export function AssessmentManager({ profile, modules, initialBriefs, initialSubmissions }: { profile: Profile; modules: ModuleWithProgramme[]; initialBriefs: AssessmentBrief[]; initialSubmissions: AssignmentSubmission[] }) {
  const [briefs,setBriefs]=useState(initialBriefs); const [submissions,setSubmissions]=useState(initialSubmissions);
  const [message,setMessage]=useState<string|null>(null); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({module_id:modules[0]?.id??"",title:"",instructions:"",due_at:"",assessment_type:"Assignment",weight_percent:"",allow_late:false});
  async function createBrief(event:React.FormEvent){event.preventDefault();setBusy(true);setError(null);const moduleRecord=modules.find(m=>m.id===form.module_id);const {data,error:e}=await createClient().from("assessment_briefs").insert({module_id:form.module_id,lecturer_id:profile.id,level:moduleRecord?.level??"",title:form.title.trim(),subject:moduleRecord?.name??"General",instructions:form.instructions.trim()||null,due_at:new Date(form.due_at).toISOString(),assessment_type:form.assessment_type,weight_percent:Number(form.weight_percent)||null,allow_late:form.allow_late,published:false}).select().single();setBusy(false);if(e)return setError(e.message);setBriefs(c=>[data as AssessmentBrief,...c]);setForm({...form,title:"",instructions:"",due_at:"",weight_percent:""});setMessage("Assessment draft created. Publish it when students should see it.");}
  async function toggleBrief(brief:AssessmentBrief){const {error:e}=await createClient().from("assessment_briefs").update({published:!brief.published,updated_at:new Date().toISOString()}).eq("id",brief.id);if(e)return setError(e.message);setBriefs(c=>c.map(x=>x.id===brief.id?{...x,published:!x.published}:x));}
  async function grade(submission:AssignmentSubmission){const grade=prompt("Enter the grade or percentage",submission.grade??"");if(grade===null)return;const feedback=prompt("Feedback for the student",submission.feedback??"")??"";const {error:e}=await createClient().from("assignment_submissions").update({grade:grade.trim(),feedback:feedback.trim(),updated_at:new Date().toISOString()}).eq("id",submission.id);if(e)return setError(e.message);setSubmissions(c=>c.map(x=>x.id===submission.id?{...x,grade:grade.trim(),feedback:feedback.trim()}:x));setMessage("Grade and feedback saved. The student can now see them in Assessment Submission.");}
  async function openSubmission(submission:AssignmentSubmission){try{const url=submission.storage_path?(await createClient().storage.from("assignment_submissions").createSignedUrl(submission.storage_path,300)).data?.signedUrl:submission.document_url;if(!url)throw new Error("No submitted file is attached.");window.open(url,"_blank","noopener,noreferrer");}catch(e){setError(e instanceof Error?e.message:"Could not open the submission.");}}
  return <div className="space-y-6"><WorkspaceHeader eyebrow="Academic workflow" title="Assessments & submissions" description="Create student-visible assessment briefs, publish deadlines, securely open submissions, and return grades and feedback." icon={CheckCircle2}><div className="grid grid-cols-2 gap-3"><Metric label="Briefs" value={briefs.length}/><Metric label="Awaiting grade" value={submissions.filter(s=>!s.grade&&s.submitted_at).length}/></div></WorkspaceHeader><StatusMessage message={message} error={error}/><div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><Card className="glass-card"><CardHeader><CardTitle>Create assessment</CardTitle><CardDescription>Starts as a safe draft.</CardDescription></CardHeader><CardContent><form onSubmit={createBrief} className="space-y-4"><Field label="Module"><select required className={inputClass} value={form.module_id} onChange={e=>setForm({...form,module_id:e.target.value})}><option value="">Select module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.code?`${m.code} · `:""}{m.name}</option>)}</select></Field><Field label="Assessment title"><input required className={inputClass} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Type"><select className={inputClass} value={form.assessment_type} onChange={e=>setForm({...form,assessment_type:e.target.value})}><option>Assignment</option><option>Test</option><option>Project</option><option>Practical</option></select></Field><Field label="Due date and time"><input required type="datetime-local" className={inputClass} value={form.due_at} onChange={e=>setForm({...form,due_at:e.target.value})}/></Field></div><Field label="Instructions"><textarea className={areaClass} value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})}/></Field><Button className="h-11 w-full rounded-xl" disabled={busy||!modules.length}><Plus className="h-4 w-4"/>{busy?"Creating…":"Create draft"}</Button></form></CardContent></Card><div className="space-y-6"><Card className="glass-card"><CardHeader><CardTitle>Assessment briefs</CardTitle></CardHeader><CardContent className="space-y-3">{briefs.length===0?<Empty text="No assessment briefs yet."/>:briefs.map(b=><div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-white/65 p-4"><div><p className="font-bold">{b.title}</p><p className="mt-1 text-sm text-muted-foreground">{b.subject} · due {b.due_at?new Date(b.due_at).toLocaleString("en-ZA"):"TBD"}</p></div><Button size="sm" variant={b.published?"outline":"default"} onClick={()=>toggleBrief(b)}>{b.published?"Move to draft":"Publish"}</Button></div>)}</CardContent></Card><Card className="glass-card"><CardHeader><CardTitle>Student submissions</CardTitle><CardDescription>Private files open with short-lived signed links.</CardDescription></CardHeader><CardContent className="space-y-3">{submissions.length===0?<Empty text="No submissions are available for your modules."/>:submissions.map(s=><div key={s.id} className="rounded-2xl border border-border/70 bg-white/65 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{s.profiles?.nickname??`${s.profiles?.name??"Student"} ${s.profiles?.surname??""}`}</p><p className="mt-1 text-sm text-muted-foreground">{s.title} · {s.submitted_at?new Date(s.submitted_at).toLocaleString("en-ZA"):s.status}</p></div><Badge variant={s.grade?"success":"warning"}>{s.grade?`Graded · ${s.grade}`:"Awaiting grade"}</Badge></div><div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={()=>openSubmission(s)}><ExternalLink className="h-4 w-4"/>Open file</Button><Button size="sm" onClick={()=>grade(s)}><GraduationCap className="h-4 w-4"/>{s.grade?"Update grade":"Grade"}</Button></div></div>)}</CardContent></Card></div></div></div>;
}

export function ICassManager({ profile, modules, students, initialMarks }: { profile: Profile; modules: ModuleWithProgramme[]; students: StudentRegistration[]; initialMarks: ICassMarkRecord[] }) {
  const [marks,setMarks]=useState(initialMarks);const [error,setError]=useState<string|null>(null);const [message,setMessage]=useState<string|null>(null);const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({module_id:modules[0]?.id??"",student_id:"",component_name:"",score:"",weight:"",date:new Date().toISOString().slice(0,10),semester:String(academicPeriodForNcvLevel(modules[0]?.level)),published:true});
  const eligible=students.filter(s=>!form.module_id||!s.module_id||s.module_id===form.module_id);const moduleRecord=modules.find(m=>m.id===form.module_id);
  async function save(event:React.FormEvent){event.preventDefault();setBusy(true);setError(null);const row={student_id:form.student_id,module_id:form.module_id,subject_name:moduleRecord?.name??"General",lecturer_name:`${profile.name} ${profile.surname}`.trim(),component_name:form.component_name.trim(),component_score:Number(form.score),component_weight:Number(form.weight)||0,mark_status:form.published?"published":"captured",assessment_date:form.date,academic_year:new Date().getFullYear(),semester:Number(form.semester),published:form.published};const {data,error:e}=await createClient().from("icass_marks").insert(row).select().single();setBusy(false);if(e)return setError(e.message);setMarks(c=>[data as ICassMarkRecord,...c]);setForm({...form,student_id:"",component_name:"",score:"",weight:""});setMessage(form.published?"Mark published to the student iCAS screen.":"Mark saved as an unpublished capture.");}
  async function toggle(mark:ICassMarkRecord){const {error:e}=await createClient().from("icass_marks").update({published:!mark.published,mark_status:!mark.published?"published":"captured",updated_at:new Date().toISOString()}).eq("id",mark.id);if(e)return setError(e.message);setMarks(c=>c.map(x=>x.id===mark.id?{...x,published:!x.published}:x));}
  return <div className="space-y-6"><WorkspaceHeader eyebrow="Continuous assessment" title="iCAS marks" description="Capture marks against registered students and control exactly when results become visible in the student app." icon={GraduationCap}><div className="grid grid-cols-2 gap-3"><Metric label="Captured" value={marks.length}/><Metric label="Published" value={marks.filter(m=>m.published).length}/></div></WorkspaceHeader><StatusMessage message={message} error={error}/><div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]"><Card className="glass-card"><CardHeader><CardTitle>Capture a component</CardTitle></CardHeader><CardContent><form onSubmit={save} className="space-y-4"><Field label="Module"><select required className={inputClass} value={form.module_id} onChange={e=>setForm({...form,module_id:e.target.value,student_id:""})}>{modules.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></Field><Field label="Student"><select required className={inputClass} value={form.student_id} onChange={e=>setForm({...form,student_id:e.target.value})}><option value="">Select registered student</option>{eligible.map(s=><option key={`${s.student_id}-${s.module_id}`} value={s.student_id}>{s.student_number??""} {s.name} {s.surname}</option>)}</select></Field><Field label="Assessment component"><input required className={inputClass} value={form.component_name} onChange={e=>setForm({...form,component_name:e.target.value})} placeholder="Test 1"/></Field><div className="grid grid-cols-2 gap-4"><Field label="Score %"><input required min="0" max="100" type="number" className={inputClass} value={form.score} onChange={e=>setForm({...form,score:e.target.value})}/></Field><Field label="Weight %"><input min="0" max="100" type="number" className={inputClass} value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})}/></Field></div><label className="flex items-center gap-3 rounded-xl border border-border/70 bg-white/60 p-3 text-sm font-medium"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/>Publish to student immediately</label><Button className="h-11 w-full rounded-xl" disabled={busy||!modules.length}><CheckCircle2 className="h-4 w-4"/>{busy?"Saving…":"Save iCAS mark"}</Button></form></CardContent></Card><Card className="glass-card"><CardHeader><CardTitle>Recent marks</CardTitle></CardHeader><CardContent className="space-y-3">{marks.length===0?<Empty text="No iCAS marks have been captured for your modules."/>:marks.map(mark=><div key={mark.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-white/65 p-4"><div><p className="font-bold">{mark.component_name} · {mark.component_score??"—"}%</p><p className="mt-1 text-sm text-muted-foreground">{mark.subject_name} · Student {mark.student_id.slice(0,8)}</p></div><Button size="sm" variant={mark.published?"outline":"default"} onClick={()=>toggle(mark)}>{mark.published?"Unpublish":"Publish"}</Button></div>)}</CardContent></Card></div></div>;
}

export function OnlineClassesManager({ profile, modules, initialClasses }: { profile: Profile; modules: ModuleWithProgramme[]; initialClasses: OnlineClassRecord[] }) {
  const [classes,setClasses]=useState(initialClasses);const [error,setError]=useState<string|null>(null);const [message,setMessage]=useState<string|null>(null);const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({module_id:modules[0]?.id??"",topic:"",scheduled_at:"",url:"",duration:"60"});
  async function create(event:React.FormEvent){event.preventDefault();const youtubeUrl=canonicalYoutubeUrl(form.url);if(!youtubeUrl)return setError("Enter a valid YouTube video or Live URL.");if(!form.scheduled_at)return setError("Pick a start date and time.");setBusy(true);setError(null);const moduleRecord=modules.find(m=>m.id===form.module_id);const scheduled=new Date(form.scheduled_at);const row={module_id:form.module_id,module:moduleRecord?.code??moduleRecord?.name??"General",subject:moduleRecord?.name??"General",topic:form.topic.trim(),scheduled_at:scheduled.toISOString(),status:scheduled>new Date()?"upcoming":"live",lecturer_id:profile.id,lecturer:`${profile.name} ${profile.surname}`.trim(),url:youtubeUrl,duration_minutes:Number(form.duration)||60};const {data,error:e}=await createClient().from("online_classes").insert(row).select().single();setBusy(false);if(e)return setError(e.message);setClasses(c=>[...(c),data as OnlineClassRecord].sort((a,b)=>String(a.scheduled_at).localeCompare(String(b.scheduled_at))));setForm({...form,topic:"",scheduled_at:"",url:""});setMessage("YouTube class scheduled and visible in Online Classes.");}
  async function setStatus(item:OnlineClassRecord,status:string){const {error:e}=await createClient().from("online_classes").update({status}).eq("id",item.id);if(e)return setError(e.message);setClasses(c=>c.map(x=>x.id===item.id?{...x,status}:x));}
  async function remove(item:OnlineClassRecord){if(!confirm(`Delete “${item.topic}”?`))return;const {error:e}=await createClient().from("online_classes").delete().eq("id",item.id);if(e)return setError(e.message);setClasses(c=>c.filter(x=>x.id!==item.id));}
  return <div className="space-y-6"><WorkspaceHeader eyebrow="YouTube Live" title="Online classes" description="Schedule official YouTube Live sessions, move them live, and attach recordings without consuming video storage." icon={Radio}><div className="grid grid-cols-2 gap-3"><Metric label="Upcoming" value={classes.filter(c=>c.status==="upcoming").length}/><Metric label="Live now" value={classes.filter(c=>c.status==="live").length}/></div></WorkspaceHeader><StatusMessage message={message} error={error}/><div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><Card className="glass-card"><CardHeader><CardTitle>Schedule a YouTube class</CardTitle></CardHeader><CardContent><form onSubmit={create} className="space-y-4"><Field label="Module"><select required className={inputClass} value={form.module_id} onChange={e=>setForm({...form,module_id:e.target.value})}>{modules.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></Field><Field label="Topic"><input required className={inputClass} value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})}/></Field><Field label="Start date and time"><input required type="datetime-local" className={inputClass} value={form.scheduled_at} onChange={e=>setForm({...form,scheduled_at:e.target.value})}/></Field><Field label="YouTube Live URL"><input required type="url" className={inputClass} value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://youtube.com/live/…"/></Field><Button className="h-11 w-full rounded-xl" disabled={busy||!modules.length}><CalendarClock className="h-4 w-4"/>{busy?"Scheduling…":"Schedule class"}</Button></form></CardContent></Card><Card className="glass-card"><CardHeader><CardTitle>Class control room</CardTitle><CardDescription>Status changes update the student app.</CardDescription></CardHeader><CardContent className="space-y-3">{classes.length===0?<Empty text="No online classes scheduled."/>:classes.map(item=><div key={item.id} className="rounded-2xl border border-border/70 bg-white/65 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><p className="font-bold">{item.topic??"Untitled class"}</p><Badge variant={item.status==="live"?"success":"muted"}>{item.status??"upcoming"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.module} · {item.scheduled_at?new Date(item.scheduled_at).toLocaleString("en-ZA"):"TBA"}</p></div><Button size="sm" variant="outline" onClick={()=>window.open(item.url??"","_blank","noopener,noreferrer")}><ExternalLink className="h-4 w-4"/>YouTube</Button></div><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={()=>setStatus(item,"live")}>Go live</Button><Button size="sm" variant="outline" onClick={()=>setStatus(item,"recorded")}>Mark recorded</Button><Button size="icon" variant="outline" aria-label="Delete class" onClick={()=>remove(item)}><Trash2 className="h-4 w-4"/></Button></div></div>)}</CardContent></Card></div></div>;
}

export function MessagesManager({ profile, students, initialMessages, initialStudentId }: { profile: Profile; students: StudentRegistration[]; initialMessages: StaffMessageRecord[]; initialStudentId?: string }) {
  const uniqueStudents=useMemo(()=>Array.from(new Map(students.map(s=>[s.student_id,s])).values()),[students]);const [selected,setSelected]=useState(initialStudentId&&uniqueStudents.some(s=>s.student_id===initialStudentId)?initialStudentId:uniqueStudents[0]?.student_id??"");const [messages,setMessages]=useState(initialMessages);const [text,setText]=useState("");const [query,setQuery]=useState("");const [error,setError]=useState<string|null>(null);const [sending,setSending]=useState(false);const supabase=useMemo(()=>createClient(),[]);
  useEffect(()=>{const channel=supabase.channel(`staff-messages-${profile.id}`).on("postgres_changes",{event:"*",schema:"public",table:"messages"},async()=>{const {data}=await supabase.from("messages").select("id, sender_id, recipient_id, text, is_read, created_at").or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`).eq("is_deleted",false).order("created_at");if(data)setMessages(data as StaffMessageRecord[]);}).subscribe();return()=>{void supabase.removeChannel(channel)}},[profile.id,supabase]);
  const filteredStudents=uniqueStudents.filter(s=>`${s.name} ${s.surname} ${s.nickname??""} ${s.email}`.toLowerCase().includes(query.trim().toLowerCase()));const thread=messages.filter(m=>(m.sender_id===profile.id&&m.recipient_id===selected)||(m.sender_id===selected&&m.recipient_id===profile.id));const student=uniqueStudents.find(s=>s.student_id===selected);
  async function send(event:React.FormEvent){event.preventDefault();if(!text.trim()||!selected)return;setSending(true);setError(null);const {data,error:e}=await supabase.from("messages").insert({sender_id:profile.id,recipient_id:selected,text:text.trim(),message_type:"text"}).select("id, sender_id, recipient_id, text, is_read, created_at").single();setSending(false);if(e)return setError(e.message);setMessages(c=>[...c,data as StaffMessageRecord]);setText("");}
  return <div className="space-y-6"><WorkspaceHeader eyebrow="Direct support" title="Student messages" description="Message students registered in your modules. Replies appear here in real time and the same thread opens in the student app." icon={MessageSquareText}><Metric label="Students" value={uniqueStudents.length}/></WorkspaceHeader><StatusMessage error={error}/><div className="grid min-h-[620px] overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 shadow-[0_22px_70px_-38px_rgba(15,34,80,.45)] backdrop-blur-xl lg:grid-cols-[340px_1fr]"><aside className="border-b border-border/70 bg-slate-50/70 p-4 lg:border-b-0 lg:border-r"><div className="relative mb-4"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"/><input className={`${inputClass} pl-10`} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search students"/></div><div className="space-y-2">{filteredStudents.map(s=><button key={s.student_id} onClick={()=>setSelected(s.student_id)} className={`w-full rounded-2xl border p-3 text-left transition ${selected===s.student_id?"border-primary/30 bg-primary/10":"border-transparent hover:bg-white"}`}><p className="font-bold text-slate-900">{s.nickname??`${s.name} ${s.surname}`}</p><p className="mt-1 truncate text-xs text-muted-foreground">{s.module_name} · {s.email}</p></button>)}</div></aside><section className="flex min-h-[620px] flex-col"><header className="border-b border-border/70 bg-white/60 p-5"><p className="font-black text-slate-900">{student?student.nickname??`${student.name} ${student.surname}`:"Select a student"}</p><p className="text-sm text-muted-foreground">{student?.module_name??"Registered students only"}</p></header><div className="flex-1 space-y-3 overflow-y-auto p-5">{thread.length===0?<Empty text="No messages in this conversation yet."/>:thread.map(m=><div key={m.id} className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${m.sender_id===profile.id?"ml-auto bg-primary text-primary-foreground":"bg-slate-100 text-slate-800"}`}><p>{m.text}</p><p className={`mt-1 text-[10px] ${m.sender_id===profile.id?"text-primary-foreground/65":"text-muted-foreground"}`}>{new Date(m.created_at).toLocaleString("en-ZA")}</p></div>)}</div><form onSubmit={send} className="flex gap-3 border-t border-border/70 bg-white/60 p-4"><input disabled={!selected} className={inputClass} value={text} onChange={e=>setText(e.target.value)} placeholder="Write a professional message…"/><Button className="h-11 rounded-xl" disabled={sending||!selected||!text.trim()}><Send className="h-4 w-4"/><span className="sr-only">Send</span></Button></form></section></div></div>;
}

type AcademicRecord = SlideRecord | TimetableRecord | PastPaperRecord;

export function AcademicLibraryWorkspace({ profile, modules, slides, papers }: { profile: Profile; modules: ModuleWithProgramme[]; slides: SlideRecord[]; papers: PastPaperRecord[] }) {
  const [kind,setKind]=useState<"slides"|"papers">("slides");
  return <div className="space-y-5"><div role="tablist" aria-label="Academic document type" className="inline-flex rounded-2xl border border-border/70 bg-white/75 p-1.5 shadow-sm"><button role="tab" aria-selected={kind==="slides"} className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${kind==="slides"?"bg-primary text-primary-foreground shadow":"text-muted-foreground hover:text-foreground"}`} onClick={()=>setKind("slides")}>Lecture slides</button><button role="tab" aria-selected={kind==="papers"} className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${kind==="papers"?"bg-primary text-primary-foreground shadow":"text-muted-foreground hover:text-foreground"}`} onClick={()=>setKind("papers")}>Past papers</button></div><AcademicDocumentManager kind={kind} profile={profile} modules={modules} initialRecords={kind==="slides"?slides:papers}/></div>;
}

export function AcademicDocumentManager({ kind, profile, modules, initialRecords }: { kind:"slides"|"timetables"|"papers"; profile:Profile; modules:ModuleWithProgramme[]; initialRecords:AcademicRecord[] }) {
  const table=kind==="slides"?"lecture_slides":kind==="papers"?"past_papers":"timetables";const folder=kind==="slides"?"lecture-slides":kind==="papers"?"past-papers":"timetables";const [records,setRecords]=useState(initialRecords);const [file,setFile]=useState<File|null>(null);const [error,setError]=useState<string|null>(null);const [message,setMessage]=useState<string|null>(null);const [busy,setBusy]=useState(false);const [form,setForm]=useState({module_id:modules[0]?.id??"",title:"",group_name:"All groups",year:String(new Date().getFullYear()),exam_type:"Test 1",paper_type:"Paper 1"});
  useEffect(()=>{setRecords(initialRecords);setFile(null);setError(null);setMessage(null)},[initialRecords,kind]);
  async function upload(event:React.FormEvent){event.preventDefault();if(!file)return setError("Choose a PDF document first.");if(file.type!=="application/pdf")return setError("Only PDF documents are supported.");setBusy(true);setError(null);const safe=file.name.replace(/[^A-Za-z0-9._-]/g,"_");const path=`${folder}/${profile.id}/${Date.now()}_${safe}`;const supabase=createClient();const {error:uploadError}=await supabase.storage.from("academic-content").upload(path,file,{contentType:"application/pdf",upsert:false});if(uploadError){setBusy(false);return setError(uploadError.message)}const moduleRecord=modules.find(m=>m.id===form.module_id);const shared={level:moduleRecord?.level??null,subject:moduleRecord?.name??null,module_id:form.module_id,storage_path:path,url:null,created_by:profile.id};const row=kind==="slides"?{...shared,title:form.title.trim()}:kind==="papers"?{...shared,year:Number(form.year),exam_type:form.exam_type,paper_type:form.paper_type}:{title:form.title.trim(),level:moduleRecord?.level??null,programme:moduleRecord?.programmes?.name??profile.department,module:moduleRecord?.name??"All modules",module_id:form.module_id,group_name:form.group_name.trim()||"All groups",storage_path:path,url:null,created_by:profile.id};const {data,error:insertError}=await supabase.from(table).insert(row as never).select().single();setBusy(false);if(insertError){await supabase.storage.from("academic-content").remove([path]);return setError(insertError.message)}setRecords(c=>[data as AcademicRecord,...c]);setFile(null);setForm({...form,title:""});setMessage(`${kind==="slides"?"Slide deck":kind==="papers"?"Past paper":"Timetable"} published to registered students.`);}
  async function open(record:AcademicRecord){if(record.storage_path){const {data,error:e}=await createClient().storage.from("academic-content").createSignedUrl(record.storage_path,600);if(e)return setError(e.message);window.open(data.signedUrl,"_blank","noopener,noreferrer");return;}if(record.url){window.open(record.url,"_blank","noopener,noreferrer");return;}setError("This document has no file attached.");}
  async function remove(record:AcademicRecord){if(!confirm(`Delete “${record.title}”?`))return;const supabase=createClient();const {error:e}=await supabase.from(table).delete().eq("id",record.id);if(e)return setError(e.message);let cleanupWarning="";if(record.storage_path){const {error:storageError}=await supabase.storage.from("academic-content").remove([record.storage_path]);if(storageError)cleanupWarning=" The database record was removed, but storage cleanup needs administrator attention.";}setRecords(c=>c.filter(x=>x.id!==record.id));setMessage(`Document deleted.${cleanupWarning}`);}
  const slideMode=kind==="slides";const paperMode=kind==="papers";const title=slideMode?"Lecture slides":paperMode?"Past papers":"Timetable";return <div className="space-y-6"><WorkspaceHeader eyebrow="Academic content" title={title} description={slideMode?"Upload module-specific PDF decks that registered students can securely view and download.":paperMode?"Publish approved past examination papers directly to students registered for the selected module.":"Publish official PDF timetables by module and group for the student Timetable screen."} icon={slideMode?FileUp:paperMode?BookOpenCheck:CalendarClock}><Metric label="Published PDFs" value={records.length}/></WorkspaceHeader><StatusMessage message={message} error={error}/><div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><Card className="glass-card"><CardHeader><CardTitle>Upload PDF</CardTitle><CardDescription>Choose the module, academic year, exam type and paper number. The module and NCV level are filled in automatically.</CardDescription></CardHeader><CardContent><form onSubmit={upload} className="space-y-4"><Field label="Module"><select required className={inputClass} value={form.module_id} onChange={e=>setForm({...form,module_id:e.target.value})}>{modules.map(m=><option key={m.id} value={m.id}>{m.code?`${m.code} · `:""}{m.name}</option>)}</select></Field>{!paperMode&&<Field label={slideMode?"Deck title":"Timetable title"}><input required className={inputClass} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field>}{paperMode&&<div className="grid gap-3 sm:grid-cols-3"><Field label="Academic year"><input required min="2000" max="2100" type="number" className={inputClass} value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></Field><Field label="Exam type"><select className={inputClass} value={form.exam_type} onChange={e=>setForm({...form,exam_type:e.target.value})}>{["Test 1","Test 2","Test 3","Assignment 1","Assignment 2","ISAT","Internal exam","Final exam"].flatMap(type=>[type,`${type} (memo)`]).map(type=><option key={type} value={type}>{type}</option>)}</select></Field><Field label="Paper type"><select className={inputClass} value={form.paper_type} onChange={e=>setForm({...form,paper_type:e.target.value})}>{["Paper 1","Paper 2"].map(type=><option key={type} value={type}>{type}</option>)}</select></Field></div>}{!slideMode&&!paperMode&&<Field label="Group"><input className={inputClass} value={form.group_name} onChange={e=>setForm({...form,group_name:e.target.value})}/></Field>}<label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-7 text-center"><UploadCloud className="h-7 w-7 text-primary"/><span className="text-sm font-bold">{file?.name??"Choose PDF"}</span><span className="text-xs text-muted-foreground">PDF · Programme, module and NCV level filled automatically</span><input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={e=>{const chosen=e.target.files?.[0]??null;setFile(chosen);if(chosen&&!paperMode)setForm(current=>({...current,title:current.title||chosen.name.replace(/\.pdf$/i,"").replace(/[_-]+/g," ")}));}}/></label><Button className="h-11 w-full rounded-xl" disabled={busy||!modules.length}><UploadCloud className="h-4 w-4"/>{busy?"Uploading…":"Upload and publish"}</Button></form></CardContent></Card><Card className="glass-card"><CardHeader><CardTitle>Published library</CardTitle></CardHeader><CardContent className="space-y-3">{records.length===0?<Empty text={`No ${title.toLowerCase()} have been published for your modules.`}/>:records.map(record=><div key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-white/65 p-4"><div><p className="font-bold">{"paper_type" in record?(record.paper_type??"Paper 1"):(record.title??"Untitled PDF")}</p><p className="mt-1 text-sm text-muted-foreground">{"subject" in record?(record.subject??record.modules?.name??"Module"):(record.module??"All modules")}{"exam_type" in record&&record.exam_type?` · ${record.exam_type}${"paper_type" in record?` · ${record.paper_type??"Paper 1"}`:""}${record.year?` · ${record.year}`:""}`:""}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>open(record)}><ExternalLink className="h-4 w-4"/>Open</Button><Button size="icon" variant="outline" aria-label={`Delete ${title.toLowerCase()} PDF`} onClick={()=>remove(record)}><Trash2 className="h-4 w-4"/></Button></div></div>)}</CardContent></Card></div></div>;
}

export function StudentDirectory({ students }: { students: StudentRegistration[] }) {
  const [query,setQuery]=useState("");
  const grouped=Array.from(students.reduce<Map<string,{student:StudentRegistration;registrations:StudentRegistration[]}>>((map,item)=>{
    const current=map.get(item.student_id);
    if(current) current.registrations.push(item); else map.set(item.student_id,{student:item,registrations:[item]});
    return map;
  },new Map()).values());
  const filtered=grouped.filter(({student,registrations})=>`${student.name} ${student.surname} ${student.nickname??""} ${student.email} ${registrations.map(item=>`${item.module_code??""} ${item.module_name}`).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-6"><WorkspaceHeader eyebrow="Teaching roster" title="My students" description="A live, registration-backed roster for your assigned modules with direct access to staff messaging." icon={Users}><Metric label="Registered" value={grouped.length}/></WorkspaceHeader><Card className="glass-card"><CardHeader><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Student directory</CardTitle><CardDescription>Every active module registration is shown without duplicating the student.</CardDescription></div><div className="relative"><Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3.5"/><input className={`${inputClass} min-w-72 pl-10`} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, email or module"/></div></div></CardHeader><CardContent>{filtered.length===0?<Empty text="No registered students match this search."/>:<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map(({student,registrations})=><div key={student.student_id} className="rounded-2xl border border-border/70 bg-white/65 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-900">{student.nickname??`${student.name} ${student.surname}`}</p><p className="mt-1 text-sm text-muted-foreground">{student.email}</p></div><Badge variant="muted">{student.level??"Level"}</Badge></div><div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-muted-foreground">{registrations.map(item=><div key={`${item.module_id}-${item.academic_year}-${item.semester}`}><p className="font-bold text-slate-700">{item.module_code?`${item.module_code} · `:""}{item.module_name}</p><p className="mt-0.5">{item.campus??"Campus not set"} · {item.academic_year} · {ncvLevelLabel(item.semester)}</p></div>)}</div><Button asChild size="sm" className="mt-4 w-full"><Link href={`/dashboard/messages?student=${student.student_id}`}><MessageSquareText className="h-4 w-4"/>Message student</Link></Button></div>)}</div>}</CardContent></Card></div>;
}

function Metric({label,value}:{label:string;value:number|string}){return <div className="min-w-28 rounded-2xl border border-white/65 bg-white/70 px-4 py-3 backdrop-blur"><p className="text-2xl font-black tabular-nums text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">{label}</span>{children}</label>}
function Empty({text}:{text:string}){return <div className="rounded-2xl border border-dashed border-border bg-slate-50/70 p-8 text-center text-sm text-muted-foreground">{text}</div>}
