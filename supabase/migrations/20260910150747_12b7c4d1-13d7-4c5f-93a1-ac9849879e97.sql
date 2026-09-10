CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  perfil text NOT NULL DEFAULT 'cidadao' CHECK (perfil IN ('cidadao','gestor')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND perfil = 'gestor');
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_gestor(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.prevent_perfil_escalation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.perfil <> OLD.perfil AND NOT public.is_gestor(auth.uid()) THEN
    NEW.perfil := OLD.perfil;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_no_escalation BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_perfil_escalation();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.raw_user_meta_data->>'perfil' = 'gestor' THEN 'gestor' ELSE 'cidadao' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  categoria text NOT NULL CHECK (categoria IN ('buraco_via','iluminacao_publica','lixo','outros')),
  foto_url text,
  latitude float8,
  longitude float8,
  status text NOT NULL DEFAULT 'registrado' CHECK (status IN ('registrado','em_analise','em_atendimento','resolvido')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocorrencias TO authenticated;
GRANT ALL ON public.ocorrencias TO service_role;
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ocorrencias_select" ON public.ocorrencias FOR SELECT TO authenticated USING (usuario_id = auth.uid() OR public.is_gestor(auth.uid()));
CREATE POLICY "ocorrencias_insert_own" ON public.ocorrencias FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "ocorrencias_update_gestor" ON public.ocorrencias FOR UPDATE TO authenticated USING (public.is_gestor(auth.uid())) WITH CHECK (public.is_gestor(auth.uid()));
CREATE POLICY "ocorrencias_delete_own" ON public.ocorrencias FOR DELETE TO authenticated USING (usuario_id = auth.uid());

CREATE TABLE public.historico_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  status_anterior text,
  status_novo text NOT NULL,
  alterado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  alterado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.historico_status TO authenticated;
GRANT ALL ON public.historico_status TO service_role;
ALTER TABLE public.historico_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historico_select" ON public.historico_status FOR SELECT TO authenticated USING (
  public.is_gestor(auth.uid())
  OR EXISTS (SELECT 1 FROM public.ocorrencias o WHERE o.id = ocorrencia_id AND o.usuario_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_status (ocorrencia_id, status_anterior, status_novo, alterado_por)
    VALUES (NEW.id, NULL, NEW.status, NEW.usuario_id);
    RETURN NEW;
  END IF;
  IF NEW.status <> OLD.status THEN
    NEW.atualizado_em := now();
    INSERT INTO public.historico_status (ocorrencia_id, status_anterior, status_novo, alterado_por)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ocorrencias_status_update BEFORE UPDATE ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.log_status_change();
CREATE TRIGGER ocorrencias_status_insert AFTER INSERT ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

CREATE INDEX ocorrencias_usuario_idx ON public.ocorrencias(usuario_id);
CREATE INDEX historico_ocorrencia_idx ON public.historico_status(ocorrencia_id);

ALTER TABLE public.ocorrencias REPLICA IDENTITY FULL;
ALTER TABLE public.historico_status REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ocorrencias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_status;

CREATE POLICY "fotos_read_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ocorrencias');
CREATE POLICY "fotos_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ocorrencias' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fotos_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ocorrencias' AND (storage.foldername(name))[1] = auth.uid()::text);