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
    suggestions: [
      "Help me draft a fundraising email",
      "What are best practices for a letter to the editor?",
      "What's the tone of voice of our organization?",
    ],
  },
  {
    id: "strategy_assistant",
    name: "Strategy",
    description: "Assistant for strategic planning and decision making",
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    hoverColor: "hover:bg-purple-500/20",
    suggestions: [
      "Help me work on a logic model",
      "How do I build long lasting supporter relationships?",
      "What does the Stairway Model Social and Political Change says?",
    ],
  },
  {
    id: "visual_assistant",
    name: "Visual RAG",
    description: "Assistant for visual generation",
    icon: Zap,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    hoverColor: "hover:bg-amber-500/20",
    suggestions: [
      "I want to create a social media graphic",
      "I need help with a poster design",
      "I need to create an image for an event",
    ],
  },
  {
    id: "visual_no_rag_assistant",
    name: "Visual NO RAG",
    description: "Assistant for image generation with NO RAG",
    icon: Zap,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    hoverColor: "hover:bg-rose-500/20",
    suggestions: [
      "I need to generate a new image",
      // "I need to edit an existing image",
      "I want to apply branding to an existing image",
      "I need to combine several images",
    ],
  },
];
