import { useState } from 'react';
import Login from './Login';

const LandingPage = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Background with overlay */}
      <div className="fixed inset-0 w-full h-full">
        <div className="absolute inset-0 bg-[url('/img/bg.jpg')] bg-cover bg-center bg-no-repeat"></div>
        <div className="absolute inset-0 bg-[#031730] opacity-70"></div>
        <div className="absolute inset-0 bg-black opacity-20"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Logo Header */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center w-full max-w-lg">
            <img src="/img/logo1.png" alt="SMCBI Logo" className="w-32 h-auto mb-6" />
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-wide text-center mb-10">
             
              <span className="text-xl font-normal tracking-normal">SMCBI School Portal & Enrollment System</span>
            </h1>
            
            {/* Login Button */}
            <div className="w-full max-w-xs flex flex-col items-center">
              <button
                className="w-full py-3 px-8 rounded-lg bg-white text-[#002656] text-lg font-semibold shadow-md hover:bg-gray-100 transition mb-8"
                onClick={() => setShowLogin(true)}
              >
                Log in
              </button>
              
              {/* Forgot Links */}
              <div className="flex justify-between w-full mt-2 text-white text-sm">
                <a href="#" className="hover:underline"></a>
                <a href="#" className="hover:underline">Forgot Password?</a>
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
              className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90"
              onClick={() => setShowLogin(false)}
              aria-label="Close Login"
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
          `}
          style={{
            top: '35%',
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
            width: 'min(400px, 90vw)',
            height: '80vh',
            top: '40px',
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
              className="absolute top-4 right-4 text-2xl text-gray-500 hover:text-gray-700 focus:outline-none transition-transform duration-300 hover:scale-110"
              onClick={() => setShowFeedback(false)}
              aria-label="Close Feedback"
            >
              ×
            </button>
            {/* Branding */}
            <div className="flex items-center gap-2 px-8 pt-4 pb-4 border-b border-gray-200">
              <img src="/img/logo1.png" alt="SMCBI Logo" className="w-10 h-10" />
              <span className="font-bold text-lg text-[#002656]">SMCBI Student Portal</span>
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
