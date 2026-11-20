import { connecter, expect, PROFILS, test } from './fixtures';

const menu = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Navigation principale' });

test.describe('Connexion', () => {
  test('le conducteur de travaux se connecte et voit tout le menu', async ({ page }) => {
    await connecter(page, 'CONDUCTEUR');

    await expect(page.getByText('Samir Haddou')).toBeVisible();
    for (const section of ['Tableau de bord', 'Chantiers', 'Tâches', 'Ouvriers', 'Matériaux']) {
      await expect(menu(page).getByRole('link', { name: section })).toBeVisible();
    }
  });

  test('le magasinier voit Matériaux mais pas Ouvriers', async ({ page }) => {
    await connecter(page, 'MAGASINIER');

    await expect(page).toHaveURL(/\/materiaux$/);
    await expect(menu(page).getByRole('link', { name: 'Matériaux' })).toBeVisible();
    await expect(menu(page).getByRole('link', { name: 'Ouvriers' })).toHaveCount(0);
  });

  test('un mauvais mot de passe est refusé avec un message clair', async ({ page }) => {
    await page.goto('/connexion');
    await page.getByText(PROFILS.CHEF_CHANTIER.libelle, { exact: true }).click();
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByText('Adresse e-mail ou mot de passe incorrect.')).toBeVisible();
    await expect(page).toHaveURL(/\/connexion/);
  });

  test('la déconnexion ramène à l’écran de connexion', async ({ page }) => {
    await connecter(page, 'CONDUCTEUR');
    await page.getByRole('button', { name: 'Déconnexion' }).click();

    await expect(page).toHaveURL(/\/connexion/);
    await page.goto('/chantiers');
    await expect(page).toHaveURL(/\/connexion/);
  });
});
