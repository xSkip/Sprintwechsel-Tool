// Reine Rechenlogik, ohne DOM – im Browser und in Node-Tests nutzbar.
(function (root) {
  'use strict';

  // "3", "3,5", " 2.5 " -> Zahl; leer/ungültig -> null
  function parseSP(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim().replace(',', '.');
    if (text === '') return null;
    const n = Number(text);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  // Rundung gegen Gleitkomma-Artefakte (0.1 + 0.2)
  function round(n) {
    return Math.round(n * 100) / 100;
  }

  // Vorgehensweise "Restschätzung": Jira zeigt noch die alten Schätzungen.
  // tickets: [{ old, new }] als Text oder Zahl; jira, velocity: Text oder Zahl
  function calcRestschaetzung(input) {
    const rows = (input.tickets || []).map(function (t) {
      const oldSP = parseSP(t.old);
      const newSP = parseSP(t.new);
      const complete = oldSP !== null && newSP !== null;
      return { old: oldSP, new: newSP, complete: complete, delta: complete ? round(newSP - oldSP) : null };
    });

    // Summe der Änderungen (negativ = weniger als in Jira)
    const delta = round(rows.reduce(function (sum, r) { return r.complete ? sum + r.delta : sum; }, 0));
    const jira = parseSP(input.jira);
    const velocity = parseSP(input.velocity);

    const corrected = jira === null ? null : round(jira + delta);
    // Abstand zur Zielvelocity: positiv = noch Platz, negativ = zu viel geplant
    const remaining = corrected === null || velocity === null ? null : round(velocity - corrected);
    // So viel darf Jira insgesamt anzeigen, damit die Zielvelocity genau erreicht ist
    const jiraTarget = velocity === null ? null : round(velocity - delta);

    return {
      rows: rows,
      delta: delta,
      jira: jira,
      velocity: velocity,
      corrected: corrected,
      remaining: remaining,
      jiraTarget: jiraTarget
    };
  }

  const api = { parseSP: parseSP, calcRestschaetzung: calcRestschaetzung };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SprintCalc = api;
})(this);
