import { Clock, BookOpen, Shield } from "lucide-react";

export default function ProblemSection() {
  const problems = [
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Google Classroom",
      description:
        "Integrated with Google Classroom for assignments, and updates",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Access",
      description:
        "Your data is protected with standard security",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "24/7 Access",
      description:
        "Access your portal anytime, anywhere, on any device",
    },
  ];

  return (
    <>
      <section className="py-12  bg-gradient-to-t from-primary/5 to-background w-full">
        <div className="relative z-10 max-w-5xl mx-auto h-full w-full flex flex-col gap-16">
          {/* Text */}
          <div className="mx-auto text-center max-w-2xl px-4 space-y-6">
            {/* Main Headline */}
            <h1 className="text-2xl sm:text-3xl mx-auto lg:text-4xl tracking-tighter font-semibold leading-tight">
              All-in-One Access for Students.
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
              Stay connected with Google Classroom integration, secure data protection, and 24/7 accessibility on any device.
            </p>
          </div>
        </div>
      </section>
      <section className="py-12 bg-gradient-to-r from-primary/5 to-muted/50 w-full">
        <div className="relative z-10 max-w-5xl mx-auto h-full w-full flex flex-col gap-16">
          <div className="grid md:grid-cols-3 gap-0 px-4 xl:px-0">
            {problems.map((problem, index) => (
              <div key={index}>
                <div className="bg-card border text-center h-full">
                  <div className="bg-gradient-to-b from-primary/5 to-background aspect-video bg-muted flex justify-center items-center">
                    <div className="text-primary aspect-square text-8xl p-8 bg-background shadow-2xl shadow-muted-foreground/15 rounded -rotate-3">
                      <div className="scale-200">{problem.icon}</div>
                    </div>
                  </div>
                  <div className="p-6 border-t">
                    <h3 className="text-lg font-semibold mb-2">
                      {problem.title}
                    </h3>
                    <p className="">{problem.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
