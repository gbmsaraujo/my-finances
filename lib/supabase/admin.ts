import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";

let adminClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseAdminClient() {
    if (!adminClient) {
        adminClient = createClient(
            getSupabaseUrl(),
            getSupabaseServiceRoleKey(),
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            },
        );
    }

    return adminClient;
}