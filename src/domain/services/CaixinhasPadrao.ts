/**
 * src/domain/services/CaixinhasPadrao.ts
 *
 * Camada: Domínio — Domain Service. Define as caixinhas iniciais do app
 * (linguagem ubíqua do usuário): "Poupança" e "Reserva da Moto".
 * Fonte única — usado por ListarCaixinhasUseCase (primeiro acesso) e
 * LimparDadosUseCase (reset).
 */

import { Goal } from "../entities/Goal";
import type { IUuidGenerator } from "../gateways/IUuidGenerator";

export function criarCaixinhasPadrao(uuidGenerator: IUuidGenerator): Goal[] {
  return [
    Goal.criar({
      id: uuidGenerator.gerar(),
      title: "Poupança",
      targetAmount: 500,
      colorHex: "#7c3aed",
    }),
    Goal.criar({
      id: uuidGenerator.gerar(),
      title: "Reserva da Moto",
      targetAmount: 150,
      colorHex: "#f59e0b",
    }),
  ];
}
