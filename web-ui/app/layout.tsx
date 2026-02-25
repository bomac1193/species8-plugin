import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

const sohne = localFont({
  src: [
    { path: "../public/fonts/sohne-light.otf", weight: "300", style: "normal" },
    { path: "../public/fonts/sohne-book.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/sohne-medium.otf", weight: "500", style: "normal" },
  ],
  variable: "--font-sohne",
  display: "swap",
})

const canela = localFont({
  src: [{ path: "../public/fonts/canela-regular.ttf", weight: "400", style: "normal" }],
  variable: "--font-canela",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Species 8",
  description: "Sound mutation console",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${sohne.variable} ${canela.variable} bg-[#0A0A0A] text-white min-h-screen`}>
        <Suspense fallback={null}>
          {children}
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}
