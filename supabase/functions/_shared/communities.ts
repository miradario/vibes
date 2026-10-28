/** Shared by the app and recommendations: match explicit communities, not prose. */
export const COMMUNITY_OPTIONS = [
  "El Arte de Vivir", "Danzantes", "Ashtanga", "Hatha", "Meditación trascendental",
  "Bikram", "Músicos", "Artistas", "Servicio",
] as const;
const normalize = (value: string) => value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const aliases: Record<string,string> = {
 "art of living":"El Arte de Vivir", "arte de vivir":"El Arte de Vivir", "hatha yoga":"Hatha",
 "baile":"Danzantes", "danza":"Danzantes", "contact":"Danzantes", "5 ritmos":"Danzantes",
 "musica":"Músicos", "canto":"Músicos", "meditacion trasendental":"Meditación trascendental",
};
export function canonicalCommunity(value: unknown): string | null {
 if(typeof value!=="string")return null;
 const key=normalize(value);
 return COMMUNITY_OPTIONS.find(option=>normalize(option)===key)??aliases[key]??null;
}
export function readCommunities(value: unknown): string[] {
 const source=typeof value==="string"?[value]:Array.isArray(value)?value:[];
 const known=new Set(source.map(canonicalCommunity).filter((item):item is string=>Boolean(item)));
 return COMMUNITY_OPTIONS.filter(option=>known.has(option));
}
export function defaultCommunities(preferences?:Record<string,any>|null):string[]{
 if(preferences?.communities!==undefined&&preferences?.communities!==null)return readCommunities(preferences.communities);
 const paths=preferences?.spiritualPath??preferences?.spiritual_path;
 return readCommunities([...(Array.isArray(paths)?paths:[]),...Object.keys(preferences?.spiritualPathDetails??preferences?.spiritual_path_details??{})]);
}
export function contentCommunities(item?:Record<string,any>|null):string[]{
 if(!item)return [];
 const explicit=item.communities??item.community;
 if(explicit!==undefined&&explicit!==null)return readCommunities(explicit);
 return readCommunities([
  ...(Array.isArray(item.spiritualPath??item.spiritual_path)?item.spiritualPath??item.spiritual_path:[]),
  ...Object.keys(item.spiritualPathDetails??item.spiritual_path_details??{}),
  ...(Array.isArray(item.tags)?item.tags:[]),
  ...(Array.isArray(item.specialties)?item.specialties:[]),
  item.categoria,item.category,
 ]);
}
/** Unassigned content is always included. Several choices are an OR filter. */
export function matchesCommunities(item:Record<string,any>,selected:readonly string[]):boolean{
 const wanted=readCommunities(selected);if(!wanted.length)return true;
 const assigned=contentCommunities(item);
 return !assigned.length||assigned.some(value=>wanted.includes(value));
}
