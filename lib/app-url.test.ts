import { afterEach, describe, expect, it } from "vitest";
import { getAppUrl } from "./app-url";

describe("getAppUrl", () => {
    const oldNextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    const oldNextPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const oldAppUrl = process.env.APP_URL;
    const oldVercelUrl = process.env.VERCEL_URL;
    const oldNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NEXT_PUBLIC_APP_URL = oldNextPublicAppUrl;
        process.env.NEXT_PUBLIC_SITE_URL = oldNextPublicSiteUrl;
        process.env.APP_URL = oldAppUrl;
        process.env.VERCEL_URL = oldVercelUrl;
        process.env.NODE_ENV = oldNodeEnv;
    });

    it("usa NEXT_PUBLIC_APP_URL quando definido", () => {
        process.env.NEXT_PUBLIC_APP_URL = "https://my-finances.app/";

        expect(getAppUrl()).toBe("https://my-finances.app");
    });

    it("usa NEXT_PUBLIC_SITE_URL como fallback", () => {
        delete process.env.NEXT_PUBLIC_APP_URL;
        process.env.NEXT_PUBLIC_SITE_URL = "my-finances.app";

        expect(getAppUrl()).toBe("https://my-finances.app");
    });

    it("falha em produção sem URL pública configurada", () => {
        delete process.env.NEXT_PUBLIC_APP_URL;
        delete process.env.NEXT_PUBLIC_SITE_URL;
        delete process.env.APP_URL;
        delete process.env.VERCEL_URL;
        process.env.NODE_ENV = "production";

        expect(() => getAppUrl()).toThrow(
            "Defina NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SITE_URL ou APP_URL para gerar links absolutos em produção.",
        );
    });
});
