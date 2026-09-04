"use client";
import { useEffect,useState } from "react";
import Link from "next/link";

type Course={id:string;title:string;totalUnits:number;completedUnits:number};
type Group={id:string;title:string;courses:Course[]};

export function ConversationLanding(){
 const[groups,setGroups]=useState<Group[]|null>(null);
 useEffect(()=>{let active=true;fetch("/api/courses").then(r=>r.ok?r.json():null).then((data:{groups:Group[]}|null)=>{if(active)setGroups(data?.groups??[])}).catch(()=>{if(active)setGroups([])});return()=>{active=false}},[]);

 return <main className="shell">
  <p className="eyebrow">會話</p>
  <h1>先選要練習的課程。</h1>
  <section className="card">
   {groups===null&&<p className="lead">載入中…</p>}
   {groups!==null&&groups.length===0&&<p className="lead">目前沒有可以練習的課程。</p>}
   {groups!==null&&groups.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
    {groups.map(group=><Link key={group.id} href={`/conversation/group?group=${encodeURIComponent(group.id)}&title=${encodeURIComponent(group.title)}`} className="option" style={{textAlign:"left",textDecoration:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
     <span>{group.title}</span>
     <span className="context" style={{margin:0}}>{group.courses.length} 個關卡</span>
    </Link>)}
   </div>}
  </section>
 </main>;
}
