# Réponse à Bill Marler — livrer les sources + caler l'appel

**Contexte :** il a répondu *« Thanks - love to see it - perhaps we could chat next week too. »*
**Rédigé le :** samedi 5 septembre 2026

> ## Ce que « love to see it » désigne
>
> Ton courriel proposait : *« I would be happy to send you the underlying figures and the CDC,
> FDA and Michigan sources I used. »* C'est **cela** qu'il demande à voir. La réponse doit donc
> livrer les sources Cyclospora **en premier**. La coquille FAMRS et la fiche Markon viennent
> après, comme prolongement — les mettre en tête reviendrait à répondre à une autre question
> que la sienne.
>
> Il pose aussi une question directe : *whether the Michigan and federal numbers can be
> reconciled*. Le message y répond explicitement, avec la phrase du CDC qui tranche.

## Points pratiques

| | |
|---|---|
| **Répondre dans le fil** | Garde `Re:` et le sujet d'origine. Ne crée pas un nouveau message. |
| **Même adresse** | Réponds depuis **vgaillard@orange.fr**, celle qu'il a en main. Basculer sur numeline.com casserait le fil et ferait amateur. |
| **Adresse confirmée** | `bmarler@marlerclark.com` — validée, il a répondu. |
| **Signature** | Garde « Vincent Gaillard and Sofia Ait-Bahate », comme dans le premier message. |
| **Pièce jointe** | `docs/marler/fda-recall-record-usability.md` + les 2 fiches JSON. Convertis en PDF si tu veux faire plus soigné. |

## Fuseaux horaires — à ne pas rater

Il est à **Seattle (Pacifique)**, tu es en **France**. Neuf heures d'écart en septembre.
La fenêtre de recouvrement raisonnable est étroite :

| Paris | Seattle |
|---|---|
| 17 h 00 | 08 h 00 |
| 18 h 00 | 09 h 00 |
| 19 h 00 | 10 h 00 |

⚠️ **Lundi 7 septembre est le Labor Day** aux États-Unis. Ne le propose pas.
Propose **mardi 8, mercredi 9 ou jeudi 10**.

---

## Objet

```
Re: Michigan's Cyclospora count now exceeds the national outbreak total — a reporting gap worth examining
```

## Corps du message

```
Bill,

Thank you — and yes, a call next week would be welcome.

Here are the sources behind the two figures, so you can check them directly.

CDC, multistate investigation, updated September 3, 2026 — 11,458 laboratory-
confirmed illnesses, 20 states, at least 495 hospitalizations, 2 deaths, last
illness onset August 15, 2026. Georgia, Tennessee and Texas were added on
August 27.
https://www.cdc.gov/cyclosporiasis/outbreaks/07-26/investigation.html

Michigan MDHHS, updated September 3, 2026 — 14,718 cases since June 22, 366
hospitalizations, cases in 72 of 83 counties plus Detroit, which reports
separately.
https://www.michigan.gov/mdhhs/keep-mi-healthy/infectious-diseases/cyclosporiasis-outbreak

CDC health advisory, domestically acquired cyclosporiasis:
https://www.cdc.gov/han/php/notices/han00531.html

On your question of whether the two can be reconciled: I think they can, and the
CDC says so itself on the investigation page. Its wording is that states "may
also include probable illnesses or update their websites at different
frequencies," and that "CDC and FDA are only reporting laboratory confirmed
cases." Add the six-week lag it estimates between onset and national reporting
and the arithmetic works. My concern was never that the numbers conflict. It is
that the smaller one is the one everybody quotes.

Since you may find it more useful than the count itself, I have attached a short
note on a related problem in the same records — whether a person holding the
product can identify it at all.

Two examples from it. The enforcement record for the Cyclospora recall lists the
firm as Taylor Farms de México but describes the product as "MARKON BLEND
LETT/ROM 80/20 WITH SEP BAGGIES 4/5#" — the name on the case is Markon, and that
record's recall_number field is empty. Separately, the Lundberg rice recall
(H-0767-2026) lists the firm as Wehah Farms, misspells the brand in its own
description as "LUNDBERG FAMILY FAMRS", and buries the lot codes in a compound
label reading "Lot, Best Before: 260201MA, 01FEB2027". Across the 1,000 most
recent FDA food enforcement records, the recalling firm's name does not appear
in the product description about two-thirds of the time.

For a call, Monday is Labor Day, so would Tuesday, Wednesday or Thursday suit?
I am in France, so anything between 8 and 10 a.m. your time works well on my
side — but I will fit your schedule, early or late.

Vincent Gaillard and Sofia Ait-Bahate

Numeline — Instant Food Recall Verification by Lot Number
www.numeline.com
```

---

## Préparer l'appel

Il t'a proposé un échange : c'est l'ouverture, pas le courriel. Trois choses à savoir avant.

**1. Ce qu'il cherche probablement.** Marler prend des dossiers de victimes. Un appel avec toi
l'intéresse pour deux raisons possibles : une source de données pour Food Safety News, ou un
outil qui documente ce qu'un consommateur pouvait raisonnablement savoir — question qui compte
en responsabilité. Ne pars pas du principe qu'il veut parler de l'application.

**2. Ce que tu dois pouvoir défendre.** Le tableau de solidité dans
`email-bill-marler-recall-data-quality.md` reste valable : les deux tiers reposent sur une
heuristique et les ~15 % décrivent notre analyseur. **Dis-le spontanément avant qu'il le
demande.** Un avocat qui découvre seul la faiblesse d'un chiffre cesse de faire confiance à
tous les autres ; celui à qui on la signale retient l'inverse.

**3. Ce qui est incontestable.** Les citations Markon et FAMRS sont littérales et vérifiables
en trente secondes. Si l'appel doit reposer sur une seule chose, que ce soit celle-là.

## Fichiers à joindre

- `docs/marler/fda-recall-record-usability.md` — la note d'une page
- `docs/marler/record-taylor-farms-markon.json` — la fiche Cyclospora, verbatim
- `docs/marler/record-lundberg-H-0767-2026.json` — la fiche Lundberg, verbatim
