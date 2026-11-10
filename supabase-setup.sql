-- =====================================================================
-- S.C.T. TrainingLab · configurazione del database su Supabase
-- Incolla tutto nel SQL Editor del progetto Supabase e premi "Run".
-- Si può rieseguire senza danni (non cancella i dati).
--
-- Ruoli:
--   amministratore = il PRIMO account registrato (poi se ne aggiungono altri
--                    con l'istruzione in fondo al file). Gestisce anagrafica,
--                    certificati, iscrizioni, quote, giorni e orari.
--   iscritto       = chi si registra con la STESSA email inserita
--                    dall'amministratore nella sua scheda. Vede solo i propri
--                    dati e segnala le proprie assenze.
-- =====================================================================

-- 1. Amministratori -------------------------------------------------------
create table if not exists public.amministratori (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email   text,
  creato  timestamptz not null default now()
);

create or replace function public.e_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from amministratori where user_id = auth.uid());
$$;

create or replace function public.mia_email() returns text
language sql stable set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- il primo account registrato diventa amministratore
create or replace function public.nuovo_utente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from amministratori) then
    insert into amministratori (user_id, email) values (new.id, new.email) on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists sct_nuovo_utente on auth.users;
create trigger sct_nuovo_utente after insert on auth.users
  for each row execute function public.nuovo_utente();

alter table public.amministratori enable row level security;
drop policy if exists "admin leggi" on public.amministratori;
create policy "admin leggi" on public.amministratori for select to authenticated
  using (user_id = auth.uid() or e_admin());

-- 2. Impostazioni (giorni, orari, stagione, quota) --------------------------
create table if not exists public.impostazioni (
  id         int primary key default 1 check (id = 1),
  dati       jsonb not null default '{}'::jsonb,
  aggiornato timestamptz not null default now()
);
insert into public.impostazioni (id, dati) values (1, '{}'::jsonb) on conflict (id) do nothing;

alter table public.impostazioni enable row level security;
drop policy if exists "imp leggi" on public.impostazioni;
drop policy if exists "imp modifica" on public.impostazioni;
create policy "imp leggi" on public.impostazioni for select to authenticated using (true);
create policy "imp modifica" on public.impostazioni for update to authenticated
  using (e_admin()) with check (e_admin());

-- 3. Anagrafica iscritti ----------------------------------------------------
create table if not exists public.iscritti (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null check (char_length(nome) between 1 and 60),
  cognome              text not null default '' check (char_length(cognome) <= 60),
  telefono             text check (telefono is null or char_length(telefono) <= 30),
  email                text check (email is null or char_length(email) <= 120),
  data_iscrizione      date,
  scadenza_iscrizione  date,
  certificato_scadenza date,
  certificato_tipo     text check (certificato_tipo is null or certificato_tipo in ('non_agonistico','agonistico')),
  lezioni              text[] not null default '{}',   -- id delle lezioni settimanali frequentate
  attivo               boolean not null default true,
  note                 text check (note is null or char_length(note) <= 1000),
  creato               timestamptz not null default now()
);
create index if not exists iscritti_email_idx on public.iscritti (lower(email));

create or replace function public.mio_iscritto(iid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from iscritti
                 where id = iid and email is not null and email <> '' and lower(email) = mia_email());
$$;

alter table public.iscritti enable row level security;
drop policy if exists "isc leggi" on public.iscritti;
drop policy if exists "isc crea" on public.iscritti;
drop policy if exists "isc modifica" on public.iscritti;
drop policy if exists "isc elimina" on public.iscritti;
create policy "isc leggi" on public.iscritti for select to authenticated
  using (e_admin() or (email is not null and lower(email) = mia_email()));
create policy "isc crea" on public.iscritti for insert to authenticated with check (e_admin());
create policy "isc modifica" on public.iscritti for update to authenticated using (e_admin()) with check (e_admin());
create policy "isc elimina" on public.iscritti for delete to authenticated using (e_admin());

-- 4. Quote mensili ------------------------------------------------------------
create table if not exists public.pagamenti (
  iscritto_id uuid not null references public.iscritti(id) on delete cascade,
  mese        text not null check (mese ~ '^[0-9]{4}-[0-9]{2}$'),   -- es. 2026-11
  importo     numeric(8,2),
  pagato_il   date not null default current_date,
  primary key (iscritto_id, mese)
);

alter table public.pagamenti enable row level security;
drop policy if exists "pag leggi" on public.pagamenti;
drop policy if exists "pag crea" on public.pagamenti;
drop policy if exists "pag modifica" on public.pagamenti;
drop policy if exists "pag elimina" on public.pagamenti;
create policy "pag leggi" on public.pagamenti for select to authenticated
  using (e_admin() or mio_iscritto(iscritto_id));
create policy "pag crea" on public.pagamenti for insert to authenticated with check (e_admin());
create policy "pag modifica" on public.pagamenti for update to authenticated using (e_admin()) with check (e_admin());
create policy "pag elimina" on public.pagamenti for delete to authenticated using (e_admin());

-- 5. Assenze (tutti risultano presenti salvo segnalazione) ----------------------
create table if not exists public.assenze (
  iscritto_id uuid not null references public.iscritti(id) on delete cascade,
  data        date not null,
  slot        text not null,          -- id della lezione settimanale
  nota        text check (nota is null or char_length(nota) <= 200),
  creato      timestamptz not null default now(),
  primary key (iscritto_id, data, slot)
);
create index if not exists assenze_data_idx on public.assenze (data);

alter table public.assenze enable row level security;
drop policy if exists "ass leggi" on public.assenze;
drop policy if exists "ass crea" on public.assenze;
drop policy if exists "ass modifica" on public.assenze;
drop policy if exists "ass elimina" on public.assenze;
create policy "ass leggi" on public.assenze for select to authenticated
  using (e_admin() or mio_iscritto(iscritto_id));
-- l'iscritto segnala/annulla solo le proprie assenze, da oggi in avanti
create policy "ass crea" on public.assenze for insert to authenticated
  with check (e_admin() or (mio_iscritto(iscritto_id) and data >= current_date));
create policy "ass modifica" on public.assenze for update to authenticated
  using (e_admin() or (mio_iscritto(iscritto_id) and data >= current_date))
  with check (e_admin() or (mio_iscritto(iscritto_id) and data >= current_date));
create policy "ass elimina" on public.assenze for delete to authenticated
  using (e_admin() or (mio_iscritto(iscritto_id) and data >= current_date));

-- 6. Lezioni annullate (festività, maltempo…) ----------------------------------
create table if not exists public.annullamenti (
  data   date not null,
  slot   text not null,
  motivo text check (motivo is null or char_length(motivo) <= 200),
  primary key (data, slot)
);

alter table public.annullamenti enable row level security;
drop policy if exists "ann leggi" on public.annullamenti;
drop policy if exists "ann crea" on public.annullamenti;
drop policy if exists "ann modifica" on public.annullamenti;
drop policy if exists "ann elimina" on public.annullamenti;
create policy "ann leggi" on public.annullamenti for select to authenticated using (true);
create policy "ann crea" on public.annullamenti for insert to authenticated with check (e_admin());
create policy "ann modifica" on public.annullamenti for update to authenticated using (e_admin()) with check (e_admin());
create policy "ann elimina" on public.annullamenti for delete to authenticated using (e_admin());

-- 7. Permessi di base -------------------------------------------------------------
grant usage on schema public to authenticated;
grant select on public.amministratori to authenticated;
grant select, update on public.impostazioni to authenticated;
grant select, insert, update, delete on public.iscritti, public.pagamenti,
  public.assenze, public.annullamenti to authenticated;
grant execute on function public.e_admin(), public.mia_email(), public.mio_iscritto(uuid) to authenticated;
revoke execute on function public.e_admin(), public.mio_iscritto(uuid), public.nuovo_utente(), public.mia_email() from public, anon;
revoke execute on function public.nuovo_utente() from authenticated;

-- =====================================================================
-- Aggiungere un altro amministratore (dopo che si è registrato nell'app):
--   insert into public.amministratori (user_id, email)
--   select id, email from auth.users where lower(email) = lower('mail@esempio.it');
-- =====================================================================
