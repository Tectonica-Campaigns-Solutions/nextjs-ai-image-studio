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
    const {
      content,
      role,
      botType,
      promptId,
      fileIds,
      noTriggerTools = false,
    } = body;

    console.log(
      `[CONVERSATION] Bot type: ${botType}. Content: ${content}. Prompt ID: ${promptId}. File IDs: ${JSON.stringify(
        fileIds
      )}`
    );

    const withImageTools =
      botType === "visual_no_rag_assistant" || botType === "visual_assistant";

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
      .limit(15);

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
        role: role,
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

        console.log(`Uploaded file id: ${uploadedFile.id}`);

        await supabase.from("message_files").insert({
          message_id: messageId,
          file_id: file.fileId,
          created_at: new Date().toISOString(),
        });

        console.log(`Relation between files + messages done.`);
      }
    }

    if (noTriggerTools) {
      return NextResponse.json({
        message: "Message stored successfully",
        activateEditImage: null,
      });
    }

    const inputMessage = {
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
    };

    // Tools
    const fileTools = [
      {
        type: "file_search",
        vector_store_ids: ["vs_68af2b3491e08191b2701410fed7e56f"],
      },
    ];

    const imageTools = [
      {
        type: "function",
        name: "generate_image_request",
        description:
          "Generate an image based on user requirements. IMPORTANT: If the user does not specify an aspect ratio, ALWAYS use 3:4",
        parameters: {
          type: "object",
          properties: {
            details: {
              type: "string",
              description: "Description of what should appear in the image",
            },
            aspect_ratio: {
              type: "string",
              enum: ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"],
              description:
                "Aspect ratio of the image. If the user does not specify one, ALWAYS use 3:4.",
              default: "3:4",
            },
            num_images: {
              type: "integer",
              description: "Number of images to render (max 2, default: 1)",
              minimum: 1,
              maximum: 2,
              default: 1,
            },
            output_format: {
              type: "string",
              enum: ["jpeg", "png", "webp"],
              description: "Output image format (default: jpeg)",
              default: "jpeg",
            },
          },
          required: ["details"],
        },
      },
      {
        type: "function",
        name: "edit_image_request",
        description: `
            Edit a single existing image based on user instructions.
            Only use this function when there is exactly one image to edit.
            If the user mentions multiple images, combining elements, or merging,
            do NOT use this tool—use combine_image_request instead. Only run this tool if the user has uploaded images, otherwise ask for them.
          `,
        parameters: {
          type: "object",
          properties: {
            image_url: {
              type: "string",
              description: "URL of the image to edit",
            },
            instructions: {
              type: "string",
              description: "What changes to make: add, remove, modify elements",
            },
          },
          required: ["image_url", "instructions"],
        },
      },
      {
        type: "function",
        name: "apply_branding_to_image",
        description: `
          Apply predefined branding styles to an existing image.
          Trigger only when the user provides an image URL and explicitly requests to apply branding.
          The user does not need to specify which branding style — it is handled internally.
          Do not use this tool for generating new images, combining multiple images, or performing general edits.`,
        parameters: {
          type: "object",
          properties: {
            image_url: {
              type: "string",
              format: "uri",
              description:
                "Publicly accessible URL of the image where branding should be applied.",
            },
          },
          required: ["image_url"],
        },
      },
      {
        type: "function",
        name: "combine_image_request",
        description:
          "Combine multiple images into one based on user instructions. Only run this tool if the user has uploaded images, otherwise ask for them.",
        parameters: {
          type: "object",
          properties: {
            image_urls: {
              type: "array",
              items: { type: "string" },
              description: "List of image URLs to combine",
            },
            instructions: {
              type: "string",
              description: "Instructions on how to combine the images",
            },
            aspect_ratio: {
              type: "string",
              enum: ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"],
              description: "Aspect ratio of the image (default: 1:1)",
              default: "1:1",
            },
          },
          required: ["image_urls", "instructions"],
        },
      },
    ];

    // @ts-ignore
    const response = await client?.responses.create({
      prompt: { id: promptId },
      model: "gpt-4-turbo",
      input: [...conversationHistory, inputMessage],
      tools: withImageTools ? imageTools : fileTools,
    });

    // Flags
    let activateEditImage = null;

    // Check if we need to generate a image
    let finalMessage = response?.output_text || "";

    // Tools
    const imageGenerationTool = response?.output?.find(
      (item) =>
        item.type === "function_call" &&
        item.name === "generate_image_request" &&
        item.status === "completed"
    );
    const imageEditTool = response?.output?.find(
      (item) =>
        item.type === "function_call" &&
        item.name === "edit_image_request" &&
        item.status === "completed"
    );
    const imageCombineTool = response?.output?.find(
      (item) =>
        item.type === "function_call" &&
        item.name === "combine_image_request" &&
        item.status === "completed"
    );
    const imageDisambiguationTool = response?.output?.find(
      (item) =>
        item.type === "function_call" &&
        item.name === "image_action_disambiguation" &&
        item.status === "completed"
    );
    const imageBrandingTool = response?.output?.find(
      (item) =>
        item.type === "function_call" &&
        item.name === "apply_branding_to_image" &&
        item.status === "completed"
    );

    console.log({
      imageGenerationTool,
      imageEditTool,
      imageCombineTool,
      imageBrandingTool,
      // imageDisambiguationTool,
      finalMessage,
    });

    // TOOLs
    if (imageGenerationTool) {
      // @ts-ignore
      const parameters = JSON.parse(imageGenerationTool.arguments);
      const { details, aspect_ratio, num_images, output_format } = parameters;

      console.log({ details, aspect_ratio });

      try {
        const imageResp = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/external/flux-ultra-finetuned`,
          {
            method: "POST",
            body: JSON.stringify({
              prompt: details,
              finetuneId: "a4bd761c-0f90-41cc-be78-c7b6cf22285a",
              triggerPhrase: "TCT-AI-8",
              finetuneStrength: 1.2,
              settings: {
                aspect_ratio: aspect_ratio || "3:4",
                num_images: num_images,
                safety_tolerance: 2,
                output_format: output_format,
                enable_safety_checker: true,
                raw: true,
                seed: 987654321,
              },
            }),
          }
        );

        if (!imageResp.ok) {
          throw new Error(`Image generation failed: ${imageResp.status}`);
        }

        const imageData = await imageResp.json();

        if (imageData?.image) {
          const imageUrl = imageData.image;

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
      // @ts-ignore
      const parameters = JSON.parse(imageEditTool.arguments);
      const { instructions, image_url } = parameters;

      const lastImageUrl = await getLastImageUrl(conversationId);
      const finalImage = image_url.includes("supabase.co/storage/")
        ? image_url
        : lastImageUrl;

      const imageResponse = await fetch(finalImage);
      const blob = await imageResponse.blob();

      const formData = new FormData();
      formData.append("image", blob, "image.png");
      formData.append("prompt", instructions);
      formData.append("useRag", "true");

      try {
        const imageResp = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/external/edit-image`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!imageResp.ok) {
          throw new Error(`Image generation failed: ${imageResp.status}`);
        }

        const imageData = await imageResp.json();

        if (imageData?.image) {
          const imageUrl = imageData.image;

          if (response?.output_text) {
            finalMessage = `${response.output_text}\n\n${imageUrl}`;
          } else {
            finalMessage = imageUrl;
          }
        } else {
          finalMessage =
            response?.output_text || "Image edit generation failed";
        }
      } catch (error) {
        console.error("Error generating image:", error);
        finalMessage = "Error generating image.";
      }
    } else if (imageCombineTool) {
      try {
        const params = JSON.parse((imageCombineTool as any)?.arguments);
        const { instructions, aspect_ratio } = params;

        const prevFileUrls = extractFileIds(previousMessages);

        const imageUrls = fileIds
          ? fileIds.map((f: any) => f.fileUrl)
          : prevFileUrls
          ? prevFileUrls
          : [];

        // console.log({ params, instructions, imageUrls });

        const combineResp = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/external/flux-pro-image-combine`,
          {
            method: "POST",
            body: JSON.stringify({
              prompt: instructions,
              imageUrls: imageUrls,
              settings: {
                aspect_ratio: aspect_ratio || "3:4",
              },
            }),
          }
        );

        if (!combineResp.ok) {
          throw new Error(`Image combination failed: ${combineResp.status}`);
        }

        const combineData = await combineResp.json();
        finalMessage = combineData?.image || "Image combination failed";
      } catch (err) {
        console.error("Error combining images:", err);
        finalMessage = "Error combining images.";
      }
    } else if (imageDisambiguationTool) {
      // @ts-ignore
      const parameters = JSON.parse(imageDisambiguationTool.arguments);
      const { question, options } = parameters;

      return Response.json({
        message: "",
        imageDisambiguationTool: true,
        options,
      });
    } else if (imageBrandingTool) {
      const lastImageUrl = await getLastImageUrl(conversationId);
      console.log({ lastImageUrl });

      if (!lastImageUrl) {
        finalMessage = "Upload a valid image.";
        return;
      }

      const imageResponse = await fetch(lastImageUrl);
      const blob = await imageResponse.blob();

      const formData = new FormData();
      formData.append("image", blob);

      try {
        const imageResp = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/external/seedream-v4-edit`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!imageResp.ok) {
          throw new Error(
            `Image branding generation failed: ${imageResp.status}`
          );
        }

        const imageData = await imageResp.json();
        const imageGeneratedUrl = imageData?.images[0]?.url;

        if (imageGeneratedUrl) {
          if (response?.output_text) {
            finalMessage = `${response.output_text}\n\n${imageGeneratedUrl}`;
          } else {
            finalMessage = imageGeneratedUrl;
          }
        } else {
          finalMessage =
            response?.output_text || "Image branding generation failed";
        }
      } catch (error) {
        console.error("Error generating branding image:", error);
        finalMessage = "Error generating branding image.";
      }
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

// Utils
function extractFileIds(messages: any) {
  const fileUrls: string[] = [];

  messages.forEach((msg: any) => {
    if (Array.isArray(msg.message_files)) {
      msg.message_files.forEach((item: any) => {
        if (item.files?.file_url) {
          fileUrls.push(item.files.file_url);
        }
      });
    }
  });

  return fileUrls;
}

function normalizeArgs(userPrompt: string, args: string) {
  let parsed = JSON.parse(args);

  const ratioHints =
    /(1:1|4:3|3:4|16:9|9:16|21:9|square|portrait|landscape|widescreen)/i;

  if (!ratioHints.test(userPrompt)) {
    parsed.aspect_ratio = "3:4";
  } else {
    parsed.aspect_ratio = parsed.aspect_ratio || "3:4";
  }

  return parsed;
}

async function getLastImageUrl(conversationId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("message_files")
    .select(
      `
        created_at,
        files (
          file_url,
          file_name
        ),
        messages!inner (
          conversation_id
        )
      `
    )
    .eq("messages.conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching last image:", error);
    return null;
  }

  if (!data || data.length === 0) {
    console.log(`No files found for conversation ${conversationId}`);
    return null;
  }

  const file = data[0].files;

  if (!file?.file_url) return null;

  const ext = file.file_name?.split(".").pop()?.toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);

  return isImage ? file.file_url : null;
}
