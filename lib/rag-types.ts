// Types for Multi-RAG System
export interface RAGModel {
  id: string
  name: string
  content: string
  description?: string
  uploadedAt: Date
  size: number
  fileType?: string
  version?: string
}

export interface RAGStore {
  rags: Record<string, RAGModel>
  activeRAGId: string | null
  isLoading: boolean
  
  // Actions
  addRAG: (rag: RAGModel) => void
  removeRAG: (id: string) => void
  setActiveRAG: (id: string) => void
  loadRAGs: () => void
  
  // Getters
  getActiveRAG: () => RAGModel | null
  getAllRAGs: () => RAGModel[]
  getRAGById: (id: string) => RAGModel | null
  hasRAGs: () => boolean
}

export interface RAGUploadData {
  name: string
  description?: string
  file: File
}

export type RAGActionType = 
  | 'ADD_RAG'
  | 'REMOVE_RAG' 
  | 'SET_ACTIVE'
  | 'LOAD_RAGS'
