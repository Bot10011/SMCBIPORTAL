"use client";

import React, { useRef } from "react";

import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import Image from "next/image";

import logoBrand from "@/assets/images/logobrand.svg";
import {
  FaUserCog, // Admin
  FaUserTie, // Program Head
  FaClipboardList, // Registrar
  FaChalkboardTeacher, // Instructor
  FaUserShield, // Super Admin
  FaUser, // Student
} from "react-icons/fa";

export default function SystemOverview({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const div1Ref = useRef<HTMLDivElement>(null);
  const div2Ref = useRef<HTMLDivElement>(null);
  const div3Ref = useRef<HTMLDivElement>(null);
  const div4Ref = useRef<HTMLDivElement>(null);
  const div5Ref = useRef<HTMLDivElement>(null);
  const div6Ref = useRef<HTMLDivElement>(null);
  const div7Ref = useRef<HTMLDivElement>(null);

  return (
    <div
      className={cn(
        "relative h-full w-full items-center justify-center overflow-hidden p-10",
        className
      )}
      ref={containerRef}
    >
      <div className="flex size-full flex-col items-stretch justify-between">
        <div className="flex flex-wrap justify-center gap-4 mb-24">
          <div className="z-10">
            <div className="flex flex-col gap-2 border p-2 bg-background shadow-2xl shadow-muted-foreground/15 rounded">
              <div className="px-16 py-4 flex items-center justify-center h-full border rounded bg-gradient-to-tr from-blue-500/20 to-blue-500/5">
                <FaUserCog className="text-blue-500 h-6 w-6" />
              </div>
              <h2 className="text-lg p-2 font-semibold text-center">
                Admin
              </h2>
            </div>
            <div ref={div1Ref} />
          </div>
          <div className="z-10">
            <div className="flex flex-col gap-2 border p-2 bg-background shadow-2xl shadow-muted-foreground/15 rounded">
              <div className="px-16 py-4 flex items-center justify-center h-full border rounded bg-gradient-to-tr from-emerald-500/20 to-emerald-500/5">
                <FaUserTie className="text-emerald-500 h-6 w-6" />
              </div>
              <h2 className="text-lg p-2 font-semibold text-center">
                ProgramHead
              </h2>
            </div>
            <div ref={div2Ref} />
          </div>
          <div className="z-10">
            <div className="flex flex-col gap-2 border p-2 bg-background shadow-2xl shadow-muted-foreground/15 rounded">
              <div className="px-16 py-4 flex items-center justify-center h-full border rounded bg-gradient-to-tr from-purple-500/20 to-purple-500/5">
                <FaClipboardList className="text-purple-500 h-6 w-6" />
              </div>
              <h2 className="text-lg p-2 font-semibold text-center">
                Registrar
              </h2>
            </div>
            <div ref={div3Ref} />
          </div>
          <div className="z-10">
            <div className="flex flex-col gap-2 border p-2 bg-background shadow-2xl shadow-muted-foreground/15 rounded">
              <div className="px-16 py-4 flex items-center justify-center h-full border rounded bg-gradient-to-tr from-amber-500/20 to-amber-500/5">
                <FaChalkboardTeacher className="text-amber-500 h-6 w-6" />
              </div>
              <h2 className="text-lg p-2 font-semibold text-center">
                Instructor
              </h2>
            </div>
            <div ref={div4Ref} />
          </div>
          <div className="z-10">
            <div className="flex flex-col gap-2 border p-2 bg-background shadow-2xl shadow-muted-foreground/15 rounded">
              <div className="px-16 py-4 flex items-center justify-center h-full border rounded bg-gradient-to-tr from-rose-500/20 to-rose-500/5">
                <FaUserShield className="text-rose-500 h-6 w-6" />
              </div>
              <h2 className="text-lg p-2 font-semibold text-center">
               SuperAdmin
              </h2>
            </div>
            <div ref={div5Ref} />
          </div>
        </div>
        <div className="flex w-full items-center justify-center mb-8">
          <div className="size-32 z-10">
            <div className="p-1 border bg-violet-100 rounded">
              <div className="flex flex-col gap-2 border p-6 bg-background shadow-2xl shadow-muted-foreground/15 rounded">
                <Image
                  src={logoBrand}
                  alt="Brand Logo"
                  className="h-full w-full"
                />
              </div>
            </div>
            <div ref={div6Ref} />
          </div>
        </div>
        <div className="flex w-full items-center justify-center">
          <div className="z-10">
            <div ref={div7Ref} />
            <div className="flex flex-col gap-2 border p-2 bg-background shadow-2xl shadow-muted-foreground/15 rounded">
              <div className="px-16 py-4 flex items-center justify-center h-full border rounded bg-gradient-to-tr from-slate-500/20 to-slate-500/5">
                <FaUser className="size-6" />
              </div>
              <h2 className="text-lg p-2 font-semibold text-center">
                Student 
              </h2>
            </div>
          </div>
        </div>
      </div>

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div2Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div3Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div4Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div5Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div6Ref}
        toRef={div7Ref}
      />
    </div>
  );
}
