# Facturation Express

Une application web en français pour calculer une vente en USD, sa TVA RDC de 16 % et son total TTC.

## Run & Operate

- Le workflow Replit `artifacts/facturation-express: web` lance l’application dans l’aperçu.
- `pnpm --filter @workspace/facturation-express run typecheck` — vérifier les types.
- Le workflow gère le port et le chemin de prévisualisation requis par Vite.
- Les reçus sont calculés dans le navigateur et ne sont pas enregistrés.

## Stack

- React, TypeScript et Vite

## Where things live

- `artifacts/facturation-express/src/App.tsx` — formulaire et calcul de facture
- `artifacts/facturation-express/src/index.css` — styles de l’application

## Architecture decisions

- Le calcul se fait dans le navigateur, sans API ni base de données.
- Le taux de TVA est fixe à 16 % et les montants calculés sont arrondis à deux décimales.

## Product

- Saisie du client, du produit ou service, du prix unitaire et de la quantité.
- Calcul et affichage du reçu, du montant HT, de la TVA et du total TTC en USD.

## User preferences

- Interface en français.

## Gotchas

- Le taux de TVA est actuellement fixe à 16 %.

## Pointers

- Voir `artifacts/facturation-express/src/App.tsx` pour le flux de facturation.
