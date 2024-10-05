import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { config } from 'dotenv';
import { getEnvPath } from '../helper/env.helper';
import { TypeOrmOptions } from './TypeOrmConfigService';

const envFilePath = getEnvPath(`${__dirname}/../envs`);
config({ path: envFilePath, debug: true });

const configService = new ConfigService();
export default new DataSource({
  ...TypeOrmOptions(configService),
  migrationsTableName: 'migrations',
  migrations: ['./src/migrations/*.ts']
});
