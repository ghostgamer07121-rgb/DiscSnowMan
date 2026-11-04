const API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneHd4dmltcHdqcXFoem9qZnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzA1ODMsImV4cCI6MjEwODk0NjU4M30.xQKhSd_DqhZuD67PEC3c79FZOx8kOa2pC18wFumSn0g";
const endpoint="https://pgxwxvimpwjqqhzojfps.supabase.co/functions/v1/leaderboard";
const PLAYER_KEY="discSnowmanPlayerId";
let profile=null;
function createId(){
 if(crypto.randomUUID)return crypto.randomUUID();
 return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==="x"?r:(r&3|8)).toString(16)});
}
function ensureSession(){
 let id=localStorage.getItem(PLAYER_KEY);
 if(!id||!/^[0-9a-f-]{36}$/i.test(id)){id=createId();localStorage.setItem(PLAYER_KEY,id)}
 return id;
}
async function call(action,payload={}){
 let response;
 try{
  response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY,"Authorization":`Bearer ${API_KEY}`},body:JSON.stringify({action,player_id:ensureSession(),...payload})});
 }catch(error){throw new Error("Não foi possível alcançar o servidor. Verifique sua conexão e tente novamente.");}
 const raw=await response.text();let data={};
 try{data=raw?JSON.parse(raw):{}}catch{throw new Error("O servidor retornou uma resposta inválida. Tente novamente.");}
 if(!response.ok)throw new Error(data.error||`Falha no servidor (HTTP ${response.status}).`);return data;
}
async function saveProfile(username){const data=await call("profile",{username});profile={...data.profile,personal_best_ms:data.personal_best_ms||0};return profile}
async function loadProfile(){const data=await call("get_profile");profile=data.profile?{...data.profile,personal_best_ms:data.personal_best_ms||0}:null;return profile}
async function startRun(){return(await call("start")).session}
async function finishRun(sessionId,elapsedMs){return await call("finish",{session_id:sessionId,elapsed_ms:elapsedMs})}
async function getLeaderboard(){const response=await fetch(endpoint,{headers:{"apikey":API_KEY,"Authorization":`Bearer ${API_KEY}`}});if(!response.ok)throw new Error("Ranking indisponível.");const raw=await response.text();try{return JSON.parse(raw)}catch{throw new Error("Resposta inválida do ranking.")}}
window.DSAuth={ensureSession,loadProfile,saveProfile,startRun,finishRun,getLeaderboard,getProfile:()=>profile};
window.dispatchEvent(new Event("ds-auth-ready"));
