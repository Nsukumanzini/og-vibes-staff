"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenCheck,
  Download,
  FileText,
  Image as ImageIcon,
  MessageSquareText,
  Paperclip,
  Plus,
  Save,
  Send,
  Users,
  Video,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type {
  ModuleGroupMessageRecord,
  ModuleGroupRecord,
  ModuleWithProgramme,
  Profile,
} from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const inputClass =
  "h-11 w-full rounded-xl border border-border/80 bg-background/85 px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function senderName(message: ModuleGroupMessageRecord, ownId: string) {
  if (message.sender_id === ownId) return "You";
  return message.profiles?.nickname
    ?? `${message.profiles?.name ?? "Student"} ${message.profiles?.surname ?? ""}`.trim();
}

function attachmentType(file: File): ModuleGroupMessageRecord["message_type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function AttachmentIcon({ type }: { type: ModuleGroupMessageRecord["message_type"] }) {
  if (type === "image") return <ImageIcon className="h-4 w-4" />;
  if (type === "video") return <Video className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function ModuleGroupChatManager({
  profile,
  modules,
  initialGroups,
  initialMessages,
}: {
  profile: Profile;
  modules: ModuleWithProgramme[];
  initialGroups: ModuleGroupRecord[];
  initialMessages: ModuleGroupMessageRecord[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [groups, setGroups] = useState(initialGroups);
  const [messages, setMessages] = useState(initialMessages);
  const [selectedId, setSelectedId] = useState(initialGroups[0]?.id ?? "");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    module_id: modules[0]?.id ?? "",
    name: "",
    description: "",
  });
  const [groupDraft, setGroupDraft] = useState({ name: initialGroups[0]?.name ?? "", description: initialGroups[0]?.description ?? "" });
  const endRef = useRef<HTMLDivElement | null>(null);

  const selected = groups.find((group) => group.id === selectedId) ?? null;
  const thread = messages.filter((message) => message.group_id === selectedId);

  function chooseGroup(group: ModuleGroupRecord) {
    setSelectedId(group.id);
    setGroupDraft({ name: group.name, description: group.description ?? "" });
  }

  const loadGroups = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("group_chats")
      .select("id, name, description, member_count, created_by, created_at, updated_at, module_id, group_kind, accent_color, modules!group_chats_module_id_fkey(name, code, level)")
      .eq("group_kind", "module")
      .eq("created_by", profile.id)
      .order("updated_at", { ascending: false });
    if (queryError) throw queryError;
    const normalized = (data ?? []).map((group) => ({
      ...group,
      modules: Array.isArray(group.modules) ? group.modules[0] ?? null : group.modules,
    })) as ModuleGroupRecord[];
    setGroups(normalized);
    return normalized;
  }, [profile.id, supabase]);

  const loadMessages = useCallback(async (groupId: string) => {
    const { data, error: queryError } = await supabase
      .from("group_messages")
      .select("id, group_id, sender_id, text, message_type, attachment_url, attachment_name, attachment_mime, created_at, is_deleted")
      .eq("group_id", groupId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(500);
    if (queryError) throw queryError;
    const rows = (data ?? []) as Omit<ModuleGroupMessageRecord, "profiles">[];
    const ids = [...new Set(rows.map((message) => message.sender_id))];
    const profileMap = new Map<string, ModuleGroupMessageRecord["profiles"]>();
    if (ids.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, surname, nickname, photo_url")
        .in("id", ids);
      if (profileError) throw profileError;
      for (const item of profileRows ?? []) profileMap.set(item.id, item);
    }
    const hydrated = rows.map((message) => ({
      ...message,
      profiles: profileMap.get(message.sender_id) ?? null,
    }));
    setMessages((current) => [
      ...current.filter((message) => message.group_id !== groupId),
      ...hydrated,
    ]);
  }, [supabase]);

  useEffect(() => {
    if (!selectedId) return;
    void loadMessages(selectedId).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Could not refresh this group.");
    });
    const channel = supabase
      .channel(`staff-module-group-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_messages", filter: `group_id=eq.${selectedId}` },
        () => void loadMessages(selectedId),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "group_chats", filter: `id=eq.${selectedId}` },
        () => void loadGroups(),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadGroups, loadMessages, selectedId, supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length, selectedId]);

  async function createGroup(event: React.FormEvent) {
    event.preventDefault();
    if (!form.module_id || !form.name.trim()) return;
    setCreating(true);
    setError(null);
    setNotice(null);
    const { data, error: insertError } = await supabase
      .from("group_chats")
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        created_by: profile.id,
        visibility: "private",
        category: "class",
        accent_color: "#2563EB",
        group_kind: "module",
        module_id: form.module_id,
      })
      .select("id")
      .single();
    setCreating(false);
    if (insertError) return setError(insertError.message);
    const refreshed = await loadGroups();
    setSelectedId(data.id);
    setForm((current) => ({ ...current, name: "", description: "" }));
    const group = refreshed.find((item) => item.id === data.id);
    setNotice(`${group?.name ?? "Module group"} created. Active registered students were added automatically.`);
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || (!text.trim() && !file)) return;
    if (file && file.size > MAX_FILE_BYTES) {
      return setError("Attachments must be 25 MB or smaller.");
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    let uploadedPath: string | null = null;
    try {
      let type: ModuleGroupMessageRecord["message_type"] = "text";
      if (file) {
        type = attachmentType(file);
        const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
        uploadedPath = `${selected.id}/${profile.id}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("group-media")
          .upload(uploadedPath, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (uploadError) throw uploadError;
      }
      const { error: sendError } = await supabase.from("group_messages").insert({
        group_id: selected.id,
        sender_id: profile.id,
        text: text.trim(),
        message_type: type,
        attachment_url: uploadedPath,
        attachment_name: file?.name ?? null,
        attachment_mime: file?.type || null,
        metadata: { source: "staff_portal", module_id: selected.module_id },
      });
      if (sendError) throw sendError;
      setText("");
      setFile(null);
      await loadMessages(selected.id);
      await loadGroups();
    } catch (reason) {
      if (uploadedPath) await supabase.storage.from("group-media").remove([uploadedPath]);
      setError(reason instanceof Error ? reason.message : "The message could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function saveGroup() {
    if (!selected || !groupDraft.name.trim()) return setError("Enter a professional group name.");
    const payload = { name: groupDraft.name.trim(), description: groupDraft.description.trim() || null, updated_at: new Date().toISOString() };
    const { error: updateError } = await supabase.from("group_chats").update(payload).eq("id", selected.id);
    if (updateError) return setError(updateError.message);
    setGroups((current) => current.map((group) => group.id === selected.id ? { ...group, ...payload } : group));
    setNotice("Group details updated for registered students."); setError(null);
  }

  async function openAttachment(message: ModuleGroupMessageRecord) {
    if (!message.attachment_url) return;
    const { data, error: signedError } = await supabase.storage
      .from("group-media")
      .createSignedUrl(message.attachment_url, 600);
    if (signedError) return setError(signedError.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <section className="hero-panel overflow-hidden rounded-[2rem] border border-white/50 p-6 shadow-[0_24px_80px_-38px_rgba(15,34,80,.45)] sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-primary">
              <BookOpenCheck className="h-4 w-4" /> Module communication
            </div>
            <h1 className="text-3xl font-black tracking-[-.035em] text-slate-950 sm:text-4xl">Module group chats</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Create private teaching groups. Only active students registered for the selected module are enrolled and allowed to read messages or files.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric value={groups.length} label="Groups" />
            <Metric value={groups.reduce((total, group) => total + (group.member_count ?? 0), 0)} label="Memberships" />
          </div>
        </div>
      </section>

      {(error || notice) && (
        <div role="status" aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader><CardTitle>Create a module group</CardTitle><CardDescription>Membership stays synchronized with active registrations.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={createGroup} className="space-y-4">
                <Field label="Module">
                  <select required className={inputClass} value={form.module_id} onChange={(event) => setForm({ ...form, module_id: event.target.value })}>
                    <option value="">Select a module</option>
                    {modules.map((module) => <option key={module.id} value={module.id}>{module.code ? `${module.code} · ` : ""}{module.name}</option>)}
                  </select>
                </Field>
                <Field label="Group name"><input required maxLength={80} className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Business Management · Class Group" /></Field>
                <Field label="Purpose"><textarea maxLength={500} className={`${inputClass} min-h-24 py-3`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Official discussions, resources and class updates." /></Field>
                <Button className="h-11 w-full rounded-xl" disabled={creating || modules.length === 0}><Plus className="h-4 w-4" />{creating ? "Creating…" : "Create private group"}</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle>Your groups</CardTitle><CardDescription>Select a group to open its live conversation.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {groups.length === 0 ? <Empty text="No module groups yet." /> : groups.map((group) => (
                <button key={group.id} type="button" onClick={() => chooseGroup(group)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === group.id ? "border-primary/35 bg-primary/10 shadow-sm" : "border-border/70 bg-white/65 hover:border-primary/20"}`}>
                  <div className="flex items-start justify-between gap-3"><p className="font-black text-slate-900">{group.name}</p><Badge variant="muted"><Users className="mr-1 h-3 w-3" />{group.member_count ?? 0}</Badge></div>
                  <p className="mt-1 text-xs font-semibold text-primary">{group.modules?.code ? `${group.modules.code} · ` : ""}{group.modules?.name ?? "Module"}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{group.description || "Official module conversation"}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card overflow-hidden">
          <CardHeader className="border-b border-border/70 bg-white/55">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><CardTitle>{selected?.name ?? "Choose a module group"}</CardTitle><CardDescription>{selected ? `${selected.modules?.name ?? "Module"} · ${selected.member_count ?? 0} members` : "Create or select a group to start messaging."}</CardDescription></div>
              {selected && <Badge variant="success">Registered students only</Badge>}
            </div>
          </CardHeader>
          <CardContent className="flex min-h-[660px] flex-col p-0">
            {selected && <div className="grid gap-2 border-b border-border/70 bg-slate-50/80 p-4 sm:grid-cols-[1fr_1.4fr_auto]"><input className={inputClass} maxLength={80} value={groupDraft.name} onChange={(event)=>setGroupDraft({...groupDraft,name:event.target.value})} aria-label="Group name"/><input className={inputClass} maxLength={500} value={groupDraft.description} onChange={(event)=>setGroupDraft({...groupDraft,description:event.target.value})} aria-label="Group purpose" placeholder="Group purpose"/><Button type="button" variant="outline" onClick={saveGroup}><Save className="h-4 w-4"/> Save group</Button></div>}
            <div className="flex-1 space-y-3 overflow-y-auto p-5 sm:p-6">
              {!selected ? <Empty text="Select a group from the left." /> : thread.length === 0 ? <Empty text="No messages yet. Welcome students with the first class update." /> : thread.map((message) => {
                const own = message.sender_id === profile.id;
                return (
                  <div key={message.id} className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[76%] ${own ? "ml-auto bg-primary text-primary-foreground" : "bg-slate-100 text-slate-800"}`}>
                    {!own && <p className="mb-1 text-[11px] font-black text-primary">{senderName(message, profile.id)}</p>}
                    {message.text && <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>}
                    {message.attachment_url && (
                      <button type="button" onClick={() => openAttachment(message)} className={`mt-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left ${own ? "border-white/20 bg-white/10" : "border-slate-200 bg-white"}`}>
                        <span className="rounded-lg bg-black/5 p-2"><AttachmentIcon type={message.message_type} /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{message.attachment_name ?? "Attachment"}</span><span className="block text-[10px] opacity-70">Open secure file</span></span>
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    <p className={`mt-1 text-[10px] ${own ? "text-primary-foreground/65" : "text-muted-foreground"}`}>{new Date(message.created_at).toLocaleString("en-ZA")}</p>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            <form onSubmit={sendMessage} className="border-t border-border/70 bg-white/70 p-4">
              {file && <div className="mb-3 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs"><span className="truncate font-semibold">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" className="font-bold text-primary" onClick={() => setFile(null)}>Remove</button></div>}
              <div className="flex gap-2">
                <label className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-background transition hover:border-primary ${!selected ? "pointer-events-none opacity-45" : ""}`} title="Attach image, video or document">
                  <Paperclip className="h-4 w-4" /><span className="sr-only">Choose attachment</span>
                  <input className="sr-only" type="file" disabled={!selected} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                </label>
                <input disabled={!selected} className={inputClass} value={text} onChange={(event) => setText(event.target.value)} placeholder={selected ? "Message registered students…" : "Select a group first"} />
                <Button className="h-11 rounded-xl" disabled={busy || !selected || (!text.trim() && !file)}><Send className="h-4 w-4" /><span className="sr-only">Send</span></Button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Images, videos, audio, PDFs and common Office documents · maximum 25 MB</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="min-w-28 rounded-2xl border border-white/65 bg-white/70 px-4 py-3"><p className="text-2xl font-black tabular-nums text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">{label}</span>{children}</label>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-slate-50/70 p-8 text-center text-sm text-muted-foreground"><MessageSquareText className="mx-auto mb-3 h-6 w-6 opacity-50" />{text}</div>;
}
