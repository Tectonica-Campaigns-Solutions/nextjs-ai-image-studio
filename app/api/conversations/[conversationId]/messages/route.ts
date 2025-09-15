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

        await supabase.from("message_files").insert({
          message_id: messageId,
          file_id: file.fileId,
          created_at: new Date().toISOString(),
        });
      }
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

    // @ts-ignore
    const response = await client?.responses.create({
      prompt: { id: promptId },
      model: "gpt-4-turbo",
      input: [...conversationHistory, inputMessage],
      tools: [
        {
          type: "file_search",
          vector_store_ids: ["vs_68af2b3491e08191b2701410fed7e56f"],
        },
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
                description:
                  "What changes to make: add, remove, modify elements",
              },
            },
            required: ["image_url", "instructions"],
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
        // {
        //   type: "function",
        //   name: "image_action_disambiguation",
        //   description:
        //     "Use this tool whenever it is unclear if the user wants to create a new image, edit an uploaded image, or combine multiple images. This tool asks clarifying questions to help the user decide the right path.",
        //   strict: true,
        //   parameters: {
        //     type: "object",
        //     properties: {
        //       question: {
        //         type: "string",
        //         description:
        //           "The clarifying question to ask the user (e.g., 'Do you want to create a new image, edit an existing one, or combine images?').",
        //       },
        //       options: {
        //         type: "array",
        //         description:
        //           "List of possible user choices to clarify intent. These will be shown as buttons in the UI.",
        //         items: {
        //           type: "string",
        //         },
        //       },
        //     },
        //     required: ["question", "options"],
        //     additionalProperties: false,
        //   },
        // },
        // {
        //   type: "function",
        //   name: "generate_image_post_request",
        //   description:
        //     "ONLY use this function when the user EXPLICITLY asks for an image generation. DO NOT use for greetings, general questions, or casual conversation. The user must specifically request an image, picture, drawing, or visual creation.",
        //   strict: true,
        //   parameters: {
        //     type: "object",
        //     properties: {
        //       prompt: {
        //         type: "string",
        //         description:
        //           "Description or instructions for the desired image",
        //       },
        //     },
        //     required: ["prompt"],
        //     additionalProperties: false,
        //   },
        // },
        // {
        //   type: "function",
        //   name: "on_image_edit_request",
        //   description:
        //     "Always call this function immediately whenever the user says they want to edit, modify, or change an image. Do not ask questions and do not respond with text.",
        //   strict: true,
        //   parameters: {
        //     type: "object",
        //     properties: {
        //       image_url: {
        //         type: "string",
        //         description: "URL or reference to the uploaded image.",
        //       },
        //     },
        //     required: ["image_url"],
        //     additionalProperties: false,
        //   },
        // },
        // {
        //   type: "function",
        //   name: "combine_images",
        //   description:
        //     "Use this function when the user uploads multiple images and explicitly asks to combine them. You must return the SAME file_ids that were provided in the user input. Never invent or generate new IDs.",
        //   strict: true,
        //   parameters: {
        //     type: "object",
        //     properties: {
        //       prompt: {
        //         type: "string",
        //         description:
        //           "Instructions on how to arrange or combine the uploaded images.",
        //       },
        //       file_ids: {
        //         type: "array",
        //         description:
        //           "List of OpenAI file_ids provided in the user input. Use exactly these values, do not generate or guess.",
        //         items: { type: "string" },
        //       },
        //     },
        //     required: ["prompt", "file_ids"],
        //     additionalProperties: false,
        //   },
        // },
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

    console.log({
      imageGenerationTool,
      imageEditTool,
      imageCombineTool,
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

      const imageResponse = await fetch(image_url);
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

      // finalMessage =
      //   fileIds?.find((f: any) => f.fileUrl)?.fileUrl ||
      //   response?.output_text ||
      //   "";
      // activateEditImage = true;
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

        console.log({ params, instructions, imageUrls });

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
