import { redirect } from "next/navigation";
import { ReviewPanel } from "@/components/review-panel";

export default async function VocabQuizPage({ searchParams }: { searchParams: Promise<{ source?: string; label?: string }> }) {
  const { source, label } = await searchParams;
  if (source === undefined) redirect("/vocab");
  return <ReviewPanel source={{ key: source, label: label || "全部" }} />;
}
