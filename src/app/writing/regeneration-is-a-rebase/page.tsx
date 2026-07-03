import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Regeneration is a rebase — Tanmay Singh",
  description:
    "What building a merge engine for generated code taught me about trusting git history.",
  openGraph: {
    title: "Regeneration is a rebase",
    description:
      "What building a merge engine for generated code taught me about trusting git history.",
    type: "article",
    url: "https://tanmay-singh.com/writing/regeneration-is-a-rebase",
  },
};

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="pixel-text text-sm sm:text-base mt-12 mb-5"
      style={{ color: "var(--color-accent)" }}
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-base leading-relaxed mb-5"
      style={{ color: "var(--color-text)" }}
    >
      {children}
    </p>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="mono-text text-sm px-1.5 py-0.5"
      style={{
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        color: "var(--color-accent)",
      }}
    >
      {children}
    </code>
  );
}

export default function RegenerationIsARebase() {
  return (
    <div className="min-h-screen px-4 py-12">
      <article className="max-w-2xl mx-auto">
        <Link
          href="/writing"
          className="pixel-text text-xs inline-block mb-10 transition-opacity duration-200 hover:opacity-75"
          style={{ color: "var(--color-accent)" }}
        >
          &lt;- WRITING
        </Link>

        <header className="mb-10">
          <h1
            className="pixel-text text-lg sm:text-2xl leading-relaxed mb-4"
            style={{ color: "var(--color-text)" }}
          >
            REGENERATION IS A REBASE
          </h1>
          <p
            className="mono-text text-base"
            style={{ color: "var(--color-text-secondary)" }}
          >
            What building a merge engine for generated code taught me about
            trusting git history.
          </p>
          <p
            className="mono-text text-xs mt-3"
            style={{ color: "var(--color-text-muted)" }}
          >
            Tanmay Singh &middot; July 2026
          </p>
        </header>

        <P>
          Fern generates SDKs from API specs. That is the whole product in one
          sentence. A customer describes their API, and we produce idiomatic
          client libraries in TypeScript, Python, Java, Go, and a few other
          languages. The generated code is good, but it is never the last word.
          Customers add helper methods. They patch a type the generator got
          wrong, or add the retry policy their infra team insists on. Then the
          API changes, the SDK regenerates, and every one of those edits is
          gone.
        </P>
        <P>
          For years the official answer was a file called{" "}
          <Code>.fernignore</Code>. List a file there and the generator will
          never touch it again. It works, in the way that unplugging a smoke
          alarm works. You now own the whole file forever, you stop receiving
          generated improvements to it, and the list only grows. One customer
          had 66 files in <Code>.fernignore</Code> to protect a single type
          patch. When I saw that number I stopped filing it under annoyances.
        </P>

        <H2>THE INSIGHT</H2>
        <P>
          The fix came from noticing what regeneration actually is. When new
          generated code replaces old generated code, and a human has edited
          the old code in the meantime, you are not looking at an overwrite
          problem. You are looking at a rebase. Git solved this decades ago
          with the 3-way merge, and the mapping is exact.
        </P>
        <pre
          className="mono-text text-sm p-4 mb-5 overflow-x-auto"
          style={{
            background: "var(--color-bg-card)",
            border: "2px solid var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          {`BASE   = the tree the generator produced last time
OURS   = the tree the generator produced today
THEIRS = what the human made of the old tree`}
        </pre>
        <P>
          Run diff3 over each touched file and most edits reapply cleanly,
          because generators tend to change different lines than humans do.
          This is Replay, the system I built at Fern. On every regeneration it
          detects the commits a customer made since the last generated commit,
          stores each one as a patch in a lockfile, and replays them on top of
          the fresh output.
        </P>

        <H2>CONFLICTS BELONG IN EDITORS, NOT PULL REQUESTS</H2>
        <P>
          The first real design decision was what to do when the merge does
          conflict. The obvious move is to commit conflict markers and let the
          customer sort it out. We never do that. A regeneration lands as a
          pull request, and a pull request full of <Code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</Code>{" "}
          is radioactive. Nobody merges it, it goes stale, and now the customer
          is behind on SDK updates too. Instead the conflicting patch is marked
          unresolved in the lockfile, the PR stays clean and mergeable, and the
          customer runs <Code>fern replay resolve</Code> locally, where their
          editor shows an ordinary merge conflict. An open conflict carries
          forward across regenerations until someone resolves it, so nothing is
          dropped while it waits.
        </P>

        <H2>THE BOUNDARY PROBLEM</H2>
        <P>
          All of that was the easy half. The hard half was a question that
          sounds trivial. Where does the last generation end and the
          customer&apos;s work begin?
        </P>
        <P>
          The first version answered it the obvious way. When we generate,
          record the commit SHA. Next time, diff from that SHA. I trusted that
          pointer, and git taught me not to, four separate times.
        </P>
        <P>
          A squash merge creates a new commit and abandons the original, so the
          recorded SHA still exists but no branch can reach it. A force push
          rewrites it away entirely. Garbage collection eventually deletes
          whatever nothing references. And a shallow clone, which is what every
          CI system uses, never fetched the old commits in the first place.
        </P>
        <P>
          Each of these produced its own strange bug report. The most memorable
          came from the squash merge case. When the recorded SHA was
          unreachable, the detector fell back to scanning commits, and on one
          large repository it walked straight past the beginning of Fern&apos;s
          involvement and captured years of unrelated history as customer
          edits. The result was a lockfile holding 135 patches, 101 of them
          anchored to commits that no longer existed, and a pull request whose
          description exceeded GitHub&apos;s 65,536 character limit for PR
          bodies. I did not know that limit existed. I do now.
        </P>

        <H2>DERIVE, DON&apos;T STORE</H2>
        <P>
          The lesson underneath all four failures is the same. Any state you
          store about git history is a cache, and it will eventually disagree
          with the history itself. Squash merges, force pushes, GC, and shallow
          clones are just how people use git.
        </P>
        <P>
          So the rewrite stopped storing the answer and started deriving it. On
          every run, Replay walks <Code>git log --first-parent</Code> from HEAD
          and classifies each commit with a narrow predicate that recognizes
          generated commits. The first match is the boundary. There is nothing
          to go stale because nothing is remembered between runs. That one
          change deleted about three thousand lines of recovery code whose only
          job had been to repair the stored pointer after git moved underneath
          it. Deleting code that defends a bad assumption is the best feeling
          in this job.
        </P>

        <H2>TWO HOLES WORTH DESCRIBING</H2>
        <P>
          Deriving the boundary opened its own set of holes, and two changed
          how I think about git.
        </P>
        <P>
          First, <Code>--first-parent</Code> follows the mainline of the
          branch, which is what you want, until a customer pushes a fix
          directly onto a generated pull request and merges it with a merge
          commit. Their fix now lives on the second parent side of history, and
          a mainline walk never sees it. The detector had to switch to
          examining every non-merge commit individually, so each human commit
          becomes its own attributed patch regardless of which side of a merge
          it arrived on.
        </P>
        <P>
          Second, a patch stored months ago can reference a base tree that no
          longer exists on the machine doing the merge, because of GC or a
          shallow clone. You still have the patch itself though, and a unified
          diff contains more information than people give it credit for.
          Context lines plus removed lines reconstruct what BASE looked like
          around the edit. Context lines plus added lines reconstruct THEIRS.
          You can rebuild enough of both sides from the diff alone to run a
          real 3-way merge against the new output. I called this ghost
          reconstruction.
        </P>

        <H2>YOU CANNOT MOCK GIT</H2>
        <P>
          A mocked git returns what you told it to return, and every bug above
          came from git doing something I had not imagined. So the
          engine&apos;s test suite, more than 800 cases now, runs against real
          repositories. It squash merges, force pushes, truncates clones with{" "}
          <Code>--depth=1</Code>, garbage collects, and then asserts that no
          customer edit was lost. There are dedicated testbed repositories
          whose entire purpose is reproducing the exact history shapes we first
          met in the wild. The rule now is that when git surprises you, the
          surprise becomes a permanent test before the fix merges.
        </P>

        <H2>WHERE THIS GENERALIZES</H2>
        <P>
          Replay is generally available and running for companies like
          ElevenLabs and Auth0, and the engine is public on npm as{" "}
          <a
            href="https://www.npmjs.com/package/@fern-api/replay"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-75"
            style={{ color: "var(--color-accent)" }}
          >
            @fern-api/replay
          </a>
          . The{" "}
          <a
            href="https://buildwithfern.com/post/fern-replay"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-75"
            style={{ color: "var(--color-accent)" }}
          >
            launch post
          </a>{" "}
          covers the product side.
        </P>
        <P>
          The engineering lesson travels further than SDKs. If your system
          remembers a fact about an external source of truth, whether that is a
          SHA or a cache key, you have created a second copy of reality, and
          the two will eventually diverge. When you can afford to derive the
          fact each time, derive it. Git is fast enough. So is almost
          everything else.
        </P>

        <footer
          className="mt-14 pt-6"
          style={{ borderTop: "2px solid var(--color-border)" }}
        >
          <p
            className="mono-text text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            I am a senior software engineer at Fern (acquired by Postman),
            where I build SDK generators and agent tooling.{" "}
            <Link
              href="/"
              className="underline hover:opacity-75"
              style={{ color: "var(--color-accent)" }}
            >
              More about me
            </Link>{" "}
            or{" "}
            <Link
              href="/games"
              className="underline hover:opacity-75"
              style={{ color: "var(--color-accent)" }}
            >
              play something instead
            </Link>
            .
          </p>
        </footer>
      </article>
    </div>
  );
}
