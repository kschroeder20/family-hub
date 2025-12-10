import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCurrentMonthBackground } from './utils/backgrounds';
import CalendarComponent from './components/Calendar';
import Chores from './components/Chores';
import GroceryList from './components/GroceryList';

const queryClient = new QueryClient();

function App() {
  const background = getCurrentMonthBackground();

  return (
    <QueryClientProvider client={queryClient}>
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

          <div className="flex-1 flex flex-col gap-3 sm:gap-4 overflow-hidden">
            {/* Calendar - Full width on top */}
            <div className="w-full flex-1 min-h-0 lg:flex-[0_0_55%]">
              <CalendarComponent />
            </div>

            {/* Chores and Grocery List underneath - side by side on wide screens, stacked on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0 lg:flex-[0_0_40%]">
              <div className="min-h-0 overflow-auto">
                <Chores />
              </div>
              <div className="min-h-0 overflow-auto">
                <GroceryList />
              </div>
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
