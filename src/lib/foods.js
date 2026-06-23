// Food lookup.
//  - Typed search -> USDA FoodData Central (generic + US branded foods)
//  - Portions     -> USDA detail endpoint ("1 large egg = 50 g"), fetched on demand
//  - Barcode scan -> Open Food Facts (great at UPC lookups, no key)
//  - Fallbacks    -> Open Food Facts text search, then a tiny local seed list
import { round, r1 } from "./calc.js";

const USDA_KEY = import.meta.env.VITE_USDA_API_KEY || "DEMO_KEY";

export const SEED_FOODS = [
  { name: "Double Fiber Bread", unit: "slice", grams: 34, kcal: 70, p: 5, c: 20, f: 1, fib: 5 },
  { name: "Chicken Breast, cooked", unit: "100 g", grams: 100, kcal: 165, p: 31, c: 0, f: 3.6, fib: 0 },
  { name: "Large Egg", unit: "egg", grams: 50, kcal: 72, p: 6, c: 0.4, f: 5, fib: 0 },
  { name: "Banana, medium", unit: "banana", grams: 118, kcal: 105, p: 1.3, c: 27, f: 0.4, fib: 3.1 },
];

const num = (v) => (v == null || isNaN(v) ? 0 : v);
function parseGrams(s) { if (!s) return null; const m = String(s).match(/([\d.]+)\s*g\b/i); return m ? Math.round(parseFloat(m[1])) : null; }

// Build a per-serving macro object by scaling per-100g macros to `grams`.
export function gramsToServing(per100, grams, label) {
  const k = grams / 100;
  return { unit: label || `${grams} g`, grams, kcal: round(per100.kcal * k),
    p: r1(per100.p * k), c: r1(per100.c * k), f: r1(per100.f * k), fib: r1(per100.fib * k) };
}

/* ---------- USDA FoodData Central ---------- */
const DATATYPE_RANK = { Foundation: 0, "SR Legacy": 1, "Survey (FNDDS)": 2, Branded: 3 };
function fromUSDA(food) {
  const list = food.foodNutrients || [];
  const find = (name, unit) => list.find((n) => n.nutrientName === name && (!unit || (n.unitName || "").toUpperCase() === unit));
  const kcal = find("Energy", "KCAL")?.value;
  if (kcal == null) return null;
  const brand = food.brandName || food.brandOwner;
  const desc = food.description || "";
  const name = brand && !desc.toLowerCase().includes(String(brand).toLowerCase()) ? `${brand} — ${desc}` : desc;
  if (!name) return null;
  const per100 = { name, fdcId: food.fdcId, kcal: round(kcal),
    p: r1(num(find("Protein")?.value)), c: r1(num(find("Carbohydrate, by difference")?.value)),
    f: r1(num(find("Total lipid (fat)")?.value)), fib: r1(num(find("Fiber, total dietary")?.value)) };
  const servings = [];
  if (food.servingSizeUnit && /^(g|gram|grams)$/i.test(food.servingSizeUnit) && food.servingSize) {
    servings.push(gramsToServing(per100, Math.round(food.servingSize), food.householdServingFullText || `serving (${Math.round(food.servingSize)} g)`));
  }
  return { per100, servings };
}
async function searchUSDA(q) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}&query=${encodeURIComponent(q)}&pageSize=25`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("usda " + res.status);
  const data = await res.json();
  const foods = (data.foods || []).slice().sort((a, b) => (DATATYPE_RANK[a.dataType] ?? 9) - (DATATYPE_RANK[b.dataType] ?? 9));
  return foods.map(fromUSDA).filter(Boolean);
}

// On-demand portion list for a USDA food, e.g. "1 egg" (50 g), "1 cup" (243 g).
// Throws on a failed request so the UI can tell "rate-limited/failed" apart from "no portions".
export async function usdaPortions(fdcId) {
  if (!fdcId) return [];
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}?format=full&api_key=${USDA_KEY}`);
  if (!res.ok) { const e = new Error("usda_detail_" + res.status); e.status = res.status; throw e; }
  const d = await res.json();
  return (d.foodPortions || []).map((p) => {
    const grams = p.gramWeight;
    if (!grams) return null;
    let label = "";
    if (p.portionDescription && p.portionDescription !== "Quantity not specified") {
      label = p.portionDescription;
    } else {
      const muName = p.measureUnit && p.measureUnit.name && p.measureUnit.name !== "undetermined" ? p.measureUnit.name : "";
      const mod = p.modifier && !/^\d+$/.test(String(p.modifier)) ? p.modifier : ""; // skip numeric codes
      label = [p.amount, mod || muName].filter(Boolean).join(" ");
    }
    label = (label || `${Math.round(grams)} g`).trim();
    return { grams: Math.round(grams), label };
  }).filter(Boolean).sort((a, b) => a.grams - b.grams);
}

/* ---------- Open Food Facts ---------- */
function fromOFF(p) {
  const n = p.nutriments || {};
  let kcal100 = n["energy-kcal_100g"];
  if (kcal100 == null && n["energy-kj_100g"] != null) kcal100 = n["energy-kj_100g"] / 4.184;
  if (kcal100 == null) return null;
  const brand = (p.brands || "").split(",")[0]?.trim();
  const name = [brand, p.product_name].filter(Boolean).join(" — ").trim() || p.product_name;
  if (!name) return null;
  const per100 = { name, kcal: round(kcal100), p: r1(num(n.proteins_100g)), c: r1(num(n.carbohydrates_100g)),
    f: r1(num(n.fat_100g)), fib: r1(num(n.fiber_100g)) };
  const servings = [];
  const g = parseGrams(p.serving_size);
  if (g) servings.push(gramsToServing(per100, g, `serving (${g} g)`));
  return { per100, servings };
}
async function searchOFF(q) {
  const url = "https://us.openfoodfacts.org/cgi/search.pl?search_terms=" + encodeURIComponent(q) +
    "&search_simple=1&action=process&json=1&page_size=25&sort_by=unique_scans_n" +
    "&fields=product_name,brands,nutriments,serving_size";
  const res = await fetch(url);
  const data = await res.json();
  return (data.products || []).map(fromOFF).filter(Boolean);
}

/* ---------- public ---------- */
export async function searchFoods(query) {
  const q = query.trim();
  if (!q) return [];
  try { const u = await searchUSDA(q); if (u.length) return u; } catch (e) {}
  try { const o = await searchOFF(q); if (o.length) return o; } catch (e) {}
  return SEED_FOODS.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))
    .map((f) => ({ per100: { name: f.name, kcal: round(f.kcal * 100 / f.grams), p: r1(f.p * 100 / f.grams), c: r1(f.c * 100 / f.grams), f: r1(f.f * 100 / f.grams), fib: r1(f.fib * 100 / f.grams) },
      servings: [{ unit: f.unit, grams: f.grams, kcal: f.kcal, p: f.p, c: f.c, f: f.f, fib: f.fib }] }));
}

export async function lookupBarcode(code) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_size`;
  try { const res = await fetch(url); const data = await res.json(); if (data.status === 1 && data.product) return fromOFF(data.product); }
  catch (e) {}
  return null;
}
