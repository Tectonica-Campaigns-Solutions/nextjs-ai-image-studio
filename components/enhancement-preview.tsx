"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Sparkles, Zap, FileText, Layers } from "lucide-react"

interface EnhancementPreviewProps {
  strategy: 'rag-only' | 'json-only' | 'hybrid' | 'none'
  ragApplied?: boolean
  jsonApplied?: boolean
  totalEnhancements?: number
  processingTime?: number
  enhancementSources?: string[]
  previewText?: string
}

export function EnhancementPreview({
  strategy,
  ragApplied = false,
  jsonApplied = false,
  totalEnhancements = 0,
  processingTime = 0,
  enhancementSources = [],
  previewText = ""
}: EnhancementPreviewProps) {
  if (strategy === 'none' && !previewText) {
    return null
  }

  const getStrategyIcon = () => {
    switch (strategy) {
      case 'rag-only':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'json-only':
        return <Zap className="h-4 w-4 text-green-500" />
      case 'hybrid':
        return <Layers className="h-4 w-4 text-purple-500" />
      default:
        return <Sparkles className="h-4 w-4 text-gray-500" />
    }
  }

  const getStrategyColor = () => {
    switch (strategy) {
      case 'rag-only':
        return 'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'json-only':
        return 'from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800'
      case 'hybrid':
        return 'from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800'
      default:
        return 'from-gray-50 to-gray-100 dark:from-gray-950/20 dark:to-gray-900/20 border-gray-200 dark:border-gray-800'
    }
  }

  const getStrategyName = () => {
    switch (strategy) {
      case 'rag-only':
        return 'RAG Enhancement'
      case 'json-only':
        return 'JSON Enhancement'
      case 'hybrid':
        return 'Hybrid Enhancement'
      default:
        return 'No Enhancement'
    }
  }

  return (
    <Card className={`bg-gradient-to-r ${getStrategyColor()}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {getStrategyIcon()}
          {getStrategyName()} Preview
        </CardTitle>
        <CardDescription className="text-xs">
          Enhancement applied with {enhancementSources.join(' + ')} processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Enhancement Stats */}
        <div className="flex flex-wrap gap-2">
          {ragApplied && (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <FileText className="h-3 w-3 mr-1" />
              RAG
            </Badge>
          )}
          {jsonApplied && (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <Zap className="h-3 w-3 mr-1" />
              JSON
            </Badge>
          )}
          {totalEnhancements > 0 && (
            <Badge variant="outline" className="text-xs">
              {totalEnhancements} enhancements
            </Badge>
          )}
          {processingTime > 0 && (
            <Badge variant="outline" className="text-xs">
              {processingTime}ms
            </Badge>
          )}
        </div>

        {/* Preview Text */}
        {previewText && (
          <div className="p-3 bg-white/50 dark:bg-black/20 rounded-md border">
            <p className="text-xs text-muted-foreground mb-1">Enhanced Prompt:</p>
            <p className="text-xs font-mono leading-relaxed">
              {previewText.length > 200 ? `${previewText.substring(0, 200)}...` : previewText}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
