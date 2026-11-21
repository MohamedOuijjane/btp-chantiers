/**
 * Scénario de démonstration complet (#31), rejoué par l'interface comme en soutenance :
 * connexion en conducteur de travaux, création d'un chantier, d'un ouvrier, d'un matériau et
 * d'une tâche ; refus pour stock insuffisant (Tâches → Matériaux en SOAP) ; démarrage et
 * avancement à 60 % ; la tâche apparaît dans le planning de l'ouvrier.
 */
import { cinUnique, connecter, expect, referenceUnique, test } from './fixtures';

test('scénario de démo : chantier, ouvrier, matériau, tâche, stock insuffisant, avancement, planning', async ({
  page,
  api,
  suffixe,
}) => {
  test.setTimeout(90_000);
  const chantier = `Résidence Démo ${suffixe}`;
  const prenom = 'Hassan';
  const nom = `Démo${suffixe}`;
  const cin = cinUnique();
  const materiau = `Ciment démo ${suffixe}`;
  const reference = referenceUnique();
  const tache = `Coulage de la dalle ${suffixe}`;

  // 1. Connexion
  await connecter(page, 'CONDUCTEUR');

  // 2. Chantier
  await page.goto('/chantiers');
  await page.getByRole('button', { name: 'Nouveau chantier' }).click();
  const dChantier = page.getByRole('dialog', { name: 'Nouveau chantier' });
  await dChantier.getByLabel('Nom', { exact: true }).fill(chantier);
  await dChantier.getByLabel('Client').fill('Souss Immo');
  await dChantier.getByLabel('Adresse').fill('Hay Mohammadi, Agadir');
  await dChantier.getByLabel('Budget (MAD)').fill('4200000');
  await dChantier.getByLabel('Date de début').fill('2027-03-01');
  await dChantier.getByLabel('Date de fin prévue').fill('2027-12-20');
  await dChantier.getByRole('button', { name: 'Créer le chantier' }).click();
  await expect(dChantier).toBeHidden();
  await api.suivre('/api/chantiers', (c) => c.nom === chantier);

  // 3. Ouvrier
  await page.goto('/ouvriers');
  await page.getByRole('button', { name: 'Nouvel ouvrier' }).click();
  const dOuvrier = page.getByRole('dialog', { name: 'Nouvel ouvrier' });
  await dOuvrier.getByLabel('Prénom').fill(prenom);
  await dOuvrier.getByLabel('Nom', { exact: true }).fill(nom);
  await dOuvrier.getByLabel('CIN').fill(cin);
  await dOuvrier.getByLabel('Spécialité').selectOption({ label: 'Maçon' });
  await dOuvrier.getByRole('button', { name: 'Ajouter l’ouvrier' }).click();
  await expect(page.getByText(`${prenom} ${nom} ajouté à l’équipe.`)).toBeVisible();
  await api.suivre('/api/ouvriers', (o) => o.cin === cin);

  // 4. Matériau (le web service n'a pas de suppression : il reste en base)
  await page.goto('/materiaux');
  await page.getByRole('button', { name: 'Nouveau matériau' }).click();
  const dMateriau = page.getByRole('dialog', { name: 'Nouveau matériau' });
  await dMateriau.getByLabel('Référence').fill(reference);
  await dMateriau.getByLabel('Nom').fill(materiau);
  await dMateriau.getByLabel('Unité').fill('sacs');
  await dMateriau.getByLabel('Stock initial').fill('50');
  await dMateriau.getByLabel('Seuil d’alerte').fill('10');
  await dMateriau.getByRole('button', { name: 'Ajouter le matériau' }).click();
  await expect(page.getByText(`${materiau} (${reference}) ajouté au stock.`)).toBeVisible();

  // 5. Tâche depuis la fiche du chantier : ouvrier affecté, 80 sacs demandés pour 50 en stock
  await page.goto('/chantiers');
  await page.getByRole('link', { name: chantier }).click();
  await page.getByRole('link', { name: 'Nouvelle tâche' }).click();
  await page.getByLabel('Titre de la tâche').fill(tache);
  await page.getByLabel('Date de début').fill('2027-03-02');
  await page.getByLabel('Date de fin').fill('2027-03-12');
  await page.getByText(`${prenom} ${nom}`, { exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter un matériau' }).click();
  const choix = page.getByLabel('Matériau 1', { exact: true });
  await choix.selectOption(
    (await choix.locator('option', { hasText: reference }).getAttribute('value')) ?? '',
  );
  const quantite = page.getByLabel(/^Quantité/);
  await quantite.fill('80');
  await expect(page.getByText('Stock insuffisant', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Créer la tâche' }).click();

  // 6. Refus du serveur : Tâches vérifie le stock auprès de Matériaux (VerifierStock) → 422
  const refus = page.getByRole('alert').filter({ hasText: 'Stock insuffisant pour le matériau' });
  await expect(refus).toBeVisible();
  await expect(refus).toContainText('422');

  // 7. Quantité corrigée : la tâche est créée
  await quantite.fill('30');
  await page.getByRole('button', { name: 'Créer la tâche' }).click();
  await expect(page.getByRole('heading', { level: 1, name: tache })).toBeVisible();
  await api.suivre('/api/taches', (t) => t.titre === tache);

  // 8. Démarrage puis avancement à 60 %
  await page.getByRole('button', { name: `Démarrer la tâche ${tache}` }).click();
  await expect(page.getByText(`« ${tache} » est en cours.`)).toBeVisible();
  await page.getByRole('button', { name: 'Avancement' }).click();
  const dAvancement = page.getByRole('dialog', { name: 'Mettre à jour l’avancement' });
  await dAvancement.getByLabel('Avancement (%)').fill('60');
  await dAvancement.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText(`Avancement de « ${tache} » : 60 %.`)).toBeVisible();

  // 9. Planning de l'ouvrier
  await page.goto('/ouvriers');
  await page.getByRole('link', { name: `${prenom} ${nom}` }).click();
  const planning = page.getByRole('list', { name: `Planning de ${prenom} ${nom}` });
  await expect(planning).toContainText(tache);
  await expect(planning).toContainText(chantier);
});
