import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { appel } from './http';

const NS = 'http://btp.uiz.ma/materiaux';

const ENTITES: Record<string, string> = { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' };

/** Entités XML prédéfinies et références numériques (&#233; ou &#xE9;). */
function decoderEntites(texte: string): string {
  return texte.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|quot|apos|amp);/g, (_, e: string) => {
    if (e.startsWith('#x')) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return String.fromCodePoint(Number(e.slice(1)));
    return ENTITES[e];
  });
}

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

  /**
   * Texte d'un élément, quel que soit son préfixe d'espace de noms (`ns2:`, `SOAP-ENV:`, aucun)
   * et même s'il porte des attributs : Spring-WS envoie `<faultstring xml:lang="en">…</faultstring>`.
   * Gère les retours à la ligne, les sections CDATA et les entités XML (`&amp;`, `&#233;`…).
   */
  static lire(xml: string, balise: string): string | undefined {
    const element = new RegExp(
      `<(?:[\\w.-]+:)?${balise}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${balise}\\s*>`,
    ).exec(xml);
    if (!element) return undefined;
    const cdata = /^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/.exec(element[1]);
    return cdata ? cdata[1] : decoderEntites(element[1].trim());
  }

  /** Vrai si la réponse est une SOAP Fault (élément Fault dans le Body, préfixe quelconque). */
  static estFaute(xml: string): boolean {
    return /<(?:[\w.-]+:)?Fault[\s>]/.test(xml);
  }

  async verifierStock(materiauId: number, quantite: number): Promise<void> {
    const res = await appel('Matériaux', this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
      body: MateriauxSoapClient.enveloppe(materiauId, quantite),
    });
    const xml = await res.text();
    // Toute SOAP Fault de VerifierStock (matériau inconnu, requête refusée…) est un refus : 422,
    // avec le message de la faute, et non un faux « stock insuffisant ».
    if (MateriauxSoapClient.estFaute(xml)) {
      const message =
        MateriauxSoapClient.lire(xml, 'faultstring') ??
        `erreur SOAP ${MateriauxSoapClient.lire(xml, 'faultcode') ?? 'sans message'}`;
      throw new UnprocessableEntityException(`Matériaux : ${message}`);
    }
    if (MateriauxSoapClient.lire(xml, 'disponible') !== 'true') {
      const stock = MateriauxSoapClient.lire(xml, 'stockActuel');
      throw new UnprocessableEntityException(
        `Stock insuffisant pour le matériau ${materiauId} (demandé ${quantite}, disponible ${stock})`,
      );
    }
  }
}
