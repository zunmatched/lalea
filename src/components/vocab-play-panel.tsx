"use client";
import { useEffect,useState } from "react";
import { speakSequence } from "@/lib/speech";

type Item={userVocabularyId:string;form:string;partOfSpeech:string|null;translation:string|null;example:string|null;exampleTranslation:string|null};
type Queue={due:Item[];new:Item[]};
type Source={key:string;label:string;due:number;new:number};

export function VocabPlayPanel(){
 const[sources,setSources]=useState<Source[]|null>(null);
 const[activeSource,setActiveSource]=useState<Source|null>(null);
 const[items,setItems]=useState<Item[]|null>(null);
 const[index,setIndex]=useState(0);

 useEffect(()=>{
  let active=true;
  fetch("/api/reviews/sources").then(r=>r.ok?r.json():null).then((data:{sources:Source[]}|null)=>{if(active)setSources(data?.sources??[])}).catch(()=>{if(active)setSources([])});
  return()=>{active=false};
 },[]);

 async function startSource(source:Source){
  setActiveSource(source);setItems(null);
  const query=source.key?`?source=${encodeURIComponent(source.key)}&more=1`:"?more=1";
  const response=await fetch(`/api/reviews/queue${query}`).catch(()=>null);
  const data:Queue=response&&response.ok?await response.json():{due:[],new:[]};
  setItems([...data.due,...data.new]);setIndex(0);
 }
 function backToMenu(){
  if("speechSynthesis"in window)window.speechSynthesis.cancel();
  setActiveSource(null);setItems(null);
  setSources(null);
  fetch("/api/reviews/sources").then(r=>r.ok?r.json():null).then((data:{sources:Source[]}|null)=>setSources(data?.sources??[])).catch(()=>setSources([]));
 }

 const item=items?.[index];
 function play(){
  if(!item)return;
  const parts:Array<{text:string;lang:string}>=[{text:item.form,lang:"en-US"}];
  if(item.translation)parts.push({text:item.translation,lang:"zh-TW"});
  if(item.example)parts.push({text:item.example,lang:"en-US"});
  if(item.exampleTranslation)parts.push({text:item.exampleTranslation,lang:"zh-TW"});
  speakSequence(parts);
 }
 useEffect(()=>{if(item)play()},[item?.userVocabularyId]);

 if(!activeSource){
  return <main className="shell">
   <p className="eyebrow">詞彙 · 播放</p>
   <h1>先選要播放的內容。</h1>
   <section className="card">
    {sources===null&&<p className="lead">載入中…</p>}
    {sources!==null&&sources.length===0&&<p className="lead">目前沒有可以播放的詞彙。</p>}
    {sources!==null&&sources.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
     {sources.map(source=><button key={source.key||"all"} className="option" onClick={()=>startSource(source)} style={{textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span>{source.label}</span>
      <span className="context" style={{margin:0}}>共 {source.due+source.new} 字</span>
     </button>)}
    </div>}
   </section>
  </main>;
 }

 if(items===null)return <main className="shell"><p className="eyebrow">詞彙 · 播放 · {activeSource.label}</p><h1>載入中…</h1></main>;

 if(!item)return <main className="shell finish"><div className="mark">✓</div><p className="eyebrow">播放完畢</p><h1>{items.length===0?"目前沒有可以播放的內容。":"這輪的內容都播完了。"}</h1><button className="primary resume" onClick={backToMenu}>返回選單</button></main>;

 return <main className="shell">
  <p className="eyebrow">詞彙 · 播放 · {activeSource.label}</p>
  <h1>不用作答，聽過去就好。</h1>
  <section className="card">
   <span className="label">{index+1} / {items.length}</span>
   <h1 style={{fontSize:30}}>{item.form}</h1>
   {item.partOfSpeech&&<span className="context" style={{display:"inline-block",margin:"0 0 10px",padding:"3px 10px"}}>{item.partOfSpeech}</span>}
   {item.translation&&<p className="context"><strong>{item.translation}</strong></p>}
   {item.example&&<p className="context">{item.example}{item.exampleTranslation&&<><br/><span>{item.exampleTranslation}</span></>}</p>}
   <div style={{display:"flex",gap:10,marginTop:14}}>
    <button aria-label="重播" onClick={play} style={{border:0,borderRadius:16,background:"var(--mint)",color:"var(--ink)",cursor:"pointer",padding:"12px 18px",fontWeight:800}}>🔊 重播</button>
    <button className="primary" onClick={()=>setIndex(value=>value+1)}>下一個</button>
   </div>
  </section>
 </main>;
}
