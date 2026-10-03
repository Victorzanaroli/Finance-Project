/**
 * Teste do Domain Service CaixinhasPadrao — fonte única do "seed" de metas.
 * Antes estava duplicado em ListarCaixinhasUseCase e LimparDadosUseCase,
 * com IDs fixos não-UUID ("seed-poupanca") incompatíveis com a coluna uuid
 * do Supabase.
 */

import { criarCaixinhasPadrao } from "../../domain/services/CaixinhasPadrao";

describe("criarCaixinhasPadrao()", () => {
  it("cria 'Poupança' (R$500) e 'Reserva da Moto' (R$150) com IDs gerados", () => {
    let n = 0;
    const [poupanca, moto] = criarCaixinhasPadrao({ gerar: () => `id-${++n}` });

    expect(poupanca).toMatchObject({
      id: "id-1",
      title: "Poupança",
      targetAmount: 500,
      currentAmount: 0,
      colorHex: "#7c3aed",
      syncStatus: "pending",
    });
    expect(moto).toMatchObject({
      id: "id-2",
      title: "Reserva da Moto",
      targetAmount: 150,
      currentAmount: 0,
      colorHex: "#f59e0b",
      syncStatus: "pending",
    });
  });
});
