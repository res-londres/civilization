-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.players (
  full_id text NOT NULL,
  socket_id text,
  display_name text NOT NULL,
  efficiency integer,
  mastery integer,
  artistry integer,
  inventory jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT players_pkey PRIMARY KEY (full_id)
);
CREATE TABLE public.resources (
  name text NOT NULL,
  display_name text NOT NULL,
  amount numeric NOT NULL,
  min_amount numeric NOT NULL,
  max_amount numeric NOT NULL,
  base_recovery_rate numeric NOT NULL,
  recovery_rate numeric NOT NULL,
  recovery_base numeric NOT NULL,
  base_gathering_time integer NOT NULL,
  base_yield numeric NOT NULL,
  gatherers integer NOT NULL DEFAULT 0,
  tool_requirements jsonb DEFAULT '[]'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT resources_pkey PRIMARY KEY (name)
);
