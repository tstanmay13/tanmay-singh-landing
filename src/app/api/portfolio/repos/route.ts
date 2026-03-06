import { NextResponse } from "next/server";

interface GitHubRepo {
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  html_url: string;
  homepage: string | null;
  fork: boolean;
}

export interface RepoData {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  updatedAt: string;
  url: string;
  homepage: string | null;
}

const FALLBACK_REPOS: RepoData[] = [
  {
    name: "tanmay-singh-landing",
    description:
      "Personal portfolio with retro pixel-art aesthetic, browser games, and interactive experiences.",
    stars: 1,
    forks: 0,
    language: "TypeScript",
    topics: ["nextjs", "react", "portfolio"],
    updatedAt: new Date().toISOString(),
    url: "https://github.com/tstanmay13/tanmay-singh-landing",
    homepage: "https://tanmay-singh.com",
  },
];

export async function GET() {
  const token = process.env.GH_TOKEN_BASIC;

  try {
    const response = await fetch(
      "https://api.github.com/users/tstanmay13/repos?type=owner&sort=updated&per_page=100",
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/vnd.github.v3+json",
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const rawRepos: GitHubRepo[] = await response.json();

    const repos: RepoData[] = rawRepos
      .filter((repo) => !repo.fork)
      .map((repo) => ({
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        topics: repo.topics || [],
        updatedAt: repo.updated_at,
        url: repo.html_url,
        homepage: repo.homepage || null,
      }))
      .sort((a, b) => b.stars - a.stars);

    return NextResponse.json({ repos, fallback: false });
  } catch (error) {
    console.error("Failed to fetch GitHub repos:", error);
    return NextResponse.json({ repos: FALLBACK_REPOS, fallback: true });
  }
}
