import { redirect } from "next/navigation";

type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function LoginAliasPage({ searchParams }: { searchParams: SearchParams }) {
  const { callbackUrl } = await searchParams;
  const suffix = callbackUrl
    ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "";
  redirect(`/signin${suffix}`);
}
