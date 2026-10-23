/**
 * Pesan BOT ORDER (BEM / SEM / LEM Bot) — pelanggan. Butuh sql/bot-order.sql.
 * Harga per tagar diatur admin (Price). Banyak tagar dalam 1 pesanan = 1 pesanan.
 * Alur: isi tagar -> pembayaran (QRIS/Binance/DANA/PayPal) -> OK -> antrian admin -> disetujui.
 */
Object.assign(TRANSLATIONS.id, {
    bo_btn: "Pesan Bot Order", bo_title: "Pesan Bot Order", bo_sub: "Pilih paket bot dan masukkan tagar. Harga dihitung per tagar.",
    bo_pkg: "Paket Bot", bo_per_tag: "/tagar", bo_tags_label: "Tagar (boleh banyak)", bo_tags_hint: "Satu tagar per baris atau pisahkan dengan koma. Tagar kembar otomatis diabaikan.",
    bo_tag_ph: "#tagar1\n#tagar2\n#tagar3", bo_note_label: "Catatan untuk admin (opsional)", bo_price_title: "Harga", bo_calc: "{n} tagar × {p}", bo_total: "Total",
    bo_unset: "Harga bot order belum diatur admin.", bo_send: "Lanjut ke Pembayaran", bo_sending: "Mengirim…",
    bo_info: "Setelah pembayaran dikonfirmasi, pesanan Anda berstatus Menunggu Konfirmasi sampai admin memprosesnya.",
    bo_sent_title: "Bot Order Terkirim", bo_sent_text: "Pesanan {n} tagar ({pkg}) sebesar {total} sudah masuk antrian admin.", bo_close: "Tutup",
    bo_err_tag: "Isi minimal 1 tagar", bo_err_max: "Maksimal 500 tagar per pesanan", bo_err_price: "Harga Bot Order belum diatur admin",
    bo_list_title: "Bot Order Saya", bo_st_pending: "⏳ Menunggu konfirmasi", bo_st_approved: "✅ Disetujui", bo_st_rejected: "✖ Ditolak", bo_tags_n: "{n} tagar",
    bo_wa_text: "Halo Admin, saya sudah membayar Bot Order {pkg} ({n} tagar) sebesar {total}. Berikut bukti pembayarannya:"
});
Object.assign(TRANSLATIONS.en, {
    bo_btn: "Order Bot", bo_title: "Order Bot", bo_sub: "Choose a bot package and enter your tags. Priced per tag.",
    bo_pkg: "Bot Package", bo_per_tag: "/tag", bo_tags_label: "Tags (as many as you like)", bo_tags_hint: "One tag per line or separate with commas. Duplicate tags are ignored.",
    bo_tag_ph: "#tag1\n#tag2\n#tag3", bo_note_label: "Note for admin (optional)", bo_price_title: "Price", bo_calc: "{n} tags × {p}", bo_total: "Total",
    bo_unset: "Bot order price has not been set by the admin.", bo_send: "Continue to Payment", bo_sending: "Sending…",
    bo_info: "After your payment is confirmed, your order is marked Awaiting Confirmation until the admin processes it.",
    bo_sent_title: "Bot Order Sent", bo_sent_text: "Your order of {n} tags ({pkg}) totaling {total} is now in the admin queue.", bo_close: "Close",
    bo_err_tag: "Enter at least 1 tag", bo_err_max: "Maximum 500 tags per order", bo_err_price: "Bot order price has not been set by the admin",
    bo_list_title: "My Bot Orders", bo_st_pending: "⏳ Awaiting confirmation", bo_st_approved: "✅ Approved", bo_st_rejected: "✖ Rejected", bo_tags_n: "{n} tags",
    bo_wa_text: "Hello Admin, I have paid for Bot Order {pkg} ({n} tags), total {total}. Here is my payment proof:"
});
Object.assign(SERVER_ERROR_MAP, {
    "Harga Bot Order belum diatur admin": "bo_err_price", "Maksimal 500 tagar per pesanan": "bo_err_max", "Tagar wajib diisi": "bo_err_tag"
});

const BO_PKGS = ["BEM", "SEM", "LEM"];
const boPrice = (pkg) => Number((cuPriceInfo && cuPriceInfo.bot && cuPriceInfo.bot[pkg]) || 0);

async function openBotOrderModal() {
    cuPriceInfo = null; await ensurePriceInfo();      // harga terbaru
    const st = { pkg: BO_PKGS.find(p => boPrice(p) > 0) || "BEM" };
    $("modalBox").innerHTML = `
        <div class="rn-head"><div class="rn-icon">🤖</div>
            <div><div class="modal-title" style="margin:0">${escapeHtml(t("bo_title"))}</div><div class="rn-sub">${escapeHtml(t("bo_sub"))}</div></div></div>
        <div class="rn-block"><div class="rn-label">${escapeHtml(t("bo_pkg"))}</div>
            <div class="rn-pkgs" id="boPkgs">${BO_PKGS.map(p => `<button type="button" class="rn-pkg" data-pkg="${p}"><b>${p} Bot</b><small class="rn-pkg-price">${boPrice(p) ? "<b>" + fmtRp(boPrice(p)) + "</b>" + escapeHtml(t("bo_per_tag")) : "-"}</small></button>`).join("")}</div></div>
        <div class="rn-block"><label class="rn-label" for="boTags">${escapeHtml(t("bo_tags_label"))} <span class="no-count" id="boCount"></span></label>
            <textarea id="boTags" class="no-area" rows="5" placeholder="${escapeHtml(t("bo_tag_ph"))}" autocomplete="off"></textarea>
            <div class="rn-hint">${escapeHtml(t("bo_tags_hint"))}</div></div>
        <div class="rn-block"><label class="rn-label" for="boNote">${escapeHtml(t("bo_note_label"))}</label><textarea id="boNote" class="no-area" rows="2" maxlength="500"></textarea></div>
        <div class="rn-block price-box"><div class="rn-label">💰 ${escapeHtml(t("bo_price_title"))}</div><div class="price-lines" id="boPriceLines"></div></div>
        <div class="rn-info">ℹ️ ${escapeHtml(t("bo_info"))}</div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" id="boNo">${escapeHtml(t("rn_cancel"))}</button><button type="button" class="btn btn-gold" id="boYes">${escapeHtml(t("bo_send"))}</button></div>`;
    $("modalOverlay").classList.add("show");

    const sync = () => {
        $("boPkgs").querySelectorAll(".rn-pkg").forEach(c => c.classList.toggle("on", c.dataset.pkg === st.pkg));
        const n = parseTags($("boTags").value).length, p = boPrice(st.pkg);
        $("boCount").textContent = n ? "· " + t("bo_tags_n", { n }) : "";
        $("boPriceLines").innerHTML = !p ? `<div class="price-none">${escapeHtml(t("bo_unset"))}</div>`
            : `<div class="price-row sub"><span>${escapeHtml(t("bo_calc", { n: n || 0, p: fmtRp(p) }))}</span><span>${fmtRp(p * n)}</span></div>
               <div class="price-row total"><span>${escapeHtml(t("bo_total"))}</span><b>${fmtRp(p * n)}</b></div>`;
    };
    $("boPkgs").addEventListener("click", e => { const c = e.target.closest(".rn-pkg"); if (c) { st.pkg = c.dataset.pkg; sync(); } });
    $("boTags").addEventListener("input", sync);
    $("boNo").addEventListener("click", closeModal);
    sync();

    $("boYes").addEventListener("click", async () => {
        const tags = parseTags($("boTags").value), note = $("boNote").value.trim(), p = boPrice(st.pkg);
        if (!p) { showToast(t("bo_err_price"), "danger"); return; }
        if (!tags.length) { showToast(t("bo_err_tag"), "danger"); $("boTags").focus(); return; }
        if (tags.length > 500) { showToast(t("bo_err_max"), "danger"); return; }
        const total = p * tags.length;

        if (!(await payStep({ pkg: st.pkg, jumlah: tags.length, total,
            waText: (tot) => t("bo_wa_text", { pkg: st.pkg + " Bot", n: tags.length, total: tot }) }))) return;

        const btn = $("boYes"); btn.disabled = true; btn.textContent = t("bo_sending");
        const { data, error } = await cuRpc("cu_request_bot_order", { p_dashboard: st.pkg, p_tagar_list: tags, p_catatan: note || null });
        if (error) {
            btn.disabled = false; btn.textContent = t("bo_send");
            const m = error.message || "";
            showToast(/does not exist|schema cache|Could not find the function/i.test(m) ? t("rn_err_not_ready") : (translateServerError(m) || t("rn_err_generic")), "danger");
            return;
        }
        loadBotOrders();
        $("modalBox").innerHTML = `<div class="modal-icon success">🤖</div><div class="modal-title">${escapeHtml(t("bo_sent_title"))}</div>
            <div class="modal-sub">${escapeHtml(t("bo_sent_text", { n: data.jumlah, pkg: st.pkg + " Bot", total: fmtRp(data.total) }))}</div>
            <div class="modal-actions"><button type="button" class="btn btn-primary" id="boDone">${escapeHtml(t("bo_close"))}</button></div>`;
        $("boDone").addEventListener("click", closeModal);
    });
}

/* ---------------- Riwayat bot order pelanggan ---------------- */
async function loadBotOrders() {
    const box = $("botOrderList"); if (!box) return;
    const { data, error } = await cuRpc("cu_my_bot_orders");
    if (error || !data || !data.length) { box.innerHTML = ""; return; }
    const stl = { pending: "bo_st_pending", approved: "bo_st_approved", rejected: "bo_st_rejected" };
    box.innerHTML = `<div class="panel bo-panel"><div class="panel-title">🤖 ${escapeHtml(t("bo_list_title"))}</div>${data.map(r => `
        <div class="bo-item"><div><b>${escapeHtml(r.dashboard)} Bot</b> · ${escapeHtml(t("bo_tags_n", { n: r.jumlah }))}
            <div class="bo-item-sub">${escapeHtml(r.tagar_pertama || "")}${r.jumlah > 1 ? " …" : ""} · ${new Date(r.created_at).toLocaleDateString(currentLang === "en" ? "en-US" : "id-ID", { day: "2-digit", month: "short" })}</div>
            ${r.catatan_admin ? `<div class="bo-item-sub">💬 ${escapeHtml(r.catatan_admin)}</div>` : ""}</div>
            <div style="text-align:right;"><b>${fmtRp(r.total_harga)}</b><div class="bo-item-sub">${escapeHtml(t(stl[r.status] || "bo_st_pending"))}</div></div></div>`).join("")}</div>`;
}
document.addEventListener("click", (e) => { if (e.target.closest("[data-bot-order]")) openBotOrderModal(); });
document.addEventListener("DOMContentLoaded", () => { loadBotOrders(); setInterval(() => { if (!document.hidden) loadBotOrders(); }, 60000); });
document.addEventListener("langchange", loadBotOrders);
