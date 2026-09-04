"use client";
import { useEffect,useRef,useState } from "react";
import { randomUUID } from "@/lib/client-id";
import { speakSequence } from "@/lib/speech";
type Asset={id:string;status:string;url:string|null;voice:string|null;durationMs:number|null};
export function AudioPlayer({exerciseId,text,asset,onComplete,autoPlay,onPrevious,onNext,onPauseStateChange}:{exerciseId:string;text:string;asset?:Asset;onComplete?:()=>void;autoPlay?:boolean;onPrevious?:()=>void;onNext?:()=>void;onPauseStateChange?:(paused:boolean)=>void}){const[playing,setPlaying]=useState(false),[rate,setRate]=useState<"0.85"|"1.0">("0.85"),[captions,setCaptions]=useState(false),[error,setError]=useState("");const audioRef=useRef<HTMLAudioElement|null>(null);
 function record(eventType:"play"|"pause"|"replay"|"complete"|"unfamiliar"|"error",metadata:Record<string,unknown>={}){void fetch("/api/audio-events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({clientEventId:randomUUID(),audioAssetId:asset?.id,exerciseId,eventType,playbackRate:rate,metadata:{fallback:!asset?.url,...metadata}})})}
 function stop(){audioRef.current?.pause();if("speechSynthesis"in window)window.speechSynthesis.cancel();setPlaying(false)}
 function play(replay=false){window.dispatchEvent(new CustomEvent("lalea:audio-start",{detail:exerciseId}));setError("");if(asset?.url){if(!audioRef.current){const audio=new Audio(asset.url);audio.onended=()=>{setPlaying(false);audio.currentTime=0;record("complete");onComplete?.()};audio.onerror=()=>{setError("固定音訊載入失敗，已切換瀏覽器語音備援。");record("error",{reason:"asset_load_failed"});audioRef.current=null;playSpeech()};audioRef.current=audio}audioRef.current.currentTime=replay?0:audioRef.current.currentTime;audioRef.current.playbackRate=Number(rate);void audioRef.current.play();setPlaying(true)}else playSpeech();record(replay?"replay":"play")}
 function playSpeech(){const started=speakSequence([{text,lang:"en-US",rate:Number(rate)}],{onEnd:()=>{setPlaying(false);record("complete");onComplete?.()},onError:()=>{setPlaying(false);setError("語音播放失敗，請稍後重試。");record("error",{reason:"speech_failed"})}});if(!started){setError("此瀏覽器無法播放語音。");record("error",{reason:"speech_unavailable"});return}setPlaying(true)}
 useEffect(()=>{const listener=(event:Event)=>{if((event as CustomEvent<string>).detail!==exerciseId)stop()};window.addEventListener("lalea:audio-start",listener);return()=>{window.removeEventListener("lalea:audio-start",listener);stop()}},[exerciseId]);
 useEffect(()=>{if(autoPlay)Promise.resolve().then(()=>play())},[]);
 useEffect(()=>{
  if(!("mediaSession"in navigator))return;
  navigator.mediaSession.metadata=new MediaMetadata({title:text.slice(0,80),artist:"LaLea 會話播放"});
  navigator.mediaSession.setActionHandler("play",()=>{onPauseStateChange?.(false);play()});
  navigator.mediaSession.setActionHandler("pause",()=>{stop();record("pause");onPauseStateChange?.(true)});
  navigator.mediaSession.setActionHandler("previoustrack",onPrevious?()=>onPrevious():null);
  navigator.mediaSession.setActionHandler("nexttrack",onNext?()=>onNext():null);
  return()=>{
   navigator.mediaSession.setActionHandler("play",null);
   navigator.mediaSession.setActionHandler("pause",null);
   navigator.mediaSession.setActionHandler("previoustrack",null);
   navigator.mediaSession.setActionHandler("nexttrack",null);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[exerciseId,onPrevious,onNext]);
 useEffect(()=>{if("mediaSession"in navigator)navigator.mediaSession.playbackState=playing?"playing":"paused"},[playing]);
 return <div><div className="audio"><button onClick={()=>playing?(stop(),record("pause"),onPauseStateChange?.(true)):(onPauseStateChange?.(false),play())} aria-label={playing?"暫停英文":"播放英文"}>{playing?"Ⅱ":"▶"}</button><div><strong>{asset?.status==="approved"?"固定教材音訊":"瀏覽器語音備援"}</strong><br/><small>{rate}× · 可重複播放</small></div></div><div className="audio-controls"><button onClick={()=>{onPauseStateChange?.(false);play(true)}}>重播</button><button onClick={()=>setRate(value=>value==="0.85"?"1.0":"0.85")}>速度 {rate}×</button><button onClick={()=>setCaptions(value=>!value)}>{captions?"隱藏字幕":"顯示字幕"}</button><button onClick={()=>{record("unfamiliar");setError("已標記不熟，會提早安排正式複習；不會記成答錯。")}}>不熟</button></div>{captions&&<p className="context">{text}</p>}{error&&<p className="error" role="status">{error}</p>}</div>}
