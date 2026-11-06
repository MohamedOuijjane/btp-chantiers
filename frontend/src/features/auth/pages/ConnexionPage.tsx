import { zodResolver } from '@hookform/resolvers/zod';
import { HardHat, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { versApiError, type ApiError } from '@/api/errors';
import { estReel } from '@/api/mode';
import { useTheme } from '@/app/useTheme';
import { AlerteErreur } from '@/components/common/AlerteErreur';
import { Champ } from '@/components/common/Champ';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { COMPTES_DEMO, MOT_DE_PASSE_DEMO } from '../api';
import type { EtatConnexion } from '../components/RouteProtegee';
import { useAuth } from '../contexte';
import { PROFILS, ROLES } from '../permissions';
import { schemaConnexion, type ValeursConnexion } from '../schemas';
import type { Role } from '../types';

const ATOUTS = ['4 modules', 'REST et SOAP', 'Données en temps réel'];

/** Écran 1 de la maquette : connexion, avec choix rapide d'un profil de démonstration. */
export function ConnexionPage() {
  const { utilisateur, deconnecte, sessionExpiree, connecter } = useAuth();
  const depuis = (useLocation().state as EtatConnexion | null)?.depuis;
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const { theme, basculer } = useTheme();
  const sombre = theme === 'sombre';

  const { register, handleSubmit, setValue, watch, clearErrors, formState } =
    useForm<ValeursConnexion>({
      resolver: zodResolver(schemaConnexion),
      defaultValues: { email: '', motDePasse: '' },
    });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    document.title = 'Connexion · BTP Chantiers';
  }, []);

  // Le profil sélectionné suit l'adresse saisie : c'est le compte qui détermine le rôle.
  const email = watch('email').trim().toLowerCase();
  const profilChoisi = ROLES.find((r) => COMPTES_DEMO[r].email === email);

  // Mode réel : le mot de passe des comptes de démo est défini côté serveur (DEMO_MOT_DE_PASSE),
  // il n'est jamais dans le code du front ; seul l'e-mail est rempli.
  const motDePasseConnu = !estReel('auth');

  const choisirProfil = (role: Role) => {
    setValue('email', COMPTES_DEMO[role].email);
    setValue('motDePasse', motDePasseConnu ? MOT_DE_PASSE_DEMO : '');
    clearErrors();
    setErreur(null);
  };

  const envoyer = handleSubmit(async (v) => {
    setErreur(null);
    try {
      await connecter(v); // la redirection ci-dessous prend le relais
    } catch (e) {
      setErreur(versApiError(e));
    }
  });

  // Connecté (ou déjà connecté) : retour à la page demandée, sinon accueil du profil.
  if (utilisateur) {
    const cible = depuis
      ? `${depuis.pathname}${depuis.search}${depuis.hash}`
      : PROFILS[utilisateur.role].accueil;
    return <Navigate to={cible} replace />;
  }

  return (
    <div className="flex min-h-screen flex-wrap">
      {/* Panneau de présentation : toujours sombre, comme la barre latérale. */}
      <section
        aria-label="BTP Chantiers"
        className="flex min-h-[260px] flex-[1_1_420px] flex-col bg-side text-side-ink"
      >
        <div className="bande-danger h-3.5" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-8 px-6 py-10 sm:px-14 sm:py-14">
          <div className="flex items-center gap-4">
            <span className="flex h-[50px] w-[50px] items-center justify-center rounded-btn bg-[#F59E0B] text-[#1C1917]">
              <HardHat size={28} aria-hidden="true" />
            </span>
            <span className="flex flex-col">
              <span className="font-display text-[26px] font-bold uppercase leading-none tracking-[0.04em]">
                BTP Chantiers
              </span>
              <span className="text-side-muted">Souss Bâtiment</span>
            </span>
          </div>

          <div className="mt-auto flex flex-col gap-5">
            <p className="titre m-0 max-w-[560px] text-[40px] leading-[1.02] sm:text-[52px]">
              Pilotez vos chantiers, vos équipes et vos stocks.
            </p>
            <p className="m-0 max-w-[460px] text-lg text-side-muted">
              Suivez l’avancement, affectez les ouvriers sans conflit de planning et anticipez les
              ruptures de matériaux.
            </p>
            <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
              {ATOUTS.map((a) => (
                <li key={a} className="rounded-btn border border-side-line px-3 py-1.5 text-sm">
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <p className="m-0 text-[13px] text-side-muted">
            Souss Bâtiment est une société fictive utilisée pour la démonstration.
          </p>
        </div>
        <div className="bande-danger h-3.5" aria-hidden="true" />
      </section>

      <main className="flex flex-[1_1_420px] items-center justify-center bg-bg px-4 py-12 sm:px-8">
        <div className="flex w-full max-w-[445px] flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="titre m-0 text-[40px] leading-none">Connexion</h1>
            <p className="m-0 text-muted">Accédez à l’espace de pilotage de votre entreprise.</p>
          </div>

          {deconnecte && !erreur && (
            <p role="status" className="m-0 rounded-btn bg-surface-2 px-4 py-3 text-muted">
              Vous êtes déconnecté.
            </p>
          )}
          {sessionExpiree && !erreur && (
            <p role="status" className="m-0 rounded-btn bg-surface-2 px-4 py-3 text-muted">
              <strong className="text-ink">Session expirée.</strong> Reconnectez-vous pour
              continuer.
            </p>
          )}

          <form
            noValidate
            onSubmit={envoyer}
            className="flex flex-col gap-5"
            aria-busy={isSubmitting}
          >
            <Champ
              libelle="Adresse e-mail"
              type="email"
              autoComplete="username"
              placeholder="prenom.nom@souss-batiment.demo"
              erreur={errors.email?.message}
              {...register('email')}
            />
            <Champ
              libelle="Mot de passe"
              type="password"
              autoComplete="current-password"
              erreur={errors.motDePasse?.message}
              {...register('motDePasse')}
            />

            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-2 text-sm font-semibold">Profil</legend>
              <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
                {ROLES.map((role) => {
                  const profil = PROFILS[role];
                  const actif = profilChoisi === role;
                  return (
                    <label
                      key={role}
                      className={cn(
                        'flex cursor-pointer flex-col gap-0.5 rounded-btn border-2 px-4 py-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                        actif
                          ? 'border-accent bg-[var(--badge-ambre-bg)]'
                          : 'border-line bg-surface hover:bg-surface-2',
                      )}
                    >
                      <input
                        type="radio"
                        name="profil"
                        value={role}
                        checked={actif}
                        onChange={() => choisirProfil(role)}
                        className="sr-only"
                      />
                      <span className="font-bold">{profil.libelle}</span>
                      <span
                        className={cn(
                          'text-sm',
                          actif ? 'text-[var(--badge-ambre-fg)]' : 'text-muted',
                        )}
                      >
                        {profil.description}
                      </span>
                    </label>
                  );
                })}
              </div>
              <span className="text-[13px] text-muted">
                {motDePasseConnu
                  ? 'Comptes de démonstration : choisir un profil remplit ses identifiants.'
                  : 'Comptes de démonstration : choisir un profil remplit son adresse ; le mot de passe est celui de DEMO_MOT_DE_PASSE (README).'}
              </span>
            </fieldset>

            {erreur && <AlerteErreur erreur={erreur} />}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[52px] font-display text-lg font-bold uppercase tracking-[0.06em]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} aria-hidden="true" className="animate-spin" />
                  Connexion…
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="link"
              className="px-0 underline"
              onClick={() =>
                toast.info('Mot de passe oublié', {
                  description:
                    'Contactez l’administrateur de Souss Bâtiment pour le réinitialiser.',
                })
              }
            >
              Mot de passe oublié ?
            </Button>
            <Button type="button" variant="outline" className="bg-surface-2" onClick={basculer}>
              {sombre ? 'Passer au thème clair' : 'Passer au thème sombre'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
