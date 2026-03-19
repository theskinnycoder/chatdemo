import { tool } from "ai";
import { z } from "zod";

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export const weatherTool = tool({
  description:
    "Get current weather for a location. Use this when users ask about weather, temperature, or conditions in a city.",
  inputSchema: z.object({
    city: z.string().describe("City name"),
    latitude: z.number().describe("Latitude of the city"),
    longitude: z.number().describe("Longitude of the city"),
  }),
  execute: async ({ latitude, longitude, city }) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&temperature_unit=celsius`;
    const res = await fetch(url);

    if (!res.ok) {
      return { error: `Failed to fetch weather data: ${res.statusText}` };
    }

    const data = await res.json();
    const current = data.current;

    return {
      city,
      temperature: `${current.temperature_2m}°C`,
      condition: WEATHER_CODES[current.weather_code] ?? "Unknown",
      humidity: `${current.relative_humidity_2m}%`,
      windSpeed: `${current.wind_speed_10m} km/h`,
    };
  },
});
