/**
 * calculations.js
 * A centralized utility file to hold isolated math and business logic.
 * Decoupling calculation logic keeps React components simpler and purely focused on UI.
 */

/**
 * Calculates mock CO2 emissions for computational devices based on usage times.
 * @param {number} hours - Number of hours the device was used.
 * @param {string} type - What kind of device ('desktop', 'laptop', 'mobile').
 * @returns {object} Object containing the calculated numeric 'value' and a text 'severity' rating.
 */
export const calculateDeviceEmissions = (hours, type) => {
  // Pre-determined static rates representing kg of CO2 generated per hour computed.
  const rates = {
    desktop: 0.15, 
    laptop: 0.05,
    mobile: 0.01,
  };
  
  // Fetch specific rate. Default to laptop if an unknown type is provided.
  const rate = rates[type] || rates.laptop;
  const total = hours * rate; // Simple multiplication calculation.
  
  return {
    value: parseFloat(total.toFixed(2)), // Ensure data doesn't render excessively long decimals
    severity: total > 2 ? 'high' : total > 0.5 ? 'medium' : 'low' // Dynamic styling heuristic marker
  };
};

/**
 * Calculates mock CO2 emissions for commuting trips based on distance.
 * @param {number} distance - Journey distance logged in kilometers.
 * @param {string} fuelType - Nature of vehicle energy ('petrol', 'diesel', 'ev').
 * @returns {object} Object containing final 'value' and computed 'severity'.
 */
export const calculateVehicleEmissions = (distance, fuelType) => {
  // Pre-determined static carbon footprint emission profiles per kilometer travelled.
  const rates = {
    petrol: 0.12, 
    diesel: 0.15,
    ev: 0.04,
  };
  
  const rate = rates[fuelType] || rates.petrol;
  const total = distance * rate;

  return {
    value: parseFloat(total.toFixed(2)),
    severity: total > 15 ? 'high' : total > 5 ? 'medium' : 'low'
  };
};

// Simple visual formatting helper function.
export const formatCO2 = (value) => `${value} kg CO₂`;
