"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageSquare, Star } from "lucide-react"
import { motion } from "framer-motion"
import { getSupabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState(null)
  const [resumes, setResumes] = useState([])
  const [flaggedResumes, setFlaggedResumes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedResume, setSelectedResume] = useState(null)
  const [mentorComment, setMentorComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchUserAndResumes = async () => {
      if (!user) return

      try {
        const supabase = getSupabase()

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError) throw profileError
        setUserProfile(profileData)

        // Fetch user's resumes
        const { data: userResumes, error: resumesError } = await supabase
          .from("resumes")
          .select(`
            id,
            file_path,
            file_name,
            total_score,
            created_at,
            resume_reviews (
              clarity_score,
              content_score,
              impact_score,
              grammar_score,
              skills_score
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (resumesError) throw resumesError
        setResumes(userResumes)

        // If user is a mentor, fetch flagged resumes
        if (profileData.is_mentor) {
          const { data: flagged, error: flaggedError } = await supabase
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
            .eq("is_flagged_for_review", true)
            .order("created_at", { ascending: false })

          if (flaggedError) throw flaggedError
          setFlaggedResumes(flagged)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        setIsLoading(false)
      }
    }

    fetchUserAndResumes()
  }, [user])

  const handleResumeClick = (resume) => {
    setSelectedResume(resume)
    setMentorComment("")
  }

  const handleMentorCommentSubmit = async (e) => {
    e.preventDefault()

    if (!mentorComment.trim()) return

    setIsSubmittingComment(true)

    try {
      const supabase = getSupabase()

      // Add mentor comment
      const { error } = await supabase.from("comments").insert({
        resume_id: selectedResume.id,
        user_id: user.id,
        content: mentorComment.trim(),
        is_mentor_comment: true,
      })

      if (error) throw error

      toast({
        title: "Feedback submitted",
        description: "Your mentor feedback has been submitted successfully",
      })

      setMentorComment("")

      // Close the dialog
      setSelectedResume(null)
    } catch (error) {
      console.error("Error adding mentor comment:", error)
      toast({
        title: "Failed to submit feedback",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleBecomeMentor = async () => {
    try {
      const supabase = getSupabase()

      const { error } = await supabase.from("users").update({ is_mentor: true }).eq("id", user.id)

      if (error) throw error

      setUserProfile({ ...userProfile, is_mentor: true })

      toast({
        title: "You are now a mentor",
        description: "You can now review flagged resumes and provide feedback",
      })
    } catch (error) {
      console.error("Error becoming mentor:", error)
      toast({
        title: "Failed to become mentor",
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                  {userProfile?.is_mentor
                    ? "Manage your resumes and review flagged resumes"
                    : "Manage your resumes and track your progress"}
                </p>
              </div>

              {!userProfile?.is_mentor && (
                <Button onClick={handleBecomeMentor}>
                  <Star className="mr-2 h-4 w-4" />
                  Become a Mentor
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs defaultValue="my-resumes">
                <TabsList className="mb-8">
                  <TabsTrigger value="my-resumes">My Resumes</TabsTrigger>
                  {userProfile?.is_mentor && (
                    <TabsTrigger value="flagged-resumes">
                      Flagged Resumes
                      {flaggedResumes.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {flaggedResumes.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="my-resumes">
                  {resumes.length === 0 ? (
                    <Card>
                      <CardContent className="py-10">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold mb-2">No resumes yet</h3>
                          <p className="text-muted-foreground mb-6">
                            Upload your resume to get feedback and improve your chances of landing your dream job.
                          </p>
                          <Button asChild>
                            <a href="/">Upload Resume</a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {resumes.map((resume, index) => (
                        <motion.div
                          key={resume.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <Card>
                            <CardHeader>
                              <CardTitle className="truncate text-base">{resume.file_name}</CardTitle>
                              <CardDescription>
                                Uploaded on {new Date(resume.created_at).toLocaleDateString()}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-2 mb-4">
                                <div className="text-2xl font-bold text-primary">
                                  {resume.total_score ? `${Math.round(resume.total_score)}%` : "N/A"}
                                </div>
                                <div className="text-sm text-muted-foreground">Overall Score</div>
                              </div>

                              {resume.resume_reviews?.[0] && (
                                <div className="grid grid-cols-5 gap-2">
                                  <ScoreIndicator label="Clarity" score={resume.resume_reviews[0].clarity_score} />
                                  <ScoreIndicator label="Content" score={resume.resume_reviews[0].content_score} />
                                  <ScoreIndicator label="Impact" score={resume.resume_reviews[0].impact_score} />
                                  <ScoreIndicator label="Grammar" score={resume.resume_reviews[0].grammar_score} />
                                  <ScoreIndicator label="Skills" score={resume.resume_reviews[0].skills_score} />
                                </div>
                              )}
                            </CardContent>
                            <CardFooter className="flex justify-between">
                              <Button variant="outline" asChild>
                                <a href={`/analysis?id=${resume.id}`}>View Analysis</a>
                              </Button>
                              <Button variant="ghost" size="icon">
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {userProfile?.is_mentor && (
                  <TabsContent value="flagged-resumes">
                    {flaggedResumes.length === 0 ? (
                      <Card>
                        <CardContent className="py-10">
                          <div className="text-center">
                            <h3 className="text-lg font-semibold mb-2">No flagged resumes</h3>
                            <p className="text-muted-foreground">
                              Resumes with scores above 70% will appear here for mentor review.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {flaggedResumes.map((resume, index) => (
                          <motion.div
                            key={resume.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <Dialog onOpenChange={(open) => open && handleResumeClick(resume)}>
                              <DialogTrigger asChild>
                                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                                  <CardHeader>
                                    <div className="flex items-center gap-3 mb-2">
                                      <Avatar>
                                        <AvatarImage src={resume.users?.avatar_url || "/placeholder.svg"} />
                                        <AvatarFallback>
                                          {resume.users?.full_name?.charAt(0) ||
                                            resume.users?.email?.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <CardTitle className="text-base">
                                          {resume.users?.full_name || "Anonymous"}
                                        </CardTitle>
                                        <CardDescription>
                                          {new Date(resume.created_at).toLocaleDateString()}
                                        </CardDescription>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <h4 className="font-medium mb-2 truncate">{resume.file_name}</h4>
                                    <div className="flex items-center gap-2 mb-4">
                                      <div className="text-2xl font-bold text-primary">
                                        {resume.total_score ? `${Math.round(resume.total_score)}%` : "N/A"}
                                      </div>
                                      <div className="text-sm text-muted-foreground">Overall Score</div>
                                    </div>

                                    {resume.resume_reviews?.[0] && (
                                      <div className="grid grid-cols-5 gap-2">
                                        <ScoreIndicator
                                          label="Clarity"
                                          score={resume.resume_reviews[0].clarity_score}
                                        />
                                        <ScoreIndicator
                                          label="Content"
                                          score={resume.resume_reviews[0].content_score}
                                        />
                                        <ScoreIndicator label="Impact" score={resume.resume_reviews[0].impact_score} />
                                        <ScoreIndicator
                                          label="Grammar"
                                          score={resume.resume_reviews[0].grammar_score}
                                        />
                                        <ScoreIndicator label="Skills" score={resume.resume_reviews[0].skills_score} />
                                      </div>
                                    )}
                                  </CardContent>
                                  <CardFooter>
                                    <Button className="w-full">Review Resume</Button>
                                  </CardFooter>
                                </Card>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl p-0">
                                <div className="grid md:grid-cols-2 h-[80vh]">
                                  {/* Resume Preview */}
                                  <div className="p-6 border-r overflow-auto">
                                    <DialogHeader>
                                      <DialogTitle className="mb-4">{resume.file_name}</DialogTitle>
                                    </DialogHeader>
                                    <div className="aspect-[8.5/11] bg-muted rounded-md flex items-center justify-center">
                                      <p className="text-muted-foreground">Resume Preview</p>
                                    </div>
                                  </div>

                                  {/* Mentor Feedback Form */}
                                  <div className="flex flex-col h-full">
                                    <div className="p-6 border-b">
                                      <h3 className="text-lg font-semibold">Mentor Feedback</h3>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Provide professional feedback to help improve this resume
                                      </p>
                                    </div>

                                    <div className="flex-1 overflow-auto p-6">
                                      <form onSubmit={handleMentorCommentSubmit}>
                                        <div className="space-y-4">
                                          <div>
                                            <h4 className="text-sm font-medium mb-2">AI Analysis Summary</h4>
                                            <Card>
                                              <CardContent className="p-4">
                                                <div className="grid grid-cols-5 gap-2">
                                                  <ScoreIndicator
                                                    label="Clarity"
                                                    score={resume.resume_reviews?.[0]?.clarity_score || 0}
                                                  />
                                                  <ScoreIndicator
                                                    label="Content"
                                                    score={resume.resume_reviews?.[0]?.content_score || 0}
                                                  />
                                                  <ScoreIndicator
                                                    label="Impact"
                                                    score={resume.resume_reviews?.[0]?.impact_score || 0}
                                                  />
                                                  <ScoreIndicator
                                                    label="Grammar"
                                                    score={resume.resume_reviews?.[0]?.grammar_score || 0}
                                                  />
                                                  <ScoreIndicator
                                                    label="Skills"
                                                    score={resume.resume_reviews?.[0]?.skills_score || 0}
                                                  />
                                                </div>
                                              </CardContent>
                                            </Card>
                                          </div>

                                          <div>
                                            <label htmlFor="mentor-feedback" className="text-sm font-medium">
                                              Your Feedback
                                            </label>
                                            <Textarea
                                              id="mentor-feedback"
                                              placeholder="Provide detailed feedback on this resume..."
                                              className="mt-1 h-40"
                                              value={mentorComment}
                                              onChange={(e) => setMentorComment(e.target.value)}
                                              disabled={isSubmittingComment}
                                            />
                                          </div>

                                          <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={!mentorComment.trim() || isSubmittingComment}
                                          >
                                            {isSubmittingComment ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Submitting...
                                              </>
                                            ) : (
                                              "Submit Feedback"
                                            )}
                                          </Button>
                                        </div>
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
                  </TabsContent>
                )}
              </Tabs>
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
