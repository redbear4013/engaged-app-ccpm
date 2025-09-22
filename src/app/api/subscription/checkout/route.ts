import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SubscriptionService } from '@/services/subscription-service';

export async function POST(request: NextRequest) {
  try {
    const { userId, successUrl, cancelUrl } = await request.json();

    if (!userId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify user exists and is authenticated
    const { data: user } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user already has an active subscription
    const existingSubscription = await SubscriptionService.getUserSubscription(userId);
    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      );
    }

    // Create checkout session
    const session = await SubscriptionService.createCheckoutSession(
      userId,
      successUrl,
      cancelUrl
    );

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}