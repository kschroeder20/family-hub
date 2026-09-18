import { createTestTables, dropTestTables } from './setup';

export default async function setup() {
  await createTestTables();
  return async () => {
    await dropTestTables();
  };
}
