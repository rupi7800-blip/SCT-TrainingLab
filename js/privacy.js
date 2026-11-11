/* S.C.T. TrainingLab — informativa privacy (art. 13 Regolamento UE 2016/679)
   Se cambi il testo in modo sostanziale aumenta VERSIONE: a tutti verrà
   chiesto di accettare di nuovo. Completa i dati del titolare qui sotto. */
window.PRIVACY = {
  VERSIONE: '1.1',
  TITOLARE: 'Sci Club Taino',                 // es. "Sci Club Taino A.S.D., via …, 21020 Taino (VA)"
  CONTATTO: 'la segreteria dello Sci Club Taino', // es. email del club
  testo() {
    const t = this.TITOLARE, c = this.CONTATTO;
    return `
      <h4>1. Titolare del trattamento</h4>
      <p>${t}. Per qualsiasi richiesta sulla privacy puoi rivolgerti a: ${c}.</p>
      <h4>2. Quali dati trattiamo</h4>
      <p>Nome, cognome, eventuale soprannome, data di nascita, email, numero di telefono; data di iscrizione e scadenza; pagamento delle quote mensili;
      lezioni frequentate e assenze segnalate; eventi a cui partecipi; tipo e data di scadenza del certificato medico sportivo
      (l'app <b>non</b> conserva il certificato né diagnosi o altre informazioni sanitarie).</p>
      <h4>3. Perché li trattiamo e su quale base</h4>
      <p>a) Gestire l'iscrizione al Training Lab, le lezioni, le presenze e le quote — esecuzione del rapporto associativo (art. 6.1.b GDPR).<br>
      b) Verificare la validità del certificato medico richiesto per l'attività sportiva — obbligo di legge (art. 6.1.c e art. 9.2.b GDPR, normativa sulla tutela sanitaria delle attività sportive).<br>
      c) Contattarti per telefono, WhatsApp o email per comunicazioni organizzative — legittimo interesse dell'associazione (art. 6.1.f GDPR).</p>
      <p>Fornire i dati è necessario per partecipare: senza non è possibile gestire l'iscrizione.</p>
      <h4>4. Chi può vederli</h4>
      <p>Tutti i dati sono visibili solo agli amministratori del Training Lab. Ogni iscritto vede i propri dati e, per le lezioni e gli eventi, l'elenco di chi sarà presente, assente o partecipa indicato con il soprannome, se presente, oppure con nome e iniziale del cognome (es. "Giulia B."), senza il motivo dell'assenza. I dati non vengono diffusi né venduti.
      Sono conservati sul servizio cloud Supabase (server nell'Unione Europea, Francoforte), che agisce come responsabile del trattamento.</p>
      <h4>5. Per quanto tempo</h4>
      <p>Per la durata dell'iscrizione e, in seguito, per il tempo richiesto dagli obblighi di legge e amministrativi dell'associazione; poi vengono cancellati.</p>
      <h4>6. I tuoi diritti</h4>
      <p>Puoi chiedere in ogni momento accesso, rettifica, cancellazione, limitazione, portabilità dei dati e opporti al trattamento (artt. 15–22 GDPR),
      scrivendo a ${c}. Puoi anche presentare reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).</p>
      <p class="hint">Versione informativa ${this.VERSIONE}</p>`;
  }
};
