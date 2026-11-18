import { z } from 'zod';

// Confort de saisie seulement : c'est le service d'authentification qui décide (401).
export const schemaConnexion = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'L’adresse e-mail est obligatoire')
    .email('Adresse e-mail invalide (ex. prenom.nom@souss-batiment.demo)'),
  motDePasse: z.string().min(1, 'Le mot de passe est obligatoire'),
});
export type ValeursConnexion = z.infer<typeof schemaConnexion>;
