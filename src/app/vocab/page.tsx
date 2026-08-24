import Link from "next/link";

export default function VocabLanding() {
  return <main className="shell">
    <p className="eyebrow">詞彙</p>
    <h1>要播放來聽，還是要測驗？</h1>
    <section className="card">
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Link href="/vocab/play" className="option" style={{textAlign:"left",textDecoration:"none"}}>播放 · 不用作答，聽過去就好</Link>
        <Link href="/vocab/quiz" className="option" style={{textAlign:"left",textDecoration:"none"}}>測驗 · 認字、拼字、聽寫</Link>
      </div>
    </section>
  </main>;
}
