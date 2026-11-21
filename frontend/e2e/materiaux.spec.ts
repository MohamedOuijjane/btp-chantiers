import { connecter, expect, referenceUnique, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await connecter(page, 'MAGASINIER');
});

/** Choisit l'option dont le texte contient `texte` (« Ciment E2E · stock 10 sacs »). */
async function choisir(liste: Locator, texte: string) {
  const valeur = await liste.locator('option', { hasText: texte }).getAttribute('value');
  await liste.selectOption(valeur ?? '');
}

/** Dialogue « Mouvement de stock » rempli et envoyé depuis la page Matériaux. */
async function mouvement(
  page: Page,
  {
    type,
    materiau,
    chantier,
    quantite,
  }: { type: 'Entrée' | 'Sortie'; materiau: string; chantier: string; quantite: string },
) {
  await page.getByRole('button', { name: 'Entrée / sortie de stock' }).click();
  const d = page.getByRole('dialog', { name: 'Mouvement de stock' });
  await d.getByRole('radio', { name: type }).click();
  await choisir(d.getByLabel('Matériau'), materiau);
  await choisir(d.getByLabel('Chantier'), chantier);
  await d.getByLabel(/^Quantité/).fill(quantite);
  await d.getByRole('button', { name: 'Enregistrer le mouvement' }).click();
  return d;
}

test.describe('Matériaux (web service SOAP)', () => {
  test('nouveau matériau, entrée, sortie refusée (stock insuffisant), sortie sous le seuil', async ({
    page,
    api,
    suffixe,
  }) => {
    const chantier = await api.creerChantier(`Chantier stock E2E ${suffixe}`);
    const reference = referenceUnique();
    const nom = `Ciment E2E ${suffixe}`;

    await page.goto('/materiaux');
    await page.getByRole('button', { name: 'Nouveau matériau' }).click();
    const d = page.getByRole('dialog', { name: 'Nouveau matériau' });
    await d.getByLabel('Référence').fill(reference);
    await d.getByLabel('Nom').fill(nom);
    await d.getByLabel('Unité').fill('sacs');
    await d.getByLabel('Stock initial').fill('10');
    await d.getByLabel('Seuil d’alerte').fill('4');
    await d.getByRole('button', { name: 'Ajouter le matériau' }).click();
    await expect(page.getByText(`${nom} (${reference}) ajouté au stock.`)).toBeVisible();
    const ligne = page.getByRole('row').filter({ hasText: reference });
    await expect(ligne.getByText('Suffisant')).toBeVisible();

    await mouvement(page, { type: 'Entrée', materiau: nom, chantier: chantier.nom, quantite: '5' });
    await expect(page.getByText(`Entrée enregistrée : ${nom} 15 sacs en stock.`)).toBeVisible();

    const refus = await mouvement(page, {
      type: 'Sortie',
      materiau: nom,
      chantier: chantier.nom,
      quantite: '20',
    });
    await expect(refus.getByText(/Stock insuffisant pour/)).toBeVisible();
    await refus.getByRole('button', { name: 'Annuler' }).click();

    await mouvement(page, {
      type: 'Sortie',
      materiau: nom,
      chantier: chantier.nom,
      quantite: '12',
    });
    await expect(page.getByText(`${nom} est sous le seuil d’alerte.`)).toBeVisible();
    await expect(ligne.getByText('En alerte')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Derniers mouvements' })).toContainText(nom);

    await page.goto(`/chantiers/${chantier.id}`);
    await page.getByRole('tab', { name: 'Matériaux consommés · 2' }).click();
    await expect(page.getByRole('tabpanel').getByText(nom)).toHaveCount(2);
  });

  test('chantier clôturé : la sortie est refusée par Matériaux', async ({ page, api, suffixe }) => {
    const chantier = await api.creerChantier(`Chantier clos E2E ${suffixe}`);
    await api.cloturerChantier(chantier.id);
    const reference = referenceUnique();
    const nom = `Sable E2E ${suffixe}`;

    await page.goto('/materiaux');
    await page.getByRole('button', { name: 'Nouveau matériau' }).click();
    const d = page.getByRole('dialog', { name: 'Nouveau matériau' });
    await d.getByLabel('Référence').fill(reference);
    await d.getByLabel('Nom').fill(nom);
    await d.getByLabel('Unité').fill('t');
    await d.getByLabel('Stock initial').fill('8');
    await d.getByLabel('Seuil d’alerte').fill('1');
    await d.getByRole('button', { name: 'Ajouter le matériau' }).click();
    await expect(page.getByText(`${nom} (${reference}) ajouté au stock.`)).toBeVisible();

    const refus = await mouvement(page, {
      type: 'Sortie',
      materiau: nom,
      chantier: `${chantier.nom} (clôturé)`,
      quantite: '2',
    });
    await expect(refus.getByRole('alert')).toContainText(/terminé|clôturé/);
  });

  test('référence déjà utilisée : refus du service (Conflit) affiché dans le dialogue', async ({
    page,
    suffixe,
  }) => {
    const reference = referenceUnique();
    await page.goto('/materiaux');
    for (const essai of [1, 2]) {
      await page.getByRole('button', { name: 'Nouveau matériau' }).click();
      const d = page.getByRole('dialog', { name: 'Nouveau matériau' });
      await d.getByLabel('Référence').fill(reference);
      await d.getByLabel('Nom').fill(`Gravier E2E ${suffixe} ${essai}`);
      await d.getByLabel('Unité').fill('t');
      await d.getByLabel('Stock initial').fill('3');
      await d.getByLabel('Seuil d’alerte').fill('1');
      await d.getByRole('button', { name: 'Ajouter le matériau' }).click();
      if (essai === 2) {
        await expect(
          d.getByText(`La référence ${reference} est déjà utilisée`, { exact: false }),
        ).toBeVisible();
      }
    }
  });
});
