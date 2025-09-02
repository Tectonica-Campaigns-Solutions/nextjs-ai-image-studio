"use client"

import React from 'react'
import { Database, ChevronDown, Trash2, Upload } from 'lucide-react'
import { useRAGStore } from '@/lib/rag-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from 'react'

interface RAGSelectorProps {
  className?: string
  onUploadClick?: () => void
}

export default function RAGSelector({ className = "", onUploadClick }: RAGSelectorProps) {
  const { 
    getAllRAGs, 
    getActiveRAG, 
    setActiveRAG, 
    removeRAG, 
    hasRAGs 
  } = useRAGStore()
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ragToDelete, setRAGToDelete] = useState<string | null>(null)
  
  const allRAGs = getAllRAGs()
  const activeRAG = getActiveRAG()
  const hasAnyRAGs = hasRAGs()

  const handleRAGChange = (ragId: string) => {
    if (ragId === "upload-new") {
      onUploadClick?.()
      return
    }
    
    if (ragId === "delete-current" && activeRAG) {
      setRAGToDelete(activeRAG.id)
      setDeleteDialogOpen(true)
      return
    }
    
    setActiveRAG(ragId)
  }

  const handleDeleteConfirm = () => {
    if (ragToDelete) {
      removeRAG(ragToDelete)
      setRAGToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  const formatRAGDisplay = (rag: any) => {
    const maxLength = 25
    return rag.name.length > maxLength 
      ? `${rag.name.substring(0, maxLength)}...` 
      : rag.name
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* RAG Icon */}
        <Database className="h-4 w-4 text-muted-foreground" />
        
        {/* RAG Selector */}
        <Select 
          value={activeRAG?.id || ""} 
          onValueChange={handleRAGChange}
        >
          <SelectTrigger className="w-[200px] h-8 text-sm">
            <SelectValue 
              placeholder={hasAnyRAGs ? "Select RAG" : "No RAGs available"}
            >
              {activeRAG ? (
                <div className="flex items-center gap-2">
                  <span>{formatRAGDisplay(activeRAG)}</span>
                  <Badge variant="secondary" className="text-xs px-1">
                    Active
                  </Badge>
                </div>
              ) : (
                "No RAG selected"
              )}
            </SelectValue>
          </SelectTrigger>
          
          <SelectContent>
            {/* Available RAGs */}
            {allRAGs.map((rag) => (
              <SelectItem key={rag.id} value={rag.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <span className="font-medium">{rag.name}</span>
                    {rag.description && (
                      <span className="text-xs text-muted-foreground">
                        {rag.description}
                      </span>
                    )}
                  </div>
                  {rag.id === activeRAG?.id && (
                    <Badge variant="default" className="text-xs ml-2">
                      Active
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
            
            {/* Separator if there are RAGs */}
            {hasAnyRAGs && (
              <div className="border-t my-1" />
            )}
            
            {/* Upload New RAG */}
            <SelectItem value="upload-new">
              <div className="flex items-center gap-2">
                <Upload className="h-3 w-3" />
                <span>Upload New RAG</span>
              </div>
            </SelectItem>
            
            {/* Delete Current RAG */}
            {activeRAG && (
              <SelectItem value="delete-current">
                <div className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-3 w-3" />
                  <span>Delete Current RAG</span>
                </div>
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* RAG Count Badge */}
        {hasAnyRAGs && (
          <Badge variant="outline" className="text-xs">
            {allRAGs.length} RAG{allRAGs.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete RAG Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{ragToDelete ? allRAGs.find(r => r.id === ragToDelete)?.name : ''}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
