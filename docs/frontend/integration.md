# Brancher le front sur les API

Le front est développé en deux temps :

1. **Interface seule** (#26 à #30, OUIJJANE Mohamed) : chaque page est conforme à la [maquette validée](maquette/) et lit des **données fictives**, sans aucun appel réseau.
2. **Intégration** (#49 à #52) : chaque développeur branche les fonctions `api.ts` de son module sur son backend, **via la gateway**, module par module.

Ce guide décrit l'étape 2.

## État du branchement

| Module | Responsable | Issue | Statut | Mode par défaut (`.env.development`, `.env.production`) |
|---|---|---|---|---|
| Chantiers | OUIJJANE Mohamed | #49 | **Branché** | `reel` |
| Tâches & Avancement | OUIJJANE Mohamed | #50 | À brancher (après #99, #11 ; #6 faite) | `fictif` |
| Ouvriers | BENZINEB Ilyas | #51 | À brancher (après #13, #14) | `fictif` |
| Matériaux | SALHI Hatim | #52 | À brancher (après #17, #18, #102) ; `src/api/soap.ts` à écrire | `fictif` |
| Authentification | OUIJJANE Mohamed | #109 | **Branchée** (JWT, voir la section Authentification) | `reel` |

## Choisir le mode d'un module : `VITE_API_*`

Chaque module lit ses données soit en **fictif** (données en mémoire), soit en **réel** (API via la gateway). On branche ainsi un module sans casser les pages des autres.

| Variable | Valeurs | Rôle |
|---|---|---|
| `VITE_API_MODE` | `fictif` (défaut) ou `reel` | Mode des modules qui n'ont pas de variable propre |
| `VITE_API_CHANTIERS`, `VITE_API_TACHES`, `VITE_API_OUVRIERS`, `VITE_API_MATERIAUX` | `fictif` ou `reel` | Mode d'un module ; l'emporte sur `VITE_API_MODE` |
| `VITE_API_AUTH` | `fictif` ou `reel` | Connexion ; `reel` dès qu'un module est en `reel` (la gateway exige un jeton) |

- Les valeurs sont dans `frontend/.env.development` (`npm run dev`) et `frontend/.env.production` (build et image Docker). Ces fichiers ne contiennent aucun secret et sont versionnés.
- Pour un essai ponctuel sans modifier ces fichiers : `frontend/.env.development.local` (ignoré par Git), par exemple `VITE_API_TACHES=reel`.
- Les tests Vitest restent en `fictif` par défaut ; un test du mode réel change la variable avec `vi.stubEnv('VITE_API_<MODULE>', 'reel')`.
- Le mode est lu par `src/api/mode.ts` (`estReel('chantiers')`).

## Guide de branchement (modèle : Chantiers, #49)

Chaque module suit la même organisation que `src/features/chantiers/` :

| Fichier | Rôle |
|---|---|
| `api.fictif.ts` | L'ancien `api.ts` fictif, déplacé tel quel (`git mv src/features/<module>/api.ts src/features/<module>/api.fictif.ts`) |
| `api.reel.ts` | **À écrire** : une fonction par endpoint, avec `creerClientHttp('<Module>')` (REST) ou le client SOAP |
| `api.ts` | **À réécrire** : chaque fonction appelle `api.reel.ts` ou `api.fictif.ts` selon `estReel('<module>')`, avec les **mêmes signatures** |
| `hooks.ts` | Seul changement : passer le `signal` de TanStack Query aux lectures, `queryFn: ({ signal }) => api.lister(filtre, { signal })` |
| `types.ts`, pages, composants | Ne changent pas |
| `api.reel.test.ts` | **À écrire** : tests Vitest avec MSW de chaque fonction (méthode, URL, corps, codes d'erreur) |

Étapes :

1. Comparer les réponses réelles (Swagger, `curl` via `http://localhost:8080`) avec `types.ts`. **Si l'API et le front ne correspondent pas, corriger le backend** (le contrat est dans `types.ts` et ce guide), pas les pages.
2. `git mv` de `api.ts` vers `api.fictif.ts`, puis écrire `api.reel.ts` et le nouvel `api.ts` (voir `src/features/chantiers/`).
3. Écrire `api.reel.test.ts` avec `demarrerServeurMsw()` (`src/test/msw.ts`) et `vi.stubEnv`.
4. Passer le module en `reel` dans `.env.development` et `.env.production`, et mettre à jour le tableau « État du branchement ».
5. `docker compose up --build`, puis le test manuel de la section du module (captures dans la PR).

```ts
// src/features/<module>/api.reel.ts
import { creerClientHttp, type OptionsAppel } from '@/api/http';
const http = creerClientHttp('Ouvriers');

export function listerOuvriers(filtre: FiltreOuvriers = {}, { signal }: OptionsAppel = {}) {
  return http.get<Ouvrier[]>('/api/ouvriers', { params: filtre, signal });
}
export function supprimerOuvrier(id: number) {
  return http.supprimer(`/api/ouvriers/${id}`);
}
```

## Client REST partagé : `src/api/http.ts`

`creerClientHttp(module)` renvoie `get`, `post`, `put`, `patch` et `supprimer`. Le nom du module sert aux messages « Le module … est indisponible ».

| Comportement | Détail |
|---|---|
| Adresse | Chemin relatif (`/api/...`) sur la même origine : la gateway en Docker, le proxy Vite en développement |
| Paramètres | `params: { statut: 'EN_COURS', ouvrierId: undefined }` : les valeurs `undefined`, `null` et `''` sont ignorées |
| Corps | Envoyé en JSON (`Content-Type: application/json`) ; une réponse 204 renvoie `undefined` |
| `X-Request-Id` | Généré à chaque appel ; la gateway le garde, le transmet au service et l'écrit dans ses logs ; repris dans `ApiError.requestId` |
| Jeton | `Authorization: Bearer <jeton>` si une session existe ; un `401` reçu avec un jeton ramène à `/connexion` (« Session expirée ») |
| Délai | 10 s (`DELAI_MS`) ; au-delà : `503` « Le module … ne répond pas » |
| Annulation | `signal` (TanStack Query) : l'appel est interrompu et l'erreur d'annulation est propagée telle quelle, sans devenir une `ApiError` |
| Indisponibilité | Réseau coupé, délai dépassé, `502` ou `504` de la gateway → `503` « Le module … est indisponible » ; un `503` renvoyé par un service garde son message |

## Règles communes

- **Chemins relatifs uniquement** : `/api/chantiers`, `/api/taches`, `/api/ouvriers`, `/ws`. Ne jamais appeler `localhost:8081` ni un nom Docker : en développement, Vite relaie `/api` et `/ws` vers la gateway (`http://localhost:8080`) ; en Docker, la gateway sert le front et les API sur la même origine.
- **Signatures identiques** : une fonction garde ses paramètres et son type de retour, et renvoie une `Promise`. Les lectures acceptent en plus un dernier paramètre facultatif `{ signal }`.
- **Erreurs** : toute réponse en erreur est convertie en `ApiError { status, message, champs?, requestId? }` et levée (`ErreurApi`) par `http.ts`. Réseau coupé, délai dépassé, `502`, `503` et `504` donnent `status: 503`.
- **Clients partagés** : `src/api/http.ts` pour le REST (écrit, à réutiliser tel quel) ; `src/api/soap.ts` pour le SOAP (à écrire dans #52, sur le même modèle).
- **Tests** : chaque `api.reel.ts` est testé avec Vitest et MSW, sans backend.

| Format d'erreur reçu | Conversion en `ApiError` (`versErreurApi`) |
|---|---|
| Chantiers (Spring) : `application/problem+json` `{ status, detail, erreurs? }` | `message = detail`, `champs = erreurs` |
| Ouvriers (FastAPI) : `{ detail: "..." }` ou `{ detail: [{ loc, msg }] }` | chaîne → `message` ; tableau → `champs` (dernier élément de `loc`), `message = "Données invalides"` |
| Tâches (NestJS) : `{ statusCode, message, error }` | chaîne → `message` ; tableau → messages joints, et `champs` quand un message commence par un nom de champ (`titre should not be empty`) |
| Matériaux (SOAP) : `soap:Fault` (`faultcode`, `faultstring`) | `Introuvable` → `404`, `Conflit` → `409`, `Client` → `422`, `Server` → `503`, `message = faultstring` (voir la section Matériaux) |
| Corps vide ou illisible | Message par défaut selon le code (`404` « Ressource introuvable »…) |

## Chantiers · OUIJJANE Mohamed · #49 · Branché

Fichiers : `src/features/chantiers/api.ts` (choix du mode), `api.reel.ts` (API réelle), `api.fictif.ts` (données fictives), `api.reel.test.ts`.

| Fonction | Endpoint réel | Codes | Remarque |
|---|---|---|---|
| `listerChantiers(filtre)` | `GET /api/chantiers?statut=` | 200, 400 (statut inconnu) | |
| `getChantier(id)` | `GET /api/chantiers/{id}` | 200, 404 | |
| `creerChantier(donnees)` | `POST /api/chantiers` | 201, 400 | Toujours créé au statut `PLANIFIE` (#4) ; erreurs par champ en français, celle de RG-01 sur `dateFinPrevue` |
| `modifierChantier(id, donnees)` | `PUT /api/chantiers/{id}` | 200, 400, 404, 409 | 409 : chantier terminé, ou passage à `TERMINE` (utiliser la clôture) |
| `cloturerChantier(id)` | `PATCH /api/chantiers/{id}/cloture` | 200, 404, 409 | |
| `supprimerChantier(id)` | `DELETE /api/chantiers/{id}` | 204, 404 | Le refus 409 d'un chantier qui a des tâches arrive avec #5 |
| `getAvancement(id)` | `GET /api/chantiers/{id}/avancement` | 200, 404 | L'API renvoie une décimale (66.7), arrondie dans `api.reel.ts`. Tâches injoignable : `nombreTaches: 0`, `avancementGlobal: null`, `sourceDisponible: false` |

### Test manuel

1. `docker compose up --build -d --wait`, puis http://localhost:8080 (profil Conducteur de travaux).
2. Créer un chantier : il apparaît dans la liste au statut « Planifié ».
3. Créer un chantier avec une date de fin avant la date de début : **400**, message sous « Date de fin prévue ».
4. Modifier le chantier, passer le statut à « En cours » : la fiche est mise à jour.
5. Clôturer le chantier, puis tenter de le modifier : **409** « Le chantier … est terminé et ne peut plus être modifié. »
6. `docker compose stop taches-service` : la fiche reste affichée, l'avancement est « non disponible ».
7. `docker compose stop chantiers-service` : encart « Module indisponible » (**503**) sur la liste.

## Tâches & Avancement · OUIJJANE Mohamed · #50

Fichier : `src/features/taches/api.ts`. Pages déjà construites avec les données fictives (#28) : liste `/taches`, fiche `/taches/:id`, création `/taches/nouvelle` et `/chantiers/:id/taches/nouvelle`, modification `/taches/:id/modifier`, onglet Tâches de la fiche chantier.

### Fonctions à brancher

| Fonction | Endpoint réel | Codes | Issue backend |
|---|---|---|---|
| `listerTaches(filtre)` | `GET /api/taches?chantierId=&ouvrierId=` | 200 | #6 (`id` entier) |
| `getTache(id)` | `GET /api/taches/{id}` | 200, 404 | #6 |
| `creerTache(donnees)` | `POST /api/taches` | 201, 400, 404, 409, 422, 503 | #6, #10 (conflit de planning → 409) |
| `modifierTache(id, donnees)` | `PUT /api/taches/{id}` (mêmes champs que la création) | 200, 400, 404, 409, 422, 503 | **à créer** |
| `changerStatut(id, statut)` | `PATCH /api/taches/{id}/statut` `{ statut: "EN_COURS" \| "TERMINEE" }` | 200, 404, 409 | **à créer** |
| `majAvancement(id, avancement)` | `PATCH /api/taches/{id}/avancement` `{ avancement }` | 200, 400, 404, 409 | |
| `affecterOuvriers(id, ouvrierIds)` | `PATCH /api/taches/{id}/ouvriers` `{ ouvrierIds }` | 200, 409, 422 | #10 |
| `bloquerTache(id, blocage)` | `PATCH /api/taches/{id}/blocage` `{ bloquee, motif? }` | 200, 400, 404, 409 | **#11** (à créer) |
| `getHistorique(id)` | `GET /api/taches/{id}/historique` → `[{ tacheId, statut, date, motif? }]`, du plus récent au plus ancien | 200, 404 | **à créer** |
| `listerHistorique(limite)` | `GET /api/taches/historique?limite=` → derniers changements de statut, toutes tâches confondues (tableau de bord) | 200 | **à créer** (#99) |
| `supprimerTache(id)` | `DELETE /api/taches/{id}` | 204, 404 | |

Depuis #6, l'API renvoie un `id` entier et des dates `aaaa-mm-jj`, comme `types.ts` : aucune adaptation à faire.

### Endpoints à créer côté Tâches

Les pages (dont le tableau de bord, #26) en ont besoin ; leur comportement est celui des fonctions fictives (à reprendre dans les tests Jest) :

- **`PUT /api/taches/{id}`** : modification ; mêmes vérifications que la création (chantier, ouvriers en excluant la tâche elle-même, stock).
- **`PATCH /api/taches/{id}/statut`** : transitions À faire → En cours et En cours → Terminée (l'avancement passe alors à 100 %, cohérent avec RG5) ; toute autre transition, une tâche bloquée ou un chantier clôturé → **409**.
- **`GET /api/taches/historique?limite=`** : mêmes entrées, toutes tâches confondues, du plus récent au plus ancien ; utilisé par « Dernières activités » du tableau de bord.
- **`GET /api/taches/{id}/historique`** : chaque changement de statut (création, statut, avancement, blocage) est enregistré avec sa date et, pour un blocage, son motif.

### Erreurs attendues par les pages

Le corps d'erreur NestJS `{ statusCode, message, error }` devient un `ApiError` (`message` en chaîne, ou tableau joint ; `champs` si le message cite un champ de validation). La page affiche un bandeau (titre selon le code, message, code HTTP, `X-Request-Id`) et un toast.

| Code | Cas | Message attendu dans `message` |
|---|---|---|
| 400 | Validation (`dateFin` avant `dateDebut`, titre vide…) | Erreur par champ si possible (affichée sous le champ) |
| 404 | Tâche, chantier, ouvrier ou matériau inconnu | « Tâche 12 introuvable » |
| 409 | **Chantier clôturé** (création, modification, statut) | « Le chantier « … » est clôturé : ses tâches ne peuvent plus changer » |
| 409 | **Chantier suspendu** (création, #12) | « Le chantier « … » est suspendu : aucune tâche ne peut y être ajoutée » |
| 409 | **Ouvrier déjà occupé** sur la période (RG-04, #10) | « Rachid Bouzid est déjà affecté à « … » sur cette période » |
| 409 | Transition de statut impossible, tâche bloquée | « Débloquez la tâche avant de changer son statut » |
| 422 | Ouvrier indisponible, **stock insuffisant** (SOAP `VerifierStock`) | « Stock insuffisant pour Ciment CPJ 45 : 400 sacs demandés, 320 sacs en stock » |
| 503 | Chantiers, Ouvriers ou Matériaux injoignable | « Le module Ouvriers est indisponible, réessayez dans un instant. » |

**Mode dégradé :** si Ouvriers ne répond pas, la fiche et la liste restent affichées ; le bandeau « Informations ouvriers indisponibles » remplace les noms (hook `useOuvriersTaches`, `sourceDisponible: false`). Rien à faire côté Tâches pour ce cas.

## Ouvriers · BENZINEB Ilyas · #51

Fichier : `src/features/ouvriers/api.ts`. Pages déjà construites avec les données fictives (#29) : équipe `/ouvriers` (cartes filtrables par spécialité et disponibilité, planning de l'ouvrier choisi), fiche `/ouvriers/:id` (identité, disponibilité, affectations, planning), dialogues création / modification / suppression.

### Fonctions à brancher

| Fonction | Endpoint réel | Codes | Issue backend |
|---|---|---|---|
| `listerOuvriers(filtre)` | `GET /api/ouvriers?specialite=&disponible=` | 200 | #13 |
| `getOuvrier(id)` | `GET /api/ouvriers/{id}` | 200, 404 | |
| `creerOuvrier(donnees)` | `POST /api/ouvriers` | 201, 409, 422 | |
| `modifierOuvrier(id, donnees)` | `PATCH /api/ouvriers/{id}` (dont la bascule `disponible`) | 200, 404, 422 | |
| `supprimerOuvrier(id)` | `DELETE /api/ouvriers/{id}` | 204, 404, 409 | #15 (refus si tâches en cours) |
| `getPlanning(id)` | `GET /api/ouvriers/{id}/planning` | 200 (`sourceDisponible`), 404 | **#14** (`sourceDisponible` en camelCase), #13 (`id` entier des tâches) |

Les **affectations** (affecter l'ouvrier à une tâche, le retirer) passent par le module Tâches : `PATCH /api/taches/{id}/ouvriers` (`useAffecterOuvriers`, `useRetirerOuvrier`), branché dans #50. Rien à faire côté Ouvriers.

### Erreurs attendues par les pages

FastAPI renvoie `{ "detail": "…" }` ou, en validation, `{ "detail": [{ "loc": [...], "msg": "…" }] }`. Conversion en `ApiError` : chaîne → `message` ; tableau → `champs` (clé = dernier élément de `loc`). Les champs du formulaire s'appellent comme les attributs Pydantic (`prenom`, `nom`, `cin`, `specialite`, `telephone`) : un message par champ s'affiche directement sous la saisie.

| Code | Cas | Affichage |
|---|---|---|
| 404 | Ouvrier inconnu | Page « Ouvrier introuvable » |
| 409 | **CIN déjà utilisée** (RG-06) | Sous le champ CIN ; renvoyer de préférence `{ "detail": [{ "loc": ["body", "cin"], "msg": "…" }] }` avec le code 409 pour que le message aille sous le champ, sinon `{ "detail": "…" }` s'affiche en alerte |
| 409 | Suppression d'un ouvrier affecté à des tâches en cours (#15) | Alerte dans le dialogue de suppression |
| 422 | Validation Pydantic : CIN mal formée, téléphone non marocain, champ vide | Sous chaque champ |
| 503 | Ouvriers injoignable (vu depuis la gateway) | Encart « Équipe indisponible » sur la liste |

**Mode dégradé :** si le planning revient avec `sourceDisponible: false` (Tâches injoignable), la page affiche « Planning non disponible » et le reste de la fiche fonctionne. Le front lit `sourceDisponible` en camelCase : #14 doit être mergée avant le branchement.

### Test manuel (à décrire dans la PR de #51)

1. Créer un ouvrier, puis recréer la même CIN : message 409 sous le champ.
2. Saisir une CIN `12AB` ou un téléphone `0412` : messages 422 sous les champs.
3. Rendre un ouvrier indisponible depuis sa fiche : badge « Indisponible » dans la liste et filtre « Disponibles uniquement ».
4. Supprimer un ouvrier affecté à une tâche en cours : refus 409.
5. `docker compose stop taches-service` : planning « non disponible », fiche consultable.

## Matériaux · SALHI Hatim · #52

Fichier : `src/features/materiaux/api.ts`. Page déjà construite avec les données fictives (#30) : `/materiaux` (stock avec jauge et état d'alerte, filtre « en alerte », derniers mouvements, consommation par chantier, dialogues « Nouveau matériau » et « Mouvement de stock »), onglet « Matériaux consommés » de la fiche chantier, pastille du nombre d'alertes dans la barre latérale.

Toutes les opérations sont des `POST /ws` en SOAP 1.1 (`Content-Type: text/xml; charset=utf-8`, namespace `http://btp.uiz.ma/materiaux`). Les préfixes de la réponse (`ns2:`, `SOAP-ENV:`) doivent être ignorés à la lecture.

### Fonctions à brancher

| Fonction | Opération SOAP | Erreurs (après conversion) | Issue backend |
|---|---|---|---|
| `listerMateriaux(enAlerteSeulement)` | `ListerMateriaux` | 503 | #17 (PostgreSQL) |
| `getMateriau(id)` | `GetMateriau` | 404 | |
| `ajouterMateriau(donnees)` | `AjouterMateriau` | 409 référence déjà utilisée, 422 validation XSD | #19 (XSD) |
| `verifierStock(materiauId, quantite)` | `VerifierStock` | 404 | |
| `enregistrerMouvement(donnees)` | `EnregistrerMouvement` | 404 matériau ou chantier inconnu, **409 chantier clôturé**, **422 stock insuffisant**, 503 Chantiers injoignable | |
| `listerMouvements(filtre)` | `ListerMouvements` `{ chantierId?, materiauId? }`, du plus récent au plus ancien | 503 | **#18** (opération à créer) |

La consommation par chantier est calculée côté front à partir de `ListerMouvements` (somme des sorties par chantier et par matériau) : pas d'opération supplémentaire.

### Des SOAP Faults aux `ApiError`

Le service répond toujours en HTTP 200 (succès) ou 500 (SOAP Fault). Le client SOAP (`src/api/soap.ts`, à écrire au branchement) lit l'enveloppe et lève une `ErreurApi` :

1. **Pas de réponse** (réseau coupé, délai de 10 s dépassé) ou **HTTP 502 / 503 / 504** de la gateway (service arrêté) → `status: 503`, comme dans `http.ts`.
2. **Réponse avec `Body/Fault`** → lire `faultcode` et `faultstring` en ignorant les préfixes. `faultstring` peut porter un attribut `xml:lang="fr"` : avec fast-xml-parser, le texte est alors dans `#text`.
3. **Code HTTP de l'`ApiError`** selon le nom local du `faultcode` :

| `faultcode` (nom local) | Cas côté service | `ApiError.status` | Affichage dans la page |
|---|---|---|---|
| `Introuvable` | Matériau ou chantier inconnu | 404 | Alerte « Introuvable » |
| `Conflit` | Référence déjà utilisée ; mouvement vers un chantier clôturé (RG-09) | 409 | Alerte « Conflit » dans le dialogue + toast |
| `Client` | Stock insuffisant (RG-07), validation XSD, quantité ≤ 0 | 422 | Alerte « Demande refusée » dans le dialogue + toast |
| `Server` | Erreur interne, Chantiers injoignable | 503 | Alerte « Module indisponible » ; encart sur la page si la lecture du stock échoue |

4. `message = faultstring` ; `requestId` = en-tête `X-Request-Id` de la gateway. Une SOAP Fault ne désigne pas de champ : pas de `champs`, le message s'affiche en alerte (la validation par champ est faite avant l'envoi par Zod).

Exemple de faute attendue pour un mouvement vers un chantier clôturé :

```xml
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <SOAP-ENV:Fault>
      <faultcode xmlns:m="http://btp.uiz.ma/materiaux">m:Conflit</faultcode>
      <faultstring xml:lang="fr">Le chantier « Entrepôt logistique » est clôturé : aucun mouvement de stock possible</faultstring>
    </SOAP-ENV:Fault>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

Conversion attendue (à tester avec Vitest : réponse normale, faute avec et sans préfixe, `xml:lang`) :

```ts
const CODES: Record<string, number> = { Introuvable: 404, Conflit: 409, Client: 422, Server: 503 };
const nomLocal = (qname: string) => qname.split(':').pop() ?? qname;
// fault = Envelope.Body.Fault lu par fast-xml-parser avec removeNSPrefix: true
const texte = (v: unknown) => (typeof v === 'object' && v ? (v as { '#text': string })['#text'] : String(v));
throw new ErreurApi({
  status: CODES[nomLocal(texte(fault.faultcode))] ?? 503,
  message: texte(fault.faultstring),
  requestId: reponse.headers.get('X-Request-Id') ?? undefined,
});
```

**À faire côté Matériaux** (aujourd'hui, toutes les erreurs métier sont des fautes `Client`, donc 422) : déclarer des codes de faute personnalisés pour distinguer 404 et 409, par exemple
`@SoapFault(faultCode = FaultCode.CUSTOM, customFaultCode = "{http://btp.uiz.ma/materiaux}Conflit")` sur une `ConflitException` (référence déjà utilisée, chantier clôturé) et `…}Introuvable` sur `IntrouvableException`. Le chantier clôturé lève aujourd'hui `IntrouvableException` dans `ChantiersClient` : il doit devenir un `Conflit`. Les autres cas restent en `Client` (422) ou `Server` (503).

### Test manuel (à décrire dans la PR de #52)

1. Sortie de 5 t de « Fer à béton HA12 » (stock 2,4 t) : alerte 422 « Stock insuffisant », stock inchangé.
2. Mouvement vers « Entrepôt logistique » (clôturé) : alerte 409.
3. « Nouveau matériau » avec la référence `MAT-001` : alerte 409.
4. Sortie qui fait passer un matériau sous son seuil : toast d'alerte, badge « En alerte », pastille de la barre latérale mise à jour.
5. `docker compose stop materiaux-service` : encart « Stock indisponible » (503) ; `docker compose stop chantiers-service` puis un mouvement : alerte 503.

## Authentification · #109 · Branchée

La connexion est **réelle** ([ADR-0006](../adr/0006-authentification-jwt-gateway.md)) : Chantiers émet un JWT (HS256, 8 h) et la gateway le vérifie (`auth_request`) avant toute requête vers `/api/*` et `/ws`. Tâches, Ouvriers et Matériaux ne changent pas : ils reçoivent seulement les en-têtes `X-Utilisateur` (e-mail) et `X-Role`, écrits par la gateway.

| Route (via la gateway) | Jeton | Réponse |
|---|---|---|
| `POST /api/auth/login` `{ email, motDePasse }` | non | `200 { token, utilisateur }`, `400`, `401` (même message pour un e-mail inconnu), `429` (`Retry-After`) |
| `GET /api/auth/moi` | oui | `200 Utilisateur`, `401` |
| `GET /api/auth/verifier` | oui | `200` (en-têtes `X-Utilisateur`, `X-Role`) ou `401` ; appelé par la gateway |
| `/api/chantiers`, `/api/taches`, `/api/ouvriers`, `/ws` | oui | `401` (`application/problem+json`) sans jeton valide ; `503` si Chantiers ne peut pas vérifier le jeton |
| `/ws/materiaux.wsdl`, `/health`, le front (`/`) | non | |

| Fichier du front | Rôle |
|---|---|
| `api.ts` | Choisit `api.reel.ts` ou `api.fictif.ts` selon `VITE_API_AUTH` ; réexporte `COMPTES_DEMO` (identités des comptes de démo) |
| `api.reel.ts` | `connecter` : `POST /api/auth/login`, `{ token, utilisateur }` devient `Session { jeton, utilisateur }` ; `deconnecter` : rien côté serveur (le jeton expire) |
| `api.fictif.ts` | Comptes en mémoire et `MOT_DE_PASSE_DEMO`, pour le mode fictif seulement |
| `session.ts` | Session en `sessionStorage` ; `signalerSessionExpiree()` / `surSessionExpiree()` |
| `AuthProvider.tsx`, `contexte.ts` | `useAuth()` : `utilisateur`, `jeton`, `deconnecte`, `sessionExpiree`, `connecter`, `deconnecter` |
| `permissions.ts` | Sections et actions par profil : **affichage seulement**, le refus côté serveur (`403` selon `X-Role`) reste à faire module par module |

**Jeton sur chaque appel.** `src/api/http.ts` lit la session (`lireSession()`) et ajoute `Authorization: Bearer <jeton>`. Le futur `src/api/soap.ts` (#52) doit faire de même, sinon `/ws` répond `401`.

**Session expirée.** Une réponse `401` à une requête qui portait un jeton efface la session et prévient `AuthProvider` : retour à `/connexion` avec le message « Session expirée », puis, après reconnexion, retour à la page demandée. Un `401` sur `/api/auth/login` (mauvais mot de passe) reste une simple erreur du formulaire.

**Mode fictif.** `VITE_API_AUTH=fictif` garde les comptes en mémoire (mot de passe `MOT_DE_PASSE_DEMO`), sans backend. À réserver au cas où **tous** les modules sont en `fictif` : la gateway refuse le jeton fictif (`401`) et la session expirerait aussitôt.

### Comptes de démonstration

Les quatre comptes sont créés dans le schéma `auth` par Flyway. Leur mot de passe commun vient de `DEMO_MOT_DE_PASSE` (`.env`, `chantier2026` dans `.env.example`) : il n'est écrit ni dans le code du backend ni dans celui du front. En mode réel, choisir un profil sur l'écran de connexion remplit l'adresse e-mail ; le mot de passe est à saisir.

| Profil | E-mail | Menu | Actions | Page après connexion |
|---|---|---|---|---|
| Direction | `nadia.belkadi@souss-batiment.demo` | tout | créer, modifier, clôturer un chantier | Tableau de bord |
| Conducteur de travaux | `samir.haddou@souss-batiment.demo` | tout | toutes | Tableau de bord |
| Chef de chantier | `karim.aitali@souss-batiment.demo` | sans Matériaux | tâches (création, statut), ouvriers (fiche, affectations) | Tableau de bord |
| Magasinier | `fatima.idrissi@souss-batiment.demo` | Tableau de bord, Chantiers, Matériaux | stock (nouveau matériau, entrée / sortie) | Matériaux |

Une action non autorisée est **masquée** ; une page hors du profil (lien direct) affiche « Accès refusé ». Chaque route déclare sa section et, pour un formulaire, l'action requise (`handle` dans `src/app/routes.tsx`).

### Test manuel

```bash
# Sans jeton : 401 en JSON
curl -i http://localhost:8080/api/chantiers
# Connexion, puis appel avec le jeton : 200
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"samir.haddou@souss-batiment.demo","motDePasse":"chantier2026"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/chantiers
```

Dans le navigateur : se connecter, puis supprimer la clé `btp-session` dans le `sessionStorage` ou y modifier le jeton, et recharger une page : retour à `/connexion` avec « Session expirée ».

## Tableau de bord (#26)

Le tableau de bord n'a pas d'API propre : il lit les hooks des quatre modules (chantiers, avancements, tâches, historique récent, ouvriers, matériaux, mouvements). Il fonctionnera dès que chaque module sera branché, sans modification. Chaque carte gère la panne de son module (503) : bandeau en haut de page et encadré « non disponible » dans la carte, les autres cartes restant affichées.

Pour la démo avec les données fictives, `?panne=taches` (ou `?panne=taches,ouvriers`) dans l'URL simule l'arrêt de ces modules (`src/api/simulation.ts`, supprimé à l'intégration).

## Tester une intégration

1. `docker compose up -d --build` (backend), puis dans `frontend/` : `npm run dev` (http://localhost:5173). Le module testé doit être en `reel` (`.env.development` ou `.env.development.local`).
2. Parcourir la page du module et chaque cas d'erreur de la maquette : 400 (champ), 404, 409, 422, et 503 (arrêter le module appelé avec `docker compose stop <service>`).
3. Décrire ce test manuel dans la PR, avec les captures.
