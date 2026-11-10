# Webscope: beginner website intelligence demo

A small React project with three features:

1. Email registration and login using Supabase Auth. Supabase stores registered accounts in its managed authentication database.
2. A retrieval augmented generation (RAG) demo. It finds relevant sentences in pasted text, then asks Gemini to answer from those passages.
3. A website summarizer. A server endpoint reads public HTML, extracts page text, and asks Gemini for a summary.

This is a learning demo, not a production service. Some websites block automated reading. The free services have usage limits, and free database projects may pause when inactive.

## What you need

- VS Code
- Node.js LTS
- A GitHub account
- Free Supabase and Google AI Studio accounts
- A Vercel account to publish the app

## Step 1: Open the folder in VS Code

Open this project folder in VS Code. Open **Terminal → New Terminal**. Check that Node and npm are installed:

```bash
node --version
npm --version
```

If either command is missing, install Node.js LTS from [nodejs.org](https://nodejs.org/), then restart VS Code.

## Step 2: Create the Supabase project

1. Sign in to [Supabase](https://supabase.com/) and create a project on the Free plan.
2. In the project dashboard, open **Project Settings → API** (or **Data API** depending on the dashboard version).
3. Copy the **Project URL** and the **publishable/anon key**. The publishable key is intended for browser apps. Never use a secret or service-role key in React.
4. In **Authentication → URL Configuration**, set the local site URL to `http://localhost:5173` while developing. After deployment, add the Vercel app URL as a redirect URL too.
5. In **Authentication → Providers → Email**, leave email/password enabled. For a quick demo, you may turn off email confirmation; otherwise users must click the confirmation link before signing in.

Supabase Auth automatically creates and stores registered user accounts. This demo does not collect extra profile fields.

## Step 3: Get a Gemini API key

1. Open [Google AI Studio](https://aistudio.google.com/app/apikey) and create an API key.
2. Keep the key private. The app sends Gemini requests through a server function, so the key is never placed in browser code.
3. Free access is limited and can change; check [Google's pricing page](https://ai.google.dev/gemini-api/docs/pricing). The provider may process submitted page/document text to generate an answer.

## Step 4: Add your local settings

Copy `.env.example` to `.env.local` in the project root. Fill in the values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
GEMINI_API_KEY=your-google-ai-studio-key
```

Do not commit `.env.local`. It is excluded by `.gitignore`. Restart the local dev command after changing environment variables.

## Step 5: Install dependencies and run locally

In the VS Code terminal:

```bash
npm install
npm run dev
```

The local server reads `.env.local`, serves the Vite page, and runs the same `/api` handlers without the Vercel CLI. Open the address printed in the terminal (usually `http://localhost:3000`). After changing `.env.local`, stop the server with **Ctrl+C** and run `npm run dev` again.

Register a test account, sign in, try **Site summary** with a public URL, and try **Ask your document** with the sample text. A website that blocks bots or requires sign-in may not be readable.

## Step 6: Understand the two AI features

### RAG: Ask your document

The browser breaks the pasted text into sentence-sized passages, scores passages by matching words from the question, and sends the best matches to the server. The server asks Gemini to answer only from those passages. This is a deliberately small RAG example; it uses word overlap rather than a vector database or embeddings.

### Website summary

The browser sends a URL to `/api/summarize`. The server downloads public HTML, extracts readable text, and returns it. `/api/generate` then sends that text to Gemini to produce a summary. It handles normal HTML pages, not every website, PDFs, login-only content, or JavaScript-only pages. Keep the AI key in the server environment.

## Step 7: Upload the code to GitHub

1. On [GitHub](https://github.com/new), create a **public** repository named `webscope-demo` (or choose private if you prefer).
2. Do not ask GitHub to add a README or `.gitignore`, because this folder already has both.
3. In VS Code's terminal, run these commands from this project folder, replacing `YOUR-GITHUB-NAME`:

```bash
git init
git add .
git commit -m "Build Webscope login and AI demo"
git branch -M main
git remote add origin https://github.com/YOUR-GITHUB-NAME/webscope-demo.git
git push -u origin main
```

If Git asks who you are, set your name and email once:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

The GitHub repository address will be `https://github.com/YOUR-GITHUB-NAME/webscope-demo`.

## Step 8: Publish the app

1. Sign in to [Vercel](https://vercel.com/) and choose **Add New → Project**.
2. Import the GitHub repository. Vercel should detect Vite; leave the build command as `npm run build` and output folder as `dist`.
3. In project **Settings → Environment Variables**, add all three values from `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
4. Deploy. Add the deployed Vercel URL in Supabase **Authentication → URL Configuration** as the Site URL and an allowed redirect URL.
5. After a code change, push to GitHub; Vercel automatically builds a new deployment.

The live site address will look like `https://webscope-demo-yourname.vercel.app`. Vercel's free Hobby plan is intended for personal/non-commercial use; a custom domain costs extra. [Vercel plan details](https://vercel.com/docs/plans/hobby).

## Files at a glance

- `src/App.jsx`: sign-up/sign-in screens and the app interface
- `src/lib/supabase.js`: Supabase browser client
- `src/lib/retrieve.js`: simple retrieval step for RAG
- `api/summarize.js`: server-side webpage text extraction
- `api/generate.js`: server-side Gemini requests
- `src/styles.css`: responsive styling
- `.env.example`: names of required settings, with placeholders only

## Common problems

- **“One setup step left”**: check that both `VITE_SUPABASE_...` values are in `.env.local`, then restart `vercel dev`.
- **Registration says confirm email**: click the link sent by Supabase, or disable email confirmation for a throwaway demo project.
- **AI request failed**: check `GEMINI_API_KEY` in `.env.local` and Vercel settings, ensure the selected model is available to your key, and check free-tier limits.
- **Website could not be read**: try another public page. Some sites block automated requests or render their content only in a browser.
- **Never put secrets in GitHub**: if a secret is accidentally pushed, revoke/rotate it in the provider dashboard immediately; deleting the file in a later commit does not remove it from Git history.
