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
  private: boolean;
  archived: boolean;
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
  isPrivate: boolean;
  archived: boolean;
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
    isPrivate: false,
    archived: false,
  },
];

function nextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    if (part.includes('rel="next"')) {
      const match = part.match(/<([^>]+)>/);
      return match?.[1] ?? null;
    }
  }
  return null;
}

async function fetchOwnerRepos(token: string | undefined): Promise<GitHubRepo[]> {
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: "application/vnd.github.v3+json",
  };
  let url: string | null = token
    ? "https://api.github.com/user/repos?type=owner&sort=updated&per_page=100"
    : "https://api.github.com/users/tstanmay13/repos?type=owner&sort=updated&per_page=100";

  const repos: GitHubRepo[] = [];
  while (url) {
    const response = await fetch(url, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }
    const page: GitHubRepo[] = await response.json();
    repos.push(...page);
    url = nextPageUrl(response.headers.get("link"));
  }
  return repos;
}

export async function GET() {
  const token = process.env.GH_TOKEN_BASIC;

  try {
    const rawRepos = await fetchOwnerRepos(token);

    const BLOCKED_REPOS = ["tanmay-irika-austin-demo"];
    // Coursework/scratch repos read as junk on a portfolio page.
    const JUNK_PATTERNS = /^(homework|hw)\d*|helloworld|hello-world|-final$|^test-|^commerce/i;

    // Hero count: everything you own, public and private. Forks are not yours.
    const projectCount = rawRepos.filter((repo) => !repo.fork).length;

    const repos: RepoData[] = rawRepos
      .filter(
        (repo) =>
          !repo.fork &&
          !repo.archived &&
          !repo.private &&
          !BLOCKED_REPOS.includes(repo.name) &&
          !JUNK_PATTERNS.test(repo.name) &&
          repo.description != null
      )
      .map((repo) => ({
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        topics: repo.topics || [],
        updatedAt: repo.updated_at,
        url: repo.private ? "#" : repo.html_url,
        homepage: repo.homepage || null,
        isPrivate: repo.private,
        archived: repo.archived,
      }))
      .sort((a, b) => b.stars - a.stars);

    return NextResponse.json({ repos, projectCount, fallback: false });
  } catch (error) {
    console.error("Failed to fetch GitHub repos:", error);
    return NextResponse.json({
      repos: FALLBACK_REPOS,
      projectCount: null,
      fallback: true,
    });
  }
}
