import { connecter, expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await connecter(page, 'CONDUCTEUR');
});

async function supprimer(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Supprimer' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Supprimer le chantier ?' });
  await dialogue.getByRole('button', { name: 'Supprimer' }).click();
  return dialogue;
}

test.describe('Chantiers', () => {
  test('création d’un chantier depuis la liste', async ({ page, api, suffixe }) => {
    const nom = `Résidence E2E ${suffixe}`;
    await page.goto('/chantiers');
    await page.getByRole('button', { name: 'Nouveau chantier' }).click();
    const dialogue = page.getByRole('dialog', { name: 'Nouveau chantier' });
    await dialogue.getByLabel('Nom', { exact: true }).fill(nom);
    await dialogue.getByLabel('Client').fill('Recette E2E');
    await dialogue.getByLabel('Adresse').fill('Hay Dakhla, Agadir');
    await dialogue.getByLabel('Budget (MAD)').fill('2500000');
    await dialogue.getByLabel('Date de début').fill('2027-03-01');
    await dialogue.getByLabel('Date de fin prévue').fill('2027-12-20');
    await dialogue.getByRole('button', { name: 'Créer le chantier' }).click();

    await expect(dialogue).toBeHidden();
    await api.suivre('/api/chantiers', (c) => c.nom === nom);
    await expect(page.getByRole('link', { name: nom })).toBeVisible();
  });

  test('suppression refusée (409) : le chantier a une tâche, citée dans le message', async ({
    page,
    api,
    suffixe,
  }) => {
    const chantier = await api.creerChantier(`Villa E2E ${suffixe}`);
    await api.creerTache(chantier.id, `Terrassement ${suffixe}`);

    await page.goto(`/chantiers/${chantier.id}`);
    const dialogue = await supprimer(page);

    const alerte = dialogue.getByRole('alert');
    await expect(alerte).toContainText('Conflit');
    await expect(alerte).toContainText(`« Terrassement ${suffixe} »`);
  });

  test('suppression acceptée : chantier sans tâche, retour à la liste', async ({
    page,
    api,
    suffixe,
  }) => {
    const chantier = await api.creerChantier(`Lotissement E2E ${suffixe}`);

    await page.goto(`/chantiers/${chantier.id}`);
    await supprimer(page);

    await expect(page.getByText(`Le chantier « ${chantier.nom} » a été supprimé.`)).toBeVisible();
    await expect(page).toHaveURL(/\/chantiers$/);
    await expect(page.getByRole('link', { name: chantier.nom })).toHaveCount(0);
  });
});
