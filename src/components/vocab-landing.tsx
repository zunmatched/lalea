"use client";
import { useEffect,useState } from "react";
import Link from "next/link";

type Source={key:string;label:string;due:number;new:number};

export function VocabLanding(){
 const[sources,setSources]=useState<Source[]|null>(null);
 useEffect(()=>{let active=true;fetch("/api/reviews/sources").then(r=>r.ok?r.json():null).then((data:{sources:Source[]}|null)=>{if(active)setSources(data?.sources??[])}).catch(()=>{if(active)setSources([])});return()=>{active=false}},[]);

 return <main className="shell">
  <p className="eyebrow">詞彙</p>
  <h1>先選要練習的關卡。</h1>
  <section className="card">
   {sources===null&&<p className="lead">載入中…</p>}
   {sources!==null&&sources.length===0&&<p className="lead">目前沒有可以練習的詞彙。</p>}
   {sources!==null&&sources.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
    {sources.map(source=><Link key={source.key||"all"} href={`/vocab/menu?source=${encodeURIComponent(source.key)}&label=${encodeURIComponent(source.label)}`} className="option" style={{textAlign:"left",textDecoration:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
     <span>{source.label}</span>
     <span className="context" style={{margin:0}}>待複習 {source.due} · 新字 {source.new}</span>
    </Link>)}
   </div>}
  </section>
 </main>;
}
