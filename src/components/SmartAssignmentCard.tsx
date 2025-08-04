import React from 'react';
import { Clock, AlertTriangle, CheckCircle, FileText, TrendingUp, Calendar, Target, Zap } from 'lucide-react';
import { SmartAssignment } from '../lib/services/smartAssignmentService';

interface SmartAssignmentCardProps {
  assignment: SmartAssignment;
  onView: () => void;
  onSubmit: () => void;
  onTurnIn: () => void;
}

const SmartAssignmentCard: React.FC<SmartAssignmentCardProps> = ({
  assignment,
  onView,
  onSubmit,
  onTurnIn
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4" />;
      case 'high':
        return <Zap className="w-4 h-4" />;
      case 'medium':
        return <Clock className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'hard':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'easy':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeEstimate = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      return `${(hours / 24).toFixed(1)}d`;
    }
  };

  const getDaysText = (days: number) => {
    if (days < 0) {
      return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
    } else if (days === 0) {
      return 'Due today';
    } else if (days === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${days} days`;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className={`bg-white border-2 rounded-xl p-4 hover:shadow-lg transition-all duration-200 ${
      assignment.isOverdue ? 'border-red-200 bg-red-50' :
      assignment.priority.priority === 'urgent' ? 'border-red-300 bg-red-50' :
      assignment.priority.priority === 'high' ? 'border-orange-200 bg-orange-50' :
      'border-gray-200'
    }`}>
      {/* Header with Priority Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(assignment.priority.priority)}`}>
              {getPriorityIcon(assignment.priority.priority)}
              <span className="ml-1 capitalize">{assignment.priority.priority}</span>
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(assignment.priority.difficulty)}`}>
              {assignment.priority.difficulty}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {assignment.title}
          </h3>
        </div>
        
        {/* Status Badge */}
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            assignment.completionPercentage === 100 
              ? 'text-green-600 bg-green-100' 
              : assignment.completionPercentage > 0
              ? 'text-blue-600 bg-blue-100'
              : 'text-gray-600 bg-gray-100'
          }`}>
            {assignment.completionPercentage === 100 
              ? 'Completed' 
              : assignment.completionPercentage > 0
              ? `${assignment.completionPercentage}% Done`
              : 'Not Started'
            }
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {assignment.completionPercentage > 0 && assignment.completionPercentage < 100 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{assignment.completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(assignment.completionPercentage)}`}
              style={{ width: `${assignment.completionPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Assignment Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className={assignment.isOverdue ? 'text-red-600 font-medium' : ''}>
              {getDaysText(assignment.daysUntilDue)}
            </span>
          </div>
          {assignment.priority.points > 0 && (
            <div className="flex items-center gap-1 text-gray-600">
              <Target className="w-4 h-4" />
              <span>{assignment.priority.points} points</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Est. {formatTimeEstimate(assignment.priority.estimatedTime)}</span>
          </div>
          {assignment.recommendedStudyTime > 0 && (
            <div className="flex items-center gap-1 text-blue-600">
              <TrendingUp className="w-4 h-4" />
              <span>Study {Math.round(assignment.recommendedStudyTime)}m</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onView}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span>View</span>
        </button>

        {/* Show submit button for any state that's not completed */}
        {assignment.completionPercentage < 100 && (
          <button
            onClick={onSubmit}
            className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Submit</span>
          </button>
        )}

        {/* Show turn in button only when submission is submitted but not turned in */}
        {assignment.completionPercentage === 90 && (
          <button
            onClick={onTurnIn}
            className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-green-50 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Turn In</span>
          </button>
        )}
      </div>

      {/* Stress Level Indicator */}
      {assignment.priority.stressLevel > 7 && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>High stress level: {assignment.priority.stressLevel}/10</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartAssignmentCard; 