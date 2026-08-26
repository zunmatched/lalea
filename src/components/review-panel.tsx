"use client";
import { useEffect,useMemo,useRef,useState } from "react";
import { randomUUID } from "@/lib/client-id";
import { PROFICIENCY_MAX } from "@/lib/proficiency";
import { speakSequence } from "@/lib/speech";

type Pool={form:string;translation:string|null};
type Due={userVocabularyId:string;form:string;partOfSpeech:string|null;translation:string|null;example:string|null;exampleTranslation:string|null;dimension:"reading_recognition"|"listening_recognition"|"active_recall";proficiency:number;reviewCount:number;reviewedToday:boolean};
type Fresh={userVocabularyId:string;form:string;partOfSpeech:string|null;translation:string|null;example:string|null;exampleTranslation:string|null};
type Queue={due:Due[];new:Fresh[];pool:Pool[];policy:{newAllowance:number;dueCount:number;newVocabLimit:number}};
type SessionItem=(Due&{isNew:false})|(Fresh&{isNew:true;dimension:"reading_recognition";proficiency:0;reviewCount:0});
type Source={key:string;label:string;due:number;new:number};

const labels={reading_recognition:"閱讀辨識",listening_recognition:"聽力辨識",active_recall:"主動提取"};
const challengeTypes=["recognize_en","recognize_zh","spell","dictation"] as const;
type ChallengeType=typeof challengeTypes[number];
type QuizCategory="choice"|"spelling";
const categoryTypes:Record<QuizCategory,readonly ChallengeType[]>={choice:["recognize_en","recognize_zh"],spelling:["spell","dictation"]};
const categoryLabels:Record<QuizCategory,string>={choice:"選擇 · 中選英／英選中",spelling:"拼字 · 聽力／看中文寫英文"};
function shuffle<T>(items:T[]):T[]{return [...items].sort(()=>Math.random()-0.5)}
function spellHint(form:string){const words=form.trim().split(/\s+/);const letters=words.join("").length;return`共 ${letters} 個字母${words.length>1?`（${words.length} 個單字）`:""}，開頭字母：${words[0][0].toUpperCase()}`}
const emptyQueue:Queue={due:[],new:[],pool:[],policy:{newAllowance:0,dueCount:0,newVocabLimit:0}};

export function ReviewPanel(){
 const[category,setCategory]=useState<QuizCategory|null>(null);
 const[sources,setSources]=useState<Source[]|null>(null);
 const[activeSource,setActiveSource]=useState<Source|null>(null);
 const[pool,setPool]=useState<Pool[]>([]);
 const[session,setSession]=useState<SessionItem[]|null>(null);
 const[sessionIndex,setSessionIndex]=useState(0);
 const[correctCount,setCorrectCount]=useState(0);
 const[wrongItems,setWrongItems]=useState<SessionItem[]>([]);
 const[message,setMessage]=useState("");
 const[selectedOption,setSelectedOption]=useState<string|null>(null);
 const[spelling,setSpelling]=useState("");
 const[checked,setChecked]=useState<{correct:boolean}|null>(null);
 const sessionIndexRef=useRef(sessionIndex);
 useEffect(()=>{sessionIndexRef.current=sessionIndex},[sessionIndex]);

 function loadSources(){
  setSources(null);
  fetch("/api/reviews/sources").then(r=>r.ok?r.json():null).then((data:{sources:Source[]}|null)=>setSources(data?.sources??[])).catch(()=>setSources([]));
 }
 useEffect(()=>{let active=true;fetch("/api/reviews/sources").then(r=>r.ok?r.json():null).then((data:{sources:Source[]}|null)=>{if(active)setSources(data?.sources??[])}).catch(()=>{if(active)setSources([])});return()=>{active=false}},[]);

 function applySession(data:Queue){
  const items:SessionItem[]=[
   ...data.due.map(item=>({...item,isNew:false as const})),
   ...data.new.map(item=>({...item,isNew:true as const,dimension:"reading_recognition" as const,proficiency:0 as const,reviewCount:0 as const})),
  ];
  setPool(data.pool);setSession(items);setSessionIndex(0);setCorrectCount(0);setWrongItems([]);
  setSelectedOption(null);setSpelling("");setChecked(null);setMessage("");
 }
 async function startSession(source:Source){
  setActiveSource(source);setSession(null);
  const query=source.key?`?source=${encodeURIComponent(source.key)}`:"";
  const response=await fetch(`/api/reviews/queue${query}`).catch(()=>null);
  applySession(response&&response.ok?(await response.json())as Queue:emptyQueue);
 }
 function backToMenu(){setActiveSource(null);setSession(null);loadSources()}

 const item=session?.[sessionIndex];
 const isFirstLearning=item?.isNew??false;
 const activeTypes=category?categoryTypes[category]:challengeTypes;
 const challengeType:ChallengeType|undefined=item?activeTypes[item.reviewCount%activeTypes.length]:undefined;
 const showEnglishOptions=challengeType==="recognize_zh";

 const options=useMemo(()=>{
  if(!item||!challengeType||challengeType==="spell")return[];
  const correctLabel=showEnglishOptions?item.form:(item.translation??item.form);
  const distractors=shuffle(pool.filter(p=>p.form!==item.form)).slice(0,3).map(p=>showEnglishOptions?p.form:(p.translation??p.form));
  return shuffle([...new Set([correctLabel,...distractors])]);
 },[item?.userVocabularyId,item?.form,item?.translation,challengeType,pool,showEnglishOptions]);

 function checkOption(label:string){
  if(!item||checked)return;
  const correctLabel=showEnglishOptions?item.form:(item.translation??item.form);
  const correct=label===correctLabel;
  // 選擇類（中選英／英選中）只是練習，不送出複習紀錄，不影響熟練度
  setSelectedOption(label);setChecked({correct});
  if(correct)setCorrectCount(value=>value+1);
 }
 function checkSpelling(){
  if(!item||checked||!spelling.trim())return;
  const correct=spelling.trim().toLowerCase()===item.form.toLowerCase();
  setChecked({correct});submitReview(item,correct);
 }
 function checkDictation(){
  if(!item||checked||!spelling.trim()||!selectedOption)return;
  const spellingCorrect=spelling.trim().toLowerCase()===item.form.toLowerCase();
  const optionCorrect=selectedOption===(item.translation??item.form);
  const correct=spellingCorrect&&optionCorrect;
  setChecked({correct});submitReview(item,correct);
 }
 function playWord(){if(item)speakSequence([{text:item.form,lang:"en-US"}])}
 function speak(){
  if(!item)return;
  const parts:Array<{text:string;lang:string}>=[{text:item.form,lang:"en-US"}];
  if(item.translation)parts.push({text:item.translation,lang:"zh-TW"});
  if(item.example)parts.push({text:item.example,lang:"en-US"});
  if(item.exampleTranslation)parts.push({text:item.exampleTranslation,lang:"zh-TW"});
  speakSequence(parts);
 }

 async function submitReview(forItem:SessionItem,correct:boolean){
  if(correct)setCorrectCount(value=>value+1);
  const forIndex=sessionIndexRef.current;
  try{
   const response=await fetch("/api/reviews",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({userVocabularyId:forItem.userVocabularyId,dimension:forItem.dimension,clientEventId:randomUUID(),isCorrect:correct})});
   if(response.ok){
    const result=await response.json();
    if(sessionIndexRef.current===forIndex)setMessage(`熟練度 ${result.proficiency}/${PROFICIENCY_MAX}（近 5 天內每天最高分累計）`);
   }
  }catch{
   // network hiccup: the answer already counted locally, just no proficiency readout this time
  }
 }
 function acknowledge(){
  if(!item||!checked)return;
  if(!checked.correct)setWrongItems(value=>[...value,item]);
  setSelectedOption(null);setSpelling("");setChecked(null);setMessage("");
  setSessionIndex(value=>value+1);
 }

 const prompts:Record<ChallengeType,string>={recognize_en:"這個字的意思是？",recognize_zh:"哪個英文字是這個意思？",spell:"請拼出這個字：",dictation:"聽發音，拼出這個字，並選出正確的中文意思："};

 if(!activeSource){
  return <main className="shell">
   <p className="eyebrow">詞彙 · 測驗</p>
   <h1>先選要複習的內容。</h1>
   <section className="card">
    {sources===null&&<p className="lead">載入中…</p>}
    {sources!==null&&sources.length===0&&<p className="lead">目前沒有需要複習的內容。</p>}
    {sources!==null&&sources.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
     {sources.map(source=><button key={source.key||"all"} className="option" onClick={()=>startSession(source)} style={{textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span>{source.label}</span>
      <span className="context" style={{margin:0}}>待複習 {source.due} · 新字 {source.new}</span>
     </button>)}
    </div>}
   </section>
  </main>;
 }

 if(!category){
  return <main className="shell">
   <p className="eyebrow">詞彙 · 測驗 · {activeSource.label}</p>
   <h1>要練哪一種難度？</h1>
   <section className="card">
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
     {(Object.keys(categoryTypes) as QuizCategory[]).map(value=><button key={value} className="option" onClick={()=>setCategory(value)} style={{textAlign:"left"}}>{categoryLabels[value]}</button>)}
    </div>
   </section>
  </main>;
 }

 if(session===null)return <main className="shell"><p className="eyebrow">詞彙 · 測驗 · {activeSource.label}</p><h1>先處理最需要加強的內容。</h1><section className="card">載入中…</section></main>;

 if(!item)return <main className="shell finish"><div className="mark">✓</div><p className="eyebrow">本輪複習完成</p><h1>{session.length===0?"目前沒有需要複習的內容。":"這輪的內容都練過一次了。"}</h1>{session.length>0&&<div className="stats"><div className="stat"><strong>{correctCount}/{session.length}</strong><span>答對</span></div></div>}{wrongItems.length>0&&<section className="card" style={{textAlign:"left"}}><span className="label">答錯的字</span>{wrongItems.map(wrong=><p key={wrong.userVocabularyId} className="context" style={{margin:"8px 0"}}>{wrong.form}{wrong.translation?`（${wrong.translation}）`:""}</p>)}</section>}<button className="primary resume" onClick={backToMenu}>返回選單</button></main>;

 return <main className="shell"><p className="eyebrow">詞彙 · 測驗 · {activeSource.label}</p><h1>先處理最需要加強的內容。</h1><p className="lead">依熟練度由低到高排序，本輪固定內容跑完一遍；每字近 5 天內每天最高分累計，最高 {PROFICIENCY_MAX} 分，不練會掉分。</p>
 <section className="card">
  <span className="label">{isFirstLearning?"首次學習":labels[item.dimension]} · {isFirstLearning?"":`熟練度 ${item.proficiency}/${PROFICIENCY_MAX} · `}本輪剩餘 {session.length-sessionIndex}</span>
  {challengeType==="recognize_en"&&<h1 style={{fontSize:30}}>{item.form}</h1>}
  {(challengeType==="recognize_zh"||challengeType==="spell")&&<h1 style={{fontSize:30}}>{item.translation??item.form}</h1>}
  <span className="label">{challengeType&&prompts[challengeType]}</span>
  {challengeType==="spell"&&<>
   {item.partOfSpeech&&<span className="context" style={{display:"inline-block",margin:"0 0 10px",padding:"3px 10px"}}>{item.partOfSpeech}</span>}
   <p className="lead" style={{margin:"0 0 14px"}}>{spellHint(item.form)}</p>
   <input className="text-input" value={spelling} onChange={event=>setSpelling(event.target.value)} disabled={Boolean(checked)} placeholder="輸入英文拼字" onKeyDown={event=>event.key==="Enter"&&checkSpelling()}/>
   {!checked&&<button className="primary" onClick={checkSpelling} disabled={!spelling.trim()}>檢查拼字</button>}
  </>}
  {challengeType==="dictation"&&<>
   <button aria-label="播放發音" onClick={playWord} style={{border:0,borderRadius:16,background:"var(--mint)",color:"var(--ink)",cursor:"pointer",padding:"12px 18px",fontWeight:800,marginBottom:14}}>🔊 播放發音</button>
   {item.partOfSpeech&&<span className="context" style={{display:"inline-block",margin:"0 0 10px",padding:"3px 10px"}}>{item.partOfSpeech}</span>}
   <input className="text-input" value={spelling} onChange={event=>setSpelling(event.target.value)} disabled={Boolean(checked)} placeholder="輸入聽到的英文拼字"/>
   <div className="options">{options.map(label=><button key={label} className={`option${selectedOption===label?" selected":""}`} disabled={Boolean(checked)} onClick={()=>setSelectedOption(label)}>{label}</button>)}</div>
   {!checked&&<button className="primary" onClick={checkDictation} disabled={!spelling.trim()||!selectedOption}>檢查答案</button>}
  </>}
  {(challengeType==="recognize_en"||challengeType==="recognize_zh")&&<div className="options">{options.map(label=><button key={label} className={`option${selectedOption===label?" selected":""}`} disabled={Boolean(checked)} onClick={()=>checkOption(label)}>{label}</button>)}</div>}
  {checked&&<>
   <button className="primary" onClick={acknowledge}>下一個</button>
   <div className={`feedback ${checked.correct?"correct":"wrong"}`} role="status"><strong>{checked.correct?"答對了":"再記一次"}</strong>{!checked.correct&&<div>正確答案：{item.form}{item.translation?`（${item.translation}）`:""}</div>}</div>
   {message&&<p className="context" role="status">{message}</p>}
   <div style={{display:"flex",alignItems:"center",gap:10,marginTop:14}}>{item.partOfSpeech&&<span className="context" style={{margin:0,padding:"3px 10px"}}>{item.partOfSpeech}</span>}<button aria-label="播放發音" onClick={speak} style={{border:0,borderRadius:"50%",width:36,height:36,background:"var(--mint)",color:"var(--ink)",cursor:"pointer"}}>🔊</button></div>
   {item.example&&<p className="context"><strong>{item.example}</strong>{item.exampleTranslation&&<><br/><span>{item.exampleTranslation}</span></>}</p>}
  </>}
 </section>
 </main>
}
