import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";

export default function Faq() {
	return (
		<div className="flex flex-col items-center justify-center gap-10 px-4 py-20">
			<div className="flex flex-col items-center justify-center gap-4 max-w-2xl text-center">
				<h2 className="text-5xl font-medium tracking-[-0.035em] leading-[1.04] text-black">
					Frequently Asked Questions
				</h2>
				<p className="font-serif text-lg leading-relaxed text-[#615d59]">
					Everything you need to know about SiteMorph. Find answers to common questions.
				</p>
			</div>
			<div className="w-full max-w-4xl">
				<Accordion
					type="single"
					collapsible
					className="w-full flex flex-col gap-4"
				>
					<AccordionItem value="item-1">
						<AccordionTrigger className="hover:no-underline text-base">
							What is SiteMorph?
						</AccordionTrigger>
						<AccordionContent className="text-[#615d59] text-base">
							SiteMorph lets you morph any website (Framer, Webflow, WordPress, or plain HTML) into clean, readable HTML + Tailwind.
							Paste a site URL to extract static HTML, then host it anywhere.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="item-2">
						<AccordionTrigger className="hover:no-underline text-base">
							How do I use SiteMorph?
						</AccordionTrigger>
						<AccordionContent className="text-[#615d59] text-base">
							Enter any website URL and click "Download".
							We’ll mirror the site and give you a ZIP with clean HTML + Tailwind files.
							Deployment features are coming soon.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="item-3">
						<AccordionTrigger className="hover:no-underline text-base">
							What features are coming soon?
						</AccordionTrigger>
						<AccordionContent className="text-[#615d59] text-base">
							We're working on adding direct deployment options to various hosting platforms,
							advanced customization features, and analytics integration. Stay tuned for these
							exciting updates!
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="item-4">
						<AccordionTrigger className="hover:no-underline text-base">
							Is SiteMorph free to use?
						</AccordionTrigger>
						<AccordionContent className="text-[#615d59] text-base">
							The basic download functionality is free to use. Premium features like
							deployment options and advanced customization will be available with
							subscription plans in the future.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</div>
	);
}
