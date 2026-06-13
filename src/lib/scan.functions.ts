import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type Verdict = "great" | "ok" | "avoid";
export type Confidence = "low" | "medium" | "high";

export interface Alternative {
  name: string;
  servingDescription: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodAnalysis {
  name: string;
  servingDescription: string; // e.g. "1 medium bowl, ~250g"
  servingGrams: number; // best estimate of grams in ONE serving
  kcal: number; // per ONE serving
  protein: number;
  carbs: number;
  fat: number;
  verdict: Verdict;
  reasoning: string;
  confidence: Confidence;
  assumptions: string; // what the AI assumed (cooking method, oil, sugar, portion cues)
  components: string[]; // visible items the AI detected on the plate
  alternatives: Alternative[]; // 2-3 likely alternative IDs the user can pick
}

const ALT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    servingDescription: { type: "string" },
    kcal: { type: "number" },
    protein: { type: "number" },
    carbs: { type: "number" },
    fat: { type: "number" },
  },
  required: ["name", "servingDescription", "kcal", "protein", "carbs", "fat"],
  additionalProperties: false,
} as const;

const ANALYSIS_TOOL = {
  type: "function",
  function: {
    name: "submit_food_analysis",
    description: "Submit nutrition analysis for ONE serving plus alternatives.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Concise dish name" },
        servingDescription: {
          type: "string",
          description:
            "Human description of ONE serving with size cues, e.g. '1 medium bowl, ~250g' or '2 slices, ~120g'.",
        },
        servingGrams: {
          type: "number",
          description: "Best-estimate grams in ONE serving you analyzed.",
        },
        kcal: { type: "number", description: "Calories per ONE serving (not per 100g)" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
        verdict: { type: "string", enum: ["great", "ok", "avoid"] },
        reasoning: { type: "string", description: "1-2 sentences tied to user's goal." },
        confidence: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "How sure you are about the identification AND the portion.",
        },
        assumptions: {
          type: "string",
          description:
            "Key assumptions: cooking method, added oil/sugar/sauce, plate size, density. Keep <30 words.",
        },
        components: {
          type: "array",
          items: { type: "string" },
          description: "Distinct items visible on the plate.",
        },
        alternatives: {
          type: "array",
          items: ALT_SCHEMA,
          description:
            "2-3 plausible alternative identifications the user might pick instead, each fully nutritionally specified per serving.",
        },
      },
      required: [
        "name",
        "servingDescription",
        "servingGrams",
        "kcal",
        "protein",
        "carbs",
        "fat",
        "verdict",
        "reasoning",
        "confidence",
        "assumptions",
        "components",
        "alternatives",
      ],
      additionalProperties: false,
    },
  },
} as const;

function buildSystem(goal: string) {
  return `You are a meticulous, evidence-based nutrition coach. The user's fitness goal is: ${goal}.

Your job is ACCURATE per-serving nutrition. Follow this method:
1. Identify every visible component (protein, carb, veg, sauce, oil, drink).
2. Estimate portion in grams using plate/utensil/hand cues. Standard dinner plate ≈ 27cm. Be explicit in "assumptions".
3. Compute kcal & macros for ONE serving as shown — NOT per 100g.
4. Set "confidence":
   - high: clearly identifiable single dish, clear portion cues
   - medium: dish identifiable but portion ambiguous, or composed plate
   - low: blurry, partial, or ambiguous
5. Provide 2-3 plausible "alternatives" (e.g. for a brown grain bowl: brown rice bowl vs quinoa bowl vs farro bowl) so the user can correct you. Each alternative must include full per-serving macros.
6. Verdict relative to the goal: great / ok / avoid. Be honest.

Always call submit_food_analysis. Never refuse — give your best estimate with appropriate confidence.`;
}

async function callGateway(body: Record<string, unknown>): Promise<FoodAnalysis> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
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
  return JSON.parse(call.function.arguments) as FoodAnalysis;
}

export const analyzePhoto = createServerFn({ method: "POST" })
  .inputValidator((d: { imageDataUrl: string; goal: string }) => d)
  .handler(async ({ data }) => {
    return callGateway({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: buildSystem(data.goal) },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identify this meal precisely. Use plate/utensil cues to estimate the portion in grams. List every component you see. Give 2-3 alternative IDs in case I disagree.",
            },
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
      servingSize?: string;
      ingredients?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const facts = JSON.stringify(
      {
        product: data.productName,
        brand: data.brand,
        per_100g: data.nutriments,
        labeled_serving_size: data.servingSize,
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
          content: `Packaged product facts below. Use the labeled serving size when present, otherwise pick a realistic one and say so in assumptions. Compute per-serving macros, not per 100g.\n\n${facts}`,
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
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
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
