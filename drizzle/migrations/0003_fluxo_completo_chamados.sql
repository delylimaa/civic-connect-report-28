-- Usuários ativos/inativos
ALTER TABLE public.user_roles ADD COLUMN ativo boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role AND ativo);
$$;
CREATE OR REPLACE FUNCTION public.secretaria_de(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT secretaria FROM public.user_roles WHERE user_id = _user_id AND role IN ('gestor','servidor') AND ativo;
$$;
CREATE OR REPLACE FUNCTION public.is_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND ativo);
$$;

-- Novas colunas do chamado
CREATE SEQUENCE public.protocolo_seq;
GRANT USAGE ON SEQUENCE public.protocolo_seq TO authenticated;
ALTER TABLE public.ocorrencias
  ADD COLUMN protocolo text NOT NULL DEFAULT ('AC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.protocolo_seq')::text, 6, '0')),
  ADD COLUMN atribuido_a uuid,
  ADD COLUMN prioridade text NOT NULL DEFAULT 'media',
  ADD COLUMN prazo timestamptz,
  ADD COLUMN justificativa text;
ALTER TABLE public.ocorrencias ADD CONSTRAINT ocorrencias_protocolo_key UNIQUE (protocolo);
ALTER TABLE public.ocorrencias ADD CONSTRAINT ocorrencias_prioridade_check CHECK (prioridade IN ('baixa','media','alta','urgente'));
ALTER TABLE public.ocorrencias DROP CONSTRAINT ocorrencias_status_check;
ALTER TABLE public.ocorrencias ADD CONSTRAINT ocorrencias_status_check CHECK (status IN
  ('registrado','em_analise','em_atendimento','aguardando_cidadao','resolvido','reaberto','cancelado','indeferido'));
UPDATE public.ocorrencias SET prazo = criado_em + interval '10 days' WHERE prazo IS NULL;

ALTER TABLE public.historico_status ADD COLUMN observacao text;

CREATE OR REPLACE FUNCTION public.dias_prazo(_prioridade text)
RETURNS interval LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _prioridade WHEN 'urgente' THEN interval '2 days' WHEN 'alta' THEN interval '5 days'
    WHEN 'baixa' THEN interval '20 days' ELSE interval '10 days' END;
$$;

CREATE OR REPLACE FUNCTION public.definir_prazo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.prioridade := 'media';
    NEW.atribuido_a := NULL;
    NEW.justificativa := NULL;
    NEW.status := 'registrado';
    NEW.prazo := now() + public.dias_prazo(NEW.prioridade);
  ELSIF NEW.prioridade <> OLD.prioridade THEN
    NEW.prazo := OLD.criado_em + public.dias_prazo(NEW.prioridade);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ocorrencias_prazo BEFORE INSERT OR UPDATE ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.definir_prazo();

-- Regras de alteração (RN006, RN008, RN011)
CREATE OR REPLACE FUNCTION public.validar_alteracao_ocorrencia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _papel public.app_role;
BEGIN
  IF current_setting('app.acao_sistema', true) = '1' OR _uid IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT role INTO _papel FROM public.user_roles WHERE user_id = _uid AND ativo;
  IF _papel IS NULL THEN
    RAISE EXCEPTION 'Sem permissão para alterar este chamado';
  END IF;
  IF NEW.usuario_id <> OLD.usuario_id OR NEW.protocolo <> OLD.protocolo OR NEW.criado_em <> OLD.criado_em THEN
    RAISE EXCEPTION 'Campos protegidos não podem ser alterados';
  END IF;
  IF _papel = 'servidor' AND (NEW.atribuido_a IS DISTINCT FROM OLD.atribuido_a
      OR NEW.prioridade <> OLD.prioridade OR NEW.secretaria IS DISTINCT FROM OLD.secretaria) THEN
    RAISE EXCEPTION 'Servidores não podem atribuir, encaminhar ou mudar a prioridade';
  END IF;
  IF _papel = 'gestor' AND NEW.secretaria IS DISTINCT FROM OLD.secretaria THEN
    RAISE EXCEPTION 'Use a opção Encaminhar para mudar a secretaria';
  END IF;
  IF NEW.atribuido_a IS NOT NULL AND NEW.atribuido_a IS DISTINCT FROM OLD.atribuido_a AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.atribuido_a AND ativo
      AND role IN ('gestor','servidor') AND secretaria = NEW.secretaria) THEN
    RAISE EXCEPTION 'O responsável precisa ser da secretaria do chamado';
  END IF;
  IF NEW.status <> OLD.status AND NEW.status IN ('resolvido','cancelado','indeferido','aguardando_cidadao')
     AND coalesce(btrim(NEW.justificativa), '') = '' THEN
    RAISE EXCEPTION 'Informe a justificativa para esta situação';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ocorrencias_guard BEFORE UPDATE ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.validar_alteracao_ocorrencia();

-- Servidor só altera chamados atribuídos a ele
DROP POLICY IF EXISTS ocorrencias_update_equipe ON public.ocorrencias;
CREATE POLICY ocorrencias_update_equipe ON public.ocorrencias FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'gestor') AND secretaria = public.secretaria_de(auth.uid()))
  OR (public.has_role(auth.uid(), 'servidor') AND secretaria = public.secretaria_de(auth.uid()) AND atribuido_a = auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'gestor') AND secretaria = public.secretaria_de(auth.uid()))
  OR (public.has_role(auth.uid(), 'servidor') AND secretaria = public.secretaria_de(auth.uid()) AND atribuido_a = auth.uid()));

-- Histórico com observação
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_status (ocorrencia_id, status_anterior, status_novo, alterado_por)
    VALUES (NEW.id, NULL, NEW.status, NEW.usuario_id);
    RETURN NEW;
  END IF;
  IF NEW.status <> OLD.status THEN
    NEW.atualizado_em := now();
    INSERT INTO public.historico_status (ocorrencia_id, status_anterior, status_novo, alterado_por, observacao)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NEW.justificativa);
  END IF;
  RETURN NEW;
END;
$$;

-- Comentários (pedido de informações e respostas)
CREATE TABLE public.comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES public.profiles(id),
  texto text NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 2000),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.comentarios TO authenticated;
GRANT ALL ON public.comentarios TO service_role;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY comentarios_select ON public.comentarios FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.ocorrencias o WHERE o.id = ocorrencia_id));
CREATE POLICY comentarios_insert ON public.comentarios FOR INSERT TO authenticated
WITH CHECK (autor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.ocorrencias o WHERE o.id = ocorrencia_id));

-- Avaliação do atendimento
CREATE TABLE public.avaliacoes (
  ocorrencia_id uuid PRIMARY KEY REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.profiles(id),
  nota int NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario text CHECK (char_length(comentario) <= 1000),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY avaliacoes_select ON public.avaliacoes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.ocorrencias o WHERE o.id = ocorrencia_id));
CREATE POLICY avaliacoes_insert ON public.avaliacoes FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid() AND EXISTS (SELECT 1 FROM public.ocorrencias o
  WHERE o.id = ocorrencia_id AND o.usuario_id = auth.uid() AND o.status = 'resolvido'));

-- Notificações
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ocorrencia_id uuid REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text NOT NULL DEFAULT '',
  lida boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY notificacoes_select ON public.notificacoes FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY notificacoes_update ON public.notificacoes FOR UPDATE TO authenticated
USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

-- Auditoria
CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid,
  acao text NOT NULL,
  entidade text NOT NULL,
  entidade_id uuid,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY auditoria_select_admin ON public.auditoria FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.notificar_e_auditar_ocorrencia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO public.notificacoes (usuario_id, ocorrencia_id, titulo, mensagem)
    VALUES (NEW.usuario_id, NEW.id, 'Chamado ' || NEW.protocolo || ' atualizado',
      'Nova situação: ' || NEW.status || coalesce(' — ' || NEW.justificativa, ''));
  END IF;
  IF NEW.atribuido_a IS DISTINCT FROM OLD.atribuido_a AND NEW.atribuido_a IS NOT NULL THEN
    INSERT INTO public.notificacoes (usuario_id, ocorrencia_id, titulo, mensagem)
    VALUES (NEW.atribuido_a, NEW.id, 'Chamado ' || NEW.protocolo || ' atribuído a você', NEW.titulo);
  END IF;
  IF NEW.status <> OLD.status OR NEW.atribuido_a IS DISTINCT FROM OLD.atribuido_a
     OR NEW.secretaria IS DISTINCT FROM OLD.secretaria OR NEW.prioridade <> OLD.prioridade THEN
    INSERT INTO public.auditoria (usuario_id, acao, entidade, entidade_id, detalhes)
    VALUES (auth.uid(), 'alterar_chamado', 'ocorrencias', NEW.id, jsonb_build_object(
      'protocolo', NEW.protocolo,
      'antes', jsonb_build_object('status', OLD.status, 'secretaria', OLD.secretaria, 'atribuido_a', OLD.atribuido_a, 'prioridade', OLD.prioridade),
      'depois', jsonb_build_object('status', NEW.status, 'secretaria', NEW.secretaria, 'atribuido_a', NEW.atribuido_a, 'prioridade', NEW.prioridade),
      'justificativa', NEW.justificativa));
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER ocorrencias_notificar AFTER UPDATE ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.notificar_e_auditar_ocorrencia();

CREATE OR REPLACE FUNCTION public.ao_comentar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.ocorrencias%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.ocorrencias WHERE id = NEW.ocorrencia_id;
  IF NEW.autor_id = o.usuario_id THEN
    IF o.atribuido_a IS NOT NULL THEN
      INSERT INTO public.notificacoes (usuario_id, ocorrencia_id, titulo, mensagem)
      VALUES (o.atribuido_a, o.id, 'Morador respondeu ao chamado ' || o.protocolo, left(NEW.texto, 200));
    END IF;
    IF o.status = 'aguardando_cidadao' THEN
      PERFORM set_config('app.acao_sistema', '1', true);
      UPDATE public.ocorrencias SET status = 'em_analise', justificativa = 'Morador enviou as informações' WHERE id = o.id;
      PERFORM set_config('app.acao_sistema', '0', true);
    END IF;
  ELSE
    INSERT INTO public.notificacoes (usuario_id, ocorrencia_id, titulo, mensagem)
    VALUES (o.usuario_id, o.id, 'Nova mensagem da prefeitura — ' || o.protocolo, left(NEW.texto, 200));
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER comentarios_apos_inserir AFTER INSERT ON public.comentarios
FOR EACH ROW EXECUTE FUNCTION public.ao_comentar();

CREATE OR REPLACE FUNCTION public.auditar_papel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.auditoria (usuario_id, acao, entidade, entidade_id, detalhes)
  VALUES (coalesce(auth.uid(), NEW.criado_por), lower(TG_OP) || '_papel', 'user_roles', NEW.user_id,
    jsonb_build_object('role', NEW.role, 'secretaria', NEW.secretaria, 'ativo', NEW.ativo));
  RETURN NULL;
END;
$$;
CREATE TRIGGER user_roles_auditar AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.auditar_papel();

-- Ações via função (RN006)
CREATE OR REPLACE FUNCTION public.encaminhar_chamado(_id uuid, _secretaria text, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.ocorrencias%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.ocorrencias WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Chamado não encontrado'; END IF;
  IF NOT (public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'gestor') AND o.secretaria = public.secretaria_de(auth.uid()))) THEN
    RAISE EXCEPTION 'Sem permissão para encaminhar';
  END IF;
  IF coalesce(btrim(_motivo), '') = '' THEN RAISE EXCEPTION 'Informe o motivo'; END IF;
  PERFORM set_config('app.acao_sistema', '1', true);
  UPDATE public.ocorrencias SET secretaria = _secretaria, atribuido_a = NULL, justificativa = _motivo,
    status = CASE WHEN status IN ('registrado','em_analise') THEN status ELSE 'em_analise' END
  WHERE id = _id;
  PERFORM set_config('app.acao_sistema', '0', true);
  INSERT INTO public.auditoria (usuario_id, acao, entidade, entidade_id, detalhes)
  VALUES (auth.uid(), 'encaminhar_chamado', 'ocorrencias', _id,
    jsonb_build_object('de', o.secretaria, 'para', _secretaria, 'motivo', _motivo));
END;
$$;

CREATE OR REPLACE FUNCTION public.reabrir_chamado(_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(btrim(_motivo), '') = '' THEN RAISE EXCEPTION 'Informe o motivo'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ocorrencias WHERE id = _id AND usuario_id = auth.uid() AND status = 'resolvido') THEN
    RAISE EXCEPTION 'Só é possível reabrir seus chamados concluídos';
  END IF;
  PERFORM set_config('app.acao_sistema', '1', true);
  UPDATE public.ocorrencias SET status = 'reaberto', justificativa = _motivo WHERE id = _id;
  PERFORM set_config('app.acao_sistema', '0', true);
END;
$$;

-- Consulta pública de protocolo (sem dados pessoais)
CREATE OR REPLACE FUNCTION public.consultar_protocolo(_protocolo text)
RETURNS TABLE (protocolo text, categoria text, subcategoria text, secretaria text, status text, criado_em timestamptz, atualizado_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.protocolo, o.categoria, o.subcategoria, o.secretaria, o.status, o.criado_em, o.atualizado_em
  FROM public.ocorrencias o WHERE o.protocolo = upper(btrim(_protocolo)) LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.encaminhar_chamado(uuid, text, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.reabrir_chamado(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.encaminhar_chamado(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reabrir_chamado(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_protocolo(text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_alteracao_ocorrencia() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notificar_e_auditar_ocorrencia() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ao_comentar() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auditar_papel() FROM public, anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.comentarios, public.notificacoes;