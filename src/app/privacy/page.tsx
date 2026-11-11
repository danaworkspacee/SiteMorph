import type { Metadata } from "next";
import Link from "next/link";
import Footer from "~/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy — SiteMorph",
  description:
    "How SiteMorph handles the URLs you submit and the files it mirrors. What is stored, for how long, and what is never collected.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col relative">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <Link href="/" className="text-sm text-[#757575] hover:text-black">
          &larr; SiteMorph
        </Link>
        <h1 className="mt-6 text-4xl font-medium tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: November 11, 2026
        </p>

        <div className="mt-8 flex flex-col gap-8 text-base leading-relaxed text-muted-foreground">
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              1. What we collect
            </h2>
            <p>
              SiteMorph does not ask you to create an account, and it does
              not collect your name, email address, or payment details. When
              you use the service, we process:
            </p>
            <ul className="flex list-disc flex-col gap-2 pl-6">
              <li>
                <span className="font-medium text-foreground">
                  The URL you submit.
                </span>{" "}
                It is used to load and mirror that website, and to name the
                output folder and ZIP file.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  The mirrored files.
                </span>{" "}
                The pages, images, and assets copied from the submitted site
                are stored temporarily on our server under a folder named
                after the site&apos;s hostname.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Anonymous usage statistics.
                </span>{" "}
                The website uses Vercel Analytics, which measures page views
                without cookies and without identifying individual visitors.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              2. How mirrored files are stored
            </h2>
            <p>
              The mirrored files are kept on the server until the same
              hostname is mirrored again, at which point the previous copy is
              replaced. A copy may also be stored in Cloudflare R2 object
              storage, where it is likewise replaced the next time the same
              hostname is mirrored. The ZIP file sent to you as a download is
              deleted from the server about one minute after the download
              finishes or fails.
            </p>
            <p>
              The API checks an API key (<code className="text-sm">x-api-key</code>)
              to authorize requests. The key itself is not stored together
              with your submissions or used to identify you.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              3. What we never do
            </h2>
            <ul className="flex list-disc flex-col gap-2 pl-6">
              <li>We do not sell your data or the mirrored files.</li>
              <li>We do not show ads or use tracking cookies.</li>
              <li>
                We do not share your submissions with advertisers or data
                brokers.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              4. Third-party services
            </h2>
            <p>
              The service runs on Vercel (hosting and anonymous analytics)
              and may store mirrored files in Cloudflare R2 (object
              storage). Those providers process data under their own privacy
              policies. The mirrored content itself belongs to the owners of
              the websites you submit. SiteMorph claims no ownership over
              it.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              5. Deletion requests
            </h2>
            <p>
              If you want a stored mirror copy of a website removed, or you
              believe a mirror infringes your rights, contact the operator
              through{" "}
              <Link
                href="https://danaworkspace.my.id/"
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline hover:text-[#0075de]"
              >
                danaworkspace.my.id
              </Link>{" "}
              with the hostname and we will remove it.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              6. Changes to this policy
            </h2>
            <p>
              This policy may be updated from time to time. The “Last
              updated” date above will change when that happens.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
