import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server.js';
import {quizTemplate,checkAnswer} from '../game.js';
async function start(t,dataFile=null){const server=createApp({dataFile});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close()});return `http://127.0.0.1:${server.address().port}`}
async function call(base,path,body,cookie){const res=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]}}
async function room(base){const creator=await call(base,'/api/rooms',{name:'Team 1'}),code=creator.body.code;return {creator,code,post:(body,cookie=creator.cookie)=>call(base,`/api/rooms/${code}/action`,body,cookie),get:(cookie=creator.cookie)=>call(base,`/api/rooms/${code}`,null,cookie),join:name=>call(base,`/api/rooms/${code}/join`,{name})}}
test('automatische Prüfung ignoriert Schreibweise und Leerzeichen, unterstützt Alternativen',()=>{
 assert.ok(checkAnswer('  pARIs  ','Paris'));assert.ok(checkAnswer('STADT   PARIS','Paris | Stadt Paris'));assert.ok(checkAnswer('ÄPFEL','Äpfel'));assert.ok(!checkAnswer('Paris','Berlin'));assert.ok(!checkAnswer('','Paris | '));
});
test('zehn gleichberechtigte Teams, Live-Ereignisse, automatische Punkte und neue Boards',async t=>{
 const base=await start(t),r=await room(base),players=[r.creator];
 for(let i=1;i<10;i++){const p=await r.join(`Team ${i+1}`);assert.equal(p.status,201);players.push(p)}
 const act=async(b,cookie=players[0].cookie)=>{const current=await r.get(cookie);const result=await r.post({...b,version:current.body.version},cookie);assert.equal(result.status,200,JSON.stringify(result.body));return result.body};
 assert.equal((await r.get()).body.teams.length,10);assert.ok(players.every(p=>p.body.role==='player'));
 const text=quizTemplate().replaceAll('Hier Lösung 1 eingeben','Paris | Stadt Paris');
 await act({type:'board',text,multiplier:0.5},players[1].cookie);await act({type:'start'},players[2].cookie);
 let view=(await r.get()).body;assert.ok(!JSON.stringify(view).includes('Paris'));assert.ok(!JSON.stringify(view).includes('Hier Frage'));
 assert.equal((await r.post({type:'open',c:0,q:0,version:view.version},players[1].cookie)).status,403);
 const abort=new AbortController();t.after(()=>abort.abort());const stream=await fetch(`${base}/api/rooms/${r.code}/events`,{headers:{cookie:players[1].cookie},signal:abort.signal});const reader=stream.body.getReader();await reader.read();
 await act({type:'open',c:0,q:0});const event=new TextDecoder().decode((await reader.read()).value);assert.match(event,/Hier Frage 1/);assert.ok(!event.includes('Paris'));
 view=(await r.get()).body;assert.equal(view.active.answer,undefined);
 assert.equal((await r.post({type:'answer',text:'PARIS',version:view.version},players[1].cookie)).status,403);
 const version=view.version;view=await act({type:'answer',text:'  pArIs  '});assert.equal(view.teams[0].score,50);assert.equal(view.turn,1);assert.equal(view.lastResult.correct,true);assert.equal(view.active,null);
 assert.equal((await r.post({type:'answer',text:'Paris',version})).status,409);
 await act({type:'open',c:0,q:1},players[1].cookie);view=await act({type:'answer',text:'falsch'},players[1].cookie);assert.equal(view.teams[1].score,-50);assert.equal(view.turn,2);
 for(const type of ['grade','correct','reveal','undo'])assert.equal((await r.post({type,version:view.version})).status,400);
 assert.equal((await r.join('Spät')).status,400);
 await act({type:'skip'},players[3].cookie);const newcomer=await r.join('Neu');assert.equal(newcomer.status,201);
 view=await act({type:'remove-team',team:view.teams[1].id},players[2].cookie);assert.equal((await r.get(players[1].cookie)).status,401);
 view=await act({type:'next'},players[2].cookie);assert.equal(view.round,2);assert.equal(view.categories.length,0);
 await act({type:'board',text,multiplier:3});await act({type:'start'});view=(await r.get()).body;
 const activePlayer=players.find(p=>p.body.teamId===view.teams[view.turn].id);await act({type:'open',c:0,q:0},activePlayer.cookie);view=await act({type:'pass'},activePlayer.cookie);assert.equal(view.lastResult.delta,-150);
 await act({type:'skip'});view=await act({type:'finish'},newcomer.cookie);assert.equal(view.phase,'winner');assert.equal(view.ranking[0].name,'Team 1');await reader.cancel();abort.abort();
});
test('Zugänge, ungültige Namen, private Daten und Wiederherstellung nach Neustart',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'quiz-room-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const file=join(dir,'rooms.json'),base=await start(t,file),r=await room(base),p=await r.join('Team A');
 assert.equal((await r.join(' team a ')).status,400);assert.equal((await r.get('')).status,401);
 const outsider=await room(base);assert.equal((await r.get(outsider.creator.cookie)).status,401);
 assert.equal((await r.post({type:'board',text:'kaputt',multiplier:1,version:(await r.get()).body.version})).status,400);
 assert.equal((await fetch(base+'/data/rooms.json')).status,404);
 const second=await start(t,file);assert.equal((await call(second,`/api/rooms/${r.code}`,null,r.creator.cookie)).body.teams[1].name,'Team A');assert.equal((await call(second,`/api/rooms/${r.code}`,null,p.cookie)).body.role,'player');
});
test('Bildfragen benötigen einen Upload und zeigen das Bild nur bei geöffneter Frage',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'quiz-images-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const base=await start(t,join(dir,'rooms.json')),r=await room(base);await r.join('Team 2');
 const text=quizTemplate().replace('Frage: Hier Frage 1 eingeben','Frage: x');
 let state=(await r.get()).body;
 assert.equal((await r.post({type:'board',text,multiplier:1,images:{},version:state.version})).status,400);
 assert.equal((await fetch(`${base}/api/rooms/${r.code}/question-image?slot=0-0`,{method:'POST',headers:{cookie:r.creator.cookie,'Content-Type':'image/png'},body:new Uint8Array([1,2,3])})).status,400);
 const upload=await fetch(`${base}/api/rooms/${r.code}/question-image?slot=0-0`,{method:'POST',headers:{cookie:r.creator.cookie,'Content-Type':'image/png'},body:new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])});assert.equal(upload.status,201);const {key}=await upload.json();
 state=(await r.get()).body;assert.equal((await r.post({type:'board',text,multiplier:1,images:{'0-0':key},version:state.version})).status,200);
 state=(await r.get()).body;assert.equal((await r.post({type:'start',version:state.version})).status,200);
 state=(await r.get()).body;assert.equal((await r.post({type:'open',c:0,q:0,version:state.version})).status,200);
 state=(await r.get()).body;assert.equal(state.active.image,true);assert.equal(state.active.text,'');assert.ok(!JSON.stringify(state).includes(key));
 const image=await fetch(`${base}/api/rooms/${r.code}/question-image?c=0&q=0`,{headers:{cookie:r.creator.cookie}});assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');
 assert.equal((await fetch(`${base}/api/rooms/${r.code}/question-image?c=0&q=1`,{headers:{cookie:r.creator.cookie}})).status,403);
});
