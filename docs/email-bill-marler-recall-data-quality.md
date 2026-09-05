# Courriel — Bill Marler : la qualité des données de rappel FDA

**Expéditeur :** vincent@numeline.com
**Rédigé le :** 2026-09-05

> ## ⚠️ N'envoie qu'UN SEUL courriel
>
> Celui-ci **remplace** `email-bill-marler-cyclospora.md` (écart de comptage Michigan/national).
> Deux messages coup sur coup au même destinataire te feraient classer comme sollicitation.
>
> **Pourquoi celui-ci plutôt que l'autre :** Marler connaît parfaitement la différence entre
> cas confirmés et cas probables, et les délais de remontée — c'est son métier depuis trente
> ans. En revanche, personne ne publie de mesure sur l'**exploitabilité** des fiches
> d'application de la FDA, et lui plaide précisément que les rappels n'atteignent pas les
> consommateurs. C'est de la matière première pour son argumentaire, pas une redite.
>
> L'écart de comptage est mentionné en une ligne à la fin, comme offre secondaire.

## Coordonnées

| | |
|---|---|
| Adresse suggérée | `bmarler@marlerclark.com` — **non confirmée** |
| Téléphone | **1-800-884-9840** — confirmé sur marlerblog.com |
| Formulaire | marlerblog.com/contact/ — voie la plus sûre |

---

## Objet

```
In the Cyclospora recall record, the FDA lists the product as "MARKON" — not Taylor Farms
```

---

## Corps du message

```
Mr. Marler,

I have read your Taylor Farms series going back to 2009, so I am not writing to
tell you about the pattern. I am writing about something I can measure, and that
I have not seen anyone publish.

I run Numeline, a consumer food-recall app. It ingests the FDA food enforcement
records directly and tries to answer one question: does the item in this person's
hand match a recall? Doing that at scale exposes how these records are actually
built, and the answer is that they are not built for identification.

Start with your own case. The enforcement record for the Cyclospora recall reads:

    recalling_firm      Taylor Farms de Mexico S. de R.L. de C.V.
    product_description MARKON BLEND LETT/ROM 80/20 WITH SEP BAGGIES 4/5# ...
    reason_for_recall   Potential Cyclospora contamination.
    recall_number       (empty)

The name on the case is Markon. A foodservice buyer holding that box and
searching "Taylor Farms" finds nothing, and the record carries no recall number
to cite.

That is not an isolated lapse. Across the most recent 1,000 FDA food enforcement
records (report dates December 3, 2025 to August 19, 2026):

  - In roughly two-thirds, the recalling firm's distinctive name does not appear
    anywhere in the product description. The company named in the recall is
    frequently not the brand printed on the package.
  - Lot codes are published as free text with no schema. I counted 77 distinct
    label formats across the 485 records that announce a lot: "Lot:",
    "Lot Number:", "Batch Code", "Lot, Best Before:", "Pallet Lot #s:",
    "Lot Codes (visible on cases)", and so on.
  - About 15 percent of the records that announce a lot do not present it in any
    form a parser can extract at all.

A single record can carry several of these at once. The Lundberg Family Farms
rice recall (H-0767-2026) is a compact example: the firm is listed as Wehah
Farms, not the brand on the bag; the product description misspells the brand as
"LUNDBERG FAMILY FAMRS"; and the lot codes sit inside a combined label,
"Lot, Best Before: 260201MA, 01FEB2027", that reads as one field. Three separate
obstacles between a shopper and an answer, in one two-pound bag of rice.

I raise it because recall effectiveness is measured in whether people can
self-identify, and these records make that harder than it needs to be. The fix
is unglamorous: a brand field distinct from the recalling firm, and lot codes in
a structured field rather than prose.

I have no client and nothing to sell. I am glad to share the method, the record
set, and the per-format breakdown if any of it is useful to you or to Food
Safety News. Separately, I also have figures on the gap between the CDC's
national Cyclospora count and Michigan's own, if that is of more interest.

With respect for your work,

Vincent Gaillard
Founder, Numeline — numeline.com
vincent@numeline.com
```

---

## Ce que tu dois pouvoir défendre s'il te répond

Il est avocat. S'il reprend ces chiffres, il te demandera la méthode. Voici exactement
ce qui a été fait, pour que tu puisses répondre sans moi :

| Affirmation | Méthode | Solidité |
|---|---|---|
| Fiche Markon / Taylor Farms | Lecture directe de l'enregistrement openFDA | **Certaine** — citation littérale |
| Coquille « FAMRS » | Idem, rappel H-0767-2026 | **Certaine** — citation littérale |
| 77 formats de libellé | Regroupement des libellés autour du mot « Lot »/« Batch », chiffres normalisés | **Bonne** — ordre de grandeur fiable, le décompte exact dépend de la normalisation |
| ~2/3 sans correspondance marque/firme | Premier mot distinctif de `recalling_firm` (hors *the, and, inc, llc, corp, company, foods, farms*) cherché dans `product_description` | **Heuristique** — d'où « roughly two-thirds » et non « 65,1 % ». Vérifiée manuellement sur des exemples, tous authentiques |
| ~15 % de lots inextractibles | Notre analyseur, sur les 485 fiches annonçant un lot | **Dépend de l'analyseur** — c'est une borne, pas une propriété absolue de la donnée. Ne pas présenter autrement |

**Le point de prudence.** Les deux derniers chiffres décrivent en partie notre outil, pas
seulement la FDA. Le courriel les formule prudemment (« roughly », « a parser »). Si tu es
tenté de les durcir, ne le fais pas : c'est exactement ce qu'un contradicteur attaquerait.

## Échantillon

Point d'accès : `https://api.fda.gov/food/enforcement.json?limit=1000&sort=report_date:desc`
1 000 enregistrements, `report_date` du 2025-12-03 au 2026-08-19, dont 998 avec un
`code_info` non vide. Rejouable à tout moment — mais les chiffres bougeront, l'échantillon
étant glissant. **Redonne la date de consultation si tu les cites.**

## Avant d'envoyer

1. Rejouer la requête et recontrôler les ordres de grandeur si tu n'envoies pas aujourd'hui.
2. Un seul envoi, pas de relance.
3. Ne pas envoyer aussi l'autre courriel.
