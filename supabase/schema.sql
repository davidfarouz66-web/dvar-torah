-- Activer les extensions
create extension if not exists "uuid-ossp";

-- Table organisations
create table organisations (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  nom_feuillet text not null default 'Feuillet Communautaire',
  logo_url text,
  couleur_principale text not null default '#2e6da4',
  couleur_secondaire text not null default '#c9a84c',
  couleur_fond text not null default '#fffdf8',
  signataire_defaut text not null default '',
  numero_depart integer not null default 1,
  created_at timestamptz default now()
);

-- Table utilisateurs (extension de auth.users)
create table utilisateurs (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nom text not null default '',
  organisation_id uuid references organisations(id) on delete cascade,
  role text not null default 'redacteur' check (role in ('super_admin', 'admin', 'redacteur')),
  created_at timestamptz default now()
);

-- Table feuillets
create table feuillets (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  numero integer not null,
  paracha_fr text not null default '',
  paracha_he text not null default '',
  date_shabbat date,
  heure_entree text not null default '',
  heure_sortie text not null default '',
  roch_hodech jsonb not null default '{"actif": false, "nom_mois": "", "jours": "", "nolad": ""}',
  rubriques_p1 jsonb not null default '[]',
  dvar_torah jsonb not null default '{"verset_hebreu": "", "traduction": "", "developpement": "", "signataire": ""}',
  dedicace jsonb not null default '{"actif": false, "texte": "", "placement": "page1"}',
  encadres_p4 jsonb not null default '[]',
  statut text not null default 'brouillon' check (statut in ('brouillon', 'publie')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index
create index feuillets_organisation_id_idx on feuillets(organisation_id);
create index feuillets_date_shabbat_idx on feuillets(date_shabbat desc);

-- RLS
alter table organisations enable row level security;
alter table utilisateurs enable row level security;
alter table feuillets enable row level security;

-- Politiques organisations
create policy "Utilisateurs voient leur organisation" on organisations
  for select using (
    id in (select organisation_id from utilisateurs where id = auth.uid())
    or exists (select 1 from utilisateurs where id = auth.uid() and role = 'super_admin')
  );

create policy "Admins modifient leur organisation" on organisations
  for update using (
    id in (select organisation_id from utilisateurs where id = auth.uid() and role in ('admin', 'super_admin'))
  );

create policy "Super admin crée organisations" on organisations
  for insert with check (
    exists (select 1 from utilisateurs where id = auth.uid() and role = 'super_admin')
  );

-- Politiques utilisateurs
create policy "Utilisateurs voient leur organisation membres" on utilisateurs
  for select using (
    organisation_id in (select organisation_id from utilisateurs where id = auth.uid())
    or exists (select 1 from utilisateurs where id = auth.uid() and role = 'super_admin')
  );

create policy "Utilisateur voit son propre profil" on utilisateurs
  for select using (id = auth.uid());

create policy "Admins gèrent les membres" on utilisateurs
  for all using (
    exists (select 1 from utilisateurs where id = auth.uid() and role in ('admin', 'super_admin'))
  );

create policy "Inscription initiale" on utilisateurs
  for insert with check (id = auth.uid());

-- Politiques feuillets
create policy "Membres voient les feuillets de leur org" on feuillets
  for select using (
    organisation_id in (select organisation_id from utilisateurs where id = auth.uid())
  );

create policy "Membres créent et modifient les feuillets" on feuillets
  for insert with check (
    organisation_id in (select organisation_id from utilisateurs where id = auth.uid())
  );

create policy "Membres modifient les feuillets" on feuillets
  for update using (
    organisation_id in (select organisation_id from utilisateurs where id = auth.uid())
  );

create policy "Admins suppriment les feuillets" on feuillets
  for delete using (
    exists (
      select 1 from utilisateurs
      where id = auth.uid()
      and role in ('admin', 'super_admin')
      and organisation_id = feuillets.organisation_id
    )
  );

-- Fonction updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger feuillets_updated_at
  before update on feuillets
  for each row execute function update_updated_at();

-- Stockage logos
insert into storage.buckets (id, name, public) values ('logos', 'logos', true);

create policy "Logos publics" on storage.objects
  for select using (bucket_id = 'logos');

create policy "Admins uploadent logos" on storage.objects
  for insert with check (
    bucket_id = 'logos' and
    exists (
      select 1 from utilisateurs
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );

create policy "Admins suppriment logos" on storage.objects
  for delete using (
    bucket_id = 'logos' and
    exists (
      select 1 from utilisateurs
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );
