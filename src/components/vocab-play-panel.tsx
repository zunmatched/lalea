"use client";
import { useEffect,useRef,useState } from "react";
import Link from "next/link";
import { repeatModeLabels,RepeatMode,shuffle } from "@/lib/repeat-mode";
import { speakSequence } from "@/lib/speech";
import { useWakeLock,wakeLockStatusLabels } from "@/lib/wake-lock";

type Item={userVocabularyId:string;form:string;partOfSpeech:string|null;translation:string|null;example:string|null;exampleTranslation:string|null};
type Queue={due:Item[];new:Item[]};
type Source={key:string;label:string};

export function VocabPlayPanel({source}:{source:Source}){
 const[items,setItems]=useState<Item[]|null>(null);
 const[index,setIndex]=useState(0);
 const[mode,setMode]=useState<RepeatMode>("loop");
 const modeRef=useRef(mode);
 useEffect(()=>{modeRef.current=mode},[mode]);

 useEffect(()=>{
  let active=true;
  Promise.resolve().then(()=>{if(active)setItems(null)});
  const query=source.key?`?source=${encodeURIComponent(source.key)}`:"";
  fetch(`/api/reviews/queue${query}`).then(r=>r.ok?r.json():{due:[],new:[]}).then((data:Queue)=>{if(active){setItems(shuffle([...data.due,...data.new]));setIndex(0)}}).catch(()=>{if(active)setItems([])});
  return()=>{active=false};
 },[source.key]);
 useEffect(()=>()=>{if("speechSynthesis"in window)window.speechSynthesis.cancel()},[]);

 function selectMode(value:RepeatMode){
  setMode(value);
  if(value==="random"&&items){setItems(shuffle(items));setIndex(0)}
 }
 function advance(auto=false){
  if(!items)return;
  const currentMode=modeRef.current;
  if(auto&&currentMode==="single"){play();return}
  const next=index+1;
  if(next<items.length){setIndex(next);return}
  if(currentMode==="random"){setItems(shuffle(items));setIndex(0);return}
  setIndex(0);
 }
 function goBack(){
  if(!items)return;
  const prev=index-1;
  if(prev>=0){setIndex(prev);return}
  setIndex(items.length-1);
 }

 const item=items?.[index];
 const wakeLockStatus=useWakeLock(Boolean(item));
 const[speaking,setSpeaking]=useState(false);
 const autoAdvanceTimeout=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 function clearAutoAdvance(){if(autoAdvanceTimeout.current){clearTimeout(autoAdvanceTimeout.current);autoAdvanceTimeout.current=undefined}}
 function play(){
  if(!item)return;
  clearAutoAdvance();
  const parts:Array<{text:string;lang:string}>=[{text:item.form,lang:"en-US"}];
  if(item.translation)parts.push({text:item.translation,lang:"zh-TW"});
  if(item.example)parts.push({text:item.example,lang:"en-US"});
  if(item.exampleTranslation)parts.push({text:item.exampleTranslation,lang:"zh-TW"});
  speakSequence(parts,{onEnd:()=>{setSpeaking(false);autoAdvanceTimeout.current=setTimeout(()=>advance(true),600)},onError:()=>setSpeaking(false)});
  setSpeaking(true);
 }
 function togglePlayPause(){
  if(!("speechSynthesis"in window))return;
  const synth=window.speechSynthesis;
  if(speaking){synth.pause();setSpeaking(false);return}
  if(synth.paused&&synth.speaking){synth.resume();setSpeaking(true);return}
  play();
 }
 useEffect(()=>{if(item)play();return clearAutoAdvance},[item?.userVocabularyId]);

 if(items===null)return <main className="shell"><p className="eyebrow">詞彙 · 播放 · {source.label}</p><h1>載入中…</h1></main>;

 if(!item)return <main className="shell finish"><div className="mark">✓</div><p className="eyebrow">播放</p><h1>目前沒有可以播放的內容。</h1><Link href="/vocab" className="primary resume" style={{display:"inline-block",textAlign:"center",textDecoration:"none"}}>返回選單</Link></main>;

 return <main className="shell">
  <p className="eyebrow">詞彙 · 播放 · {source.label}</p>
  <h1>不用作答，聽過去就好。</h1>
  <div className="pills">
   {(Object.keys(repeatModeLabels) as RepeatMode[]).map(value=><button key={value} className="pill" aria-pressed={mode===value} onClick={()=>selectMode(value)}>{repeatModeLabels[value]}</button>)}
  </div>
  <p className="lead" style={{margin:"10px 0 0"}}>{wakeLockStatusLabels[wakeLockStatus]}</p>
  <section className="card">
   <span className="label">{index+1} / {items.length}</span>
   <h1 style={{fontSize:30}}>{item.form}</h1>
   {item.partOfSpeech&&<span className="context" style={{display:"inline-block",margin:"0 0 10px",padding:"3px 10px"}}>{item.partOfSpeech}</span>}
   {item.translation&&<p className="context"><strong>{item.translation}</strong></p>}
   {item.example&&<p className="context">{item.example}{item.exampleTranslation&&<><br/><span>{item.exampleTranslation}</span></>}</p>}
   <div style={{display:"flex",gap:10,marginTop:14}}>
    <button onClick={goBack} style={{flex:1,border:"1px solid var(--line)",borderRadius:16,background:"white",color:"var(--ink)",cursor:"pointer",padding:"12px 10px",fontWeight:800}}>上一個</button>
    <button aria-label={speaking?"暫停":"播放"} onClick={togglePlayPause} style={{flex:1,border:0,borderRadius:16,background:"var(--mint)",color:"var(--ink)",cursor:"pointer",padding:"12px 10px",fontWeight:800,whiteSpace:"nowrap"}}>{speaking?"Ⅱ 暫停":"▶ 播放"}</button>
    <button className="primary" onClick={()=>advance()} style={{flex:1}}>下一個</button>
   </div>
   <Link href="/vocab" onClick={()=>{if("speechSynthesis"in window)window.speechSynthesis.cancel()}} style={{marginTop:14,background:"none",border:0,textDecoration:"underline",cursor:"pointer",padding:0,display:"inline-block"}}>結束播放，返回選單</Link>
  </section>
 </main>;
}
