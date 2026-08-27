import Link from "next/link";
import { redirect } from "next/navigation";

export default async function VocabMenuPage({ searchParams }: { searchParams: Promise<{ source?: string; label?: string }> }) {
  const { source, label } = await searchParams;
  if (source === undefined) redirect("/vocab");
  const suffix = `?source=${encodeURIComponent(source)}&label=${encodeURIComponent(label ?? "")}`;
  return <main className="shell">
    <p className="eyebrow">詞彙 · {label || "全部"}</p>
    <h1>要播放來聽，還是要測驗？</h1>
    <section className="card">
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Link href={`/vocab/play${suffix}`} className="option" style={{textAlign:"left",textDecoration:"none"}}>播放 · 不用作答，聽過去就好</Link>
        <Link href={`/vocab/quiz${suffix}`} className="option" style={{textAlign:"left",textDecoration:"none"}}>測驗 · 認字、拼字、聽寫</Link>
      </div>
      <Link href="/vocab" style={{display:"inline-block",marginTop:14,textDecoration:"underline"}}>換一個關卡</Link>
    </section>
  </main>;
}
