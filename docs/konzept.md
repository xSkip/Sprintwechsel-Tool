# Konzept

## Problem

Beim Sprintwechsel landen unfertige Tickets im vorausgeplanten neuen Sprint. Sie behalten in Jira die alte Schätzung
(z. B. 13 SP), obwohl das Team den Rest neu geschätzt hat (z. B. 3 SP). Die Jira-Summe des neuen Sprints ist dadurch
zu hoch oder zu niedrig. Bisher wurde die Differenz im Kopf abgezogen, um mit der Zielvelocity zu vergleichen.

## Teams und Vorgehensweisen

Teams gehen beim Planning unterschiedlich vor. Jedes Team hat deshalb eine **Vorgehensweise**, die bestimmt, was das
Tool anzeigt. Die Vorgehensweisen sind in `app.js` im Objekt `METHODS` hinterlegt.

| Vorgehensweise | Status | Beschreibung |
|---|---|---|
| Restschätzung | umgesetzt | Alte Werte bleiben in Jira; das Tool rechnet die Korrektur |
| Werte überschreiben | folgt | Das Team überschreibt die Story Points direkt im Ticket |

## Rechnung (Restschätzung)

- Korrektur pro Ticket: `neu − alt` (negativ = weniger als in Jira)
- Korrektur gesamt: Summe aller vollständig ausgefüllten Zeilen
- **Tatsächlich im Sprint** = Jira-Summe + Korrektur gesamt
- **Abstand zur Zielvelocity** = Zielvelocity − tatsächlich im Sprint („noch X frei“ / „X zu viel“)
- **Ziel in Jira** = Zielvelocity − Korrektur gesamt. So viel darf Jira anzeigen, damit die Zielvelocity genau
  erreicht ist. Das hilft, wenn während des Plannings Tickets dazukommen.

Beispiel: 13→3 und 5→8 ergibt −7. Jira zeigt 52, also 45 tatsächlich. Bei einer Velocity von 40 sind das 5 zu viel,
und das Ziel in Jira ist 47.

Dezimalwerte (auch mit Komma) sind erlaubt; Zeilen mit nur einem Wert zählen nicht.

## Speicherung

Alles liegt im `localStorage` des Browsers (Schlüssel `sprintwechsel.v1`), pro Team: Name, Vorgehensweise,
Zielvelocity und die aktuellen Eingaben. „Neuer Sprintwechsel“ leert die Eingaben, die Zielvelocity bleibt.
Kein Backend, keine Jira-Anbindung.
