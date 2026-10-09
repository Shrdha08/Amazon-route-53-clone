import { notFound } from "next/navigation";
import ComingSoon from "@/components/ComingSoon";
import { PLACEHOLDERS } from "@/lib/placeholders";

export default async function PlaceholderPage({ params }: { params: Promise<{ placeholder: string[] }> }) {
  const slug = (await params).placeholder.join("/");
  const page = PLACEHOLDERS[slug];
  if (!page) notFound();
  return <ComingSoon title={page.title} href={`/${slug}`} description={page.description} />;
}
