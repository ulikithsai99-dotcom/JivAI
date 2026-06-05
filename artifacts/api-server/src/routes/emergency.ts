import { Router } from "express";
import { db } from "@workspace/db";
import {
  helplinesTable,
  guidanceStepsTable,
  emergencySessionsTable,
  emergencyCategoriesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { AnalyzeEmergencyBody } from "@workspace/api-zod";

const router = Router();

const EMERGENCY_RULES: Record<
  string,
  {
    keywords: string[];
    category: string;
    urgency: "critical" | "high" | "medium" | "low";
    title: string;
    summary: string;
    actions: Array<{
      id: string;
      label: string;
      icon: string;
      type: "call" | "locate" | "guide" | "contact";
      phoneNumber?: string;
    }>;
  }
> = {
  medical: {
    keywords: [
      "collapsed", "unconscious", "breathing", "chest pain", "heart",
      "stroke", "seizure", "bleeding", "injured", "fainted", "overdose",
      "ambulance", "hospital", "hurt", "accident", "pain"
    ],
    category: "medical",
    urgency: "critical",
    title: "Medical Emergency Detected",
    summary: "JivAI has detected a medical emergency. Immediate help is on the way.",
    actions: [
      { id: "call-108", label: "Call Now", icon: "phone", type: "call", phoneNumber: "108" },
      { id: "nearest-hospital", label: "Nearest Hospital", icon: "map-pin", type: "locate" },
      { id: "voice-guide", label: "Voice Guide", icon: "mic", type: "guide" },
    ],
  },
  fire: {
    keywords: ["fire", "smoke", "burning", "flames", "evacuate", "explosion"],
    category: "fire",
    urgency: "critical",
    title: "Fire Emergency Detected",
    summary: "JivAI has detected a fire emergency. Evacuate immediately and stay low.",
    actions: [
      { id: "call-101", label: "Call Fire Service", icon: "phone", type: "call", phoneNumber: "101" },
      { id: "nearest-exit", label: "Nearest Exit", icon: "map-pin", type: "locate" },
      { id: "voice-guide", label: "Voice Guide", icon: "mic", type: "guide" },
    ],
  },
  crime: {
    keywords: ["robbery", "theft", "attack", "assault", "murder", "kidnap", "threat", "gun", "violence", "harassed"],
    category: "crime",
    urgency: "high",
    title: "Safety Emergency Detected",
    summary: "JivAI understands you may be in danger. Police are being contacted.",
    actions: [
      { id: "call-100", label: "Call Police", icon: "phone", type: "call", phoneNumber: "100" },
      { id: "nearest-station", label: "Nearest Police Station", icon: "map-pin", type: "locate" },
      { id: "voice-guide", label: "Voice Guide", icon: "mic", type: "guide" },
    ],
  },
  financial: {
    keywords: ["hacked", "bank", "fraud", "scam", "money", "account", "atm", "card", "aadhaar", "lost", "wallet"],
    category: "financial",
    urgency: "medium",
    title: "Financial Alert Detected",
    summary: "JivAI has detected a financial issue. Let's secure your accounts first.",
    actions: [
      { id: "call-1930", label: "Cyber Crime Helpline", icon: "phone", type: "call", phoneNumber: "1930" },
      { id: "block-card", label: "Block Cards", icon: "shield", type: "contact" },
      { id: "voice-guide", label: "Voice Guide", icon: "mic", type: "guide" },
    ],
  },
  disaster: {
    keywords: ["flood", "earthquake", "cyclone", "storm", "tsunami", "landslide", "disaster", "relief"],
    category: "disaster",
    urgency: "high",
    title: "Natural Disaster Detected",
    summary: "JivAI has detected a disaster situation. Safety is the priority right now.",
    actions: [
      { id: "call-ndrf", label: "Call NDRF", icon: "phone", type: "call", phoneNumber: "1078" },
      { id: "nearest-shelter", label: "Nearest Shelter", icon: "map-pin", type: "locate" },
      { id: "voice-guide", label: "Voice Guide", icon: "mic", type: "guide" },
    ],
  },
  women: {
    keywords: ["stalking", "eve teasing", "harassment", "domestic violence", "molested", "rape", "unsafe woman", "helpless woman"],
    category: "women",
    urgency: "critical",
    title: "Women Safety Emergency",
    summary: "JivAI is here for you. You are not alone. Help is on the way.",
    actions: [
      { id: "call-1091", label: "Women Helpline", icon: "phone", type: "call", phoneNumber: "1091" },
      { id: "nearest-safe", label: "Nearest Safe Place", icon: "map-pin", type: "locate" },
      { id: "voice-guide", label: "Voice Guide", icon: "mic", type: "guide" },
    ],
  },
};

type SubjectContext = {
  relationship: string;
  estimatedGender: "male" | "female" | "unknown";
  estimatedAgeRange: string;
  confidence: "high" | "medium" | "low";
};

const RELATIONSHIP_MAP: Array<{
  patterns: RegExp[];
  gender: "male" | "female" | "unknown";
  ageRange: string;
  confidence: "high" | "medium" | "low";
}> = [
  { patterns: [/\b(grandfather|grandpa|grandad|nana|dada|thatha|dadu)\b/i], gender: "male",    ageRange: "65–85 years", confidence: "high" },
  { patterns: [/\b(grandmother|grandma|granny|nani|dadi|ammamma|aajji)\b/i], gender: "female",  ageRange: "65–85 years", confidence: "high" },
  { patterns: [/\b(father|dad|papa|appa|baba|pitaji)\b/i],                   gender: "male",    ageRange: "50–70 years", confidence: "high" },
  { patterns: [/\b(mother|mom|mum|mama|amma|mummy|mataji)\b/i],              gender: "female",  ageRange: "45–65 years", confidence: "high" },
  { patterns: [/\b(husband|spouse)\b/i],                                     gender: "male",    ageRange: "30–55 years", confidence: "high" },
  { patterns: [/\b(wife)\b/i],                                               gender: "female",  ageRange: "28–55 years", confidence: "high" },
  { patterns: [/\b(brother|bhai)\b/i],                                       gender: "male",    ageRange: "15–40 years", confidence: "high" },
  { patterns: [/\b(sister|didi|akka)\b/i],                                   gender: "female",  ageRange: "15–40 years", confidence: "high" },
  { patterns: [/\b(son|beta)\b/i],                                           gender: "male",    ageRange: "10–25 years", confidence: "high" },
  { patterns: [/\b(daughter|beti)\b/i],                                      gender: "female",  ageRange: "10–25 years", confidence: "high" },
  { patterns: [/\b(uncle|chacha|mama|tau)\b/i],                              gender: "male",    ageRange: "40–65 years", confidence: "medium" },
  { patterns: [/\b(aunt|auntie|mausi|chachi|bua)\b/i],                       gender: "female",  ageRange: "35–60 years", confidence: "medium" },
  { patterns: [/\b(baby|infant|newborn|toddler)\b/i],                        gender: "unknown", ageRange: "0–3 years",   confidence: "high" },
  { patterns: [/\b(child|kid)\b/i],                                          gender: "unknown", ageRange: "4–12 years",  confidence: "medium" },
  { patterns: [/\b(boy|he|him)\b/i],                                         gender: "male",    ageRange: "unknown",     confidence: "low" },
  { patterns: [/\b(girl|she|her)\b/i],                                       gender: "female",  ageRange: "unknown",     confidence: "low" },
  { patterns: [/\b(friend|colleague|neighbor|neighbour)\b/i],                gender: "unknown", ageRange: "unknown",     confidence: "low" },
  { patterns: [/\b(elderly|old man|old woman|old person|senior)\b/i],        gender: "unknown", ageRange: "65–85 years", confidence: "medium" },
];

function extractRelationship(transcript: string): SubjectContext | null {
  const lower = transcript.toLowerCase();

  // Check possessive patterns first: "my father", "my wife", etc.
  const possessiveMatch = lower.match(
    /\bmy\s+(grandfather|grandpa|grandad|grandmother|grandma|granny|nani|dadi|nana|dada|father|dad|papa|appa|baba|mother|mom|mum|mama|mummy|husband|wife|spouse|brother|bhai|sister|didi|son|beta|daughter|beti|uncle|aunt|auntie|baby|infant|child|kid|friend|colleague|neighbor|neighbour)\b/i
  );

  const wordToCheck = possessiveMatch ? possessiveMatch[1] : null;

  if (!wordToCheck) {
    // Fall back to bare keyword scan
    for (const entry of RELATIONSHIP_MAP) {
      for (const pattern of entry.patterns) {
        if (pattern.test(lower)) {
          const match = lower.match(pattern);
          return {
            relationship: match ? match[1] : "person",
            estimatedGender: entry.gender,
            estimatedAgeRange: entry.ageRange,
            confidence: entry.confidence,
          };
        }
      }
    }
    return null;
  }

  for (const entry of RELATIONSHIP_MAP) {
    for (const pattern of entry.patterns) {
      if (pattern.test(wordToCheck)) {
        return {
          relationship: wordToCheck,
          estimatedGender: entry.gender,
          estimatedAgeRange: entry.ageRange,
          confidence: entry.confidence,
        };
      }
    }
  }
  return null;
}

function classifyEmergency(transcript: string) {
  const lower = transcript.toLowerCase();
  for (const rule of Object.values(EMERGENCY_RULES)) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule;
    }
  }
  return {
    category: "general",
    urgency: "medium" as const,
    title: "Emergency Detected",
    summary: "JivAI is here to help you. Here are your next steps.",
    actions: [
      { id: "call-112", label: "Call Emergency", icon: "phone", type: "call" as const, phoneNumber: "112" },
      { id: "nearest-help", label: "Nearest Help", icon: "map-pin", type: "locate" as const },
      { id: "voice-guide", label: "Voice Guide", icon: "mic", type: "guide" as const },
    ],
  };
}

router.post("/emergency/analyze", async (req, res) => {
  const parsed = AnalyzeEmergencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { transcript, language } = parsed.data;
  const rule = classifyEmergency(transcript);
  const subjectContext = extractRelationship(transcript);

  await db.insert(emergencySessionsTable).values({
    transcript,
    language: language ?? "en",
    category: rule.category,
    urgency: rule.urgency,
    detectedTitle: rule.title,
  });

  const [helplines, steps] = await Promise.all([
    db.select().from(helplinesTable).where(eq(helplinesTable.category, rule.category)),
    db.select().from(guidanceStepsTable).where(eq(guidanceStepsTable.category, rule.category)).orderBy(guidanceStepsTable.order),
  ]);

  res.json({
    category: rule.category,
    urgency: rule.urgency,
    title: rule.title,
    summary: rule.summary,
    subjectContext: subjectContext ?? null,
    actions: rule.actions,
    guidanceSteps: steps.map((s) => ({
      order: s.order,
      instruction: s.instruction,
      icon: s.icon,
      completed: false,
    })),
    helplines: helplines.map((h) => ({
      id: String(h.id),
      name: h.name,
      number: h.number,
      category: h.category,
      description: h.description ?? null,
      available247: h.available247 ?? true,
    })),
  });
});

router.get("/emergency/guidance/:category", async (req, res) => {
  const { category } = req.params;
  const steps = await db
    .select()
    .from(guidanceStepsTable)
    .where(eq(guidanceStepsTable.category, category))
    .orderBy(guidanceStepsTable.order);

  if (steps.length === 0) {
    res.status(404).json({ error: "No guidance found for this category" });
    return;
  }

  res.json({
    category,
    title: steps[0]?.title ?? "Emergency Guidance",
    steps: steps.map((s) => ({
      order: s.order,
      instruction: s.instruction,
      icon: s.icon,
      completed: false,
    })),
  });
});

router.get("/emergency/helplines", async (req, res) => {
  const { category } = req.query;
  const rows = category
    ? await db.select().from(helplinesTable).where(eq(helplinesTable.category, String(category)))
    : await db.select().from(helplinesTable);

  res.json(
    rows.map((h) => ({
      id: String(h.id),
      name: h.name,
      number: h.number,
      category: h.category,
      description: h.description ?? null,
      available247: h.available247 ?? true,
    }))
  );
});

router.get("/emergency/categories", async (req, res) => {
  const rows = await db.select().from(emergencyCategoriesTable);
  res.json(
    rows.map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon,
      description: c.description,
      color: c.color ?? null,
    }))
  );
});

export default router;
