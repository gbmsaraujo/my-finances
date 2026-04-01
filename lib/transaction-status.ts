export type TransactionPaymentStatus = "PENDING" | "PAID";

const STATUS_MARKER_REGEX = /^\[STATUS:(PENDING|PAID)\]\s*/;

export function parseTransactionStatus(note?: string | null): {
    status: TransactionPaymentStatus;
    note: string | null;
} {
    if (!note) {
        return { status: "PENDING", note: null };
    }

    const trimmed = note.trim();
    const match = trimmed.match(STATUS_MARKER_REGEX);

    if (!match) {
        return {
            status: "PENDING",
            note: trimmed || null,
        };
    }

    const cleaned = trimmed.replace(STATUS_MARKER_REGEX, "").trim();
    return {
        status: match[1] as TransactionPaymentStatus,
        note: cleaned || null,
    };
}

export function encodeTransactionStatusNote(
    status: TransactionPaymentStatus,
    note?: string | null,
): string {
    const cleaned = note?.trim() ?? "";
    const marker = `[STATUS:${status}]`;
    return cleaned ? `${marker} ${cleaned}` : marker;
}
