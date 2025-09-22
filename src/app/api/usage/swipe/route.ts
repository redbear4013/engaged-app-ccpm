import { NextRequest, NextResponse } from 'next/server';
import { UsageService } from '@/services/usage-service';

export async function POST(request: NextRequest) {
  try {
    const { userId, swipeType } = await request.json();

    if (!userId || !swipeType) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!['like', 'pass', 'superlike'].includes(swipeType)) {
      return NextResponse.json(
        { error: 'Invalid swipe type' },
        { status: 400 }
      );
    }

    // Record the swipe
    const success = await UsageService.recordSwipe(userId, swipeType);

    if (!success) {
      return NextResponse.json(
        { error: 'Daily swipe limit reached' },
        { status: 429 }
      );
    }

    // Get updated usage limits
    const usageLimits = await UsageService.getUserUsageLimits(userId);

    return NextResponse.json({
      success: true,
      usageLimits,
    });
  } catch (error) {
    console.error('Error recording swipe:', error);
    return NextResponse.json(
      { error: 'Failed to record swipe' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user has reached swipe limit
    const hasReachedLimit = await UsageService.hasReachedSwipeLimit(userId);
    const usageLimits = await UsageService.getUserUsageLimits(userId);

    return NextResponse.json({
      hasReachedLimit,
      usageLimits,
    });
  } catch (error) {
    console.error('Error checking swipe limit:', error);
    return NextResponse.json(
      { error: 'Failed to check swipe limit' },
      { status: 500 }
    );
  }
}