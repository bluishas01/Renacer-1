# Security Summary

This audit covers RENACER 1.0 stabilization on the AI Studio Starter Tier Firebase project (`gen-lang-client-0791565383`, Firestore DB `ai-studio-da412c5f-4916-43d8-a77e-595343cd22e0`) without upgrading billing or altering project ownership.

## Key Remediations Implemented

1. **Community Persistence Migrated from `community.json` to Cloud Firestore (`src/services/communityService.ts`, `src/components/ModulesView.tsx`, `firestore.rules`, `firebase-blueprint.json`)**
   - Deleted `/data/community.json` and removed all filesystem-backed `/api/community/posts*` routes from `server.ts`.
   - Migrated posts, replies, reactions (`reactions/{uid}`), and reports (`reports/{uid}`) to Cloud Firestore via the authenticated client SDK under strict security rules (`communityPosts/{postId}`, `replies/{replyId}`, `reactions/{reactionUid}`, `reports/{reportUid}`).
   - Enforced UID and alias anti-spoofing in `firestore.rules` (`authorUid == request.auth.uid`, `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.alias == incoming().authorAlias`, and zero PII fields permitted).
   - Enforced per-user ownership on reactions and reports (`isOwner(reactionUid)` / `isOwner(reportUid)` on `get`, `list`, `create`, `update`, and `delete`) paired with `existsAfter` / `getAfter` atomic counter validation.

2. **Firebase Admin SDK Token Verification on Backend (`server.ts`, `src/components/RenacerAIView.tsx`, `src/services/communityService.ts`)**
   - Initialized `firebase-admin/app` + `firebase-admin/auth` using `projectId` from `firebase-applet-config.json` strictly for `verifyIdToken(token)` (no IAM permissions or billing required).
   - Protected `POST /api/ai/chat` and `POST /api/community/moderate` with `requireVerifiedFirebaseUser` (`Authorization: Bearer <idToken>` + `decoded.email_verified === true`), rejecting unauthenticated or forged tokens with HTTP `401`/`403`.
   - Note on Starter Tier limitation: Because the preview container does not hold IAM permissions to manage Auth users (`createUser`, `verifyIdToken(token, true)`) or read/write Firestore server-side via `firebase-admin`, all Firestore reads/writes and user data isolation execute directly through the authenticated client SDK + deployed `firestore.rules`.

3. **Dependency Vulnerability Remediation (`package.json`, `bun.lock`)**
   - Added targeted `overrides` in `package.json` for `@grpc/grpc-js` (`^1.14.7`), `glob` (`^14.0.6`), and `minimatch@>=7.0.0 <11.0.1` (`^11.0.9`) without forcing breaking major updates to `firebase` or `vite`.
   - Re-ran `bun audit`: 0 vulnerabilities across 783 checked packages.

4. **Privacy & Cache Hygiene (`server.ts`, `vite.config.ts`, `src/services/firebaseVault.ts`, `src/App.tsx`)**
   - Added `Cache-Control: no-store, no-cache, must-revalidate, private`, `Pragma: no-cache`, and `Expires: 0` headers to all `/api/*` endpoints.
   - Added Workbox `NetworkOnly` runtime rules in `vite.config.ts` for `/api/*`, `firestore.googleapis.com`, `identitytoolkit.googleapis.com`, and `securetoken.googleapis.com`.
   - Hardened `handleLogout`, `handleAccountDeleted`, and `deleteAllUserFirestoreData` to clear IndexedDB/`localforage` caches, `sessionStorage` (`renacer_pending_profile`), `localStorage` preferences, user-authored `communityPosts`, and best-effort cleanup of own replies/reactions/reports on other visible posts.
   - Added user-controllable IndexedDB offline cache toggle (`renacer_offline_cache_enabled`) in `ProfileSecurityView.tsx`.

5. **Abuse Protection, Crisis Boundaries & Release Candidate Legal/Doc Center (`server.ts`, `src/data/legalAndDocs.ts`, `src/components/LegalDocsModal.tsx`, `src/components/HelpDrawer.tsx`)**
   - Added per-UID sliding-window rate limiters on `POST /api/ai/chat` (20 req / 15 min, 80 req / 24h) and `POST /api/community/moderate` (20 req / 10 min) returning HTTP `429` + `Retry-After`.
   - Expanded acute intoxication/alcohol poisoning patterns and verified official Mexico crisis lines (`911`, CONASAMA `800 911 2000`, SAPTEL `55 5259 8121`, LOCATEL `*0311` / `55 5658 1111`) with explicit disclosure that RENACER IA has no real-time human clinical monitoring.
   - Integrated all 10 required privacy/legal documents in Spanish with explicit `[PENDIENTE DE DEFINICIÓN LEGAL]` markers where legal counsel review is required before public launch.

---

## PoC Verification

1. **Production Build, Typecheck, Rules Lint & Rules Deployment**
   - `tsc --noEmit`: passed (exit code `0`).
   - `npm run build` (`vite build` + `VitePWA` / `workbox-build`): passed (`dist/sw.js` and `dist/manifest.webmanifest` generated; `NetworkOnly` verified in `dist/sw.js`).
   - `npx eslint firestore.rules`: passed (exit code `0`).
   - `DeployRules` RPC: succeeded (`{}`).

2. **Dependency Security Audit**
   - `bun audit`: `No vulnerabilities found (checked 783 packages)`.

3. **Backend Token Verification & Cache-Control Enforcement (`server.ts`)**
   - `GET /api/health`: `200`, `Cache-Control: no-store, no-cache, must-revalidate, private`, `{ status: 'ok', aiConfigured: true, authVerifierConfigured: true, communityStorage: 'cloud_firestore' }`.
   - `POST /api/ai/chat` (no token & forged JWT): both rejected with HTTP `401` and `Cache-Control: no-store...`.
   - `POST /api/community/moderate` (no token & forged JWT): both rejected with HTTP `401`.
   - `GET /api/community/posts`: no longer served as JSON (falls back to SPA HTML); `/data/community.json` removed.

4. **Live Firestore Rules Unauthenticated Probes (All 20 Collections)**
   - Executed 43 live unauthenticated read/write probes via `@firebase/firestore` (`13.4.0` using `@grpc/grpc-js@1.14.7`) against `users/{uid}`, all 15 private subcollections, `communityPosts`, `replies`, `reactions`, and `reports`: `43/43` returned `7 PERMISSION_DENIED`.

5. **Firebase Auth & Authorized Domain Probes**
   - `createAuthUri` succeeded (`200`) for both `ais-dev-au33k5srpusdgsc5bctw5n-896881508589.us-east1.run.app` and `ais-pre-au33k5srpusdgsc5bctw5n-896881508589.us-east1.run.app` (verified in live probe).
   - `signInWithEmailAndPassword` probe returned `auth/operation-not-allowed`: Email/Password remains disabled in Firebase Console until explicitly enabled under `Authentication > Sign-in method`.
   - Note: End-to-end authenticated 2-user cross-account Firestore emulator tests could not execute locally because `java` is not installed in the container (`java: not found`) and Starter Tier prohibits server-side `createCustomToken` IAM minting; unauthenticated enforcement, static ESLint rules validation, deployed rules, and live token signature verification passed.
