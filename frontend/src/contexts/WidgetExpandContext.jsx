import { createContext, useContext, useState } from 'react';

const WidgetExpandContext = createContext();

export function useWidgetExpand() {
  const context = useContext(WidgetExpandContext);
  if (!context) {
    throw new Error('useWidgetExpand must be used within a WidgetExpandProvider');
  }
  return context;
}

export function WidgetExpandProvider({ children }) {
  const [expandedWidget, setExpandedWidget] = useState(null);

  const expandWidget = (widgetId) => {
    setExpandedWidget(widgetId);
  };

  const collapseWidget = () => {
    setExpandedWidget(null);
  };

  return (
    <WidgetExpandContext.Provider
      value={{
        expandedWidget,
        expandWidget,
        collapseWidget,
        isExpanded: (widgetId) => expandedWidget === widgetId,
      }}
    >
      {children}
    </WidgetExpandContext.Provider>
  );
}
