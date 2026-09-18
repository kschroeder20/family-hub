import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { handleErrors, json, noContent, parseBody } from '../lib/http';
import { serializeGroceryItem } from '../serializers';
import {
  clearPurchasedGroceryItems,
  createGroceryItem,
  deleteGroceryItem,
  getGroceryItem,
  listGroceryItems,
  updateGroceryItem,
  type GroceryItemWriteInput,
} from '../repositories/groceryItemsRepository';

function extractInput(body: Record<string, unknown>): GroceryItemWriteInput {
  const g = (body.grocery_item as Record<string, unknown>) ?? {};
  return {
    name: g.name as string,
    quantity: g.quantity as number | undefined,
    purchased: g.purchased as boolean | undefined,
  };
}

export async function index(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  return handleErrors(async () => {
    const items = await listGroceryItems();
    return json(200, items.map(serializeGroceryItem));
  });
}

export async function show(_event: APIGatewayProxyEventV2, params: Record<string, string>) {
  return handleErrors(async () => {
    const item = await getGroceryItem(params.id);
    return json(200, serializeGroceryItem(item));
  });
}

export async function create(event: APIGatewayProxyEventV2) {
  return handleErrors(async () => {
    const input = extractInput(parseBody(event));
    const item = await createGroceryItem(input);
    return json(201, serializeGroceryItem(item));
  });
}

export async function update(event: APIGatewayProxyEventV2, params: Record<string, string>) {
  return handleErrors(async () => {
    const input = extractInput(parseBody(event));
    const item = await updateGroceryItem(params.id, input);
    return json(200, serializeGroceryItem(item));
  });
}

export async function destroy(_event: APIGatewayProxyEventV2, params: Record<string, string>) {
  return handleErrors(async () => {
    await getGroceryItem(params.id);
    await deleteGroceryItem(params.id);
    return noContent();
  });
}

export async function clearPurchased(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  return handleErrors(async () => {
    await clearPurchasedGroceryItems();
    return noContent();
  });
}
