import { redirect } from "next/navigation";
import { ListenPanel } from "@/components/listen-panel";

export default async function ConversationPlayPage({ searchParams }: { searchParams: Promise<{ course?: string; label?: string }> }) {
  const { course, label } = await searchParams;
  if (!course) redirect("/conversation");
  return <ListenPanel course={{ key: course, label: label || "會話" }} />;
}
