import SystemOverview from "../system-overview";

export default function HowItWorksSection() {
  return (
    <>
      <section
        className="py-12 bg-gradient-to-t from-primary/5 to-background w-full"
        id="hiw"
      >
        <div className="relative z-10 max-w-5xl mx-auto h-full w-full flex flex-col gap-16">
          {/* Text */}
          <div className="mx-auto text-center max-w-2xl px-4 space-y-6">
            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl mx-auto lg:text-4xl tracking-tighter font-semibold leading-tight">
              Ask Once, Get Everything
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
              One simple question connects you to the exact information you
              need. No more guessing which website has what.
            </p>
          </div>
        </div>
      </section>
      <section className="py-12 bg-gradient-to-r from-primary/5 to-muted/50 w-full">
        <div className="relative z-10 max-w-5xl mx-auto h-full w-full flex flex-col gap-16">
          <SystemOverview />
        </div>
      </section>
    </>
  );
}
