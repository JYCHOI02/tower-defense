const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");

const W = canvas.width, H = canvas.height;
const TILE = 50;
const COLS = 18, ROWS = 11;
const PATH_ROW = 5;
const BASE_X = 850;

const TOTAL_WAVES = 5;
const SUMMON_COST = 20;
const MAX_INVENTORY = 8;

const rarity = {
  normal:{name:"NORMAL",chance:59.9,mul:1,color:"#cfd4dc"},
  rare:{name:"RARE",chance:25,mul:1.5,color:"#4da3ff"},
  unique:{name:"UNIQUE",chance:13,mul:2.5,color:"#b46cff"},
  legendary:{name:"LEGENDARY",chance:2,mul:5,color:"#ffd34d"},
  super:{name:"SUPER LEGEND",chance:0.1,mul:20,color:"#ff4d7d"}
};
const rarityKeys = ["normal","rare","unique","legendary","super"];

const types = {
  basic:{name:"BASIC",damage:1,range:1,rate:1,splash:0},
  cannon:{name:"CANNON",damage:1.8,range:.95,rate:1.25,splash:0},
  splash:{name:"SPLASH",damage:.75,range:1,rate:1.1,splash:48}
};

let state="menu";
let hp=100,gold=100,wave=1;
let enemies=[],towers=[],bullets=[],inventory=[];
let spawnTimer=0,spawned=0,waveTotal=0,waveTimer=0;
let selectedTower=null,dragging=null;
let mouse={x:0,y:0,col:-1,row:-1};
let last=performance.now();

function resetGame(){
  hp=100; gold=100; wave=1;
  enemies=[]; towers=[]; bullets=[]; inventory=[];
  selectedTower=null; dragging=null;
  spawnTimer=0; spawned=0; waveTotal=15; waveTimer=0;
}

function startGame(){
  resetGame();
  state="playing";
  startButton.style.display="none";
  updateStatus();
}

function endGame(win){
  state=win?"clear":"gameover";
  dragging=null;
  startButton.style.display="block";
  startButton.textContent=win?"RESTART":"RESTART";
}

startButton.addEventListener("click",startGame);

function rollRarity(){
  const r=Math.random()*100;
  let sum=0;
  for(const k of rarityKeys){
    sum+=rarity[k].chance;
    if(r<sum)return k;
  }
  return "normal";
}
function rollType(){
  const a=["basic","cannon","splash"];
  return a[Math.floor(Math.random()*a.length)];
}
function summon(){
  if(state!=="playing" || gold<SUMMON_COST || inventory.length>=MAX_INVENTORY)return;
  gold-=SUMMON_COST;
  const r=rollRarity(),t=rollType(),rm=rarity[r],tm=types[t];
  const superMul=r==="super"?3:1;
  inventory.push({
    id:Math.random(),rarity:r,type:t,level:1,
    damage:10*tm.damage*rm.mul*superMul,
    range:120*tm.range*(r==="super"?2.5:1+(rm.mul-1)*.12),
    cooldown:0,
    fireRate:Math.max(8,35*tm.rate/(r==="super"?3:rm.mul)),
    splash:tm.splash*(r==="super"?2.5:1+(rm.mul-1)*.15)
  });
  updateStatus();
}

function pathPoint(index){
  return {x:index*TILE+TILE/2,y:PATH_ROW*TILE+TILE/2};
}
function spawnEnemy(type){
  let hpBase=30+wave*7, speed=1+wave*.05;
  if(type==="fast"){hpBase=24+wave*5;speed=1.9+wave*.12}
  if(type==="cluster"){hpBase=22+wave*5;speed=1.35+wave*.06}
  enemies.push({x:25,y:PATH_ROW*TILE+25,index:0,hp:hpBase,max:hpBase,speed,type});
}
function spawnBoss(){
  enemies.push({x:25,y:PATH_ROW*TILE+25,index:0,hp:1200,max:1200,speed:.62,type:"boss"});
}
function beginWave(){
  spawned=0;
  waveTotal=[15,21,27,36,45][wave-1];
  spawnTimer=0;
}
function update(dt){
  if(state!=="playing")return;

  // Spawn
  if(spawned<waveTotal){
    spawnTimer-=dt;
    if(spawnTimer<=0){
      const roll=Math.random();
      let type="normal";
      if(roll<.25)type="cluster";
      else if(roll<(wave===1?.30:wave===2?.40:wave===3?.50:wave===4?.60:.70))type="fast";
      spawnEnemy(type);
      spawned++;
      spawnTimer=wave===1?700:wave===2?500:wave===3?350:wave===4?230:140;
    }
  } else if(wave===TOTAL_WAVES && !enemies.some(e=>e.type==="boss") && !spawnTimer){
    if(enemies.length===0){
      spawnTimer=1400;
    }
  } else if(wave===TOTAL_WAVES && spawnTimer>0){
    spawnTimer-=dt;
    if(spawnTimer<=0)spawnBoss();
  }

  // Enemies
  for(const e of enemies){
    const target=pathPoint(Math.min(e.index+1,COLS-1));
    const dx=target.x-e.x,dy=target.y-e.y;
    const d=Math.hypot(dx,dy);
    if(d<2){
      e.index++;
      if(e.index>=COLS-1){
        if(e.type==="boss")hp=0;else hp-=10;
        e.hp=0;
      }
    }else{
      e.x+=dx/d*e.speed*dt/16;
      e.y+=dy/d*e.speed*dt/16;
    }
  }

  // Towers: target the monster furthest along the path first.
  for(const t of towers){
    t.cooldown-=dt;
    if(t.cooldown>0)continue;
    let target=null,best=-Infinity;
    for(const e of enemies){
      if(e.hp<=0)continue;
      const d=Math.hypot(e.x-t.x,e.y-t.y);
      if(d>t.range)continue;
      const progress=e.index + (e.x/(TILE)-Math.floor(e.x/TILE));
      if(progress>best){best=progress;target=e;}
    }
    if(target){
      bullets.push({x:t.x,y:t.y,target,damage:t.damage,splash:t.splash,speed:8});
      t.cooldown=t.fireRate*16;
    }
  }

  // Bullets
  for(const b of bullets){
    if(!b.target || b.target.hp<=0){b.dead=true;continue}
    const dx=b.target.x-b.x,dy=b.target.y-b.y,d=Math.hypot(dx,dy);
    if(d<10){
      b.target.hp-=b.damage;
      if(b.splash>0){
        for(const e of enemies){
          if(e!==b.target && Math.hypot(e.x-b.target.x,e.y-b.target.y)<=b.splash)e.hp-=b.damage*.55;
        }
      }
      b.dead=true;
    }else{
      b.x+=dx/d*b.speed*dt/16;
      b.y+=dy/d*b.speed*dt/16;
    }
  }
  bullets=bullets.filter(b=>!b.dead);

  const dead=enemies.filter(e=>e.hp<=0);
  for(const e of dead)gold+=e.type==="boss"?100:3;
  enemies=enemies.filter(e=>e.hp>0);

  if(hp<=0){hp=0;endGame(false);return}

  if(spawned>=waveTotal && enemies.length===0){
    if(wave<TOTAL_WAVES && !(wave===TOTAL_WAVES)){
      wave++;
      beginWave();
    }else if(wave===TOTAL_WAVES && dead.some(e=>e.type==="boss")){
      endGame(true);
    }
  }
  updateStatus();
}

function hasTower(c,r){return towers.some(t=>t.col===c&&t.row===r)}
function validCell(c,r){return c>=0&&c<COLS&&r>=0&&r<ROWS&&r!==PATH_ROW&&!hasTower(c,r)}

function place(card,c,r){
  if(!validCell(c,r))return false;
  const x=c*TILE+25,y=r*TILE+25;
  towers.push({...card,col:c,row:r,x,y,cooldown:0});
  inventory.splice(dragging.index,1);
  return true;
}

function upgrade(t){
  if(t.level>=3)return;
  const costs=[0,60,120];
  if(gold<costs[t.level])return;
  gold-=costs[t.level];t.level++;
  const tm=types[t.type],rm=rarity[t.rarity],sm=t.rarity==="super"?3:1;
  t.damage=[0,10,18,30][t.level]*tm.damage*rm.mul*sm;
  t.range=[0,120,140,160][t.level]*tm.range*(t.rarity==="super"?2.5:1+(rm.mul-1)*.12);
  t.fireRate=Math.max(8,[0,35,28,20][t.level]*tm.rate/(t.rarity==="super"?3:rm.mul));
  t.splash=tm.splash*(t.rarity==="super"?2.5:1+(rm.mul-1)*.15);
}

canvas.addEventListener("mousemove",e=>{
  const r=canvas.getBoundingClientRect();
  mouse.x=(e.clientX-r.left)*W/r.width;
  mouse.y=(e.clientY-r.top)*H/r.height;
  mouse.col=Math.floor(mouse.x/TILE);mouse.row=Math.floor(mouse.y/TILE);
  if(dragging){dragging.x=mouse.x;dragging.y=mouse.y}
});
canvas.addEventListener("mousedown",e=>{
  if(state!=="playing")return;
  const r=canvas.getBoundingClientRect();
  const x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;

  const sx=W-175,sy=H-72;
  if(x>=sx&&x<=sx+160&&y>=sy&&y<=sy+60){summon();return}

  for(let i=0;i<inventory.length;i++){
    const cx=15+i*77,cy=H-72;
    if(x>=cx&&x<=cx+70&&y>=cy&&y<=cy+60){
      dragging={data:inventory[i],index:i,x,y};return;
    }
  }
  for(const t of towers){
    if(Math.hypot(t.x-x,t.y-y)<24){selectedTower=t;return}
  }
  selectedTower=null;
});
canvas.addEventListener("mouseup",()=>{
  if(!dragging)return;
  const c=Math.floor(dragging.x/TILE),r=Math.floor(dragging.y/TILE);
  if(validCell(c,r))place(dragging.data,c,r);
  dragging=null;
});

function updateStatus(){
  document.getElementById("hp").textContent=Math.max(0,Math.floor(hp));
  document.getElementById("gold").textContent=Math.floor(gold);
  document.getElementById("wave").textContent=wave;
}

function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle="#18301f";ctx.fillRect(0,0,W,H);

  // subtle terrain
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    ctx.fillStyle=(r+c)%2?"#1b3522":"#1e3a25";
    ctx.fillRect(c*TILE,r*TILE,TILE,TILE);
  }

  // road
  ctx.fillStyle="#8a6b4a";ctx.fillRect(0,PATH_ROW*TILE,W,TILE);
  ctx.fillStyle="#9b7a55";
  for(let x=0;x<W;x+=24)ctx.fillRect(x,PATH_ROW*TILE+20,12,4);

  // base
  ctx.fillStyle="#416a8a";ctx.fillRect(850,235,42,80);
  ctx.fillStyle="#bfe6ff";ctx.font="bold 11px Arial";ctx.textAlign="center";ctx.fillText("BASE",871,278);

  // towers
  for(const t of towers){
    const rm=rarity[t.rarity];
    if(selectedTower===t){
      ctx.strokeStyle="rgba(100,200,255,.35)";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(t.x,t.y,t.range,0,Math.PI*2);ctx.stroke();
    }
    if(t.rarity==="legendary"||t.rarity==="super"){
      ctx.strokeStyle=rm.color;ctx.lineWidth=t.rarity==="super"?4:2;
      ctx.beginPath();ctx.arc(t.x,t.y,22+(t.rarity==="super"?5:0),0,Math.PI*2);ctx.stroke();
    }
    ctx.fillStyle=t.type==="cannon"?"#c86d4e":t.type==="splash"?"#9167c7":"#5277db";
    ctx.fillRect(t.x-14,t.y-14,28,28);
    ctx.fillStyle="#fff";ctx.font="bold 9px Arial";ctx.fillText("Lv"+t.level,t.x,t.y+4);
  }

  // enemies
  for(const e of enemies){
    ctx.fillStyle=e.type==="boss"?"#76209a":e.type==="fast"?"#e98b36":e.type==="cluster"?"#39aa8c":"#d43d43";
    ctx.beginPath();ctx.arc(e.x,e.y,e.type==="boss"?22:e.type==="cluster"?15:12,0,Math.PI*2);ctx.fill();
    if(e.type==="boss"){
      ctx.fillStyle="#fff";ctx.font="bold 10px Arial";ctx.fillText("BOSS",e.x,e.y-30);
    }
    ctx.fillStyle="#222";ctx.fillRect(e.x-18,e.y-22,e.type==="boss"?36:28,4);
    ctx.fillStyle="#62e17a";ctx.fillRect(e.x-18,e.y-22,(e.type==="boss"?36:28)*Math.max(0,e.hp/e.max),4);
  }

  // bullets
  ctx.fillStyle="#ffe36a";
  for(const b of bullets){ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill()}

  if(state==="playing")drawUI();
  if(selectedTower&&state==="playing")drawUpgrade();
  if(state==="menu")drawMenu();
  if(state==="clear"||state==="gameover")drawEnd();
}

function drawUI(){
  const y=H-72;
  ctx.fillStyle="rgba(10,15,20,.92)";ctx.fillRect(8,y,W-190,62);
  for(let i=0;i<inventory.length;i++){
    const t=inventory[i],rm=rarity[t.rarity],x=15+i*77;
    ctx.fillStyle="#222a35";ctx.fillRect(x,y,70,60);
    ctx.strokeStyle=rm.color;ctx.lineWidth=2;ctx.strokeRect(x,y,70,60);
    ctx.fillStyle=rm.color;ctx.font="bold 8px Arial";ctx.fillText(rm.name,x+35,y+11);
    ctx.fillStyle=t.type==="cannon"?"#c86d4e":t.type==="splash"?"#9167c7":"#5277db";
    ctx.fillRect(x+25,y+19,20,20);
    ctx.fillStyle="#fff";ctx.font="9px Arial";ctx.fillText(t.type.toUpperCase(),x+35,y+51);
  }
  ctx.fillStyle=gold>=SUMMON_COST&&inventory.length<MAX_INVENTORY?"#3977d6":"#555";
  ctx.fillRect(W-175,y,160,60);
  ctx.fillStyle="#fff";ctx.font="bold 13px Arial";ctx.fillText("SUMMON TOWER",W-95,y+24);
  ctx.font="11px Arial";ctx.fillText(`${SUMMON_COST} GOLD  ${inventory.length}/${MAX_INVENTORY}`,W-95,y+43);

  if(dragging){
    const ok=validCell(Math.floor(dragging.x/TILE),Math.floor(dragging.y/TILE));
    ctx.fillStyle=ok?"rgba(80,230,130,.25)":"rgba(255,70,70,.25)";
    ctx.fillRect(mouse.col*TILE+2,mouse.row*TILE+2,TILE-4,TILE-4);
    ctx.strokeStyle=ok?"#74e39a":"#ff7777";ctx.lineWidth=2;
    ctx.strokeRect(mouse.col*TILE+2,mouse.row*TILE+2,TILE-4,TILE-4);
    ctx.globalAlpha=.9;ctx.fillStyle=rarity[dragging.data.rarity].color;ctx.beginPath();ctx.arc(dragging.x,dragging.y,18,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
}

function drawUpgrade(){
  const t=selectedTower,rm=rarity[t.rarity];
  const x=650,y=20,w=235,h=115;
  ctx.fillStyle="rgba(10,15,20,.95)";ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=rm.color;ctx.strokeRect(x,y,w,h);
  ctx.fillStyle=rm.color;ctx.font="bold 12px Arial";ctx.textAlign="left";
  ctx.fillText(`${rm.name} ${t.type.toUpperCase()}  Lv.${t.level}`,x+12,y+22);
  ctx.fillStyle="#fff";ctx.font="11px Arial";
  ctx.fillText(`DMG ${Math.floor(t.damage)}   RANGE ${Math.floor(t.range)}`,x+12,y+45);
  ctx.fillText(`업그레이드: ${t.level>=3?"MAX":"Lv "+(t.level+1)}`,x+12,y+64);
  if(t.level<3){ctx.fillText(`비용 ${[0,60,120][t.level]} GOLD`,x+12,y+83);ctx.fillStyle="#3977d6";ctx.fillRect(x+130,y+72,90,30);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.fillText("UPGRADE",x+175,y+92)}
  ctx.textAlign="left";
}

canvas.addEventListener("click",e=>{
  if(!selectedTower||state!=="playing")return;
  const r=canvas.getBoundingClientRect();
  const x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;
  if(x>=780&&x<=870&&y>=92&&y<=122)upgrade(selectedTower);
});

function panel(title,sub){
  ctx.fillStyle="rgba(8,12,18,.94)";ctx.fillRect(250,145,400,260);
  ctx.strokeStyle="#4b627d";ctx.lineWidth=2;ctx.strokeRect(250,145,400,260);
  ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="bold 28px Arial";ctx.fillText(title,450,205);
  ctx.fillStyle="#aeb8c6";ctx.font="14px Arial";ctx.fillText(sub,450,235);
}
function drawMenu(){
  panel("TOWER DEFENSE","마우스로 타워를 설치해 기지를 지키세요.");
  ctx.fillStyle="#3977d6";ctx.fillRect(350,270,200,55);
  ctx.fillStyle="#fff";ctx.font="bold 18px Arial";ctx.fillText("GAME START",450,305);
  ctx.font="12px Arial";ctx.fillStyle="#9aa7b7";ctx.fillText("랜덤 타워 소환 · 드래그 설치 · 업그레이드",450,355);
}
function drawEnd(){
  panel(state==="clear"?"CLEAR!":"GAME OVER",state==="clear"?"5웨이브 보스를 처치했습니다.":"기지의 HP가 0이 되었습니다.");
  ctx.fillStyle="#3977d6";ctx.fillRect(335,270,230,52);
  ctx.fillStyle="#fff";ctx.font="bold 16px Arial";ctx.fillText("RESTART",450,303);
  ctx.fillStyle="#777";ctx.font="12px Arial";ctx.fillText("버튼을 눌러 다시 시작하세요.",450,350);
}
canvas.addEventListener("click",e=>{
  if(state==="menu"){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;
    if(x>=350&&x<=550&&y>=270&&y<=325)startGame();
  }else if(state==="clear"||state==="gameover"){
    const r=canvas.getBoundingClientRect();
    const x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;
    if(x>=335&&x<=565&&y>=270&&y<=322)startGame();
  }
});

function loop(now){
  const dt=Math.min(40,now-last);last=now;
  update(dt);draw();requestAnimationFrame(loop);
}
updateStatus();
draw();
requestAnimationFrame(loop);
