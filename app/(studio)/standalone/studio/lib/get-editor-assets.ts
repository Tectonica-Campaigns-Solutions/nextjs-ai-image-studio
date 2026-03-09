import { cache } from "react";
import type {
  LogoAsset,
  FontAsset,
  FrameAsset,
} from "../types/image-editor-types";
import { DEFAULT_LOGO_ASSETS } from "../constants/editor-constants";
import { createClient } from "@/lib/supabase/server";

function getDefaultLogoAssets(): LogoAsset[] {
  return DEFAULT_LOGO_ASSETS.map((logo) => ({
    ...logo,
    variant: null as string | null,
  }));
}

async function fetchEditorAssetsForUser(caUserId: string | undefined): Promise<{
  logoAssets: LogoAsset[];
  fontAssets: FontAsset[];
  frameAssets: FrameAsset[];
  allowCustomLogo: boolean;
}> {
  if (!caUserId?.trim()) {
    return {
      logoAssets: getDefaultLogoAssets(),
      fontAssets: [],
      frameAssets: [],
      allowCustomLogo: true,
    };
  }

  try {
    const supabase = await createClient();

    const { data: clientRecord } = await supabase
      .from("clients")
      .select("id, allow_custom_logo")
      .eq("ca_user_id", caUserId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .single();

    const clientIdForFallbacks = clientRecord?.id ?? null;
    const allowCustomLogo = clientRecord?.allow_custom_logo ?? true;

    let logoAssets: LogoAsset[] = getDefaultLogoAssets();
    let fontAssets: FontAsset[] = [];
    let frameAssets: FrameAsset[] = [];

    // Logos: try RPC first, then fallback to direct queries
    const { data: logos, error: rpcError } = await supabase.rpc(
      "get_client_assets_by_ca_user_id",
      {
        p_ca_user_id: caUserId,
        p_asset_type: "logo",
        p_variant: null,
      },
    );

    if (!rpcError && logos && Array.isArray(logos) && logos.length > 0) {
      logoAssets = (
        logos as {
          file_url: string;
          display_name: string;
          variant: string | null;
        }[]
      )
        .map((logo) => ({
          url: logo.file_url,
          display_name: logo.display_name,
          variant: logo.variant ?? null,
        }))
        .filter((logo) => logo.url);
    } else if (rpcError) {
      console.warn("RPC function failed, trying direct query:", rpcError);

      const clientId =
        clientIdForFallbacks ??
        (
          await supabase
            .from("clients")
            .select("id")
            .eq("ca_user_id", caUserId)
            .eq("is_active", true)
            .is("deleted_at", null)
            .single()
        ).data?.id;

      if (clientId) {
        const { data: directLogos, error: logosError } = await supabase
          .from("client_assets")
          .select("file_url, display_name, name, variant")
          .eq("client_id", clientId)
          .eq("asset_type", "logo")
          .is("deleted_at", null)
          .order("is_primary", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (!logosError && directLogos && directLogos.length > 0) {
          logoAssets = directLogos
            .map((logo) => ({
              url: logo.file_url,
              display_name: logo.display_name,
              variant: logo.variant ?? null,
            }))
            .filter((logo) => logo.url);
        } else if (logosError) {
          console.error("Error fetching client assets:", logosError);
        }
      }
    }

    // Fonts: try RPC first, then fallback to direct queries
    const { data: fonts, error: fontsRpcError } = await supabase.rpc(
      "get_client_fonts_by_ca_user_id",
      { p_ca_user_id: caUserId },
    );

    if (!fontsRpcError && fonts && Array.isArray(fonts) && fonts.length > 0) {
      fontAssets = (
        fonts as {
          font_source: "google" | "custom";
          font_family: string;
          font_weights: string[] | null;
          file_url: string | null;
        }[]
      ).map((font) => ({
        font_source: font.font_source,
        font_family: font.font_family,
        font_weights: font.font_weights ?? ["400"],
        file_url: font.file_url ?? undefined,
      }));
    } else if (fontsRpcError) {
      console.warn(
        "RPC function failed for fonts, trying direct query:",
        fontsRpcError,
      );

      const fontClientId =
        clientIdForFallbacks ??
        (
          await supabase
            .from("clients")
            .select("id")
            .eq("ca_user_id", caUserId)
            .eq("is_active", true)
            .is("deleted_at", null)
            .single()
        ).data?.id;

      if (fontClientId) {
        const { data: directFonts, error: fontsError } = await supabase
          .from("client_fonts")
          .select("font_source, font_family, font_weights, file_url")
          .eq("client_id", fontClientId)
          .is("deleted_at", null)
          .order("is_primary", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (!fontsError && directFonts && directFonts.length > 0) {
          fontAssets = directFonts.map((font) => ({
            font_source: font.font_source as "google" | "custom",
            font_family: font.font_family,
            font_weights: font.font_weights ?? ["400"],
            file_url: font.file_url ?? undefined,
          }));
        } else if (fontsError) {
          console.error("Error fetching client fonts:", fontsError);
        }
      }
    }

    // Frames: try RPC first, then fallback to direct query
    const { data: frames, error: framesRpcError } = await supabase.rpc(
      "get_client_assets_by_ca_user_id",
      {
        p_ca_user_id: caUserId,
        p_asset_type: "frame",
        p_variant: null,
      },
    );

    if (
      !framesRpcError &&
      frames &&
      Array.isArray(frames) &&
      frames.length > 0
    ) {
      frameAssets = (
        frames as {
          file_url: string;
          display_name: string;
          variant: string | null;
        }[]
      )
        .map((frame) => ({
          url: frame.file_url,
          display_name: frame.display_name,
          variant: frame.variant ?? null,
        }))
        .filter((frame) => frame.url);
    } else if (framesRpcError) {
      console.warn(
        "RPC function failed for frames, trying direct query:",
        framesRpcError,
      );

      const frameClientId =
        clientIdForFallbacks ??
        (
          await supabase
            .from("clients")
            .select("id")
            .eq("ca_user_id", caUserId)
            .eq("is_active", true)
            .is("deleted_at", null)
            .single()
        ).data?.id;

      if (frameClientId) {
        const { data: directFrames, error: framesError } = await supabase
          .from("client_assets")
          .select("file_url, display_name, name, variant")
          .eq("client_id", frameClientId)
          .eq("asset_type", "frame")
          .is("deleted_at", null)
          .order("is_primary", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (!framesError && directFrames && directFrames.length > 0) {
          frameAssets = directFrames
            .map((frame) => ({
              url: frame.file_url,
              display_name: frame.display_name,
              variant: frame.variant ?? null,
            }))
            .filter((frame) => frame.url);
        } else if (framesError) {
          console.error("Error fetching client frames:", framesError);
        }
      }
    }

    return { logoAssets, fontAssets, frameAssets, allowCustomLogo };
  } catch (error) {
    console.error("Error in getEditorAssetsForUser:", error);
    return {
      logoAssets: getDefaultLogoAssets(),
      fontAssets: [],
      frameAssets: [],
      allowCustomLogo: true,
    };
  }
}

export const getEditorAssetsForUser = cache(fetchEditorAssetsForUser);
