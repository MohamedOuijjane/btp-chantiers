import { cinUnique, connecter, expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await connecter(page, 'CONDUCTEUR');
});

async function supprimer(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Supprimer' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Supprimer l’ouvrier ?' });
  await dialogue.getByRole('button', { name: 'Supprimer' }).click();
  return dialogue;
}

test.describe('Ouvriers', () => {
  test('création, puis CIN en double refusée sous le champ CIN', async ({ page, api, suffixe }) => {
    const cin = cinUnique();
    const nom = `E2E${suffixe}`;
    await page.goto('/ouvriers');

    const remplir = async (prenom: string) => {
      await page.getByRole('button', { name: 'Nouvel ouvrier' }).click();
      const dialogue = page.getByRole('dialog', { name: 'Nouvel ouvrier' });
      await dialogue.getByLabel('Prénom').fill(prenom);
      await dialogue.getByLabel('Nom', { exact: true }).fill(nom);
      await dialogue.getByLabel('CIN').fill(cin.toLowerCase());
      await dialogue.getByLabel('Spécialité').selectOption({ label: 'Maçon' });
      await dialogue.getByRole('button', { name: 'Ajouter l’ouvrier' }).click();
      return dialogue;
    };

    await remplir('Youssef');
    await expect(page.getByText(`Youssef ${nom} ajouté à l’équipe.`)).toBeVisible();
    await api.suivre('/api/ouvriers', (o) => o.cin === cin);

    const dialogue = await remplir('Ali');
    await expect(
      dialogue.getByText(`La CIN ${cin} est déjà utilisée par un autre ouvrier`),
    ).toBeVisible();
    await expect(dialogue.getByLabel('CIN')).toHaveAttribute('aria-invalid', 'true');
  });

  test('suppression refusée (409) : l’ouvrier est affecté à une tâche non terminée', async ({
    page,
    api,
    suffixe,
  }) => {
    const ouvrier = await api.creerOuvrier('Rachid', `E2E${suffixe}`, cinUnique());
    const chantier = await api.creerChantier(`Chantier E2E ${suffixe}`);
    await api.creerTache(chantier.id, `Coffrage ${suffixe}`, [ouvrier.id]);

    await page.goto(`/ouvriers/${ouvrier.id}`);
    const dialogue = await supprimer(page);

    const alerte = dialogue.getByRole('alert');
    await expect(alerte).toContainText('Conflit');
    await expect(alerte).toContainText(`« Coffrage ${suffixe} »`);
  });

  test('suppression acceptée : ouvrier sans tâche, retour à l’équipe', async ({
    page,
    api,
    suffixe,
  }) => {
    const ouvrier = await api.creerOuvrier('Omar', `E2E${suffixe}`, cinUnique());

    await page.goto(`/ouvriers/${ouvrier.id}`);
    await supprimer(page);

    await expect(page.getByText(`Omar E2E${suffixe} a été supprimé.`)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Ouvriers' })).toBeVisible();
  });
});
