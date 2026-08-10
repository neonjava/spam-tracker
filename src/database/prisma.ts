import { PrismaClient } from '@prisma/client';
import { LoggingService } from '../services/loggingService';

export const prisma = new PrismaClient();

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    LoggingService.logInfo('Database', 'Connected to database successfully');
  } catch (error) {
    LoggingService.logError('Database', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    LoggingService.logInfo('Database', 'Disconnected from database');
  } catch (error) {
    LoggingService.logError('Database', error);
  }
}
