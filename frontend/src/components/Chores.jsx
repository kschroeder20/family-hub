import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tab } from '@headlessui/react';
import { PlusIcon, TrashIcon, CheckIcon, Bars3Icon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { format, isPast, parseISO, addDays, isWithinInterval, startOfDay } from 'date-fns';
import {
  getChores,
  getFamilyMembers,
  updateChore,
  deleteChore,
  getRecurringChores,
  deleteRecurringChore,
  completeRecurringChore,
} from '../services/api';
import { useWidgetExpand } from '../contexts/WidgetExpandContext';
import ChoreFormModal from './ChoreFormModal';
import ChoreEditModal from './ChoreEditModal';
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

function SortableChoreItem({ chore, onToggle, onDelete, onEdit, getOverdueSeverity }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${chore.type}-${chore.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isRecurring = chore.type === 'recurring';
  const overdueSeverity = getOverdueSeverity(chore);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'p-4 rounded-lg border transition-all',
        chore.completed
          ? 'bg-[#f6f9fc] border-[#e3e8ee]'
          : overdueSeverity === 'red'
          ? 'bg-red-50 border-red-200'
          : overdueSeverity === 'amber'
          ? 'bg-amber-50 border-amber-200'
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
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(chore)}>
          <div className="flex items-center gap-2">
            <h3
              className={clsx(
                'font-medium',
                chore.completed
                  ? 'line-through text-[#aab4c1]'
                  : overdueSeverity
                  ? overdueSeverity === 'red'
                    ? 'text-red-700'
                    : 'text-amber-700'
                  : 'text-[#0a2540]'
              )}
            >
              {chore.title}
            </h3>
            {isRecurring && (
              <ArrowPathIcon className="h-4 w-4 text-[#635bff]" title="Recurring chore" />
            )}
          </div>
          {chore.description && (
            <p className="text-sm text-[#727f96] mt-1">
              {chore.description}
            </p>
          )}
          <div className="flex flex-col gap-1 mt-2">
            {isRecurring && chore.recurrence_description && (
              <p className="text-xs text-[#635bff] font-medium">
                {chore.recurrence_description}
              </p>
            )}
            {chore.due_date && (
              <p
                className={clsx(
                  'text-xs font-medium',
                  overdueSeverity === 'red'
                    ? 'text-red-600'
                    : overdueSeverity === 'amber'
                    ? 'text-amber-600'
                    : 'text-[#aab4c1]'
                )}
              >
                {isRecurring ? 'Next due: ' : 'Due: '}
                {format(parseISO(chore.due_date), 'MMM d, yyyy')}
                {overdueSeverity && ' - OVERDUE'}
              </p>
            )}
            {isRecurring && chore.last_completed_at && (
              <p className="text-xs text-[#aab4c1]">
                Last completed: {format(parseISO(chore.last_completed_at), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(chore)}
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
  const { expandedWidget, expandWidget, collapseWidget } = useWidgetExpand();
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(0);
  const [isAddingChore, setIsAddingChore] = useState(false);
  const [editingChore, setEditingChore] = useState(null);
  const [choreOrder, setChoreOrder] = useState({});

  const isExpanded = expandedWidget === 'chores';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: familyMembersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: async () => {
      const response = await getFamilyMembers();
      return response.data;
    },
  });

  const { data: choresData, isLoading: isLoadingChores } = useQuery({
    queryKey: ['chores'],
    queryFn: async () => {
      const response = await getChores();
      return response.data;
    },
    refetchInterval: 600000, // Refetch every 10 minutes
  });

  const { data: recurringChoresData, isLoading: isLoadingRecurring } = useQuery({
    queryKey: ['recurringChores'],
    queryFn: async () => {
      const response = await getRecurringChores();
      return response.data;
    },
    refetchInterval: 600000, // Refetch every 10 minutes
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

  const deleteRecurringChoreMutation = useMutation({
    mutationFn: deleteRecurringChore,
    onSuccess: () => {
      queryClient.invalidateQueries(['recurringChores']);
    },
  });

  const completeRecurringChoreMutation = useMutation({
    mutationFn: ({ id, completedById }) => completeRecurringChore(id, completedById),
    onSuccess: () => {
      queryClient.invalidateQueries(['recurringChores']);
    },
  });

  // Ensure we have arrays, even if data is undefined
  const familyMembers = Array.isArray(familyMembersData) ? familyMembersData : [];
  const chores = Array.isArray(choresData) ? choresData : [];
  const recurringChores = Array.isArray(recurringChoresData) ? recurringChoresData : [];

  // Show loading state while initial data is loading
  if (isLoadingMembers || isLoadingChores || isLoadingRecurring) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#e3e8ee] p-3 md:p-4 lg:h-full flex items-center justify-center">
        <p className="text-[#727f96]">Loading chores...</p>
      </div>
    );
  }

  // Combine both types of chores with a type field
  const allChores = [
    ...chores.map(c => ({ ...c, type: 'one-time', due_date: c.due_date, completed: c.completed })),
    ...recurringChores.map(c => ({ ...c, type: 'recurring', due_date: c.next_due_date, completed: false }))
  ];

  const toggleChoreComplete = (chore) => {
    if (chore.type === 'one-time') {
      updateChoreMutation.mutate({
        id: chore.id,
        chore: { completed: !chore.completed },
      });
    } else {
      // For recurring chores, mark as complete (auto-calculates next due date)
      const completedById = chore.family_member?.id || null;
      completeRecurringChoreMutation.mutate({
        id: chore.id,
        completedById,
      });
    }
  };

  const handleDeleteChore = (chore) => {
    if (chore.type === 'one-time') {
      deleteChoreMutation.mutate(chore.id);
    } else {
      deleteRecurringChoreMutation.mutate(chore.id);
    }
  };

  const handleEditChore = (chore) => {
    expandWidget('chores');
    setEditingChore(chore);
  };

  const getOverdueSeverity = (chore) => {
    // Use backend-calculated severity if available
    if (chore.overdue_severity) {
      return chore.overdue_severity;
    }

    // Fallback calculation for one-time chores
    if (!chore.due_date || chore.completed) return null;
    const dueDate = parseISO(chore.due_date);
    if (!isPast(dueDate)) return null;

    const daysOverdue = Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24));
    if (daysOverdue >= 7) return 'red';
    if (daysOverdue >= 1) return 'amber';
    return null;
  };

  const getChoresForMember = (memberId) => {
    const memberChores = allChores
      .filter((chore) => chore.family_member?.id === memberId)
      .sort((a, b) => {
        // Sort by due date
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return parseISO(a.due_date) - parseISO(b.due_date);
      });

    const orderKey = `member_${memberId}`;
    if (choreOrder[orderKey]) {
      return choreOrder[orderKey]
        .map(combinedId => memberChores.find(c => `${c.type}-${c.id}` === combinedId))
        .filter(Boolean);
    }
    return memberChores;
  };

  const getUnassignedChores = () => {
    return allChores
      .filter((chore) => !chore.family_member)
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return parseISO(a.due_date) - parseISO(b.due_date);
      });
  };

  const getChoreCounts = (memberId) => {
    const memberChores = allChores.filter(
      (chore) => chore.family_member?.id === memberId && !chore.completed
    );
    const overdueCount = memberChores.filter(chore => getOverdueSeverity(chore)).length;
    const activeCount = memberChores.length - overdueCount;
    return { activeCount, overdueCount };
  };

  const getUnassignedCounts = () => {
    const unassignedChores = allChores.filter((chore) => !chore.family_member && !chore.completed);
    const overdueCount = unassignedChores.filter(chore => getOverdueSeverity(chore)).length;
    const activeCount = unassignedChores.length - overdueCount;
    return { activeCount, overdueCount };
  };

  const getUpcomingChores = () => {
    const today = startOfDay(new Date());
    const sevenDaysFromNow = addDays(today, 7);

    return allChores
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
      // Determine if this is for a member or unassigned
      const isUnassignedTab = selectedMemberIndex === familyMembers.length;
      const orderKey = isUnassignedTab ? 'unassigned' : `member_${familyMembers[selectedMemberIndex].id}`;
      const currentChores = isUnassignedTab
        ? getUnassignedChores()
        : getChoresForMember(familyMembers[selectedMemberIndex].id);

      const oldIndex = currentChores.findIndex((c) => `${c.type}-${c.id}` === active.id);
      const newIndex = currentChores.findIndex((c) => `${c.type}-${c.id}` === over.id);

      const newOrder = arrayMove(currentChores, oldIndex, newIndex);
      setChoreOrder({
        ...choreOrder,
        [orderKey]: newOrder.map(c => `${c.type}-${c.id}`),
      });
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#e3e8ee] p-3 md:p-4 lg:h-full flex flex-col overflow-y-auto lg:overflow-hidden relative">
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
            onClick={() => {
              expandWidget('chores');
              setIsAddingChore(true);
            }}
            className="bg-[#635bff] hover:bg-[#5650e6] text-white p-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isAddingChore && (
        <ChoreFormModal onClose={() => setIsAddingChore(false)} />
      )}

      {editingChore && (
        <ChoreEditModal
          chore={editingChore}
          onClose={() => setEditingChore(null)}
        />
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
                key={`${chore.type}-${chore.id}`}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#e3e8ee] hover:shadow-sm transition-all"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: chore.family_member?.color || '#aab4c1' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-medium text-[#0a2540] truncate">
                      {chore.title}
                    </h4>
                    {chore.type === 'recurring' && (
                      <ArrowPathIcon className="h-3.5 w-3.5 text-[#635bff] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[#727f96]">
                    {chore.family_member?.name || 'Unassigned'}
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
        <Tab.List className="flex space-x-2 rounded-xl bg-[#f6f9fc] p-1 mb-3 border border-[#e3e8ee] flex-shrink-0 overflow-x-auto">
          {familyMembers.map((member) => {
            const { activeCount, overdueCount } = getChoreCounts(member.id);
            return (
              <Tab
                key={member.id}
                className={({ selected }) =>
                  clsx(
                    'min-w-fit rounded-lg py-2 px-3 text-xs font-medium leading-5 transition-all whitespace-nowrap',
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
          {/* Unassigned Tab */}
          <Tab
            className={({ selected }) =>
              clsx(
                'min-w-fit rounded-lg py-2 px-3 text-xs font-medium leading-5 transition-all whitespace-nowrap',
                selected
                  ? 'bg-white shadow-md text-[#0a2540]'
                  : 'text-[#727f96] hover:bg-white/50 hover:text-[#0a2540]'
              )
            }
          >
            {(() => {
              const { activeCount, overdueCount } = getUnassignedCounts();
              return (
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#aab4c1]" />
                  <span>Unassigned</span>
                  <div className="flex items-center gap-1">
                    {activeCount > 0 && (
                      <div className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#aab4c1] text-[10px] font-semibold text-white">
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
              );
            })()}
          </Tab>
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
                      items={memberChores.map(c => `${c.type}-${c.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {memberChores.map((chore) => (
                        <SortableChoreItem
                          key={`${chore.type}-${chore.id}`}
                          chore={chore}
                          onToggle={toggleChoreComplete}
                          onDelete={handleDeleteChore}
                          onEdit={handleEditChore}
                          getOverdueSeverity={getOverdueSeverity}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </Tab.Panel>
            );
          })}
          {/* Unassigned Tab Panel */}
          <Tab.Panel className="space-y-2">
            {(() => {
              const unassignedChores = getUnassignedChores();
              return unassignedChores.length === 0 ? (
                <p className="text-[#727f96] italic text-center py-8">
                  No unassigned chores
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={unassignedChores.map(c => `${c.type}-${c.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {unassignedChores.map((chore) => (
                      <SortableChoreItem
                        key={`${chore.type}-${chore.id}`}
                        chore={chore}
                        onToggle={toggleChoreComplete}
                        onDelete={handleDeleteChore}
                        onEdit={handleEditChore}
                        getOverdueSeverity={getOverdueSeverity}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              );
            })()}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
