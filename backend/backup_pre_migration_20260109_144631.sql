--
-- PostgreSQL database dump
--

\restrict HlAaokwwG7braXyNEk6A1kbwcaSUMNCNtAHDY7nw8lBuGWOixxBQABsGe8kVgsC

-- Dumped from database version 17.7 (Debian 17.7-3.pgdg13+1)
-- Dumped by pg_dump version 17.6 (Debian 17.6-0+deb13u1)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    subdomain character varying(100),
    is_active boolean NOT NULL,
    settings json NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.accounts OWNER TO administrador;

--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_id_seq OWNER TO administrador;

--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: activities; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.activities (
    id integer NOT NULL,
    card_id integer NOT NULL,
    user_id integer,
    activity_type character varying(50) NOT NULL,
    description text NOT NULL,
    activity_metadata json NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.activities OWNER TO administrador;

--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activities_id_seq OWNER TO administrador;

--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO administrador;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    account_id integer NOT NULL,
    action character varying(50) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id integer,
    description text NOT NULL,
    data_before json,
    data_after json,
    ip_address character varying(45),
    user_agent character varying(500),
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO administrador;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO administrador;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: automation_executions; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.automation_executions (
    id integer NOT NULL,
    automation_id integer NOT NULL,
    card_id integer,
    triggered_by_id integer,
    status character varying(20) NOT NULL,
    started_at timestamp without time zone NOT NULL,
    completed_at timestamp without time zone,
    duration_ms double precision,
    execution_data json NOT NULL,
    error_message text,
    error_stack text
);


ALTER TABLE public.automation_executions OWNER TO administrador;

--
-- Name: automation_executions_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.automation_executions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.automation_executions_id_seq OWNER TO administrador;

--
-- Name: automation_executions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.automation_executions_id_seq OWNED BY public.automation_executions.id;


--
-- Name: automations; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.automations (
    id integer NOT NULL,
    account_id integer NOT NULL,
    board_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    automation_type character varying(20) NOT NULL,
    is_active boolean NOT NULL,
    priority integer NOT NULL,
    trigger_event character varying(50),
    trigger_conditions json,
    schedule_type character varying(20),
    scheduled_at timestamp without time zone,
    recurrence_pattern character varying(20),
    next_run_at timestamp without time zone,
    actions json NOT NULL,
    execution_count integer NOT NULL,
    last_run_at timestamp without time zone,
    failure_count integer NOT NULL,
    auto_disable_on_failures integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.automations OWNER TO administrador;

--
-- Name: automations_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.automations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.automations_id_seq OWNER TO administrador;

--
-- Name: automations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.automations_id_seq OWNED BY public.automations.id;


--
-- Name: boards; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.boards (
    id integer NOT NULL,
    account_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    settings json NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone,
    is_deleted boolean NOT NULL
);


ALTER TABLE public.boards OWNER TO administrador;

--
-- Name: boards_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.boards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.boards_id_seq OWNER TO administrador;

--
-- Name: boards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.boards_id_seq OWNED BY public.boards.id;


--
-- Name: card_field_values; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.card_field_values (
    id integer NOT NULL,
    card_id integer NOT NULL,
    field_definition_id integer NOT NULL,
    value text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.card_field_values OWNER TO administrador;

--
-- Name: card_field_values_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.card_field_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.card_field_values_id_seq OWNER TO administrador;

--
-- Name: card_field_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.card_field_values_id_seq OWNED BY public.card_field_values.id;


--
-- Name: card_transfers; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.card_transfers (
    id integer NOT NULL,
    card_id integer NOT NULL,
    from_user_id integer,
    to_user_id integer NOT NULL,
    reason character varying(100) NOT NULL,
    notes text,
    status character varying(20) NOT NULL,
    is_batch_transfer boolean NOT NULL,
    batch_id character varying(50),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.card_transfers OWNER TO administrador;

--
-- Name: card_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.card_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.card_transfers_id_seq OWNER TO administrador;

--
-- Name: card_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.card_transfers_id_seq OWNED BY public.card_transfers.id;


--
-- Name: cards; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.cards (
    id integer NOT NULL,
    list_id integer NOT NULL,
    assigned_to_id integer,
    title character varying(500) NOT NULL,
    description text,
    "position" integer NOT NULL,
    value numeric(12,2),
    currency character varying(3) NOT NULL,
    due_date timestamp without time zone,
    closed_at timestamp without time zone,
    is_won integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone,
    is_deleted boolean NOT NULL,
    contact_info json,
    client_id integer
);


ALTER TABLE public.cards OWNER TO administrador;

--
-- Name: cards_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cards_id_seq OWNER TO administrador;

--
-- Name: cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.cards_id_seq OWNED BY public.cards.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    account_id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(20),
    company_name character varying(255),
    document character varying(20),
    address text,
    city character varying(100),
    state character varying(2),
    country character varying(100) DEFAULT 'Brasil'::character varying,
    website character varying(255),
    notes text,
    source character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false NOT NULL
);


ALTER TABLE public.clients OWNER TO administrador;

--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO administrador;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: field_definitions; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.field_definitions (
    id integer NOT NULL,
    board_id integer NOT NULL,
    name character varying(255) NOT NULL,
    field_type character varying(50) NOT NULL,
    is_required boolean NOT NULL,
    is_unique boolean NOT NULL,
    "position" integer NOT NULL,
    placeholder character varying(255),
    help_text text,
    options json,
    validations json,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.field_definitions OWNER TO administrador;

--
-- Name: field_definitions_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.field_definitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.field_definitions_id_seq OWNER TO administrador;

--
-- Name: field_definitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.field_definitions_id_seq OWNED BY public.field_definitions.id;


--
-- Name: gamification_badges; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.gamification_badges (
    id integer NOT NULL,
    account_id integer,
    name character varying(255) NOT NULL,
    description text,
    icon_url character varying(500),
    is_system_badge boolean NOT NULL,
    criteria_type character varying(50) NOT NULL,
    criteria json,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.gamification_badges OWNER TO administrador;

--
-- Name: gamification_badges_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.gamification_badges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gamification_badges_id_seq OWNER TO administrador;

--
-- Name: gamification_badges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.gamification_badges_id_seq OWNED BY public.gamification_badges.id;


--
-- Name: gamification_points; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.gamification_points (
    id integer NOT NULL,
    user_id integer NOT NULL,
    points integer NOT NULL,
    reason character varying(100) NOT NULL,
    description text,
    related_entity_type character varying(50),
    related_entity_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.gamification_points OWNER TO administrador;

--
-- Name: gamification_points_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.gamification_points_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gamification_points_id_seq OWNER TO administrador;

--
-- Name: gamification_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.gamification_points_id_seq OWNED BY public.gamification_points.id;


--
-- Name: gamification_rankings; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.gamification_rankings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    period_type character varying(20) NOT NULL,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    rank integer NOT NULL,
    points integer NOT NULL,
    cards_won integer NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    account_id integer NOT NULL
);


ALTER TABLE public.gamification_rankings OWNER TO administrador;

--
-- Name: gamification_rankings_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.gamification_rankings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gamification_rankings_id_seq OWNER TO administrador;

--
-- Name: gamification_rankings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.gamification_rankings_id_seq OWNED BY public.gamification_rankings.id;


--
-- Name: lists; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.lists (
    id integer NOT NULL,
    board_id integer NOT NULL,
    name character varying(255) NOT NULL,
    "position" integer NOT NULL,
    is_done_stage boolean NOT NULL,
    is_lost_stage boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.lists OWNER TO administrador;

--
-- Name: lists_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.lists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lists_id_seq OWNER TO administrador;

--
-- Name: lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.lists_id_seq OWNED BY public.lists.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    notification_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    icon character varying(50),
    color character varying(20),
    notification_metadata json NOT NULL,
    is_read boolean NOT NULL,
    read_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.notifications OWNER TO administrador;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO administrador;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description character varying(500),
    permissions json NOT NULL,
    is_system_role boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.roles OWNER TO administrador;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO administrador;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: transfer_approvals; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.transfer_approvals (
    id integer NOT NULL,
    transfer_id integer NOT NULL,
    approver_id integer,
    status character varying(20) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    decided_at timestamp without time zone,
    comments text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.transfer_approvals OWNER TO administrador;

--
-- Name: transfer_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.transfer_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transfer_approvals_id_seq OWNER TO administrador;

--
-- Name: transfer_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.transfer_approvals_id_seq OWNED BY public.transfer_approvals.id;


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.user_badges (
    id integer NOT NULL,
    user_id integer NOT NULL,
    badge_id integer NOT NULL,
    awarded_by_id integer,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.user_badges OWNER TO administrador;

--
-- Name: user_badges_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.user_badges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_badges_id_seq OWNER TO administrador;

--
-- Name: user_badges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.user_badges_id_seq OWNED BY public.user_badges.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: administrador
--

CREATE TABLE public.users (
    id integer NOT NULL,
    account_id integer NOT NULL,
    role_id integer NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(100),
    name character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean NOT NULL,
    is_verified boolean NOT NULL,
    last_login_at timestamp without time zone,
    password_changed_at timestamp without time zone,
    avatar_url character varying(500),
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone,
    is_deleted boolean NOT NULL,
    phone character varying(20),
    reset_token character varying(255),
    reset_token_expires_at timestamp without time zone
);


ALTER TABLE public.users OWNER TO administrador;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: administrador
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO administrador;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: administrador
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: automation_executions id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.automation_executions ALTER COLUMN id SET DEFAULT nextval('public.automation_executions_id_seq'::regclass);


--
-- Name: automations id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.automations ALTER COLUMN id SET DEFAULT nextval('public.automations_id_seq'::regclass);


--
-- Name: boards id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.boards ALTER COLUMN id SET DEFAULT nextval('public.boards_id_seq'::regclass);


--
-- Name: card_field_values id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.card_field_values ALTER COLUMN id SET DEFAULT nextval('public.card_field_values_id_seq'::regclass);


--
-- Name: card_transfers id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.card_transfers ALTER COLUMN id SET DEFAULT nextval('public.card_transfers_id_seq'::regclass);


--
-- Name: cards id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.cards ALTER COLUMN id SET DEFAULT nextval('public.cards_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: field_definitions id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.field_definitions ALTER COLUMN id SET DEFAULT nextval('public.field_definitions_id_seq'::regclass);


--
-- Name: gamification_badges id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.gamification_badges ALTER COLUMN id SET DEFAULT nextval('public.gamification_badges_id_seq'::regclass);


--
-- Name: gamification_points id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.gamification_points ALTER COLUMN id SET DEFAULT nextval('public.gamification_points_id_seq'::regclass);


--
-- Name: gamification_rankings id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.gamification_rankings ALTER COLUMN id SET DEFAULT nextval('public.gamification_rankings_id_seq'::regclass);


--
-- Name: lists id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.lists ALTER COLUMN id SET DEFAULT nextval('public.lists_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: transfer_approvals id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.transfer_approvals ALTER COLUMN id SET DEFAULT nextval('public.transfer_approvals_id_seq'::regclass);


--
-- Name: user_badges id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.user_badges ALTER COLUMN id SET DEFAULT nextval('public.user_badges_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.accounts (id, name, subdomain, is_active, settings, created_at, updated_at) FROM stdin;
1	HSGrowth	hsgrowth	t	{"features": ["gamification", "automations", "transfers"], "limits": {"max_users": 100, "max_boards": 50}}	2026-01-05 18:08:38.093566	2026-01-05 18:08:38.093571
5	Tech Solutions	techsolutions	t	{}	2026-01-08 14:56:43.596582	2026-01-08 14:56:43.596585
6	Marketing Pro	marketingpro	t	{}	2026-01-08 14:56:43.596585	2026-01-08 14:56:43.596586
7	Sales Masters	salesmasters	t	{}	2026-01-08 14:56:43.596588	2026-01-08 14:56:43.596588
\.


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.activities (id, card_id, user_id, activity_type, description, activity_metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.alembic_version (version_num) FROM stdin;
458ea44424e8
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.audit_logs (id, user_id, account_id, action, entity_type, entity_id, description, data_before, data_after, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: automation_executions; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.automation_executions (id, automation_id, card_id, triggered_by_id, status, started_at, completed_at, duration_ms, execution_data, error_message, error_stack) FROM stdin;
\.


--
-- Data for Name: automations; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.automations (id, account_id, board_id, name, description, automation_type, is_active, priority, trigger_event, trigger_conditions, schedule_type, scheduled_at, recurrence_pattern, next_run_at, actions, execution_count, last_run_at, failure_count, auto_disable_on_failures, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: boards; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.boards (id, account_id, name, description, settings, created_at, updated_at, deleted_at, is_deleted) FROM stdin;
7	1	Pipeline de Vendas	Funil principal de vendas	{}	2026-01-08 14:57:04.934127	2026-01-08 14:57:04.93413	\N	f
8	1	Atendimento ao Cliente	Gestão de tickets de suporte	{}	2026-01-08 14:57:06.10972	2026-01-08 14:57:06.109723	\N	f
9	1	Pipeline de Vendas	Funil principal de vendas	{}	2026-01-08 14:57:07.090533	2026-01-08 14:57:07.090538	\N	f
10	1	Atendimento ao Cliente	Gestão de tickets de suporte	{}	2026-01-08 14:57:08.167515	2026-01-08 14:57:08.167519	\N	f
11	1	Pipeline de Vendas	Funil principal de vendas	{}	2026-01-08 14:57:09.115892	2026-01-08 14:57:09.115898	\N	f
12	1	Atendimento ao Cliente	Gestão de tickets de suporte	{}	2026-01-08 14:57:10.194874	2026-01-08 14:57:10.194877	\N	f
\.


--
-- Data for Name: card_field_values; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.card_field_values (id, card_id, field_definition_id, value, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: card_transfers; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.card_transfers (id, card_id, from_user_id, to_user_id, reason, notes, status, is_batch_transfer, batch_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cards; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.cards (id, list_id, assigned_to_id, title, description, "position", value, currency, due_date, closed_at, is_won, created_at, updated_at, deleted_at, is_deleted, contact_info, client_id) FROM stdin;
525	31	30	Vieira S.A. - A arte de ganhar simplesmente	Oportunidade com Luna Monteiro da empresa Vieira S.A..\n\nOfficiis provident cumque eum non officia optio. Eum quas nemo aperiam.\nNecessitatibus quisquam laboriosam dolor quidem unde. Quasi repellat eos. Voluptas voluptatum sit quos commodi amet voluptas.	0	11387.39	BRL	\N	\N	0	2026-01-08 14:57:20.12423	2026-01-08 14:57:20.124234	\N	f	{"name": "Luna Monteiro", "email": "nogueiralaura@example.net", "phone": "11 3760 0684", "company": "Vieira S.A."}	21
526	34	32	Dr. Pedro Henrique Barros - O direito de realizar seus sonhos direto da fonte	Oportunidade com Dr. Pedro Henrique Barros da empresa N/A.\n\nInventore distinctio culpa minus amet nulla. A eos alias porro occaecati molestiae. Non exercitationem eos sequi dolores eveniet.\nOfficiis modi labore ipsum quo iure. Nihil aut adipisci.	1	24088.55	BRL	2026-01-17 08:49:01.391068	\N	0	2026-01-08 14:57:20.124234	2026-01-08 14:57:20.124235	\N	f	{"name": "Dr. Pedro Henrique Barros", "email": "da-conceicaogustavo@example.net", "phone": "(081) 8380-0401", "company": null}	10
527	33	33	Porto - O poder de atingir seus objetivos naturalmente	Oportunidade com Sra. Bárbara Pereira da empresa Porto.\n\nMagnam sit provident impedit velit reiciendis quaerat. Expedita adipisci iste necessitatibus nesciunt reiciendis itaque.	2	40869.37	BRL	2026-02-14 14:09:06.700238	\N	0	2026-01-08 14:57:20.124235	2026-01-08 14:57:20.124235	\N	f	{"name": "Sra. B\\u00e1rbara Pereira", "email": "nmoura@example.org", "phone": "(081) 9363-9102", "company": "Porto"}	2
528	36	30	Fogaça - A vantagem de concretizar seus projetos em estado puro	Oportunidade com Matheus Pinto da empresa Fogaça.\n\nSimilique assumenda nihil illo consequuntur.\nDolor dignissimos hic consequuntur labore cumque qui beatae. Dolorem accusantium esse natus numquam. Unde libero non eaque dolores suscipit.	3	11026.30	BRL	\N	2025-12-16 20:00:29.33004	-1	2026-01-08 14:57:20.124236	2026-01-08 14:57:20.124236	\N	f	{"name": "Matheus Pinto", "email": "lucasnovaes@example.net", "phone": "(084) 6287-6874", "company": "Foga\\u00e7a"}	20
529	35	29	da Rosa - O conforto de realizar seus sonhos simplesmente	Oportunidade com João Lima da empresa da Rosa.\n\nDolorem aliquid doloribus tempore adipisci illum.\nId occaecati consequuntur non voluptatum iste. Non ex mollitia quasi.	4	11943.81	BRL	2026-02-10 02:38:08.100578	2025-12-14 13:32:05.436231	1	2026-01-08 14:57:20.124237	2026-01-08 14:57:20.124237	\N	f	{"name": "Jo\\u00e3o Lima", "email": "zalmeida@example.com", "phone": "+55 (021) 7677 1706", "company": "da Rosa"}	3
530	33	32	Fogaça - O poder de inovar sem preocupação	Oportunidade com Matheus Pinto da empresa Fogaça.\n\nVoluptatibus natus debitis fugit eum odit. Suscipit distinctio necessitatibus nesciunt occaecati. Nulla maxime ab pariatur optio.	5	41006.45	BRL	2026-01-16 00:17:04.187608	\N	0	2026-01-08 14:57:20.124237	2026-01-08 14:57:20.124237	\N	f	{"name": "Matheus Pinto", "email": "lucasnovaes@example.net", "phone": "(084) 6287-6874", "company": "Foga\\u00e7a"}	20
531	36	31	Valentina Santos - O poder de conseguir direto da fonte	Oportunidade com Valentina Santos da empresa N/A.\n\nInventore laborum ipsam recusandae. Dolore nesciunt impedit cumque repudiandae repellendus. Minima tenetur voluptas veniam vel voluptas.	6	7895.25	BRL	2026-01-29 12:37:58.161898	2026-01-07 21:48:14.676162	-1	2026-01-08 14:57:20.124238	2026-01-08 14:57:20.124238	\N	f	{"name": "Valentina Santos", "email": "bda-luz@example.com", "phone": "+55 (021) 9355-2892", "company": null}	15
532	36	29	Porto - A segurança de inovar com força total	Oportunidade com Sra. Bárbara Pereira da empresa Porto.\n\nVitae necessitatibus vero nam minima itaque tempora quibusdam. Asperiores sed optio tempora nostrum.	7	18153.47	BRL	\N	2025-12-13 03:52:39.743146	-1	2026-01-08 14:57:20.124266	2026-01-08 14:57:20.124267	\N	f	{"name": "Sra. B\\u00e1rbara Pereira", "email": "nmoura@example.org", "phone": "(081) 9363-9102", "company": "Porto"}	2
533	31	33	Caldeira Pinto S/A - A possibilidade de concretizar seus projetos simplesmente	Oportunidade com Yago Azevedo da empresa Caldeira Pinto S/A.\n\nVero commodi eaque doloremque. Fugiat hic quas sint voluptates.\nNemo aspernatur laudantium cumque odit maxime nulla. Aliquid aspernatur sequi quisquam sunt dolor a accusamus.	8	31595.70	BRL	\N	\N	0	2026-01-08 14:57:20.124267	2026-01-08 14:57:20.124268	\N	f	{"name": "Yago Azevedo", "email": "marcelo53@example.com", "phone": "+55 41 6265-3507", "company": "Caldeira Pinto S/A"}	16
534	34	30	Brenda Silva - A vantagem de concretizar seus projetos de maneira eficaz	Oportunidade com Brenda Silva da empresa N/A.\n\nVoluptate dolor accusamus blanditiis. Saepe at maiores ipsum rem iste atque. Officia ratione unde perspiciatis dolores.	9	2515.87	BRL	\N	\N	0	2026-01-08 14:57:20.124268	2026-01-08 14:57:20.124268	\N	f	{"name": "Brenda Silva", "email": "knogueira@example.org", "phone": "+55 11 5935 7634", "company": null}	14
535	32	30	Nogueira - A arte de realizar seus sonhos sem preocupação	Oportunidade com Arthur da Costa da empresa Nogueira.\n\nAt possimus neque totam. Doloribus eaque inventore error itaque. Perferendis sunt debitis veniam eveniet modi minima.\nFugit totam a doloribus.	10	28150.93	BRL	2026-03-08 00:49:43.392665	\N	0	2026-01-08 14:57:20.124269	2026-01-08 14:57:20.124269	\N	f	{"name": "Arthur da Costa", "email": "pedro18@example.com", "phone": "51 0628 1008", "company": "Nogueira"}	18
536	34	30	da Luz - O prazer de avançar com toda a tranquilidade	Oportunidade com Srta. Gabrielly Santos da empresa da Luz.\n\nOfficia labore rerum voluptas ipsam culpa. Reiciendis beatae doloribus laboriosam enim.\nEnim quisquam eius dolorum dolorum quibusdam illum. Similique ut rerum natus commodi.	11	35187.62	BRL	2026-03-09 10:07:20.474429	\N	0	2026-01-08 14:57:20.12427	2026-01-08 14:57:20.12427	\N	f	{"name": "Srta. Gabrielly Santos", "email": "ksilveira@example.com", "phone": "+55 (071) 9138-4679", "company": "da Luz"}	7
537	35	33	da Luz - O conforto de atingir seus objetivos mais rapidamente	Oportunidade com Srta. Gabrielly Santos da empresa da Luz.\n\nDolor ipsum est natus officiis sed quos. Magnam unde officiis nemo omnis dolores quam laudantium. Reiciendis eius magnam qui ipsam.\nCumque veritatis at sint.	12	31260.55	BRL	\N	2025-12-22 19:26:44.504631	1	2026-01-08 14:57:20.12427	2026-01-08 14:57:20.12427	\N	f	{"name": "Srta. Gabrielly Santos", "email": "ksilveira@example.com", "phone": "+55 (071) 9138-4679", "company": "da Luz"}	7
538	35	29	Dr. Pedro Henrique Barros - O poder de avançar direto da fonte	Oportunidade com Dr. Pedro Henrique Barros da empresa N/A.\n\nConsequatur deleniti neque pariatur. Explicabo eos corrupti dolorum amet. Repellendus ab perferendis sed voluptatem quasi.	13	45611.80	BRL	2026-03-02 12:37:09.174986	2026-01-04 23:02:57.819347	1	2026-01-08 14:57:20.124271	2026-01-08 14:57:20.124279	\N	f	{"name": "Dr. Pedro Henrique Barros", "email": "da-conceicaogustavo@example.net", "phone": "(081) 8380-0401", "company": null}	10
539	31	30	da Rosa - A possibilidade de evoluir sem preocupação	Oportunidade com João Lima da empresa da Rosa.\n\nError nihil dolorem aspernatur sunt nam odit nisi. Beatae ad illum quasi consequuntur.\nPorro id sed natus dolores. Animi accusamus omnis minus quaerat quisquam impedit.	14	36839.10	BRL	\N	\N	0	2026-01-08 14:57:20.124279	2026-01-08 14:57:20.12428	\N	f	{"name": "Jo\\u00e3o Lima", "email": "zalmeida@example.com", "phone": "+55 (021) 7677 1706", "company": "da Rosa"}	3
540	35	33	Maria Fernanda Castro - A liberdade de evoluir antes de tudo	Oportunidade com Maria Fernanda Castro da empresa N/A.\n\nAd nesciunt praesentium sequi sed. Ea ea quae laboriosam commodi ea.	15	22721.12	BRL	2026-02-10 01:35:38.556791	2025-12-16 07:47:45.785195	1	2026-01-08 14:57:20.12428	2026-01-08 14:57:20.12428	\N	f	{"name": "Maria Fernanda Castro", "email": "fernandesmaria@example.net", "phone": "+55 (011) 5618 8005", "company": null}	11
541	32	32	da Costa - A possibilidade de atingir seus objetivos sem preocupação	Oportunidade com Sr. Henrique Teixeira da empresa da Costa.\n\nEius corrupti voluptate asperiores. Eos necessitatibus consectetur recusandae. Optio labore totam placeat.	16	15595.75	BRL	2026-02-07 04:35:55.26235	\N	0	2026-01-08 14:57:20.124281	2026-01-08 14:57:20.124281	\N	f	{"name": "Sr. Henrique Teixeira", "email": "xoliveira@example.com", "phone": "(081) 2824 8641", "company": "da Costa"}	4
542	31	33	Almeida - O poder de mudar com força total	Oportunidade com Valentina da Luz da empresa Almeida.\n\nAtque eligendi cum doloribus possimus. Eligendi itaque aperiam sunt culpa accusantium ex.\nIpsam earum iure dolor tempore. Dolor debitis quod ut iure.	17	27867.21	BRL	\N	\N	0	2026-01-08 14:57:20.124281	2026-01-08 14:57:20.124281	\N	f	{"name": "Valentina da Luz", "email": "vitor-hugo52@example.net", "phone": "31 6377 8875", "company": "Almeida"}	1
543	35	31	Enzo Gabriel da Cruz - O poder de conseguir antes de tudo	Oportunidade com Enzo Gabriel da Cruz da empresa N/A.\n\nPlaceat earum ipsam assumenda architecto. Voluptatem dolore nam ipsum.\nId illo cum nobis. Perferendis repellat fuga. Libero porro debitis dolore sunt quasi.	18	6401.93	BRL	2026-01-08 18:22:29.531813	2025-12-20 23:53:09.075695	1	2026-01-08 14:57:20.124282	2026-01-08 14:57:20.124282	\N	f	{"name": "Enzo Gabriel da Cruz", "email": "luiz-feliperodrigues@example.net", "phone": "+55 11 3224 4261", "company": null}	5
544	36	29	Pinto S/A - O conforto de mudar mais rapidamente	Oportunidade com Bruno Viana da empresa Pinto S/A.\n\nIn dolorum exercitationem adipisci.\nRecusandae incidunt culpa numquam perspiciatis repudiandae. Quis odio expedita aut reiciendis itaque vitae. Dolorum explicabo ipsa dolorum ut fugiat nostrum.	19	2261.57	BRL	2026-03-05 19:05:43.363961	2025-12-23 07:40:34.191824	-1	2026-01-08 14:57:20.124282	2026-01-08 14:57:20.124283	\N	f	{"name": "Bruno Viana", "email": "mmoreira@example.org", "phone": "71 7638 6036", "company": "Pinto S/A"}	9
545	31	30	Valentina Santos - A certeza de concretizar seus projetos sem preocupação	Oportunidade com Valentina Santos da empresa N/A.\n\nHarum accusantium sit consequuntur architecto. Omnis libero iure doloremque itaque. Aperiam quod tempore.	20	27600.18	BRL	2026-02-22 07:45:34.912331	\N	0	2026-01-08 14:57:20.124283	2026-01-08 14:57:20.124283	\N	f	{"name": "Valentina Santos", "email": "bda-luz@example.com", "phone": "+55 (021) 9355-2892", "company": null}	15
546	31	29	Cavalcanti - A liberdade de conseguir com força total	Oportunidade com Milena Farias da empresa Cavalcanti.\n\nLaudantium recusandae molestiae. Natus quibusdam deleniti nam pariatur.	21	30630.49	BRL	2026-02-05 23:46:59.972633	\N	0	2026-01-08 14:57:20.124283	2026-01-08 14:57:20.124284	\N	f	{"name": "Milena Farias", "email": "fogacabenicio@example.org", "phone": "84 4969-2028", "company": "Cavalcanti"}	22
547	32	32	Maria Fernanda Castro - A certeza de inovar mais rapidamente	Oportunidade com Maria Fernanda Castro da empresa N/A.\n\nUllam debitis veniam numquam eius neque repellat fugit.\nDucimus debitis iure consequatur non sunt. Autem occaecati voluptate quae mollitia excepturi. Deserunt soluta perferendis iusto similique est.	22	12832.14	BRL	\N	\N	0	2026-01-08 14:57:20.124284	2026-01-08 14:57:20.124284	\N	f	{"name": "Maria Fernanda Castro", "email": "fernandesmaria@example.net", "phone": "+55 (011) 5618 8005", "company": null}	11
548	36	32	da Luz - A liberdade de realizar seus sonhos simplesmente	Oportunidade com Srta. Gabrielly Santos da empresa da Luz.\n\nRerum mollitia recusandae dicta. Impedit laborum assumenda doloribus qui quod eligendi.	23	34731.82	BRL	2026-02-03 13:19:47.839709	2025-12-21 13:30:17.570996	-1	2026-01-08 14:57:20.124285	2026-01-08 14:57:20.124285	\N	f	{"name": "Srta. Gabrielly Santos", "email": "ksilveira@example.com", "phone": "+55 (071) 9138-4679", "company": "da Luz"}	7
549	34	32	da Rosa - A liberdade de atingir seus objetivos mais facilmente	Oportunidade com João Lima da empresa da Rosa.\n\nTotam voluptatibus atque qui quasi laudantium velit. Quod deserunt iste. Sit facilis sapiente earum harum autem atque neque.\nUnde voluptas repellendus in. Debitis expedita quibusdam fuga vero.	24	43175.32	BRL	2026-02-22 13:52:22.669174	\N	0	2026-01-08 14:57:20.124285	2026-01-08 14:57:20.124285	\N	f	{"name": "Jo\\u00e3o Lima", "email": "zalmeida@example.com", "phone": "+55 (021) 7677 1706", "company": "da Rosa"}	3
550	33	31	Monteiro - O direito de ganhar sem preocupação	Oportunidade com Brenda Costela da empresa Monteiro.\n\nAnimi quidem praesentium. Consequuntur ratione est omnis. Corrupti necessitatibus iure.	25	36045.70	BRL	2026-02-22 03:47:56.169316	\N	0	2026-01-08 14:57:20.124286	2026-01-08 14:57:20.124286	\N	f	{"name": "Brenda Costela", "email": "gabriel15@example.com", "phone": "+55 21 1757-7008", "company": "Monteiro"}	8
551	33	30	Almeida - O prazer de concretizar seus projetos com toda a tranquilidade	Oportunidade com Valentina da Luz da empresa Almeida.\n\nNihil ipsa voluptatum. Harum et atque harum tenetur. Cupiditate soluta assumenda natus dolorem perferendis.\nQuod quia facilis dicta vero. Nemo cumque impedit error facilis laboriosam dolor.	26	39235.38	BRL	2026-02-13 20:16:05.436061	\N	0	2026-01-08 14:57:20.124286	2026-01-08 14:57:20.124287	\N	f	{"name": "Valentina da Luz", "email": "vitor-hugo52@example.net", "phone": "31 6377 8875", "company": "Almeida"}	1
552	32	30	Ramos - O prazer de ganhar com confiança	Oportunidade com Rodrigo Rodrigues da empresa Ramos.\n\nOmnis veritatis exercitationem eligendi eos tenetur velit eos. Quidem error repudiandae. Beatae atque aut dolore.\nBlanditiis nulla harum fuga ab maxime. Animi culpa maxime voluptates eligendi.	27	4982.33	BRL	2026-02-23 10:40:50.154083	\N	0	2026-01-08 14:57:20.124287	2026-01-08 14:57:20.124287	\N	f	{"name": "Rodrigo Rodrigues", "email": "vmartins@example.net", "phone": "+55 84 6205 2283", "company": "Ramos"}	19
553	32	30	da Rosa - O poder de conseguir sem preocupação	Oportunidade com João Lima da empresa da Rosa.\n\nTempora voluptate occaecati pariatur tempora ut ratione et. Architecto nostrum consequatur exercitationem voluptatibus. Nostrum maiores dolores porro vitae ut nostrum.	28	29351.88	BRL	\N	\N	0	2026-01-08 14:57:20.124288	2026-01-08 14:57:20.124288	\N	f	{"name": "Jo\\u00e3o Lima", "email": "zalmeida@example.com", "phone": "+55 (021) 7677 1706", "company": "da Rosa"}	3
554	32	29	Porto - A certeza de mudar mais facilmente	Oportunidade com Sra. Bárbara Pereira da empresa Porto.\n\nQuo possimus corrupti at fuga quasi. At accusantium veniam ut adipisci vel.	29	41253.11	BRL	2026-01-21 20:50:59.706321	\N	0	2026-01-08 14:57:20.124288	2026-01-08 14:57:20.124288	\N	f	{"name": "Sra. B\\u00e1rbara Pereira", "email": "nmoura@example.org", "phone": "(081) 9363-9102", "company": "Porto"}	2
555	33	33	Pinto - ME - O prazer de inovar sem preocupação	Oportunidade com Dra. Olivia da Rocha da empresa Pinto - ME.\n\nProvident dolores sequi alias consequuntur. Velit sunt veniam exercitationem eum aperiam. Dignissimos beatae veniam illum.\nMinima sit recusandae reprehenderit reprehenderit excepturi ducimus.	30	16772.58	BRL	2026-02-09 06:44:32.487352	\N	0	2026-01-08 14:57:20.124289	2026-01-08 14:57:20.124289	\N	f	{"name": "Dra. Olivia da Rocha", "email": "piresheloisa@example.net", "phone": "51 3653 1563", "company": "Pinto - ME"}	6
556	33	31	Caldeira Pinto S/A - A segurança de inovar antes de tudo	Oportunidade com Yago Azevedo da empresa Caldeira Pinto S/A.\n\nIllum totam delectus. Voluptate voluptatum ullam quisquam reiciendis reprehenderit. Aliquam temporibus ex ullam.	31	6888.75	BRL	2026-02-23 05:45:27.631444	\N	0	2026-01-08 14:57:20.12429	2026-01-08 14:57:20.12429	\N	f	{"name": "Yago Azevedo", "email": "marcelo53@example.com", "phone": "+55 41 6265-3507", "company": "Caldeira Pinto S/A"}	16
557	34	30	Pinto - ME - A segurança de evoluir com força total	Oportunidade com Dra. Olivia da Rocha da empresa Pinto - ME.\n\nPossimus adipisci labore aut suscipit officia.\nPerspiciatis neque odit accusamus eum ea. Qui ea totam ut veritatis ad. Possimus doloribus ab rerum eligendi.	32	30844.40	BRL	\N	\N	0	2026-01-08 14:57:20.12429	2026-01-08 14:57:20.12429	\N	f	{"name": "Dra. Olivia da Rocha", "email": "piresheloisa@example.net", "phone": "51 3653 1563", "company": "Pinto - ME"}	6
558	34	31	Caldeira Pinto S/A - A vantagem de evoluir em estado puro	Oportunidade com Yago Azevedo da empresa Caldeira Pinto S/A.\n\nLaboriosam nesciunt repudiandae omnis. Harum vero dolores optio animi.\nDoloribus rerum fugiat quae. Harum cumque delectus repellat.	33	18001.70	BRL	2026-01-10 16:06:41.358036	\N	0	2026-01-08 14:57:20.124291	2026-01-08 14:57:20.124291	\N	f	{"name": "Yago Azevedo", "email": "marcelo53@example.com", "phone": "+55 41 6265-3507", "company": "Caldeira Pinto S/A"}	16
559	35	32	Cavalcanti - A certeza de realizar seus sonhos naturalmente	Oportunidade com Milena Farias da empresa Cavalcanti.\n\nCorporis modi velit impedit voluptate totam earum. Repellat non iure. Eaque totam tenetur ullam officia.	34	47100.24	BRL	2026-01-12 04:24:52.197298	2025-12-12 16:57:31.92004	1	2026-01-08 14:57:20.124291	2026-01-08 14:57:20.124292	\N	f	{"name": "Milena Farias", "email": "fogacabenicio@example.org", "phone": "84 4969-2028", "company": "Cavalcanti"}	22
560	31	33	Monteiro - A simplicidade de inovar naturalmente	Oportunidade com Brenda Costela da empresa Monteiro.\n\nRepudiandae porro occaecati modi. Veritatis ratione facere sapiente.\nEarum quisquam unde ducimus.	35	27418.30	BRL	\N	\N	0	2026-01-08 14:57:20.124292	2026-01-08 14:57:20.124292	\N	f	{"name": "Brenda Costela", "email": "gabriel15@example.com", "phone": "+55 21 1757-7008", "company": "Monteiro"}	8
561	35	30	Pinto - ME - O poder de concretizar seus projetos simplesmente	Oportunidade com Dra. Olivia da Rocha da empresa Pinto - ME.\n\nQuod aspernatur explicabo minus mollitia quas dolore. Aut voluptas quia quaerat. Architecto nostrum quo pariatur quia aperiam ducimus.	36	34902.16	BRL	\N	2025-12-26 22:41:52.434727	1	2026-01-08 14:57:20.124293	2026-01-08 14:57:20.124293	\N	f	{"name": "Dra. Olivia da Rocha", "email": "piresheloisa@example.net", "phone": "51 3653 1563", "company": "Pinto - ME"}	6
562	31	32	Nogueira - O poder de inovar sem preocupação	Oportunidade com Arthur da Costa da empresa Nogueira.\n\nAsperiores ipsum veniam veritatis maiores consequuntur. Occaecati incidunt ab magni cum.	37	12680.14	BRL	2026-02-07 07:08:19.017976	\N	0	2026-01-08 14:57:20.124293	2026-01-08 14:57:20.124293	\N	f	{"name": "Arthur da Costa", "email": "pedro18@example.com", "phone": "51 0628 1008", "company": "Nogueira"}	18
563	33	31	Enzo Gabriel da Cruz - A simplicidade de evoluir com força total	Oportunidade com Enzo Gabriel da Cruz da empresa N/A.\n\nDucimus libero perferendis. Minus ea ad repudiandae earum officiis molestiae neque. Nam quos delectus placeat.\nRecusandae illo unde dolores fugiat vel explicabo. Placeat aut eaque animi iste.	38	24716.90	BRL	\N	\N	0	2026-01-08 14:57:20.124294	2026-01-08 14:57:20.124294	\N	f	{"name": "Enzo Gabriel da Cruz", "email": "luiz-feliperodrigues@example.net", "phone": "+55 11 3224 4261", "company": null}	5
564	37	32	Nogueira - A vantagem de atingir seus objetivos naturalmente	Oportunidade com Arthur da Costa da empresa Nogueira.\n\nEt culpa expedita ipsum magni. Modi eius deleniti magni quos. Esse saepe minima.\nIure asperiores eligendi ad ducimus suscipit inventore. Voluptatem deleniti quod voluptates ullam.	0	23659.94	BRL	2026-01-30 23:53:13.693642	\N	0	2026-01-08 14:57:21.986343	2026-01-08 14:57:21.986346	\N	f	{"name": "Arthur da Costa", "email": "pedro18@example.com", "phone": "51 0628 1008", "company": "Nogueira"}	18
565	38	31	Pinto - ME - A certeza de mudar mais facilmente	Oportunidade com Dra. Olivia da Rocha da empresa Pinto - ME.\n\nAliquid voluptatibus magnam sint tempore incidunt quidem. Nulla veritatis iste.	1	44404.95	BRL	2026-01-25 05:59:43.478984	\N	0	2026-01-08 14:57:21.986346	2026-01-08 14:57:21.986347	\N	f	{"name": "Dra. Olivia da Rocha", "email": "piresheloisa@example.net", "phone": "51 3653 1563", "company": "Pinto - ME"}	6
566	40	29	da Costa - A certeza de mudar naturalmente	Oportunidade com Sr. Henrique Teixeira da empresa da Costa.\n\nQuaerat saepe eaque facere. Ab itaque consequatur perspiciatis odit autem.\nIncidunt reprehenderit atque mollitia error. Reiciendis quia eos nostrum quibusdam.	2	35027.67	BRL	2026-02-21 14:55:29.948431	2025-12-15 07:06:22.337533	1	2026-01-08 14:57:21.986347	2026-01-08 14:57:21.986347	\N	f	{"name": "Sr. Henrique Teixeira", "email": "xoliveira@example.com", "phone": "(081) 2824 8641", "company": "da Costa"}	4
567	39	29	Caldeira Pinto S/A - A possibilidade de avançar mais rapidamente	Oportunidade com Yago Azevedo da empresa Caldeira Pinto S/A.\n\nArchitecto nihil ullam exercitationem consequuntur. Fugit voluptate illo. Quo ratione sit at asperiores provident.	3	25209.42	BRL	2026-02-09 16:22:50.905901	\N	0	2026-01-08 14:57:21.986348	2026-01-08 14:57:21.986348	\N	f	{"name": "Yago Azevedo", "email": "marcelo53@example.com", "phone": "+55 41 6265-3507", "company": "Caldeira Pinto S/A"}	16
568	39	33	Freitas - ME - O direito de avançar sem preocupação	Oportunidade com Emilly Teixeira da empresa Freitas - ME.\n\nModi autem cupiditate earum magnam dolore magni.\nBlanditiis autem sed similique quod earum.\nAd error reiciendis eveniet eveniet dicta dolores. Illo dolorem laboriosam incidunt commodi dolores rem.	4	36646.51	BRL	2026-02-07 15:00:54.701562	\N	0	2026-01-08 14:57:21.986349	2026-01-08 14:57:21.986349	\N	f	{"name": "Emilly Teixeira", "email": "diogo91@example.net", "phone": "(051) 4646-8216", "company": "Freitas - ME"}	12
569	39	29	Almeida - O conforto de evoluir naturalmente	Oportunidade com Valentina da Luz da empresa Almeida.\n\nQuo eveniet odit dolorum qui officia fuga.\nIusto fugiat culpa repellendus deserunt vitae ducimus. Similique consequatur natus corrupti hic facere magni.	5	44428.51	BRL	2026-01-25 12:45:30.387992	\N	0	2026-01-08 14:57:21.986349	2026-01-08 14:57:21.986349	\N	f	{"name": "Valentina da Luz", "email": "vitor-hugo52@example.net", "phone": "31 6377 8875", "company": "Almeida"}	1
570	40	29	Brenda Silva - A arte de inovar antes de tudo	Oportunidade com Brenda Silva da empresa N/A.\n\nCorporis atque officiis expedita sapiente distinctio. Odio doloremque omnis rerum nulla adipisci molestiae. Incidunt sunt laborum nulla quia maiores alias.	6	45005.85	BRL	2026-03-05 21:25:15.129556	2025-12-28 08:17:26.14302	1	2026-01-08 14:57:21.98635	2026-01-08 14:57:21.98635	\N	f	{"name": "Brenda Silva", "email": "knogueira@example.org", "phone": "+55 11 5935 7634", "company": null}	14
571	37	33	Freitas - ME - O conforto de mudar com força total	Oportunidade com Emilly Teixeira da empresa Freitas - ME.\n\nNostrum debitis accusamus dignissimos perferendis. Ab vero libero culpa dicta deserunt ducimus hic.	7	14650.90	BRL	\N	\N	0	2026-01-08 14:57:21.98635	2026-01-08 14:57:21.986351	\N	f	{"name": "Emilly Teixeira", "email": "diogo91@example.net", "phone": "(051) 4646-8216", "company": "Freitas - ME"}	12
572	38	29	Caldeira Pinto S/A - O poder de conseguir mais facilmente	Oportunidade com Yago Azevedo da empresa Caldeira Pinto S/A.\n\nSunt est consequuntur ipsa. Ut totam aliquam quae deleniti. Eligendi animi veritatis tenetur nostrum eos. Unde illo vero laborum aut.	8	12038.03	BRL	2026-03-04 08:56:24.527112	\N	0	2026-01-08 14:57:21.986351	2026-01-08 14:57:21.986351	\N	f	{"name": "Yago Azevedo", "email": "marcelo53@example.com", "phone": "+55 41 6265-3507", "company": "Caldeira Pinto S/A"}	16
573	39	31	Monteiro - O direito de inovar de maneira eficaz	Oportunidade com Brenda Costela da empresa Monteiro.\n\nModi qui explicabo aliquid fugiat adipisci. Accusantium sit reiciendis. Ea occaecati culpa aperiam earum quidem officia.	9	20116.94	BRL	2026-02-12 20:51:09.907566	\N	0	2026-01-08 14:57:21.986352	2026-01-08 14:57:21.986352	\N	f	{"name": "Brenda Costela", "email": "gabriel15@example.com", "phone": "+55 21 1757-7008", "company": "Monteiro"}	8
574	40	32	Souza S/A - A simplicidade de concretizar seus projetos com confiança	Oportunidade com Pedro Miguel Nunes da empresa Souza S/A.\n\nCorporis quaerat numquam magnam quod ducimus voluptas. Odio velit numquam quibusdam deleniti recusandae accusantium. Aliquid iusto dolorum nostrum et.	10	11866.82	BRL	2026-02-22 11:29:53.954663	2025-12-18 21:12:22.843517	1	2026-01-08 14:57:21.986352	2026-01-08 14:57:21.986352	\N	f	{"name": "Pedro Miguel Nunes", "email": "nunesrafael@example.com", "phone": "(071) 9418-8453", "company": "Souza S/A"}	13
575	37	32	Freitas - ME - A simplicidade de mudar mais rapidamente	Oportunidade com Emilly Teixeira da empresa Freitas - ME.\n\nVelit eveniet quis facilis officia. Saepe natus earum repellendus molestias odit.\nVeritatis recusandae aperiam est iure. Architecto incidunt sint unde itaque.	11	1082.38	BRL	2026-01-13 23:28:23.788535	\N	0	2026-01-08 14:57:21.986353	2026-01-08 14:57:21.986353	\N	f	{"name": "Emilly Teixeira", "email": "diogo91@example.net", "phone": "(051) 4646-8216", "company": "Freitas - ME"}	12
576	40	31	da Luz - A simplicidade de concretizar seus projetos com toda a tranquilidade	Oportunidade com Srta. Gabrielly Santos da empresa da Luz.\n\nUllam illo suscipit. Consequuntur autem commodi harum doloribus atque voluptatibus. Architecto nemo nam nisi cupiditate et.	12	9228.17	BRL	2026-02-13 22:54:53.616013	2026-01-04 20:31:51.42663	1	2026-01-08 14:57:21.986353	2026-01-08 14:57:21.986354	\N	f	{"name": "Srta. Gabrielly Santos", "email": "ksilveira@example.com", "phone": "+55 (071) 9138-4679", "company": "da Luz"}	7
577	39	32	Ramos - O prazer de realizar seus sonhos direto da fonte	Oportunidade com Rodrigo Rodrigues da empresa Ramos.\n\nVitae magni dolores explicabo eaque dolores. Exercitationem dolores animi accusamus. Facilis magnam animi occaecati beatae.\nEt consectetur qui eius earum delectus magnam. Mollitia porro esse quaerat.	13	1739.93	BRL	2026-02-19 19:20:28.312525	\N	0	2026-01-08 14:57:21.986354	2026-01-08 14:57:21.986354	\N	f	{"name": "Rodrigo Rodrigues", "email": "vmartins@example.net", "phone": "+55 84 6205 2283", "company": "Ramos"}	19
578	40	31	Caldeira Pinto S/A - A possibilidade de concretizar seus projetos mais facilmente	Oportunidade com Yago Azevedo da empresa Caldeira Pinto S/A.\n\nAb eligendi ut commodi nulla alias. Unde soluta optio minus. Minus deleniti nobis nulla reprehenderit debitis.	14	16858.50	BRL	2026-01-10 20:11:54.526778	2025-12-12 16:31:30.407261	1	2026-01-08 14:57:21.986355	2026-01-08 14:57:21.986355	\N	f	{"name": "Yago Azevedo", "email": "marcelo53@example.com", "phone": "+55 41 6265-3507", "company": "Caldeira Pinto S/A"}	16
579	39	31	da Conceição - O prazer de mudar naturalmente	Oportunidade com Mariana Viana da empresa da Conceição.\n\nAspernatur nobis excepturi tempora. Molestiae accusantium corrupti doloribus quibusdam fuga. Ducimus dolorum quibusdam voluptatem excepturi ipsum recusandae. Aliquam numquam animi repudiandae at.	15	10485.11	BRL	2026-02-09 20:04:01.26553	\N	0	2026-01-08 14:57:21.986355	2026-01-08 14:57:21.986356	\N	f	{"name": "Mariana Viana", "email": "viniciusrezende@example.com", "phone": "21 1554 3128", "company": "da Concei\\u00e7\\u00e3o"}	17
580	39	29	Vieira S.A. - A vantagem de concretizar seus projetos mais facilmente	Oportunidade com Luna Monteiro da empresa Vieira S.A..\n\nAliquam consectetur numquam sapiente est. Quis culpa voluptatibus dolor pariatur.\nOfficia atque fugiat rerum rem. Accusantium laborum quam. Voluptatibus ipsum sequi cupiditate commodi omnis.	16	36451.83	BRL	2026-02-22 11:32:47.803907	\N	0	2026-01-08 14:57:21.986356	2026-01-08 14:57:21.986356	\N	f	{"name": "Luna Monteiro", "email": "nogueiralaura@example.net", "phone": "11 3760 0684", "company": "Vieira S.A."}	21
581	38	31	Enzo Gabriel da Cruz - O prazer de evoluir de maneira eficaz	Oportunidade com Enzo Gabriel da Cruz da empresa N/A.\n\nOccaecati ratione ea quas laborum suscipit. Libero animi optio dolorem corrupti dolor ipsam.	17	43147.45	BRL	2026-02-13 13:48:24.222989	\N	0	2026-01-08 14:57:21.986357	2026-01-08 14:57:21.986357	\N	f	{"name": "Enzo Gabriel da Cruz", "email": "luiz-feliperodrigues@example.net", "phone": "+55 11 3224 4261", "company": null}	5
582	37	33	Brenda Silva - O conforto de inovar antes de tudo	Oportunidade com Brenda Silva da empresa N/A.\n\nDelectus illum exercitationem rem saepe vero sit repellendus. Laudantium sunt aspernatur animi ducimus voluptas explicabo.	18	7160.30	BRL	\N	\N	0	2026-01-08 14:57:21.986357	2026-01-08 14:57:21.986358	\N	f	{"name": "Brenda Silva", "email": "knogueira@example.org", "phone": "+55 11 5935 7634", "company": null}	14
583	38	31	da Rosa - A possibilidade de mudar antes de tudo	Oportunidade com João Lima da empresa da Rosa.\n\nVel recusandae ipsam quisquam quibusdam ad fuga dolorem. Dolor eaque inventore sunt iure dolorem.\nQuae praesentium odit iusto. Sint ipsum sit minus exercitationem.	19	46546.40	BRL	2026-01-15 16:10:56.462996	\N	0	2026-01-08 14:57:21.986358	2026-01-08 14:57:21.986358	\N	f	{"name": "Jo\\u00e3o Lima", "email": "zalmeida@example.com", "phone": "+55 (021) 7677 1706", "company": "da Rosa"}	3
584	38	29	Vieira S.A. - O prazer de conseguir mais rapidamente	Oportunidade com Luna Monteiro da empresa Vieira S.A..\n\nItaque eaque dicta aut voluptas nostrum officiis.\nCulpa sapiente dolores saepe aut. Similique ducimus enim distinctio voluptate. Mollitia rerum sed dolore ullam architecto ut ducimus.	20	31003.67	BRL	2026-03-02 14:27:44.342249	\N	0	2026-01-08 14:57:21.986359	2026-01-08 14:57:21.986359	\N	f	{"name": "Luna Monteiro", "email": "nogueiralaura@example.net", "phone": "11 3760 0684", "company": "Vieira S.A."}	21
585	39	33	da Rosa - O prazer de concretizar seus projetos mais facilmente	Oportunidade com João Lima da empresa da Rosa.\n\nTotam totam ab itaque odio aspernatur sint. Amet a repellendus exercitationem eos nostrum libero.	21	21890.30	BRL	2026-01-20 12:13:55.297038	\N	0	2026-01-08 14:57:21.986359	2026-01-08 14:57:21.986359	\N	f	{"name": "Jo\\u00e3o Lima", "email": "zalmeida@example.com", "phone": "+55 (021) 7677 1706", "company": "da Rosa"}	3
586	39	32	Almeida - O prazer de concretizar seus projetos sem preocupação	Oportunidade com Valentina da Luz da empresa Almeida.\n\nBeatae quidem iste quibusdam quibusdam. Odio animi voluptas deserunt. Vel eius sit quibusdam.\nSint nulla eaque ad quas. Sint officiis atque nihil odio quod alias facilis. Illo non sed iste animi.	22	40872.86	BRL	2026-03-08 13:13:34.276695	\N	0	2026-01-08 14:57:21.98636	2026-01-08 14:57:21.98636	\N	f	{"name": "Valentina da Luz", "email": "vitor-hugo52@example.net", "phone": "31 6377 8875", "company": "Almeida"}	1
587	39	29	Valentina Santos - A arte de concretizar seus projetos com toda a tranquilidade	Oportunidade com Valentina Santos da empresa N/A.\n\nRepudiandae consequatur aliquam vel. Molestiae necessitatibus perferendis nulla quam.\nIpsum minus autem aperiam. Praesentium ullam sint soluta ipsum delectus minima.	23	27297.83	BRL	2026-02-06 04:57:24.878965	\N	0	2026-01-08 14:57:21.98636	2026-01-08 14:57:21.986361	\N	f	{"name": "Valentina Santos", "email": "bda-luz@example.com", "phone": "+55 (021) 9355-2892", "company": null}	15
588	37	29	da Costa - A segurança de mudar simplesmente	Oportunidade com Sr. Henrique Teixeira da empresa da Costa.\n\nVoluptatum quia neque beatae quos. Repellendus ab perspiciatis molestiae inventore iste.\nTotam eos laborum voluptatibus cum. Fugiat iste porro fugiat impedit debitis.	24	43062.31	BRL	\N	\N	0	2026-01-08 14:57:21.986361	2026-01-08 14:57:21.986361	\N	f	{"name": "Sr. Henrique Teixeira", "email": "xoliveira@example.com", "phone": "(081) 2824 8641", "company": "da Costa"}	4
589	40	32	Nogueira - A possibilidade de concretizar seus projetos sem preocupação	Oportunidade com Arthur da Costa da empresa Nogueira.\n\nEx vitae voluptatibus. Voluptatibus aliquam dignissimos error optio aperiam delectus.\nQuidem earum deleniti. Minus recusandae repudiandae.	25	42795.87	BRL	2026-02-02 18:55:59.801645	2025-12-29 20:08:36.341318	1	2026-01-08 14:57:21.986362	2026-01-08 14:57:21.986362	\N	f	{"name": "Arthur da Costa", "email": "pedro18@example.com", "phone": "51 0628 1008", "company": "Nogueira"}	18
590	38	29	Dr. Pedro Henrique Barros - O conforto de avançar mais facilmente	Oportunidade com Dr. Pedro Henrique Barros da empresa N/A.\n\nNisi ad eos natus laboriosam. Nemo nemo corporis repellat distinctio veritatis aliquid eum.\nVoluptatum rerum ipsum sed nihil hic. Atque provident quidem minus.	26	11466.09	BRL	2026-02-26 07:34:26.012694	\N	0	2026-01-08 14:57:21.986362	2026-01-08 14:57:21.986363	\N	f	{"name": "Dr. Pedro Henrique Barros", "email": "da-conceicaogustavo@example.net", "phone": "(081) 8380-0401", "company": null}	10
591	40	32	da Rosa - O prazer de atingir seus objetivos simplesmente	Oportunidade com João Lima da empresa da Rosa.\n\nTotam temporibus ab asperiores saepe reprehenderit deleniti. Est numquam ex consectetur autem earum. Ullam voluptatum porro voluptatum neque. Delectus adipisci aliquam quibusdam tempora quibusdam.	27	16394.16	BRL	\N	2026-01-03 19:41:58.796054	1	2026-01-08 14:57:21.986363	2026-01-08 14:57:21.986363	\N	f	{"name": "Jo\\u00e3o Lima", "email": "zalmeida@example.com", "phone": "+55 (021) 7677 1706", "company": "da Rosa"}	3
592	39	29	Ramos - O direito de realizar seus sonhos simplesmente	Oportunidade com Rodrigo Rodrigues da empresa Ramos.\n\nQuisquam delectus occaecati repellendus est repellendus. Quo impedit corrupti quo.\nCumque consequuntur tenetur ex. Asperiores a magni officiis praesentium aliquid eum tenetur.	28	33804.72	BRL	2026-02-17 11:36:55.171706	\N	0	2026-01-08 14:57:21.986364	2026-01-08 14:57:21.986364	\N	f	{"name": "Rodrigo Rodrigues", "email": "vmartins@example.net", "phone": "+55 84 6205 2283", "company": "Ramos"}	19
593	40	29	Ramos - A simplicidade de realizar seus sonhos naturalmente	Oportunidade com Rodrigo Rodrigues da empresa Ramos.\n\nEa eius reiciendis quia.\nCupiditate modi architecto eum illum. Accusantium saepe praesentium distinctio dicta exercitationem. Voluptate exercitationem quam hic ad animi.	29	27324.58	BRL	\N	2025-12-30 23:42:48.186849	1	2026-01-08 14:57:21.986364	2026-01-08 14:57:21.986364	\N	f	{"name": "Rodrigo Rodrigues", "email": "vmartins@example.net", "phone": "+55 84 6205 2283", "company": "Ramos"}	19
594	38	29	Caldeira Pinto S/A - A possibilidade de conseguir simplesmente	Oportunidade com Yago Azevedo da empresa Caldeira Pinto S/A.\n\nQuas itaque odit ducimus aliquam. Dolore accusantium ab molestiae numquam ipsa maiores. Nam consequatur accusamus soluta.\nDolores nesciunt veritatis omnis nisi.	30	43413.10	BRL	2026-01-29 09:39:47.117261	\N	0	2026-01-08 14:57:21.986365	2026-01-08 14:57:21.986365	\N	f	{"name": "Yago Azevedo", "email": "marcelo53@example.com", "phone": "+55 41 6265-3507", "company": "Caldeira Pinto S/A"}	16
595	38	30	Valentina Santos - O conforto de realizar seus sonhos com toda a tranquilidade	Oportunidade com Valentina Santos da empresa N/A.\n\nEnim quia magni. Excepturi sint facere ea possimus doloribus id.\nVero deserunt id eaque ad blanditiis error. Nemo officiis labore reprehenderit ducimus. Animi fuga tempore ut ut.	31	48440.51	BRL	2026-02-17 11:22:44.690763	\N	0	2026-01-08 14:57:21.986365	2026-01-08 14:57:21.986366	\N	f	{"name": "Valentina Santos", "email": "bda-luz@example.com", "phone": "+55 (021) 9355-2892", "company": null}	15
596	37	30	Monteiro - A simplicidade de conseguir antes de tudo	Oportunidade com Brenda Costela da empresa Monteiro.\n\nEaque sequi maxime porro eaque repellat dicta. Iste tempora itaque vitae consequatur quo tempora maiores.\nSoluta exercitationem officiis quae mollitia. Voluptatem inventore fugiat.	32	10547.18	BRL	2026-03-03 13:11:08.374954	\N	0	2026-01-08 14:57:21.986366	2026-01-08 14:57:21.986366	\N	f	{"name": "Brenda Costela", "email": "gabriel15@example.com", "phone": "+55 21 1757-7008", "company": "Monteiro"}	8
597	40	30	Souza S/A - A arte de realizar seus sonhos mais facilmente	Oportunidade com Pedro Miguel Nunes da empresa Souza S/A.\n\nQuia ea culpa nam nisi tempora. Cupiditate libero quasi officiis.\nUllam aut officiis totam perspiciatis quasi esse.	33	17753.07	BRL	2026-02-12 05:41:13.447075	2026-01-05 14:48:29.572092	1	2026-01-08 14:57:21.986366	2026-01-08 14:57:21.986367	\N	f	{"name": "Pedro Miguel Nunes", "email": "nunesrafael@example.com", "phone": "(071) 9418-8453", "company": "Souza S/A"}	13
598	38	31	Pinto S/A - A arte de atingir seus objetivos sem preocupação	Oportunidade com Bruno Viana da empresa Pinto S/A.\n\nVero voluptate deserunt eligendi. Ipsa aliquid et eligendi.\nUt repellat sequi ullam sunt ut. Facilis delectus odio fugiat saepe eum. Consequatur sit similique aut ipsam inventore.	34	39344.28	BRL	2026-01-14 10:04:31.3304	\N	0	2026-01-08 14:57:21.986367	2026-01-08 14:57:21.986367	\N	f	{"name": "Bruno Viana", "email": "mmoreira@example.org", "phone": "71 7638 6036", "company": "Pinto S/A"}	9
599	37	32	Nogueira - A vantagem de ganhar com confiança	Oportunidade com Arthur da Costa da empresa Nogueira.\n\nMinus maxime sapiente itaque voluptatem. Aliquam quis ad. Iure assumenda eveniet quod adipisci ipsam sint maxime. Adipisci impedit ad quidem reiciendis autem.	35	2485.20	BRL	2026-01-20 01:32:52.743681	\N	0	2026-01-08 14:57:21.986368	2026-01-08 14:57:21.986368	\N	f	{"name": "Arthur da Costa", "email": "pedro18@example.com", "phone": "51 0628 1008", "company": "Nogueira"}	18
600	40	32	Freitas - ME - O poder de ganhar naturalmente	Oportunidade com Emilly Teixeira da empresa Freitas - ME.\n\nAspernatur sint consectetur eos adipisci quo consequuntur. Mollitia sed mollitia dignissimos aspernatur eos amet. Non dignissimos nulla dolore sapiente facere.	36	12797.66	BRL	\N	2025-12-26 04:03:34.883861	1	2026-01-08 14:57:21.986368	2026-01-08 14:57:21.986368	\N	f	{"name": "Emilly Teixeira", "email": "diogo91@example.net", "phone": "(051) 4646-8216", "company": "Freitas - ME"}	12
601	38	31	Souza S/A - O direito de concretizar seus projetos em estado puro	Oportunidade com Pedro Miguel Nunes da empresa Souza S/A.\n\nRecusandae consequatur id maxime. Occaecati blanditiis minus delectus officia reiciendis. Nesciunt quisquam nobis voluptates incidunt voluptatem commodi a.	37	41155.30	BRL	2026-01-23 09:03:22.527055	\N	0	2026-01-08 14:57:21.986369	2026-01-08 14:57:21.986369	\N	f	{"name": "Pedro Miguel Nunes", "email": "nunesrafael@example.com", "phone": "(071) 9418-8453", "company": "Souza S/A"}	13
602	37	29	Pinto - ME - O poder de evoluir com força total	Oportunidade com Dra. Olivia da Rocha da empresa Pinto - ME.\n\nModi porro reprehenderit consequuntur. Ea aperiam atque explicabo. Perferendis quo natus sit iusto mollitia excepturi.\nLaudantium unde ipsum similique aperiam. Culpa aperiam amet blanditiis laborum.	38	43929.96	BRL	2026-02-05 19:31:10.682279	\N	0	2026-01-08 14:57:21.986369	2026-01-08 14:57:21.98637	\N	f	{"name": "Dra. Olivia da Rocha", "email": "piresheloisa@example.net", "phone": "51 3653 1563", "company": "Pinto - ME"}	6
603	37	29	Caldeira Pinto S/A - A segurança de evoluir com toda a tranquilidade	Oportunidade com Yago Azevedo da empresa Caldeira Pinto S/A.\n\nNihil dolor adipisci corrupti. Necessitatibus expedita ipsa aut sit. Doloremque aut voluptatem.	39	1392.62	BRL	2026-02-11 10:54:50.302409	\N	0	2026-01-08 14:57:21.98637	2026-01-08 14:57:21.98637	\N	f	{"name": "Yago Azevedo", "email": "marcelo53@example.com", "phone": "+55 41 6265-3507", "company": "Caldeira Pinto S/A"}	16
604	38	33	Souza S/A - A vantagem de atingir seus objetivos simplesmente	Oportunidade com Pedro Miguel Nunes da empresa Souza S/A.\n\nDeleniti temporibus magni repellat. Omnis quod fuga voluptas veniam.	40	11052.91	BRL	\N	\N	0	2026-01-08 14:57:21.986371	2026-01-08 14:57:21.986371	\N	f	{"name": "Pedro Miguel Nunes", "email": "nunesrafael@example.com", "phone": "(071) 9418-8453", "company": "Souza S/A"}	13
605	40	32	Almeida - O conforto de realizar seus sonhos com confiança	Oportunidade com Valentina da Luz da empresa Almeida.\n\nLaboriosam sed unde illo non ipsa nisi reiciendis. Suscipit vel quas quo voluptatem vero.\nNumquam impedit fuga necessitatibus. Minus occaecati aliquid voluptatem blanditiis magni quo.	41	18211.26	BRL	2026-03-04 07:37:13.75078	2026-01-06 01:27:52.126195	1	2026-01-08 14:57:21.986371	2026-01-08 14:57:21.986371	\N	f	{"name": "Valentina da Luz", "email": "vitor-hugo52@example.net", "phone": "31 6377 8875", "company": "Almeida"}	1
606	38	32	da Conceição - A liberdade de concretizar seus projetos com força total	Oportunidade com Mariana Viana da empresa da Conceição.\n\nDolore placeat sunt. Voluptatibus soluta asperiores modi tempore totam labore at. Similique velit et dolores minus corporis dolorum alias.	42	48265.06	BRL	\N	\N	0	2026-01-08 14:57:21.986372	2026-01-08 14:57:21.986372	\N	f	{"name": "Mariana Viana", "email": "viniciusrezende@example.com", "phone": "21 1554 3128", "company": "da Concei\\u00e7\\u00e3o"}	17
607	39	31	Caldeira Pinto S/A - A liberdade de inovar sem preocupação	Oportunidade com Yago Azevedo da empresa Caldeira Pinto S/A.\n\nAutem repellendus cupiditate doloremque. Pariatur officia nulla. Id animi autem unde impedit deleniti libero.\nAut nostrum dolore explicabo rerum. Reiciendis nulla in repellat eius.	43	35438.05	BRL	\N	\N	0	2026-01-08 14:57:21.986372	2026-01-08 14:57:21.986373	\N	f	{"name": "Yago Azevedo", "email": "marcelo53@example.com", "phone": "+55 41 6265-3507", "company": "Caldeira Pinto S/A"}	16
608	40	29	Caldeira Pinto S/A - O conforto de realizar seus sonhos de maneira eficaz	Oportunidade com Yago Azevedo da empresa Caldeira Pinto S/A.\n\nQuis repellat nesciunt quibusdam laudantium error ipsa soluta. Occaecati repellendus alias beatae qui minus alias. Eveniet alias laboriosam a vero ullam quos.	44	30345.39	BRL	2026-01-26 14:41:15.806047	2025-12-26 09:39:11.938299	1	2026-01-08 14:57:21.986373	2026-01-08 14:57:21.986373	\N	f	{"name": "Yago Azevedo", "email": "marcelo53@example.com", "phone": "+55 41 6265-3507", "company": "Caldeira Pinto S/A"}	16
609	37	31	Brenda Silva - A liberdade de atingir seus objetivos mais facilmente	Oportunidade com Brenda Silva da empresa N/A.\n\nIpsum esse est eligendi amet vero repellat laudantium. Sunt doloremque pariatur a fugit repellendus. Explicabo dolor accusantium inventore.	45	10961.43	BRL	2026-01-16 13:28:16.04952	\N	0	2026-01-08 14:57:21.986374	2026-01-08 14:57:21.986374	\N	f	{"name": "Brenda Silva", "email": "knogueira@example.org", "phone": "+55 11 5935 7634", "company": null}	14
610	40	30	da Luz - A liberdade de ganhar com toda a tranquilidade	Oportunidade com Srta. Gabrielly Santos da empresa da Luz.\n\nVoluptate neque minima dolorem nemo placeat dicta earum. Id praesentium esse ab cum omnis.	46	6238.67	BRL	2026-01-29 18:09:22.451462	2025-12-25 12:42:48.821405	1	2026-01-08 14:57:21.986374	2026-01-08 14:57:21.986375	\N	f	{"name": "Srta. Gabrielly Santos", "email": "ksilveira@example.com", "phone": "+55 (071) 9138-4679", "company": "da Luz"}	7
611	40	32	Brenda Silva - O conforto de mudar em estado puro	Oportunidade com Brenda Silva da empresa N/A.\n\nTempora blanditiis amet rem.\nEt quae vero assumenda. Vero corrupti optio numquam repudiandae quaerat. Similique maxime ipsa molestias.	47	42985.06	BRL	2026-02-09 13:58:38.997038	2026-01-05 01:09:01.641058	1	2026-01-08 14:57:21.986375	2026-01-08 14:57:21.986375	\N	f	{"name": "Brenda Silva", "email": "knogueira@example.org", "phone": "+55 11 5935 7634", "company": null}	14
612	42	41	Martins - A simplicidade de conseguir de maneira eficaz	Oportunidade com Luana Moreira da empresa Martins.\n\nEaque facere commodi fuga quisquam a consequuntur. Quibusdam velit ratione quod beatae.	0	4659.66	BRL	2026-02-09 08:47:34.773252	\N	0	2026-01-08 14:57:28.411498	2026-01-08 14:57:28.411501	\N	f	{"name": "Luana Moreira", "email": "cunhaleonardo@example.net", "phone": "71 2764-6930", "company": "Martins"}	25
613	43	38	Bernardo das Neves - O conforto de mudar sem preocupação	Oportunidade com Bernardo das Neves da empresa N/A.\n\nRem cumque totam suscipit reprehenderit. Quia nulla veritatis provident.\nBeatae recusandae quasi architecto odit. Quas officia voluptas quidem sequi.	1	20948.45	BRL	2026-03-04 22:52:48.774569	\N	0	2026-01-08 14:57:28.411502	2026-01-08 14:57:28.411502	\N	f	{"name": "Bernardo das Neves", "email": "diogo70@example.com", "phone": "+55 (061) 3079-1902", "company": null}	24
614	45	41	Juan Correia - O prazer de conseguir em estado puro	Oportunidade com Juan Correia da empresa N/A.\n\nCupiditate explicabo molestias officiis sapiente nesciunt. Omnis eligendi deserunt velit. Animi tempore voluptates cupiditate optio cupiditate.	2	18590.46	BRL	\N	2025-12-22 14:11:03.333472	1	2026-01-08 14:57:28.411502	2026-01-08 14:57:28.411502	\N	f	{"name": "Juan Correia", "email": "tfogaca@example.org", "phone": "+55 (051) 0155 3158", "company": null}	32
615	42	39	Carvalho - A possibilidade de ganhar naturalmente	Oportunidade com Dr. Luiz Otávio Freitas da empresa Carvalho.\n\nDebitis ea consequatur fugiat perferendis. Porro officia a nisi accusantium ab voluptatum.	3	32320.54	BRL	\N	\N	0	2026-01-08 14:57:28.411503	2026-01-08 14:57:28.411503	\N	f	{"name": "Dr. Luiz Ot\\u00e1vio Freitas", "email": "mendescaroline@example.net", "phone": "+55 (051) 2103 7185", "company": "Carvalho"}	36
616	44	39	Carvalho - A simplicidade de inovar simplesmente	Oportunidade com Dr. Luiz Otávio Freitas da empresa Carvalho.\n\nNon id quasi modi nesciunt. Repellat amet facere doloremque aspernatur. Accusamus illo tempora ipsa inventore.\nId eum assumenda unde. Incidunt rem quidem.	4	28343.24	BRL	2026-02-17 19:25:43.536216	\N	0	2026-01-08 14:57:28.411503	2026-01-08 14:57:28.411504	\N	f	{"name": "Dr. Luiz Ot\\u00e1vio Freitas", "email": "mendescaroline@example.net", "phone": "+55 (051) 2103 7185", "company": "Carvalho"}	36
617	45	40	Novaes - O prazer de mudar em estado puro	Oportunidade com Leonardo Cardoso da empresa Novaes.\n\nOdio laboriosam eaque distinctio. Voluptatem non fugiat voluptates qui excepturi. Laborum eius esse deserunt quia inventore animi. Qui voluptatem totam laudantium.	5	39381.86	BRL	2026-03-07 15:57:05.840751	2025-12-18 09:39:37.693954	1	2026-01-08 14:57:28.411504	2026-01-08 14:57:28.411504	\N	f	{"name": "Leonardo Cardoso", "email": "luana47@example.org", "phone": "+55 21 7973-6694", "company": "Novaes"}	30
618	41	40	Vieira - A possibilidade de concretizar seus projetos mais rapidamente	Oportunidade com Sra. Emanuelly Oliveira da empresa Vieira.\n\nPraesentium laboriosam possimus necessitatibus. Atque ipsa tempora voluptatem.	6	18439.01	BRL	2026-01-10 19:34:49.077175	\N	0	2026-01-08 14:57:28.411505	2026-01-08 14:57:28.411505	\N	f	{"name": "Sra. Emanuelly Oliveira", "email": "ana-laura65@example.com", "phone": "84 6436 0671", "company": "Vieira"}	44
619	41	37	Gomes S.A. - O poder de mudar em estado puro	Oportunidade com Pedro Henrique da Mata da empresa Gomes S.A..\n\nHarum numquam vel ratione. At rem repudiandae distinctio ut eius. Non atque explicabo sunt adipisci odit.	7	40620.06	BRL	2026-02-01 06:38:33.757131	\N	0	2026-01-08 14:57:28.411505	2026-01-08 14:57:28.411505	\N	f	{"name": "Pedro Henrique da Mata", "email": "mpeixoto@example.com", "phone": "(081) 6840-0720", "company": "Gomes S.A."}	45
620	45	41	Benício Souza - O conforto de avançar mais rapidamente	Oportunidade com Benício Souza da empresa N/A.\n\nSed est necessitatibus officiis perferendis. Possimus non architecto quo. Repellendus reprehenderit unde unde nostrum asperiores. Fugit vero inventore minus quo cumque.	8	26511.38	BRL	2026-02-03 04:42:36.785062	2025-12-26 11:17:05.832439	1	2026-01-08 14:57:28.411506	2026-01-08 14:57:28.411506	\N	f	{"name": "Ben\\u00edcio Souza", "email": "camposclara@example.net", "phone": "(021) 0087-1554", "company": null}	43
621	46	38	Vieira - O conforto de inovar antes de tudo	Oportunidade com Sra. Emanuelly Oliveira da empresa Vieira.\n\nOdit ducimus rerum dolores nostrum. Tempora illum recusandae voluptate expedita velit temporibus. Recusandae delectus exercitationem quaerat sed.	9	17026.97	BRL	2026-03-02 17:48:21.180147	2025-12-21 13:37:22.305883	-1	2026-01-08 14:57:28.411506	2026-01-08 14:57:28.411507	\N	f	{"name": "Sra. Emanuelly Oliveira", "email": "ana-laura65@example.com", "phone": "84 6436 0671", "company": "Vieira"}	44
784	34	33	Porto - A segurança de ganhar mais facilmente	Oportunidade com João Gabriel Moreira da empresa Porto.\n\nNisi cupiditate aliquam. Tenetur repellendus a est.	27	27444.48	BRL	2026-01-22 03:36:37.928301	\N	0	2026-01-08 14:58:40.587935	2026-01-08 14:58:40.587935	\N	f	{"name": "Jo\\u00e3o Gabriel Moreira", "email": "joao-lucas69@example.org", "phone": "+55 (071) 2610-1195", "company": "Porto"}	70
622	43	37	Carvalho e Filhos - A possibilidade de ganhar naturalmente	Oportunidade com Alana Castro da empresa Carvalho e Filhos.\n\nNulla nesciunt voluptatibus ex ex. Nisi minus necessitatibus mollitia aliquam animi.	10	33040.10	BRL	2026-02-20 02:29:28.065442	\N	0	2026-01-08 14:57:28.411507	2026-01-08 14:57:28.411507	\N	f	{"name": "Alana Castro", "email": "lucas-gabrielrocha@example.org", "phone": "(031) 7854-5888", "company": "Carvalho e Filhos"}	33
623	41	37	Ana Luiza da Costa - A arte de atingir seus objetivos direto da fonte	Oportunidade com Ana Luiza da Costa da empresa N/A.\n\nProvident quod quis veniam error. Sequi dolorum harum.\nDignissimos a cum magni officia quis ipsa voluptatum. Veniam facilis quos quia veniam. Nostrum facilis eaque tempore quos dolore eos fugit.	11	30061.09	BRL	2026-03-08 00:41:08.107685	\N	0	2026-01-08 14:57:28.411508	2026-01-08 14:57:28.411508	\N	f	{"name": "Ana Luiza da Costa", "email": "giovanna81@example.org", "phone": "11 2158 1261", "company": null}	31
624	43	38	Ana Luiza da Costa - A simplicidade de avançar mais facilmente	Oportunidade com Ana Luiza da Costa da empresa N/A.\n\nConsequatur consequatur numquam illo esse. Consequuntur atque laboriosam nemo culpa. Quaerat perferendis perferendis placeat quidem.	12	47952.57	BRL	2026-01-13 13:13:57.056974	\N	0	2026-01-08 14:57:28.411508	2026-01-08 14:57:28.411508	\N	f	{"name": "Ana Luiza da Costa", "email": "giovanna81@example.org", "phone": "11 2158 1261", "company": null}	31
625	42	41	Carvalho e Filhos - O conforto de atingir seus objetivos simplesmente	Oportunidade com Alana Castro da empresa Carvalho e Filhos.\n\nVoluptas ipsum consectetur corporis ipsum nihil laborum. Deserunt maxime deserunt ut voluptate vero. Quod id doloremque voluptates.	13	30483.72	BRL	\N	\N	0	2026-01-08 14:57:28.411509	2026-01-08 14:57:28.411509	\N	f	{"name": "Alana Castro", "email": "lucas-gabrielrocha@example.org", "phone": "(031) 7854-5888", "company": "Carvalho e Filhos"}	33
626	44	38	Gomes S.A. - A certeza de realizar seus sonhos simplesmente	Oportunidade com Pedro Henrique da Mata da empresa Gomes S.A..\n\nNatus iusto tempora doloremque repellendus vitae soluta. Expedita eligendi praesentium possimus consequatur libero ipsum. Ipsam tempore omnis vitae voluptate accusantium.	14	21244.08	BRL	2026-01-17 07:28:41.405597	\N	0	2026-01-08 14:57:28.411509	2026-01-08 14:57:28.41151	\N	f	{"name": "Pedro Henrique da Mata", "email": "mpeixoto@example.com", "phone": "(081) 6840-0720", "company": "Gomes S.A."}	45
627	44	40	Ana Luiza da Costa - O conforto de mudar com confiança	Oportunidade com Ana Luiza da Costa da empresa N/A.\n\nTempore labore error nihil. Veritatis ratione voluptatibus rerum.\nVero quod veritatis maxime. Neque earum sed sit numquam amet.	15	11970.55	BRL	\N	\N	0	2026-01-08 14:57:28.41151	2026-01-08 14:57:28.41151	\N	f	{"name": "Ana Luiza da Costa", "email": "giovanna81@example.org", "phone": "11 2158 1261", "company": null}	31
628	45	40	Gomes S.A. - O poder de conseguir em estado puro	Oportunidade com Pedro Henrique da Mata da empresa Gomes S.A..\n\nNecessitatibus beatae ut odit. Dicta aperiam tenetur repellat. Eveniet aperiam consectetur expedita dignissimos mollitia.	16	38557.49	BRL	2026-01-27 08:49:49.956891	2026-01-07 09:25:25.192351	1	2026-01-08 14:57:28.411511	2026-01-08 14:57:28.411511	\N	f	{"name": "Pedro Henrique da Mata", "email": "mpeixoto@example.com", "phone": "(081) 6840-0720", "company": "Gomes S.A."}	45
629	42	37	Rodrigues Rezende e Filhos - A simplicidade de avançar de maneira eficaz	Oportunidade com Danilo Silva da empresa Rodrigues Rezende e Filhos.\n\nDolores omnis eligendi in dolorum ipsum ipsam. Ipsam quas tempora beatae ullam ad. Id sint velit alias illo eius possimus.	17	10705.35	BRL	2026-01-24 10:39:43.312284	\N	0	2026-01-08 14:57:28.411511	2026-01-08 14:57:28.411511	\N	f	{"name": "Danilo Silva", "email": "oliveiraeduarda@example.com", "phone": "41 2043 9911", "company": "Rodrigues Rezende e Filhos"}	41
630	46	41	Carvalho - A possibilidade de ganhar mais rapidamente	Oportunidade com Dr. Luiz Otávio Freitas da empresa Carvalho.\n\nMinus numquam placeat id ad iste dicta. Mollitia at perspiciatis inventore fugiat.\nQuisquam iste fugit minus libero. Dignissimos minus eligendi rem architecto harum. Ad mollitia fugiat iure.	18	21842.36	BRL	2026-01-29 16:49:52.657566	2025-12-23 11:05:08.682785	-1	2026-01-08 14:57:28.411512	2026-01-08 14:57:28.411512	\N	f	{"name": "Dr. Luiz Ot\\u00e1vio Freitas", "email": "mendescaroline@example.net", "phone": "+55 (051) 2103 7185", "company": "Carvalho"}	36
631	44	40	Ana Luiza da Costa - A certeza de inovar mais facilmente	Oportunidade com Ana Luiza da Costa da empresa N/A.\n\nAlias facere harum. Sit adipisci repudiandae provident debitis ratione autem eaque. Consequuntur voluptas sapiente repellendus itaque quis porro asperiores.	19	12315.21	BRL	\N	\N	0	2026-01-08 14:57:28.411512	2026-01-08 14:57:28.411513	\N	f	{"name": "Ana Luiza da Costa", "email": "giovanna81@example.org", "phone": "11 2158 1261", "company": null}	31
632	41	39	Carvalho - O direito de ganhar antes de tudo	Oportunidade com Dr. Luiz Otávio Freitas da empresa Carvalho.\n\nTenetur unde et porro laborum a ab. Dolores iure ipsam aspernatur rerum provident perferendis. Minima repellendus a ex labore tempore qui.	20	33327.46	BRL	\N	\N	0	2026-01-08 14:57:28.411513	2026-01-08 14:57:28.411513	\N	f	{"name": "Dr. Luiz Ot\\u00e1vio Freitas", "email": "mendescaroline@example.net", "phone": "+55 (051) 2103 7185", "company": "Carvalho"}	36
633	41	40	Gomes S.A. - A segurança de realizar seus sonhos com toda a tranquilidade	Oportunidade com Pedro Henrique da Mata da empresa Gomes S.A..\n\nQuod fuga quis laboriosam. At amet voluptates dolor veniam. Est suscipit blanditiis vero nemo hic occaecati perspiciatis.\nEa saepe eos. Nobis dolores at culpa incidunt nemo exercitationem.	21	33244.30	BRL	2026-02-09 18:31:54.940262	\N	0	2026-01-08 14:57:28.411514	2026-01-08 14:57:28.411514	\N	f	{"name": "Pedro Henrique da Mata", "email": "mpeixoto@example.com", "phone": "(081) 6840-0720", "company": "Gomes S.A."}	45
634	41	41	Bernardo das Neves - O conforto de ganhar mais rapidamente	Oportunidade com Bernardo das Neves da empresa N/A.\n\nQuidem laboriosam aliquam modi veritatis. Doloribus possimus nisi numquam sint architecto similique.\nVitae velit quisquam. Dolor eum enim amet perspiciatis nesciunt. Aut harum nulla impedit velit.	22	6685.86	BRL	2026-02-21 01:57:45.610912	\N	0	2026-01-08 14:57:28.411514	2026-01-08 14:57:28.411514	\N	f	{"name": "Bernardo das Neves", "email": "diogo70@example.com", "phone": "+55 (061) 3079-1902", "company": null}	24
635	42	40	da Rosa - A vantagem de atingir seus objetivos com força total	Oportunidade com Cauê da Rocha da empresa da Rosa.\n\nSimilique illum fugiat ex. Accusamus omnis reprehenderit temporibus consectetur placeat dicta. Ducimus sapiente doloribus cum alias dolor voluptates consequuntur.\nDolor sequi commodi ab officia rem.	23	5659.62	BRL	\N	\N	0	2026-01-08 14:57:28.411515	2026-01-08 14:57:28.411515	\N	f	{"name": "Cau\\u00ea da Rocha", "email": "isabelda-cunha@example.net", "phone": "+55 71 4122-0087", "company": "da Rosa"}	37
636	46	37	Moraes - O poder de ganhar com confiança	Oportunidade com Emanuella Farias da empresa Moraes.\n\nAt fugiat explicabo modi accusantium quaerat. Ipsam nesciunt quaerat minima est. Ipsam numquam repellat accusamus nostrum quidem repellat.	24	27126.56	BRL	2026-02-12 03:21:15.275448	2025-12-21 19:34:25.080085	-1	2026-01-08 14:57:28.411515	2026-01-08 14:57:28.411516	\N	f	{"name": "Emanuella Farias", "email": "moreirarebeca@example.net", "phone": "+55 (041) 1305-7019", "company": "Moraes"}	39
637	43	37	Ana Luiza da Costa - A segurança de mudar naturalmente	Oportunidade com Ana Luiza da Costa da empresa N/A.\n\nAliquam maxime eligendi corporis. Adipisci hic adipisci unde consectetur ea. Natus maxime occaecati error et nulla non dolorem.\nIllum aliquam odit distinctio voluptate. Commodi nulla quia dolores a.	25	45559.68	BRL	2026-03-05 13:44:04.247569	\N	0	2026-01-08 14:57:28.411516	2026-01-08 14:57:28.411516	\N	f	{"name": "Ana Luiza da Costa", "email": "giovanna81@example.org", "phone": "11 2158 1261", "company": null}	31
638	42	40	Bryan da Rocha - A segurança de conseguir sem preocupação	Oportunidade com Bryan da Rocha da empresa N/A.\n\nUnde beatae quod nulla doloremque aperiam ipsa a.\nReiciendis sequi rerum. Consequatur perferendis nobis quibusdam dolores sed. Odio necessitatibus dolore modi placeat minima.	26	35627.85	BRL	2026-02-27 23:23:12.961923	\N	0	2026-01-08 14:57:28.411517	2026-01-08 14:57:28.411517	\N	f	{"name": "Bryan da Rocha", "email": "pietrocarvalho@example.org", "phone": "(051) 6896 0872", "company": null}	26
639	41	38	Vieira - O poder de evoluir de maneira eficaz	Oportunidade com Sra. Emanuelly Oliveira da empresa Vieira.\n\nPariatur voluptate eos aut expedita. Aliquid alias alias doloremque expedita officia.\nLaborum laborum suscipit officiis. Quibusdam similique unde corporis quas eveniet.	27	3460.28	BRL	2026-02-05 09:00:35.350391	\N	0	2026-01-08 14:57:28.411517	2026-01-08 14:57:28.411517	\N	f	{"name": "Sra. Emanuelly Oliveira", "email": "ana-laura65@example.com", "phone": "84 6436 0671", "company": "Vieira"}	44
640	44	41	Aragão Caldeira - EI - O conforto de evoluir simplesmente	Oportunidade com Luiz Gustavo Vieira da empresa Aragão Caldeira - EI.\n\nQuas ea nisi est consequuntur corporis.\nVelit quo nostrum dignissimos. Saepe ullam adipisci incidunt.\nQuae aliquid dolore nobis. Ab odit eum similique fugit laudantium quas cum.	28	4523.11	BRL	2026-02-17 19:33:04.029202	\N	0	2026-01-08 14:57:28.411518	2026-01-08 14:57:28.411518	\N	f	{"name": "Luiz Gustavo Vieira", "email": "lpires@example.com", "phone": "0900-490-2947", "company": "Arag\\u00e3o Caldeira - EI"}	38
641	45	37	Pinto - O direito de inovar de maneira eficaz	Oportunidade com Srta. Olivia Mendes da empresa Pinto.\n\nVel maxime quas enim accusamus praesentium beatae. Illum in unde animi. Sunt voluptate quasi quasi aliquid consequatur consequuntur.	29	1769.61	BRL	\N	2026-01-03 19:04:06.868695	1	2026-01-08 14:57:28.411518	2026-01-08 14:57:28.411519	\N	f	{"name": "Srta. Olivia Mendes", "email": "alexandre40@example.com", "phone": "11 7159 3621", "company": "Pinto"}	28
642	45	39	Novaes - A simplicidade de inovar direto da fonte	Oportunidade com Leonardo Cardoso da empresa Novaes.\n\nVitae quibusdam quos provident harum. Harum facilis maiores error sed dolores. A a id molestias maxime laudantium consequuntur.\nPerspiciatis ad laborum aliquid magni. Dolores deserunt iste sit hic.	30	2573.51	BRL	2026-02-10 04:50:33.766538	2026-01-03 16:52:56.215365	1	2026-01-08 14:57:28.411519	2026-01-08 14:57:28.411519	\N	f	{"name": "Leonardo Cardoso", "email": "luana47@example.org", "phone": "+55 21 7973-6694", "company": "Novaes"}	30
643	46	40	Vieira - A liberdade de inovar com confiança	Oportunidade com Sra. Emanuelly Oliveira da empresa Vieira.\n\nMaiores dicta expedita enim ut aliquam. Natus est quis consectetur sint ullam vero iusto. Nisi tenetur ex tenetur consequatur nihil molestias mollitia. Atque iste aliquam eveniet.	31	36874.87	BRL	\N	2025-12-16 22:16:45.815361	-1	2026-01-08 14:57:28.41152	2026-01-08 14:57:28.41152	\N	f	{"name": "Sra. Emanuelly Oliveira", "email": "ana-laura65@example.com", "phone": "84 6436 0671", "company": "Vieira"}	44
644	43	40	Pinto da Paz - EI - A segurança de atingir seus objetivos direto da fonte	Oportunidade com Anthony da Cunha da empresa Pinto da Paz - EI.\n\nRepudiandae dolores ea nostrum unde. Perferendis repellat molestias cumque. Nesciunt ullam esse provident fugit natus.	32	6402.27	BRL	\N	\N	0	2026-01-08 14:57:28.41152	2026-01-08 14:57:28.41152	\N	f	{"name": "Anthony da Cunha", "email": "moreiralorenzo@example.com", "phone": "41 3328-0294", "company": "Pinto da Paz - EI"}	35
645	44	37	Martins - A vantagem de ganhar naturalmente	Oportunidade com Luana Moreira da empresa Martins.\n\nSimilique neque expedita totam repellendus facilis nesciunt. Nulla ut asperiores quas facere perferendis. Sapiente repellendus blanditiis nemo illum.	33	3702.85	BRL	\N	\N	0	2026-01-08 14:57:28.411521	2026-01-08 14:57:28.411521	\N	f	{"name": "Luana Moreira", "email": "cunhaleonardo@example.net", "phone": "71 2764-6930", "company": "Martins"}	25
646	44	39	Ana Luiza da Costa - A segurança de avançar direto da fonte	Oportunidade com Ana Luiza da Costa da empresa N/A.\n\nAnimi expedita ea. Possimus modi blanditiis numquam ab.	34	19565.66	BRL	\N	\N	0	2026-01-08 14:57:28.411521	2026-01-08 14:57:28.411522	\N	f	{"name": "Ana Luiza da Costa", "email": "giovanna81@example.org", "phone": "11 2158 1261", "company": null}	31
647	43	37	da Cruz - A simplicidade de inovar com força total	Oportunidade com Dr. João Felipe da Luz da empresa da Cruz.\n\nIpsam debitis reiciendis inventore velit consectetur. At ex sint iste reprehenderit laborum corporis. Eius quia cumque assumenda dolorum.\nAlias alias voluptatibus doloribus nam itaque.	35	6391.88	BRL	2026-02-22 16:27:03.345323	\N	0	2026-01-08 14:57:28.411522	2026-01-08 14:57:28.411522	\N	f	{"name": "Dr. Jo\\u00e3o Felipe da Luz", "email": "vitormelo@example.net", "phone": "(041) 1521-1305", "company": "da Cruz"}	40
648	42	40	Rodrigues Rezende e Filhos - O prazer de realizar seus sonhos antes de tudo	Oportunidade com Danilo Silva da empresa Rodrigues Rezende e Filhos.\n\nIpsum consequatur a culpa tenetur quisquam laudantium. Laboriosam ex dignissimos dicta sint soluta inventore.	36	25025.68	BRL	2026-02-07 19:24:05.336514	\N	0	2026-01-08 14:57:28.411523	2026-01-08 14:57:28.411523	\N	f	{"name": "Danilo Silva", "email": "oliveiraeduarda@example.com", "phone": "41 2043 9911", "company": "Rodrigues Rezende e Filhos"}	41
649	41	41	Rodrigues Rezende e Filhos - O direito de atingir seus objetivos mais rapidamente	Oportunidade com Danilo Silva da empresa Rodrigues Rezende e Filhos.\n\nA quod ullam sint. Dolorum qui totam maiores. Assumenda nam quod maiores.	37	33965.94	BRL	2026-01-29 22:32:51.324539	\N	0	2026-01-08 14:57:28.411523	2026-01-08 14:57:28.411526	\N	f	{"name": "Danilo Silva", "email": "oliveiraeduarda@example.com", "phone": "41 2043 9911", "company": "Rodrigues Rezende e Filhos"}	41
650	46	41	Moraes - A arte de realizar seus sonhos simplesmente	Oportunidade com Emanuella Farias da empresa Moraes.\n\nNihil modi possimus sit veniam ipsa eaque. Autem distinctio natus recusandae pariatur. Ducimus repellendus ad assumenda ipsa sapiente.	38	31542.79	BRL	2026-02-12 05:02:08.29673	2025-12-19 17:58:51.799185	-1	2026-01-08 14:57:28.411526	2026-01-08 14:57:28.411527	\N	f	{"name": "Emanuella Farias", "email": "moreirarebeca@example.net", "phone": "+55 (041) 1305-7019", "company": "Moraes"}	39
651	44	41	Carvalho - O direito de mudar com força total	Oportunidade com Dr. Luiz Otávio Freitas da empresa Carvalho.\n\nNecessitatibus nemo maiores ea eius. Laborum impedit aperiam impedit eius nemo eaque. Dolores tempore optio inventore incidunt est.	39	9963.35	BRL	2026-02-23 21:32:50.613711	\N	0	2026-01-08 14:57:28.411527	2026-01-08 14:57:28.411527	\N	f	{"name": "Dr. Luiz Ot\\u00e1vio Freitas", "email": "mendescaroline@example.net", "phone": "+55 (051) 2103 7185", "company": "Carvalho"}	36
652	41	37	Moraes - O conforto de avançar direto da fonte	Oportunidade com Emanuella Farias da empresa Moraes.\n\nNisi odio minima consectetur. Dolor suscipit accusamus. Ipsam corrupti inventore voluptatum voluptatibus odit dolorum.	40	27744.19	BRL	\N	\N	0	2026-01-08 14:57:28.411528	2026-01-08 14:57:28.411528	\N	f	{"name": "Emanuella Farias", "email": "moreirarebeca@example.net", "phone": "+55 (041) 1305-7019", "company": "Moraes"}	39
653	49	37	Bernardo das Neves - A segurança de inovar direto da fonte	Oportunidade com Bernardo das Neves da empresa N/A.\n\nImpedit culpa facere perspiciatis ratione ducimus voluptate. Voluptatibus eaque nisi. Tempora repudiandae explicabo maxime explicabo. Ab deleniti quam laudantium atque.	0	42971.97	BRL	2026-02-07 07:03:35.268165	\N	0	2026-01-08 14:57:30.137452	2026-01-08 14:57:30.137458	\N	f	{"name": "Bernardo das Neves", "email": "diogo70@example.com", "phone": "+55 (061) 3079-1902", "company": null}	24
654	50	39	Aragão Caldeira - EI - O conforto de conseguir naturalmente	Oportunidade com Luiz Gustavo Vieira da empresa Aragão Caldeira - EI.\n\nVoluptatum commodi consequatur ipsam sunt earum. Cupiditate est quod cupiditate alias labore porro. Eos consequatur sit iste at.\nVoluptatibus quam at. Earum quaerat cupiditate dolore dicta amet.	1	3397.99	BRL	2026-02-03 16:00:18.894213	2026-01-01 18:13:45.782021	1	2026-01-08 14:57:30.137459	2026-01-08 14:57:30.13746	\N	f	{"name": "Luiz Gustavo Vieira", "email": "lpires@example.com", "phone": "0900-490-2947", "company": "Arag\\u00e3o Caldeira - EI"}	38
655	47	37	Bernardo das Neves - A arte de ganhar de maneira eficaz	Oportunidade com Bernardo das Neves da empresa N/A.\n\nAlias quisquam inventore. Quasi accusamus quae quod et.\nSuscipit unde rem. Culpa qui pariatur. Eius necessitatibus sit provident et aspernatur.	2	22597.27	BRL	\N	\N	0	2026-01-08 14:57:30.137461	2026-01-08 14:57:30.137461	\N	f	{"name": "Bernardo das Neves", "email": "diogo70@example.com", "phone": "+55 (061) 3079-1902", "company": null}	24
656	49	40	Moraes - A possibilidade de evoluir direto da fonte	Oportunidade com Emanuella Farias da empresa Moraes.\n\nCupiditate distinctio et dolorem odio. Perferendis iste odio blanditiis exercitationem illo. Consectetur totam quidem maxime et.	3	38159.22	BRL	\N	\N	0	2026-01-08 14:57:30.137462	2026-01-08 14:57:30.137462	\N	f	{"name": "Emanuella Farias", "email": "moreirarebeca@example.net", "phone": "+55 (041) 1305-7019", "company": "Moraes"}	39
657	50	37	Martins - O prazer de concretizar seus projetos em estado puro	Oportunidade com Luana Moreira da empresa Martins.\n\nAliquid culpa repudiandae ratione minima autem eaque quae. Ducimus doloribus placeat fugit doloremque ipsum sequi.\nFuga odit facilis. Quo officiis laudantium praesentium eos error.	4	17338.45	BRL	\N	2025-12-20 02:31:04.856871	1	2026-01-08 14:57:30.137463	2026-01-08 14:57:30.137464	\N	f	{"name": "Luana Moreira", "email": "cunhaleonardo@example.net", "phone": "71 2764-6930", "company": "Martins"}	25
658	50	38	Maria Cecília Barbosa - A vantagem de concretizar seus projetos com confiança	Oportunidade com Maria Cecília Barbosa da empresa N/A.\n\nIllo odit nulla est. Eligendi sequi ipsum asperiores repellat. Laborum animi culpa debitis inventore.\nEt necessitatibus eligendi voluptatum provident. Laudantium ab voluptates cum.	5	17288.22	BRL	2026-01-22 09:09:31.985675	2026-01-05 19:14:46.836419	1	2026-01-08 14:57:30.137465	2026-01-08 14:57:30.137465	\N	f	{"name": "Maria Cec\\u00edlia Barbosa", "email": "maria-alicemendes@example.com", "phone": "+55 84 9778-4243", "company": null}	27
659	47	40	Pinto - O direito de mudar com força total	Oportunidade com Srta. Olivia Mendes da empresa Pinto.\n\nBlanditiis rerum tempore sapiente commodi. Officia maiores doloremque repudiandae laudantium aut odit.\nNisi necessitatibus qui. Est maxime aliquid reprehenderit provident. Adipisci non totam vitae.	6	12926.77	BRL	2026-03-05 14:21:42.889729	\N	0	2026-01-08 14:57:30.137466	2026-01-08 14:57:30.137467	\N	f	{"name": "Srta. Olivia Mendes", "email": "alexandre40@example.com", "phone": "11 7159 3621", "company": "Pinto"}	28
660	48	41	Carvalho - A certeza de evoluir de maneira eficaz	Oportunidade com Dr. Luiz Otávio Freitas da empresa Carvalho.\n\nTempore odio alias necessitatibus placeat minus nesciunt.\nMinus cupiditate velit corrupti. Pariatur vero iste libero. Perferendis quasi eius adipisci illo labore a eos.	7	5665.10	BRL	\N	\N	0	2026-01-08 14:57:30.137468	2026-01-08 14:57:30.137468	\N	f	{"name": "Dr. Luiz Ot\\u00e1vio Freitas", "email": "mendescaroline@example.net", "phone": "+55 (051) 2103 7185", "company": "Carvalho"}	36
661	47	38	Carvalho e Filhos - A possibilidade de atingir seus objetivos mais facilmente	Oportunidade com Alana Castro da empresa Carvalho e Filhos.\n\nCommodi aliquam ducimus aperiam. Itaque consequuntur quia quidem.\nLaborum expedita porro non. Atque in veritatis ex veritatis quo.	8	7200.35	BRL	2026-01-13 05:15:01.972767	\N	0	2026-01-08 14:57:30.137469	2026-01-08 14:57:30.13747	\N	f	{"name": "Alana Castro", "email": "lucas-gabrielrocha@example.org", "phone": "(031) 7854-5888", "company": "Carvalho e Filhos"}	33
662	49	37	Carvalho - A segurança de conseguir sem preocupação	Oportunidade com Dr. Luiz Otávio Freitas da empresa Carvalho.\n\nNostrum nisi voluptate assumenda repellat rerum. Alias perspiciatis tenetur similique cumque. Nihil voluptatibus possimus alias nemo possimus.	9	10176.62	BRL	2026-02-18 04:25:38.490752	\N	0	2026-01-08 14:57:30.137471	2026-01-08 14:57:30.137471	\N	f	{"name": "Dr. Luiz Ot\\u00e1vio Freitas", "email": "mendescaroline@example.net", "phone": "+55 (051) 2103 7185", "company": "Carvalho"}	36
663	50	40	da Cruz - O direito de ganhar naturalmente	Oportunidade com Dr. João Felipe da Luz da empresa da Cruz.\n\nMagni soluta nobis laborum veniam libero sequi quia. Blanditiis voluptatibus rerum est odit dicta placeat quasi.	10	37730.31	BRL	2026-03-06 07:05:59.343686	2025-12-12 09:23:21.692235	1	2026-01-08 14:57:30.137472	2026-01-08 14:57:30.137472	\N	f	{"name": "Dr. Jo\\u00e3o Felipe da Luz", "email": "vitormelo@example.net", "phone": "(041) 1521-1305", "company": "da Cruz"}	40
664	47	41	Carvalho e Filhos - A arte de ganhar com toda a tranquilidade	Oportunidade com Alana Castro da empresa Carvalho e Filhos.\n\nDucimus unde illum tempora facilis. Vel nihil veniam voluptatibus sequi.	11	31862.66	BRL	2026-02-16 14:01:05.511221	\N	0	2026-01-08 14:57:30.137473	2026-01-08 14:57:30.137473	\N	f	{"name": "Alana Castro", "email": "lucas-gabrielrocha@example.org", "phone": "(031) 7854-5888", "company": "Carvalho e Filhos"}	33
665	50	38	Gomes S.A. - A arte de avançar com confiança	Oportunidade com Pedro Henrique da Mata da empresa Gomes S.A..\n\nEx maxime ea explicabo quisquam. Officia libero laboriosam culpa non ratione facilis necessitatibus.\nDolore voluptas ut corrupti iusto ipsum ipsa. Optio vitae odit excepturi.	12	30495.96	BRL	2026-02-01 03:28:44.114872	2025-12-21 06:19:37.363641	1	2026-01-08 14:57:30.137475	2026-01-08 14:57:30.137476	\N	f	{"name": "Pedro Henrique da Mata", "email": "mpeixoto@example.com", "phone": "(081) 6840-0720", "company": "Gomes S.A."}	45
666	47	37	da Cruz - A liberdade de avançar simplesmente	Oportunidade com Dr. João Felipe da Luz da empresa da Cruz.\n\nPraesentium quibusdam earum ipsam tenetur assumenda placeat saepe. Officiis tempora eaque magnam.\nExercitationem dolorem quaerat magni dolorem aperiam nisi. Quaerat sit culpa consequuntur ab.	13	35435.94	BRL	2026-02-16 01:03:07.432306	\N	0	2026-01-08 14:57:30.137477	2026-01-08 14:57:30.137477	\N	f	{"name": "Dr. Jo\\u00e3o Felipe da Luz", "email": "vitormelo@example.net", "phone": "(041) 1521-1305", "company": "da Cruz"}	40
667	48	39	Benício Souza - A vantagem de avançar direto da fonte	Oportunidade com Benício Souza da empresa N/A.\n\nCorporis assumenda facilis corrupti nisi. Ea quos rem neque. Porro officiis eum vero fuga necessitatibus accusantium.\nProvident eos quis temporibus. Nam ipsum architecto.	14	30999.92	BRL	2026-02-16 13:05:21.396463	\N	0	2026-01-08 14:57:30.137478	2026-01-08 14:57:30.137478	\N	f	{"name": "Ben\\u00edcio Souza", "email": "camposclara@example.net", "phone": "(021) 0087-1554", "company": null}	43
668	50	37	Carvalho - A liberdade de realizar seus sonhos com toda a tranquilidade	Oportunidade com Dr. Luiz Otávio Freitas da empresa Carvalho.\n\nEx rem magni aspernatur aliquam excepturi error. Rerum at animi maxime nesciunt nam quis.	15	24476.43	BRL	2026-02-22 21:51:13.207531	2026-01-05 03:13:54.148024	1	2026-01-08 14:57:30.137479	2026-01-08 14:57:30.137479	\N	f	{"name": "Dr. Luiz Ot\\u00e1vio Freitas", "email": "mendescaroline@example.net", "phone": "+55 (051) 2103 7185", "company": "Carvalho"}	36
669	49	41	Aragão Caldeira - EI - A possibilidade de conseguir de maneira eficaz	Oportunidade com Luiz Gustavo Vieira da empresa Aragão Caldeira - EI.\n\nAt neque eum repudiandae ducimus. Magnam quae officiis atque voluptatem ipsam.	16	36269.17	BRL	2026-01-28 09:03:49.71267	\N	0	2026-01-08 14:57:30.13748	2026-01-08 14:57:30.137481	\N	f	{"name": "Luiz Gustavo Vieira", "email": "lpires@example.com", "phone": "0900-490-2947", "company": "Arag\\u00e3o Caldeira - EI"}	38
670	50	41	Benício Souza - A arte de inovar com toda a tranquilidade	Oportunidade com Benício Souza da empresa N/A.\n\nNecessitatibus qui cupiditate hic. Odit assumenda aliquid accusamus dolore odit quisquam nobis.\nReiciendis enim impedit animi.\nMagni reprehenderit earum.	17	2829.41	BRL	2026-02-16 10:13:08.527363	2025-12-21 02:54:45.330171	1	2026-01-08 14:57:30.137481	2026-01-08 14:57:30.137482	\N	f	{"name": "Ben\\u00edcio Souza", "email": "camposclara@example.net", "phone": "(021) 0087-1554", "company": null}	43
671	47	41	da Cruz - A liberdade de mudar simplesmente	Oportunidade com Dr. João Felipe da Luz da empresa da Cruz.\n\nFugit consequatur expedita. Corrupti similique incidunt esse magnam. Ipsa est modi a facere aliquam sed.	18	9027.80	BRL	2026-02-19 12:06:39.821069	\N	0	2026-01-08 14:57:30.137482	2026-01-08 14:57:30.137483	\N	f	{"name": "Dr. Jo\\u00e3o Felipe da Luz", "email": "vitormelo@example.net", "phone": "(041) 1521-1305", "company": "da Cruz"}	40
672	47	38	Júlia da Cunha - A certeza de concretizar seus projetos direto da fonte	Oportunidade com Júlia da Cunha da empresa N/A.\n\nAliquam eaque ea occaecati harum magnam. Nesciunt commodi alias excepturi est.\nEaque repellendus corporis maiores. Rem cum pariatur nisi cum. Repellendus dicta recusandae ducimus.	19	33804.12	BRL	\N	\N	0	2026-01-08 14:57:30.137483	2026-01-08 14:57:30.137483	\N	f	{"name": "J\\u00falia da Cunha", "email": "giovanna39@example.com", "phone": "+55 81 4000 2537", "company": null}	34
673	47	37	Juan Correia - O conforto de evoluir sem preocupação	Oportunidade com Juan Correia da empresa N/A.\n\nQuidem molestias exercitationem soluta. Debitis ab tempore quia. Labore ab vitae temporibus saepe aperiam quae.	20	16965.66	BRL	\N	\N	0	2026-01-08 14:57:30.137484	2026-01-08 14:57:30.137484	\N	f	{"name": "Juan Correia", "email": "tfogaca@example.org", "phone": "+55 (051) 0155 3158", "company": null}	32
674	47	41	Carvalho e Filhos - O direito de evoluir sem preocupação	Oportunidade com Alana Castro da empresa Carvalho e Filhos.\n\nMolestias ipsum alias iste. Consectetur at repellendus necessitatibus veniam blanditiis. Mollitia earum pariatur mollitia quasi magnam facilis.	21	18205.71	BRL	2026-02-24 19:03:30.180073	\N	0	2026-01-08 14:57:30.137485	2026-01-08 14:57:30.137485	\N	f	{"name": "Alana Castro", "email": "lucas-gabrielrocha@example.org", "phone": "(031) 7854-5888", "company": "Carvalho e Filhos"}	33
675	49	40	Moraes - O direito de conseguir com força total	Oportunidade com Emanuella Farias da empresa Moraes.\n\nLaboriosam ipsum nisi consequatur. Sed ut quos eum neque quasi. Ipsam ipsam accusamus.\nConsequatur assumenda iusto ab ratione. Culpa ipsa alias reprehenderit explicabo adipisci labore.	22	13182.44	BRL	2026-02-12 19:36:44.994635	\N	0	2026-01-08 14:57:30.137486	2026-01-08 14:57:30.137486	\N	f	{"name": "Emanuella Farias", "email": "moreirarebeca@example.net", "phone": "+55 (041) 1305-7019", "company": "Moraes"}	39
676	48	37	Júlia da Cunha - A possibilidade de atingir seus objetivos mais rapidamente	Oportunidade com Júlia da Cunha da empresa N/A.\n\nOfficiis quae labore labore molestiae quaerat. Inventore a cum facilis. Quibusdam placeat at odio eos repudiandae mollitia.\nSit labore quae eos nostrum. Quia quis quis officiis.	23	47539.87	BRL	2026-02-22 18:23:48.022626	\N	0	2026-01-08 14:57:30.137487	2026-01-08 14:57:30.137488	\N	f	{"name": "J\\u00falia da Cunha", "email": "giovanna39@example.com", "phone": "+55 81 4000 2537", "company": null}	34
677	49	38	da Cruz - A vantagem de atingir seus objetivos mais facilmente	Oportunidade com Dr. João Felipe da Luz da empresa da Cruz.\n\nNobis et eaque. Quas magnam accusamus reprehenderit inventore. Eos perferendis error officiis.\nOdit aspernatur magni veritatis quod ex esse. Vel perspiciatis cumque. Repellendus ad eos tempora illo.	24	32909.09	BRL	2026-01-15 22:57:28.229432	\N	0	2026-01-08 14:57:30.137488	2026-01-08 14:57:30.137489	\N	f	{"name": "Dr. Jo\\u00e3o Felipe da Luz", "email": "vitormelo@example.net", "phone": "(041) 1521-1305", "company": "da Cruz"}	40
678	47	37	Novaes - O prazer de mudar sem preocupação	Oportunidade com Leonardo Cardoso da empresa Novaes.\n\nFacilis odio eum id unde dolorum. Tempora voluptas aut odit ipsa doloremque deserunt.\nMinima quibusdam laborum quidem a quod. Ducimus quasi occaecati in quae explicabo.	25	36494.30	BRL	2026-01-19 20:32:08.946423	\N	0	2026-01-08 14:57:30.137489	2026-01-08 14:57:30.13749	\N	f	{"name": "Leonardo Cardoso", "email": "luana47@example.org", "phone": "+55 21 7973-6694", "company": "Novaes"}	30
679	48	41	Carvalho e Filhos - A simplicidade de avançar simplesmente	Oportunidade com Alana Castro da empresa Carvalho e Filhos.\n\nDicta pariatur delectus. Eveniet repudiandae facere.\nOdio dignissimos exercitationem amet. Adipisci velit consequuntur a. Esse dolorum neque necessitatibus. Optio rem impedit.	26	49070.35	BRL	2026-01-20 01:37:45.764695	\N	0	2026-01-08 14:57:30.13749	2026-01-08 14:57:30.137491	\N	f	{"name": "Alana Castro", "email": "lucas-gabrielrocha@example.org", "phone": "(031) 7854-5888", "company": "Carvalho e Filhos"}	33
680	50	40	Carvalho - O direito de mudar mais rapidamente	Oportunidade com Dr. Luiz Otávio Freitas da empresa Carvalho.\n\nPraesentium dolorum commodi. Quia iure ipsum sequi in officiis. Necessitatibus possimus sunt aspernatur saepe earum totam illo.\nMaxime ea voluptatibus deleniti.	27	21276.23	BRL	2026-03-02 14:50:11.582039	2025-12-17 17:15:36.277315	1	2026-01-08 14:57:30.137491	2026-01-08 14:57:30.137492	\N	f	{"name": "Dr. Luiz Ot\\u00e1vio Freitas", "email": "mendescaroline@example.net", "phone": "+55 (051) 2103 7185", "company": "Carvalho"}	36
681	48	37	Fernandes - O poder de conseguir em estado puro	Oportunidade com Samuel Jesus da empresa Fernandes.\n\nDebitis perferendis a. Nesciunt cumque doloribus.\nSapiente eveniet laboriosam nihil. Deleniti libero optio magni ab debitis.	28	48803.59	BRL	2026-02-01 21:14:29.846273	\N	0	2026-01-08 14:57:30.137492	2026-01-08 14:57:30.137493	\N	f	{"name": "Samuel Jesus", "email": "caldeiraanthony@example.org", "phone": "+55 11 1676-5503", "company": "Fernandes"}	29
682	50	41	Júlia da Cunha - O conforto de concretizar seus projetos com toda a tranquilidade	Oportunidade com Júlia da Cunha da empresa N/A.\n\nPlaceat dicta consequatur tempore et. Error nemo ad odit. Ratione eveniet sunt ex ab repellendus provident.	29	27265.54	BRL	2026-02-28 15:45:35.565207	2025-12-28 04:24:40.025124	1	2026-01-08 14:57:30.137493	2026-01-08 14:57:30.137493	\N	f	{"name": "J\\u00falia da Cunha", "email": "giovanna39@example.com", "phone": "+55 81 4000 2537", "company": null}	34
683	49	38	Pinto - A vantagem de mudar simplesmente	Oportunidade com Srta. Olivia Mendes da empresa Pinto.\n\nTempore quam iste voluptatum odit officiis.\nIure placeat deserunt hic sequi. Veritatis dolores eveniet libero esse recusandae.	30	2115.46	BRL	2026-01-16 04:45:51.443625	\N	0	2026-01-08 14:57:30.137494	2026-01-08 14:57:30.137494	\N	f	{"name": "Srta. Olivia Mendes", "email": "alexandre40@example.com", "phone": "11 7159 3621", "company": "Pinto"}	28
684	49	37	Benício Souza - A vantagem de realizar seus sonhos direto da fonte	Oportunidade com Benício Souza da empresa N/A.\n\nDeleniti animi culpa error. Ratione soluta hic ut minus. Ab sint occaecati reiciendis nihil officiis.	31	4344.42	BRL	\N	\N	0	2026-01-08 14:57:30.137495	2026-01-08 14:57:30.137495	\N	f	{"name": "Ben\\u00edcio Souza", "email": "camposclara@example.net", "phone": "(021) 0087-1554", "company": null}	43
685	47	38	Bernardo das Neves - O direito de evoluir com força total	Oportunidade com Bernardo das Neves da empresa N/A.\n\nTenetur consequatur qui vero minus. Doloremque quod debitis natus eligendi.\nEst delectus impedit maxime. Nemo beatae delectus neque sapiente.	32	2234.47	BRL	2026-02-15 05:51:35.179505	\N	0	2026-01-08 14:57:30.137496	2026-01-08 14:57:30.137496	\N	f	{"name": "Bernardo das Neves", "email": "diogo70@example.com", "phone": "+55 (061) 3079-1902", "company": null}	24
686	48	41	Nunes - A segurança de inovar sem preocupação	Oportunidade com Danilo Monteiro da empresa Nunes.\n\nAspernatur eveniet nobis quos numquam aliquid. Officiis asperiores cupiditate ipsam.\nVel cumque deserunt fugit voluptatibus consequatur odit. Et sit laudantium aliquid quos asperiores voluptatibus.	33	2491.98	BRL	2026-02-15 06:23:07.688807	\N	0	2026-01-08 14:57:30.137497	2026-01-08 14:57:30.137497	\N	f	{"name": "Danilo Monteiro", "email": "maiteteixeira@example.com", "phone": "61 7770-2085", "company": "Nunes"}	42
687	54	48	Miguel Lopes - A vantagem de concretizar seus projetos em estado puro	Oportunidade com Miguel Lopes da empresa N/A.\n\nQuae voluptas eveniet. Voluptatibus hic animi possimus quis rem distinctio. Perferendis laborum voluptatum et voluptas.	0	6339.66	BRL	\N	\N	0	2026-01-08 14:57:36.578002	2026-01-08 14:57:36.578006	\N	f	{"name": "Miguel Lopes", "email": "hsouza@example.org", "phone": "+55 51 4048 3167", "company": null}	57
688	56	48	Pinto Monteiro S.A. - A possibilidade de conseguir com toda a tranquilidade	Oportunidade com Eduardo Moreira da empresa Pinto Monteiro S.A..\n\nIncidunt distinctio quam harum ducimus doloremque. Necessitatibus saepe nisi laudantium natus ratione animi.	1	48624.16	BRL	2026-01-12 11:51:56.972849	2026-01-01 10:29:11.519819	-1	2026-01-08 14:57:36.578007	2026-01-08 14:57:36.578007	\N	f	{"name": "Eduardo Moreira", "email": "zrezende@example.com", "phone": "+55 11 4676-3227", "company": "Pinto Monteiro S.A."}	60
689	52	46	da Cunha - A segurança de realizar seus sonhos naturalmente	Oportunidade com Guilherme Campos da empresa da Cunha.\n\nExplicabo fuga reprehenderit vero molestiae labore pariatur ratione. Modi perspiciatis vel laboriosam necessitatibus repellendus ipsa. Veritatis eos aliquid sapiente.	2	41406.27	BRL	2026-02-09 16:04:23.602726	\N	0	2026-01-08 14:57:36.578008	2026-01-08 14:57:36.578008	\N	f	{"name": "Guilherme Campos", "email": "pedroda-cruz@example.org", "phone": "+55 51 6442 1759", "company": "da Cunha"}	61
690	54	45	Sales Ltda. - O poder de ganhar mais facilmente	Oportunidade com Pietro Viana da empresa Sales Ltda..\n\nExercitationem dolore aut quae est ullam tempore. Odit suscipit id. Totam voluptates aperiam in asperiores libero ex qui. Doloremque doloribus libero dignissimos.	3	26307.01	BRL	2026-01-16 08:22:41.237885	\N	0	2026-01-08 14:57:36.578008	2026-01-08 14:57:36.578009	\N	f	{"name": "Pietro Viana", "email": "jbarbosa@example.org", "phone": "+55 (011) 8835 9215", "company": "Sales Ltda."}	46
691	56	47	Caldeira - A liberdade de evoluir com confiança	Oportunidade com Camila Rezende da empresa Caldeira.\n\nTotam ipsum at quidem ipsam quia. Similique nihil praesentium quasi. Cum iure excepturi ut hic saepe.\nDolor nobis libero vero architecto. Quisquam sapiente tempore fugiat sit non.	4	26679.36	BRL	\N	2025-12-16 00:19:52.304662	-1	2026-01-08 14:57:36.578009	2026-01-08 14:57:36.578009	\N	f	{"name": "Camila Rezende", "email": "luiz-felipe58@example.org", "phone": "(041) 7856 0561", "company": "Caldeira"}	49
692	54	47	da Cunha - A arte de mudar naturalmente	Oportunidade com Guilherme Campos da empresa da Cunha.\n\nIste perferendis tempore repudiandae.\nAb nobis quibusdam facilis doloremque. Aliquid aliquid eum sint sed quas velit laborum. Veritatis molestiae dolore quaerat.	5	6835.45	BRL	2026-01-13 11:56:34.195116	\N	0	2026-01-08 14:57:36.578009	2026-01-08 14:57:36.57801	\N	f	{"name": "Guilherme Campos", "email": "pedroda-cruz@example.org", "phone": "+55 51 6442 1759", "company": "da Cunha"}	61
693	51	47	Caldeira - A possibilidade de avançar sem preocupação	Oportunidade com Camila Rezende da empresa Caldeira.\n\nConsequatur modi blanditiis officiis. Repudiandae quia explicabo ipsam est nobis doloremque natus.	6	49942.51	BRL	2026-02-20 09:19:22.269286	\N	0	2026-01-08 14:57:36.57801	2026-01-08 14:57:36.57801	\N	f	{"name": "Camila Rezende", "email": "luiz-felipe58@example.org", "phone": "(041) 7856 0561", "company": "Caldeira"}	49
694	54	48	Silveira - O conforto de inovar direto da fonte	Oportunidade com Matheus Santos da empresa Silveira.\n\nDolores ipsam fugiat magnam consectetur. Ex nostrum repellendus esse quis dolore porro. Eum voluptate dignissimos libero.	7	1537.05	BRL	2026-02-27 00:11:46.546774	\N	0	2026-01-08 14:57:36.578011	2026-01-08 14:57:36.578011	\N	f	{"name": "Matheus Santos", "email": "ferreirabernardo@example.org", "phone": "21 4942 3905", "company": "Silveira"}	50
695	55	48	Teixeira Souza S/A - O poder de inovar em estado puro	Oportunidade com Caio Pires da empresa Teixeira Souza S/A.\n\nExcepturi odit soluta excepturi magnam. Quos dolorum quae accusantium cum similique.\nOfficia sunt dolore porro. Laborum adipisci officia ipsam temporibus fugit aliquid voluptates.	8	2113.02	BRL	2026-01-13 07:46:11.484983	2025-12-20 10:12:25.324865	1	2026-01-08 14:57:36.578011	2026-01-08 14:57:36.578011	\N	f	{"name": "Caio Pires", "email": "yda-costa@example.com", "phone": "+55 (071) 6638 7617", "company": "Teixeira Souza S/A"}	55
696	53	48	Miguel Souza - O conforto de conseguir direto da fonte	Oportunidade com Miguel Souza da empresa N/A.\n\nOfficiis quos saepe quis consequuntur modi. Quod ipsa omnis nobis quidem quae iste.\nSoluta voluptate eum nostrum. Quidem eum cum modi odit.	9	29708.77	BRL	2026-01-11 01:26:41.501966	\N	0	2026-01-08 14:57:36.578012	2026-01-08 14:57:36.578012	\N	f	{"name": "Miguel Souza", "email": "felipe54@example.com", "phone": "+55 41 9760 9397", "company": null}	53
697	55	46	Almeida - A segurança de conseguir simplesmente	Oportunidade com Stella Gomes da empresa Almeida.\n\nQui excepturi commodi. Deserunt ea quod omnis aperiam. Unde nemo pariatur possimus aspernatur sit.\nQuidem a numquam. At unde et nisi cupiditate nam.	10	7075.46	BRL	\N	2025-12-20 07:42:28.043053	1	2026-01-08 14:57:36.578012	2026-01-08 14:57:36.578013	\N	f	{"name": "Stella Gomes", "email": "caua11@example.com", "phone": "(061) 5077 2661", "company": "Almeida"}	56
698	56	49	Silveira - O prazer de avançar com força total	Oportunidade com Matheus Santos da empresa Silveira.\n\nRem eius ea quisquam. Consectetur assumenda sed a cupiditate. Adipisci aspernatur quod sapiente.	11	12247.40	BRL	\N	2025-12-13 12:30:45.104652	-1	2026-01-08 14:57:36.578013	2026-01-08 14:57:36.578013	\N	f	{"name": "Matheus Santos", "email": "ferreirabernardo@example.org", "phone": "21 4942 3905", "company": "Silveira"}	50
699	53	45	Silveira da Cunha Ltda. - O prazer de realizar seus sonhos com toda a tranquilidade	Oportunidade com Igor Santos da empresa Silveira da Cunha Ltda..\n\nAspernatur voluptatum incidunt in odio corporis cum. Minima veritatis dolorem aliquam. At distinctio non facere alias.\nEos adipisci ducimus cum sunt deleniti odit.	12	48082.63	BRL	2026-03-02 09:44:20.261355	\N	0	2026-01-08 14:57:36.578014	2026-01-08 14:57:36.578014	\N	f	{"name": "Igor Santos", "email": "jcardoso@example.net", "phone": "0900 756 0586", "company": "Silveira da Cunha Ltda."}	51
700	53	46	Danilo Rezende - O conforto de realizar seus sonhos com força total	Oportunidade com Danilo Rezende da empresa N/A.\n\nAccusamus possimus labore voluptates. Repellendus corporis excepturi animi.\nInventore totam non a voluptas aliquam laboriosam. Dolorem eveniet eligendi dolorum.	13	16404.04	BRL	\N	\N	0	2026-01-08 14:57:36.578014	2026-01-08 14:57:36.578014	\N	f	{"name": "Danilo Rezende", "email": "icunha@example.net", "phone": "31 8833-9315", "company": null}	47
701	54	45	da Cunha - A segurança de concretizar seus projetos sem preocupação	Oportunidade com Guilherme Campos da empresa da Cunha.\n\nA quas quas. Dolor repellat sequi eligendi qui perspiciatis cumque.\nEst veniam veritatis modi aliquam consectetur saepe. Mollitia nam qui amet dolorum debitis.	14	41241.71	BRL	2026-01-30 21:27:41.626676	\N	0	2026-01-08 14:57:36.578015	2026-01-08 14:57:36.578015	\N	f	{"name": "Guilherme Campos", "email": "pedroda-cruz@example.org", "phone": "+55 51 6442 1759", "company": "da Cunha"}	61
702	52	47	Silveira da Cunha Ltda. - O direito de mudar antes de tudo	Oportunidade com Igor Santos da empresa Silveira da Cunha Ltda..\n\nIncidunt impedit molestiae soluta dolor molestias molestiae atque. Nobis cupiditate occaecati repellat consectetur. Nemo nostrum numquam inventore.	15	48340.95	BRL	2026-03-07 02:33:53.719533	\N	0	2026-01-08 14:57:36.578015	2026-01-08 14:57:36.578015	\N	f	{"name": "Igor Santos", "email": "jcardoso@example.net", "phone": "0900 756 0586", "company": "Silveira da Cunha Ltda."}	51
703	52	47	Maria Vitória Aragão - O poder de atingir seus objetivos com força total	Oportunidade com Maria Vitória Aragão da empresa N/A.\n\nFugiat quidem eum in minima ea repellat. Porro incidunt illum voluptas corrupti sunt.\nQuae quibusdam magni quibusdam. Fuga eveniet perspiciatis.	16	22901.15	BRL	\N	\N	0	2026-01-08 14:57:36.578016	2026-01-08 14:57:36.578016	\N	f	{"name": "Maria Vit\\u00f3ria Arag\\u00e3o", "email": "vieiracaio@example.net", "phone": "0900 085 7305", "company": null}	52
704	55	47	Silveira - A segurança de inovar direto da fonte	Oportunidade com Matheus Santos da empresa Silveira.\n\nAut autem neque assumenda. Nisi cum facilis nam.\nIure praesentium non. Animi ea ducimus. Odio quas commodi voluptate. Quia rerum quos quisquam placeat.	17	12643.77	BRL	2026-01-16 08:42:56.966738	2026-01-06 16:24:51.820279	1	2026-01-08 14:57:36.578017	2026-01-08 14:57:36.578017	\N	f	{"name": "Matheus Santos", "email": "ferreirabernardo@example.org", "phone": "21 4942 3905", "company": "Silveira"}	50
705	54	46	Silveira - O prazer de concretizar seus projetos de maneira eficaz	Oportunidade com Matheus Santos da empresa Silveira.\n\nLaudantium minima in fuga commodi dolores perferendis. Dolorum iure laborum voluptate adipisci voluptate reiciendis.	18	31360.50	BRL	\N	\N	0	2026-01-08 14:57:36.578017	2026-01-08 14:57:36.578017	\N	f	{"name": "Matheus Santos", "email": "ferreirabernardo@example.org", "phone": "21 4942 3905", "company": "Silveira"}	50
706	52	46	Caldeira - A segurança de evoluir com confiança	Oportunidade com Camila Rezende da empresa Caldeira.\n\nDoloremque necessitatibus voluptatum quos qui expedita. Alias tempora aspernatur debitis.	19	38261.07	BRL	\N	\N	0	2026-01-08 14:57:36.578018	2026-01-08 14:57:36.578018	\N	f	{"name": "Camila Rezende", "email": "luiz-felipe58@example.org", "phone": "(041) 7856 0561", "company": "Caldeira"}	49
707	55	46	da Paz - ME - O prazer de inovar mais rapidamente	Oportunidade com Sophia Nascimento da empresa da Paz - ME.\n\nQuisquam praesentium nobis iste cumque nihil eveniet. Inventore quod eius sequi et nihil.	20	30830.39	BRL	2026-01-10 02:31:22.563839	2025-12-19 20:51:08.226123	1	2026-01-08 14:57:36.578018	2026-01-08 14:57:36.578019	\N	f	{"name": "Sophia Nascimento", "email": "kcavalcanti@example.com", "phone": "0300 797 7841", "company": "da Paz - ME"}	48
708	55	47	Caldeira - A segurança de realizar seus sonhos mais facilmente	Oportunidade com Camila Rezende da empresa Caldeira.\n\nSequi nulla nobis nihil. Eveniet fuga laborum laudantium eius. Minima ducimus explicabo. Nobis enim magnam quam.	21	36402.65	BRL	2026-01-24 11:30:15.831423	2025-12-29 09:57:54.669146	1	2026-01-08 14:57:36.578019	2026-01-08 14:57:36.578019	\N	f	{"name": "Camila Rezende", "email": "luiz-felipe58@example.org", "phone": "(041) 7856 0561", "company": "Caldeira"}	49
709	54	49	Viana S/A - O poder de evoluir mais rapidamente	Oportunidade com Sr. Felipe da Luz da empresa Viana S/A.\n\nAccusamus dignissimos at doloribus consequatur. Iusto quasi magnam tempore. Delectus aliquid porro fuga.\nCulpa quisquam unde numquam cupiditate. Rem voluptas illum rem.	22	46727.58	BRL	2026-03-07 13:39:53.097132	\N	0	2026-01-08 14:57:36.57802	2026-01-08 14:57:36.57802	\N	f	{"name": "Sr. Felipe da Luz", "email": "diasnicole@example.com", "phone": "31 2704-8326", "company": "Viana S/A"}	54
710	51	47	Viana S.A. - A simplicidade de realizar seus sonhos simplesmente	Oportunidade com Eduarda da Cruz da empresa Viana S.A..\n\nDolor sequi ullam pariatur. Similique nobis consequatur nobis vitae mollitia eaque perferendis.\nExcepturi et quod voluptatum. Qui beatae libero numquam beatae architecto animi.	23	29000.71	BRL	2026-02-16 16:03:42.624879	\N	0	2026-01-08 14:57:36.57802	2026-01-08 14:57:36.57802	\N	f	{"name": "Eduarda da Cruz", "email": "knogueira@example.org", "phone": "(021) 9775 3122", "company": "Viana S.A."}	59
711	55	48	Elisa das Neves - O poder de inovar com toda a tranquilidade	Oportunidade com Elisa das Neves da empresa N/A.\n\nQuasi voluptate facilis natus sunt. Minus repellendus tempore beatae accusamus. Ipsa repellat itaque placeat aspernatur eos doloremque facilis.	24	22230.66	BRL	2026-02-22 01:28:22.068828	2026-01-04 16:57:05.27174	1	2026-01-08 14:57:36.578021	2026-01-08 14:57:36.578021	\N	f	{"name": "Elisa das Neves", "email": "rezendefrancisco@example.org", "phone": "84 5002-4659", "company": null}	62
712	54	48	Pinto Monteiro S.A. - A possibilidade de realizar seus sonhos simplesmente	Oportunidade com Eduardo Moreira da empresa Pinto Monteiro S.A..\n\nConsequuntur quibusdam exercitationem sequi optio adipisci aperiam.\nEum impedit praesentium atque accusantium. At accusamus consequuntur cupiditate architecto facere omnis eveniet.	25	27764.45	BRL	2026-02-01 21:45:49.033608	\N	0	2026-01-08 14:57:36.578021	2026-01-08 14:57:36.578022	\N	f	{"name": "Eduardo Moreira", "email": "zrezende@example.com", "phone": "+55 11 4676-3227", "company": "Pinto Monteiro S.A."}	60
713	56	47	Viana S.A. - A segurança de mudar com confiança	Oportunidade com Eduarda da Cruz da empresa Viana S.A..\n\nItaque tenetur magni omnis. Temporibus quae expedita debitis porro.\nDistinctio facilis voluptates incidunt. Adipisci ullam iure fuga quisquam ducimus. Harum voluptatum ipsa voluptatibus fuga.	26	9268.31	BRL	2026-01-28 10:11:33.499314	2026-01-05 15:10:52.007674	-1	2026-01-08 14:57:36.578022	2026-01-08 14:57:36.578022	\N	f	{"name": "Eduarda da Cruz", "email": "knogueira@example.org", "phone": "(021) 9775 3122", "company": "Viana S.A."}	59
714	55	47	Maria Vitória Aragão - O conforto de mudar simplesmente	Oportunidade com Maria Vitória Aragão da empresa N/A.\n\nIncidunt amet ad autem voluptate atque. In necessitatibus doloremque aliquam. Voluptatum facilis itaque ipsa aliquid ab possimus. Possimus aspernatur voluptates voluptatum mollitia vel.	27	3743.28	BRL	2026-03-06 01:03:58.31687	2025-12-12 12:16:06.400942	1	2026-01-08 14:57:36.578023	2026-01-08 14:57:36.578023	\N	f	{"name": "Maria Vit\\u00f3ria Arag\\u00e3o", "email": "vieiracaio@example.net", "phone": "0900 085 7305", "company": null}	52
715	54	49	da Cunha - A possibilidade de conseguir mais rapidamente	Oportunidade com Guilherme Campos da empresa da Cunha.\n\nExplicabo dolorum occaecati libero cumque. Perspiciatis laboriosam fugiat minus a velit. Hic consequuntur accusantium unde.	28	21332.44	BRL	\N	\N	0	2026-01-08 14:57:36.578023	2026-01-08 14:57:36.578023	\N	f	{"name": "Guilherme Campos", "email": "pedroda-cruz@example.org", "phone": "+55 51 6442 1759", "company": "da Cunha"}	61
716	56	48	Miguel Souza - O poder de avançar com toda a tranquilidade	Oportunidade com Miguel Souza da empresa N/A.\n\nDoloribus voluptate quae eaque delectus possimus. Repellat iure molestiae tempora veniam odit.\nUllam necessitatibus delectus ratione molestiae asperiores. Quos quos aliquam dignissimos optio soluta.	29	16712.01	BRL	2026-02-16 23:41:49.737405	2025-12-16 14:37:20.374517	-1	2026-01-08 14:57:36.578024	2026-01-08 14:57:36.578024	\N	f	{"name": "Miguel Souza", "email": "felipe54@example.com", "phone": "+55 41 9760 9397", "company": null}	53
717	53	45	Miguel Souza - A segurança de realizar seus sonhos mais facilmente	Oportunidade com Miguel Souza da empresa N/A.\n\nHic temporibus iusto commodi earum odit impedit voluptate. Necessitatibus dolor eos excepturi recusandae. Ullam voluptatum in eligendi illum sapiente quis.	30	44279.17	BRL	2026-01-25 14:58:29.167861	\N	0	2026-01-08 14:57:36.578024	2026-01-08 14:57:36.578024	\N	f	{"name": "Miguel Souza", "email": "felipe54@example.com", "phone": "+55 41 9760 9397", "company": null}	53
718	54	48	Caldeira - A possibilidade de conseguir sem preocupação	Oportunidade com Camila Rezende da empresa Caldeira.\n\nQuidem minus itaque sequi sed fugiat quod. Maxime libero excepturi. Corrupti id excepturi quasi cupiditate eveniet sint.	31	30102.30	BRL	\N	\N	0	2026-01-08 14:57:36.578025	2026-01-08 14:57:36.578025	\N	f	{"name": "Camila Rezende", "email": "luiz-felipe58@example.org", "phone": "(041) 7856 0561", "company": "Caldeira"}	49
719	56	49	Silveira - A possibilidade de inovar sem preocupação	Oportunidade com Matheus Santos da empresa Silveira.\n\nBlanditiis est facilis commodi animi illum sapiente. Ipsa accusantium id ea occaecati voluptates recusandae. Quam quis suscipit provident mollitia quam soluta.	32	3680.38	BRL	\N	2025-12-16 01:22:39.907847	-1	2026-01-08 14:57:36.578025	2026-01-08 14:57:36.578026	\N	f	{"name": "Matheus Santos", "email": "ferreirabernardo@example.org", "phone": "21 4942 3905", "company": "Silveira"}	50
720	54	49	Danilo Rezende - A vantagem de atingir seus objetivos de maneira eficaz	Oportunidade com Danilo Rezende da empresa N/A.\n\nAtque est dolorum laudantium pariatur quidem dolorem iusto. Aut fuga dignissimos deserunt est perspiciatis.\nQuibusdam similique est fugiat vel fugit. Quis aperiam quia expedita omnis assumenda.	33	44505.93	BRL	2026-02-24 06:54:28.727753	\N	0	2026-01-08 14:57:36.578026	2026-01-08 14:57:36.578026	\N	f	{"name": "Danilo Rezende", "email": "icunha@example.net", "phone": "31 8833-9315", "company": null}	47
721	54	45	Silveira - A liberdade de conseguir simplesmente	Oportunidade com Matheus Santos da empresa Silveira.\n\nFugiat delectus dolorum consequuntur placeat. Ad illo magni dolorum.\nIpsam non totam quod dolorum aut. Id quidem a.\nSuscipit voluptatum quidem itaque. Eum accusantium quo natus eveniet nulla vitae.	34	1428.89	BRL	2026-02-26 02:23:01.986968	\N	0	2026-01-08 14:57:36.578027	2026-01-08 14:57:36.578027	\N	f	{"name": "Matheus Santos", "email": "ferreirabernardo@example.org", "phone": "21 4942 3905", "company": "Silveira"}	50
722	58	45	da Mota Ltda. - A liberdade de conseguir direto da fonte	Oportunidade com Juan da Rosa da empresa da Mota Ltda..\n\nImpedit dolorum sed eius. Unde tempore labore quam.\nIusto consectetur eligendi eum alias dolore. Inventore enim odio quia perspiciatis recusandae nesciunt quos. Fugiat qui sit.	0	16584.50	BRL	\N	\N	0	2026-01-08 14:57:38.309199	2026-01-08 14:57:38.309202	\N	f	{"name": "Juan da Rosa", "email": "nascimentoluiz-henrique@example.com", "phone": "+55 21 5821-6324", "company": "da Mota Ltda."}	58
723	59	49	da Cunha - A liberdade de mudar com confiança	Oportunidade com Guilherme Campos da empresa da Cunha.\n\nIusto necessitatibus soluta quidem ratione quos. Temporibus quae hic voluptatum tempora quidem. Voluptatum pariatur harum vel necessitatibus ex.	1	15085.72	BRL	\N	\N	0	2026-01-08 14:57:38.309203	2026-01-08 14:57:38.309203	\N	f	{"name": "Guilherme Campos", "email": "pedroda-cruz@example.org", "phone": "+55 51 6442 1759", "company": "da Cunha"}	61
724	60	46	Sales Ltda. - A liberdade de avançar mais facilmente	Oportunidade com Pietro Viana da empresa Sales Ltda..\n\nConsequuntur voluptas asperiores error veniam voluptate. Exercitationem culpa doloribus nulla. Voluptatum incidunt tenetur et porro ducimus.	2	42077.99	BRL	2026-01-21 16:36:48.810172	2025-12-26 05:41:11.173166	1	2026-01-08 14:57:38.309204	2026-01-08 14:57:38.309204	\N	f	{"name": "Pietro Viana", "email": "jbarbosa@example.org", "phone": "+55 (011) 8835 9215", "company": "Sales Ltda."}	46
725	58	45	Maria Vitória Aragão - A vantagem de atingir seus objetivos simplesmente	Oportunidade com Maria Vitória Aragão da empresa N/A.\n\nAt facilis occaecati quibusdam. Quibusdam magni sed in repellendus quam error.\nAb tenetur earum natus delectus. Mollitia rem necessitatibus eius. Sunt impedit maiores.	3	20870.49	BRL	2026-02-25 08:07:34.113521	\N	0	2026-01-08 14:57:38.309205	2026-01-08 14:57:38.309205	\N	f	{"name": "Maria Vit\\u00f3ria Arag\\u00e3o", "email": "vieiracaio@example.net", "phone": "0900 085 7305", "company": null}	52
726	58	48	Teixeira Souza S/A - A certeza de realizar seus sonhos de maneira eficaz	Oportunidade com Caio Pires da empresa Teixeira Souza S/A.\n\nConsectetur molestias sit quidem qui in.\nDolores asperiores rem doloribus deserunt voluptatem nisi.	4	21460.42	BRL	2026-01-25 12:44:52.474175	\N	0	2026-01-08 14:57:38.309205	2026-01-08 14:57:38.309206	\N	f	{"name": "Caio Pires", "email": "yda-costa@example.com", "phone": "+55 (071) 6638 7617", "company": "Teixeira Souza S/A"}	55
727	59	48	Maria Vitória Aragão - A liberdade de avançar simplesmente	Oportunidade com Maria Vitória Aragão da empresa N/A.\n\nOptio quod eius placeat. Optio provident totam occaecati dolores nemo sapiente laboriosam.\nAut est harum animi tenetur laboriosam veniam. Corrupti quia excepturi optio et.	5	46512.87	BRL	2026-03-07 10:40:01.388384	\N	0	2026-01-08 14:57:38.309206	2026-01-08 14:57:38.309206	\N	f	{"name": "Maria Vit\\u00f3ria Arag\\u00e3o", "email": "vieiracaio@example.net", "phone": "0900 085 7305", "company": null}	52
728	60	46	Maria Vitória Aragão - O conforto de inovar com toda a tranquilidade	Oportunidade com Maria Vitória Aragão da empresa N/A.\n\nVel aliquam non ipsam. Consequatur odio ipsum dolor.	6	10652.85	BRL	\N	2025-12-16 06:42:51.486261	1	2026-01-08 14:57:38.309207	2026-01-08 14:57:38.309207	\N	f	{"name": "Maria Vit\\u00f3ria Arag\\u00e3o", "email": "vieiracaio@example.net", "phone": "0900 085 7305", "company": null}	52
729	57	46	Caldeira - A arte de concretizar seus projetos sem preocupação	Oportunidade com Camila Rezende da empresa Caldeira.\n\nCum optio quia tempore aperiam eligendi odit. Excepturi eaque debitis repellendus vitae quaerat iste.	7	41277.01	BRL	2026-03-03 23:19:40.209619	\N	0	2026-01-08 14:57:38.309207	2026-01-08 14:57:38.309207	\N	f	{"name": "Camila Rezende", "email": "luiz-felipe58@example.org", "phone": "(041) 7856 0561", "company": "Caldeira"}	49
730	57	46	da Paz - ME - A vantagem de mudar com força total	Oportunidade com Sophia Nascimento da empresa da Paz - ME.\n\nIure ullam ad laboriosam laborum eos. Magni perspiciatis aliquam quo quidem ipsa. Recusandae rem suscipit asperiores natus magni quidem.	8	3548.03	BRL	2026-02-10 11:35:47.465059	\N	0	2026-01-08 14:57:38.309208	2026-01-08 14:57:38.309208	\N	f	{"name": "Sophia Nascimento", "email": "kcavalcanti@example.com", "phone": "0300 797 7841", "company": "da Paz - ME"}	48
731	59	45	Viana S.A. - A liberdade de concretizar seus projetos naturalmente	Oportunidade com Eduarda da Cruz da empresa Viana S.A..\n\nExercitationem sapiente molestias vitae officia dolore. Consequatur error mollitia.	9	48814.49	BRL	\N	\N	0	2026-01-08 14:57:38.309209	2026-01-08 14:57:38.309209	\N	f	{"name": "Eduarda da Cruz", "email": "knogueira@example.org", "phone": "(021) 9775 3122", "company": "Viana S.A."}	59
732	59	47	Almeida - O conforto de inovar antes de tudo	Oportunidade com Stella Gomes da empresa Almeida.\n\nOfficiis quae itaque veniam. Ullam nihil recusandae hic. Asperiores temporibus voluptatem unde.	10	47267.89	BRL	2026-01-10 04:33:45.231367	\N	0	2026-01-08 14:57:38.309209	2026-01-08 14:57:38.309209	\N	f	{"name": "Stella Gomes", "email": "caua11@example.com", "phone": "(061) 5077 2661", "company": "Almeida"}	56
733	57	48	Viana S/A - A certeza de avançar mais facilmente	Oportunidade com Sr. Felipe da Luz da empresa Viana S/A.\n\nEos consectetur commodi nihil ea mollitia cupiditate. Deleniti animi ad sequi natus voluptatibus.\nDelectus assumenda ipsa nihil. Minus soluta facilis ratione quaerat eum consequuntur.	11	19279.47	BRL	2026-01-16 19:00:03.253737	\N	0	2026-01-08 14:57:38.30921	2026-01-08 14:57:38.30921	\N	f	{"name": "Sr. Felipe da Luz", "email": "diasnicole@example.com", "phone": "31 2704-8326", "company": "Viana S/A"}	54
734	58	48	Miguel Lopes - A liberdade de conseguir simplesmente	Oportunidade com Miguel Lopes da empresa N/A.\n\nPorro voluptas esse perferendis consectetur quas cumque. Laudantium tenetur rerum perferendis.	12	13910.64	BRL	2026-01-30 00:30:28.955951	\N	0	2026-01-08 14:57:38.30921	2026-01-08 14:57:38.309211	\N	f	{"name": "Miguel Lopes", "email": "hsouza@example.org", "phone": "+55 51 4048 3167", "company": null}	57
735	57	48	Viana S/A - O poder de ganhar naturalmente	Oportunidade com Sr. Felipe da Luz da empresa Viana S/A.\n\nAspernatur occaecati illo provident doloribus delectus cumque. Cumque atque rerum numquam. Nam dolor laboriosam laborum nobis. Totam libero inventore deserunt eos fuga.\nEaque cupiditate non vitae.	13	25605.82	BRL	2026-01-23 16:57:07.900412	\N	0	2026-01-08 14:57:38.309211	2026-01-08 14:57:38.309211	\N	f	{"name": "Sr. Felipe da Luz", "email": "diasnicole@example.com", "phone": "31 2704-8326", "company": "Viana S/A"}	54
736	57	45	da Mota Ltda. - O poder de avançar simplesmente	Oportunidade com Juan da Rosa da empresa da Mota Ltda..\n\nQui quae reiciendis iusto eum animi rem.\nDicta soluta voluptate. Doloribus numquam minus in. Error culpa quae perspiciatis. Numquam quis voluptates soluta minima.	14	5818.78	BRL	\N	\N	0	2026-01-08 14:57:38.309212	2026-01-08 14:57:38.309212	\N	f	{"name": "Juan da Rosa", "email": "nascimentoluiz-henrique@example.com", "phone": "+55 21 5821-6324", "company": "da Mota Ltda."}	58
737	60	46	Silveira - A segurança de inovar simplesmente	Oportunidade com Matheus Santos da empresa Silveira.\n\nAt porro voluptas laudantium cum.\nBeatae laboriosam repellat porro provident maxime fugiat. Est molestias illum voluptatem.\nNumquam amet dolor voluptate ex dolorem. Qui eveniet magni repellat.	15	49677.43	BRL	2026-02-09 18:47:41.702336	2025-12-15 06:24:42.936249	1	2026-01-08 14:57:38.309212	2026-01-08 14:57:38.309213	\N	f	{"name": "Matheus Santos", "email": "ferreirabernardo@example.org", "phone": "21 4942 3905", "company": "Silveira"}	50
738	59	46	Viana S.A. - A certeza de inovar mais facilmente	Oportunidade com Eduarda da Cruz da empresa Viana S.A..\n\nMolestias repellendus quae quos quam. Officia sed consequatur.\nAlias culpa voluptatibus a debitis. Quo expedita perspiciatis cupiditate.\nIste aperiam dolor. Eveniet nemo blanditiis maxime aliquid.	16	46845.26	BRL	2026-01-13 11:20:41.78856	\N	0	2026-01-08 14:57:38.309213	2026-01-08 14:57:38.309213	\N	f	{"name": "Eduarda da Cruz", "email": "knogueira@example.org", "phone": "(021) 9775 3122", "company": "Viana S.A."}	59
739	57	46	Miguel Souza - A vantagem de evoluir com confiança	Oportunidade com Miguel Souza da empresa N/A.\n\nVeniam ullam facilis deleniti a natus eaque. Iusto cum architecto maiores consequuntur.\nRatione nam consequuntur accusamus soluta. Corporis facilis earum id et.\nEnim vitae vel quis unde deleniti.	17	45041.13	BRL	\N	\N	0	2026-01-08 14:57:38.309214	2026-01-08 14:57:38.309214	\N	f	{"name": "Miguel Souza", "email": "felipe54@example.com", "phone": "+55 41 9760 9397", "company": null}	53
740	60	47	da Mota Ltda. - O prazer de mudar em estado puro	Oportunidade com Juan da Rosa da empresa da Mota Ltda..\n\nRepellendus veniam a quia assumenda quos atque. A exercitationem ut quae quod quibusdam. Eaque delectus consequatur. Asperiores neque similique.	18	40964.91	BRL	\N	2026-01-04 05:43:00.663536	1	2026-01-08 14:57:38.309214	2026-01-08 14:57:38.309214	\N	f	{"name": "Juan da Rosa", "email": "nascimentoluiz-henrique@example.com", "phone": "+55 21 5821-6324", "company": "da Mota Ltda."}	58
741	60	46	Caldeira - A simplicidade de evoluir em estado puro	Oportunidade com Camila Rezende da empresa Caldeira.\n\nFugit corporis in. Tenetur illum quibusdam voluptas similique enim rem. Officia assumenda rem autem sed eos quisquam magnam. Porro perferendis sit dolore.	19	5796.27	BRL	2026-02-26 20:49:12.741017	2026-01-02 06:53:29.222049	1	2026-01-08 14:57:38.309215	2026-01-08 14:57:38.309215	\N	f	{"name": "Camila Rezende", "email": "luiz-felipe58@example.org", "phone": "(041) 7856 0561", "company": "Caldeira"}	49
742	57	47	Pinto Monteiro S.A. - A certeza de concretizar seus projetos antes de tudo	Oportunidade com Eduardo Moreira da empresa Pinto Monteiro S.A..\n\nRepellat quo hic numquam. Reiciendis iure aliquid laudantium consectetur. A quisquam cupiditate vero asperiores sed. Alias consequatur aperiam nemo iste.	20	27884.25	BRL	\N	\N	0	2026-01-08 14:57:38.309215	2026-01-08 14:57:38.309216	\N	f	{"name": "Eduardo Moreira", "email": "zrezende@example.com", "phone": "+55 11 4676-3227", "company": "Pinto Monteiro S.A."}	60
743	60	49	Almeida - O direito de avançar naturalmente	Oportunidade com Stella Gomes da empresa Almeida.\n\nFacere iste in sequi nesciunt. Animi maiores eum corporis at ratione quis.\nTempora odio nihil reprehenderit officia pariatur dolore. Numquam beatae corporis labore animi suscipit ea.	21	27895.64	BRL	2026-01-27 01:56:31.069067	2025-12-25 11:53:59.648759	1	2026-01-08 14:57:38.309216	2026-01-08 14:57:38.309216	\N	f	{"name": "Stella Gomes", "email": "caua11@example.com", "phone": "(061) 5077 2661", "company": "Almeida"}	56
744	57	46	Viana S.A. - O poder de evoluir direto da fonte	Oportunidade com Eduarda da Cruz da empresa Viana S.A..\n\nTempore minima quo. Culpa suscipit aliquam accusamus voluptatibus pariatur veniam porro. Quae optio error explicabo.\nMagni doloribus quaerat quia molestiae vero at. Voluptas magni sint modi.	22	29786.76	BRL	2026-01-14 16:47:14.937759	\N	0	2026-01-08 14:57:38.309216	2026-01-08 14:57:38.309217	\N	f	{"name": "Eduarda da Cruz", "email": "knogueira@example.org", "phone": "(021) 9775 3122", "company": "Viana S.A."}	59
745	58	49	Viana S/A - A arte de mudar com força total	Oportunidade com Sr. Felipe da Luz da empresa Viana S/A.\n\nUllam eos omnis quaerat. Veritatis vel praesentium magni ipsa dolores provident. Eveniet velit cum at.\nDicta a eos officia minus. Fuga magni mollitia incidunt sed.	23	24630.96	BRL	2026-01-26 17:36:45.360868	\N	0	2026-01-08 14:57:38.309217	2026-01-08 14:57:38.309217	\N	f	{"name": "Sr. Felipe da Luz", "email": "diasnicole@example.com", "phone": "31 2704-8326", "company": "Viana S/A"}	54
746	59	45	da Mota Ltda. - A segurança de conseguir mais facilmente	Oportunidade com Juan da Rosa da empresa da Mota Ltda..\n\nEligendi tenetur sit amet minima eos. Doloribus iste atque recusandae nesciunt error dignissimos esse. Exercitationem facilis quam possimus.\nOmnis expedita illo exercitationem inventore perferendis.	24	35852.71	BRL	\N	\N	0	2026-01-08 14:57:38.309218	2026-01-08 14:57:38.309218	\N	f	{"name": "Juan da Rosa", "email": "nascimentoluiz-henrique@example.com", "phone": "+55 21 5821-6324", "company": "da Mota Ltda."}	58
747	60	46	Miguel Souza - A segurança de evoluir com força total	Oportunidade com Miguel Souza da empresa N/A.\n\nQuaerat ullam labore delectus sequi odit ipsum. Ad iste dolor nostrum aperiam ducimus. Possimus consectetur hic mollitia repudiandae.	25	26832.74	BRL	2026-01-20 05:42:56.357287	2025-12-13 20:31:35.177989	1	2026-01-08 14:57:38.309218	2026-01-08 14:57:38.309219	\N	f	{"name": "Miguel Souza", "email": "felipe54@example.com", "phone": "+55 41 9760 9397", "company": null}	53
748	59	47	Maria Vitória Aragão - O direito de inovar de maneira eficaz	Oportunidade com Maria Vitória Aragão da empresa N/A.\n\nExcepturi cumque ut doloribus aliquam. Est fugit a. Veritatis ipsum iure placeat voluptates repellendus.	26	10063.36	BRL	2026-02-11 21:57:00.890324	\N	0	2026-01-08 14:57:38.309219	2026-01-08 14:57:38.309219	\N	f	{"name": "Maria Vit\\u00f3ria Arag\\u00e3o", "email": "vieiracaio@example.net", "phone": "0900 085 7305", "company": null}	52
749	57	46	Elisa das Neves - A certeza de realizar seus sonhos sem preocupação	Oportunidade com Elisa das Neves da empresa N/A.\n\nEum dolor voluptatum sequi exercitationem possimus aspernatur. Fugit eveniet eveniet voluptate quibusdam molestiae a. Quisquam vero asperiores alias.\nVel ea consectetur suscipit.	27	41454.44	BRL	\N	\N	0	2026-01-08 14:57:38.30922	2026-01-08 14:57:38.30922	\N	f	{"name": "Elisa das Neves", "email": "rezendefrancisco@example.org", "phone": "84 5002-4659", "company": null}	62
750	60	49	Danilo Rezende - A liberdade de ganhar direto da fonte	Oportunidade com Danilo Rezende da empresa N/A.\n\nCorporis repellat numquam facere hic illo unde. Optio dolores voluptatum provident. Tempore voluptatibus possimus quia mollitia.\nImpedit officiis autem odio eum totam.	28	7149.21	BRL	2026-01-11 21:46:44.523958	2025-12-23 17:36:37.683672	1	2026-01-08 14:57:38.30922	2026-01-08 14:57:38.30922	\N	f	{"name": "Danilo Rezende", "email": "icunha@example.net", "phone": "31 8833-9315", "company": null}	47
751	57	47	Sales Ltda. - O conforto de conseguir mais rapidamente	Oportunidade com Pietro Viana da empresa Sales Ltda..\n\nRepudiandae earum ducimus nostrum. Fugiat modi veritatis inventore quisquam vel. Molestiae totam id blanditiis natus. Soluta nemo deserunt voluptates pariatur facilis.	29	41065.64	BRL	2026-02-27 21:54:58.468623	\N	0	2026-01-08 14:57:38.309221	2026-01-08 14:57:38.309221	\N	f	{"name": "Pietro Viana", "email": "jbarbosa@example.org", "phone": "+55 (011) 8835 9215", "company": "Sales Ltda."}	46
752	58	48	Danilo Rezende - A liberdade de atingir seus objetivos direto da fonte	Oportunidade com Danilo Rezende da empresa N/A.\n\nSimilique eveniet illum. Facilis veniam voluptates error maiores cupiditate. At reiciendis nesciunt explicabo officiis consectetur. Eligendi omnis voluptatem quaerat.	30	23647.39	BRL	2026-02-11 06:43:00.020144	\N	0	2026-01-08 14:57:38.309221	2026-01-08 14:57:38.309222	\N	f	{"name": "Danilo Rezende", "email": "icunha@example.net", "phone": "31 8833-9315", "company": null}	47
753	57	45	Elisa das Neves - O direito de ganhar direto da fonte	Oportunidade com Elisa das Neves da empresa N/A.\n\nRem rem quas sapiente dolorum distinctio quod.\nDoloribus mollitia sit nostrum.\nAlias sequi optio quo.	31	18793.29	BRL	2026-02-12 13:25:03.888618	\N	0	2026-01-08 14:57:38.309222	2026-01-08 14:57:38.309222	\N	f	{"name": "Elisa das Neves", "email": "rezendefrancisco@example.org", "phone": "84 5002-4659", "company": null}	62
754	59	46	Viana S/A - O direito de concretizar seus projetos em estado puro	Oportunidade com Sr. Felipe da Luz da empresa Viana S/A.\n\nPorro illo iure quos quae odio. Recusandae molestiae aperiam.	32	25836.54	BRL	2026-02-20 17:39:54.928549	\N	0	2026-01-08 14:57:38.309223	2026-01-08 14:57:38.309223	\N	f	{"name": "Sr. Felipe da Luz", "email": "diasnicole@example.com", "phone": "31 2704-8326", "company": "Viana S/A"}	54
755	60	49	da Cunha - A vantagem de conseguir direto da fonte	Oportunidade com Guilherme Campos da empresa da Cunha.\n\nIpsum adipisci cupiditate cupiditate aspernatur. Doloribus nihil hic provident in dolore sapiente.\nDignissimos dolore consequuntur praesentium beatae cumque. Expedita consequuntur assumenda.	33	24993.16	BRL	2026-01-14 20:27:07.726338	2025-12-17 02:43:15.324576	1	2026-01-08 14:57:38.309223	2026-01-08 14:57:38.309223	\N	f	{"name": "Guilherme Campos", "email": "pedroda-cruz@example.org", "phone": "+55 51 6442 1759", "company": "da Cunha"}	61
756	59	45	Caldeira - O prazer de avançar mais facilmente	Oportunidade com Camila Rezende da empresa Caldeira.\n\nSequi ex labore eius quo nam sunt.	34	36975.67	BRL	\N	\N	0	2026-01-08 14:57:38.309224	2026-01-08 14:57:38.309224	\N	f	{"name": "Camila Rezende", "email": "luiz-felipe58@example.org", "phone": "(041) 7856 0561", "company": "Caldeira"}	49
757	31	31	Rocha Araújo e Filhos - A vantagem de inovar simplesmente	Oportunidade com Davi Alves da empresa Rocha Araújo e Filhos.\n\nError possimus optio dolore libero. Velit minima nisi suscipit autem consectetur delectus consequuntur. Sequi facere id error quo ullam.	0	11454.79	BRL	2026-02-09 10:13:57.73305	\N	0	2026-01-08 14:58:40.587913	2026-01-08 14:58:40.587916	\N	f	{"name": "Davi Alves", "email": "mda-conceicao@example.com", "phone": "61 1369-3554", "company": "Rocha Ara\\u00fajo e Filhos"}	67
758	33	32	Nathan Azevedo - O poder de conseguir de maneira eficaz	Oportunidade com Nathan Azevedo da empresa N/A.\n\nUllam nesciunt doloribus. Neque modi fugiat laborum aperiam. Suscipit quibusdam eaque nulla fugiat.\nIpsa a illo delectus optio tempore iusto. Accusantium nam iure.	1	26763.73	BRL	\N	\N	0	2026-01-08 14:58:40.587917	2026-01-08 14:58:40.587917	\N	f	{"name": "Nathan Azevedo", "email": "rda-mata@example.net", "phone": "0900 758 8026", "company": null}	65
759	31	33	Porto - A liberdade de conseguir de maneira eficaz	Oportunidade com João Gabriel Moreira da empresa Porto.\n\nVitae doloribus atque soluta laudantium consequatur. Architecto earum ab. Quibusdam asperiores nihil culpa quis harum molestias. Excepturi quod explicabo harum natus consequatur.	2	31322.53	BRL	2026-01-09 05:06:02.376431	\N	0	2026-01-08 14:58:40.587918	2026-01-08 14:58:40.587918	\N	f	{"name": "Jo\\u00e3o Gabriel Moreira", "email": "joao-lucas69@example.org", "phone": "+55 (071) 2610-1195", "company": "Porto"}	70
760	36	33	Rocha Cardoso - ME - A simplicidade de atingir seus objetivos com confiança	Oportunidade com Maria Vitória Vieira da empresa Rocha Cardoso - ME.\n\nVoluptas consequuntur nostrum. Officiis molestiae recusandae dolore sint aut reprehenderit. Quam officia a officiis ipsum cum dolor.	3	6031.45	BRL	\N	2025-12-12 13:25:17.860078	-1	2026-01-08 14:58:40.587919	2026-01-08 14:58:40.587919	\N	f	{"name": "Maria Vit\\u00f3ria Vieira", "email": "ylopes@example.net", "phone": "+55 81 2090-3640", "company": "Rocha Cardoso - ME"}	75
761	36	30	Maria Eduarda da Mata - O poder de inovar de maneira eficaz	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nAliquam eligendi nulla cupiditate ad aliquid facilis. Cupiditate consectetur harum tempora iure placeat. Libero placeat consequatur fuga.	4	44769.98	BRL	2026-03-06 07:40:01.658185	2025-12-12 05:40:53.280709	-1	2026-01-08 14:58:40.58792	2026-01-08 14:58:40.58792	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
762	32	33	Srta. Letícia Cunha - O conforto de concretizar seus projetos em estado puro	Oportunidade com Srta. Letícia Cunha da empresa N/A.\n\nEarum aut eaque sed. Animi qui excepturi quas eius. Nemo dolores corporis dolorem illo omnis sapiente.	5	5158.33	BRL	\N	\N	0	2026-01-08 14:58:40.58792	2026-01-08 14:58:40.58792	\N	f	{"name": "Srta. Let\\u00edcia Cunha", "email": "dcarvalho@example.org", "phone": "0900-680-9839", "company": null}	64
763	31	32	Pinto - O poder de atingir seus objetivos direto da fonte	Oportunidade com Ana Lívia Pinto da empresa Pinto.\n\nUt ipsa vel voluptatibus soluta facilis excepturi neque. Aut molestiae quibusdam quis cum pariatur.\nQuasi esse autem aperiam. Harum commodi ea. Nisi accusantium vero doloribus saepe iure.	6	23894.34	BRL	2026-03-05 23:38:17.943665	\N	0	2026-01-08 14:58:40.587921	2026-01-08 14:58:40.587921	\N	f	{"name": "Ana L\\u00edvia Pinto", "email": "nascimentojoao-pedro@example.com", "phone": "41 3904 6052", "company": "Pinto"}	71
764	35	30	Benício Pires - O poder de concretizar seus projetos sem preocupação	Oportunidade com Benício Pires da empresa N/A.\n\nSit tempore deleniti placeat corrupti nihil voluptatibus. Dicta eaque adipisci eius.\nHarum omnis minima quia ratione nemo eum aspernatur.	7	37614.65	BRL	2026-01-30 10:28:39.849189	2026-01-01 21:47:59.913441	1	2026-01-08 14:58:40.587922	2026-01-08 14:58:40.587922	\N	f	{"name": "Ben\\u00edcio Pires", "email": "lavinia92@example.com", "phone": "(071) 3145 1413", "company": null}	77
765	32	29	Azevedo - A arte de atingir seus objetivos de maneira eficaz	Oportunidade com Davi Lucca Porto da empresa Azevedo.\n\nSoluta quaerat ex est eligendi autem. Minus quo iure deserunt saepe nulla natus. Impedit magni corrupti provident tempore.	8	20800.04	BRL	2026-01-20 04:03:32.335078	\N	0	2026-01-08 14:58:40.587922	2026-01-08 14:58:40.587922	\N	f	{"name": "Davi Lucca Porto", "email": "castronoah@example.com", "phone": "+55 21 6780-5062", "company": "Azevedo"}	73
766	32	31	Azevedo - A possibilidade de realizar seus sonhos sem preocupação	Oportunidade com Davi Lucca Porto da empresa Azevedo.\n\nVel ad temporibus beatae vel facere. Facere error dicta voluptatem reiciendis sunt id tempore. Libero quam atque debitis distinctio.\nMolestiae cum veritatis. Vel suscipit totam modi facere.	9	17393.39	BRL	2026-02-26 10:49:51.329535	\N	0	2026-01-08 14:58:40.587923	2026-01-08 14:58:40.587923	\N	f	{"name": "Davi Lucca Porto", "email": "castronoah@example.com", "phone": "+55 21 6780-5062", "company": "Azevedo"}	73
767	36	31	Rocha Cardoso - ME - A vantagem de mudar sem preocupação	Oportunidade com Maria Vitória Vieira da empresa Rocha Cardoso - ME.\n\nVoluptatem in distinctio iste fugit facilis quo.\nNeque atque possimus debitis quidem. Quod odit reiciendis explicabo rem eaque enim optio.	10	18698.09	BRL	\N	2025-12-24 00:14:56.75601	-1	2026-01-08 14:58:40.587924	2026-01-08 14:58:40.587924	\N	f	{"name": "Maria Vit\\u00f3ria Vieira", "email": "ylopes@example.net", "phone": "+55 81 2090-3640", "company": "Rocha Cardoso - ME"}	75
768	36	33	Maria Eduarda da Mata - A segurança de atingir seus objetivos com confiança	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nAtque doloribus occaecati excepturi accusamus fugiat sequi. Quisquam voluptatum autem odio.	11	11066.73	BRL	2026-03-07 14:11:05.266014	2025-12-30 11:15:17.263806	-1	2026-01-08 14:58:40.587924	2026-01-08 14:58:40.587925	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
769	34	33	Dias - A liberdade de evoluir com toda a tranquilidade	Oportunidade com Gustavo Santos da empresa Dias.\n\nDolore cum blanditiis soluta amet eligendi facilis. Mollitia delectus recusandae in beatae accusantium. Cum autem nam.	12	14624.03	BRL	2026-02-13 16:47:53.464934	\N	0	2026-01-08 14:58:40.587925	2026-01-08 14:58:40.587925	\N	f	{"name": "Gustavo Santos", "email": "dalves@example.org", "phone": "31 0220 1494", "company": "Dias"}	68
770	31	33	Dias - A liberdade de ganhar naturalmente	Oportunidade com Gustavo Santos da empresa Dias.\n\nFacere laboriosam fugiat suscipit nihil unde. Illum incidunt consectetur voluptatibus hic omnis explicabo. Distinctio voluptatibus eveniet sit.	13	22395.54	BRL	\N	\N	0	2026-01-08 14:58:40.587926	2026-01-08 14:58:40.587926	\N	f	{"name": "Gustavo Santos", "email": "dalves@example.org", "phone": "31 0220 1494", "company": "Dias"}	68
771	35	30	Alves - O prazer de concretizar seus projetos antes de tudo	Oportunidade com Maria Pereira da empresa Alves.\n\nVoluptatibus consequuntur fugiat earum excepturi. Eum dolores dignissimos eum iste.	14	31497.03	BRL	2026-01-20 22:24:25.193247	2025-12-30 18:37:46.598308	1	2026-01-08 14:58:40.587926	2026-01-08 14:58:40.587927	\N	f	{"name": "Maria Pereira", "email": "gcarvalho@example.org", "phone": "(021) 2564-4813", "company": "Alves"}	72
772	31	32	Alves - A certeza de atingir seus objetivos de maneira eficaz	Oportunidade com Gabriel Souza da empresa Alves.\n\nIpsam cum corrupti culpa architecto fuga. Ab quae non error provident dolores et.\nModi sint odio ipsum. Mollitia odio similique praesentium optio natus.	15	2551.75	BRL	2026-02-21 00:37:56.869256	\N	0	2026-01-08 14:58:40.587927	2026-01-08 14:58:40.587927	\N	f	{"name": "Gabriel Souza", "email": "hpinto@example.net", "phone": "(071) 1708 3138", "company": "Alves"}	63
773	31	30	Maria Eduarda da Mata - A liberdade de avançar direto da fonte	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nPraesentium iste voluptas voluptas explicabo tempora atque vel. Illo inventore sunt.\nLabore inventore non delectus quos dignissimos. Nihil fuga incidunt porro rerum repudiandae magni harum.	16	17028.37	BRL	2026-02-25 21:46:51.710208	\N	0	2026-01-08 14:58:40.587928	2026-01-08 14:58:40.587928	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
774	33	32	Alves - O poder de mudar naturalmente	Oportunidade com Gabriel Souza da empresa Alves.\n\nVelit recusandae dolorum dolorem veniam soluta aliquid.\nDeleniti ex dicta voluptatum explicabo cupiditate. At autem incidunt blanditiis occaecati. Veritatis deserunt nemo maxime deserunt quisquam.	17	9013.66	BRL	2026-03-05 19:08:05.307104	\N	0	2026-01-08 14:58:40.587928	2026-01-08 14:58:40.587929	\N	f	{"name": "Gabriel Souza", "email": "hpinto@example.net", "phone": "(071) 1708 3138", "company": "Alves"}	63
775	32	32	Carvalho Ltda. - A simplicidade de ganhar mais facilmente	Oportunidade com Srta. Nina Vieira da empresa Carvalho Ltda..\n\nAnimi voluptates tempora sint quidem culpa nobis omnis. Quaerat ea perferendis nihil itaque suscipit consectetur.\nOdit maiores odit ipsa qui ratione impedit. Dolores placeat eligendi cumque impedit.	18	7848.46	BRL	\N	\N	0	2026-01-08 14:58:40.587929	2026-01-08 14:58:40.587929	\N	f	{"name": "Srta. Nina Vieira", "email": "costelaheloisa@example.net", "phone": "41 0267-3632", "company": "Carvalho Ltda."}	76
776	35	30	Rocha Cardoso - ME - O direito de avançar sem preocupação	Oportunidade com Maria Vitória Vieira da empresa Rocha Cardoso - ME.\n\nRem ipsa repellendus voluptatum magnam quidem quisquam. Ullam fugit maiores similique.\nHic earum harum nemo.	19	27142.85	BRL	2026-02-21 23:08:18.560981	2026-01-05 04:48:54.901851	1	2026-01-08 14:58:40.58793	2026-01-08 14:58:40.58793	\N	f	{"name": "Maria Vit\\u00f3ria Vieira", "email": "ylopes@example.net", "phone": "+55 81 2090-3640", "company": "Rocha Cardoso - ME"}	75
777	31	33	Maria Eduarda da Mata - A certeza de realizar seus sonhos sem preocupação	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nMagnam distinctio ut modi ea. Ea veniam vero commodi. Placeat aspernatur quod tempora dolorum sequi deserunt.	20	10279.57	BRL	\N	\N	0	2026-01-08 14:58:40.58793	2026-01-08 14:58:40.587931	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
778	31	30	Dias - A vantagem de concretizar seus projetos mais facilmente	Oportunidade com Gustavo Santos da empresa Dias.\n\nOptio neque debitis quam quo nemo maxime molestias. Cumque eveniet nisi quis quos praesentium atque.	21	10203.66	BRL	2026-01-22 23:18:21.603173	\N	0	2026-01-08 14:58:40.587931	2026-01-08 14:58:40.587931	\N	f	{"name": "Gustavo Santos", "email": "dalves@example.org", "phone": "31 0220 1494", "company": "Dias"}	68
779	35	29	Carvalho Ltda. - O prazer de atingir seus objetivos sem preocupação	Oportunidade com Srta. Nina Vieira da empresa Carvalho Ltda..\n\nRecusandae maxime laborum doloremque. Ratione quis perferendis. Fuga adipisci porro sed voluptates quia.	22	1722.12	BRL	2026-03-02 07:56:11.190742	2025-12-17 02:34:15.683521	1	2026-01-08 14:58:40.587932	2026-01-08 14:58:40.587932	\N	f	{"name": "Srta. Nina Vieira", "email": "costelaheloisa@example.net", "phone": "41 0267-3632", "company": "Carvalho Ltda."}	76
780	32	30	Srta. Letícia Cunha - A liberdade de avançar com força total	Oportunidade com Srta. Letícia Cunha da empresa N/A.\n\nVoluptate non ducimus nobis. Quidem blanditiis dicta. Explicabo harum quidem.\nEx facere tempore nisi eveniet quam. Possimus veritatis delectus possimus illum.	23	38352.23	BRL	2026-02-04 23:20:45.04262	\N	0	2026-01-08 14:58:40.587932	2026-01-08 14:58:40.587933	\N	f	{"name": "Srta. Let\\u00edcia Cunha", "email": "dcarvalho@example.org", "phone": "0900-680-9839", "company": null}	64
781	32	31	Vitória da Cunha - O direito de concretizar seus projetos com confiança	Oportunidade com Vitória da Cunha da empresa N/A.\n\nQuia nisi amet ipsum velit corrupti. Magni eos voluptas iure.	24	43610.32	BRL	2026-02-13 05:36:18.967422	\N	0	2026-01-08 14:58:40.587933	2026-01-08 14:58:40.587933	\N	f	{"name": "Vit\\u00f3ria da Cunha", "email": "da-cruzclarice@example.com", "phone": "+55 (051) 5103 4929", "company": null}	66
782	31	31	Alves - O direito de realizar seus sonhos mais facilmente	Oportunidade com Gabriel Souza da empresa Alves.\n\nNatus quod quae ad. Recusandae ut similique totam.\nUllam laboriosam vitae eligendi esse repellat nemo. Sed ipsam suscipit optio nemo.	25	29832.30	BRL	\N	\N	0	2026-01-08 14:58:40.587934	2026-01-08 14:58:40.587934	\N	f	{"name": "Gabriel Souza", "email": "hpinto@example.net", "phone": "(071) 1708 3138", "company": "Alves"}	63
783	36	29	Maria Eduarda da Mata - A simplicidade de conseguir em estado puro	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nSint delectus minus modi error dolorem. Odio suscipit adipisci ipsam perspiciatis. Ipsum quas magnam ipsam dolore possimus. Ullam laudantium velit quis.	26	23763.43	BRL	\N	2025-12-21 01:11:36.761883	-1	2026-01-08 14:58:40.587934	2026-01-08 14:58:40.587935	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
785	31	29	Carvalho Ltda. - A segurança de inovar sem preocupação	Oportunidade com Srta. Nina Vieira da empresa Carvalho Ltda..\n\nFugiat rerum laboriosam. Natus maxime odit. Quas modi repellat unde quas.\nFugit nobis ratione odit molestiae. Sequi dicta commodi ab. Voluptatem nulla harum odit cum dolores doloribus.	28	31580.84	BRL	\N	\N	0	2026-01-08 14:58:40.587936	2026-01-08 14:58:40.587936	\N	f	{"name": "Srta. Nina Vieira", "email": "costelaheloisa@example.net", "phone": "41 0267-3632", "company": "Carvalho Ltda."}	76
786	31	30	Benício Pires - O direito de ganhar de maneira eficaz	Oportunidade com Benício Pires da empresa N/A.\n\nCulpa magnam quis a saepe nihil quibusdam. Corporis fuga officiis minus neque.	29	47913.46	BRL	2026-03-07 09:46:13.340033	\N	0	2026-01-08 14:58:40.587936	2026-01-08 14:58:40.587937	\N	f	{"name": "Ben\\u00edcio Pires", "email": "lavinia92@example.com", "phone": "(071) 3145 1413", "company": null}	77
787	32	32	Rocha Araújo e Filhos - A segurança de mudar de maneira eficaz	Oportunidade com Davi Alves da empresa Rocha Araújo e Filhos.\n\nSoluta quibusdam perspiciatis. Incidunt ad rerum sunt. Quia non perferendis.	30	5140.44	BRL	2026-01-09 23:26:41.639115	\N	0	2026-01-08 14:58:40.587937	2026-01-08 14:58:40.587937	\N	f	{"name": "Davi Alves", "email": "mda-conceicao@example.com", "phone": "61 1369-3554", "company": "Rocha Ara\\u00fajo e Filhos"}	67
788	31	32	Benício Pires - A arte de inovar sem preocupação	Oportunidade com Benício Pires da empresa N/A.\n\nVoluptates officia in quaerat commodi odio aspernatur. Praesentium eveniet voluptatibus recusandae. Mollitia sapiente molestiae labore ipsa.	31	24292.71	BRL	2026-02-16 04:33:44.455364	\N	0	2026-01-08 14:58:40.587938	2026-01-08 14:58:40.587938	\N	f	{"name": "Ben\\u00edcio Pires", "email": "lavinia92@example.com", "phone": "(071) 3145 1413", "company": null}	77
789	35	30	Azevedo - A segurança de ganhar antes de tudo	Oportunidade com Davi Lucca Porto da empresa Azevedo.\n\nFacere fugit quos dolores nihil ad molestias totam. Quibusdam quos ipsum beatae repellat. Nisi odio architecto quidem.	32	24236.95	BRL	\N	2025-12-16 06:58:20.370723	1	2026-01-08 14:58:40.587938	2026-01-08 14:58:40.587938	\N	f	{"name": "Davi Lucca Porto", "email": "castronoah@example.com", "phone": "+55 21 6780-5062", "company": "Azevedo"}	73
790	32	30	Carvalho Ltda. - A vantagem de evoluir direto da fonte	Oportunidade com Srta. Nina Vieira da empresa Carvalho Ltda..\n\nEveniet sit minus placeat incidunt. Placeat rerum neque dolore. Fugit tenetur minus ea autem error.	33	38531.91	BRL	\N	\N	0	2026-01-08 14:58:40.587939	2026-01-08 14:58:40.587939	\N	f	{"name": "Srta. Nina Vieira", "email": "costelaheloisa@example.net", "phone": "41 0267-3632", "company": "Carvalho Ltda."}	76
791	33	29	Porto - A certeza de evoluir mais rapidamente	Oportunidade com João Gabriel Moreira da empresa Porto.\n\nIncidunt assumenda consequuntur unde nemo. Aliquam cum architecto enim odit error.\nEaque earum totam nemo. Mollitia reprehenderit aut quas fugit quos dicta.	34	21856.66	BRL	2026-02-23 05:30:32.155202	\N	0	2026-01-08 14:58:40.58794	2026-01-08 14:58:40.58794	\N	f	{"name": "Jo\\u00e3o Gabriel Moreira", "email": "joao-lucas69@example.org", "phone": "+55 (071) 2610-1195", "company": "Porto"}	70
792	33	33	Porto - A arte de mudar com força total	Oportunidade com João Gabriel Moreira da empresa Porto.\n\nModi consequatur illum laboriosam. Est quod in dicta in maxime numquam veritatis.	35	43344.05	BRL	2026-02-14 17:02:18.536897	\N	0	2026-01-08 14:58:40.58794	2026-01-08 14:58:40.587941	\N	f	{"name": "Jo\\u00e3o Gabriel Moreira", "email": "joao-lucas69@example.org", "phone": "+55 (071) 2610-1195", "company": "Porto"}	70
793	35	33	Azevedo - A arte de atingir seus objetivos antes de tudo	Oportunidade com Davi Lucca Porto da empresa Azevedo.\n\nQuaerat ut vero ipsa magnam ipsa. Nisi harum consectetur earum temporibus facere. Explicabo harum laboriosam expedita iure.	36	44368.68	BRL	2026-03-06 06:09:21.857753	2025-12-28 04:10:27.422126	1	2026-01-08 14:58:40.587941	2026-01-08 14:58:40.587941	\N	f	{"name": "Davi Lucca Porto", "email": "castronoah@example.com", "phone": "+55 21 6780-5062", "company": "Azevedo"}	73
794	35	31	Nathan Azevedo - A certeza de ganhar naturalmente	Oportunidade com Nathan Azevedo da empresa N/A.\n\nAliquid itaque tempora in maiores repellendus quisquam. Numquam atque repudiandae voluptatibus nihil.	37	39511.54	BRL	\N	2025-12-31 04:01:19.814104	1	2026-01-08 14:58:40.587942	2026-01-08 14:58:40.587942	\N	f	{"name": "Nathan Azevedo", "email": "rda-mata@example.net", "phone": "0900 758 8026", "company": null}	65
795	36	30	Azevedo - A simplicidade de realizar seus sonhos de maneira eficaz	Oportunidade com Davi Lucca Porto da empresa Azevedo.\n\nExcepturi cum quae nemo molestias libero. Assumenda cum possimus neque vitae eum.\nReiciendis occaecati optio odio. Autem quaerat explicabo quia nam esse.	38	5926.53	BRL	2026-01-16 07:32:12.360271	2025-12-23 21:21:08.901766	-1	2026-01-08 14:58:40.587942	2026-01-08 14:58:40.587942	\N	f	{"name": "Davi Lucca Porto", "email": "castronoah@example.com", "phone": "+55 21 6780-5062", "company": "Azevedo"}	73
796	32	30	Rocha Cardoso - ME - O conforto de conseguir sem preocupação	Oportunidade com Maria Vitória Vieira da empresa Rocha Cardoso - ME.\n\nTempore quidem provident repellat qui quidem aperiam nobis. Doloremque iste repellat dolor tempora.\nQuo error suscipit ad nesciunt at alias. Nisi eligendi facere labore vitae doloremque.	39	49464.76	BRL	\N	\N	0	2026-01-08 14:58:40.587943	2026-01-08 14:58:40.587943	\N	f	{"name": "Maria Vit\\u00f3ria Vieira", "email": "ylopes@example.net", "phone": "+55 81 2090-3640", "company": "Rocha Cardoso - ME"}	75
797	31	30	Caroline Fernandes - O prazer de evoluir com confiança	Oportunidade com Caroline Fernandes da empresa N/A.\n\nSuscipit neque pariatur possimus veniam. Odit exercitationem excepturi aut in iusto ducimus. Accusantium quasi temporibus qui tempora.	40	11981.76	BRL	2026-02-09 20:40:31.761234	\N	0	2026-01-08 14:58:40.587944	2026-01-08 14:58:40.587944	\N	f	{"name": "Caroline Fernandes", "email": "ymoraes@example.com", "phone": "+55 61 0376-3448", "company": null}	69
798	36	29	Caroline Fernandes - A arte de concretizar seus projetos de maneira eficaz	Oportunidade com Caroline Fernandes da empresa N/A.\n\nSaepe aperiam illum eum quos. Reiciendis distinctio et. Eaque natus nulla mollitia.\nError nobis impedit explicabo ut quis.	41	40791.03	BRL	\N	2025-12-29 06:11:47.744023	-1	2026-01-08 14:58:40.587944	2026-01-08 14:58:40.587944	\N	f	{"name": "Caroline Fernandes", "email": "ymoraes@example.com", "phone": "+55 61 0376-3448", "company": null}	69
799	38	29	Carvalho Ltda. - A arte de inovar mais facilmente	Oportunidade com Srta. Nina Vieira da empresa Carvalho Ltda..\n\nQuibusdam consequatur pariatur nihil in. Labore omnis dolore voluptatibus quisquam eum. Laborum quas velit quae architecto repellat.	0	17079.35	BRL	2026-02-15 00:49:48.912816	\N	0	2026-01-08 14:58:42.173349	2026-01-08 14:58:42.173352	\N	f	{"name": "Srta. Nina Vieira", "email": "costelaheloisa@example.net", "phone": "41 0267-3632", "company": "Carvalho Ltda."}	76
800	37	33	Dias - A possibilidade de realizar seus sonhos mais facilmente	Oportunidade com Gustavo Santos da empresa Dias.\n\nConsequuntur a in beatae doloremque.\nAmet magnam odio tempora excepturi inventore. Corporis nostrum libero non ab quas.	1	17462.88	BRL	\N	\N	0	2026-01-08 14:58:42.173353	2026-01-08 14:58:42.173353	\N	f	{"name": "Gustavo Santos", "email": "dalves@example.org", "phone": "31 0220 1494", "company": "Dias"}	68
801	38	31	Carvalho Ltda. - A arte de evoluir naturalmente	Oportunidade com Srta. Nina Vieira da empresa Carvalho Ltda..\n\nNihil nobis in atque a alias. Ipsam mollitia recusandae cupiditate similique labore quo. Tempore sapiente dicta neque.	2	21685.76	BRL	2026-03-08 03:28:32.129543	\N	0	2026-01-08 14:58:42.173354	2026-01-08 14:58:42.173354	\N	f	{"name": "Srta. Nina Vieira", "email": "costelaheloisa@example.net", "phone": "41 0267-3632", "company": "Carvalho Ltda."}	76
802	38	29	Maria Eduarda da Mata - A segurança de concretizar seus projetos direto da fonte	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nQuis voluptatum molestias provident. Dicta nesciunt aspernatur.\nCupiditate facilis facere provident similique molestias atque eius. Ab aut rerum delectus. Eius sapiente facere facere.	3	21149.48	BRL	\N	\N	0	2026-01-08 14:58:42.173354	2026-01-08 14:58:42.173355	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
803	40	30	Maria Eduarda da Mata - A simplicidade de ganhar direto da fonte	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nReprehenderit optio eaque non officiis perferendis quo. Illo cum maxime.	4	19397.26	BRL	2026-02-21 10:32:01.223681	2025-12-31 02:23:09.265542	1	2026-01-08 14:58:42.173355	2026-01-08 14:58:42.173355	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
804	40	32	Alves - O prazer de ganhar sem preocupação	Oportunidade com Maria Pereira da empresa Alves.\n\nNon quidem nihil placeat voluptates deleniti eaque. Fugiat voluptatum est ad. Optio ipsum cupiditate repellendus earum debitis repudiandae.\nAliquam esse magnam quia rem eveniet quas.	5	12812.28	BRL	\N	2025-12-21 06:21:58.735833	1	2026-01-08 14:58:42.173356	2026-01-08 14:58:42.173356	\N	f	{"name": "Maria Pereira", "email": "gcarvalho@example.org", "phone": "(021) 2564-4813", "company": "Alves"}	72
805	40	32	Srta. Letícia Cunha - A certeza de concretizar seus projetos com toda a tranquilidade	Oportunidade com Srta. Letícia Cunha da empresa N/A.\n\nReprehenderit consequatur molestias voluptatum tempore perspiciatis. Eum quos rem illo fuga debitis ducimus. Explicabo velit fugit. Exercitationem repellendus repellat commodi odio.	6	5281.11	BRL	\N	2026-01-05 18:05:49.184414	1	2026-01-08 14:58:42.173356	2026-01-08 14:58:42.173357	\N	f	{"name": "Srta. Let\\u00edcia Cunha", "email": "dcarvalho@example.org", "phone": "0900-680-9839", "company": null}	64
806	40	30	Pinto - A vantagem de atingir seus objetivos com confiança	Oportunidade com Ana Lívia Pinto da empresa Pinto.\n\nPerspiciatis saepe sint accusamus. Porro id nemo ea voluptatem corporis asperiores.	7	17795.92	BRL	2026-01-18 20:17:50.970783	2025-12-22 15:01:30.948319	1	2026-01-08 14:58:42.173357	2026-01-08 14:58:42.173357	\N	f	{"name": "Ana L\\u00edvia Pinto", "email": "nascimentojoao-pedro@example.com", "phone": "41 3904 6052", "company": "Pinto"}	71
807	40	33	Dias - A possibilidade de inovar mais rapidamente	Oportunidade com Gustavo Santos da empresa Dias.\n\nSequi similique fugiat tempore earum veniam itaque. Blanditiis iste iure reprehenderit sequi beatae voluptatibus.	8	1622.74	BRL	2026-01-26 06:56:56.130431	2026-01-03 00:23:30.263367	1	2026-01-08 14:58:42.173358	2026-01-08 14:58:42.173358	\N	f	{"name": "Gustavo Santos", "email": "dalves@example.org", "phone": "31 0220 1494", "company": "Dias"}	68
808	38	32	Dias - O direito de conseguir em estado puro	Oportunidade com Gustavo Santos da empresa Dias.\n\nConsectetur nulla autem tempore numquam ut. Rem dolorum ea numquam. Voluptatum exercitationem reprehenderit dignissimos harum ipsam.	9	39819.25	BRL	\N	\N	0	2026-01-08 14:58:42.173358	2026-01-08 14:58:42.173358	\N	f	{"name": "Gustavo Santos", "email": "dalves@example.org", "phone": "31 0220 1494", "company": "Dias"}	68
809	40	29	Carvalho Ltda. - A possibilidade de mudar com toda a tranquilidade	Oportunidade com Srta. Nina Vieira da empresa Carvalho Ltda..\n\nA id cupiditate beatae earum. Veritatis mollitia laudantium cumque.	10	8188.65	BRL	\N	2025-12-22 05:19:58.775948	1	2026-01-08 14:58:42.173359	2026-01-08 14:58:42.173359	\N	f	{"name": "Srta. Nina Vieira", "email": "costelaheloisa@example.net", "phone": "41 0267-3632", "company": "Carvalho Ltda."}	76
810	37	29	Vitória da Cunha - A certeza de ganhar antes de tudo	Oportunidade com Vitória da Cunha da empresa N/A.\n\nIllo exercitationem praesentium enim soluta non deleniti veniam. Est officia totam excepturi nisi.	11	24230.24	BRL	2026-03-06 08:11:19.05654	\N	0	2026-01-08 14:58:42.17336	2026-01-08 14:58:42.17336	\N	f	{"name": "Vit\\u00f3ria da Cunha", "email": "da-cruzclarice@example.com", "phone": "+55 (051) 5103 4929", "company": null}	66
811	37	33	Pinto - A vantagem de ganhar naturalmente	Oportunidade com Ana Lívia Pinto da empresa Pinto.\n\nModi sunt quibusdam officiis. Officiis nemo mollitia odit facere similique placeat. Recusandae eligendi error pariatur omnis.	12	33386.89	BRL	\N	\N	0	2026-01-08 14:58:42.173361	2026-01-08 14:58:42.173361	\N	f	{"name": "Ana L\\u00edvia Pinto", "email": "nascimentojoao-pedro@example.com", "phone": "41 3904 6052", "company": "Pinto"}	71
812	38	33	Rocha Cardoso - ME - A arte de avançar com toda a tranquilidade	Oportunidade com Maria Vitória Vieira da empresa Rocha Cardoso - ME.\n\nConsequuntur nihil consequuntur quibusdam at blanditiis. Expedita recusandae quam culpa optio placeat veritatis. Mollitia iusto eligendi adipisci. Accusantium aperiam ipsam.	13	12405.42	BRL	2026-01-30 00:24:32.667301	\N	0	2026-01-08 14:58:42.173362	2026-01-08 14:58:42.173362	\N	f	{"name": "Maria Vit\\u00f3ria Vieira", "email": "ylopes@example.net", "phone": "+55 81 2090-3640", "company": "Rocha Cardoso - ME"}	75
813	39	32	Alves - A certeza de avançar mais facilmente	Oportunidade com Maria Pereira da empresa Alves.\n\nRepellendus blanditiis magni quisquam delectus libero. In minima veritatis ducimus repellat impedit facilis officia. Mollitia reiciendis ullam eos quo fugit voluptates.	14	44805.55	BRL	2026-03-02 11:29:18.163773	\N	0	2026-01-08 14:58:42.173362	2026-01-08 14:58:42.173363	\N	f	{"name": "Maria Pereira", "email": "gcarvalho@example.org", "phone": "(021) 2564-4813", "company": "Alves"}	72
814	38	32	Caroline Fernandes - A certeza de avançar direto da fonte	Oportunidade com Caroline Fernandes da empresa N/A.\n\nOdit mollitia earum itaque sint ullam facilis. Officiis nulla quis sequi ratione doloribus. Reprehenderit placeat magnam aut.	15	35924.75	BRL	2026-02-02 21:26:06.292575	\N	0	2026-01-08 14:58:42.173363	2026-01-08 14:58:42.173363	\N	f	{"name": "Caroline Fernandes", "email": "ymoraes@example.com", "phone": "+55 61 0376-3448", "company": null}	69
815	40	33	Nathan Azevedo - O poder de conseguir mais facilmente	Oportunidade com Nathan Azevedo da empresa N/A.\n\nVelit voluptas doloremque voluptatem quas incidunt similique.	16	36962.63	BRL	2026-02-11 04:54:51.393785	2025-12-29 16:50:24.391667	1	2026-01-08 14:58:42.173364	2026-01-08 14:58:42.173364	\N	f	{"name": "Nathan Azevedo", "email": "rda-mata@example.net", "phone": "0900 758 8026", "company": null}	65
816	39	30	Rocha Cardoso - ME - A vantagem de atingir seus objetivos em estado puro	Oportunidade com Maria Vitória Vieira da empresa Rocha Cardoso - ME.\n\nQuisquam esse veritatis earum. Atque incidunt perspiciatis dolor vero et blanditiis enim.\nNihil corrupti sunt deleniti ad. Consequatur facere dignissimos iusto asperiores rerum illum error.	17	45052.91	BRL	2026-01-12 19:13:52.301091	\N	0	2026-01-08 14:58:42.173365	2026-01-08 14:58:42.173365	\N	f	{"name": "Maria Vit\\u00f3ria Vieira", "email": "ylopes@example.net", "phone": "+55 81 2090-3640", "company": "Rocha Cardoso - ME"}	75
817	38	33	Vitória da Cunha - A simplicidade de atingir seus objetivos com confiança	Oportunidade com Vitória da Cunha da empresa N/A.\n\nEst dolorum aperiam ad unde nihil. Laboriosam error iure maiores illum illo.\nQuae exercitationem veritatis beatae. Asperiores quibusdam nulla eaque quod molestiae. Culpa quod assumenda itaque.	18	41190.54	BRL	\N	\N	0	2026-01-08 14:58:42.173365	2026-01-08 14:58:42.173366	\N	f	{"name": "Vit\\u00f3ria da Cunha", "email": "da-cruzclarice@example.com", "phone": "+55 (051) 5103 4929", "company": null}	66
818	40	33	Alves - A vantagem de concretizar seus projetos mais facilmente	Oportunidade com Gabriel Souza da empresa Alves.\n\nNon quo expedita ratione omnis adipisci. Distinctio tempore autem odio deleniti laudantium.\nAd perferendis quas repellendus commodi. Officiis fugiat necessitatibus provident adipisci nesciunt error.	19	41275.80	BRL	2026-02-07 01:26:37.302486	2025-12-22 14:26:13.46733	1	2026-01-08 14:58:42.173366	2026-01-08 14:58:42.173366	\N	f	{"name": "Gabriel Souza", "email": "hpinto@example.net", "phone": "(071) 1708 3138", "company": "Alves"}	63
819	40	31	Alves - O prazer de inovar mais facilmente	Oportunidade com Gabriel Souza da empresa Alves.\n\nEveniet soluta beatae hic voluptas nemo exercitationem. Minima aliquid error quod perspiciatis quia expedita possimus. Tempora cumque voluptatibus sunt impedit.	20	28545.00	BRL	2026-02-14 01:57:59.756635	2025-12-26 17:22:18.16916	1	2026-01-08 14:58:42.173367	2026-01-08 14:58:42.173367	\N	f	{"name": "Gabriel Souza", "email": "hpinto@example.net", "phone": "(071) 1708 3138", "company": "Alves"}	63
820	37	29	Carvalho Ltda. - A arte de avançar com força total	Oportunidade com Srta. Nina Vieira da empresa Carvalho Ltda..\n\nVoluptatem illum quisquam totam non ut quia. Ad maxime assumenda sint velit harum inventore. At perferendis commodi autem.	21	43844.48	BRL	2026-02-18 09:57:02.574261	\N	0	2026-01-08 14:58:42.173368	2026-01-08 14:58:42.173368	\N	f	{"name": "Srta. Nina Vieira", "email": "costelaheloisa@example.net", "phone": "41 0267-3632", "company": "Carvalho Ltda."}	76
821	37	33	Alves - O prazer de avançar naturalmente	Oportunidade com Maria Pereira da empresa Alves.\n\nTemporibus similique modi magni aut optio eligendi.\nOmnis voluptatibus quo saepe odit nulla quae deleniti. Ducimus alias reiciendis.	22	39983.61	BRL	2026-02-10 01:11:28.757114	\N	0	2026-01-08 14:58:42.173368	2026-01-08 14:58:42.173369	\N	f	{"name": "Maria Pereira", "email": "gcarvalho@example.org", "phone": "(021) 2564-4813", "company": "Alves"}	72
822	38	30	Maria Eduarda da Mata - O conforto de avançar mais rapidamente	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nEos tempora repellat harum suscipit quos ratione porro. Voluptatibus ut tempora excepturi impedit ipsam.\nVitae tempore tempora sint. In quibusdam pariatur explicabo vero ad.	23	49827.12	BRL	2026-02-22 03:15:58.72972	\N	0	2026-01-08 14:58:42.173369	2026-01-08 14:58:42.173369	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
823	37	33	Caroline Fernandes - A segurança de evoluir mais facilmente	Oportunidade com Caroline Fernandes da empresa N/A.\n\nRecusandae porro quasi ab tempore. Provident expedita in ullam.\nAsperiores quia hic quam adipisci ipsa. Iure ipsam non tenetur. Sequi iusto quae nemo est fugiat.	24	41641.37	BRL	2026-01-31 04:50:59.902331	\N	0	2026-01-08 14:58:42.17337	2026-01-08 14:58:42.17337	\N	f	{"name": "Caroline Fernandes", "email": "ymoraes@example.com", "phone": "+55 61 0376-3448", "company": null}	69
824	38	31	Maria Eduarda da Mata - A arte de evoluir mais rapidamente	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nOccaecati id tempore minus id pariatur laboriosam labore. Repudiandae consequuntur numquam magni.	25	20115.66	BRL	\N	\N	0	2026-01-08 14:58:42.173371	2026-01-08 14:58:42.173371	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
825	40	29	Alves - A certeza de realizar seus sonhos mais rapidamente	Oportunidade com Maria Pereira da empresa Alves.\n\nUt aliquid unde amet perferendis impedit aspernatur dolore. Est explicabo dolores.\nModi laboriosam distinctio nesciunt sapiente assumenda.	26	21686.01	BRL	2026-02-20 01:47:30.772491	2025-12-09 23:33:40.140074	1	2026-01-08 14:58:42.173371	2026-01-08 14:58:42.173371	\N	f	{"name": "Maria Pereira", "email": "gcarvalho@example.org", "phone": "(021) 2564-4813", "company": "Alves"}	72
826	38	30	Nathan Azevedo - O prazer de evoluir simplesmente	Oportunidade com Nathan Azevedo da empresa N/A.\n\nVeniam facilis corporis a exercitationem. Nisi eaque eum voluptas.\nNobis consequatur molestias cum ipsam repellat dolore illo.	27	42133.33	BRL	2026-02-20 18:00:33.469488	\N	0	2026-01-08 14:58:42.173372	2026-01-08 14:58:42.173372	\N	f	{"name": "Nathan Azevedo", "email": "rda-mata@example.net", "phone": "0900 758 8026", "company": null}	65
827	38	31	Nathan Azevedo - A vantagem de ganhar sem preocupação	Oportunidade com Nathan Azevedo da empresa N/A.\n\nAlias molestiae consectetur. Dicta quisquam numquam minima voluptatem.\nUnde libero dignissimos repellat in animi. Dicta error quibusdam saepe ducimus.	28	16804.36	BRL	2026-01-30 04:58:40.863226	\N	0	2026-01-08 14:58:42.173372	2026-01-08 14:58:42.173373	\N	f	{"name": "Nathan Azevedo", "email": "rda-mata@example.net", "phone": "0900 758 8026", "company": null}	65
828	38	32	Nathan Azevedo - O direito de evoluir mais rapidamente	Oportunidade com Nathan Azevedo da empresa N/A.\n\nUllam optio debitis impedit ea cumque minima. Dicta quod qui consequatur.	29	27896.80	BRL	2026-02-16 19:40:15.735581	\N	0	2026-01-08 14:58:42.173373	2026-01-08 14:58:42.173373	\N	f	{"name": "Nathan Azevedo", "email": "rda-mata@example.net", "phone": "0900 758 8026", "company": null}	65
829	38	32	Maria Eduarda da Mata - A segurança de atingir seus objetivos de maneira eficaz	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nNesciunt in eius explicabo enim facere. Vero repellat ipsa nam.\nSimilique minus earum iure sequi. Culpa ad natus perspiciatis minus animi. Harum iusto recusandae.	30	2299.21	BRL	2026-02-11 02:01:21.069011	\N	0	2026-01-08 14:58:42.173374	2026-01-08 14:58:42.173374	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
830	40	31	Pinto - O poder de mudar com toda a tranquilidade	Oportunidade com Ana Lívia Pinto da empresa Pinto.\n\nDolore quo velit facilis nostrum nihil ad. Accusamus dicta unde quae pariatur enim maxime.	31	4558.93	BRL	2026-02-09 12:32:04.862423	2026-01-06 14:33:53.077515	1	2026-01-08 14:58:42.173374	2026-01-08 14:58:42.173374	\N	f	{"name": "Ana L\\u00edvia Pinto", "email": "nascimentojoao-pedro@example.com", "phone": "41 3904 6052", "company": "Pinto"}	71
831	39	33	Caroline Fernandes - A certeza de realizar seus sonhos com toda a tranquilidade	Oportunidade com Caroline Fernandes da empresa N/A.\n\nMaiores atque nostrum fugit magni tenetur. Nemo nesciunt officiis consequatur aut. Nulla tempore eaque sequi sunt quas adipisci.	32	11013.96	BRL	2026-03-05 21:00:03.918376	\N	0	2026-01-08 14:58:42.173375	2026-01-08 14:58:42.173375	\N	f	{"name": "Caroline Fernandes", "email": "ymoraes@example.com", "phone": "+55 61 0376-3448", "company": null}	69
832	37	33	Srta. Letícia Cunha - A arte de ganhar mais rapidamente	Oportunidade com Srta. Letícia Cunha da empresa N/A.\n\nExercitationem magni sapiente.	33	26188.66	BRL	\N	\N	0	2026-01-08 14:58:42.173375	2026-01-08 14:58:42.173376	\N	f	{"name": "Srta. Let\\u00edcia Cunha", "email": "dcarvalho@example.org", "phone": "0900-680-9839", "company": null}	64
833	38	30	Rocha Cardoso - ME - O conforto de avançar com confiança	Oportunidade com Maria Vitória Vieira da empresa Rocha Cardoso - ME.\n\nTempore rerum quos inventore recusandae enim sint occaecati. Cumque nisi recusandae in. A molestias rem excepturi eos ut ipsum.	34	25507.19	BRL	2026-03-05 17:16:16.427965	\N	0	2026-01-08 14:58:42.173376	2026-01-08 14:58:42.173376	\N	f	{"name": "Maria Vit\\u00f3ria Vieira", "email": "ylopes@example.net", "phone": "+55 81 2090-3640", "company": "Rocha Cardoso - ME"}	75
834	37	30	Dias - O poder de realizar seus sonhos sem preocupação	Oportunidade com Gustavo Santos da empresa Dias.\n\nQuisquam molestiae qui totam. Magnam placeat labore iure cumque ut.	35	9499.43	BRL	2026-02-28 15:46:59.887798	\N	0	2026-01-08 14:58:42.173377	2026-01-08 14:58:42.173377	\N	f	{"name": "Gustavo Santos", "email": "dalves@example.org", "phone": "31 0220 1494", "company": "Dias"}	68
835	39	30	Alves - A possibilidade de concretizar seus projetos com toda a tranquilidade	Oportunidade com Gabriel Souza da empresa Alves.\n\nLaudantium quam non tenetur accusantium nisi nobis tempore. Mollitia in ex libero impedit rerum recusandae. Accusantium odio repellat.	36	30522.45	BRL	2026-01-08 22:43:50.794911	\N	0	2026-01-08 14:58:42.173377	2026-01-08 14:58:42.173377	\N	f	{"name": "Gabriel Souza", "email": "hpinto@example.net", "phone": "(071) 1708 3138", "company": "Alves"}	63
836	40	29	Maria Eduarda da Mata - O conforto de evoluir com força total	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nExercitationem rerum repellat dicta aliquam id. Nobis sint animi temporibus. Harum quos praesentium ab praesentium delectus ea.	37	43747.09	BRL	2026-03-07 23:17:41.456373	2025-12-17 00:09:44.362999	1	2026-01-08 14:58:42.173378	2026-01-08 14:58:42.173378	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
837	39	33	Nathan Azevedo - O conforto de avançar mais facilmente	Oportunidade com Nathan Azevedo da empresa N/A.\n\nDistinctio aperiam magnam ad unde tempore ex. Unde aliquid velit dicta velit. Error sed repudiandae quas omnis hic quas.	38	21227.85	BRL	2026-02-07 20:59:34.529452	\N	0	2026-01-08 14:58:42.173379	2026-01-08 14:58:42.173379	\N	f	{"name": "Nathan Azevedo", "email": "rda-mata@example.net", "phone": "0900 758 8026", "company": null}	65
838	38	30	Vitória da Cunha - O direito de atingir seus objetivos de maneira eficaz	Oportunidade com Vitória da Cunha da empresa N/A.\n\nTemporibus amet sed ea earum dolores ratione. Mollitia ea facere sunt ut nam. Voluptatum deleniti ipsum culpa itaque.	39	39410.23	BRL	2026-01-09 22:59:00.221162	\N	0	2026-01-08 14:58:42.173379	2026-01-08 14:58:42.17338	\N	f	{"name": "Vit\\u00f3ria da Cunha", "email": "da-cruzclarice@example.com", "phone": "+55 (051) 5103 4929", "company": null}	66
839	39	33	Maria Eduarda da Mata - A certeza de avançar sem preocupação	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nQuisquam voluptatem provident nisi. Nobis tempore ducimus tempore. Sapiente occaecati tenetur.	40	40428.56	BRL	2026-01-15 08:30:29.492802	\N	0	2026-01-08 14:58:42.17338	2026-01-08 14:58:42.17338	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
840	38	30	Alves - A certeza de inovar sem preocupação	Oportunidade com Maria Pereira da empresa Alves.\n\nNesciunt hic unde. Illo corrupti quidem. Reiciendis maxime voluptatum accusantium in nam dolore. Omnis explicabo ipsa vitae quia rem doloribus.	41	32270.62	BRL	2026-03-02 19:52:12.007154	\N	0	2026-01-08 14:58:42.173381	2026-01-08 14:58:42.173381	\N	f	{"name": "Maria Pereira", "email": "gcarvalho@example.org", "phone": "(021) 2564-4813", "company": "Alves"}	72
841	37	29	Maria Eduarda da Mata - A arte de evoluir mais facilmente	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nItaque saepe earum hic. Architecto soluta quos aspernatur voluptatem laudantium.\nOfficia dolore quas commodi sit numquam.	42	26263.52	BRL	2026-02-23 10:01:28.419038	\N	0	2026-01-08 14:58:42.173381	2026-01-08 14:58:42.173382	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
842	39	31	Maria Eduarda da Mata - A segurança de evoluir simplesmente	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nIllum nisi impedit omnis dolorum. Asperiores repellendus beatae dignissimos rem nobis. Ipsum perferendis modi pariatur quidem.	43	27766.79	BRL	\N	\N	0	2026-01-08 14:58:42.173382	2026-01-08 14:58:42.173382	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
843	37	30	Alves - O direito de avançar com confiança	Oportunidade com Maria Pereira da empresa Alves.\n\nExcepturi aliquid a voluptatem in labore aut. Fugit tempora optio a.	44	39417.59	BRL	\N	\N	0	2026-01-08 14:58:42.173383	2026-01-08 14:58:42.173383	\N	f	{"name": "Maria Pereira", "email": "gcarvalho@example.org", "phone": "(021) 2564-4813", "company": "Alves"}	72
844	38	30	Maria Eduarda da Mata - A vantagem de realizar seus sonhos sem preocupação	Oportunidade com Maria Eduarda da Mata da empresa N/A.\n\nOfficiis quisquam harum. Dolorum sed consequatur ipsum.\nRepellendus iusto dolorum eum illo ad. Suscipit quibusdam soluta dignissimos sed.	45	29807.48	BRL	2026-02-08 11:08:47.406772	\N	0	2026-01-08 14:58:42.173383	2026-01-08 14:58:42.173384	\N	f	{"name": "Maria Eduarda da Mata", "email": "melojuliana@example.com", "phone": "+55 81 5152-6044", "company": null}	74
845	38	30	Rocha Araújo e Filhos - O conforto de ganhar mais facilmente	Oportunidade com Davi Alves da empresa Rocha Araújo e Filhos.\n\nQuam voluptate illum minima soluta. Blanditiis dolor aspernatur sunt sed voluptates. Amet nisi a consectetur.	46	47096.50	BRL	2026-01-09 19:00:09.205633	\N	0	2026-01-08 14:58:42.173384	2026-01-08 14:58:42.173384	\N	f	{"name": "Davi Alves", "email": "mda-conceicao@example.com", "phone": "61 1369-3554", "company": "Rocha Ara\\u00fajo e Filhos"}	67
846	37	32	Rocha Cardoso - ME - O conforto de concretizar seus projetos simplesmente	Oportunidade com Maria Vitória Vieira da empresa Rocha Cardoso - ME.\n\nQuisquam voluptas quos maiores eaque eaque. Dolor dolor repellat quasi consequuntur aut modi.	47	29248.17	BRL	2026-02-28 10:57:26.393173	\N	0	2026-01-08 14:58:42.173385	2026-01-08 14:58:42.173385	\N	f	{"name": "Maria Vit\\u00f3ria Vieira", "email": "ylopes@example.net", "phone": "+55 81 2090-3640", "company": "Rocha Cardoso - ME"}	75
847	39	33	Azevedo - O direito de mudar naturalmente	Oportunidade com Davi Lucca Porto da empresa Azevedo.\n\nRem iure dolores possimus nesciunt possimus natus iure. Repellat ducimus numquam adipisci eos quidem. Possimus ratione itaque quas facere.	48	35583.45	BRL	2026-02-08 16:19:57.921469	\N	0	2026-01-08 14:58:42.173386	2026-01-08 14:58:42.173386	\N	f	{"name": "Davi Lucca Porto", "email": "castronoah@example.com", "phone": "+55 21 6780-5062", "company": "Azevedo"}	73
848	45	37	Viana - A arte de realizar seus sonhos direto da fonte	Oportunidade com Eloah Moreira da empresa Viana.\n\nVoluptatibus voluptates odio ex dolor animi qui. Ducimus non animi illo explicabo et. Doloremque iusto nulla qui sit.	0	38059.56	BRL	\N	2026-01-04 20:09:25.858268	1	2026-01-08 14:58:48.513253	2026-01-08 14:58:48.513259	\N	f	{"name": "Eloah Moreira", "email": "oliviacostela@example.com", "phone": "+55 (084) 2365-9652", "company": "Viana"}	90
849	46	41	Bianca Caldeira - A vantagem de atingir seus objetivos em estado puro	Oportunidade com Bianca Caldeira da empresa N/A.\n\nAb labore ad hic laudantium quos harum.\nIusto facilis dolor mollitia. Reiciendis voluptas necessitatibus distinctio provident. Necessitatibus possimus voluptatibus ea exercitationem.	1	17091.98	BRL	2026-01-13 02:11:07.372074	2025-12-21 09:30:33.745658	-1	2026-01-08 14:58:48.51326	2026-01-08 14:58:48.513261	\N	f	{"name": "Bianca Caldeira", "email": "paulomoura@example.net", "phone": "+55 (081) 9393-3955", "company": null}	79
850	46	39	Gomes Ltda. - O prazer de atingir seus objetivos mais facilmente	Oportunidade com Ana da Rocha da empresa Gomes Ltda..\n\nNam aliquid harum. Unde doloremque optio voluptate.\nVoluptatem exercitationem officia incidunt asperiores nam minus. Nobis architecto rerum est hic. Aliquid rerum odio sed quam.	2	44385.32	BRL	2026-02-16 03:54:56.762468	2025-12-10 18:48:48.153899	-1	2026-01-08 14:58:48.513261	2026-01-08 14:58:48.513261	\N	f	{"name": "Ana da Rocha", "email": "davi-lucasteixeira@example.org", "phone": "+55 (021) 4257-8444", "company": "Gomes Ltda."}	85
851	43	40	Benício Vieira - A certeza de avançar sem preocupação	Oportunidade com Benício Vieira da empresa N/A.\n\nVeritatis quidem ea earum. Eveniet eius praesentium unde maiores. Dignissimos possimus ratione exercitationem sed eveniet.	3	49181.99	BRL	2026-02-17 01:27:17.655618	\N	0	2026-01-08 14:58:48.513262	2026-01-08 14:58:48.513262	\N	f	{"name": "Ben\\u00edcio Vieira", "email": "erodrigues@example.net", "phone": "61 7676-3273", "company": null}	91
852	43	41	Azevedo - A arte de inovar em estado puro	Oportunidade com Dr. Alexandre Gomes da empresa Azevedo.\n\nNatus accusamus earum illo sequi autem quia. Provident minima tempora.\nUnde enim excepturi blanditiis sunt voluptas modi. Enim rerum velit dolore.	4	15566.68	BRL	2026-02-25 03:32:00.175303	\N	0	2026-01-08 14:58:48.513262	2026-01-08 14:58:48.513263	\N	f	{"name": "Dr. Alexandre Gomes", "email": "jaraujo@example.org", "phone": "(071) 1584 0012", "company": "Azevedo"}	80
853	44	37	Bryan Souza - O prazer de avançar simplesmente	Oportunidade com Bryan Souza da empresa N/A.\n\nProvident suscipit ipsa sit exercitationem eveniet dolores. Repellendus vero dolorem corrupti libero quae. Sint mollitia ut eum adipisci illo atque fugiat.	5	4297.82	BRL	2026-01-18 18:18:00.468347	\N	0	2026-01-08 14:58:48.513263	2026-01-08 14:58:48.513263	\N	f	{"name": "Bryan Souza", "email": "isadora99@example.org", "phone": "+55 (081) 3610 5101", "company": null}	89
854	41	37	Bryan Souza - O direito de realizar seus sonhos antes de tudo	Oportunidade com Bryan Souza da empresa N/A.\n\nAspernatur hic esse placeat est quos excepturi. Dignissimos nobis libero ut dolore aliquid. Libero praesentium sint eligendi praesentium. Assumenda eum laboriosam illum quisquam praesentium.	6	1804.04	BRL	2026-02-25 03:52:44.4937	\N	0	2026-01-08 14:58:48.513264	2026-01-08 14:58:48.513265	\N	f	{"name": "Bryan Souza", "email": "isadora99@example.org", "phone": "+55 (081) 3610 5101", "company": null}	89
855	43	40	Sales - A simplicidade de mudar antes de tudo	Oportunidade com Davi Lucas Pereira da empresa Sales.\n\nLibero vitae quasi molestiae explicabo ex dolorum ad. Officia quia vitae facilis similique consectetur.	7	47571.33	BRL	2026-01-11 18:13:26.668073	\N	0	2026-01-08 14:58:48.513265	2026-01-08 14:58:48.513265	\N	f	{"name": "Davi Lucas Pereira", "email": "ida-rosa@example.com", "phone": "+55 21 3398 7116", "company": "Sales"}	95
856	41	37	Souza Peixoto S.A. - A certeza de realizar seus sonhos simplesmente	Oportunidade com Srta. Bianca Costela da empresa Souza Peixoto S.A..\n\nNostrum facilis numquam ex repellat rem. Autem quo voluptatum quam ex.\nRerum velit blanditiis veritatis impedit autem. Enim a veritatis laboriosam maiores. Doloremque cum dicta explicabo quia nemo.	8	37153.30	BRL	2026-02-08 22:14:48.012433	\N	0	2026-01-08 14:58:48.513266	2026-01-08 14:58:48.513266	\N	f	{"name": "Srta. Bianca Costela", "email": "maitesales@example.net", "phone": "61 0550 2984", "company": "Souza Peixoto S.A."}	88
857	44	37	Lopes - O poder de atingir seus objetivos com toda a tranquilidade	Oportunidade com Ana Luiza Rezende da empresa Lopes.\n\nIllo earum veritatis aliquid rerum reiciendis sapiente. Voluptatum dicta recusandae mollitia officiis eaque. Facilis tempore voluptas dolores asperiores.	9	9878.21	BRL	\N	\N	0	2026-01-08 14:58:48.513267	2026-01-08 14:58:48.513267	\N	f	{"name": "Ana Luiza Rezende", "email": "heloisa09@example.org", "phone": "0500-966-7385", "company": "Lopes"}	87
858	44	38	Lopes - O direito de ganhar antes de tudo	Oportunidade com Ana Luiza Rezende da empresa Lopes.\n\nAssumenda cupiditate sit laborum distinctio eligendi doloremque. Dolorum voluptatibus blanditiis quis tempore.	10	6146.71	BRL	2026-02-10 13:14:03.177173	\N	0	2026-01-08 14:58:48.513268	2026-01-08 14:58:48.513268	\N	f	{"name": "Ana Luiza Rezende", "email": "heloisa09@example.org", "phone": "0500-966-7385", "company": "Lopes"}	87
859	43	40	Azevedo - A liberdade de concretizar seus projetos com toda a tranquilidade	Oportunidade com Dr. Alexandre Gomes da empresa Azevedo.\n\nDoloribus aliquam harum occaecati qui officia. Commodi deleniti quasi qui a. Tempore officiis fugiat quod vel eum et.	11	34364.02	BRL	\N	\N	0	2026-01-08 14:58:48.513268	2026-01-08 14:58:48.513269	\N	f	{"name": "Dr. Alexandre Gomes", "email": "jaraujo@example.org", "phone": "(071) 1584 0012", "company": "Azevedo"}	80
860	41	38	Nogueira - O conforto de conseguir naturalmente	Oportunidade com Ana Julia Costela da empresa Nogueira.\n\nQuos voluptatum at non natus. Nemo molestiae fugiat tenetur ipsum soluta pariatur. Eaque aliquid nulla delectus.	12	15155.62	BRL	2026-03-05 20:04:10.140069	\N	0	2026-01-08 14:58:48.513269	2026-01-08 14:58:48.513269	\N	f	{"name": "Ana Julia Costela", "email": "yasmin06@example.org", "phone": "51 8009 2783", "company": "Nogueira"}	96
861	41	39	Bryan Souza - O prazer de ganhar mais rapidamente	Oportunidade com Bryan Souza da empresa N/A.\n\nSequi quisquam atque exercitationem accusantium. Perferendis corporis repudiandae beatae error asperiores.	13	37813.26	BRL	2026-02-05 09:38:01.182043	\N	0	2026-01-08 14:58:48.51327	2026-01-08 14:58:48.51327	\N	f	{"name": "Bryan Souza", "email": "isadora99@example.org", "phone": "+55 (081) 3610 5101", "company": null}	89
862	41	37	Novaes - O conforto de evoluir direto da fonte	Oportunidade com Vicente Silva da empresa Novaes.\n\nMinima aspernatur impedit veritatis. Provident sapiente vero voluptates.\nSuscipit nobis optio sequi. Tenetur enim laborum natus. Illum facilis labore dolorum nam ex.	14	33994.47	BRL	\N	\N	0	2026-01-08 14:58:48.513271	2026-01-08 14:58:48.513271	\N	f	{"name": "Vicente Silva", "email": "fcardoso@example.org", "phone": "(061) 3129-6621", "company": "Novaes"}	82
863	45	41	Gomes Ltda. - O conforto de avançar mais rapidamente	Oportunidade com Ana da Rocha da empresa Gomes Ltda..\n\nDoloremque a illum dolorum. Quos nesciunt non optio vel nulla dolorem.\nCumque blanditiis suscipit doloribus optio et. Error veritatis ullam in. Ducimus ut corporis error tempora. Eum aliquam odio.	15	25107.15	BRL	2026-02-22 15:57:01.644138	2026-01-01 00:57:21.156066	1	2026-01-08 14:58:48.513272	2026-01-08 14:58:48.513272	\N	f	{"name": "Ana da Rocha", "email": "davi-lucasteixeira@example.org", "phone": "+55 (021) 4257-8444", "company": "Gomes Ltda."}	85
864	45	37	Novaes - A segurança de avançar mais facilmente	Oportunidade com Vicente Silva da empresa Novaes.\n\nAccusantium dolore perspiciatis porro et. Aliquid provident magni veniam est aspernatur saepe beatae.	16	34689.59	BRL	2026-01-13 23:57:32.598374	2025-12-13 17:29:43.529918	1	2026-01-08 14:58:48.513273	2026-01-08 14:58:48.513273	\N	f	{"name": "Vicente Silva", "email": "fcardoso@example.org", "phone": "(061) 3129-6621", "company": "Novaes"}	82
865	46	37	Moura - O conforto de concretizar seus projetos em estado puro	Oportunidade com Isabella da Cunha da empresa Moura.\n\nPerspiciatis ipsum natus. Suscipit eius corporis temporibus.	17	27230.98	BRL	2026-01-17 20:30:41.578041	2025-12-13 21:32:33.026826	-1	2026-01-08 14:58:48.513274	2026-01-08 14:58:48.513274	\N	f	{"name": "Isabella da Cunha", "email": "pedro-lucaslima@example.org", "phone": "(021) 6602 0033", "company": "Moura"}	92
866	44	39	Gomes Ltda. - A vantagem de mudar sem preocupação	Oportunidade com Ana da Rocha da empresa Gomes Ltda..\n\nMinima ut provident assumenda mollitia reiciendis. Voluptatibus vel quibusdam molestiae dolorem minus libero illo.	18	34973.23	BRL	\N	\N	0	2026-01-08 14:58:48.513274	2026-01-08 14:58:48.513275	\N	f	{"name": "Ana da Rocha", "email": "davi-lucasteixeira@example.org", "phone": "+55 (021) 4257-8444", "company": "Gomes Ltda."}	85
867	43	39	Sales S.A. - A segurança de ganhar de maneira eficaz	Oportunidade com Eduarda Lima da empresa Sales S.A..\n\nLaborum possimus velit aut. Inventore soluta a. Voluptas odit odio sequi possimus.\nCumque delectus voluptatibus tenetur aliquam cum hic. Explicabo fugiat sed molestiae deserunt reiciendis itaque.	19	18667.41	BRL	2026-02-11 21:36:37.859498	\N	0	2026-01-08 14:58:48.513275	2026-01-08 14:58:48.513276	\N	f	{"name": "Eduarda Lima", "email": "gda-cruz@example.org", "phone": "+55 41 7509 2681", "company": "Sales S.A."}	98
868	42	37	Azevedo - O conforto de realizar seus sonhos com toda a tranquilidade	Oportunidade com Dr. Alexandre Gomes da empresa Azevedo.\n\nAutem quod corrupti distinctio accusantium eveniet praesentium. Voluptas exercitationem quod velit.	20	38960.69	BRL	\N	\N	0	2026-01-08 14:58:48.513276	2026-01-08 14:58:48.513276	\N	f	{"name": "Dr. Alexandre Gomes", "email": "jaraujo@example.org", "phone": "(071) 1584 0012", "company": "Azevedo"}	80
869	44	37	Farias - EI - A simplicidade de avançar mais rapidamente	Oportunidade com Erick Ramos da empresa Farias - EI.\n\nOfficiis excepturi ab molestias debitis maiores. Totam facere quas minus corrupti.\nDolores nostrum officiis voluptatum. Quasi numquam illum asperiores.	21	13523.62	BRL	2026-01-31 17:26:26.366933	\N	0	2026-01-08 14:58:48.513277	2026-01-08 14:58:48.513277	\N	f	{"name": "Erick Ramos", "email": "nathan63@example.com", "phone": "+55 (061) 9804 6904", "company": "Farias - EI"}	84
870	44	39	Sales - A certeza de atingir seus objetivos simplesmente	Oportunidade com Davi Lucas Pereira da empresa Sales.\n\nNesciunt doloremque officiis reiciendis accusantium distinctio commodi quidem. Nisi fugiat ipsa vero iste porro aspernatur soluta.	22	33861.84	BRL	\N	\N	0	2026-01-08 14:58:48.513277	2026-01-08 14:58:48.513278	\N	f	{"name": "Davi Lucas Pereira", "email": "ida-rosa@example.com", "phone": "+55 21 3398 7116", "company": "Sales"}	95
871	46	41	Rocha - O prazer de atingir seus objetivos com confiança	Oportunidade com Ana Júlia Aragão da empresa Rocha.\n\nQuidem amet aliquid incidunt numquam alias. Veritatis quisquam odit.\nEx ea culpa libero officia dolorum. Corrupti tempora deserunt facilis et blanditiis eius veritatis.	23	26722.68	BRL	\N	2025-12-25 20:44:10.549248	-1	2026-01-08 14:58:48.513278	2026-01-08 14:58:48.513278	\N	f	{"name": "Ana J\\u00falia Arag\\u00e3o", "email": "da-rochabreno@example.org", "phone": "0900-031-3663", "company": "Rocha"}	81
872	41	40	Azevedo - A simplicidade de atingir seus objetivos em estado puro	Oportunidade com Dr. Alexandre Gomes da empresa Azevedo.\n\nUt minus nulla perspiciatis dicta excepturi pariatur. Fugit a recusandae optio.\nAb illum quidem modi.	24	41621.32	BRL	2026-02-20 07:52:00.055202	\N	0	2026-01-08 14:58:48.513279	2026-01-08 14:58:48.513279	\N	f	{"name": "Dr. Alexandre Gomes", "email": "jaraujo@example.org", "phone": "(071) 1584 0012", "company": "Azevedo"}	80
873	45	39	Rocha - A possibilidade de conseguir com confiança	Oportunidade com Ana Júlia Aragão da empresa Rocha.\n\nSed expedita sequi harum vel illo. Blanditiis harum tempora ex eveniet.\nAut eligendi debitis atque animi. Distinctio vitae fugiat suscipit commodi.	25	42350.80	BRL	2026-02-04 15:47:42.291419	2025-12-14 23:49:24.441357	1	2026-01-08 14:58:48.51328	2026-01-08 14:58:48.51328	\N	f	{"name": "Ana J\\u00falia Arag\\u00e3o", "email": "da-rochabreno@example.org", "phone": "0900-031-3663", "company": "Rocha"}	81
874	41	41	Gomes Ltda. - A simplicidade de atingir seus objetivos com toda a tranquilidade	Oportunidade com Ana da Rocha da empresa Gomes Ltda..\n\nDeserunt ut dignissimos sint eaque iste. Ullam illo dicta veritatis sequi officia impedit. Ullam magnam id exercitationem temporibus ut.	26	45312.47	BRL	\N	\N	0	2026-01-08 14:58:48.513281	2026-01-08 14:58:48.513281	\N	f	{"name": "Ana da Rocha", "email": "davi-lucasteixeira@example.org", "phone": "+55 (021) 4257-8444", "company": "Gomes Ltda."}	85
875	42	41	Azevedo - A segurança de evoluir mais rapidamente	Oportunidade com Dr. Alexandre Gomes da empresa Azevedo.\n\nVoluptatem debitis facere in sit iusto provident. Quis illo laboriosam consectetur. Eum temporibus illo debitis.	27	23083.75	BRL	2026-02-06 09:32:50.387328	\N	0	2026-01-08 14:58:48.513282	2026-01-08 14:58:48.513282	\N	f	{"name": "Dr. Alexandre Gomes", "email": "jaraujo@example.org", "phone": "(071) 1584 0012", "company": "Azevedo"}	80
876	42	39	Bianca Caldeira - O prazer de inovar com força total	Oportunidade com Bianca Caldeira da empresa N/A.\n\nSaepe quae perspiciatis magni enim eligendi maxime. Eveniet error quos saepe quaerat earum blanditiis.\nNatus sunt libero. Consectetur sapiente perspiciatis accusantium. Ipsa dignissimos deserunt.	28	16251.21	BRL	2026-01-19 03:08:02.006767	\N	0	2026-01-08 14:58:48.513282	2026-01-08 14:58:48.513282	\N	f	{"name": "Bianca Caldeira", "email": "paulomoura@example.net", "phone": "+55 (081) 9393-3955", "company": null}	79
877	43	41	Dr. Kaique Moraes - A possibilidade de realizar seus sonhos com toda a tranquilidade	Oportunidade com Dr. Kaique Moraes da empresa N/A.\n\nOdit cum veniam sint. Dolorem officiis nemo cum officia vitae facilis. Illo eos modi asperiores perferendis tenetur libero.	29	45340.48	BRL	2026-03-08 14:46:14.284534	\N	0	2026-01-08 14:58:48.513283	2026-01-08 14:58:48.513283	\N	f	{"name": "Dr. Kaique Moraes", "email": "jcastro@example.net", "phone": "(051) 1355-7004", "company": null}	94
878	46	38	Moura - A liberdade de inovar naturalmente	Oportunidade com Isabella da Cunha da empresa Moura.\n\nQuo quae odio inventore mollitia optio temporibus. Ab recusandae odit.\nUnde suscipit perspiciatis vel corporis ipsam deleniti sit. Explicabo id deserunt facilis.	30	40566.37	BRL	2026-02-09 22:42:22.428004	2025-12-21 12:44:33.354704	-1	2026-01-08 14:58:48.513283	2026-01-08 14:58:48.513284	\N	f	{"name": "Isabella da Cunha", "email": "pedro-lucaslima@example.org", "phone": "(021) 6602 0033", "company": "Moura"}	92
879	43	40	Novaes - O poder de inovar com confiança	Oportunidade com Vicente Silva da empresa Novaes.\n\nVitae adipisci dolorem recusandae cum aspernatur. Doloremque quaerat aliquid quos.	31	17776.82	BRL	2026-02-24 05:42:35.73843	\N	0	2026-01-08 14:58:48.513284	2026-01-08 14:58:48.513285	\N	f	{"name": "Vicente Silva", "email": "fcardoso@example.org", "phone": "(061) 3129-6621", "company": "Novaes"}	82
880	46	41	Sales - A liberdade de atingir seus objetivos antes de tudo	Oportunidade com Davi Lucas Pereira da empresa Sales.\n\nConsequuntur quidem tempore. Necessitatibus corporis quod minima libero. Eaque doloribus quae occaecati dolores.	32	31787.47	BRL	2026-01-15 11:09:04.599306	2025-12-29 07:14:24.826925	-1	2026-01-08 14:58:48.513285	2026-01-08 14:58:48.513285	\N	f	{"name": "Davi Lucas Pereira", "email": "ida-rosa@example.com", "phone": "+55 21 3398 7116", "company": "Sales"}	95
881	42	40	Alana Mendes - A liberdade de mudar simplesmente	Oportunidade com Alana Mendes da empresa N/A.\n\nAccusamus officia laudantium asperiores. Repudiandae dolorem repellat quas eos voluptatibus dolor quo. Atque laboriosam libero perspiciatis soluta recusandae.	33	38467.89	BRL	2026-01-16 15:26:36.616958	\N	0	2026-01-08 14:58:48.513286	2026-01-08 14:58:48.513286	\N	f	{"name": "Alana Mendes", "email": "samuel40@example.com", "phone": "(071) 1483 9969", "company": null}	97
882	45	41	Rocha - O prazer de conseguir de maneira eficaz	Oportunidade com Ana Júlia Aragão da empresa Rocha.\n\nAut ratione doloremque nesciunt mollitia ut consequatur. Labore porro quas id culpa maiores. Ad similique nihil vitae ea.\nHic minima sit. Impedit quas debitis.	34	46988.79	BRL	2026-01-29 06:34:07.252303	2025-12-13 22:29:19.083437	1	2026-01-08 14:58:48.513286	2026-01-08 14:58:48.513287	\N	f	{"name": "Ana J\\u00falia Arag\\u00e3o", "email": "da-rochabreno@example.org", "phone": "0900-031-3663", "company": "Rocha"}	81
883	46	37	Azevedo - A liberdade de conseguir mais facilmente	Oportunidade com Dr. Alexandre Gomes da empresa Azevedo.\n\nTotam nisi iusto est adipisci recusandae nesciunt. Ullam culpa adipisci perferendis in blanditiis.\nVelit autem dolorem. Sit quos quisquam facere ullam quae quo.	35	22409.63	BRL	\N	2025-12-23 12:25:43.487909	-1	2026-01-08 14:58:48.513287	2026-01-08 14:58:48.513288	\N	f	{"name": "Dr. Alexandre Gomes", "email": "jaraujo@example.org", "phone": "(071) 1584 0012", "company": "Azevedo"}	80
884	46	37	Bianca Caldeira - O direito de conseguir simplesmente	Oportunidade com Bianca Caldeira da empresa N/A.\n\nQuia provident odio iste omnis dignissimos libero. At possimus qui adipisci esse.	36	35237.83	BRL	2026-02-18 10:50:42.89114	2025-12-22 12:26:54.603502	-1	2026-01-08 14:58:48.513288	2026-01-08 14:58:48.513288	\N	f	{"name": "Bianca Caldeira", "email": "paulomoura@example.net", "phone": "+55 (081) 9393-3955", "company": null}	79
885	46	39	Sales - O direito de ganhar com confiança	Oportunidade com Davi Lucas Pereira da empresa Sales.\n\nSuscipit mollitia aliquam iusto sint odio. Voluptatem temporibus exercitationem id laboriosam.\nRerum quos voluptate eligendi optio soluta nisi.	37	40900.76	BRL	\N	2025-12-31 06:53:49.987713	-1	2026-01-08 14:58:48.513289	2026-01-08 14:58:48.513289	\N	f	{"name": "Davi Lucas Pereira", "email": "ida-rosa@example.com", "phone": "+55 21 3398 7116", "company": "Sales"}	95
886	45	38	Viana - A vantagem de inovar de maneira eficaz	Oportunidade com Eloah Moreira da empresa Viana.\n\nNumquam accusamus dolorum esse. Iure suscipit nostrum.\nLibero facilis dignissimos incidunt inventore amet. Nesciunt esse commodi illum veritatis asperiores.	38	23509.94	BRL	\N	2026-01-04 10:02:43.097503	1	2026-01-08 14:58:48.513289	2026-01-08 14:58:48.51329	\N	f	{"name": "Eloah Moreira", "email": "oliviacostela@example.com", "phone": "+55 (084) 2365-9652", "company": "Viana"}	90
887	41	38	da Paz S/A - A certeza de inovar naturalmente	Oportunidade com Melissa Castro da empresa da Paz S/A.\n\nExpedita ipsam autem laboriosam illum. Sunt dolorum nemo.\nIpsam recusandae molestias aliquam soluta repellendus. Quam magnam impedit corporis iusto corrupti.	39	21248.72	BRL	2026-01-21 15:56:15.15949	\N	0	2026-01-08 14:58:48.51329	2026-01-08 14:58:48.513291	\N	f	{"name": "Melissa Castro", "email": "loliveira@example.com", "phone": "+55 31 5387-6746", "company": "da Paz S/A"}	93
888	44	40	Azevedo - O prazer de ganhar mais facilmente	Oportunidade com Dr. Alexandre Gomes da empresa Azevedo.\n\nSunt dolor neque repudiandae. Reiciendis a impedit amet dolores soluta quasi.\nFacere sapiente voluptates esse. Eligendi odio labore nesciunt. Necessitatibus reiciendis quas accusamus.	40	45897.33	BRL	2026-01-10 14:50:20.033249	\N	0	2026-01-08 14:58:48.513291	2026-01-08 14:58:48.513291	\N	f	{"name": "Dr. Alexandre Gomes", "email": "jaraujo@example.org", "phone": "(071) 1584 0012", "company": "Azevedo"}	80
889	44	38	Moura - O direito de mudar sem preocupação	Oportunidade com Isabella da Cunha da empresa Moura.\n\nCulpa dolor soluta voluptas id sapiente. Nemo incidunt molestiae eos magni laboriosam.\nCum minus rerum rem. Impedit vero sit maiores deserunt rerum culpa in. Occaecati nemo quaerat rem.	41	5746.40	BRL	2026-02-25 00:22:19.43247	\N	0	2026-01-08 14:58:48.513292	2026-01-08 14:58:48.513292	\N	f	{"name": "Isabella da Cunha", "email": "pedro-lucaslima@example.org", "phone": "(021) 6602 0033", "company": "Moura"}	92
890	42	41	Farias - EI - A liberdade de mudar naturalmente	Oportunidade com Erick Ramos da empresa Farias - EI.\n\nVero eius ab pariatur animi. Rerum culpa tenetur veniam repudiandae ex magni dolores.	42	13806.06	BRL	\N	\N	0	2026-01-08 14:58:48.513292	2026-01-08 14:58:48.513293	\N	f	{"name": "Erick Ramos", "email": "nathan63@example.com", "phone": "+55 (061) 9804 6904", "company": "Farias - EI"}	84
891	41	41	Jesus - A vantagem de ganhar de maneira eficaz	Oportunidade com Murilo Moraes da empresa Jesus.\n\nDolor sequi debitis. Voluptates nihil eos voluptate. Autem ipsam eaque reiciendis libero doloribus. Rem ad explicabo adipisci voluptatum.\nSunt nisi quos labore.	43	36603.83	BRL	2026-02-25 06:23:47.099714	\N	0	2026-01-08 14:58:48.513293	2026-01-08 14:58:48.513293	\N	f	{"name": "Murilo Moraes", "email": "melissa18@example.org", "phone": "(084) 3136 3950", "company": "Jesus"}	86
892	44	39	Benício Vieira - A segurança de atingir seus objetivos mais facilmente	Oportunidade com Benício Vieira da empresa N/A.\n\nOmnis vitae vero ipsum veniam. Veritatis blanditiis eos laudantium sunt nesciunt.	44	8377.31	BRL	2026-02-16 23:29:29.731621	\N	0	2026-01-08 14:58:48.513294	2026-01-08 14:58:48.513294	\N	f	{"name": "Ben\\u00edcio Vieira", "email": "erodrigues@example.net", "phone": "61 7676-3273", "company": null}	91
893	46	37	Alana Mendes - A liberdade de evoluir antes de tudo	Oportunidade com Alana Mendes da empresa N/A.\n\nInventore numquam nesciunt facere. Ipsa corrupti cupiditate minus.\nAliquid laboriosam blanditiis fugiat quidem quia porro. Ipsam corrupti autem labore amet fugiat suscipit. Ut soluta fuga quis.	45	22825.68	BRL	2026-02-23 02:46:07.784853	2025-12-21 13:52:41.896523	-1	2026-01-08 14:58:48.513295	2026-01-08 14:58:48.513295	\N	f	{"name": "Alana Mendes", "email": "samuel40@example.com", "phone": "(071) 1483 9969", "company": null}	97
894	45	38	da Paz S/A - A arte de inovar mais rapidamente	Oportunidade com Melissa Castro da empresa da Paz S/A.\n\nNon laudantium dolore quas laudantium in omnis. Dolor vitae occaecati occaecati porro reiciendis. Esse ut animi.	46	37417.91	BRL	2026-02-27 14:59:45.626801	2026-01-06 22:37:00.796084	1	2026-01-08 14:58:48.513295	2026-01-08 14:58:48.513295	\N	f	{"name": "Melissa Castro", "email": "loliveira@example.com", "phone": "+55 31 5387-6746", "company": "da Paz S/A"}	93
895	45	37	Viana - O prazer de evoluir direto da fonte	Oportunidade com Eloah Moreira da empresa Viana.\n\nAssumenda vitae hic culpa tempora. Hic omnis dicta.	47	10419.11	BRL	2026-01-16 10:44:15.937546	2025-12-30 00:08:34.371882	1	2026-01-08 14:58:48.513296	2026-01-08 14:58:48.513296	\N	f	{"name": "Eloah Moreira", "email": "oliviacostela@example.com", "phone": "+55 (084) 2365-9652", "company": "Viana"}	90
896	46	41	Farias - EI - A liberdade de realizar seus sonhos direto da fonte	Oportunidade com Erick Ramos da empresa Farias - EI.\n\nFacilis quaerat maiores molestias autem doloremque sapiente. Tempore atque tempora quos laudantium id.\nLaudantium officiis nihil placeat facilis. Ullam earum repellendus voluptatibus asperiores ipsa.	48	43431.42	BRL	2026-01-13 12:25:36.663025	2026-01-06 21:17:31.190568	-1	2026-01-08 14:58:48.513297	2026-01-08 14:58:48.513297	\N	f	{"name": "Erick Ramos", "email": "nathan63@example.com", "phone": "+55 (061) 9804 6904", "company": "Farias - EI"}	84
897	49	41	da Paz S/A - O poder de ganhar com toda a tranquilidade	Oportunidade com Melissa Castro da empresa da Paz S/A.\n\nModi cupiditate dolorum. Porro alias earum officia similique maiores atque.\nDolor earum porro officia non iure assumenda. Praesentium dignissimos nulla libero impedit reprehenderit.	0	49990.60	BRL	2026-02-21 05:35:50.964437	\N	0	2026-01-08 14:58:50.19767	2026-01-08 14:58:50.197673	\N	f	{"name": "Melissa Castro", "email": "loliveira@example.com", "phone": "+55 31 5387-6746", "company": "da Paz S/A"}	93
898	47	40	Moura - A segurança de inovar com toda a tranquilidade	Oportunidade com Isabella da Cunha da empresa Moura.\n\nLaboriosam id soluta nam. Hic nisi laboriosam iure eveniet consequuntur accusamus.\nExcepturi numquam expedita ad.\nSoluta eligendi labore doloremque sint quibusdam.	1	17560.58	BRL	\N	\N	0	2026-01-08 14:58:50.197674	2026-01-08 14:58:50.197674	\N	f	{"name": "Isabella da Cunha", "email": "pedro-lucaslima@example.org", "phone": "(021) 6602 0033", "company": "Moura"}	92
899	48	38	Moura - A possibilidade de evoluir mais facilmente	Oportunidade com Isabella da Cunha da empresa Moura.\n\nDelectus consectetur adipisci nostrum nesciunt voluptates perferendis. Culpa dolor voluptatum labore enim.	2	45478.30	BRL	\N	\N	0	2026-01-08 14:58:50.197674	2026-01-08 14:58:50.197675	\N	f	{"name": "Isabella da Cunha", "email": "pedro-lucaslima@example.org", "phone": "(021) 6602 0033", "company": "Moura"}	92
900	48	39	Rocha - A segurança de mudar naturalmente	Oportunidade com Ana Júlia Aragão da empresa Rocha.\n\nCupiditate eaque quibusdam repellat velit reprehenderit. Modi libero laudantium eos praesentium odio veniam qui. Hic nihil illum porro officiis.	3	30978.72	BRL	\N	\N	0	2026-01-08 14:58:50.197675	2026-01-08 14:58:50.197675	\N	f	{"name": "Ana J\\u00falia Arag\\u00e3o", "email": "da-rochabreno@example.org", "phone": "0900-031-3663", "company": "Rocha"}	81
901	48	41	Bianca Caldeira - A possibilidade de mudar naturalmente	Oportunidade com Bianca Caldeira da empresa N/A.\n\nCupiditate eaque expedita dignissimos expedita aspernatur. Quis inventore explicabo cumque enim aliquid.\nPariatur nisi illo iure commodi necessitatibus. Suscipit totam libero cumque assumenda ex eos.	4	31146.22	BRL	2026-01-10 08:16:52.404851	\N	0	2026-01-08 14:58:50.197676	2026-01-08 14:58:50.197676	\N	f	{"name": "Bianca Caldeira", "email": "paulomoura@example.net", "phone": "+55 (081) 9393-3955", "company": null}	79
902	49	41	Moura - A segurança de ganhar mais rapidamente	Oportunidade com Isabella da Cunha da empresa Moura.\n\nIpsam amet numquam voluptate assumenda rem sed.\nMolestiae labore iste error esse quaerat aut omnis. Ipsum rerum excepturi at cumque cumque.	5	40405.51	BRL	2026-01-13 12:29:29.358675	\N	0	2026-01-08 14:58:50.197676	2026-01-08 14:58:50.197676	\N	f	{"name": "Isabella da Cunha", "email": "pedro-lucaslima@example.org", "phone": "(021) 6602 0033", "company": "Moura"}	92
903	50	41	Nogueira - A liberdade de inovar antes de tudo	Oportunidade com Ana Julia Costela da empresa Nogueira.\n\nLibero illum accusamus sunt iure quis.\nUt sint tempore iusto consectetur. Quod sunt soluta consequatur totam tenetur.	6	19936.36	BRL	2026-02-07 22:46:03.330452	2026-01-07 16:02:16.306051	1	2026-01-08 14:58:50.197677	2026-01-08 14:58:50.197677	\N	f	{"name": "Ana Julia Costela", "email": "yasmin06@example.org", "phone": "51 8009 2783", "company": "Nogueira"}	96
904	48	37	Sales - A liberdade de mudar com toda a tranquilidade	Oportunidade com Davi Lucas Pereira da empresa Sales.\n\nConsectetur asperiores assumenda quam quibusdam iure. Error fuga quia modi vel consequuntur. Labore deleniti voluptatibus modi aut.\nUnde modi corrupti. Odio dolorem cupiditate quasi eum neque a non.	7	14384.86	BRL	2026-01-19 16:24:13.208528	\N	0	2026-01-08 14:58:50.197677	2026-01-08 14:58:50.197678	\N	f	{"name": "Davi Lucas Pereira", "email": "ida-rosa@example.com", "phone": "+55 21 3398 7116", "company": "Sales"}	95
905	47	39	Lima - ME - O direito de avançar direto da fonte	Oportunidade com Calebe da Mata da empresa Lima - ME.\n\nDoloremque mollitia adipisci placeat esse. Ipsam fugit explicabo pariatur eum ducimus ipsum.	8	12429.13	BRL	2026-02-21 00:55:04.995905	\N	0	2026-01-08 14:58:50.197678	2026-01-08 14:58:50.197679	\N	f	{"name": "Calebe da Mata", "email": "agatha53@example.org", "phone": "(061) 6178 0424", "company": "Lima - ME"}	78
906	48	40	Bianca Caldeira - A certeza de realizar seus sonhos sem preocupação	Oportunidade com Bianca Caldeira da empresa N/A.\n\nCulpa ipsam consequuntur odio nulla. Quasi mollitia corporis.\nVoluptas unde dicta perferendis laudantium. Fugiat repellendus dolorem. Corrupti repellat modi nam recusandae.	9	2540.55	BRL	2026-02-17 13:10:14.050478	\N	0	2026-01-08 14:58:50.197679	2026-01-08 14:58:50.197679	\N	f	{"name": "Bianca Caldeira", "email": "paulomoura@example.net", "phone": "+55 (081) 9393-3955", "company": null}	79
907	48	41	Alana Mendes - A liberdade de concretizar seus projetos mais facilmente	Oportunidade com Alana Mendes da empresa N/A.\n\nDolore beatae eveniet non. Pariatur molestiae inventore quasi nemo quisquam. Earum possimus ratione non nihil rerum architecto deserunt.	10	38178.59	BRL	2026-01-18 23:36:06.427181	\N	0	2026-01-08 14:58:50.19768	2026-01-08 14:58:50.19768	\N	f	{"name": "Alana Mendes", "email": "samuel40@example.com", "phone": "(071) 1483 9969", "company": null}	97
908	50	40	Benício Vieira - O poder de inovar com força total	Oportunidade com Benício Vieira da empresa N/A.\n\nEius ea tempore sit eligendi. At voluptates nostrum accusamus aspernatur facilis assumenda. Tempora natus consectetur numquam.\nQuidem saepe molestias sed. Fuga ullam nemo voluptatibus.	11	35790.84	BRL	2026-02-26 06:57:21.94182	2026-01-07 03:42:15.483828	1	2026-01-08 14:58:50.197681	2026-01-08 14:58:50.197681	\N	f	{"name": "Ben\\u00edcio Vieira", "email": "erodrigues@example.net", "phone": "61 7676-3273", "company": null}	91
909	49	39	Gomes Ltda. - O prazer de mudar mais rapidamente	Oportunidade com Ana da Rocha da empresa Gomes Ltda..\n\nMolestiae deleniti totam. Illo quia aspernatur error sint expedita quas.\nVoluptatibus perferendis harum doloribus iste inventore. Alias quam blanditiis libero.	12	4716.73	BRL	\N	\N	0	2026-01-08 14:58:50.197681	2026-01-08 14:58:50.197682	\N	f	{"name": "Ana da Rocha", "email": "davi-lucasteixeira@example.org", "phone": "+55 (021) 4257-8444", "company": "Gomes Ltda."}	85
910	49	40	Viana - A certeza de evoluir naturalmente	Oportunidade com Eloah Moreira da empresa Viana.\n\nEaque laboriosam quos. Laboriosam tenetur nobis adipisci.\nIpsum animi molestiae iusto. Quas quam voluptates error. Asperiores voluptatibus non facere fugiat molestiae.	13	8501.79	BRL	\N	\N	0	2026-01-08 14:58:50.197682	2026-01-08 14:58:50.197683	\N	f	{"name": "Eloah Moreira", "email": "oliviacostela@example.com", "phone": "+55 (084) 2365-9652", "company": "Viana"}	90
911	48	37	Novaes - A vantagem de evoluir mais rapidamente	Oportunidade com Vicente Silva da empresa Novaes.\n\nQuos tempora porro laudantium provident aperiam eos. Natus voluptas esse in suscipit quos dignissimos expedita.\nConsectetur dolores maiores eos tenetur expedita. Ipsum atque praesentium.	14	49993.74	BRL	2026-01-29 07:00:32.707559	\N	0	2026-01-08 14:58:50.197683	2026-01-08 14:58:50.197684	\N	f	{"name": "Vicente Silva", "email": "fcardoso@example.org", "phone": "(061) 3129-6621", "company": "Novaes"}	82
912	50	41	Novaes - A certeza de evoluir de maneira eficaz	Oportunidade com Vicente Silva da empresa Novaes.\n\nEa occaecati rerum provident facilis. Ipsam officia animi expedita officia.	15	37897.09	BRL	\N	2026-01-04 21:50:20.206805	1	2026-01-08 14:58:50.197684	2026-01-08 14:58:50.197684	\N	f	{"name": "Vicente Silva", "email": "fcardoso@example.org", "phone": "(061) 3129-6621", "company": "Novaes"}	82
913	48	41	Bianca Caldeira - A vantagem de mudar antes de tudo	Oportunidade com Bianca Caldeira da empresa N/A.\n\nIllum ad quaerat natus aliquid quam facilis. Cum sequi voluptatem deleniti debitis vel.\nEt non facilis doloribus. In nihil expedita iusto incidunt porro ipsam quidem. Soluta corrupti magni.	16	45069.33	BRL	2026-02-26 09:10:19.487729	\N	0	2026-01-08 14:58:50.197685	2026-01-08 14:58:50.197685	\N	f	{"name": "Bianca Caldeira", "email": "paulomoura@example.net", "phone": "+55 (081) 9393-3955", "company": null}	79
914	47	39	Costa - O poder de conseguir em estado puro	Oportunidade com Calebe Rezende da empresa Costa.\n\nAmet ab perspiciatis molestias. Illo eveniet fuga illum suscipit.	17	24023.92	BRL	2026-02-25 19:42:07.988223	\N	0	2026-01-08 14:58:50.197685	2026-01-08 14:58:50.197686	\N	f	{"name": "Calebe Rezende", "email": "lsilveira@example.org", "phone": "41 2054 0084", "company": "Costa"}	83
915	49	39	Sales S.A. - O direito de avançar antes de tudo	Oportunidade com Eduarda Lima da empresa Sales S.A..\n\nAut fuga numquam possimus dolore officiis sapiente. Consequuntur quod alias voluptates.	18	21748.98	BRL	2026-03-03 16:42:44.58851	\N	0	2026-01-08 14:58:50.197686	2026-01-08 14:58:50.197686	\N	f	{"name": "Eduarda Lima", "email": "gda-cruz@example.org", "phone": "+55 41 7509 2681", "company": "Sales S.A."}	98
916	49	40	Sales S.A. - A certeza de avançar de maneira eficaz	Oportunidade com Eduarda Lima da empresa Sales S.A..\n\nAccusamus laudantium occaecati minus expedita earum eaque.\nVoluptatem ab ullam porro cum. Aut sint dolores reprehenderit. Reiciendis vel perspiciatis magnam impedit architecto adipisci.	19	31428.44	BRL	2026-03-02 13:06:40.125095	\N	0	2026-01-08 14:58:50.197687	2026-01-08 14:58:50.197687	\N	f	{"name": "Eduarda Lima", "email": "gda-cruz@example.org", "phone": "+55 41 7509 2681", "company": "Sales S.A."}	98
917	49	41	Rocha - O conforto de conseguir com toda a tranquilidade	Oportunidade com Ana Júlia Aragão da empresa Rocha.\n\nUllam ducimus sapiente incidunt. Minima aspernatur harum blanditiis nesciunt a. Impedit et ducimus distinctio sunt ex. Consequuntur quas commodi voluptatem sint aliquid enim odit.	20	6706.41	BRL	\N	\N	0	2026-01-08 14:58:50.197687	2026-01-08 14:58:50.197688	\N	f	{"name": "Ana J\\u00falia Arag\\u00e3o", "email": "da-rochabreno@example.org", "phone": "0900-031-3663", "company": "Rocha"}	81
935	53	47	Sra. Isadora Caldeira - O prazer de avançar com confiança	Oportunidade com Sra. Isadora Caldeira da empresa N/A.\n\nLaboriosam odio sit tenetur iste ipsa quod. Harum dolore non.\nTenetur ipsam laudantium error quaerat ex. Labore illo vero dignissimos quas iste.	5	8127.49	BRL	2026-01-13 18:26:04.591193	\N	0	2026-01-08 14:58:57.940958	2026-01-08 14:58:57.940958	\N	f	{"name": "Sra. Isadora Caldeira", "email": "eduarda39@example.org", "phone": "84 6135-1234", "company": null}	119
918	48	40	Azevedo - A segurança de evoluir direto da fonte	Oportunidade com Dr. Alexandre Gomes da empresa Azevedo.\n\nAperiam numquam officia veritatis porro accusantium voluptates delectus. Voluptatibus nemo occaecati minus non vero. Eligendi consequatur recusandae incidunt ducimus enim.	21	2859.96	BRL	2026-03-09 08:57:04.889004	\N	0	2026-01-08 14:58:50.197688	2026-01-08 14:58:50.197688	\N	f	{"name": "Dr. Alexandre Gomes", "email": "jaraujo@example.org", "phone": "(071) 1584 0012", "company": "Azevedo"}	80
919	47	41	Bianca Caldeira - O direito de avançar mais rapidamente	Oportunidade com Bianca Caldeira da empresa N/A.\n\nPraesentium sit facere atque. Ratione odit officiis quibusdam nesciunt provident. Expedita neque consectetur iure ea ad cumque.	22	18695.38	BRL	2026-02-11 18:13:40.349121	\N	0	2026-01-08 14:58:50.197689	2026-01-08 14:58:50.197689	\N	f	{"name": "Bianca Caldeira", "email": "paulomoura@example.net", "phone": "+55 (081) 9393-3955", "company": null}	79
920	47	38	Azevedo - O direito de conseguir de maneira eficaz	Oportunidade com Dr. Alexandre Gomes da empresa Azevedo.\n\nNeque recusandae reiciendis autem maiores minus autem. Est a ea quas.	23	9049.63	BRL	2026-02-18 09:05:10.046494	\N	0	2026-01-08 14:58:50.197689	2026-01-08 14:58:50.19769	\N	f	{"name": "Dr. Alexandre Gomes", "email": "jaraujo@example.org", "phone": "(071) 1584 0012", "company": "Azevedo"}	80
921	49	38	Costa - A simplicidade de mudar sem preocupação	Oportunidade com Calebe Rezende da empresa Costa.\n\nSapiente dolores quas sed. Sint earum animi asperiores.\nAutem doloribus earum ipsam voluptatem. Nam deserunt recusandae.	24	17348.69	BRL	\N	\N	0	2026-01-08 14:58:50.19769	2026-01-08 14:58:50.19769	\N	f	{"name": "Calebe Rezende", "email": "lsilveira@example.org", "phone": "41 2054 0084", "company": "Costa"}	83
922	47	37	Viana - O poder de conseguir mais rapidamente	Oportunidade com Eloah Moreira da empresa Viana.\n\nAliquam ratione magnam hic deleniti vitae. Sit ex perferendis suscipit temporibus delectus quibusdam soluta. Eos totam dolorum optio quos.	25	44818.12	BRL	2026-02-09 10:58:12.933553	\N	0	2026-01-08 14:58:50.197691	2026-01-08 14:58:50.197691	\N	f	{"name": "Eloah Moreira", "email": "oliviacostela@example.com", "phone": "+55 (084) 2365-9652", "company": "Viana"}	90
923	48	38	Sales - O conforto de realizar seus sonhos simplesmente	Oportunidade com Davi Lucas Pereira da empresa Sales.\n\nIpsum voluptate perferendis accusamus. Cumque ab ad sit corrupti.\nVitae cum rem culpa consequuntur voluptatem asperiores. Facilis vero voluptas esse blanditiis.	26	11275.51	BRL	\N	\N	0	2026-01-08 14:58:50.197691	2026-01-08 14:58:50.197691	\N	f	{"name": "Davi Lucas Pereira", "email": "ida-rosa@example.com", "phone": "+55 21 3398 7116", "company": "Sales"}	95
924	48	39	Novaes - A segurança de evoluir antes de tudo	Oportunidade com Vicente Silva da empresa Novaes.\n\nRepellat nostrum nulla. Provident provident nobis. Fugiat voluptates omnis eius dolorem id totam.\nRepellendus voluptas quidem dolorum quidem. Deserunt rerum quo excepturi eligendi enim.	27	30945.00	BRL	2026-03-05 18:57:34.851303	\N	0	2026-01-08 14:58:50.197692	2026-01-08 14:58:50.197692	\N	f	{"name": "Vicente Silva", "email": "fcardoso@example.org", "phone": "(061) 3129-6621", "company": "Novaes"}	82
925	48	37	Bianca Caldeira - A simplicidade de ganhar de maneira eficaz	Oportunidade com Bianca Caldeira da empresa N/A.\n\nNobis veritatis atque. Vel quod provident modi fuga.\nAutem ea similique enim. Ullam explicabo numquam accusantium cupiditate.	28	15337.34	BRL	2026-01-14 19:54:20.954868	\N	0	2026-01-08 14:58:50.197693	2026-01-08 14:58:50.197693	\N	f	{"name": "Bianca Caldeira", "email": "paulomoura@example.net", "phone": "+55 (081) 9393-3955", "company": null}	79
926	48	39	Bianca Caldeira - A vantagem de avançar simplesmente	Oportunidade com Bianca Caldeira da empresa N/A.\n\nMinus autem consequuntur veritatis corporis saepe molestiae. Nulla fugiat enim ipsa rem exercitationem.	29	31459.08	BRL	2026-02-17 19:59:27.150617	\N	0	2026-01-08 14:58:50.197693	2026-01-08 14:58:50.197693	\N	f	{"name": "Bianca Caldeira", "email": "paulomoura@example.net", "phone": "+55 (081) 9393-3955", "company": null}	79
927	49	41	da Paz S/A - O conforto de mudar com confiança	Oportunidade com Melissa Castro da empresa da Paz S/A.\n\nSunt commodi rem ducimus. Quae cum totam sit aut deserunt laboriosam. Fugiat illum esse eum quibusdam odio in minus.	30	32929.21	BRL	\N	\N	0	2026-01-08 14:58:50.197694	2026-01-08 14:58:50.197694	\N	f	{"name": "Melissa Castro", "email": "loliveira@example.com", "phone": "+55 31 5387-6746", "company": "da Paz S/A"}	93
928	50	37	Moura - A simplicidade de concretizar seus projetos de maneira eficaz	Oportunidade com Isabella da Cunha da empresa Moura.\n\nCupiditate doloribus quos quasi porro dolore cum. Odit molestias enim illo earum. Neque architecto magnam amet cumque amet architecto nam.	31	47539.03	BRL	\N	2025-12-16 13:47:07.563167	1	2026-01-08 14:58:50.197694	2026-01-08 14:58:50.197695	\N	f	{"name": "Isabella da Cunha", "email": "pedro-lucaslima@example.org", "phone": "(021) 6602 0033", "company": "Moura"}	92
929	50	38	Sales - A liberdade de inovar com toda a tranquilidade	Oportunidade com Davi Lucas Pereira da empresa Sales.\n\nAt id quisquam quo qui. Impedit laudantium perspiciatis expedita accusamus veniam iste expedita.\nAnimi ex nihil perferendis. Rem quasi ipsum.	32	9942.62	BRL	2026-02-18 23:24:48.619056	2025-12-30 23:01:29.690852	1	2026-01-08 14:58:50.197695	2026-01-08 14:58:50.197695	\N	f	{"name": "Davi Lucas Pereira", "email": "ida-rosa@example.com", "phone": "+55 21 3398 7116", "company": "Sales"}	95
930	51	46	Raul Martins - O direito de evoluir com confiança	Oportunidade com Raul Martins da empresa N/A.\n\nCum aliquam corrupti dignissimos. Aut cum voluptatibus atque iure quibusdam. Ducimus facere earum amet.	0	11147.74	BRL	2026-02-02 18:39:50.202168	\N	0	2026-01-08 14:58:57.94095	2026-01-08 14:58:57.940954	\N	f	{"name": "Raul Martins", "email": "cda-conceicao@example.com", "phone": "(021) 9161 9512", "company": null}	114
931	52	47	Dias S.A. - A possibilidade de conseguir mais rapidamente	Oportunidade com Ana Vitória Monteiro da empresa Dias S.A..\n\nVero fuga molestiae perspiciatis exercitationem soluta. Ipsa voluptatem architecto laboriosam laborum aspernatur ratione. Dolores ipsum modi.	1	20295.60	BRL	2026-02-05 15:58:29.022879	\N	0	2026-01-08 14:58:57.940955	2026-01-08 14:58:57.940955	\N	f	{"name": "Ana Vit\\u00f3ria Monteiro", "email": "bpires@example.org", "phone": "(041) 9692 3906", "company": "Dias S.A."}	106
932	51	48	Raul Martins - A certeza de avançar sem preocupação	Oportunidade com Raul Martins da empresa N/A.\n\nNecessitatibus aliquam tempore culpa laborum ex sequi numquam. Minus placeat incidunt amet libero consectetur. Occaecati perspiciatis maiores ullam.	2	20604.86	BRL	2026-02-07 12:05:32.326052	\N	0	2026-01-08 14:58:57.940956	2026-01-08 14:58:57.940956	\N	f	{"name": "Raul Martins", "email": "cda-conceicao@example.com", "phone": "(021) 9161 9512", "company": null}	114
933	56	49	Cardoso - ME - A liberdade de realizar seus sonhos com toda a tranquilidade	Oportunidade com Luiz Gustavo Costela da empresa Cardoso - ME.\n\nIncidunt voluptatibus aliquid quos ab velit. Assumenda quod eaque assumenda delectus amet doloribus. Facere quo quasi corporis ullam vitae.	3	8166.20	BRL	2026-03-07 05:40:23.243065	2025-12-19 15:25:22.719814	-1	2026-01-08 14:58:57.940957	2026-01-08 14:58:57.940957	\N	f	{"name": "Luiz Gustavo Costela", "email": "martinsmarcela@example.org", "phone": "(041) 7499-6240", "company": "Cardoso - ME"}	112
934	55	45	Mendes - A vantagem de atingir seus objetivos naturalmente	Oportunidade com Gabrielly Nogueira da empresa Mendes.\n\nQuasi laudantium eius eos illum voluptatum cumque suscipit. Deserunt doloremque vitae facilis ratione ex.\nConsequatur at exercitationem. Distinctio quaerat deserunt vitae itaque cupiditate.	4	2420.85	BRL	2026-02-04 20:42:26.406467	2026-01-05 00:09:34.750294	1	2026-01-08 14:58:57.940957	2026-01-08 14:58:57.940958	\N	f	{"name": "Gabrielly Nogueira", "email": "agatha07@example.net", "phone": "+55 (081) 2774-8427", "company": "Mendes"}	117
936	55	48	Jesus S.A. - A vantagem de concretizar seus projetos mais facilmente	Oportunidade com João Vitor Caldeira da empresa Jesus S.A..\n\nNam molestias eos. Adipisci distinctio ipsam ratione sequi.\nIste vero rerum voluptates. Enim sunt doloribus ea nesciunt accusamus esse odio. Qui magnam amet ea. Ex modi molestias sint tenetur.	6	25184.13	BRL	2026-02-24 14:05:49.293575	2025-12-12 08:03:51.566563	1	2026-01-08 14:58:57.940959	2026-01-08 14:58:57.940959	\N	f	{"name": "Jo\\u00e3o Vitor Caldeira", "email": "evelyn34@example.com", "phone": "0300-354-4948", "company": "Jesus S.A."}	102
937	56	49	Moreira - A liberdade de realizar seus sonhos mais rapidamente	Oportunidade com Calebe Ferreira da empresa Moreira.\n\nVoluptate voluptas porro quam. Ipsum dicta eligendi quos similique est qui ratione. Odio quasi repellendus totam dolores provident.	7	2926.76	BRL	\N	2025-12-26 15:43:39.155455	-1	2026-01-08 14:58:57.94096	2026-01-08 14:58:57.94096	\N	f	{"name": "Calebe Ferreira", "email": "gazevedo@example.net", "phone": "(051) 1768-4353", "company": "Moreira"}	116
938	55	46	da Conceição e Filhos - O conforto de inovar com confiança	Oportunidade com Dr. Ian Silveira da empresa da Conceição e Filhos.\n\nSed quod pariatur. Possimus tempore accusamus.\nAd temporibus dolores magnam. Hic excepturi adipisci asperiores. Alias fugit ducimus quod.	8	37176.19	BRL	2026-02-19 00:21:03.492222	2026-01-02 15:39:51.549674	1	2026-01-08 14:58:57.940961	2026-01-08 14:58:57.940961	\N	f	{"name": "Dr. Ian Silveira", "email": "ana-beatrizda-rocha@example.com", "phone": "0800 665 5413", "company": "da Concei\\u00e7\\u00e3o e Filhos"}	121
939	51	46	Raul Rezende - A possibilidade de concretizar seus projetos naturalmente	Oportunidade com Raul Rezende da empresa N/A.\n\nConsequuntur iusto blanditiis dicta est sit. Nihil debitis maxime at perspiciatis. Porro velit neque quam atque id expedita id.	9	40568.57	BRL	2026-02-28 08:55:05.153859	\N	0	2026-01-08 14:58:57.940962	2026-01-08 14:58:57.940962	\N	f	{"name": "Raul Rezende", "email": "maria-aliceporto@example.org", "phone": "+55 21 8695-3379", "company": null}	99
940	54	47	Cavalcanti Cunha - EI - A certeza de realizar seus sonhos em estado puro	Oportunidade com Henrique da Luz da empresa Cavalcanti Cunha - EI.\n\nAtque assumenda quis dolorum cum modi. Omnis voluptatum asperiores saepe eligendi.\nMinima sed molestiae fugit. A totam iure. Vitae vel optio ea eveniet repudiandae.	10	16878.27	BRL	2026-01-16 22:17:36.643911	\N	0	2026-01-08 14:58:57.940963	2026-01-08 14:58:57.940963	\N	f	{"name": "Henrique da Luz", "email": "raquel53@example.net", "phone": "(031) 5948-9608", "company": "Cavalcanti Cunha - EI"}	100
941	56	49	Cavalcanti Cunha - EI - A segurança de atingir seus objetivos simplesmente	Oportunidade com Henrique da Luz da empresa Cavalcanti Cunha - EI.\n\nVelit similique libero minima rem. Consectetur deleniti neque. Ut eos dolor illum quisquam quo dicta.	11	40355.56	BRL	\N	2026-01-01 15:37:44.77966	-1	2026-01-08 14:58:57.940963	2026-01-08 14:58:57.940964	\N	f	{"name": "Henrique da Luz", "email": "raquel53@example.net", "phone": "(031) 5948-9608", "company": "Cavalcanti Cunha - EI"}	100
942	56	45	Sra. Isadora Caldeira - A certeza de evoluir com confiança	Oportunidade com Sra. Isadora Caldeira da empresa N/A.\n\nAb consectetur voluptatibus eius. Harum accusamus amet doloribus quos.\nRepudiandae delectus aut laboriosam. Nesciunt animi eos id dolor alias.	12	34853.01	BRL	2026-03-06 08:24:30.113015	2026-01-03 01:43:17.026291	-1	2026-01-08 14:58:57.940964	2026-01-08 14:58:57.940964	\N	f	{"name": "Sra. Isadora Caldeira", "email": "eduarda39@example.org", "phone": "84 6135-1234", "company": null}	119
943	56	45	da Rocha Freitas Ltda. - A segurança de conseguir naturalmente	Oportunidade com Ana Júlia Freitas da empresa da Rocha Freitas Ltda..\n\nVero pariatur asperiores magni deleniti recusandae enim. Minus a rem odio aliquam ipsum. Doloribus fuga tempore velit distinctio maiores.	13	44733.76	BRL	\N	2025-12-28 16:10:40.704431	-1	2026-01-08 14:58:57.940965	2026-01-08 14:58:57.940965	\N	f	{"name": "Ana J\\u00falia Freitas", "email": "diego06@example.org", "phone": "84 2415-7663", "company": "da Rocha Freitas Ltda."}	118
944	53	49	Rocha - O conforto de evoluir com confiança	Oportunidade com Breno Campos da empresa Rocha.\n\nCulpa veritatis aliquam magni. Aliquam quia blanditiis nisi incidunt odio veniam.\nUt ad expedita nesciunt mollitia. Sed sed corrupti quidem adipisci.	14	37117.28	BRL	2026-01-28 23:36:44.86915	\N	0	2026-01-08 14:58:57.940966	2026-01-08 14:58:57.940966	\N	f	{"name": "Breno Campos", "email": "qribeiro@example.net", "phone": "(011) 4245 4715", "company": "Rocha"}	108
945	53	47	Lívia Mendes - A simplicidade de avançar simplesmente	Oportunidade com Lívia Mendes da empresa N/A.\n\nQuam ea in earum praesentium sequi. Fugiat voluptate ducimus illum iusto dicta quod. Natus itaque rerum ipsa amet quos suscipit. Voluptate voluptate alias.	15	12569.63	BRL	2026-02-05 04:47:43.465436	\N	0	2026-01-08 14:58:57.940967	2026-01-08 14:58:57.940967	\N	f	{"name": "L\\u00edvia Mendes", "email": "maria-cecilianogueira@example.com", "phone": "0300 872 9868", "company": null}	115
946	51	45	Dias S.A. - A possibilidade de concretizar seus projetos mais facilmente	Oportunidade com Ana Vitória Monteiro da empresa Dias S.A..\n\nOdio repudiandae ducimus quibusdam tenetur repudiandae. Repellendus nesciunt aut quas blanditiis. Ex quia impedit illum. Placeat non delectus illo laboriosam dolorum culpa.	16	10866.83	BRL	2026-02-23 11:51:39.619637	\N	0	2026-01-08 14:58:57.940968	2026-01-08 14:58:57.940968	\N	f	{"name": "Ana Vit\\u00f3ria Monteiro", "email": "bpires@example.org", "phone": "(041) 9692 3906", "company": "Dias S.A."}	106
947	53	49	Azevedo - A simplicidade de concretizar seus projetos direto da fonte	Oportunidade com Lorena Campos da empresa Azevedo.\n\nSunt voluptatibus quod vel sint quidem. Temporibus eius magnam omnis ea placeat sequi.\nTenetur vero consectetur quae aspernatur. Voluptatem rem modi. Ut eaque nihil odit sint.	17	10076.92	BRL	2026-03-08 03:50:58.251669	\N	0	2026-01-08 14:58:57.940969	2026-01-08 14:58:57.940969	\N	f	{"name": "Lorena Campos", "email": "sabrinarocha@example.net", "phone": "51 5273 8517", "company": "Azevedo"}	104
948	53	48	da Cruz S/A - O poder de concretizar seus projetos mais rapidamente	Oportunidade com Valentina Monteiro da empresa da Cruz S/A.\n\nQuas omnis quas excepturi. Tenetur dicta adipisci voluptates veniam quibusdam. Adipisci aliquid labore.	18	34114.76	BRL	2026-03-05 04:22:37.968369	\N	0	2026-01-08 14:58:57.940969	2026-01-08 14:58:57.94097	\N	f	{"name": "Valentina Monteiro", "email": "maria35@example.org", "phone": "51 9540 1414", "company": "da Cruz S/A"}	109
949	51	45	Marcela Rezende - A arte de evoluir direto da fonte	Oportunidade com Marcela Rezende da empresa N/A.\n\nA minus quasi ipsa maiores nobis nobis. Reprehenderit deleniti quos maxime debitis placeat. Tenetur minima ab ad recusandae maxime. Autem nam officia accusamus fugit sunt soluta.	19	48413.57	BRL	2026-02-10 20:09:12.505057	\N	0	2026-01-08 14:58:57.94097	2026-01-08 14:58:57.940971	\N	f	{"name": "Marcela Rezende", "email": "sda-rosa@example.org", "phone": "(061) 4997-1663", "company": null}	120
950	55	45	Azevedo - A possibilidade de realizar seus sonhos direto da fonte	Oportunidade com Lorena Campos da empresa Azevedo.\n\nSoluta nisi atque laboriosam. Omnis expedita autem minus voluptates esse. Qui accusamus molestias quod quos.	20	31878.63	BRL	2026-01-15 14:12:35.915813	2025-12-25 17:59:22.042744	1	2026-01-08 14:58:57.940971	2026-01-08 14:58:57.940972	\N	f	{"name": "Lorena Campos", "email": "sabrinarocha@example.net", "phone": "51 5273 8517", "company": "Azevedo"}	104
951	51	45	Dias S.A. - O poder de evoluir sem preocupação	Oportunidade com Ana Vitória Monteiro da empresa Dias S.A..\n\nQuos impedit nostrum quo. Quidem labore distinctio aspernatur cumque. Inventore reprehenderit esse deleniti eaque odio reiciendis.	21	46870.90	BRL	2026-02-08 05:39:54.309796	\N	0	2026-01-08 14:58:57.940972	2026-01-08 14:58:57.940973	\N	f	{"name": "Ana Vit\\u00f3ria Monteiro", "email": "bpires@example.org", "phone": "(041) 9692 3906", "company": "Dias S.A."}	106
952	51	47	Monteiro S/A - A simplicidade de ganhar sem preocupação	Oportunidade com Vitor Gabriel Jesus da empresa Monteiro S/A.\n\nDistinctio corrupti aut assumenda earum officiis. Deserunt perspiciatis exercitationem inventore magnam id dignissimos.\nSed voluptates ipsa. Culpa eaque possimus dicta illum a.	22	14633.77	BRL	2026-01-20 04:35:35.367655	\N	0	2026-01-08 14:58:57.940973	2026-01-08 14:58:57.940973	\N	f	{"name": "Vitor Gabriel Jesus", "email": "kevin50@example.net", "phone": "41 2518 2999", "company": "Monteiro S/A"}	122
953	56	47	Moreira - A vantagem de realizar seus sonhos sem preocupação	Oportunidade com Calebe Ferreira da empresa Moreira.\n\nAccusamus autem molestias error officia. Quis ipsam delectus quaerat nobis aspernatur laborum animi.\nAd nostrum ab nihil dolorem.	23	5823.94	BRL	\N	2025-12-09 17:26:31.499647	-1	2026-01-08 14:58:57.940974	2026-01-08 14:58:57.940974	\N	f	{"name": "Calebe Ferreira", "email": "gazevedo@example.net", "phone": "(051) 1768-4353", "company": "Moreira"}	116
954	55	45	Sra. Isadora Caldeira - A liberdade de ganhar com confiança	Oportunidade com Sra. Isadora Caldeira da empresa N/A.\n\nQuasi quas facere.\nInventore voluptate ipsam excepturi ab. Tempora doloribus alias omnis earum qui. Doloribus alias consequuntur tenetur cumque quas nihil perspiciatis.	24	39575.77	BRL	\N	2025-12-29 06:39:06.66179	1	2026-01-08 14:58:57.940975	2026-01-08 14:58:57.940975	\N	f	{"name": "Sra. Isadora Caldeira", "email": "eduarda39@example.org", "phone": "84 6135-1234", "company": null}	119
955	55	47	Laís Almeida - O poder de inovar naturalmente	Oportunidade com Laís Almeida da empresa N/A.\n\nUllam quo quae assumenda ipsa doloremque aliquam. Ex animi facere ducimus rem necessitatibus a.\nFacere consequatur quod suscipit amet. Nihil hic ipsum sunt distinctio.	25	27864.82	BRL	2026-02-06 10:07:07.876056	2025-12-21 11:30:49.503467	1	2026-01-08 14:58:57.940976	2026-01-08 14:58:57.940976	\N	f	{"name": "La\\u00eds Almeida", "email": "rezendemariane@example.net", "phone": "+55 (011) 0716 3626", "company": null}	113
956	55	49	Marcela Rezende - O poder de inovar mais facilmente	Oportunidade com Marcela Rezende da empresa N/A.\n\nEaque nostrum recusandae saepe id esse. Exercitationem dolor nulla esse ipsam laudantium quam. Nam voluptates explicabo voluptates harum.\nDoloribus praesentium nihil tenetur voluptate.	26	8308.75	BRL	2026-02-24 22:08:33.131753	2025-12-31 19:20:31.663249	1	2026-01-08 14:58:57.940977	2026-01-08 14:58:57.940977	\N	f	{"name": "Marcela Rezende", "email": "sda-rosa@example.org", "phone": "(061) 4997-1663", "company": null}	120
957	52	46	Dias S.A. - A vantagem de ganhar mais facilmente	Oportunidade com Ana Vitória Monteiro da empresa Dias S.A..\n\nSuscipit iste eligendi iusto praesentium odit corrupti. Repellat eos ad totam ipsam ullam molestiae. Incidunt numquam nihil reiciendis optio ducimus officia.	27	16965.21	BRL	\N	\N	0	2026-01-08 14:58:57.940978	2026-01-08 14:58:57.940978	\N	f	{"name": "Ana Vit\\u00f3ria Monteiro", "email": "bpires@example.org", "phone": "(041) 9692 3906", "company": "Dias S.A."}	106
958	51	49	Rocha - A simplicidade de conseguir mais rapidamente	Oportunidade com Breno Campos da empresa Rocha.\n\nMaiores numquam voluptate soluta iste rerum quos. Est nostrum nesciunt repellendus nobis totam aspernatur.\nEius veniam expedita incidunt corrupti. Est quo quae ex culpa.	28	15815.93	BRL	2026-01-14 01:19:43.038525	\N	0	2026-01-08 14:58:57.940979	2026-01-08 14:58:57.940979	\N	f	{"name": "Breno Campos", "email": "qribeiro@example.net", "phone": "(011) 4245 4715", "company": "Rocha"}	108
959	52	47	Dias S.A. - A vantagem de inovar em estado puro	Oportunidade com Ana Vitória Monteiro da empresa Dias S.A..\n\nDignissimos eveniet perspiciatis vero.\nRerum ducimus eius distinctio qui est. Rerum incidunt tempore error. Officiis debitis quis exercitationem.	29	7083.32	BRL	2026-02-23 15:57:49.939593	\N	0	2026-01-08 14:58:57.94098	2026-01-08 14:58:57.94098	\N	f	{"name": "Ana Vit\\u00f3ria Monteiro", "email": "bpires@example.org", "phone": "(041) 9692 3906", "company": "Dias S.A."}	106
960	52	48	da Costa S.A. - A certeza de realizar seus sonhos direto da fonte	Oportunidade com Erick Fogaça da empresa da Costa S.A..\n\nIn ducimus molestias amet eius. Sunt consequatur tempore.\nNihil vero fuga consequuntur facere perferendis numquam sed. Nisi occaecati porro molestias.	30	31288.42	BRL	2026-01-25 04:47:11.464014	\N	0	2026-01-08 14:58:57.94098	2026-01-08 14:58:57.940981	\N	f	{"name": "Erick Foga\\u00e7a", "email": "wcorreia@example.net", "phone": "(021) 6358-7099", "company": "da Costa S.A."}	105
961	55	47	Moreira - O conforto de avançar sem preocupação	Oportunidade com Calebe Ferreira da empresa Moreira.\n\nFuga hic nesciunt laboriosam voluptatem qui. Quidem magni maiores saepe. In quam beatae quis est est dolores consequuntur.\nIusto ipsa dicta repellendus.	31	33410.94	BRL	2026-01-08 17:30:33.92666	2025-12-14 14:09:19.135086	1	2026-01-08 14:58:57.940981	2026-01-08 14:58:57.940982	\N	f	{"name": "Calebe Ferreira", "email": "gazevedo@example.net", "phone": "(051) 1768-4353", "company": "Moreira"}	116
962	54	46	Dias S.A. - O conforto de ganhar direto da fonte	Oportunidade com Ana Vitória Monteiro da empresa Dias S.A..\n\nInventore possimus asperiores fugiat occaecati. Dolore eaque deleniti ratione iure ex libero. Hic iste optio commodi quasi optio cum.	32	41406.30	BRL	\N	\N	0	2026-01-08 14:58:57.940982	2026-01-08 14:58:57.940983	\N	f	{"name": "Ana Vit\\u00f3ria Monteiro", "email": "bpires@example.org", "phone": "(041) 9692 3906", "company": "Dias S.A."}	106
963	51	45	Azevedo - A certeza de atingir seus objetivos mais rapidamente	Oportunidade com Lorena Campos da empresa Azevedo.\n\nQuibusdam ipsam voluptate nostrum facilis odio. Dignissimos optio fuga eaque possimus. Nihil optio consequuntur unde.	33	36254.39	BRL	2026-02-06 22:17:01.00474	\N	0	2026-01-08 14:58:57.940983	2026-01-08 14:58:57.940983	\N	f	{"name": "Lorena Campos", "email": "sabrinarocha@example.net", "phone": "51 5273 8517", "company": "Azevedo"}	104
964	53	48	Lívia Mendes - A certeza de inovar simplesmente	Oportunidade com Lívia Mendes da empresa N/A.\n\nNisi ea sint dignissimos repellat delectus inventore. Ipsum dolorum iste non soluta magni blanditiis. Tempora at perferendis saepe provident itaque assumenda.	34	29439.57	BRL	2026-03-02 23:09:28.972033	\N	0	2026-01-08 14:58:57.940984	2026-01-08 14:58:57.940984	\N	f	{"name": "L\\u00edvia Mendes", "email": "maria-cecilianogueira@example.com", "phone": "0300 872 9868", "company": null}	115
965	56	46	Raul Martins - A liberdade de realizar seus sonhos antes de tudo	Oportunidade com Raul Martins da empresa N/A.\n\nOfficiis beatae quos voluptas aut. Architecto labore suscipit unde exercitationem.	35	34982.10	BRL	2026-02-05 04:41:33.178752	2025-12-26 15:51:12.709273	-1	2026-01-08 14:58:57.940985	2026-01-08 14:58:57.940985	\N	f	{"name": "Raul Martins", "email": "cda-conceicao@example.com", "phone": "(021) 9161 9512", "company": null}	114
966	57	47	Mendes - A arte de evoluir simplesmente	Oportunidade com Gabrielly Nogueira da empresa Mendes.\n\nOdit eos explicabo voluptatibus. Expedita laborum inventore natus cum eveniet. Magnam explicabo sapiente. Fugit dolorem doloribus quod.	0	24362.89	BRL	\N	\N	0	2026-01-08 14:59:00.199001	2026-01-08 14:59:00.199005	\N	f	{"name": "Gabrielly Nogueira", "email": "agatha07@example.net", "phone": "+55 (081) 2774-8427", "company": "Mendes"}	117
967	60	49	da Cruz S/A - O conforto de inovar mais facilmente	Oportunidade com Valentina Monteiro da empresa da Cruz S/A.\n\nOptio possimus voluptates cumque doloribus quam. Id quia non perferendis vitae. Culpa numquam ratione consequuntur assumenda iure neque.	1	20873.01	BRL	2026-01-10 22:26:39.549298	2026-01-07 08:14:11.118476	1	2026-01-08 14:59:00.199006	2026-01-08 14:59:00.199006	\N	f	{"name": "Valentina Monteiro", "email": "maria35@example.org", "phone": "51 9540 1414", "company": "da Cruz S/A"}	109
968	58	45	Azevedo - O prazer de inovar com toda a tranquilidade	Oportunidade com Lorena Campos da empresa Azevedo.\n\nIpsum ea tenetur quasi et magni. Non distinctio assumenda possimus hic debitis. Eius velit enim neque doloribus voluptatem dolor.	2	41257.06	BRL	2026-02-28 17:12:44.037612	\N	0	2026-01-08 14:59:00.199006	2026-01-08 14:59:00.199007	\N	f	{"name": "Lorena Campos", "email": "sabrinarocha@example.net", "phone": "51 5273 8517", "company": "Azevedo"}	104
969	58	49	da Costa S.A. - A simplicidade de conseguir de maneira eficaz	Oportunidade com Erick Fogaça da empresa da Costa S.A..\n\nMolestiae consequatur sed optio nulla explicabo. Alias delectus similique fuga molestiae expedita molestiae laudantium.	3	19510.21	BRL	2026-03-06 21:47:22.629632	\N	0	2026-01-08 14:59:00.199007	2026-01-08 14:59:00.199007	\N	f	{"name": "Erick Foga\\u00e7a", "email": "wcorreia@example.net", "phone": "(021) 6358-7099", "company": "da Costa S.A."}	105
970	60	46	Monteiro S/A - A arte de mudar com toda a tranquilidade	Oportunidade com Vitor Gabriel Jesus da empresa Monteiro S/A.\n\nTemporibus repudiandae consequatur ea ut. Accusamus perspiciatis autem.\nIn dignissimos quia quisquam quisquam fugit. Magnam quasi sint ipsam ut corporis ducimus. Et cupiditate dolore accusamus.	4	22212.00	BRL	2026-02-02 14:04:28.814359	2025-12-28 19:25:08.062036	1	2026-01-08 14:59:00.199008	2026-01-08 14:59:00.199008	\N	f	{"name": "Vitor Gabriel Jesus", "email": "kevin50@example.net", "phone": "41 2518 2999", "company": "Monteiro S/A"}	122
971	57	48	Raul Rezende - A possibilidade de conseguir mais facilmente	Oportunidade com Raul Rezende da empresa N/A.\n\nDistinctio qui ut earum est numquam. In et eaque minus.\nMagnam debitis temporibus veritatis voluptatem nam quasi est. Architecto ad ea quasi eligendi. Molestias odit debitis ipsum alias illum.	5	32635.32	BRL	2026-02-01 05:53:57.587179	\N	0	2026-01-08 14:59:00.199009	2026-01-08 14:59:00.199009	\N	f	{"name": "Raul Rezende", "email": "maria-aliceporto@example.org", "phone": "+55 21 8695-3379", "company": null}	99
972	58	49	Moreira - O conforto de inovar antes de tudo	Oportunidade com Calebe Ferreira da empresa Moreira.\n\nVoluptates maxime facere facere sit dolores et vel. Quo repellat vero perferendis numquam. Sunt sed odit.	6	32153.51	BRL	\N	\N	0	2026-01-08 14:59:00.199009	2026-01-08 14:59:00.199009	\N	f	{"name": "Calebe Ferreira", "email": "gazevedo@example.net", "phone": "(051) 1768-4353", "company": "Moreira"}	116
973	58	45	Jesus S.A. - O poder de conseguir com confiança	Oportunidade com João Vitor Caldeira da empresa Jesus S.A..\n\nIn assumenda voluptas nisi fuga. Occaecati facere porro odio reprehenderit placeat. Sed excepturi expedita maxime ipsum delectus. Cumque rem ea quis cum porro et.	7	1894.41	BRL	\N	\N	0	2026-01-08 14:59:00.19901	2026-01-08 14:59:00.19901	\N	f	{"name": "Jo\\u00e3o Vitor Caldeira", "email": "evelyn34@example.com", "phone": "0300-354-4948", "company": "Jesus S.A."}	102
974	59	46	Cardoso - ME - A segurança de evoluir sem preocupação	Oportunidade com Luiz Gustavo Costela da empresa Cardoso - ME.\n\nAliquid optio voluptate nihil recusandae ea. Ipsa rem sint cumque quod maxime. Incidunt cum tempora tenetur voluptas accusamus.	8	34301.48	BRL	2026-03-04 06:54:20.694371	\N	0	2026-01-08 14:59:00.199011	2026-01-08 14:59:00.199011	\N	f	{"name": "Luiz Gustavo Costela", "email": "martinsmarcela@example.org", "phone": "(041) 7499-6240", "company": "Cardoso - ME"}	112
975	57	45	Cavalcanti Cunha - EI - O prazer de inovar naturalmente	Oportunidade com Henrique da Luz da empresa Cavalcanti Cunha - EI.\n\nAperiam repellat exercitationem minima tempora. Veritatis corporis maiores illo. Eius dolores ut.\nExpedita unde consectetur nisi. Saepe repellendus voluptas.	9	48304.79	BRL	2026-01-31 15:38:54.852208	\N	0	2026-01-08 14:59:00.199011	2026-01-08 14:59:00.199012	\N	f	{"name": "Henrique da Luz", "email": "raquel53@example.net", "phone": "(031) 5948-9608", "company": "Cavalcanti Cunha - EI"}	100
976	59	49	Cardoso - A arte de ganhar com confiança	Oportunidade com Alexia Caldeira da empresa Cardoso.\n\nQuos dolorem id officiis impedit magnam architecto. Assumenda occaecati culpa dignissimos facere maxime.\nAliquid amet vel earum. Dolorem minus sunt dolorum. Officiis est hic maxime consequatur.	10	30030.45	BRL	2026-02-02 10:36:20.387446	\N	0	2026-01-08 14:59:00.199012	2026-01-08 14:59:00.199012	\N	f	{"name": "Alexia Caldeira", "email": "jsales@example.org", "phone": "+55 84 6151-2303", "company": "Cardoso"}	101
977	59	47	Rocha - A liberdade de concretizar seus projetos mais rapidamente	Oportunidade com Breno Campos da empresa Rocha.\n\nMaxime voluptates temporibus maxime eveniet ab ut quidem. Distinctio neque dolorum nam in expedita et voluptatum. Voluptatum dicta sunt.\nDeleniti ut excepturi culpa. Aliquam ad quia.	11	17680.72	BRL	\N	\N	0	2026-01-08 14:59:00.199013	2026-01-08 14:59:00.199013	\N	f	{"name": "Breno Campos", "email": "qribeiro@example.net", "phone": "(011) 4245 4715", "company": "Rocha"}	108
978	58	49	Campos - O poder de evoluir com força total	Oportunidade com Dra. Ana Sophia da Cunha da empresa Campos.\n\nIllo similique repellendus nam nihil a ratione ipsa.\nOdit illum aliquam nobis optio delectus.\nNihil laudantium ducimus numquam maiores quos.	12	37494.74	BRL	2026-02-06 05:35:32.11389	\N	0	2026-01-08 14:59:00.199014	2026-01-08 14:59:00.199014	\N	f	{"name": "Dra. Ana Sophia da Cunha", "email": "guilhermeporto@example.com", "phone": "(084) 9350 7934", "company": "Campos"}	103
979	57	48	Sra. Isadora Caldeira - A vantagem de realizar seus sonhos naturalmente	Oportunidade com Sra. Isadora Caldeira da empresa N/A.\n\nPerferendis porro recusandae facere. Commodi deleniti temporibus reprehenderit laborum eum voluptas.\nDistinctio non alias natus quasi. Voluptatum veritatis minus minima voluptates odit labore.	13	44955.76	BRL	2026-01-20 18:39:18.929313	\N	0	2026-01-08 14:59:00.199014	2026-01-08 14:59:00.199015	\N	f	{"name": "Sra. Isadora Caldeira", "email": "eduarda39@example.org", "phone": "84 6135-1234", "company": null}	119
980	60	46	Laís Almeida - A arte de mudar com toda a tranquilidade	Oportunidade com Laís Almeida da empresa N/A.\n\nConsectetur ut veniam velit esse asperiores molestiae. Expedita odit perferendis consequuntur totam.	14	13776.65	BRL	2026-01-16 22:26:32.607036	2025-12-21 10:59:21.189463	1	2026-01-08 14:59:00.199015	2026-01-08 14:59:00.199015	\N	f	{"name": "La\\u00eds Almeida", "email": "rezendemariane@example.net", "phone": "+55 (011) 0716 3626", "company": null}	113
981	57	49	Moreira - O poder de realizar seus sonhos com toda a tranquilidade	Oportunidade com Calebe Ferreira da empresa Moreira.\n\nItaque cumque temporibus voluptatibus.\nMinima architecto voluptatem repellendus harum eius quibusdam. Necessitatibus quas necessitatibus provident.	15	34864.12	BRL	\N	\N	0	2026-01-08 14:59:00.199016	2026-01-08 14:59:00.199016	\N	f	{"name": "Calebe Ferreira", "email": "gazevedo@example.net", "phone": "(051) 1768-4353", "company": "Moreira"}	116
982	58	46	Lívia Mendes - O direito de evoluir naturalmente	Oportunidade com Lívia Mendes da empresa N/A.\n\nAb cum minima. Ipsum numquam ipsam labore maxime provident inventore. Dolor occaecati neque amet dolore.\nNihil ad natus laudantium dignissimos inventore. Commodi incidunt illo ea incidunt.	16	31214.10	BRL	2026-01-11 17:38:15.809256	\N	0	2026-01-08 14:59:00.199017	2026-01-08 14:59:00.199017	\N	f	{"name": "L\\u00edvia Mendes", "email": "maria-cecilianogueira@example.com", "phone": "0300 872 9868", "company": null}	115
983	59	47	Cavalcanti Cunha - EI - O poder de inovar naturalmente	Oportunidade com Henrique da Luz da empresa Cavalcanti Cunha - EI.\n\nEius labore rem vitae provident veritatis maiores. Dolorum ipsam veritatis totam officiis optio dolore illo. Error fugit laboriosam incidunt incidunt.	17	31620.97	BRL	2026-02-19 14:18:43.332184	\N	0	2026-01-08 14:59:00.199017	2026-01-08 14:59:00.199017	\N	f	{"name": "Henrique da Luz", "email": "raquel53@example.net", "phone": "(031) 5948-9608", "company": "Cavalcanti Cunha - EI"}	100
984	59	46	Marcela Rezende - O poder de concretizar seus projetos mais rapidamente	Oportunidade com Marcela Rezende da empresa N/A.\n\nRecusandae id dolorem hic error facilis expedita quia. Aut vel et nemo perferendis eos nulla cumque. Error sint inventore atque iure commodi libero.\nAdipisci dolore commodi assumenda. Nobis illo aut.	18	31391.68	BRL	2026-02-04 04:15:38.392065	\N	0	2026-01-08 14:59:00.199018	2026-01-08 14:59:00.199018	\N	f	{"name": "Marcela Rezende", "email": "sda-rosa@example.org", "phone": "(061) 4997-1663", "company": null}	120
985	58	48	Azevedo - A vantagem de concretizar seus projetos com força total	Oportunidade com Lorena Campos da empresa Azevedo.\n\nPerspiciatis deleniti exercitationem hic neque. Nostrum in amet ratione consectetur earum nam earum.	19	3656.15	BRL	\N	\N	0	2026-01-08 14:59:00.199018	2026-01-08 14:59:00.199019	\N	f	{"name": "Lorena Campos", "email": "sabrinarocha@example.net", "phone": "51 5273 8517", "company": "Azevedo"}	104
986	60	46	da Cruz S/A - A possibilidade de evoluir mais facilmente	Oportunidade com Valentina Monteiro da empresa da Cruz S/A.\n\nOccaecati asperiores harum neque commodi. Consequatur nobis mollitia beatae dolor quae. Nostrum quo quod quia.	20	1789.69	BRL	\N	2026-01-05 07:03:30.321479	1	2026-01-08 14:59:00.199019	2026-01-08 14:59:00.199019	\N	f	{"name": "Valentina Monteiro", "email": "maria35@example.org", "phone": "51 9540 1414", "company": "da Cruz S/A"}	109
987	58	46	Cardoso - ME - A certeza de realizar seus sonhos com confiança	Oportunidade com Luiz Gustavo Costela da empresa Cardoso - ME.\n\nUt repudiandae tempora. Iste illo rerum inventore deserunt ducimus autem. Et dicta ratione.	21	7889.66	BRL	2026-02-20 09:15:00.344224	\N	0	2026-01-08 14:59:00.19902	2026-01-08 14:59:00.19902	\N	f	{"name": "Luiz Gustavo Costela", "email": "martinsmarcela@example.org", "phone": "(041) 7499-6240", "company": "Cardoso - ME"}	112
988	57	45	da Rocha Freitas Ltda. - A arte de concretizar seus projetos de maneira eficaz	Oportunidade com Ana Júlia Freitas da empresa da Rocha Freitas Ltda..\n\nUnde asperiores sequi repellendus. Consectetur iste exercitationem molestias quisquam. Corporis blanditiis nobis. Sapiente laudantium aperiam eligendi dolor dicta natus veritatis.	22	46300.73	BRL	2026-02-23 19:52:13.382651	\N	0	2026-01-08 14:59:00.19902	2026-01-08 14:59:00.199021	\N	f	{"name": "Ana J\\u00falia Freitas", "email": "diego06@example.org", "phone": "84 2415-7663", "company": "da Rocha Freitas Ltda."}	118
989	60	48	Raul Rezende - A possibilidade de conseguir com força total	Oportunidade com Raul Rezende da empresa N/A.\n\nIpsa sit eligendi fugiat. Pariatur minima aut nulla quidem. Doloribus distinctio illo placeat modi voluptatibus numquam.	23	18814.08	BRL	\N	2026-01-05 23:53:43.921468	1	2026-01-08 14:59:00.199021	2026-01-08 14:59:00.199021	\N	f	{"name": "Raul Rezende", "email": "maria-aliceporto@example.org", "phone": "+55 21 8695-3379", "company": null}	99
990	59	48	Monteiro S/A - A simplicidade de conseguir direto da fonte	Oportunidade com Vitor Gabriel Jesus da empresa Monteiro S/A.\n\nAlias perspiciatis perferendis. Eligendi minus expedita. Autem deserunt quibusdam omnis tempora odit. Hic eaque repellendus optio.	24	26625.56	BRL	2026-02-04 06:22:20.601756	\N	0	2026-01-08 14:59:00.199022	2026-01-08 14:59:00.199022	\N	f	{"name": "Vitor Gabriel Jesus", "email": "kevin50@example.net", "phone": "41 2518 2999", "company": "Monteiro S/A"}	122
991	59	45	Moreira - A arte de atingir seus objetivos mais facilmente	Oportunidade com Calebe Ferreira da empresa Moreira.\n\nLaborum repudiandae accusamus maiores expedita. Enim occaecati hic ad distinctio deleniti sit. Cumque consequuntur ex. Veniam tenetur occaecati itaque.	25	38443.90	BRL	2026-01-14 15:37:08.743604	\N	0	2026-01-08 14:59:00.199022	2026-01-08 14:59:00.199023	\N	f	{"name": "Calebe Ferreira", "email": "gazevedo@example.net", "phone": "(051) 1768-4353", "company": "Moreira"}	116
992	57	45	da Conceição e Filhos - O conforto de conseguir sem preocupação	Oportunidade com Dr. Ian Silveira da empresa da Conceição e Filhos.\n\nPlaceat fugiat unde itaque optio totam. Odit dolorum dolores. Libero fuga sunt quos molestiae delectus omnis.\nPariatur commodi aperiam similique. Impedit vel mollitia neque autem atque.	26	45121.77	BRL	2026-02-01 04:00:38.945021	\N	0	2026-01-08 14:59:00.199023	2026-01-08 14:59:00.199023	\N	f	{"name": "Dr. Ian Silveira", "email": "ana-beatrizda-rocha@example.com", "phone": "0800 665 5413", "company": "da Concei\\u00e7\\u00e3o e Filhos"}	121
993	59	46	Alves - A segurança de ganhar em estado puro	Oportunidade com Sr. Lucca Pires da empresa Alves.\n\nPlaceat sit ratione quidem. Officia quos quidem aspernatur dicta atque in dolor. Molestiae optio eligendi repudiandae iusto dignissimos.	27	48592.58	BRL	2026-03-01 18:26:45.273433	\N	0	2026-01-08 14:59:00.199024	2026-01-08 14:59:00.199024	\N	f	{"name": "Sr. Lucca Pires", "email": "lorenzo88@example.net", "phone": "+55 (021) 8737-1069", "company": "Alves"}	110
994	57	47	Campos - A vantagem de evoluir mais rapidamente	Oportunidade com Dra. Ana Sophia da Cunha da empresa Campos.\n\nVel maxime incidunt quasi molestiae beatae vitae. Consequatur molestiae possimus cum dignissimos accusamus excepturi eum.	28	15820.34	BRL	2026-02-19 15:18:25.364642	\N	0	2026-01-08 14:59:00.199024	2026-01-08 14:59:00.199024	\N	f	{"name": "Dra. Ana Sophia da Cunha", "email": "guilhermeporto@example.com", "phone": "(084) 9350 7934", "company": "Campos"}	103
995	59	47	Lívia Mendes - A arte de atingir seus objetivos naturalmente	Oportunidade com Lívia Mendes da empresa N/A.\n\nRerum quia tempore labore tenetur. Nihil sed quibusdam corrupti totam consequuntur repellendus quasi.\nDoloribus suscipit suscipit et iusto. Doloremque quia pariatur magnam ad magnam pariatur atque.	29	41094.18	BRL	2026-01-26 09:02:58.188948	\N	0	2026-01-08 14:59:00.199025	2026-01-08 14:59:00.199025	\N	f	{"name": "L\\u00edvia Mendes", "email": "maria-cecilianogueira@example.com", "phone": "0300 872 9868", "company": null}	115
996	59	47	Barros Moreira S/A - O direito de avançar simplesmente	Oportunidade com Lucas Moraes da empresa Barros Moreira S/A.\n\nAccusantium veniam dolorem mollitia animi harum. Maxime dolorem suscipit ratione debitis. Ea labore labore neque. Nulla accusamus doloribus aperiam.	30	41366.09	BRL	\N	\N	0	2026-01-08 14:59:00.199026	2026-01-08 14:59:00.199026	\N	f	{"name": "Lucas Moraes", "email": "joao-vitorsales@example.com", "phone": "+55 71 7809-9984", "company": "Barros Moreira S/A"}	111
997	59	46	Monteiro S/A - O conforto de mudar com toda a tranquilidade	Oportunidade com Vitor Gabriel Jesus da empresa Monteiro S/A.\n\nSaepe iusto praesentium reiciendis ipsum doloribus accusamus unde. Illum rerum inventore ipsum totam.\nQuo optio corporis. Asperiores quas ad qui mollitia eaque.	31	25649.07	BRL	2026-02-18 12:14:11.624532	\N	0	2026-01-08 14:59:00.199026	2026-01-08 14:59:00.199026	\N	f	{"name": "Vitor Gabriel Jesus", "email": "kevin50@example.net", "phone": "41 2518 2999", "company": "Monteiro S/A"}	122
998	60	49	Raul Rezende - O direito de realizar seus sonhos simplesmente	Oportunidade com Raul Rezende da empresa N/A.\n\nNecessitatibus maiores eligendi sequi veritatis accusantium. Doloremque ratione ipsam fuga.	32	38041.70	BRL	2026-01-18 10:51:07.606571	2025-12-31 18:08:48.064324	1	2026-01-08 14:59:00.199027	2026-01-08 14:59:00.199027	\N	f	{"name": "Raul Rezende", "email": "maria-aliceporto@example.org", "phone": "+55 21 8695-3379", "company": null}	99
999	57	47	Barros Moreira S/A - O poder de realizar seus sonhos com força total	Oportunidade com Lucas Moraes da empresa Barros Moreira S/A.\n\nMollitia blanditiis praesentium quidem blanditiis odit perferendis. Minus iste asperiores eum.\nNostrum dolores porro alias distinctio eaque incidunt. Eos ut modi asperiores sequi dolores.	33	42936.77	BRL	\N	\N	0	2026-01-08 14:59:00.199028	2026-01-08 14:59:00.199028	\N	f	{"name": "Lucas Moraes", "email": "joao-vitorsales@example.com", "phone": "+55 71 7809-9984", "company": "Barros Moreira S/A"}	111
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.clients (id, account_id, name, email, phone, company_name, document, address, city, state, country, website, notes, source, is_active, created_at, updated_at, deleted_at, is_deleted) FROM stdin;
1	1	Valentina da Luz	vitor-hugo52@example.net	31 6377 8875	Almeida	32.597.418/0001-14	Pátio Luiz Otávio Nogueira, 65	da Mota do Oeste	RO	Brasil	http://www.gomes.com/	\N	manual	t	2026-01-08 14:57:00.165437+00	2026-01-08 14:57:00.165453+00	\N	f
2	1	Sra. Bárbara Pereira	nmoura@example.org	(081) 9363-9102	Porto	68.930.127/0001-43	Condomínio Farias, 443	Campos de Gomes	SE	Brasil	http://www.rodrigues.br/	\N	manual	t	2026-01-08 14:57:00.165454+00	2026-01-08 14:57:00.165455+00	\N	f
3	1	João Lima	zalmeida@example.com	+55 (021) 7677 1706	da Rosa	82.945.710/0001-59	Aeroporto de Rodrigues, 14	Peixoto	GO	Brasil	https://da.br/	\N	manual	t	2026-01-08 14:57:00.165455+00	2026-01-08 14:57:00.165455+00	\N	f
4	1	Sr. Henrique Teixeira	xoliveira@example.com	(081) 2824 8641	da Costa	94.051.623/0001-37	Alameda Pinto, 40	Farias do Sul	ES	Brasil	https://www.fernandes.com/	\N	manual	t	2026-01-08 14:57:00.165456+00	2026-01-08 14:57:00.165456+00	\N	f
5	1	Enzo Gabriel da Cruz	luiz-feliperodrigues@example.net	+55 11 3224 4261	\N	731.402.658-08	Favela de da Costa	Dias da Serra	SC	Brasil	\N	\N	manual	t	2026-01-08 14:57:00.165456+00	2026-01-08 14:57:00.165457+00	\N	f
6	1	Dra. Olivia da Rocha	piresheloisa@example.net	51 3653 1563	Pinto - ME	09.415.268/0001-69	Lagoa Nunes, 18	da Conceição	SP	Brasil	https://www.araujo.org/	Maiores id fugit iure ducimus corporis fugit repudiandae. Accusantium modi suscipit temporibus.\nDicta dicta beatae aperiam voluptatibus quae iusto. Quae natus eligendi labore saepe ipsa nihil sint.	manual	t	2026-01-08 14:57:00.165457+00	2026-01-08 14:57:00.165457+00	\N	f
7	1	Srta. Gabrielly Santos	ksilveira@example.com	+55 (071) 9138-4679	da Luz	07.836.142/0001-32	Rodovia de Porto	Lima	SE	Brasil	https://azevedo.com/	\N	manual	t	2026-01-08 14:57:00.165458+00	2026-01-08 14:57:00.165458+00	\N	f
8	1	Brenda Costela	gabriel15@example.com	+55 21 1757-7008	Monteiro	57.149.036/0001-59	Estação de Freitas, 513	Silva Paulista	PR	Brasil	https://cardoso.com/	Ad perferendis nobis facere.\nMaiores eveniet nostrum quasi sunt hic corporis ratione. Quam eius expedita.\nAt exercitationem aut quidem sequi. Voluptates et totam soluta.	manual	t	2026-01-08 14:57:00.165458+00	2026-01-08 14:57:00.165458+00	\N	f
9	1	Bruno Viana	mmoreira@example.org	71 7638 6036	Pinto S/A	25.917.640/0001-91	Parque da Paz, 362	Rodrigues Paulista	RR	Brasil	http://www.martins.net/	Sunt minima ab nobis enim. Sapiente sunt quia quia quas.\nSit et hic adipisci corporis eligendi eum necessitatibus. Nobis cumque doloremque laboriosam nobis.	manual	t	2026-01-08 14:57:00.165459+00	2026-01-08 14:57:00.165459+00	\N	f
10	1	Dr. Pedro Henrique Barros	da-conceicaogustavo@example.net	(081) 8380-0401	\N	618.792.354-55	Lago Otávio Lima, 60	das Neves	PR	Brasil	\N	\N	manual	t	2026-01-08 14:57:00.165459+00	2026-01-08 14:57:00.16546+00	\N	f
11	1	Maria Fernanda Castro	fernandesmaria@example.net	+55 (011) 5618 8005	\N	671.208.943-31	Viaduto Rafael Sales, 16	da Cunha da Prata	AP	Brasil	\N	\N	manual	t	2026-01-08 14:57:00.16546+00	2026-01-08 14:57:00.16546+00	\N	f
12	1	Emilly Teixeira	diogo91@example.net	(051) 4646-8216	Freitas - ME	93.456.702/0001-65	Área de da Mata	Duarte Verde	CE	Brasil	http://www.silva.com/	\N	manual	t	2026-01-08 14:57:00.165461+00	2026-01-08 14:57:00.165461+00	\N	f
13	1	Pedro Miguel Nunes	nunesrafael@example.com	(071) 9418-8453	Souza S/A	72.058.694/0001-29	Via Letícia Farias, 90	da Luz das Pedras	TO	Brasil	https://freitas.net/	\N	manual	t	2026-01-08 14:57:00.165461+00	2026-01-08 14:57:00.165462+00	\N	f
14	1	Brenda Silva	knogueira@example.org	+55 11 5935 7634	\N	795.608.142-49	Estação Raquel Silva, 42	Barbosa	TO	Brasil	\N	\N	manual	t	2026-01-08 14:57:00.165462+00	2026-01-08 14:57:00.165462+00	\N	f
15	1	Valentina Santos	bda-luz@example.com	+55 (021) 9355-2892	\N	869.754.321-55	Esplanada de Moura, 293	Lopes	DF	Brasil	\N	\N	manual	t	2026-01-08 14:57:00.165463+00	2026-01-08 14:57:00.165463+00	\N	f
16	1	Yago Azevedo	marcelo53@example.com	+55 41 6265-3507	Caldeira Pinto S/A	69.285.431/0001-48	Núcleo de da Rocha, 35	Costela	RR	Brasil	https://www.da.net/	Culpa a minima itaque. Commodi debitis eum deleniti aspernatur quae. Nulla nemo ab eos tenetur quod.	manual	t	2026-01-08 14:57:00.165464+00	2026-01-08 14:57:00.165464+00	\N	f
17	1	Mariana Viana	viniciusrezende@example.com	21 1554 3128	da Conceição	78.612.495/0001-05	Colônia de Porto, 42	Teixeira de Cardoso	MG	Brasil	http://www.jesus.com/	Repellendus temporibus labore temporibus molestias delectus quia. Nobis corporis cupiditate earum. Adipisci dolor est error.\nQuae laborum non iusto laboriosam nemo.	manual	t	2026-01-08 14:57:00.165464+00	2026-01-08 14:57:00.165465+00	\N	f
18	1	Arthur da Costa	pedro18@example.com	51 0628 1008	Nogueira	18.062.957/0001-28	Largo de Rocha, 3	Cavalcanti de da Cruz	DF	Brasil	https://www.nogueira.com/	\N	manual	t	2026-01-08 14:57:00.165465+00	2026-01-08 14:57:00.165465+00	\N	f
19	1	Rodrigo Rodrigues	vmartins@example.net	+55 84 6205 2283	Ramos	39.854.721/0001-02	Morro Almeida, 715	Araújo	CE	Brasil	http://www.melo.br/	\N	manual	t	2026-01-08 14:57:00.165466+00	2026-01-08 14:57:00.165466+00	\N	f
20	1	Matheus Pinto	lucasnovaes@example.net	(084) 6287-6874	Fogaça	58.029.317/0001-30	Colônia Luigi Novaes	da Rosa do Norte	PE	Brasil	https://sales.com/	Porro velit suscipit nobis. Adipisci unde facilis cumque accusamus rerum nobis.\nHarum asperiores doloremque tenetur nulla modi.	manual	t	2026-01-08 14:57:00.165466+00	2026-01-08 14:57:00.165466+00	\N	f
21	1	Luna Monteiro	nogueiralaura@example.net	11 3760 0684	Vieira S.A.	67.918.402/0001-40	Chácara Duarte, 26	Porto	RS	Brasil	https://pinto.com/	Dolorum id tempore debitis adipisci. Aut aliquam iure quasi ducimus et voluptate. Totam inventore maiores a ut ea.	manual	t	2026-01-08 14:57:00.165467+00	2026-01-08 14:57:00.165467+00	\N	f
22	1	Milena Farias	fogacabenicio@example.org	84 4969-2028	Cavalcanti	21.309.745/0001-07	Jardim de Novaes, 59	Porto	BA	Brasil	http://teixeira.net/	\N	manual	t	2026-01-08 14:57:00.165467+00	2026-01-08 14:57:00.165468+00	\N	f
23	1	Srta. Laura Melo	lrodrigues@example.com	84 1681-7532	Lopes da Cunha S.A.	36.245.081/0001-37	Estrada Nunes, 61	Ferreira	RJ	Brasil	https://correia.com/	\N	manual	t	2026-01-08 14:57:00.165468+00	2026-01-08 14:57:00.165468+00	\N	f
24	1	Bernardo das Neves	diogo70@example.com	+55 (061) 3079-1902	\N	378.401.259-05	Loteamento Santos	Ferreira dos Dourados	RS	Brasil	\N	\N	manual	t	2026-01-08 14:57:00.165469+00	2026-01-08 14:57:00.165469+00	\N	f
25	1	Luana Moreira	cunhaleonardo@example.net	71 2764-6930	Martins	53.702.618/0001-60	Praia Isabel da Conceição, 466	da Cruz das Flores	RO	Brasil	https://jesus.br/	Veritatis cumque provident quis animi sapiente. Repellat omnis pariatur vero. Labore unde voluptatem. Consequuntur nisi occaecati maiores perferendis veniam.	manual	t	2026-01-08 14:57:00.165469+00	2026-01-08 14:57:00.16547+00	\N	f
26	1	Bryan da Rocha	pietrocarvalho@example.org	(051) 6896 0872	\N	697.021.453-25	Favela de Souza, 31	Duarte de Nogueira	RO	Brasil	\N	Itaque impedit cum asperiores accusantium ipsa. Excepturi nulla reprehenderit eos unde.	manual	t	2026-01-08 14:57:00.16547+00	2026-01-08 14:57:00.16547+00	\N	f
27	1	Maria Cecília Barbosa	maria-alicemendes@example.com	+55 84 9778-4243	\N	074.312.985-79	Passarela Monteiro, 4	Correia	PI	Brasil	\N	Architecto omnis impedit id amet necessitatibus unde.\nNeque tempore eligendi quod asperiores fuga. Eveniet incidunt ex recusandae officia.	manual	t	2026-01-08 14:57:00.165471+00	2026-01-08 14:57:00.165471+00	\N	f
28	1	Srta. Olivia Mendes	alexandre40@example.com	11 7159 3621	Pinto	28.513.097/0001-55	Via de Gonçalves, 14	Gonçalves da Mata	CE	Brasil	http://www.melo.com/	\N	manual	t	2026-01-08 14:57:00.165471+00	2026-01-08 14:57:00.165472+00	\N	f
29	1	Samuel Jesus	caldeiraanthony@example.org	+55 11 1676-5503	Fernandes	87.451.932/0001-39	Residencial Ana Mendes, 539	da Rosa do Sul	MS	Brasil	https://sales.com/	\N	manual	t	2026-01-08 14:57:00.165472+00	2026-01-08 14:57:00.165472+00	\N	f
120	1	Marcela Rezende	sda-rosa@example.org	(061) 4997-1663	\N	082.479.516-49	Lago Viana, 19	Sales	MS	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.626432+00	2026-01-08 14:58:20.626432+00	\N	f
30	1	Leonardo Cardoso	luana47@example.org	+55 21 7973-6694	Novaes	32.806.759/0001-52	Praça Thales Silva, 416	Ribeiro	PR	Brasil	http://peixoto.com/	Animi accusantium inventore velit totam repellendus. Dolorem accusamus facere possimus in suscipit architecto. Quasi ipsam in facere.	manual	t	2026-01-08 14:57:00.165473+00	2026-01-08 14:57:00.165473+00	\N	f
31	1	Ana Luiza da Costa	giovanna81@example.org	11 2158 1261	\N	412.853.607-53	Campo Pereira, 83	Oliveira da Praia	PR	Brasil	\N	\N	manual	t	2026-01-08 14:57:00.165473+00	2026-01-08 14:57:00.165473+00	\N	f
32	1	Juan Correia	tfogaca@example.org	+55 (051) 0155 3158	\N	039.524.167-70	Ladeira Pedro Lucas Ramos, 35	Nunes	GO	Brasil	\N	\N	manual	t	2026-01-08 14:57:00.165474+00	2026-01-08 14:57:00.165474+00	\N	f
33	1	Alana Castro	lucas-gabrielrocha@example.org	(031) 7854-5888	Carvalho e Filhos	18.036.547/0001-02	Via de Rezende, 60	Martins do Oeste	SC	Brasil	http://das.br/	\N	manual	t	2026-01-08 14:57:00.165474+00	2026-01-08 14:57:00.165475+00	\N	f
34	1	Júlia da Cunha	giovanna39@example.com	+55 81 4000 2537	\N	861.249.753-19	Distrito de Melo, 25	Caldeira do Sul	RR	Brasil	\N	\N	manual	t	2026-01-08 14:57:00.165475+00	2026-01-08 14:57:00.165475+00	\N	f
35	1	Anthony da Cunha	moreiralorenzo@example.com	41 3328-0294	Pinto da Paz - EI	50.461.978/0001-29	Aeroporto de Pereira	Moreira de Goiás	AL	Brasil	http://sales.com/	Neque odio molestias debitis nobis impedit enim. Vel nesciunt doloremque in mollitia iure.\nTotam aperiam dolor id ea. Quis nulla minima repellat voluptates. Ea neque veritatis officiis.	manual	t	2026-01-08 14:57:00.165476+00	2026-01-08 14:57:00.165476+00	\N	f
36	1	Dr. Luiz Otávio Freitas	mendescaroline@example.net	+55 (051) 2103 7185	Carvalho	47.259.186/0001-61	Vila Santos, 75	Teixeira	TO	Brasil	http://almeida.br/	Aliquam voluptas repellendus magni mollitia. Dolores quisquam quis possimus optio porro optio.\nQuam expedita fugiat expedita dicta qui officia. Recusandae aspernatur dolorem veniam quis sed a.	manual	t	2026-01-08 14:57:00.165476+00	2026-01-08 14:57:00.165477+00	\N	f
37	1	Cauê da Rocha	isabelda-cunha@example.net	+55 71 4122-0087	da Rosa	43.298.175/0001-30	Ladeira Emanuel Cunha, 48	Nascimento de Azevedo	RR	Brasil	http://da.br/	\N	manual	t	2026-01-08 14:57:00.165477+00	2026-01-08 14:57:00.165477+00	\N	f
38	1	Luiz Gustavo Vieira	lpires@example.com	0900-490-2947	Aragão Caldeira - EI	70.495.328/0001-01	Vila Jesus, 315	Fernandes	AC	Brasil	https://www.santos.org/	\N	manual	t	2026-01-08 14:57:00.165484+00	2026-01-08 14:57:00.165484+00	\N	f
39	1	Emanuella Farias	moreirarebeca@example.net	+55 (041) 1305-7019	Moraes	71.935.860/0001-65	Alameda Maria Julia da Cunha, 3	Rezende	TO	Brasil	https://goncalves.br/	Illo architecto dignissimos deserunt omnis ullam. Placeat quisquam explicabo.\nTempora dolores eaque nam itaque praesentium.	manual	t	2026-01-08 14:57:00.165484+00	2026-01-08 14:57:00.165485+00	\N	f
40	1	Dr. João Felipe da Luz	vitormelo@example.net	(041) 1521-1305	da Cruz	02.947.368/0001-97	Avenida Freitas	Cardoso	GO	Brasil	https://www.ferreira.com/	\N	manual	t	2026-01-08 14:57:00.165485+00	2026-01-08 14:57:00.165485+00	\N	f
41	1	Danilo Silva	oliveiraeduarda@example.com	41 2043 9911	Rodrigues Rezende e Filhos	79.425.381/0001-00	Estrada de Almeida, 41	da Mata	DF	Brasil	https://rocha.br/	Nemo corporis quisquam. Ut voluptatum nam atque incidunt recusandae veniam accusamus.\nArchitecto magni labore a ipsa. Quo repellat consequatur quibusdam. Voluptatibus voluptas quo labore.	manual	t	2026-01-08 14:57:00.165485+00	2026-01-08 14:57:00.165486+00	\N	f
42	1	Danilo Monteiro	maiteteixeira@example.com	61 7770-2085	Nunes	94.357.861/0001-75	Avenida de Martins, 9	Ribeiro da Prata	RN	Brasil	http://da.br/	\N	manual	t	2026-01-08 14:57:00.165486+00	2026-01-08 14:57:00.165486+00	\N	f
43	1	Benício Souza	camposclara@example.net	(021) 0087-1554	\N	047.819.632-69	Vila Barros, 45	Gomes	RJ	Brasil	\N	Ullam culpa culpa expedita impedit voluptas deleniti.	manual	t	2026-01-08 14:57:00.165487+00	2026-01-08 14:57:00.165487+00	\N	f
44	1	Sra. Emanuelly Oliveira	ana-laura65@example.com	84 6436 0671	Vieira	15.834.627/0001-15	Sítio de Nogueira, 385	Silveira de Carvalho	AM	Brasil	http://www.da.com/	Alias maiores perspiciatis vel. Sequi accusamus placeat distinctio perferendis labore. Tempora quas asperiores sint vero consequatur unde voluptatibus.\nCommodi possimus quia fugit. Aut quae omnis.	manual	t	2026-01-08 14:57:00.165487+00	2026-01-08 14:57:00.165488+00	\N	f
45	1	Pedro Henrique da Mata	mpeixoto@example.com	(081) 6840-0720	Gomes S.A.	32.408.761/0001-73	Viela de Moraes, 76	Caldeira do Oeste	PR	Brasil	https://monteiro.br/	Nesciunt error incidunt debitis ex ullam optio. Nesciunt aliquam soluta earum officia ipsam consequuntur.\nQuisquam mollitia quidem qui modi aliquam. At inventore aut non. Ad alias non.	manual	t	2026-01-08 14:57:00.165488+00	2026-01-08 14:57:00.165488+00	\N	f
46	1	Pietro Viana	jbarbosa@example.org	+55 (011) 8835 9215	Sales Ltda.	20.951.643/0001-28	Pátio Caldeira, 418	Azevedo	CE	Brasil	http://www.rezende.com/	Exercitationem non error excepturi odio dolor aspernatur. Quasi eaque commodi illo.\nAdipisci ab perspiciatis ducimus porro blanditiis suscipit. Quia exercitationem assumenda molestiae.	manual	t	2026-01-08 14:57:00.165489+00	2026-01-08 14:57:00.165489+00	\N	f
47	1	Danilo Rezende	icunha@example.net	31 8833-9315	\N	193.765.840-66	Recanto de Souza, 560	Castro	AP	Brasil	\N	\N	manual	t	2026-01-08 14:57:00.165489+00	2026-01-08 14:57:00.16549+00	\N	f
48	1	Sophia Nascimento	kcavalcanti@example.com	0300 797 7841	da Paz - ME	64.512.708/0001-04	Viela Gabrielly das Neves, 74	Ferreira	SC	Brasil	http://www.duarte.com/	Molestiae ea vitae nihil voluptates. Rerum velit dicta rerum eius sint quibusdam. Numquam optio sunt sit.\nEst fuga hic ipsum sunt fugit odit quia. Dolore minima maxime eaque ad aut.	manual	t	2026-01-08 14:57:00.16549+00	2026-01-08 14:57:00.16549+00	\N	f
49	1	Camila Rezende	luiz-felipe58@example.org	(041) 7856 0561	Caldeira	29.786.045/0001-15	Ladeira Lívia Viana, 96	Costa Verde	RN	Brasil	https://www.viana.br/	\N	manual	t	2026-01-08 14:57:00.165491+00	2026-01-08 14:57:00.165491+00	\N	f
50	1	Matheus Santos	ferreirabernardo@example.org	21 4942 3905	Silveira	30.957.624/0001-62	Conjunto Dias, 301	Ramos	PR	Brasil	https://da.net/	\N	manual	t	2026-01-08 14:57:00.165491+00	2026-01-08 14:57:00.165492+00	\N	f
51	1	Igor Santos	jcardoso@example.net	0900 756 0586	Silveira da Cunha Ltda.	19.425.863/0001-39	Ladeira de Jesus, 99	Campos	DF	Brasil	https://porto.org/	\N	manual	t	2026-01-08 14:57:00.165492+00	2026-01-08 14:57:00.165492+00	\N	f
52	1	Maria Vitória Aragão	vieiracaio@example.net	0900 085 7305	\N	765.018.492-76	Condomínio André Barbosa, 79	Costa	TO	Brasil	\N	Animi repellendus quasi. Beatae necessitatibus placeat.	manual	t	2026-01-08 14:57:00.165492+00	2026-01-08 14:57:00.165493+00	\N	f
53	1	Miguel Souza	felipe54@example.com	+55 41 9760 9397	\N	328.976.045-65	Morro de da Cruz, 46	Moura da Prata	MS	Brasil	\N	\N	manual	t	2026-01-08 14:57:00.165493+00	2026-01-08 14:57:00.165493+00	\N	f
54	1	Sr. Felipe da Luz	diasnicole@example.com	31 2704-8326	Viana S/A	08.413.759/0001-08	Pátio de Pires, 2	Rocha de Jesus	MT	Brasil	http://da.org/	\N	manual	t	2026-01-08 14:57:00.165494+00	2026-01-08 14:57:00.165494+00	\N	f
55	1	Caio Pires	yda-costa@example.com	+55 (071) 6638 7617	Teixeira Souza S/A	31.052.789/0001-58	Fazenda João Jesus, 88	Correia de da Paz	TO	Brasil	https://www.moura.br/	\N	manual	t	2026-01-08 14:57:00.165494+00	2026-01-08 14:57:00.165495+00	\N	f
56	1	Stella Gomes	caua11@example.com	(061) 5077 2661	Almeida	28.039.157/0001-40	Lago Bianca Jesus, 24	Araújo de Goiás	SC	Brasil	http://www.silva.net/	\N	manual	t	2026-01-08 14:57:00.165495+00	2026-01-08 14:57:00.165495+00	\N	f
57	1	Miguel Lopes	hsouza@example.org	+55 51 4048 3167	\N	350.698.724-00	Viela de Melo, 44	Gomes	RJ	Brasil	\N	Tempore mollitia nobis fuga aperiam voluptates. Animi earum ipsam at amet doloremque.\nAlias porro quibusdam eos. Sit quibusdam inventore fuga. Nesciunt impedit accusantium perferendis quisquam.	manual	t	2026-01-08 14:57:00.165496+00	2026-01-08 14:57:00.165496+00	\N	f
58	1	Juan da Rosa	nascimentoluiz-henrique@example.com	+55 21 5821-6324	da Mota Ltda.	69.524.870/0001-66	Estação de Lima, 95	Sales de Monteiro	SE	Brasil	http://www.da.net/	Mollitia maiores deserunt aspernatur modi vel rem delectus. Magni omnis occaecati provident libero accusantium earum.\nArchitecto perspiciatis omnis soluta aperiam.	manual	t	2026-01-08 14:57:00.165496+00	2026-01-08 14:57:00.165497+00	\N	f
59	1	Eduarda da Cruz	knogueira@example.org	(021) 9775 3122	Viana S.A.	64.173.892/0001-05	Ladeira Carvalho, 79	Pinto das Flores	TO	Brasil	https://www.teixeira.com/	\N	manual	t	2026-01-08 14:57:00.165497+00	2026-01-08 14:57:00.165497+00	\N	f
60	1	Eduardo Moreira	zrezende@example.com	+55 11 4676-3227	Pinto Monteiro S.A.	67.302.851/0001-60	Largo Maria Fernanda Vieira	Pinto de Araújo	PR	Brasil	http://teixeira.org/	Nulla iste harum doloribus. Natus culpa optio nostrum. Enim quasi sit doloremque ratione velit et aut.\nIncidunt quae accusantium fugit libero amet neque. Id accusantium provident.	manual	t	2026-01-08 14:57:00.165497+00	2026-01-08 14:57:00.165498+00	\N	f
61	1	Guilherme Campos	pedroda-cruz@example.org	+55 51 6442 1759	da Cunha	75.436.281/0001-29	Viaduto Ana Clara Monteiro, 935	Fogaça do Campo	CE	Brasil	https://www.viana.br/	\N	manual	t	2026-01-08 14:57:00.165498+00	2026-01-08 14:57:00.165498+00	\N	f
62	1	Elisa das Neves	rezendefrancisco@example.org	84 5002-4659	\N	528.794.130-79	Vale de Peixoto	Vieira de Dias	GO	Brasil	\N	Dolor expedita dolor nemo adipisci distinctio maiores. Eaque minus mollitia commodi.	manual	t	2026-01-08 14:57:00.165499+00	2026-01-08 14:57:00.165499+00	\N	f
63	1	Gabriel Souza	hpinto@example.net	(071) 1708 3138	Alves	70.293.564/0001-45	Praça Araújo, 24	Rezende	DF	Brasil	http://cardoso.com/	Quod quibusdam dignissimos blanditiis voluptatem. Molestiae reiciendis distinctio qui alias.\nFuga repellat ullam expedita hic odio eveniet. In tenetur at nam recusandae eos cumque.	manual	t	2026-01-08 14:58:20.626395+00	2026-01-08 14:58:20.626399+00	\N	f
64	1	Srta. Letícia Cunha	dcarvalho@example.org	0900-680-9839	\N	167.934.285-19	Campo de Costa	Jesus	PR	Brasil	\N	Blanditiis rerum deserunt doloribus voluptas mollitia occaecati esse. Blanditiis dolor facere. Iure architecto quisquam odit explicabo labore eaque.	manual	t	2026-01-08 14:58:20.626399+00	2026-01-08 14:58:20.6264+00	\N	f
65	1	Nathan Azevedo	rda-mata@example.net	0900 758 8026	\N	587.912.604-85	Residencial de Rocha, 11	Peixoto	RN	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.6264+00	2026-01-08 14:58:20.626402+00	\N	f
66	1	Vitória da Cunha	da-cruzclarice@example.com	+55 (051) 5103 4929	\N	580.126.943-60	Colônia Araújo	Melo	BA	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.626403+00	2026-01-08 14:58:20.626403+00	\N	f
67	1	Davi Alves	mda-conceicao@example.com	61 1369-3554	Rocha Araújo e Filhos	23.891.745/0001-93	Viaduto Caio Nunes, 42	Cardoso	RR	Brasil	https://aragao.com/	\N	manual	t	2026-01-08 14:58:20.626403+00	2026-01-08 14:58:20.626404+00	\N	f
68	1	Gustavo Santos	dalves@example.org	31 0220 1494	Dias	87.103.546/0001-56	Vila Giovanna Viana, 5	Silva de Teixeira	MS	Brasil	https://martins.br/	\N	manual	t	2026-01-08 14:58:20.626404+00	2026-01-08 14:58:20.626404+00	\N	f
69	1	Caroline Fernandes	ymoraes@example.com	+55 61 0376-3448	\N	905.364.278-10	Parque da Cruz, 24	da Cunha	SC	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.626404+00	2026-01-08 14:58:20.626404+00	\N	f
70	1	João Gabriel Moreira	joao-lucas69@example.org	+55 (071) 2610-1195	Porto	09.453.816/0001-45	Largo Joaquim Pereira, 365	Alves dos Dourados	MT	Brasil	http://da.br/	\N	manual	t	2026-01-08 14:58:20.626405+00	2026-01-08 14:58:20.626405+00	\N	f
71	1	Ana Lívia Pinto	nascimentojoao-pedro@example.com	41 3904 6052	Pinto	34.295.186/0001-75	Residencial Pietra Peixoto, 85	Ramos da Mata	RR	Brasil	http://www.ferreira.br/	\N	manual	t	2026-01-08 14:58:20.626405+00	2026-01-08 14:58:20.626405+00	\N	f
72	1	Maria Pereira	gcarvalho@example.org	(021) 2564-4813	Alves	06.275.491/0001-60	Área de Silveira, 814	Monteiro	AM	Brasil	https://www.lopes.org/	\N	manual	t	2026-01-08 14:58:20.626406+00	2026-01-08 14:58:20.626406+00	\N	f
73	1	Davi Lucca Porto	castronoah@example.com	+55 21 6780-5062	Azevedo	27.103.965/0001-66	Aeroporto da Mata, 84	Campos da Serra	GO	Brasil	https://jesus.org/	\N	manual	t	2026-01-08 14:58:20.626406+00	2026-01-08 14:58:20.626406+00	\N	f
74	1	Maria Eduarda da Mata	melojuliana@example.com	+55 81 5152-6044	\N	913.402.867-69	Residencial Felipe Caldeira, 20	Moreira Paulista	RR	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.626407+00	2026-01-08 14:58:20.626407+00	\N	f
75	1	Maria Vitória Vieira	ylopes@example.net	+55 81 2090-3640	Rocha Cardoso - ME	54.037.986/0001-01	Residencial de Lopes	Mendes de Minas	AP	Brasil	https://da.com/	Aut eius rem adipisci incidunt possimus nemo et. Dolorem repellendus at autem fuga assumenda eaque. Blanditiis dolore corporis provident.\nDeserunt dolorum dicta eius.	manual	t	2026-01-08 14:58:20.626407+00	2026-01-08 14:58:20.626407+00	\N	f
76	1	Srta. Nina Vieira	costelaheloisa@example.net	41 0267-3632	Carvalho Ltda.	38.692.754/0001-22	Recanto Souza, 483	Barbosa da Serra	AP	Brasil	http://sales.com/	\N	manual	t	2026-01-08 14:58:20.626408+00	2026-01-08 14:58:20.626408+00	\N	f
77	1	Benício Pires	lavinia92@example.com	(071) 3145 1413	\N	281.054.739-41	Praça da Cruz, 14	Lopes	RN	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.626408+00	2026-01-08 14:58:20.626409+00	\N	f
78	1	Calebe da Mata	agatha53@example.org	(061) 6178 0424	Lima - ME	68.702.395/0001-08	Aeroporto de Monteiro, 80	Cardoso do Norte	AC	Brasil	https://das.com/	\N	manual	t	2026-01-08 14:58:20.626409+00	2026-01-08 14:58:20.626409+00	\N	f
79	1	Bianca Caldeira	paulomoura@example.net	+55 (081) 9393-3955	\N	968.521.304-60	Colônia de da Cunha	Pereira	RN	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.626409+00	2026-01-08 14:58:20.626409+00	\N	f
80	1	Dr. Alexandre Gomes	jaraujo@example.org	(071) 1584 0012	Azevedo	03.987.621/0001-07	Lagoa Souza, 354	Araújo do Sul	TO	Brasil	http://www.moura.com/	\N	manual	t	2026-01-08 14:58:20.62641+00	2026-01-08 14:58:20.62641+00	\N	f
81	1	Ana Júlia Aragão	da-rochabreno@example.org	0900-031-3663	Rocha	10.896.452/0001-57	Fazenda de Correia, 99	da Mota de Goiás	SE	Brasil	https://www.da.com/	\N	manual	t	2026-01-08 14:58:20.62641+00	2026-01-08 14:58:20.62641+00	\N	f
82	1	Vicente Silva	fcardoso@example.org	(061) 3129-6621	Novaes	45.382.176/0001-93	Campo Ramos, 38	Aragão	DF	Brasil	http://ramos.br/	Similique fugit natus tempora rem natus numquam deserunt. Nihil ut est iste nihil.\nQuisquam quidem molestiae autem deserunt dolorem. Quam tempore doloribus voluptas nam eius laboriosam illum.	manual	t	2026-01-08 14:58:20.626411+00	2026-01-08 14:58:20.626411+00	\N	f
83	1	Calebe Rezende	lsilveira@example.org	41 2054 0084	Costa	97.450.628/0001-20	Aeroporto Ana Luiza Aragão, 33	Vieira	PB	Brasil	http://souza.br/	Consequatur laboriosam reiciendis placeat. Ex quia voluptatibus nostrum expedita sed corrupti.\nDolores illum perspiciatis asperiores quasi magni consequuntur officia. Exercitationem sequi sit.	manual	t	2026-01-08 14:58:20.626411+00	2026-01-08 14:58:20.626411+00	\N	f
84	1	Erick Ramos	nathan63@example.com	+55 (061) 9804 6904	Farias - EI	79.835.061/0001-29	Núcleo de Ribeiro, 77	Moura do Oeste	CE	Brasil	https://www.vieira.com/	\N	manual	t	2026-01-08 14:58:20.626412+00	2026-01-08 14:58:20.626412+00	\N	f
85	1	Ana da Rocha	davi-lucasteixeira@example.org	+55 (021) 4257-8444	Gomes Ltda.	70.529.186/0001-56	Passarela Murilo Mendes	Nascimento da Serra	MA	Brasil	https://lopes.com/	\N	manual	t	2026-01-08 14:58:20.626412+00	2026-01-08 14:58:20.626412+00	\N	f
86	1	Murilo Moraes	melissa18@example.org	(084) 3136 3950	Jesus	19.742.805/0001-39	Núcleo Cavalcanti, 776	da Rosa	BA	Brasil	https://www.freitas.br/	\N	manual	t	2026-01-08 14:58:20.626412+00	2026-01-08 14:58:20.626413+00	\N	f
87	1	Ana Luiza Rezende	heloisa09@example.org	0500-966-7385	Lopes	51.240.839/0001-38	Pátio Lavínia Gonçalves, 8	Rodrigues	MA	Brasil	http://barros.net/	Esse molestiae delectus odit corporis pariatur nihil mollitia. Vitae ratione eaque iste a rem.	manual	t	2026-01-08 14:58:20.626413+00	2026-01-08 14:58:20.626413+00	\N	f
88	1	Srta. Bianca Costela	maitesales@example.net	61 0550 2984	Souza Peixoto S.A.	86.034.592/0001-88	Sítio da Rosa, 84	Freitas	SC	Brasil	https://cunha.com/	\N	manual	t	2026-01-08 14:58:20.626413+00	2026-01-08 14:58:20.626414+00	\N	f
89	1	Bryan Souza	isadora99@example.org	+55 (081) 3610 5101	\N	301.259.468-05	Morro João Miguel Cavalcanti, 55	Cardoso Verde	SP	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.626414+00	2026-01-08 14:58:20.626418+00	\N	f
90	1	Eloah Moreira	oliviacostela@example.com	+55 (084) 2365-9652	Viana	31.854.206/0001-02	Lagoa Vinicius Ferreira, 87	Pereira dos Dourados	AM	Brasil	https://www.goncalves.com/	\N	manual	t	2026-01-08 14:58:20.626418+00	2026-01-08 14:58:20.626418+00	\N	f
91	1	Benício Vieira	erodrigues@example.net	61 7676-3273	\N	065.329.817-02	Favela de Ribeiro, 7	Moraes da Serra	PB	Brasil	\N	Explicabo totam corporis libero ullam quo. Doloribus voluptatem non sit fugiat nisi.\nAliquam laborum sint laudantium architecto minima. Labore vero beatae magnam.	manual	t	2026-01-08 14:58:20.626419+00	2026-01-08 14:58:20.626419+00	\N	f
92	1	Isabella da Cunha	pedro-lucaslima@example.org	(021) 6602 0033	Moura	04.673.582/0001-28	Residencial Eloah da Rocha, 63	Almeida do Norte	DF	Brasil	http://www.moura.net/	Provident tempore corporis excepturi unde illum distinctio.\nPariatur nisi molestiae sed neque pariatur assumenda. Assumenda unde eaque dolorum. Ullam accusantium sunt.	manual	t	2026-01-08 14:58:20.626419+00	2026-01-08 14:58:20.626419+00	\N	f
93	1	Melissa Castro	loliveira@example.com	+55 31 5387-6746	da Paz S/A	93.021.486/0001-25	Colônia Larissa Costa, 825	Novaes de da Mota	PI	Brasil	http://www.mendes.net/	\N	manual	t	2026-01-08 14:58:20.62642+00	2026-01-08 14:58:20.62642+00	\N	f
94	1	Dr. Kaique Moraes	jcastro@example.net	(051) 1355-7004	\N	643.918.075-48	Recanto Pereira, 1	Martins de Fogaça	MS	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.62642+00	2026-01-08 14:58:20.62642+00	\N	f
95	1	Davi Lucas Pereira	ida-rosa@example.com	+55 21 3398 7116	Sales	67.450.923/0001-16	Favela de Oliveira, 15	Caldeira	RR	Brasil	http://da.br/	\N	manual	t	2026-01-08 14:58:20.62642+00	2026-01-08 14:58:20.626421+00	\N	f
96	1	Ana Julia Costela	yasmin06@example.org	51 8009 2783	Nogueira	90.827.156/0001-33	Estação da Luz	Monteiro	AC	Brasil	https://www.da.br/	\N	manual	t	2026-01-08 14:58:20.626421+00	2026-01-08 14:58:20.626421+00	\N	f
97	1	Alana Mendes	samuel40@example.com	(071) 1483 9969	\N	274.536.109-07	Fazenda Gomes	da Costa	DF	Brasil	\N	Culpa quos optio nam atque harum vel. Magni iste maxime cum veniam laboriosam laborum. Est quae expedita.	manual	t	2026-01-08 14:58:20.626421+00	2026-01-08 14:58:20.626422+00	\N	f
98	1	Eduarda Lima	gda-cruz@example.org	+55 41 7509 2681	Sales S.A.	71.342.605/0001-09	Distrito Melissa da Rosa, 30	Moraes das Flores	BA	Brasil	http://araujo.br/	\N	manual	t	2026-01-08 14:58:20.626422+00	2026-01-08 14:58:20.626422+00	\N	f
99	1	Raul Rezende	maria-aliceporto@example.org	+55 21 8695-3379	\N	783.961.054-48	Largo da Cunha, 142	Sales da Prata	MG	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.626422+00	2026-01-08 14:58:20.626423+00	\N	f
100	1	Henrique da Luz	raquel53@example.net	(031) 5948-9608	Cavalcanti Cunha - EI	52.940.387/0001-60	Viela da Cruz, 615	Dias	PE	Brasil	http://da.org/	\N	manual	t	2026-01-08 14:58:20.626423+00	2026-01-08 14:58:20.626423+00	\N	f
101	1	Alexia Caldeira	jsales@example.org	+55 84 6151-2303	Cardoso	54.267.089/0001-86	Estação Isabel Farias, 382	da Costa	BA	Brasil	https://www.da.com/	\N	manual	t	2026-01-08 14:58:20.626423+00	2026-01-08 14:58:20.626423+00	\N	f
102	1	João Vitor Caldeira	evelyn34@example.com	0300-354-4948	Jesus S.A.	53.269.041/0001-44	Recanto Laura Oliveira, 81	da Paz Paulista	MA	Brasil	http://da.org/	Nobis exercitationem unde neque reprehenderit necessitatibus nemo non. Inventore architecto occaecati aliquam ea.	manual	t	2026-01-08 14:58:20.626424+00	2026-01-08 14:58:20.626424+00	\N	f
103	1	Dra. Ana Sophia da Cunha	guilhermeporto@example.com	(084) 9350 7934	Campos	73.521.846/0001-40	Feira de Jesus, 68	Cardoso	GO	Brasil	https://fernandes.br/	\N	manual	t	2026-01-08 14:58:20.626424+00	2026-01-08 14:58:20.626424+00	\N	f
104	1	Lorena Campos	sabrinarocha@example.net	51 5273 8517	Azevedo	48.570.639/0001-39	Passarela Viana, 6	Barros da Mata	PA	Brasil	http://www.da.org/	\N	manual	t	2026-01-08 14:58:20.626425+00	2026-01-08 14:58:20.626425+00	\N	f
105	1	Erick Fogaça	wcorreia@example.net	(021) 6358-7099	da Costa S.A.	41.672.809/0001-47	Avenida Pires, 53	Oliveira de Pires	SP	Brasil	http://pereira.br/	\N	manual	t	2026-01-08 14:58:20.626425+00	2026-01-08 14:58:20.626425+00	\N	f
106	1	Ana Vitória Monteiro	bpires@example.org	(041) 9692 3906	Dias S.A.	68.507.912/0001-98	Chácara de Nogueira, 24	Teixeira da Serra	AM	Brasil	http://dias.com/	Cumque assumenda error animi veritatis. Alias eum expedita minus facere a.\nDeleniti officiis earum amet. Nisi quo quae necessitatibus occaecati magnam nemo.	manual	t	2026-01-08 14:58:20.626426+00	2026-01-08 14:58:20.626426+00	\N	f
107	1	Srta. Emanuelly Barbosa	ana-luizasales@example.com	+55 (061) 1690 1835	\N	517.096.428-58	Trevo da Rocha, 89	Martins	PE	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.626426+00	2026-01-08 14:58:20.626426+00	\N	f
108	1	Breno Campos	qribeiro@example.net	(011) 4245 4715	Rocha	32.596.478/0001-12	Conjunto de Vieira, 4	Almeida	SC	Brasil	https://www.novaes.org/	\N	manual	t	2026-01-08 14:58:20.626426+00	2026-01-08 14:58:20.626427+00	\N	f
109	1	Valentina Monteiro	maria35@example.org	51 9540 1414	da Cruz S/A	36.102.754/0001-08	Trevo João Guilherme Lopes, 91	Oliveira Grande	AC	Brasil	http://dias.com/	\N	manual	t	2026-01-08 14:58:20.626427+00	2026-01-08 14:58:20.626427+00	\N	f
110	1	Sr. Lucca Pires	lorenzo88@example.net	+55 (021) 8737-1069	Alves	51.869.307/0001-64	Chácara Barros, 8	Freitas Alegre	MG	Brasil	https://pereira.br/	\N	manual	t	2026-01-08 14:58:20.626427+00	2026-01-08 14:58:20.626428+00	\N	f
111	1	Lucas Moraes	joao-vitorsales@example.com	+55 71 7809-9984	Barros Moreira S/A	15.023.867/0001-30	Avenida Mendes, 14	Gonçalves	GO	Brasil	http://www.das.br/	Asperiores deserunt consequuntur consequatur dolore voluptates. Facilis perferendis nisi modi aperiam porro voluptas.	manual	t	2026-01-08 14:58:20.626428+00	2026-01-08 14:58:20.626428+00	\N	f
112	1	Luiz Gustavo Costela	martinsmarcela@example.org	(041) 7499-6240	Cardoso - ME	74.589.630/0001-80	Ladeira Julia Gonçalves, 47	Melo	PR	Brasil	https://www.das.br/	Cumque ipsam illo ducimus beatae exercitationem veritatis. Dolores harum laborum laboriosam.	manual	t	2026-01-08 14:58:20.626428+00	2026-01-08 14:58:20.626428+00	\N	f
113	1	Laís Almeida	rezendemariane@example.net	+55 (011) 0716 3626	\N	045.921.867-02	Fazenda Martins, 5	Martins	AM	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.626429+00	2026-01-08 14:58:20.626429+00	\N	f
114	1	Raul Martins	cda-conceicao@example.com	(021) 9161 9512	\N	509.137.482-50	Fazenda Barros, 28	Oliveira dos Dourados	AL	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.626429+00	2026-01-08 14:58:20.626429+00	\N	f
115	1	Lívia Mendes	maria-cecilianogueira@example.com	0300 872 9868	\N	246.185.907-85	Travessa João Pedro da Mata, 9	da Rosa	PR	Brasil	\N	Error tenetur expedita fugiat. Sit reprehenderit voluptas fugit veritatis atque.	manual	t	2026-01-08 14:58:20.62643+00	2026-01-08 14:58:20.62643+00	\N	f
116	1	Calebe Ferreira	gazevedo@example.net	(051) 1768-4353	Moreira	19.475.206/0001-04	Avenida Yago Campos, 66	Cavalcanti	GO	Brasil	http://www.da.org/	\N	manual	t	2026-01-08 14:58:20.62643+00	2026-01-08 14:58:20.62643+00	\N	f
117	1	Gabrielly Nogueira	agatha07@example.net	+55 (081) 2774-8427	Mendes	05.163.947/0001-37	Estação Benício da Paz, 41	Ribeiro do Galho	SE	Brasil	https://www.caldeira.net/	\N	manual	t	2026-01-08 14:58:20.626431+00	2026-01-08 14:58:20.626431+00	\N	f
118	1	Ana Júlia Freitas	diego06@example.org	84 2415-7663	da Rocha Freitas Ltda.	54.610.873/0001-45	Via Francisco Farias, 14	Barros Alegre	PB	Brasil	https://www.almeida.net/	\N	manual	t	2026-01-08 14:58:20.626431+00	2026-01-08 14:58:20.626431+00	\N	f
119	1	Sra. Isadora Caldeira	eduarda39@example.org	84 6135-1234	\N	069.435.287-00	Via de Campos, 46	da Mata de Silva	MT	Brasil	\N	\N	manual	t	2026-01-08 14:58:20.626431+00	2026-01-08 14:58:20.626432+00	\N	f
121	1	Dr. Ian Silveira	ana-beatrizda-rocha@example.com	0800 665 5413	da Conceição e Filhos	14.689.025/0001-59	Sítio Bianca da Costa, 22	Novaes	SE	Brasil	http://das.br/	\N	manual	t	2026-01-08 14:58:20.626432+00	2026-01-08 14:58:20.626433+00	\N	f
122	1	Vitor Gabriel Jesus	kevin50@example.net	41 2518 2999	Monteiro S/A	07.143.895/0001-62	Pátio Caio Oliveira, 79	Fernandes da Praia	MA	Brasil	https://www.das.br/	Culpa quasi consequatur. Ad quis libero deserunt natus necessitatibus perferendis. Exercitationem temporibus totam voluptatem nulla itaque ipsum.\nAperiam deserunt architecto error tempore blanditiis.	manual	t	2026-01-08 14:58:20.626433+00	2026-01-08 14:58:20.626433+00	\N	f
\.


--
-- Data for Name: field_definitions; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.field_definitions (id, board_id, name, field_type, is_required, is_unique, "position", placeholder, help_text, options, validations, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: gamification_badges; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.gamification_badges (id, account_id, name, description, icon_url, is_system_badge, criteria_type, criteria, is_active, created_at, updated_at) FROM stdin;
13	5	Primeiro Passo	Ganhou seu primeiro card	\N	t	automatic	{"field": "cards_won", "operator": ">=", "value": 1}	t	2026-01-08 14:57:39.52365	2026-01-08 14:57:39.523653
14	5	Vendedor Estrela	Alcançou 1000 pontos	\N	t	automatic	{"field": "total_points", "operator": ">=", "value": 1000}	t	2026-01-08 14:57:39.523654	2026-01-08 14:57:39.523654
15	5	Top Performer	Ficou em 1º no ranking mensal	\N	t	manual	{}	t	2026-01-08 14:57:39.523654	2026-01-08 14:57:39.523655
16	5	Persistente	Ganhou 10 cards	\N	t	automatic	{"field": "cards_won", "operator": ">=", "value": 10}	t	2026-01-08 14:57:39.523655	2026-01-08 14:57:39.523655
17	6	Primeiro Passo	Ganhou seu primeiro card	\N	t	automatic	{"field": "cards_won", "operator": ">=", "value": 1}	t	2026-01-08 14:57:39.523656	2026-01-08 14:57:39.523656
18	6	Vendedor Estrela	Alcançou 1000 pontos	\N	t	automatic	{"field": "total_points", "operator": ">=", "value": 1000}	t	2026-01-08 14:57:39.523656	2026-01-08 14:57:39.523656
19	6	Top Performer	Ficou em 1º no ranking mensal	\N	t	manual	{}	t	2026-01-08 14:57:39.523657	2026-01-08 14:57:39.523657
20	6	Persistente	Ganhou 10 cards	\N	t	automatic	{"field": "cards_won", "operator": ">=", "value": 10}	t	2026-01-08 14:57:39.523657	2026-01-08 14:57:39.523658
21	7	Primeiro Passo	Ganhou seu primeiro card	\N	t	automatic	{"field": "cards_won", "operator": ">=", "value": 1}	t	2026-01-08 14:57:39.523658	2026-01-08 14:57:39.523658
22	7	Vendedor Estrela	Alcançou 1000 pontos	\N	t	automatic	{"field": "total_points", "operator": ">=", "value": 1000}	t	2026-01-08 14:57:39.523658	2026-01-08 14:57:39.523659
23	7	Top Performer	Ficou em 1º no ranking mensal	\N	t	manual	{}	t	2026-01-08 14:57:39.523659	2026-01-08 14:57:39.523659
24	7	Persistente	Ganhou 10 cards	\N	t	automatic	{"field": "cards_won", "operator": ">=", "value": 10}	t	2026-01-08 14:57:39.52366	2026-01-08 14:57:39.52366
\.


--
-- Data for Name: gamification_points; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.gamification_points (id, user_id, points, reason, description, related_entity_type, related_entity_id, created_at, updated_at) FROM stdin;
600	29	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369211	2026-01-08 14:57:42.369215
601	29	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369215	2026-01-08 14:57:42.369215
602	29	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369216	2026-01-08 14:57:42.369216
603	29	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369216	2026-01-08 14:57:42.369217
604	29	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369217	2026-01-08 14:57:42.369217
605	29	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369217	2026-01-08 14:57:42.369218
606	29	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369218	2026-01-08 14:57:42.369218
607	29	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369218	2026-01-08 14:57:42.369219
608	29	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369219	2026-01-08 14:57:42.369219
609	29	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369219	2026-01-08 14:57:42.36922
610	29	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.36922	2026-01-08 14:57:42.36922
611	29	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.36922	2026-01-08 14:57:42.369221
612	29	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369221	2026-01-08 14:57:42.369221
613	29	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369221	2026-01-08 14:57:42.369222
614	29	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369222	2026-01-08 14:57:42.369222
615	29	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369223	2026-01-08 14:57:42.369223
616	29	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369223	2026-01-08 14:57:42.369223
617	29	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369224	2026-01-08 14:57:42.369224
618	29	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369224	2026-01-08 14:57:42.369224
619	29	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369225	2026-01-08 14:57:42.369225
620	29	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369225	2026-01-08 14:57:42.369225
621	29	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369225	2026-01-08 14:57:42.369226
622	29	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369226	2026-01-08 14:57:42.369226
623	30	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369227	2026-01-08 14:57:42.369227
624	30	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369227	2026-01-08 14:57:42.369227
625	30	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369227	2026-01-08 14:57:42.369228
626	30	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369228	2026-01-08 14:57:42.369228
627	30	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369228	2026-01-08 14:57:42.369229
628	30	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369229	2026-01-08 14:57:42.369229
629	30	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369229	2026-01-08 14:57:42.36923
630	30	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.36923	2026-01-08 14:57:42.36923
631	30	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.36923	2026-01-08 14:57:42.369231
632	30	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369231	2026-01-08 14:57:42.369231
633	30	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369231	2026-01-08 14:57:42.369232
634	30	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369232	2026-01-08 14:57:42.369232
635	30	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369232	2026-01-08 14:57:42.369232
636	30	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369233	2026-01-08 14:57:42.369233
637	30	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369233	2026-01-08 14:57:42.369233
638	30	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369234	2026-01-08 14:57:42.369234
639	30	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369234	2026-01-08 14:57:42.369234
640	30	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369235	2026-01-08 14:57:42.369235
641	30	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369235	2026-01-08 14:57:42.369235
642	30	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369235	2026-01-08 14:57:42.369236
643	30	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369236	2026-01-08 14:57:42.369236
644	30	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369236	2026-01-08 14:57:42.369237
645	30	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369237	2026-01-08 14:57:42.369237
646	30	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369238	2026-01-08 14:57:42.369238
647	31	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369238	2026-01-08 14:57:42.369238
648	31	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369239	2026-01-08 14:57:42.369239
649	31	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369239	2026-01-08 14:57:42.369239
650	31	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.36924	2026-01-08 14:57:42.36924
651	31	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.36924	2026-01-08 14:57:42.36924
652	31	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369241	2026-01-08 14:57:42.369241
653	31	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369241	2026-01-08 14:57:42.369241
654	31	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369242	2026-01-08 14:57:42.369242
655	31	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369242	2026-01-08 14:57:42.369242
656	31	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369242	2026-01-08 14:57:42.369243
657	31	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369243	2026-01-08 14:57:42.369243
658	31	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369243	2026-01-08 14:57:42.369244
659	31	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369244	2026-01-08 14:57:42.369244
660	31	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369244	2026-01-08 14:57:42.369244
661	31	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369245	2026-01-08 14:57:42.369245
662	31	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369245	2026-01-08 14:57:42.369245
663	31	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369246	2026-01-08 14:57:42.369246
664	31	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369246	2026-01-08 14:57:42.369246
665	31	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369247	2026-01-08 14:57:42.369247
666	31	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369247	2026-01-08 14:57:42.369247
667	31	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369247	2026-01-08 14:57:42.369248
668	31	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369248	2026-01-08 14:57:42.369248
669	31	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369248	2026-01-08 14:57:42.369249
670	31	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369249	2026-01-08 14:57:42.369249
671	31	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369249	2026-01-08 14:57:42.369249
672	32	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.36925	2026-01-08 14:57:42.36925
673	32	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.36925	2026-01-08 14:57:42.36925
674	32	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369251	2026-01-08 14:57:42.369251
675	32	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369251	2026-01-08 14:57:42.369251
676	32	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369252	2026-01-08 14:57:42.369252
677	32	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369252	2026-01-08 14:57:42.369252
678	32	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369252	2026-01-08 14:57:42.369253
679	32	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369253	2026-01-08 14:57:42.369253
680	32	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369253	2026-01-08 14:57:42.369254
681	32	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369254	2026-01-08 14:57:42.369254
682	32	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369254	2026-01-08 14:57:42.369254
683	32	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369255	2026-01-08 14:57:42.369255
684	32	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369255	2026-01-08 14:57:42.369255
685	32	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369256	2026-01-08 14:57:42.369256
686	32	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369256	2026-01-08 14:57:42.369256
687	32	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369256	2026-01-08 14:57:42.369257
688	32	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369257	2026-01-08 14:57:42.369257
689	32	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369257	2026-01-08 14:57:42.369258
690	33	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369258	2026-01-08 14:57:42.369258
691	33	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369258	2026-01-08 14:57:42.369259
692	33	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369259	2026-01-08 14:57:42.369259
693	33	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369259	2026-01-08 14:57:42.369259
694	33	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.36926	2026-01-08 14:57:42.36926
695	33	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.36926	2026-01-08 14:57:42.36926
696	33	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:42.369261	2026-01-08 14:57:42.369261
697	33	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369261	2026-01-08 14:57:42.369261
698	33	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:42.369262	2026-01-08 14:57:42.369262
699	33	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369262	2026-01-08 14:57:42.369262
700	33	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369262	2026-01-08 14:57:42.369263
701	33	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:42.369263	2026-01-08 14:57:42.369263
702	37	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831254	2026-01-08 14:57:46.831259
703	37	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.83126	2026-01-08 14:57:46.83126
704	37	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.83126	2026-01-08 14:57:46.83126
705	37	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831261	2026-01-08 14:57:46.831261
706	37	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831261	2026-01-08 14:57:46.831261
707	37	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831262	2026-01-08 14:57:46.831262
708	37	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831262	2026-01-08 14:57:46.831262
709	37	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831263	2026-01-08 14:57:46.831263
710	37	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831263	2026-01-08 14:57:46.831263
711	37	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831263	2026-01-08 14:57:46.831264
712	37	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831264	2026-01-08 14:57:46.831264
713	37	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831264	2026-01-08 14:57:46.831265
714	37	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831265	2026-01-08 14:57:46.831265
715	37	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831265	2026-01-08 14:57:46.831266
716	37	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831266	2026-01-08 14:57:46.831266
717	37	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831267	2026-01-08 14:57:46.831267
718	37	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831267	2026-01-08 14:57:46.831268
719	37	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831268	2026-01-08 14:57:46.831268
720	37	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831268	2026-01-08 14:57:46.831269
721	37	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831269	2026-01-08 14:57:46.83127
722	37	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.83127	2026-01-08 14:57:46.83127
723	37	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.83127	2026-01-08 14:57:46.831271
724	37	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831271	2026-01-08 14:57:46.831272
725	37	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831272	2026-01-08 14:57:46.831272
726	37	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831272	2026-01-08 14:57:46.831273
727	37	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831273	2026-01-08 14:57:46.831273
728	37	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831273	2026-01-08 14:57:46.831274
729	38	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831274	2026-01-08 14:57:46.831274
730	38	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831274	2026-01-08 14:57:46.831275
731	38	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831275	2026-01-08 14:57:46.831276
732	38	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831276	2026-01-08 14:57:46.831276
733	38	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831277	2026-01-08 14:57:46.831277
734	38	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831277	2026-01-08 14:57:46.831277
735	38	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831278	2026-01-08 14:57:46.831278
736	38	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831279	2026-01-08 14:57:46.831279
737	38	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831279	2026-01-08 14:57:46.83128
738	38	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.83128	2026-01-08 14:57:46.83128
739	38	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.83128	2026-01-08 14:57:46.831281
740	38	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831281	2026-01-08 14:57:46.831281
741	38	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831281	2026-01-08 14:57:46.831281
742	38	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831282	2026-01-08 14:57:46.831282
743	38	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831282	2026-01-08 14:57:46.831282
744	38	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831283	2026-01-08 14:57:46.831283
745	38	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831283	2026-01-08 14:57:46.831283
746	38	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831284	2026-01-08 14:57:46.831284
747	38	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831284	2026-01-08 14:57:46.831284
748	38	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831285	2026-01-08 14:57:46.831285
749	38	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831285	2026-01-08 14:57:46.831285
750	38	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831286	2026-01-08 14:57:46.831286
751	38	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831286	2026-01-08 14:57:46.831286
752	38	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831287	2026-01-08 14:57:46.831287
753	38	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831287	2026-01-08 14:57:46.831287
754	38	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831287	2026-01-08 14:57:46.831288
755	38	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831288	2026-01-08 14:57:46.831288
756	39	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831288	2026-01-08 14:57:46.831289
757	39	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831289	2026-01-08 14:57:46.831289
758	39	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.83129	2026-01-08 14:57:46.83129
759	39	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.83129	2026-01-08 14:57:46.83129
760	39	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831291	2026-01-08 14:57:46.831291
761	39	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831291	2026-01-08 14:57:46.831291
762	39	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831292	2026-01-08 14:57:46.831292
763	39	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831293	2026-01-08 14:57:46.831293
764	39	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831293	2026-01-08 14:57:46.831293
765	39	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831294	2026-01-08 14:57:46.831294
766	39	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831294	2026-01-08 14:57:46.831294
767	39	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831295	2026-01-08 14:57:46.831295
768	39	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831295	2026-01-08 14:57:46.831296
769	39	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831296	2026-01-08 14:57:46.831296
770	39	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831296	2026-01-08 14:57:46.831297
771	39	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831297	2026-01-08 14:57:46.831297
772	39	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831297	2026-01-08 14:57:46.831297
773	39	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831298	2026-01-08 14:57:46.831298
774	39	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831298	2026-01-08 14:57:46.831299
775	39	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831299	2026-01-08 14:57:46.831299
776	39	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831299	2026-01-08 14:57:46.8313
777	39	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.8313	2026-01-08 14:57:46.8313
778	39	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831301	2026-01-08 14:57:46.831301
779	39	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831301	2026-01-08 14:57:46.831302
780	39	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831302	2026-01-08 14:57:46.831302
781	39	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831303	2026-01-08 14:57:46.831303
782	40	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831303	2026-01-08 14:57:46.831304
783	40	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831304	2026-01-08 14:57:46.831304
784	40	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831305	2026-01-08 14:57:46.831305
785	40	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831305	2026-01-08 14:57:46.831306
786	40	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831306	2026-01-08 14:57:46.831306
787	40	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831307	2026-01-08 14:57:46.831307
788	40	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831307	2026-01-08 14:57:46.831308
789	40	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831308	2026-01-08 14:57:46.831308
790	40	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831309	2026-01-08 14:57:46.831309
791	40	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831309	2026-01-08 14:57:46.83131
792	40	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.83131	2026-01-08 14:57:46.83131
793	40	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831311	2026-01-08 14:57:46.831311
794	40	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831311	2026-01-08 14:57:46.831312
795	40	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831312	2026-01-08 14:57:46.831312
796	40	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831313	2026-01-08 14:57:46.831313
797	40	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831313	2026-01-08 14:57:46.831313
798	40	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831314	2026-01-08 14:57:46.831314
799	40	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831314	2026-01-08 14:57:46.831314
800	40	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831315	2026-01-08 14:57:46.831315
801	40	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831315	2026-01-08 14:57:46.831315
802	40	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831316	2026-01-08 14:57:46.831316
803	40	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831316	2026-01-08 14:57:46.831317
804	40	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831317	2026-01-08 14:57:46.831317
805	40	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831317	2026-01-08 14:57:46.831318
806	40	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831318	2026-01-08 14:57:46.831318
807	40	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831319	2026-01-08 14:57:46.831319
808	40	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831319	2026-01-08 14:57:46.831319
809	40	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.83132	2026-01-08 14:57:46.83132
810	40	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.83132	2026-01-08 14:57:46.83132
811	41	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831321	2026-01-08 14:57:46.831321
812	41	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831321	2026-01-08 14:57:46.831322
813	41	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831322	2026-01-08 14:57:46.831322
814	41	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831322	2026-01-08 14:57:46.831323
815	41	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831323	2026-01-08 14:57:46.831323
816	41	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831324	2026-01-08 14:57:46.831324
817	41	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831324	2026-01-08 14:57:46.831324
818	41	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831325	2026-01-08 14:57:46.831325
819	41	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831325	2026-01-08 14:57:46.831326
820	41	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831326	2026-01-08 14:57:46.831326
821	41	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:46.831326	2026-01-08 14:57:46.831327
822	41	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:46.831327	2026-01-08 14:57:46.831328
823	41	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831328	2026-01-08 14:57:46.831328
824	41	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:46.831329	2026-01-08 14:57:46.831329
825	45	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.748967	2026-01-08 14:57:53.749181
826	45	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749184	2026-01-08 14:57:53.749184
827	45	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749185	2026-01-08 14:57:53.749185
828	45	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749186	2026-01-08 14:57:53.749186
829	45	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749187	2026-01-08 14:57:53.749188
830	45	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749188	2026-01-08 14:57:53.749189
831	45	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749189	2026-01-08 14:57:53.74919
832	45	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.74919	2026-01-08 14:57:53.74919
833	45	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749191	2026-01-08 14:57:53.749191
834	45	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749192	2026-01-08 14:57:53.749192
835	45	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749193	2026-01-08 14:57:53.749193
836	45	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749194	2026-01-08 14:57:53.749194
995	32	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.57073	2026-01-08 14:59:04.57073
837	45	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749195	2026-01-08 14:57:53.749195
838	45	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749196	2026-01-08 14:57:53.749196
839	45	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749196	2026-01-08 14:57:53.749197
840	45	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749197	2026-01-08 14:57:53.749198
841	45	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749198	2026-01-08 14:57:53.749199
842	45	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.7492	2026-01-08 14:57:53.7492
843	45	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749201	2026-01-08 14:57:53.749201
844	45	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749202	2026-01-08 14:57:53.749202
845	45	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749203	2026-01-08 14:57:53.749203
846	45	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749203	2026-01-08 14:57:53.749204
847	45	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749204	2026-01-08 14:57:53.749205
848	45	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749205	2026-01-08 14:57:53.749206
849	45	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749206	2026-01-08 14:57:53.749206
850	45	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749207	2026-01-08 14:57:53.749207
851	46	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749207	2026-01-08 14:57:53.749208
852	46	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749208	2026-01-08 14:57:53.749209
853	46	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749209	2026-01-08 14:57:53.749209
854	46	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.74921	2026-01-08 14:57:53.74921
855	46	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749211	2026-01-08 14:57:53.749211
856	46	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749211	2026-01-08 14:57:53.749212
857	46	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749212	2026-01-08 14:57:53.749212
858	46	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749213	2026-01-08 14:57:53.749213
859	46	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749214	2026-01-08 14:57:53.749214
860	46	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749215	2026-01-08 14:57:53.749215
861	46	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749216	2026-01-08 14:57:53.749216
862	46	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749216	2026-01-08 14:57:53.749217
863	46	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749217	2026-01-08 14:57:53.749217
864	46	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749218	2026-01-08 14:57:53.749218
865	46	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749218	2026-01-08 14:57:53.749219
866	46	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749219	2026-01-08 14:57:53.74922
867	46	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749221	2026-01-08 14:57:53.749221
868	46	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749221	2026-01-08 14:57:53.749222
869	46	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749222	2026-01-08 14:57:53.749222
870	46	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749223	2026-01-08 14:57:53.749223
871	46	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749224	2026-01-08 14:57:53.749224
872	47	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749224	2026-01-08 14:57:53.749224
873	47	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749225	2026-01-08 14:57:53.749225
874	47	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749225	2026-01-08 14:57:53.749226
875	47	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749226	2026-01-08 14:57:53.749227
876	47	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749227	2026-01-08 14:57:53.749227
877	47	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749227	2026-01-08 14:57:53.749228
878	47	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749228	2026-01-08 14:57:53.749228
879	47	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749229	2026-01-08 14:57:53.749229
880	47	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749229	2026-01-08 14:57:53.74923
881	47	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.74923	2026-01-08 14:57:53.749231
882	47	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749231	2026-01-08 14:57:53.749231
883	47	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749231	2026-01-08 14:57:53.749232
884	47	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749232	2026-01-08 14:57:53.749233
885	47	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749233	2026-01-08 14:57:53.749233
886	47	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749234	2026-01-08 14:57:53.749234
887	47	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749234	2026-01-08 14:57:53.749235
888	47	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749235	2026-01-08 14:57:53.749236
889	47	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749236	2026-01-08 14:57:53.749236
890	47	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749237	2026-01-08 14:57:53.749237
891	47	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749238	2026-01-08 14:57:53.749238
892	47	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749238	2026-01-08 14:57:53.749239
893	47	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749239	2026-01-08 14:57:53.749239
894	47	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.74924	2026-01-08 14:57:53.74924
895	47	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749241	2026-01-08 14:57:53.749241
896	47	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749241	2026-01-08 14:57:53.749242
897	47	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749242	2026-01-08 14:57:53.749242
898	47	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749243	2026-01-08 14:57:53.749243
899	48	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749243	2026-01-08 14:57:53.749244
900	48	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749244	2026-01-08 14:57:53.749244
901	48	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749245	2026-01-08 14:57:53.749245
902	48	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749245	2026-01-08 14:57:53.749246
903	48	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749246	2026-01-08 14:57:53.749246
904	48	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749247	2026-01-08 14:57:53.749247
905	48	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749247	2026-01-08 14:57:53.749248
906	48	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749248	2026-01-08 14:57:53.749248
907	48	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749249	2026-01-08 14:57:53.749249
908	48	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749249	2026-01-08 14:57:53.74925
909	48	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.74925	2026-01-08 14:57:53.74925
910	48	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749251	2026-01-08 14:57:53.749251
911	49	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749251	2026-01-08 14:57:53.749251
912	49	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749252	2026-01-08 14:57:53.749252
913	49	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749252	2026-01-08 14:57:53.749253
914	49	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749253	2026-01-08 14:57:53.749253
915	49	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749254	2026-01-08 14:57:53.749254
916	49	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749254	2026-01-08 14:57:53.749255
917	49	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749255	2026-01-08 14:57:53.749255
918	49	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749255	2026-01-08 14:57:53.749256
919	49	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749256	2026-01-08 14:57:53.749256
920	49	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749257	2026-01-08 14:57:53.749257
921	49	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749257	2026-01-08 14:57:53.749258
922	49	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749258	2026-01-08 14:57:53.749258
923	49	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749259	2026-01-08 14:57:53.749259
924	49	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.749259	2026-01-08 14:57:53.74926
925	49	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.74926	2026-01-08 14:57:53.74926
926	49	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:57:53.74926	2026-01-08 14:57:53.749261
927	49	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749261	2026-01-08 14:57:53.749261
928	49	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749262	2026-01-08 14:57:53.749262
929	49	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:57:53.749262	2026-01-08 14:57:53.749262
930	49	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:57:53.749263	2026-01-08 14:57:53.749263
931	29	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570691	2026-01-08 14:59:04.570695
932	29	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570696	2026-01-08 14:59:04.570696
933	29	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570696	2026-01-08 14:59:04.570697
934	29	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570697	2026-01-08 14:59:04.570697
935	29	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570697	2026-01-08 14:59:04.570698
936	29	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570698	2026-01-08 14:59:04.570698
937	29	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570699	2026-01-08 14:59:04.570699
938	29	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570699	2026-01-08 14:59:04.5707
939	29	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.5707	2026-01-08 14:59:04.5707
940	29	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.5707	2026-01-08 14:59:04.570701
941	29	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570701	2026-01-08 14:59:04.570701
942	29	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570701	2026-01-08 14:59:04.570702
943	29	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570702	2026-01-08 14:59:04.570702
944	29	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570703	2026-01-08 14:59:04.570703
945	30	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570703	2026-01-08 14:59:04.570703
946	30	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570704	2026-01-08 14:59:04.570704
947	30	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570704	2026-01-08 14:59:04.570704
948	30	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570705	2026-01-08 14:59:04.570705
949	30	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570705	2026-01-08 14:59:04.570706
950	30	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570706	2026-01-08 14:59:04.570706
951	30	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570707	2026-01-08 14:59:04.570707
952	30	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570708	2026-01-08 14:59:04.570708
953	30	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570708	2026-01-08 14:59:04.570709
954	30	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570709	2026-01-08 14:59:04.570709
955	30	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570709	2026-01-08 14:59:04.57071
956	30	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.57071	2026-01-08 14:59:04.57071
957	30	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.57071	2026-01-08 14:59:04.570711
958	30	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570711	2026-01-08 14:59:04.570711
959	30	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570711	2026-01-08 14:59:04.570712
960	30	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570712	2026-01-08 14:59:04.570712
961	30	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570712	2026-01-08 14:59:04.570713
962	30	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570713	2026-01-08 14:59:04.570713
963	30	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570713	2026-01-08 14:59:04.570714
964	30	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570714	2026-01-08 14:59:04.570714
965	30	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570714	2026-01-08 14:59:04.570715
966	30	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570715	2026-01-08 14:59:04.570715
967	31	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570715	2026-01-08 14:59:04.570716
968	31	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570716	2026-01-08 14:59:04.570716
969	31	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570716	2026-01-08 14:59:04.570717
970	31	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570717	2026-01-08 14:59:04.570717
971	31	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570717	2026-01-08 14:59:04.570718
972	31	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570718	2026-01-08 14:59:04.570718
973	31	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570718	2026-01-08 14:59:04.570719
974	31	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570719	2026-01-08 14:59:04.570719
975	31	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570719	2026-01-08 14:59:04.57072
976	31	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.57072	2026-01-08 14:59:04.57072
977	31	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.57072	2026-01-08 14:59:04.570721
978	31	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570721	2026-01-08 14:59:04.570721
979	31	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570722	2026-01-08 14:59:04.570722
980	31	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570722	2026-01-08 14:59:04.570722
981	31	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570723	2026-01-08 14:59:04.570723
982	31	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570723	2026-01-08 14:59:04.570723
983	31	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570724	2026-01-08 14:59:04.570724
984	31	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570724	2026-01-08 14:59:04.570724
985	31	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570725	2026-01-08 14:59:04.570725
986	31	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570725	2026-01-08 14:59:04.570726
987	32	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570726	2026-01-08 14:59:04.570726
988	32	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570726	2026-01-08 14:59:04.570727
989	32	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570727	2026-01-08 14:59:04.570727
990	32	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570728	2026-01-08 14:59:04.570728
991	32	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570728	2026-01-08 14:59:04.570728
992	32	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570729	2026-01-08 14:59:04.570729
993	32	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570729	2026-01-08 14:59:04.570729
994	32	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.57073	2026-01-08 14:59:04.57073
996	32	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570731	2026-01-08 14:59:04.570731
997	32	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570731	2026-01-08 14:59:04.570731
998	32	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570731	2026-01-08 14:59:04.570732
999	32	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570732	2026-01-08 14:59:04.570732
1000	32	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570733	2026-01-08 14:59:04.570733
1001	32	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570733	2026-01-08 14:59:04.570733
1002	32	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570734	2026-01-08 14:59:04.570734
1003	32	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570734	2026-01-08 14:59:04.570734
1004	32	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570735	2026-01-08 14:59:04.570735
1005	32	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570735	2026-01-08 14:59:04.570735
1006	32	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570736	2026-01-08 14:59:04.570736
1007	32	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570736	2026-01-08 14:59:04.570736
1008	32	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570737	2026-01-08 14:59:04.570737
1009	32	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570737	2026-01-08 14:59:04.570738
1010	33	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570738	2026-01-08 14:59:04.570738
1011	33	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570738	2026-01-08 14:59:04.570739
1012	33	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570739	2026-01-08 14:59:04.570739
1013	33	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570739	2026-01-08 14:59:04.57074
1014	33	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.57074	2026-01-08 14:59:04.57074
1015	33	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.57074	2026-01-08 14:59:04.570741
1016	33	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570741	2026-01-08 14:59:04.570741
1017	33	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570742	2026-01-08 14:59:04.570742
1018	33	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570742	2026-01-08 14:59:04.570742
1019	33	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570743	2026-01-08 14:59:04.570743
1020	33	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570743	2026-01-08 14:59:04.570743
1021	33	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570743	2026-01-08 14:59:04.570744
1022	33	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570744	2026-01-08 14:59:04.570744
1023	33	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570744	2026-01-08 14:59:04.570745
1024	33	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570745	2026-01-08 14:59:04.570745
1025	33	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570745	2026-01-08 14:59:04.570746
1026	33	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570746	2026-01-08 14:59:04.570746
1027	33	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570746	2026-01-08 14:59:04.570747
1028	33	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570747	2026-01-08 14:59:04.570747
1029	33	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570747	2026-01-08 14:59:04.570748
1030	33	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570748	2026-01-08 14:59:04.570748
1031	33	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570748	2026-01-08 14:59:04.570749
1032	33	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570749	2026-01-08 14:59:04.570749
1033	33	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570749	2026-01-08 14:59:04.57075
1034	33	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.57075	2026-01-08 14:59:04.57075
1035	33	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.57075	2026-01-08 14:59:04.570751
1036	33	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570751	2026-01-08 14:59:04.570751
1037	33	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:04.570751	2026-01-08 14:59:04.570752
1038	33	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:04.570752	2026-01-08 14:59:04.570752
1039	33	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:04.570752	2026-01-08 14:59:04.570753
1040	37	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000967	2026-01-08 14:59:09.000971
1041	37	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000972	2026-01-08 14:59:09.000972
1042	37	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000972	2026-01-08 14:59:09.000972
1043	37	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000973	2026-01-08 14:59:09.000973
1044	37	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000974	2026-01-08 14:59:09.000974
1045	37	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000974	2026-01-08 14:59:09.000974
1046	37	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000975	2026-01-08 14:59:09.000975
1047	37	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000975	2026-01-08 14:59:09.000975
1048	37	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000976	2026-01-08 14:59:09.000976
1049	37	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000976	2026-01-08 14:59:09.000976
1050	37	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000977	2026-01-08 14:59:09.000977
1051	37	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000977	2026-01-08 14:59:09.000977
1052	37	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000978	2026-01-08 14:59:09.000978
1053	37	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000978	2026-01-08 14:59:09.000978
1054	37	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000979	2026-01-08 14:59:09.000979
1055	37	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000979	2026-01-08 14:59:09.000979
1056	37	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.00098	2026-01-08 14:59:09.00098
1057	37	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.00098	2026-01-08 14:59:09.00098
1058	38	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000981	2026-01-08 14:59:09.000981
1059	38	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000981	2026-01-08 14:59:09.000981
1060	38	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000982	2026-01-08 14:59:09.000982
1061	38	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000982	2026-01-08 14:59:09.000982
1062	38	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000983	2026-01-08 14:59:09.000983
1063	38	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000983	2026-01-08 14:59:09.000983
1064	38	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000984	2026-01-08 14:59:09.000984
1065	38	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000984	2026-01-08 14:59:09.000984
1066	38	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000985	2026-01-08 14:59:09.000985
1067	38	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000985	2026-01-08 14:59:09.000985
1068	38	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000986	2026-01-08 14:59:09.000986
1069	38	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000986	2026-01-08 14:59:09.000986
1070	38	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000987	2026-01-08 14:59:09.000987
1071	38	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000987	2026-01-08 14:59:09.000987
1072	38	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000988	2026-01-08 14:59:09.000988
1073	38	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000988	2026-01-08 14:59:09.000988
1074	38	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000989	2026-01-08 14:59:09.000989
1075	38	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000989	2026-01-08 14:59:09.000989
1076	38	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.00099	2026-01-08 14:59:09.00099
1077	38	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.00099	2026-01-08 14:59:09.00099
1078	38	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000991	2026-01-08 14:59:09.000991
1079	38	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000991	2026-01-08 14:59:09.000991
1080	38	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000992	2026-01-08 14:59:09.000992
1081	38	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000992	2026-01-08 14:59:09.000993
1082	38	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000993	2026-01-08 14:59:09.000993
1083	38	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000994	2026-01-08 14:59:09.000994
1084	38	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000994	2026-01-08 14:59:09.000994
1085	38	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000995	2026-01-08 14:59:09.000995
1086	38	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000995	2026-01-08 14:59:09.000995
1087	39	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000996	2026-01-08 14:59:09.000996
1088	39	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.000996	2026-01-08 14:59:09.000996
1089	39	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000997	2026-01-08 14:59:09.000997
1090	39	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000997	2026-01-08 14:59:09.000997
1091	39	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000998	2026-01-08 14:59:09.000998
1092	39	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000998	2026-01-08 14:59:09.000998
1093	39	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.000999	2026-01-08 14:59:09.000999
1094	39	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.000999	2026-01-08 14:59:09.000999
1095	39	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001	2026-01-08 14:59:09.001
1096	39	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001	2026-01-08 14:59:09.001
1097	39	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.001	2026-01-08 14:59:09.001001
1098	39	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001001	2026-01-08 14:59:09.001001
1099	39	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001001	2026-01-08 14:59:09.001002
1100	40	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.001002	2026-01-08 14:59:09.001002
1101	40	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001002	2026-01-08 14:59:09.001003
1102	40	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001003	2026-01-08 14:59:09.001003
1103	40	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001003	2026-01-08 14:59:09.001004
1104	40	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001004	2026-01-08 14:59:09.001004
1105	40	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.001004	2026-01-08 14:59:09.001005
1106	40	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.001005	2026-01-08 14:59:09.001005
1107	40	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001005	2026-01-08 14:59:09.001006
1108	40	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001006	2026-01-08 14:59:09.001006
1109	40	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001006	2026-01-08 14:59:09.001007
1110	41	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001007	2026-01-08 14:59:09.001007
1111	41	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001007	2026-01-08 14:59:09.001008
1112	41	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.001008	2026-01-08 14:59:09.001008
1113	41	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001008	2026-01-08 14:59:09.001009
1114	41	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001009	2026-01-08 14:59:09.001009
1115	41	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001009	2026-01-08 14:59:09.00101
1116	41	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.00101	2026-01-08 14:59:09.00101
1117	41	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.00101	2026-01-08 14:59:09.001011
1118	41	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001011	2026-01-08 14:59:09.001011
1119	41	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.001011	2026-01-08 14:59:09.001011
1120	41	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001012	2026-01-08 14:59:09.001012
1121	41	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001012	2026-01-08 14:59:09.001012
1122	41	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001013	2026-01-08 14:59:09.001013
1123	41	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001013	2026-01-08 14:59:09.001013
1124	41	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001014	2026-01-08 14:59:09.001014
1125	41	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001014	2026-01-08 14:59:09.001014
1126	41	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001015	2026-01-08 14:59:09.001015
1127	41	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001015	2026-01-08 14:59:09.001015
1128	41	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001016	2026-01-08 14:59:09.001016
1129	41	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001016	2026-01-08 14:59:09.001016
1130	41	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:09.001017	2026-01-08 14:59:09.001017
1131	41	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:09.001017	2026-01-08 14:59:09.001017
1132	41	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:09.001018	2026-01-08 14:59:09.001018
1133	45	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437779	2026-01-08 14:59:13.437784
1134	45	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437785	2026-01-08 14:59:13.437785
1135	45	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437785	2026-01-08 14:59:13.437786
1136	45	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437786	2026-01-08 14:59:13.437786
1137	45	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437787	2026-01-08 14:59:13.437787
1138	45	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437787	2026-01-08 14:59:13.437787
1139	45	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437788	2026-01-08 14:59:13.437788
1140	45	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437788	2026-01-08 14:59:13.437789
1141	45	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437789	2026-01-08 14:59:13.437789
1142	45	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437789	2026-01-08 14:59:13.43779
1143	45	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.43779	2026-01-08 14:59:13.43779
1144	45	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437791	2026-01-08 14:59:13.437791
1145	45	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437791	2026-01-08 14:59:13.437791
1146	45	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437792	2026-01-08 14:59:13.437792
1147	45	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437792	2026-01-08 14:59:13.437792
1148	45	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437793	2026-01-08 14:59:13.437793
1149	45	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437793	2026-01-08 14:59:13.437793
1150	45	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437794	2026-01-08 14:59:13.437794
1151	45	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437794	2026-01-08 14:59:13.437794
1152	45	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437795	2026-01-08 14:59:13.437795
1153	45	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437795	2026-01-08 14:59:13.437795
1154	45	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437796	2026-01-08 14:59:13.437796
1155	45	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437796	2026-01-08 14:59:13.437796
1156	46	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437797	2026-01-08 14:59:13.437797
1157	46	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437797	2026-01-08 14:59:13.437797
1158	46	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437798	2026-01-08 14:59:13.437798
1159	46	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437798	2026-01-08 14:59:13.437798
1160	46	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437799	2026-01-08 14:59:13.437799
1161	46	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437799	2026-01-08 14:59:13.437799
1162	46	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.4378	2026-01-08 14:59:13.4378
1163	46	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.4378	2026-01-08 14:59:13.4378
1164	46	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437801	2026-01-08 14:59:13.437801
1165	46	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437801	2026-01-08 14:59:13.437801
1166	46	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437802	2026-01-08 14:59:13.437802
1167	46	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437802	2026-01-08 14:59:13.437802
1168	46	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437803	2026-01-08 14:59:13.437803
1169	46	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437803	2026-01-08 14:59:13.437803
1170	46	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437804	2026-01-08 14:59:13.437804
1171	46	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437804	2026-01-08 14:59:13.437804
1172	46	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437805	2026-01-08 14:59:13.437805
1173	46	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437805	2026-01-08 14:59:13.437805
1174	46	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437806	2026-01-08 14:59:13.437806
1175	46	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437806	2026-01-08 14:59:13.437806
1176	46	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437807	2026-01-08 14:59:13.437807
1177	46	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437807	2026-01-08 14:59:13.437807
1178	46	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437808	2026-01-08 14:59:13.437808
1179	46	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437808	2026-01-08 14:59:13.437809
1180	46	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437809	2026-01-08 14:59:13.437809
1181	46	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437809	2026-01-08 14:59:13.43781
1182	46	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.43781	2026-01-08 14:59:13.43781
1183	47	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437811	2026-01-08 14:59:13.437811
1184	47	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437811	2026-01-08 14:59:13.437811
1185	47	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437812	2026-01-08 14:59:13.437812
1186	47	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437812	2026-01-08 14:59:13.437812
1187	47	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437813	2026-01-08 14:59:13.437813
1188	47	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437813	2026-01-08 14:59:13.437813
1189	47	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437814	2026-01-08 14:59:13.437814
1190	47	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437814	2026-01-08 14:59:13.437814
1191	47	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437815	2026-01-08 14:59:13.437815
1192	47	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437815	2026-01-08 14:59:13.437815
1193	47	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437816	2026-01-08 14:59:13.437816
1194	47	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437816	2026-01-08 14:59:13.437816
1195	47	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437817	2026-01-08 14:59:13.437817
1196	47	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437817	2026-01-08 14:59:13.437817
1197	47	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437818	2026-01-08 14:59:13.437818
1198	47	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437818	2026-01-08 14:59:13.437818
1199	47	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437819	2026-01-08 14:59:13.437819
1200	47	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437819	2026-01-08 14:59:13.43782
1201	47	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.43782	2026-01-08 14:59:13.43782
1202	47	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.43782	2026-01-08 14:59:13.437821
1203	47	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437821	2026-01-08 14:59:13.437821
1204	47	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437821	2026-01-08 14:59:13.437822
1205	47	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437822	2026-01-08 14:59:13.437822
1206	47	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437822	2026-01-08 14:59:13.437823
1207	47	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437823	2026-01-08 14:59:13.437823
1208	47	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437823	2026-01-08 14:59:13.437824
1209	47	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437824	2026-01-08 14:59:13.437824
1210	48	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437824	2026-01-08 14:59:13.437825
1211	48	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437825	2026-01-08 14:59:13.437825
1212	48	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437825	2026-01-08 14:59:13.437826
1213	48	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437826	2026-01-08 14:59:13.437826
1214	48	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437826	2026-01-08 14:59:13.437827
1215	48	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437827	2026-01-08 14:59:13.437827
1216	48	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437827	2026-01-08 14:59:13.437828
1217	48	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437828	2026-01-08 14:59:13.437828
1218	48	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437828	2026-01-08 14:59:13.437829
1219	48	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437829	2026-01-08 14:59:13.437829
1220	48	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.43783	2026-01-08 14:59:13.43783
1221	48	25	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.43783	2026-01-08 14:59:13.43783
1222	48	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437831	2026-01-08 14:59:13.437831
1223	48	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437831	2026-01-08 14:59:13.437831
1224	48	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437832	2026-01-08 14:59:13.437832
1225	48	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437832	2026-01-08 14:59:13.437832
1226	48	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437833	2026-01-08 14:59:13.437833
1227	48	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437833	2026-01-08 14:59:13.437833
1228	48	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437834	2026-01-08 14:59:13.437834
1229	48	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437834	2026-01-08 14:59:13.437834
1230	48	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437835	2026-01-08 14:59:13.437835
1231	48	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437835	2026-01-08 14:59:13.437835
1232	48	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437836	2026-01-08 14:59:13.437836
1233	48	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437836	2026-01-08 14:59:13.437836
1234	48	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437837	2026-01-08 14:59:13.437837
1235	48	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437837	2026-01-08 14:59:13.437837
1236	48	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437838	2026-01-08 14:59:13.437838
1237	48	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437838	2026-01-08 14:59:13.437838
1238	48	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437839	2026-01-08 14:59:13.437839
1239	49	100	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437839	2026-01-08 14:59:13.437839
1240	49	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.43784	2026-01-08 14:59:13.43784
1241	49	100	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.43784	2026-01-08 14:59:13.43784
1242	49	100	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437841	2026-01-08 14:59:13.437841
1243	49	50	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437841	2026-01-08 14:59:13.437841
1244	49	50	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437842	2026-01-08 14:59:13.437842
1245	49	25	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437842	2026-01-08 14:59:13.437842
1246	49	10	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437843	2026-01-08 14:59:13.437843
1247	49	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437843	2026-01-08 14:59:13.437843
1248	49	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437844	2026-01-08 14:59:13.437844
1249	49	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437844	2026-01-08 14:59:13.437844
1250	49	10	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437845	2026-01-08 14:59:13.437845
1251	49	50	card_won	Pontos por card won	\N	\N	2026-01-08 14:59:13.437845	2026-01-08 14:59:13.437845
1252	49	10	card_moved	Pontos por card moved	\N	\N	2026-01-08 14:59:13.437846	2026-01-08 14:59:13.437846
1253	49	25	card_created	Pontos por card created	\N	\N	2026-01-08 14:59:13.437846	2026-01-08 14:59:13.437846
\.


--
-- Data for Name: gamification_rankings; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.gamification_rankings (id, user_id, period_type, period_start, period_end, rank, points, cards_won, created_at, updated_at, account_id) FROM stdin;
31	32	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	1	496	9	2026-01-08 14:57:43.655663	2026-01-08 14:57:43.655666	5
32	29	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	2	396	7	2026-01-08 14:57:43.655666	2026-01-08 14:57:43.655667	5
33	30	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	3	320	6	2026-01-08 14:57:43.655667	2026-01-08 14:57:43.655667	5
34	33	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	4	266	5	2026-01-08 14:57:43.655667	2026-01-08 14:57:43.655668	5
35	31	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	5	108	2	2026-01-08 14:57:43.655668	2026-01-08 14:57:43.655668	5
36	32	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	1	1984	39	2026-01-08 14:57:43.655668	2026-01-08 14:57:43.655669	5
37	29	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	2	1584	31	2026-01-08 14:57:43.655669	2026-01-08 14:57:43.655669	5
38	30	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	3	1280	25	2026-01-08 14:57:43.655669	2026-01-08 14:57:43.65567	5
39	33	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	4	1064	21	2026-01-08 14:57:43.65567	2026-01-08 14:57:43.65567	5
40	31	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	5	432	8	2026-01-08 14:57:43.655671	2026-01-08 14:57:43.655671	5
41	41	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	1	449	8	2026-01-08 14:57:48.116626	2026-01-08 14:57:48.11663	6
42	37	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	2	243	4	2026-01-08 14:57:48.11663	2026-01-08 14:57:48.11663	6
43	38	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	3	242	4	2026-01-08 14:57:48.116631	2026-01-08 14:57:48.116631	6
44	40	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	4	164	3	2026-01-08 14:57:48.116631	2026-01-08 14:57:48.116632	6
45	39	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	5	154	3	2026-01-08 14:57:48.116632	2026-01-08 14:57:48.116632	6
46	41	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	1	1796	35	2026-01-08 14:57:48.116632	2026-01-08 14:57:48.116632	6
47	37	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	2	972	19	2026-01-08 14:57:48.116633	2026-01-08 14:57:48.116633	6
48	38	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	3	968	19	2026-01-08 14:57:48.116633	2026-01-08 14:57:48.116633	6
49	40	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	4	656	13	2026-01-08 14:57:48.116634	2026-01-08 14:57:48.116634	6
50	39	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	5	616	12	2026-01-08 14:57:48.116634	2026-01-08 14:57:48.116635	6
51	48	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	1	438	8	2026-01-08 14:57:55.032898	2026-01-08 14:57:55.032902	7
52	47	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	2	361	7	2026-01-08 14:57:55.032902	2026-01-08 14:57:55.032902	7
53	49	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	3	245	4	2026-01-08 14:57:55.032903	2026-01-08 14:57:55.032903	7
54	46	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	4	149	2	2026-01-08 14:57:55.032903	2026-01-08 14:57:55.032904	7
55	45	weekly	2026-01-05 00:00:00	2026-01-11 23:59:59	5	135	2	2026-01-08 14:57:55.032904	2026-01-08 14:57:55.032904	7
56	48	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	1	1752	35	2026-01-08 14:57:55.032904	2026-01-08 14:57:55.032905	7
57	47	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	2	1444	28	2026-01-08 14:57:55.032905	2026-01-08 14:57:55.032905	7
58	49	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	3	980	19	2026-01-08 14:57:55.032905	2026-01-08 14:57:55.032906	7
59	46	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	4	596	11	2026-01-08 14:57:55.032906	2026-01-08 14:57:55.032906	7
60	45	monthly	2026-01-01 00:00:00	2026-01-31 23:59:59	5	540	10	2026-01-08 14:57:55.032906	2026-01-08 14:57:55.032906	7
\.


--
-- Data for Name: lists; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.lists (id, board_id, name, "position", is_done_stage, is_lost_stage, created_at, updated_at) FROM stdin;
31	7	Novos Leads	0	f	f	2026-01-08 14:57:05.696118	2026-01-08 14:57:05.696122
32	7	Qualificação	1	f	f	2026-01-08 14:57:05.696123	2026-01-08 14:57:05.696123
33	7	Proposta Enviada	2	f	f	2026-01-08 14:57:05.696123	2026-01-08 14:57:05.696124
34	7	Negociação	3	f	f	2026-01-08 14:57:05.696124	2026-01-08 14:57:05.696124
35	7	Ganho	4	t	f	2026-01-08 14:57:05.696124	2026-01-08 14:57:05.696125
36	7	Perdido	5	f	t	2026-01-08 14:57:05.696125	2026-01-08 14:57:05.696125
37	8	Novo Ticket	0	f	f	2026-01-08 14:57:06.709941	2026-01-08 14:57:06.709944
38	8	Em Andamento	1	f	f	2026-01-08 14:57:06.709945	2026-01-08 14:57:06.709945
39	8	Aguardando Cliente	2	f	f	2026-01-08 14:57:06.709945	2026-01-08 14:57:06.709946
40	8	Resolvido	3	t	f	2026-01-08 14:57:06.709946	2026-01-08 14:57:06.709946
41	9	Novos Leads	0	f	f	2026-01-08 14:57:07.786684	2026-01-08 14:57:07.786689
42	9	Qualificação	1	f	f	2026-01-08 14:57:07.78669	2026-01-08 14:57:07.78669
43	9	Proposta Enviada	2	f	f	2026-01-08 14:57:07.786691	2026-01-08 14:57:07.786691
44	9	Negociação	3	f	f	2026-01-08 14:57:07.786692	2026-01-08 14:57:07.786692
45	9	Ganho	4	t	f	2026-01-08 14:57:07.786693	2026-01-08 14:57:07.786693
46	9	Perdido	5	f	t	2026-01-08 14:57:07.786693	2026-01-08 14:57:07.786693
47	10	Novo Ticket	0	f	f	2026-01-08 14:57:08.737321	2026-01-08 14:57:08.737324
48	10	Em Andamento	1	f	f	2026-01-08 14:57:08.737325	2026-01-08 14:57:08.737325
49	10	Aguardando Cliente	2	f	f	2026-01-08 14:57:08.737325	2026-01-08 14:57:08.737326
50	10	Resolvido	3	t	f	2026-01-08 14:57:08.737326	2026-01-08 14:57:08.737326
51	11	Novos Leads	0	f	f	2026-01-08 14:57:09.812785	2026-01-08 14:57:09.812789
52	11	Qualificação	1	f	f	2026-01-08 14:57:09.812789	2026-01-08 14:57:09.812789
53	11	Proposta Enviada	2	f	f	2026-01-08 14:57:09.81279	2026-01-08 14:57:09.81279
54	11	Negociação	3	f	f	2026-01-08 14:57:09.81279	2026-01-08 14:57:09.81279
55	11	Ganho	4	t	f	2026-01-08 14:57:09.812791	2026-01-08 14:57:09.812791
56	11	Perdido	5	f	t	2026-01-08 14:57:09.812791	2026-01-08 14:57:09.812791
57	12	Novo Ticket	0	f	f	2026-01-08 14:57:10.763392	2026-01-08 14:57:10.763396
58	12	Em Andamento	1	f	f	2026-01-08 14:57:10.763397	2026-01-08 14:57:10.763397
59	12	Aguardando Cliente	2	f	f	2026-01-08 14:57:10.763398	2026-01-08 14:57:10.763398
60	12	Resolvido	3	t	f	2026-01-08 14:57:10.763398	2026-01-08 14:57:10.763399
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.notifications (id, user_id, notification_type, title, message, icon, color, notification_metadata, is_read, read_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.roles (id, name, display_name, description, permissions, is_system_role, created_at, updated_at) FROM stdin;
2	admin	Administrador	Administrador do sistema - acesso total	["users.create", "users.read", "users.update", "users.delete", "boards.create", "boards.read", "boards.update", "boards.delete", "cards.create", "cards.read", "cards.update", "cards.delete", "automations.create", "automations.read", "automations.update", "automations.delete", "transfers.approve", "transfers.reject", "reports.read", "reports.export", "admin.access", "admin.database"]	f	2026-01-05 18:09:24.169463	2026-01-05 18:09:24.169469
3	manager	Gerente	Gerente - pode gerenciar equipe e aprovar transferências	["users.read", "boards.create", "boards.read", "boards.update", "cards.create", "cards.read", "cards.update", "cards.delete", "automations.create", "automations.read", "automations.update", "transfers.approve", "transfers.reject", "reports.read", "reports.export"]	f	2026-01-05 18:09:24.169471	2026-01-05 18:09:24.169472
4	salesperson	Vendedor	Vendedor - pode gerenciar seus próprios cards	["boards.read", "cards.create", "cards.read", "cards.update", "reports.read"]	f	2026-01-05 18:09:24.169473	2026-01-05 18:09:24.169474
\.


--
-- Data for Name: transfer_approvals; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.transfer_approvals (id, transfer_id, approver_id, status, expires_at, decided_at, comments, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_badges; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.user_badges (id, user_id, badge_id, awarded_by_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: administrador
--

COPY public.users (id, account_id, role_id, email, username, name, password_hash, is_active, is_verified, last_login_at, password_changed_at, avatar_url, created_at, updated_at, deleted_at, is_deleted, phone, reset_token, reset_token_expires_at) FROM stdin;
1	1	2	admin@hsgrowth.com	admin	Administrador	$2b$12$FEWIqYUT6tF/XxcmyT8oDeyWXVJFxW/JuJko41n6eaPTGCrqCNwza	t	f	2026-01-09 12:40:41.421283	\N	\N	2026-01-05 18:09:25.045082	2026-01-09 12:40:41.421933	\N	f	\N	\N	\N
37	1	4	vendedor1@marketingpro.com	\N	Gabriela Lima	$2b$12$tqY6ve7v4EFoSpuovOabm.eRW8IhitY.4a7v8NsEw8okfxwgqWNne	t	f	\N	\N	\N	2026-01-08 14:56:53.630107	2026-01-08 14:56:53.630107	\N	f	11 0913 9421	\N	\N
38	1	4	vendedor2@marketingpro.com	\N	Nicole Lima	$2b$12$nsAt5lU2iD0sq91hComaEuNUKBUjd2PT3Dh8KY3ng1WPI6agKljzO	t	f	\N	\N	\N	2026-01-08 14:56:53.630108	2026-01-08 14:56:53.630108	\N	f	+55 (061) 1376-2105	\N	\N
26	1	2	admin@techsolutions.com	\N	Admin Tech Solutions	$2b$12$VfIXAFbBa0lA.fw5YU7pFeXoX0C7KLPmisu5LdUHMG7xSP5T9iKmm	t	f	\N	\N	\N	2026-01-08 14:56:53.630097	2026-01-08 14:56:53.6301	\N	f	11 9213-2440	\N	\N
27	1	3	manager1@techsolutions.com	\N	Daniela Farias	$2b$12$YwYEYkZmwj7M3feIfsNiuOKW/HqzHZ9hCuoqv1RlRnAiDOMQLyuw.	t	f	\N	\N	\N	2026-01-08 14:56:53.630101	2026-01-08 14:56:53.630101	\N	f	0500 434 3285	\N	\N
28	1	3	manager2@techsolutions.com	\N	Bianca da Cunha	$2b$12$VhcPuNu1diyzhzbOjAyxCOkL14eYkcG1YlVCuXvRw6T2X7nWlE9ca	t	f	\N	\N	\N	2026-01-08 14:56:53.630102	2026-01-08 14:56:53.630102	\N	f	0800 645 5760	\N	\N
29	1	4	vendedor1@techsolutions.com	\N	Dr. Thomas Nascimento	$2b$12$yuG/P/FuosgNGubho93k0OAwFzPBVtzbNGDd4PdX.pTpySxw3cAcG	t	f	\N	\N	\N	2026-01-08 14:56:53.630102	2026-01-08 14:56:53.630103	\N	f	61 4557-8193	\N	\N
30	1	4	vendedor2@techsolutions.com	\N	Murilo Farias	$2b$12$VT47dN6o0CmHQvHrPx8DaeKG.z.3fjbQsO/yFpKc8HOXyenWq45Oq	t	f	\N	\N	\N	2026-01-08 14:56:53.630103	2026-01-08 14:56:53.630103	\N	f	+55 (041) 9066 9345	\N	\N
31	1	4	vendedor3@techsolutions.com	\N	Maitê Santos	$2b$12$lldcJYXrRjhAnP1k13nYyeoY5zVnF7MNmV4AXifPT/dpwGJaTyvpS	t	f	\N	\N	\N	2026-01-08 14:56:53.630103	2026-01-08 14:56:53.630104	\N	f	(081) 4680 6940	\N	\N
32	1	4	vendedor4@techsolutions.com	\N	Caroline da Luz	$2b$12$..Qo8X3l9OAJDZfRKT8ZmuFrYFqSZ0RH0xY86Den.50sRrVhVfX4O	t	f	\N	\N	\N	2026-01-08 14:56:53.630104	2026-01-08 14:56:53.630104	\N	f	81 1546 2485	\N	\N
33	1	4	vendedor5@techsolutions.com	\N	Enzo Gabriel Gonçalves	$2b$12$YWlA144y4RqtI6rfcpxTM..wdS/pmOrl1GzduNZmp4kLYw2mL.hyi	t	f	\N	\N	\N	2026-01-08 14:56:53.630105	2026-01-08 14:56:53.630105	\N	f	+55 61 4404 2353	\N	\N
34	1	2	admin@marketingpro.com	\N	Admin Marketing Pro	$2b$12$bTlbNt1X7Wrn5ydNM8s49utn0om01sXrWn65C6WzouVnrr4vMGkrK	t	f	\N	\N	\N	2026-01-08 14:56:53.630105	2026-01-08 14:56:53.630106	\N	f	0500-070-3586	\N	\N
35	1	3	manager1@marketingpro.com	\N	André Campos	$2b$12$d6tE868KAyMCLzmukgmQGe/woxRqlxKerXhjFZEtLv4Nw.fJ.JKiO	t	f	\N	\N	\N	2026-01-08 14:56:53.630106	2026-01-08 14:56:53.630106	\N	f	+55 (031) 0480-8210	\N	\N
36	1	3	manager2@marketingpro.com	\N	Sra. Sabrina da Costa	$2b$12$JmwJhz/o6d5CK/x7QQ.FsOha.x99hYBIY5bYFRaH.0.tMZj0aHPqi	t	f	\N	\N	\N	2026-01-08 14:56:53.630106	2026-01-08 14:56:53.630107	\N	f	(041) 0445 9256	\N	\N
39	1	4	vendedor3@marketingpro.com	\N	Diego Souza	$2b$12$ZcK0vY8ODxDNTLLk7uTICOrBFFZD92ULuZpFOv02KpaQuepK7AA6u	t	f	\N	\N	\N	2026-01-08 14:56:53.630108	2026-01-08 14:56:53.630109	\N	f	+55 31 2001-3610	\N	\N
40	1	4	vendedor4@marketingpro.com	\N	Lara Rezende	$2b$12$lusNboTTAFf0pNJkHdkYKO.AOsQmAZsz5kqA.udL1V77nS1Aq02XW	t	f	\N	\N	\N	2026-01-08 14:56:53.630109	2026-01-08 14:56:53.630109	\N	f	+55 (061) 0370 6864	\N	\N
41	1	4	vendedor5@marketingpro.com	\N	Sofia Duarte	$2b$12$IkKoGT/E6aAdUEEdIYcPxuahUsJanBI.Ba408JwbBV3DXUuhadWxS	t	f	\N	\N	\N	2026-01-08 14:56:53.630109	2026-01-08 14:56:53.63011	\N	f	+55 41 2515-1924	\N	\N
42	1	2	admin@salesmasters.com	\N	Admin Sales Masters	$2b$12$VusY/A08XI4Xjne/ZHql1uGayb6O6N2wm5LHT4kqsDCdxwOD228A6	t	f	\N	\N	\N	2026-01-08 14:56:53.63011	2026-01-08 14:56:53.63011	\N	f	71 9941-1398	\N	\N
43	1	3	manager1@salesmasters.com	\N	Dr. Felipe Sales	$2b$12$CiAIw95VLor5zDsALpDu1uUvI0oElHu1g7xQB9UWlKN7ozwGngo9y	t	f	\N	\N	\N	2026-01-08 14:56:53.630111	2026-01-08 14:56:53.630111	\N	f	(011) 6711 9999	\N	\N
44	1	3	manager2@salesmasters.com	\N	Lara Silva	$2b$12$5KdbrI0ysNVoXb5gl6tw6.xMI2bwWVBUY1iw7Smj1V6sdyKJNLjTy	t	f	\N	\N	\N	2026-01-08 14:56:53.630111	2026-01-08 14:56:53.630112	\N	f	+55 (031) 1579-6681	\N	\N
45	1	4	vendedor1@salesmasters.com	\N	Sr. Pedro Miguel Gomes	$2b$12$QtwaTOKU5Ph8gYpso.iOluKwQ0TE9FGrZta6z6mc2fsw3/6BA53um	t	f	\N	\N	\N	2026-01-08 14:56:53.630112	2026-01-08 14:56:53.630112	\N	f	+55 71 1717 9541	\N	\N
46	1	4	vendedor2@salesmasters.com	\N	Sra. Manuela Peixoto	$2b$12$jWouN6CA1CbBDBdwyEC6/OlwcUA/Kcjfza6z9lfu6hqxw3m0Pe9oa	t	f	\N	\N	\N	2026-01-08 14:56:53.630112	2026-01-08 14:56:53.630113	\N	f	(011) 7391 7972	\N	\N
47	1	4	vendedor3@salesmasters.com	\N	João Lucas Castro	$2b$12$I17q3hf70t6PXUIJQFNp6OJFUGwI67kqES/AGFaPM/Wf/rLAa4R22	t	f	\N	\N	\N	2026-01-08 14:56:53.630113	2026-01-08 14:56:53.630113	\N	f	+55 61 0482 1367	\N	\N
48	1	4	vendedor4@salesmasters.com	\N	Bianca Azevedo	$2b$12$RuYPC462P4i5qgORw0U1Z.sN0NDJh/OFFpZkZPx3OorGlcoR3mgRW	t	f	\N	\N	\N	2026-01-08 14:56:53.630114	2026-01-08 14:56:53.630114	\N	f	+55 11 5545-2616	\N	\N
49	1	4	vendedor5@salesmasters.com	\N	Vitor Hugo Campos	$2b$12$r3JxWKCZ3ZQ10M8rJgfgzu8sOLjtcwoLhveaHIS1xMsOCTxRXHJZi	t	f	\N	\N	\N	2026-01-08 14:56:53.630114	2026-01-08 14:56:53.630115	\N	f	+55 (031) 7536-6580	\N	\N
\.


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.accounts_id_seq', 7, true);


--
-- Name: activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.activities_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: automation_executions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.automation_executions_id_seq', 1, false);


--
-- Name: automations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.automations_id_seq', 1, false);


--
-- Name: boards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.boards_id_seq', 12, true);


--
-- Name: card_field_values_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.card_field_values_id_seq', 1, false);


--
-- Name: card_transfers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.card_transfers_id_seq', 1, false);


--
-- Name: cards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.cards_id_seq', 999, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.clients_id_seq', 122, true);


--
-- Name: field_definitions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.field_definitions_id_seq', 1, false);


--
-- Name: gamification_badges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.gamification_badges_id_seq', 24, true);


--
-- Name: gamification_points_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.gamification_points_id_seq', 1253, true);


--
-- Name: gamification_rankings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.gamification_rankings_id_seq', 60, true);


--
-- Name: lists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.lists_id_seq', 60, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.roles_id_seq', 4, true);


--
-- Name: transfer_approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.transfer_approvals_id_seq', 1, false);


--
-- Name: user_badges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.user_badges_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: administrador
--

SELECT pg_catalog.setval('public.users_id_seq', 49, true);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_subdomain_key; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_subdomain_key UNIQUE (subdomain);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: automation_executions automation_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.automation_executions
    ADD CONSTRAINT automation_executions_pkey PRIMARY KEY (id);


--
-- Name: automations automations_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.automations
    ADD CONSTRAINT automations_pkey PRIMARY KEY (id);


--
-- Name: boards boards_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_pkey PRIMARY KEY (id);


--
-- Name: card_field_values card_field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.card_field_values
    ADD CONSTRAINT card_field_values_pkey PRIMARY KEY (id);


--
-- Name: card_transfers card_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.card_transfers
    ADD CONSTRAINT card_transfers_pkey PRIMARY KEY (id);


--
-- Name: cards cards_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: field_definitions field_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.field_definitions
    ADD CONSTRAINT field_definitions_pkey PRIMARY KEY (id);


--
-- Name: gamification_badges gamification_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.gamification_badges
    ADD CONSTRAINT gamification_badges_pkey PRIMARY KEY (id);


--
-- Name: gamification_points gamification_points_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.gamification_points
    ADD CONSTRAINT gamification_points_pkey PRIMARY KEY (id);


--
-- Name: gamification_rankings gamification_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.gamification_rankings
    ADD CONSTRAINT gamification_rankings_pkey PRIMARY KEY (id);


--
-- Name: lists lists_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: transfer_approvals transfer_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.transfer_approvals
    ADD CONSTRAINT transfer_approvals_pkey PRIMARY KEY (id);


--
-- Name: card_field_values unique_card_field; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.card_field_values
    ADD CONSTRAINT unique_card_field UNIQUE (card_id, field_definition_id);


--
-- Name: user_badges unique_user_badge; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id);


--
-- Name: gamification_rankings unique_user_ranking_period; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.gamification_rankings
    ADD CONSTRAINT unique_user_ranking_period UNIQUE (account_id, user_id, period_type, period_start);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_accounts_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_accounts_id ON public.accounts USING btree (id);


--
-- Name: ix_activities_activity_type; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_activities_activity_type ON public.activities USING btree (activity_type);


--
-- Name: ix_activities_card_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_activities_card_id ON public.activities USING btree (card_id);


--
-- Name: ix_activities_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_activities_id ON public.activities USING btree (id);


--
-- Name: ix_activities_user_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_activities_user_id ON public.activities USING btree (user_id);


--
-- Name: ix_audit_logs_account_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_audit_logs_account_id ON public.audit_logs USING btree (account_id);


--
-- Name: ix_audit_logs_action; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: ix_audit_logs_created_at; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: ix_audit_logs_entity_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_audit_logs_entity_id ON public.audit_logs USING btree (entity_id);


--
-- Name: ix_audit_logs_entity_type; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);


--
-- Name: ix_audit_logs_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);


--
-- Name: ix_audit_logs_user_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: ix_automation_executions_automation_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_automation_executions_automation_id ON public.automation_executions USING btree (automation_id);


--
-- Name: ix_automation_executions_card_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_automation_executions_card_id ON public.automation_executions USING btree (card_id);


--
-- Name: ix_automation_executions_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_automation_executions_id ON public.automation_executions USING btree (id);


--
-- Name: ix_automation_executions_started_at; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_automation_executions_started_at ON public.automation_executions USING btree (started_at);


--
-- Name: ix_automation_executions_status; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_automation_executions_status ON public.automation_executions USING btree (status);


--
-- Name: ix_automations_account_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_automations_account_id ON public.automations USING btree (account_id);


--
-- Name: ix_automations_automation_type; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_automations_automation_type ON public.automations USING btree (automation_type);


--
-- Name: ix_automations_board_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_automations_board_id ON public.automations USING btree (board_id);


--
-- Name: ix_automations_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_automations_id ON public.automations USING btree (id);


--
-- Name: ix_automations_next_run_at; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_automations_next_run_at ON public.automations USING btree (next_run_at);


--
-- Name: ix_automations_priority; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_automations_priority ON public.automations USING btree (priority);


--
-- Name: ix_automations_trigger_event; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_automations_trigger_event ON public.automations USING btree (trigger_event);


--
-- Name: ix_boards_account_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_boards_account_id ON public.boards USING btree (account_id);


--
-- Name: ix_boards_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_boards_id ON public.boards USING btree (id);


--
-- Name: ix_card_field_values_card_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_card_field_values_card_id ON public.card_field_values USING btree (card_id);


--
-- Name: ix_card_field_values_field_definition_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_card_field_values_field_definition_id ON public.card_field_values USING btree (field_definition_id);


--
-- Name: ix_card_field_values_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_card_field_values_id ON public.card_field_values USING btree (id);


--
-- Name: ix_card_transfers_batch_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_card_transfers_batch_id ON public.card_transfers USING btree (batch_id);


--
-- Name: ix_card_transfers_card_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_card_transfers_card_id ON public.card_transfers USING btree (card_id);


--
-- Name: ix_card_transfers_from_user_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_card_transfers_from_user_id ON public.card_transfers USING btree (from_user_id);


--
-- Name: ix_card_transfers_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_card_transfers_id ON public.card_transfers USING btree (id);


--
-- Name: ix_card_transfers_status; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_card_transfers_status ON public.card_transfers USING btree (status);


--
-- Name: ix_card_transfers_to_user_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_card_transfers_to_user_id ON public.card_transfers USING btree (to_user_id);


--
-- Name: ix_cards_assigned_to_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_cards_assigned_to_id ON public.cards USING btree (assigned_to_id);


--
-- Name: ix_cards_client_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_cards_client_id ON public.cards USING btree (client_id);


--
-- Name: ix_cards_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_cards_id ON public.cards USING btree (id);


--
-- Name: ix_cards_list_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_cards_list_id ON public.cards USING btree (list_id);


--
-- Name: ix_cards_title; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_cards_title ON public.cards USING btree (title);


--
-- Name: ix_clients_account_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_clients_account_id ON public.clients USING btree (account_id);


--
-- Name: ix_clients_document; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_clients_document ON public.clients USING btree (document);


--
-- Name: ix_clients_email; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_clients_email ON public.clients USING btree (email);


--
-- Name: ix_clients_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_clients_id ON public.clients USING btree (id);


--
-- Name: ix_clients_name; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_clients_name ON public.clients USING btree (name);


--
-- Name: ix_field_definitions_board_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_field_definitions_board_id ON public.field_definitions USING btree (board_id);


--
-- Name: ix_field_definitions_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_field_definitions_id ON public.field_definitions USING btree (id);


--
-- Name: ix_gamification_badges_account_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_gamification_badges_account_id ON public.gamification_badges USING btree (account_id);


--
-- Name: ix_gamification_badges_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_gamification_badges_id ON public.gamification_badges USING btree (id);


--
-- Name: ix_gamification_points_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_gamification_points_id ON public.gamification_points USING btree (id);


--
-- Name: ix_gamification_points_reason; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_gamification_points_reason ON public.gamification_points USING btree (reason);


--
-- Name: ix_gamification_points_user_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_gamification_points_user_id ON public.gamification_points USING btree (user_id);


--
-- Name: ix_gamification_rankings_account_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_gamification_rankings_account_id ON public.gamification_rankings USING btree (account_id);


--
-- Name: ix_gamification_rankings_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_gamification_rankings_id ON public.gamification_rankings USING btree (id);


--
-- Name: ix_gamification_rankings_period_end; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_gamification_rankings_period_end ON public.gamification_rankings USING btree (period_end);


--
-- Name: ix_gamification_rankings_period_start; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_gamification_rankings_period_start ON public.gamification_rankings USING btree (period_start);


--
-- Name: ix_gamification_rankings_period_type; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_gamification_rankings_period_type ON public.gamification_rankings USING btree (period_type);


--
-- Name: ix_gamification_rankings_user_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_gamification_rankings_user_id ON public.gamification_rankings USING btree (user_id);


--
-- Name: ix_lists_board_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_lists_board_id ON public.lists USING btree (board_id);


--
-- Name: ix_lists_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_lists_id ON public.lists USING btree (id);


--
-- Name: ix_notifications_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_notifications_id ON public.notifications USING btree (id);


--
-- Name: ix_notifications_is_read; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: ix_notifications_notification_type; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_notifications_notification_type ON public.notifications USING btree (notification_type);


--
-- Name: ix_notifications_user_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: ix_roles_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_roles_id ON public.roles USING btree (id);


--
-- Name: ix_roles_name; Type: INDEX; Schema: public; Owner: administrador
--

CREATE UNIQUE INDEX ix_roles_name ON public.roles USING btree (name);


--
-- Name: ix_transfer_approvals_approver_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_transfer_approvals_approver_id ON public.transfer_approvals USING btree (approver_id);


--
-- Name: ix_transfer_approvals_expires_at; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_transfer_approvals_expires_at ON public.transfer_approvals USING btree (expires_at);


--
-- Name: ix_transfer_approvals_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_transfer_approvals_id ON public.transfer_approvals USING btree (id);


--
-- Name: ix_transfer_approvals_status; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_transfer_approvals_status ON public.transfer_approvals USING btree (status);


--
-- Name: ix_transfer_approvals_transfer_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE UNIQUE INDEX ix_transfer_approvals_transfer_id ON public.transfer_approvals USING btree (transfer_id);


--
-- Name: ix_user_badges_badge_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_user_badges_badge_id ON public.user_badges USING btree (badge_id);


--
-- Name: ix_user_badges_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_user_badges_id ON public.user_badges USING btree (id);


--
-- Name: ix_user_badges_user_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_user_badges_user_id ON public.user_badges USING btree (user_id);


--
-- Name: ix_users_account_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_users_account_id ON public.users USING btree (account_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: administrador
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_role_id; Type: INDEX; Schema: public; Owner: administrador
--

CREATE INDEX ix_users_role_id ON public.users USING btree (role_id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: administrador
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: activities activities_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;


--
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: automation_executions automation_executions_automation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.automation_executions
    ADD CONSTRAINT automation_executions_automation_id_fkey FOREIGN KEY (automation_id) REFERENCES public.automations(id) ON DELETE CASCADE;


--
-- Name: automation_executions automation_executions_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.automation_executions
    ADD CONSTRAINT automation_executions_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE SET NULL;


--
-- Name: automation_executions automation_executions_triggered_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.automation_executions
    ADD CONSTRAINT automation_executions_triggered_by_id_fkey FOREIGN KEY (triggered_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: automations automations_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.automations
    ADD CONSTRAINT automations_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: automations automations_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.automations
    ADD CONSTRAINT automations_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: boards boards_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: card_field_values card_field_values_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.card_field_values
    ADD CONSTRAINT card_field_values_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;


--
-- Name: card_field_values card_field_values_field_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.card_field_values
    ADD CONSTRAINT card_field_values_field_definition_id_fkey FOREIGN KEY (field_definition_id) REFERENCES public.field_definitions(id) ON DELETE CASCADE;


--
-- Name: card_transfers card_transfers_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.card_transfers
    ADD CONSTRAINT card_transfers_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;


--
-- Name: card_transfers card_transfers_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.card_transfers
    ADD CONSTRAINT card_transfers_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: card_transfers card_transfers_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.card_transfers
    ADD CONSTRAINT card_transfers_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cards cards_assigned_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cards cards_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE CASCADE;


--
-- Name: clients clients_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: field_definitions field_definitions_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.field_definitions
    ADD CONSTRAINT field_definitions_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: cards fk_cards_client_id; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT fk_cards_client_id FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: gamification_rankings fk_gamification_rankings_account_id; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.gamification_rankings
    ADD CONSTRAINT fk_gamification_rankings_account_id FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: gamification_badges gamification_badges_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.gamification_badges
    ADD CONSTRAINT gamification_badges_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: gamification_points gamification_points_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.gamification_points
    ADD CONSTRAINT gamification_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: gamification_rankings gamification_rankings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.gamification_rankings
    ADD CONSTRAINT gamification_rankings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lists lists_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.lists
    ADD CONSTRAINT lists_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transfer_approvals transfer_approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.transfer_approvals
    ADD CONSTRAINT transfer_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: transfer_approvals transfer_approvals_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.transfer_approvals
    ADD CONSTRAINT transfer_approvals_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.card_transfers(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_awarded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_awarded_by_id_fkey FOREIGN KEY (awarded_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_badges user_badges_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.gamification_badges(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: administrador
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict HlAaokwwG7braXyNEk6A1kbwcaSUMNCNtAHDY7nw8lBuGWOixxBQABsGe8kVgsC

