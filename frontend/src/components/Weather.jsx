import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function Weather() {
  const ZIP_CODE = '60004';
  const COUNTRY_CODE = 'US';
  const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '0add46028dbeda42f789114aeeaeb091';

  // First, get the coordinates from zip code
  const { data: geoData } = useQuery({
    queryKey: ['geo', ZIP_CODE],
    queryFn: async () => {
      const response = await axios.get(
        `https://api.openweathermap.org/geo/1.0/zip?zip=${ZIP_CODE},${COUNTRY_CODE}&appid=${API_KEY}`
      );
      return response.data;
    },
    retry: 1,
    staleTime: 86400000, // Cache for 24 hours
  });

  // Then get current weather
  const { data: weatherData, isLoading, isError } = useQuery({
    queryKey: ['weather', ZIP_CODE],
    queryFn: async () => {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?zip=${ZIP_CODE},${COUNTRY_CODE}&appid=${API_KEY}&units=imperial`
      );
      return response.data;
    },
    refetchInterval: 600000, // Refetch every 10 minutes
    retry: 1,
  });

  // Get daily forecast for high/low temps
  const { data: forecastData } = useQuery({
    queryKey: ['forecast', geoData?.lat, geoData?.lon],
    queryFn: async () => {
      if (!geoData?.lat || !geoData?.lon) return null;
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${geoData.lat}&lon=${geoData.lon}&appid=${API_KEY}&units=imperial`
      );
      return response.data;
    },
    enabled: !!geoData?.lat && !!geoData?.lon,
    refetchInterval: 600000, // Refetch every 10 minutes
    retry: 1,
  });

  const getWeatherStyle = (weatherMain, weatherId) => {
    // weatherMain: Clear, Clouds, Rain, Drizzle, Thunderstorm, Snow, Mist, etc.
    // weatherId: more specific weather condition code

    switch (weatherMain?.toLowerCase()) {
      case 'clear':
        return {
          background: 'linear-gradient(135deg, #FFD93D 0%, #FFA62E 100%)',
          icon: '☀️',
          animation: 'sunny'
        };
      case 'clouds':
        return {
          background: 'linear-gradient(135deg, #B8C6DB 0%, #C0D5E8 100%)',
          icon: '☁️',
          animation: 'cloudy'
        };
      case 'rain':
        return {
          background: 'linear-gradient(135deg, #4B79A1 0%, #283E51 100%)',
          icon: '🌧️',
          animation: 'rainy'
        };
      case 'drizzle':
        return {
          background: 'linear-gradient(135deg, #5C7FA3 0%, #4A6278 100%)',
          icon: '🌦️',
          animation: 'rainy'
        };
      case 'thunderstorm':
        return {
          background: 'linear-gradient(135deg, #2C3E50 0%, #34495E 100%)',
          icon: '⛈️',
          animation: 'stormy'
        };
      case 'snow':
        return {
          background: 'linear-gradient(135deg, #E6F4F1 0%, #B8D5E8 100%)',
          icon: '❄️',
          animation: 'snowy'
        };
      case 'mist':
      case 'fog':
      case 'haze':
        return {
          background: 'linear-gradient(135deg, #D7DDE8 0%, #B8BEC9 100%)',
          icon: '🌫️',
          animation: 'foggy'
        };
      default:
        return {
          background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
          icon: '🌤️',
          animation: 'default'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#e3e8ee] p-3 flex-shrink-0">
        <div className="text-center">
          <p className="text-xs text-[#727f96]">Loading weather...</p>
        </div>
      </div>
    );
  }

  if (isError || !weatherData) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#e3e8ee] p-3 flex-shrink-0">
        <div className="text-center">
          <p className="text-xs text-red-500">Unable to load weather</p>
        </div>
      </div>
    );
  }

  const temp = Math.round(weatherData.main.temp);
  const feelsLike = Math.round(weatherData.main.feels_like);
  const description = weatherData.weather[0]?.description || '';
  const weatherMain = weatherData.weather[0]?.main || '';
  const weatherId = weatherData.weather[0]?.id || 0;
  const weatherIcon = weatherData.weather[0]?.icon || '01d';
  const location = weatherData.name || 'Your Area';

  // Calculate today's high and low from forecast data
  let todayHigh = null;
  let todayLow = null;
  let feelsLikeHigh = null;
  let feelsLikeLow = null;

  if (forecastData?.list) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter forecast entries for today
    const todayForecasts = forecastData.list.filter(item => {
      const forecastDate = new Date(item.dt * 1000);
      return forecastDate >= today && forecastDate < tomorrow;
    });

    if (todayForecasts.length > 0) {
      const temps = todayForecasts.map(item => item.main.temp);
      const feelsLikeTemps = todayForecasts.map(item => item.main.feels_like);

      todayHigh = Math.round(Math.max(...temps));
      todayLow = Math.round(Math.min(...temps));
      feelsLikeHigh = Math.round(Math.max(...feelsLikeTemps));
      feelsLikeLow = Math.round(Math.min(...feelsLikeTemps));
    }
  }

  const style = getWeatherStyle(weatherMain, weatherId);

  return (
    <div
      className="rounded-2xl shadow-lg border border-white/20 p-3 flex-shrink-0 relative overflow-hidden"
      style={{ background: style.background }}
    >
      {/* Animated background effects */}
      {style.animation === 'rainy' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-4 bg-white/30 rounded-full animate-rain"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`
              }}
            />
          ))}
        </div>
      )}

      {style.animation === 'snowy' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-white rounded-full animate-snow"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img
            src={`https://openweathermap.org/img/wn/${weatherIcon}@2x.png`}
            alt={description}
            className="w-12 h-12 drop-shadow-md"
          />
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white drop-shadow-md">{temp}°</span>
            </div>
            <p className="text-[10px] text-white/90 capitalize">{description}</p>
            {todayHigh !== null && todayLow !== null && (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[9px] text-white/80">
                  H: {todayHigh}°
                </p>
                <p className="text-[9px] text-white/80">
                  L: {todayLow}°
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-[9px] text-white/80 uppercase tracking-wide">Feels</p>
          <p className="text-xl font-bold text-white drop-shadow-md">{feelsLike}°</p>
          {feelsLikeHigh !== null && feelsLikeLow !== null && (
            <div className="flex items-center gap-2 mt-0.5 justify-end">
              <p className="text-[9px] text-white/80">
                H: {feelsLikeHigh}°
              </p>
              <p className="text-[9px] text-white/80">
                L: {feelsLikeLow}°
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes rain {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(400%);
            opacity: 0.3;
          }
        }

        @keyframes snow {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(400%) rotate(360deg);
            opacity: 0;
          }
        }

        .animate-rain {
          animation: rain linear infinite;
        }

        .animate-snow {
          animation: snow linear infinite;
        }
      `}</style>
    </div>
  );
}
