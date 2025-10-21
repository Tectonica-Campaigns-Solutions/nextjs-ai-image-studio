import { ClientType } from "./types";

export const clients: ClientType[] = [
  {
    id: "client-example",
    name: "Client Demo",
    description: "",
    // Optional list of chat/LLM models available for this client
    availableChatModels: [
      "qwen-chat",
      ...(process.env.ENABLE_CLAUDE_SONNET === "true" ? ["claude-sonnet-4.5"] : [])
    ],
    bots: {
      copy_assistant_id:
        "pmpt_68b0b420922881939406ca7df513cec208d30e21bb75ca51",
      strategy_assistant_id:
        "pmpt_68b1a2c03738819481a002ae5f6738af0e148d650b889d3b",
      visual_assistant_id:
        "pmpt_68b1976159e481969e6a5e69a23d7738049349e1c2a1cea6",
      visual_no_rag_assistant_id:
        "pmpt_68b1b8d8bd0881948a8b5e53b64deee6012d551f26ca4780",
    },
  },
];
