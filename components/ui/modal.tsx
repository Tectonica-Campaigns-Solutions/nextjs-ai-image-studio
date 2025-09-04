import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  handleDownloadImage: (image: string) => void;
  handleAddImageToConversation: (image: string) => void;
};

export default function Modal({
  isOpen,
  onClose,
  imageUrl,
  handleDownloadImage,
  handleAddImageToConversation,
}: ModalProps) {
  if (!isOpen) return null;
  const [isLoading, setIsLoading] = useState(false);
  const [responseImage, setResponseImage] = useState("");
  const [promptValue, setPromptValue] = useState("");

  const handleSubmit = async (imageUrl: string) => {
    setIsLoading(true);

    try {
      const imageResponse = await fetch(imageUrl);
      const blob = await imageResponse.blob();

      // @ts-ignore
      const file = new File([blob], "image.png", { type: blob.type });

      const formData = new FormData();
      formData.append("image", file);
      formData.append("prompt", promptValue);
      formData.append("useRag", "true");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/external/edit-image`,
        {
          method: "POST",
          body: formData,
        }
      );
      const responseValues = await response.json();

      setResponseImage(responseValues.image);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.log(error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 w-full">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[300px] max-w-[90vw] relative w-full">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-4xl px-2"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="flex flex-col gap-6">
          <div className="w-full">
            <label className="block mb-1">Prompt</label>
            <div className="flex flex-row gap-2 w-full items-center">
              <textarea
                className="flex-1 min-h-[40px] max-h-[80px] resize-none px-3 py-2"
                placeholder="Describe changes to the image"
                disabled={isLoading}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
              />
              <Button
                onClick={() => handleSubmit(imageUrl)}
                disabled={isLoading}
                className="ml-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-stretch gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg pb-3">Original image</h3>
              <img
                src={imageUrl}
                alt="Modal Image"
                className="mb-4 max-w-full rounded"
              />
            </div>
            <div className="flex-1 flex flex-col min-h-[300px] h-full">
              <h3 className="font-bold text-lg pb-3">Edited image</h3>
              {responseImage !== "" && (
                <>
                  <img
                    src={responseImage}
                    alt="Edited"
                    className="mb-4 max-w-full rounded"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      className="px-3 py-1 rounded-lg border border-black bg-white text-black hover:bg-gray-100 text-sm"
                      onClick={() => handleDownloadImage(responseImage)}
                    >
                      Save
                    </button>
                    <button
                      className="px-3 py-1 rounded-lg border border-black bg-white text-black hover:bg-gray-100 text-sm"
                      onClick={() =>
                        handleAddImageToConversation(responseImage)
                      }
                    >
                      Add image to conversation
                    </button>
                  </div>
                </>
              )}

              {responseImage === "" && (
                <div className="w-full h-full bg-grey min-h-[300px] flex flex-col items-center justify-center">
                  <div>No image generated yet</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
