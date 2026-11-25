# Firestore Security Specification — IronPulse Gym

## 1. Data Invariants
1. **Strict Owner Isolation (PII Protection)**: Every document under `/users/{userId}`, `/users/{userId}/settings/{settingId}`, and `/users/{userId}/members/{memberId}` contains PII (owner email, client names, phones, emails) and MUST be readable and writable ONLY by the verified authenticated user whose `request.auth.uid == userId` (`request.auth.token.email_verified == true`).
2. **Master Gate Relational Integrity**: Subcollection documents under `/users/{userId}/settings/{settingId}` and `/users/{userId}/members/{memberId}` cannot be created or updated unless the parent `/users/{userId}` document exists (`exists(/databases/$(database)/documents/users/$(userId))`).
3. **Immutable Identity & Temporal Integrity**:
   - `uid` (on `UserProfile`), `ownerId` (on `GymBrandingDoc` and `GymMemberDoc`), `id` (on `GymMemberDoc`), and `createdAt` are immutable after creation.
   - `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
4. **Strict Financial & Schema Bounds**:
   - `fees > 0` and `0 <= amountPaid <= fees`.
   - `plan` is restricted to `['1 Month', '2 Months', '3 Months', '6 Months', '12 Months']`.
   - `paymentMode` is restricted to `['Cash', 'UPI', 'Card']`.
   - `currency` is restricted to `['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD']`.
   - All string fields enforce explicit `.size()` upper bounds matching `firebase-blueprint.json`.
   - No undeclared/shadow fields permitted on create (`hasOnly`) or update (`affectedKeys().hasOnly`).
5. **Query Security (`allow list`)**: List queries on `/users/{userId}/members` explicitly enforce `resource.data.ownerId == request.auth.uid` without calling `get()`/`exists()` inside `allow list`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return `PERMISSION_DENIED`)
1. **Unauthenticated Read**: Anonymous/unauthenticated `get` on `/users/ownerA/members/mem-1`.
2. **Cross-Tenant PII Read**: Authenticated `ownerB` attempts `get` on `/users/ownerA` or `/users/ownerA/members/mem-1`.
3. **Unverified Email Spoof**: User with `uid == ownerA` but `email_verified: false` attempts to write `/users/ownerA/members/mem-1`.
4. **Shadow Field Injection on Create**: `ownerA` creates `/users/ownerA/members/mem-1` including ghost field `isAdmin: true`.
5. **Shadow Field Injection on Update**: `ownerA` updates `/users/ownerA/members/mem-1` adding ghost field `role: 'superuser'`.
6. **Identity Spoofing (`ownerId` Mismatch)**: `ownerA` creates `/users/ownerA/members/mem-1` with `ownerId: 'ownerB'`.
7. **Immutable Field Tampering**: `ownerA` updates `/users/ownerA/members/mem-1` attempting to alter `createdAt` or `ownerId`.
8. **Client-Forged Timestamp**: `ownerA` creates `/users/ownerA/members/mem-1` with `createdAt: Timestamp(2020-01-01)` instead of `request.time`.
9. **Financial Bound Bypass**: `ownerA` creates/updates member with `fees: 1000, amountPaid: 2500` (`amountPaid > fees`) or `fees: -500`.
10. **Path ID Poisoning**: `ownerA` creates `/users/ownerA/members/../../../evil id with spaces` (violating `isValidId`).
11. **Value Poisoning / Denial-of-Wallet String**: `ownerA` updates `name` on `/users/ownerA/members/mem-1` with a 500KB string (`> 100` chars) or boolean type.
12. **Orphaned Subcollection Write**: `ownerA` writes `/users/ownerA/members/mem-1` before `/users/ownerA` parent document exists (fails Master Gate `exists()`).
