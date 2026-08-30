"use client";
import { useEffect,useState } from "react";
import Link from "next/link";

type Source={key:string;label:string;totalWords:number;proficiency:number};
type Group={id:string;slug:string;title:string;sources:Source[]};

export function VocabLanding(){
 const[groups,setGroups]=useState<Group[]|null>(null);
 useEffect(()=>{let active=true;fetch("/api/reviews/sources").then(r=>r.ok?r.json():null).then((data:{groups:Group[]}|null)=>{if(active)setGroups(data?.groups??[])}).catch(()=>{if(active)setGroups([])});return()=>{active=false}},[]);

 return <main className="shell">
  <p className="eyebrow">詞彙</p>
  <h1>先選要練習的課程。</h1>
  <section className="card">
   {groups===null&&<p className="lead">載入中…</p>}
   {groups!==null&&groups.length===0&&<p className="lead">目前沒有可以練習的詞彙。</p>}
   {groups!==null&&groups.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
    {groups.map(group=><Link key={group.id} href={`/vocab/group?group=${encodeURIComponent(group.id)}&title=${encodeURIComponent(group.title)}`} className="option" style={{textAlign:"left",textDecoration:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
     <span>{group.title}</span>
     <span className="context" style={{margin:0}}>{group.sources.length} 個關卡</span>
    </Link>)}
   </div>}
  </section>
 </main>;
}
