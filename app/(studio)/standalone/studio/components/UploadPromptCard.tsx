"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ImageIcon } from "lucide-react";

export interface UploadPromptCardProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadPromptCard({ onFileChange }: UploadPromptCardProps) {
  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-[#0D0D0D]">
      <Card className="w-96 shadow-xl bg-[#191919] border-none">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
            <ImageIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              Image Editor
            </h2>
            <p className="text-white">Upload an image to start editing</p>
          </div>
          <Button
            onClick={() =>
              document.getElementById("initialImageUpload")?.click()
            }
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md cursor-pointer"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Image
          </Button>
          <Input
            id="initialImageUpload"
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="sr-only w-fit"
          />
        </CardContent>
      </Card>
    </div>
  );
}
