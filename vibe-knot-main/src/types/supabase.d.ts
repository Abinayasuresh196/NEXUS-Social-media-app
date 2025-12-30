declare module '@/integrations/supabase/client' {
  import type { SupabaseClient } from '@supabase/supabase-js';
  export const supabase: SupabaseClient;
}
