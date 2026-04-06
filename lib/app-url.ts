export function getAppUrl() {
    const explicitUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
        process.env.APP_URL?.replace(/\/$/, "");

    if (explicitUrl) {
        return /^https?:\/\//i.test(explicitUrl)
            ? explicitUrl
            : `https://${explicitUrl}`;
    }

    const vercelUrl = process.env.VERCEL_URL?.replace(/\/$/, "");

    if (vercelUrl) {
        return /^https?:\/\//i.test(vercelUrl)
            ? vercelUrl
            : `https://${vercelUrl}`;
    }

    if (process.env.NODE_ENV === "production") {
        throw new Error(
            "Defina NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SITE_URL ou APP_URL para gerar links absolutos em produção.",
        );
    }

    return "http://localhost:3000";
}