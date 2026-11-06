import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {WebSocketServer} from 'ws';
import {FOODS,FOOD,TOILETS,TOILET,PETS,EGGS,GIFTS,NPCS,gain,reward,toiletStats,rebirthCost} from './dist/data.js';
import {COUNTDOWN_MS,FLIGHT_MS,BOOST_ACTIVE_MS,BOOST_COOLDOWN_MS,BOOST_CHARGES,boostGrade} from './dist/race-rules.js';
const ROOT=path.dirname(fileURLToPath(import.meta.url)),PORT=Number(process.env.PORT||5178),SAVE_DIR=process.env.SAVE_DIR||path.join(ROOT,'.save');
fs.mkdirSync(SAVE_DIR,{recursive:true});const legacyPath=path.join(SAVE_DIR,'players.json'),statePath=path.join(SAVE_DIR,'state.json');
let profiles={},restored=[];try{const state=JSON.parse(fs.readFileSync(statePath,'utf8'));profiles=state.profiles||{};restored=state.rooms||[];}catch{try{profiles=JSON.parse(fs.readFileSync(legacyPath,'utf8'));}catch{}}
const peers=new Map(),rooms=new Map();
function createRoom(code,snapshots=[]){const room={code,runs:new Map(snapshots.map(r=>[r.racers[0]?.id,r]).filter(([id])=>id)),lastUsed:Date.now()};rooms.set(code,room);return room;}
for(const data of restored)if(/^[A-Z0-9]{4,8}$/.test(data.code)){const runs=data.runs||((data.round&&data.round.phase!=='lobby')?data.round.racers.filter(r=>!r.npc).map(r=>({...data.round,id:String(data.round.id)+'-'+r.id,racers:[r]})):[]);createRoom(data.code,runs);}
function members(room){return [...peers.values()].filter(c=>c.room===room);}
function roomFor(code){return rooms.get(code)||createRoom(code);}
function myRun(c){return c.room.runs.get(c.p.id);}
function save(){const state={version:3,profiles,rooms:[...rooms.values()].filter(r=>r.runs.size).map(r=>({code:r.code,runs:[...r.runs.values()]}))};fs.writeFileSync(statePath+'.tmp',JSON.stringify(state),{mode:0o600});fs.renameSync(statePath+'.tmp',statePath);fs.writeFileSync(legacyPath+'.tmp',JSON.stringify(profiles),{mode:0o600});fs.renameSync(legacyPath+'.tmp',legacyPath);}
function create(id){return {id,name:'新来的屁王',style:'suit',coins:2,power:0,food:'poop',unlocked:['poop'],owned:[],toilet:'none',levels:{},pets:[],equipped:[],rebirth:0,best:0,wins:0,bites:0,races:0,gifts:[],playtime:0,daily:'',tasks:[],autoEat:false,autoRace:false};}
function clean(p){return {...p,gain:gain(p),stats:toiletStats(p),rebirthPrice:rebirthCost(p)};}
function send(c,o){if(c.ws.readyState===1)c.ws.send(JSON.stringify(o));}
function self(c){send(c,{type:'state',pose:c.pose,player:clean(c.p),ready:c.ready,mode:c.mode,result:c.result,room:c.room.code});}
function freeSpawn(room,id){const all=members(room).filter(c=>c.p.id!==id);for(const [x,z]of[[0,4],[-3,4],[3,4],[0,8],[-4,8],[4,8],[-6,0],[6,0]])if(all.every(c=>Math.hypot(c.pose.x-x,c.pose.z-z)>2.4))return{x,z,yaw:0};return{x:(Math.random()-.5)*12,z:8,yaw:0};}
function note(c,text,tone='info'){send(c,{type:'note',text,tone});}
function broadcast(room,o){for(const c of members(room))send(c,o);}
function snapshot(c){return {id:c.p.id,name:c.p.name,style:c.p.style,power:c.p.power,distance:c.p.power,food:c.p.food,toilet:c.p.toilet,pets:c.p.pets.filter(p=>c.p.equipped.includes(p.id)),level:c.p.levels[c.p.toilet]||1,npc:false,boostsLeft:BOOST_CHARGES,bonus:0,perfects:0,lastSeq:0,lastBoost:0};}
function publicRound(c){const r=myRun(c)||{id:0,phase:'lobby',start:0,end:0,racers:[]};return {...r,now:Date.now(),room:c.room.code,...(r.phase==='countdown'?{lineup:r.racers}:{})};}
function unlock(p){const fresh=FOODS.filter(f=>p.power>=f.need&&!p.unlocked.includes(f.id));p.unlocked.push(...fresh.map(f=>f.id));return fresh;}
function bite(c){const now=Date.now();if(!c.active||c.mode!=='lobby'||(c.ready&&myRun(c)?.phase==='countdown')||now-(c.p.lastBiteAt||0)<380)return;c.lastEat=now;c.p.lastBiteAt=now;const amount=gain(c.p);c.p.power+=amount;c.p.bites++;const fresh=unlock(c.p);send(c,{type:'bite',amount,food:c.p.food});if(fresh.length)note(c,`${fresh.at(-1).name}已解锁！去食物菜单装备`,'success');self(c);}
function join(c){if(!c.active||c.mode!=='lobby'||myRun(c))return;if(c.p.power<1)return note(c,'先吃一口食物，再来喷气挑战！');c.ready=true;const run={id:crypto.randomUUID(),phase:'countdown',start:Date.now(),end:Date.now()+COUNTDOWN_MS,racers:[snapshot(c)]};c.room.runs.set(c.p.id,run);send(c,{type:'round',round:publicRound(c)});save();note(c,'3秒后开始你的个人喷气挑战！');self(c);}
function launch(room,run){run.phase='flight';run.start=Date.now();run.end=Date.now()+FLIGHT_MS;const c=peers.get(run.racers[0].id);if(c&&c.room===room){c.mode='flight';c.ready=false;c.roundId=run.id;send(c,{type:'round',round:publicRound(c)});self(c);}save();}
function returnToLobby(c){if(c.mode!=='result')return;c.mode='lobby';c.returnedAt=Date.now();c.result=null;delete c.p.pendingResult;c.pose=freeSpawn(c.room,c.p.id);self(c);save();if(c.p.autoRace)setTimeout(()=>{if(peers.get(c.p.id)===c&&c.active&&c.p.autoRace&&c.mode==='lobby')join(c);},650);}
function scheduleAutoReturn(c){const result=c.result;if(c.p.autoRace&&result)setTimeout(()=>{if(peers.get(c.p.id)===c&&c.active&&c.p.autoRace&&c.result===result)returnToLobby(c);},2200);}
function finish(room,run){const me=run.racers[0],key=room.code+'-'+run.id,p=profiles[me.id];if(p&&p.settledRound!==key){const distance=me.distance??me.power,coins=reward(distance,p),previousBest=p.best;p.coins+=coins;p.races++;p.best=Math.max(p.best,distance);if(distance>=614400)p.wins++;p.settledRound=key;p.pendingResult={roundId:key,room:room.code,distance,reward:coins,perfects:me.perfects||0,bonus:me.bonus||0,previousBest,best:p.best,newRecord:distance>previousBest,champion:distance>=614400,solo:true};const c=peers.get(p.id);if(c&&c.room===room){c.mode='result';c.result=p.pendingResult;c.ready=false;self(c);scheduleAutoReturn(c);}}room.runs.delete(me.id);save();const c=peers.get(me.id);if(c&&c.room===room)send(c,{type:'round',round:publicRound(c)});}
function boost(c,m){const now=Date.now(),round=myRun(c),r=round?.racers.find(r=>r.id===c.p.id),seq=Number(m.seq),reject=reason=>send(c,{type:'boostRejected',seq,reason});if(!c.active||c.mode!=='flight'||round?.phase!=='flight'||!r)return reject('起飞后再喷气');if(!Number.isSafeInteger(seq)||seq<=r.lastSeq)return reject('重复操作');const elapsed=now-round.start;if(elapsed<0||elapsed>BOOST_ACTIVE_MS)return reject('准备落地了');if(r.boostsLeft<=0||now-r.lastBoost<BOOST_COOLDOWN_MS)return reject('喷气正在冷却');r.lastSeq=seq;r.lastBoost=now;r.boostsLeft--;const adjusted=elapsed-Math.min(120,(c.rtt||0)/2),grade=boostGrade(adjusted),bonus=grade==='perfect'?.08:.04;r.bonus=Math.min(.24,r.bonus+bonus);if(grade==='perfect')r.perfects++;r.distance=Math.round(r.power*(1+r.bonus)*100)/100;send(c,{type:'boost',id:r.id,seq,roundId:round.id,grade,amount:bonus,boostsLeft:r.boostsLeft,distance:r.distance,at:now});save();}
function action(c,m){const p=c.p;
 if(m.action==='start'){c.active=true;if(c.mode==='result')scheduleAutoReturn(c);else if(p.autoRace)join(c);self(c);return;}
 if(m.action==='pose'){if(c.mode==='lobby'&&!(c.ready&&myRun(c)?.phase==='countdown')){const a=m.pose,now=Date.now();if(a&&[a.x,a.z,a.yaw].every(Number.isFinite)){const dt=Math.min(.5,Math.max(.06,(now-(c.lastPose||now-100))/1000)),dx=a.x-c.pose.x,dz=a.z-c.pose.z,d=Math.hypot(dx,dz),budget=(4.4*toiletStats(p).speed*1.5+1)*dt+.25,ratio=d>budget?budget/d:1;c.pose={x:Math.max(-27,Math.min(27,c.pose.x+dx*ratio)),z:Math.max(-24,Math.min(22,c.pose.z+dz*ratio)),yaw:a.yaw,moving:!!a.moving,eating:!!a.eating};c.lastPose=now;}}return;}
 if(m.action==='boost'){boost(c,m);return;}
 if(m.action==='eat'){bite(c);return;}
 if(m.action==='toggle'){if(!['autoEat','autoRace'].includes(m.key))return;p[m.key]=!p[m.key];if(m.key==='autoRace'){if(p.autoRace){if(c.mode==='result')scheduleAutoReturn(c);else join(c);}else if(myRun(c)?.phase==='countdown'){c.room.runs.delete(p.id);c.ready=false;send(c,{type:'round',round:publicRound(c)});}}self(c);save();return;}
 if(m.action==='join'){join(c);return;}
 if(m.action==='retry'){if(c.mode==='result'){returnToLobby(c);join(c);}return;}
 if(m.action==='return'){returnToLobby(c);return;}
 if(c.mode!=='lobby'||(c.ready&&myRun(c)?.phase==='countdown'))return note(c,'这一场结束后再更换装备');
 const now=Date.now();if(now-(c.lastAction||0)<50)return;c.lastAction=now;
 if(m.action==='food'){const f=FOOD[m.id];if(!f)return;if(!p.unlocked.includes(f.id))return note(c,`需要 ${f.need.toLocaleString()} 放屁能量`);p.food=f.id;note(c,`已装备 ${f.name}`,'success');}
 if(m.action==='toilet'){const t=TOILET[m.id];if(!t||t.id==='none')return;if(!p.owned.includes(t.id)){if(p.coins<t.cost)return note(c,'金币还不够，比赛和礼物都能获得金币');p.coins-=t.cost;p.owned.push(t.id);p.levels[t.id]=1;}p.toilet=t.id;note(c,`已装备 ${t.name}`,'success');}
 if(m.action==='unequipToilet')p.toilet='none';
 if(m.action==='upgrade'){const t=TOILET[m.id];if(!t||!p.owned.includes(t.id))return;const cost=toiletStats({...p,toilet:t.id}).upgrade;if(p.coins<cost)return note(c,'升级金币不足');p.coins-=cost;p.levels[t.id]++;note(c,`${t.name}升级到 Lv.${p.levels[t.id]}`,'success');}
 if(m.action==='egg'){const e=EGGS[m.id];if(!e)return;if(p.pets.length>=50)return note(c,'宠物背包已满，可以合成或删除');if(p.coins<e.cost)return note(c,'开蛋金币不足');p.coins-=e.cost;const rng=Math.random(),i=rng<.55?0:rng<.88?1:2;const species=PETS[(Number(m.id)*2+i)%PETS.length];const pet={id:crypto.randomUUID(),species:species.id,mult:e.mults[i],rarity:i===0?'普通':i===1?'稀有':'史诗',tier:0};p.pets.push(pet);if(p.equipped.length<3)p.equipped.push(pet.id);send(c,{type:'hatch',pet});}
 if(m.action==='equipPet'){const pet=p.pets.find(x=>x.id===m.id);if(!pet)return;if(p.equipped.includes(pet.id))p.equipped=p.equipped.filter(x=>x!==pet.id);else if(p.equipped.length<3)p.equipped.push(pet.id);else return note(c,'最多装备3只宠物，试试装备最佳');}
 if(m.action==='best'){p.equipped=[...p.pets].sort((a,b)=>b.mult-a.mult).slice(0,3).map(x=>x.id);note(c,'已装备最强的宠物！','success');}
 if(m.action==='deletePet'){p.pets=p.pets.filter(x=>x.id!==m.id);p.equipped=p.equipped.filter(x=>x!==m.id);}
 if(m.action==='fuse'){const pet=p.pets.find(x=>x.id===m.id);if(!pet)return;const same=p.pets.filter(x=>x.species===pet.species&&x.tier===pet.tier&&Math.abs(x.mult-pet.mult)<.001).slice(0,3);if(same.length<3)return note(c,'需要3只相同宠物');const ids=same.map(x=>x.id);p.pets=p.pets.filter(x=>!ids.includes(x.id));p.equipped=p.equipped.filter(x=>!ids.includes(x));const fused={...pet,id:crypto.randomUUID(),tier:pet.tier+1,mult:Math.round(pet.mult*2*100)/100};p.pets.push(fused);if(p.equipped.length<3)p.equipped.push(fused.id);send(c,{type:'hatch',pet:fused,fused:true});}
 if(m.action==='rebirth'){const cost=rebirthCost(p);if(p.coins<cost)return note(c,'重生金币不足');p.coins-=cost;p.rebirth++;p.power=0;note(c,`重生成功！永久力量 +${p.rebirth*10}%`,'success');}
 if(m.action==='gift'){const i=Number(m.id),g=GIFTS[i];if(!g||p.gifts.includes(i))return;if(p.playtime<g.time)return note(c,'礼物还在准备中');p.gifts.push(i);p.coins+=g.coins;note(c,`领取 ${g.coins.toLocaleString()} 金币！`,'success');}
 if(m.action==='daily'){const today=new Date().toISOString().slice(0,10);if(p.daily===today)return note(c,'今天已经签到');p.daily=today;p.coins+=250;note(c,'签到成功，获得250金币！','success');}
 if(m.action==='task'){const tasks=[{ok:p.bites>=10,v:75},{ok:p.races>=1,v:100},{ok:p.pets.length>=3,v:250},{ok:p.best>=614400,v:5000}];const t=tasks[m.id];if(!t||!t.ok||p.tasks.includes(m.id))return;p.tasks.push(m.id);p.coins+=t.v;note(c,`任务完成，获得${t.v}金币`,'success');}
 if(m.action==='style'){if(['suit','bacon','noob','pink','mint'].includes(m.id))p.style=m.id;}
 if(m.action==='name'){const name=String(m.name||'').trim().replace(/[<>]/g,'').slice(0,12);if(name)p.name=name;}
 self(c);save();
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{let uri;try{uri=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}res.setHeader('Cache-Control','no-cache');
 if(uri==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,version:'1.5.1',players:peers.size,rooms:rooms.size}));return;}
 if(uri==='/connection-info'){const addresses=Object.values(os.networkInterfaces()).flat().filter(a=>a&&!a.internal&&a.family==='IPv4').map(a=>`http://${a.address}:${PORT}`);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({lanOrigins:addresses,publicOrigin:process.env.PUBLIC_ORIGIN||null}));return;}
 const f=path.resolve(ROOT,'dist','.'+(uri==='/'?'/index.html':uri));if(!f.startsWith(path.join(ROOT,'dist')+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(f,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');res.end(data);});
});
const wss=new WebSocketServer({server,maxPayload:4096});
wss.on('connection',ws=>{let c;const timer=setTimeout(()=>ws.close(),5000);ws.on('pong',()=>{if(c&&c.pingAt)c.rtt=Date.now()-c.pingAt;});ws.on('message',raw=>{let m;try{m=JSON.parse(raw.toString());}catch{return;}
 if(!c){if(m.type!=='hello'||!/^[-a-zA-Z0-9]{8,80}$/.test(m.id||''))return;clearTimeout(timer);const code=String(m.room||'PARK').toUpperCase();if(!/^[A-Z0-9]{4,8}$/.test(code))return ws.close(4002,'Invalid room');if(!rooms.has(code)&&rooms.size>=128)return ws.close(4003,'Rooms full');let room=roomFor(code);const id=m.id,p=profiles[id]||create(id),activeRoom=[...rooms.values()].find(r=>r.runs.has(id));if(activeRoom)room=activeRoom;if(members(room).filter(x=>x.p.id!==id).length>=8)return ws.close(4003,'Room full');const previous=peers.get(id);if(previous)previous.ws.close(4001,'Opened in another tab');profiles[id]=p;const run=room.runs.get(id),racing=run?.phase==='flight';c={ws,p,room,pose:previous?.room===room?previous.pose:freeSpawn(room,id),mode:racing?'flight':p.pendingResult?'result':'lobby',roundId:run?.id||0,ready:run?.phase==='countdown',result:p.pendingResult||null,lastEat:p.lastBiteAt||0,active:!!m.active,rtt:0};peers.set(id,c);room.lastUsed=Date.now();self(c);send(c,{type:'round',round:publicRound(c)});if(c.active&&c.mode==='result')scheduleAutoReturn(c);return;}
 try{action(c,m);}catch(e){console.error(e);note(c,'这次操作没有完成，请重试');}
 });ws.on('close',()=>{clearTimeout(timer);if(c&&peers.get(c.p.id)===c)peers.delete(c.p.id);});});
let last=Date.now(),lastSave=0;setInterval(()=>{const now=Date.now(),dt=Math.min((now-last)/1000,1);last=now;for(const c of peers.values()){if(c.active)c.p.playtime+=dt;if(c.p.autoEat&&now-c.lastEat>=520)bite(c);if(c.active&&c.p.autoRace&&c.mode==='lobby'&&!c.ready&&c.p.power>0&&now-(c.returnedAt||0)>650)join(c);}
 for(const room of rooms.values()){for(const run of [...room.runs.values()]){if(run.phase==='countdown'&&now>=run.end)launch(room,run);else if(run.phase==='flight'&&now>=run.end)finish(room,run);}const players=members(room).map(c=>({id:c.p.id,name:c.p.name,style:c.p.style,food:c.p.food,toilet:c.p.toilet,pets:c.p.pets.filter(x=>c.p.equipped.includes(x.id)),pose:c.pose,mode:c.mode,ready:c.ready,power:c.p.power,active:c.active}));for(const c of members(room))send(c,{type:'peers',players,round:publicRound(c)});}

 if(now-lastSave>2000){lastSave=now;for(const c of peers.values()){self(c);c.pingAt=now;c.ws.ping();}save();}
},100);
server.listen(PORT,'0.0.0.0',()=>console.log(`Fart Race ready: http://localhost:${PORT}`));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{save();process.exit();});
