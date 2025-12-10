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
      <div className="min-h-screen relative overflow-hidden p-3 sm:p-6">
        {/* Animated gradient background */}
        <div className="fixed inset-0 -z-20 gradient-accent"></div>
        <div className="fixed inset-0 -z-10 bg-white/40 backdrop-blur-sm"></div>

        <div className="max-w-[1800px] mx-auto relative">
          <header className="mb-4 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white text-center tracking-tight drop-shadow-lg">
              Schroeder Family Hub
            </h1>
          </header>

          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Calendar - Full width on top */}
            <div className="w-full min-h-[500px] sm:min-h-[600px]">
              <CalendarComponent />
            </div>

            {/* Chores and Grocery List underneath - side by side on wide screens, stacked on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="min-h-[300px]">
                <Chores />
              </div>
              <div className="min-h-[300px]">
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
