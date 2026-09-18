import { describe, it, expect } from 'vitest';
import { validateGroceryItem } from '../../src/domain/groceryItems';

describe('validateGroceryItem', () => {
  it('rejects blank name', () => {
    expect(validateGroceryItem({ name: '' })).toContain("name can't be blank");
  });

  it('rejects an overlong name', () => {
    expect(validateGroceryItem({ name: 'a'.repeat(256) }).some((e) => e.includes('too long'))).toBe(true);
  });

  it('rejects quantity <= 0', () => {
    expect(validateGroceryItem({ name: 'Milk', quantity: 0 }).length).toBeGreaterThan(0);
  });

  it('rejects quantity > 999', () => {
    expect(validateGroceryItem({ name: 'Milk', quantity: 1000 }).length).toBeGreaterThan(0);
  });

  it('defaults quantity to 1 when omitted', () => {
    expect(validateGroceryItem({ name: 'Milk' })).toEqual([]);
  });

  it('accepts a valid item', () => {
    expect(validateGroceryItem({ name: 'Milk', quantity: 2 })).toEqual([]);
  });
});
