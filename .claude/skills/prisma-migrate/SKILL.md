---
name: prisma-migrate
description: Guide and execute safe Prisma database schema migrations, validate relations, and regenerate the Prisma client.
disable-model-invocation: true
---

# Prisma Migration Skill

Use this workflow to safely create, test, and apply database schema migrations using Prisma ORM.

## Workflow

1. **Inspect Schema Changes**:
   - Review `prisma/schema.prisma` for changes in models, relations, or indexes.
   - Verify optional foreign keys and cascade rules (e.g. `userId` on `Order` with `onDelete: SetNull` for guest checkouts).

2. **Create & Apply Migration**:
   - Run migration in development:
     ```bash
     npx prisma migrate dev --name <migration_name>
     ```
   - For pushing schema directly in local development:
     ```bash
     npx prisma db push
     ```

3. **Regenerate Prisma Client**:
   ```bash
   npx prisma generate
   ```

4. **Verify TypeScript Types**:
   - Verify `@prisma/client` types match the updated database models.
