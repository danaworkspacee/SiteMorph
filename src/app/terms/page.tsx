import type { Metadata } from "next";
import Link from "next/link";
import Footer from "~/components/footer";

export const metadata: Metadata = {
  title: "Terms of Service — SiteMorph",
  description:
    "The terms for using SiteMorph, the free tool that morphs any website into clean, local HTML + Tailwind.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col relative">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <Link href="/" className="text-sm text-[#757575] hover:text-black">
          &larr; SiteMorph
        </Link>
        <h1 className="mt-6 text-4xl font-medium tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: November 11, 2026
        </p>

        <div className="mt-8 flex flex-col gap-8 text-base leading-relaxed text-muted-foreground">
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              1. What SiteMorph does
            </h2>
            <p>
              SiteMorph is a free tool that creates a local copy (“mirror”) of
              a publicly accessible website. It loads the site in a real
              browser, saves its pages and assets, and converts them into
              clean, readable HTML + Tailwind CSS that you can download as a
              ZIP or generate from the command line. The output is meant to
              help you learn from, prototype with, or rebuild a design you
              have the right to use.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              2. Acceptable use
            </h2>
            <p>By using SiteMorph, you agree to:</p>
            <ul className="flex list-disc flex-col gap-2 pl-6">
              <li>
                Only mirror websites you have the right to copy: your own
                sites, sites with a permissive license, or content you are
                otherwise allowed to reproduce.
              </li>
              <li>
                Respect copyright, trademarks, and the terms of the source
                website. SiteMorph does not grant you any rights over the
                content it copies.
              </li>
              <li>
                Not use the service to bypass paywalls, login walls, or other
                access controls, or to copy content that is not publicly
                accessible.
              </li>
              <li>
                Not use the service to collect personal data, harass anyone,
                or break the law.
              </li>
              <li>
                Not abuse the service with excessive or automated requests
                that degrade it for others. Rate limits may apply.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              3. Your responsibility
            </h2>
            <p>
              You are responsible for the URLs you submit and for what you do
              with the output. Check the license and terms of any site before
              reusing its content, and do not publish mirrored content as if
              it were your own.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              4. Availability
            </h2>
            <p>
              SiteMorph is provided free of charge, with no service-level
              agreement. The service may change, limit, or discontinue
              features at any time. Mirrors may be incomplete: dynamic
              content, lazy-loaded assets, and interactive behavior do not
              always survive the conversion, and the tool makes no promise
              that a mirror is complete or pixel-perfect.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              5. No warranty and liability
            </h2>
            <p>
              The service is provided “as is”, without warranties of any
              kind. To the maximum extent permitted by law, SiteMorph and its
              operator are not liable for any damages arising from your use of
              the service or its output.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              6. Changes to these terms
            </h2>
            <p>
              These terms may be updated from time to time. The “Last
              updated” date above will change when that happens, and
              continued use of the service after an update means you accept
              the new terms.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              7. Contact
            </h2>
            <p>
              Questions about these terms? Reach the operator through{" "}
              <Link
                href="https://danaworkspace.my.id/"
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline hover:text-[#0075de]"
              >
                danaworkspace.my.id
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
