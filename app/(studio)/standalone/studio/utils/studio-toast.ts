import { toast } from "@/hooks/use-toast";

type StudioToastPayload = {
  title: string;
  description?: string;
};

/** Visual Studio–themed toast helpers (dark surface, accent borders). */
export const studioToast = {
  success({ title, description }: StudioToastPayload) {
    return toast({
      title,
      description,
      variant: "success",
    });
  },

  error({ title, description }: StudioToastPayload) {
    return toast({
      title,
      description,
      variant: "destructive",
    });
  },
};
