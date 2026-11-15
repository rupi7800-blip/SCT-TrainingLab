/* S.C.T. TrainingLab — Allenamento del giorno
   L'amministratore carica l'allenamento (testo incollato da Claude, JSON, Markdown,
   PDF, immagini, video, pagine HTML, CSV, link…); gli iscritti lo vedono il giorno
   della lezione e possono spuntare gli esercizi fatti (solo sul proprio telefono). */
(function () {
  'use strict';

  window.Allenamenti = function (U) {
    const { S, esc, ic, toast, run, modal, confirmBox, today, parse, fmtLong, MESI, GIORNI } = U;

    /* ------------------------------------------------------------ utilità */
    const isAdmin = () => S.sess && S.sess.role === 'admin';
    const tutti = () => (S.d && S.d.allenamenti) || [];
    function mieLezioni() { const me = S.sess && S.sess.iscritto; return me ? (me.lezioni || []) : null; }
    // allenamenti di un giorno (l'iscritto vede solo quelli delle sue lezioni)
    function del(ds) {
      const ml = isAdmin() ? null : mieLezioni();
      return tutti().filter(a => a.data === ds && (!ml || !a.slot || ml.includes(a.slot)))
        .sort((a, b) => (a.slot || '').localeCompare(b.slot || '') || (a.creato || '').localeCompare(b.creato || ''));
    }
    function slotNome(id) { const s = ((S.d && S.d.settings.slots) || []).find(x => x.id === id); return s ? s.nome + ' ' + s.inizio : ''; }
    function kb(n) { if (!n && n !== 0) return ''; return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1).replace('.', ',') + ' MB'; }
    function estensione(nome) { const m = /\.([a-z0-9]+)$/i.exec(nome || ''); return m ? m[1].toLowerCase() : ''; }
    function genere(a) {
      const t = (a.tipo || '').toLowerCase(), e = estensione(a.nome);
      if (t === 'link') return 'link';
      if (t.startsWith('image/') || /^(jpe?g|png|webp|gif|svg|heic|avif)$/.test(e)) return 'img';
      if (t === 'application/pdf' || e === 'pdf') return 'pdf';
      if (t.startsWith('video/') || /^(mp4|mov|webm|m4v)$/.test(e)) return 'video';
      if (t.startsWith('audio/') || /^(mp3|m4a|wav|ogg|aac)$/.test(e)) return 'audio';
      if (t === 'text/html' || /^html?$/.test(e)) return 'html';
      if (t === 'text/csv' || e === 'csv') return 'csv';
      return 'file';
    }
    const GEN_IC = { img: '🖼️', pdf: '📄', video: '🎬', audio: '🎧', html: '🌐', csv: '📊', link: '🔗', file: '📎' };

    /* ------------------------------------------------- Markdown (sicuro) */
    function inline(t) {
      return esc(t)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (m, a, b) => '<b>' + (a || b) + '</b>')
        .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
        .replace(/(^|[\s(])_([^_\s][^_]*)_(?=[\s.,;:!?)]|$)/g, '$1<i>$2</i>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    function md(src) {
      const L = String(src || '').replace(/\r\n?/g, '\n').split('\n'), out = [];
      let i = 0;
      const isTableSep = s => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(s || '');
      const cells = s => s.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
      while (i < L.length) {
        const l = L[i];
        if (!l.trim()) { i++; continue; }
        if (/^\s*```/.test(l)) {
          const buf = []; i++;
          while (i < L.length && !/^\s*```/.test(L[i])) buf.push(L[i++]);
          i++; out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>'); continue;
        }
        let m = /^(#{1,6})\s+(.*)$/.exec(l);
        if (m) { const h = Math.min(6, m[1].length + 2); out.push('<h' + h + '>' + inline(m[2].replace(/\s*#+\s*$/, '')) + '</h' + h + '>'); i++; continue; }
        if (/^\s*(\*\s*){3,}$|^\s*(-\s*){3,}$|^\s*(_\s*){3,}$/.test(l)) { out.push('<hr>'); i++; continue; }
        if (l.includes('|') && isTableSep(L[i + 1])) {
          const head = cells(l); i += 2; const rows = [];
          while (i < L.length && L[i].includes('|') && L[i].trim()) rows.push(cells(L[i++]));
          out.push('<div class="md-tw"><table><thead><tr>' + head.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' +
            rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
          continue;
        }
        if (/^\s*>/.test(l)) {
          const buf = [];
          while (i < L.length && /^\s*>/.test(L[i])) buf.push(L[i++].replace(/^\s*>\s?/, ''));
          out.push('<blockquote>' + md(buf.join('\n')) + '</blockquote>'); continue;
        }
        if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) {
          const ord = /^\s*\d+[.)]\s+/.test(l), buf = [];
          while (i < L.length && /^\s*([-*+]|\d+[.)])\s+/.test(L[i])) {
            let t = L[i].replace(/^\s*([-*+]|\d+[.)])\s+/, ''); i++;
            while (i < L.length && L[i].trim() && /^\s{2,}\S/.test(L[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(L[i])) t += ' ' + L[i++].trim();
            const ck = /^\[( |x|X)\]\s+/.exec(t);
            buf.push('<li>' + (ck ? (ck[1] === ' ' ? '☐ ' : '☑ ') + inline(t.slice(ck[0].length)) : inline(t)) + '</li>');
          }
          out.push((ord ? '<ol>' : '<ul>') + buf.join('') + (ord ? '</ol>' : '</ul>')); continue;
        }
        const buf = [];
        while (i < L.length && L[i].trim() && !/^(#{1,6})\s|^\s*```|^\s*>|^\s*([-*+]|\d+[.)])\s+/.test(L[i]) && !(L[i].includes('|') && isTableSep(L[i + 1]))) buf.push(inline(L[i++]));
        if (!buf.length) { out.push('<p>' + inline(L[i++]) + '</p>'); continue; }
        out.push('<p>' + buf.join('<br>') + '</p>');
      }
      return out.join('');
    }

    /* --------------------------------------- JSON (formato Claude e simili) */
    const pick = (o, ...k) => { if (!o || typeof o !== 'object') return undefined; for (const x of k) if (o[x] !== undefined && o[x] !== null && o[x] !== '') return o[x]; return undefined; };
    const txt = v => v === undefined || v === null ? '' : Array.isArray(v) ? v.map(txt).filter(Boolean).join(', ') : typeof v === 'object' ? Object.values(v).map(txt).join(' ') : String(v);
    function durata(o, ...keys) {
      for (const k of keys) {
        const v = o[k]; if (v === undefined || v === null || v === '') continue;
        if (typeof v === 'number') return /sec|_s$/.test(k) ? v + '″' : /min/.test(k) ? v + ' min' : String(v);
        return String(v);
      }
      return '';
    }
    function normEsercizio(e) {
      if (typeof e === 'string') return { nome: e };
      if (!e || typeof e !== 'object') return null;
      return {
        nome: txt(pick(e, 'nome', 'name', 'esercizio', 'exercise', 'titolo', 'title', 'attivita')) || 'Esercizio',
        serie: txt(pick(e, 'serie', 'sets', 'giri', 'rounds', 'set')),
        rip: txt(pick(e, 'ripetizioni', 'reps', 'rep', 'repetitions', 'ripetute')),
        dur: durata(e, 'durata', 'duration', 'tempo', 'time', 'durata_sec', 'duration_sec', 'secondi', 'durata_min', 'minuti'),
        rec: durata(e, 'recupero', 'rest', 'pausa', 'riposo', 'recupero_sec', 'rest_sec'),
        carico: txt(pick(e, 'carico', 'peso', 'load', 'weight', 'intensita', 'intensità', 'intensity', 'ritmo')),
        note: txt(pick(e, 'note', 'notes', 'descrizione', 'description', 'dettagli', 'cues', 'esecuzione', 'consigli'))
      };
    }
    function norm(j) {
      if (!j || typeof j !== 'object') return null;
      let blocchi = Array.isArray(j) ? j : pick(j, 'blocchi', 'fasi', 'sezioni', 'parti', 'blocks', 'sections', 'phases', 'parts', 'circuiti', 'workout');
      if (blocchi && !Array.isArray(blocchi) && typeof blocchi === 'object') blocchi = pick(blocchi, 'blocchi', 'blocks', 'sections', 'fasi') || [blocchi];
      if (!Array.isArray(blocchi)) { const es = pick(j, 'esercizi', 'exercises'); blocchi = Array.isArray(es) ? [{ nome: 'Allenamento', esercizi: es }] : null; }
      if (!blocchi) return null;
      const B = blocchi.map(b => {
        if (!b || typeof b !== 'object') return null;
        const es = pick(b, 'esercizi', 'exercises', 'items', 'lista', 'attivita', 'attività', 'drills');
        return {
          nome: txt(pick(b, 'nome', 'name', 'titolo', 'title', 'fase', 'blocco')) || 'Blocco',
          dur: durata(b, 'durata_min', 'duration_min', 'durata', 'duration', 'tempo', 'minuti'),
          giri: txt(pick(b, 'giri', 'rounds', 'ripetizioni_circuito')),
          note: txt(pick(b, 'note', 'notes', 'descrizione', 'description', 'obiettivo')),
          es: (Array.isArray(es) ? es : []).map(normEsercizio).filter(Boolean)
        };
      }).filter(b => b && (b.es.length || b.note));
      if (!B.length) return null;
      const att = pick(j, 'attrezzatura', 'attrezzi', 'materiale', 'equipment');
      return {
        titolo: txt(pick(j, 'titolo', 'title', 'nome', 'name')),
        obiettivo: txt(pick(j, 'obiettivo', 'obiettivi', 'goal', 'focus', 'descrizione', 'description')),
        durata: durata(j, 'durata_min', 'duration_min', 'durata_totale', 'durata', 'duration', 'tempo_totale'),
        livello: txt(pick(j, 'livello', 'level', 'difficolta', 'difficoltà', 'difficulty')),
        attrezzatura: Array.isArray(att) ? att.map(txt).filter(Boolean) : att ? String(att).split(/\s*[,;]\s*/).filter(Boolean) : [],
        blocchi: B,
        note: txt(pick(j, 'note', 'notes', 'consigli', 'tips', 'raccomandazioni'))
      };
    }
    function albero(v, d) {
      d = d || 0;
      if (d > 6) return '…';
      if (Array.isArray(v)) return '<ul class="jt">' + v.map(x => '<li>' + albero(x, d + 1) + '</li>').join('') + '</ul>';
      if (v && typeof v === 'object') return '<dl class="jt">' + Object.keys(v).map(k => '<dt>' + esc(k.replace(/_/g, ' ')) + '</dt><dd>' + albero(v[k], d + 1) + '</dd>').join('') + '</dl>';
      return esc(v === null ? '—' : String(v));
    }
    function fatti(id) { try { return JSON.parse(localStorage.getItem('sct-fatto-' + id)) || []; } catch (e) { return []; } }
    function strutturato(a) {
      const n = norm(a.contenuto);
      if (!n) return '<section class="card pad wk-json">' + albero(a.contenuto) + '</section>';
      const done = fatti(a.id);
      const meta = [n.durata && '⏱ ' + n.durata + (/^\d+$/.test(n.durata) ? ' min' : ''), n.livello && '📶 ' + n.livello].filter(Boolean);
      return `${n.obiettivo || meta.length ? `<section class="wk-head">${n.obiettivo ? `<p class="wk-goal">${esc(n.obiettivo)}</p>` : ''}${meta.length ? `<div class="wk-meta">${meta.map(m => `<span>${esc(m)}</span>`).join('')}</div>` : ''}</section>` : ''}
        ${n.attrezzatura.length ? `<div class="wk-att"><small>Attrezzatura</small>${n.attrezzatura.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
        ${n.blocchi.map((b, bi) => `<section class="card wk-b">
          <div class="wk-bh"><span class="wk-n">${bi + 1}</span><b>${esc(b.nome)}</b>${b.dur || b.giri ? `<small>${esc([b.giri && b.giri + (/^\d+$/.test(b.giri) ? ' giri' : ''), b.dur && b.dur + (/^\d+$/.test(b.dur) ? ' min' : '')].filter(Boolean).join(' · '))}</small>` : ''}</div>
          ${b.note ? `<p class="wk-bn">${esc(b.note)}</p>` : ''}
          ${b.es.length ? `<ol class="wk-es">${b.es.map((e, ei) => {
            const k = bi + '-' + ei, dose = [e.serie && e.rip ? e.serie + ' × ' + e.rip : e.serie ? e.serie + (/^\d+$/.test(e.serie) ? ' serie' : '') : e.rip, e.dur, e.carico].filter(Boolean).join(' · ');
            return `<li class="${done.includes(k) ? 'done' : ''}"><button type="button" class="wk-e" data-fatto="${esc(a.id)}|${k}" aria-pressed="${done.includes(k)}">
              <span class="wk-ck" aria-hidden="true"></span><span class="wk-et"><b>${esc(e.nome)}</b>${dose ? `<span class="wk-dose">${esc(dose)}</span>` : ''}${e.rec ? `<small>Recupero ${esc(e.rec)}</small>` : ''}${e.note ? `<small class="wk-en">${esc(e.note)}</small>` : ''}</span></button></li>`;
          }).join('')}</ol>` : ''}
        </section>`).join('')}
        ${n.note ? `<section class="card pad wk-note"><b>Note</b><p>${esc(n.note)}</p></section>` : ''}
        <p class="hint">Tocca un esercizio per spuntarlo: le spunte restano solo sul tuo telefono.</p>`;
    }

    /* ------------------------------------------------- importazione testo */
    // capisce se il testo incollato è JSON (anche dentro ```json … ```) o Markdown/testo
    function interpreta(raw) {
      const t = String(raw || '').trim();
      if (!t) return null;
      const cand = [];
      const fence = /```(?:json)?\s*\n([\s\S]*?)```/i.exec(t); if (fence) cand.push(fence[1]);
      cand.push(t);
      const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) cand.push(t.slice(a, b + 1));
      for (const c of cand) {
        try {
          const j = JSON.parse(c);
          if (j && typeof j === 'object') { const n = norm(j); return { contenuto: j, titolo: (n && n.titolo) || txt(pick(j, 'titolo', 'title')) }; }
        } catch (e) { /* non è JSON */ }
      }
      const h = /^#{1,3}\s+(.+)$/m.exec(t);
      return { testo: t, titolo: h ? h[1].replace(/[*_`#]/g, '').trim() : '' };
    }
    const PROMPT = `Prepara un allenamento per il Training Lab dello Sci Club Taino (preparazione atletica per lo sci).

[SCRIVI QUI cosa ti serve: durata, obiettivo (es. forza gambe, equilibrio, resistenza), età e livello del gruppo, attrezzatura disponibile, palestra o all'aperto]

Rispondi SOLO con un blocco JSON valido, in italiano, con questa struttura:
{
  "titolo": "…",
  "obiettivo": "…",
  "durata_min": 60,
  "livello": "…",
  "attrezzatura": ["…"],
  "blocchi": [
    { "nome": "Riscaldamento", "durata_min": 10, "note": "…",
      "esercizi": [
        { "nome": "…", "serie": 2, "ripetizioni": "12", "durata": "30″", "recupero": "30″", "carico": "…", "note": "come si esegue" }
      ] }
  ],
  "note": "consigli finali, defaticamento, sicurezza"
}
Usa solo i campi che servono (es. "durata" oppure "ripetizioni").`;
    async function copia(testo) {
      try { await navigator.clipboard.writeText(testo); toast('Istruzioni copiate: incollale in Claude'); }
      catch (e) {
        modal('<h3>Istruzioni per Claude</h3><p>Copia il testo qui sotto e incollalo in Claude.</p><textarea class="inp" rows="12" readonly>' + esc(testo) + '</textarea><div class="m-row"><button class="btn primary" data-close>Fatto</button></div>',
          w => { const ta = w.querySelector('textarea'); ta.focus(); ta.select(); });
      }
    }

    /* ------------------------------------------------------- allegati */
    async function urlDi(a) { try { return await DB.fileUrl(a); } catch (e) { return ''; } }
    function csvTabella(t) {
      const righe = String(t).replace(/\r/g, '').split('\n').filter(Boolean).slice(0, 200);
      const sep = (righe[0] || '').split(';').length > (righe[0] || '').split(',').length ? ';' : ',';
      const split = r => { const out = []; let cur = '', q = false; for (const ch of r) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
      const R = righe.map(split);
      return '<div class="md-tw"><table><thead><tr>' + (R[0] || []).map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
        R.slice(1).map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    }
    function allegatoHtml(a, k, url) {
      const g = genere(a), nome = esc(a.nome || 'Allegato');
      if (g === 'img') return url ? `<figure class="wk-img"><a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${nome}" loading="lazy"></a><figcaption>${nome}</figcaption></figure>` : '';
      if (g === 'video') return url ? `<figure class="wk-vid"><video src="${esc(url)}" controls playsinline preload="metadata"></video><figcaption>${nome}</figcaption></figure>` : '';
      if (g === 'audio') return url ? `<figure class="wk-aud"><figcaption>🎧 ${nome}</figcaption><audio src="${esc(url)}" controls preload="none"></audio></figure>` : '';
      if (g === 'html' && a.testo) return `<figure class="wk-html"><div class="wk-fh"><span>🌐 ${nome}</span><button type="button" class="btn sm ghost" data-fullhtml="${k}">Schermo intero</button></div>
        <iframe sandbox="allow-scripts allow-popups allow-forms" referrerpolicy="no-referrer" loading="lazy" title="${nome}" srcdoc="${esc(a.testo)}"></iframe></figure>`;
      if (g === 'csv' && a.testo) return `<section class="card pad"><b class="wk-ft">📊 ${nome}</b>${csvTabella(a.testo)}</section>`;
      return `<div class="card wk-file"><span class="wk-fi">${GEN_IC[g]}</span><span class="wk-fn"><b>${nome}</b><small>${g === 'link' ? esc(a.url) : g === 'pdf' ? 'PDF' + (a.size ? ' · ' + kb(a.size) : '') : kb(a.size)}</small></span>${g === 'link' ? `<a class="btn sm primary" href="${esc(a.url)}" target="_blank" rel="noopener">Apri</a>` : url ? `<a class="btn sm primary" href="${esc(url)}" target="_blank" rel="noopener">${g === 'pdf' ? 'Apri PDF' : 'Apri'}</a>` : '<small class="muted">non disponibile</small>'}</div>`;
    }
    function htmlSchermoIntero(a) {
      const w = document.createElement('div'); w.className = 'sheet';
      w.innerHTML = `<div class="sheet-top"><button class="icbtn" data-x aria-label="Chiudi">${ic('back')}</button><b>${esc(a.nome || 'Pagina')}</b><span style="width:38px"></span></div>
        <iframe class="wk-full" sandbox="allow-scripts allow-popups allow-forms" referrerpolicy="no-referrer" title="${esc(a.nome || '')}" srcdoc="${esc(a.testo)}"></iframe>`;
      document.body.appendChild(w); document.body.classList.add('noscroll');
      w.querySelector('[data-x]').onclick = () => { w.remove(); if (!document.querySelector('.sheet')) document.body.classList.remove('noscroll'); };
    }

    /* -------------------------------------------------------- schede */
    function intestazione(a) {
      const d = parse(a.data);
      return `<div class="pres-h"><div class="lc-date wk"><b>${d.getDate()}</b><small>${MESI[d.getMonth()].slice(0, 3)}</small></div>
        <div><h2>${esc(a.titolo)}</h2><p class="muted">${esc(fmtLong(a.data))}${a.slot ? ' · ' + esc(slotNome(a.slot)) : ''}</p>
        ${isAdmin() && a.visibile === false ? '<span class="tag gray">🔒 Nascosto agli iscritti</span>' : ''}</div></div>`;
    }
    async function apri(id) {
      const a = tutti().find(x => x.id === id); if (!a) return;
      const w = document.createElement('div'); w.className = 'sheet';
      document.body.appendChild(w); document.body.classList.add('noscroll');
      const close = () => { w.remove(); if (!document.querySelector('.sheet')) document.body.classList.remove('noscroll'); };
      const corpo = () => `${a.contenuto ? strutturato(a) : ''}${a.testo ? `<section class="card pad md">${md(a.testo)}</section>` : ''}`;
      w.innerHTML = `<div class="sheet-top"><button class="icbtn" data-x aria-label="Chiudi">${ic('back')}</button><b>Allenamento</b>
          ${isAdmin() ? `<button class="icbtn" data-edit aria-label="Modifica">${ic('edit')}</button>` : '<span style="width:38px"></span>'}</div>
        <div class="sheet-body">${intestazione(a)}<div class="wk-body">${corpo()}</div><div class="wk-atts">${(a.allegati || []).length ? '<p class="muted small">Caricamento allegati…</p>' : ''}</div>
          ${!a.contenuto && !a.testo && !(a.allegati || []).length ? '<p class="muted card pad">Allenamento senza contenuto.</p>' : ''}</div>
        ${isAdmin() ? `<div class="sheet-foot two-b"><button class="btn ghost" data-dup>Duplica</button><button class="btn primary" data-edit2>${ic('edit')} Modifica</button></div>` : ''}`;
      w.querySelector('[data-x]').onclick = close;
      const ed = () => { close(); editor(id); };
      w.querySelectorAll('[data-edit],[data-edit2]').forEach(b => b.onclick = ed);
      const dup = w.querySelector('[data-dup]'); if (dup) dup.onclick = () => duplica(a, close);
      const legaSpunte = () => w.querySelectorAll('[data-fatto]').forEach(b => b.onclick = () => {
        const [aid, k] = b.dataset.fatto.split('|'); let f = fatti(aid);
        f = f.includes(k) ? f.filter(x => x !== k) : f.concat(k);
        try { localStorage.setItem('sct-fatto-' + aid, JSON.stringify(f)); } catch (e) {}
        b.parentElement.classList.toggle('done', f.includes(k)); b.setAttribute('aria-pressed', f.includes(k));
      });
      legaSpunte();
      const atts = a.allegati || [];
      if (atts.length) {
        const urls = await Promise.all(atts.map(x => x.path ? urlDi(x) : Promise.resolve(x.url || '')));
        const box = w.querySelector('.wk-atts'); if (!box) return;
        box.innerHTML = '<h3 class="sec-t">Allegati · ' + atts.length + '</h3>' + atts.map((x, k) => allegatoHtml(x, k, urls[k])).join('');
        box.querySelectorAll('[data-fullhtml]').forEach(b => b.onclick = () => htmlSchermoIntero(atts[Number(b.dataset.fullhtml)]));
      }
    }
    function chiediData(titolo, testo, val) {
      return modal(`<h3>${esc(titolo)}</h3><p>${esc(testo)}</p><input class="inp" type="date" value="${esc(val)}"><div class="m-row"><button class="btn ghost" data-close>Annulla</button><button class="btn primary" data-ok>Conferma</button></div>`,
        (w, close) => { const i = w.querySelector('input'); w.querySelector('[data-ok]').onclick = () => close(i.value || null); });
    }
    function prossimaLezione(dopo) {
      let ds = U.addDays(dopo, 1);
      for (let k = 0; k < 60; k++) { if (U.slotsDel(ds).length) return ds; ds = U.addDays(ds, 1); }
      return U.addDays(dopo, 7);
    }
    async function duplica(a, chiudi) {
      const ds = await chiediData('Duplica allenamento', 'Copia "' + a.titolo + '" in un altro giorno (gli allegati vengono condivisi).', prossimaLezione(a.data > today() ? a.data : today()));
      if (!ds) return;
      const c = Object.assign({}, a, { id: undefined, data: ds, creato: undefined });
      const r = await run(() => DB.saveAllenamento(c), 'Allenamento copiato al ' + U.fmt(ds)).catch(() => null);
      if (!r) return;
      if (chiudi) chiudi();
      S.day = ds; await U.ricarica();
    }
    // file usati da un solo allenamento (gli altri non vanno cancellati: sono condivisi da un duplicato)
    function soloMiei(paths, id) {
      const altri = new Set(); tutti().filter(x => x.id !== id).forEach(x => (x.allegati || []).forEach(y => y.path && altri.add(y.path)));
      return paths.filter(p => p && !altri.has(p));
    }

    /* ------------------------------------------------------ editor */
    async function comprimi(file) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 700 * 1024) return file;
      try {
        const url = URL.createObjectURL(file);
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
        const max = 1800, f = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * f); c.height = Math.round(img.naturalHeight * f);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
        if (!blob || blob.size >= file.size) return file;
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
      } catch (e) { return file; }
    }
    const leggiTesto = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result || '')); r.onerror = () => rej(new Error('File non leggibile')); r.readAsText(f); });
    const ACCEPT = '.pdf,.json,.md,.markdown,.txt,.html,.htm,.csv,image/*,video/*,audio/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt';

    function editor(id, preset) {
      const orig = id ? tutti().find(x => x.id === id) : null;
      const o = orig ? JSON.parse(JSON.stringify(orig)) : Object.assign({ data: S.day || today(), slot: '', titolo: '', testo: '', contenuto: null, allegati: [], visibile: true }, preset || {});
      const nuovi = [];   // file caricati in questa modifica (da cancellare se si annulla)
      const tolti = [];   // file tolti (da cancellare quando si salva)
      let salvato = false, inCorso = 0;
      const w = document.createElement('div'); w.className = 'sheet';
      document.body.appendChild(w); document.body.classList.add('noscroll');
      const close = async () => {
        if (!salvato && nuovi.length) await DB.removeFiles(soloMiei(nuovi, id));
        w.remove(); if (!document.querySelector('.sheet')) document.body.classList.remove('noscroll');
      };
      const sync = () => {
        const f = w.querySelector('#f-wk'); if (!f) return;
        o.data = f.data.value; o.slot = f.slot.value; o.titolo = f.titolo.value.trim(); o.testo = f.testo.value;
      };
      const importa = (r, fonte) => {
        if (!r) return;
        if (r.contenuto) {
          if (o.contenuto && !norm(r.contenuto) && norm(o.contenuto)) toast('JSON non riconosciuto come allenamento: verrà mostrato così com\'è');
          o.contenuto = r.contenuto;
        } else if (r.testo) o.testo = (o.testo ? o.testo.trim() + '\n\n' : '') + r.testo;
        if (!o.titolo && r.titolo) o.titolo = r.titolo.slice(0, 120);
        toast((fonte || 'Contenuto') + ' importato');
      };
      const draw = () => {
        const slots = S.d.settings.slots;
        const n = o.contenuto ? norm(o.contenuto) : null;
        w.innerHTML = `<div class="sheet-top"><button class="icbtn" data-x aria-label="Chiudi">${ic('back')}</button><b>${id ? 'Modifica allenamento' : 'Nuovo allenamento'}</b>
            ${id ? `<button class="icbtn" data-del aria-label="Elimina">${ic('trash')}</button>` : '<span style="width:38px"></span>'}</div>
          <div class="sheet-body"><form class="form" id="f-wk" onsubmit="return false">
            <div class="two"><label>Giorno *<input class="inp" type="date" name="data" required value="${esc(o.data)}"></label>
            <label>Lezione<select class="inp" name="slot"><option value="">Tutte le lezioni</option>${slots.map(s => `<option value="${esc(s.id)}"${o.slot === s.id ? ' selected' : ''}>${esc(s.nome + ' ' + s.inizio)}</option>`).join('')}</select></label></div>
            <label>Titolo *<input class="inp" name="titolo" maxlength="120" value="${esc(o.titolo)}" placeholder="es. Forza gambe e propriocezione"></label>

            <h3 class="sec-t">Contenuto</h3>
            <div class="wk-imp">
              <button type="button" class="imp-b" data-file>${ic('clip')}<b>Carica file</b><small>PDF, foto, video, JSON, MD, HTML…</small></button>
              <button type="button" class="imp-b" data-paste>${ic('paste')}<b>Incolla da Claude</b><small>testo o JSON</small></button>
              <button type="button" class="imp-b" data-link>${ic('link')}<b>Link</b><small>video, sito, chat</small></button>
            </div>
            <input type="file" id="wk-file" accept="${ACCEPT}" multiple hidden>
            <button type="button" class="link" data-prompt>✨ Copia le istruzioni da dare a Claude</button>
            ${inCorso ? `<p class="wk-up">⏳ Caricamento di ${inCorso} file in corso…</p>` : ''}

            ${o.contenuto ? `<div class="wk-prev"><div><b>${n ? '🏋️ Scheda allenamento' : '🧾 Dati JSON'}</b><small>${n ? n.blocchi.length + (n.blocchi.length === 1 ? ' blocco · ' : ' blocchi · ') + n.blocchi.reduce((t, b) => t + b.es.length, 0) + ' esercizi' : 'mostrati così come sono'}</small></div>
              <button type="button" class="btn sm ghost" data-viewjson>Anteprima</button><button type="button" class="icbtn" data-rmjson aria-label="Rimuovi">${ic('trash')}</button></div>` : ''}

            ${(o.allegati || []).length ? `<ul class="wk-al">${o.allegati.map((a, k) => `<li><span class="wk-fi">${GEN_IC[genere(a)]}</span><span class="wk-fn"><b>${esc(a.nome || a.url || 'Allegato')}</b><small>${genere(a) === 'link' ? esc(a.url) : esc(kb(a.size || (a.testo || '').length))}</small></span><button type="button" class="icbtn" data-rmatt="${k}" aria-label="Togli">${ic('trash')}</button></li>`).join('')}</ul>` : ''}

            <label>Testo <small class="muted">(facoltativo · si può usare il Markdown)</small><textarea class="inp" name="testo" rows="8" maxlength="40000" placeholder="Scrivi o incolla qui l'allenamento: # titoli, - elenchi, **grassetto**">${esc(o.testo || '')}</textarea></label>
          </form>
          <div class="card freq ${o.visibile !== false ? 'on' : 'off'}">
            <div><b>${o.visibile !== false ? 'Visibile agli iscritti' : 'Nascosto agli iscritti'}</b><small>${o.visibile !== false ? 'Gli iscritti lo vedono nell\'app.' : 'Lo vedi solo tu: utile per prepararlo in anticipo.'}</small></div>
            <button type="button" class="switch${o.visibile !== false ? ' on' : ''}" data-vis role="switch" aria-checked="${o.visibile !== false}" aria-label="Visibile agli iscritti"><i></i></button>
          </div></div>
          <div class="sheet-foot"><button class="btn primary big" id="b-savewk"${inCorso ? ' disabled' : ''}>${id ? 'Salva allenamento' : 'Pubblica allenamento'}</button></div>`;

        w.querySelector('[data-x]').onclick = close;
        const fi = w.querySelector('#wk-file');
        w.querySelector('[data-file]').onclick = () => fi.click();
        fi.onchange = async () => {
          sync();
          const files = Array.from(fi.files || []); fi.value = '';
          for (const f of files) {
            const e = estensione(f.name);
            let carica = false;
            try {
              if (/^(md|markdown|txt)$/.test(e) || f.type === 'text/markdown' || f.type === 'text/plain') { importa(interpreta(await leggiTesto(f)), f.name); continue; }
              if (e === 'json' || f.type === 'application/json') {
                const r = interpreta(await leggiTesto(f));
                if (!r || !r.contenuto) throw new Error(f.name + ': JSON non valido');
                importa(r, f.name); continue;
              }
              if ((/^html?$/.test(e) || e === 'csv') && f.size <= 400 * 1024) {
                o.allegati.push({ nome: f.name, tipo: e === 'csv' ? 'text/csv' : 'text/html', testo: await leggiTesto(f), size: f.size }); continue;
              }
              if (f.size > 25 * 1024 * 1024) throw new Error(f.name + ': troppo grande (massimo 25 MB)');
              carica = true; inCorso++; sync(); draw();
              const pronto = await comprimi(f);
              const a = await DB.uploadFile(pronto, o.data);
              o.allegati.push(a); if (a.path) nuovi.push(a.path);
            } catch (er) { toast(er.message || 'Caricamento non riuscito', 'err'); }
            finally { if (carica) inCorso = Math.max(0, inCorso - 1); }
          }
          sync(); draw();
        };
        w.querySelector('[data-paste]').onclick = () => { sync(); incolla(); };
        w.querySelector('[data-prompt]').onclick = () => copia(PROMPT);
        w.querySelector('[data-link]').onclick = async () => {
          sync();
          const r = await modal(`<h3>Aggiungi un link</h3><p>Un video (YouTube…), una pagina o una chat di Claude condivisa.</p>
            <input class="inp" type="url" name="u" placeholder="https://…"><input class="inp" name="n" maxlength="80" placeholder="Nome (facoltativo)">
            <div class="m-row"><button class="btn ghost" data-close>Annulla</button><button class="btn primary" data-ok>Aggiungi</button></div>`,
            (m, chiudi) => { const u = m.querySelector('[name=u]'); setTimeout(() => u.focus(), 50); m.querySelector('[data-ok]').onclick = () => chiudi({ url: u.value.trim(), nome: m.querySelector('[name=n]').value.trim() }); });
          if (!r || !r.url) return;
          if (!/^https?:\/\/\S+$/i.test(r.url)) return toast('Il link deve iniziare con https://', 'err');
          let nome = r.nome; if (!nome) { try { nome = new URL(r.url).hostname.replace(/^www\./, ''); } catch (e) { nome = 'Link'; } }
          o.allegati.push({ tipo: 'link', url: r.url, nome }); draw();
        };
        const vj = w.querySelector('[data-viewjson]');
        if (vj) vj.onclick = () => { sync(); anteprima(); };
        const rj = w.querySelector('[data-rmjson]');
        if (rj) rj.onclick = () => { sync(); o.contenuto = null; draw(); };
        w.querySelectorAll('[data-rmatt]').forEach(b => b.onclick = () => {
          sync(); const [a] = o.allegati.splice(Number(b.dataset.rmatt), 1);
          if (a && a.path) { const k = nuovi.indexOf(a.path); if (k >= 0) { nuovi.splice(k, 1); DB.removeFiles(soloMiei([a.path], id)); } else tolti.push(a.path); }
          draw();
        });
        w.querySelector('[data-vis]').onclick = () => { sync(); o.visibile = o.visibile === false; draw(); };
        const del = w.querySelector('[data-del]');
        if (del) del.onclick = async () => {
          if (!await confirmBox('Eliminare l\'allenamento?', o.titolo + ' — verranno cancellati anche gli allegati.', 'Elimina')) return;
          const paths = soloMiei([].concat((orig.allegati || []).map(a => a.path), nuovi, tolti), id);
          const ok = await run(() => DB.deleteAllenamento(Object.assign({}, orig, { allegati: paths.map(p => ({ path: p })) })), 'Allenamento eliminato').then(() => true).catch(() => false);
          if (!ok) return;
          salvato = true; await close(); await U.ricarica();
        };
        w.querySelector('#b-savewk').onclick = async () => {
          sync();
          if (!o.data) return toast('Scegli il giorno', 'err');
          if (!o.titolo) return toast('Scrivi il titolo', 'err');
          if (!o.contenuto && !o.testo.trim() && !o.allegati.length) return toast('Aggiungi un contenuto: file, testo o link', 'err');
          const r = await run(() => DB.saveAllenamento(o), id ? 'Allenamento salvato' : 'Allenamento pubblicato').catch(() => null);
          if (!r) return;
          salvato = true;
          if (tolti.length) await DB.removeFiles(soloMiei(tolti, id));
          await close(); S.day = o.data; await U.ricarica();
        };
      };
      const incolla = () => modal(`<h3>Incolla da Claude</h3><p>Incolla la risposta di Claude: testo, Markdown o JSON. Riconosco il formato da solo.</p>
          <textarea class="inp" rows="10" placeholder="Incolla qui…"></textarea>
          <div class="m-row"><button class="btn ghost" data-clip>📋 Dagli appunti</button><span style="flex:1"></span><button class="btn ghost" data-close>Annulla</button><button class="btn primary" data-ok>Importa</button></div>`,
        (m, chiudi) => {
          const ta = m.querySelector('textarea'); setTimeout(() => ta.focus(), 50);
          const cb = m.querySelector('[data-clip]');
          if (!navigator.clipboard || !navigator.clipboard.readText) cb.remove();
          else cb.onclick = async () => { try { ta.value = await navigator.clipboard.readText(); } catch (e) { toast('Tieni premuto nel riquadro e scegli Incolla', 'err'); } };
          m.querySelector('[data-ok]').onclick = () => {
            const r = interpreta(ta.value);
            if (!r) return toast('Non c\'è niente da importare', 'err');
            chiudi(true); importa(r, r.contenuto ? 'JSON' : 'Testo'); draw();
          };
        });
      const anteprima = () => {
        const p = document.createElement('div'); p.className = 'sheet';
        p.innerHTML = `<div class="sheet-top"><button class="icbtn" data-x aria-label="Chiudi">${ic('back')}</button><b>Anteprima</b><span style="width:38px"></span></div>
          <div class="sheet-body">${intestazione(Object.assign({}, o, { titolo: o.titolo || 'Senza titolo' }))}${strutturato(Object.assign({ id: 'anteprima' }, o))}</div>`;
        document.body.appendChild(p);
        p.querySelector('[data-x]').onclick = () => p.remove();
      };
      draw();
    }

    /* ------------------------------------------------------ viste */
    function card(a, compatto) {
      const n = a.contenuto ? norm(a.contenuto) : null;
      const info = [n && n.durata && '⏱ ' + n.durata + (/^\d+$/.test(n.durata) ? ' min' : ''), n && n.blocchi.reduce((t, b) => t + b.es.length, 0) + ' esercizi',
        (a.allegati || []).length && '📎 ' + a.allegati.length, a.slot && slotNome(a.slot)].filter(Boolean);
      const d = parse(a.data);
      return `<button class="card wk-card${a.visibile === false ? ' hid' : ''}" data-wk="${esc(a.id)}">
        <span class="lc-date wk"><b>${d.getDate()}</b><small>${MESI[d.getMonth()].slice(0, 3)}</small></span>
        <span class="wk-ct"><b>${esc(a.titolo)}</b>${!compatto && n && n.obiettivo ? `<small class="wk-ob">${esc(n.obiettivo)}</small>` : ''}<small>${esc(info.join(' · ') || GIORNI[d.getDay()])}${isAdmin() && a.visibile === false ? ' · 🔒 nascosto' : ''}</small></span>
        <span class="chev">›</span></button>`;
    }
    // riquadro "Allenamento di oggi" (home iscritto e calendario)
    function oggiHtml(ds, titolo) {
      const l = del(ds);
      if (!l.length) return '';
      return `<h3 class="sec-t">🏋️ ${esc(titolo || 'Allenamento di oggi')}</h3>` + l.map(a => card(a)).join('');
    }
    function giornoHtml(ds) {
      const l = del(ds);
      if (!l.length && !isAdmin()) return '';
      if (!l.length) return U.slotsDel(ds).length || ds >= today() ? `<button class="btn ghost wide wk-add" data-wknew="${ds}">${ic('plus')} Allenamento del giorno</button>` : '';
      return `<h3 class="sec-t">🏋️ Allenamento del giorno</h3>` + l.map(a => card(a, true)).join('') +
        (isAdmin() ? `<button class="link" data-wknew="${ds}">+ Aggiungi un altro allenamento</button>` : '');
    }
    function view() {
      const t = today(), admin = isAdmin();
      const lista = tutti().filter(a => admin || !mieLezioni() || !a.slot || mieLezioni().includes(a.slot));
      const oggi = lista.filter(a => a.data === t), futuri = lista.filter(a => a.data > t).sort((a, b) => a.data.localeCompare(b.data));
      const passati = lista.filter(a => a.data < t).sort((a, b) => b.data.localeCompare(a.data));
      const off = S.d.allenamentiOff ? '<div class="alert-b yellow static">⚠️ <span><b>Funzione non ancora attiva sul database.</b> Va eseguita la parte "v1.9" di supabase-setup.sql.</span></div>' : '';
      return `${off}<section class="hello"><h2>Allenamenti</h2><p class="muted">${admin ? 'Carica l\'allenamento del giorno: file, testo o la risposta di Claude.' : 'L\'allenamento preparato dall\'allenatore per le tue lezioni.'}</p></section>
        <h3 class="sec-t">Oggi</h3>
        ${oggi.length ? oggi.map(a => card(a)).join('') : `<div class="card pad wk-empty"><p class="muted">Nessun allenamento per oggi.</p>${admin ? `<button class="btn primary" data-wknew="${t}">${ic('plus')} Carica l'allenamento di oggi</button>` : ''}</div>`}
        ${futuri.length ? '<h3 class="sec-t">In programma</h3>' + futuri.map(a => card(a)).join('') : ''}
        ${admin ? `<section class="card pad wk-claude"><b>✨ Allenamenti creati con Claude</b><p class="muted small">Copia le istruzioni, incollale in Claude con le tue richieste e poi usa "Incolla da Claude": la risposta diventa una scheda con blocchi ed esercizi da spuntare.</p><button class="btn ghost sm" data-wkprompt>Copia istruzioni per Claude</button></section>` : ''}
        ${passati.length ? `<details class="past-box"${!oggi.length && !futuri.length ? ' open' : ''}><summary>Archivio · ${passati.length}</summary>${passati.slice(0, 60).map(a => card(a, true)).join('')}</details>` : ''}
        ${admin ? `<button class="fab" data-wknew="${S.day >= t ? S.day : t}" aria-label="Nuovo allenamento">${ic('plus')}</button>` : ''}`;
    }
    function bind(root) {
      root.querySelectorAll('[data-wk]').forEach(b => b.onclick = e => { e.stopPropagation(); apri(b.dataset.wk); });
      root.querySelectorAll('[data-wknew]').forEach(b => b.onclick = e => { e.stopPropagation(); editor(null, { data: b.dataset.wknew }); });
      root.querySelectorAll('[data-wkprompt]').forEach(b => b.onclick = () => copia(PROMPT));
    }
    function haAllenamento(ds, slot) { return del(ds).some(a => !a.slot || !slot || a.slot === slot); }

    return { view, bind, oggiHtml, giornoHtml, haAllenamento, apri, editor, md, norm, interpreta };
  };
})();
