import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/env";

const protectedPrefixes = ["/dashboard", "/expenses", "/onboarding"];
const authPrefixes = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        getSupabaseUrl(),
        getSupabasePublicKey(),
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value);
                        response.cookies.set(name, value, options);
                    });
                }
            }
        }
    );

    const {
        data: { user }
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const isProtected = protectedPrefixes.some((prefix) => path.startsWith(prefix));
    const isAuthRoute = authPrefixes.some((prefix) => path.startsWith(prefix));

    if (!user && isProtected) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (user && isAuthRoute) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
