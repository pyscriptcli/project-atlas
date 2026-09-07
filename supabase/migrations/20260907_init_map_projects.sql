-- Create map_projects table
CREATE TABLE IF NOT EXISTS public.map_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Untitled Project',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    basemap TEXT NOT NULL DEFAULT 'Midnight Blue',
    center JSONB NOT NULL DEFAULT '[120.9842, 14.5995]'::jsonb,
    zoom NUMERIC NOT NULL DEFAULT 14,
    pitch NUMERIC NOT NULL DEFAULT 60,
    bearing NUMERIC NOT NULL DEFAULT -15,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    custom_groups JSONB NOT NULL DEFAULT '{"Trade Area Scan": {"collapsed": false, "ids": []}}'::jsonb,
    layer_visibilities JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.map_projects ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for demo / anon access (can be restricted to auth.uid() later)
CREATE POLICY "Allow public read access" ON public.map_projects
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON public.map_projects
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON public.map_projects
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON public.map_projects
    FOR DELETE USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_map_projects_updated_at ON public.map_projects(updated_at DESC);
