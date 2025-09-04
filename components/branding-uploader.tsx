import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Upload, CheckCircle, AlertCircle, FileText, Download, Database } from "lucide-react"
import { useRAGStore, ragUtils } from "@/lib/rag-store"
import { RAGModel } from "@/lib/rag-types"

interface BrandingUploaderProps {
  onUploadSuccess?: () => void;
}

export function BrandingUploader({ onUploadSuccess }: BrandingUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' })
  
  // RAG-specific fields
  const [ragName, setRAGName] = useState("")
  const [ragDescription, setRAGDescription] = useState("")
  
  // Store integration
  const { addRAG, getAllRAGs, getActiveRAG } = useRAGStore()
  const allRAGs = getAllRAGs()
  const activeRAG = getActiveRAG()

  // Legacy support - load current file info on component mount
  useEffect(() => {
    loadCurrentFileInfo()
  }, [])

  const loadCurrentFileInfo = async () => {
    try {
      const response = await fetch('/api/upload-branding')
      if (response.ok) {
        const data = await response.json()
        // Note: This is for backward compatibility with existing single-file system
        console.log('Legacy file info loaded:', data.currentFile)
      }
    } catch (error) {
      console.error('Error loading current file info:', error)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.json')) {
        setUploadStatus({
          type: 'error',
          message: 'Please select a JSON file'
        })
        return
      }
      setFile(selectedFile)
      setUploadStatus({ type: null, message: '' })
      
      // Auto-fill name from filename if not set
      if (!ragName && selectedFile.name) {
        const nameWithoutExt = selectedFile.name.replace('.json', '')
        setRAGName(nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1))
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    // Validate RAG fields
    const errors = ragUtils.validateRAGModel({
      name: ragName,
      content: 'placeholder' // We'll validate actual content after reading
    })
    
    if (errors.length > 0) {
      setUploadStatus({
        type: 'error',
        message: errors.join(', ')
      })
      return
    }

    setUploading(true)
    setUploadStatus({ type: null, message: '' })

    try {
      // Read file content
      const fileContent = await file.text()
      let parsedContent
      
      try {
        parsedContent = JSON.parse(fileContent)
      } catch (parseError) {
        throw new Error('Invalid JSON file')
      }

      // Create RAG model
      const ragModel: RAGModel = {
        id: ragUtils.generateRAGId(ragName),
        name: ragName.trim(),
        content: JSON.stringify(parsedContent, null, 2),
        description: ragDescription.trim() || undefined,
        uploadedAt: new Date(),
        size: file.size,
        fileType: 'application/json',
        version: '1.0'
      }

      // Add to store
      addRAG(ragModel)

      // Also upload to legacy API for backward compatibility
      const formData = new FormData()
      formData.append('brandingFile', file)

      await fetch('/api/upload-branding', {
        method: 'POST',
        body: formData
      })

      setUploadStatus({
        type: 'success',
        message: `RAG "${ragName}" uploaded successfully and set as active!`
      })

      // Reset form
      setFile(null)
      setRAGName("")
      setRAGDescription("")
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      onUploadSuccess?.()

    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadStatus({
        type: 'error',
        message: error.message || 'An error occurred during upload'
      })
    } finally {
      setUploading(false)
    }
  }

  const downloadSampleFile = async () => {
    try {
      // Try to fetch the template from public folder first
      const response = await fetch('/egp-branding-template.json')
      if (response.ok) {
        const templateData = await response.json()
        const blob = new Blob([JSON.stringify(templateData, null, 2)], { 
          type: 'application/json' 
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'egp-branding-template.json'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      }
    } catch (error) {
      console.warn('Could not fetch template, using fallback')
    }

    // Fallback to simple template
    const sampleBranding = {
      color_palette: {
        principal_colors: {
          primary_red: {
            name: "Primary Red",
            description: "Main brand color for emphasis and CTAs",
            hex: "#ef404e"
          },
          primary_blue: {
            name: "Primary Blue", 
            description: "Secondary brand color for trust and professionalism",
            hex: "#0055aa"
          }
        },
        light_colors: {
          light_gray: { 
            name: "Light Gray",
            hex: "#f5f5f5" 
          }
        },
        dark_colors: {
          dark_gray: { 
            name: "Dark Gray",
            hex: "#333333" 
          }
        }
      },
      illustration: {
        photography_style: {
          preferred: [
            "documentary style",
            "authentic and natural", 
            "diverse representation",
            "professional but approachable"
          ]
        },
        layout_rules: {
          placement: "balanced composition",
          position: "centered or rule of thirds"
        },
        format_rules: {
          supported_formats: {
            square_1_1: {
              name: "Square",
              dimensions: "1:1",
              aspect_ratio: 1.0
            }
          }
        },
        generation_constraints: {
          negative_prompts: ["low quality", "blurry", "distorted"]
        }
      }
    }

    const blob = new Blob([JSON.stringify(sampleBranding, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-branding.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Branding Configuration
        </CardTitle>
        <CardDescription>
          Upload a JSON file with branding guidelines to customize the RAG system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active RAG Info */}
        {activeRAG && (
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <strong>Active RAG:</strong> {activeRAG.name} ({ragUtils.formatFileSize(activeRAG.size)})
              {activeRAG.description && (
                <span className="block text-sm text-muted-foreground mt-1">
                  {activeRAG.description}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* RAG Summary */}
        {allRAGs.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {allRAGs.length} RAG{allRAGs.length !== 1 ? 's' : ''} available. 
            {!activeRAG && ' Select one from the dropdown above.'}
          </div>
        )}

        {/* RAG Details Form */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rag-name">RAG Name *</Label>
            <Input
              id="rag-name"
              value={ragName}
              onChange={(e) => setRAGName(e.target.value)}
              placeholder="e.g., EGP Brand Guidelines"
              disabled={uploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rag-description">Description (Optional)</Label>
            <Input
              id="rag-description"
              value={ragDescription}
              onChange={(e) => setRAGDescription(e.target.value)}
              placeholder="Brief description of this RAG"
              disabled={uploading}
            />
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="branding-file">Select JSON Branding File *</Label>
          <Input
            id="branding-file"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <div className="text-xs text-muted-foreground">
            Upload a JSON file containing branding guidelines and configurations
          </div>
        </div>

        {/* Selected File Display */}
        {file && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium">Selected: {file.name}</p>
            <p className="text-xs text-gray-600">Size: {(file.size / 1024).toFixed(1)} KB</p>
          </div>
        )}

        {/* Status Messages */}
        {uploadStatus.type && (
          <Alert variant={uploadStatus.type === 'error' ? 'destructive' : 'default'}>
            {uploadStatus.type === 'error' ? 
              <AlertCircle className="h-4 w-4" /> : 
              <CheckCircle className="h-4 w-4" />
            }
            <AlertDescription>{uploadStatus.message}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleUpload} 
            disabled={!file || !ragName.trim() || uploading}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading RAG...' : 'Upload RAG'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={downloadSampleFile}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Sample
          </Button>
        </div>

        {/* Usage Instructions */}
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Supported JSON structures:</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li><code>color_palette</code> at root level (simple structure)</li>
            <li><code>brand_specifications.color_palette</code> (nested structure)</li>
          </ul>
          <p className="mt-2">
            <strong>Simple structure example:</strong>
          </p>
          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`{
  "color_palette": {
    "principal_colors": {
      "brand_red": {
        "name": "Brand Red",
        "hex": "#ff0000"
      }
    }
  }
}`}
          </pre>
          <p className="mt-2">
            <strong>Nested structure example:</strong>
          </p>
          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`{
  "brand_specifications": {
    "color_palette": {
      "primary_colors": {
        "red": { "hex": "#ef404e" }
      }
    }
  }
}`}
          </pre>
          <p className="mt-2">
            The uploaded file will immediately update the RAG system for all future image generations.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
