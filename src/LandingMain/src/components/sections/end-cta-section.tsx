"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download } from "lucide-react";
import Link from "next/link";

export default function EndCTASection() {
  // When clicked, we swap label to Coming Soon and block navigation.
  const [comingSoon, setComingSoon] = useState(false);

  // Auto revert after 10 seconds
  useEffect(() => {
    if (!comingSoon) return;
    const t = setTimeout(() => setComingSoon(false), 10000); // 10s
    return () => clearTimeout(t);
  }, [comingSoon]);

  const handleDownloadClick = (e: React.MouseEvent) => {
    if (!comingSoon) {
      e.preventDefault(); // block navigation
      setComingSoon(true);
    }
  };

  return (
    <section className="py-12 bg-gradient-to-b from-primary/5 to-background w-full relative">
      
      <div className="max-w-5xl px-4 xl:px-0 mx-auto relative text-center border shadow-2xl shadow-muted-foreground/50 bg-gradient-to-bl from-primary via-violet-900 to-violet-950 py-12 rounded">
        <div className="relative space-y-12">
          <div className="max-w-5xl mx-auto h-full w-full flex flex-col gap-16 text-background">
            {/* Text */}
            <div className="mx-auto text-center max-w-2xl px-4 space-y-6">
              {/* Main Headline */}
              <h1 className="text-2xl sm:text-3xl mx-auto lg:text-4xl tracking-tighter font-semibold leading-tight">
                Ready to Get Your Life Back?
              </h1>

            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="outline" size="lg" asChild>
              <Link
                href={comingSoon ? "#" : "https://drive.google.com/drive/folders/1kmvUYEbIR7bOfn7RVhUGTDwxxiQuqW_K?usp=sharing"}
                onClick={handleDownloadClick}
                aria-disabled={comingSoon}
                role="button"
              >
                <span className="inline-flex items-center gap-2 relative">
                  {/* Two layered labels for smooth cross-fade */}
                  <span className="block">
                    <span
                      className={
                        "absolute inset-0 transition-all duration-300 ease-out " +
                        (comingSoon
                          ? "opacity-0 translate-y-1 scale-[.97]"
                          : "opacity-100 translate-y-0 scale-100")
                      }
                      aria-hidden={comingSoon}
                    >
                      Download App
                    </span>
                    <span
                      className={
                        "absolute inset-0 transition-all duration-300 ease-out " +
                        (comingSoon
                          ? "opacity-100 translate-y-0 scale-100"
                          : "opacity-0 -translate-y-1 scale-[.97]")
                      }
                      aria-hidden={!comingSoon}
                    >
                      Coming Soon 
                    </span>
                    {/* Static spacer to preserve button width */}
                    <span className="invisible select-none">Download App </span>
                  </span>
                  <Download className="h-5 w-5 transition-opacity duration-300" />
                </span>
              </Link>
            </Button>
            <Button
              size="lg"
              variant={"outline"}
              className="shadow-2xl hover:shadow"
              asChild
            >
             <Link href="https://smcbiportal.vercel.app/loginpage">
                Try SMCBI Portal Now
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
