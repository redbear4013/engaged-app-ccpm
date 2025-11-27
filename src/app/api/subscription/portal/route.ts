import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { SubscriptionService } from '@/services/subscription-service';

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId, returnUrl } = await request.json();

    if (!userId || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify user exists and has a Stripe customer ID
    const supabase = await createServerSupabaseClient();
    const { data: user } = await supabase
      .from('profiles')
      .select('id, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.stripe_customer_id) {
      return NextResponse.json(
        { error: 'User has no Stripe customer record' },
        { status: 400 }
      );
    }

    // Create billing portal session
    const session = await SubscriptionService.createBillingPortalSession(
      userId,
      returnUrl
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}