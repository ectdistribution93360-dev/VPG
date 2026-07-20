# Relais Cycles — guide de mise en ligne

Ce guide t'emmène de zéro à une boutique en ligne, sans installer aucun logiciel sur ton ordinateur. Tout se fait dans le navigateur. Compte 15-20 minutes.

## Étape 1 — Créer la base de données (Supabase)

1. Va sur https://supabase.com et crée un compte gratuit (avec Google ou email).
2. Clique **New project**. Choisis un nom (ex. "relais-cycles"), un mot de passe (note-le), une région proche de toi (ex. Europe/Paris ou Frankfurt).
3. Une fois le projet créé (patiente ~1 minute), va dans le menu de gauche **SQL Editor**.
4. Clique **New query**, ouvre le fichier `supabase-schema.sql` fourni ici, copie tout son contenu, colle-le dans l'éditeur, puis clique **Run**.
5. Va dans **Project Settings** (icône engrenage) → **API**. Tu vas voir deux informations à copier quelque part (bloc-notes) :
   - **Project URL** (commence par `https://...supabase.co`)
   - **anon public** (une longue clé)

## Étape 2 — Mettre le code sur GitHub

1. Va sur https://github.com et crée un compte gratuit si tu n'en as pas.
2. Clique **New repository**. Nomme-le `relais-cycles-shop`, laisse-le en "Public" ou "Private" (peu importe), clique **Create repository**.
3. Sur la page qui s'affiche, clique **uploading an existing file**.
4. Glisse-dépose **tous les fichiers et dossiers** de ce projet (sauf le fichier `.env` s'il existe — il ne doit jamais être mis en ligne).
5. Clique **Commit changes** en bas.

## Étape 3 — Déployer sur Vercel

1. Va sur https://vercel.com et crée un compte gratuit **en te connectant avec ton compte GitHub** (bouton "Continue with GitHub").
2. Clique **Add New** → **Project**.
3. Trouve `relais-cycles-shop` dans la liste et clique **Import**.
4. Avant de cliquer sur Deploy, déplie **Environment Variables** et ajoute les deux valeurs notées à l'étape 1 :
   - `VITE_SUPABASE_URL` → colle ton Project URL
   - `VITE_SUPABASE_ANON_KEY` → colle ta clé anon public
5. Clique **Deploy**. Patiente 1-2 minutes.
6. Tu obtiens un lien du type `relais-cycles-shop.vercel.app` — c'est ta boutique, en ligne, stable, avec une vraie base de données. Ouvre-le, teste une commande, ferme et rouvre : elle doit toujours être là.

## Étape 4 — (optionnel) Ton propre nom de domaine

Si tu as ou achètes `relaiscycles.fr` (ou autre) :
1. Dans Vercel, ouvre ton projet → onglet **Domains**.
2. Ajoute ton nom de domaine, suis les instructions (ça demande de modifier 1-2 réglages chez ton registrar, ex. OVH, Gandi).

## Pour mettre à jour l'appli plus tard

Reviens dans cette conversation Claude et demande les modifications. Je regénèrerai les fichiers modifiés ; il te suffira de les re-uploader sur GitHub (Étape 2, mêmes fichiers, "Commit changes" écrase les anciens) — Vercel redéploiera automatiquement en 1-2 minutes.

## Important à savoir

- Le code PIN de l'espace gérant (`Réglages`) protège l'accès à l'interface, mais pas la base de données elle-même (n'importe qui connaissant la clé "anon" technique pourrait y accéder directement). Pour une petite boutique gérée par une seule personne, c'est un niveau de sécurité suffisant pour démarrer. Si tu veux passer à un niveau supérieur (vraie authentification), dis-le-moi le moment venu.
- Le lien de paiement (PayPal, etc.) reste à coller toi-même dans Réglages — ce n'est pas un vrai module de paiement intégré.
