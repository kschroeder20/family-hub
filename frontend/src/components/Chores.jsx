import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tab } from '@headlessui/react';
import { PlusIcon, TrashIcon, CheckIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { format, isPast, parseISO, addDays, isWithinInterval, startOfDay } from 'date-fns';
import { getChores, getFamilyMembers, createChore, updateChore, deleteChore } from '../services/api';
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

function SortableChoreItem({ chore, onToggle, onDelete, isOverdue }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chore.id });

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
        'p-4 rounded-lg border transition-all',
        chore.completed
          ? 'bg-[#f6f9fc] border-[#e3e8ee]'
          : isOverdue(chore.due_date, chore.completed)
          ? 'bg-red-50 border-red-200'
          : 'bg-white border-[#e3e8ee]',
        'hover:border-[#d1d9e0] hover:shadow-md'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-[#aab4c1] hover:text-[#727f96] cursor-grab active:cursor-grabbing"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
        <button
          onClick={() => onToggle(chore)}
          className={clsx(
            'mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
            chore.completed
              ? 'bg-[#15be53] border-[#15be53]'
              : 'border-[#e3e8ee] hover:border-[#15be53]'
          )}
        >
          {chore.completed && (
            <CheckIcon className="h-4 w-4 text-white" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <h3
            className={clsx(
              'font-medium',
              chore.completed
                ? 'line-through text-[#aab4c1]'
                : isOverdue(chore.due_date, chore.completed)
                ? 'text-red-700'
                : 'text-[#0a2540]'
            )}
          >
            {chore.title}
          </h3>
          {chore.description && (
            <p className="text-sm text-[#727f96] mt-1">
              {chore.description}
            </p>
          )}
          {chore.due_date && (
            <p
              className={clsx(
                'text-xs mt-2 font-medium',
                isOverdue(chore.due_date, chore.completed)
                  ? 'text-red-600'
                  : 'text-[#aab4c1]'
              )}
            >
              Due: {format(parseISO(chore.due_date), 'MMM d, yyyy')}
              {isOverdue(chore.due_date, chore.completed) && ' - OVERDUE'}
            </p>
          )}
        </div>
        <button
          onClick={() => onDelete(chore.id)}
          className="text-[#aab4c1] hover:text-red-500 p-1 transition-colors flex-shrink-0"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function Chores() {
  const queryClient = useQueryClient();
  const { expandedWidget, collapseWidget } = useWidgetExpand();
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(0);
  const [isAddingChore, setIsAddingChore] = useState(false);
  const [newChore, setNewChore] = useState({
    title: '',
    description: '',
    due_date: '',
  });
  const [choreOrder, setChoreOrder] = useState({});

  const isExpanded = expandedWidget === 'chores';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: async () => {
      const response = await getFamilyMembers();
      return response.data;
    },
  });

  const { data: chores = [] } = useQuery({
    queryKey: ['chores'],
    queryFn: async () => {
      const response = await getChores();
      return response.data;
    },
    refetchInterval: 600000, // Refetch every 10 minutes
  });

  const createChoreMutation = useMutation({
    mutationFn: createChore,
    onSuccess: () => {
      queryClient.invalidateQueries(['chores']);
      setIsAddingChore(false);
      setNewChore({ title: '', description: '', due_date: '' });
    },
  });

  const updateChoreMutation = useMutation({
    mutationFn: ({ id, chore }) => updateChore(id, chore),
    onSuccess: () => {
      queryClient.invalidateQueries(['chores']);
    },
  });

  const deleteChoreMutation = useMutation({
    mutationFn: deleteChore,
    onSuccess: () => {
      queryClient.invalidateQueries(['chores']);
    },
  });

  const handleAddChore = () => {
    if (!newChore.title.trim()) return;

    const selectedMember = familyMembers[selectedMemberIndex];
    createChoreMutation.mutate({
      ...newChore,
      family_member_id: selectedMember.id,
      due_date: newChore.due_date || null,
    });
  };

  const toggleChoreComplete = (chore) => {
    updateChoreMutation.mutate({
      id: chore.id,
      chore: { completed: !chore.completed },
    });
  };

  const getChoresForMember = (memberId) => {
    const memberChores = chores.filter((chore) => chore.family_member.id === memberId);
    const orderKey = `member_${memberId}`;

    if (choreOrder[orderKey]) {
      return choreOrder[orderKey]
        .map(id => memberChores.find(c => c.id === id))
        .filter(Boolean);
    }
    return memberChores;
  };

  const getChoreCounts = (memberId) => {
    const memberChores = chores.filter((chore) => chore.family_member.id === memberId && !chore.completed);
    const overdueCount = memberChores.filter(chore => isOverdue(chore.due_date, chore.completed)).length;
    const activeCount = memberChores.length - overdueCount;
    return { activeCount, overdueCount };
  };

  const isOverdue = (dueDate, completed) => {
    if (!dueDate || completed) return false;
    return isPast(parseISO(dueDate));
  };

  const getUpcomingChores = () => {
    const today = startOfDay(new Date());
    const sevenDaysFromNow = addDays(today, 7);

    return chores
      .filter(chore => {
        if (chore.completed) return false;

        // Include chores without due dates
        if (!chore.due_date) return true;

        // Include chores due within the next 7 days
        const dueDate = parseISO(chore.due_date);
        return isWithinInterval(dueDate, { start: today, end: sevenDaysFromNow });
      })
      .sort((a, b) => {
        // Sort: chores with dates first (by date), then chores without dates
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return parseISO(a.due_date) - parseISO(b.due_date);
      });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const selectedMember = familyMembers[selectedMemberIndex];
      const orderKey = `member_${selectedMember.id}`;
      const memberChores = getChoresForMember(selectedMember.id);

      const oldIndex = memberChores.findIndex((c) => c.id === active.id);
      const newIndex = memberChores.findIndex((c) => c.id === over.id);

      const newOrder = arrayMove(memberChores, oldIndex, newIndex);
      setChoreOrder({
        ...choreOrder,
        [orderKey]: newOrder.map(c => c.id),
      });
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#e3e8ee] p-3 md:p-4 lg:h-full flex flex-col overflow-y-auto lg:overflow-hidden">
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <h2 className="text-xl font-semibold text-[#0a2540]">Chores</h2>
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
            onClick={() => setIsAddingChore(!isAddingChore)}
            className="bg-[#635bff] hover:bg-[#5650e6] text-white p-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isAddingChore && (
        <div className="mb-4 p-4 bg-[#f6f9fc] rounded-lg border border-[#e3e8ee]">
          <input
            type="text"
            placeholder="Chore title"
            value={newChore.title}
            onChange={(e) => setNewChore({ ...newChore, title: e.target.value })}
            className="w-full p-2 mb-2 bg-white border border-[#e3e8ee] rounded-lg text-[#0a2540] placeholder-[#aab4c1] focus:ring-2 focus:ring-[#635bff] focus:border-transparent"
          />
          <textarea
            placeholder="Description (optional)"
            value={newChore.description}
            onChange={(e) => setNewChore({ ...newChore, description: e.target.value })}
            className="w-full p-2 mb-2 bg-white border border-[#e3e8ee] rounded-lg text-[#0a2540] placeholder-[#aab4c1] focus:ring-2 focus:ring-[#635bff] focus:border-transparent"
            rows="2"
          />
          <div className="mb-2">
            <label htmlFor="due-date" className="block text-xs font-medium text-[#727f96] mb-1">
              Due Date (optional)
            </label>
            <input
              id="due-date"
              type="date"
              value={newChore.due_date}
              onChange={(e) => setNewChore({ ...newChore, due_date: e.target.value })}
              className="w-full p-2 bg-white border border-[#e3e8ee] rounded-lg text-[#0a2540] focus:ring-2 focus:ring-[#635bff] focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddChore}
              className="flex-1 bg-[#635bff] hover:bg-[#5650e6] text-white py-2 rounded-lg transition-colors font-medium"
            >
              Add
            </button>
            <button
              onClick={() => setIsAddingChore(false)}
              className="flex-1 bg-[#e3e8ee] hover:bg-[#d1d9e0] text-[#0a2540] py-2 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Chores Section */}
      {getUpcomingChores().length > 0 && (
        <div className="mb-3 p-4 bg-gradient-to-br from-[#f6f9fc] to-[#e8ecf1] rounded-lg border border-[#e3e8ee] flex-shrink-0">
          <h3 className="text-sm font-semibold text-[#0a2540] mb-3 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-[#635bff] rounded-full"></span>
            Upcoming Chores (Next 7 Days)
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {getUpcomingChores().map((chore) => (
              <div
                key={chore.id}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#e3e8ee] hover:shadow-sm transition-all"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: chore.family_member.color }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-[#0a2540] truncate">
                    {chore.title}
                  </h4>
                  <p className="text-xs text-[#727f96]">
                    {chore.family_member.name}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {chore.due_date ? (
                    <p className="text-xs font-medium text-[#635bff]">
                      {format(parseISO(chore.due_date), 'MMM d')}
                    </p>
                  ) : (
                    <p className="text-xs text-[#aab4c1] italic">
                      No date
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tab.Group selectedIndex={selectedMemberIndex} onChange={setSelectedMemberIndex}>
        <Tab.List className="flex space-x-2 rounded-xl bg-[#f6f9fc] p-1 mb-3 border border-[#e3e8ee] flex-shrink-0">
          {familyMembers.map((member) => {
            const { activeCount, overdueCount } = getChoreCounts(member.id);
            return (
              <Tab
                key={member.id}
                className={({ selected }) =>
                  clsx(
                    'w-full rounded-lg py-2 text-xs font-medium leading-5 transition-all',
                    selected
                      ? 'bg-white shadow-md text-[#0a2540]'
                      : 'text-[#727f96] hover:bg-white/50 hover:text-[#0a2540]'
                  )
                }
              >
                <div className="flex items-center justify-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                  <span>{member.name}</span>
                  <div className="flex items-center gap-1">
                    {activeCount > 0 && (
                      <div
                        className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: member.color }}
                      >
                        {activeCount}
                      </div>
                    )}
                    {overdueCount > 0 && (
                      <div className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white">
                        {overdueCount}
                      </div>
                    )}
                  </div>
                </div>
              </Tab>
            );
          })}
        </Tab.List>
        <Tab.Panels className="flex-1 overflow-y-auto min-h-0">
          {familyMembers.map((member) => {
            const memberChores = getChoresForMember(member.id);
            return (
              <Tab.Panel key={member.id} className="space-y-2">
                {memberChores.length === 0 ? (
                  <p className="text-[#727f96] italic text-center py-8">
                    No chores assigned to {member.name}
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={memberChores.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {memberChores.map((chore) => (
                        <SortableChoreItem
                          key={chore.id}
                          chore={chore}
                          onToggle={toggleChoreComplete}
                          onDelete={(id) => deleteChoreMutation.mutate(id)}
                          isOverdue={isOverdue}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </Tab.Panel>
            );
          })}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
