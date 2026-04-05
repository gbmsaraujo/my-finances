type ResendEmailInput = {
    to: string;
    subject: string;
    text: string;
    html: string;
    fromEnvKey: string;
    replyToEnvKey?: string;
    missingEnvMessage: string;
};

function isValidSenderAddress(fromEmail: string) {
    return !/(@gmail\.com|@hotmail\.com|@outlook\.com|@yahoo\.com)/i.test(fromEmail);
}

export async function sendResendEmail(input: ResendEmailInput) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env[input.fromEnvKey];
    const replyTo = input.replyToEnvKey ? process.env[input.replyToEnvKey] : undefined;

    if (!apiKey || !fromEmail) {
        return {
            sent: false as const,
            reason: "missing_env" as const,
            message: input.missingEnvMessage,
        };
    }

    if (!isValidSenderAddress(fromEmail)) {
        return {
            sent: false as const,
            reason: "missing_env" as const,
            message:
                "O remetente precisa ser um endereco validado no Resend (dominio proprio ou onboarding@resend.dev em teste).",
        };
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: fromEmail,
            to: [input.to],
            ...(replyTo ? { reply_to: replyTo } : {}),
            subject: input.subject,
            text: input.text,
            html: input.html,
        }),
    });

    if (!response.ok) {
        const providerPayload = await response
            .json()
            .catch(() => null as { message?: string } | null);

        return {
            sent: false as const,
            reason: "provider_error" as const,
            message:
                providerPayload?.message ||
                `Resend retornou erro HTTP ${response.status}.`,
        };
    }

    return { sent: true as const };
}