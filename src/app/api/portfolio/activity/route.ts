import { NextResponse } from "next/server";

interface GitHubEvent {
  type: string;
  repo: {
    name: string;
  };
  payload: {
    commits?: Array<{
      message: string;
      sha: string;
      url: string;
    }>;
  };
  created_at: string;
}

export interface CommitData {
  message: string;
  repo: string;
  sha: string;
  date: string;
  url: string;
}

export async function GET() {
  const token = process.env.GH_TOKEN_BASIC;

  try {
    const response = await fetch(
      "https://api.github.com/users/tstanmay13/events?per_page=30",
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/vnd.github.v3+json",
        },
        next: { revalidate: 1800 },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const events: GitHubEvent[] = await response.json();

    const commits: CommitData[] = [];

    for (const event of events) {
      if (event.type !== "PushEvent" || !event.payload.commits) continue;

      for (const commit of event.payload.commits) {
        commits.push({
          message: commit.message,
          repo: event.repo.name.replace("tstanmay13/", ""),
          sha: commit.sha,
          date: event.created_at,
          url: `https://github.com/${event.repo.name}/commit/${commit.sha}`,
        });
      }

      if (commits.length >= 20) break;
    }

    return NextResponse.json({
      commits: commits.slice(0, 20),
      fallback: false,
    });
  } catch (error) {
    console.error("Failed to fetch GitHub activity:", error);
    return NextResponse.json({ commits: [], fallback: true });
  }
}
