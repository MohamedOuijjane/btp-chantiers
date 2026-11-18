import { z } from 'zod';

// Mêmes contraintes que l'API Tâches (CreerTacheDto), pour le confort de saisie.
// Les champs numériques vides valent NaN : ils sont acceptés ici puis signalés dans superRefine,
// pour que toutes les erreurs s'affichent en même temps.
const nombre = z.number().or(z.nan());

export const schemaTache = z
  .object({
    chantierId: nombre,
    titre: z
      .string()
      .trim()
      .min(1, 'Le titre est obligatoire')
      .max(150, '150 caractères au maximum'),
    description: z.string().max(1000, '1000 caractères au maximum').optional(),
    dateDebut: z.string().min(1, 'La date de début est obligatoire'),
    dateFin: z.string().min(1, 'La date de fin est obligatoire'),
    ouvrierIds: z.array(z.number()),
    besoins: z.array(z.object({ materiauId: nombre, quantite: nombre })),
  })
  .superRefine((t, ctx) => {
    if (Number.isNaN(t.chantierId)) {
      ctx.addIssue({ code: 'custom', path: ['chantierId'], message: 'Choisissez un chantier' });
    }
    if (t.dateDebut && t.dateFin && t.dateFin < t.dateDebut) {
      ctx.addIssue({
        code: 'custom',
        path: ['dateFin'],
        message: 'La date de fin doit être postérieure ou égale à la date de début',
      });
    }
    t.besoins.forEach((b, i) => {
      if (Number.isNaN(b.materiauId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['besoins', i, 'materiauId'],
          message: 'Choisissez un matériau',
        });
      }
      if (Number.isNaN(b.quantite) || b.quantite <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['besoins', i, 'quantite'],
          message: 'Indiquez une quantité positive',
        });
      }
    });
  });

export type ValeursTache = z.infer<typeof schemaTache>;
