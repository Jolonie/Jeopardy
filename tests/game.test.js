import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adjustScore,validateSetup,answerPoints,parseQuiz,quizTemplate,correctionDelta,nextRound,standings,advanceTurn,skipBoard,applyTeamChanges} from '../game.js';
const completedState=()=>{
  const state={phase:'game',categories:parseQuiz(quizTemplate()),teams:[{name:'A',score:500},{name:'B',score:-100},{name:'C',score:900}],turn:1,history:[{team:2,previous:0}]};
  skipBoard(state);return state;
};
test('Teamänderungen behalten Scores und nächsten Zug, neue Teams starten bei null',()=>{
  const state=completedState();
  applyTeamChanges(state,[{source:1,name:'B'},{source:2,name:'C'},{name:'Neu',score:9999}]);
  assert.deepEqual(state.teams,[{name:'B',score:-100},{name:'C',score:900},{name:'Neu',score:0}]);
  assert.equal(state.turn,0);assert.deepEqual(state.history,[]);
  nextRound(state);assert.equal(state.teams[1].score,900);
});
test('Entfernen des aktiven Teams wählt den nächsten verbleibenden Zug',()=>{
  const state=completedState();
  applyTeamChanges(state,[{source:0,name:'A'},{source:2,name:'C'}]);
  assert.equal(state.turn,1);
  state.turn=1;applyTeamChanges(state,[{source:0,name:'A'},{name:'Neu'}]);assert.equal(state.turn,0);
});
test('ungültige Teamänderungen verändern den Zustand nicht',()=>{
  const state=completedState(),before=structuredClone(state);
  for(const draft of [[{source:0,name:'A'}],[{name:'A'},{name:' a '}],[{name:''},{name:'B'}],[{source:99,name:'A'},{name:'B'}],[{source:0,name:'A'},{source:0,name:'B'}]]){
    assert.throws(()=>applyTeamChanges(state,draft));assert.deepEqual(state,before);
  }
  state.categories[0].questions[0].used=false;
  assert.throws(()=>applyTeamChanges(state,[{source:0,name:'A'},{source:1,name:'B'}]),/Abschluss/);
});
test('Speichern ohne Änderungen bewahrt den Undo-Verlauf',()=>{
  const state=completedState();
  applyTeamChanges(state,state.teams.map((t,source)=>({...t,source})));
  assert.equal(state.history.length,1);assert.equal(state.turn,1);
});
test('Board überspringen schließt offene Fragen ohne Punkte oder Zug zu ändern',()=>{
  const state={categories:parseQuiz(quizTemplate()),teams:[{name:'A',score:450}],turn:0,history:[]};
  state.categories[0].questions[0].used=true;
  skipBoard(state);
  assert.ok(state.categories.every(c=>c.questions.every(q=>q.used)));
  assert.equal(state.categories.flatMap(c=>c.questions).filter(q=>q.skipped).length,24);
  assert.equal(state.teams[0].score,450);assert.equal(state.turn,0);assert.deepEqual(state.history,[]);
  skipBoard(state);assert.equal(state.teams[0].score,450);
});
test('Teamrotation läuft durch alle zehn Teams und beginnt erneut',()=>{
  let turn=0;
  for(let i=0;i<25;i++){
    assert.equal(turn,i%10);
    turn=advanceTurn(turn,10);
  }
  assert.equal(turn,5);
});
test('manuelle Korrektur akzeptiert Vorzeichen und unterstützt Setzen und Abziehen',()=>{
  assert.equal(correctionDelta(500,'−100','add'),-100);
  assert.equal(correctionDelta(500,'+100','add'),100);
  assert.equal(correctionDelta(500,'200','subtract'),-200);
  assert.equal(correctionDelta(500,'-200','subtract'),-200);
  assert.equal(correctionDelta(500,'-100','set'),-600);
  for(const input of ['', '1.5', 'abc', '9007199254740992'])assert.throws(()=>correctionDelta(0,input,'add'));
});
test('neue Boards leeren Fragen und Undo-Verlauf, behalten aber Teamstände',()=>{
  const state={round:1,phase:'game',categories:parseQuiz(quizTemplate()),teams:[{name:'A',score:450},{name:'B',score:-100}],history:[{}]};
  nextRound(state);
  assert.equal(state.round,2);assert.equal(state.phase,'questions');
  assert.equal(state.categories.length,5);assert.equal(state.categories[0].questions[0].text,'');
  assert.equal(state.teams[0].score,450);assert.equal(state.teams[1].score,-100);assert.deepEqual(state.history,[]);
  nextRound(state);assert.equal(state.round,3);
});
test('Siegertabelle berücksichtigt Gleichstände und negative Ergebnisse',()=>{
  const teams=[{name:'A',score:-300},{name:'B',score:-100},{name:'C',score:-100}];
  assert.deepEqual(standings(teams).map(t=>[t.name,t.rank]),[['B',1],['C',1],['A',3]]);
  assert.equal(teams[0].name,'A');
});
test('falsche Antworten ziehen exakt den halben Fragewert ab',()=>{
  for(const value of [100,200,300,400,500]){
    assert.equal(answerPoints(value,true),value);
    assert.equal(answerPoints(value,false),-value/2);
  }
});
test('vollständige TXT-Vorlage wird mit BOM und Windows-Zeilenenden importiert',()=>{
  const categories=parseQuiz('\uFEFF'+quizTemplate().replaceAll('\n','\r\n'));
  assert.equal(categories.length,5);
  assert.equal(categories.flatMap(c=>c.questions).length,25);
  assert.equal(categories[0].questions[0].used,false);
  assert.equal(validateSetup(categories,[{name:'A'},{name:'B'}]),'');
});
test('Import weist fehlende, doppelte und falsch angeordnete Angaben zurück',()=>{
  const txt=quizTemplate();
  assert.throws(()=>parseQuiz(txt.replace('Punkte: 100','Punkte: 200')),/Reihenfolge/);
  assert.throws(()=>parseQuiz(txt.replace('Antwort: Hier Lösung 1 eingeben','')),/25 Fragen/);
  assert.throws(()=>parseQuiz(txt+'\nKategorie: Sechs'),/fünf Kategorien/);
  assert.throws(()=>parseQuiz('Frage: Ohne Kategorie'),/zuerst Punkte/);
  assert.throws(()=>parseQuiz(txt.replace('Punkte: 100','Punkte: 100\nFrage: Doppelt')),/doppelt/);
  assert.throws(()=>parseQuiz('Unbekannt: Inhalt'),/Zeile 1/);
});
test('richtige, falsche und manuelle Punkte inklusive negativer Stände',()=>{const t={score:0};adjustScore(t,500);assert.equal(t.score,500);adjustScore(t,-300);assert.equal(t.score,200);adjustScore(t,-450);assert.equal(t.score,-250);assert.throws(()=>adjustScore(t,1.5));assert.equal(t.score,-250)});
test('vollständige 25 Fragen und mindestens zehn Teams unterstützt',()=>{const c=Array.from({length:5},()=>({name:'Kategorie',questions:Array.from({length:5},()=>({text:'Frage',answer:'Antwort'}))}));const teams=Array.from({length:12},(_,i)=>({name:`Team ${i}`}));assert.equal(validateSetup(c,teams),'');c[2].questions[3].answer=' ';assert.match(validateSetup(c,teams),/25 Fragen/)});
test('leere und doppelte Teamnamen verhindern Spielstart',()=>{const c=Array.from({length:5},()=>({name:'Kategorie',questions:Array.from({length:5},()=>({text:'Frage',answer:'Antwort'}))}));assert.match(validateSetup(c,[{name:'A'},{name:' a '}]),/eindeutig/);assert.match(validateSetup(c,[{name:'A'}]),/mindestens zwei/)});
