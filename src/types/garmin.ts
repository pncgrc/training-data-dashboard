// Shapes of the Garmin Connect responses the dashboard reads. Only the fields
// in use are typed; see docs/garmin-personal-api.openapi.json for the rest.

export interface ActivityType {
  typeKey: string;
}

// An entry from /activitylist-service/activities/search/activities.
// Zone times (hrTimeInZone_N, powerTimeInZone_N) and the power curve
// (maxAvgPower_N) are numbered fields, read through the index signature.
export interface ActivityListEntry {
  activityId: number;
  activityName?: string;
  startTimeLocal: string;
  activityType?: ActivityType;
  isParent?: boolean;
  distance?: number;
  duration?: number;
  movingDuration?: number;
  averageSpeed?: number;
  averageHR?: number;
  avgPower?: number;
  normPower?: number;
  max20MinPower?: number;
  fastestSplit_1000?: number;
  fastestSplit_1609?: number;
  trainingEffectLabel?: string;
  [field: string]: unknown;
}

export interface ActivitySummary {
  startTimeLocal?: string;
  distance?: number;
  duration?: number;
  movingDuration?: number;
  elapsedDuration?: number;
  averageHR?: number;
  maxHR?: number;
  calories?: number;
  averageSpeed?: number;
  averageMovingSpeed?: number;
  maxSpeed?: number;
  elevationGain?: number;
  // Swim
  poolLength?: number;
  unitOfPoolLength?: { factor?: number };
  numberOfActiveLengths?: number;
  totalNumberOfStrokes?: number;
  averageStrokes?: number;
  averageSWOLF?: number;
  averageStrokeDistance?: number;
  averageSwimCadence?: number;
  // Bike
  averagePower?: number;
  normalizedPower?: number;
  maxPower?: number;
  maxPowerTwentyMinutes?: number;
  averageBikeCadence?: number;
  // Run
  averageRunCadence?: number;
  strideLength?: number;
  groundContactTime?: number;
  verticalOscillation?: number;
  verticalRatio?: number;
}

// /api/activity: the detail endpoint plus the matching list entry.
export interface ActivityDetail {
  activityId: number;
  activityName?: string;
  locationName?: string;
  activityTypeDTO?: ActivityType;
  summaryDTO: ActivitySummary;
  metadataDTO?: { childIds?: number[]; manufacturer?: string };
  listEntry: ActivityListEntry | null;
}

export interface HeartRateZones {
  sport: string;
  zone1Floor: number;
  zone2Floor: number;
  zone3Floor: number;
  zone4Floor: number;
  zone5Floor: number;
}
