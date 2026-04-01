import { describe, it, expect } from "vitest";
import {
    calculateFreeAmount,
    calculateSettlement,
    calculateTotalSpentByUser,
    getSettlementDetails,
} from "./calculations";
import { Decimal } from "@prisma/client/runtime/library";

describe("calculateSettlement", () => {
    const USER_A = "user-a-id";
    const USER_B = "user-b-id";

    describe("Despesas Compartilhadas (isShared = true)", () => {
        it("deve calcular corretamente quando USER_A paga uma despesa compartilhada", () => {
            const transactions = [
                {
                    id: "t1",
                    amount: 100,
                    isShared: true,
                    userId: USER_A,
                    payerId: USER_A, // USER_A pagou
                },
            ];

            const balance = calculateSettlement(transactions, USER_A);
            expect(balance).toBe(50); // USER_B deve 50 para USER_A
        });

        it("deve calcular corretamente quando USER_B paga uma despesa compartilhada", () => {
            const transactions = [
                {
                    id: "t1",
                    amount: 100,
                    isShared: true,
                    userId: USER_A,
                    payerId: USER_B, // USER_B pagou
                },
            ];

            const balance = calculateSettlement(transactions, USER_A);
            expect(balance).toBe(-50); // USER_A deve 50 para USER_B
        });

        it("deve lidar com múltiplas despesas compartilhadas", () => {
            const transactions = [
                {
                    id: "t1",
                    amount: 100, // USER_A pagou
                    isShared: true,
                    userId: USER_A,
                    payerId: USER_A,
                },
                {
                    id: "t2",
                    amount: 60, // USER_B pagou
                    isShared: true,
                    userId: USER_A,
                    payerId: USER_B,
                },
            ];

            const balance = calculateSettlement(transactions, USER_A);
            // USER_A pagou 100, então USER_B deve 50
            // USER_B pagou 60 que pertence a USER_A, então USER_A deve 30
            // Saldo: 50 - 30 = 20
            expect(balance).toBe(20);
        });
    });

    describe("Cenário 'Julinho usou meu cartão' (isShared = false, userId != payerId)", () => {
        it("deve calcular débito completo quando outro usuário paga sua despesa", () => {
            const transactions = [
                {
                    id: "t1",
                    amount: 50,
                    isShared: false,
                    userId: USER_A, // Despesa é de USER_A
                    payerId: USER_B, // Mas USER_B pagou
                },
            ];

            const balance = calculateSettlement(transactions, USER_A);
            expect(balance).toBe(-50); // USER_A deve 50 para USER_B
        });

        it("deve creditar quando você paga despesa do outro", () => {
            const transactions = [
                {
                    id: "t1",
                    amount: 75,
                    isShared: false,
                    userId: USER_B, // Despesa é de USER_B
                    payerId: USER_A, // Mas USER_A pagou
                },
            ];

            const balance = calculateSettlement(transactions, USER_A);
            expect(balance).toBe(75); // USER_B deve 75 para USER_A
        });
    });

    describe("Casos Combinados", () => {
        it("deve combinar despesas compartilhadas com 'Julinho usou meu cartão'", () => {
            const transactions = [
                {
                    id: "t1",
                    amount: 100,
                    isShared: true,
                    userId: USER_A,
                    payerId: USER_A, // Compartilhado, USER_A pagou: USER_B deve 50
                },
                {
                    id: "t2",
                    amount: 40,
                    isShared: false,
                    userId: USER_A,
                    payerId: USER_B, // "Julinho usou meu cartão": USER_A deve 40
                },
            ];

            const balance = calculateSettlement(transactions, USER_A);
            // USER_B deve 50 (compartilhado) - 40 (Julinho) = 10
            expect(balance).toBe(10);
        });

        it("case de teste real: mês típico de um casal", () => {
            const transactions = [
                {
                    id: "t1",
                    amount: 200,
                    isShared: true,
                    userId: USER_A,
                    payerId: USER_A, // Aluguel: USER_B deve 100
                },
                {
                    id: "t2",
                    amount: 60,
                    isShared: true,
                    userId: USER_A,
                    payerId: USER_B, // Mercado: USER_A deve 30
                },
                {
                    id: "t3",
                    amount: 50,
                    isShared: false,
                    userId: USER_A,
                    payerId: USER_B, // Cinema (Julinho usou cartão): USER_A deve 50
                },
                {
                    id: "t4",
                    amount: 30,
                    isShared: false,
                    userId: USER_B,
                    payerId: USER_A, // Uber (outro usou cartão): USER_B deve 30
                },
            ];

            const balance = calculateSettlement(transactions, USER_A);
            // USER_B deve 100 (aluguel)
            // USER_A deve 30 (mercado)
            // USER_A deve 50 (cinema)
            // USER_B deve 30 (uber)
            // Saldo: 100 - 30 - 50 + 30 = 50
            expect(balance).toBe(50);

            // Do ponto de vista de USER_B deve ser o inverso
            const balanceB = calculateSettlement(transactions, USER_B);
            expect(balanceB).toBe(-50);
        });
    });

    describe("Precisão Decimal", () => {
        it("deve lidar com valores decimais corretamente", () => {
            const transactions = [
                {
                    id: "t1",
                    amount: new Decimal("99.99"),
                    isShared: true,
                    userId: USER_A,
                    payerId: USER_A,
                },
            ];

            const balance = calculateSettlement(transactions, USER_A);
            expect(balance).toBe(50); // 99.99 / 2 arredondado para 2 casas
        });

        it("deve arredondar corretamente para 2 casas decimais", () => {
            const transactions = [
                {
                    id: "t1",
                    amount: 33.33,
                    isShared: true,
                    userId: USER_A,
                    payerId: USER_A,
                },
                {
                    id: "t2",
                    amount: 33.34,
                    isShared: true,
                    userId: USER_A,
                    payerId: USER_B,
                },
            ];

            const balance = calculateSettlement(transactions, USER_A);
            // 33.33/2 = 16.665 ≈ 16.67
            // 33.34/2 = 16.67
            // 16.67 - 16.67 = 0
            expect(typeof balance).toBe("number");
            expect(balance.toString().split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
        });
    });

    describe("Edge Cases", () => {
        it("deve retornar 0 quando não há transações", () => {
            const balance = calculateSettlement([], USER_A);
            expect(balance).toBe(0);
        });

        it("deve ignorar transações onde userId == payerId e isShared == false", () => {
            const transactions = [
                {
                    id: "t1",
                    amount: 100,
                    isShared: false,
                    userId: USER_A,
                    payerId: USER_A, // Mesma pessoa, sem compartilhamento: sem impacto
                },
            ];

            const balance = calculateSettlement(transactions, USER_A);
            expect(balance).toBe(0); // Sem débito, pois pagou seu próprio gasto
        });

        it("deve retornar 0 para despesa do outro que o outro pagou", () => {
            const transactions = [
                {
                    id: "t1",
                    amount: 100,
                    isShared: false,
                    userId: USER_B,
                    payerId: USER_B,
                },
            ];

            const balance = calculateSettlement(transactions, USER_A);
            expect(balance).toBe(0); // Não afeta USER_A
        });
    });
});

describe("calculateTotalSpentByUser", () => {
    const USER_A = "user-a-id";
    const USER_B = "user-b-id";

    it("deve somar total de gasto do usuário", () => {
        const transactions = [
            { id: "t1", amount: 100, isShared: true, userId: USER_A, payerId: USER_A },
            { id: "t2", amount: 60, isShared: true, userId: USER_A, payerId: USER_B },
            { id: "t3", amount: 50, isShared: false, userId: USER_B, payerId: USER_A },
        ];

        const total = calculateTotalSpentByUser(transactions, USER_A);
        expect(total).toBe(160); // 100 + 60
    });

    it("deve retornar 0 se usuário não tem despesas", () => {
        const transactions = [
            { id: "t1", amount: 100, isShared: true, userId: USER_B, payerId: USER_B },
        ];

        const total = calculateTotalSpentByUser(transactions, USER_A);
        expect(total).toBe(0);
    });
});

describe("getSettlementDetails", () => {
    it("deve retornar mensagem de quitação", () => {
        const details = getSettlementDetails(0, "João", "Maria");
        expect(details.balance).toBe(0);
        expect(details.isSettled).toBe(true);
        expect(details.description).toContain("quites");
    });

    it("deve mostrar débito positivo corretamente", () => {
        const details = getSettlementDetails(100, "João", "Maria");
        expect(details.balance).toBe(100);
        expect(details.isSettled).toBe(false);
        expect(details.description).toContain("Maria");
        expect(details.description).toContain("100.00");
    });

    it("deve mostrar débito negativo corretamente", () => {
        const details = getSettlementDetails(-75, "João", "Maria");
        expect(details.balance).toBe(-75);
        expect(details.isSettled).toBe(false);
        expect(details.description).toContain("João");
        expect(details.description).toContain("75.00");
    });
});

describe("calculateFreeAmount", () => {
    it("deve calcular o valor livre subtraindo despesas pendentes do salário", () => {
        expect(calculateFreeAmount(5000, 1800)).toBe(3200);
    });

    it("deve retornar valor negativo quando pendências superam salário", () => {
        expect(calculateFreeAmount(2000, 2450)).toBe(-450);
    });

    it("deve manter arredondamento financeiro com duas casas", () => {
        expect(calculateFreeAmount(1234.56, 234.11)).toBe(1000.45);
    });
});
