import { applyIntegrationDbEnv } from '../integration-db/helpers/db-env';

applyIntegrationDbEnv();

jest.setTimeout(60_000);
