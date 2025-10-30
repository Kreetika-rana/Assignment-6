/* ================ Data ================ */
/*
Define an array of package objects:
{id, destination, durationDays, basePrice, season}
- basePrice is treated as price per night for simplicity.
- season will affect final price via multiplier.
*/
const packages = [
  { id: "PKG001", destination: "Goa", durationDays: 5, basePrice: 120, season: "summer" },
  { id: "PKG002", destination: "Manali", durationDays: 4, basePrice: 90, season: "winter" },
  { id: "PKG003", destination: "Kerala", durationDays: 6, basePrice: 110, season: "monsoon" },
  { id: "PKG004", destination: "Rishikesh", durationDays: 3, basePrice: 80, season: "spring" }
];

/* ================ Utils ================ */

/**
 * Returns seasonal multiplier for a season string.
 * Example: summer -> +20% => 1.20; winter -> -10% => 0.90
 */
function getSeasonMultiplier(season) {
  switch ((season || "").toLowerCase()) {
    case "summer": return 1.20;
    case "winter": return 0.90;
    case "monsoon": return 1.05;
    case "spring": return 1.00;
    default: return 1.00;
  }
}

/**
 * Compute 'final' static package price (applied to basePrice).
 * For the packages table we compute final price = basePrice * multiplier
 */
function computePackageFinalPrice(pkg) {
  const mult = getSeasonMultiplier(pkg.season);
  // Round to 2 decimals
  return +(pkg.basePrice * mult).toFixed(2);
}

/* ================ Render Packages Table ================ */
function renderPackagesTable() {
  const tbody = document.querySelector("#packagesTable tbody");
  tbody.innerHTML = ""; // clear

  for (const pkg of packages) {
    const tr = document.createElement("tr");

    const finalPrice = computePackageFinalPrice(pkg);

    tr.innerHTML = `
      <td>${pkg.id}</td>
      <td>${pkg.destination}</td>
      <td>${pkg.durationDays}</td>
      <td>$${pkg.basePrice.toFixed(2)}</td>
      <td>${pkg.season}</td>
      <td>$${finalPrice}</td>
    `;
    tbody.appendChild(tr);
  }
}

/* ================ Booking Estimator ================ */

/**
 * Compute number of nights between two date strings (YYYY-MM-DD).
 * Returns integer nights (>=0) or NaN for invalid.
 */
function computeNights(checkInStr, checkOutStr) {
  if (!checkInStr || !checkOutStr) return NaN;
  const inDate = new Date(checkInStr);
  const outDate = new Date(checkOutStr);
  // remove time zone issues by using UTC midnight
  const diffMs = Date.UTC(outDate.getFullYear(), outDate.getMonth(), outDate.getDate())
               - Date.UTC(inDate.getFullYear(), inDate.getMonth(), inDate.getDate());
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Use control flow (if/switch) to apply promo code discounts.
 * Returns decimal discount fraction (e.g., 0.10 for 10%).
 */
function getPromoDiscount(promo) {
  if (!promo) return 0;
  switch (promo.trim().toUpperCase()) {
    case "EARLYBIRD": return 0.10;
    case "SUMMER21": return 0.15;
    case "FRIEND10": return 0.10;
    default: return 0;
  }
}

/**
 * Determine guests multiplier:
 * - If guests <= 2 => 1
 * - If guests > 2 => +20% => 1.2 (per assignment requirement)
 */
function getGuestsMultiplier(guests) {
  return (guests > 2) ? 1.20 : 1.00;
}

/**
 * Calculate estimated total:
 * - pricePerNight = selectedPackage.basePrice
 * - total = nights * pricePerNight * guestsMultiplier
 * - apply promo discount
 * - optionally, add weekend surcharge: here we check how many nights fall on Sat/Sun and add 10% surcharge for those nights
 */
function calculateEstimate(pkgId, checkIn, checkOut, guests, promo) {
  const pkg = packages.find(p => p.id === pkgId);
  if (!pkg) return { valid: false, message: "Please select a package." };

  const nights = computeNights(checkIn, checkOut);
  if (isNaN(nights) || nights <= 0) return { valid: false, message: "Check-out must be after check-in." };

  const pricePerNight = pkg.basePrice; // using base price per night
  let subtotal = nights * pricePerNight;

  // guests multiplier
  const guestsMult = getGuestsMultiplier(Number(guests) || 1);
  subtotal *= guestsMult;

  // weekend surcharge: check day-by-day
  let weekendSurcharge = 0;
  let out = new Date(checkOut);
  let inD = new Date(checkIn);
  for (let d = new Date(inD); d < out; d.setDate(d.getDate() + 1)) {
    const day = d.getDay(); // 0=Sun,6=Sat
    if (day === 0 || day === 6) weekendSurcharge += (pricePerNight * 0.10); // 10% of nightly price per weekend night
  }
  subtotal += weekendSurcharge;

  // seasonal multiplier on the base (applied once)
  const seasonMult = getSeasonMultiplier(pkg.season);
  subtotal *= seasonMult;

  // promo discount
  const promoDiscount = getPromoDiscount(promo);
  const discountAmount = subtotal * promoDiscount;

  const total = +(subtotal - discountAmount).toFixed(2);
  return {
    valid: true,
    nights,
    guestsMult,
    weekendSurcharge: +weekendSurcharge.toFixed(2),
    seasonMult,
    promoDiscount,
    total
  };
}

/* ================ Booking Form - DOM wiring ================ */
function populatePackageSelect() {
  const sel = document.getElementById("pkgSelect");
  sel.innerHTML = `<option value="">-- Select package --</option>`;
  for (const pkg of packages) {
    const opt = document.createElement("option");
    opt.value = pkg.id;
    opt.textContent = `${pkg.destination} (${pkg.id}) - $${pkg.basePrice}/night`;
    sel.appendChild(opt);
  }
}

// Live update and validation logic
function setupBookingForm() {
  const pkgSelect = document.getElementById("pkgSelect");
  const checkIn = document.getElementById("checkIn");
  const checkOut = document.getElementById("checkOut");
  const guests = document.getElementById("guests");
  const promo = document.getElementById("promo");
  const estimateBox = document.getElementById("estimateBox");
  const submitBtn = document.getElementById("bookSubmit");
  const form = document.getElementById("bookingForm");

  function updateEstimate() {
    const data = calculateEstimate(pkgSelect.value, checkIn.value, checkOut.value, guests.value, promo.value);
    if (!data.valid) {
      estimateBox.textContent = data.message;
      submitBtn.disabled = true;
      return;
    }

    estimateBox.innerHTML = `
      Nights: ${data.nights} <br>
      Weekend surcharge: $${data.weekendSurcharge} <br>
      Season multiplier: ${data.seasonMult} <br>
      Promo discount: ${data.promoDiscount * 100}% <br>
      <strong>Total Estimate: $${data.total}</strong>
    `;
    // Enable submit only if valid and required fields are present
    submitBtn.disabled = false;
  }

  // Recompute on changes
  [pkgSelect, checkIn, checkOut, guests, promo].forEach(el => {
    el.addEventListener("input", updateEstimate);
    el.addEventListener("change", updateEstimate);
  });

  // Form submit - for demo we only prevent default and show alert
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const data = calculateEstimate(pkgSelect.value, checkIn.value, checkOut.value, guests.value, promo.value);
    if (!data.valid) {
      alert("Cannot submit: " + data.message);
      return;
    }
    alert(`Booking confirmed! Estimated total: $${data.total}`);
    // In real app, you'd send booking data to server here
  });

  // initialize
  updateEstimate();
}

/* ================ Gallery ================ */
/*
Gallery thumbnails will include data-large attribute pointing to large image.
We'll populate a few demo thumbnails (use placeholder images).
*/
const galleryImages = [
  { id: "g1", thumb: "https://picsum.photos/id/1015/300/200", large: "https://picsum.photos/id/1015/1200/800", title: "Riverside" },
  { id: "g2", thumb: "https://picsum.photos/id/1016/300/200", large: "https://picsum.photos/id/1016/1200/800", title: "Mountain" },
  { id: "g3", thumb: "https://picsum.photos/id/1018/300/200", large: "https://picsum.photos/id/1018/1200/800", title: "Forest" },
  { id: "g4", thumb: "https://picsum.photos/id/1020/300/200", large: "https://picsum.photos/id/1020/1200/800", title: "Beach" },
  { id: "g5", thumb: "https://picsum.photos/id/1021/300/200", large: "https://picsum.photos/id/1021/1200/800", title: "Sunset" }
];

function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  grid.innerHTML = "";
  for (const img of galleryImages) {
    // create a thumb element with data-large
    const a = document.createElement("a");
    a.className = "thumb";
    a.href = "#"; // keep navigation friendly
    a.dataset.large = img.large;
    a.dataset.title = img.title;
    a.title = img.title;

    const image = document.createElement("img");
    image.src = img.thumb;
    image.alt = img.title;

    a.appendChild(image);
    grid.appendChild(a);
  }

  // Attach click listeners (event delegation)
  grid.addEventListener("click", (ev) => {
    const thumb = ev.target.closest(".thumb");
    if (!thumb) return;
    ev.preventDefault();
    openModalFromThumb(thumb);
  });
}

/* Modal open/close */
function openModalFromThumb(thumb) {
  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modalImage");
  const caption = document.getElementById("modalCaption");

  modalImg.src = thumb.dataset.large;
  modalImg.alt = thumb.dataset.title || "";
  caption.textContent = thumb.dataset.title || "";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.getElementById("modalImage").src = "";
}

/* gallery layout toggle (style via JS) */
function setupGalleryControls() {
  const btn = document.getElementById("toggleLayout");
  const grid = document.getElementById("galleryGrid");
  btn.addEventListener("click", () => {
    if (grid.classList.contains("grid")) {
      grid.classList.remove("grid");
      grid.classList.add("list");
      btn.textContent = "Switch to Grid";
    } else {
      grid.classList.remove("list");
      grid.classList.add("grid");
      btn.textContent = "Switch to List";
    }
  });

  // modal close
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", (ev) => {
    if (ev.target === ev.currentTarget) closeModal(); // click backdrop
  });
}

/* ================ Nav highlight & scroll behavior ================ */
function setupNavHighlight() {
  const links = Array.from(document.querySelectorAll(".nav-link"));
  function setActiveLink(link) {
    links.forEach(l => l.classList.toggle("active", l === link));
  }

  // click behavior
  links.forEach(link => {
    link.addEventListener("click", (ev) => {
      // let anchor default scroll happen; mark active
      setActiveLink(link);
    });
  });

  // scroll behavior - detect section in view and highlight
  const sections = links.map(l => {
    const id = l.getAttribute("href").slice(1);
    return document.getElementById(id);
  });

  window.addEventListener("scroll", () => {
    const offset = window.scrollY + 100; // offset to detect
    let current = null;
    for (const sec of sections) {
      if (!sec) continue;
      if (sec.offsetTop <= offset) current = sec;
    }
    if (current) {
      const link = document.querySelector(`.nav-link[href="#${current.id}"]`);
      if (link) setActiveLink(link);
    }
  });
}

/* ================ Init ================ */
function init() {
  renderPackagesTable();
  populatePackageSelect();
  setupBookingForm();
  renderGallery();
  setupGalleryControls();
  setupNavHighlight();
}

document.addEventListener("DOMContentLoaded", init);
