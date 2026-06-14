import { useState, useEffect, useRef } from "react";

// ─── FONTS ───────────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Share+Tech+Mono&display=swap";
document.head.appendChild(fontLink);

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const C = {
  bg:       "#080A04",
  card:     "#0E1108",
  mid:      "#161B0C",
  surface:  "#1E2510",
  accent:   "#4A7C2F",
  accentLt: "#6AAF3D",
  accentDk: "#2D4A1E",
  text:     "#E8E0CC",
  sub:      "#7A7560",
  muted:    "#3E3E2E",
  border:   "#222A10",
  red:      "#B82222",
  gold:     "#B89A20",
  white:    "#F0EDE4",
};

// ─── STORAGE ─────────────────────────────────────────────────────────────────
const SK = "beapro_v2";
function loadStore() { try { const d = localStorage.getItem(SK); return d ? JSON.parse(d) : {}; } catch { return {}; } }
function saveStore(s) { try { localStorage.setItem(SK, JSON.stringify(s)); } catch {} }

// ─── GBRS STANDARDS ──────────────────────────────────────────────────────────
const STANDARDS = [
  { key: "broadJump",   label: "Broad Jump",       unit: "m",    norm: 2.36, higher: true,  dec: 2 },
  { key: "benchAmrap",  label: "Bench AMRAP",       unit: "reps", norm: 20,   higher: true,  dec: 0 },
  { key: "pullups",     label: "Pull-ups",          unit: "reps", norm: 20,   higher: true,  dec: 0 },
  { key: "trapBar5rm",  label: "Trap Bar 5RM",      unit: "kg",   norm: null, higher: true,  dec: 0 },
  { key: "plank",       label: "Plank",             unit: "s",    norm: 180,  higher: true,  dec: 0 },
  { key: "farmerCarry", label: "Farmer's Carry",    unit: "m",    norm: 76,   higher: true,  dec: 0 },
  { key: "run800",      label: "800m Run",          unit: "s",    norm: 165,  higher: false, dec: 0 },
];

function fmtTime(s) {
  const sec = Math.round(s);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
function fmtVal(key, val) {
  if (key === "plank" || key === "run800") return fmtTime(val);
  const s = STANDARDS.find(x => x.key === key);
  return s ? Number(val).toFixed(s.dec) + " " + s.unit : String(val);
}
function getNorm(key, bw) {
  if (key === "trapBar5rm") return Math.round(bw * 2);
  return STANDARDS.find(s => s.key === key)?.norm || 0;
}
function getStatusColor(pct) {
  if (pct >= 100) return C.accentLt;
  if (pct >= 80)  return C.gold;
  return C.red;
}

// ─── EQUIPMENT SUBSTITUTIONS ─────────────────────────────────────────────────
function substituteExercise(naam, equipment) {
  const hasSandbag = equipment?.includes("sandbag") || equipment?.includes("Volledig");
  const hasSled    = equipment?.includes("sled") || equipment?.includes("Volledig") || equipment?.includes("Militaire");
  const hasTrapBar = equipment?.includes("trap") || equipment?.includes("Volledig") || equipment?.includes("Militaire");
  const hasBarbell = !equipment?.includes("Thuis") && !equipment?.includes("Buiten zonder gewichten");
  const hasPullBar = !equipment?.includes("Thuis zonder");

  const subs = {
    "Sandbag Squat":         hasSandbag ? "Sandbag Squat"         : hasBarbell ? "Front Squat" : "Goblet Squat (DB)",
    "Sled Push (10m)":       hasSled    ? "Sled Push (10m)"       : "Airbike Sprint 15s",
    "Sled Sprint 10m":       hasSled    ? "Sled Sprint 10m"       : "Airbike Sprint 10s max",
    "Sled Pull 10m":         hasSled    ? "Sled Pull 10m"         : "Roeier 30s @90%",
    "Trap Bar Deadlift":     hasTrapBar ? "Trap Bar Deadlift"     : hasBarbell ? "Conventionele Deadlift" : "KB Deadlift",
    "Trap Bar DL (zwaar)":   hasTrapBar ? "Trap Bar DL (zwaar)"   : hasBarbell ? "Deadlift (zwaar)" : "KB Deadlift",
    "Trap Bar Speed DL":     hasTrapBar ? "Trap Bar Speed DL"     : hasBarbell ? "Speed Deadlift" : "KB Swing",
    "Pull-ups (strict)":     hasPullBar ? "Pull-ups (strict)"     : "Lat Pulldown / Band Pull",
    "Pull-ups (variatie)":   hasPullBar ? "Pull-ups (variatie)"   : "Lat Pulldown variatie",
    "Weighted Pull-ups":     hasPullBar ? "Weighted Pull-ups"     : "Lat Pulldown (zwaar)",
    "Farmer's Carry":        hasBarbell ? "Farmer's Carry"        : "KB Farmer's Carry",
    "Farmer's Carry (zwaar)":hasBarbell ? "Farmer's Carry (zwaar)": "KB Farmer's Carry",
    "Farmer's Carry (retest prep)": hasBarbell ? "Farmer's Carry (retest prep)" : "KB Farmer's Carry",
    "Barbell Row":           hasBarbell ? "Barbell Row"           : "DB Row",
    "Barbell Row (zwaar)":   hasBarbell ? "Barbell Row (zwaar)"   : "DB Row (zwaar)",
    "Barbell Shrug":         hasBarbell ? "Barbell Shrug"         : "DB Shrug",
    "Heavy Barbell Shrug":   hasBarbell ? "Heavy Barbell Shrug"   : "DB Shrug (zwaar)",
  };
  return subs[naam] || naam;
}

// ─── SCHEMA GENERATOR ────────────────────────────────────────────────────────
function buildSchema(profile, baseline) {
  const bw  = parseFloat(profile.weight) || 75;
  const eq  = profile.equipment || "";
  const sub = (naam) => substituteExercise(naam, eq);

  const trapBase = parseFloat(baseline.trapBar5rm) || Math.round(bw * 1.5);
  const benchBase = parseFloat(baseline.benchAmrap) || 0;

  // Estimated 1RMs
  const bench1RM = Math.round(bw * 0.85 + (benchBase > 0 ? benchBase * 2.5 : 0));
  const trap1RM  = Math.round(trapBase * 1.15);
  const zer1RM   = Math.round(trapBase * 1.05);

  // Blok 1 loads
  const b1_bench = Math.round(bench1RM * 0.65);
  const b1_trap  = Math.round(trap1RM  * 0.70);
  const b1_zer   = Math.round(zer1RM   * 0.70);

  const gaps = STANDARDS.map(s => {
    const val = parseFloat(baseline[s.key]) || 0;
    const norm = getNorm(s.key, bw);
    const pct  = s.higher ? (val / norm) * 100 : (norm / val) * 100;
    return { key: s.key, label: s.label, pct };
  }).sort((a, b) => a.pct - b.pct);

  const topGaps = gaps.slice(0, 3).map(g => {
    const m = {
      broadJump:   "Broad Jump — explosief power en sprint training",
      benchAmrap:  "Bench AMRAP — hoog volume opbouwen richting 20+ reps",
      pullups:     "Pull-ups — frequentie verhogen, 3–4× per week",
      trapBar5rm:  `Trap Bar DL — kracht richting ${getNorm("trapBar5rm", bw)}kg`,
      plank:       "Plank — core endurance, dagelijks McGill protocol",
      farmerCarry: "Farmer's Carry — grip en work capacity",
      run800:      "800m Run — aeroob onderhoud, 2× Z2 per week",
    };
    return m[g.key] || g.label;
  });

  const analyse = `${profile.name} scoort ${gaps.filter(g => g.pct >= 90).length} van 7 standards boven 90%. ` +
    `Grootste gap: ${gaps[0].label} op ${Math.round(gaps[0].pct)}% van de Be a Pro norm. ` +
    `Schema is volledig gepersonaliseerd op basis van jouw baseline — loads, volume en progressie zijn berekend voor jouw niveau.`;

  const makeOef = (naam, sets, reps, load, rir, rest, prog) => ({
    naam: sub(naam), origNaam: naam, sets, reps, load, rir, rest, progressie: prog,
  });

  const condSessions = getConditioningSession(profile.background, eq, bw, makeOef);

  return {
    analyse,
    prioriteiten: topGaps,
    blokken: [
      {
        nummer: 1, naam: "Work Capacity & Hypertrofie", weken: "1–4",
        focus: "Fundament leggen. Hoog volume, matige intensiteit (67–75% 1RM). Bewegingspatronen consolideren.",
        sessies: [
          {
            id: "A", naam: "Lower Body", dag: "Ma",
            oefeningen: [
              makeOef("Zercher Squat", 4, "6", `${b1_zer}kg`, 3, "2:30", [`${b1_zer}kg`, `${b1_zer+5}kg`, `${b1_zer+10}kg`, `${Math.round(b1_zer*0.8)}kg`]),
              makeOef("Trap Bar Deadlift", 4, "5", `${b1_trap}kg`, 3, "2:30", [`${b1_trap}kg`, `${b1_trap+5}kg`, `${b1_trap+10}kg`, `${Math.round(b1_trap*0.8)}kg`]),
              makeOef("Sandbag Squat", 3, "10", "matig", 2, "90s", ["matig","iets zwaarder","iets zwaarder","licht deload"]),
              makeOef("Hip Thruster", 3, "12", "machine", 2, "75s", ["RIR3","RIR2","RIR2","RIR4"]),
              makeOef("Tib Raise", 3, "15", "BW", 2, "45s", ["BW","BW","BW+gewicht","BW"]),
            ],
            conditioning: [
              makeOef("Sled Push (10m)", 6, "10m", "max effort", 0, "90s", ["6×","8×","10×","5×"]),
              makeOef("Airbike Sprint 10s", 6, "10s", "allout", 0, "50s", ["6 rondes","8 rondes","10 rondes","5 rondes"]),
            ],
          },
          {
            id: "B", naam: "Upper Push + Trap/Nek", dag: "Wo",
            oefeningen: [
              makeOef("Flat Bench Press", 4, "8", `${b1_bench}kg`, 3, "2:30", [`${b1_bench}kg`, `${b1_bench+2}kg`, `${b1_bench+4}kg`, `${Math.round(b1_bench*0.8)}kg`]),
              makeOef("Incline DB Press", 3, "10", "matig", 2, "90s", ["RIR3","RIR2","RIR2","RIR4"]),
              makeOef("Pull-ups (strict)", 4, "6", "BW", 2, "90s", ["4×6","5×6","5×6-8","3×5"]),
              makeOef("Lat Pulldown", 3, "10", "65%", 2, "75s", ["65%","70%","72%","55%"]),
              makeOef("DB Lateral Raise", 3, "15", "licht", 1, "45s", ["RIR1","RIR1","RIR1","RIR2"]),
              makeOef("Barbell Shrug", 4, "12", "80kg", 2, "60s", ["80kg","85kg","90kg","70kg"]),
              makeOef("Nek Extensie (harnas)", 3, "12", "harnas", 2, "60s", ["3×12","3×12","4×10","2×10"]),
              makeOef("Nek Flexie", 3, "12", "licht gewicht", 2, "60s", ["3×12","3×12","4×10","2×10"]),
            ],
            conditioning: [
              makeOef("Roeier 30s @85%", 6, "30s", "@85%", 0, "90s", ["6 rondes","8 rondes","10 rondes","5 rondes"]),
            ],
          },
          {
            id: "C", naam: "Full Body Work Capacity", dag: "Vr",
            oefeningen: [
              makeOef("Barbell Row", 4, "8", `${Math.round(b1_bench*0.8)}kg`, 2, "90s", [`${Math.round(b1_bench*0.8)}kg`,`${Math.round(b1_bench*0.85)}kg`,`${Math.round(b1_bench*0.90)}kg`,"deload"]),
              makeOef("Pull-ups (variatie)", 4, "6", "BW", 2, "90s", ["4×6","4×6+5kg>8","4×max","3×5"]),
              makeOef("Farmer's Carry", 4, "40m", `${Math.round(bw*0.8)}kg`, 2, "60s", ["40m","50m","60m","30m"]),
              makeOef("Face Pull", 3, "15", "licht", 1, "45s", ["RIR1","RIR1","RIR1","RIR2"]),
              makeOef("EZ-bar Curl", 3, "10", "matig", 2, "60s", ["RIR2","RIR2","RIR1","RIR3"]),
            ],
            conditioning: [
              makeOef("Sled Pull 10m", 5, "10m", "max", 0, "75s", ["5 rondes","6 rondes","8 rondes","4 rondes"]),
            ],
          },
          condSessions.b1,
        ],
      },
      {
        nummer: 2, naam: "Max Kracht", weken: "5–8",
        focus: "Intensiteit omhoog (80–90% 1RM), volume omlaag. Bench en Trap Bar richting GBRS normen duwen.",
        sessies: [
          {
            id: "E", naam: "Max Kracht Lower", dag: "Ma",
            oefeningen: [
              makeOef("Zercher Squat", 5, "3", `${Math.round(zer1RM*0.82)}kg`, 3, "3:00", [`${Math.round(zer1RM*0.82)}kg`,`${Math.round(zer1RM*0.86)}kg`,`${Math.round(zer1RM*0.90)}kg`,`${Math.round(zer1RM*0.70)}kg`]),
              makeOef("Trap Bar Deadlift", 5, "3", `${Math.round(trap1RM*0.82)}kg`, 3, "3:00", [`${Math.round(trap1RM*0.82)}kg`,`${Math.round(trap1RM*0.86)}kg`,`${Math.round(trap1RM*0.90)}kg`,`${Math.round(trap1RM*0.70)}kg`]),
              makeOef("Leg Press", 4, "6", "zwaar", 2, "2:00", ["RIR2","RIR2","RIR1","RIR4"]),
              makeOef("Romanian DL", 3, "8", "matig", 2, "90s", ["RIR2","RIR2","RIR1","RIR4"]),
            ],
            conditioning: [
              makeOef("Sled Push (10m)", 5, "10m", "zwaar", 0, "2:00", ["5×","6×","6×","4×"]),
            ],
          },
          {
            id: "F", naam: "Max Kracht Upper + Trap/Nek", dag: "Wo",
            oefeningen: [
              makeOef("Flat Bench Press", 5, "3", `${Math.round(bench1RM*0.82)}kg`, 3, "3:00", [`${Math.round(bench1RM*0.82)}kg`,`${Math.round(bench1RM*0.86)}kg`,`${Math.round(bench1RM*0.90)}kg`,`${Math.round(bench1RM*0.70)}kg`]),
              makeOef("Weighted Pull-ups", 5, "3", "+10kg", 3, "3:00", ["+10kg","+12kg","+15kg","BW"]),
              makeOef("Incline Bench Press", 4, "5", "zwaar", 2, "2:00", ["RIR2","RIR2","RIR1","RIR4"]),
              makeOef("Barbell Row", 4, "5", "zwaar", 2, "2:00", ["RIR2","RIR2","RIR1","RIR4"]),
              makeOef("Heavy Barbell Shrug", 4, "8", "100kg", 2, "60s", ["100kg","105kg","110kg","85kg"]),
              makeOef("Nek Extensie (harnas)", 4, "10", "harnas", 1, "60s", ["4×10","4×10","4×8","3×8"]),
              makeOef("Nek Flexie", 4, "10", "matig", 1, "60s", ["4×10","4×10","4×8","3×8"]),
            ],
            conditioning: [
              makeOef("Roeier Steady State", 1, "15 min", "Z2", 1, "—", ["15 min","15 min","12 min","10 min"]),
            ],
          },
          {
            id: "G", naam: "Kracht + Carry", dag: "Vr",
            oefeningen: [
              makeOef("Zercher Good Morning", 4, "5", "zwaar", 2, "2:00", ["RIR2","RIR2","RIR1","RIR4"]),
              makeOef("Farmer's Carry", 5, "50m", `${Math.round(bw*0.9)}kg`, 1, "60s", ["50m","60m","70m","40m"]),
              makeOef("Pull-ups (variatie)", 3, "8", "BW", 1, "90s", ["3×8","3×8","4×6","3×5"]),
              makeOef("Weighted Dips", 3, "8", "+10kg", 2, "90s", ["+10kg","+12kg","+15kg","BW"]),
            ],
            conditioning: [
              makeOef("Sled Pull 10m", 5, "10m", "zwaar", 0, "90s", ["5×","6×","6×","4×"]),
            ],
          },
          condSessions.b2,
        ],
      },
      {
        nummer: 3, naam: "Power, Peak & Retest", weken: "9–12",
        focus: "PAP methode (Duncan French). Explosief werk + sport-specifieke peak. Week 12: GBRS retest.",
        sessies: [
          {
            id: "I", naam: "Power + PAP Lower", dag: "Ma",
            oefeningen: [
              makeOef("Zercher Squat (PAP)", 4, "2", `${Math.round(zer1RM*0.85)}kg`, 3, "3:00", [`${Math.round(zer1RM*0.85)}kg`,`${Math.round(zer1RM*0.88)}kg`,`${Math.round(zer1RM*0.90)}kg`,"taper"]),
              makeOef("CMJ / Broad Jump", 4, "3", "na squat", 0, "3:00", ["4×3","4×3","3×3","RETEST prep"]),
              makeOef("Trap Bar Speed DL", 5, "2", `${Math.round(trap1RM*0.70)}kg`, 4, "2:00", [`${Math.round(trap1RM*0.70)}kg`,`${Math.round(trap1RM*0.72)}kg`,`${Math.round(trap1RM*0.75)}kg`,"taper"]),
              makeOef("Sled Sprint 10m", 6, "10m", "max PR", 0, "2:00", ["6×","8×","8×","4×"]),
            ],
          },
          {
            id: "J", naam: "Power + PAP Upper + Trap/Nek", dag: "Wo",
            oefeningen: [
              makeOef("Flat Bench Press (PAP)", 4, "2", `${Math.round(bench1RM*0.82)}kg`, 3, "3:00", [`${Math.round(bench1RM*0.82)}kg`,`${Math.round(bench1RM*0.85)}kg`,`${Math.round(bench1RM*0.88)}kg`,"taper"]),
              makeOef("Med Ball Chest Pass", 4, "5", "na bench", 0, "3:00", ["4×5","4×5","3×5","taper"]),
              makeOef("Weighted Pull-ups", 5, "2", "+15kg", 3, "2:30", ["+15kg","+17kg","+20kg","BW taper"]),
              makeOef("Explosive DB Row", 4, "5", "explosief", 2, "90s", ["RIR2","RIR2","RIR1","RIR4"]),
              makeOef("Heavy Barbell Shrug", 4, "6", "explosief", 2, "90s", ["110kg","115kg","120kg","90kg"]),
              makeOef("Nek Extensie (harnas)", 4, "8", "zwaar", 1, "60s", ["4×8","4×8","3×6","2×6"]),
            ],
          },
          condSessions.b3,
        ],
      },
    ],
  };
}

// ─── CONDITIONING PER ACHTERGROND ────────────────────────────────────────────
function getConditioningSession(background, equipment, bw, makeOef) {
  const isMMA      = background?.includes("MMA");
  const isMilitary = background?.includes("Militair") || background?.includes("Diender");
  const isBeginner = background?.includes("Beginner");

  if (isMMA) {
    return {
      b1: {
        id: "D", naam: "MMA Conditioning", dag: "Za",
        oefeningen: [
          makeOef("Sled Push (10m)", 6, "10m", "max", 0, "90s", ["6×","8×","10×","5×"]),
          makeOef("Slagzak Combinaties", 5, "30s", "hoge int.", 0, "90s", ["5×30s","6×30s","6×40s","4×30s"]),
          makeOef("Airbike Sprint 10s", 6, "10s", "allout", 0, "50s", ["6","8","10","5"]),
          makeOef("Grappling Circuit BW", 3, "1 ronde", "BW", 1, "60s", ["3 rondes","4 rondes","4 rondes","2 rondes"]),
          makeOef("DB Shrug", 4, "15", "matig", 2, "45s", ["matig","zwaar","zwaar+","deload"]),
          makeOef("Nek Extensie (harnas)", 3, "15", "harnas", 2, "60s", ["3×15","4×12","4×12","2×10"]),
        ],
      },
      b2: {
        id: "H", naam: "MMA Conditioning +", dag: "Za",
        oefeningen: [
          makeOef("Sled Sprint 10m", 8, "10m", "max", 0, "75s", ["8×","10×","10×","6×"]),
          makeOef("Box Jump / Broad Jump", 5, "3", "max", 0, "90s", ["5×3","6×3","6×3","4×2"]),
          makeOef("Slagzak 2min Rounds", 5, "2 min", "match pace", 0, "60s", ["5","6","6","4"]),
          makeOef("Airbike Tabata", 8, "20s", "allout", 0, "10s", ["8×","10×","10×","6×"]),
          makeOef("DB Shrug Superset", 4, "12", "zwaar", 1, "45s", ["matig","zwaar","zwaar+","matig"]),
          makeOef("Nek Extensie (harnas)", 3, "12", "harnas", 1, "45s", ["3×12","4×12","4×12","2×10"]),
        ],
      },
      b3: {
        id: "K", naam: "Power + MMA Peak", dag: "Za",
        oefeningen: [
          makeOef("Broad Jump (PR poging)", 5, "3", "max afstand", 0, "2:00", ["5×3","5×3","4×2","RETEST"]),
          makeOef("5min MMA Rounds", 4, "5 min", "match pace", 0, "60s", ["3 rondes","4 rondes","3 rondes","RETEST prep"]),
          makeOef("Farmer's Carry", 3, "76m", `${bw}kg`, 1, "90s", ["60m","76m","76m","RETEST"]),
          makeOef("800m Tempo Run", 2, "800m", "race pace", 1, "3:00", ["90% pace","race pace","race pace","RETEST"]),
        ],
      },
    };
  }

  if (isMilitary) {
    return {
      b1: {
        id: "D", naam: "Tactische Conditioning", dag: "Za",
        oefeningen: [
          makeOef("Sled Push (10m)", 6, "10m", "max", 0, "90s", ["6×","8×","10×","5×"]),
          makeOef("Farmer's Carry", 4, "40m", `${Math.round(bw*0.7)}kg`, 0, "60s", ["40m","50m","60m","30m"]),
          makeOef("Roeier Intervallen 30s", 5, "30s", "@85%", 0, "90s", ["5","6","8","4"]),
          makeOef("Burpees", 3, "10", "max effort", 0, "60s", ["3×10","4×10","5×10","2×10"]),
          makeOef("DB Shrug", 4, "15", "matig", 2, "45s", ["matig","zwaar","zwaar+","deload"]),
          makeOef("Nek Extensie (harnas)", 3, "15", "harnas", 2, "60s", ["3×15","4×12","4×12","2×10"]),
        ],
      },
      b2: {
        id: "H", naam: "Tactische Conditioning +", dag: "Za",
        oefeningen: [
          makeOef("Sled Sprint 10m", 8, "10m", "max", 0, "75s", ["8×","10×","10×","6×"]),
          makeOef("Farmer's Carry (zwaar)", 5, "50m", `${Math.round(bw*0.9)}kg`, 0, "75s", ["50m","60m","70m","40m"]),
          makeOef("Roeier Sprints 20s", 6, "20s", "allout", 0, "100s", ["6","8","8","5"]),
          makeOef("Box Jump", 5, "3", "max hoogte", 0, "90s", ["5×3","6×3","6×3","4×2"]),
          makeOef("DB Shrug Superset", 4, "12", "zwaar", 1, "45s", ["matig","zwaar","zwaar+","matig"]),
          makeOef("Nek Extensie (harnas)", 3, "12", "harnas", 1, "45s", ["3×12","4×12","4×12","2×10"]),
        ],
      },
      b3: {
        id: "K", naam: "Operationele Peak", dag: "Za",
        oefeningen: [
          makeOef("Broad Jump (PR poging)", 5, "3", "max afstand", 0, "2:00", ["5×3","5×3","4×2","RETEST"]),
          makeOef("Farmer's Carry", 3, "76m", `${bw}kg`, 1, "90s", ["60m","76m","76m","RETEST"]),
          makeOef("Roeier 2000m", 2, "2000m", "race pace", 1, "5:00", ["tempo","race pace","race pace","RETEST"]),
          makeOef("800m Run", 2, "800m", "race pace", 1, "3:00", ["90% pace","race pace","race pace","RETEST"]),
        ],
      },
    };
  }

  if (isBeginner) {
    return {
      b1: {
        id: "D", naam: "Basis Conditioning", dag: "Za",
        oefeningen: [
          makeOef("Roeier Z2", 1, "20 min", "HR 130-150", 1, "—", ["15 min","20 min","25 min","15 min"]),
          makeOef("Airbike Z2", 1, "10 min", "HR 130-145", 1, "—", ["10 min","12 min","15 min","8 min"]),
          makeOef("Farmer's Carry", 3, "30m", `${Math.round(bw*0.5)}kg`, 2, "60s", ["30m","40m","50m","20m"]),
          makeOef("DB Shrug", 3, "15", "licht", 2, "45s", ["licht","matig","matig","licht"]),
          makeOef("Nek Extensie (harnas)", 2, "12", "licht", 3, "60s", ["2×12","3×12","3×12","2×10"]),
        ],
      },
      b2: {
        id: "H", naam: "Conditioning Opbouw", dag: "Za",
        oefeningen: [
          makeOef("Roeier Intervallen 30s", 5, "30s", "@80%", 0, "90s", ["5","6","8","4"]),
          makeOef("Airbike Sprint 15s", 5, "15s", "@85%", 0, "75s", ["5","6","8","4"]),
          makeOef("Farmer's Carry", 4, "40m", `${Math.round(bw*0.6)}kg`, 2, "60s", ["40m","50m","60m","30m"]),
          makeOef("DB Shrug Superset", 3, "12", "matig", 2, "45s", ["matig","matig+","zwaar","matig"]),
          makeOef("Nek Extensie (harnas)", 3, "12", "harnas", 2, "60s", ["3×12","3×12","4×10","2×10"]),
        ],
      },
      b3: {
        id: "K", naam: "Conditioning Peak", dag: "Za",
        oefeningen: [
          makeOef("Broad Jump (meten)", 4, "3", "max afstand", 0, "2:00", ["4×3","5×3","4×2","RETEST"]),
          makeOef("Farmer's Carry", 3, "60m", `${Math.round(bw*0.7)}kg`, 1, "90s", ["50m","60m","70m","RETEST"]),
          makeOef("800m Run", 2, "800m", "eigen tempo", 1, "3:00", ["comfortabel","matig","iets sneller","RETEST"]),
        ],
      },
    };
  }

  // Algemene sporter
  return {
    b1: {
      id: "D", naam: "Metabole Conditioning", dag: "Za",
      oefeningen: [
        makeOef("Airbike Intervallen 20s", 6, "20s", "allout", 0, "80s", ["6","8","10","5"]),
        makeOef("Roeier 30s @85%", 5, "30s", "@85%", 0, "90s", ["5","6","8","4"]),
        makeOef("Farmer's Carry", 4, "40m", `${Math.round(bw*0.7)}kg`, 1, "60s", ["40m","50m","60m","30m"]),
        makeOef("Burpee Box Jump", 3, "8", "explosief", 0, "60s", ["3×8","4×8","5×8","2×8"]),
        makeOef("DB Shrug", 4, "15", "matig", 2, "45s", ["matig","zwaar","zwaar+","deload"]),
        makeOef("Nek Extensie (harnas)", 3, "15", "harnas", 2, "60s", ["3×15","4×12","4×12","2×10"]),
      ],
    },
    b2: {
      id: "H", naam: "Metabole Conditioning +", dag: "Za",
      oefeningen: [
        makeOef("Airbike Tabata", 8, "20s", "allout", 0, "10s", ["8×","10×","10×","6×"]),
        makeOef("Roeier Sprint 500m", 3, "500m", "race pace", 0, "3:00", ["3×","4×","4×","2×"]),
        makeOef("Box Jump", 5, "3", "max hoogte", 0, "90s", ["5×3","6×3","6×3","4×2"]),
        makeOef("Farmer's Carry (zwaar)", 5, "50m", `${Math.round(bw*0.85)}kg`, 1, "60s", ["50m","60m","70m","40m"]),
        makeOef("DB Shrug Superset", 4, "12", "zwaar", 1, "45s", ["matig","zwaar","zwaar+","matig"]),
        makeOef("Nek Extensie (harnas)", 3, "12", "harnas", 1, "45s", ["3×12","4×12","4×12","2×10"]),
      ],
    },
    b3: {
      id: "K", naam: "Performance Peak", dag: "Za",
      oefeningen: [
        makeOef("Broad Jump (PR poging)", 5, "3", "max afstand", 0, "2:00", ["5×3","5×3","4×2","RETEST"]),
        makeOef("Farmer's Carry", 3, "76m", `${bw}kg`, 1, "90s", ["60m","76m","76m","RETEST"]),
        makeOef("800m Run", 2, "800m", "race pace", 1, "3:00", ["90% pace","race pace","race pace","RETEST"]),
        makeOef("Airbike 4min allout", 1, "4 min", "max output", 0, "5:00", ["3 min","4 min","4 min","RETEST"]),
      ],
    },
  };
}
function RadarChart({ baseline, bw }) {
  const SIZE = 280, CX = 140, CY = 140, R = 105;
  const n = STANDARDS.length;
  const angle = i => (i / n) * 2 * Math.PI - Math.PI / 2;
  const pt = (i, ratio) => ({ x: CX + R * ratio * Math.cos(angle(i)), y: CY + R * ratio * Math.sin(angle(i)) });

  const score = (key, val) => {
    if (val == null || val === 0) return 0.05;
    const norm = getNorm(key, bw);
    const std  = STANDARDS.find(a => a.key === key);
    if (!std || !norm) return 0.05;
    const r = std.higher ? val / norm : norm / val;
    return Math.min(Math.max(r, 0.05), 1.15);
  };

  const scores = STANDARDS.map(a => score(a.key, parseFloat(baseline[a.key]) || 0));
  const poly   = scores.map((s, i) => { const p = pt(i, Math.min(s, 1)); return `${p.x},${p.y}`; }).join(" ");

  const tierColors = ["#1E2510", "#253015", "#2D4A1E"];
  const tierStrokes = [C.muted, C.accent, C.accentLt];

  return (
    <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ display: "block", maxWidth: 300, margin: "0 auto" }}>
      {[0.33, 0.67, 1.0].map((ratio, ti) => (
        <polygon key={ti}
          points={Array.from({ length: n }, (_, i) => { const p = pt(i, ratio); return `${p.x},${p.y}`; }).join(" ")}
          fill={ti === 2 ? tierColors[2] + "44" : "none"}
          stroke={tierStrokes[ti]}
          strokeWidth={ti === 2 ? 1.5 : 0.7}
          strokeDasharray={ti < 2 ? "4,3" : "none"}
        />
      ))}
      {STANDARDS.map((_, i) => {
        const p = pt(i, 1);
        return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke={C.muted} strokeWidth={0.6} />;
      })}
      <polygon points={poly} fill={C.accentLt + "30"} stroke={C.accentLt} strokeWidth={2.5} strokeLinejoin="round" />
      {STANDARDS.map((ax, i) => {
        const p  = pt(i, 1.24);
        const sc = scores[i];
        const col = sc >= 1 ? C.accentLt : sc >= 0.8 ? C.gold : C.red;
        const anchor = p.x < CX - 8 ? "end" : p.x > CX + 8 ? "start" : "middle";
        const short = ax.label.replace("Bench AMRAP", "Bench").replace("Trap Bar 5RM", "Trap Bar").replace("Farmer's Carry", "F.Carry");
        return (
          <text key={i} x={p.x} y={p.y} fontSize="7.5" fill={col} fontFamily="'Share Tech Mono',monospace"
            textAnchor={anchor} dominantBaseline="middle" fontWeight="700">
            {short}
          </text>
        );
      })}
      {[0.33, 0.67, 1.0].map((ratio, ti) => {
        const p = pt(2, ratio);
        const labels = ["STANDARD", "ELITE", "BE A PRO"];
        return (
          <text key={ti} x={p.x + 5} y={p.y - 3} fontSize="5.5" fill={tierStrokes[ti]}
            fontFamily="'Share Tech Mono',monospace" opacity={0.9}>{labels[ti]}</text>
        );
      })}
      <circle cx={CX} cy={CY} r={4} fill={C.accentLt} />
    </svg>
  );
}

// ─── SPINNER ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 52, height: 52, border: `3px solid ${C.muted}`, borderTop: `3px solid ${C.accentLt}`, borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
    </>
  );
}

function Dots() {
  const [d, setD] = useState(0);
  useEffect(() => { const t = setInterval(() => setD(x => (x + 1) % 4), 380); return () => clearInterval(t); }, []);
  return <span>{"...".slice(0, d)}</span>;
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const F = { oswald: "'Oswald',sans-serif", mono: "'Share Tech Mono',monospace" };

function SectionHead({ title, sub, color }) {
  return (
    <div style={{ background: C.surface, borderRadius: 5, padding: "8px 12px", marginBottom: 10, borderLeft: `2px solid ${color || C.accentLt}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: color || C.accentLt, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: F.mono }}>{title}</div>
      {sub && <div style={{ fontSize: 8, color: C.muted, marginTop: 2, fontFamily: F.mono }}>{sub}</div>}
    </div>
  );
}

function GBRSBadge({ pct }) {
  const col = getStatusColor(pct);
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color: col, fontFamily: F.mono, background: col + "18", padding: "1px 6px", borderRadius: 3 }}>
      {Math.round(pct)}%
    </span>
  );
}

// ─── EXERCISE LOGGER ─────────────────────────────────────────────────────────
function ExerciseLogger({ logKey, oe, prog, sets, prevSets, suggestion, onSave }) {
  const [open, setOpen] = useState(false);
  const [kg, setKg] = useState("");
  const [reps, setReps] = useState("");
  const [rir, setRir] = useState("");
  const hasSets = sets.length > 0;

  const addSet = () => {
    if (!kg && !reps) return;
    onSave([...sets, { kg, reps, rir, id: Date.now() }]);
    setKg(""); setReps(""); setRir("");
  };

  const prevBest = prevSets.length > 0
    ? prevSets.reduce((a, b) => (parseFloat(b.kg) || 0) > (parseFloat(a.kg) || 0) ? b : a, prevSets[0])
    : null;

  const inp = {
    width: "100%", background: "#080A04", border: `1px solid #222A10`,
    borderRadius: 4, color: "#E8E0CC", padding: "7px 8px",
    fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "'Share Tech Mono',monospace",
  };

  return (
    <div style={{
      background: hasSets ? "#2D4A1E44" : "#1E2510",
      border: `1px solid ${hasSets ? "#6AAF3D44" : "#222A10"}`,
      borderRadius: 7, marginBottom: 7, overflow: "hidden",
    }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "11px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: hasSets ? "#6AAF3D" : "#F0EDE4", letterSpacing: "0.02em" }}>{oe.naam}</div>
          <div style={{ fontSize: 10, color: "#6AAF3D", fontFamily: "'Share Tech Mono',monospace", marginTop: 3 }}>
            {oe.sets}×{oe.reps} · {prog} · RIR {oe.rir}
          </div>
          {oe.rest && <div style={{ fontSize: 9, color: "#3E3E2E", fontFamily: "'Share Tech Mono',monospace", marginTop: 1 }}>Rust: {oe.rest}</div>}
          {prevBest && (
            <div style={{ fontSize: 9, color: "#3E3E2E", fontFamily: "'Share Tech Mono',monospace", marginTop: 2 }}>
              ← vorige: {prevBest.kg ? prevBest.kg + "kg" : "—"} × {prevBest.reps} reps
            </div>
          )}
          {suggestion && (
            <div style={{ marginTop: 5, padding: "3px 7px", background: suggestion.col + "18", border: `1px solid ${suggestion.col}33`, borderRadius: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: suggestion.col, fontFamily: "'Share Tech Mono',monospace" }}>{suggestion.msg}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0, marginLeft: 8 }}>
          {hasSets && <span style={{ fontSize: 10, color: "#6AAF3D", fontWeight: 700 }}>{sets.length}×✓</span>}
          <span style={{ color: "#3E3E2E", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid #222A10", padding: "10px 12px" }}>
          {sets.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 8, color: "#3E3E2E", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Share Tech Mono',monospace", marginBottom: 6 }}>// GELOGDE SETS</div>
              {sets.map((s, i) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "#2D4A1E44", border: "1px solid #6AAF3D33", borderRadius: 4, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: "#6AAF3D", fontWeight: 600, fontFamily: "'Share Tech Mono',monospace" }}>
                    Set {i + 1} — {s.kg ? s.kg + "kg" : "—"} × {s.reps ? s.reps + " reps" : "—"}{s.rir ? ` · RIR ${s.rir}` : ""}
                  </span>
                  <button onClick={() => onSave(sets.filter(x => x.id !== s.id))}
                    style={{ background: "none", border: "none", color: "#B82222", fontSize: 16, cursor: "pointer", padding: "0 4px" }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 8, color: "#3E3E2E", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Share Tech Mono',monospace", marginBottom: 6 }}>// SET {sets.length + 1}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[["KG", kg, setKg, "0"], ["REPS", reps, setReps, "0"], ["RIR", rir, setRir, "2"]].map(([l, v, s, p]) => (
              <div key={l}>
                <div style={{ fontSize: 8, color: "#3E3E2E", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Share Tech Mono',monospace" }}>{l}</div>
                <input type="number" value={v} onChange={e => s(e.target.value)} placeholder={p}
                  onKeyDown={e => e.key === "Enter" && addSet()} style={inp} />
              </div>
            ))}
          </div>
          <button onClick={addSet} style={{
            width: "100%", background: "#4A7C2F", border: "none", borderRadius: 4,
            color: "#F0EDE4", padding: "9px", fontSize: 11, fontWeight: 800,
            cursor: "pointer", letterSpacing: "0.1em", fontFamily: "'Oswald',sans-serif",
          }}>+ SET TOEVOEGEN</button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,   setScreen]   = useState("splash");
  const [step,     setStep]     = useState(0);
  const [profile,  setProfile]  = useState({});
  const [baseline, setBaseline] = useState({});
  const [schema,   setSchema]   = useState(null);
  const [logs,     setLogs]     = useState({});
  const [activeW,  setActiveW]  = useState(0);
  const [activeSess, setActiveSess] = useState(null);
  const [toast,    setToast]    = useState(null);
  const [plankM,   setPlankM]   = useState("");
  const [plankS,   setPlankS]   = useState("");
  const [runM,     setRunM]     = useState("");
  const [runS,     setRunS]     = useState("");
  const [tab,      setTab]      = useState("overzicht");
  const [confirmReset, setConfirmReset] = useState(false);

  // Load persisted data
  useEffect(() => {
    const d = loadStore();
    if (d.profile)  setProfile(d.profile);
    if (d.baseline) setBaseline(d.baseline);
    if (d.schema)   setSchema(d.schema);
    if (d.logs)     setLogs(d.logs);
    if (d.profile?.name && d.schema)   setScreen("app");
    else if (d.profile?.name)          setScreen("baseline");
  }, []);

  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    saveStore({ profile, baseline, schema, logs });
  }, [profile, baseline, schema, logs]);

  const showToast = m => { setToast(m); setTimeout(() => setToast(null), 2000); };
  const bw = parseFloat(profile.weight) || 75;

  // ── ONBOARDING CONFIG ──────────────────────────────────────────────────────
  const STEPS = [
    { title: "WAT IS JE NAAM?",             field: "name",       type: "text",   ph: "Voornaam" },
    { title: "HOE OUD BEN JE?",             field: "age",        type: "number", ph: "Leeftijd" },
    { title: "WAT IS JE GEWICHT?",          field: "weight",     type: "number", ph: "kg" },
    { title: "WAT IS JE LENGTE?",           field: "height",     type: "number", ph: "cm" },
    { title: "WAT IS JE ACHTERGROND?",      field: "background", type: "select",
      opts: ["Militair / Diender", "MMA / Vechtsporter", "Algemene sporter", "Beginner"] },
    { title: "HOEVEEL DAGEN PER WEEK?",     field: "days",       type: "select",
      opts: ["3 dagen", "4 dagen", "5 dagen", "6 dagen"] },
    { title: "WELKE EQUIPMENT HEB JE?",     field: "equipment",  type: "select",
      opts: [
        "Volledig (barbell, trap bar, sled, sandbag, DBs)",
        "Basis gym (barbell, rack, DBs, pull-up bar)",
        "Militaire faciliteit (sled, sandbag, buiten)",
        "Thuis training (DBs, KB, pull-up bar)",
      ] },
  ];

  // ── GENERATE ──────────────────────────────────────────────────────────────
  async function generate() {
    setScreen("generating");
    await new Promise(r => setTimeout(r, 2200));
    const built = buildSchema(profile, baseline);
    setSchema(built);
    setScreen("app");
    setTab("overzicht");
  }

  // ── SHARED STYLES ─────────────────────────────────────────────────────────
  const inp = {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.text, padding: "13px 14px", fontSize: 16, width: "100%",
    boxSizing: "border-box", outline: "none", fontFamily: F.mono,
    transition: "border-color 0.2s",
  };
  const primaryBtn = {
    width: "100%", background: C.accent, border: "none", borderRadius: 6,
    color: C.white, padding: "15px", fontSize: 14, fontWeight: 700,
    cursor: "pointer", letterSpacing: "0.12em", fontFamily: F.oswald,
    textTransform: "uppercase", marginTop: 12,
  };
  const ghostBtn = {
    ...primaryBtn, background: "transparent",
    border: `1px solid ${C.muted}`, color: C.muted, marginTop: 8,
  };
  const lbl = {
    fontSize: 9, color: C.muted, textTransform: "uppercase",
    letterSpacing: "0.14em", fontFamily: F.mono, display: "block", marginBottom: 6,
  };

  // ════════════════════════════════════════════════════════════════════════
  // SPLASH
  // ════════════════════════════════════════════════════════════════════════
  if (screen === "splash") return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px 28px", fontFamily: F.oswald }}>
      <div style={{ fontSize: 11, color: C.accentLt, letterSpacing: "0.25em", fontFamily: F.mono, marginBottom: 12 }}>GBRS GROUP · EST. 2013</div>
      <div style={{ fontSize: 52, fontWeight: 700, color: C.white, letterSpacing: "0.06em", textAlign: "center", lineHeight: 1.0, marginBottom: 4 }}>
        BE A<br /><span style={{ color: C.accentLt }}>PRO</span>
      </div>
      <div style={{ width: 48, height: 2, background: C.accentLt, borderRadius: 1, margin: "16px auto" }} />
      <div style={{ fontSize: 11, color: C.sub, letterSpacing: "0.18em", textAlign: "center", lineHeight: 1.7, fontFamily: F.mono }}>
        PERSONALIZED 12-WEEK<br />PERFORMANCE PROGRAM
      </div>
      <div style={{ marginTop: 52, width: "100%", maxWidth: 340 }}>
        <button onClick={() => setScreen("onboarding")} style={{ ...primaryBtn, fontSize: 18, padding: "20px", marginTop: 0 }}>
          START ASSESSMENT →
        </button>
        <div style={{ marginTop: 20, fontSize: 9, color: C.muted, textAlign: "center", fontFamily: F.mono, lineHeight: 1.8 }}>
          Voor militairen · MMA practitioners · Serious athletes<br />
          Gebaseerd op GBRS "Be a Pro" performance standards
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // ONBOARDING
  // ════════════════════════════════════════════════════════════════════════
  if (screen === "onboarding") {
    const cur = STEPS[step];
    const pct = (step / STEPS.length) * 100;
    const next = () => { if (step < STEPS.length - 1) setStep(s => s + 1); else setScreen("baseline"); };

    return (
      <div style={{ background: C.bg, minHeight: "100vh", padding: "28px 22px", fontFamily: F.oswald }}>
        {/* Progress */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 9, color: C.muted, fontFamily: F.mono, letterSpacing: "0.1em" }}>STAP {step + 1} / {STEPS.length}</span>
            <span style={{ fontSize: 9, color: C.accentLt, fontFamily: F.mono, letterSpacing: "0.1em" }}>{Math.round(pct)}%</span>
          </div>
          <div style={{ height: 2, background: C.surface, borderRadius: 1 }}>
            <div style={{ height: 2, width: `${pct}%`, background: C.accentLt, borderRadius: 1, transition: "width 0.35s" }} />
          </div>
        </div>

        <div style={{ fontSize: 26, fontWeight: 700, color: C.white, letterSpacing: "0.05em", marginBottom: 28, lineHeight: 1.2 }}>
          {cur.title}
        </div>

        {cur.type === "select" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cur.opts.map(opt => (
              <button key={opt} onClick={() => { setProfile(p => ({ ...p, [cur.field]: opt })); next(); }}
                style={{
                  background: profile[cur.field] === opt ? C.accent + "33" : C.card,
                  border: `1px solid ${profile[cur.field] === opt ? C.accentLt : C.border}`,
                  borderRadius: 8, padding: "15px 16px",
                  color: profile[cur.field] === opt ? C.accentLt : C.text,
                  fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left",
                  fontFamily: F.oswald, letterSpacing: "0.04em", transition: "all 0.15s",
                }}>
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <>
            <input
              type={cur.type} placeholder={cur.ph}
              value={profile[cur.field] || ""}
              onChange={e => setProfile(p => ({ ...p, [cur.field]: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && profile[cur.field] && next()}
              style={{ ...inp, fontSize: 20, padding: "16px" }} autoFocus
            />
            <button onClick={() => profile[cur.field] && next()} style={primaryBtn}>VOLGENDE →</button>
          </>
        )}

        {step > 0 && <button onClick={() => setStep(s => s - 1)} style={ghostBtn}>← TERUG</button>}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // BASELINE
  // ════════════════════════════════════════════════════════════════════════
  if (screen === "baseline") {
    const trapNorm = Math.round(bw * 2);
    const tests = [
      {
        key: "broadJump", nr: 1, naam: "Broad Jump", norm: "≥ 2.36m",
        info: "3 pogingen, beste telt · Schoen aan, statisch, 2 voeten",
        render: () => (
          <><label style={lbl}>AFSTAND (m)</label>
          <input type="number" step="0.01" placeholder="bijv. 2.20" value={baseline.broadJump || ""}
            onChange={e => setBaseline(b => ({ ...b, broadJump: e.target.value }))} style={inp} /></>
        )
      },
      {
        key: "benchAmrap", nr: 2, naam: `Bench AMRAP @ ${bw}kg`, norm: "> 20 reps",
        info: "Standaard tempo · Stop bij technisch breakdown",
        render: () => (
          <><label style={lbl}>REPS</label>
          <input type="number" placeholder="bijv. 12" value={baseline.benchAmrap || ""}
            onChange={e => setBaseline(b => ({ ...b, benchAmrap: e.target.value }))} style={inp} /></>
        )
      },
      {
        key: "pullups", nr: 3, naam: "Pull-ups (strict)", norm: "> 20 reps",
        info: "Dead hang start · Chin boven bar · Geen kipping",
        render: () => (
          <><label style={lbl}>REPS</label>
          <input type="number" placeholder="bijv. 15" value={baseline.pullups || ""}
            onChange={e => setBaseline(b => ({ ...b, pullups: e.target.value }))} style={inp} /></>
        )
      },
      {
        key: "trapBar5rm", nr: 4, naam: "Trap Bar DL 5RM", norm: `${trapNorm}kg (2× BW)`,
        info: `Opwarmen: 60%→75%→85%→5RM poging · Volle ROM`,
        render: () => (
          <><label style={lbl}>GEWICHT (kg)</label>
          <input type="number" placeholder={String(Math.round(bw * 1.6))} value={baseline.trapBar5rm || ""}
            onChange={e => setBaseline(b => ({ ...b, trapBar5rm: e.target.value }))} style={inp} /></>
        )
      },
      {
        key: "plank", nr: 5, naam: "Plank", norm: "≥ 3:00",
        info: "Ellebogen · Neutraal lichaam · Stop bij compensatie",
        render: () => (
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label style={lbl}>MIN</label>
              <input type="number" placeholder="3" value={plankM}
                onChange={e => { setPlankM(e.target.value); setBaseline(b => ({ ...b, plank: String((parseInt(e.target.value || 0) * 60) + parseInt(plankS || 0)) })); }} style={inp} /></div>
            <div style={{ flex: 1 }}><label style={lbl}>SEC</label>
              <input type="number" placeholder="05" value={plankS}
                onChange={e => { setPlankS(e.target.value); setBaseline(b => ({ ...b, plank: String((parseInt(plankM || 0) * 60) + parseInt(e.target.value || 0)) })); }} style={inp} /></div>
          </div>
        )
      },
      {
        key: "farmerCarry", nr: 6, naam: `Farmer's Carry @ ${bw}kg`, norm: "> 76m",
        info: `2× ${bw / 2}kg DBs · Ononderbroken · Meet afstand`,
        render: () => (
          <><label style={lbl}>AFSTAND (m)</label>
          <input type="number" placeholder="bijv. 60" value={baseline.farmerCarry || ""}
            onChange={e => setBaseline(b => ({ ...b, farmerCarry: e.target.value }))} style={inp} /></>
        )
      },
      {
        key: "run800", nr: 7, naam: "800m Run", norm: "< 2:45",
        info: "Baan · Paced start · Tijd stoppen bij finish",
        render: () => (
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><label style={lbl}>MIN</label>
              <input type="number" placeholder="2" value={runM}
                onChange={e => { setRunM(e.target.value); setBaseline(b => ({ ...b, run800: String((parseInt(e.target.value || 0) * 60) + parseInt(runS || 0)) })); }} style={inp} /></div>
            <div style={{ flex: 1 }}><label style={lbl}>SEC</label>
              <input type="number" placeholder="45" value={runS}
                onChange={e => { setRunS(e.target.value); setBaseline(b => ({ ...b, run800: String((parseInt(runM || 0) * 60) + parseInt(e.target.value || 0)) })); }} style={inp} /></div>
          </div>
        )
      },
    ];

    const filled = tests.filter(t => baseline[t.key] && baseline[t.key] !== "0").length;

    return (
      <div style={{ background: C.bg, minHeight: "100vh", padding: "20px 20px 60px", fontFamily: F.oswald }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: C.accentLt, letterSpacing: "0.18em", fontFamily: F.mono, marginBottom: 6 }}>STAP 2 VAN 2 · BASELINE TEST</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.white, letterSpacing: "0.05em" }}>7 GBRS TESTS</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: C.muted, fontFamily: F.mono }}>{filled}/7 ingevuld</span>
            <span style={{ fontSize: 9, color: C.accentLt, fontFamily: F.mono }}>{Math.round((filled / 7) * 100)}%</span>
          </div>
          <div style={{ height: 2, background: C.surface, borderRadius: 1 }}>
            <div style={{ height: 2, width: `${(filled / 7) * 100}%`, background: C.accentLt, borderRadius: 1, transition: "width 0.3s" }} />
          </div>
        </div>

        {tests.map(t => (
          <div key={t.key} style={{
            background: baseline[t.key] ? C.accentDk + "44" : C.card,
            border: `1px solid ${baseline[t.key] ? C.accentLt + "44" : C.border}`,
            borderRadius: 10, padding: "16px", marginBottom: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{t.nr}. {t.naam}</div>
                <div style={{ fontSize: 9, color: C.accentLt, fontFamily: F.mono, marginTop: 2 }}>Norm: {t.norm}</div>
              </div>
              {baseline[t.key] && <div style={{ fontSize: 18, color: C.accentLt }}>✓</div>}
            </div>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: F.mono, marginBottom: 10, lineHeight: 1.5 }}>{t.info}</div>
            {t.render()}
          </div>
        ))}

        <button onClick={generate} style={{ ...primaryBtn, fontSize: 16, padding: "18px", marginTop: 16 }}>
          GENEREER MIJN 12-WEEK SCHEMA →
        </button>
        <button onClick={() => setScreen("onboarding")} style={ghostBtn}>← TERUG</button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // GENERATING
  // ════════════════════════════════════════════════════════════════════════
  if (screen === "generating") return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px 28px", gap: 0 }}>
      <div style={{ fontSize: 10, color: C.accentLt, letterSpacing: "0.22em", fontFamily: F.mono, marginBottom: 24 }}>GBRS GROUP</div>
      <Spinner />
      <div style={{ marginTop: 32, fontSize: 18, fontWeight: 700, color: C.white, fontFamily: F.oswald, letterSpacing: "0.1em", textAlign: "center" }}>
        SCHEMA GENEREREN<Dots />
      </div>
      <div style={{ marginTop: 12, fontSize: 10, color: C.muted, fontFamily: F.mono, textAlign: "center", maxWidth: 260, lineHeight: 1.7 }}>
        Analyseren baseline scores<br />
        Berekenen gepersonaliseerde loads<br />
        Opbouwen 12-week periodisering
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // MAIN APP
  // ════════════════════════════════════════════════════════════════════════
  if (screen === "app" && schema) {
    const blok = schema.blokken?.[Math.floor(activeW / 4)] || schema.blokken?.[0];
    const weekInBlok = activeW % 4;

    // Tab navigation
    const TABS = [["overzicht", "OVERZICHT"], ["training", "TRAINING"], ["gaps", "GAPS"]];

    return (
      <div style={{ background: C.bg, minHeight: "100vh", fontFamily: F.oswald, color: C.text, maxWidth: 480, margin: "0 auto" }}>
        {toast && (
          <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: C.accent, color: C.white, borderRadius: 5, padding: "9px 22px", fontSize: 11, fontWeight: 700, zIndex: 999, fontFamily: F.mono, whiteSpace: "nowrap", boxShadow: "0 4px 20px #0008" }}>
            {toast}
          </div>
        )}

        {/* CONFIRM RESET MODAL */}
        {confirmReset && (
          <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: C.mid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, maxWidth: 320, width: "100%" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.white, fontFamily: F.oswald, letterSpacing: "0.06em", marginBottom: 10 }}>OPNIEUW BEGINNEN?</div>
              <div style={{ fontSize: 12, color: C.sub, fontFamily: F.mono, lineHeight: 1.6, marginBottom: 24 }}>
                Al je data wordt gewist — profiel, baseline scores en trainingslog. Dit kan niet ongedaan worden gemaakt.
              </div>
              <button onClick={() => {
                localStorage.removeItem(SK);
                setProfile({}); setBaseline({}); setSchema(null); setLogs({});
                setConfirmReset(false); setScreen("splash"); setStep(0);
              }} style={{ ...primaryBtn, background: C.red, marginTop: 0, marginBottom: 10, border: "none" }}>
                JA, ALLES WISSEN
              </button>
              <button onClick={() => setConfirmReset(false)} style={{ ...ghostBtn, marginTop: 0 }}>
                ANNULEREN
              </button>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div style={{ background: C.mid, borderBottom: `1px solid ${C.border}`, padding: "16px 20px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, color: C.accentLt, letterSpacing: "0.2em", fontFamily: F.mono, marginBottom: 3 }}>BE A PRO</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.06em", color: C.white }}>{profile.name?.toUpperCase()}</div>
              <div style={{ fontSize: 9, color: C.sub, letterSpacing: "0.1em", fontFamily: F.mono, marginTop: 2 }}>
                {profile.background} · {profile.weight}kg · {profile.days}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: C.muted, fontFamily: F.mono }}>WEEK</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.accentLt, lineHeight: 1 }}>{activeW + 1}</div>
              <div style={{ fontSize: 8, color: C.muted, fontFamily: F.mono }}>VAN 12</div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", background: C.mid, borderBottom: `1px solid ${C.border}` }}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, background: "transparent", border: "none",
              color: tab === k ? C.accentLt : C.muted,
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              padding: "13px 4px 11px",
              borderBottom: tab === k ? `2px solid ${C.accentLt}` : "2px solid transparent",
              letterSpacing: "0.1em", fontFamily: F.oswald,
            }}>{l}</button>
          ))}
        </div>

        <div style={{ padding: "14px 18px 80px" }}>

          {/* ── OVERZICHT ───────────────────────────────────────────── */}
          {tab === "overzicht" && (
            <div>
              {/* Radar */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 8px", marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: C.accentLt, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: F.mono, textAlign: "center", marginBottom: 12 }}>
                  // PERFORMANCE RADAR
                </div>
                <RadarChart baseline={baseline} bw={bw} />
                <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 10 }}>
                  {[["JOUW SCORES", C.accentLt], ["BE A PRO NORM", C.muted]].map(([l, col]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 14, height: 2, background: col, borderRadius: 1 }} />
                      <span style={{ fontSize: 8, color: C.sub, fontFamily: F.mono }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analyse */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.accentLt}`, borderRadius: 8, padding: "14px", marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: C.accentLt, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: F.mono, marginBottom: 8 }}>// ANALYSE</div>
                <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.7, fontFamily: F.mono }}>{schema.analyse}</div>
              </div>

              {/* Prioriteiten */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px", marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: C.accentLt, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: F.mono, marginBottom: 10 }}>// TOP PRIORITEITEN</div>
                {schema.prioriteiten?.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 10, color: C.accentLt, fontWeight: 700, fontFamily: F.mono, minWidth: 18 }}>{i + 1}.</span>
                    <span style={{ fontSize: 12, color: C.text, fontFamily: F.mono, lineHeight: 1.5 }}>{p}</span>
                  </div>
                ))}
              </div>

              {/* Blokken */}
              <div style={{ fontSize: 9, color: C.accentLt, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: F.mono, marginBottom: 10 }}>// 12-WEEK SCHEMA</div>
              {schema.blokken?.map((blok, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `2px solid ${C.accentLt}`, borderRadius: 8, padding: "14px", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.white, letterSpacing: "0.04em" }}>BLOK {blok.nummer}: {blok.naam?.toUpperCase()}</div>
                  <div style={{ fontSize: 9, color: C.accentLt, fontFamily: F.mono, marginTop: 2, marginBottom: 8 }}>WEEK {blok.weken}</div>
                  <div style={{ fontSize: 11, color: C.sub, fontFamily: F.mono, lineHeight: 1.6, marginBottom: 10 }}>{blok.focus}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {blok.sessies?.map((s, j) => (
                      <div key={j} style={{ background: C.surface, borderRadius: 4, padding: "5px 10px", fontSize: 9, color: C.text, fontFamily: F.mono }}>
                        {s.dag} — {s.naam}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <button onClick={() => { setTab("training"); }} style={{ ...primaryBtn, marginTop: 16, fontSize: 15 }}>
                START TRAINING →
              </button>
              <button onClick={() => setConfirmReset(true)} style={{ ...ghostBtn, fontSize: 10, color: C.muted }}>OPNIEUW BEGINNEN</button>
            </div>
          )}

          {/* ── TRAINING ────────────────────────────────────────────── */}
          {tab === "training" && (
            <div>
              {/* Week scroller */}
              <div style={{ overflowX: "auto", display: "flex", gap: 5, marginBottom: 14, paddingBottom: 4 }}>
                {Array.from({ length: 12 }, (_, i) => {
                  const blokNr = Math.floor(i / 4) + 1;
                  const isDeload = i % 4 === 3;
                  return (
                    <button key={i} onClick={() => { setActiveW(i); setActiveSess(null); }} style={{
                      flexShrink: 0, background: activeW === i ? C.accent + "33" : "transparent",
                      border: `1px solid ${activeW === i ? C.accentLt : C.border}`,
                      borderRadius: 5, padding: "6px 9px", cursor: "pointer",
                      color: activeW === i ? C.accentLt : C.muted,
                      fontSize: 9, fontFamily: F.mono, fontWeight: 700,
                    }}>
                      W{i + 1}{isDeload ? "↓" : ""}
                    </button>
                  );
                })}
              </div>

              {/* Blok info */}
              <div style={{ background: C.surface, borderRadius: 5, padding: "8px 12px", marginBottom: 14, borderLeft: `2px solid ${C.accentLt}` }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.accentLt, letterSpacing: "0.12em", fontFamily: F.mono }}>
                  // BLOK {blok?.nummer} · WEEK {activeW + 1}{weekInBlok === 3 ? " — DELOAD" : ""}
                </div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 2, fontFamily: F.mono }}>{blok?.naam}</div>
              </div>

              {blok?.sessies?.map((sess, si) => {
                const sessKey = `b${Math.floor(activeW / 4)}_w${weekInBlok}_s${si}`;
                const sessLogs = logs[sessKey] || {};
                const allEx = [...(sess.oefeningen || []), ...(sess.conditioning || [])];
                const doneCount = (sess.oefeningen || []).filter((_, oi) =>
                  (logs[`${sessKey}_o${oi}`] || []).length > 0
                ).length + (sess.conditioning || []).filter((_, ci) =>
                  logs[`${sessKey}_c${ci}_done`]
                ).length;
                const isOpen = activeSess === `${activeW}_${si}`;
                const complete = doneCount === allEx.length && allEx.length > 0;

                return (
                  <div key={si} style={{ background: C.card, border: `1px solid ${complete ? C.accentLt + "44" : C.border}`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                    <div onClick={() => setActiveSess(isOpen ? null : `${activeW}_${si}`)}
                      style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: complete ? C.accentLt : C.white }}>{sess.dag} — {sess.naam?.toUpperCase()}</div>
                        <div style={{ fontSize: 9, color: C.muted, fontFamily: F.mono, marginTop: 3 }}>{doneCount}/{allEx.length} oefeningen</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 40, height: 3, background: C.surface, borderRadius: 1 }}>
                          <div style={{ width: allEx.length > 0 ? `${(doneCount / allEx.length) * 100}%` : "0%", height: 3, background: complete ? C.accentLt : C.accent, borderRadius: 1 }} />
                        </div>
                        {complete && <span style={{ color: C.accentLt, fontSize: 14 }}>✓</span>}
                        <span style={{ color: C.muted, fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 16px" }}>
                        {/* Main exercises */}
                        {sess.oefeningen?.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: F.mono, marginBottom: 8 }}>// HOOFDWERK</div>
                            {sess.oefeningen.map((oe, oi) => {
                              const oKey = `${sessKey}_o${oi}`;
                              const oeSets = logs[oKey] || [];
                              const prog = oe.progressie?.[weekInBlok] || oe.load;
                              const prevKey = `b${Math.floor(activeW/4)}_w${weekInBlok > 0 ? weekInBlok-1 : weekInBlok}_s${si}_o${oi}`;
                              const prevSets = logs[prevKey] || [];
                              const hasSets = oeSets.length > 0;

                              // 2-for-2 suggestie
                              let suggestion = null;
                              if (hasSets) {
                                const last = oeSets[oeSets.length - 1];
                                const targetReps = parseInt(oe.reps) || 0;
                                const lastReps = parseInt(last.reps) || 0;
                                const lastKg = parseFloat(last.kg) || 0;
                                const isLower = oe.naam?.toLowerCase().includes("squat") || oe.naam?.toLowerCase().includes("deadlift") || oe.naam?.toLowerCase().includes("carry");
                                const inc = isLower ? 5 : 2.5;
                                if (targetReps > 0 && lastReps >= targetReps + 2) {
                                  suggestion = { msg: `↑ Volgende sessie: ${lastKg + inc}kg`, col: C.accentLt };
                                } else if (targetReps > 0 && lastReps >= targetReps) {
                                  suggestion = { msg: `→ Zelfde gewicht aanhouden (${lastKg}kg)`, col: C.gold };
                                } else if (lastReps > 0) {
                                  suggestion = { msg: `↓ Gewicht vasthouden of -${inc}kg`, col: C.red };
                                }
                              }

                              return (
                                <ExerciseLogger key={oKey} logKey={oKey} oe={oe} prog={prog}
                                  sets={oeSets} prevSets={prevSets} suggestion={suggestion}
                                  onSave={(updatedSets) => {
                                    setLogs(prev => ({ ...prev, [oKey]: updatedSets }));
                                    showToast("Set opgeslagen ✓");
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Conditioning */}
                        {sess.conditioning?.length > 0 && (
                          <div>
                            <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: F.mono, marginBottom: 8 }}>// CONDITIONING</div>
                            {sess.conditioning.map((oe, oi) => {
                              const oKey = `${sessKey}_c${oi}`;
                              const done = logs[oKey + "_done"];
                              const prog = oe.progressie?.[weekInBlok] || oe.load;
                              return (
                                <div key={oi} style={{ background: done ? C.accentDk + "44" : C.surface, border: `1px solid ${done ? C.accentLt + "33" : C.border}`, borderRadius: 7, padding: "11px 12px", marginBottom: 7 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: done ? C.accentLt : C.white }}>{oe.naam}</div>
                                      <div style={{ fontSize: 10, color: C.accentLt, fontFamily: F.mono, marginTop: 3 }}>{prog}</div>
                                    </div>
                                    <button onClick={() => {
                                      setLogs(prev => ({ ...prev, [oKey + "_done"]: !done }));
                                      if (!done) showToast("✓ Gedaan");
                                    }} style={{
                                      background: done ? C.accent : "transparent",
                                      border: `1px solid ${done ? C.accentLt : C.border}`,
                                      borderRadius: 5, color: done ? C.white : C.muted,
                                      padding: "7px 12px", fontSize: 11, cursor: "pointer",
                                      fontFamily: F.mono, fontWeight: 700,
                                    }}>
                                      {done ? "✓" : "LOG"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── GAPS ────────────────────────────────────────────────── */}
          {tab === "gaps" && (
            <div>
              <SectionHead title="// GBRS BASELINE vs NORM" />
              {STANDARDS.map(s => {
                const val  = parseFloat(baseline[s.key]) || 0;
                const norm = getNorm(s.key, bw);
                const pct  = Math.min(s.higher ? (val / norm) * 100 : (norm / val) * 100, 100);
                const col  = getStatusColor(pct);
                return (
                  <div key={s.key} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{s.label}</div>
                      <GBRSBadge pct={pct} />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <div style={{ flex: 1, background: C.surface, borderRadius: 5, padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 8, color: C.muted, fontFamily: F.mono, marginBottom: 3 }}>SCORE</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: col, fontFamily: F.mono }}>{val ? fmtVal(s.key, val) : "—"}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", color: pct >= 100 ? C.accentLt : C.red, fontSize: 16 }}>
                        {pct >= 100 ? "✓" : "→"}
                      </div>
                      <div style={{ flex: 1, background: C.surface, borderRadius: 5, padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 8, color: C.muted, fontFamily: F.mono, marginBottom: 3 }}>NORM</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.accentLt, fontFamily: F.mono }}>{fmtVal(s.key, norm)}</div>
                      </div>
                    </div>
                    <div style={{ height: 4, background: C.surface, borderRadius: 2 }}>
                      <div style={{ height: 4, width: `${pct}%`, background: col, borderRadius: 2, transition: "width 0.5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.muted, fontFamily: F.mono, fontSize: 11 }}>LADEN...</div>
    </div>
  );
}
