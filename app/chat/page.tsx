"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, ArrowRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { clients } from "@/lib/clients";
import type { ClientType } from "@/lib/types";

export default function ClientSelectionPage() {
  const router = useRouter();

  const [selectedClient, setSelectedClient] = useState<ClientType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleContinue = async () => {
    if (selectedClient) {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 400));
      router.push(`/dashboard?client=${selectedClient.id}`);
    }
  };

  const selectedClientData = clients.find(
    (client) => client.id === selectedClient?.id
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center transition-all duration-500 hover:scale-110 hover:bg-primary/20">
            <Building2 className="h-8 w-8 text-primary transition-colors duration-300" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              OpenAI Assistant
            </h1>
          </div>
        </div>

        {/* Client Selection Card */}
        <Card className="bg-card/80 backdrop-blur-sm border-border shadow-xl animate-in fade-in-0 slide-in-from-bottom-6 duration-700 delay-200">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Select a Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground">
                Client
              </label>
              <Select
                value={selectedClient?.id}
                onValueChange={(value) =>
                  setSelectedClient(
                    clients.find((client) => client.id === value) || null
                  )
                }
              >
                <SelectTrigger className="bg-input/50 backdrop-blur-sm border-border text-foreground transition-all duration-200 hover:bg-input/80 focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-sm border-border">
                  {clients.map((client) => (
                    <SelectItem
                      key={client.id}
                      value={client.id}
                      className="transition-colors duration-150 hover:bg-accent/80"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{client.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {client.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Client Preview */}
            <div
              className={cn(
                "transition-all duration-500 ease-out",
                selectedClientData
                  ? "opacity-100 translate-y-0 max-h-20"
                  : "opacity-0 translate-y-2 max-h-0 overflow-hidden"
              )}
            >
              {selectedClientData && (
                <div className="p-4 bg-muted/50 backdrop-blur-sm rounded-lg border border-border animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-primary/20">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {selectedClientData.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedClientData.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleContinue}
              disabled={!selectedClient || isLoading}
              className={cn(
                "w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 transform",
                "hover:scale-[1.02] active:scale-[0.98]",
                selectedClient ? "shadow-lg hover:shadow-xl" : "",
                isLoading && "animate-pulse"
              )}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                <>
                  Continue to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
