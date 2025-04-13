"use client"

import { Navbar } from "@/components/navbar"
import { ResumeUploader } from "@/components/resume-uploader"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative">
          {/* Animated background gradient */}
          <div className="absolute inset-0 animated-gradient -z-10 opacity-10"></div>

          <div className="container px-4 py-24 md:py-32">
            <div className="max-w-3xl mx-auto text-center">
              <motion.h1
                className="text-4xl md:text-6xl font-bold tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Get Your Resume <span className="gradient-text">Reviewed</span> by AI
              </motion.h1>
              <motion.p
                className="mt-6 text-lg text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Upload your resume and get instant feedback on structure, content, impact, grammar, and skills. Connect
                with mentors and see how your resume compares to others in your field.
              </motion.p>

              <motion.div
                className="mt-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <ResumeUploader />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-muted/50">
          <div className="container px-4">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Upload Your Resume",
                  description: "Upload your resume in PDF format to get started with the review process.",
                },
                {
                  title: "AI Analysis",
                  description: "Our AI analyzes your resume across 5 key areas and provides detailed feedback.",
                },
                {
                  title: "Expert Review",
                  description: "High-scoring resumes get additional feedback from industry mentors.",
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="bg-background rounded-lg p-6 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6">Ready to improve your resume?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join thousands of job seekers who have improved their resumes and landed their dream jobs.
              </p>
              <Button asChild size="lg">
                <Link href="#upload">Get Started</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 px-4">
          <p className="text-sm text-muted-foreground">© 2023 ReviewMyResume.ai. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
