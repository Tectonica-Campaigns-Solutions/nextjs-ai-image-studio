import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, clientId, promptId, botType } = body;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        title,
        client_id: clientId,
        bot_type: botType,
        prompt_id: promptId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get("clientId");
    const botType = searchParams.get("botType");

    const supabase = await createClient();

    let query = supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    if (botType) {
      query = query.eq("bot_type", botType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
