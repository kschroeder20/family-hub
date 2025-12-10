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
  const [todaysEvents, setTodaysEvents] = useState([]);

  // Fetch Google Calendar events
  const { data: googleCalendarData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['googleCalendar'],
    queryFn: async () => {
      try {
        const response = await syncGoogleCalendar();
        return response.data;
      } catch (err) {
        // If it's a 401 error with auth details, return the error data
        if (err.response?.status === 401 && err.response?.data) {
          return err.response.data;
        }
        throw err;
      }
    },
    refetchInterval: 60000, // Refetch every minute
    retry: false, // Don't retry if auth is needed
  });

  const handleAuthorize = () => {
    if (googleCalendarData?.authorization_url) {
      window.open(googleCalendarData.authorization_url, '_blank', 'width=600,height=700');
      // Refetch after a few seconds to check if auth was successful
      setTimeout(() => refetch(), 5000);
    }
  };

  // Google Calendar color mapping
  const getEventColor = (colorId) => {
    // Google Calendar color IDs to hex colors
    const colorMap = {
      '1': '#7986CB', // Lavender
      '2': '#33B679', // Sage
      '3': '#8E24AA', // Grape
      '4': '#E67C73', // Flamingo
      '5': '#F6BF26', // Banana
      '6': '#F4511E', // Tangerine
      '7': '#039BE5', // Peacock
      '8': '#616161', // Graphite
      '9': '#3F51B5', // Blueberry
      '10': '#0B8043', // Basil
      '11': '#D50000', // Tomato
    };

    return colorMap[colorId] || '#635bff'; // Default to our purple if no color
  };

  // Update events when Google Calendar data changes
  useEffect(() => {
    if (googleCalendarData?.success && googleCalendarData?.events) {
      const formattedEvents = googleCalendarData.events.map(event => ({
        id: event.id,
        title: event.summary,
        start: event.start,
        end: event.end,
        backgroundColor: getEventColor(event.color_id),
        borderColor: getEventColor(event.color_id),
        extendedProps: {
          description: event.description,
          colorId: event.color_id,
        },
      }));
      setEvents(formattedEvents);

      // Filter today's events
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const eventsToday = formattedEvents.filter(event => {
        const eventStart = new Date(event.start);
        return eventStart >= today && eventStart < tomorrow;
      }).sort((a, b) => new Date(a.start) - new Date(b.start));

      setTodaysEvents(eventsToday);
    }
  }, [googleCalendarData]);

  const handleEventClick = (clickInfo) => {
    // Display event details (read-only)
    alert(`Event: ${clickInfo.event.title}\nStart: ${clickInfo.event.start?.toLocaleString() || 'N/A'}\nEnd: ${clickInfo.event.end?.toLocaleString() || 'N/A'}`);
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#e3e8ee] p-3 md:p-4 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="text-xs text-[#727f96]">Loading events...</span>
          ) : googleCalendarData?.needs_auth && googleCalendarData?.authorization_url ? (
            <button
              onClick={handleAuthorize}
              className="text-xs font-medium text-[#635bff] hover:text-[#4f46e5] underline decoration-dotted underline-offset-2 transition-colors duration-200"
              title="Click to authorize Google Calendar access"
            >
              Authorize Google Calendar
            </button>
          ) : googleCalendarData?.success ? (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-600 rounded-full"></span>
              Synced
            </span>
          ) : isError ? (
            <span className="text-xs text-red-500" title={error?.message}>
              Sync error
            </span>
          ) : null}
          <span className="text-sm text-[#727f96] font-medium">Google Calendar</span>
        </div>
      </div>

      <div className="flex-1 calendar-wrapper overflow-auto min-h-0">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: 'today',
          }}
          footerToolbar={{
            center: 'dayGridMonth,timeGridWeek,listWeek',
          }}
          events={events}
          eventClick={handleEventClick}
          editable={false}
          selectable={false}
          dayMaxEvents={true}
          weekends={true}
          height="100%"
          contentHeight="auto"
          aspectRatio={1.8}
          handleWindowResize={true}
          windowResizeDelay={100}
        />
      </div>

      {/* Today's Events Section */}
      <div className="mt-3 pt-3 border-t border-[#e3e8ee] flex-shrink-0">
        <h2 className="text-sm font-semibold text-[#0a2540] mb-2 flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-[#635bff] rounded-full"></span>
          Today's Events
        </h2>
        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {todaysEvents.length === 0 ? (
            <p className="text-sm text-[#727f96] italic">No events scheduled for today</p>
          ) : (
            todaysEvents.map(event => {
              const startTime = new Date(event.start).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
              const endTime = event.end ? new Date(event.end).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }) : null;

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-2 p-2 bg-white rounded-lg border border-[#e3e8ee] hover:border-[#635bff] hover:shadow-sm transition-all duration-200 cursor-pointer"
                  onClick={() => handleEventClick({ event: { title: event.title, start: new Date(event.start), end: event.end ? new Date(event.end) : null } })}
                >
                  <div className="flex-shrink-0 w-14 text-center">
                    <div className="text-xs font-semibold text-[#635bff]">{startTime}</div>
                    {endTime && <div className="text-[10px] text-[#727f96]">{endTime}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-medium text-[#0a2540] truncate">{event.title}</h3>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style jsx global>{`
        .calendar-wrapper .fc {
          font-family: 'Inter', sans-serif;
        }

        .calendar-wrapper .fc-theme-standard .fc-scrollgrid {
          border: none;
        }

        .calendar-wrapper .fc .fc-toolbar.fc-header-toolbar {
          margin-bottom: 1rem;
        }

        .calendar-wrapper .fc .fc-toolbar.fc-footer-toolbar {
          margin-top: 1rem;
        }

        .calendar-wrapper .fc .fc-button {
          background-color: #f6f9fc;
          border: 1px solid #e3e8ee;
          color: #0a2540;
          font-weight: 500;
          padding: 0.5rem 1rem;
          transition: all 0.2s;
        }

        /* Mobile responsive styles */
        @media (max-width: 640px) {
          .calendar-wrapper .fc .fc-toolbar.fc-header-toolbar {
            flex-direction: column;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
          }

          .calendar-wrapper .fc .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
          }

          .calendar-wrapper .fc .fc-toolbar-title {
            font-size: 1.125rem !important;
          }

          .calendar-wrapper .fc .fc-button {
            padding: 0.375rem 0.75rem;
            font-size: 0.875rem;
          }

          .calendar-wrapper .fc .fc-col-header-cell {
            font-size: 0.65rem;
            padding: 0.5rem 0.25rem;
          }

          .calendar-wrapper .fc .fc-daygrid-day-number {
            font-size: 0.875rem;
            padding: 0.25rem;
          }

          .calendar-wrapper .fc .fc-event {
            font-size: 0.75rem;
            padding: 0.125rem 0.25rem;
          }

          .calendar-wrapper .fc .fc-daygrid-event-harness {
            margin-top: 1px;
          }
        }

        @media (max-width: 480px) {
          .calendar-wrapper .fc .fc-toolbar-title {
            font-size: 1rem !important;
          }

          .calendar-wrapper .fc .fc-button {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }

          .calendar-wrapper .fc .fc-col-header-cell-cushion {
            padding: 0.25rem 0;
          }
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
          font-size: 1.25rem;
          font-weight: 600;
        }

        /* Responsive title sizes for larger screens */
        @media (min-width: 768px) {
          .calendar-wrapper .fc .fc-toolbar-title {
            font-size: 1.5rem;
          }
        }

        @media (min-width: 1024px) {
          .calendar-wrapper .fc .fc-toolbar-title {
            font-size: 1.75rem;
          }
        }

        @media (min-width: 1536px) {
          .calendar-wrapper .fc .fc-toolbar-title {
            font-size: 2rem;
          }
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
