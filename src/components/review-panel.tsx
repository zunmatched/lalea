"use client";
import { useEffect,useMemo,useState } from "react";
import { randomUUID } from "@/lib/client-id";

type Pool={form:string;translation:string|null};
type Due={userVocabularyId:string;form:string;partOfSpeech:string|null;translation:string|null;example:string|null;exampleTranslation:string|null;dimension:"reading_recognition"|"listening_recognition"|"active_recall";nextReviewAt:string;reviewCount:number};
type Fresh={userVocabularyId:string;form:string;partOfSpeech:string|null;translation:string|null;example:string|null;exampleTranslation:string|null};
type Queue={due:Due[];new:Fresh[];pool:Pool[];policy:{newAllowance:number;dueCount:number;newVocabLimit:number}};

const labels={reading_recognition:"閱讀辨識",listening_recognition:"聽力辨識",active_recall:"主動提取"};
const challengeTypes=["recognize_en","recognize_zh","spell"] as const;
type ChallengeType=typeof challengeTypes[number];
function shuffle<T>(items:T[]):T[]{return [...items].sort(()=>Math.random()-0.5)}

export function ReviewPanel(){
 const[queue,setQueue]=useState<Queue|null>(null);
 const[message,setMessage]=useState("");
 const[busy,setBusy]=useState(false);
 const[selectedOption,setSelectedOption]=useState<string|null>(null);
 const[spelling,setSpelling]=useState("");
 const[checked,setChecked]=useState<{correct:boolean}|null>(null);
 const[extraBusy,setExtraBusy]=useState(false);
 const[extraMessage,setExtraMessage]=useState("");

 async function load(more=false){const response=await fetch(`/api/reviews/queue${more?"?more=1":""}`);if(response.ok)return(await response.json())as Queue;return null}
 useEffect(()=>{let active=true;load().then(result=>{if(active&&result)setQueue(result)});return()=>{active=false}},[]);
 async function loadMore(){
  setExtraBusy(true);setExtraMessage("");
  const result=await load(true);
  setExtraBusy(false);
  if(!result)return;
  setExtraMessage(result.due.length||result.new.length?"":"目前真的沒有更多新詞了，等到期複習時間到了再回來。");
  setQueue(result);
 }

 const dueItem=queue?.due[0];
 const freshItem=!dueItem?queue?.new[0]:undefined;
 const isFirstLearning=!dueItem&&Boolean(freshItem);
 const item=dueItem??(freshItem?{...freshItem,dimension:"reading_recognition" as const,nextReviewAt:"",reviewCount:0}:undefined);
 const challengeType:ChallengeType|undefined=item?challengeTypes[item.reviewCount%3]:undefined;
 const showEnglishOptions=challengeType==="recognize_zh";

 const options=useMemo(()=>{
  if(!item||!queue||!challengeType||challengeType==="spell")return[];
  const correctLabel=showEnglishOptions?item.form:(item.translation??item.form);
  const distractors=shuffle(queue.pool.filter(p=>p.form!==item.form)).slice(0,3).map(p=>showEnglishOptions?p.form:(p.translation??p.form));
  return shuffle([...new Set([correctLabel,...distractors])]);
 },[item?.userVocabularyId,item?.form,item?.translation,challengeType,queue,showEnglishOptions]);

 const[shownItemId,setShownItemId]=useState(item?.userVocabularyId);
 if(item?.userVocabularyId!==shownItemId){setShownItemId(item?.userVocabularyId);setSelectedOption(null);setSpelling("");setChecked(null);setMessage("");setExtraMessage("")}

 function checkOption(label:string){
  if(!item||checked)return;
  const correctLabel=showEnglishOptions?item.form:(item.translation??item.form);
  setSelectedOption(label);setChecked({correct:label===correctLabel});
 }
 function checkSpelling(){
  if(!item||checked||!spelling.trim())return;
  setChecked({correct:spelling.trim().toLowerCase()===item.form.toLowerCase()});
 }
 function speak(){
  if(!item||!("speechSynthesis"in window))return;
  window.speechSynthesis.cancel();
  const parts:Array<{text:string;lang:string}>=[{text:item.form,lang:"en-US"}];
  if(item.translation)parts.push({text:item.translation,lang:"zh-TW"});
  if(item.example)parts.push({text:item.example,lang:"en-US"});
  if(item.exampleTranslation)parts.push({text:item.exampleTranslation,lang:"zh-TW"});
  for(const part of parts){const utterance=new SpeechSynthesisUtterance(part.text);utterance.lang=part.lang;window.speechSynthesis.speak(utterance)}
 }

 function describeSchedule(state:{intervalDays:number;nextReviewAt:string}){
  const minutesUntil=Math.round((new Date(state.nextReviewAt).getTime()-Date.now())/60000);
  if(minutesUntil<60)return`已安排 ${Math.max(minutesUntil,1)} 分鐘後再複習`;
  if(state.intervalDays<=1)return"已安排明天複習";
  return`已安排 ${state.intervalDays} 天後複習`;
 }
 async function submitReview(rating:"forgot"|"hard"|"mastered"|"too_easy"){
  if(!item)return;setBusy(true);
  const response=await fetch("/api/reviews",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({userVocabularyId:item.userVocabularyId,dimension:item.dimension,clientEventId:randomUUID(),isCorrect:checked?.correct??false,rating})});
  const result=await response.json();
  if(response.ok){setMessage(describeSchedule(result.state));const next=await load();if(next)setQueue(next)}
  setBusy(false);
 }

 const prompts:Record<ChallengeType,string>={recognize_en:"這個字的意思是？",recognize_zh:"哪個英文字是這個意思？",spell:"請拼出這個字："};

 return <main className="shell"><p className="eyebrow">到期複習</p><h1>先處理需要回想的內容。</h1><p className="lead">閱讀、聽力與主動提取分開安排；新的詞彙只會填入剩餘量。</p>
 {!queue?<section className="card">載入中…</section>:item&&challengeType?<section className="card">
  <span className="label">{isFirstLearning?`首次學習 · 可學 ${queue.new.length}`:`${labels[item.dimension]} · 剩餘 ${queue.due.length}`}</span>
  {challengeType==="recognize_en"&&<h1 style={{fontSize:30}}>{item.form}</h1>}
  {(challengeType==="recognize_zh"||challengeType==="spell")&&<h1 style={{fontSize:30}}>{item.translation??item.form}</h1>}
  <span className="label">{prompts[challengeType]}</span>
  {challengeType==="spell"?<>
   <input className="text-input" value={spelling} onChange={event=>setSpelling(event.target.value)} disabled={Boolean(checked)} placeholder="輸入英文拼字" onKeyDown={event=>event.key==="Enter"&&checkSpelling()}/>
   {!checked&&<button className="primary" onClick={checkSpelling} disabled={!spelling.trim()}>檢查拼字</button>}
  </>:<div className="options">{options.map(label=><button key={label} className={`option${selectedOption===label?" selected":""}`} disabled={Boolean(checked)} onClick={()=>checkOption(label)}>{label}</button>)}</div>}
  {checked&&(message?<p className="context" role="status">{message}</p>:busy?<p className="context" role="status">安排下一個中…</p>:<>
   {checked.correct?<div className="review-ratings"><button disabled={busy} onClick={()=>submitReview("hard")}>困難</button><button disabled={busy} onClick={()=>submitReview("mastered")}>掌握</button><button disabled={busy} onClick={()=>submitReview("too_easy")}>太容易</button></div>
   :<button className="primary" disabled={busy} onClick={()=>submitReview("forgot")}>知道了，下一個</button>}
   <div className={`feedback ${checked.correct?"correct":"wrong"}`} role="status"><strong>{checked.correct?"答對了":"再記一次"}</strong>{!checked.correct&&<div>正確答案：{item.form}{item.translation?`（${item.translation}）`:""}</div>}</div>
   <div style={{display:"flex",alignItems:"center",gap:10,marginTop:14}}>{item.partOfSpeech&&<span className="context" style={{margin:0,padding:"3px 10px"}}>{item.partOfSpeech}</span>}<button aria-label="播放發音" onClick={speak} style={{border:0,borderRadius:"50%",width:36,height:36,background:"var(--mint)",color:"var(--ink)",cursor:"pointer"}}>🔊</button></div>
   {item.example&&<p className="context"><strong>{item.example}</strong>{item.exampleTranslation&&<><br/><span>{item.exampleTranslation}</span></>}</p>}
  </>)}
 </section>:<section className="card"><h2>目前沒有到期項目</h2><p className="lead">今日新詞已用完（上限 {queue.policy.newVocabLimit} 個）。想繼續練習可以再多學一批，不會影響間隔複習排程。</p><button className="primary" disabled={extraBusy} onClick={loadMore}>{extraBusy?"載入中…":"再複習一次"}</button>{extraMessage&&<p className="context" role="status">{extraMessage}</p>}</section>}
 </main>
}
