"use client";

import type React from "react";
import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Modal from "@/components/ui/modal";
import {
  Building2,
  Menu,
  X,
  ChevronRight,
  Send,
  Loader2,
  ArrowLeft,
  MessageSquare,
  Clock,
  Plus,
  Trash2,
  ArrowDown,
  Paperclip,
  FileText,
  Image,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Markdown from "react-markdown";
import { bots } from "@/lib/bot";
import { clients } from "@/lib/clients";
import type { ChatMessage, ClientType, Conversation } from "@/lib/types";

const THRESHOLD = 20 * 1024 * 1024;

function DashboardContent() {
  // ...existing code...
  // Show input controls again when 'Continue conversation' is clicked
  const [forceShowInput, setForceShowInput] = useState(false);
  const [showInputConversation, setShowInputConversation] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);

  const closeEditor = () => {
    setShowModal(false);
  };

  const handleEditor = async (imageUrl: string) => {
    setImageModal(imageUrl);
    setShowModal(true);
  };

  const handleContinueConversation = async () => {
    setShowInputConversation(true);
    scrollToBottom();
  };

  const handleAddImageToConversation = async (imageUrl: string) => {
    if (!currentConversationId) return;

    setShowModal(false);
    const tempUserMessageId = `assistant-${Date.now()}`;
    const newMessage: ChatMessage = {
      role: "assistant",
      text: imageUrl,
      timestamp: new Date(),
      id: tempUserMessageId,
      attachedFiles: [],
    };

    // @ts-ignore
    const promptId = client?.bots[`${selectedBot}_id`];
    if (!promptId) {
      toast({
        title: "Bot not configured",
        description: "This bot is not available for this client",
        variant: "destructive",
      });
      return;
    }

    // Save to Supabase via your API
    const response = await fetch(
      `/api/conversations/${currentConversationId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: imageUrl,
          role: "assistant",
          promptId,
          botType: selectedBot,
        }),
      }
    );

    if (response.ok) {
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    }
  };

  // Download image utility
  const handleDownloadImage = async (imageUrl: string) => {
    // For external URLs, fetch and convert to blob
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "image";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentConversationIdRef = useRef<string | null>(null);

  const [selectedBot, setSelectedBot] = useState("copy_assistant");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [client, setClient] = useState<ClientType | null>(null);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ file: File; fileId?: string; uploading: boolean; error?: string }>
  >([]);

  const selectedBotData = bots.find((bot) => bot.id === selectedBot);
  const promptSuggestions = selectedBotData?.suggestions || [];

  useEffect(() => {
    initialize();
  }, [searchParams]);

  useEffect(() => {
    if (client) {
      loadConversationHistory(client);
    }
  }, [selectedBot, client]);

  useEffect(() => {
    if (showInputConversation) {
      scrollToBottom();
    }
  }, [showInputConversation]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastAssistantMsg = [...messages]
        .reverse()
        .find((m) => m.role === "assistant");
      if (
        lastAssistantMsg &&
        (lastAssistantMsg.text.startsWith("data:image/") ||
          (lastAssistantMsg.text.startsWith("http") &&
            /\.(png|jpg|jpeg|gif|webp)$/i.test(lastAssistantMsg.text)))
      ) {
        setShowInputConversation(false);
      }
    } else {
      setShowInputConversation(true);
    }
  }, [messages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isNearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    setShowScrollButton(!isNearBottom && messages.length > 0);
  };

  const initialize = async () => {
    const clientParam = searchParams.get("client");
    const foundClient = clients.find((c) => c.id === clientParam);

    if (!foundClient) {
      toast({
        title: "Error",
        description: "Client not found",
        variant: "destructive",
      });
      router.push("/");
      return;
    }

    setClient(foundClient);
  };

  const loadConversationHistory = async (client: ClientType) => {
    try {
      setIsLoadingConversations(true);
      const response = await fetch(
        `/api/conversations?client=${client.name}&botType=${selectedBot}`
      );

      if (response.ok) {
        const data = await response.json();
        setConversations(data || []);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`
      );

      if (response.ok) {
        const data = await response.json();

        const processedMessages = data.messages.map((msg: any) => ({
          ...msg,
          attachedFiles: msg.attachedFiles || [],
        }));

        setMessages(processedMessages || []);
        setCurrentConversationId(conversationId);
        currentConversationIdRef.current = conversationId;

        setAttachedFiles([]);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load chat messages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async (firstMessage: string) => {
    try {
      setIsCreatingConversation(true);

      const title = generateSmartTitle(firstMessage);

      // @ts-ignore
      const promptConfigId = client?.bots[`${selectedBot}_id`];
      if (!promptConfigId) {
        throw new Error("Prompt not configured for this bot");
      }

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          clientId: client?.id,
          promptId: promptConfigId,
          botType: selectedBot,
          firstMessage,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create conversation");
      }

      const data = await response.json();

      setCurrentConversationId(data.id);
      currentConversationIdRef.current = data.id;

      await loadConversationHistory(client!);

      return data.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create conversation",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const generateSmartTitle = (message: string): string => {
    const cleaned = message.trim().replace(/\s+/g, " ");

    if (cleaned.length <= 60) {
      return cleaned;
    }

    const maxLength = 50;
    const truncated = cleaned.substring(0, maxLength);

    const punctuationMarks = [". ", "? ", "! ", ", "];
    let bestCutIndex = -1;

    for (const mark of punctuationMarks) {
      const index = truncated.lastIndexOf(mark);
      if (index > bestCutIndex && index > 20) {
        bestCutIndex = index + mark.length - 1;
      }
    }

    if (bestCutIndex > 0) {
      return cleaned.substring(0, bestCutIndex).trim();
    }

    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 20) {
      return truncated.substring(0, lastSpace) + "...";
    }

    return truncated + "...";
  };

  const deleteConversation = async (
    conversationId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this conversation?")) {
      return;
    }

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (currentConversationId === conversationId) {
          setMessages([]);
          setCurrentConversationId(null);
          currentConversationIdRef.current = null;
        }
        await loadConversationHistory(client!);
        toast({
          title: "Conversation deleted",
          description: "The conversation has been successfully deleted",
        });
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    for (const file of files) {
      if (file.size > THRESHOLD) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 20MB limit`,
          variant: "destructive",
        });
        continue;
      }

      const fileEntry = {
        file,
        uploading: true,
        error: undefined,
        fileId: undefined,
      };

      setAttachedFiles((prev) => [...prev, fileEntry]);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/files", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || "Failed to upload file");
        }

        const data = await response.json();

        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, fileId: data.fileId, uploading: false }
              : f
          )
        );

        console.log(
          `✅ File uploaded to OpenAI: ${file.name} with ID: ${data.fileId}`
        );
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);

        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, uploading: false, error: "Error uploading file" }
              : f
          )
        );

        toast({
          title: "Error uploading file",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachedFile = async (index: number) => {
    const fileEntry = attachedFiles[index];

    if (fileEntry.fileId) {
      try {
        await fetch(`/api/openai/files/${fileEntry.fileId}`, {
          method: "DELETE",
        });
        console.log(`Deleted file from OpenAI: ${fileEntry.fileId}`);
      } catch (error) {
        console.error("Error deleting file from OpenAI:", error);
      }
    }

    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return Image;
    if (fileType === "application/pdf") return FileText;
    return File;
  };

  const handleSubmit = async (defaultPrompt?: string) => {
    const promptToUse = defaultPrompt || prompt;

    if (!promptToUse.trim()) {
      toast({
        title: "Empty message",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    // @ts-ignore
    const promptConfigId = client?.bots[`${selectedBot}_id`];
    if (!promptConfigId) {
      toast({
        title: "Bot not configured",
        description: "This bot is not available for this client",
        variant: "destructive",
      });
      return;
    }

    setInputDisabled(true);
    setIsLoading(true);

    try {
      let conversationId = currentConversationId;

      if (!conversationId) {
        conversationId = await createNewConversation(promptToUse);

        if (!conversationId) {
          throw new Error("Could not create conversation");
        }
      }

      const fileIds = attachedFiles
        .filter((f) => f.fileId && !f.error)
        .map((f) => ({
          name: f.file.name,
          fileId: f.fileId!,
        }));

      const tempUserMessageId = `user-${Date.now()}`;
      const userMessage: ChatMessage = {
        id: tempUserMessageId,
        role: "user" as const,
        text: promptToUse,
        timestamp: new Date(),
        attachedFiles: fileIds,
      };

      setMessages((prev) => [...prev, userMessage]);
      setPrompt("");
      setAttachedFiles([]);
      setIsTyping(true);

      const response = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: promptToUse,
            promptId: promptConfigId,
            botType: selectedBot,
            fileIds: fileIds.length > 0 ? fileIds : undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== tempUserMessageId)
        );
        throw new Error(error.error || "Failed to send message");
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: data.message || "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await loadConversationHistory(client!);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setInputDisabled(false);
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setPrompt("");
    setCurrentConversationId(null);
    currentConversationIdRef.current = null;
    setAttachedFiles([]);
    setSidebarOpen(false);

    toast({
      title: "Ready for new conversation",
      description: "Send a message to start",
    });
  };

  const handleBackToClientSelection = () => {
    router.push("/");
  };

  const handleBotChange = (botId: string) => {
    setSelectedBot(botId);
    setSidebarOpen(false);
    setMessages([]);
    setPrompt("");
    setCurrentConversationId(null);
    currentConversationIdRef.current = null;
    setAttachedFiles([]);
  };

  console.log({ messages });

  return (
    <div className="min-h-screen bg-background flex">
      {imageModal && (
        <Modal
          isOpen={showModal}
          onClose={closeEditor}
          imageUrl={imageModal}
          handleDownloadImage={handleDownloadImage}
          handleAddImageToConversation={handleAddImageToConversation}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card/95 backdrop-blur-sm border-r border-border transform transition-all duration-300 ease-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-card-foreground text-sm">
                    {client?.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">Dashboard</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bot Selection */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-2 mb-6">
              <h3 className="text-sm font-medium text-card-foreground">
                Assistants IA
              </h3>
              <p className="text-xs text-muted-foreground">
                Select a specialized bot
              </p>
            </div>

            <div className="space-y-2 mb-6">
              {bots.map((bot) => {
                const Icon = bot.icon;
                const isSelected = selectedBot === bot.id;
                const hasPrompt = client?.bots[`${bot.id}_id`];

                return (
                  <button
                    key={bot.id}
                    onClick={() => hasPrompt && handleBotChange(bot.id)}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all duration-300",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : hasPrompt
                        ? "border-border hover:border-primary/50 hover:bg-accent/50"
                        : "border-border opacity-50 cursor-not-allowed"
                    )}
                    disabled={!hasPrompt}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          bot.bgColor,
                          hasPrompt && bot.hoverColor
                        )}
                      >
                        <Icon className={cn("h-5 w-5", bot.color)} />
                      </div>
                      <div className="flex-1">
                        <div className="flex-col flex gap-1">
                          <h4 className="font-medium text-sm">{bot.name}</h4>
                          {!hasPrompt && (
                            <span className="text-xs text-muted-foreground">
                              (Not available)
                            </span>
                          )}
                        </div>
                        {hasPrompt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {bot.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Conversation History */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Conversations</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleNewConversation}
                  disabled={isCreatingConversation}
                >
                  {isCreatingConversation ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isLoadingConversations ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">
                    No conversations found
                  </p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group relative p-3 rounded-lg border cursor-pointer transition-all duration-200",
                      currentConversationId === conv.id
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/20 bg-red-100"
                        : "border-border hover:bg-accent/50 hover:border-muted-foreground/30"
                    )}
                    onClick={() => loadConversationMessages(conv.id)}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-xs font-medium truncate pr-6">
                          {conv.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(conv.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="absolute right-2 top-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="pt-6 border-t space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewConversation}
                disabled={isCreatingConversation}
                className="w-full justify-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToClientSelection}
                className="w-full justify-start"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Change Client
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Top Bar */}
        <div className="bg-card/95 backdrop-blur-sm border-b p-4 lg:p-8 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={handleBackToClientSelection}
                  className="hover:text-foreground"
                >
                  Clients
                </button>
                <ChevronRight className="h-3 w-3" />
                <span>{client?.name}</span>
                {currentConversationId && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-muted-foreground">
                      {
                        conversations.find(
                          (c) => c.id === currentConversationId
                        )?.title
                      }
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 gap-4 overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {messages.length === 0 ? (
              <Card className="h-full bg-card/50 border-border">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div
                      className={cn(
                        "w-16 h-16 mx-auto rounded-full flex items-center justify-center",
                        selectedBotData?.bgColor
                      )}
                    >
                      {selectedBotData && (
                        <selectedBotData.icon
                          className={cn("h-8 w-8", selectedBotData.color)}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-card-foreground">
                        Hello! I'm {selectedBotData?.name}
                      </h3>
                      <p className="text-muted-foreground max-w-md">
                        {selectedBotData?.description}
                      </p>
                    </div>
                    {promptSuggestions.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold mb-2">
                          Prompt Suggestions
                        </h4>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {promptSuggestions.map(
                            (suggestion: string, idx: number) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  await handleSubmit(suggestion);
                                }}
                                className="text-xs"
                              >
                                {suggestion}
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
                <div className="space-y-4 p-2">
                  {messages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={cn(
                        "flex gap-3",
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            selectedBotData?.bgColor
                          )}
                        >
                          {selectedBotData && (
                            <selectedBotData.icon
                              className={cn("h-4 w-4", selectedBotData.color)}
                            />
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-4",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <div className="markdown-content">
                          {message.text.startsWith("data:image/") ? (
                            <img
                              src={message.text}
                              alt="Generated image"
                              className="max-w-full rounded-lg shadow"
                            />
                          ) : message.text.startsWith("http") &&
                            /\.(png|jpg|jpeg|gif|webp)$/i.test(message.text) ? (
                            <div>
                              <img
                                src={message.text}
                                alt="Generated image"
                                className="max-w-full rounded-lg shadow"
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  className="px-3 py-1 rounded-lg border border-black bg-white text-black hover:bg-gray-100 text-sm"
                                  onClick={() =>
                                    handleDownloadImage(message.text)
                                  }
                                >
                                  Save
                                </button>
                                <button
                                  className="px-3 py-1 rounded-lg border border-black bg-white text-black hover:bg-gray-100 text-sm"
                                  onClick={() => handleEditor(message.text)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="px-3 py-1 rounded-lg border border-black bg-white text-black hover:bg-gray-100 text-sm"
                                  onClick={() => handleContinueConversation()}
                                >
                                  Continue conversation
                                </button>
                              </div>
                            </div>
                          ) : (
                            <Markdown>{message.text}</Markdown>
                          )}
                        </div>

                        {message.attachedFiles &&
                          message.attachedFiles.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <div className="flex flex-wrap gap-1">
                                {message.attachedFiles.map((file, idx) => (
                                  <div
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-background/50"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    <span className="max-w-[150px] truncate">
                                      {file.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        {message.timestamp && (
                          <div className="mt-2 text-xs opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex gap-3 justify-start">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          selectedBotData?.bgColor
                        )}
                      >
                        {selectedBotData && (
                          <selectedBotData.icon
                            className={cn("h-4 w-4", selectedBotData.color)}
                          />
                        )}
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full animate-bounce bg-black" />
                          <div
                            className="w-2 h-2 rounded-full animate-bounce bg-black"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="w-2 h-2 rounded-full animate-bounce bg-black"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {showScrollButton && (
                  <Button
                    onClick={scrollToBottom}
                    size="sm"
                    className="fixed bottom-24 right-8 z-20 rounded-full"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Input Area */}
          {showInputConversation && (
            <Card className="bg-card/80 border-border shadow-lg flex-shrink-0">
              <CardContent className="p-4 space-y-4">
                {/* Attached Files */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((fileEntry, index) => {
                      const Icon = getFileIcon(fileEntry.file.type);
                      return (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg border",
                            fileEntry.error
                              ? "border-destructive bg-destructive/10"
                              : fileEntry.uploading
                              ? "border-muted bg-muted/50"
                              : "border-primary bg-primary/10"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-xs max-w-[100px] truncate">
                            {fileEntry.file.name}
                          </span>
                          {fileEntry.uploading && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          {!fileEntry.uploading && (
                            <button
                              onClick={() => removeAttachedFile(index)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Input Controls */}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.csv,.json,.docx,.xlsx,.pptx,.html,.xml,.rtf,image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={inputDisabled}
                    className="flex-shrink-0"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <Textarea
                    placeholder={`Ask something to ${selectedBotData?.name}...`}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={inputDisabled}
                    className="flex-1 min-h-[60px] max-h-[150px] resize-none"
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        await handleSubmit();
                      }
                    }}
                  />

                  <Button
                    onClick={async () => await handleSubmit()}
                    disabled={isLoading || !prompt.trim() || inputDisabled}
                    className="self-end"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {attachedFiles.some((f) => f.uploading) && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading files...
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-muted-foreground">Loading dashboard...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
