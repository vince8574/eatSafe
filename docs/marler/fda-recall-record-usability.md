# Can a consumer identify their product from an FDA recall record?

**Prepared for Bill Marler — September 2026**
Vincent Gaillard, Numeline · vincent@numeline.com

Sample: the 1,000 most recent FDA food enforcement records, retrieved 5 September 2026 from
`https://api.fda.gov/food/enforcement.json?limit=1000&sort=report_date:desc`
(report dates 3 December 2025 – 19 August 2026; 998 carry a non-empty `code_info`).

The sample is rolling — figures will shift if the query is re-run. Two raw records are
included alongside this note so the central claims can be checked without re-running anything.

---

## 1. The recalling firm is usually not the brand on the package

In **650 of 1,000 records (65%)**, the distinctive part of `recalling_firm` appears nowhere in
`product_description`. The company named in the recall is not the name a shopper can see.

| `recalling_firm` | `product_description` (start) |
|---|---|
| Taylor Farms de Mexico S. de R.L. de C.V. | **MARKON** BLEND LETT/ROM 80/20 WITH SEP BAGGIES 4/5# |
| La Colonia Foods Llc | **Selectos Latinos** Requeson Mexicano Mexican Cottage Cheese |
| FACTORY6, INC. | **Zen Principle Naturals** Moringa Leaf Powder |
| FlavorsandColor.Com | **Honeyville** YELLOW COLOR 1 GALLON |
| MIDWEST POULTRY SERVC C/O H & LELECTRIC | Grade A White In-shell Chicken eggs *(no brand at all)* |
| Bazzini LLC | Dark Chocolate Coconut Almond Bites *(no brand at all)* |

Two of these sit inside outbreaks you will know. The **Markon** line is the Cyclospora recall
itself: the name on the case is Markon, and a foodservice buyer searching "Taylor Farms" gets
nothing. That record's `recall_number` field is also **empty**. The **Selectos Latinos** line
is the Class I *Listeria* requesón recall from the outbreak that killed one person.

*Method, so it can be challenged:* I take the first word of `recalling_firm` longer than three
characters, excluding *the, and, inc, llc, corp, company, foods, farms, ltd, co, group, de,
usa*, and test whether it occurs in `product_description`. It is a heuristic. It will
occasionally misfire — but every row above was checked by hand, and the direction of the error
is conservative: a firm whose name appears only as an abbreviation counts as a match.

---

## 2. Lot codes are prose, not data

Lot information lives in `code_info`, a free-text field with no schema. **485 of the 998**
records announce a lot in some form. The labels are not standardised:

```
Lot Codes          Lot Code           Lot Number         Lot Numbers
Batch Lot          Batch Codes        Lot, Best Before   Lots
Pallet Lot #s      Lot Codes (visible on cases)          Batch Code
Lot: a) 25008      Product Number ... Batch: ... Lot: ... Best By:
```

I have deliberately not given a single count of "distinct formats". Depending on how you
group them, this sample yields anywhere from **77 to 233** — the number says more about the
grouping rule than about the FDA. What is not method-dependent is that there is no schema at
all, and that a reader must parse English prose to recover a lot code.

Concrete consequence, from our own software: roughly **15%** of the 485 records that announce
a lot yield nothing our parser can extract. That figure describes our parser as much as the
data, and should be read as an upper bound on what is easy, not a defect rate.

---

## 3. One bag of rice, three obstacles

Recall **H-0767-2026**, Lundberg Family Farms white jasmine rice, 2 lb, UPC 073416040281.
Class II, foreign material, initiated 3 April 2026, still listed *ongoing*.

```
recalling_firm      Wehah Farms
product_description LUNDBERG FAMILY FAMRS WHITE RICE JASMINE NET WT 32 OZ (2 lb) 907 g ...
code_info           Lot, Best Before: 260201MA, 01FEB2027; 260202MA, 02FEB2027.
```

Three separate barriers between a shopper and an answer:

1. **The firm is Wehah Farms.** The bag says Lundberg Family Farms. Searching the brand fails.
2. **The description misspells the brand** as `LUNDBERG FAMILY FAMRS` — R and M transposed.
   A string match on the correct spelling fails too.
3. **The lot label is compound.** `Lot, Best Before:` announces two fields at once, then
   alternates lot, date, lot, date. Read naively it returns either nothing or the date
   `01FEB2027` as a lot number.

None of the three is serious on its own. A consumer has to clear all three.

---

## Why it seems worth raising

Recall effectiveness rests on people identifying their own product. These records index the
manufacturer, while consumers hold a brand; they publish lot codes as sentences, while
consumers need to match a string. The remedy is unglamorous and not technical — a brand field
distinct from the recalling firm, and lot codes in a structured field.

I build a consumer app that reads these records daily, which is how I run into it. I have no
client and no position beyond that.

---

## Files included

| File | Contents |
|---|---|
| `record-taylor-farms-markon.json` | The Cyclospora enforcement record, verbatim, including the empty `recall_number` |
| `record-lundberg-H-0767-2026.json` | The Lundberg rice record, verbatim, including the `FAMRS` spelling |

Both can be reproduced from the endpoint above.
