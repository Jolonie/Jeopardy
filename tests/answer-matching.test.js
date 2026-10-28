import assert from 'node:assert/strict';
import {checkAnswer as offline} from '../game.js';
import {checkAnswer as multiplayer} from '../multiplayer/game.js';
const checkAnswer=(input,solution)=>{const actual=offline(input,solution);assert.equal(multiplayer(input,solution),actual,'Offline/multiplayer parity');return actual;};
const accepted=[['Scoville','Scoville-Skala'],['Scoville-Skala','Scoville'],['Scovilleskala','Scoville'],['Scoville Einheiten','Scoville'],['Scoville-Einheit','Scoville-Skala'],['Scovile-Skala','Scoville'],['Richter','Richterskala'],['Beaufort-Skala','Beaufort'],['NewYork','New York'],['New York','NewYork'],['Eiffel turm','Eiffelturm'],['B e r l i n','Berlin'],['New\tYork','New York'],['der Eiffel turm','Eiffelturm'],['Apollo11','Apollo 11'],['Eiffelturm','Der Eiffelturm'],['der Eiffelturm','Eiffelturm'],['eine Katze','die Katze'],['  PARIS! ','Paris'],['Berln','Berlin'],['Berlni','Berlin'],['Eifelturm','Eiffelturm'],['Muenchen','München'],['Strasse','Straße'],['Herr der Ringe','Der Herr der Ringe'],['Stadt Paris','Paris | Stadt Paris']];
const rejected=[['Scoville','Richter-Skala'],['Skala','Scoville-Skala'],['Scoville 100','Scoville 1000'],['Einheit','Scoville-Einheit'],['','Paris'],['der','Paris'],['Rom','Rum'],['1914','1918'],['Apollo 12','Apollo 11'],['nicht Berlin','Berlin'],['Berlin oder Paris','Berlin'],['Hamburg','Berlin'],['Katze','Katze Hund'],['das','der'],['Suedamerika','Nordamerika']];
for(const [a,b] of accepted)assert.equal(checkAnswer(a,b),true,`${a} should match ${b}`);
for(const [a,b] of rejected)assert.equal(checkAnswer(a,b),false,`${a} should not match ${b}`);
console.log(`PASS: ${accepted.length} accepted and ${rejected.length} rejected answer variants`);
