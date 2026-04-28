import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";

import { createClient } from "@/lib/supabase/server";
import ProfileView from "./profile-view";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your NaRPISA account profile",
};

function getFirstName(fullName: string | undefined): string | null {
  const trimmed = fullName?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  return trimmed.split(/\s+/)[0] ?? null;
}

type EducationEntry = {
  school: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
};

type EmploymentEntry = {
  company: string;
  title: string;
  startYear: string;
  endYear: string;
  description: string;
};

function parseEducation(value: unknown): EducationEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }
      const item = row as Record<string, unknown>;
      return {
        school: String(item.school ?? ""),
        degree: String(item.degree ?? ""),
        fieldOfStudy: String(item.fieldOfStudy ?? ""),
        startYear: String(item.startYear ?? ""),
        endYear: String(item.endYear ?? ""),
      };
    })
    .filter((row): row is EducationEntry => row !== null);
}

function parseEmployment(value: unknown): EmploymentEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }
      const item = row as Record<string, unknown>;
      return {
        company: String(item.company ?? ""),
        title: String(item.title ?? ""),
        startYear: String(item.startYear ?? ""),
        endYear: String(item.endYear ?? ""),
        description: String(item.description ?? ""),
      };
    })
    .filter((row): row is EmploymentEntry => row !== null);
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin?callbackUrl=%2Fprofile");
  }

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName = String(meta?.full_name ?? "").trim();
  const firstName = getFirstName(fullName);
  const lastName = fullName.replace(firstName ?? "", "").trim();
  const company = String(meta?.company ?? "").trim();
  const address = String(meta?.address ?? "").trim();
  const biography = String(meta?.biography ?? "").trim();
  const accountType = String(meta?.account_type ?? "Standard").trim();
  const linkedInUrl = String(meta?.linkedin_url ?? "").trim();
  const education = parseEducation(meta?.education);
  const employment = parseEmployment(meta?.employment);

  return (
    <ProfileView
      initialFirstName={firstName ?? ""}
      initialLastName={lastName}
      email={user.email ?? "Not available"}
      userId={user.id}
      initialCompany={company}
      initialAddress={address}
      initialBiography={biography}
      accountType={accountType}
      initialLinkedInUrl={linkedInUrl}
      initialEducation={education}
      initialEmployment={employment}
    />
  );
}
