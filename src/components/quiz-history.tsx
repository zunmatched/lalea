"use client";
import { useEffect,useState } from "react";

type VocabSession={id:string;sourceLabel:string;category:"recognize_zh"|"recognize_en"|"dictation"|"spell";correctCount:number;totalCount:number;durationSeconds:number|null;wrongForms:Array<{form:string;translation:string|null}>;createdAt:string};
type ConversationSession={id:string;completedAt:string|null;courseTitle:string;unitTitle:string;correctCount:number;totalCount:number};

const categoryLabels:Record<VocabSession["category"],string>={recognize_zh:"中選英",recognize_en:"英選中",dictation:"聽力拼字",spell:"看中文寫英文"};

function formatDate(iso:string|null){
 if(!iso)return"";
 return new Date(iso).toLocaleString("zh-TW",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"});
}
function formatDuration(totalSeconds:number|null){
 if(totalSeconds==null)return null;
 const m=Math.floor(totalSeconds/60);const s=totalSeconds%60;
 return`${m}:${String(s).padStart(2,"0")}`;
}

export function QuizHistory(){
 const[tab,setTab]=useState<"vocab"|"conversation">("vocab");
 const[vocabSessions,setVocabSessions]=useState<VocabSession[]|null>(null);
 const[conversationSessions,setConversationSessions]=useState<ConversationSession[]|null>(null);

 useEffect(()=>{
  let active=true;
  fetch("/api/reviews/sessions").then(r=>r.ok?r.json():null).then((data:{sessions:VocabSession[]}|null)=>{if(active)setVocabSessions(data?.sessions??[])}).catch(()=>{if(active)setVocabSessions([])});
  fetch("/api/unit-runs/history").then(r=>r.ok?r.json():null).then((data:{sessions:ConversationSession[]}|null)=>{if(active)setConversationSessions(data?.sessions??[])}).catch(()=>{if(active)setConversationSessions([])});
  return()=>{active=false};
 },[]);

 return <main className="shell">
  <p className="eyebrow">我的 · 測驗紀實</p>
  <h1>過去的測驗紀錄。</h1>
  <div className="pills">
   <button className="pill" aria-pressed={tab==="vocab"} onClick={()=>setTab("vocab")}>詞彙</button>
   <button className="pill" aria-pressed={tab==="conversation"} onClick={()=>setTab("conversation")}>會話</button>
  </div>

  {tab==="vocab"&&<section className="card">
   {vocabSessions===null&&<p className="lead">載入中…</p>}
   {vocabSessions&&vocabSessions.length===0&&<p className="lead">還沒有詞彙測驗紀錄。</p>}
   {vocabSessions&&vocabSessions.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
    {vocabSessions.map(item=><div key={item.id} className="context" style={{margin:0}}>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10}}>
      <strong>{item.sourceLabel} · {categoryLabels[item.category]}</strong>
      <span style={{color:"var(--muted)",fontSize:13,whiteSpace:"nowrap"}}>{formatDate(item.createdAt)}</span>
     </div>
     <div style={{marginTop:4}}>{item.correctCount}/{item.totalCount} 答對{formatDuration(item.durationSeconds)&&<> · 用時 {formatDuration(item.durationSeconds)}</>}</div>
     {item.wrongForms.length>0&&<div style={{marginTop:8,color:"var(--muted)",fontSize:13}}>答錯：{item.wrongForms.map(wrong=>wrong.form+(wrong.translation?`（${wrong.translation}）`:"")).join("、")}</div>}
    </div>)}
   </div>}
  </section>}

  {tab==="conversation"&&<section className="card">
   {conversationSessions===null&&<p className="lead">載入中…</p>}
   {conversationSessions&&conversationSessions.length===0&&<p className="lead">還沒有會話測驗紀錄。</p>}
   {conversationSessions&&conversationSessions.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
    {conversationSessions.map(item=><div key={item.id} className="context" style={{margin:0}}>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10}}>
      <strong>{item.courseTitle} · {item.unitTitle}</strong>
      <span style={{color:"var(--muted)",fontSize:13,whiteSpace:"nowrap"}}>{formatDate(item.completedAt)}</span>
     </div>
     <div style={{marginTop:4}}>{item.correctCount}/{item.totalCount} 答對</div>
    </div>)}
   </div>}
  </section>}
 </main>;
}
