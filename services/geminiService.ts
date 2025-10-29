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
      description: "Scores for specific communication dimensions.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          score: { type: Type.NUMBER },
        },
        required: ["name", "score"],
      },
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
  required: ["overallScore", "dimensions", "feedback", "fillerWords", "conversation"],
};

const singleAnalysisPrompt = `You are a world-class speech and communication coach. Analyze the user's speech from the provided audio file, which contains a conversation between a 'User' and an 'AI'.

Instructions:
1.  Isolate and analyze ONLY the 'User's' speech.
2.  Provide a full transcript of the entire conversation, labeling each part with 'User' or 'AI'.
3.  For the 'User's' speech, identify any grammatical mistakes or awkward phrasing. For each mistake, provide the incorrect phrase, a suggested correction, and a brief explanation.
4.  Rate the user on the following 6 dimensions on a scale of 0 to 5 (can be decimal): 'Clarity', 'Grasping & Answering', 'Understanding', 'Language Proficiency', 'Conciseness', and 'Speaking to the Topic'.
5.  Calculate an 'overallScore' from 0 to 5, representing a weighted average of the dimensions.
6.  Provide a list of the most frequently used filler words by the user and their counts.
7.  Offer a bulleted list of 3-5 clear, actionable 'feedback' points for improvement.
8.  Return the entire analysis in the specified JSON format.`;

export const analyzeAudio = async (audioFile: File): Promise<AnalysisResult> => {
  const ai = getAiClient();
  const base64Audio = await fileToBase64(audioFile);
  const audioPart = { inlineData: { mimeType: audioFile.type, data: base64Audio } };
  const textPart = { text: singleAnalysisPrompt };

  const callApi = async (): Promise<AnalysisResult> => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [textPart, audioPart] },
      config: { responseMimeType: "application/json", responseSchema: analysisSchema }
    });
    return JSON.parse(response.text.trim());
  };

  try {
    // Run 3 analyses in parallel for accuracy and average the scores
    const results = await Promise.all([callApi(), callApi(), callApi()]);

    const avgResult = results[0]; // Use the first result as the base for text content
    
    // Average overall score
    avgResult.overallScore = parseFloat((results.reduce((acc, r) => acc + r.overallScore, 0) / results.length).toFixed(2));
    
    // Average dimension scores
    avgResult.dimensions.forEach((dim, index) => {
      const avgScore = results.reduce((acc, r) => acc + r.dimensions[index].score, 0) / results.length;
      dim.score = parseFloat(avgScore.toFixed(2));
    });

    return avgResult;

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
        improvementSummary: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        areasForNextFocus: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
    },
    required: ["dimensionChanges", "improvementSummary", "areasForNextFocus"],
};

const comparisonPrompt = `You are a world-class speech and communication coach. You will be given two JSON objects representing two different speech analyses for the same user: an 'older' analysis and a 'newer' analysis. Your task is to compare the user's performance between the two.

Instructions:
1.  Compare the scores for each dimension between the old and new analyses. The JSON provides these scores directly.
2.  Provide a bulleted 'improvementSummary' highlighting the key areas where the user has improved. Be specific and refer to the data. If performance worsened in some areas, state that genuinely.
3.  Provide a bulleted list of 'areasForNextFocus', suggesting what the user should work on next based on the comparison.
4.  Return the entire comparison in the specified JSON format. The 'dimensionChanges' should reflect the 'oldScore' and 'newScore' from the provided JSONs for each dimension.`;

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