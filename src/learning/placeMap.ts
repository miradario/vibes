import { vibesTheme } from "../theme/vibesTheme";
export type PlacePoint={latitude:number;longitude:number};
export function validPlacePoint(value:unknown):value is PlacePoint {
  if(!value || typeof value!=="object") return false;
  const point=value as PlacePoint;
  return Number.isFinite(point.latitude)&&Number.isFinite(point.longitude)&&Math.abs(point.latitude)<=90&&Math.abs(point.longitude)<=180;
}
export function placeMapHtml(initial:PlacePoint|null){
  const c=vibesTheme.colors;
  const point=validPlacePoint(initial) ? initial : {latitude:-34.6037,longitude:-58.3816};
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""><style>
  html,body,#map{width:100%;height:100%;margin:0;background:${c.surface};color:${c.primaryText};font-family:Arial,sans-serif}#pin{position:absolute;left:50%;top:50%;width:24px;height:24px;margin:-24px 0 0 -14px;background:${c.accentBlue};border:3px solid ${c.surface};border-radius:50% 50% 50% 0;transform:rotate(-45deg);z-index:800;pointer-events:none;box-shadow:0 2px 6px ${c.primaryText}66}#pin:after{content:'';position:absolute;width:8px;height:8px;border-radius:50%;background:${c.surface};top:8px;left:8px}.leaflet-bar{border-color:${c.primaryText}33!important;box-shadow:none!important}.leaflet-bar a,.leaflet-bar a:hover{background:${c.surface}!important;color:${c.primaryText}!important;border-color:${c.primaryText}33!important;width:40px!important;height:40px!important;line-height:40px!important}#credit{position:absolute;bottom:0;right:0;z-index:900;background:${c.surface};color:${c.secondaryText};padding:4px 6px;font-size:11px}#credit a{color:${c.primaryText}}#message{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;color:${c.secondaryText};text-align:center}
  </style></head><body><div id="message">Cargando mapa…</div><div id="map"></div><div id="pin"></div><div id="credit">© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script><script>
  function post(value){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(value));}
  try{
    var map=L.map('map',{attributionControl:false,zoomControl:true}).setView([${point.latitude},${point.longitude}],${initial ? 17 : 12});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    function choose(){var center=map.getCenter();post({type:'point',latitude:center.lat,longitude:center.lng});}
    map.on('dragend',choose);map.on('click',function(event){map.panTo(event.latlng,{animate:false});choose();});
    window.moveToPlacePoint=function(latitude,longitude){var center=map.getCenter();if(Math.abs(center.lat-latitude)<0.0000001 && Math.abs(center.lng-longitude)<0.0000001)return;map.setView([latitude,longitude],17,{animate:false});};
    document.getElementById('message').remove();post({type:'ready'});
  }catch(error){post({type:'error'});document.getElementById('message').textContent='No se pudo cargar el mapa';}
  </script></body></html>`;
}
