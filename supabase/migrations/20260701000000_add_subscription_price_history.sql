-- Add price_history JSONB to subscriptions so price changes don't retroactively
-- alter historical cost calculations.
-- Each entry: { "id": "<uuid>", "effective_from": "YYYY-MM-DD", "amount": 21.60, "note": "optional" }

ALTER TABLE public.accounting_subscriptions
  ADD COLUMN IF NOT EXISTS price_history JSONB NOT NULL DEFAULT '[]'::jsonb;
