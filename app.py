import streamlit as st


TVA_RATE = 0.16

st.set_page_config(page_title="Facturation Express", page_icon="📊")

st.title("📊 Logiciel de Facturation Express")
st.write("Par Djoberty Ntambwe - Expert Commercial & Code")
st.divider()

st.subheader("✍️ Saisie des données de vente")

with st.form("formulaire_facture"):
    client = st.text_input("Nom du client :", placeholder="Ex. : Anna")
    produit = st.text_input("Article acheté :", placeholder="Ex. : Ordinateur HP")

    col1, col2 = st.columns(2)
    with col1:
        prix_unitaire = st.number_input(
            "Prix unitaire (USD) :", min_value=0.0, step=1.0
        )
    with col2:
        quantite = st.number_input("Quantité :", min_value=1, step=1)

    submitted = st.form_submit_button("🧾 Générer la facture")

if submitted:
    client = client.strip()
    produit = produit.strip()

    if client and produit and prix_unitaire > 0:
        total_ht = prix_unitaire * quantite
        tva = total_ht * TVA_RATE
        total_ttc = total_ht + tva

        st.session_state["facture"] = {
            "client": client,
            "produit": produit,
            "prix_unitaire": prix_unitaire,
            "quantite": quantite,
            "total_ht": total_ht,
            "tva": tva,
            "total_ttc": total_ttc,
        }
    else:
        st.session_state.pop("facture", None)
        st.error("Veuillez remplir tous les champs et saisir un prix supérieur à 0.")

facture = st.session_state.get("facture")
if facture:
    st.success("Facture calculée avec succès !")
    st.markdown(f"### Reçu pour {facture['client']}")
    st.info(
        f"**Article :** {facture['produit']} "
        f"(x{facture['quantite']} à {facture['prix_unitaire']:.2f} USD)"
    )

    st.write(f"💵 **Total hors taxe :** {facture['total_ht']:.2f} USD")
    st.write(f"🏛️ **TVA (16 %) :** {facture['tva']:.2f} USD")
    st.markdown(f"### 🎯 **TOTAL À PAYER : {facture['total_ttc']:.2f} USD**")
