export interface TrackEventDto {
  eventType: string;
  timestamp: string; // ISO8601
  sessionId: string;
  courseId?: string;
  lessonId?: string;
  payload?: Record<string, any>;
}
