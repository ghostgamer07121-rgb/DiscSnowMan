(() => {
  "use strict";
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const $ = id => document.getElementById(id);
  const ui = {
    landing:$("landing-screen"), landingStart:$("landing-start-button"), landingBest:$("landing-best"), gameScreen:$("game-screen"),
    pause:$("pause-overlay"), over:$("gameover-overlay"),
    resumeBtn:$("resume-button"), retryBtn:$("retry-button"),
    restartPause:$("restart-pause-button"), timer:$("timer"), progress:$("time-progress"),
    phase:$("phase-label"), threat:$("threat-label"), pips:$("threat-pips"),
    threatFill:$("threat-fill"), sawCount:$("saw-count"), dashStatus:$("dash-status"),
    dashFill:$("dash-fill"), dashCooldown:$("dash-cooldown"), arenaState:$("arena-state"),
    finalTime:$("final-time"), finalBest:$("final-best"), bestTime:$("best-time"), recordProgress:$("record-progress"), fps:$("fps-counter"),
    tip:$("tip-text"), sound:$("sound-toggle"), mobile:$("mobile-controls"),
    joystick:$("joystick"), knob:$("joystick-knob"), dashBtn:$("dash-button")
  };
  const TAU = Math.PI * 2;
  const PHASE_LENGTH = 60;
  const tips = [
    "Não corra em linha reta. Use as bordas a seu favor.",
    "O dash atravessa o perigo por um instante — guarde-o para emergências.",
    "Observe o padrão das serras antes de escolher sua rota.",
    "As bordas ajudam a prever os ricochetes, mas podem virar armadilhas.",
    "Continue mudando de direção. O movimento constante é sua defesa."
  ];
  let W=900,H=680,dpr=1,last=0,elapsed=0,gameState="menu",saws=[],particles=[],snow=[],keys={},soundOn=true;
  let player,spawnClock=0,shake=0,frameCount=0,fpsClock=0,best=Number(localStorage.getItem("discSnowmanBest")||0);
  let joy={x:0,y:0,active:false,pointer:null},audioCtx=null;
  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const fmt=t=>{const m=Math.floor(t/60),s=Math.floor(t%60);return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")};
  function fit(){
    const r=canvas.getBoundingClientRect(); dpr=Math.min(window.devicePixelRatio||1,2);
    W=Math.max(1,r.width);H=Math.max(1,r.height);
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(player){player.x=clamp(player.x,player.r,W-player.r);player.y=clamp(player.y,player.r,H-player.r)}
    seedSnow();
  }
  function seedSnow(){snow=Array.from({length:Math.floor(W*H/3800)},()=>({x:Math.random()*W,y:Math.random()*H,r:rand(.4,1.6),a:rand(.12,.55),v:rand(5,20),drift:rand(-7,7)}))}
  function reset(){
    elapsed=0;spawnClock=0;saws=[];particles=[];shake=0;
    player={x:W*.5,y:H*.53,r:13,vx:0,vy:0,speed:190,dash:0,cooldown:0,invuln:0,trail:[],angle:-Math.PI/2};
    for(let i=0;i<3;i++)spawnSaw("bounce",true);
    updateHUD();ui.arenaState.textContent="PROTOCOLO ATIVO";
  }
  function start(){
    ui.landing.classList.add("is-hidden");
    ui.gameScreen.classList.remove("is-hidden");
    fit();
    reset();
    gameState="playing";
    hideOverlays();
    last=performance.now();
    playTone(440,.07);
    requestAnimationFrame(loop);
  }
  function hideOverlays(){ui.pause.classList.add("hidden");ui.over.classList.add("hidden")}
  function pause(){if(gameState!=="playing")return;gameState="paused";ui.pause.classList.remove("hidden");ui.arenaState.textContent="PARTIDA PAUSADA"}
  function resume(){if(gameState!=="paused")return;gameState="playing";ui.pause.classList.add("hidden");last=performance.now();requestAnimationFrame(loop);ui.arenaState.textContent="PROTOCOLO ATIVO"}
  function endGame(){gameState="over";shake=12;burst(player.x,player.y,"#a9edff",35);playTone(125,.32);if(elapsed>best){best=elapsed;localStorage.setItem("discSnowmanBest",String(best))}ui.finalTime.textContent=fmt(elapsed);ui.finalBest.textContent=fmt(best);ui.over.classList.remove("hidden");ui.arenaState.textContent="SINAL PERDIDO"}
  function phase(){return Math.min(6,Math.floor(elapsed/PHASE_LENGTH)+1)}
  function threat(){return clamp(Math.floor(elapsed/100)+1,1,5)}
  function spawnSaw(type,initial=false){
    const edge=Math.floor(Math.random()*4),pad=24;
    let x=edge===0?pad:edge===1?W-pad:rand(pad,W-pad);
    let y=edge===2?pad:edge===3?H-pad:rand(pad,H-pad);
    if(player&&dist({x,y},player)<Math.min(W,H)*.25&&!initial){x=rand(W*.15,W*.85);y=rand(H*.15,H*.85)}
    const speed=(initial?70:75)+Math.min(95,elapsed*.19)+rand(-12,22);
    const a=rand(0,TAU);
    const kinds=["bounce","chase","orbit","cross","wave","chaos"];
    if(!type)type=kinds[Math.min(5,Math.floor(elapsed/PHASE_LENGTH))];
    const s={type,x,y,px:x,py:y,r:rand(12,17),vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,angle:rand(0,TAU),spin:rand(5,9)*(Math.random()<.5?-1:1),speed,age:0,phase:rand(0,TAU),orbit:rand(35,90),target:rand(0,TAU),color:type==="chaos"?"#ff6b83":type==="chase"?"#ffa76b":"#d9f7ff"};
    if(type==="orbit"){s.cx=rand(W*.2,W*.8);s.cy=rand(H*.2,H*.8);s.orbit=rand(45,Math.min(W,H)*.32);s.angle=rand(0,TAU)}
    if(type==="cross"){s.x=Math.random()<.5?-20:W+20;s.y=rand(20,H-20);s.vx=s.x<0?speed*1.2:-speed*1.2;s.vy=rand(-30,30)}
    if(type==="wave"){s.x=Math.random()<.5?-20:W+20;s.y=rand(30,H-30);s.vx=s.x<0?speed:-speed;s.baseY=s.y}
    saws.push(s);
  }
  function addPhaseSaws(){
    const p=phase();
    const types=["bounce","chase","orbit","cross","wave","chaos"];
    const type=types[p-1];
    const desired=Math.min(6+p*2,3+p*2+Math.floor(elapsed/75));
    while(saws.length<desired)spawnSaw(type);
    if(p>=2&&Math.random()<.7)spawnSaw(types[Math.floor(Math.random()*p)]);
  }
  function burst(x,y,color,n=12){for(let i=0;i<n;i++){const a=rand(0,TAU),v=rand(35,210);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.25,.7),max:.7,r:rand(1,3),color})}}
  function playTone(freq,duration=.08){if(!soundOn)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="sine";o.frequency.value=freq;g.gain.setValueAtTime(.045,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(e){}}
  function inputVector(){
    let x=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joy.x;
    let y=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+joy.y;
    const len=Math.hypot(x,y);if(len>1){x/=len;y/=len}return{x,y};
  }
  function dash(){
    if(gameState!=="playing"||!player||player.cooldown>0)return;
    let v=inputVector();if(Math.hypot(v.x,v.y)<.1){const len=Math.hypot(player.vx,player.vy);v=len>.1?{x:player.vx/len,y:player.vy/len}:{x:Math.cos(player.angle),y:Math.sin(player.angle)}}
    player.vx=v.x*650;player.vy=v.y*650;player.dash=.19;player.cooldown=1.65;player.invuln=.25;burst(player.x,player.y,"#71e9ff",12);playTone(690,.09);
  }
  function update(dt){
    elapsed+=dt;const p=phase();spawnClock+=dt;
    if(spawnClock>Math.max(1.4,4.8-elapsed*.012)){spawnClock=0;addPhaseSaws()}
    const v=inputVector(),pl=player;
    pl.cooldown=Math.max(0,pl.cooldown-dt);pl.dash=Math.max(0,pl.dash-dt);pl.invuln=Math.max(0,pl.invuln-dt);
    if(pl.dash<=0){
      const accel=pl.speed*7;
      pl.vx+=(v.x*pl.speed-pl.vx)*Math.min(1,dt*7);
      pl.vy+=(v.y*pl.speed-pl.vy)*Math.min(1,dt*7);
    }
    if(Math.hypot(v.x,v.y)>.1)pl.angle=Math.atan2(v.y,v.x);
    pl.x+=pl.vx*dt;pl.y+=pl.vy*dt;
    const margin=pl.r+2;
    if(pl.x<margin){pl.x=margin;pl.vx=Math.max(0,pl.vx)}if(pl.x>W-margin){pl.x=W-margin;pl.vx=Math.min(0,pl.vx)}
    if(pl.y<margin){pl.y=margin;pl.vy=Math.max(0,pl.vy)}if(pl.y>H-margin){pl.y=H-margin;pl.vy=Math.min(0,pl.vy)}
    if(pl.dash>0||Math.hypot(pl.vx,pl.vy)>30){pl.trail.push({x:pl.x,y:pl.y,life:.25});if(pl.trail.length>12)pl.trail.shift()}
    pl.trail.forEach(t=>t.life-=dt);pl.trail=pl.trail.filter(t=>t.life>0);
    for(const s of saws){
      s.age+=dt;s.angle+=s.spin*dt;s.px=s.x;s.py=s.y;
      if(s.type==="chase"||s.type==="chaos"){
        const a=Math.atan2(pl.y-s.y,pl.x-s.x),sp=s.speed*(s.type==="chaos"?1.28:1);
        s.vx+=(Math.cos(a)*sp-s.vx)*Math.min(1,dt*(s.type==="chaos"?2.1:.8));s.vy+=(Math.sin(a)*sp-s.vy)*Math.min(1,dt*(s.type==="chaos"?2.1:.8));s.x+=s.vx*dt;s.y+=s.vy*dt;
      }else if(s.type==="orbit"){
        s.angle+=dt*.7;s.x=s.cx+Math.cos(s.angle)*s.orbit;s.y=s.cy+Math.sin(s.angle)*s.orbit;
        if(s.cx<30||s.cx>W-30)s.cx=clamp(s.cx,30,W-30);if(s.cy<30||s.cy>H-30)s.cy=clamp(s.cy,30,H-30);
      }else if(s.type==="wave"){
        s.x+=s.vx*dt;s.y=s.baseY+Math.sin(s.age*2.4+s.phase)*Math.min(90,H*.18);
      }else{
        s.x+=s.vx*dt;s.y+=s.vy*dt;
        if(s.type==="chaos"){s.vy+=Math.sin(s.age*4)*14*dt;s.vx+=Math.cos(s.age*3)*12*dt}
        if(s.type==="bounce"){if(s.x<s.r||s.x>W-s.r)s.vx*=-1;if(s.y<s.r||s.y>H-s.r)s.vy*=-1;s.x=clamp(s.x,s.r,W-s.r);s.y=clamp(s.y,s.r,H-s.r)}
        else if(s.type==="cross"&&(s.x<-45||s.x>W+45)){s.x=s.x<0?W+20:-20;s.y=rand(20,H-20)}
      }
      if(s.x<-80||s.x>W+80||s.y<-80||s.y>H+80){saws.splice(saws.indexOf(s),1);continue}
      if(pl.invuln<=0&&dist(pl,s)<pl.r+s.r*.78){endGame();return}
    }
    for(const q of particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=Math.pow(.03,dt);q.vy*=Math.pow(.03,dt);q.life-=dt}particles=particles.filter(q=>q.life>0);
    for(const f of snow){f.y+=f.v*dt;f.x+=f.drift*dt;if(f.y>H+3){f.y=-3;f.x=Math.random()*W}if(f.x<0)f.x=W;if(f.x>W)f.x=0}
    shake=Math.max(0,shake-dt*25);
    updateHUD();
  }
  function updateHUD(){
    ui.timer.innerHTML=fmt(elapsed)+'<span class="timer-ms">.'+String(Math.floor((elapsed%1)*100)).padStart(2,"0")+'</span>';
    const p=phase(),progress=(elapsed%PHASE_LENGTH)/PHASE_LENGTH;
    ui.progress.style.width=(progress*100)+"%";
    ui.phase.textContent="FASE "+String(p).padStart(2,"0")+" / 06";
    const t=threat(),labels=["BAIXO","MODERADO","ELEVADO","CRÍTICO","EXTREMO"];
    ui.threat.textContent=labels[t-1];ui.threat.style.color=t>=4?"#ff7888":t>=3?"#ffb176":"#dcefff";
    [...ui.pips.children].forEach((el,i)=>el.classList.toggle("active",i<t));
    ui.threatFill.style.width=(t/5*100)+"%";ui.sawCount.textContent=String(saws.length).padStart(2,"0");
    if(player){const ready=player.cooldown<=0;ui.dashStatus.innerHTML=(ready?"PRONTO":"RECARREGANDO")+'<span class="dash-ready-dot" style="background:'+(ready?"#64e3c0":"#ffb06d")+'"></span>';ui.dashFill.style.width=((1-player.cooldown/1.65)*100)+"%";ui.dashCooldown.textContent=Math.round((1-player.cooldown/1.65)*100)+"%"}
    ui.bestTime.textContent=fmt(best);
    ui.landingBest.textContent=fmt(best);
    ui.recordProgress.style.width=(best>0?Math.min(100,elapsed/best*100):0)+"%";
    if(Math.floor(elapsed/17)%tips.length>=0)ui.tip.textContent=tips[Math.floor(elapsed/17)%tips.length];
  }
  function drawBackground(){
    ctx.clearRect(0,0,W,H);const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,"#091e31");g.addColorStop(.55,"#07192a");g.addColorStop(1,"#0a2235");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.strokeStyle="#8ad8f0";ctx.globalAlpha=.055;ctx.lineWidth=1;
    const gap=34;for(let x=0;x<W;x+=gap){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=gap){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.restore();
    const rg=ctx.createRadialGradient(W*.5,H*.5,20,W*.5,H*.5,Math.max(W,H)*.7);rg.addColorStop(0,"#133b4a20");rg.addColorStop(1,"#020b17aa");ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
    ctx.save();for(const f of snow){ctx.globalAlpha=f.a;ctx.fillStyle="#c6f3ff";ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,TAU);ctx.fill()}ctx.restore();
    ctx.save();ctx.strokeStyle="#3c7894";ctx.globalAlpha=.35;ctx.lineWidth=1;const l=13,o=9;
    [[o,o,1,1],[W-o,o,-1,1],[o,H-o,1,-1],[W-o,H-o,-1,-1]].forEach(([x,y,dx,dy])=>{ctx.beginPath();ctx.moveTo(x+dx*l,y);ctx.lineTo(x,y);ctx.lineTo(x,y+dy*l);ctx.stroke()});ctx.restore();
  }
  function drawSaw(s){
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);const r=s.r;
    ctx.shadowColor=s.color;ctx.shadowBlur=9;ctx.fillStyle=s.color;ctx.beginPath();
    for(let i=0;i<24;i++){const a=i*TAU/24,rr=i%2===0?r:r*.69;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle="#092034";ctx.beginPath();ctx.arc(0,0,r*.49,0,TAU);ctx.fill();ctx.strokeStyle="#8eddf1";ctx.globalAlpha=.7;ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r*.3,0,TAU);ctx.stroke();
    for(let i=0;i<4;i++){const a=i*TAU/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.16,Math.sin(a)*r*.16);ctx.lineTo(Math.cos(a)*r*.37,Math.sin(a)*r*.37);ctx.stroke()}
    ctx.restore();
  }
  function drawPlayer(){
    const p=player;if(!p)return;ctx.save();
    for(const t of p.trail){ctx.globalAlpha=(t.life/.25)*.24;ctx.fillStyle="#5ce6ff";ctx.beginPath();ctx.arc(t.x,t.y,p.r*(t.life/.25),0,TAU);ctx.fill()}
    ctx.globalAlpha=1;ctx.translate(p.x,p.y);
    if(p.invuln>0){ctx.strokeStyle="#8af0ff";ctx.globalAlpha=.55+Math.sin(performance.now()*.04)*.3;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,p.r+7,0,TAU);ctx.stroke();ctx.globalAlpha=1}
    ctx.shadowColor="#75eaff";ctx.shadowBlur=14;ctx.fillStyle="#dff8ff";ctx.beginPath();ctx.arc(0,5,p.r,0,TAU);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle="#a7dcec";ctx.beginPath();ctx.arc(-2,-7,p.r*.67,0,TAU);ctx.fill();
    ctx.fillStyle="#f0fcff";ctx.beginPath();ctx.arc(-3,-9,p.r*.54,0,TAU);ctx.fill();
    ctx.fillStyle="#16384b";ctx.beginPath();ctx.arc(-5,-10,1.5,0,TAU);ctx.arc(1,-10,1.5,0,TAU);ctx.fill();
    ctx.fillStyle="#ffad70";ctx.beginPath();ctx.moveTo(-2,-7);ctx.lineTo(5,-5);ctx.lineTo(-2,-4);ctx.closePath();ctx.fill();
    ctx.fillStyle="#39c8e2";ctx.beginPath();ctx.ellipse(0,0,p.r*.82,3,0,0,TAU);ctx.fill();
    ctx.fillStyle="#1387a8";ctx.beginPath();ctx.moveTo(-8,1);ctx.lineTo(5,1);ctx.lineTo(9,5);ctx.lineTo(1,4);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  function drawParticles(){ctx.save();for(const q of particles){ctx.globalAlpha=clamp(q.life/q.max,0,1);ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,TAU);ctx.fill()}ctx.restore()}
  function render(){
    ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));drawBackground();for(const s of saws)drawSaw(s);drawParticles();drawPlayer();ctx.restore();
  }
  function loop(now){
    if(gameState!=="playing")return;const dt=Math.min(.034,Math.max(0,(now-last)/1000));last=now;
    update(dt);render();frameCount++;fpsClock+=dt;if(fpsClock>=.6){ui.fps.textContent=String(Math.round(frameCount/fpsClock));frameCount=0;fpsClock=0}
    if(gameState==="playing")requestAnimationFrame(loop);
  }
  function keydown(e){
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();
    keys[e.code]=true;
    if((e.code==="Space"||e.code==="ShiftLeft"||e.code==="ShiftRight")&&!e.repeat)dash();
    if(e.code==="Escape"){if(gameState==="playing")pause();else if(gameState==="paused")resume()}
    if((e.code==="Enter")&&(gameState==="menu"||gameState==="over"))start();
  }
  function keyup(e){keys[e.code]=false}
  function joyPoint(e){
    const r=ui.joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy,limit=r.width*.34,len=Math.hypot(dx,dy);
    if(len>limit){dx=dx/len*limit;dy=dy/len*limit}
    joy.x=dx/limit;joy.y=dy/limit;
    ui.knob.style.transform="translate("+dx+"px,"+dy+"px)";
  }
  ui.joystick.addEventListener("pointerdown",e=>{e.preventDefault();joy.active=true;joy.pointer=e.pointerId;ui.joystick.setPointerCapture(e.pointerId);joyPoint(e)});
  ui.joystick.addEventListener("pointermove",e=>{if(joy.active&&e.pointerId===joy.pointer)joyPoint(e)});
  function joyEnd(){joy.active=false;joy.x=0;joy.y=0;joy.pointer=null;ui.knob.style.transform="translate(0,0)"}
  ui.joystick.addEventListener("pointerup",joyEnd);ui.joystick.addEventListener("pointercancel",joyEnd);
  ui.dashBtn.addEventListener("pointerdown",e=>{e.preventDefault();dash()});
  ui.landingStart.addEventListener("click",start);ui.retryBtn.addEventListener("click",start);ui.restartPause.addEventListener("click",start);ui.resumeBtn.addEventListener("click",resume);
  ui.sound.addEventListener("click",()=>{soundOn=!soundOn;ui.sound.classList.toggle("sound-muted",!soundOn);ui.sound.setAttribute("aria-label",soundOn?"Desativar sons":"Ativar sons");if(soundOn)playTone(520,.06)});
  window.addEventListener("keydown",keydown,{passive:false});window.addEventListener("keyup",keyup);window.addEventListener("blur",()=>{keys={};joyEnd();if(gameState==="playing")pause()});
  window.addEventListener("resize",fit);document.addEventListener("visibilitychange",()=>{if(document.hidden&&gameState==="playing")pause()});
  fit();ui.finalBest.textContent=fmt(best);ui.bestTime.textContent=fmt(best);ui.landingBest.textContent=fmt(best);ui.sound.classList.toggle("sound-muted",!soundOn);render();
})();