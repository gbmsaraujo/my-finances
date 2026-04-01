import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncUserProfile } from "@/lib/user-profile";

export interface AuthContext {
    userId: string;
    email: string;
    name: string | null;
}

export async function requireAuthUser(): Promise<AuthContext> {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.id || !data.user?.email) {
        throw new Error("Usuário não autenticado");
    }

    const profile = await syncUserProfile({
        authUserId: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
    });

    return {
        userId: profile.id,
        email: profile.email,
        name: profile.name ?? null
    };
}

export async function getUserHousehold(userId: string) {
    return prisma.householdMember.findFirst({
        where: { userId },
        include: {
            household: {
                include: {
                    members: {
                        include: {
                            user: true
                        }
                    }
                }
            }
        }
    });
}
