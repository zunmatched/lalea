import Link from "next/link";

export default async function ConversationLanding({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const suffix = course ? `?course=${encodeURIComponent(course)}` : "";
  return <main className="shell">
    <p className="eyebrow">會話</p>
    <h1>要播放來聽，還是要測驗？</h1>
    <section className="card">
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Link href="/conversation/play" className="option" style={{textAlign:"left",textDecoration:"none"}}>播放 · 不用作答，聽過去就好</Link>
        <Link href={`/conversation/quiz${suffix}`} className="option" style={{textAlign:"left",textDecoration:"none"}}>測驗 · 實際回答對話練習題</Link>
      </div>
    </section>
  </main>;
}
