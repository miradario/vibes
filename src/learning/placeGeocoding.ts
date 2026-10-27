import * as ExpoLocation from "expo-location";
import { getGoogleMapsClientConfig } from "../config/googleMaps";
import { validPlacePoint, type PlacePoint } from "./placeMap";
async function googleLookup(params:string){
  const config=getGoogleMapsClientConfig();
  if(!config.apiKey) return null;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}&language=es&key=${config.apiKey}`,{headers:config.headers,signal:controller.signal});
    if(!response.ok) return null;
    const data=await response.json();return data.status==="OK" ? data.results?.[0] : null;
  }catch{return null;}finally{clearTimeout(timeout);}
}
export async function findPlaceAddress(query:string):Promise<{point:PlacePoint;address:string}> {
  const found=await googleLookup(`address=${encodeURIComponent(query.trim())}`);
  if(found){const point={latitude:found.geometry?.location?.lat,longitude:found.geometry?.location?.lng};if(validPlacePoint(point))return {point,address:found.formatted_address || query.trim()};}
  const native=await ExpoLocation.geocodeAsync(query.trim());
  if(!native[0] || !validPlacePoint(native[0])) throw Error("No encontramos esa dirección. Agregá la ciudad o elegí el punto en el mapa.");
  return {point:{latitude:native[0].latitude,longitude:native[0].longitude},address:query.trim()};
}
export async function placeAddressForPoint(point:PlacePoint):Promise<string|null>{
  const found=await googleLookup(`latlng=${point.latitude},${point.longitude}`);
  if(found?.formatted_address) return found.formatted_address;
  try{const [address]=await ExpoLocation.reverseGeocodeAsync(point);return address ? [[address.street,address.streetNumber].filter(Boolean).join(" "),address.district,address.city,address.region].filter(Boolean).filter((value,index,all)=>all.indexOf(value)===index).join(", ") || null : null;}catch{return null;}
}
