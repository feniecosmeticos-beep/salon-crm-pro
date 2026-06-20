# Supabase

Initial Supabase workspace for Salon CRM Pro.

## Files

- `migrations/001_initial_schema.sql`: initial schema with tables, indexes, updated_at triggers, RLS, and basic authenticated policies.
- `seed.sql`: fictional development data for Salão Modelo.

## Manual Setup

Use the Supabase SQL Editor and run the files in this order:

1. Run `migrations/001_initial_schema.sql`.
2. Run `seed.sql`.

The seed depends on the tables created by the migration.
