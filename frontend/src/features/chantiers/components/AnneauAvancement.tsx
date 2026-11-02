import type { TonBarre } from '@/components/common/BarreProgression';

const COULEURS: Record<TonBarre, string> = {
  accent: 'var(--accent)',
  vert: 'var(--bar-vert)',
  rouge: 'var(--bar-rouge)',
  gris: 'var(--bar-gris)',
  bleu: 'var(--bar-bleu)',
};

type Props = {
  /** Pourcentage, ou null si l'avancement n'est pas disponible (mode dégradé). */
  valeur: number | null;
  ton: TonBarre;
};

/** Anneau « Avancement global » de la fiche chantier. */
export function AnneauAvancement({ valeur, ton }: Props) {
  const disponible = valeur !== null;
  const v = disponible ? Math.min(100, Math.max(0, valeur)) : 0;
  return (
    <div className="flex flex-[1_1_200px] flex-col items-center justify-center gap-2.5">
      <div
        role="img"
        aria-label={disponible ? `Avancement global : ${v} %` : 'Avancement global non disponible'}
        className="flex h-[148px] w-[148px] items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${COULEURS[ton]} ${v * 3.6}deg, var(--track) 0deg)` }}
      >
        <div className="flex h-[116px] w-[116px] items-center justify-center rounded-full bg-surface">
          <span className="font-display text-[40px] font-bold">{disponible ? `${v} %` : '—'}</span>
        </div>
      </div>
      <span className="text-center text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
        {disponible ? 'Avancement global' : 'Non disponible'}
      </span>
    </div>
  );
}
