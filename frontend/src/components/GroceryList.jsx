import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, CheckIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { getGroceryItems, createGroceryItem, updateGroceryItem, deleteGroceryItem } from '../services/api';
import { useWidgetExpand } from '../contexts/WidgetExpandContext';
import clsx from 'clsx';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableGroceryItem({ item, onToggle, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'flex items-center justify-between p-2 rounded-lg transition-all',
        item.purchased
          ? 'bg-green-50 border border-green-200'
          : 'bg-white border border-[#e3e8ee] hover:border-[#d1d9e0] hover:shadow-md'
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="text-[#aab4c1] hover:text-[#727f96] cursor-grab active:cursor-grabbing"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
        <button
          onClick={() => onToggle(item)}
          className={clsx(
            'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
            item.purchased
              ? 'bg-[#15be53] border-[#15be53]'
              : 'border-[#e3e8ee] hover:border-[#15be53]'
          )}
        >
          {item.purchased && <CheckIcon className="h-4 w-4 text-white" />}
        </button>
        <div className="flex-1">
          <p
            className={clsx(
              'font-medium',
              item.purchased
                ? 'text-[#aab4c1] line-through'
                : 'text-[#0a2540]'
            )}
          >
            {item.name}
          </p>
          <p className="text-sm text-[#727f96]">Qty: {item.quantity}</p>
        </div>
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="text-[#aab4c1] hover:text-red-500 p-1 transition-colors flex-shrink-0"
      >
        <TrashIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function GroceryList() {
  const queryClient = useQueryClient();
  const { expandedWidget, collapseWidget } = useWidgetExpand();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: 1 });
  const [itemOrder, setItemOrder] = useState([]);

  const isExpanded = expandedWidget === 'grocery';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: groceryItems = [] } = useQuery({
    queryKey: ['groceryItems'],
    queryFn: async () => {
      const response = await getGroceryItems();
      return response.data;
    },
    refetchInterval: 600000, // Refetch every 10 minutes
  });

  const createItemMutation = useMutation({
    mutationFn: createGroceryItem,
    onSuccess: () => {
      queryClient.invalidateQueries(['groceryItems']);
      setIsAddingItem(false);
      setNewItem({ name: '', quantity: 1 });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, item }) => updateGroceryItem(id, item),
    onSuccess: () => {
      queryClient.invalidateQueries(['groceryItems']);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteGroceryItem,
    onSuccess: () => {
      queryClient.invalidateQueries(['groceryItems']);
    },
  });

  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    createItemMutation.mutate(newItem);
  };

  const toggleItemPurchased = (item) => {
    updateItemMutation.mutate({
      id: item.id,
      item: { purchased: !item.purchased },
    });
  };

  const getOrderedItems = (items) => {
    if (itemOrder.length === 0) return items;
    return itemOrder
      .map(id => items.find(item => item.id === id))
      .filter(Boolean)
      .concat(items.filter(item => !itemOrder.includes(item.id)));
  };

  const unpurchasedItems = getOrderedItems(groceryItems.filter((item) => !item.purchased));
  const purchasedItems = groceryItems.filter((item) => item.purchased);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = unpurchasedItems.findIndex((item) => item.id === active.id);
      const newIndex = unpurchasedItems.findIndex((item) => item.id === over.id);

      const newOrder = arrayMove(unpurchasedItems, oldIndex, newIndex);
      setItemOrder(newOrder.map(item => item.id));
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#e3e8ee] p-3 md:p-4 lg:h-full flex flex-col overflow-y-auto lg:overflow-hidden">
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <h2 className="text-xl font-semibold text-[#0a2540]">Grocery List</h2>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <button
              onClick={collapseWidget}
              className="text-[#727f96] hover:text-[#0a2540] text-sm font-medium transition-colors"
            >
              Close
            </button>
          )}
          <button
            onClick={() => setIsAddingItem(!isAddingItem)}
            className="bg-[#15be53] hover:bg-[#13ab4a] text-white p-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isAddingItem && (
        <div className="mb-4 p-4 bg-[#f6f9fc] rounded-lg border border-[#e3e8ee]">
          <input
            type="text"
            placeholder="Item name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="w-full p-2 mb-2 bg-white border border-[#e3e8ee] rounded-lg text-[#0a2540] placeholder-[#aab4c1] focus:ring-2 focus:ring-[#15be53] focus:border-transparent"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
            min="1"
            className="w-full p-2 mb-2 bg-white border border-[#e3e8ee] rounded-lg text-[#0a2540] focus:ring-2 focus:ring-[#15be53] focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddItem}
              className="flex-1 bg-[#15be53] hover:bg-[#13ab4a] text-white py-2 rounded-lg transition-colors font-medium"
            >
              Add
            </button>
            <button
              onClick={() => setIsAddingItem(false)}
              className="flex-1 bg-[#e3e8ee] hover:bg-[#d1d9e0] text-[#0a2540] py-2 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {/* Unpurchased Items */}
        <div>
          <h3 className="text-sm font-semibold text-[#727f96] mb-3 uppercase tracking-wider">To Buy</h3>
          {unpurchasedItems.length === 0 ? (
            <p className="text-[#727f96] italic text-center py-8">
              All items purchased!
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={unpurchasedItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {unpurchasedItems.map((item) => (
                    <SortableGroceryItem
                      key={item.id}
                      item={item}
                      onToggle={toggleItemPurchased}
                      onDelete={(id) => deleteItemMutation.mutate(id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Purchased Items */}
        {purchasedItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#727f96] mb-3 uppercase tracking-wider">
              Purchased
            </h3>
            <div className="space-y-2">
              {purchasedItems.map((item) => (
                <SortableGroceryItem
                  key={item.id}
                  item={item}
                  onToggle={toggleItemPurchased}
                  onDelete={(id) => deleteItemMutation.mutate(id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
