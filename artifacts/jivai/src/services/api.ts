/**
 * JivAI API client layer — connects frontend to FastAPI backend.
 * Does not modify UI components; use these functions for backend integration.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
    credentials: "include",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`API ${method} ${path} failed (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<T>;
}

// --- Types ---

export type SpeechResult = {
  category: string;
  urgency: string;
};

export type GuidanceResult = {
  helpline: string;
  steps: string[];
  title?: string;
  guidance?: string;
};

export type EscalationContact = {
  name: string;
  number: string;
  type: string;
  description?: string;
};

export type EscalationResult = {
  priority_level: string;
  emergency_contacts: EscalationContact[];
  helpline_recommendations: EscalationContact[];
  nearest_facilities: Array<Record<string, unknown>>;
  message: string;
};

export type TranslateResult = {
  translated_text: string;
  source_language: string;
  target_language: string;
  provider: string;
};

export type EmergencyAnalysis = {
  category: string;
  urgency: string;
  title: string;
  summary: string;
  subjectContext?: {
    relationship: string;
    estimatedGender: string;
    estimatedAgeRange: string;
    confidence: string;
  } | null;
  actions: Array<{
    id: string;
    label: string;
    icon: string;
    type: string;
    phoneNumber?: string | null;
  }>;
  guidanceSteps?: Array<{
    order: number;
    instruction: string;
    icon: string;
    completed?: boolean | null;
  }> | null;
  helplines?: Array<{
    id: string;
    name: string;
    number: string;
    category: string;
    description?: string | null;
    available247?: boolean | null;
  }> | null;
};

// --- Core API functions (user-specified) ---

export async function classifyEmergency(transcript: string, language?: string): Promise<SpeechResult> {
  return request<SpeechResult>("/speech", {
    method: "POST",
    body: { transcript, language },
  });
}

export async function getGuidance(
  category: string,
  transcript?: string,
  language?: string,
): Promise<GuidanceResult> {
  return request<GuidanceResult>("/guidance", {
    method: "POST",
    body: { category, transcript, language },
  });
}

export async function getEscalation(
  category: string,
  urgency?: string,
  options?: { transcript?: string; latitude?: number; longitude?: number },
): Promise<EscalationResult> {
  return request<EscalationResult>("/escalate", {
    method: "POST",
    body: {
      category,
      urgency: urgency ?? "high",
      transcript: options?.transcript,
      latitude: options?.latitude,
      longitude: options?.longitude,
    },
  });
}

export async function translateResponse(
  text: string,
  sourceLanguage = "en",
  targetLanguage = "hi",
): Promise<TranslateResult> {
  return request<TranslateResult>("/api/translate", {
    method: "POST",
    body: {
      text,
      source_language: sourceLanguage,
      target_language: targetLanguage,
    },
  });
}

// --- Compatibility layer (existing OpenAPI contract) ---

export async function analyzeEmergency(transcript: string, language?: string): Promise<EmergencyAnalysis> {
  return request<EmergencyAnalysis>("/api/emergency/analyze", {
    method: "POST",
    body: { transcript, language },
  });
}

export async function getGuidanceByCategory(category: string): Promise<{
  category: string;
  title: string;
  steps: Array<{ order: number; instruction: string; icon: string; completed?: boolean }>;
}> {
  return request(`/api/emergency/guidance/${encodeURIComponent(category)}`);
}

export async function listHelplines(category?: string): Promise<
  Array<{
    id: string;
    name: string;
    number: string;
    category: string;
    description?: string;
    available247?: boolean;
  }>
> {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return request(`/api/emergency/helplines${query}`);
}

export async function healthCheck(): Promise<{ status: string }> {
  return request("/api/healthz");
}
