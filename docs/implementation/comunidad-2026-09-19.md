# Comunidad — 16 tarjetas, lista Comunidad -Daro

Decisiones acordadas con grill-me:
- 10 burbujas más espaciadas; Mostrar 10 más. Quitar acceso superior a experiencias.
- Siempre primero la persona más cercana; afinidad desempata. Sin ubicación al final por afinidad.
- Descartes ocultos por 30 días.
- Swipe derecho conecta, izquierdo descarta dentro del perfil. Avance automático al siguiente.
- Toque mitad derecha/izquierda cambia foto; indicadores. Corregir Ver más iOS.
- Burbujas Vibes al conectar. Conexión mutua: ¡Hay conexión!, Enviar mensaje / Seguir descubriendo.
- ✓ guardado en servidor, ✓✓ recibido por la app; color azul al ver el mensaje.
- Grupos: todos los destinatarios del momento del envío que siguen siendo miembros.
- Contadores de mensajes sin leer por conversación/grupo y total en pestaña; excluyen propios.
- Corregir teclado chat iOS y creación de grupo. Ocultar subtítulo cuando hay conversaciones.
- Salir desde tres puntos con confirmación; mensajes permanecen, pierde acceso al historial.
- Creador transfiere a integrante más antiguo; último miembro elimina grupo.
- Avisos de salida y transferencia en el chat.

Tarjetas: 267, 228, 256, 252, 253, 257, 254, 258, 259, 260, 261, 285, 286, 287, 288, 292.

## Implementación

- Descubrimiento: se recorre el conjunto de candidatos elegibles antes de ordenar por distancia; no se limita a los 200 registros más nuevos. Intereses compartidos desempatan. Burbujas distribuidas en dos columnas con movimiento suave y carga visual de 10 en 10.
- Perfil: swipe horizontal para decidir, toque por mitades para fotos, bloqueo durante guardado y avance tras respuesta exitosa. En una conexión mutua se muestra la celebración y se retoma el siguiente perfil al volver.
- Ver más usa AnimatedSheetModal dentro del mismo modal nativo, evitando la presentación simultánea de dos modales en iOS.
- Nuevo grupo usa KeyboardSheetModal; chat directo usa padding en iOS y el ajuste nativo de Android sin sumar otra vez toda la altura del teclado.
- Tabla de recibos con destinatarios por mensaje y funciones que sólo permiten confirmar los recibos propios. La app recibe el contenido antes de confirmar entrega; sólo registra lectura en primer plano, con el chat enfocado y el mensaje visible durante al menos 500 ms. Actualización por consulta periódica en primer plano.
- Salida de grupo atómica, con bloqueo del grupo para evitar carreras, transferencia determinista por joined_at y user_id, mensajes de sistema y limpieza de recibos. Los miembros preexistentes comparten fecha de migración; empates se resuelven por user_id.
- Migración desplegada en Mindora Vibes (`mhmpjezgdvnqyqsnabuq`). Historial de migraciones registrado.

## Validación

- `node --test scripts/community.test.cjs scripts/onboarding.test.cjs`: 15 pruebas aprobadas, incluidas cercanía, afinidad/sin ubicación, vencimiento exacto a 30 días y regresiones de onboarding.
- `scripts/community-rls.test.sql`: aprobado antes del despliegue y contra el esquema desplegado. Verifica entrega, lectura, contadores de chats/grupos/eventos, exclusión de mensajes propios, lectura de eventos, aislamiento, salida, sucesión, avisos de sistema no falsificables y eliminación del grupo vacío. Todo con fixtures y ROLLBACK, sin mensajes a personas reales.
- Bundles finales de Android e iOS generados. Compilación nativa iOS exitosa, instalada y abierta en iPhone 17 Pro simulado.
- TypeScript: persisten los 14 diagnósticos preexistentes; sin nuevos.
- Revisión visual interactiva pendiente: la herramienta de control del simulador devolvió `Computer Use permissions are not granted`.
- Las tarjetas no se movieron a Done mientras está pendiente la revisión visual en dispositivos.

El contador total también incluye los grupos de eventos/desafíos mediante sus marcadores de lectura existentes. Los nuevos tildes por destinatario se aplican a chats directos y grupos privados de Comunidad.
