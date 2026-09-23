# Simulator QA Checklist - Vibes

Fecha: 2026-09-23

Usar este checklist para marcar cada item despues de verificarlo en el simulator.

## Home

- [ ] Home activa: muestra desafios activos, eventos proximos y sugerencias de personas con thumbnails/cards sobrias.
- [ ] Home activa: no aparece campana de notificaciones arriba a la derecha.
- [ ] Home activa: debajo de "Hola, Agustin" aparece la frase original.
- [ ] Home activa: no aparece la mano saludando.
- [ ] Home activa: card "Completa tu perfil" es compacta, solo dice "Completa tu perfil", no tiene chevron y la X esta arriba a la derecha.
- [ ] Home activa: carouseles no tienen fondo propio; las cards si conservan su fondo.
- [ ] Home activa: botones, progress bars y acentos usan el naranja Vibes de progreso de perfil.
- [ ] Home activa: cards de desafios activos son compactas y no se sienten demasiado altas.
- [ ] Home sin eventos: muestra mensaje de que no hay eventos proximos y CTA visible para crear uno.
- [ ] Home sin eventos: boton "Crear evento" no tiene icono.
- [ ] Home sin desafios activos: el texto no se escapa del box.
- [ ] Home desafios: un desafio completado hoy no muestra "Pendiente hoy".
- [ ] Inicio iOS: al abrir la app no hace blink/flicker inicial.

## Titulos Y Fondos

- [ ] Desafios, Eventos, Descubrir y Comunidad: titulos tienen misma fuente, color y tamanio que Descubrir.
- [ ] Desafios, Eventos, Descubrir y Comunidad: posicionamiento vertical consistente.
- [ ] Descubrir: el fondo inferior es igual al resto de la app, sin franja gris/oscura.

## Comunidad Y Chats

- [ ] Comunidad: tabs Mensajes/Grupos no muestran badge cuando el contador es 0.
- [ ] Comunidad: donde antes decia "Challenges" ahora dice "Desafios".
- [ ] Chat de desafio: el modal/lista de participantes no muestra cantidad en el titulo.
- [ ] Chat de evento: si existe modal/lista equivalente, no muestra cantidad en el titulo.
- [ ] Chat de desafio: al abrir perfil de participante ya conectado, no aparece boton "Conectar".
- [ ] Chat de desafio: al abrir perfil de participante no conectado, aparece boton "Conectar".
- [ ] Perfil desde chat de desafio: no aparece numerador de fotos tipo "3 / 5".
- [ ] Perfil desde chat de desafio: no aparecen acciones "Reportar y bloquear".
- [ ] Perfil desde chat de desafio: boton "Ver mas" es mas ancho y visible.

## Descubrir

- [ ] Descubrir perfil detalle: el boton cerrar/volver es chevron-back, no X.
- [ ] Descubrir perfil detalle: al swipear derecha se ve animacion de burbujas/halo de like en iOS.
- [ ] Descubrir filtros/categorias: la X sin fondo funciona como volver/atras segun corresponda.

## Eventos

- [ ] Eventos pasados: los eventos caducados aparecen siempre abajo como "Eventos pasados".
- [ ] Eventos pasados: el toggle dice "Ocultar pasados" cuando estan visibles.
- [ ] Eventos vigentes: no se mezclan con eventos pasados.

## Perfil Y Version

- [ ] Perfil: muestra version real de la app.
- [ ] Perfil: muestra build number en texto chico.
- [ ] iOS: build number esta en 26.

## Onboarding / Ubicacion

- [ ] Onboarding ubicacion: permite cargar ciudad manualmente.
- [ ] Onboarding ubicacion: permite cargar pais manualmente.
- [ ] Onboarding ubicacion: boton "Usar mi ubicacion" es visible.
- [ ] Onboarding ubicacion: al usar ubicacion se completa ciudad y pais correctamente.
- [ ] Onboarding ubicacion: no repite ciudad en el label.
- [ ] Onboarding foto: no vuelve a pedir ubicacion ni reescribe la ciudad.

## Loading

- [ ] VibesLoader: usa colores sobrios de la app.
- [ ] VibesLoader: no se ven azules viejos en la animacion.

## Force Update / Backoffice

- [ ] Supabase: `app_version_rules` existe en remoto.
- [ ] Supabase: fila global `id = 1` existe y `is_enabled = true`.
- [ ] Supabase: columnas `minimum_supported_version`, `recommended_version`, `ios_store_url`, `android_store_url` existen.
- [ ] Backoffice: sidebar muestra "Version app".
- [ ] Backoffice: pantalla "Version app" carga sin error.
- [ ] Backoffice: se puede setear Min supported.
- [ ] Backoffice: se puede setear Latest.
- [ ] Backoffice: se pueden setear URLs de App Store / Play Store.
- [ ] App: si version instalada < min supported, muestra force update.
- [ ] App: si version instalada < latest, muestra update recomendado.

## Backoffice Labels

- [ ] Backoffice: sidebar usa "Desafios" en lugar de "Challenges".

## Notas De QA

- [ ] Sin issues bloqueantes.
- [ ] Issues menores anotados.
- [ ] Listo para commit/push final.

### Observaciones

Agregar aca cualquier hallazgo del simulator:

-
