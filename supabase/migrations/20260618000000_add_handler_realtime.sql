-- Add handler column (who last worked on the lead)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS handler text;

-- Enable Realtime on leads so all connected clients get live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
