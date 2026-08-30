"use client";
import { useEffect,useState } from "react";
import Link from "next/link";

type Source={key:string;label:string;totalWords:number;proficiency:number};
type Group={id:string;title:string;sources:Source[]};

export function VocabGroupPicker({groupId,fallbackTitle}:{groupId:string;fallbackTitle:string}){
 const[group,setGroup]=useState<Group|null|undefined>(undefined);
 useEffect(()=>{
  let active=true;
  fetch("/api/reviews/sources").then(r=>r.ok?r.json():null).then((data:{groups:Group[]}|null)=>{if(!active)return;setGroup(data?.groups.find(item=>item.id===groupId)??null)}).catch(()=>{if(active)setGroup(null)});
  return()=>{active=false};
 },[groupId]);

 const title=group?.title??fallbackTitle;
 return <main className="shell">
  <p className="eyebrow">詞彙 · {title}</p>
  <h1>先選要練習的關卡。</h1>
  <section className="card">
   {group===undefined&&<p className="lead">載入中…</p>}
   {group===null&&<p className="lead">找不到這個課程。</p>}
   {group&&group.sources.length===0&&<p className="lead">這個課程目前沒有可以練習的詞彙。</p>}
   {group&&group.sources.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
    {group.sources.map(source=><Link key={source.key} href={`/vocab/menu?source=${encodeURIComponent(source.key)}&label=${encodeURIComponent(source.label)}`} className="option" style={{textAlign:"left",textDecoration:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
     <span>{source.label}</span>
     <span className="context" style={{margin:0}}>熟悉度 {source.proficiency}/5 · 共 {source.totalWords} 字</span>
    </Link>)}
   </div>}
  </section>
 </main>;
}
