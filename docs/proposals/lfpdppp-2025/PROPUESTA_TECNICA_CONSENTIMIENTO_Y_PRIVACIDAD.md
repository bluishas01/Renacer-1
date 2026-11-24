# Propuesta Técnica Separada — Consentimiento Granular y Privacidad (LFPDPPP 2025)

**Estado:** Propuesta separada y documentada para revisión jurídica previa a una futura versión (`1.1.0` o posterior).  
**Versión publicada en `ais-pre`:** se mantiene intacta en **`1.0.0`** (no modificada, no desplegada, Firebase sin cambios, cero facturación, sin eliminación de usuarios ni registros).  
**Nota sobre control de versiones:** el espacio de trabajo no contiene un repositorio `.git` inicializado (`fatal: not a git repository`), por lo que la propuesta separada se implementó de forma desacoplada en `/src/proposals/lfpdppp2025/` y `/docs/proposals/lfpdppp-2025/` sin alterar el flujo activo de `1.0.0`.

---

## 1. Archivos incluidos en esta propuesta separada

| Archivo | Propósito | ¿Afecta la versión `1.0.0` activa? |
|---|---|---|
| `src/proposals/lfpdppp2025/lfpdppp2025LegalTexts.ts` | Textos de Aviso Simplificado e Integral (LFPDPPP 20 mar 2025 + reforma 14 nov 2025), 3 casillas separadas inicialmente desmarcadas, tabla de encargados (Firebase/Gemini), política de revocación y constructor `buildConsentAcceptanceEvidence()`. | No (módulo aislado para revisión/futura integración) |
| `src/proposals/lfpdppp2025/GranularConsentProposalPanel.tsx` | Prototipo funcional React/TypeScript del flujo de Aviso Simplificado previo + casillas separadas desmarcadas + generación de evidencia auditable + panel de revocación granular y consecuencias. | No (no montado en `App.tsx` ni `AuthScreen.tsx`) |
| `docs/proposals/lfpdppp-2025/TEXTOS_LEGALES_PARA_REVISION_JURIDICA.md` | Textos íntegros listos para revisión y dictamen de especialista mexicano en protección de datos personales. | No |
| `docs/proposals/lfpdppp-2025/PROPUESTA_TECNICA_CONSENTIMIENTO_Y_PRIVACIDAD.md` | Especificación de cambios técnicos propuestos sobre `firestore.rules`, esquema de datos, `AuthScreen`, `ProfileSecurityView` y `ModulesView` para cuando exista visto bueno jurídico. | No |

*(Adicionalmente se restauró `src/data/legalAndDocs.ts` tras su eliminación manual para conservar compilable y funcional el baseline `1.0.0` existente.)*

---

## 2. Cobertura de los 10 requisitos solicitados

1. **Consentimiento expreso para datos sensibles de salud, recuperación y bienestar (Art. 8 LFPDPPP 2025):** casilla dedicada (`sensitiveHealthConsent`) separada de términos y de datos financieros.
2. **Consentimiento expreso para datos financieros y patrimoniales (Art. 7 LFPDPPP 2025):** casilla independiente y opcional (`financialDataConsent`); si permanece desmarcada, la persona puede usar RENACER sin habilitar el módulo de Finanzas ni capturar gasto diario.
3. **Casillas separadas, inicialmente desmarcadas (`false`), sin consentimiento implícito:** implementadas en `SEPARATE_CONSENT_CHECKBOXES_2025` y `GranularConsentProposalPanel.tsx`.
4. **Registro de evidencia del mecanismo de aceptación:** `ConsentAcceptanceEvidence` captura versión de Aviso Simplificado (`simplifiedNoticeVersion`), Aviso Integral (`integralNoticeVersion`), versiones de cada texto de consentimiento (`sensitiveHealthConsentVersion`, `financialConsentVersion`), fecha/hora ISO (`acceptedAtIso`), `authenticatedUid`, `authenticatedEmail`, proveedor (`google.com`), `emailVerified`, mecanismo (`explicit_unchecked_checkboxes_post_google_oauth`), estado inicial desmarcado, resumen de `userAgent` y marca de pendiente de validación jurídica.
5. **Procedimiento de revocación y explicación de consecuencias:** soporta 3 niveles (solo financiero, solo sensible de recuperación, y revocación total por eliminación de cuenta), explicando no retroactividad, bloqueo funcional del módulo correspondiente, respaldo `.json` previo y borrado irreversible en caso de eliminación total.
6. **Aviso de Privacidad Simplificado previo + acceso al Integral (Arts. 16 y 17 LFPDPPP 2025):** mostrado antes de cualquier captura en el onboarding con enlace directo al Aviso Integral (Art. 15).
7. **Información sobre Firebase, Google Gemini, encargados y ubicación:** tabla explícita en `CLOUD_PROCESSORS_DISCLOSURE` indicando ubicación en EE. UU., proyecto Firebase `gen-lang-client-0791565383`, contexto mínimo enviado a Gemini desde Cloud Run y caché local opcional `IndexedDB`.
8. **Prohibición de entrenar modelos o usar datos para publicidad:** declarada expresamente en ambos avisos y en la política de encargados (con punto específico para que el abogado valide los términos contractuales de Gemini API).
9. **Exportación JSON y eliminación definitiva de cuenta:** preservadas íntegramente.
10. **RENACER 100% gratuita:** preservada sin suscripciones, publicidad ni pasarelas de pago.

---

## 3. Cambios técnicos propuestos para una futura versión (NO aplicados aún)

Cuando un especialista mexicano en protección de datos valide los textos y el mecanismo:

### A. Modelo de datos (`src/types/renacer.ts`)
Agregar al perfil (`UserVaultData['profile']`):
- `privacyNoticeVersion: string`
- `sensitiveHealthConsent: boolean`
- `sensitiveHealthConsentAt: string`
- `financialDataConsent: boolean`
- `financialDataConsentAt: string | null`
- `consentEvidenceId: string`
- Nueva subcolección append-only `/users/{uid}/consentRecords/{recordId}` para almacenar cada `ConsentAcceptanceEvidence` y cada evento de revocación (`ConsentRevocationEvent`) con `serverTimestamp()`.

### B. Reglas de seguridad propuestas (`firestore.rules` — NO modificadas en `1.0.0`)
1. Actualizar `isValidUserProfile(data, uid)` para exigir `sensitiveHealthConsent == true` al crear el perfil y permitir `financialDataConsent is bool`.
2. Añadir regla append-only para la subcolección de evidencia:
   ```text
   match /users/{userId}/consentRecords/{recordId} {
     allow get, list: if isOwner(userId);
     allow create: if isOwner(userId)
       && userExists(userId)
       && incoming().ownerId == userId
       && incoming().acceptedAt is timestamp;
     allow update: if false; // Evidencia inmutable
     allow delete: if isOwner(userId); // Permitir borrado integral de cuenta
   }
   ```
3. Reforzar `match /users/{userId}/finances/{financeId}` en futuras versiones si se desea hacer exigible en servidor que `get(/databases/$(database)/documents/users/$(userId)).data.financialDataConsent == true` en `create/update` (sujeto a revisión de costos de lecturas en reglas y migración sin afectar cuentas `1.0.0` existentes!).

### C. Flujo de migración sin afectar usuarios existentes de `1.0.0`
Para no romper cuentas ya creadas en `1.0.0` (que tienen `consentVersion: '2026-11-v1'`):
- En una futura versión `1.1.0+`, detectar en `App.tsx` si el perfil carece de `sensitiveHealthConsent` o tiene una versión anterior del aviso y presentar un modal de actualización informada de consentimientos (casillas inicialmente desmarcadas) antes de registrar nuevos datos sensibles o financieros, manteniendo siempre disponible la exportación `.json` y la eliminación de cuenta.

### D. Bloqueo modular en UI (`ModulesView.tsx` y `AuthScreen.tsx`)
- En `AuthScreen.tsx`: ocultar o deshabilitar el campo `Gasto diario estimado` mientras `financialDataConsent` sea `false`.
- En `ModulesView.tsx` (pestaña **Finanzas**): si `profile.financialDataConsent !== true`, mostrar un aviso explicativo con botón para otorgar consentimiento expreso financiero (casilla desmarcada) en lugar de habilitar formularios financieros sin autorización expresa.
- En `ProfileSecurityView.tsx`: añadir sección **Gestión de consentimientos y revocación**, permitiendo revocar el consentimiento financiero de forma independiente con opción de exportar JSON y eliminar registros financieros.
