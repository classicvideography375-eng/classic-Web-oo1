# Classic Studios

A responsive photography and videography website with service listings, booking enquiries, client reviews, and pose inspiration.

## Run locally

Open `index.html` in a modern browser. Photo areas are intentionally empty and marked “ADD PHOTO”; the studio logo remains in place. Fonts and the Supabase JavaScript client require an internet connection.

### Add your photos

Save your chosen image in `assets/portfolio`, then replace the matching `<div class="photo-placeholder" ...></div>` in `index.html` with an image, keeping the `photo-placeholder` class so the existing layout sizing applies:

```html
<img class="photo-placeholder" src="assets/portfolio/your-photo.jpg" alt="Describe the photo" />
```

The original photos in `E:\edited` are not modified.

## Publish on GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the site whenever you push to the `main` branch.

1. Configure `supabase-config.js` locally with your project URL and publishable key. Never use a `service_role` or secret key.
2. Clone your existing GitHub repository into a separate folder, then copy this website into that clone. Replace the sample values with your own paths and repository:

   ```powershell
   $source = 'C:\path\to\car-selling-website'
   $repo = 'C:\path\to\classic-Web-oo1'
   git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY.git $repo
   Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $repo -Recurse -Force
   Set-Location $repo
   git add .
   git commit -m "Publish Classic Studios website" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
   git push origin main
   ```

3. In the repository on GitHub, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**. The push should start the deployment workflow.
4. When the workflow finishes, GitHub Pages shows the public website URL in **Settings → Pages**.
5. Add the website URL to the Supabase project's allowed redirect URLs before testing owner sign-in. Never add a Supabase `service_role` or secret key to the site.

## Owner inbox: reviews, booking, and classes

Reviews rated 1–3 are submitted to a private Supabase table and are not added to the public review list. Booking enquiries and class registrations are also sent to private Supabase tables. The owner inbox lists all three categories and only the authenticated account explicitly registered as the owner can read them. Reviews rated 4–5 continue to be saved in the current browser's local storage; connect a public review backend separately if they should be shared between visitors.

These forms require a Supabase project and the SQL policies in `supabase/private-feedback.sql`. Until configured, private feedback, booking, and class forms show an error and do not claim submissions were received or save them locally.

### Supabase setup

1. Create a Supabase project and create your owner user in **Authentication → Users**. Use a strong, unique password and enable any available sign-in protections.
2. In the Supabase SQL Editor, run `supabase/private-feedback.sql`. This creates the private review, booking enquiry, and class registration tables and their row-level security policies.
3. In **Authentication → Users**, copy the owner user's UUID. In the SQL Editor, register that exact UUID:

   ```sql
   insert into public.private_feedback_owners (owner_id)
   values ('YOUR_OWNER_AUTH_USER_UUID');
   ```

   Do not register any other user as an owner. The owner table has row-level security and cannot be changed through the website.
4. In Supabase's project API settings, copy the project URL and the **publishable** key (or legacy `anon` key). Put them in `supabase-config.js`:

   ```js
   window.SUPABASE_CONFIG = {
     url: 'https://YOUR_PROJECT_ID.supabase.co',
     publishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY'
   };
   ```

   The publishable/anon key is intended for browser use and is not an admin secret. Never put a `service_role` or secret key in this website.
5. In Supabase Authentication URL settings, add the deployed website URL to the allowed redirect URLs. Deploy the site over HTTPS.
6. Open **Owner: private feedback inbox** on the Reviews section and sign in using the owner account. The inbox displays private reviews, booking enquiries, and class registrations, including contact email links.

The browser displays a successful submission only after Supabase confirms the insert. Booking enquiries and class registrations then appear in the signed-in owner inbox. This setup does not send email or text notifications; check the inbox to see new submissions.

The database policies grant anonymous visitors insert-only access to the forms. Anonymous users cannot read, update, or delete submitted records. Signed-in users can read records only if their UUID is present in `private_feedback_owners`. Keep the SQL policies enabled and do not grant public table access.

### Important limitations

- The forms store inquiries in the Supabase owner inbox; they do not send email notifications. The owner must sign in to check submissions.
- Positive 4–5 star reviews, service likes/comments, and theme preferences remain browser-local and are not shared across visitors.
- Do not use the website from `file://` for production authentication. Test the Supabase flow on an HTTPS deployment (or a local web server with the correct Supabase redirect URL).
- The public feedback form can receive spam. Before promoting it, configure Supabase abuse protections such as CAPTCHA/Turnstile and request rate limits.
