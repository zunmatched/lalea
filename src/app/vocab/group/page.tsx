import { redirect } from "next/navigation";
import { VocabGroupPicker } from "@/components/vocab-group-picker";

export default async function VocabGroupPage({ searchParams }: { searchParams: Promise<{ group?: string; title?: string }> }) {
  const { group, title } = await searchParams;
  if (!group) redirect("/vocab");
  return <VocabGroupPicker groupId={group} fallbackTitle={title || "課程"} />;
}
