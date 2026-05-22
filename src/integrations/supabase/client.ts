// Re-export the canonical Supabase client from @/lib/supabase.
// Both import paths work: "@/integrations/supabase/client" and "@/lib/supabase".
export { supabase } from "@/lib/supabase";
export type { Database, Tables, InsertTables, UpdateTables } from "@/lib/supabase";
