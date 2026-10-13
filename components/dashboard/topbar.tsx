import Image from "next/image";
import { BackButton } from "./back-button";
import { BellRing } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Profile } from "@/lib/supabase/queries";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export function Topbar({ profile }: { profile: Profile | null }) {
  const fullName = profile ? `${profile.name} ${profile.surname}`.trim() : "Lecturer";
  const initial = fullName.charAt(0).toUpperCase() || "L";

  return (
    <header className="flex min-h-16 items-center justify-between gap-2 border-b border-border bg-card/95 px-3 py-2 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <BackButton />
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-background/90 shadow-sm sm:flex">
          <Image src="/assets/logo.jpeg" alt="OG Vibes Staff logo" width={36} height={36} className="object-cover" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">OG Vibes Staff</p>
          <h1 className="hidden text-xs font-medium text-muted-foreground sm:block">
            {profile?.department ?? "Department"}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm text-muted-foreground sm:flex">
          <BellRing className="h-4 w-4 text-primary" />
          <span>Updates ready</span>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-none">{fullName}</p>
          <p className="text-xs capitalize text-muted-foreground">{profile?.role ?? "Staff"}</p>
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
