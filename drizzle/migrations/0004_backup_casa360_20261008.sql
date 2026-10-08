CREATE SCHEMA IF NOT EXISTS backup_casa360_20261008;
REVOKE ALL ON SCHEMA backup_casa360_20261008 FROM PUBLIC, anon, authenticated;
CREATE TABLE backup_casa360_20261008.subscriptions AS SELECT * FROM public.subscriptions WHERE id = 'f79ce915-a4f4-45a2-bbe6-9d71e1745535';
CREATE TABLE backup_casa360_20261008.account_invites AS SELECT * FROM public.account_invites WHERE id = 'b61e0d3f-2ae9-4ac8-b366-f8c6c7162ae0';
CREATE TABLE backup_casa360_20261008.subscription_events AS SELECT * FROM public.subscription_events WHERE id = 'd09b40a7-32d3-4c91-a85e-f641aa4c8cf3';