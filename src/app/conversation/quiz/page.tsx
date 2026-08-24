import { ConversationQuiz } from "@/components/conversation-quiz";

export default async function ConversationQuizPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  return <ConversationQuiz courseId={course} />;
}
