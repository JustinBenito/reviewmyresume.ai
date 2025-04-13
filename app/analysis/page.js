"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ThumbsUp, Users } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getSupabase } from "@/lib/supabase"
import { analyzeResume } from "@/lib/gemini"
import Link from "next/link"

export default function AnalysisPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState("clarity");
  const [resume, setResume] = useState(null)
  const [analysis, setAnalysis] = useState({})
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [showCommunityButton, setShowCommunityButton] = useState(false)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchResumeAndAnalyze = async () => {
      if (!user) return

      try {
        setIsAnalyzing(true)
        const supabase = getSupabase()

           // Get the resume ID from URL if available
      const urlParams = new URLSearchParams(window.location.search)
      const resumeIdFromUrl = urlParams.get('id')
      console.log("Resume ID from URL:", urlParams)
      
      let resumeData
      let resumeError
      
      // If we have an ID in the URL, use that specific resume
      if (resumeIdFromUrl) {
        const response = await supabase
          .from("resumes")
          .select("*")
          .eq("id", resumeIdFromUrl)
          .eq("user_id", user.id) // Security check to ensure user owns this resume
          .single()
          
        resumeData = response.data
        resumeError = response.error
      } else {
        // Otherwise fetch the most recent resume (existing logic)
        const response = await supabase
          .from("resumes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
          
        resumeData = response.data
        console.log("Resume Data:", resumeData)
        resumeError = response.error
      }

      if (resumeError) throw resumeError
      if (!resumeData) {
        router.push("/")
        return
      }

      //setResume(resumeData)


        // Check if analysis already exists
        const { data: existingAnalysis, error: existingAnalysisError } = await supabase
        .from("resume_reviews")
        .select("*")
        .eq("resume_id", resumeData.id)
        .order("created_at", { ascending: false }) // Get the most recent one
        .limit(1)

        console.log("Existing Analysis:", existingAnalysis)
        console.log("Existing Analysis error:", existingAnalysisError)

        const formatFeedback = (feedback) => ({
          good: feedback.split("|")[0] || "",
          bad: feedback.split("|")[1] || "",
          ugly: feedback.split("|")[2] || "",
        })

        let analysisData
        if (existingAnalysis.length > 0) {
          // Use existing analysis
          analysisData = existingAnalysis[0]
          console.log("I am here in existing");
        } else {
          // Generate new analysis only if one doesn't exist
          const {
            data: { publicUrl },
          } = supabase.storage.from("resumes").getPublicUrl(resumeData.file_path)

          const analysisResult = await analyzeResume(publicUrl)
          
          // Store the analysis result in the database
          const { data: newAnalysis, error: insertError } = await supabase
            .from("resume_reviews")
            .insert({
              resume_id: resumeData.id,
              clarity_score: analysisResult.clarity.score,
              clarity_feedback: `${analysisResult.clarity.feedback.good}|${analysisResult.clarity.feedback.bad}|${analysisResult.clarity.feedback.ugly}`,
              content_score: analysisResult.content.score,
              content_feedback: `${analysisResult.content.feedback.good}|${analysisResult.content.feedback.bad}|${analysisResult.content.feedback.ugly}`,
              impact_score: analysisResult.impact.score,
              impact_feedback: `${analysisResult.impact.feedback.good}|${analysisResult.impact.feedback.bad}|${analysisResult.impact.feedback.ugly}`,
              grammar_score: analysisResult.grammar.score,
              grammar_feedback: `${analysisResult.grammar.feedback.good}|${analysisResult.grammar.feedback.bad}|${analysisResult.grammar.feedback.ugly}`,
              skills_score: analysisResult.skills.score,
              skills_feedback: `${analysisResult.skills.feedback.good}|${analysisResult.skills.feedback.bad}|${analysisResult.skills.feedback.ugly}`,
            })
            .select()
            .single()

            console.log("I am here in fetching");

          if (insertError)
            {throw insertError}

          analysisData = newAnalysis
        }

        // Set the analysis data regardless of whether it was existing or new
        setAnalysis({
          clarity: {
            score: analysisData.clarity_score,
            feedback: formatFeedback(analysisData.clarity_feedback),
          },
          content: {
            score: analysisData.content_score,
            feedback: formatFeedback(analysisData.content_feedback),
          },
          impact: {
            score: analysisData.impact_score,
            feedback: formatFeedback(analysisData.impact_feedback),
          },
          grammar: {
            score: analysisData.grammar_score,
            feedback: formatFeedback(analysisData.grammar_feedback),
          },
          skills: {
            score: analysisData.skills_score,
            feedback: formatFeedback(analysisData.skills_feedback),
          },
        })

        const totalScore =
        (analysisData.clarity_score +
          analysisData.content_score +
          analysisData.impact_score +
          analysisData.grammar_score +
          analysisData.skills_score) * 2
        
          const { error: updateError } = await supabase
          .from("resumes")
          .update({
            total_score: totalScore,
            is_flagged_for_review: totalScore > 70,
          })
          .eq("id", resumeData.id)

        if (updateError) throw updateError

        setIsAnalyzing(false)
        setHasAnalyzed(true)

        // Show community button after 5 seconds
        setTimeout(() => {
          setShowCommunityButton(true)
        }, 5000)

        // Show community button after 5 seconds
        setTimeout(() => {
          setShowCommunityButton(true)
        }, 5000)
      } catch (error) {
        console.error("Error fetching or analyzing resume:", error)
        setIsAnalyzing(false)
        setHasAnalyzed(true)
      }
    }

    fetchResumeAndAnalyze()
  }, [user, router])

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
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-bold mb-6">Resume Analysis</h1>

            {isAnalyzing ? (
              <Card>
                <CardContent className="py-10">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="text-center">
                      <h3 className="text-lg font-semibold">Analyzing your resume...</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        This may take a minute. We're reviewing your resume across 5 key areas.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Overall Score Card */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Overall Score</CardTitle>
                    <CardDescription>Based on analysis of 5 key resume components</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center">
                      <div className="relative w-40 h-40 mb-4">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-4xl font-bold">
                            {Math.round(
                              (analysis.clarity.score +
                                analysis.content.score +
                                analysis.impact.score +
                                analysis.grammar.score +
                                analysis.skills.score) *
                                2,
                            )}
                            %
                          </span>
                        </div>
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle
                            className="text-muted stroke-current"
                            strokeWidth="10"
                            stroke="currentColor"
                            fill="transparent"
                            r="40"
                            cx="50"
                            cy="50"
                          />
                          <circle
                            className="text-primary stroke-current"
                            strokeWidth="10"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="40"
                            cx="50"
                            cy="50"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={
                              2 *
                              Math.PI *
                              40 *
                              (1 -
                                (analysis.clarity.score +
                                  analysis.content.score +
                                  analysis.impact.score +
                                  analysis.grammar.score +
                                  analysis.skills.score) /
                                  50)
                            }
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Clarity & Structure</span>
                            <span className="text-sm font-medium">{analysis.clarity.score}/10</span>
                          </div>
                          <Progress value={analysis.clarity.score * 10} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Relevant Content</span>
                            <span className="text-sm font-medium">{analysis.content.score}/10</span>
                          </div>
                          <Progress value={analysis.content.score * 10} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Impact & Achievements</span>
                            <span className="text-sm font-medium">{analysis.impact.score}/10</span>
                          </div>
                          <Progress value={analysis.impact.score * 10} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Grammar & Language</span>
                            <span className="text-sm font-medium">{analysis.grammar.score}/10</span>
                          </div>
                          <Progress value={analysis.grammar.score * 10} className="h-2" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Technical & Soft Skills</span>
                            <span className="text-sm font-medium">{analysis.skills.score}/10</span>
                          </div>
                          <Progress value={analysis.skills.score * 10} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Analysis Tabs */}
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="grid grid-cols-5 mb-8">
                    <TabsTrigger value="clarity" className="py-2.5">Clarity</TabsTrigger>
                    <TabsTrigger value="content" className="py-2.5">Content</TabsTrigger>
                    <TabsTrigger value="impact" className="py-2.5">Impact</TabsTrigger>
                    <TabsTrigger value="grammar" className="py-2.5">Grammar</TabsTrigger>
                    <TabsTrigger value="skills" className="py-2.5">Skills</TabsTrigger>
                  </TabsList>

                  <TabsContent value="clarity">
                    <FeedbackCard
                      title="Clarity & Structure"
                      score={analysis.clarity.score}
                      feedback={analysis.clarity.feedback}
                    />
                  </TabsContent>

                  <TabsContent value="content">
                    <FeedbackCard
                      title="Relevant Content"
                      score={analysis.content.score}
                      feedback={analysis.content.feedback}
                    />
                  </TabsContent>

                  <TabsContent value="impact">
                    <FeedbackCard
                      title="Impact & Achievements"
                      score={analysis.impact.score}
                      feedback={analysis.impact.feedback}
                    />
                  </TabsContent>

                  <TabsContent value="grammar">
                    <FeedbackCard
                      title="Grammar & Language"
                      score={analysis.grammar.score}
                      feedback={analysis.grammar.feedback}
                    />
                  </TabsContent>

                  <TabsContent value="skills">
                    <FeedbackCard
                      title="Technical & Soft Skills"
                      score={analysis.skills.score}
                      feedback={analysis.skills.feedback}
                    />
                  </TabsContent>
                </Tabs>

                {/* Community Button */}
                <AnimatePresence>
                  {showCommunityButton && (
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 50 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="fixed bottom-8 right-8"
                    >
                      <Button asChild size="lg" className="flex justify-between shadow-lg py-3 px-2 bg-white border ">
                        <Link href="/community">
                          <Users className="mr-2 h-5 w-5" />
                          See Similar Resumes
                        </Link>
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}

function FeedbackCard({ title, score, feedback }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <span className="text-2xl font-bold">{score}/10</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
          <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">The Good</h4>
          <p className="text-green-700 dark:text-green-400">{feedback.good}</p>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
          <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">The Bad</h4>
          <p className="text-amber-700 dark:text-amber-400">{feedback.bad}</p>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
          <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">The Ugly</h4>
          <p className="text-red-700 dark:text-red-400">{feedback.ugly}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          <div className="flex items-center justify-center gap-2"> 
          <p>👀 Apply for Manual Review</p>
          </div>
        </Button>
      </CardFooter>
    </Card>
  )
}
