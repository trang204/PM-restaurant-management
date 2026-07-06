--
-- PostgreSQL database dump
--

-- \restrict MljPpfBofLIoTkIOvf3jK8beHS0vRDAdDLEWVxRznISQZfhbruIPZSxngVM2GOp

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-07-06 18:25:22

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
-- TOC entry 893 (class 1247 OID 16938)
-- Name: booking_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.booking_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'CHECKED_IN',
    'COMPLETED'
);


ALTER TYPE public.booking_status OWNER TO postgres;

--
-- TOC entry 905 (class 1247 OID 16976)
-- Name: food_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.food_status AS ENUM (
    'AVAILABLE',
    'UNAVAILABLE'
);


ALTER TYPE public.food_status OWNER TO postgres;

--
-- TOC entry 899 (class 1247 OID 16956)
-- Name: order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status AS ENUM (
    'PENDING',
    'SERVING',
    'PAID',
    'CANCELLED'
);


ALTER TYPE public.order_status OWNER TO postgres;

--
-- TOC entry 902 (class 1247 OID 16966)
-- Name: payment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_status AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'CANCELLED'
);


ALTER TYPE public.payment_status OWNER TO postgres;

--
-- TOC entry 896 (class 1247 OID 16950)
-- Name: table_session_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.table_session_status AS ENUM (
    'ACTIVE',
    'CLOSED'
);


ALTER TYPE public.table_session_status OWNER TO postgres;

--
-- TOC entry 890 (class 1247 OID 16930)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'CUSTOMER',
    'STAFF',
    'ADMIN'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 257 (class 1255 OID 16616)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 234 (class 1259 OID 17099)
-- Name: booking_tables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.booking_tables (
    id integer NOT NULL,
    booking_id integer,
    table_id integer
);


ALTER TABLE public.booking_tables OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 17098)
-- Name: booking_tables_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.booking_tables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.booking_tables_id_seq OWNER TO postgres;

--
-- TOC entry 5283 (class 0 OID 0)
-- Dependencies: 233
-- Name: booking_tables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.booking_tables_id_seq OWNED BY public.booking_tables.id;


--
-- TOC entry 232 (class 1259 OID 17080)
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    user_id integer,
    booking_date date NOT NULL,
    booking_time time without time zone NOT NULL,
    guests integer,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    hold_expires_at timestamp without time zone,
    note text,
    guest_name character varying(100),
    guest_phone character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 17079)
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO postgres;

--
-- TOC entry 5284 (class 0 OID 0)
-- Dependencies: 231
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- TOC entry 228 (class 1259 OID 17050)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 17049)
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- TOC entry 5285 (class 0 OID 0)
-- Dependencies: 227
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- TOC entry 256 (class 1259 OID 17306)
-- Name: food_ingredients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.food_ingredients (
    id integer NOT NULL,
    food_id integer,
    ingredient_id integer,
    quantity_needed numeric(14,2) DEFAULT 1 NOT NULL
);


ALTER TABLE public.food_ingredients OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 17305)
-- Name: food_ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.food_ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.food_ingredients_id_seq OWNER TO postgres;

--
-- TOC entry 5286 (class 0 OID 0)
-- Dependencies: 255
-- Name: food_ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.food_ingredients_id_seq OWNED BY public.food_ingredients.id;


--
-- TOC entry 230 (class 1259 OID 17061)
-- Name: foods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.foods (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    price numeric(14,2) NOT NULL,
    description text,
    image_url text,
    category_id integer,
    status character varying(20) DEFAULT 'AVAILABLE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.foods OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 17060)
-- Name: foods_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.foods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.foods_id_seq OWNER TO postgres;

--
-- TOC entry 5287 (class 0 OID 0)
-- Dependencies: 229
-- Name: foods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.foods_id_seq OWNED BY public.foods.id;


--
-- TOC entry 254 (class 1259 OID 17289)
-- Name: ingredient_imports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ingredient_imports (
    id integer NOT NULL,
    ingredient_id integer,
    quantity numeric(14,2) NOT NULL,
    note text,
    import_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ingredient_imports OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 17288)
-- Name: ingredient_imports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ingredient_imports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ingredient_imports_id_seq OWNER TO postgres;

--
-- TOC entry 5288 (class 0 OID 0)
-- Dependencies: 253
-- Name: ingredient_imports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ingredient_imports_id_seq OWNED BY public.ingredient_imports.id;


--
-- TOC entry 250 (class 1259 OID 17262)
-- Name: ingredient_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ingredient_units (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ingredient_units OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 17261)
-- Name: ingredient_units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ingredient_units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ingredient_units_id_seq OWNER TO postgres;

--
-- TOC entry 5289 (class 0 OID 0)
-- Dependencies: 249
-- Name: ingredient_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ingredient_units_id_seq OWNED BY public.ingredient_units.id;


--
-- TOC entry 252 (class 1259 OID 17274)
-- Name: ingredients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ingredients (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    unit character varying(50) NOT NULL,
    stock_quantity numeric(14,2) DEFAULT 0 NOT NULL,
    min_stock_alert numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ingredients OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 17273)
-- Name: ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ingredients_id_seq OWNER TO postgres;

--
-- TOC entry 5290 (class 0 OID 0)
-- Dependencies: 251
-- Name: ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ingredients_id_seq OWNED BY public.ingredients.id;


--
-- TOC entry 244 (class 1259 OID 17198)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    message text,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 17197)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- TOC entry 5291 (class 0 OID 0)
-- Dependencies: 243
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 240 (class 1259 OID 17164)
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer,
    food_id integer,
    quantity integer NOT NULL,
    price numeric(14,2) NOT NULL,
    kitchen_status character varying(20) DEFAULT 'PENDING'::character varying,
    kitchen_ack_at timestamp without time zone,
    note text
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 17163)
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- TOC entry 5292 (class 0 OID 0)
-- Dependencies: 239
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- TOC entry 238 (class 1259 OID 17144)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    booking_id integer,
    table_session_id integer,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 17143)
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- TOC entry 5293 (class 0 OID 0)
-- Dependencies: 237
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- TOC entry 246 (class 1259 OID 17216)
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 17215)
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO postgres;

--
-- TOC entry 5294 (class 0 OID 0)
-- Dependencies: 245
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- TOC entry 242 (class 1259 OID 17185)
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    order_id integer,
    amount numeric(14,2),
    method character varying(50),
    status character varying(20),
    paid_at timestamp without time zone,
    transaction_code text,
    cashier_id integer,
    note text,
    tax numeric(14,2) DEFAULT 0,
    discount numeric(14,2) DEFAULT 0,
    surcharge numeric(14,2) DEFAULT 0
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 17184)
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- TOC entry 5295 (class 0 OID 0)
-- Dependencies: 241
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- TOC entry 220 (class 1259 OID 16985)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    CONSTRAINT roles_name_check CHECK (((name)::text = ANY ((ARRAY['ADMIN'::character varying, 'STAFF'::character varying, 'CUSTOMER'::character varying])::text[])))
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16984)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 5296 (class 0 OID 0)
-- Dependencies: 219
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 224 (class 1259 OID 17018)
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    restaurant_name character varying(150),
    logo_url text,
    banner_urls text[] DEFAULT '{}'::text[],
    banner_enabled boolean DEFAULT true,
    banner_mode character varying(20) DEFAULT 'SLIDESHOW'::character varying,
    banner_show_on_home boolean DEFAULT true,
    banner_show_on_auth boolean DEFAULT true,
    header_cta_label character varying(80),
    header_cta_url text,
    footer_tagline text,
    footer_copyright text,
    footer_links jsonb DEFAULT '[]'::jsonb,
    social_links jsonb DEFAULT '[]'::jsonb,
    total_tables integer,
    address text,
    phone character varying(20),
    email character varying(100),
    open_time time without time zone,
    close_time time without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    payment_bank_account text,
    payment_bank_code text,
    payment_transfer_content text,
    payment_qr_template text,
    hero_eyebrow text,
    hero_lead text,
    hero_meta text,
    hero_panel_tag text,
    home_features_title text,
    home_features_desc text,
    home_cta_title text,
    home_cta_text text,
    home_features_json text,
    system_email text,
    system_email_password text,
    reservation_hold_duration integer DEFAULT 15
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 17017)
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO postgres;

--
-- TOC entry 5297 (class 0 OID 0)
-- Dependencies: 223
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- TOC entry 236 (class 1259 OID 17117)
-- Name: table_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.table_sessions (
    id integer NOT NULL,
    table_id integer NOT NULL,
    booking_id integer,
    qr_token character varying(96) NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    closed_at timestamp without time zone
);


ALTER TABLE public.table_sessions OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 17116)
-- Name: table_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.table_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.table_sessions_id_seq OWNER TO postgres;

--
-- TOC entry 5298 (class 0 OID 0)
-- Dependencies: 235
-- Name: table_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.table_sessions_id_seq OWNED BY public.table_sessions.id;


--
-- TOC entry 226 (class 1259 OID 17036)
-- Name: tables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tables (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    capacity integer NOT NULL,
    status character varying(20) DEFAULT 'AVAILABLE'::character varying,
    status_note text,
    pos_x integer,
    pos_y integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    image_url text,
    zone text,
    is_deleted boolean DEFAULT false
);


ALTER TABLE public.tables OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 17035)
-- Name: tables_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tables_id_seq OWNER TO postgres;

--
-- TOC entry 5299 (class 0 OID 0)
-- Dependencies: 225
-- Name: tables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tables_id_seq OWNED BY public.tables.id;


--
-- TOC entry 222 (class 1259 OID 16997)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password text NOT NULL,
    phone character varying(20),
    avatar_url text,
    role_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'ACTIVE'::character varying
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16996)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5300 (class 0 OID 0)
-- Dependencies: 221
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 248 (class 1259 OID 17240)
-- Name: zones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zones (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.zones OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 17239)
-- Name: zones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.zones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.zones_id_seq OWNER TO postgres;

--
-- TOC entry 5301 (class 0 OID 0)
-- Dependencies: 247
-- Name: zones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.zones_id_seq OWNED BY public.zones.id;


--
-- TOC entry 4990 (class 2604 OID 17102)
-- Name: booking_tables id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_tables ALTER COLUMN id SET DEFAULT nextval('public.booking_tables_id_seq'::regclass);


--
-- TOC entry 4987 (class 2604 OID 17083)
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- TOC entry 4983 (class 2604 OID 17053)
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- TOC entry 5018 (class 2604 OID 17309)
-- Name: food_ingredients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.food_ingredients ALTER COLUMN id SET DEFAULT nextval('public.food_ingredients_id_seq'::regclass);


--
-- TOC entry 4984 (class 2604 OID 17064)
-- Name: foods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.foods ALTER COLUMN id SET DEFAULT nextval('public.foods_id_seq'::regclass);


--
-- TOC entry 5016 (class 2604 OID 17292)
-- Name: ingredient_imports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredient_imports ALTER COLUMN id SET DEFAULT nextval('public.ingredient_imports_id_seq'::regclass);


--
-- TOC entry 5010 (class 2604 OID 17265)
-- Name: ingredient_units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredient_units ALTER COLUMN id SET DEFAULT nextval('public.ingredient_units_id_seq'::regclass);


--
-- TOC entry 5012 (class 2604 OID 17277)
-- Name: ingredients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredients ALTER COLUMN id SET DEFAULT nextval('public.ingredients_id_seq'::regclass);


--
-- TOC entry 5003 (class 2604 OID 17201)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 4997 (class 2604 OID 17167)
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- TOC entry 4994 (class 2604 OID 17147)
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- TOC entry 5006 (class 2604 OID 17219)
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- TOC entry 4999 (class 2604 OID 17188)
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- TOC entry 4965 (class 2604 OID 16988)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 4969 (class 2604 OID 17021)
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- TOC entry 4991 (class 2604 OID 17120)
-- Name: table_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.table_sessions ALTER COLUMN id SET DEFAULT nextval('public.table_sessions_id_seq'::regclass);


--
-- TOC entry 4979 (class 2604 OID 17039)
-- Name: tables id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables ALTER COLUMN id SET DEFAULT nextval('public.tables_id_seq'::regclass);


--
-- TOC entry 4966 (class 2604 OID 17000)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5008 (class 2604 OID 17243)
-- Name: zones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zones ALTER COLUMN id SET DEFAULT nextval('public.zones_id_seq'::regclass);


--
-- TOC entry 5255 (class 0 OID 17099)
-- Dependencies: 234
-- Data for Name: booking_tables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.booking_tables (id, booking_id, table_id) FROM stdin;
2	2	2
3	3	3
4	4	1
5	5	1
6	6	1
7	7	2
8	8	1
10	9	2
11	10	3
12	11	4
13	12	2
15	13	1
16	14	1
18	15	2
20	16	4
22	17	1
24	18	2
26	19	4
28	20	5
30	21	4
38	25	11
39	26	1
43	28	6
45	29	6
52	30	8
54	31	6
57	32	11
59	33	6
60	1	6
66	37	1
68	38	15
70	39	6
72	40	1
74	41	6
76	42	2
77	43	5
78	44	1
80	45	11
82	46	11
85	47	3
86	48	6
88	49	1
89	50	12
91	51	1
93	52	4
95	53	4
\.


--
-- TOC entry 5253 (class 0 OID 17080)
-- Dependencies: 232
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (id, user_id, booking_date, booking_time, guests, status, hold_expires_at, note, guest_name, guest_phone, created_at) FROM stdin;
3	3	2026-04-11	20:00:00	3	COMPLETED	\N	\N	\N	\N	2026-04-22 10:14:31.073346
1	3	2026-04-10	18:00:00	2	CANCELLED	\N	\N	tên csdl mò	0911111111	2026-04-22 10:14:31.073346
4	\N	2026-04-30	23:21:00	5	COMPLETED	\N	Walk-in (vãng lai)	Khách vãng lai	\N	2026-04-30 23:21:18.189696
5	\N	2026-04-30	23:22:00	2	COMPLETED	\N	Walk-in (vãng lai)	Khách vãng lai	\N	2026-04-30 23:22:16.68019
6	\N	2026-04-30	23:28:00	2	COMPLETED	\N	Walk-in (vãng lai)	Khách vãng lai	\N	2026-04-30 23:28:14.730961
7	\N	2026-04-30	23:34:00	2	COMPLETED	\N	Walk-in (vãng lai)	Khách vãng lai	\N	2026-04-30 23:34:58.644021
8	\N	2026-04-30	23:35:00	2	COMPLETED	\N	Walk-in (vãng lai)	Khách vãng lai	\N	2026-04-30 23:35:22.364554
9	\N	2026-04-30	23:35:00	2	COMPLETED	\N	Walk-in (vãng lai)	Khách vãng lai	\N	2026-04-30 23:35:57.712944
10	\N	2026-04-30	23:39:00	2	COMPLETED	\N	Walk-in (vãng lai)	Khách vãng lai	\N	2026-04-30 23:39:03.816547
11	\N	2026-04-30	23:40:00	2	COMPLETED	\N	Walk-in (vãng lai)	Khách vãng lai	\N	2026-04-30 23:40:26.226426
12	\N	2026-05-04	14:26:00	9	COMPLETED	\N	Walk-in (vãng lai)	Khách vãng lai	\N	2026-05-04 14:26:41.153189
24	3	2026-05-11	18:30:00	3	CANCELLED	\N	\N	Đỗ Tuấn Dũng	0972838222	2026-05-11 17:19:27.715989
23	3	2026-05-11	18:30:00	2	CANCELLED	\N	\N	Nguyễn Quang Hiếu	0826848189	2026-05-11 17:18:38.558442
13	3	2026-05-04	18:30:00	5	COMPLETED	\N	\N	Nguyễn Văn A	01223333	2026-05-04 14:34:51.394201
51	4	2026-06-30	18:30:00	19	COMPLETED	\N	\N	Trần Thị Biên	0347594944	2026-06-30 14:30:38.185029
33	11	2026-06-04	18:30:00	2	COMPLETED	\N	\N	Nguyễn Đức Anh	0926452737	2026-06-04 23:23:20.555491
15	3	2026-05-05	18:30:00	4	COMPLETED	\N	\N	Anh A	091836171	2026-05-05 11:08:37.870186
14	\N	2026-05-04	14:40:00	5	COMPLETED	\N	Walk-in (vãng lai)	Khách vãng lai	\N	2026-05-04 14:40:08.993266
25	3	2026-05-13	18:30:00	3	COMPLETED	\N	\N	Nguyễn Đức Anh	09183929323	2026-05-13 11:17:48.490876
16	3	2026-05-05	18:30:00	2	CANCELLED	2026-05-05 14:29:00.971927	\N	Anh A	09764332642246	2026-05-05 14:14:00.945078
26	\N	2026-05-26	09:25:00	2	COMPLETED	\N	Walk-in (vãng lai)	Khách vãng lai	\N	2026-05-26 09:25:29.373724
18	3	2026-05-05	18:30:00	2	COMPLETED	\N	\N	Test2	0985762834	2026-05-05 14:28:16.993051
17	3	2026-05-05	18:30:00	2	CANCELLED	2026-05-05 14:42:51.279638	\N	Test1	0985762834	2026-05-05 14:27:51.264205
27	3	2026-05-26	18:30:00	2	CANCELLED	\N	\N	Nguyễn Văn Anh	0900000003	2026-05-26 20:42:09.156319
34	\N	2026-06-10	00:29:00	4	COMPLETED	\N	Walk-in (vãng lai)	Khách vãng lai	0934637263	2026-06-10 00:29:08.492991
19	7	2026-05-05	18:30:00	5	COMPLETED	\N	\N	Khách hàng 2	092883193	2026-05-05 16:57:29.311527
41	14	2026-06-21	18:30:00	2	COMPLETED	\N	\N	Trang Nguyễn	0346786801	2026-06-21 18:09:00.65385
28	4	2026-05-26	18:30:00	2	COMPLETED	\N	\N	Trần Thị Biên	0900000004	2026-05-26 20:52:31.821668
20	7	2026-05-05	18:30:00	8	COMPLETED	\N	\N	khách 2	0886424652	2026-05-05 17:08:47.250548
35	14	2026-06-10	18:30:00	2	CANCELLED	\N	\N	Trang Nguyễn	0346786800	2026-06-10 01:15:04.659665
21	3	2026-05-06	18:30:00	5	COMPLETED	\N	\N	Nguyễn A	0986434654	2026-05-06 08:59:02.783198
22	3	2026-05-11	18:30:00	4	CANCELLED	\N	\N	Nguyễn Văn Dũng	0986781377	2026-05-11 14:12:54.43022
36	14	2026-06-10	18:30:00	2	CANCELLED	\N	\N	Trang Nguyễn	0346786801	2026-06-10 14:03:51.750644
29	4	2026-05-27	18:30:00	2	COMPLETED	\N	\N	Trần Thị Biên	0900000004	2026-05-27 10:03:22.341273
47	10	2026-06-29	18:30:00	9	COMPLETED	\N	\N	Nguyễn Quang Hiếu	0946294629	2026-06-29 00:11:33.616893
37	10	2026-06-10	18:30:00	13	CANCELLED	2026-06-10 14:51:12.865584	\N	Nguyễn Quang Hiếu	0946294629	2026-06-10 14:36:12.841846
30	14	2026-06-04	18:30:00	4	COMPLETED	\N	\N	Trang Nguyễn	0346786800	2026-06-04 22:48:15.357175
48	\N	2026-06-29	00:16:00	2	COMPLETED	\N	Khách vãng lai	Anh An	\N	2026-06-29 00:16:15.755751
31	14	2026-06-04	18:30:00	2	COMPLETED	\N	\N	Trang Nguyễn	0346786800	2026-06-04 23:07:43.487787
42	\N	2026-06-25	18:30:00	9	COMPLETED	\N	\N	Trần Văn Bảy	0347684598	2026-06-25 15:34:32.079693
38	10	2026-06-10	18:30:00	2	COMPLETED	\N	\N	Nguyễn Quang Hiếu	0946294629	2026-06-10 16:22:42.47119
32	10	2026-06-04	18:30:00	2	COMPLETED	\N	\N	Nguyễn Quang Hiếu	0946294629	2026-06-04 23:17:03.239283
43	\N	2026-06-25	20:22:00	8	COMPLETED	\N	Khách vãng lai	Nguyễn Văn Linh	0938694933	2026-06-25 20:22:57.417604
44	\N	2026-06-27	22:06:00	18	COMPLETED	\N	Khách vãng lai	Khách vãng lai	\N	2026-06-27 22:06:29.03045
39	14	2026-06-12	18:30:00	2	COMPLETED	\N	\N	Trang Nguyễn	0346786801	2026-06-12 18:06:45.39838
40	14	2026-06-12	18:30:00	14	COMPLETED	\N	\N	Trang Nguyễn	0346786801	2026-06-12 23:25:58.952501
45	1	2026-06-28	18:30:00	2	COMPLETED	\N	\N	Admin	0948329301	2026-06-29 00:03:07.334784
49	10	2026-06-29	18:30:00	16	COMPLETED	\N	\N	Nguyễn Quang Hiếu	0946294629	2026-06-29 15:45:23.09676
46	14	2026-06-29	18:30:00	2	COMPLETED	\N	\N	Trang Nguyễn	0346786801	2026-06-29 00:06:05.922108
50	\N	2026-06-30	14:27:00	3	COMPLETED	\N	Khách vãng lai	Chị Bình	0962272727	2026-06-30 14:27:53.498066
52	11	2026-06-30	18:30:00	5	COMPLETED	\N	\N	Nguyễn Đức Anh	0926452737	2026-06-30 15:20:02.775514
2	4	2026-04-10	19:00:00	4	COMPLETED	\N	\N	\N	\N	2026-04-22 10:14:31.073346
53	8	2026-06-30	18:30:00	6	COMPLETED	\N	\N	Trần Minh Phương	0348593893	2026-06-30 15:25:39.107994
\.


--
-- TOC entry 5249 (class 0 OID 17050)
-- Dependencies: 228
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name) FROM stdin;
1	Khai vị
2	Món chính
3	Đồ uống
4	Tráng miệng
5	Combo
\.


--
-- TOC entry 5277 (class 0 OID 17306)
-- Dependencies: 256
-- Data for Name: food_ingredients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.food_ingredients (id, food_id, ingredient_id, quantity_needed) FROM stdin;
4	70	3	1.00
5	70	4	1.00
6	70	5	0.50
7	70	6	1.00
8	51	7	1.00
9	66	8	1.00
10	66	9	1.00
11	66	1	1.00
12	66	3	1.00
13	66	4	0.50
14	66	6	1.00
\.


--
-- TOC entry 5251 (class 0 OID 17061)
-- Dependencies: 230
-- Data for Name: foods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.foods (id, name, price, description, image_url, category_id, status, created_at) FROM stdin;
21	Cheesecake dâu	65000.00	Bánh cheesecake mềm mịn ăn kèm sốt dâu.	/uploads/food_21_1779525537809_baf0951e89d14.png	4	AVAILABLE	2026-05-23 15:38:57.791346
22	Kem vani chocolate	45000.00	Kem vani phủ chocolate và hạnh nhân rang	/uploads/food_22_1779525593736_a1ffdc7b59734.png	4	AVAILABLE	2026-05-23 15:39:53.710625
24	Trà đào cam sả	55000.00	Trà đào thơm nhẹ kết hợp cam lát và sả tươi.	/uploads/food_24_1779525697616_7243fd55b8237.png	3	AVAILABLE	2026-05-23 15:41:37.592265
25	Matcha đá xay	65000.00	Matcha Nhật blended cùng sữa tươi và kem.	/uploads/food_25_1779525744549_8e57150ae9622.png	3	AVAILABLE	2026-05-23 15:42:24.524892
35	Cá hồi sốt chanh dây	289000.00	Cá hồi áp chảo dùng cùng sốt chanh dây chua ngọt.	/uploads/food_35_1779551653428_a9166035a4611.png	2	AVAILABLE	2026-05-23 22:54:13.403633
14	Súp gà nấm	60000.00	Súp gà nóng với nấm và bắp ngọt, phù hợp khai vị.	/uploads/food_14_1779525082027_9df566d97183a.webp	1	AVAILABLE	2026-05-23 15:31:22.012143
27	Mojito chanh bạc hà	69000.00	Mocktail bạc hà mát lạnh và chanh tươi.	/uploads/food_27_1779551150875_efb2e365eab75.png	3	AVAILABLE	2026-05-23 22:45:50.861338
28	Pancake trái cây	95000.00	Pancake mềm cùng trái cây tươi và syrup.	/uploads/food_28_1779551230003_bf6b523a747fd.png	4	AVAILABLE	2026-05-23 22:47:09.988988
29	Lava chocolate	89000.00	Bánh chocolate nóng chảy dùng cùng kem vani.	/uploads/food_29_1779551321219_4c5d503909924.png	4	AVAILABLE	2026-05-23 22:48:41.205617
23	Coca Cola	23000.00	Nước ngọt có gas dùng lạnh.	/uploads/food_23_1779525649705_79605cc4de301.png	3	AVAILABLE	2026-05-23 15:40:49.689598
13	Salad cá ngừ	65000.00	Salad rau tươi kết hợp cá ngừ, sốt mè rang thanh nhẹ.	/uploads/food_13_1779524977608_8bf17e43c01b5.png	1	AVAILABLE	2026-05-23 15:29:37.569805
15	Khoai tây chiên phô mai	59000.00	Khoai tây chiên giòn phủ phô mai béo thơm.	/uploads/food_15_1779525179485_62cc9ce9911ea.png	1	AVAILABLE	2026-05-23 15:32:07.772479
31	Gỏi bò tái chanh	139000.00	Bò tái chanh chua nhẹ ăn kèm rau thơm.	/uploads/food_31_1779551438945_820ee9ec068c9.png	2	AVAILABLE	2026-05-23 22:50:38.914912
26	Espresso đá cam	75000.00	Cà phê espresso kết hợp nước cam tươi.	/uploads/food_26_1779551080328_4de3dfa621981.png	3	AVAILABLE	2026-05-23 22:44:18.248368
16	Pizza hải sản	180000.00	Pizza đế mỏng với tôm, mực và phô mai mozzarella.	/uploads/food_16_1779525239289_3b4cf588eae07.png	2	AVAILABLE	2026-05-23 15:33:59.272122
17	Bò bít tết sốt tiêu đen	220000.00	Thăn bò áp chảo dùng kèm khoai tây và sốt tiêu đen.	/uploads/food_17_1779525298334_929e8f963d947.png	2	AVAILABLE	2026-05-23 15:34:58.319264
18	Mì Ý bò bằm	145000.00	Mì spaghetti sốt bò bằm cà chua đậm vị kiểu Ý.	/uploads/food_18_1779525346975_5713f1fd83be5.png	2	AVAILABLE	2026-05-23 15:35:46.960262
34	Hàu nướng mỡ hành	129000.00	Hàu tươi nướng cùng mỡ hành và đậu phộng rang.	/uploads/food_34_1779551605683_2946af5163819.png	2	AVAILABLE	2026-05-23 22:53:25.66832
36	Bạch tuộc nướng sa tế	239000.00	Bạch tuộc nướng cay nhẹ, ăn kèm rau củ.	/uploads/food_36_1779551712192_c99fea939ecbe.png	2	AVAILABLE	2026-05-23 22:55:12.17114
37	Sườn BBQ kiểu Mỹ	299000.00	Sườn nướng sốt BBQ đậm vị, mềm và mọng nước.	/uploads/food_37_1779551758663_0efc66dcebb81.png	2	AVAILABLE	2026-05-23 22:55:58.642946
38	Tomahawk Steak	899000.00	Steak tomahawk cao cấp dành cho 2–3 người.	/uploads/food_38_1779551801646_0f196590f514d.png	2	AVAILABLE	2026-05-23 22:56:41.627249
40	Mì Ý hải sản sốt kem	175000.00	Spaghetti sốt kem cùng tôm và mực tươi.	/uploads/food_40_1779551922049_a923d97711471.png	2	AVAILABLE	2026-05-23 22:58:42.034937
42	Bruschetta cà chua phô mai	89000.00	Bánh mì nướng giòn phủ cà chua, olive và phô mai.	/uploads/food_42_1779552036661_fe3c3e83ecd6a.png	1	AVAILABLE	2026-05-23 23:00:36.642295
44	Nachos bò bằm	119000.00	Bánh nachos ăn cùng bò bằm và sốt cheese.	/uploads/food_44_1779552172856_bbaa90b613931.png	1	AVAILABLE	2026-05-23 23:02:52.843223
45	Brownie kem vani	79000.00	Brownie chocolate nóng ăn cùng kem vani.	/uploads/food_45_1779552222601_7119fba8585c8.png	4	AVAILABLE	2026-05-23 23:03:42.587339
46	Panna cotta việt quất	69000.00	Panna cotta mềm mịn phủ sốt việt quất.	/uploads/food_46_1779552286470_c87f8005991cb.png	4	AVAILABLE	2026-05-23 23:04:46.456078
47	Bánh mousse xoài	75000.00	Mousse xoài mát lạnh vị trái cây tự nhiên.	/uploads/food_47_1779552361509_ba997c07feb65.png	4	AVAILABLE	2026-05-23 23:06:01.490474
48	Kem dừa tropical	59000.00	Kem dừa mát lạnh với topping dừa sấy.	/uploads/food_48_1779552404497_53b3e842aa5a3.png	4	AVAILABLE	2026-05-23 23:06:44.474583
49	Tiger Crystal	39000.00	Bia lager vị êm, lạnh sâu sảng khoái.	/uploads/food_49_1779552471459_8d779ac8baf41.png	3	AVAILABLE	2026-05-23 23:07:51.44362
50	Heineken Silver	45000.00	Bia nhẹ dễ uống với hậu vị mượt.	/uploads/food_50_1779552526507_77260b53c42d3.png	3	AVAILABLE	2026-05-23 23:08:46.493997
52	Sapporo Premium	55000.00	Bia Nhật cao cấp với vị malt đặc trưng.	/uploads/food_52_1779552602852_105949fad23da.png	3	AVAILABLE	2026-05-23 23:10:02.833925
53	Strongbow Táo	55000.00	Cider vị táo nhẹ, dễ uống.	/uploads/food_53_1779552666577_7eef11e9406fe.png	3	AVAILABLE	2026-05-23 23:11:06.563697
54	Vang đỏ Chile Cabernet	690000.00	Rượu vang đỏ đậm vị trái cây chín và gỗ sồi.	/uploads/food_54_1779552708492_abbd718a163db.png	3	AVAILABLE	2026-05-23 23:11:48.479188
55	Vang trắng Sauvignon Blanc	720000.00	Vang trắng thanh mát với hương cam chanh.	/uploads/food_55_1779552743484_3ceaf5d371fe6.png	3	AVAILABLE	2026-05-23 23:12:23.465628
56	Vang đỏ Merlot Reserve	850000.00	Rượu vang mềm mại, hậu vị chocolate nhẹ.	/uploads/food_56_1779552782808_748f4fc7b1007.png	3	AVAILABLE	2026-05-23 23:13:02.79387
57	Đùi cừu nướng rosemary	389000.00	Đùi cừu mềm thơm với lá rosemary đặc trưng.	/uploads/food_57_1779638244885_526b4343ee792.png	2	AVAILABLE	2026-05-24 22:57:24.866091
58	Wagyu A5 áp chảo sốt rượu vang	1290000.00	Thịt bò Wagyu A5 Nhật Bản áp chảo hoàn hảo cùng sốt vang đỏ cao cấp.	/uploads/food_58_1779638352408_919021037c6c3.png	2	AVAILABLE	2026-05-24 22:59:12.394116
59	Tôm hùm Alaska bỏ lò phô mai	1590000.00	Tôm hùm Alaska nướng phô mai mozzarella và bơ tỏi.	/uploads/food_59_1779638398322_765eab6b4b51e.png	2	AVAILABLE	2026-05-24 22:59:58.29808
60	Cá tuyết Na Uy sốt truffle	689000.00	Cá tuyết mềm béo dùng cùng sốt kem nấm truffle.	/uploads/food_60_1779638475193_b664d6a3545e6.png	2	AVAILABLE	2026-05-24 23:01:15.177349
61	Bò Wellington thượng hạng	890000.00	Thăn bò premium bọc pastry nướng kiểu Anh truyền thống.	/uploads/food_61_1779638528755_a689becd67466.png	2	AVAILABLE	2026-05-24 23:02:08.730017
62	Sò điệp Hokkaido áp chảo	629000.00	Sò điệp Nhật áp chảo bơ thơm cùng puree bí đỏ.	/uploads/food_62_1779638598721_c2b597a4b1ef2.png	2	AVAILABLE	2026-05-24 23:03:18.69703
33	Tôm hùm phô mai bỏ lò	499000.00	Tôm hùm nướng phủ phô mai mozzarella béo thơm.	/uploads/food_33_1779551566421_9a82a607f3142.png	2	AVAILABLE	2026-05-23 22:52:46.405412
65	Romantic Dinner Set	1499000.00	Set tối lãng mạn cho 2 người gồm steak, rượu và dessert.	/uploads/food_65_1779808772309_b725fad6be04c.png	5	AVAILABLE	2026-05-26 22:19:32.27477
51	Budweiser	50000.00	Bia Mỹ vị đậm nhẹ, phù hợp món nướng.	/uploads/food_51_1779552565903_9a162ac08f8cd.png	3	AVAILABLE	2026-05-23 23:09:25.891207
67	Seafood Lover Set	1899000.00	Set hải sản cao cấp gồm tôm hùm, hàu và cá hồi.	/uploads/food_67_1779808978287_0cbeb0c297e53.png	5	AVAILABLE	2026-05-26 22:22:58.272266
68	Wagyu Experience Set	2590000.00	Set trải nghiệm bò Wagyu dành cho khách VIP.	/uploads/food_68_1779811755218_5276ab0831fd7.png	5	AVAILABLE	2026-05-26 23:09:15.196487
69	Wine & Steak Set	2890000.00	Set steak và rượu vang cao cấp dành cho bàn VIP.	/uploads/food_69_1779811822903_e429c375c3ef9.png	5	AVAILABLE	2026-05-26 23:10:22.882347
71	Japanese Fine Dining Set	2190000.00	Set phong cách Nhật cao cấp với sashimi và món nóng premium.	/uploads/food_71_1779811967813_632a4ccbf1a88.png	5	AVAILABLE	2026-05-26 23:12:47.786074
72	Chef Signature Set	3490000.00	Set đặc biệt do bếp trưởng đề xuất dành cho khách VIP.	/uploads/food_72_1779812169598_9d6686396fa55.png	5	AVAILABLE	2026-05-26 23:16:09.570389
74	Cơm sen cung đình	429000.00	Cơm hấp lá sen cùng hải sản và hạt sen Huế.	/uploads/food_74_1779812431291_2732bbb6ea391.png	2	AVAILABLE	2026-05-26 23:20:31.280727
70	Anniversary Couple Set	1790000.00	Set kỷ niệm dành cho cặp đôi với không gian lãng mạn.	/uploads/food_70_1779811890402_e2fb58a948d78.png	5	AVAILABLE	2026-05-26 23:11:30.386033
76	Nem cua bể Hải Phòng	289000.00	Nem cua bể vuông giòn rụm với nhân cua biển cao cấp.	/uploads/food_76_1779812764034_6c8c9ea5bafd.png	2	AVAILABLE	2026-05-26 23:26:04.018963
77	Lẩu riêu cua hải sản	799000.00	Lẩu riêu cua đậm đà kết hợp tôm, mực và bò Mỹ.	/uploads/food_77_1779812891282_cf97b374f0a7.png	5	AVAILABLE	2026-05-26 23:28:11.259587
66	Birthday Party Set	2499000.00	Combo nhóm 8–10 người cho tiệc sinh nhật.	/uploads/food_66_1779808925364_dad08e45a5ede.png	5	AVAILABLE	2026-05-26 22:22:05.337984
\.


--
-- TOC entry 5275 (class 0 OID 17289)
-- Dependencies: 254
-- Data for Name: ingredient_imports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ingredient_imports (id, ingredient_id, quantity, note, import_date) FROM stdin;
1	1	6.00	Tồn kho ban đầu	2026-05-26 22:32:47.849734
5	1	10.00	\N	2026-06-03 17:26:46.916045
6	3	20.00	Tồn kho ban đầu	2026-06-04 15:33:38.846885
7	4	50.00	Tồn kho ban đầu	2026-06-04 15:34:11.605685
8	5	20.00	Tồn kho ban đầu	2026-06-04 15:34:35.117336
9	6	14.00	Tồn kho ban đầu	2026-06-04 15:36:35.797515
10	7	100.00	Tồn kho ban đầu	2026-06-04 15:37:21.156697
11	8	15.00	Tồn kho ban đầu	2026-06-04 15:37:58.746665
12	9	7.00	Tồn kho ban đầu	2026-06-04 15:38:27.201216
13	6	6.00	\N	2026-06-08 09:26:58.040191
14	9	3.00	\N	2026-06-09 15:44:49.354833
15	6	15.00	\N	2026-06-27 21:52:52.682987
\.


--
-- TOC entry 5271 (class 0 OID 17262)
-- Dependencies: 250
-- Data for Name: ingredient_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ingredient_units (id, name, created_at) FROM stdin;
1	kg	2026-05-26 20:40:45.831946
2	g	2026-05-26 20:40:45.831946
3	lít	2026-05-26 20:40:45.831946
4	ml	2026-05-26 20:40:45.831946
5	hộp	2026-05-26 20:40:45.831946
6	cái	2026-05-26 20:40:45.831946
7	lon	2026-05-26 20:40:45.831946
8	chai	2026-05-26 20:40:45.831946
9	con	2026-05-26 22:32:28.883626
98	quả	2026-06-09 16:03:13.389619
\.


--
-- TOC entry 5273 (class 0 OID 17274)
-- Dependencies: 252
-- Data for Name: ingredients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ingredients (id, name, unit, stock_quantity, min_stock_alert, created_at) FROM stdin;
7	Bia Budweiser	lon	99.00	6.00	2026-06-04 15:37:21.156697
5	Bí đỏ	kg	19.00	5.00	2026-06-04 15:34:35.117336
8	Pizza	cái	11.00	5.00	2026-06-04 15:37:58.746665
9	Phô mai mozzarella	cái	6.00	5.00	2026-06-04 15:38:27.201216
1	Tôm hùm Alaska	con	7.00	2.00	2026-05-26 22:32:47.849734
3	Cá hồi phi lê	con	14.00	5.00	2026-06-04 15:33:38.846885
4	Bò Mỹ	kg	46.00	5.00	2026-06-04 15:34:11.605685
6	Bánh kem	cái	15.00	4.00	2026-06-04 15:36:35.797515
\.


--
-- TOC entry 5265 (class 0 OID 17198)
-- Dependencies: 244
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, message, is_read, created_at) FROM stdin;
1	3	Đặt bàn thành công	f	2026-04-22 10:14:31.073346
2	4	Đơn của bạn đã được xác nhận	f	2026-04-22 10:14:31.073346
26	1	[Thanh toán] Bàn 1: khách cập nhật yêu cầu — Tiền mặt · 2.070.000 ₫ · Đơn #14	t	2026-05-04 14:39:17.345918
20	1	[Gọi món] Bàn 1: Bánh ngọt x1	t	2026-05-04 14:36:03.263546
4	1	[Gọi món] Bàn 2: Coca Cola x1	t	2026-05-04 14:26:49.584176
6	1	[Gọi món] Bàn 2: Nước cam x1	t	2026-05-04 14:26:51.206329
8	1	[Gọi món] Bàn 2: Salad x1	t	2026-05-04 14:26:52.857237
10	1	[Gửi đơn] Bàn 2: khách đã gửi đơn — tổng 2.080.000 ₫	t	2026-05-04 14:27:55.234636
12	1	[Thanh toán] Bàn 2: khách yêu cầu thanh toán — Chuyển khoản · 2.080.000 ₫ · Đơn #11	t	2026-05-04 14:28:02.810489
14	1	[Gọi món] Bàn 1: Coca Cola x1	t	2026-05-04 14:35:39.857353
16	1	[Gọi món] Bàn 1: Nước cam x1	t	2026-05-04 14:35:41.12134
18	1	[Gửi đơn] Bàn 1: khách đã gửi đơn — tổng 2.030.000 ₫	t	2026-05-04 14:35:43.35435
22	1	[Gửi đơn] Bàn 1: khách đã gửi đơn — tổng 40.000 ₫	t	2026-05-04 14:36:05.522077
34	1	[Gửi đơn] Bàn 2: khách đã gửi đơn — tổng 100.000 ₫	t	2026-05-05 11:10:14.836315
32	1	[Gọi món] Bàn 2: Salad x1	t	2026-05-05 11:10:12.395867
30	1	[Gọi món] Bàn 2: Nước cam x1	t	2026-05-05 11:10:11.81962
28	1	[Gọi món] Bàn 2: Coca Colaaaaaa x1	t	2026-05-05 11:10:10.879165
38	1	[Thanh toán] Bàn 2: khách cập nhật yêu cầu — Chuyển khoản · 100.000 ₫ · Đơn #17	t	2026-05-05 11:13:46.600043
24	1	[Thanh toán] Bàn 1: khách yêu cầu thanh toán — Tiền mặt · 2.070.000 ₫ · Đơn #14	t	2026-05-04 14:38:02.202387
36	1	[Thanh toán] Bàn 2: khách yêu cầu thanh toán — Chuyển khoản · 100.000 ₫ · Đơn #17	t	2026-05-05 11:13:24.386669
40	1	[Gọi món] Bàn 2: Coca Colaaaaaa x1	t	2026-05-05 14:34:56.864255
42	1	[Gọi món] Bàn 2: Bánh Xèo x1	t	2026-05-05 14:34:57.536793
44	1	[Gọi món] Bàn 2: Kem tươi x1	t	2026-05-05 14:34:58.233617
46	1	[Gửi đơn] Bàn 2: khách đã gửi đơn — tổng 23.200 ₫	t	2026-05-05 14:36:53.128275
48	1	[Thanh toán] Bàn 2: khách yêu cầu thanh toán — Tiền mặt · 23.200 ₫ · Đơn #18	t	2026-05-05 14:38:13.762039
62	1	[Thanh toán] Bàn 4: khách yêu cầu thanh toán — Tiền mặt · 1.580.000 ₫ · Đơn #20	t	2026-05-05 17:02:34.176541
50	1	[Gọi món] Bàn 4: Nước cam x1	t	2026-05-05 17:00:19.524213
52	1	[Gọi món] Bàn 4: Salad x1	t	2026-05-05 17:00:20.276227
54	1	[Gửi đơn] Bàn 4: khách đã gửi đơn — tổng 80.000 ₫	t	2026-05-05 17:00:21.54763
56	1	[Gọi món] Bàn 4: Bánh Xèo x1	t	2026-05-05 17:00:35.338116
58	1	[Gọi món] Bàn 4: Bò bít tết x1	t	2026-05-05 17:00:35.996805
60	1	[Gửi đơn] Bàn 4: khách đã gửi đơn — tổng 1.500.000 ₫	t	2026-05-05 17:00:37.829482
64	1	[Gọi món] Bàn 5: Bò bít tết x1	t	2026-05-05 17:09:19.893497
3	2	[Gọi món] Bàn 2: Coca Cola x1	t	2026-05-04 14:26:49.581566
5	2	[Gọi món] Bàn 2: Nước cam x1	t	2026-05-04 14:26:51.204911
7	2	[Gọi món] Bàn 2: Salad x1	t	2026-05-04 14:26:52.856264
9	2	[Gửi đơn] Bàn 2: khách đã gửi đơn — tổng 2.080.000 ₫	t	2026-05-04 14:27:55.233098
11	2	[Thanh toán] Bàn 2: khách yêu cầu thanh toán — Chuyển khoản · 2.080.000 ₫ · Đơn #11	t	2026-05-04 14:28:02.809192
27	2	[Gọi món] Bàn 2: Coca Colaaaaaa x1	t	2026-05-05 11:10:10.877525
29	2	[Gọi món] Bàn 2: Nước cam x1	t	2026-05-05 11:10:11.818512
66	1	[Gọi món] Bàn 5: Bánh Xèo x1	t	2026-05-05 17:09:20.459847
68	1	[Gọi món] Bàn 5: Súp gà x1	t	2026-05-05 17:09:21.718321
70	1	[Gửi đơn] Bàn 5: khách đã gửi đơn — tổng 1.560.000 ₫	t	2026-05-05 17:09:22.936496
72	1	[Thanh toán] Bàn 5: khách yêu cầu thanh toán — Chuyển khoản · 1.560.000 ₫ · Đơn #21	t	2026-05-05 17:09:39.413648
74	1	[Gọi món] Bàn 4: Salad x1	t	2026-05-06 09:11:35.193678
76	1	[Gửi đơn] Bàn 4: khách đã gửi đơn — tổng 50.000 ₫	t	2026-05-06 09:11:39.029686
78	1	[Thanh toán] Bàn 4: khách yêu cầu thanh toán — Tiền mặt · 50.000 ₫ · Đơn #22	t	2026-05-06 09:11:58.399981
80	1	[Gọi món] Bàn 11: Coca Colaaaaaa x1	t	2026-05-13 11:20:18.519373
82	1	[Gọi món] Bàn 11: Nước cam x1	t	2026-05-13 11:20:19.416414
84	1	[Gọi món] Bàn 11: Bánh Xèo x1	t	2026-05-13 11:20:20.974428
86	1	[Gửi đơn] Bàn 11: khách đã gửi đơn — tổng 1.330.200 ₫	t	2026-05-13 11:20:32.882571
93	2	[Gửi đơn] Bàn 6 (Khu A): khách đã gửi đơn — tổng 73.000 ₫	t	2026-05-26 20:59:31.560727
88	1	[Thanh toán] Bàn 11: khách yêu cầu thanh toán — Tiền mặt · 1.330.200 ₫ · Đơn #24	t	2026-05-13 11:29:45.518561
87	2	[Thanh toán] Bàn 11: khách yêu cầu thanh toán — Tiền mặt · 1.330.200 ₫ · Đơn #24	t	2026-05-13 11:29:45.51497
85	2	[Gửi đơn] Bàn 11: khách đã gửi đơn — tổng 1.330.200 ₫	t	2026-05-13 11:20:32.88055
31	2	[Gọi món] Bàn 2: Salad x1	t	2026-05-05 11:10:12.394917
33	2	[Gửi đơn] Bàn 2: khách đã gửi đơn — tổng 100.000 ₫	t	2026-05-05 11:10:14.8353
13	2	[Gọi món] Bàn 1: Coca Cola x1	t	2026-05-04 14:35:39.85571
15	2	[Gọi món] Bàn 1: Nước cam x1	t	2026-05-04 14:35:41.120219
17	2	[Gửi đơn] Bàn 1: khách đã gửi đơn — tổng 2.030.000 ₫	t	2026-05-04 14:35:43.353425
19	2	[Gọi món] Bàn 1: Bánh ngọt x1	t	2026-05-04 14:36:03.262388
21	2	[Gửi đơn] Bàn 1: khách đã gửi đơn — tổng 40.000 ₫	t	2026-05-04 14:36:05.521015
23	2	[Thanh toán] Bàn 1: khách yêu cầu thanh toán — Tiền mặt · 2.070.000 ₫ · Đơn #14	t	2026-05-04 14:38:02.201094
49	2	[Gọi món] Bàn 4: Nước cam x1	t	2026-05-05 17:00:19.522861
35	2	[Thanh toán] Bàn 2: khách yêu cầu thanh toán — Chuyển khoản · 100.000 ₫ · Đơn #17	t	2026-05-05 11:13:24.384789
37	2	[Thanh toán] Bàn 2: khách cập nhật yêu cầu — Chuyển khoản · 100.000 ₫ · Đơn #17	t	2026-05-05 11:13:46.598323
51	2	[Gọi món] Bàn 4: Salad x1	t	2026-05-05 17:00:20.275018
53	2	[Gửi đơn] Bàn 4: khách đã gửi đơn — tổng 80.000 ₫	t	2026-05-05 17:00:21.54495
25	2	[Thanh toán] Bàn 1: khách cập nhật yêu cầu — Tiền mặt · 2.070.000 ₫ · Đơn #14	t	2026-05-04 14:39:17.344598
39	2	[Gọi món] Bàn 2: Coca Colaaaaaa x1	t	2026-05-05 14:34:56.861381
41	2	[Gọi món] Bàn 2: Bánh Xèo x1	t	2026-05-05 14:34:57.535331
43	2	[Gọi món] Bàn 2: Kem tươi x1	t	2026-05-05 14:34:58.232446
45	2	[Gửi đơn] Bàn 2: khách đã gửi đơn — tổng 23.200 ₫	t	2026-05-05 14:36:53.126744
47	2	[Thanh toán] Bàn 2: khách yêu cầu thanh toán — Tiền mặt · 23.200 ₫ · Đơn #18	t	2026-05-05 14:38:13.760661
55	2	[Gọi món] Bàn 4: Bánh Xèo x1	t	2026-05-05 17:00:35.337263
57	2	[Gọi món] Bàn 4: Bò bít tết x1	t	2026-05-05 17:00:35.996041
59	2	[Gửi đơn] Bàn 4: khách đã gửi đơn — tổng 1.500.000 ₫	t	2026-05-05 17:00:37.828786
61	2	[Thanh toán] Bàn 4: khách yêu cầu thanh toán — Tiền mặt · 1.580.000 ₫ · Đơn #20	t	2026-05-05 17:02:34.173786
71	2	[Thanh toán] Bàn 5: khách yêu cầu thanh toán — Chuyển khoản · 1.560.000 ₫ · Đơn #21	t	2026-05-05 17:09:39.412614
63	2	[Gọi món] Bàn 5: Bò bít tết x1	t	2026-05-05 17:09:19.892398
65	2	[Gọi món] Bàn 5: Bánh Xèo x1	t	2026-05-05 17:09:20.45864
67	2	[Gọi món] Bàn 5: Súp gà x1	t	2026-05-05 17:09:21.717365
69	2	[Gửi đơn] Bàn 5: khách đã gửi đơn — tổng 1.560.000 ₫	t	2026-05-05 17:09:22.934824
73	2	[Gọi món] Bàn 4: Salad x1	t	2026-05-06 09:11:35.19262
75	2	[Gửi đơn] Bàn 4: khách đã gửi đơn — tổng 50.000 ₫	t	2026-05-06 09:11:39.028189
77	2	[Thanh toán] Bàn 4: khách yêu cầu thanh toán — Tiền mặt · 50.000 ₫ · Đơn #22	t	2026-05-06 09:11:58.397764
79	2	[Gọi món] Bàn 11: Coca Colaaaaaa x1	t	2026-05-13 11:20:18.516894
81	2	[Gọi món] Bàn 11: Nước cam x1	t	2026-05-13 11:20:19.415036
83	2	[Gọi món] Bàn 11: Bánh Xèo x1	t	2026-05-13 11:20:20.972489
91	2	[Gọi món] Bàn 6 (Khu A): Budweiser x1	t	2026-05-26 20:59:27.885952
89	2	[Gọi món] Bàn 6 (Khu A): Coca Cola x1	t	2026-05-26 20:59:22.656613
95	2	[Thanh toán] Bàn 6 (Khu A): khách yêu cầu thanh toán — Tiền mặt · 1.734.000 ₫ · Đơn #28	t	2026-05-26 21:01:21.813818
96	1	[Thanh toán] Bàn 6 (Khu A): khách yêu cầu thanh toán — Tiền mặt · 1.734.000 ₫ · Đơn #28	t	2026-05-26 21:01:21.81538
94	1	[Gửi đơn] Bàn 6 (Khu A): khách đã gửi đơn — tổng 73.000 ₫	t	2026-05-26 20:59:31.561689
92	1	[Gọi món] Bàn 6 (Khu A): Budweiser x1	t	2026-05-26 20:59:27.887584
90	1	[Gọi món] Bàn 6 (Khu A): Coca Cola x1	t	2026-05-26 20:59:22.659693
98	1	[Gọi món] Bàn 6 (Khu A): Nem cua bể Hải Phòng x1	t	2026-05-27 10:04:03.059648
100	1	[Gọi món] Bàn 6 (Khu A): Pizza hải sản x1	t	2026-05-27 10:04:03.850349
102	1	[Gửi đơn] Bàn 6 (Khu A): khách đã gửi đơn — tổng 469.000 ₫	t	2026-05-27 10:04:10.406557
104	1	[Gọi món] Bàn 6 (Khu A): Strongbow Táo x1	t	2026-05-27 10:05:01.6254
106	1	[Gửi đơn] Bàn 6 (Khu A): khách đã gửi đơn — tổng 55.000 ₫	t	2026-05-27 10:05:03.294207
97	2	[Gọi món] Bàn 6 (Khu A): Nem cua bể Hải Phòng x1	t	2026-05-27 10:04:03.057572
99	2	[Gọi món] Bàn 6 (Khu A): Pizza hải sản x1	t	2026-05-27 10:04:03.848989
101	2	[Gửi đơn] Bàn 6 (Khu A): khách đã gửi đơn — tổng 469.000 ₫	t	2026-05-27 10:04:10.405542
103	2	[Gọi món] Bàn 6 (Khu A): Strongbow Táo x1	t	2026-05-27 10:05:01.624247
105	2	[Gửi đơn] Bàn 6 (Khu A): khách đã gửi đơn — tổng 55.000 ₫	t	2026-05-27 10:05:03.293112
108	1	[Thanh toán] Bàn 6 (Khu A): khách yêu cầu thanh toán — Tiền mặt · 3.023.000 ₫ · Đơn #31	t	2026-05-27 10:05:24.816559
110	1	[Thanh toán] Bàn 8 (Khu B): khách yêu cầu thanh toán — Tiền mặt · 2.499.000 ₫ · Đơn #32	t	2026-06-04 22:54:26.659115
120	1	[Thanh toán] Bàn 6 (Khu A): khách yêu cầu thanh toán — Tiền mặt · 350.000 ₫ · Đơn #36	t	2026-06-04 23:35:28.623175
118	1	[Gửi đơn] Bàn 6 (Khu A): khách đã gửi đơn — tổng 50.000 ₫	t	2026-06-04 23:28:35.81458
112	1	[Thanh toán] Bàn 6 (Khu A): khách yêu cầu thanh toán — Chuyển khoản · 350.000 ₫ · Đơn #33	t	2026-06-04 23:08:51.039249
114	1	[Thanh toán] Bàn 11 (Sân vườn): khách yêu cầu thanh toán — Tiền mặt · 350.000 ₫ · Đơn #34	t	2026-06-04 23:19:56.977876
116	1	[Gọi món] Bàn 6 (Khu A): Budweiser x1	t	2026-06-04 23:28:12.360178
122	1	[Gọi món] Bàn 6 (Khu A): Coca Cola x1	t	2026-06-10 00:29:18.918464
124	1	[Gọi món] Bàn 6 (Khu A): Espresso đá cam x1	t	2026-06-10 00:29:19.697265
126	1	[Gọi món] Bàn 6 (Khu A): Budweiser x1	t	2026-06-10 00:29:20.86361
128	1	[Gọi món] Bàn 13: Birthday Party Set x1	t	2026-06-10 16:23:46.753334
130	1	[Gửi đơn] Bàn 13: khách đã gửi đơn — tổng 2.499.000 ₫	t	2026-06-10 16:23:56.148992
132	1	[Thanh toán] Bàn 13: khách yêu cầu thanh toán — Tiền mặt · 4.998.000 ₫ · Đơn #41	t	2026-06-10 16:30:00.400976
134	1	[Gọi món] Bàn 6 (Khu A): Romantic Dinner Set x1	t	2026-06-12 18:07:42.957808
136	1	[Gọi món] Bàn 6 (Khu A): Chef Signature Set x1	t	2026-06-12 18:07:52.818962
138	1	[Gọi món] Bàn 6 (Khu A): Birthday Party Set x1	t	2026-06-12 18:07:55.817212
140	1	[Gọi món] Bàn 1 (VIP): Chef Signature Set x1	t	2026-06-12 23:26:47.467562
142	1	[Gọi món] Bàn 1 (VIP): Chef Signature Set x1	t	2026-06-12 23:27:05.306134
144	1	[Gửi đơn] Bàn 1 (VIP): khách đã gửi đơn — tổng 3.490.000 ₫	t	2026-06-12 23:27:09.332609
146	1	[Gọi món] Bàn 1 (VIP): Romantic Dinner Set x1	t	2026-06-12 23:27:19.929539
148	1	[Gọi món] Bàn 1 (VIP): Birthday Party Set x1	t	2026-06-12 23:32:27.667331
150	1	[Gửi đơn] Bàn 1 (VIP): khách đã gửi đơn — tổng 2.499.000 ₫	t	2026-06-12 23:33:04.239878
152	1	[Thanh toán] Bàn 1 (VIP): khách yêu cầu thanh toán — Tiền mặt · 2.499.000 ₫ · Đơn #45	t	2026-06-12 23:50:31.46152
154	1	[Thanh toán] Bàn 6 (Khu A): khách yêu cầu thanh toán — Tiền mặt · 1.499.000 ₫ · Đơn #46	t	2026-06-23 14:45:01.969868
156	1	[Thanh toán] Bàn 2 (VIP): khách yêu cầu thanh toán — Chuyển khoản · 7.217.000 ₫ · Đơn #47	t	2026-06-25 15:54:23.59763
162	1	[Thanh toán] Bàn 1 (VIP): khách yêu cầu thanh toán — Tiền mặt · 1.790.000 ₫ · Đơn #49	t	2026-06-27 22:07:14.137682
160	1	[Gửi đơn] Bàn 1 (VIP): khách đã gửi đơn — tổng 1.790.000 ₫	t	2026-06-27 22:06:46.234804
158	1	[Gọi món] Bàn 1 (VIP): Anniversary Couple Set x1	t	2026-06-27 22:06:44.754293
107	2	[Thanh toán] Bàn 6 (Khu A): khách yêu cầu thanh toán — Tiền mặt · 3.023.000 ₫ · Đơn #31	t	2026-05-27 10:05:24.815474
109	2	[Thanh toán] Bàn 8 (Khu B): khách yêu cầu thanh toán — Tiền mặt · 2.499.000 ₫ · Đơn #32	t	2026-06-04 22:54:26.656885
111	2	[Thanh toán] Bàn 6 (Khu A): khách yêu cầu thanh toán — Chuyển khoản · 350.000 ₫ · Đơn #33	t	2026-06-04 23:08:51.03762
113	2	[Thanh toán] Bàn 11 (Sân vườn): khách yêu cầu thanh toán — Tiền mặt · 350.000 ₫ · Đơn #34	t	2026-06-04 23:19:56.976269
115	2	[Gọi món] Bàn 6 (Khu A): Budweiser x1	t	2026-06-04 23:28:12.359081
117	2	[Gửi đơn] Bàn 6 (Khu A): khách đã gửi đơn — tổng 50.000 ₫	t	2026-06-04 23:28:35.81285
121	2	[Gọi món] Bàn 6 (Khu A): Coca Cola x1	t	2026-06-10 00:29:18.908112
164	1	[Thanh toán] Bàn 11 (Sân vườn): khách yêu cầu thanh toán — Chuyển khoản · 1.790.000 ₫ · Đơn #51	t	2026-06-29 00:09:57.519138
119	2	[Thanh toán] Bàn 6 (Khu A): khách yêu cầu thanh toán — Tiền mặt · 350.000 ₫ · Đơn #36	t	2026-06-04 23:35:28.622147
123	2	[Gọi món] Bàn 6 (Khu A): Espresso đá cam x1	t	2026-06-10 00:29:19.696068
125	2	[Gọi món] Bàn 6 (Khu A): Budweiser x1	t	2026-06-10 00:29:20.862866
127	2	[Gọi món] Bàn 13: Birthday Party Set x1	t	2026-06-10 16:23:46.750285
129	2	[Gửi đơn] Bàn 13: khách đã gửi đơn — tổng 2.499.000 ₫	t	2026-06-10 16:23:56.146222
131	2	[Thanh toán] Bàn 13: khách yêu cầu thanh toán — Tiền mặt · 4.998.000 ₫ · Đơn #41	t	2026-06-10 16:30:00.399604
133	2	[Gọi món] Bàn 6 (Khu A): Romantic Dinner Set x1	t	2026-06-12 18:07:42.955249
135	2	[Gọi món] Bàn 6 (Khu A): Chef Signature Set x1	t	2026-06-12 18:07:52.817572
137	2	[Gọi món] Bàn 6 (Khu A): Birthday Party Set x1	t	2026-06-12 18:07:55.816117
139	2	[Gọi món] Bàn 1 (VIP): Chef Signature Set x1	t	2026-06-12 23:26:47.465757
141	2	[Gọi món] Bàn 1 (VIP): Chef Signature Set x1	t	2026-06-12 23:27:05.304815
143	2	[Gửi đơn] Bàn 1 (VIP): khách đã gửi đơn — tổng 3.490.000 ₫	t	2026-06-12 23:27:09.331471
145	2	[Gọi món] Bàn 1 (VIP): Romantic Dinner Set x1	t	2026-06-12 23:27:19.928676
147	2	[Gọi món] Bàn 1 (VIP): Birthday Party Set x1	t	2026-06-12 23:32:27.665948
149	2	[Gửi đơn] Bàn 1 (VIP): khách đã gửi đơn — tổng 2.499.000 ₫	t	2026-06-12 23:33:04.238597
151	2	[Thanh toán] Bàn 1 (VIP): khách yêu cầu thanh toán — Tiền mặt · 2.499.000 ₫ · Đơn #45	t	2026-06-12 23:50:31.459966
153	2	[Thanh toán] Bàn 6 (Khu A): khách yêu cầu thanh toán — Tiền mặt · 1.499.000 ₫ · Đơn #46	t	2026-06-23 14:45:01.968347
155	2	[Thanh toán] Bàn 2 (VIP): khách yêu cầu thanh toán — Chuyển khoản · 7.217.000 ₫ · Đơn #47	t	2026-06-25 15:54:23.595851
157	2	[Gọi món] Bàn 1 (VIP): Anniversary Couple Set x1	t	2026-06-27 22:06:44.752939
159	2	[Gửi đơn] Bàn 1 (VIP): khách đã gửi đơn — tổng 1.790.000 ₫	t	2026-06-27 22:06:46.233167
161	2	[Thanh toán] Bàn 1 (VIP): khách yêu cầu thanh toán — Tiền mặt · 1.790.000 ₫ · Đơn #49	t	2026-06-27 22:07:14.136543
163	2	[Thanh toán] Bàn 11 (Sân vườn): khách yêu cầu thanh toán — Chuyển khoản · 1.790.000 ₫ · Đơn #51	t	2026-06-29 00:09:57.517926
165	2	[Gọi món] Bàn 6 (Khu A): Japanese Fine Dining Set x1	f	2026-06-29 00:16:36.418255
167	2	[Gửi đơn] Bàn 6 (Khu A): khách đã gửi đơn — tổng 2.190.000 ₫	f	2026-06-29 00:16:37.631399
166	1	[Gọi món] Bàn 6 (Khu A): Japanese Fine Dining Set x1	t	2026-06-29 00:16:36.419452
168	1	[Gửi đơn] Bàn 6 (Khu A): khách đã gửi đơn — tổng 2.190.000 ₫	t	2026-06-29 00:16:37.632295
\.


--
-- TOC entry 5261 (class 0 OID 17164)
-- Dependencies: 240
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, food_id, quantity, price, kitchen_status, kitchen_ack_at, note) FROM stdin;
1	1	\N	1	120000.00	PENDING	\N	\N
8	12	\N	1	120000.00	PENDING	\N	\N
71	47	36	1	239000.00	SERVED	2026-06-25 15:52:49.068775	\N
2	1	\N	2	20000.00	PENDING	\N	\N
72	47	37	1	299000.00	SERVED	2026-06-25 15:52:49.963964	\N
73	47	58	1	1290000.00	SERVED	2026-06-25 15:52:50.389502	\N
5	11	\N	1	2000000.00	ACKNOWLEDGED	2026-05-04 14:29:15.406384	\N
74	47	67	1	1899000.00	SERVED	2026-06-25 15:52:50.959611	\N
75	47	72	1	3490000.00	SERVED	2026-06-25 15:52:52.157146	\N
10	13	\N	1	2000000.00	ACKNOWLEDGED	2026-05-04 14:37:48.480293	\N
76	49	70	1	1790000.00	SERVED	2026-06-27 22:06:52.030247	\N
13	16	\N	2	20000.00	PENDING	\N	\N
14	17	\N	1	20000.00	ACKNOWLEDGED	2026-05-05 11:12:49.025895	\N
77	50	70	1	1790000.00	PENDING	\N	\N
33	26	51	3	50000.00	PENDING	\N	\N
40	28	23	1	23000.00	ACKNOWLEDGED	2026-05-26 21:00:09.973078	\N
41	28	51	1	50000.00	ACKNOWLEDGED	2026-05-26 21:00:10.45519	\N
34	27	25	1	65000.00	ACKNOWLEDGED	2026-05-26 21:00:12.118351	\N
35	27	27	1	69000.00	ACKNOWLEDGED	2026-05-26 21:00:12.412761	\N
78	51	70	1	1790000.00	SERVED	2026-06-29 00:09:40.380434	\N
37	27	35	1	289000.00	ACKNOWLEDGED	2026-05-26 21:00:13.869859	\N
38	27	44	1	119000.00	ACKNOWLEDGED	2026-05-26 21:00:13.869859	\N
39	27	55	1	720000.00	ACKNOWLEDGED	2026-05-26 21:00:13.869859	\N
43	30	76	1	289000.00	ACKNOWLEDGED	2026-05-27 10:04:44.435345	\N
44	30	16	1	180000.00	ACKNOWLEDGED	2026-05-27 10:04:44.435345	\N
42	29	66	1	2499000.00	ACKNOWLEDGED	2026-05-27 10:04:47.687817	\N
45	31	53	1	55000.00	ACKNOWLEDGED	2026-05-27 10:05:08.534264	\N
17	18	\N	1	200.00	ACKNOWLEDGED	2026-05-05 14:37:04.992014	\N
46	32	66	1	2499000.00	SERVED	2026-06-04 22:53:32.368358	\N
28	23	\N	1	200.00	PENDING	\N	\N
47	33	51	7	50000.00	SERVED	2026-06-04 23:08:11.94111	\N
30	24	\N	1	200.00	ACKNOWLEDGED	2026-05-13 11:20:50.57794	\N
48	34	51	7	50000.00	SERVED	2026-06-04 23:17:53.389086	\N
18	18	\N	1	13000.00	ACKNOWLEDGED	2026-05-05 14:37:05.464213	\N
49	35	51	6	50000.00	SERVED	2026-06-04 23:23:34.697934	\N
22	20	\N	1	1300000.00	ACKNOWLEDGED	2026-05-05 17:01:04.668498	\N
50	36	51	1	50000.00	SERVED	2026-06-04 23:28:44.08247	\N
7	11	\N	1	50000.00	ACKNOWLEDGED	2026-05-04 14:29:16.343369	\N
16	17	\N	1	50000.00	ACKNOWLEDGED	2026-05-05 11:12:50.705664	\N
21	19	\N	1	50000.00	ACKNOWLEDGED	2026-05-05 17:01:06.515562	\N
27	22	\N	1	50000.00	ACKNOWLEDGED	2026-05-06 09:11:45.745427	\N
26	21	\N	1	60000.00	ACKNOWLEDGED	2026-05-05 17:09:31.984719	\N
9	12	\N	1	40000.00	PENDING	\N	\N
12	14	\N	1	40000.00	ACKNOWLEDGED	2026-05-04 14:37:52.051236	\N
19	18	\N	1	10000.00	ACKNOWLEDGED	2026-05-05 14:37:05.902121	\N
4	2	\N	1	30000.00	PENDING	\N	\N
6	11	\N	1	30000.00	ACKNOWLEDGED	2026-05-04 14:29:15.913999	\N
11	13	\N	1	30000.00	ACKNOWLEDGED	2026-05-04 14:37:48.963032	\N
15	17	\N	1	30000.00	ACKNOWLEDGED	2026-05-05 11:12:50.022975	\N
20	19	\N	1	30000.00	ACKNOWLEDGED	2026-05-05 17:01:06.515562	\N
29	23	\N	1	30000.00	PENDING	\N	\N
31	24	\N	1	30000.00	ACKNOWLEDGED	2026-05-13 11:20:51.022825	\N
25	21	\N	1	1300000.00	ACKNOWLEDGED	2026-05-05 17:09:31.984719	\N
32	24	\N	1	1300000.00	ACKNOWLEDGED	2026-05-13 11:20:52.982444	\N
3	2	\N	1	200000.00	PENDING	\N	\N
23	20	\N	1	200000.00	ACKNOWLEDGED	2026-05-05 17:01:04.668498	\N
24	21	\N	1	200000.00	ACKNOWLEDGED	2026-05-05 17:09:31.984719	\N
36	27	\N	1	399000.00	ACKNOWLEDGED	2026-05-26 21:00:13.869859	\N
51	37	23	1	23000.00	PENDING	\N	\N
52	37	26	1	75000.00	PENDING	\N	\N
53	37	51	1	50000.00	PENDING	\N	\N
54	38	77	1	799000.00	PENDING	\N	\N
55	39	16	1	180000.00	PENDING	\N	\N
56	39	36	1	239000.00	PENDING	\N	\N
57	39	57	1	389000.00	PENDING	\N	\N
58	39	58	1	1290000.00	PENDING	\N	\N
59	39	60	1	689000.00	PENDING	\N	\N
61	41	66	1	2499000.00	SERVED	2026-06-10 16:24:04.247462	\N
60	40	66	1	2499000.00	SERVED	2026-06-10 16:24:07.00585	\N
64	43	72	1	3490000.00	PENDING	\N	\N
65	43	66	1	2499000.00	PENDING	\N	\N
79	52	77	2	799000.00	PENDING	\N	\N
69	45	66	1	2499000.00	SERVED	2026-06-12 23:43:11.971208	\N
70	46	65	1	1499000.00	SERVED	2026-06-21 18:38:36.822335	\N
80	53	71	1	2190000.00	SERVED	2026-06-29 15:42:51.953587	\N
81	54	77	1	799000.00	PENDING	\N	\N
82	57	66	1	2499000.00	SERVED	2026-06-30 14:31:17.768426	\N
\.


--
-- TOC entry 5259 (class 0 OID 17144)
-- Dependencies: 238
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, booking_id, table_session_id, status, created_at) FROM stdin;
1	2	\N	DONE	2026-04-22 10:14:31.073346
2	3	\N	DONE	2026-04-22 10:14:31.073346
3	4	1	DONE	2026-04-30 23:21:18.211348
4	5	2	DONE	2026-04-30 23:22:16.687784
5	6	3	DONE	2026-04-30 23:28:14.739931
6	7	4	DONE	2026-04-30 23:34:58.660928
7	8	5	DONE	2026-04-30 23:35:22.371491
8	9	6	DONE	2026-04-30 23:35:57.731053
9	10	7	DONE	2026-04-30 23:39:03.835752
10	11	8	DONE	2026-04-30 23:40:26.244489
55	50	38	DONE	2026-06-30 14:27:53.521857
11	12	9	DONE	2026-05-04 14:26:41.181495
12	13	\N	PENDING	2026-05-04 14:34:51.394201
13	13	10	SERVING	2026-05-04 14:35:16.623337
14	13	10	DONE	2026-05-04 14:36:03.244006
16	15	\N	PENDING	2026-05-05 11:08:37.870186
56	2	39	DONE	2026-06-30 14:29:35.761256
17	15	12	DONE	2026-05-05 11:09:49.2093
15	14	11	DONE	2026-05-04 14:40:09.013232
18	18	13	DONE	2026-05-05 14:33:07.24617
19	19	14	SERVING	2026-05-05 17:00:14.244055
20	19	14	DONE	2026-05-05 17:00:35.331478
57	51	40	DONE	2026-06-30 14:30:38.185029
21	20	15	DONE	2026-05-05 17:09:14.178976
22	21	16	DONE	2026-05-06 09:11:30.168412
23	22	\N	PENDING	2026-05-11 14:12:54.43022
58	52	41	DONE	2026-06-30 15:20:17.903549
24	25	17	DONE	2026-05-13 11:18:23.50591
25	26	18	DONE	2026-05-26 09:25:29.387967
26	27	\N	PENDING	2026-05-26 20:42:09.156319
27	28	19	SERVING	2026-05-26 20:52:31.821668
28	28	19	DONE	2026-05-26 20:59:22.650152
29	29	20	SERVING	2026-05-27 10:03:22.341273
30	29	20	SERVING	2026-05-27 10:04:03.046767
59	53	42	DONE	2026-06-30 15:25:45.60428
31	29	20	DONE	2026-05-27 10:05:01.617819
32	30	21	DONE	2026-06-04 22:48:15.357175
33	31	22	DONE	2026-06-04 23:07:43.487787
34	32	23	DONE	2026-06-04 23:17:03.239283
35	33	24	SERVING	2026-06-04 23:23:20.555491
36	33	24	DONE	2026-06-04 23:28:12.340327
37	34	25	DONE	2026-06-10 00:29:08.507758
38	36	\N	PENDING	2026-06-10 14:03:51.750644
39	37	\N	PENDING	2026-06-10 14:36:12.841846
40	38	26	SERVING	2026-06-10 16:22:42.47119
41	38	26	DONE	2026-06-10 16:23:46.73156
42	39	27	DONE	2026-06-12 18:06:45.39838
43	39	27	DONE	2026-06-12 18:07:42.946474
44	40	28	SERVING	2026-06-12 23:26:41.212478
45	40	28	DONE	2026-06-12 23:27:19.92166
46	41	29	DONE	2026-06-21 18:09:00.65385
47	42	30	DONE	2026-06-25 15:34:32.079693
48	43	31	DONE	2026-06-25 20:22:57.429938
49	44	32	DONE	2026-06-27 22:06:29.052938
50	45	33	DONE	2026-06-29 00:03:07.334784
51	46	34	DONE	2026-06-29 00:06:05.922108
52	47	35	DONE	2026-06-29 00:11:33.616893
53	48	36	DONE	2026-06-29 00:16:15.783306
54	49	37	DONE	2026-06-29 15:45:23.09676
\.


--
-- TOC entry 5267 (class 0 OID 17216)
-- Dependencies: 246
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
8	14	f7a2071423e87cf00881e93cde8cdc962340549acf586c6abf0fb54700495df8	2026-06-11 13:31:11.584251	\N	2026-06-11 13:21:11.584251
\.


--
-- TOC entry 5263 (class 0 OID 17185)
-- Dependencies: 242
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, order_id, amount, method, status, paid_at, transaction_code, cashier_id, note, tax, discount, surcharge) FROM stdin;
1	1	160000.00	cash	PAID	\N	\N	\N	\N	0.00	0.00	0.00
2	2	230000.00	bank	PAID	\N	\N	\N	\N	0.00	0.00	0.00
3	11	2080000.00	bank_transfer	PAID	2026-05-04 14:29:30.895088	\N	\N	\N	0.00	0.00	0.00
4	14	2070000.00	cash	PAID	2026-05-04 14:39:29.742876	\N	\N	\N	0.00	0.00	0.00
5	17	100000.00	bank_transfer	PAID	2026-05-05 11:16:14.36982	\N	\N	\N	0.00	0.00	0.00
6	18	23200.00	cash	UNPAID	\N	\N	\N	\N	0.00	0.00	0.00
7	20	1580000.00	cash	PAID	2026-05-05 17:03:08.420444	\N	\N	\N	0.00	0.00	0.00
8	21	1560000.00	bank_transfer	PAID	2026-05-05 17:16:14.870591	\N	\N	\N	0.00	0.00	0.00
9	22	50000.00	cash	PAID	2026-05-06 09:12:19.450804	\N	\N	\N	0.00	0.00	0.00
10	24	1330200.00	cash	PAID	2026-05-13 11:29:50.792748	\N	\N	\N	0.00	0.00	0.00
11	28	1734000.00	cash	PAID	2026-05-26 21:01:46.135164	\N	\N	\N	0.00	0.00	0.00
12	31	3023000.00	cash	PAID	2026-05-27 10:05:44.109797	\N	\N	\N	0.00	0.00	0.00
13	32	2499000.00	cash	PAID	2026-06-04 22:54:43.532992	\N	\N	\N	0.00	0.00	0.00
14	33	350000.00	bank_transfer	PAID	2026-06-04 23:09:28.318372	\N	\N	\N	0.00	0.00	0.00
15	34	350000.00	cash	PAID	2026-06-04 23:20:01.786049	\N	\N	\N	0.00	0.00	0.00
16	36	350000.00	cash	PAID	2026-06-04 23:35:36.649673	\N	\N	\N	0.00	0.00	0.00
17	37	162800.00	cash	PAID	2026-06-10 00:32:50.410031	\N	1	\N	14800.00	0.00	0.00
18	41	2519000.00	cash	PAID	2026-06-10 16:31:28.275836	\N	1	\N	0.00	0.00	20000.00
19	45	2499000.00	cash	PAID	2026-06-12 23:50:41.058347	\N	\N	\N	0.00	0.00	0.00
20	46	1499000.00	cash	PAID	2026-06-23 14:45:21.763876	\N	\N	\N	0.00	0.00	0.00
21	47	7217000.00	bank_transfer	PAID	2026-06-25 15:54:45.772208	\N	\N	\N	0.00	0.00	0.00
22	49	1790000.00	cash	PAID	2026-06-27 22:07:19.191133	\N	\N	\N	0.00	0.00	0.00
23	51	1790000.00	bank_transfer	PAID	2026-06-29 00:10:04.793503	\N	\N	\N	0.00	0.00	0.00
24	53	2409000.00	cash	PAID	2026-06-29 15:43:22.0823	\N	1	\N	219000.00	0.00	0.00
25	57	2748900.00	cash	PAID	2026-06-30 14:31:32.879795	\N	1	\N	249900.00	0.00	0.00
\.


--
-- TOC entry 5241 (class 0 OID 16985)
-- Dependencies: 220
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name) FROM stdin;
1	ADMIN
2	STAFF
3	CUSTOMER
\.


--
-- TOC entry 5245 (class 0 OID 17018)
-- Dependencies: 224
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, restaurant_name, logo_url, banner_urls, banner_enabled, banner_mode, banner_show_on_home, banner_show_on_auth, header_cta_label, header_cta_url, footer_tagline, footer_copyright, footer_links, social_links, total_tables, address, phone, email, open_time, close_time, updated_at, payment_bank_account, payment_bank_code, payment_transfer_content, payment_qr_template, hero_eyebrow, hero_lead, hero_meta, hero_panel_tag, home_features_title, home_features_desc, home_cta_title, home_cta_text, home_features_json, system_email, system_email_password, reservation_hold_duration) FROM stdin;
1	Luxeat Restaurant	/uploads/1782040689794_LogoTrang.png	{/uploads/1778494324329_8a2e7d58ec6c4_Pic4.jpg,/uploads/1778494328642_37737789ff91d_pic3.jpg,/uploads/1778494335629_d56998d069994_pic2.jpg,/uploads/1778495119958_4a26f15078de6_PIc5.jpg,/uploads/1778495127534_f84ad6ce0be1f_Pic6.jpg,"/uploads/1779640293134_033e6cce04ef1_Screenshot 2026-05-24 223246.png","/uploads/1779640311890_aa2092da6b374_Screenshot 2026-05-24 223406.png","/uploads/1779640322762_56ba5b4898fe5_Screenshot 2026-05-24 223725.png","/uploads/1779640329418_aa4baaada23ac_Screenshot 2026-05-24 223810.png","/uploads/1779640336819_45a93572b1758_Screenshot 2026-05-24 224335.png",/uploads/1782880634064_ba7de5f075791_864d89619931af7e269ba96a21d170d4.jpg,/uploads/1782880634065_4fba4f97c23cb_1220b76835c374e63fe9ba1dc684c8f2.jpg,"/uploads/1782880634066_da6ede5f521d9_táº£i xuá»ng (1).jpg"}	t	SLIDESHOW	t	t	\N	\N	\N	\N	{}	{"zalo": "https://zalo.me/luxeatrestaurant", "facebook": "https://facebook.com/luxeat.restaurant", "instagram": "https://instagram.com/luxeat.restaurant"}	14	Hà Nội	0968668368	luxeat@gmail.com	08:00:00	22:30:00	2026-07-01 11:37:14.081776	0346786800	VCB	Thanh toan dat ban {id}	compact	Ẩm thực tinh tế · Đặt bàn trực tuyến	Trải nghiệm đặt bàn hiện đại: xem thực đơn mọi lúc, giữ chỗ chỉ vài bước, và quản lý lịch sử ngay trên trình duyệt.	Phục vụ tận nơi · không gian ấm cúng	Hôm nay còn bàn	Vì sao chọn chúng tôi	Giao diện gọn, thao tác nhanh — phù hợp cả khách lẻ lẫn nhóm bạn.	Sẵn sàng đặt bàn?	Chỉ mất vài phút — chọn giờ và số khách phù hợp.	[\n  {\n    "title": "Đặt bàn dễ dàng",\n    "text": "Chọn ngày, giờ và số khách — xác nhận nhanh, không cần gọi điện.",\n    "icon": "calendar"\n  },\n  {\n    "title": "Thực đơn rõ ràng",\n    "text": "Xem món, giá và mô tả trước khi đến; gợi ý món phù hợp buổi tối.",\n    "icon": "menu"\n  },\n  {\n    "title": "Theo dõi lịch sử",\n    "text": "Đăng nhập để xem các lần đặt trước và chi tiết đơn.",\n    "icon": "history"\n  }\n]	\N	\N	15
\.


--
-- TOC entry 5257 (class 0 OID 17117)
-- Dependencies: 236
-- Data for Name: table_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.table_sessions (id, table_id, booking_id, qr_token, status, created_at, closed_at) FROM stdin;
1	1	4	VnZlUsviO8dUZHkJIY-O-EGmv7A08Y27rR5Mxw9MCn4	CLOSED	2026-04-30 23:21:18.209472	2026-04-30 23:22:08.806723
2	1	5	eOyEzEV-YexSih-V6gcHQTmopeBkWsVd2dbpO27s5JI	CLOSED	2026-04-30 23:22:16.686477	2026-04-30 23:22:36.589834
3	1	6	OJasKlnXZtzxOQpUWFlVmaMyW-8i0G2HENxi2EMS5QM	CLOSED	2026-04-30 23:28:14.73896	2026-04-30 23:28:24.277149
4	2	7	XGpcui8MpH3vEMLsS_Mbaf1FYQeZ1e_T9cFJk7EwpBw	CLOSED	2026-04-30 23:34:58.660048	2026-04-30 23:35:12.025196
5	1	8	XM5Iqlh0BsDeqV8aJdCwic9LZFctpO_2hf78xAMnrlQ	CLOSED	2026-04-30 23:35:22.370573	2026-04-30 23:35:29.359297
6	2	9	uRfxtv-f02hyCBx2iybVzc6HTm75bOkxsGqFak96E3A	CLOSED	2026-04-30 23:35:57.729918	2026-04-30 23:36:11.988485
7	3	10	adR007S6PptBtDI2wTf89JAiToAziEqFxVScXtuXjg0	CLOSED	2026-04-30 23:39:03.83442	2026-04-30 23:39:10.047709
8	4	11	DE0nX6BsjDZNJJpdpwkqVX8bRvB1MAeoMPUdRO7GjSc	CLOSED	2026-04-30 23:40:26.243223	2026-04-30 23:40:31.059723
9	2	12	PKui3HYMDqX1kymHURvQ4pc61NCte40-Eq1u1IO4HVI	CLOSED	2026-05-04 14:26:41.179752	2026-05-04 14:29:30.895088
10	1	13	spVxxhdfL5AdB6YkFQHUzk_zfDaD9rlVa9RvQPQnRvs	CLOSED	2026-05-04 14:35:16.622086	2026-05-04 14:39:29.742876
12	2	15	JoTwcaM38iQcjALnTSaT___Ig2j9UgdZAtGxvrTpAyE	CLOSED	2026-05-05 11:09:49.207107	2026-05-05 11:16:14.36982
11	1	14	knLn0bo-mhJH1-MvJQk2oUYbzXZc9xR6da3ciRiLEbY	CLOSED	2026-05-04 14:40:09.012047	2026-05-05 11:16:51.148703
13	2	18	M799m6RWjwtkwtLennm2Ly3t4Jx6-4z5TOwN8PVA9aY	CLOSED	2026-05-05 14:33:07.2451	2026-05-05 14:38:51.568061
14	4	19	nF-hjCuK9MYGlHd8YjeEXlo5tre6EgtoJ7z-ZCUxZFo	CLOSED	2026-05-05 17:00:14.24289	2026-05-05 17:03:08.420444
15	5	20	SW0SdrBAVFORsAmJ9_4_b6QoxtZM30eKSXeap9JmF54	CLOSED	2026-05-05 17:09:14.177699	2026-05-05 17:16:14.870591
16	4	21	Po0tXrs_-1HhBm29jF98fAippXy1YXBdLrk3DcqigpM	CLOSED	2026-05-06 09:11:30.166795	2026-05-06 09:12:19.450804
17	11	25	t2sBDQ4JEWcpQMKGCIqC2LLxxWtUhDE5Ekbqn7DySUY	CLOSED	2026-05-13 11:18:23.503472	2026-05-13 11:29:50.792748
18	1	26	cdErB5ipqqiQRHIrXEWWWNzc1eBsdIGVh5vSLB8LEZU	CLOSED	2026-05-26 09:25:29.385137	2026-05-26 10:21:24.936843
19	6	28	gOF9d1RGet57xdDnkglU5XfXQzigAaRsg8hNxJEg6y4	CLOSED	2026-05-26 20:59:12.037785	2026-05-26 21:01:46.135164
20	6	29	VtT4iXEBuYbCjJD6OeQqGEdOfSmemHDkAXwu5ca-SYo	CLOSED	2026-05-27 10:03:42.441834	2026-05-27 10:05:44.109797
21	8	30	d-UnZoCk8jl6o3aYd4Tqt8MtET_tcxg4EbudwG06Ybk	CLOSED	2026-06-04 22:52:11.266142	2026-06-04 22:54:43.532992
22	6	31	A9E4J35-3yoL-dsdgUWX6f8G5Wyv9Xx_QLv1BLQJaGQ	CLOSED	2026-06-04 23:07:52.94048	2026-06-04 23:09:28.318372
23	11	32	1x-ytkYHDKIQPDCyRNvzar3iqK4PdhYAuJgUqQsk9aA	CLOSED	2026-06-04 23:17:21.163169	2026-06-04 23:20:01.786049
24	6	33	dG19EY6SGz0yyfOinsoGMQqipKOmsFH6nv24kLdfGlM	CLOSED	2026-06-04 23:23:26.106538	2026-06-04 23:35:36.649673
25	6	34	b6SXZ59lUMGULnNgSuN0IPBj9OT_4kTVRzeiHcNsZXI	CLOSED	2026-06-10 00:29:08.505151	2026-06-10 00:32:50.410031
26	15	38	yTN1fy3Aw8tnKOh-xG9AsfGHwa1IGRq_0oRf1g3Z6HQ	CLOSED	2026-06-10 16:23:15.39536	2026-06-10 16:31:28.275836
27	6	39	Y7r-4SKKz1r0i2223adqyhGsP5QbS5jJhLdS6lNoIiQ	CLOSED	2026-06-12 18:07:36.535486	2026-06-12 23:17:40.820126
28	1	40	5sTSX2bhOSlgKubLghRGVrA04gKbS2PPNyUGzk-Oe3M	CLOSED	2026-06-12 23:26:41.210088	2026-06-12 23:50:41.058347
29	6	41	fCEZQAJz5Q8t4sNZ6nlrOoOqOI_hWR8qJGS5UBZLqYA	CLOSED	2026-06-21 18:09:22.281967	2026-06-23 14:45:21.763876
30	2	42	8ARdgb2UvHHcmUudI8ajx7goR825Mwg-jnRvGDqbai8	CLOSED	2026-06-25 15:34:55.554217	2026-06-25 15:54:45.772208
31	5	43	JlLb2wowvOqDpSpPsDa1NAUonjZ2JGmxXdgqYyUs-qs	CLOSED	2026-06-25 20:22:57.427951	2026-06-26 23:20:22.472562
32	1	44	jF6otGc-UFxfRrnCi3w_NHEZ4F_60FYnFvo5kWrhumg	CLOSED	2026-06-27 22:06:29.049732	2026-06-27 22:07:19.191133
33	11	45	7axCnDVyK7XUPg_OAGskv60qdR64TI8rzQNaj-l3S5g	CLOSED	2026-06-29 00:03:49.061728	2026-06-29 00:04:41.991969
34	11	46	wDUXlUweNOs9jiLEvF5H4lutpGIBUTsCNaEz_OLK4BA	CLOSED	2026-06-29 00:06:14.011411	2026-06-29 00:10:04.793503
35	3	47	AXu0Y7CAP8ztMnUyqsY7g1_HKbdrpSF65zsdOEhkDJQ	CLOSED	2026-06-29 00:11:55.070218	2026-06-29 00:13:44.559966
36	6	48	uMGAnE2tkAH_RMsJ0WqZ9d4HBcCEcBjm2EfPOXGrIGI	CLOSED	2026-06-29 00:16:15.781359	2026-06-29 15:43:22.0823
37	1	49	6VHca43yldpSeycXb0qeJE0Z2Uw2TRLBGLA2tvew9t0	CLOSED	2026-06-29 15:45:33.468046	2026-06-30 14:27:09.221807
38	12	50	swSsr4msAblSZCvOyp01WZProEEIdAr7D0w65A40mi4	CLOSED	2026-06-30 14:27:53.518683	2026-06-30 14:28:09.365015
39	2	2	tGPt_ue0Kf6WHKeTk3uzPO8tW9cL-CT_Q51YHosRMrA	CLOSED	2026-06-30 14:29:35.755826	2026-06-30 14:30:13.6227
40	1	51	_qPKfw2GoWLJU2LFYVGfzCrhifcHcCIXCDNF8b9qmdA	CLOSED	2026-06-30 14:30:47.316447	2026-06-30 14:31:32.879795
41	4	52	-Kf7QddRmx58nznY1WfK9GHiSSYBTqblrumVYkooqMU	CLOSED	2026-06-30 15:20:17.900979	2026-06-30 15:24:58.086838
42	4	53	NNeepuKWnLRCmGgRvi93ZT_QudGKbplCX8G_TljaM-s	CLOSED	2026-06-30 15:25:45.600624	2026-06-30 15:25:56.254465
\.


--
-- TOC entry 5247 (class 0 OID 17036)
-- Dependencies: 226
-- Data for Name: tables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tables (id, name, capacity, status, status_note, pos_x, pos_y, created_at, image_url, zone, is_deleted) FROM stdin;
4	Bàn 4	6	AVAILABLE	\N	464	98	2026-04-22 10:14:31.073346	/uploads/table_4_1779636939115_37268c48d381c.png	Yên tĩnh	f
17	Bàn 13	20	AVAILABLE	\N	\N	\N	2026-07-02 23:54:02.241166	/uploads/table_17_1783011242275_3dd295500c9c8.png	Bể bơi	f
18	Bàn 14	2	AVAILABLE	\N	\N	\N	2026-07-02 23:55:41.646874	/uploads/table_18_1783011341666_5d2a1d752c4b5.png	Bể bơi	f
5	Bàn 5	8	AVAILABLE	\N	592	96	2026-04-22 10:14:31.073346	/uploads/table_5_1779636973228_39cee5b66c6d1.png	Yên tĩnh	f
15	Bàn 13	14	CLOSED	\N	\N	\N	2026-06-10 00:49:27.096855	\N	\N	t
8	Bàn 8	8	AVAILABLE	\N	54	253	2026-05-04 15:43:03.4052	/uploads/table_8_1779637097949_47d3c53999001.png	Khu B	f
9	Bàn 9	8	AVAILABLE	\N	191	253	2026-05-05 14:11:17.022855	/uploads/table_9_1779637105683_def895fde61a2.png	Khu B	f
10	Bàn 10	6	AVAILABLE	\N	360	243	2026-05-05 14:11:21.543174	/uploads/table_10_1779637424802_b1d95a51e48c6.png	Sân vườn	f
16	Bàn 14	10	CLOSED	\N	\N	\N	2026-06-10 00:55:54.182821	\N	\N	t
7	Bàn 7	4	AVAILABLE	\N	864	96	2026-04-30 23:41:59.905448	/uploads/table_7_1779637063819_67d84dc5a31f7.png	Khu A	f
11	Bàn 11	3	AVAILABLE	\N	509	238	2026-05-05 14:11:26.244024	/uploads/table_11_1779637434170_42455c5ac9489.png	Sân vườn	f
3	Bàn 3	20	AVAILABLE	\N	320	96	2026-04-22 10:14:31.073346	/uploads/table_3_1779636862864_d5de2e07d7509.png	VIP	f
6	Bàn 6	2	AVAILABLE	\N	728	96	2026-04-22 10:14:31.073346	/uploads/table_6_1779637053992_bcc765645e17c.png	Khu A	f
12	Bàn 12	10	AVAILABLE	\N	665	239	2026-05-25 14:30:11.6415	/uploads/table_12_1779694211684_97d1e6f0661d9.png	VIP	f
2	Bàn 2	12	AVAILABLE	\N	184	96	2026-04-22 10:14:31.073346	/uploads/table_2_1779636818311_c6916b3db08e8.png	VIP	f
1	Bàn 1	20	AVAILABLE	\N	48	96	2026-04-22 10:14:31.073346	/uploads/table_1_1779636780815_10a486598ca37.png	VIP	f
\.


--
-- TOC entry 5243 (class 0 OID 16997)
-- Dependencies: 222
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, phone, avatar_url, role_id, created_at, status) FROM stdin;
2	Nhân viên 1	staff1@gmail.com	$2b$10$UU7uJJcEYrSQZ9wdcYWlg.8B.9KP2Hy0aDp2VeedipG1Rm6MfBwRC	0900000002	\N	2	2026-04-22 10:14:31.073346	ACTIVE
8	Trần Minh Phương	mphuong@gmail.com	$2b$10$majAOxFouM9/rN.MDgC1x.PZ5X.AuI/FXo4JR.a0nTIBNSpwymoFK	0348593893	\N	3	2026-05-05 14:00:27.763852	ACTIVE
7	Dương Đăng Minh	dminhhh@gmail.com	$2b$10$CHa.prKg343OeEvf9NPAHuxlHGLaj.qjnjDqpIpnVg7ni3juVzoWe	0348490029	/uploads/user_7_1777964384171_866684f6fed7b.png	3	2026-05-05 13:59:44.155409	ACTIVE
6	Nguyễn Đức Bảo	dbaoooo@gmail.com	$2b$10$amo4wGAe8JJvvrhtxjrioOTIsQE9Ibp0bZ/Dj.4o9xONjbQIe/ree	0348594922	/uploads/user_6_1777964249889_2e1722800fd6d.png	3	2026-05-05 13:57:29.87321	ACTIVE
3	Nguyễn Văn An	anvann@gmail.com	$2b$10$ECbzHuPgz1Ac4.HrbBxhCuxLIGgBoB9XUAqDhXy9z2YbJ42WTNwWi	0992039299	/uploads/1779177158582_e1a9ae4495266_Screenshot 2026-04-19 142540.png	3	2026-04-22 10:14:31.073346	ACTIVE
4	Trần Thị Biên	bientt@gmail.com	$2b$10$UU7uJJcEYrSQZ9wdcYWlg.8B.9KP2Hy0aDp2VeedipG1Rm6MfBwRC	0347594944	\N	3	2026-04-22 10:14:31.073346	ACTIVE
14	Trang Nguyễn	ngtrang2204@gmail.com	$2b$10$SRzt5L0NqsXs6jPxqJz41OT2nVjDkVXGF/P.6f/DchfkT9auRt4z2	0346786801	/uploads/1782374879414_49941e4a36db_photo_2026-06-25_15-07-47.jpg	3	2026-05-13 10:29:06.982777	ACTIVE
1	Admin	admin@gmail.com	$2b$10$4VPsFnEdCetkqpMamJCuae3vtcr579MhnVfdnJeS5b4InwCd9vDVi	0948329301	/uploads/1778656275533_3bfec97823d39_Pic6.jpg	1	2026-04-22 10:14:31.073346	ACTIVE
10	Nguyễn Quang Hiếu	qhiu@gmail.com	$2b$10$aeIXloi6K3j6Wx2OghrnTuTGKR1ulMwwCIlMsh4woD13XY.68Ja1.	0946294629	/uploads/user_10_1782375108170_c95d0cf24ca6e.jpg	3	2026-05-05 14:03:27.300447	ACTIVE
18	Nguyễn Trí Hùng	trihung@gmail.com	$2b$10$AK9ir/g4pl9Cy5ORad68mucYNIuwUR6Pi04nlrIPlzIwftaKkiYg2	0938694935	\N	3	2026-06-26 23:19:23.474074	ACTIVE
19	Nguyễn Trọng Đại	daint@gmail.com	$2b$10$n7vFz69kLD011aOut5NWw.PBMPZmo8hxHEzkM4cdQ1Ldmyut.W.la	0938694956	\N	3	2026-06-26 23:19:59.753352	ACTIVE
20	Nguyễn Thị Thanh Chúc	chucthanhnt@gmail.com	$2b$10$VudHiO/o.ar7mD7uEcv1JuTV0gqBLwYspM/AOy87HqVmH7k.kIp/m	0946892494	\N	3	2026-07-02 23:43:20.49393	ACTIVE
21	Vũ Thanh Bình	binh@gmail.com	$2b$10$h4AKbyDO3zBdXYC5165E.OzuAhiWis4Rgay./E32fyG8RoPdhDcSO	0946892464	\N	3	2026-07-02 23:46:37.523722	ACTIVE
22	Trần Mai Anh	manh@gmail.com	$2b$10$vO5epC2.6flWurtKHQzzPu9ukJ0B1/54.efWEfiOgEgpwwZK6qZZ.	0946892476	\N	3	2026-07-02 23:49:17.803952	ACTIVE
11	Nguyễn Đức Anh	ducanh@gmail.com	$2b$10$l.fgD89To1zyT13cu.1UHOpWNTDUSmXov6Nq07XVkr6DqhFJDNzRm	0926452737	\N	3	2026-05-05 14:04:50.301306	ACTIVE
9	Trần Văn Hải	haivan@gmail.com	$2b$10$TVxaFOcJDCuMilyyzSeYhedRxWCRGcZEOxvKhypQJex6D5gQUU7k2	0936284682	\N	3	2026-05-05 14:02:50.054988	ACTIVE
\.


--
-- TOC entry 5269 (class 0 OID 17240)
-- Dependencies: 248
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zones (id, name, created_at) FROM stdin;
1	VIP	2026-05-19 15:06:12.603629
2	Sân vườn	2026-05-19 15:08:47.934686
4	Khu B	2026-05-19 15:09:38.386261
5	Yên tĩnh	2026-05-19 15:10:30.041095
6	Khu A	2026-05-26 11:47:25.341807
15	Bể bơi	2026-07-02 23:53:14.395348
\.


--
-- TOC entry 5302 (class 0 OID 0)
-- Dependencies: 233
-- Name: booking_tables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.booking_tables_id_seq', 95, true);


--
-- TOC entry 5303 (class 0 OID 0)
-- Dependencies: 231
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bookings_id_seq', 53, true);


--
-- TOC entry 5304 (class 0 OID 0)
-- Dependencies: 227
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 8, true);


--
-- TOC entry 5305 (class 0 OID 0)
-- Dependencies: 255
-- Name: food_ingredients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.food_ingredients_id_seq', 14, true);


--
-- TOC entry 5306 (class 0 OID 0)
-- Dependencies: 229
-- Name: foods_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.foods_id_seq', 80, true);


--
-- TOC entry 5307 (class 0 OID 0)
-- Dependencies: 253
-- Name: ingredient_imports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ingredient_imports_id_seq', 15, true);


--
-- TOC entry 5308 (class 0 OID 0)
-- Dependencies: 249
-- Name: ingredient_units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ingredient_units_id_seq', 226, true);


--
-- TOC entry 5309 (class 0 OID 0)
-- Dependencies: 251
-- Name: ingredients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ingredients_id_seq', 12, true);


--
-- TOC entry 5310 (class 0 OID 0)
-- Dependencies: 243
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 168, true);


--
-- TOC entry 5311 (class 0 OID 0)
-- Dependencies: 239
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 82, true);


--
-- TOC entry 5312 (class 0 OID 0)
-- Dependencies: 237
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 59, true);


--
-- TOC entry 5313 (class 0 OID 0)
-- Dependencies: 245
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 8, true);


--
-- TOC entry 5314 (class 0 OID 0)
-- Dependencies: 241
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 25, true);


--
-- TOC entry 5315 (class 0 OID 0)
-- Dependencies: 219
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- TOC entry 5316 (class 0 OID 0)
-- Dependencies: 223
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.settings_id_seq', 1, true);


--
-- TOC entry 5317 (class 0 OID 0)
-- Dependencies: 235
-- Name: table_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.table_sessions_id_seq', 42, true);


--
-- TOC entry 5318 (class 0 OID 0)
-- Dependencies: 225
-- Name: tables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tables_id_seq', 18, true);


--
-- TOC entry 5319 (class 0 OID 0)
-- Dependencies: 221
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 22, true);


--
-- TOC entry 5320 (class 0 OID 0)
-- Dependencies: 247
-- Name: zones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.zones_id_seq', 15, true);


--
-- TOC entry 5042 (class 2606 OID 17105)
-- Name: booking_tables booking_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_tables
    ADD CONSTRAINT booking_tables_pkey PRIMARY KEY (id);


--
-- TOC entry 5040 (class 2606 OID 17092)
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- TOC entry 5034 (class 2606 OID 17059)
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- TOC entry 5036 (class 2606 OID 17057)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5074 (class 2606 OID 17314)
-- Name: food_ingredients food_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.food_ingredients
    ADD CONSTRAINT food_ingredients_pkey PRIMARY KEY (id);


--
-- TOC entry 5038 (class 2606 OID 17073)
-- Name: foods foods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.foods
    ADD CONSTRAINT foods_pkey PRIMARY KEY (id);


--
-- TOC entry 5072 (class 2606 OID 17299)
-- Name: ingredient_imports ingredient_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredient_imports
    ADD CONSTRAINT ingredient_imports_pkey PRIMARY KEY (id);


--
-- TOC entry 5066 (class 2606 OID 17272)
-- Name: ingredient_units ingredient_units_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredient_units
    ADD CONSTRAINT ingredient_units_name_key UNIQUE (name);


--
-- TOC entry 5068 (class 2606 OID 17270)
-- Name: ingredient_units ingredient_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredient_units
    ADD CONSTRAINT ingredient_units_pkey PRIMARY KEY (id);


--
-- TOC entry 5070 (class 2606 OID 17287)
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_pkey PRIMARY KEY (id);


--
-- TOC entry 5056 (class 2606 OID 17208)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5052 (class 2606 OID 17173)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5050 (class 2606 OID 17152)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5058 (class 2606 OID 17228)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 5060 (class 2606 OID 17230)
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- TOC entry 5054 (class 2606 OID 17191)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 5022 (class 2606 OID 16995)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 5024 (class 2606 OID 16993)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5030 (class 2606 OID 17034)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5046 (class 2606 OID 17128)
-- Name: table_sessions table_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5048 (class 2606 OID 17130)
-- Name: table_sessions table_sessions_qr_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_qr_token_key UNIQUE (qr_token);


--
-- TOC entry 5032 (class 2606 OID 17048)
-- Name: tables tables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_pkey PRIMARY KEY (id);


--
-- TOC entry 5026 (class 2606 OID 17011)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5028 (class 2606 OID 17009)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5062 (class 2606 OID 17250)
-- Name: zones zones_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_name_key UNIQUE (name);


--
-- TOC entry 5064 (class 2606 OID 17248)
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (id);


--
-- TOC entry 5043 (class 1259 OID 17142)
-- Name: idx_table_sessions_booking_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_table_sessions_booking_active ON public.table_sessions USING btree (booking_id) WHERE ((status)::text = 'ACTIVE'::text);


--
-- TOC entry 5044 (class 1259 OID 17141)
-- Name: idx_table_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_table_sessions_token ON public.table_sessions USING btree (qr_token);


--
-- TOC entry 5078 (class 2606 OID 17106)
-- Name: booking_tables booking_tables_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_tables
    ADD CONSTRAINT booking_tables_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- TOC entry 5079 (class 2606 OID 17111)
-- Name: booking_tables booking_tables_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_tables
    ADD CONSTRAINT booking_tables_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id);


--
-- TOC entry 5077 (class 2606 OID 17093)
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5091 (class 2606 OID 17315)
-- Name: food_ingredients food_ingredients_food_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.food_ingredients
    ADD CONSTRAINT food_ingredients_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.foods(id) ON DELETE CASCADE;


--
-- TOC entry 5092 (class 2606 OID 17320)
-- Name: food_ingredients food_ingredients_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.food_ingredients
    ADD CONSTRAINT food_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE RESTRICT;


--
-- TOC entry 5076 (class 2606 OID 17074)
-- Name: foods foods_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.foods
    ADD CONSTRAINT foods_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- TOC entry 5090 (class 2606 OID 17300)
-- Name: ingredient_imports ingredient_imports_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ingredient_imports
    ADD CONSTRAINT ingredient_imports_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- TOC entry 5088 (class 2606 OID 17209)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5084 (class 2606 OID 17350)
-- Name: order_items order_items_food_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.foods(id) ON DELETE SET NULL;


--
-- TOC entry 5085 (class 2606 OID 17174)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 5082 (class 2606 OID 17153)
-- Name: orders orders_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- TOC entry 5083 (class 2606 OID 17158)
-- Name: orders orders_table_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_table_session_id_fkey FOREIGN KEY (table_session_id) REFERENCES public.table_sessions(id);


--
-- TOC entry 5089 (class 2606 OID 17231)
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5086 (class 2606 OID 17339)
-- Name: payments payments_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(id);


--
-- TOC entry 5087 (class 2606 OID 17192)
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 5080 (class 2606 OID 17136)
-- Name: table_sessions table_sessions_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- TOC entry 5081 (class 2606 OID 17131)
-- Name: table_sessions table_sessions_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.table_sessions
    ADD CONSTRAINT table_sessions_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id);


--
-- TOC entry 5075 (class 2606 OID 17012)
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


-- Completed on 2026-07-06 18:25:22

--
-- PostgreSQL database dump complete
--

\unrestrict MljPpfBofLIoTkIOvf3jK8beHS0vRDAdDLEWVxRznISQZfhbruIPZSxngVM2GOp

