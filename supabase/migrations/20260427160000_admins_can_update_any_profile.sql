-- Allow admins to update any profile row. The self-service policy only matches
-- rows where auth.uid() = id, so admins previously could not manage other users.

create policy "admins can update any profile"
on public.profiles
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
