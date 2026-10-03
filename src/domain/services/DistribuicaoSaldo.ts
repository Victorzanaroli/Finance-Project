/**
 * src/domain/services/DistribuicaoSaldo.ts
 *
 * Camada: Domínio — Domain Service. Regra 80/20 de sugestão de distribuição
 * do Caixa Livre (antes embutida no componente visual DistributionBar).
 */

/** 80% do saldo livre sugerido para guardar/investir. */
export const PERCENTUAL_GUARDAR = 0.8;
/** 20% do saldo livre sugerido para lazer. */
export const PERCENTUAL_LAZER = 0.2;

export interface DistribuicaoSaldoLivre {
  guardar: number;
  lazer: number;
  /** true quando não há saldo positivo para distribuir. */
  negativo: boolean;
}

export function distribuirSaldoLivre(saldoLivre: number): DistribuicaoSaldoLivre {
  if (saldoLivre <= 0) {
    return { guardar: 0, lazer: 0, negativo: true };
  }
  return {
    guardar: saldoLivre * PERCENTUAL_GUARDAR,
    lazer: saldoLivre * PERCENTUAL_LAZER,
    negativo: false,
  };
}
