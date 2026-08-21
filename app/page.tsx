"use client";

import { useState } from "react";

const lessons = [
  { icon: "💬", title: "Small Talk", subtitle: "辦公室日常對話", level: "A2", color: "coral" },
  { icon: "🤝", title: "Meetings", subtitle: "會議表達與回應", level: "B1", color: "violet" },
  { icon: "✉", title: "Email Writing", subtitle: "專業郵件寫作", level: "B1", color: "mint" },
];

const phrases = [
  { en: "Could you walk me through it?", zh: "你可以一步步說明給我聽嗎？", tag: "請求說明" },
  { en: "Let’s circle back on this tomorrow.", zh: "我們明天再回頭討論這件事。", tag: "會議溝通" },
  { en: "I’ll keep you posted.", zh: "我會隨時向你更新進度。", tag: "進度回報" },
];

export default function Home() {
  const [activePhrase, setActivePhrase] = useState(0);
  const [saved, setSaved] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);

  const speak = () => {
    setPlaying(true);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrases[activePhrase].en);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      utterance.onend = () => setPlaying(false);
      window.speechSynthesis.speak(utterance);
    } else setTimeout(() => setPlaying(false), 900);
  };

  const toggleSaved = () => setSaved((items) => items.includes(activePhrase) ? items.filter((item) => item !== activePhrase) : [...items, activePhrase]);
  const goToPhrases = () => document.querySelector("#phrases")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="LaLea 首頁"><span className="brand-mark">L</span><span>LaLea</span></a>
        <nav className="desktop-nav" aria-label="主要導覽"><a className="active" href="#today">今日學習</a><a href="#courses">課程</a><a href="#phrases">句型庫</a></nav>
        <div className="top-actions"><button className="streak" aria-label="連續學習 7 天">🔥 <strong>7</strong></button><button className="avatar" aria-label="個人資料">YL</button></div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy"><p className="eyebrow">GOOD MORNING, YU-LIN 👋</p><h1>今天，讓英文成為你的<br /><em>職場神隊友。</em></h1><p className="hero-sub">每天 10 分鐘，累積能自信說出口的實用英文。</p></div>
        <div className="week" aria-label="本週學習進度">{[["一","18",true],["二","19",true],["三","20",true],["四","21",true],["五","22",false],["六","23",false],["日","24",false]].map(([day,date,done], index) => <div className={`day ${index === 4 ? "current" : ""}`} key={String(date)}><span>{day}</span><b>{done ? "✓" : date}</b></div>)}</div>
      </section>

      <section className="today-card" id="today">
        <div className="lesson-art" aria-hidden="true"><div className="bubble bubble-a">Let me clarify.</div><div className="bubble bubble-b">Good point!</div><div className="person person-a"><span>👨🏻‍💼</span></div><div className="person person-b"><span>👩🏽‍💼</span></div><div className="table-shape" /></div>
        <div className="lesson-content"><div className="lesson-meta"><span className="pill">TODAY’S LESSON</span><span>約 8 分鐘</span></div><h2>Speak Up in Meetings</h2><p className="lesson-zh">在會議中自信發言</p><p>學會自然地表達意見、提出問題，並禮貌地同意或反對。</p><div className="progress-row"><div className="progress"><span /></div><b>35%</b></div><button className="primary" onClick={goToPhrases}>繼續學習 <span>→</span></button></div>
      </section>

      <section className="section" id="courses">
        <div className="section-head"><div><p className="eyebrow">依情境學習</p><h2>你今天會遇到哪種場合？</h2></div><a href="#phrases">查看全部 ↗</a></div>
        <div className="lesson-grid">{lessons.map((lesson) => <button className={`mini-card ${lesson.color}`} key={lesson.title} onClick={goToPhrases}><span className="mini-icon">{lesson.icon}</span><span className="mini-copy"><b>{lesson.title}</b><small>{lesson.subtitle}</small></span><span className="level">{lesson.level}</span><span className="arrow">→</span></button>)}</div>
      </section>

      <section className="phrase-section" id="phrases">
        <div className="phrase-copy"><p className="eyebrow">PHRASE OF THE DAY</p><h2>今日一句，<br />帶進職場裡。</h2><p>聽發音、跟著說，然後把句子收進你的專屬句型庫。</p><div className="dots" aria-label="切換句型">{phrases.map((_, index) => <button key={index} className={index === activePhrase ? "active" : ""} onClick={() => setActivePhrase(index)} aria-label={`第 ${index + 1} 句`} />)}</div></div>
        <article className="phrase-card"><div className="quote-mark">“</div><span className="tag">{phrases[activePhrase].tag}</span><h3>{phrases[activePhrase].en}</h3><p>{phrases[activePhrase].zh}</p><div className="phrase-actions"><button className={`sound ${playing ? "playing" : ""}`} onClick={speak} aria-label="播放發音">{playing ? "◼" : "▶"} <span>{playing ? "播放中" : "聽發音"}</span></button><button className={`save ${saved.includes(activePhrase) ? "saved" : ""}`} onClick={toggleSaved}>{saved.includes(activePhrase) ? "★ 已收藏" : "☆ 收藏"}</button></div></article>
      </section>

      <footer><a className="brand" href="#top"><span className="brand-mark">L</span><span>LaLea</span></a><p>Language learning, made for your workday.</p><span>© 2026 LaLea</span></footer>
      <nav className="mobile-nav" aria-label="行動版導覽"><a className="active" href="#today"><span>⌂</span>首頁</a><a href="#courses"><span>▦</span>課程</a><a href="#phrases"><span>★</span>句型</a><a href="#top"><span>☺</span>我的</a></nav>
    </main>
  );
}
