export function getAppUrl() {
    const explicitUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

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

    return "http://localhost:3000";
}