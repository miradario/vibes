import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createAdminClient, requireAdminCaller, json } from "../_shared/admin.ts";
import { generateReply } from "../vibi-chat/provider.ts";
import { DEFAULT_PROMPT, validatePrompt } from "../vibi-chat/prompts.ts";
import { isUUID, VibiError, type Candidate } from "../vibi-chat/core.ts";

const check = (r: any) => { if(r.error) throw new Error(r.error.message); return r.data; };
const samples = (): Candidate[] => [
  {id:"00000000-0000-4000-8000-000000000001",type:"event",title:"Caminata al aire libre",description:"Encuentro de ejemplo para caminar y conocer gente",tags:["Aire libre"],thumbnail:null,startsAt:new Date(Date.now()+86400000*3).toISOString()},
  {id:"00000000-0000-4000-8000-000000000002",type:"challenge",title:"Siete días de meditación",description:"Desafío de ejemplo para principiantes",tags:["Meditación"],thumbnail:null,durationDays:7},
  {id:"00000000-0000-4000-8000-000000000003",type:"person",title:"Alex (ejemplo)",description:"Perfil ficticio que disfruta el arte y busca amistad",tags:["Arte","Amistad"],thumbnail:null},
];

serve(async req => {
  if(req.method !== "POST") return json({error:"Método no permitido"},{status:405});
  try {
    const caller = await requireAdminCaller(req);
    const raw = await req.text();
    if(new TextEncoder().encode(raw).length > 40000) return json({error:"Solicitud demasiado grande"},{status:413});
    const body = JSON.parse(raw);
    const db = createAdminClient();
    if(body.action === "list") {
      const versions=check(await db.from("vibi_prompt_versions").select("*").order("created_at",{ascending:false}).limit(100));
      const config=check(await db.from("vibi_prompt_config").select("published_id").eq("id",1).single());
      const publications=check(await db.from("vibi_prompt_publications").select("*").order("created_at",{ascending:false}).limit(100));
      const tests=check(await db.from("vibi_prompt_tests").select("prompt_id").eq("successful",true).in("prompt_id",versions.map((v:any)=>v.id)));
      return json({versions,publications,publishedId:config.published_id,testedIds:[...new Set(tests.map((t:any)=>t.prompt_id))],defaultPrompt:DEFAULT_PROMPT});
    }
    if(body.action === "save") {
      const content=validatePrompt(body.content);
      const title=typeof body.title === "string" ? body.title.trim() : "";
      if(!title || title.length>100) return json({error:"Ingresá un nombre de hasta 100 caracteres."},{status:400});
      const version=check(await db.from("vibi_prompt_versions").insert({title,content,created_by:caller.userId}).select("*").single());
      return json({version});
    }
    if(!isUUID(body.id)) return json({error:"Versión inválida"},{status:400});
    if(body.action === "publish") {
      if(body.expected !== null && !isUUID(body.expected)) return json({error:"Estado inválido"},{status:400});
      check(await db.rpc("vibi_publish_prompt",{p_actor:caller.userId,p_prompt:body.id,p_expected:body.expected}));
      return json({ok:true});
    }
    if(body.action !== "test") return json({error:"Acción inválida"},{status:400});
    if(typeof body.message !== "string" || !body.message.trim() || body.message.length>2000 ||
      !["all","empty","event","challenge","person"].includes(body.scenario)) return json({error:"Prueba inválida"},{status:400});
    const history = body.history ?? [];
    if(!Array.isArray(history) || history.length>10 || history.some(h=> !h || typeof h.user_text!=="string" || typeof h.assistant_text!=="string" || h.user_text.length>2000 || h.assistant_text.length>2000 || ![null,"event","challenge","person"].includes(h.category)))
      return json({error:"Historial inválido"},{status:400});
    const version=check(await db.from("vibi_prompt_versions").select("id,content").eq("id",body.id).single());
    const key=Deno.env.get("DEEPSEEK_API_KEY");
    if(!key) return json({error:"DeepSeek no está configurado"},{status:503});
    const model=Deno.env.get("DEEPSEEK_MODEL")?.trim() || "deepseek-flash";
    const testId=check(await db.rpc("vibi_begin_prompt_test",{p_actor:caller.userId,p_prompt:version.id,p_model:model}));
    const candidates=samples().filter(c=>body.scenario==="all" || c.type===body.scenario);
    const reply=await generateReply({key,model,systemPrompt:validatePrompt(version.content),message:body.message,history,
      previousCategory:history.at(-1)?.category ?? null,preferences:{looking_for:["Amistad"],other_tags:["Arte","Aire libre"]},candidates});
    check(await db.from("vibi_prompt_tests").update({successful:true}).eq("id",testId));
    return json({reply:{...reply,recommendations:reply.recommendations.map(r=>({...r,title:candidates.find(c=>c.id===r.id)?.title}))},versionId:version.id,model});
  } catch(error) {
    if(error instanceof Response) return error;
    if(error instanceof VibiError) return json({error:"No se pudo completar la prueba con DeepSeek. Intentá nuevamente."},{status:error.status});
    return json({error:error instanceof Error ? error.message : "No se pudo completar la operación"},{status:400});
  }
});
