// Multi-RAG Store with Zustand
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { RAGModel, RAGStore } from './rag-types'

export const useRAGStore = create<RAGStore>()(
  persist(
    (set, get) => ({
      rags: {},
      activeRAGId: null,
      isLoading: false,

      // Add a new RAG model
      addRAG: (rag: RAGModel) => {
        console.log('[RAG Store] Adding RAG:', rag.name)
        set((state) => {
          const newRags = { ...state.rags, [rag.id]: rag }
          const newActiveId = state.activeRAGId || rag.id // Auto-select if first RAG
          
          return {
            rags: newRags,
            activeRAGId: newActiveId
          }
        })
      },

      // Remove a RAG model
      removeRAG: (id: string) => {
        console.log('[RAG Store] Removing RAG:', id)
        set((state) => {
          const newRags = { ...state.rags }
          const ragName = newRags[id]?.name || id
          delete newRags[id]
          
          // If we're removing the active RAG, select another one
          let newActiveId = state.activeRAGId
          if (state.activeRAGId === id) {
            const remainingIds = Object.keys(newRags)
            newActiveId = remainingIds.length > 0 ? remainingIds[0] : null
          }

          console.log(`[RAG Store] Removed RAG: ${ragName}, new active: ${newActiveId}`)
          return { 
            rags: newRags, 
            activeRAGId: newActiveId 
          }
        })
      },

      // Set active RAG
      setActiveRAG: (id: string) => {
        const rag = get().rags[id]
        if (rag) {
          console.log('[RAG Store] Setting active RAG:', rag.name)
          set({ activeRAGId: id })
        } else {
          console.warn('[RAG Store] Attempted to set non-existent RAG as active:', id)
        }
      },

      // Load RAGs (placeholder for future API integration)
      loadRAGs: () => {
        console.log('[RAG Store] Loading RAGs from storage')
        set({ isLoading: true })
        
        // For now, just set loading to false
        setTimeout(() => {
          set({ isLoading: false })
        }, 100)
      },

      // Get active RAG
      getActiveRAG: () => {
        const { rags, activeRAGId } = get()
        return activeRAGId && rags[activeRAGId] ? rags[activeRAGId] : null
      },

      // Get all RAGs as array
      getAllRAGs: () => {
        return Object.values(get().rags).sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        )
      },

      // Get RAG by ID
      getRAGById: (id: string) => {
        return get().rags[id] || null
      },

      // Check if any RAGs exist
      hasRAGs: () => {
        return Object.keys(get().rags).length > 0
      }
    }),
    {
      name: 'multi-rag-storage',
      version: 1,
      // Only persist essential data
      partialize: (state) => ({
        rags: state.rags,
        activeRAGId: state.activeRAGId
      })
    }
  )
)

// Utility functions for RAG management
export const ragUtils = {
  // Generate unique ID for RAG
  generateRAGId: (name: string): string => {
    const timestamp = Date.now()
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    return `rag-${sanitized}-${timestamp}`
  },

  // Format file size
  formatFileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  },

  // Validate RAG data
  validateRAGModel: (rag: Partial<RAGModel>): string[] => {
    const errors: string[] = []
    
    if (!rag.name || rag.name.trim().length === 0) {
      errors.push('RAG name is required')
    }
    
    if (!rag.content || rag.content.trim().length === 0) {
      errors.push('RAG content is required')
    }
    
    if (rag.name && rag.name.length > 100) {
      errors.push('RAG name must be less than 100 characters')
    }
    
    return errors
  }
}
