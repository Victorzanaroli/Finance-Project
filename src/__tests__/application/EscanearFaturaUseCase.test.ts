/**
 * src/__tests__/application/EscanearFaturaUseCase.test.ts
 */

import { EscanearFaturaUseCase } from "../../application/use-cases/EscanearFaturaUseCase";
import { FakeFaturaOcrGateway } from "../helpers/fakes";

describe("EscanearFaturaUseCase", () => {
  it("delega ao gateway de OCR e devolve os dados da fatura", async () => {
    const ocr = new FakeFaturaOcrGateway({ titulo: "Netflix", valor: "39,90", categoria: "Assinaturas" });

    const dados = await new EscanearFaturaUseCase(ocr).executar("file:///foto.jpg");

    expect(dados).toEqual({ titulo: "Netflix", valor: "39,90", categoria: "Assinaturas" });
    expect(ocr.chamadas).toEqual(["file:///foto.jpg"]);
  });

  it("exige a URI da foto", async () => {
    const ocr = new FakeFaturaOcrGateway();
    await expect(new EscanearFaturaUseCase(ocr).executar("  ")).rejects.toThrow("fotoUri é obrigatória");
    expect(ocr.chamadas).toHaveLength(0);
  });
});
