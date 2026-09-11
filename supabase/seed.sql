-- Local dev seed. Applied by `supabase db reset`. Not applied to hosted.
--
-- Signup allowlist — email addresses permitted to sign up during the pilot.
-- Add rows here for demo users. citext = case-insensitive.

insert into public.allowed_signup_emails (email, note) values
  ('mahedisalim@gmail.com', 'founder / dev')
on conflict (email) do nothing;
