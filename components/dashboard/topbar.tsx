import Image from "next/image";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Profile } from "@/lib/supabase/queries";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export function Topbar({ profile }: { profile: Profile | null }) {
  const fullName = profile ? `${profile.name} ${profile.surname}`.trim() : "Lecturer";
  const initial = fullName.charAt(0).toUpperCase() || "L";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/95 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-background/90 shadow-sm">
          <Image src="/assets/logo.jpeg" alt="OG Vibes Staff logo" width={36} height={36} className="object-cover" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">OG Vibes Staff</p>
          <h1 className="text-xs font-medium text-muted-foreground">
            {profile?.department ?? "Department"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium leading-none">{fullName}</p>
          <p className="text-xs text-muted-foreground">Lecturer</p>
        </div>
        <Avatar>
          <AvatarImage src={profile?.photo_url ?? undefined} alt={fullName} />
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <SignOutButton />
      </div>
    </header>
  );
}
