(function () {
  'use strict';

  const STORAGE_KEY = 'sprintwechsel.v1';
  const calc = window.SprintCalc;

  // ---------- Vorgehensweisen ----------
  // Jede Vorgehensweise rendert ihre eigene Ansicht. Neue Teams/Abläufe
  // werden hier ergänzt.
  const METHODS = {
    rest: {
      label: 'Restschätzung',
      hint: 'Offene Tickets behalten in Jira die alte Schätzung. Das Tool zieht die Differenz zur neuen Restschätzung von der Jira-Summe ab.',
      render: renderRestschaetzung
    },
    ueberschreiben: {
      label: 'Werte überschreiben (folgt)',
      hint: 'Das Team überschreibt die Story Points direkt im Ticket. Die Unterstützung dafür wird noch umgesetzt.',
      render: renderPlaceholder
    }
  };

  // ---------- Zustand ----------
  function newId() {
    return Math.random().toString(36).slice(2, 10);
  }

  function emptySession() {
    return { tickets: [{ old: '', new: '' }], jira: '' };
  }

  function defaultState() {
    const id = newId();
    return {
      currentId: id,
      teams: [{ id: id, name: 'Mein Team', method: 'rest', velocity: '', session: emptySession() }]
    };
  }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (s && Array.isArray(s.teams) && s.teams.length) return s;
    } catch (e) { /* kaputte Daten -> neu anfangen */ }
    return defaultState();
  }

  let state = load();

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* privater Modus */ }
  }

  function currentTeam() {
    return state.teams.find(function (t) { return t.id === state.currentId; }) || state.teams[0];
  }

  // ---------- Hilfen ----------
  const $ = function (sel) { return document.querySelector(sel); };

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] === null || attrs[k] === undefined) return;
      if (k === 'text') node.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function fmt(n) {
    return n.toLocaleString('de-AT', { maximumFractionDigits: 2 });
  }

  function fmtDelta(n) {
    if (n === 0) return '±0';
    return (n > 0 ? '+' : '−') + fmt(Math.abs(n));
  }

  function spInput(value, label, onInput) {
    return el('input', {
      type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '–',
      value: value, 'aria-label': label, class: 'sp-input', oninput: onInput
    });
  }

  // ---------- Ansicht: Restschätzung ----------
  function renderRestschaetzung(team, view) {
    const s = team.session;

    const ticketList = el('div', { class: 'tickets' });
    const totalDelta = el('span', { class: 'delta' });

    const resultBox = el('section', { class: 'card result', 'aria-live': 'polite' });

    function update() {
      const r = calc.calcRestschaetzung({ tickets: s.tickets, jira: s.jira, velocity: team.velocity });

      r.rows.forEach(function (row, i) {
        const d = ticketList.children[i] && ticketList.children[i].querySelector('.delta');
        if (!d) return;
        d.textContent = row.complete ? fmtDelta(row.delta) : '';
        d.className = 'delta ' + (row.complete ? (row.delta < 0 ? 'minus' : row.delta > 0 ? 'plus' : '') : '');
      });
      totalDelta.textContent = fmtDelta(r.delta) + ' SP';
      totalDelta.className = 'delta ' + (r.delta < 0 ? 'minus' : r.delta > 0 ? 'plus' : '');

      resultBox.replaceChildren();
      if (r.corrected === null) {
        resultBox.appendChild(el('p', { class: 'hint', text: 'Trag die Summe ein, die Jira für den neuen Sprint anzeigt.' }));
      } else {
        resultBox.appendChild(el('div', { class: 'big-label', text: 'Tatsächlich im Sprint' }));
        resultBox.appendChild(el('div', { class: 'big-number', text: fmt(r.corrected) + ' SP' }));
        resultBox.appendChild(el('div', { class: 'sub', text: 'Jira ' + fmt(r.jira) + ' SP, Korrektur ' + fmtDelta(r.delta) + ' SP' }));

        if (r.remaining !== null) {
          let cls = 'status ok', text = 'Genau auf Zielvelocity';
          if (r.remaining > 0) { cls = 'status free'; text = 'Noch ' + fmt(r.remaining) + ' SP frei'; }
          if (r.remaining < 0) { cls = 'status over'; text = fmt(-r.remaining) + ' SP zu viel'; }
          resultBox.appendChild(el('div', { class: cls, text: text }));
        }
      }
      if (r.jiraTarget !== null) {
        resultBox.appendChild(el('div', { class: 'target' }, [
          el('span', { text: 'Ziel in Jira: ' }),
          el('strong', { text: fmt(r.jiraTarget) + ' SP' })
        ]));
        resultBox.appendChild(el('p', { class: 'hint', text: 'So viel darf Jira anzeigen, damit ihr bei ' + fmt(r.velocity) + ' SP landet.' }));
      }
    }

    function persistAndUpdate() { save(); update(); }

    function addRow(t, i) {
      const row = el('div', { class: 'ticket-row' }, [
        el('span', { class: 'ticket-no', text: String(i + 1) }),
        spInput(t.old, 'Ticket ' + (i + 1) + ' alte Schätzung', function (e) { t.old = e.target.value; persistAndUpdate(); }),
        el('span', { class: 'arrow', text: '→' }),
        spInput(t.new, 'Ticket ' + (i + 1) + ' neue Schätzung', function (e) { t.new = e.target.value; persistAndUpdate(); }),
        el('span', { class: 'delta' }),
        el('button', {
          type: 'button', class: 'icon-btn remove', 'aria-label': 'Ticket ' + (i + 1) + ' entfernen', text: '×',
          onclick: function () {
            s.tickets.splice(s.tickets.indexOf(t), 1);
            if (!s.tickets.length) s.tickets.push({ old: '', new: '' });
            save(); renderView();
          }
        })
      ]);
      ticketList.appendChild(row);
    }

    s.tickets.forEach(addRow);

    view.appendChild(el('section', { class: 'card' }, [
      el('h2', { text: 'Neu geschätzte Tickets' }),
      el('div', { class: 'ticket-head' }, [
        el('span'), el('span', { text: 'alt' }), el('span'), el('span', { text: 'neu' }), el('span', { text: 'Δ' }), el('span')
      ]),
      ticketList,
      el('button', {
        type: 'button', class: 'btn add', text: '+ Ticket',
        onclick: function () {
          s.tickets.push({ old: '', new: '' });
          save(); renderView();
          const inputs = document.querySelectorAll('.ticket-row:last-child .sp-input');
          if (inputs[0]) inputs[0].focus();
        }
      }),
      el('div', { class: 'sum-row' }, [el('span', { text: 'Korrektur gesamt' }), totalDelta])
    ]));

    view.appendChild(el('section', { class: 'card' }, [
      el('label', { class: 'field' }, [
        el('span', { text: 'Jira zeigt für den neuen Sprint' }),
        el('span', { class: 'with-unit' }, [
          spInput(s.jira, 'Summe laut Jira', function (e) { s.jira = e.target.value; persistAndUpdate(); }),
          el('span', { class: 'unit', text: 'SP' })
        ])
      ]),
      el('label', { class: 'field' }, [
        el('span', { text: 'Zielvelocity' }),
        el('span', { class: 'with-unit' }, [
          spInput(team.velocity, 'Zielvelocity', function (e) { team.velocity = e.target.value; persistAndUpdate(); }),
          el('span', { class: 'unit', text: 'SP' })
        ])
      ])
    ]));

    view.appendChild(resultBox);

    view.appendChild(el('button', {
      type: 'button', class: 'btn danger', text: 'Neuer Sprintwechsel (Eingaben leeren)',
      onclick: function () {
        if (!confirm('Alle Tickets und die Jira-Summe für „' + team.name + '“ leeren? Die Zielvelocity bleibt.')) return;
        team.session = emptySession();
        save(); renderView();
      }
    }));

    update();
  }

  // ---------- Ansicht: noch nicht umgesetzt ----------
  function renderPlaceholder(team, view) {
    view.appendChild(el('section', { class: 'card' }, [
      el('h2', { text: METHODS[team.method].label }),
      el('p', { text: METHODS[team.method].hint }),
      el('p', { class: 'hint', text: 'Über das Einstellungs-Symbol oben rechts kannst du dem Team vorübergehend eine andere Vorgehensweise geben.' })
    ]));
  }

  // ---------- Rendering ----------
  function renderTeamSelect() {
    const sel = $('#team-select');
    sel.replaceChildren();
    state.teams.forEach(function (t) {
      const opt = el('option', { value: t.id, text: t.name });
      if (t.id === currentTeam().id) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function renderView() {
    const team = currentTeam();
    if (!team.session) team.session = emptySession();
    const view = $('#method-view');
    view.replaceChildren();
    (METHODS[team.method] || METHODS.rest).render(team, view);
  }

  function renderAll() {
    renderTeamSelect();
    renderView();
  }

  // ---------- Teamverwaltung ----------
  let editingId = null;

  function renderTeamDialog() {
    const list = $('#team-list');
    list.replaceChildren();
    state.teams.forEach(function (t) {
      list.appendChild(el('li', {}, [
        el('span', { class: 'team-info' }, [
          el('strong', { text: t.name }),
          el('small', { text: (METHODS[t.method] || METHODS.rest).label })
        ]),
        el('button', { type: 'button', class: 'btn small', text: 'Bearbeiten', onclick: function () { startEdit(t); } }),
        el('button', {
          type: 'button', class: 'btn small danger', text: 'Löschen',
          disabled: state.teams.length === 1 ? 'disabled' : null,
          onclick: function () {
            if (!confirm('Team „' + t.name + '“ löschen?')) return;
            state.teams = state.teams.filter(function (x) { return x.id !== t.id; });
            if (state.currentId === t.id) state.currentId = state.teams[0].id;
            if (editingId === t.id) resetForm();
            save(); renderTeamDialog(); renderAll();
          }
        })
      ]));
    });
  }

  function updateMethodHint() {
    $('#team-method-hint').textContent = METHODS[$('#team-method').value].hint;
  }

  function resetForm() {
    editingId = null;
    $('#team-form-title').textContent = 'Neues Team';
    $('#team-name').value = '';
    $('#team-method').value = 'rest';
    $('#team-save').textContent = 'Team hinzufügen';
    $('#team-cancel-edit').hidden = true;
    updateMethodHint();
  }

  function startEdit(t) {
    editingId = t.id;
    $('#team-form-title').textContent = 'Team bearbeiten';
    $('#team-name').value = t.name;
    $('#team-method').value = t.method;
    $('#team-save').textContent = 'Speichern';
    $('#team-cancel-edit').hidden = false;
    updateMethodHint();
    $('#team-name').focus();
  }

  function saveTeam() {
    const name = $('#team-name').value.trim();
    if (!name) { $('#team-name').focus(); return; }
    const method = $('#team-method').value;
    if (editingId) {
      const t = state.teams.find(function (x) { return x.id === editingId; });
      t.name = name; t.method = method;
    } else {
      const t = { id: newId(), name: name, method: method, velocity: '', session: emptySession() };
      state.teams.push(t);
      state.currentId = t.id;
    }
    save(); resetForm(); renderTeamDialog(); renderAll();
  }

  // ---------- Start ----------
  Object.keys(METHODS).forEach(function (key) {
    $('#team-method').appendChild(el('option', { value: key, text: METHODS[key].label }));
  });

  $('#team-select').addEventListener('change', function (e) {
    state.currentId = e.target.value; save(); renderView();
  });
  $('#team-edit').addEventListener('click', function () {
    resetForm(); renderTeamDialog(); $('#team-dialog').showModal();
  });
  $('#team-method').addEventListener('change', updateMethodHint);
  $('#team-save').addEventListener('click', saveTeam);
  $('#team-cancel-edit').addEventListener('click', resetForm);
  $('#team-name').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); saveTeam(); }
  });

  renderAll();
})();
