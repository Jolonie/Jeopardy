import {createApp} from './server.js';
import {networkInterfaces} from 'node:os';
import {spawn} from 'node:child_process';

const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535){console.error('PORT muss eine ganze Zahl zwischen 1 und 65535 sein.');process.exit(1)}
const server=createApp();
server.on('error',error=>{
 console.error(error.code==='EADDRINUSE'?`Port ${port} ist bereits belegt. Bitte die bereits laufende Quizabend-Version beenden.`:`Server konnte nicht gestartet werden: ${error.message}`);
 process.exitCode=1;
});
server.listen(port,'0.0.0.0',()=>{
 const url=`http://localhost:${port}`;
 console.log(`Auf diesem Computer: ${url}`);
 console.log('\nAndere Geraete im gleichen WLAN/LAN oeffnen eine dieser Adressen:');
 for(const addresses of Object.values(networkInterfaces()))for(const address of addresses||[])if(address.family==='IPv4'&&!address.internal)console.log(`  http://${address.address}:${port}`);
 console.log('\nFuer Einladungen an andere Geraete den Raum ueber die LAN-Adresse oeffnen.');
 console.log('Falls Windows fragt: Zugriff fuer private Netzwerke erlauben.');
 console.log('Fuer Internetzugriff wird weiterhin ein oeffentlich erreichbarer Server benoetigt.');
 if(process.platform==='win32'){
  const browser=spawn('cmd.exe',['/d','/c','start','',url],{stdio:'ignore',windowsHide:true});
  browser.on('error',()=>console.log(`Bitte den Browser selbst oeffnen: ${url}`));
 }
});
