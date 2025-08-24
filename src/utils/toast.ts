// Fix for the toast issue - this creates a type-safe wrapper around react-hot-toast
import { toast as originalToast } from 'react-hot-toast';

// Create a wrapper with the correct type definitions
const toast = {
  ...originalToast,
  // Add missing methods with proper typing
  warning: (message: string) => originalToast(message, { 
    icon: '⚠️', 
    style: { backgroundColor: '#FEFCE8', color: '#854D0E', borderColor: '#FEF08A' } 
  }),
  info: (message: string) => originalToast(message, { 
    icon: 'ℹ️', 
    style: { backgroundColor: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE' } 
  })
};

export default toast;
