import { z } from 'zod';

// Mêmes contraintes que le XSD du service Matériaux (contracts/materiaux.xsd).
const nombre = z.number().or(z.nan());

const positifOuNul = (champ: string) =>
  nombre.superRefine((v, ctx) => {
    if (Number.isNaN(v)) ctx.addIssue({ code: 'custom', message: `${champ} est obligatoire` });
    else if (v < 0) ctx.addIssue({ code: 'custom', message: `${champ} doit être positif ou nul` });
  });

export const schemaMateriau = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}-\d{3}$/, 'Format attendu : MAT-007'),
  nom: z.string().trim().min(1, 'Le nom est obligatoire').max(150, '150 caractères au maximum'),
  unite: z.string().trim().min(1, 'L’unité est obligatoire').max(20, '20 caractères au maximum'),
  stock: positifOuNul('Le stock initial'),
  seuilAlerte: positifOuNul('Le seuil d’alerte'),
});
export type ValeursMateriau = z.input<typeof schemaMateriau>;

export const schemaMouvement = z
  .object({
    type: z.enum(['ENTREE', 'SORTIE']),
    materiauId: nombre,
    chantierId: nombre,
    quantite: nombre,
  })
  .superRefine((m, ctx) => {
    if (Number.isNaN(m.materiauId)) {
      ctx.addIssue({ code: 'custom', path: ['materiauId'], message: 'Choisissez un matériau' });
    }
    if (Number.isNaN(m.chantierId)) {
      ctx.addIssue({ code: 'custom', path: ['chantierId'], message: 'Choisissez un chantier' });
    }
    if (Number.isNaN(m.quantite) || m.quantite <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantite'],
        message: 'Indiquez une quantité positive',
      });
    }
  });
export type ValeursMouvement = z.infer<typeof schemaMouvement>;
