# Myranor Spell Dashboard

## Run locally

Use Node.js 22 or newer and npm.

```bash
npm ci
```

Create `.env.local` in the project root (copy `.env.example` if needed) and
set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your Supabase project's
URL and public anonymous key. Local environment files are ignored by Git.

```bash
npm run dev
```

Open the URL printed by Vite, normally http://localhost:5173, and sign in
with a Supabase account. The frontend connects to the configured Supabase
backend for authentication, spells, decks, and favorites. Changes to decks
and favorites are saved to that backend.

For password recovery, add `http://localhost:5173/` to the project's allowed
redirect URLs in Supabase Auth settings. Restart Vite after changing `.env.local`.

To build and preview the production app:

```bash
npm run build
npm run preview
```

## Deck source selections

When adding a spell, choose all of its sources or a subset using the source
multiselect, then confirm. Quellenunabhängig spells are added directly.
The selected sources are saved with the deck entry and used in the "Mein Deck"
view, including the footer of every printed card for that spell. Existing
deck entries keep all sources. Remove and re-add a spell to change its selection.

Apply `supabase/migrations/202611160001_deck_sources.sql` in the Supabase SQL
Editor before saving subsets. It adds a nullable `selected_sources` column to
`user_decks`; `NULL` means all sources. Existing deck policies continue to apply.
The public anonymous key used by this frontend cannot apply database migrations.

Run `npm test` to check source selection rules and printed footers.

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
