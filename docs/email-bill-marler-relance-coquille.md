# Courriel — Bill Marler : relance courte sur les champs des fiches FDA

> ## ⚠️ CADUC — ne pas envoyer
>
> Ecrit en supposant un silence de sa part. Il a repondu favorablement le 5 septembre
> (« love to see it - perhaps we could chat next week »), ce qui annule toute la premisse :
> ce n'est plus une relance mais une reponse a une demande. Voir `email-bill-marler-reponse.md`.


**Expéditeur :** vincent@numeline.com
**Rédigé le :** samedi 5 septembre 2026
**Envoi prévu :** ⚠️ **mardi 8 septembre**, pas lundi 7

> ## ⚠️ Deux réserves à lire avant d'envoyer
>
> **1. Le lundi 7 septembre 2026 est le Labor Day**, jour férié fédéral aux États-Unis
> (premier lundi de septembre). Un message envoyé ce jour-là arrive en tête d'une pile que
> personne ne lira, et se retrouve enterré sous le courrier du mardi matin. **Décale à
> mardi 8.**
>
> **2. Une relance à deux jours passe pour de l'insistance.** Si ton premier message est
> resté sans réponse, l'usage veut qu'on attende une à deux semaines — ou qu'on n'insiste
> pas. Si en revanche il t'a répondu, ce message est parfaitement normal et tu peux
> l'envoyer sans réserve. Adapte la première ligne en conséquence (deux variantes fournies).
>
> C'est ta décision, pas la mienne. Le message ci-dessous est volontairement **court** :
> une relance doit toujours être plus brève que le message qu'elle suit.

## Coordonnées

| | |
|---|---|
| Adresse suggérée | `bmarler@marlerclark.com` — **non confirmée** |
| Téléphone | **1-800-884-9840** — confirmé sur marlerblog.com |
| Formulaire | marlerblog.com/contact/ |

---

## Objet

```
A footnote: the Cyclospora recall record names "MARKON", not Taylor Farms
```

*Si tu réponds dans un fil existant, garde son objet et ne change rien.*

---

## Corps du message

```
Mr. Marler,

A brief addendum to my note last week, and then I will leave you to it.

Two details from the FDA's own enforcement records, both bearing on whether
anyone holding the product could have matched it to the recall.

The record for the Cyclospora recall names the firm as Taylor Farms de México,
but describes the product as:

    MARKON BLEND LETT/ROM 80/20 WITH SEP BAGGIES 4/5# Iceberg, Romaine,
    Carrots, Red Cabbage

The name on the case is Markon. A foodservice buyer searching "Taylor Farms"
finds nothing. The same record's recall_number field is empty.

Separately, the Lundberg Family Farms rice recall (H-0767-2026) manages three
obstacles in one two-pound bag: the firm is listed as Wehah Farms rather than the
brand on the package; the product description misspells that brand as "LUNDBERG
FAMILY FAMRS"; and the lot codes sit inside a combined label that reads as a
single field, "Lot, Best Before: 260201MA, 01FEB2027".

None of these is consequential alone. Together they are why a consumer cannot
self-identify: the brand a person can actually see is rarely the field the
record indexes. I build software that reads these records, so I run into it
daily, but it seems to me a recall-effectiveness question before it is a
technical one.

Records available if useful. No reply needed.

Vincent Gaillard
Founder, Numeline — numeline.com
vincent@numeline.com
```

---

## Variantes de la première ligne

**S'il t'a répondu :**
```
Thank you for coming back to me. Two details I left out, both from the FDA's own
enforcement records.
```

**S'il n'a pas répondu** — garder la version du corps ci-dessus, avec le
« and then I will leave you to it » : elle reconnaît qu'il n'a pas répondu sans le
souligner, et referme la porte poliment. C'est ce qui distingue une note d'une relance.

---

## Pourquoi ce message est court

Le fond complet — les 77 formats de libellé, les deux tiers de fiches sans correspondance
marque/firme, les ~15 % de lots inextractibles — est dans
`email-bill-marler-recall-data-quality.md`. Il n'est **volontairement pas** repris ici : une
relance qui déverse plus de matière que le premier message se lit comme de l'insistance.

Les deux citations retenues sont celles qui n'exigent aucune confiance envers moi : ce sont
des extraits littéraux d'enregistrements publics, qu'il peut vérifier en trente secondes.
S'il mord, il demandera le reste — et tu l'auras déjà prêt.

## Vérifiable en une requête

```
https://api.fda.gov/food/enforcement.json?search=recalling_firm:"Wehah"&limit=5
https://api.fda.gov/food/enforcement.json?limit=1000&sort=report_date:desc
```

La fiche Markon se trouve dans la seconde, `recalling_firm` = « Taylor Farms de Mexico
S. de R.L. de C.V. ». Consulté le 5 septembre 2026 — l'échantillon est glissant, redonne la
date si tu la cites.
