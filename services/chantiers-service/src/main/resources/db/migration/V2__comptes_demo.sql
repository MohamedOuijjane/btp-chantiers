-- Les 4 comptes de démonstration de la maquette (personnes et société fictives).
-- Aucun mot de passe ici : il est défini au démarrage depuis DEMO_MOT_DE_PASSE (ComptesDemo).
INSERT INTO utilisateurs (email, nom, initiales, role, demo) VALUES
    ('nadia.belkadi@souss-batiment.demo',  'Nadia Belkadi',        'NB', 'DIRECTION',     TRUE),
    ('samir.haddou@souss-batiment.demo',   'Samir Haddou',         'SH', 'CONDUCTEUR',    TRUE),
    ('karim.aitali@souss-batiment.demo',   'Karim Aït Ali',        'KA', 'CHEF_CHANTIER', TRUE),
    ('fatima.idrissi@souss-batiment.demo', 'Fatima Zahra Idrissi', 'FI', 'MAGASINIER',    TRUE);
