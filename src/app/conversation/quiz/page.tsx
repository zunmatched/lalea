import { redirect } from "next/navigation";
import { ConversationQuiz } from "@/components/conversation-quiz";

export default async function ConversationQuizPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  if (!course) redirect("/conversation");
  return <ConversationQuiz courseId={course} />;
}
