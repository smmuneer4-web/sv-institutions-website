# Auth Testing Playbook — S V Group of Institutions

Custom email/password JWT auth (bcrypt + PyJWT, httpOnly cookies) per integration playbook.

## Setup
- backend/.env: JWT_SECRET (64-hex), ADMIN_EMAIL, ADMIN_PASSWORD
- Admin seeded idempotently on startup (`seed_admin`); if .env password changes, stored hash is re-reconciled on restart.

## MongoDB Verification
```
mongosh --quiet --eval 'db = db.getSiblingDB("test_database"); db.users.find({role:"admin"}).pretty()'
```
Verify: password_hash starts with $2b$; unique index on users.email; index on login_attempts.identifier.

## API Verification
```
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
# login (sets cookies)
curl -c /tmp/c.txt -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"admissions@svinstitutions.co.in","password":"SvAdmin@2025"}'
# session check
curl -b /tmp/c.txt "$API_URL/api/auth/me"
# protected list (401 without cookies)
curl -s -o /dev/null -w "%{http_code}\n" "$API_URL/api/applications"
curl -b /tmp/c.txt "$API_URL/api/applications"
# logout
curl -b /tmp/c.txt -X POST "$API_URL/api/auth/logout"
```

## Brute force
login_attempts collection keyed by ip:email — 5 failures → 15 min lockout (429).
