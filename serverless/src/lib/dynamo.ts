import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// DYNAMODB_ENDPOINT is set for local/integration testing (DynamoDB Local);
// left unset in real Lambda so the SDK talks to the real regional endpoint.
const client = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
  region: process.env.AWS_REGION || 'us-east-1',
});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TableNames = {
  chores: process.env.CHORES_TABLE || 'family_hub_chores',
  recurringChores: process.env.RECURRING_CHORES_TABLE || 'family_hub_recurring_chores',
  recurringChoreCompletions:
    process.env.RECURRING_CHORE_COMPLETIONS_TABLE || 'family_hub_recurring_chore_completions',
  groceryItems: process.env.GROCERY_ITEMS_TABLE || 'family_hub_grocery_items',
  googleCredentials: process.env.GOOGLE_CREDENTIALS_TABLE || 'family_hub_google_credentials',
};
