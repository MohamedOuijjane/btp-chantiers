// Formats d'affichage communs : dates jj/mm/aaaa, montants en MAD.

const MONTANT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const NOMBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** 2026-09-01 → 01/09/2026 */
export function formatDate(iso: string) {
  const [a, m, j] = iso.slice(0, 10).split('-');
  return `${j}/${m}/${a}`;
}

/** 2026-09-01 → 01/09 */
export function formatDateCourte(iso: string) {
  return formatDate(iso).slice(0, 5);
}

/** 2500000 → « 2 500 000 MAD » */
export function formatMontant(montant: number) {
  return `${MONTANT.format(montant)} MAD`;
}

/** 2.4 → « 2,4 » ; 12500 → « 12 500 » */
export function formatNombre(valeur: number) {
  return NOMBRE.format(valeur);
}

/** Initiales d'une personne : « Youssef El Amrani » → « YE ». */
export function initiales(prenom: string, nom: string) {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

/** 0612345678 → « 06 12 34 56 78 » ; +212612345678 → « +212 6 12 34 56 78 ». */
export function formatTelephone(tel: string | null | undefined) {
  if (!tel) return '—';
  const m = /^(\+212|0)(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(tel);
  if (!m) return tel;
  const [, prefixe, a, b, c, d, e] = m;
  return prefixe === '0' ? `0${a} ${b} ${c} ${d} ${e}` : `+212 ${a} ${b} ${c} ${d} ${e}`;
}
