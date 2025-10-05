"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import logoBrand from "@/assets/images/logobrand.svg";
import Image from "next/image";

import { Menu } from "lucide-react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#", label: "Home" },
    { href: "#hiw", label: "How it Works" },
    { href: "#benefits", label: "About" },
  
  ];

  return (
    <header
      className={`fixed top-0 md:top-4 left-0 right-0 z-50 bg-background/50 mx-auto backdrop-blur-lg border rounded transition-all duration-300 ${
        isScrolled ? "py-4 max-w-3xl" : "py-4 md:py-4 max-w-5xl"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-full">
              <Image
                src={logoBrand}
                alt="Logo"
                className="w-13 h-13 mx-auto sm:mx-0"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* CTA Button */}
            <Button asChild>
              <Link href="https://smcbiportal.vercel.app/loginpage">Try Now</Link>
            </Button>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] p-6">
                <SheetTitle />
                <SheetDescription />
                <div className="flex flex-col gap-6 mt-6">
                  <nav className="flex flex-col gap-4">
                    {navLinks.map((link) => (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-lg"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>

                  <div className="flex flex-col gap-4 pt-4 border-t">
                    <Button asChild>
                      <Link href="https://nexora.msanjana.com/login">
                        Try Now
                      </Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
