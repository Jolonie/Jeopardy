import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {parseQuiz,answerPoints,adjustScore,standings,skipBoard,checkAnswer} from './game.js';

const root=dirname(fileURLToPath(import.meta.url));
const token=()=>randomBytes(24).toString('hex');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const nameOf=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>60)fail('Bitte einen Teamnamen mit 1–60 Zeichen eingeben.');return value.trim()};
const complete=r=>r.categories.length===5&&r.categories.every(c=>c.questions.every(q=>q.used));
function imageType(bytes){if(bytes.length>=8&&bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===0x0d&&bytes[5]===0x0a&&bytes[6]===0x1a&&bytes[7]===0x0a)return['image/png','png'];if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return['image/jpeg','jpg'];if(bytes.length>=6&&bytes.subarray(0,6).toString().match(/^GIF8[79]a$/))return['image/gif','gif'];if(bytes.length>=12&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return['image/webp','webp'];return null}

export function createApp({dataFile=join(root,'data','rooms.json')}={}){
 const rooms=new Map();const listeners=new Map();const rates=new Map();
 const imageDir=dataFile?join(dirname(dataFile),'question-images'):null;
 if(dataFile&&existsSync(dataFile))for(const room of JSON.parse(readFileSync(dataFile,'utf8')))if(Date.now()-room.updated<86400000)rooms.set(room.code,room);
 function persist(){if(!dataFile)return;mkdirSync(dirname(dataFile),{recursive:true});writeFileSync(dataFile+'.tmp',JSON.stringify([...rooms.values()]),{mode:0o600});renameSync(dataFile+'.tmp',dataFile)}
 function snapshot(r,s){
  const active=r.active?{c:r.active.c,q:r.active.q,team:r.active.team,text:r.categories[r.active.c].questions[r.active.q].imageKey?'':r.categories[r.active.c].questions[r.active.q].text,image:Boolean(r.categories[r.active.c].questions[r.active.q].imageKey)}:null;
  return {code:r.code,role:'player',teamId:s.team,version:r.version,phase:r.phase,round:r.round,multiplier:r.multiplier,turn:r.turn,teams:r.teams,categories:r.categories.map(c=>({name:c.name,questions:c.questions.map(q=>({used:q.used,skipped:q.skipped}))})),active,lastResult:r.lastResult||null,ranking:standings(r.teams)};
 }
 function broadcast(r){for(const peer of listeners.get(r.code)||[]){if(!r.sessions.includes(peer.session)){peer.res.end();listeners.get(r.code).delete(peer);continue}peer.res.write(`data: ${JSON.stringify(snapshot(r,peer.session))}\n\n`)}}
 function update(r){r.version++;r.updated=Date.now();persist();broadcast(r)}
 function addTeam(r,name){if(r.teams.length>=100)fail('Dieser Raum unterstützt maximal 100 Teams.');name=nameOf(name);if(r.teams.some(t=>t.name.toLowerCase()===name.toLowerCase()))fail('Dieser Teamname ist bereits vergeben.');const team={id:token(),name,score:0};r.teams.push(team);return team}
 function sessionFor(req,r){const key=`quiz_${r.code}=`;const value=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(key))?.slice(key.length);const s=r.sessions.find(s=>s.token===value);if(!s)fail('Bitte diesem Raum erneut beitreten.',401);if(s.role==='team'&&!r.teams.some(t=>t.id===s.team))fail('Dein Team wurde aus dem Raum entfernt.',403);return s}
 function cookie(res,r,s){res.setHeader('Set-Cookie',`quiz_${r.code}=${s.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`)}
 function action(r,s,b){
  if(b.version!==r.version)fail('Der Spielstand hat sich geändert. Bitte erneut versuchen.',409);
  if(b.type==='answer'){
   if(!r.active||r.active.team!==s.team)fail('Dein Team kann gerade keine Antwort abgeben.',403);
   if(typeof b.text!=='string'||!b.text.trim()||b.text.length>2000)fail('Bitte eine Antwort mit maximal 2.000 Zeichen eingeben.');
   const a=r.active,t=r.teams.find(t=>t.id===s.team),q=r.categories[a.c].questions[a.q];
   const correct=!b.passed&&checkAnswer(b.text,q.answer),delta=answerPoints((a.q+1)*100*r.multiplier,correct);
   adjustScore(t,delta);q.used=true;r.turn=(r.turn+1)%r.teams.length;
   r.lastResult={team:t.name,input:b.text.trim(),solution:q.answer,correct,delta};r.active=null;return;
  }
  switch(b.type){
   case 'board':{
    if(r.active||!(r.phase==='lobby'||r.phase==='setup'||complete(r)))fail('Zuerst das aktuelle Board abschließen.');
    if(typeof b.text!=='string'||b.text.length>200000)fail('Bitte einen vollständigen Quiztext eingeben.');
    if(![0.5,1,2,3].includes(b.multiplier))fail('Ungültiger Punktefaktor.');
    const categories=parseQuiz(b.text);for(let c=0;c<categories.length;c++)for(let q=0;q<categories[c].questions.length;q++)if(categories[c].questions[q].text.trim().toLocaleLowerCase('de-DE')==='x'){const slot=`${c}-${q}`,key=b.images?.[slot],prefix=`${r.code}-${r.round}-${slot}-`;if(!imageDir||typeof key!=='string'||!key.startsWith(prefix)||key.includes('/')||!existsSync(join(imageDir,key)))fail(`Für die Bildfrage ${categories[c].name} · ${(q+1)*100} Punkte fehlt ein Bild.`);categories[c].questions[q].imageKey=key}r.categories=categories;r.multiplier=b.multiplier;r.phase='lobby';r.history=[];r.lastResult=null;break;
   }
   case 'start':if(r.phase!=='lobby'||!r.categories.length)fail('Zuerst Fragen importieren.');if(r.categories.some(c=>c.questions.some(q=>q.text.trim().toLocaleLowerCase('de-DE')==='x'&&!q.imageKey)))fail('Für jede mit x markierte Bildfrage muss ein Bild hochgeladen werden.');if(r.teams.length<2)fail('Mindestens zwei Teams müssen teilnehmen.');r.phase='game';break;
   case 'open':{
    if(r.phase!=='game'||r.active||complete(r))fail('Keine Frage auswählbar.');
    if(r.teams[r.turn]?.id!==s.team)fail('Nur das Team am Zug darf eine Frage wählen.',403);
    if(!Number.isInteger(b.c)||!Number.isInteger(b.q)||!r.categories[b.c]?.questions[b.q]||r.categories[b.c].questions[b.q].used)fail('Diese Frage ist nicht verfügbar.');
    r.active={c:b.c,q:b.q,team:r.teams[r.turn].id};r.lastResult=null;break;
   }
   case 'pass':if(!r.active||r.active.team!==s.team)fail('Dein Team ist nicht am Zug.',403);return action(r,s,{type:'answer',text:'[Keine Antwort]',passed:true,version:r.version});
   case 'skip':if(r.phase!=='game'||r.active)fail('Bitte zuerst die Frage schließen.');skipBoard(r);break;
   case 'next':if(!complete(r)||r.active)fail('Zuerst das Board abschließen.');r.round++;r.phase='setup';r.categories=[];r.history=[];break;
   case 'finish':if(!complete(r)||r.active)fail('Zuerst das Board abschließen.');r.phase='winner';break;
   case 'remove-team':{
    if(!(r.phase==='lobby'||r.phase==='setup'||complete(r))||r.active)fail('Teams nur zwischen Boards ändern.');
    const i=r.teams.findIndex(t=>t.id===b.team);if(i<0)fail('Team nicht verfügbar.');if(r.teams.length<=2)fail('Mindestens zwei Teams müssen bleiben.');
    r.teams.splice(i,1);if(i<r.turn)r.turn--;r.turn%=r.teams.length;r.history=[];r.sessions=r.sessions.filter(s=>s.team!==b.team);break;
   }
   case 'abort':r.phase='closed';r.active=null;break;
   default:fail('Unbekannte Aktion.');
  }
 }
 const server=http.createServer(async(req,res)=>{
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
  try{
   const url=new URL(req.url,'http://localhost');
   res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
   if(req.method==='POST'){
    if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)fail('Anfrage von fremder Website abgelehnt.',403);
    const ip=req.socket.remoteAddress,now=Date.now();if(rates.size>10000)rates.clear();let rate=rates.get(ip);if(!rate||now-rate.time>60000){rate={time:now,count:0};rates.set(ip,rate)}if(++rate.count>600)fail('Zu viele Anfragen. Bitte kurz warten.',429);
    const imageMatch=/^\/api\/rooms\/([A-F0-9]{8})\/question-image$/.exec(url.pathname);
    if(imageMatch){const r=rooms.get(imageMatch[1]);if(!r)fail('Raum nicht gefunden oder abgelaufen.',404);sessionFor(req,r);if(!(r.phase==='setup'||r.phase==='lobby'))fail('Bilder können nur bei der Boardvorbereitung hochgeladen werden.');const slot=url.searchParams.get('slot');if(!/^[0-4]-[0-4]$/.test(slot||''))fail('Ungültiges Fragenfeld.');if(!imageDir)fail('Die lokale Bildspeicherung ist nicht verfügbar.',503);const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>5242880)fail('Das Bild ist zu groß (maximal 5 MB).',413);chunks.push(chunk)}const bytes=Buffer.concat(chunks),detected=imageType(bytes);if(!detected)fail('Bitte ein PNG-, JPG-, GIF- oder WebP-Bild auswählen.');mkdirSync(imageDir,{recursive:true});const key=`${r.code}-${r.round}-${slot}-${token()}.${detected[1]}`;writeFileSync(join(imageDir,key),bytes,{mode:0o600});return json(201,{key,slot})}
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>300000)fail('Datei zu groß.',413)}
    let b;try{b=JSON.parse(body)}catch{fail('Ungültige Anfrage.')}
    if(!b||typeof b!=='object'||Array.isArray(b))fail('Ungültige Anfrage.');
    if(url.pathname==='/api/rooms'){
     for(const [code,r]of rooms)if(now-r.updated>86400000&&!listeners.get(code)?.size)rooms.delete(code);
     if(rooms.size>=200)fail('Der Server hat zurzeit zu viele Spielräume.',503);
     let code;do{code=randomBytes(4).toString('hex').toUpperCase()}while(rooms.has(code));
     const name=nameOf(b.name),team={id:token(),name,score:0};
     const s={token:token(),role:'team',team:team.id},r={code,sessions:[s],version:0,updated:now,phase:'setup',round:1,multiplier:1,turn:0,teams:[team],categories:[],active:null,history:[]};rooms.set(code,r);persist();cookie(res,r,s);return json(201,snapshot(r,s));
    }
    const match=/^\/api\/rooms\/([A-F0-9]{8})\/(join|action)$/.exec(url.pathname);if(!match)fail('Nicht gefunden.',404);
    const r=rooms.get(match[1]);if(!r)fail('Raum nicht gefunden oder abgelaufen.',404);if(r.phase==='closed')fail('Das Spiel wurde beendet.',410);
    if(match[2]==='join'){
     if(!(r.phase==='lobby'||r.phase==='setup'||complete(r))||r.active)fail('Beitritt erst wieder nach diesem Board möglich.');
     const team=addTeam(r,b.name),s={token:token(),role:'team',team:team.id};r.sessions.push(s);update(r);cookie(res,r,s);return json(201,snapshot(r,s));
    }
    const s=sessionFor(req,r);action(r,s,b);update(r);return json(200,snapshot(r,s));
   }
   const imageMatch=/^\/api\/rooms\/([A-F0-9]{8})\/question-image$/.exec(url.pathname);
   if(req.method==='GET'&&imageMatch){const r=rooms.get(imageMatch[1]);if(!r)fail('Raum nicht gefunden oder abgelaufen.',404);sessionFor(req,r);const c=Number(url.searchParams.get('c')),q=Number(url.searchParams.get('q'));if(!Number.isInteger(c)||!Number.isInteger(q)||r.active?.c!==c||r.active?.q!==q)fail('Dieses Bild ist zurzeit nicht sichtbar.',403);const key=r.categories[c]?.questions[q]?.imageKey;if(!key||key.includes('/')||!imageDir)fail('Für diese Frage ist kein Bild hinterlegt.',404);const file=join(imageDir,key);if(!existsSync(file))fail('Das Bild ist nicht mehr verfügbar.',404);const type=key.endsWith('.png')?'image/png':key.endsWith('.jpg')?'image/jpeg':key.endsWith('.gif')?'image/gif':'image/webp';res.writeHead(200,{'Content-Type':type,'Content-Disposition':'inline','Cache-Control':'private, no-store'});return res.end(readFileSync(file))}
   const match=/^\/api\/rooms\/([A-F0-9]{8})(\/events)?$/.exec(url.pathname);
   if(req.method==='GET'&&match){
    const r=rooms.get(match[1]);if(!r)fail('Raum nicht gefunden oder abgelaufen.',404);const s=sessionFor(req,r);
    if(!match[2])return json(200,snapshot(r,s));
    let peers=listeners.get(r.code);if(!peers){peers=new Set();listeners.set(r.code,peers)}if(peers.size>=250)fail('Zu viele Verbindungen.',429);
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    const peer={res,session:s};peers.add(peer);res.write(`data: ${JSON.stringify(snapshot(r,s))}\n\n`);
    const interval=setInterval(()=>res.write(': heartbeat\n\n'),15000);req.on('close',()=>{clearInterval(interval);peers.delete(peer)});return;
   }
   if(req.method!=='GET')fail('Nicht gefunden.',404);
   if(url.pathname==='/healthz')return json(200,{status:'ok'});
   const files={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css'],'/assets/cafe-canape-logo.png':['assets/cafe-canape-logo.png','image/png'],'/template.txt':['template.txt','text/plain']};
   const file=files[url.pathname];if(!file)fail('Nicht gefunden.',404);
   res.writeHead(200,{'Content-Type':file[1]+'; charset=utf-8','Cache-Control':'no-cache'});res.end(readFileSync(join(root,'public',file[0])));
  }catch(error){if(!res.headersSent)json(error.status||400,{error:error.status&&error.status>=500?'Server vorübergehend nicht verfügbar.':error.message});else res.end()}
 });
 server.on('close',()=>{for(const peers of listeners.values())for(const p of peers)p.res.end()});
 return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const server=createApp();server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Quizabend Multiplayer läuft auf Port ${server.address().port}`));
}
