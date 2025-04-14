// components/EmailModal.tsx
"use client"
import { useState } from "react"
import { Dialog } from "@headlessui/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSupabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"

export default function EmailModal({ open, onClose }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email) {
      toast.error("Please enter an email")
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("supporters").insert({ email })

      if (error) throw error

      toast.success("Thanks for supporting!")
      onClose()
      setEmail("")
    } catch (error) {
      console.error("Error saving email:", error.message)
      toast.error("Failed to save email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={onClose}
          className="fixed z-50 inset-0 flex items-center justify-center bg-black/30"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <Dialog.Panel className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
              <Dialog.Title className="text-lg font-semibold mb-2">Be our early supporter 🩵</Dialog.Title>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mb-4 p-2"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="outline" disabled={loading}>
                  {loading ? "Saving..." : "Submit"}
                </Button>
              </div>
            </Dialog.Panel>
          </motion.div>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
