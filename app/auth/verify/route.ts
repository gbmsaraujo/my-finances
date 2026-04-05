import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
    getVerificationFlowConfig,
    parseVerificationFlowType,
} from "@/lib/verification-flow";
import { findActiveValidationCode } from "@/lib/validation-codes";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const email = requestUrl.searchParams.get("email");
    const type = requestUrl.searchParams.get("type");
    const nextPath = requestUrl.searchParams.get("next");
    const safeNextPath =
        nextPath && nextPath.startsWith("/") ? nextPath : "/spaces";

    if (!code) {
        return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
    }

    if (type && email) {
        const flowType = parseVerificationFlowType(type);

        if (flowType) {
            const flowConfig = getVerificationFlowConfig(flowType);
            const validationCode = await findActiveValidationCode({
                type: flowConfig.validationCodeType,
                code,
                email,
            });

            if (!validationCode) {
                return NextResponse.redirect(
                    new URL("/login?error=invalid_or_expired_link", request.url),
                );
            }

            if (flowType === "forgot-password") {
                const redirectUrl = new URL("/reset-password", request.url);
                redirectUrl.searchParams.set("code", code);
                redirectUrl.searchParams.set("email", email);
                return NextResponse.redirect(redirectUrl);
            }

            if (flowType === "invite") {
                const redirectUrl = new URL("/accept-invite", request.url);
                redirectUrl.searchParams.set("code", code);
                redirectUrl.searchParams.set("email", email);
                return NextResponse.redirect(redirectUrl);
            }

            return NextResponse.redirect(new URL(safeNextPath, request.url));
        }
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        return NextResponse.redirect(new URL("/login?error=invalid_or_expired_link", request.url));
    }

    return NextResponse.redirect(new URL(safeNextPath, request.url));
}
