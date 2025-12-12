import { useWidgetExpand } from '../contexts/WidgetExpandContext';
import ExpandedWidgetOverlay from './ExpandedWidgetOverlay';

export default function ExpandableWidget({ id, children, expandedContent, className = '' }) {
  const { expandWidget, isExpanded } = useWidgetExpand();

  const handleClick = (e) => {
    // Only expand if clicking directly on the widget container or non-interactive elements
    // Don't expand if clicking on buttons, links, inputs, or other interactive elements
    const target = e.target;
    const isInteractive =
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('[role="button"]') ||
      target.closest('.fc-event') || // FullCalendar events
      target.closest('.fc-daygrid-day'); // FullCalendar date cells

    if (!isInteractive) {
      expandWidget(id);
    }
  };

  return (
    <>
      {/* Normal widget view - clickable to expand */}
      <div
        onClick={handleClick}
        className={`cursor-pointer ${className}`}
      >
        {children}
      </div>

      {/* Expanded overlay view */}
      {isExpanded(id) && (
        <ExpandedWidgetOverlay>
          {expandedContent || children}
        </ExpandedWidgetOverlay>
      )}
    </>
  );
}
