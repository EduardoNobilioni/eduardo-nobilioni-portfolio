const siteHeader = document.querySelector("#site-header");
const scrollProgress = document.querySelector("#scroll-progress");
const menuToggle = document.querySelector("#menu-toggle");
const navPanel = document.querySelector("#nav-panel");
const navLinks = document.querySelector("#nav-links");
const navBackdrop = document.querySelector("#nav-backdrop");
const desktopNavLinks = document.querySelectorAll("[data-nav-link]");

const setMenuOpen = (isOpen) => {
	navPanel.classList.toggle("active", isOpen);
	navBackdrop.classList.toggle("active", isOpen);
	menuToggle.classList.toggle("active", isOpen);
	menuToggle.setAttribute("aria-expanded", String(isOpen));
	menuToggle.setAttribute("aria-label", isOpen ? "Fechar navegação" : "Abrir navegação");
	navPanel.inert = !isOpen;
};

menuToggle.addEventListener("click", () => {
	const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
	setMenuOpen(!isExpanded);
});

navBackdrop.addEventListener("click", () => setMenuOpen(false));

navLinks.querySelectorAll("a").forEach((link) => {
	link.addEventListener("click", () => setMenuOpen(false));
});

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
		setMenuOpen(false);
		menuToggle.focus();
	}
});

// Sticky header border + top reading progress bar
const updateScrollChrome = () => {
	const scrollTop = window.scrollY;
	const docHeight = document.documentElement.scrollHeight - window.innerHeight;
	const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

	if (siteHeader) {
		siteHeader.classList.toggle("is-scrolled", scrollTop > 16);
	}
	if (scrollProgress) {
		scrollProgress.style.transform = `scaleX(${progress.toFixed(4)})`;
	}
};

window.addEventListener("scroll", updateScrollChrome, { passive: true });
updateScrollChrome();

// Highlight active section in desktop navigation
if ("IntersectionObserver" in window && desktopNavLinks.length > 0) {
	const sectionMap = new Map();
	desktopNavLinks.forEach((link) => {
		const id = link.getAttribute("href");
		const section = id ? document.querySelector(id) : null;
		if (section) sectionMap.set(section, link);
	});

	const navObserver = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					desktopNavLinks.forEach((l) => l.classList.remove("is-active"));
					const activeLink = sectionMap.get(entry.target);
					if (activeLink) activeLink.classList.add("is-active");
				}
			});
		},
		{ rootMargin: "-35% 0px -55% 0px", threshold: 0 },
	);

	sectionMap.forEach((_, section) => navObserver.observe(section));
}

// Smooth staggered reveal between sections and cards
const revealTargets = document.querySelectorAll(
	".hero-text, .hero-portrait, .section-heading, .section-header-inline, .about-body p, .timeline-card, .services .card, .stack-group, .project-card, .contact-box",
);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
	revealTargets.forEach((target) => target.classList.add("is-visible"));
} else {
	document.documentElement.classList.add("scroll-reveal-enabled");

	for (const group of [".about-body p", ".timeline-card", ".services .card", ".stack-group", ".project-card"]) {
		document.querySelectorAll(group).forEach((item, index) => {
			item.style.setProperty("--reveal-delay", `${Math.min(index * 90, 270)}ms`);
		});
	}

	const revealObserver = new IntersectionObserver(
		(entries, observer) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add("is-visible");
					observer.unobserve(entry.target);
				}
			});
		},
		{ threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
	);

	revealTargets.forEach((target) => {
		target.classList.add("scroll-reveal");
		revealObserver.observe(target);
	});
}
