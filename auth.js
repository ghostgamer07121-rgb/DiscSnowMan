import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
const supabase = createClient("https://pgxwxvimpwjqqhzojfps.supabase.co","sb_publishable_rLPMApQamOOGr32XNRfQEQ_Ap5qMViq",{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const endpoint="https://pgxwxvimpwjqqhzojfps.supabase.co/functions/v1/leaderboard";
let profile=null;
async function ensureSession(){
  const {data}=await supabase.auth.getSession();
  if(data.session)return data.session;
  const {data:created,error}=await supabase.auth.signInAnonymously();
  if(error)throw new Error("Não foi possível criar sua conta de jogador. Ative Anonymous Sign-Ins em Supabase > Authentication > Providers.");
  return created.session;
}
async function call(action,payload={}){
  const session=await ensureSession();
  const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({action,...payload})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||"Falha de comunicação com o servidor.");return data;
}
async function saveProfile(username){const data=await call("profile",{username});profile={...data.profile,personal_best_ms:data.personal_best_ms||0};return profile}
async function loadProfile(){const data=await call("get_profile");profile=data.profile?{...data.profile,personal_best_ms:data.personal_best_ms||0}:null;return profile}
async function startRun(){return (await call("start")).session}
async function finishRun(sessionId,elapsedMs){return await call("finish",{session_id:sessionId,elapsed_ms:elapsedMs})}
async function getLeaderboard(){const response=await fetch(endpoint,{headers:{"apikey":"sb_publishable_rLPMApQamOOGr32XNRfQEQ_Ap5qMViq"}});if(!response.ok)throw new Error("Ranking indisponível.");return await response.json()}
window.DSAuth={ensureSession,loadProfile,saveProfile,startRun,finishRun,getLeaderboard,getProfile:()=>profile};
window.dispatchEvent(new Event("ds-auth-ready"));
