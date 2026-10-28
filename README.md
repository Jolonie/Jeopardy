# Quizabend

## Online-Multiplayer-Kopie

Die separate [Multiplayer-Version ohne Spielleitung](multiplayer/README.md) liegt unter `multiplayer/`. Alle spielen mit: Spielräume mit Raumcode, Live-Anzeige, reihum Fragen wählen und automatisch geprüfte Antworten ohne Beachtung der Groß-/Kleinschreibung. Start mit `cd multiplayer` und `npm start` (Node.js ab Version 20). Für Internetzugriff muss der Server auf einem öffentlich erreichbaren Hostingdienst laufen; GitHub Pages allein genügt nicht. Die bisherigen Offline-Dateien bleiben erhalten.

## Direkt herunterladen

- [Aktuelles Spiel als einzelne HTML-Datei](download/Quizabend-v1.11.html)
- [TXT-Testdatei mit 25 fertigen Fragen](download/Quizabend-Test.txt)
- [TXT-Vorlage für eigene Fragen](download/Quizabend-Vorlage.txt)

Die gewünschte Datei auf GitHub öffnen und über „Download raw file“ herunterladen. Die HTML-Datei anschließend im Browser öffnen; keine Installation erforderlich.

Deutschsprachiges Jeopardy-Spiel für eine Spielleitung und beliebig viele Teams (zehn sind voreingestellt). Benötigt Python 3 zum lokalen Bereitstellen; Node.js ab Version 18 für Tests. Keine Paketinstallation nötig.

## Start

Im Repository `npm start` ausführen. Der Webserver läuft auf Port 3000. Alternativ: `python3 -m http.server 3000 --bind 0.0.0.0`.

1. Fünf Kategorien und jeweils fünf Fragen mit Lösungen eingeben. Die Stufen bringen 100, 200, 300, 400 und 500 Punkte.
2. Teamnamen erfassen und das Spiel starten.
3. Frage wählen, antwortendes Team auswählen und richtig oder falsch bewerten. Richtige Antworten addieren Punkte, falsche ziehen die Hälfte des Fragewerts ab; die Frage wird geschlossen.
4. Punkte jederzeit mit einer positiven oder negativen ganzen Zahl korrigieren. Die letzte Punkteänderung lässt sich rückgängig machen; dabei wird eine bewertete Frage wieder freigegeben.

Die Spielleitung bedient einen Browser. Teams benötigen weder Account noch eigenes Gerät. Dies ist keine Mehrbenutzer-Anwendung mit Anmeldung oder Zugriffskontrolle. Lösungen erst auf dem Leitungsbildschirm aufdecken. Nicht parallel in mehreren Tabs spielen.

Fragen, Teams und Spielstand werden automatisch im lokalen Browser-Speicher gespeichert und beim erneuten Öffnen wiederhergestellt. Es gibt keine serverseitige Speicherung oder Synchronisierung. „Neu beginnen“ löscht den lokalen Spielstand nach Bestätigung.

## Prüfung

`npm test` prüft Punkteberechnung und Startvalidierung.

## TXT-Import und Download-Version

In der Fragenvorbereitung „TXT-Vorlage herunterladen“ wählen. Alternativ liegt die Vorlage in `download/Quizabend-Vorlage.txt`. Platzhalter durch eigene Inhalte ersetzen und als UTF-8-TXT speichern. Anschließend die Datei auswählen oder ihren gesamten Text in das Importfeld einfügen. Vorhandene Fragen werden nur nach Bestätigung ersetzt; ungültige Importe verändern sie nicht.

Format (für alle fünf Kategorien mit jeweils 100, 200, 300, 400 und 500 Punkten wiederholen):

```text
Kategorie: Allgemeinwissen

Punkte: 100
Frage: Wie heißt die Hauptstadt von Frankreich?
Antwort: Paris
```

Jede Angabe steht in einer eigenen Zeile. Alle 25 Fragen und Antworten sind erforderlich. Bei Fehlern zeigt die Oberfläche einen Hinweis an.

`npm run build` erzeugt die eigenständige `download/Quizabend.html` und die vollständige TXT-Vorlage neu. Die HTML-Datei kann ohne Webserver direkt im Browser geöffnet werden. Falsche Antworten kosten 50, 100, 150, 200 oder 250 Punkte; richtige bringen den vollen Fragewert. Bereits gespeicherte Punktestände werden nicht rückwirkend verändert.

## Punktekorrektur, weitere Boards und Spielende

Die Punktekorrektur hat drei Optionen: „Punkte hinzufügen (+/−)“, „Punkte abziehen“ und „Punktestand setzen“. Zahl eingeben und „Übernehmen“ klicken. Negative Werte inklusive des Minuszeichens „−“ werden unterstützt. Fehler werden direkt im Formular angezeigt.

Nach der Bewertung aller 25 Fragen erscheint die Auswahl „Neues Board vorbereiten“ oder „Spiel beenden & Sieger anzeigen“. Ein neues Board öffnet wieder die leere Frageneingabe inklusive TXT-Upload. Teams und Gesamtpunkte bleiben erhalten. Board 1 zählt 100–500 Punkte, alle folgenden Boards zählen 200–1.000 Punkte. Im TXT-Format bleiben die Stufen immer 100–500; die Anwendung verdoppelt sie automatisch. Falsche Antworten kosten stets die Hälfte des angezeigten Fragewerts.

Mit dem neuen Board beginnt ein neuer Undo-Verlauf, damit alte Fragen nicht in das neue Board zurückgeschrieben werden. Auf dem Siegerbildschirm stehen alle Teams nach Punktestand sortiert, bei Gleichstand gibt es mehrere Sieger. Von dort ist die Rückkehr zum letzten Board für Korrekturen möglich; anschließend „Spiel beenden“ erneut wählen. Der neue Stand wird dann für die Siegeranzeige verwendet. Weitere Boards lassen sich ebenfalls starten.

## Version 1.4: Teamrotation und direkte Punktekorrektur

Auf dem Board wird das aktive Team angezeigt. Jede Frage wählt dieses Team automatisch vor, die Auswahlliste bleibt änderbar. Erst die Bewertung schaltet die feste Reihenfolge um einen Platz weiter; eine abweichende Teamauswahl gilt nur für diese Frage. Schließen ohne Bewertung schaltet nicht weiter. Undo einer Bewertung stellt den vorherigen Zug wieder her. Die Reihenfolge läuft über Boardgrenzen hinweg weiter und bleibt beim Neuladen erhalten. Manuelle Punktekorrekturen ändern die Teamreihenfolge nicht.

Punktekorrekturen werden direkt über „Übernehmen“ oder Enter verarbeitet. Eine Bestätigung an der Teamkarte zeigt den vorherigen und neuen Wert, ohne die Seite neu aufzubauen. Ungültige oder leere Eingaben zeigen einen Fehler direkt an der Karte. Die eigenständige Version liegt zusätzlich unter `download/Quizabend-v1.4.html`, um sie eindeutig von älteren Downloads unterscheiden zu können.

## Version 1.5: Spiel abbrechen

„Spiel abbrechen“ öffnet einen Bestätigungsdialog innerhalb der Anwendung, auch bei geöffneter Frage. „Weiterspielen“ oder Escape erhält das Spiel unverändert. Erst „Ja, Spiel abbrechen“ löscht das komplette Spiel, schließt offene Fragen und kehrt zur leeren Fragenvorbereitung mit zehn Standardteams zurück. Der zurückgesetzte Zustand wird gespeichert. Aktueller Download: `download/Quizabend-v1.5.html`.

## Version 1.6: Board für Tests überspringen

Unter einem laufenden Board schließt „Board überspringen (Test)“ alle offenen Fragen ohne Punktevergabe. Übersprungene Felder sind mit einem Strich markiert. Teamstände und Teamrotation bleiben unverändert. Danach stehen wie bei einem regulär abgeschlossenen Board „Neues Board vorbereiten“ und „Spiel beenden & Sieger anzeigen“ bereit. Der Abschluss wird gespeichert und übersteht das Neuladen. Aktueller Download: `download/Quizabend-v1.6.html`.


## Version 1.7: Teams nach einem Board ändern

Nach einem gespielten oder übersprungenen Board steht „Teams verwalten“ zur Verfügung. Im Dialog lassen sich Teams hinzufügen, entfernen und umbenennen. „Änderungen speichern“ übernimmt die neue Besetzung; „Abbrechen“ oder Escape verwirft den Entwurf. Mindestens zwei Teams mit eindeutigen, nicht leeren Namen sind erforderlich.

Bestehende Teams behalten ihre Punkte, neue Teams starten mit 0 Punkten am Ende der Reihenfolge. Wird das nächste aktive Team entfernt, übernimmt das nächste verbleibende Team seinen Zug. Entfernte Teams werden aus der Siegerwertung genommen. Bei Änderungen wird der bisherige Undo-Verlauf abgeschlossen, damit frühere Bewertungen nicht auf andere Teams angewendet werden. Die Besetzung wird lokal gespeichert und beim nächsten Board sowie im Siegerbildschirm verwendet. Aktueller Download: `download/Quizabend-v1.7.html`.


## Version 1.8: Original-Logo offline einbetten

Unter „Café-Canapé-Logo einrichten“ das Original als JPG, PNG oder WebP (bis 5 MB) auswählen. Das Bild erscheint unverzerrt im Kopfbereich und wird separat vom Spielstand im Browser gespeichert. Spielabbruch entfernt das Logo nicht. „HTML mit Logo speichern“ erzeugt `Quizabend-Cafe-Canape.html` mit eingebetteten Bilddaten, ohne den aktuellen Spielstand zu exportieren. Diese Datei benötigt keinen Server und keine externe Bildquelle. Das Originalbild ist nicht Teil des Repositorys; es muss einmal lokal ausgewählt werden.


## Version 1.9: Café-Canapé-Logo fest eingebunden

Das für die dunkle Oberfläche freigestellte Logo liegt in `assets/cafe-canape-logo.png` und wird im Kopfbereich vollständig und proportional angezeigt. Die Downloadversion bettet die PNG-Daten direkt ein und funktioniert ohne externe Bildquelle oder manuellen Upload. Das Logo basiert auf der bereitgestellten Vorlage und wurde für einen transparenten Hintergrund aufbereitet. Ein eigenes Ersatzlogo kann weiterhin lokal ausgewählt werden.


## Version 1.10

Die eigene Logo-Auswahl samt Exportoberfläche wurde entfernt. Alte lokal gespeicherte Logos werden nicht mehr geladen; das fest eingebundene Logo wird immer angezeigt. Die Download-Datei enthält das Logo weiterhin offline.


## Version 1.11: Punktefaktor

In der Fragenvorbereitung für jedes Board 0,5×, 1×, 2× oder 3× wählen. Die Stufen ergeben 50–250, 100–500, 200–1.000 oder 300–1.500 Punkte. Falsche Antworten kosten weiterhin die Hälfte. TXT-Dateien behalten immer die Basiswerte 100–500. Bei neuen Boards bleibt der zuletzt gewählte Faktor voreingestellt; alte Spielstände behalten ihren bisherigen Faktor.
