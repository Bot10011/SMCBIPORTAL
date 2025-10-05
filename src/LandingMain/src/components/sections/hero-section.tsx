
import { Safari } from "../magicui/safari";

import Iphone15Pro from "../magicui/iphone-15-pro";



export default function HeroSection() {
  return (
    <section
      className="relative flex flex-col items-center w-full px-6"
      id="hero"
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 -z-10 h-[800px] md:h-[800px] w-full [background:radial-gradient(125%_125%_at_50%_10%,var(--background)_35%,var(--primary)_100%)]"></div>
      </div>

      <div className="relative z-10 pt-32 max-w-5xl mx-auto h-full w-full flex flex-col gap-16 items-center justify-center">
        {/* Text */}
        <div className="mx-auto text-center space-y-6">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-semibold leading-tight">
          SMCBI School Portal &
            <br />
            <span className="text-primary">Enrollment System.</span>
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
            A modern, user-friendly platform designed to streamline academic processes and improve the educational experience
             for students, faculty, registrars, and program heads.
          </p>
        </div>

      
      </div>

      {/* Supporting Visual */}
      <div className="relative max-w-5xl px-4 mt-16 mb-16 md:mb-24">
        <Safari
          url="smcbiportal.vercel.app"
          className="size-full shadow-2xl shadow-muted-foreground/15 rounded-2xl hidden sm:block"
          imageSrc={"/Screenshot.png"}
        />

        <Iphone15Pro
          className="size-full block sm:hidden"
          src="/ScreenshotMobile.png"
        />
      </div>

     

      <div className="absolute bottom-8 -z-10 w-full h-[400px] bg-gradient-to-b from-background/5 to-background" />
    </section>
  );
}
