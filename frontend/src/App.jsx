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
      <div className="min-h-screen relative overflow-hidden p-6">
        {/* Animated gradient background */}
        <div className="fixed inset-0 -z-20 gradient-accent"></div>
        <div className="fixed inset-0 -z-10 bg-white/40 backdrop-blur-sm"></div>

        <div className="max-w-[1800px] mx-auto relative">
          <header className="mb-8">
            <h1 className="text-5xl font-bold text-[#0a2540] text-center tracking-tight">
              Family Hub
            </h1>
            <p className="text-center text-[#727f96] mt-2 font-light text-lg">
              Organize your family's schedule, chores, and shopping
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
            {/* Calendar - Takes up 2/3 of the width */}
            <div className="lg:col-span-2">
              <CalendarComponent />
            </div>

            {/* Right sidebar - Chores and Grocery List stacked */}
            <div className="flex flex-col gap-6">
              <div className="flex-1">
                <Chores />
              </div>
              <div className="flex-1">
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
