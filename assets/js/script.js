import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const siteHeader = document.querySelector("#site-header");
const scrollProgress = document.querySelector("#scroll-progress");
const menuToggle = document.querySelector("#menu-toggle");
const navPanel = document.querySelector("#nav-panel");
const navLinks = document.querySelector("#nav-links");
const navBackdrop = document.querySelector("#nav-backdrop");
const desktopNav = document.querySelector("#desktop-nav");
const desktopNavHover = document.querySelector("#desktop-nav-hover");
const desktopNavOverlay = document.querySelector("#desktop-nav-overlay");
const desktopNavLinks = Array.from(document.querySelectorAll("[data-nav-link]"));
const lightbox = document.querySelector("#lightbox");
const lightboxBackdrop = document.querySelector("#lightbox-backdrop");
const lightboxClose = document.querySelector("#lightbox-close");
const lightboxImg = document.querySelector("#lightbox-img");
const lightboxCaption = document.querySelector("#lightbox-caption");
const mediaTriggers = document.querySelectorAll(".media-trigger");
const ambientVideos = document.querySelectorAll(".ambient-video");

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let prefersReducedMotion = reducedMotionQuery.matches;
reducedMotionQuery.addEventListener("change", (event) => {
	prefersReducedMotion = event.matches;
});

// =========================================================
// 0. Lenis Smooth Scroll + GSAP ScrollTrigger Sync
// =========================================================
let lenis = null;
const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

if (hasGsap) {
	window.gsap.registerPlugin(window.ScrollTrigger);
}

if (typeof window.Lenis !== "undefined" && !prefersReducedMotion) {
	lenis = new window.Lenis({
		duration: 1.05,
		easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
		smoothWheel: true,
		touchMultiplier: 1.4,
	});

	if (hasGsap) {
		lenis.on("scroll", window.ScrollTrigger.update);
		window.gsap.ticker.add((time) => {
			lenis.raf(time * 1000);
		});
		window.gsap.ticker.lagSmoothing(0);
	} else {
		const rafLenis = (time) => {
			lenis.raf(time);
			requestAnimationFrame(rafLenis);
		};
		requestAnimationFrame(rafLenis);
	}
}

// Smooth anchor navigation via Lenis (or native fallback)
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
	anchor.addEventListener("click", (event) => {
		const id = anchor.getAttribute("href");
		if (!id || id === "#") return;
		const target = document.querySelector(id);
		if (!target) return;

		if (lenis) {
			event.preventDefault();
			lenis.scrollTo(target, { offset: -88 });
		}
	});
});

// =========================================================
// 1. Three.js 3D Voxel / Pixel-Art Scene (cohesive with pixel-art videos)
// =========================================================
const initThreeScene = () => {
	const canvas = document.querySelector("#shader-canvas");
	if (!canvas) return;

	let renderer;
	try {
		renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
			powerPreference: "high-performance",
		});
	} catch {
		return;
	}

	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
	renderer.setSize(window.innerWidth, window.innerHeight);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 100);
	camera.position.set(0, 0, 8.8);

	// Crisp arcade-studio lighting: chartreuse-lime + cyber-cyan + rim
	scene.add(new THREE.AmbientLight(0x1b2230, 1.5));

	const limeLight = new THREE.PointLight(0xc8ff3d, 30, 26);
	limeLight.position.set(4.5, 3.0, 5.2);
	scene.add(limeLight);

	const cyanLight = new THREE.PointLight(0x4ce0ff, 24, 26);
	cyanLight.position.set(-4.8, -2.5, 4.5);
	scene.add(cyanLight);

	const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
	rimLight.position.set(0, 5, -4);
	scene.add(rimLight);

	// Floating 3D Voxel Cluster (pixel-art blocks in 3D space)
	const voxelGroup = new THREE.Group();
	voxelGroup.position.set(2.2, 0.1, -1.2);
	scene.add(voxelGroup);

	const voxelSpecs = [];
	const gridRange = 2;
	const spacing = 0.62;

	for (let x = -gridRange; x <= gridRange; x++) {
		for (let y = -gridRange; y <= gridRange; y++) {
			for (let z = -gridRange; z <= gridRange; z++) {
				const dist = Math.abs(x) + Math.abs(y) + Math.abs(z);
				// Sculpt a stepped 3D pixel diamond/cluster with airy gaps
				if (dist <= 3 && (dist === 0 || ((x * 7 + y * 13 + z * 17) & 3) !== 0)) {
					voxelSpecs.push({
						bx: x * spacing,
						by: y * spacing,
						bz: z * spacing,
						phase: x * 0.9 + y * 1.1 + z * 0.7,
						scale: dist === 0 ? 1.05 : dist === 3 ? 0.62 : 0.84,
						isAccent: dist === 3 && ((x + y + z) & 1) === 0,
					});
				}
			}
		}
	}

	const boxGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
	const darkVoxelMat = new THREE.MeshStandardMaterial({
		color: 0x0e131d,
		metalness: 0.72,
		roughness: 0.24,
	});
	const accentVoxelMat = new THREE.MeshStandardMaterial({
		color: 0xc8ff3d,
		emissive: 0x5c7a12,
		emissiveIntensity: 0.55,
		metalness: 0.35,
		roughness: 0.28,
	});

	const voxels = voxelSpecs.map((spec) => {
		const mesh = new THREE.Mesh(boxGeo, spec.isAccent ? accentVoxelMat : darkVoxelMat);
		mesh.position.set(spec.bx, spec.by, spec.bz);
		mesh.scale.setScalar(spec.scale);
		voxelGroup.add(mesh);
		return { mesh, spec };
	});

	// Outer stepped wireframe bounding cube for retro-3D framing
	const outerCube = new THREE.LineSegments(
		new THREE.EdgesGeometry(new THREE.BoxGeometry(3.8, 3.8, 3.8)),
		new THREE.LineBasicMaterial({ color: 0xc8ff3d, transparent: true, opacity: 0.16 }),
	);
	voxelGroup.add(outerCube);

	// Square pixel particles drifting in depth
	const particleCount = 140;
	const positions = new Float32Array(particleCount * 3);
	for (let i = 0; i < particleCount; i++) {
		positions[i * 3] = (Math.random() - 0.5) * 22;
		positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
		positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
	}
	const particleGeo = new THREE.BufferGeometry();
	particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	const particleMat = new THREE.PointsMaterial({
		color: 0xc8ff3d,
		size: 0.085,
		transparent: true,
		opacity: 0.45,
	});
	const particles = new THREE.Points(particleGeo, particleMat);
	scene.add(particles);

	let targetMouseX = 0;
	let targetMouseY = 0;
	let mouseX = 0;
	let mouseY = 0;
	let rafId = null;
	const clock = new THREE.Clock();

	window.addEventListener(
		"pointermove",
		(event) => {
			if (event.pointerType === "touch") return;
			targetMouseX = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
			targetMouseY = -((event.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
		},
		{ passive: true },
	);

	window.addEventListener(
		"resize",
		() => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
			voxelGroup.position.x = window.innerWidth < 960 ? 0 : 2.2;
		},
		{ passive: true },
	);
	voxelGroup.position.x = window.innerWidth < 960 ? 0 : 2.2;

	const renderLoop = () => {
		const t = clock.getElapsedTime();
		const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
		const scrollNorm = window.scrollY / docH;

		mouseX += (targetMouseX - mouseX) * 0.055;
		mouseY += (targetMouseY - mouseY) * 0.055;

		voxelGroup.rotation.x = 0.35 + t * 0.14 + scrollNorm * Math.PI * 1.1 + mouseY * 0.32;
		voxelGroup.rotation.y = 0.55 + t * 0.19 + scrollNorm * Math.PI * 1.5 + mouseX * 0.42;

		// Subtle breathing expansion on scroll + individual voxel bobbing
		const spread = 1 + Math.sin(scrollNorm * Math.PI) * 0.18;
		for (const { mesh, spec } of voxels) {
			const bob = Math.sin(t * 1.4 + spec.phase) * 0.055;
			mesh.position.set(spec.bx * spread, spec.by * spread + bob, spec.bz * spread);
		}

		const baseX = window.innerWidth < 960 ? 0 : 2.2 - Math.sin(scrollNorm * Math.PI) * 3.4;
		voxelGroup.position.x += (baseX - voxelGroup.position.x) * 0.06;
		voxelGroup.position.y = Math.sin(t * 0.65) * 0.18 - scrollNorm * 0.7;

		particles.rotation.y = t * 0.02 + mouseX * 0.08;
		particles.rotation.x = mouseY * 0.05;

		limeLight.position.x = 3.5 + mouseX * 2.8;
		limeLight.position.y = 2.5 + mouseY * 2.2;

		renderer.render(scene, camera);

		if (!prefersReducedMotion && !document.hidden) {
			rafId = requestAnimationFrame(renderLoop);
		} else {
			rafId = null;
		}
	};

	const start = () => {
		if (rafId === null) rafId = requestAnimationFrame(renderLoop);
	};

	document.addEventListener("visibilitychange", () => {
		if (document.hidden && rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		} else if (!document.hidden && !prefersReducedMotion) {
			start();
		}
	});

	start();
};

initThreeScene();

// =========================================================
// 2. Ambient Video Performance Guard (play only when visible)
// =========================================================
if (ambientVideos.length > 0) {
	if (prefersReducedMotion) {
		ambientVideos.forEach((video) => video.pause());
	} else if ("IntersectionObserver" in window) {
		const videoObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const video = entry.target;
					if (entry.isIntersecting) {
						video.play().catch(() => {});
					} else {
						video.pause();
					}
				});
			},
			{ threshold: 0.05 },
		);
		ambientVideos.forEach((video) => videoObserver.observe(video));
	}
}

// =========================================================
// 3. Mobile Navigation Drawer + Vaul-style Swipe-to-Dismiss
// =========================================================
const isMenuOpen = () => menuToggle?.getAttribute("aria-expanded") === "true";

const setMenuOpen = (isOpen) => {
	if (!navPanel || !navBackdrop || !menuToggle) return;
	navPanel.classList.remove("is-dragging");
	navBackdrop.classList.remove("is-dragging");
	navPanel.style.transform = "";
	navBackdrop.style.opacity = "";

	navPanel.classList.toggle("active", isOpen);
	navBackdrop.classList.toggle("active", isOpen);
	menuToggle.classList.toggle("active", isOpen);
	menuToggle.setAttribute("aria-expanded", String(isOpen));
	menuToggle.setAttribute("aria-label", isOpen ? "Fechar navegação" : "Abrir navegação");
	navPanel.inert = !isOpen;
};

menuToggle?.addEventListener("click", () => setMenuOpen(!isMenuOpen()));
navBackdrop?.addEventListener("click", () => setMenuOpen(false));
navLinks?.querySelectorAll("a").forEach((link) => {
	link.addEventListener("click", () => setMenuOpen(false));
});

if (navPanel && navBackdrop) {
	let activePointerId = null;
	let isDragging = false;
	let startX = 0;
	let startY = 0;
	let lastDeltaX = 0;
	let dragStartTime = 0;

	navPanel.addEventListener("pointerdown", (event) => {
		if (!isMenuOpen() || activePointerId !== null || event.button > 0) return;
		activePointerId = event.pointerId;
		isDragging = false;
		startX = event.clientX;
		startY = event.clientY;
		lastDeltaX = 0;
		dragStartTime = performance.now();
	});

	navPanel.addEventListener("pointermove", (event) => {
		if (event.pointerId !== activePointerId) return;
		const dx = event.clientX - startX;
		const dy = event.clientY - startY;

		if (!isDragging) {
			if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
				activePointerId = null;
				return;
			}
			if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15) {
				isDragging = true;
				navPanel.setPointerCapture(event.pointerId);
				navPanel.classList.add("is-dragging");
				navBackdrop.classList.add("is-dragging");
			} else {
				return;
			}
		}

		lastDeltaX = dx;
		const panelWidth = navPanel.offsetWidth || 320;
		const dampedX = dx < 0 ? -Math.pow(Math.abs(dx), 0.65) : dx;
		navPanel.style.transform = `translateX(${dampedX.toFixed(1)}px)`;

		const progress = Math.max(0, Math.min(1, dx / panelWidth));
		navBackdrop.style.opacity = String((1 - progress * 0.85).toFixed(3));
	});

	const finishDrawerGesture = (event) => {
		if (event.pointerId !== activePointerId) return;
		const wasDragging = isDragging;
		activePointerId = null;
		isDragging = false;
		if (!wasDragging) return;

		const elapsed = Math.max(1, performance.now() - dragStartTime);
		const velocity = lastDeltaX / elapsed;
		setMenuOpen(!(lastDeltaX >= 90 || velocity > 0.11));
	};

	navPanel.addEventListener("pointerup", finishDrawerGesture);
	navPanel.addEventListener("pointercancel", finishDrawerGesture);
}

// =========================================================
// 4. Dual-Layer clip-path Navbar + Instant-Origin Hover Pill
// =========================================================
let activeNavLink = null;
let navScrollLockTimer = null;
let isNavScrollLocked = false;

const computeInsetClip = (referenceEl, targetEl) => {
	const refRect = referenceEl.getBoundingClientRect();
	const targetRect = targetEl.getBoundingClientRect();
	if (refRect.width === 0 || refRect.height === 0) return null;

	const top = Math.max(0, targetRect.top - refRect.top);
	const left = Math.max(0, targetRect.left - refRect.left);
	const right = Math.max(0, refRect.right - targetRect.right);
	const bottom = Math.max(0, refRect.bottom - targetRect.bottom);

	return `inset(${top.toFixed(1)}px ${right.toFixed(1)}px ${bottom.toFixed(1)}px ${left.toFixed(1)}px round 999px)`;
};

const syncNavClip = (link) => {
	if (!desktopNav || !desktopNavOverlay) return;
	if (!link) {
		desktopNav.classList.remove("has-indicator");
		return;
	}

	const wasHidden = !desktopNav.classList.contains("has-indicator");
	const clip = computeInsetClip(desktopNavOverlay, link);
	if (!clip) return;

	if (wasHidden) desktopNavOverlay.dataset.instant = "true";
	desktopNavOverlay.style.clipPath = clip;
	desktopNav.classList.add("has-indicator");

	if (wasHidden) {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				delete desktopNavOverlay.dataset.instant;
			});
		});
	}
};

const setActiveNav = (targetLink) => {
	if (activeNavLink === targetLink) return;
	activeNavLink = targetLink;
	desktopNavLinks.forEach((l) => l.classList.toggle("is-active", l === targetLink));
	syncNavClip(targetLink);
};

if (desktopNav && desktopNavHover && desktopNavLinks.length > 0) {
	desktopNavLinks.forEach((link) => {
		link.addEventListener("pointerenter", (event) => {
			if (event.pointerType === "touch") return;
			const wasHidden = desktopNavHover.dataset.visible !== "true";
			const clip = computeInsetClip(desktopNavHover, link);
			if (!clip) return;

			if (wasHidden) desktopNavHover.dataset.instant = "true";
			desktopNavHover.style.clipPath = clip;
			desktopNavHover.dataset.visible = "true";

			if (wasHidden) {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						delete desktopNavHover.dataset.instant;
					});
				});
			}
		});
	});

	desktopNav.addEventListener("pointerleave", () => {
		desktopNavHover.dataset.visible = "false";
	});
}

const lockNavObserverBriefly = () => {
	isNavScrollLocked = true;
	clearTimeout(navScrollLockTimer);
	navScrollLockTimer = setTimeout(() => {
		isNavScrollLocked = false;
	}, 950);
};

if ("IntersectionObserver" in window && desktopNavLinks.length > 0) {
	const sectionMap = new Map();
	desktopNavLinks.forEach((link) => {
		const id = link.getAttribute("href");
		const section = id ? document.querySelector(id) : null;
		if (section) sectionMap.set(section, link);

		link.addEventListener("click", () => {
			lockNavObserverBriefly();
			setActiveNav(link);
		});
	});

	const navObserver = new IntersectionObserver(
		(entries) => {
			if (isNavScrollLocked) return;
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const matched = sectionMap.get(entry.target);
					if (matched) setActiveNav(matched);
				}
			});
		},
		{ rootMargin: "-30% 0px -56% 0px", threshold: 0 },
	);

	sectionMap.forEach((_, section) => navObserver.observe(section));

	const heroSection = document.querySelector("#hero");
	if (heroSection) {
		const heroObserver = new IntersectionObserver(
			(entries) => {
				if (!isNavScrollLocked && entries[0]?.isIntersecting) {
					setActiveNav(null);
				}
			},
			{ threshold: 0.55 },
		);
		heroObserver.observe(heroSection);
	}

	window.addEventListener(
		"resize",
		() => {
			if (activeNavLink) syncNavClip(activeNavLink);
		},
		{ passive: true },
	);
}

// =========================================================
// 5. Sticky Header Chrome + Linear Scroll Progress Bar
// =========================================================
const updateScrollChrome = () => {
	const scrollTop = window.scrollY;
	const docHeight = document.documentElement.scrollHeight - window.innerHeight;
	const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

	if (siteHeader) siteHeader.classList.toggle("is-scrolled", scrollTop > 16);
	if (scrollProgress) scrollProgress.style.transform = `scaleX(${progress.toFixed(4)})`;

	if (!isNavScrollLocked && docHeight > 0 && scrollTop >= docHeight - 24 && desktopNavLinks.length > 0) {
		setActiveNav(desktopNavLinks[desktopNavLinks.length - 1]);
	}
};

window.addEventListener("scroll", updateScrollChrome, { passive: true });
updateScrollChrome();

// =========================================================
// 6. Spring-Interpolated 3D Tilt + Pointer Spotlight
// =========================================================
if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !prefersReducedMotion) {
	const tiltItems = [
		{ el: document.querySelector(".avatar-ring"), maxTilt: 7 },
		...Array.from(document.querySelectorAll(".project-card")).map((el) => ({ el, maxTilt: 2.6 })),
		...Array.from(document.querySelectorAll(".services .card")).map((el) => ({ el, maxTilt: 3.2 })),
	]
		.filter((item) => item.el)
		.map((item) => ({
			...item,
			rx: 0,
			ry: 0,
			vx: 0,
			vy: 0,
			tx: 0,
			ty: 0,
			active: false,
		}));

	let tiltRaf = null;
	const STIFFNESS = 0.14;
	const DAMPING = 0.76;

	const tickTilt = () => {
		let stillMoving = false;

		for (const item of tiltItems) {
			const ax = (item.tx - item.rx) * STIFFNESS;
			const ay = (item.ty - item.ry) * STIFFNESS;
			item.vx = (item.vx + ax) * DAMPING;
			item.vy = (item.vy + ay) * DAMPING;
			item.rx += item.vx;
			item.ry += item.vy;

			const moving =
				Math.abs(item.tx - item.rx) > 0.015 ||
				Math.abs(item.ty - item.ry) > 0.015 ||
				Math.abs(item.vx) > 0.015 ||
				Math.abs(item.vy) > 0.015;

			if (moving) {
				stillMoving = true;
				item.el.style.transform = `perspective(1000px) rotateX(${item.rx.toFixed(2)}deg) rotateY(${item.ry.toFixed(2)}deg)`;
			} else if (!item.active && (item.rx !== 0 || item.ry !== 0)) {
				item.rx = 0;
				item.ry = 0;
				item.vx = 0;
				item.vy = 0;
				item.el.style.transform = "";
			}
		}

		tiltRaf = stillMoving ? requestAnimationFrame(tickTilt) : null;
	};

	const wakeTilt = () => {
		if (tiltRaf === null) tiltRaf = requestAnimationFrame(tickTilt);
	};

	tiltItems.forEach((item) => {
		item.el.addEventListener("pointermove", (event) => {
			if (event.pointerType === "touch") return;
			const rect = item.el.getBoundingClientRect();
			const px = (event.clientX - rect.left) / rect.width;
			const py = (event.clientY - rect.top) / rect.height;

			item.el.style.setProperty("--spot-x", `${(event.clientX - rect.left).toFixed(1)}px`);
			item.el.style.setProperty("--spot-y", `${(event.clientY - rect.top).toFixed(1)}px`);

			item.active = true;
			item.tx = (0.5 - py) * item.maxTilt * 2;
			item.ty = (px - 0.5) * item.maxTilt * 2;
			wakeTilt();
		});

		item.el.addEventListener("pointerleave", () => {
			item.active = false;
			item.tx = 0;
			item.ty = 0;
			wakeTilt();
		});
	});
}

// =========================================================
// 7. Screenshot Lightbox Modal (scale 0.95 -> 1, asymmetric)
// =========================================================
let lastLightboxTrigger = null;

const openLightbox = (trigger) => {
	if (!lightbox || !lightboxImg || !lightboxCaption) return;
	const src = trigger.dataset.lightboxSrc;
	const alt = trigger.dataset.lightboxAlt || "";
	const caption = trigger.dataset.lightboxCaption || "";
	if (!src) return;

	lastLightboxTrigger = trigger;
	lightboxImg.src = src;
	lightboxImg.alt = alt;
	lightboxCaption.textContent = caption;

	lightbox.inert = false;
	lightbox.setAttribute("aria-hidden", "false");
	lightbox.classList.add("is-open");
	lenis?.stop();
	lightboxClose?.focus();
};

const closeLightbox = () => {
	if (!lightbox || !lightbox.classList.contains("is-open")) return;
	lightbox.classList.remove("is-open");
	lightbox.setAttribute("aria-hidden", "true");
	lightbox.inert = true;
	lenis?.start();

	if (lastLightboxTrigger) {
		lastLightboxTrigger.focus();
		lastLightboxTrigger = null;
	}
};

mediaTriggers.forEach((trigger) => {
	trigger.addEventListener("click", () => openLightbox(trigger));
});

lightboxClose?.addEventListener("click", closeLightbox);
lightboxBackdrop?.addEventListener("click", closeLightbox);

document.addEventListener("keydown", (event) => {
	if (event.key !== "Escape") return;
	if (lightbox?.classList.contains("is-open")) {
		closeLightbox();
		return;
	}
	if (isMenuOpen()) {
		setMenuOpen(false);
		menuToggle?.focus();
	}
});

// =========================================================
// 8. GSAP ScrollTrigger Parallax + Non-Uniform Wave Reveals
// =========================================================
const revealTargets = document.querySelectorAll(
	".section-heading, .section-header-inline, .about-body p, .timeline-card, .services .card, .stack-group, .project-card, .contact-box",
);

if (prefersReducedMotion) {
	revealTargets.forEach((target) => target.classList.add("is-visible", "reveal-done"));
} else if (hasGsap) {
	// Subtle scroll-linked parallax on Hero portrait
	const heroPortrait = document.querySelector(".hero-portrait");
	if (heroPortrait) {
		window.gsap.to(heroPortrait, {
			y: -36,
			ease: "none",
			scrollTrigger: {
				trigger: "#hero",
				start: "top top",
				end: "bottom top",
				scrub: true,
			},
		});
	}

	// Choreographed GSAP reveals (clearProps on complete so hover & 3D tilt remain instant)
	document.documentElement.classList.add("scroll-reveal-enabled");
	revealTargets.forEach((target) => target.classList.add("is-visible", "reveal-done"));

	const staggerGroups = [
		".about-body p",
		".timeline-card",
		".services .card",
		".stack-group",
		".project-card",
	];

	staggerGroups.forEach((selector) => {
		const items = document.querySelectorAll(selector);
		if (!items.length) return;
		window.gsap.from(items, {
			y: 26,
			opacity: 0,
			duration: 0.62,
			ease: "power3.out",
			stagger: 0.065,
			clearProps: "transform,opacity",
			scrollTrigger: {
				trigger: items[0],
				start: "top 86%",
				once: true,
			},
		});
	});

	// Curtain clip-path reveal on project screenshots
	document.querySelectorAll(".project-media img").forEach((img) => {
		window.gsap.fromTo(
			img,
			{ clipPath: "inset(0 0 100% 0)", scale: 1.04 },
			{
				clipPath: "inset(0 0 0% 0)",
				scale: 1,
				duration: 0.78,
				ease: "power3.out",
				clearProps: "transform,clipPath",
				scrollTrigger: {
					trigger: img,
					start: "top 88%",
					once: true,
				},
			},
		);
	});
} else {
	revealTargets.forEach((target) => target.classList.add("is-visible", "reveal-done"));
}
