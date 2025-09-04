import { createClient } from "@/lib/supabase/server";
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

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const client = getOpenAIClient();
    const supabase = await createClient();

    const { conversationId } = await params;

    const body = await request.json();
    const { content, promptId, fileIds } = body;

    if (!content && fileIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get previous messages
    const { data: previousMessages } = await supabase
      .from("messages")
      .select(
        `
          id,
          role,
          content,
          message_files (
            file_id,
            files (
              file_name,
              file_url
            )
          )
        `
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(10);

    const conversationHistory = (previousMessages ?? []).map((msg) => {
      const baseContent = [
        {
          type: msg.role === "assistant" ? "output_text" : "input_text",
          text: msg.content,
        },
      ];

      const fileContent =
        msg.message_files?.map((mf: any) => {
          const ext = mf.files?.file_name?.split(".").pop()?.toLowerCase();
          return {
            type: ext === "pdf" ? "input_file" : "input_image",
            file_id: mf.file_id,
          };
        }) || [];

      return {
        role: msg.role === "assistant" ? "assistant" : "user",
        content: [...baseContent, ...fileContent],
      };
    });

    // Save new user message
    const { data: insertedMessage, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: content,
        created_at: new Date().toISOString(),
      })
      .select();

    if (messageError) {
      return NextResponse.json(
        { error: "Failed to save message" },
        { status: 500 }
      );
    }

    const messageId = insertedMessage?.[0]?.id;

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Save file associations in message_files
    if (messageId && fileIds && fileIds.length > 0) {
      for (const file of fileIds) {
        const { data: uploadedFile } = await supabase
          .from("files")
          .insert({
            file_id: file.fileId,
            file_url: file.fileUrl,
            file_name: file.name,
            conversation_id: conversationId,
          })
          .select()
          .single();

        const result = await supabase.from("message_files").insert({
          message_id: messageId,
          file_id: file.fileId,
          created_at: new Date().toISOString(),
        });
      }
    }

    // @ts-ignore
    const response = await client?.responses.create({
      prompt: {
        id: promptId,
      },
      model: "gpt-4-turbo",
      input: [
        ...conversationHistory,
        {
          role: "user",
          content: [
            { type: "input_text", text: content },
            ...(fileIds || []).map((file: any) => {
              const ext = file.name?.split(".").pop()?.toLowerCase();

              return {
                type: ext === "pdf" ? "input_file" : "input_image",
                file_id: file.fileId,
              };
            }),
          ],
        },
      ],
      tools: [
        {
          type: "file_search",
          vector_store_ids: ["vs_68af2b3491e08191b2701410fed7e56f"],
        },
        {
          type: "function",
          name: "generate_image_post_request",
          description:
            "ONLY use this function when the user EXPLICITLY asks for an image generation. DO NOT use for greetings, general questions, or casual conversation. The user must specifically request an image, picture, drawing, or visual creation.",
          strict: true,
          parameters: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description:
                  "Description or instructions for the desired image",
              },
            },
            required: ["prompt"],
            additionalProperties: false,
          },
        },
        {
          type: "function",
          name: "on_image_edit_request",
          description:
            "Always call this function immediately whenever the user says they want to edit, modify, or change an image. Do not ask questions and do not respond with text.",
          strict: true,
          parameters: {
            type: "object",
            properties: {
              image_url: {
                type: "string",
                description: "URL or reference to the uploaded image.",
              },
            },
            required: ["image_url"],
            additionalProperties: false,
          },
        },
      ],
    });

    // Flags
    let activateEditImage = null;

    // Check if we need to generate a image
    let finalMessage = response?.output_text || "";

    // Tools
    const imageGenerationTool = response?.output?.find(
      (item) =>
        item.type === "function_call" &&
        item.name === "generate_image_post_request" &&
        item.status === "completed"
    );
    const imageEditTool = response?.output?.find(
      (item) =>
        item.type === "function_call" &&
        item.name === "on_image_edit_request" &&
        item.status === "completed"
    );

    // console.log({ imageEditTool });

    // Only proceed with image generation if it's not a simple greeting and the tool was called
    if (imageGenerationTool) {
      // const parameters = imageGenerationTool.parameters;

      const conversationText = conversationHistory
        .map((msg) => msg.content.map((c) => c.text).join(" "))
        .join(" ");

      console.log({ conversationHistory, conversationText });

      try {
        const imageResp = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/external/text-to-image`,
          {
            method: "POST",
            body: JSON.stringify({
              prompt: `${conversationText} ${content}, your trained style`,
              useRAG: "true",
              settings: {
                image_size: "landscape_4_3",
                num_inference_steps: 30,
                guidance_scale: 2.5,
                num_images: 1,
                output_format: "png",
                negative_prompt: "",
                acceleration: "none",
                seed: 12345,
              },
            }),
          }
        );

        if (!imageResp.ok) {
          throw new Error(`Image generation failed: ${imageResp.status}`);
        }

        console.log("generating image");

        const imageData = await imageResp.json();
        if (imageData?.images) {
          const imageUrl = imageData.images[0]?.url || imageData.image;

          if (response?.output_text) {
            finalMessage = `${response.output_text}\n\n${imageUrl}`;
          } else {
            finalMessage = imageUrl;
          }
        } else {
          finalMessage = response?.output_text || "Image generation failed";
        }
      } catch (error) {
        console.error("Error generating image:", error);
        finalMessage = "Error generating image.";
      }
    } else if (imageEditTool) {
      finalMessage =
        fileIds?.find((f: any) => f.fileUrl)?.fileUrl ||
        response?.output_text ||
        "";

      activateEditImage = true;
    }

    // Save assistant message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: finalMessage,
      created_at: new Date().toISOString(),
    });

    return Response.json({ message: finalMessage, activateEditImage });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message", code: error?.code },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = await params;

    const supabase = await createClient();

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Fetch associated files for each message
    const messageIds = messages?.map((msg) => msg.id) || [];
    let filesByMessage: Record<string, any[]> = {};
    if (messageIds.length > 0) {
      const { data: messageFiles } = await supabase
        .from("message_files")
        .select(
          `
            message_id,
            file_id,
            files ( id, file_name )
          `
        )
        .in("message_id", messageIds);

      messageFiles?.forEach((mf) => {
        if (!filesByMessage[mf.message_id]) filesByMessage[mf.message_id] = [];
        filesByMessage[mf.message_id].push({
          fileId: mf.file_id, // @ts-ignore
          name: mf.files.file_name,
        });
      });
    }

    const formattedMessages =
      messages?.map((msg) => ({
        id: msg.id,
        role: msg.role,
        text: msg.content,
        timestamp: new Date(msg.created_at),
        attachedFiles: filesByMessage[msg.id] || [],
      })) || [];

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
