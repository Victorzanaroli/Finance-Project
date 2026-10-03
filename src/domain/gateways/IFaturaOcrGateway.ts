/**
 * src/domain/gateways/IFaturaOcrGateway.ts
 *
 * Camada: Domínio — Porta de reconhecimento de faturas (OCR).
 *
 * Antes a interface ICameraGateway vivia no adapter e vazava tipos do
 * React/expo-camera (RefObject<CameraView>). Aqui o contrato é puro: recebe
 * a URI da foto e devolve os dados extraídos.
 */

export interface DadosFatura {
  titulo: string;
  /** Valor textual como lido na fatura (ex.: "148,90"). */
  valor: string;
  categoria: string;
}

export interface IFaturaOcrGateway {
  reconhecer(fotoUri: string): Promise<DadosFatura>;
}
