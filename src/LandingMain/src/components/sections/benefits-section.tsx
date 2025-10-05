import Image from "next/image";
import { BentoCard, BentoGrid } from "../magicui/bento-grid";

export default function BenefitsSection() {
  const features = [
    {
      name: "Vision",
      description: `We, the Christ-centered community of St. Mary's College of Bansalan, Inc. faithful to Ignatian Marian Education continue to create a dynamic learning community which is geared towards holistic transformation for the common good.`,
      background: (
        <Image
          width={1920}
          height={1080}
          alt="Vision"
          src="/realtime.png"
          className="absolute -right-0 -top-20 opacity-50"
        />
      ),
      className:
        "col-span-3 lg:col-span-1 bg-gradient-to-bl from-blue-100 to-background",
    },
    {
      name: "Mission",
      description: (
        <ul className="list-decimal space-y-2 ps-5 marker:text-primary">
          <li>
            Grow in prayer and discernment to be witnesses of faith, hope and
            love in today&apos;s world.
          </li>
          <li>
            Continuously form Ignatian Marian leaders who witness to faith,
            excellence and service in varied socio-cultural settings.
          </li>
          <li>
            Constantly pursue quality management systems and educational
            innovations to develop global citizens.
          </li>
          <li>
            Build up resources to contribute to the enhancement of quality of
            life; and expand educational programs for the disadvantaged.
          </li>
        </ul>
      ),
      background: (
        <Image
          width={1920}
          height={1080}
          alt="Mission"
          src="/forms.png"
          className="absolute -right-0 -top-20 opacity-40"
        />
      ),
      className:
        "col-span-3 lg:col-span-1 bg-gradient-to-bl from-green-100 to-background",
    },
  ];
  return (
    <>
      <section
        className="py-12  bg-gradient-to-t from-primary/5 to-background w-full"
        id="benefits"
      >
        <div className="relative z-10 max-w-5xl mx-auto h-full w-full flex flex-col gap-16">
          {/* Text */}
          <div className="mx-auto text-center max-w-2xl px-4 space-y-6">
            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl mx-auto lg:text-4xl tracking-tighter font-semibold leading-tight">
              About
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg max-w-3xl mx-auto leading-relaxed text-muted-foreground">
              Discover the vision and mission that guide St. Mary&apos;s College of
              Bansalan toward holistic transformation, excellence, and service
              for the common good.
            </p>
          </div>
        </div>
      </section>
      <section className="py-12 bg-gradient-to-bl from-primary/5 to-muted/50 w-full">
        <div className="relative z-10 max-w-5xl mx-auto h-full w-full flex flex-col gap-10 px-4 xl:px-0">
          <BentoGrid className="grid-cols-1 lg:grid-cols-2 auto-rows-[auto]">
            {features.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </div>
      </section>
    </>
  );
}
