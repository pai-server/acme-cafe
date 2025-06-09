import { NextResponse } from 'next/server';
import { getTeamForUser, getUser } from '@/lib/db/auth-queries';
import { getSubscriptionDetails } from '@/lib/payments/stripe';

export async function GET() {
  try {
    const [user, team] = await Promise.all([
      getUser(),
      getTeamForUser()
    ]);
    
    if (!team) {
      return NextResponse.json({ 
        hasSubscription: false,
        message: 'No team found' 
      });
    }

    const subscriptionDetails = await getSubscriptionDetails(team);
    
    if (!subscriptionDetails) {
      return NextResponse.json({ 
        hasSubscription: false,
        message: 'No active subscription found',
        team: {
          name: team.name,
          planName: team.planName || null
        },
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email
        } : null
      });
    }

    return NextResponse.json({
      hasSubscription: true,
      subscription: subscriptionDetails,
      team: {
        name: team.name,
        planName: team.planName
      },
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email
      } : null
    });

  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription details' },
      { status: 500 }
    );
  }
} 