import { sendResendEmail } from "@/lib/email";
import { getVerificationFlowConfig, VerificationFlowType } from "@/lib/verification-flow";
import {
    buildValidationCodeLink,
} from "@/lib/validation-codes";

type VerificationEmailContext = {
    type: VerificationFlowType;
    to: string;
    code: string;
    expiresAtIso: string;
    householdName?: string;
};

function getSubject(params: VerificationEmailContext) {
    if (params.type === "signup") {
        return "Confirme seu cadastro no My Finances";
    }

    if (params.type === "forgot-password") {
        return "Redefinição de senha no My Finances";
    }

    return `Convite para acessar o space ${params.householdName ?? ""} no My Finances`.trim();
}

function getHeading(params: VerificationEmailContext) {
    if (params.type === "signup") {
        return "Confirme seu cadastro";
    }

    if (params.type === "forgot-password") {
        return "Redefinição de senha";
    }

    return "Convite para um space";
}

function getDescription(params: VerificationEmailContext) {
    if (params.type === "signup") {
        return "Recebemos sua solicitação de cadastro. Confirme seu email para liberar o acesso.";
    }

    if (params.type === "forgot-password") {
        return "Recebemos uma solicitação para redefinir sua senha.";
    }

    return `Você recebeu um convite para entrar no space ${params.householdName ?? ""}.`.trim();
}

function getCtaLabel(params: VerificationEmailContext) {
    if (params.type === "signup") {
        return "Confirmar cadastro";
    }

    if (params.type === "forgot-password") {
        return "Redefinir senha";
    }

    return "Aceitar convite";
}

function getFooter(params: VerificationEmailContext) {
    if (params.type === "forgot-password") {
        return "Se você não solicitou isso, ignore este email.";
    }

    if (params.type === "invite") {
        return "Se você não esperava este convite, ignore esta mensagem.";
    }

    return "Se você não criou a conta, ignore esta mensagem.";
}

function buildVerificationLink(params: VerificationEmailContext) {
    const flowConfig = getVerificationFlowConfig(params.type);

    return buildValidationCodeLink({
        path: "/auth/verify",
        code: params.code,
        email: params.to,
        type: params.type,
        next: flowConfig.defaultNextPath,
    });
}

export function buildVerificationEmail(params: VerificationEmailContext) {
    const formattedExpiration = new Date(params.expiresAtIso).toLocaleString("pt-BR");
    const link = buildVerificationLink(params);
    const subject = getSubject(params);
    const heading = getHeading(params);
    const description = getDescription(params);
    const ctaLabel = getCtaLabel(params);
    const footer = getFooter(params);

    const text = [
        `My Finances - ${heading}`,
        "",
        description,
        "",
        `Codigo: ${params.code}`,
        `Link: ${link}`,
        `Validade: ${formattedExpiration}`,
        "",
        footer,
    ].join("\n");

    const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827;">
            <p style="margin: 0 0 12px;"><strong>My Finances</strong></p>
            <p style="margin: 0 0 12px;"><strong>${heading}</strong></p>
            <p style="margin: 0 0 12px;">${description}</p>
            <p style="margin: 0 0 8px;">Use o codigo abaixo para continuar:</p>
            <p style="margin: 0 0 16px; font-size: 22px; font-weight: 700; letter-spacing: 3px;">${params.code}</p>
            <p style="margin: 0 0 16px;">
                <a href="${link}" style="display:inline-block; background:#4f46e5; color:#ffffff; text-decoration:none; padding:10px 14px; border-radius:8px; font-weight:600;">
                    ${ctaLabel}
                </a>
            </p>
            <p style="margin: 0 0 8px; font-size: 14px; color: #374151;">Link direto: <a href="${link}" style="color:#1d4ed8;">${link}</a></p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">Validade: ${formattedExpiration}</p>
            <hr style="border:0; border-top:1px solid #e5e7eb; margin: 16px 0;" />
            <p style="margin: 0; font-size: 12px; color: #6b7280;">${footer}</p>
        </div>
    `;

    return {
        subject,
        text,
        html,
    };
}

export async function sendVerificationEmail(params: VerificationEmailContext) {
    const email = buildVerificationEmail(params);

    return sendResendEmail({
        to: params.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
        fromEnvKey: "INVITE_FROM_EMAIL",
        replyToEnvKey: "INVITE_REPLY_TO",
        missingEnvMessage:
            "Defina RESEND_API_KEY e INVITE_FROM_EMAIL para enviar emails de validacao.",
    });
}
