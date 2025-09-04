import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openai && process.env.OPENAI_API_KEY_CHATBOT) {
    try {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY_CHATBOT,
      });
    } catch (error) {
      console.warn(
        "[OPENAI_API_KEY_CHATBOT] Failed to initialize OpenAI client:",
        error
      );
      return null;
    }
  }
  return openai;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = await params;

    const client = getOpenAIClient();
    if (!client) {
      throw new Error("Failed to initialize OpenAI client");
    }

    await client.files.delete(fileId);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file from OpenAI:", error);
    return NextResponse.json(
      {
        error: "Failed to delete file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
