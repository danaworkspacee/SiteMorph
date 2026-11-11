"use client";

import Demo from "~/components/demo";
import Faq from "~/components/faq";
import Footer from "~/components/footer";
import Hero from "~/components/hero";
import Features from "~/components/features";
import { Toaster } from "sonner";

export function LandingPage() {
  return (
    <>
      <Toaster position="top-center" />
      <main className="mx-auto max-w-[1440px] w-full h-full flex-1 flex flex-col relative">
        <Hero />
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <Demo
              title="Export from the web UI"
              description="Paste any website URL, click Download, and get a ZIP with clean HTML + Tailwind, no install needed."
              videoSrc="/demo-ui.webm"
              thumbnailSrc="/demo-ui.png"
            />
            <Demo
              title="Export from the command line"
              description="One command mirrors a whole site into clean, readable Tailwind HTML."
              videoSrc="/demo-cli.webm"
              thumbnailSrc="/demo-cli.png"
            />
          </div>
        </div>
        <Features />
        <Faq />
        <Footer />
      </main>
    </>
  );
}
