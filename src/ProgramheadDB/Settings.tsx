import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Avatar,
  Switch,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  School,
  Notifications,
  Security,
  Save,
  Edit,
  Visibility,
  VisibilityOff,
  Lock,
  NotificationsActive,
  Shield,
  CheckCircle,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

// TypeScript Interfaces
interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface Settings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  darkMode: boolean;
  autoSave: boolean;
  privacyMode: boolean;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ValidationErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

type LoadingState = 'idle' | 'loading' | 'saving' | 'updating';

const Settings: React.FC = () => {
  console.log('Settings component loaded');
  
  // State Management with proper typing
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<Settings>({
    emailNotifications: true,
    smsNotifications: false,
    darkMode: false,
    autoSave: true,
    privacyMode: false,
  });
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [editing, setEditing] = useState<boolean>(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState<boolean>(false);
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  useEffect(() => {
    loadProfile();
  }, []);

  // Enhanced Profile Loading with better error handling
  const loadProfile = async (): Promise<void> => {
    try {
      setLoadingState('loading');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      if (!user) throw new Error('No authenticated user found');
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoadingState('idle');
    }
  };

  // Enhanced Profile Update with validation
  const handleProfileUpdate = async (): Promise<void> => {
    if (!profile) return;
    
    // Validation
    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    
    try {
      setLoadingState('saving');
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          phone: profile.phone?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoadingState('idle');
    }
  };

  // Enhanced Password Validation
  const validatePassword = (password: string): string | undefined => {
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    return undefined;
  };

  // Enhanced Password Change with validation
  const handlePasswordChange = async (): Promise<void> => {
    // Clear previous errors
    setValidationErrors({});
    
    // Validation
    const errors: ValidationErrors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    const newPasswordError = validatePassword(passwordData.newPassword);
    if (newPasswordError) {
      errors.newPassword = newPasswordError;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setLoadingState('updating');
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setShowPasswordDialog(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setValidationErrors({});
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setLoadingState('idle');
    }
  };

  // Enhanced Settings Change Handler
  const handleSettingChange = (setting: keyof Settings): void => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting],
    }));
    
    // Show feedback for important settings
    if (setting === 'darkMode') {
      toast.success(`Dark mode ${!settings.darkMode ? 'enabled' : 'disabled'}`);
    }
  };

  // Loading State
  if (loadingState === 'loading') {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={40} sx={{ color: '#6366f1' }} />
        <Typography variant="body2" color="text.secondary">
          Loading settings...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0, maxWidth: '100%', margin: '0 auto' }}>
      {/* Header */}
      <Box sx={{ 
        mb: 6, 
        background: 'linear-gradient(to right, #2563eb, #9333ea)',
        px: 6,
        py: 4,
        borderRadius: 3,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 3
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ 
            p: 2, 
            borderRadius: 2, 
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ color: 'white' }}
            >
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
          </Box>
          <Box>
            <Typography variant="h4" sx={{ 
              fontWeight: 700, 
              color: 'white',
              letterSpacing: '-0.025em',
              fontSize: '2rem'
            }}>
              Settings & Preferences
            </Typography>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              fontSize: '0.875rem',
              fontWeight: 500
            }}>
              Manage your profile, security, and application preferences
            </Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Profile Information Section */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
            height: 'fit-content'
          }}>
            {/* Card Header */}
            <Box sx={{ 
              p: 4, 
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 3, 
                    backgroundColor: '#6366f1',
                    mr: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}>
                    <Person sx={{ color: 'white', fontSize: '1.75rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937', mb: 0.5 }}>
                      Profile Information
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                      Manage your personal details and contact information
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  onClick={() => setEditing(!editing)}
                  sx={{
                    backgroundColor: editing ? '#ef4444' : '#6366f1',
                    color: 'white',
                    p: 1.5,
                    '&:hover': {
                      backgroundColor: editing ? '#dc2626' : '#5a67d8',
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Edit sx={{ fontSize: '1.25rem' }} />
                </IconButton>
              </Box>
            </Box>

            {/* Card Content */}
            <CardContent sx={{ p: 4 }}>
              {profile && (
                <Box>
                  {/* Profile Avatar Section */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    p: 4, 
                    backgroundColor: '#f8fafc',
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    mb: 4
                  }}>
                    <Avatar
                      sx={{ 
                        width: 90, 
                        height: 90, 
                        mr: 3,
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
                      }}
                      src={profile.avatar_url}
                    >
                      {profile.first_name?.[0]}{profile.last_name?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
                        {profile.first_name} {profile.last_name}
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#6b7280', mb: 2, fontWeight: 500 }}>
                        {profile.position} • {profile.department}
                      </Typography>
                      <Chip 
                        label="Program Head" 
                        size="medium" 
                        sx={{ 
                          backgroundColor: '#e0e7ff',
                          color: '#6366f1',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          px: 2
                        }} 
                      />
                    </Box>
                  </Box>

                  {/* Form Fields */}
                  <Grid container spacing={3}>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profile.first_name}
                      onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                      disabled={!editing}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&.Mui-focused': {
                            boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
                          }
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profile.last_name}
                      onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                      disabled={!editing}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&.Mui-focused': {
                            boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
                          }
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      value={profile.email}
                      disabled
                      InputProps={{
                        startAdornment: <Email sx={{ mr: 1.5, color: '#6b7280' }} />,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          backgroundColor: '#f9fafb',
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <Phone sx={{ mr: 1.5, color: '#6b7280' }} />,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&.Mui-focused': {
                            boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                          }
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Department"
                      value={profile.department}
                      disabled
                      InputProps={{
                        startAdornment: <School sx={{ mr: 1.5, color: '#6b7280' }} />,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          backgroundColor: '#f9fafb',
                        }
                      }}
                    />
                  </Grid>

                  {/* Action Buttons */}
                  {editing && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2, pt: 3, borderTop: '1px solid #e5e7eb' }}>
                        <Button
                          variant="contained"
                          startIcon={<Save />}
                          onClick={handleProfileUpdate}
                          disabled={loadingState === 'saving'}
                          sx={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderRadius: 2,
                            px: 4,
                            py: 1.5,
                            fontWeight: 600,
                            '&:hover': {
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                            }
                          }}
                        >
                          {loadingState === 'saving' ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => setEditing(false)}
                          sx={{ 
                            borderRadius: 2, 
                            px: 4, 
                            py: 1.5,
                            fontWeight: 600,
                            borderColor: '#d1d5db',
                            color: '#6b7280',
                            '&:hover': {
                              borderColor: '#9ca3af',
                              backgroundColor: '#f9fafb'
                            }
                          }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Grid>
                  )}
                </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Settings Column */}
        <Grid item xs={12} lg={6}>
          {/* Security Settings */}
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
            mb: 3
          }}>
            <Box sx={{ 
              p: 3, 
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  backgroundColor: '#ef4444',
                  mr: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Security sx={{ color: 'white', fontSize: '1.5rem' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
                  Security Settings
                </Typography>
              </Box>
            </Box>

            <CardContent sx={{ p: 0 }}>
              <List>
                <ListItem sx={{ px: 3, py: 2 }}>
                  <ListItemIcon>
                    <Lock sx={{ color: '#ef4444' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Change Password"
                    secondary="Update your account password for enhanced security"
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setShowPasswordDialog(true)}
                      sx={{ 
                        borderRadius: 2,
                        borderColor: '#ef4444',
                        color: '#ef4444',
                        '&:hover': {
                          borderColor: '#dc2626',
                          backgroundColor: '#fef2f2',
                        }
                      }}
                    >
                      Change
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem sx={{ px: 3, py: 2 }}>
                  <ListItemIcon>
                    <Shield sx={{ color: '#6366f1' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Privacy Mode"
                    secondary="Hide sensitive information from other users"
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.privacyMode}
                      onChange={() => handleSettingChange('privacyMode')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#6366f1',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#6366f1',
                        },
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
            mb: 3
          }}>
            <Box sx={{ 
              p: 3, 
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  backgroundColor: '#0ea5e9',
                  mr: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Notifications sx={{ color: 'white', fontSize: '1.5rem' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
                  Notification Preferences
                </Typography>
              </Box>
            </Box>

            <CardContent sx={{ p: 0 }}>
              <List>
                <ListItem sx={{ px: 3, py: 2 }}>
                  <ListItemIcon>
                    <Email sx={{ color: '#0ea5e9' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email Notifications"
                    secondary="Receive important updates via email"
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={() => handleSettingChange('emailNotifications')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#0ea5e9',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#0ea5e9',
                        },
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem sx={{ px: 3, py: 2 }}>
                  <ListItemIcon>
                    <NotificationsActive sx={{ color: '#f59e0b' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="SMS Notifications"
                    secondary="Receive urgent alerts via SMS"
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.smsNotifications}
                      onChange={() => handleSettingChange('smsNotifications')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#f59e0b',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#f59e0b',
                        },
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
     
        </Grid>
      </Grid>

      {/* Enhanced Password Change Dialog */}
      <Dialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          fontWeight: 600
        }}>
          Change Password
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Password Requirements:</strong> At least 8 characters with uppercase, lowercase, and number
            </Typography>
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                type={showPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                error={!!validationErrors.currentPassword}
                helperText={validationErrors.currentPassword}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                error={!!validationErrors.newPassword}
                helperText={validationErrors.newPassword}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                error={!!validationErrors.confirmPassword}
                helperText={validationErrors.confirmPassword}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setShowPasswordDialog(false)}
            variant="outlined"
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePasswordChange}
            disabled={loadingState === 'updating'}
            startIcon={loadingState === 'updating' ? <CircularProgress size={16} /> : <CheckCircle />}
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: 2,
              px: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              }
            }}
          >
            {loadingState === 'updating' ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
