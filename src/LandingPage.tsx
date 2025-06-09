import { useState } from 'react';
import Login from './Login';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

const LandingPage = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Add motion values for 3D effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Transform mouse movement to rotation
  const rotateX = useTransform(y, [-100, 100], [30, -30]);
  const rotateY = useTransform(x, [-100, 100], [-30, 30]);

  // Add spring physics for smooth movement
  const springConfig = { damping: 15, stiffness: 150 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  // Handle mouse movement
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
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

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Background with overlay */}
      <div className="fixed inset-0 w-full h-full">
        <video 
          className="absolute inset-0 w-full h-full object-cover scale-[1.02] sm:scale-100 transform-gpu filter blur-[2px]"
          autoPlay
          muted
          loop
          playsInline
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            filter: 'blur(2px)'
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
                src="/img/logo1.png"
                alt="SMCBI Logo"
                className="w-32 h-auto mb-6 relative z-10 drop-shadow-2xl"
                style={{
                  rotateX: springRotateX,
                  rotateY: springRotateY,
                  transformStyle: 'preserve-3d',
                  filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.3))'
                }}
                whileHover={{ 
                  scale: 1.05,
                  filter: 'drop-shadow(0 15px 20px rgba(0, 0, 0, 0.4))'
                }}
                animate={{
                  y: [0, -10, 0],
                  rotateZ: [0, 2, -2, 0],
                  filter: [
                    'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.3))',
                    'drop-shadow(0 15px 20px rgba(0, 0, 0, 0.4))',
                    'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.3))'
                  ]
                }}
                transition={{
                  y: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  },
                  rotateZ: {
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  },
                  filter: {
                    duration: 4,
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
                <a href="#" className="hover:text-white hover:underline flex items-center gap-1.5 group">
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
            <button
              className="absolute w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90
                top-2 right-2 sm:top-3 sm:right-3"
              onClick={() => setShowLogin(false)}
              aria-label="Close Login"
              style={{
                backgroundColor: '#ef4444',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                zIndex: 50
              }}
            >
              ×
            </button>
            <Login />
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
              <span className="font-medium text-sm text-[#002656]">Feedback Form</span>
            </div>
            {/* Feedback Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="mb-8">
                <label className="block font-semibold mb-2 text-[#002656]">What was your first impression when you logged into the SMCBI School Portal & Enrollment System?</label>
                <textarea className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-300 shadow-sm transition" rows={3} placeholder="Your answer..." />
              </div>
              <div className="mb-8">
                <label className="block font-semibold mb-2 text-[#002656]">What do you like the most about our new SMCBI School Portal & Enrollment System?</label>
                <textarea className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-300 shadow-sm transition" rows={3} placeholder="Your answer..." />
              </div>
              <button className="w-full py-2 rounded-lg bg-[#002656] text-white font-semibold hover:bg-[#001a3e] transition-all duration-200 shadow-md hover:scale-105">Submit Feedback</button>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.4s ease;
        }
        .animate-pop-in {
          animation: popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
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
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
