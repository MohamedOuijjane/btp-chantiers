# Tests de bout en bout (Playwright)

Parcours rejoués dans un vrai navigateur (Chromium) sur la stack Docker complète, via la gateway :

| Fichier | Parcours |
|---|---|
| `connexion.spec.ts` | Connexion du conducteur de travaux (menu complet), du magasinier (Matériaux sans Ouvriers), mot de passe refusé, déconnexion |
| `chantiers.spec.ts` | Création d'un chantier ; suppression refusée (409, tâche citée) ; suppression acceptée (#5) |
| `ouvriers.spec.ts` | Création d'un ouvrier ; CIN en double sous le champ (#114) ; suppression refusée (409, tâche citée) ; suppression acceptée (#15) |

Chaque parcours se connecte par l'écran `/connexion` (`connecter(page, profil)` dans `fixtures.ts`). Les données sont propres à chaque test (suffixe unique) : celles qu'un parcours ne crée pas lui-même (une tâche qui bloque une suppression) sont créées par l'API, et tout ce qui a été créé est supprimé à la fin du test, même en cas d'échec.

## Lancer

```bash
make up                          # stack Docker
make e2e                         # npm ci, puis les tests ; rapport dans frontend/playwright-report/
```

Ou directement, depuis `frontend/` (navigateur à installer une fois : `npx playwright install chromium`) :

```bash
DEMO_MOT_DE_PASSE=<celui du .env> E2E_URL=http://localhost:8080 npm run e2e
npx playwright show-report        # rapport HTML
```

| Variable | Rôle |
|---|---|
| `E2E_URL` | Adresse de la gateway (`http://localhost:8080` par défaut ; `make e2e` lit `GATEWAY_PORT` du `.env`) |
| `DEMO_MOT_DE_PASSE` | Mot de passe des comptes de démo (lu dans `.env` par `make e2e`) |

Les fichiers `e2e/` sont exclus de Vitest (`npm test`) et de l'image Docker du front.

## En CI

Workflow **E2E** (`.github/workflows/e2e.yml`) : à chaque pull request vers `develop` qui touche `frontend/`, `services/` ou `gateway/`, et à la demande. Il construit et démarre la stack, lance les tests et publie le rapport HTML en artefact (`rapport-playwright`). Il est informatif : il ne fait pas partie des vérifications obligatoires du ruleset.

Tant que les pages Tâches et Matériaux sont en données fictives (#50, #52), le scénario complet de #31 (matériau, tâche, stock insuffisant, avancement) n'est pas encore couvert.
