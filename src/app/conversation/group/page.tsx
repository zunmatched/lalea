import { redirect } from "next/navigation";
import { ConversationGroupPicker } from "@/components/conversation-group-picker";

export default async function ConversationGroupPage({ searchParams }: { searchParams: Promise<{ group?: string; title?: string }> }) {
  const { group, title } = await searchParams;
  if (!group) redirect("/conversation");
  return <ConversationGroupPicker groupId={group} fallbackTitle={title || "課程"} />;
}
