# Auditing & Security Notes

- ORM: This project uses Prisma ORM which by design uses parameterized queries and protects against SQL injection when using the Prisma Client API.
- Note from manual testing: Running `sqlmap` against the API endpoints returned `not injectable` for tested injection vectors.

Recommendations:
- Keep Prisma and database drivers up to date.
- Use prepared statements / Prisma Client only (avoid raw SQL); if raw SQL is necessary, use parameterized queries and Prisma's parameter binding.

How to apply DB migrations:

1. Ensure `DATABASE_URL` is set in your environment.
2. Run migrations with:

```bash
npm run migrate:deploy
npm run prisma:generate
```

Optional automatic migration on server start:

- Set `RUN_MIGRATIONS_ON_START=true` in your environment to run `npx prisma migrate deploy` automatically when the server starts.

Enable additional security middleware:

- Install optional packages:

```bash
npm install helmet express-rate-limit
```

- These are optional; the server will run without them, but installing them enables additional HTTP hardening and rate limiting.
