import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFamilyMembers, updateChore, updateRecurringChore } from '../services/api';

const RECURRENCE_TYPES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'custom_days', label: 'Specific Days' },
];

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

export default function ChoreEditModal({ chore, onClose }) {
  const queryClient = useQueryClient();
  const isRecurring = chore.type === 'recurring';

  const [title, setTitle] = useState(chore.title);
  const [description, setDescription] = useState(chore.description || '');
  const [familyMemberId, setFamilyMemberId] = useState(chore.family_member?.id || '');

  // One-time chore fields
  const [dueDate, setDueDate] = useState(chore.due_date?.split('T')[0] || '');

  // Recurring chore fields
  const [recurrenceType, setRecurrenceType] = useState(chore.recurrence_type || 'weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(chore.recurrence_interval || 1);
  const [dayOfMonth, setDayOfMonth] = useState(chore.day_of_month || '');
  const [daysOfWeek, setDaysOfWeek] = useState(chore.days_of_week || []);

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: getFamilyMembers,
    select: (response) => response.data,
  });

  const updateChoreMutation = useMutation({
    mutationFn: ({ id, chore }) => updateChore(id, chore),
    onSuccess: () => {
      queryClient.invalidateQueries(['chores']);
      onClose();
    },
  });

  const updateRecurringChoreMutation = useMutation({
    mutationFn: ({ id, recurringChore }) => updateRecurringChore(id, recurringChore),
    onSuccess: () => {
      queryClient.invalidateQueries(['recurringChores']);
      onClose();
    },
  });

  const handleDayOfWeekToggle = (day) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isRecurring) {
      const recurringChoreData = {
        title,
        description,
        family_member_id: familyMemberId || null,
        recurrence_type: recurrenceType,
        recurrence_interval: parseInt(recurrenceInterval) || 1,
        day_of_month: dayOfMonth ? parseInt(dayOfMonth) : null,
        days_of_week: daysOfWeek,
      };
      updateRecurringChoreMutation.mutate({ id: chore.id, recurringChore: recurringChoreData });
    } else {
      const choreData = {
        title,
        description,
        family_member_id: familyMemberId || null,
        due_date: dueDate,
      };
      updateChoreMutation.mutate({ id: chore.id, chore: choreData });
    }
  };

  const isFormValid = () => {
    if (!title.trim()) return false;

    if (!isRecurring) {
      return true; // Due date is now optional
    } else {
      // Recurring chore validation
      if (recurrenceType === 'custom_days' && daysOfWeek.length === 0) {
        return false;
      }
      if (recurrenceType === 'monthly' && dayOfMonth && (dayOfMonth < 1 || dayOfMonth > 31)) {
        return false;
      }
      return true;
    }
  };

  return (
    <div className="absolute inset-0 bg-white flex flex-col z-10 pointer-events-auto">
      <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-2xl font-semibold text-[#0a2540]">
          Edit {isRecurring ? 'Recurring' : ''} Chore
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="h-8 w-8" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
        {/* Title */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Clean Kitchen"
            required
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Additional details..."
          />
        </div>

        {/* Assign To */}
        <div className="mb-4">
          <label htmlFor="familyMember" className="block text-sm font-medium text-gray-700 mb-1">
            Assign To
          </label>
          <select
            id="familyMember"
            value={familyMemberId}
            onChange={(e) => setFamilyMemberId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Unassigned</option>
            {familyMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        {/* One-Time Chore Fields */}
        {!isRecurring && (
          <div className="mb-4">
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Recurring Chore Fields */}
        {isRecurring && (
          <>
            {/* Recurrence Type */}
            <div className="mb-4">
              <label htmlFor="recurrenceType" className="block text-sm font-medium text-gray-700 mb-1">
                Recurrence Pattern *
              </label>
              <select
                id="recurrenceType"
                value={recurrenceType}
                onChange={(e) => {
                  setRecurrenceType(e.target.value);
                  // Reset days of week when changing type
                  if (e.target.value !== 'custom_days' && e.target.value !== 'weekly') {
                    setDaysOfWeek([]);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RECURRENCE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Recurrence Interval (for weekly and monthly) */}
            {(recurrenceType === 'weekly' || recurrenceType === 'monthly') && (
              <div className="mb-4">
                <label htmlFor="recurrenceInterval" className="block text-sm font-medium text-gray-700 mb-1">
                  Every
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="recurrenceInterval"
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(e.target.value)}
                    min="1"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">
                    {recurrenceType === 'weekly' ? 'week(s)' : 'month(s)'}
                  </span>
                </div>
              </div>
            )}

            {/* Days of Week Selector (for weekly and custom_days) */}
            {(recurrenceType === 'weekly' || recurrenceType === 'custom_days') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {recurrenceType === 'weekly' ? 'On days (optional)' : 'On days *'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleDayOfWeekToggle(day.value)}
                      className={`px-3 py-2 rounded-md font-medium transition-colors ${
                        daysOfWeek.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {recurrenceType === 'custom_days' && daysOfWeek.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">Please select at least one day</p>
                )}
              </div>
            )}

            {/* Day of Month (for monthly) */}
            {recurrenceType === 'monthly' && (
              <div className="mb-4">
                <label htmlFor="dayOfMonth" className="block text-sm font-medium text-gray-700 mb-1">
                  Day of Month (optional)
                </label>
                <input
                  type="number"
                  id="dayOfMonth"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  min="1"
                  max="31"
                  placeholder="e.g., 15 for the 15th"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to use current day of month</p>
              </div>
            )}
          </>
        )}
      </form>

      {/* Action Buttons - Fixed at bottom */}
      <div className="flex gap-3 p-6 border-t border-gray-200 flex-shrink-0">
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
          disabled={!isFormValid()}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg font-medium"
        >
          Update Chore
        </button>
      </div>
    </div>
  );
}
