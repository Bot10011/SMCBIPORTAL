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
  { value: 'high', label: 'High', color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50 border-green-200' }
];

const CATEGORY_OPTIONS = [
  'General',
  'Enrollment',
  'Academic',
  'Services',
  'Events',
  'System',
  'Emergency'
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
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
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
      const matchesPriority = filterPriority === 'all' || announcement.priority === filterPriority;
      const matchesCategory = filterCategory === 'all' || announcement.category === filterCategory;
      
      return matchesSearch && matchesPriority && matchesCategory;
    });
  }, [announcements, searchTerm, filterPriority, filterCategory]);

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
    return priorityOption?.color || 'text-gray-600 bg-gray-50 border-gray-200';
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
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-lg">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{announcementStats.total}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">{announcementStats.active}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">High Priority</div>
          <div className="text-2xl font-bold text-red-600">{announcementStats.highPriority}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Inactive</div>
          <div className="text-2xl font-bold text-gray-500">{announcementStats.inactive}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="announcement-controls bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priorities</option>
              {PRIORITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {CATEGORY_OPTIONS.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowModal(true)}
            className="announcement-create-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
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
            <div className="h-8 bg-gray-200 rounded w-80 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>

          {/* Controls Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 animate-pulse">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="h-10 bg-gray-200 rounded-lg flex-1 max-w-md"></div>
                <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
                <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
              </div>
              <div className="h-10 w-48 bg-gray-200 rounded-lg"></div>
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>

          {/* Announcements Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </div>
                      <div className="h-5 bg-gray-200 rounded w-full mb-2"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
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
              className="announcement-card bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              {/* Banner Image */}
              {announcement.image && (
                <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100">
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
                          <div class="flex items-center justify-center h-full bg-gray-100">
                            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {announcement.category}
                      </span>
                      {!announcement.is_active && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {announcement.title}
                    </h3>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
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
                <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                  {announcement.content}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="announcement-action-button p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleAnnouncementStatus(announcement.id, announcement.is_active)}
                      className={`announcement-action-button p-2 rounded-lg transition-colors duration-200 ${
                        announcement.is_active 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-yellow-600 hover:bg-yellow-50'
                      }`}
                      title={announcement.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {announcement.is_active ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="announcement-action-button p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
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
