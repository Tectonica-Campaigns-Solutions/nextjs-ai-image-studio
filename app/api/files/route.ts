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

export async function POST(request: NextRequest) {
  try {
    const client = getOpenAIClient();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !client) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Uploaded file is not valid" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const openaiFile = new File([buffer], (file as File).name, {
      type: file.type,
    });

    const uploadedFile = await client.files.create({
      file: openaiFile,
      purpose: "user_data",
    });

    return NextResponse.json({
      success: true,
      fileId: uploadedFile.id,
      filename: uploadedFile.filename,
      bytes: uploadedFile.bytes,
      createdAt: uploadedFile.created_at,
    });
  } catch (error) {
    console.error("Error uploading file to OpenAI:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
