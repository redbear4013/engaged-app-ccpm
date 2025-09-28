'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, Crown, Zap } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionSuccessPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Give the webhook some time to process
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Crown className="h-6 w-6 text-blue-600" />
              Welcome to Pro!
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Your subscription has been activated successfully
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                You now have access to:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Unlimited daily swipes</li>
                <li>• 5 super likes per day</li>
                <li>• Advanced event filters</li>
                <li>• Early access to new events</li>
                <li>• Priority customer support</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/discover">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Zap className="h-4 w-4 mr-2" />
                Start Discovering Events
              </Button>
            </Link>

            <Link href="/profile">
              <Button variant="outline" className="w-full">
                Manage Subscription
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-500">
            You'll receive a confirmation email shortly with your receipt and subscription details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}