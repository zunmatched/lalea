"use client";
import { useEffect,useState } from "react";
import Link from "next/link";

type Course={id:string;title:string;totalUnits:number;completedUnits:number};
type Group={id:string;title:string;courses:Course[]};

export function ConversationGroupPicker({groupId,fallbackTitle}:{groupId:string;fallbackTitle:string}){
 const[group,setGroup]=useState<Group|null|undefined>(undefined);
 useEffect(()=>{
  let active=true;
  fetch("/api/courses").then(r=>r.ok?r.json():null).then((data:{groups:Group[]}|null)=>{if(!active)return;setGroup(data?.groups.find(item=>item.id===groupId)??null)}).catch(()=>{if(active)setGroup(null)});
  return()=>{active=false};
 },[groupId]);

 const title=group?.title??fallbackTitle;
 return <main className="shell">
  <p className="eyebrow">會話 · {title}</p>
  <h1>先選要練習的關卡。</h1>
  <section className="card">
   {group===undefined&&<p className="lead">載入中…</p>}
   {group===null&&<p className="lead">找不到這個課程。</p>}
   {group&&group.courses.length===0&&<p className="lead">這個課程目前沒有可以練習的關卡。</p>}
   {group&&group.courses.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
    {group.courses.map(course=>{const fullyDone=course.totalUnits>0&&course.completedUnits>=course.totalUnits;return <Link key={course.id} href={`/conversation/menu?course=${encodeURIComponent(course.id)}&label=${encodeURIComponent(course.title)}`} className="option" style={{textAlign:"left",textDecoration:"none",display:"flex",flexDirection:"column",gap:4}}>
     <span style={{fontWeight:600}}>{course.title}</span>
     <span style={{color:"var(--muted)",fontSize:13,paddingTop:8,marginTop:2,borderTop:"1px solid var(--line)"}}>{fullyDone?<span style={{color:"#185737",fontWeight:700}}>✓ 已完成</span>:`${course.completedUnits}/${course.totalUnits} 完成`}</span>
    </Link>})}
   </div>}
  </section>
 </main>;
}
