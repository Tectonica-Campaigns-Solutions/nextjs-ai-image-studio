"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { AssetGallery } from "./asset-gallery";
import { FrameGallery } from "./frame-gallery";
import { FontGallery } from "./font-gallery";
import { CanvasSessionGallery } from "./CanvasSessionGallery";
import { getGoogleFontsUrl, generateFontFaceCSS } from "../../standalone/studio/utils/studio-utils";
import type { Client, ClientAsset, ClientFont, CanvasSessionSummary } from "@/app/(studio)/dashboard/types";
import { updateClientAction } from "@/app/(studio)/dashboard/actions/clients";

interface ClientDetailClientProps {
  client: Client;
  assets: ClientAsset[];
  frames: ClientAsset[];
  fonts: ClientFont[];
  variants: string[];
  canvasSessions: CanvasSessionSummary[];
}

export function ClientDetailClient({
  client,
  assets,
  frames,
  fonts,
  variants,
  canvasSessions,
}: ClientDetailClientProps) {
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email ?? "");
  const [description, setDescription] = useState(client.description ?? "");
  const [isActive, setIsActive] = useState(client.is_active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google/Custom fonts for preview (client-side only)
  if (typeof document !== "undefined" && fonts.length > 0) {
    const googleFonts = fonts.filter((f) => f.font_source === "google");
    const customFonts = fonts.filter((f) => f.font_source === "custom");
    if (googleFonts.length > 0) {
      const googleFontsData = googleFonts.map((f) => ({
        family: f.font_family,
        weights: f.font_weights || ["400"],
      }));
      const googleFontsUrl = getGoogleFontsUrl(googleFontsData);
      if (googleFontsUrl) {
        let link = document.querySelector(`link[data-google-fonts]`) as HTMLLinkElement;
        if (!link) {
          link = document.createElement("link");
          link.rel = "stylesheet";
          link.setAttribute("data-google-fonts", "true");
          document.head.appendChild(link);
        }
        link.href = googleFontsUrl;
      }
    }
    if (customFonts.length > 0) {
      let style = document.querySelector(`style[data-custom-fonts]`) as HTMLStyleElement;
      if (!style) {
        style = document.createElement("style");
        style.setAttribute("data-custom-fonts", "true");
        document.head.appendChild(style);
      }
      const fontFaceCSS = customFonts
        .map((font) => {
          if (!font.file_url) return "";
          return (font.font_weights || [])
            .map((weight: string) =>
              generateFontFaceCSS(font.font_family, font.file_url!, weight)
            )
            .join("\n");
        })
        .filter(Boolean)
        .join("\n");
      style.textContent = fontFaceCSS;
    }
  }

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    const result = await updateClientAction(client.id, {
      name,
      email,
      description: description || null,
      is_active: isActive,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/clients")}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1 text-balance">{client.name}</h1>
              <p className="text-muted-foreground text-sm text-pretty">
                Edit client, manage assets and fonts
              </p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-900 text-white hover:bg-gray-800 min-w-[140px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Client Information
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="ca_user_id" className="text-sm font-medium text-gray-700">
                  CA User ID
                </Label>
                <Input
                  id="ca_user_id"
                  value={client.ca_user_id}
                  readOnly
                  className="font-mono text-sm bg-gray-50 text-gray-500 border-gray-200"
                />
                <span className="text-xs text-gray-500">(ID used in image-editor)</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name of the client"
                  className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description of the client (optional)"
                  rows={4}
                  className="border-gray-200 focus:border-gray-400 focus:ring-gray-400 resize-none"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label
                    htmlFor="is_active"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Active Status
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    The client will be available to use its assets and fonts
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  className="data-[state=checked]:bg-gray-900 data-[state=unchecked]:bg-gray-200"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Client Assets
            </h2>
            <AssetGallery
              clientId={client.id}
              assets={assets}
              variants={variants}
              onRefresh={() => router.refresh()}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Client Frames
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Frame images overlaid on the canvas. Tag each frame with an aspect ratio (e.g. <strong>16:9</strong>, <strong>1:1</strong>) so it only appears when the canvas matches that proportion.
          </p>
          <FrameGallery
            clientId={client.id}
            frames={frames}
            onRefresh={() => router.refresh()}
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Client Fonts
          </h2>
          <FontGallery
            clientId={client.id}
            fonts={fonts}
            onRefresh={() => router.refresh()}
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Canvas Sessions
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Saved editor sessions for this client. Each session stores the canvas overlays and can be reopened in the editor.
          </p>
          <CanvasSessionGallery
            clientId={client.id}
            sessions={canvasSessions}
            onRefresh={() => router.refresh()}
          />
        </div>
      </div>
    </div>
  );
}
