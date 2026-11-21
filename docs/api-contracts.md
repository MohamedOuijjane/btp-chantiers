# Contrats d'API

> Ce fichier est la **référence partagée** de l'équipe. Toute modification d'un endpoint consommé par un autre module passe par une pull request relue par le responsable du module consommateur.

La documentation détaillée (schémas, exemples, essais en ligne) est générée automatiquement par chaque service : voir le [README](../README.md#documentation-interactive-des-api).

## Authentification · REST · Chantiers `:8081`

Via la gateway (`:8080`), **toutes les routes `/api/*` et `/ws` exigent un jeton** (`Authorization: Bearer <jeton>`), sauf `POST /api/auth/login`, le WSDL et `/health` ([ADR-0006](adr/0006-authentification-jwt-gateway.md)). Sans jeton valide : `401` (`application/problem+json`) ; si Chantiers ne peut pas vérifier le jeton : `503`. Les services reçoivent `X-Utilisateur` (e-mail) et `X-Role`, écrits par la gateway. Les appels entre services (réseau Docker interne) ne passent pas par la gateway et restent sans jeton.

| Méthode | Endpoint | Description | Codes |
|---|---|---|---|
| POST | `/api/auth/login` | Connexion : JWT HS256 valable 8 h | 200, 400, 401, 429 |
| GET | `/api/auth/moi` | Utilisateur du jeton | 200, 401 |
| GET | `/api/auth/verifier` | Vérification par la gateway : en-têtes `X-Utilisateur`, `X-Utilisateur-Id`, `X-Role` | 200, 401 |

```json
POST /api/auth/login
{ "email": "samir.haddou@souss-batiment.demo", "motDePasse": "…" }

200 OK
{ "token": "eyJhbGciOiJIUzI1NiJ9…",
  "utilisateur": { "id": 2, "email": "samir.haddou@souss-batiment.demo", "nom": "Samir Haddou",
                   "initiales": "SH", "role": "CONDUCTEUR" } }
```

- Rôles : `DIRECTION`, `CONDUCTEUR`, `CHEF_CHANTIER`, `MAGASINIER`. Claims du jeton : `sub` (e-mail), `uid`, `nom`, `initiales`, `role`, `iss` = `btp-chantiers`.
- `401` : même message (« Adresse e-mail ou mot de passe incorrect. ») pour un e-mail inconnu et un mauvais mot de passe.
- `429` : après 5 échecs pour un même e-mail, ou 20 pour une même adresse IP, en 15 minutes ; en-tête `Retry-After` (secondes).

## Chantiers · REST · `:8081`

| Méthode | Endpoint | Description | Codes |
|---|---|---|---|
| GET | `/api/chantiers?statut=EN_COURS` | Lister (filtre optionnel) | 200 |
| GET | `/api/chantiers/{id}` | Consulter | 200, 404 |
| POST | `/api/chantiers` | Créer | 201, 400 |
| PUT | `/api/chantiers/{id}` | Modifier | 200, 400, 404, 409 |
| PATCH | `/api/chantiers/{id}/cloture` | Clôturer | 200, 409 |
| DELETE | `/api/chantiers/{id}` | Supprimer (refusé s'il a des tâches) | 204, 404, 409, 503 |
| GET | `/api/chantiers/{id}/avancement` | Avancement agrégé depuis Tâches | 200, 404 |

```json
POST /api/chantiers
{
  "nom": "Résidence Al Amal",
  "adresse": "Hay Mohammadi, Agadir",
  "client": "Société Souss Immo",
  "dateDebut": "2026-11-01",
  "dateFinPrevue": "2027-06-30",
  "budget": 2500000
}
```

Suppression (#5) : Chantiers interroge `GET /api/taches?chantierId={id}`. **Toute tâche du chantier, terminée comprise**, bloque la suppression → `409`, avec les tâches citées (5 au plus, les suivantes sont comptées). Aucune tâche, ou `404` de Tâches → `204`. Tâches sans réponse, en erreur ou illisible → `503` et rien n'est supprimé.

```json
409 Conflict
{ "status": 409, "detail": "Suppression impossible : le chantier « Résidence Al Amal » a 2 tâche(s) : « Fondations », « Gros œuvre ». Supprimez ses tâches dans le module Tâches avant de supprimer le chantier." }

503 Service Unavailable
{ "status": 503, "detail": "Le module Tâches ne répond pas : impossible de vérifier les tâches du chantier, suppression annulée. Réessayez plus tard." }
```

Toutes les erreurs sont renvoyées au format RFC 9457 (`application/problem+json`), avec un message en français dans `detail`. Les erreurs de validation (400) portent en plus `erreurs`, un message par champ (RG-01 sur `dateFinPrevue`). Un paramètre invalide (`?statut=INCONNU`, `/api/chantiers/abc`) ou un JSON mal formé donnent aussi un 400 au même format.

```json
400 Bad Request
{ "status": 400, "detail": "Données invalides",
  "erreurs": { "dateFinPrevue": "La date de fin prévue doit être postérieure ou égale à la date de début" } }
```

`GET /api/chantiers/{id}/avancement` renvoie toujours les 4 champs. Si Tâches est injoignable : `{ "chantierId": 1, "nombreTaches": 0, "avancementGlobal": null, "sourceDisponible": false }`.

## Tâches & Avancement · REST · `:8082`

| Méthode | Endpoint | Description | Codes |
|---|---|---|---|
| GET | `/api/taches?chantierId=&ouvrierId=` | Lister / filtrer | 200 |
| GET | `/api/taches/{id}` | Consulter | 200, 400, 404 |
| POST | `/api/taches` | Créer (vérifie chantier, ouvriers, stock) | 201, 400, 404, 409, 422, 503 |
| PATCH | `/api/taches/{id}/avancement` | `{ "avancement": 60 }` | 200, 400, 404 |
| PATCH | `/api/taches/{id}/ouvriers` | Remplacer les ouvriers affectés (vérifie disponibilité et planning) | 200, 400, 404, 409, 422 |
| DELETE | `/api/taches/{id}` | Supprimer | 204, 400, 404 |
| PUT | `/api/taches/{id}` | Modifier (mêmes champs et mêmes vérifications que la création) | 200, 400, 404, 409, 422, 503 |
| PATCH | `/api/taches/{id}/statut` | `{ "statut": "EN_COURS" }` ou `"TERMINEE"` | 200, 400, 404, 409 |
| GET | `/api/taches/{id}/historique` | Historique des statuts, du plus récent au plus ancien | 200, 400, 404 |
| PATCH | `/api/taches/{id}/blocage` | `{ "bloquee": true, "motif": "..." }` : bloquer ou débloquer | 200, 400, 404, 409 |
- **Statut (#99)** : seules les transitions `A_FAIRE → EN_COURS` et `EN_COURS → TERMINEE` sont permises ; `TERMINEE` force l'avancement à 100 %. Une tâche bloquée, une autre transition ou un chantier clôturé → `409`. Chaque changement de statut est enregistré (table `historique_statut`).

- **Conflit de planning (#10)** : un ouvrier ne peut pas être affecté à deux tâches dont les périodes se chevauchent (bornes incluses : partager un jour est un conflit, le lendemain non). Les tâches `TERMINEE` sont ignorées, les tâches `BLOQUEE` comptent. Conflit → `409` « L'ouvrier 3 est déjà affecté à « Dalle » (2026-11-05 → 2026-11-08) sur cette période ». Vérifié à la création (`POST`), à la modification (`PUT`) et à l'affectation (`PATCH /ouvriers`).

- **Blocage (#11)** : `motif` obligatoire quand `bloquee` vaut `true` (`400` sinon). Une tâche `TERMINEE` ne peut pas être bloquée, une tâche déjà bloquée non plus, et débloquer une tâche non bloquée est refusé (`409`, de même qu'un chantier clôturé). Au déblocage, le statut est recalculé à partir de l'avancement (RG-05 : 0 → `A_FAIRE`, 1–99 → `EN_COURS`). Chaque blocage et déblocage est enregistré dans l'historique des statuts (le motif est conservé au blocage).

```json
POST /api/taches
{
  "chantierId": 1,
  "titre": "Coulage des fondations",
  "dateDebut": "2026-11-02",
  "dateFin": "2026-11-10",
  "ouvrierIds": [1],
  "besoinsMateriaux": [{ "materiauId": 1, "quantite": 40 }]
}
```

```json
201 Created
{
  "id": 12,
  "chantierId": 1,
  "titre": "Coulage des fondations",
  "dateDebut": "2026-11-02",
  "dateFin": "2026-11-10",
  "statut": "A_FAIRE",
  "avancement": 0,
  "motif": null,
  "ouvrierIds": [1],
  "besoinsMateriaux": [{ "materiauId": 1, "quantite": 40 }]
}
```

- **Identifiant entier `id`** (plus de `_id` MongoDB depuis #6) ; dates au format `aaaa-mm-jj` ; `description` absente quand elle est vide.
- Données dans le schéma `taches` de `btp_db` : tables `tache` et `besoin_materiau` (classe d'association), créées par les migrations TypeORM.
- Un même `materiauId` ne peut apparaître qu'une fois dans `besoinsMateriaux` (`400`).

- **Motif de blocage** : chaque tâche renvoyée par l'API (`GET /api/taches`, `GET /api/taches/{id}` et les routes d'écriture) contient `motif` : le motif du blocage en cours si `statut = BLOQUEE`, sinon `null`. Il est lu dans l'historique des statuts (`historique_statut`) ; aucune colonne n'est ajoutée. Ajout compatible : les clients existants ignorent le champ.

Codes de refus à la création (RG-03, RG-04, RG-07) : chantier inconnu → `404` ; chantier `SUSPENDU` ou `TERMINE` → `409` (seuls `PLANIFIE` et `EN_COURS` acceptent une tâche) ; ouvrier indisponible ou stock insuffisant → `422` ; Chantiers, Ouvriers ou Matériaux injoignable → `503`.

## Ouvriers · REST · `:8083`

| Méthode | Endpoint | Description | Codes |
|---|---|---|---|
| GET | `/api/ouvriers?specialite=MACON&disponible=true` | Lister / filtrer | 200 |
| GET | `/api/ouvriers/{id}` | Consulter | 200, 404 |
| POST | `/api/ouvriers` | Créer | 201, 409, 422 |
| PATCH | `/api/ouvriers/{id}` | Modification partielle (dont `disponible`) | 200, 404, 422 |
| DELETE | `/api/ouvriers/{id}` | Supprimer (vérifie ses tâches dans Tâches) | 204, 404, 409, 503 |
| GET | `/api/ouvriers/{id}/planning` | Tâches de l'ouvrier (depuis Tâches) | 200, 404 |

CIN déjà utilisée (RG-06) : `409`, avec l'erreur rattachée au champ `cin` (même format que les `422`, affichée sous le champ par le front) :

```json
{ "detail": [ { "loc": ["body", "cin"], "msg": "La CIN JB123456 est déjà utilisée par un autre ouvrier", "type": "cin_deja_utilisee" } ] }
```

Suppression : Ouvriers interroge `GET /api/taches?ouvrierId={id}`. Au moins une tâche non `TERMINEE` (`A_FAIRE`, `EN_COURS`, `BLOQUEE`) → `409` avec un message qui cite les tâches. Aucune tâche, ou `404` de Tâches → `204`. Tâches sans réponse ou en erreur → `503` et l'ouvrier n'est pas supprimé.

Planning : `{ "ouvrier": {...}, "taches": [...], "sourceDisponible": true }`. Si Tâches est injoignable, réponse `200` dégradée avec `"taches": []` et `"sourceDisponible": false` (même champ que l'avancement de Chantiers, ADR-0004).

Spécialités : `MACON`, `FERRAILLEUR`, `COFFREUR`, `ELECTRICIEN`, `PLOMBIER`, `PEINTRE`, `CONDUCTEUR_ENGINS`, `MANOEUVRE`.

## Matériaux · SOAP · `:8084/ws`

- **WSDL :** `http://localhost:8084/ws/materiaux.wsdl`
- **Namespace :** `http://btp.uiz.ma/materiaux`
- **Contrat :** [`contracts/materiaux.xsd`](../contracts/materiaux.xsd)

| Opération | Entrée | Sortie |
|---|---|---|
| `AjouterMateriau` | `materiau` | `materiau` (avec `id`) |
| `GetMateriau` | `id` | `materiau` |
| `ListerMateriaux` | `enAlerteSeulement?` | `materiau*` |
| `VerifierStock` | `materiauId`, `quantite` | `disponible`, `stockActuel` |
| `EnregistrerMouvement` | `materiauId`, `chantierId`, `type` (ENTREE/SORTIE), `quantite` | `mouvementId`, `stockApres`, `enAlerte` |
| `ListerMouvements` (#18) | `chantierId?`, `materiauId?` (filtres optionnels, combinables) | `mouvement*` : `id`, `date` (xs:dateTime, UTC), `materiauId`, `chantierId`, `type`, `quantite`, du plus récent au plus ancien |

`ListerMouvements` répond à « quel chantier a consommé quoi » : sans filtre, tous les mouvements ; un chantier ou un matériau sans mouvement donne une liste vide (pas de faute).

Les erreurs sont renvoyées sous forme de SOAP 1.1 Fault. Ces codes sont des codes SOAP, pas des codes HTTP. Le client doit se baser sur `faultcode`, pas analyser le texte de `faultstring` :

| `faultcode` | Situations |
|---|---|
| `Client` | Stock ou seuil non fini/négatif, quantité non finie/non positive, matériau introuvable, chantier introuvable (HTTP 404 de Chantiers), chantier terminé, stock insuffisant ou conflit de mise à jour concurrente. Pour un conflit, relire le stock avant de décider de réessayer le mouvement. |
| `Server` | Chantiers renvoie une réponse vide/invalide, un statut HTTP autre que 404, ou l'appel échoue (timeout, erreur réseau). Réessayer seulement après avoir vérifié que la dépendance est disponible et que l'erreur est transitoire. |

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:m="http://btp.uiz.ma/materiaux">
  <soapenv:Body>
    <m:VerifierStockRequest>
      <m:materiauId>1</m:materiauId>
      <m:quantite>40</m:quantite>
    </m:VerifierStockRequest>
  </soapenv:Body>
</soapenv:Envelope>
```
