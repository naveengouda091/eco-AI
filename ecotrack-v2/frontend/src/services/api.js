/**
 * api.js — Real Flask backend at http://localhost:5000
 * EcoTrack routes:  /api/auth/*, /api/activity, /api/track/*, /api/device-usage
 * AI Analysis:      /api/analyze/personal, /api/analyze/organisation
 * Trending:         /api/trending, /api/trending/organisation
 * Calculator route: /calculate  (auto CPU detect or manual)
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getToken = () => localStorage.getItem('ecotrack_token');

const request = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem('ecotrack_token');
    throw new Error(body?.message || response.statusText || 'Request failed');
  }
  return body;
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const registerUser    = (email, password, accountType = 'personal', orgName = '') =>
  request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, accountType, orgName }) });

export const loginUser       = (email, password, accountType = 'personal') =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, accountType }) });

export const loadUserProfile = () => request('/api/user/profile');

// ── Activities ────────────────────────────────────────────────────────────────
export const fetchActivities  = ()         => request('/api/activity');
export const createActivity   = (activity) =>
  request('/api/activity', { method: 'POST', body: JSON.stringify(activity) });

// ── Track (GPS) ───────────────────────────────────────────────────────────────
export const startTrack        = (startPoint) =>
  request('/api/track/start', { method: 'POST', body: JSON.stringify({ startPoint }) });
export const stopTrack         = (trackId, points) =>
  request('/api/track/stop',  { method: 'POST', body: JSON.stringify({ trackId, points }) });
export const fetchTrackHistory = () => request('/api/track/history');

// ── Device Usage ──────────────────────────────────────────────────────────────
export const postDeviceUsage         = (date, screenTimeSeconds) =>
  request('/api/device-usage', { method: 'POST', body: JSON.stringify({ date, screenTimeSeconds }) });
export const fetchDeviceUsageHistory = () => request('/api/device-usage');

// ── Carbon Calculator (basic – CPU detection) ─────────────────────────────────
export const calculateCarbon = (payload) =>
  request('/calculate', { method: 'POST', body: JSON.stringify(payload) });

// ── ECO AI Analysis (eco_carbon_ai_3.py routes) ───────────────────────────────
/**
 * Full personal analysis – maps to flask_personal_handler in eco_carbon_ai_3.py
 * Required fields: screen_time, usage_type, charging_freq, distance, fuel_type
 * Optional: prev_screen_time, user_id
 */
export const analyzePersonal = (payload) =>
  request('/api/analyze/personal', { method: 'POST', body: JSON.stringify(payload) });

/**
 * Organisation analysis – maps to flask_organisation_handler in eco_carbon_ai_3.py
 * Required: { users: [...] }
 */
export const analyzeOrganisation = (payload) =>
  request('/api/analyze/organisation', { method: 'POST', body: JSON.stringify(payload) });

/**
 * Trending solutions for personal mode
 * Required: screen_time, usage_type, charging_freq, distance, fuel_type
 * Optional: category
 */
export const fetchTrendingSolutions = (payload) =>
  request('/api/trending', { method: 'POST', body: JSON.stringify(payload) });

/**
 * Trending solutions for organisation mode
 * Required: { users: [...], org_category? }
 */
export const fetchOrgTrendingSolutions = (payload) =>
  request('/api/trending/organisation', { method: 'POST', body: JSON.stringify(payload) });

// ── Rewards & Leaderboard ─────────────────────────────────────────────────────
export const fetchRewardsProfile = () => request('/api/rewards/profile');
export const fetchLeaderboard    = () => request('/api/leaderboard');

// ── Manual Vehicle Entry ──────────────────────────────────────────────────────
export const logManualVehicle = (payload) =>
  request('/api/vehicle/manual', { method: 'POST', body: JSON.stringify(payload) });
