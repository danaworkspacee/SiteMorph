"use client";

import { Braces, Download, Rocket } from "lucide-react";

export default function Features() {
  const features = [
    {
      title: "Download HTML Files",
      description: "Get clean HTML + Tailwind from any website with one click.",
      icon: <Download className="h-6 w-6 text-black" />,
      bg: "bg-[#ffb110]",
      titleColor: "text-black",
      bodyColor: "text-black/70",
    },
    {
      title: "Deploy Anywhere (Coming Soon)",
      description: "Publish mirrors to your hosting or our managed hosting (soon).",
      icon: <Rocket className="h-6 w-6 text-[#0075de]" />,
      bg: "bg-[#e6f3fe]",
      titleColor: "text-black",
      bodyColor: "text-black/70",
    },
    {
      title: "Tailwind, Readable by Default",
      description: "Every page also ships as beautified Tailwind HTML plus a minified variant. No AI agent, no API key.",
      icon: <Braces className="h-6 w-6 text-[#f64932]" />,
      bg: "bg-[#f64932]",
      titleColor: "text-white",
      bodyColor: "text-white/80",
    },
  ];

  return (
    <div className="py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-5xl font-medium tracking-[-0.035em] leading-[1.04] text-black">
            Everything you need to morph any website
          </h2>
          <p className="mt-5 font-serif text-lg leading-relaxed text-[#615d59]">
            SiteMorph lets anyone morph any website into clean code without technical steps.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div key={i} className={`flex flex-col gap-6 rounded-xl p-6 ${feature.bg}`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                {feature.icon}
              </div>
              <div>
                <h3 className={`text-[22px] font-bold tracking-[-0.011em] leading-[1.27] ${feature.titleColor}`}>
                  {feature.title}
                </h3>
                <p className={`mt-2 text-base leading-relaxed ${feature.bodyColor}`}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
