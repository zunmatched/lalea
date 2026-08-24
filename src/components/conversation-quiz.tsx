"use client";
import { useEffect,useMemo,useState } from "react";
import { AudioPlayer } from "./audio-player";
import { randomUUID } from "@/lib/client-id";

type Option={id:string;text:string};
type Asset={id:string;status:string;url:string|null;voice:string|null;durationMs:number|null};
type Exercise={id:string;position:number;type:string;prompt:string;content:{context?:string;speech?:string;options?:Option[];audio?:Asset}};
type Run={id:string;currentPosition:number;status:string;exercises:Exercise[]};
type Feedback={isCorrect:boolean;correctIds:string[];message:string};
type Course={id:string;title:string;totalUnits:number;completedUnits:number};

export function ConversationQuiz({courseId}:{courseId?:string}){
 const[courses,setCourses]=useState<Course[]|null>(null);
 const[screen,setScreen]=useState<"picker"|"loading"|"lesson"|"done">(courseId?"loading":"picker");
 const[run,setRun]=useState<Run|null>(null);
 const[index,setIndex]=useState(0);
 const[selected,setSelected]=useState<string[]>([]);
 const[feedback,setFeedback]=useState<Feedback|null>(null);
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState("");
 const[correct,setCorrect]=useState(0);
 const exercise=run?.exercises[index];
 const optionMap=useMemo(()=>new Map(exercise?.content.options?.map(option=>[option.id,option.text])??[]),[exercise]);

 useEffect(()=>{
  let active=true;
  fetch("/api/courses").then(r=>r.ok?r.json():null).then((data:{courses:Course[]}|null)=>{if(active)setCourses(data?.courses??[])}).catch(()=>{if(active)setCourses([])});
  return()=>{active=false};
 },[]);
 useEffect(()=>{if(courseId)startCourse(courseId)},[courseId]);

 async function startCourse(id:string){
  setScreen("loading");setBusy(true);setError("");
  try{
   const created=await fetch("/api/unit-runs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({courseId:id})});
   if(!created.ok)throw new Error("目前無法開始這個課程，請確認資料庫已啟動。");
   const{id:runId}=await created.json();
   const response=await fetch(`/api/unit-runs/${runId}`);
   if(!response.ok)throw new Error("無法載入課程內容。");
   const data:Run=await response.json();
   setRun(data);setIndex(Math.min(Math.max(data.currentPosition,0),Math.max(data.exercises.length-1,0)));
   setSelected([]);setFeedback(null);setCorrect(0);setScreen("lesson");
  }catch(cause){setError(cause instanceof Error?cause.message:"發生未預期錯誤。");setScreen("picker")}
  finally{setBusy(false)}
 }

 function choose(id:string){
  if(feedback)return;
  if(exercise?.type==="chunk_ordering")setSelected(value=>value.includes(id)?value.filter(item=>item!==id):[...value,id]);
  else setSelected([id]);
 }
 async function submit(){
  if(!run||!exercise||!selected.length)return;setBusy(true);setError("");
  try{
   const response=await fetch("/api/exercise-attempts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({unitRunId:run.id,exerciseId:exercise.id,clientEventId:randomUUID(),selectedIds:selected,displayOrder:exercise.content.options?.map(option=>option.id)??[]})});
   if(!response.ok)throw new Error("答案送出失敗，請再試一次。");
   const result:Feedback=await response.json();
   setFeedback(result);
   if(result.isCorrect)setCorrect(value=>value+1);
  }catch(cause){setError(cause instanceof Error?cause.message:"答案送出失敗。")}
  finally{setBusy(false)}
 }
 async function next(){
  if(!run||!feedback)return;
  if(index<run.exercises.length-1){setIndex(value=>value+1);setSelected([]);setFeedback(null);return}
  setBusy(true);
  const response=await fetch(`/api/unit-runs/${run.id}/complete`,{method:"POST"});
  setBusy(false);
  if(response.ok)setScreen("done");
  else setError("課程完成狀態未能儲存，請再試一次。");
 }

 if(screen==="picker")return <main className="shell">
  <p className="eyebrow">會話 · 測驗</p>
  <h1>先選要練習的課程。</h1>
  <section className="card">
   {courses===null&&<p className="lead">載入中…</p>}
   {courses!==null&&courses.length===0&&<p className="lead">目前沒有可以練習的課程。</p>}
   {courses&&courses.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
    {courses.map(course=><button key={course.id} className="option" onClick={()=>startCourse(course.id)} style={{textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
     <span>{course.title}</span>
     <span className="context" style={{margin:0}}>{course.completedUnits}/{course.totalUnits} 完成</span>
    </button>)}
   </div>}
   {error&&<p className="error" role="alert">{error}</p>}
  </section>
 </main>;

 if(screen==="loading")return <main className="shell"><p className="eyebrow">會話 · 測驗</p><h1>準備課程中…</h1><section className="card">載入中…</section></main>;

 if(screen==="done")return <main className="shell finish">
  <div className="mark">✓</div><p className="eyebrow">短課完成</p>
  <h1>做得好，這些內容已加入你的學習進度。</h1>
  <div className="stats"><div className="stat"><strong>{correct}/{run?.exercises.length}</strong><span>答對</span></div></div>
  <button className="primary" onClick={()=>{setRun(null);setCorrect(0);setScreen("picker")}}>選別的課程</button>
 </main>;

 if(!exercise||!run)return null;
 const chunks=exercise.type==="chunk_ordering";
 return <main className="shell">
  <div className="lesson-head"><div><p className="eyebrow">會話 · 測驗</p><strong>{index+1} / {run.exercises.length}</strong></div></div>
  <div className="progress" aria-label="課程進度"><div style={{width:`${(index+1)/run.exercises.length*100}%`}}/></div>
  <section className="card">
   <h1 style={{fontSize:25}}>{exercise.prompt}</h1>
   {exercise.content.context&&<p className="context">{exercise.content.context}</p>}
   {exercise.type==="listening_choice"&&exercise.content.speech&&<AudioPlayer exerciseId={exercise.id} text={exercise.content.speech} asset={exercise.content.audio}/>}
   {chunks&&<div className="answer-line">{selected.map(id=>optionMap.get(id)).join(" ")||"依序點選句塊…"}</div>}
   <div className={chunks?"chunks":"options"}>{exercise.content.options?.map(option=><button key={option.id} className={`${chunks?"chunk":"option"}${selected.includes(option.id)?" selected":""}`} onClick={()=>choose(option.id)} disabled={Boolean(feedback)}>{option.text}</button>)}</div>
   {error&&<p className="error" role="alert">{error}</p>}
   {!feedback?<button className="primary" onClick={submit} disabled={busy||!selected.length}>{busy?"送出中…":"確認答案"}</button>:<button className="primary" onClick={next} disabled={busy}>{index===run.exercises.length-1?"完成短課":"下一題"}</button>}
   {feedback&&<div className={`feedback ${feedback.isCorrect?"correct":"wrong"}`} role="status"><strong>{feedback.isCorrect?"答對了":"再記一次"}</strong><div>{feedback.message}</div>{!feedback.isCorrect&&<div>正確答案：{feedback.correctIds.map(id=>optionMap.get(id)??id).join(" ")}</div>}</div>}
  </section>
 </main>;
}
