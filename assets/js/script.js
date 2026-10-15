const menuToggle = document.querySelector("#menu-toggle");
const navPanel = document.querySelector("#nav-panel");
const navLinks = document.querySelector("#nav-links");
const navBackdrop = document.querySelector("#nav-backdrop");

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


const revealTargets = document.querySelectorAll(
	".hero-text, .section-title, .about p, .timeline .card, .section-description, .tech-grid > div, .projects p, .contact .container > p, .contact-links a, footer h2, footer p",
);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
	revealTargets.forEach((target) => target.classList.add("is-visible"));
} else {
	document.documentElement.classList.add("scroll-reveal-enabled");

	for (const group of [".timeline .card", ".tech-grid > div", ".contact-links a"]) {
		document.querySelectorAll(group).forEach((item, index) => {
			item.style.setProperty("--reveal-delay", `${Math.min(index * 80, 320)}ms`);
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
		{ threshold: 0.14, rootMargin: "0px 0px -36px 0px" },
	);

	revealTargets.forEach((target) => {
		target.classList.add("scroll-reveal");
		revealObserver.observe(target);
	});
}
