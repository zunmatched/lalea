"use client";
import { useEffect, useState } from "react";
type Item={id:string;canonicalForm:string;definition:string;translation:string|null;status:string};
type Match={id:string;canonicalForm:string;definition:string;partOfSpeech:string|null};
export function VocabularyPanel({onBack}:{onBack:()=>void}){
 const[items,setItems]=useState<Item[]>([]);const[rawText,setRawText]=useState("");const[sentence,setSentence]=useState("");const[matches,setMatches]=useState<Match[]>([]);const[message,setMessage]=useState("");const[busy,setBusy]=useState(false);
 async function load(){const response=await fetch("/api/vocabulary");if(response.ok)setItems((await response.json()).items)}
 useEffect(()=>{let active=true;fetch("/api/vocabulary").then(response=>response.ok?response.json():{items:[]}).then(result=>{if(active)setItems(result.items)}).catch(()=>null);return()=>{active=false}},[]);
 async function submit(selectedSenseId?:string){
  if(!rawText.trim())return;setBusy(true);setMessage("");
  const response=await fetch("/api/vocabulary/injections",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rawText,originalSentence:sentence||undefined,selectedSenseId})});const result=await response.json();setBusy(false);
  if(result.status==="needs_selection"){setMatches(result.matches);setMessage("找到多個詞義，請選擇這次遇到的意思。");return}
  if(result.status==="needs_enrichment"){setMatches([]);setMessage("已保存，等待補齊與人工審核；目前不會進入正式學習。");return}
  if(result.status==="ready_to_learn"){setMatches([]);setRawText("");setSentence("");setMessage("已加入詞彙庫，將安排首次學習。");await load()}
 }
 const unique=[...new Map(items.map(item=>[item.id,item])).values()];
 const statusLabels:Record<string,string>={ready_to_learn:"等待首次學習",learning:"學習中",learned:"已學會",ignored:"已暫時忽略"};
 const counts=unique.reduce<Record<string,number>>((acc,item)=>{acc[item.status]=(acc[item.status]??0)+1;return acc},{});
 return <main className="shell"><div className="lesson-head"><div><p className="eyebrow">個人詞彙庫</p><h1 style={{fontSize:28}}>保存遇到的單字與片語</h1></div><button onClick={onBack}>返回</button></div><p className="lead">已有詞義會直接加入；未知內容先保存，審核完成前不會進入複習。</p><section className="card"><label className="label" htmlFor="vocabulary">單字或片語</label><input id="vocabulary" className="text-input" value={rawText} onChange={event=>setRawText(event.target.value)} placeholder="例如：keep you posted"/><label className="label field-label" htmlFor="sentence">遇到它的原句（選填）</label><textarea id="sentence" className="text-input" value={sentence} onChange={event=>setSentence(event.target.value)} placeholder="保存當時的上下文"/><button className="primary" disabled={busy||!rawText.trim()} onClick={()=>submit()}>{busy?"搜尋中…":"加入詞彙庫"}</button>{message&&<p className="context" role="status">{message}</p>}{matches.length>0&&<div className="options">{matches.map(match=><button className="option" key={match.id} onClick={()=>submit(match.id)}><strong>{match.canonicalForm}</strong><br/><small>{match.definition}</small></button>)}</div>}</section><section className="card"><span className="label">已加入 · {unique.length}</span>{unique.length===0?<p className="lead">尚未加入詞彙。</p>:<div className="stats">{Object.entries(counts).map(([status,count])=><div className="stat" key={status}><strong>{count}</strong><span>{statusLabels[status]??status}</span></div>)}</div>}</section></main>
}
