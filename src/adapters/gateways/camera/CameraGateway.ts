/**
 * src/adapters/gateways/camera/CameraGateway.ts
 *
 * Camada: Adapters — Gateway de Câmera.
 *
 * REGRA DE ISOLAMENTO (Clean Architecture):
 *   O expo-camera e expo-image-picker são detalhes de infraestrutura nativa.
 *   Este gateway impede que essas bibliotecas "vazem" para domain/ ou application/.
 *   A UI chama este gateway; o domínio jamais sabe que a câmera existe.
 *
 * Fluxo: LancamentosScreen → CameraGateway → expo-camera
 */

import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef } from "react";
import type { RefObject } from "react";

/** Resultado simulado do OCR ao fotografar uma fatura. */
export interface OcrResult {
  titulo: string;
  valor: string;
  categoria: string;
}

/** Resultado da foto tirada pela câmera. */
export interface FotoCapturada {
  uri: string;
}

/** Interface do gateway de câmera (permite mock em testes futuros). */
export interface ICameraGateway {
  solicitarPermissao: () => Promise<boolean>;
  tirarFoto: (ref: RefObject<CameraView | null>) => Promise<FotoCapturada | null>;
  simularOcr: (foto: FotoCapturada) => Promise<OcrResult>;
}

/**
 * Implementação do CameraGateway usando expo-camera.
 * Simula OCR com um setTimeout de 2 segundos.
 */
class CameraGatewayExpo implements ICameraGateway {
  async solicitarPermissao(): Promise<boolean> {
    // A permissão é gerenciada pelo hook useCameraPermissions() na UI
    // Este método é mantido para compatibilidade da interface
    return true;
  }

  async tirarFoto(ref: RefObject<CameraView | null>): Promise<FotoCapturada | null> {
    if (!ref.current) return null;
    try {
      const foto = await ref.current.takePictureAsync({ quality: 0.7 });
      return foto ? { uri: foto.uri } : null;
    } catch {
      return null;
    }
  }

  /**
   * Simula OCR: aguarda 2 segundos e retorna dados fictícios de uma fatura.
   * Em produção, aqui entraria uma chamada para a API de OCR.
   */
  async simularOcr(_foto: FotoCapturada): Promise<OcrResult> {
    // Banco de faturas simuladas para variar o resultado
    const faturasMock: OcrResult[] = [
      { titulo: "Conta de Luz", valor: "148,90", categoria: "Casa" },
      { titulo: "Internet Fibra", valor: "99,90", categoria: "Casa" },
      { titulo: "Água e Esgoto", valor: "62,30", categoria: "Casa" },
      { titulo: "Supermercado Extra", valor: "237,50", categoria: "Alimentação" },
      { titulo: "Netflix", valor: "39,90", categoria: "Assinaturas" },
      { titulo: "Spotify", valor: "21,90", categoria: "Assinaturas" },
    ];

    return new Promise((resolve) => {
      setTimeout(() => {
        const idx = Math.floor(Math.random() * faturasMock.length);
        resolve(faturasMock[idx]);
      }, 2000);
    });
  }
}

/** Singleton exportado — usado diretamente na tela de Lançamentos. */
export const cameraGateway: ICameraGateway = new CameraGatewayExpo();

/** Re-exporta os hooks nativos para uso na UI (não vazam para domain/application). */
export { CameraView, useCameraPermissions };
export { useRef };
