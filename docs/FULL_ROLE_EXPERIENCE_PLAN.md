# QuickBite Core — Full Four-Role Experience

This change expands the existing Core API into four complete experiences without modifying the separate frontend repository.

## Student
- Existing menu, profile and self-order flow remain available.
- Adds favorites, preferences, notifications, capabilities and order lifecycle visibility.
- Student can create orders only for the authenticated student account.

## Parent
- Adds family membership and linked-child visibility.
- Parent can read their own orders and orders belonging to active linked children.
- Parent can create an order for themselves or for an active linked child.
- Parent cannot operate cafeteria orders or access unrelated students.

## Staff
- Retains operational order access.
- Adds protected order-state mutation and delivery/preparation notifications.
- Staff remains unable to use administrative endpoints.

## Admin
- Retains full operational visibility.
- Adds family-link administration and an overview endpoint for role counts, order states, approved sales and low stock.
- Administrative endpoints remain restricted to `admin`.

## Cross-role personalization
- Per-account theme preference: `light`, `dark`, or `system`.
- Notification preferences.
- Dashboard configuration.
- Favorites.
- Notifications and read state.
- `/v1/capabilities` exposes the server-authoritative capability matrix to clients.

## Security model
Role checks are necessary but not sufficient for Parent. Parent access to student resources is constrained by `family_links` with `status = 'active'`. Order creation is authorized by the database function so a forged `beneficiaryUserId` cannot bypass the family relationship.

## API additions
- `GET /v1/capabilities`
- `GET /v1/family/children`
- `POST /v1/orders` with optional `beneficiaryUserId` for Parent
- `PATCH /v1/orders/:id` for Staff/Admin
- `GET|PUT /v1/preferences`
- `GET|POST|DELETE /v1/favorites`
- `GET /v1/notifications`
- `POST /v1/notifications/:id/read`
- `POST /v1/admin/family-links`
- `GET /v1/admin/overview`

## Database additions
Migration `0003_full_role_experiences.sql` adds:
- `orders.beneficiary_user_id`
- `family_links`
- `user_preferences`
- `favorites`
- a transaction-safe order creation function for Student/Parent

All changes belong to `quickbite-core`; the frontend repository is intentionally untouched.
