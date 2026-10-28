import { useEffect, useState } from "react";
import { useAuthSession } from "../auth/auth.queries";
import { useUserPreferencesQuery } from "../queries/userPreferences.queries";
import { defaultCommunities } from "../lib/communities";
export function useDefaultCommunities() {
 const {data:session}=useAuthSession();
 const preferences=useUserPreferencesQuery(session?.user.id);
 return defaultCommunities(preferences.data);
}
/** Reapply defaults only when the account or its actual choices change. */
export function useCommunityFilter() {
 const {data:session}=useAuthSession();
 const defaults=useDefaultCommunities();
 const signature=JSON.stringify([session?.user.id,defaults]);
 const [selected,setSelected]=useState(defaults);
 useEffect(()=>{setSelected(JSON.parse(signature)[1]);},[signature]);
 return [selected,setSelected] as const;
}
