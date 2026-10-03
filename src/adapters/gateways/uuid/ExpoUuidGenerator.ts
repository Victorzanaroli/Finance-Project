/**
 * src/adapters/gateways/uuid/ExpoUuidGenerator.ts
 *
 * Camada: Adapters — Implementação concreta de IUuidGenerator usando expo-crypto.
 *
 * Isola o acoplamento com expo-crypto dentro do adapter.
 * O RegistrarTransacaoUseCase usa IUuidGenerator sem saber desta implementação.
 */

import * as Crypto from "expo-crypto";
import type { IUuidGenerator } from '../../../domain/gateways/IUuidGenerator';

export class ExpoUuidGenerator implements IUuidGenerator {
  gerar(): string {
    return Crypto.randomUUID();
  }
}
