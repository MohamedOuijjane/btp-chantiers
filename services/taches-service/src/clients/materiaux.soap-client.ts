import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { appel } from './http';

const NS = 'http://btp.uiz.ma/materiaux';

/**
 * Consommation SOAP du module Matériaux (Spring-WS).
 * Montre l'interopérabilité REST/JSON <-> SOAP/XML entre deux technologies.
 */
@Injectable()
export class MateriauxSoapClient {
  private readonly url = `${process.env.MATERIAUX_URL ?? 'http://localhost:8084'}/ws`;

  static enveloppe(materiauId: number, quantite: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:m="${NS}">
  <soapenv:Header/>
  <soapenv:Body>
    <m:VerifierStockRequest>
      <m:materiauId>${materiauId}</m:materiauId>
      <m:quantite>${quantite}</m:quantite>
    </m:VerifierStockRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  static lire(xml: string, balise: string): string | undefined {
    return new RegExp(`<(?:\\w+:)?${balise}>([^<]*)</(?:\\w+:)?${balise}>`).exec(xml)?.[1];
  }

  async verifierStock(materiauId: number, quantite: number): Promise<void> {
    const res = await appel('Matériaux', this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
      body: MateriauxSoapClient.enveloppe(materiauId, quantite),
    });
    const xml = await res.text();
    const fault = MateriauxSoapClient.lire(xml, 'faultstring');
    if (fault) throw new UnprocessableEntityException(`Matériaux : ${fault}`);
    if (MateriauxSoapClient.lire(xml, 'disponible') !== 'true') {
      const stock = MateriauxSoapClient.lire(xml, 'stockActuel');
      throw new UnprocessableEntityException(
        `Stock insuffisant pour le matériau ${materiauId} (demandé ${quantite}, disponible ${stock})`,
      );
    }
  }
}
