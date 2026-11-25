-- Run AFTER you created your admin user in Supabase (Authentication > Users > Add user).
-- Replace the email below with YOUR admin email, then Run.
insert into public.admin_users (user_id)
select id from auth.users where email = 'PUT-YOUR-ADMIN-EMAIL-HERE'
on conflict do nothing;
