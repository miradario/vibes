import type { LearningActivity, LearningSession } from "./types";
// Contract: vibes-web/lib/portal/studio.ts, commit 7ad7f8c.
export const studioStudentEnabled = process.env.EXPO_PUBLIC_PORTAL_STUDIO_ENABLED === "true";
export type StudioActivity = LearningActivity & { organizer_name?: string; cancellation_hours: number; waitlist_enabled: boolean };
export type StudioPack = { id:string; organizer_id:string; name:string; credits:number; valid_days:number; price:number; currency:string; activity_ids:string[]; active:boolean };
export type StudioOrder = { id:string; organizer_id:string; name:string; credits:number; remaining:number; amount:number; currency:string; status:"pending"|"paid"|"refunded"|"cancelled"; expires_at:string|null; created_at:string; activity_ids?:string[] };
export type StudioBooking = { id:string; organizer_id:string; session_id:string; title:string; starts_at:string; ends_at:string; timezone?:string; status:"confirmed"|"waitlist"|"cancelled"; present:boolean|null; cancellation_hours:number };
export type StudioContact = { organizer_id:string; phone:string; whatsapp_opt_in:boolean };
export type StudioStudentData = { activities:StudioActivity[]; sessions:LearningSession[]; packs:StudioPack[]; orders:StudioOrder[]; bookings:StudioBooking[]; contacts:StudioContact[]; routines:{organizer_id:string;organizer_name:string;routine:string;updated_at:string}[]; legacy_enrollments:{activity_id:string;title:string;status:string}[] };
export type StudentAction = "get"|"book"|"cancel"|"contact";
type RpcClient = { rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}> };
export async function requestStudioStudent<T>(client:RpcClient, action:StudentAction="get", id?:string, values:Record<string,unknown>={}):Promise<T> {
  const result=await client.rpc("portal_student",{p_action:action,p_id:id??null,p_data:values});
  if(result.error) throw result.error;
  return result.data as T;
}
export function studioCreditBalance(orders:StudioOrder[],now=Date.now()) {
  return orders.filter(order=>order.status==="paid" && order.expires_at && Date.parse(order.expires_at)>now).reduce((sum,order)=>sum+order.remaining,0);
}
export function studioCanCancel(booking:StudioBooking,now=Date.now()) {
  return booking.status==="waitlist" || (booking.status==="confirmed" && Date.parse(booking.starts_at)>now+booking.cancellation_hours*3600000);
}
export function studioStudentError(cause:unknown) {
  const error=cause as {code?:string;message?:string};
  if(error?.code==="PGRST202" || error?.code==="42883") return "La nueva agenda todavía no está habilitada. Podés consultar tus reservas anteriores.";
  const messages:Record<string,string>={CREDITS_REQUIRED:"Necesitás un crédito vigente de un pack compatible con esta clase.",NOT_BOOKABLE:"Este encuentro ya no está disponible.",FULL_CAPACITY:"El cupo está completo. Podés elegir otro encuentro o entrar en espera si está habilitada.",CANCELLATION_CLOSED:"Ya pasó el plazo para cancelar. Contactá al estudio.",ALREADY_ENROLLED:"Ya estás inscripto en la actividad completa.",FORBIDDEN:"No tenés permiso para realizar esta acción.",AUTH_REQUIRED:"Iniciá sesión nuevamente.",PHONE_REQUIRED:"Ingresá tu teléfono con código de país, usando entre 8 y 15 dígitos."};
  return messages[error?.message??""] ?? "No pudimos completar la operación. Actualizá la agenda y volvé a intentar.";
}
