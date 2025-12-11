import { useState, useEffect } from 'react';
import Modal from './Modal';
import { TrashIcon } from '@heroicons/react/24/outline';

export default function EventFormModal({ isOpen, onClose, onSubmit, onDelete, event = null, initialDate = null }) {
  const isEditing = !!event;

  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (event) {
        // Editing existing event
        const startDateTime = new Date(event.start);
        const endDateTime = new Date(event.end);

        setFormData({
          summary: event.summary || '',
          description: event.description || '',
          startDate: startDateTime.toISOString().split('T')[0],
          startTime: startDateTime.toTimeString().slice(0, 5),
          endDate: endDateTime.toISOString().split('T')[0],
          endTime: endDateTime.toTimeString().slice(0, 5)
        });
      } else if (initialDate) {
        // Creating new event with initial date
        const date = new Date(initialDate);
        const dateStr = date.toISOString().split('T')[0];

        // Default to 1 hour duration starting at clicked time or 9 AM
        let startHour = date.getHours();
        if (startHour === 0 && date.getMinutes() === 0) {
          startHour = 9; // Default to 9 AM for all-day date clicks
        }

        const startTime = `${String(startHour).padStart(2, '0')}:00`;
        const endHour = (startHour + 1) % 24;
        const endTime = `${String(endHour).padStart(2, '0')}:00`;

        setFormData({
          summary: '',
          description: '',
          startDate: dateStr,
          startTime: startTime,
          endDate: dateStr,
          endTime: endTime
        });
      } else {
        // Creating new event without initial date
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const startTime = `${String(now.getHours()).padStart(2, '0')}:00`;
        const endHour = (now.getHours() + 1) % 24;
        const endTime = `${String(endHour).padStart(2, '0')}:00`;

        setFormData({
          summary: '',
          description: '',
          startDate: dateStr,
          startTime: startTime,
          endDate: dateStr,
          endTime: endTime
        });
      }
      setErrors({});
    }
  }, [isOpen, event, initialDate]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.summary.trim()) {
      newErrors.summary = 'Title is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    // Validate end is after start
    if (formData.startDate && formData.startTime && formData.endDate && formData.endTime) {
      const start = new Date(`${formData.startDate}T${formData.startTime}`);
      const end = new Date(`${formData.endDate}T${formData.endTime}`);

      if (end <= start) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      const eventData = {
        summary: formData.summary.trim(),
        description: formData.description.trim(),
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString()
      };

      if (isEditing) {
        eventData.id = event.id;
      }

      await onSubmit(eventData);
      onClose();
    } catch (error) {
      console.error('Error submitting event:', error);
      setErrors({ submit: 'Failed to save event. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Event' : 'Create New Event'}
      size="medium"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="summary" className="block text-sm font-semibold text-gray-700 mb-2">
            Event Title *
          </label>
          <input
            id="summary"
            type="text"
            value={formData.summary}
            onChange={(e) => handleChange('summary', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
              errors.summary ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Team Meeting, Doctor Appointment"
            disabled={isSubmitting}
          />
          {errors.summary && (
            <p className="mt-1 text-sm text-red-600">{errors.summary}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows="3"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            placeholder="Add event details..."
            disabled={isSubmitting}
          />
        </div>

        {/* Start Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-semibold text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.startDate ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="startTime" className="block text-sm font-semibold text-gray-700 mb-2">
              Start Time *
            </label>
            <input
              id="startTime"
              type="time"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.startTime ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.startTime && (
              <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
            )}
          </div>
        </div>

        {/* End Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="endDate" className="block text-sm font-semibold text-gray-700 mb-2">
              End Date *
            </label>
            <input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.endDate ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="endTime" className="block text-sm font-semibold text-gray-700 mb-2">
              End Time *
            </label>
            <input
              id="endTime"
              type="time"
              value={formData.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.endTime ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {errors.endTime && (
              <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>
            )}
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200">
          <div>
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-2 px-6 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-semibold transition-colors"
                disabled={isSubmitting}
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                isEditing ? 'Update Event' : 'Create Event'
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
