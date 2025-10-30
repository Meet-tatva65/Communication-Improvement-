import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ComparisonResult, Dimension } from '../types';

// Utility function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set. Please set it in your Vercel project settings.");
  }
  return new GoogleGenAI({ apiKey });
};

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.NUMBER, description: "An overall score from 0 to 5, can be decimal." },
    dimensions: {
      type: Type.ARRAY,
      description: "Scores for the three primary communication dimensions (Clarity, Language Proficiency, Conciseness) on a 0-5 scale.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          score: { type: Type.NUMBER },
        },
        required: ["name", "score"],
      },
    },
    fluencySpeechRatePercentage: { 
        type: Type.NUMBER, 
        description: "A score from 0 to 100 for fluency and speech rate." 
    },
    feedback: {
      type: Type.ARRAY,
      description: "Actionable feedback points.",
      items: { type: Type.STRING },
    },
    fillerWords: {
      type: Type.ARRAY,
      description: "List of filler words used and their counts.",
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          count: { type: Type.INTEGER },
        },
        required: ["word", "count"],
      },
    },
    conversation: {
      type: Type.ARRAY,
      description: "The full conversation transcript.",
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: { type: Type.STRING, enum: ["User", "AI"] },
          text: { type: Type.STRING },
          mistake: {
            type: Type.OBJECT,
            properties: {
              incorrectPhrase: { type: Type.STRING },
              suggestion: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ["incorrectPhrase", "suggestion", "explanation"],
          },
        },
        required: ["speaker", "text"],
      },
    },
  },
  required: ["overallScore", "dimensions", "fluencySpeechRatePercentage", "feedback", "fillerWords", "conversation"],
};

const singleAnalysisPrompt = `You are a world-class speech and communication coach. Analyze the user's speech from the provided audio file, which contains a conversation between a 'User' and an 'AI'.

Instructions:
1.  Isolate and analyze ONLY the 'User's' speech.
2.  Provide a full transcript of the entire conversation, labeling each part with 'User' or 'AI'.
3.  For the 'User's' speech, identify any grammatical mistakes or awkward phrasing. For each mistake, provide the incorrect phrase, a suggested correction, and a brief explanation.
4.  Rate the user on the following three dimensions ONLY, on a scale of 0 to 5 (can be decimal): 'Clarity', 'Language Proficiency', and 'Conciseness'. Do not include other dimensions like 'Pauses & Hesitation Markers'.
5.  Separately, evaluate the user's 'Fluency / Speech Rate' as a percentage from 0 to 100 and return it in the 'fluencySpeechRatePercentage' field. A higher percentage indicates better performance.
6.  Calculate an 'overallScore' from 0 to 5, representing a weighted average of the three dimensions rated on the 0-5 scale ('Clarity', 'Language Proficiency', 'Conciseness'). Do NOT include 'Fluency / Speech Rate' in this overall score.
7.  Provide a list of the most frequently used filler words by the user and their counts.
8.  Offer a bulleted list of 3-5 clear, actionable 'feedback' points for improvement. As part of the feedback, specifically mention the user's estimated speech rate in words-per-minute (WPM).
9.  Return the entire analysis in the specified JSON format.`;

export const analyzeAudio = async (audioFile: File): Promise<AnalysisResult> => {
  const ai = getAiClient();
  const base64Audio = await fileToBase64(audioFile);
  const audioPart = { inlineData: { mimeType: audioFile.type, data: base64Audio } };
  const textPart = { text: singleAnalysisPrompt };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [textPart, audioPart] },
      config: { 
        responseMimeType: "application/json", 
        responseSchema: analysisSchema,
        seed: 42, // Use a fixed seed for more deterministic and consistent results.
      }
    });
    
    const result: AnalysisResult = JSON.parse(response.text.trim());

    // Round scores for consistency
    result.overallScore = parseFloat(result.overallScore.toFixed(2));
    result.dimensions.forEach((dim: Dimension) => {
        dim.score = parseFloat(dim.score.toFixed(2));
    });
    result.fluencySpeechRatePercentage = Math.round(result.fluencySpeechRatePercentage);

    return result;

  } catch (error) {
    console.error("Error analyzing audio with Gemini:", error);
    throw new Error("Failed to analyze audio. The model may have had trouble with the file.");
  }
};


const comparisonSchema = {
    type: Type.OBJECT,
    properties: {
        dimensionChanges: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    oldScore: { type: Type.NUMBER },
                    newScore: { type: Type.NUMBER },
                },
                required: ["name", "oldScore", "newScore"],
            }
        },
        fluencyChange: {
            type: Type.OBJECT,
            properties: {
                oldPercentage: { type: Type.NUMBER },
                newPercentage: { type: Type.NUMBER },
            },
            required: ["oldPercentage", "newPercentage"],
        },
        improvementSummary: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        areasForNextFocus: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
    },
    required: ["dimensionChanges", "fluencyChange", "improvementSummary", "areasForNextFocus"],
};

const comparisonPrompt = `You are a world-class speech and communication coach. You will be given two JSON objects representing two different speech analyses for the same user: an 'older' analysis and a 'newer' analysis. Your task is to compare the user's performance between the two.

Instructions:
1.  Compare the scores for each dimension (rated 0-5) between the old and new analyses.
2.  Separately, compare the 'fluencySpeechRatePercentage' between the old and new analyses.
3.  Provide a bulleted 'improvementSummary' highlighting the key areas where the user has improved. Be specific and refer to the data, including the change in fluency. If performance worsened in some areas, state that genuinely.
4.  Provide a bulleted list of 'areasForNextFocus', suggesting what the user should work on next based on the comparison.
5.  Return the entire comparison in the specified JSON format. The 'dimensionChanges' should reflect the 'oldScore' and 'newScore' for the 0-5 rated dimensions. The 'fluencyChange' object should contain the 'oldPercentage' and 'newPercentage'.`;

export const generateComparisonReport = async (oldAnalysis: AnalysisResult, newAnalysis: AnalysisResult): Promise<ComparisonResult> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: {
                parts: [
                    { text: comparisonPrompt },
                    { text: "\n--- OLDER ANALYSIS (JSON) ---" },
                    { text: JSON.stringify(oldAnalysis, null, 2) },
                    { text: "\n--- NEWER ANALYSIS (JSON) ---" },
                    { text: JSON.stringify(newAnalysis, null, 2) },
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: comparisonSchema,
            }
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error generating comparison with Gemini:", error);
        throw new Error("Failed to compare analyses. Please try again.");
    }
};