# Sprintwechsel-Tool

Kleine Web-App fürs Handy, die beim Sprintwechsel die Story-Point-Summe aus Jira um neu geschätzte Tickets korrigiert.

**Live:** https://xskip.github.io/Sprintwechsel-Tool/

## So geht's

1. Oben das Team wählen (Teams verwalten über das Symbol rechts daneben).
2. Pro neu geschätztem Ticket die alte und die neue Schätzung eintragen.
3. Die Summe, die Jira für den neuen Sprint anzeigt, und die Zielvelocity eintragen.
4. Das Tool zeigt die tatsächliche Summe, ob ihr drüber oder drunter liegt und bis zu welcher Summe ihr in Jira planen dürft.

Die Daten bleiben nur im Browser (localStorage). Mehr dazu in [docs/konzept.md](docs/konzept.md).

## Tests

```
node --test tests/calc.test.js
```
