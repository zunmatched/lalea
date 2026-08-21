"use client";
import { useEffect,useMemo,useState } from "react";
import { randomUUID } from "@/lib/client-id";

type Pool={form:string;translation:string|null};
type Due={userVocabularyId:string;form:string;partOfSpeech:string|null;translation:string|null;example:string|null;exampleTranslation:string|null;dimension:"reading_recognition"|"listening_recognition"|"active_recall";nextReviewAt:string;reviewCount:number};
type Fresh={userVocabularyId:string;form:string;partOfSpeech:string|null;translation:string|null;example:string|null;exampleTranslation:string|null};
type Queue={due:Due[];new:Fresh[];pool:Pool[];policy:{newAllowance:number;dueCount:number}};

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

 async function load(){const response=await fetch("/api/reviews/queue");if(response.ok)setQueue(await response.json())}
 useEffect(()=>{let active=true;fetch("/api/reviews/queue").then(r=>r.ok?r.json():null).then(result=>{if(active)setQueue(result)}).catch(()=>null);return()=>{active=false}},[]);

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
 },[item?.userVocabularyId,challengeType,queue,showEnglishOptions]);

 useEffect(()=>{setSelectedOption(null);setSpelling("");setChecked(null)},[item?.userVocabularyId]);

 function checkOption(label:string){
  if(!item||checked)return;
  const correctLabel=showEnglishOptions?item.form:(item.translation??item.form);
  setSelectedOption(label);setChecked({correct:label===correctLabel});
 }
 function checkSpelling(){
  if(!item||checked||!spelling.trim())return;
  setChecked({correct:spelling.trim().toLowerCase()===item.form.toLowerCase()});
 }
 function speak(){if(!item||!("speechSynthesis"in window))return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(item.form);utterance.lang="en-US";window.speechSynthesis.speak(utterance)}

 async function submitReview(rating:"forgot"|"hard"|"mastered"|"too_easy"){
  if(!item)return;setBusy(true);
  const response=await fetch("/api/reviews",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({userVocabularyId:item.userVocabularyId,dimension:item.dimension,clientEventId:randomUUID(),isCorrect:checked?.correct??false,rating})});
  const result=await response.json();setBusy(false);
  if(response.ok){setMessage(`已安排下次複習：${result.reason}`);await load()}
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
  {checked&&<>
   {checked.correct?<div className="review-ratings"><button disabled={busy} onClick={()=>submitReview("hard")}>困難</button><button disabled={busy} onClick={()=>submitReview("mastered")}>掌握</button><button disabled={busy} onClick={()=>submitReview("too_easy")}>太容易</button></div>
   :<button className="primary" disabled={busy} onClick={()=>submitReview("forgot")}>知道了，下一個</button>}
   <div className={`feedback ${checked.correct?"correct":"wrong"}`} role="status"><strong>{checked.correct?"答對了":"再記一次"}</strong>{!checked.correct&&<div>正確答案：{item.form}{item.translation?`（${item.translation}）`:""}</div>}</div>
   <div style={{display:"flex",alignItems:"center",gap:10,marginTop:14}}>{item.partOfSpeech&&<span className="context" style={{margin:0,padding:"3px 10px"}}>{item.partOfSpeech}</span>}<button aria-label="播放發音" onClick={speak} style={{border:0,borderRadius:"50%",width:36,height:36,background:"var(--mint)",color:"var(--ink)",cursor:"pointer"}}>🔊</button></div>
   {item.example&&<p className="context"><strong>{item.example}</strong>{item.exampleTranslation&&<><br/><span>{item.exampleTranslation}</span></>}</p>}
  </>}
  {message&&<p className="context" role="status">{message}</p>}
 </section>:<section className="card"><h2>目前沒有到期項目</h2><p className="lead">可開始的新詞：{queue.new.length} 個；今日允許新增上限：{queue.policy.newAllowance} 個。</p></section>}
 </main>
}
