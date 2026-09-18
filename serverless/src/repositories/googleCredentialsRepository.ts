import { DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TableNames } from '../lib/dynamo';

// Mirrors GoogleCredential (Rails model) — single row keyed 'default', no
// per-family-member Google account distinction, matching the current app.
export async function storeGoogleCredentials(userId: string, credentialsJson: string): Promise<void> {
  const now = new Date().toISOString();
  await ddb.send(
    new PutCommand({
      TableName: TableNames.googleCredentials,
      Item: { userId, credentials: credentialsJson, updatedAt: now },
    })
  );
}

export async function loadGoogleCredentials(userId: string): Promise<string | null> {
  const res = await ddb.send(new GetCommand({ TableName: TableNames.googleCredentials, Key: { userId } }));
  return (res.Item?.credentials as string | undefined) ?? null;
}

export async function deleteGoogleCredentials(userId: string): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: TableNames.googleCredentials, Key: { userId } }));
}
