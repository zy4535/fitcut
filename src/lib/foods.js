// Food lookup.
//  - Typed search  -> USDA FoodData Central (great for generic + US branded foods)
//  - Barcode scan   -> Open Food Facts (great at UPC lookups, no key)
//  - Fallbacks      -> Open Food Facts text search, then a tiny local seed list
import { round, r1 } from "./calc.js";

const USDA_KEY = import.meta.env.VITE_USDA_API_KEY || "DEMO_KEY";

export const SEED_FOODS = [
  { name: "Double Fiber Bread", unit: "slice", kcal: 70, p: 5, c: 20, f: 1, fib: 5 },
  { name: "Chicken Breast, cooked", unit: "100 g", kcal: 165, p: 31, c: 0, f: 3.6, fib: 0 },
  { name: "White Rice, cooked", unit: "cup", kcal: 205, p: 4, c: 45, f: 0.4, fib: 0.6 },
  { name: "Large Egg", unit: "egg", kcal: 72, p: 6, c: 0.4, f: 5, fib: 0 },
  { name: "Banana, medium", unit: "banana", kcal: 105, p: 1.3, c: 27, f: 0.4, fib: 3.1 },
];

const num = (v) => (v == null || isNaN(v) ? 0 : v);
function parseGrams(s) { if (!s) return null; const m = String(s).match(/([\d.]+)\s*g\b/i); return m ? Math.round(parseFloat(m[1])) : null; }
function withServing(per100, grams, unitLabel) {
  if (!grams) return { per100, serving: null };
  const k = grams / 100;
  return { per100, serving: { name: per100.name, unit: unitLabel || `serving (${grams} g)`,
    kcal: round(per100.kcal * k), p: r1(per100.p * k), c: r1(per100.c * k), f: r1(per100.f * k), fib: r1(per100.fib * k) } };
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
  const per100 = { name, unit: "100 g", kcal: round(kcal),
    p: r1(num(find("Protein")?.value)), c: r1(num(find("Carbohydrate, by difference")?.value)),
    f: r1(num(find("Total lipid (fat)")?.value)), fib: r1(num(find("Fiber, total dietary")?.value)) };
  const grams = food.servingSizeUnit && /^(g|gram|grams)$/i.test(food.servingSizeUnit) ? Math.round(food.servingSize) : null;
  return withServing(per100, grams, food.householdServingFullText);
}
async function searchUSDA(q) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_KEY}` +
    `&query=${encodeURIComponent(q)}&pageSize=25`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("usda " + res.status);
  const data = await res.json();
  const foods = (data.foods || []).slice()
    .sort((a, b) => (DATATYPE_RANK[a.dataType] ?? 9) - (DATATYPE_RANK[b.dataType] ?? 9));
  return foods.map(fromUSDA).filter(Boolean);
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
  const per100 = { name, unit: "100 g", kcal: round(kcal100), p: r1(num(n.proteins_100g)),
    c: r1(num(n.carbohydrates_100g)), f: r1(num(n.fat_100g)), fib: r1(num(n.fiber_100g)) };
  return withServing(per100, parseGrams(p.serving_size));
}
async function searchOFF(q) {
  const url = "https://us.openfoodfacts.org/cgi/search.pl?search_terms=" + encodeURIComponent(q) +
    "&search_simple=1&action=process&json=1&page_size=25&sort_by=unique_scans_n" +
    "&fields=product_name,brands,nutriments,serving_size";
  const res = await fetch(url);
  const data = await res.json();
  return (data.products || []).map(fromOFF).filter(Boolean);
}

/* ---------- public API ---------- */
export async function searchFoods(query) {
  const q = query.trim();
  if (!q) return [];
  try { const u = await searchUSDA(q); if (u.length) return u; } catch (e) { /* fall through */ }
  try { const o = await searchOFF(q); if (o.length) return o; } catch (e) { /* fall through */ }
  return SEED_FOODS.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())).map((f) => ({ per100: f, serving: null }));
}

export async function lookupBarcode(code) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_size`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 1 && data.product) return fromOFF(data.product);
  } catch (e) { /* ignore */ }
  return null;
}
