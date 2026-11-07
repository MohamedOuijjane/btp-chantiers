import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { optionsBase } from '../src/database/options';
import { HealthController } from '../src/health/health.controller';

describe('HealthController', () => {
  it('UP quand PostgreSQL répond', async () => {
    const base = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as unknown as DataSource;
    await expect(new HealthController(base).health()).resolves.toEqual({
      status: 'UP',
      service: 'taches-service',
      base: 'UP',
    });
  });

  it('503 quand PostgreSQL ne répond pas (le healthcheck Docker échoue)', async () => {
    const base = { query: jest.fn().mockRejectedValue(new Error('connexion refusée')) } as unknown as DataSource;
    await expect(new HealthController(base).health()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('optionsBase', () => {
  it('base unique btp_db, schéma taches, migrations et jamais synchronize', () => {
    const o = optionsBase({});
    expect(o).toEqual(
      expect.objectContaining({
        type: 'postgres',
        url: 'postgres://taches_user:taches@localhost:5432/btp_db',
        schema: 'taches',
        migrationsRun: true,
        synchronize: false,
      }),
    );
  });

  it('lit DATABASE_URL et DB_SCHEMA', () => {
    const o = optionsBase({ DATABASE_URL: 'postgres://u:p@h:5432/b', DB_SCHEMA: 'autre' });
    expect(o).toEqual(expect.objectContaining({ url: 'postgres://u:p@h:5432/b', schema: 'autre' }));
  });
});
