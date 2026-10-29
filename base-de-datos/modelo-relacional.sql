--
-- PostgreSQL database dump
--

\restrict u13TIg4iXYhBJZvIqZC5fqJilhsHjYGBQDq7hTbEIcUCwqeAQeb6eVL3O2DBers

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: expert_consultation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_consultation (
    id text NOT NULL,
    customer_id text,
    answers jsonb NOT NULL,
    facts jsonb,
    trace jsonb,
    budget real,
    total_recommended real,
    rating integer,
    feedback text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: expert_consultation_result; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_consultation_result (
    id text NOT NULL,
    certainty real NOT NULL,
    status text NOT NULL,
    rank integer DEFAULT 0 NOT NULL,
    product_ids jsonb,
    selected_product_id text,
    reasons jsonb,
    consultation_id text NOT NULL,
    hypothesis_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT expert_consultation_result_status_check CHECK ((status = ANY (ARRAY['recommended'::text, 'optional'::text, 'rejected'::text, 'advice'::text])))
);


--
-- Name: expert_hypothesis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_hypothesis (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    kind text DEFAULT 'product'::text NOT NULL,
    product_match jsonb,
    usage text,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT expert_hypothesis_kind_check CHECK ((kind = ANY (ARRAY['product'::text, 'advice'::text])))
);


--
-- Name: expert_rule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_rule (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    conclusion_type text NOT NULL,
    hypothesis_id text,
    conclusion_variable_id text,
    conclusion_value text,
    certainty real NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    explanation text NOT NULL,
    source text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT expert_rule_conclusion_type_check CHECK ((conclusion_type = ANY (ARRAY['hypothesis'::text, 'fact'::text])))
);


--
-- Name: expert_rule_condition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_rule_condition (
    id text NOT NULL,
    operator text NOT NULL,
    value text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    rule_id text NOT NULL,
    variable_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT expert_rule_condition_operator_check CHECK ((operator = ANY (ARRAY['eq'::text, 'neq'::text, 'in'::text, 'not_in'::text, 'gt'::text, 'gte'::text, 'lt'::text, 'lte'::text, 'contains'::text, 'not_contains'::text])))
);


--
-- Name: expert_variable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_variable (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    question text,
    help text,
    kind text DEFAULT 'input'::text NOT NULL,
    input_type text DEFAULT 'single'::text NOT NULL,
    unit text,
    min_value real,
    max_value real,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT expert_variable_input_type_check CHECK ((input_type = ANY (ARRAY['single'::text, 'multi'::text, 'number'::text]))),
    CONSTRAINT expert_variable_kind_check CHECK ((kind = ANY (ARRAY['input'::text, 'derived'::text])))
);


--
-- Name: expert_variable_option; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_variable_option (
    id text NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    variable_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: expert_consultation expert_consultation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_consultation
    ADD CONSTRAINT expert_consultation_pkey PRIMARY KEY (id);


--
-- Name: expert_consultation_result expert_consultation_result_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_consultation_result
    ADD CONSTRAINT expert_consultation_result_pkey PRIMARY KEY (id);


--
-- Name: expert_hypothesis expert_hypothesis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_hypothesis
    ADD CONSTRAINT expert_hypothesis_pkey PRIMARY KEY (id);


--
-- Name: expert_rule_condition expert_rule_condition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_rule_condition
    ADD CONSTRAINT expert_rule_condition_pkey PRIMARY KEY (id);


--
-- Name: expert_rule expert_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_rule
    ADD CONSTRAINT expert_rule_pkey PRIMARY KEY (id);


--
-- Name: expert_variable_option expert_variable_option_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_variable_option
    ADD CONSTRAINT expert_variable_option_pkey PRIMARY KEY (id);


--
-- Name: expert_variable expert_variable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_variable
    ADD CONSTRAINT expert_variable_pkey PRIMARY KEY (id);


--
-- Name: IDX_expert_consultation_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_consultation_deleted_at" ON public.expert_consultation USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_consultation_result_consultation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_consultation_result_consultation_id" ON public.expert_consultation_result USING btree (consultation_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_consultation_result_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_consultation_result_deleted_at" ON public.expert_consultation_result USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_consultation_result_hypothesis_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_consultation_result_hypothesis_id" ON public.expert_consultation_result USING btree (hypothesis_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_hypothesis_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_expert_hypothesis_code_unique" ON public.expert_hypothesis USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_hypothesis_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_hypothesis_deleted_at" ON public.expert_hypothesis USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_rule_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_expert_rule_code_unique" ON public.expert_rule USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_rule_conclusion_variable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_rule_conclusion_variable_id" ON public.expert_rule USING btree (conclusion_variable_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_rule_condition_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_rule_condition_deleted_at" ON public.expert_rule_condition USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_rule_condition_rule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_rule_condition_rule_id" ON public.expert_rule_condition USING btree (rule_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_rule_condition_variable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_rule_condition_variable_id" ON public.expert_rule_condition USING btree (variable_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_rule_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_rule_deleted_at" ON public.expert_rule USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_rule_hypothesis_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_rule_hypothesis_id" ON public.expert_rule USING btree (hypothesis_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_variable_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_expert_variable_code_unique" ON public.expert_variable USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_variable_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_variable_deleted_at" ON public.expert_variable USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_variable_option_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_variable_option_deleted_at" ON public.expert_variable_option USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: IDX_expert_variable_option_variable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_expert_variable_option_variable_id" ON public.expert_variable_option USING btree (variable_id) WHERE (deleted_at IS NULL);


--
-- Name: expert_consultation_result expert_consultation_result_consultation_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_consultation_result
    ADD CONSTRAINT expert_consultation_result_consultation_id_foreign FOREIGN KEY (consultation_id) REFERENCES public.expert_consultation(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expert_consultation_result expert_consultation_result_hypothesis_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_consultation_result
    ADD CONSTRAINT expert_consultation_result_hypothesis_id_foreign FOREIGN KEY (hypothesis_id) REFERENCES public.expert_hypothesis(id) ON UPDATE CASCADE;


--
-- Name: expert_rule expert_rule_conclusion_variable_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_rule
    ADD CONSTRAINT expert_rule_conclusion_variable_id_foreign FOREIGN KEY (conclusion_variable_id) REFERENCES public.expert_variable(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expert_rule_condition expert_rule_condition_rule_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_rule_condition
    ADD CONSTRAINT expert_rule_condition_rule_id_foreign FOREIGN KEY (rule_id) REFERENCES public.expert_rule(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expert_rule_condition expert_rule_condition_variable_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_rule_condition
    ADD CONSTRAINT expert_rule_condition_variable_id_foreign FOREIGN KEY (variable_id) REFERENCES public.expert_variable(id) ON UPDATE CASCADE;


--
-- Name: expert_rule expert_rule_hypothesis_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_rule
    ADD CONSTRAINT expert_rule_hypothesis_id_foreign FOREIGN KEY (hypothesis_id) REFERENCES public.expert_hypothesis(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expert_variable_option expert_variable_option_variable_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_variable_option
    ADD CONSTRAINT expert_variable_option_variable_id_foreign FOREIGN KEY (variable_id) REFERENCES public.expert_variable(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict u13TIg4iXYhBJZvIqZC5fqJilhsHjYGBQDq7hTbEIcUCwqeAQeb6eVL3O2DBers

