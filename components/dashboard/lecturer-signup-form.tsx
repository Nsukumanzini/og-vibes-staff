"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LecturerSignupForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    department: "",
    staffId: "",
    password: "",
    confirmPassword: "",
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Placeholder for future Supabase signup integration.
  }

  return (
    <div className="w-full max-w-xl rounded-[28px] border border-border/70 bg-background/90 p-6 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur sm:p-8">
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-background/90 shadow-sm">
          <Image src="/assets/logo.jpeg" alt="OG Vibes Staff logo" width={40} height={40} className="object-cover" />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-foreground">OG Vibes Staff</p>
          <p className="text-sm text-muted-foreground">Create lecturer account</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          Professional onboarding for academic staff
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          You will be able to manage lectures, assessments, student communication and planning from one secure workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-foreground">Full name</label>
            <input
              id="fullName"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Dr. Jane Doe"
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="staffId" className="text-sm font-medium text-foreground">Staff ID</label>
            <input
              id="staffId"
              name="staffId"
              required
              value={formData.staffId}
              onChange={handleChange}
              placeholder="STF-1042"
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="lecturer@university.ac.za"
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="department" className="text-sm font-medium text-foreground">Department</label>
            <select
              id="department"
              name="department"
              required
              value={formData.department}
              onChange={handleChange}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select department</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Engineering">Engineering</option>
              <option value="Business">Business</option>
              <option value="Education">Education</option>
              <option value="Health Sciences">Health Sciences</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a secure password"
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat password"
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
            <span>Your account will be reviewed by the institution before access is granted to the lecturer dashboard.</span>
          </div>
        </div>

        <Button type="submit" className="h-11 gap-2 rounded-xl">
          Create account
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/70 pt-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Designed for lecturers and academic staff
        </div>
        <Link href="/login" className="font-medium text-primary transition-colors hover:text-primary/80">
          Sign in instead
        </Link>
      </div>
    </div>
  );
}
