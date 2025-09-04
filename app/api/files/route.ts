import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();

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

    const fileName =
      "name" in file && typeof file.name === "string"
        ? file.name
        : "uploaded_file";
    const fileType = file.type || "application/octet-stream";
    const fileExt = fileName.split(".").pop()?.toLowerCase();

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const uniqueFileName = `${timestamp}_${randomString}_${fileName}`;

    let supabaseUrl = null;
    let supabasePath = null;

    try {
      const bucketName = "Images";

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(uniqueFileName, buffer, {
          contentType: fileType,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Error uploading to Supabase:", uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uniqueFileName);

      supabaseUrl = urlData.publicUrl;
      supabasePath = uploadData.path;

      console.log("✅ File uploaded to Supabase:", supabaseUrl);
    } catch (supabaseError) {
      console.error("Supabase upload failed:", supabaseError);
    }

    const uploadedFile = await client.files.create({
      file: file as any,
      purpose: "assistants",
    });

    return NextResponse.json({
      success: true,
      fileId: uploadedFile.id,
      filename: uploadedFile.filename,
      bytes: uploadedFile.bytes,
      createdAt: uploadedFile.created_at,
      supabaseUrl: supabaseUrl,
      supabasePath: supabasePath,
      isImage: ["png", "jpg", "jpeg", "gif", "webp"].includes(fileExt || ""),
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
