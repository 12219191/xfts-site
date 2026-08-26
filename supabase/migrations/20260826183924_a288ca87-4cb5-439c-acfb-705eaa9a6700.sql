CREATE TYPE public.admin_role AS ENUM ('superadmin', 'financeiro', 'comercial', 'suporte', 'produto');

CREATE TABLE public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.admin_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.admin_roles TO authenticated;
GRANT ALL ON public.admin_roles TO service_role;

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.has_admin_role(_user_id uuid, _role public.admin_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION private.has_admin_role(uuid, public.admin_role) FROM PUBLIC;

CREATE POLICY "Admins veem os proprios papeis"
  ON public.admin_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_admin_role(auth.uid(), 'superadmin'));

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL DEFAULT '',
  target_id text,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins consultam a auditoria"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

CREATE INDEX admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX admin_audit_log_actor_idx ON public.admin_audit_log (actor_id);

ALTER TABLE public.sso_tokens
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS created_by_admin uuid;

INSERT INTO public.admin_roles (user_id, role)
SELECT user_id, 'superadmin'::public.admin_role FROM public.admin_users
ON CONFLICT (user_id, role) DO NOTHING;