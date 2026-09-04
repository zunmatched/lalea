"use client";
import { useEffect,useRef,useState } from "react";
import { AudioPlayer } from "./audio-player";
import { repeatModeLabels,RepeatMode,shuffle } from "@/lib/repeat-mode";
import { useWakeLock,wakeLockStatusLabels } from "@/lib/wake-lock";

type Item={id:string;exerciseId:string;text:string;translation:string|null;status:string;url:string|null;voice:string|null;durationMs:number|null;category:string};
const categoryLabels:Record<string,string>={due:"到期複習",weak:"弱項加強",recent:"最近學過",new:"新內容"};

export function ListenPanel({course}:{course:{key:string;label:string}}){
 const[items,setItems]=useState<Item[]|null>(null);
 const[index,setIndex]=useState(0);
 const[mode,setMode]=useState<RepeatMode>("loop");
 const modeRef=useRef(mode);
 useEffect(()=>{modeRef.current=mode},[mode]);
 const[hasStarted,setHasStarted]=useState(false);
 const[replayTick,setReplayTick]=useState(0);
 const[wakeLockStatus,retryWakeLock]=useWakeLock(Boolean(items&&items.length>0));

 useEffect(()=>{
  let active=true;
  fetch(`/api/listen/queue?course=${encodeURIComponent(course.key)}`).then(r=>r.ok?r.json():{items:[]}).then(result=>{if(active)setItems(result.items)}).catch(()=>{if(active)setItems([])});
  return()=>{active=false};
 },[course.key]);

 function selectMode(value:RepeatMode){
  setMode(value);
  if(value==="random"&&items){setItems(shuffle(items));setIndex(0)}
 }
 function advance(auto=false){
  if(!items)return;
  setHasStarted(true);
  const currentMode=modeRef.current;
  if(auto&&currentMode==="single"){setReplayTick(value=>value+1);return}
  const next=index+1;
  if(next<items.length){setIndex(next);return}
  if(currentMode==="random"){setItems(shuffle(items));setIndex(0);return}
  setIndex(0);
 }
 function goBack(){
  if(!items)return;
  setHasStarted(true);
  const prev=index-1;
  if(prev>=0){setIndex(prev);return}
  setIndex(items.length-1);
 }

 if(items===null)return <main className="shell"><p className="eyebrow">會話 · {course.label}</p><h1>不盯著螢幕，也能複習。</h1><section className="card">載入中…</section></main>;

 if(items.length===0)return <main className="shell"><p className="eyebrow">會話 · {course.label}</p><h1>不盯著螢幕，也能複習。</h1><section className="card"><h2>目前沒有合適的播放內容</h2><p className="lead">先完成一堂短課，避免清單全部都是未學內容。</p></section></main>;

 const item=items[index];
 if(!item)return null;

 return <main className="shell">
  <p className="eyebrow">會話 · {course.label}</p>
  <h1>不盯著螢幕，也能複習。</h1>
  <p className="lead">依序播放到期聽力、弱項與最近內容；新內容最多佔 20%。</p>
  <div className="pills">
   {(Object.keys(repeatModeLabels) as RepeatMode[]).map(value=><button key={value} className="pill" aria-pressed={mode===value} onClick={()=>selectMode(value)}>{repeatModeLabels[value]}</button>)}
  </div>
  {wakeLockStatus==="active"||wakeLockStatus==="unsupported"
   ?<p className="lead" style={{margin:"10px 0 0"}}>{wakeLockStatusLabels[wakeLockStatus]}</p>
   :<button onClick={retryWakeLock} className="lead" style={{margin:"10px 0 0",background:"none",border:0,padding:0,font:"inherit",color:"inherit",textDecoration:"underline",cursor:"pointer"}}>{wakeLockStatusLabels[wakeLockStatus]}</button>}
  <section className="card">
   <span className="label">{index+1} / {items.length} · {categoryLabels[item.category]??item.category}</span>
   <AudioPlayer key={`${item.id}-${replayTick}`} exerciseId={item.exerciseId} text={item.text} asset={item} autoPlay={hasStarted} onComplete={()=>advance(true)} onPrevious={goBack} onNext={()=>advance()}/>
   {item.translation&&<p className="context">{item.translation}</p>}
   <div style={{display:"flex",gap:10,marginTop:14}}>
    <button onClick={goBack} style={{flex:1,border:"1px solid var(--line)",borderRadius:16,background:"white",color:"var(--ink)",cursor:"pointer",padding:"12px 18px",fontWeight:800}}>上一個</button>
    <button className="primary" onClick={()=>advance()} style={{flex:1}}>下一個</button>
   </div>
  </section>
 </main>;
}
