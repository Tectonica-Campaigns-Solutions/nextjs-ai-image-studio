import { Brain, FileText, Zap } from "lucide-react";
import { SidebarBotType } from "./types";

export const bots: SidebarBotType[] = [
  {
    id: "copy_assistant",
    name: "Copy",
    description: "Assistant for document analysis and information extraction",
    icon: FileText,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    hoverColor: "hover:bg-blue-500/20",
  },
  {
    id: "strategy_assistant",
    name: "Strategy",
    description: "Assistant for strategic planning and decision making",
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    hoverColor: "hover:bg-purple-500/20",
  },
  {
    id: "visual_assistant",
    name: "Visual",
    description: "Assistant for visual generation",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    hoverColor: "hover:bg-amber-500/20",
  },
  {
    id: "image_testing_assistant",
    name: "Image Testing",
    description: "Assistant for image generation and testing",
    icon: Zap,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    hoverColor: "hover:bg-rose-500/20",
  },
];
