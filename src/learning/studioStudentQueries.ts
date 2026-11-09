import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "../auth/auth.queries";
import { useClasesEnabled } from "../featureFlags/useClasesEnabled";
import { supabase } from "../lib/supabase";
import { withBootTimeout } from "../lib/startupBoot";
import { requestStudioStudent, studioStudentEnabled, type StudioStudentData, type StudentAction } from "./studioStudent";
const client={rpc:(name:string,args:Record<string,unknown>)=>supabase.rpc(name,args)};
export const studioStudentKey=(userId?:string)=>["studio-student",userId??"anonymous"] as const;
export function useStudioStudentQuery() {
  const {data:session}=useAuthSession();
  const classes=useClasesEnabled();
  return useQuery({queryKey:studioStudentKey(session?.user.id),enabled:studioStudentEnabled&&classes&&!!session?.user.id,
    queryFn:()=>withBootTimeout(requestStudioStudent<StudioStudentData>(client),15000,"studio student"),staleTime:15000,retry:1});
}
export function useStudioStudentMutation() {
  const {data:session}=useAuthSession();
  const classes=useClasesEnabled();
  const queryClient=useQueryClient();
  return useMutation({mutationFn:async({action,id,data}:{action:Exclude<StudentAction,"get">;id:string;data?:Record<string,unknown>})=>{
    if(!studioStudentEnabled || !classes || !session?.user.id) throw new Error("AUTH_REQUIRED");
    return await withBootTimeout(requestStudioStudent<unknown>(client,action,id,data),15000,"studio student action");
  },retry:false,onSettled:async()=>{
    await Promise.all([queryClient.invalidateQueries({queryKey:studioStudentKey(session?.user.id)}),queryClient.invalidateQueries({queryKey:["learning"]})]);
  }});
}
