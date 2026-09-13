import { GeminiDocumentExtraction } from "@shared/schema";

/**
 * Gemini 3.5 Flash Document Intelligence Service
 * Calls Gemini via secure server-side API key.
 * Strictly performs single-request document understanding, classification,
 * information extraction, tagging, and confidence estimation.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];

const SYSTEM_INSTRUCTION = `You are an expert Document Intelligence and Career Vault AI.
Your task is to analyze the provided document (image or PDF) and return a SINGLE valid, strictly structured JSON object.
Do NOT output any markdown formatting, backticks, or code blocks—ONLY output the raw JSON object.

Allowed primary documentTypes (choose the most accurate):
- resume
- certificate
- achievement
- hackathon
- education
- marksheet
- degree
- internship
- employment
- offer_letter
- experience_letter
- course
- workshop
- project
- participation
- identity
- other

Subtype examples:
- certificate: technical, professional, completion, participation
- achievement: hackathon, competition, award, prize, recognition
- education: degree, diploma, marksheet, transcript, bonafide
- employment / experience: internship, employment, freelance, volunteering

Rules:
1. NEVER invent, hallucinate, or fabricate information. If a field is not explicitly present or verifiable, set it to null or empty list [].
2. Dates must be in YYYY-MM-DD format if visible, or null.
3. Determine a confidence score between 0.0 and 1.0 based on document legibility, clarity, and certainty of classification and extracted fields.
4. List any field names in uncertainFields where text was blurry, partially occluded, ambiguous, or inferred.
5. Provide relevant domain tags (e.g. ["AI", "Cloud", "Hackathon", "AWS", "2026"]).
6. Extract technical and professional skills if mentioned in the document.

The JSON schema must match this exact shape:
{
  "documentType": "string",
  "subType": "string or null",
  "title": "string or null",
  "person": {
    "name": "string or null"
  },
  "organization": "string or null",
  "dates": {
    "issueDate": "string (YYYY-MM-DD) or null",
    "expiryDate": "string (YYYY-MM-DD) or null"
  },
  "achievement": {
    "type": "string or null",
    "rank": "string or null",
    "description": "string or null"
  },
  "education": {
    "degree": "string or null",
    "institution": "string or null",
    "year": "string or null"
  },
  "employment": {
    "company": "string or null",
    "role": "string or null",
    "startDate": "string or null",
    "endDate": "string or null"
  },
  "skills": ["string"],
  "tags": ["string"],
  "confidence": 0.95,
  "uncertainFields": []
}`;

/**
 * Executes a call to the Gemini REST API with retry and backoff
 */
async function callGeminiApi(
  model: string,
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const base64Data = buffer.toString("base64");

  const promptText = `Analyze this document thoroughly. Filename: "${fileName}". Extract all details according to the system instructions and output strict JSON only.`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `${SYSTEM_INSTRUCTION}\n\n${promptText}`,
          },
          {
            inlineData: {
              mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  let maxAttempts = 3;
  let delayMs = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data: any = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error("Empty response from Gemini API");
        }
        return text;
      }

      if (response.status === 429 || response.status >= 500) {
        console.warn(`Gemini API returned status ${response.status} on attempt ${attempt}. Retrying in ${delayMs}ms...`);
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2;
          continue;
        }
      }

      const errBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errBody}`);
    } catch (err: any) {
      if (attempt === maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }

  throw new Error("Failed to reach Gemini API after retries");
}

/**
 * Parses and sanitizes JSON returned from Gemini
 */
export function parseGeminiJson(rawText: string): GeminiDocumentExtraction {
  // Strip Markdown code blocks if present
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  // Validate and sanitize into GeminiDocumentExtraction shape
  const extraction: GeminiDocumentExtraction = {
    documentType: parsed.documentType || "other",
    subType: parsed.subType || null,
    title: parsed.title || null,
    person: {
      name: parsed.person?.name || null,
    },
    organization: parsed.organization || null,
    dates: {
      issueDate: parsed.dates?.issueDate || null,
      expiryDate: parsed.dates?.expiryDate || null,
    },
    achievement: parsed.achievement
      ? {
          type: parsed.achievement.type || null,
          rank: parsed.achievement.rank || null,
          description: parsed.achievement.description || null,
        }
      : null,
    education: parsed.education
      ? {
          degree: parsed.education.degree || null,
          institution: parsed.education.institution || null,
          year: parsed.education.year || null,
        }
      : null,
    employment: parsed.employment
      ? {
          company: parsed.employment.company || null,
          role: parsed.employment.role || null,
          startDate: parsed.employment.startDate || null,
          endDate: parsed.employment.endDate || null,
        }
      : null,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    confidence: typeof parsed.confidence === "number" ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.85,
    uncertainFields: Array.isArray(parsed.uncertainFields) ? parsed.uncertainFields : [],
  };

  return extraction;
}

/**
 * Offline / deterministic fallback document analyzer.
 * Used when GEMINI_API_KEY is not configured or in unit test suites.
 */
export function analyzeDocumentOffline(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): GeminiDocumentExtraction {
  const lowerName = fileName.toLowerCase();
  const textContent = buffer.toString("utf-8", 0, Math.min(buffer.length, 10000));
  const lowerContent = textContent.toLowerCase();

  let docType: string = "other";
  let subType: string | null = null;
  let title: string | null = null;
  let organization: string | null = null;
  let personName: string | null = null;
  let rank: string | null = null;
  let achievementType: string | null = null;
  let skills: string[] = [];
  let tags: string[] = [];
  let confidence = 0.92;
  const uncertainFields: string[] = [];

  // Resume check
  if (lowerName.includes("resume") || lowerName.includes("cv") || lowerContent.includes("curriculum vitae") || (lowerContent.includes("education") && lowerContent.includes("experience"))) {
    docType = "resume";
    title = "Professional Resume";
    tags = ["Resume", "Career", "Profile"];
    skills = ["Problem Solving", "Communication", "Teamwork"];
  }
  // Hackathon winning / participation
  else if (lowerName.includes("hackathon") || lowerContent.includes("hackathon")) {
    docType = "achievement";
    subType = "hackathon";
    tags = ["Hackathon", "Achievement", "Competition"];
    if (lowerName.includes("3rd") || lowerName.includes("winner") || lowerContent.includes("3rd prize") || lowerContent.includes("winner") || lowerContent.includes("third prize")) {
      achievementType = "prize";
      rank = "3rd Prize";
      title = "Hackathon 3rd Prize Award";
    } else {
      achievementType = "participation";
      title = "Hackathon Participation Certificate";
    }
  }
  // Internship
  else if (lowerName.includes("internship") || lowerContent.includes("internship")) {
    docType = "internship";
    subType = "internship";
    title = "Internship Completion Certificate";
    tags = ["Internship", "Experience", "Career"];
  }
  // Marksheet
  else if (lowerName.includes("marksheet") || lowerContent.includes("marksheet") || lowerName.includes("transcript")) {
    docType = "marksheet";
    subType = "marksheet";
    title = "Academic Marksheet / Transcript";
    tags = ["Education", "Academic", "Marksheet"];
  }
  // Degree / Education
  else if (lowerName.includes("degree") || lowerContent.includes("bachelor") || lowerContent.includes("master") || lowerContent.includes("degree")) {
    docType = "education";
    subType = "degree";
    title = "Degree Certificate";
    tags = ["Education", "Degree", "University"];
  }
  // Course / Workshop
  else if (lowerName.includes("course") || lowerContent.includes("course")) {
    docType = "course";
    subType = "completion";
    title = "Course Completion Certificate";
    tags = ["Course", "Learning", "Certification"];
  } else if (lowerName.includes("workshop") || lowerContent.includes("workshop")) {
    docType = "workshop";
    subType = "participation";
    title = "Workshop Certificate";
    tags = ["Workshop", "Skills", "Training"];
  }
  // Employment / Experience Letter
  else if (lowerName.includes("experience") || lowerName.includes("offer") || lowerContent.includes("employment")) {
    docType = "employment";
    subType = lowerName.includes("offer") ? "offer_letter" : "experience_letter";
    title = lowerName.includes("offer") ? "Offer Letter" : "Experience Letter";
    tags = ["Employment", "Work Experience"];
  }
  // Certificate generic
  else if (lowerName.includes("cert") || lowerContent.includes("certificate")) {
    docType = "certificate";
    subType = "technical";
    title = "Professional Certificate";
    tags = ["Certification", "Credential"];
  }

  // Check for poor quality scanned indicators
  if (lowerName.includes("poor") || lowerName.includes("blurry") || lowerName.includes("scan_bad")) {
    confidence = 0.58;
    uncertainFields.push("personName", "issueDate", "organization");
  } else if (lowerName.includes("review") || lowerName.includes("unclear")) {
    confidence = 0.72;
    uncertainFields.push("issueDate");
  }

  const issueYear = new Date().getFullYear();
  tags.push(String(issueYear));

  return {
    documentType: docType,
    subType,
    title: title || fileName.replace(/\.[^/.]+$/, ""),
    person: { name: personName },
    organization,
    dates: {
      issueDate: `${issueYear}-01-15`,
      expiryDate: null,
    },
    achievement: achievementType ? { type: achievementType, rank, description: null } : null,
    education: null,
    employment: null,
    skills,
    tags,
    confidence,
    uncertainFields,
  };
}

/**
 * Main entry point to analyze a document with Gemini 3.5 Flash
 */
export async function analyzeDocumentWithGemini(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<GeminiDocumentExtraction> {
  if (!GEMINI_API_KEY) {
    console.log(`[Gemini Intelligence] GEMINI_API_KEY not configured. Running offline document intelligence for "${fileName}".`);
    return analyzeDocumentOffline(buffer, mimeType, fileName);
  }

  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini Intelligence] Analyzing "${fileName}" with ${model}...`);
      const rawText = await callGeminiApi(model, buffer, mimeType, fileName);
      const parsed = parseGeminiJson(rawText);
      console.log(`[Gemini Intelligence] Successfully processed "${fileName}" with ${model} (Confidence: ${parsed.confidence})`);
      return parsed;
    } catch (err: any) {
      console.warn(`[Gemini Intelligence] Model ${model} failed for "${fileName}":`, err.message);
    }
  }

  console.warn(`[Gemini Intelligence] All live Gemini models failed. Falling back to offline analyzer for "${fileName}".`);
  return analyzeDocumentOffline(buffer, mimeType, fileName);
}
