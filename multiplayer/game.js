export function answerPoints(value, correct) {
  return correct ? value : -value / 2;
}

export function checkAnswer(input, solution) {
  const normalize=text=>String(text).normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
  const answer=normalize(input);
  return Boolean(answer)&&String(solution).split('|').some(alias=>normalize(alias)===answer);
}

export function advanceTurn(current, teamCount) {
  return (current + 1) % teamCount;
}

export function skipBoard(state) {
  for (const category of state.categories) {
    for (const question of category.questions) {
      if (!question.used) {
        question.used = true;
        question.skipped = true;
      }
    }
  }
}

export function applyTeamChanges(state, entries) {
  if (state.phase !== 'game' || state.categories.some(c => c.questions.some(q => !q.used))) throw new Error('Teams können erst nach Abschluss des Boards geändert werden.');
  if (entries.length < 2) throw new Error('Mindestens zwei Teams müssen im Spiel bleiben.');
  const names = entries.map(t => t.name.trim());
  if (names.some(name => !name)) throw new Error('Bitte für jedes Team einen Namen eingeben.');
  if (new Set(names.map(name => name.toLowerCase())).size !== names.length) throw new Error('Teamnamen müssen eindeutig sein.');
  const sources = entries.filter(t => t.source !== undefined).map(t => t.source);
  if (new Set(sources).size !== sources.length || sources.some(i => !Number.isInteger(i) || !state.teams[i])) throw new Error('Ungültige Teamzuordnung. Bitte die Teamverwaltung erneut öffnen.');
  const teams = entries.map((t,i) => ({name:names[i],score:t.source === undefined ? 0 : state.teams[t.source].score}));
  let turn = 0;
  for (let offset = 0; offset < state.teams.length; offset++) {
    const next = ((state.turn || 0) + offset) % state.teams.length;
    const index = entries.findIndex(t => t.source === next);
    if (index !== -1) { turn = index; break; }
  }
  const changed = entries.length !== state.teams.length || entries.some((t,i) => t.source !== i || names[i] !== state.teams[i].name);
  if (changed) state.history = [];
  state.teams = teams;
  state.turn = turn;
}

export function correctionDelta(score, input, mode) {
  const text = String(input).trim().replaceAll('−', '-');
  if (!/^[+-]?\d+$/.test(text)) throw new Error('Bitte eine ganze Zahl eingeben, z. B. 100 oder −100.');
  const value = Number(text);
  if (!Number.isSafeInteger(value)) throw new Error('Die eingegebene Punktzahl ist zu groß.');
  if (mode === 'set') return value - score;
  if (mode === 'subtract') return -Math.abs(value);
  if (mode === 'add') return value;
  throw new Error('Bitte eine gültige Korrekturart wählen.');
}

export function nextRound(state) {
  state.round = (state.round || 1) + 1;
  state.phase = 'questions';
  state.categories = Array.from({length:5}, () => ({name:'', questions:Array.from({length:5}, () => ({text:'',answer:'',used:false}))}));
  state.history = [];
}

export function standings(teams) {
  return teams.map(t => ({...t})).sort((a,b) => b.score-a.score)
    .map((t,i,sorted) => ({...t,rank:sorted.findIndex(other => other.score === t.score)+1}));
}

export function parseQuiz(text) {
  const categories = [];
  let category, question;
  const fail = (line, message) => { throw new Error(`Zeile ${line}: ${message}`); };
  for (const [index, raw] of text.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) continue;
    const match = /^(Kategorie|Punkte|Frage|Antwort):\s*(.*)$/i.exec(line);
    if (!match) fail(index + 1, 'Erwartet wird Kategorie:, Punkte:, Frage: oder Antwort:. Jede Angabe gehört in eine eigene Zeile.');
    const [, label, value] = match;
    if (!value) fail(index + 1, 'Die Angabe darf nicht leer sein.');
    switch (label.toLowerCase()) {
      case 'kategorie':
        category = {name: value, questions: []};
        categories.push(category);
        question = null;
        break;
      case 'punkte': {
        if (!category) fail(index + 1, 'Zuerst eine Kategorie angeben.');
        const expected = (category.questions.length + 1) * 100;
        if (expected > 500 || value !== String(expected)) fail(index + 1, 'Pro Kategorie Punkte in dieser Reihenfolge angeben: 100, 200, 300, 400, 500.');
        question = {text: '', answer: '', used: false};
        category.questions.push(question);
        break;
      }
      default: {
        if (!question) fail(index + 1, 'Vor jeder Frage zuerst Punkte: angeben.');
        const field = label.toLowerCase() === 'frage' ? 'text' : 'answer';
        if (question[field]) fail(index + 1, 'Frage oder Antwort für diesen Punktewert ist doppelt vorhanden.');
        question[field] = value;
      }
    }
  }
  const error = validateSetup(categories, [{name: 'A'}, {name: 'B'}]);
  if (error) throw new Error(error);
  return categories;
}

export function quizTemplate() {
  return Array.from({length: 5}, (_, i) => `Kategorie: Kategorie ${i + 1}\n\n` +
    Array.from({length: 5}, (_, j) => `Punkte: ${(j + 1) * 100}\nFrage: Hier Frage ${j + 1} eingeben\nAntwort: Hier Lösung ${j + 1} eingeben`).join('\n\n')).join('\n\n');
}

export function adjustScore(team, delta) {
  if (!Number.isSafeInteger(delta) || !Number.isSafeInteger(team.score + delta)) throw new Error('Bitte eine gültige ganze Punktzahl eingeben.');
  team.score += delta;
}
export function validateSetup(categories, teams) {
  if (categories.length !== 5 || categories.some(c => !c.name.trim() || c.questions.length !== 5 || c.questions.some(q => !q.text.trim() || !q.answer.trim()))) return 'Bitte alle fünf Kategorien und alle 25 Fragen mit Lösung ausfüllen.';
  if (teams.length < 2 || teams.some(t => !t.name.trim())) return 'Bitte mindestens zwei Teams mit Namen anlegen.';
  if (new Set(teams.map(t => t.name.trim().toLowerCase())).size !== teams.length) return 'Teamnamen müssen eindeutig sein.';
  return '';
}
