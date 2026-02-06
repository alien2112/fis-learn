export class CreateStreamDto {
  courseId!: string;
  title!: string;
  scheduledAt?: Date;
}

export class UpdateStreamDto {
  title?: string;
  status?: 'SCHEDULED' | 'LIVE' | 'ENDED';
  scheduledAt?: Date;
}

export class JoinStreamDto {
  streamId!: string;
  userId!: string;
  userName!: string;
}

export class LeaveStreamDto {
  streamId!: string;
  userId!: string;
}

export class GenerateTokenDto {
  roomId!: string;
  userId!: string;
  userName!: string;
  role!: number; // 1 = host, 2 = co-host, 0 = audience
}
