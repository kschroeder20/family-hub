export interface GroceryItemInput {
  name: string;
  quantity?: number;
}

export function validateGroceryItem(input: GroceryItemInput): string[] {
  const errors: string[] = [];
  if (!input.name || !input.name.trim()) errors.push("name can't be blank");
  if (input.name && input.name.length > 255) errors.push('name is too long (maximum is 255 characters)');

  const qty = input.quantity ?? 1;
  if (!(qty > 0) || qty > 999) {
    errors.push('quantity must be greater than 0 and less than or equal to 999');
  }
  return errors;
}
