import assert from 'node:assert/strict';
import {checkAnswer as offline} from '../game.js';
import {checkAnswer as multiplayer} from '../multiplayer/game.js';
const checkAnswer=(input,solution)=>{const actual=offline(input,solution);assert.equal(multiplayer(input,solution),actual,'Offline/multiplayer parity');return actual;};
const yes=[
 ['Rot und Blau','Blau, Rot'],['Blau, Rot','Rot und Blau'],
 ['Mars, Venus und Erde','Erde, Mars, Venus'],['Erde; Mars; Venus','Venus und Erde und Mars'],
 ['NewYork und der Eiffelturm','Eiffelturm, New York'],
 ['Richter-Skala und Scovile','Scoville, Richter'],
 ['Paris & Berlin','Berlin und Paris'],['Paris, Berlin','Rom | Berlin und Paris'],
 ['Rot, Blau, und Grün','Grün und Rot und Blau'],['1,5 und 2,5','2,5; 1,5']
];
const no=[['Rot','Rot, Blau'],['Rot, Blau, Grün','Rot und Blau'],['Rot, Rot','Rot und Blau'],['Rot und Grün','Rot und Blau'],['1,5','5,1'],['Mars und Erde','Mars und Venus'],['Berlin oder Paris','Paris, Berlin'],['Scoville und Richter','Scoville und Beaufort']];
for(const [a,b] of yes)assert.equal(checkAnswer(a,b),true,`${a} should match ${b}`);
for(const [a,b] of no)assert.equal(checkAnswer(a,b),false,`${a} should not match ${b}`);
console.log('PASS: list order, delimiters, multiword items, aliases, typos, missing/extra/duplicate items, decimal numbers');
