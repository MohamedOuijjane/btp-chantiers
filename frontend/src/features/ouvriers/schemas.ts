import { z } from 'zod';

import { ORDRE_SPECIALITES } from './presentation';

// Mêmes contraintes que l'API Ouvriers (schémas Pydantic), pour le confort de saisie.
export const schemaOuvrier = z.object({
  prenom: z
    .string()
    .trim()
    .min(1, 'Le prénom est obligatoire')
    .max(100, '100 caractères au maximum'),
  nom: z.string().trim().min(1, 'Le nom est obligatoire').max(100, '100 caractères au maximum'),
  cin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,2}\d{3,8}$/, 'Format de CIN invalide (ex. JB123456)'),
  specialite: z.enum(ORDRE_SPECIALITES as [string, ...string[]], {
    errorMap: () => ({ message: 'Choisissez une spécialité' }),
  }),
  telephone: z
    .string()
    .transform((t) => t.replace(/\s/g, ''))
    .refine(
      (t) => !t || /^(\+212|0)[5-7]\d{8}$/.test(t),
      'Numéro marocain attendu (ex. 06 12 34 56 78)',
    ),
});

export type ValeursOuvrier = z.input<typeof schemaOuvrier>;
