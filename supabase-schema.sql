-- À coller dans Supabase : Project > SQL Editor > New query > Run

create table if not exists products (
  id text primary key,
  name text not null,
  category text not null default 'Accessoires',
  price numeric not null default 0,
  active boolean not null default true,
  img text
);

create table if not exists orders (
  id text primary key,
  code text,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  notes text,
  items jsonb not null default '[]',
  total numeric not null default 0,
  status text not null default 'attente',
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id int primary key default 1,
  shop_name text not null default 'Relais Cycles',
  pickup_name text not null default 'Mon point relais',
  pickup_address text not null default '',
  payment_link_template text not null default 'https://paypal.me/votre-compte/{amount}',
  admin_pin text not null default '1234'
);

-- Autorise l'application (clé publique "anon") à lire/écrire.
-- Comme il n'y a pas de compte client (juste un PIN gérant côté interface),
-- ces règles restent ouvertes : c'est suffisant pour démarrer, à durcir plus tard si besoin.

alter table products enable row level security;
alter table orders enable row level security;
alter table settings enable row level security;

create policy "public select products" on products for select using (true);
create policy "public insert products" on products for insert with check (true);
create policy "public update products" on products for update using (true);
create policy "public delete products" on products for delete using (true);

create policy "public select orders" on orders for select using (true);
create policy "public insert orders" on orders for insert with check (true);
create policy "public update orders" on orders for update using (true);

create policy "public select settings" on settings for select using (true);
create policy "public insert settings" on settings for insert with check (true);
create policy "public update settings" on settings for update using (true);
