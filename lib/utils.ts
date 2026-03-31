export function normalizeInviteCode(value: string) {
    return value.replace(/\D/g, "").slice(0, 6);
}

export function generateInviteCode() {
    return `${Math.floor(100000 + Math.random() * 900000)}`;
}
