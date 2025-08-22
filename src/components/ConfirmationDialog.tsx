import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'text-red-500',
          button: 'bg-red-600 hover:bg-red-700 text-white',
          border: 'border-red-100'
        };
      case 'info':
        return {
          icon: 'text-blue-500',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          border: 'border-blue-100'
        };
      default: // warning
        return {
          icon: 'text-yellow-500',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          border: 'border-yellow-100'
        };
    }
  };

  const styles = getTypeStyles();

  // Function to highlight user names in the message
  const renderMessage = (message: string) => {
    // Check if message contains user information (likely contains a name)
    if (message.includes('Are you sure you want to') && (message.includes('delete') || message.includes('deactivate') || message.includes('activate'))) {
      // Split the message to find the user name part
      const parts = message.split('?');
      if (parts.length >= 2) {
        const actionPart = parts[0];
        const userPart = parts[1];
        
        // Find the user name (usually after the action and before "?")
        const actionMatch = actionPart.match(/Are you sure you want to (delete|deactivate|activate) (.+)/);
        if (actionMatch) {
          const action = actionMatch[1];
          const userName = actionMatch[2];
          
          return (
            <span>
              Are you sure you want to {action}{' '}
              <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                {userName}
              </span>
              ?{userPart}
            </span>
          );
        }
      }
    }
    
    // If no special formatting needed, return the message as is
    return message;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-gray-200 relative">
        {/* Simple Close Button */}
        <button 
          onClick={onClose}
          className="absolute w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 top-3 right-3 z-50"
          aria-label="Close dialog"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-100">
          <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 leading-relaxed">
            {renderMessage(message)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${styles.button}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
} 
