"use client"

import type React from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Sparkles,
  Type,
  Underline,
} from "lucide-react"
import { cn } from "@/lib/utils"

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000"

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  children: React.ReactNode
  title: string
}

const ToolbarButton = ({ onClick, isActive, children, title }: ToolbarButtonProps) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onClick}
    className={cn(
      "h-9 w-9 p-0 transition-all duration-300 hover:scale-105",
      "bg-white/10 backdrop-blur-md border border-white/20 rounded-xl",
      "hover:bg-white/20 hover:border-white/30 hover:shadow-lg hover:shadow-purple-500/20",
      "group relative overflow-hidden",
      isActive && "bg-purple-500/30 text-white border-purple-400/50 shadow-lg shadow-purple-500/30",
    )}
    title={title}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
    <div className="relative z-10 text-white/90 group-hover:text-white">{children}</div>
  </Button>
)

interface RichTextEditorProps {
  className?: string
}

export default function RichTextEditor({ className }: RichTextEditorProps) {
  const [content, setContent] = useState("")
  const editorRef = useRef<HTMLDivElement>(null)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<null | { kind: "success" | "error"; message: string }>(null)

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    updateActiveFormats()
  }, [])

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>()
    if (document.queryCommandState("bold")) formats.add("bold")
    if (document.queryCommandState("italic")) formats.add("italic")
    if (document.queryCommandState("underline")) formats.add("underline")
    if (document.queryCommandState("insertUnorderedList")) formats.add("ul")
    if (document.queryCommandState("insertOrderedList")) formats.add("ol")
    setActiveFormats(formats)
  }, [])

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML)
      updateActiveFormats()
    }
  }, [updateActiveFormats])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case "b":
            e.preventDefault()
            execCommand("bold")
            break
          case "i":
            e.preventDefault()
            execCommand("italic")
            break
          case "u":
            e.preventDefault()
            execCommand("underline")
            break
        }
      }
    },
    [execCommand],
  )

  const insertLink = useCallback(() => {
    const url = prompt("Enter URL:")
    if (url) {
      execCommand("createLink", url)
    }
  }, [execCommand])

  const wordCount = useMemo(() => {
    return content
      .replace(/<[^>]*>/g, "")
      .split(/\s+/)
      .filter(Boolean).length
  }, [content])

  const characterCount = useMemo(() => content.replace(/<[^>]*>/g, "").length, [content])

  const handleMutate = useCallback(async () => {
    const prompt = editorRef.current?.innerText?.trim()
    if (!prompt) {
      setStatus({ kind: "error", message: "Describe your next mutation before sending it to Species 8." })
      return
    }

    setIsSubmitting(true)
    setStatus(null)
    try {
      const response = await fetch(`${SERVER_URL}/mutate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          html: content,
          settings: { wordCount, characterCount },
        }),
      })

      if (!response.ok) {
        throw new Error(`Bridge responded with ${response.status}`)
      }

      const mutation = await response.json()
      setStatus({
        kind: "success",
        message: `Mutation ${mutation.id} queued. Check the Node bridge stream for progress.`,
      })
    } catch (error) {
      console.error(error)
      setStatus({
        kind: "error",
        message: "Unable to reach the Species 8 bridge. Start `npm run dev` inside /server.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [content, wordCount, characterCount])

  return (
    <div className={cn("relative w-full mx-auto", className)}>
      <div className="absolute -inset-6 bg-gradient-to-br from-purple-700/30 via-transparent to-cyan-400/20 blur-3xl opacity-80 pointer-events-none" />

      <div className="relative w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-[0_45px_120px_rgba(10,2,25,0.55)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-purple-500/5 rounded-[32px] pointer-events-none" />

        <div className="flex flex-wrap items-center gap-2 p-6 bg-white/5 backdrop-blur-xl border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 mr-2">
              <div className="p-2 bg-purple-500/20 backdrop-blur-sm rounded-xl border border-purple-400/30">
                <Sparkles className="h-4 w-4 text-purple-300" />
              </div>
              <span className="text-sm font-semibold text-white/90 font-sans">AI Prompt Console</span>
            </div>

            <ToolbarButton
              onClick={() => execCommand("formatBlock", "<h1>")}
              isActive={activeFormats.has("h1")}
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => execCommand("formatBlock", "<h2>")}
              isActive={activeFormats.has("h2")}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => execCommand("formatBlock", "<h3>")}
              isActive={activeFormats.has("h3")}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <Separator orientation="vertical" className="h-6 mx-3 bg-white/20 hidden md:block" />

          <div className="flex items-center gap-1 flex-wrap">
            <ToolbarButton
              onClick={() => execCommand("bold")}
              isActive={activeFormats.has("bold")}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => execCommand("italic")}
              isActive={activeFormats.has("italic")}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => execCommand("underline")}
              isActive={activeFormats.has("underline")}
              title="Underline (Ctrl+U)"
            >
              <Underline className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <Separator orientation="vertical" className="h-6 mx-3 bg-white/20 hidden md:block" />

          <div className="flex items-center gap-1 flex-wrap">
            <ToolbarButton
              onClick={() => execCommand("insertUnorderedList")}
              isActive={activeFormats.has("ul")}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => execCommand("insertOrderedList")}
              isActive={activeFormats.has("ol")}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCommand("formatBlock", "<blockquote>")} title="Quote block">
              <Quote className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <Separator orientation="vertical" className="h-6 mx-3 bg-white/20 hidden md:block" />

          <div className="flex items-center gap-1 flex-wrap">
            <ToolbarButton onClick={() => execCommand("justifyLeft")} title="Align Left">
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCommand("justifyCenter")} title="Align Center">
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCommand("justifyRight")} title="Align Right">
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <Separator orientation="vertical" className="h-6 mx-3 bg-white/20 hidden md:block" />

          <div className="flex items-center gap-1 flex-wrap">
            <ToolbarButton onClick={insertLink} title="Insert Link">
              <Link2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCommand("formatBlock", "<pre>")} title="Code Block">
              <Code2 className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>

        <div className="relative">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onMouseUp={updateActiveFormats}
            onKeyUp={updateActiveFormats}
            className={cn(
              "min-h-[480px] p-8 focus:outline-none relative z-10 custom-scrollbar",
              "prose prose-lg max-w-none font-sans text-white/95 leading-relaxed",
              "transition-all duration-300 selection:bg-purple-500/30 selection:text-white",
              "[&>h1]:text-4xl [&>h1]:font-bold [&>h1]:text-white [&>h1]:mb-6 [&>h1]:mt-8",
              "[&>h2]:text-3xl [&>h2]:font-semibold [&>h2]:text-white/95 [&>h2]:mb-4 [&>h2]:mt-6",
              "[&>h3]:text-2xl [&>h3]:font-medium [&>h3]:text-white/90 [&>h3]:mb-3 [&>h3]:mt-5",
              "[&>p]:mb-4 [&>p]:leading-relaxed [&>p]:text-white/90",
              "[&>ul]:mb-6 [&>ul]:pl-6 [&>ul]:text-white/90",
              "[&>ol]:mb-6 [&>ol]:pl-6 [&>ol]:text-white/90",
              "[&>li]:mb-2 [&>li]:text-white/90",
              "[&>blockquote]:border-l-4 [&>blockquote]:border-purple-400 [&>blockquote]:pl-6 [&>blockquote]:py-3 [&>blockquote]:italic [&>blockquote]:text-white/80 [&>blockquote]:bg-purple-500/10 [&>blockquote]:backdrop-blur-sm [&>blockquote]:rounded-r-xl [&>blockquote]:my-6",
              "[&>pre]:bg-black/30 [&>pre]:backdrop-blur-sm [&>pre]:p-6 [&>pre]:rounded-xl [&>pre]:font-mono [&>pre]:text-sm [&>pre]:text-green-300 [&>pre]:overflow-x-auto [&>pre]:border [&>pre]:border-white/10",
              "[&>code]:bg-purple-500/20 [&>code]:px-2 [&>code]:py-1 [&>code]:rounded [&>code]:text-sm [&>code]:font-mono [&>code]:text-purple-200",
              "[&_a]:text-purple-300 [&_a]:underline [&_a]:decoration-purple-300/50 [&_a]:underline-offset-2 hover:[&_a]:decoration-purple-200",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-white/30 empty:before:pointer-events-none",
            )}
            data-placeholder="Describe the atmosphere, movement, texture, and feeling you want Species 8 to create..."
            suppressContentEditableWarning
          />
        </div>

        <div className="px-8 py-6 bg-white/5 backdrop-blur-xl border-t border-white/10 text-sm text-white/70 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <span className="flex items-center gap-2 text-white/80">
                <Type className="h-4 w-4 text-purple-300" />
                Words: <span className="text-white/95 font-medium">{wordCount}</span>
              </span>
              <span className="flex items-center gap-2 text-white/80">
                Characters: <span className="text-white/95 font-medium">{characterCount}</span>
              </span>
            </div>
            <div className="flex flex-col items-start lg:items-end gap-2">
              <Button
                className="px-8 py-2 bg-gradient-to-r from-purple-500 to-cyan-400 text-black font-semibold rounded-full shadow-lg shadow-purple-500/30 hover:shadow-cyan-400/30"
                onClick={handleMutate}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending to bridge..." : "Mutate with Species 8"}
              </Button>
              {status && (
                <span
                  className={cn(
                    "text-xs max-w-sm text-left lg:text-right transition-colors",
                    status.kind === "success" ? "text-emerald-200" : "text-rose-200",
                  )}
                >
                  {status.message}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
