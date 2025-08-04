export interface SmartNotification {
  id: string;
  type: 'deadline' | 'grade' | 'study' | 'collaboration' | 'reminder' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  actionRequired: boolean;
  assignmentId?: string;
  courseId?: string;
  dueDate?: Date;
  createdAt: Date;
  read: boolean;
  dismissed: boolean;
  customAction?: () => void;
}

export interface NotificationSettings {
  deadlineReminders: {
    enabled: boolean;
    intervals: number[]; // hours before due date
  };
  studyReminders: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'custom';
    customHours?: number[];
  };
  gradeNotifications: {
    enabled: boolean;
    immediate: boolean;
  };
  collaborationAlerts: {
    enabled: boolean;
    groupUpdates: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

export class SmartNotificationService {
  private static notifications: SmartNotification[] = [];
  private static settings: NotificationSettings = {
    deadlineReminders: {
      enabled: true,
      intervals: [168, 72, 24, 1] // 1 week, 3 days, 1 day, 1 hour
    },
    studyReminders: {
      enabled: true,
      frequency: 'daily'
    },
    gradeNotifications: {
      enabled: true,
      immediate: true
    },
    collaborationAlerts: {
      enabled: true,
      groupUpdates: true
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  };

  static initialize() {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('smartNotificationSettings');
    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }

    // Load existing notifications
    const savedNotifications = localStorage.getItem('smartNotifications');
    if (savedNotifications) {
      this.notifications = JSON.parse(savedNotifications);
    }

    // Start notification monitoring
    this.startNotificationMonitoring();
  }

  private static startNotificationMonitoring() {
    // Check for notifications every minute
    setInterval(() => {
      this.checkForNewNotifications();
    }, 60000);

    // Check for overdue assignments every 5 minutes
    setInterval(() => {
      this.checkOverdueAssignments();
    }, 300000);
  }

  static createDeadlineNotification(
    assignmentId: string,
    courseId: string,
    title: string,
    dueDate: Date,
    hoursUntilDue: number
  ): SmartNotification {
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    let message = '';

    if (hoursUntilDue <= 1) {
      priority = 'urgent';
      message = `URGENT: "${title}" is due in ${hoursUntilDue} hour${hoursUntilDue === 1 ? '' : 's'}!`;
    } else if (hoursUntilDue <= 24) {
      priority = 'high';
      message = `"${title}" is due tomorrow!`;
    } else if (hoursUntilDue <= 72) {
      priority = 'medium';
      message = `"${title}" is due in ${Math.ceil(hoursUntilDue / 24)} days`;
    } else {
      priority = 'low';
      message = `"${title}" is due in ${Math.ceil(hoursUntilDue / 24)} days`;
    }

    return {
      id: `deadline_${assignmentId}_${Date.now()}`,
      type: 'deadline',
      priority,
      title: 'Assignment Due Soon',
      message,
      actionRequired: true,
      assignmentId,
      courseId,
      dueDate,
      createdAt: new Date(),
      read: false,
      dismissed: false
    };
  }

  static createStudyReminder(
    totalAssignments: number,
    overdueCount: number,
    upcomingDeadlines: number
  ): SmartNotification {
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    let message = '';

    if (overdueCount > 0) {
      priority = 'urgent';
      message = `You have ${overdueCount} overdue assignment${overdueCount > 1 ? 's' : ''} that need immediate attention!`;
    } else if (upcomingDeadlines > 0) {
      priority = 'high';
      message = `You have ${upcomingDeadlines} assignment${upcomingDeadlines > 1 ? 's' : ''} due within 3 days. Plan your study time!`;
    } else if (totalAssignments > 0) {
      priority = 'medium';
      message = `You have ${totalAssignments} pending assignment${totalAssignments > 1 ? 's' : ''}. Stay on track!`;
    } else {
      priority = 'low';
      message = 'All assignments are up to date. Great job!';
    }

    return {
      id: `study_reminder_${Date.now()}`,
      type: 'study',
      priority,
      title: 'Study Status Update',
      message,
      actionRequired: false,
      createdAt: new Date(),
      read: false,
      dismissed: false
    };
  }

  static createOverdueNotification(
    assignmentId: string,
    courseId: string,
    title: string,
    daysOverdue: number,
    assignmentAgeDays?: number
  ): SmartNotification {
    // Ensure daysOverdue is a reasonable number
    const validDaysOverdue = Math.max(0, Math.min(daysOverdue, 365)); // Cap at 1 year
    
    let message = '';
    if (validDaysOverdue === 0) {
      message = `"${title}" is overdue! Submit as soon as possible.`;
    } else if (validDaysOverdue === 1) {
      message = `"${title}" is 1 day overdue! Submit as soon as possible.`;
    } else {
      message = `"${title}" is ${validDaysOverdue} days overdue! Submit as soon as possible.`;
    }

    // Add context about when the assignment was posted if available
    if (assignmentAgeDays !== undefined && assignmentAgeDays > 0) {
      message += ` (Posted ${assignmentAgeDays} day${assignmentAgeDays === 1 ? '' : 's'} ago)`;
    }

    return {
      id: `overdue_${assignmentId}_${Date.now()}`,
      type: 'overdue',
      priority: 'urgent',
      title: 'Assignment Overdue',
      message,
      actionRequired: true,
      assignmentId,
      courseId,
      createdAt: new Date(),
      read: false,
      dismissed: false
    };
  }

  static createGradeNotification(
    assignmentId: string,
    courseId: string,
    title: string,
    grade: number,
    maxPoints: number
  ): SmartNotification {
    const percentage = (grade / maxPoints) * 100;
    let message = '';
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

    if (percentage >= 90) {
      priority = 'low';
      message = `Excellent work on "${title}"! You scored ${grade}/${maxPoints} (${percentage.toFixed(1)}%)`;
    } else if (percentage >= 80) {
      priority = 'medium';
      message = `Good job on "${title}"! You scored ${grade}/${maxPoints} (${percentage.toFixed(1)}%)`;
    } else if (percentage >= 70) {
      priority = 'high';
      message = `You scored ${grade}/${maxPoints} (${percentage.toFixed(1)}%) on "${title}". Consider reviewing the material.`;
    } else {
      priority = 'urgent';
      message = `You scored ${grade}/${maxPoints} (${percentage.toFixed(1)}%) on "${title}". Consider seeking help or reviewing the material.`;
    }

    return {
      id: `grade_${assignmentId}_${Date.now()}`,
      type: 'grade',
      priority,
      title: 'Grade Posted',
      message,
      actionRequired: false,
      assignmentId,
      courseId,
      createdAt: new Date(),
      read: false,
      dismissed: false
    };
  }

  static addNotification(notification: SmartNotification) {
    // Check if we're in quiet hours
    if (this.settings.quietHours.enabled && this.isInQuietHours()) {
      // Store notification but don't show it immediately
      notification.read = false;
    }

    this.notifications.unshift(notification);
    this.saveNotifications();
    this.showNotification(notification);
  }

  private static isInQuietHours(): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.settings.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private static showNotification(notification: SmartNotification) {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications');
      return;
    }

    // Request permission if not granted
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.displayNotification(notification);
        }
      });
    } else if (Notification.permission === 'granted') {
      this.displayNotification(notification);
    }
  }

  private static displayNotification(notification: SmartNotification) {
    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/img/logo.png', // Add your app icon
      badge: '/img/logo.png',
      tag: notification.id,
      requireInteraction: notification.priority === 'urgent',
      silent: notification.priority === 'low'
    });

    // Handle notification click
    browserNotification.onclick = () => {
      window.focus();
      browserNotification.close();
      
      // Mark as read
      this.markAsRead(notification.id);
      
      // Execute custom action if provided
      if (notification.customAction) {
        notification.customAction();
      }
    };

    // Auto-close low priority notifications after 5 seconds
    if (notification.priority === 'low') {
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }

  static getNotifications(limit?: number): SmartNotification[] {
    const notifications = this.notifications.filter(n => !n.dismissed);
    return limit ? notifications.slice(0, limit) : notifications;
  }

  static getUnreadCount(): number {
    return this.notifications.filter(n => !n.read && !n.dismissed).length;
  }

  static getUrgentCount(): number {
    return this.notifications.filter(n => 
      n.priority === 'urgent' && !n.dismissed
    ).length;
  }

  static markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
    }
  }

  static dismissNotification(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.dismissed = true;
      this.saveNotifications();
    }
  }

  static clearAllNotifications() {
    this.notifications.forEach(n => n.dismissed = true);
    this.saveNotifications();
  }

  static updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('smartNotificationSettings', JSON.stringify(this.settings));
  }

  static getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  private static saveNotifications() {
    localStorage.setItem('smartNotifications', JSON.stringify(this.notifications));
  }

  private static checkForNewNotifications() {
    // This would be called periodically to check for new notifications
    // Implementation depends on your data source
  }

  private static checkOverdueAssignments() {
    // This would check for overdue assignments and create notifications
    // Implementation depends on your assignment data
  }

  // Utility method to create a custom reminder
  static createCustomReminder(
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    customAction?: () => void
  ): SmartNotification {
    return {
      id: `custom_${Date.now()}`,
      type: 'reminder',
      priority,
      title,
      message,
      actionRequired: false,
      createdAt: new Date(),
      read: false,
      dismissed: false,
      customAction
    };
  }
} 