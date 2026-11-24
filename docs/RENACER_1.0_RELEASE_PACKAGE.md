# Paquete de Lanzamiento — RENACER 1.0 (Candidata `1.0.0-rc.1`)

**Fecha de congelamiento técnico (RC-1):** `2026-11-24`  
**Proyecto Firebase (sin cambios ni facturación):** `gen-lang-client-0791565383`  
**Base de datos Cloud Firestore:** `ai-studio-da412c5f-4916-43d8-a77e-595343cd22e0`  
**Entorno de desarrollo (`ais-dev`):** `https://ais-dev-au33k5srpusdgsc5bctw5n-896881508589.us-east1.run.app/`  
**Entorno compartido (`ais-pre`):** `https://ais-pre-au33k5srpusdgsc5bctw5n-896881508589.us-east1.run.app/`

---

## 1. Registro de Versión y Respaldo Pre-Congelamiento (Fase 1)

| Elemento | Valor / Estado |
|---|---|
| Versión del paquete (`package.json`) | `1.0.0-rc.1` |
| Versión de consentimiento informado (`CONSENT_VERSION`) | `2026-11-v1` |
| Nombre en `metadata.json` | `RENACER` |
| Motor frontend | React `19.0.1` + Vite `8.3.0` + Tailwind CSS `4.3.3` + `vite-plugin-pwa` `2.0.0` |
| Servidor backend (`server.ts`) | Express `4.21.2` + `firebase-admin` `14.5.1` (`verifyIdToken`) + `@google/genai` `3.6.1` (`gemini-4-hydrogen`) |
| Reglas de seguridad (`firestore.rules`) | `rules_version = '2'` (822 líneas, 20 bloques validados con `@firebase/eslint-plugin-security-rules`) |
| Esquema IR (`firebase-blueprint.json`) | Sincronizado con 17 entidades y colecciones en Firestore |

### Cómo generar respaldo manual del código y reglas antes de publicar
1. **Código fuente y configuración:** conservar una copia íntegra de `/src`, `/public`, `/server.ts`, `/firestore.rules`, `/firebase-blueprint.json`, `/firebase-applet-config.json`, `/vite.config.ts`, `/package.json`, `/index.html` y `/docs`. (Si usas Git/GitHub, crear etiqueta `git tag v1.0.0-rc.1`).
2. **Base de datos Cloud Firestore:** en el plan actual Starter Tier sin facturación, no se habilitan exportaciones automáticas de GCP Cloud Storage; cada usuario conserva su derecho de respaldo individual inmediato en JSON (`Perfil y seguridad > Exportar todos mis datos (.json)`). No se modifican ni eliminan registros existentes.

---

## 2. Notas de Lanzamiento (`1.0.0-rc.1`)

### Lo nuevo y reforzado en esta candidata de lanzamiento
- **Protección contra abuso y cuotas (`server.ts`):** limitador de frecuencia por `UID` en `/api/ai/chat` (20 consultas/15 min y 80/24 h) y `/api/community/moderate` (20 envíos/10 min) con HTTP `429` y cabecera `Retry-After`.
- **Seguridad clínica y líneas de crisis verificadas (México y LATAM/ES/EE. UU.):** detección ampliada de intoxicación aguda, coma etílico, autolesión, sobredosis y abstinencia peligrosa; inclusión de **911**, **CONASAMA Línea de la Vida (`800 911 2000`)**, **SAPTEL (`55 5259 8121`)** y **LOCATEL CDMX (`*0311` / `55 5658 1111`)** verificados al `2026-11-24`, con aviso explícito de que RENACER IA **no** cuenta con supervisión humana en tiempo real.
- **Eliminación integral de cuenta (`src/services/firebaseVault.ts`):** al borrar cuenta (previa reautenticación reciente), elimina las 15 subcolecciones privadas, perfil `users/{uid}`, publicaciones y respuestas propias, retira atómicamente reacciones/reportes en hilos visibles y limpia `IndexedDB`, `sessionStorage` y preferencias locales.
- **Control de caché local por usuario:** interruptor en `Perfil y seguridad` para activar o desactivar el respaldo local `IndexedDB` en dispositivos compartidos.
- **Centro Legal, Privacidad, Guías y Marca in-app (`LegalDocsModal.tsx`, `legalAndDocs.ts`):** 10 documentos legales/privacidad en español (con campos `[PENDIENTE DE DEFINICIÓN LEGAL]` explícitamente señalados para validación jurídica), guía rápida, FAQ, directorio oficial y guía de identidad visual.

---

## 3. Inventario de Funcionalidades (Módulos A–G)

- **A. RENACER IA (`RenacerAIView.tsx` + `/api/ai/chat`):** acompañante automatizado protegido por Firebase ID Token (`email_verified == true`), límite de uso por UID, contexto mínimo no identificable, detección determinista de crisis y reglas clínicas estrictas (sin diagnósticos, fármacos ni desintoxicación casera).
- **B. Recuperación y Anticaídas (`RecoveryView.tsx`, `AssessmentView.tsx`, `alertEngine.ts`):** evaluación inicial, plan diario por bloques horarios, detonantes, señales de alerta, estrategias de afrontamiento, registro de deseos/consumo/apuestas/recaídas, herramientas HALT, chequeo preventivo de riesgo y reinicio compasivo sin perder historial de etapas.
- **C. Bienestar (`DashboardView.tsx`, `JournalView.tsx`, `ModulesView.tsx`):** diario emocional con búsqueda y notas, estado emocional diario (ánimo, energía, estrés), hábitos diarios con racha visual de 7 días, metas personales y métricas comprensibles.
- **D. Finanzas (`ModulesView.tsx`):** ingresos, gastos, ahorro, deudas, abonos directos a deuda, balance neto, filtros por tipo y fecha (30 días, mes actual, rango personalizado) y metas financieras integradas.
- **E. Red de apoyo (`ModulesView.tsx` + `HelpDrawer.tsx`):** contactos de confianza con llamada directa `tel:`, opción para ocultar teléfonos en pantalla, bitácora familiar/relacional, respirador 4-7-8, pausa de 10 minutos, anclaje 5-4-3-2-1 y directorio de emergencia filtrable por país.
- **F. Comunidad (`ModulesView.tsx` + `communityService.ts` + `/api/community/moderate`):** muro con categorías (`logros`, `apoyo`, `estrategias`), comentarios, reacciones de apoyo atómicas, bloqueo local por alias, denuncia con ocultamiento automático al acumular 2 reportes y moderación automática anti-PII en servidor.
- **G. Perfil, Privacidad y Documentación (`ProfileSecurityView.tsx` + `LegalDocsModal.tsx`):** edición de perfil/moneda/lema/país de emergencia, gestión de contraseña (si aplica), instalación PWA, control de caché local, exportación completa en `.json`, cierre de sesión, eliminación definitiva con reautenticación y acceso a los 10 documentos de privacidad/legales y guías.

---

## 4. Kit de Identidad y Marca (Fase 7)

- **Nombre:** `RENACER`
- **Eslogan principal:** *RENACER — Una nueva oportunidad comienza contigo*
- **Eslogan secundario / subtítulo:** *Reconstruye tus hábitos. Recupera el control. Avanza un día a la vez.*
- **Descripción corta:** Acompañamiento privado para fortalecer hábitos, atravesar impulsos, ordenar tus finanzas personales y avanzar un día a la vez.
- **Descripción larga:** Disponible en `BRAND_IDENTITY.longDescription` (`src/data/legalAndDocs.ts`) y en la vista pública de bienvenida (`AuthScreen.tsx`), libre de promesas médicas o curativas.
- **Iconos y visuales:** `/public/icon.svg`, `/public/apple-touch-icon.png`, `/public/pwa-192x192.png`, `/public/pwa-512x512.png`, `/public/pwa-maskable-512x512.png`, `/src/assets/images/renacer_sanctuary_hero_1795465214434.jpg`, `/src/assets/images/renacer_breathing_leaf_1795465215721.jpg`, `/src/assets/images/renacer_editorial_journal_1795549112370.jpg`.
- **Paleta:** `#1B4332` (Primario), `#F7F4EC` (Fondo Arena), `#14241C` (Texto), `#EBF3EE` (Musgo), `#991B1B` (Urgencias).
- **Tipografía:** `Fraunces`, `Plus Jakarta Sans`, `JetBrains Mono`.

---

## 5. Manual de Usuario Breve

1. **Acceso:** entra en la URL compartida o PWA instalada, selecciona **Continuar con Google** (o correo si está habilitado), configura tu alias, enfoque, fecha de inicio y acepta el Consentimiento Informado.
2. **Evaluación inicial:** dedica 2 minutos a registrar horarios vulnerables y detonantes para personalizar alertas preventivas.
3. **Uso diario:** en **Panel** marca tu estado emocional, plan diario y hábitos; en **Diario** escribe reflexiones privadas; en **Metas y vida** lleva tus finanzas, contactos seguros y comunidad por alias.
4. **Momentos difíciles:** toca **Necesito ayuda ahora** para respiración 4-7-8, pausa 10 min, anclaje 5-4-3-2-1, llamada a contacto seguro o líneas oficiales (911 / `800 911 2000`).
5. **Respaldo o baja:** entra a **Perfil y seguridad** para descargar tu respaldo `.json`, desactivar caché local o eliminar tu cuenta de manera permanente.

---

## 6. Guía de Administración (Operación sin facturación)

- **Firebase Authentication:** actualmente funciona con **Google Sign-In**. Para habilitar también Correo/Contraseña sin errores (`auth/operation-not-allowed`), ir a *Firebase Console > Authentication > Sign-in method > Email/Password > Enable*. Verificar que tanto `ais-dev-*` como `ais-pre-*` (y futuro dominio propio) estén en *Authorized domains*.
- **Reglas de Firestore:** cualquier cambio en `firestore.rules` debe pasar primero `npx eslint firestore.rules` y desplegarse mediante `deploy_firebase` / Firebase CLI sin relajar condiciones de `isOwner` o `isVerified()`.
- **Variables de entorno y secretos:** `GEMINI_API_KEY` debe residir únicamente en el servidor (`Settings > Secrets` en AI Studio o variable de entorno en Cloud Run). Nunca usar prefijo `VITE_` para `GEMINI_API_KEY`.
- **Límites Starter Tier:** `firebase-admin` verifica tokens con claves públicas (`verifyIdToken`), pero las lecturas/escrituras a Firestore desde el servidor con IAM están bloqueadas por el plan; mantener toda operación de datos en cliente autenticado + reglas estrictas.

---

## 7. Planes de Operación, Respaldo, Soporte, Incidentes y Monitoreo

### Plan de Soporte
- **Canales:** definir correo/canal oficial en `src/data/legalAndDocs.ts` antes del lanzamiento público (actualmente marcado como `[PENDIENTE DE DEFINICIÓN LEGAL]`).
- **Alcance:** soporte técnico atiende fallos de acceso, sincronización, exportación o reportes de comunidad; **nunca** atiende emergencias médicas ni crisis emocionales.

### Plan de Respuesta a Incidentes
1. **Incidente de seguridad / fuga / regla permisiva:** congelar publicación (`Share / Publish` o tráfico), inspeccionar `firestore.rules`, rotar `GEMINI_API_KEY` en Secrets si estuvo involucrada, revisar accesos en Firebase Console y notificar a usuarios afectados conforme a asesoría legal.
2. **Abuso en comunidad / spam:** las publicaciones con 2 reportes se auto-ocultan; ante abuso coordinado, desactivar temporalmente `POST /api/community/moderate` o ajustar límites en `checkUidRateLimit` (`server.ts`).
3. **Fallo de Gemini API o cuota agotada:** el backend responde HTTP `429` o `502` legible sin exponer llaves; los módulos locales (diario, hábitos, respiración, líneas de emergencia) siguen operativos.

### Plan de Monitoreo (Starter Tier)
- Verificar semanalmente `GET /api/health` (`aiConfigured: true`, `authVerifierConfigured: true`, `communityStorage: 'cloud_firestore'`).
- Revisar en Firebase Console las métricas gratuitas de Authentication (inicios de sesión fallidos), cuotas diarias de Cloud Firestore y logs de Cloud Run buscando incrementos inusuales de `401`, `403`, `429` o `502`.

---

## 8. Lista de Verificación Pre-Publicación

- [x] `tsc --noEmit` sin errores (`0`).
- [x] `npm run build` genera `/dist`, `sw.js` y `manifest.webmanifest` sin exponer secretos.
- [x] `npx eslint firestore.rules` sin advertencias ni errores.
- [x] `bun audit` con 0 vulnerabilidades.
- [x] Límites por UID implementados en `/api/ai/chat` y `/api/community/moderate`.
- [x] Números de emergencia de México verificados y actualizados (`2026-11-24`).
- [x] 10 documentos legales/privacidad accesibles dentro de la app.
- [ ] **Pendiente legal:** completar razón social, domicilio en México, correo ARCO/soporte y plazos legales en `src/data/legalAndDocs.ts` con abogado.
- [ ] **Pendiente operativo:** volver a publicar `Share / Publish` para actualizar `ais-pre` desde el build viejo (`19:08:55 GMT`) a `1.0.0-rc.1`.
- [ ] **Pendiente QA final en `ais-pre` post-publicación:** probar con 2 cuentas reales en iPhone Safari (PWA) y Android Chrome el aislamiento entre UIDs, llamada autenticada real a Gemini IA y eliminación completa de cuenta de prueba.

---

## 9. Estrategia de Beta Privada y Lanzamiento Público

### Fase A — Beta Privada (10 a 25 personas invitadas)
1. Republicar el build `1.0.0-rc.1` hacia `ais-pre`.
2. Compartir acceso controlado advirtiendo expresamente el carácter de beta privada y los campos legales en revisión.
3. Validar en condiciones reales (iPhone Safari + Android Chrome): login Google, alta/edición/recarga de los módulos A–G, aislamiento real entre 2 cuentas de prueba, respuesta real de RENACER IA, caché offline y exportación JSON.
4. Corregir cualquier incidencia detectada antes de abrir registros generales.

### Fase B — Lanzamiento Público (Solo tras cerrar todos los bloqueantes)
1. Completar y validar con asesoría legal en México los 10 documentos en `src/data/legalAndDocs.ts` (eliminar todo `[PENDIENTE DE DEFINICIÓN LEGAL]`).
2. Confirmar correo de soporte activo y protocolo ARCO operativo.
3. Decidir si se habilita Correo/Contraseña en Firebase Console además de Google Sign-In.
4. Evaluar capacidad/cuotas de Cloud Firestore y Gemini API según volumen esperado antes de difusión abierta.
