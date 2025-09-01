import { openai } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = await params;

    const body = await request.json();
    const { content, promptId, fileIds } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get previous messages
    const { data: previousMessages } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(10);

    const conversationHistory = (previousMessages ?? []).map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: [
        {
          type: msg.role === "assistant" ? "output_text" : "input_text",
          text: msg.content,
        },
      ],
    }));

    // Save new user message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: content,
      created_at: new Date().toISOString(),
    });

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // @ts-ignore
    const response = await openai.responses.create({
      prompt: {
        id: promptId,
      },
      model: "gpt-4-turbo",
      input: [
        ...conversationHistory,
        {
          role: "user",
          content: [{ type: "input_text", text: content }],
        },
      ],
      tools: [
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
      ],
    });

    // TESTING
    let finalMessage = response.output_text;

    const imageGenerationTool = response.tools.find(
      (tool) =>
        tool.type === "function" && tool.name === "generate_image_post_request"
    );

    console.log({ response: JSON.stringify(response, null, 2) });

    // Check if this is a simple greeting or generic message
    const isSimpleMessage =
      /^(hi|hello|hey|greetings|howdy|hola|hi there|good morning|good afternoon|good evening)$/i.test(
        content.trim()
      );

    // Only proceed with image generation if it's not a simple greeting and the tool was called
    if (imageGenerationTool && !isSimpleMessage) {
      // const parameters = imageGenerationTool.parameters;

      const conversationText = conversationHistory
        .map((msg) => msg.content.map((c) => c.text).join(" "))
        .join(" ");

      const prompt = `"${conversationText}" "${content}"`;

      console.log(prompt);

      try {
        const imageResp = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/generate-image`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
          }
        );
        const imageData = await imageResp.json();

        // const imageBase64 = imageData[0]?.output;

        // // Upload to supabase
        // const { data: uploadData, error: uploadError } = await supabase.storage
        //   .from("images")
        //   .upload(`/${conversationId}/${Date.now()}.png`, imageBase64);

        // const imageUrl = uploadData?.fullPath;
        // console.log({ imageUrl });

        finalMessage =
          imageData[0].output[0].url || "No se pudo generar la imagen";
      } catch (error) {
        console.error("Error generando imagen:", error);
        finalMessage = "Ocurrió un error generando la imagen.";
      }
    }

    // console.log({ finalMessage });

    // Save assistant message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: finalMessage,
      created_at: new Date().toISOString(),
    });

    return Response.json({ message: finalMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
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

    const formattedMessages =
      messages?.map((msg) => ({
        id: msg.id,
        role: msg.role,
        text: msg.content,
        timestamp: new Date(msg.created_at),
        fileIds: msg.file_ids,
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
