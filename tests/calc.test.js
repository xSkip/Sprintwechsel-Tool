const test = require('node:test');
const assert = require('node:assert');
const { parseSP, calcRestschaetzung } = require('../calc.js');

test('parseSP akzeptiert Komma, Punkt und leere Eingaben', () => {
  assert.strictEqual(parseSP('3'), 3);
  assert.strictEqual(parseSP('2,5'), 2.5);
  assert.strictEqual(parseSP(' 0.5 '), 0.5);
  assert.strictEqual(parseSP(''), null);
  assert.strictEqual(parseSP('abc'), null);
  assert.strictEqual(parseSP('-3'), null);
});

test('Beispiel aus der Anforderung: 13 -> 3 und 5 -> 8', () => {
  const r = calcRestschaetzung({
    tickets: [{ old: '13', new: '3' }, { old: '5', new: '8' }],
    jira: '52',
    velocity: '40'
  });
  assert.strictEqual(r.delta, -7);
  assert.strictEqual(r.corrected, 45);
  assert.strictEqual(r.remaining, -5); // 5 SP zu viel
  assert.strictEqual(r.jiraTarget, 47); // Jira darf bis 47 anzeigen
});

test('unvollständige Zeilen zählen nicht', () => {
  const r = calcRestschaetzung({
    tickets: [{ old: '13', new: '' }, { old: '8', new: '2' }],
    jira: '30',
    velocity: ''
  });
  assert.strictEqual(r.delta, -6);
  assert.strictEqual(r.corrected, 24);
  assert.strictEqual(r.remaining, null);
  assert.strictEqual(r.jiraTarget, null);
  assert.strictEqual(r.rows[0].complete, false);
});

test('ohne Jira-Summe kein Ergebnis, aber Zielwert für Jira', () => {
  const r = calcRestschaetzung({ tickets: [{ old: '13', new: '3' }], jira: '', velocity: '40' });
  assert.strictEqual(r.corrected, null);
  assert.strictEqual(r.jiraTarget, 50);
});

test('Dezimalwerte ohne Rundungsfehler', () => {
  const r = calcRestschaetzung({ tickets: [{ old: '0,3', new: '0,1' }], jira: '0.3', velocity: '1' });
  assert.strictEqual(r.delta, -0.2);
  assert.strictEqual(r.corrected, 0.1);
});
