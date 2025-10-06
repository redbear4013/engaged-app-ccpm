import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/services/subscription-service';
import { UsageService } from '@/services/usage-service';
import { logApiRequest, logApiError, logSuccess, logValidationError } from '@/lib/api-logger';

export async function GET(request: NextRequest) {
  try {
    logApiRequest(request, { endpoint: '/api/subscription/status' });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      logValidationError([{ field: 'userId', message: 'User ID is required' }]);
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

    logSuccess('Get subscription status', {
      userId,
      hasSubscription: !!subscription,
      paymentCount: payments.length
    });

    return NextResponse.json({
      subscription,
      usageLimits,
      recentPayments: payments,
    });
  } catch (error) {
    logApiError(error, 'GET /api/subscription/status');
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}