-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: Participants
CREATE TABLE public.participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Participant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enum: Meal Type
CREATE TYPE public.meal_type AS ENUM ('high_tea', 'lunch', 'dinner');

-- Table: Meal Usage
CREATE TABLE public.meal_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
    meal_type public.meal_type NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_participant_meal UNIQUE (participant_id, meal_type)
);

-- Table: Scan Logs
CREATE TABLE public.scan_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
    meal_type public.meal_type NOT NULL,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scanned_by TEXT,
    status TEXT NOT NULL -- 'success', 'already_used', 'invalid'
);

-- =======================================================
-- Row-Level Security (RLS) configuration
-- =======================================================
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

-- Assuming Edge Functions will use SERVICE_ROLE for mutations, and users authenticate simply via our app.
-- To allow the dashboard to fetch stats and basic reads:
CREATE POLICY "Allow authenticated read access" ON public.participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON public.meal_usage FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON public.scan_logs FOR SELECT TO authenticated USING (true);

-- Trigger to automatically create meal_usage entries when a participant is added
CREATE OR REPLACE FUNCTION public.create_meal_usages() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.meal_usage (participant_id, meal_type) VALUES (NEW.id, 'high_tea');
    INSERT INTO public.meal_usage (participant_id, meal_type) VALUES (NEW.id, 'lunch');
    INSERT INTO public.meal_usage (participant_id, meal_type) VALUES (NEW.id, 'dinner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_participant_created
    AFTER INSERT ON public.participants
    FOR EACH ROW EXECUTE PROCEDURE public.create_meal_usages();
