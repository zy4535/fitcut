// All Supabase reads/writes. Rows come back in the camelCase shape the UI uses.
import { supabase } from "../supabaseClient.js";

const foodOut = (r) => ({ id: r.id, date: r.date, meal: r.meal, name: r.name, unit: r.unit,
  qty: Number(r.qty), kcal: Number(r.kcal), p: Number(r.protein), c: Number(r.carbs),
  f: Number(r.fat), fib: Number(r.fiber) });

const profileOut = (r) => r && ({ mode: r.mode, sex: r.sex, age: r.age, heightIn: r.height_in,
  currentWeight: r.current_weight, startWeight: r.start_weight, activity: r.activity,
  goalWeight: r.goal_weight, goalDate: r.goal_date, override: r.override_safety, timezone: r.timezone });

export async function fetchProfile(uid) {
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  return profileOut(data);
}

export async function saveProfile(uid, p) {
  const row = { user_id: uid, mode: p.mode, sex: p.sex, age: p.age, height_in: p.heightIn,
    current_weight: p.currentWeight, start_weight: p.startWeight, activity: p.activity,
    goal_weight: p.goalWeight, goal_date: p.goalDate, override_safety: !!p.override, timezone: p.timezone || null,
    updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("profiles").upsert(row).select().single();
  if (error) throw error;
  return profileOut(data);
}

export async function fetchWeighIns(uid) {
  const { data, error } = await supabase.from("weigh_ins").select("*").eq("user_id", uid).order("date");
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.id, date: r.date, weight: Number(r.weight) }));
}

export async function addWeighIn(uid, w) {
  const { data, error } = await supabase.from("weigh_ins")
    .insert({ user_id: uid, date: w.date, weight: w.weight }).select().single();
  if (error) throw error;
  return { id: data.id, date: data.date, weight: Number(data.weight) };
}

export async function fetchFood(uid, date) {
  const { data, error } = await supabase.from("food_log").select("*")
    .eq("user_id", uid).eq("date", date).order("created_at");
  if (error) throw error;
  return (data || []).map(foodOut);
}

export async function addFood(uid, e) {
  const { data, error } = await supabase.from("food_log").insert({
    user_id: uid, date: e.date, meal: e.meal, name: e.name, unit: e.unit, qty: e.qty,
    kcal: e.kcal, protein: e.p, carbs: e.c, fat: e.f, fiber: e.fib,
  }).select().single();
  if (error) throw error;
  return foodOut(data);
}

export async function deleteFood(id) {
  const { error } = await supabase.from("food_log").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchCardio(uid, date) {
  const { data, error } = await supabase.from("cardio_log").select("*")
    .eq("user_id", uid).eq("date", date).order("created_at");
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.id, date: r.date, activity: r.activity,
    detail: r.detail, kcal: Number(r.kcal) }));
}

export async function addCardio(uid, e) {
  const { data, error } = await supabase.from("cardio_log").insert({
    user_id: uid, date: e.date, activity: e.activity, detail: e.detail, kcal: e.kcal,
  }).select().single();
  if (error) throw error;
  return { id: data.id, date: data.date, activity: data.activity, detail: data.detail, kcal: Number(data.kcal) };
}

export async function deleteCardio(id) {
  const { error } = await supabase.from("cardio_log").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchRecentFoods(uid, limit = 8) {
  const { data, error } = await supabase.from("food_log").select("*")
    .eq("user_id", uid).order("created_at", { ascending: false }).limit(80);
  if (error) throw error;
  const seen = new Set(), out = [];
  for (const r of data || []) {
    const key = (r.name || "") + "|" + (r.unit || "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(foodOut(r));
    if (out.length >= limit) break;
  }
  return out;
}
