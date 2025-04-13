"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Loader2, MessageSquare, ThumbsUp } from "lucide-react"
import { motion } from "framer-motion"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

export default function CommunityPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [resumes, setResumes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedResume, setSelectedResume] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [userLikes, setUserLikes] = useState({})
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchResumes = async () => {
      if (!user) return

      try {
        const supabase = getSupabase()

        // Fetch resumes with user info and review scores
        const { data, error } = await supabase
          .from("resumes")
          .select(`
            id,
            file_path,
            file_name,
            total_score,
            created_at,
            users (
              id,
              full_name,
              avatar_url,
              email
            ),
            resume_reviews (
              clarity_score,
              content_score,
              impact_score,
              grammar_score,
              skills_score
            )
          `)
          .order("created_at", { ascending: false })
          .limit(20)

        if (error) throw error

        // Fetch likes for the current user
        const { data: likesData, error: likesError } = await supabase
          .from("likes")
          .select("resume_id")
          .eq("user_id", user.id)

        if (likesError) throw likesError

        // Convert likes to an object for easier lookup
        const likesMap = {}
        likesData.forEach((like) => {
          likesMap[like.resume_id] = true
        })

        setUserLikes(likesMap)
        setResumes(data)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching resumes:", error)
        setIsLoading(false)
      }
    }

    fetchResumes()
  }, [user])

  const handleResumeClick = async (resume) => {
    setSelectedResume(resume)

    try {
      const supabase = getSupabase()

      // Fetch comments for the selected resume
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          is_mentor_comment,
          users (
            id,
            full_name,
            avatar_url,
            email
          )
        `)
        .eq("resume_id", resume.id)
        .order("created_at", { ascending: true })

      if (error) throw error

      setComments(data)
    } catch (error) {
      console.error("Error fetching comments:", error)
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()

    if (!newComment.trim()) return

    setIsSubmittingComment(true)

    try {
      const supabase = getSupabase()

      // Add new comment
      const { data, error } = await supabase
        .from("comments")
        .insert({
          resume_id: selectedResume.id,
          user_id: user.id,
          content: newComment.trim(),
          is_mentor_comment: false,
        })
        .select(`
          id,
          content,
          created_at,
          is_mentor_comment,
          users (
            id,
            full_name,
            avatar_url,
            email
          )
        `)
        .single()

      if (error) throw error

      setComments([...comments, data])
      setNewComment("")

      toast({
        title: "Comment added",
        description: "Your comment has been added successfully",
      })
    } catch (error) {
      console.error("Error adding comment:", error)
      toast({
        title: "Failed to add comment",
        description: error.message || "An error occurred while adding your comment",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleLikeToggle = async (resumeId) => {
    try {
      const supabase = getSupabase()

      if (userLikes[resumeId]) {
        // Unlike
        const { error } = await supabase.from("likes").delete().eq("resume_id", resumeId).eq("user_id", user.id)

        if (error) throw error

        setUserLikes({ ...userLikes, [resumeId]: false })

        // Update resume likes count in the UI
        setResumes(
          resumes.map((resume) => {
            if (resume.id === resumeId) {
              return {
                ...resume,
                likes_count: (resume.likes_count || 0) - 1,
              }
            }
            return resume
          }),
        )
      } else {
        // Like
        const { error } = await supabase.from("likes").insert({
          resume_id: resumeId,
          user_id: user.id,
        })

        if (error) throw error

        setUserLikes({ ...userLikes, [resumeId]: true })

        // Update resume likes count in the UI
        setResumes(
          resumes.map((resume) => {
            if (resume.id === resumeId) {
              return {
                ...resume,
                likes_count: (resume.likes_count || 0) + 1,
              }
            }
            return resume
          }),
        )
      }
    } catch (error) {
      console.error("Error toggling like:", error)
      toast({
        title: "Failed to update like",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-8">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-bold mb-6">Community Resumes</h1>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resumes.map((resume, index) => (
                  <motion.div
                    key={resume.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Dialog onOpenChange={(open) => open && handleResumeClick(resume)}>
                      <DialogTrigger asChild>
                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <Avatar>
                                <AvatarImage src={resume.users?.avatar_url || "/placeholder.svg"} />
                                <AvatarFallback>
                                  {resume.users?.full_name?.charAt(0) || resume.users?.email?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium">{resume.users?.full_name || "Anonymous"}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(resume.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="mb-4">
                              <h4 className="font-medium mb-2">{resume.file_name}</h4>
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-bold text-primary">
                                  {resume.total_score ? `${Math.round(resume.total_score)}%` : "N/A"}
                                </div>
                                <div className="text-sm text-muted-foreground">Overall Score</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-5 gap-2">
                              {resume.resume_reviews?.[0] && (
                                <>
                                  <ScoreIndicator label="Clarity" score={resume.resume_reviews[0].clarity_score} />
                                  <ScoreIndicator label="Content" score={resume.resume_reviews[0].content_score} />
                                  <ScoreIndicator label="Impact" score={resume.resume_reviews[0].impact_score} />
                                  <ScoreIndicator label="Grammar" score={resume.resume_reviews[0].grammar_score} />
                                  <ScoreIndicator label="Skills" score={resume.resume_reviews[0].skills_score} />
                                </>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="px-6 py-4 border-t flex justify-between">
                            <div className="flex items-center gap-2">
                              <ThumbsUp
                                className={`h-4 w-4 cursor-pointer ${userLikes[resume.id] ? "text-primary fill-primary" : "text-muted-foreground"}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleLikeToggle(resume.id)
                                }}
                              />
                              <span className="text-sm text-muted-foreground">{resume.likes_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{resume.comments_count || 0}</span>
                            </div>
                          </CardFooter>
                        </Card>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl p-0">
                        <div className="grid md:grid-cols-2 h-[80vh]">
                          {/* Resume Preview */}
                          <div className="p-6 border-r overflow-auto">
                            <h3 className="text-lg font-semibold mb-4">{resume.file_name}</h3>
                            <div className="aspect-[8.5/11] bg-muted rounded-md flex items-center justify-center">
                              <p className="text-muted-foreground">Resume Preview</p>
                            </div>
                          </div>

                          {/* Comments Section */}
                          <div className="flex flex-col h-full">
                            <div className="p-6 border-b">
                              <h3 className="text-lg font-semibold">Comments</h3>
                            </div>

                            <div className="flex-1 overflow-auto p-6">
                              {comments.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  No comments yet. Be the first to comment!
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={comment.users?.avatar_url || "/placeholder.svg"} />
                                        <AvatarFallback>
                                          {comment.users?.full_name?.charAt(0) ||
                                            comment.users?.email?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{comment.users?.full_name || "Anonymous"}</span>
                                          {comment.is_mentor_comment && (
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                              Mentor
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-sm mt-1">{comment.content}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {new Date(comment.created_at).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="p-4 border-t">
                              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                                <Input
                                  placeholder="Add a comment..."
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  disabled={isSubmittingComment}
                                />
                                <Button type="submit" disabled={!newComment.trim() || isSubmittingComment}>
                                  {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                                </Button>
                              </form>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}

function ScoreIndicator({ label, score }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div
        className={`text-sm font-medium ${
          score >= 8 ? "text-green-500" : score >= 6 ? "text-amber-500" : "text-red-500"
        }`}
      >
        {score}/10
      </div>
    </div>
  )
}
