CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'servidor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  secretaria text,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.secretaria_de(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT secretaria FROM public.user_roles WHERE user_id = _user_id AND role IN ('gestor','servidor');
$$;

CREATE OR REPLACE FUNCTION public.is_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.secretaria_de(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secretaria_de(uuid) TO authenticated;

CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'gestor') AND secretaria = public.secretaria_de(auth.uid())));

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM public.profiles WHERE perfil = 'gestor'
ON CONFLICT (user_id) DO NOTHING;

DROP POLICY IF EXISTS ocorrencias_select ON public.ocorrencias;
DROP POLICY IF EXISTS ocorrencias_update_gestor ON public.ocorrencias;
CREATE POLICY ocorrencias_select ON public.ocorrencias FOR SELECT TO authenticated
USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  OR (secretaria IS NOT NULL AND secretaria = public.secretaria_de(auth.uid())));
CREATE POLICY ocorrencias_update_equipe ON public.ocorrencias FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR (secretaria IS NOT NULL AND secretaria = public.secretaria_de(auth.uid())))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR (secretaria IS NOT NULL AND secretaria = public.secretaria_de(auth.uid())));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, perfil)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), 'cidadao')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.perfil IS 'DEPRECATED: papéis ficam em public.user_roles';