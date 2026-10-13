"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UploadCloud } from "lucide-react";

import type { ModuleWithProgramme } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SlideUploadForm({ modules }: { modules: ModuleWithProgramme[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [fileUrl, setFileUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("You need to be signed in before uploading slides.");
      setIsSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("lecture_slides").insert({
      title: title.trim(),
      level: level.trim() || null,
      subject: subject.trim() || null,
      module_id: moduleId || null,
      url: fileUrl.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      setIsSubmitting(false);
      return;
    }

    setTitle("");
    setLevel("");
    setSubject("");
    setFileUrl("");
    setModuleId(modules[0]?.id ?? "");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <UploadCloud className="h-4 w-4" />
        Upload a new slide deck
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder="Week 4 – Systems thinking"
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Module</label>
          <select
            value={moduleId}
            onChange={(event) => setModuleId(event.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {modules.length === 0 ? (
              <option value="">No modules available</option>
            ) : (
              modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name} · {module.code ?? "No code"}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Level</label>
          <input
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            placeholder="Level 4"
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Subject</label>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Algorithms"
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-sm font-medium text-foreground">Public file URL</label>
          <input
            value={fileUrl}
            onChange={(event) => setFileUrl(event.target.value)}
            placeholder="https://example.com/deck.pdf"
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Paste a public URL for the slide deck or use a storage link once your bucket is configured.
          </p>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="mt-4 h-10" disabled={isSubmitting}>
        {isSubmitting ? "Saving slide…" : "Save slide"}
      </Button>
    </form>
  );
}
