do $$ begin
  alter publication supabase_realtime add table public.product_additions;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.product_sauces;
exception when duplicate_object then null; end $$;
