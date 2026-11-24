# RENACER 1.0 Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Ownership & PII Isolation**: Every document under `/users/{userId}` and all nested subcollections (`/plan`, `/assessment`, `/emotionalLogs`, `/cravingLogs`, `/consumptionLogs`, `/dailyPlan`, `/journalEntries`, `/alerts`, `/recoveryStages`, `/habits`, `/financeEntries`, `/supportContacts`, `/relationshipLogs`, `/lifeGoals`, `/aiMessages`) is strictly readable and writable only when `request.auth != null`, `request.auth.token.email_verified == true`, and `request.auth.uid == userId`.
2. **Master Gate Integrity**: Subcollection writes require that the parent `/users/{userId}` document exists (`exists(...)`) and that `incoming().ownerId == request.auth.uid`.
3. **Immutable Identity & Creation Timestamps**: `uid` / `ownerId` and `createdAt` cannot be modified after creation. `createdAt` and `updatedAt` must equal `request.time`.
4. **No Shadow Fields or Type Poisoning**: Every create enforces `keys().hasAll(...)` and `keys().hasOnly(...)`; every update enforces `affectedKeys().hasOnly(...)` paired with the entity's `isValid[Entity]` validator.
5. **Path & Resource Bounds**: All path IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), and all strings and lists have explicit size caps.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-User Profile Read (`GET /users/victimUid`)**: Authenticated user `attackerUid` tries to read `victimUid`'s profile containing PII (`email`) -> `PERMISSION_DENIED`.
2. **Cross-User Subcollection List (`LIST /users/victimUid/journalEntries`)**: Authenticated user `attackerUid` queries `victimUid`'s personal journal entries -> `PERMISSION_DENIED`.
3. **Unverified Email Write (`CREATE /users/attackerUid`)**: Signed-in user with `email_verified: false` tries to create profile -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Create (`CREATE /users/attackerUid/consumptionLogs/c1`)**: Payload sets `ownerId: "victimUid"` -> `PERMISSION_DENIED`.
5. **Shadow / Privilege Escalation Field (`CREATE /users/attackerUid/assessment/initial`)**: Payload includes `"isAdmin": true` -> `PERMISSION_DENIED`.
6. **Shadow Field on Update (`UPDATE /users/attackerUid`)**: Update includes `"uid": "victimUid"` or `"role": "admin"` -> `PERMISSION_DENIED`.
7. **Timestamp Forgery (`CREATE /users/attackerUid/consumptionLogs/c1`)**: Payload supplies a past client `Date` instead of `request.time` -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation (`UPDATE /users/attackerUid/journalEntries/j1`)**: Update tries to overwrite `createdAt` or `ownerId` -> `PERMISSION_DENIED`.
9. **Path ID Poisoning (`CREATE /users/attackerUid/dailyPlan/bad$id..123`)**: Document ID fails regex `^[a-zA-Z0-9_\-]+$` -> `PERMISSION_DENIED`.
10. **Denial-of-Wallet String Overflow (`CREATE /users/attackerUid/journalEntries/j1`)**: `content` exceeds 2000 characters -> `PERMISSION_DENIED`.
11. **Unbounded Array Injection (`CREATE /users/attackerUid/assessment/initial`)**: `highRiskTimes` array contains > 8 items or non-string first element `[123]` -> `PERMISSION_DENIED`.
12. **Orphaned Subcollection Write (`CREATE /users/attackerUid/alerts/a1`)**: Parent `/users/attackerUid` does not exist -> `PERMISSION_DENIED`.

## 3. Community Invariants & Anti-Spoofing Rules
1. **Alias & UID Anti-Spoofing**: `communityPosts/{postId}` and `replies/{replyId}` require `authorUid == request.auth.uid` and verify `get(/users/$(request.auth.uid)).data.alias == incoming().authorAlias`. No `email`, phone, or PII fields are permitted in `hasOnly(...)`.
2. **Per-User Reaction & Report Ownership**: `reactions/{reactionUid}` and `reports/{reportUid}` are keyed by `request.auth.uid` and enforce `isOwner(reactionUid)` / `isOwner(reportUid)` plus `ownerId == request.auth.uid` on `get`, `list`, `create`, `update`, and `delete`.
3. **Atomic Counter Integrity**: Post `supportCount` and `reportCount`/`hidden` updates require paired `existsAfter` / `getAfter` validation against the caller's own `reactions/{uid}` or `reports/{uid}` document.
