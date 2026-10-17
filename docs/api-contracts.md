# Contrats d'API

> Ce fichier est la **référence partagée** de l'équipe. Toute modification d'un endpoint consommé par un autre module passe par une pull request relue par le responsable du module consommateur.

La documentation détaillée (schémas, exemples, essais en ligne) est générée automatiquement par chaque service : voir le [README](../README.md#documentation-interactive-des-api).

## Chantiers · REST · `:8081`

| Méthode | Endpoint | Description | Codes |
|---|---|---|---|
| GET | `/api/chantiers?statut=EN_COURS` | Lister (filtre optionnel) | 200 |
| GET | `/api/chantiers/{id}` | Consulter | 200, 404 |
| POST | `/api/chantiers` | Créer | 201, 400 |
| PUT | `/api/chantiers/{id}` | Modifier | 200, 400, 404, 409 |
| PATCH | `/api/chantiers/{id}/cloture` | Clôturer | 200, 409 |
| DELETE | `/api/chantiers/{id}` | Supprimer | 204, 404 |
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

Les erreurs sont renvoyées au format RFC 9457 (`application/problem+json`).

## Tâches & Avancement · REST · `:8082`

| Méthode | Endpoint | Description | Codes |
|---|---|---|---|
| GET | `/api/taches?chantierId=&ouvrierId=` | Lister / filtrer | 200 |
| GET | `/api/taches/{id}` | Consulter | 200, 404 |
| POST | `/api/taches` | Créer (vérifie chantier, ouvriers, stock) | 201, 400, 404, 422, 503 |
| PATCH | `/api/taches/{id}/avancement` | `{ "avancement": 60 }` | 200, 400, 404 |
| PATCH | `/api/taches/{id}/ouvriers` | `{ "ouvrierIds": [1, 2] }` | 200, 422 |
| DELETE | `/api/taches/{id}` | Supprimer | 204, 404 |

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

## Ouvriers · REST · `:8083`

| Méthode | Endpoint | Description | Codes |
|---|---|---|---|
| GET | `/api/ouvriers?specialite=MACON&disponible=true` | Lister / filtrer | 200 |
| GET | `/api/ouvriers/{id}` | Consulter | 200, 404 |
| POST | `/api/ouvriers` | Créer | 201, 409, 422 |
| PATCH | `/api/ouvriers/{id}` | Modification partielle (dont `disponible`) | 200, 404, 422 |
| DELETE | `/api/ouvriers/{id}` | Supprimer | 204, 404 |
| GET | `/api/ouvriers/{id}/planning` | Tâches de l'ouvrier (depuis Tâches) | 200, 404 |

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
