import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCurrentMonthBackground } from './utils/backgrounds';
import CalendarComponent from './components/Calendar';
import Chores from './components/Chores';
import GroceryList from './components/GroceryList';
import Weather from './components/Weather';
import WeatherExpanded from './components/WeatherExpanded';
import { WidgetExpandProvider } from './contexts/WidgetExpandContext';
import ExpandableWidget from './components/ExpandableWidget';

const queryClient = new QueryClient();

function App() {
  const background = getCurrentMonthBackground();

  return (
    <QueryClientProvider client={queryClient}>
      <WidgetExpandProvider>
        <div className="h-screen relative overflow-hidden p-2 sm:p-4 lg:p-6 flex flex-col">
          {/* Animated gradient background */}
          <div className="fixed inset-0 -z-20 gradient-accent"></div>
          <div className="fixed inset-0 -z-10 bg-white/40 backdrop-blur-sm"></div>

          <div className="max-w-[1800px] mx-auto relative w-full flex flex-col h-full">
            <header className="mb-2 sm:mb-4 lg:mb-6 flex-shrink-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white text-center tracking-tight drop-shadow-lg">
                Schroeder Family Hub
              </h1>
            </header>

            <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 overflow-auto lg:overflow-hidden">
              {/* Calendar - 75% width on desktop, full width on mobile */}
              <div className="w-full lg:w-[75%] lg:flex-1 lg:min-h-0">
                <CalendarComponent />
              </div>

              {/* Weather, Chores and Grocery List stacked on right side - 25% width on desktop */}
              <div className="w-full lg:w-[25%] flex flex-col gap-3 sm:gap-4 lg:min-h-0">
                <ExpandableWidget id="weather" className="flex-shrink-0" expandedContent={<WeatherExpanded />}>
                  <Weather />
                </ExpandableWidget>
                <ExpandableWidget id="chores" className="lg:flex-1 lg:min-h-0 lg:overflow-auto">
                  <Chores />
                </ExpandableWidget>
                <ExpandableWidget id="grocery" className="lg:flex-1 lg:min-h-0 lg:overflow-auto">
                  <GroceryList />
                </ExpandableWidget>
              </div>
            </div>
          </div>
        </div>
      </WidgetExpandProvider>
    </QueryClientProvider>
  );
}

export default App;
