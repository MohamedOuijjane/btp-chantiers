import { creerDonneesFictives } from './donnees-fictives';

// Les données fictives doivent redonner les chiffres du tableau de bord de la maquette.
describe('Données fictives de la maquette', () => {
  const d = creerDonneesFictives();
  const moyenne = (valeurs: number[]) => valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
  const avancement = (chantierId: number) => {
    const taches = d.taches.filter((t) => t.chantierId === chantierId);
    return taches.length ? Math.round(moyenne(taches.map((t) => t.avancement))) : 0;
  };

  it('contient 6 chantiers, 10 ouvriers, 6 matériaux et des mouvements', () => {
    expect(d.chantiers).toHaveLength(6);
    expect(d.ouvriers).toHaveLength(10);
    expect(d.materiaux).toHaveLength(6);
    expect(d.mouvements.length).toBeGreaterThan(0);
  });

  it('redonne les indicateurs du tableau de bord', () => {
    const enCours = d.chantiers.filter((c) => c.statut === 'EN_COURS');
    expect(enCours).toHaveLength(3);
    expect(Math.round(moyenne(enCours.map((c) => avancement(c.id))))).toBe(46);
    expect(d.ouvriers.filter((o) => o.disponible)).toHaveLength(8);
    expect(d.materiaux.filter((m) => m.enAlerte).map((m) => m.reference)).toEqual([
      'MAT-001',
      'MAT-003',
    ]);
    expect(enCours.reduce((s, c) => s + c.budget, 0)).toBe(14_600_000);
  });

  it('donne à chaque chantier l’avancement affiché sur la maquette', () => {
    expect(d.chantiers.map((c) => avancement(c.id))).toEqual([56, 47, 0, 47, 100, 35]);
  });

  it('est cohérente : références existantes, alertes et statuts justes', () => {
    const ids = (liste: { id: number }[]) => new Set(liste.map((e) => e.id));
    const chantiers = ids(d.chantiers);
    const ouvriers = ids(d.ouvriers);
    const materiaux = ids(d.materiaux);

    for (const t of d.taches) {
      expect(chantiers.has(t.chantierId)).toBe(true);
      t.ouvrierIds.forEach((o) => expect(ouvriers.has(o)).toBe(true));
      expect(t.motif !== null).toBe(t.statut === 'BLOQUEE');
      if (t.statut === 'TERMINEE') expect(t.avancement).toBe(100);
    }
    for (const mv of d.mouvements) {
      expect(chantiers.has(mv.chantierId)).toBe(true);
      expect(materiaux.has(mv.materiauId)).toBe(true);
    }
    for (const m of d.materiaux) expect(m.enAlerte).toBe(m.stock <= m.seuilAlerte);
  });
});
