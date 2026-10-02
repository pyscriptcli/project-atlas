# KOPI SAIGON Competitor Viewer

Standalone, read-only presentation for the KOPI SAIGON project in Atlas. It lives in its own folder so it can be deployed separately from the Atlas editor.

## Deploy to Vercel

Create a new Vercel project connected to this repository and set **Root Directory** to `kopi-saigon`. The app loads only the KOPI SAIGON project from the existing Supabase `map_projects` table and does not include editing or save controls. Add these environment variables if the Atlas defaults are not suitable:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

After deployment, assign `kopi.saigon.competitorscheck.vercel.app` in Vercel's Domains settings. Apply `supabase/migrations/202609300003_restore_pre_viewer_project_saving.sql` from the repository root to restore the project-table read permission used by this viewer as well as Atlas editing.

Navigation is generated from the project's saved search-area labels and place categories, alongside an Overview. The viewer polls the same project every 15 seconds so edits saved in Atlas appear without reloading. Basemap, saved camera, layer visibility, and project features follow the current Atlas project. Atlas remains the only place to edit project data.

## Local development

From this folder run `npm install`, then `npm run dev`. The viewer uses Atlas's public Supabase project/key defaults unless overridden with environment variables.


## Admin setup

The client viewer uses Supabase Auth invitations. Before deploying this change:

1. Apply `../supabase/migrations/202610020001_kopi_admin_and_telemetry.sql` and `../supabase/migrations/202610020002_access_roles.sql` to the linked Supabase project.
2. In Supabase Authentication > Users, create the administrator account and confirm its email. In Table Editor > `kopi_app_access`, set that user's row `is_admin` to `true`; client rows should keep `is_admin` as `false`.
3. Set these Vercel environment variables for Production (and Preview if needed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, and `SUPABASE_SECRET_KEY` (server-only secret key). Never expose the secret key with a `NEXT_PUBLIC_` prefix.
4. Add `https://kopisaigon.vercel.app/auth/setup-password` to Supabase Auth's allowed redirect URLs and configure production SMTP so invitation emails can be delivered.
5. Deploy and open `/admin`; sign in with the administrator account. Invite clients from Client accounts.

Admin/client roles are stored as `is_admin` in `kopi_app_access`. Passwords remain managed by Supabase Auth and are not stored in this table. The admin dashboard reports account activation, 7-day activity, viewer sessions, feature actions, and recent use. It does not collect typed input or precise location. The KOPI project row is protected by RLS and requires enabled access; other map project rows remain available to the Atlas editor.


Client login accepts a username and resolves it to the matching Supabase Auth email at `username@primephilippines.com`; users can also enter their full email address. Passwords are authenticated by Supabase Auth.
