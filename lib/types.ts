export type BotType =
  | "copy_assistant"
  | "strategy_assistant"
  | "visual_assistant"
  | "image_testing_assistant";

export type SidebarBotType = {
  id: BotType;
  name: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  bgColor: string;
  hoverColor: string;
  suggestions: string[];
};

export type ClientType = {
  id: string;
  name: string;
  description: string;
  bots: {
    copy_assistant_id: string;
    strategy_assistant_id: string;
    visual_assistant_id: string;
    image_testing_assistant_id: string;
  };
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "code";
  text: string;
  timestamp: Date;
  attachedFiles?: Array<{
    name: string;
    fileId: string;
  }>;
  kind?: "normal" | "disambiguation";
  options?: string[];
};

export type Conversation = {
  id: string;
  title: string;
  client_name: string;
  client_id: string;
  assistant_id: string;
  bot_type: string;
  thread_id: string;
  created_at: string;
  updated_at: string;
};
