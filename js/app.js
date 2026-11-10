/* S.C.T. TrainingLab — interfaccia */
(function () {
  'use strict';
  const { ymd, pad } = window.DB_UTIL;
  const $ = s => document.querySelector(s);
  const app = $('#app');
  const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const GG = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];
  const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  const S = {
    sess: null, d: null, view: null,
    month: firstOfMonth(new Date()), day: ymd(new Date()),
    q: '', filtro: 'tutti', scheda: null
  };

  /* ---------------------------------------------------------------- utilità */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function firstOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function today() { return ymd(new Date()); }
  function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function fmt(s) { if (!s) return '—'; const d = parse(s); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function fmtLong(s) { const d = parse(s); return GIORNI[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()].toLowerCase(); }
  function nomeCompleto(i) { return (i.nome + ' ' + (i.cognome || '')).trim(); }
  function nomePuntato(i) { const c = (i.cognome || '').trim(); return i.nome + (c ? ' ' + c[0].toUpperCase() + '.' : ''); }
  function iniziali(i) { return ((i.nome || '?')[0] + ((i.cognome || '')[0] || '')).toUpperCase(); }
  function eta(dn) { if (!dn) return null; const t = parse(today()), n = parse(dn); let a = t.getFullYear() - n.getFullYear(); if (t.getMonth() < n.getMonth() || (t.getMonth() === n.getMonth() && t.getDate() < n.getDate())) a--; return a; }
  function consensoDi(email) { if (!email) return null; const e = email.toLowerCase(); return (S.d.consensi || []).filter(c => (c.email || '').toLowerCase() === e).sort((a, b) => b.accettato_il.localeCompare(a.accettato_il))[0] || null; }
  function meseCorrente() { return today().slice(0, 7); }
  function nomeMese(m) { const [y, mm] = m.split('-').map(Number); return MESI[mm - 1] + ' ' + y; }

  const EYE_ON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6A17.3 17.3 0 0 0 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  function pwField(attrs) {
    return '<span class="pw-wrap"><input class="inp" type="password" autocapitalize="off" autocorrect="off" spellcheck="false" ' + attrs + '><button type="button" class="pw-eye" aria-label="Mostra password" data-pweye>' + EYE_ON + '</button></span>';
  }
  function bindPw(root) {
    (root || document).querySelectorAll('[data-pweye]').forEach(b => b.onclick = () => {
      const i = b.previousElementSibling, show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      b.innerHTML = show ? EYE_OFF : EYE_ON;
      b.setAttribute('aria-label', show ? 'Nascondi password' : 'Mostra password');
      i.focus();
    });
  }
  function toast(msg, tipo) {
    const t = document.createElement('div');
    t.className = 'toast' + (tipo ? ' ' + tipo : ''); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3000);
  }
  async function run(fn, okMsg) {
    try { const r = await fn(); if (okMsg) toast(okMsg); return r; }
    catch (e) { toast(e.message || 'Errore', 'err'); throw e; }
  }

  function modal(html, onMount) {
    return new Promise(resolve => {
      const w = document.createElement('div');
      w.className = 'modal-bg';
      w.innerHTML = '<div class="modal" role="dialog">' + html + '</div>';
      document.body.appendChild(w);
      const close = v => { w.remove(); resolve(v); };
      w.addEventListener('click', e => { if (e.target === w) close(null); });
      w.querySelectorAll('[data-close]').forEach(b => b.onclick = () => close(null));
      onMount && onMount(w, close);
    });
  }
  function confirmBox(titolo, testo, si) {
    return modal('<h3>' + esc(titolo) + '</h3><p>' + esc(testo) + '</p><div class="m-row"><button class="btn ghost" data-close>Annulla</button><button class="btn danger" data-ok>' + esc(si || 'Conferma') + '</button></div>',
      (w, close) => { w.querySelector('[data-ok]').onclick = () => close(true); });
  }
  function askText(titolo, testo, placeholder, si, tipo) {
    return modal('<h3>' + esc(titolo) + '</h3>' + (testo ? '<p>' + esc(testo) + '</p>' : '') +
      (tipo === 'password' ? pwField('maxlength="72" placeholder="' + esc(placeholder || '') + '" autocomplete="new-password"') : '<input class="inp" maxlength="200" placeholder="' + esc(placeholder || '') + '">') + '<div class="m-row"><button class="btn ghost" data-close>Annulla</button><button class="btn primary" data-ok>' + esc(si || 'Conferma') + '</button></div>',
      (w, close) => {
        const i = w.querySelector('input'); bindPw(w); setTimeout(() => i.focus(), 50);
        w.querySelector('[data-ok]').onclick = () => close(i.value.trim());
        i.onkeydown = e => { if (e.key === 'Enter') close(i.value.trim()); };
      });
  }

  /* --------------------------------------------------------- stati semafori */
  function statoData(scad) {
    const pre = Number(S.d.settings.preavviso_giorni) || 30;
    if (!scad) return { c: 'red', t: 'Mancante' };
    const t = today();
    if (scad < t) return { c: 'red', t: 'Scaduto il ' + fmt(scad) };
    if (scad <= addDays(t, pre)) {
      const gg = Math.round((parse(scad) - parse(t)) / 86400000);
      return { c: 'yellow', t: (gg === 0 ? 'Scade oggi' : 'Scade tra ' + gg + ' gg') + ' (' + fmt(scad) + ')' };
    }
    return { c: 'green', t: 'Valido fino al ' + fmt(scad) };
  }
  function statoCert(i) { return statoData(i.certificato_scadenza); }
  function statoIscr(i) {
    const s = statoData(i.scadenza_iscrizione);
    if (s.c === 'red' && !i.scadenza_iscrizione) s.t = 'Non iscritto';
    if (s.c === 'green') s.t = 'Attiva fino al ' + fmt(i.scadenza_iscrizione);
    return s;
  }
  function pagato(id, mese) { return S.d.pagamenti.some(p => p.iscritto_id === id && p.mese === mese); }
  function statoQuota(i) {
    const m = meseCorrente();
    return pagato(i.id, m) ? { c: 'green', t: nomeMese(m) + ' pagata' } : { c: 'red', t: nomeMese(m) + ' da pagare' };
  }

  /* --------------------------------------------------------------- lezioni */
  function inStagione(ds) {
    const s = S.d.settings;
    return (!s.stagione_inizio || ds >= s.stagione_inizio) && (!s.stagione_fine || ds <= s.stagione_fine);
  }
  function slotsDel(ds) {
    if (!inStagione(ds)) return [];
    const g = parse(ds).getDay();
    return S.d.settings.slots.filter(s => Number(s.giorno) === g).sort((a, b) => a.inizio.localeCompare(b.inizio));
  }
  function annullata(ds, slot) { return S.d.annullamenti.find(a => a.data === ds && a.slot === slot); }
  function assenza(iid, ds, slot) { return S.d.assenze.find(a => a.iscritto_id === iid && a.data === ds && a.slot === slot); }
  function partecipanti(ds, slot) {
    return S.d.iscritti.filter(i => i.attivo !== false && (i.lezioni || []).includes(slot) &&
      (!i.data_iscrizione || i.data_iscrizione <= ds))
      .sort((a, b) => (a.nome + a.cognome).localeCompare(b.nome + b.cognome));
  }
  function slotLabel(s) { return s.nome + ' ' + s.inizio + '–' + s.fine; }
  function lezioniTesto(i) {
    const sl = S.d.settings.slots, l = i.lezioni || [];
    if (!l.length) return 'Nessuna lezione';
    if (sl.length > 1 && sl.every(s => l.includes(s.id))) return 'Tutte le lezioni (' + sl.length + '/sett.)';
    return sl.filter(s => l.includes(s.id)).map(s => s.nome).join(' + ') || 'Nessuna lezione';
  }

  /* ------------------------------------------------------------------ avvio */
  async function boot() {
    try { await DB.init(); } catch (e) { app.innerHTML = '<div class="center-msg"><h2>Connessione non riuscita</h2><p>' + esc(e.message) + '</p><button class="btn primary" onclick="location.reload()">Riprova</button></div>'; return; }
    if (DB.onAuth) DB.onAuth(async (ev) => {
      if (ev === 'PASSWORD_RECOVERY') return nuovaPassword();
      if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') { if (!S._loading) await carica(); }
    });
    await carica();
  }
  async function carica() {
    S._loading = true;
    try {
      S.sess = await DB.session();
      if (S.sess.role === 'anon') return renderLogin();
      if (S.sess.role === 'privacy') return renderPrivacyGate();
      if (S.sess.role === 'non_abilitato') return renderNonAbilitato();
      S.d = await DB.loadAll();
      if (!S.view) S.view = S.sess.role === 'admin' ? 'cal' : 'lezioni';
      render();
    } catch (e) {
      app.innerHTML = '<div class="center-msg"><h2>Errore</h2><p>' + esc(e.message) + '</p><button class="btn primary" onclick="location.reload()">Riprova</button></div>';
    } finally { S._loading = false; }
  }
  async function ricarica() { S.d = await DB.loadAll(); if (S.sess.role === 'iscritto') S.sess = await DB.session(); render(); }

  /* ------------------------------------------------------------- accesso */
  function informativa() {
    const P = window.PRIVACY;
    return modal('<h3>Informativa privacy</h3><div class="privacy-txt">' + P.testo() + '</div><div class="m-row"><button class="btn primary" data-close>Ho capito</button></div>');
  }
  function renderLogin(reg) {
    const oggi = today();
    app.innerHTML = `
      <div class="login">
        <img src="icons/logo.png" alt="Sci Club Taino Training Lab" class="login-logo">
        <form id="f-login" class="card" novalidate>
          <h2>${reg ? 'Crea il tuo account' : 'Accedi'}</h2>
          ${reg ? `
          <div class="two"><label>Nome *<input class="inp" name="nome" autocomplete="given-name" maxlength="60" required></label>
          <label>Cognome *<input class="inp" name="cognome" autocomplete="family-name" maxlength="60" required></label></div>
          <label>Data di nascita *<input class="inp" type="date" name="nascita" max="${oggi}" min="1920-01-01" required></label>` : ''}
          <label>Email${reg ? ' *' : ''}<input class="inp" type="email" name="email" id="email" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" required></label>
          <label>Password${reg ? ' * <small class="muted">(almeno 6 caratteri)</small>' : ''}${pwField('name="pw" autocomplete="' + (reg ? 'new-password' : 'current-password') + '" minlength="6" required')}</label>
          ${DB.mode === 'online' ? `<label class="check"><input type="checkbox" name="ricorda"${DB.getRicorda() ? ' checked' : ''}> Resta collegato e memorizza la password</label>` : ''}
          ${reg ? `<label class="check priv"><input type="checkbox" name="privacy"> <span>Ho letto e accetto <button type="button" class="link inline" id="b-inf">l'informativa sulla privacy</button> e acconsento al trattamento dei miei dati per la gestione del Training Lab *</span></label>` : ''}
          <button class="btn primary big" type="submit">${reg ? 'Registrati' : 'Accedi'}</button>
          <button class="btn ghost" type="button" id="b-mode">${reg ? 'Ho già un account: accedi' : 'Prima volta? Crea l\'account'}</button>
          ${reg ? '' : '<button class="link" type="button" id="b-forgot">Password dimenticata</button>'}
          <p class="hint">Iscritti: usate la stessa email che avete comunicato al Training Lab.</p>
        </form>
      </div>`;
    const f = $('#f-login');
    bindPw(f);
    if (!reg && DB.mode === 'online') precompila(f);
    $('#b-mode').onclick = () => renderLogin(!reg);
    const inf = $('#b-inf'); if (inf) inf.onclick = e => { e.preventDefault(); informativa(); };
    f.onsubmit = async e => {
      e.preventDefault();
      const email = f.email.value.trim(), pw = f.pw.value;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Inserisci un\'email valida', 'err');
      if (pw.length < 6) return toast('La password deve avere almeno 6 caratteri', 'err');
      const ric = f.ricorda ? f.ricorda.checked : true;
      if (DB.setRicorda) DB.setRicorda(ric);
      if (!reg) return run(() => DB.signIn(email, pw)).then(async () => { if (ric) await memorizzaCredenziali(email, pw); await carica(); }).catch(() => {});
      const nome = f.nome.value.trim(), cognome = f.cognome.value.trim(), nascita = f.nascita.value;
      if (!nome || !cognome) return toast('Inserisci nome e cognome', 'err');
      if (!nascita || nascita > oggi || nascita < '1920-01-01') return toast('Inserisci una data di nascita valida', 'err');
      if (!f.privacy.checked) return toast('Per registrarti devi accettare l\'informativa privacy', 'err');
      try {
        const r = await DB.signUp(email, pw, { nome, cognome, data_nascita: nascita, privacy_versione: window.PRIVACY.VERSIONE });
        if (ric) await memorizzaCredenziali(email, pw);
        if (r.needsConfirm) { toast('Ti abbiamo inviato una mail: conferma l\'indirizzo e poi accedi'); renderLogin(false); }
        else await carica();
      } catch (er) { toast(/already registered/i.test(er.message) ? 'Questa email è già registrata: accedi' : er.message, 'err'); }
    };
    const fg = $('#b-forgot');
    if (fg) fg.onclick = async () => {
      if (!f.email.value) return toast('Scrivi prima la tua email', 'err');
      await run(() => DB.resetPassword(f.email.value), 'Mail per reimpostare la password inviata').catch(() => {});
    };
  }
  async function memorizzaCredenziali(email, pw) {
    try {
      if (window.PasswordCredential && navigator.credentials && navigator.credentials.store)
        await navigator.credentials.store(new window.PasswordCredential({ id: email, password: pw, name: email }));
    } catch (e) { /* il browser non lo supporta: ci pensa il suo gestore password */ }
  }
  async function precompila(f) {
    try {
      if (!window.PasswordCredential || !navigator.credentials || !DB.getRicorda()) return;
      const c = await navigator.credentials.get({ password: true, mediation: 'optional' });
      if (c && c.password && f.isConnected && !f.email.value) { f.email.value = c.id; f.pw.value = c.password; }
    } catch (e) { /* niente credenziali salvate */ }
  }
  function renderPrivacyGate() {
    const P = window.PRIVACY;
    app.innerHTML = `<div class="login"><img src="icons/logo.png" class="login-logo" alt="">
      <div class="card gate"><h2>Informativa privacy</h2>
        <p class="muted">Per usare l'app devi leggere e accettare l'informativa sul trattamento dei dati.</p>
        <div class="privacy-txt">${P.testo()}</div>
        <label class="check priv"><input type="checkbox" id="c-priv"> <span>Ho letto e accetto l'informativa e acconsento al trattamento dei miei dati per la gestione del Training Lab</span></label>
        <button class="btn primary big" id="b-acc">Accetta e continua</button>
        <button class="btn ghost" id="b-out">Esci</button></div></div>`;
    $('#b-acc').onclick = async () => {
      if (!$('#c-priv').checked) return toast('Spunta la casella per accettare', 'err');
      await run(() => DB.accettaPrivacy(S.sess.uid, S.sess.email)).then(carica).catch(() => {});
    };
    $('#b-out').onclick = async () => { await DB.signOut(); carica(); };
  }
  function nuovaPassword() {
    return modal(`<h3>Nuova password</h3><p>Scegli una nuova password (almeno 6 caratteri) e scrivila due volte.</p>
      <label>Nuova password${pwField('id="np1" autocomplete="new-password" maxlength="72"')}</label>
      <label>Ripeti la password${pwField('id="np2" autocomplete="new-password" maxlength="72"')}</label>
      <div class="m-row"><button class="btn ghost" data-close>Annulla</button><button class="btn primary" data-ok>Salva</button></div>`,
      (w, close) => {
        bindPw(w);
        setTimeout(() => w.querySelector('#np1').focus(), 50);
        w.querySelector('[data-ok]').onclick = async () => {
          const a = w.querySelector('#np1').value, b = w.querySelector('#np2').value;
          if (a.length < 6) return toast('La password deve avere almeno 6 caratteri', 'err');
          if (a !== b) return toast('Le due password non coincidono', 'err');
          try {
            await DB.updatePassword(a);
            if (DB.getRicorda && DB.getRicorda() && S.sess && S.sess.email) await memorizzaCredenziali(S.sess.email, a);
            toast('Password aggiornata'); close(true);
          } catch (e) { toast(e.message, 'err'); }
        };
      });
  }
  function renderNonAbilitato() {
    app.innerHTML = `<div class="center-msg">
      <img src="icons/logo.png" class="login-logo" alt="">
      <h2>Account non ancora abilitato</h2>
      <p>Registrazione ricevuta! L'email <b>${esc(S.sess.email)}</b> non è ancora collegata a una scheda del Training Lab.<br>L'amministratore vede la tua richiesta e ti abiliterà a breve: poi tocca "Riprova".</p>
      <div class="m-row"><button class="btn ghost" id="b-out">Esci</button><button class="btn primary" id="b-retry">Riprova</button></div></div>`;
    $('#b-out').onclick = async () => { await DB.signOut(); carica(); };
    $('#b-retry').onclick = carica;
  }

  /* ------------------------------------------------------------ struttura */
  const ICONS = {
    cal: '<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    isc: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3 3 0 0 1 0 6M18 14c2 .7 3 2.8 3 6"/>',
    imp: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    les: '<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    tel: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="m3 7 9 6 9-6"/>',
    back: '<path d="M15 18l-6-6 6-6"/>', plus: '<path d="M12 5v14M5 12h14"/>', out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>', l: '<path d="M15 18l-6-6 6-6"/>', r: '<path d="M9 18l6-6-6-6"/>'
  };
  const ic = (n, c) => '<svg class="ic ' + (c || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n] + '</svg>';
  const WA = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2-.2-.2-.5-.3z"/></svg>';

  function render() {
    const admin = S.sess.role === 'admin';
    const tabs = admin
      ? [['cal', 'Calendario', 'cal'], ['iscritti', 'Iscritti', 'isc'], ['imp', 'Impostazioni', 'imp']]
      : [['lezioni', 'Lezioni', 'les'], ['cal', 'Calendario', 'cal'], ['me', 'Profilo', 'me']];
    const demo = DB.mode === 'demo' ? demoBar() : '';
    let body = '';
    if (S.view === 'cal') body = viewCal();
    else if (S.view === 'iscritti') body = viewIscritti();
    else if (S.view === 'imp') body = viewImp();
    else if (S.view === 'lezioni') body = viewLezioni();
    else if (S.view === 'me') body = viewMe();
    app.innerHTML = demo + `
      <header class="top">
        <img src="icons/logo.png" alt="" class="top-logo">
        <div class="top-t"><b>Training Lab</b><small>${admin ? 'Amministratore' : esc(nomeCompleto(S.sess.iscritto || { nome: '' }))}</small></div>
        <span data-update-slot></span>
      </header>
      <main id="main">${body}</main>
      <nav class="tabs">${tabs.map(t => `<button class="tab${S.view === t[0] ? ' on' : ''}" data-tab="${t[0]}">${ic(t[2])}<span>${t[1]}</span></button>`).join('')}</nav>`;
    app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.view = b.dataset.tab; render(); window.scrollTo(0, 0); });
    if (DB.mode === 'demo') bindDemo();
    bind();
    // ricolloca il tasto Aggiorna se già comparso
    const ub = document.querySelector('.upd-btn'), slot = document.querySelector('[data-update-slot]');
    if (ub && slot && !slot.contains(ub)) { ub.classList.remove('upd-float'); slot.appendChild(ub); }
  }

  function demoBar() {
    const v = DB.getVista();
    return `<div class="demo">Modalità prova · dati solo su questo dispositivo
      <select id="demo-vista"><option value="admin"${v === 'admin' ? ' selected' : ''}>Vista amministratore</option>
      ${(DB._all || []).map(i => `<option value="${esc(i.id)}"${v === i.id ? ' selected' : ''}>Vista iscritto: ${esc(nomeCompleto(i))}</option>`).join('')}</select></div>`;
  }
  function bindDemo() {
    const s = $('#demo-vista');
    if (s) s.onchange = async () => { DB.setVista(s.value); S.view = null; await carica(); };
  }

  /* ------------------------------------------------------------ calendario */
  function viewCal() {
    const admin = S.sess.role === 'admin';
    const m = S.month, y = m.getFullYear(), mo = m.getMonth();
    const start = (new Date(y, mo, 1).getDay() + 6) % 7;
    const days = new Date(y, mo + 1, 0).getDate();
    const me = S.sess.iscritto;
    let cells = '';
    for (let k = 0; k < start; k++) cells += '<div class="d empty"></div>';
    for (let g = 1; g <= days; g++) {
      const ds = y + '-' + pad(mo + 1) + '-' + pad(g);
      let sl = slotsDel(ds);
      if (!admin && me) sl = sl.filter(s => (me.lezioni || []).includes(s.id));
      const cls = ['d'];
      let badge = '';
      if (sl.length) {
        const tutteAnn = sl.every(s => annullata(ds, s.id));
        cls.push(tutteAnn ? 'ann' : 'les');
        if (!tutteAnn) {
          const nAss = admin ? S.d.assenze.filter(a => a.data === ds && sl.some(s => s.id === a.slot) && !annullata(ds, a.slot)).length
            : sl.filter(s => assenza(me.id, ds, s.id)).length;
          if (nAss) badge = admin ? `<i class="badge">${nAss}</i>` : '<i class="badge">A</i>';
        }
      }
      if (ds === today()) cls.push('today');
      if (ds === S.day) cls.push('sel');
      cells += `<button class="${cls.join(' ')}" data-day="${ds}"><span>${g}</span>${badge}</button>`;
    }
    return `
      <section class="card cal">
        <div class="cal-h">
          <button class="icbtn" data-mon="-1" aria-label="Mese precedente">${ic('l')}</button>
          <h2>${MESI[mo]} ${y}</h2>
          <button class="icbtn" data-mon="1" aria-label="Mese successivo">${ic('r')}</button>
        </div>
        <div class="grid wd">${GG.map(x => '<div>' + x + '</div>').join('')}</div>
        <div class="grid">${cells}</div>
        <div class="legend"><span><i class="lg les"></i>Lezione</span><span><i class="lg ann"></i>Annullata</span><span><i class="badge s">${admin ? 'n' : 'A'}</i>${admin ? 'Assenti' : 'Tua assenza'}</span></div>
      </section>
      ${admin ? giornoAdmin(S.day) : giornoIscritto(S.day)}`;
  }

  function giornoAdmin(ds) {
    const sl = slotsDel(ds);
    let h = `<section class="day"><h2 class="day-t">${esc(fmtLong(ds))}</h2>`;
    if (!sl.length) return h + `<p class="muted card pad">${inStagione(ds) ? 'Nessuna lezione in questo giorno.' : 'Fuori dal periodo della stagione.'}</p></section>`;
    sl.forEach(s => {
      const ann = annullata(ds, s.id);
      const part = partecipanti(ds, s.id);
      const ass = part.filter(i => assenza(i.id, ds, s.id));
      h += `<div class="card slot">
        <div class="slot-h"><div><b>${esc(s.nome)}</b> · ${esc(s.inizio)}–${esc(s.fine)}${S.d.settings.luogo ? '<br><small class="muted">' + esc(S.d.settings.luogo) + '</small>' : ''}</div>
          <span class="slot-act">${ann ? '' : `<button class="btn sm ghost" data-pres="${ds}|${s.id}">Presenze</button>`}${ann ? `<button class="btn sm ghost" data-ripr="${s.id}">Ripristina</button>` : `<button class="btn sm ghost" data-annulla="${s.id}">Annulla</button>`}</span></div>`;
      if (ann) { h += `<p class="ann-msg">Lezione annullata${ann.motivo ? ': ' + esc(ann.motivo) : ''}</p></div>`; return; }
      h += `<div class="counts"><span class="cnt ok">${part.length - ass.length} presenti</span><span class="cnt ko">${ass.length} ${ass.length === 1 ? 'assente' : 'assenti'}</span><span class="cnt">${part.length} iscritti</span></div>`;
      if (!part.length) h += '<p class="muted">Nessun iscritto a questa lezione.</p>';
      h += '<ul class="plist">' + part.map(i => {
        const a = assenza(i.id, ds, s.id);
        return `<li class="${a ? 'abs' : ''}">
          <button class="pname" data-open="${i.id}"><span class="av">${esc(iniziali(i))}</span><span><b>${esc(nomePuntato(i))}</b>${a ? `<small>Assente${a.nota ? ' · ' + esc(a.nota) : ''}</small>` : '<small>Presente</small>'}</span></button>
          <span class="dots">${dot(statoCert(i), 'C')}${dot(statoIscr(i), 'I')}${dot(statoQuota(i), 'Q')}</span>
          <button class="pill ${a ? 'ko' : 'ok'}" data-toggle="${i.id}|${s.id}" aria-label="Cambia presenza">${a ? '✕' : '✓'}</button>
        </li>`;
      }).join('') + '</ul></div>';
    });
    return h + '</section>';
  }

  function giornoIscritto(ds) {
    const me = S.sess.iscritto;
    const sl = slotsDel(ds).filter(s => (me.lezioni || []).includes(s.id));
    let h = `<section class="day"><h2 class="day-t">${esc(fmtLong(ds))}</h2>`;
    if (!sl.length) return h + '<p class="muted card pad">Nessuna tua lezione in questo giorno.</p></section>';
    return h + sl.map(s => lezioneCard(ds, s)).join('') + '</section>';
  }
  function lezioneCard(ds, s) {
    const me = S.sess.iscritto;
    const ann = annullata(ds, s.id), a = assenza(me.id, ds, s.id), passata = ds < today();
    let stato, btn = '';
    if (ann) stato = `<span class="tag gray">Annullata${ann.motivo ? ' · ' + esc(ann.motivo) : ''}</span>`;
    else if (a) {
      stato = `<span class="tag red">Assente${a.nota ? ' · ' + esc(a.nota) : ''}</span>`;
      if (!passata) btn = `<button class="btn sm ghost" data-mepres="${ds}|${s.id}">Ci sarò</button>`;
    } else {
      stato = `<span class="tag green">Presente</span>`;
      if (!passata) btn = `<button class="btn sm danger-o" data-meass="${ds}|${s.id}">Segnala assenza</button>`;
    }
    return `<div class="card les-card${ann ? ' is-ann' : ''}" data-pres="${ds}|${s.id}" role="button" tabindex="0">
      <div class="lc-date"><b>${parse(ds).getDate()}</b><small>${MESI[parse(ds).getMonth()].slice(0, 3)}</small></div>
      <div class="lc-body"><b>${esc(GIORNI[parse(ds).getDay()])} · <span class="nw">${esc(s.inizio)}–${esc(s.fine)}</span></b>${stato}<small class="lc-more">Vedi chi c'è ›</small></div>
      ${btn}</div>`;
  }
  function dot(st, l) { return `<i class="dot ${st.c}" title="${esc(st.t)}">${l}</i>`; }


  /* -------------------------------------------- scheda presenze di una lezione */
  async function openPresenze(ds, slotId) {
    const s = S.d.settings.slots.find(x => x.id === slotId);
    if (!s) return;
    const ann = annullata(ds, slotId);
    const w = document.createElement('div');
    w.className = 'sheet';
    document.body.appendChild(w);
    document.body.classList.add('noscroll');
    const close = () => { w.remove(); document.body.classList.remove('noscroll'); };
    const head = `<div class="sheet-top"><button class="icbtn" data-x aria-label="Chiudi">${ic('back')}</button><b>Presenze</b><span style="width:38px"></span></div>`;
    const titolo = `<div class="pres-h"><div class="lc-date"><b>${parse(ds).getDate()}</b><small>${MESI[parse(ds).getMonth()].slice(0, 3)}</small></div>
      <div><h2>${esc(fmtLong(ds))}</h2><p class="muted">${s.nome === GIORNI[parse(ds).getDay()] ? '' : esc(s.nome) + ' · '}Ore ${esc(s.inizio)}–${esc(s.fine)}${S.d.settings.luogo ? ' · ' + esc(S.d.settings.luogo) : ''}</p></div></div>`;
    w.innerHTML = head + `<div class="sheet-body">${titolo}<p class="muted pad">Caricamento…</p></div>`;
    w.querySelector('[data-x]').onclick = close;
    if (ann) {
      w.querySelector('.sheet-body').innerHTML = titolo + `<p class="ann-msg">Lezione annullata${ann.motivo ? ': ' + esc(ann.motivo) : ''}</p>`;
      return;
    }
    const admin = S.sess.role === 'admin';
    let lista;
    try {
      lista = admin
        ? partecipanti(ds, slotId).map(i => ({ id: i.id, nome: i.nome, iniziale: (i.cognome || '').trim().slice(0, 1).toUpperCase(), assente: !!assenza(i.id, ds, slotId) }))
        : await DB.presenzeLezione(ds, slotId);
    }
    catch (e) { w.querySelector('.sheet-body').innerHTML = titolo + `<p class="muted pad">${esc(e.message)}</p>`; return; }
    const nomeP = p => esc(p.nome + (p.iniziale ? ' ' + p.iniziale + '.' : ''));
    const pres = lista.filter(p => !p.assente), ass = lista.filter(p => p.assente);
    const futura = ds >= today();
    const li = (arr, cls) => arr.length ? '<ul class="pres-list ' + cls + '">' + arr.map(p => p.id
        ? `<li><button class="pres-row" data-popen="${esc(p.id)}"><span class="av sm">${esc((p.nome[0] || '') + (p.iniziale || ''))}</span><span class="pn">${nomeP(p)}</span><span class="chev">›</span></button></li>`
        : `<li><span class="av sm">${esc((p.nome[0] || '') + (p.iniziale || ''))}</span>${nomeP(p)}</li>`).join('') + '</ul>' : '<p class="muted small">Nessuno</p>';
    w.querySelector('.sheet-body').innerHTML = titolo + `
      <div class="counts big"><span class="cnt ok">${pres.length} ${futura ? (pres.length === 1 ? 'sarà presente' : 'saranno presenti') : (pres.length === 1 ? 'presente' : 'presenti')}</span><span class="cnt ko">${ass.length} ${ass.length === 1 ? 'assente' : 'assenti'}</span></div>
      <h3 class="sec-t">${futura ? 'Ci saranno' : 'Presenti'} · ${pres.length}</h3>${li(pres, 'ok')}
      <h3 class="sec-t">Assenti · ${ass.length}</h3>${li(ass, 'ko')}
      <p class="hint">Gli iscritti risultano presenti salvo assenza segnalata.${admin ? ' Tocca un nome per aprire la scheda.' : ''}</p>`;
    w.querySelectorAll('[data-popen]').forEach(b => b.onclick = () => openScheda(b.dataset.popen));
  }

  /* -------------------------------------------------------- lezioni (iscritto) */
  function viewLezioni() {
    const me = S.sess.iscritto;
    const out = [];
    let ds = today();
    for (let k = 0; k < 60 && out.length < 12; k++) {
      slotsDel(ds).filter(s => (me.lezioni || []).includes(s.id)).forEach(s => out.push([ds, s]));
      ds = addDays(ds, 1);
    }
    return `<section class="hello"><h2>Ciao ${esc(me.nome)}!</h2>
      <p class="muted">Risulti sempre presente: se non puoi venire, segnala l'assenza.</p></section>
      ${statoCards(me)}
      <h3 class="sec-t">Prossime lezioni</h3>
      ${out.length ? out.map(x => lezioneCard(x[0], x[1])).join('') : '<p class="muted card pad">Nessuna lezione in programma.</p>'}`;
  }
  function statoCards(i) {
    const c = statoCert(i), s = statoIscr(i), q = statoQuota(i);
    return `<div class="stati">
      <div class="st ${c.c}"><small>Certificato medico</small><b>${esc(c.t)}</b></div>
      <div class="st ${s.c}"><small>Iscrizione</small><b>${esc(s.t)}</b></div>
      <div class="st ${q.c}"><small>Quota mensile</small><b>${esc(q.t)}</b></div></div>`;
  }
  function viewMe() {
    const me = S.sess.iscritto;
    return `<section class="card pad">
      <div class="sch-head"><span class="av big">${esc(iniziali(me))}</span><div><h2>${esc(nomeCompleto(me))}</h2><p class="muted">${esc(lezioniTesto(me))}</p></div></div>
      <dl class="info">
        <dt>Data di nascita</dt><dd>${fmt(me.data_nascita)}</dd>
        <dt>Telefono</dt><dd>${esc(me.telefono || '—')}</dd>
        <dt>Email</dt><dd>${esc(me.email || '—')}</dd>
        <dt>Iscritto dal</dt><dd>${fmt(me.data_iscrizione)}</dd>
        <dt>Certificato</dt><dd>${me.certificato_tipo === 'agonistico' ? 'Agonistico' : 'Non agonistico'} · scade ${fmt(me.certificato_scadenza)}</dd>
      </dl>
      <p class="hint">Per correggere i tuoi dati scrivi all'amministratore.</p>
      <button class="link" data-inf>Informativa privacy</button></section>
      ${statoCards(me)}
      ${DB.mode === 'online' ? `<button class="btn ghost wide" id="b-pw">Cambia password</button><button class="btn ghost wide" id="b-logout">${ic('out')} Esci</button>` : ''}
      <p class="ver">Versione ${esc(window.APP_VERSION)}</p>`;
  }

  /* --------------------------------------------------------------- iscritti */
  function viewIscritti() {
    const all = S.d.iscritti.slice().sort((a, b) => (a.cognome + a.nome).localeCompare(b.cognome + b.nome));
    const cnt = {
      cert: all.filter(i => i.attivo !== false && statoCert(i).c !== 'green').length,
      iscr: all.filter(i => i.attivo !== false && statoIscr(i).c !== 'green').length,
      quota: all.filter(i => i.attivo !== false && statoQuota(i).c !== 'green').length
    };
    const q = S.q.toLowerCase();
    let list = all.filter(i => !q || (nomeCompleto(i) + ' ' + (i.cognome + ' ' + i.nome) + ' ' + (i.telefono || '') + ' ' + (i.email || '')).toLowerCase().includes(q));
    if (S.filtro === 'cert') list = list.filter(i => i.attivo !== false && statoCert(i).c !== 'green');
    if (S.filtro === 'iscr') list = list.filter(i => i.attivo !== false && statoIscr(i).c !== 'green');
    if (S.filtro === 'quota') list = list.filter(i => i.attivo !== false && statoQuota(i).c !== 'green');
    if (S.filtro === 'inattivi') list = list.filter(i => i.attivo === false);
    else if (S.filtro !== 'tutti') { /* già filtrati */ } else list = list.filter(i => i.attivo !== false);
    const f = (k, t, n) => `<button class="chip${S.filtro === k ? ' on' : ''}" data-filtro="${k}">${t}${n != null ? ' <b>' + n + '</b>' : ''}</button>`;
    const emails = new Set(all.map(i => (i.email || '').toLowerCase()).filter(Boolean));
    const nuove = (S.d.registrazioni || []).filter(r => r.email && !emails.has(r.email.toLowerCase()) && r.email.toLowerCase() !== (S.sess.email || ''));
    const reqHtml = nuove.length ? `<section class="card pad req"><h3 class="sec-t">Nuove registrazioni da abilitare · ${nuove.length}</h3>
      <ul class="rlist">${nuove.map(r => `<li><span class="inf"><b>${esc((r.cognome + ' ' + r.nome).trim() || r.email)}</b><small>${esc(r.email)}${r.data_nascita ? ' · nato/a il ' + fmt(r.data_nascita) : ''}</small></span>
      <button class="btn sm primary" data-reg="${esc(r.user_id)}">Crea scheda</button></li>`).join('')}</ul>
      <p class="hint">Si sono registrati nell'app ma non hanno ancora una scheda: creala e potranno entrare.</p></section>` : '';
    return reqHtml + `
      <div class="search"><input class="inp" id="q" type="search" placeholder="Cerca per nome, telefono, email…" value="${esc(S.q)}"></div>
      <div class="chips">${f('tutti', 'Attivi', all.filter(i => i.attivo !== false).length)}${f('cert', 'Certificati', cnt.cert)}${f('iscr', 'Iscrizioni', cnt.iscr)}${f('quota', 'Quote', cnt.quota)}${f('inattivi', 'Non attivi')}</div>
      <div class="legend l2"><span><i class="dot green">C</i>Certificato</span><span><i class="dot green">I</i>Iscrizione</span><span><i class="dot green">Q</i>Quota mese</span></div>
      <ul class="ilist card">${list.length ? list.map(i => `
        <li><button class="irow" data-open="${i.id}">
          <span class="av">${esc(iniziali(i))}</span>
          <span class="inf"><b>${esc((i.cognome ? i.cognome + ' ' : '') + i.nome)}</b><small>${esc(lezioniTesto(i))}</small></span>
          <span class="dots">${dot(statoCert(i), 'C')}${dot(statoIscr(i), 'I')}${dot(statoQuota(i), 'Q')}</span>
        </button></li>`).join('') : '<li class="muted pad">Nessun iscritto' + (S.q || S.filtro !== 'tutti' ? ' con questi criteri' : ': tocca + per aggiungerne uno') + '.</li>'}</ul>
      <button class="fab" id="b-new" aria-label="Nuovo iscritto">${ic('plus')}</button>`;
  }

  /* ------------------------------------------------------- scheda personale */
  function telDigits(t) { return String(t || '').replace(/[^\d+]/g, ''); }
  function waNumber(t) {
    let n = telDigits(t).replace(/^\+/, '').replace(/^00/, '');
    if (/^3\d{8,9}$/.test(n)) n = '39' + n;
    return n;
  }
  function mesiStagione() {
    const s = S.d.settings, out = [];
    if (!s.stagione_inizio || !s.stagione_fine) return out;
    let d = parse(s.stagione_inizio.slice(0, 7) + '-01');
    const end = s.stagione_fine.slice(0, 7);
    while (ymd(d).slice(0, 7) <= end && out.length < 24) { out.push(ymd(d).slice(0, 7)); d.setMonth(d.getMonth() + 1); }
    return out;
  }

  function openScheda(id, prefill) {
    const st = S.d.settings;
    const i = id ? JSON.parse(JSON.stringify(S.d.iscritti.find(x => x.id === id))) : {
      nome: '', cognome: '', telefono: '', email: '', data_iscrizione: today(), scadenza_iscrizione: st.stagione_fine,
      certificato_scadenza: '', certificato_tipo: 'non_agonistico', lezioni: st.slots.map(s => s.id), attivo: true, note: '', data_nascita: ''
    };
    if (!id && prefill) Object.assign(i, prefill);
    if (!i) return;
    S.scheda = i;
    const w = document.createElement('div');
    w.className = 'sheet';
    document.body.appendChild(w);
    document.body.classList.add('noscroll');
    const close = () => { w.remove(); document.body.classList.remove('noscroll'); S.scheda = null; };
    const draw = () => {
      const tel = telDigits(i.telefono);
      const ass = id ? S.d.assenze.filter(a => a.iscritto_id === id).sort((a, b) => b.data.localeCompare(a.data)) : [];
      const mesi = mesiStagione(), mc = meseCorrente();
      w.innerHTML = `
        <div class="sheet-top"><button class="icbtn" data-x aria-label="Chiudi">${ic('back')}</button><b>${id ? 'Scheda iscritto' : 'Nuovo iscritto'}</b>
          ${id ? `<button class="icbtn" data-del aria-label="Elimina">${ic('trash')}</button>` : '<span></span>'}</div>
        <div class="sheet-body">
          ${id ? `<div class="sch-head"><span class="av big">${esc(iniziali(i))}</span><div><h2>${esc(nomeCompleto(i))}</h2><p class="muted">${esc(lezioniTesto(i))}</p></div></div>
          <div class="contacts">
            <a class="cbtn${tel ? '' : ' off'}" href="${tel ? 'tel:' + esc(tel) : '#'}">${ic('tel')}<span>Chiama</span></a>
            <a class="cbtn wa${tel ? '' : ' off'}" href="${tel ? 'https://wa.me/' + esc(waNumber(i.telefono)) : '#'}" target="_blank" rel="noopener">${WA}<span>WhatsApp</span></a>
            <a class="cbtn${i.email ? '' : ' off'}" href="${i.email ? 'mailto:' + esc(i.email) : '#'}">${ic('mail')}<span>Mail</span></a>
          </div>${statoCards(i)}
          <p class="privline">${(() => { const c = consensoDi(i.email); return DB.mode === 'demo' ? '' : c ? '🔒 Privacy accettata il ' + fmt(c.accettato_il.slice(0, 10)) + ' (v. ' + esc(c.versione) + ')' : '🔒 Privacy: non ancora accettata (l\'iscritto non si è ancora registrato nell\'app)'; })()}</p>` : ''}
          <form id="f-sch" class="form">
            <h3 class="sec-t">Anagrafica</h3>
            <div class="two"><label>Nome *<input class="inp" name="nome" required maxlength="60" value="${esc(i.nome)}"></label>
            <label>Cognome<input class="inp" name="cognome" maxlength="60" value="${esc(i.cognome)}"></label></div>
            <label>Data di nascita${i.data_nascita && eta(i.data_nascita) != null ? ' <small class="muted">(' + eta(i.data_nascita) + ' anni)</small>' : ''}<input class="inp" type="date" name="data_nascita" max="${today()}" value="${esc(i.data_nascita || '')}"></label>
            <label>Telefono<input class="inp" name="telefono" type="tel" maxlength="30" placeholder="es. 347 1234567" value="${esc(i.telefono || '')}"></label>
            <label>Email<input class="inp" name="email" type="email" maxlength="120" value="${esc(i.email || '')}"><small class="hint">Serve all'iscritto per accedere all'app e segnalare le assenze.</small></label>

            <h3 class="sec-t">Lezioni settimanali</h3>
            <div class="chips">${st.slots.map(s => `<button type="button" class="chip${(i.lezioni || []).includes(s.id) ? ' on' : ''}" data-slot="${s.id}">${esc(slotLabel(s))}</button>`).join('')}</div>
            ${st.slots.length > 1 ? `<div class="quick"><button type="button" class="link" data-allslots>Tutte</button>${st.slots.map(s => `<button type="button" class="link" data-onlyslot="${s.id}">Solo ${esc(s.nome)}</button>`).join('')}</div>` : ''}

            <h3 class="sec-t">Iscrizione</h3>
            <div class="two"><label>Data iscrizione<input class="inp" type="date" name="data_iscrizione" value="${esc(i.data_iscrizione || '')}"></label>
            <label>Scadenza<input class="inp" type="date" name="scadenza_iscrizione" value="${esc(i.scadenza_iscrizione || '')}"></label></div>
            <div class="quick"><button type="button" class="link" data-rinnova>Rinnova fino a fine stagione (${fmt(st.stagione_fine)})</button><button type="button" class="link" data-anno>+1 anno</button></div>

            <h3 class="sec-t">Certificato medico</h3>
            <div class="two"><label>Tipo<select class="inp" name="certificato_tipo">
              <option value="non_agonistico"${i.certificato_tipo !== 'agonistico' ? ' selected' : ''}>Non agonistico</option>
              <option value="agonistico"${i.certificato_tipo === 'agonistico' ? ' selected' : ''}>Agonistico</option></select></label>
            <label>Scadenza<input class="inp" type="date" name="certificato_scadenza" value="${esc(i.certificato_scadenza || '')}"></label></div>

            <label class="check"><input type="checkbox" name="attivo"${i.attivo !== false ? ' checked' : ''}> Iscritto attivo (compare nelle lezioni)</label>
            <label>Note<textarea class="inp" name="note" rows="2" maxlength="1000">${esc(i.note || '')}</textarea></label>
          </form>

          ${id ? `<h3 class="sec-t">Quote mensili${st.quota_mensile ? ' · € ' + esc(st.quota_mensile) : ''}</h3>
          <div class="mesi">${mesi.map(m => `<button type="button" class="mese${pagato(id, m) ? ' paid' : (m <= mc ? ' due' : '')}${m === mc ? ' cur' : ''}" data-mese="${m}"><small>${MESI[Number(m.slice(5)) - 1].slice(0, 3)}</small><b>${pagato(id, m) ? '✓' : (m <= mc ? '✕' : '·')}</b></button>`).join('')}</div>
          <p class="hint">Tocca un mese per segnarlo pagato / non pagato.</p>
          <h3 class="sec-t">Assenze segnalate</h3>
          ${ass.length ? '<ul class="alist">' + ass.slice(0, 30).map(a => { const s = st.slots.find(x => x.id === a.slot); return `<li><b>${fmt(a.data)}</b> ${esc(s ? s.nome : '')}${a.nota ? ' · ' + esc(a.nota) : ''}</li>`; }).join('') + '</ul>' : '<p class="muted">Nessuna assenza.</p>'}` : ''}
        </div>
        <div class="sheet-foot"><button class="btn primary big" id="b-save">${id ? 'Salva modifiche' : 'Aggiungi iscritto'}</button></div>`;

      const f = w.querySelector('#f-sch');
      const sync = () => {
        const fd = new FormData(f);
        ['nome', 'cognome', 'data_nascita', 'telefono', 'email', 'data_iscrizione', 'scadenza_iscrizione', 'certificato_tipo', 'certificato_scadenza', 'note'].forEach(k => i[k] = (fd.get(k) || '').toString().trim());
        i.attivo = f.attivo.checked;
      };
      w.querySelector('[data-x]').onclick = close;
      w.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => {
        sync(); const s = b.dataset.slot; i.lezioni = i.lezioni || [];
        i.lezioni = i.lezioni.includes(s) ? i.lezioni.filter(x => x !== s) : i.lezioni.concat(s); draw();
      });
      const all = w.querySelector('[data-allslots]'); if (all) all.onclick = () => { sync(); i.lezioni = st.slots.map(s => s.id); draw(); };
      w.querySelectorAll('[data-onlyslot]').forEach(b => b.onclick = () => { sync(); i.lezioni = [b.dataset.onlyslot]; draw(); });
      w.querySelector('[data-rinnova]').onclick = () => { sync(); i.scadenza_iscrizione = st.stagione_fine; if (!i.data_iscrizione) i.data_iscrizione = today(); draw(); };
      w.querySelector('[data-anno]').onclick = () => {
        sync(); const base = i.scadenza_iscrizione && i.scadenza_iscrizione > today() ? i.scadenza_iscrizione : (i.data_iscrizione || today());
        const d = parse(base); d.setFullYear(d.getFullYear() + 1); i.scadenza_iscrizione = ymd(d); draw();
      };
      w.querySelectorAll('[data-mese]').forEach(b => b.onclick = async () => {
        const m = b.dataset.mese, p = pagato(id, m);
        await run(() => DB.setPagamento(id, m, !p, st.quota_mensile)).catch(() => {});
        S.d = await DB.loadAll(); sync(); draw(); render();
      });
      const del = w.querySelector('[data-del]');
      if (del) del.onclick = async () => {
        if (!await confirmBox('Eliminare ' + nomeCompleto(i) + '?', 'Verranno cancellati anche quote e assenze. Per tenerlo in archivio togli invece la spunta "Iscritto attivo".', 'Elimina')) return;
        await run(() => DB.deleteIscritto(id), 'Iscritto eliminato').catch(() => {});
        close(); await ricarica();
      };
      w.querySelector('#b-save').onclick = async () => {
        sync();
        if (!i.nome) return toast('Il nome è obbligatorio', 'err');
        if (i.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.email)) return toast('Email non valida', 'err');
        const saved = await run(() => DB.saveIscritto(Object.assign({}, i)), id ? 'Scheda salvata' : 'Iscritto aggiunto').catch(() => null);
        if (!saved) return;
        await ricarica();
        if (!id) { close(); openScheda(saved.id); } else { close(); }
      };
    };
    draw();
  }

  /* ----------------------------------------------------------- impostazioni */
  function viewImp() {
    const s = S.d.settings;
    return `
      <section class="card pad">
        <h3 class="sec-t">Giorni e orari delle lezioni</h3>
        <div id="slots">${s.slots.map((x, k) => slotRow(x, k)).join('')}</div>
        <button class="btn ghost sm" id="b-addslot">${ic('plus')} Aggiungi lezione settimanale</button>
        <label>Luogo (facoltativo)<input class="inp" id="i-luogo" maxlength="120" value="${esc(s.luogo || '')}" placeholder="es. Palestra comunale di Taino"></label>
        <h3 class="sec-t">Stagione</h3>
        <div class="two"><label>Inizio<input class="inp" type="date" id="i-sin" value="${esc(s.stagione_inizio || '')}"></label>
        <label>Fine<input class="inp" type="date" id="i-sfi" value="${esc(s.stagione_fine || '')}"></label></div>
        <p class="hint">Le lezioni compaiono nel calendario solo in questo periodo. Le singole date (festività…) si annullano dal calendario.</p>
        <h3 class="sec-t">Quote e avvisi</h3>
        <div class="two"><label>Quota mensile (€)<input class="inp" type="number" min="0" step="0.5" id="i-quota" value="${esc(s.quota_mensile || 0)}"></label>
        <label>Giallo da (giorni prima)<input class="inp" type="number" min="1" max="120" id="i-pre" value="${esc(s.preavviso_giorni || 30)}"></label></div>
        <button class="btn primary big" id="b-saveimp">Salva impostazioni</button>
      </section>
      <section class="card pad">
        <h3 class="sec-t">Dati</h3>
        <button class="btn ghost wide" id="b-csv">Esporta elenco iscritti (CSV)</button>
        ${DB.mode === 'demo' ? `<button class="btn ghost wide" id="b-example">Carica iscritti di esempio</button><button class="btn danger-o wide" id="b-reset">Azzera la prova</button>
          <p class="hint">Modalità prova: per condividere i dati con gli iscritti collega Supabase (vedi README).</p>`
          : `<button class="btn ghost wide" id="b-pw">Cambia password</button><button class="btn ghost wide" id="b-logout">${ic('out')} Esci</button>`}
        <button class="btn ghost wide" data-inf>Informativa privacy</button>
        <p class="ver">S.C.T. TrainingLab · versione ${esc(window.APP_VERSION)}</p>
      </section>`;
  }
  function slotRow(x, k) {
    return `<div class="slotrow" data-k="${k}">
      <input class="inp" data-f="nome" value="${esc(x.nome)}" maxlength="30" placeholder="Nome">
      <select class="inp" data-f="giorno">${[1, 2, 3, 4, 5, 6, 0].map(g => `<option value="${g}"${Number(x.giorno) === g ? ' selected' : ''}>${GIORNI[g]}</option>`).join('')}</select>
      <input class="inp" type="time" data-f="inizio" value="${esc(x.inizio)}">
      <input class="inp" type="time" data-f="fine" value="${esc(x.fine)}">
      <button class="icbtn" data-rmslot="${k}" aria-label="Rimuovi">${ic('trash')}</button></div>`;
  }
  function leggiSlots() {
    const cur = S.d.settings.slots;
    return Array.from(document.querySelectorAll('.slotrow')).map(r => {
      const k = Number(r.dataset.k), g = f => r.querySelector('[data-f="' + f + '"]').value;
      return { id: (cur[k] && cur[k].id) || 's' + Date.now().toString(36) + k, nome: g('nome').trim() || GIORNI[Number(g('giorno'))], giorno: Number(g('giorno')), inizio: g('inizio') || '19:00', fine: g('fine') || '20:00' };
    });
  }
  function csv() {
    const st = S.d.settings;
    const rows = [['Cognome', 'Nome', 'Telefono', 'Email', 'Lezioni', 'Data iscrizione', 'Scadenza iscrizione', 'Tipo certificato', 'Scadenza certificato', 'Quota ' + nomeMese(meseCorrente()), 'Attivo']];
    S.d.iscritti.forEach(i => rows.push([i.cognome, i.nome, i.telefono, i.email, lezioniTesto(i), fmt(i.data_iscrizione), fmt(i.scadenza_iscrizione),
      i.certificato_tipo === 'agonistico' ? 'Agonistico' : 'Non agonistico', fmt(i.certificato_scadenza), pagato(i.id, meseCorrente()) ? 'Pagata' : 'Da pagare', i.attivo !== false ? 'Sì' : 'No']));
    const txt = '﻿' + rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    a.download = 'iscritti-traininglab-' + today() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    void st;
  }

  /* ---------------------------------------------------------------- eventi */
  function bind() {
    const main = $('#main');
    main.querySelectorAll('[data-mon]').forEach(b => b.onclick = () => {
      S.month = new Date(S.month.getFullYear(), S.month.getMonth() + Number(b.dataset.mon), 1); render();
    });
    main.querySelectorAll('[data-day]').forEach(b => b.onclick = () => {
      S.day = b.dataset.day; render();
      const d = document.querySelector('.day'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    main.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openScheda(b.dataset.open));
    main.querySelectorAll('[data-pres]').forEach(el => {
      const go = e => { if (e.target.closest('button') && e.target.closest('button') !== el) return; const [ds, sl] = el.dataset.pres.split('|'); openPresenze(ds, sl); };
      el.onclick = go;
      el.onkeydown = e => { if (e.key === 'Enter') go(e); };
    });
    main.querySelectorAll('[data-toggle]').forEach(b => b.onclick = async () => {
      const [iid, slot] = b.dataset.toggle.split('|'), a = assenza(iid, S.day, slot);
      if (a) await run(() => DB.removeAssenza({ iscritto_id: iid, data: S.day, slot })).catch(() => {});
      else {
        const nota = await askText('Segna assente', nomeCompleto(S.d.iscritti.find(x => x.id === iid)) + ' · ' + fmtLong(S.day), 'Motivo (facoltativo)', 'Segna assente');
        if (nota === null) return;
        await run(() => DB.addAssenza({ iscritto_id: iid, data: S.day, slot, nota })).catch(() => {});
      }
      await ricarica();
    });
    main.querySelectorAll('[data-annulla]').forEach(b => b.onclick = async () => {
      const m = await askText('Annulla lezione', fmtLong(S.day) + ': la lezione comparirà annullata a tutti.', 'Motivo (es. festività)', 'Annulla lezione');
      if (m === null) return;
      await run(() => DB.setAnnullamento(S.day, b.dataset.annulla, m), 'Lezione annullata').catch(() => {}); await ricarica();
    });
    main.querySelectorAll('[data-ripr]').forEach(b => b.onclick = async () => {
      await run(() => DB.setAnnullamento(S.day, b.dataset.ripr, null), 'Lezione ripristinata').catch(() => {}); await ricarica();
    });
    main.querySelectorAll('[data-meass]').forEach(b => b.onclick = async () => {
      const [ds, slot] = b.dataset.meass.split('|');
      const nota = await askText('Segnala assenza', fmtLong(ds) + ' — l\'allenatore lo vedrà nel calendario.', 'Motivo (facoltativo)', 'Segnala assenza');
      if (nota === null) return;
      await run(() => DB.addAssenza({ iscritto_id: S.sess.iscritto.id, data: ds, slot, nota }), 'Assenza segnalata').catch(() => {}); await ricarica();
    });
    main.querySelectorAll('[data-mepres]').forEach(b => b.onclick = async () => {
      const [ds, slot] = b.dataset.mepres.split('|');
      await run(() => DB.removeAssenza({ iscritto_id: S.sess.iscritto.id, data: ds, slot }), 'Ok, risulti presente').catch(() => {}); await ricarica();
    });
    const q = $('#q');
    if (q) q.oninput = () => { S.q = q.value; const pos = q.selectionStart; render(); const n = $('#q'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} };
    main.querySelectorAll('[data-filtro]').forEach(b => b.onclick = () => { S.filtro = S.filtro === b.dataset.filtro ? 'tutti' : b.dataset.filtro; render(); });
    const nb = $('#b-new'); if (nb) nb.onclick = () => openScheda(null);
    main.querySelectorAll('[data-inf]').forEach(b => b.onclick = () => informativa());
    main.querySelectorAll('[data-reg]').forEach(b => b.onclick = () => {
      const r = (S.d.registrazioni || []).find(x => x.user_id === b.dataset.reg);
      if (r) openScheda(null, { nome: r.nome, cognome: r.cognome, email: r.email, data_nascita: r.data_nascita || '' });
    });

    // impostazioni
    const add = $('#b-addslot');
    if (add) add.onclick = () => {
      const cur = leggiSlots(); cur.push({ id: 's' + Date.now().toString(36), nome: 'Sabato', giorno: 6, inizio: '10:00', fine: '11:00' });
      S.d.settings.slots = cur; render();
    };
    main.querySelectorAll('[data-rmslot]').forEach(b => b.onclick = async () => {
      const cur = leggiSlots();
      if (cur.length <= 1) return toast('Serve almeno una lezione settimanale', 'err');
      if (!await confirmBox('Rimuovere la lezione?', 'Gli iscritti non la frequenteranno più. Ricordati di salvare.', 'Rimuovi')) return;
      cur.splice(Number(b.dataset.rmslot), 1); S.d.settings.slots = cur; render();
    });
    const si = $('#b-saveimp');
    if (si) si.onclick = async () => {
      const s = Object.assign({}, S.d.settings, {
        slots: leggiSlots(), luogo: $('#i-luogo').value.trim(), stagione_inizio: $('#i-sin').value, stagione_fine: $('#i-sfi').value,
        quota_mensile: Number($('#i-quota').value) || 0, preavviso_giorni: Math.max(1, Number($('#i-pre').value) || 30)
      });
      if (s.stagione_inizio && s.stagione_fine && s.stagione_fine < s.stagione_inizio) return toast('La fine stagione è prima dell\'inizio', 'err');
      if (s.slots.some(x => x.fine <= x.inizio)) return toast('Controlla gli orari: la fine deve essere dopo l\'inizio', 'err');
      await run(() => DB.saveSettings(s), 'Impostazioni salvate').catch(() => {}); await ricarica();
    };
    const c = $('#b-csv'); if (c) c.onclick = csv;
    const ex = $('#b-example'); if (ex) ex.onclick = async () => { DB.loadExample(); S.view = 'iscritti'; await carica(); refreshDemoList(); toast('Iscritti di esempio caricati'); };
    const rs = $('#b-reset'); if (rs) rs.onclick = async () => { if (await confirmBox('Azzerare la prova?', 'Tutti i dati di prova su questo dispositivo verranno cancellati.', 'Azzera')) { DB.reset(); location.reload(); } };
    const cp = $('#b-pw'); if (cp) cp.onclick = () => nuovaPassword();
    const lo = $('#b-logout'); if (lo) lo.onclick = async () => { await DB.signOut(); S.view = null; carica(); };
  }

  async function refreshDemoList() {
    if (DB.mode !== 'demo') return;
    const v = DB.getVista(); DB.setVista('admin');
    const all = await DB.loadAll(); DB._all = all.iscritti.slice().sort((a, b) => (a.cognome + a.nome).localeCompare(b.cognome + b.nome));
    DB.setVista(v); render();
  }
  if (DB.mode === 'demo') {
    const orig = DB.saveIscritto, origDel = DB.deleteIscritto;
    DB.saveIscritto = async o => { const r = await orig(o); setTimeout(refreshDemoList, 0); return r; };
    DB.deleteIscritto = async id => { await origDel(id); setTimeout(refreshDemoList, 0); };
  }

  document.addEventListener('app-update-available', () => {
    const ub = document.querySelector('.upd-btn'), slot = document.querySelector('[data-update-slot]');
    if (ub && slot && !slot.contains(ub)) { ub.classList.remove('upd-float'); slot.appendChild(ub); }
  });

  boot().then(() => refreshDemoList());

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* anteprima */ }
  }
})();
