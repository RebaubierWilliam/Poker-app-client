# Poker App Client

React + Vite + TypeScript client for
[Poker-app-server](https://github.com/RebaubierWilliam/Poker-app-server).

CRUD UI pour les malettes et les structures de tournoi, **pensé
mobile-first** (tailles tactiles ≥ 44 px, layouts fluides, safe-area iOS).

## Stack

- React 18 + React Router
- TypeScript strict
- Vite 5 (dev server + build)
- CSS vanilla (aucune dépendance UI)

## Configuration

Copier `.env.example` vers `.env.local` et ajuster :

```
VITE_API_BASE_URL=                       # vide = proxy Vite (dev)
VITE_API_PROXY_TARGET=https://poker-blind-timer.fly.dev
```

- En **dev**, laisser `VITE_API_BASE_URL` vide : les appels sont faits en
  chemins relatifs (`/malettes`, `/structures`) et le proxy Vite les
  redirige vers `VITE_API_PROXY_TARGET`.
- En **prod statique**, définir `VITE_API_BASE_URL` avec l'URL absolue du
  backend (CORS déjà permissif côté serveur).

## Scripts

```bash
npm install
npm run dev        # dev server (http://localhost:5173)
npm run build      # type-check + build prod dans dist/
npm run preview    # preview du build
npm run lint       # tsc --noEmit (type-check only)
```

## API utilisée

Tous les endpoints du serveur :

- `GET    /malettes`
- `POST   /malettes`
- `GET    /malettes/:id`
- `PUT    /malettes/:id`
- `DELETE /malettes/:id`
- `GET    /structures` (optionnel `?malette_id=`)
- `POST   /structures`
- `GET    /structures/:id`
- `PUT    /structures/:id`
- `DELETE /structures/:id`

## Déploiement

Le build produit des fichiers statiques dans `dist/`, déployables sur
n'importe quel host statique (Vercel, Netlify, Cloudflare Pages, Fly
static, GitHub Pages…). Ne pas oublier de définir `VITE_API_BASE_URL`
avant le build.
