-- BLOQUEO CAPÍTULOS: tabla de progreso y reglas de seguridad
-- Ejecutar en Supabase > SQL Editor

create table if not exists public.progreso_capitulos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  capitulo smallint not null check (capitulo between 1 and 4),
  completado boolean not null default false,
  mejor_puntaje smallint not null default 0 check (mejor_puntaje between 0 and 100),
  retos_resueltos smallint not null default 0 check (retos_resueltos >= 0),
  retos_totales smallint not null default 0 check (retos_totales >= 0),
  fecha timestamptz not null default now(),
  primary key (user_id, capitulo),
  check (not completado or retos_resueltos > 0)
);

alter table public.progreso_capitulos enable row level security;

-- Capítulo abierto para el usuario actual
create or replace function public.capitulo_abierto(cap integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select cap = 1 or exists (
    select 1 from public.progreso_capitulos
    where user_id = auth.uid() and capitulo = cap - 1 and completado
  );
$$;

-- No bajar el progreso ya logrado
create or replace function public.progreso_sin_retroceso()
returns trigger
language plpgsql
as $$
begin
  new.completado := old.completado or new.completado;
  new.mejor_puntaje := greatest(old.mejor_puntaje, new.mejor_puntaje);
  new.retos_resueltos := greatest(old.retos_resueltos, new.retos_resueltos);
  new.retos_totales := greatest(old.retos_totales, new.retos_totales);
  new.fecha := now();
  return new;
end;
$$;

drop trigger if exists progreso_sin_retroceso on public.progreso_capitulos;
create trigger progreso_sin_retroceso
  before update on public.progreso_capitulos
  for each row execute function public.progreso_sin_retroceso();

-- Políticas
drop policy if exists "leer propio progreso" on public.progreso_capitulos;
create policy "leer propio progreso" on public.progreso_capitulos
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "crear progreso en capitulo abierto" on public.progreso_capitulos;
create policy "crear progreso en capitulo abierto" on public.progreso_capitulos
  for insert to authenticated
  with check (user_id = auth.uid() and public.capitulo_abierto(capitulo));

drop policy if exists "actualizar progreso en capitulo abierto" on public.progreso_capitulos;
create policy "actualizar progreso en capitulo abierto" on public.progreso_capitulos
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.capitulo_abierto(capitulo));

-- Sin política de delete: nadie borra progreso desde el navegador
revoke delete on public.progreso_capitulos from anon, authenticated;
