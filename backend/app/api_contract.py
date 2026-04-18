"""
Frozen API behaviour for V1 (from product plan).

PATCH /me (guest) with `name` in body:
  HTTP 400
  { "error": "field_not_allowed", "field": "name", "message": "Guests cannot change full name" }

Invite / register errors:
  - invalid or expired token: 400 { "error": "invalid_invite", "message": "..." }
  - email already registered: 400 { "error": "email_taken", "message": "..." }
  - validation (password length, name trim): 422 FastAPI default

Auth:
  - missing/invalid Bearer: 401 { "detail": "Not authenticated" } or { "error": "invalid_token" }
  - forbidden action: 403 { "error": "forbidden", "message": "..." }
"""
