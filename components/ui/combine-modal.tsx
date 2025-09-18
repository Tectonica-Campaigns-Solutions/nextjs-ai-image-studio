import { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Upload } from "lucide-react";
import { FileAttachment } from "@/lib/types";

type CombineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  handleDownloadImage: (image: string) => void;
  handleAddImageToConversation: (
    image: string,
    userPrompt: string,
    attachedFiles: FileAttachment[]
  ) => void;
  handleEditCurrentImage: (image: string) => void;
};

type ImageSize = "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "21:9";

const imageSizeOptions: { value: ImageSize; label: string }[] = [
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "21:9", label: "21:9" },
];

export default function CombineModal({
  isOpen,
  onClose,
  imageUrl,
  handleDownloadImage,
  handleAddImageToConversation,
  handleEditCurrentImage,
}: CombineModalProps) {
  if (!isOpen) return null;

  const [isLoading, setIsLoading] = useState(false);
  const [responseImage, setResponseImage] = useState("");
  const [promptValue, setPromptValue] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize>("3:4");
  const [uploadedImages, setUploadedImages] = useState<FileAttachment[]>([]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    setIsLoading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/files", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (data.supabaseUrl) {
          setUploadedImages((prev) => [
            ...prev,
            {
              file,
              uploading: true,
              fileId: data.fileId,
              fileUrl: data.supabaseUrl,
            },
          ]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!imageUrl) return;

    setIsLoading(true);
    try {
      const url =
        process.env.NODE_ENV === "development"
          ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/external/flux-pro-image-combine`
          : `https://qwen-image-editor-production-49d4.up.railway.app/api/external/flux-pro-image-combine`;

      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({
          prompt: promptValue,
          imageUrls: [imageUrl, ...uploadedImages.map((f) => f.fileUrl)],
          settings: {
            aspect_ratio: imageSize || "1:1",
          },
        }),
      });

      const responseValues = await response.json();
      setResponseImage(responseValues.image);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-lg relative w-full max-w-[90vw] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Combine Images</h2>
          <button
            className="text-gray-500 hover:text-gray-800 text-3xl leading-none pb-1"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col gap-6">
            {/* Input section */}
            <div>
              <label className="block mb-1 font-medium">Prompt</label>
              <textarea
                className="w-full min-h-[40px] max-h-[80px] resize-none px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Describe how to combine the images"
                disabled={isLoading}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                Upload additional images
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                />
              </label>

              <select
                className="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[140px] h-[40px]"
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value as ImageSize)}
                disabled={isLoading}
              >
                {imageSizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <Button
                onClick={handleSubmit}
                disabled={isLoading || !imageUrl}
                className="h-[40px]"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div>
              {/* Preview uploaded images */}
              {uploadedImages.length > 0 && (
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg pb-3">Additional images</h3>
                  <div className="flex gap-3">
                    {uploadedImages.map((file, idx) => (
                      <div
                        key={idx}
                        className="overflow-hidden rounded-lg border border-gray-200"
                      >
                        <img
                          src={file.fileUrl}
                          alt={`upload-${idx}`}
                          className="w-[100px] h-auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Preview base image */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg pb-3">Base image</h3>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <img src={imageUrl} alt="Base" className="w-full h-auto" />
                  </div>
                </div>
              </div>

              {/* Result section */}
              <div className="flex-1 min-w-0 mt-4">
                <h3 className="font-bold text-lg pb-3">Combined image</h3>
                {responseImage ? (
                  <>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <img
                        src={responseImage}
                        alt="Combined"
                        className="w-full h-auto"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        className="px-3 py-1 rounded-lg border border-black bg-white text-black hover:bg-gray-100 text-sm"
                        onClick={() => handleDownloadImage(responseImage)}
                      >
                        Save
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg border border-black bg-white text-black hover:bg-gray-100 text-sm"
                        onClick={async () => {
                          setIsLoading(true);
                          await handleAddImageToConversation(
                            responseImage,
                            promptValue,
                            uploadedImages
                          );
                          setIsLoading(false);
                        }}
                      >
                        Add to conversation
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg border border-black bg-white text-black hover:bg-gray-100 text-sm"
                        onClick={() => handleEditCurrentImage(responseImage)}
                      >
                        Edit this image
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-100 rounded-lg flex flex-col items-center justify-center min-h-[300px] border border-gray-200">
                    <div className="text-gray-500">No image generated yet</div>
                    {isLoading && (
                      <Loader2 className="h-10 mt-10 w-10 animate-spin text-blue-500" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
