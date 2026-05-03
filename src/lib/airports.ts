// Minimal IATA airport → IANA timezone map for popular airports.
// Falls back to UTC. Extend as needed.
export const AIRPORT_TZ: Record<string, { tz: string; city: string }> = {
  BLR: { tz: "Asia/Kolkata", city: "Bengaluru" },
  COK: { tz: "Asia/Kolkata", city: "Kochi" },
  DEL: { tz: "Asia/Kolkata", city: "Delhi" },
  BOM: { tz: "Asia/Kolkata", city: "Mumbai" },
  HYD: { tz: "Asia/Kolkata", city: "Hyderabad" },
  MAA: { tz: "Asia/Kolkata", city: "Chennai" },
  CCU: { tz: "Asia/Kolkata", city: "Kolkata" },
  GOI: { tz: "Asia/Kolkata", city: "Goa" },
  DXB: { tz: "Asia/Dubai", city: "Dubai" },
  AUH: { tz: "Asia/Dubai", city: "Abu Dhabi" },
  SHJ: { tz: "Asia/Dubai", city: "Sharjah" },
  RKT: { tz: "Asia/Dubai", city: "Ras Al Khaimah" },
  DWC: { tz: "Asia/Dubai", city: "Dubai" },
  MCT: { tz: "Asia/Muscat", city: "Muscat" },
  BAH: { tz: "Asia/Bahrain", city: "Bahrain" },
  KWI: { tz: "Asia/Kuwait", city: "Kuwait" },
  RUH: { tz: "Asia/Riyadh", city: "Riyadh" },
  JED: { tz: "Asia/Riyadh", city: "Jeddah" },
  DMM: { tz: "Asia/Riyadh", city: "Dammam" },
  DOH: { tz: "Asia/Qatar", city: "Doha" },
  TLV: { tz: "Asia/Jerusalem", city: "Tel Aviv" },
  CAI: { tz: "Africa/Cairo", city: "Cairo" },
  AMM: { tz: "Asia/Amman", city: "Amman" },
  BEY: { tz: "Asia/Beirut", city: "Beirut" },
  KTM: { tz: "Asia/Kathmandu", city: "Kathmandu" },
  CMB: { tz: "Asia/Colombo", city: "Colombo" },
  DAC: { tz: "Asia/Dhaka", city: "Dhaka" },
  MLE: { tz: "Indian/Maldives", city: "Malé" },
  TRV: { tz: "Asia/Kolkata", city: "Thiruvananthapuram" },
  CNN: { tz: "Asia/Kolkata", city: "Kannur" },
  CCJ: { tz: "Asia/Kolkata", city: "Kozhikode" },
  IXM: { tz: "Asia/Kolkata", city: "Madurai" },
  PNQ: { tz: "Asia/Kolkata", city: "Pune" },
  AMD: { tz: "Asia/Kolkata", city: "Ahmedabad" },
  JAI: { tz: "Asia/Kolkata", city: "Jaipur" },
  LKO: { tz: "Asia/Kolkata", city: "Lucknow" },
  MAN: { tz: "Europe/London", city: "Manchester" },
  DUB: { tz: "Europe/Dublin", city: "Dublin" },
  ZRH: { tz: "Europe/Zurich", city: "Zurich" },
  MUC: { tz: "Europe/Berlin", city: "Munich" },
  VIE: { tz: "Europe/Vienna", city: "Vienna" },
  CPH: { tz: "Europe/Copenhagen", city: "Copenhagen" },
  ARN: { tz: "Europe/Stockholm", city: "Stockholm" },
  OSL: { tz: "Europe/Oslo", city: "Oslo" },
  HEL: { tz: "Europe/Helsinki", city: "Helsinki" },
  BCN: { tz: "Europe/Madrid", city: "Barcelona" },
  LIS: { tz: "Europe/Lisbon", city: "Lisbon" },
  ATH: { tz: "Europe/Athens", city: "Athens" },
  SVO: { tz: "Europe/Moscow", city: "Moscow" },
  TPE: { tz: "Asia/Taipei", city: "Taipei" },
  MNL: { tz: "Asia/Manila", city: "Manila" },
  CGK: { tz: "Asia/Jakarta", city: "Jakarta" },
  SGN: { tz: "Asia/Ho_Chi_Minh", city: "Ho Chi Minh City" },
  HAN: { tz: "Asia/Ho_Chi_Minh", city: "Hanoi" },
  AKL: { tz: "Pacific/Auckland", city: "Auckland" },
  PER: { tz: "Australia/Perth", city: "Perth" },
  BNE: { tz: "Australia/Brisbane", city: "Brisbane" },
  YVR: { tz: "America/Vancouver", city: "Vancouver" },
  YUL: { tz: "America/Toronto", city: "Montreal" },
  MIA: { tz: "America/New_York", city: "Miami" },
  BOS: { tz: "America/New_York", city: "Boston" },
  IAD: { tz: "America/New_York", city: "Washington" },
  DFW: { tz: "America/Chicago", city: "Dallas" },
  SEA: { tz: "America/Los_Angeles", city: "Seattle" },
  MEX: { tz: "America/Mexico_City", city: "Mexico City" },
  EZE: { tz: "America/Argentina/Buenos_Aires", city: "Buenos Aires" },
  SCL: { tz: "America/Santiago", city: "Santiago" },
  BOG: { tz: "America/Bogota", city: "Bogotá" },
  LIM: { tz: "America/Lima", city: "Lima" },
  JNB: { tz: "Africa/Johannesburg", city: "Johannesburg" },
  CPT: { tz: "Africa/Johannesburg", city: "Cape Town" },
  NBO: { tz: "Africa/Nairobi", city: "Nairobi" },
  ADD: { tz: "Africa/Addis_Ababa", city: "Addis Ababa" },
  LOS: { tz: "Africa/Lagos", city: "Lagos" },
  SIN: { tz: "Asia/Singapore", city: "Singapore" },
  KUL: { tz: "Asia/Kuala_Lumpur", city: "Kuala Lumpur" },
  BKK: { tz: "Asia/Bangkok", city: "Bangkok" },
  HKG: { tz: "Asia/Hong_Kong", city: "Hong Kong" },
  NRT: { tz: "Asia/Tokyo", city: "Tokyo" },
  HND: { tz: "Asia/Tokyo", city: "Tokyo" },
  ICN: { tz: "Asia/Seoul", city: "Seoul" },
  PEK: { tz: "Asia/Shanghai", city: "Beijing" },
  PVG: { tz: "Asia/Shanghai", city: "Shanghai" },
  SYD: { tz: "Australia/Sydney", city: "Sydney" },
  MEL: { tz: "Australia/Melbourne", city: "Melbourne" },
  LHR: { tz: "Europe/London", city: "London" },
  LGW: { tz: "Europe/London", city: "London" },
  CDG: { tz: "Europe/Paris", city: "Paris" },
  FRA: { tz: "Europe/Berlin", city: "Frankfurt" },
  AMS: { tz: "Europe/Amsterdam", city: "Amsterdam" },
  MAD: { tz: "Europe/Madrid", city: "Madrid" },
  FCO: { tz: "Europe/Rome", city: "Rome" },
  IST: { tz: "Europe/Istanbul", city: "Istanbul" },
  JFK: { tz: "America/New_York", city: "New York" },
  EWR: { tz: "America/New_York", city: "Newark" },
  LAX: { tz: "America/Los_Angeles", city: "Los Angeles" },
  SFO: { tz: "America/Los_Angeles", city: "San Francisco" },
  ORD: { tz: "America/Chicago", city: "Chicago" },
  ATL: { tz: "America/New_York", city: "Atlanta" },
  YYZ: { tz: "America/Toronto", city: "Toronto" },
  GRU: { tz: "America/Sao_Paulo", city: "São Paulo" },
};

export function getTz(iata: string): string {
  return AIRPORT_TZ[iata?.toUpperCase()]?.tz ?? "UTC";
}

// Convert "YYYY-MM-DDTHH:mm" in given IANA tz to UTC ISO string.
export function localToUtcIso(localDateTime: string, tz: string): string {
  // localDateTime: "2026-05-02T21:05"
  const [datePart, timePart] = localDateTime.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  // Guess UTC time, then compute the tz-offset for that moment, adjust.
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = tzOffsetMinutes(tz, new Date(guess));
  return new Date(guess - offset * 60_000).toISOString();
}

function tzOffsetMinutes(tz: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = dtf.formatToParts(at).reduce<Record<string, string>>((a, p) => {
    if (p.type !== "literal") a[p.type] = p.value;
    return a;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second)
  );
  return Math.round((asUtc - at.getTime()) / 60_000);
}

export function formatInTz(iso: string, tz: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: tz, year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}
