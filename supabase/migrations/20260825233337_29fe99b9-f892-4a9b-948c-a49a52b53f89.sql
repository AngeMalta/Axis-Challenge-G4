
CREATE TYPE public.app_role AS ENUM ('merchant','driver','admin');
CREATE TYPE public.charger_status AS ENUM ('available','occupied','offline','maintenance');
CREATE TYPE public.session_status AS ENUM ('active','completed','cancelled');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Novo usuário',
  avatar_url text,
  phone text,
  bio text,
  company_name text,
  theme text NOT NULL DEFAULT 'dark',
  account_type text NOT NULL DEFAULT 'driver',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.chargers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  model text NOT NULL DEFAULT 'HCA G2',
  description text,
  address text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  photos text[] NOT NULL DEFAULT '{}',
  price_per_kwh numeric(10,2) NOT NULL DEFAULT 2.50,
  price_per_minute numeric(10,2) NOT NULL DEFAULT 0.00,
  power_kw numeric(10,2) NOT NULL DEFAULT 22,
  connector_type text NOT NULL DEFAULT 'Type 2',
  status public.charger_status NOT NULL DEFAULT 'available',
  opening_hours text DEFAULT '24h',
  amenities text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chargers TO authenticated;
GRANT SELECT ON public.chargers TO anon;
GRANT ALL ON public.chargers TO service_role;
ALTER TABLE public.chargers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chargers public read" ON public.chargers FOR SELECT USING (true);
CREATE POLICY "owner insert charger" ON public.chargers FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner update charger" ON public.chargers FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner delete charger" ON public.chargers FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.charging_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charger_id uuid NOT NULL REFERENCES public.chargers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  target_kwh numeric(10,2) NOT NULL DEFAULT 30,
  energy_kwh numeric(10,3) NOT NULL DEFAULT 0,
  minutes integer NOT NULL DEFAULT 0,
  current_power_kw numeric(10,2) NOT NULL DEFAULT 0,
  battery_percent integer NOT NULL DEFAULT 20,
  cost numeric(10,2) NOT NULL DEFAULT 0,
  status public.session_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.charging_sessions TO authenticated;
GRANT ALL ON public.charging_sessions TO service_role;
ALTER TABLE public.charging_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "driver reads own sessions" ON public.charging_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.chargers c WHERE c.id = charger_id AND c.owner_id = auth.uid()));
CREATE POLICY "driver creates session" ON public.charging_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "driver or owner updates session" ON public.charging_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.chargers c WHERE c.id = charger_id AND c.owner_id = auth.uid()))
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.chargers c WHERE c.id = charger_id AND c.owner_id = auth.uid()));

CREATE TABLE public.charger_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charger_id uuid NOT NULL REFERENCES public.chargers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (charger_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.charger_queue TO authenticated;
GRANT ALL ON public.charger_queue TO service_role;
ALTER TABLE public.charger_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue readable" ON public.charger_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "queue join self" ON public.charger_queue FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "queue leave self" ON public.charger_queue FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.charger_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charger_id uuid NOT NULL REFERENCES public.chargers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL DEFAULT 5,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (charger_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charger_reviews TO authenticated;
GRANT SELECT ON public.charger_reviews TO anon;
GRANT ALL ON public.charger_reviews TO service_role;
ALTER TABLE public.charger_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.charger_reviews FOR SELECT USING (true);
CREATE POLICY "reviews own write" ON public.charger_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews own update" ON public.charger_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews own delete" ON public.charger_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER chargers_touch BEFORE UPDATE ON public.chargers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, account_type)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)), COALESCE(NEW.raw_user_meta_data->>'account_type','driver'))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN COALESCE(NEW.raw_user_meta_data->>'account_type','driver') = 'merchant' THEN 'merchant'::public.app_role ELSE 'driver'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER PUBLICATION supabase_realtime ADD TABLE public.charging_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chargers;

INSERT INTO public.chargers (name, description, address, latitude, longitude, price_per_kwh, price_per_minute, power_kw, status, amenities, photos) VALUES
('AXIS Padaria Central', 'Carregador HCA G2 instalado na entrada da padaria. Estacionamento coberto.', 'Av. Paulista, 1000 - São Paulo', -23.5613, -46.6560, 2.90, 0.10, 22, 'available', ARRAY['Café','Wi-Fi','Banheiro'], ARRAY['https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200']),
('AXIS Mercado Vila Nova', 'HCA G2 circular no estacionamento do mercado, uso 24h.', 'R. Augusta, 2200 - São Paulo', -23.5560, -46.6620, 2.60, 0.00, 11, 'occupied', ARRAY['Mercado','Estacionamento'], ARRAY['https://images.unsplash.com/photo-1697093182234-0d1a0eb1de9c?w=1200']),
('AXIS Shopping Sul', 'Dois pontos HCA G2 no piso G2 do shopping.', 'Av. Ibirapuera, 3103 - São Paulo', -23.6100, -46.6660, 3.20, 0.15, 50, 'available', ARRAY['Praça de alimentação','Wi-Fi','Segurança 24h'], ARRAY['https://images.unsplash.com/photo-1615854832013-c62e0b0b7f4a?w=1200']),
('AXIS Café da Esquina', 'Carregador rápido para clientes do café.', 'R. Oscar Freire, 500 - São Paulo', -23.5620, -46.6720, 2.40, 0.05, 7.4, 'maintenance', ARRAY['Café','Pet friendly'], ARRAY['https://images.unsplash.com/photo-1554223090-7e482851df45?w=1200']);
