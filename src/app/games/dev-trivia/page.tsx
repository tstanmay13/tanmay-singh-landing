'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────
type Category = 'Languages' | 'Frameworks' | 'History' | 'Algorithms' | 'DevOps' | 'Databases' | 'Security' | 'General';
type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface TriviaQuestion {
  question: string;
  answers: string[];
  correct: number; // index into answers
  category: Category;
  difficulty: Difficulty;
}

type GamePhase =
  | 'lobby'
  | 'team-setup'
  | 'category-pick'
  | 'wager'
  | 'question'
  | 'reveal'
  | 'rapid-intro'
  | 'rapid-question'
  | 'rapid-reveal'
  | 'game-over';

interface Player {
  name: string;
  team: 0 | 1;
}

// ─── 200+ Trivia Questions ─────────────────────────────────────

const QUESTIONS: TriviaQuestion[] = [
  // ── Languages (35) ──
  { question: "Which language was originally called 'Oak'?", answers: ['Java', 'JavaScript', 'C#', 'Kotlin'], correct: 0, category: 'Languages', difficulty: 'Easy' },
  { question: "What does the '++' in C++ represent?", answers: ['Addition operator', 'Increment of C', 'Version 2', 'Double precision'], correct: 1, category: 'Languages', difficulty: 'Easy' },
  { question: "Which language uses 'fn' for function declarations?", answers: ['Go', 'Rust', 'Swift', 'Kotlin'], correct: 1, category: 'Languages', difficulty: 'Medium' },
  { question: "What language is known as the 'jewel' language?", answers: ['Ruby', 'Pearl', 'Crystal', 'Diamond'], correct: 0, category: 'Languages', difficulty: 'Easy' },
  { question: "Which language was created by Guido van Rossum?", answers: ['Perl', 'PHP', 'Python', 'Ruby'], correct: 2, category: 'Languages', difficulty: 'Easy' },
  { question: "What does 'COBOL' stand for?", answers: ['Common Business Oriented Language', 'Computer Binary Object Language', 'Compiled Business Operation Logic', 'Common Byte Oriented Logic'], correct: 0, category: 'Languages', difficulty: 'Medium' },
  { question: "Which language introduced the concept of 'goroutines'?", answers: ['Erlang', 'Go', 'Rust', 'Elixir'], correct: 1, category: 'Languages', difficulty: 'Medium' },
  { question: "What language uses 'let' and 'var' for variable declarations since ES6?", answers: ['TypeScript', 'JavaScript', 'Swift', 'Kotlin'], correct: 1, category: 'Languages', difficulty: 'Easy' },
  { question: "Which language compiles to the Erlang VM (BEAM)?", answers: ['Clojure', 'Elixir', 'Haskell', 'Scala'], correct: 1, category: 'Languages', difficulty: 'Medium' },
  { question: "What language uses indentation instead of braces for blocks?", answers: ['Ruby', 'Lua', 'Python', 'Perl'], correct: 2, category: 'Languages', difficulty: 'Easy' },
  { question: "Which language was developed at Bell Labs in 1972?", answers: ['C', 'Pascal', 'FORTRAN', 'Lisp'], correct: 0, category: 'Languages', difficulty: 'Medium' },
  { question: "What is Kotlin's primary target platform?", answers: ['iOS', 'JVM', 'WebAssembly', '.NET'], correct: 1, category: 'Languages', difficulty: 'Easy' },
  { question: "Which language uses the 'impl' keyword for implementations?", answers: ['Go', 'Rust', 'Swift', 'C++'], correct: 1, category: 'Languages', difficulty: 'Medium' },
  { question: "What language was created by Brendan Eich in 10 days?", answers: ['TypeScript', 'CoffeeScript', 'JavaScript', 'Dart'], correct: 2, category: 'Languages', difficulty: 'Easy' },
  { question: "Which language introduced pattern matching with 'match'?", answers: ['Rust', 'Java', 'C++', 'Go'], correct: 0, category: 'Languages', difficulty: 'Medium' },
  { question: "What is the mascot of the Go programming language?", answers: ['A beaver', 'A gopher', 'A penguin', 'A snake'], correct: 1, category: 'Languages', difficulty: 'Easy' },
  { question: "Which language uses 'defmodule' to define modules?", answers: ['Elixir', 'Erlang', 'Haskell', 'OCaml'], correct: 0, category: 'Languages', difficulty: 'Hard' },
  { question: "What was TypeScript originally codenamed?", answers: ['Strada', 'Dart', 'Flow', 'CoffeeScript'], correct: 0, category: 'Languages', difficulty: 'Hard' },
  { question: "Which language introduced the 'async/await' pattern first?", answers: ['JavaScript', 'C#', 'Python', 'Rust'], correct: 1, category: 'Languages', difficulty: 'Hard' },
  { question: "What does 'PHP' originally stand for?", answers: ['Personal Home Page', 'PHP Hypertext Processor', 'Parsed HTML Protocol', 'Public Hosting Platform'], correct: 0, category: 'Languages', difficulty: 'Medium' },
  { question: "Which language uses 'fun' for function declarations?", answers: ['Kotlin', 'Rust', 'Go', 'Swift'], correct: 0, category: 'Languages', difficulty: 'Medium' },
  { question: "What year was Python first released?", answers: ['1989', '1991', '1995', '2000'], correct: 1, category: 'Languages', difficulty: 'Hard' },
  { question: "Which language has a 'borrow checker'?", answers: ['C++', 'Go', 'Rust', 'Swift'], correct: 2, category: 'Languages', difficulty: 'Medium' },
  { question: "What language was designed for the .NET framework?", answers: ['Java', 'C#', 'F#', 'Visual Basic'], correct: 1, category: 'Languages', difficulty: 'Easy' },
  { question: "Which language uses 'puts' to print output?", answers: ['Python', 'Ruby', 'Go', 'Rust'], correct: 1, category: 'Languages', difficulty: 'Medium' },
  { question: "What language uses ':=' for short variable declaration?", answers: ['Pascal', 'Go', 'Ada', 'Delphi'], correct: 1, category: 'Languages', difficulty: 'Medium' },
  { question: "Which language was created at Sun Microsystems?", answers: ['C#', 'JavaScript', 'Java', 'Ruby'], correct: 2, category: 'Languages', difficulty: 'Easy' },
  { question: "What does 'SQL' stand for?", answers: ['Structured Query Language', 'Simple Query Logic', 'System Query Language', 'Standard Query Library'], correct: 0, category: 'Languages', difficulty: 'Easy' },
  { question: "Which language is named after a type of coffee?", answers: ['Mocha', 'Java', 'Espresso', 'Latte'], correct: 1, category: 'Languages', difficulty: 'Easy' },
  { question: "What language uses 'println!' as a macro for printing?", answers: ['Rust', 'Kotlin', 'Scala', 'Swift'], correct: 0, category: 'Languages', difficulty: 'Medium' },
  { question: "Which language uses 'guard' statements?", answers: ['Kotlin', 'Rust', 'Swift', 'Go'], correct: 2, category: 'Languages', difficulty: 'Medium' },
  { question: "What language introduced 'Option' and 'Result' types?", answers: ['Haskell', 'Rust', 'Scala', 'F#'], correct: 1, category: 'Languages', difficulty: 'Hard' },
  { question: "Which language has 'channels' for concurrency?", answers: ['Go', 'Java', 'Python', 'C++'], correct: 0, category: 'Languages', difficulty: 'Medium' },
  { question: "What does 'LISP' stand for?", answers: ['List Processing', 'Logical Instruction Set Program', 'Linear Interpreted Script Protocol', 'Low-level Interface System Process'], correct: 0, category: 'Languages', difficulty: 'Medium' },
  { question: "Which language is known for its 'zero-cost abstractions'?", answers: ['Go', 'Rust', 'Java', 'Python'], correct: 1, category: 'Languages', difficulty: 'Hard' },

  // ── Frameworks (32) ──
  { question: "Which framework's logo is an atom?", answers: ['Vue', 'Angular', 'React', 'Svelte'], correct: 2, category: 'Frameworks', difficulty: 'Easy' },
  { question: "Which CSS framework is named after a weather phenomenon?", answers: ['Bootstrap', 'Tailwind', 'Bulma', 'Foundation'], correct: 1, category: 'Frameworks', difficulty: 'Easy' },
  { question: "What framework uses a 'Virtual DOM' concept?", answers: ['Angular', 'Svelte', 'React', 'jQuery'], correct: 2, category: 'Frameworks', difficulty: 'Easy' },
  { question: "Which framework was created by Evan You?", answers: ['React', 'Vue', 'Svelte', 'Angular'], correct: 1, category: 'Frameworks', difficulty: 'Medium' },
  { question: "What does 'Next.js' add to React?", answers: ['State management', 'Server-side rendering', 'CSS-in-JS', 'Testing'], correct: 1, category: 'Frameworks', difficulty: 'Easy' },
  { question: "Which framework uses 'directives' like ng-if?", answers: ['React', 'Vue', 'Angular', 'Svelte'], correct: 2, category: 'Frameworks', difficulty: 'Easy' },
  { question: "What Ruby framework follows 'Convention over Configuration'?", answers: ['Sinatra', 'Rails', 'Hanami', 'Roda'], correct: 1, category: 'Frameworks', difficulty: 'Easy' },
  { question: "Which framework compiles away at build time?", answers: ['React', 'Angular', 'Vue', 'Svelte'], correct: 3, category: 'Frameworks', difficulty: 'Medium' },
  { question: "What Python framework is called 'The web framework for perfectionists with deadlines'?", answers: ['Flask', 'Django', 'FastAPI', 'Pyramid'], correct: 1, category: 'Frameworks', difficulty: 'Medium' },
  { question: "Which framework uses 'hooks' like useState and useEffect?", answers: ['Angular', 'Vue 2', 'React', 'Ember'], correct: 2, category: 'Frameworks', difficulty: 'Easy' },
  { question: "What is Express.js built on?", answers: ['Python', 'Node.js', 'Deno', 'Bun'], correct: 1, category: 'Frameworks', difficulty: 'Easy' },
  { question: "Which framework introduced 'Signals' for reactivity?", answers: ['React', 'SolidJS', 'Angular', 'Ember'], correct: 1, category: 'Frameworks', difficulty: 'Hard' },
  { question: "What does 'SPA' stand for in web development?", answers: ['Single Page Application', 'Server Page Architecture', 'Static Page Assembly', 'Simple Programming API'], correct: 0, category: 'Frameworks', difficulty: 'Easy' },
  { question: "Which framework uses .vue single-file components?", answers: ['React', 'Angular', 'Vue', 'Svelte'], correct: 2, category: 'Frameworks', difficulty: 'Easy' },
  { question: "What testing framework uses 'describe' and 'it' blocks?", answers: ['Pytest', 'JUnit', 'Jest', 'PHPUnit'], correct: 2, category: 'Frameworks', difficulty: 'Medium' },
  { question: "Which framework was built by the Laravel creator?", answers: ['Livewire', 'Inertia', 'Both A and B', 'None'], correct: 0, category: 'Frameworks', difficulty: 'Hard' },
  { question: "What is the default bundler for Vite?", answers: ['Webpack', 'Rollup', 'Parcel', 'esbuild'], correct: 3, category: 'Frameworks', difficulty: 'Hard' },
  { question: "Which meta-framework is built for Vue?", answers: ['Next.js', 'Nuxt', 'Remix', 'Gatsby'], correct: 1, category: 'Frameworks', difficulty: 'Medium' },
  { question: "What framework uses the motto 'The Progressive JavaScript Framework'?", answers: ['React', 'Vue', 'Svelte', 'Angular'], correct: 1, category: 'Frameworks', difficulty: 'Medium' },
  { question: "Which CSS framework uses utility-first classes?", answers: ['Bootstrap', 'Tailwind CSS', 'Materialize', 'Bulma'], correct: 1, category: 'Frameworks', difficulty: 'Easy' },
  { question: "What is the primary language for Flutter?", answers: ['Java', 'Kotlin', 'Dart', 'Swift'], correct: 2, category: 'Frameworks', difficulty: 'Medium' },
  { question: "Which framework uses 'getServerSideProps'?", answers: ['Nuxt', 'Next.js', 'Remix', 'Gatsby'], correct: 1, category: 'Frameworks', difficulty: 'Medium' },
  { question: "What framework introduced 'Server Components'?", answers: ['Vue', 'React', 'Svelte', 'Angular'], correct: 1, category: 'Frameworks', difficulty: 'Medium' },
  { question: "Which mobile framework was created by Facebook?", answers: ['Flutter', 'Xamarin', 'React Native', 'Ionic'], correct: 2, category: 'Frameworks', difficulty: 'Easy' },
  { question: "What does 'ORM' stand for?", answers: ['Object Relational Mapping', 'Optimized Runtime Module', 'Object Resource Manager', 'Operational Reference Model'], correct: 0, category: 'Frameworks', difficulty: 'Easy' },
  { question: "Which framework uses 'Blade' templates?", answers: ['Django', 'Rails', 'Laravel', 'Spring'], correct: 2, category: 'Frameworks', difficulty: 'Medium' },
  { question: "What is Astro's key feature?", answers: ['Virtual DOM', 'Islands architecture', 'JIT compilation', 'Hot reloading'], correct: 1, category: 'Frameworks', difficulty: 'Hard' },
  { question: "Which framework uses 'middleware' functions in its request pipeline?", answers: ['Express.js', 'React', 'Vue', 'Svelte'], correct: 0, category: 'Frameworks', difficulty: 'Easy' },
  { question: "What backend framework is built with Rust?", answers: ['Actix', 'Express', 'Django', 'Spring'], correct: 0, category: 'Frameworks', difficulty: 'Hard' },
  { question: "Which framework uses 'zones' for change detection?", answers: ['React', 'Vue', 'Angular', 'Svelte'], correct: 2, category: 'Frameworks', difficulty: 'Hard' },
  { question: "What state management library uses 'reducers'?", answers: ['MobX', 'Zustand', 'Redux', 'Jotai'], correct: 2, category: 'Frameworks', difficulty: 'Medium' },
  { question: "Which framework introduced 'file-based routing'?", answers: ['Next.js', 'Express', 'Django', 'Rails'], correct: 0, category: 'Frameworks', difficulty: 'Medium' },

  // ── History (30) ──
  { question: "What year was the first website published?", answers: ['1989', '1991', '1993', '1995'], correct: 1, category: 'History', difficulty: 'Easy' },
  { question: "Who created Linux?", answers: ['Dennis Ritchie', 'Linus Torvalds', 'Richard Stallman', 'Ken Thompson'], correct: 1, category: 'History', difficulty: 'Easy' },
  { question: "What was the first high-level programming language?", answers: ['COBOL', 'FORTRAN', 'Lisp', 'ALGOL'], correct: 1, category: 'History', difficulty: 'Medium' },
  { question: "Who is considered the father of computer science?", answers: ['John von Neumann', 'Alan Turing', 'Charles Babbage', 'Ada Lovelace'], correct: 1, category: 'History', difficulty: 'Easy' },
  { question: "What year was Git created?", answers: ['2002', '2005', '2008', '2010'], correct: 1, category: 'History', difficulty: 'Medium' },
  { question: "Who created Git?", answers: ['Guido van Rossum', 'Linus Torvalds', 'Ken Thompson', 'Brendan Eich'], correct: 1, category: 'History', difficulty: 'Easy' },
  { question: "What was the first ever computer bug?", answers: ['Memory overflow', 'An actual moth', 'Syntax error', 'Short circuit'], correct: 1, category: 'History', difficulty: 'Medium' },
  { question: "What year was Stack Overflow launched?", answers: ['2006', '2008', '2010', '2012'], correct: 1, category: 'History', difficulty: 'Medium' },
  { question: "Who founded Microsoft?", answers: ['Steve Jobs', 'Bill Gates & Paul Allen', 'Larry Page', 'Mark Zuckerberg'], correct: 1, category: 'History', difficulty: 'Easy' },
  { question: "What was Amazon's original product?", answers: ['Electronics', 'Books', 'Cloud computing', 'Groceries'], correct: 1, category: 'History', difficulty: 'Easy' },
  { question: "What year was the iPhone introduced?", answers: ['2005', '2006', '2007', '2008'], correct: 2, category: 'History', difficulty: 'Easy' },
  { question: "Who invented the World Wide Web?", answers: ['Vint Cerf', 'Tim Berners-Lee', 'Marc Andreessen', 'Robert Kahn'], correct: 1, category: 'History', difficulty: 'Easy' },
  { question: "What was the first graphical web browser?", answers: ['Netscape', 'Mosaic', 'Internet Explorer', 'Opera'], correct: 1, category: 'History', difficulty: 'Medium' },
  { question: "What company created the first hard drive?", answers: ['Intel', 'IBM', 'HP', 'Texas Instruments'], correct: 1, category: 'History', difficulty: 'Medium' },
  { question: "What year did GitHub launch?", answers: ['2006', '2008', '2010', '2012'], correct: 1, category: 'History', difficulty: 'Medium' },
  { question: "What does 'HTTP' stand for?", answers: ['HyperText Transfer Protocol', 'High Tech Transfer Process', 'Hyper Transfer Text Protocol', 'HyperText Transmission Protocol'], correct: 0, category: 'History', difficulty: 'Easy' },
  { question: "Who created the first compiler?", answers: ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'John McCarthy'], correct: 1, category: 'History', difficulty: 'Hard' },
  { question: "What year was Node.js released?", answers: ['2007', '2009', '2011', '2013'], correct: 1, category: 'History', difficulty: 'Medium' },
  { question: "Which company developed the UNIX operating system?", answers: ['IBM', 'Microsoft', 'Bell Labs', 'Xerox'], correct: 2, category: 'History', difficulty: 'Medium' },
  { question: "What was Google's original name?", answers: ['BackRub', 'PageRank', 'SearchBot', 'WebCrawl'], correct: 0, category: 'History', difficulty: 'Hard' },
  { question: "What year was Docker released?", answers: ['2011', '2013', '2015', '2017'], correct: 1, category: 'History', difficulty: 'Hard' },
  { question: "Who co-founded Apple with Steve Jobs?", answers: ['Bill Gates', 'Steve Wozniak', 'Tim Cook', 'John Sculley'], correct: 1, category: 'History', difficulty: 'Easy' },
  { question: "What does 'ASCII' stand for?", answers: ['American Standard Code for Information Interchange', 'Automated System Code for Internet Integration', 'American System for Computer Information Interchange', 'Advanced Standard Code for Information Integration'], correct: 0, category: 'History', difficulty: 'Medium' },
  { question: "What was the first programming language used in space?", answers: ['FORTRAN', 'Assembly', 'HAL/S', 'Ada'], correct: 2, category: 'History', difficulty: 'Hard' },
  { question: "When was the first email sent?", answers: ['1965', '1971', '1975', '1981'], correct: 1, category: 'History', difficulty: 'Hard' },
  { question: "What company developed Java?", answers: ['Microsoft', 'Sun Microsystems', 'IBM', 'Oracle'], correct: 1, category: 'History', difficulty: 'Easy' },
  { question: "What year was Kubernetes first released?", answers: ['2012', '2014', '2016', '2018'], correct: 1, category: 'History', difficulty: 'Hard' },
  { question: "Who is credited as the first computer programmer?", answers: ['Grace Hopper', 'Ada Lovelace', 'Alan Turing', 'Charles Babbage'], correct: 1, category: 'History', difficulty: 'Medium' },
  { question: "What year was TypeScript released?", answers: ['2010', '2012', '2014', '2016'], correct: 1, category: 'History', difficulty: 'Medium' },
  { question: "What company bought GitHub in 2018?", answers: ['Google', 'Amazon', 'Microsoft', 'Facebook'], correct: 2, category: 'History', difficulty: 'Easy' },

  // ── Algorithms (30) ──
  { question: "What's the time complexity of binary search?", answers: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], correct: 1, category: 'Algorithms', difficulty: 'Easy' },
  { question: "Which sorting algorithm is also called 'sinking sort'?", answers: ['Selection sort', 'Bubble sort', 'Insertion sort', 'Merge sort'], correct: 1, category: 'Algorithms', difficulty: 'Easy' },
  { question: "What data structure uses FIFO?", answers: ['Stack', 'Queue', 'Tree', 'Graph'], correct: 1, category: 'Algorithms', difficulty: 'Easy' },
  { question: "What data structure uses LIFO?", answers: ['Queue', 'Stack', 'Heap', 'Array'], correct: 1, category: 'Algorithms', difficulty: 'Easy' },
  { question: "What's the worst-case time complexity of quicksort?", answers: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'], correct: 2, category: 'Algorithms', difficulty: 'Medium' },
  { question: "What algorithm finds the shortest path in a weighted graph?", answers: ['BFS', 'DFS', "Dijkstra's", 'Binary search'], correct: 2, category: 'Algorithms', difficulty: 'Medium' },
  { question: "What is the time complexity of accessing an element in a hash table?", answers: ['O(n)', 'O(log n)', 'O(1) average', 'O(n log n)'], correct: 2, category: 'Algorithms', difficulty: 'Easy' },
  { question: "Which sort is stable and has O(n log n) guaranteed?", answers: ['Quicksort', 'Merge sort', 'Heap sort', 'Radix sort'], correct: 1, category: 'Algorithms', difficulty: 'Medium' },
  { question: "What technique solves problems by breaking them into overlapping subproblems?", answers: ['Divide and conquer', 'Dynamic programming', 'Greedy', 'Backtracking'], correct: 1, category: 'Algorithms', difficulty: 'Medium' },
  { question: "What is a 'balanced' binary search tree?", answers: ['All leaves at same level', 'Height difference <= 1', 'Equal left and right nodes', 'No duplicate values'], correct: 1, category: 'Algorithms', difficulty: 'Medium' },
  { question: "What does BFS stand for?", answers: ['Binary File Search', 'Breadth-First Search', 'Best-First Sort', 'Batch File System'], correct: 1, category: 'Algorithms', difficulty: 'Easy' },
  { question: "What is the space complexity of merge sort?", answers: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'], correct: 2, category: 'Algorithms', difficulty: 'Medium' },
  { question: "Which data structure is used in BFS?", answers: ['Stack', 'Queue', 'Heap', 'Tree'], correct: 1, category: 'Algorithms', difficulty: 'Easy' },
  { question: "What is a 'trie' used for?", answers: ['Sorting numbers', 'String/prefix searching', 'Graph traversal', 'Memory management'], correct: 1, category: 'Algorithms', difficulty: 'Medium' },
  { question: "What's the best-case time complexity of bubble sort?", answers: ['O(1)', 'O(n)', 'O(n log n)', 'O(n^2)'], correct: 1, category: 'Algorithms', difficulty: 'Medium' },
  { question: "What is Big O notation used for?", answers: ['Memory allocation', 'Describing algorithm efficiency', 'Error handling', 'Code formatting'], correct: 1, category: 'Algorithms', difficulty: 'Easy' },
  { question: "What problem does the 'Traveling Salesman' address?", answers: ['Graph coloring', 'Shortest route visiting all nodes', 'Network flow', 'String matching'], correct: 1, category: 'Algorithms', difficulty: 'Medium' },
  { question: "What is the time complexity of inserting at the beginning of a linked list?", answers: ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'], correct: 2, category: 'Algorithms', difficulty: 'Easy' },
  { question: "Which algorithm is used for finding minimum spanning trees?", answers: ["Dijkstra's", "Kruskal's", 'Floyd-Warshall', 'Bellman-Ford'], correct: 1, category: 'Algorithms', difficulty: 'Hard' },
  { question: "What is 'memoization'?", answers: ['Saving memory', 'Caching function results', 'Writing documentation', 'Garbage collection'], correct: 1, category: 'Algorithms', difficulty: 'Medium' },
  { question: "What is the maximum number of children in a binary tree node?", answers: ['1', '2', '3', 'Unlimited'], correct: 1, category: 'Algorithms', difficulty: 'Easy' },
  { question: "What type of tree is used in most database indexes?", answers: ['Binary tree', 'Red-black tree', 'B-tree', 'AVL tree'], correct: 2, category: 'Algorithms', difficulty: 'Hard' },
  { question: "What is the time complexity of finding an element in a sorted array?", answers: ['O(n)', 'O(log n)', 'O(1)', 'O(n^2)'], correct: 1, category: 'Algorithms', difficulty: 'Easy' },
  { question: "What algorithm does Git use for diffing?", answers: ['KMP', 'Myers diff', 'Rabin-Karp', 'Levenshtein'], correct: 1, category: 'Algorithms', difficulty: 'Hard' },
  { question: "What is a 'heap' data structure primarily used for?", answers: ['Sorting strings', 'Priority queue', 'Stack operations', 'Linked list traversal'], correct: 1, category: 'Algorithms', difficulty: 'Medium' },
  { question: "What is the time complexity of heap sort?", answers: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'], correct: 1, category: 'Algorithms', difficulty: 'Medium' },
  { question: "What does 'NP-hard' mean?", answers: ['Not Possible to solve', 'At least as hard as NP-complete', 'Needs Parallelism', 'Non-Polynomial time only'], correct: 1, category: 'Algorithms', difficulty: 'Hard' },
  { question: "What is a 'collision' in hashing?", answers: ['Two keys mapping to same index', 'Hash table overflow', 'Memory leak', 'Stack overflow'], correct: 0, category: 'Algorithms', difficulty: 'Easy' },
  { question: "Which traversal visits root, then left, then right?", answers: ['Inorder', 'Preorder', 'Postorder', 'Level order'], correct: 1, category: 'Algorithms', difficulty: 'Medium' },
  { question: "What is amortized O(1) mean?", answers: ['Always O(1)', 'O(1) on average over many operations', 'O(1) in best case', 'O(1) with caching'], correct: 1, category: 'Algorithms', difficulty: 'Hard' },

  // ── DevOps (26) ──
  { question: "What does 'CI/CD' stand for?", answers: ['Code Integration / Code Delivery', 'Continuous Integration / Continuous Delivery', 'Computer Interface / Computer Deployment', 'Centralized Integration / Centralized Deployment'], correct: 1, category: 'DevOps', difficulty: 'Easy' },
  { question: "What is Docker used for?", answers: ['Version control', 'Containerization', 'Testing', 'Monitoring'], correct: 1, category: 'DevOps', difficulty: 'Easy' },
  { question: "What does 'K8s' stand for?", answers: ['Kafka', 'Kubernetes', 'Kibana', 'Knative'], correct: 1, category: 'DevOps', difficulty: 'Easy' },
  { question: "What is Terraform used for?", answers: ['Container orchestration', 'Infrastructure as Code', 'Monitoring', 'Log management'], correct: 1, category: 'DevOps', difficulty: 'Medium' },
  { question: "What is the default port for HTTPS?", answers: ['80', '443', '8080', '3000'], correct: 1, category: 'DevOps', difficulty: 'Easy' },
  { question: "What does 'DNS' stand for?", answers: ['Digital Network System', 'Domain Name System', 'Data Network Service', 'Distributed Node Server'], correct: 1, category: 'DevOps', difficulty: 'Easy' },
  { question: "What is a 'reverse proxy'?", answers: ['A proxy that blocks traffic', 'A server that forwards requests to backend servers', 'A VPN', 'A firewall'], correct: 1, category: 'DevOps', difficulty: 'Medium' },
  { question: "Which tool is known for 'Infrastructure as Code' with YAML?", answers: ['Terraform', 'Ansible', 'Docker', 'Git'], correct: 1, category: 'DevOps', difficulty: 'Medium' },
  { question: "What is the purpose of a load balancer?", answers: ['Encrypt traffic', 'Distribute traffic across servers', 'Cache data', 'Compress files'], correct: 1, category: 'DevOps', difficulty: 'Easy' },
  { question: "What does 'SSH' stand for?", answers: ['Secure Shell', 'Safe Server Hosting', 'System Shell Handler', 'Secure System Hub'], correct: 0, category: 'DevOps', difficulty: 'Easy' },
  { question: "What is Prometheus used for?", answers: ['Container orchestration', 'Monitoring and alerting', 'CI/CD pipelines', 'Secret management'], correct: 1, category: 'DevOps', difficulty: 'Medium' },
  { question: "What Kubernetes resource defines a desired pod state?", answers: ['Service', 'Deployment', 'ConfigMap', 'Ingress'], correct: 1, category: 'DevOps', difficulty: 'Medium' },
  { question: "What is a 'microservice'?", answers: ['A small server', 'An independently deployable service', 'A JavaScript library', 'A testing framework'], correct: 1, category: 'DevOps', difficulty: 'Easy' },
  { question: "What is 'blue-green deployment'?", answers: ['Running two identical production environments', 'A testing strategy', 'A monitoring tool', 'A Docker feature'], correct: 0, category: 'DevOps', difficulty: 'Medium' },
  { question: "What tool did GitHub Actions replace for many users?", answers: ['Jenkins', 'Travis CI', 'CircleCI', 'All of the above'], correct: 3, category: 'DevOps', difficulty: 'Medium' },
  { question: "What is a 'canary deployment'?", answers: ['Deploying to a subset of users first', 'Deploying to all users at once', 'Rolling back a deployment', 'A testing strategy'], correct: 0, category: 'DevOps', difficulty: 'Hard' },
  { question: "What does 'YAML' stand for?", answers: ['Yet Another Markup Language', 'YAML Ain\'t Markup Language', 'Your Application Markup Language', 'Yielded Automated Markup Logic'], correct: 1, category: 'DevOps', difficulty: 'Medium' },
  { question: "What is the default port for HTTP?", answers: ['443', '8080', '80', '3000'], correct: 2, category: 'DevOps', difficulty: 'Easy' },
  { question: "What is Grafana used for?", answers: ['Container runtime', 'Visualization and dashboards', 'Version control', 'Package management'], correct: 1, category: 'DevOps', difficulty: 'Medium' },
  { question: "What does 'CDN' stand for?", answers: ['Content Distribution Network', 'Content Delivery Network', 'Centralized Data Node', 'Cloud Deployment Network'], correct: 1, category: 'DevOps', difficulty: 'Easy' },
  { question: "What is Vault by HashiCorp used for?", answers: ['Container orchestration', 'Secret management', 'Log aggregation', 'CI/CD'], correct: 1, category: 'DevOps', difficulty: 'Hard' },
  { question: "What is the '12-factor app' methodology about?", answers: ['12 programming languages', 'Best practices for SaaS apps', '12 testing strategies', '12 deployment stages'], correct: 1, category: 'DevOps', difficulty: 'Hard' },
  { question: "What protocol does Docker use to build images?", answers: ['HTTP', 'BuildKit', 'gRPC', 'REST'], correct: 1, category: 'DevOps', difficulty: 'Hard' },
  { question: "What is 'horizontal scaling'?", answers: ['Adding more RAM', 'Adding more servers', 'Adding more CPUs', 'Adding more storage'], correct: 1, category: 'DevOps', difficulty: 'Easy' },
  { question: "What is an 'ingress' in Kubernetes?", answers: ['A pod type', 'An API for managing external access', 'A storage volume', 'A namespace'], correct: 1, category: 'DevOps', difficulty: 'Medium' },
  { question: "What is 'GitOps'?", answers: ['A Git GUI', 'Using Git as single source of truth for infrastructure', 'A CI/CD tool', 'A code review practice'], correct: 1, category: 'DevOps', difficulty: 'Medium' },

  // ── Databases (26) ──
  { question: "What type of database is MongoDB?", answers: ['Relational', 'Document/NoSQL', 'Graph', 'Time series'], correct: 1, category: 'Databases', difficulty: 'Easy' },
  { question: "What does 'ACID' stand for in databases?", answers: ['Atomicity, Consistency, Isolation, Durability', 'Automated, Centralized, Integrated, Distributed', 'Asynchronous, Cached, Indexed, Distributed', 'Atomicity, Cached, Isolated, Duplicated'], correct: 0, category: 'Databases', difficulty: 'Medium' },
  { question: "What SQL command retrieves data?", answers: ['GET', 'FETCH', 'SELECT', 'RETRIEVE'], correct: 2, category: 'Databases', difficulty: 'Easy' },
  { question: "What is Redis primarily used for?", answers: ['File storage', 'In-memory caching', 'Graph queries', 'Full-text search'], correct: 1, category: 'Databases', difficulty: 'Easy' },
  { question: "What does 'ORM' do?", answers: ['Optimizes queries', 'Maps objects to database tables', 'Manages connections', 'Encrypts data'], correct: 1, category: 'Databases', difficulty: 'Easy' },
  { question: "What is a 'primary key'?", answers: ['The first column', 'A unique identifier for each row', 'The most important data', 'An encrypted field'], correct: 1, category: 'Databases', difficulty: 'Easy' },
  { question: "What database type uses nodes and edges?", answers: ['Relational', 'Document', 'Graph', 'Key-value'], correct: 2, category: 'Databases', difficulty: 'Medium' },
  { question: "What is 'sharding' in databases?", answers: ['Deleting old data', 'Splitting data across multiple servers', 'Encrypting data', 'Compressing tables'], correct: 1, category: 'Databases', difficulty: 'Medium' },
  { question: "What does 'JOIN' do in SQL?", answers: ['Merges databases', 'Combines rows from two or more tables', 'Creates a new table', 'Deletes duplicate rows'], correct: 1, category: 'Databases', difficulty: 'Easy' },
  { question: "What is PostgreSQL known as?", answers: ['The Oracle killer', 'The most advanced open source database', 'MySQL Pro', 'SQLite Plus'], correct: 1, category: 'Databases', difficulty: 'Medium' },
  { question: "What is a 'foreign key'?", answers: ['A key from another country', 'A reference to a primary key in another table', 'An encrypted key', 'A deprecated key'], correct: 1, category: 'Databases', difficulty: 'Easy' },
  { question: "What is 'normalization' in databases?", answers: ['Making data normal', 'Organizing data to reduce redundancy', 'Resetting the database', 'Converting to uppercase'], correct: 1, category: 'Databases', difficulty: 'Medium' },
  { question: "What is a 'deadlock'?", answers: ['A locked database', 'Two transactions waiting for each other forever', 'A crashed server', 'A corrupted table'], correct: 1, category: 'Databases', difficulty: 'Medium' },
  { question: "What does 'CAP theorem' state?", answers: ['Consistency, Availability, Partition tolerance - pick 2', 'Cache, API, Performance must balance', 'Create, Alter, Purge are fundamental', 'Compute, Access, Process must optimize'], correct: 0, category: 'Databases', difficulty: 'Hard' },
  { question: "What is SQLite?", answers: ['A cloud database', 'An embedded file-based database', 'A NoSQL database', 'A distributed database'], correct: 1, category: 'Databases', difficulty: 'Easy' },
  { question: "What is an 'index' in a database?", answers: ['The first row', 'A data structure improving query speed', 'A table of contents', 'A backup system'], correct: 1, category: 'Databases', difficulty: 'Easy' },
  { question: "What is 'eventual consistency'?", answers: ['Data is always consistent', 'Data will become consistent over time', 'Data is never consistent', 'Consistency is optional'], correct: 1, category: 'Databases', difficulty: 'Hard' },
  { question: "What type of database is Neo4j?", answers: ['Relational', 'Document', 'Graph', 'Columnar'], correct: 2, category: 'Databases', difficulty: 'Medium' },
  { question: "What is a 'transaction' in databases?", answers: ['A payment', 'A unit of work that is atomic', 'A query log', 'A data transfer'], correct: 1, category: 'Databases', difficulty: 'Easy' },
  { question: "What does 'CRUD' stand for?", answers: ['Create, Read, Update, Delete', 'Cache, Route, Upload, Download', 'Connect, Retrieve, Update, Disconnect', 'Compile, Run, Upload, Deploy'], correct: 0, category: 'Databases', difficulty: 'Easy' },
  { question: "What is Cassandra designed for?", answers: ['Small datasets', 'High availability distributed data', 'Graph queries', 'In-memory caching'], correct: 1, category: 'Databases', difficulty: 'Medium' },
  { question: "What SQL clause filters grouped results?", answers: ['WHERE', 'HAVING', 'FILTER', 'GROUP BY'], correct: 1, category: 'Databases', difficulty: 'Medium' },
  { question: "What is a 'view' in SQL?", answers: ['A database diagram', 'A virtual table based on a query', 'A type of index', 'A user interface'], correct: 1, category: 'Databases', difficulty: 'Medium' },
  { question: "What is 'write-ahead logging' (WAL)?", answers: ['Writing logs before commits for crash recovery', 'A logging framework', 'Writing ahead of schedule', 'A backup strategy'], correct: 0, category: 'Databases', difficulty: 'Hard' },
  { question: "What is a 'materialized view'?", answers: ['A view with CSS', 'A precomputed query result stored on disk', 'A graphical view', 'A temporary table'], correct: 1, category: 'Databases', difficulty: 'Hard' },
  { question: "What is connection pooling?", answers: ['Swimming database', 'Reusing database connections', 'Merging databases', 'Load balancing queries'], correct: 1, category: 'Databases', difficulty: 'Medium' },

  // ── Security (26) ──
  { question: "What does 'XSS' stand for?", answers: ['Cross-Site Scripting', 'Extra Secure System', 'XML Security Standard', 'Cross-Server Sync'], correct: 0, category: 'Security', difficulty: 'Easy' },
  { question: "What is 'SQL injection'?", answers: ['Adding SQL to a database', 'Inserting malicious SQL through user input', 'A type of database', 'SQL performance tuning'], correct: 1, category: 'Security', difficulty: 'Easy' },
  { question: "What does 'HTTPS' add to HTTP?", answers: ['Speed', 'Encryption via TLS/SSL', 'Compression', 'Caching'], correct: 1, category: 'Security', difficulty: 'Easy' },
  { question: "What is a 'JWT'?", answers: ['Java Web Token', 'JSON Web Token', 'JavaScript Web Tool', 'Joint Work Ticket'], correct: 1, category: 'Security', difficulty: 'Easy' },
  { question: "What does 'CORS' stand for?", answers: ['Cross-Origin Resource Sharing', 'Centralized Origin Request System', 'Common Origin Resource Security', 'Cross-Object Reference Standard'], correct: 0, category: 'Security', difficulty: 'Medium' },
  { question: "What is 'CSRF'?", answers: ['Cross-Site Request Forgery', 'Centralized Server Request Format', 'Common Security Review Framework', 'Cross-System Resource Filter'], correct: 0, category: 'Security', difficulty: 'Medium' },
  { question: "What is 'OAuth' used for?", answers: ['Database access', 'Authorization delegation', 'Encryption', 'File transfer'], correct: 1, category: 'Security', difficulty: 'Medium' },
  { question: "What is a 'man-in-the-middle' attack?", answers: ['An insider threat', 'Intercepting communication between two parties', 'A brute force attack', 'A phishing scam'], correct: 1, category: 'Security', difficulty: 'Medium' },
  { question: "What does 'OWASP' stand for?", answers: ['Open Web Application Security Project', 'Online Web API Security Protocol', 'Open Wireless Application Standard Process', 'Official Web Application Security Platform'], correct: 0, category: 'Security', difficulty: 'Medium' },
  { question: "What is 'hashing' used for in security?", answers: ['Encrypting files', 'One-way transformation of data', 'Compressing data', 'Sorting data'], correct: 1, category: 'Security', difficulty: 'Easy' },
  { question: "What is 'two-factor authentication'?", answers: ['Two passwords', 'Two different verification methods', 'Two user accounts', 'Two security questions'], correct: 1, category: 'Security', difficulty: 'Easy' },
  { question: "What is a 'DDoS' attack?", answers: ['Data theft', 'Overwhelming a server with traffic', 'SQL injection', 'Phishing'], correct: 1, category: 'Security', difficulty: 'Easy' },
  { question: "What hashing algorithm is NOT recommended for passwords?", answers: ['bcrypt', 'Argon2', 'MD5', 'scrypt'], correct: 2, category: 'Security', difficulty: 'Medium' },
  { question: "What is 'rate limiting'?", answers: ['Slowing network speed', 'Restricting the number of requests', 'Charging per API call', 'Limiting database rows'], correct: 1, category: 'Security', difficulty: 'Easy' },
  { question: "What is the purpose of a 'salt' in password hashing?", answers: ['Flavor', 'Adding random data to prevent rainbow table attacks', 'Encrypting the hash', 'Compressing the password'], correct: 1, category: 'Security', difficulty: 'Medium' },
  { question: "What is 'phishing'?", answers: ['Catching fish online', 'Tricking users into revealing sensitive info', 'A type of malware', 'Network scanning'], correct: 1, category: 'Security', difficulty: 'Easy' },
  { question: "What does 'TLS' stand for?", answers: ['Transport Layer Security', 'Total Layer System', 'Transfer Link Security', 'Trusted Login Service'], correct: 0, category: 'Security', difficulty: 'Medium' },
  { question: "What is a 'zero-day vulnerability'?", answers: ['A vulnerability found on day zero of release', 'An unknown exploit with no available fix', 'A vulnerability that takes zero days to fix', 'A harmless vulnerability'], correct: 1, category: 'Security', difficulty: 'Hard' },
  { question: "What is 'Content Security Policy' (CSP)?", answers: ['A privacy policy', 'HTTP header to prevent XSS and injection', 'A database policy', 'A cloud security tool'], correct: 1, category: 'Security', difficulty: 'Hard' },
  { question: "What is 'RBAC'?", answers: ['Remote Backup and Control', 'Role-Based Access Control', 'Real-time Breach Alert Center', 'Rapid Backup and Cache'], correct: 1, category: 'Security', difficulty: 'Medium' },
  { question: "What is 'encryption at rest'?", answers: ['Encrypting data during transfer', 'Encrypting stored data', 'Encrypting while sleeping', 'Encrypting backups only'], correct: 1, category: 'Security', difficulty: 'Medium' },
  { question: "What is a 'honeypot' in security?", answers: ['A trap system to detect attackers', 'A password manager', 'An encryption method', 'A firewall type'], correct: 0, category: 'Security', difficulty: 'Hard' },
  { question: "What protocol replaced SSL?", answers: ['HTTPS', 'TLS', 'SSH', 'IPSec'], correct: 1, category: 'Security', difficulty: 'Medium' },
  { question: "What is 'least privilege principle'?", answers: ['Minimum server resources', 'Giving minimum necessary access rights', 'Lowest priority processes', 'Least expensive security solution'], correct: 1, category: 'Security', difficulty: 'Medium' },
  { question: "What is 'penetration testing'?", answers: ['Stress testing servers', 'Authorized simulated attacks to find vulnerabilities', 'Testing database performance', 'Testing API endpoints'], correct: 1, category: 'Security', difficulty: 'Medium' },
  { question: "What is a 'keylogger'?", answers: ['A key management tool', 'Software that records keystrokes', 'A debugging tool', 'An authentication system'], correct: 1, category: 'Security', difficulty: 'Easy' },

  // ── General (25) ──
  { question: "What does 'API' stand for?", answers: ['Application Programming Interface', 'Automated Program Integration', 'Application Process Identifier', 'Advanced Programming Instruction'], correct: 0, category: 'General', difficulty: 'Easy' },
  { question: "What does 'IDE' stand for?", answers: ['Internet Development Environment', 'Integrated Development Environment', 'Intelligent Design Editor', 'Internal Debug Engine'], correct: 1, category: 'General', difficulty: 'Easy' },
  { question: "What is 'localhost'?", answers: ['A web hosting service', 'Your own computer (127.0.0.1)', 'A cloud server', 'A local network'], correct: 1, category: 'General', difficulty: 'Easy' },
  { question: "What is a '404' error?", answers: ['Server error', 'Not found', 'Unauthorized', 'Bad request'], correct: 1, category: 'General', difficulty: 'Easy' },
  { question: "What does 'JSON' stand for?", answers: ['JavaScript Object Notation', 'Java Standard Object Network', 'JavaScript Online Network', 'JSON Server Object Name'], correct: 0, category: 'General', difficulty: 'Easy' },
  { question: "What is 'pair programming'?", answers: ['Two computers connected', 'Two developers working together on one task', 'Programming in pairs of functions', 'A code review process'], correct: 1, category: 'General', difficulty: 'Easy' },
  { question: "What does 'DRY' stand for in programming?", answers: ['Debug, Refactor, Yield', 'Do Repeat Yourself', "Don't Repeat Yourself", 'Data Representation Yield'], correct: 2, category: 'General', difficulty: 'Easy' },
  { question: "What is 'technical debt'?", answers: ['Money owed for software', 'Shortcuts that create future maintenance work', 'Cost of cloud hosting', 'Software licensing fees'], correct: 1, category: 'General', difficulty: 'Easy' },
  { question: "What is a '500' error?", answers: ['Not found', 'Unauthorized', 'Internal server error', 'Bad gateway'], correct: 2, category: 'General', difficulty: 'Easy' },
  { question: "What does 'MVP' mean in product development?", answers: ['Most Valuable Programmer', 'Minimum Viable Product', 'Maximum Viable Performance', 'Managed Version Platform'], correct: 1, category: 'General', difficulty: 'Easy' },
  { question: "What is 'agile' methodology?", answers: ['Moving fast', 'Iterative and incremental development', 'A programming language', 'A testing framework'], correct: 1, category: 'General', difficulty: 'Easy' },
  { question: "What is a 'code smell'?", answers: ['Bad variable names', 'Signs of potential design problems', 'A syntax error', 'A runtime exception'], correct: 1, category: 'General', difficulty: 'Medium' },
  { question: "What does 'SOLID' represent?", answers: ['5 principles of OOP design', 'A programming language', 'A database technique', 'A testing methodology'], correct: 0, category: 'General', difficulty: 'Medium' },
  { question: "What is 'refactoring'?", answers: ['Rewriting from scratch', 'Improving code structure without changing behavior', 'Adding new features', 'Fixing bugs'], correct: 1, category: 'General', difficulty: 'Easy' },
  { question: "What is a 'race condition'?", answers: ['A performance test', 'Behavior depending on timing of events', 'A type of deadlock', 'A network issue'], correct: 1, category: 'General', difficulty: 'Medium' },
  { question: "What does 'SaaS' stand for?", answers: ['Software as a Service', 'System as a Solution', 'Server and Application Service', 'Secure Application as Software'], correct: 0, category: 'General', difficulty: 'Easy' },
  { question: "What is 'rubber duck debugging'?", answers: ['Using a rubber duck for stress relief', 'Explaining code to an inanimate object to find bugs', 'A testing tool', 'A code review process'], correct: 1, category: 'General', difficulty: 'Medium' },
  { question: "What is 'semantic versioning'?", answers: ['Naming versions with words', 'MAJOR.MINOR.PATCH numbering', 'Date-based versioning', 'Random version numbers'], correct: 1, category: 'General', difficulty: 'Medium' },
  { question: "What does 'KISS' stand for?", answers: ['Keep It Simple, Stupid', 'Keep It Secure and Safe', 'Knowledge In Software Systems', 'Key Integration System Standard'], correct: 0, category: 'General', difficulty: 'Easy' },
  { question: "What is a 'monorepo'?", answers: ['A single repository for one project', 'A repository containing multiple projects', 'A private repository', 'A read-only repository'], correct: 1, category: 'General', difficulty: 'Medium' },
  { question: "What is 'DevOps'?", answers: ['A programming language', 'Culture of collaboration between dev and ops', 'A deployment tool', 'A testing methodology'], correct: 1, category: 'General', difficulty: 'Easy' },
  { question: "What is 'linting'?", answers: ['Removing lint from code', 'Static analysis to find potential errors', 'Compiling code', 'Formatting output'], correct: 1, category: 'General', difficulty: 'Easy' },
  { question: "What does 'YAGNI' stand for?", answers: ["You Aren't Gonna Need It", 'Your Application Generates New Issues', 'Yet Another General Network Interface', 'Your API Gets No Input'], correct: 0, category: 'General', difficulty: 'Medium' },
  { question: "What is 'scope creep'?", answers: ['A variable scope bug', 'Uncontrolled expansion of project requirements', 'A security vulnerability', 'A memory leak'], correct: 1, category: 'General', difficulty: 'Medium' },
  { question: "What is a 'pull request'?", answers: ['Downloading code', 'Proposing changes for review before merging', 'Requesting access', 'Pulling data from an API'], correct: 1, category: 'General', difficulty: 'Easy' },
];

// ─── Category Metadata ──────────────────────────────────────────
const CATEGORY_META: Record<Category, { icon: string; color: string }> = {
  Languages: { icon: '{ }', color: 'var(--color-accent)' },
  Frameworks: { icon: '< >', color: 'var(--color-blue)' },
  History: { icon: '...', color: 'var(--color-orange)' },
  Algorithms: { icon: 'O()', color: 'var(--color-purple)' },
  DevOps: { icon: '>>>',color: 'var(--color-cyan)' },
  Databases: { icon: '[=]', color: 'var(--color-pink)' },
  Security: { icon: '***', color: 'var(--color-red)' },
  General: { icon: '?!?', color: 'var(--color-orange)' },
};

const ALL_CATEGORIES: Category[] = ['Languages', 'Frameworks', 'History', 'Algorithms', 'DevOps', 'Databases', 'Security', 'General'];
const TEAM_NAMES = ['ALPHA', 'BETA'] as const;
const TEAM_COLORS = ['var(--color-accent)', 'var(--color-blue)'] as const;
const QUESTIONS_PER_GAME = 15;
const RAPID_FIRE_COUNT = 10;
const QUESTION_TIME = 15;
const RAPID_FIRE_TIME = 10;

// ─── Helpers ────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(category: Category, used: Set<number>): TriviaQuestion | null {
  const candidates = QUESTIONS
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => q.category === category && !used.has(i));
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  used.add(pick.i);
  return pick.q;
}

function pickRapidFireQuestions(used: Set<number>, count: number): TriviaQuestion[] {
  const candidates = QUESTIONS
    .map((q, i) => ({ q, i }))
    .filter(({ i }) => !used.has(i));
  const shuffled = shuffle(candidates);
  const picked = shuffled.slice(0, count);
  picked.forEach(({ i }) => used.add(i));
  return picked.map(({ q }) => q);
}

function difficultyPoints(d: Difficulty): number {
  return d === 'Easy' ? 100 : d === 'Medium' ? 200 : 300;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function DevTriviaShowdownPage() {
  const [mounted, setMounted] = useState(false);

  // Lobby / setup
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCount, setPlayerCount] = useState(6);
  const [mode, setMode] = useState<'teams' | 'pass'>('teams');

  // Game state
  const [scores, setScores] = useState([0, 0]);
  const [currentTeam, setCurrentTeam] = useState<0 | 1>(0);
  const [round, setRound] = useState(0);
  const [usedQuestions] = useState<Set<number>>(new Set());
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [wager, setWager] = useState<1 | 2 | 3>(1);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  // Track used categories for potential UI hints (dimming used ones)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [usedCategories, setUsedCategories] = useState<Set<string>>(new Set());

  // Rapid fire
  const [rapidQuestions, setRapidQuestions] = useState<TriviaQuestion[]>([]);
  const [rapidIndex, setRapidIndex] = useState(0);
  const [rapidBuzzer, setRapidBuzzer] = useState<0 | 1 | null>(null);
  // Track rapid-fire round scores separately for potential breakdown display
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [rapidScores, setRapidScores] = useState([0, 0]);

  // Animations
  const [showCorrect, setShowCorrect] = useState<boolean | null>(null);
  const [lockedIn, setLockedIn] = useState(false);
  const [wagerLocked, setWagerLocked] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Timer logic
  const startTimer = useCallback((seconds: number, onExpire: () => void) => {
    setTimeLeft(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ─── Lobby ────────────────────────────────────────────────────
  const startGame = () => {
    setScores([0, 0]);
    setRound(0);
    setCurrentTeam(0);
    usedQuestions.clear();
    setUsedCategories(new Set());
    setPhase('category-pick');
  };

  // ─── Category pick ───────────────────────────────────────────
  const pickCategory = (cat: Category) => {
    setSelectedCategory(cat);
    const q = pickQuestions(cat, usedQuestions);
    if (!q) return;
    setCurrentQuestion(q);
    setWager(1);
    setWagerLocked(false);
    setPhase('wager');
  };

  // ─── Wager ────────────────────────────────────────────────────
  const lockWager = () => {
    setWagerLocked(true);
    setTimeout(() => {
      setSelectedAnswer(null);
      setShowCorrect(null);
      setLockedIn(false);
      setPhase('question');
      startTimer(QUESTION_TIME, () => handleAnswer(-1));
    }, 800);
  };

  // ─── Answer ───────────────────────────────────────────────────
  const handleAnswer = useCallback((answerIdx: number) => {
    if (lockedIn) return;
    setLockedIn(true);
    stopTimer();
    setSelectedAnswer(answerIdx);
    const correct = currentQuestion && answerIdx === currentQuestion.correct;
    setShowCorrect(!!correct);

    if (correct && currentQuestion) {
      const pts = difficultyPoints(currentQuestion.difficulty) * wager;
      setScores(prev => {
        const next = [...prev];
        next[currentTeam] += pts;
        return next;
      });
    }

    setTimeout(() => {
      setPhase('reveal');
    }, 400);
  }, [lockedIn, currentQuestion, wager, currentTeam, stopTimer]);

  const nextRound = () => {
    const nextRound = round + 1;
    setRound(nextRound);

    if (nextRound >= QUESTIONS_PER_GAME) {
      // Start rapid fire
      const rqs = pickRapidFireQuestions(usedQuestions, RAPID_FIRE_COUNT);
      setRapidQuestions(rqs);
      setRapidIndex(0);
      setRapidScores([0, 0]);
      setPhase('rapid-intro');
      return;
    }

    setCurrentTeam(prev => (prev === 0 ? 1 : 0) as 0 | 1);
    if (selectedCategory) {
      setUsedCategories(prev => new Set(prev).add(selectedCategory));
    }
    setPhase('category-pick');
  };

  // ─── Rapid fire ───────────────────────────────────────────────
  const startRapidFire = () => {
    setRapidBuzzer(null);
    setSelectedAnswer(null);
    setShowCorrect(null);
    setLockedIn(false);
    setPhase('rapid-question');
    startTimer(RAPID_FIRE_TIME, () => {
      setPhase('rapid-reveal');
    });
  };

  const rapidBuzz = (team: 0 | 1) => {
    if (rapidBuzzer !== null) return;
    setRapidBuzzer(team);
    stopTimer();
  };

  const rapidAnswer = (answerIdx: number) => {
    if (lockedIn) return;
    setLockedIn(true);
    setSelectedAnswer(answerIdx);
    const q = rapidQuestions[rapidIndex];
    const correct = q && answerIdx === q.correct;
    setShowCorrect(!!correct);

    if (correct && rapidBuzzer !== null) {
      setRapidScores(prev => {
        const next = [...prev];
        next[rapidBuzzer] += 150;
        return next;
      });
      setScores(prev => {
        const next = [...prev];
        next[rapidBuzzer] += 150;
        return next;
      });
    }

    setTimeout(() => {
      setPhase('rapid-reveal');
    }, 400);
  };

  const nextRapidQuestion = () => {
    const next = rapidIndex + 1;
    if (next >= rapidQuestions.length) {
      setPhase('game-over');
      return;
    }
    setRapidIndex(next);
    setRapidBuzzer(null);
    setSelectedAnswer(null);
    setShowCorrect(null);
    setLockedIn(false);
    setPhase('rapid-question');
    startTimer(RAPID_FIRE_TIME, () => {
      setPhase('rapid-reveal');
    });
  };

  // ─── Reset ────────────────────────────────────────────────────
  const resetGame = () => {
    stopTimer();
    setPhase('lobby');
    setScores([0, 0]);
    setRound(0);
    usedQuestions.clear();
    setUsedCategories(new Set());
  };

  // ─── Render ───────────────────────────────────────────────────
  if (!mounted) return null;

  const winner: 0 | 1 | -1 = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : -1;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/games"
            className="pixel-text text-xs hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            &lt; BACK
          </Link>
          {phase !== 'lobby' && phase !== 'team-setup' && phase !== 'game-over' && (
            <div className="flex gap-6 items-center">
              <div className="text-center">
                <div className="pixel-text text-[10px]" style={{ color: TEAM_COLORS[0] }}>{TEAM_NAMES[0]}</div>
                <div className="mono-text text-lg font-bold" style={{ color: TEAM_COLORS[0] }}>{scores[0]}</div>
              </div>
              <div className="pixel-text text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                R{round + 1}/{QUESTIONS_PER_GAME}
              </div>
              <div className="text-center">
                <div className="pixel-text text-[10px]" style={{ color: TEAM_COLORS[1] }}>{TEAM_NAMES[1]}</div>
                <div className="mono-text text-lg font-bold" style={{ color: TEAM_COLORS[1] }}>{scores[1]}</div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ LOBBY ═══ */}
        {phase === 'lobby' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <h1 className="pixel-text text-xl md:text-2xl mb-3" style={{ color: 'var(--color-accent)' }}>
                DEV TRIVIA
              </h1>
              <h2 className="pixel-text text-sm md:text-base mb-2" style={{ color: 'var(--color-blue)' }}>
                SHOWDOWN
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Team-based programming trivia with wagering
              </p>
            </div>

            {/* Mode selector */}
            <div className="flex justify-center gap-3 mb-6">
              <button
                className={`pixel-btn text-xs px-4 py-2 ${mode === 'teams' ? '' : 'opacity-50'}`}
                onClick={() => setMode('teams')}
                style={mode === 'teams' ? { borderColor: 'var(--color-accent)' } : {}}
              >
                TEAM VS TEAM
              </button>
              <button
                className={`pixel-btn text-xs px-4 py-2 ${mode === 'pass' ? '' : 'opacity-50'}`}
                onClick={() => setMode('pass')}
                style={mode === 'pass' ? { borderColor: 'var(--color-accent)' } : {}}
              >
                PASS THE PHONE
              </button>
            </div>

            {/* Player count */}
            <div
              className="pixel-card rounded-lg p-5 mb-6"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <h3 className="pixel-text text-xs mb-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                HOW MANY PLAYERS?
              </h3>
              <div className="flex gap-2 justify-center flex-wrap mb-3">
                {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <button
                    key={n}
                    className="w-11 h-11 rounded-lg text-sm font-bold transition-all"
                    style={{
                      backgroundColor: playerCount === n ? 'var(--color-accent)' : 'var(--color-surface)',
                      color: playerCount === n ? 'var(--color-bg)' : 'var(--color-text)',
                      border: `2px solid ${playerCount === n ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    }}
                    onClick={() => setPlayerCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Team preview */}
              <div className="flex justify-center gap-4 text-xs">
                <span style={{ color: TEAM_COLORS[0] }}>
                  {TEAM_NAMES[0]}: {Math.ceil(playerCount / 2)}
                </span>
                <span style={{ color: TEAM_COLORS[1] }}>
                  {TEAM_NAMES[1]}: {Math.floor(playerCount / 2)}
                </span>
              </div>
            </div>

            <div className="text-center">
              <button
                className="pixel-btn text-sm px-8 py-3"
                onClick={() => {
                  const generated = Array.from({ length: playerCount }, (_, i) => ({
                    name: `Player ${i + 1}`,
                    team: (i % 2) as 0 | 1,
                  }));
                  setPlayers(generated);
                  startGame();
                }}
              >
                START SHOWDOWN
              </button>
            </div>
          </div>
        )}

        {/* ═══ CATEGORY PICK ═══ */}
        {phase === 'category-pick' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="pixel-text text-xs mb-2" style={{ color: TEAM_COLORS[currentTeam] }}>
                TEAM {TEAM_NAMES[currentTeam]}&apos;S TURN
              </div>
              <h2 className="pixel-text text-base md:text-lg mb-1" style={{ color: 'var(--color-text)' }}>
                PICK A CATEGORY
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Round {round + 1} of {QUESTIONS_PER_GAME}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ALL_CATEGORIES.map(cat => {
                const meta = CATEGORY_META[cat];
                const remaining = QUESTIONS.filter(q => q.category === cat && !usedQuestions.has(QUESTIONS.indexOf(q))).length;
                const disabled = remaining === 0;
                return (
                  <button
                    key={cat}
                    className="pixel-card rounded-lg p-4 text-center transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: disabled ? 'var(--color-bg-secondary)' : 'var(--color-bg-card)',
                      borderColor: meta.color,
                      opacity: disabled ? 0.3 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                    disabled={disabled}
                    onClick={() => pickCategory(cat)}
                  >
                    <div className="mono-text text-lg mb-2" style={{ color: meta.color }}>{meta.icon}</div>
                    <div className="pixel-text text-[10px]" style={{ color: meta.color }}>{cat.toUpperCase()}</div>
                    <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{remaining} left</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ WAGER ═══ */}
        {phase === 'wager' && currentQuestion && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="pixel-text text-xs mb-2" style={{ color: TEAM_COLORS[currentTeam] }}>
                TEAM {TEAM_NAMES[currentTeam]}
              </div>
              <h2 className="pixel-text text-sm md:text-base mb-2" style={{ color: 'var(--color-text)' }}>
                PLACE YOUR WAGER
              </h2>
              <div className="flex justify-center gap-2 items-center">
                <span
                  className="pixel-text text-[10px] px-2 py-1 rounded"
                  style={{
                    backgroundColor: CATEGORY_META[currentQuestion.category].color,
                    color: 'var(--color-bg)',
                  }}
                >
                  {currentQuestion.category.toUpperCase()}
                </span>
                <span
                  className="pixel-text text-[10px] px-2 py-1 rounded"
                  style={{
                    backgroundColor: currentQuestion.difficulty === 'Easy'
                      ? 'var(--color-accent)'
                      : currentQuestion.difficulty === 'Medium'
                        ? 'var(--color-orange)'
                        : 'var(--color-red)',
                    color: 'var(--color-bg)',
                  }}
                >
                  {currentQuestion.difficulty.toUpperCase()}
                </span>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Base points: {difficultyPoints(currentQuestion.difficulty)}
              </p>
            </div>

            <div className="flex justify-center gap-4 mb-8">
              {([1, 2, 3] as const).map(w => (
                <button
                  key={w}
                  className={`pixel-card rounded-lg p-4 md:p-6 text-center transition-all duration-200 ${wager === w ? 'scale-110' : 'hover:scale-105'}`}
                  style={{
                    backgroundColor: wager === w ? 'var(--color-bg-card-hover)' : 'var(--color-bg-card)',
                    borderColor: wager === w ? TEAM_COLORS[currentTeam] : 'var(--color-border)',
                    borderWidth: wager === w ? '3px' : '2px',
                    minWidth: '90px',
                  }}
                  onClick={() => !wagerLocked && setWager(w)}
                  disabled={wagerLocked}
                >
                  <div className="pixel-text text-lg md:text-xl mb-1" style={{ color: TEAM_COLORS[currentTeam] }}>
                    {w}x
                  </div>
                  <div className="mono-text text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {difficultyPoints(currentQuestion.difficulty) * w} pts
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                className="pixel-btn text-sm px-8 py-3"
                onClick={lockWager}
                disabled={wagerLocked}
                style={{
                  opacity: wagerLocked ? 0.5 : 1,
                  borderColor: TEAM_COLORS[currentTeam],
                }}
              >
                {wagerLocked ? 'LOCKED IN!' : 'LOCK IN WAGER'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ QUESTION ═══ */}
        {phase === 'question' && currentQuestion && (
          <div className="animate-fade-in-up">
            {/* Timer bar */}
            <div className="mb-4">
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(timeLeft / QUESTION_TIME) * 100}%`,
                    backgroundColor: timeLeft <= 5 ? 'var(--color-red)' : TEAM_COLORS[currentTeam],
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="pixel-text text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {wager}x WAGER
                </span>
                <span
                  className="mono-text text-sm font-bold"
                  style={{ color: timeLeft <= 5 ? 'var(--color-red)' : 'var(--color-text)' }}
                >
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Question */}
            <div
              className="pixel-card rounded-lg p-5 mb-6"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="pixel-text text-[10px] px-2 py-1 rounded"
                  style={{
                    backgroundColor: CATEGORY_META[currentQuestion.category].color,
                    color: 'var(--color-bg)',
                  }}
                >
                  {currentQuestion.category.toUpperCase()}
                </span>
              </div>
              <h3 className="text-base md:text-lg font-semibold leading-relaxed">
                {currentQuestion.question}
              </h3>
            </div>

            {/* Answers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentQuestion.answers.map((ans, i) => {
                const labels = ['A', 'B', 'C', 'D'];
                return (
                  <button
                    key={i}
                    className="pixel-card rounded-lg p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      backgroundColor: selectedAnswer === i
                        ? 'var(--color-bg-card-hover)'
                        : 'var(--color-bg-card)',
                      borderColor: selectedAnswer === i
                        ? TEAM_COLORS[currentTeam]
                        : 'var(--color-border)',
                    }}
                    onClick={() => handleAnswer(i)}
                    disabled={lockedIn}
                  >
                    <span
                      className="pixel-text text-[10px] mr-2"
                      style={{ color: TEAM_COLORS[currentTeam] }}
                    >
                      {labels[i]}.
                    </span>
                    <span className="text-sm">{ans}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ REVEAL ═══ */}
        {phase === 'reveal' && currentQuestion && (
          <div className="animate-fade-in-up text-center">
            <div
              className="pixel-text text-2xl md:text-3xl mb-4"
              style={{ color: showCorrect ? 'var(--color-accent)' : 'var(--color-red)' }}
            >
              {showCorrect ? 'CORRECT!' : 'WRONG!'}
            </div>

            <div
              className="pixel-card rounded-lg p-5 mb-6 mx-auto max-w-lg"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {currentQuestion.question}
              </p>
              <div className="space-y-2">
                {currentQuestion.answers.map((ans, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded text-sm flex items-center gap-2"
                    style={{
                      backgroundColor: i === currentQuestion.correct
                        ? 'rgba(0, 255, 136, 0.15)'
                        : i === selectedAnswer && i !== currentQuestion.correct
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'transparent',
                      border: i === currentQuestion.correct
                        ? '1px solid var(--color-accent)'
                        : i === selectedAnswer && i !== currentQuestion.correct
                          ? '1px solid var(--color-red)'
                          : '1px solid transparent',
                    }}
                  >
                    {i === currentQuestion.correct && (
                      <span style={{ color: 'var(--color-accent)' }}>[OK]</span>
                    )}
                    {i === selectedAnswer && i !== currentQuestion.correct && (
                      <span style={{ color: 'var(--color-red)' }}>[XX]</span>
                    )}
                    <span>{ans}</span>
                  </div>
                ))}
              </div>

              {showCorrect && (
                <div className="mt-4 pixel-text text-xs" style={{ color: TEAM_COLORS[currentTeam] }}>
                  +{difficultyPoints(currentQuestion.difficulty) * wager} PTS FOR {TEAM_NAMES[currentTeam]}
                </div>
              )}
            </div>

            <button className="pixel-btn text-sm px-8 py-3" onClick={nextRound}>
              {round + 1 >= QUESTIONS_PER_GAME ? 'RAPID FIRE ROUND!' : 'NEXT QUESTION'}
            </button>
          </div>
        )}

        {/* ═══ RAPID FIRE INTRO ═══ */}
        {phase === 'rapid-intro' && (
          <div className="animate-fade-in-up text-center py-12">
            <div className="pixel-text text-2xl md:text-3xl mb-4" style={{ color: 'var(--color-orange)' }}>
              RAPID FIRE!
            </div>
            <div className="pixel-text text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              {RAPID_FIRE_COUNT} QUESTIONS | {RAPID_FIRE_TIME}s EACH
            </div>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--color-text-muted)' }}>
              Both teams can buzz in! First team to buzz gets to answer.
              150 points per correct answer. No wagers.
            </p>
            <div className="flex justify-center gap-6 mb-8">
              <div className="text-center">
                <div className="pixel-text text-xs" style={{ color: TEAM_COLORS[0] }}>{TEAM_NAMES[0]}</div>
                <div className="mono-text text-2xl font-bold" style={{ color: TEAM_COLORS[0] }}>{scores[0]}</div>
              </div>
              <div className="pixel-text text-lg" style={{ color: 'var(--color-text-muted)' }}>VS</div>
              <div className="text-center">
                <div className="pixel-text text-xs" style={{ color: TEAM_COLORS[1] }}>{TEAM_NAMES[1]}</div>
                <div className="mono-text text-2xl font-bold" style={{ color: TEAM_COLORS[1] }}>{scores[1]}</div>
              </div>
            </div>
            <button className="pixel-btn text-sm px-8 py-3" onClick={startRapidFire}>
              START RAPID FIRE
            </button>
          </div>
        )}

        {/* ═══ RAPID FIRE QUESTION ═══ */}
        {phase === 'rapid-question' && rapidQuestions[rapidIndex] && (
          <div className="animate-fade-in-up">
            {/* Timer */}
            <div className="mb-4">
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${(timeLeft / RAPID_FIRE_TIME) * 100}%`,
                    backgroundColor: timeLeft <= 3 ? 'var(--color-red)' : 'var(--color-orange)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="pixel-text text-[10px]" style={{ color: 'var(--color-orange)' }}>
                  RAPID FIRE {rapidIndex + 1}/{RAPID_FIRE_COUNT}
                </span>
                <span
                  className="mono-text text-sm font-bold"
                  style={{ color: timeLeft <= 3 ? 'var(--color-red)' : 'var(--color-text)' }}
                >
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Buzzer phase */}
            {rapidBuzzer === null ? (
              <>
                <div
                  className="pixel-card rounded-lg p-5 mb-6"
                  style={{ backgroundColor: 'var(--color-bg-card)' }}
                >
                  <h3 className="text-base md:text-lg font-semibold leading-relaxed">
                    {rapidQuestions[rapidIndex].question}
                  </h3>
                </div>
                <div className="text-center mb-4">
                  <p className="pixel-text text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                    BUZZ IN!
                  </p>
                  <div className="flex justify-center gap-6">
                    <button
                      className="pixel-btn text-sm px-8 py-4"
                      style={{
                        borderColor: TEAM_COLORS[0],
                        backgroundColor: 'var(--color-bg-card)',
                      }}
                      onClick={() => rapidBuzz(0)}
                    >
                      {TEAM_NAMES[0]}
                    </button>
                    <button
                      className="pixel-btn text-sm px-8 py-4"
                      style={{
                        borderColor: TEAM_COLORS[1],
                        backgroundColor: 'var(--color-bg-card)',
                      }}
                      onClick={() => rapidBuzz(1)}
                    >
                      {TEAM_NAMES[1]}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="pixel-text text-xs" style={{ color: TEAM_COLORS[rapidBuzzer] }}>
                    {TEAM_NAMES[rapidBuzzer]} BUZZED IN!
                  </div>
                </div>
                <div
                  className="pixel-card rounded-lg p-5 mb-6"
                  style={{ backgroundColor: 'var(--color-bg-card)' }}
                >
                  <h3 className="text-base md:text-lg font-semibold leading-relaxed mb-4">
                    {rapidQuestions[rapidIndex].question}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rapidQuestions[rapidIndex].answers.map((ans, i) => {
                    const labels = ['A', 'B', 'C', 'D'];
                    return (
                      <button
                        key={i}
                        className="pixel-card rounded-lg p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          backgroundColor: 'var(--color-bg-card)',
                          borderColor: 'var(--color-border)',
                        }}
                        onClick={() => rapidAnswer(i)}
                        disabled={lockedIn}
                      >
                        <span
                          className="pixel-text text-[10px] mr-2"
                          style={{ color: 'var(--color-orange)' }}
                        >
                          {labels[i]}.
                        </span>
                        <span className="text-sm">{ans}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ RAPID FIRE REVEAL ═══ */}
        {phase === 'rapid-reveal' && rapidQuestions[rapidIndex] && (
          <div className="animate-fade-in-up text-center">
            {selectedAnswer !== null ? (
              <div
                className="pixel-text text-xl md:text-2xl mb-4"
                style={{ color: showCorrect ? 'var(--color-accent)' : 'var(--color-red)' }}
              >
                {showCorrect ? 'CORRECT!' : 'WRONG!'}
              </div>
            ) : (
              <div className="pixel-text text-xl md:text-2xl mb-4" style={{ color: 'var(--color-text-muted)' }}>
                TIME&apos;S UP!
              </div>
            )}

            <div
              className="pixel-card rounded-lg p-5 mb-6 mx-auto max-w-lg"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <p className="text-sm mb-3">{rapidQuestions[rapidIndex].question}</p>
              <div
                className="px-3 py-2 rounded text-sm mb-2"
                style={{
                  backgroundColor: 'rgba(0, 255, 136, 0.15)',
                  border: '1px solid var(--color-accent)',
                }}
              >
                <span style={{ color: 'var(--color-accent)' }}>[OK]</span>{' '}
                {rapidQuestions[rapidIndex].answers[rapidQuestions[rapidIndex].correct]}
              </div>
              {showCorrect && rapidBuzzer !== null && (
                <div className="mt-3 pixel-text text-xs" style={{ color: TEAM_COLORS[rapidBuzzer] }}>
                  +150 PTS FOR {TEAM_NAMES[rapidBuzzer]}
                </div>
              )}
            </div>

            <button className="pixel-btn text-sm px-8 py-3" onClick={nextRapidQuestion}>
              {rapidIndex + 1 >= rapidQuestions.length ? 'FINAL RESULTS' : 'NEXT QUESTION'}
            </button>
          </div>
        )}

        {/* ═══ GAME OVER ═══ */}
        {phase === 'game-over' && (
          <div className="animate-fade-in-up text-center py-8">
            <div className="pixel-text text-2xl md:text-3xl mb-2" style={{ color: 'var(--color-accent)' }}>
              GAME OVER
            </div>

            {winner >= 0 ? (
              <>
                <div className="mb-6">
                  <div className="pixel-text text-xl md:text-2xl mb-1" style={{ color: TEAM_COLORS[winner as 0 | 1] }}>
                    {TEAM_NAMES[winner as 0 | 1]} WINS!
                  </div>
                  <div className="text-6xl my-4">
                    {winner === 0 ? '[ A ]' : '[ B ]'}
                  </div>
                </div>
              </>
            ) : (
              <div className="mb-6">
                <div className="pixel-text text-xl md:text-2xl mb-1" style={{ color: 'var(--color-orange)' }}>
                  IT&apos;S A TIE!
                </div>
                <div className="text-4xl my-4">
                  [ = ]
                </div>
              </div>
            )}

            {/* Score bars */}
            <div className="max-w-md mx-auto mb-8">
              {[0, 1].map(t => {
                const maxScore = Math.max(scores[0], scores[1], 1);
                return (
                  <div key={t} className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="pixel-text text-xs" style={{ color: TEAM_COLORS[t] }}>
                        {TEAM_NAMES[t]}
                      </span>
                      <span className="mono-text text-sm font-bold" style={{ color: TEAM_COLORS[t] }}>
                        {scores[t]}
                      </span>
                    </div>
                    <div
                      className="w-full h-4 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${(scores[t] / maxScore) * 100}%`,
                          backgroundColor: TEAM_COLORS[t],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Players */}
            <div
              className="pixel-card rounded-lg p-4 mb-6 max-w-md mx-auto"
              style={{ backgroundColor: 'var(--color-bg-card)' }}
            >
              <div className="grid grid-cols-2 gap-4">
                {[0, 1].map(t => (
                  <div key={t}>
                    <div className="pixel-text text-[10px] mb-2" style={{ color: TEAM_COLORS[t] }}>
                      {TEAM_NAMES[t]}
                    </div>
                    {players.filter(p => p.team === t).map((p, i) => (
                      <div key={i} className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {p.name}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button className="pixel-btn text-sm px-6 py-3" onClick={startGame}>
                REMATCH
              </button>
              <button
                className="pixel-btn text-sm px-6 py-3"
                onClick={resetGame}
                style={{ borderColor: 'var(--color-text-muted)' }}
              >
                NEW GAME
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
