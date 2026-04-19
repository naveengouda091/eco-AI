/**
 * Device Page
 * Handles device-related emission logging and stores entries in the backend.
 */
import { useState } from 'react';
import SectionHeader from '../components/common/SectionHeader';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import ResultCard from '../components/common/ResultCard';
import InsightBox from '../components/common/InsightBox';
import { calculateDeviceEmissions } from '../utils/calculations';
import { useActivities } from '../hooks/useActivities.jsx';
import { createActivity } from '../services/api.js';

export default function Device() {
  const [hours, setHours] = useState(8);
  const [deviceType, setDeviceType] = useState('laptop');
  const [result, setResult] = useState(calculateDeviceEmissions(8, 'laptop'));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');
  const { activities, setActivities } = useActivities();

  const handleCalculate = () => {
    setResult(calculateDeviceEmissions(hours, deviceType));
    setSuccess('Calculation ready. Save it to your activity history.');
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    const emission = calculateDeviceEmissions(hours, deviceType);
    setSaving(true);

    try {
      const response = await createActivity({
        type: 'device',
        value: hours,
        carbonEmission: emission.value,
        date: new Date().toISOString(),
      });

      setActivities([response.activity, ...(activities || [])]);
      setSuccess('Device emission entry saved successfully.');
      setResult(emission);
    } catch (err) {
      setError(err.message || 'Unable to save entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Device Footprint" description="Track and record your hardware energy emissions." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h3 className="text-lg font-medium text-slate-100">Input Data</h3>

          <Select
            label="Device Type"
            options={[
              { label: 'Laptop', value: 'laptop' },
              { label: 'Desktop', value: 'desktop' },
              { label: 'Mobile / Tablet', value: 'mobile' },
            ]}
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
          />

          <Input
            label="Hours Used Daily"
            type="number"
            min="0"
            max="24"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />

          <Button onClick={handleCalculate} className="w-full mt-4">
            Calculate CO₂ Output
          </Button>
          <Button onClick={handleSave} className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400" disabled={saving}>
            {saving ? 'Saving…' : 'Save Activity'}
          </Button>

          {error && <InsightBox message={error} type="warning" />}
          {success && <InsightBox message={success} type="success" />}
        </Card>

        <ResultCard title="Daily Computation Emission" value={result.value} unit="kg CO₂" severity={result.severity} />
      </div>

      <div className="mt-8 border-b border-slate-800">
        <nav className="-mb-px flex space-x-8">
          {['analytics', 'suggestions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'analytics' ? (
          <InsightBox
            message={`As a ${deviceType} user logging ${hours} hours daily, you generate approximately ${(result.value * 30).toFixed(1)} kg CO₂ per month.`}
          />
        ) : (
          <div className="space-y-4">
            <InsightBox message="Consider switching to low-power settings to reduce device emissions." type="success" />
            <InsightBox message="Saving your entries creates a personalized footprint report for your dashboard." type="info" />
          </div>
        )}
      </div>
    </div>
  );
}
