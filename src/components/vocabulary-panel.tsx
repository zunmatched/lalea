"use client";
import { useEffect, useState } from "react";
type Item={id:string;canonicalForm:string;definition:string;translation:string|null;status:string};
type Settings={dailyGoalMinutes:number;reviewWindowDays:number};
export function VocabularyPanel(){
 const[items,setItems]=useState<Item[]>([]);
 const[settings,setSettings]=useState<Settings|null>(null);const[reviewWindowInput,setReviewWindowInput]=useState("");const[settingsMessage,setSettingsMessage]=useState("");const[settingsBusy,setSettingsBusy]=useState(false);
 useEffect(()=>{let active=true;fetch("/api/vocabulary").then(response=>response.ok?response.json():{items:[]}).then(result=>{if(active)setItems(result.items)}).catch(()=>null);return()=>{active=false}},[]);
 useEffect(()=>{let active=true;fetch("/api/settings").then(response=>response.ok?response.json():null).then(result=>{if(active&&result){setSettings(result);setReviewWindowInput(String(result.reviewWindowDays))}}).catch(()=>null);return()=>{active=false}},[]);
 async function saveSettings(){
  const days=Number(reviewWindowInput);
  if(!Number.isInteger(days)||days<1||days>10){setSettingsMessage("請輸入 1–10 之間的整數。");return}
  setSettingsBusy(true);setSettingsMessage("");
  const response=await fetch("/api/settings",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({reviewWindowDays:days})});
  setSettingsBusy(false);
  if(response.ok){setSettings(await response.json());setSettingsMessage("已更新。")}else setSettingsMessage("更新失敗，請再試一次。")
 }
 const unique=[...new Map(items.map(item=>[item.id,item])).values()];
 const statusLabels:Record<string,string>={ready_to_learn:"等待首次學習",learning:"學習中",learned:"已學會",ignored:"已暫時忽略"};
 const counts=unique.reduce<Record<string,number>>((acc,item)=>{acc[item.status]=(acc[item.status]??0)+1;return acc},{});
 return <main className="shell"><p className="eyebrow">我的</p><h1>個人化設定與詞彙庫</h1><p className="lead">學習節奏與詞彙相關的個人設定都在這裡調整。新增詞彙關卡請直接請 agent 處理。</p><section className="card"><span className="label">複習次數</span><p className="lead" style={{margin:"0 0 14px"}}>連續幾天內都答對，才算完全熟練（也就是熟練度滿分的天數）。</p><div className="pills"><input className="text-input" style={{width:80,marginBottom:0}} type="number" min={1} max={10} value={reviewWindowInput} onChange={event=>setReviewWindowInput(event.target.value)}/><button className="pill" disabled={settingsBusy||!settings} onClick={saveSettings}>{settingsBusy?"儲存中…":"儲存"}</button></div>{settingsMessage&&<p className="context" role="status">{settingsMessage}</p>}</section><section className="card"><span className="label">已加入 · {unique.length}</span>{unique.length===0?<p className="lead">尚未加入詞彙。</p>:<div className="stats">{Object.entries(counts).map(([status,count])=><div className="stat" key={status}><strong>{count}</strong><span>{statusLabels[status]??status}</span></div>)}</div>}</section></main>
}
