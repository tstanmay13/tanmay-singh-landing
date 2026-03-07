"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useGamePlay } from "@/components/GamePlayCounter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Question {
  code: string;
  answer: string;
  distractors: string[];
  category: QuizCategory;
  difficulty: Difficulty;
}

interface RoundResult {
  question: Question;
  chosen: string | null;
  correct: boolean;
  timeLeft: number;
}

type Screen = "menu" | "category-select" | "playing" | "results";
type Difficulty = "easy" | "medium" | "hard";
type QuizCategory =
  | "all"
  | "frontend"
  | "languages"
  | "databases"
  | "devops"
  | "patterns"
  | "cli"
  | "algorithms"
  | "cloud";

// ---------------------------------------------------------------------------
// Question bank (150+)
// ---------------------------------------------------------------------------

const ALL_QUESTIONS: Question[] = [
  // ========== FRONTEND ==========
  {
    code: `const [count, setCount] = useState(0);`,
    answer: "React",
    distractors: ["Vue", "Solid", "Svelte"],
    category: "frontend",
    difficulty: "easy",
  },
  {
    code: `<script setup>\nconst count = ref(0)\n</script>`,
    answer: "Vue",
    distractors: ["React", "Svelte", "Angular"],
    category: "frontend",
    difficulty: "easy",
  },
  {
    code: `{#each items as item}\n  <li>{item}</li>\n{/each}`,
    answer: "Svelte",
    distractors: ["Vue", "Angular", "React"],
    category: "frontend",
    difficulty: "easy",
  },
  {
    code: `@Component({\n  selector: 'app-root',\n  templateUrl: './app.component.html'\n})`,
    answer: "Angular",
    distractors: ["React", "Vue", "Nuxt"],
    category: "frontend",
    difficulty: "easy",
  },
  {
    code: `const [count, setCount] = createSignal(0);`,
    answer: "Solid",
    distractors: ["React", "Svelte", "Vue"],
    category: "frontend",
    difficulty: "medium",
  },
  {
    code: `export async function getServerSideProps(ctx) {\n  return { props: { data } };\n}`,
    answer: "Next.js",
    distractors: ["Nuxt", "Svelte", "React"],
    category: "frontend",
    difficulty: "easy",
  },
  {
    code: `<template>\n  <div>{{ msg }}</div>\n</template>`,
    answer: "Vue",
    distractors: ["Angular", "Svelte", "React"],
    category: "frontend",
    difficulty: "easy",
  },
  {
    code: `export function load({ params }) {\n  return { id: params.id };\n}`,
    answer: "SvelteKit",
    distractors: ["Next.js", "Nuxt", "React"],
    category: "frontend",
    difficulty: "medium",
  },
  {
    code: `<div *ngFor="let item of items">\n  {{ item.name }}\n</div>`,
    answer: "Angular",
    distractors: ["Vue", "React", "Svelte"],
    category: "frontend",
    difficulty: "easy",
  },
  {
    code: `export default defineNuxtConfig({\n  modules: ['@nuxtjs/tailwindcss']\n})`,
    answer: "Nuxt",
    distractors: ["Next.js", "Vue", "Svelte"],
    category: "frontend",
    difficulty: "medium",
  },
  {
    code: `createEffect(() => {\n  console.log(count());\n});`,
    answer: "Solid",
    distractors: ["React", "Svelte", "Vue"],
    category: "frontend",
    difficulty: "medium",
  },
  {
    code: `export const metadata: Metadata = {\n  title: 'My App',\n  description: 'App Router'\n};`,
    answer: "Next.js",
    distractors: ["Nuxt", "React", "Angular"],
    category: "frontend",
    difficulty: "easy",
  },
  {
    code: `<script>\n  let count = 0;\n  $: doubled = count * 2;\n</script>`,
    answer: "Svelte",
    distractors: ["Vue", "React", "Solid"],
    category: "frontend",
    difficulty: "easy",
  },
  {
    code: `@Injectable({ providedIn: 'root' })\nexport class DataService {}`,
    answer: "Angular",
    distractors: ["React", "Next.js", "Vue"],
    category: "frontend",
    difficulty: "medium",
  },
  {
    code: `const app = createApp(App);\napp.use(router);\napp.mount('#app');`,
    answer: "Vue",
    distractors: ["React", "Angular", "Solid"],
    category: "frontend",
    difficulty: "easy",
  },
  {
    code: `export async function generateStaticParams() {\n  const posts = await getPosts();\n  return posts.map(p => ({ slug: p.slug }));\n}`,
    answer: "Next.js",
    distractors: ["Nuxt", "Svelte", "React"],
    category: "frontend",
    difficulty: "medium",
  },
  {
    code: `<Show when={loggedIn()} fallback={<Login />}>\n  <Dashboard />\n</Show>`,
    answer: "Solid",
    distractors: ["React", "Vue", "Svelte"],
    category: "frontend",
    difficulty: "hard",
  },
  {
    code: `const { data } = await useFetch('/api/posts');`,
    answer: "Nuxt",
    distractors: ["Next.js", "React", "Svelte"],
    category: "frontend",
    difficulty: "medium",
  },
  {
    code: `import { component$, useStore } from '@builder.io/qwik';`,
    answer: "Qwik",
    distractors: ["React", "Solid", "Svelte"],
    category: "frontend",
    difficulty: "hard",
  },
  {
    code: `const islands = defineConfig({\n  integrations: [react()],\n});`,
    answer: "Astro",
    distractors: ["Vite", "Next.js", "Nuxt"],
    category: "frontend",
    difficulty: "hard",
  },
  // ========== LANGUAGES ==========
  {
    code: `fn main() {\n  println!("Hello, world!");\n}`,
    answer: "Rust",
    distractors: ["Go", "C++", "Swift"],
    category: "languages",
    difficulty: "easy",
  },
  {
    code: `func main() {\n  fmt.Println("Hello, world!")\n}`,
    answer: "Go",
    distractors: ["Rust", "Swift", "Kotlin"],
    category: "languages",
    difficulty: "easy",
  },
  {
    code: `def greet(name: str) -> str:\n    return f"Hello, {name}"`,
    answer: "Python",
    distractors: ["Ruby", "Julia", "Perl"],
    category: "languages",
    difficulty: "easy",
  },
  {
    code: `fun main() {\n  println("Hello, world!")\n}`,
    answer: "Kotlin",
    distractors: ["Scala", "Swift", "Go"],
    category: "languages",
    difficulty: "easy",
  },
  {
    code: `public static void main(String[] args) {\n  System.out.println("Hello");\n}`,
    answer: "Java",
    distractors: ["C#", "Kotlin", "Scala"],
    category: "languages",
    difficulty: "easy",
  },
  {
    code: `static void Main(string[] args) {\n  Console.WriteLine("Hello");\n}`,
    answer: "C#",
    distractors: ["Java", "Kotlin", "C++"],
    category: "languages",
    difficulty: "easy",
  },
  {
    code: `puts "Hello, world!"`,
    answer: "Ruby",
    distractors: ["Python", "Perl", "Lua"],
    category: "languages",
    difficulty: "easy",
  },
  {
    code: `#include <iostream>\nint main() {\n  std::cout << "Hello";\n}`,
    answer: "C++",
    distractors: ["C", "Rust", "Java"],
    category: "languages",
    difficulty: "easy",
  },
  {
    code: `let greeting: String = "Hello"\nprint(greeting)`,
    answer: "Swift",
    distractors: ["Kotlin", "Rust", "Go"],
    category: "languages",
    difficulty: "easy",
  },
  {
    code: `defmodule Greeter do\n  def hello(name), do: "Hello, #{name}"\nend`,
    answer: "Elixir",
    distractors: ["Ruby", "Erlang", "Haskell"],
    category: "languages",
    difficulty: "medium",
  },
  {
    code: `main :: IO ()\nmain = putStrLn "Hello"`,
    answer: "Haskell",
    distractors: ["Elixir", "OCaml", "Erlang"],
    category: "languages",
    difficulty: "hard",
  },
  {
    code: `val result = list.filter(_ > 0).map(_ * 2)`,
    answer: "Scala",
    distractors: ["Kotlin", "Haskell", "Ruby"],
    category: "languages",
    difficulty: "medium",
  },
  {
    code: `fn add(a: i32, b: i32) -> i32 {\n  a + b\n}`,
    answer: "Rust",
    distractors: ["Go", "Swift", "C"],
    category: "languages",
    difficulty: "easy",
  },
  {
    code: `async def fetch_data(url: str):\n    async with aiohttp.ClientSession() as session:\n        return await session.get(url)`,
    answer: "Python",
    distractors: ["JavaScript", "Ruby", "Go"],
    category: "languages",
    difficulty: "medium",
  },
  {
    code: `match value {\n  Some(x) => println!("{x}"),\n  None => println!("nothing"),\n}`,
    answer: "Rust",
    distractors: ["Swift", "Scala", "Kotlin"],
    category: "languages",
    difficulty: "medium",
  },
  {
    code: `struct User {\n  Name string\n  Age  int\n}`,
    answer: "Go",
    distractors: ["Rust", "C", "Swift"],
    category: "languages",
    difficulty: "easy",
  },
  {
    code: `extension Array where Element: Comparable {\n  func sorted() -> [Element] { ... }\n}`,
    answer: "Swift",
    distractors: ["Kotlin", "Rust", "C#"],
    category: "languages",
    difficulty: "medium",
  },
  {
    code: `interface Repository<T> {\n  fun findById(id: Long): T?\n  fun save(entity: T): T\n}`,
    answer: "Kotlin",
    distractors: ["Java", "TypeScript", "C#"],
    category: "languages",
    difficulty: "medium",
  },
  {
    code: `SELECT name FROM users WHERE age > 21\nORDER BY name ASC;`,
    answer: "SQL",
    distractors: ["GraphQL", "Python", "Ruby"],
    category: "languages",
    difficulty: "easy",
  },
  {
    code: `let mut v: Vec<i32> = Vec::new();\nv.push(42);\nv.push(99);`,
    answer: "Rust",
    distractors: ["C++", "Go", "Swift"],
    category: "languages",
    difficulty: "medium",
  },
  // ========== DATABASES ==========
  {
    code: `db.users.find({ age: { $gt: 21 } })`,
    answer: "MongoDB",
    distractors: ["PostgreSQL", "Redis", "Cassandra"],
    category: "databases",
    difficulty: "easy",
  },
  {
    code: `SET user:1:name "Alice"\nGET user:1:name`,
    answer: "Redis",
    distractors: ["MongoDB", "Memcached", "DynamoDB"],
    category: "databases",
    difficulty: "easy",
  },
  {
    code: `CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  name TEXT NOT NULL\n);`,
    answer: "PostgreSQL",
    distractors: ["MySQL", "SQLite", "SQL Server"],
    category: "databases",
    difficulty: "medium",
  },
  {
    code: `CREATE TABLE users (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  name VARCHAR(255)\n) ENGINE=InnoDB;`,
    answer: "MySQL",
    distractors: ["PostgreSQL", "MariaDB", "SQLite"],
    category: "databases",
    difficulty: "medium",
  },
  {
    code: `db.collection('users').insertOne({\n  name: 'Alice',\n  tags: ['admin', 'dev']\n});`,
    answer: "MongoDB",
    distractors: ["CouchDB", "Firebase", "DynamoDB"],
    category: "databases",
    difficulty: "easy",
  },
  {
    code: `MATCH (u:User)-[:FOLLOWS]->(f:User)\nRETURN u.name, f.name`,
    answer: "Neo4j",
    distractors: ["MongoDB", "PostgreSQL", "Redis"],
    category: "databases",
    difficulty: "medium",
  },
  {
    code: `HSET user:1 name "Alice" age 30\nHGETALL user:1`,
    answer: "Redis",
    distractors: ["MongoDB", "Memcached", "DynamoDB"],
    category: "databases",
    difficulty: "medium",
  },
  {
    code: `SELECT name, age FROM users\nWHERE age > 21\nALLOW FILTERING;`,
    answer: "Cassandra",
    distractors: ["PostgreSQL", "MySQL", "MongoDB"],
    category: "databases",
    difficulty: "hard",
  },
  {
    code: `const { data, error } = await supabase\n  .from('users')\n  .select('name, email')\n  .eq('active', true);`,
    answer: "Supabase",
    distractors: ["Firebase", "Prisma", "MongoDB"],
    category: "databases",
    difficulty: "medium",
  },
  {
    code: `const user = await prisma.user.findUnique({\n  where: { email: 'alice@test.com' },\n  include: { posts: true }\n});`,
    answer: "Prisma",
    distractors: ["TypeORM", "Sequelize", "Drizzle"],
    category: "databases",
    difficulty: "medium",
  },
  {
    code: `firestore\n  .collection('users')\n  .where('age', '>', 21)\n  .orderBy('name')\n  .get();`,
    answer: "Firebase",
    distractors: ["Supabase", "MongoDB", "DynamoDB"],
    category: "databases",
    difficulty: "easy",
  },
  {
    code: `const result = await db\n  .select()\n  .from(users)\n  .where(eq(users.active, true));`,
    answer: "Drizzle",
    distractors: ["Prisma", "Knex", "TypeORM"],
    category: "databases",
    difficulty: "hard",
  },
  {
    code: `SELECT jsonb_agg(row_to_json(t))\nFROM (SELECT * FROM users) t;`,
    answer: "PostgreSQL",
    distractors: ["MySQL", "SQLite", "SQL Server"],
    category: "databases",
    difficulty: "hard",
  },
  {
    code: `FT.SEARCH idx:users "@name:Alice @age:[25 35]"`,
    answer: "Redis",
    distractors: ["Elasticsearch", "MongoDB", "Algolia"],
    category: "databases",
    difficulty: "hard",
  },
  // ========== DEVOPS ==========
  {
    code: `FROM node:18-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD ["node", "server.js"]`,
    answer: "Docker",
    distractors: ["Podman", "Vagrant", "Ansible"],
    category: "devops",
    difficulty: "easy",
  },
  {
    code: `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: nginx-deployment\nspec:\n  replicas: 3`,
    answer: "Kubernetes",
    distractors: ["Docker Compose", "Terraform", "Ansible"],
    category: "devops",
    difficulty: "easy",
  },
  {
    code: `resource "aws_instance" "web" {\n  ami           = "ami-0c55b159"\n  instance_type = "t2.micro"\n}`,
    answer: "Terraform",
    distractors: ["CloudFormation", "Pulumi", "Ansible"],
    category: "devops",
    difficulty: "easy",
  },
  {
    code: `- hosts: webservers\n  tasks:\n    - name: Install nginx\n      apt:\n        name: nginx\n        state: present`,
    answer: "Ansible",
    distractors: ["Chef", "Puppet", "Terraform"],
    category: "devops",
    difficulty: "easy",
  },
  {
    code: `services:\n  web:\n    build: .\n    ports:\n      - "3000:3000"\n  db:\n    image: postgres:15`,
    answer: "Docker Compose",
    distractors: ["Kubernetes", "Docker", "Podman"],
    category: "devops",
    difficulty: "easy",
  },
  {
    code: `name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4`,
    answer: "GitHub Actions",
    distractors: ["GitLab CI", "Jenkins", "CircleCI"],
    category: "devops",
    difficulty: "easy",
  },
  {
    code: `stages:\n  - build\n  - test\n  - deploy\nbuild-job:\n  stage: build\n  script:\n    - npm ci`,
    answer: "GitLab CI",
    distractors: ["GitHub Actions", "Jenkins", "CircleCI"],
    category: "devops",
    difficulty: "medium",
  },
  {
    code: `pipeline {\n  agent any\n  stages {\n    stage('Build') {\n      steps {\n        sh 'npm install'\n      }\n    }\n  }\n}`,
    answer: "Jenkins",
    distractors: ["GitHub Actions", "GitLab CI", "Travis CI"],
    category: "devops",
    difficulty: "medium",
  },
  {
    code: `version: 2.1\njobs:\n  build:\n    docker:\n      - image: cimg/node:18.0\n    steps:\n      - checkout`,
    answer: "CircleCI",
    distractors: ["GitHub Actions", "Jenkins", "Travis CI"],
    category: "devops",
    difficulty: "medium",
  },
  {
    code: `helm install my-release bitnami/nginx\nhelm upgrade my-release bitnami/nginx`,
    answer: "Helm",
    distractors: ["Kubernetes", "Docker", "Terraform"],
    category: "devops",
    difficulty: "medium",
  },
  {
    code: `provider "aws" {\n  region = "us-west-2"\n}\n\nterraform {\n  backend "s3" {}\n}`,
    answer: "Terraform",
    distractors: ["Pulumi", "AWS CDK", "CloudFormation"],
    category: "devops",
    difficulty: "easy",
  },
  {
    code: `const bucket = new s3.Bucket("my-bucket", {\n  website: {\n    indexDocument: "index.html",\n  },\n});`,
    answer: "Pulumi",
    distractors: ["AWS CDK", "Terraform", "CloudFormation"],
    category: "devops",
    difficulty: "hard",
  },
  {
    code: `apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  annotations:\n    nginx.ingress.kubernetes.io/rewrite-target: /`,
    answer: "Kubernetes",
    distractors: ["Docker", "Terraform", "Nginx"],
    category: "devops",
    difficulty: "medium",
  },
  {
    code: `server {\n  listen 80;\n  server_name example.com;\n  location / {\n    proxy_pass http://localhost:3000;\n  }\n}`,
    answer: "Nginx",
    distractors: ["Apache", "Caddy", "HAProxy"],
    category: "devops",
    difficulty: "easy",
  },
  // ========== PATTERNS ==========
  {
    code: `class Singleton {\n  private static instance: Singleton;\n  private constructor() {}\n  static getInstance() {\n    if (!this.instance) this.instance = new Singleton();\n    return this.instance;\n  }\n}`,
    answer: "Singleton",
    distractors: ["Factory", "Builder", "Prototype"],
    category: "patterns",
    difficulty: "easy",
  },
  {
    code: `interface Shape {\n  draw(): void;\n}\nclass ShapeFactory {\n  create(type: string): Shape { ... }\n}`,
    answer: "Factory",
    distractors: ["Builder", "Singleton", "Strategy"],
    category: "patterns",
    difficulty: "easy",
  },
  {
    code: `class EventEmitter {\n  listeners = new Map();\n  on(event, fn) { ... }\n  emit(event, data) {\n    this.listeners.get(event)?.forEach(fn => fn(data));\n  }\n}`,
    answer: "Observer",
    distractors: ["Mediator", "Strategy", "Command"],
    category: "patterns",
    difficulty: "easy",
  },
  {
    code: `class UserBuilder {\n  setName(n) { this.name = n; return this; }\n  setAge(a) { this.age = a; return this; }\n  build() { return new User(this); }\n}`,
    answer: "Builder",
    distractors: ["Factory", "Prototype", "Singleton"],
    category: "patterns",
    difficulty: "easy",
  },
  {
    code: `interface SortStrategy {\n  sort(data: number[]): number[];\n}\nclass Sorter {\n  constructor(private strategy: SortStrategy) {}\n  execute(data: number[]) { return this.strategy.sort(data); }\n}`,
    answer: "Strategy",
    distractors: ["Observer", "Command", "Template"],
    category: "patterns",
    difficulty: "medium",
  },
  {
    code: `class LoggingProxy {\n  constructor(private target) {}\n  request() {\n    console.log('before');\n    this.target.request();\n    console.log('after');\n  }\n}`,
    answer: "Proxy",
    distractors: ["Decorator", "Adapter", "Facade"],
    category: "patterns",
    difficulty: "medium",
  },
  {
    code: `class OldApi {\n  specificRequest() {}\n}\nclass Adapter implements NewApi {\n  constructor(private old: OldApi) {}\n  request() { this.old.specificRequest(); }\n}`,
    answer: "Adapter",
    distractors: ["Proxy", "Bridge", "Decorator"],
    category: "patterns",
    difficulty: "medium",
  },
  {
    code: `function withLogging(Component) {\n  return (props) => {\n    console.log('Rendering:', Component.name);\n    return <Component {...props} />;\n  };\n}`,
    answer: "Decorator",
    distractors: ["Proxy", "Adapter", "Observer"],
    category: "patterns",
    difficulty: "medium",
  },
  {
    code: `class Command {\n  execute() {}\n  undo() {}\n}\nclass Invoker {\n  history: Command[] = [];\n  run(cmd) { cmd.execute(); this.history.push(cmd); }\n}`,
    answer: "Command",
    distractors: ["Strategy", "Observer", "Memento"],
    category: "patterns",
    difficulty: "medium",
  },
  {
    code: `class SubSystem { operation() {} }\nclass Facade {\n  constructor(private sub: SubSystem) {}\n  doEverything() { this.sub.operation(); }\n}`,
    answer: "Facade",
    distractors: ["Proxy", "Adapter", "Bridge"],
    category: "patterns",
    difficulty: "easy",
  },
  {
    code: `abstract class Animal {\n  abstract makeSound(): string;\n  sleep() { return 'zzz'; }\n}\nclass Dog extends Animal {\n  makeSound() { return 'Woof!'; }\n}`,
    answer: "Template Method",
    distractors: ["Strategy", "Factory", "Abstract Factory"],
    category: "patterns",
    difficulty: "hard",
  },
  // ========== CLI ==========
  {
    code: `git rebase -i HEAD~3`,
    answer: "Git",
    distractors: ["Mercurial", "SVN", "Bazaar"],
    category: "cli",
    difficulty: "easy",
  },
  {
    code: `curl -X POST -H "Content-Type: application/json"\n  -d '{"key":"value"}' https://api.example.com`,
    answer: "curl",
    distractors: ["wget", "httpie", "fetch"],
    category: "cli",
    difficulty: "easy",
  },
  {
    code: `:%s/foo/bar/g\n:wq`,
    answer: "Vim",
    distractors: ["Emacs", "Nano", "Sed"],
    category: "cli",
    difficulty: "easy",
  },
  {
    code: `awk '{print $1, $3}' file.txt | sort -k2 -n`,
    answer: "AWK",
    distractors: ["Sed", "Grep", "Perl"],
    category: "cli",
    difficulty: "medium",
  },
  {
    code: `sed -i 's/old/new/g' *.txt`,
    answer: "Sed",
    distractors: ["AWK", "Grep", "Perl"],
    category: "cli",
    difficulty: "medium",
  },
  {
    code: `find . -name "*.log" -mtime +30 -delete`,
    answer: "Find",
    distractors: ["Grep", "Locate", "Which"],
    category: "cli",
    difficulty: "medium",
  },
  {
    code: `ssh -L 8080:localhost:3000 user@remote-server`,
    answer: "SSH",
    distractors: ["Telnet", "Netcat", "curl"],
    category: "cli",
    difficulty: "medium",
  },
  {
    code: `docker exec -it container_name /bin/bash`,
    answer: "Docker",
    distractors: ["Podman", "LXC", "Vagrant"],
    category: "cli",
    difficulty: "easy",
  },
  {
    code: `git log --oneline --graph --all --decorate`,
    answer: "Git",
    distractors: ["Mercurial", "SVN", "TFS"],
    category: "cli",
    difficulty: "easy",
  },
  {
    code: `grep -rn "TODO" --include="*.ts" .`,
    answer: "Grep",
    distractors: ["Find", "AWK", "Ripgrep"],
    category: "cli",
    difficulty: "easy",
  },
  {
    code: `tmux new -s dev\ntmux split-window -h`,
    answer: "tmux",
    distractors: ["Screen", "Byobu", "Terminator"],
    category: "cli",
    difficulty: "medium",
  },
  {
    code: `jq '.data[] | select(.active == true) | .name' response.json`,
    answer: "jq",
    distractors: ["yq", "fx", "Grep"],
    category: "cli",
    difficulty: "medium",
  },
  // ========== ALGORITHMS ==========
  {
    code: `function binarySearch(arr, target) {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (arr[mid] === target) return mid;\n    arr[mid] < target ? lo = mid + 1 : hi = mid - 1;\n  }\n  return -1;\n}`,
    answer: "Binary Search",
    distractors: ["Linear Search", "Jump Search", "Interpolation Search"],
    category: "algorithms",
    difficulty: "easy",
  },
  {
    code: `function sort(arr) {\n  if (arr.length <= 1) return arr;\n  const pivot = arr[0];\n  const left = arr.slice(1).filter(x => x <= pivot);\n  const right = arr.slice(1).filter(x => x > pivot);\n  return [...sort(left), pivot, ...sort(right)];\n}`,
    answer: "Quick Sort",
    distractors: ["Merge Sort", "Heap Sort", "Insertion Sort"],
    category: "algorithms",
    difficulty: "easy",
  },
  {
    code: `function sort(arr) {\n  if (arr.length <= 1) return arr;\n  const mid = Math.floor(arr.length / 2);\n  return merge(sort(arr.slice(0, mid)), sort(arr.slice(mid)));\n}`,
    answer: "Merge Sort",
    distractors: ["Quick Sort", "Heap Sort", "Tim Sort"],
    category: "algorithms",
    difficulty: "easy",
  },
  {
    code: `const visited = new Set();\nconst queue = [start];\nwhile (queue.length) {\n  const node = queue.shift();\n  if (visited.has(node)) continue;\n  visited.add(node);\n  queue.push(...graph[node]);\n}`,
    answer: "BFS",
    distractors: ["DFS", "Dijkstra", "A*"],
    category: "algorithms",
    difficulty: "easy",
  },
  {
    code: `function dfs(node, visited = new Set()) {\n  if (visited.has(node)) return;\n  visited.add(node);\n  for (const neighbor of graph[node]) {\n    dfs(neighbor, visited);\n  }\n}`,
    answer: "DFS",
    distractors: ["BFS", "Topological Sort", "Dijkstra"],
    category: "algorithms",
    difficulty: "easy",
  },
  {
    code: `const dist = Array(n).fill(Infinity);\ndist[src] = 0;\nconst pq = [[0, src]];\nwhile (pq.length) {\n  const [d, u] = pq.shift();\n  for (const [v, w] of adj[u]) {\n    if (d + w < dist[v]) {\n      dist[v] = d + w;\n      pq.push([dist[v], v]);\n    }\n  }\n}`,
    answer: "Dijkstra",
    distractors: ["Bellman-Ford", "BFS", "Floyd-Warshall"],
    category: "algorithms",
    difficulty: "medium",
  },
  {
    code: `const dp = Array(n + 1).fill(0);\nfor (let i = 1; i <= n; i++) {\n  dp[i] = dp[i - 1] + dp[i - 2];\n}`,
    answer: "Dynamic Programming",
    distractors: ["Greedy", "Divide & Conquer", "Memoization"],
    category: "algorithms",
    difficulty: "easy",
  },
  {
    code: `function partition(arr, lo, hi) {\n  const pivot = arr[hi];\n  let i = lo - 1;\n  for (let j = lo; j < hi; j++) {\n    if (arr[j] <= pivot) {\n      i++;\n      [arr[i], arr[j]] = [arr[j], arr[i]];\n    }\n  }\n  [arr[i+1], arr[hi]] = [arr[hi], arr[i+1]];\n  return i + 1;\n}`,
    answer: "Quick Sort",
    distractors: ["Merge Sort", "Heap Sort", "Selection Sort"],
    category: "algorithms",
    difficulty: "medium",
  },
  {
    code: `for (let k = 0; k < n; k++)\n  for (let i = 0; i < n; i++)\n    for (let j = 0; j < n; j++)\n      dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);`,
    answer: "Floyd-Warshall",
    distractors: ["Dijkstra", "Bellman-Ford", "Prim's"],
    category: "algorithms",
    difficulty: "hard",
  },
  {
    code: `function knapsack(W, wt, val, n) {\n  const dp = Array.from({length: n+1}, () => Array(W+1).fill(0));\n  for (let i = 1; i <= n; i++)\n    for (let w = 0; w <= W; w++)\n      dp[i][w] = wt[i-1] <= w\n        ? Math.max(val[i-1] + dp[i-1][w-wt[i-1]], dp[i-1][w])\n        : dp[i-1][w];\n  return dp[n][W];\n}`,
    answer: "Dynamic Programming",
    distractors: ["Greedy", "Backtracking", "Branch & Bound"],
    category: "algorithms",
    difficulty: "hard",
  },
  {
    code: `function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) return [map.get(complement), i];\n    map.set(nums[i], i);\n  }\n}`,
    answer: "Hash Map",
    distractors: ["Two Pointers", "Binary Search", "Brute Force"],
    category: "algorithms",
    difficulty: "easy",
  },
  {
    code: `let left = 0, right = arr.length - 1;\nwhile (left < right) {\n  const sum = arr[left] + arr[right];\n  if (sum === target) return [left, right];\n  sum < target ? left++ : right--;\n}`,
    answer: "Two Pointers",
    distractors: ["Binary Search", "Sliding Window", "Hash Map"],
    category: "algorithms",
    difficulty: "medium",
  },
  // ========== CLOUD ==========
  {
    code: `const s3 = new AWS.S3();\nawait s3.putObject({\n  Bucket: 'my-bucket',\n  Key: 'file.txt',\n  Body: 'Hello'\n}).promise();`,
    answer: "AWS S3",
    distractors: ["GCS", "Azure Blob", "Cloudflare R2"],
    category: "cloud",
    difficulty: "easy",
  },
  {
    code: `const lambda = new AWS.Lambda();\nawait lambda.invoke({\n  FunctionName: 'myFunction',\n  Payload: JSON.stringify({ key: 'value' })\n}).promise();`,
    answer: "AWS Lambda",
    distractors: ["Cloud Functions", "Azure Functions", "Vercel"],
    category: "cloud",
    difficulty: "easy",
  },
  {
    code: `gcloud compute instances create my-vm \\\n  --machine-type=e2-medium \\\n  --zone=us-central1-a`,
    answer: "Google Cloud",
    distractors: ["AWS", "Azure", "DigitalOcean"],
    category: "cloud",
    difficulty: "easy",
  },
  {
    code: `az group create --name myResourceGroup \\\n  --location eastus`,
    answer: "Azure",
    distractors: ["AWS", "Google Cloud", "IBM Cloud"],
    category: "cloud",
    difficulty: "easy",
  },
  {
    code: `AWSTemplateFormatVersion: "2010-09-09"\nResources:\n  MyBucket:\n    Type: AWS::S3::Bucket`,
    answer: "CloudFormation",
    distractors: ["Terraform", "Pulumi", "AWS CDK"],
    category: "cloud",
    difficulty: "medium",
  },
  {
    code: `const stack = new cdk.Stack(app, 'MyStack');\nnew s3.Bucket(stack, 'MyBucket', {\n  versioned: true,\n  removalPolicy: cdk.RemovalPolicy.DESTROY\n});`,
    answer: "AWS CDK",
    distractors: ["Pulumi", "Terraform", "CloudFormation"],
    category: "cloud",
    difficulty: "medium",
  },
  {
    code: `export default {\n  async fetch(request, env) {\n    return new Response("Hello from the edge!");\n  }\n}`,
    answer: "Cloudflare Workers",
    distractors: ["AWS Lambda", "Vercel Edge", "Deno Deploy"],
    category: "cloud",
    difficulty: "medium",
  },
  {
    code: `Deno.serve((_req) => {\n  return new Response("Hello!");\n});`,
    answer: "Deno",
    distractors: ["Bun", "Node.js", "Cloudflare Workers"],
    category: "cloud",
    difficulty: "medium",
  },
  {
    code: `const app = new Hono();\napp.get('/api', (c) => c.json({ hello: 'world' }));\nexport default app;`,
    answer: "Hono",
    distractors: ["Express", "Fastify", "Koa"],
    category: "cloud",
    difficulty: "hard",
  },
  {
    code: `const server = Bun.serve({\n  port: 3000,\n  fetch(req) {\n    return new Response("Bun!");\n  },\n});`,
    answer: "Bun",
    distractors: ["Deno", "Node.js", "Cloudflare Workers"],
    category: "cloud",
    difficulty: "medium",
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_INFO: Record<QuizCategory, { label: string; icon: string; color: string }> = {
  all: { label: "ALL TOPICS", icon: "//", color: "var(--color-accent)" },
  frontend: { label: "FRONTEND", icon: "</>", color: "var(--color-cyan)" },
  languages: { label: "LANGUAGES", icon: "fn()", color: "var(--color-purple)" },
  databases: { label: "DATABASES", icon: "DB", color: "var(--color-orange)" },
  devops: { label: "DEVOPS", icon: "CI", color: "var(--color-blue)" },
  patterns: { label: "PATTERNS", icon: "OOP", color: "var(--color-pink)" },
  cli: { label: "CLI TOOLS", icon: "$_", color: "var(--color-accent)" },
  algorithms: { label: "ALGORITHMS", icon: "O(n)", color: "var(--color-red)" },
  cloud: { label: "CLOUD", icon: ">>", color: "var(--color-cyan)" },
};

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; timer: number; color: string; points: number }> = {
  easy: { label: "EASY", timer: 8, color: "var(--color-accent)", points: 100 },
  medium: { label: "MEDIUM", timer: 6, color: "var(--color-orange)", points: 150 },
  hard: { label: "HARD", timer: 4, color: "var(--color-red)", points: 200 },
};

const ROUNDS_PER_GAME = 15;
const LS_KEY = "code-quiz-best";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRounds(category: QuizCategory, difficulty: Difficulty): Question[] {
  let pool = ALL_QUESTIONS;
  if (category !== "all") {
    pool = pool.filter((q) => q.category === category);
  }
  // Bias towards selected difficulty but include some others
  const exact = pool.filter((q) => q.difficulty === difficulty);
  const others = pool.filter((q) => q.difficulty !== difficulty);
  const combined = [...shuffle(exact), ...shuffle(others)];
  return combined.slice(0, ROUNDS_PER_GAME);
}

function buildOptions(q: Question): string[] {
  return shuffle([q.answer, ...q.distractors]);
}

function highlight(code: string): string {
  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // strings
  html = html.replace(
    /(["'`])(.*?)(\1)/g,
    '<span style="color:var(--color-accent)">$1$2$3</span>'
  );
  // keywords
  const kw = /\b(const|let|var|function|return|export|default|async|await|import|from|new|class|if|else|this|interface|type|struct|fn|func|def|pub|mod|use|match|impl|trait|enum|SELECT|FROM|WHERE|CREATE|TABLE|INSERT|UPDATE|DELETE|ORDER|BY|GROUP|SET|GET|MATCH|RETURN|kind|apiVersion|spec|metadata|hosts|tasks|name|stages|jobs|runs-on|steps|services|server|listen|location)\b/g;
  html = html.replace(
    kw,
    '<span style="color:var(--color-purple)">$1</span>'
  );
  // decorators
  html = html.replace(
    /(@\w+)/g,
    '<span style="color:var(--color-orange)">$1</span>'
  );
  // brackets
  html = html.replace(
    /([{}()[\]])/g,
    '<span style="color:var(--color-cyan)">$1</span>'
  );
  // arrows
  html = html.replace(
    /=&gt;/g,
    '<span style="color:var(--color-pink)">=&gt;</span>'
  );
  // comments
  html = html.replace(
    /(\/\/.*?)$/gm,
    '<span style="color:var(--color-text-muted)">$1</span>'
  );
  html = html.replace(
    /(#.*?)$/gm,
    '<span style="color:var(--color-text-muted)">$1</span>'
  );

  return html;
}

function getRating(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: "LEGENDARY HACKER", color: "var(--color-accent)" };
  if (pct >= 75) return { label: "SENIOR ENGINEER", color: "var(--color-cyan)" };
  if (pct >= 60) return { label: "MID-LEVEL DEV", color: "var(--color-orange)" };
  if (pct >= 40) return { label: "JUNIOR DEV", color: "var(--color-pink)" };
  if (pct >= 20) return { label: "INTERN", color: "var(--color-red)" };
  return { label: "STACK OVERFLOW NEEDED", color: "var(--color-red)" };
}

function loadBest(): Record<string, number> {
  try {
    const stored = localStorage.getItem(LS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveBest(key: string, score: number) {
  try {
    const bests = loadBest();
    if (!bests[key] || score > bests[key]) {
      bests[key] = score;
      localStorage.setItem(LS_KEY, JSON.stringify(bests));
    }
  } catch { /* noop */ }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CodeQuizPage() {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("medium");

  // game state
  const [rounds, setRounds] = useState<Question[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [personalBests, setPersonalBests] = useState<Record<string, number>>({});

  // timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answeredRef = useRef(false);
  const { recordPlay } = useGamePlay("code-quiz");

  // mount guard
  useEffect(() => {
    setMounted(true);
    setPersonalBests(loadBest());
  }, []);

  // ------- timer logic -------
  const timerSeconds = DIFFICULTY_CONFIG[selectedDifficulty].timer;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(() => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    stopTimer();

    const question = rounds[roundIndex];
    const result: RoundResult = { question, chosen: null, correct: false, timeLeft: 0 };
    setStreak(0);
    setResults((prev) => [...prev, result]);

    setTimeout(() => {
      if (roundIndex + 1 < ROUNDS_PER_GAME) {
        advanceRound(roundIndex + 1);
      } else {
        finishGame();
      }
    }, 1500);
  }, [rounds, roundIndex, stopTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  const startTimer = useCallback(() => {
    setTimeLeft(timerSeconds);
    answeredRef.current = false;
    stopTimer();

    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, timerSeconds - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        handleTimeout();
      }
    }, 50);
  }, [stopTimer, handleTimeout, timerSeconds]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  // ------- game flow -------
  const startGame = () => {
    recordPlay();
    const picked = pickRounds(selectedCategory, selectedDifficulty);
    setRounds(picked);
    setRoundIndex(0);
    setOptions(buildOptions(picked[0]));
    setResults([]);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setScreen("playing");
  };

  useEffect(() => {
    if (screen === "playing" && rounds.length > 0) {
      startTimer();
    }
  }, [screen, roundIndex, rounds.length, startTimer]);

  const advanceRound = (next: number) => {
    setRoundIndex(next);
    setOptions(buildOptions(rounds[next]));
  };

  const finishGame = () => {
    const key = `${selectedCategory}-${selectedDifficulty}`;
    saveBest(key, score);
    setPersonalBests(loadBest());
    setScreen("results");
  };

  const handleAnswer = (choice: string) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    stopTimer();

    const question = rounds[roundIndex];
    const correct = choice === question.answer;
    const result: RoundResult = { question, chosen: choice, correct, timeLeft };
    const pointsBase = DIFFICULTY_CONFIG[selectedDifficulty].points;

    if (correct) {
      const streakBonus = streak * 15;
      const timeBonus = Math.round(timeLeft * 10);
      setScore((s) => s + pointsBase + streakBonus + timeBonus);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }

    setResults((prev) => [...prev, result]);

    setTimeout(() => {
      if (roundIndex + 1 < ROUNDS_PER_GAME) {
        advanceRound(roundIndex + 1);
      } else {
        finishGame();
      }
    }, 1200);
  };

  // ------- rendering helpers -------
  const currentQuestion = rounds[roundIndex] as Question | undefined;
  const lastResult = results[results.length - 1] as RoundResult | undefined;
  const showingFeedback = answeredRef.current && lastResult && roundIndex === results.length - 1;

  if (!mounted) return null;

  // ======================== MENU ========================
  if (screen === "menu") {
    const questionCounts = Object.entries(CATEGORY_INFO).map(([key]) => ({
      key: key as QuizCategory,
      count:
        key === "all"
          ? ALL_QUESTIONS.length
          : ALL_QUESTIONS.filter((q) => q.category === key).length,
    }));

    return (
      <div
        className="min-h-screen relative flex flex-col items-center justify-center px-4"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

        <div className="relative z-10 text-center max-w-lg w-full">
          <Link
            href="/games"
            className="pixel-text text-xs inline-block mb-10 transition-colors duration-200"
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--color-accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--color-text-secondary)")
            }
          >
            &lt; BACK TO GAMES
          </Link>

          <div className="text-5xl mb-6" style={{ color: "var(--color-accent)" }}>{"{ }"}</div>

          <h1
            className="pixel-text text-2xl sm:text-3xl mb-3"
            style={{ color: "var(--color-accent)" }}
          >
            CODE QUIZ
          </h1>

          <p
            className="mono-text text-sm mb-8 leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {ALL_QUESTIONS.length}+ questions across {Object.keys(CATEGORY_INFO).length - 1} categories.
            Identify the language, framework, tool, or pattern from code snippets.
          </p>

          {/* Category selection */}
          <div className="pixel-card p-5 mb-6 text-left">
            <p
              className="pixel-text text-[10px] mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              SELECT CATEGORY
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {questionCounts.map(({ key, count }) => {
                const info = CATEGORY_INFO[key];
                const isActive = selectedCategory === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className="pixel-text text-[9px] px-2 py-2 border-2 transition-all duration-150 cursor-pointer text-left"
                    style={{
                      borderColor: isActive ? info.color : "var(--color-border)",
                      background: isActive ? info.color : "var(--color-bg-card)",
                      color: isActive ? "var(--color-bg)" : "var(--color-text-secondary)",
                    }}
                  >
                    <span className="block">{info.icon} {info.label}</span>
                    <span
                      className="block mt-1"
                      style={{
                        fontSize: "7px",
                        color: isActive ? "var(--color-bg)" : "var(--color-text-muted)",
                      }}
                    >
                      {count} Q&apos;S
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty selection */}
          <div className="pixel-card p-5 mb-6 text-left">
            <p
              className="pixel-text text-[10px] mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              SELECT DIFFICULTY
            </p>
            <div className="flex gap-3">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
                const cfg = DIFFICULTY_CONFIG[d];
                const isActive = selectedDifficulty === d;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDifficulty(d)}
                    className="pixel-text text-[10px] px-4 py-3 border-2 transition-all duration-150 cursor-pointer flex-1"
                    style={{
                      borderColor: isActive ? cfg.color : "var(--color-border)",
                      background: isActive ? cfg.color : "var(--color-bg-card)",
                      color: isActive ? "var(--color-bg)" : "var(--color-text-secondary)",
                    }}
                  >
                    <span className="block">{cfg.label}</span>
                    <span
                      className="block mt-1"
                      style={{
                        fontSize: "7px",
                        color: isActive ? "var(--color-bg)" : "var(--color-text-muted)",
                      }}
                    >
                      {cfg.timer}S TIMER
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Personal best */}
          {(() => {
            const key = `${selectedCategory}-${selectedDifficulty}`;
            const pb = personalBests[key];
            return pb ? (
              <p
                className="pixel-text text-[10px] mb-4"
                style={{ color: "var(--color-text-muted)" }}
              >
                PERSONAL BEST: {pb.toLocaleString()} PTS
              </p>
            ) : null;
          })()}

          <button onClick={startGame} className="pixel-btn text-sm px-8 py-4">
            START QUIZ
          </button>
        </div>
      </div>
    );
  }

  // ======================== RESULTS ========================
  if (screen === "results") {
    const correctCount = results.filter((r) => r.correct).length;
    const pct = Math.round((correctCount / ROUNDS_PER_GAME) * 100);
    const rating = getRating(pct);
    const key = `${selectedCategory}-${selectedDifficulty}`;
    const pb = personalBests[key];
    const isNewBest = pb === score && score > 0;

    return (
      <div
        className="min-h-screen relative px-4 py-10"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p
              className="pixel-text text-xs mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              QUIZ COMPLETE
            </p>
            <h1
              className="pixel-text text-3xl sm:text-4xl mb-2"
              style={{ color: "var(--color-accent)" }}
            >
              {score.toLocaleString()} PTS
            </h1>
            {isNewBest && (
              <p
                className="pixel-text text-xs mb-2 animate-glow-pulse"
                style={{ color: "var(--color-orange)" }}
              >
                NEW PERSONAL BEST!
              </p>
            )}
            <p
              className="pixel-text text-sm mb-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {correctCount}/{ROUNDS_PER_GAME} CORRECT ({pct}%)
            </p>
            <p
              className="pixel-text text-sm mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              BEST STREAK: {bestStreak}
            </p>
            <div className="flex justify-center gap-2 mt-2 mb-4">
              <span
                className="pixel-text text-[8px] px-2 py-1 border"
                style={{
                  borderColor: CATEGORY_INFO[selectedCategory].color,
                  color: CATEGORY_INFO[selectedCategory].color,
                }}
              >
                {CATEGORY_INFO[selectedCategory].label}
              </span>
              <span
                className="pixel-text text-[8px] px-2 py-1 border"
                style={{
                  borderColor: DIFFICULTY_CONFIG[selectedDifficulty].color,
                  color: DIFFICULTY_CONFIG[selectedDifficulty].color,
                }}
              >
                {DIFFICULTY_CONFIG[selectedDifficulty].label}
              </span>
            </div>
            <p
              className="pixel-text text-lg mt-2"
              style={{ color: rating.color }}
            >
              {rating.label}
            </p>
          </div>

          {/* Per-round breakdown */}
          <div className="space-y-2 mb-10">
            <p
              className="pixel-text text-[10px] mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              ROUND BREAKDOWN
            </p>
            {results.map((r, i) => (
              <div
                key={i}
                className="pixel-card p-3 flex items-center gap-3"
                style={{
                  borderColor: r.correct ? "var(--color-accent)" : "var(--color-red)",
                }}
              >
                <span
                  className="pixel-text text-[10px] w-8 shrink-0"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="pixel-text text-[7px] px-1.5 py-0.5 border shrink-0"
                  style={{
                    borderColor: CATEGORY_INFO[r.question.category].color,
                    color: CATEGORY_INFO[r.question.category].color,
                  }}
                >
                  {r.question.category.toUpperCase().slice(0, 4)}
                </span>
                <span
                  className="mono-text text-xs truncate flex-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {r.question.code.split("\n")[0].slice(0, 35)}
                  {r.question.code.split("\n")[0].length > 35 ? "..." : ""}
                </span>
                <span
                  className="pixel-text text-[10px] shrink-0"
                  style={{
                    color: r.correct ? "var(--color-accent)" : "var(--color-red)",
                  }}
                >
                  {r.correct
                    ? r.question.answer
                    : r.chosen
                      ? `${r.chosen} (${r.question.answer})`
                      : `TIMEOUT (${r.question.answer})`}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={startGame} className="pixel-btn text-xs px-6 py-3">
              PLAY AGAIN
            </button>
            <button
              onClick={() => setScreen("menu")}
              className="pixel-btn text-xs px-6 py-3"
            >
              CHANGE SETTINGS
            </button>
            <Link href="/games" className="pixel-btn inline-block text-xs px-6 py-3">
              BACK TO GAMES
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ======================== PLAYING ========================
  const timerPct = (timeLeft / timerSeconds) * 100;
  const timerColor =
    timeLeft > timerSeconds * 0.6
      ? "var(--color-accent)"
      : timeLeft > timerSeconds * 0.3
        ? "var(--color-orange)"
        : "var(--color-red)";

  return (
    <div
      className="min-h-screen relative px-4 py-6"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Timer bar */}
        <div
          className="w-full h-2 mb-6 overflow-hidden"
          style={{
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="h-full transition-none"
            style={{
              width: `${timerPct}%`,
              background: timerColor,
              boxShadow: `0 0 8px ${timerColor}`,
            }}
          />
        </div>

        {/* Stats row */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <span
            className="pixel-text text-[10px]"
            style={{ color: "var(--color-text-muted)" }}
          >
            ROUND {roundIndex + 1}/{ROUNDS_PER_GAME}
          </span>
          <span
            className="pixel-text text-[10px]"
            style={{ color: "var(--color-accent)" }}
          >
            {score.toLocaleString()} PTS
          </span>
          {streak > 0 && (
            <span
              className="pixel-text text-[10px]"
              style={{ color: "var(--color-orange)" }}
            >
              STREAK: {streak}x
            </span>
          )}
          {currentQuestion && (
            <span
              className="pixel-text text-[7px] px-1.5 py-0.5 border"
              style={{
                borderColor: CATEGORY_INFO[currentQuestion.category].color,
                color: CATEGORY_INFO[currentQuestion.category].color,
              }}
            >
              {CATEGORY_INFO[currentQuestion.category].label}
            </span>
          )}
        </div>

        {/* Code snippet */}
        {currentQuestion && (
          <div
            className="p-5 mb-6 overflow-x-auto"
            style={{
              background: "var(--color-bg-secondary)",
              border: "2px solid var(--color-border)",
              borderRadius: 0,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: "var(--color-red)" }}
              />
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: "var(--color-orange)" }}
              />
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: "var(--color-accent)" }}
              />
              <span
                className="pixel-text text-[8px] ml-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                snippet.code
              </span>
            </div>
            <pre
              className="mono-text text-sm sm:text-base leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: highlight(currentQuestion.code),
              }}
            />
          </div>
        )}

        {/* Feedback overlay */}
        {showingFeedback && lastResult && (
          <div
            className="text-center mb-4 py-3 px-4 pixel-text text-xs animate-fade-in-up"
            style={{
              background: lastResult.correct
                ? "rgba(0,255,136,0.1)"
                : "rgba(239,68,68,0.1)",
              border: `2px solid ${lastResult.correct ? "var(--color-accent)" : "var(--color-red)"}`,
              color: lastResult.correct
                ? "var(--color-accent)"
                : "var(--color-red)",
            }}
          >
            {lastResult.correct
              ? `CORRECT! +${DIFFICULTY_CONFIG[selectedDifficulty].points + (streak - 1) * 15 + Math.round(lastResult.timeLeft * 10)} PTS`
              : lastResult.chosen
                ? `WRONG! IT WAS ${lastResult.question.answer.toUpperCase()}`
                : `TIME'S UP! IT WAS ${lastResult.question.answer.toUpperCase()}`}
          </div>
        )}

        {/* Answer buttons */}
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt) => {
            const isChosen = showingFeedback && lastResult?.chosen === opt;
            const isCorrectAnswer = showingFeedback && opt === currentQuestion?.answer;
            const isWrongChosen = isChosen && !lastResult?.correct;

            let btnBorder = "var(--color-border)";
            let btnBg = "var(--color-bg-card)";
            let btnColor = "var(--color-text)";

            if (showingFeedback) {
              if (isCorrectAnswer) {
                btnBorder = "var(--color-accent)";
                btnBg = "rgba(0,255,136,0.15)";
                btnColor = "var(--color-accent)";
              } else if (isWrongChosen) {
                btnBorder = "var(--color-red)";
                btnBg = "rgba(239,68,68,0.15)";
                btnColor = "var(--color-red)";
              }
            }

            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={answeredRef.current}
                className="pixel-text text-xs sm:text-sm py-4 px-3 border-2 transition-all duration-150 cursor-pointer hover:translate-y-[-2px]"
                style={{
                  borderColor: btnBorder,
                  background: btnBg,
                  color: btnColor,
                  boxShadow:
                    isCorrectAnswer && showingFeedback
                      ? "0 0 15px var(--color-accent-glow)"
                      : "none",
                }}
              >
                {opt.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
