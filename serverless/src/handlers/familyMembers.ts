import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { json } from '../lib/http';
import { FAMILY_MEMBERS } from '../domain/familyMembers';
import { serializeFamilyMember } from '../serializers';

export async function index(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  return json(200, FAMILY_MEMBERS.map(serializeFamilyMember));
}
