# Paquete de Lanzamiento — RENACER `1.0.0`

**Versión final de lanzamiento:** `1.0.0` (promovida desde `1.0.0-rc.1`)  
**Fecha de cierre de versión:** `2026-11-24`  
**Proyecto Firebase (sin cambios ni facturación):** `gen-lang-client-0791565383`  
**Base de datos Cloud Firestore:** `ai-studio-da412c5f-4916-43d8-a77e-595343cd22e0`  
**Entorno de desarrollo (`ais-dev`):** `https://ais-dev-au33k5srpusdgsc5bctw5n-896881508589.us-east1.run.app/`  
**Entorno compartido (`ais-pre`):** `https://ais-pre-au33k5srpusdgsc5bctw5n-896881508589.us-east1.run.app/` (pendiente de actualización mediante `Share / Publish`)

---

## 1. Registro de Versión y Respaldo (`1.0.0`)

| Elemento | Valor / Estado |
|---|---|
| Versión del paquete (`package.json`) | `1.0.0` |
| Versión en UI y configuración legal (`APP_VERSION`) | `1.0.0` |
| Versión de consentimiento informado (`CONSENT_VERSION`) | `2026-11-v1` |
| Nombre en `metadata.json` | `RENACER` |
| Motor frontend | React `19.0.1` + Vite `8.3.0` + Tailwind CSS `4.3.3` + `vite-plugin-pwa` `2.0.0` |
| Servidor backend (`server.ts`) | Express `4.21.2` + `firebase-admin` `14.5.1` (`verifyIdToken`) + `@google/genai` `3.6.1` (`gemini-4-hydrogen`) |
| Reglas de seguridad (`firestore.rules`) | `rules_version = '2'` (822 líneas, 20 bloques validados con `@firebase/eslint-plugin-security-rules`) |
| Esquema IR (`firebase-blueprint.json`) | Sincronizado con 17 entidades y colecciones en Firestore |
| Estado de `ais-pre` | **Pendiente de `Share / Publish`** (no afirmar que `ais-pre` está actualizado hasta completar la publicación única) |

### Cómo generar respaldo manual del código y reglas antes de publicar
1. **Código fuente y configuración:** conservar una copia íntegra de `/src`, `/public`, `/server.ts`, `/firestore.rules`, `/firebase-blueprint.json`, `/firebase-applet-config.json`, `/vite.config.ts`, `/package.json`, `/index.html` y `/docs`. (Si usas Git/GitHub, crear etiqueta `git tag v1.0.0`).
2. **Base de datos Cloud Firestore:** en el plan actual Starter Tier sin facturación, no se habilitan exportaciones automáticas de GCP Cloud Storage; cada usuario conserva su derecho de respaldo individual inmediato en JSON (`Perfil y seguridad > Exportar todos mis datos (.json)`). No se modifican ni eliminan registros ni cuentas existentes.

---

## 2. Principio Rector de Acceso — Plataforma 100% Gratuita

> **“RENACER es una plataforma gratuita para acompañarte en tu proceso de reconstrucción personal.”**

- **Sin modelo comercial ni cobros:** no existen planes de pago, suscripciones, membresías, funciones bloqueadas ni pasarelas de pago.
- **Acceso universal completo:** los módulos A–G están disponibles gratuitamente en su totalidad para todas las personas usuarias.
- **Sin publicidad ni venta de datos:** prohibido incorporar anuncios, rastreadores comerciales o comercialización de información personal o sensible.
- **Límites técnicos de RENACER IA:** los topes por `UID` (20 consultas cada 15 minutos y 80 cada 24 horas en `/api/ai/chat`, más 20 envíos cada 10 minutos en `/api/community/moderate`) se conservan exclusivamente por seguridad, capacidad de infraestructura y prevención de abuso automatizado — **nunca** como mecanismo de monetización.

---

## 3. Notas de Lanzamiento (`1.0.0`)

- **Versionado unificado (`1.0.0`):** `package.json`, `vite.config.ts` (manifiesto PWA), `src/data/legalAndDocs.ts`, `AuthScreen.tsx`, `LegalDocsModal.tsx` y documentación de lanzamiento alineados en la versión `1.0.0`.
- **Acceso 100% gratuito verificado:** presentación, términos, FAQ, manual, manifiesto PWA y paquete de lanzamiento alineados con gratuidad total, cero publicidad y cero pasarelas de pago.
- **Método de autenticación oficial conservado:** acceso único mediante **Continuar con Google** en Firebase Authentication; sin habilitar Correo/Contraseña y manteniendo intactas las reglas `firestore.rules` y el aislamiento por `UID`.
- **Configuración jurídica centralizada (`LEGAL_ENTITY_CONFIG` en `src/data/legalAndDocs.ts`):** incluye los datos expresamente autorizados por el propietario (`José Andrés Martínez Colorado`, `Sóstenes Rocha 45, Zona Centro, Acámbaro, Guanajuato, México`, `lift884@gmail.com` para privacidad/ARCO y soporte), sin inventar RFC, código postal ni razón social; conserva edad mínima provisional (`18 años`), jurisdicción (`México`), aviso no médico/no de emergencias y advertencia administrativa en pantalla (`IS_PUBLIC_LAUNCH_LEGAL_READY === false`) mientras falten el horario/SLA de soporte y la revisión jurídica profesional en México.
- **Protección contra abuso y cuotas técnicas (`server.ts`):** limitador de frecuencia por `UID` en `/api/ai/chat` y `/api/community/moderate` con HTTP `429` y cabecera `Retry-After`, manteniendo `GEMINI_API_KEY` exclusivamente en el servidor.
- **Seguridad clínica y líneas de crisis verificadas (México y LATAM/ES/EE. UU.):** detección ampliada de intoxicación aguda, coma etílico, autolesión, sobredosis y abstinencia peligrosa; inclusión de **911**, **CONASAMA Línea de la Vida (`800 911 2000`)**, **SAPTEL (`55 5259 8121`)** y **LOCATEL CDMX (`*0311` / `55 5658 1111`)** verificados al `2026-11-24`, con aviso explícito de que RENACER IA **no** cuenta con supervisión humana en tiempo real.
- **Eliminación integral de cuenta (`src/services/firebaseVault.ts`):** al borrar cuenta (previa reautenticación reciente), elimina las 15 subcolecciones privadas, perfil `users/{uid}`, publicaciones y respuestas propias, retira atómicamente reacciones/reportes en hilos visibles y limpia `IndexedDB`, `sessionStorage` y preferencias locales.
- **Control de caché local por usuario:** interruptor en `Perfil y seguridad` para activar o desactivar el respaldo local `IndexedDB` en dispositivos compartidos.

---

## 4. Inventario de Funcionalidades (Módulos A–G — 100% Gratuitos)

- **A. RENACER IA (`RenacerAIView.tsx` + `/api/ai/chat`):** acompañante automatizado protegido por Firebase ID Token (`email_verified == true`), límite técnico de uso por UID, contexto mínimo no identificable, detección determinista de crisis y reglas clínicas estrictas (sin diagnósticos, fármacos ni desintoxicación casera).
- **B. Recuperación y Anticaídas (`RecoveryView.tsx`, `AssessmentView.tsx`, `alertEngine.ts`):** evaluación inicial, plan diario por bloques horarios, detonantes, señales de alerta, estrategias de afrontamiento, registro de deseos/consumo/apuestas/recaídas, herramientas HALT, chequeo preventivo de riesgo y reinicio compasivo sin perder historial de etapas.
- **C. Bienestar (`DashboardView.tsx`, `JournalView.tsx`, `ModulesView.tsx`):** diario emocional con búsqueda y notas, estado emocional diario (ánimo, energía, estrés), hábitos diarios con racha visual de 7 días, metas personales y métricas comprensibles.
- **D. Finanzas (`ModulesView.tsx`):** ingresos, gastos, ahorro, deudas, abonos directos a deuda, balance neto, filtros por tipo y fecha (30 días, mes actual, rango personalizado) y metas financieras integradas.
- **E. Red de apoyo (`ModulesView.tsx` + `HelpDrawer.tsx`):** contactos de confianza con llamada directa `tel:`, opción para ocultar teléfonos en pantalla, bitácora familiar/relacional, respirador 4-7-8, pausa de 10 minutos, anclaje 5-4-3-2-1 y directorio de emergencia filtrable por país.
- **F. Comunidad (`ModulesView.tsx` + `communityService.ts` + `/api/community/moderate`):** muro con categorías (`logros`, `apoyo`, `estrategias`), comentarios, reacciones de apoyo atómicas, bloqueo local por alias, denuncia con ocultamiento automático al acumular 2 reportes y moderación automática anti-PII en servidor.
- **G. Perfil, Privacidad y Documentación (`ProfileSecurityView.tsx` + `LegalDocsModal.tsx`):** edición de perfil/moneda/lema/país de emergencia, instalación PWA, control de caché local, exportación completa en `.json`, cierre de sesión, eliminación definitiva con reautenticación con Google y acceso a los 10 documentos de privacidad/legales y guías.

---

## 5. Kit de Identidad y Marca

- **Nombre:** `RENACER`
- **Eslogan principal:** *RENACER — Una nueva oportunidad comienza contigo*
- **Eslogan secundario / subtítulo:** *Reconstruye tus hábitos. Recupera el control. Avanza un día a la vez.*
- **Mensaje institucional obligatorio:** *RENACER es una plataforma gratuita para acompañarte en tu proceso de reconstrucción personal.*
- **Descripción corta:** RENACER es una plataforma gratuita para acompañarte en tu proceso de reconstrucción personal. Todas las herramientas están disponibles sin costo, sin publicidad y sin venta de datos.
- **Descripción larga:** Disponible en `BRAND_IDENTITY.longDescription` (`src/data/legalAndDocs.ts`) y en la vista pública de bienvenida (`AuthScreen.tsx`), libre de promesas médicas o curativas y sin planes comerciales de pago.
- **Iconos y visuales:** `/public/icon.svg`, `/public/apple-touch-icon.png`, `/public/pwa-192x192.png`, `/public/pwa-512x512.png`, `/public/pwa-maskable-512x512.png`, `/src/assets/images/renacer_sanctuary_hero_1795465214434.jpg`, `/src/assets/images/renacer_breathing_leaf_1795465215721.jpg`, `/src/assets/images/renacer_editorial_journal_1795549112370.jpg`.
- **Paleta:** `#1B4332` (Primario), `#F7F4EC` (Fondo Arena), `#14241C` (Texto), `#EBF3EE` (Musgo), `#991B1B` (Urgencias).
- **Tipografía:** `Fraunces`, `Plus Jakarta Sans`, `JetBrains Mono`.

---

## 6. Manual de Usuario Breve

1. **Acceso gratuito:** entra en la URL compartida o PWA instalada (100% gratuita, sin suscripciones ni cobros), selecciona **Continuar con Google**, configura tu alias, enfoque, fecha de inicio y acepta el Consentimiento Informado.
2. **Evaluación inicial:** dedica 2 minutos a registrar horarios vulnerables y detonantes para personalizar alertas preventivas. Todas las secciones están habilitadas sin restricciones comerciales.
3. **Uso diario:** en **Panel** marca tu estado emocional, plan diario y hábitos; en **Diario** escribe reflexiones privadas; en **Metas y vida** lleva tus finanzas, contactos seguros y comunidad por alias; en **RENACER IA** conversa con el acompañante automatizado (sujeto únicamente a límites técnicos de seguridad/capacidad).
4. **Momentos difíciles:** toca **Necesito ayuda ahora** para respiración 4-7-8, pausa 10 min, anclaje 5-4-3-2-1, llamada a contacto seguro o líneas oficiales (911 / `800 911 2000`).
5. **Respaldo o baja:** entra a **Perfil y seguridad** para descargar tu respaldo `.json`, desactivar caché local o eliminar tu cuenta de manera permanente.

---

## 7. Guía de Administración y Documentación Jurídica Centralizada

- **Autenticación conservada:** RENACER opera únicamente con **Continuar con Google** en Firebase Authentication. No se debe habilitar Correo/Contraseña ni alterar la configuración actual de Firebase ni las reglas de aislamiento por `UID`. Verificar únicamente que los dominios autorizados en Firebase (`ais-dev-*`, `ais-pre-*` y futuro dominio propio) permanezcan vigentes.
- **Reglas de Firestore:** cualquier cambio futuro en `firestore.rules` debe pasar primero `npx eslint firestore.rules` y nunca relajar `isOwner` o `isVerified()`.
- **Variables de entorno y secretos:** `GEMINI_API_KEY` reside únicamente en el servidor (`Settings > Secrets` en AI Studio o variable de entorno en Cloud Run). Nunca usar prefijo `VITE_` para `GEMINI_API_KEY`.
- **Límites Starter Tier y operación gratuita:** no habilitar facturación ni suscripciones; `firebase-admin` verifica tokens con claves públicas (`verifyIdToken`) y toda operación de datos permanece en el cliente autenticado + reglas estrictas. No añadir pasarelas de pago ni redes publicitarias.
- **Documentación jurídica centralizada (`src/data/legalAndDocs.ts`):**
  - **Datos publicados por autorización expresa del propietario:**
    - `controllerName`: `José Andrés Martínez Colorado`.
    - `controllerAddressMexico`: `Sóstenes Rocha 45, Zona Centro, Acámbaro, Guanajuato, México` (sin código postal ni RFC inventados).
    - `privacyAndArcoEmail`: `lift884@gmail.com`.
    - `supportEmail`: `lift884@gmail.com`.
  - **Requisitos aún pendientes conforme a la legislación mexicana (LFPDPPP y su Reglamento) antes de declarar cumplimiento definitivo (`IS_PUBLIC_LAUNCH_LEGAL_READY === false`):**
    1. `retentionAndDeadlinesReviewed` (`false`): revisión profesional por abogado en México sobre consentimiento expreso para datos sensibles de salud/adicciones y financieros (Art. 9 LFPDPPP), cláusula de transferencias internacionales a infraestructura en nube (Firebase / Google Gemini, Art. 36 LFPDPPP), plazos de conservación, bloqueo y supresión por inactividad (Art. 11 y 37 Reglamento), acreditación y plazos legales ARCO (20 + 15 días hábiles, Art. 32 LFPDPPP), validación de edad mínima (`18 años`) y confirmación opcional de código postal o aviso simplificado.
    2. `supportHoursAndSla` (`null`): definir horario y tiempo estimado oficial de atención para soporte técnico en `lift884@gmail.com`.

---

## 8. Planes de Operación, Soporte, Incidentes y Monitoreo

### Plan de Soporte
- **Canales:** correo oficial activo de privacidad/ARCO y soporte técnico: `lift884@gmail.com`; pendiente definir únicamente `supportHoursAndSla` en `LEGAL_ENTITY_CONFIG` (`src/data/legalAndDocs.ts`).
- **Alcance:** soporte técnico atiende fallos de acceso con Google, sincronización, exportación o reportes de comunidad; **nunca** atiende emergencias médicas ni crisis emocionales.

### Plan de Respuesta a Incidentes
1. **Incidente de seguridad / fuga / regla permisiva:** congelar publicación (`Share / Publish` o tráfico), inspeccionar `firestore.rules`, rotar `GEMINI_API_KEY` en Secrets si estuvo involucrada, revisar accesos en Firebase Console y notificar a usuarios afectados conforme a asesoría legal.
2. **Abuso en comunidad / spam:** las publicaciones con 2 reportes se auto-ocultan; ante abuso coordinado, desactivar temporalmente `POST /api/community/moderate` o ajustar límites técnicos en `checkUidRateLimit` (`server.ts`).
3. **Fallo de Gemini API o cuota técnica alcanzada:** el backend responde HTTP `429` o `502` legible sin exponer llaves; los módulos locales (diario, hábitos, respiración, líneas de emergencia) siguen operativos.

### Plan de Monitoreo (Starter Tier)
- Verificar semanalmente `GET /api/health` (`aiConfigured: true`, `authVerifierConfigured: true`, `communityStorage: 'cloud_firestore'`).
- Revisar en Firebase Console las métricas gratuitas de Authentication, cuotas diarias gratuitas de Cloud Firestore y logs de Cloud Run buscando incrementos inusuales de `401`, `403`, `429` o `502`.

---

## 9. Estado de Verificación Técnica y Protocolo Único de Validación Operativa Final

### A. Verificaciones automatizadas del paquete local `1.0.0`
- Se validan antes de publicar: `tsc --noEmit` (`0`), `npm run build` (genera `/dist`, `sw.js` y `manifest.webmanifest` con versión `1.0.0` y sin secretos en cliente), `npx eslint firestore.rules` (`0`) y `bun audit` (`0` vulnerabilidades).
- Confirmado en código: cero pasarelas de pago, cero suscripciones, cero publicidad, cero venta de datos, mensaje institucional gratuito visible y `Continuar con Google` como acceso oficial conservado.

### B. Protocolo Único de Validación Operativa Final en `ais-pre` (Pendiente — Ejecutar una sola vez tras `Share / Publish`)
> **Nota de integridad:** Ninguna de estas pruebas sobre `ais-pre` o dispositivos físicos ha sido simulada ni se declara aprobada antes de su ejecución real. No utilizar cuentas reales de usuarios ni la cuenta del propietario (`lift884@gmail.com`) para pruebas destructivas.

1. **Publicación única en `ais-pre`:** ejecutar `Share / Publish` desde AI Studio para actualizar `https://ais-pre-au33k5srpusdgsc5bctw5n-896881508589.us-east1.run.app/`.
2. **Inicio de sesión con Google (Cuenta de Prueba A):** abrir `ais-pre` en Safari (iPhone) y verificar que carga la versión `1.0.0`, completar **Continuar con Google**, aceptar el consentimiento informado y guardar registros en Panel/Plan, Diario, Anticaídas, Finanzas y Red de apoyo.
3. **Consulta autenticada real a RENACER IA:** enviar un mensaje con Cuenta de Prueba A en `RENACER IA`, verificar respuesta útil desde `/api/ai/chat` y comprobar que no se expone `GEMINI_API_KEY` en red ni UI.
4. **Persistencia y aislamiento por UID (Cuenta de Prueba B):** iniciar sesión en Android Chrome (o sesión privada independiente) con Cuenta de Prueba B, crear un registro distinto y confirmar que Cuenta B no ve diarios, finanzas, plan, contactos ni conversaciones IA de Cuenta A, y que los datos persisten tras cerrar y reabrir la PWA.
5. **Instalación y funcionamiento PWA (iPhone Safari + Android Chrome):** instalar la PWA en pantalla de inicio en ambos dispositivos, verificar icono `1.0.0`, actualización del Service Worker sin bloqueos y aviso offline al desconectar red.
6. **Eliminación completa de una cuenta temporal:** desde Cuenta de Prueba B (nunca sobre cuentas reales), ejecutar `Perfil y seguridad > Eliminar mi cuenta`, reautenticar con Google y confirmar borrado de datos privados, publicaciones/respuestas de prueba y limpieza de almacenamiento local.

---

## 10. Regla de Apertura: Beta Privada vs. Lanzamiento Público

- **Beta Privada controlada (tras completar la Sección 9B):** viable informando expresamente que RENACER es 100% gratuita, que muestra ya los datos del responsable autorizado y que sus documentos legales están en **revisión profesional** (sin certificación jurídica definitiva).
- **Lanzamiento Público abierto (bloqueado hasta completar revisión jurídica y SLA):** no declarar cumplimiento jurídico certificado ni abrir al público general hasta que un especialista en derecho mexicano valide los puntos pendientes de LFPDPPP, se defina `supportHoursAndSla` y `IS_PUBLIC_LAUNCH_LEGAL_READY` pase a `true`.
