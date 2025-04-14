import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "ReviewMyResume.ai",
  description: "Get your resume reviewed by AI and industry professionals",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        
        <ThemeProvider attribute="class" defaultTheme="light">
          <AuthProvider>
            {children}
            <Analytics />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'