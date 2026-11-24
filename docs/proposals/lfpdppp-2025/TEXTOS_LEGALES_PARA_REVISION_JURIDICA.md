# Textos Legales Propuestos para Revisión Jurídica — RENACER (México)

**Estatus:** Borrador propuesto para revisión de especialista mexicano en protección de datos personales (**NO integrado en la versión `1.0.0` publicada en `ais-pre`**).  
**Marco normativo de referencia:**  
- **Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)** publicada en el Diario Oficial de la Federación (DOF) el **20 de marzo de 2025** (entrada en vigor: 21 de marzo de 2025, abrogando la Ley de 2010 y transfiriendo la autoridad reguladora del extinto INAI a la **Secretaría Anticorrupción y Buen Gobierno**).  
- **Decreto de reforma publicado en el DOF el 14 de noviembre de 2025** (reforma al **artículo 4** de la LFPDPPP, estableciendo como leyes supletorias al **Código Nacional de Procedimientos Civiles y Familiares** y la **Ley Federal de Procedimiento Administrativo**).

> **Advertencia expresa:** Ninguna casilla digital, leyenda ni texto contenido en este documento garantiza por sí solo cumplimiento legal. Todo el contenido y mecanismo quedan sujetos a dictamen y ajuste por un abogado especialista en protección de datos en México antes de integrarse en una futura versión (`1.1.0+`).

---

## Texto 1. Aviso de Privacidad Simplificado (Previo a recabar datos — Arts. 16 y 17 LFPDPPP 2025)

**Momento de puesta a disposición:** se muestra de manera visible inmediatamente después de autenticar con Google y **antes** de que la persona usuaria llene el formulario inicial o marque cualquier casilla.

> **Aviso de Privacidad Simplificado — RENACER**  
> **Responsable del tratamiento:** José Andrés Martínez Colorado, con domicilio en Sóstenes Rocha 45, Zona Centro, Acámbaro, Guanajuato, México.  
> **Naturaleza gratuita:** RENACER es una plataforma 100% gratuita para acompañarte en tu proceso de reconstrucción personal, sin publicidad, sin suscripciones y sin venta de datos.  
> **Finalidades primarias:** (1) autenticar tu acceso mediante Google y aislar tu información personal bajo tu identificador único (UID); (2) habilitar herramientas de recuperación, diario emocional, hábitos, prevención de recaídas y red de apoyo (datos personales sensibles que requieren tu consentimiento expreso separado); (3) de manera opcional e independiente, registrar ingresos, gastos, ahorro y deudas (datos financieros/patrimoniales que requieren un segundo consentimiento expreso separado); y (4) responder mensajes voluntarios en RENACER IA sin supervisión humana en tiempo real.  
> **Cero publicidad y cero entrenamiento de modelos:** RENACER NO realiza finalidades secundarias comerciales ni utiliza tus datos personales para publicidad o para entrenar modelos de inteligencia artificial.  
> **Consulta del Aviso Integral y medios de contacto:** Antes de marcar las casillas de consentimiento, puedes leer el **Aviso de Privacidad Integral** en el enlace inmediato o escribir a **lift884@gmail.com** (lunes a viernes, 09:00 a 17:00 horas, `America/Mexico_City`; respuesta inicial en máximo 3 días hábiles; canal no apto para emergencias).

---

## Texto 2. Aviso de Privacidad Integral (Art. 15 LFPDPPP 2025)

### 1. Identidad, domicilio y contacto del responsable
- **Responsable:** José Andrés Martínez Colorado (persona física).
- **Domicilio para oír y recibir notificaciones:** Sóstenes Rocha 45, Zona Centro, Acámbaro, Guanajuato, México. *(Nota para revisión jurídica: confirmar con el especialista si conviene agregar código postal).*
- **Correo para privacidad, derechos ARCO, revocación y soporte:** `lift884@gmail.com`.
- **Horario de atención y SLA:** lunes a viernes, de 09:00 a 17:00 horas (`America/Mexico_City`); tiempo máximo estimado para respuesta inicial: 3 días hábiles.
- **Aviso de seguridad:** `lift884@gmail.com` **NO** es un canal de emergencias y RENACER **NO** ofrece supervisión humana en tiempo real ni atención médica.

### 2. Categorías de datos personales sometidos a tratamiento
1. **Datos de identificación y acceso:** correo electrónico verificado con Google, UID de Firebase Authentication y alias libre elegido por la persona usuaria.
2. **Datos personales sensibles (salud, recuperación y bienestar — Art. 8 LFPDPPP 2025):** enfoque de recuperación, fecha de inicio, evaluación inicial, estado emocional diario (ánimo, energía, estrés), entradas de diario personal, registros de impulsos/deseos/consumo/apuestas/recaídas, estrategias de afrontamiento, contactos de confianza (nombre, parentesco y teléfono opcional) e historial de conversaciones con RENACER IA.
3. **Datos financieros y patrimoniales (Art. 7 LFPDPPP 2025):** estimación de gasto diario, ingresos, gastos, ahorros, deudas y abonos registrados voluntariamente en el módulo de Finanzas. Su captura y tratamiento es **opcional e independiente** y requiere consentimiento expreso separado.
4. **Datos que NO se recaban:** datos biométricos, expedientes médicos hospitalarios oficiales, credenciales bancarias automatizadas ni rastreadores publicitarios de terceros.

### 3. Finalidades del tratamiento
- **Finalidades primarias necesarias para el servicio:**
  1. Autenticar el acceso mediante "Continuar con Google" y aislar la bóveda privada por UID en Cloud Firestore.
  2. Operar las herramientas de acompañamiento, diario emocional, hábitos, metas y red de apoyo (con consentimiento expreso para datos sensibles).
  3. Operar el control financiero personal dentro de la app (únicamente si la persona otorga consentimiento expreso financiero separado).
  4. Generar respuestas automatizadas en RENACER IA cuando la persona envíe mensajes, transmitiendo contexto mínimo sin correo ni teléfonos de contactos.
  5. Aplicar moderación preventiva en el muro comunitario por alias.
- **Finalidades secundarias:** **NINGUNA.** RENACER no vende, alquila ni comparte datos para publicidad, mercadotecnia o perfilado comercial, ni utiliza datos personales para entrenar modelos de IA.

### 4. Proveedores encargados, ubicación tecnológica y transferencias (Art. 35 LFPDPPP 2025)
Para operar la plataforma gratuita sin infraestructura propia física en México, se utilizan servicios en la nube ubicados fuera de México (Estados Unidos):
- **Google Firebase Authentication:** verificación de identidad con Google (`gen-lang-client-0791565383`).
- **Google Cloud Firestore (`ai-studio-da412c5f-4916-43d8-a77e-595343cd22e0`):** almacenamiento de documentos privados aislados por UID mediante reglas de seguridad.
- **Google Cloud Run (`us-east1`) + Google Gemini API:** procesamiento temporal en servidor propio para responder mensajes de RENACER IA con contexto mínimo no identificable.
- **Almacenamiento local en dispositivo (`IndexedDB` / `localStorage`):** caché sin conexión opcional controlada y desactivable por el propio usuario.

*(Nota para dictamen legal: validar redacción bajo LFPDPPP 2025 distinguiendo remisión a encargados en nube frente a transferencias internacionales del Art. 35 y verificar términos de API comercial vigente de Google Gemini respecto a no retención y no entrenamiento).*

### 5. Mecanismos para limitar el uso o divulgación, exportación y eliminación
- Usar RENACER sin otorgar (o revocando posteriormente) el consentimiento de datos financieros.
- Desactivar la caché local sin conexión (`IndexedDB`) en *Perfil y seguridad*.
- Ocultar teléfonos de contactos de apoyo en pantalla.
- Exportar todos los datos en archivo portable `.json` (*Perfil y seguridad > Exportar todos mis datos*).
- Eliminar definitivamente la cuenta y todos sus datos (*Perfil y seguridad > Eliminar cuenta y datos*).

### 6. Derechos ARCO, revocación y autoridad competente
Puedes ejercer tus derechos de **Acceso, Rectificación, Cancelación y Oposición (ARCO)** y **revocar tu consentimiento** sin efectos retroactivos directamente desde la aplicación o enviando solicitud a **`lift884@gmail.com`**, acompañando referencia de tu correo registrado con Google para acreditar identidad.  
Conforme a la **LFPDPPP publicada el 20 de marzo de 2025** y la **reforma al artículo 4 del 14 de noviembre de 2025** (con supletoriedad del Código Nacional de Procedimientos Civiles y Familiares y la Ley Federal de Procedimiento Administrativo), la autoridad competente en México es la **Secretaría Anticorrupción y Buen Gobierno**.

### 7. Procedimiento para comunicar cambios al Aviso de Privacidad
Las modificaciones sustanciales se publicarán dentro de la plataforma y, cuando cambien finalidades o categorías de datos que requieran consentimiento expreso, se solicitará nueva aceptación explícita mediante casillas inicialmente desmarcadas.

---

## Texto 3. Casillas Separadas de Consentimiento (Todas inicialmente desmarcadas `false`)

> **Regla de diseño:** Ninguna casilla puede aparecer premarcada, ni agruparse en un "Aceptar todo", ni inferirse por el simple uso de la aplicación.

1. **Casilla 1 — Lectura de Avisos y Condiciones Gratuitas No Clínicas (Obligatoria para crear bóveda):**  
   `[ ]` *Confirmo que leí el Aviso de Privacidad Simplificado y tuve acceso al Aviso de Privacidad Integral; comprendo que RENACER es una plataforma 100% gratuita, no presta servicios médicos ni de emergencias, no ofrece supervisión humana en tiempo real y no utiliza mis datos para publicidad ni entrenamiento de modelos.*

2. **Casilla 2 — Consentimiento Expreso para Datos Sensibles de Salud, Recuperación y Bienestar (Art. 8 LFPDPPP 2025 — Obligatoria para bóveda de recuperación):**  
   `[ ]` *Otorgo mi consentimiento expreso para el tratamiento y almacenamiento privado por UID en Cloud Firestore (EE. UU.) de mis datos personales sensibles relacionados con recuperación, estado emocional, diario personal, impulsos, recaídas, hábitos, red de apoyo y conversaciones opcionales con RENACER IA.*

3. **Casilla 3 — Consentimiento Expreso e Independiente para Datos Financieros y Patrimoniales (Art. 7 LFPDPPP 2025 — Opcional):**  
   `[ ]` *Otorgo mi consentimiento expreso para registrar y almacenar de forma privada mis datos financieros y patrimoniales (estimación de gasto diario, ingresos, gastos, ahorros, deudas y abonos) con la finalidad de llevar mi control económico dentro de RENACER. Entiendo que esta autorización es opcional y que puedo usar RENACER sin habilitar el módulo financiero.*

---

## Texto 4. Procedimiento de Revocación del Consentimiento y Consecuencias

1. **Revocación granular de datos financieros (sin perder tu cuenta ni tu diario):**
   - **Cómo hacerlo:** En *Perfil y seguridad > Privacidad y Consentimientos* o enviando correo a `lift884@gmail.com`.
   - **Consecuencias:** Se deshabilita de inmediato la captura de nuevos registros en Finanzas y la estimación de gasto diario (`dailySpendEstimate = 0`). La persona puede descargar previamente su respaldo `.json` y decidir si solicita la supresión inmediata de sus entradas financieras existentes. No afecta el acceso al resto de los módulos ni tiene efectos retroactivos sobre tratamientos ya ejecutados.

2. **Revocación del consentimiento para datos sensibles de salud/recuperación:**
   - **Cómo hacerlo:** En *Perfil y seguridad > Privacidad y Consentimientos* o enviando correo a `lift884@gmail.com`.
   - **Consecuencias:** Al ser el núcleo funcional de RENACER, la revocación impide continuar registrando emociones, diarios, impulsos, planes o usando RENACER IA. Se ofrece descarga inmediata en `.json` y la opción de cancelar/suprimir los datos sensibles o eliminar definitivamente la cuenta. Sin efectos retroactivos.

3. **Revocación total mediante eliminación definitiva de cuenta:**
   - **Cómo hacerlo:** En *Perfil y seguridad > Eliminar cuenta y datos* (previa reautenticación reciente con Google y confirmación de correo) o mediante solicitud ARCO a `lift884@gmail.com`.
   - **Consecuencias:** Elimina de Cloud Firestore las 15 subcolecciones privadas, perfil principal, registro de consentimientos y publicaciones/respuestas propias en Comunidad; limpia almacenamiento local (`IndexedDB`, `sessionStorage`, `localStorage`) y elimina la cuenta en Firebase Authentication de forma **irreversible**.

---

## Texto 5. Puntos Específicos para Validación del Especialista Mexicano en Protección de Datos

1. **Mecanismo de firma / autenticación equivalente (Art. 8 LFPDPPP 2025):** validar si la secuencia *Google Sign-In verificado (`email_verified == true`) + lectura de Aviso Simplificado/Integral + marcado manual de casillas separadas inicialmente desmarcadas + registro inmutable de evidencia en Firestore (`consentRecords`)* satisface el requisito de "consentimiento expreso y por escrito" mediante mecanismo de autenticación para datos sensibles de salud/adicciones.
2. **Transferencias vs. Remisiones en la nube (Art. 35 LFPDPPP 2025):** confirmar si el almacenamiento en Cloud Firestore (EE. UU.) y las llamadas de servidor a Google Gemini API requieren cláusula de consentimiento específica para transferencia internacional o se documentan como remisiones a encargados bajo contrato/términos de nube.
3. **Condiciones vigentes de Google Gemini API (`GEMINI_API_KEY`):** verificar legalmente el nivel de cuenta/contrato de Gemini API utilizado para asegurar contractualmente que los prompts mínimos enviados no se retienen para entrenamiento humano ni mejora de modelos.
4. **Edad mínima (18 años) y personas usuarias vulnerables:** validar mecanismo de declaración de mayoría de edad y eventuales salvaguardas adicionales dado que la app trata temáticas sensibles de consumo y salud emocional.
5. **Plazos de conservación, bloqueo y supresión por inactividad:** definir plazo máximo de conservación tras inactividad prolongada y procedimiento de acreditación de identidad y respuesta ARCO en 20 + 15 días hábiles.
6. **Datos complementarios opcionales del responsable:** confirmar si es recomendable añadir el código postal al domicilio en Acámbaro, Guanajuato.
