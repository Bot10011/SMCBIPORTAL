import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Calendar,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import CreateAnnouncementModal from '../components/CreateAnnouncementModal';

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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}



// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', color: 'text-red-400 bg-red-900/30 border-red-700/50' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/50' },
  { value: 'low', label: 'Low', color: 'text-green-400 bg-green-900/30 border-green-700/50' }
];



// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Announcement: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  // Memoized filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(announcement => {
      const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           announcement.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           announcement.author.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [announcements, searchTerm]);

  // Memoized announcement statistics
  const announcementStats = useMemo(() => {
    const total = announcements.length;
    const active = announcements.filter(a => a.is_active).length;
    const inactive = total - active;
    const highPriority = announcements.filter(a => a.priority === 'high').length;
    const mediumPriority = announcements.filter(a => a.priority === 'medium').length;
    const lowPriority = announcements.filter(a => a.priority === 'low').length;
    
    return {
      total,
      active,
      inactive,
      highPriority,
      mediumPriority,
      lowPriority
    };
  }, [announcements]);

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================
  
  // Memoized database operations
  const fetchAnnouncements = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAnnouncement = useCallback(async (id: string): Promise<void> => {
    try {
      // First get the announcement to check if it has an image
      const { data: announcement, error: fetchError } = await supabase
        .from('announcements')
        .select('image')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Delete the announcement
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // If the announcement had a storage image (not base64), delete it from storage
      if (announcement?.image && !announcement.image.startsWith('data:')) {
        try {
          // Extract the file path from the URL
          const url = new URL(announcement.image);
          const pathParts = url.pathname.split('/');
          const filePath = pathParts.slice(-2).join('/'); // Get the last two parts (folder/filename)
          
          console.log('Deleting image from storage:', filePath);
          
          const { error: storageError } = await supabase.storage
            .from('announcement')
            .remove([filePath]);

          if (storageError) {
            console.error('Error deleting image from storage:', storageError);
            // Don't throw error here as the announcement was already deleted
          } else {
            console.log('Image deleted from storage successfully');
          }
        } catch (storageError) {
          console.error('Error deleting image from storage:', storageError);
          // Don't throw error here as the announcement was already deleted
        }
      }
      
      toast.success('Announcement deleted successfully');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  }, [fetchAnnouncements]);

  const toggleAnnouncementStatus = useCallback(async (id: string, currentStatus: boolean): Promise<void> => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Announcement ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement status:', error);
      toast.error('Failed to update announcement status');
    }
  }, [fetchAnnouncements]);





  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleEdit = (announcement: Announcement): void => {
    setEditingAnnouncement(announcement);
    setShowModal(true);
  };

  const handleDelete = (id: string): void => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      deleteAnnouncement(id);
    }
  };

  const handleModalClose = (): void => {
    setShowModal(false);
    setEditingAnnouncement(null);
  };

  const handleModalSuccess = (): void => {
    fetchAnnouncements();
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const getPriorityColor = (priority: string): string => {
    const priorityOption = PRIORITY_OPTIONS.find(option => option.value === priority);
    return priorityOption?.color || 'text-gray-400 bg-gray-800/30 border-gray-600/50';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="p-6 min-h-screen bg-gradient-to-br ">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-lg shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-megaphone w-6 h-6 text-white">
                  <path d="m3 11 19-5-19-5v10Z"></path>
                  <path d="M21.12 11.22A6 6 0 0 1 22 17v5h-2v-5a4 4 0 0 0-.88-2.78"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Announcement Management</h1>
                <p className="text-white/80 text-sm font-medium">Manage and create announcements for the school portal</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/80"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 p-4">
          <div className="text-sm text-gray-300 mb-1">Total</div>
          <div className="text-2xl font-bold text-white">{announcementStats.total}</div>
        </div>
        <div className="bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 p-4">
          <div className="text-sm text-gray-300 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-400">{announcementStats.active}</div>
        </div>
        <div className="bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 p-4">
          <div className="text-sm text-gray-300 mb-1">High Priority</div>
          <div className="text-2xl font-bold text-red-400">{announcementStats.highPriority}</div>
        </div>
        <div className="bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 p-4">
          <div className="text-sm text-gray-300 mb-1">Inactive</div>
          <div className="text-2xl font-bold text-gray-400">{announcementStats.inactive}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="announcement-controls bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 p-6 mb-6">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]"
              />
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowModal(true)}
            className="announcement-create-button bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)]"
          >
            <Plus className="w-4 h-4" />
            Create Announcement
          </button>
        </div>
      </div>

      {/* Announcements Grid */}
      {loading ? (
        <div className="announcement-skeleton">
          {/* Header Skeleton */}
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-80 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-96"></div>
          </div>

          {/* Controls Skeleton */}
          <div className="bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 p-6 mb-6 animate-pulse">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="h-10 bg-gray-700 rounded-lg flex-1 max-w-md"></div>
                <div className="h-10 bg-gray-700 rounded-lg w-32"></div>
                <div className="h-10 bg-gray-700 rounded-lg w-32"></div>
              </div>
              <div className="h-10 w-48 bg-gray-700 rounded-lg"></div>
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 p-4 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-700 rounded w-12"></div>
              </div>
            ))}
          </div>

          {/* Announcements Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-700"></div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 bg-gray-700 rounded-full w-16"></div>
                        <div className="h-6 bg-gray-700 rounded-full w-20"></div>
                      </div>
                      <div className="h-5 bg-gray-700 rounded w-full mb-2"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-4 bg-gray-700 rounded w-24"></div>
                    <div className="h-4 bg-gray-700 rounded w-20"></div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-3 bg-gray-700 rounded w-full"></div>
                    <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-700 rounded"></div>
                      <div className="w-8 h-8 bg-gray-700 rounded"></div>
                      <div className="w-8 h-8 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="announcement-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnnouncements.map((announcement) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="announcement-card bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 overflow-hidden transition-all duration-200"
            >
              {/* Banner Image */}
              {announcement.image && (
                <div className="h-48 bg-gradient-to-br from-gray-800 to-gray-900">
                  <img
                    src={announcement.image}
                    alt={announcement.title}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      console.error('Image failed to load:', announcement.image);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      // Show a fallback icon or message
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="flex items-center justify-center h-full bg-gray-800">
                            <svg class="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                          </div>
                        `;
                      }
                    }}
                    onLoad={() => console.log('Image loaded successfully:', announcement.image)}
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 bg-gray-700/50 text-gray-200 rounded-full text-xs font-medium border border-gray-600">
                        {announcement.category}
                      </span>
                      {!announcement.is_active && (
                        <span className="px-2 py-1 bg-gray-700/50 text-gray-400 rounded-full text-xs font-medium border border-gray-600">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                      {announcement.title}
                    </h3>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-gray-300 mb-4">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{announcement.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(announcement.date)}</span>
                  </div>
                </div>

                {/* Content Preview */}
                <p className="text-gray-300 text-sm line-clamp-3 mb-4">
                  {announcement.content}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-600">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="announcement-action-button p-2 text-blue-400 rounded-lg transition-colors duration-200 shadow-[2px_2px_4px_rgba(0,0,0,0.2),-1px_-1px_3px_rgba(255,255,255,0.15)]"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleAnnouncementStatus(announcement.id, announcement.is_active)}
                      className={`announcement-action-button p-2 rounded-lg transition-colors duration-200 shadow-[2px_2px_4px_rgba(0,0,0,0.2),-1px_-1px_3px_rgba(255,255,255,0.15)] ${
                        announcement.is_active 
                          ? 'text-green-400' 
                          : 'text-yellow-400'
                      }`}
                      title={announcement.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {announcement.is_active ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="announcement-action-button p-2 text-red-400 rounded-lg transition-colors duration-200 shadow-[2px_2px_4px_rgba(0,0,0,0.2),-1px_-1px_3px_rgba(255,255,255,0.15)]"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}


      {/* Create/Edit Modal */}
      <CreateAnnouncementModal
        isOpen={showModal}
        onClose={handleModalClose}
        editingAnnouncement={editingAnnouncement}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default Announcement;
