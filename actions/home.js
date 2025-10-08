"use server";

import aj from "@/lib/arcjet";
import { serializedCarData } from "@/lib/helper";
import { db } from "@/lib/prisma";
import { request } from "@arcjet/next";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function getFeaturedCars(limit = 3) {
  try {
    const cars = await db.car.findMany({
      where: {
        featured: true,
        status: "AVAILABLE",
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return cars.map(serializedCarData);
  } catch (error) {
    throw new Error(`Error fetching featured cars: ${error.message}`);
  }
}

//* Function to convert a file to base64
const convert2Base64 = async (file) => {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return buffer.toString("base64");
};

export async function processImageSearch(file) {
  try {
    const req = await request();
    const decision = await aj.protect(req, {
      requested: 1,
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;

        console.error({
          code: "LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests, Please try again later.");
      }

      throw new Error("Request blocked");
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured");
    }

    const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = geminiAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const base64Image = await convert2Base64(file);
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: file.type,
      },
    };

    const prompt = `
    Analyze this car image and extract the following information for a search query:
    1. Make (manufacturer)
    2. Body Type (SUV, Sedan, Hatchback, etc.)
    3. Color

    Format your response as a clean JSON object with these fields:
    {
        "make" : "",
        "bodyType" : "",
        "color" : "",
        "confidence" : 0.0
    }

    For confidence, provide a value between 0 and 1 representing how confident you are in your overall identification,
    Only respond with JSONobject, nothing else.
    `;

    const result = await model.generateContent([imagePart, prompt]);
    const response = await result.response;
    const cleanedText = response
      .text()
      .replace(/```(?:json)?\n?/g, "")
      .trim();

    try {
      const carDetails = JSON.parse(cleanedText);

      return {
        success: true,
        data: carDetails,
      };
    } catch (parseError) {
      console.error(`Failed to parse AI response ${parseError}`);
      return {
        succes: false,
        error: "Failed to parse AI response",
      };
    }
  } catch (error) {
    throw new Error(`AI search error: ${error.message}`);
  }
}
