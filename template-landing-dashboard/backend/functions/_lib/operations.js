export const OPERATION_IDS = Object.freeze(["primary", "second"]);
export function validOperation(value) { return OPERATION_IDS.includes(value) ? value : null; }
export function currentOperation(env) { return validOperation(env.OPERATION_ID) || "primary"; }
export function defaultSettings() { return {
  "global": "",
  "landingUrl": "",
  "landingBrUrl": "",
  "landingForeignUrl": "",
  "regions": {
    "latam": "",
    "na": "",
    "europe": "",
    "asia": "",
    "africa": "",
    "oceania": ""
  },
  "countries": {
    "BR": "",
    "IN": "",
    "RU": "",
    "US": "",
    "ES": "",
    "SE": ""
  },
  "accessUrl": ""
}; }

export function sanitizeSettings(candidate, operationId) {
  const defaults = defaultSettings(operationId);
  const clean = { landingUrl: defaults.landingUrl, landingBrUrl: defaults.landingBrUrl, landingForeignUrl: defaults.landingForeignUrl, global: defaults.global, regions: {}, countries: {}, accessUrl: defaults.accessUrl };
  if (!candidate || typeof candidate !== "object") return defaults;
  const validUrl = (value) => {
    if (typeof value !== "string" || value.length > 500) return "";
    try {
      const url = new URL(value.trim());
      return url.protocol === "https:" ? url.toString() : "";
    } catch {
      return "";
    }
  };

  clean.landingUrl = validUrl(candidate.landingUrl) || defaults.landingUrl;
  clean.landingBrUrl = validUrl(candidate.landingBrUrl) || defaults.landingBrUrl;
  clean.landingForeignUrl = validUrl(candidate.landingForeignUrl) || defaults.landingForeignUrl;
  clean.global = validUrl(candidate.global) || defaults.global;
  clean.accessUrl = validUrl(candidate.accessUrl) || defaults.accessUrl;
  for (const key of Object.keys(defaults.regions)) {
    clean.regions[key] = validUrl(candidate.regions?.[key]) || defaults.regions[key];
  }
  for (const key of Object.keys(defaults.countries)) {
    clean.countries[key] = validUrl(candidate.countries?.[key]) || defaults.countries[key];
  }
  return clean;
}

export async function loadSettings(db, operationId) {
  const row = await db.prepare(
    "SELECT settings_json FROM operation_settings WHERE operation_id = ?"
  ).bind(operationId).first();
  if (!row) return defaultSettings(operationId);
  try {
    return sanitizeSettings(JSON.parse(row.settings_json), operationId);
  } catch {
    return defaultSettings(operationId);
  }
}
