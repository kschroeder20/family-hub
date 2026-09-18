import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

process.env.DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://127.0.0.1:8100';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'local';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'local';

const rawClient = new DynamoDBClient({ endpoint: process.env.DYNAMODB_ENDPOINT, region: 'us-east-1' });
export const testDdb = DynamoDBDocumentClient.from(rawClient);

export const TEST_TABLES = [
  process.env.CHORES_TABLE || 'family_hub_chores',
  process.env.RECURRING_CHORES_TABLE || 'family_hub_recurring_chores',
  process.env.RECURRING_CHORE_COMPLETIONS_TABLE || 'family_hub_recurring_chore_completions',
  process.env.GROCERY_ITEMS_TABLE || 'family_hub_grocery_items',
];

export async function createTestTables(): Promise<void> {
  for (const TableName of TEST_TABLES) {
    await rawClient.send(
      new CreateTableCommand({
        TableName,
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        BillingMode: 'PAY_PER_REQUEST',
      })
    ).catch((e) => {
      if (!String(e).includes('ResourceInUseException')) throw e;
    });
  }
}

export async function dropTestTables(): Promise<void> {
  for (const TableName of TEST_TABLES) {
    await rawClient.send(new DeleteTableCommand({ TableName })).catch(() => {});
  }
}
