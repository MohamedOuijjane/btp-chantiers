# ADR-0003 : SOAP contract-first pour le module Matériaux

- **Statut :** Accepté
- **Date :** 17/10/2026

## Contexte
Le cours couvre REST et SOAP. La gestion des stocks est une interface « métier stable », typique des systèmes de type ERP où SOAP reste très répandu.

## Décision
Exposer Matériaux en **SOAP avec une approche contract-first** : le schéma XSD (`contracts/materiaux.xsd`) est écrit d'abord, les classes Java sont générées par JAXB et le WSDL est publié automatiquement par Spring-WS.

## Conséquences
- ✅ Le contrat est typé et validé (types, énumérations, cardinalités).
- ✅ Le module Tâches (Node.js) consomme du SOAP : l'interopérabilité REST ↔ SOAP est démontrée.
- ⚠️ Plus verbeux que REST ; les erreurs métier sont remontées sous forme de SOAP Fault.
