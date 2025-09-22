'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { X, ArrowLeft, Crown } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionCanceledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-2xl">
              Subscription Canceled
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Your subscription process was canceled. No charges were made.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">
              What you're missing with Pro:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Unlimited daily swipes</li>
              <li>• 5 super likes per day</li>
              <li>• Advanced event filters</li>
              <li>• Early access to new events</li>
              <li>• Priority customer support</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link href="/pricing">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Crown className="h-4 w-4 mr-2" />
                Try Again - Upgrade to Pro
              </Button>
            </Link>

            <Link href="/discover">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue with Free Plan
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-500">
            You can always upgrade to Pro later from your profile settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}