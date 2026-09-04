import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ConversationMenuPage({ searchParams }: { searchParams: Promise<{ course?: string; label?: string }> }) {
  const { course, label } = await searchParams;
  if (course === undefined) redirect("/conversation");
  const suffix = `?course=${encodeURIComponent(course)}&label=${encodeURIComponent(label ?? "")}`;
  return <main className="shell">
    <p className="eyebrow">會話 · {label || "課程"}</p>
    <h1>要播放來聽，還是要測驗？</h1>
    <section className="card">
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Link href={`/conversation/play${suffix}`} className="option" style={{textAlign:"left",textDecoration:"none"}}>播放 · 不用作答，聽過去就好</Link>
        <Link href={`/conversation/quiz?course=${encodeURIComponent(course)}`} className="option" style={{textAlign:"left",textDecoration:"none"}}>測驗 · 實際回答對話練習題</Link>
      </div>
    </section>
  </main>;
}
