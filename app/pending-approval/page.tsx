import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-xl border-primary/20 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Account pending approval</CardTitle>
          <CardDescription>
            Your lecturer account has been created and is waiting for admin approval before you can access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Once an administrator approves your account, you will be able to sign in and use the lecturer workspace.
          </p>
          <p>
            Please wait for confirmation by email or contact the institution if you need assistance.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/login">Back to sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Create another account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
