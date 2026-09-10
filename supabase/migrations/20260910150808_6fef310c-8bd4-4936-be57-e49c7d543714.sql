REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_perfil_escalation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_gestor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_gestor(uuid) TO authenticated;