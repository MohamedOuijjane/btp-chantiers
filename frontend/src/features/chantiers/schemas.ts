import { z } from 'zod';

// Mêmes contraintes que l'API Chantiers (ChantierDto.Requete), pour le confort de saisie.
const requis = (champ: string) => z.string().trim().min(1, `${champ} est obligatoire`);

export const schemaChantier = z
  .object({
    nom: requis('Le nom').max(150, '150 caractères au maximum'),
    client: requis('Le client').max(150, '150 caractères au maximum'),
    adresse: requis('L’adresse'),
    // Un champ numérique vide vaut NaN : il est accepté ici puis signalé plus bas, pour que
    // toutes les erreurs (dont celle des dates) s'affichent en même temps.
    budget: z.number().or(z.nan()),
    dateDebut: z.string().min(1, 'La date de début est obligatoire'),
    dateFinPrevue: z.string().min(1, 'La date de fin prévue est obligatoire'),
  })
  .superRefine((c, ctx) => {
    if (Number.isNaN(c.budget)) {
      ctx.addIssue({ code: 'custom', path: ['budget'], message: 'Indiquez un budget en MAD' });
    } else if (c.budget < 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['budget'],
        message: 'Le budget doit être positif ou nul',
      });
    }
    if (c.dateDebut && c.dateFinPrevue && c.dateFinPrevue < c.dateDebut) {
      ctx.addIssue({
        code: 'custom',
        path: ['dateFinPrevue'],
        message: 'La date de fin doit être postérieure ou égale à la date de début',
      });
    }
  });

export type ValeursChantier = z.infer<typeof schemaChantier>;
