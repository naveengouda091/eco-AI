import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout       from './components/layout/MainLayout';
import Dashboard        from './pages/Dashboard';
import Vehicle          from './pages/Vehicle';          // ← restored
import Analytics        from './pages/Analytics';
import Recommendations  from './pages/Recommendations';
import Organisation     from './pages/Organisation';
import CarbonCalculator from './pages/CarbonCalculator';
import Rewards          from './pages/Rewards';
import Login            from './pages/Login';
import Signup           from './pages/Signup';
import ProtectedRoute   from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"         element={<Dashboard />} />
        <Route path="vehicle"           element={<Vehicle />} />     {/* ← restored */}
        <Route path="analytics"         element={<Analytics />} />
        <Route path="recommendations"   element={<Recommendations />} />
        <Route path="organisation"      element={<Organisation />} />
        <Route path="carbon-calculator" element={<CarbonCalculator />} />
        <Route path="rewards"           element={<Rewards />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;