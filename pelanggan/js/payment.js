/**
 * Portal pelanggan — (1) langkah PEMBAYARAN sebelum pesanan masuk antrian, (2) DAFTAR HARGA (harian + bot).
 * Data metode bayar diisi admin di Price (sql/fast-payment-arsip.sql).
 */
Object.assign(TRANSLATIONS.id, {
    pay_title: "Pembayaran", pay_sub: "Bayar sesuai total, lalu kirim bukti pembayaran ke chat admin. Setelah itu tekan OK agar pesanan masuk antrian.",
    pay_total: "Total bayar", pay_qris: "QRIS", pay_binance: "Binance Pay ID", pay_dana: "DANA", pay_paypal: "PayPal",
    pay_paypal_ff: "WAJIB kirim lewat Family & Friends (bukan Goods & Services).", pay_copy: "Salin", pay_copied: "Tersalin",
    pay_proof_btn: "Kirim bukti bayar ke Admin", pay_ok: "OK, saya sudah bayar & kirim bukti", pay_back: "Kembali",
    pay_warn: "Pesanan baru diproses admin setelah bukti pembayaran diterima.",
    pay_wa_text: "Halo Admin, saya sudah membayar pesanan {pkg} {hari} hari ({n} tagar) sebesar {total}. Berikut bukti pembayarannya:",
    pl_title: "Daftar Harga", pl_daily: "Langganan Harian", pl_daily_sub: "harga per hari per tagar", pl_bot: "Bot Order", pl_bot_sub: "harga per tagar",
    pl_fast: "⚡ Pesanan 1 hari otomatis masuk Fast Order (langsung diarsipkan setelah dikirim).", pl_bot_ask: "Belum tersedia.",
    arc_notice: "{n} tagar Anda telah diarsipkan", arc_notice_more: "+{n} lainnya", arc_notice_btn: "Lihat Arsip",
    arc_notice_sub: "Langganan yang sudah mencapai limit dipindahkan ke menu Arsip."
});
Object.assign(TRANSLATIONS.en, {
    pay_title: "Payment", pay_sub: "Pay the total, then send the payment proof to the admin chat. After that press OK so your order enters the queue.",
    pay_total: "Total to pay", pay_qris: "QRIS", pay_binance: "Binance Pay ID", pay_dana: "DANA", pay_paypal: "PayPal",
    pay_paypal_ff: "MUST be sent as Family & Friends (not Goods & Services).", pay_copy: "Copy", pay_copied: "Copied",
    pay_proof_btn: "Send payment proof to Admin", pay_ok: "OK, I have paid & sent the proof", pay_back: "Back",
    pay_warn: "Your order is processed by the admin once the payment proof is received.",
    pay_wa_text: "Hello Admin, I have paid for my order {pkg} {hari} days ({n} tags), total {total}. Here is my payment proof:",
    pl_title: "Price List", pl_daily: "Daily Subscription", pl_daily_sub: "price per day per tag", pl_bot: "Bot Order", pl_bot_sub: "price per tag",
    pl_fast: "⚡ 1-day orders go to Fast Order (archived right after delivery).", pl_bot_ask: "Not available yet.",
    arc_notice: "{n} of your tags have been archived", arc_notice_more: "+{n} more", arc_notice_btn: "View Archive",
    arc_notice_sub: "Subscriptions that reached their limit are moved to the Archive menu."
});

/* ---------------- Langkah pembayaran ---------------- */
function _payCopy(text, btn) {
    const done = () => { const o = btn.textContent; btn.textContent = "✓ " + t("pay_copied"); setTimeout(() => btn.textContent = o, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); done(); }
}

/**
 * Tampilkan pembayaran. Mengembalikan Promise<boolean>: true = pelanggan menekan OK (lanjut kirim pesanan),
 * false = kembali. Jika admin belum mengisi metode bayar (atau SQL belum dijalankan) langsung true.
 */
async function payStep({ pkg, hari, jumlah, kode, total: totalOverride, waText }) {
    const n = Math.max(1, jumlah || 1);
    const [info, quote] = await Promise.all([
        cuRpc("cu_payment_info"),
        totalOverride != null ? Promise.resolve({ data: { total: totalOverride } }) : cuRpc("cu_price_quote", { p_dashboard: pkg, p_hari: hari, p_jumlah: n, p_kode: kode || null })
    ]);
    const p = info.data;
    if (info.error || !p || !p.configured) return true;
    const total = quote.data && quote.data.total > 0 ? quote.data.total : 0;

    return new Promise(resolve => {
        const ov = document.createElement("div");
        ov.className = "pay-overlay";
        const row = (label, value, extra) => value ? `<div class="pay-row"><div><div class="pay-label">${escapeHtml(label)}</div><div class="pay-val">${escapeHtml(value)}</div>${extra || ""}</div>
            <button type="button" class="btn btn-ghost mini" data-copy="${escapeHtml(value)}">${escapeHtml(t("pay_copy"))}</button></div>` : "";
        const wa = waUrl(waText ? waText(total ? fmtRp(total) : "-") : t("pay_wa_text", { pkg, hari, n, total: total ? fmtRp(total) : "-" }));
        ov.innerHTML = `<div class="pay-box" role="dialog" aria-modal="true">
            <div class="modal-title">💳 ${escapeHtml(t("pay_title"))}</div>
            <div class="modal-sub">${escapeHtml(t("pay_sub"))}</div>
            ${total ? `<div class="pay-total"><span>${escapeHtml(t("pay_total"))}</span><b>${escapeHtml(fmtRp(total))}</b></div>` : ""}
            ${p.qris_data ? `<div class="pay-qris"><div class="pay-label">${escapeHtml(t("pay_qris"))}</div><img src="data:${p.qris_mime};base64,${p.qris_data}" alt="QRIS"></div>` : ""}
            ${row(t("pay_binance"), p.binance_id)}
            ${row(t("pay_dana"), p.dana_number, p.dana_name ? `<div class="pay-note">a.n. ${escapeHtml(p.dana_name)}</div>` : "")}
            ${row(t("pay_paypal"), p.paypal, `<div class="pay-note warn">⚠️ ${escapeHtml(t("pay_paypal_ff"))}</div>`)}
            <div class="pay-warn">📲 ${escapeHtml(t("pay_warn"))}</div>
            <a class="btn btn-wa btn-block" href="${wa}" target="_blank" rel="noopener">💬 ${escapeHtml(t("pay_proof_btn"))}</a>
            <button type="button" class="btn btn-primary btn-block" id="payOk" style="margin-top:8px;">✅ ${escapeHtml(t("pay_ok"))}</button>
            <button type="button" class="btn btn-ghost btn-block" id="payBack" style="margin-top:8px;">${escapeHtml(t("pay_back"))}</button>
        </div>`;
        document.body.appendChild(ov);
        const close = (v) => { ov.remove(); resolve(v); };
        ov.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", () => _payCopy(b.dataset.copy, b)));
        ov.querySelector("#payOk").addEventListener("click", () => close(true));
        ov.querySelector("#payBack").addEventListener("click", () => close(false));
    });
}

/* ---------------- Daftar harga (harian + bot) ---------------- */
function renderPriceList() {
    const box = $("priceList"); if (!box) return;
    const i = cuPriceInfo;
    if (!i) { box.innerHTML = ""; return; }
    const daily = ["BEM", "SEM", "LEM"].map(k => {
        const x = i[k]; if (!x || !x.normal) return "";
        const price = x.final < x.normal ? `<s>${fmtRp(x.normal)}</s> <b>${fmtRp(x.final)}</b>` : `<b>${fmtRp(x.final)}</b>`;
        const tag = x.jenis === "istimewa" ? `<span class="price-tag sp">${escapeHtml(t("price_special"))}</span>` : x.jenis === "diskon" ? `<span class="price-tag ds">${escapeHtml(t("price_discount"))} ${x.persen}%</span>` : "";
        return `<div class="pl-row"><span class="pl-name">${k}</span><span>${price} ${tag}</span></div>`;
    }).join("");
    const bot = i.bot ? ["BEM", "SEM", "LEM"].filter(k => i.bot[k] > 0).map(k => `<div class="pl-row"><span class="pl-name">${k} Bot</span><span><b>${fmtRp(i.bot[k])}</b></span></div>`).join("") : "";
    if (!daily && !bot) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="panel pl-panel"><div class="panel-title">💰 ${escapeHtml(t("pl_title"))}</div>
        <div class="pl-grid">
            <div class="pl-col"><div class="pl-head">${escapeHtml(t("pl_daily"))} <small>${escapeHtml(t("pl_daily_sub"))}</small></div>${daily || "<div class='pl-empty'>-</div>"}</div>
            <div class="pl-col"><div class="pl-head">${escapeHtml(t("pl_bot"))} <small>${escapeHtml(t("pl_bot_sub"))}</small></div>${bot || `<div class='pl-empty'>${escapeHtml(t("pl_bot_ask"))}</div>`}</div>
        </div>
        <div class="pl-note">${escapeHtml(t("pl_fast"))}</div>
        <div style="margin-top:10px;"><button type="button" class="btn btn-primary" data-bot-order>🤖 ${escapeHtml(t("bo_btn"))}</button></div></div>`;
}
document.addEventListener("DOMContentLoaded", () => { ensurePriceInfo().then(renderPriceList); });
document.addEventListener("langchange", renderPriceList);
