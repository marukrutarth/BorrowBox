# BorrowBox Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants & Relational Mapping

1. **Master Source of Truth & Split-Collection PII Isolation**:
   - Public user profiles live at `/users/{userId}` and contain only non-sensitive marketplace identity fields (`uid`, `name`, `photoURL`, `city`, `neighborhood`, `canRent`, `canList`, `activeMode`, `createdAt`, `updatedAt`).
   - Private Personally Identifiable Information (PII: `email`, `phone`) is strictly isolated in `/users/{userId}/private/{docId}` (specifically `/users/{userId}/private/info`).
   - A private profile document `/users/{userId}/private/{docId}` cannot be created or updated unless the parent public profile `/users/{userId}` exists (`exists(/databases/$(database)/documents/users/$(userId))` or `existsAfter(/databases/$(database)/documents/users/$(userId))`).
2. **Identity & Ownership Integrity**:
   - A user can only create or update `/users/{userId}` and `/users/{userId}/private/{docId}` when `request.auth.uid == userId` and `incoming().uid == userId`.
   - No user can read or edit another user's private profile (`/users/{userId}/private/{docId}`).
3. **Administrator Separation**:
   - Administrator permissions are stored separately in `/admins/{adminId}` (plus bootstrapped verified runtime admin `marukrutarth@gmail.com`).
   - Standard user profile documents (`/users/{userId}`) are forbidden from containing `role` or `isAdmin` fields (`hasOnly` key enforcement).
   - Non-admin users cannot read or write `/admins/{adminId}`.
4. **Temporal & Immutable Field Integrity**:
   - `createdAt` must equal `request.time` on `create` and remain strictly unchanged (`incoming().createdAt == existing().createdAt`) on `update`.
   - `updatedAt` must equal `request.time` on both `create` and `update`.
   - `uid` is immutable after creation (`incoming().uid == existing().uid`).

## 2. The "Dirty Dozen" Payloads (Adversarial Test Vectors)

1. **Payload 1 (Identity Spoofing on Public Profile Create)**: Authenticated user `user_A` attempts to create `/users/user_B` with `uid: "user_B"`. -> `PERMISSION_DENIED`.
2. **Payload 2 (Cross-User Private Profile Read - PII Leak)**: Authenticated user `user_A` attempts `get` on `/users/user_B/private/info`. -> `PERMISSION_DENIED`.
3. **Payload 3 (Cross-User Private Profile Edit)**: Authenticated user `user_A` attempts `update` on `/users/user_B/private/info`. -> `PERMISSION_DENIED`.
4. **Payload 4 (Self-Assigned Admin Shadow Field)**: Authenticated user `user_A` attempts to create `/users/user_A` with extra field `isAdmin: true` or `role: "admin"`. -> `PERMISSION_DENIED` (blocked by `keys().hasOnly(...)`).
5. **Payload 5 (Direct Privilege Escalation in `/admins`)**: Non-admin user `user_A` attempts to create `/admins/user_A`. -> `PERMISSION_DENIED`.
6. **Payload 6 (Unverified Email Spoof Attack)**: User with `email: "marukrutarth@gmail.com"` but `email_verified: false` attempts an admin write. -> `PERMISSION_DENIED`.
7. **Payload 7 (Orphaned Private Profile Write)**: User `user_A` attempts to create `/users/user_A/private/info` when `/users/user_A` does not exist in database or batch. -> `PERMISSION_DENIED`.
8. **Payload 8 (Immortal Field Mutation)**: User `user_A` attempts to update `/users/user_A` while changing `createdAt` or `uid`. -> `PERMISSION_DENIED`.
9. **Payload 9 (Client Timestamp Forgery)**: User `user_A` sends a past or future `updatedAt` timestamp (`updatedAt != request.time`). -> `PERMISSION_DENIED`.
10. **Payload 10 (Resource Exhaustion / String Overflow)**: User `user_A` sends a 5,000-character `name` or `photoURL` exceeding blueprint `maxLength`. -> `PERMISSION_DENIED`.
11. **Payload 11 (Invalid Enum City or Mode)**: User `user_A` updates `city` to `"Atlantis"` or `activeMode` to `"superadmin"`. -> `PERMISSION_DENIED`.
12. **Payload 12 (ID Poisoning Attack)**: User attempts to target a document ID containing invalid characters or length > 128 (`!isValidId(userId)`). -> `PERMISSION_DENIED`.
13. **Admin RBAC & Immutable Audit Trail**:
    - Administrator records in `/admins/{adminId}` store `role` (`super_admin`, `admin`, `moderator`, `support_admin`), `status` (`active`, `deactivated`), and bounded permission override lists (`customPermissions`, `revokedPermissions`).
    - Only `isSuperAdmin()` can create, delete, or change roles/permissions in `/admins/{adminId}`.
    - Audit logs in `/audit_logs/{logId}` are strictly append-only (`allow update, delete: if false;`) and can only be created by active administrators (`isAdmin()`) with `createdAt == request.time`.

