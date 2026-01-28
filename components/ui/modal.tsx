import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  handleDownloadImage: (image: string) => void;
  handleAddImageToConversation: (image: string, userPrompt: string) => void;
  handleEditCurrentImage: (image: string) => void;
};

type ImageSize =
  | "square_hd"
  | "square"
  | "portrait_4_3"
  | "portrait_16_9"
  | "landscape_4_3"
  | "landscape_16_9";

const imageSizeOptions: { value: ImageSize; label: string }[] = [
  { value: "square_hd", label: "Square HD" },
  { value: "square", label: "Square" },
  { value: "portrait_4_3", label: "Portrait 4:3" },
  { value: "portrait_16_9", label: "Portrait 16:9" },
  { value: "landscape_4_3", label: "Landscape 4:3" },
  { value: "landscape_16_9", label: "Landscape 16:9" },
];

export default function Modal({
  isOpen,
  onClose,
  imageUrl,
  handleDownloadImage,
  handleAddImageToConversation,
  handleEditCurrentImage,
}: ModalProps) {
  if (!isOpen) return null;

  const [isLoading, setIsLoading] = useState(false);
  const [responseImage, setResponseImage] = useState("");
  const [promptValue, setPromptValue] = useState("");
  const [isEditCurrentImage, setIsEditCurrentImage] = useState<boolean>(false);
  const [imageSize, setImageSize] = useState<ImageSize>("square_hd");

  const handleSubmit = async (imageUrl: string) => {
    setIsLoading(true);

    try {
      // NOTE: /api/external/edit-image endpoint has been removed
      // This functionality is no longer available
      console.error("Edit image endpoint has been removed");
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.log(error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-lg relative w-full max-w-[90vw] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Edit Image</h2>
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
            <div className="w-full">
              <label className="block mb-1 font-medium">Prompt</label>
              <div className="flex flex-row gap-2 w-full items-center">
                <textarea
                  className="flex-1 min-h-[40px] max-h-[80px] resize-none px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Describe changes to the image"
                  disabled={isLoading}
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(imageUrl);
                    }
                  }}
                />
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px] h-[40px]"
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
                  onClick={() => handleSubmit(imageUrl)}
                  disabled={isLoading}
                  className="h-[40px]"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Images section */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg pb-3">Original image</h3>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <img
                    src={imageUrl}
                    alt="Modal Image"
                    className="w-full h-auto"
                  />
                </div>
                {isEditCurrentImage && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      className="px-3 py-1 rounded-lg border border-black bg-white text-black hover:bg-gray-100 text-sm"
                      onClick={() => handleDownloadImage(imageUrl)}
                    >
                      Save
                    </button>
                    <button
                      className="px-3 py-1 rounded-lg border border-black bg-white text-black hover:bg-gray-100 text-sm"
                      onClick={async () => {
                        setIsLoading(true);
                        await handleAddImageToConversation(
                          imageUrl,
                          promptValue
                        );
                      }}
                    >
                      Add image to conversation
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg pb-3">Edited image</h3>
                {responseImage !== "" ? (
                  <>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <img
                        src={responseImage}
                        alt="Edited"
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
                            promptValue
                          );
                        }}
                      >
                        Add image to conversation
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg border border-black bg-white text-black hover:bg-gray-100 text-sm"
                        onClick={() => {
                          handleEditCurrentImage(responseImage);
                          setResponseImage("");
                          setIsEditCurrentImage(true);
                        }}
                      >
                        Edit this image
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-100 rounded-lg flex flex-col items-center justify-center min-h-[300px] border border-gray-200">
                    <div className="text-gray-500">No image generated yet</div>
                    {isLoading ? (
                      <Loader2 className="h-10 mt-10 w-10 animate-spin text-blue-500" />
                    ) : null}
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
