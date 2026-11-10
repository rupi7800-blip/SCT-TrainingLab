# S.C.T. TrainingLab

Web app del **Training Lab dello Sci Club Taino** — installabile su Android e iPhone (PWA).

## Funzioni
- **Calendario** delle lezioni: tocchi un giorno e vedi i partecipanti. Tutti risultano presenti; le assenze segnalate compaiono in rosso (con il motivo) e il numero di assenti appare sul giorno.
- **Iscritti** (solo amministratore): elenco con semafori **C** certificato · **I** iscrizione · **Q** quota del mese (verde ok, giallo in scadenza, rosso scaduto/da pagare), ricerca e filtri.
- **Scheda personale**: chiamata e WhatsApp diretti, mail, dati anagrafici, lezioni frequentate (entrambe o una sola), iscrizione con data e scadenza, certificato medico, quote mensili mese per mese, storico assenze.
- **Impostazioni** (amministratore): giorni e orari delle lezioni, luogo, periodo della stagione, quota mensile, giorni di preavviso per il giallo. Le singole lezioni si annullano dal calendario.
- **Iscritti**: vedono le proprie prossime lezioni, segnalano o ritirano un'assenza, controllano certificato, iscrizione e quota.
- **Sistema di aggiornamento** come AgendApp: tasto "Aggiorna" + notifica quando `version.json` ha una versione nuova.

## Prova subito
Senza configurare nulla l'app parte in **modalità prova** (dati solo sul dispositivo). In Impostazioni → "Carica iscritti di esempio"; dalla barra in alto si passa dalla vista amministratore a quella di un iscritto.

## Messa online (dati condivisi)
1. Crea un progetto gratuito su supabase.com.
2. SQL Editor → incolla `supabase-setup.sql` → Run.
3. Authentication → Sign In / Providers → Email: attivo. (Facoltativo: disattiva "Confirm email" per evitare la mail di conferma.)
4. Authentication → URL Configuration → Site URL = indirizzo GitHub Pages dell'app.
5. Project Settings → API: copia Project URL e chiave `anon public` in `js/config.js`.
6. **Registrati per primo dall'app: il primo account diventa amministratore.**
7. Per ogni iscritto inserisci la sua email nella scheda: l'iscritto si registra con quella email e vede solo i propri dati.

## Pubblicare un aggiornamento
Ad ogni modifica aumenta il numero di versione in **tre punti**: `version.json`, `window.APP_VERSION` e `data-version` in `index.html`.
