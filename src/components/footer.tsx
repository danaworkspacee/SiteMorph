import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-black/10">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="text-lg font-semibold text-black">SiteMorph</p>
            <p className="mt-2 text-sm leading-relaxed text-[#757575]">
              Morph any website into clean, readable HTML + Tailwind. Get the files instantly and deploy them anywhere.
            </p>
          </div>
          <div className="flex gap-16">
            <div>
              <p className="text-sm font-medium text-black">Legal</p>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <Link href="/terms" className="text-sm text-black/60 hover:text-black">Terms of Service</Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-black/60 hover:text-black">Privacy Policy</Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-black">Contact</p>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <Link href="https://danaworkspace.my.id/" target="_blank" rel="noreferrer" className="text-sm text-[#0075de] hover:underline">danaworkspace.my.id</Link>
                </li>
                <li>
                  <Link href="mailto:dana.workspacee@gmail.com" className="text-sm text-[#0075de] hover:underline">dana.workspacee@gmail.com</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#757575]">
            &copy; {new Date().getFullYear()} SiteMorph. All rights reserved.
          </p>
          <p className="text-sm text-[#757575]">
            No account needed. No API key. Just the files.
          </p>
        </div>
      </div>
    </footer>
  );
}
