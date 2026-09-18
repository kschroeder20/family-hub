// Read-only and essentially never changes, so this is static config rather
// than a DynamoDB table -- there's no create/update/delete endpoint for it.

export interface FamilyMember {
  id: string;
  name: string;
  color: string;
}

export const FAMILY_MEMBERS: FamilyMember[] = [
  { id: 'mom', name: 'Mom', color: '#EC4899' },
  { id: 'dad', name: 'Dad', color: '#3B82F6' },
  { id: 'gabi', name: 'Gabi', color: '#8B5CF6' },
  { id: 'kayce', name: 'Kayce', color: '#10B981' },
];
