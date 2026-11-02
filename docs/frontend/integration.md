# Brancher le front sur les API

Le front est développé en deux temps :

1. **Interface seule** (#26 à #30, OUIJJANE Mohamed) : chaque page est conforme à la [maquette validée](maquette/) et lit des **données fictives**. Elles viennent de `src/features/<module>/api.ts`, sans aucun appel réseau.
2. **Intégration** (#49 à #52) : chaque développeur remplace les fonctions de `api.ts` de son module par de vrais appels à son backend, **via la gateway**.

Ce guide décrit l'étape 2.

## Ce qui change et ce qui ne change pas

| Fichier | À l'intégration |
|---|---|
| `src/features/<module>/api.ts` | **À modifier** : chaque fonction appelle l'API réelle au lieu de lire la base fictive |
| `src/features/<module>/types.ts` | Ne change pas : les types suivent déjà les contrats cibles |
| `src/features/<module>/hooks.ts` | Ne change pas |
| Pages et composants | Ne changent pas |
| `src/api/errors.ts` | Ne change pas : toute erreur doit devenir un `ApiError` |
| `src/api/donnees-fictives.ts`, `src/api/simulation.ts` | Supprimés quand les 4 modules sont branchés |

Chaque fonction de `api.ts` porte en commentaire l'endpoint réel à appeler et les codes de retour attendus.

## Règles communes

- **Chemins relatifs uniquement** : `/api/chantiers`, `/api/taches`, `/api/ouvriers`, `/ws`. Ne jamais appeler `localhost:8081` ni un nom Docker : en développement, Vite relaie `/api` et `/ws` vers la gateway (`http://localhost:8080`) ; en Docker, la gateway sert le front et les API sur la même origine.
- **Signatures identiques** : une fonction garde ses paramètres et son type de retour, et renvoie une `Promise`.
- **Erreurs** : toute réponse en erreur est convertie en `ApiError { status, message, champs?, requestId? }` et levée (`throw new ErreurApi(...)`). Le réseau coupé donne `status: 0`. `requestId` reprend l'en-tête `X-Request-Id` de la gateway.
- **Client du module** : chaque développeur écrit le petit client dont il a besoin. Ce client reste dans `src/api/` pour être partagé : `http.ts` pour le REST, `soap.ts` pour le SOAP. Le premier qui l'écrit le rend réutilisable par les autres.
- **Tests** : la conversion des erreurs du module est testée avec Vitest.

| Format d'erreur reçu | Conversion en `ApiError` |
|---|---|
| Chantiers (Spring) : `application/problem+json` `{ status, detail, erreurs? }` | `message = detail`, `champs = erreurs` |
| Ouvriers (FastAPI) : `{ detail: "..." }` ou `{ detail: [{ loc, msg }] }` | chaîne → `message` ; tableau → `champs` (dernier élément de `loc`) |
| Tâches (NestJS) : `{ statusCode, message, error }` | chaîne → `message` ; tableau → messages joints |
| Matériaux (SOAP) : `soap:Fault` (`faultcode`, `faultstring`) | `Introuvable` → `404`, `Conflit` → `409`, `Client` → `422`, `Server` → `503`, `message = faultstring` (voir la section Matériaux) |

## Chantiers · OUIJJANE Mohamed · #49

Fichier : `src/features/chantiers/api.ts`

| Fonction | Endpoint réel | Codes | Issue backend |
|---|---|---|---|
| `listerChantiers(filtre)` | `GET /api/chantiers?statut=` | 200 | |
| `getChantier(id)` | `GET /api/chantiers/{id}` | 200, 404 | |
| `creerChantier(donnees)` | `POST /api/chantiers` | 201, 400 | #4 (statut PLANIFIE) |
| `modifierChantier(id, donnees)` | `PUT /api/chantiers/{id}` | 200, 400, 404, 409 | |
| `cloturerChantier(id)` | `PATCH /api/chantiers/{id}/cloture` | 200, 404, 409 | |
| `supprimerChantier(id)` | `DELETE /api/chantiers/{id}` | 204, 404, 409 | #5 (refus si des tâches existent) |
| `getAvancement(id)` | `GET /api/chantiers/{id}/avancement` | 200 (`sourceDisponible`), 404 | |

## Tâches & Avancement · IJJAALI Houssam · #50

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

Avant #6, l'API renvoie `_id` (chaîne) : ne pas adapter le front, attendre #6.

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

1. **Pas de réponse** (réseau coupé) → `status: 0`. **HTTP 502 / 503 / 504** de la gateway (service arrêté) → `status: 503`.
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

## Tableau de bord (#26)

Le tableau de bord n'a pas d'API propre : il lit les hooks des quatre modules (chantiers, avancements, tâches, historique récent, ouvriers, matériaux, mouvements). Il fonctionnera dès que chaque module sera branché, sans modification. Chaque carte gère la panne de son module (503) : bandeau en haut de page et encadré « non disponible » dans la carte, les autres cartes restant affichées.

Pour la démo avec les données fictives, `?panne=taches` (ou `?panne=taches,ouvriers`) dans l'URL simule l'arrêt de ces modules (`src/api/simulation.ts`, supprimé à l'intégration).

## Tester une intégration

1. `docker compose up -d --build` (backend), puis dans `frontend/` : `npm run dev` (http://localhost:5173).
2. Parcourir la page du module et chaque cas d'erreur de la maquette : 400 (champ), 404, 409, 422, et 503 (arrêter le module appelé avec `docker compose stop <service>`).
3. Décrire ce test manuel dans la PR, avec les captures.
