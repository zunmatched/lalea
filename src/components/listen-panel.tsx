"use client";
import { useEffect,useState } from "react";
import { AudioPlayer } from "./audio-player";
import { repeatModeLabels,RepeatMode,shuffle } from "@/lib/repeat-mode";

type Item={id:string;exerciseId:string;text:string;translation:string|null;status:string;url:string|null;voice:string|null;durationMs:number|null;category:string};
const categoryLabels:Record<string,string>={due:"到期複習",weak:"弱項加強",recent:"最近學過",new:"新內容"};

export function ListenPanel(){
 const[items,setItems]=useState<Item[]|null>(null);
 const[index,setIndex]=useState(0);
 const[mode,setMode]=useState<RepeatMode>("single");
 const[hasStarted,setHasStarted]=useState(false);

 useEffect(()=>{
  let active=true;
  fetch("/api/listen/queue").then(r=>r.ok?r.json():{items:[]}).then(result=>{if(active)setItems(result.items)}).catch(()=>{if(active)setItems([])});
  return()=>{active=false};
 },[]);

 function selectMode(value:RepeatMode){
  setMode(value);
  if(value==="random"&&items)setItems(shuffle(items));
 }
 function advance(){
  if(!items)return;
  setHasStarted(true);
  const next=index+1;
  if(next<items.length){setIndex(next);return}
  if(mode==="loop"){setIndex(0);return}
  if(mode==="random"){setItems(shuffle(items));setIndex(0);return}
  setIndex(next);
 }
 function goBack(){
  if(!items)return;
  setHasStarted(true);
  const prev=index-1;
  if(prev>=0){setIndex(prev);return}
  if(mode==="loop"||mode==="random")setIndex(items.length-1);
 }

 const item=items?.[index];

 if(items===null)return <main className="shell"><p className="eyebrow">會話 · 播放</p><h1>不盯著螢幕，也能複習。</h1><section className="card">載入中…</section></main>;

 if(items.length===0)return <main className="shell"><p className="eyebrow">會話 · 播放</p><h1>不盯著螢幕，也能複習。</h1><section className="card"><h2>目前沒有合適的播放內容</h2><p className="lead">先完成一堂短課，避免清單全部都是未學內容。</p></section></main>;

 if(!item)return <main className="shell finish"><div className="mark">✓</div><p className="eyebrow">播放完畢</p><h1>這輪的內容都播完了。</h1><button className="primary resume" onClick={()=>setIndex(0)}>從頭再播一次</button></main>;

 return <main className="shell">
  <p className="eyebrow">會話 · 播放</p>
  <h1>不盯著螢幕，也能複習。</h1>
  <p className="lead">依序播放到期聽力、弱項與最近內容；新內容最多佔 20%。</p>
  <div className="pills">
   {(Object.keys(repeatModeLabels) as RepeatMode[]).map(value=><button key={value} className="pill" aria-pressed={mode===value} onClick={()=>selectMode(value)}>{repeatModeLabels[value]}</button>)}
  </div>
  <section className="card">
   <span className="label">{index+1} / {items.length} · {categoryLabels[item.category]??item.category}</span>
   <AudioPlayer key={item.id} exerciseId={item.exerciseId} text={item.text} asset={item} autoPlay={hasStarted} onComplete={advance}/>
   {item.translation&&<p className="context">{item.translation}</p>}
   <div style={{display:"flex",gap:10,marginTop:14}}>
    <button onClick={goBack} disabled={mode==="single"&&index===0} style={{flex:1,border:"1px solid var(--line)",borderRadius:16,background:"white",color:"var(--ink)",cursor:"pointer",padding:"12px 18px",fontWeight:800}}>上一個</button>
    <button className="primary" onClick={advance} style={{flex:1}}>下一個</button>
   </div>
  </section>
 </main>;
}
