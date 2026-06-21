// Food lookup. Live results come from Open Food Facts (free, no key).
// A small local list is used as an offline / fallback set.
import { round, r1 } from "./calc.js";

export const SEED_FOODS = [
  { name: "Double Fiber Bread", unit: "slice", kcal: 70, p: 5, c: 20, f: 1, fib: 5 },
  { name: "Chicken Breast, cooked", unit: "100 g", kcal: 165, p: 31, c: 0, f: 3.6, fib: 0 },
  { name: "White Rice, cooked", unit: "cup", kcal: 205, p: 4, c: 45, f: 0.4, fib: 0.6 },
  { name: "Large Egg", unit: "egg", kcal: 72, p: 6, c: 0.4, f: 5, fib: 0 },
  { name: "Rolled Oats, dry", unit: "½ cup", kcal: 150, p: 5, c: 27, f: 3, fib: 4 },
  { name: "Banana, medium", unit: "banana", kcal: 105, p: 1.3, c: 27, f: 0.4, fib: 3.1 },
  { name: "Greek Yogurt, nonfat", unit: "cup", kcal: 130, p: 22, c: 9, f: 0, fib: 0 },
  { name: "Peanut Butter", unit: "tbsp", kcal: 94, p: 4, c: 3, f: 8, fib: 0.9 },
  { name: "Whey Protein", unit: "scoop", kcal: 120, p: 24, c: 3, f: 1.5, fib: 1 },
  { name: "Almonds", unit: "28 g", kcal: 164, p: 6, c: 6, f: 14, fib: 3.5 },
];

function parseServingGrams(s) {
  if (!s) return null;
  const m = String(s).match(/([\d.]+)\s*g\b/i);
  return m ? Math.round(parseFloat(m[1])) : null;
}

// Map one Open Food Facts product to our food shape(s).
function toFood(p) {
  const n = p.nutriments || {};
  let kcal100 = n["energy-kcal_100g"];
  if (kcal100 == null && n["energy-kj_100g"] != null) kcal100 = n["energy-kj_100g"] / 4.184;
  if (kcal100 == null) return null;
  const brand = (p.brands || "").split(",")[0]?.trim();
  const name = [brand, p.product_name].filter(Boolean).join(" — ").trim() || p.product_name;
  if (!name) return null;

  const per100 = {
    name, unit: "100 g", kcal: round(kcal100),
    p: r1(n.proteins_100g || 0), c: r1(n.carbohydrates_100g || 0),
    f: r1(n.fat_100g || 0), fib: r1(n.fiber_100g || 0),
  };
  let serving = null;
  const g = parseServingGrams(p.serving_size);
  if (g) {
    const k = g / 100;
    serving = {
      name, unit: `serving (${g} g)`, kcal: round(kcal100 * k),
      p: r1((n.proteins_100g || 0) * k), c: r1((n.carbohydrates_100g || 0) * k),
      f: r1((n.fat_100g || 0) * k), fib: r1((n.fiber_100g || 0) * k),
    };
  }
  return { per100, serving };
}

export async function searchFoods(query) {
  const q = query.trim();
  if (!q) return [];
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" +
    encodeURIComponent(q) +
    "&search_simple=1&action=process&json=1&page_size=25" +
    "&fields=product_name,brands,nutriments,serving_size";
  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = (data.products || []).map(toFood).filter(Boolean);
    if (items.length) return items;
  } catch (e) {
    // network/offline -> fall back to the seed list below
  }
  return SEED_FOODS
    .filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))
    .map((f) => ({ per100: f, serving: null }));
}
