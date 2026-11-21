import { cinUnique, connecter, expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await connecter(page, 'CONDUCTEUR');
});

test.describe('Tâches', () => {
  test('création d’une tâche depuis la fiche chantier, puis ouverture de sa fiche', async ({
    page,
    api,
    suffixe,
  }) => {
    const chantier = await api.creerChantier(`Chantier tâches E2E ${suffixe}`);
    const titre = `Terrassement E2E ${suffixe}`;

    await page.goto(`/chantiers/${chantier.id}/taches/nouvelle`);
    await page.getByLabel('Titre de la tâche').fill(titre);
    await page.getByLabel('Date de début').fill('2027-03-02');
    await page.getByLabel('Date de fin').fill('2027-03-12');
    await page.getByRole('button', { name: 'Créer la tâche' }).click();

    await expect(page.getByRole('heading', { level: 1, name: titre })).toBeVisible();
    await api.suivre('/api/taches', (t) => t.titre === titre);
    await expect(page.getByRole('link', { name: chantier.nom })).toBeVisible();

    await page.goto(`/chantiers/${chantier.id}`);
    await expect(page.getByRole('tab', { name: 'Tâches · 1' })).toBeVisible();
    await expect(page.getByRole('link', { name: titre })).toBeVisible();
  });

  test('cycle de vie : démarrer, avancement 60 %, bloquer avec motif, débloquer', async ({
    page,
    api,
    suffixe,
  }) => {
    const chantier = await api.creerChantier(`Chantier cycle E2E ${suffixe}`);
    const tache = await api.creerTache(chantier.id, `Coffrage E2E ${suffixe}`);
    await page.goto(`/taches/${tache.id}`);

    await page.getByRole('button', { name: `Démarrer la tâche ${tache.titre}` }).click();
    await expect(page.getByText(`« ${tache.titre} » est en cours.`)).toBeVisible();

    await page.getByRole('button', { name: 'Avancement' }).click();
    const avancement = page.getByRole('dialog', { name: 'Mettre à jour l’avancement' });
    await avancement.getByLabel('Avancement (%)').fill('60');
    await avancement.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText(`Avancement de « ${tache.titre} » : 60 %.`)).toBeVisible();
    await expect(page.getByText('60 %', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Bloquer' }).click();
    const blocage = page.getByRole('dialog', { name: 'Bloquer la tâche' });
    await blocage.getByLabel('Motif du blocage').fill('Livraison du béton en retard');
    await blocage.getByRole('button', { name: 'Bloquer' }).click();
    await expect(page.getByText('Motif du blocage : Livraison du béton en retard')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Avancement' })).toBeDisabled();

    await page.getByRole('button', { name: 'Débloquer' }).click();
    await expect(page.getByText(`« ${tache.titre} » est débloquée.`)).toBeVisible();
    const historique = page.getByRole('list', { name: 'Historique des statuts' });
    await expect(historique.getByRole('listitem')).toHaveCount(4);
  });

  test('tâche bloquée entre-temps : l’avancement est refusé (409) dans le dialogue (#143)', async ({
    page,
    api,
    suffixe,
  }) => {
    const chantier = await api.creerChantier(`Chantier 409 E2E ${suffixe}`);
    const tache = await api.creerTache(chantier.id, `Dalle E2E ${suffixe}`);
    await page.goto(`/taches/${tache.id}`);

    await page.getByRole('button', { name: 'Avancement' }).click();
    const d = page.getByRole('dialog', { name: 'Mettre à jour l’avancement' });
    await api.bloquerTache(tache.id, 'Contrôle du bureau d’études');
    await d.getByLabel('Avancement (%)').fill('40');
    await d.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(d.getByText('Débloquez la tâche avant de changer son avancement')).toBeVisible();
    await d.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByText('Motif du blocage : Contrôle du bureau d’études')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Avancement' })).toBeDisabled();
  });

  test('affectation d’un ouvrier depuis sa fiche (actions visibles avec Tâches en réel)', async ({
    page,
    api,
    suffixe,
  }) => {
    const ouvrier = await api.creerOuvrier('Karim', `E2E${suffixe}`, cinUnique());
    const chantier = await api.creerChantier(`Chantier affectation E2E ${suffixe}`);
    const tache = await api.creerTache(chantier.id, `Ferraillage E2E ${suffixe}`);

    await page.goto(`/ouvriers/${ouvrier.id}`);
    await page.getByRole('button', { name: 'Affecter à une tâche' }).click();
    const d = page.getByRole('dialog', { name: 'Affecter à une tâche' });
    const option = d.getByRole('option', {
      name: `${tache.titre} · ${chantier.nom}`,
      exact: false,
    });
    await d.getByLabel('Tâche').selectOption((await option.getAttribute('value')) ?? '');
    await d.getByRole('button', { name: 'Affecter' }).click();

    await expect(page.getByText(`Karim E2E${suffixe} affecté à « ${tache.titre} ».`)).toBeVisible();
    const planning = page.getByRole('list', { name: `Planning de Karim E2E${suffixe}` });
    await expect(planning.getByRole('link', { name: tache.titre })).toBeVisible();
  });
});
