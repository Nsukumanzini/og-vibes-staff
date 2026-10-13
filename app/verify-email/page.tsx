import { LecturerEmailVerification } from "@/components/dashboard/lecturer-email-verification";

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),linear-gradient(135deg,_#f8fbff_0%,_#eef5ff_100%)] p-4 sm:p-6">
      <LecturerEmailVerification />
    </main>
  );
}
