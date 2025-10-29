import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult, Dimension } from '../types';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        overallScore: {
            type: Type.NUMBER,
            description: "The single, overall context-weighted score from 0 to 5. Can be a decimal."
        },
        dimensionAnalysis: {
            type: Type.ARRAY,
            description: "An array of performance dimensions, each with its own score.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Name of the dimension (e.g., 'Clarity in speaking')." },
                    score: { type: Type.NUMBER, description: "Overall score for this dimension from 0 to 5." }
                },
                required: ['name', 'score']
            }
        },
        feedback: {
            type: Type.ARRAY,
            description: "A list of specific, actionable feedback points for the user to improve their communication skills.",
            items: {
                type: Type.STRING
            }
        },
        fillerWords: {
            type: Type.ARRAY,
            description: "A list of filler words used by the user and the count of each. If none, this should be an empty array.",
            items: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING, description: "The filler word used (e.g., 'um', 'like')." },
                    count: { type: Type.INTEGER, description: "How many times the filler word was used." }
                },
                required: ['word', 'count']
            }
        },
        conversation: {
            type: Type.ARRAY,
            description: "A turn-by-turn transcript of the conversation.",
            items: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING, enum: ['User', 'AI'] },
                    text: { type: Type.STRING, description: "The transcribed text for this turn." },
                    mistakes: {
                        type: Type.ARRAY,
                        description: "A list of identified mistakes in the user's speech for this turn. Empty if no mistakes.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                incorrectPhrase: { type: Type.STRING, description: "The exact phrase from the text that is incorrect." },
                                correction: { type: Type.STRING, description: "The suggested correction for the phrase." },
                                explanation: { type: Type.STRING, description: "A brief explanation of the mistake." }
                            },
                            required: ['incorrectPhrase', 'correction', 'explanation']
                        }
                    }
                },
                required: ['speaker', 'text']
            }
        }
    },
    required: ['overallScore', 'dimensionAnalysis', 'feedback', 'fillerWords', 'conversation']
};

const prompt = `
You are an expert communication coach with a PhD in linguistics. Analyze the provided audio file of a conversation between a 'User' and an 'AI', focusing exclusively on the User's speech.

Your analysis must be a deep, multi-faceted evaluation of their communication skills. Your entire output must be a single JSON object conforming to the provided schema.

1.  **Overall Score**: Provide a single, context-weighted overall score from 0.0 to 5.0.

2.  **Dimension Analysis**: Evaluate the user across the following 6 dimensions. For each, provide an overall score from 0.0 to 5.0.
    *   Clarity in speaking
    *   Grasping and then answering
    *   Understanding
    *   Language Proficiency
    *   Conciseness
    *   Speaking up to the topic

3.  **Conversation Transcript**: Provide a full, turn-by-turn transcript of the entire conversation. For each turn, specify the speaker ('User' or 'AI') and the text.
    *   **Mistake Highlighting**: For the User's turns ONLY, identify any grammatical errors, awkward phrasing, or idiomatic mistakes. For each mistake, specify the exact \`incorrectPhrase\`, a suggested \`correction\`, and a brief \`explanation\`. If there are no mistakes in a turn, the \`mistakes\` array should be empty or omitted.

4.  **Actionable Feedback**: Provide a list of 5-10 specific, bullet-point style feedback items for improvement based on your analysis.

5.  **Filler Words**: Identify the top 3-5 most frequently used filler words (e.g., 'um', 'uh', 'like') and provide a count for each. If none are used, return an empty array.

Analyze the audio and return only the structured JSON.
`;

const performSingleAnalysis = async (ai: GoogleGenAI, audioPart: any): Promise<AnalysisResult> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [audioPart, { text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: analysisSchema,
        },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    
    if (!result.overallScore || !result.dimensionAnalysis || !result.feedback || !result.fillerWords || !result.conversation) {
        throw new Error("Invalid response structure from API. Missing required fields.");
    }
    return result as AnalysisResult;
};

export const analyzeAudio = async (audioFile: File): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("Configuration Error: The API_KEY environment variable is not set. Please add it to your Vercel project's Environment Variables settings and redeploy.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const audioPart = await fileToGenerativePart(audioFile);
  const analysisRuns = 3;

  try {
    const analysisPromises: Promise<AnalysisResult>[] = [];
    for (let i = 0; i < analysisRuns; i++) {
        analysisPromises.push(performSingleAnalysis(ai, audioPart));
    }

    const results = await Promise.all(analysisPromises);
    
    // Use the first result for qualitative data (feedback, transcript, etc.)
    const finalResult = { ...results[0] };

    // Average the scores
    const totalOverallScore = results.reduce((sum, result) => sum + result.overallScore, 0);
    finalResult.overallScore = totalOverallScore / analysisRuns;

    const averagedDimensions: Dimension[] = [];
    if (finalResult.dimensionAnalysis) {
        finalResult.dimensionAnalysis.forEach(dimension => {
            const totalDimScore = results.reduce((sum, result) => {
                const correspondingDim = result.dimensionAnalysis.find(d => d.name === dimension.name);
                return sum + (correspondingDim ? correspondingDim.score : 0);
            }, 0);
            averagedDimensions.push({
                name: dimension.name,
                score: totalDimScore / analysisRuns
            });
        });
        finalResult.dimensionAnalysis = averagedDimensions;
    }

    return finalResult;

  } catch (error) {
    console.error("Error analyzing audio with Gemini API:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred during audio analysis.");
  }
};