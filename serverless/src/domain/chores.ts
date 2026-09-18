export type ChoreOverdueSeverity = 'amber' | 'red' | null;

export function isOverdue(dueDate: Date | null | undefined, completed: boolean, now: Date): boolean {
  return !!dueDate && dueDate.getTime() < now.getTime() && !completed;
}

export function choreOverdueSeverity(
  dueDate: Date | null | undefined,
  completed: boolean,
  now: Date
): ChoreOverdueSeverity {
  if (!isOverdue(dueDate, completed, now)) return null;

  const daysOverdue = Math.floor((now.getTime() - dueDate!.getTime()) / (1000 * 60 * 60 * 24));
  if (daysOverdue >= 7) return 'red';
  if (daysOverdue >= 1) return 'amber';
  return null;
}

export interface ChoreInput {
  title: string;
  description?: string | null;
}

export function validateChore(input: ChoreInput): string[] {
  const errors: string[] = [];
  if (!input.title || !input.title.trim()) errors.push("title can't be blank");
  if (input.title && input.title.length > 255) errors.push('title is too long (maximum is 255 characters)');
  if (input.description && input.description.length > 1000) {
    errors.push('description is too long (maximum is 1000 characters)');
  }
  return errors;
}
