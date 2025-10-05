"use client";

import { Marquee } from "../magicui/marquee";
import ReviewCard from "../review-card";

const reviews = [
  {
    name: "Kavisha",
    username: "@kavi_cs",
    body: "I can check all my grades instantly on SMCBI Portal. No more waiting for printouts or emails from professors!",
    img: "https://avatar.vercel.sh/kavisha.svg?text=K",
  },
  {
    name: "Tharindu",
    username: "@tharindu_it",
    body: "The Google Classroom integration is perfect. I can see all my tasks and assignments from different courses in one place.",
    img: "https://avatar.vercel.sh/tharindu.svg?text=T",
  },
  {
    name: "Nuwan",
    username: "@nuwan_eng",
    body: "Checking my enrolled courses and their details has never been easier. Everything is organized and up-to-date.",
    img: "https://avatar.vercel.sh/nuwan.svg?text=N",
  },
  {
    name: "Lakmini",
    username: "@lakmini_sci",
    body: "Love how I can view my Google Classroom tasks directly in the portal. No need to switch between multiple apps anymore.",
    img: "https://avatar.vercel.sh/lakmini.svg?text=L",
  },
  {
    name: "Chamod",
    username: "@chamod_bus",
    body: "As a student, I can track my academic progress with real-time grade updates. The portal keeps everything transparent.",
    img: "https://avatar.vercel.sh/chamod.svg?text=C",
  },
  {
    name: "Ayeshi",
    username: "@ayeshi_design",
    body: "The course enrollment feature makes registration so smooth. I can see all available courses and my current enrollments.",
    img: "https://avatar.vercel.sh/ayeshi.svg?text=A",
  },
  {
    name: "Dinesh",
    username: "@dinesh_admin",
    body: "As an instructor, inputting and managing student grades through the portal is incredibly efficient and secure.",
    img: "https://avatar.vercel.sh/dinesh.svg?text=D",
  },
];

const firstRow = reviews.slice(0, reviews.length / 2);
const secondRow = reviews.slice(reviews.length / 2);

export default function Testamonials() {
  return (
    <>
      <section className="py-12 bg-gradient-to-b from-primary/5 to-background w-full">
        <div className="relative z-10 max-w-5xl mx-auto h-full w-full flex flex-col gap-16">
          {/* Text */}
          <div className="mx-auto text-center max-w-2xl px-4 space-y-6">
            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl mx-auto lg:text-4xl tracking-tighter font-semibold leading-tight">
               Students Response
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
              Over 100 students have already responded with
              SMCBI Portal.
            </p>
          </div>
        </div>
      </section>
      <section className="py-12 bg-background w-full">
        <div className="relative z-10 max-w-5xl mx-auto h-full w-full flex flex-col gap-8 px-4 md:px-0">
          <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
            <Marquee pauseOnHover className="[--duration:20s]">
              {firstRow.map((review) => (
                <ReviewCard key={review.username} {...review} />
              ))}
            </Marquee>
            <Marquee reverse pauseOnHover className="[--duration:20s]">
              {secondRow.map((review) => (
                <ReviewCard key={review.username} {...review} />
              ))}
            </Marquee>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background"></div>
          </div>
        </div>
      </section>
    </>
  );
}
