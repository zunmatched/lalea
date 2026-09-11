"use client";
import { useEffect,useState } from "react";
import Link from "next/link";

type Source={key:string;label:string;totalWords:number;proficiency:number;everMasteredCount:number;spellDoneToday:number;dictationDoneToday:number};
type Group={id:string;title:string;sources:Source[]};

export function VocabGroupPicker({groupId,fallbackTitle}:{groupId:string;fallbackTitle:string}){
 const[group,setGroup]=useState<Group|null|undefined>(undefined);
 const[proficiencyMax,setProficiencyMax]=useState(3);
 useEffect(()=>{
  let active=true;
  fetch("/api/reviews/sources").then(r=>r.ok?r.json():null).then((data:{groups:Group[];proficiencyMax:number}|null)=>{if(!active)return;setGroup(data?.groups.find(item=>item.id===groupId)??null);if(data)setProficiencyMax(data.proficiencyMax)}).catch(()=>{if(active)setGroup(null)});
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
    {group.sources.map(source=>{const fullyDone=source.everMasteredCount>=source.totalWords;const partlyDone=source.everMasteredCount>0&&!fullyDone;const doneToday=source.totalWords>0&&source.spellDoneToday>=source.totalWords&&source.dictationDoneToday>=source.totalWords;
     const status=fullyDone?<span style={{color:"#185737",fontWeight:700}}>○ 已完成</span>:doneToday?<span style={{color:"var(--green)",fontWeight:700}}>✓ 今日已完成</span>:partlyDone?<span style={{color:"#185737",fontWeight:700}}>✓ 部分完成 {source.everMasteredCount}/{source.totalWords}</span>:null;
     return <Link key={source.key} href={`/vocab/menu?source=${encodeURIComponent(source.key)}&label=${encodeURIComponent(source.label)}`} className="option" style={{textAlign:"left",textDecoration:"none",display:"flex",flexDirection:"column",gap:4}}>
     <span style={{fontWeight:600}}>{source.label}</span>
     <span style={{color:"var(--muted)",fontSize:13,paddingTop:8,marginTop:2,borderTop:"1px solid var(--line)"}}>共 {source.totalWords} 字 · 複習頻率 {source.proficiency}/{proficiencyMax}{status&&<> · {status}</>}</span>
    </Link>})}
   </div>}
  </section>
 </main>;
}
