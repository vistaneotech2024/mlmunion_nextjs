-- Add comprehensive India states and cities data

-- Add more Indian states
WITH country AS (SELECT id FROM countries WHERE code = 'IN')
INSERT INTO states (name, code, country_id) VALUES
-- Existing states (will be skipped due to ON CONFLICT)
('Maharashtra', 'MH', (SELECT id FROM country)),
('Delhi', 'DL', (SELECT id FROM country)),
('Karnataka', 'KA', (SELECT id FROM country)),
('Tamil Nadu', 'TN', (SELECT id FROM country)),
('Uttar Pradesh', 'UP', (SELECT id FROM country)),
-- Additional major Indian states
('Gujarat', 'GJ', (SELECT id FROM country)),
('Rajasthan', 'RJ', (SELECT id FROM country)),
('West Bengal', 'WB', (SELECT id FROM country)),
('Madhya Pradesh', 'MP', (SELECT id FROM country)),
('Punjab', 'PB', (SELECT id FROM country)),
('Haryana', 'HR', (SELECT id FROM country)),
('Bihar', 'BR', (SELECT id FROM country)),
('Andhra Pradesh', 'AP', (SELECT id FROM country)),
('Telangana', 'TS', (SELECT id FROM country)),
('Kerala', 'KL', (SELECT id FROM country)),
('Odisha', 'OD', (SELECT id FROM country)),
('Assam', 'AS', (SELECT id FROM country)),
('Jharkhand', 'JH', (SELECT id FROM country)),
('Chhattisgarh', 'CT', (SELECT id FROM country)),
('Uttarakhand', 'UK', (SELECT id FROM country)),
('Himachal Pradesh', 'HP', (SELECT id FROM country)),
('Goa', 'GA', (SELECT id FROM country)),
('Jammu and Kashmir', 'JK', (SELECT id FROM country))
ON CONFLICT (country_id, code) DO NOTHING;

-- Add cities for Maharashtra
WITH mh AS (SELECT id FROM states WHERE code = 'MH')
INSERT INTO cities (name, state_id) VALUES
('Mumbai', (SELECT id FROM mh)),
('Pune', (SELECT id FROM mh)),
('Nagpur', (SELECT id FROM mh)),
('Nashik', (SELECT id FROM mh)),
('Aurangabad', (SELECT id FROM mh)),
('Solapur', (SELECT id FROM mh)),
('Thane', (SELECT id FROM mh)),
('Kalyan', (SELECT id FROM mh))
ON CONFLICT DO NOTHING;

-- Add cities for Delhi
WITH dl AS (SELECT id FROM states WHERE code = 'DL')
INSERT INTO cities (name, state_id) VALUES
('New Delhi', (SELECT id FROM dl)),
('North Delhi', (SELECT id FROM dl)),
('South Delhi', (SELECT id FROM dl)),
('East Delhi', (SELECT id FROM dl)),
('West Delhi', (SELECT id FROM dl)),
('Central Delhi', (SELECT id FROM dl))
ON CONFLICT DO NOTHING;

-- Add cities for Karnataka
WITH ka AS (SELECT id FROM states WHERE code = 'KA')
INSERT INTO cities (name, state_id) VALUES
('Bangalore', (SELECT id FROM ka)),
('Mysore', (SELECT id FROM ka)),
('Hubli', (SELECT id FROM ka)),
('Mangalore', (SELECT id FROM ka)),
('Belgaum', (SELECT id FROM ka)),
('Gulbarga', (SELECT id FROM ka)),
('Davangere', (SELECT id FROM ka))
ON CONFLICT DO NOTHING;

-- Add cities for Tamil Nadu
WITH tn AS (SELECT id FROM states WHERE code = 'TN')
INSERT INTO cities (name, state_id) VALUES
('Chennai', (SELECT id FROM tn)),
('Coimbatore', (SELECT id FROM tn)),
('Madurai', (SELECT id FROM tn)),
('Tiruchirappalli', (SELECT id FROM tn)),
('Salem', (SELECT id FROM tn)),
('Tirunelveli', (SELECT id FROM tn)),
('Erode', (SELECT id FROM tn))
ON CONFLICT DO NOTHING;

-- Add cities for Uttar Pradesh
WITH up AS (SELECT id FROM states WHERE code = 'UP')
INSERT INTO cities (name, state_id) VALUES
('Lucknow', (SELECT id FROM up)),
('Kanpur', (SELECT id FROM up)),
('Varanasi', (SELECT id FROM up)),
('Agra', (SELECT id FROM up)),
('Allahabad', (SELECT id FROM up)),
('Meerut', (SELECT id FROM up)),
('Ghaziabad', (SELECT id FROM up)),
('Noida', (SELECT id FROM up))
ON CONFLICT DO NOTHING;

-- Add cities for Gujarat
WITH gj AS (SELECT id FROM states WHERE code = 'GJ')
INSERT INTO cities (name, state_id) VALUES
('Ahmedabad', (SELECT id FROM gj)),
('Surat', (SELECT id FROM gj)),
('Vadodara', (SELECT id FROM gj)),
('Rajkot', (SELECT id FROM gj)),
('Bhavnagar', (SELECT id FROM gj)),
('Jamnagar', (SELECT id FROM gj))
ON CONFLICT DO NOTHING;

-- Add cities for Rajasthan
WITH rj AS (SELECT id FROM states WHERE code = 'RJ')
INSERT INTO cities (name, state_id) VALUES
('Jaipur', (SELECT id FROM rj)),
('Jodhpur', (SELECT id FROM rj)),
('Kota', (SELECT id FROM rj)),
('Bikaner', (SELECT id FROM rj)),
('Ajmer', (SELECT id FROM rj)),
('Udaipur', (SELECT id FROM rj))
ON CONFLICT DO NOTHING;

-- Add cities for West Bengal
WITH wb AS (SELECT id FROM states WHERE code = 'WB')
INSERT INTO cities (name, state_id) VALUES
('Kolkata', (SELECT id FROM wb)),
('Howrah', (SELECT id FROM wb)),
('Durgapur', (SELECT id FROM wb)),
('Asansol', (SELECT id FROM wb)),
('Siliguri', (SELECT id FROM wb))
ON CONFLICT DO NOTHING;

-- Add cities for Madhya Pradesh
WITH mp AS (SELECT id FROM states WHERE code = 'MP')
INSERT INTO cities (name, state_id) VALUES
('Indore', (SELECT id FROM mp)),
('Bhopal', (SELECT id FROM mp)),
('Gwalior', (SELECT id FROM mp)),
('Jabalpur', (SELECT id FROM mp)),
('Ujjain', (SELECT id FROM mp))
ON CONFLICT DO NOTHING;

-- Add cities for Punjab
WITH pb AS (SELECT id FROM states WHERE code = 'PB')
INSERT INTO cities (name, state_id) VALUES
('Ludhiana', (SELECT id FROM pb)),
('Amritsar', (SELECT id FROM pb)),
('Jalandhar', (SELECT id FROM pb)),
('Patiala', (SELECT id FROM pb)),
('Bathinda', (SELECT id FROM pb))
ON CONFLICT DO NOTHING;

-- Add cities for Haryana
WITH hr AS (SELECT id FROM states WHERE code = 'HR')
INSERT INTO cities (name, state_id) VALUES
('Gurgaon', (SELECT id FROM hr)),
('Faridabad', (SELECT id FROM hr)),
('Panipat', (SELECT id FROM hr)),
('Ambala', (SELECT id FROM hr)),
('Yamunanagar', (SELECT id FROM hr))
ON CONFLICT DO NOTHING;

-- Add cities for Bihar
WITH br AS (SELECT id FROM states WHERE code = 'BR')
INSERT INTO cities (name, state_id) VALUES
('Patna', (SELECT id FROM br)),
('Gaya', (SELECT id FROM br)),
('Bhagalpur', (SELECT id FROM br)),
('Muzaffarpur', (SELECT id FROM br)),
('Purnia', (SELECT id FROM br))
ON CONFLICT DO NOTHING;

-- Add cities for Andhra Pradesh
WITH ap AS (SELECT id FROM states WHERE code = 'AP')
INSERT INTO cities (name, state_id) VALUES
('Visakhapatnam', (SELECT id FROM ap)),
('Vijayawada', (SELECT id FROM ap)),
('Guntur', (SELECT id FROM ap)),
('Nellore', (SELECT id FROM ap)),
('Kurnool', (SELECT id FROM ap))
ON CONFLICT DO NOTHING;

-- Add cities for Telangana
WITH ts AS (SELECT id FROM states WHERE code = 'TS')
INSERT INTO cities (name, state_id) VALUES
('Hyderabad', (SELECT id FROM ts)),
('Warangal', (SELECT id FROM ts)),
('Nizamabad', (SELECT id FROM ts)),
('Karimnagar', (SELECT id FROM ts)),
('Ramagundam', (SELECT id FROM ts))
ON CONFLICT DO NOTHING;

-- Add cities for Kerala
WITH kl AS (SELECT id FROM states WHERE code = 'KL')
INSERT INTO cities (name, state_id) VALUES
('Kochi', (SELECT id FROM kl)),
('Thiruvananthapuram', (SELECT id FROM kl)),
('Kozhikode', (SELECT id FROM kl)),
('Thrissur', (SELECT id FROM kl)),
('Kollam', (SELECT id FROM kl))
ON CONFLICT DO NOTHING;

-- Add cities for Odisha
WITH od AS (SELECT id FROM states WHERE code = 'OD')
INSERT INTO cities (name, state_id) VALUES
('Bhubaneswar', (SELECT id FROM od)),
('Cuttack', (SELECT id FROM od)),
('Rourkela', (SELECT id FROM od)),
('Berhampur', (SELECT id FROM od)),
('Sambalpur', (SELECT id FROM od))
ON CONFLICT DO NOTHING;

-- Add cities for Assam
WITH as_state AS (SELECT id FROM states WHERE code = 'AS')
INSERT INTO cities (name, state_id) VALUES
('Guwahati', (SELECT id FROM as_state)),
('Silchar', (SELECT id FROM as_state)),
('Dibrugarh', (SELECT id FROM as_state)),
('Jorhat', (SELECT id FROM as_state)),
('Nagaon', (SELECT id FROM as_state))
ON CONFLICT DO NOTHING;

-- Add cities for Jharkhand
WITH jh AS (SELECT id FROM states WHERE code = 'JH')
INSERT INTO cities (name, state_id) VALUES
('Ranchi', (SELECT id FROM jh)),
('Jamshedpur', (SELECT id FROM jh)),
('Dhanbad', (SELECT id FROM jh)),
('Bokaro', (SELECT id FROM jh)),
('Hazaribagh', (SELECT id FROM jh))
ON CONFLICT DO NOTHING;

-- Add cities for Chhattisgarh
WITH ct AS (SELECT id FROM states WHERE code = 'CT')
INSERT INTO cities (name, state_id) VALUES
('Raipur', (SELECT id FROM ct)),
('Bhilai', (SELECT id FROM ct)),
('Bilaspur', (SELECT id FROM ct)),
('Durg', (SELECT id FROM ct)),
('Korba', (SELECT id FROM ct))
ON CONFLICT DO NOTHING;

-- Add cities for Uttarakhand
WITH uk AS (SELECT id FROM states WHERE code = 'UK')
INSERT INTO cities (name, state_id) VALUES
('Dehradun', (SELECT id FROM uk)),
('Haridwar', (SELECT id FROM uk)),
('Roorkee', (SELECT id FROM uk)),
('Haldwani', (SELECT id FROM uk)),
('Rudrapur', (SELECT id FROM uk))
ON CONFLICT DO NOTHING;

-- Add cities for Himachal Pradesh
WITH hp AS (SELECT id FROM states WHERE code = 'HP')
INSERT INTO cities (name, state_id) VALUES
('Shimla', (SELECT id FROM hp)),
('Dharamshala', (SELECT id FROM hp)),
('Solan', (SELECT id FROM hp)),
('Mandi', (SELECT id FROM hp)),
('Kullu', (SELECT id FROM hp))
ON CONFLICT DO NOTHING;

-- Add cities for Goa
WITH ga AS (SELECT id FROM states WHERE code = 'GA')
INSERT INTO cities (name, state_id) VALUES
('Panaji', (SELECT id FROM ga)),
('Vasco da Gama', (SELECT id FROM ga)),
('Margao', (SELECT id FROM ga)),
('Mapusa', (SELECT id FROM ga)),
('Ponda', (SELECT id FROM ga))
ON CONFLICT DO NOTHING;

-- Add cities for Jammu and Kashmir
WITH jk AS (SELECT id FROM states WHERE code = 'JK')
INSERT INTO cities (name, state_id) VALUES
('Srinagar', (SELECT id FROM jk)),
('Jammu', (SELECT id FROM jk)),
('Anantnag', (SELECT id FROM jk)),
('Baramulla', (SELECT id FROM jk)),
('Sopore', (SELECT id FROM jk))
ON CONFLICT DO NOTHING;

