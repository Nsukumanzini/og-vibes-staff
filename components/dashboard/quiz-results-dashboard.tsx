"use client";

import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Download, Eye, ShieldAlert, Target, Users } from "lucide-react";

import type { QuizAttemptAnswerRecord, QuizAttemptRecord, QuizRecord } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";

function displayName(attempt: QuizAttemptRecord) {
  const student = attempt.student;
  return student?.nickname?.trim() || [student?.name, student?.surname].filter(Boolean).join(" ") || student?.email || "Student";
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function QuizResultsDashboard({ quizzes, attempts, answers }: { quizzes: QuizRecord[]; attempts: QuizAttemptRecord[]; answers: QuizAttemptAnswerRecord[] }) {
  const [quizId, setQuizId] = useState("all");
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const visible = useMemo(() => attempts.filter((attempt) => quizId === "all" || attempt.quiz_id === quizId), [attempts, quizId]);
  const completed = visible.filter((attempt) => attempt.status === "completed");
  const average = completed.length ? completed.reduce((sum, attempt) => sum + Number(attempt.percentage ?? 0), 0) / completed.length : 0;
  const passRate = completed.length ? (completed.filter((attempt) => attempt.passed).length / completed.length) * 100 : 0;
  const selectedAttempt = attempts.find((attempt) => attempt.id === selectedAttemptId) ?? null;
  const selectedAnswers = answers.filter((answer) => answer.attempt_id === selectedAttemptId);

  function exportResults() {
    const rows = [
      ["Quiz", "Student", "Email", "Attempt", "Status", "Score", "Total", "Percentage", "Passed", "Completed"],
      ...visible.map((attempt) => [attempt.quiz?.title, displayName(attempt), attempt.student?.email, attempt.attempt_number, attempt.status, attempt.score_points, attempt.total_points, attempt.percentage, attempt.passed ? "Yes" : "No", attempt.completed_at]),
    ];
    const blob = new Blob([rows.map((row) => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quiz-results-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-xl sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Performance centre</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Quiz attempts & results</h2><p className="mt-1 text-sm text-slate-500">Review participation, scores, integrity signals and every submitted answer.</p></div>
        <div className="flex flex-wrap gap-2"><select aria-label="Filter by quiz" value={quizId} onChange={(event) => setQuizId(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"><option value="all">All quizzes</option>{quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}</select><Button variant="outline" onClick={exportResults} disabled={!visible.length}><Download /> Export results</Button></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Users, label: "Attempts", value: visible.length, note: "All recorded attempts" },
          { icon: CheckCircle2, label: "Completed", value: completed.length, note: "Successfully submitted" },
          { icon: BarChart3, label: "Average", value: `${average.toFixed(1)}%`, note: "Completed attempts" },
          { icon: Target, label: "Pass rate", value: `${passRate.toFixed(0)}%`, note: "Based on quiz threshold" },
        ].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-center gap-2 text-sm font-bold text-slate-600"><item.icon className="h-4 w-4 text-blue-600" />{item.label}</div><p className="mt-2 text-2xl font-black text-slate-950">{item.value}</p><p className="text-xs text-slate-500">{item.note}</p></div>)}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Quiz</th><th className="px-4 py-3">Attempt</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Integrity</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((attempt) => <tr key={attempt.id} className="hover:bg-blue-50/40"><td className="px-4 py-3"><p className="font-bold text-slate-900">{displayName(attempt)}</p><p className="text-xs text-slate-500">{attempt.student?.email}</p></td><td className="px-4 py-3 font-medium">{attempt.quiz?.title ?? "Quiz"}</td><td className="px-4 py-3">#{attempt.attempt_number}</td><td className="px-4 py-3"><span className="font-black text-slate-900">{attempt.percentage == null ? "—" : `${Number(attempt.percentage).toFixed(1)}%`}</span><p className="text-xs text-slate-500">{attempt.score_points ?? "—"} / {attempt.total_points ?? "—"}</p></td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${attempt.passed ? "bg-emerald-100 text-emerald-700" : attempt.status === "completed" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{attempt.status === "completed" ? (attempt.passed ? "Passed" : "Not passed") : attempt.status.replace("_", " ")}</span></td><td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><ShieldAlert className="h-3.5 w-3.5" />{attempt.focus_violations} flags</span></td><td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => setSelectedAttemptId(attempt.id)}><Eye /> Review</Button></td></tr>)}{!visible.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No attempts have been recorded for this selection.</td></tr>}</tbody></table></div>
      </div>
      {selectedAttempt && <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-blue-600">Attempt review</p><h3 className="text-lg font-black text-slate-950">{displayName(selectedAttempt)} · {selectedAttempt.quiz?.title}</h3></div><Button size="sm" variant="ghost" onClick={() => setSelectedAttemptId(null)}>Close</Button></div><div className="mt-4 space-y-3">{selectedAnswers.map((answer, index) => <div key={answer.question_id} className="rounded-xl bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-4"><p className="font-semibold text-slate-900">{index + 1}. {answer.question?.question_text ?? "Question"}</p><span className={`rounded-full px-2 py-1 text-xs font-bold ${answer.is_correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{answer.awarded_points ?? 0}/{answer.question?.points ?? 0} points</span></div><p className="mt-2 text-sm text-slate-600">Selected option: {String.fromCharCode(65 + answer.selected_option)} · Correct option: {answer.question?.correct_option == null ? "—" : String.fromCharCode(65 + answer.question.correct_option)}</p></div>)}{!selectedAnswers.length && <p className="text-sm text-slate-500">No per-question answers are available for this attempt.</p>}</div></div>}
    </section>
  );
}
