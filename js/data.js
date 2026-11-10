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
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* solo in memoria */ } };
    const uid = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const ok = v => Promise.resolve(JSON.parse(JSON.stringify(v)));

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
          annullamenti: mem.annullamenti
        });
      },
      async saveSettings(s) { mem.settings = s; save(); return ok(s); },
      async saveIscritto(o) {
        if (!o.id) { o.id = uid(); o.creato = new Date().toISOString(); mem.iscritti.push(o); }
        else { const i = mem.iscritti.findIndex(x => x.id === o.id); if (i >= 0) mem.iscritti[i] = Object.assign(mem.iscritti[i], o); }
        save(); return ok(o);
      },
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
          attivo: true, note: ''
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
    const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
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
        throw new Error(/row-level security|permission/i.test(m) ? 'Operazione non consentita' : m);
      }
      return r.data;
    }
    const clean = o => {
      const keys = ['nome', 'cognome', 'telefono', 'email', 'data_iscrizione', 'scadenza_iscrizione',
        'certificato_scadenza', 'certificato_tipo', 'lezioni', 'attivo', 'note'];
      const r = {}; keys.forEach(k => { r[k] = o[k] === '' || o[k] === undefined ? null : o[k]; });
      r.cognome = r.cognome || ''; r.lezioni = r.lezioni || []; r.attivo = r.attivo !== false;
      if (r.email) r.email = r.email.trim().toLowerCase();
      return r;
    };

    return {
      mode: 'online',
      async init() {
        await loadScript(CDN);
        sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
      },
      onAuth(cb) { sb.auth.onAuthStateChange((ev, s) => cb(ev, s)); },
      async signIn(email, password) { chk(await sb.auth.signInWithPassword({ email: email.trim(), password })); },
      async signUp(email, password) {
        const d = chk(await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.href.split('#')[0].split('?')[0] } }));
        return { needsConfirm: !d.session };
      },
      async resetPassword(email) {
        chk(await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.href.split('#')[0].split('?')[0] }));
      },
      async updatePassword(password) { chk(await sb.auth.updateUser({ password })); },
      async signOut() { await sb.auth.signOut(); },
      async session() {
        const { data } = await sb.auth.getSession();
        const s = data && data.session;
        if (!s) return { role: 'anon' };
        const email = (s.user.email || '').toLowerCase();
        const adm = chk(await sb.from('amministratori').select('user_id').eq('user_id', s.user.id).maybeSingle());
        if (adm) return { role: 'admin', email };
        const isc = chk(await sb.from('iscritti').select('*').limit(1));
        if (isc && isc[0]) return { role: 'iscritto', email, iscritto: isc[0] };
        return { role: 'non_abilitato', email };
      },
      async loadAll() {
        const from = new Date(); from.setDate(from.getDate() - 400);
        const [imp, isc, pag, ass, ann] = await Promise.all([
          sb.from('impostazioni').select('dati').eq('id', 1).maybeSingle(),
          sb.from('iscritti').select('*').order('cognome').order('nome'),
          sb.from('pagamenti').select('*'),
          sb.from('assenze').select('*').gte('data', ymd(from)),
          sb.from('annullamenti').select('*')
        ]);
        return {
          settings: withDefaults(chk(imp) && chk(imp).dati),
          iscritti: chk(isc) || [], pagamenti: chk(pag) || [], assenze: chk(ass) || [], annullamenti: chk(ann) || []
        };
      },
      async saveSettings(s) {
        chk(await sb.from('impostazioni').update({ dati: s, aggiornato: new Date().toISOString() }).eq('id', 1));
        return s;
      },
      async saveIscritto(o) {
        const row = clean(o);
        if (o.id) return chk(await sb.from('iscritti').update(row).eq('id', o.id).select().single());
        return chk(await sb.from('iscritti').insert(row).select().single());
      },
      async deleteIscritto(id) { chk(await sb.from('iscritti').delete().eq('id', id)); },
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
