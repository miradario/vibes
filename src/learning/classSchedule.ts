import { wallDate, zonedDateToISO } from "./utils";
export type ClassSchedule = {days:number[];start:string;end:string;from:string;until:string;timezone:string;title:string};
export function classScheduleSessions(schedule:ClassSchedule, now=Date.now()) {
  if(!schedule.days.length || schedule.days.some(day=>!Number.isInteger(day)||day<0||day>6)) throw Error("Elegí al menos un día de la semana.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(schedule.from)||!/^\d{4}-\d{2}-\d{2}$/.test(schedule.until)) throw Error("Elegí las fechas de inicio y fin.");
  const first=Date.parse(`${schedule.from}T12:00:00Z`),last=Date.parse(`${schedule.until}T12:00:00Z`);
  if(!Number.isFinite(first)||!Number.isFinite(last)||new Date(first).toISOString().slice(0,10)!==schedule.from||new Date(last).toISOString().slice(0,10)!==schedule.until||last<first) throw Error("La fecha final debe ser igual o posterior al inicio.");
  if((last-first)/86400000>366) throw Error("Elegí un período de hasta un año.");
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.end)||schedule.end<=schedule.start) throw Error("La hora de fin debe ser posterior a la de inicio en el mismo día.");
  const sessions=[];
  for(let timestamp=first;timestamp<=last;timestamp+=86400000){
    const date=new Date(timestamp);
    if(!schedule.days.includes(date.getUTCDay())) continue;
    const day=date.toISOString().slice(0,10);
    const starts_at=zonedDateToISO(`${day} ${schedule.start}`,schedule.timezone);
    const ends_at=zonedDateToISO(`${day} ${schedule.end}`,schedule.timezone);
    if(Date.parse(starts_at)<=now) throw Error("El inicio de la clase debe ser futuro.");
    sessions.push({title:schedule.title.trim(),starts_at,ends_at});
    if(sessions.length>100) throw Error("El período admite hasta 100 clases. Acortá la fecha final.");
  }
  if(!sessions.length) throw Error("No hay encuentros en los días y fechas elegidos.");
  return sessions;
}
export function classScheduleFromSessions(sessions:{starts_at:string;ends_at:string}[],timezone:string){
  const ordered=[...sessions].sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at));
  if(!ordered.length) return null;
  const start=wallDate(ordered[0].starts_at,timezone),end=wallDate(ordered[0].ends_at,timezone);
  return {days:[...new Set(ordered.map(session=>new Date(`${wallDate(session.starts_at,timezone).slice(0,10)}T12:00:00Z`).getUTCDay()))],start:start.slice(11,16),end:end.slice(11,16),from:start.slice(0,10),until:wallDate(ordered.at(-1)!.starts_at,timezone).slice(0,10)};
}
