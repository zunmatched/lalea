"use client";
import { useEffect, useState } from "react";
type Item={id:string;canonicalForm:string;definition:string;translation:string|null;status:string};
type Match={id:string;canonicalForm:string;definition:string;partOfSpeech:string|null};
type Settings={dailyGoalMinutes:number;newVocabLimit:number};
export function VocabularyPanel(){
 const[items,setItems]=useState<Item[]>([]);const[rawText,setRawText]=useState("");const[sentence,setSentence]=useState("");const[matches,setMatches]=useState<Match[]>([]);const[message,setMessage]=useState("");const[busy,setBusy]=useState(false);
 const[settings,setSettings]=useState<Settings|null>(null);const[newVocabLimitInput,setNewVocabLimitInput]=useState("");const[settingsMessage,setSettingsMessage]=useState("");const[settingsBusy,setSettingsBusy]=useState(false);
 async function load(){const response=await fetch("/api/vocabulary");if(response.ok)setItems((await response.json()).items)}
 useEffect(()=>{let active=true;fetch("/api/vocabulary").then(response=>response.ok?response.json():{items:[]}).then(result=>{if(active)setItems(result.items)}).catch(()=>null);return()=>{active=false}},[]);
 useEffect(()=>{let active=true;fetch("/api/settings").then(response=>response.ok?response.json():null).then(result=>{if(active&&result){setSettings(result);setNewVocabLimitInput(String(result.newVocabLimit))}}).catch(()=>null);return()=>{active=false}},[]);
 async function saveSettings(){
  const limit=Number(newVocabLimitInput);
  if(!Number.isInteger(limit)||limit<1||limit>20){setSettingsMessage("請輸入 1–20 之間的整數。");return}
  setSettingsBusy(true);setSettingsMessage("");
  const response=await fetch("/api/settings",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({newVocabLimit:limit})});
  setSettingsBusy(false);
  if(response.ok){setSettings(await response.json());setSettingsMessage("已更新。")}else setSettingsMessage("更新失敗，請再試一次。")
 }
 async function submit(selectedSenseId?:string){
  if(!rawText.trim())return;setBusy(true);setMessage("");
  const response=await fetch("/api/vocabulary/injections",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rawText,originalSentence:sentence||undefined,selectedSenseId})});const result=await response.json();setBusy(false);
  if(result.status==="needs_selection"){setMatches(result.matches);setMessage("找到多個詞義，請選擇這次遇到的意思。");return}
  if(result.status==="needs_enrichment"){setMatches([]);setMessage("已保存，等待補齊與人工審核；目前不會進入正式學習。");return}
  const progressMessage:Record<string,string>={ready_to_learn:"已加入詞彙庫，將安排首次學習。",learning:"這個字你已經在學習中，進度不會被重設。",learned:"這個字你已經學會了，進度不會被重設。"};
  if(result.status in progressMessage){setMatches([]);setRawText("");setSentence("");setMessage(progressMessage[result.status]);await load()}
 }
 const unique=[...new Map(items.map(item=>[item.id,item])).values()];
 const statusLabels:Record<string,string>={ready_to_learn:"等待首次學習",learning:"學習中",learned:"已學會",ignored:"已暫時忽略"};
 const counts=unique.reduce<Record<string,number>>((acc,item)=>{acc[item.status]=(acc[item.status]??0)+1;return acc},{});
 return <main className="shell"><p className="eyebrow">我的</p><h1>個人化設定與詞彙庫</h1><p className="lead">學習節奏與詞彙相關的個人設定都在這裡調整。</p><section className="card"><span className="label">每次複習的新詞上限</span><p className="lead" style={{margin:"0 0 14px"}}>複習到期項目已練完時，這個數字決定一次能再多學幾個新詞。</p><div className="pills"><input className="text-input" style={{width:80,marginBottom:0}} type="number" min={1} max={20} value={newVocabLimitInput} onChange={event=>setNewVocabLimitInput(event.target.value)}/><button className="pill" disabled={settingsBusy||!settings} onClick={saveSettings}>{settingsBusy?"儲存中…":"儲存"}</button></div>{settingsMessage&&<p className="context" role="status">{settingsMessage}</p>}</section><section className="card"><p className="eyebrow">加入詞彙</p><label className="label" htmlFor="vocabulary">單字或片語</label><input id="vocabulary" className="text-input" value={rawText} onChange={event=>setRawText(event.target.value)} placeholder="例如：keep you posted"/><label className="label field-label" htmlFor="sentence">遇到它的原句（選填）</label><textarea id="sentence" className="text-input" value={sentence} onChange={event=>setSentence(event.target.value)} placeholder="保存當時的上下文"/><button className="primary" disabled={busy||!rawText.trim()} onClick={()=>submit()}>{busy?"搜尋中…":"加入詞彙庫"}</button>{message&&<p className="context" role="status">{message}</p>}{matches.length>0&&<div className="options">{matches.map(match=><button className="option" key={match.id} onClick={()=>submit(match.id)}><strong>{match.canonicalForm}</strong><br/><small>{match.definition}</small></button>)}</div>}</section><section className="card"><span className="label">已加入 · {unique.length}</span>{unique.length===0?<p className="lead">尚未加入詞彙。</p>:<div className="stats">{Object.entries(counts).map(([status,count])=><div className="stat" key={status}><strong>{count}</strong><span>{statusLabels[status]??status}</span></div>)}</div>}</section></main>
}
