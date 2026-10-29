-- Add onboarding fields without changing existing Codeks or contract requirements.
do $$ declare definition text;
begin
 definition:=pg_get_functiondef('public.marketizo_sign_required_fields(jsonb,jsonb)'::regprocedure);
 if position('declare fields text[]' in definition)=0 then raise exception 'Unexpected identity validator'; end if;
 execute replace(definition,E'begin\n',E'begin\n if doc->>''note''=''marketizo-onboarding:v3'' and doc->>''category''=''clients'' then return array[''name'',''company'',''country'']; end if;\n');
end $$;
notify pgrst,'reload schema';
