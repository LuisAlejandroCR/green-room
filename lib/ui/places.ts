// places.ts: names for Qloo heatmap cells. Qloo's heatmap returns geohash cells (lat, lon, affinity) but no place
// names, so Green Room complements it with a small built-in list of large US cities (approximate centre coordinates)
// and labels a cell with the nearest one within 120 km. Nothing here changes Qloo's numbers.
export interface City { name: string; lat: number; lon: number }

export const US_CITIES: City[] = [
  { name: "New York, NY", lat: 40.71, lon: -74.01 }, { name: "Los Angeles, CA", lat: 34.05, lon: -118.24 },
  { name: "Chicago, IL", lat: 41.88, lon: -87.63 }, { name: "Houston, TX", lat: 29.76, lon: -95.37 },
  { name: "Phoenix, AZ", lat: 33.45, lon: -112.07 }, { name: "Philadelphia, PA", lat: 39.95, lon: -75.17 },
  { name: "San Antonio, TX", lat: 29.42, lon: -98.49 }, { name: "San Diego, CA", lat: 32.72, lon: -117.16 },
  { name: "Dallas, TX", lat: 32.78, lon: -96.8 }, { name: "Austin, TX", lat: 30.27, lon: -97.74 },
  { name: "Jacksonville, FL", lat: 30.33, lon: -81.66 }, { name: "San Jose, CA", lat: 37.34, lon: -121.89 },
  { name: "Columbus, OH", lat: 39.96, lon: -83.0 }, { name: "Charlotte, NC", lat: 35.23, lon: -80.84 },
  { name: "Indianapolis, IN", lat: 39.77, lon: -86.16 }, { name: "San Francisco, CA", lat: 37.77, lon: -122.42 },
  { name: "Seattle, WA", lat: 47.61, lon: -122.33 }, { name: "Denver, CO", lat: 39.74, lon: -104.99 },
  { name: "Nashville, TN", lat: 36.16, lon: -86.78 }, { name: "Washington, DC", lat: 38.91, lon: -77.04 },
  { name: "Boston, MA", lat: 42.36, lon: -71.06 }, { name: "Las Vegas, NV", lat: 36.17, lon: -115.14 },
  { name: "Portland, OR", lat: 45.52, lon: -122.68 }, { name: "Detroit, MI", lat: 42.33, lon: -83.05 },
  { name: "Memphis, TN", lat: 35.15, lon: -90.05 }, { name: "Louisville, KY", lat: 38.25, lon: -85.76 },
  { name: "Baltimore, MD", lat: 39.29, lon: -76.61 }, { name: "Milwaukee, WI", lat: 43.04, lon: -87.91 },
  { name: "Albuquerque, NM", lat: 35.08, lon: -106.65 }, { name: "Tucson, AZ", lat: 32.22, lon: -110.97 },
  { name: "Sacramento, CA", lat: 38.58, lon: -121.49 }, { name: "Kansas City, MO", lat: 39.1, lon: -94.58 },
  { name: "Atlanta, GA", lat: 33.75, lon: -84.39 }, { name: "Miami, FL", lat: 25.76, lon: -80.19 },
  { name: "Raleigh, NC", lat: 35.78, lon: -78.64 }, { name: "Omaha, NE", lat: 41.26, lon: -95.93 },
  { name: "Minneapolis, MN", lat: 44.98, lon: -93.27 }, { name: "Tampa, FL", lat: 27.95, lon: -82.46 },
  { name: "New Orleans, LA", lat: 29.95, lon: -90.07 }, { name: "Cleveland, OH", lat: 41.5, lon: -81.69 },
  { name: "Pittsburgh, PA", lat: 40.44, lon: -79.99 }, { name: "St. Louis, MO", lat: 38.63, lon: -90.2 },
  { name: "Cincinnati, OH", lat: 39.1, lon: -84.51 }, { name: "Orlando, FL", lat: 28.54, lon: -81.38 },
  { name: "Salt Lake City, UT", lat: 40.76, lon: -111.89 }, { name: "Boise, ID", lat: 43.62, lon: -116.2 },
  { name: "Oklahoma City, OK", lat: 35.47, lon: -97.52 }, { name: "Richmond, VA", lat: 37.54, lon: -77.44 },
  { name: "Buffalo, NY", lat: 42.89, lon: -78.88 }, { name: "Spokane, WA", lat: 47.66, lon: -117.43 },
  { name: "Madison, WI", lat: 43.07, lon: -89.4 }, { name: "Birmingham, AL", lat: 33.52, lon: -86.8 },
  { name: "Charleston, SC", lat: 32.78, lon: -79.93 }, { name: "Des Moines, IA", lat: 41.59, lon: -93.62 },
  { name: "Burlington, VT", lat: 44.48, lon: -73.21 }, { name: "Portland, ME", lat: 43.66, lon: -70.26 },
  { name: "El Paso, TX", lat: 31.76, lon: -106.49 }, { name: "Fresno, CA", lat: 36.74, lon: -119.79 },
  { name: "Asheville, NC", lat: 35.6, lon: -82.55 }, { name: "Santa Fe, NM", lat: 35.69, lon: -105.94 },
];

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

/** The nearest listed city within `maxKm`, or null (a rural cell stays unnamed rather than mislabelled). */
export function nearestCity(p: { lat: number; lon: number }, maxKm = 120): City | null {
  let best: City | null = null;
  let bestKm = Infinity;
  for (const c of US_CITIES) {
    const d = distanceKm(p, c);
    if (d < bestKm) { best = c; bestKm = d; }
  }
  return bestKm <= maxKm ? best : null;
}

/** Cities near the most cells in `cells` (e.g. the top tenth by affinity), most cells first. */
export function topAreas(cells: { lat: number; lon: number }[], limit = 6): { city: City; cells: number }[] {
  const counts = new Map<string, { city: City; cells: number }>();
  for (const c of cells) {
    const city = nearestCity(c);
    if (!city) continue;
    const e = counts.get(city.name) ?? { city, cells: 0 };
    e.cells += 1;
    counts.set(city.name, e);
  }
  return [...counts.values()].sort((a, b) => b.cells - a.cells || a.city.name.localeCompare(b.city.name)).slice(0, limit);
}
