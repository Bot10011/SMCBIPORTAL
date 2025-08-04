import { GoogleAssignment, GoogleSubmission } from './googleClassroomService';

export interface AssignmentPriority {
  assignmentId: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedTime: number; // in hours
  difficulty: 'easy' | 'medium' | 'hard';
  dueDate: Date;
  points: number;
  courseWeight: number; // how much this course affects GPA
  stressLevel: number; // 1-10 based on complexity and time pressure
}

export interface SmartAssignment extends GoogleAssignment {
  priority: AssignmentPriority;
  isOverdue: boolean;
  daysUntilDue: number;
  completionPercentage: number;
  recommendedStudyTime: number; // in minutes
}

export interface AssignmentAnalytics {
  totalAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  upcomingDeadlines: number;
  averageCompletionTime: number;
  stressLevel: number;
  recommendedActions: string[];
}

export class SmartAssignmentService {
  private static calculatePriority(
    assignment: GoogleAssignment,
    submission: GoogleSubmission | undefined,
    courseWeight: number = 1
  ): AssignmentPriority {
    const now = new Date();
    const dueDate = assignment.dueDate 
      ? new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day)
      : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to 1 week from now
    
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntilDue < 0;
    
    // Calculate estimated time based on assignment type and points
    let estimatedTime = 1; // Default 1 hour
    if (assignment.maxPoints) {
      estimatedTime = Math.max(0.5, assignment.maxPoints / 10); // Rough estimate: 1 hour per 10 points
    }
    
    // Determine difficulty based on points and description
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (assignment.maxPoints) {
      if (assignment.maxPoints <= 10) difficulty = 'easy';
      else if (assignment.maxPoints >= 50) difficulty = 'hard';
    }
    
    // Calculate priority based on multiple factors
    let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium';
    
    if (isOverdue) {
      priority = 'urgent';
    } else if (daysUntilDue <= 1) {
      priority = 'urgent';
    } else if (daysUntilDue <= 3) {
      priority = 'high';
    } else if (daysUntilDue <= 7) {
      priority = 'medium';
    } else {
      priority = 'low';
    }
    
    // Adjust priority based on points and course weight
    if (assignment.maxPoints && assignment.maxPoints > 20) {
      if (priority === 'low') priority = 'medium';
      else if (priority === 'medium') priority = 'high';
    }
    
    // Calculate stress level (1-10)
    let stressLevel = 5; // Base stress level
    if (isOverdue) stressLevel += 3;
    if (daysUntilDue <= 1) stressLevel += 2;
    if (assignment.maxPoints && assignment.maxPoints > 30) stressLevel += 1;
    if (difficulty === 'hard') stressLevel += 1;
    stressLevel = Math.min(10, Math.max(1, stressLevel));
    
    return {
      assignmentId: assignment.id,
      priority,
      estimatedTime,
      difficulty,
      dueDate,
      points: assignment.maxPoints || 0,
      courseWeight,
      stressLevel
    };
  }

  static processAssignments(
    assignments: GoogleAssignment[],
    submissions: { [key: string]: GoogleSubmission },
    courseWeights: { [courseId: string]: number } = {}
  ): SmartAssignment[] {
    return assignments.map(assignment => {
      const submission = submissions[assignment.id];
      const courseWeight = courseWeights[assignment.courseId] || 1;
      const priority = this.calculatePriority(assignment, submission, courseWeight);
      
      const now = new Date();
      const dueDate = assignment.dueDate 
        ? new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day)
        : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntilDue < 0;
      
      // Calculate completion percentage
      let completionPercentage = 0;
      if (submission) {
        if (submission.state === 'TURNED_IN') completionPercentage = 100;
        else if (submission.state === 'SUBMITTED') completionPercentage = 90;
        else if (submission.state === 'CREATED') completionPercentage = 25;
      }
      
      // Calculate recommended study time
      let recommendedStudyTime = priority.estimatedTime * 60; // Convert to minutes
      if (completionPercentage > 0) {
        recommendedStudyTime = recommendedStudyTime * (1 - completionPercentage / 100);
      }
      
      return {
        ...assignment,
        priority,
        isOverdue,
        daysUntilDue,
        completionPercentage,
        recommendedStudyTime: Math.round(recommendedStudyTime)
      };
    });
  }

  static getAssignmentAnalytics(smartAssignments: SmartAssignment[]): AssignmentAnalytics {
    const totalAssignments = smartAssignments.length;
    const completedAssignments = smartAssignments.filter(a => a.completionPercentage === 100).length;
    const overdueAssignments = smartAssignments.filter(a => a.isOverdue).length;
    const upcomingDeadlines = smartAssignments.filter(a => a.daysUntilDue <= 3 && a.daysUntilDue >= 0).length;
    
    const averageCompletionTime = smartAssignments.length > 0 
      ? smartAssignments.reduce((sum, a) => sum + a.priority.estimatedTime, 0) / smartAssignments.length
      : 0;
    
    const averageStressLevel = smartAssignments.length > 0
      ? smartAssignments.reduce((sum, a) => sum + a.priority.stressLevel, 0) / smartAssignments.length
      : 5;
    
    // Generate recommended actions
    const recommendations: string[] = [];
    
    if (overdueAssignments > 0) {
      recommendations.push(`Focus on ${overdueAssignments} overdue assignment${overdueAssignments > 1 ? 's' : ''} first`);
    }
    
    if (upcomingDeadlines > 0) {
      recommendations.push(`You have ${upcomingDeadlines} assignment${upcomingDeadlines > 1 ? 's' : ''} due soon`);
    }
    
    if (averageStressLevel > 7) {
      recommendations.push('Consider breaking down large assignments into smaller tasks');
    }
    
    if (completedAssignments / totalAssignments < 0.5) {
      recommendations.push('Try to complete assignments earlier to reduce stress');
    }
    
    return {
      totalAssignments,
      completedAssignments,
      overdueAssignments,
      upcomingDeadlines,
      averageCompletionTime,
      stressLevel: Math.round(averageStressLevel),
      recommendedActions: recommendations
    };
  }

  static sortByPriority(smartAssignments: SmartAssignment[]): SmartAssignment[] {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    
    return [...smartAssignments].sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.priority.priority] - priorityOrder[b.priority.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by days until due (ascending)
      const daysDiff = a.daysUntilDue - b.daysUntilDue;
      if (daysDiff !== 0) return daysDiff;
      
      // Then by points (descending - higher points first)
      const pointsDiff = b.priority.points - a.priority.points;
      if (pointsDiff !== 0) return pointsDiff;
      
      // Finally by completion percentage (ascending - incomplete first)
      return a.completionPercentage - b.completionPercentage;
    });
  }

  static getStudyRecommendations(smartAssignments: SmartAssignment[]): string[] {
    const recommendations: string[] = [];
    const urgentAssignments = smartAssignments.filter(a => a.priority.priority === 'urgent');
    const highPriorityAssignments = smartAssignments.filter(a => a.priority.priority === 'high');
    
    if (urgentAssignments.length > 0) {
      recommendations.push(`Start with: ${urgentAssignments[0].title} (${urgentAssignments[0].priority.estimatedTime}h)`);
    }
    
    if (highPriorityAssignments.length > 0) {
      const totalTime = highPriorityAssignments.reduce((sum, a) => sum + a.priority.estimatedTime, 0);
      recommendations.push(`Plan ${totalTime.toFixed(1)} hours for high-priority assignments`);
    }
    
    const totalStudyTime = smartAssignments
      .filter(a => a.completionPercentage < 100)
      .reduce((sum, a) => sum + a.recommendedStudyTime, 0) / 60; // Convert to hours
    
    if (totalStudyTime > 0) {
      recommendations.push(`Total recommended study time: ${totalStudyTime.toFixed(1)} hours`);
    }
    
    return recommendations;
  }
} 