"use server"

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

export async function analyzeResume(fileUrl) {
  console.log("analyzeResume: fileUrl:", fileUrl);
  try {
    // Fetch the PDF directly to array buffer
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    // Get the array buffer
    const pdfResp = await response.arrayBuffer();
    
    // Get the content type
    const fileType = response.headers.get('content-type') || 'application/pdf';
    
    // Check if file type is allowed
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(fileType)) {
      throw new Error('File type not supported, allowed types are pdf, jpeg, png');
    }

    const contents = [
      {
        text: `
        Analyze the attached resume to determine the quality of the resume by giving it a score between 1 to 10 and providing detailed feedback about the good bad and ugly aspects of each one of the following categories:
        clarity - the layout and formatting, readability
        content - the relevance and completeness of information
        impact - the way the achievements and accomplishments are presented
        grammar - the accuracy and consistency of language
        skills - the presentation and relevance of the skills
        Respond in json format similar to the following:
        {
          "clarity": {
            "score": 8,
            "feedback": {
              "good": "Well-organized sections with clear headings.",
              "bad": "Some sections could be more concise.",
              "ugly": "Too many bullet points in the experience section."
            }
          },
          "content": {
            "score": 7,
            "feedback": {
              "good": "Relevant skills highlighted for the target role.",
              "bad": "Missing quantifiable achievements in some roles.",
              "ugly": "Too much focus on responsibilities rather than achievements."
            }
          },
          "impact": {
            "score": 6,
            "feedback": {
              "good": "Strong action verbs used throughout.",
              "bad": "Some achievements lack specific metrics.",
              "ugly": "Impact of work not clearly demonstrated in all roles."
            }
          },
          "grammar": {
            "score": 9,
            "feedback": {
              "good": "Generally good grammar and spelling.",
              "bad": "Some inconsistent tense usage.",
              "ugly": "A few typos and punctuation errors."
            }
          },
          "skills": {
            "score": 7,
            "feedback": {
              "good": "Good balance of technical and soft skills.",
              "bad": "Some skills listed without context or evidence.",
              "ugly": "Missing some key skills relevant to the industry."
            }
          }
        }
        `
      },
      {
        inlineData: {
          mimeType: fileType,
          data: Buffer.from(pdfResp).toString("base64")
        }
      }
    ];

    const responseWow = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: contents
    });
    console.log(responseWow)

    const responseText = responseWow.text;
    console.log("Raw response:", responseText);

    if (responseText != null) {
      try {
        // Clean the response by removing markdown code blocks if they exist
        let cleanedResponse = responseText;
        
        // If the response starts with ```json or similar, clean it up
        if (responseText.trim().startsWith('```')) {
          // Extract content between triple backticks
          const matches = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (matches && matches[1]) {
            cleanedResponse = matches[1];
          } else {
            // If no matching end backticks, just remove the start
            cleanedResponse = responseText.replace(/^```(?:json)?\s*/m, '');
          }
        }
        
        console.log("Cleaned response:", cleanedResponse);
        return JSON.parse(cleanedResponse)
      } catch (error){
        console.error("Error", error);
      }

    } else {
      throw new Error("No response from Gemini");
    }

  } catch (error) {
    if (error.message !== 'File type not supported, allowed types are pdf, jpeg, png') {
      console.error("Error analyzing resume:", error);
      throw new Error("Failed to analyze resume");
    } else {
      throw error;
    }
  }
}