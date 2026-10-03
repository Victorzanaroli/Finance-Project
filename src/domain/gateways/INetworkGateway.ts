/**
 * src/domain/gateways/INetworkGateway.ts
 *
 * Camada: Domínio — Porta de conectividade (SKILL.md seção 6/9: NetInfo).
 * Permite ao SincronizarFilaUseCase decidir se tenta sincronizar, sem conhecer
 * @react-native-community/netinfo.
 */
export interface INetworkGateway {
  /** true se há conexão de internet utilizável no momento. */
  estaConectado(): Promise<boolean>;
}
