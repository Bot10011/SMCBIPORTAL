import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Calendar, User, FileText, Clock, CheckCircle } from 'lucide-react';


// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  image?: string;
  icon?: string;
}

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcements?: Announcement[];
}



// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getPriorityColor = (priority: string): string => {
  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  
  return priorityColors[priority as keyof typeof priorityColors] || priorityColors.default;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ 
  isOpen, 
  onClose, 
  announcements = [] 
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const displayAnnouncements = announcements;
  const currentAnnouncement = displayAnnouncements[currentAnnouncementIndex];

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleNext = (): void => {
    setCurrentAnnouncementIndex((prev) => 
      prev === displayAnnouncements.length - 1 ? 0 : prev + 1
    );
  };

  const handlePrev = (): void => {
    setCurrentAnnouncementIndex((prev) => 
      prev === 0 ? displayAnnouncements.length - 1 : prev - 1
    );
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const target = e.target as HTMLImageElement;
    console.error('Image failed to load:', target.src);
    target.style.display = 'none';
    target.nextElementSibling?.classList.remove('hidden');
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    if (isOpen) {
      setCurrentAnnouncementIndex(0);
    }
  }, [isOpen]);

  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Don't render if no announcements
  if (displayAnnouncements.length === 0) {
    return null;
  }

  // Safety check for current announcement
  if (!currentAnnouncement) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden border border-gray-100"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#2C3E50] to-[#34495E] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">SMCBI Announcements</h2>
                  <p className="text-sm text-white/80">
                    {currentAnnouncementIndex + 1} of {displayAnnouncements.length} • Important Updates
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
                aria-label="Close announcements"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* ============================================================================
                CONTENT SECTION
                ============================================================================ */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <motion.div
                key={currentAnnouncement.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Banner Image */}
                {currentAnnouncement.image && (
                  <div className="relative h-48 rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
                    <img 
                      src={currentAnnouncement.image} 
                      alt={currentAnnouncement.title}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                      onLoad={() => console.log('Image loaded successfully:', currentAnnouncement.image)}
                      crossOrigin="anonymous"
                    />
                    <div className={`absolute inset-0 flex items-center justify-center ${currentAnnouncement.image ? 'hidden' : ''}`}>
                      <Bell className="w-12 h-12 text-blue-600" />
                    </div>
                    {/* Overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                )}
                
                {/* Fallback when no image */}
                {!currentAnnouncement.image && (
                  <div className="relative h-48 rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                    <Bell className="w-12 h-12 text-blue-600" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                )}

                {/* Title and Badges */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(currentAnnouncement.priority)}`}>
                    {currentAnnouncement.priority.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {currentAnnouncement.category}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 leading-tight mb-3">
                  {currentAnnouncement.title}
                </h3>

                {/* Meta Info with Icons */}
                <div className="flex items-center gap-6 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{currentAnnouncement.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <span>{formatDate(currentAnnouncement.date)}</span>
                  </div>
                </div>

                {/* Content with Modern Typography */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-gray-700 leading-relaxed text-base">
                    {currentAnnouncement.content}
                  </p>
                </div>

                {/* Interactive Elements */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Read time: 2 min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors duration-200 text-blue-600">
                      <FileText className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-green-50 rounded-lg transition-colors duration-200 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Footer with Navigation */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <button
                onClick={handlePrev}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white rounded-lg transition-colors duration-200 border border-gray-300 shadow-sm"
                disabled={displayAnnouncements.length <= 1}
              >
                ← Previous
              </button>

              {/* Dots Indicator */}
              <div className="flex gap-2">
                {displayAnnouncements.map((_: Announcement, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentAnnouncementIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                      index === currentAnnouncementIndex 
                        ? 'bg-[#2C3E50]' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to announcement ${index + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white rounded-lg transition-colors duration-200 border border-gray-300 shadow-sm"
                disabled={displayAnnouncements.length <= 1}
              >
                Next →
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementModal; 