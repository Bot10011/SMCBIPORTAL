import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
 
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
 
import CountUp from 'react-countup';
import { supabase } from './lib/supabase';
import { 
  BookOpen, 
  GraduationCap, 
  Users,  
  CheckCircle2, 
  ArrowRight, 
  Menu, 
  X, 
  ChevronRight,
  BarChart2,
  Bell,
  Shield,
  Clock
} from 'lucide-react';

const MainLandingPage: React.FC = () => {
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  
  const features = [
    {
      title: "Student Portal",
      description: "Access grades, schedules, tasks, and subjects in one centralized dashboard.",
      icon: <BookOpen className="w-6 h-6" />,
      color: "from-blue-500 to-indigo-600",
      image: "/img/student-portal.jpg"
    },
    {
      title: "Enrollment System",
      description: "Streamlined online enrollment process with real-time status tracking.",
      icon: <GraduationCap className="w-6 h-6" />,
      color: "from-emerald-500 to-teal-600",
      image: "/img/enrollment.jpg"
    },
    {
      title: "Grade Management",
      description: "Grade submission and viewing with security measures and analytics.",
      icon: <BarChart2 className="w-6 h-6" />,
      color: "from-amber-500 to-orange-600",
      image: "/img/grade.png"
    },
    {
      title: "Subject Management",
      description: "Easy subjects selection with prerequisite checking.",
      icon: <BookOpen className="w-6 h-6" />,
      color: "from-purple-500 to-fuchsia-600",
      image: "/img/subject.png"
    }
  ];

  const [dbStats, setDbStats] = useState({ students: 0, courses: 0, faculty: 0, satisfaction: 0, hasSatisfactionData: false });
  const [, setStatsLoading] = useState<boolean>(false);

  const stats = [
    { value: dbStats.students, label: "Students", icon: <Users className="w-5 h-5" /> },
    { value: dbStats.courses, label: "Courses", icon: <BookOpen className="w-5 h-5" /> },
    { value: dbStats.faculty, label: "Faculty", icon: <GraduationCap className="w-5 h-5" /> },
    { value: dbStats.satisfaction, label: "Satisfaction %", icon: <CheckCircle2 className="w-5 h-5" />, meta: { hasData: dbStats.hasSatisfactionData } }
  ];

  // Parallax effects
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.3]);
  
// Removed floating animation for the showcase image

  // Check if elements are in viewport for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const currentStatsRef = statsRef.current;
    if (currentStatsRef) {
      observer.observe(currentStatsRef);
    }

    return () => {
      if (currentStatsRef) {
        observer.unobserve(currentStatsRef);
      }
    };
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [features.length]);

  // Fetch statistics from database
  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const [studentsRes, coursesRes, instructorsRes, programHeadRes, activeUsersRes, totalUsersRes] = await Promise.all([
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('courses').select('*', { count: 'exact', head: true }),
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'instructor'),
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'program_head'),
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        ]);

        const students = studentsRes.count || 0;
        const courses = coursesRes.count || 0;
        const faculty = (instructorsRes.count || 0) + (programHeadRes.count || 0);
        const totalUsers = totalUsersRes.count || 0;
        const activeUsers = activeUsersRes.count || 0;
        const satisfaction = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 0) : 0;
        const hasSatisfactionData = activeUsers > 0;

        if (isMounted) setDbStats({ students, courses, faculty, satisfaction, hasSatisfactionData });
      } catch {
        if (isMounted) setDbStats({ students: 0, courses: 0, faculty: 0, satisfaction: 0, hasSatisfactionData: false });
      } finally {
        if (isMounted) setStatsLoading(false);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  // Handle navigation
  const handleLogin = () => {
    const url = `${window.location.origin}/loginpage`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Scroll to section (delay to let mobile menu close first)
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    setIsMenuOpen(false);
    if (!ref.current) return;
    // Allow the collapse animation a brief moment, then scroll
    setTimeout(() => {
      try {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {
        // no-op
      }
    }, 60);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50  overflow-x-hidden">
      {/* Navigation via Portal to ensure always on top */}
      <StickyHeader 
        isMenuOpen={isMenuOpen}
        toggleMenu={() => setIsMenuOpen(v => !v)}
        onHome={() => scrollToSection(heroRef)}
        onFeatures={() => scrollToSection(featuresRef)}
        onAbout={() => scrollToSection(statsRef)}
        onLogin={handleLogin}
      />

      {/* Hero Section */}
      <motion.section 
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="pt-40 md:pt-44 pb-16 md:pb-24 px-4 relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto">
          {/* Accent radial highlight behind heading */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 -top-12 mx-auto h-40 w-[90%] max-w-3xl rounded-full blur-3xl opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400/40 via-indigo-400/30 to-transparent" />
          </div>

          {/* Centered headline and actions */}
          <motion.div
            className="text-center max-w-3xl md:max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight md:whitespace-nowrap">
              SMCBI School Portal & Enrollment System
            </h1>
            <p className="mt-4 md:mt-5 text-base md:text-lg text-gray-600 leading-relaxed">
            A modern, user-friendly platform designed to streamline academic processes and improve the educational experience for students, faculty, registrars, and program heads.
            </p>
            {/* CTA buttons removed as requested */}
          </motion.div>

          {/* Showcase image card under CTA (centered) */}
          <div className="mt-8 md:mt-12">
            <Carousel />
          </div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute top-20 right-10 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-10 left-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </motion.section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-16 md:py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Features</h2>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              Our system is designed to support a seamless educational experience.
              </p>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Feature Tabs */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                    activeFeature === index 
                      ? `bg-gradient-to-r ${feature.color} text-white shadow-lg` 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${
                      activeFeature === index ? 'bg-white/20' : 'bg-white'
                    }`}>
                      {feature.icon}
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold text-lg">{feature.title}</h3>
                      <p className={`text-sm mt-1 ${
                        activeFeature === index ? 'text-white/90' : 'text-gray-600'
                      }`}>
                        {feature.description}
                      </p>
                    </div>
                    <ChevronRight className={`ml-auto ${
                      activeFeature === index ? 'text-white' : 'text-gray-400'
                    }`} />
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Feature Preview (image based on selected feature) */}
            <div className="relative h-80 lg:h-auto rounded-xl overflow-hidden shadow-xl border border-gray-200">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="absolute inset-0"
                >
                  <div className="relative w-full h-full">
                    <img 
                      src={features[activeFeature].image}
                      alt={features[activeFeature].title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/img/logo3.png'; }}
                    />
                    {/* Caption overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4">
                      <h3 className="text-white text-lg font-semibold">{features[activeFeature].title}</h3>
                      <p className="text-white/80 text-sm">{features[activeFeature].description}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          
          {/* Additional Features */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: <Bell className="w-6 h-6" />, 
                title: "Announcements", 
                description: "Stay updated with important school announcements and events." 
              },
              { 
                icon: <GoogleClassroomIcon className="w-6 h-6" />, 
                title: "Google Classroom", 
                description: "Integrated with Google Classroom for assignments, and updates.", 
              },
              { 
                icon: <Shield className="w-6 h-6" />, 
                title: "Secure Access", 
                description: "Your data is protected with standard security." 
              },
              { 
                icon: <Clock className="w-6 h-6" />, 
                title: "24/7 Access", 
                description: "Access your portal anytime, anywhere, on any device." 
              }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="pt-2 sm:pt-4 md:pt-20 pb-24 md:pb-32 px-4 text-white relative overflow-hidden min-h-[560px] sm:min-h-[680px] md:min-h-[840px]">
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-[length:800px_auto] sm:bg-[length:1000px_auto] md:bg-[length:1200px_auto] lg:bg-[length:1400px_auto]"
          style={{ backgroundImage: "url('/img/impact.jpg')" }}
        />
        <div className="absolute inset-0 " />
        <div className="relative max-w-7xl mx-auto mt-0 md:mt-16 pt-8 sm:pt-10 md:pt-0">
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              
            >
              <h2 className="text-3xl md:text-4xl font-bold">Our Impact</h2>
              <p className="mt-4 text-lg text-blue-100 max-w-3xl mx-auto">
                Transforming education through technology and innovation.
              </p>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 -mt-2">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md p-4 md:p-5 rounded-xl text-center"
              >
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  {stat.icon}
                </div>
                <div className="text-2xl md:text-3xl font-bold mb-1.5">
                  {isVisible && (
                    <CountUp 
                      end={stat.value} 
                      duration={2.5} 
                      separator="," 
                      suffix={stat.label === "Satisfaction %" ? "%" : ""} 
                    />
                  )}
                </div>
                <p className="text-blue-100 text-sm md:text-base">{stat.label}</p>
                {stat.label === 'Satisfaction %' && stat.meta && stat.meta.hasData === false && (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs text-blue-100/80">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-300" />
                    No responses yet
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 md:p-12 shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-8 md:mb-0 md:mr-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to get started?</h2>
                  <p className="text-gray-300 text-lg">
                    Log in to access your student portal and enrollment system.
                  </p>
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <button 
                  onClick={handleLogin}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-lg transition-colors shadow-lg hover:shadow-xl flex items-center"
                >
                  Log In Now
                  <motion.span
                    className="ml-2 inline-flex"
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="pt-6 text-center">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} St. Mary's College of Bansalan, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Custom animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        /* Subtle depth hover for header nav without movement */
        .nav-3d {
          will-change: box-shadow;
        }
      `}</style>
    </div>
  );
};

export default MainLandingPage;

// Fixed/sticky header rendered via portal to body to guarantee top-most stacking
function StickyHeader({
  isMenuOpen,
  toggleMenu,
  onHome,
  onFeatures,
  onAbout,
  onLogin
}: {
  isMenuOpen: boolean;
  toggleMenu: () => void;
  onHome: () => void;
  onFeatures: () => void;
  onAbout: () => void;
  onLogin: () => void;
}) {
  const header = (
    <header className="fixed top-2 sm:top-3 md:top-6 left-0 right-0 z-[99999]">
      <motion.div className="relative mx-auto w-[92%] md:w-[80%] bg-white/60 backdrop-blur-md backdrop-saturate-150 rounded-2xl ring-1 ring-white/60 shadow-[0_8px_24px_rgba(0,0,0,0.08)] pointer-events-auto">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-3">
            <div className="flex items-center">
              <img src="/img/logo1.png" alt="SMCBI Logo" className="h-10 w-auto" />
            </div>
            <nav className="hidden md:flex flex-1 items-center justify-center gap-10">
              <button onClick={onHome} className="nav-3d text-gray-700 font-medium rounded-md px-3 py-1.5 bg-transparent transition-shadow duration-200 hover:bg-blue-50 shadow-none hover:shadow-[0_8px_20px_rgba(37,99,235,0.15)]">Home</button>
              <button onClick={onFeatures} className="nav-3d text-gray-700 font-medium rounded-md px-3 py-1.5 bg-transparent transition-shadow duration-200 hover:bg-blue-50 shadow-none hover:shadow-[0_8px_20px_rgba(37,99,235,0.15)]">Features</button>
              <button onClick={onAbout} className="nav-3d text-gray-700 font-medium rounded-md px-3 py-1.5 bg-transparent transition-shadow duration-200 hover:bg-blue-50 shadow-none hover:shadow-[0_8px_20px_rgba(37,99,235,0.15)]">About</button>
            </nav>
            <button onClick={onLogin} className="hidden md:inline-flex bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg">Log In</button>
            <button className="md:hidden ml-auto rounded-md p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100" onClick={toggleMenu}>
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden bg-white/70 backdrop-blur-md ring-1 ring-white/60 rounded-2xl mx-auto w-[92%] max-w-sm mt-2"
          >
            <div className="px-4 py-2 space-y-1 text-center">
              <button onClick={onHome} className="block w-full px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 font-medium transition-colors">Home</button>
              <button onClick={onFeatures} className="block w-full px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 font-medium transition-colors">Features</button>
              <button onClick={onAbout} className="block w-full px-3 py-2 rounded-md text-gray-700 hover:bg-blue-50 font-medium transition-colors">About</button>
              <button onClick={onLogin} className="block w-full px-3 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors mt-2">Log In</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );

  return createPortal(header, document.body);
}

// Simple auto-playing, swipeable carousel (no hover effects)
const Carousel: React.FC = () => {
  const images = useMemo(() => [
    '/img/bglandingpage.png',
    '/img/bglandingpage1.png',
    '/img/bglandingpage2.png'
  ], []);

  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const next = () => setIndex(prev => (prev + 1) % images.length);
    timerRef.current = window.setInterval(next, 4000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [images.length]);

  // Touch swipe support
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startX = 0;
    let isDown = false;
    const onTouchStart = (e: TouchEvent) => { isDown = true; startX = e.touches[0].clientX; };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDown) return;
      const dx = e.touches[0].clientX - startX;
      if (Math.abs(dx) > 40) {
        isDown = false;
        if (timerRef.current) window.clearInterval(timerRef.current);
        setIndex(prev => (dx > 0 ? (prev - 1 + images.length) % images.length : (prev + 1) % images.length));
        timerRef.current = window.setInterval(() => setIndex(p => (p + 1) % images.length), 4000);
      }
    };
    const onTouchEnd = () => { isDown = false; };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart as EventListener);
      el.removeEventListener('touchmove', onTouchMove as EventListener);
      el.removeEventListener('touchend', onTouchEnd as EventListener);
    };
  }, [images.length]);

  return (
    <div className="relative mx-auto w-full max-w-4xl md:max-w-3xl">
      <div ref={containerRef} className="relative overflow-hidden rounded-2xl border border-gray-200">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={images[index]}
            src={images[index]}
            alt="Showcase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/img/logo3.png'; }}
            className="w-full h-auto object-cover select-none"
          />
        </AnimatePresence>
        {/* Soft vignette for depth */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.0),_rgba(0,0,0,0.08))]" />
      </div>

      {/* Indicators */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-blue-600' : 'w-3 bg-gray-300'}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>

      {/* Arrow controls removed as requested */}
    </div>
  );
};

// Inline Google Classroom icon styled to match line icons (monochrome, stroke only)
function GoogleClassroomIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Outer screen */}
      <rect x="3" y="5" width="18" height="12" rx="2" />
      {/* Inner board */}
      <rect x="6" y="8" width="12" height="7" rx="1" />
      {/* User head */}
      <circle cx="12" cy="11" r="1.8" />
      {/* User shoulders */}
      <path d="M8.5 15c.7-1.4 2.2-2.2 3.5-2.2S14.8 13.6 15.5 15" />
    </svg>
  );
}
