import { Ban, Gauge, Unlock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import type { ApiError } from '@/api/errors';
import { AlerteErreur } from '@/components/common/AlerteErreur';
import { Champ } from '@/components/common/Champ';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { notifierErreur } from '@/lib/erreurs';

import { useBloquerTache, useMajAvancement } from '../hooks';
import type { Tache } from '../types';

type Props = { tache: Tache; lectureSeule?: boolean };

/**
 * Fiche tâche : bloquer avec un motif, débloquer (PATCH /blocage, #11) et mettre à jour
 * l'avancement (PATCH /avancement). L'avancement d'une tâche bloquée ou terminée est désactivé
 * (l'API devrait le refuser, #143).
 */
export function ActionsTache({ tache: t, lectureSeule = false }: Props) {
  const [dialogue, setDialogue] = useState<'bloquer' | 'avancement' | null>(null);
  const bloquer = useBloquerTache();
  const bloquee = t.statut === 'BLOQUEE';
  const terminee = t.statut === 'TERMINEE';

  const debloquer = () =>
    bloquer.mutate(
      { id: t.id, blocage: { bloquee: false } },
      {
        onSuccess: () => toast.success(`« ${t.titre} » est débloquée.`),
        onError: notifierErreur,
      },
    );

  return (
    <>
      <Button
        variant="outline"
        className="bg-surface"
        disabled={lectureSeule || bloquee || terminee}
        onClick={() => setDialogue('avancement')}
      >
        <Gauge size={16} aria-hidden="true" />
        Avancement
      </Button>
      {bloquee ? (
        <Button
          variant="outline"
          className="bg-surface"
          disabled={lectureSeule || bloquer.isPending}
          onClick={debloquer}
        >
          <Unlock size={16} aria-hidden="true" />
          Débloquer
        </Button>
      ) : (
        <Button
          variant="outline"
          className="bg-surface"
          disabled={lectureSeule || terminee}
          onClick={() => setDialogue('bloquer')}
        >
          <Ban size={16} aria-hidden="true" />
          Bloquer
        </Button>
      )}
      <BloquerDialog
        open={dialogue === 'bloquer'}
        onOpenChange={(o) => setDialogue(o ? 'bloquer' : null)}
        tache={t}
      />
      <AvancementDialog
        open={dialogue === 'avancement'}
        onOpenChange={(o) => setDialogue(o ? 'avancement' : null)}
        tache={t}
      />
    </>
  );
}

type PropsDialogue = { open: boolean; onOpenChange: (open: boolean) => void; tache: Tache };

function BloquerDialog({ open, onOpenChange, tache: t }: PropsDialogue) {
  const bloquer = useBloquerTache();
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const [champ, setChamp] = useState<string>();

  const changer = (o: boolean) => {
    if (o) {
      setMotif('');
      setErreur(null);
      setChamp(undefined);
    }
    onOpenChange(o);
  };

  const envoyer = (e: FormEvent) => {
    e.preventDefault();
    if (!motif.trim()) {
      setChamp('Le motif est obligatoire');
      return;
    }
    setChamp(undefined);
    bloquer.mutate(
      { id: t.id, blocage: { bloquee: true, motif: motif.trim() } },
      {
        onSuccess: () => {
          toast.success(`« ${t.titre} » est bloquée.`);
          onOpenChange(false);
        },
        onError: (err) => {
          setErreur(err);
          notifierErreur(err);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={changer}>
      <DialogContent className="max-w-[480px]">
        <DialogTitle>Bloquer la tâche</DialogTitle>
        <DialogDescription>
          « {t.titre} » passera au statut Bloquée jusqu’à son déblocage. Le motif est inscrit dans
          l’historique.
        </DialogDescription>
        {erreur && <AlerteErreur erreur={erreur} />}
        <form onSubmit={envoyer} className="flex flex-col gap-4" noValidate>
          <Champ
            libelle="Motif du blocage"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            erreur={champ}
            maxLength={500}
            autoFocus
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={bloquer.isPending} className="font-bold">
              Bloquer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AvancementDialog({ open, onOpenChange, tache: t }: PropsDialogue) {
  const majAvancement = useMajAvancement();
  const [valeur, setValeur] = useState(String(t.avancement));
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const [champ, setChamp] = useState<string>();

  const changer = (o: boolean) => {
    if (o) {
      setValeur(String(t.avancement));
      setErreur(null);
      setChamp(undefined);
    }
    onOpenChange(o);
  };

  const envoyer = (e: FormEvent) => {
    e.preventDefault();
    const avancement = Number(valeur);
    if (
      valeur.trim() === '' ||
      !Number.isInteger(avancement) ||
      avancement < 0 ||
      avancement > 100
    ) {
      setChamp('Un nombre entier entre 0 et 100');
      return;
    }
    setChamp(undefined);
    majAvancement.mutate(
      { id: t.id, avancement },
      {
        onSuccess: (maj) => {
          toast.success(`Avancement de « ${maj.titre} » : ${maj.avancement} %.`);
          onOpenChange(false);
        },
        onError: (err) => {
          setErreur(err);
          notifierErreur(err);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={changer}>
      <DialogContent className="max-w-[480px]">
        <DialogTitle>Mettre à jour l’avancement</DialogTitle>
        <DialogDescription>
          Le statut suit l’avancement : 0 % À faire, de 1 à 99 % En cours, 100 % Terminée.
        </DialogDescription>
        {erreur && <AlerteErreur erreur={erreur} />}
        <form onSubmit={envoyer} className="flex flex-col gap-4" noValidate>
          <Champ
            libelle="Avancement (%)"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            erreur={champ}
            autoFocus
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={majAvancement.isPending} className="font-bold">
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
