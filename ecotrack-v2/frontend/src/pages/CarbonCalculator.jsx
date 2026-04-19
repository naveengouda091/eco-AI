/**
 * CarbonCalculator.jsx — Vehicle inputs removed from manual mode and session summary.
 * Distance is sent as 0 and fuel_type as 'electric' silently so backend calculation
 * still works without breaking the eco_carbon_ai module.
 */
import { useState } from 'react';
import SectionHeader from '../components/common/SectionHeader';
import Card from '../components/ui/Card';
import InsightBox from '../components/common/InsightBox';
import LineChartBox from '../components/charts/LineChartBox';
import PieChartBox from '../components/charts/PieChartBox';
import { analyzePersonal, fetchTrendingSolutions, calculateCarbon } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Zap, TrendingUp, Flame, AlertTriangle, Leaf, Award } from 'lucide-react';

const INIT_TREND = [
  { label: 'Mon', carbon: 2.2 }, { label: 'Tue', carbon: 2.8 },
  { label: 'Wed', carbon: 2.4 }, { label: 'Thu', carbon: 3.1 },
  { label: 'Fri', carbon: 2.7 },
];

function categoryColor(cat) {
  if (cat === 'High')                         return 'text-red-400';
  if (cat === 'Medium' || cat === 'Moderate') return 'text-amber-400';
  return 'text-emerald-400';
}
function categoryBg(cat) {
  if (cat === 'High')                         return 'bg-red-500/10 border-red-500/30';
  if (cat === 'Medium' || cat === 'Moderate') return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-emerald-500/10 border-emerald-500/30';
}
function scoreColor(score) {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}
function difficultyBadge(d) {
  if (d === 'easy')   return 'bg-emerald-500/15 text-emerald-400';
  if (d === 'medium') return 'bg-amber-500/15 text-amber-400';
  return 'bg-red-500/15 text-red-400';
}
function buildPieData(device, transport) {
  if (!device && !transport) return [{ name: 'No data', value: 1 }];
  return [
    { name: 'Device',    value: +(device    || 0).toFixed(3) },
    { name: 'Transport', value: +(transport || 0).toFixed(3) },
  ];
}

const TABS = ['Analysis', 'AI Suggestions', 'Trending Solutions'];

export default function CarbonCalculator() {
  const { user } = useAuth();
  const [detectionMode, setDetectionMode] = useState('manual');
  const [activeTab, setActiveTab]         = useState('Analysis');

  // Vehicle fields (distance, fuel_type) REMOVED from the visible form.
  // They are still sent to backend with neutral defaults (0 km, electric)
  // so eco_carbon_ai calculation never breaks.
  const [form, setForm] = useState({
    screen_time:      5,
    usage_type:       'normal',
    charging_freq:    2,
    prev_screen_time: '',
  });

  const [result,      setResult]      = useState(null);
  const [trend,       setTrend]       = useState(INIT_TREND);
  const [trending,    setTrending]    = useState(null);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);

  const handleInput = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCalculate = async () => {
    setError(''); setLoading(true); setTrending(null);
    try {
      let res;
      if (detectionMode === 'auto') {
        const basic = await calculateCarbon({ mode: 'auto' });
        res = await analyzePersonal({
          screen_time:   basic.screen_time   || Number(form.screen_time),
          usage_type:    basic.usage_type    || form.usage_type,
          charging_freq: basic.charging_freq || Number(form.charging_freq),
          distance:      0,           // vehicle removed — send neutral default
          fuel_type:     'electric',  // lowest-emission default
          user_id:       user?.email || undefined,
        }).catch(() => ({
          total_carbon_kg: basic.carbon_score || 0,
          device_kg:       basic.carbon_score || 0,
          transport_kg:    0,
          category:        basic.category || 'Low',
          eco_score:       50,
          suggestions:     (basic.suggestions || []).map((s, i) => ({
            priority: i + 1, suggestion: s, category: 'device', impact_estimate: '', rationale: '',
          })),
          insight:             basic.insight || '',
          behavior_pattern:    { data_days: 0 },
          anomalies:           [],
          streak:              { current_streak: 0, status: 'stable', message: '' },
          eco_score_reason:    '',
          insight_confidence:  0.4,
          prediction:          { projected_kg: 0, optimistic_kg: 0, pessimistic_kg: 0, confidence: 'low', note: '' },
          trending_solutions:  [],
        }));
      } else {
        res = await analyzePersonal({
          screen_time:      Number(form.screen_time),
          usage_type:       form.usage_type,
          charging_freq:    Number(form.charging_freq),
          distance:         0,           // vehicle removed — neutral default
          fuel_type:        'electric',  // lowest-emission default
          prev_screen_time: form.prev_screen_time ? Number(form.prev_screen_time) : undefined,
          user_id:          user?.email || undefined,
        });
      }

      setResult(res);
      const total = res.total_carbon_kg ?? res.carbon_score ?? 0;
      setTrend((prev) => [...prev.slice(-6), { label: `Run ${prev.length - 4}`, carbon: total }]);
      setActiveTab('Analysis');
    } catch (e) {
      setError(e.message || 'Cannot reach backend. Make sure Flask is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTrending = async () => {
    if (!result) return;
    setTrendLoading(true);
    try {
      const data = await fetchTrendingSolutions({
        screen_time:   Number(form.screen_time),
        usage_type:    form.usage_type,
        charging_freq: Number(form.charging_freq),
        distance:      0,
        fuel_type:     'electric',
        category:      result.category || 'Medium',
      });
      setTrending(data);
    } catch {
      setTrending({ trending_solutions: [], count: 0 });
    } finally {
      setTrendLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'Trending Solutions' && result && !trending) handleLoadTrending();
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="EC🌍 AI Carbon Calculator"
        description="Full-spectrum carbon footprint analysis powered by the ECO AI engine — device usage, eco score, anomaly detection, and trending solutions."
      />

      {/* ── Detection Mode + Inputs ── */}
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Detection Mode</h2>
            <p className="text-sm text-slate-400 mt-1">Auto reads live CPU usage. Manual lets you enter device values.</p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1 gap-1">
            {['auto', 'manual'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setDetectionMode(m); setError(''); }}
                className={`rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-all ${
                  detectionMode === m
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {m} Mode
              </button>
            ))}
          </div>
        </div>

        {detectionMode === 'auto' && (
          <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-5 py-4 text-sm text-slate-400">
            <span className="font-semibold text-emerald-400">Auto Mode active.</span>{' '}
            The backend reads your live CPU usage to detect usage type, screen time, and charging frequency automatically.
            Just click <span className="text-slate-200">Analyse Carbon Footprint</span>.
          </div>
        )}

        {/* Manual mode — device fields only, vehicle removed */}
        {detectionMode === 'manual' && (
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Screen Time (hrs)</label>
              <input name="screen_time" type="number" min={0} value={form.screen_time} onChange={handleInput}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-500 transition" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Charging Frequency / day</label>
              <input name="charging_freq" type="number" min={0} value={form.charging_freq} onChange={handleInput}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-500 transition" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Usage Type</label>
              <select name="usage_type" value={form.usage_type} onChange={handleInput}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-500 transition">
                <option value="normal">Normal</option>
                <option value="streaming">Streaming</option>
                <option value="gaming">Gaming</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Yesterday's Screen Time <span className="text-slate-500">(optional)</span>
              </label>
              <input name="prev_screen_time" type="number" min={0} placeholder="hrs"
                value={form.prev_screen_time} onChange={handleInput}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-500 transition" />
            </div>
          </div>
        )}

        {error && <InsightBox message={error} type="warning" />}

        <div className="flex justify-end">
          <button onClick={handleCalculate} disabled={loading}
            className="rounded-xl bg-emerald-500 px-8 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20">
            {loading ? 'Analysing…' : '⚡ Analyse Carbon Footprint'}
          </button>
        </div>
      </Card>

      {/* ── Result Tabs ── */}
      {result && (
        <>
          <div className="flex gap-1 rounded-2xl border border-slate-700 bg-slate-950 p-1 w-fit">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => handleTabChange(tab)}
                className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}>
                {tab}
              </button>
            ))}
          </div>

          {/* ── TAB: Analysis ── */}
          {activeTab === 'Analysis' && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Total CO₂</p>
                  <p className="text-5xl font-bold text-slate-100">
                    {(result.total_carbon_kg ?? 0).toFixed(3)}
                    <span className="text-lg font-normal text-slate-400 ml-1">kg</span>
                  </p>
                </Card>
                <Card className={`space-y-2 border ${categoryBg(result.category)}`}>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Category</p>
                  <p className={`text-4xl font-bold ${categoryColor(result.category)}`}>{result.category}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-slate-400 pt-1">
                    <span>Device: <span className="text-slate-200">{(result.device_kg ?? 0).toFixed(3)} kg</span></span>
                    <span>Transport: <span className="text-slate-200">{(result.transport_kg ?? 0).toFixed(3)} kg</span></span>
                  </div>
                </Card>
                <Card className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Eco Score</p>
                  <p className={`text-5xl font-bold ${scoreColor(result.eco_score ?? 50)}`}>
                    {result.eco_score ?? '—'}<span className="text-lg font-normal text-slate-400">/100</span>
                  </p>
                  {result.streak?.status === 'improving' && result.streak.current_streak > 1 && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <Flame size={12} /> {result.streak.current_streak}-day streak!
                    </p>
                  )}
                </Card>
              </div>

              {result.anomalies?.length > 0 && (
                <Card className="border border-red-500/30 bg-red-500/5 space-y-3">
                  <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <AlertTriangle size={16} /> Anomalies Detected
                  </h3>
                  {result.anomalies.map((a, i) => (
                    <p key={i} className="text-sm text-slate-300">{a.message}</p>
                  ))}
                </Card>
              )}

              {result.streak?.message && result.streak.status !== 'stable' && (
                <InsightBox message={result.streak.message} type={result.streak.status === 'improving' ? 'success' : 'warning'} />
              )}

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <PieChartBox title="Device vs Transport" data={buildPieData(result.device_kg, result.transport_kg)} />
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:col-span-2">
                  <LineChartBox title="Carbon Trend (runs)" data={trend} dataKey="carbon" />
                </div>
              </div>

              {result.prediction && (
                <Card className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-400" /> 30-Day Prediction
                    <span className={`ml-2 text-xs font-normal rounded-full px-2 py-0.5 ${
                      result.prediction.confidence === 'high'   ? 'bg-emerald-500/15 text-emerald-400' :
                      result.prediction.confidence === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {result.prediction.confidence} confidence
                    </span>
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Projected',   value: result.prediction.projected_kg,   color: 'text-slate-100' },
                      { label: 'Optimistic',  value: result.prediction.optimistic_kg,  color: 'text-emerald-400' },
                      { label: 'Pessimistic', value: result.prediction.pessimistic_kg, color: 'text-red-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className={`text-2xl font-bold mt-1 ${color}`}>{value} kg</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-400">{result.prediction.note}</p>
                </Card>
              )}

              <Card className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  🤖 AI Insight
                  {result.insight_confidence && (
                    <span className="text-xs font-normal text-slate-400">
                      (confidence: {Math.round(result.insight_confidence * 100)}%)
                    </span>
                  )}
                </h3>
                <InsightBox message={result.insight} type="success" />
                {result.eco_score_reason && (
                  <p className="text-xs text-slate-500 border-t border-slate-800 pt-3">{result.eco_score_reason}</p>
                )}
              </Card>

              {result.behavior_pattern?.data_days >= 3 && (
                <Card className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Award size={15} className="text-amber-400" /> {result.behavior_pattern.data_days}-Day Behaviour Profile
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-3 text-sm">
                    <div className="rounded-lg bg-slate-950 px-3 py-2">
                      <p className="text-slate-400">Avg screen time</p>
                      <p className="text-slate-100 font-medium">{result.behavior_pattern.avg_screen_time}h / day</p>
                    </div>
                    <div className="rounded-lg bg-slate-950 px-3 py-2">
                      <p className="text-slate-400">Avg emissions</p>
                      <p className="text-slate-100 font-medium">{result.behavior_pattern.avg_emission} kg / day</p>
                    </div>
                    <div className="rounded-lg bg-slate-950 px-3 py-2">
                      <p className="text-slate-400">Trend</p>
                      <p className="text-slate-100 font-medium capitalize">{result.behavior_pattern.trend_type?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── TAB: AI Suggestions ── */}
          {activeTab === 'AI Suggestions' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Prioritised, impact-aware suggestions generated by the ECO AI engine based on your inputs.
              </p>
              {(result.suggestions || []).length === 0 ? (
                <InsightBox message="No suggestions available. Run the calculator first." type="info" />
              ) : (
                (result.suggestions || []).map((s, i) => {
                  const isObj  = typeof s === 'object';
                  const text   = isObj ? s.suggestion : s;
                  const impact = isObj ? s.impact_estimate : null;
                  const cat    = isObj ? s.category : null;
                  const catColors = {
                    transport: 'bg-blue-500/15 text-blue-400',
                    device:    'bg-purple-500/15 text-purple-400',
                    habit:     'bg-emerald-500/15 text-emerald-400',
                    anomaly:   'bg-red-500/15 text-red-400',
                  };
                  return (
                    <Card key={i} className="space-y-2 hover:bg-slate-800 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-400">
                          {isObj ? s.priority : i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-slate-200">{text}</p>
                          {impact && <p className="text-xs text-emerald-400 mt-1">💡 {impact}</p>}
                          {isObj && s.rationale && <p className="text-xs text-slate-500 mt-1">{s.rationale}</p>}
                        </div>
                        {cat && (
                          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 shrink-0 ${catColors[cat] || 'bg-slate-700 text-slate-400'}`}>
                            {cat}
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* ── TAB: Trending Solutions ── */}
          {activeTab === 'Trending Solutions' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Real-world sustainability trends personalised to your activity profile from the ECO AI catalogue.
              </p>
              {trendLoading && (
                <div className="text-slate-400 text-sm animate-pulse">Loading trending solutions…</div>
              )}
              {trending && trending.trending_solutions?.length === 0 && (
                <InsightBox message="No trending solutions returned. Check that the Flask /api/trending endpoint is running." type="info" />
              )}
              {trending && trending.trending_solutions?.map((ts) => (
                <Card key={ts.id} className="space-y-3 hover:bg-slate-800 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                        <Leaf size={15} className="text-emerald-400 shrink-0" />
                        {ts.title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">{ts.trend_msg}</p>
                    </div>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 shrink-0 capitalize ${difficultyBadge(ts.difficulty)}`}>
                      {ts.difficulty}
                    </span>
                  </div>
                  <div className="grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-lg bg-slate-950 px-3 py-2">
                      <p className="text-slate-400 mb-0.5">Impact</p>
                      <p className="text-emerald-400">{ts.impact}</p>
                    </div>
                    <div className="rounded-lg bg-slate-950 px-3 py-2">
                      <p className="text-slate-400 mb-0.5">Global Stat</p>
                      <p className="text-slate-300">{ts.global_stat}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(ts.tags || []).map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">#{tag}</span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Session Summary — vehicle fields removed ── */}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Session Summary</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Mode',        value: detectionMode },
            { label: 'Usage Type',  value: form.usage_type },
            { label: 'Screen Time', value: `${form.screen_time} hrs` },
            { label: 'Charging',    value: `${form.charging_freq}×/day` },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
              <span className="text-slate-400 mb-1">{label}</span>
              <span className="font-semibold capitalize text-slate-100">{value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}