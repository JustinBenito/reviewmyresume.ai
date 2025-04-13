"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileUp, Loader2, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"

export function ResumeUploader() {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const { toast } = useToast()
  const { user, signInWithGithub } = useAuth()
  const router = useRouter()

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    validateAndSetFile(droppedFile)
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    validateAndSetFile(selectedFile)
  }

  const validateAndSetFile = (file) => {
    if (!file) return

    // Check if file is a PDF
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      })
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    setFile(file)
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleUpload = async () => {
    if (!file) return

    if (!user) {
      // If user is not logged in, trigger GitHub sign in
      try {
        await signInWithGithub()
        // The page will redirect to GitHub and then back to the callback URL
        return
      } catch (error) {
        toast({
          title: "Authentication failed",
          description: "Failed to sign in with GitHub",
          variant: "destructive",
        })
        return
      }
    }

    // If user is logged in, proceed with upload
    setIsUploading(true)

    try {
      const supabase = getSupabase()
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage.from("resumes").upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL for the file
      const {
        data: { publicUrl },
      } = supabase.storage.from("resumes").getPublicUrl(filePath)

      // Save resume record in the database
      const { error: dbError } = await supabase.from("resumes").insert({
        user_id: user.id,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
      })

      if (dbError) throw dbError

      toast({
        title: "Upload successful",
        description: "Your resume has been uploaded and is being analyzed",
      })

      // Redirect to the analysis page
      router.push("/analysis")
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload resume",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} ref={fileInputRef} />

          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                key="file-preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="flex items-center justify-between w-full p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2 truncate">
                    <FileUp className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={removeFile} className="h-6 w-6 rounded-full">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={handleUpload} disabled={isUploading} className="w-full">
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload Resume"
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="upload-prompt"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="p-4 rounded-full bg-primary/10">
                  <FileUp className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Upload your resume</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Drag and drop your PDF file here, or click to browse
                  </p>
                </div>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Select PDF File
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}
