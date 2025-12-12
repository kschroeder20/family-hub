import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format, fromUnixTime } from 'date-fns';

export default function WeatherExpanded() {
  const ZIP_CODE = '60004';
  const COUNTRY_CODE = 'US';
  const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '0add46028dbeda42f789114aeeaeb091';

  // Get coordinates from zip code
  const { data: geoData } = useQuery({
    queryKey: ['geo', ZIP_CODE],
    queryFn: async () => {
      const response = await axios.get(
        `https://api.openweathermap.org/geo/1.0/zip?zip=${ZIP_CODE},${COUNTRY_CODE}&appid=${API_KEY}`
      );
      return response.data;
    },
    retry: 1,
    staleTime: 86400000,
  });

  // Get current weather
  const { data: weatherData, isLoading: isWeatherLoading } = useQuery({
    queryKey: ['weather', ZIP_CODE],
    queryFn: async () => {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?zip=${ZIP_CODE},${COUNTRY_CODE}&appid=${API_KEY}&units=imperial`
      );
      return response.data;
    },
    refetchInterval: 600000,
    retry: 1,
  });

  // Get 5-day forecast (3-hour intervals)
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
    refetchInterval: 600000,
    retry: 1,
  });

  // Get 8-day daily forecast (One Call API alternative - using free tier)
  const { data: dailyForecast, isLoading: isDailyLoading } = useQuery({
    queryKey: ['dailyForecast', geoData?.lat, geoData?.lon],
    queryFn: async () => {
      if (!geoData?.lat || !geoData?.lon) return null;
      // Using the 5-day forecast, we'll aggregate by day
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${geoData.lat}&lon=${geoData.lon}&appid=${API_KEY}&units=imperial&cnt=40`
      );

      // Group by day and calculate daily high/low
      const dailyData = {};
      response.data.list.forEach(item => {
        const date = format(fromUnixTime(item.dt), 'yyyy-MM-dd');
        if (!dailyData[date]) {
          dailyData[date] = {
            date: item.dt,
            temps: [],
            conditions: [],
            icons: [],
            descriptions: []
          };
        }
        dailyData[date].temps.push(item.main.temp);
        dailyData[date].conditions.push(item.weather[0].main);
        dailyData[date].icons.push(item.weather[0].icon);
        dailyData[date].descriptions.push(item.weather[0].description);
      });

      // Convert to array and calculate stats
      return Object.values(dailyData).map(day => ({
        dt: day.date,
        temp_max: Math.round(Math.max(...day.temps)),
        temp_min: Math.round(Math.min(...day.temps)),
        weather: [{
          main: day.conditions[Math.floor(day.conditions.length / 2)],
          icon: day.icons[Math.floor(day.icons.length / 2)],
          description: day.descriptions[Math.floor(day.descriptions.length / 2)]
        }]
      })).slice(0, 5); // Only return 5 days
    },
    enabled: !!geoData?.lat && !!geoData?.lon,
    refetchInterval: 600000,
    retry: 1,
  });

  if (isWeatherLoading || isDailyLoading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#e3e8ee] p-6">
        <div className="text-center">
          <p className="text-gray-600">Loading weather data...</p>
        </div>
      </div>
    );
  }

  if (!weatherData || !dailyForecast) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#e3e8ee] p-6">
        <div className="text-center">
          <p className="text-red-500">Unable to load weather data</p>
        </div>
      </div>
    );
  }

  const currentTemp = Math.round(weatherData.main.temp);
  const feelsLike = Math.round(weatherData.main.feels_like);
  const description = weatherData.weather[0]?.description || '';
  const weatherIcon = weatherData.weather[0]?.icon || '01d';
  const location = weatherData.name || 'Your Area';
  const humidity = weatherData.main.humidity;
  const windSpeed = Math.round(weatherData.wind.speed);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-2xl border border-blue-200 p-6 max-h-[90vh] overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Current Weather Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">{location} Weather</h2>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={`https://openweathermap.org/img/wn/${weatherIcon}@4x.png`}
                  alt={description}
                  className="w-24 h-24"
                />
                <div>
                  <p className="text-5xl font-bold text-gray-800">{currentTemp}°F</p>
                  <p className="text-lg text-gray-600 capitalize mt-1">{description}</p>
                </div>
              </div>

              <div className="text-right space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Feels Like</p>
                  <p className="text-2xl font-semibold text-gray-700">{feelsLike}°F</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Humidity</p>
                  <p className="text-lg font-medium text-gray-700">{humidity}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Wind</p>
                  <p className="text-lg font-medium text-gray-700">{windSpeed} mph</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Day Forecast */}
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">5-Day Forecast</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {dailyForecast.map((day, index) => (
              <div
                key={day.dt}
                className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
              >
                <p className="text-center font-semibold text-gray-700 mb-2">
                  {index === 0 ? 'Today' : format(fromUnixTime(day.dt), 'EEE')}
                </p>
                <p className="text-center text-sm text-gray-500 mb-3">
                  {format(fromUnixTime(day.dt), 'MMM d')}
                </p>
                <div className="flex justify-center mb-3">
                  <img
                    src={`https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`}
                    alt={day.weather[0].description}
                    className="w-16 h-16"
                  />
                </div>
                <p className="text-center text-xs text-gray-600 capitalize mb-3">
                  {day.weather[0].description}
                </p>
                <div className="flex justify-center gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">High</p>
                    <p className="text-lg font-bold text-red-600">{day.temp_max}°</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Low</p>
                    <p className="text-lg font-bold text-blue-600">{day.temp_min}°</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
