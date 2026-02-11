# Authentication Token Security Status

## Current Implementation

Auth tokens (session and refresh) are stored in **httpOnly cookies**.

**Backend**: `services/auth/src/controllers/auth.controller.ts`
**Frontend**: `src/contexts/AuthContext.tsx`

## Cookie Configuration

```typescript
{
  httpOnly: true,                    // Cannot be accessed by JavaScript
  secure: isProduction,              // HTTPS only in production
  sameSite: 'lax',                   // Same-site protection (CSRF)
  path: '/',                         // Available on all paths
  maxAge: 15 * 60 * 1000,           // Session: 15 minutes
  // maxAge: 7 * 24 * 60 * 60 * 1000  // Refresh: 7 days
}
```

## Security Properties

- ✅ **httpOnly** – Cannot be accessed by JavaScript (immune to XSS token theft)
- ✅ **secure** – HTTPS only in production
- ✅ **sameSite: lax** – Prevents CSRF for cross-site requests
- ✅ Cookies sent automatically – no manual `Authorization` header
- ✅ No tokens stored in localStorage
- ✅ No tokens exposed in response bodies

## Architecture

### Token Flow

1. **Login** (`POST /auth/verify`):
   - Backend verifies SIWE signature
   - Sets `sessionToken` and `refreshToken` as httpOnly cookies
   - Returns only `{ user }` in response body

2. **API Requests**:
   - Frontend uses `credentials: "include"` on all `fetch()` calls
   - Browser sends cookies automatically – no manual header injection
   - Backend `requireAuth` middleware reads token from cookie (falls back to `Authorization` header for backward compat)

3. **Token Refresh** (`POST /auth/refresh`):
   - Frontend calls refresh endpoint with `credentials: "include"`
   - Backend reads refresh token from cookie, generates new tokens
   - Sets new cookies in the response

4. **Logout** (`POST /auth/logout`):
   - Backend reads refresh token from cookie, invalidates it
   - Clears both cookies (sets `maxAge: 0`)

5. **Auth Check** (`GET /auth/me`):
   - Frontend calls on page load to restore session
   - Backend reads session cookie, verifies JWT, returns user data
   - If session expired, frontend attempts a refresh first

6. **WebSocket**:
   - Browser sends cookies with the WebSocket upgrade request automatically
   - WS server extracts `sessionToken` from the `Cookie` header
   - Falls back to query param `?token=` for backward compatibility

### File References

**Backend**:
- `services/auth/src/controllers/auth.controller.ts` – Cookie setting/clearing, `/auth/me` handler
- `services/auth/src/router.ts` – Route definitions including `/auth/me`
- `shared/auth/middleware.ts` – `requireAuth` reads cookie → fallback to Bearer header
- `services/ws/src/auth.ts` – WS token extraction from cookie header

**Frontend**:
- `src/contexts/AuthContext.tsx` – No localStorage, uses `/auth/me` for session restore
- `src/services/apiClient.ts` – No manual Authorization header, uses `credentials: "include"`
- `src/services/websocket.ts` – No manual token, cookies sent with upgrade request
- `src/App.tsx` – Wires up apiClient auth-error handler for auto-refresh

## Additional Security Measures

1. **CSP Headers** – Prevent XSS by blocking inline scripts (see CSP_SECURITY_NOTES.md)
2. **Input Sanitization** – DOMPurify is used in middleware.ts
3. **Short Token Expiry** – Access tokens expire in 15 minutes
4. **Token Revocation** – Backend supports token blacklisting
5. **Audit Logging** – All auth events are logged
6. **Device Tracking** – Session-level device tracking

## Completed Checklist

- [x] httpOnly cookies on backend (verify, refresh, logout)
- [x] `/auth/me` endpoint for cookie-based auth check
- [x] Frontend localStorage removal
- [x] Frontend manual Authorization header removal
- [x] Shared `requireAuth` middleware updated for cookies
- [x] WebSocket auth via cookies
- [x] Backward compatibility (still accepts Bearer header and body params)

## Future Improvements

- [ ] Consider refresh token rotation (new refresh token on each use – already done)
- [ ] Implement device fingerprinting
- [ ] Add suspicious activity detection
- [ ] Add CSRF token for extra protection on state-changing requests
