import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.GH_TOKEN_BASIC;
  
  if (!token) {
    return NextResponse.json(
      { error: 'GitHub token not configured' },
      { status: 500 }
    );
  }

  // First get all contribution years
  const yearsQuery = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionYears
        }
      }
    }
  `;

  // Then query for each year's contributions
  const contributionQuery = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
          }
        }
      }
    }
  `;

  try {
    // First, get all contribution years
    const yearsResponse = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: yearsQuery,
        variables: { username: 'tstanmay13' }
      })
    });

    if (!yearsResponse.ok) {
      throw new Error(`GitHub API responded with ${yearsResponse.status}`);
    }

    const yearsData = await yearsResponse.json();
    
    if (yearsData.errors) {
      console.error('GraphQL errors:', yearsData.errors);
      throw new Error('GraphQL query failed');
    }

    const years = yearsData.data.user.contributionsCollection.contributionYears;
    
    // Now fetch contributions for each year
    let totalContributions = 0;
    
    for (const year of years) {
      const from = `${year}-01-01T00:00:00Z`;
      const to = `${year}-12-31T23:59:59Z`;
      
      const yearResponse = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: contributionQuery,
          variables: { 
            username: 'tstanmay13',
            from,
            to
          }
        })
      });

      if (!yearResponse.ok) {
        console.error(`Failed to fetch year ${year}`);
        continue;
      }

      const yearData = await yearResponse.json();
      
      if (!yearData.errors && yearData.data?.user?.contributionsCollection?.contributionCalendar) {
        totalContributions += yearData.data.user.contributionsCollection.contributionCalendar.totalContributions;
      }
    }
    
    return NextResponse.json({
      totalContributions,
      years
    });
  } catch (error) {
    console.error('Failed to fetch GitHub contributions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contributions' },
      { status: 500 }
    );
  }
}