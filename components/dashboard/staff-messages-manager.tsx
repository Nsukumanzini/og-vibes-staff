"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck, Download, FileText, ImageIcon, Paperclip, Search, Send, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Profile, StaffMessageRecord, StudentRegistration } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";

function nameOf(student: StudentRegistration) { return student.nickname?.trim() || `${student.name} ${student.surname}`.trim() || student.email; }
function safeFileName(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, "_"); }
function messageType(mime: string): StaffMessageRecord["message_type"] { if (mime.startsWith("image/")) return "image"; if (mime.startsWith("video/")) return "video"; if (mime.startsWith("audio/")) return "audio"; return "document"; }

export function StaffMessagesManager({ profile, students, initialMessages, initialStudentId }: { profile: Profile; students: StudentRegistration[]; initialMessages: StaffMessageRecord[]; initialStudentId?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const uniqueStudents = useMemo(() => Array.from(new Map(students.map((student) => [student.student_id, student])).values()), [students]);
  const [selectedId, setSelectedId] = useState(initialStudentId && uniqueStudents.some((item) => item.student_id === initialStudentId) ? initialStudentId : uniqueStudents[0]?.student_id ?? "");
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const selected = uniqueStudents.find((student) => student.student_id === selectedId);
  const conversation = messages.filter((message) => (message.sender_id === profile.id && message.recipient_id === selectedId) || (message.sender_id === selectedId && message.recipient_id === profile.id));
  const visibleStudents = uniqueStudents.filter((student) => `${nameOf(student)} ${student.email}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const channel = supabase.channel(`staff-messages-${profile.id}`).on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${profile.id}` }, (payload) => {
      const row = payload.new as StaffMessageRecord;
      if (!row?.id) return;
      setMessages((current) => current.some((message) => message.id === row.id) ? current.map((message) => message.id === row.id ? row : message) : [...current, row]);
    }).on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `sender_id=eq.${profile.id}` }, (payload) => {
      const row = payload.new as StaffMessageRecord;
      setMessages((current) => current.map((message) => message.id === row.id ? row : message));
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profile.id, supabase]);

  useEffect(() => {
    if (!selectedId) return;
    const unread = messages.filter((message) => message.sender_id === selectedId && message.recipient_id === profile.id && !message.is_read).map((message) => message.id);
    if (unread.length) {
      void supabase.from("messages").update({ is_read: true, read_at: new Date().toISOString() }).in("id", unread).then(({ error }) => {
        if (!error) setMessages((current) => current.map((message) => unread.includes(message.id) ? { ...message, is_read: true, read_at: new Date().toISOString() } : message));
      });
    }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, profile.id, selectedId, supabase]);

  async function sendMessage() {
    if (!selectedId || (!draft.trim() && !file)) return;
    if (file && file.size > 25 * 1024 * 1024) return setNotice("Attachments must be 25 MB or smaller.");
    setBusy(true); setNotice("");
    let uploadedPath: string | null = null;
    try {
      if (file) {
        uploadedPath = `${profile.id}/${selectedId}/${Date.now()}_${safeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage.from("chat-media").upload(uploadedPath, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (uploadError) throw uploadError;
      }
      const payload = { sender_id: profile.id, recipient_id: selectedId, text: draft.trim(), message_type: file ? messageType(file.type) : "text", attachment_url: uploadedPath, attachment_name: file?.name ?? null, attachment_mime: file?.type || null, attachment_size: file?.size ?? null };
      const { data, error } = await supabase.from("messages").insert(payload).select("id, sender_id, recipient_id, text, message_type, attachment_url, attachment_name, attachment_mime, attachment_size, is_read, delivered_at, read_at, created_at").single();
      if (error) throw error;
      setMessages((current) => [...current, data as StaffMessageRecord]); setDraft(""); setFile(null);
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("chat-media").remove([uploadedPath]);
      setNotice(error instanceof Error ? error.message : "Message could not be sent.");
    } finally { setBusy(false); }
  }

  async function openAttachment(message: StaffMessageRecord) {
    if (!message.attachment_url) return;
    const { data, error } = await supabase.storage.from("chat-media").createSignedUrl(message.attachment_url, 120);
    if (error) return setNotice(error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return <div className="grid min-h-[calc(100vh-9rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/40 lg:grid-cols-[330px_1fr]">
    <aside className="border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r"><div className="bg-[linear-gradient(135deg,#071b3c,#0b5bd3)] p-5 text-white"><div className="flex items-center gap-3"><span className="rounded-xl bg-white/15 p-2"><Users className="h-5 w-5"/></span><div><p className="font-black">Student messages</p><p className="text-xs text-blue-100">{uniqueStudents.length} registered students</p></div></div><label className="mt-4 flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2 backdrop-blur"><Search className="h-4 w-4 text-blue-100"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-blue-100/70"/></label></div><div className="max-h-[70vh] overflow-y-auto p-2">{visibleStudents.map((student) => { const unread = messages.filter((message) => message.sender_id === student.student_id && !message.is_read).length; const latest = messages.filter((message) => message.sender_id === student.student_id || message.recipient_id === student.student_id).at(-1); return <button key={student.student_id} onClick={() => setSelectedId(student.student_id)} className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selectedId === student.student_id ? "bg-white shadow-sm ring-1 ring-blue-100" : "hover:bg-white"}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 font-black text-blue-700">{nameOf(student).charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{nameOf(student)}</span><span className="block truncate text-xs text-slate-500">{latest?.attachment_name || latest?.text || student.module_code || student.module_name}</span></span>{unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white">{unread}</span>}</button>})}</div></aside>
    <section className="flex min-h-[650px] flex-col bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,.09),transparent_34%),#f8fafc]">{selected ? <><header className="flex items-center gap-3 border-b border-slate-200 bg-white/85 px-5 py-4 backdrop-blur"><span className="grid h-11 w-11 place-items-center rounded-full bg-blue-600 font-black text-white">{nameOf(selected).charAt(0).toUpperCase()}</span><div><h1 className="font-black text-slate-950">{nameOf(selected)}</h1><p className="text-xs text-slate-500">{selected.module_code ? `${selected.module_code} · ` : ""}{selected.email}</p></div></header><div className="flex-1 space-y-3 overflow-y-auto p-5">{conversation.map((message) => { const mine = message.sender_id === profile.id; return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${mine ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md bg-white text-slate-900"}`}>{message.attachment_url && <button onClick={() => openAttachment(message)} className={`mb-2 flex w-full items-center gap-3 rounded-xl p-3 text-left ${mine ? "bg-white/15" : "bg-slate-100"}`}>{message.message_type === "image" ? <ImageIcon className="h-5 w-5"/> : <FileText className="h-5 w-5"/>}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{message.attachment_name || "Attachment"}</span><span className="text-[11px] opacity-70">{message.attachment_size ? `${(message.attachment_size / 1024 / 1024).toFixed(1)} MB` : "Open attachment"}</span></span><Download className="h-4 w-4"/></button>}{message.text && <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>}<div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-blue-100" : "text-slate-400"}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine && (message.is_read ? <CheckCheck className="h-3.5 w-3.5 text-cyan-200"/> : <Check className="h-3.5 w-3.5"/>)}</div></div></div>})}<div ref={endRef}/></div><footer className="border-t border-slate-200 bg-white p-4">{file && <div className="mb-2 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-sm"><span className="truncate font-semibold text-blue-800">{file.name}</span><button onClick={() => setFile(null)} className="text-xs font-bold text-blue-700">Remove</button></div>}{notice && <p className="mb-2 text-xs font-semibold text-rose-600">{notice}</p>}<div className="flex items-end gap-2"><label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50" title="Attach a file"><Paperclip className="h-5 w-5"/><input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)}/></label><textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} rows={1} placeholder="Write a message" className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/><Button onClick={sendMessage} disabled={busy || (!draft.trim() && !file)} className="h-11 w-11 rounded-xl p-0" aria-label="Send message"><Send className="h-5 w-5"/></Button></div></footer></> : <div className="grid flex-1 place-items-center p-8 text-center"><div><Users className="mx-auto h-12 w-12 text-slate-300"/><h1 className="mt-4 text-xl font-black">Choose a student</h1><p className="mt-1 text-sm text-slate-500">Select a registered student to start a secure conversation.</p></div></div>}</section>
  </div>;
}
