/**
 * JivAI API client layer — connects frontend to FastAPI backend.
 * This file is added to integrate the existing frontend with the FastAPI backend.
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

  return (await response.json()) as T;
}

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

export async function analyzeEmergency(transcript: string, language?: string): Promise<any> {
  return request<any>("/api/emergency/analyze", {
    method: "POST",
    body: { transcript, language },
  });
}

export async function getGuidanceByCategory(category: string) {
  return request(`/api/emergency/guidance/${encodeURIComponent(category)}` as any);
}

export async function listHelplines(category?: string) {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return request(`/api/emergency/helplines${query}` as any);
}

export async function healthCheck() {
  return request(`/api/healthz` as any);
}

export default {
  classifyEmergency,
  getGuidance,
  getEscalation,
  translateResponse,
  analyzeEmergency,
  getGuidanceByCategory,
  listHelplines,
  healthCheck,
};
