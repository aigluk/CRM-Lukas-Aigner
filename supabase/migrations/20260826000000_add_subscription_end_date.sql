-- Add optional end_date to subscriptions so a subscription that ended
-- is excluded from period calculations after that date.

ALTER TABLE public.accounting_subscriptions
  ADD COLUMN IF NOT EXISTS end_date DATE;
