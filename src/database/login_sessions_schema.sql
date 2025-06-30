-- Create login_sessions table to track user login locations
CREATE TABLE IF NOT EXISTS public.login_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    ip_address VARCHAR(45), -- IPv6 can be up to 45 characters
    user_agent TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    device_type VARCHAR(20) CHECK (device_type IN ('Desktop', 'Mobile', 'Tablet')),
    browser VARCHAR(50),
    os VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON public.login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_login_time ON public.login_sessions(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_sessions_country ON public.login_sessions(country);
CREATE INDEX IF NOT EXISTS idx_login_sessions_device_type ON public.login_sessions(device_type);

-- Enable Row Level Security
ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for login_sessions table
CREATE POLICY "Enable read access for authenticated users" ON public.login_sessions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.login_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for superadmin users" ON public.login_sessions
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'superadmin'
        )
    );

-- Create trigger for updated_at (if needed in the future)
CREATE OR REPLACE FUNCTION update_login_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create view for easy access to login sessions with user details
CREATE OR REPLACE VIEW public.login_sessions_with_users AS
SELECT 
    ls.id,
    ls.user_id,
    ls.login_time,
    ls.ip_address,
    ls.user_agent,
    ls.latitude,
    ls.longitude,
    ls.address,
    ls.city,
    ls.state,
    ls.country,
    ls.postal_code,
    ls.device_type,
    ls.browser,
    ls.os,
    ls.created_at,
    up.email,
    up.username,
    up.first_name,
    up.last_name,
    up.role
FROM public.login_sessions ls
JOIN public.user_profiles up ON ls.user_id = up.id;

-- Create function to get login statistics
CREATE OR REPLACE FUNCTION get_login_stats()
RETURNS TABLE (
    total_sessions BIGINT,
    last_24h BIGINT,
    last_7d BIGINT,
    last_30d BIGINT,
    unique_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_sessions,
        COUNT(*) FILTER (WHERE login_time > NOW() - INTERVAL '24 hours')::BIGINT as last_24h,
        COUNT(*) FILTER (WHERE login_time > NOW() - INTERVAL '7 days')::BIGINT as last_7d,
        COUNT(*) FILTER (WHERE login_time > NOW() - INTERVAL '30 days')::BIGINT as last_30d,
        COUNT(DISTINCT user_id)::BIGINT as unique_users
    FROM public.login_sessions;
END;
$$ LANGUAGE plpgsql;

-- Example queries for reference:

-- Get recent login sessions for a specific user
-- SELECT * FROM public.login_sessions 
-- WHERE user_id = 'user-uuid' 
-- ORDER BY login_time DESC 
-- LIMIT 10;

-- Get all recent login sessions with user details
-- SELECT * FROM public.login_sessions_with_users 
-- ORDER BY login_time DESC 
-- LIMIT 50;

-- Get login statistics
-- SELECT * FROM get_login_stats();

-- Get login sessions by location
-- SELECT city, country, COUNT(*) as login_count 
-- FROM public.login_sessions 
-- GROUP BY city, country 
-- ORDER BY login_count DESC;

-- Get device type distribution
-- SELECT device_type, COUNT(*) as count 
-- FROM public.login_sessions 
-- GROUP BY device_type 
-- ORDER BY count DESC; 