import {adjustScore,validateSetup,answerPoints,parseQuiz,quizTemplate,correctionDelta,nextRound,standings,advanceTurn,skipBoard} from './game.js';
const key='quizabend-v1';
const fresh=()=>({phase:'questions',round:1,turn:0,categories:Array.from({length:5},()=>({name:'',questions:Array.from({length:5},()=>({text:'',answer:'',used:false}))})),teams:Array.from({length:10},(_,i)=>({name:`Team ${i+1}`,score:0})),history:[]});
let state;try{state=JSON.parse(localStorage.getItem(key))||fresh();if(!['questions','teams','game','winner'].includes(state.phase)||!Array.isArray(state.categories)||!Array.isArray(state.teams))state=fresh()}catch{state=fresh()}
state.round ||= 1;
if(!Number.isInteger(state.turn)||state.turn<0||state.turn>=state.teams.length)state.turn=state.categories.flatMap(c=>c.questions).filter(q=>q.used).length%state.teams.length;
const factor=()=>state.round>1?2:1;
const app=document.querySelector('#app'),dialog=document.querySelector('#question');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let timer;function notify(msg){document.querySelector('#notice').textContent=msg;clearTimeout(timer);timer=setTimeout(()=>document.querySelector('#notice').textContent='',4500)}
function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch{notify('Speichern im Browser fehlgeschlagen. Bitte Browser-Speicher prüfen.')}}
function steps(){return `<div class="steps">${['Fragen vorbereiten','Teams anlegen','Spielen'].map((x,i)=>`<span class="${['questions','teams','game'][i]===state.phase?'active':''}">${i+1} · ${x}</span>`).join('')}</div>`}
function render(){
 if(state.phase==='questions')app.innerHTML=`<div class="eyebrow">DEIN ABEND, DEINE FRAGEN</div><h1>${state.round>1?`Board ${state.round} vorbereiten.`:"Das Spiel beginnt mit dir."}</h1>${state.round>1?'<p>Teams und Punkte bleiben erhalten. Dieses Board zählt doppelt: 200–1.000 Punkte. Die TXT-Datei verwendet weiterhin die Stufen 100–500; die Verdopplung erfolgt automatisch.</p>':''}<p>Fünf Kategorien, fünf Schwierigkeitsstufen, 25 Chancen zu glänzen.<br>Trage für jedes Feld eine Frage und die passende Lösung ein.</p>${steps()}<section class="panel" style="margin-bottom:24px"><h2>25 Fragen auf einmal importieren</h2><p>Vorlage herunterladen, ausfüllen und als UTF-8-TXT laden – oder den Text hier einfügen. Der Import ersetzt nach Bestätigung alle Kategorien und Fragen.</p><div class="actions"><button id="template" class="quiet">TXT-Vorlage herunterladen</button><label>TXT-Datei auswählen<input id="quiz-file" type="file" accept=".txt,text/plain"></label></div><details><summary>Text einfügen & Format ansehen</summary><p class="hint">Genau fünf Kategorien mit je fünf Blöcken für 100, 200, 300, 400 und 500 Punkte. Jede Angabe in einer eigenen Zeile; Leerzeilen sind frei wählbar.</p><pre>Kategorie: Allgemeinwissen

Punkte: 100
Frage: Wie heißt die Hauptstadt von Frankreich?
Antwort: Paris</pre><label>Vollständiger Quiztext<textarea id="quiz-text" rows="10" placeholder="Kategorie: …"></textarea></label><div class="actions"><button id="import-text">Text importieren</button></div></details><p id="import-error" role="alert" style="color:#ffb8c3"></p></section><div class="categories">${state.categories.map((c,i)=>`<details class="category" open><summary>Kategorie ${i+1}</summary><label style="margin-top:20px">Kategoriename<input maxlength="80" data-cat="${i}" value="${esc(c.name)}" placeholder="z. B. Wissen & Wunder"></label><div class="questions">${c.questions.map((q,j)=>`<div class="question-row"><div class="points">${(j+1)*100*factor()}</div><label>Frage · Stufe ${j+1}<textarea data-c="${i}" data-q="${j}" data-field="text" placeholder="Deine Frage …">${esc(q.text)}</textarea></label><label>Lösung<textarea data-c="${i}" data-q="${j}" data-field="answer" placeholder="Die richtige Antwort …">${esc(q.answer)}</textarea></label></div>`).join('')}</div></details>`).join('')}</div><div class="actions"><button id="next">${state.round>1?"Neues Board starten →":"Weiter zu den Teams →"}</button></div><p class="hint">Automatisch lokal gespeichert. Fragen und Lösungen sind nur für die Spielleitung gedacht.</p>`;
 else if(state.phase==='teams')app.innerHTML=`<div class="eyebrow">GEMEINSAM RÄTSELN</div><h1>Wer ist heute dabei?</h1><p>Zehn Teams sind vorbereitet. Du kannst Teams hinzufügen oder entfernen; mindestens zwei müssen mitspielen.</p>${steps()}<div class="teams">${state.teams.map((t,i)=>`<div class="panel"><label>Team ${i+1}<input data-team="${i}" maxlength="60" value="${esc(t.name)}"></label><button class="quiet" data-remove="${i}" style="margin-top:12px" ${state.teams.length<=2?'disabled':''}>Entfernen</button></div>`).join('')}</div><div class="actions"><button class="quiet" id="add">+ Team hinzufügen</button><button class="quiet" id="back">← Fragen bearbeiten</button><button id="start">Spiel starten →</button></div>`;
 else if(state.phase==='winner')renderWinner();
 else renderGame();
}
function renderGame(){const left=state.categories.flatMap(c=>c.questions).filter(q=>!q.used).length;app.innerHTML=`<div class="eyebrow">BOARD ${state.round} · ${factor()===2?"DOPPELTE PUNKTE":"DIE BÜHNE GEHÖRT EUCH"}</div><h1>${left?'Wählt eure nächste Herausforderung.':'Board abgeschlossen!'}</h1><p>${left?`${left} von 25 Fragen offen · Bedienung durch eine Spielleitung`:'Board abgeschlossen · Endstand unten'}</p>${left?`<p class="turn-indicator">Am Zug: <strong>${esc(state.teams[state.turn].name)}</strong> <span>· Team bei jeder Frage änderbar</span></p>`:''}<div class="board">${state.categories.map(c=>`<div class="heading">${esc(c.name)}</div>`).join('')}${Array.from({length:5},(_,j)=>state.categories.map((c,i)=>`<button class="tile" data-open="${i},${j}" ${c.questions[j].used?'disabled':''} aria-label="${esc(c.name)}, ${(j+1)*100*factor()} Punkte">${c.questions[j].used?(c.questions[j].skipped?'–':'✓'):(j+1)*100*factor()}</button>`).join('')).join('')}</div>${left?'<div class="actions"><button type="button" id="skip-board" class="quiet">Board überspringen (Test)</button><span class="hint">Schließt alle offenen Fragen ohne Punktevergabe.</span></div>':''}${left?'':'<section class="panel"><h2>Wie geht es weiter?</h2><p>Mit neuen Fragen weiterspielen oder jetzt den Sieger küren.</p><div class="actions"><button id="new-board">Neues Board vorbereiten →</button><button id="finish">Spiel beenden & Sieger anzeigen</button></div></section>'}<h2>Teams & Punktestand</h2><p class="hint">Richtig: Punkte dazu. Falsch: die Hälfte der Punkte abziehen. Manuelle Korrektur: z. B. 100 oder −100 eingeben.</p><div class="teams">${state.teams.map((t,i)=>`<section class="scorecard ${i===state.turn?'current-team':''}"><strong>${esc(t.name)}</strong><div class="score">${t.score} <small>Pkt.</small></div><form data-score="${i}" novalidate><label>Korrekturart<select name="mode" aria-label="Korrekturart für ${esc(t.name)}"><option value="add">Punkte hinzufügen (+/−)</option><option value="subtract">Punkte abziehen</option><option value="set">Punktestand setzen</option></select></label><label>Punkte<input type="text" name="amount" required placeholder="z. B. 100 oder −100" aria-label="Punktekorrektur für ${esc(t.name)}"></label><button type="button" data-apply-score="${i}">Übernehmen</button><span class="score-error" role="alert"></span></form></section>`).join('')}</div><div class="actions"><button id="undo" class="quiet" ${state.history.length?'':'disabled'}>Letzte Änderung rückgängig</button></div><details><summary>Punkteverlauf</summary><div class="history">${state.history.slice().reverse().map(h=>`<div>${esc(h.label)}</div>`).join('')||'Noch keine Änderungen.'}</div></details>`}
app.addEventListener('input',e=>{const d=e.target.dataset;if(d.cat!==undefined)state.categories[+d.cat].name=e.target.value;if(d.field)state.categories[+d.c].questions[+d.q][d.field]=e.target.value;if(d.team!==undefined)state.teams[+d.team].name=e.target.value;save()});
app.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;if(d.applyScore!==undefined){applyCorrection(b.closest('form'));return}if(b.id==='skip-board'){skipBoard(state);save();render();return}if(b.id==='new-board'){nextRound(state);save();render();return}if(b.id==='finish'){state.phase='winner';save();render();return}if(b.id==='return-board'){state.phase='game';save();render();return}if(b.id==='template'){downloadTemplate();return}if(b.id==='import-text'){importQuiz(document.querySelector('#quiz-text').value);return}if(d.open){openQuestion(...d.open.split(',').map(Number));return}if(d.remove!==undefined)state.teams.splice(+d.remove,1);else if(b.id==='add')state.teams.push({name:`Team ${state.teams.length+1}`,score:0});else if(b.id==='back')state.phase='questions';else if(b.id==='next'){const error=validateSetup(state.categories,[{name:'A'},{name:'B'}]);if(error)return notify(error);state.phase=state.round>1?'game':'teams'}else if(b.id==='start'){const error=validateSetup(state.categories,state.teams);if(error)return notify(error);state.phase='game'}else if(b.id==='undo'){const h=state.history.pop();if(h){state.teams[h.team].score=h.previous;if(Number.isInteger(h.previousTurn))state.turn=h.previousTurn;if(h.question)state.categories[h.question[0]].questions[h.question[1]].used=false}}else return;save();render()});
app.addEventListener('submit',e=>{
 e.preventDefault();
 if(e.target.dataset.score!==undefined)applyCorrection(e.target);
});
app.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&e.target.name==='amount'){
  e.preventDefault();applyCorrection(e.target.closest('form'));
 }
});
function applyCorrection(form){
 const i=Number(form.dataset.score);
 try{
  const previous=state.teams[i].score;
  const mode=form.querySelector('[name="mode"]').value;
  const delta=correctionDelta(previous,form.querySelector('[name="amount"]').value,mode);
  adjustScore(state.teams[i],delta);
  state.history.push({team:i,previous,label:`${state.teams[i].name}: ${delta>=0?'+':''}${delta} Punkte (manuell)`});
  const message=`${state.teams[i].name}: ${previous} → ${state.teams[i].score} Punkte`;
  save();
  // Update only this card: keep scroll position and the entered correction mode.
  form.closest('.scorecard').querySelector('.score').innerHTML=`${state.teams[i].score} <small>Pkt.</small>`;
  form.querySelector('[name="amount"]').value='';
  form.querySelector('.score-error').textContent=message;
  document.querySelector('#undo').disabled=false;
  document.querySelector('.history').innerHTML=state.history.slice().reverse().map(h=>`<div>${esc(h.label)}</div>`).join('');
  notify(message);
 }catch(err){form.querySelector('.score-error').textContent=err.message}
}

function renderWinner(){
 const ranked=standings(state.teams),winners=ranked.filter(t=>t.rank===1);
 app.innerHTML=`<section class="winner"><div class="eyebrow">QUIZABEND · ENDERGEBNIS</div><div class="trophy" aria-hidden="true">🏆</div><h1>${winners.length>1?'Gemeinsamer Sieg!':'Wir haben ein Siegerteam!'}</h1><h2>${winners.map(t=>esc(t.name)).join(' & ')}</h2><p>${ranked[0].score} Punkte · ${state.round} ${state.round===1?'Board':'Boards'}</p></section><section class="panel"><h2>Die Abschlusstabelle</h2><ol class="ranking">${ranked.map(t=>`<li><span>${t.rank}. ${esc(t.name)}</span><strong>${t.score} Pkt.</strong></li>`).join('')}</ol></section><div class="actions"><button id="return-board" class="quiet">Zurück zum Board / Punkte korrigieren</button><button id="new-board">Mit einem neuen Board weiterspielen</button></div>`;
}

function openQuestion(i,j){const q=state.categories[i].questions[j];dialog.innerHTML=`<div class="eyebrow">${esc(state.categories[i].name)} · ${(j+1)*100*factor()} PUNKTE</div><h2>${esc(q.text)}</h2><button id="reveal" class="quiet">Lösung anzeigen</button><p class="answer" hidden>${esc(q.answer)}</p><label style="margin-top:24px">Antwortendes Team<select id="answer-team"><option value="">Bitte Team wählen</option>${state.teams.map((t,k)=>`<option value="${k}" ${k===state.turn?'selected':''}>${esc(t.name)} (${t.score} Pkt.)</option>`).join('')}</select></label><div class="actions"><button id="correct">✓ Richtig · +${(j+1)*100*factor()}</button><button id="wrong" class="danger">✕ Falsch · −${(j+1)*50*factor()}</button></div><p class="hint">Die Teamreihenfolge läuft nach jeder Bewertung weiter. Eine andere Teamauswahl gilt nur für diese Frage. Die Bewertung schließt diese Frage ab. Bei Bedarf die letzte Änderung anschließend rückgängig machen.</p><button id="close" class="quiet">Zurück ohne Bewertung</button><button type="button" id="abort-question" class="quiet">Spiel abbrechen</button>`;dialog.querySelector('#abort-question').onclick=requestAbort;dialog.querySelector('#reveal').onclick=()=>{dialog.querySelector('.answer').hidden=false;dialog.querySelector('#reveal').hidden=true};dialog.querySelector('#close').onclick=()=>dialog.close();for(const [id,sign]of [['correct',1],['wrong',-1]])dialog.querySelector('#'+id).onclick=()=>{const selected=dialog.querySelector('select').value;if(selected==='')return notify('Bitte zuerst ein Team auswählen.');if(q.used)return;const team=+selected,delta=answerPoints((j+1)*100*factor(),sign===1),previous=state.teams[team].score,previousTurn=state.turn;adjustScore(state.teams[team],delta);q.used=true;state.turn=advanceTurn(state.turn,state.teams.length);state.history.push({team,previous,previousTurn,question:[i,j],label:`${state.teams[team].name}: ${delta>0?'+':''}${delta} Punkte · ${state.categories[i].name}`});save();dialog.close();render()};dialog.showModal()}
const abortDialog=document.querySelector('#abort-game');
function requestAbort(){if(!abortDialog.open)abortDialog.showModal()}
document.querySelector('#reset').onclick=requestAbort;
document.querySelector('#keep-playing').onclick=()=>abortDialog.close();
document.querySelector('#confirm-abort').onclick=()=>{
 if(dialog.open)dialog.close();
 abortDialog.close();
 state=fresh();save();render();
 window.scrollTo({top:0,behavior:'instant'});
 document.querySelector('h1').setAttribute('tabindex','-1');
 document.querySelector('h1').focus({preventScroll:true});
 notify('Spiel abgebrochen. Du kannst ein neues Spiel vorbereiten.');
};
render();

function downloadTemplate(){
 const url=URL.createObjectURL(new Blob([quizTemplate()],{type:'text/plain;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='Quizabend-Vorlage.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importQuiz(text){
 try{
  const categories=parseQuiz(text);
  if(state.categories.some(c=>c.name.trim()||c.questions.some(q=>q.text.trim()||q.answer.trim()))&&!confirm('Vorhandene Kategorien und Fragen durch den Import ersetzen?'))return;
  state.categories=categories;save();render();notify('Fünf Kategorien und 25 Fragen erfolgreich importiert.');
 }catch(err){document.querySelector('#import-error').textContent=err.message}
}
app.addEventListener('change',async e=>{
 if(e.target.id!=='quiz-file')return;
 const file=e.target.files[0];if(!file)return;
 try{importQuiz(await file.text())}catch{document.querySelector('#import-error').textContent='Datei konnte nicht gelesen werden. Bitte als UTF-8-TXT speichern.'}
 e.target.value='';
});
