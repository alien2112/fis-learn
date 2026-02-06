'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  tier: string;
  billingCycle: string;
  price: number;
  features: string[];
  trialDays?: number;
  isActive: boolean;
}

export default function CheckoutPage() {
  const params = useParams();
  const courseId = Array.isArray(params?.courseId) ? params.courseId[0] : (params?.courseId as string);
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
      return;
    }

    if (isAuthLoading || !user) return;

    let cancelled = false;
    const loadPlans = async () => {
      try {
        const response = await apiClient.get('/subscriptions/plans');
        if (!cancelled) {
          const data = response.data.data;
          setPlans(Array.isArray(data) ? data.filter((p: SubscriptionPlan) => p.isActive) : []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load plans.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadPlans();
    return () => { cancelled = true; };
  }, [user, isAuthLoading, router]);

  const handleCheckout = async (planId: string) => {
    setIsCheckingOut(planId);
    setError(null);
    try {
      const successUrl = `${window.location.origin}/dashboard?subscribed=true`;
      const cancelUrl = `${window.location.origin}/checkout/${courseId}`;

      const response = await apiClient.post('/subscriptions/checkout', {
        planId,
        successUrl,
        cancelUrl,
      });

      const { url } = response.data.data;
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setIsCheckingOut(null);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="container py-12 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-3xl mx-auto">
      <div className="space-y-2 mb-8">
        <h1 className="text-2xl font-bold">Choose a plan</h1>
        <p className="text-muted-foreground">
          Subscribe to unlock access to all paid courses.
        </p>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No subscription plans are available at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <Badge variant="secondary">{plan.tier}</Badge>
                </div>
                <CardDescription>
                  {plan.billingCycle === 'MONTHLY' ? 'Monthly' : 'Yearly'} billing
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${(plan.price / 100).toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">
                    /{plan.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}
                  </span>
                </div>

                {plan.trialDays && plan.trialDays > 0 && (
                  <Badge variant="outline" className="w-fit">
                    {plan.trialDays}-day free trial
                  </Badge>
                )}

                <ul className="flex-1 space-y-2">
                  {(plan.features as string[]).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full mt-auto"
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isCheckingOut === plan.id}
                >
                  {isCheckingOut === plan.id
                    ? 'Redirecting…'
                    : plan.trialDays && plan.trialDays > 0
                      ? 'Start Free Trial'
                      : 'Subscribe'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        You will be redirected to a secure checkout page to complete your payment.
      </p>
    </div>
  );
}
