"use client";
import { useEffect,useState } from "react";
import Link from "next/link";

type Source={key:string;label:string;totalWords:number;proficiency:number;everMasteredCount:number;spellDoneToday:number;dictationDoneToday:number};
type Group={id:string;title:string;sources:Source[]};

function SourceRow({source,proficiencyMax}:{source:Source;proficiencyMax:number}){
 const fullyDone=source.everMasteredCount>=source.totalWords;const partlyDone=source.everMasteredCount>0&&!fullyDone;const doneToday=source.totalWords>0&&source.spellDoneToday>=source.totalWords&&source.dictationDoneToday>=source.totalWords;
 const status=fullyDone?<span style={{color:"#185737",fontWeight:700}}>○ 已完成</span>:doneToday?<span style={{color:"var(--green)",fontWeight:700}}>✓ 今日已完成</span>:partlyDone?<span style={{color:"#185737",fontWeight:700}}>✓ 部分完成 {source.everMasteredCount}/{source.totalWords}</span>:null;
 return <Link href={`/vocab/menu?source=${encodeURIComponent(source.key)}&label=${encodeURIComponent(source.label)}`} className="option" style={{textAlign:"left",textDecoration:"none",display:"flex",flexDirection:"column",gap:4}}>
  <span style={{fontWeight:600}}>{source.label}</span>
  <span style={{color:"var(--muted)",fontSize:13,paddingTop:8,marginTop:2,borderTop:"1px solid var(--line)"}}>共 {source.totalWords} 字 · 複習頻率 {source.proficiency}/{proficiencyMax}{status&&<> · {status}</>}</span>
 </Link>;
}

export function VocabGroupPicker({groupId,fallbackTitle}:{groupId:string;fallbackTitle:string}){
 const[group,setGroup]=useState<Group|null|undefined>(undefined);
 const[proficiencyMax,setProficiencyMax]=useState(3);
 const[tab,setTab]=useState<"pending"|"done">("pending");
 useEffect(()=>{
  let active=true;
  fetch("/api/reviews/sources").then(r=>r.ok?r.json():null).then((data:{groups:Group[];proficiencyMax:number}|null)=>{if(!active)return;setGroup(data?.groups.find(item=>item.id===groupId)??null);if(data)setProficiencyMax(data.proficiencyMax)}).catch(()=>{if(active)setGroup(null)});
  return()=>{active=false};
 },[groupId]);

 const title=group?.title??fallbackTitle;
 const pending=group?.sources.filter(source=>source.everMasteredCount<source.totalWords)??[];
 // 已完成不用管複習頻率，用預設（依名稱）排序就好
 const done=group?.sources.filter(source=>source.everMasteredCount>=source.totalWords).sort((a,b)=>a.label.localeCompare(b.label))??[];
 const shown=tab==="pending"?pending:done;
 return <main className="shell">
  <p className="eyebrow">詞彙 · {title}</p>
  <h1>先選要練習的關卡。</h1>
  {group&&group.sources.length>0&&<div className="pills">
   <button className="pill" aria-pressed={tab==="pending"} onClick={()=>setTab("pending")}>未完成 · {pending.length}</button>
   <button className="pill" aria-pressed={tab==="done"} onClick={()=>setTab("done")}>已完成 · {done.length}</button>
  </div>}
  <section className="card">
   {group===undefined&&<p className="lead">載入中…</p>}
   {group===null&&<p className="lead">找不到這個課程。</p>}
   {group&&group.sources.length===0&&<p className="lead">這個課程目前沒有可以練習的詞彙。</p>}
   {group&&group.sources.length>0&&shown.length===0&&<p className="lead">{tab==="pending"?"這個課程都已經完成了。":"這個課程還沒有完成的關卡。"}</p>}
   {group&&shown.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
    {shown.map(source=><SourceRow key={source.key} source={source} proficiencyMax={proficiencyMax}/>)}
   </div>}
  </section>
 </main>;
}
