# Café Canapé · Online-Multiplayer ohne Spielleitung

## Windows-Komplettpaket

Die [ZIP-Datei herunterladen](../download/Quizabend-Multiplayer-Windows.zip), vollständig entpacken und im enthaltenen Ordner `multiplayer` auf `STARTEN.bat` doppelklicken. Benötigt einmalig Node.js LTS ab Version 20; zusätzliche npm-Pakete sind nicht nötig. Der Browser öffnet sich nach erfolgreichem Serverstart. Im Serverfenster stehen die Netzwerkadressen für andere Geräte im selben WLAN. Fertige Beispielfragen und eine Fragenvorlage liegen direkt im Ordner. `ANLEITUNG.txt` erklärt den Start. Die BAT startet einen lokalen Server, kein öffentliches Internet-Hosting.

Separate Kopie der Offline-Anwendung. Alle sind Mitspieler. Bis zu 100 Teams treten mit eigenen Geräten per Raumcode bei (mindestens zwei für den Start). Das Team am Zug wählt eine Frage und gibt eine Antwort ein. Der Server bewertet sie automatisch und schaltet weiter. Es gibt keine Spielleitungsrolle.

## Start

Node.js ab Version 20 installieren, dann im Repository ausführen:

```sh
cd multiplayer
npm start
```

Keine Paketinstallation nötig. Der Server lauscht auf Port 3000, änderbar über `PORT`. Auf dem Servergerät `http://localhost:3000` öffnen. Im gemeinsamen WLAN müssen alle `http://<LAN-IP-des-Servers>:3000` öffnen; die Firewall muss diesen Port erlauben. Der Einladungslink verwendet die Adresse, unter der ihr den Raum geöffnet habt – für andere Geräte also die LAN-IP oder öffentliche Domain verwenden.

## Ablauf

1. Mit eigenem Teamnamen einen Raum erstellen, Raumcode oder Einladungslink teilen. Die Person, die den Raum erstellt, spielt ganz normal mit. Jedes Team nutzt ein eigenes Browserprofil oder Gerät.
2. Mindestens ein weiteres Team tritt bei. Jeder Mitspieler kann den vollständigen Quiztext mit 25 Fragen und Lösungen eingeben oder eine TXT-Datei hochladen. Die bisherige TXT-Vorlage wird unterstützt. Ein Punktefaktor von 0,5×, 1×, 2× oder 3× ist verfügbar. Jeder kann das vorbereitete Board starten.
3. Reihum darf nur das Team am Zug ein Feld öffnen und antworten. Die Antwort wird sofort verbindlich geprüft. Groß-/Kleinschreibung, äußere Leerzeichen und mehrere aufeinanderfolgende Leerzeichen werden ignoriert. Sonst muss die Antwort einer hinterlegten Lösung entsprechen. Keine KI-Bewertung, keine unscharfe Ähnlichkeitsprüfung. Mehrere erlaubte Lösungen mit `|` trennen, z. B. `Antwort: Paris | Stadt Paris`.
4. Richtige Antworten bringen den vollen Wert, falsche kosten die Hälfte. „Weiß nicht“ zählt als falsch. Alle sehen danach die Lösung und den aktualisierten Punktestand. Die nächste Runde geht an das nächste Team. Ungeöffnete Fragen und Lösungen werden nicht an andere Geräte übertragen.
5. Nach einem abgeschlossenen Board können alle ein neues Board vorbereiten, Teams entfernen oder das Spiel mit Siegeranzeige beenden. Neue Teams treten in diesen Pausen per Raumcode bei und starten mit 0 Punkten. Bestehende Punktestände bleiben erhalten. Nach dem Start eines Boards ist kein Neubeitritt möglich.

Die Online-Version hat bewusst keine manuelle Punktevergabe, keine manuelle Bewertung und kein Rückgängigmachen einer Antwort. Diese Funktionen bleiben in der Offline-Version. So entscheidet im Online-Spiel für alle dieselbe automatische Prüfung. Gemeinsam nutzbare Aktionen wie Board überspringen (Test) oder Spiel abbrechen setzen vertrauensvolle Mitspieler voraus; es gibt keine Moderationsrolle. Kein Antworttimer: Bei Verbindungsabbruch kann das aktive Team nach dem Wiederverbinden fortsetzen oder passen. Andere Teams können das ganze Spiel bei Bedarf abbrechen.

Das Team, das Fragen importiert, kennt zwangsläufig deren Lösungen. Für gleichberechtigtes Spielen ein vorab erstelltes Fragenpaket verwenden, ohne dessen Lösungen anzusehen. Die Software kann bereits bekanntes Wissen nicht verhindern.

## Über das Internet bereitstellen

GitHub enthält den Code; GitHub Pages kann diesen Node-Server nicht ausführen. Auf einem Node-fähigen Hostingdienst `multiplayer` als Projektverzeichnis und `npm start` als Startbefehl verwenden. Eine öffentliche HTTPS-Adresse benötigt einen dauerhaft laufenden Server. Alternativ Docker:

```sh
docker build -t quizabend-online ./multiplayer
docker run --init -p 3000:3000 -v quizabend-data:/app/data quizabend-online
```

Öffentliche HTTPS-Domain über den Hostingdienst bzw. Reverse Proxy verbinden. Server-Sent Events müssen ohne Pufferung und mit längeren Verbindungen zugelassen sein. Healthcheck: `/healthz`. Nur eine Serverinstanz betreiben, mit beschreibbarem dauerhaftem Datenträger unter `/app/data`. Ein Hostingkonto, eine Domain oder eine öffentliche Bereitstellung wurden mit dem Repository allein noch nicht eingerichtet.

## Speicherung

Räume und private Zugangscookies werden serverseitig in `data/rooms.json` gespeichert. Dieses Verzeichnis ist von Git ausgeschlossen und nicht öffentlich erreichbar. Browser bekommen einen HttpOnly-Sitzungscookie. Mit demselben Browserprofil könnt ihr nach Neuladen und Serverneustart in denselben Raum zurückkehren. Auf einem anderen Gerät oder nach dem Löschen der Cookies ist nur ein Beitritt als neues Team möglich, sobald das Board abgeschlossen ist. Entfernte Teams verlieren ihren Zugang und ihre Punkte.

Räume ohne Aktivität werden nach 24 Stunden bei Serverstart bzw. Neuanlage bereinigt. Die Speicherung braucht einen dauerhaften Datenträger; mehrere Serverinstanzen und horizontale Skalierung werden nicht unterstützt.

## Tests

Im Verzeichnis `multiplayer` mit `npm test` prüfen. Integrationstests starten echte HTTP-Server und prüfen zehn Sitzungen, Rechte der aktiven Teams, private Lösungen, automatische Prüfung, Live-Ereignisse, doppelte Antworten, Punkte, Boardwechsel, Teamänderungen und Wiederherstellung nach Neustart.
