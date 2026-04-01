import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const nextPath = requestUrl.searchParams.get("next");
    const safeNextPath =
        nextPath && nextPath.startsWith("/") ? nextPath : "/spaces";

    if (!code) {
        return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        return NextResponse.redirect(new URL("/login?error=invalid_or_expired_link", request.url));
    }

    return NextResponse.redirect(new URL(safeNextPath, request.url));
}
