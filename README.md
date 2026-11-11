# Connect — static frontend with Supabase backend

This site is hosted on GitHub Pages. Supabase provides the hosted PostgreSQL database, authentication and avatar storage.

## 1. Create a free Supabase project

1. Open [Supabase](https://supabase.com/) and create an account/project on the Free plan.
2. Choose a strong database password and save it privately.
3. In the project dashboard, open **SQL Editor**.
4. Open `supabase/schema.sql` from this repository, copy all of it into the SQL Editor and click **Run**.
5. Open **Project Settings → API** (or the Connect dialog) and copy the **Project URL** and **publishable key**. Older projects may label the public browser key as `anon`.

## 2. Connect the website

1. Open `supabase-config.js` in this repository.
2. Replace `YOUR_SUPABASE_PROJECT_URL` with the Project URL.
3. Replace `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY` with the publishable/anon key.
4. Commit the file and wait for GitHub Pages to publish.

The publishable/anon key is intended for browser use when Row Level Security is enabled. **Never paste a `service_role` or secret key into this repository or any browser file.**

## 3. Configure email confirmation

In Supabase **Authentication → URL Configuration**, add the GitHub Pages site URL to the allowed redirect URLs. Keep email confirmation enabled. If confirmation emails do not arrive, check the Auth email settings and spam folder.

## Features

- Supabase email/password registration, login, logout and password reset/update.
- Profile display name and bio stored in PostgreSQL.
- Avatar upload to the `avatars` Storage bucket (JPG, PNG or WebP, maximum 2 MB).
- Signed-in community message feed, with users allowed to delete their own messages.
- Row Level Security policies for profile, message and avatar data.

## Important notes

- The public message feed is visible to signed-in members. Do not post private information.
- Free Supabase projects can pause after a period of inactivity; see the current [pricing page](https://supabase.com/pricing).
- Free tier quotas are suitable for learning and prototypes, not a guarantee of uninterrupted production service.
- GitHub Pages only serves the frontend; Supabase is the separate backend/database.
