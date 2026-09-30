-- Run after vibi_prompt_versions migration. Everything is rolled back.
begin;
do $$
declare draft uuid; other_draft uuid; previous uuid;
begin
  if has_table_privilege('authenticated','public.vibi_prompt_versions','SELECT') or
     has_table_privilege('anon','public.vibi_prompt_config','SELECT') or
     has_function_privilege('authenticated','public.vibi_publish_prompt(uuid,uuid,uuid)','EXECUTE') then
    raise exception 'Prompt configuration is exposed to ordinary users';
  end if;
  select published_id into previous from public.vibi_prompt_config where id=1;
  insert into public.vibi_prompt_versions(title,content) values('Fixture','Instrucciones válidas para pruebas') returning id into draft;
  insert into public.vibi_prompt_versions(title,content) values('Fixture 2','Otras instrucciones válidas para pruebas') returning id into other_draft;
  begin
    perform public.vibi_publish_prompt(null,draft,previous);
    raise exception 'Untested publication accepted';
  exception when raise_exception then
    if sqlerrm not like 'Probá esta versión%' then raise; end if;
  end;
  insert into public.vibi_prompt_tests(prompt_id,model,successful) values(draft,'fixture',true),(other_draft,'fixture',true);
  perform public.vibi_publish_prompt(null,draft,previous);
  begin
    perform public.vibi_publish_prompt(null,other_draft,previous);
    raise exception 'Stale publication accepted';
  exception when raise_exception then
    if sqlerrm not like 'La versión publicada cambió%' then raise; end if;
  end;
  perform public.vibi_publish_prompt(null,other_draft,draft);
  perform public.vibi_publish_prompt(null,draft,other_draft);
  if (select published_id from public.vibi_prompt_config where id=1) <> draft then raise exception 'Restore failed'; end if;
end $$;
rollback;
select 'Prompt permissions, test gate, concurrent publication and restoration passed' as result;
