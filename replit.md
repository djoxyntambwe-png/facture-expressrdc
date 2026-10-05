# Facturation Express

Une application Streamlit en français pour calculer le montant hors taxe, la TVA de 16 % et le total TTC d’une vente.

## Run & Operate

- `streamlit run app.py --server.port 5000 --server.address 0.0.0.0` — lancer l’application
- L’application utilise le taux de TVA fixe de 16 % fourni dans la demande.
- Les factures sont calculées à l’écran et ne sont pas enregistrées dans une base de données.

## Stack

- Python 3.13
- Streamlit

## Where things live

- `app.py` — formulaire de vente et calcul de facture

## Architecture decisions

- La facture reste en mémoire de session pour rester visible après sa génération.
- Aucun renseignement de client ni aucune facture n’est stocké sur le serveur.

## Product

- Saisie du client, de l’article, du prix unitaire et de la quantité.
- Calcul et affichage des montants HT, TVA et TTC en USD.

## User preferences

- Interface en français.

## Gotchas

- Le taux de TVA est actuellement fixe à 16 %.

## Pointers

- Voir `app.py` pour le flux de facturation.
