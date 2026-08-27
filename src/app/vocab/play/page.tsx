import { redirect } from "next/navigation";
import { VocabPlayPanel } from "@/components/vocab-play-panel";

export default async function VocabPlayPage({ searchParams }: { searchParams: Promise<{ source?: string; label?: string }> }) {
  const { source, label } = await searchParams;
  if (source === undefined) redirect("/vocab");
  return <VocabPlayPanel source={{ key: source, label: label || "全部" }} />;
}
