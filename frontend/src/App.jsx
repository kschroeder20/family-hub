import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getCurrentMonthBackground } from './utils/backgrounds';
import CalendarComponent from './components/Calendar';
import Chores from './components/Chores';
import GroceryList from './components/GroceryList';
import Weather from './components/Weather';
import WeatherExpanded from './components/WeatherExpanded';
import { WidgetExpandProvider } from './contexts/WidgetExpandContext';
import ExpandableWidget from './components/ExpandableWidget';

const queryClient = new QueryClient();

// Birthday configuration
const BIRTHDAYS = [
  { month: 1, day: 21, name: 'Clarissa' },
];

function isBirthdayToday() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  return BIRTHDAYS.find(b => b.month === month && b.day === day);
}

// Confetti colors
const CONFETTI_COLORS = ['#ff6b9d', '#ffd93d', '#6bcf7f', '#4dc9ff', '#9d7cff', '#ff9f43', '#ee5a24'];

// Balloon emojis
const BALLOONS = ['🎈', '🎀', '🎁', '🎂', '🎉', '🎊', '💖'];

function Confetti() {
  const pieces = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 8 + Math.random() * 8,
      shape: Math.random() > 0.5 ? 'square' : 'circle',
    }));
  }, []);

  return (
    <>
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            backgroundColor: piece.color,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            borderRadius: piece.shape === 'circle' ? '50%' : '2px',
          }}
        />
      ))}
    </>
  );
}

function Balloons() {
  const balloons = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: 5 + Math.random() * 90,
      delay: Math.random() * 8,
      duration: 10 + Math.random() * 8,
      emoji: BALLOONS[Math.floor(Math.random() * BALLOONS.length)],
    }));
  }, []);

  return (
    <>
      {balloons.map(balloon => (
        <div
          key={balloon.id}
          className="balloon"
          style={{
            left: `${balloon.left}%`,
            animationDelay: `${balloon.delay}s`,
            animationDuration: `${balloon.duration}s`,
          }}
        >
          <span className="balloon-sway inline-block">{balloon.emoji}</span>
        </div>
      ))}
    </>
  );
}

function App() {
  const background = getCurrentMonthBackground();
  const birthday = isBirthdayToday();

  return (
    <QueryClientProvider client={queryClient}>
      <WidgetExpandProvider>
        <div className="h-screen relative overflow-hidden p-2 sm:p-4 lg:p-6 flex flex-col">
          {/* Animated gradient background */}
          <div className="fixed inset-0 -z-20 gradient-accent"></div>
          <div className="fixed inset-0 -z-10 bg-white/40 backdrop-blur-sm"></div>

          {/* Birthday celebrations */}
          {birthday && (
            <>
              <Confetti />
              <Balloons />
            </>
          )}

          <div className="max-w-[1800px] mx-auto relative w-full flex flex-col h-full">
            <header className="mb-2 sm:mb-4 lg:mb-6 flex-shrink-0">
              {birthday ? (
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-center tracking-tight birthday-title">
                  Happy Birthday {birthday.name}!
                </h1>
              ) : (
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white text-center tracking-tight drop-shadow-lg">
                  Schroeder Family Hub
                </h1>
              )}
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
