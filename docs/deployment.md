# Deployment

Create two Vercel projects from this repository. Use `apps/frontend` as the frontend root and `apps/backend` as the API root. Configure the variables listed in `.env.example`; the service-role key is backend-only. Set `NEXT_PUBLIC_API_URL` to the backend deployment and `FRONTEND_ORIGIN` to the exact frontend origin.

Apply all files in `supabase/migrations` in order. The security migration quarantines legacy anonymous rows, enables owner-only row-level security, and creates the private `atlas-assets` bucket. Reassign quarantined rows manually only after establishing their owner.

For Supabase Auth, enable email/password, set the Site URL to the frontend, and add `/reset-password` to redirect URLs. Verify sign-up, sign-in, reset, project isolation, upload, POI scan, and route creation after deployment.
