"use client";
import { useEffect,useState } from "react";
import Link from "next/link";

type Progress={completedUnits:number;inProgressUnits:number;vocabulary:{total:number;learned:number;dueToday:number;averageProficiency:number;completedToday:number}};
type Course={id:string;title:string;totalUnits:number;completedUnits:number};

export function HomeDashboard(){
 const[progress,setProgress]=useState<Progress|null>(null);
 const[courses,setCourses]=useState<Course[]|null>(null);

 useEffect(()=>{
  let active=true;
  fetch("/api/progress").then(r=>r.ok?r.json():null).then((data:Progress|null)=>{if(active)setProgress(data)}).catch(()=>{});
  fetch("/api/courses").then(r=>r.ok?r.json():null).then((data:{courses:Course[]}|null)=>{if(active)setCourses(data?.courses??[])}).catch(()=>{if(active)setCourses([])});
  return()=>{active=false};
 },[]);

 return <main className="shell">
  <header className="brand"><strong>LaLea</strong><span>Language Learning</span></header>
  <p className="eyebrow">今天的小步前進</p>
  <h1>用零散時間，練出能開口的職場英文。</h1>

  <section className="card" aria-label="學習統計">
   <span className="label">你的學習狀況</span>
   {progress===null?<p className="lead">載入中…</p>:<div className="stats">
    <div className="stat"><strong>{progress.completedUnits}</strong><span>完成短課</span></div>
    <div className="stat"><strong>{progress.inProgressUnits}</strong><span>進行中</span></div>
    <div className="stat"><strong>{progress.vocabulary.learned}/{progress.vocabulary.total}</strong><span>詞彙已學會</span></div>
    <div className="stat"><strong>{progress.vocabulary.averageProficiency}</strong><span>平均熟練度</span></div>
    <div className="stat"><strong>{progress.vocabulary.dueToday}</strong><span>待複習詞彙</span></div>
    <div className="stat"><strong>{progress.vocabulary.completedToday}/{progress.vocabulary.total}</strong><span>今日測驗完成度</span></div>
   </div>}
  </section>

  <section className="card" aria-label="課程選擇">
   <span className="label">選一個課程開始會話練習</span>
   {courses===null&&<p className="lead">載入中…</p>}
   {courses!==null&&courses.length===0&&<p className="lead">目前沒有可以練習的課程。</p>}
   {courses&&courses.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
    {courses.map(course=><Link key={course.id} href={`/conversation?course=${course.id}`} className="option" style={{textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",textDecoration:"none"}}>
     <span>{course.title}</span>
     <span className="context" style={{margin:0}}>{course.completedUnits}/{course.totalUnits} 完成</span>
    </Link>)}
   </div>}
  </section>

  <section className="card" aria-label="快速前往">
   <span className="label">或者直接前往</span>
   <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
    <Link href="/vocab" className="pill">詞彙</Link>
    <Link href="/conversation" className="pill">會話</Link>
   </div>
  </section>
 </main>;
}
