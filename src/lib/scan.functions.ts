import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type Verdict = "great" | "ok" | "avoid";

export interface FoodAnalysis {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  verdict: Verdict;
  reasoning: string;
}

const ANALYSIS_TOOL = {
  type: "function",
  function: {
    name: "submit_food_analysis",
    description: "Submit nutritional analysis and verdict for the food.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Concise dish/food name" },
        kcal: { type: "number", description: "Estimated total calories" },
        protein: { type: "number", description: "Grams of protein" },
        carbs: { type: "number", description: "Grams of carbohydrates" },
        fat: { type: "number", description: "Grams of fat" },
        verdict: {
          type: "string",
          enum: ["great", "ok", "avoid"],
          description: "great=eat freely, ok=fine in moderation, avoid=skip for goal",
        },
        reasoning: {
          type: "string",
          description: "1-2 sentence explanation tied to user's goal.",
        },
      },
      required: ["name", "kcal", "protein", "carbs", "fat", "verdict", "reasoning"],
      additionalProperties: false,
    },
  },
} as const;

function buildSystem(goal: string) {
  return `You are a sharp, no-nonsense nutrition coach. The user's fitness goal is: ${goal}.
Analyze the food provided. Estimate macros for a typical serving. Output a verdict relative to their goal:
- "great": strongly supports the goal
- "ok": neutral / fine in moderation
- "avoid": works against the goal (high added sugar, ultra-processed, wrong macro mix, etc.)
Be honest and specific. Always call the submit_food_analysis tool.`;
}

async function callGateway(body: Record<string, unknown>): Promise<FoodAnalysis> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("Rate limit hit. Please wait and try again.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add funds in Workspace settings.");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("AI returned no analysis");
  const parsed = JSON.parse(call.function.arguments) as FoodAnalysis;
  return parsed;
}

export const analyzePhoto = createServerFn({ method: "POST" })
  .inputValidator((d: { imageDataUrl: string; goal: string }) => d)
  .handler(async ({ data }) => {
    return callGateway({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: buildSystem(data.goal) },
        {
          role: "user",
          content: [
            { type: "text", text: "Identify this food and analyze it." },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "function", function: { name: "submit_food_analysis" } },
    });
  });

export const analyzeBarcodeProduct = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      goal: string;
      productName: string;
      brand?: string;
      nutriments?: Record<string, number>;
      ingredients?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const facts = JSON.stringify(
      {
        product: data.productName,
        brand: data.brand,
        per_100g: data.nutriments,
        ingredients: data.ingredients?.slice(0, 500),
      },
      null,
      2,
    );
    return callGateway({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: buildSystem(data.goal) },
        {
          role: "user",
          content: `Analyze this packaged product and give me a per-serving estimate plus verdict for my goal.\n\n${facts}`,
        },
      ],
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "function", function: { name: "submit_food_analysis" } },
    });
  });

export interface Suggestions {
  eat: { name: string; reason: string }[];
  avoid: { name: string; reason: string }[];
}

const SUGGESTIONS_TOOL = {
  type: "function",
  function: {
    name: "submit_suggestions",
    description: "Submit personalized food suggestions.",
    parameters: {
      type: "object",
      properties: {
        eat: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              reason: { type: "string", description: "Short reason, max 12 words." },
            },
            required: ["name", "reason"],
            additionalProperties: false,
          },
        },
        avoid: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              reason: { type: "string", description: "Short reason, max 12 words." },
            },
            required: ["name", "reason"],
            additionalProperties: false,
          },
        },
      },
      required: ["eat", "avoid"],
      additionalProperties: false,
    },
  },
} as const;

export const getSuggestions = createServerFn({ method: "POST" })
  .inputValidator((d: { goal: string }) => d)
  .handler(async ({ data }): Promise<Suggestions> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a nutrition coach. Goal: ${data.goal}. Provide exactly 5 specific foods to eat and 5 to avoid for this goal.`,
          },
          { role: "user", content: "Give me my personalized food list." },
        ],
        tools: [SUGGESTIONS_TOOL],
        tool_choice: { type: "function", function: { name: "submit_suggestions" } },
      }),
    });
    if (!res.ok) throw new Error(`Suggestions failed: ${res.status}`);
    const data2 = await res.json();
    const call = data2.choices?.[0]?.message?.tool_calls?.[0];
    return JSON.parse(call.function.arguments) as Suggestions;
  });
