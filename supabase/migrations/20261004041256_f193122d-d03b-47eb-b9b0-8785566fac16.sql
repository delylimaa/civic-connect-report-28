ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS subcategoria text, ADD COLUMN IF NOT EXISTS secretaria text;
UPDATE public.ocorrencias SET subcategoria = categoria, categoria = 'infraestrutura', secretaria = 'obras' WHERE categoria IN ('buraco_via','iluminacao_publica');
UPDATE public.ocorrencias SET subcategoria = 'lixo', categoria = 'meio_ambiente', secretaria = 'meio_ambiente' WHERE categoria = 'lixo';
UPDATE public.ocorrencias SET subcategoria = 'outro', secretaria = 'ouvidoria' WHERE categoria = 'outros';