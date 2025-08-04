interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  createdTime: string;
  modifiedTime: string;
  size: string;
  webViewLink: string;
  thumbnailLink?: string;
}

interface DriveFolder {
  id: string;
  name: string;
  parents: string[];
  createdTime: string;
  modifiedTime: string;
}

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  createdTime: string;
  modifiedTime: string;
  size?: string;
  webViewLink: string;
  isFolder: boolean;
}

interface CreateFolderRequest {
  name: string;
  parentId?: string;
}

interface UploadFileRequest {
  file: File;
  parentId?: string;
  fileName?: string;
}

class GoogleDriveService {
  private getToken(userId: string): string | null {
    return localStorage.getItem(`google_classroom_token_${userId}`);
  }

  private async makeRequest(endpoint: string, userId: string, options: RequestInit = {}): Promise<any> {
    const token = this.getToken(userId);
    
    if (!token) {
      throw new Error('No access token found. Please reconnect to Google Classroom.');
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token expired. Please reconnect to Google Classroom.');
      }
      throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Get image URL for preview
  async getImageUrl(userId: string, fileId: string): Promise<string> {
    try {
      console.log('🔍 Getting image URL for file:', fileId);
      const token = this.getToken(userId);
      if (!token) {
        throw new Error('No access token found');
      }
      
      // Get the file metadata to check for thumbnail
      const fileData = await this.makeRequest(`files/${fileId}?fields=thumbnailLink,webViewLink`, userId);
      
      if (fileData.thumbnailLink) {
        // Use the thumbnail URL which is designed for display
        console.log('🔗 Thumbnail URL found:', fileData.thumbnailLink);
        return fileData.thumbnailLink;
      } else {
        // Fallback to Google Drive's image serving URL
        const imageUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
        console.log('🔗 Thumbnail URL created:', imageUrl);
        return imageUrl;
      }
    } catch (error) {
      console.error('❌ Error getting image URL:', error);
      throw error;
    }
  }

  // Get all files and folders
  async getFiles(userId: string, parentId?: string): Promise<DriveItem[]> {
    try {
      let query = "trashed=false";
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      } else {
        query += " and 'root' in parents";
      }

      const data = await this.makeRequest(`files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents,createdTime,modifiedTime,size,webViewLink,thumbnailLink)&orderBy=name`, userId);
      
      return data.files.map((file: any) => ({
        ...file,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder'
      }));
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }

  // Create a new folder
  async createFolder(userId: string, request: CreateFolderRequest): Promise<DriveFolder> {
    try {
      const folderMetadata = {
        name: request.name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(request.parentId && { parents: [request.parentId] })
      };

      const response = await this.makeRequest('files', userId, {
        method: 'POST',
        body: JSON.stringify(folderMetadata)
      });

      return response;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // Upload a file
  async uploadFile(userId: string, request: UploadFileRequest): Promise<DriveFile> {
    try {
      const token = this.getToken(userId);
      if (!token) {
        throw new Error('No access token found.');
      }

      // Create metadata
      const metadata = {
        name: request.fileName || request.file.name,
        ...(request.parentId && { parents: [request.parentId] })
      };

      // Create multipart body
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', request.file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Move file/folder to different parent
  async moveItem(userId: string, itemId: string, newParentId: string): Promise<DriveItem> {
    try {
      const response = await this.makeRequest(`files/${itemId}?addParents=${newParentId}&removeParents=root`, userId, {
        method: 'PATCH'
      });

      return {
        ...response,
        isFolder: response.mimeType === 'application/vnd.google-apps.folder'
      };
    } catch (error) {
      console.error('Error moving item:', error);
      throw error;
    }
  }

  // Rename file/folder
  async renameItem(userId: string, itemId: string, newName: string): Promise<DriveItem> {
    try {
      const response = await this.makeRequest(`files/${itemId}`, userId, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName })
      });

      return {
        ...response,
        isFolder: response.mimeType === 'application/vnd.google-apps.folder'
      };
    } catch (error) {
      console.error('Error renaming item:', error);
      throw error;
    }
  }

  // Delete file/folder (move to trash)
  async deleteItem(userId: string, itemId: string): Promise<void> {
    try {
      await this.makeRequest(`files/${itemId}`, userId, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  // Get folder path (breadcrumb)
  async getFolderPath(userId: string, folderId: string): Promise<DriveFolder[]> {
    try {
      const path: DriveFolder[] = [];
      let currentId = folderId;

      while (currentId && currentId !== 'root') {
        const folder = await this.makeRequest(`files/${currentId}?fields=id,name,parents`, userId);
        path.unshift(folder);
        currentId = folder.parents?.[0];
      }

      return path;
    } catch (error) {
      console.error('Error getting folder path:', error);
      throw error;
    }
  }

  // Create course-based folder structure
  async createCourseFolder(userId: string, courseName: string): Promise<DriveFolder> {
    try {
      // Create main course folder
      const courseFolder = await this.createFolder(userId, { name: courseName });
      
      // Create subfolders
      const subfolders = ['Assignments', 'Projects', 'Notes', 'Resources'];
      
      for (const subfolder of subfolders) {
        await this.createFolder(userId, { 
          name: subfolder, 
          parentId: courseFolder.id 
        });
      }

      return courseFolder;
    } catch (error) {
      console.error('Error creating course folder structure:', error);
      throw error;
    }
  }

  // Search files
  async searchFiles(userId: string, query: string): Promise<DriveItem[]> {
    try {
      const searchQuery = `name contains '${query}' and trashed=false`;
      const data = await this.makeRequest(`files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name,mimeType,parents,createdTime,modifiedTime,size,webViewLink)`, userId);
      
      return data.files.map((file: any) => ({
        ...file,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder'
      }));
    } catch (error) {
      console.error('Error searching files:', error);
      throw error;
    }
  }
}

export const googleDriveService = new GoogleDriveService();
export type { DriveFile, DriveFolder, DriveItem, CreateFolderRequest, UploadFileRequest }; 