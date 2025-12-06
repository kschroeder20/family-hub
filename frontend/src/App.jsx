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
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0a2540] text-center tracking-tight">
              Family Hub
            </h1>
            <p className="text-center text-[#727f96] mt-2 font-light text-sm sm:text-base md:text-lg">
              Organize your family's schedule, chores, and shopping
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-h-[calc(100vh-140px)] sm:min-h-[calc(100vh-180px)]">
            {/* Calendar - Takes up 2/3 of the width on desktop, full width on mobile */}
            <div className="lg:col-span-2 min-h-[500px] sm:min-h-[600px]">
              <CalendarComponent />
            </div>

            {/* Right sidebar - Chores and Grocery List stacked */}
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex-1 min-h-[300px]">
                <Chores />
              </div>
              <div className="flex-1 min-h-[300px]">
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
