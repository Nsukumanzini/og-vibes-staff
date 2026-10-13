"use client";

import { useState } from "react";
import { CalendarClock, Download, ExternalLink, FileUp, Link2, MonitorPlay, Radio, Save, Video } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { ModuleWithProgramme, OnlineClassRecord, Profile } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";

const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const safeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, "_");
const localInput = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
function youtubeUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return false;
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return (url.pathname.split("/").filter(Boolean)[0]?.length ?? 0) >= 6;
    if (host !== "youtube.com" && !host.endsWith(".youtube.com")) return false;
    const videoId = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:live|embed|shorts)\/([^/?]+)/)?.[1];
    return Boolean(videoId && videoId.length >= 6);
  } catch { return false; }
}

export function OnlineClassWorkspace({ profile, modules, initialClasses }: { profile: Profile; modules: ModuleWithProgramme[]; initialClasses: OnlineClassRecord[] }) {
  const supabase = createClient();
  const [classes, setClasses] = useState(initialClasses);
  const [selectedId, setSelectedId] = useState(initialClasses[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [resource, setResource] = useState<File | null>(null);
  const [form, setForm] = useState({ moduleId: modules[0]?.id ?? "", topic: "", scheduledAt: "", duration: "60", liveUrl: "" });
  const [recordingUrl, setRecordingUrl] = useState("");
  const [classDetails, setClassDetails] = useState({ topic: initialClasses[0]?.topic ?? "", scheduledAt: localInput(initialClasses[0]?.scheduled_at ?? null), duration: String(initialClasses[0]?.duration_minutes ?? 60), liveUrl: initialClasses[0]?.url ?? "" });
  const selected = classes.find((item) => item.id === selectedId) ?? null;

  async function scheduleClass() {
    // The variable represents an academic module, not Node's module object.
    // eslint-disable-next-line @next/next/no-assign-module-variable
    const module = modules.find((item) => item.id === form.moduleId);
    if (!module || !form.topic.trim() || !form.scheduledAt || !youtubeUrl(form.liveUrl)) return setNotice("Choose a module, topic, date and a valid YouTube Live URL.");
    setBusy(true); setNotice("");
    const payload = { module_id: module.id, module: module.code || module.name, subject: module.name, topic: form.topic.trim(), scheduled_at: new Date(form.scheduledAt).toISOString(), duration_minutes: Number(form.duration) || 60, status: "upcoming", lecturer_id: profile.id, lecturer: `${profile.name} ${profile.surname}`.trim(), url: form.liveUrl.trim() };
    const { data, error } = await supabase.from("online_classes").insert(payload).select("id, module_id, module, subject, topic, scheduled_at, status, lecturer, lecturer_id, url, resource_title, resource_url, resource_storage_path, resource_file_name, resource_mime_type, resource_file_size_bytes, recording_url, duration_minutes, created_at").single();
    setBusy(false); if (error) return setNotice(error.message); setClasses((current) => [...current, data as OnlineClassRecord].sort((a,b)=>new Date(a.scheduled_at??0).getTime()-new Date(b.scheduled_at??0).getTime())); setSelectedId(data.id); setForm((current)=>({...current,topic:"",scheduledAt:"",liveUrl:""})); setNotice("Online class scheduled for registered students.");
  }

  async function updateStatus(status: string) {
    if (!selected) return; const { error }=await supabase.from("online_classes").update({status}).eq("id",selected.id); if(error)return setNotice(error.message);setClasses((current)=>current.map((item)=>item.id===selected.id?{...item,status}:item));setNotice(status==="live"?"Class is now live in the student app.":"Class status updated.");
  }

  function chooseClass(item: OnlineClassRecord) {
    setSelectedId(item.id); setRecordingUrl(item.recording_url ?? "");
    setClassDetails({ topic: item.topic ?? "", scheduledAt: localInput(item.scheduled_at), duration: String(item.duration_minutes ?? 60), liveUrl: item.url ?? "" });
  }

  async function saveClassDetails() {
    if (!selected || !classDetails.topic.trim() || !classDetails.scheduledAt || !youtubeUrl(classDetails.liveUrl)) return setNotice("Enter a topic, schedule and valid YouTube video or live link.");
    const duration = Number(classDetails.duration); if (!Number.isFinite(duration) || duration < 10) return setNotice("Class duration must be at least 10 minutes.");
    setBusy(true); const payload = { topic: classDetails.topic.trim(), scheduled_at: new Date(classDetails.scheduledAt).toISOString(), duration_minutes: duration, url: classDetails.liveUrl.trim() };
    const { error } = await supabase.from("online_classes").update(payload).eq("id", selected.id); setBusy(false);
    if (error) return setNotice(error.message); setClasses((current) => current.map((item) => item.id === selected.id ? { ...item, ...payload } : item)); setNotice("Class details updated for registered students.");
  }

  async function uploadResource() {
    if (!selected || !resource) return; if(resource.size>50*1024*1024)return setNotice("Class resources must be 50 MB or smaller."); setBusy(true); setNotice("");
    const path=`${profile.id}/classes/${selected.id}/${Date.now()}_${safeName(resource.name)}`;
    const {error:uploadError}=await supabase.storage.from("class-resources").upload(path,resource,{contentType:resource.type||"application/octet-stream"});
    if(uploadError){setBusy(false);return setNotice(uploadError.message);} const payload={resource_title:resource.name,resource_storage_path:path,resource_file_name:resource.name,resource_mime_type:resource.type||null,resource_file_size_bytes:resource.size,resource_url:null}; const {error}=await supabase.from("online_classes").update(payload).eq("id",selected.id);setBusy(false);if(error){await supabase.storage.from("class-resources").remove([path]);return setNotice(error.message);}if(selected.resource_storage_path)await supabase.storage.from("class-resources").remove([selected.resource_storage_path]);setClasses((current)=>current.map((item)=>item.id===selected.id?{...item,...payload}:item));setResource(null);setNotice("Class resource uploaded and linked to the session.");
  }

  async function saveRecording() {
    if(!selected)return; if(recordingUrl.trim()&&!youtubeUrl(recordingUrl))return setNotice("Enter a valid YouTube recording URL.");const value=recordingUrl.trim()||null;const {error}=await supabase.from("online_classes").update({recording_url:value}).eq("id",selected.id);if(error)return setNotice(error.message);setClasses((current)=>current.map((item)=>item.id===selected.id?{...item,recording_url:value}:item));setNotice(value?"Recording published to registered students.":"Recording removed.");
  }

  async function openResource() { if(!selected?.resource_storage_path)return;const {data,error}=await supabase.storage.from("class-resources").createSignedUrl(selected.resource_storage_path,120);if(error)return setNotice(error.message);window.open(data.signedUrl,"_blank","noopener,noreferrer"); }

  return <div className="space-y-6"><header className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#071834,#0757c8_56%,#06a7be)] p-7 text-white shadow-2xl shadow-blue-900/20"><div className="flex items-center gap-4"><span className="rounded-2xl bg-white/15 p-3 backdrop-blur"><MonitorPlay className="h-7 w-7"/></span><div><p className="text-xs font-black uppercase tracking-[.22em] text-cyan-200">YouTube Live classroom</p><h1 className="text-3xl font-black">Live classes & recordings</h1><p className="mt-1 text-sm text-blue-100">Schedule the stream, distribute resources and publish the replay from one workspace.</p></div></div></header>{notice&&<div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{notice}</div>}<section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Schedule a live class</h2><p className="mt-1 text-sm text-slate-500">Create the stream in YouTube Studio, then paste its share link here.</p><div className="mt-5 space-y-3"><select className={field} value={form.moduleId} onChange={(e)=>setForm({...form,moduleId:e.target.value})}>{modules.map((module)=><option key={module.id} value={module.id}>{module.code?`${module.code} · `:""}{module.name}</option>)}</select><input className={field} placeholder="Class topic" value={form.topic} onChange={(e)=>setForm({...form,topic:e.target.value})}/><div className="grid grid-cols-[1fr_110px] gap-2"><input className={field} type="datetime-local" value={form.scheduledAt} onChange={(e)=>setForm({...form,scheduledAt:e.target.value})}/><input className={field} type="number" min="10" placeholder="Minutes" value={form.duration} onChange={(e)=>setForm({...form,duration:e.target.value})}/></div><label className="relative block"><Link2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input className={`${field} pl-10`} type="url" placeholder="YouTube Live share link" value={form.liveUrl} onChange={(e)=>setForm({...form,liveUrl:e.target.value})}/></label><Button className="w-full rounded-xl" onClick={scheduleClass} disabled={busy}><CalendarClock/>{busy?"Scheduling…":"Schedule class"}</Button></div></div><div className="space-y-3"><h2 className="px-1 text-xl font-black">Class schedule</h2>{classes.map((item)=><button key={item.id} onClick={()=>chooseClass(item)} className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition ${selectedId===item.id?"border-blue-500 ring-4 ring-blue-50":"border-slate-200 hover:border-blue-200"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-blue-600">{item.module}</p><h3 className="mt-1 text-lg font-black text-slate-950">{item.topic||"Online class"}</h3><p className="mt-1 text-sm text-slate-500">{item.scheduled_at?new Date(item.scheduled_at).toLocaleString():"Date not set"} · {item.duration_minutes??60} min</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${item.status==="live"?"bg-rose-100 text-rose-700":item.status==="completed"?"bg-emerald-100 text-emerald-700":"bg-blue-100 text-blue-700"}`}>{item.status||"upcoming"}</span></div></button>)}</div></section>{selected&&<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-blue-600">Class control room</p><h2 className="text-2xl font-black">{selected.topic}</h2></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>window.open(selected.url??"","_blank","noopener,noreferrer")} disabled={!selected.url}><ExternalLink/> Open live stream</Button><Button variant={selected.status==="live"?"outline":"default"} onClick={()=>updateStatus(selected.status==="live"?"completed":"live")}><Radio/>{selected.status==="live"?"End class":"Go live"}</Button></div></div><div className="mt-6 grid gap-5 xl:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-5"><div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-blue-600"/><h3 className="font-black">Session details</h3></div><div className="mt-3 space-y-2"><input className={field} value={classDetails.topic} onChange={(e)=>setClassDetails({...classDetails,topic:e.target.value})} placeholder="Class topic"/><input className={field} type="datetime-local" value={classDetails.scheduledAt} onChange={(e)=>setClassDetails({...classDetails,scheduledAt:e.target.value})}/><input className={field} type="number" min="10" value={classDetails.duration} onChange={(e)=>setClassDetails({...classDetails,duration:e.target.value})} placeholder="Minutes"/><input className={field} type="url" value={classDetails.liveUrl} onChange={(e)=>setClassDetails({...classDetails,liveUrl:e.target.value})} placeholder="YouTube link"/><Button className="w-full" variant="outline" onClick={saveClassDetails} disabled={busy}><Save/> Save details</Button></div></div><div className="rounded-2xl bg-slate-50 p-5"><div className="flex items-center gap-2"><FileUp className="h-5 w-5 text-blue-600"/><h3 className="font-black">Class resource</h3></div><p className="mt-1 text-xs leading-5 text-slate-500">Upload notes, slides, worksheets, media or another supporting file up to 50 MB.</p>{selected.resource_storage_path&&<button onClick={openResource} className="mt-3 flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm"><Download className="h-4 w-4 text-blue-600"/><span className="min-w-0 flex-1 truncate text-sm font-bold">{selected.resource_file_name||selected.resource_title}</span></button>}<label className="mt-3 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 text-sm font-bold text-blue-700"><FileUp className="h-4 w-4"/>{resource?.name||"Choose resource"}<input type="file" className="sr-only" onChange={(e)=>setResource(e.target.files?.[0]??null)}/></label><Button className="mt-2 w-full" variant="outline" disabled={!resource||busy} onClick={uploadResource}>Upload resource</Button></div><div className="rounded-2xl bg-slate-50 p-5"><div className="flex items-center gap-2"><Video className="h-5 w-5 text-blue-600"/><h3 className="font-black">Class recording</h3></div><p className="mt-1 text-xs leading-5 text-slate-500">After the livestream ends, publish its YouTube replay link for registered students.</p><input className={`${field} mt-3`} type="url" placeholder="YouTube recording URL" value={recordingUrl} onChange={(e)=>setRecordingUrl(e.target.value)}/><Button className="mt-2 w-full" variant="outline" onClick={saveRecording}><Save/> Save recording</Button>{selected.recording_url&&<button onClick={()=>window.open(selected.recording_url!,"_blank","noopener,noreferrer")} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-700">Watch recording <ExternalLink className="h-3.5 w-3.5"/></button>}</div></div></section>}</div>;
}
