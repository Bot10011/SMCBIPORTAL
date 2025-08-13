import { useEffect, useState } from 'react';
import Login from './Login';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import AnnouncementModal from './components/AnnouncementModal';
import { supabase } from './lib/supabase';
import { toast } from 'react-hot-toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const LandingPage = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDevStatus, setShowDevStatus] = useState(true);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [currentDevIndex, setCurrentDevIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for next, -1 for prev
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [recoveryCooldown, setRecoveryCooldown] = useState(0);
  const [verificationStep, setVerificationStep] = useState('email'); // 'email' or 'code'
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);

  // Add motion values for 3D effect with performance optimization
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Transform mouse movement to rotation with reduced sensitivity for better performance
  const rotateX = useTransform(y, [-50, 50], [15, -15]);
  const rotateY = useTransform(x, [-50, 50], [-15, 15]);

  // Add spring physics with optimized config for better performance
  const springConfig = { damping: 20, stiffness: 100 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  // Handle mouse movement with throttling for better performance
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    // Throttle mouse events for better performance on low-end devices
    if (event.movementX === 0 && event.movementY === 0) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  };

  // Reset position when mouse leaves
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showDevModal) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [showDevModal]);

  // Show announcement modal immediately on page load with performance optimization
  useEffect(() => {
    // Show modal immediately when component mounts
    const timer = setTimeout(() => {
      setShowAnnouncementModal(true);
    }, 100); // Small delay to ensure smooth loading
    
    return () => clearTimeout(timer);
  }, []);

  // Cooldown ticker for recovery
  useEffect(() => {
    if (recoveryCooldown <= 0) return;
    const t = setInterval(() => setRecoveryCooldown(v => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [recoveryCooldown]);

  // Fetch announcements from database with performance optimization
  useEffect(() => {
    let isMounted = true;
    
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10); // Limit results for better performance

        if (error) {
          console.error('Error fetching announcements:', error);
        } else if (isMounted) {
          const activeAnnouncements = data || [];
          setAnnouncements(activeAnnouncements);
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      }
    };

    // Add small delay to prioritize UI rendering
    const timer = setTimeout(fetchAnnouncements, 200);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 640px)').matches);
    checkMobile();
    
    // Throttled resize handler for better performance
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkMobile, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  const devs = [
    {
      img: '/img/1.jpg',
      name: 'Retchel Cabaron ',
      role: 'Team Lead',
      fb: 'https://www.facebook.com/retchel.cabaron.1',
    },
    {
      img: '/img/2.png',
      name: 'Jesson Mondejar',
      role: 'Lead Full-Stack Developer & UX/UI Designer',
      fb: 'https://www.facebook.com/code.write.debug.learn.build.repeat.improve.grow',
      gh: 'https://github.com/Bot10011',
      
    },
    {
      img: '/img/3.jpg',
      name: 'Larecion Rams',
      role: 'Co Full-Stack Developer & UX Designer',
      fb: 'https://www.facebook.com/larecion.rams.2024',
      gh: 'https://github.com/midastouch79',
    },
    {
      img: '/img/4.jpg',
      name: 'Jay Ayop',
      role: 'Documentation Specialist',
      fb: 'https://www.facebook.com/jay.ayop.56',
    },
    {
      img: '/img/5.jpg',
      name: 'Manilyn  Matanggo',
      role: 'Documentation Specialist',
      fb: 'https://www.facebook.com/manilyn.bayoga.matanggo',
    },
  ];

  // Auto-slide effect for mobile
  // Remove auto-slide logic for mobile
  // Remove startAutoSlide and any setInterval/clearInterval for mobile

  useEffect(() => {
    if (!isMobile) return;
    // The auto-slide logic is now handled by drag gestures on mobile
  }, [isMobile, devs.length]);

  const handlePrev = () => {
    setDirection(-1);
    setCurrentDevIndex((prev) => (prev - 1 + devs.length) % devs.length);
    // The auto-slide logic is now handled by drag gestures on mobile
  };
  const handleNext = () => {
    setDirection(1);
    setCurrentDevIndex((prev) => (prev + 1) % devs.length);
    // The auto-slide logic is now handled by drag gestures on mobile
  };

  // Remove touch state and handlers

  return (
    <div className={`min-h-screen flex flex-col font-sans relative ${showDevStatus ? 'pt-12' : ''}`}>
      {/* Development Status Popup */}
      <AnimatePresence>
        {showDevStatus && (
          <motion.div
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 200,
              damping: 20,
              mass: 1
            }}
            className="fixed top-0 left-0 right-0 z-50"
          >
            <div className="bg-[#2C3E50] text-white py-3 px-4 shadow-lg border-b border-white/10">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping absolute" />
                    <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full relative" />
                  </div>
                  <span className="font-medium text-sm sm:text-base">This system is currently under development. Some features may be incomplete or unavailable.</span>
                </div>
                <button
                  onClick={() => setShowDevStatus(false)}
                  className="hover:bg-white/10 p-1.5 rounded-full transition-colors duration-200 flex-shrink-0"
                  aria-label="Close notification"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" 
                    />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background with overlay - optimized for performance */}
      <div className="fixed inset-0 w-full h-full">
        <video 
          className="absolute inset-0 w-full h-full object-cover scale-[1.02] sm:scale-100 transform-gpu filter blur-[2px]"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            filter: 'blur(2px)',
            willChange: 'transform'
          }}
        >
          <source src="/img/bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#031730] opacity-80"></div>
        <div className="absolute inset-0 bg-black opacity-30"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Logo Header */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center w-full max-w-lg">
            <motion.div
              className="relative perspective-1000"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                perspective: '1000px',
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Main floating shadow */}
              <motion.div
                className="absolute inset-0 bg-black/30 blur-2xl rounded-full"
                style={{
                  rotateX: springRotateX,
                  rotateY: springRotateY,
                  transformStyle: 'preserve-3d',
                  zIndex: 1,
                  filter: 'blur(20px)',
                  transform: 'translateY(20px) scale(0.8)'
                }}
                animate={{
                  scale: [0.8, 0.9, 0.8],
                  opacity: [0.2, 0.3, 0.2],
                  y: [20, 25, 20]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Secondary subtle shadow for depth */}
              <motion.div
                className="absolute inset-0 bg-black/20 blur-xl rounded-full"
                style={{
                  rotateX: springRotateX,
                  rotateY: springRotateY,
                  transformStyle: 'preserve-3d',
                  zIndex: 1,
                  filter: 'blur(15px)',
                  transform: 'translateY(15px) scale(0.85)'
                }}
                animate={{
                  scale: [0.85, 0.95, 0.85],
                  opacity: [0.15, 0.25, 0.15],
                  y: [15, 20, 15]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.2
                }}
              />

              <motion.img
                src="/img/logo3.png"
                alt="SMCBI Logo"
                className="w-32 h-auto mb-6 relative z-10 drop-shadow-2xl"
                style={{
                  rotateX: springRotateX,
                  rotateY: springRotateY,
                  transformStyle: 'preserve-3d',
                  filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.3))',
                  willChange: 'transform'
                }}
                whileHover={{ 
                  scale: 1.05,
                  filter: 'drop-shadow(0 15px 20px rgba(0, 0, 0, 0.4))'
                }}
                animate={{
                  y: [0, -8, 0],
                  rotateZ: [0, 1, -1, 0],
                  filter: [
                    'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.3))',
                    'drop-shadow(0 15px 20px rgba(0, 0, 0, 0.4))',
                    'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.3))'
                  ]
                }}
                transition={{
                  y: {
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  },
                  rotateZ: {
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  },
                  filter: {
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                }}
              />

              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 bg-white/10 blur-3xl rounded-full"
                style={{
                  rotateX: springRotateX,
                  rotateY: springRotateY,
                  transformStyle: 'preserve-3d',
                  zIndex: 0,
                  filter: 'blur(30px)',
                  transform: 'translateY(-5px) scale(0.9)'
                }}
                animate={{
                  scale: [0.9, 1, 0.9],
                  opacity: [0.1, 0.2, 0.1],
                  y: [-5, 0, -5]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.1
                }}
              />
            </motion.div>
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-wide text-center mb-10">
             
              <span className="text-base md:text-xl font-normal tracking-normal">SMCBI School Portal & Enrollment System</span>
            </h1>
            
            {/* Login Button */}
            <div className="w-full max-w-xs flex flex-col items-center">
              <motion.button
                className="group relative w-full py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#2C3E50] via-[#34495E] to-[#2C3E50] text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 mb-8 overflow-hidden"
                onClick={() => setShowLogin(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                {/* Button content */}
                <div className="relative flex items-center justify-center gap-2">
                  <span>Log in</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 7l5 5m0 0l-5 5m5-5H6" 
                    />
                  </svg>
                </div>

                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#2C3E50]/30 via-[#34495E]/30 to-[#2C3E50]/30 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
              </motion.button>


              
              {/* Forgot Links */}
              <div className="flex justify-between w-full mt-2 text-white/90 text-sm">
                <a href="#" className="hover:text-white hover:underline transition-colors duration-200"></a>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setShowForgotModal(true); }}
                  className="hover:text-white hover:underline flex items-center gap-1.5 group"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="w-4 h-4 transition-transform duration-300 group-hover:scale-110"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Forgot Password?
                </a>
              </div>
            </div>
          </div>
        </div>
        

        
        {/* Footer */}
        <footer className="w-full py-4 px-4 flex flex-col items-center text-xs text-white">
          <div className="text-center">© {new Date().getFullYear()} St. Mary's College of Bansalan, Inc. </div>
        </footer>
      </div>

      {/* Login Modal Overlay */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md p-6 relative animate-fade-in">
            <Login onClose={() => setShowLogin(false)} />
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md p-6 relative animate-fade-in">
            <div className="bg-white/95 rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#2C3E50]">
                  {verificationStep === 'email' ? 'Reset your password' : 'Enter verification code'}
                </h3>
                <button
                  onClick={() => {
                    setShowForgotModal(false);
                    setVerificationStep('email');
                    setForgotEmail('');
                    setVerificationCode('');
                  }}
                  className="text-gray-400 hover:text-red-500 text-xl font-bold"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {verificationStep === 'email' ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">Enter your username and we will send you a verification code.</p>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white pr-32"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                  @smcbi.edu.ph
                </div>
              </div>
              <button
                onClick={async () => {
                  const username = forgotEmail.trim();
                  if (!username) { toast.error('Please enter your email'); return; }
                  if (recoveryCooldown > 0) return;
                  
                  const email = `${username}@smcbi.edu.ph`;
                  setSendingRecovery(true);
                  try {
                    const redirectTo = `${window.location.origin}/reset-password`;
                    
                    // Use custom mailer API instead of Supabase
                    const response = await fetch('/api/send-password-reset-email', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        email,
                        redirectTo
                      }),
                    });

                    const result = await response.json();
                    
                    if (!response.ok) {
                      if (response.status === 429) {
                        toast.error('Too many requests. Try again later.');
                        setRecoveryCooldown(60);
                      } else {
                        toast.error(result.error || 'Failed to send reset email');
                      }
                    } else {
                      toast.success('Verification code sent! Check your inbox.');
                      setVerificationStep('code');
                    }
                  } catch (error) {
                    console.error('Password reset error:', error);
                    toast.error('Failed to send reset email. Please try again.');
                  } finally {
                    setSendingRecovery(false);
                  }
                }}
                disabled={sendingRecovery || recoveryCooldown > 0 || !forgotEmail.trim()}
                className="mt-4 w-full py-2.5 rounded-lg bg-[#2C3E50] text-white font-semibold hover:bg-[#1a2634] transition-all duration-200 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {recoveryCooldown > 0 ? `Wait ${recoveryCooldown}s` : (sendingRecovery ? 'Sending…' : 'Send verification code')}
              </button>
              <div className="mt-3 text-xs text-gray-500">We'll send a verification code to your email. If you don't see it, check Spam.</div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">Enter the 6-digit verification code sent to your email.</p>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-center text-lg tracking-widest"
                  />
                  <button
                    onClick={async () => {
                      const code = verificationCode.trim();
                      if (!code || code.length !== 6) { 
                        toast.error('Please enter the 6-digit verification code'); 
                        return; 
                      }
                      
                      setVerifyingCode(true);
                      try {
                        // Verify the code against the server
                        const response = await fetch('/api/verify-reset-code', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            email: `${forgotEmail.trim()}@smcbi.edu.ph`,
                            code
                          }),
                        });

                        const result = await response.json();
                        
                        if (!response.ok) {
                          toast.error(result.error || 'Invalid verification code');
                        } else {
                          toast.success('Code verified! Redirecting to password reset...');
                          setTimeout(() => {
                            window.location.href = '/reset-password';
                          }, 1500);
                        }
                      } catch (error) {
                        console.error('Code verification error:', error);
                        toast.error('Failed to verify code. Please try again.');
                      } finally {
                        setVerifyingCode(false);
                      }
                    }}
                    disabled={verifyingCode || !verificationCode.trim() || verificationCode.length !== 6}
                    className="mt-4 w-full py-2.5 rounded-lg bg-[#2C3E50] text-white font-semibold hover:bg-[#1a2634] transition-all duration-200 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {verifyingCode ? 'Verifying...' : 'Verify Code'}
                  </button>
                  <div className="mt-3 text-xs text-gray-500">
                    Didn't receive the code? 
                    <button 
                      onClick={() => setVerificationStep('email')}
                      className="text-blue-600 hover:underline ml-1"
                    >
                      Resend
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

  
      {/* Feedback Tab and Panel */}
      <div>
        {/* Overlay */}
        {showFeedback && (
          <div 
            className="fixed inset-0 bg-black/30 z-30 transition-opacity duration-300"
            onClick={() => setShowFeedback(false)}
            aria-hidden="true"
          />
        )}

        {/* Feedback Tab */}
        <button
          onClick={() => setShowFeedback(true)}
          disabled={showLogin}
          className={`fixed z-40 bg-gradient-to-b from-green-400 to-green-500 text-white px-4 py-2 shadow-lg font-semibold text-sm transition-all duration-300 flex items-center gap-2 rounded-full hover:scale-105
            ${showLogin ? 'opacity-50 cursor-not-allowed' : ''}
            sm:top-[40%] top-[15%] md:top-[40%] lg:top-[40%]
          `}
          style={{
            right: showFeedback ? 'min(415px, calc(100% - 20px))' : '20px',
            transform: 'translateY(-50%) rotate(-90deg)',
            transformOrigin: 'right center',
            width: 'fit-content',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px 0 rgba(34,197,94,0.15)',
            borderTopLeftRadius: '15px',
            borderBottomLeftRadius: '1px',
            borderTopRightRadius: '15px',
            borderBottomRightRadius: '5px',
          }}
          aria-label="Give Feedback"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={`transform rotate-90 transition-transform duration-300 ${showFeedback ? 'rotate-0' : ''}`}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Give Feedback
        </button>

        {/* Feedback Panel */}
        <div 
          className={`fixed right-0 h-full z-40 transition-all duration-300 ease-in-out ${
            showFeedback ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`} 
          style={{
            width: 'min(400px, 92vw)',
            height: '80vh',
            top: '80px',
            borderRadius: '1.5rem 0 1.5rem 1.5rem',
            borderTopLeftRadius: '1.5rem',
            borderBottomLeftRadius: '1.5rem',
            borderTopRightRadius: '0',
            borderBottomRightRadius: '0',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
            border: '1px solid #e5e7eb',
            pointerEvents: showFeedback ? 'auto' : 'none'
          }}
        >
          <div className="bg-transparent h-full shadow-none flex flex-col relative rounded-l-xl border-l-0">
            {/* Close Button */}
            <button
              className="absolute w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90
                top-2 right-2 sm:top-3 sm:right-3"
              onClick={() => setShowFeedback(false)}
              aria-label="Close Feedback"
              style={{
                backgroundColor: '#ef4444',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                zIndex: 50
              }}
            >
              ×
            </button>
            {/* Branding */}
            <div className="flex flex-col items-center justify-center gap-1 px-8 pt-4 pb-4 border-b border-gray-200">
              <img src="/img/logo1.png" alt="SMCBI Logo" className="w-10 h-10" />
              <span className="font-medium text-sm text-[#2C3E50]">Feedback Form</span>
            </div>
            {/* Feedback Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="mb-8">
                <label className="block font-semibold mb-2 text-[#2C3E50]">What was your first impression when you logged into the SMCBI School Portal & Enrollment System?</label>
                <textarea className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-300 shadow-sm transition" rows={3} placeholder="Your answer..." />
              </div>
              <div className="mb-8">
                <label className="block font-semibold mb-2 text-[#002656]">What do you like the most about our new SMCBI School Portal & Enrollment System?</label>
                <textarea className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-300 shadow-sm transition" rows={3} placeholder="Your answer..." />
              </div>
              <button className="w-full py-2 rounded-lg bg-[#2C3E50] text-white font-semibold hover:bg-[#1a2634] transition-all duration-200 shadow-md hover:scale-105">Submit Feedback</button>
            </div>
          </div>
        </div>
      </div>


      {/* Optimized Animations */}
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.4s ease;
          will-change: opacity, transform;
        }
        .animate-pop-in {
          animation: popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          will-change: opacity, transform;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { 
            opacity: 0;
            transform: scale(0.5) rotate(-180deg);
          }
          70% { 
            transform: scale(1.1) rotate(0deg);
          }
          100% { 
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .translate-x-full {
          transform: translateX(100%);
        }
        .translate-x-0 {
          transform: translateX(0);
        }
        .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 300ms;
        }
        @keyframes slideLeft {
          from { transform: translateX(0) rotate(-90deg); }
          to { transform: translateX(-400px) rotate(-90deg); }
        }
        .translate-x-[-400px] {
          animation: slideLeft 0.3s ease forwards;
          will-change: transform;
        }
        .card-glow {
          transition: box-shadow 0.3s, transform 0.3s;
          will-change: box-shadow, transform;
        }
        .card-glow:hover {
          box-shadow: 0 8px 32px 0 rgba(59,130,246,0.25), 0 0 16px 2px #60a5fa33;
        }
        
        /* Performance optimizations for low-end devices */
        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in,
          .animate-pop-in,
          .animate-slide-in-right {
            animation: none;
          }
          .transition-all {
            transition: none;
          }
        }
        
        /* Optimize for mobile devices */
        @media (max-width: 640px) {
          .animate-fade-in {
            animation-duration: 0.3s;
          }
          .animate-pop-in {
            animation-duration: 0.4s;
          }
        }
      `}</style>



      {/* Floating Developer Button - Optimized */}
      {!showFeedback && (
        <button
          onClick={() => setShowDevModal(true)}
          className="fixed z-50 bottom-6 right-6 bg-gradient-to-br from-[#2C3E50] to-[#34495E] text-white p-3 sm:p-4 rounded-full shadow-lg hover:scale-110 transition-all duration-300 flex items-center justify-center group"
          aria-label="Show Developer Info"
          style={{ 
            boxShadow: '0 4px 16px 0 rgba(44, 62, 80, 0.25)',
            willChange: 'transform'
          }}
        >
          {/* Code/Developer Icon */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth="2" 
            className="w-6 h-6 sm:w-7 sm:h-7 group-hover:rotate-12 transition-transform duration-300"
            style={{ willChange: 'transform' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      )}

      {/* Developer Modal */}
      <AnimatePresence>
        {showDevModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <motion.div
              className={`dev-modal-sheet w-full max-w-6xl ${isMobile ? 'max-h-[70vh] p-1' : 'p-2'} relative bg-white rounded-3xl shadow-2xl border border-gray-200`}
              initial={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, y: 20 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, y: 0 }}
              exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, y: 20 }}
              transition={{ 
                type: 'tween', 
                duration: isMobile ? 0.2 : 0.25, 
                ease: "easeOut"
              }}
              style={{
                maxHeight: isMobile ? '70vh' : '99vh',
                overflow: isMobile ? 'hidden' : 'visible',
                overflowY: isMobile ? undefined : 'auto',
                padding: isMobile ? '0.25rem' : '2rem',
                borderRadius: isMobile ? '1.5rem 1.5rem 0 0' : '1.5rem',
                boxShadow: isMobile ? undefined : '0 8px 40px 0 rgba(31, 38, 135, 0.18)',
                border: '1px solid #e5e7eb',
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)'
              }}
            >
              {/* Modal Header with right-aligned close button */}
              <div className="flex justify-end items-start w-full mb-2">
                <button
                  className="dev-modal-close w-7 h-7 flex items-center justify-center text-lg font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90"
                  onClick={() => setShowDevModal(false)}
                  aria-label="Close Developer Info"
                  style={{ 
                    backgroundColor: '#ef4444', 
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)', 
                    zIndex: 50,
                    marginTop: '0.10rem'
                  }}
                >
                  ×
                </button>
              </div>
              <div className={`flex flex-col items-center gap-2 mb-2 ${isMobile ? 'pt-0' : 'pt-0'}`}>
                <img src="/img/logo1.png" alt="SMCBI Logo" className="w-20 h-20 mb-1" />
                <h2 className="text-xl font-bold text-[#2C3E50] mb-1">System Developers</h2>
                <div className="text-xs text-gray-500">© {new Date().getFullYear()} SMCBI School Portal</div>
              </div>
              {/* Developer Cards Grid */}
              <div
                className={`dev-modal-scroll ${isMobile ? 'flex flex-col items-center w-full' : 'flex flex-wrap justify-center'} gap-4 px-2 scrollbar-hide mb-2`}
                style={{ 
                  scrollbarWidth: 'none', 
                  msOverflowStyle: 'none',
                  willChange: 'transform',
                  backfaceVisibility: 'hidden'
                }}
              >
                {isMobile ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="relative h-64 w-full flex items-center justify-center">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={devs[currentDevIndex].name}
                          className="absolute left-0 right-0 mx-auto flex flex-col items-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 shadow-lg transition-all duration-300 w-64"
                          initial={{ x: direction === 1 ? '100vw' : '-100vw', opacity: 0.7 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: direction === 1 ? '-100vw' : '100vw', opacity: 0.7 }}
                          transition={{ 
                            type: 'tween', 
                            duration: 0.25, 
                            ease: "easeOut"
                          }}
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={0.6}
                          dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                          style={{
                            willChange: 'transform',
                            backfaceVisibility: 'hidden',
                            transform: 'translateZ(0)'
                          }}
                          onDragEnd={(e, info) => {
                            if (info.offset.x < -80) {
                              setDirection(1);
                              handleNext();
                            } else if (info.offset.x > 80) {
                              setDirection(-1);
                              handlePrev();
                            }
                          }}
                        >
                          <div className="relative mb-3">
                            <img
                              src={devs[currentDevIndex].img}
                              alt={devs[currentDevIndex].name}
                              className="w-32 h-32 rounded-full object-cover border-2 border-blue-400 shadow-lg"
                            />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                          </div>
                          <div className="font-semibold text-[#2C3E50] text-center text-sm mb-1">{devs[currentDevIndex].name}</div>
                          <div className="text-xs text-gray-500 mb-3 text-center leading-tight">{devs[currentDevIndex].role}</div>
                          <div className="flex gap-2">
                            {/* Facebook */}
                            <a
                              href={devs[currentDevIndex].fb}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Facebook"
                              className="p-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110"
                            >
                              <svg width="18" height="18" fill="currentColor" className="text-blue-600 rounded-md" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0"/></svg>
                            </a>
                            {/* GitHub */}
                            {devs[currentDevIndex].gh && (
                              <a
                                href={devs[currentDevIndex].gh}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="GitHub"
                                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
                              >
                                <svg width="18" height="18" fill="currentColor" className="text-gray-700" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.553 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.624-5.475 5.921.43.372.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                              </a>
                            )}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                    <div className="flex justify-center items-center gap-10 mt-8">
                      <button
                        onClick={() => { setDirection(-1); handlePrev(); }}
                        aria-label="Previous"
                        className="text-3xl px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 shadow-md transition-transform duration-200 active:scale-95"
                        style={{
                          willChange: 'transform',
                          backfaceVisibility: 'hidden'
                        }}
                      >
                        &#8592;
                      </button>
                      <button
                        onClick={() => { setDirection(1); handleNext(); }}
                        aria-label="Next"
                        className="text-3xl px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300 shadow-md transition-transform duration-200 active:scale-95"
                        style={{
                          willChange: 'transform',
                          backfaceVisibility: 'hidden'
                        }}
                      >
                        &#8594;
                      </button>
                    </div>
                  </div>
                ) : (
                  devs.map((dev, i) => (
                    <motion.div
                      key={dev.name}
                      className="flex flex-col items-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 w-48"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        delay: 0.05 + i * 0.08, 
                        duration: 0.3, 
                        ease: "easeOut",
                        type: 'tween'
                      }}
                      style={{
                        willChange: 'transform, opacity',
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(0)'
                      }}
                    >
                      <div className="relative mb-3">
                        <img
                          src={dev.img}
                          alt={dev.name}
                          className="w-24 h-24 rounded-full object-cover border-2 border-blue-400 shadow-lg"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="font-semibold text-[#2C3E50] text-center text-sm mb-1">{dev.name}</div>
                      <div className="text-xs text-gray-500 mb-3 text-center leading-tight">{dev.role}</div>
                      <div className="flex gap-2">
                        {/* Facebook */}
                        <a
                          href={dev.fb}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Facebook"
                          className="p-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110"
                        >
                          <svg width="18" height="18" fill="currentColor" className="text-blue-600 rounded-md" viewBox="0 0 24 24"><path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0"/></svg>
                        </a>
                        {/* GitHub */}
                        {dev.gh && (
                          <a
                            href={dev.gh}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub"
                            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
                          >
                            <svg width="18" height="18" fill="currentColor" className="text-gray-700" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.553 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.624-5.475 5.921.43.372.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              <style>{`
                .dev-modal-sheet {
                  max-height: 90vh;
                  overflow: hidden;
                  box-shadow: 0 8px 40px 0 rgba(31, 38, 135, 0.18);
                  border: 1px solid #e5e7eb;
                  transform: translateZ(0);
                  will-change: transform;
                }
                .dev-modal-scroll {
                  overflow-x: auto;
                  scrollbar-width: none;
                  -ms-overflow-style: none;
                  scrollbar-color: transparent transparent;
                  transform: translateZ(0);
                  will-change: transform;
                }
                .dev-modal-scroll::-webkit-scrollbar {
                  display: none;
                }
                @media (max-width: 640px) {
                  .dev-modal-sheet {
                    border-radius: 1.5rem 1.5rem 0 0 !important;
                    max-width: 100vw !important;
                    width: 100vw !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    top: auto !important;
                    position: fixed !important;
                    padding: 1rem !important;
                    min-height: 60vh !important;
                    max-height: 95vh !important;
                    animation: slideUpSheet 0.25s ease-out;
                    transform: translateZ(0);
                    will-change: transform;
                    -webkit-overflow-scrolling: touch;
                  }
                  .dev-modal-close {
                    position: sticky !important;
                    top: 0.5rem !important;
                    right: 0.5rem !important;
                    z-index: 100 !important;
                    transform: translateZ(0);
                    will-change: transform;
                  }
                  .dev-modal-scroll {
                    max-height: 60vh !important;
                    padding-bottom: 1.5rem !important;
                    transform: translateZ(0);
                    will-change: transform;
                    -webkit-overflow-scrolling: touch;
                  }
                  .dev-modal-scroll * {
                    transform: translateZ(0);
                    backface-visibility: hidden;
                  }
                }
                @keyframes slideUpSheet {
                  from { 
                    transform: translateY(100%) translateZ(0); 
                    opacity: 0; 
                  }
                  to { 
                    transform: translateY(0) translateZ(0); 
                    opacity: 1; 
                  }
                }
                @media (max-width: 640px) {
                  .dev-modal-sheet {
                    -webkit-transform: translateZ(0);
                    -webkit-backface-visibility: hidden;
                    -webkit-perspective: 1000px;
                  }
                  .dev-modal-scroll {
                    -webkit-transform: translateZ(0);
                    -webkit-backface-visibility: hidden;
                  }
                }
              `}</style>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcement Modal */}
      <AnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        announcements={announcements}
      />
    </div>
  );
};

export default LandingPage;
