# Feuillet Communautaire — Instructions d'installation

## 1. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Dans l'éditeur SQL, exécuter le contenu de `supabase/schema.sql`
3. Récupérer dans **Project Settings > API** :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 2. Variables d'environnement

Remplir `.env.local` avec vos clés Supabase :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://votre-domaine.vercel.app
```

## 3. Python (génération PDF)

```bash
pip3 install reportlab Pillow
```

En production sur Vercel, ajouter un layer Python ou utiliser une API externe (Render, Railway) pour exécuter le script Python.

## 4. Lancement local

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000 → redirige vers `/dashboard`

## 5. Premier compte

Aller sur `/auth/register`, créer votre compte et votre organisation.

## 6. Déploiement Vercel

```bash
vercel
```

Ajouter les variables d'environnement dans le dashboard Vercel.

> **Note PDF en production** : Vercel (serverless) ne dispose pas de Python. Options :
> - Héberger le script Python sur Railway/Render et l'appeler via HTTP
> - Utiliser une librairie PDF JavaScript comme `pdf-lib` ou `puppeteer` en remplacement
> - Utiliser Vercel Functions avec le runtime Python (bêta)
