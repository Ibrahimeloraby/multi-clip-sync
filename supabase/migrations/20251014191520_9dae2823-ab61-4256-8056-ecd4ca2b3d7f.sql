-- Fix search path for update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix search path for generate_time_code function
CREATE OR REPLACE FUNCTION generate_time_code(session_uuid UUID, device_uuid TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHHMM');
  random_part := SUBSTRING(MD5(session_uuid::TEXT || device_uuid || NOW()::TEXT) FROM 1 FOR 4);
  RETURN 'TC-' || timestamp_part || '-' || UPPER(random_part);
END;
$$;