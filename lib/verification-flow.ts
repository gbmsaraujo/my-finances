import { ValidationCodeType } from "@/lib/validation-codes";

export type VerificationFlowType = "signup" | "forgot-password" | "invite";

type VerificationFlowConfig = {
    validationCodeType: ValidationCodeType;
    defaultNextPath: string;
};

const FLOW_CONFIG: Record<VerificationFlowType, VerificationFlowConfig> = {
    signup: {
        validationCodeType: "SIGNUP",
        defaultNextPath: "/spaces",
    },
    "forgot-password": {
        validationCodeType: "FORGOT_PASSWORD",
        defaultNextPath: "/reset-password",
    },
    invite: {
        validationCodeType: "INVITE",
        defaultNextPath: "/accept-invite",
    },
};

function isVerificationFlowType(value: string): value is VerificationFlowType {
    return value in FLOW_CONFIG;
}

export function parseVerificationFlowType(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    const normalized = value.trim().toLowerCase();

    if (!isVerificationFlowType(normalized)) {
        return null;
    }

    return normalized;
}

export function getVerificationFlowConfig(flowType: VerificationFlowType) {
    return FLOW_CONFIG[flowType];
}

export function getFlowTypeFromValidationCode(type: ValidationCodeType): VerificationFlowType {
    if (type === "SIGNUP") {
        return "signup";
    }

    if (type === "FORGOT_PASSWORD") {
        return "forgot-password";
    }

    return "invite";
}
