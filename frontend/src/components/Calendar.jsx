import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { syncGoogleCalendar } from '../services/api';

export default function CalendarComponent() {
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);

  // Fetch Google Calendar events
  const { data: googleCalendarData, isLoading, isError, error } = useQuery({
    queryKey: ['googleCalendar'],
    queryFn: async () => {
      const response = await syncGoogleCalendar();
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Update events when Google Calendar data changes
  useEffect(() => {
    if (googleCalendarData?.success && googleCalendarData?.events) {
      const formattedEvents = googleCalendarData.events.map(event => ({
        id: event.id,
        title: event.summary,
        start: event.start,
        end: event.end,
        backgroundColor: '#635bff',
        extendedProps: {
          description: event.description,
        },
      }));
      setEvents(formattedEvents);
    }
  }, [googleCalendarData]);

  const handleEventClick = (clickInfo) => {
    // Display event details (read-only)
    alert(`Event: ${clickInfo.event.title}\nStart: ${clickInfo.event.start?.toLocaleString() || 'N/A'}\nEnd: ${clickInfo.event.end?.toLocaleString() || 'N/A'}`);
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#e3e8ee] p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-[#0a2540]">Family Calendar</h2>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="text-xs text-[#727f96]">Loading events...</span>
          )}
          {isError && (
            <span className="text-xs text-red-500" title={error?.message}>
              {googleCalendarData?.needs_auth ? 'Auth needed' : 'Sync error'}
            </span>
          )}
          {!isLoading && !isError && googleCalendarData?.success && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-600 rounded-full"></span>
              Synced
            </span>
          )}
          <span className="text-sm text-[#727f96] font-medium">Google Calendar</span>
        </div>
      </div>

      <div className="flex-1 calendar-wrapper">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek',
          }}
          events={events}
          eventClick={handleEventClick}
          editable={false}
          selectable={false}
          dayMaxEvents={true}
          weekends={true}
          height="100%"
        />
      </div>

      <style jsx global>{`
        .calendar-wrapper .fc {
          font-family: 'Inter', sans-serif;
        }

        .calendar-wrapper .fc-theme-standard .fc-scrollgrid {
          border: none;
        }

        .calendar-wrapper .fc .fc-toolbar.fc-header-toolbar {
          margin-bottom: 1.5rem;
        }

        .calendar-wrapper .fc .fc-button {
          background-color: #f6f9fc;
          border: 1px solid #e3e8ee;
          color: #0a2540;
          font-weight: 500;
          padding: 0.5rem 1rem;
          transition: all 0.2s;
        }

        .calendar-wrapper .fc .fc-button:hover {
          background-color: #e3e8ee;
          border-color: #d1d9e0;
        }

        .calendar-wrapper .fc .fc-button-primary:not(:disabled):active,
        .calendar-wrapper .fc .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #635bff;
          border-color: #635bff;
          color: white;
        }

        .calendar-wrapper .fc .fc-toolbar-title {
          color: #0a2540;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .calendar-wrapper .fc-theme-standard td,
        .calendar-wrapper .fc-theme-standard th {
          border-color: #e3e8ee;
        }

        .calendar-wrapper .fc .fc-col-header-cell {
          background-color: #f6f9fc;
          color: #727f96;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          padding: 0.75rem;
        }

        .calendar-wrapper .fc .fc-daygrid-day {
          background-color: white;
          transition: background-color 0.2s;
        }

        .calendar-wrapper .fc .fc-daygrid-day:hover {
          background-color: #f6f9fc;
        }

        .calendar-wrapper .fc .fc-daygrid-day-number {
          color: #0a2540;
          padding: 0.5rem;
          font-weight: 500;
        }

        .calendar-wrapper .fc .fc-daygrid-day.fc-day-today {
          background-color: rgba(99, 91, 255, 0.05) !important;
        }

        .calendar-wrapper .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
          color: #635bff;
          font-weight: 700;
        }

        .calendar-wrapper .fc .fc-event {
          border: none;
          border-radius: 0.375rem;
          padding: 0.25rem 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .calendar-wrapper .fc .fc-event:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .calendar-wrapper .fc .fc-daygrid-day-top {
          flex-direction: row;
        }

        .calendar-wrapper .fc .fc-list {
          border: none;
        }

        .calendar-wrapper .fc-list-event:hover td {
          background-color: #f6f9fc;
        }

        .calendar-wrapper .fc-list-day-cushion {
          background-color: #f6f9fc;
          color: #727f96;
        }

        .calendar-wrapper .fc-list-event td {
          background-color: white;
          border-color: #e3e8ee;
          color: #0a2540;
        }
      `}</style>
    </div>
  );
}
