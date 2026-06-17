/* =========================================================
   Portfolio script
   - Loads content.json
   - Renders ES/EN content
   - Handles nav, scroll-reveal, glitch text, language switch
   ========================================================= */

const STORAGE_KEY = "portfolio-lang";
const THEME_STORAGE_KEY = "portfolio-theme";
const THEMES = [
  { id: "default", label: "Red" },
  { id: "mono", label: "Mono" },
  { id: "frost", label: "Frost" },
];
let DATA = null;
let currentLang = "en";

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  init();
});

async function init() {
  try {
    const res = await fetch("content.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
  } catch (err) {
    console.error("No se pudo cargar content.json", err);
    showLoadError();
    return;
  }

  currentLang = localStorage.getItem(STORAGE_KEY) || "en";
  if (!DATA[currentLang]) currentLang = "en";

  render(currentLang);
  setupNav();
  setupLangSwitch();
  setupThemeSwitch();
  setupScrollReveal();
  setupBackToTop();
  setupProjectModal();
}

/* ---------- Load error banner ---------- */
function showLoadError() {
  const isFile = window.location.protocol === "file:";

  const banner = document.createElement("div");
  banner.className = "load-error";
  banner.innerHTML = `
    <div class="load-error__panel">
      <p class="load-error__title">No se ha podido cargar <code>content.json</code></p>
      ${
        isFile
          ? `<p>Estás abriendo el archivo directamente (<code>file://</code>), y los navegadores bloquean la carga de <code>content.json</code> en ese modo. Necesitas servir la carpeta con un pequeño servidor local:</p>
             <ul>
               <li><strong>Con Python:</strong> abre una terminal en esta carpeta y ejecuta <code>python3 -m http.server</code>, luego visita <code>http://localhost:8000</code>.</li>
               <li><strong>Con VS Code:</strong> instala la extensión "Live Server" y pulsa "Open with Live Server" sobre <code>index.html</code>.</li>
               <li><strong>Con Node:</strong> ejecuta <code>npx serve</code> en la carpeta.</li>
             </ul>`
          : `<p>Comprueba que el archivo <code>content.json</code> está en la misma carpeta que <code>index.html</code> y que el nombre coincide exactamente.</p>`
      }
    </div>
  `;
  document.body.prepend(banner);
}

/* ---------- Render ---------- */
function render(lang) {
  const t = DATA[lang];
  if (!t) return;

  document.documentElement.lang = lang;
  document.title = t.meta.title;

  /* Simple text bindings: data-i18n="path.to.key" */
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = getPath(t, el.getAttribute("data-i18n"));
    if (value !== undefined) el.textContent = value;
  });

  /* Text + data-text bindings (for glitch effect) */
  document.querySelectorAll("[data-i18n-text]").forEach((el) => {
    const value = getPath(t, el.getAttribute("data-i18n-text"));
    if (value !== undefined) {
      el.textContent = value;
      el.setAttribute("data-text", value);
    }
  });

  /* Language switch label */
  const langLabel = document.getElementById("langLabel");
  const langCurrent = document.querySelector(".lang-switch__current");
  if (langLabel) langLabel.textContent = t.meta.langLabel;
  if (langCurrent) langCurrent.textContent = lang.toUpperCase();

  renderProjects(t.projects);
  renderSkills(t.skills);
  renderTools(t.tools);
  renderAbout(t.about);
  renderContact(t.contact);
}

function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

/* ---------- Projects ---------- */
let currentProjectItems = [];
let currentProjectLabels = {};
let activeProjectIndex = 0;
let activeSlideIndex = 0;
let lastFocusedTrigger = null;

function renderProjects(projects) {
  currentProjectItems = projects.items;
  currentProjectLabels = projects.labels;

  const list = document.getElementById("projectList");
  list.innerHTML = "";

  projects.items.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = "project-item";

    const cover = item.media && item.media[0] ? item.media[0] : null;

    row.innerHTML = `
      <button class="project-item__head" type="button" aria-haspopup="dialog">
        <span class="project-item__id">${item.id}</span>
        <span class="project-item__thumb">
          ${cover ? `<img src="${cover.src}" alt="" loading="lazy" />` : ""}
        </span>
        <span class="project-item__name">${item.name}</span>
        <span class="project-item__meta">
          <span class="project-item__category">${item.category}</span>
          <span class="project-item__year">${item.year}</span>
        </span>
        <span class="project-item__icon" aria-hidden="true">&#8594;</span>
      </button>
    `;

    const btn = row.querySelector(".project-item__head");
    btn.addEventListener("click", () => openProjectModal(index, btn));

    list.appendChild(row);
  });

  /* Keep modal labels in sync with current language */
  applyModalLabels(projects.labels);

  /* If a modal is currently open, refresh its content for the new language */
  const modal = document.getElementById("projectModal");
  if (modal.classList.contains("is-open")) {
    fillModal(currentProjectItems[activeProjectIndex]);
  }
}

function applyModalLabels(labels) {
  document.getElementById("modalCloseLabel").textContent = labels.close;
  document.getElementById("modalDescriptionLabel").textContent = labels.description;
  document.getElementById("modalRoleLabel").textContent = labels.role;
  document.getElementById("modalLinksLabel").textContent = labels.links;
  document.getElementById("carouselPrevLabel").textContent = labels.prev;
  document.getElementById("carouselNextLabel").textContent = labels.next;
}

/* ---------- Project modal ---------- */
function setupProjectModal() {
  const modal = document.getElementById("projectModal");

  modal.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closeProjectModal);
  });

  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("is-open")) return;

    if (e.key === "Escape") closeProjectModal();
    if (e.key === "ArrowRight") stepCarousel(1);
    if (e.key === "ArrowLeft") stepCarousel(-1);
  });

  document.getElementById("carouselPrev").addEventListener("click", () => stepCarousel(-1));
  document.getElementById("carouselNext").addEventListener("click", () => stepCarousel(1));
}

function openProjectModal(index, triggerEl) {
  activeProjectIndex = index;
  lastFocusedTrigger = triggerEl || null;

  fillModal(currentProjectItems[index]);

  const modal = document.getElementById("projectModal");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");

  const closeBtn = modal.querySelector(".project-modal__close");
  if (closeBtn) closeBtn.focus();
}

function closeProjectModal() {
  const modal = document.getElementById("projectModal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");

  if (lastFocusedTrigger) lastFocusedTrigger.focus();
}

function fillModal(item) {
  document.getElementById("modalMeta").textContent = `${item.category} — ${item.year}`;
  document.getElementById("modalTitle").textContent = item.name;

  const descKeys = Object.keys(item)
    .filter((key) => /^description(_\d+)?$/.test(key))
    .sort();

  const descContainer = document.getElementById("modalDescription");
  descContainer.innerHTML = descKeys
    .map((key) => `<p>${item[key]}</p>`)
    .join("");

  const roles = document.getElementById("modalRoles");
  roles.innerHTML = item.roles.map((role) => `<li>${role}</li>`).join("");

  const links = document.getElementById("modalLinks");
  links.innerHTML = item.links
    .map(
      (link) => `
      <li>
        <a href="${link.url}" target="_blank" rel="noopener noreferrer">
          <span>${link.label}</span>
          <span aria-hidden="true">&#8599;</span>
        </a>
      </li>`
    )
    .join("");

  buildCarousel(item.media || []);
}

/* ---------- Carousel ---------- */
function buildCarousel(media) {
  activeSlideIndex = 0;

  const track = document.getElementById("carouselTrack");
  const dotsWrap = document.getElementById("carouselDots");

  track.innerHTML = media
    .map((m) => {
      if (m.type === "video") {
        return `
          <div class="carousel__slide">
            <video src="${m.src}" ${m.poster ? `poster="${m.poster}"` : ""} controls playsinline></video>
          </div>`;
      }
      return `
        <div class="carousel__slide">
          <img src="${m.src}" alt="${m.alt || ""}" loading="lazy" />
        </div>`;
    })
    .join("");

  dotsWrap.innerHTML = media
    .map((_, i) => `<button class="carousel__dot" type="button" aria-label="${i + 1}"></button>`)
    .join("");

  dotsWrap.querySelectorAll(".carousel__dot").forEach((dot, i) => {
    dot.addEventListener("click", () => {
      activeSlideIndex = i;
      updateCarousel();
    });
  });

  const controls = document.querySelectorAll("#carouselPrev, #carouselNext");
  controls.forEach((btn) => btn.style.display = media.length > 1 ? "" : "none");
  dotsWrap.style.display = media.length > 1 ? "" : "none";

  updateCarousel();
}

function stepCarousel(direction) {
  const track = document.getElementById("carouselTrack");
  const slides = track.children.length;
  if (slides === 0) return;

  activeSlideIndex = (activeSlideIndex + direction + slides) % slides;
  updateCarousel();
}

function updateCarousel() {
  const track = document.getElementById("carouselTrack");
  track.style.transform = `translateX(-${activeSlideIndex * 100}%)`;

  document.querySelectorAll(".carousel__dot").forEach((dot, i) => {
    dot.classList.toggle("is-active", i === activeSlideIndex);
  });
}

/* ---------- Skills ---------- */
function renderSkills(skills) {
  const grid = document.getElementById("skillsGrid");
  grid.innerHTML = "";

  skills.groups.forEach((group, index) => {
    const col = document.createElement("div");
    col.className = "skills-group";
    col.innerHTML = `
      <span class="skills-group__index">${String(index + 1).padStart(2, "0")}</span>
      <h3 class="skills-group__name">${group.name}</h3>
      <ul class="skills-group__list">
        ${group.items.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    `;
    grid.appendChild(col);
  });
}

/* ---------- Tools ---------- */
function renderTools(tools) {
  const grid = document.getElementById("toolsGrid");
  grid.innerHTML = "";

  tools.items.forEach((tool) => {
    const card = document.createElement("div");
    card.className = "tool-card";
    card.innerHTML = `
      ${tool.icon ? `<span class="tool-card__icon"><img src="${tool.icon}" alt="${tool.name}" loading="lazy" /></span>` : ""}
      <span class="tool-card__name">${tool.name}</span>
    `;
    grid.appendChild(card);
  });
}

/* ---------- About ---------- */
function renderAbout(about) {
  const text = document.getElementById("aboutText");
  text.innerHTML = about.paragraphs.map((p) => `<p>${p}</p>`).join("");

  const stats = document.getElementById("aboutStats");
  stats.innerHTML = about.stats
    .map(
      (stat) => `
      <div class="stat">
        <span class="stat__value">${stat.value}</span>
        <span class="stat__label">${stat.label}</span>
      </div>`
    )
    .join("");
}

/* ---------- Contact ---------- */
function renderContact(contact) {
  const email = document.getElementById("contactEmail");
  email.textContent = contact.email;
  email.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}`;
  email.target = "_blank";
  email.rel = "noopener noreferrer";

  const socials = document.getElementById("contactSocials");
  socials.innerHTML = contact.socials
    .map(
      (social) => `
      <li>
        <a href="${social.url}" target="_blank" rel="noopener noreferrer">
          ${social.icon ? `<span class="contact__social-icon"><img src="${social.icon}" alt="" loading="lazy" /></span>` : ""}
          <span>${social.name}</span>
        </a>
      </li>`
    )
    .join("");
}

/* ---------- Language switch ---------- */
function setupLangSwitch() {
  const btn = document.getElementById("langSwitch");
  btn.addEventListener("click", () => {
    currentLang = currentLang === "es" ? "en" : "es";
    localStorage.setItem(STORAGE_KEY, currentLang);
    render(currentLang);
  });
}

/* ---------- Theme switch ---------- */
function setupThemeSwitch() {
  const btn = document.getElementById("themeSwitch");
  const label = document.getElementById("themeLabel");

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const storedIndex = THEMES.findIndex((theme) => theme.id === stored);
  let themeIndex = storedIndex >= 0 ? storedIndex : 0;

  applyTheme(themeIndex, label);

  btn.addEventListener("click", () => {
    themeIndex = (themeIndex + 1) % THEMES.length;
    applyTheme(themeIndex, label);
    localStorage.setItem(THEME_STORAGE_KEY, THEMES[themeIndex].id);
  });
}

function applyTheme(index, label) {
  const theme = THEMES[index];
  if (theme.id === "default") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme.id);
  }
  if (label) label.textContent = theme.label;
}

/* ---------- Nav ---------- */
function setupNav() {
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const list = document.getElementById("navList");

  toggle.addEventListener("click", () => {
    const isOpen = list.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  list.querySelectorAll(".nav__link").forEach((link) => {
    link.addEventListener("click", () => {
      list.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  /* Active section highlighting */
  const sections = document.querySelectorAll("main .section");
  const links = document.querySelectorAll(".nav__link");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach((link) => {
            link.classList.toggle("is-active", link.dataset.nav === id);
          });
          nav.classList.toggle("nav--on-dark", entry.target.classList.contains("section--about"));
        }
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
}

/* ---------- Scroll reveal ---------- */
function setupScrollReveal() {
  const targets = document.querySelectorAll(
    ".section__head, .project-item, .skills-group, .tool-card, .hero__title, .hero__meta, .about__main, .about__side, .contact__title, .contact__email"
  );

  const reveal = (el) => el.classList.add("is-visible");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targets.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal(entry.target);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });
}

/* ---------- Back to top ---------- */
function setupBackToTop() {
  const btn = document.getElementById("backToTop");
  btn.addEventListener("click", () => {
    document.getElementById("home").scrollIntoView({ behavior: "smooth" });
  });
}
