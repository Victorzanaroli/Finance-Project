/**
 * src/domain/gateways/IUuidGenerator.ts
 *
 * Camada: Domínio — Porta para geração de UUIDs no cliente (offline-first).
 *
 * Antes vivia dentro de RegistrarTransacaoUseCase.ts, o que obrigava o adapter
 * (ExpoUuidGenerator) a importar de um arquivo de caso de uso. Portas de saída
 * pertencem ao domínio (SKILL.md seção 10).
 *
 * A implementação real usa expo-crypto no adapter; fakes de teste retornam
 * valores determinísticos.
 */
export interface IUuidGenerator {
  gerar(): string;
}
