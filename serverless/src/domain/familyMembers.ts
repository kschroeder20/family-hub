// Read-only in the Rails app (routes.rb only exposes `index`), seeded once in
// backend/db/migrate/20231203000001_create_family_members.rb and never
// changed since. Treated as static config rather than a DynamoDB table.

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
