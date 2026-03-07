--
-- PostgreSQL database dump
--

\restrict DBXowttvckoLDSKIboej2CfICZDLbCCJkoKEbB3D8N2pwFYnVaF9yNTMakXCV41

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: booking_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_kind AS ENUM (
    'slot',
    'inquiry'
);


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'confirmed',
    'cancelled',
    'completed'
);


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: availability_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trainer_id uuid NOT NULL,
    service_id uuid,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    capacity integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT slot_time_ok CHECK ((end_at > start_at))
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id uuid NOT NULL,
    status public.booking_status DEFAULT 'pending'::public.booking_status NOT NULL,
    customer_name text NOT NULL,
    customer_phone text,
    customer_email text,
    requested_start timestamp with time zone,
    requested_end timestamp with time zone,
    notes text,
    source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    slot_id uuid,
    kind public.booking_kind DEFAULT 'inquiry'::public.booking_kind NOT NULL,
    start_at timestamp with time zone,
    end_at timestamp with time zone
);


--
-- Name: notification_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: trainers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: availability_slots availability_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: notification_outbox notification_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT notification_outbox_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: services services_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_slug_key UNIQUE (slug);


--
-- Name: trainers trainers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_pkey PRIMARY KEY (id);


--
-- Name: trainers trainers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_user_id_key UNIQUE (user_id);


--
-- Name: bookings_requested_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_requested_start_idx ON public.bookings USING btree (requested_start);


--
-- Name: bookings_service_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_service_id_idx ON public.bookings USING btree (service_id);


--
-- Name: bookings_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_status_idx ON public.bookings USING btree (status);


--
-- Name: bookings_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_time_idx ON public.bookings USING btree (start_at, end_at) WHERE (status = ANY (ARRAY['pending'::public.booking_status, 'confirmed'::public.booking_status]));


--
-- Name: outbox_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX outbox_status_idx ON public.notification_outbox USING btree (status);


--
-- Name: slots_service_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX slots_service_idx ON public.availability_slots USING btree (service_id);


--
-- Name: slots_start_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX slots_start_idx ON public.availability_slots USING btree (start_at);


--
-- Name: slots_trainer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX slots_trainer_idx ON public.availability_slots USING btree (trainer_id);


--
-- Name: bookings trg_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: services trg_services_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: availability_slots trg_slots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_slots_updated_at BEFORE UPDATE ON public.availability_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: availability_slots availability_slots_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: availability_slots availability_slots_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.availability_slots(id) ON DELETE SET NULL;


--
-- Name: notification_outbox notification_outbox_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_outbox
    ADD CONSTRAINT notification_outbox_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings public can create booking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public can create booking" ON public.bookings FOR INSERT TO anon WITH CHECK (true);


--
-- PostgreSQL database dump complete
--

\unrestrict DBXowttvckoLDSKIboej2CfICZDLbCCJkoKEbB3D8N2pwFYnVaF9yNTMakXCV41

