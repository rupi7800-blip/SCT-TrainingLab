/* S.C.T. TrainingLab — accesso ai dati
   Due motori con la stessa interfaccia:
   - "online": Supabase (dati condivisi tra amministratore e iscritti)
   - "demo":   memoria del dispositivo (per provare l'app) */
(function () {
  'use strict';

  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function defaultSettings() {
    const t = new Date();
    const y = t.getMonth() >= 7 ? t.getFullYear() : t.getFullYear() - 1;
    return {
      slots: [
        { id: 'mar', nome: 'Martedì', giorno: 2, inizio: '19:00', fine: '20:00' },
        { id: 'gio', nome: 'Giovedì', giorno: 4, inizio: '19:00', fine: '20:00' }
      ],
      stagione_inizio: y + '-09-01',
      stagione_fine: (y + 1) + '-06-30',
      quota_mensile: 0,
      preavviso_giorni: 30,
      luogo: ''
    };
  }
  function withDefaults(s) {
    const d = defaultSettings();
    s = s && typeof s === 'object' ? s : {};
    return Object.assign(d, s, { slots: Array.isArray(s.slots) && s.slots.length ? s.slots : d.slots });
  }

  /* ------------------------------------------------------------------ DEMO */
  function demoBackend() {
    const KEY = 'sct-traininglab-demo-v1';
    let mem = null;
    try { mem = JSON.parse(localStorage.getItem(KEY)); } catch (e) { mem = null; }
    if (!mem) mem = { settings: defaultSettings(), iscritti: [], pagamenti: [], assenze: [], annullamenti: [], vista: 'admin' };
    mem.eventi = mem.eventi || []; mem.pe = mem.pe || [];
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* solo in memoria */ } };
    const uid = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const ok = v => Promise.resolve(JSON.parse(JSON.stringify(v)));
    mem.letti = mem.letti || [];
    function demoAvvisi() {
      const t = ymd(new Date()), out = [];
      const diff = s => Math.round((new Date(s) - new Date(t)) / 86400000);
      mem.iscritti.filter(i => i.attivo !== false && !i.prova && !i.certificato_scadenza).forEach(i => {
        if (mem.vista === 'admin') out.push({ id: 'Acm' + i.id, per_admin: true, iscritto_id: i.id, tipo: 'cert_mancante', titolo: 'Certificato medico mancante', testo: i.nome + ' ' + i.cognome + ' non ha ancora consegnato il certificato medico.', creato: new Date().toISOString() });
        else if (mem.vista === i.id) out.push({ id: 'Ucm' + i.id, destinatario_iscritto: i.id, iscritto_id: i.id, tipo: 'cert_mancante', titolo: 'Certificato medico mancante', testo: 'Non risulta ancora il tuo certificato medico sportivo: consegnalo all\'allenatore per poterti allenare.', creato: new Date().toISOString() });
      });
      mem.iscritti.filter(i => i.attivo !== false && !i.prova && i.certificato_scadenza && diff(i.certificato_scadenza) <= 30).forEach(i => {
        const g = diff(i.certificato_scadenza), tipo = g <= 0 ? 'cert_scaduto' : g <= 15 ? 'cert_15' : 'cert_30';
        const tit = g <= 0 ? 'Certificato medico scaduto' : g <= 15 ? 'Certificato in scadenza tra ' + g + ' giorni' : 'Certificato in scadenza tra un mese';
        const sc = i.certificato_scadenza.split('-').reverse().join('/');
        if (mem.vista === 'admin') out.push({ id: 'A' + tipo + i.id, per_admin: true, iscritto_id: i.id, tipo, titolo: tit, testo: i.nome + ' ' + i.cognome + ': ' + (g <= 0 ? 'certificato scaduto il ' : 'il certificato scade il ') + sc + '.', creato: new Date().toISOString() });
        else if (mem.vista === i.id) out.push({ id: 'U' + tipo + i.id, destinatario_iscritto: i.id, iscritto_id: i.id, tipo, titolo: tit, testo: g <= 0 ? 'Il tuo certificato medico è scaduto il ' + sc + '.' : 'Il tuo certificato medico scade il ' + sc + '. Ricordati di rinnovarlo.', creato: new Date().toISOString() });
      });
      return out.map(a => Object.assign(a, { letto: mem.letti.includes(a.id) }));
    }

    return {
      mode: 'demo',
      async init() {},
      async session() {
        if (mem.vista === 'admin') return { role: 'admin', email: 'demo@traininglab' };
        const isc = mem.iscritti.find(i => i.id === mem.vista);
        if (!isc) { mem.vista = 'admin'; save(); return { role: 'admin', email: 'demo@traininglab' }; }
        return { role: 'iscritto', email: isc.email || '', iscritto: JSON.parse(JSON.stringify(isc)) };
      },
      setVista(v) { mem.vista = v; save(); },
      getVista() { return mem.vista; },
      async loadAll() {
        return ok({
          settings: withDefaults(mem.settings),
          iscritti: mem.vista === 'admin' ? mem.iscritti : mem.iscritti.filter(i => i.id === mem.vista),
          pagamenti: mem.vista === 'admin' ? mem.pagamenti : mem.pagamenti.filter(p => p.iscritto_id === mem.vista),
          assenze: mem.vista === 'admin' ? mem.assenze : mem.assenze.filter(a => a.iscritto_id === mem.vista),
          annullamenti: mem.annullamenti, registrazioni: [], consensi: [],
          eventi: mem.eventi.slice().sort((a, b) => (a.data + (a.ora || '')).localeCompare(b.data + (b.ora || ''))),
          pe: mem.vista === 'admin' ? mem.pe : mem.pe.filter(p => p.iscritto_id === mem.vista),
          conteggi: mem.pe.reduce((m, p) => { m[p.evento_id] = (m[p.evento_id] || 0) + 1; return m; }, {}),
          avvisi: demoAvvisi(),
          note: mem.iscritti.reduce((m, i) => { if (mem.vista === 'admin') m[i.id] = i.note || ''; return m; }, {})
        });
      },
      async saveSettings(s) { mem.settings = s; save(); return ok(s); },
      async saveIscritto(o) {
        if (!o.id) { o.id = uid(); o.creato = new Date().toISOString(); mem.iscritti.push(o); }
        else { const i = mem.iscritti.findIndex(x => x.id === o.id); if (i >= 0) mem.iscritti[i] = Object.assign(mem.iscritti[i], o); }
        save(); return ok(o);
      },
      async accettaPrivacy(uid, email) {
        const P = window.PRIVACY || { VERSIONE: '1.0' };
        chk(await sb.from('consensi_privacy').insert({ user_id: uid, email, versione: P.VERSIONE }));
      },
      async aggiornaMieiDati(nome, cognome, data_nascita) {
        const i = mem.iscritti.find(x => x.id === mem.vista); if (!i) throw new Error('Scheda non trovata');
        Object.assign(i, { nome, cognome, data_nascita }); save();
      },
      async segnaLetti(ids) { ids.forEach(x => { if (!mem.letti.includes(x)) mem.letti.push(x); }); save(); },
      async eliminaAvviso(id) { if (!mem.letti.includes(id)) mem.letti.push(id); save(); },
      async deleteIscritto(id) {
        mem.iscritti = mem.iscritti.filter(x => x.id !== id);
        mem.pagamenti = mem.pagamenti.filter(x => x.iscritto_id !== id);
        mem.assenze = mem.assenze.filter(x => x.iscritto_id !== id);
        save();
      },
      async setPagamento(iscritto_id, mese, pagato, importo) {
        mem.pagamenti = mem.pagamenti.filter(p => !(p.iscritto_id === iscritto_id && p.mese === mese));
        if (pagato) mem.pagamenti.push({ iscritto_id, mese, importo: importo || null, pagato_il: ymd(new Date()) });
        save();
      },
      async addAssenza(a) {
        if (mem.vista !== 'admin' && a.data < ymd(new Date())) throw new Error('Non puoi modificare una lezione passata');
        mem.assenze = mem.assenze.filter(x => !(x.iscritto_id === a.iscritto_id && x.data === a.data && x.slot === a.slot));
        mem.assenze.push(Object.assign({ creato: new Date().toISOString() }, a)); save();
      },
      async removeAssenza(a) {
        if (mem.vista !== 'admin' && a.data < ymd(new Date())) throw new Error('Non puoi modificare una lezione passata');
        mem.assenze = mem.assenze.filter(x => !(x.iscritto_id === a.iscritto_id && x.data === a.data && x.slot === a.slot)); save();
      },
      async setAnnullamento(data, slot, motivo) {
        mem.annullamenti = mem.annullamenti.filter(x => !(x.data === data && x.slot === slot));
        if (motivo !== null) mem.annullamenti.push({ data, slot, motivo: motivo || '' });
        save();
      },
      async saveEvento(o) {
        if (!o.id) { o.id = uid(); mem.eventi.push(o); }
        else { const i = mem.eventi.findIndex(x => x.id === o.id); if (i >= 0) mem.eventi[i] = o; }
        save(); return ok(o);
      },
      async deleteEvento(id) { mem.eventi = mem.eventi.filter(x => x.id !== id); mem.pe = mem.pe.filter(x => x.evento_id !== id); save(); },
      async partecipa(evento_id, iscritto_id, si) {
        mem.pe = mem.pe.filter(x => !(x.evento_id === evento_id && x.iscritto_id === iscritto_id));
        if (si) mem.pe.push({ evento_id, iscritto_id, creato: new Date().toISOString() });
        save();
      },
      async presenzeLezione(data, slot) {
        return mem.iscritti.filter(i => !i.prova && i.attivo !== false && (i.lezioni || []).includes(slot) && (!i.data_iscrizione || i.data_iscrizione <= data))
          .map(i => ({ nome: i.nome, iniziale: (i.cognome || '').slice(0, 1).toUpperCase(), soprannome: i.soprannome || null,
            assente: mem.assenze.some(x => x.iscritto_id === i.id && x.data === data && x.slot === slot) }))
          .sort((a, b) => (a.nome + a.iniziale).localeCompare(b.nome + b.iniziale));
      },
      reset() { try { localStorage.removeItem(KEY); } catch (e) {} },
      loadExample() {
        const s = withDefaults(mem.settings);
        const t = new Date(), plus = n => { const d = new Date(t); d.setDate(d.getDate() + n); return ymd(d); };
        const nomi = [
          ['Giulia', 'Bianchi', '3471234567', 400, 'both'], ['Marco', 'Rossi', '3389876543', 12, 'both'],
          ['Elena', 'Colombo', '3401122334', -5, 'first'], ['Luca', 'Ferrari', '3355566778', 200, 'second'],
          ['Sara', 'Galli', '3479988776', 25, 'both'], ['Paolo', 'Brambilla', '3381231231', 150, 'both']
        ];
        const ids = s.slots.map(x => x.id);
        mem.iscritti = nomi.map((n, k) => ({
          id: uid() + k, nome: n[0], cognome: n[1], telefono: n[2],
          email: n[0].toLowerCase() + '.' + n[1].toLowerCase() + '@esempio.it',
          data_iscrizione: s.stagione_inizio, scadenza_iscrizione: k === 4 ? plus(20) : s.stagione_fine,
          certificato_scadenza: plus(n[3]), certificato_tipo: 'non_agonistico',
          lezioni: n[4] === 'both' ? ids.slice() : n[4] === 'first' ? ids.slice(0, 1) : ids.slice(1, 2),
          attivo: true, note: '', soprannome: k === 1 ? 'Ciccio' : '',
          data_nascita: k === 0 ? (1990 + '-' + ymd(t).slice(5)) : (1980 + k) + '-0' + (k + 1) + '-1' + k
        }));
        const mese = ymd(t).slice(0, 7);
        mem.pagamenti = mem.iscritti.filter((x, k) => k % 3 !== 1).map(x => ({ iscritto_id: x.id, mese, importo: null, pagato_il: ymd(t) }));
        mem.assenze = []; mem.vista = 'admin'; save();
      }
    };
  }

  /* --------------------------------------------------------------- ONLINE */
  function onlineBackend(cfg) {
    let sb = null;
    const CDN = 'js/vendor/supabase.js'; // libreria inclusa nell'app (funziona anche senza CDN)
    function loadScript(src) {
      return new Promise((res, rej) => {
        if (window.supabase && window.supabase.createClient) return res();
        const s = document.createElement('script'); s.src = src; s.onload = res;
        s.onerror = () => rej(new Error('Impossibile caricare Supabase: controlla la connessione'));
        document.head.appendChild(s);
      });
    }
    function chk(r) {
      if (r.error) {
        const m = r.error.message || 'Errore';
        const it = [
          [/row-level security|permission/i, 'Operazione non consentita'],
          [/invalid login credentials/i, 'Email o password errate'],
          [/email not confirmed/i, 'Email non ancora confermata: apri il link che ti abbiamo mandato'],
          [/already registered/i, 'Questa email è già registrata: accedi'],
          [/failed to fetch|network/i, 'Connessione assente: riprova quando sei online'],
          [/rate limit|too many/i, 'Troppi tentativi: riprova tra qualche minuto'],
          [/password should be at least/i, 'La password deve avere almeno 6 caratteri'],
          [/should be different from the old/i, 'La nuova password deve essere diversa dalla precedente']
        ].find(x => x[0].test(m));
        throw new Error(it ? it[1] : m);
      }
      return r.data;
    }
    const clean = o => {
      const keys = ['nome', 'cognome', 'soprannome', 'data_nascita', 'telefono', 'email', 'data_iscrizione', 'scadenza_iscrizione',
        'certificato_scadenza', 'certificato_tipo', 'lezioni', 'attivo', 'prova', 'quota_attiva'];
      const r = {}; keys.forEach(k => { r[k] = o[k] === '' || o[k] === undefined ? null : o[k]; });
      r.cognome = r.cognome || ''; r.lezioni = r.lezioni || []; r.attivo = r.attivo !== false; r.prova = r.prova === true; r.quota_attiva = r.quota_attiva !== false;
      if (r.email) r.email = r.email.trim().toLowerCase();
      return r;
    };

    // "Ricordami": sessione salvata per sempre (localStorage) oppure solo finché il browser resta aperto
    const RK = 'sct-ricordami';
    const ricorda = () => { try { return localStorage.getItem(RK) !== '0'; } catch (e) { return true; } };
    const authStorage = {
      getItem(k) { try { return localStorage.getItem(k) || sessionStorage.getItem(k); } catch (e) { return null; } },
      setItem(k, v) {
        try {
          if (ricorda()) { localStorage.setItem(k, v); sessionStorage.removeItem(k); }
          else { sessionStorage.setItem(k, v); localStorage.removeItem(k); }
        } catch (e) { /* niente memoria */ }
      },
      removeItem(k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} }
    };
    return {
      mode: 'online',
      async init() {
        await loadScript(CDN);
        sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: authStorage }
        });
      },
      onAuth(cb) { sb.auth.onAuthStateChange((ev, s) => cb(ev, s)); },
      async signIn(email, password) { chk(await sb.auth.signInWithPassword({ email: email.trim(), password })); },
      async signUp(email, password, meta) {
        const d = chk(await sb.auth.signUp({ email: email.trim(), password, options: { data: meta || {}, emailRedirectTo: location.href.split('#')[0].split('?')[0] } }));
        return { needsConfirm: !d.session };
      },
      async resetPassword(email) {
        chk(await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.href.split('#')[0].split('?')[0] }));
      },
      async updatePassword(password) { chk(await sb.auth.updateUser({ password })); },
      setRicorda(v) { try { localStorage.setItem(RK, v ? '1' : '0'); } catch (e) {} },
      getRicorda: ricorda,
      async signOut() {
        await sb.auth.signOut();
        try { if (navigator.credentials && navigator.credentials.preventSilentAccess) await navigator.credentials.preventSilentAccess(); } catch (e) {}
      },
      async session() {
        const { data } = await sb.auth.getSession();
        const s = data && data.session;
        if (!s) return { role: 'anon' };
        const email = (s.user.email || '').toLowerCase();
        const P = window.PRIVACY || { VERSIONE: '1.0' };
        const cons = chk(await sb.from('consensi_privacy').select('versione').eq('user_id', s.user.id).eq('versione', P.VERSIONE).maybeSingle());
        if (!cons) return { role: 'privacy', email, uid: s.user.id };
        const adm = chk(await sb.from('amministratori').select('user_id').eq('user_id', s.user.id).maybeSingle());
        if (adm) return { role: 'admin', email };
        const isc = chk(await sb.from('iscritti').select('*').limit(1));
        if (isc && isc[0]) return { role: 'iscritto', email, iscritto: isc[0] };
        return { role: 'non_abilitato', email };
      },
      async loadAll() {
        const from = new Date(); from.setDate(from.getDate() - 400);
        if (!this._avvisiGenerati) { this._avvisiGenerati = true; try { await sb.rpc('genera_avvisi_certificati'); } catch (e) { /* riprova al prossimo avvio */ } }
        const [imp, isc, pag, ass, ann, reg, con, evs, pe, cnt, avv, nts] = await Promise.all([
          sb.from('impostazioni').select('dati').eq('id', 1).maybeSingle(),
          sb.from('iscritti').select('*').order('cognome').order('nome'),
          sb.from('pagamenti').select('*'),
          sb.from('assenze').select('*').gte('data', ymd(from)),
          sb.from('annullamenti').select('*'),
          sb.from('registrazioni').select('*').order('creato', { ascending: false }),
          sb.from('consensi_privacy').select('email,versione,accettato_il'),
          sb.from('eventi').select('*').gte('data', ymd(from)).order('data').order('ora'),
          sb.from('partecipazioni_eventi').select('*'),
          sb.rpc('conteggio_partecipanti_eventi'),
          sb.from('avvisi').select('*').order('creato', { ascending: false }).limit(150),
          sb.from('note_iscritti').select('*')
        ]);
        return {
          settings: withDefaults(chk(imp) && chk(imp).dati),
          iscritti: chk(isc) || [], pagamenti: chk(pag) || [], assenze: chk(ass) || [], annullamenti: chk(ann) || [], registrazioni: chk(reg) || [], consensi: chk(con) || [],
          eventi: chk(evs) || [], pe: chk(pe) || [],
          conteggi: (chk(cnt) || []).reduce((m, r) => { m[r.evento_id] = Number(r.n); return m; }, {}),
          avvisi: chk(avv) || [],
          note: (chk(nts) || []).reduce((m, r) => { m[r.iscritto_id] = r.note || ''; return m; }, {})
        };
      },
      async saveSettings(s) {
        chk(await sb.from('impostazioni').update({ dati: s, aggiornato: new Date().toISOString() }).eq('id', 1));
        return s;
      },
      async saveIscritto(o) {
        const row = clean(o);
        const saved = o.id ? chk(await sb.from('iscritti').update(row).eq('id', o.id).select().single())
                           : chk(await sb.from('iscritti').insert(row).select().single());
        if (o.note !== undefined) {   // note riservate: tabella leggibile solo dall'amministratore
          const n = (o.note || '').trim();
          if (n) chk(await sb.from('note_iscritti').upsert({ iscritto_id: saved.id, note: n, aggiornato: new Date().toISOString() }));
          else chk(await sb.from('note_iscritti').delete().eq('iscritto_id', saved.id));
        }
        return saved;
      },
      async aggiornaMieiDati(nome, cognome, data_nascita) {
        chk(await sb.rpc('aggiorna_miei_dati', { p_nome: nome, p_cognome: cognome, p_data_nascita: data_nascita || null }));
      },
      async segnaLetti(ids) { if (ids.length) chk(await sb.from('avvisi').update({ letto: true }).in('id', ids)); },
      async eliminaAvviso(id) { chk(await sb.from('avvisi').delete().eq('id', id)); },
      async accettaPrivacy(uid, email) {
        const P = window.PRIVACY || { VERSIONE: '1.0' };
        chk(await sb.from('consensi_privacy').insert({ user_id: uid, email, versione: P.VERSIONE }));
      },
      async deleteIscritto(id) { chk(await sb.from('iscritti').delete().eq('id', id)); },
      async saveEvento(o) {
        const row = {};
        ['titolo', 'data', 'ora', 'ora_fine', 'luogo', 'maps_url', 'costo', 'note'].forEach(k => { row[k] = o[k] === '' || o[k] === undefined ? null : o[k]; });
        if (o.id) return chk(await sb.from('eventi').update(row).eq('id', o.id).select().single());
        return chk(await sb.from('eventi').insert(row).select().single());
      },
      async deleteEvento(id) { chk(await sb.from('eventi').delete().eq('id', id)); },
      async partecipa(evento_id, iscritto_id, si) {
        if (si) chk(await sb.from('partecipazioni_eventi').upsert({ evento_id, iscritto_id }, { onConflict: 'evento_id,iscritto_id', ignoreDuplicates: true }));
        else chk(await sb.from('partecipazioni_eventi').delete().eq('evento_id', evento_id).eq('iscritto_id', iscritto_id));
      },
      async presenzeLezione(data, slot) {
        return chk(await sb.rpc('presenze_lezione_v2', { p_data: data, p_slot: slot })) || [];
      },
      async setPagamento(iscritto_id, mese, pagato, importo) {
        if (pagato) chk(await sb.from('pagamenti').upsert({ iscritto_id, mese, importo: importo || null, pagato_il: ymd(new Date()) }));
        else chk(await sb.from('pagamenti').delete().eq('iscritto_id', iscritto_id).eq('mese', mese));
      },
      async addAssenza(a) {
        chk(await sb.from('assenze').upsert({ iscritto_id: a.iscritto_id, data: a.data, slot: a.slot, nota: a.nota || null }));
      },
      async removeAssenza(a) {
        chk(await sb.from('assenze').delete().eq('iscritto_id', a.iscritto_id).eq('data', a.data).eq('slot', a.slot));
      },
      async setAnnullamento(data, slot, motivo) {
        if (motivo === null) chk(await sb.from('annullamenti').delete().eq('data', data).eq('slot', slot));
        else chk(await sb.from('annullamenti').upsert({ data, slot, motivo: motivo || null }));
      }
    };
  }

  const cfg = window.SCT_CONFIG || {};
  window.DB = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY ? onlineBackend(cfg) : demoBackend();
  window.DB_UTIL = { ymd, pad, defaultSettings, withDefaults };
})();
