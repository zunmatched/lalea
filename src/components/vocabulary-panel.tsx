"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Settings={dailyGoalMinutes:number;reviewWindowDays:number;decayEnabled:boolean};
export function VocabularyPanel(){
 const[settings,setSettings]=useState<Settings|null>(null);const[reviewWindowInput,setReviewWindowInput]=useState("");const[settingsMessage,setSettingsMessage]=useState("");const[settingsBusy,setSettingsBusy]=useState(false);
 useEffect(()=>{let active=true;fetch("/api/settings").then(response=>response.ok?response.json():null).then(result=>{if(active&&result){setSettings(result);setReviewWindowInput(String(result.reviewWindowDays))}}).catch(()=>null);return()=>{active=false}},[]);
 async function saveSettings(){
  const days=Number(reviewWindowInput);
  if(!Number.isInteger(days)||days<1||days>10){setSettingsMessage("請輸入 1–10 之間的整數。");return}
  setSettingsBusy(true);setSettingsMessage("");
  const response=await fetch("/api/settings",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({reviewWindowDays:days})});
  setSettingsBusy(false);
  if(response.ok){setSettings(await response.json());setSettingsMessage("已更新。")}else setSettingsMessage("更新失敗，請再試一次。")
 }
 async function toggleDecay(next:boolean){
  if(!settings)return;
  setSettings({...settings,decayEnabled:next});setSettingsBusy(true);setSettingsMessage("");
  const response=await fetch("/api/settings",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({decayEnabled:next})});
  setSettingsBusy(false);
  if(response.ok){setSettings(await response.json());setSettingsMessage("已更新。")}else{setSettings({...settings,decayEnabled:!next});setSettingsMessage("更新失敗，請再試一次。")}
 }
 return <main className="shell"><p className="eyebrow">我的</p><h1>個人化設定與詞彙庫</h1><p className="lead">學習節奏與詞彙相關的個人設定都在這裡調整。新增詞彙關卡請直接請 agent 處理。</p><Link href="/history" className="option" style={{textAlign:"left",textDecoration:"none",display:"block",marginBottom:14}}>📋 測驗紀實 · 查看過去的測驗紀錄</Link><section className="card"><span className="label">複習次數</span><p className="lead" style={{margin:"0 0 14px"}}>連續幾天內都答對，才算完全熟練（也就是熟練度滿分的天數）。</p><div className="pills"><input className="text-input" style={{width:80,marginBottom:0}} type="number" min={1} max={10} value={reviewWindowInput} onChange={event=>setReviewWindowInput(event.target.value)}/><button className="pill" disabled={settingsBusy||!settings} onClick={saveSettings}>{settingsBusy?"儲存中…":"儲存"}</button></div>{settingsMessage&&<p className="context" role="status">{settingsMessage}</p>}</section><section className="card"><span className="label">不練習會不會掉分</span><p className="lead" style={{margin:"0 0 14px"}}>{settings?.decayEnabled??true?"目前：會掉分。熟練度看「最近幾天」的表現，好幾天沒練，分數會跟著往下掉。":"目前：不會掉分。只要曾經練到滿分，就會一直保留，沒練也不會倒扣；累計練到滿分前，成績會照樣累積。"}</p><div className="pills"><button className="pill" aria-pressed={settings?.decayEnabled??true} disabled={settingsBusy||!settings} onClick={()=>toggleDecay(true)}>會掉分</button><button className="pill" aria-pressed={!(settings?.decayEnabled??true)} disabled={settingsBusy||!settings} onClick={()=>toggleDecay(false)}>不會掉分</button></div></section></main>;
}
