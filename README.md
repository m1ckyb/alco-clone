# AlcoClone

AlcoClone is a Blood Alcohol Content (BAC) calculator and consumption tracker web application. It helps users monitor their estimated alcohol levels in real-time based on their profile and drink history.

## Features

- **BAC Calculator:** Real-time estimation of Blood Alcohol Content.
- **Drink Logger:** Easily log drinks with preset types (Beer, Wine, Spirits).
- **History Tracking:** View a chronological log of your drinks.
- **BAC Graph:** Visual representation of your BAC over time.
- **PWA Support:** Installable on mobile and desktop for offline use.
- **Supabase Integration:** Secure data storage and synchronization.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Vanilla CSS
- **Charts:** Recharts
- **Database:** Supabase
- **Deployment:** GitHub Pages

---

## Getting Started

### Prerequisites

- Node.js (v20 or higher recommended)
- npm
- A Supabase account and project

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/m1ckyb/alco-clone.git
   cd alco-clone
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

---

## Deployment to GitHub Pages

This project is configured for automated deployment via GitHub Actions.

### 1. Configure `vite.config.ts`

Ensure the `base` property in `vite.config.ts` matches your repository name:
```typescript
export default defineConfig({
  base: '/alco-clone/', // Replace with your repository name
  // ... rest of the config
})
```

### 2. Set Up GitHub Secrets

To allow the GitHub Action to build the project, you need to add your Supabase environment variables as Secrets in your GitHub repository:

1. Go to your repository on GitHub.
2. Navigate to **Settings > Secrets and variables > Actions**.
3. Add the following **New repository secrets**:
   - `VITE_SUPABASE_URL`: Your Supabase URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.

### 3. Deploying

- **Automated:** Every push to the `main` branch will trigger the "Build and Deploy" workflow defined in `.github/workflows/deploy.yml`. This will automatically build and publish the site to the `gh-pages` branch.
- **Manual:** You can also deploy manually using the following command:
  ```bash
  npm run deploy
  ```

### 4. Enable GitHub Pages

1. Go to your repository **Settings > Pages**.
2. Under **Build and deployment > Branch**, ensure the branch is set to `gh-pages` and the folder is `/ (root)`.

---

## Development

- `npm run dev`: Start development server.
- `npm run build`: Build for production.
- `npm run lint`: Run ESLint.
- `npm run preview`: Preview the production build locally.
