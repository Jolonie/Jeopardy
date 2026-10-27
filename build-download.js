import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {quizTemplate} from './game.js';
const root = new URL('./', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const game = read('game.js').replaceAll('export function ', 'function ');
const app = read('app.js').replace(/^import .*?;\n/, '');
const logo = readFileSync(new URL('assets/cafe-canape-logo.png', root)).toString('base64');
const html = read('index.html')
  .replace('src="assets/cafe-canape-logo.png"', () => `src="data:image/png;base64,${logo}"`)
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>${read('style.css')}</style>`)
  .replace('<script type="module" src="app.js"></script>', () => `<script>${game}\n${app}</script>`);
mkdirSync(new URL('download/', root), {recursive:true});
writeFileSync(new URL('download/Quizabend.html', root), html);
writeFileSync(new URL('download/Quizabend-v1.9.html', root), html);
writeFileSync(new URL('download/Quizabend-Vorlage.txt', root), quizTemplate());
