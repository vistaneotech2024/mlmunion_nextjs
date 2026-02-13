'use client'

import React from 'react';
import { useLocationData } from '../hooks/useLocationData';

interface LocationSelectorProps {
  countryCode: string | null;
  countryId?: number;
  selectedState: string;
  selectedStateId?: number;
  selectedCity: string;
  onStateChange: (value: string, stateId?: number) => void;
  onCityChange: (value: string) => void;
  register?: any;
  errors?: any;
  disabled?: boolean;
}

export function LocationSelector({
  countryCode,
  countryId,
  selectedState,
  selectedStateId,
  selectedCity,
  onStateChange,
  onCityChange,
  register,
  errors,
  disabled = false
}: LocationSelectorProps) {
  const { states, cities, loading } = useLocationData(countryCode, selectedStateId, countryId);

  // Debug: Log when country code changes
  React.useEffect(() => {
    if (countryCode) {
      console.log(`🌍 LocationSelector received countryCode: ${countryCode}`);
    } else {
      console.log('🌍 LocationSelector: No country code selected');
    }
  }, [countryCode]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor="state" className="block text-sm font-medium text-gray-700">
          State {countryCode && `(${states.length} available)`}
          {countryCode && <span className="text-xs text-gray-500 ml-2">[{countryCode}]</span>}
        </label>
        {loading && !countryCode ? (
          <div className="mt-1 animate-pulse">
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <select
            {...(register ? register("state", { required: "State is required" }) : {})}
            onChange={(e) => {
              const value = e.target.value;
              // Extract state_id from value (format: "state_id|state_code")
              const [stateIdStr, stateCode] = value.split('|');
              const stateId = stateIdStr ? parseInt(stateIdStr, 10) : undefined;
              onStateChange(stateCode || value, stateId);
            }}
            value={(() => {
              // If we have selectedStateId, use the format "id|code"
              if (selectedStateId) {
                return `${selectedStateId}|${selectedState}`;
              }
              // If we only have selectedState (state code), find the matching state and use its full value
              if (selectedState && states.length > 0) {
                const matchingState = states.find(
                  (s) => s.state_code === selectedState || s.code === selectedState || s.name === selectedState
                );
                if (matchingState) {
                  return `${matchingState.id}|${matchingState.state_code || matchingState.code || ''}`;
                }
              }
              return selectedState || '';
            })()}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={disabled || !countryCode || loading}
            title={!countryCode ? 'Please select a country first' : loading ? 'Loading states...' : `${states.length} states available`}
          >
            <option value="">
              {!countryCode 
                ? 'Select Country First' 
                : loading 
                  ? 'Loading states...' 
                  : states.length === 0 
                    ? 'No states found' 
                    : 'Select State'}
            </option>
            {states.map(state => (
              <option key={state.id} value={`${state.id}|${state.state_code || state.code || ''}`} data-state-id={state.id}>
                {state.name}
              </option>
            ))}
          </select>
        )}
        {errors?.state && (
          <p className="mt-2 text-sm text-red-600">{errors.state.message}</p>
        )}
        {countryCode && states.length === 0 && !loading && (
          <p className="mt-1 text-xs text-gray-500">No states found for this country</p>
        )}
      </div>

      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
          City {selectedState && `(${cities.length} available)`}
        </label>
        {loading && selectedState ? (
          <div className="mt-1 animate-pulse">
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <select
            {...(register ? register("city", { required: "City is required" }) : {})}
            onChange={(e) => onCityChange(e.target.value)}
            value={selectedCity}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={disabled || !selectedState || loading}
            title={!selectedState ? 'Please select a state first' : loading ? 'Loading cities...' : `${cities.length} cities available`}
          >
            <option value="">
              {!selectedState 
                ? 'Select State First' 
                : loading 
                  ? 'Loading cities...' 
                  : cities.length === 0 
                    ? 'No cities found' 
                    : 'Select City'}
            </option>
            {cities.map(city => (
              <option key={city.id} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
        )}
        {errors?.city && (
          <p className="mt-2 text-sm text-red-600">{errors.city.message}</p>
        )}
        {selectedState && cities.length === 0 && !loading && (
          <p className="mt-1 text-xs text-gray-500">No cities found for this state</p>
        )}
      </div>
    </div>
  );
}