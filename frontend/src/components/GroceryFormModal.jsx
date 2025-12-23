import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function GroceryFormModal({ onClose, onSubmit }) {
  const [newItem, setNewItem] = useState({ name: '', quantity: 1 });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    onSubmit(newItem);
    setNewItem({ name: '', quantity: 1 });
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50 pointer-events-auto">
      <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-xl md:text-2xl font-semibold text-[#0a2540]">Add Grocery Item</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="h-8 w-8" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6">
            <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              id="itemName"
              placeholder="e.g., Milk, Bread, Eggs"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#15be53]"
              autoFocus
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
              min="1"
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#15be53]"
            />
          </div>
      </form>

      {/* Action Buttons - Fixed at bottom */}
      <div className="flex gap-3 p-4 md:p-6 border-t border-gray-200 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-lg font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          className="flex-1 px-6 py-3 bg-[#15be53] text-white rounded-md hover:bg-[#13ab4a] transition-colors text-lg font-medium"
        >
          Add Item
        </button>
      </div>
    </div>
  );
}
