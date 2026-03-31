"use server";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface ActionResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export async function sendSignupOtp(email: string, name: string): Promise<ActionResponse<null>> {
    try {
        const supabase = createSupabaseServerClient();

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true,
                data: {
                    name
                },
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/verify`
            }
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao enviar código"
        };
    }
}

export async function sendLoginOtp(email: string): Promise<ActionResponse<null>> {
    try {
        const supabase = createSupabaseServerClient();

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: false,
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/verify`
            }
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao enviar código"
        };
    }
}

export async function verifyOtp(email: string, token: string): Promise<ActionResponse<{ needsOnboarding: boolean }>> {
    try {
        const supabase = createSupabaseServerClient();

        const { error, data } = await supabase.auth.verifyOtp({
            email,
            token,
            type: "email"
        });

        if (error || !data.user) {
            return { success: false, error: error?.message ?? "Código inválido" };
        }

        const profile = await prisma.user.upsert({
            where: { id: data.user.id },
            update: {
                email: data.user.email ?? email,
                name: data.user.user_metadata?.name ?? data.user.email?.split("@")[0]
            },
            create: {
                id: data.user.id,
                email: data.user.email ?? email,
                name: data.user.user_metadata?.name ?? data.user.email?.split("@")[0]
            }
        });

        const membership = await prisma.householdMember.findFirst({
            where: { userId: profile.id }
        });

        return {
            success: true,
            data: {
                needsOnboarding: !membership
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao validar código"
        };
    }
}

export async function signOut(): Promise<void> {
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
}
