import { cn } from '@/lib/utils';

export type TonBarre = 'accent' | 'vert' | 'rouge' | 'gris' | 'bleu';

const COULEURS: Record<TonBarre, string> = {
  accent: 'bg-accent',
  vert: 'bg-bar-vert',
  rouge: 'bg-bar-rouge',
  gris: 'bg-bar-gris',
  bleu: 'bg-bar-bleu',
};

type Props = {
  /** Pourcentage, ramené entre 0 et 100. */
  valeur: number;
  /** Texte lu par les lecteurs d'écran, par ex. « Avancement de Résidence Al Amal ». */
  libelle: string;
  /** Couleur ; par défaut ambre, vert à 100 %. */
  ton?: TonBarre;
  /** Hauteur : 10 px (cartes) ou 8 px (listes). */
  taille?: 'md' | 'sm';
  className?: string;
};

export function BarreProgression({ valeur, libelle, ton, taille = 'md', className }: Props) {
  const v = Math.min(100, Math.max(0, Math.round(valeur)));
  const couleur = ton ?? (v === 100 ? 'vert' : 'accent');
  return (
    <div
      role="progressbar"
      aria-label={libelle}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={cn(
        'w-full overflow-hidden rounded-[2px] bg-track',
        taille === 'md' ? 'h-2.5' : 'h-2',
        className,
      )}
    >
      <div
        className={cn('h-full transition-[width]', COULEURS[couleur])}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
