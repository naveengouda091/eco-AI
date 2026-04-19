/**
 * Vehicle Page
 * GPS tracking + manual vehicle type selector for accurate emission calculations.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import SectionHeader from '../components/common/SectionHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import InsightBox from '../components/common/InsightBox';
import LineChartBox from '../components/charts/LineChartBox';
import { startTrack, stopTrack, logManualVehicle } from '../services/api.js';
import { distanceKm, computeSegmentSpeed } from '../utils/gps.js';

const TRACK_STORAGE_KEY = 'ecotrack_active_track';

// ── Vehicle catalogue with emission factors (kg CO₂ per km) ──────────────────
const VEHICLE_TYPES = [
  { id: 'walking',        label: 'Walking',                  icon: '🚶', factor: 0.000 },
  { id: 'cycling',        label: 'Bicycle / E-bike',         icon: '🚲', factor: 0.005 },
  { id: 'scooter',        label: 'Scooter / Moped',          icon: '🛵', factor: 0.070 },
  { id: 'motorcycle',     label: 'Motorcycle',               icon: '🏍️', factor: 0.103 },
  { id: 'car_petrol',     label: 'Car — Petrol',             icon: '🚗', factor: 0.192 },
  { id: 'car_diesel',     label: 'Car — Diesel',             icon: '🚙', factor: 0.171 },
  { id: 'car_electric',   label: 'Car — Electric',           icon: '⚡', factor: 0.053 },
  { id: 'car_hybrid',     label: 'Car — Hybrid',             icon: '🔋', factor: 0.110 },
  { id: 'bus',            label: 'Bus / Public Transit',     icon: '🚌', factor: 0.089 },
  { id: 'train',          label: 'Train / Metro',            icon: '🚆', factor: 0.041 },
  { id: 'auto_rickshaw',  label: 'Auto Rickshaw (CNG)',       icon: '🛺', factor: 0.082 },
  { id: 'suv_petrol',     label: 'SUV — Petrol',             icon: '🚐', factor: 0.240 },
  { id: 'truck',          label: 'Truck / Van',              icon: '🚚', factor: 0.320 },
];

const getFactorById = (id) => VEHICLE_TYPES.find((v) => v.id === id)?.factor ?? 0.192;

const sampleTodayPoints = [
  { lat: 40.7128, lng: -74.0060, accuracy: 12, timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(), speed: 18.5 },
  { lat: 40.7160, lng: -74.0050, accuracy: 10, timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(), speed: 21.2 },
  { lat: 40.7200, lng: -74.0030, accuracy: 11, timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(), speed: 24.8 },
  { lat: 40.7240, lng: -74.0000, accuracy: 9,  timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), speed: 26.1 },
  { lat: 40.7280, lng: -73.9960, accuracy: 13, timestamp: new Date(Date.now() - 6  * 60 * 1000).toISOString(), speed: 24.0 },
  { lat: 40.7310, lng: -73.9930, accuracy: 10, timestamp: new Date(Date.now() - 2  * 60 * 1000).toISOString(), speed: 23.5 },
];

const yesterdayTrip = {
  date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
  vehicleId: 'car_petrol', distance: 14.8, carbonEmission: 2.84,
};

const formatDistance = (v) => `${v.toFixed(2)} km`;
const formatSpeed    = (v) => `${v.toFixed(1)} km/h`;
const formatDuration = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

export default function Vehicle() {
  const [selectedVehicle,    setSelectedVehicle]    = useState('car_petrol');
  const [tracking,           setTracking]           = useState(false);
  const [trackId,            setTrackId]            = useState(null);
  const [points,             setPoints]             = useState([]);
  const [liveAccuracy,       setLiveAccuracy]       = useState(null);
  const [statusMessage,      setStatusMessage]      = useState('Ready to start tracking your route.');
  const [error,              setError]              = useState('');
  const [warning,            setWarning]            = useState('');
  const [stoppedTrack,       setStoppedTrack]       = useState(null);
  const [authorizationDenied,setAuthorizationDenied]= useState(false);
  const [manualDist,   setManualDist]   = useState('');
  const [manualVeh,    setManualVeh]    = useState('car_petrol');
  const [manualDate,   setManualDate]   = useState(new Date().toISOString().slice(0,10));
  const [manualSaved,  setManualSaved]  = useState('');
  const [manualError,  setManualError]  = useState('');
  const [manualSaving, setManualSaving] = useState(false);
  const watchId      = useRef(null);
  const sessionStart = useRef(null);

  const isDemoRoute    = !points.length && !tracking;
  const displayPoints  = isDemoRoute ? sampleTodayPoints : points;
  const vehicleFactor  = getFactorById(selectedVehicle);
  const vehicleLabel   = VEHICLE_TYPES.find((v) => v.id === selectedVehicle);

  const speeds = useMemo(() => {
    const list = [];
    for (let i = 1; i < displayPoints.length; i++) {
      const prev = displayPoints[i - 1];
      const curr = displayPoints[i];
      const s = computeSegmentSpeed(distanceKm(prev, curr), new Date(curr.timestamp) - new Date(prev.timestamp));
      if (s) list.push(s);
    }
    return list;
  }, [displayPoints]);

  const distance = useMemo(() =>
    displayPoints.reduce((sum, pt, i) => i === 0 ? 0 : sum + distanceKm(displayPoints[i - 1], pt), 0),
    [displayPoints]);

  const averageSpeed = useMemo(() =>
    speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
    [speeds]);

  // Emission uses the selected vehicle's factor
  const emissions = useMemo(() =>
    parseFloat((distance * vehicleFactor).toFixed(3)),
    [distance, vehicleFactor]);

  useEffect(() => {
    const saved = localStorage.getItem(TRACK_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.trackId && Array.isArray(parsed.points)) {
          setTrackId(parsed.trackId);
          setPoints(parsed.points);
          setTracking(true);
          if (parsed.vehicleId) setSelectedVehicle(parsed.vehicleId);
          sessionStart.current = new Date(parsed.startTime);
          setStatusMessage('Resuming active GPS tracking session.');
          startWatch();
        }
      } catch { localStorage.removeItem(TRACK_STORAGE_KEY); }
    }
    return () => { if (watchId.current != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current); };
  }, []);

  const saveSession = (s) => localStorage.setItem(TRACK_STORAGE_KEY, JSON.stringify(s));
  const clearSession = ()  => localStorage.removeItem(TRACK_STORAGE_KEY);

  const startWatch = () => {
    if (!navigator.geolocation) { setError('Geolocation is not available in this browser.'); return; }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = {
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(pos.timestamp).toISOString(),
          speed: pos.coords.speed != null ? parseFloat((pos.coords.speed * 3.6).toFixed(1)) : null,
        };
        setWarning(point.accuracy > 80 ? 'GPS accuracy is low. Move to an open area.' : '');
        setLiveAccuracy(point.accuracy);
        setPoints((prev) => {
          const next = [...prev, point];
          saveSession({ trackId, vehicleId: selectedVehicle, points: next, startTime: sessionStart.current?.toISOString() });
          return next;
        });
      },
      (geoErr) => {
        if (geoErr.code === 1) { setAuthorizationDenied(true); setError('GPS permission denied. Please allow location access.'); }
        else setError('Failed to read GPS position. Please try again.');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
  };

  const handleStartTracking = () => {
    if (!navigator.geolocation) { setError('Geolocation is not supported by your browser.'); return; }
    setError(''); setStatusMessage('Requesting location permission...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const firstPoint = {
            lat: pos.coords.latitude, lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: new Date(pos.timestamp).toISOString(),
            speed: pos.coords.speed != null ? parseFloat((pos.coords.speed * 3.6).toFixed(1)) : null,
          };
          const response = await startTrack(firstPoint);
          setTrackId(response.trackId);
          setPoints([firstPoint]);
          setTracking(true);
          sessionStart.current = new Date();
          saveSession({ trackId: response.trackId, vehicleId: selectedVehicle, points: [firstPoint], startTime: sessionStart.current.toISOString() });
          setStatusMessage('Tracking in progress. Keep the browser open for accurate route capture.');
          startWatch();
        } catch (err) { setError(err.message || 'Could not start GPS tracking session.'); setStatusMessage('Unable to start tracking.'); }
      },
      (geoErr) => {
        if (geoErr.code === 1) { setAuthorizationDenied(true); setError('Location permission denied. Enable GPS in your browser settings.'); }
        else setError('Unable to obtain your current location.');
        setStatusMessage('Tracking was not started.');
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
  };

  const handleStopTracking = async () => {
    if (watchId.current != null && navigator.geolocation) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
    if (!trackId)          { setError('No active tracking session found.'); return; }
    if (points.length < 2) { setError('Not enough GPS points were collected to complete a track.'); return; }
    setError(''); setStatusMessage('Finalizing route and saving your session...');
    try {
      const response = await stopTrack(trackId, points);
      setStoppedTrack({ ...response.track, vehicleId: selectedVehicle, emissions });
      setTracking(false);
      setStatusMessage('Route saved successfully. Review your session summary below.');
      clearSession(); setTrackId(null);
    } catch (err) { setError(err.message || 'Unable to stop tracking session.'); setStatusMessage('Stop request failed.'); }
  };

  const handleManualLog = async () => {
    setManualError(''); setManualSaved('');
    const dist = parseFloat(manualDist);
    if (!manualDist || isNaN(dist) || dist <= 0) { setManualError('Please enter a valid distance.'); return; }
    const veh = VEHICLE_TYPES.find(v => v.id === manualVeh);
    if (!veh) { setManualError('Please select a vehicle.'); return; }
    setManualSaving(true);
    try {
      await logManualVehicle({
        distance: dist,
        vehicleFactor: veh.factor,
        vehicleId: veh.id,
        vehicleLabel: veh.label,
        date: manualDate,
      });
      setManualSaved(`Logged ${dist} km by ${veh.label} — ${(dist * veh.factor).toFixed(3)} kg CO₂`);
      setManualDist('');
    } catch(e) {
      setManualError(e.message || 'Could not save. Make sure backend is running.');
    } finally {
      setManualSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Auto Transport Tracking"
        description="Select your vehicle type, then start GPS tracking. Emissions are calculated using per-vehicle CO₂ factors."
      />

      {/* ── Vehicle Type Selector ── */}
      <Card className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 mb-1">Select Your Vehicle</h3>
          <p className="text-xs text-slate-400">Choose the vehicle you used. The emission factor updates automatically.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {VEHICLE_TYPES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => !tracking && setSelectedVehicle(v.id)}
              disabled={tracking}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-all ${
                selectedVehicle === v.id
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 bg-slate-950/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              } ${tracking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-xl leading-none">{v.icon}</span>
              <span className="text-center leading-tight">{v.label}</span>
              <span className={`text-xs ${selectedVehicle === v.id ? 'text-emerald-400' : 'text-slate-500'}`}>
                {v.factor === 0 ? '0 g/km' : `${(v.factor * 1000).toFixed(0)} g/km`}
              </span>
            </button>
          ))}
        </div>
        {vehicleLabel && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-sm">
            <span className="text-lg">{vehicleLabel.icon}</span>
            <span className="text-emerald-300 font-medium">{vehicleLabel.label}</span>
            <span className="text-slate-400 ml-auto">
              Emission factor: <span className="text-slate-200 font-semibold">{vehicleFactor * 1000} g CO₂/km</span>
            </span>
          </div>
        )}
      </Card>

      {/* ── Live Tracking + Route Summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-slate-100">Live Tracking</h3>
              <p className="text-sm text-slate-400">GPS will capture your route automatically.</p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${tracking ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/70 text-slate-300'}`}>
              {tracking ? 'Recording' : 'Idle'}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-slate-400 text-sm">{statusMessage}</p>
            </div>
            {error   && <InsightBox message={error}   type="warning" />}
            {warning && <InsightBox message={warning} type="warning" />}
            {authorizationDenied && (
              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                GPS access is required for automatic transport tracking.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-slate-400 text-sm">Distance</p>
                <p className="mt-2 text-2xl font-semibold text-slate-100">{formatDistance(distance)}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-slate-400 text-sm">Speed</p>
                <p className="mt-2 text-2xl font-semibold text-slate-100">{formatSpeed(averageSpeed || 0)}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-slate-400 text-sm">Vehicle</p>
              <p className="mt-2 text-xl font-semibold text-slate-100">
                {vehicleLabel?.icon} {vehicleLabel?.label}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-slate-400 text-sm">Estimated Emissions</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{emissions} kg CO₂</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-slate-400 text-sm">GPS Accuracy</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{liveAccuracy ? `${Math.round(liveAccuracy)} m` : '—'}</p>
            </div>
          </div>

          <Button onClick={tracking ? handleStopTracking : handleStartTracking} className="w-full py-4 text-sm font-semibold">
            {tracking ? 'Stop Tracking' : 'Start Tracking'}
          </Button>
        </Card>

        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-slate-100">Route Summary</h3>
              {isDemoRoute && <p className="text-sm text-emerald-400">Demo route loaded for today — not actual GPS data.</p>}
            </div>
            <span className="text-sm text-slate-400">{displayPoints.length} points</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Total route points</p>
              <p className="mt-2 text-xl font-semibold text-slate-100">{displayPoints.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Route duration</p>
              <p className="mt-2 text-xl font-semibold text-slate-100">
                {formatDuration(displayPoints.length > 1
                  ? new Date(displayPoints[displayPoints.length - 1].timestamp) - new Date(displayPoints[0].timestamp)
                  : 0)}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Current vehicle</p>
              <p className="mt-2 text-xl font-semibold text-slate-100">{vehicleLabel?.icon} {vehicleLabel?.label.split('—')[0].trim()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Speed chart */}
      <div className="grid grid-cols-1 gap-6">
        <LineChartBox
          data={displayPoints.map((pt, i) => ({ name: `${i + 1}`, value: pt.speed ?? 0 }))}
          title="Speed over track points"
        />
      </div>

      {/* Yesterday's demo trip */}
      {!points.length && !tracking && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-slate-100">Yesterday's Demo Trip</h3>
              <p className="text-sm text-slate-400">Sample route data for visualization only.</p>
            </div>
            <span className="rounded-full bg-slate-700/80 px-3 py-1 text-xs font-semibold text-slate-300">{yesterdayTrip.date}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Vehicle', value: `${VEHICLE_TYPES.find(v => v.id === yesterdayTrip.vehicleId)?.icon} ${VEHICLE_TYPES.find(v => v.id === yesterdayTrip.vehicleId)?.label}` },
              { label: 'Distance', value: formatDistance(yesterdayTrip.distance) },
              { label: 'Emission', value: `${yesterdayTrip.carbonEmission.toFixed(2)} kg` },
              { label: 'Factor',   value: `${(getFactorById(yesterdayTrip.vehicleId) * 1000).toFixed(0)} g/km` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-2 text-base font-semibold text-slate-100">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stopped track summary */}
      {stoppedTrack && (
        <Card className="space-y-4">
          <h3 className="text-lg font-medium text-slate-100">Saved Route Summary</h3>
          <p className="text-slate-400">Your completed session has been saved.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Distance',   value: `${(stoppedTrack.distance || 0).toFixed(2)} km` },
              { label: 'Vehicle',    value: `${vehicleLabel?.icon} ${vehicleLabel?.label.split('—')[0].trim()}` },
              { label: 'CO₂ Emitted', value: `${emissions} kg` },
              { label: 'Route start', value: new Date(stoppedTrack.startTime).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Manual Vehicle Entry ── */}
      <Card className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">📝 Manual Vehicle Log</h3>
          <p className="text-sm text-slate-400 mt-1">
            Didn't use GPS tracking? Enter your trip details manually to log emissions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Distance (km)</label>
            <input
              type="number" min="0" step="0.1"
              value={manualDist}
              onChange={(e) => setManualDist(e.target.value)}
              placeholder="e.g. 12.5"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-500 transition"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Vehicle Used</label>
            <select
              value={manualVeh}
              onChange={(e) => setManualVeh(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-500 transition"
            >
              {VEHICLE_TYPES.map((v) => (
                <option key={v.id} value={v.id}>{v.icon} {v.label} ({(v.factor * 1000).toFixed(0)} g/km)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Date of Trip</label>
            <input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-500 transition"
            />
          </div>
          <div className="flex flex-col justify-end">
            {manualDist && !isNaN(parseFloat(manualDist)) && parseFloat(manualDist) > 0 && (
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 px-3 py-2 mb-2 text-sm">
                <span className="text-slate-400">Est. CO₂: </span>
                <span className="text-emerald-400 font-bold">
                  {(parseFloat(manualDist) * (VEHICLE_TYPES.find(v => v.id === manualVeh)?.factor || 0)).toFixed(3)} kg
                </span>
              </div>
            )}
            <button
              onClick={handleManualLog}
              disabled={manualSaving}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {manualSaving ? 'Saving…' : '+ Log This Trip'}
            </button>
          </div>
        </div>

        {manualError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{manualError}</div>
        )}
        {manualSaved && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">✅ {manualSaved}</div>
        )}
      </Card>
    </div>
  );
}
