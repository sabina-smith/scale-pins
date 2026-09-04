import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ShaderBackdrop from "@/components/shader-backdrop";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pin Board",
  description: "A shared feed of links.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-stone-50 text-stone-900">
        <ShaderBackdrop />
        {children}
      </body>
    </html>
  );
}
