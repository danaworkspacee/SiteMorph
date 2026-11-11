"use client";

import { Maximize2, X } from "lucide-react";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface DemoProps {
	title?: string;
	description?: string;
	videoSrc: string;
	thumbnailSrc?: string;
	className?: string;
	captionsSrc?: string;
}

export default function Demo({
	title = "Watch SiteMorph in Action",
	description = "See how SiteMorph transforms a website into clean, deployable code.",
	videoSrc,
	thumbnailSrc,
	className = "",
}: DemoProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isVideoPlaying, setIsVideoPlaying] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	const modalVideoRef = useRef<HTMLVideoElement>(null);

	const handlePlayClick = () => {
		setIsModalOpen(true);
	};

	// Handle escape key to close modal
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsModalOpen(false);
			}
		};

		window.addEventListener("keydown", handleEsc);

		return () => {
			window.removeEventListener("keydown", handleEsc);
		};
	}, []);

	// Play video when modal opens
	useEffect(() => {
		if (isModalOpen && modalVideoRef.current) {
			modalVideoRef.current.play();
		}
	}, [isModalOpen]);

	// Ensure video autoplays when component mounts
	useEffect(() => {
		if (videoRef.current) {
			videoRef.current.play().then(() => {
				setIsVideoPlaying(true);
			}).catch((error) => {
				console.log('Autoplay prevented:', error);
			});
		}
	}, []);

	// Handle video play events
	const handleVideoPlay = () => {
		setIsVideoPlaying(true);
	};

	const handleVideoPause = () => {
		setIsVideoPlaying(false);
	};

	return (
		<div className="py-14 sm:px-0 px-4">
			<div className="flex flex-col items-center justify-center gap-4 max-w-2xl mx-auto mb-8">
				<h2 className="text-4xl font-medium tracking-[-0.035em] leading-[1.1] text-black text-center">
					{title}
				</h2>
				<p className="font-serif text-lg leading-relaxed text-[#615d59] text-center max-w-md">
					{description}
				</p>
			</div>
			<div className="bg-white border border-black/10 rounded-xl p-2 max-w-3xl mx-auto">
				<div
					className={`relative w-full max-w-3xl mx-auto rounded-lg overflow-hidden ${className}`}
				>
					{/* Autoplay video */}
					<div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
						<video
							ref={videoRef}
							src={videoSrc}
							poster={thumbnailSrc}
							className="w-full h-full object-cover cursor-pointer"
							muted
							autoPlay
							loop
							playsInline
							preload="auto"
							onClick={handlePlayClick}
							onPlay={handleVideoPlay}
							onPause={handleVideoPause}
							aria-describedby="video-description"
						>
							<track
								kind="captions"
								label="No captions needed"
								srcLang="en"
								default
							/>
							Your browser does not support the video tag.
						</video>
						<span id="video-description" className="sr-only">
							Demonstration video showing how SiteMorph turns a website into clean HTML + Tailwind. No captions
							are necessary as this is primarily a visual demo with no speech.
						</span>

						{/* Click to expand overlay - only show when video is not playing */}
						{!isVideoPlaying && (
							<div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-30 transition-all duration-300 cursor-pointer"
								onClick={handlePlayClick}
							>
								{/* Expand icon */}
								<motion.div
									className="relative w-16 h-16 bg-[#0075de] rounded-full flex items-center justify-center mb-4 z-10"
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.95 }}
									aria-label="Expand video to full screen"
								>
									<Maximize2 className="h-8 w-8 text-white" aria-hidden="true" />
								</motion.div>

								{/* Text below the expand button */}
								<p className="text-white text-sm">Click to expand</p>
							</div>
						)}
					</div>
				</div>

				{/* Video Modal */}
				<AnimatePresence>
					{isModalOpen && (
						<motion.div
							className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setIsModalOpen(false)}
						>
							<motion.div
								className="relative w-full max-w-5xl mx-4 rounded-lg overflow-hidden"
								initial={{ scale: 0.8, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0.8, opacity: 0 }}
								transition={{ type: "spring", damping: 25 }}
								onClick={(e) => e.stopPropagation()}
							>
								{/* Close button */}
								<button
									className="absolute -top-10 right-0 text-white hover:text-gray-300 z-10"
									onClick={() => setIsModalOpen(false)}
									aria-label="Close video"
									type="button"
								>
									<X className="h-8 w-8" aria-hidden="true" />
								</button>

								{/* Video player */}
								<div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
									<video
										ref={modalVideoRef}
										src={videoSrc}
										className="w-full h-full"
										controls
										playsInline
										muted
										onEnded={() => setIsModalOpen(false)}
									>
										<track
											kind="captions"
											label="No captions needed"
											srcLang="en"
											default
										/>
										Your browser does not support the video tag.
									</video>
								</div>
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
