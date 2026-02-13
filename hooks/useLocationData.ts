import { useState, useEffect } from 'react';
import { getStates, getCitiesByIds } from '../lib/supabase';

interface Location {
  id: number | string;
  name: string;
  code?: string;
  state_code?: string;
  country_code?: string;
  country_id?: number;
  state_id?: number;
}

export function useLocationData(
  countryCode: string | null,
  selectedStateId?: number,
  selectedCountryId?: number
) {
  const [states, setStates] = useState<Location[]>([]);
  const [cities, setCities] = useState<Location[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Load states when country code changes
  useEffect(() => {
    async function loadStates() {
      if (countryCode) {
        setLoadingStates(true);
        try {
          const data = await getStates(countryCode);
          setStates(data || []);
          console.log(`✅ Loaded ${data?.length || 0} states for country: ${countryCode}`);
        } catch (error) {
          console.error('❌ Error loading states:', error);
          setStates([]);
        } finally {
          setLoadingStates(false);
        }
      } else {
        setStates([]);
        setLoadingStates(false);
      }
    }
    loadStates();
  }, [countryCode]);

  // Load cities when state_id and country_id are available
  useEffect(() => {
    async function loadCities() {
      if (selectedStateId && selectedCountryId) {
        setLoadingCities(true);
        try {
          const data = await getCitiesByIds(selectedCountryId, selectedStateId);
          setCities(data || []);
          console.log(`✅ Loaded ${data?.length || 0} cities for country_id: ${selectedCountryId}, state_id: ${selectedStateId}`);
        } catch (error) {
          console.error('❌ Error loading cities:', error);
          setCities([]);
        } finally {
          setLoadingCities(false);
        }
      } else {
        setCities([]);
        setLoadingCities(false);
      }
    }
    loadCities();
  }, [selectedStateId, selectedCountryId]);

  return {
    states,
    cities,
    loading: loadingStates || loadingCities
  };
}