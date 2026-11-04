const API_KEY="sb_publishable_rLPMApQqamOOGr32XNRfQEQ_Ap5qMViq";
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
 const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","apikey":API_KEY},body:JSON.stringify({action,player_id:ensureSession(),...payload})});
 const data=await response.json();if(!response.ok)throw new Error(data.error||"Falha de comunicação com o servidor.");return data;
}
async function saveProfile(username){const data=await call("profile",{username});profile={...data.profile,personal_best_ms:data.personal_best_ms||0};return profile}
async function loadProfile(){const data=await call("get_profile");profile=data.profile?{...data.profile,personal_best_ms:data.personal_best_ms||0}:null;return profile}
async function startRun(){return(await call("start")).session}
async function finishRun(sessionId,elapsedMs){return await call("finish",{session_id:sessionId,elapsed_ms:elapsedMs})}
async function getLeaderboard(){const response=await fetch(endpoint,{headers:{"apikey":API_KEY}});if(!response.ok)throw new Error("Ranking indisponível.");return await response.json()}
window.DSAuth={ensureSession,loadProfile,saveProfile,startRun,finishRun,getLeaderboard,getProfile:()=>profile};
window.dispatchEvent(new Event("ds-auth-ready"));
