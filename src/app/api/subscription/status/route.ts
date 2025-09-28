import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/services/subscription-service';
import { UsageService } from '@/services/usage-service';

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

    // Get subscription and usage data
    const [subscription, usageLimits, payments] = await Promise.all([
      SubscriptionService.getUserSubscription(userId),
      UsageService.getUserUsageLimits(userId),
      SubscriptionService.getUserPayments(userId, 5),
    ]);

    return NextResponse.json({
      subscription,
      usageLimits,
      recentPayments: payments,
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}