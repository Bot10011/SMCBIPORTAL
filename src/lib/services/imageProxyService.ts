// Service to handle Google Classroom profile image loading
export class ImageProxyService {
  // Convert Google Classroom image URL to a proxy URL to avoid CORS issues
  static getProxyImageUrl(originalUrl: string): string {
    if (!originalUrl) return '';
    
    // If the URL is already a data URL or relative, return as is
    if (originalUrl.startsWith('data:') || originalUrl.startsWith('/')) {
      return originalUrl;
    }
    
    // For Google Classroom images, we'll try to load them directly
    // Google Classroom images should be accessible if the user is authenticated
    return originalUrl;
  }

  // Get initials from full name
  static getInitials(fullName: string): string {
    if (!fullName) return '?';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    // Get first letter of first name and first letter of last name
    const firstInitial = names[0].charAt(0).toUpperCase();
    const lastInitial = names[names.length - 1].charAt(0).toUpperCase();
    
    return firstInitial + lastInitial;
  }

  // Generate a color based on the name for consistent avatar colors
  static getNameColor(fullName: string): string {
    if (!fullName) return 'from-gray-400 to-gray-600';
    
    const colors = [
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-red-400 to-red-600',
      'from-yellow-400 to-yellow-600',
      'from-teal-400 to-teal-600',
    ];
    
    // Simple hash function to get consistent color for same name
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  // Check if image URL is accessible
  static async checkImageAccessibility(url: string): Promise<boolean> {
    if (!url) return false;
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
} 