(() => {
  "use strict";

  const STORAGE_KEY = "teleponManagementData_v1";
  const DEFAULT_DATA = {
    phone: "62895392583059",
    name: "-",
    status: "done",
    checks: {
      unregistered: false,
      registered: true,
      read: true,
      replied: true
    },
    visits: 2,
    deadline: Date.now() + (((4 * 60) + 49) * 60 + 21) * 1000
  };

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    records: $("#records"),
    empty: $("#emptyState"),
    modal: $("#editModal"),
    phoneInput: $("#phoneInput"),
    search: $("#searchInput"),
    visitCount: $("#visitCount"),
    toast: $("#toast")
  };

  let data = loadData();
  let activeTab = "all";
  let toastTimer;

  function normalizePhone(value) {
    let digits = String(value ?? "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("0")) digits = "62" + digits.slice(1);
    else if (digits.startsWith("8")) digits = "62" + digits;
    else if (digits.startsWith("62")) digits = digits;
    return digits;
  }

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === "object") {
        return {
          ...DEFAULT_DATA,
          ...saved,
          phone: normalizePhone(saved.phone || DEFAULT_DATA.phone),
          checks: { ...DEFAULT_DATA.checks, ...(saved.checks || {}) },
          visits: Number.isFinite(Number(saved.visits)) ? Number(saved.visits) : 2,
          deadline: Number(saved.deadline) || DEFAULT_DATA.deadline
        };
      }
    } catch (error) {
      console.warn("Data tersimpan tidak dapat dibaca:", error);
    }
    return { ...DEFAULT_DATA, checks: { ...DEFAULT_DATA.checks } };
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      showToast("Penyimpanan browser tidak tersedia.");
    }
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2100);
  }

  function render() {
    const query = elements.search.value.trim().toLowerCase();
    const matchesSearch = !query || data.phone.includes(query) || data.name.toLowerCase().includes(query);
    const matchesTab = activeTab === "all" ||
      (activeTab === "done" && data.status === "done") ||
      (activeTab === "pending" && data.status !== "done");
    const visible = matchesSearch && matchesTab;

    $("#count-all").textContent = "(1)";
    $("#count-done").textContent = data.status === "done" ? "(1)" : "(0)";
    $("#count-pending").textContent = data.status === "done" ? "(0)" : "(1)";
    elements.visitCount.textContent = data.visits;
    elements.records.innerHTML = "";
    elements.empty.hidden = visible;

    if (!visible) return;

    const card = document.createElement("article");
    card.className = "record-card";
    card.innerHTML = `
      <div class="record-left">
        <p class="record-index">#1</p>
        <span class="state-pill">${data.status === "done" ? "Selesai" : "Belum Selesai"}</span>
        <div class="phone-line">
          <button class="phone-number" id="editPhone" type="button" title="Klik untuk mengedit nomor">${escapeHTML(data.phone)}</button>
          <button class="copy-button" id="copyPhone" type="button" aria-label="Salin nomor telepon" title="Salin nomor">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8V3h13v16h-5M3 8h13v13H3z"/></svg>
          </button>
        </div>
        <p class="record-name">${escapeHTML(data.name || "-")}</p>
        <a class="whatsapp-button" id="whatsappLink" href="https://wa.me/${encodeURIComponent(data.phone)}" target="_blank" rel="noopener noreferrer">
          <span>WhatsApp</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7M21 3 10 14"/><path d="M19 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h7"/></svg>
        </a>
      </div>
      <div class="record-right">
        <div class="check-group">
          <h3>Status Kontak</h3>
          <div class="check-list">
            <label class="check-item"><input type="checkbox" data-check="unregistered"><span>WA Belum Terdaftar</span></label>
            <label class="check-item"><input type="checkbox" data-check="registered"><span>WA Terdaftar</span></label>
          </div>
        </div>
        <div class="check-group">
          <h3>Konfirmasi Testimoni</h3>
          <div class="check-list">
            <label class="check-item"><input type="checkbox" data-check="read"><span>Dibaca</span></label>
            <label class="check-item"><input type="checkbox" data-check="replied"><span>Dibalas</span></label>
          </div>
        </div>
      </div>`;

    elements.records.appendChild(card);
    card.querySelectorAll("[data-check]").forEach((checkbox) => {
      const key = checkbox.dataset.check;
      checkbox.checked = Boolean(data.checks[key]);
      checkbox.addEventListener("change", () => {
        data.checks[key] = checkbox.checked;
        saveData();
      });
    });

    $("#editPhone").addEventListener("click", openModal);
    $("#copyPhone").addEventListener("click", copyPhone);
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function openModal() {
    elements.phoneInput.value = data.phone;
    elements.modal.classList.add("open");
    elements.modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => elements.phoneInput.focus(), 80);
  }

  function closeModal() {
    elements.modal.classList.remove("open");
    elements.modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function savePhone() {
    const normalized = normalizePhone(elements.phoneInput.value);
    if (!normalized || normalized.length < 8) {
      showToast("Masukkan nomor telepon yang valid.");
      elements.phoneInput.focus();
      return;
    }
    data.phone = normalized;
    saveData();
    closeModal();
    render();
    showToast("Nomor telepon berhasil disimpan.");
  }

  async function copyPhone() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(data.phone);
      } else {
        const temp = document.createElement("textarea");
        temp.value = data.phone;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        const copied = document.execCommand("copy");
        temp.remove();
        if (!copied) throw new Error("Copy tidak didukung");
      }
      showToast("Nomor berhasil disalin.");
    } catch (error) {
      showToast("Gagal menyalin nomor.");
    }
  }

  function updateCountdown() {
    let remaining = Math.max(0, Math.floor((data.deadline - Date.now()) / 1000));
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    $("#hours").textContent = String(hours).padStart(2, "0");
    $("#minutes").textContent = String(minutes).padStart(2, "0");
    $("#seconds").textContent = String(seconds).padStart(2, "0");
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab;
      document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab));
      render();
    });
  });

  elements.search.addEventListener("input", render);
  $("#returnButton").addEventListener("click", () => {
    data.visits += 1;
    saveData();
    render();
    showToast("Jumlah kunjungan ulang diperbarui.");
  });

  $("#closeModal").addEventListener("click", closeModal);
  $("#cancelEdit").addEventListener("click", closeModal);
  $("#saveEdit").addEventListener("click", savePhone);
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) closeModal();
  });
  elements.phoneInput.addEventListener("input", () => {
    const start = elements.phoneInput.selectionStart;
    const normalized = normalizePhone(elements.phoneInput.value);
    elements.phoneInput.value = normalized;
    try { elements.phoneInput.setSelectionRange(start, start); } catch (_) {}
  });
  elements.phoneInput.addEventListener("paste", (event) => {
    event.preventDefault();
    const pasted = (event.clipboardData || window.clipboardData).getData("text");
    elements.phoneInput.value = normalizePhone(pasted);
  });
  elements.phoneInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") savePhone();
    if (event.key === "Escape") closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.modal.classList.contains("open")) closeModal();
  });

  render();
  updateCountdown();
  setInterval(updateCountdown, 1000);
})();