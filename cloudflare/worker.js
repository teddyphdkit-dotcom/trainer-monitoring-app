/**
 * cloudflare/worker.js — Dihasilkan otomatis oleh scripts/build-cloudflare.js
 * Menjalankan seluruh Frontend & Backend Trainer Monitoring di atas Cloudflare Workers + Cloudflare D1.
 */

const CLIENT_HTML_TEMPLATE = "<!DOCTYPE html>\n<html lang=\"id\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=5.0\">\n  <title>Trainer Monitoring</title>\n  <script src=\"https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js\"></script>\n  <style>\n  :root {\n    --bg-app: #0b0f17;\n    --bg-surface: rgba(22, 28, 40, 0.82);\n    --bg-subtle: rgba(30, 41, 59, 0.68);\n    --border-color: rgba(255, 255, 255, 0.1);\n    --text-primary: #f8fafc;\n    --text-secondary: #cbd5e1;\n    --text-muted: #94a3b8;\n    --primary: #3b82f6;\n    --primary-hover: #2563eb;\n    --primary-soft: rgba(59, 130, 246, 0.18);\n    --success: #4ade80;\n    --success-soft: rgba(34, 197, 94, 0.16);\n    --warning: #fbbf24;\n    --warning-soft: rgba(245, 158, 11, 0.16);\n    --danger: #fb7185;\n    --danger-soft: rgba(244, 63, 94, 0.18);\n    --sidebar-width: 260px;\n    --header-height: 60px;\n    --radius-sm: 10px;\n    --radius-md: 16px;\n    --radius-lg: 22px;\n    --shadow-sm: 0 8px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.07);\n    --shadow-md: 0 18px 42px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.1);\n    --font-sans: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n    color-scheme: dark;\n  }\n\n  *, *::before, *::after {\n    box-sizing: border-box;\n  }\n\n  html, body {\n    margin: 0;\n    padding: 0;\n    width: 100%;\n    max-width: 100vw;\n    overflow-x: hidden;\n    font-family: var(--font-sans);\n    font-size: 15px;\n    line-height: 1.5;\n    color: var(--text-primary);\n    background:\n      radial-gradient(circle at 85% 12%, rgba(59, 130, 246, 0.14) 0%, transparent 42%),\n      radial-gradient(circle at 20% 88%, rgba(225, 29, 72, 0.12) 0%, transparent 45%),\n      linear-gradient(160deg, #0b0f17 0%, #111726 55%, #0c1019 100%);\n    background-attachment: fixed;\n    -webkit-font-smoothing: antialiased;\n  }\n\n  button, input, select, textarea {\n    font-family: inherit;\n    font-size: 15px;\n  }\n\n  code {\n    background: rgba(255, 255, 255, 0.08);\n    color: #93c5fd;\n    padding: 2px 6px;\n    border-radius: 6px;\n    font-size: 12.5px;\n    border: 1px solid rgba(255, 255, 255, 0.08);\n  }\n\n  .hidden {\n    display: none !important;\n  }\n\n  /* ==================== BUTTONS & INPUTS ==================== */\n  .btn {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    gap: 8px;\n    min-height: 44px;\n    padding: 10px 16px;\n    border: 1px solid transparent;\n    border-radius: var(--radius-sm);\n    font-weight: 600;\n    cursor: pointer;\n    transition: background 0.18s ease, border-color 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease, opacity 0.15s ease;\n    text-decoration: none;\n    white-space: nowrap;\n  }\n\n  .btn:disabled {\n    opacity: 0.5;\n    cursor: not-allowed;\n  }\n\n  .btn-sm {\n    min-height: 32px;\n    padding: 5px 11px;\n    font-size: 12.5px;\n    border-radius: 8px;\n  }\n\n  /* Tombol aksi di tabel/kartu mobile lebih ramping agar tidak mendominasi judul materi */\n  table.data-table td .btn-sm,\n  .mobile-item-actions .btn-sm {\n    min-height: 28px;\n    padding: 4px 10px;\n    font-size: 12px;\n    gap: 5px;\n    border-radius: 7px;\n    font-weight: 500;\n  }\n\n  table.data-table td .btn-danger,\n  .mobile-item-actions .btn-danger {\n    background: rgba(225, 29, 72, 0.14);\n    border-color: rgba(244, 63, 94, 0.36);\n    color: #fda4af;\n    box-shadow: none;\n  }\n\n  table.data-table td .btn-danger:hover:not(:disabled),\n  .mobile-item-actions .btn-danger:hover:not(:disabled) {\n    background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);\n    border-color: rgba(255, 255, 255, 0.2);\n    color: #ffffff;\n  }\n\n  .btn-primary {\n    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);\n    border-color: rgba(255, 255, 255, 0.16);\n    color: #fff;\n    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.32);\n  }\n  .btn-primary:hover:not(:disabled) {\n    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);\n    transform: translateY(-1px);\n  }\n\n  .btn-secondary {\n    background: rgba(255, 255, 255, 0.06);\n    color: var(--text-primary);\n    border-color: rgba(255, 255, 255, 0.14);\n    backdrop-filter: blur(12px);\n  }\n  .btn-secondary:hover:not(:disabled) {\n    background: rgba(255, 255, 255, 0.12);\n    border-color: rgba(255, 255, 255, 0.22);\n  }\n\n  .btn-danger {\n    background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);\n    border-color: rgba(255, 255, 255, 0.16);\n    color: #fff;\n    box-shadow: 0 6px 16px rgba(225, 29, 72, 0.3);\n  }\n  .btn-danger:hover:not(:disabled) {\n    background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);\n  }\n\n  .btn-ghost {\n    background: transparent;\n    color: var(--text-secondary);\n  }\n  .btn-ghost:hover:not(:disabled) {\n    background: rgba(255, 255, 255, 0.08);\n    color: var(--text-primary);\n  }\n\n  .btn-block {\n    width: 100%;\n  }\n\n  .form-group {\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n    margin-bottom: 14px;\n  }\n\n  .form-label {\n    font-size: 13px;\n    font-weight: 600;\n    color: var(--text-secondary);\n  }\n\n  .form-control {\n    width: 100%;\n    min-height: 44px;\n    padding: 10px 12px;\n    border: 1px solid rgba(255, 255, 255, 0.14);\n    border-radius: var(--radius-sm);\n    background: rgba(15, 23, 42, 0.68);\n    color: var(--text-primary);\n    outline: none;\n    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;\n  }\n\n  .form-control::placeholder {\n    color: rgba(148, 163, 184, 0.68);\n  }\n\n  .form-control option {\n    background: #111827;\n    color: #f8fafc;\n  }\n\n  .form-control:focus {\n    border-color: #60a5fa;\n    background: rgba(15, 23, 42, 0.88);\n    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.22);\n  }\n\n  .form-hint {\n    font-size: 12px;\n    color: var(--text-muted);\n  }\n\n  /* ==================== PASSWORD SHOW / HIDE TOGGLE ==================== */\n  .password-field-wrap {\n    position: relative;\n    display: flex;\n    align-items: center;\n    width: 100%;\n  }\n\n  .password-field-wrap .form-control {\n    padding-right: 112px !important;\n  }\n\n  .password-toggle-btn {\n    position: absolute;\n    right: 6px;\n    top: 50%;\n    transform: translateY(-50%);\n    min-height: 32px;\n    padding: 4px 10px;\n    border-radius: 8px;\n    border: 1px solid rgba(255, 255, 255, 0.16);\n    background: rgba(255, 255, 255, 0.08);\n    color: #cbd5e1;\n    font-size: 12px;\n    font-weight: 600;\n    cursor: pointer;\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n    z-index: 2;\n    user-select: none;\n    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;\n  }\n\n  .password-toggle-btn:hover {\n    background: rgba(59, 130, 246, 0.25);\n    color: #ffffff;\n    border-color: rgba(96, 165, 250, 0.5);\n  }\n\n  /* ==================== BADGES & ALERTS ==================== */\n  .badge {\n    display: inline-flex;\n    align-items: center;\n    gap: 5px;\n    padding: 3px 10px;\n    border-radius: 999px;\n    font-size: 12px;\n    font-weight: 600;\n    line-height: 1.4;\n    border: 1px solid rgba(255, 255, 255, 0.08);\n  }\n  .badge-primary { background: var(--primary-soft); color: #93c5fd; border-color: rgba(59, 130, 246, 0.32); }\n  .badge-success { background: var(--success-soft); color: #4ade80; border-color: rgba(34, 197, 94, 0.32); }\n  .badge-warning { background: var(--warning-soft); color: #fbbf24; border-color: rgba(245, 158, 11, 0.32); }\n  .badge-danger { background: var(--danger-soft); color: #fb7185; border-color: rgba(244, 63, 94, 0.35); }\n  .badge-neutral { background: rgba(255, 255, 255, 0.07); color: var(--text-secondary); }\n\n  .alert {\n    padding: 12px 14px;\n    border-radius: var(--radius-sm);\n    border: 1px solid transparent;\n    font-size: 14px;\n    margin-bottom: 16px;\n    backdrop-filter: blur(12px);\n  }\n  .alert-error { background: rgba(244, 63, 94, 0.16); border-color: rgba(244, 63, 94, 0.4); color: #fda4af; }\n  .alert-success { background: rgba(34, 197, 94, 0.16); border-color: rgba(34, 197, 94, 0.4); color: #86efac; }\n  .alert-warning { background: rgba(245, 158, 11, 0.16); border-color: rgba(245, 158, 11, 0.4); color: #fde68a; }\n  .alert-info { background: rgba(59, 130, 246, 0.16); border-color: rgba(59, 130, 246, 0.4); color: #bfdbfe; }\n\n  /* ==================== AUTH & BOOTSTRAP SHELL (GLASSY LOGIN V2) ==================== */\n  .auth-screen {\n    min-height: 100vh;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    padding: 24px 16px;\n    background:\n      radial-gradient(circle at 18% 22%, rgba(30, 94, 255, 0.22) 0%, transparent 45%),\n      radial-gradient(circle at 82% 78%, rgba(225, 29, 72, 0.16) 0%, transparent 45%),\n      linear-gradient(145deg, #0b0e14 0%, #121722 50%, #0d111a 100%);\n    color: #f8fafc;\n  }\n\n  .auth-card {\n    width: 100%;\n    max-width: 460px;\n    background: rgba(22, 28, 40, 0.76);\n    backdrop-filter: blur(22px);\n    -webkit-backdrop-filter: blur(22px);\n    border: 1px solid rgba(255, 255, 255, 0.14);\n    border-radius: 24px;\n    padding: 32px 28px;\n    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.12);\n    color: #f8fafc;\n  }\n\n  .auth-card.auth-split-card {\n    max-width: 820px;\n    padding: 0;\n    display: grid;\n    grid-template-columns: 1.08fr 0.92fr;\n    overflow: hidden;\n  }\n\n  .auth-form-pane {\n    padding: 34px 32px;\n    display: flex;\n    flex-direction: column;\n    justify-content: center;\n  }\n\n  .auth-hero-pane {\n    padding: 34px 30px;\n    background:\n      radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.14) 0%, transparent 55%),\n      linear-gradient(155deg, rgba(255, 255, 255, 0.09) 0%, rgba(15, 23, 42, 0.55) 100%);\n    border-left: 1px solid rgba(255, 255, 255, 0.1);\n    display: flex;\n    flex-direction: column;\n    justify-content: center;\n    align-items: flex-start;\n    gap: 14px;\n  }\n\n  .auth-hero-eyebrow {\n    font-size: 11px;\n    font-weight: 700;\n    letter-spacing: 0.12em;\n    text-transform: uppercase;\n    color: rgba(255, 255, 255, 0.65);\n    background: rgba(255, 255, 255, 0.08);\n    border: 1px solid rgba(255, 255, 255, 0.14);\n    padding: 4px 10px;\n    border-radius: 999px;\n  }\n\n  .auth-hero-heading {\n    margin: 0;\n    font-size: 28px;\n    line-height: 1.15;\n    font-weight: 800;\n    letter-spacing: -0.02em;\n    color: #ffffff;\n  }\n\n  .auth-hero-desc {\n    margin: 0;\n    font-size: 13px;\n    line-height: 1.6;\n    color: rgba(226, 232, 240, 0.78);\n  }\n\n  .auth-glass-pill-btn {\n    display: inline-flex;\n    align-items: center;\n    gap: 8px;\n    min-height: 44px;\n    padding: 8px 18px;\n    border-radius: 999px;\n    background: rgba(255, 255, 255, 0.08);\n    border: 1px solid rgba(255, 255, 255, 0.22);\n    color: #ffffff;\n    font-size: 13px;\n    font-weight: 600;\n    cursor: pointer;\n    transition: background 0.2s ease, transform 0.15s ease;\n  }\n  .auth-glass-pill-btn:hover {\n    background: rgba(255, 255, 255, 0.16);\n    transform: translateY(-1px);\n  }\n\n  .auth-card .form-label {\n    color: rgba(226, 232, 240, 0.85);\n  }\n\n  .auth-card .form-control {\n    background: rgba(15, 23, 42, 0.62);\n    border-color: rgba(255, 255, 255, 0.16);\n    color: #ffffff;\n    border-radius: 12px;\n  }\n  .auth-card .form-control::placeholder {\n    color: rgba(148, 163, 184, 0.7);\n  }\n  .auth-card .form-control:focus {\n    border-color: #60a5fa;\n    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.22);\n  }\n\n  .auth-card .btn-primary {\n    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);\n    border: 1px solid rgba(255, 255, 255, 0.18);\n    border-radius: 999px;\n    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);\n  }\n\n  .auth-brand {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    text-align: center;\n    margin-bottom: 22px;\n    gap: 10px;\n  }\n\n  .auth-brand img {\n    max-height: 54px;\n    max-width: 180px;\n    object-fit: contain;\n  }\n\n  .auth-brand-icon {\n    width: 48px;\n    height: 48px;\n    border-radius: 14px;\n    background: linear-gradient(135deg, #2563eb 0%, #e11d48 100%);\n    color: #fff;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    font-weight: 800;\n    font-size: 20px;\n    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);\n  }\n\n  .auth-title {\n    margin: 0;\n    font-size: 20px;\n    font-weight: 700;\n    color: #ffffff;\n  }\n\n  .auth-subtitle {\n    margin: 0;\n    font-size: 13px;\n    color: rgba(203, 213, 225, 0.8);\n  }\n\n  .auth-links {\n    margin-top: 16px;\n    display: flex;\n    justify-content: center;\n    gap: 12px;\n    font-size: 13px;\n  }\n\n  .link-btn {\n    background: none;\n    border: none;\n    color: #93c5fd;\n    font-weight: 600;\n    cursor: pointer;\n    padding: 4px;\n  }\n  .link-btn:hover { text-decoration: underline; color: #bfdbfe; }\n\n  @media (max-width: 768px) {\n    .auth-card.auth-split-card {\n      grid-template-columns: 1fr;\n    }\n    .auth-hero-pane {\n      border-left: none;\n      border-top: 1px solid rgba(255, 255, 255, 0.1);\n      padding: 24px 24px;\n    }\n    .auth-form-pane {\n      padding: 26px 22px;\n    }\n  }\n\n  /* ==================== APP SHELL (PC & ANDROID — SIDEBAR UI V2) ==================== */\n  .app-layout {\n    display: flex;\n    min-height: 100vh;\n    width: 100%;\n    max-width: 100vw;\n  }\n\n  .sidebar {\n    width: var(--sidebar-width);\n    background: linear-gradient(180deg, #161b26 0%, #0e121b 100%);\n    color: #e2e8f0;\n    border-right: 1px solid rgba(255, 255, 255, 0.08);\n    display: flex;\n    flex-direction: column;\n    flex-shrink: 0;\n    transition: width 0.22s ease, margin-left 0.22s ease, transform 0.22s ease;\n    z-index: 40;\n    box-shadow: 6px 0 24px rgba(15, 23, 42, 0.18);\n  }\n\n  .app-layout.sidebar-collapsed .sidebar {\n    margin-left: calc(-1 * var(--sidebar-width));\n  }\n\n  .sidebar-header {\n    height: var(--header-height);\n    padding: 0 16px;\n    display: flex;\n    align-items: center;\n    gap: 10px;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.08);\n  }\n\n  .sidebar-logo {\n    max-height: 32px;\n    max-width: 32px;\n    object-fit: contain;\n    border-radius: 6px;\n  }\n\n  .sidebar-brand-text {\n    font-weight: 700;\n    font-size: 15px;\n    color: #ffffff;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n\n  .sidebar-profile-card {\n    margin: 12px 12px 6px;\n    padding: 10px 12px;\n    border-radius: 14px;\n    background: rgba(255, 255, 255, 0.05);\n    border: 1px solid rgba(255, 255, 255, 0.08);\n    display: flex;\n    align-items: center;\n    gap: 10px;\n  }\n\n  .sidebar-avatar {\n    width: 36px;\n    height: 36px;\n    border-radius: 50%;\n    background: linear-gradient(135deg, #ef4444 0%, #2563eb 100%);\n    color: #ffffff;\n    font-weight: 800;\n    font-size: 14px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    flex-shrink: 0;\n  }\n\n  .sidebar-profile-name {\n    font-weight: 700;\n    font-size: 13px;\n    color: #ffffff;\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n  }\n\n  .sidebar-profile-sub {\n    font-size: 11px;\n    color: rgba(148, 163, 184, 0.85);\n  }\n\n  .sidebar-search-box {\n    padding: 4px 12px 6px;\n  }\n\n  .sidebar-search-input {\n    width: 100%;\n    min-height: 36px;\n    padding: 6px 12px;\n    border-radius: 999px;\n    border: 1px solid rgba(255, 255, 255, 0.1);\n    background: rgba(255, 255, 255, 0.05);\n    color: #f8fafc;\n    font-size: 12px;\n    outline: none;\n  }\n  .sidebar-search-input::placeholder {\n    color: rgba(148, 163, 184, 0.7);\n  }\n  .sidebar-search-input:focus {\n    border-color: rgba(239, 68, 68, 0.6);\n  }\n\n  .sidebar-nav {\n    flex: 1;\n    padding: 8px 10px;\n    overflow-y: auto;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n  }\n\n  .nav-section-title {\n    font-size: 10px;\n    font-weight: 700;\n    text-transform: uppercase;\n    letter-spacing: 0.08em;\n    color: rgba(148, 163, 184, 0.75);\n    padding: 10px 12px 4px;\n  }\n\n  .nav-item {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 10px;\n    width: 100%;\n    min-height: 44px;\n    padding: 10px 12px;\n    border: none;\n    border-radius: 12px;\n    background: transparent;\n    color: rgba(203, 213, 225, 0.85);\n    font-weight: 600;\n    text-align: left;\n    cursor: pointer;\n    transition: background 0.18s ease, color 0.18s ease, transform 0.15s ease;\n  }\n\n  .nav-item:hover {\n    background: rgba(255, 255, 255, 0.08);\n    color: #ffffff;\n  }\n\n  .nav-item.active {\n    background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);\n    color: #ffffff;\n    box-shadow: 0 6px 18px rgba(225, 29, 72, 0.35);\n  }\n\n  .sidebar-footer {\n    padding: 12px 14px;\n    border-top: 1px solid rgba(255, 255, 255, 0.08);\n    font-size: 13px;\n  }\n\n  .sidebar-footer .btn-secondary {\n    background: rgba(255, 255, 255, 0.08);\n    color: #f8fafc;\n    border-color: rgba(255, 255, 255, 0.14);\n  }\n  .sidebar-footer .btn-secondary:hover {\n    background: rgba(239, 68, 68, 0.22);\n    border-color: rgba(239, 68, 68, 0.45);\n  }\n\n  .main-container {\n    flex: 1;\n    min-width: 0;\n    display: flex;\n    flex-direction: column;\n    background: transparent;\n  }\n\n  .top-header {\n    height: var(--header-height);\n    background: rgba(15, 20, 30, 0.78);\n    backdrop-filter: blur(18px);\n    -webkit-backdrop-filter: blur(18px);\n    border-bottom: 1px solid rgba(255, 255, 255, 0.08);\n    padding: 0 18px;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 12px;\n    position: sticky;\n    top: 0;\n    z-index: 30;\n  }\n\n  .header-left {\n    display: flex;\n    align-items: center;\n    gap: 12px;\n    min-width: 0;\n  }\n\n  .header-title {\n    margin: 0;\n    font-size: 17px;\n    font-weight: 700;\n    color: #ffffff;\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n  }\n\n  .header-right {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    flex-shrink: 0;\n  }\n\n  .icon-btn {\n    min-width: 44px;\n    min-height: 44px;\n    border: 1px solid rgba(255, 255, 255, 0.12);\n    background: rgba(255, 255, 255, 0.06);\n    border-radius: 12px;\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    cursor: pointer;\n    color: #f8fafc;\n    transition: background 0.18s ease, border-color 0.18s ease;\n  }\n  .icon-btn:hover {\n    background: rgba(255, 255, 255, 0.12);\n    border-color: rgba(255, 255, 255, 0.22);\n  }\n\n  .sync-pill {\n    display: inline-flex;\n    align-items: center;\n    gap: 6px;\n    padding: 6px 12px;\n    border-radius: 999px;\n    font-size: 12px;\n    font-weight: 600;\n    background: rgba(34, 197, 94, 0.16);\n    border: 1px solid rgba(34, 197, 94, 0.32);\n    color: #4ade80;\n  }\n  .sync-pill.offline {\n    background: rgba(245, 158, 11, 0.16);\n    border-color: rgba(245, 158, 11, 0.35);\n    color: #fbbf24;\n  }\n\n  .page-content {\n    flex: 1;\n    padding: 20px;\n    max-width: 1400px;\n    width: 100%;\n    margin: 0 auto;\n  }\n\n  /* ==================== CARDS, TOOLBARS, TABLES (SMART GLASS BENTO) ==================== */\n  .card {\n    background: linear-gradient(155deg, rgba(26, 34, 48, 0.82) 0%, rgba(16, 22, 33, 0.88) 100%);\n    backdrop-filter: blur(18px);\n    -webkit-backdrop-filter: blur(18px);\n    border: 1px solid rgba(255, 255, 255, 0.1);\n    border-radius: var(--radius-md);\n    padding: 18px;\n    box-shadow: var(--shadow-sm);\n    margin-bottom: 16px;\n    color: var(--text-primary);\n  }\n\n  .card-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    flex-wrap: wrap;\n    gap: 12px;\n    margin-bottom: 16px;\n  }\n\n  .card-title {\n    margin: 0;\n    font-size: 16px;\n    font-weight: 700;\n    color: #ffffff;\n  }\n\n  .grid-2 {\n    display: grid;\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n    gap: 16px;\n  }\n\n  .grid-3 {\n    display: grid;\n    grid-template-columns: repeat(3, minmax(0, 1fr));\n    gap: 16px;\n  }\n\n  .toolbar {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 10px;\n    margin-bottom: 16px;\n    align-items: flex-end;\n  }\n\n  .toolbar-field {\n    flex: 1;\n    min-width: 180px;\n  }\n\n  .tabs-bar {\n    display: flex;\n    gap: 8px;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.1);\n    margin-bottom: 16px;\n    overflow-x: auto;\n    padding-bottom: 6px;\n  }\n\n  .tab-btn {\n    min-height: 40px;\n    padding: 8px 16px;\n    border: 1px solid transparent;\n    border-radius: 999px;\n    background: rgba(255, 255, 255, 0.04);\n    color: var(--text-secondary);\n    font-weight: 600;\n    cursor: pointer;\n    white-space: nowrap;\n    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;\n  }\n\n  .tab-btn:hover {\n    background: rgba(255, 255, 255, 0.09);\n    color: #ffffff;\n  }\n\n  .tab-btn.active {\n    color: #ffffff;\n    background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);\n    border-color: rgba(255, 255, 255, 0.18);\n    box-shadow: 0 4px 14px rgba(225, 29, 72, 0.35);\n  }\n\n  /* ==================== PHOTOS & GALLERY ==================== */\n  .photo-grid {\n    display: grid;\n    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));\n    gap: 10px;\n    margin-top: 8px;\n  }\n\n  .photo-card {\n    border: 1px solid rgba(255, 255, 255, 0.12);\n    border-radius: var(--radius-sm);\n    padding: 8px;\n    background: rgba(15, 23, 42, 0.65);\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n  }\n\n  .photo-thumb {\n    width: 100%;\n    height: 92px;\n    object-fit: cover;\n    border-radius: 8px;\n    cursor: pointer;\n    background: rgba(30, 41, 59, 0.8);\n  }\n\n  .lightbox-img-wrap {\n    max-height: 62vh;\n    overflow: auto;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background: #090d16;\n    border: 1px solid rgba(255, 255, 255, 0.1);\n    border-radius: var(--radius-sm);\n    padding: 8px;\n  }\n\n  .lightbox-img-wrap img {\n    max-width: 100%;\n    transition: transform 0.15s ease;\n    transform-origin: center center;\n  }\n\n  .suggestion-box {\n    border: 1px solid rgba(255, 255, 255, 0.14);\n    border-radius: var(--radius-sm);\n    background: rgba(17, 24, 39, 0.96);\n    backdrop-filter: blur(16px);\n    margin-top: 4px;\n    overflow: hidden;\n    box-shadow: var(--shadow-md);\n  }\n\n  .suggestion-item {\n    width: 100%;\n    text-align: left;\n    padding: 10px 12px;\n    border: none;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.08);\n    background: transparent;\n    color: var(--text-primary);\n    cursor: pointer;\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    gap: 8px;\n  }\n\n  .suggestion-item:last-child {\n    border-bottom: none;\n  }\n\n  .suggestion-item:hover {\n    background: rgba(59, 130, 246, 0.2);\n  }\n\n  /* ==================== DASHBOARD & KPI (SMART CONTROL BENTO) ==================== */\n  .kpi-grid {\n    display: grid;\n    grid-template-columns: repeat(4, minmax(0, 1fr));\n    gap: 14px;\n    margin-bottom: 18px;\n  }\n\n  .kpi-card {\n    background:\n      radial-gradient(circle at 90% 15%, rgba(59, 130, 246, 0.16) 0%, transparent 55%),\n      linear-gradient(155deg, rgba(28, 37, 54, 0.86) 0%, rgba(16, 22, 34, 0.9) 100%);\n    backdrop-filter: blur(18px);\n    -webkit-backdrop-filter: blur(18px);\n    border: 1px solid rgba(255, 255, 255, 0.12);\n    border-radius: var(--radius-md);\n    padding: 18px;\n    box-shadow: var(--shadow-sm);\n    display: flex;\n    flex-direction: column;\n    justify-content: space-between;\n    transition: transform 0.18s ease, border-color 0.18s ease;\n  }\n\n  .kpi-card:hover {\n    transform: translateY(-2px);\n    border-color: rgba(255, 255, 255, 0.22);\n  }\n\n  .kpi-card.kpi-recurring-alert {\n    border-color: rgba(244, 63, 94, 0.45);\n    background:\n      radial-gradient(circle at 90% 15%, rgba(225, 29, 72, 0.24) 0%, transparent 55%),\n      linear-gradient(155deg, rgba(44, 19, 32, 0.88) 0%, rgba(24, 14, 24, 0.92) 100%);\n  }\n\n  .kpi-label {\n    font-size: 11.5px;\n    font-weight: 700;\n    text-transform: uppercase;\n    letter-spacing: 0.06em;\n    color: var(--text-secondary);\n  }\n\n  .kpi-value {\n    font-size: 30px;\n    font-weight: 800;\n    margin: 8px 0 4px;\n    color: #ffffff;\n    letter-spacing: -0.02em;\n  }\n\n  .kpi-card.kpi-recurring-alert .kpi-value {\n    color: #fb7185;\n  }\n\n  .kpi-sub {\n    font-size: 12px;\n    color: var(--text-muted);\n  }\n\n  .filter-chips-wrap {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 6px;\n    max-height: 110px;\n    overflow-y: auto;\n    padding: 8px;\n    border: 1px solid rgba(255, 255, 255, 0.12);\n    border-radius: var(--radius-sm);\n    background: rgba(15, 23, 42, 0.65);\n  }\n\n  .filter-chip {\n    display: inline-flex;\n    align-items: center;\n    gap: 5px;\n    padding: 4px 11px;\n    border-radius: 999px;\n    font-size: 12px;\n    border: 1px solid rgba(255, 255, 255, 0.14);\n    background: rgba(255, 255, 255, 0.05);\n    color: var(--text-secondary);\n    cursor: pointer;\n    user-select: none;\n    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;\n  }\n\n  .filter-chip:hover {\n    background: rgba(255, 255, 255, 0.1);\n    color: #ffffff;\n  }\n\n  .filter-chip.selected {\n    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);\n    color: #fff;\n    border-color: rgba(147, 197, 253, 0.5);\n  }\n\n  /* ==================== MULTI-SELECT DROPDOWN SLICER (PC & HP) ==================== */\n  /* Kartu Filter Global dinaikkan lapisannya agar menu dropdown tidak tertimpa\n     kartu KPI/tab di bawahnya (backdrop-filter membuat stacking context per kartu).\n     Nilai 20 tetap di bawah topbar (30), overlay sidebar (35), sidebar (40) & modal (100+). */\n  .dash-filter-card {\n    position: relative;\n    z-index: 20;\n  }\n\n  .ms-dropdown {\n    position: relative;\n    width: 100%;\n  }\n\n  .ms-dropdown.open {\n    z-index: 5;\n  }\n\n  .ms-trigger {\n    width: 100%;\n    min-height: 44px;\n    padding: 8px 12px;\n    border: 1px solid rgba(255, 255, 255, 0.14);\n    border-radius: var(--radius-sm);\n    background: rgba(15, 23, 42, 0.68);\n    color: var(--text-primary);\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 8px;\n    cursor: pointer;\n    text-align: left;\n    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;\n  }\n\n  .ms-trigger:hover {\n    border-color: rgba(255, 255, 255, 0.26);\n    background: rgba(15, 23, 42, 0.85);\n  }\n\n  .ms-dropdown.open .ms-trigger,\n  .ms-trigger.has-selection {\n    border-color: rgba(96, 165, 250, 0.55);\n    background: rgba(30, 58, 138, 0.26);\n  }\n\n  .ms-trigger-text {\n    flex: 1;\n    min-width: 0;\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    font-size: 13.5px;\n    color: var(--text-primary);\n  }\n\n  .ms-trigger-right {\n    display: inline-flex;\n    align-items: center;\n    gap: 6px;\n    flex-shrink: 0;\n  }\n\n  .ms-trigger-badge {\n    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);\n    color: #ffffff;\n    font-size: 11px;\n    font-weight: 700;\n    padding: 2px 8px;\n    border-radius: 999px;\n  }\n\n  .ms-chevron {\n    font-size: 12px;\n    color: var(--text-secondary);\n    transition: transform 0.18s ease;\n  }\n\n  .ms-dropdown.open .ms-chevron {\n    transform: rotate(180deg);\n  }\n\n  .ms-menu {\n    position: absolute;\n    top: calc(100% + 6px);\n    left: 0;\n    right: 0;\n    z-index: 75;\n    background: #0f1624;\n    backdrop-filter: blur(18px);\n    -webkit-backdrop-filter: blur(18px);\n    border: 1px solid rgba(255, 255, 255, 0.18);\n    border-radius: 12px;\n    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.68);\n    padding: 8px;\n    display: none;\n    flex-direction: column;\n    gap: 6px;\n  }\n\n  .ms-dropdown.open .ms-menu {\n    display: flex;\n  }\n\n  .ms-actions {\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    gap: 6px;\n    padding-bottom: 6px;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.08);\n  }\n\n  .ms-action-btn {\n    background: rgba(255, 255, 255, 0.06);\n    border: 1px solid rgba(255, 255, 255, 0.12);\n    color: #93c5fd;\n    border-radius: 6px;\n    padding: 4px 9px;\n    font-size: 11.5px;\n    font-weight: 600;\n    cursor: pointer;\n  }\n\n  .ms-action-btn:hover {\n    background: rgba(59, 130, 246, 0.22);\n    color: #ffffff;\n  }\n\n  .ms-search {\n    width: 100%;\n    min-height: 36px;\n    padding: 6px 10px;\n    border-radius: 8px;\n    border: 1px solid rgba(255, 255, 255, 0.14);\n    background: rgba(9, 13, 22, 0.85);\n    color: #f8fafc;\n    font-size: 13px;\n    outline: none;\n  }\n\n  .ms-search:focus {\n    border-color: #60a5fa;\n  }\n\n  .ms-list {\n    max-height: 210px;\n    overflow-y: auto;\n    display: flex;\n    flex-direction: column;\n    gap: 2px;\n  }\n\n  .ms-option {\n    display: flex;\n    align-items: center;\n    gap: 10px;\n    padding: 8px 10px;\n    border-radius: 8px;\n    cursor: pointer;\n    font-size: 13px;\n    color: var(--text-secondary);\n    user-select: none;\n    min-height: 40px;\n    transition: background 0.12s ease, color 0.12s ease;\n  }\n\n  .ms-option:hover {\n    background: rgba(255, 255, 255, 0.07);\n    color: #ffffff;\n  }\n\n  .ms-option.selected {\n    background: rgba(59, 130, 246, 0.18);\n    color: #ffffff;\n    font-weight: 600;\n  }\n\n  .ms-checkbox {\n    width: 18px;\n    height: 18px;\n    border-radius: 5px;\n    border: 1.5px solid rgba(255, 255, 255, 0.28);\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    font-size: 11px;\n    font-weight: 800;\n    color: transparent;\n    flex-shrink: 0;\n    background: rgba(15, 23, 42, 0.7);\n  }\n\n  .ms-option.selected .ms-checkbox {\n    background: #2563eb;\n    border-color: #60a5fa;\n    color: #ffffff;\n  }\n\n  .chart-box {\n    position: relative;\n    width: 100%;\n    min-height: 260px;\n  }\n\n  @media (max-width: 1024px) {\n    .kpi-grid {\n      grid-template-columns: repeat(2, minmax(0, 1fr));\n    }\n  }\n\n  @media (max-width: 560px) {\n    .kpi-grid {\n      grid-template-columns: 1fr;\n    }\n  }\n\n  .table-wrap {\n    width: 100%;\n    overflow-x: auto;\n    border-radius: var(--radius-sm);\n    border: 1px solid rgba(255, 255, 255, 0.08);\n  }\n\n  table.data-table {\n    width: 100%;\n    border-collapse: collapse;\n    font-size: 14px;\n  }\n\n  table.data-table th,\n  table.data-table td {\n    padding: 12px 14px;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.08);\n    text-align: left;\n    vertical-align: middle;\n    color: var(--text-primary);\n  }\n\n  table.data-table tbody tr:hover {\n    background: rgba(255, 255, 255, 0.04);\n  }\n\n  table.data-table th {\n    font-size: 11.5px;\n    text-transform: uppercase;\n    letter-spacing: 0.05em;\n    color: var(--text-secondary);\n    background: rgba(15, 23, 42, 0.78);\n    font-weight: 700;\n  }\n\n  .mobile-card-list {\n    display: none;\n    flex-direction: column;\n    gap: 12px;\n  }\n\n  .mobile-item-card {\n    border: 1px solid rgba(255, 255, 255, 0.1);\n    border-radius: var(--radius-md);\n    padding: 14px;\n    background: rgba(17, 24, 39, 0.72);\n    backdrop-filter: blur(14px);\n    color: var(--text-primary);\n  }\n\n  .mobile-item-row {\n    display: flex;\n    justify-content: space-between;\n    align-items: flex-start;\n    gap: 10px;\n    margin-bottom: 8px;\n  }\n\n  .mobile-item-actions {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 8px;\n    margin-top: 12px;\n  }\n\n  /* ==================== MODAL & TOAST ==================== */\n  .modal-backdrop {\n    position: fixed;\n    inset: 0;\n    background: rgba(6, 10, 18, 0.72);\n    backdrop-filter: blur(8px);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    padding: 16px;\n    z-index: 100;\n  }\n\n  .modal-dialog {\n    width: 100%;\n    max-width: 540px;\n    max-height: 90vh;\n    overflow-y: auto;\n    background: linear-gradient(155deg, rgba(24, 32, 48, 0.96) 0%, rgba(15, 20, 32, 0.98) 100%);\n    border: 1px solid rgba(255, 255, 255, 0.14);\n    border-radius: var(--radius-lg);\n    padding: 22px;\n    box-shadow: var(--shadow-md);\n    color: var(--text-primary);\n  }\n\n  .modal-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    margin-bottom: 16px;\n    padding-bottom: 10px;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.08);\n  }\n\n  .modal-title {\n    margin: 0;\n    font-size: 17px;\n    font-weight: 700;\n    color: #ffffff;\n  }\n\n  .modal-footer {\n    display: flex;\n    justify-content: flex-end;\n    gap: 10px;\n    margin-top: 18px;\n    flex-wrap: wrap;\n  }\n\n  /* ==================== KARTU KONFIRMASI MODERN ==================== */\n  .tm-dialog-layer {\n    position: fixed;\n    inset: 0;\n    z-index: 110;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    padding: 18px;\n    background: rgba(4, 8, 16, 0.62);\n    backdrop-filter: blur(10px);\n    -webkit-backdrop-filter: blur(10px);\n    opacity: 0;\n    transition: opacity 0.18s ease;\n  }\n\n  .tm-dialog-layer.show {\n    opacity: 1;\n  }\n\n  .tm-dialog {\n    --dlg-accent: #3b82f6;\n    --dlg-accent-soft: rgba(59, 130, 246, 0.16);\n    position: relative;\n    width: 100%;\n    max-width: 400px;\n    padding: 26px 22px 20px;\n    border-radius: 20px;\n    text-align: center;\n    color: var(--text-primary);\n    background: linear-gradient(160deg, rgba(28, 37, 54, 0.98) 0%, rgba(14, 19, 30, 0.99) 100%);\n    border: 1px solid rgba(255, 255, 255, 0.12);\n    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06);\n    overflow: hidden;\n    transform: translateY(14px) scale(0.96);\n    transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2);\n  }\n\n  .tm-dialog::before {\n    content: '';\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    height: 4px;\n    background: linear-gradient(90deg, transparent, var(--dlg-accent), transparent);\n  }\n\n  .tm-dialog-layer.show .tm-dialog {\n    transform: translateY(0) scale(1);\n  }\n\n  .tm-dialog-danger { --dlg-accent: #ef4444; --dlg-accent-soft: rgba(239, 68, 68, 0.16); }\n  .tm-dialog-warning { --dlg-accent: #f59e0b; --dlg-accent-soft: rgba(245, 158, 11, 0.16); }\n  .tm-dialog-success { --dlg-accent: #22c55e; --dlg-accent-soft: rgba(34, 197, 94, 0.16); }\n  .tm-dialog-info { --dlg-accent: #06b6d4; --dlg-accent-soft: rgba(6, 182, 212, 0.16); }\n\n  .tm-dialog-icon {\n    width: 62px;\n    height: 62px;\n    margin: 0 auto 14px;\n    border-radius: 50%;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    font-size: 26px;\n    color: var(--dlg-accent);\n    background: var(--dlg-accent-soft);\n    box-shadow: 0 0 0 7px rgba(255, 255, 255, 0.03), 0 0 28px var(--dlg-accent-soft);\n  }\n\n  .tm-dialog-title {\n    margin: 0 0 8px;\n    font-size: 18px;\n    font-weight: 800;\n    color: #ffffff;\n  }\n\n  .tm-dialog-message {\n    font-size: 14px;\n    line-height: 1.55;\n    color: var(--text-secondary);\n  }\n\n  .tm-dialog-highlight {\n    display: inline-block;\n    max-width: 100%;\n    margin-top: 12px;\n    padding: 8px 14px;\n    border-radius: 12px;\n    font-weight: 700;\n    font-size: 14px;\n    color: #ffffff;\n    background: rgba(255, 255, 255, 0.06);\n    border: 1px solid rgba(255, 255, 255, 0.1);\n    word-break: break-word;\n  }\n\n  .tm-dialog-note {\n    margin-top: 12px;\n    padding: 8px 12px;\n    border-radius: 10px;\n    font-size: 12.5px;\n    color: var(--dlg-accent);\n    background: var(--dlg-accent-soft);\n  }\n\n  .tm-dialog-field {\n    margin-top: 14px;\n    text-align: left;\n  }\n\n  .tm-dialog-input {\n    resize: vertical;\n    min-height: 78px;\n  }\n\n  .tm-dialog-input.is-invalid {\n    border-color: #ef4444 !important;\n  }\n\n  .tm-dialog-error {\n    margin-top: 6px;\n    font-size: 12.5px;\n    color: #f87171;\n  }\n\n  .tm-dialog-actions {\n    display: flex;\n    gap: 10px;\n    margin-top: 20px;\n  }\n\n  .tm-dialog-btn {\n    flex: 1;\n    min-height: 44px;\n    justify-content: center;\n    font-weight: 700;\n  }\n\n  @media (max-width: 420px) {\n    .tm-dialog-actions {\n      flex-direction: column-reverse;\n    }\n  }\n\n  .toast-container {\n    position: fixed;\n    right: 16px;\n    bottom: 16px;\n    z-index: 120;\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n    max-width: calc(100vw - 32px);\n  }\n\n  .toast {\n    padding: 12px 16px;\n    border-radius: 12px;\n    background: rgba(22, 30, 46, 0.95);\n    border: 1px solid rgba(255, 255, 255, 0.14);\n    backdrop-filter: blur(14px);\n    color: #fff;\n    font-size: 14px;\n    font-weight: 500;\n    box-shadow: var(--shadow-md);\n  }\n  .toast.toast-error { background: rgba(190, 18, 60, 0.94); border-color: rgba(251, 113, 133, 0.45); }\n  .toast.toast-success { background: rgba(21, 128, 61, 0.94); border-color: rgba(74, 222, 128, 0.45); }\n\n  .drawer-backdrop {\n    display: none;\n  }\n\n  .spinner {\n    width: 18px;\n    height: 18px;\n    border: 2.5px solid rgba(255, 255, 255, 0.35);\n    border-top-color: #fff;\n    border-radius: 50%;\n    animation: spin 0.7s linear infinite;\n    display: inline-block;\n  }\n  .spinner-dark {\n    border-color: rgba(255, 255, 255, 0.2);\n    border-top-color: var(--primary);\n  }\n  @keyframes spin { to { transform: rotate(360deg); } }\n\n  /* ==================== ANDROID / MOBILE <= 768px ==================== */\n  @media (max-width: 768px) {\n    .sidebar {\n      position: fixed;\n      top: 0;\n      bottom: 0;\n      left: 0;\n      transform: translateX(-100%);\n      margin-left: 0 !important;\n      box-shadow: var(--shadow-md);\n    }\n\n    .app-layout.drawer-open .sidebar {\n      transform: translateX(0);\n    }\n\n    .app-layout.drawer-open .drawer-backdrop {\n      display: block;\n      position: fixed;\n      inset: 0;\n      background: rgba(6, 10, 18, 0.65);\n      backdrop-filter: blur(4px);\n      z-index: 35;\n    }\n\n    .page-content {\n      padding: 14px 12px;\n    }\n\n    .grid-2, .grid-3 {\n      grid-template-columns: 1fr;\n    }\n\n    .table-wrap {\n      display: none;\n    }\n\n    .mobile-card-list {\n      display: flex;\n    }\n\n    .sync-label-text {\n      display: none;\n    }\n  }\n\n  /* ==================== TEMA CERAH GLASSY (OPSIONAL VIA TOMBOL TOGGLE) ==================== */\n  html.theme-light {\n    --bg-app: #eef2f9;\n    --bg-surface: rgba(255, 255, 255, 0.82);\n    --bg-subtle: rgba(241, 245, 249, 0.88);\n    --border-color: rgba(15, 23, 42, 0.1);\n    --text-primary: #0f172a;\n    --text-secondary: #334155;\n    --text-muted: #64748b;\n    --primary: #2563eb;\n    --primary-hover: #1d4ed8;\n    --primary-soft: rgba(37, 99, 235, 0.12);\n    --success: #16a34a;\n    --success-soft: rgba(22, 163, 74, 0.12);\n    --warning: #d97706;\n    --warning-soft: rgba(217, 119, 6, 0.12);\n    --danger: #e11d48;\n    --danger-soft: rgba(225, 29, 72, 0.12);\n    --shadow-sm: 0 8px 24px rgba(15, 23, 42, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.85);\n    --shadow-md: 0 18px 42px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.9);\n    color-scheme: light;\n  }\n\n  html.theme-light,\n  html.theme-light body {\n    background:\n      radial-gradient(circle at 85% 12%, rgba(59, 130, 246, 0.14) 0%, transparent 44%),\n      radial-gradient(circle at 18% 88%, rgba(225, 29, 72, 0.09) 0%, transparent 45%),\n      linear-gradient(160deg, #f1f5f9 0%, #e7eef8 55%, #f8fafc 100%);\n    background-attachment: fixed;\n    color: var(--text-primary);\n  }\n\n  html.theme-light code {\n    background: rgba(37, 99, 235, 0.08);\n    color: #1d4ed8;\n    border-color: rgba(37, 99, 235, 0.16);\n  }\n\n  html.theme-light .sidebar {\n    background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(241, 245, 249, 0.96) 100%);\n    color: var(--text-primary);\n    border-right-color: rgba(15, 23, 42, 0.09);\n    box-shadow: 6px 0 24px rgba(15, 23, 42, 0.07);\n  }\n\n  html.theme-light .sidebar-header,\n  html.theme-light .sidebar-footer {\n    border-color: rgba(15, 23, 42, 0.08);\n  }\n\n  html.theme-light .sidebar-brand-text,\n  html.theme-light .sidebar-profile-name {\n    color: #0f172a;\n  }\n\n  html.theme-light .sidebar-profile-sub {\n    color: #64748b;\n  }\n\n  html.theme-light .sidebar-profile-card {\n    background: rgba(15, 23, 42, 0.04);\n    border-color: rgba(15, 23, 42, 0.08);\n  }\n\n  html.theme-light .sidebar-search-input {\n    background: rgba(255, 255, 255, 0.9);\n    border-color: rgba(15, 23, 42, 0.14);\n    color: #0f172a;\n  }\n  html.theme-light .sidebar-search-input::placeholder {\n    color: #94a3b8;\n  }\n\n  html.theme-light .nav-section-title {\n    color: #64748b;\n  }\n\n  html.theme-light .nav-item {\n    color: #334155;\n  }\n\n  html.theme-light .nav-item:hover {\n    background: rgba(15, 23, 42, 0.06);\n    color: #0f172a;\n  }\n\n  html.theme-light .sidebar-footer .btn-secondary {\n    background: rgba(15, 23, 42, 0.05);\n    color: #0f172a;\n    border-color: rgba(15, 23, 42, 0.14);\n  }\n  html.theme-light .sidebar-footer .btn-secondary:hover {\n    background: rgba(225, 29, 72, 0.12);\n    border-color: rgba(225, 29, 72, 0.35);\n    color: #be123c;\n  }\n\n  html.theme-light .top-header {\n    background: rgba(255, 255, 255, 0.8);\n    border-bottom-color: rgba(15, 23, 42, 0.08);\n  }\n\n  html.theme-light .header-title,\n  html.theme-light .card-title,\n  html.theme-light .kpi-value,\n  html.theme-light .modal-title,\n  html.theme-light .tm-dialog-title {\n    color: #0f172a;\n  }\n\n  html.theme-light .icon-btn {\n    background: rgba(15, 23, 42, 0.04);\n    border-color: rgba(15, 23, 42, 0.12);\n    color: #0f172a;\n  }\n  html.theme-light .icon-btn:hover {\n    background: rgba(15, 23, 42, 0.09);\n    border-color: rgba(15, 23, 42, 0.22);\n  }\n\n  html.theme-light .sync-pill {\n    background: rgba(22, 163, 74, 0.12);\n    border-color: rgba(22, 163, 74, 0.3);\n    color: #15803d;\n  }\n  html.theme-light .sync-pill.offline {\n    background: rgba(217, 119, 6, 0.14);\n    border-color: rgba(217, 119, 6, 0.35);\n    color: #b45309;\n  }\n\n  html.theme-light .card {\n    background: linear-gradient(155deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.82) 100%);\n    border-color: rgba(15, 23, 42, 0.09);\n  }\n\n  html.theme-light .kpi-card {\n    background:\n      radial-gradient(circle at 90% 15%, rgba(59, 130, 246, 0.12) 0%, transparent 55%),\n      linear-gradient(155deg, rgba(255, 255, 255, 0.92) 0%, rgba(248, 250, 252, 0.86) 100%);\n    border-color: rgba(15, 23, 42, 0.09);\n  }\n\n  html.theme-light .kpi-card.kpi-recurring-alert {\n    border-color: rgba(225, 29, 72, 0.35);\n    background:\n      radial-gradient(circle at 90% 15%, rgba(225, 29, 72, 0.12) 0%, transparent 55%),\n      linear-gradient(155deg, rgba(255, 245, 247, 0.94) 0%, rgba(255, 255, 255, 0.9) 100%);\n  }\n\n  html.theme-light .kpi-card.kpi-recurring-alert .kpi-value {\n    color: #e11d48;\n  }\n\n  html.theme-light .btn-secondary {\n    background: rgba(255, 255, 255, 0.85);\n    border-color: rgba(15, 23, 42, 0.14);\n    color: #0f172a;\n  }\n  html.theme-light .btn-secondary:hover:not(:disabled) {\n    background: rgba(241, 245, 249, 0.98);\n    border-color: rgba(15, 23, 42, 0.25);\n  }\n\n  html.theme-light .btn-ghost {\n    color: #475569;\n  }\n  html.theme-light .btn-ghost:hover:not(:disabled) {\n    background: rgba(15, 23, 42, 0.06);\n    color: #0f172a;\n  }\n\n  html.theme-light table.data-table td .btn-danger,\n  html.theme-light .mobile-item-actions .btn-danger {\n    background: rgba(225, 29, 72, 0.1);\n    border-color: rgba(225, 29, 72, 0.3);\n    color: #be123c;\n  }\n\n  html.theme-light .form-control,\n  html.theme-light .ms-trigger {\n    background: rgba(255, 255, 255, 0.9);\n    border-color: rgba(15, 23, 42, 0.15);\n    color: #0f172a;\n  }\n  html.theme-light .form-control:focus {\n    background: #ffffff;\n    border-color: #2563eb;\n  }\n  html.theme-light .form-control option {\n    background: #ffffff;\n    color: #0f172a;\n  }\n\n  html.theme-light .password-toggle-btn {\n    background: rgba(15, 23, 42, 0.05);\n    border-color: rgba(15, 23, 42, 0.14);\n    color: #334155;\n  }\n  html.theme-light .password-toggle-btn:hover {\n    background: rgba(37, 99, 235, 0.12);\n    color: #1d4ed8;\n  }\n\n  html.theme-light .tabs-bar {\n    border-bottom-color: rgba(15, 23, 42, 0.1);\n  }\n  html.theme-light .tab-btn {\n    background: rgba(15, 23, 42, 0.04);\n    color: #475569;\n  }\n  html.theme-light .tab-btn:hover {\n    background: rgba(15, 23, 42, 0.08);\n    color: #0f172a;\n  }\n  html.theme-light .tab-btn.active {\n    color: #ffffff;\n    background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);\n  }\n\n  html.theme-light .table-wrap {\n    border-color: rgba(15, 23, 42, 0.1);\n  }\n  html.theme-light table.data-table th {\n    background: rgba(241, 245, 249, 0.95);\n    color: #334155;\n    border-bottom-color: rgba(15, 23, 42, 0.1);\n  }\n  html.theme-light table.data-table td {\n    border-bottom-color: rgba(15, 23, 42, 0.08);\n  }\n  html.theme-light table.data-table tbody tr:hover {\n    background: rgba(37, 99, 235, 0.04);\n  }\n\n  html.theme-light .mobile-item-card,\n  html.theme-light .photo-card,\n  html.theme-light .filter-chips-wrap {\n    background: rgba(255, 255, 255, 0.85);\n    border-color: rgba(15, 23, 42, 0.1);\n  }\n\n  html.theme-light .ms-dropdown.open .ms-trigger,\n  html.theme-light .ms-trigger.has-selection {\n    border-color: rgba(37, 99, 235, 0.55);\n    background: rgba(219, 234, 254, 0.72);\n  }\n  html.theme-light .ms-menu,\n  html.theme-light .suggestion-box {\n    background: #ffffff;\n    border-color: rgba(15, 23, 42, 0.14);\n    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.15);\n  }\n  html.theme-light .ms-actions {\n    border-bottom-color: rgba(15, 23, 42, 0.08);\n  }\n  html.theme-light .ms-action-btn {\n    background: rgba(37, 99, 235, 0.08);\n    border-color: rgba(37, 99, 235, 0.2);\n    color: #1d4ed8;\n  }\n  html.theme-light .ms-search {\n    background: #f8fafc;\n    border-color: rgba(15, 23, 42, 0.15);\n    color: #0f172a;\n  }\n  html.theme-light .ms-option {\n    color: #334155;\n  }\n  html.theme-light .ms-option:hover {\n    background: rgba(15, 23, 42, 0.05);\n    color: #0f172a;\n  }\n  html.theme-light .ms-option.selected {\n    background: rgba(37, 99, 235, 0.1);\n    color: #1d4ed8;\n  }\n  html.theme-light .ms-checkbox {\n    background: #ffffff;\n    border-color: rgba(15, 23, 42, 0.28);\n  }\n\n  html.theme-light .badge { border-color: rgba(15, 23, 42, 0.08); }\n  html.theme-light .badge-primary { color: #1d4ed8; border-color: rgba(37, 99, 235, 0.26); }\n  html.theme-light .badge-success { color: #15803d; border-color: rgba(22, 163, 74, 0.28); }\n  html.theme-light .badge-warning { color: #b45309; border-color: rgba(217, 119, 6, 0.3); }\n  html.theme-light .badge-danger { color: #be123c; border-color: rgba(225, 29, 72, 0.3); }\n  html.theme-light .badge-neutral { background: rgba(15, 23, 42, 0.06); color: #475569; }\n\n  html.theme-light .alert-error { background: rgba(254, 226, 226, 0.9); border-color: rgba(225, 29, 72, 0.35); color: #9f1239; }\n  html.theme-light .alert-success { background: rgba(220, 252, 231, 0.9); border-color: rgba(22, 163, 74, 0.35); color: #166534; }\n  html.theme-light .alert-warning { background: rgba(254, 243, 199, 0.92); border-color: rgba(217, 119, 6, 0.35); color: #92400e; }\n  html.theme-light .alert-info { background: rgba(219, 234, 254, 0.9); border-color: rgba(37, 99, 235, 0.35); color: #1e40af; }\n\n  html.theme-light .modal-backdrop,\n  html.theme-light .tm-dialog-layer {\n    background: rgba(15, 23, 42, 0.42);\n  }\n  html.theme-light .modal-dialog,\n  html.theme-light .tm-dialog {\n    background: linear-gradient(160deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.98) 100%);\n    border-color: rgba(15, 23, 42, 0.12);\n    color: #0f172a;\n  }\n  html.theme-light .modal-header {\n    border-bottom-color: rgba(15, 23, 42, 0.08);\n  }\n  html.theme-light .tm-dialog-highlight {\n    background: rgba(15, 23, 42, 0.05);\n    border-color: rgba(15, 23, 42, 0.1);\n    color: #0f172a;\n  }\n  html.theme-light .toast {\n    background: rgba(255, 255, 255, 0.96);\n    border-color: rgba(15, 23, 42, 0.12);\n    color: #0f172a;\n  }\n  html.theme-light .toast.toast-error { background: #e11d48; color: #ffffff; }\n  html.theme-light .toast.toast-success { background: #16a34a; color: #ffffff; }\n</style>\n\n</head>\n<body>\n  <div id=\"app-root\" data-mode=\"<?= initialMode || '' ?>\" data-reset-token=\"<?= initialResetToken || '' ?>\">\n    <div class=\"auth-screen\">\n      <div class=\"auth-card\" style=\"text-align:center;\">\n        <span class=\"spinner spinner-dark\" style=\"width:28px;height:28px;\"></span>\n        <p style=\"margin:12px 0 0;color:var(--text-secondary);\">Memuat Trainer Monitoring...</p>\n      </div>\n    </div>\n  </div>\n  <div id=\"modal-root\"></div>\n  <div id=\"toast-container\" class=\"toast-container\"></div>\n\n  <script>\n    (function () {\n      var el = document.getElementById('app-root');\n      window.TM_BOOT_PARAMS = {\n        mode: el ? (el.getAttribute('data-mode') || '') : '',\n        resetToken: el ? (el.getAttribute('data-reset-token') || '') : ''\n      };\n    })();\n  </script>\n  <script>\n  window.TM_API = (function () {\n    var TOKEN_STORAGE_KEY = 'tm_auth_token_v1';\n    var DEVICE_ID_KEY = 'tm_device_id_v1';\n    var SESSION_CHECKPOINT_KEY = 'tm_session_checkpoint_v1';\n    var AUTH_PRESERVATION_TIMEOUT_MS = 2000;\n\n    // In-memory + Storage Token State Cache mengikuti pola integration-token-file-cache.ts (Orca)\n    var tokenState = {\n      present: false,\n      token: undefined,\n      error: undefined\n    };\n\n    function readBearer(value) {\n      if (!value || typeof value !== 'string') return '';\n      var trimmed = value.trim();\n      var match = /^Bearer\\s+([^\\s]+)$/i.exec(trimmed);\n      return match ? match[1] : trimmed;\n    }\n\n    function getToken(force) {\n      if (tokenState.token !== undefined && force !== true) {\n        return tokenState.token;\n      }\n      try {\n        var stored = readBearer(localStorage.getItem(TOKEN_STORAGE_KEY) || '');\n        tokenState.present = Boolean(stored);\n        tokenState.token = stored;\n        tokenState.error = undefined;\n        return stored;\n      } catch (e) {\n        tokenState.error = e && e.message ? e.message : 'Storage error';\n        return tokenState.token || '';\n      }\n    }\n\n    function setToken(rawToken) {\n      var clean = readBearer(rawToken || '');\n      tokenState.present = Boolean(clean);\n      tokenState.token = clean;\n      tokenState.error = undefined;\n      try {\n        if (clean) {\n          localStorage.setItem(TOKEN_STORAGE_KEY, clean);\n        } else {\n          localStorage.removeItem(TOKEN_STORAGE_KEY);\n        }\n      } catch (e) {\n        tokenState.error = e && e.message ? e.message : 'Storage error';\n      }\n    }\n\n    function forgetToken() {\n      setToken('');\n    }\n\n    // Penjagaan sesi & checkpoint sebelum restart/unload mengikuti pola agent-auth-restart-preservation.ts (Orca)\n    function preserveAuthBeforeUnload() {\n      var startedAt = Date.now();\n      try {\n        if (tokenState.token) {\n          localStorage.setItem(TOKEN_STORAGE_KEY, tokenState.token);\n        }\n        var remaining = Math.max(0, AUTH_PRESERVATION_TIMEOUT_MS - (Date.now() - startedAt));\n        if (remaining > 0) {\n          localStorage.setItem(SESSION_CHECKPOINT_KEY, JSON.stringify({\n            savedAt: new Date().toISOString(),\n            hasToken: Boolean(tokenState.token)\n          }));\n        }\n      } catch (e) {\n        // Jangan blokir proses unload\n      }\n    }\n\n    if (typeof window !== 'undefined' && window.addEventListener) {\n      window.addEventListener('beforeunload', preserveAuthBeforeUnload);\n      document.addEventListener('visibilitychange', function () {\n        if (document.visibilityState === 'hidden') {\n          preserveAuthBeforeUnload();\n        }\n      });\n    }\n\n    function getDeviceInfo() {\n      var devId = '';\n      try {\n        devId = localStorage.getItem(DEVICE_ID_KEY) || '';\n        if (!devId) {\n          devId = 'DEV-' + Math.random().toString(36).slice(2, 10).toUpperCase();\n          localStorage.setItem(DEVICE_ID_KEY, devId);\n        }\n      } catch (e) {\n        devId = 'DEV-TEMP';\n      }\n      var isMobile = /Android|Mobile/i.test(navigator.userAgent || '');\n      return devId + ' | ' + (isMobile ? 'Android/Mobile' : 'Desktop') + ' | ' + (navigator.platform || 'Web');\n    }\n\n    function handleRpcResponse(res, resolve, reject) {\n      if (res && res.ok) {\n        resolve(res.data);\n      } else {\n        var err = (res && res.error) ? res.error : { code: 'ERR_UNKNOWN', message: 'Permintaan gagal.' };\n        if (\n          err.code === 'ERR_UNAUTHORIZED' ||\n          err.code === 'ERR_SESSION_EXPIRED' ||\n          err.code === 'ERR_SESSION_IDLE_TIMEOUT' ||\n          err.code === 'ERR_SESSION_REVOKED'\n        ) {\n          forgetToken();\n          if (window.TM_APP && typeof window.TM_APP.handleSessionExpired === 'function') {\n            window.TM_APP.handleSessionExpired(err.message);\n          }\n        }\n        reject(err);\n      }\n    }\n\n    function callRpc(fnName) {\n      var args = Array.prototype.slice.call(arguments, 1);\n      return new Promise(function (resolve, reject) {\n        if (typeof google !== 'undefined' && google.script && google.script.run) {\n          var runner = google.script.run\n            .withSuccessHandler(function (res) {\n              handleRpcResponse(res, resolve, reject);\n            })\n            .withFailureHandler(function (err) {\n              reject({\n                code: 'ERR_TRANSPORT',\n                message: (err && err.message) ? err.message : 'Gagal menghubungi server.'\n              });\n            });\n\n          runner[fnName].apply(runner, args);\n          return;\n        }\n\n        // Cloudflare Workers / Standard Web HTTP RPC Transport\n        fetch('/api/rpc', {\n          method: 'POST',\n          headers: {\n            'Content-Type': 'application/json',\n            'Accept': 'application/json'\n          },\n          body: JSON.stringify({\n            fn: fnName,\n            args: args\n          })\n        })\n          .then(function (httpRes) {\n            return httpRes.json();\n          })\n          .then(function (res) {\n            handleRpcResponse(res, resolve, reject);\n          })\n          .catch(function (err) {\n            reject({\n              code: 'ERR_TRANSPORT',\n              message: (err && err.message) ? err.message : 'Gagal menghubungi server Cloudflare.'\n            });\n          });\n      });\n    }\n\n    return {\n      getToken: getToken,\n      setToken: setToken,\n      forgetToken: forgetToken,\n      readBearer: readBearer,\n      preserveAuthBeforeUnload: preserveAuthBeforeUnload,\n      getDeviceInfo: getDeviceInfo,\n      callRpc: callRpc\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_IDB = (function () {\n    var DB_NAME = 'tm_offline_db_v1';\n    var DB_VERSION = 1;\n    var STORES = ['localDrafts', 'localPhotos', 'syncQueue', 'masterCache', 'retentionNotices'];\n    var _dbPromise = null;\n    var _memFallback = {\n      localDrafts: {},\n      localPhotos: {},\n      syncQueue: {},\n      masterCache: {},\n      retentionNotices: {}\n    };\n\n    function openDb() {\n      if (_dbPromise) return _dbPromise;\n      if (typeof indexedDB === 'undefined') {\n        _dbPromise = Promise.resolve(null);\n        return _dbPromise;\n      }\n      _dbPromise = new Promise(function (resolve) {\n        try {\n          var req = indexedDB.open(DB_NAME, DB_VERSION);\n          req.onupgradeneeded = function (ev) {\n            var db = ev.target.result;\n            if (!db.objectStoreNames.contains('localDrafts')) {\n              db.createObjectStore('localDrafts', { keyPath: 'sessionId' });\n            }\n            if (!db.objectStoreNames.contains('localPhotos')) {\n              var ps = db.createObjectStore('localPhotos', { keyPath: 'localPhotoId' });\n              ps.createIndex('bySession', 'sessionId', { unique: false });\n            }\n            if (!db.objectStoreNames.contains('syncQueue')) {\n              var qs = db.createObjectStore('syncQueue', { keyPath: 'queueId' });\n              qs.createIndex('bySession', 'sessionId', { unique: false });\n            }\n            if (!db.objectStoreNames.contains('masterCache')) {\n              db.createObjectStore('masterCache', { keyPath: 'cacheKey' });\n            }\n            if (!db.objectStoreNames.contains('retentionNotices')) {\n              db.createObjectStore('retentionNotices', { keyPath: 'noticeId' });\n            }\n          };\n          req.onsuccess = function (ev) { resolve(ev.target.result); };\n          req.onerror = function () { resolve(null); };\n        } catch (e) {\n          resolve(null);\n        }\n      });\n      return _dbPromise;\n    }\n\n    function getKeyField(storeName) {\n      if (storeName === 'localDrafts') return 'sessionId';\n      if (storeName === 'localPhotos') return 'localPhotoId';\n      if (storeName === 'syncQueue') return 'queueId';\n      if (storeName === 'masterCache') return 'cacheKey';\n      return 'noticeId';\n    }\n\n    function put(storeName, value) {\n      return openDb().then(function (db) {\n        if (!db) {\n          var kf = getKeyField(storeName);\n          _memFallback[storeName][value[kf]] = JSON.parse(JSON.stringify(value));\n          return value;\n        }\n        return new Promise(function (resolve, reject) {\n          var tx = db.transaction(storeName, 'readwrite');\n          var store = tx.objectStore(storeName);\n          store.put(value);\n          tx.oncomplete = function () { resolve(value); };\n          tx.onerror = function (e) { reject(e.target.error); };\n        });\n      });\n    }\n\n    function get(storeName, key) {\n      return openDb().then(function (db) {\n        if (!db) {\n          return _memFallback[storeName][key] || null;\n        }\n        return new Promise(function (resolve, reject) {\n          var tx = db.transaction(storeName, 'readonly');\n          var req = tx.objectStore(storeName).get(key);\n          req.onsuccess = function () { resolve(req.result || null); };\n          req.onerror = function (e) { reject(e.target.error); };\n        });\n      });\n    }\n\n    function getAll(storeName) {\n      return openDb().then(function (db) {\n        if (!db) {\n          return Object.keys(_memFallback[storeName]).map(function (k) {\n            return _memFallback[storeName][k];\n          });\n        }\n        return new Promise(function (resolve, reject) {\n          var tx = db.transaction(storeName, 'readonly');\n          var req = tx.objectStore(storeName).getAll();\n          req.onsuccess = function () { resolve(req.result || []); };\n          req.onerror = function (e) { reject(e.target.error); };\n        });\n      });\n    }\n\n    function remove(storeName, key) {\n      return openDb().then(function (db) {\n        if (!db) {\n          delete _memFallback[storeName][key];\n          return true;\n        }\n        return new Promise(function (resolve, reject) {\n          var tx = db.transaction(storeName, 'readwrite');\n          tx.objectStore(storeName).delete(key);\n          tx.oncomplete = function () { resolve(true); };\n          tx.onerror = function (e) { reject(e.target.error); };\n        });\n      });\n    }\n\n    function removeSessionLocalDataOnly(sessionId) {\n      return Promise.all([\n        remove('localDrafts', sessionId),\n        getAll('localPhotos').then(function (photos) {\n          var targets = photos.filter(function (p) { return p.sessionId === sessionId; });\n          return Promise.all(targets.map(function (t) { return remove('localPhotos', t.localPhotoId); }));\n        }),\n        getAll('syncQueue').then(function (qItems) {\n          var targets = qItems.filter(function (q) { return q.sessionId === sessionId; });\n          return Promise.all(targets.map(function (t) { return remove('syncQueue', t.queueId); }));\n        })\n      ]);\n    }\n\n    function estimateStorage() {\n      if (navigator.storage && typeof navigator.storage.estimate === 'function') {\n        return navigator.storage.estimate().then(function (est) {\n          var usage = est.usage || 0;\n          var quota = est.quota || (50 * 1024 * 1024);\n          var pct = quota > 0 ? (usage / quota) * 100 : 0;\n          return {\n            supported: true,\n            usageBytes: usage,\n            quotaBytes: quota,\n            usagePercent: Number(pct.toFixed(2)),\n            nearLimit: pct >= 80\n          };\n        }).catch(function () {\n          return { supported: false, usageBytes: 0, quotaBytes: 0, usagePercent: 0, nearLimit: false };\n        });\n      }\n      return Promise.resolve({ supported: false, usageBytes: 0, quotaBytes: 0, usagePercent: 0, nearLimit: false });\n    }\n\n    return {\n      put: put,\n      get: get,\n      getAll: getAll,\n      remove: remove,\n      removeSessionLocalDataOnly: removeSessionLocalDataOnly,\n      estimateStorage: estimateStorage\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_SYNC = (function () {\n    var STATUS_LABELS = {\n      OFFLINE: 'Offline',\n      PENDING: 'Menunggu Sinkronisasi',\n      SYNCING: 'Sedang Sinkronisasi',\n      SUCCESS: 'Berhasil',\n      ACTION_REQUIRED: 'Perlu Tindakan'\n    };\n\n    var currentStatus = navigator.onLine !== false ? STATUS_LABELS.SUCCESS : STATUS_LABELS.OFFLINE;\n    var isSyncing = false;\n    var statusListeners = [];\n\n    function esc(s) {\n      return window.TM_APP.escapeHtml(s);\n    }\n\n    function getDeviceId() {\n      return window.TM_API.getDeviceInfo();\n    }\n\n    function notifyStatusChange() {\n      updateHeaderIndicator();\n      statusListeners.forEach(function (fn) {\n        try { fn(currentStatus); } catch (e) {}\n      });\n    }\n\n    function onStatusChange(fn) {\n      statusListeners.push(fn);\n    }\n\n    function updateHeaderIndicator() {\n      var pill = document.getElementById('header-sync-pill');\n      if (!pill) return;\n      var cls = 'sync-pill';\n      if (currentStatus === STATUS_LABELS.OFFLINE || currentStatus === STATUS_LABELS.PENDING) {\n        cls += ' offline';\n      } else if (currentStatus === STATUS_LABELS.ACTION_REQUIRED) {\n        cls += ' badge-danger';\n      }\n      pill.className = cls;\n      pill.innerHTML = '<span>●</span><span class=\"sync-label-text\">' + esc(currentStatus) + '</span>';\n    }\n\n    function recalculateGlobalSyncState() {\n      if (navigator.onLine === false) {\n        currentStatus = STATUS_LABELS.OFFLINE;\n        notifyStatusChange();\n        return Promise.resolve(currentStatus);\n      }\n      if (isSyncing) {\n        currentStatus = STATUS_LABELS.SYNCING;\n        notifyStatusChange();\n        return Promise.resolve(currentStatus);\n      }\n      return Promise.all([\n        window.TM_IDB.getAll('localDrafts'),\n        window.TM_IDB.getAll('localPhotos')\n      ]).then(function (res) {\n        var drafts = res[0] || [];\n        var photos = res[1] || [];\n        var hasConflict = drafts.some(function (d) { return d.syncStatus === 'CONFLICT'; });\n        var hasPendingDraft = drafts.some(function (d) { return d.syncStatus === 'PENDING' || d.syncStatus === 'LOCAL_ONLY'; });\n        var hasPendingPhoto = photos.some(function (p) { return p.uploadStatus === 'Menunggu' || p.uploadStatus === 'Gagal'; });\n\n        if (hasConflict) currentStatus = STATUS_LABELS.ACTION_REQUIRED;\n        else if (hasPendingDraft || hasPendingPhoto) currentStatus = STATUS_LABELS.PENDING;\n        else currentStatus = STATUS_LABELS.SUCCESS;\n\n        notifyStatusChange();\n        return currentStatus;\n      });\n    }\n\n    function saveDraftLocally(draftObj, markPending) {\n      var sessionId = draftObj.SessionID || ('SES-' + Date.now().toString(36).toUpperCase());\n      draftObj.SessionID = sessionId;\n      return window.TM_IDB.get('localDrafts', sessionId).then(function (existing) {\n        if (existing && existing.syncStatus === 'DELETED_LOCKED') {\n          throw new Error('Draft ini telah dihapus oleh Super Admin dan dikunci dalam mode Hanya Baca.');\n        }\n        var nextLocalVer = existing ? (parseInt(existing.localVersion || 1, 10) + 1) : 1;\n        var baseServerVer = existing ? parseInt(existing.baseServerVersion || 0, 10) : parseInt(draftObj.Version || 0, 10);\n        var record = {\n          sessionId: sessionId,\n          originDeviceId: existing ? existing.originDeviceId : getDeviceId(),\n          localVersion: nextLocalVer,\n          baseServerVersion: baseServerVer,\n          syncStatus: markPending ? 'PENDING' : 'SYNCED',\n          idempotencyKey: 'SYNC-' + sessionId + '-V' + nextLocalVer,\n          updatedAt: new Date().toISOString(),\n          draft: draftObj,\n          conflictServerSnapshot: existing ? existing.conflictServerSnapshot : null,\n          deletionMeta: existing ? existing.deletionMeta : null\n        };\n        return window.TM_IDB.put('localDrafts', record).then(function (saved) {\n          recalculateGlobalSyncState();\n          return saved;\n        });\n      });\n    }\n\n    function queuePhotoLocally(photoItem) {\n      var localPhotoId = photoItem.localPhotoId || photoItem.idempotencyKey || ('LPHT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));\n      var rec = Object.assign({}, photoItem, {\n        localPhotoId: localPhotoId,\n        uploadStatus: photoItem.uploadStatus || 'Menunggu',\n        updatedAt: new Date().toISOString()\n      });\n      return window.TM_IDB.put('localPhotos', rec).then(function (saved) {\n        recalculateGlobalSyncState();\n        return saved;\n      });\n    }\n\n    function runRetentionCheckAndCleanup() {\n      var token = window.TM_API.getToken();\n      if (!token) return Promise.resolve();\n\n      return window.TM_IDB.getAll('localDrafts').then(function (drafts) {\n        if (!drafts || drafts.length === 0) return;\n        var ids = drafts.map(function (d) { return d.sessionId; });\n        if (navigator.onLine === false) return;\n\n        return window.TM_API.callRpc('api_getDraftSyncAndRetentionStatus', token, ids, getDeviceId())\n          .then(function (statuses) {\n            var chains = [];\n            (statuses || []).forEach(function (st) {\n              var localRec = drafts.find(function (d) { return d.sessionId === st.sessionId; });\n              if (!localRec) return;\n\n              if (st.deletedAt) {\n                // Jika retensi 30x24 jam telah berakhir, hapus otomatis HANYA data lokal Draft tersebut (PRD 7.11)\n                if (st.retention && st.retention.shouldPurgeLocal) {\n                  chains.push(\n                    window.TM_IDB.removeSessionLocalDataOnly(st.sessionId).then(function () {\n                      return window.TM_IDB.put('retentionNotices', {\n                        noticeId: 'NTC-' + st.sessionId,\n                        sessionId: st.sessionId,\n                        outletName: (localRec.draft && localRec.draft.OutletNameSnapshot) || st.sessionId,\n                        purgedAt: new Date().toISOString(),\n                        message: 'Data lokal untuk Draft \"' + st.sessionId + '\" telah dihapus otomatis karena masa retensi 30 × 24 jam pasca-penghapusan telah berakhir.'\n                      });\n                    })\n                  );\n                } else {\n                  localRec.syncStatus = 'DELETED_LOCKED';\n                  localRec.deletionMeta = {\n                    deletedAt: st.deletedAt,\n                    deleteReason: st.deleteReason,\n                    originDeviceId: st.originDeviceId,\n                    isOriginDevice: st.isOriginDevice,\n                    otherDeviceNotice: st.otherDeviceNotice,\n                    restoreRequest: st.restoreRequest,\n                    retention: st.retention\n                  };\n                  chains.push(window.TM_IDB.put('localDrafts', localRec));\n                }\n              } else if (localRec.syncStatus === 'DELETED_LOCKED' && st.status === 'Draft') {\n                // Draft telah dipulihkan oleh Super Admin! (PRD 7.10: data lokal tidak otomatis menimpa server, harus melalui pemeriksaan/resolusi konflik)\n                localRec.syncStatus = 'PENDING';\n                localRec.hasUnsyncedPreDeleteChanges = true;\n                localRec.deletionMeta = null;\n                chains.push(window.TM_IDB.put('localDrafts', localRec));\n              }\n            });\n            return Promise.all(chains);\n          })\n          .catch(function () {});\n      });\n    }\n\n    function runAutoSync() {\n      var token = window.TM_API.getToken();\n      var user = window.TM_APP.getCurrentUser();\n      if (!token || !user || user.Role !== 'TRAINER') return Promise.resolve();\n      if (navigator.onLine === false) {\n        currentStatus = STATUS_LABELS.OFFLINE;\n        notifyStatusChange();\n        return Promise.resolve();\n      }\n      if (isSyncing) return Promise.resolve();\n\n      isSyncing = true;\n      currentStatus = STATUS_LABELS.SYNCING;\n      notifyStatusChange();\n\n      return runRetentionCheckAndCleanup()\n        .then(function () {\n          return window.TM_IDB.getAll('localDrafts');\n        })\n        .then(function (drafts) {\n          var pendingDrafts = (drafts || []).filter(function (d) {\n            return d.syncStatus === 'PENDING' || d.syncStatus === 'LOCAL_ONLY';\n          });\n          if (pendingDrafts.length === 0) return;\n\n          var ops = pendingDrafts.map(function (d) {\n            return {\n              sessionId: d.sessionId,\n              deviceId: getDeviceId(),\n              idempotencyKey: d.idempotencyKey,\n              localVersion: d.localVersion,\n              baseServerVersion: d.baseServerVersion,\n              hasUnsyncedPreDeleteChanges: Boolean(d.hasUnsyncedPreDeleteChanges),\n              draft: {\n                inspectionDate: d.draft.InspectionDate,\n                outletId: d.draft.OutletID || '',\n                outletName: d.draft.OutletNameSnapshot || '',\n                amId: d.draft.AM_ID || '',\n                mumId: d.draft.MUM_ID || '',\n                picName: d.draft.PIC_Name || '',\n                findings: (d.draft.Findings || []).map(function (f) {\n                  return {\n                    findingId: f.FindingID || '',\n                    categoryId: f.CategoryID || '',\n                    sectionId: f.SectionID || '',\n                    masalah: f.Masalah || '',\n                    mengapa: f.Mengapa || '',\n                    solusi: f.Solusi || ''\n                  };\n                })\n              }\n            };\n          });\n\n          return window.TM_API.callRpc('api_syncBatch', token, {\n            deviceId: getDeviceId(),\n            operations: ops\n          }).then(function (batchRes) {\n            var updates = [];\n            (batchRes.results || []).forEach(function (r) {\n              var localRec = pendingDrafts.find(function (x) { return x.sessionId === r.sessionId; });\n              if (!localRec) return;\n\n              if (r.status === 'SYNCED') {\n                localRec.syncStatus = 'SYNCED';\n                localRec.baseServerVersion = r.serverVersion;\n                localRec.hasUnsyncedPreDeleteChanges = false;\n                localRec.conflictServerSnapshot = null;\n                updates.push(window.TM_IDB.put('localDrafts', localRec));\n              } else if (r.status === 'CONFLICT') {\n                localRec.syncStatus = 'CONFLICT';\n                localRec.conflictServerSnapshot = r.serverSnapshot;\n                updates.push(window.TM_IDB.put('localDrafts', localRec));\n              } else if (r.status === 'DELETED_LOCKED') {\n                // PRD 7.12: Hentikan sync, kunci data lokal, jangan buat ulang Draft\n                localRec.syncStatus = 'DELETED_LOCKED';\n                localRec.deletionMeta = {\n                  deletedAt: r.deletedAt,\n                  deleteReason: r.deleteReason,\n                  originDeviceId: r.originDeviceId,\n                  isOriginDevice: r.isOriginDevice,\n                  retention: r.retention\n                };\n                updates.push(window.TM_IDB.put('localDrafts', localRec));\n              }\n            });\n            return Promise.all(updates);\n          });\n        })\n        .then(function () {\n          // Sinkronisasi antrean foto untuk Draft yang aktif dan tidak terkunci\n          return Promise.all([\n            window.TM_IDB.getAll('localDrafts'),\n            window.TM_IDB.getAll('localPhotos')\n          ]);\n        })\n        .then(function (res) {\n          var draftsMap = {};\n          (res[0] || []).forEach(function (d) { draftsMap[d.sessionId] = d; });\n          var pendingPhotos = (res[1] || []).filter(function (p) {\n            var parent = draftsMap[p.sessionId];\n            if (parent && (parent.syncStatus === 'DELETED_LOCKED' || parent.syncStatus === 'CONFLICT')) {\n              return false;\n            }\n            return p.uploadStatus === 'Menunggu' || p.uploadStatus === 'Gagal';\n          });\n\n          var chain = Promise.resolve();\n          pendingPhotos.forEach(function (ph) {\n            chain = chain.then(function () {\n              return window.TM_API.callRpc('api_uploadPhoto', token, {\n                sessionId: ph.sessionId,\n                findingId: ph.findingId,\n                fileName: ph.FileName,\n                mimeType: ph.MimeType,\n                base64Data: ph.base64Data,\n                comment: ph.PhotoComment || '',\n                idempotencyKey: ph.idempotencyKey\n              }).then(function (savedPh) {\n                ph.PhotoID = savedPh.PhotoID;\n                ph.uploadStatus = 'Berhasil';\n                return window.TM_IDB.put('localPhotos', ph);\n              }).catch(function (err) {\n                if (err && err.code === 'ERR_DRAFT_DELETED_BY_ADMIN') {\n                  ph.uploadStatus = 'Terkunci (Draft Dihapus)';\n                } else {\n                  ph.uploadStatus = 'Gagal';\n                }\n                return window.TM_IDB.put('localPhotos', ph);\n              });\n            });\n          });\n          return chain;\n        })\n        .catch(function () {})\n        .finally(function () {\n          isSyncing = false;\n          recalculateGlobalSyncState();\n          if (window.TM_APP && typeof window.TM_APP.refreshHeaderCounters === 'function') {\n            window.TM_APP.refreshHeaderCounters();\n          }\n        });\n    }\n\n    function openReadOnlyLocalDraftModal(localRec) {\n      var meta = localRec.deletionMeta || {};\n      if (meta.isOriginDevice === false) {\n        window.TM_APP.openModal(\n          'Data Lokal Tertahan di Perangkat Asal',\n          '<div class=\"alert alert-warning\">' +\n            esc(meta.otherDeviceNotice || ('Data lokal yang belum tersinkronisasi hanya tersimpan dan dapat dilihat dari perangkat asal (' + meta.originDeviceId + ').')) +\n          '</div>'\n        );\n        return;\n      }\n\n      window.TM_IDB.getAll('localPhotos').then(function (allPhotos) {\n        var d = localRec.draft || {};\n        var findings = d.Findings || [];\n        var sesPhotos = (allPhotos || []).filter(function (p) { return p.sessionId === localRec.sessionId; });\n\n        var findingsHtml = findings.length === 0\n          ? '<p class=\"form-hint\">Tidak ada temuan lokal.</p>'\n          : findings.map(function (f, i) {\n              return (\n                '<div class=\"card\" style=\"background:var(--bg-app);margin-bottom:8px;\">' +\n                  '<strong>#' + (i + 1) + ' ' + esc(f.CategoryNameSnapshot || f.CategoryID || '-') + ' • ' + esc(f.SectionNameSnapshot || f.SectionID || '-') + '</strong>' +\n                  '<div style=\"font-size:13px;\"><strong>Masalah:</strong> ' + esc(f.Masalah || '-') + '</div>' +\n                  '<div style=\"font-size:13px;\"><strong>Mengapa:</strong> ' + esc(f.Mengapa || '-') + '</div>' +\n                  '<div style=\"font-size:13px;\"><strong>Solusi:</strong> ' + esc(f.Solusi || '-') + '</div>' +\n                '</div>'\n              );\n            }).join('');\n\n        var photosHtml = sesPhotos.length === 0\n          ? '<p class=\"form-hint\">Tidak ada foto lokal tertahan.</p>'\n          : '<div style=\"display:flex;gap:8px;flex-wrap:wrap;\">' + sesPhotos.map(function (ph, idx) {\n              return '<button type=\"button\" class=\"btn btn-sm btn-secondary\" data-locphoto=\"' + idx + '\">📷 ' + esc(ph.FileName) + (ph.PhotoComment ? ' (' + esc(ph.PhotoComment) + ')' : '') + '</button>';\n            }).join('') + '</div>';\n\n        var html =\n          '<div class=\"alert alert-warning\">' +\n            '<strong>Draft Dihapus — Menunggu Pemulihan (Mode Hanya Baca)</strong><br>' +\n            'Dihapus pada: ' + esc(meta.deletedAt || '-') + ' • Alasan: ' + esc(meta.deleteReason || '-') +\n          '</div>' +\n          '<div style=\"font-size:13px;margin-bottom:10px;\">' +\n            '<div><strong>Session ID:</strong> <code>' + esc(localRec.sessionId) + '</code></div>' +\n            '<div><strong>Outlet:</strong> ' + esc(d.OutletNameSnapshot || '-') + ' • <strong>Tanggal:</strong> ' + esc(d.InspectionDate || '-') + '</div>' +\n            '<div><strong>PIC:</strong> ' + esc(d.PIC_Name || '-') + ' • <strong>Versi Lokal:</strong> v' + esc(localRec.localVersion) + '</div>' +\n          '</div>' +\n          '<h4 style=\"margin:10px 0 6px;\">Temuan Lokal</h4>' + findingsHtml +\n          '<h4 style=\"margin:10px 0 6px;\">Foto &amp; Komentar Lokal</h4>' + photosHtml;\n\n        window.TM_APP.openModal('Data Lokal Terkunci (Hanya Baca)', html);\n        var root = document.getElementById('modal-root');\n        if (root) {\n          root.querySelectorAll('[data-locphoto]').forEach(function (btn) {\n            btn.addEventListener('click', function () {\n              window.TM_PHOTO.openLightboxGallery(sesPhotos, parseInt(btn.getAttribute('data-locphoto'), 10));\n            });\n          });\n        }\n      });\n    }\n\n    function openConflictResolutionModal(localRec, onResolved) {\n      var srv = (localRec.conflictServerSnapshot && localRec.conflictServerSnapshot.session) || {};\n      var loc = localRec.draft || {};\n\n      var html =\n        '<div class=\"alert alert-warning\">' +\n          'Data pada server telah berubah (Versi Server: v' + esc(srv.Version || '?') + '). Data lokal tidak menimpa server secara otomatis. Pilih versi yang ingin dipertahankan:' +\n        '</div>' +\n        '<div class=\"grid-2\">' +\n          '<div class=\"card\" style=\"margin:0;\">' +\n            '<strong>Versi Server</strong>' +\n            '<div class=\"form-hint\">Outlet: ' + esc(srv.OutletNameSnapshot || '-') + '</div>' +\n            '<div class=\"form-hint\">Tanggal: ' + esc(srv.InspectionDate || '-') + '</div>' +\n            '<div class=\"form-hint\">PIC: ' + esc(srv.PIC_Name || '-') + '</div>' +\n            '<div class=\"form-hint\">Diperbarui: ' + esc(srv.UpdatedAt || '-') + '</div>' +\n          '</div>' +\n          '<div class=\"card\" style=\"margin:0;\">' +\n            '<strong>Versi Lokal Perangkat Ini</strong>' +\n            '<div class=\"form-hint\">Outlet: ' + esc(loc.OutletNameSnapshot || '-') + '</div>' +\n            '<div class=\"form-hint\">Tanggal: ' + esc(loc.InspectionDate || '-') + '</div>' +\n            '<div class=\"form-hint\">PIC: ' + esc(loc.PIC_Name || '-') + '</div>' +\n            '<div class=\"form-hint\">Diperbarui: ' + esc(localRec.updatedAt || '-') + '</div>' +\n          '</div>' +\n        '</div>' +\n        '<div class=\"modal-footer\">' +\n          '<button type=\"button\" class=\"btn btn-secondary\" id=\"cf-use-server\">Gunakan Versi Server</button>' +\n          '<button type=\"button\" class=\"btn btn-primary\" id=\"cf-apply-local\">Terapkan Perubahan Lokal Saya</button>' +\n        '</div>';\n\n      var close = window.TM_APP.openModal('Resolusi Konflik Sinkronisasi', html);\n\n      function submitResolution(strategy) {\n        window.TM_API.callRpc('api_resolveSyncConflict', window.TM_API.getToken(), localRec.sessionId, {\n          strategy: strategy,\n          deviceId: getDeviceId(),\n          localDraft: {\n            inspectionDate: loc.InspectionDate,\n            outletId: loc.OutletID || '',\n            outletName: loc.OutletNameSnapshot || '',\n            amId: loc.AM_ID || '',\n            mumId: loc.MUM_ID || '',\n            picName: loc.PIC_Name || '',\n            findings: (loc.Findings || []).map(function (f) {\n              return {\n                findingId: f.FindingID || '',\n                categoryId: f.CategoryID || '',\n                sectionId: f.SectionID || '',\n                masalah: f.Masalah || '',\n                mengapa: f.Mengapa || '',\n                solusi: f.Solusi || ''\n              };\n            })\n          }\n        }).then(function (res) {\n          localRec.syncStatus = 'SYNCED';\n          localRec.baseServerVersion = res.serverVersion;\n          localRec.conflictServerSnapshot = null;\n          if (strategy === 'USE_SERVER' && res.snapshot && res.snapshot.session) {\n            localRec.draft = Object.assign({}, res.snapshot.session, {\n              Findings: res.snapshot.findings || []\n            });\n          }\n          return window.TM_IDB.put('localDrafts', localRec);\n        }).then(function () {\n          window.TM_APP.showToast('Konflik sinkronisasi berhasil diselesaikan.', 'success');\n          close();\n          recalculateGlobalSyncState();\n          if (onResolved) onResolved();\n        }).catch(function (err) {\n          window.TM_APP.showToast(err.message, 'error');\n        });\n      }\n\n      document.getElementById('cf-use-server').addEventListener('click', function () { submitResolution('USE_SERVER'); });\n      document.getElementById('cf-apply-local').addEventListener('click', function () { submitResolution('APPLY_LOCAL'); });\n    }\n\n    function renderSyncStatusPanel(container, onReloadRequested) {\n      if (!container) return;\n      Promise.all([\n        window.TM_IDB.getAll('localDrafts'),\n        window.TM_IDB.getAll('localPhotos'),\n        window.TM_IDB.getAll('retentionNotices'),\n        window.TM_IDB.estimateStorage()\n      ]).then(function (res) {\n        var drafts = res[0] || [];\n        var photos = res[1] || [];\n        var notices = res[2] || [];\n        var storage = res[3];\n\n        var unsyncedDrafts = drafts.filter(function (d) { return d.syncStatus === 'PENDING' || d.syncStatus === 'LOCAL_ONLY'; });\n        var conflictDrafts = drafts.filter(function (d) { return d.syncStatus === 'CONFLICT'; });\n        var lockedDeletedDrafts = drafts.filter(function (d) { return d.syncStatus === 'DELETED_LOCKED'; });\n        var pendingPhotos = photos.filter(function (p) { return p.uploadStatus === 'Menunggu' || p.uploadStatus === 'Gagal'; });\n\n        var noticesHtml = notices.map(function (n) {\n          return (\n            '<div class=\"alert alert-info\" style=\"display:flex;justify-content:space-between;align-items:center;gap:8px;\">' +\n              '<span>' + esc(n.message) + '</span>' +\n              '<button type=\"button\" class=\"btn btn-sm btn-secondary\" data-dismiss-notice=\"' + esc(n.noticeId) + '\">Mengerti</button>' +\n            '</div>'\n          );\n        }).join('');\n\n        var storageWarningHtml = storage.nearLimit\n          ? '<div class=\"alert alert-warning\"><strong>Peringatan Kapasitas Penyimpanan:</strong> Ruang penyimpanan browser telah terpakai ' + storage.usagePercent + '%. Segera sinkronkan Draft dan hindari membersihkan data situs browser agar data lokal belum tersinkronisasi tidak hilang.</div>'\n          : '';\n\n        var conflictsHtml = conflictDrafts.map(function (c) {\n          return (\n            '<div class=\"alert alert-warning\" style=\"display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;\">' +\n              '<span><strong>Perlu Tindakan (Konflik):</strong> Draft <code>' + esc(c.sessionId) + '</code> memiliki perbedaan versi dengan server.</span>' +\n              '<button type=\"button\" class=\"btn btn-sm btn-primary\" data-resolve-conflict=\"' + esc(c.sessionId) + '\">Selesaikan Konflik</button>' +\n            '</div>'\n          );\n        }).join('');\n\n        var lockedHtml = lockedDeletedDrafts.map(function (ld) {\n          var meta = ld.deletionMeta || {};\n          var ret = meta.retention || {};\n          var warn7d = ret.show7DayWarning\n            ? '<div style=\"color:var(--danger);font-weight:600;font-size:12px;\">Peringatan H-7: Data lokal ini akan dihapus otomatis pada ' + esc(ret.retentionDeleteAt) + '.</div>'\n            : '';\n          return (\n            '<div class=\"mobile-item-card\" style=\"border-color:rgba(244,63,94,0.45);margin-top:8px;\">' +\n              '<div class=\"mobile-item-row\">' +\n                '<div><strong>Draft Lokal Terkunci: ' + esc((ld.draft && ld.draft.OutletNameSnapshot) || ld.sessionId) + '</strong>' +\n                '<div class=\"form-hint\">' + esc(ret.label || 'Draft Dihapus — Menunggu Pemulihan') + '</div>' + warn7d + '</div>' +\n                '<button type=\"button\" class=\"btn btn-sm btn-secondary\" data-view-local=\"' + esc(ld.sessionId) + '\">Lihat Data Lokal</button>' +\n              '</div>' +\n            '</div>'\n          );\n        }).join('');\n\n        var mbUsed = (storage.usageBytes / (1024 * 1024)).toFixed(2);\n        container.innerHTML =\n          noticesHtml +\n          storageWarningHtml +\n          conflictsHtml +\n          '<div class=\"card\" style=\"margin-bottom:14px;\">' +\n            '<div style=\"display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;\">' +\n              '<div style=\"display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:13px;\">' +\n                '<span><strong>Status Sync:</strong> <span class=\"badge badge-primary\">' + esc(currentStatus) + '</span></span>' +\n                '<span>Draft Belum Sync: <strong>' + unsyncedDrafts.length + '</strong></span>' +\n                '<span>Foto Menunggu Upload: <strong>' + pendingPhotos.length + '</strong></span>' +\n                (storage.supported ? '<span class=\"form-hint\">Storage Lokal: ~' + mbUsed + ' MB (' + storage.usagePercent + '%)</span>' : '') +\n              '</div>' +\n              '<button type=\"button\" class=\"btn btn-sm btn-secondary\" id=\"btn-retry-sync\">↻ Coba Lagi Sinkronisasi</button>' +\n            '</div>' +\n            lockedHtml +\n          '</div>';\n\n        var retryBtn = document.getElementById('btn-retry-sync');\n        if (retryBtn) {\n          retryBtn.addEventListener('click', function () {\n            runAutoSync().then(function () {\n              renderSyncStatusPanel(container, onReloadRequested);\n              if (onReloadRequested) onReloadRequested();\n            });\n          });\n        }\n\n        container.querySelectorAll('[data-dismiss-notice]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            window.TM_IDB.remove('retentionNotices', btn.getAttribute('data-dismiss-notice')).then(function () {\n              renderSyncStatusPanel(container, onReloadRequested);\n            });\n          });\n        });\n\n        container.querySelectorAll('[data-resolve-conflict]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var sid = btn.getAttribute('data-resolve-conflict');\n            var rec = conflictDrafts.find(function (x) { return x.sessionId === sid; });\n            if (rec) {\n              openConflictResolutionModal(rec, function () {\n                renderSyncStatusPanel(container, onReloadRequested);\n                if (onReloadRequested) onReloadRequested();\n              });\n            }\n          });\n        });\n\n        container.querySelectorAll('[data-view-local]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var sid = btn.getAttribute('data-view-local');\n            var rec = lockedDeletedDrafts.find(function (x) { return x.sessionId === sid; });\n            if (rec) openReadOnlyLocalDraftModal(rec);\n          });\n        });\n      });\n    }\n\n    window.addEventListener('online', function () {\n      runAutoSync();\n    });\n    window.addEventListener('offline', function () {\n      recalculateGlobalSyncState();\n    });\n\n    return {\n      STATUS_LABELS: STATUS_LABELS,\n      onStatusChange: onStatusChange,\n      updateHeaderIndicator: updateHeaderIndicator,\n      recalculateGlobalSyncState: recalculateGlobalSyncState,\n      saveDraftLocally: saveDraftLocally,\n      queuePhotoLocally: queuePhotoLocally,\n      runRetentionCheckAndCleanup: runRetentionCheckAndCleanup,\n      runAutoSync: runAutoSync,\n      renderSyncStatusPanel: renderSyncStatusPanel\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_PHOTO = (function () {\n    var MAX_RAW_BYTES = 5 * 1024 * 1024;\n    var MAX_COMPRESSED_BYTES = 1 * 1024 * 1024;\n    var ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];\n\n    function esc(s) {\n      return window.TM_APP.escapeHtml(s);\n    }\n\n    function dataUrlToByteLength(dataUrl) {\n      var b64 = String(dataUrl).split(',')[1] || '';\n      return Math.floor((b64.length * 3) / 4);\n    }\n\n    function loadBitmapWithOrientation(file) {\n      if (typeof createImageBitmap === 'function') {\n        return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () {\n          return createImageBitmap(file);\n        });\n      }\n      return new Promise(function (resolve, reject) {\n        var img = new Image();\n        var url = URL.createObjectURL(file);\n        img.onload = function () {\n          URL.revokeObjectURL(url);\n          resolve(img);\n        };\n        img.onerror = function (err) {\n          URL.revokeObjectURL(url);\n          reject(err);\n        };\n        img.src = url;\n      });\n    }\n\n    function compressImageFile(file) {\n      if (!file) return Promise.reject(new Error('File foto tidak ditemukan.'));\n      var mime = String(file.type || '').toLowerCase();\n      if (ALLOWED_TYPES.indexOf(mime) === -1) {\n        return Promise.reject(new Error('Format foto harus JPG, JPEG, atau PNG.'));\n      }\n      if (file.size > MAX_RAW_BYTES) {\n        return Promise.reject(new Error('Ukuran file asli maksimal 5 MB (' + (file.size / 1024 / 1024).toFixed(2) + ' MB).'));\n      }\n\n      return loadBitmapWithOrientation(file).then(function (imgSource) {\n        var origW = imgSource.width || imgSource.naturalWidth;\n        var origH = imgSource.height || imgSource.naturalHeight;\n        var maxDim = 1600;\n        var scale = Math.min(1, maxDim / Math.max(origW, origH));\n        var w = Math.max(1, Math.round(origW * scale));\n        var h = Math.max(1, Math.round(origH * scale));\n\n        var canvas = document.createElement('canvas');\n        var ctx = canvas.getContext('2d');\n        var qualities = [0.85, 0.72, 0.58, 0.45, 0.35];\n        var outMime = 'image/jpeg';\n        var resultUrl = '';\n\n        for (var attempt = 0; attempt < 3; attempt++) {\n          canvas.width = w;\n          canvas.height = h;\n          ctx.clearRect(0, 0, w, h);\n          ctx.drawImage(imgSource, 0, 0, w, h);\n\n          for (var qIdx = 0; qIdx < qualities.length; qIdx++) {\n            resultUrl = canvas.toDataURL(outMime, qualities[qIdx]);\n            if (dataUrlToByteLength(resultUrl) <= MAX_COMPRESSED_BYTES) {\n              if (typeof imgSource.close === 'function') imgSource.close();\n              return {\n                fileName: file.name.replace(/\\.[^.]+$/, '') + '.jpg',\n                mimeType: outMime,\n                base64Data: resultUrl,\n                byteSize: dataUrlToByteLength(resultUrl)\n              };\n            }\n          }\n          w = Math.max(320, Math.round(w * 0.75));\n          h = Math.max(240, Math.round(h * 0.75));\n        }\n\n        if (typeof imgSource.close === 'function') imgSource.close();\n        throw new Error('Gagal mengompresi foto di bawah batas 1 MB.');\n      });\n    }\n\n    function openLightboxGallery(photoItems, startIndex) {\n      if (!photoItems || photoItems.length === 0) return;\n      var idx = Math.max(0, Math.min(startIndex || 0, photoItems.length - 1));\n      var zoom = 1;\n\n      var html =\n        '<div id=\"lb-body\">' +\n          '<div class=\"lightbox-img-wrap\" id=\"lb-img-wrap\"><span class=\"spinner\"></span></div>' +\n          '<div id=\"lb-caption\" style=\"margin-top:10px;font-size:13px;color:var(--text-secondary);\"></div>' +\n          '<div style=\"display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;\">' +\n            '<div style=\"display:flex;gap:6px;\">' +\n              '<button type=\"button\" class=\"btn btn-sm btn-secondary\" id=\"lb-prev\">← Prev</button>' +\n              '<button type=\"button\" class=\"btn btn-sm btn-secondary\" id=\"lb-next\">Next →</button>' +\n            '</div>' +\n            '<div style=\"display:flex;gap:6px;\">' +\n              '<button type=\"button\" class=\"btn btn-sm btn-secondary\" id=\"lb-zoom-out\">−</button>' +\n              '<button type=\"button\" class=\"btn btn-sm btn-secondary\" id=\"lb-zoom-reset\">100%</button>' +\n              '<button type=\"button\" class=\"btn btn-sm btn-secondary\" id=\"lb-zoom-in\">+</button>' +\n              '<button type=\"button\" class=\"btn btn-sm btn-primary\" id=\"lb-download\">Unduh</button>' +\n            '</div>' +\n          '</div>' +\n        '</div>';\n\n      window.TM_APP.openModal('Galeri Foto Bukti', html);\n\n      function renderSlide() {\n        zoom = 1;\n        var item = photoItems[idx];\n        var wrap = document.getElementById('lb-img-wrap');\n        var cap = document.getElementById('lb-caption');\n        if (!wrap || !cap) return;\n        cap.textContent = '(' + (idx + 1) + '/' + photoItems.length + ') ' + (item.PhotoComment || item.comment || 'Tanpa komentar');\n\n        if (item.dataUrl || item.base64Data) {\n          var src = item.dataUrl || item.base64Data;\n          wrap.innerHTML = '<img id=\"lb-img\" src=\"' + esc(src) + '\" alt=\"Foto Bukti\">';\n        } else {\n          wrap.innerHTML = '<span class=\"spinner\"></span>';\n          window.TM_API.callRpc('api_getPhotoData', window.TM_API.getToken(), item.PhotoID, false)\n            .then(function (data) {\n              item.dataUrl = data.dataUrl;\n              var curWrap = document.getElementById('lb-img-wrap');\n              if (curWrap) curWrap.innerHTML = '<img id=\"lb-img\" src=\"' + esc(data.dataUrl) + '\" alt=\"Foto Bukti\">';\n            })\n            .catch(function (err) {\n              var curWrap = document.getElementById('lb-img-wrap');\n              if (curWrap) curWrap.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n            });\n        }\n      }\n\n      function applyZoom() {\n        var img = document.getElementById('lb-img');\n        if (img) img.style.transform = 'scale(' + zoom + ')';\n        var zBtn = document.getElementById('lb-zoom-reset');\n        if (zBtn) zBtn.textContent = Math.round(zoom * 100) + '%';\n      }\n\n      document.getElementById('lb-prev').addEventListener('click', function () {\n        idx = (idx - 1 + photoItems.length) % photoItems.length;\n        renderSlide();\n      });\n      document.getElementById('lb-next').addEventListener('click', function () {\n        idx = (idx + 1) % photoItems.length;\n        renderSlide();\n      });\n      document.getElementById('lb-zoom-in').addEventListener('click', function () {\n        zoom = Math.min(3, zoom + 0.25);\n        applyZoom();\n      });\n      document.getElementById('lb-zoom-out').addEventListener('click', function () {\n        zoom = Math.max(0.5, zoom - 0.25);\n        applyZoom();\n      });\n      document.getElementById('lb-zoom-reset').addEventListener('click', function () {\n        zoom = 1;\n        applyZoom();\n      });\n      document.getElementById('lb-download').addEventListener('click', function () {\n        var item = photoItems[idx];\n        var dlPromise = item.PhotoID\n          ? window.TM_API.callRpc('api_getPhotoData', window.TM_API.getToken(), item.PhotoID, true)\n          : Promise.resolve({ dataUrl: item.dataUrl || item.base64Data, FileName: item.FileName || 'foto-bukti.jpg' });\n\n        dlPromise.then(function (d) {\n          var a = document.createElement('a');\n          a.href = d.dataUrl;\n          a.download = d.FileName || 'foto-bukti.jpg';\n          document.body.appendChild(a);\n          a.click();\n          document.body.removeChild(a);\n        }).catch(function (err) {\n          window.TM_APP.showToast(err.message, 'error');\n        });\n      });\n\n      renderSlide();\n    }\n\n    return {\n      compressImageFile: compressImageFile,\n      openLightboxGallery: openLightboxGallery\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_VIEWS_AUTH = (function () {\n    function esc(s) {\n      return window.TM_APP.escapeHtml(s);\n    }\n\n    function renderBranding(branding) {\n      var logoHtml = branding && branding.logoDataUrl\n        ? '<img src=\"' + esc(branding.logoDataUrl) + '\" alt=\"Logo Perusahaan\">'\n        : '<div class=\"auth-brand-icon\">TM</div>';\n      var company = (branding && branding.companyName) ? branding.companyName : 'Trainer Monitoring';\n      return (\n        '<div class=\"auth-brand\">' +\n          logoHtml +\n          '<h1 class=\"auth-title\">' + esc(company) + '</h1>' +\n          '<p class=\"auth-subtitle\">Sistem Pemeriksaan & Monitoring Operasional Outlet</p>' +\n        '</div>'\n      );\n    }\n\n    function renderBootstrap(container, onSuccess) {\n      container.innerHTML =\n        '<div class=\"auth-screen\">' +\n          '<div class=\"auth-card\">' +\n            '<div class=\"auth-brand\">' +\n              '<div class=\"auth-brand-icon\">TM</div>' +\n              '<h1 class=\"auth-title\">Setup Awal Aplikasi</h1>' +\n              '<p class=\"auth-subtitle\">Buat database Google Sheets, folder Drive privat, &amp; akun Super Admin pertama (satu kali).</p>' +\n            '</div>' +\n            '<div id=\"bs-alert\"></div>' +\n            '<form id=\"bootstrap-form\">' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Nama Perusahaan / Organisasi</label>' +\n                '<input type=\"text\" id=\"bs-company\" class=\"form-control\" placeholder=\"Contoh: PT Operasional Nusantara\" required>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Nama Lengkap Super Admin</label>' +\n                '<input type=\"text\" id=\"bs-name\" class=\"form-control\" placeholder=\"Nama lengkap\" required>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Username Super Admin</label>' +\n                '<input type=\"text\" id=\"bs-username\" class=\"form-control\" placeholder=\"superadmin\" pattern=\"[a-z0-9._-]{3,32}\" required>' +\n                '<span class=\"form-hint\">3–32 karakter huruf kecil, angka, titik, garis bawah, atau tanda hubung.</span>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Email Super Admin</label>' +\n                '<input type=\"email\" id=\"bs-email\" class=\"form-control\" placeholder=\"admin@perusahaan.com\" required>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Password Super Admin</label>' +\n                '<input type=\"password\" id=\"bs-password\" class=\"form-control\" minlength=\"8\" required>' +\n                '<span class=\"form-hint\">Minimal 8 karakter dengan kombinasi huruf dan angka.</span>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Konfirmasi Password</label>' +\n                '<input type=\"password\" id=\"bs-password-confirm\" class=\"form-control\" minlength=\"8\" required>' +\n              '</div>' +\n              '<button type=\"submit\" id=\"bs-submit\" class=\"btn btn-primary btn-block\">Inisialisasi Sistem &amp; Buat Super Admin</button>' +\n            '</form>' +\n          '</div>' +\n        '</div>';\n\n      if (window.TM_APP && window.TM_APP.bindPasswordToggles) {\n        window.TM_APP.bindPasswordToggles(container);\n      }\n\n      var form = document.getElementById('bootstrap-form');\n      form.addEventListener('submit', function (e) {\n        e.preventDefault();\n        var alertEl = document.getElementById('bs-alert');\n        var btn = document.getElementById('bs-submit');\n        var pw = document.getElementById('bs-password').value;\n        var pw2 = document.getElementById('bs-password-confirm').value;\n\n        alertEl.innerHTML = '';\n        if (pw !== pw2) {\n          alertEl.innerHTML = '<div class=\"alert alert-error\">Konfirmasi password tidak cocok.</div>';\n          return;\n        }\n\n        btn.disabled = true;\n        btn.innerHTML = '<span class=\"spinner\"></span> Menyiapkan Database &amp; Drive...';\n\n        window.TM_API.callRpc('api_runInitialBootstrap', {\n          companyName: document.getElementById('bs-company').value,\n          name: document.getElementById('bs-name').value,\n          username: document.getElementById('bs-username').value,\n          email: document.getElementById('bs-email').value,\n          password: pw,\n          deviceInfo: window.TM_API.getDeviceInfo()\n        }).then(function (data) {\n          window.TM_APP.showToast('Bootstrap berhasil! Silakan login dengan akun Super Admin.', 'success');\n          onSuccess(data);\n        }).catch(function (err) {\n          alertEl.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          btn.disabled = false;\n          btn.textContent = 'Inisialisasi Sistem & Buat Super Admin';\n        });\n      });\n    }\n\n    function renderLogin(container, branding, initialError, onLoginSuccess, onShowForgot, onShowResetToken) {\n      var company = (branding && branding.companyName) ? branding.companyName : 'Trainer Monitoring';\n      container.innerHTML =\n        '<div class=\"auth-screen\">' +\n          '<div class=\"auth-card auth-split-card\">' +\n            '<div class=\"auth-form-pane\">' +\n              renderBranding(branding) +\n              '<div id=\"login-alert\">' + (initialError ? '<div class=\"alert alert-warning\">' + esc(initialError) + '</div>' : '') + '</div>' +\n              '<form id=\"login-form\">' +\n                '<div class=\"form-group\">' +\n                  '<label class=\"form-label\">Username</label>' +\n                  '<input type=\"text\" id=\"login-username\" class=\"form-control\" placeholder=\"Masukkan username Anda\" autocomplete=\"username\" required>' +\n                '</div>' +\n                '<div class=\"form-group\">' +\n                  '<label class=\"form-label\">Password</label>' +\n                  '<input type=\"password\" id=\"login-password\" class=\"form-control\" placeholder=\"••••••••\" autocomplete=\"current-password\" required>' +\n                '</div>' +\n                '<button type=\"submit\" id=\"login-submit\" class=\"btn btn-primary btn-block\">Masuk ke Sistem →</button>' +\n              '</form>' +\n              '<div class=\"auth-links\">' +\n                '<button type=\"button\" id=\"btn-forgot-pw\" class=\"link-btn\">Lupa Password?</button>' +\n                '<button type=\"button\" id=\"btn-enter-reset-token\" class=\"link-btn\">Punya Token Reset?</button>' +\n              '</div>' +\n            '</div>' +\n            '<div class=\"auth-hero-pane\">' +\n              '<h2 class=\"auth-hero-heading\">Selamat Datang</h2>' +\n              '<p class=\"auth-hero-desc\">Masuk dengan akun <strong>' + esc(company) + '</strong> Anda untuk mengelola pemeriksaan operasional outlet, memantau temuan lapangan, dan melihat laporan performa secara langsung.</p>' +\n              '<button type=\"button\" id=\"btn-hero-forgot\" class=\"auth-glass-pill-btn\">Butuh Bantuan Akses? Reset Password →</button>' +\n            '</div>' +\n          '</div>' +\n        '</div>';\n\n      if (window.TM_APP && window.TM_APP.bindPasswordToggles) {\n        window.TM_APP.bindPasswordToggles(container);\n      }\n\n      document.getElementById('btn-forgot-pw').addEventListener('click', onShowForgot);\n      document.getElementById('btn-hero-forgot').addEventListener('click', onShowForgot);\n      document.getElementById('btn-enter-reset-token').addEventListener('click', function () {\n        onShowResetToken('');\n      });\n\n      document.getElementById('login-form').addEventListener('submit', function (e) {\n        e.preventDefault();\n        var alertEl = document.getElementById('login-alert');\n        var btn = document.getElementById('login-submit');\n        alertEl.innerHTML = '';\n        btn.disabled = true;\n        btn.innerHTML = '<span class=\"spinner\"></span> Memverifikasi...';\n\n        window.TM_API.callRpc(\n          'api_login',\n          document.getElementById('login-username').value,\n          document.getElementById('login-password').value,\n          window.TM_API.getDeviceInfo()\n        ).then(function (data) {\n          window.TM_API.setToken(data.token);\n          onLoginSuccess(data);\n        }).catch(function (err) {\n          alertEl.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          btn.disabled = false;\n          btn.textContent = 'Masuk';\n        });\n      });\n    }\n\n    function renderForgotPassword(container, branding, onBackToLogin, onGoReset) {\n      container.innerHTML =\n        '<div class=\"auth-screen\">' +\n          '<div class=\"auth-card\">' +\n            renderBranding(branding) +\n            '<h2 style=\"margin:0 0 8px;font-size:18px;\">Reset Password via Email</h2>' +\n            '<p class=\"auth-subtitle\" style=\"margin-bottom:16px;\">Masukkan email akun terdaftar Anda untuk menerima tautan &amp; token reset sekali pakai.</p>' +\n            '<div id=\"fp-alert\"></div>' +\n            '<form id=\"fp-form\">' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Email Terdaftar</label>' +\n                '<input type=\"email\" id=\"fp-email\" class=\"form-control\" required>' +\n              '</div>' +\n              '<button type=\"submit\" id=\"fp-submit\" class=\"btn btn-primary btn-block\">Kirim Instruksi Reset</button>' +\n            '</form>' +\n            '<div class=\"auth-links\">' +\n              '<button type=\"button\" id=\"fp-back\" class=\"link-btn\">Kembali ke Login</button>' +\n              '<button type=\"button\" id=\"fp-has-token\" class=\"link-btn\">Masukkan Token</button>' +\n            '</div>' +\n          '</div>' +\n        '</div>';\n\n      document.getElementById('fp-back').addEventListener('click', onBackToLogin);\n      document.getElementById('fp-has-token').addEventListener('click', function () {\n        onGoReset('');\n      });\n\n      document.getElementById('fp-form').addEventListener('submit', function (e) {\n        e.preventDefault();\n        var alertEl = document.getElementById('fp-alert');\n        var btn = document.getElementById('fp-submit');\n        btn.disabled = true;\n        btn.innerHTML = '<span class=\"spinner\"></span> Mengirim...';\n        var appUrl = window.location.href.split('?')[0];\n\n        window.TM_API.callRpc('api_requestPasswordReset', document.getElementById('fp-email').value, appUrl)\n          .then(function (data) {\n            alertEl.innerHTML = '<div class=\"alert alert-success\">' + esc(data.message) + '</div>';\n          })\n          .catch(function (err) {\n            alertEl.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          })\n          .finally(function () {\n            btn.disabled = false;\n            btn.textContent = 'Kirim Instruksi Reset';\n          });\n      });\n    }\n\n    function renderConfirmReset(container, branding, prefilledToken, onBackToLogin) {\n      container.innerHTML =\n        '<div class=\"auth-screen\">' +\n          '<div class=\"auth-card\">' +\n            renderBranding(branding) +\n            '<h2 style=\"margin:0 0 8px;font-size:18px;\">Atur Ulang Password</h2>' +\n            '<div id=\"rp-alert\"></div>' +\n            '<form id=\"rp-form\">' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Token Reset</label>' +\n                '<input type=\"text\" id=\"rp-token\" class=\"form-control\" value=\"' + esc(prefilledToken || '') + '\" required>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Password Baru</label>' +\n                '<input type=\"password\" id=\"rp-pw\" class=\"form-control\" minlength=\"8\" required>' +\n                '<span class=\"form-hint\">Minimal 8 karakter dengan huruf dan angka.</span>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Konfirmasi Password Baru</label>' +\n                '<input type=\"password\" id=\"rp-pw2\" class=\"form-control\" minlength=\"8\" required>' +\n              '</div>' +\n              '<button type=\"submit\" id=\"rp-submit\" class=\"btn btn-primary btn-block\">Simpan Password Baru</button>' +\n            '</form>' +\n            '<div class=\"auth-links\">' +\n              '<button type=\"button\" id=\"rp-back\" class=\"link-btn\">Kembali ke Login</button>' +\n            '</div>' +\n          '</div>' +\n        '</div>';\n\n      if (window.TM_APP && window.TM_APP.bindPasswordToggles) {\n        window.TM_APP.bindPasswordToggles(container);\n      }\n\n      document.getElementById('rp-back').addEventListener('click', onBackToLogin);\n      document.getElementById('rp-form').addEventListener('submit', function (e) {\n        e.preventDefault();\n        var alertEl = document.getElementById('rp-alert');\n        var pw = document.getElementById('rp-pw').value;\n        var pw2 = document.getElementById('rp-pw2').value;\n        if (pw !== pw2) {\n          alertEl.innerHTML = '<div class=\"alert alert-error\">Konfirmasi password tidak cocok.</div>';\n          return;\n        }\n        var btn = document.getElementById('rp-submit');\n        btn.disabled = true;\n        btn.innerHTML = '<span class=\"spinner\"></span> Menyimpan...';\n\n        window.TM_API.callRpc('api_confirmPasswordReset', document.getElementById('rp-token').value, pw)\n          .then(function () {\n            window.TM_APP.showToast('Password berhasil direset. Silakan login.', 'success');\n            onBackToLogin();\n          })\n          .catch(function (err) {\n            alertEl.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n            btn.disabled = false;\n            btn.textContent = 'Simpan Password Baru';\n          });\n      });\n    }\n\n    function renderForceChangePassword(container, branding, user, onComplete, onLogout) {\n      container.innerHTML =\n        '<div class=\"auth-screen\">' +\n          '<div class=\"auth-card\">' +\n            renderBranding(branding) +\n            '<div class=\"alert alert-warning\">Akun <strong>' + esc(user.Username) + '</strong> direset oleh Super Admin atau baru dibuat. Anda wajib mengganti password sebelum melanjutkan.</div>' +\n            '<div id=\"cp-alert\"></div>' +\n            '<form id=\"cp-form\">' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Password Sementara / Saat Ini</label>' +\n                '<input type=\"password\" id=\"cp-current\" class=\"form-control\" required>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Password Baru</label>' +\n                '<input type=\"password\" id=\"cp-new\" class=\"form-control\" minlength=\"8\" required>' +\n                '<span class=\"form-hint\">Minimal 8 karakter dengan kombinasi huruf dan angka.</span>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Konfirmasi Password Baru</label>' +\n                '<input type=\"password\" id=\"cp-confirm\" class=\"form-control\" minlength=\"8\" required>' +\n              '</div>' +\n              '<button type=\"submit\" id=\"cp-submit\" class=\"btn btn-primary btn-block\">Simpan &amp; Lanjutkan</button>' +\n            '</form>' +\n            '<div class=\"auth-links\">' +\n              '<button type=\"button\" id=\"cp-logout\" class=\"link-btn\">Keluar</button>' +\n            '</div>' +\n          '</div>' +\n        '</div>';\n\n      if (window.TM_APP && window.TM_APP.bindPasswordToggles) {\n        window.TM_APP.bindPasswordToggles(container);\n      }\n\n      document.getElementById('cp-logout').addEventListener('click', onLogout);\n      document.getElementById('cp-form').addEventListener('submit', function (e) {\n        e.preventDefault();\n        var alertEl = document.getElementById('cp-alert');\n        var pw = document.getElementById('cp-new').value;\n        var pw2 = document.getElementById('cp-confirm').value;\n        if (pw !== pw2) {\n          alertEl.innerHTML = '<div class=\"alert alert-error\">Konfirmasi password tidak cocok.</div>';\n          return;\n        }\n        var btn = document.getElementById('cp-submit');\n        btn.disabled = true;\n        btn.innerHTML = '<span class=\"spinner\"></span> Memperbarui...';\n\n        window.TM_API.callRpc(\n          'api_changePasswordRequired',\n          window.TM_API.getToken(),\n          document.getElementById('cp-current').value,\n          pw\n        ).then(function (data) {\n          window.TM_APP.showToast('Password berhasil diperbarui.', 'success');\n          onComplete(data.user);\n        }).catch(function (err) {\n          alertEl.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          btn.disabled = false;\n          btn.textContent = 'Simpan & Lanjutkan';\n        });\n      });\n    }\n\n    return {\n      renderBootstrap: renderBootstrap,\n      renderLogin: renderLogin,\n      renderForgotPassword: renderForgotPassword,\n      renderConfirmReset: renderConfirmReset,\n      renderForceChangePassword: renderForceChangePassword\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_VIEWS_ADMIN = (function () {\n    function esc(s) {\n      return window.TM_APP.escapeHtml(s);\n    }\n\n    function roleLabel(role) {\n      if (role === 'SUPER_ADMIN') return '<span class=\"badge badge-primary\">Super Admin</span>';\n      if (role === 'TRAINER') return '<span class=\"badge badge-success\">Trainer</span>';\n      if (role === 'MANAJEMEN') return '<span class=\"badge badge-neutral\">Manajemen</span>';\n      return esc(role);\n    }\n\n    function isLockedNow(u) {\n      if (!u.LockedUntil) return false;\n      return new Date(u.LockedUntil).getTime() > Date.now();\n    }\n\n    /* ==================== KELOLA PENGGUNA ==================== */\n    function renderUsersView(container) {\n      container.innerHTML =\n        '<div class=\"card\">' +\n          '<div class=\"card-header\">' +\n            '<div>' +\n              '<h2 class=\"card-title\">Manajemen Pengguna</h2>' +\n              '<p class=\"form-hint\" style=\"margin:4px 0 0;\">Akun tidak dapat dihapus permanen demi integritas riwayat pemeriksaan &amp; Audit Log.</p>' +\n            '</div>' +\n            '<button id=\"btn-new-user\" class=\"btn btn-primary\">+ Tambah Pengguna</button>' +\n          '</div>' +\n          '<div class=\"toolbar\">' +\n            '<div class=\"toolbar-field\"><input type=\"text\" id=\"user-search\" class=\"form-control\" placeholder=\"Cari nama, username, atau email...\"></div>' +\n            '<div>' +\n              '<select id=\"user-role-filter\" class=\"form-control\">' +\n                '<option value=\"\">Semua Role</option>' +\n                '<option value=\"SUPER_ADMIN\">Super Admin</option>' +\n                '<option value=\"TRAINER\">Trainer</option>' +\n                '<option value=\"MANAJEMEN\">Manajemen</option>' +\n              '</select>' +\n            '</div>' +\n          '</div>' +\n          '<div id=\"users-list-container\"><p class=\"form-hint\">Memuat daftar pengguna...</p></div>' +\n        '</div>';\n\n      var allUsers = [];\n\n      function loadUsers() {\n        window.TM_API.callRpc('api_listUsers', window.TM_API.getToken())\n          .then(function (data) {\n            allUsers = data || [];\n            drawUsers();\n          })\n          .catch(function (err) {\n            document.getElementById('users-list-container').innerHTML =\n              '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          });\n      }\n\n      function drawUsers() {\n        var q = (document.getElementById('user-search').value || '').trim().toLowerCase();\n        var rf = document.getElementById('user-role-filter').value;\n        var filtered = allUsers.filter(function (u) {\n          if (rf && u.Role !== rf) return false;\n          if (q) {\n            var hay = (u.Name + ' ' + u.Username + ' ' + u.Email).toLowerCase();\n            if (hay.indexOf(q) === -1) return false;\n          }\n          return true;\n        });\n\n        var listEl = document.getElementById('users-list-container');\n        if (filtered.length === 0) {\n          listEl.innerHTML = '<p class=\"form-hint\">Tidak ada pengguna yang sesuai filter.</p>';\n          return;\n        }\n\n        var rowsHtml = filtered.map(function (u) {\n          var locked = isLockedNow(u);\n          var statusBadge = u.Status === 'ACTIVE'\n            ? '<span class=\"badge badge-success\">Aktif</span>'\n            : '<span class=\"badge badge-neutral\">Nonaktif</span>';\n          var lockBadge = locked ? ' <span class=\"badge badge-danger\">Terkunci</span>' : '';\n          return (\n            '<tr>' +\n              '<td><strong>' + esc(u.Name) + '</strong><br><span class=\"form-hint\">@' + esc(u.Username) + '</span></td>' +\n              '<td>' + esc(u.Email) + '</td>' +\n              '<td>' + roleLabel(u.Role) + '</td>' +\n              '<td>' + statusBadge + lockBadge + '</td>' +\n              '<td>' +\n                '<div style=\"display:flex;gap:6px;flex-wrap:wrap;\">' +\n                  '<button class=\"btn btn-sm btn-secondary\" data-act=\"edit\" data-id=\"' + esc(u.UserID) + '\">Ubah</button>' +\n                  '<button class=\"btn btn-sm btn-secondary\" data-act=\"resetpw\" data-id=\"' + esc(u.UserID) + '\">Reset PW</button>' +\n                  (locked ? '<button class=\"btn btn-sm btn-primary\" data-act=\"unlock\" data-id=\"' + esc(u.UserID) + '\">Buka Kunci</button>' : '') +\n                  '<button class=\"btn btn-sm ' + (u.Status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary') + '\" data-act=\"toggle\" data-id=\"' + esc(u.UserID) + '\">' +\n                    (u.Status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan') +\n                  '</button>' +\n                '</div>' +\n              '</td>' +\n            '</tr>'\n          );\n        }).join('');\n\n        var cardsHtml = filtered.map(function (u) {\n          var locked = isLockedNow(u);\n          return (\n            '<div class=\"mobile-item-card\">' +\n              '<div class=\"mobile-item-row\">' +\n                '<div><strong>' + esc(u.Name) + '</strong><div class=\"form-hint\">@' + esc(u.Username) + '</div></div>' +\n                '<div>' + roleLabel(u.Role) + '</div>' +\n              '</div>' +\n              '<div class=\"form-hint\" style=\"margin-bottom:8px;\">' + esc(u.Email) + '</div>' +\n              '<div>' +\n                (u.Status === 'ACTIVE' ? '<span class=\"badge badge-success\">Aktif</span>' : '<span class=\"badge badge-neutral\">Nonaktif</span>') +\n                (locked ? ' <span class=\"badge badge-danger\">Terkunci</span>' : '') +\n              '</div>' +\n              '<div class=\"mobile-item-actions\">' +\n                '<button class=\"btn btn-sm btn-secondary\" data-act=\"edit\" data-id=\"' + esc(u.UserID) + '\">Ubah</button>' +\n                '<button class=\"btn btn-sm btn-secondary\" data-act=\"resetpw\" data-id=\"' + esc(u.UserID) + '\">Reset PW</button>' +\n                (locked ? '<button class=\"btn btn-sm btn-primary\" data-act=\"unlock\" data-id=\"' + esc(u.UserID) + '\">Buka Kunci</button>' : '') +\n                '<button class=\"btn btn-sm ' + (u.Status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary') + '\" data-act=\"toggle\" data-id=\"' + esc(u.UserID) + '\">' +\n                  (u.Status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan') +\n                '</button>' +\n              '</div>' +\n            '</div>'\n          );\n        }).join('');\n\n        listEl.innerHTML =\n          '<div class=\"table-wrap\">' +\n            '<table class=\"data-table\">' +\n              '<thead><tr><th>Nama / Username</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead>' +\n              '<tbody>' + rowsHtml + '</tbody>' +\n            '</table>' +\n          '</div>' +\n          '<div class=\"mobile-card-list\">' + cardsHtml + '</div>';\n\n        listEl.querySelectorAll('button[data-act]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var act = btn.getAttribute('data-act');\n            var uid = btn.getAttribute('data-id');\n            var target = allUsers.find(function (x) { return x.UserID === uid; });\n            if (!target) return;\n            if (act === 'edit') openUserModal(target);\n            if (act === 'resetpw') openResetPwModal(target);\n            if (act === 'unlock') handleUnlock(target);\n            if (act === 'toggle') handleToggleStatus(target);\n          });\n        });\n      }\n\n      function openUserModal(existing) {\n        var isEdit = Boolean(existing);\n        var html =\n          '<div id=\"um-alert\"></div>' +\n          '<form id=\"um-form\">' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Nama Lengkap</label>' +\n              '<input type=\"text\" id=\"um-name\" class=\"form-control\" value=\"' + esc(isEdit ? existing.Name : '') + '\" required>' +\n            '</div>' +\n            (isEdit ? '' : (\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Username</label>' +\n                '<input type=\"text\" id=\"um-username\" class=\"form-control\" pattern=\"[a-z0-9._-]{3,32}\" required>' +\n              '</div>'\n            )) +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Email</label>' +\n              '<input type=\"email\" id=\"um-email\" class=\"form-control\" value=\"' + esc(isEdit ? existing.Email : '') + '\" required>' +\n            '</div>' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Role</label>' +\n              '<select id=\"um-role\" class=\"form-control\">' +\n                '<option value=\"TRAINER\"' + (isEdit && existing.Role === 'TRAINER' ? ' selected' : '') + '>Trainer</option>' +\n                '<option value=\"MANAJEMEN\"' + (isEdit && existing.Role === 'MANAJEMEN' ? ' selected' : '') + '>Manajemen</option>' +\n                '<option value=\"SUPER_ADMIN\"' + (isEdit && existing.Role === 'SUPER_ADMIN' ? ' selected' : '') + '>Super Admin</option>' +\n              '</select>' +\n            '</div>' +\n            (isEdit ? '' : (\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Password Awal</label>' +\n                '<input type=\"password\" id=\"um-password\" class=\"form-control\" minlength=\"8\" required>' +\n                '<span class=\"form-hint\">Pengguna wajib mengganti password ini saat login pertama.</span>' +\n              '</div>'\n            )) +\n            '<div class=\"modal-footer\">' +\n              '<button type=\"button\" class=\"btn btn-secondary\" id=\"um-cancel\">Batal</button>' +\n              '<button type=\"submit\" class=\"btn btn-primary\" id=\"um-save\">Simpan</button>' +\n            '</div>' +\n          '</form>';\n\n        var close = window.TM_APP.openModal(isEdit ? 'Ubah Pengguna' : 'Tambah Pengguna Baru', html);\n        document.getElementById('um-cancel').addEventListener('click', close);\n        document.getElementById('um-form').addEventListener('submit', function (e) {\n          e.preventDefault();\n          var saveBtn = document.getElementById('um-save');\n          saveBtn.disabled = true;\n          saveBtn.textContent = 'Menyimpan...';\n\n          var req = isEdit\n            ? window.TM_API.callRpc('api_updateUser', window.TM_API.getToken(), existing.UserID, {\n                name: document.getElementById('um-name').value,\n                email: document.getElementById('um-email').value,\n                role: document.getElementById('um-role').value\n              })\n            : window.TM_API.callRpc('api_createUser', window.TM_API.getToken(), {\n                name: document.getElementById('um-name').value,\n                username: document.getElementById('um-username').value,\n                email: document.getElementById('um-email').value,\n                role: document.getElementById('um-role').value,\n                password: document.getElementById('um-password').value\n              });\n\n          req.then(function () {\n            window.TM_APP.showToast('Data pengguna disimpan.', 'success');\n            close();\n            loadUsers();\n          }).catch(function (err) {\n            document.getElementById('um-alert').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n            saveBtn.disabled = false;\n            saveBtn.textContent = 'Simpan';\n          });\n        });\n      }\n\n      function openResetPwModal(target) {\n        var html =\n          '<p>Reset password untuk <strong>' + esc(target.Name) + ' (@' + esc(target.Username) + ')</strong>. Pengguna wajib mengganti password pada login berikutnya.</p>' +\n          '<div id=\"arp-alert\"></div>' +\n          '<form id=\"arp-form\">' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Password Sementara Baru</label>' +\n              '<input type=\"password\" id=\"arp-pw\" class=\"form-control\" minlength=\"8\" required>' +\n              '<span class=\"form-hint\">Minimal 8 karakter dengan huruf dan angka.</span>' +\n            '</div>' +\n            '<div class=\"modal-footer\">' +\n              '<button type=\"button\" class=\"btn btn-secondary\" id=\"arp-cancel\">Batal</button>' +\n              '<button type=\"submit\" class=\"btn btn-primary\" id=\"arp-save\">Reset Password</button>' +\n            '</div>' +\n          '</form>';\n        var close = window.TM_APP.openModal('Reset Password Pengguna', html);\n        document.getElementById('arp-cancel').addEventListener('click', close);\n        document.getElementById('arp-form').addEventListener('submit', function (e) {\n          e.preventDefault();\n          var btn = document.getElementById('arp-save');\n          btn.disabled = true;\n          window.TM_API.callRpc('api_adminResetPassword', window.TM_API.getToken(), target.UserID, document.getElementById('arp-pw').value)\n            .then(function () {\n              window.TM_APP.showToast('Password sementara telah diterapkan.', 'success');\n              close();\n              loadUsers();\n            })\n            .catch(function (err) {\n              document.getElementById('arp-alert').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n              btn.disabled = false;\n            });\n        });\n      }\n\n      function handleUnlock(target) {\n        window.TM_API.callRpc('api_unlockUser', window.TM_API.getToken(), target.UserID)\n          .then(function () {\n            window.TM_APP.showToast('Kunci akun dibuka.', 'success');\n            loadUsers();\n          })\n          .catch(function (err) {\n            window.TM_APP.showToast(err.message, 'error');\n          });\n      }\n\n      function handleToggleStatus(target) {\n        var nextStatus = target.Status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';\n        var deactivate = nextStatus === 'INACTIVE';\n        window.TM_APP.confirmDialog({\n          variant: deactivate ? 'warning' : 'success',\n          icon: deactivate ? '🔒' : '🔓',\n          title: deactivate ? 'Nonaktifkan Akun?' : 'Aktifkan Akun?',\n          message: deactivate\n            ? 'Pengguna ini tidak akan bisa masuk ke aplikasi sampai diaktifkan kembali.'\n            : 'Pengguna ini akan dapat masuk kembali ke aplikasi.',\n          highlight: (target.Name ? target.Name + ' ' : '') + '@' + target.Username,\n          confirmText: deactivate ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'\n        }).then(function (ok) {\n          if (!ok) return;\n          window.TM_API.callRpc('api_setUserStatus', window.TM_API.getToken(), target.UserID, nextStatus)\n            .then(function () {\n              window.TM_APP.showToast('Status pengguna diperbarui.', 'success');\n              loadUsers();\n            })\n            .catch(function (err) {\n              window.TM_APP.showToast(err.message, 'error');\n            });\n        });\n      }\n\n      document.getElementById('btn-new-user').addEventListener('click', function () { openUserModal(null); });\n      document.getElementById('user-search').addEventListener('input', drawUsers);\n      document.getElementById('user-role-filter').addEventListener('change', drawUsers);\n      loadUsers();\n    }\n\n    /* ==================== PENGATURAN APLIKASI ==================== */\n    function renderSettingsView(container, onBrandingUpdated) {\n      container.innerHTML =\n        '<div class=\"card\" style=\"max-width:680px;\">' +\n          '<div class=\"card-header\"><h2 class=\"card-title\">Pengaturan Aplikasi</h2></div>' +\n          '<div id=\"set-alert\"></div>' +\n          '<div id=\"set-body\"><p class=\"form-hint\">Memuat pengaturan...</p></div>' +\n        '</div>';\n\n      var pendingLogo = null;\n      var removeLogoFlag = false;\n\n      window.TM_API.callRpc('api_getAppSettings', window.TM_API.getToken())\n        .then(function (cfg) {\n          var body = document.getElementById('set-body');\n          body.innerHTML =\n            '<form id=\"settings-form\">' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Nama Perusahaan (tampil di Aplikasi &amp; PDF)</label>' +\n                '<input type=\"text\" id=\"set-company\" class=\"form-control\" value=\"' + esc(cfg.companyName) + '\" required>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Batas Maksimum Draft Aktif per Trainer</label>' +\n                '<input type=\"number\" id=\"set-maxdrafts\" class=\"form-control\" min=\"1\" max=\"20\" value=\"' + esc(cfg.maxActiveDrafts) + '\" required>' +\n                '<span class=\"form-hint\">Draft lama tetap dipertahankan jika batas diturunkan.</span>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Logo Perusahaan (PNG/JPG, maks 2 MB, disimpan privat di Drive)</label>' +\n                '<div style=\"display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:6px 0;\">' +\n                  '<div id=\"set-logo-preview\" style=\"width:96px;height:64px;border:1px dashed var(--border-color);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg-subtle);\">' +\n                    (cfg.logoDataUrl ? '<img src=\"' + esc(cfg.logoDataUrl) + '\" style=\"max-width:100%;max-height:100%;object-fit:contain;\">' : '<span class=\"form-hint\">Tanpa Logo</span>') +\n                  '</div>' +\n                  '<div style=\"display:flex;flex-direction:column;gap:8px;\">' +\n                    '<input type=\"file\" id=\"set-logo-file\" accept=\"image/png,image/jpeg\">' +\n                    (cfg.logoDataUrl ? '<button type=\"button\" id=\"set-remove-logo\" class=\"btn btn-sm btn-secondary\">Hapus Logo Saat Ini</button>' : '') +\n                  '</div>' +\n                '</div>' +\n              '</div>' +\n              '<button type=\"submit\" id=\"set-submit\" class=\"btn btn-primary\">Simpan Pengaturan</button>' +\n            '</form>';\n\n          var fileInput = document.getElementById('set-logo-file');\n          fileInput.addEventListener('change', function () {\n            var file = fileInput.files && fileInput.files[0];\n            if (!file) return;\n            if (file.size > 2 * 1024 * 1024) {\n              window.TM_APP.showToast('Ukuran logo maksimal 2 MB.', 'error');\n              fileInput.value = '';\n              return;\n            }\n            var reader = new FileReader();\n            reader.onload = function (ev) {\n              pendingLogo = { mimeType: file.type, base64Data: ev.target.result };\n              removeLogoFlag = false;\n              document.getElementById('set-logo-preview').innerHTML =\n                '<img src=\"' + esc(ev.target.result) + '\" style=\"max-width:100%;max-height:100%;object-fit:contain;\">';\n            };\n            reader.readAsDataURL(file);\n          });\n\n          var remBtn = document.getElementById('set-remove-logo');\n          if (remBtn) {\n            remBtn.addEventListener('click', function () {\n              pendingLogo = null;\n              removeLogoFlag = true;\n              fileInput.value = '';\n              document.getElementById('set-logo-preview').innerHTML = '<span class=\"form-hint\">Tanpa Logo</span>';\n            });\n          }\n\n          document.getElementById('settings-form').addEventListener('submit', function (e) {\n            e.preventDefault();\n            var btn = document.getElementById('set-submit');\n            btn.disabled = true;\n            btn.textContent = 'Menyimpan...';\n            window.TM_API.callRpc('api_updateAppSettings', window.TM_API.getToken(), {\n              companyName: document.getElementById('set-company').value,\n              maxActiveDrafts: parseInt(document.getElementById('set-maxdrafts').value, 10),\n              removeLogo: removeLogoFlag\n            }, pendingLogo).then(function (updated) {\n              pendingLogo = null;\n              removeLogoFlag = false;\n              window.TM_APP.showToast('Pengaturan aplikasi berhasil disimpan.', 'success');\n              if (onBrandingUpdated) onBrandingUpdated(updated);\n            }).catch(function (err) {\n              document.getElementById('set-alert').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n            }).finally(function () {\n              btn.disabled = false;\n              btn.textContent = 'Simpan Pengaturan';\n            });\n          });\n        })\n        .catch(function (err) {\n          document.getElementById('set-body').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n        });\n    }\n\n    /* ==================== AUDIT LOG VIEWER ==================== */\n    function renderAuditView(container) {\n      var currentPage = 1;\n      container.innerHTML =\n        '<div class=\"card\">' +\n          '<div class=\"card-header\">' +\n            '<h2 class=\"card-title\">Audit Log Sistem (Append-Only)</h2>' +\n          '</div>' +\n          '<div class=\"toolbar\">' +\n            '<div class=\"toolbar-field\"><input type=\"text\" id=\"aud-search\" class=\"form-control\" placeholder=\"Cari aksi, entitas, atau keterangan...\"></div>' +\n            '<div><input type=\"date\" id=\"aud-from\" class=\"form-control\" title=\"Dari tanggal\"></div>' +\n            '<div><input type=\"date\" id=\"aud-to\" class=\"form-control\" title=\"Sampai tanggal\"></div>' +\n            '<div><button id=\"aud-filter-btn\" class=\"btn btn-primary\">Filter</button></div>' +\n          '</div>' +\n          '<div id=\"aud-list\"><p class=\"form-hint\">Memuat Audit Log...</p></div>' +\n        '</div>';\n\n      function fetchLogs(page) {\n        currentPage = page || 1;\n        window.TM_API.callRpc('api_queryAuditLogs', window.TM_API.getToken(), {\n          search: document.getElementById('aud-search').value,\n          dateFrom: document.getElementById('aud-from').value,\n          dateTo: document.getElementById('aud-to').value,\n          page: currentPage,\n          pageSize: 20\n        }).then(function (res) {\n          var box = document.getElementById('aud-list');\n          if (!res.items || res.items.length === 0) {\n            box.innerHTML = '<p class=\"form-hint\">Belum ada catatan Audit Log yang cocok.</p>';\n            return;\n          }\n          var rows = res.items.map(function (it) {\n            return (\n              '<tr>' +\n                '<td style=\"white-space:nowrap;\">' + esc(it.Timestamp) + '</td>' +\n                '<td>' + esc(it.UserDisplay) + '</td>' +\n                '<td><span class=\"badge badge-primary\">' + esc(it.Action) + '</span></td>' +\n                '<td>' + esc(it.EntityType) + '<br><span class=\"form-hint\">' + esc(it.EntityID) + '</span></td>' +\n                '<td>' + esc(it.Description) + '</td>' +\n              '</tr>'\n            );\n          }).join('');\n\n          var cards = res.items.map(function (it) {\n            return (\n              '<div class=\"mobile-item-card\">' +\n                '<div class=\"mobile-item-row\">' +\n                  '<span class=\"badge badge-primary\">' + esc(it.Action) + '</span>' +\n                  '<span class=\"form-hint\">' + esc(it.Timestamp) + '</span>' +\n                '</div>' +\n                '<div style=\"font-weight:600;margin-bottom:4px;\">' + esc(it.UserDisplay) + '</div>' +\n                '<div style=\"font-size:13px;margin-bottom:4px;\">' + esc(it.Description) + '</div>' +\n                '<div class=\"form-hint\">' + esc(it.EntityType) + ' • ' + esc(it.EntityID) + '</div>' +\n              '</div>'\n            );\n          }).join('');\n\n          var pager =\n            '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-top:14px;flex-wrap:wrap;gap:8px;\">' +\n              '<span class=\"form-hint\">Halaman ' + res.page + ' dari ' + res.totalPages + ' (' + res.total + ' catatan)</span>' +\n              '<div style=\"display:flex;gap:8px;\">' +\n                '<button class=\"btn btn-sm btn-secondary\" id=\"aud-prev\" ' + (res.page <= 1 ? 'disabled' : '') + '>Sebelumnya</button>' +\n                '<button class=\"btn btn-sm btn-secondary\" id=\"aud-next\" ' + (res.page >= res.totalPages ? 'disabled' : '') + '>Berikutnya</button>' +\n              '</div>' +\n            '</div>';\n\n          box.innerHTML =\n            '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>Waktu (WIB)</th><th>Pengguna</th><th>Aksi</th><th>Entitas</th><th>Keterangan</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +\n            '<div class=\"mobile-card-list\">' + cards + '</div>' +\n            pager;\n\n          document.getElementById('aud-prev').addEventListener('click', function () { fetchLogs(currentPage - 1); });\n          document.getElementById('aud-next').addEventListener('click', function () { fetchLogs(currentPage + 1); });\n        }).catch(function (err) {\n          document.getElementById('aud-list').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n        });\n      }\n\n      document.getElementById('aud-filter-btn').addEventListener('click', function () { fetchLogs(1); });\n      fetchLogs(1);\n    }\n\n    return {\n      renderUsersView: renderUsersView,\n      renderSettingsView: renderSettingsView,\n      renderAuditView: renderAuditView\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_VIEWS_MASTER = (function () {\n    function esc(s) {\n      return window.TM_APP.escapeHtml(s);\n    }\n\n    var TABS = [\n      { key: 'CATEGORY', label: 'Category', listKey: 'categories', idField: 'CategoryID', nameField: 'CategoryName' },\n      { key: 'SECTION', label: 'Section', listKey: 'sections', idField: 'SectionID', nameField: 'SectionName' },\n      { key: 'AM', label: 'Master AM', listKey: 'ams', idField: 'AM_ID', nameField: 'AM_Name' },\n      { key: 'MUM', label: 'Master MUM', listKey: 'mums', idField: 'MUM_ID', nameField: 'MUM_Name' }\n    ];\n\n    /* ==================== MASTER DATA (CATEGORY, SECTION, AM, MUM) ==================== */\n    function renderMasterDataView(container) {\n      var activeTab = 'CATEGORY';\n      var bundle = null;\n\n      container.innerHTML =\n        '<div class=\"card\">' +\n          '<div class=\"card-header\">' +\n            '<div>' +\n              '<h2 class=\"card-title\">Master Data Operasional</h2>' +\n              '<p class=\"form-hint\" style=\"margin:4px 0 0;\">Kelola daftar Kategori, Bagian (Section), Area Manager (AM), dan MUM. Data yang dinonaktifkan dapat dihapus secara permanen jika sudah tidak dibutuhkan.</p>' +\n            '</div>' +\n            '<button id=\"btn-add-master\" class=\"btn btn-primary\">+ Tambah Data</button>' +\n          '</div>' +\n          '<div class=\"tabs-bar\" id=\"master-tabs\">' +\n            TABS.map(function (t) {\n              return '<button class=\"tab-btn' + (t.key === activeTab ? ' active' : '') + '\" data-tab=\"' + t.key + '\">' + esc(t.label) + '</button>';\n            }).join('') +\n          '</div>' +\n          '<div class=\"toolbar\">' +\n            '<div class=\"toolbar-field\"><input type=\"text\" id=\"master-search\" class=\"form-control\" placeholder=\"Cari nama master...\"></div>' +\n            '<div>' +\n              '<select id=\"master-status-filter\" class=\"form-control\">' +\n                '<option value=\"\">Semua Status</option>' +\n                '<option value=\"ACTIVE\">Aktif</option>' +\n                '<option value=\"INACTIVE\">Nonaktif</option>' +\n              '</select>' +\n            '</div>' +\n          '</div>' +\n          '<div id=\"master-list-box\"><p class=\"form-hint\">Memuat Master Data...</p></div>' +\n        '</div>';\n\n      function getCurrentTabCfg() {\n        return TABS.find(function (t) { return t.key === activeTab; }) || TABS[0];\n      }\n\n      function loadMaster() {\n        window.TM_API.callRpc('api_getMasterBundle', window.TM_API.getToken())\n          .then(function (data) {\n            bundle = data;\n            drawTable();\n          })\n          .catch(function (err) {\n            document.getElementById('master-list-box').innerHTML =\n              '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          });\n      }\n\n      function drawTable() {\n        if (!bundle) return;\n        var cfg = getCurrentTabCfg();\n        var items = (bundle[cfg.listKey] || []).slice();\n        var q = (document.getElementById('master-search').value || '').trim().toLowerCase();\n        var st = document.getElementById('master-status-filter').value;\n\n        var filtered = items.filter(function (it) {\n          if (st && it.Status !== st) return false;\n          if (q && String(it[cfg.nameField]).toLowerCase().indexOf(q) === -1) return false;\n          return true;\n        });\n\n        var box = document.getElementById('master-list-box');\n        if (filtered.length === 0) {\n          box.innerHTML = '<p class=\"form-hint\">Belum ada data untuk kategori ini.</p>';\n          return;\n        }\n\n        var rows = filtered.map(function (it) {\n          var id = it[cfg.idField];\n          var name = it[cfg.nameField];\n          var isAct = it.Status === 'ACTIVE';\n          return (\n            '<tr>' +\n              '<td><code>' + esc(id) + '</code></td>' +\n              '<td><strong>' + esc(name) + '</strong></td>' +\n              '<td>' + (isAct ? '<span class=\"badge badge-success\">Aktif</span>' : '<span class=\"badge badge-neutral\">Nonaktif</span>') + '</td>' +\n              '<td>' +\n                '<div style=\"display:flex;gap:8px;flex-wrap:wrap;\">' +\n                  '<button class=\"btn btn-sm btn-secondary\" data-act=\"edit\" data-id=\"' + esc(id) + '\">Ubah Nama</button>' +\n                  '<button class=\"btn btn-sm ' + (isAct ? 'btn-secondary' : 'btn-primary') + '\" data-act=\"toggle\" data-id=\"' + esc(id) + '\">' +\n                    (isAct ? 'Nonaktifkan' : 'Aktifkan') +\n                  '</button>' +\n                  '<button class=\"btn btn-sm btn-danger\" data-act=\"delete\" data-id=\"' + esc(id) + '\">🗑 Hapus</button>' +\n                '</div>' +\n              '</td>' +\n            '</tr>'\n          );\n        }).join('');\n\n        var cards = filtered.map(function (it) {\n          var id = it[cfg.idField];\n          var name = it[cfg.nameField];\n          var isAct = it.Status === 'ACTIVE';\n          return (\n            '<div class=\"mobile-item-card\">' +\n              '<div class=\"mobile-item-row\">' +\n                '<div><strong>' + esc(name) + '</strong><div class=\"form-hint\">' + esc(id) + '</div></div>' +\n                (isAct ? '<span class=\"badge badge-success\">Aktif</span>' : '<span class=\"badge badge-neutral\">Nonaktif</span>') +\n              '</div>' +\n              '<div class=\"mobile-item-actions\">' +\n                '<button class=\"btn btn-sm btn-secondary\" data-act=\"edit\" data-id=\"' + esc(id) + '\">Ubah Nama</button>' +\n                '<button class=\"btn btn-sm ' + (isAct ? 'btn-secondary' : 'btn-primary') + '\" data-act=\"toggle\" data-id=\"' + esc(id) + '\">' +\n                  (isAct ? 'Nonaktifkan' : 'Aktifkan') +\n                '</button>' +\n                '<button class=\"btn btn-sm btn-danger\" data-act=\"delete\" data-id=\"' + esc(id) + '\">🗑 Hapus</button>' +\n              '</div>' +\n            '</div>'\n          );\n        }).join('');\n\n        box.innerHTML =\n          '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>ID</th><th>Nama</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +\n          '<div class=\"mobile-card-list\">' + cards + '</div>';\n\n        box.querySelectorAll('button[data-act]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var act = btn.getAttribute('data-act');\n            var id = btn.getAttribute('data-id');\n            var item = items.find(function (x) { return x[cfg.idField] === id; });\n            if (!item) return;\n            if (act === 'edit') openMasterModal(cfg, item);\n            if (act === 'toggle') toggleMasterStatus(cfg, item);\n            if (act === 'delete') deleteMasterItemPermanent(cfg, item);\n          });\n        });\n      }\n\n      function openMasterModal(cfg, item) {\n        var isEdit = Boolean(item);\n        var html =\n          '<div id=\"mm-alert\"></div>' +\n          '<form id=\"mm-form\">' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Nama ' + esc(cfg.label) + '</label>' +\n              '<input type=\"text\" id=\"mm-name\" class=\"form-control\" value=\"' + esc(isEdit ? item[cfg.nameField] : '') + '\" required>' +\n            '</div>' +\n            '<div class=\"modal-footer\">' +\n              '<button type=\"button\" class=\"btn btn-secondary\" id=\"mm-cancel\">Batal</button>' +\n              '<button type=\"submit\" class=\"btn btn-primary\" id=\"mm-save\">Simpan</button>' +\n            '</div>' +\n          '</form>';\n        var close = window.TM_APP.openModal((isEdit ? 'Ubah ' : 'Tambah ') + cfg.label, html);\n        document.getElementById('mm-cancel').addEventListener('click', close);\n        document.getElementById('mm-form').addEventListener('submit', function (e) {\n          e.preventDefault();\n          var btn = document.getElementById('mm-save');\n          btn.disabled = true;\n          btn.textContent = 'Menyimpan...';\n          window.TM_API.callRpc('api_saveMasterItem', window.TM_API.getToken(), cfg.key, {\n            id: isEdit ? item[cfg.idField] : '',\n            name: document.getElementById('mm-name').value\n          }).then(function () {\n            window.TM_APP.showToast('Master data berhasil disimpan.', 'success');\n            close();\n            loadMaster();\n          }).catch(function (err) {\n            document.getElementById('mm-alert').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n            btn.disabled = false;\n            btn.textContent = 'Simpan';\n          });\n        });\n      }\n\n      function toggleMasterStatus(cfg, item) {\n        var nextStatus = item.Status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';\n        var deactivate = nextStatus === 'INACTIVE';\n        window.TM_APP.confirmDialog({\n          variant: deactivate ? 'warning' : 'success',\n          icon: deactivate ? '⏸' : '▶',\n          title: deactivate ? 'Nonaktifkan Data?' : 'Aktifkan Data?',\n          message: deactivate\n            ? 'Data ini tidak akan muncul lagi sebagai pilihan saat input pemeriksaan.'\n            : 'Data ini akan kembali muncul sebagai pilihan saat input pemeriksaan.',\n          highlight: item[cfg.nameField],\n          confirmText: deactivate ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'\n        }).then(function (ok) {\n          if (!ok) return;\n          window.TM_API.callRpc('api_setMasterStatus', window.TM_API.getToken(), cfg.key, item[cfg.idField], nextStatus)\n            .then(function () {\n              window.TM_APP.showToast('Status diperbarui.', 'success');\n              loadMaster();\n            })\n            .catch(function (err) {\n              window.TM_APP.showToast(err.message, 'error');\n            });\n        });\n      }\n\n      function deleteMasterItemPermanent(cfg, item) {\n        var id = item[cfg.idField];\n        var name = item[cfg.nameField];\n        var isActive = item.Status === 'ACTIVE';\n        window.TM_APP.confirmDialog({\n          variant: 'danger',\n          title: 'Hapus Permanen?',\n          message: isActive\n            ? 'Data ini masih Aktif. Sistem akan menonaktifkan lalu menghapusnya secara permanen.'\n            : 'Data berikut akan dihapus secara permanen dari sistem.',\n          highlight: name,\n          note: 'Data yang sudah dihapus tidak dapat dikembalikan.',\n          confirmText: 'Ya, Hapus'\n        }).then(function (ok) {\n          if (!ok) return;\n          var chain = isActive\n            ? window.TM_API.callRpc('api_setMasterStatus', window.TM_API.getToken(), cfg.key, id, 'INACTIVE')\n            : Promise.resolve();\n          chain\n            .then(function () {\n              return window.TM_API.callRpc('api_deleteMasterItem', window.TM_API.getToken(), cfg.key, id);\n            })\n            .then(function () {\n              window.TM_APP.showToast('Data \"' + name + '\" berhasil dihapus permanen.', 'success');\n              loadMaster();\n            })\n            .catch(function (err) {\n              window.TM_APP.showToast(err.message, 'error');\n            });\n        });\n      }\n\n      document.getElementById('master-tabs').querySelectorAll('.tab-btn').forEach(function (tabBtn) {\n        tabBtn.addEventListener('click', function () {\n          activeTab = tabBtn.getAttribute('data-tab');\n          document.getElementById('master-tabs').querySelectorAll('.tab-btn').forEach(function (b) {\n            b.classList.toggle('active', b.getAttribute('data-tab') === activeTab);\n          });\n          drawTable();\n        });\n      });\n\n      document.getElementById('btn-add-master').addEventListener('click', function () {\n        openMasterModal(getCurrentTabCfg(), null);\n      });\n      document.getElementById('master-search').addEventListener('input', drawTable);\n      document.getElementById('master-status-filter').addEventListener('change', drawTable);\n\n      loadMaster();\n    }\n\n    /* ==================== MANAJEMEN OUTLET & MERGE ==================== */\n    function renderOutletsView(container) {\n      var outlets = [];\n      var activeTab = 'ACTIVE';\n\n      container.innerHTML =\n        '<div class=\"card\">' +\n          '<div class=\"card-header\">' +\n            '<div>' +\n              '<h2 class=\"card-title\">Manajemen Outlet</h2>' +\n              '<p class=\"form-hint\" style=\"margin:4px 0 0;\">Kelola daftar Outlet, penggabungan nama Outlet ganda, serta penonaktifan atau penghapusan permanen Outlet yang sudah tidak dibutuhkan.</p>' +\n            '</div>' +\n            '<div style=\"display:flex;gap:8px;flex-wrap:wrap;\">' +\n              '<button id=\"btn-merge-outlets\" class=\"btn btn-secondary\">Gabungkan Outlet Ganda</button>' +\n              '<button id=\"btn-new-outlet\" class=\"btn btn-primary\">+ Tambah Outlet</button>' +\n            '</div>' +\n          '</div>' +\n          '<div class=\"tabs-bar\" id=\"outlet-tabs\">' +\n            '<button class=\"tab-btn active\" data-otab=\"ACTIVE\">Daftar Outlet</button>' +\n            '<button class=\"tab-btn\" data-otab=\"MERGED\">Outlet Digabung</button>' +\n          '</div>' +\n          '<div class=\"toolbar\">' +\n            '<div class=\"toolbar-field\"><input type=\"text\" id=\"outlet-search\" class=\"form-control\" placeholder=\"Cari nama, kode OUT..., atau nama lain...\"></div>' +\n            '<div>' +\n              '<select id=\"outlet-status-filter\" class=\"form-control\">' +\n                '<option value=\"\">Semua Status</option>' +\n                '<option value=\"ACTIVE\">Aktif</option>' +\n                '<option value=\"INACTIVE\">Nonaktif</option>' +\n              '</select>' +\n            '</div>' +\n          '</div>' +\n          '<div id=\"outlets-list-box\"><p class=\"form-hint\">Memuat daftar Outlet...</p></div>' +\n        '</div>';\n\n      function loadOutlets() {\n        window.TM_API.callRpc('api_listOutlets', window.TM_API.getToken())\n          .then(function (data) {\n            outlets = data || [];\n            drawOutlets();\n          })\n          .catch(function (err) {\n            document.getElementById('outlets-list-box').innerHTML =\n              '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          });\n      }\n\n      function drawOutlets() {\n        var q = (document.getElementById('outlet-search').value || '').trim().toLowerCase();\n        var stFilterEl = document.getElementById('outlet-status-filter');\n        var stFilter = stFilterEl ? stFilterEl.value : '';\n        var filtered = outlets.filter(function (o) {\n          var isMerged = Boolean(o.MergedIntoOutletID);\n          if (activeTab === 'ACTIVE' && isMerged) return false;\n          if (activeTab === 'MERGED' && !isMerged) return false;\n          if (activeTab === 'ACTIVE' && stFilter && o.Status !== stFilter) return false;\n          if (q) {\n            var aliasStr = (o.Aliases || []).map(function (a) { return a.AliasName; }).join(' ');\n            var hay = (o.OutletCode + ' ' + o.CanonicalName + ' ' + aliasStr + ' ' + (o.MergedIntoName || '')).toLowerCase();\n            if (hay.indexOf(q) === -1) return false;\n          }\n          return true;\n        });\n\n        var box = document.getElementById('outlets-list-box');\n        if (filtered.length === 0) {\n          box.innerHTML = '<p class=\"form-hint\">Tidak ada Outlet pada kategori ini.</p>';\n          return;\n        }\n\n        var rows = filtered.map(function (o) {\n          var aliasBadges = (o.Aliases || []).map(function (a) {\n            return '<span class=\"badge badge-neutral\">' + esc(a.AliasName) + '</span>';\n          }).join(' ');\n          var isAct = o.Status === 'ACTIVE';\n          var statusBadge = o.MergedIntoOutletID\n            ? '<span class=\"badge badge-warning\">Digabung</span>'\n            : (isAct ? '<span class=\"badge badge-success\">Aktif</span>' : '<span class=\"badge badge-neutral\">Nonaktif</span>');\n\n          return (\n            '<tr>' +\n              '<td><code>' + esc(o.OutletCode) + '</code></td>' +\n              '<td><strong>' + esc(o.CanonicalName) + '</strong></td>' +\n              '<td>' + statusBadge + '</td>' +\n              '<td>' + (o.MergedIntoOutletID\n                ? '<span class=\"badge badge-warning\">Digabung ke → ' + esc(o.MergedIntoName || o.MergedIntoOutletID) + '</span>'\n                : (aliasBadges || '<span class=\"form-hint\">—</span>')\n              ) + '</td>' +\n              '<td>' +\n                '<div style=\"display:flex;gap:6px;flex-wrap:wrap;\">' +\n                  (o.MergedIntoOutletID\n                    ? '<button class=\"btn btn-sm btn-secondary\" data-act=\"unmerge\" data-id=\"' + esc(o.OutletID) + '\">Batalkan Gabung</button>' +\n                      '<button class=\"btn btn-sm btn-danger\" data-act=\"delete\" data-id=\"' + esc(o.OutletID) + '\">🗑 Hapus</button>'\n                    : '<button class=\"btn btn-sm btn-secondary\" data-act=\"rename\" data-id=\"' + esc(o.OutletID) + '\">Ubah Nama</button>' +\n                      '<button class=\"btn btn-sm ' + (isAct ? 'btn-secondary' : 'btn-primary') + '\" data-act=\"toggle\" data-id=\"' + esc(o.OutletID) + '\">' + (isAct ? 'Nonaktifkan' : 'Aktifkan') + '</button>' +\n                      '<button class=\"btn btn-sm btn-danger\" data-act=\"delete\" data-id=\"' + esc(o.OutletID) + '\">🗑 Hapus</button>'\n                  ) +\n                '</div>' +\n              '</td>' +\n            '</tr>'\n          );\n        }).join('');\n\n        var cards = filtered.map(function (o) {\n          var isAct = o.Status === 'ACTIVE';\n          return (\n            '<div class=\"mobile-item-card\">' +\n              '<div class=\"mobile-item-row\">' +\n                '<div><strong>' + esc(o.CanonicalName) + '</strong><div class=\"form-hint\">Kode: ' + esc(o.OutletCode) + '</div></div>' +\n                (o.MergedIntoOutletID\n                  ? '<span class=\"badge badge-warning\">Digabung</span>'\n                  : (isAct ? '<span class=\"badge badge-success\">Aktif</span>' : '<span class=\"badge badge-neutral\">Nonaktif</span>')) +\n              '</div>' +\n              (o.MergedIntoOutletID\n                ? '<div class=\"form-hint\">Digabung ke: <strong>' + esc(o.MergedIntoName) + '</strong></div>'\n                : ((o.Aliases && o.Aliases.length) ? '<div class=\"form-hint\">Nama lain: ' + esc(o.Aliases.map(function (a) { return a.AliasName; }).join(', ')) + '</div>' : '')\n              ) +\n              '<div class=\"mobile-item-actions\">' +\n                (o.MergedIntoOutletID\n                  ? '<button class=\"btn btn-sm btn-secondary\" data-act=\"unmerge\" data-id=\"' + esc(o.OutletID) + '\">Batalkan Gabung</button>' +\n                    '<button class=\"btn btn-sm btn-danger\" data-act=\"delete\" data-id=\"' + esc(o.OutletID) + '\">🗑 Hapus</button>'\n                  : '<button class=\"btn btn-sm btn-secondary\" data-act=\"rename\" data-id=\"' + esc(o.OutletID) + '\">Ubah Nama</button>' +\n                    '<button class=\"btn btn-sm ' + (isAct ? 'btn-secondary' : 'btn-primary') + '\" data-act=\"toggle\" data-id=\"' + esc(o.OutletID) + '\">' + (isAct ? 'Nonaktifkan' : 'Aktifkan') + '</button>' +\n                    '<button class=\"btn btn-sm btn-danger\" data-act=\"delete\" data-id=\"' + esc(o.OutletID) + '\">🗑 Hapus</button>'\n                ) +\n              '</div>' +\n            '</div>'\n          );\n        }).join('');\n\n        box.innerHTML =\n          '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>Kode</th><th>Nama Outlet</th><th>Status</th><th>' + (activeTab === 'MERGED' ? 'Digabung Ke' : 'Nama Lain (Alias)') + '</th><th>Aksi</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +\n          '<div class=\"mobile-card-list\">' + cards + '</div>';\n\n        box.querySelectorAll('button[data-act]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var act = btn.getAttribute('data-act');\n            var id = btn.getAttribute('data-id');\n            var item = outlets.find(function (x) { return x.OutletID === id; });\n            if (!item) return;\n            if (act === 'rename') openRenameModal(item);\n            if (act === 'unmerge') openUnmergeModal(item);\n            if (act === 'toggle') toggleOutletStatus(item);\n            if (act === 'delete') deleteOutletPermanent(item);\n          });\n        });\n      }\n\n      function toggleOutletStatus(item) {\n        var nextStatus = item.Status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';\n        var deactivate = nextStatus === 'INACTIVE';\n        window.TM_APP.confirmDialog({\n          variant: deactivate ? 'warning' : 'success',\n          icon: deactivate ? '⏸' : '▶',\n          title: deactivate ? 'Nonaktifkan Outlet?' : 'Aktifkan Outlet?',\n          message: deactivate\n            ? 'Outlet ini tidak akan muncul lagi sebagai pilihan saat input pemeriksaan.'\n            : 'Outlet ini akan kembali bisa dipilih saat input pemeriksaan.',\n          highlight: item.CanonicalName + ' (' + item.OutletCode + ')',\n          confirmText: deactivate ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'\n        }).then(function (ok) {\n          if (!ok) return;\n          window.TM_API.callRpc('api_setOutletStatus', window.TM_API.getToken(), item.OutletID, nextStatus)\n            .then(function () {\n              window.TM_APP.showToast('Status Outlet diperbarui.', 'success');\n              loadOutlets();\n            })\n            .catch(function (err) {\n              window.TM_APP.showToast(err.message, 'error');\n            });\n        });\n      }\n\n      function deleteOutletPermanent(item) {\n        var isActive = item.Status === 'ACTIVE' && !item.MergedIntoOutletID;\n        window.TM_APP.confirmDialog({\n          variant: 'danger',\n          title: 'Hapus Outlet Permanen?',\n          message: isActive\n            ? 'Outlet ini masih Aktif. Sistem akan menonaktifkan lalu menghapusnya secara permanen.'\n            : 'Outlet berikut akan dihapus secara permanen dari sistem.',\n          highlight: item.CanonicalName + ' (' + item.OutletCode + ')',\n          note: 'Data Outlet yang sudah dihapus tidak dapat dikembalikan.',\n          confirmText: 'Ya, Hapus'\n        }).then(function (ok) {\n          if (!ok) return;\n          var chain = isActive\n            ? window.TM_API.callRpc('api_setOutletStatus', window.TM_API.getToken(), item.OutletID, 'INACTIVE')\n            : Promise.resolve();\n          chain\n            .then(function () {\n              return window.TM_API.callRpc('api_deleteOutlet', window.TM_API.getToken(), item.OutletID);\n            })\n            .then(function () {\n              window.TM_APP.showToast('Outlet \"' + item.CanonicalName + '\" berhasil dihapus permanen.', 'success');\n              loadOutlets();\n            })\n            .catch(function (err) {\n              window.TM_APP.showToast(err.message, 'error');\n            });\n        });\n      }\n\n      function openCreateOutletModal() {\n        var html =\n          '<div id=\"om-alert\"></div>' +\n          '<form id=\"om-form\">' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Nama Outlet</label>' +\n              '<input type=\"text\" id=\"om-name\" class=\"form-control\" placeholder=\"Contoh: Outlet Kemang Raya\" required>' +\n              '<span class=\"form-hint\">Spasi berlebih akan dinormalisasi dan sistem memeriksa kemungkinan duplikat.</span>' +\n            '</div>' +\n            '<div id=\"om-suggestions\" style=\"margin-bottom:12px;\"></div>' +\n            '<div class=\"modal-footer\">' +\n              '<button type=\"button\" class=\"btn btn-secondary\" id=\"om-cancel\">Batal</button>' +\n              '<button type=\"submit\" class=\"btn btn-primary\" id=\"om-save\">Simpan Outlet</button>' +\n            '</div>' +\n          '</form>';\n        var close = window.TM_APP.openModal('Tambah Outlet Baru', html);\n        document.getElementById('om-cancel').addEventListener('click', close);\n\n        var timer = null;\n        document.getElementById('om-name').addEventListener('input', function (e) {\n          clearTimeout(timer);\n          var val = e.target.value;\n          if (!val || val.trim().length < 2) {\n            document.getElementById('om-suggestions').innerHTML = '';\n            return;\n          }\n          timer = setTimeout(function () {\n            window.TM_API.callRpc('api_suggestOutlets', window.TM_API.getToken(), val)\n              .then(function (sugs) {\n                var box = document.getElementById('om-suggestions');\n                if (!box) return;\n                if (!sugs || sugs.length === 0) {\n                  box.innerHTML = '<span class=\"form-hint\">Tidak ditemukan Outlet serupa.</span>';\n                  return;\n                }\n                box.innerHTML =\n                  '<div class=\"alert alert-warning\" style=\"margin:0;\">' +\n                    '<strong>Kemungkinan Outlet sudah ada:</strong>' +\n                    '<ul style=\"margin:6px 0 0;padding-left:18px;\">' +\n                      sugs.slice(0, 4).map(function (s) {\n                        return '<li><code>' + esc(s.OutletCode) + '</code> ' + esc(s.CanonicalName) + ' (' + Math.round(s.score * 100) + '%)</li>';\n                      }).join('') +\n                    '</ul>' +\n                  '</div>';\n              }).catch(function () {});\n          }, 250);\n        });\n\n        document.getElementById('om-form').addEventListener('submit', function (e) {\n          e.preventDefault();\n          var btn = document.getElementById('om-save');\n          btn.disabled = true;\n          btn.textContent = 'Memproses...';\n          window.TM_API.callRpc('api_resolveOrCreateOutlet', window.TM_API.getToken(), document.getElementById('om-name').value)\n            .then(function (res) {\n              window.TM_APP.showToast(\n                res.created\n                  ? 'Outlet baru dibuat: ' + res.outlet.CanonicalName + ' (' + res.outlet.OutletCode + ')'\n                  : 'Menggunakan Outlet yang sudah ada: ' + res.outlet.CanonicalName,\n                'success'\n              );\n              close();\n              loadOutlets();\n            })\n            .catch(function (err) {\n              document.getElementById('om-alert').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n              btn.disabled = false;\n              btn.textContent = 'Simpan Outlet';\n            });\n        });\n      }\n\n      function openRenameModal(item) {\n        var html =\n          '<div id=\"or-alert\"></div>' +\n          '<form id=\"or-form\">' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Nama Outlet (' + esc(item.OutletCode) + ')</label>' +\n              '<input type=\"text\" id=\"or-name\" class=\"form-control\" value=\"' + esc(item.CanonicalName) + '\" required>' +\n            '</div>' +\n            '<div class=\"modal-footer\">' +\n              '<button type=\"button\" class=\"btn btn-secondary\" id=\"or-cancel\">Batal</button>' +\n              '<button type=\"submit\" class=\"btn btn-primary\" id=\"or-save\">Simpan</button>' +\n            '</div>' +\n          '</form>';\n        var close = window.TM_APP.openModal('Ubah Nama Outlet', html);\n        document.getElementById('or-cancel').addEventListener('click', close);\n        document.getElementById('or-form').addEventListener('submit', function (e) {\n          e.preventDefault();\n          var btn = document.getElementById('or-save');\n          btn.disabled = true;\n          window.TM_API.callRpc('api_updateOutlet', window.TM_API.getToken(), item.OutletID, {\n            canonicalName: document.getElementById('or-name').value\n          }).then(function () {\n            window.TM_APP.showToast('Nama Outlet diperbarui.', 'success');\n            close();\n            loadOutlets();\n          }).catch(function (err) {\n            document.getElementById('or-alert').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n            btn.disabled = false;\n          });\n        });\n      }\n\n      function openMergeModal() {\n        var activeOutlets = outlets.filter(function (o) { return o.Status === 'ACTIVE' && !o.MergedIntoOutletID; });\n        if (activeOutlets.length < 2) {\n          window.TM_APP.showToast('Minimal dibutuhkan 2 Outlet aktif untuk digabungkan.', 'error');\n          return;\n        }\n        var optionsHtml = activeOutlets.map(function (o) {\n          return '<option value=\"' + esc(o.OutletID) + '\">' + esc(o.OutletCode + ' — ' + o.CanonicalName) + '</option>';\n        }).join('');\n        var checkHtml = activeOutlets.map(function (o) {\n          return (\n            '<label style=\"display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;\">' +\n              '<input type=\"checkbox\" class=\"merge-dup-cb\" value=\"' + esc(o.OutletID) + '\"> ' +\n              '<span><code>' + esc(o.OutletCode) + '</code> ' + esc(o.CanonicalName) + '</span>' +\n            '</label>'\n          );\n        }).join('');\n\n        var html =\n          '<div id=\"mg-alert\"></div>' +\n          '<form id=\"mg-form\">' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Outlet Utama (Tujuan Penggabungan)</label>' +\n              '<select id=\"mg-primary\" class=\"form-control\">' + optionsHtml + '</select>' +\n            '</div>' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Pilih Outlet Duplikat yang Akan Digabung</label>' +\n              '<div style=\"max-height:180px;overflow-y:auto;border:1px solid var(--border-color);border-radius:8px;padding:8px 12px;\">' + checkHtml + '</div>' +\n            '</div>' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Alasan Penggabungan (Wajib)</label>' +\n              '<input type=\"text\" id=\"mg-reason\" class=\"form-control\" placeholder=\"Contoh: Penulisan nama duplikat\" required>' +\n            '</div>' +\n            '<div class=\"modal-footer\">' +\n              '<button type=\"button\" class=\"btn btn-secondary\" id=\"mg-cancel\">Batal</button>' +\n              '<button type=\"submit\" class=\"btn btn-primary\" id=\"mg-save\">Gabungkan Outlet</button>' +\n            '</div>' +\n          '</form>';\n\n        var close = window.TM_APP.openModal('Gabungkan Outlet Ganda', html);\n        document.getElementById('mg-cancel').addEventListener('click', close);\n        document.getElementById('mg-form').addEventListener('submit', function (e) {\n          e.preventDefault();\n          var primaryId = document.getElementById('mg-primary').value;\n          var dupIds = Array.prototype.slice.call(document.querySelectorAll('.merge-dup-cb:checked')).map(function (cb) {\n            return cb.value;\n          });\n          var btn = document.getElementById('mg-save');\n          btn.disabled = true;\n          window.TM_API.callRpc('api_mergeOutlets', window.TM_API.getToken(), primaryId, dupIds, document.getElementById('mg-reason').value)\n            .then(function () {\n              window.TM_APP.showToast('Merge Outlet berhasil.', 'success');\n              close();\n              loadOutlets();\n            })\n            .catch(function (err) {\n              document.getElementById('mg-alert').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n              btn.disabled = false;\n            });\n        });\n      }\n\n      function openUnmergeModal(item) {\n        var html =\n          '<p>Batalkan merge untuk <strong>' + esc(item.CanonicalName) + ' (' + esc(item.OutletCode) + ')</strong> dari Outlet utama <strong>' + esc(item.MergedIntoName) + '</strong>?</p>' +\n          '<div id=\"umg-alert\"></div>' +\n          '<form id=\"umg-form\">' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Alasan Pembatalan Merge (Wajib)</label>' +\n              '<input type=\"text\" id=\"umg-reason\" class=\"form-control\" required>' +\n            '</div>' +\n            '<div class=\"modal-footer\">' +\n              '<button type=\"button\" class=\"btn btn-secondary\" id=\"umg-cancel\">Batal</button>' +\n              '<button type=\"submit\" class=\"btn btn-danger\" id=\"umg-save\">Batalkan Merge</button>' +\n            '</div>' +\n          '</form>';\n        var close = window.TM_APP.openModal('Batalkan Merge Outlet', html);\n        document.getElementById('umg-cancel').addEventListener('click', close);\n        document.getElementById('umg-form').addEventListener('submit', function (e) {\n          e.preventDefault();\n          var btn = document.getElementById('umg-save');\n          btn.disabled = true;\n          window.TM_API.callRpc('api_unmergeOutlet', window.TM_API.getToken(), item.OutletID, document.getElementById('umg-reason').value)\n            .then(function () {\n              window.TM_APP.showToast('Merge berhasil dibatalkan.', 'success');\n              close();\n              loadOutlets();\n            })\n            .catch(function (err) {\n              document.getElementById('umg-alert').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n              btn.disabled = false;\n            });\n        });\n      }\n\n      document.getElementById('outlet-tabs').querySelectorAll('.tab-btn').forEach(function (tabBtn) {\n        tabBtn.addEventListener('click', function () {\n          activeTab = tabBtn.getAttribute('data-otab');\n          document.getElementById('outlet-tabs').querySelectorAll('.tab-btn').forEach(function (b) {\n            b.classList.toggle('active', b.getAttribute('data-otab') === activeTab);\n          });\n          drawOutlets();\n        });\n      });\n\n      document.getElementById('btn-new-outlet').addEventListener('click', openCreateOutletModal);\n      document.getElementById('btn-merge-outlets').addEventListener('click', openMergeModal);\n      document.getElementById('outlet-search').addEventListener('input', drawOutlets);\n      document.getElementById('outlet-status-filter').addEventListener('change', drawOutlets);\n\n      loadOutlets();\n    }\n\n    return {\n      renderMasterDataView: renderMasterDataView,\n      renderOutletsView: renderOutletsView\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_VIEWS_INPUT = (function () {\n    function esc(s) {\n      return window.TM_APP.escapeHtml(s);\n    }\n\n    function todayWibStr() {\n      var now = new Date();\n      var utcMs = now.getTime() + now.getTimezoneOffset() * 60000;\n      var wib = new Date(utcMs + 7 * 3600000);\n      return wib.toISOString().slice(0, 10);\n    }\n\n    var CLIENT_MONTH_MAP = {\n      jan: 1, januari: 1, january: 1,\n      feb: 2, februari: 2, february: 2,\n      mar: 3, maret: 3, march: 3,\n      apr: 4, april: 4,\n      mei: 5, may: 5,\n      jun: 6, juni: 6, june: 6,\n      jul: 7, juli: 7, july: 7,\n      agu: 8, agt: 8, ags: 8, agustus: 8, aug: 8, august: 8,\n      sep: 9, sept: 9, september: 9,\n      okt: 10, oct: 10, oktober: 10, october: 10,\n      nov: 11, nop: 11, november: 11, nopember: 11,\n      des: 12, dec: 12, desember: 12, december: 12\n    };\n\n    var SHORT_MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];\n\n    function normalizeDateInput(val) {\n      if (!val) return '';\n      var s = String(val).trim();\n      if (!s) return '';\n      var pad = function (n) { return String(n).padStart(2, '0'); };\n\n      // 1. YYYY-MM-DD atau YYYY/MM/DD\n      var mYmd = s.match(/^(\\d{4})[\\/\\-.\\s](\\d{1,2})[\\/\\-.\\s](\\d{1,2})$/);\n      if (mYmd) {\n        return mYmd[1] + '-' + pad(parseInt(mYmd[2], 10)) + '-' + pad(parseInt(mYmd[3], 10));\n      }\n\n      // 2. DD/MM/YYYY atau DD-MM-YYYY (06/11/2026)\n      var mDmy = s.match(/^(\\d{1,2})[\\/\\-.\\s](\\d{1,2})[\\/\\-.\\s](\\d{4})$/);\n      if (mDmy) {\n        var d = parseInt(mDmy[1], 10);\n        var mo = parseInt(mDmy[2], 10);\n        var y = parseInt(mDmy[3], 10);\n        if (mo > 12 && d >= 1 && d <= 12) {\n          var tmp = d; d = mo; mo = tmp;\n        }\n        return y + '-' + pad(mo) + '-' + pad(d);\n      }\n\n      // 3. D MMM YYYY / DD MMMM YYYY (6 Nov 2026)\n      var mText = s.match(/^(\\d{1,2})[\\s\\/\\-.,]+([A-Za-z]+)[\\s\\/\\-.,]+(\\d{4})$/);\n      if (mText) {\n        var d3 = parseInt(mText[1], 10);\n        var mo3 = CLIENT_MONTH_MAP[mText[2].toLowerCase()] || 0;\n        var y3 = parseInt(mText[3], 10);\n        if (mo3 >= 1 && mo3 <= 12) {\n          return y3 + '-' + pad(mo3) + '-' + pad(d3);\n        }\n      }\n\n      // 4. ISO atau Date string dari Google Sheets\n      var parsed = new Date(s);\n      if (!isNaN(parsed.getTime())) {\n        var utcMs = parsed.getTime() + parsed.getTimezoneOffset() * 60000;\n        var wib = new Date(utcMs + 7 * 3600000);\n        return wib.toISOString().slice(0, 10);\n      }\n      return s;\n    }\n\n    function formatCalendarDisplay(val) {\n      var ymd = normalizeDateInput(val);\n      var m = ymd.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);\n      if (!m) return val || '-';\n      var dNum = parseInt(m[3], 10);\n      var mIdx = parseInt(m[2], 10) - 1;\n      var mName = SHORT_MONTHS_ID[mIdx] || m[2];\n      return m[3] + '/' + m[2] + '/' + m[1] + ' (' + dNum + ' ' + mName + ' ' + m[1] + ')';\n    }\n\n    function formatRelativeAge(isoStr) {\n      if (!isoStr) return '-';\n      var diffMs = Math.max(0, Date.now() - new Date(isoStr).getTime());\n      var mins = Math.floor(diffMs / 60000);\n      if (mins < 60) return mins + ' mnt lalu';\n      var hrs = Math.floor(mins / 60);\n      if (hrs < 24) return hrs + ' jam lalu';\n      return Math.floor(hrs / 24) + ' hari lalu';\n    }\n\n    function makeClientUuid(prefix) {\n      return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();\n    }\n\n    /* ==================== HALAMAN INPUT & DRAFT SAYA (TRAINER) ==================== */\n    function renderInputView(container) {\n      var master = null;\n      var draftsInfo = { drafts: [], activeCount: 0, maxActiveDrafts: 5 };\n      var deletedDrafts = [];\n      var activeSession = null; // null = list/start, object = editing draft\n      var findings = []; // local UI state tied to activeSession\n      var uploadQueue = [];\n      var uploading = false;\n\n      container.innerHTML =\n        '<div id=\"inp-sync-panel\"></div>' +\n        '<div id=\"inp-drafts-panel\"></div>' +\n        '<div id=\"inp-deleted-drafts-panel\"></div>' +\n        '<div id=\"inp-editor-panel\"></div>';\n\n      function refreshSyncPanel() {\n        var sPanel = document.getElementById('inp-sync-panel');\n        if (sPanel && window.TM_SYNC) {\n          window.TM_SYNC.renderSyncStatusPanel(sPanel, loadInitial);\n        }\n      }\n\n      function loadInitial() {\n        refreshSyncPanel();\n        if (navigator.onLine === false) {\n          Promise.all([\n            window.TM_IDB.get('masterCache', 'active_bundle'),\n            window.TM_IDB.getAll('drafts')\n          ]).then(function (offlineRes) {\n            master = (offlineRes[0] && offlineRes[0].bundle) || { active: { ams: [], mums: [], categories: [], sections: [] } };\n            var localDrafts = (offlineRes[1] || []).filter(function (d) { return d.syncState !== 'DELETED_LOCKED'; });\n            draftsInfo = {\n              drafts: localDrafts.map(function (d) {\n                return {\n                  SessionID: d.sessionId,\n                  InspectionDate: d.header && d.header.inspectionDate,\n                  OutletNameSnapshot: d.header && d.header.outletName,\n                  FindingCount: (d.findings || []).length,\n                  CreatedAt: d.updatedAtClient,\n                  UpdatedAt: d.updatedAtClient\n                };\n              }),\n              activeCount: localDrafts.length,\n              maxActiveDrafts: 5\n            };\n            deletedDrafts = [];\n            renderDraftsPanel();\n            renderDeletedDraftsPanel();\n            if (!activeSession) {\n              renderStartPrompt();\n            }\n          });\n          return;\n        }\n\n        Promise.all([\n          window.TM_API.callRpc('api_getMasterBundle', window.TM_API.getToken()),\n          window.TM_API.callRpc('api_listMyDrafts', window.TM_API.getToken()),\n          window.TM_API.callRpc('api_listMyDeletedDrafts', window.TM_API.getToken())\n        ]).then(function (res) {\n          master = res[0];\n          draftsInfo = res[1];\n          deletedDrafts = res[2] || [];\n          window.TM_IDB.put('masterCache', { key: 'active_bundle', bundle: master, savedAt: new Date().toISOString() });\n          renderDraftsPanel();\n          renderDeletedDraftsPanel();\n          if (!activeSession) {\n            renderStartPrompt();\n          }\n        }).catch(function (err) {\n          container.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n        });\n      }\n\n      function renderDraftsPanel() {\n        var box = document.getElementById('inp-drafts-panel');\n        if (!box) return;\n        var drafts = draftsInfo.drafts || [];\n        var limit = draftsInfo.maxActiveDrafts || 5;\n        var atLimit = draftsInfo.activeCount >= limit;\n\n        var listHtml = drafts.length === 0\n          ? '<p class=\"form-hint\" style=\"margin:0;\">Belum ada Draft aktif.</p>'\n          : drafts.map(function (d) {\n              var restored = d.IsRestoredFlagUntil && new Date(d.IsRestoredFlagUntil).getTime() > Date.now();\n              return (\n                '<div class=\"mobile-item-card\" style=\"display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;\">' +\n                  '<div>' +\n                    '<strong>' + esc(d.OutletNameSnapshot || 'Outlet belum diisi') + '</strong> ' +\n                    (restored ? '<span class=\"badge badge-warning\">Dipulihkan</span> ' : '') +\n                    '<span class=\"badge badge-neutral\">' + d.FindingCount + ' temuan</span>' +\n                    '<div class=\"form-hint\">Tanggal: ' + esc(d.InspectionDate) + ' • Umur: ' + esc(formatRelativeAge(d.CreatedAt)) + ' • Diperbarui: ' + esc(formatRelativeAge(d.UpdatedAt)) + '</div>' +\n                  '</div>' +\n                  '<div style=\"display:flex;gap:8px;\">' +\n                    '<button class=\"btn btn-sm btn-primary\" data-dact=\"open\" data-id=\"' + esc(d.SessionID) + '\">Lanjutkan</button>' +\n                    '<button class=\"btn btn-sm btn-danger\" data-dact=\"del\" data-id=\"' + esc(d.SessionID) + '\">Hapus</button>' +\n                  '</div>' +\n                '</div>'\n              );\n            }).join('');\n\n        box.innerHTML =\n          '<div class=\"card\">' +\n            '<div class=\"card-header\">' +\n              '<div>' +\n                '<h2 class=\"card-title\">Draft Saya (' + draftsInfo.activeCount + ' / ' + limit + ')</h2>' +\n                (atLimit ? '<p class=\"form-hint\" style=\"color:var(--warning);margin:4px 0 0;\">Batas Draft aktif tercapai. Selesaikan atau hapus Draft untuk membuat sesi baru.</p>' : '') +\n              '</div>' +\n              '<button id=\"btn-new-session\" class=\"btn btn-primary\" ' + (atLimit ? 'disabled' : '') + '>+ Pemeriksaan Baru</button>' +\n            '</div>' +\n            '<div style=\"display:flex;flex-direction:column;gap:8px;\">' + listHtml + '</div>' +\n          '</div>';\n\n        document.getElementById('btn-new-session').addEventListener('click', startNewDraft);\n        box.querySelectorAll('button[data-dact]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var id = btn.getAttribute('data-id');\n            if (btn.getAttribute('data-dact') === 'open') openExistingDraft(id);\n            if (btn.getAttribute('data-dact') === 'del') confirmDeleteDraft(id);\n          });\n        });\n      }\n\n      function renderDeletedDraftsPanel() {\n        var box = document.getElementById('inp-deleted-drafts-panel');\n        if (!box) return;\n        if (!deletedDrafts || deletedDrafts.length === 0) {\n          box.innerHTML = '';\n          return;\n        }\n        var itemsHtml = deletedDrafts.map(function (d) {\n          var req = d.RestoreRequest;\n          var statusLabel = req\n            ? ('Permintaan Pemulihan: ' + req.Status + (req.DecisionReason ? ' (' + req.DecisionReason + ')' : ''))\n            : 'Draft Dihapus — Menunggu Pemulihan';\n          return (\n            '<div class=\"mobile-item-card\" style=\"border-color:rgba(244,63,94,0.45);\">' +\n              '<div class=\"mobile-item-row\">' +\n                '<div><strong>' + esc(d.OutletNameSnapshot || 'Outlet belum diisi') + '</strong> <code>' + esc(d.SessionID) + '</code>' +\n                '<div class=\"form-hint\">Dihapus oleh ' + esc(d.DeletedByName) + ' pada ' + esc(d.DeletedAt) + ' • Alasan: ' + esc(d.DeleteReason) + '</div></div>' +\n                '<span class=\"badge badge-danger\">' + esc(statusLabel) + '</span>' +\n              '</div>' +\n              (d.CanRequestRestore\n                ? '<div class=\"mobile-item-actions\"><button class=\"btn btn-sm btn-primary\" data-reqrestore=\"' + esc(d.SessionID) + '\">Ajukan Pemulihan (≤ 7×24 Jam)</button></div>'\n                : '') +\n            '</div>'\n          );\n        }).join('');\n\n        box.innerHTML =\n          '<div class=\"card\">' +\n            '<div class=\"card-header\"><h3 class=\"card-title\">Draft Dihapus oleh Super Admin</h3></div>' +\n            '<div style=\"display:flex;flex-direction:column;gap:8px;\">' + itemsHtml + '</div>' +\n          '</div>';\n\n        box.querySelectorAll('button[data-reqrestore]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var sid = btn.getAttribute('data-reqrestore');\n            window.TM_APP.promptDialog({\n              variant: 'info',\n              icon: '↺',\n              title: 'Ajukan Pemulihan Draft',\n              message: 'Permintaan akan dikirim ke Super Admin untuk ditinjau.',\n              inputLabel: 'Alasan pengajuan (wajib)',\n              placeholder: 'Contoh: Draft terhapus padahal pemeriksaan belum selesai',\n              requiredMessage: 'Alasan pengajuan wajib diisi.',\n              confirmText: 'Kirim Pengajuan'\n            }).then(function (reason) {\n              if (!reason) return;\n              window.TM_API.callRpc('api_requestDraftRestore', window.TM_API.getToken(), sid, reason)\n                .then(function () {\n                  window.TM_APP.showToast('Permintaan pemulihan berhasil dikirim ke Super Admin.', 'success');\n                  loadInitial();\n                })\n                .catch(function (err) {\n                  window.TM_APP.showToast(err.message, 'error');\n                });\n            });\n          });\n        });\n      }\n\n      function renderStartPrompt() {\n        var box = document.getElementById('inp-editor-panel');\n        if (!box) return;\n        box.innerHTML =\n          '<div class=\"card\">' +\n            '<p class=\"form-hint\" style=\"margin:0;\">Pilih <strong>+ Pemeriksaan Baru</strong> atau lanjutkan salah satu Draft di atas untuk mulai mencatat temuan operasional outlet.</p>' +\n          '</div>';\n      }\n\n      function startNewDraft() {\n        activeSession = {\n          SessionID: '',\n          InspectionDate: todayWibStr(),\n          OutletID: '',\n          OutletNameSnapshot: '',\n          AM_ID: '',\n          MUM_ID: '',\n          PIC_Name: '',\n          Status: 'Draft'\n        };\n        findings = [];\n        renderEditor();\n      }\n\n      function openExistingDraft(sessionId) {\n        window.TM_API.callRpc('api_getSessionDetail', window.TM_API.getToken(), sessionId)\n          .then(function (res) {\n            activeSession = res.session;\n            findings = (res.findings || []).map(function (f) {\n              return {\n                FindingID: f.FindingID,\n                CategoryID: f.CategoryID,\n                SectionID: f.SectionID,\n                Masalah: f.Masalah,\n                Mengapa: f.Mengapa,\n                Solusi: f.Solusi,\n                Photos: (f.Photos || []).map(function (ph) {\n                  return Object.assign({}, ph, { uploadStatus: 'Berhasil' });\n                }),\n                dirty: false\n              };\n            });\n            renderEditor();\n          })\n          .catch(function (err) {\n            window.TM_APP.showToast(err.message, 'error');\n          });\n      }\n\n      function confirmDeleteDraft(sessionId) {\n        window.TM_APP.confirmDialog({\n          variant: 'danger',\n          title: 'Hapus Draft?',\n          message: 'Draft pemeriksaan ini akan dihapus dari daftar Draft aktif Anda.',\n          note: 'Temuan dan foto di dalam Draft ini ikut terhapus.',\n          confirmText: 'Ya, Hapus Draft'\n        }).then(function (ok) {\n          if (!ok) return;\n          window.TM_API.callRpc('api_deleteMyDraft', window.TM_API.getToken(), sessionId)\n            .then(function () {\n              window.TM_APP.showToast('Draft dihapus.', 'success');\n              if (activeSession && activeSession.SessionID === sessionId) {\n                activeSession = null;\n                findings = [];\n              }\n              loadInitial();\n            })\n            .catch(function (err) {\n              window.TM_APP.showToast(err.message, 'error');\n            });\n        });\n      }\n\n      function saveSessionHeaderToServer() {\n        var dateInputEl = document.getElementById('ses-date');\n        var rawDateVal = dateInputEl ? dateInputEl.value : (activeSession.InspectionDate || todayWibStr());\n        var normalizedDate = normalizeDateInput(rawDateVal) || todayWibStr();\n        var dto = {\n          sessionId: activeSession.SessionID || '',\n          inspectionDate: normalizedDate,\n          outletId: activeSession.OutletID || '',\n          outletName: document.getElementById('ses-outlet').value,\n          amId: document.getElementById('ses-am').value,\n          mumId: document.getElementById('ses-mum').value,\n          picName: document.getElementById('ses-pic').value\n        };\n        return window.TM_API.callRpc('api_saveDraft', window.TM_API.getToken(), dto)\n          .then(function (saved) {\n            activeSession = saved;\n            activeSession.InspectionDate = normalizeDateInput(saved.InspectionDate) || normalizedDate;\n            return activeSession;\n          });\n      }\n\n      function processUploadQueue() {\n        if (uploading || uploadQueue.length === 0) return;\n        uploading = true;\n        var job = uploadQueue.shift();\n        job.photoRef.uploadStatus = 'Mengunggah';\n        drawFindingsList();\n\n        function attemptUpload(retriesLeft) {\n          return window.TM_API.callRpc('api_uploadPhoto', window.TM_API.getToken(), {\n            sessionId: activeSession.SessionID,\n            findingId: job.findingId,\n            fileName: job.photoRef.FileName,\n            mimeType: job.photoRef.MimeType,\n            base64Data: job.photoRef.base64Data,\n            comment: job.photoRef.PhotoComment || '',\n            idempotencyKey: job.photoRef.idempotencyKey\n          }).catch(function (err) {\n            if (retriesLeft > 0 && (err.code === 'ERR_TRANSPORT' || err.code === 'ERR_LOCK_TIMEOUT')) {\n              return attemptUpload(retriesLeft - 1);\n            }\n            throw err;\n          });\n        }\n\n        attemptUpload(2).then(function (savedPhoto) {\n          Object.assign(job.photoRef, savedPhoto, { uploadStatus: 'Berhasil', errorMessage: '' });\n          drawFindingsList();\n        }).catch(function (err) {\n          job.photoRef.uploadStatus = 'Gagal';\n          job.photoRef.errorMessage = err.message;\n          drawFindingsList();\n          window.TM_APP.showToast('Upload foto gagal: ' + err.message, 'error');\n        }).finally(function () {\n          uploading = false;\n          processUploadQueue();\n        });\n      }\n\n      function ensureDraftAndFindingSaved(fIndex) {\n        var f = findings[fIndex];\n        var chain = activeSession.SessionID ? Promise.resolve(activeSession) : saveSessionHeaderToServer();\n        return chain.then(function (ses) {\n          return window.TM_API.callRpc('api_saveFindingDraft', window.TM_API.getToken(), ses.SessionID, {\n            findingId: f.FindingID || '',\n            categoryId: f.CategoryID,\n            sectionId: f.SectionID,\n            masalah: f.Masalah,\n            mengapa: f.Mengapa,\n            solusi: f.Solusi\n          }).then(function (savedF) {\n            f.FindingID = savedF.FindingID;\n            f.dirty = false;\n            return savedF;\n          });\n        });\n      }\n\n      function renderEditor() {\n        var box = document.getElementById('inp-editor-panel');\n        if (!box || !activeSession) return;\n        var amOpts = '<option value=\"\">-- Pilih AM --</option>' + master.active.ams.map(function (a) {\n          return '<option value=\"' + esc(a.AM_ID) + '\"' + (activeSession.AM_ID === a.AM_ID ? ' selected' : '') + '>' + esc(a.AM_Name) + '</option>';\n        }).join('');\n        var mumOpts = '<option value=\"\">-- Pilih MUM --</option>' + master.active.mums.map(function (m) {\n          return '<option value=\"' + esc(m.MUM_ID) + '\"' + (activeSession.MUM_ID === m.MUM_ID ? ' selected' : '') + '>' + esc(m.MUM_Name) + '</option>';\n        }).join('');\n\n        box.innerHTML =\n          '<div class=\"card\">' +\n            '<div class=\"card-header\">' +\n              '<h2 class=\"card-title\">' + (activeSession.SessionID ? 'Lanjutkan Pemeriksaan' : 'Sesi Pemeriksaan Baru') + '</h2>' +\n              '<span class=\"badge badge-warning\">Draft</span>' +\n            '</div>' +\n            (activeSession.IsRestoredFlagUntil && new Date(activeSession.IsRestoredFlagUntil).getTime() > Date.now()\n              ? '<div class=\"alert alert-warning\"><strong>Draft Dipulihkan:</strong> Harap periksa kembali kelengkapan seluruh field dan foto bukti sebelum melanjutkan atau memfinalisasi sesi.</div>'\n              : '') +\n            '<div id=\"ses-alert\"></div>' +\n            '<div class=\"grid-2\">' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Tanggal Pemeriksaan *</label>' +\n                '<input type=\"date\" id=\"ses-date\" class=\"form-control\" max=\"' + todayWibStr() + '\" value=\"' + esc(normalizeDateInput(activeSession.InspectionDate) || todayWibStr()) + '\">' +\n                '<div class=\"form-hint\" id=\"ses-date-preview\">' + esc(formatCalendarDisplay(activeSession.InspectionDate || todayWibStr())) + '</div>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Outlet *</label>' +\n                '<input type=\"text\" id=\"ses-outlet\" class=\"form-control\" placeholder=\"Ketik nama Outlet...\" value=\"' + esc(activeSession.OutletNameSnapshot || '') + '\">' +\n                '<div id=\"ses-outlet-sugs\"></div>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">AM (Area Manager) *</label>' +\n                '<select id=\"ses-am\" class=\"form-control\">' + amOpts + '</select>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">MUM *</label>' +\n                '<select id=\"ses-mum\" class=\"form-control\">' + mumOpts + '</select>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">PIC Outlet *</label>' +\n                '<input type=\"text\" id=\"ses-pic\" class=\"form-control\" placeholder=\"Nama PIC di lokasi\" value=\"' + esc(activeSession.PIC_Name || '') + '\">' +\n              '</div>' +\n            '</div>' +\n            '<hr style=\"border:none;border-top:1px solid var(--border-color);margin:14px 0;\">' +\n            '<div class=\"card-header\">' +\n              '<h3 class=\"card-title\">Daftar Temuan (<span id=\"fnd-count\">' + findings.length + '</span>)</h3>' +\n              '<button type=\"button\" id=\"btn-add-finding\" class=\"btn btn-secondary\">+ Tambah Temuan</button>' +\n            '</div>' +\n            '<div id=\"findings-list-box\"></div>' +\n            '<div style=\"display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:16px;\">' +\n              '<button type=\"button\" id=\"btn-save-draft\" class=\"btn btn-secondary\">Simpan Draft</button>' +\n              '<button type=\"button\" id=\"btn-finalize-session\" class=\"btn btn-primary\">Finalisasi Pemeriksaan</button>' +\n            '</div>' +\n          '</div>';\n\n        // Update date preview when calendar changes\n        var dateEl = document.getElementById('ses-date');\n        if (dateEl) {\n          dateEl.addEventListener('change', function () {\n            var prev = document.getElementById('ses-date-preview');\n            if (prev) prev.textContent = formatCalendarDisplay(dateEl.value);\n            activeSession.InspectionDate = normalizeDateInput(dateEl.value) || todayWibStr();\n          });\n        }\n\n        // Outlet autocomplete & duplicate detection\n        var outletInput = document.getElementById('ses-outlet');\n        var sugTimer = null;\n        outletInput.addEventListener('input', function () {\n          activeSession.OutletID = '';\n          clearTimeout(sugTimer);\n          var val = outletInput.value;\n          if (!val || val.trim().length < 2) {\n            document.getElementById('ses-outlet-sugs').innerHTML = '';\n            return;\n          }\n          sugTimer = setTimeout(function () {\n            window.TM_API.callRpc('api_suggestOutlets', window.TM_API.getToken(), val)\n              .then(function (sugs) {\n                var sBox = document.getElementById('ses-outlet-sugs');\n                if (!sBox || !sugs || sugs.length === 0) {\n                  if (sBox) sBox.innerHTML = '';\n                  return;\n                }\n                sBox.innerHTML = '<div class=\"suggestion-box\">' + sugs.slice(0, 5).map(function (s) {\n                  return '<button type=\"button\" class=\"suggestion-item\" data-oid=\"' + esc(s.OutletID) + '\" data-oname=\"' + esc(s.CanonicalName) + '\">' +\n                    '<span><strong>' + esc(s.CanonicalName) + '</strong> <span class=\"form-hint\">(' + esc(s.OutletCode) + ')</span></span>' +\n                    '<span class=\"badge badge-primary\">' + Math.round(s.score * 100) + '%</span>' +\n                  '</button>';\n                }).join('') + '</div>';\n\n                sBox.querySelectorAll('.suggestion-item').forEach(function (btn) {\n                  btn.addEventListener('click', function () {\n                    activeSession.OutletID = btn.getAttribute('data-oid');\n                    activeSession.OutletNameSnapshot = btn.getAttribute('data-oname');\n                    outletInput.value = activeSession.OutletNameSnapshot;\n                    sBox.innerHTML = '';\n                  });\n                });\n              }).catch(function () {});\n          }, 250);\n        });\n\n        document.getElementById('btn-add-finding').addEventListener('click', function () {\n          findings.push({\n            FindingID: '',\n            CategoryID: '',\n            SectionID: '',\n            Masalah: '',\n            Mengapa: '',\n            Solusi: '',\n            Photos: [],\n            dirty: true\n          });\n          drawFindingsList();\n        });\n\n        document.getElementById('btn-save-draft').addEventListener('click', function () {\n          handleSaveAll(false);\n        });\n        document.getElementById('btn-finalize-session').addEventListener('click', function () {\n          handleSaveAll(true);\n        });\n\n        drawFindingsList();\n      }\n\n      function drawFindingsList() {\n        var box = document.getElementById('findings-list-box');\n        var cnt = document.getElementById('fnd-count');\n        if (cnt) cnt.textContent = String(findings.length);\n        if (!box) return;\n\n        if (findings.length === 0) {\n          box.innerHTML = '<p class=\"form-hint\">Belum ada temuan ditambahkan. Klik <strong>+ Tambah Temuan</strong> atau finalisasi jika tidak ada temuan.</p>';\n          return;\n        }\n\n        var catOptsBase = master.active.categories;\n        var secOptsBase = master.active.sections;\n\n        box.innerHTML = findings.map(function (f, idx) {\n          var catOptions = '<option value=\"\">-- Pilih Category --</option>' + catOptsBase.map(function (c) {\n            return '<option value=\"' + esc(c.CategoryID) + '\"' + (f.CategoryID === c.CategoryID ? ' selected' : '') + '>' + esc(c.CategoryName) + '</option>';\n          }).join('');\n          var secOptions = '<option value=\"\">-- Pilih Section --</option>' + secOptsBase.map(function (s) {\n            return '<option value=\"' + esc(s.SectionID) + '\"' + (f.SectionID === s.SectionID ? ' selected' : '') + '>' + esc(s.SectionName) + '</option>';\n          }).join('');\n\n          var photosHtml = (f.Photos || []).map(function (ph, pIdx) {\n            var stBadge = ph.uploadStatus === 'Berhasil'\n              ? '<span class=\"badge badge-success\">Berhasil</span>'\n              : (ph.uploadStatus === 'Mengunggah'\n                ? '<span class=\"badge badge-primary\">Mengunggah...</span>'\n                : (ph.uploadStatus === 'Gagal'\n                  ? '<span class=\"badge badge-danger\">Gagal</span>'\n                  : '<span class=\"badge badge-neutral\">Menunggu</span>'));\n\n            var thumbSrc = ph.base64Data || ph.dataUrl || '';\n            return (\n              '<div class=\"photo-card\">' +\n                (thumbSrc\n                  ? '<img class=\"photo-thumb\" src=\"' + esc(thumbSrc) + '\" data-lb=\"' + idx + ':' + pIdx + '\">'\n                  : '<div class=\"photo-thumb\" style=\"display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-secondary);\" data-lb=\"' + idx + ':' + pIdx + '\">Lihat Foto</div>') +\n                '<div>' + stBadge + '</div>' +\n                '<input type=\"text\" class=\"form-control\" style=\"min-height:34px;font-size:12px;padding:4px 8px;\" placeholder=\"Komentar (opsional)\" value=\"' + esc(ph.PhotoComment || '') + '\" data-pcomment=\"' + idx + ':' + pIdx + '\">' +\n                '<div style=\"display:flex;gap:4px;flex-wrap:wrap;\">' +\n                  (ph.uploadStatus === 'Gagal' ? '<button type=\"button\" class=\"btn btn-sm btn-primary\" data-pretry=\"' + idx + ':' + pIdx + '\">Coba Lagi</button>' : '') +\n                  '<button type=\"button\" class=\"btn btn-sm btn-danger\" data-pdel=\"' + idx + ':' + pIdx + '\">Hapus</button>' +\n                '</div>' +\n              '</div>'\n            );\n          }).join('');\n\n          return (\n            '<div class=\"card\" style=\"background:var(--bg-app);\">' +\n              '<div class=\"card-header\">' +\n                '<strong>Temuan #' + (idx + 1) + '</strong>' +\n                '<button type=\"button\" class=\"btn btn-sm btn-danger\" data-fdel=\"' + idx + '\">Hapus Temuan</button>' +\n              '</div>' +\n              '<div class=\"grid-2\">' +\n                '<div class=\"form-group\"><label class=\"form-label\">Master Category *</label><select class=\"form-control\" data-ffield=\"CategoryID\" data-fidx=\"' + idx + '\">' + catOptions + '</select></div>' +\n                '<div class=\"form-group\"><label class=\"form-label\">Section *</label><select class=\"form-control\" data-ffield=\"SectionID\" data-fidx=\"' + idx + '\">' + secOptions + '</select></div>' +\n              '</div>' +\n              '<div class=\"form-group\"><label class=\"form-label\">Masalah *</label><textarea class=\"form-control\" rows=\"2\" data-ffield=\"Masalah\" data-fidx=\"' + idx + '\">' + esc(f.Masalah) + '</textarea></div>' +\n              '<div class=\"form-group\"><label class=\"form-label\">Mengapa *</label><textarea class=\"form-control\" rows=\"2\" data-ffield=\"Mengapa\" data-fidx=\"' + idx + '\">' + esc(f.Mengapa) + '</textarea></div>' +\n              '<div class=\"form-group\"><label class=\"form-label\">Solusi (Opsional)</label><textarea class=\"form-control\" rows=\"2\" data-ffield=\"Solusi\" data-fidx=\"' + idx + '\">' + esc(f.Solusi) + '</textarea></div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Foto Bukti * (Min 1, Maks 5 • JPG/PNG • Kompresi otomatis ≤ 1 MB)</label>' +\n                ((f.Photos || []).length < 5\n                  ? '<input type=\"file\" accept=\"image/png,image/jpeg\" multiple data-fphoto=\"' + idx + '\">'\n                  : '<span class=\"form-hint\">Maksimal 5 foto tercapai.</span>') +\n                '<div class=\"photo-grid\">' + photosHtml + '</div>' +\n              '</div>' +\n            '</div>'\n          );\n        }).join('');\n\n        // Bind field edits\n        box.querySelectorAll('[data-ffield]').forEach(function (el) {\n          el.addEventListener('change', syncField);\n          el.addEventListener('input', syncField);\n          function syncField() {\n            var idx = parseInt(el.getAttribute('data-fidx'), 10);\n            var key = el.getAttribute('data-ffield');\n            findings[idx][key] = el.value;\n            findings[idx].dirty = true;\n          }\n        });\n\n        // Delete finding\n        box.querySelectorAll('[data-fdel]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var idx = parseInt(btn.getAttribute('data-fdel'), 10);\n            var target = findings[idx];\n            if (target.FindingID) {\n              window.TM_API.callRpc('api_deleteFindingInDraft', window.TM_API.getToken(), target.FindingID)\n                .then(function () {\n                  findings.splice(idx, 1);\n                  drawFindingsList();\n                }).catch(function (err) { window.TM_APP.showToast(err.message, 'error'); });\n            } else {\n              findings.splice(idx, 1);\n              drawFindingsList();\n            }\n          });\n        });\n\n        // Add photos\n        box.querySelectorAll('input[data-fphoto]').forEach(function (input) {\n          input.addEventListener('change', function () {\n            var idx = parseInt(input.getAttribute('data-fphoto'), 10);\n            var files = Array.prototype.slice.call(input.files || []);\n            var remainingSlots = 5 - (findings[idx].Photos || []).length;\n            if (files.length > remainingSlots) {\n              window.TM_APP.showToast('Maksimal 5 foto per temuan.', 'error');\n              files = files.slice(0, remainingSlots);\n            }\n            if (files.length === 0) return;\n\n            ensureDraftAndFindingSaved(idx).then(function (savedF) {\n              files.forEach(function (file) {\n                window.TM_PHOTO.compressImageFile(file).then(function (comp) {\n                  var pRef = {\n                    PhotoID: '',\n                    FileName: comp.fileName,\n                    MimeType: comp.mimeType,\n                    base64Data: comp.base64Data,\n                    PhotoComment: '',\n                    uploadStatus: 'Menunggu',\n                    idempotencyKey: makeClientUuid('PHTKEY')\n                  };\n                  findings[idx].Photos.push(pRef);\n                  uploadQueue.push({ findingId: savedF.FindingID, photoRef: pRef });\n                  drawFindingsList();\n                  processUploadQueue();\n                }).catch(function (err) {\n                  window.TM_APP.showToast(err.message, 'error');\n                });\n              });\n            }).catch(function (err) {\n              window.TM_APP.showToast(err.message, 'error');\n            });\n          });\n        });\n\n        // Photo comment update\n        box.querySelectorAll('input[data-pcomment]').forEach(function (inp) {\n          inp.addEventListener('change', function () {\n            var parts = inp.getAttribute('data-pcomment').split(':');\n            var ph = findings[parts[0]].Photos[parts[1]];\n            ph.PhotoComment = inp.value;\n            if (ph.PhotoID && ph.uploadStatus === 'Berhasil') {\n              window.TM_API.callRpc('api_updatePhotoComment', window.TM_API.getToken(), ph.PhotoID, ph.PhotoComment)\n                .catch(function () {});\n            }\n          });\n        });\n\n        // Retry photo\n        box.querySelectorAll('[data-pretry]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var parts = btn.getAttribute('data-pretry').split(':');\n            var fIdx = parseInt(parts[0], 10);\n            var pIdx = parseInt(parts[1], 10);\n            var ph = findings[fIdx].Photos[pIdx];\n            ph.uploadStatus = 'Menunggu';\n            uploadQueue.push({ findingId: findings[fIdx].FindingID, photoRef: ph });\n            drawFindingsList();\n            processUploadQueue();\n          });\n        });\n\n        // Delete photo\n        box.querySelectorAll('[data-pdel]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var parts = btn.getAttribute('data-pdel').split(':');\n            var fIdx = parseInt(parts[0], 10);\n            var pIdx = parseInt(parts[1], 10);\n            var ph = findings[fIdx].Photos[pIdx];\n            if (ph.PhotoID) {\n              window.TM_API.callRpc('api_deletePhoto', window.TM_API.getToken(), ph.PhotoID)\n                .then(function () {\n                  findings[fIdx].Photos.splice(pIdx, 1);\n                  drawFindingsList();\n                }).catch(function (err) { window.TM_APP.showToast(err.message, 'error'); });\n            } else {\n              findings[fIdx].Photos.splice(pIdx, 1);\n              drawFindingsList();\n            }\n          });\n        });\n\n        // Open lightbox\n        box.querySelectorAll('[data-lb]').forEach(function (el) {\n          el.addEventListener('click', function () {\n            var parts = el.getAttribute('data-lb').split(':');\n            var fIdx = parseInt(parts[0], 10);\n            var pIdx = parseInt(parts[1], 10);\n            window.TM_PHOTO.openLightboxGallery(findings[fIdx].Photos, pIdx);\n          });\n        });\n      }\n\n      function handleSaveAll(andFinalize) {\n        var alertEl = document.getElementById('ses-alert');\n        if (alertEl) alertEl.innerHTML = '';\n\n        if (andFinalize && (uploading || uploadQueue.length > 0)) {\n          window.TM_APP.showToast('Tunggu seluruh antrean upload foto selesai sebelum finalisasi.', 'error');\n          return;\n        }\n\n        saveSessionHeaderToServer().then(function (ses) {\n          var p = Promise.resolve();\n          findings.forEach(function (_, idx) {\n            p = p.then(function () {\n              return ensureDraftAndFindingSaved(idx);\n            });\n          });\n          return p.then(function () { return ses; });\n        }).then(function (ses) {\n          if (window.TM_IDB) {\n            window.TM_IDB.remove('drafts', ses.SessionID).then(refreshSyncPanel);\n          }\n          if (!andFinalize) {\n            window.TM_APP.showToast('Draft pemeriksaan tersimpan di server.', 'success');\n            loadInitial();\n            return;\n          }\n          return attemptFinalize(ses.SessionID, false);\n        }).catch(function (err) {\n          if (!andFinalize && window.TM_SYNC && (navigator.onLine === false || err.code === 'ERR_TRANSPORT')) {\n            var localSid = activeSession.SessionID || makeClientUuid('SES');\n            activeSession.SessionID = localSid;\n            window.TM_SYNC.saveDraftLocally({\n              sessionId: localSid,\n              expectedVersion: Number(activeSession.Version || 0),\n              header: {\n                sessionId: localSid,\n                inspectionDate: normalizeDateInput(document.getElementById('ses-date').value) || todayWibStr(),\n                outletId: activeSession.OutletID || '',\n                outletName: document.getElementById('ses-outlet').value,\n                amId: document.getElementById('ses-am').value,\n                mumId: document.getElementById('ses-mum').value,\n                picName: document.getElementById('ses-pic').value\n              },\n              findings: findings.map(function (f) {\n                return {\n                  findingId: f.FindingID || makeClientUuid('FND'),\n                  categoryId: f.CategoryID,\n                  sectionId: f.SectionID,\n                  masalah: f.Masalah,\n                  mengapa: f.Mengapa,\n                  solusi: f.Solusi\n                };\n              })\n            }).then(function () {\n              window.TM_APP.showToast('Disimpan secara lokal (Offline). Akan disinkronkan saat koneksi pulih.', 'success');\n              refreshSyncPanel();\n              loadInitial();\n            });\n            return;\n          }\n          if (alertEl) alertEl.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          else window.TM_APP.showToast(err.message, 'error');\n        });\n      }\n\n      function attemptFinalize(sessionId, confirmNoFindings) {\n        return window.TM_API.callRpc('api_finalizeSession', window.TM_API.getToken(), sessionId, confirmNoFindings)\n          .then(function (res) {\n            window.TM_APP.showToast('Pemeriksaan selesai! Nomor Laporan: ' + res.session.ReportNumber, 'success');\n            activeSession = null;\n            findings = [];\n            loadInitial();\n          })\n          .catch(function (err) {\n            if (err.code === 'ERR_CONFIRM_EMPTY_SESSION') {\n              return window.TM_APP.confirmDialog({\n                variant: 'warning',\n                icon: '📋',\n                title: 'Selesaikan Tanpa Temuan?',\n                message: err.message,\n                confirmText: 'Ya, Selesaikan',\n                cancelText: 'Kembali'\n              }).then(function (ok) {\n                if (ok) return attemptFinalize(sessionId, true);\n              });\n            }\n            var alertEl = document.getElementById('ses-alert');\n            if (alertEl) alertEl.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n            else window.TM_APP.showToast(err.message, 'error');\n          });\n      }\n\n      loadInitial();\n    }\n\n    /* ==================== RIWAYAT PEMERIKSAAN SELESAI ==================== */\n    function renderCompletedSessionsView(container) {\n      var user = window.TM_APP.getCurrentUser();\n      var master = null;\n\n      container.innerHTML =\n        '<div class=\"card\">' +\n          '<div class=\"card-header\"><h2 class=\"card-title\">Daftar Pemeriksaan Selesai</h2></div>' +\n          '<div id=\"comp-list\"><p class=\"form-hint\">Memuat riwayat pemeriksaan...</p></div>' +\n        '</div>' +\n        '<div id=\"comp-deleted-box\"></div>';\n\n      Promise.all([\n        window.TM_API.callRpc('api_getMasterBundle', window.TM_API.getToken()),\n        window.TM_API.callRpc('api_listCompletedSessions', window.TM_API.getToken(), 50),\n        user.Role === 'SUPER_ADMIN'\n          ? window.TM_API.callRpc('api_listDeletedCompletedSessions', window.TM_API.getToken())\n          : Promise.resolve([])\n      ]).then(function (res) {\n        master = res[0];\n        var sessions = res[1] || [];\n        var deletedSessions = res[2] || [];\n        var box = document.getElementById('comp-list');\n        var delBox = document.getElementById('comp-deleted-box');\n\n        if (user.Role === 'SUPER_ADMIN' && delBox && deletedSessions.length > 0) {\n          delBox.innerHTML =\n            '<div class=\"card\">' +\n              '<div class=\"card-header\"><h3 class=\"card-title\">Sesi Pemeriksaan Selesai yang Dihapus (Super Admin)</h3></div>' +\n              '<div style=\"display:flex;flex-direction:column;gap:8px;\">' +\n                deletedSessions.map(function (ds) {\n                  return (\n                    '<div class=\"mobile-item-card\">' +\n                      '<div class=\"mobile-item-row\">' +\n                        '<div><strong>' + esc(ds.OutletNameSnapshot) + '</strong> <code>' + esc(ds.ReportNumber) + '</code>' +\n                        '<div class=\"form-hint\">Tanggal: ' + esc(ds.InspectionDate) + ' • Dihapus: ' + esc(ds.DeletedAt) + ' oleh ' + esc(ds.DeletedByName) + ' • Alasan: ' + esc(ds.DeleteReason) + '</div></div>' +\n                        '<button class=\"btn btn-sm btn-primary\" data-srestore=\"' + esc(ds.SessionID) + '\">Pulihkan Sesi</button>' +\n                      '</div>' +\n                    '</div>'\n                  );\n                }).join('') +\n              '</div>' +\n            '</div>';\n\n          delBox.querySelectorAll('[data-srestore]').forEach(function (btn) {\n            btn.addEventListener('click', function () {\n              var sid = btn.getAttribute('data-srestore');\n              window.TM_API.callRpc('api_restoreSession', window.TM_API.getToken(), sid)\n                .then(function () {\n                  window.TM_APP.showToast('Sesi pemeriksaan berhasil dipulihkan.', 'success');\n                  renderCompletedSessionsView(container);\n                })\n                .catch(function (err) { window.TM_APP.showToast(err.message, 'error'); });\n            });\n          });\n        }\n        if (sessions.length === 0) {\n          box.innerHTML = '<p class=\"form-hint\">Belum ada pemeriksaan yang difinalisasi.</p>';\n          return;\n        }\n\n        var rows = sessions.map(function (s) {\n          return (\n            '<tr>' +\n              '<td><code>' + esc(s.ReportNumber) + '</code></td>' +\n              '<td>' + esc(s.InspectionDate) + '</td>' +\n              '<td><strong>' + esc(s.OutletNameSnapshot) + '</strong></td>' +\n              '<td>' + esc(s.TrainerName) + '</td>' +\n              '<td><span class=\"badge badge-primary\">' + s.FindingCount + ' temuan</span></td>' +\n              '<td>' +\n                '<button class=\"btn btn-sm btn-secondary\" data-sdetail=\"' + esc(s.SessionID) + '\">Detail</button> ' +\n                '<button class=\"btn btn-sm btn-primary\" data-spdf=\"' + esc(s.SessionID) + '\" data-strainer=\"' + esc(s.TrainerID) + '\">📄 PDF &amp; Email</button>' +\n                (user.Role === 'SUPER_ADMIN'\n                  ? ' <button class=\"btn btn-sm btn-danger\" data-sdel=\"' + esc(s.SessionID) + '\">Hapus</button>'\n                  : '') +\n              '</td>' +\n            '</tr>'\n          );\n        }).join('');\n\n        var cards = sessions.map(function (s) {\n          return (\n            '<div class=\"mobile-item-card\">' +\n              '<div class=\"mobile-item-row\">' +\n                '<div><strong>' + esc(s.OutletNameSnapshot) + '</strong><div class=\"form-hint\">' + esc(s.ReportNumber) + ' • ' + esc(s.InspectionDate) + '</div></div>' +\n                '<span class=\"badge badge-primary\">' + s.FindingCount + ' temuan</span>' +\n              '</div>' +\n              '<div class=\"form-hint\">Trainer: ' + esc(s.TrainerName) + ' • PIC: ' + esc(s.PIC_Name) + '</div>' +\n              '<div class=\"mobile-item-actions\">' +\n                '<button class=\"btn btn-sm btn-secondary\" data-sdetail=\"' + esc(s.SessionID) + '\">Detail</button>' +\n                '<button class=\"btn btn-sm btn-primary\" data-spdf=\"' + esc(s.SessionID) + '\" data-strainer=\"' + esc(s.TrainerID) + '\">📄 PDF &amp; Email</button>' +\n                (user.Role === 'SUPER_ADMIN' ? '<button class=\"btn btn-sm btn-danger\" data-sdel=\"' + esc(s.SessionID) + '\">Hapus</button>' : '') +\n              '</div>' +\n            '</div>'\n          );\n        }).join('');\n\n        box.innerHTML =\n          '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>No. Laporan</th><th>Tanggal</th><th>Outlet</th><th>Trainer</th><th>Temuan</th><th>Aksi</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +\n          '<div class=\"mobile-card-list\">' + cards + '</div>';\n\n        box.querySelectorAll('[data-sdetail]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            openSessionDetailModal(btn.getAttribute('data-sdetail'));\n          });\n        });\n\n        box.querySelectorAll('[data-spdf]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            if (window.TM_VIEWS_REPORTING) {\n              window.TM_VIEWS_REPORTING.openSessionPdfModal(\n                btn.getAttribute('data-spdf'),\n                btn.getAttribute('data-strainer')\n              );\n            }\n          });\n        });\n\n        box.querySelectorAll('[data-sdel]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var sid = btn.getAttribute('data-sdel');\n            window.TM_APP.promptDialog({\n              variant: 'danger',\n              title: 'Hapus Sesi Pemeriksaan?',\n              message: 'Sesi ini akan disembunyikan dari dashboard dan laporan. Super Admin masih dapat memulihkannya.',\n              inputLabel: 'Alasan penghapusan (wajib)',\n              placeholder: 'Contoh: Sesi diinput ganda',\n              requiredMessage: 'Alasan penghapusan wajib diisi.',\n              confirmText: 'Ya, Hapus Sesi'\n            }).then(function (reason) {\n              if (!reason) return;\n              window.TM_API.callRpc('api_deleteSession', window.TM_API.getToken(), sid, reason)\n                .then(function () {\n                  window.TM_APP.showToast('Sesi pemeriksaan berhasil dihapus.', 'success');\n                  renderCompletedSessionsView(container);\n                })\n                .catch(function (err) { window.TM_APP.showToast(err.message, 'error'); });\n            });\n          });\n        });\n      }).catch(function (err) {\n        document.getElementById('comp-list').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n      });\n\n      function openSessionDetailModal(sessionId) {\n        window.TM_API.callRpc('api_getSessionDetail', window.TM_API.getToken(), sessionId)\n          .then(function (res) {\n            var s = res.session;\n            var fList = res.findings || [];\n            var canTrainerEdit = user.Role === 'TRAINER' && s.TrainerID === user.UserID &&\n              (Date.now() - new Date(s.SubmittedAt).getTime()) <= 24 * 3600000;\n            var canEditAny = user.Role === 'SUPER_ADMIN' || canTrainerEdit;\n\n            var fHtml = fList.length === 0\n              ? '<p class=\"form-hint\">Sesi diselesaikan tanpa temuan.</p>'\n              : fList.map(function (f, i) {\n                  var isDeleted = Boolean(f.DeletedAt);\n                  var thumbs = (f.Photos || []).map(function (ph, pIdx) {\n                    return '<button type=\"button\" class=\"btn btn-sm btn-secondary\" data-viewphoto=\"' + i + ':' + pIdx + '\">📷 Foto ' + (pIdx + 1) + (ph.PhotoComment ? ' (' + esc(ph.PhotoComment) + ')' : '') + '</button>';\n                  }).join(' ');\n                  return (\n                    '<div class=\"card\" style=\"margin-bottom:10px;opacity:' + (isDeleted ? '0.6' : '1') + ';\">' +\n                      '<div class=\"card-header\">' +\n                        '<strong>#' + (i + 1) + ' ' + esc(f.CategoryNameSnapshot) + ' • ' + esc(f.SectionNameSnapshot) + '</strong>' +\n                        (isDeleted ? '<span class=\"badge badge-danger\">Dihapus</span>' : '') +\n                      '</div>' +\n                      '<div style=\"font-size:13px;\"><strong>Masalah:</strong> ' + esc(f.Masalah) + '</div>' +\n                      '<div style=\"font-size:13px;\"><strong>Mengapa:</strong> ' + esc(f.Mengapa) + '</div>' +\n                      (f.Solusi ? '<div style=\"font-size:13px;\"><strong>Solusi:</strong> ' + esc(f.Solusi) + '</div>' : '') +\n                      '<div style=\"margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;\">' + thumbs + '</div>' +\n                      '<div style=\"margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;\">' +\n                        (!isDeleted && canEditAny ? '<button class=\"btn btn-sm btn-secondary\" data-fedit=\"' + esc(f.FindingID) + '\">Edit Temuan</button>' : '') +\n                        (!isDeleted && canEditAny ? '<button class=\"btn btn-sm btn-danger\" data-fdel=\"' + esc(f.FindingID) + '\">Hapus Temuan</button>' : '') +\n                        (isDeleted && user.Role === 'SUPER_ADMIN' ? '<button class=\"btn btn-sm btn-primary\" data-frestore=\"' + esc(f.FindingID) + '\">Pulihkan</button>' : '') +\n                      '</div>' +\n                    '</div>'\n                  );\n                }).join('');\n\n            var html =\n              '<div style=\"font-size:13px;margin-bottom:12px;\">' +\n                '<div><strong>No. Laporan:</strong> ' + esc(s.ReportNumber) + '</div>' +\n                '<div><strong>Outlet:</strong> ' + esc(s.OutletNameSnapshot) + ' • <strong>Tanggal:</strong> ' + esc(s.InspectionDate) + '</div>' +\n                '<div><strong>Trainer:</strong> ' + esc(s.TrainerName) + ' • <strong>PIC:</strong> ' + esc(s.PIC_Name) + '</div>' +\n                '<div><strong>AM:</strong> ' + esc(s.AM_Name_Snapshot) + ' • <strong>MUM:</strong> ' + esc(s.MUM_Name_Snapshot) + '</div>' +\n              '</div>' +\n              fHtml;\n\n            var close = window.TM_APP.openModal('Detail Pemeriksaan', html);\n            var root = document.getElementById('modal-root');\n\n            root.querySelectorAll('[data-viewphoto]').forEach(function (btn) {\n              btn.addEventListener('click', function () {\n                var parts = btn.getAttribute('data-viewphoto').split(':');\n                window.TM_PHOTO.openLightboxGallery(fList[parts[0]].Photos, parseInt(parts[1], 10));\n              });\n            });\n\n            root.querySelectorAll('[data-fdel]').forEach(function (btn) {\n              btn.addEventListener('click', function () {\n                var fid = btn.getAttribute('data-fdel');\n                window.TM_APP.promptDialog({\n                  variant: 'danger',\n                  title: 'Hapus Temuan?',\n                  message: 'Temuan ini akan dihapus dari sesi pemeriksaan.',\n                  inputLabel: 'Alasan penghapusan (wajib)',\n                  placeholder: 'Contoh: Temuan salah input',\n                  requiredMessage: 'Alasan penghapusan wajib diisi.',\n                  confirmText: 'Ya, Hapus Temuan'\n                }).then(function (reason) {\n                  if (!reason) return;\n                  window.TM_API.callRpc('api_deleteFinding', window.TM_API.getToken(), fid, reason)\n                    .then(function () {\n                      window.TM_APP.showToast('Temuan dihapus.', 'success');\n                      close();\n                      renderCompletedSessionsView(container);\n                    }).catch(function (err) { window.TM_APP.showToast(err.message, 'error'); });\n                });\n              });\n            });\n\n            root.querySelectorAll('[data-frestore]').forEach(function (btn) {\n              btn.addEventListener('click', function () {\n                window.TM_API.callRpc('api_restoreFinding', window.TM_API.getToken(), btn.getAttribute('data-frestore'))\n                  .then(function () {\n                    window.TM_APP.showToast('Temuan dipulihkan.', 'success');\n                    close();\n                    renderCompletedSessionsView(container);\n                  }).catch(function (err) { window.TM_APP.showToast(err.message, 'error'); });\n              });\n            });\n\n            root.querySelectorAll('[data-fedit]').forEach(function (btn) {\n              btn.addEventListener('click', function () {\n                var fid = btn.getAttribute('data-fedit');\n                var f = fList.find(function (x) { return x.FindingID === fid; });\n                if (!f) return;\n                openEditFindingModal(f, function () {\n                  openSessionDetailModal(sessionId);\n                });\n              });\n            });\n          })\n          .catch(function (err) { window.TM_APP.showToast(err.message, 'error'); });\n      }\n\n      function openEditFindingModal(f, onSaved) {\n        var catOpts = master.active.categories.map(function (c) {\n          return '<option value=\"' + esc(c.CategoryID) + '\"' + (f.CategoryID === c.CategoryID ? ' selected' : '') + '>' + esc(c.CategoryName) + '</option>';\n        }).join('');\n        var secOpts = master.active.sections.map(function (s) {\n          return '<option value=\"' + esc(s.SectionID) + '\"' + (f.SectionID === s.SectionID ? ' selected' : '') + '>' + esc(s.SectionName) + '</option>';\n        }).join('');\n\n        var html =\n          '<div id=\"ef-alert\"></div>' +\n          '<form id=\"ef-form\">' +\n            '<div class=\"form-group\"><label class=\"form-label\">Category</label><select id=\"ef-cat\" class=\"form-control\">' + catOpts + '</select></div>' +\n            '<div class=\"form-group\"><label class=\"form-label\">Section</label><select id=\"ef-sec\" class=\"form-control\">' + secOpts + '</select></div>' +\n            '<div class=\"form-group\"><label class=\"form-label\">Masalah *</label><textarea id=\"ef-masalah\" class=\"form-control\" rows=\"2\" required>' + esc(f.Masalah) + '</textarea></div>' +\n            '<div class=\"form-group\"><label class=\"form-label\">Mengapa *</label><textarea id=\"ef-mengapa\" class=\"form-control\" rows=\"2\" required>' + esc(f.Mengapa) + '</textarea></div>' +\n            '<div class=\"form-group\"><label class=\"form-label\">Solusi</label><textarea id=\"ef-solusi\" class=\"form-control\" rows=\"2\">' + esc(f.Solusi) + '</textarea></div>' +\n            '<div class=\"modal-footer\">' +\n              '<button type=\"button\" class=\"btn btn-secondary\" id=\"ef-cancel\">Batal</button>' +\n              '<button type=\"submit\" class=\"btn btn-primary\" id=\"ef-save\">Simpan Perubahan</button>' +\n            '</div>' +\n          '</form>';\n        var close = window.TM_APP.openModal('Edit Temuan', html);\n        document.getElementById('ef-cancel').addEventListener('click', close);\n        document.getElementById('ef-form').addEventListener('submit', function (e) {\n          e.preventDefault();\n          var btn = document.getElementById('ef-save');\n          btn.disabled = true;\n          window.TM_API.callRpc('api_updateFinding', window.TM_API.getToken(), f.FindingID, {\n            categoryId: document.getElementById('ef-cat').value,\n            sectionId: document.getElementById('ef-sec').value,\n            masalah: document.getElementById('ef-masalah').value,\n            mengapa: document.getElementById('ef-mengapa').value,\n            solusi: document.getElementById('ef-solusi').value\n          }).then(function () {\n            window.TM_APP.showToast('Temuan diperbarui.', 'success');\n            close();\n            if (onSaved) onSaved();\n          }).catch(function (err) {\n            document.getElementById('ef-alert').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n            btn.disabled = false;\n          });\n        });\n      }\n    }\n\n    return {\n      renderInputView: renderInputView,\n      renderCompletedSessionsView: renderCompletedSessionsView\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_VIEWS_DASHBOARD = (function () {\n    var chartInstances = [];\n\n    function esc(s) {\n      return window.TM_APP.escapeHtml(s);\n    }\n\n    function destroyCharts() {\n      while (chartInstances.length > 0) {\n        var ch = chartInstances.pop();\n        try { ch.destroy(); } catch (e) {}\n      }\n    }\n\n    function renderDashboardView(container) {\n      var activeTab = 'OVERVIEW';\n      var filterOpen = true;\n      var filterOptions = null;\n      var dashData = null;\n\n      var filters = {\n        dateFrom: '',\n        dateTo: '',\n        outletIds: [],\n        trainerIds: [],\n        amIds: [],\n        mumIds: [],\n        categoryIds: [],\n        sectionIds: []\n      };\n\n      container.innerHTML =\n        '<div class=\"card dash-filter-card\" style=\"margin-bottom:14px;overflow:visible;\">' +\n          '<div class=\"card-header\" style=\"margin-bottom:0;\">' +\n            '<div style=\"display:flex;align-items:center;gap:10px;flex-wrap:wrap;\">' +\n              '<h2 class=\"card-title\">Filter Global Dashboard</h2>' +\n              '<span class=\"badge badge-primary\" id=\"db-active-filter-count\">Semua Data</span>' +\n            '</div>' +\n            '<div style=\"display:flex;gap:8px;flex-wrap:wrap;\">' +\n              '<button type=\"button\" class=\"btn btn-sm btn-primary\" id=\"db-open-export\">📥 Unduh Laporan &amp; Data</button>' +\n              '<button type=\"button\" class=\"btn btn-sm btn-secondary\" id=\"db-toggle-filter\">Sembunyikan Filter ▴</button>' +\n              '<button type=\"button\" class=\"btn btn-sm btn-ghost\" id=\"db-reset-filter\">Reset</button>' +\n            '</div>' +\n          '</div>' +\n          '<div id=\"db-filter-drawer\" style=\"margin-top:16px;border-top:1px solid var(--border-color);padding-top:14px;\"></div>' +\n        '</div>' +\n        '<div id=\"db-kpi-row\"></div>' +\n        '<div class=\"tabs-bar\" id=\"db-tabs\">' +\n          '<button class=\"tab-btn active\" data-dtab=\"OVERVIEW\">1. Ringkasan</button>' +\n          '<button class=\"tab-btn\" data-dtab=\"ANALISIS\">2. Analisis Wilayah</button>' +\n          '<button class=\"tab-btn\" data-dtab=\"TOP_ISSUE\">3. Masalah Terbanyak</button>' +\n          '<button class=\"tab-btn\" data-dtab=\"DETAIL\">4. Rincian Pemeriksaan</button>' +\n        '</div>' +\n        '<div id=\"db-tab-body\"><p class=\"form-hint\">Memuat analitik Dashboard...</p></div>';\n\n      function countActiveFilters() {\n        var c = 0;\n        if (filters.dateFrom) c++;\n        if (filters.dateTo) c++;\n        c += filters.outletIds.length + filters.trainerIds.length + filters.amIds.length +\n             filters.mumIds.length + filters.categoryIds.length + filters.sectionIds.length;\n        return c;\n      }\n\n      function updateFilterCountBadge() {\n        var badge = document.getElementById('db-active-filter-count');\n        if (!badge) return;\n        var cnt = countActiveFilters();\n        badge.textContent = cnt === 0 ? 'Semua Data' : (cnt + ' Filter Dipilih');\n      }\n\n      function buildTriggerSummary(selectedArr, items, labelKey, defaultLabel) {\n        if (!selectedArr || selectedArr.length === 0) {\n          return { text: defaultLabel, count: 0 };\n        }\n        var names = [];\n        for (var i = 0; i < items.length; i++) {\n          if (selectedArr.indexOf(items[i].id) !== -1) {\n            names.push(items[i][labelKey] || items[i].name);\n          }\n        }\n        return {\n          text: names.join(', ') || (selectedArr.length + ' dipilih'),\n          count: selectedArr.length\n        };\n      }\n\n      function renderMultiSelectDropdown(groupKey, defaultLabel, items, labelKey) {\n        var list = items || [];\n        var selectedArr = filters[groupKey] || [];\n        var summary = buildTriggerSummary(selectedArr, list, labelKey, defaultLabel);\n\n        var optionsHtml = list.length === 0\n          ? '<div class=\"form-hint\" style=\"padding:8px 10px;\">Belum ada pilihan tersedia</div>'\n          : list.map(function (it) {\n              var isSel = selectedArr.indexOf(it.id) !== -1;\n              var text = it[labelKey] || it.name;\n              var subCode = it.code ? (' (' + it.code + ')') : '';\n              return (\n                '<div class=\"ms-option' + (isSel ? ' selected' : '') + '\" data-ms-opt=\"' + groupKey + '\" data-ms-id=\"' + esc(it.id) + '\" data-ms-search=\"' + esc((text + subCode).toLowerCase()) + '\">' +\n                  '<span class=\"ms-checkbox\">✓</span>' +\n                  '<span style=\"flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;\">' + esc(text) + (subCode ? '<span class=\"form-hint\">' + esc(subCode) + '</span>' : '') + '</span>' +\n                '</div>'\n              );\n            }).join('');\n\n        return (\n          '<div class=\"ms-dropdown\" data-ms-wrap=\"' + groupKey + '\" data-ms-default=\"' + esc(defaultLabel) + '\">' +\n            '<button type=\"button\" class=\"ms-trigger' + (summary.count > 0 ? ' has-selection' : '') + '\" data-ms-trigger=\"' + groupKey + '\">' +\n              '<span class=\"ms-trigger-text\" data-ms-text=\"' + groupKey + '\">' + esc(summary.text) + '</span>' +\n              '<span class=\"ms-trigger-right\">' +\n                '<span class=\"ms-trigger-badge' + (summary.count > 0 ? '' : ' hidden') + '\" data-ms-badge=\"' + groupKey + '\">' + summary.count + ' dipilih</span>' +\n                '<span class=\"ms-chevron\">▾</span>' +\n              '</span>' +\n            '</button>' +\n            '<div class=\"ms-menu\">' +\n              '<div class=\"ms-actions\">' +\n                '<div style=\"display:flex;gap:6px;\">' +\n                  '<button type=\"button\" class=\"ms-action-btn\" data-ms-selectall=\"' + groupKey + '\">Pilih Semua</button>' +\n                  '<button type=\"button\" class=\"ms-action-btn\" data-ms-clear=\"' + groupKey + '\">Reset</button>' +\n                '</div>' +\n                '<button type=\"button\" class=\"ms-action-btn\" data-ms-close=\"' + groupKey + '\">Selesai ✓</button>' +\n              '</div>' +\n              (list.length > 4\n                ? '<input type=\"text\" class=\"ms-search\" data-ms-filter=\"' + groupKey + '\" placeholder=\"Cari pilihan...\">'\n                : '') +\n              '<div class=\"ms-list\">' + optionsHtml + '</div>' +\n            '</div>' +\n          '</div>'\n        );\n      }\n\n      function refreshDropdownTriggerUI(box, groupKey) {\n        var wrap = box.querySelector('[data-ms-wrap=\"' + groupKey + '\"]');\n        if (!wrap) return;\n        var defaultLabel = wrap.getAttribute('data-ms-default') || 'Semua';\n        var groupMap = {\n          outletIds: filterOptions.outlets,\n          trainerIds: filterOptions.trainers,\n          categoryIds: filterOptions.categories,\n          sectionIds: filterOptions.sections,\n          amIds: filterOptions.ams,\n          mumIds: filterOptions.mums\n        };\n        var list = groupMap[groupKey] || [];\n        var summary = buildTriggerSummary(filters[groupKey], list, 'name', defaultLabel);\n        var trig = wrap.querySelector('[data-ms-trigger=\"' + groupKey + '\"]');\n        var txt = wrap.querySelector('[data-ms-text=\"' + groupKey + '\"]');\n        var bdg = wrap.querySelector('[data-ms-badge=\"' + groupKey + '\"]');\n        if (trig) trig.classList.toggle('has-selection', summary.count > 0);\n        if (txt) txt.textContent = summary.text;\n        if (bdg) {\n          bdg.textContent = summary.count + ' dipilih';\n          bdg.classList.toggle('hidden', summary.count === 0);\n        }\n        updateFilterCountBadge();\n      }\n\n      function drawFilterDrawer() {\n        var box = document.getElementById('db-filter-drawer');\n        if (!box || !filterOptions) return;\n\n        box.innerHTML =\n          '<div class=\"grid-3\">' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Dari Tanggal Pemeriksaan</label>' +\n              '<input type=\"date\" id=\"dbf-from\" class=\"form-control\" value=\"' + esc(filters.dateFrom) + '\">' +\n            '</div>' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Sampai Tanggal Pemeriksaan</label>' +\n              '<input type=\"date\" id=\"dbf-to\" class=\"form-control\" value=\"' + esc(filters.dateTo) + '\">' +\n            '</div>' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Outlet (Bisa Pilih &gt; 1)</label>' +\n              renderMultiSelectDropdown('outletIds', 'Semua Outlet', filterOptions.outlets, 'name') +\n            '</div>' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Trainer (Bisa Pilih &gt; 1)</label>' +\n              renderMultiSelectDropdown('trainerIds', 'Semua Trainer', filterOptions.trainers, 'name') +\n            '</div>' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Kategori Temuan (Bisa Pilih &gt; 1)</label>' +\n              renderMultiSelectDropdown('categoryIds', 'Semua Kategori', filterOptions.categories, 'name') +\n            '</div>' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Bagian / Section (Bisa Pilih &gt; 1)</label>' +\n              renderMultiSelectDropdown('sectionIds', 'Semua Bagian / Section', filterOptions.sections, 'name') +\n            '</div>' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Area Manager / AM (Bisa Pilih &gt; 1)</label>' +\n              renderMultiSelectDropdown('amIds', 'Semua AM', filterOptions.ams, 'name') +\n            '</div>' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">MUM (Bisa Pilih &gt; 1)</label>' +\n              renderMultiSelectDropdown('mumIds', 'Semua MUM', filterOptions.mums, 'name') +\n            '</div>' +\n            '<div class=\"form-group\" style=\"justify-content:flex-end;\">' +\n              '<label class=\"form-label\">&nbsp;</label>' +\n              '<button type=\"button\" id=\"dbf-apply\" class=\"btn btn-primary btn-block\">Terapkan Filter</button>' +\n            '</div>' +\n          '</div>';\n\n        box.querySelectorAll('[data-ms-trigger]').forEach(function (trig) {\n          trig.addEventListener('click', function (e) {\n            e.stopPropagation();\n            var grp = trig.getAttribute('data-ms-trigger');\n            var wrap = box.querySelector('[data-ms-wrap=\"' + grp + '\"]');\n            var wasOpen = wrap && wrap.classList.contains('open');\n            box.querySelectorAll('.ms-dropdown.open').forEach(function (el) {\n              el.classList.remove('open');\n            });\n            if (wrap && !wasOpen) {\n              wrap.classList.add('open');\n            }\n          });\n        });\n\n        box.querySelectorAll('.ms-menu').forEach(function (menu) {\n          menu.addEventListener('click', function (e) {\n            e.stopPropagation();\n          });\n        });\n\n        box.querySelectorAll('[data-ms-close]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var grp = btn.getAttribute('data-ms-close');\n            var wrap = box.querySelector('[data-ms-wrap=\"' + grp + '\"]');\n            if (wrap) wrap.classList.remove('open');\n          });\n        });\n\n        box.querySelectorAll('[data-ms-opt]').forEach(function (opt) {\n          opt.addEventListener('click', function () {\n            var grp = opt.getAttribute('data-ms-opt');\n            var id = opt.getAttribute('data-ms-id');\n            var arr = filters[grp];\n            var idx = arr.indexOf(id);\n            if (idx === -1) arr.push(id);\n            else arr.splice(idx, 1);\n            opt.classList.toggle('selected', idx === -1);\n            refreshDropdownTriggerUI(box, grp);\n          });\n        });\n\n        box.querySelectorAll('[data-ms-selectall]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var grp = btn.getAttribute('data-ms-selectall');\n            var wrap = box.querySelector('[data-ms-wrap=\"' + grp + '\"]');\n            if (!wrap) return;\n            var allIds = [];\n            wrap.querySelectorAll('[data-ms-opt=\"' + grp + '\"]').forEach(function (opt) {\n              if (opt.style.display !== 'none') {\n                var id = opt.getAttribute('data-ms-id');\n                if (allIds.indexOf(id) === -1) allIds.push(id);\n                opt.classList.add('selected');\n              }\n            });\n            filters[grp] = allIds;\n            refreshDropdownTriggerUI(box, grp);\n          });\n        });\n\n        box.querySelectorAll('[data-ms-clear]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var grp = btn.getAttribute('data-ms-clear');\n            var wrap = box.querySelector('[data-ms-wrap=\"' + grp + '\"]');\n            filters[grp] = [];\n            if (wrap) {\n              wrap.querySelectorAll('[data-ms-opt=\"' + grp + '\"]').forEach(function (opt) {\n                opt.classList.remove('selected');\n              });\n            }\n            refreshDropdownTriggerUI(box, grp);\n          });\n        });\n\n        box.querySelectorAll('[data-ms-filter]').forEach(function (inp) {\n          inp.addEventListener('input', function () {\n            var grp = inp.getAttribute('data-ms-filter');\n            var q = (inp.value || '').trim().toLowerCase();\n            var wrap = box.querySelector('[data-ms-wrap=\"' + grp + '\"]');\n            if (!wrap) return;\n            wrap.querySelectorAll('[data-ms-opt=\"' + grp + '\"]').forEach(function (opt) {\n              var hay = opt.getAttribute('data-ms-search') || '';\n              opt.style.display = (!q || hay.indexOf(q) !== -1) ? '' : 'none';\n            });\n          });\n        });\n\n        document.getElementById('dbf-apply').addEventListener('click', function () {\n          filters.dateFrom = document.getElementById('dbf-from').value;\n          filters.dateTo = document.getElementById('dbf-to').value;\n          box.querySelectorAll('.ms-dropdown.open').forEach(function (el) {\n            el.classList.remove('open');\n          });\n          updateFilterCountBadge();\n          fetchDashboardData();\n        });\n      }\n\n      document.addEventListener('click', function () {\n        var box = document.getElementById('db-filter-drawer');\n        if (!box) return;\n        box.querySelectorAll('.ms-dropdown.open').forEach(function (el) {\n          el.classList.remove('open');\n        });\n      });\n\n      function renderKpiCards() {\n        var box = document.getElementById('db-kpi-row');\n        if (!box || !dashData) return;\n        var k = dashData.kpi;\n        var hasRec = k.recurringIssuesCount > 0;\n        box.innerHTML =\n          '<div class=\"kpi-grid\">' +\n            '<div class=\"kpi-card\">' +\n              '<span class=\"kpi-label\">Total Pemeriksaan</span>' +\n              '<div class=\"kpi-value\">' + k.totalInspections + '</div>' +\n              '<span class=\"kpi-sub\">Sesi selesai (tidak termasuk Draft)</span>' +\n            '</div>' +\n            '<div class=\"kpi-card\">' +\n              '<span class=\"kpi-label\">Total Temuan Aktif</span>' +\n              '<div class=\"kpi-value\">' + k.totalActiveFindings + '</div>' +\n              '<span class=\"kpi-sub\">Temuan operasional aktif</span>' +\n            '</div>' +\n            '<div class=\"kpi-card\">' +\n              '<span class=\"kpi-label\">Outlet Diperiksa</span>' +\n              '<div class=\"kpi-value\">' + k.inspectedOutlets + '</div>' +\n              '<span class=\"kpi-sub\">Outlet unik telah diperiksa</span>' +\n            '</div>' +\n            '<div class=\"kpi-card' + (hasRec ? ' kpi-recurring-alert' : '') + '\">' +\n              '<div style=\"display:flex;justify-content:space-between;align-items:center;gap:6px;\">' +\n                '<span class=\"kpi-label\">Masalah Berulang</span>' +\n                (hasRec ? '<span class=\"badge badge-danger\">Perlu perhatian khusus</span>' : '') +\n              '</div>' +\n              '<div class=\"kpi-value\">' + k.recurringIssuesCount + '</div>' +\n              '<span class=\"kpi-sub\">' + k.recurringAffectedOutletsCount + ' Outlet terdampak (≥ 2 sesi berbeda)</span>' +\n            '</div>' +\n          '</div>';\n      }\n\n      function renderActiveTab() {\n        destroyCharts();\n        var body = document.getElementById('db-tab-body');\n        if (!body || !dashData) return;\n\n        if (activeTab === 'OVERVIEW') renderOverviewTab(body);\n        else if (activeTab === 'ANALISIS') renderAnalisisTab(body);\n        else if (activeTab === 'TOP_ISSUE') renderTopIssueTab(body);\n        else if (activeTab === 'DETAIL') renderDetailTab(body);\n      }\n\n      function renderOverviewTab(body) {\n        var recHtml = dashData.recurringIssues.length === 0\n          ? '<p class=\"form-hint\">Tidak ada masalah berulang pada rentang filter saat ini.</p>'\n          : dashData.recurringIssues.slice(0, 5).map(function (r) {\n              return (\n                '<div style=\"display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);gap:8px;flex-wrap:wrap;\">' +\n                  '<div><strong>' + esc(r.outletName) + '</strong> • ' + esc(r.categoryName) + '<div class=\"form-hint\">Ditemukan di ' + r.sessionCount + ' sesi pemeriksaan (' + r.findingCount + ' temuan)</div></div>' +\n                  '<span class=\"badge badge-danger\">' + esc(r.label) + '</span>' +\n                '</div>'\n              );\n            }).join('');\n\n        body.innerHTML =\n          '<div class=\"grid-2\">' +\n            '<div class=\"card\">' +\n              '<div class=\"card-header\"><h3 class=\"card-title\">Tren Temuan Berdasarkan Tanggal Pemeriksaan</h3></div>' +\n              '<div class=\"chart-box\"><canvas id=\"ch-trend\"></canvas></div>' +\n            '</div>' +\n            '<div class=\"card\">' +\n              '<div class=\"card-header\"><h3 class=\"card-title\">10 Kategori Temuan Terbanyak</h3></div>' +\n              '<div class=\"chart-box\"><canvas id=\"ch-cat\"></canvas></div>' +\n            '</div>' +\n          '</div>' +\n          '<div class=\"card\">' +\n            '<div class=\"card-header\">' +\n              '<h3 class=\"card-title\">Sorotan Masalah Berulang</h3>' +\n              '<span class=\"badge badge-danger\">Perlu perhatian khusus</span>' +\n            '</div>' +\n            recHtml +\n          '</div>';\n\n        if (typeof Chart !== 'undefined') {\n          Chart.defaults.color = '#cbd5e1';\n          Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';\n          var tCtx = document.getElementById('ch-trend');\n          if (tCtx) {\n            chartInstances.push(new Chart(tCtx, {\n              type: 'line',\n              data: {\n                labels: dashData.trendByDate.map(function (x) { return x.date; }),\n                datasets: [\n                  {\n                    label: 'Jumlah Temuan',\n                    data: dashData.trendByDate.map(function (x) { return x.findingCount; }),\n                    borderColor: '#60a5fa',\n                    backgroundColor: 'rgba(59, 130, 246, 0.22)',\n                    fill: true,\n                    tension: 0.3\n                  },\n                  {\n                    label: 'Jumlah Sesi',\n                    data: dashData.trendByDate.map(function (x) { return x.sessionCount; }),\n                    borderColor: '#34d399',\n                    backgroundColor: 'transparent',\n                    tension: 0.3\n                  }\n                ]\n              },\n              options: { responsive: true, maintainAspectRatio: false }\n            }));\n          }\n\n          var cCtx = document.getElementById('ch-cat');\n          if (cCtx) {\n            chartInstances.push(new Chart(cCtx, {\n              type: 'bar',\n              data: {\n                labels: dashData.topCategories.map(function (x) { return x.categoryName; }),\n                datasets: [{\n                  label: 'Temuan Aktif',\n                  data: dashData.topCategories.map(function (x) { return x.findingCount; }),\n                  backgroundColor: '#3b82f6',\n                  borderRadius: 6\n                }]\n              },\n              options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }\n            }));\n          }\n        }\n      }\n\n      function renderAnalisisTab(body) {\n        var amRows = dashData.analysisByAM.map(function (a) {\n          return '<tr><td><strong>' + esc(a.amName) + '</strong></td><td>' + a.outletCount + '</td><td>' + a.sessionCount + '</td><td><span class=\"badge badge-primary\">' + a.findingCount + '</span></td></tr>';\n        }).join('');\n        var mumRows = dashData.analysisByMUM.map(function (m) {\n          return '<tr><td><strong>' + esc(m.mumName) + '</strong></td><td>' + m.outletCount + '</td><td>' + m.sessionCount + '</td><td><span class=\"badge badge-primary\">' + m.findingCount + '</span></td></tr>';\n        }).join('');\n\n        var amCards = dashData.analysisByAM.map(function (a) {\n          return '<div class=\"mobile-item-card\"><div class=\"mobile-item-row\"><strong>' + esc(a.amName) + '</strong><span class=\"badge badge-primary\">' + a.findingCount + ' temuan</span></div><div class=\"form-hint\">' + a.outletCount + ' Outlet • ' + a.sessionCount + ' Pemeriksaan</div></div>';\n        }).join('');\n        var mumCards = dashData.analysisByMUM.map(function (m) {\n          return '<div class=\"mobile-item-card\"><div class=\"mobile-item-row\"><strong>' + esc(m.mumName) + '</strong><span class=\"badge badge-primary\">' + m.findingCount + ' temuan</span></div><div class=\"form-hint\">' + m.outletCount + ' Outlet • ' + m.sessionCount + ' Pemeriksaan</div></div>';\n        }).join('');\n\n        body.innerHTML =\n          '<div class=\"card\">' +\n            '<div class=\"card-header\"><h3 class=\"card-title\">Bagian (Section) Berdasarkan Jumlah Temuan</h3></div>' +\n            '<div class=\"chart-box\"><canvas id=\"ch-sec\"></canvas></div>' +\n          '</div>' +\n          '<div class=\"grid-2\">' +\n            '<div class=\"card\">' +\n              '<div class=\"card-header\"><h3 class=\"card-title\">Analisis Berdasarkan Area Manager (AM)</h3></div>' +\n              '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>AM</th><th>Outlet</th><th>Sesi</th><th>Temuan</th></tr></thead><tbody>' + (amRows || '<tr><td colspan=\"4\">Tidak ada data</td></tr>') + '</tbody></table></div>' +\n              '<div class=\"mobile-card-list\">' + (amCards || '<p class=\"form-hint\">Tidak ada data</p>') + '</div>' +\n            '</div>' +\n            '<div class=\"card\">' +\n              '<div class=\"card-header\"><h3 class=\"card-title\">Analisis Berdasarkan MUM</h3></div>' +\n              '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>MUM</th><th>Outlet</th><th>Sesi</th><th>Temuan</th></tr></thead><tbody>' + (mumRows || '<tr><td colspan=\"4\">Tidak ada data</td></tr>') + '</tbody></table></div>' +\n              '<div class=\"mobile-card-list\">' + (mumCards || '<p class=\"form-hint\">Tidak ada data</p>') + '</div>' +\n            '</div>' +\n          '</div>';\n\n        if (typeof Chart !== 'undefined') {\n          Chart.defaults.color = '#cbd5e1';\n          Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';\n          var sCtx = document.getElementById('ch-sec');\n          if (sCtx) {\n            chartInstances.push(new Chart(sCtx, {\n              type: 'bar',\n              data: {\n                labels: dashData.topSections.map(function (x) { return x.sectionName; }),\n                datasets: [{\n                  label: 'Jumlah Temuan',\n                  data: dashData.topSections.map(function (x) { return x.findingCount; }),\n                  backgroundColor: '#e11d48',\n                  borderRadius: 6\n                }]\n              },\n              options: { responsive: true, maintainAspectRatio: false }\n            }));\n          }\n        }\n      }\n\n      function renderTopIssueTab(body) {\n        var overallRows = dashData.overallTopIssues.map(function (it) {\n          return '<tr><td><strong>' + esc(it.categoryName) + '</strong></td><td>' + esc(it.sectionName) + '</td><td>' + it.outletCount + '</td><td>' + it.sessionCount + '</td><td><span class=\"badge badge-primary\">' + it.findingCount + '</span></td></tr>';\n        }).join('');\n        var overallCards = dashData.overallTopIssues.map(function (it) {\n          return '<div class=\"mobile-item-card\"><div class=\"mobile-item-row\"><strong>' + esc(it.categoryName) + ' • ' + esc(it.sectionName) + '</strong><span class=\"badge badge-primary\">' + it.findingCount + ' temuan</span></div><div class=\"form-hint\">' + it.outletCount + ' Outlet • ' + it.sessionCount + ' Sesi</div></div>';\n        }).join('');\n\n        var outletRows = dashData.topIssuesByOutlet.map(function (o) {\n          return '<tr><td><code>' + esc(o.outletCode) + '</code> <strong>' + esc(o.outletName) + '</strong></td><td>' + o.sessionCount + '</td><td><span class=\"badge badge-primary\">' + o.findingCount + '</span></td><td>' + esc(o.topCategory) + '</td><td>' + esc(o.topSection) + '</td></tr>';\n        }).join('');\n        var outletCards = dashData.topIssuesByOutlet.map(function (o) {\n          return '<div class=\"mobile-item-card\"><div class=\"mobile-item-row\"><strong>' + esc(o.outletName) + '</strong><span class=\"badge badge-primary\">' + o.findingCount + ' temuan</span></div><div class=\"form-hint\">Top Category: ' + esc(o.topCategory) + ' • Top Section: ' + esc(o.topSection) + '</div></div>';\n        }).join('');\n\n        var recRows = dashData.recurringIssues.map(function (r) {\n          return '<tr><td><code>' + esc(r.outletCode) + '</code> <strong>' + esc(r.outletName) + '</strong></td><td>' + esc(r.categoryName) + '</td><td><strong>' + r.sessionCount + ' sesi</strong></td><td>' + r.findingCount + '</td><td>' + esc(r.lastInspectionDate) + '</td><td><span class=\"badge badge-danger\">' + esc(r.label) + '</span></td></tr>';\n        }).join('');\n        var recCards = dashData.recurringIssues.map(function (r) {\n          return '<div class=\"mobile-item-card\" style=\"border-color:rgba(244,63,94,0.45);\"><div class=\"mobile-item-row\"><strong>' + esc(r.outletName) + ' • ' + esc(r.categoryName) + '</strong><span class=\"badge badge-danger\">' + esc(r.label) + '</span></div><div class=\"form-hint\">' + r.sessionCount + ' sesi unik • ' + r.findingCount + ' temuan • Terakhir: ' + esc(r.lastInspectionDate) + '</div></div>';\n        }).join('');\n\n        body.innerHTML =\n          '<div class=\"card\">' +\n            '<div class=\"card-header\"><h3 class=\"card-title\">Masalah Berulang</h3><span class=\"badge badge-danger\">Perlu perhatian khusus</span></div>' +\n            '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>Outlet</th><th>Kategori</th><th>Sesi Unik</th><th>Total Temuan</th><th>Pemeriksaan Terakhir</th><th>Status</th></tr></thead><tbody>' + (recRows || '<tr><td colspan=\"6\">Tidak ada masalah berulang</td></tr>') + '</tbody></table></div>' +\n            '<div class=\"mobile-card-list\">' + (recCards || '<p class=\"form-hint\">Tidak ada masalah berulang</p>') + '</div>' +\n          '</div>' +\n          '<div class=\"card\">' +\n            '<div class=\"card-header\"><h3 class=\"card-title\">Ringkasan Masalah Terbanyak per Outlet</h3></div>' +\n            '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>Outlet</th><th>Sesi</th><th>Temuan</th><th>Kategori Terbanyak</th><th>Bagian Terbanyak</th></tr></thead><tbody>' + (outletRows || '<tr><td colspan=\"5\">Tidak ada data</td></tr>') + '</tbody></table></div>' +\n            '<div class=\"mobile-card-list\">' + (outletCards || '<p class=\"form-hint\">Tidak ada data</p>') + '</div>' +\n          '</div>' +\n          '<div class=\"card\">' +\n            '<div class=\"card-header\"><h3 class=\"card-title\">Analisis Keseluruhan (Kategori &amp; Bagian)</h3></div>' +\n            '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>Kategori</th><th>Bagian</th><th>Outlet</th><th>Sesi</th><th>Temuan</th></tr></thead><tbody>' + (overallRows || '<tr><td colspan=\"5\">Tidak ada data</td></tr>') + '</tbody></table></div>' +\n            '<div class=\"mobile-card-list\">' + (overallCards || '<p class=\"form-hint\">Tidak ada data</p>') + '</div>' +\n          '</div>';\n      }\n\n      function renderDetailTab(body) {\n        var sessions = dashData.detailedSessions || [];\n        if (sessions.length === 0) {\n          body.innerHTML = '<div class=\"card\"><p class=\"form-hint\" style=\"margin:0;\">Tidak ada sesi pemeriksaan yang cocok dengan filter aktif.</p></div>';\n          return;\n        }\n\n        body.innerHTML = sessions.map(function (s, sIdx) {\n          var findingsHtml = (s.Findings || []).length === 0\n            ? '<p class=\"form-hint\" style=\"margin:6px 0 0;\">Pemeriksaan selesai tanpa temuan.</p>'\n            : s.Findings.map(function (f, fIdx) {\n                var photoBtns = (f.Photos || []).map(function (ph, pIdx) {\n                  return (\n                    '<button type=\"button\" class=\"btn btn-sm btn-secondary\" data-dbphoto=\"' + sIdx + ':' + fIdx + ':' + pIdx + '\">' +\n                      '📷 ' + esc(ph.FileName || ('Foto ' + (pIdx + 1))) +\n                      (ph.PhotoComment ? ' — ' + esc(ph.PhotoComment) : '') +\n                    '</button>'\n                  );\n                }).join(' ');\n\n                return (\n                  '<div class=\"card\" style=\"background:var(--bg-app);margin-top:10px;margin-bottom:0;\">' +\n                    '<div style=\"display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px;\">' +\n                      '<strong>' + esc(f.CategoryNameSnapshot) + ' → ' + esc(f.SectionNameSnapshot) + '</strong>' +\n                    '</div>' +\n                    '<div style=\"font-size:13px;\"><strong>Masalah:</strong> ' + esc(f.Masalah) + '</div>' +\n                    '<div style=\"font-size:13px;\"><strong>Mengapa:</strong> ' + esc(f.Mengapa) + '</div>' +\n                    (f.Solusi ? '<div style=\"font-size:13px;\"><strong>Solusi:</strong> ' + esc(f.Solusi) + '</div>' : '') +\n                    '<div style=\"margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;\">' + photoBtns + '</div>' +\n                  '</div>'\n                );\n              }).join('');\n\n          return (\n            '<div class=\"card\">' +\n              '<div class=\"card-header\" style=\"margin-bottom:8px;\">' +\n                '<div>' +\n                  '<strong>' + esc(s.CanonicalOutletName) + '</strong> ' +\n                  '<span class=\"badge badge-neutral\">' + esc(s.ReportNumber) + '</span>' +\n                  '<div class=\"form-hint\">Tanggal Pemeriksaan: ' + esc(s.InspectionDate) + ' • Trainer: ' + esc(s.TrainerName) + ' • PIC: ' + esc(s.PIC_Name) + ' • AM: ' + esc(s.AM_Name_Snapshot) + ' • MUM: ' + esc(s.MUM_Name_Snapshot) + '</div>' +\n                '</div>' +\n                '<span class=\"badge badge-primary\">' + (s.Findings ? s.Findings.length : 0) + ' Temuan</span>' +\n              '</div>' +\n              findingsHtml +\n            '</div>'\n          );\n        }).join('');\n\n        body.querySelectorAll('[data-dbphoto]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var parts = btn.getAttribute('data-dbphoto').split(':');\n            var sIdx = parseInt(parts[0], 10);\n            var fIdx = parseInt(parts[1], 10);\n            var pIdx = parseInt(parts[2], 10);\n            var photos = dashData.detailedSessions[sIdx].Findings[fIdx].Photos;\n            window.TM_PHOTO.openLightboxGallery(photos, pIdx);\n          });\n        });\n      }\n\n      function fetchDashboardData() {\n        var body = document.getElementById('db-tab-body');\n        if (body) body.innerHTML = '<p class=\"form-hint\">Memuat analitik Dashboard...</p>';\n\n        window.TM_API.callRpc('api_getDashboardData', window.TM_API.getToken(), filters)\n          .then(function (data) {\n            dashData = data;\n            renderKpiCards();\n            renderActiveTab();\n          })\n          .catch(function (err) {\n            if (body) body.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          });\n      }\n\n      document.getElementById('db-open-export').addEventListener('click', function () {\n        if (window.TM_VIEWS_REPORTING) {\n          window.TM_VIEWS_REPORTING.openDashboardExportModal(filters);\n        }\n      });\n\n      document.getElementById('db-toggle-filter').addEventListener('click', function () {\n        filterOpen = !filterOpen;\n        var drawer = document.getElementById('db-filter-drawer');\n        if (drawer) drawer.classList.toggle('hidden', !filterOpen);\n        document.getElementById('db-toggle-filter').textContent = filterOpen ? 'Sembunyikan Filter ▴' : 'Tampilkan Filter ▾';\n      });\n\n      document.getElementById('db-reset-filter').addEventListener('click', function () {\n        filters = {\n          dateFrom: '',\n          dateTo: '',\n          outletIds: [],\n          trainerIds: [],\n          amIds: [],\n          mumIds: [],\n          categoryIds: [],\n          sectionIds: []\n        };\n        updateFilterCountBadge();\n        drawFilterDrawer();\n        fetchDashboardData();\n      });\n\n      document.getElementById('db-tabs').querySelectorAll('.tab-btn').forEach(function (btn) {\n        btn.addEventListener('click', function () {\n          activeTab = btn.getAttribute('data-dtab');\n          document.getElementById('db-tabs').querySelectorAll('.tab-btn').forEach(function (b) {\n            b.classList.toggle('active', b.getAttribute('data-dtab') === activeTab);\n          });\n          renderActiveTab();\n        });\n      });\n\n      Promise.all([\n        window.TM_API.callRpc('api_getDashboardFilterOptions', window.TM_API.getToken()),\n        window.TM_API.callRpc('api_getDashboardData', window.TM_API.getToken(), filters)\n      ]).then(function (res) {\n        filterOptions = res[0];\n        dashData = res[1];\n        drawFilterDrawer();\n        renderKpiCards();\n        renderActiveTab();\n      }).catch(function (err) {\n        document.getElementById('db-tab-body').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n      });\n    }\n\n    return {\n      renderDashboardView: renderDashboardView\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_VIEWS_DRAFTS = (function () {\n    function esc(s) {\n      return window.TM_APP.escapeHtml(s);\n    }\n\n    function renderMonitoringDraftsView(container) {\n      var mode = 'MONITORING'; // MONITORING | RESTORE_REQUESTS\n      var trainers = [];\n      var monData = { summary: { totalActiveDrafts: 0, under3Days: 0, days3To7: 0, over7Days: 0, uniqueTrainers: 0 }, items: [] };\n      var restoreData = { menunggu: [], disetujui: [], ditolak: [] };\n\n      var filters = {\n        trainerId: '',\n        createdDateFrom: '',\n        createdDateTo: '',\n        search: ''\n      };\n\n      container.innerHTML =\n        '<div class=\"tabs-bar\" id=\"dm-top-tabs\">' +\n          '<button class=\"tab-btn active\" data-dmtab=\"MONITORING\">Monitoring Draft Aktif</button>' +\n          '<button class=\"tab-btn\" data-dmtab=\"RESTORE_REQUESTS\">Permintaan Pemulihan Draft</button>' +\n        '</div>' +\n        '<div id=\"dm-body\"></div>';\n\n      document.getElementById('dm-top-tabs').querySelectorAll('.tab-btn').forEach(function (btn) {\n        btn.addEventListener('click', function () {\n          mode = btn.getAttribute('data-dmtab');\n          document.getElementById('dm-top-tabs').querySelectorAll('.tab-btn').forEach(function (b) {\n            b.classList.toggle('active', b.getAttribute('data-dmtab') === mode);\n          });\n          if (mode === 'MONITORING') loadMonitoring();\n          else loadRestoreRequests();\n        });\n      });\n\n      function loadMonitoring() {\n        var body = document.getElementById('dm-body');\n        body.innerHTML = '<p class=\"form-hint\">Memuat Monitoring Draft...</p>';\n\n        Promise.all([\n          window.TM_API.callRpc('api_getDashboardFilterOptions', window.TM_API.getToken()),\n          window.TM_API.callRpc('api_listMonitoringDrafts', window.TM_API.getToken(), {\n            trainerId: filters.trainerId,\n            createdDateFrom: filters.createdDateFrom,\n            createdDateTo: filters.createdDateTo\n          })\n        ]).then(function (res) {\n          trainers = (res[0] && res[0].trainers) || [];\n          monData = res[1];\n          window.TM_APP.setDraftBadgeCount(monData.summary.totalActiveDrafts);\n          drawMonitoringShell();\n        }).catch(function (err) {\n          body.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n        });\n      }\n\n      function drawMonitoringShell() {\n        var body = document.getElementById('dm-body');\n        var s = monData.summary;\n        var trainerOpts = '<option value=\"\">Semua Trainer</option>' + trainers.map(function (t) {\n          return '<option value=\"' + esc(t.id) + '\"' + (filters.trainerId === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>';\n        }).join('');\n\n        body.innerHTML =\n          '<div class=\"kpi-grid\" style=\"grid-template-columns:repeat(auto-fit,minmax(165px,1fr));\">' +\n            '<div class=\"kpi-card\"><span class=\"kpi-label\">Total Draft Aktif</span><div class=\"kpi-value\">' + s.totalActiveDrafts + '</div></div>' +\n            '<div class=\"kpi-card\"><span class=\"kpi-label\">Umur &lt; 3 Hari</span><div class=\"kpi-value\">' + s.under3Days + '</div></div>' +\n            '<div class=\"kpi-card\"><span class=\"kpi-label\">Umur 3–7 Hari</span><div class=\"kpi-value\">' + s.days3To7 + '</div></div>' +\n            '<div class=\"kpi-card' + (s.over7Days > 0 ? ' kpi-recurring-alert' : '') + '\"><span class=\"kpi-label\">Umur &gt; 7 Hari</span><div class=\"kpi-value\">' + s.over7Days + '</div></div>' +\n            '<div class=\"kpi-card\"><span class=\"kpi-label\">Trainer Unik</span><div class=\"kpi-value\">' + s.uniqueTrainers + '</div></div>' +\n          '</div>' +\n          '<div class=\"card\">' +\n            '<div class=\"toolbar\">' +\n              '<div class=\"toolbar-field\"><input type=\"text\" id=\"dm-search\" class=\"form-control\" placeholder=\"Cari langsung nama Trainer atau Outlet...\" value=\"' + esc(filters.search) + '\"></div>' +\n              '<div><select id=\"dm-trainer\" class=\"form-control\">' + trainerOpts + '</select></div>' +\n              '<div><input type=\"date\" id=\"dm-from\" class=\"form-control\" value=\"' + esc(filters.createdDateFrom) + '\" title=\"Dari tanggal dibuat\"></div>' +\n              '<div><input type=\"date\" id=\"dm-to\" class=\"form-control\" value=\"' + esc(filters.createdDateTo) + '\" title=\"Sampai tanggal dibuat\"></div>' +\n              '<div><button type=\"button\" id=\"dm-apply\" class=\"btn btn-primary\">Filter</button></div>' +\n            '</div>' +\n            '<div id=\"dm-list-box\"></div>' +\n          '</div>';\n\n        document.getElementById('dm-search').addEventListener('input', function (e) {\n          filters.search = e.target.value;\n          drawMonitoringList();\n        });\n        document.getElementById('dm-apply').addEventListener('click', function () {\n          filters.trainerId = document.getElementById('dm-trainer').value;\n          filters.createdDateFrom = document.getElementById('dm-from').value;\n          filters.createdDateTo = document.getElementById('dm-to').value;\n          loadMonitoring();\n        });\n\n        drawMonitoringList();\n      }\n\n      function drawMonitoringList() {\n        var box = document.getElementById('dm-list-box');\n        if (!box) return;\n        var q = (filters.search || '').trim().toLowerCase();\n        var items = (monData.items || []).filter(function (it) {\n          if (!q) return true;\n          var hay = (it.TrainerName + ' ' + (it.OutletNameSnapshot || '')).toLowerCase();\n          return hay.indexOf(q) !== -1;\n        });\n\n        if (items.length === 0) {\n          box.innerHTML = '<p class=\"form-hint\">Tidak ada Draft aktif yang sesuai kriteria.</p>';\n          return;\n        }\n\n        // Kolom PC sesuai PRD 7.5: Trainer, Outlet, Tanggal dibuat, Umur Draft, Terakhir diperbarui, Aksi\n        var rows = items.map(function (d) {\n          return (\n            '<tr>' +\n              '<td><strong>' + esc(d.TrainerName) + '</strong></td>' +\n              '<td>' + esc(d.OutletNameSnapshot || 'Outlet belum diisi') + '</td>' +\n              '<td>' + esc(String(d.CreatedAt).slice(0, 10)) + '</td>' +\n              '<td><div>' + esc(d.CreatedAt) + '</div><span class=\"badge badge-neutral\">' + esc(d.RelativeAge) + '</span></td>' +\n              '<td>' + esc(d.UpdatedAt) + '</td>' +\n              '<td>' +\n                '<div style=\"display:flex;gap:6px;flex-wrap:wrap;\">' +\n                  '<button class=\"btn btn-sm btn-secondary\" data-dmact=\"detail\" data-id=\"' + esc(d.SessionID) + '\">Detail (Read-Only)</button>' +\n                  '<button class=\"btn btn-sm btn-danger\" data-dmact=\"delete\" data-id=\"' + esc(d.SessionID) + '\">Hapus</button>' +\n                '</div>' +\n              '</td>' +\n            '</tr>'\n          );\n        }).join('');\n\n        var cards = items.map(function (d) {\n          return (\n            '<div class=\"mobile-item-card\">' +\n              '<div class=\"mobile-item-row\">' +\n                '<div><strong>' + esc(d.OutletNameSnapshot || 'Outlet belum diisi') + '</strong><div class=\"form-hint\">Trainer: ' + esc(d.TrainerName) + '</div></div>' +\n                '<span class=\"badge badge-neutral\">' + esc(d.RelativeAge) + '</span>' +\n              '</div>' +\n              '<div class=\"form-hint\">Dibuat: ' + esc(d.CreatedAt) + '</div>' +\n              '<div class=\"form-hint\">Diperbarui: ' + esc(d.UpdatedAt) + '</div>' +\n              '<div class=\"mobile-item-actions\">' +\n                '<button class=\"btn btn-sm btn-secondary\" data-dmact=\"detail\" data-id=\"' + esc(d.SessionID) + '\">Detail (Read-Only)</button>' +\n                '<button class=\"btn btn-sm btn-danger\" data-dmact=\"delete\" data-id=\"' + esc(d.SessionID) + '\">Hapus</button>' +\n              '</div>' +\n            '</div>'\n          );\n        }).join('');\n\n        box.innerHTML =\n          '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>Trainer</th><th>Outlet</th><th>Tanggal Dibuat</th><th>Umur Draft</th><th>Terakhir Diperbarui</th><th>Aksi</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +\n          '<div class=\"mobile-card-list\">' + cards + '</div>';\n\n        box.querySelectorAll('button[data-dmact]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var id = btn.getAttribute('data-id');\n            var item = items.find(function (x) { return x.SessionID === id; });\n            if (!item) return;\n            if (btn.getAttribute('data-dmact') === 'detail') openDraftDetailModal(id);\n            if (btn.getAttribute('data-dmact') === 'delete') openAdminDeleteDraftDialog(item, null);\n          });\n        });\n      }\n\n      /* ==================== DETAIL DRAFT 3-TAB READ-ONLY (PRD 7.6) ==================== */\n      function openDraftDetailModal(sessionId) {\n        window.TM_API.callRpc('api_getMonitoringDraftDetail', window.TM_API.getToken(), sessionId)\n          .then(function (detail) {\n            var info = detail.inspectionInfo;\n            var findings = detail.findings || [];\n            var photos = detail.photos || [];\n            var activeSubTab = 'INFO';\n\n            var html =\n              '<div class=\"alert alert-info\" style=\"margin-bottom:12px;\">Mode <strong>Hanya Baca (Read-Only)</strong>. Super Admin tidak dapat mengubah atau melanjutkan Draft sebagai Trainer.</div>' +\n              '<div class=\"tabs-bar\" id=\"dd-tabs\">' +\n                '<button type=\"button\" class=\"tab-btn active\" data-ddtab=\"INFO\">1. Informasi Pemeriksaan</button>' +\n                '<button type=\"button\" class=\"tab-btn\" data-ddtab=\"FINDINGS\">2. Daftar Temuan (' + findings.length + ')</button>' +\n                '<button type=\"button\" class=\"tab-btn\" data-ddtab=\"PHOTOS\">3. Foto Bukti (' + photos.length + ')</button>' +\n              '</div>' +\n              '<div id=\"dd-tab-content\"></div>' +\n              '<div class=\"modal-footer\">' +\n                (info.DeletedAt ? '' : '<button type=\"button\" class=\"btn btn-danger\" id=\"dd-btn-delete\">Hapus Draft</button>') +\n              '</div>';\n\n            var closeDetail = window.TM_APP.openModal('Detail Draft: ' + info.SessionID, html);\n\n            function drawSubTab() {\n              var box = document.getElementById('dd-tab-content');\n              if (!box) return;\n              if (activeSubTab === 'INFO') {\n                box.innerHTML =\n                  '<div style=\"font-size:14px;display:flex;flex-direction:column;gap:6px;\">' +\n                    '<div><strong>Identitas Draft:</strong> <code>' + esc(info.SessionID) + '</code></div>' +\n                    '<div><strong>Trainer:</strong> ' + esc(info.TrainerName) + ' (@' + esc(info.TrainerUsername) + ')</div>' +\n                    '<div><strong>Outlet:</strong> ' + esc(info.OutletNameSnapshot || 'Belum diisi') + '</div>' +\n                    '<div><strong>Tanggal Pemeriksaan:</strong> ' + esc(info.InspectionDate) + '</div>' +\n                    '<div><strong>AM:</strong> ' + esc(info.AM_Name_Snapshot || 'Belum dipilih') + '</div>' +\n                    '<div><strong>MUM:</strong> ' + esc(info.MUM_Name_Snapshot || 'Belum dipilih') + '</div>' +\n                    '<div><strong>PIC:</strong> ' + esc(info.PIC_Name || 'Belum diisi') + '</div>' +\n                    '<div><strong>Waktu Dibuat:</strong> ' + esc(info.CreatedAt) + '</div>' +\n                    '<div><strong>Terakhir Diperbarui:</strong> ' + esc(info.UpdatedAt) + '</div>' +\n                    '<div><strong>Umur Draft:</strong> ' + esc(info.RelativeAge) + '</div>' +\n                    '<div><strong>Status:</strong> <span class=\"badge badge-warning\">' + esc(info.Status) + '</span></div>' +\n                  '</div>';\n              } else if (activeSubTab === 'FINDINGS') {\n                if (findings.length === 0) {\n                  box.innerHTML = '<p class=\"form-hint\">Belum ada temuan dalam Draft ini.</p>';\n                  return;\n                }\n                box.innerHTML = findings.map(function (f, i) {\n                  return (\n                    '<div class=\"card\" style=\"background:var(--bg-app);margin-bottom:10px;\">' +\n                      '<div class=\"card-header\" style=\"margin-bottom:6px;\">' +\n                        '<strong>#' + (i + 1) + ' ' + esc(f.CategoryNameSnapshot || 'Category kosong') + ' • ' + esc(f.SectionNameSnapshot || 'Section kosong') + '</strong>' +\n                        (f.IsComplete ? '<span class=\"badge badge-success\">Lengkap</span>' : '<span class=\"badge badge-warning\">Belum Lengkap</span>') +\n                      '</div>' +\n                      '<div style=\"font-size:13px;\"><strong>Masalah:</strong> ' + esc(f.Masalah || '-') + '</div>' +\n                      '<div style=\"font-size:13px;\"><strong>Mengapa:</strong> ' + esc(f.Mengapa || '-') + '</div>' +\n                      '<div style=\"font-size:13px;\"><strong>Solusi:</strong> ' + esc(f.Solusi || '-') + '</div>' +\n                      '<div class=\"form-hint\">Foto terunggah: ' + f.UploadedPhotoCount + '</div>' +\n                    '</div>'\n                  );\n                }).join('');\n              } else {\n                if (photos.length === 0) {\n                  box.innerHTML = '<p class=\"form-hint\">Belum ada foto bukti dalam Draft ini.</p>';\n                  return;\n                }\n                box.innerHTML = '<div style=\"display:flex;flex-wrap:wrap;gap:8px;\">' + photos.map(function (ph, pIdx) {\n                  return (\n                    '<button type=\"button\" class=\"btn btn-sm btn-secondary\" data-ddphoto=\"' + pIdx + '\">' +\n                      '📷 ' + esc(ph.FileName) + ' (' + esc(ph.Status) + ')' + (ph.PhotoComment ? ' — ' + esc(ph.PhotoComment) : '') +\n                    '</button>'\n                  );\n                }).join('') + '</div>';\n\n                box.querySelectorAll('[data-ddphoto]').forEach(function (b) {\n                  b.addEventListener('click', function () {\n                    window.TM_PHOTO.openLightboxGallery(photos, parseInt(b.getAttribute('data-ddphoto'), 10));\n                  });\n                });\n              }\n            }\n\n            document.getElementById('dd-tabs').querySelectorAll('.tab-btn').forEach(function (tb) {\n              tb.addEventListener('click', function () {\n                activeSubTab = tb.getAttribute('data-ddtab');\n                document.getElementById('dd-tabs').querySelectorAll('.tab-btn').forEach(function (x) {\n                  x.classList.toggle('active', x.getAttribute('data-ddtab') === activeSubTab);\n                });\n                drawSubTab();\n              });\n            });\n\n            var delBtn = document.getElementById('dd-btn-delete');\n            if (delBtn) {\n              delBtn.addEventListener('click', function () {\n                openAdminDeleteDraftDialog(info, closeDetail);\n              });\n            }\n\n            drawSubTab();\n          }).catch(function (err) {\n            window.TM_APP.showToast(err.message, 'error');\n          });\n      }\n\n      /* ==================== DIALOG HAPUS DRAFT (PRD 7.7) ==================== */\n      function openAdminDeleteDraftDialog(draftItem, prevCloseFn) {\n        if (prevCloseFn) prevCloseFn();\n        var html =\n          '<div class=\"alert alert-error\">' +\n            '<strong>Peringatan Penghapusan Draft:</strong> Draft yang dihapus akan dikunci pada perangkat Trainer dan hanya dapat dipulihkan melalui persetujuan permintaan pemulihan.' +\n          '</div>' +\n          '<div style=\"font-size:13px;margin-bottom:12px;\">' +\n            '<div><strong>Identitas Draft:</strong> <code>' + esc(draftItem.SessionID) + '</code></div>' +\n            '<div><strong>Trainer:</strong> ' + esc(draftItem.TrainerName) + '</div>' +\n            '<div><strong>Outlet:</strong> ' + esc(draftItem.OutletNameSnapshot || 'Outlet belum diisi') + '</div>' +\n            '<div><strong>Tanggal Pemeriksaan:</strong> ' + esc(draftItem.InspectionDate) + '</div>' +\n          '</div>' +\n          '<div id=\"add-alert\"></div>' +\n          '<form id=\"add-form\">' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Alasan Penghapusan (Wajib)</label>' +\n              '<textarea id=\"add-reason\" class=\"form-control\" rows=\"2\" placeholder=\"Masukkan alasan penghapusan Draft...\" required></textarea>' +\n            '</div>' +\n            '<div class=\"modal-footer\">' +\n              '<button type=\"button\" class=\"btn btn-secondary\" id=\"add-cancel\">Batal</button>' +\n              '<button type=\"submit\" class=\"btn btn-danger\" id=\"add-confirm\">Hapus</button>' +\n            '</div>' +\n          '</form>';\n\n        var close = window.TM_APP.openModal('Hapus Draft Pemeriksaan', html);\n        document.getElementById('add-cancel').addEventListener('click', close);\n        document.getElementById('add-form').addEventListener('submit', function (e) {\n          e.preventDefault();\n          var btn = document.getElementById('add-confirm');\n          btn.disabled = true;\n          btn.textContent = 'Menghapus...';\n\n          window.TM_API.callRpc('api_adminDeleteDraft', window.TM_API.getToken(), draftItem.SessionID, document.getElementById('add-reason').value)\n            .then(function () {\n              window.TM_APP.showToast('Draft dihapus & notifikasi telah dikirim ke Trainer.', 'success');\n              close();\n              loadMonitoring();\n            })\n            .catch(function (err) {\n              document.getElementById('add-alert').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n              btn.disabled = false;\n              btn.textContent = 'Hapus';\n            });\n        });\n      }\n\n      /* ==================== PERMINTAAN PEMULIHAN DRAFT (PRD 7.9) ==================== */\n      function loadRestoreRequests() {\n        var body = document.getElementById('dm-body');\n        body.innerHTML = '<p class=\"form-hint\">Memuat daftar permintaan pemulihan...</p>';\n        window.TM_API.callRpc('api_listDraftRestoreRequests', window.TM_API.getToken())\n          .then(function (data) {\n            restoreData = data;\n            drawRestoreRequests();\n          })\n          .catch(function (err) {\n            body.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          });\n      }\n\n      function renderRequestGroup(title, badgeClass, list, isPending) {\n        var content = (!list || list.length === 0)\n          ? '<p class=\"form-hint\" style=\"margin:0;\">Tidak ada permintaan pada kelompok ini.</p>'\n          : list.map(function (r) {\n              return (\n                '<div class=\"mobile-item-card\" style=\"margin-bottom:8px;\">' +\n                  '<div class=\"mobile-item-row\">' +\n                    '<div><strong>Draft ' + esc(r.SessionID) + ' — ' + esc(r.OutletName) + '</strong><div class=\"form-hint\">Trainer: ' + esc(r.TrainerName) + ' • Diajukan: ' + esc(r.RequestedAt) + '</div></div>' +\n                    '<span class=\"badge ' + badgeClass + '\">' + esc(r.Status) + '</span>' +\n                  '</div>' +\n                  '<div style=\"font-size:13px;\"><strong>Alasan Pengajuan:</strong> ' + esc(r.RequestReason) + '</div>' +\n                  (r.ProcessedAt ? '<div class=\"form-hint\">Diproses oleh ' + esc(r.ProcessedByName) + ' pada ' + esc(r.ProcessedAt) + ' — Alasan Keputusan: ' + esc(r.DecisionReason) + '</div>' : '') +\n                  (isPending\n                    ? '<div class=\"mobile-item-actions\">' +\n                        '<button class=\"btn btn-sm btn-primary\" data-rract=\"Disetujui\" data-id=\"' + esc(r.RequestID) + '\">Setujui Pemulihan</button>' +\n                        '<button class=\"btn btn-sm btn-danger\" data-rract=\"Ditolak\" data-id=\"' + esc(r.RequestID) + '\">Tolak</button>' +\n                      '</div>'\n                    : '') +\n                '</div>'\n              );\n            }).join('');\n\n        return (\n          '<div class=\"card\">' +\n            '<div class=\"card-header\"><h3 class=\"card-title\">' + esc(title) + ' (' + (list ? list.length : 0) + ')</h3></div>' +\n            content +\n          '</div>'\n        );\n      }\n\n      function drawRestoreRequests() {\n        var body = document.getElementById('dm-body');\n        body.innerHTML =\n          renderRequestGroup('1. Menunggu Keputusan (Terlama di Atas)', 'badge-warning', restoreData.menunggu, true) +\n          renderRequestGroup('2. Disetujui', 'badge-success', restoreData.disetujui, false) +\n          renderRequestGroup('3. Ditolak', 'badge-danger', restoreData.ditolak, false);\n\n        body.querySelectorAll('button[data-rract]').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            var reqId = btn.getAttribute('data-id');\n            var decision = btn.getAttribute('data-rract');\n            openProcessRestoreModal(reqId, decision);\n          });\n        });\n      }\n\n      function openProcessRestoreModal(requestId, decision) {\n        var html =\n          '<p>Anda akan memberikan keputusan <strong>' + esc(decision) + '</strong> untuk permintaan pemulihan <code>' + esc(requestId) + '</code>.</p>' +\n          '<div id=\"pr-alert\"></div>' +\n          '<form id=\"pr-form\">' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Alasan Keputusan (Wajib)</label>' +\n              '<textarea id=\"pr-reason\" class=\"form-control\" rows=\"2\" required></textarea>' +\n            '</div>' +\n            '<div class=\"modal-footer\">' +\n              '<button type=\"button\" class=\"btn btn-secondary\" id=\"pr-cancel\">Batal</button>' +\n              '<button type=\"submit\" class=\"btn ' + (decision === 'Disetujui' ? 'btn-primary' : 'btn-danger') + '\" id=\"pr-save\">' + esc(decision) + '</button>' +\n            '</div>' +\n          '</form>';\n\n        var close = window.TM_APP.openModal('Keputusan Pemulihan Draft', html);\n        document.getElementById('pr-cancel').addEventListener('click', close);\n        document.getElementById('pr-form').addEventListener('submit', function (e) {\n          e.preventDefault();\n          var btn = document.getElementById('pr-save');\n          btn.disabled = true;\n          window.TM_API.callRpc('api_processDraftRestoreRequest', window.TM_API.getToken(), requestId, decision, document.getElementById('pr-reason').value)\n            .then(function () {\n              window.TM_APP.showToast('Keputusan pemulihan berhasil disimpan.', 'success');\n              close();\n              loadRestoreRequests();\n            })\n            .catch(function (err) {\n              document.getElementById('pr-alert').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n              btn.disabled = false;\n            });\n        });\n      }\n\n      loadMonitoring();\n    }\n\n    return {\n      renderMonitoringDraftsView: renderMonitoringDraftsView\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_VIEWS_REPORTING = (function () {\n    function esc(s) {\n      return window.TM_APP.escapeHtml(s);\n    }\n\n    function downloadBase64File(base64Data, mimeType, fileName) {\n      var byteChars = atob(base64Data);\n      var byteNumbers = new Array(byteChars.length);\n      for (var i = 0; i < byteChars.length; i++) {\n        byteNumbers[i] = byteChars.charCodeAt(i);\n      }\n      var byteArray = new Uint8Array(byteNumbers);\n      var blob = new Blob([byteArray], { type: mimeType });\n      var url = URL.createObjectURL(blob);\n      var a = document.createElement('a');\n      a.href = url;\n      a.download = fileName;\n      document.body.appendChild(a);\n      a.click();\n      setTimeout(function () {\n        document.body.removeChild(a);\n        URL.revokeObjectURL(url);\n      }, 400);\n    }\n\n    function downloadTextFile(content, mimeType, fileName) {\n      var blob = new Blob([content], { type: mimeType || 'text/csv;charset=utf-8;' });\n      var url = URL.createObjectURL(blob);\n      var a = document.createElement('a');\n      a.href = url;\n      a.download = fileName;\n      document.body.appendChild(a);\n      a.click();\n      setTimeout(function () {\n        document.body.removeChild(a);\n        URL.revokeObjectURL(url);\n      }, 400);\n    }\n\n    /**\n     * Membuka Modal PDF Sesi (A4), Pengiriman Email Satu Penerima, & Riwayat Versi/Pengiriman (PRD Bagian 11).\n     */\n    function openSessionPdfModal(sessionId, trainerIdOfSession) {\n      var user = window.TM_APP.getCurrentUser();\n      var canSendEmail = user && (user.Role === 'SUPER_ADMIN' || (user.Role === 'TRAINER' && user.UserID === trainerIdOfSession));\n\n      window.TM_APP.openModal('PDF Sesi Pemeriksaan & Pengiriman Email', '<p class=\"form-hint\">Memuat riwayat PDF &amp; pengiriman email...</p>');\n\n      function loadModalContent() {\n        window.TM_API.callRpc('api_getSessionPdfHistory', window.TM_API.getToken(), sessionId)\n          .then(function (hist) {\n            var root = document.getElementById('modal-root');\n            if (!root) return;\n            var bodyBox = root.querySelector('.modal-dialog > div:last-child');\n            if (!bodyBox) return;\n\n            var versionsHtml = (hist.pdfVersions || []).length === 0\n              ? '<p class=\"form-hint\" style=\"margin:0;\">Belum ada versi PDF yang dibuat untuk sesi ini.</p>'\n              : '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>Versi</th><th>Waktu Generate</th><th>Penerima</th><th>Status</th></tr></thead><tbody>' +\n                hist.pdfVersions.map(function (v) {\n                  return '<tr><td><strong>v' + esc(v.VersionNumber) + '</strong></td><td>' + esc(v.GeneratedAt) + '</td><td>' + esc(v.RecipientEmail || '-') + '</td><td><span class=\"badge badge-neutral\">' + esc(v.SendStatus) + '</span></td></tr>';\n                }).join('') +\n                '</tbody></table></div>';\n\n            var emailLogsHtml = (hist.emailLogs || []).length === 0\n              ? '<p class=\"form-hint\" style=\"margin:0;\">Belum ada riwayat pengiriman email.</p>'\n              : '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>Waktu</th><th>Email Penerima</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>' +\n                hist.emailLogs.map(function (e) {\n                  var bClass = e.Status === 'Berhasil' ? 'badge-success' : (e.Status === 'Gagal' ? 'badge-danger' : 'badge-warning');\n                  return '<tr><td>' + esc(e.AttemptAt) + '</td><td>' + esc(e.Recipient) + '</td><td><span class=\"badge ' + bClass + '\">' + esc(e.Status) + '</span></td><td>' + esc(e.FailureReason || '-') + '</td></tr>';\n                }).join('') +\n                '</tbody></table></div>';\n\n            bodyBox.innerHTML =\n              '<div id=\"pdf-modal-alert\"></div>' +\n              '<div class=\"card\" style=\"background:var(--bg-app);margin-bottom:12px;\">' +\n                '<div class=\"card-header\" style=\"margin-bottom:6px;\">' +\n                  '<strong>Unduh Laporan PDF Sesi (Format A4)</strong>' +\n                  '<button type=\"button\" class=\"btn btn-sm btn-primary\" id=\"btn-gen-session-pdf\">📄 Generate &amp; Unduh PDF A4</button>' +\n                '</div>' +\n                '<div class=\"form-hint\">Setiap pembuatan PDF menghasilkan nomor versi baru sesuai data dan pengaturan logo/perusahaan terbaru.</div>' +\n              '</div>' +\n              (canSendEmail\n                ? '<div class=\"card\" style=\"margin-bottom:12px;\">' +\n                    '<h4 style=\"margin:0 0 8px;\">Kirim / Kirim Ulang PDF via Email (1 Penerima)</h4>' +\n                    '<div class=\"form-group\">' +\n                      '<label class=\"form-label\">Alamat Email Penerima *</label>' +\n                      '<input type=\"email\" id=\"pdf-email-to\" class=\"form-control\" value=\"' + esc(hist.defaultRecipientEmail || '') + '\" placeholder=\"contoh@perusahaan.id\">' +\n                      '<div class=\"form-hint\">Terisi otomatis dari email akun Trainer. Hanya mendukung 1 alamat penerima (tanpa CC).</div>' +\n                    '</div>' +\n                    '<div style=\"display:flex;gap:8px;justify-content:flex-end;\">' +\n                      '<button type=\"button\" class=\"btn btn-sm btn-secondary\" id=\"btn-resend-pdf-email\">Kirim Ulang</button>' +\n                      '<button type=\"button\" class=\"btn btn-sm btn-primary\" id=\"btn-send-pdf-email\">✉️ Kirim Email PDF</button>' +\n                    '</div>' +\n                  '</div>'\n                : '') +\n              '<div style=\"margin-bottom:12px;\"><h4 style=\"margin:0 0 6px;\">Riwayat Pengiriman Email</h4>' + emailLogsHtml + '</div>' +\n              '<div><h4 style=\"margin:0 0 6px;\">Riwayat Versi PDF</h4>' + versionsHtml + '</div>';\n\n            var genBtn = document.getElementById('btn-gen-session-pdf');\n            if (genBtn) {\n              genBtn.addEventListener('click', function () {\n                genBtn.disabled = true;\n                genBtn.textContent = 'Membuat PDF...';\n                window.TM_API.callRpc('api_generateSessionPdf', window.TM_API.getToken(), sessionId)\n                  .then(function (res) {\n                    downloadBase64File(res.base64Data, res.mimeType, res.fileName);\n                    window.TM_APP.showToast('PDF Sesi berhasil dibuat (' + res.fileName + ').', 'success');\n                    loadModalContent();\n                  })\n                  .catch(function (err) {\n                    window.TM_APP.showToast(err.message, 'error');\n                    genBtn.disabled = false;\n                    genBtn.textContent = '📄 Generate & Unduh PDF A4';\n                  });\n              });\n            }\n\n            function triggerSendEmail(isResend) {\n              var emailInput = document.getElementById('pdf-email-to');\n              var emailVal = emailInput ? emailInput.value : '';\n              var alertBox = document.getElementById('pdf-modal-alert');\n              if (alertBox) alertBox.innerHTML = '';\n\n              window.TM_API.callRpc('api_sendSessionPdfEmail', window.TM_API.getToken(), sessionId, emailVal, isResend)\n                .then(function (res) {\n                  if (res.status === 'Berhasil') {\n                    window.TM_APP.showToast('Email PDF berhasil dikirim ke ' + res.emailLog.Recipient, 'success');\n                  } else {\n                    window.TM_APP.showToast('Pengiriman email gagal: ' + (res.failureReason || 'Silakan coba kirim ulang.'), 'error');\n                  }\n                  loadModalContent();\n                })\n                .catch(function (err) {\n                  if (alertBox) alertBox.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n                  else window.TM_APP.showToast(err.message, 'error');\n                });\n            }\n\n            var sendBtn = document.getElementById('btn-send-pdf-email');\n            if (sendBtn) sendBtn.addEventListener('click', function () { triggerSendEmail(false); });\n            var resendBtn = document.getElementById('btn-resend-pdf-email');\n            if (resendBtn) resendBtn.addEventListener('click', function () { triggerSendEmail(true); });\n          })\n          .catch(function (err) {\n            window.TM_APP.showToast(err.message, 'error');\n          });\n      }\n\n      loadModalContent();\n    }\n\n    /**\n     * Membuka Modal Ekspor Laporan & Data pada Dashboard (mengikuti filter aktif — PRD Bagian 11.1 & 12).\n     */\n    function openDashboardExportModal(currentFilters) {\n      var html =\n        '<p class=\"form-hint\" style=\"margin-top:0;\">Seluruh ekspor mengikuti filter aktif pada Dashboard dan mengecualikan Draft maupun data yang telah dihapus.</p>' +\n        '<div class=\"card\" style=\"margin-bottom:12px;\">' +\n          '<h4 style=\"margin:0 0 8px;\">1. Laporan PDF (A4)</h4>' +\n          '<div style=\"display:flex;gap:8px;flex-wrap:wrap;\">' +\n            '<button type=\"button\" class=\"btn btn-sm btn-primary\" data-exp-pdf=\"SUMMARY\">📄 Summary Report (PDF)</button>' +\n            '<button type=\"button\" class=\"btn btn-sm btn-primary\" data-exp-pdf=\"FULL\">📑 Full Report Lengkap + Foto (PDF)</button>' +\n          '</div>' +\n        '</div>' +\n        '<div class=\"card\" style=\"margin-bottom:12px;\">' +\n          '<h4 style=\"margin:0 0 8px;\">2. Ekspor Microsoft Excel (.xlsx)</h4>' +\n          '<div style=\"display:flex;gap:8px;flex-wrap:wrap;\">' +\n            '<button type=\"button\" class=\"btn btn-sm btn-secondary\" data-exp-data=\"EXCEL:SIMPLE\">📊 Excel Simple (1 Tabel Gabungan)</button>' +\n            '<button type=\"button\" class=\"btn btn-sm btn-secondary\" data-exp-data=\"EXCEL:STRUCTURED\">📗 Excel Structured (5 Worksheet Lengkap)</button>' +\n          '</div>' +\n        '</div>' +\n        '<div class=\"card\" style=\"margin-bottom:0;\">' +\n          '<h4 style=\"margin:0 0 8px;\">3. Ekspor CSV (.csv)</h4>' +\n          '<div style=\"display:flex;gap:8px;flex-wrap:wrap;\">' +\n            '<button type=\"button\" class=\"btn btn-sm btn-secondary\" data-exp-data=\"CSV:SIMPLE\">📄 CSV Simple (1 File Gabungan)</button>' +\n            '<button type=\"button\" class=\"btn btn-sm btn-secondary\" data-exp-data=\"CSV:STRUCTURED\">🗂️ CSV Structured (5 File Terpisah)</button>' +\n          '</div>' +\n        '</div>';\n\n      window.TM_APP.openModal('Ekspor Laporan & Data Dashboard', html);\n      var root = document.getElementById('modal-root');\n\n      root.querySelectorAll('[data-exp-pdf]').forEach(function (btn) {\n        btn.addEventListener('click', function () {\n          var rType = btn.getAttribute('data-exp-pdf');\n          btn.disabled = true;\n          window.TM_API.callRpc('api_generateDashboardReportPdf', window.TM_API.getToken(), rType, currentFilters || {})\n            .then(function (res) {\n              downloadBase64File(res.base64Data, res.mimeType, res.fileName);\n              window.TM_APP.showToast('Laporan PDF ' + rType + ' berhasil diunduh.', 'success');\n              btn.disabled = false;\n            })\n            .catch(function (err) {\n              window.TM_APP.showToast(err.message, 'error');\n              btn.disabled = false;\n            });\n        });\n      });\n\n      root.querySelectorAll('[data-exp-data]').forEach(function (btn) {\n        btn.addEventListener('click', function () {\n          var parts = btn.getAttribute('data-exp-data').split(':');\n          var fmt = parts[0];\n          var mode = parts[1];\n          btn.disabled = true;\n          window.TM_API.callRpc('api_exportData', window.TM_API.getToken(), fmt, mode, currentFilters || {})\n            .then(function (res) {\n              if (res.format === 'EXCEL') {\n                downloadBase64File(res.base64Data, res.mimeType, res.fileName);\n                window.TM_APP.showToast('File Excel (' + res.mode + ') berhasil diunduh.', 'success');\n              } else if (res.format === 'CSV' && Array.isArray(res.files)) {\n                res.files.forEach(function (f, idx) {\n                  setTimeout(function () {\n                    downloadTextFile(f.csvContent, f.mimeType, f.fileName);\n                  }, idx * 200);\n                });\n                window.TM_APP.showToast(res.files.length + ' file CSV (' + res.mode + ') berhasil diunduh.', 'success');\n              }\n              btn.disabled = false;\n            })\n            .catch(function (err) {\n              window.TM_APP.showToast(err.message, 'error');\n              btn.disabled = false;\n            });\n        });\n      });\n    }\n\n    return {\n      openSessionPdfModal: openSessionPdfModal,\n      openDashboardExportModal: openDashboardExportModal\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_VIEWS_NOTIFICATIONS = (function () {\n    function esc(s) {\n      return window.TM_APP.escapeHtml(s);\n    }\n\n    function renderNotificationCenterView(container) {\n      var user = window.TM_APP.getCurrentUser();\n      var activeTab = 'INBOX'; // INBOX | PREFERENCES | ADMIN_MONITOR\n      var statusFilter = 'ALL'; // ALL | UNREAD | READ\n\n      function drawShell() {\n        container.innerHTML =\n          '<div class=\"tabs-bar\" id=\"ntf-tabs\">' +\n            '<button class=\"tab-btn' + (activeTab === 'INBOX' ? ' active' : '') + '\" data-ntab=\"INBOX\">1. Pusat Notifikasi</button>' +\n            '<button class=\"tab-btn' + (activeTab === 'PREFERENCES' ? ' active' : '') + '\" data-ntab=\"PREFERENCES\">2. Preferensi Notifikasi Saya</button>' +\n            (user && user.Role === 'SUPER_ADMIN'\n              ? '<button class=\"tab-btn' + (activeTab === 'ADMIN_MONITOR' ? ' active' : '') + '\" data-ntab=\"ADMIN_MONITOR\">3. Kebijakan Wajib &amp; Monitor Email</button>'\n              : '') +\n          '</div>' +\n          '<div id=\"ntf-body\"><p class=\"form-hint\">Memuat...</p></div>';\n\n        container.querySelectorAll('#ntf-tabs .tab-btn').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            activeTab = btn.getAttribute('data-ntab');\n            drawShell();\n          });\n        });\n\n        var body = document.getElementById('ntf-body');\n        if (activeTab === 'INBOX') renderInboxTab(body);\n        else if (activeTab === 'PREFERENCES') renderPreferencesTab(body);\n        else if (activeTab === 'ADMIN_MONITOR') renderAdminMonitorTab(body);\n      }\n\n      function renderInboxTab(body) {\n        window.TM_API.callRpc('api_listMyNotificationsCenter', window.TM_API.getToken(), { status: statusFilter })\n          .then(function (res) {\n            var items = res.items || [];\n            var listHtml = items.length === 0\n              ? '<p class=\"form-hint\" style=\"margin:0;\">Tidak ada notifikasi pada filter ini.</p>'\n              : items.map(function (n) {\n                  var isRead = Boolean(n.ReadAt);\n                  return (\n                    '<div class=\"mobile-item-card\" style=\"background:' + (isRead ? 'var(--bg-surface)' : 'var(--primary-soft)') + ';\">' +\n                      '<div class=\"mobile-item-row\">' +\n                        '<div><strong>' + esc(n.Title) + '</strong> <span class=\"badge badge-neutral\">' + esc(n.Type) + '</span></div>' +\n                        (isRead ? '<span class=\"badge badge-neutral\">Dibaca</span>' : '<span class=\"badge badge-primary\">Belum Dibaca</span>') +\n                      '</div>' +\n                      '<div style=\"font-size:13px;margin:6px 0;\">' + esc(n.Message) + '</div>' +\n                      '<div style=\"display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;\">' +\n                        '<span class=\"form-hint\">' + esc(n.CreatedAt) + (n.ReadAt ? ' • Dibaca: ' + esc(n.ReadAt) : '') + '</span>' +\n                        '<div style=\"display:flex;gap:6px;\">' +\n                          (isRead\n                            ? '<button class=\"btn btn-sm btn-secondary\" data-ntoggle=\"' + esc(n.NotificationID) + '\" data-read=\"false\">Tandai Belum Dibaca</button>'\n                            : '<button class=\"btn btn-sm btn-primary\" data-ntoggle=\"' + esc(n.NotificationID) + '\" data-read=\"true\">Tandai Dibaca</button>') +\n                        '</div>' +\n                      '</div>' +\n                    '</div>'\n                  );\n                }).join('');\n\n            body.innerHTML =\n              '<div class=\"card\">' +\n                '<div class=\"card-header\">' +\n                  '<div style=\"display:flex;align-items:center;gap:8px;flex-wrap:wrap;\">' +\n                    '<h2 class=\"card-title\">Kotak Masuk Notifikasi</h2>' +\n                    '<span class=\"badge badge-danger\">' + res.unreadCount + ' Belum Dibaca</span>' +\n                  '</div>' +\n                  '<div style=\"display:flex;gap:6px;flex-wrap:wrap;\">' +\n                    '<button class=\"btn btn-sm ' + (statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary') + '\" data-nflt=\"ALL\">Semua (' + res.totalCount + ')</button>' +\n                    '<button class=\"btn btn-sm ' + (statusFilter === 'UNREAD' ? 'btn-primary' : 'btn-secondary') + '\" data-nflt=\"UNREAD\">Belum Dibaca</button>' +\n                    '<button class=\"btn btn-sm ' + (statusFilter === 'READ' ? 'btn-primary' : 'btn-secondary') + '\" data-nflt=\"READ\">Sudah Dibaca</button>' +\n                    (res.unreadCount > 0 ? '<button class=\"btn btn-sm btn-ghost\" id=\"btn-mark-all-read\">✓ Tandai Semua Dibaca</button>' : '') +\n                  '</div>' +\n                '</div>' +\n                '<div style=\"display:flex;flex-direction:column;gap:8px;\">' + listHtml + '</div>' +\n              '</div>';\n\n            body.querySelectorAll('[data-nflt]').forEach(function (btn) {\n              btn.addEventListener('click', function () {\n                statusFilter = btn.getAttribute('data-nflt');\n                renderInboxTab(body);\n              });\n            });\n\n            var markAllBtn = document.getElementById('btn-mark-all-read');\n            if (markAllBtn) {\n              markAllBtn.addEventListener('click', function () {\n                window.TM_API.callRpc('api_markAllMyNotificationsRead', window.TM_API.getToken())\n                  .then(function () {\n                    window.TM_APP.refreshHeaderCounters();\n                    renderInboxTab(body);\n                  });\n              });\n            }\n\n            body.querySelectorAll('[data-ntoggle]').forEach(function (btn) {\n              btn.addEventListener('click', function () {\n                var id = btn.getAttribute('data-ntoggle');\n                var nextRead = btn.getAttribute('data-read') === 'true';\n                window.TM_API.callRpc('api_setNotificationReadStatus', window.TM_API.getToken(), id, nextRead)\n                  .then(function () {\n                    window.TM_APP.refreshHeaderCounters();\n                    renderInboxTab(body);\n                  });\n              });\n            });\n          })\n          .catch(function (err) {\n            body.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          });\n      }\n\n      function renderPreferencesTab(body) {\n        window.TM_API.callRpc('api_getMyNotificationPreferences', window.TM_API.getToken())\n          .then(function (res) {\n            var prefs = res.preferences || [];\n            var rowsHtml = prefs.map(function (p) {\n              var badge = p.systemLockedMandatory\n                ? '<span class=\"badge badge-danger\">Wajib Kritis (Terkunci)</span>'\n                : (p.isMandatory ? '<span class=\"badge badge-warning\">Wajib Organisasi</span>' : '<span class=\"badge badge-neutral\">Opsional</span>');\n\n              return (\n                '<div class=\"mobile-item-card\">' +\n                  '<div class=\"mobile-item-row\">' +\n                    '<div><strong>' + esc(p.label) + '</strong> ' + badge + '<div class=\"form-hint\">' + esc(p.description) + '</div></div>' +\n                  '</div>' +\n                  '<div style=\"display:flex;gap:16px;align-items:center;margin-top:8px;flex-wrap:wrap;\">' +\n                    '<label style=\"display:flex;align-items:center;gap:6px;font-size:13px;\">' +\n                      '<input type=\"checkbox\" data-pref-inapp=\"' + esc(p.type) + '\"' + (p.inAppEnabled ? ' checked' : '') + (p.isMandatory ? ' disabled' : '') + '> Kanal In-App' +\n                    '</label>' +\n                    '<label style=\"display:flex;align-items:center;gap:6px;font-size:13px;\">' +\n                      '<input type=\"checkbox\" data-pref-email=\"' + esc(p.type) + '\"' + (p.emailEnabled ? ' checked' : '') + (p.systemLockedMandatory ? ' disabled' : '') + '> Kanal Email' +\n                    '</label>' +\n                    '<button type=\"button\" class=\"btn btn-sm btn-secondary\" data-pref-save=\"' + esc(p.type) + '\">Simpan Preferensi</button>' +\n                  '</div>' +\n                '</div>'\n              );\n            }).join('');\n\n            body.innerHTML =\n              '<div class=\"card\">' +\n                '<div class=\"card-header\"><h2 class=\"card-title\">Preferensi Kanal Notifikasi Saya</h2></div>' +\n                '<p class=\"form-hint\" style=\"margin-top:0;\">Notifikasi keamanan dan backup kritis tidak dapat dinonaktifkan. Tidak ada pengingat berkala khusus untuk Draft.</p>' +\n                '<div style=\"display:flex;flex-direction:column;gap:8px;\">' + rowsHtml + '</div>' +\n              '</div>';\n\n            body.querySelectorAll('[data-pref-save]').forEach(function (btn) {\n              btn.addEventListener('click', function () {\n                var t = btn.getAttribute('data-pref-save');\n                var inAppEl = body.querySelector('[data-pref-inapp=\"' + t + '\"]');\n                var emailEl = body.querySelector('[data-pref-email=\"' + t + '\"]');\n                window.TM_API.callRpc('api_updateMyNotificationPreference', window.TM_API.getToken(), {\n                  type: t,\n                  inAppEnabled: inAppEl ? inAppEl.checked : true,\n                  emailEnabled: emailEl ? emailEl.checked : false\n                }).then(function () {\n                  window.TM_APP.showToast('Preferensi notifikasi disimpan.', 'success');\n                  renderPreferencesTab(body);\n                }).catch(function (err) {\n                  window.TM_APP.showToast(err.message, 'error');\n                });\n              });\n            });\n          })\n          .catch(function (err) {\n            body.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          });\n      }\n\n      function renderAdminMonitorTab(body) {\n        Promise.all([\n          window.TM_API.callRpc('api_getMyNotificationPreferences', window.TM_API.getToken()),\n          window.TM_API.callRpc('api_listEmailLogsForAdmin', window.TM_API.getToken(), '')\n        ]).then(function (res) {\n          var prefs = (res[0] && res[0].preferences) || [];\n          var emailLogs = res[1] || [];\n\n          var policyChecks = prefs.map(function (p) {\n            return (\n              '<label style=\"display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-color);\">' +\n                '<input type=\"checkbox\" data-mand-type=\"' + esc(p.type) + '\"' + (p.isMandatory ? ' checked' : '') + (p.systemLockedMandatory ? ' disabled' : '') + '>' +\n                '<span><strong>' + esc(p.label) + '</strong> ' + (p.systemLockedMandatory ? '<span class=\"badge badge-danger\">Terkunci Sistem</span>' : '') + '</span>' +\n              '</label>'\n            );\n          }).join('');\n\n          var logRows = emailLogs.length === 0\n            ? '<tr><td colspan=\"5\">Belum ada catatan pengiriman email.</td></tr>'\n            : emailLogs.map(function (e) {\n                var bClass = e.Status === 'Berhasil' ? 'badge-success' : 'badge-danger';\n                return (\n                  '<tr>' +\n                    '<td>' + esc(e.AttemptAt) + '</td>' +\n                    '<td>' + esc(e.Recipient) + '</td>' +\n                    '<td><code>' + esc(e.SessionID) + '</code></td>' +\n                    '<td><span class=\"badge ' + bClass + '\">' + esc(e.Status) + '</span>' + (e.FailureReason ? '<div class=\"form-hint\">' + esc(e.FailureReason) + '</div>' : '') + '</td>' +\n                    '<td>' +\n                      (e.Status === 'Gagal' ? '<button class=\"btn btn-sm btn-primary\" data-retry-email=\"' + esc(e.EmailLogID) + '\">Coba Kirim Ulang</button>' : '-') +\n                    '</td>' +\n                  '</tr>'\n                );\n              }).join('');\n\n          body.innerHTML =\n            '<div class=\"card\">' +\n              '<div class=\"card-header\">' +\n                '<h3 class=\"card-title\">Kebijakan Notifikasi Wajib (Super Admin)</h3>' +\n                '<button class=\"btn btn-sm btn-primary\" id=\"btn-save-mand-policy\">Simpan Kebijakan Wajib</button>' +\n              '</div>' +\n              '<div>' + policyChecks + '</div>' +\n            '</div>' +\n            '<div class=\"card\">' +\n              '<div class=\"card-header\"><h3 class=\"card-title\">Pemantauan Pengiriman &amp; Kegagalan Email</h3></div>' +\n              '<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>Waktu</th><th>Penerima</th><th>Referensi</th><th>Status &amp; Alasan</th><th>Aksi</th></tr></thead><tbody>' + logRows + '</tbody></table></div>' +\n            '</div>';\n\n          document.getElementById('btn-save-mand-policy').addEventListener('click', function () {\n            var selected = [];\n            body.querySelectorAll('[data-mand-type]').forEach(function (cb) {\n              if (cb.checked) selected.push(cb.getAttribute('data-mand-type'));\n            });\n            window.TM_API.callRpc('api_updateMandatoryNotificationPolicy', window.TM_API.getToken(), selected)\n              .then(function () {\n                window.TM_APP.showToast('Kebijakan notifikasi wajib berhasil diperbarui.', 'success');\n                renderAdminMonitorTab(body);\n              })\n              .catch(function (err) { window.TM_APP.showToast(err.message, 'error'); });\n          });\n\n          body.querySelectorAll('[data-retry-email]').forEach(function (btn) {\n            btn.addEventListener('click', function () {\n              var id = btn.getAttribute('data-retry-email');\n              btn.disabled = true;\n              window.TM_API.callRpc('api_retryFailedEmailLog', window.TM_API.getToken(), id)\n                .then(function (r) {\n                  if (r.status === 'Berhasil') {\n                    window.TM_APP.showToast('Pengiriman ulang email berhasil.', 'success');\n                  } else {\n                    window.TM_APP.showToast('Pengiriman ulang masih gagal: ' + r.failureReason, 'error');\n                  }\n                  renderAdminMonitorTab(body);\n                })\n                .catch(function (err) {\n                  window.TM_APP.showToast(err.message, 'error');\n                  btn.disabled = false;\n                });\n            });\n          });\n        }).catch(function (err) {\n          body.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n        });\n      }\n\n      drawShell();\n    }\n\n    return {\n      renderNotificationCenterView: renderNotificationCenterView\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_VIEWS_BACKUP = (function () {\n    function esc(s) {\n      return window.TM_APP.escapeHtml(s);\n    }\n\n    function formatBytes(bytes) {\n      var n = Number(bytes || 0);\n      if (n < 1024) return n + ' B';\n      if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';\n      return (n / 1048576).toFixed(2) + ' MB';\n    }\n\n    function renderBackupAndArchiveView(container) {\n      var activeTab = 'BACKUPS'; // BACKUPS | PHOTO_ARCHIVE\n\n      function drawShell() {\n        container.innerHTML =\n          '<div class=\"tabs-bar\" id=\"bkp-tabs\">' +\n            '<button class=\"tab-btn' + (activeTab === 'BACKUPS' ? ' active' : '') + '\" data-btab=\"BACKUPS\">1. Backup &amp; Safe Restore</button>' +\n            '<button class=\"tab-btn' + (activeTab === 'PHOTO_ARCHIVE' ? ' active' : '') + '\" data-btab=\"PHOTO_ARCHIVE\">2. Arsip Foto &amp; Purge Manual</button>' +\n          '</div>' +\n          '<div id=\"bkp-body\"><p class=\"form-hint\">Memuat...</p></div>';\n\n        container.querySelectorAll('#bkp-tabs .tab-btn').forEach(function (btn) {\n          btn.addEventListener('click', function () {\n            activeTab = btn.getAttribute('data-btab');\n            drawShell();\n          });\n        });\n\n        var body = document.getElementById('bkp-body');\n        if (activeTab === 'BACKUPS') renderBackupsTab(body);\n        else renderPhotoArchiveTab(body);\n      }\n\n      function renderBackupsTab(body) {\n        window.TM_API.callRpc('api_listBackups', window.TM_API.getToken())\n          .then(function (res) {\n            var items = res.items || [];\n            var retentionDays = res.retentionDays || 90;\n\n            var rowsHtml = items.length === 0\n              ? '<tr><td colspan=\"7\">Belum ada riwayat backup.</td></tr>'\n              : items.map(function (b) {\n                  var isImp = String(b.Important).toUpperCase() === 'TRUE';\n                  var stBadge = b.Status === 'Berhasil'\n                    ? '<span class=\"badge badge-success\">Berhasil</span>'\n                    : (b.Status === 'EXPIRED_CLEANED'\n                      ? '<span class=\"badge badge-neutral\">Dibersihkan (&gt;' + retentionDays + 'h)</span>'\n                      : '<span class=\"badge badge-danger\">' + esc(b.Status) + '</span>');\n\n                  return (\n                    '<tr>' +\n                      '<td><code>' + esc(b.BackupID) + '</code></td>' +\n                      '<td>' + esc(b.BackupDate) + '</td>' +\n                      '<td><span class=\"badge badge-neutral\">' + esc(b.BackupType) + '</span></td>' +\n                      '<td>' + stBadge + '</td>' +\n                      '<td>' + esc(formatBytes(b.Size)) + '</td>' +\n                      '<td>' +\n                        '<label style=\"display:inline-flex;align-items:center;gap:6px;cursor:pointer;\">' +\n                          '<input type=\"checkbox\" data-bimp=\"' + esc(b.BackupID) + '\"' + (isImp ? ' checked' : '') + '>' +\n                          (isImp ? '<span class=\"badge badge-warning\">Important</span>' : '<span class=\"form-hint\">Standar</span>') +\n                        '</label>' +\n                      '</td>' +\n                      '<td>' +\n                        '<div style=\"font-size:12px;margin-bottom:4px;\">' + esc(b.Result) + '</div>' +\n                        (b.Status === 'Berhasil'\n                          ? '<button class=\"btn btn-sm btn-primary\" data-brestore=\"' + esc(b.BackupID) + '\">🔄 Safe Restore</button>'\n                          : '') +\n                      '</td>' +\n                    '</tr>'\n                  );\n                }).join('');\n\n            body.innerHTML =\n              '<div class=\"card\">' +\n                '<div class=\"card-header\">' +\n                  '<div>' +\n                    '<h2 class=\"card-title\">Manajemen Backup &amp; Safe Restore</h2>' +\n                    '<p class=\"form-hint\" style=\"margin:4px 0 0;\">Retensi backup otomatis: ' + retentionDays + ' hari. Backup berlabel <strong>Important</strong> dilindungi dari pembersihan otomatis.</p>' +\n                  '</div>' +\n                  '<div style=\"display:flex;gap:8px;flex-wrap:wrap;\">' +\n                    '<button type=\"button\" class=\"btn btn-sm btn-secondary\" id=\"btn-run-daily-bkp\">⏱️ Backup Harian &amp; Bersihkan Retensi</button>' +\n                    '<button type=\"button\" class=\"btn btn-sm btn-primary\" id=\"btn-new-manual-bkp\">+ Buat Backup Manual</button>' +\n                  '</div>' +\n                '</div>' +\n                '<div class=\"table-wrap\">' +\n                  '<table class=\"data-table\">' +\n                    '<thead><tr><th>ID Backup</th><th>Waktu</th><th>Jenis</th><th>Status</th><th>Ukuran</th><th>Label Important</th><th>Hasil &amp; Aksi</th></tr></thead>' +\n                    '<tbody>' + rowsHtml + '</tbody>' +\n                  '</table>' +\n                '</div>' +\n              '</div>';\n\n            document.getElementById('btn-new-manual-bkp').addEventListener('click', function () {\n              openCreateManualBackupModal(function () { renderBackupsTab(body); });\n            });\n\n            document.getElementById('btn-run-daily-bkp').addEventListener('click', function () {\n              var btn = document.getElementById('btn-run-daily-bkp');\n              btn.disabled = true;\n              window.TM_API.callRpc('api_runDailyAutomatedBackup', window.TM_API.getToken())\n                .then(function (r) {\n                  window.TM_APP.showToast(\n                    'Backup harian selesai (' + r.backup.BackupID + '). Dibersihkan: ' + r.expiredCleanedCount + ' backup lama.',\n                    'success'\n                  );\n                  renderBackupsTab(body);\n                })\n                .catch(function (err) {\n                  window.TM_APP.showToast(err.message, 'error');\n                  btn.disabled = false;\n                });\n            });\n\n            body.querySelectorAll('[data-bimp]').forEach(function (cb) {\n              cb.addEventListener('change', function () {\n                var bid = cb.getAttribute('data-bimp');\n                window.TM_API.callRpc('api_toggleBackupImportant', window.TM_API.getToken(), bid, cb.checked)\n                  .then(function () {\n                    window.TM_APP.showToast('Label Important diperbarui.', 'success');\n                    renderBackupsTab(body);\n                  })\n                  .catch(function (err) {\n                    window.TM_APP.showToast(err.message, 'error');\n                    renderBackupsTab(body);\n                  });\n              });\n            });\n\n            body.querySelectorAll('[data-brestore]').forEach(function (btn) {\n              btn.addEventListener('click', function () {\n                openSafeRestoreModal(btn.getAttribute('data-brestore'), function () {\n                  renderBackupsTab(body);\n                });\n              });\n            });\n          })\n          .catch(function (err) {\n            body.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          });\n      }\n\n      function openCreateManualBackupModal(onDone) {\n        var html =\n          '<form id=\"mbkp-form\">' +\n            '<div class=\"form-group\">' +\n              '<label class=\"form-label\">Keterangan / Catatan Backup</label>' +\n              '<input type=\"text\" id=\"mbkp-desc\" class=\"form-control\" placeholder=\"Contoh: Sebelum penyesuaian Master Data Q4\">' +\n            '</div>' +\n            '<div class=\"form-group\">' +\n              '<label style=\"display:flex;align-items:center;gap:8px;cursor:pointer;\">' +\n                '<input type=\"checkbox\" id=\"mbkp-imp\"> <strong>Tandai sebagai Backup Important</strong> (tidak ikut pembersihan otomatis 90 hari)' +\n              '</label>' +\n            '</div>' +\n            '<div class=\"modal-footer\">' +\n              '<button type=\"button\" class=\"btn btn-secondary\" id=\"mbkp-cancel\">Batal</button>' +\n              '<button type=\"submit\" class=\"btn btn-primary\" id=\"mbkp-submit\">Jalankan Backup</button>' +\n            '</div>' +\n          '</form>';\n        var close = window.TM_APP.openModal('Buat Backup Manual', html);\n        document.getElementById('mbkp-cancel').addEventListener('click', close);\n        document.getElementById('mbkp-form').addEventListener('submit', function (e) {\n          e.preventDefault();\n          var btn = document.getElementById('mbkp-submit');\n          btn.disabled = true;\n          window.TM_API.callRpc('api_createManualBackup', window.TM_API.getToken(), {\n            description: document.getElementById('mbkp-desc').value,\n            important: document.getElementById('mbkp-imp').checked\n          }).then(function (r) {\n            window.TM_APP.showToast('Backup manual berhasil dibuat: ' + r.backup.BackupID, 'success');\n            close();\n            if (onDone) onDone();\n          }).catch(function (err) {\n            window.TM_APP.showToast(err.message, 'error');\n            btn.disabled = false;\n          });\n        });\n      }\n\n      function openSafeRestoreModal(backupId, onRestored) {\n        window.TM_APP.openModal('Safe Restore (8 Langkah Terproteksi)', '<p class=\"form-hint\">Memuat ringkasan paket backup...</p>');\n        window.TM_API.callRpc('api_getBackupSummaryForRestore', window.TM_API.getToken(), backupId)\n          .then(function (info) {\n            var root = document.getElementById('modal-root');\n            if (!root) return;\n            var bodyBox = root.querySelector('.modal-dialog > div:last-child');\n            if (!bodyBox) return;\n            var s = info.summary || {};\n\n            bodyBox.innerHTML =\n              '<div id=\"sr-alert\"></div>' +\n              '<div class=\"alert alert-warning\">' +\n                '<strong>Prosedur 8 Langkah Safe Restore:</strong>' +\n                '<ol style=\"margin:6px 0 0;padding-left:18px;font-size:12.5px;\">' +\n                  '<li>Menampilkan tanggal &amp; ringkasan backup di bawah ini</li>' +\n                  '<li>Membuat <strong>Pre-Restore Backup</strong> secara otomatis sebelum perubahan</li>' +\n                  '<li>Memverifikasi konfirmasi eksplisit Super Admin</li>' +\n                  '<li>Memvalidasi integritas struktur data &amp; versi skema</li>' +\n                  '<li>Memvalidasi keutuhan relasi antar tabel &amp; referensi foto Drive</li>' +\n                  '<li>Menjalankan pemulihan dengan penguncian transaksi (ScriptLock)</li>' +\n                  '<li>Melakukan <strong>rollback otomatis</strong> ke Pre-Restore Backup bila terjadi kegagalan</li>' +\n                  '<li>Mencatat seluruh jejak pada Audit Log secara append-only</li>' +\n                '</ol>' +\n              '</div>' +\n              '<div class=\"card\" style=\"background:var(--bg-app);margin-bottom:12px;font-size:13px;\">' +\n                '<div><strong>ID Backup:</strong> <code>' + esc(info.backupId) + '</code> (' + esc(info.backupType) + ')</div>' +\n                '<div><strong>Tanggal Backup:</strong> ' + esc(info.backupDate) + '</div>' +\n                '<div><strong>Ringkasan Isi:</strong> ' +\n                  (s.usersCount || 0) + ' Pengguna • ' +\n                  (s.outletsCount || 0) + ' Outlet • ' +\n                  (s.sessionsCount || 0) + ' Sesi • ' +\n                  (s.findingsCount || 0) + ' Temuan • ' +\n                  (s.photosCount || 0) + ' Foto' +\n                '</div>' +\n              '</div>' +\n              '<div class=\"form-group\">' +\n                '<label class=\"form-label\">Ketik <code>RESTORE</code> untuk mengonfirmasi pemulihan *</label>' +\n                '<input type=\"text\" id=\"sr-confirm-input\" class=\"form-control\" placeholder=\"RESTORE\">' +\n              '</div>' +\n              '<div class=\"modal-footer\">' +\n                '<button type=\"button\" class=\"btn btn-primary\" id=\"btn-exec-safe-restore\">Jalankan Safe Restore Sekarang</button>' +\n              '</div>';\n\n            document.getElementById('btn-exec-safe-restore').addEventListener('click', function () {\n              var txt = document.getElementById('sr-confirm-input').value;\n              var btn = document.getElementById('btn-exec-safe-restore');\n              btn.disabled = true;\n              window.TM_API.callRpc('api_executeSafeRestore', window.TM_API.getToken(), backupId, {\n                confirmRestore: true,\n                confirmationText: txt\n              }).then(function (res) {\n                window.TM_APP.showToast('Safe Restore berhasil! Pre-restore backup: ' + res.preRestoreBackupId, 'success');\n                document.getElementById('modal-root').innerHTML = '';\n                if (onRestored) onRestored();\n              }).catch(function (err) {\n                document.getElementById('sr-alert').innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n                btn.disabled = false;\n              });\n            });\n          })\n          .catch(function (err) {\n            window.TM_APP.showToast(err.message, 'error');\n          });\n      }\n\n      function renderPhotoArchiveTab(body) {\n        window.TM_API.callRpc('api_listArchivedPhotos', window.TM_API.getToken())\n          .then(function (photos) {\n            var rowsHtml = (!photos || photos.length === 0)\n              ? '<tr><td colspan=\"6\">Tidak ada foto arsip (dari temuan atau sesi yang dihapus).</td></tr>'\n              : photos.map(function (p) {\n                  var statusCell = p.PurgedAt\n                    ? '<span class=\"badge badge-neutral\">Telah Di-Purge (' + esc(p.PurgedAt) + ')</span><div class=\"form-hint\">Alasan: ' + esc(p.PurgeReason) + '</div>'\n                    : (p.ReferencedByRetainedBackups && p.ReferencedByRetainedBackups.length > 0\n                      ? '<span class=\"badge badge-warning\">Ditahan oleh Backup Aktif/Important</span><div class=\"form-hint\">Ref: ' + esc(p.ReferencedByRetainedBackups.join(', ')) + '</div>'\n                      : '<span class=\"badge badge-primary\">Siap Purge Manual</span>');\n\n                  return (\n                    '<tr>' +\n                      '<td><code>' + esc(p.PhotoID) + '</code><div class=\"form-hint\">' + esc(p.FileName) + '</div></td>' +\n                      '<td><strong>' + esc(p.OutletName) + '</strong><div class=\"form-hint\">' + esc(p.InspectionDate) + '</div></td>' +\n                      '<td>' + esc(formatBytes(p.FileSize)) + '</td>' +\n                      '<td>' + esc(p.DeletedAt) + '</td>' +\n                      '<td>' + statusCell + '</td>' +\n                      '<td>' +\n                        (p.CanPurge\n                          ? '<button class=\"btn btn-sm btn-danger\" data-ppurge=\"' + esc(p.PhotoID) + '\">🗑️ Purge Permanen</button>'\n                          : '-') +\n                      '</td>' +\n                    '</tr>'\n                  );\n                }).join('');\n\n            body.innerHTML =\n              '<div class=\"card\">' +\n                '<div class=\"card-header\">' +\n                  '<div>' +\n                    '<h2 class=\"card-title\">Arsip Foto &amp; Purge Manual</h2>' +\n                    '<p class=\"form-hint\" style=\"margin:4px 0 0;\">Foto dari temuan/sesi terhapus disimpan sebagai arsip permanen hingga di-purge manual oleh Super Admin dengan alasan wajib. Foto yang masih direferensikan oleh data aktif atau backup yang dipertahankan tidak dapat di-purge.</p>' +\n                  '</div>' +\n                '</div>' +\n                '<div class=\"table-wrap\">' +\n                  '<table class=\"data-table\">' +\n                    '<thead><tr><th>ID &amp; Nama File</th><th>Outlet &amp; Tanggal</th><th>Ukuran</th><th>Waktu Diarsipkan</th><th>Status Proteksi</th><th>Aksi</th></tr></thead>' +\n                    '<tbody>' + rowsHtml + '</tbody>' +\n                  '</table>' +\n                '</div>' +\n              '</div>';\n\n            body.querySelectorAll('[data-ppurge]').forEach(function (btn) {\n              btn.addEventListener('click', function () {\n                var pid = btn.getAttribute('data-ppurge');\n                window.TM_APP.promptDialog({\n                  variant: 'danger',\n                  title: 'Hapus Permanen Foto Arsip?',\n                  message: 'Foto arsip berikut akan dihapus permanen dari Google Drive.',\n                  highlight: pid,\n                  inputLabel: 'Alasan penghapusan (wajib)',\n                  placeholder: 'Contoh: Foto duplikat / sudah tidak diperlukan',\n                  requiredMessage: 'Alasan penghapusan wajib diisi.',\n                  confirmText: 'Ya, Hapus Permanen'\n                }).then(function (reason) {\n                  if (!reason) return;\n                  window.TM_API.callRpc('api_purgeArchivedPhoto', window.TM_API.getToken(), pid, reason)\n                    .then(function () {\n                      window.TM_APP.showToast('Foto arsip berhasil dihapus permanen.', 'success');\n                      renderPhotoArchiveTab(body);\n                    })\n                    .catch(function (err) {\n                      window.TM_APP.showToast(err.message, 'error');\n                    });\n                });\n              });\n            });\n          })\n          .catch(function (err) {\n            body.innerHTML = '<div class=\"alert alert-error\">' + esc(err.message) + '</div>';\n          });\n      }\n\n      drawShell();\n    }\n\n    return {\n      renderBackupAndArchiveView: renderBackupAndArchiveView\n    };\n  })();\n</script>\n\n  <script>\n  window.TM_APP = (function () {\n    var state = {\n      initialized: false,\n      branding: { companyName: 'Trainer Monitoring', logoDataUrl: '' },\n      user: null,\n      route: 'home',\n      sidebarCollapsed: false,\n      drawerOpen: false,\n      activeDraftsCount: 0,\n      unreadNotifCount: 0\n    };\n\n    function escapeHtml(str) {\n      return String(str === null || str === undefined ? '' : str)\n        .replace(/&/g, '&amp;')\n        .replace(/</g, '&lt;')\n        .replace(/>/g, '&gt;')\n        .replace(/\"/g, '&quot;')\n        .replace(/'/g, '&#39;');\n    }\n\n    function showToast(message, type) {\n      var container = document.getElementById('toast-container');\n      if (!container) return;\n      var el = document.createElement('div');\n      el.className = 'toast' + (type === 'error' ? ' toast-error' : (type === 'success' ? ' toast-success' : ''));\n      el.textContent = message;\n      container.appendChild(el);\n      setTimeout(function () {\n        if (el.parentNode) el.parentNode.removeChild(el);\n      }, 4200);\n    }\n\n    function bindPasswordToggles(rootEl) {\n      var container = rootEl || document;\n      if (!container || !container.querySelectorAll) return;\n      var inputs = container.querySelectorAll('input[type=\"password\"]:not([data-pw-bound=\"1\"])');\n      inputs.forEach(function (inp) {\n        inp.setAttribute('data-pw-bound', '1');\n        var parent = inp.parentNode;\n        if (!parent) return;\n\n        var wrap = document.createElement('div');\n        wrap.className = 'password-field-wrap';\n        parent.insertBefore(wrap, inp);\n        wrap.appendChild(inp);\n\n        var btn = document.createElement('button');\n        btn.type = 'button';\n        btn.className = 'password-toggle-btn';\n        btn.setAttribute('aria-label', 'Lihat atau sembunyikan password');\n        btn.innerHTML = '👁 Lihat';\n\n        btn.addEventListener('click', function (e) {\n          e.preventDefault();\n          var isHidden = inp.getAttribute('type') === 'password';\n          inp.setAttribute('type', isHidden ? 'text' : 'password');\n          btn.innerHTML = isHidden ? '🙈 Sembunyikan' : '👁 Lihat';\n          inp.focus();\n        });\n\n        wrap.appendChild(btn);\n      });\n    }\n\n    function openModal(title, bodyHtml) {\n      var root = document.getElementById('modal-root');\n      root.innerHTML =\n        '<div class=\"modal-backdrop\" id=\"tm-modal-backdrop\">' +\n          '<div class=\"modal-dialog\" role=\"dialog\" aria-modal=\"true\">' +\n            '<div class=\"modal-header\">' +\n              '<h3 class=\"modal-title\">' + escapeHtml(title) + '</h3>' +\n              '<button type=\"button\" class=\"btn btn-sm btn-ghost\" id=\"tm-modal-close\">✕</button>' +\n            '</div>' +\n            '<div>' + bodyHtml + '</div>' +\n          '</div>' +\n        '</div>';\n\n      bindPasswordToggles(root);\n\n      function close() {\n        root.innerHTML = '';\n      }\n      document.getElementById('tm-modal-close').addEventListener('click', close);\n      document.getElementById('tm-modal-backdrop').addEventListener('click', function (e) {\n        if (e.target.id === 'tm-modal-backdrop') close();\n      });\n      return close;\n    }\n\n    /* ==================== KARTU KONFIRMASI MODERN (pengganti confirm/prompt bawaan browser) ==================== */\n    var DIALOG_ICONS = {\n      danger: '🗑',\n      warning: '⚠️',\n      primary: '❔',\n      success: '✓',\n      info: 'ℹ'\n    };\n\n    function buildDialog(opts, withInput) {\n      var o = opts || {};\n      var variant = DIALOG_ICONS[o.variant] ? o.variant : 'primary';\n      var icon = o.icon || DIALOG_ICONS[variant];\n\n      var layer = document.createElement('div');\n      layer.className = 'tm-dialog-layer';\n      layer.innerHTML =\n        '<div class=\"tm-dialog tm-dialog-' + variant + '\" role=\"alertdialog\" aria-modal=\"true\" aria-labelledby=\"tm-dialog-title\">' +\n          '<div class=\"tm-dialog-icon\" aria-hidden=\"true\">' + escapeHtml(icon) + '</div>' +\n          '<h3 class=\"tm-dialog-title\" id=\"tm-dialog-title\">' + escapeHtml(o.title || 'Konfirmasi') + '</h3>' +\n          (o.message ? '<div class=\"tm-dialog-message\">' + escapeHtml(o.message).replace(/\\n/g, '<br>') + '</div>' : '') +\n          (o.highlight ? '<div class=\"tm-dialog-highlight\">' + escapeHtml(o.highlight) + '</div>' : '') +\n          (o.note ? '<div class=\"tm-dialog-note\">' + escapeHtml(o.note) + '</div>' : '') +\n          (withInput\n            ? '<div class=\"tm-dialog-field\">' +\n                (o.inputLabel ? '<label class=\"form-label\" for=\"tm-dialog-input\">' + escapeHtml(o.inputLabel) + '</label>' : '') +\n                '<textarea id=\"tm-dialog-input\" class=\"form-control tm-dialog-input\" rows=\"3\" placeholder=\"' + escapeHtml(o.placeholder || 'Tulis di sini...') + '\">' + escapeHtml(o.defaultValue || '') + '</textarea>' +\n                '<div class=\"tm-dialog-error hidden\" id=\"tm-dialog-error\"></div>' +\n              '</div>'\n            : '') +\n          '<div class=\"tm-dialog-actions\">' +\n            '<button type=\"button\" class=\"btn btn-secondary tm-dialog-btn\" data-act=\"cancel\">' + escapeHtml(o.cancelText || 'Batal') + '</button>' +\n            '<button type=\"button\" class=\"btn ' + (variant === 'danger' ? 'btn-danger' : 'btn-primary') + ' tm-dialog-btn\" data-act=\"ok\">' + escapeHtml(o.confirmText || 'Ya, Lanjutkan') + '</button>' +\n          '</div>' +\n        '</div>';\n      document.body.appendChild(layer);\n      // trigger animasi masuk\n      requestAnimationFrame(function () { layer.classList.add('show'); });\n      return layer;\n    }\n\n    function closeDialog(layer) {\n      layer.classList.remove('show');\n      setTimeout(function () {\n        if (layer.parentNode) layer.parentNode.removeChild(layer);\n      }, 180);\n    }\n\n    /**\n     * Kartu konfirmasi modern. Mengembalikan Promise<boolean>.\n     * opts: { title, message, highlight, note, confirmText, cancelText, variant: 'danger'|'warning'|'primary'|'success'|'info' }\n     */\n    function confirmDialog(opts) {\n      return new Promise(function (resolve) {\n        var layer = buildDialog(opts, false);\n        var done = false;\n        function finish(val) {\n          if (done) return;\n          done = true;\n          document.removeEventListener('keydown', onKey, true);\n          closeDialog(layer);\n          resolve(val);\n        }\n        function onKey(e) {\n          if (e.key === 'Escape') { e.preventDefault(); finish(false); }\n          else if (e.key === 'Enter') { e.preventDefault(); finish(true); }\n        }\n        layer.querySelector('[data-act=\"ok\"]').addEventListener('click', function () { finish(true); });\n        layer.querySelector('[data-act=\"cancel\"]').addEventListener('click', function () { finish(false); });\n        layer.addEventListener('click', function (e) { if (e.target === layer) finish(false); });\n        document.addEventListener('keydown', onKey, true);\n        setTimeout(function () {\n          var okBtn = layer.querySelector('[data-act=\"ok\"]');\n          if (okBtn) okBtn.focus();\n        }, 60);\n      });\n    }\n\n    /**\n     * Kartu input alasan modern. Mengembalikan Promise<string|null> (null jika dibatalkan).\n     * opts: { title, message, inputLabel, placeholder, required (default true), confirmText, variant }\n     */\n    function promptDialog(opts) {\n      var o = opts || {};\n      var required = o.required !== false;\n      return new Promise(function (resolve) {\n        var layer = buildDialog(o, true);\n        var input = layer.querySelector('#tm-dialog-input');\n        var errBox = layer.querySelector('#tm-dialog-error');\n        var done = false;\n        function finish(val) {\n          if (done) return;\n          done = true;\n          document.removeEventListener('keydown', onKey, true);\n          closeDialog(layer);\n          resolve(val);\n        }\n        function submit() {\n          var val = String(input.value || '').trim();\n          if (required && !val) {\n            errBox.textContent = o.requiredMessage || 'Kolom ini wajib diisi.';\n            errBox.classList.remove('hidden');\n            input.classList.add('is-invalid');\n            input.focus();\n            return;\n          }\n          finish(val);\n        }\n        function onKey(e) {\n          if (e.key === 'Escape') { e.preventDefault(); finish(null); }\n          else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }\n        }\n        input.addEventListener('input', function () {\n          errBox.classList.add('hidden');\n          input.classList.remove('is-invalid');\n        });\n        layer.querySelector('[data-act=\"ok\"]').addEventListener('click', submit);\n        layer.querySelector('[data-act=\"cancel\"]').addEventListener('click', function () { finish(null); });\n        layer.addEventListener('click', function (e) { if (e.target === layer) finish(null); });\n        document.addEventListener('keydown', onKey, true);\n        setTimeout(function () { input.focus(); }, 60);\n      });\n    }\n\n    function getTimeGreeting() {\n      var hr = new Date().getHours();\n      if (hr < 11) return 'Selamat Pagi';\n      if (hr < 15) return 'Selamat Siang';\n      if (hr < 18) return 'Selamat Sore';\n      return 'Selamat Malam';\n    }\n\n    function getNavItems(role) {\n      var items = [\n        { id: 'home', icon: '🏠', label: 'Dashboard', section: 'Menu Utama' }\n      ];\n      if (role === 'TRAINER') {\n        items.push(\n          { id: 'input', icon: '📝', label: 'Input Pemeriksaan', section: 'Pemeriksaan' }\n        );\n      }\n      items.push(\n        { id: 'sessions', icon: '✅', label: 'Pemeriksaan Selesai', section: 'Pemeriksaan' },\n        { id: 'notifications', icon: '🔔', label: 'Notifikasi & Preferensi', section: 'Menu Utama', badge: state.unreadNotifCount }\n      );\n      if (role === 'SUPER_ADMIN') {\n        items.push(\n          { id: 'admin_drafts', icon: '📋', label: 'Monitoring Draft', section: 'Pemeriksaan', badge: state.activeDraftsCount },\n          { id: 'admin_master', icon: '🗂️', label: 'Master Data', section: 'Master & Outlet' },\n          { id: 'admin_outlets', icon: '🏪', label: 'Manajemen Outlet', section: 'Master & Outlet' },\n          { id: 'admin_users', icon: '👥', label: 'Pengguna', section: 'Administrasi' },\n          { id: 'admin_settings', icon: '⚙️', label: 'Pengaturan Aplikasi', section: 'Administrasi' },\n          { id: 'admin_backup', icon: '🛡️', label: 'Backup & Arsip Foto', section: 'Administrasi' },\n          { id: 'admin_audit', icon: '📜', label: 'Audit Log', section: 'Administrasi' }\n        );\n      }\n      return items;\n    }\n\n    var THEME_KEY = 'tm_ui_theme';\n\n    function getTheme() {\n      try {\n        return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';\n      } catch (e) {\n        return 'dark';\n      }\n    }\n\n    function applyChartThemeDefaults(isLight) {\n      if (typeof window.Chart === 'undefined' || !window.Chart.defaults) return;\n      window.Chart.defaults.color = isLight ? '#334155' : '#cbd5e1';\n      window.Chart.defaults.borderColor = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.1)';\n    }\n\n    function applyTheme(theme) {\n      var isLight = theme === 'light';\n      document.documentElement.classList.toggle('theme-light', isLight);\n      try { localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark'); } catch (e) {}\n      applyChartThemeDefaults(isLight);\n      var btn = document.getElementById('btn-toggle-theme');\n      if (btn) {\n        btn.innerHTML = isLight ? '🌙' : '☀️';\n        btn.title = isLight ? 'Ubah ke Tema Gelap' : 'Ubah ke Tema Cerah';\n      }\n    }\n\n    function toggleTheme() {\n      var next = getTheme() === 'light' ? 'dark' : 'light';\n      applyTheme(next);\n      if (state.user && state.route === 'home') {\n        renderAppShell();\n      }\n    }\n\n    function renderHomePlaceholder(container) {\n      var role = state.user.Role;\n      container.innerHTML =\n        '<div class=\"card\">' +\n          '<div class=\"card-header\">' +\n            '<h2 class=\"card-title\">Selamat Datang, ' + escapeHtml(state.user.Name) + '</h2>' +\n            '<span class=\"badge badge-primary\">' + escapeHtml(role) + '</span>' +\n          '</div>' +\n          '<p style=\"margin:0 0 12px;color:var(--text-secondary);\">Fondasi Phase 1 (Database 20 Sheet, Drive Privat, Authentication, RBAC, Pengaturan Aplikasi, &amp; Audit Log) telah aktif.</p>' +\n          '<div class=\"grid-3\">' +\n            '<div class=\"card\" style=\"margin:0;\"><strong>Keamanan Sesi</strong><p class=\"form-hint\">Maksimum 8 jam, idle timeout 30 menit, &amp; lockout 5× gagal login aktif di backend.</p></div>' +\n            '<div class=\"card\" style=\"margin:0;\"><strong>Status Sinkronisasi</strong><p class=\"form-hint\">Koneksi saat ini: ' + (navigator.onLine ? 'Online' : 'Offline') + '. Modul IndexedDB &amp; Sync siap di Phase 6.</p></div>' +\n            '<div class=\"card\" style=\"margin:0;\"><strong>Zona Waktu Sistem</strong><p class=\"form-hint\">Asia/Jakarta (WIB, UTC+7).</p></div>' +\n          '</div>' +\n        '</div>';\n    }\n\n    function renderAppShell() {\n      var root = document.getElementById('app-root');\n      var navItems = getNavItems(state.user.Role);\n      var groupedHtml = '';\n      var lastSec = '';\n      navItems.forEach(function (it) {\n        if (it.section !== lastSec) {\n          groupedHtml += '<div class=\"nav-section-title\" data-nav-sec=\"' + escapeHtml(it.section) + '\">' + escapeHtml(it.section) + '</div>';\n          lastSec = it.section;\n        }\n        groupedHtml +=\n          '<button class=\"nav-item' + (state.route === it.id ? ' active' : '') + '\" data-route=\"' + escapeHtml(it.id) + '\" data-label=\"' + escapeHtml(it.label.toLowerCase()) + '\">' +\n            '<span style=\"display:inline-flex;align-items:center;gap:10px;\"><span>' + (it.icon || '•') + '</span><span>' + escapeHtml(it.label) + '</span></span>' +\n            (it.badge !== undefined ? '<span class=\"badge badge-primary\" id=\"nav-badge-' + escapeHtml(it.id) + '\">' + it.badge + '</span>' : '') +\n          '</button>';\n      });\n\n      var logoHtml = state.branding.logoDataUrl\n        ? '<img class=\"sidebar-logo\" src=\"' + escapeHtml(state.branding.logoDataUrl) + '\" alt=\"Logo\">'\n        : '<div class=\"auth-brand-icon\" style=\"width:32px;height:32px;font-size:13px;border-radius:8px;\">TM</div>';\n\n      var online = navigator.onLine !== false;\n      var currentItem = navItems.find(function (x) { return x.id === state.route; }) || navItems[0];\n      var userInitial = String(state.user.Name || 'U').trim().charAt(0).toUpperCase();\n\n      root.innerHTML =\n        '<div class=\"app-layout' + (state.sidebarCollapsed ? ' sidebar-collapsed' : '') + (state.drawerOpen ? ' drawer-open' : '') + '\" id=\"app-layout\">' +\n          '<div class=\"drawer-backdrop\" id=\"drawer-backdrop\"></div>' +\n          '<aside class=\"sidebar\">' +\n            '<div class=\"sidebar-header\">' +\n              logoHtml +\n              '<span class=\"sidebar-brand-text\">' + escapeHtml(state.branding.companyName) + '</span>' +\n            '</div>' +\n            '<div class=\"sidebar-profile-card\">' +\n              '<div class=\"sidebar-avatar\">' + escapeHtml(userInitial) + '</div>' +\n              '<div style=\"min-width:0;flex:1;\">' +\n                '<div class=\"sidebar-profile-name\">' + escapeHtml(state.user.Name) + '</div>' +\n                '<div class=\"sidebar-profile-sub\">@' + escapeHtml(state.user.Username) + ' • ' + escapeHtml(state.user.Role) + '</div>' +\n              '</div>' +\n            '</div>' +\n            '<div class=\"sidebar-search-box\">' +\n              '<input type=\"search\" id=\"sidebar-search-input\" class=\"sidebar-search-input\" placeholder=\"🔍 Cari menu...\">' +\n            '</div>' +\n            '<nav class=\"sidebar-nav\" id=\"sidebar-nav-list\">' + groupedHtml + '</nav>' +\n            '<div class=\"sidebar-footer\">' +\n              '<button id=\"btn-logout\" class=\"btn btn-sm btn-secondary btn-block\">Keluar</button>' +\n            '</div>' +\n          '</aside>' +\n          '<div class=\"main-container\">' +\n            '<header class=\"top-header\">' +\n              '<div class=\"header-left\">' +\n                '<button type=\"button\" class=\"icon-btn\" id=\"btn-toggle-nav\" aria-label=\"Toggle Menu\">☰</button>' +\n                '<div>' +\n                  '<h1 class=\"header-title\">' + escapeHtml(currentItem.label) + '</h1>' +\n                  '<div class=\"form-hint\" style=\"font-size:11px;margin-top:-2px;\">' + escapeHtml(getTimeGreeting() + ', ' + state.user.Name) + '</div>' +\n                '</div>' +\n              '</div>' +\n              '<div class=\"header-right\">' +\n                '<span class=\"sync-pill' + (online ? '' : ' offline') + '\" id=\"header-sync-pill\">' +\n                  '<span>●</span><span class=\"sync-label-text\">' + (online ? 'Online' : 'Offline') + '</span>' +\n                '</span>' +\n                '<button type=\"button\" class=\"icon-btn\" id=\"btn-toggle-theme\" title=\"' + (getTheme() === 'light' ? 'Ubah ke Tema Gelap' : 'Ubah ke Tema Cerah') + '\" aria-label=\"Ubah Tema\">' +\n                  (getTheme() === 'light' ? '🌙' : '☀️') +\n                '</button>' +\n                '<button type=\"button\" class=\"icon-btn\" id=\"btn-open-notifs\" title=\"Notifikasi\">' +\n                  '🔔 <span id=\"notif-unread-badge\" class=\"badge badge-danger' + (state.unreadNotifCount > 0 ? '' : ' hidden') + '\" style=\"margin-left:4px;\">' + state.unreadNotifCount + '</span>' +\n                '</button>' +\n              '</div>' +\n            '</header>' +\n            '<main class=\"page-content\" id=\"page-content\"></main>' +\n          '</div>' +\n        '</div>';\n\n      var searchInp = document.getElementById('sidebar-search-input');\n      if (searchInp) {\n        searchInp.addEventListener('input', function () {\n          var q = searchInp.value.trim().toLowerCase();\n          root.querySelectorAll('.nav-item[data-route]').forEach(function (btn) {\n            var lbl = btn.getAttribute('data-label') || '';\n            btn.style.display = (!q || lbl.indexOf(q) !== -1) ? '' : 'none';\n          });\n        });\n      }\n\n      document.getElementById('btn-toggle-nav').addEventListener('click', function () {\n        if (window.innerWidth <= 768) {\n          state.drawerOpen = !state.drawerOpen;\n        } else {\n          state.sidebarCollapsed = !state.sidebarCollapsed;\n        }\n        renderAppShell();\n      });\n\n      document.getElementById('drawer-backdrop').addEventListener('click', function () {\n        state.drawerOpen = false;\n        renderAppShell();\n      });\n\n      document.getElementById('btn-logout').addEventListener('click', handleLogout);\n      document.getElementById('btn-toggle-theme').addEventListener('click', toggleTheme);\n      document.getElementById('btn-open-notifs').addEventListener('click', openNotificationsModal);\n\n      root.querySelectorAll('.nav-item[data-route]').forEach(function (btn) {\n        btn.addEventListener('click', function () {\n          state.route = btn.getAttribute('data-route');\n          state.drawerOpen = false;\n          renderAppShell();\n        });\n      });\n\n      var pageEl = document.getElementById('page-content');\n      if (state.route === 'input' && state.user.Role === 'TRAINER') {\n        window.TM_VIEWS_INPUT.renderInputView(pageEl);\n      } else if (state.route === 'sessions') {\n        window.TM_VIEWS_INPUT.renderCompletedSessionsView(pageEl);\n      } else if (state.route === 'notifications') {\n        window.TM_VIEWS_NOTIFICATIONS.renderNotificationCenterView(pageEl);\n      } else if (state.route === 'admin_drafts' && state.user.Role === 'SUPER_ADMIN') {\n        window.TM_VIEWS_DRAFTS.renderMonitoringDraftsView(pageEl);\n      } else if (state.route === 'admin_master' && state.user.Role === 'SUPER_ADMIN') {\n        window.TM_VIEWS_MASTER.renderMasterDataView(pageEl);\n      } else if (state.route === 'admin_outlets' && state.user.Role === 'SUPER_ADMIN') {\n        window.TM_VIEWS_MASTER.renderOutletsView(pageEl);\n      } else if (state.route === 'admin_users' && state.user.Role === 'SUPER_ADMIN') {\n        window.TM_VIEWS_ADMIN.renderUsersView(pageEl);\n      } else if (state.route === 'admin_settings' && state.user.Role === 'SUPER_ADMIN') {\n        window.TM_VIEWS_ADMIN.renderSettingsView(pageEl, function (updatedCfg) {\n          state.branding = { companyName: updatedCfg.companyName, logoDataUrl: updatedCfg.logoDataUrl };\n          renderAppShell();\n        });\n      } else if (state.route === 'admin_backup' && state.user.Role === 'SUPER_ADMIN') {\n        window.TM_VIEWS_BACKUP.renderBackupAndArchiveView(pageEl);\n      } else if (state.route === 'admin_audit' && state.user.Role === 'SUPER_ADMIN') {\n        window.TM_VIEWS_ADMIN.renderAuditView(pageEl);\n      } else {\n        window.TM_VIEWS_DASHBOARD.renderDashboardView(pageEl);\n      }\n    }\n\n    function handleLogout() {\n      var token = window.TM_API.getToken();\n      window.TM_API.setToken('');\n      state.user = null;\n      window.TM_API.callRpc('api_logout', token).catch(function () {});\n      showLoginScreen('');\n    }\n\n    function handleSessionExpired(message) {\n      state.user = null;\n      showLoginScreen(message || 'Sesi Anda telah berakhir. Silakan masuk kembali.');\n    }\n\n    function refreshHeaderCounters() {\n      var token = window.TM_API.getToken();\n      if (!token || !state.user) return;\n      window.TM_API.callRpc('api_listMyNotifications', token).then(function (res) {\n        state.unreadNotifCount = res.unreadCount || 0;\n        var b = document.getElementById('notif-unread-badge');\n        if (b) {\n          b.textContent = String(state.unreadNotifCount);\n          b.classList.toggle('hidden', state.unreadNotifCount === 0);\n        }\n      }).catch(function () {});\n\n      if (state.user.Role === 'SUPER_ADMIN') {\n        window.TM_API.callRpc('api_getActiveDraftsCount', token).then(function (res) {\n          setDraftBadgeCount(res.totalActiveDrafts || 0);\n        }).catch(function () {});\n      }\n    }\n\n    function setDraftBadgeCount(count) {\n      state.activeDraftsCount = count;\n      var el = document.getElementById('nav-badge-admin_drafts');\n      if (el) el.textContent = String(count);\n    }\n\n    function openNotificationsModal() {\n      var close = openModal('Notifikasi In-App', '<p class=\"form-hint\">Memuat notifikasi...</p>');\n      window.TM_API.callRpc('api_listMyNotifications', window.TM_API.getToken()).then(function (res) {\n        var root = document.getElementById('modal-root');\n        if (!root) return;\n        var items = res.items || [];\n        var listHtml = items.length === 0\n          ? '<p class=\"form-hint\">Belum ada notifikasi.</p>'\n          : items.map(function (n) {\n              return (\n                '<div class=\"mobile-item-card\" style=\"margin-bottom:8px;background:' + (n.ReadAt ? 'var(--bg-surface)' : 'var(--primary-soft)') + ';\">' +\n                  '<div class=\"mobile-item-row\">' +\n                    '<strong>' + escapeHtml(n.Title) + '</strong>' +\n                    (n.ReadAt ? '<span class=\"badge badge-neutral\">Dibaca</span>' : '<span class=\"badge badge-primary\">Baru</span>') +\n                  '</div>' +\n                  '<div style=\"font-size:13px;margin-bottom:6px;\">' + escapeHtml(n.Message) + '</div>' +\n                  '<div style=\"display:flex;justify-content:space-between;align-items:center;\">' +\n                    '<span class=\"form-hint\">' + escapeHtml(n.CreatedAt) + '</span>' +\n                    (!n.ReadAt ? '<button class=\"btn btn-sm btn-secondary\" data-nread=\"' + escapeHtml(n.NotificationID) + '\">Tandai Dibaca</button>' : '') +\n                  '</div>' +\n                '</div>'\n              );\n            }).join('');\n        var bodyBox = root.querySelector('.modal-dialog > div:last-child');\n        if (bodyBox) {\n          bodyBox.innerHTML =\n            '<div style=\"display:flex;justify-content:flex-end;margin-bottom:8px;\">' +\n              '<button type=\"button\" class=\"btn btn-sm btn-primary\" id=\"btn-goto-notif-center\">⚙️ Buka Pusat Notifikasi &amp; Preferensi</button>' +\n            '</div>' +\n            '<div style=\"max-height:60vh;overflow-y:auto;\">' + listHtml + '</div>';\n          var gotoBtn = document.getElementById('btn-goto-notif-center');\n          if (gotoBtn) {\n            gotoBtn.addEventListener('click', function () {\n              close();\n              state.route = 'notifications';\n              renderAppShell();\n            });\n          }\n          bodyBox.querySelectorAll('[data-nread]').forEach(function (btn) {\n            btn.addEventListener('click', function () {\n              window.TM_API.callRpc('api_markNotificationRead', window.TM_API.getToken(), btn.getAttribute('data-nread'))\n                .then(function () {\n                  refreshHeaderCounters();\n                  close();\n                  openNotificationsModal();\n                });\n            });\n          });\n        }\n      });\n    }\n\n    function handleAuthenticated(authPayload) {\n      state.user = authPayload.user;\n      if (authPayload.mustChangePassword) {\n        window.TM_VIEWS_AUTH.renderForceChangePassword(\n          document.getElementById('app-root'),\n          state.branding,\n          state.user,\n          function (updatedUser) {\n            state.user = updatedUser;\n            state.route = 'home';\n            renderAppShell();\n            refreshHeaderCounters();\n          },\n          handleLogout\n        );\n        return;\n      }\n      state.route = 'home';\n      renderAppShell();\n      refreshHeaderCounters();\n      if (window.TM_SYNC) {\n        window.TM_SYNC.runAutoSync();\n      }\n    }\n\n    function showLoginScreen(bannerMsg) {\n      var root = document.getElementById('app-root');\n      window.TM_VIEWS_AUTH.renderLogin(\n        root,\n        state.branding,\n        bannerMsg,\n        handleAuthenticated,\n        function () {\n          window.TM_VIEWS_AUTH.renderForgotPassword(\n            root,\n            state.branding,\n            function () { showLoginScreen(''); },\n            function (tok) {\n              window.TM_VIEWS_AUTH.renderConfirmReset(root, state.branding, tok, function () { showLoginScreen(''); });\n            }\n          );\n        },\n        function (tok) {\n          window.TM_VIEWS_AUTH.renderConfirmReset(root, state.branding, tok, function () { showLoginScreen(''); });\n        }\n      );\n    }\n\n    function updateOnlineBadge() {\n      if (window.TM_SYNC) {\n        window.TM_SYNC.recalculateGlobalSyncState();\n        return;\n      }\n      var pill = document.getElementById('header-sync-pill');\n      if (!pill) return;\n      var online = navigator.onLine !== false;\n      pill.className = 'sync-pill' + (online ? '' : ' offline');\n      pill.innerHTML = '<span>●</span><span class=\"sync-label-text\">' + (online ? 'Online' : 'Offline') + '</span>';\n    }\n\n    function init() {\n      applyTheme(getTheme());\n      window.addEventListener('online', updateOnlineBadge);\n      window.addEventListener('offline', updateOnlineBadge);\n\n      if (typeof MutationObserver !== 'undefined' && document.body) {\n        var pwObserver = new MutationObserver(function () {\n          bindPasswordToggles(document.body);\n        });\n        pwObserver.observe(document.body, { childList: true, subtree: true });\n      }\n\n      var root = document.getElementById('app-root');\n      var bootParams = window.TM_BOOT_PARAMS || {};\n\n      window.TM_API.callRpc('api_getBootstrapStatus')\n        .then(function (status) {\n          state.initialized = status.initialized;\n          state.branding = status.branding || state.branding;\n\n          if (!status.initialized) {\n            window.TM_VIEWS_AUTH.renderBootstrap(root, function () {\n              init();\n            });\n            return;\n          }\n\n          if (bootParams.mode === 'reset') {\n            window.TM_VIEWS_AUTH.renderConfirmReset(\n              root,\n              state.branding,\n              bootParams.resetToken || '',\n              function () {\n                window.TM_BOOT_PARAMS.mode = '';\n                showLoginScreen('');\n              }\n            );\n            return;\n          }\n\n          var token = window.TM_API.getToken();\n          if (token) {\n            window.TM_API.callRpc('api_validateSession', token)\n              .then(function (res) {\n                handleAuthenticated(res);\n              })\n              .catch(function (err) {\n                window.TM_API.setToken('');\n                showLoginScreen(err && err.message ? err.message : '');\n              });\n          } else {\n            showLoginScreen('');\n          }\n        })\n        .catch(function (err) {\n          root.innerHTML =\n            '<div class=\"auth-screen\"><div class=\"auth-card\"><div class=\"alert alert-error\">Gagal memuat aplikasi: ' +\n            escapeHtml(err.message) +\n            '</div></div></div>';\n        });\n    }\n\n    return {\n      init: init,\n      getCurrentUser: function () { return state.user; },\n      setDraftBadgeCount: setDraftBadgeCount,\n      refreshHeaderCounters: refreshHeaderCounters,\n      escapeHtml: escapeHtml,\n      showToast: showToast,\n      openModal: openModal,\n      confirmDialog: confirmDialog,\n      promptDialog: promptDialog,\n      bindPasswordToggles: bindPasswordToggles,\n      handleSessionExpired: handleSessionExpired\n    };\n  })();\n\n  document.addEventListener('DOMContentLoaded', function () {\n    window.TM_APP.init();\n  });\n</script>\n\n</body>\n</html>\n";
const SHEETS_SCHEMA = {"Users":["UserID","Name","Username","Email","PasswordHash","Role","Status","FailedLoginCount","LockedUntil","MustChangePassword","ResetTokenHash","ResetTokenExpiresAt","CreatedAt","UpdatedAt"],"AuthSessions":["AuthSessionID","UserID","TokenHash","RoleSnapshot","DeviceInfo","IssuedAt","LastActivityAt","ExpiresAt","RevokedAt"],"Categories":["CategoryID","CategoryName","Status","CreatedAt","UpdatedAt"],"Sections":["SectionID","SectionName","Status","CreatedAt","UpdatedAt"],"Master_AM":["AM_ID","AM_Name","Status","CreatedAt","UpdatedAt"],"Master_MUM":["MUM_ID","MUM_Name","Status","CreatedAt","UpdatedAt"],"Outlets":["OutletID","CanonicalName","NormalizedName","OutletCode","Status","MergedIntoOutletID","CreatedAt","UpdatedAt"],"OutletAliases":["AliasID","OutletID","AliasName","NormalizedAlias","CreatedAt"],"Sessions":["SessionID","ReportNumber","InspectionDate","OutletID","OutletNameSnapshot","AM_ID","AM_Name_Snapshot","MUM_ID","MUM_Name_Snapshot","PIC_Name","TrainerID","Status","Version","IsRestoredFlagUntil","CreatedAt","SubmittedAt","UpdatedAt","DeletedAt","DeletedBy","DeleteReason"],"Findings":["FindingID","SessionID","CategoryID","CategoryNameSnapshot","SectionID","SectionNameSnapshot","Masalah","Mengapa","Solusi","Version","CreatedAt","CreatedBy","UpdatedAt","UpdatedBy","DeletedAt","DeletedBy","DeleteReason","DeletionSource"],"Photos":["PhotoID","FindingID","SessionID","DriveFileID","FileName","MimeType","FileSize","PhotoComment","Status","IdempotencyKey","UploadedAt","UploadedBy","DeletedAt","DeletedBy","PurgeReason","PurgedAt"],"AuditLogs":["LogID","UserID","Action","EntityType","EntityID","BeforeData","AfterData","Timestamp","DeviceInfo","Description"],"Notifications":["NotificationID","UserID","Type","Title","Message","RelatedEntityID","MetadataJSON","ReadAt","CreatedAt"],"NotificationPreferences":["PreferenceID","UserID","NotificationType","InAppEnabled","EmailEnabled"],"DraftRestoreRequests":["RequestID","SessionID","TrainerID","RequestReason","Status","RequestedAt","ProcessedBy","ProcessedAt","DecisionReason"],"SyncMetadata":["SyncID","SessionID","DeviceID","LocalVersion","ServerVersion","SyncStatus","LastSyncAt","ConflictData","LastIdempotencyKey"],"PDFHistory":["PDFVersionID","SessionID","ReportType","VersionNumber","GeneratedAt","GeneratedBy","RecipientEmail","SendStatus"],"EmailLogs":["EmailLogID","SessionID","Recipient","PDFVersionID","AttemptAt","Status","FailureReason"],"BackupHistory":["BackupID","BackupType","BackupDate","Status","Size","Important","Result","StorageReference"],"AppSettings":["SettingKey","SettingValue","UpdatedAt","UpdatedBy"]};
const SHEET_NAMES = Object.keys(SHEETS_SCHEMA);
const DEFAULT_GAS_BRIDGE_URL = "https://script.google.com/macros/s/AKfycbyV5lj714EFILXUR2SwpyaYIdAz5KAkrlPSZkjqQf6o8CYeb5KKKMJJ6b9HdP7oZEA/exec";
const CF_BRIDGE_KEY = "TM_CF_BRIDGE_2026_SECURE_KEY";

// Cache in-memory untuk mempercepat CacheService lintas request dalam isolate yang sama
const ISOLATE_CACHE = new Map();
let SCHEMA_INITIALIZED = false;

function base64ToBytes(b64) {
  const clean = String(b64 || '').replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  const binStr = atob(clean);
  const len = binStr.length;
  const out = new Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = binStr.charCodeAt(i);
  }
  return out;
}

function bytesToBase64(bytes) {
  if (typeof bytes === 'string') {
    const enc = new TextEncoder().encode(bytes);
    let bin = '';
    for (let i = 0; i < enc.length; i++) bin += String.fromCharCode(enc[i]);
    return btoa(bin);
  }
  const arr = Array.isArray(bytes) || bytes instanceof Uint8Array ? bytes : [];
  let bin = '';
  const chunkSize = 8192;
  for (let i = 0; i < arr.length; i += chunkSize) {
    const slice = arr.slice(i, i + chunkSize);
    for (let j = 0; j < slice.length; j++) {
      bin += String.fromCharCode(slice[j] & 0xff);
    }
  }
  return btoa(bin);
}

function utf8ToBytes(str) {
  return Array.from(new TextEncoder().encode(String(str || '')));
}

async function ensureD1Schema(db) {
  if (SCHEMA_INITIALIZED) return;
  const stmts = [
    db.prepare('CREATE TABLE IF NOT EXISTS "tm_sys_properties" ("PropKey" TEXT PRIMARY KEY, "PropValue" TEXT NOT NULL DEFAULT \'\')'),
    db.prepare('CREATE TABLE IF NOT EXISTS "tm_sys_folders" ("FolderID" TEXT PRIMARY KEY, "FolderName" TEXT NOT NULL DEFAULT \'\', "ParentID" TEXT NOT NULL DEFAULT \'\', "Access" TEXT NOT NULL DEFAULT \'PRIVATE\', "Permission" TEXT NOT NULL DEFAULT \'NONE\')'),
    db.prepare('CREATE TABLE IF NOT EXISTS "tm_sys_files" ("FileID" TEXT PRIMARY KEY, "FolderID" TEXT NOT NULL DEFAULT \'\', "FileName" TEXT NOT NULL DEFAULT \'\', "MimeType" TEXT NOT NULL DEFAULT \'application/octet-stream\', "Base64Data" TEXT NOT NULL DEFAULT \'\', "Trashed" INTEGER NOT NULL DEFAULT 0, "CreatedAt" TEXT NOT NULL DEFAULT \'\')')
  ];
  for (const sName of SHEET_NAMES) {
    const cols = SHEETS_SCHEMA[sName];
    const colDefs = ['"_row_order" INTEGER PRIMARY KEY AUTOINCREMENT', ...cols.map((c) => `"${c}" TEXT NOT NULL DEFAULT ''`)].join(', ');
    stmts.push(db.prepare(`CREATE TABLE IF NOT EXISTS "${sName}" (${colDefs})`));
  }
  await db.batch(stmts);
  SCHEMA_INITIALIZED = true;
}

async function loadStateFromD1(db, fnName, args) {
  await ensureD1Schema(db);

  const queries = [
    db.prepare('SELECT "PropKey", "PropValue" FROM "tm_sys_properties"'),
    db.prepare('SELECT "FolderID", "FolderName", "ParentID", "Access", "Permission" FROM "tm_sys_folders"'),
    db.prepare('SELECT "FileID", "FolderID", "FileName", "MimeType", "Trashed", "CreatedAt" FROM "tm_sys_files"'),
    ...SHEET_NAMES.map((sName) => {
      const cols = SHEETS_SCHEMA[sName].map((c) => `"${c}"`).join(', ');
      return db.prepare(`SELECT ${cols} FROM "${sName}" ORDER BY "_row_order" ASC`);
    })
  ];

  const results = await db.batch(queries);

  const scriptProps = new Map();
  for (const r of (results[0].results || [])) {
    scriptProps.set(String(r.PropKey), String(r.PropValue));
  }

  const driveFolders = new Map();
  for (const r of (results[1].results || [])) {
    driveFolders.set(String(r.FolderID), {
      id: String(r.FolderID),
      name: String(r.FolderName),
      parentId: String(r.ParentID || ''),
      access: String(r.Access || 'PRIVATE'),
      permission: String(r.Permission || 'NONE')
    });
  }

  const driveFiles = new Map();
  for (const r of (results[2].results || [])) {
    driveFiles.set(String(r.FileID), {
      id: String(r.FileID),
      folderId: String(r.FolderID || ''),
      name: String(r.FileName || ''),
      mimeType: String(r.MimeType || 'application/octet-stream'),
      base64Data: '',
      trashed: Boolean(r.Trashed),
      createdAt: String(r.CreatedAt || '')
    });
  }

  const sheetsRows = new Map();
  for (let i = 0; i < SHEET_NAMES.length; i++) {
    const sName = SHEET_NAMES[i];
    const headers = SHEETS_SCHEMA[sName];
    const dbRows = results[3 + i].results || [];
    const matrix = [headers.slice()];
    for (const rowObj of dbRows) {
      matrix.push(headers.map((h) => (rowObj[h] === undefined || rowObj[h] === null ? '' : String(rowObj[h]))));
    }
    sheetsRows.set(sName, matrix);
  }

  // Tentukan FileID mana yang perlu dimuat Base64Data-nya untuk RPC ini
  const neededFileIds = new Set();
  const appSettingsMatrix = sheetsRows.get('AppSettings') || [];
  for (let r = 1; r < appSettingsMatrix.length; r++) {
    if (appSettingsMatrix[r][0] === 'COMPANY_LOGO_FILE_ID' && appSettingsMatrix[r][1]) {
      neededFileIds.add(appSettingsMatrix[r][1]);
    }
  }

  if (fnName === 'api_getPhotoDataUrl' && args && args[1]) {
    const targetPhotoId = String(args[1]);
    const photosMatrix = sheetsRows.get('Photos') || [];
    for (let r = 1; r < photosMatrix.length; r++) {
      if (photosMatrix[r][0] === targetPhotoId && photosMatrix[r][3]) {
        neededFileIds.add(photosMatrix[r][3]);
      }
    }
  } else if (
    fnName === 'api_generateSessionPdf' ||
    fnName === 'api_sendSessionPdfEmail'
  ) {
    const targetSessionId = args && args[1] ? String(args[1]) : '';
    const photosMatrix = sheetsRows.get('Photos') || [];
    for (let r = 1; r < photosMatrix.length; r++) {
      if (photosMatrix[r][2] === targetSessionId && photosMatrix[r][3]) {
        neededFileIds.add(photosMatrix[r][3]);
      }
    }
  } else if (
    fnName === 'api_generateDashboardReportPdf' ||
    fnName === 'api_createManualBackup' ||
    fnName === 'api_runDailyAutomatedBackup' ||
    fnName === 'api_getBackupSummaryForRestore' ||
    fnName === 'api_executeSafeRestore' ||
    fnName === 'cron_runDailyAutomatedBackup'
  ) {
    for (const fid of driveFiles.keys()) {
      neededFileIds.add(fid);
    }
  }

  if (neededFileIds.size > 0) {
    const idList = Array.from(neededFileIds);
    const chunkSize = 40;
    const fileQueries = [];
    for (let i = 0; i < idList.length; i += chunkSize) {
      const slice = idList.slice(i, i + chunkSize);
      const placeholders = slice.map(() => '?').join(', ');
      fileQueries.push(
        db.prepare(`SELECT "FileID", "Base64Data" FROM "tm_sys_files" WHERE "FileID" IN (${placeholders})`).bind(...slice)
      );
    }
    const fileRes = await db.batch(fileQueries);
    for (const batchItem of fileRes) {
      for (const row of (batchItem.results || [])) {
        const fObj = driveFiles.get(String(row.FileID));
        if (fObj) {
          fObj.base64Data = String(row.Base64Data || '');
        }
      }
    }
  }

  return {
    scriptProps,
    driveFolders,
    driveFiles,
    sheetsRows,
    dirtyProps: new Set(),
    dirtyFolders: new Set(),
    dirtyFiles: new Set(),
    dirtySheets: new Set(),
    pendingEmails: []
  };
}

async function commitStateToD1(db, state) {
  const stmts = [];

  for (const k of state.dirtyProps) {
    const v = state.scriptProps.get(k) || '';
    stmts.push(
      db.prepare('INSERT OR REPLACE INTO "tm_sys_properties" ("PropKey", "PropValue") VALUES (?, ?)').bind(k, v)
    );
  }

  for (const fid of state.dirtyFolders) {
    const f = state.driveFolders.get(fid);
    if (f) {
      stmts.push(
        db.prepare('INSERT OR REPLACE INTO "tm_sys_folders" ("FolderID", "FolderName", "ParentID", "Access", "Permission") VALUES (?, ?, ?, ?, ?)')
          .bind(f.id, f.name, f.parentId || '', f.access || 'PRIVATE', f.permission || 'NONE')
      );
    }
  }

  for (const fileId of state.dirtyFiles) {
    const fl = state.driveFiles.get(fileId);
    if (fl) {
      stmts.push(
        db.prepare('INSERT OR REPLACE INTO "tm_sys_files" ("FileID", "FolderID", "FileName", "MimeType", "Base64Data", "Trashed", "CreatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(fl.id, fl.folderId || '', fl.name || '', fl.mimeType || 'application/octet-stream', fl.base64Data || '', fl.trashed ? 1 : 0, fl.createdAt || new Date().toISOString())
      );
    }
  }

  for (const sName of state.dirtySheets) {
    const headers = SHEETS_SCHEMA[sName];
    if (!headers) continue;
    stmts.push(db.prepare(`DELETE FROM "${sName}"`));

    const matrix = state.sheetsRows.get(sName) || [];
    if (matrix.length > 1) {
      const fileHeaders = matrix[0] || headers;
      const colListSql = headers.map((c) => `"${c}"`).join(', ');
      // D1 membatasi maksimal 100 bound parameters per statement
      const maxRowsPerInsert = Math.max(1, Math.floor(90 / headers.length));
      const dataRows = [];
      for (let r = 1; r < matrix.length; r++) {
        const row = matrix[r] || [];
        const isEmpty = row.every((cell) => cell === '' || cell === null || cell === undefined);
        if (isEmpty) continue;
        const mapped = headers.map((h) => {
          const idx = fileHeaders.indexOf(h);
          const val = idx >= 0 ? row[idx] : '';
          return val === undefined || val === null ? '' : String(val);
        });
        dataRows.push(mapped);
      }

      for (let i = 0; i < dataRows.length; i += maxRowsPerInsert) {
        const slice = dataRows.slice(i, i + maxRowsPerInsert);
        const rowPlaceholders = slice.map(() => `(${headers.map(() => '?').join(', ')})`).join(', ');
        const flatParams = [];
        for (const r of slice) {
          flatParams.push(...r);
        }
        stmts.push(
          db.prepare(`INSERT INTO "${sName}" (${colListSql}) VALUES ${rowPlaceholders}`).bind(...flatParams)
        );
      }
    }
  }

  if (stmts.length > 0) {
    await db.batch(stmts);
  }
}

function createGasContext(state, appOriginUrl) {
  const nextId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

  class D1Range {
    constructor(sheet, row, col, numRows, numCols) {
      this.sheet = sheet;
      this.row = row;
      this.col = col;
      this.numRows = numRows;
      this.numCols = numCols;
    }
    getValues() {
      const out = [];
      for (let r = 0; r < this.numRows; r++) {
        const rowArr = [];
        const targetRow = this.sheet._rows[this.row - 1 + r] || [];
        for (let c = 0; c < this.numCols; c++) {
          const v = targetRow[this.col - 1 + c];
          rowArr.push(v === undefined ? '' : v);
        }
        out.push(rowArr);
      }
      return out;
    }
    setValues(values) {
      for (let r = 0; r < values.length; r++) {
        const rIdx = this.row - 1 + r;
        if (!this.sheet._rows[rIdx]) this.sheet._rows[rIdx] = [];
        for (let c = 0; c < values[r].length; c++) {
          this.sheet._rows[rIdx][this.col - 1 + c] = values[r][c];
        }
      }
      state.dirtySheets.add(this.sheet.name);
      return this;
    }
    setFontWeight() { return this; }
    setNumberFormat() { return this; }
  }

  class D1Sheet {
    constructor(name, rowsRef) {
      this.name = name;
      this._rows = rowsRef;
    }
    getName() { return this.name; }
    setName(n) {
      const oldName = this.name;
      this.name = n;
      state.sheetsRows.delete(oldName);
      state.sheetsRows.set(n, this._rows);
      state.dirtySheets.add(n);
    }
    getLastRow() { return this._rows.length; }
    getLastColumn() {
      return this._rows.reduce((max, r) => Math.max(max, r ? r.length : 0), 0);
    }
    setFrozenRows() {}
    clear() {
      this._rows.length = 0;
      state.dirtySheets.add(this.name);
    }
    clearContents() {
      this._rows.length = 0;
      state.dirtySheets.add(this.name);
    }
    getRange(row, col, numRows = 1, numCols = 1) {
      return new D1Range(this, row, col, numRows, numCols);
    }
  }

  const spreadsheetObj = {
    getId: () => state.scriptProps.get('SPREADSHEET_ID') || 'CF_D1_SPREADSHEET',
    getSheets: () => Array.from(state.sheetsRows.entries()).map(([n, r]) => new D1Sheet(n, r)),
    getSheetByName: (name) => {
      if (!state.sheetsRows.has(name)) return null;
      return new D1Sheet(name, state.sheetsRows.get(name));
    },
    insertSheet: (name) => {
      if (!state.sheetsRows.has(name)) {
        state.sheetsRows.set(name, []);
      }
      state.dirtySheets.add(name);
      return new D1Sheet(name, state.sheetsRows.get(name));
    }
  };

  function makeFileWrapper(fileRec) {
    return {
      getId: () => fileRec.id,
      getBlob: () => ({
        getBytes: () => base64ToBytes(fileRec.base64Data || ''),
        getContentType: () => fileRec.mimeType || 'application/octet-stream',
        getName: () => fileRec.name || fileRec.id
      }),
      setTrashed: (flag) => {
        fileRec.trashed = Boolean(flag);
        state.dirtyFiles.add(fileRec.id);
      },
      isTrashed: () => Boolean(fileRec.trashed),
      setSharing: () => {},
      moveTo: (targetFolder) => {
        if (targetFolder && typeof targetFolder.getId === 'function') {
          fileRec.folderId = targetFolder.getId();
          state.dirtyFiles.add(fileRec.id);
        }
      }
    };
  }

  function makeFolderWrapper(folderRec) {
    return {
      getId: () => folderRec.id,
      getName: () => folderRec.name,
      setSharing: (access, perm) => {
        folderRec.access = access;
        folderRec.permission = perm;
        state.dirtyFolders.add(folderRec.id);
      },
      createFolder: (name) => {
        const f = {
          id: nextId('FLD'),
          name: String(name),
          parentId: folderRec.id,
          access: 'PRIVATE',
          permission: 'NONE'
        };
        state.driveFolders.set(f.id, f);
        state.dirtyFolders.add(f.id);
        return makeFolderWrapper(f);
      },
      createFile: (blob) => {
        const f = {
          id: nextId('FIL'),
          folderId: folderRec.id,
          name: String(blob.getName() || 'file.bin'),
          mimeType: String(blob.getContentType() || 'application/octet-stream'),
          base64Data: bytesToBase64(blob.getBytes()),
          trashed: false,
          createdAt: new Date().toISOString()
        };
        state.driveFiles.set(f.id, f);
        state.dirtyFiles.add(f.id);
        return makeFileWrapper(f);
      },
      addFile: (fileWrapper) => {
        const rec = state.driveFiles.get(fileWrapper.getId());
        if (rec) {
          rec.folderId = folderRec.id;
          state.dirtyFiles.add(rec.id);
        }
      },
      removeFile: () => {}
    };
  }

  const globals = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (state.scriptProps.has(k) ? state.scriptProps.get(k) : null),
        getProperties: () => Object.fromEntries(state.scriptProps.entries()),
        setProperty: (k, v) => {
          state.scriptProps.set(String(k), String(v));
          state.dirtyProps.add(String(k));
        },
        setProperties: (obj) => {
          for (const [k, v] of Object.entries(obj || {})) {
            state.scriptProps.set(String(k), String(v));
            state.dirtyProps.add(String(k));
          }
        }
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (ISOLATE_CACHE.has(k) ? ISOLATE_CACHE.get(k) : null),
        put: (k, v) => { ISOLATE_CACHE.set(String(k), String(v)); },
        remove: (k) => { ISOLATE_CACHE.delete(String(k)); }
      })
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        releaseLock: () => {}
      })
    },
    SpreadsheetApp: {
      create: () => {
        const id = 'CF_D1_MAIN_DB';
        state.scriptProps.set('SPREADSHEET_ID', id);
        state.dirtyProps.add('SPREADSHEET_ID');
        return spreadsheetObj;
      },
      openById: () => spreadsheetObj
    },
    DriveApp: {
      Access: { PRIVATE: 'PRIVATE' },
      Permission: { NONE: 'NONE' },
      createFolder: (name) => {
        const f = {
          id: nextId('FLD'),
          name: String(name),
          parentId: '',
          access: 'PRIVATE',
          permission: 'NONE'
        };
        state.driveFolders.set(f.id, f);
        state.dirtyFolders.add(f.id);
        return makeFolderWrapper(f);
      },
      getFolderById: (id) => {
        let f = state.driveFolders.get(String(id));
        if (!f) {
          f = { id: String(id), name: String(id), parentId: '', access: 'PRIVATE', permission: 'NONE' };
          state.driveFolders.set(f.id, f);
        }
        return makeFolderWrapper(f);
      },
      getFileById: (id) => {
        const fl = state.driveFiles.get(String(id));
        if (!fl) throw new Error('File tidak ditemukan di penyimpanan Cloudflare: ' + id);
        return makeFileWrapper(fl);
      }
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      base64Decode: (b64) => base64ToBytes(b64),
      base64Encode: (bytes) => bytesToBase64(bytes),
      newBlob: (bytes, mimeType, name) => ({
        getBytes: () => (typeof bytes === 'string' ? utf8ToBytes(bytes) : bytes),
        getContentType: () => mimeType || 'application/octet-stream',
        getName: () => name || 'blob'
      })
    },
    MailApp: {
      sendEmail: (opts) => {
        state.pendingEmails.push(opts);
      }
    },
    HtmlService: {
      createHtmlOutput: (html) => ({
        getContent: () => String(html || ''),
        getAs: (mimeType) => ({
          _name: 'report.pdf',
          _html: String(html || ''),
          setName(n) { this._name = n; return this; },
          getName() { return this._name; },
          getContentType() { return mimeType || 'application/pdf'; },
          getBytes() { return utf8ToBytes(this._html); }
        })
      })
    },
    ScriptApp: {
      getService: () => ({ getUrl: () => appOriginUrl || '' })
    }
  };

  const { PropertiesService, CacheService, LockService, SpreadsheetApp, DriveApp, Utilities, MailApp, HtmlService, ScriptApp } = globals;

/* ==================== FILE: Config.gs ==================== */
/**
 * Config.gs — Konfigurasi global, konstanta PRD, skema 20 Sheet, dan utilitas dasar.
 */

var TM_CONFIG = {
  APP_NAME: 'Trainer Monitoring',
  TIMEZONE: 'Asia/Jakarta',
  SCHEMA_VERSION: '1.0.0',

  ROLES: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    TRAINER: 'TRAINER',
    MANAJEMEN: 'MANAJEMEN'
  },

  STATUS: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE'
  },

  SESSION_STATUS: {
    DRAFT: 'Draft',
    SELESAI: 'Selesai',
    DELETED: 'Deleted'
  },

  AUTH: {
    MAX_FAILED_LOGINS: 5,
    LOCKOUT_MINUTES: 15,
    SESSION_MAX_HOURS: 8,
    SESSION_IDLE_MINUTES: 30,
    RESET_TOKEN_MINUTES: 30,
    RATE_LIMIT_WINDOW_SEC: 300,
    RATE_LIMIT_MAX_ATTEMPTS: 15,
    PBKDF2_ITERATIONS: 10000,
    MIN_PASSWORD_LENGTH: 8
  },

  DEFAULTS: {
    COMPANY_NAME: 'Trainer Monitoring',
    MAX_ACTIVE_DRAFTS: 5,
    BACKUP_RETENTION_DAYS: 90,
    LOCAL_DELETED_RETENTION_DAYS: 30,
    RESTORE_REQUEST_WINDOW_DAYS: 7,
    FINDING_EDIT_WINDOW_HOURS: 24,
    MAX_PHOTOS_PER_FINDING: 5,
    MAX_PHOTO_RAW_BYTES: 5 * 1024 * 1024,
    MAX_PHOTO_COMPRESSED_BYTES: 1 * 1024 * 1024,
    MAX_LOGO_BYTES: 2 * 1024 * 1024
  },

  PROP_KEYS: {
    APP_INITIALIZED: 'APP_INITIALIZED',
    BOOTSTRAP_COMPLETED_AT: 'BOOTSTRAP_COMPLETED_AT',
    SPREADSHEET_ID: 'SPREADSHEET_ID',
    DRIVE_ROOT_FOLDER_ID: 'DRIVE_ROOT_FOLDER_ID',
    DRIVE_PHOTOS_ACTIVE_ID: 'DRIVE_PHOTOS_ACTIVE_ID',
    DRIVE_PHOTOS_ARCHIVE_ID: 'DRIVE_PHOTOS_ARCHIVE_ID',
    DRIVE_BACKUPS_ID: 'DRIVE_BACKUPS_ID',
    DRIVE_BRANDING_ID: 'DRIVE_BRANDING_ID',
    HMAC_SECRET: 'HMAC_SECRET',
    SCHEMA_VERSION: 'SCHEMA_VERSION'
  },

  SHEETS: {
    Users: [
      'UserID', 'Name', 'Username', 'Email', 'PasswordHash', 'Role', 'Status',
      'FailedLoginCount', 'LockedUntil', 'MustChangePassword',
      'ResetTokenHash', 'ResetTokenExpiresAt', 'CreatedAt', 'UpdatedAt'
    ],
    AuthSessions: [
      'AuthSessionID', 'UserID', 'TokenHash', 'RoleSnapshot', 'DeviceInfo',
      'IssuedAt', 'LastActivityAt', 'ExpiresAt', 'RevokedAt'
    ],
    Categories: [
      'CategoryID', 'CategoryName', 'Status', 'CreatedAt', 'UpdatedAt'
    ],
    Sections: [
      'SectionID', 'SectionName', 'Status', 'CreatedAt', 'UpdatedAt'
    ],
    Master_AM: [
      'AM_ID', 'AM_Name', 'Status', 'CreatedAt', 'UpdatedAt'
    ],
    Master_MUM: [
      'MUM_ID', 'MUM_Name', 'Status', 'CreatedAt', 'UpdatedAt'
    ],
    Outlets: [
      'OutletID', 'CanonicalName', 'NormalizedName', 'OutletCode', 'Status',
      'MergedIntoOutletID', 'CreatedAt', 'UpdatedAt'
    ],
    OutletAliases: [
      'AliasID', 'OutletID', 'AliasName', 'NormalizedAlias', 'CreatedAt'
    ],
    Sessions: [
      'SessionID', 'ReportNumber', 'InspectionDate', 'OutletID', 'OutletNameSnapshot',
      'AM_ID', 'AM_Name_Snapshot', 'MUM_ID', 'MUM_Name_Snapshot', 'PIC_Name',
      'TrainerID', 'Status', 'Version', 'IsRestoredFlagUntil',
      'CreatedAt', 'SubmittedAt', 'UpdatedAt', 'DeletedAt', 'DeletedBy', 'DeleteReason'
    ],
    Findings: [
      'FindingID', 'SessionID', 'CategoryID', 'CategoryNameSnapshot',
      'SectionID', 'SectionNameSnapshot', 'Masalah', 'Mengapa', 'Solusi',
      'Version', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy',
      'DeletedAt', 'DeletedBy', 'DeleteReason', 'DeletionSource'
    ],
    Photos: [
      'PhotoID', 'FindingID', 'SessionID', 'DriveFileID', 'FileName', 'MimeType',
      'FileSize', 'PhotoComment', 'Status', 'IdempotencyKey',
      'UploadedAt', 'UploadedBy', 'DeletedAt', 'DeletedBy', 'PurgeReason', 'PurgedAt'
    ],
    AuditLogs: [
      'LogID', 'UserID', 'Action', 'EntityType', 'EntityID',
      'BeforeData', 'AfterData', 'Timestamp', 'DeviceInfo', 'Description'
    ],
    Notifications: [
      'NotificationID', 'UserID', 'Type', 'Title', 'Message',
      'RelatedEntityID', 'MetadataJSON', 'ReadAt', 'CreatedAt'
    ],
    NotificationPreferences: [
      'PreferenceID', 'UserID', 'NotificationType', 'InAppEnabled', 'EmailEnabled'
    ],
    DraftRestoreRequests: [
      'RequestID', 'SessionID', 'TrainerID', 'RequestReason', 'Status',
      'RequestedAt', 'ProcessedBy', 'ProcessedAt', 'DecisionReason'
    ],
    SyncMetadata: [
      'SyncID', 'SessionID', 'DeviceID', 'LocalVersion', 'ServerVersion',
      'SyncStatus', 'LastSyncAt', 'ConflictData', 'LastIdempotencyKey'
    ],
    PDFHistory: [
      'PDFVersionID', 'SessionID', 'ReportType', 'VersionNumber',
      'GeneratedAt', 'GeneratedBy', 'RecipientEmail', 'SendStatus'
    ],
    EmailLogs: [
      'EmailLogID', 'SessionID', 'Recipient', 'PDFVersionID',
      'AttemptAt', 'Status', 'FailureReason'
    ],
    BackupHistory: [
      'BackupID', 'BackupType', 'BackupDate', 'Status', 'Size',
      'Important', 'Result', 'StorageReference'
    ],
    AppSettings: [
      'SettingKey', 'SettingValue', 'UpdatedAt', 'UpdatedBy'
    ]
  },

  SEED_CATEGORIES: [
    'Food Safety',
    'Personal Hygiene',
    'Cleaning & Sanitation',
    'Food Handling',
    'Storage Management',
    'Equipment & Maintenance',
    'Operational Procedure',
    'Product Quality'
  ],

  SEED_SECTIONS: [
    'Topping, Cutting & Stuffing',
    'Beverage & Salad',
    'Delivery',
    'Pasta, Rice & Snack',
    'Administrasi',
    'Order Taker dan Cashier',
    'Dough'
  ]
};

var TM_Utils = (function () {
  var _nowProvider = null;

  function setNowProvider(fn) {
    _nowProvider = fn;
  }

  function now() {
    return _nowProvider ? new Date(_nowProvider()) : new Date();
  }

  function formatWibIso(dateInput) {
    var d = dateInput ? new Date(dateInput) : now();
    if (typeof Utilities !== 'undefined' && Utilities.formatDate) {
      return Utilities.formatDate(d, TM_CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
    }
    var utcMs = d.getTime() + (d.getTimezoneOffset() * 60000);
    var wib = new Date(utcMs + (7 * 3600000));
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return (
      wib.getFullYear() + '-' + pad(wib.getMonth() + 1) + '-' + pad(wib.getDate()) +
      'T' + pad(wib.getHours()) + ':' + pad(wib.getMinutes()) + ':' + pad(wib.getSeconds()) + '+07:00'
    );
  }

  function addMinutesIso(dateInput, minutes) {
    var d = dateInput ? new Date(dateInput) : now();
    return formatWibIso(new Date(d.getTime() + minutes * 60000));
  }

  function addHoursIso(dateInput, hours) {
    return addMinutesIso(dateInput, hours * 60);
  }

  function generateId(prefix) {
    var raw = typeof Utilities !== 'undefined' && Utilities.getUuid
      ? Utilities.getUuid().replace(/-/g, '')
      : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    return (prefix ? prefix + '-' : '') + raw.slice(0, 16).toUpperCase();
  }

  function AppError(code, message, details) {
    var err = new Error(message);
    err.code = code || 'ERR_INTERNAL';
    err.details = details || null;
    err.isAppError = true;
    return err;
  }

  function okResponse(data) {
    return {
      ok: true,
      data: data === undefined ? null : data,
      error: null,
      serverTime: formatWibIso()
    };
  }

  function errorResponse(err) {
    var code = (err && err.isAppError && err.code) ? err.code : 'ERR_INTERNAL';
    var message = (err && err.message) ? err.message : 'Terjadi kesalahan pada server.';
    var details = (err && err.isAppError && err.details) ? err.details : null;
    return {
      ok: false,
      data: null,
      error: {
        code: code,
        message: message,
        details: details
      },
      serverTime: formatWibIso()
    };
  }

  function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    var trimmed = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }

  function sanitizeText(val) {
    return String(val === null || val === undefined ? '' : val).trim();
  }

  var MONTH_MAP = {
    jan: 1, januari: 1, january: 1,
    feb: 2, februari: 2, february: 2,
    mar: 3, maret: 3, march: 3,
    apr: 4, april: 4,
    mei: 5, may: 5,
    jun: 6, juni: 6, june: 6,
    jul: 7, juli: 7, july: 7,
    agu: 8, agt: 8, ags: 8, agustus: 8, aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    okt: 10, oct: 10, oktober: 10, october: 10,
    nov: 11, nop: 11, november: 11, nopember: 11,
    des: 12, dec: 12, desember: 12, december: 12
  };

  function isValidYmdParts(y, m, d) {
    if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    var maxDays = new Date(y, m, 0).getDate();
    return d <= maxDays;
  }

  function formatYmdParts(y, m, d) {
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return String(y) + '-' + pad(m) + '-' + pad(d);
  }

  /**
   * Menormalisasi berbagai format tanggal kalender ke YYYY-MM-DD:
   * - Date object Google Sheets
   * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (contoh: 06/11/2026)
   * - D MMM YYYY / DD MMMM YYYY bahasa Indonesia & Inggris (contoh: 6 Nov 2026, 06 November 2026)
   * - YYYY-MM-DD, YYYY/MM/DD (contoh: 2026-11-06)
   * - ISO 8601 atau string Date Google Sheets (contoh: Fri Nov 06 2026 00:00:00 GMT+0700)
   */
  function normalizeDateStr(dateInput) {
    if (dateInput === null || dateInput === undefined || dateInput === '') return '';
    if (Object.prototype.toString.call(dateInput) === '[object Date]') {
      if (isNaN(dateInput.getTime())) return '';
      return formatWibIso(dateInput).slice(0, 10);
    }
    var s = String(dateInput).trim();
    if (!s) return '';

    // 1. YYYY-MM-DD atau YYYY/MM/DD
    var mYmd = s.match(/^(\d{4})[\/\-.\s](\d{1,2})[\/\-.\s](\d{1,2})$/);
    if (mYmd) {
      var y1 = parseInt(mYmd[1], 10);
      var mo1 = parseInt(mYmd[2], 10);
      var d1 = parseInt(mYmd[3], 10);
      if (!isValidYmdParts(y1, mo1, d1)) return '';
      return formatYmdParts(y1, mo1, d1);
    }

    // 2. DD/MM/YYYY atau DD-MM-YYYY (Format kalender lokal Indonesia: 06/11/2026)
    var mDmy = s.match(/^(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{4})$/);
    if (mDmy) {
      var d2 = parseInt(mDmy[1], 10);
      var mo2 = parseInt(mDmy[2], 10);
      var y2 = parseInt(mDmy[3], 10);
      if (mo2 > 12 && d2 >= 1 && d2 <= 12) {
        var tmp = d2;
        d2 = mo2;
        mo2 = tmp;
      }
      if (!isValidYmdParts(y2, mo2, d2)) return '';
      return formatYmdParts(y2, mo2, d2);
    }

    // 3. D MMM YYYY / DD MMMM YYYY (Format popup kalender Android: 6 Nov 2026 / 6 November 2026)
    var mText = s.match(/^(\d{1,2})[\s\/\-.,]+([A-Za-z]+)[\s\/\-.,]+(\d{4})$/);
    if (mText) {
      var d3 = parseInt(mText[1], 10);
      var mo3 = MONTH_MAP[mText[2].toLowerCase()] || 0;
      var y3 = parseInt(mText[3], 10);
      if (!isValidYmdParts(y3, mo3, d3)) return '';
      return formatYmdParts(y3, mo3, d3);
    }

    // 4. ISO 8601 timestamp atau Date.toString() dari sel tanggal Google Sheets
    if (/^\d{4}-\d{2}-\d{2}T/.test(s) || /\b\d{4}\b/.test(s)) {
      var parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        return formatWibIso(parsed).slice(0, 10);
      }
    }

    return '';
  }

  return {
    setNowProvider: setNowProvider,
    now: now,
    formatWibIso: formatWibIso,
    addMinutesIso: addMinutesIso,
    addHoursIso: addHoursIso,
    generateId: generateId,
    AppError: AppError,
    okResponse: okResponse,
    errorResponse: errorResponse,
    isValidEmail: isValidEmail,
    sanitizeText: sanitizeText,
    normalizeDateStr: normalizeDateStr
  };
})();



/* ==================== FILE: Db.gs ==================== */
/**
 * Db.gs — Lapisan akses Google Sheets berbasis batch, header-mapping, cache, dan LockService.
 */

var TM_Db = (function () {
  var _ssCache = null;

  function getProps() {
    return PropertiesService.getScriptProperties();
  }

  function getScriptCache() {
    return CacheService.getScriptCache();
  }

  function resetSpreadsheetCache() {
    _ssCache = null;
  }

  function getSpreadsheet() {
    if (_ssCache) return _ssCache;
    var ssId = getProps().getProperty(TM_CONFIG.PROP_KEYS.SPREADSHEET_ID);
    if (!ssId) {
      throw TM_Utils.AppError('ERR_NOT_INITIALIZED', 'Database aplikasi belum diinisialisasi.');
    }
    _ssCache = SpreadsheetApp.openById(ssId);
    return _ssCache;
  }

  function getSheet(sheetName) {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw TM_Utils.AppError('ERR_SHEET_MISSING', 'Sheet "' + sheetName + '" tidak ditemukan.');
    }
    return sheet;
  }

  function withLock(fn, timeoutMs) {
    var lock = LockService.getScriptLock();
    var acquired = lock.tryLock(timeoutMs || 25000);
    if (!acquired) {
      throw TM_Utils.AppError('ERR_LOCK_TIMEOUT', 'Sistem sedang memproses transaksi lain. Silakan coba lagi.');
    }
    try {
      return fn();
    } finally {
      lock.releaseLock();
    }
  }

  function ensureSheetHeaders(sheet, expectedHeaders) {
    var lastCol = sheet.getLastColumn();
    if (sheet.getLastRow() === 0 || lastCol === 0) {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
      return expectedHeaders;
    }
    var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    return currentHeaders;
  }

  function cellToString(headerName, val) {
    if (val === undefined || val === null || val === '') return '';
    if (Object.prototype.toString.call(val) === '[object Date]') {
      if (isNaN(val.getTime())) return '';
      if (headerName === 'InspectionDate') {
        return TM_Utils.formatWibIso(val).slice(0, 10);
      }
      return TM_Utils.formatWibIso(val);
    }
    var str = String(val);
    if (headerName === 'InspectionDate') {
      return TM_Utils.normalizeDateStr(str) || str;
    }
    return str;
  }

  function getAllRecords(sheetName) {
    var sheet = getSheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) {
      return [];
    }
    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = values[0];
    var records = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var isEmpty = true;
      for (var c = 0; c < headers.length; c++) {
        if (row[c] !== '' && row[c] !== null && row[c] !== undefined) {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty) continue;
      var obj = {};
      for (var col = 0; col < headers.length; col++) {
        var key = String(headers[col]);
        obj[key] = cellToString(key, row[col]);
      }
      records.push(obj);
    }
    return records;
  }

  function findRecord(sheetName, predicate) {
    var rows = getAllRecords(sheetName);
    for (var i = 0; i < rows.length; i++) {
      if (predicate(rows[i])) return rows[i];
    }
    return null;
  }

  function findById(sheetName, idField, idValue) {
    var target = String(idValue);
    return findRecord(sheetName, function (row) {
      return String(row[idField]) === target;
    });
  }

  function filterRecords(sheetName, predicate) {
    var rows = getAllRecords(sheetName);
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if (predicate(rows[i])) out.push(rows[i]);
    }
    return out;
  }

  function objectToRow(headers, obj) {
    var row = [];
    for (var i = 0; i < headers.length; i++) {
      var key = headers[i];
      var val = obj[key];
      row.push(val === undefined || val === null ? '' : String(val));
    }
    return row;
  }

  function insertRecord(sheetName, obj) {
    return insertRecordsBatch(sheetName, [obj])[0];
  }

  function insertRecordsBatch(sheetName, objs) {
    if (!objs || objs.length === 0) return [];
    var sheet = getSheet(sheetName);
    var expectedHeaders = TM_CONFIG.SHEETS[sheetName];
    var headers = ensureSheetHeaders(sheet, expectedHeaders);
    var rows = objs.map(function (o) { return objectToRow(headers, o); });
    var startRow = Math.max(sheet.getLastRow() + 1, 2);
    var targetRange = sheet.getRange(startRow, 1, rows.length, headers.length);
    if (typeof targetRange.setNumberFormat === 'function') {
      targetRange.setNumberFormat('@');
    }
    targetRange.setValues(rows);
    return objs;
  }

  function replaceSheetRecords(sheetName, objs) {
    var sheet = getSheet(sheetName);
    var expectedHeaders = TM_CONFIG.SHEETS[sheetName];
    if (typeof sheet.clearContents === 'function') {
      sheet.clearContents();
    } else if (typeof sheet.clear === 'function') {
      sheet.clear();
    }
    ensureSheetHeaders(sheet, expectedHeaders);
    if (objs && objs.length > 0) {
      insertRecordsBatch(sheetName, objs);
    }
  }

  function updateRecordById(sheetName, idField, idValue, updaterFn) {
    var sheet = getSheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) return null;

    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = values[0];
    var idColIdx = headers.indexOf(idField);
    if (idColIdx === -1) {
      throw TM_Utils.AppError('ERR_SCHEMA', 'Kolom "' + idField + '" tidak ada di sheet "' + sheetName + '".');
    }

    var target = String(idValue);
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][idColIdx]) === target) {
        var existing = {};
        for (var c = 0; c < headers.length; c++) {
          var key = String(headers[c]);
          existing[key] = cellToString(key, values[r][c]);
        }
        var updated = updaterFn(Object.assign({}, existing)) || existing;
        var rowArray = objectToRow(headers, updated);
        var rowRange = sheet.getRange(r + 1, 1, 1, headers.length);
        if (typeof rowRange.setNumberFormat === 'function') {
          rowRange.setNumberFormat('@');
        }
        rowRange.setValues([rowArray]);
        return updated;
      }
    }
    return null;
  }

  function deleteRecordById(sheetName, idField, idValue) {
    var target = String(idValue);
    var deleted = deleteRecordsWhere(sheetName, function (row) {
      return String(row[idField]) === target;
    });
    return deleted.length > 0 ? deleted[0] : null;
  }

  function deleteRecordsWhere(sheetName, predicate) {
    var rows = getAllRecords(sheetName);
    var kept = [];
    var removed = [];
    for (var i = 0; i < rows.length; i++) {
      if (predicate(rows[i])) {
        removed.push(rows[i]);
      } else {
        kept.push(rows[i]);
      }
    }
    if (removed.length > 0) {
      replaceSheetRecords(sheetName, kept);
    }
    return removed;
  }

  function upsertSetting(key, value, userId) {
    var ts = TM_Utils.formatWibIso();
    var updated = updateRecordById('AppSettings', 'SettingKey', key, function (rec) {
      rec.SettingValue = String(value);
      rec.UpdatedAt = ts;
      rec.UpdatedBy = userId || 'SYSTEM';
      return rec;
    });
    if (!updated) {
      updated = insertRecord('AppSettings', {
        SettingKey: key,
        SettingValue: String(value),
        UpdatedAt: ts,
        UpdatedBy: userId || 'SYSTEM'
      });
    }
    invalidateCache('APP_SETTINGS');
    return updated;
  }

  function getCachedJson(cacheKey, ttlSeconds, loaderFn) {
    try {
      var cache = getScriptCache();
      var raw = cache.get(cacheKey);
      if (raw) {
        return JSON.parse(raw);
      }
      var fresh = loaderFn();
      var serialized = JSON.stringify(fresh);
      if (serialized.length < 95000) {
        cache.put(cacheKey, serialized, ttlSeconds || 300);
      }
      return fresh;
    } catch (e) {
      return loaderFn();
    }
  }

  function invalidateCache(cacheKey) {
    try {
      getScriptCache().remove(cacheKey);
    } catch (e) {
      // ignore cache errors
    }
  }

  return {
    getProps: getProps,
    getScriptCache: getScriptCache,
    resetSpreadsheetCache: resetSpreadsheetCache,
    getSpreadsheet: getSpreadsheet,
    getSheet: getSheet,
    withLock: withLock,
    ensureSheetHeaders: ensureSheetHeaders,
    getAllRecords: getAllRecords,
    findRecord: findRecord,
    findById: findById,
    filterRecords: filterRecords,
    insertRecord: insertRecord,
    insertRecordsBatch: insertRecordsBatch,
    replaceSheetRecords: replaceSheetRecords,
    updateRecordById: updateRecordById,
    deleteRecordById: deleteRecordById,
    deleteRecordsWhere: deleteRecordsWhere,
    upsertSetting: upsertSetting,
    getCachedJson: getCachedJson,
    invalidateCache: invalidateCache
  };
})();



/* ==================== FILE: Security.gs ==================== */
/**
 * Security.gs — Kriptografi PBKDF2-HMAC-SHA256, token HMAC, constant-time compare, & validasi password.
 */

var TM_Security = (function () {
  // Pure-JS SHA-256 (V8 & Node deterministic, tanpa overhead bridge 10.000x ke Java)
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function utf8ToBytes(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        i++;
        var code2 = str.charCodeAt(i);
        var cp = 0x10000 + (((code & 0x3ff) << 10) | (code2 & 0x3ff));
        bytes.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f)
        );
      }
    }
    return bytes;
  }

  function bytesToHex(bytes) {
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      hex += ('0' + (bytes[i] & 0xff).toString(16)).slice(-2);
    }
    return hex;
  }

  function hexToBytes(hex) {
    var bytes = [];
    for (var i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  function sha256Bytes(msgBytes) {
    var H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    var m = msgBytes.slice();
    var bitLen = m.length * 8;
    m.push(0x80);
    while ((m.length % 64) !== 56) {
      m.push(0);
    }
    var hi = Math.floor(bitLen / 0x100000000);
    var lo = bitLen >>> 0;
    m.push((hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff);
    m.push((lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff);

    var w = new Array(64);
    for (var offset = 0; offset < m.length; offset += 64) {
      for (var t = 0; t < 16; t++) {
        var j = offset + t * 4;
        w[t] = ((m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3]) | 0;
      }
      for (var t2 = 16; t2 < 64; t2++) {
        var s0 = ((w[t2 - 15] >>> 7) | (w[t2 - 15] << 25)) ^ ((w[t2 - 15] >>> 18) | (w[t2 - 15] << 14)) ^ (w[t2 - 15] >>> 3);
        var s1 = ((w[t2 - 2] >>> 17) | (w[t2 - 2] << 15)) ^ ((w[t2 - 2] >>> 19) | (w[t2 - 2] << 13)) ^ (w[t2 - 2] >>> 10);
        w[t2] = (w[t2 - 16] + s0 + w[t2 - 7] + s1) | 0;
      }

      var a = H[0], b = H[1], c = H[2], d = H[3];
      var e = H[4], f = H[5], g = H[6], h = H[7];

      for (var i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ ((~e) & g);
        var temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (S0 + maj) | 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) | 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) | 0;
      }

      H[0] = (H[0] + a) | 0;
      H[1] = (H[1] + b) | 0;
      H[2] = (H[2] + c) | 0;
      H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0;
      H[5] = (H[5] + f) | 0;
      H[6] = (H[6] + g) | 0;
      H[7] = (H[7] + h) | 0;
    }

    var out = [];
    for (var idx = 0; idx < 8; idx++) {
      out.push((H[idx] >>> 24) & 0xff, (H[idx] >>> 16) & 0xff, (H[idx] >>> 8) & 0xff, H[idx] & 0xff);
    }
    return out;
  }

  function sha256Hex(str) {
    return bytesToHex(sha256Bytes(utf8ToBytes(String(str))));
  }

  function hmacSha256Bytes(keyBytes, msgBytes) {
    var key = keyBytes.length > 64 ? sha256Bytes(keyBytes) : keyBytes.slice();
    while (key.length < 64) key.push(0);
    var oKeyPad = new Array(64);
    var iKeyPad = new Array(64);
    for (var i = 0; i < 64; i++) {
      oKeyPad[i] = key[i] ^ 0x5c;
      iKeyPad[i] = key[i] ^ 0x36;
    }
    var inner = sha256Bytes(iKeyPad.concat(msgBytes));
    return sha256Bytes(oKeyPad.concat(inner));
  }

  function hmacSha256Hex(secretStr, msgStr) {
    return bytesToHex(hmacSha256Bytes(utf8ToBytes(String(secretStr)), utf8ToBytes(String(msgStr))));
  }

  function pbkdf2Sha256Hex(password, saltBytes, iterations) {
    var pwdBytes = utf8ToBytes(String(password));
    var block1 = saltBytes.concat([0, 0, 0, 1]);
    var u = hmacSha256Bytes(pwdBytes, block1);
    var t = u.slice();
    for (var i = 1; i < iterations; i++) {
      u = hmacSha256Bytes(pwdBytes, u);
      for (var j = 0; j < 32; j++) {
        t[j] ^= u[j];
      }
    }
    return bytesToHex(t);
  }

  function randomHex(byteCount) {
    var out = [];
    while (out.length < byteCount * 2) {
      var seed = (
        (typeof Utilities !== 'undefined' && Utilities.getUuid ? Utilities.getUuid() : '') +
        ':' + Date.now() + ':' + Math.random() + ':' + Math.random()
      );
      out.push(sha256Hex(seed));
    }
    return out.join('').slice(0, byteCount * 2);
  }

  function constantTimeEquals(a, b) {
    var s1 = String(a || '');
    var s2 = String(b || '');
    var diff = s1.length ^ s2.length;
    var maxLen = Math.max(s1.length, s2.length);
    for (var i = 0; i < maxLen; i++) {
      var c1 = i < s1.length ? s1.charCodeAt(i) : 0;
      var c2 = i < s2.length ? s2.charCodeAt(i) : 0;
      diff |= (c1 ^ c2);
    }
    return diff === 0;
  }

  function hashPassword(password) {
    var iterations = TM_CONFIG.AUTH.PBKDF2_ITERATIONS;
    var saltHex = randomHex(16);
    var derivedHex = pbkdf2Sha256Hex(password, hexToBytes(saltHex), iterations);
    return 'pbkdf2$' + iterations + '$' + saltHex + '$' + derivedHex;
  }

  function verifyPassword(password, storedHash) {
    if (!password || !storedHash) return false;
    var parts = String(storedHash).split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    var iterations = parseInt(parts[1], 10);
    var saltHex = parts[2];
    var expectedHex = parts[3];
    if (!iterations || iterations < 1000 || !saltHex || !expectedHex) return false;
    var actualHex = pbkdf2Sha256Hex(password, hexToBytes(saltHex), iterations);
    return constantTimeEquals(actualHex, expectedHex);
  }

  function validatePasswordStrength(password) {
    var p = String(password || '');
    if (p.length < TM_CONFIG.AUTH.MIN_PASSWORD_LENGTH) {
      return 'Password minimal ' + TM_CONFIG.AUTH.MIN_PASSWORD_LENGTH + ' karakter.';
    }
    if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) {
      return 'Password harus mengandung kombinasi huruf dan angka.';
    }
    return null;
  }

  var B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function bytesToBase64Url(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 3) {
      var b1 = bytes[i] & 0xff;
      var hasB2 = (i + 1) < bytes.length;
      var hasB3 = (i + 2) < bytes.length;
      var b2 = hasB2 ? (bytes[i + 1] & 0xff) : 0;
      var b3 = hasB3 ? (bytes[i + 2] & 0xff) : 0;
      var triplet = (b1 << 16) | (b2 << 8) | b3;
      out += B64_CHARS.charAt((triplet >> 18) & 0x3f);
      out += B64_CHARS.charAt((triplet >> 12) & 0x3f);
      if (hasB2) out += B64_CHARS.charAt((triplet >> 6) & 0x3f);
      if (hasB3) out += B64_CHARS.charAt(triplet & 0x3f);
    }
    return out.replace(/\+/g, '-').replace(/\//g, '_');
  }

  function base64UrlToBytes(b64u) {
    var s = String(b64u || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4 !== 0) s += '=';
    var out = [];
    for (var i = 0; i < s.length; i += 4) {
      var c1 = B64_CHARS.indexOf(s.charAt(i));
      var c2 = B64_CHARS.indexOf(s.charAt(i + 1));
      var c3 = s.charAt(i + 2) === '=' ? -1 : B64_CHARS.indexOf(s.charAt(i + 2));
      var c4 = s.charAt(i + 3) === '=' ? -1 : B64_CHARS.indexOf(s.charAt(i + 3));
      if (c1 < 0 || c2 < 0) break;
      var triplet = (c1 << 18) | (c2 << 12) | ((c3 > 0 ? c3 : 0) << 6) | (c4 > 0 ? c4 : 0);
      out.push((triplet >> 16) & 0xff);
      if (c3 >= 0) out.push((triplet >> 8) & 0xff);
      if (c4 >= 0) out.push(triplet & 0xff);
    }
    return out;
  }

  function bytesToUtf8(bytes) {
    var str = '';
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i] & 0xff;
      if (b < 0x80) {
        str += String.fromCharCode(b);
      } else if ((b & 0xe0) === 0xc0 && (i + 1) < bytes.length) {
        str += String.fromCharCode(((b & 0x1f) << 6) | (bytes[++i] & 0x3f));
      } else if ((b & 0xf0) === 0xe0 && (i + 2) < bytes.length) {
        var b2 = bytes[++i] & 0x3f;
        var b3 = bytes[++i] & 0x3f;
        str += String.fromCharCode(((b & 0x0f) << 12) | (b2 << 6) | b3);
      } else if ((b & 0xf8) === 0xf0 && (i + 3) < bytes.length) {
        var cp = ((b & 0x07) << 18) | ((bytes[++i] & 0x3f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f);
        cp -= 0x10000;
        str += String.fromCharCode(0xd800 + ((cp >> 10) & 0x3ff), 0xdc00 + (cp & 0x3ff));
      }
    }
    return str;
  }

  function base64UrlJson(obj) {
    return bytesToBase64Url(utf8ToBytes(JSON.stringify(obj)));
  }

  function parseBase64UrlJson(b64u) {
    try {
      var raw = bytesToUtf8(base64UrlToBytes(b64u));
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function readBearerToken(value) {
    if (!value || typeof value !== 'string') return '';
    var trimmed = value.trim();
    var m = /^Bearer\s+([^\s]+)$/i.exec(trimmed);
    return m ? m[1] : trimmed;
  }

  function getHmacSecret() {
    var secret = TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.HMAC_SECRET);
    if (!secret) {
      throw TM_Utils.AppError('ERR_NOT_INITIALIZED', 'Kunci keamanan aplikasi belum diinisialisasi.');
    }
    return secret;
  }

  /**
   * Membuat token sesi mengikuti pola Orca (apns-authentication-token.ts & relay-token-verifier.ts):
   * base64Url(header).base64Url(payload).hmacSignature
   */
  function signSessionToken(authSessionId, claimsInput) {
    var opts = claimsInput || {};
    var nowMs = TM_Utils.now().getTime();
    var iatSec = Math.floor(nowMs / 1000);
    var expSec = opts.exp || (iatSec + (TM_CONFIG.AUTH.SESSION_MAX_HOURS * 3600));
    var header = base64UrlJson({ alg: 'HS256', typ: 'TM-AUTH', v: 1 });
    var payload = base64UrlJson({
      sid: String(authSessionId),
      sub: String(opts.userId || authSessionId),
      role: String(opts.role || ''),
      purpose: 'session-auth',
      iat: iatSec,
      exp: expSec
    });
    var signingInput = header + '.' + payload;
    var sig = hmacSha256Hex(getHmacSecret(), 'SESSION_V2:' + signingInput);
    return signingInput + '.' + sig;
  }

  function verifySessionTokenClaims(rawToken) {
    var token = readBearerToken(rawToken);
    if (!token) return null;
    var parts = token.split('.');

    // Pola V2 (Orca 3-part: header.payload.signature)
    if (parts.length === 3) {
      var signingInput = parts[0] + '.' + parts[1];
      var providedSig = parts[2];
      if (!parts[0] || !parts[1] || !providedSig) return null;
      var expectedSig = hmacSha256Hex(getHmacSecret(), 'SESSION_V2:' + signingInput);
      if (!constantTimeEquals(providedSig, expectedSig)) return null;
      var claims = parseBase64UrlJson(parts[1]);
      if (!claims || !claims.sid || claims.purpose !== 'session-auth') return null;
      return claims;
    }

    // Kompatibilitas balik V1 (2-part: sessionId.signature)
    if (parts.length === 2) {
      var authSessionId = parts[0];
      var sigV1 = parts[1];
      if (!authSessionId || !sigV1) return null;
      var expectedV1 = hmacSha256Hex(getHmacSecret(), 'SESSION:' + authSessionId);
      if (!constantTimeEquals(sigV1, expectedV1)) return null;
      return {
        sid: authSessionId,
        sub: authSessionId,
        role: '',
        purpose: 'session-auth'
      };
    }

    return null;
  }

  function verifySessionToken(rawToken) {
    var claims = verifySessionTokenClaims(rawToken);
    return claims ? claims.sid : null;
  }

  return {
    sha256Hex: sha256Hex,
    hmacSha256Hex: hmacSha256Hex,
    randomHex: randomHex,
    constantTimeEquals: constantTimeEquals,
    hashPassword: hashPassword,
    verifyPassword: verifyPassword,
    validatePasswordStrength: validatePasswordStrength,
    base64UrlJson: base64UrlJson,
    parseBase64UrlJson: parseBase64UrlJson,
    readBearerToken: readBearerToken,
    signSessionToken: signSessionToken,
    verifySessionTokenClaims: verifySessionTokenClaims,
    verifySessionToken: verifySessionToken
  };
})();



/* ==================== FILE: Audit.gs ==================== */
/**
 * Audit.gs — Append-only AuditLogs & query untuk Super Admin.
 */

var TM_Audit = (function () {
  var SENSITIVE_KEYS = ['PasswordHash', 'password', 'newPassword', 'currentPassword', 'tempPassword', 'ResetTokenHash', 'token', 'TokenHash'];

  function redactObject(obj) {
    if (obj === null || obj === undefined) return '';
    if (typeof obj === 'string') return obj;
    try {
      var clone = JSON.parse(JSON.stringify(obj));
      if (clone && typeof clone === 'object') {
        for (var i = 0; i < SENSITIVE_KEYS.length; i++) {
          var k = SENSITIVE_KEYS[i];
          if (Object.prototype.hasOwnProperty.call(clone, k)) {
            clone[k] = '[REDACTED]';
          }
        }
      }
      return JSON.stringify(clone);
    } catch (e) {
      return String(obj);
    }
  }

  function logEvent(entry) {
    var record = {
      LogID: TM_Utils.generateId('LOG'),
      UserID: entry.userId || 'SYSTEM',
      Action: entry.action || 'UNKNOWN',
      EntityType: entry.entityType || 'SYSTEM',
      EntityID: entry.entityId || '',
      BeforeData: redactObject(entry.beforeData),
      AfterData: redactObject(entry.afterData),
      Timestamp: TM_Utils.formatWibIso(),
      DeviceInfo: TM_Utils.sanitizeText(entry.deviceInfo || ''),
      Description: TM_Utils.sanitizeText(entry.description || '')
    };
    return TM_Db.insertRecord('AuditLogs', record);
  }

  function queryAuditLogs(token, filters) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var f = filters || {};

    // Catat akses ke Audit Log itu sendiri (PRD Section 16)
    logEvent({
      userId: ctx.user.UserID,
      action: 'AUDIT_LOG_ACCESSED',
      entityType: 'AuditLogs',
      entityId: '',
      afterData: { filters: f },
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Super Admin mengakses riwayat Audit Log'
    });

    var all = TM_Db.getAllRecords('AuditLogs');
    var search = TM_Utils.sanitizeText(f.search).toLowerCase();
    var actionFilter = TM_Utils.sanitizeText(f.action);
    var entityFilter = TM_Utils.sanitizeText(f.entityType);
    var userFilter = TM_Utils.sanitizeText(f.userId);
    var dateFrom = TM_Utils.sanitizeText(f.dateFrom);
    var dateTo = TM_Utils.sanitizeText(f.dateTo);

    var filtered = all.filter(function (row) {
      if (actionFilter && row.Action !== actionFilter) return false;
      if (entityFilter && row.EntityType !== entityFilter) return false;
      if (userFilter && row.UserID !== userFilter) return false;
      var rowDate = String(row.Timestamp || '').slice(0, 10);
      if (dateFrom && rowDate < dateFrom) return false;
      if (dateTo && rowDate > dateTo) return false;
      if (search) {
        var hay = (
          row.LogID + ' ' + row.UserID + ' ' + row.Action + ' ' +
          row.EntityType + ' ' + row.EntityID + ' ' + row.Description
        ).toLowerCase();
        if (hay.indexOf(search) === -1) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      return String(b.Timestamp).localeCompare(String(a.Timestamp));
    });

    var page = Math.max(1, parseInt(f.page || 1, 10));
    var pageSize = Math.min(100, Math.max(10, parseInt(f.pageSize || 25, 10)));
    var total = filtered.length;
    var start = (page - 1) * pageSize;
    var items = filtered.slice(start, start + pageSize);

    // Enrich dengan nama user agar mudah dibaca di UI
    var users = TM_Db.getAllRecords('Users');
    var userMap = {};
    for (var i = 0; i < users.length; i++) {
      userMap[users[i].UserID] = users[i].Name + ' (' + users[i].Username + ')';
    }
    items = items.map(function (item) {
      return Object.assign({}, item, {
        UserDisplay: userMap[item.UserID] || item.UserID
      });
    });

    return {
      items: items,
      total: total,
      page: page,
      pageSize: pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }

  return {
    logEvent: logEvent,
    queryAuditLogs: queryAuditLogs
  };
})();



/* ==================== FILE: Settings.gs ==================== */
/**
 * Settings.gs — Pengaturan Aplikasi (Nama Perusahaan, Logo Privat Drive, & Batas Operasional).
 */

var TM_Settings = (function () {
  var CACHE_KEY = 'APP_SETTINGS_BUNDLE';

  function loadSettingsMap() {
    return TM_Db.getCachedJson(CACHE_KEY, 300, function () {
      var rows = TM_Db.getAllRecords('AppSettings');
      var map = {};
      for (var i = 0; i < rows.length; i++) {
        map[rows[i].SettingKey] = rows[i].SettingValue;
      }
      var logoDataUrl = '';
      var logoFileId = map.COMPANY_LOGO_FILE_ID || '';
      if (logoFileId && typeof DriveApp !== 'undefined') {
        try {
          var file = DriveApp.getFileById(logoFileId);
          var blob = file.getBlob();
          var mime = blob.getContentType() || 'image/png';
          logoDataUrl = 'data:' + mime + ';base64,' + Utilities.base64Encode(blob.getBytes());
        } catch (e) {
          logoDataUrl = '';
        }
      }
      return {
        companyName: map.COMPANY_NAME || TM_CONFIG.DEFAULTS.COMPANY_NAME,
        logoFileId: logoFileId,
        logoDataUrl: logoDataUrl,
        maxActiveDrafts: parseInt(map.MAX_ACTIVE_DRAFTS || TM_CONFIG.DEFAULTS.MAX_ACTIVE_DRAFTS, 10),
        backupRetentionDays: parseInt(map.BACKUP_RETENTION_DAYS || TM_CONFIG.DEFAULTS.BACKUP_RETENTION_DAYS, 10),
        localDeletedRetentionDays: parseInt(map.LOCAL_DELETED_RETENTION_DAYS || TM_CONFIG.DEFAULTS.LOCAL_DELETED_RETENTION_DAYS, 10)
      };
    });
  }

  function getPublicBranding() {
    if (!TM_Bootstrap.isInitialized()) {
      return {
        companyName: TM_CONFIG.DEFAULTS.COMPANY_NAME,
        logoDataUrl: ''
      };
    }
    var bundle = loadSettingsMap();
    return {
      companyName: bundle.companyName,
      logoDataUrl: bundle.logoDataUrl
    };
  }

  function getAppSettings(token) {
    TM_Auth.requireAuth(token);
    return loadSettingsMap();
  }

  function updateAppSettings(token, dto, logoPayload) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var p = dto || {};
    var companyName = TM_Utils.sanitizeText(p.companyName);
    var maxDrafts = parseInt(p.maxActiveDrafts !== undefined ? p.maxActiveDrafts : TM_CONFIG.DEFAULTS.MAX_ACTIVE_DRAFTS, 10);

    if (!companyName || companyName.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama perusahaan wajib diisi (minimal 2 karakter).');
    }
    if (isNaN(maxDrafts) || maxDrafts < 1 || maxDrafts > 20) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Batas Draft aktif harus bernilai antara 1 hingga 20.');
    }

    var before = loadSettingsMap();
    var newLogoFileId = before.logoFileId;

    if (p.removeLogo === true) {
      newLogoFileId = '';
    } else if (logoPayload && logoPayload.base64Data) {
      var mimeType = String(logoPayload.mimeType || '').toLowerCase();
      if (mimeType !== 'image/png' && mimeType !== 'image/jpeg' && mimeType !== 'image/jpg') {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Format logo harus PNG atau JPG.');
      }
      var cleanBase64 = String(logoPayload.base64Data).replace(/^data:[^;]+;base64,/, '');
      var bytes = Utilities.base64Decode(cleanBase64);
      if (bytes.length > TM_CONFIG.DEFAULTS.MAX_LOGO_BYTES) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Ukuran file logo maksimal 2 MB.');
      }
      var brandingFolderId = TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.DRIVE_BRANDING_ID);
      if (!brandingFolderId) {
        throw TM_Utils.AppError('ERR_CONFIG', 'Folder Drive branding tidak ditemukan.');
      }
      var ext = mimeType === 'image/png' ? 'png' : 'jpg';
      var blob = Utilities.newBlob(bytes, mimeType, 'company-logo-' + Date.now() + '.' + ext);
      var folder = DriveApp.getFolderById(brandingFolderId);
      var created = folder.createFile(blob);
      try {
        created.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      } catch (e) {
        // ignore
      }
      newLogoFileId = created.getId();
    }

    TM_Db.upsertSetting('COMPANY_NAME', companyName, ctx.user.UserID);
    TM_Db.upsertSetting('MAX_ACTIVE_DRAFTS', String(maxDrafts), ctx.user.UserID);
    TM_Db.upsertSetting('COMPANY_LOGO_FILE_ID', newLogoFileId, ctx.user.UserID);
    TM_Db.invalidateCache(CACHE_KEY);

    var after = loadSettingsMap();

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'APP_SETTINGS_UPDATED',
      entityType: 'AppSettings',
      entityId: 'GLOBAL',
      beforeData: {
        companyName: before.companyName,
        maxActiveDrafts: before.maxActiveDrafts,
        logoFileId: before.logoFileId
      },
      afterData: {
        companyName: after.companyName,
        maxActiveDrafts: after.maxActiveDrafts,
        logoFileId: after.logoFileId
      },
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Super Admin memperbarui Pengaturan Aplikasi'
    });

    return after;
  }

  return {
    getPublicBranding: getPublicBranding,
    getAppSettings: getAppSettings,
    updateAppSettings: updateAppSettings
  };
})();



/* ==================== FILE: Bootstrap.gs ==================== */
/**
 * Bootstrap.gs — Auto-provisioning Spreadsheet, Drive privat, seed Master Data, & Super Admin pertama.
 */

var TM_Bootstrap = (function () {
  function isInitialized() {
    return TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.APP_INITIALIZED) === 'true';
  }

  function getBootstrapStatus() {
    var initialized = isInitialized();
    var branding = {
      companyName: TM_CONFIG.DEFAULTS.COMPANY_NAME,
      logoDataUrl: ''
    };
    if (initialized) {
      try {
        branding = TM_Settings.getPublicBranding();
      } catch (e) {
        // ignore branding load error on status check
      }
    }
    return {
      initialized: initialized,
      appName: TM_CONFIG.APP_NAME,
      timezone: TM_CONFIG.TIMEZONE,
      branding: branding
    };
  }

  function setPrivateFolderSharing(folder) {
    try {
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    } catch (e) {
      // Pada beberapa akun personal, setSharing PRIVATE pada folder baru bisa melempar error jika sudah private
    }
  }

  function provisionSpreadsheet() {
    var ss = SpreadsheetApp.create(TM_CONFIG.APP_NAME + ' - Database');
    var sheetNames = Object.keys(TM_CONFIG.SHEETS);

    // Rename default sheet pertama menjadi sheet pertama dalam skema
    var defaultSheet = ss.getSheets()[0];
    defaultSheet.setName(sheetNames[0]);
    TM_Db.ensureSheetHeaders(defaultSheet, TM_CONFIG.SHEETS[sheetNames[0]]);

    for (var i = 1; i < sheetNames.length; i++) {
      var name = sheetNames[i];
      var sheet = ss.insertSheet(name);
      TM_Db.ensureSheetHeaders(sheet, TM_CONFIG.SHEETS[name]);
    }
    return ss;
  }

  function provisionDriveFolders() {
    var root = DriveApp.createFolder(TM_CONFIG.APP_NAME + ' - Private Storage');
    setPrivateFolderSharing(root);

    var activePhotos = root.createFolder('ActivePhotos');
    setPrivateFolderSharing(activePhotos);

    var archivedPhotos = root.createFolder('ArchivedPhotos');
    setPrivateFolderSharing(archivedPhotos);

    var backups = root.createFolder('Backups');
    setPrivateFolderSharing(backups);

    var branding = root.createFolder('Branding');
    setPrivateFolderSharing(branding);

    return {
      rootId: root.getId(),
      activePhotosId: activePhotos.getId(),
      archivedPhotosId: archivedPhotos.getId(),
      backupsId: backups.getId(),
      brandingId: branding.getId()
    };
  }

  function seedInitialData(adminUser, companyName) {
    var ts = TM_Utils.formatWibIso();

    var categories = TM_CONFIG.SEED_CATEGORIES.map(function (name, idx) {
      return {
        CategoryID: 'CAT-' + String(idx + 1).padStart(3, '0'),
        CategoryName: name,
        Status: TM_CONFIG.STATUS.ACTIVE,
        CreatedAt: ts,
        UpdatedAt: ts
      };
    });
    TM_Db.insertRecordsBatch('Categories', categories);

    var sections = TM_CONFIG.SEED_SECTIONS.map(function (name, idx) {
      return {
        SectionID: 'SEC-' + String(idx + 1).padStart(3, '0'),
        SectionName: name,
        Status: TM_CONFIG.STATUS.ACTIVE,
        CreatedAt: ts,
        UpdatedAt: ts
      };
    });
    TM_Db.insertRecordsBatch('Sections', sections);

    var settings = [
      { SettingKey: 'COMPANY_NAME', SettingValue: companyName || TM_CONFIG.DEFAULTS.COMPANY_NAME, UpdatedAt: ts, UpdatedBy: adminUser.UserID },
      { SettingKey: 'COMPANY_LOGO_FILE_ID', SettingValue: '', UpdatedAt: ts, UpdatedBy: adminUser.UserID },
      { SettingKey: 'MAX_ACTIVE_DRAFTS', SettingValue: String(TM_CONFIG.DEFAULTS.MAX_ACTIVE_DRAFTS), UpdatedAt: ts, UpdatedBy: adminUser.UserID },
      { SettingKey: 'BACKUP_RETENTION_DAYS', SettingValue: String(TM_CONFIG.DEFAULTS.BACKUP_RETENTION_DAYS), UpdatedAt: ts, UpdatedBy: adminUser.UserID },
      { SettingKey: 'LOCAL_DELETED_RETENTION_DAYS', SettingValue: String(TM_CONFIG.DEFAULTS.LOCAL_DELETED_RETENTION_DAYS), UpdatedAt: ts, UpdatedBy: adminUser.UserID }
    ];
    TM_Db.insertRecordsBatch('AppSettings', settings);
  }

  function runInitialBootstrap(payload) {
    if (isInitialized()) {
      throw TM_Utils.AppError('ERR_BOOTSTRAP_DISABLED', 'Bootstrap sudah selesai dilakukan dan dinonaktifkan secara permanen.');
    }

    var p = payload || {};
    var name = TM_Utils.sanitizeText(p.name);
    var username = TM_Utils.sanitizeText(p.username).toLowerCase();
    var email = TM_Utils.sanitizeText(p.email).toLowerCase();
    var password = String(p.password || '');
    var companyName = TM_Utils.sanitizeText(p.companyName) || TM_CONFIG.DEFAULTS.COMPANY_NAME;

    if (!name || name.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama lengkap Super Admin wajib diisi (minimal 2 karakter).');
    }
    if (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Username harus 3–32 karakter (huruf kecil, angka, titik, garis bawah, atau tanda hubung).');
    }
    if (!TM_Utils.isValidEmail(email)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Format email Super Admin tidak valid.');
    }
    var pwErr = TM_Security.validatePasswordStrength(password);
    if (pwErr) {
      throw TM_Utils.AppError('ERR_VALIDATION', pwErr);
    }

    return TM_Db.withLock(function () {
      if (isInitialized()) {
        throw TM_Utils.AppError('ERR_BOOTSTRAP_DISABLED', 'Bootstrap sudah selesai dilakukan dan dinonaktifkan secara permanen.');
      }

      var props = TM_Db.getProps();
      var hmacSecret = TM_Security.randomHex(32);
      var ss = provisionSpreadsheet();
      var folders = provisionDriveFolders();

      props.setProperties({
        SPREADSHEET_ID: ss.getId(),
        DRIVE_ROOT_FOLDER_ID: folders.rootId,
        DRIVE_PHOTOS_ACTIVE_ID: folders.activePhotosId,
        DRIVE_PHOTOS_ARCHIVE_ID: folders.archivedPhotosId,
        DRIVE_BACKUPS_ID: folders.backupsId,
        DRIVE_BRANDING_ID: folders.brandingId,
        HMAC_SECRET: hmacSecret,
        SCHEMA_VERSION: TM_CONFIG.SCHEMA_VERSION
      });
      TM_Db.resetSpreadsheetCache();

      var ts = TM_Utils.formatWibIso();
      var adminUser = {
        UserID: TM_Utils.generateId('USR'),
        Name: name,
        Username: username,
        Email: email,
        PasswordHash: TM_Security.hashPassword(password),
        Role: TM_CONFIG.ROLES.SUPER_ADMIN,
        Status: TM_CONFIG.STATUS.ACTIVE,
        FailedLoginCount: '0',
        LockedUntil: '',
        MustChangePassword: 'false',
        ResetTokenHash: '',
        ResetTokenExpiresAt: '',
        CreatedAt: ts,
        UpdatedAt: ts
      };

      TM_Db.insertRecord('Users', adminUser);
      seedInitialData(adminUser, companyName);

      TM_Audit.logEvent({
        userId: adminUser.UserID,
        action: 'SYSTEM_BOOTSTRAP',
        entityType: 'System',
        entityId: ss.getId(),
        afterData: {
          spreadsheetId: ss.getId(),
          driveRootFolderId: folders.rootId,
          superAdminUsername: adminUser.Username,
          companyName: companyName
        },
        deviceInfo: TM_Utils.sanitizeText(p.deviceInfo || 'Bootstrap'),
        description: 'Inisialisasi database, folder Drive privat, Master Data awal, dan Super Admin pertama'
      });

      props.setProperties({
        APP_INITIALIZED: 'true',
        BOOTSTRAP_COMPLETED_AT: ts
      });

      return {
        initialized: true,
        spreadsheetId: ss.getId(),
        driveRootFolderId: folders.rootId,
        superAdmin: {
          UserID: adminUser.UserID,
          Name: adminUser.Name,
          Username: adminUser.Username,
          Email: adminUser.Email,
          Role: adminUser.Role
        }
      };
    });
  }

  return {
    isInitialized: isInitialized,
    getBootstrapStatus: getBootstrapStatus,
    runInitialBootstrap: runInitialBootstrap
  };
})();



/* ==================== FILE: Auth.gs ==================== */
/**
 * Auth.gs — Login, proteksi brute-force & lockout, session 8h/30m, reset password, & RBAC backend.
 */

var TM_Auth = (function () {
  var SESSION_CACHE_PREFIX = 'AUTH_SES_';
  var MAX_CREDENTIAL_ENTRIES = 128;
  var MAX_TRACKED_RATE_KEYS = 2000;

  // Matriks hak akses rute/aksi mengikuti pola admin-token-verifier.ts (Orca)
  var SHARED_AUTH_ROUTES = [
    'api_getCurrentUser', 'api_logout', 'api_changePasswordRequired',
    'api_getMasterBundle', 'api_suggestOutlets', 'api_listCompletedSessions',
    'api_getSessionDetail', 'api_getPhotoData', 'api_getDashboardFilterOptions',
    'api_getDashboardData', 'api_generateSessionPdf', 'api_generateDashboardPdf',
    'api_listSessionPdfHistory', 'api_exportDashboardData', 'api_listMyNotifications',
    'api_markNotificationRead', 'api_markAllNotificationsRead', 'api_getMyNotificationPreferences',
    'api_updateMyNotificationPreference'
  ];

  var TRAINER_ROUTES = SHARED_AUTH_ROUTES.concat([
    'api_resolveOrCreateOutlet', 'api_saveDraft', 'api_listMyDrafts', 'api_deleteMyDraft',
    'api_finalizeSession', 'api_saveFindingDraft', 'api_deleteFindingInDraft',
    'api_updateFinding', 'api_deleteFinding', 'api_uploadPhoto', 'api_updatePhotoComment',
    'api_deletePhoto', 'api_listMyDeletedDrafts', 'api_requestDraftRestore',
    'api_syncDraftOperation', 'api_syncBatchOperations', 'api_listMySyncConflicts',
    'api_resolveSyncConflict', 'api_checkLocalDraftsStatus', 'api_sendSessionPdfEmail'
  ]);

  var SUPER_ADMIN_ROUTES = TRAINER_ROUTES.concat([
    'api_listUsers', 'api_createUser', 'api_updateUser', 'api_adminResetUserPassword',
    'api_unlockUser', 'api_updateAppSettings', 'api_queryAuditLogs',
    'api_saveMasterItem', 'api_setMasterStatus', 'api_deleteMasterItem',
    'api_listOutlets', 'api_updateOutlet', 'api_setOutletStatus', 'api_deleteOutlet',
    'api_mergeOutlets', 'api_unmergeOutlet', 'api_deleteSession', 'api_restoreSession',
    'api_listDeletedCompletedSessions', 'api_restoreFinding', 'api_getActiveDraftsCount',
    'api_listMonitoringDrafts', 'api_getDraftMonitoringDetail', 'api_adminDeleteDraft',
    'api_listDraftRestoreRequests', 'api_processDraftRestoreRequest', 'api_adminDirectRestoreDraft',
    'api_runDraftStaleReminderSweep', 'api_retryFailedEmailLog', 'api_listEmailLogs',
    'api_createManualBackup', 'api_runScheduledWeeklyBackup', 'api_listBackupHistory',
    'api_setBackupImportant', 'api_previewRestoreBackup', 'api_executeSafeRestore',
    'api_listPhotoArchive', 'api_restoreArchivedPhoto', 'api_runArchiveRetentionPurge'
  ]);

  function identityMayAccess(role, routeOrAction) {
    if (!role || !routeOrAction) return false;
    if (role === TM_CONFIG.ROLES.SUPER_ADMIN) {
      return SUPER_ADMIN_ROUTES.indexOf(routeOrAction) !== -1 || String(routeOrAction).indexOf('api_') === 0;
    }
    if (role === TM_CONFIG.ROLES.TRAINER) {
      return TRAINER_ROUTES.indexOf(routeOrAction) !== -1;
    }
    if (role === TM_CONFIG.ROLES.MANAJEMEN) {
      return SHARED_AUTH_ROUTES.indexOf(routeOrAction) !== -1;
    }
    return false;
  }

  // LRU Session State Cache mengikuti pola integration-token-file-cache.ts (Orca)
  var _sessionLruKeys = [];
  var _sessionLruMap = {};

  function lruTouchSession(authSessionId, sessionRec) {
    var idx = _sessionLruKeys.indexOf(authSessionId);
    if (idx !== -1) _sessionLruKeys.splice(idx, 1);
    _sessionLruKeys.push(authSessionId);
    _sessionLruMap[authSessionId] = sessionRec;
    while (_sessionLruKeys.length > MAX_CREDENTIAL_ENTRIES) {
      var oldest = _sessionLruKeys.shift();
      if (oldest !== undefined) delete _sessionLruMap[oldest];
    }
  }

  function lruForgetSession(authSessionId) {
    var idx = _sessionLruKeys.indexOf(authSessionId);
    if (idx !== -1) _sessionLruKeys.splice(idx, 1);
    delete _sessionLruMap[authSessionId];
  }

  // Token-Bucket Rate Limiter mengikuti pola client-ip-rate-limit.ts (Orca)
  var _rateBuckets = {};
  var _rateBucketKeys = [];

  function checkRateLimit(key) {
    var capacity = TM_CONFIG.AUTH.RATE_LIMIT_MAX_ATTEMPTS;
    var windowMs = TM_CONFIG.AUTH.RATE_LIMIT_WINDOW_SEC * 1000;
    var nowMs = TM_Utils.now().getTime();
    var cacheKey = 'RL_' + TM_Security.sha256Hex(key).slice(0, 24);

    var bucket = _rateBuckets[cacheKey];
    try {
      var cache = TM_Db.getScriptCache();
      if (!bucket) {
        var raw = cache.get(cacheKey);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed.tokens === 'number' && typeof parsed.updatedAt === 'number') {
            bucket = parsed;
          }
        }
      }
      var currentTokens = capacity;
      if (bucket) {
        var refilled = ((nowMs - bucket.updatedAt) * capacity) / windowMs;
        currentTokens = Math.min(capacity, bucket.tokens + Math.max(0, refilled));
      }
      var nextBucket = {
        tokens: currentTokens < 1 ? currentTokens : currentTokens - 1,
        updatedAt: nowMs
      };
      var kIdx = _rateBucketKeys.indexOf(cacheKey);
      if (kIdx !== -1) _rateBucketKeys.splice(kIdx, 1);
      _rateBucketKeys.push(cacheKey);
      _rateBuckets[cacheKey] = nextBucket;
      while (_rateBucketKeys.length > MAX_TRACKED_RATE_KEYS) {
        var oldestKey = _rateBucketKeys.shift();
        if (oldestKey !== undefined) delete _rateBuckets[oldestKey];
      }
      cache.put(cacheKey, JSON.stringify(nextBucket), TM_CONFIG.AUTH.RATE_LIMIT_WINDOW_SEC);
      if (currentTokens < 1) {
        throw TM_Utils.AppError('ERR_RATE_LIMIT', 'Terlalu banyak percobaan login. Silakan tunggu beberapa menit sebelum mencoba lagi.');
      }
    } catch (e) {
      if (e && e.isAppError) throw e;
    }
  }

  function sanitizeUser(u) {
    if (!u) return null;
    return {
      UserID: u.UserID,
      Name: u.Name,
      Username: u.Username,
      Email: u.Email,
      Role: u.Role,
      Status: u.Status,
      FailedLoginCount: parseInt(u.FailedLoginCount || '0', 10),
      LockedUntil: u.LockedUntil || '',
      MustChangePassword: u.MustChangePassword === 'true',
      CreatedAt: u.CreatedAt,
      UpdatedAt: u.UpdatedAt
    };
  }

  function cacheSession(sessionRec) {
    if (!sessionRec || !sessionRec.AuthSessionID) return;
    lruTouchSession(sessionRec.AuthSessionID, sessionRec);
    try {
      TM_Db.getScriptCache().put(
        SESSION_CACHE_PREFIX + sessionRec.AuthSessionID,
        JSON.stringify(sessionRec),
        1800
      );
    } catch (e) {
      // ignore cache failure
    }
  }

  function getCachedOrSheetSession(authSessionId) {
    if (_sessionLruMap[authSessionId]) {
      var memHit = _sessionLruMap[authSessionId];
      lruTouchSession(authSessionId, memHit);
      return memHit;
    }
    try {
      var cached = TM_Db.getScriptCache().get(SESSION_CACHE_PREFIX + authSessionId);
      if (cached) {
        var parsed = JSON.parse(cached);
        lruTouchSession(authSessionId, parsed);
        return parsed;
      }
    } catch (e) {
      // fallback to sheet
    }
    var rec = TM_Db.findById('AuthSessions', 'AuthSessionID', authSessionId);
    if (rec) cacheSession(rec);
    return rec;
  }

  function invalidateSessionCache(authSessionId) {
    lruForgetSession(authSessionId);
    try {
      TM_Db.getScriptCache().remove(SESSION_CACHE_PREFIX + authSessionId);
    } catch (e) {
      // ignore
    }
  }

  function revokeAllUserSessions(userId) {
    var ts = TM_Utils.formatWibIso();
    var sessions = TM_Db.filterRecords('AuthSessions', function (s) {
      return s.UserID === userId && !s.RevokedAt;
    });
    for (var i = 0; i < sessions.length; i++) {
      var sid = sessions[i].AuthSessionID;
      TM_Db.updateRecordById('AuthSessions', 'AuthSessionID', sid, function (rec) {
        rec.RevokedAt = ts;
        return rec;
      });
      invalidateSessionCache(sid);
    }
  }

  function login(usernameInput, passwordInput, deviceInfo) {
    if (!TM_Bootstrap.isInitialized()) {
      throw TM_Utils.AppError('ERR_NOT_INITIALIZED', 'Aplikasi belum di-bootstrap.');
    }

    var username = TM_Utils.sanitizeText(usernameInput).toLowerCase();
    var password = String(passwordInput || '');
    var dev = TM_Utils.sanitizeText(deviceInfo || 'Unknown Device');

    if (!username || !password) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Username dan password wajib diisi.');
    }

    checkRateLimit('USER:' + username);
    if (dev) {
      checkRateLimit('DEV:' + dev);
    }

    var user = TM_Db.findRecord('Users', function (u) {
      return String(u.Username).toLowerCase() === username;
    });

    if (!user) {
      TM_Audit.logEvent({
        userId: 'ANONYMOUS',
        action: 'LOGIN_FAILED',
        entityType: 'Users',
        entityId: username,
        deviceInfo: dev,
        description: 'Percobaan login dengan username tidak ditemukan: ' + username
      });
      throw TM_Utils.AppError('ERR_INVALID_CREDENTIALS', 'Username atau password salah.');
    }

    if (user.Status !== TM_CONFIG.STATUS.ACTIVE) {
      TM_Audit.logEvent({
        userId: user.UserID,
        action: 'LOGIN_FAILED_INACTIVE',
        entityType: 'Users',
        entityId: user.UserID,
        deviceInfo: dev,
        description: 'Percobaan login pada akun nonaktif'
      });
      throw TM_Utils.AppError('ERR_ACCOUNT_INACTIVE', 'Akun Anda sedang dinonaktifkan. Hubungi Super Admin.');
    }

    var nowMs = TM_Utils.now().getTime();
    if (user.LockedUntil) {
      var lockedMs = new Date(user.LockedUntil).getTime();
      if (!isNaN(lockedMs) && nowMs < lockedMs) {
        var minsLeft = Math.ceil((lockedMs - nowMs) / 60000);
        TM_Audit.logEvent({
          userId: user.UserID,
          action: 'LOGIN_BLOCKED_LOCKED',
          entityType: 'Users',
          entityId: user.UserID,
          deviceInfo: dev,
          description: 'Percobaan login saat akun terkunci (' + minsLeft + ' menit tersisa)'
        });
        throw TM_Utils.AppError(
          'ERR_ACCOUNT_LOCKED',
          'Akun terkunci sementara karena 5 kali gagal login. Coba lagi dalam ' + minsLeft + ' menit atau hubungi Super Admin.'
        );
      }
    }

    var validPw = TM_Security.verifyPassword(password, user.PasswordHash);
    if (!validPw) {
      var nextFailCount = parseInt(user.FailedLoginCount || '0', 10) + 1;
      // Jika sebelumnya sudah lewat masa lockout, mulai hitung lagi atau langsung kunci jika >= 5
      if (user.LockedUntil && new Date(user.LockedUntil).getTime() <= nowMs) {
        nextFailCount = 1;
      }
      var lockUntil = '';
      var shouldLock = nextFailCount >= TM_CONFIG.AUTH.MAX_FAILED_LOGINS;
      if (shouldLock) {
        lockUntil = TM_Utils.addMinutesIso(TM_Utils.now(), TM_CONFIG.AUTH.LOCKOUT_MINUTES);
      }
      var tsFail = TM_Utils.formatWibIso();
      TM_Db.updateRecordById('Users', 'UserID', user.UserID, function (rec) {
        rec.FailedLoginCount = String(nextFailCount);
        rec.LockedUntil = lockUntil;
        rec.UpdatedAt = tsFail;
        return rec;
      });

      TM_Audit.logEvent({
        userId: user.UserID,
        action: shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        entityType: 'Users',
        entityId: user.UserID,
        afterData: { failedLoginCount: nextFailCount, lockedUntil: lockUntil },
        deviceInfo: dev,
        description: shouldLock
          ? 'Akun dikunci 15 menit setelah 5 kegagalan login'
          : 'Password salah (percobaan ke-' + nextFailCount + ')'
      });

      if (shouldLock) {
        throw TM_Utils.AppError(
          'ERR_ACCOUNT_LOCKED',
          'Password salah 5 kali. Akun dikunci selama ' + TM_CONFIG.AUTH.LOCKOUT_MINUTES + ' menit.'
        );
      }
      throw TM_Utils.AppError('ERR_INVALID_CREDENTIALS', 'Username atau password salah.');
    }

    // Login berhasil: reset counter & buat AuthSession baru
    var tsNow = TM_Utils.formatWibIso();
    var updatedUser = TM_Db.updateRecordById('Users', 'UserID', user.UserID, function (rec) {
      rec.FailedLoginCount = '0';
      rec.LockedUntil = '';
      rec.UpdatedAt = tsNow;
      return rec;
    });

    var authSessionId = TM_Utils.generateId('SESAUTH');
    var rawToken = TM_Security.signSessionToken(authSessionId, {
      userId: user.UserID,
      role: user.Role
    });
    var sessionRec = {
      AuthSessionID: authSessionId,
      UserID: user.UserID,
      TokenHash: TM_Security.sha256Hex(rawToken),
      RoleSnapshot: user.Role,
      DeviceInfo: dev,
      IssuedAt: tsNow,
      LastActivityAt: tsNow,
      ExpiresAt: TM_Utils.addHoursIso(TM_Utils.now(), TM_CONFIG.AUTH.SESSION_MAX_HOURS),
      RevokedAt: ''
    };
    TM_Db.insertRecord('AuthSessions', sessionRec);
    cacheSession(sessionRec);

    TM_Audit.logEvent({
      userId: user.UserID,
      action: 'LOGIN_SUCCESS',
      entityType: 'AuthSessions',
      entityId: authSessionId,
      afterData: { role: user.Role, expiresAt: sessionRec.ExpiresAt },
      deviceInfo: dev,
      description: 'Login berhasil'
    });

    return {
      token: rawToken,
      user: sanitizeUser(updatedUser || user),
      mustChangePassword: user.MustChangePassword === 'true',
      expiresAt: sessionRec.ExpiresAt
    };
  }

  function requireAuth(token, allowedRoles, opts) {
    if (!TM_Bootstrap.isInitialized()) {
      throw TM_Utils.AppError('ERR_NOT_INITIALIZED', 'Aplikasi belum di-bootstrap.');
    }
    var options = opts || {};
    var cleanToken = TM_Security.readBearerToken(token);
    var authSessionId = TM_Security.verifySessionToken(cleanToken);
    if (!authSessionId) {
      throw TM_Utils.AppError('ERR_UNAUTHORIZED', 'Sesi tidak valid. Silakan login kembali.');
    }

    var sessionRec = getCachedOrSheetSession(authSessionId);
    if (!sessionRec || !TM_Security.constantTimeEquals(sessionRec.TokenHash, TM_Security.sha256Hex(cleanToken))) {
      throw TM_Utils.AppError('ERR_UNAUTHORIZED', 'Sesi tidak ditemukan. Silakan login kembali.');
    }
    if (sessionRec.RevokedAt) {
      throw TM_Utils.AppError('ERR_SESSION_REVOKED', 'Sesi telah diakhiri. Silakan login kembali.');
    }

    var nowMs = TM_Utils.now().getTime();
    var expiresMs = new Date(sessionRec.ExpiresAt).getTime();
    var lastActMs = new Date(sessionRec.LastActivityAt).getTime();
    var idleLimitMs = TM_CONFIG.AUTH.SESSION_IDLE_MINUTES * 60000;

    if (isNaN(expiresMs) || nowMs >= expiresMs) {
      TM_Db.updateRecordById('AuthSessions', 'AuthSessionID', authSessionId, function (rec) {
        rec.RevokedAt = TM_Utils.formatWibIso();
        return rec;
      });
      invalidateSessionCache(authSessionId);
      throw TM_Utils.AppError('ERR_SESSION_EXPIRED', 'Batas waktu sesi 8 jam telah berakhir. Silakan login kembali.');
    }

    if (isNaN(lastActMs) || (nowMs - lastActMs) > idleLimitMs) {
      TM_Db.updateRecordById('AuthSessions', 'AuthSessionID', authSessionId, function (rec) {
        rec.RevokedAt = TM_Utils.formatWibIso();
        return rec;
      });
      invalidateSessionCache(authSessionId);
      throw TM_Utils.AppError('ERR_SESSION_IDLE_TIMEOUT', 'Sesi berakhir karena tidak ada aktivitas selama 30 menit.');
    }

    var user = TM_Db.findById('Users', 'UserID', sessionRec.UserID);
    if (!user || user.Status !== TM_CONFIG.STATUS.ACTIVE) {
      throw TM_Utils.AppError('ERR_ACCOUNT_INACTIVE', 'Akun tidak aktif atau tidak ditemukan.');
    }

    if (user.MustChangePassword === 'true' && !options.allowMustChangePassword) {
      throw TM_Utils.AppError('ERR_MUST_CHANGE_PASSWORD', 'Anda harus mengganti password terlebih dahulu sebelum mengakses sistem.');
    }

    if (allowedRoles && allowedRoles.length > 0 && allowedRoles.indexOf(user.Role) === -1) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak memiliki hak akses untuk tindakan ini.');
    }

    // Update LastActivityAt (cache selalu, sheet di-throttle per 60 detik untuk efisiensi)
    var tsNow = TM_Utils.formatWibIso();
    sessionRec.LastActivityAt = tsNow;
    cacheSession(sessionRec);
    if ((nowMs - lastActMs) >= 60000) {
      TM_Db.updateRecordById('AuthSessions', 'AuthSessionID', authSessionId, function (rec) {
        rec.LastActivityAt = tsNow;
        return rec;
      });
    }

    return {
      user: sanitizeUser(user),
      session: sessionRec
    };
  }

  function logout(token) {
    var authSessionId = TM_Security.verifySessionToken(token);
    if (!authSessionId) {
      return { loggedOut: true };
    }
    var sessionRec = getCachedOrSheetSession(authSessionId);
    if (sessionRec && !sessionRec.RevokedAt) {
      var tsNow = TM_Utils.formatWibIso();
      TM_Db.updateRecordById('AuthSessions', 'AuthSessionID', authSessionId, function (rec) {
        rec.RevokedAt = tsNow;
        return rec;
      });
      invalidateSessionCache(authSessionId);
      TM_Audit.logEvent({
        userId: sessionRec.UserID,
        action: 'LOGOUT',
        entityType: 'AuthSessions',
        entityId: authSessionId,
        deviceInfo: sessionRec.DeviceInfo,
        description: 'Logout manual oleh pengguna'
      });
    }
    return { loggedOut: true };
  }

  function requestPasswordReset(emailInput, appUrl) {
    if (!TM_Bootstrap.isInitialized()) {
      throw TM_Utils.AppError('ERR_NOT_INITIALIZED', 'Aplikasi belum di-bootstrap.');
    }
    var email = TM_Utils.sanitizeText(emailInput).toLowerCase();
    if (!TM_Utils.isValidEmail(email)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Format email tidak valid.');
    }

    checkRateLimit('RESET:' + email);

    var user = TM_Db.findRecord('Users', function (u) {
      return String(u.Email).toLowerCase() === email && u.Status === TM_CONFIG.STATUS.ACTIVE;
    });

    if (user) {
      var rawResetToken = TM_Security.randomHex(32);
      var tokenHash = TM_Security.sha256Hex(rawResetToken);
      var expiresAt = TM_Utils.addMinutesIso(TM_Utils.now(), TM_CONFIG.AUTH.RESET_TOKEN_MINUTES);
      var tsNow = TM_Utils.formatWibIso();

      TM_Db.updateRecordById('Users', 'UserID', user.UserID, function (rec) {
        rec.ResetTokenHash = tokenHash;
        rec.ResetTokenExpiresAt = expiresAt;
        rec.UpdatedAt = tsNow;
        return rec;
      });

      var baseUrl = TM_Utils.sanitizeText(appUrl);
      if (!baseUrl && typeof ScriptApp !== 'undefined' && ScriptApp.getService) {
        try {
          baseUrl = ScriptApp.getService().getUrl() || '';
        } catch (e) {
          baseUrl = '';
        }
      }
      var sep = baseUrl.indexOf('?') === -1 ? '?' : '&';
      var resetLink = baseUrl ? (baseUrl + sep + 'mode=reset&token=' + encodeURIComponent(rawResetToken)) : rawResetToken;

      var mailSent = false;
      var mailError = '';
      if (typeof MailApp !== 'undefined' && MailApp.sendEmail) {
        try {
          MailApp.sendEmail({
            to: user.Email,
            subject: '[' + TM_CONFIG.APP_NAME + '] Tautan Reset Password',
            body:
              'Halo ' + user.Name + ',\n\n' +
              'Kami menerima permintaan reset password untuk akun Anda (' + user.Username + ').\n' +
              'Gunakan tautan atau token sekali pakai berikut (berlaku ' + TM_CONFIG.AUTH.RESET_TOKEN_MINUTES + ' menit):\n\n' +
              resetLink + '\n\n' +
              'Token Reset: ' + rawResetToken + '\n\n' +
              'Jika Anda tidak meminta reset password, abaikan email ini.'
          });
          mailSent = true;
        } catch (e) {
          mailError = e && e.message ? e.message : String(e);
        }
      }

      TM_Audit.logEvent({
        userId: user.UserID,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'Users',
        entityId: user.UserID,
        afterData: { expiresAt: expiresAt, mailSent: mailSent, mailError: mailError },
        description: 'Permintaan reset password melalui email'
      });
    }

    return {
      accepted: true,
      message: 'Jika email terdaftar dan aktif, instruksi reset password telah dikirim ke email Anda.'
    };
  }

  function confirmPasswordReset(resetToken, newPassword) {
    if (!TM_Bootstrap.isInitialized()) {
      throw TM_Utils.AppError('ERR_NOT_INITIALIZED', 'Aplikasi belum di-bootstrap.');
    }
    var tokenStr = TM_Utils.sanitizeText(resetToken);
    if (!tokenStr) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Token reset password tidak boleh kosong.');
    }
    var pwErr = TM_Security.validatePasswordStrength(newPassword);
    if (pwErr) {
      throw TM_Utils.AppError('ERR_VALIDATION', pwErr);
    }

    var tokenHash = TM_Security.sha256Hex(tokenStr);
    var user = TM_Db.findRecord('Users', function (u) {
      return u.ResetTokenHash && TM_Security.constantTimeEquals(u.ResetTokenHash, tokenHash);
    });

    if (!user) {
      throw TM_Utils.AppError('ERR_INVALID_RESET_TOKEN', 'Tautan atau token reset password tidak valid atau sudah digunakan.');
    }

    var nowMs = TM_Utils.now().getTime();
    var expMs = new Date(user.ResetTokenExpiresAt).getTime();
    if (!user.ResetTokenExpiresAt || isNaN(expMs) || nowMs > expMs) {
      throw TM_Utils.AppError('ERR_RESET_TOKEN_EXPIRED', 'Token reset password telah kedaluwarsa. Silakan ajukan ulang.');
    }

    var tsNow = TM_Utils.formatWibIso();
    TM_Db.updateRecordById('Users', 'UserID', user.UserID, function (rec) {
      rec.PasswordHash = TM_Security.hashPassword(newPassword);
      rec.ResetTokenHash = '';
      rec.ResetTokenExpiresAt = '';
      rec.MustChangePassword = 'false';
      rec.FailedLoginCount = '0';
      rec.LockedUntil = '';
      rec.UpdatedAt = tsNow;
      return rec;
    });

    revokeAllUserSessions(user.UserID);

    TM_Audit.logEvent({
      userId: user.UserID,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'Users',
      entityId: user.UserID,
      description: 'Pengguna berhasil melakukan reset password melalui tautan sekali pakai'
    });

    return { reset: true };
  }

  function changePasswordRequired(token, currentPassword, newPassword) {
    var ctx = requireAuth(token, null, { allowMustChangePassword: true });
    var user = TM_Db.findById('Users', 'UserID', ctx.user.UserID);
    if (!user) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Pengguna tidak ditemukan.');
    }
    if (!TM_Security.verifyPassword(String(currentPassword || ''), user.PasswordHash)) {
      throw TM_Utils.AppError('ERR_INVALID_CREDENTIALS', 'Password saat ini salah.');
    }
    if (String(currentPassword) === String(newPassword)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Password baru harus berbeda dari password saat ini.');
    }
    var pwErr = TM_Security.validatePasswordStrength(newPassword);
    if (pwErr) {
      throw TM_Utils.AppError('ERR_VALIDATION', pwErr);
    }

    var tsNow = TM_Utils.formatWibIso();
    var updated = TM_Db.updateRecordById('Users', 'UserID', user.UserID, function (rec) {
      rec.PasswordHash = TM_Security.hashPassword(newPassword);
      rec.MustChangePassword = 'false';
      rec.UpdatedAt = tsNow;
      return rec;
    });

    TM_Audit.logEvent({
      userId: user.UserID,
      action: 'PASSWORD_CHANGED',
      entityType: 'Users',
      entityId: user.UserID,
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Pengguna mengganti password'
    });

    return {
      changed: true,
      user: sanitizeUser(updated)
    };
  }

  return {
    sanitizeUser: sanitizeUser,
    identityMayAccess: identityMayAccess,
    login: login,
    requireAuth: requireAuth,
    logout: logout,
    revokeAllUserSessions: revokeAllUserSessions,
    requestPasswordReset: requestPasswordReset,
    confirmPasswordReset: confirmPasswordReset,
    changePasswordRequired: changePasswordRequired
  };
})();



/* ==================== FILE: Users.gs ==================== */
/**
 * Users.gs — Pengelolaan akun pengguna oleh Super Admin (tanpa penghapusan permanen).
 */

var TM_Users = (function () {
  var ALLOWED_ROLES = [
    TM_CONFIG.ROLES.SUPER_ADMIN,
    TM_CONFIG.ROLES.TRAINER,
    TM_CONFIG.ROLES.MANAJEMEN
  ];

  function countActiveSuperAdmins(excludeUserId) {
    var users = TM_Db.getAllRecords('Users');
    var count = 0;
    for (var i = 0; i < users.length; i++) {
      if (
        users[i].UserID !== excludeUserId &&
        users[i].Role === TM_CONFIG.ROLES.SUPER_ADMIN &&
        users[i].Status === TM_CONFIG.STATUS.ACTIVE
      ) {
        count++;
      }
    }
    return count;
  }

  function listUsers(token) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var users = TM_Db.getAllRecords('Users');
    users.sort(function (a, b) {
      return String(b.CreatedAt).localeCompare(String(a.CreatedAt));
    });
    return users.map(TM_Auth.sanitizeUser);
  }

  function createUser(token, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var p = dto || {};
    var name = TM_Utils.sanitizeText(p.name);
    var username = TM_Utils.sanitizeText(p.username).toLowerCase();
    var email = TM_Utils.sanitizeText(p.email).toLowerCase();
    var role = TM_Utils.sanitizeText(p.role);
    var password = String(p.password || '');

    if (!name || name.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama pengguna wajib diisi (minimal 2 karakter).');
    }
    if (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Username harus 3–32 karakter (huruf kecil, angka, ., _, -).');
    }
    if (!TM_Utils.isValidEmail(email)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Format email tidak valid.');
    }
    if (ALLOWED_ROLES.indexOf(role) === -1) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Role tidak valid.');
    }
    var pwErr = TM_Security.validatePasswordStrength(password);
    if (pwErr) {
      throw TM_Utils.AppError('ERR_VALIDATION', pwErr);
    }

    return TM_Db.withLock(function () {
      var existing = TM_Db.getAllRecords('Users');
      for (var i = 0; i < existing.length; i++) {
        if (String(existing[i].Username).toLowerCase() === username) {
          throw TM_Utils.AppError('ERR_DUPLICATE', 'Username "' + username + '" sudah digunakan.');
        }
        if (String(existing[i].Email).toLowerCase() === email) {
          throw TM_Utils.AppError('ERR_DUPLICATE', 'Email "' + email + '" sudah digunakan.');
        }
      }

      var ts = TM_Utils.formatWibIso();
      var newUser = {
        UserID: TM_Utils.generateId('USR'),
        Name: name,
        Username: username,
        Email: email,
        PasswordHash: TM_Security.hashPassword(password),
        Role: role,
        Status: TM_CONFIG.STATUS.ACTIVE,
        FailedLoginCount: '0',
        LockedUntil: '',
        MustChangePassword: 'true',
        ResetTokenHash: '',
        ResetTokenExpiresAt: '',
        CreatedAt: ts,
        UpdatedAt: ts
      };

      TM_Db.insertRecord('Users', newUser);

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'USER_CREATED',
        entityType: 'Users',
        entityId: newUser.UserID,
        afterData: TM_Auth.sanitizeUser(newUser),
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Membuat akun pengguna baru: ' + newUser.Username + ' (' + newUser.Role + ')'
      });

      return TM_Auth.sanitizeUser(newUser);
    });
  }

  function updateUser(token, userId, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var p = dto || {};
    var name = TM_Utils.sanitizeText(p.name);
    var email = TM_Utils.sanitizeText(p.email).toLowerCase();
    var role = TM_Utils.sanitizeText(p.role);

    if (!name || name.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama pengguna wajib diisi.');
    }
    if (!TM_Utils.isValidEmail(email)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Format email tidak valid.');
    }
    if (ALLOWED_ROLES.indexOf(role) === -1) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Role tidak valid.');
    }

    return TM_Db.withLock(function () {
      var target = TM_Db.findById('Users', 'UserID', userId);
      if (!target) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Pengguna tidak ditemukan.');
      }

      if (
        target.Role === TM_CONFIG.ROLES.SUPER_ADMIN &&
        role !== TM_CONFIG.ROLES.SUPER_ADMIN &&
        countActiveSuperAdmins(target.UserID) === 0
      ) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Tidak dapat menurunkan role Super Admin aktif terakhir.');
      }

      var allUsers = TM_Db.getAllRecords('Users');
      for (var i = 0; i < allUsers.length; i++) {
        if (allUsers[i].UserID !== userId && String(allUsers[i].Email).toLowerCase() === email) {
          throw TM_Utils.AppError('ERR_DUPLICATE', 'Email "' + email + '" sudah digunakan pengguna lain.');
        }
      }

      var before = TM_Auth.sanitizeUser(target);
      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Users', 'UserID', userId, function (rec) {
        rec.Name = name;
        rec.Email = email;
        rec.Role = role;
        rec.UpdatedAt = ts;
        return rec;
      });

      if (target.Role !== role) {
        TM_Auth.revokeAllUserSessions(userId);
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'USER_UPDATED',
        entityType: 'Users',
        entityId: userId,
        beforeData: before,
        afterData: TM_Auth.sanitizeUser(updated),
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Memperbarui profil/role pengguna ' + target.Username
      });

      return TM_Auth.sanitizeUser(updated);
    });
  }

  function setUserStatus(token, userId, status) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    if (status !== TM_CONFIG.STATUS.ACTIVE && status !== TM_CONFIG.STATUS.INACTIVE) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Status akun tidak valid.');
    }

    return TM_Db.withLock(function () {
      var target = TM_Db.findById('Users', 'UserID', userId);
      if (!target) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Pengguna tidak ditemukan.');
      }
      if (target.UserID === ctx.user.UserID && status === TM_CONFIG.STATUS.INACTIVE) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Anda tidak dapat menonaktifkan akun Anda sendiri.');
      }
      if (
        target.Role === TM_CONFIG.ROLES.SUPER_ADMIN &&
        status === TM_CONFIG.STATUS.INACTIVE &&
        countActiveSuperAdmins(target.UserID) === 0
      ) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Minimal harus ada satu Super Admin aktif.');
      }

      var before = TM_Auth.sanitizeUser(target);
      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Users', 'UserID', userId, function (rec) {
        rec.Status = status;
        rec.UpdatedAt = ts;
        return rec;
      });

      if (status === TM_CONFIG.STATUS.INACTIVE) {
        TM_Auth.revokeAllUserSessions(userId);
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: status === TM_CONFIG.STATUS.ACTIVE ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'Users',
        entityId: userId,
        beforeData: before,
        afterData: TM_Auth.sanitizeUser(updated),
        deviceInfo: ctx.session.DeviceInfo,
        description: (status === TM_CONFIG.STATUS.ACTIVE ? 'Mengaktifkan' : 'Menonaktifkan') + ' akun ' + target.Username
      });

      return TM_Auth.sanitizeUser(updated);
    });
  }

  function unlockUser(token, userId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var target = TM_Db.findById('Users', 'UserID', userId);
    if (!target) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Pengguna tidak ditemukan.');
    }

    var before = TM_Auth.sanitizeUser(target);
    var ts = TM_Utils.formatWibIso();
    var updated = TM_Db.updateRecordById('Users', 'UserID', userId, function (rec) {
      rec.FailedLoginCount = '0';
      rec.LockedUntil = '';
      rec.UpdatedAt = ts;
      return rec;
    });

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'USER_UNLOCKED',
      entityType: 'Users',
      entityId: userId,
      beforeData: before,
      afterData: TM_Auth.sanitizeUser(updated),
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Super Admin membuka kunci login akun ' + target.Username + ' lebih awal'
    });

    return TM_Auth.sanitizeUser(updated);
  }

  function adminResetPassword(token, userId, tempPassword) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var target = TM_Db.findById('Users', 'UserID', userId);
    if (!target) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Pengguna tidak ditemukan.');
    }

    var newTempPw = String(tempPassword || '');
    var pwErr = TM_Security.validatePasswordStrength(newTempPw);
    if (pwErr) {
      throw TM_Utils.AppError('ERR_VALIDATION', pwErr);
    }

    var ts = TM_Utils.formatWibIso();
    var updated = TM_Db.updateRecordById('Users', 'UserID', userId, function (rec) {
      rec.PasswordHash = TM_Security.hashPassword(newTempPw);
      rec.MustChangePassword = 'true';
      rec.FailedLoginCount = '0';
      rec.LockedUntil = '';
      rec.ResetTokenHash = '';
      rec.ResetTokenExpiresAt = '';
      rec.UpdatedAt = ts;
      return rec;
    });

    TM_Auth.revokeAllUserSessions(userId);

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'ADMIN_PASSWORD_RESET',
      entityType: 'Users',
      entityId: userId,
      afterData: { targetUsername: target.Username, mustChangePassword: true },
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Super Admin mereset password akun ' + target.Username + ' (wajib ganti saat login berikutnya)'
    });

    return TM_Auth.sanitizeUser(updated);
  }

  return {
    listUsers: listUsers,
    createUser: createUser,
    updateUser: updateUser,
    setUserStatus: setUserStatus,
    unlockUser: unlockUser,
    adminResetPassword: adminResetPassword
  };
})();



/* ==================== FILE: MasterData.gs ==================== */
/**
 * MasterData.gs — Pengelolaan Master Category, Master Section, Master AM, & Master MUM.
 * Aturan PRD 5.4: Master tidak boleh dihapus permanen; hanya ubah nama, nonaktifkan, atau aktifkan kembali.
 */

var TM_MasterData = (function () {
  var CACHE_KEY = 'MASTER_BUNDLE_V1';

  var ENTITY_CONFIG = {
    CATEGORY: {
      sheet: 'Categories',
      idField: 'CategoryID',
      nameField: 'CategoryName',
      prefix: 'CAT',
      label: 'Master Category'
    },
    SECTION: {
      sheet: 'Sections',
      idField: 'SectionID',
      nameField: 'SectionName',
      prefix: 'SEC',
      label: 'Master Section'
    },
    AM: {
      sheet: 'Master_AM',
      idField: 'AM_ID',
      nameField: 'AM_Name',
      prefix: 'AM',
      label: 'Master AM'
    },
    MUM: {
      sheet: 'Master_MUM',
      idField: 'MUM_ID',
      nameField: 'MUM_Name',
      prefix: 'MUM',
      label: 'Master MUM'
    }
  };

  function getEntityCfg(entityType) {
    var cfg = ENTITY_CONFIG[String(entityType || '').toUpperCase()];
    if (!cfg) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Tipe Master Data tidak valid.');
    }
    return cfg;
  }

  function invalidateMasterCache() {
    TM_Db.invalidateCache(CACHE_KEY);
  }

  function getMasterBundle(token) {
    var ctx = TM_Auth.requireAuth(token);
    var bundle = TM_Db.getCachedJson(CACHE_KEY, 300, function () {
      return {
        categories: TM_Db.getAllRecords('Categories'),
        sections: TM_Db.getAllRecords('Sections'),
        ams: TM_Db.getAllRecords('Master_AM'),
        mums: TM_Db.getAllRecords('Master_MUM')
      };
    });

    // Untuk Trainer/Manajemen tetap berikan daftar aktif + daftar lengkap untuk filter Dashboard,
    // sementara mutasi tetap dikunci khusus SUPER_ADMIN.
    return {
      role: ctx.user.Role,
      categories: bundle.categories,
      sections: bundle.sections,
      ams: bundle.ams,
      mums: bundle.mums,
      active: {
        categories: bundle.categories.filter(function (x) { return x.Status === TM_CONFIG.STATUS.ACTIVE; }),
        sections: bundle.sections.filter(function (x) { return x.Status === TM_CONFIG.STATUS.ACTIVE; }),
        ams: bundle.ams.filter(function (x) { return x.Status === TM_CONFIG.STATUS.ACTIVE; }),
        mums: bundle.mums.filter(function (x) { return x.Status === TM_CONFIG.STATUS.ACTIVE; })
      }
    };
  }

  function saveMasterItem(token, entityType, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var cfg = getEntityCfg(entityType);
    var p = dto || {};
    var id = TM_Utils.sanitizeText(p.id);
    var rawName = TM_Utils.sanitizeText(p.name).replace(/\s+/g, ' ');

    if (!rawName || rawName.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama ' + cfg.label + ' wajib diisi (minimal 2 karakter).');
    }

    return TM_Db.withLock(function () {
      var all = TM_Db.getAllRecords(cfg.sheet);
      var normalizedTarget = rawName.toLowerCase();

      for (var i = 0; i < all.length; i++) {
        var row = all[i];
        if (String(row[cfg.idField]) !== id && String(row[cfg.nameField]).trim().toLowerCase() === normalizedTarget) {
          throw TM_Utils.AppError('ERR_DUPLICATE', cfg.label + ' "' + rawName + '" sudah ada.');
        }
      }

      var ts = TM_Utils.formatWibIso();
      if (id) {
        var before = TM_Db.findById(cfg.sheet, cfg.idField, id);
        if (!before) {
          throw TM_Utils.AppError('ERR_NOT_FOUND', cfg.label + ' tidak ditemukan.');
        }
        var updated = TM_Db.updateRecordById(cfg.sheet, cfg.idField, id, function (rec) {
          rec[cfg.nameField] = rawName;
          rec.UpdatedAt = ts;
          return rec;
        });
        invalidateMasterCache();

        TM_Audit.logEvent({
          userId: ctx.user.UserID,
          action: 'MASTER_UPDATED',
          entityType: cfg.sheet,
          entityId: id,
          beforeData: before,
          afterData: updated,
          deviceInfo: ctx.session.DeviceInfo,
          description: 'Mengubah ' + cfg.label + ': "' + before[cfg.nameField] + '" -> "' + rawName + '"'
        });
        return updated;
      }

      var newObj = {};
      newObj[cfg.idField] = TM_Utils.generateId(cfg.prefix);
      newObj[cfg.nameField] = rawName;
      newObj.Status = TM_CONFIG.STATUS.ACTIVE;
      newObj.CreatedAt = ts;
      newObj.UpdatedAt = ts;

      TM_Db.insertRecord(cfg.sheet, newObj);
      invalidateMasterCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'MASTER_CREATED',
        entityType: cfg.sheet,
        entityId: newObj[cfg.idField],
        afterData: newObj,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Menambahkan ' + cfg.label + ': "' + rawName + '"'
      });

      return newObj;
    });
  }

  function setMasterStatus(token, entityType, id, status) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var cfg = getEntityCfg(entityType);
    if (status !== TM_CONFIG.STATUS.ACTIVE && status !== TM_CONFIG.STATUS.INACTIVE) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Status Master Data tidak valid.');
    }

    return TM_Db.withLock(function () {
      var before = TM_Db.findById(cfg.sheet, cfg.idField, id);
      if (!before) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', cfg.label + ' tidak ditemukan.');
      }

      if (before.Status === status) {
        return before;
      }

      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById(cfg.sheet, cfg.idField, id, function (rec) {
        rec.Status = status;
        rec.UpdatedAt = ts;
        return rec;
      });
      invalidateMasterCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: status === TM_CONFIG.STATUS.ACTIVE ? 'MASTER_ACTIVATED' : 'MASTER_DEACTIVATED',
        entityType: cfg.sheet,
        entityId: id,
        beforeData: before,
        afterData: updated,
        deviceInfo: ctx.session.DeviceInfo,
        description: (status === TM_CONFIG.STATUS.ACTIVE ? 'Mengaktifkan ' : 'Menonaktifkan ') + cfg.label + ': "' + before[cfg.nameField] + '"'
      });

      return updated;
    });
  }

  function deleteMasterItem(token, entityType, id) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var cfg = getEntityCfg(entityType);
    var targetId = TM_Utils.sanitizeText(id);
    if (!targetId) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'ID ' + cfg.label + ' wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var before = TM_Db.findById(cfg.sheet, cfg.idField, targetId);
      if (!before) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', cfg.label + ' tidak ditemukan.');
      }

      if (before.Status !== TM_CONFIG.STATUS.INACTIVE) {
        throw TM_Utils.AppError(
          'ERR_VALIDATION',
          'Nonaktifkan ' + cfg.label + ' "' + before[cfg.nameField] + '" terlebih dahulu sebelum menghapus secara permanen.'
        );
      }

      TM_Db.deleteRecordById(cfg.sheet, cfg.idField, targetId);
      invalidateMasterCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'MASTER_DELETED',
        entityType: cfg.sheet,
        entityId: targetId,
        beforeData: before,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Menghapus permanen ' + cfg.label + ': "' + before[cfg.nameField] + '"'
      });

      return {
        deleted: true,
        id: targetId,
        name: before[cfg.nameField]
      };
    });
  }

  return {
    invalidateMasterCache: invalidateMasterCache,
    getMasterBundle: getMasterBundle,
    saveMasterItem: saveMasterItem,
    setMasterStatus: setMasterStatus,
    deleteMasterItem: deleteMasterItem
  };
})();



/* ==================== FILE: Outlets.gs ==================== */
/**
 * Outlets.gs — Normalisasi nama Outlet, deteksi duplikat, Canonical ID, Alias, Merge & Unmerge.
 */

var TM_Outlets = (function () {
  var CACHE_KEY = 'OUTLETS_BUNDLE_V1';

  function cleanDisplayName(raw) {
    return TM_Utils.sanitizeText(raw).replace(/\s+/g, ' ');
  }

  function normalizeOutletName(raw) {
    return cleanDisplayName(raw)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function levenshtein(a, b) {
    var m = a.length;
    var n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    var dp = new Array(n + 1);
    for (var j = 0; j <= n; j++) dp[j] = j;
    for (var i = 1; i <= m; i++) {
      var prev = dp[0];
      dp[0] = i;
      for (var k = 1; k <= n; k++) {
        var temp = dp[k];
        var cost = a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1;
        dp[k] = Math.min(dp[k] + 1, dp[k - 1] + 1, prev + cost);
        prev = temp;
      }
    }
    return dp[n];
  }

  function computeSimilarity(normA, normB) {
    if (!normA || !normB) return 0;
    if (normA === normB) return 1;
    if (normA.indexOf(normB) !== -1 || normB.indexOf(normA) !== -1) {
      var minLen = Math.min(normA.length, normB.length);
      var maxLen = Math.max(normA.length, normB.length);
      return 0.72 + (0.23 * (minLen / maxLen));
    }

    var maxLen2 = Math.max(normA.length, normB.length);
    var dist = levenshtein(normA, normB);
    var levScore = 1 - (dist / maxLen2);

    var tokensA = normA.split(' ');
    var tokensB = normB.split(' ');
    var overlap = 0;
    for (var i = 0; i < tokensA.length; i++) {
      if (tokensB.indexOf(tokensA[i]) !== -1) overlap++;
    }
    var tokenScore = overlap / Math.max(tokensA.length, tokensB.length);
    return Math.max(levScore, tokenScore * 0.9);
  }

  function invalidateOutletCache() {
    TM_Db.invalidateCache(CACHE_KEY);
  }

  function loadBundle() {
    return TM_Db.getCachedJson(CACHE_KEY, 300, function () {
      return {
        outlets: TM_Db.getAllRecords('Outlets'),
        aliases: TM_Db.getAllRecords('OutletAliases')
      };
    });
  }

  function resolveCanonicalOutletFromList(outletId, outletsMap) {
    var visited = {};
    var curr = outletsMap[outletId];
    while (curr && curr.MergedIntoOutletID && !visited[curr.OutletID]) {
      visited[curr.OutletID] = true;
      var parent = outletsMap[curr.MergedIntoOutletID];
      if (!parent) break;
      curr = parent;
    }
    return curr || null;
  }

  function generateNextOutletCode(existingOutlets) {
    var maxNum = 0;
    for (var i = 0; i < existingOutlets.length; i++) {
      var code = String(existingOutlets[i].OutletCode || '');
      var match = code.match(/^OUT(\d+)$/i);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    var next = maxNum + 1;
    return 'OUT' + String(next).padStart(3, '0');
  }

  function listOutlets(token) {
    TM_Auth.requireAuth(token);
    var bundle = loadBundle();
    var aliasByOutlet = {};
    for (var i = 0; i < bundle.aliases.length; i++) {
      var al = bundle.aliases[i];
      if (!aliasByOutlet[al.OutletID]) aliasByOutlet[al.OutletID] = [];
      aliasByOutlet[al.OutletID].push(al);
    }

    var outletsMap = {};
    for (var j = 0; j < bundle.outlets.length; j++) {
      outletsMap[bundle.outlets[j].OutletID] = bundle.outlets[j];
    }

    return bundle.outlets.map(function (o) {
      var mergedTarget = o.MergedIntoOutletID ? outletsMap[o.MergedIntoOutletID] : null;
      return Object.assign({}, o, {
        Aliases: aliasByOutlet[o.OutletID] || [],
        MergedIntoName: mergedTarget ? mergedTarget.CanonicalName : ''
      });
    });
  }

  function suggestOutlets(token, rawQuery) {
    TM_Auth.requireAuth(token);
    var clean = cleanDisplayName(rawQuery);
    var norm = normalizeOutletName(clean);
    var bundle = loadBundle();

    var outletsMap = {};
    for (var i = 0; i < bundle.outlets.length; i++) {
      outletsMap[bundle.outlets[i].OutletID] = bundle.outlets[i];
    }

    var aliasByOutlet = {};
    for (var a = 0; a < bundle.aliases.length; a++) {
      var al = bundle.aliases[a];
      if (!aliasByOutlet[al.OutletID]) aliasByOutlet[al.OutletID] = [];
      aliasByOutlet[al.OutletID].push(al);
    }

    if (!norm) {
      return bundle.outlets
        .filter(function (o) { return o.Status === TM_CONFIG.STATUS.ACTIVE && !o.MergedIntoOutletID; })
        .slice(0, 15)
        .map(function (o) {
          return {
            OutletID: o.OutletID,
            OutletCode: o.OutletCode,
            CanonicalName: o.CanonicalName,
            matchType: 'LIST',
            score: 1,
            aliases: (aliasByOutlet[o.OutletID] || []).map(function (x) { return x.AliasName; })
          };
        });
    }

    var candidatesByCanonical = {};

    function registerCandidate(canonical, score, matchType, matchedVia) {
      if (!canonical || canonical.Status === TM_CONFIG.STATUS.INACTIVE) return;
      var prev = candidatesByCanonical[canonical.OutletID];
      if (!prev || score > prev.score) {
        candidatesByCanonical[canonical.OutletID] = {
          OutletID: canonical.OutletID,
          OutletCode: canonical.OutletCode,
          CanonicalName: canonical.CanonicalName,
          matchType: matchType,
          matchedVia: matchedVia,
          score: Number(score.toFixed(3)),
          aliases: (aliasByOutlet[canonical.OutletID] || []).map(function (x) { return x.AliasName; })
        };
      }
    }

    for (var j = 0; j < bundle.outlets.length; j++) {
      var o = bundle.outlets[j];
      var canonical = resolveCanonicalOutletFromList(o.OutletID, outletsMap);
      var score = computeSimilarity(norm, o.NormalizedName);
      if (norm === o.NormalizedName) {
        registerCandidate(canonical, 1.0, o.MergedIntoOutletID ? 'MERGED_EXACT' : 'EXACT', o.CanonicalName);
      } else if (score >= 0.55) {
        registerCandidate(canonical, score, 'SIMILAR', o.CanonicalName);
      }
    }

    for (var k = 0; k < bundle.aliases.length; k++) {
      var alias = bundle.aliases[k];
      var target = resolveCanonicalOutletFromList(alias.OutletID, outletsMap);
      var alScore = computeSimilarity(norm, alias.NormalizedAlias);
      if (norm === alias.NormalizedAlias) {
        registerCandidate(target, 0.99, 'ALIAS_EXACT', alias.AliasName);
      } else if (alScore >= 0.55) {
        registerCandidate(target, alScore, 'ALIAS_SIMILAR', alias.AliasName);
      }
    }

    return Object.keys(candidatesByCanonical)
      .map(function (id) { return candidatesByCanonical[id]; })
      .sort(function (x, y) { return y.score - x.score; })
      .slice(0, 10);
  }

  function resolveOrCreateOutletUnlocked(ctx, rawName) {
    var display = cleanDisplayName(rawName);
    var norm = normalizeOutletName(display);

    if (!display || norm.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama Outlet wajib diisi (minimal 2 karakter).');
    }

    var outlets = TM_Db.getAllRecords('Outlets');
    var aliases = TM_Db.getAllRecords('OutletAliases');
    var outletsMap = {};
    for (var i = 0; i < outlets.length; i++) {
      outletsMap[outlets[i].OutletID] = outlets[i];
    }

    // 1. Cek kecocokan persis di Outlets
    for (var j = 0; j < outlets.length; j++) {
      if (outlets[j].NormalizedName === norm) {
        var canonical = resolveCanonicalOutletFromList(outlets[j].OutletID, outletsMap);
        if (canonical && canonical.Status === TM_CONFIG.STATUS.INACTIVE) {
          throw TM_Utils.AppError('ERR_OUTLET_INACTIVE', 'Outlet "' + canonical.CanonicalName + '" sedang nonaktif.');
        }
        return {
          outlet: canonical,
          created: false,
          matchedVia: outlets[j].OutletID === canonical.OutletID ? 'CANONICAL' : 'MERGED'
        };
      }
    }

    // 2. Cek kecocokan persis di OutletAliases
    for (var k = 0; k < aliases.length; k++) {
      if (aliases[k].NormalizedAlias === norm) {
        var target = resolveCanonicalOutletFromList(aliases[k].OutletID, outletsMap);
        if (target && target.Status !== TM_CONFIG.STATUS.INACTIVE) {
          return {
            outlet: target,
            created: false,
            matchedVia: 'ALIAS'
          };
        }
      }
    }

    // 3. Buat identitas Outlet baru
    var ts = TM_Utils.formatWibIso();
    var newOutlet = {
      OutletID: TM_Utils.generateId('OTL'),
      CanonicalName: display,
      NormalizedName: norm,
      OutletCode: generateNextOutletCode(outlets),
      Status: TM_CONFIG.STATUS.ACTIVE,
      MergedIntoOutletID: '',
      CreatedAt: ts,
      UpdatedAt: ts
    };
    TM_Db.insertRecord('Outlets', newOutlet);
    invalidateOutletCache();

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'OUTLET_CREATED',
      entityType: 'Outlets',
      entityId: newOutlet.OutletID,
      afterData: newOutlet,
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Membuat Outlet baru: ' + newOutlet.CanonicalName + ' (' + newOutlet.OutletCode + ')'
    });

    return {
      outlet: newOutlet,
      created: true,
      matchedVia: 'NEW'
    };
  }

  function resolveOrCreateOutlet(token, rawName) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN, TM_CONFIG.ROLES.TRAINER]);
    return TM_Db.withLock(function () {
      return resolveOrCreateOutletUnlocked(ctx, rawName);
    });
  }

  function updateOutlet(token, outletId, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var p = dto || {};
    var display = cleanDisplayName(p.canonicalName);
    var norm = normalizeOutletName(display);

    if (!display || norm.length < 2) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Nama Outlet wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var outlets = TM_Db.getAllRecords('Outlets');
      var target = outlets.find(function (o) { return o.OutletID === outletId; });
      if (!target) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet tidak ditemukan.');
      }
      for (var i = 0; i < outlets.length; i++) {
        if (outlets[i].OutletID !== outletId && outlets[i].NormalizedName === norm) {
          throw TM_Utils.AppError('ERR_DUPLICATE', 'Nama Outlet "' + display + '" sudah digunakan.');
        }
      }

      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Outlets', 'OutletID', outletId, function (rec) {
        rec.CanonicalName = display;
        rec.NormalizedName = norm;
        rec.UpdatedAt = ts;
        return rec;
      });
      invalidateOutletCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'OUTLET_UPDATED',
        entityType: 'Outlets',
        entityId: outletId,
        beforeData: target,
        afterData: updated,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Mengubah nama Outlet: "' + target.CanonicalName + '" -> "' + display + '"'
      });

      return updated;
    });
  }

  function mergeOutlets(token, primaryOutletId, duplicateOutletIds, reason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var mergeReason = TM_Utils.sanitizeText(reason);
    if (!mergeReason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan merge Outlet wajib diisi.');
    }
    var dupIds = Array.isArray(duplicateOutletIds) ? duplicateOutletIds : [duplicateOutletIds];
    dupIds = dupIds.filter(function (id, idx) {
      return id && dupIds.indexOf(id) === idx;
    });
    if (dupIds.length === 0) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Pilih minimal satu Outlet duplikat untuk di-merge.');
    }
    if (dupIds.indexOf(primaryOutletId) !== -1) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet utama tidak boleh termasuk dalam daftar duplikat.');
    }

    return TM_Db.withLock(function () {
      var outlets = TM_Db.getAllRecords('Outlets');
      var aliases = TM_Db.getAllRecords('OutletAliases');
      var outletsMap = {};
      for (var i = 0; i < outlets.length; i++) {
        outletsMap[outlets[i].OutletID] = outlets[i];
      }

      var primary = outletsMap[primaryOutletId];
      if (!primary) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet utama tidak ditemukan.');
      }
      if (primary.Status !== TM_CONFIG.STATUS.ACTIVE || primary.MergedIntoOutletID) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet utama harus berstatus aktif dan bukan hasil merge.');
      }

      var ts = TM_Utils.formatWibIso();
      var mergedResults = [];
      var newAliases = [];

      for (var d = 0; d < dupIds.length; d++) {
        var dupId = dupIds[d];
        var dup = outletsMap[dupId];
        if (!dup) {
          throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet duplikat "' + dupId + '" tidak ditemukan.');
        }
        if (dup.MergedIntoOutletID) {
          throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet "' + dup.CanonicalName + '" sudah di-merge sebelumnya.');
        }
        var hasChildren = outlets.some(function (x) { return x.MergedIntoOutletID === dupId; });
        if (hasChildren) {
          throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet "' + dup.CanonicalName + '" menjadi induk merge outlet lain. Batalkan merge anak terlebih dahulu.');
        }

        var updatedDup = TM_Db.updateRecordById('Outlets', 'OutletID', dupId, function (rec) {
          rec.Status = 'MERGED';
          rec.MergedIntoOutletID = primaryOutletId;
          rec.UpdatedAt = ts;
          return rec;
        });

        // Simpan nama lama sebagai alias pada Outlet utama jika belum ada
        var aliasExists = aliases.some(function (al) {
          return al.OutletID === primaryOutletId && al.NormalizedAlias === dup.NormalizedName;
        }) || newAliases.some(function (al) {
          return al.OutletID === primaryOutletId && al.NormalizedAlias === dup.NormalizedName;
        });

        if (!aliasExists) {
          newAliases.push({
            AliasID: TM_Utils.generateId('ALS'),
            OutletID: primaryOutletId,
            AliasName: dup.CanonicalName,
            NormalizedAlias: dup.NormalizedName,
            CreatedAt: ts
          });
        }

        mergedResults.push(updatedDup);
      }

      if (newAliases.length > 0) {
        TM_Db.insertRecordsBatch('OutletAliases', newAliases);
      }
      invalidateOutletCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'OUTLET_MERGED',
        entityType: 'Outlets',
        entityId: primaryOutletId,
        beforeData: {
          primary: primary,
          duplicates: dupIds.map(function (id) { return outletsMap[id]; })
        },
        afterData: {
          primaryId: primaryOutletId,
          mergedIds: dupIds,
          aliasesAdded: newAliases,
          reason: mergeReason
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Merge ' + dupIds.length + ' Outlet ke "' + primary.CanonicalName + '": ' + mergeReason
      });

      return {
        primary: primary,
        mergedOutlets: mergedResults,
        aliasesAdded: newAliases
      };
    });
  }

  function unmergeOutlet(token, duplicateOutletId, reason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var unmergeReason = TM_Utils.sanitizeText(reason);
    if (!unmergeReason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan pembatalan merge wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var dup = TM_Db.findById('Outlets', 'OutletID', duplicateOutletId);
      if (!dup) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet tidak ditemukan.');
      }
      if (!dup.MergedIntoOutletID) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet "' + dup.CanonicalName + '" tidak dalam status merge.');
      }

      var before = Object.assign({}, dup);
      var previousPrimaryId = dup.MergedIntoOutletID;
      var ts = TM_Utils.formatWibIso();

      var restored = TM_Db.updateRecordById('Outlets', 'OutletID', duplicateOutletId, function (rec) {
        rec.Status = TM_CONFIG.STATUS.ACTIVE;
        rec.MergedIntoOutletID = '';
        rec.UpdatedAt = ts;
        return rec;
      });

      // Hapus alias hasil merge otomatis pada Outlet utama jika cocok dengan nama Outlet yang di-unmerge
      var aliasSheet = TM_Db.getSheet('OutletAliases');
      var lastRow = aliasSheet.getLastRow();
      var lastCol = aliasSheet.getLastColumn();
      if (lastRow > 1 && lastCol > 0) {
        var values = aliasSheet.getRange(1, 1, lastRow, lastCol).getValues();
        var headers = values[0];
        var oidIdx = headers.indexOf('OutletID');
        var normIdx = headers.indexOf('NormalizedAlias');
        var keptRows = [headers];
        for (var r = 1; r < values.length; r++) {
          var isMergeAlias =
            String(values[r][oidIdx]) === previousPrimaryId &&
            String(values[r][normIdx]) === dup.NormalizedName;
          if (!isMergeAlias) {
            keptRows.push(values[r]);
          }
        }
        if (keptRows.length !== values.length) {
          // Kosongkan dan tulis ulang bersih
          var blank = values.map(function (row) { return row.map(function () { return ''; }); });
          aliasSheet.getRange(1, 1, values.length, headers.length).setValues(blank);
          aliasSheet.getRange(1, 1, keptRows.length, headers.length).setValues(keptRows);
        }
      }

      invalidateOutletCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'OUTLET_UNMERGED',
        entityType: 'Outlets',
        entityId: duplicateOutletId,
        beforeData: before,
        afterData: { restored: restored, reason: unmergeReason },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Membatalkan merge Outlet "' + dup.CanonicalName + '": ' + unmergeReason
      });

      return restored;
    });
  }

  function setOutletStatus(token, outletId, status) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var targetId = TM_Utils.sanitizeText(outletId);
    if (status !== TM_CONFIG.STATUS.ACTIVE && status !== TM_CONFIG.STATUS.INACTIVE) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Status Outlet tidak valid.');
    }

    return TM_Db.withLock(function () {
      var before = TM_Db.findById('Outlets', 'OutletID', targetId);
      if (!before) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet tidak ditemukan.');
      }
      if (before.MergedIntoOutletID) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet hasil merge tidak dapat diubah statusnya secara langsung.');
      }
      if (before.Status === status) {
        return before;
      }

      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Outlets', 'OutletID', targetId, function (rec) {
        rec.Status = status;
        rec.UpdatedAt = ts;
        return rec;
      });
      invalidateOutletCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: status === TM_CONFIG.STATUS.ACTIVE ? 'OUTLET_ACTIVATED' : 'OUTLET_DEACTIVATED',
        entityType: 'Outlets',
        entityId: targetId,
        beforeData: before,
        afterData: updated,
        deviceInfo: ctx.session.DeviceInfo,
        description: (status === TM_CONFIG.STATUS.ACTIVE ? 'Mengaktifkan ' : 'Menonaktifkan ') + 'Outlet: "' + before.CanonicalName + '" (' + before.OutletCode + ')'
      });

      return updated;
    });
  }

  function deleteOutlet(token, outletId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var targetId = TM_Utils.sanitizeText(outletId);
    if (!targetId) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'ID Outlet wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var outlets = TM_Db.getAllRecords('Outlets');
      var before = outlets.find(function (o) { return o.OutletID === targetId; });
      if (!before) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet tidak ditemukan.');
      }

      if (before.Status === TM_CONFIG.STATUS.ACTIVE && !before.MergedIntoOutletID) {
        throw TM_Utils.AppError(
          'ERR_VALIDATION',
          'Nonaktifkan Outlet "' + before.CanonicalName + '" terlebih dahulu sebelum menghapus secara permanen.'
        );
      }

      var hasMergedChildren = outlets.some(function (o) {
        return o.MergedIntoOutletID === targetId;
      });
      if (hasMergedChildren) {
        throw TM_Utils.AppError(
          'ERR_VALIDATION',
          'Outlet "' + before.CanonicalName + '" masih menjadi induk penggabungan (merge) Outlet lain. Batalkan merge terlebih dahulu.'
        );
      }

      TM_Db.deleteRecordById('Outlets', 'OutletID', targetId);
      var removedAliases = TM_Db.deleteRecordsWhere('OutletAliases', function (al) {
        return al.OutletID === targetId;
      });
      invalidateOutletCache();

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'OUTLET_DELETED',
        entityType: 'Outlets',
        entityId: targetId,
        beforeData: before,
        afterData: { removedAliasesCount: removedAliases.length },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Menghapus permanen Outlet: "' + before.CanonicalName + '" (' + before.OutletCode + ')'
      });

      return {
        deleted: true,
        outletId: targetId,
        outletCode: before.OutletCode,
        canonicalName: before.CanonicalName
      };
    });
  }

  return {
    cleanDisplayName: cleanDisplayName,
    normalizeOutletName: normalizeOutletName,
    invalidateOutletCache: invalidateOutletCache,
    listOutlets: listOutlets,
    suggestOutlets: suggestOutlets,
    resolveOrCreateOutletUnlocked: resolveOrCreateOutletUnlocked,
    resolveOrCreateOutlet: resolveOrCreateOutlet,
    updateOutlet: updateOutlet,
    setOutletStatus: setOutletStatus,
    deleteOutlet: deleteOutlet,
    mergeOutlets: mergeOutlets,
    unmergeOutlet: unmergeOutlet
  };
})();



/* ==================== FILE: Sessions.gs ==================== */
/**
 * Sessions.gs — Pengelolaan Sesi Pemeriksaan, Draft, Penomoran TM-YYYYMMDD-OUT001-001, Finalisasi, & Soft Delete/Restore.
 */

var TM_Sessions = (function () {
  function getTodayWibDateStr() {
    return TM_Utils.formatWibIso(TM_Utils.now()).slice(0, 10);
  }

  function validateInspectionDate(dateStr, required) {
    if (dateStr === null || dateStr === undefined || String(dateStr).trim() === '') {
      if (required) throw TM_Utils.AppError('ERR_VALIDATION', 'Tanggal pemeriksaan wajib diisi.');
      return getTodayWibDateStr();
    }
    var clean = TM_Utils.normalizeDateStr(dateStr);
    if (!clean) {
      throw TM_Utils.AppError(
        'ERR_VALIDATION',
        'Format tanggal pemeriksaan tidak valid (gunakan DD/MM/YYYY seperti 06/11/2026, 6 Nov 2026, atau YYYY-MM-DD).'
      );
    }
    var today = getTodayWibDateStr();
    if (clean > today) {
      throw TM_Utils.AppError('ERR_FUTURE_DATE', 'Tanggal pemeriksaan tidak boleh di masa depan (' + clean + ' > ' + today + ').');
    }
    return clean;
  }

  function getMaxDraftsLimit() {
    var row = TM_Db.findById('AppSettings', 'SettingKey', 'MAX_ACTIVE_DRAFTS');
    var parsed = row ? parseInt(row.SettingValue, 10) : TM_CONFIG.DEFAULTS.MAX_ACTIVE_DRAFTS;
    return isNaN(parsed) || parsed < 1 ? TM_CONFIG.DEFAULTS.MAX_ACTIVE_DRAFTS : parsed;
  }

  function lookupMasterActive(sheetName, idField, nameField, idValue, label) {
    if (!idValue) return { id: '', name: '' };
    var rec = TM_Db.findById(sheetName, idField, idValue);
    if (!rec) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', label + ' tidak ditemukan.');
    }
    if (rec.Status !== TM_CONFIG.STATUS.ACTIVE) {
      throw TM_Utils.AppError('ERR_INACTIVE_MASTER', label + ' "' + rec[nameField] + '" sedang nonaktif.');
    }
    return { id: rec[idField], name: rec[nameField] };
  }

  function generateReportNumber(inspectionDate, outletCode) {
    var yyyymmdd = inspectionDate.replace(/-/g, '');
    var prefix = 'TM-' + yyyymmdd + '-' + outletCode + '-';
    var sessions = TM_Db.getAllRecords('Sessions');
    var maxSeq = 0;
    for (var i = 0; i < sessions.length; i++) {
      var rn = String(sessions[i].ReportNumber || '');
      if (rn.indexOf(prefix) === 0) {
        var seqStr = rn.slice(prefix.length);
        var seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
    return prefix + String(maxSeq + 1).padStart(3, '0');
  }

  function saveDraft(token, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var p = dto || {};
    var sessionId = TM_Utils.sanitizeText(p.sessionId);
    var inspectionDate = validateInspectionDate(p.inspectionDate, false);
    var picName = TM_Utils.sanitizeText(p.picName);
    var amId = TM_Utils.sanitizeText(p.amId);
    var mumId = TM_Utils.sanitizeText(p.mumId);
    var outletId = TM_Utils.sanitizeText(p.outletId);
    var outletName = TM_Utils.sanitizeText(p.outletName);

    return TM_Db.withLock(function () {
      var existing = sessionId ? TM_Db.findById('Sessions', 'SessionID', sessionId) : null;
      if (existing) {
        if (existing.DeletedAt || existing.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
          throw TM_Utils.AppError('ERR_DRAFT_DELETED_BY_ADMIN', 'Draft ini telah dihapus dan tidak dapat diubah.', {
            sessionId: existing.SessionID,
            deletedAt: existing.DeletedAt,
            deletedBy: existing.DeletedBy,
            deleteReason: existing.DeleteReason
          });
        }
        if (existing.TrainerID !== ctx.user.UserID) {
          throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak dapat mengubah Draft milik Trainer lain.');
        }
        if (existing.Status !== TM_CONFIG.SESSION_STATUS.DRAFT) {
          throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi yang sudah selesai tidak dapat disimpan sebagai Draft.');
        }
      } else {
        // Cek batas maksimum Draft aktif per Trainer (PRD 7.3)
        var maxDrafts = getMaxDraftsLimit();
        var trainerDrafts = TM_Db.filterRecords('Sessions', function (s) {
          return s.TrainerID === ctx.user.UserID && s.Status === TM_CONFIG.SESSION_STATUS.DRAFT && !s.DeletedAt;
        });
        if (trainerDrafts.length >= maxDrafts) {
          throw TM_Utils.AppError(
            'ERR_DRAFT_LIMIT_REACHED',
            'Batas maksimum ' + maxDrafts + ' Draft aktif telah tercapai. Selesaikan atau hapus Draft lama terlebih dahulu.'
          );
        }
      }

      // Resolve AM & MUM jika diisi (boleh kosong saat Draft)
      var amInfo = { id: '', name: '' };
      if (amId) {
        if (existing && existing.AM_ID === amId) {
          amInfo = { id: existing.AM_ID, name: existing.AM_Name_Snapshot };
        } else {
          amInfo = lookupMasterActive('Master_AM', 'AM_ID', 'AM_Name', amId, 'AM');
        }
      }

      var mumInfo = { id: '', name: '' };
      if (mumId) {
        if (existing && existing.MUM_ID === mumId) {
          mumInfo = { id: existing.MUM_ID, name: existing.MUM_Name_Snapshot };
        } else {
          mumInfo = lookupMasterActive('Master_MUM', 'MUM_ID', 'MUM_Name', mumId, 'MUM');
        }
      }

      // Resolve Outlet jika diisi (boleh kosong saat Draft)
      var resolvedOutletId = '';
      var resolvedOutletName = '';
      if (outletId) {
        var oRec = TM_Db.findById('Outlets', 'OutletID', outletId);
        if (!oRec) throw TM_Utils.AppError('ERR_NOT_FOUND', 'Outlet tidak ditemukan.');
        resolvedOutletId = oRec.OutletID;
        resolvedOutletName = oRec.CanonicalName;
      } else if (outletName) {
        var resOutlet = TM_Outlets.resolveOrCreateOutletUnlocked(ctx, outletName);
        resolvedOutletId = resOutlet.outlet.OutletID;
        resolvedOutletName = resOutlet.outlet.CanonicalName;
      }

      var ts = TM_Utils.formatWibIso();
      if (existing) {
        var nextVersion = String(parseInt(existing.Version || '1', 10) + 1);
        var updated = TM_Db.updateRecordById('Sessions', 'SessionID', existing.SessionID, function (rec) {
          rec.InspectionDate = inspectionDate;
          rec.OutletID = resolvedOutletId;
          rec.OutletNameSnapshot = resolvedOutletName;
          rec.AM_ID = amInfo.id;
          rec.AM_Name_Snapshot = amInfo.name;
          rec.MUM_ID = mumInfo.id;
          rec.MUM_Name_Snapshot = mumInfo.name;
          rec.PIC_Name = picName;
          rec.Version = nextVersion;
          rec.UpdatedAt = ts;
          return rec;
        });

        TM_Audit.logEvent({
          userId: ctx.user.UserID,
          action: 'DRAFT_UPDATED',
          entityType: 'Sessions',
          entityId: updated.SessionID,
          afterData: { version: nextVersion, outlet: resolvedOutletName },
          deviceInfo: ctx.session.DeviceInfo,
          description: 'Memperbarui Draft pemeriksaan ' + updated.SessionID
        });
        return updated;
      }

      var newId = sessionId || TM_Utils.generateId('SES');
      var newSession = {
        SessionID: newId,
        ReportNumber: '',
        InspectionDate: inspectionDate,
        OutletID: resolvedOutletId,
        OutletNameSnapshot: resolvedOutletName,
        AM_ID: amInfo.id,
        AM_Name_Snapshot: amInfo.name,
        MUM_ID: mumInfo.id,
        MUM_Name_Snapshot: mumInfo.name,
        PIC_Name: picName,
        TrainerID: ctx.user.UserID,
        Status: TM_CONFIG.SESSION_STATUS.DRAFT,
        Version: '1',
        IsRestoredFlagUntil: '',
        CreatedAt: ts,
        SubmittedAt: '',
        UpdatedAt: ts,
        DeletedAt: '',
        DeletedBy: '',
        DeleteReason: ''
      };

      TM_Db.insertRecord('Sessions', newSession);

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'DRAFT_CREATED',
        entityType: 'Sessions',
        entityId: newSession.SessionID,
        afterData: newSession,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Membuat Draft pemeriksaan baru'
      });

      return newSession;
    });
  }

  function listMyDrafts(token) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var maxDrafts = getMaxDraftsLimit();
    var allSessions = TM_Db.getAllRecords('Sessions');
    var allFindings = TM_Db.getAllRecords('Findings');

    var findingCountBySession = {};
    for (var i = 0; i < allFindings.length; i++) {
      var f = allFindings[i];
      if (!f.DeletedAt) {
        findingCountBySession[f.SessionID] = (findingCountBySession[f.SessionID] || 0) + 1;
      }
    }

    var drafts = allSessions.filter(function (s) {
      return s.TrainerID === ctx.user.UserID && s.Status === TM_CONFIG.SESSION_STATUS.DRAFT && !s.DeletedAt;
    }).map(function (s) {
      return Object.assign({}, s, {
        FindingCount: findingCountBySession[s.SessionID] || 0
      });
    });

    drafts.sort(function (a, b) {
      return String(b.UpdatedAt).localeCompare(String(a.UpdatedAt));
    });

    return {
      drafts: drafts,
      activeCount: drafts.length,
      maxActiveDrafts: maxDrafts
    };
  }

  function deleteMyDraft(token, sessionId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session || session.DeletedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Draft tidak ditemukan.');
      }
      if (session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda hanya dapat menghapus Draft milik Anda sendiri.');
      }
      if (session.Status !== TM_CONFIG.SESSION_STATUS.DRAFT) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Trainer tidak dapat menghapus sesi yang sudah selesai.');
      }

      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
        rec.Status = TM_CONFIG.SESSION_STATUS.DELETED;
        rec.DeletedAt = ts;
        rec.DeletedBy = ctx.user.UserID;
        rec.DeleteReason = 'Dihapus oleh Trainer pembuat';
        rec.UpdatedAt = ts;
        return rec;
      });

      var findings = TM_Db.filterRecords('Findings', function (f) {
        return f.SessionID === sessionId && !f.DeletedAt;
      });
      for (var i = 0; i < findings.length; i++) {
        TM_Db.updateRecordById('Findings', 'FindingID', findings[i].FindingID, function (rec) {
          rec.DeletedAt = ts;
          rec.DeletedBy = ctx.user.UserID;
          rec.DeleteReason = 'Draft dihapus oleh Trainer';
          rec.DeletionSource = 'SESSION';
          return rec;
        });
        TM_Photos.archivePhotosForFinding(findings[i].FindingID, ctx.user.UserID);
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'TRAINER_DRAFT_DELETED',
        entityType: 'Sessions',
        entityId: sessionId,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Trainer menghapus Draft miliknya: ' + (session.OutletNameSnapshot || sessionId)
      });

      return updated;
    });
  }

  function finalizeSession(token, sessionId, confirmNoFindings) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);

    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session || session.DeletedAt || session.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Draft pemeriksaan tidak ditemukan atau sudah dihapus.');
      }
      if (session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Hanya Trainer pembuat Draft yang dapat memfinalisasi pemeriksaan ini.');
      }
      if (session.Status !== TM_CONFIG.SESSION_STATUS.DRAFT) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi pemeriksaan ini sudah difinalisasi sebelumnya.');
      }

      // Validasi seluruh field sesi wajib (PRD 4 & 7.4)
      var inspectionDate = validateInspectionDate(session.InspectionDate, true);
      if (!session.OutletID || !session.OutletNameSnapshot) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Outlet wajib diisi sebelum finalisasi.');
      }
      if (!session.AM_ID || !session.AM_Name_Snapshot) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'AM wajib dipilih sebelum finalisasi.');
      }
      if (!session.MUM_ID || !session.MUM_Name_Snapshot) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'MUM wajib dipilih sebelum finalisasi.');
      }
      if (!TM_Utils.sanitizeText(session.PIC_Name)) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Nama PIC wajib diisi sebelum finalisasi.');
      }

      var outlet = TM_Db.findById('Outlets', 'OutletID', session.OutletID);
      if (!outlet) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Data Outlet tidak ditemukan.');
      }

      var activeFindings = TM_Db.filterRecords('Findings', function (f) {
        return f.SessionID === sessionId && !f.DeletedAt;
      });

      if (activeFindings.length === 0) {
        if (confirmNoFindings !== true) {
          throw TM_Utils.AppError(
            'ERR_CONFIRM_EMPTY_SESSION',
            'Sesi pemeriksaan ini tidak memiliki temuan. Apakah Anda yakin ingin menyelesaikan pemeriksaan tanpa temuan?'
          );
        }
      } else {
        var allPhotos = TM_Db.filterRecords('Photos', function (ph) {
          return ph.SessionID === sessionId && !ph.DeletedAt;
        });

        for (var i = 0; i < activeFindings.length; i++) {
          var f = activeFindings[i];
          if (!f.CategoryID || !f.SectionID || !TM_Utils.sanitizeText(f.Masalah) || !TM_Utils.sanitizeText(f.Mengapa)) {
            throw TM_Utils.AppError('ERR_VALIDATION', 'Setiap temuan aktif wajib memiliki Category, Section, Masalah, dan Mengapa.');
          }
          var uploadedPhotos = allPhotos.filter(function (ph) {
            return ph.FindingID === f.FindingID && ph.Status === 'Berhasil';
          });
          if (uploadedPhotos.length === 0) {
            throw TM_Utils.AppError('ERR_PHOTO_REQUIRED', 'Setiap temuan aktif wajib memiliki minimal 1 foto bukti yang berhasil diunggah.');
          }
        }
      }

      var reportNumber = generateReportNumber(inspectionDate, outlet.OutletCode);
      var ts = TM_Utils.formatWibIso();
      var nextVersion = String(parseInt(session.Version || '1', 10) + 1);

      var finalized = TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
        rec.ReportNumber = reportNumber;
        rec.Status = TM_CONFIG.SESSION_STATUS.SELESAI;
        rec.Version = nextVersion;
        rec.SubmittedAt = ts;
        rec.UpdatedAt = ts;
        return rec;
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'SESSION_FINALIZED',
        entityType: 'Sessions',
        entityId: sessionId,
        beforeData: { status: session.Status },
        afterData: {
          status: finalized.Status,
          reportNumber: reportNumber,
          findingCount: activeFindings.length
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Memfinalisasi sesi pemeriksaan ' + reportNumber + ' (' + activeFindings.length + ' temuan)'
      });

      return {
        session: finalized,
        findingCount: activeFindings.length
      };
    });
  }

  function getSessionDetail(token, sessionId) {
    var ctx = TM_Auth.requireAuth(token);
    var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
    if (!session) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi pemeriksaan tidak ditemukan.');
    }

    var isAdmin = ctx.user.Role === TM_CONFIG.ROLES.SUPER_ADMIN;
    if (session.DeletedAt && !isAdmin) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi pemeriksaan tidak ditemukan.');
    }
    if (session.Status === TM_CONFIG.SESSION_STATUS.DRAFT) {
      if (!isAdmin && !(ctx.user.Role === TM_CONFIG.ROLES.TRAINER && session.TrainerID === ctx.user.UserID)) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak berhak melihat Draft milik Trainer lain.');
      }
    }

    var users = TM_Db.getAllRecords('Users');
    var trainer = users.find(function (u) { return u.UserID === session.TrainerID; });

    var findings = TM_Db.filterRecords('Findings', function (f) {
      if (f.SessionID !== sessionId) return false;
      return isAdmin ? true : !f.DeletedAt;
    });

    var photos = TM_Db.filterRecords('Photos', function (ph) {
      if (ph.SessionID !== sessionId) return false;
      return isAdmin ? !ph.PurgedAt : !ph.DeletedAt;
    });

    var photosByFinding = {};
    for (var i = 0; i < photos.length; i++) {
      var fid = photos[i].FindingID;
      if (!photosByFinding[fid]) photosByFinding[fid] = [];
      photosByFinding[fid].push(photos[i]);
    }

    var enrichedFindings = findings.map(function (f) {
      return Object.assign({}, f, {
        Photos: photosByFinding[f.FindingID] || []
      });
    });

    return {
      session: Object.assign({}, session, {
        TrainerName: trainer ? trainer.Name : session.TrainerID
      }),
      findings: enrichedFindings,
      readOnly: isAdmin && session.Status === TM_CONFIG.SESSION_STATUS.DRAFT
    };
  }

  function listCompletedSessions(token, limit) {
    var ctx = TM_Auth.requireAuth(token);
    var sessions = TM_Db.filterRecords('Sessions', function (s) {
      return s.Status === TM_CONFIG.SESSION_STATUS.SELESAI && !s.DeletedAt;
    });
    var users = TM_Db.getAllRecords('Users');
    var userMap = {};
    for (var i = 0; i < users.length; i++) {
      userMap[users[i].UserID] = users[i].Name;
    }

    var findings = TM_Db.filterRecords('Findings', function (f) { return !f.DeletedAt; });
    var countBySes = {};
    for (var j = 0; j < findings.length; j++) {
      countBySes[findings[j].SessionID] = (countBySes[findings[j].SessionID] || 0) + 1;
    }

    sessions.sort(function (a, b) {
      return String(b.SubmittedAt || b.CreatedAt).localeCompare(String(a.SubmittedAt || a.CreatedAt));
    });

    var max = limit ? parseInt(limit, 10) : 50;
    return sessions.slice(0, max).map(function (s) {
      return Object.assign({}, s, {
        TrainerName: userMap[s.TrainerID] || s.TrainerID,
        FindingCount: countBySes[s.SessionID] || 0,
        IsOwner: s.TrainerID === ctx.user.UserID
      });
    });
  }

  function listDeletedCompletedSessions(token) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var sessions = TM_Db.filterRecords('Sessions', function (s) {
      return Boolean(s.DeletedAt && s.SubmittedAt);
    });
    var users = TM_Db.getAllRecords('Users');
    var userMap = {};
    for (var i = 0; i < users.length; i++) {
      userMap[users[i].UserID] = users[i].Name;
    }
    sessions.sort(function (a, b) {
      return String(b.DeletedAt).localeCompare(String(a.DeletedAt));
    });
    return sessions.map(function (s) {
      return Object.assign({}, s, {
        TrainerName: userMap[s.TrainerID] || s.TrainerID,
        DeletedByName: userMap[s.DeletedBy] || s.DeletedBy
      });
    });
  }

  function deleteSession(token, sessionId, reason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var delReason = TM_Utils.sanitizeText(reason);
    if (!delReason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan penghapusan sesi wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi pemeriksaan tidak ditemukan.');
      }
      if (session.DeletedAt) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi sudah dalam status terhapus.');
      }

      var before = Object.assign({}, session);
      var ts = TM_Utils.formatWibIso();
      var nextVersion = String(parseInt(session.Version || '1', 10) + 1);

      var updated = TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
        rec.Status = TM_CONFIG.SESSION_STATUS.DELETED;
        rec.Version = nextVersion;
        rec.DeletedAt = ts;
        rec.DeletedBy = ctx.user.UserID;
        rec.DeleteReason = delReason;
        rec.UpdatedAt = ts;
        return rec;
      });

      // Soft-delete temuan aktif akibat penghapusan sesi, tanpa menimpa temuan INDIVIDUAL yang sudah dihapus sebelumnya
      var findings = TM_Db.filterRecords('Findings', function (f) {
        return f.SessionID === sessionId && !f.DeletedAt;
      });
      for (var i = 0; i < findings.length; i++) {
        TM_Db.updateRecordById('Findings', 'FindingID', findings[i].FindingID, function (rec) {
          rec.DeletedAt = ts;
          rec.DeletedBy = ctx.user.UserID;
          rec.DeleteReason = 'Penghapusan sesi: ' + delReason;
          rec.DeletionSource = 'SESSION';
          return rec;
        });
        TM_Photos.archivePhotosForFinding(findings[i].FindingID, ctx.user.UserID);
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'SESSION_DELETED',
        entityType: 'Sessions',
        entityId: sessionId,
        beforeData: before,
        afterData: { deletedAt: ts, reason: delReason, cascadedFindings: findings.length },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Super Admin menghapus sesi ' + (session.ReportNumber || sessionId) + ': ' + delReason
      });

      return updated;
    });
  }

  function restoreSession(token, sessionId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi pemeriksaan tidak ditemukan.');
      }
      if (!session.DeletedAt) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi ini tidak dalam status terhapus.');
      }

      var restoredStatus = session.SubmittedAt ? TM_CONFIG.SESSION_STATUS.SELESAI : TM_CONFIG.SESSION_STATUS.DRAFT;
      var ts = TM_Utils.formatWibIso();
      var nextVersion = String(parseInt(session.Version || '1', 10) + 1);

      var restored = TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
        rec.Status = restoredStatus;
        rec.Version = nextVersion;
        rec.DeletedAt = '';
        rec.DeletedBy = '';
        rec.DeleteReason = '';
        rec.UpdatedAt = ts;
        return rec;
      });

      // PRD 9.5: Pulihkan hanya temuan dengan DeletionSource === 'SESSION'; temuan INDIVIDUAL tetap terhapus
      var sessionFindings = TM_Db.filterRecords('Findings', function (f) {
        return f.SessionID === sessionId && f.DeletedAt && f.DeletionSource === 'SESSION';
      });
      for (var i = 0; i < sessionFindings.length; i++) {
        TM_Db.updateRecordById('Findings', 'FindingID', sessionFindings[i].FindingID, function (rec) {
          rec.DeletedAt = '';
          rec.DeletedBy = '';
          rec.DeleteReason = '';
          rec.DeletionSource = '';
          return rec;
        });
        TM_Photos.restorePhotosForFinding(sessionFindings[i].FindingID);
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'SESSION_RESTORED',
        entityType: 'Sessions',
        entityId: sessionId,
        afterData: { status: restoredStatus, restoredFindings: sessionFindings.length },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Super Admin memulihkan sesi ' + (session.ReportNumber || sessionId)
      });

      return restored;
    });
  }

  return {
    getTodayWibDateStr: getTodayWibDateStr,
    validateInspectionDate: validateInspectionDate,
    getMaxDraftsLimit: getMaxDraftsLimit,
    saveDraft: saveDraft,
    listMyDrafts: listMyDrafts,
    deleteMyDraft: deleteMyDraft,
    finalizeSession: finalizeSession,
    getSessionDetail: getSessionDetail,
    listCompletedSessions: listCompletedSessions,
    listDeletedCompletedSessions: listDeletedCompletedSessions,
    deleteSession: deleteSession,
    restoreSession: restoreSession
  };
})();



/* ==================== FILE: Findings.gs ==================== */
/**
 * Findings.gs — Pengelolaan Temuan (Draft, Edit/Hapus batas 24 jam, Soft Delete & Restore).
 */

var TM_Findings = (function () {
  function resolveCategoryAndSection(categoryId, sectionId, existingFinding, isFinalizedSession) {
    var catId = TM_Utils.sanitizeText(categoryId);
    var catName = '';
    if (catId) {
      if (existingFinding && existingFinding.CategoryID === catId) {
        catName = existingFinding.CategoryNameSnapshot;
      } else {
        var cat = TM_Db.findById('Categories', 'CategoryID', catId);
        if (!cat) throw TM_Utils.AppError('ERR_NOT_FOUND', 'Master Category tidak ditemukan.');
        if (cat.Status !== TM_CONFIG.STATUS.ACTIVE) {
          throw TM_Utils.AppError('ERR_INACTIVE_MASTER', 'Master Category "' + cat.CategoryName + '" sedang nonaktif.');
        }
        catName = cat.CategoryName;
      }
    } else if (isFinalizedSession) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Master Category wajib dipilih.');
    }

    var secId = TM_Utils.sanitizeText(sectionId);
    var secName = '';
    if (secId) {
      if (existingFinding && existingFinding.SectionID === secId) {
        secName = existingFinding.SectionNameSnapshot;
      } else {
        var sec = TM_Db.findById('Sections', 'SectionID', secId);
        if (!sec) throw TM_Utils.AppError('ERR_NOT_FOUND', 'Master Section tidak ditemukan.');
        if (sec.Status !== TM_CONFIG.STATUS.ACTIVE) {
          throw TM_Utils.AppError('ERR_INACTIVE_MASTER', 'Master Section "' + sec.SectionName + '" sedang nonaktif.');
        }
        secName = sec.SectionName;
      }
    } else if (isFinalizedSession) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Master Section wajib dipilih.');
    }

    return {
      categoryId: catId,
      categoryName: catName,
      sectionId: secId,
      sectionName: secName
    };
  }

  function assertWithin24HoursIfTrainer(ctx, session) {
    if (ctx.user.Role === TM_CONFIG.ROLES.SUPER_ADMIN) return;
    if (ctx.user.Role !== TM_CONFIG.ROLES.TRAINER) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak memiliki izin mengubah atau menghapus temuan.');
    }
    if (session.TrainerID !== ctx.user.UserID) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Trainer tidak dapat mengubah atau menghapus temuan milik Trainer lain.');
    }
    var submittedMs = new Date(session.SubmittedAt).getTime();
    var windowMs = TM_CONFIG.DEFAULTS.FINDING_EDIT_WINDOW_HOURS * 3600000;
    if (isNaN(submittedMs) || (TM_Utils.now().getTime() - submittedMs) > windowMs) {
      throw TM_Utils.AppError('ERR_EDIT_WINDOW_EXPIRED', 'Batas waktu 24 jam sejak finalisasi telah lewat. Hubungi Super Admin untuk perubahan.');
    }
  }

  function saveFindingDraft(token, sessionId, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var p = dto || {};
    var findingId = TM_Utils.sanitizeText(p.findingId);
    var masalah = TM_Utils.sanitizeText(p.masalah);
    var mengapa = TM_Utils.sanitizeText(p.mengapa);
    var solusi = TM_Utils.sanitizeText(p.solusi);

    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session || session.DeletedAt || session.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
        throw TM_Utils.AppError('ERR_DRAFT_DELETED_BY_ADMIN', 'Draft tidak ditemukan atau telah dihapus.');
      }
      if (session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda hanya dapat mengubah temuan pada Draft milik Anda.');
      }
      if (session.Status !== TM_CONFIG.SESSION_STATUS.DRAFT) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi sudah selesai; gunakan fungsi edit temuan resmi.');
      }

      var existing = findingId ? TM_Db.findById('Findings', 'FindingID', findingId) : null;
      if (existing && existing.SessionID !== sessionId) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Temuan tidak sesuai dengan sesi ini.');
      }
      if (existing && existing.DeletedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Temuan telah dihapus.');
      }

      var resolved = resolveCategoryAndSection(p.categoryId, p.sectionId, existing, false);
      var ts = TM_Utils.formatWibIso();

      if (existing) {
        var nextVersion = String(parseInt(existing.Version || '1', 10) + 1);
        var updated = TM_Db.updateRecordById('Findings', 'FindingID', existing.FindingID, function (rec) {
          rec.CategoryID = resolved.categoryId;
          rec.CategoryNameSnapshot = resolved.categoryName;
          rec.SectionID = resolved.sectionId;
          rec.SectionNameSnapshot = resolved.sectionName;
          rec.Masalah = masalah;
          rec.Mengapa = mengapa;
          rec.Solusi = solusi;
          rec.Version = nextVersion;
          rec.UpdatedAt = ts;
          rec.UpdatedBy = ctx.user.UserID;
          return rec;
        });

        TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
          rec.UpdatedAt = ts;
          return rec;
        });

        return updated;
      }

      var newFinding = {
        FindingID: findingId || TM_Utils.generateId('FND'),
        SessionID: sessionId,
        CategoryID: resolved.categoryId,
        CategoryNameSnapshot: resolved.categoryName,
        SectionID: resolved.sectionId,
        SectionNameSnapshot: resolved.sectionName,
        Masalah: masalah,
        Mengapa: mengapa,
        Solusi: solusi,
        Version: '1',
        CreatedAt: ts,
        CreatedBy: ctx.user.UserID,
        UpdatedAt: ts,
        UpdatedBy: ctx.user.UserID,
        DeletedAt: '',
        DeletedBy: '',
        DeleteReason: '',
        DeletionSource: ''
      };

      TM_Db.insertRecord('Findings', newFinding);
      TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
        rec.UpdatedAt = ts;
        return rec;
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'FINDING_DRAFT_ADDED',
        entityType: 'Findings',
        entityId: newFinding.FindingID,
        afterData: { sessionId: sessionId, category: resolved.categoryName, section: resolved.sectionName },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Menambahkan temuan ke Draft ' + sessionId
      });

      return newFinding;
    });
  }

  function deleteFindingInDraft(token, findingId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    return TM_Db.withLock(function () {
      var finding = TM_Db.findById('Findings', 'FindingID', findingId);
      if (!finding || finding.DeletedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Temuan tidak ditemukan.');
      }
      var session = TM_Db.findById('Sessions', 'SessionID', finding.SessionID);
      if (!session || session.DeletedAt || session.Status !== TM_CONFIG.SESSION_STATUS.DRAFT) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Temuan hanya bisa dihapus dari Draft aktif.');
      }
      if (session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak berhak menghapus temuan pada Draft Trainer lain.');
      }

      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Findings', 'FindingID', findingId, function (rec) {
        rec.DeletedAt = ts;
        rec.DeletedBy = ctx.user.UserID;
        rec.DeleteReason = 'Dihapus dari Draft oleh Trainer';
        rec.DeletionSource = 'INDIVIDUAL';
        return rec;
      });
      TM_Photos.archivePhotosForFinding(findingId, ctx.user.UserID);
      TM_Db.updateRecordById('Sessions', 'SessionID', session.SessionID, function (rec) {
        rec.UpdatedAt = ts;
        return rec;
      });

      return updated;
    });
  }

  function updateFinding(token, findingId, dto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN, TM_CONFIG.ROLES.TRAINER]);
    var p = dto || {};
    var masalah = TM_Utils.sanitizeText(p.masalah);
    var mengapa = TM_Utils.sanitizeText(p.mengapa);
    var solusi = TM_Utils.sanitizeText(p.solusi);

    if (!masalah || !mengapa) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Field Masalah dan Mengapa wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var finding = TM_Db.findById('Findings', 'FindingID', findingId);
      if (!finding || finding.DeletedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Temuan tidak ditemukan atau sudah dihapus.');
      }
      var session = TM_Db.findById('Sessions', 'SessionID', finding.SessionID);
      if (!session || session.DeletedAt || session.Status !== TM_CONFIG.SESSION_STATUS.SELESAI) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Hanya temuan pada sesi Selesai aktif yang dapat diedit melalui menu ini.');
      }

      assertWithin24HoursIfTrainer(ctx, session);

      var resolved = resolveCategoryAndSection(p.categoryId, p.sectionId, finding, true);
      var before = Object.assign({}, finding);
      var ts = TM_Utils.formatWibIso();
      var nextVersion = String(parseInt(finding.Version || '1', 10) + 1);

      var updated = TM_Db.updateRecordById('Findings', 'FindingID', findingId, function (rec) {
        rec.CategoryID = resolved.categoryId;
        rec.CategoryNameSnapshot = resolved.categoryName;
        rec.SectionID = resolved.sectionId;
        rec.SectionNameSnapshot = resolved.sectionName;
        rec.Masalah = masalah;
        rec.Mengapa = mengapa;
        rec.Solusi = solusi;
        rec.Version = nextVersion;
        // PRD 9.1: CreatedAt tidak berubah; menyimpan updated_at & updated_by
        rec.UpdatedAt = ts;
        rec.UpdatedBy = ctx.user.UserID;
        return rec;
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'FINDING_UPDATED',
        entityType: 'Findings',
        entityId: findingId,
        beforeData: before,
        afterData: updated,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Mengubah temuan ' + findingId + ' pada sesi ' + session.ReportNumber
      });

      return updated;
    });
  }

  function deleteFinding(token, findingId, reason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN, TM_CONFIG.ROLES.TRAINER]);
    var delReason = TM_Utils.sanitizeText(reason);
    if (!delReason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan penghapusan temuan wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var finding = TM_Db.findById('Findings', 'FindingID', findingId);
      if (!finding || finding.DeletedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Temuan tidak ditemukan atau sudah dihapus.');
      }
      var session = TM_Db.findById('Sessions', 'SessionID', finding.SessionID);
      if (!session || session.DeletedAt || session.Status !== TM_CONFIG.SESSION_STATUS.SELESAI) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi pemeriksaan tidak aktif atau belum selesai.');
      }

      assertWithin24HoursIfTrainer(ctx, session);

      var before = Object.assign({}, finding);
      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Findings', 'FindingID', findingId, function (rec) {
        rec.DeletedAt = ts;
        rec.DeletedBy = ctx.user.UserID;
        rec.DeleteReason = delReason;
        rec.DeletionSource = 'INDIVIDUAL';
        rec.UpdatedAt = ts;
        rec.UpdatedBy = ctx.user.UserID;
        return rec;
      });

      TM_Photos.archivePhotosForFinding(findingId, ctx.user.UserID);

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'FINDING_DELETED',
        entityType: 'Findings',
        entityId: findingId,
        beforeData: before,
        afterData: { deletedAt: ts, reason: delReason, deletionSource: 'INDIVIDUAL' },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Menghapus temuan ' + findingId + ': ' + delReason
      });

      return updated;
    });
  }

  function restoreFinding(token, findingId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    return TM_Db.withLock(function () {
      var finding = TM_Db.findById('Findings', 'FindingID', findingId);
      if (!finding) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Temuan tidak ditemukan.');
      }
      if (!finding.DeletedAt) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Temuan tidak dalam status terhapus.');
      }
      var session = TM_Db.findById('Sessions', 'SessionID', finding.SessionID);
      if (!session || session.DeletedAt) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi induk masih berstatus terhapus. Pulihkan sesi terlebih dahulu.');
      }

      var before = Object.assign({}, finding);
      var ts = TM_Utils.formatWibIso();
      var restored = TM_Db.updateRecordById('Findings', 'FindingID', findingId, function (rec) {
        rec.DeletedAt = '';
        rec.DeletedBy = '';
        rec.DeleteReason = '';
        rec.DeletionSource = '';
        rec.UpdatedAt = ts;
        rec.UpdatedBy = ctx.user.UserID;
        return rec;
      });

      TM_Photos.restorePhotosForFinding(findingId);

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'FINDING_RESTORED',
        entityType: 'Findings',
        entityId: findingId,
        beforeData: before,
        afterData: restored,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Super Admin memulihkan temuan ' + findingId
      });

      return restored;
    });
  }

  return {
    saveFindingDraft: saveFindingDraft,
    deleteFindingInDraft: deleteFindingInDraft,
    updateFinding: updateFinding,
    deleteFinding: deleteFinding,
    restoreFinding: restoreFinding
  };
})();



/* ==================== FILE: Photos.gs ==================== */
/**
 * Photos.gs — Penyimpanan foto privat di Google Drive, antrean idempotent, & kontrol akses baca/unduh.
 */

var TM_Photos = (function () {
  var ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png'];

  function setPrivateFileSharing(file) {
    try {
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    } catch (e) {
      // ignore on personal Drive if already private
    }
  }

  function moveFileToFolder(driveFileId, targetFolderId) {
    if (!driveFileId || !targetFolderId) return;
    try {
      var file = DriveApp.getFileById(driveFileId);
      var targetFolder = DriveApp.getFolderById(targetFolderId);
      if (typeof file.moveTo === 'function') {
        file.moveTo(targetFolder);
      } else {
        targetFolder.addFile(file);
      }
    } catch (e) {
      // ignore if file already moved or missing in mock
    }
  }

  function assertCanModifyFindingPhotos(ctx, session, finding) {
    if (!session) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi pemeriksaan tidak ditemukan.');
    }
    if (session.DeletedAt || session.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
      throw TM_Utils.AppError('ERR_DRAFT_DELETED_BY_ADMIN', 'Sesi/Draft telah dihapus.', {
        sessionId: session.SessionID,
        deletedAt: session.DeletedAt,
        deletedBy: session.DeletedBy,
        deleteReason: session.DeleteReason
      });
    }
    if (!finding || finding.DeletedAt) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Temuan tidak ditemukan atau sudah dihapus.');
    }

    if (session.Status === TM_CONFIG.SESSION_STATUS.DRAFT) {
      if (ctx.user.Role !== TM_CONFIG.ROLES.TRAINER || session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Hanya Trainer pembuat Draft yang dapat mengunggah atau menghapus foto Draft ini.');
      }
      return;
    }

    if (session.Status === TM_CONFIG.SESSION_STATUS.SELESAI) {
      if (ctx.user.Role === TM_CONFIG.ROLES.SUPER_ADMIN) return;
      if (ctx.user.Role === TM_CONFIG.ROLES.TRAINER) {
        if (session.TrainerID !== ctx.user.UserID) {
          throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak dapat mengubah foto temuan milik Trainer lain.');
        }
        var submittedMs = new Date(session.SubmittedAt).getTime();
        var windowMs = TM_CONFIG.DEFAULTS.FINDING_EDIT_WINDOW_HOURS * 3600000;
        if (isNaN(submittedMs) || (TM_Utils.now().getTime() - submittedMs) > windowMs) {
          throw TM_Utils.AppError('ERR_EDIT_WINDOW_EXPIRED', 'Batas waktu edit 24 jam setelah finalisasi telah berakhir.');
        }
        return;
      }
    }

    throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak memiliki izin mengubah foto ini.');
  }

  function uploadPhoto(token, payload) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN, TM_CONFIG.ROLES.TRAINER]);
    var p = payload || {};
    var sessionId = TM_Utils.sanitizeText(p.sessionId);
    var findingId = TM_Utils.sanitizeText(p.findingId);
    var idempotencyKey = TM_Utils.sanitizeText(p.idempotencyKey) || TM_Utils.generateId('IDEMP');
    var fileName = TM_Utils.sanitizeText(p.fileName) || ('finding-' + Date.now() + '.jpg');
    var mimeType = TM_Utils.sanitizeText(p.mimeType).toLowerCase();
    var comment = TM_Utils.sanitizeText(p.comment);
    var rawBase64 = String(p.base64Data || '');

    if (!sessionId || !findingId) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'SessionID dan FindingID wajib diisi.');
    }
    if (ALLOWED_MIMES.indexOf(mimeType) === -1) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Format foto harus JPG, JPEG, atau PNG.');
    }
    if (!rawBase64) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Data foto tidak boleh kosong.');
    }

    var cleanB64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
    var bytes = Utilities.base64Decode(cleanB64);
    if (!bytes || bytes.length === 0) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'File foto tidak valid.');
    }
    if (bytes.length > TM_CONFIG.DEFAULTS.MAX_PHOTO_COMPRESSED_BYTES) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Ukuran foto hasil kompresi melebihi batas maksimal 1 MB.');
    }

    return TM_Db.withLock(function () {
      // Cek idempotency agar retry tidak membuat duplikasi
      var existingByKey = TM_Db.findRecord('Photos', function (ph) {
        return ph.IdempotencyKey === idempotencyKey && ph.Status === 'Berhasil' && !ph.DeletedAt;
      });
      if (existingByKey) {
        return existingByKey;
      }

      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      var finding = TM_Db.findById('Findings', 'FindingID', findingId);
      if (finding && finding.SessionID !== sessionId) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Temuan tidak termasuk dalam sesi ini.');
      }
      assertCanModifyFindingPhotos(ctx, session, finding);

      var activePhotos = TM_Db.filterRecords('Photos', function (ph) {
        return ph.FindingID === findingId && !ph.DeletedAt && ph.Status === 'Berhasil';
      });
      if (activePhotos.length >= TM_CONFIG.DEFAULTS.MAX_PHOTOS_PER_FINDING) {
        throw TM_Utils.AppError('ERR_PHOTO_LIMIT', 'Maksimal ' + TM_CONFIG.DEFAULTS.MAX_PHOTOS_PER_FINDING + ' foto per temuan.');
      }

      var activeFolderId = TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ACTIVE_ID);
      if (!activeFolderId) {
        throw TM_Utils.AppError('ERR_CONFIG', 'Folder Drive ActivePhotos belum terkonfigurasi.');
      }

      var normMime = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
      var blob = Utilities.newBlob(bytes, normMime, fileName);
      var folder = DriveApp.getFolderById(activeFolderId);
      var driveFile = folder.createFile(blob);
      setPrivateFileSharing(driveFile);

      var ts = TM_Utils.formatWibIso();
      var photoRec = {
        PhotoID: TM_Utils.generateId('PHT'),
        FindingID: findingId,
        SessionID: sessionId,
        DriveFileID: driveFile.getId(),
        FileName: fileName,
        MimeType: normMime,
        FileSize: String(bytes.length),
        PhotoComment: comment,
        Status: 'Berhasil',
        IdempotencyKey: idempotencyKey,
        UploadedAt: ts,
        UploadedBy: ctx.user.UserID,
        DeletedAt: '',
        DeletedBy: '',
        PurgeReason: '',
        PurgedAt: ''
      };

      TM_Db.insertRecord('Photos', photoRec);

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'PHOTO_UPLOADED',
        entityType: 'Photos',
        entityId: photoRec.PhotoID,
        afterData: { findingId: findingId, sessionId: sessionId, fileName: fileName, fileSize: bytes.length },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Mengunggah foto bukti untuk temuan ' + findingId
      });

      return photoRec;
    });
  }

  function updatePhotoComment(token, photoId, comment) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN, TM_CONFIG.ROLES.TRAINER]);
    var photo = TM_Db.findById('Photos', 'PhotoID', photoId);
    if (!photo || photo.DeletedAt) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Foto tidak ditemukan.');
    }
    var session = TM_Db.findById('Sessions', 'SessionID', photo.SessionID);
    var finding = TM_Db.findById('Findings', 'FindingID', photo.FindingID);
    assertCanModifyFindingPhotos(ctx, session, finding);

    var cleanComment = TM_Utils.sanitizeText(comment);
    var updated = TM_Db.updateRecordById('Photos', 'PhotoID', photoId, function (rec) {
      rec.PhotoComment = cleanComment;
      return rec;
    });

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'PHOTO_COMMENT_UPDATED',
      entityType: 'Photos',
      entityId: photoId,
      beforeData: { comment: photo.PhotoComment },
      afterData: { comment: cleanComment },
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Memperbarui komentar foto ' + photoId
    });

    return updated;
  }

  function deletePhoto(token, photoId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN, TM_CONFIG.ROLES.TRAINER]);
    return TM_Db.withLock(function () {
      var photo = TM_Db.findById('Photos', 'PhotoID', photoId);
      if (!photo || photo.DeletedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Foto tidak ditemukan.');
      }
      var session = TM_Db.findById('Sessions', 'SessionID', photo.SessionID);
      var finding = TM_Db.findById('Findings', 'FindingID', photo.FindingID);
      assertCanModifyFindingPhotos(ctx, session, finding);

      // Jika sesi sudah Selesai, pastikan minimal masih ada 1 foto tersisa setelah hapus
      if (session.Status === TM_CONFIG.SESSION_STATUS.SELESAI) {
        var remaining = TM_Db.filterRecords('Photos', function (ph) {
          return ph.FindingID === photo.FindingID && !ph.DeletedAt && ph.Status === 'Berhasil' && ph.PhotoID !== photoId;
        });
        if (remaining.length === 0) {
          throw TM_Utils.AppError('ERR_VALIDATION', 'Temuan aktif pada sesi Selesai wajib memiliki minimal 1 foto.');
        }
      }

      var ts = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Photos', 'PhotoID', photoId, function (rec) {
        rec.DeletedAt = ts;
        rec.DeletedBy = ctx.user.UserID;
        return rec;
      });

      var archiveFolderId = TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ARCHIVE_ID);
      moveFileToFolder(photo.DriveFileID, archiveFolderId);

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'PHOTO_ARCHIVED',
        entityType: 'Photos',
        entityId: photoId,
        afterData: { findingId: photo.FindingID, sessionId: photo.SessionID },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Memindahkan foto ke arsip: ' + photo.FileName
      });

      return updated;
    });
  }

  function archivePhotosForFinding(findingId, actorUserId) {
    var ts = TM_Utils.formatWibIso();
    var archiveFolderId = TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ARCHIVE_ID);
    var photos = TM_Db.filterRecords('Photos', function (ph) {
      return ph.FindingID === findingId && !ph.DeletedAt;
    });
    for (var i = 0; i < photos.length; i++) {
      TM_Db.updateRecordById('Photos', 'PhotoID', photos[i].PhotoID, function (rec) {
        rec.DeletedAt = ts;
        rec.DeletedBy = actorUserId;
        return rec;
      });
      moveFileToFolder(photos[i].DriveFileID, archiveFolderId);
    }
  }

  function restorePhotosForFinding(findingId) {
    var activeFolderId = TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ACTIVE_ID);
    var photos = TM_Db.filterRecords('Photos', function (ph) {
      return ph.FindingID === findingId && ph.DeletedAt && !ph.PurgedAt;
    });
    for (var i = 0; i < photos.length; i++) {
      TM_Db.updateRecordById('Photos', 'PhotoID', photos[i].PhotoID, function (rec) {
        rec.DeletedAt = '';
        rec.DeletedBy = '';
        return rec;
      });
      moveFileToFolder(photos[i].DriveFileID, activeFolderId);
    }
  }

  function assertCanReadPhoto(ctx, photo, session, finding) {
    if (ctx.user.Role === TM_CONFIG.ROLES.SUPER_ADMIN) {
      return;
    }
    if (!session || session.DeletedAt || session.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Foto tidak dapat diakses karena sesi telah dihapus.');
    }
    if (!finding || finding.DeletedAt || photo.DeletedAt) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Foto tidak tersedia.');
    }
    if (session.Status === TM_CONFIG.SESSION_STATUS.DRAFT) {
      if (ctx.user.Role === TM_CONFIG.ROLES.TRAINER && session.TrainerID === ctx.user.UserID) {
        return;
      }
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Draft milik Trainer lain bersifat privat.');
    }
    if (session.Status === TM_CONFIG.SESSION_STATUS.SELESAI) {
      // Baik TRAINER maupun MANAJEMEN berhak melihat/mengunduh foto sesi Selesai
      return;
    }
    throw TM_Utils.AppError('ERR_FORBIDDEN', 'Akses foto ditolak.');
  }

  function getPhotoData(token, photoId, isDownload) {
    var ctx = TM_Auth.requireAuth(token);
    var photo = TM_Db.findById('Photos', 'PhotoID', photoId);
    if (!photo || photo.PurgedAt) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Foto tidak ditemukan.');
    }
    var session = TM_Db.findById('Sessions', 'SessionID', photo.SessionID);
    var finding = TM_Db.findById('Findings', 'FindingID', photo.FindingID);
    assertCanReadPhoto(ctx, photo, session, finding);

    var file = DriveApp.getFileById(photo.DriveFileID);
    var blob = file.getBlob();
    var mime = photo.MimeType || blob.getContentType() || 'image/jpeg';
    var dataUrl = 'data:' + mime + ';base64,' + Utilities.base64Encode(blob.getBytes());

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: isDownload ? 'PHOTO_DOWNLOADED' : 'PHOTO_VIEWED',
      entityType: 'Photos',
      entityId: photoId,
      afterData: { sessionId: photo.SessionID, findingId: photo.FindingID, fileName: photo.FileName },
      deviceInfo: ctx.session.DeviceInfo,
      description: (isDownload ? 'Mengunduh' : 'Membuka') + ' foto privat ' + photo.FileName
    });

    return {
      PhotoID: photo.PhotoID,
      FindingID: photo.FindingID,
      SessionID: photo.SessionID,
      FileName: photo.FileName,
      MimeType: mime,
      PhotoComment: photo.PhotoComment,
      dataUrl: dataUrl
    };
  }

  return {
    uploadPhoto: uploadPhoto,
    updatePhotoComment: updatePhotoComment,
    deletePhoto: deletePhoto,
    archivePhotosForFinding: archivePhotosForFinding,
    restorePhotosForFinding: restorePhotosForFinding,
    getPhotoData: getPhotoData
  };
})();



/* ==================== FILE: Dashboard.gs ==================== */
/**
 * Dashboard.gs — Mesin analitik Dashboard, Global Multi-Select Filter, 4 KPI, & Recurring Issue.
 */

var TM_Dashboard = (function () {
  function toStrArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val.map(function (x) { return TM_Utils.sanitizeText(x); }).filter(Boolean);
    }
    var s = TM_Utils.sanitizeText(val);
    return s ? [s] : [];
  }

  function buildCanonicalOutletResolver(outlets) {
    var map = {};
    for (var i = 0; i < outlets.length; i++) {
      map[outlets[i].OutletID] = outlets[i];
    }
    return function resolve(outletId, fallbackName) {
      var visited = {};
      var curr = map[outletId];
      while (curr && curr.MergedIntoOutletID && !visited[curr.OutletID]) {
        visited[curr.OutletID] = true;
        var next = map[curr.MergedIntoOutletID];
        if (!next) break;
        curr = next;
      }
      if (curr) {
        return {
          OutletID: curr.OutletID,
          OutletCode: curr.OutletCode || '',
          CanonicalName: curr.CanonicalName || fallbackName || curr.OutletID
        };
      }
      return {
        OutletID: outletId || 'UNKNOWN',
        OutletCode: '',
        CanonicalName: fallbackName || outletId || 'Unknown Outlet'
      };
    };
  }

  function getFilterOptions(token) {
    TM_Auth.requireAuth(token);
    var outlets = TM_Db.getAllRecords('Outlets').filter(function (o) {
      return !o.MergedIntoOutletID && o.Status !== TM_CONFIG.STATUS.INACTIVE;
    });
    var users = TM_Db.getAllRecords('Users').filter(function (u) {
      return u.Role === TM_CONFIG.ROLES.TRAINER || u.Role === TM_CONFIG.ROLES.SUPER_ADMIN;
    });
    var ams = TM_Db.getAllRecords('Master_AM');
    var mums = TM_Db.getAllRecords('Master_MUM');
    var categories = TM_Db.getAllRecords('Categories');
    var sections = TM_Db.getAllRecords('Sections');

    return {
      outlets: outlets.map(function (o) {
        return { id: o.OutletID, code: o.OutletCode, name: o.CanonicalName };
      }),
      trainers: users.map(function (u) {
        return { id: u.UserID, name: u.Name, username: u.Username };
      }),
      ams: ams.map(function (a) { return { id: a.AM_ID, name: a.AM_Name, status: a.Status }; }),
      mums: mums.map(function (m) { return { id: m.MUM_ID, name: m.MUM_Name, status: m.Status }; }),
      categories: categories.map(function (c) { return { id: c.CategoryID, name: c.CategoryName, status: c.Status }; }),
      sections: sections.map(function (s) { return { id: s.SectionID, name: s.SectionName, status: s.Status }; })
    };
  }

  function computeDashboardDataset(filters) {
    var f = filters || {};
    var dateFrom = TM_Utils.normalizeDateStr(f.dateFrom) || TM_Utils.sanitizeText(f.dateFrom);
    var dateTo = TM_Utils.normalizeDateStr(f.dateTo) || TM_Utils.sanitizeText(f.dateTo);
    var outletIds = toStrArray(f.outletIds);
    var trainerIds = toStrArray(f.trainerIds);
    var amIds = toStrArray(f.amIds);
    var mumIds = toStrArray(f.mumIds);
    var categoryIds = toStrArray(f.categoryIds);
    var sectionIds = toStrArray(f.sectionIds);
    var hasFindingLevelFilter = categoryIds.length > 0 || sectionIds.length > 0;

    var outlets = TM_Db.getAllRecords('Outlets');
    var resolveCanonical = buildCanonicalOutletResolver(outlets);

    var users = TM_Db.getAllRecords('Users');
    var trainerNameById = {};
    for (var u = 0; u < users.length; u++) {
      trainerNameById[users[u].UserID] = users[u].Name;
    }

    // 1. Ambil seluruh sesi Selesai yang tidak terhapus (Draft & soft-deleted dikeluarkan!)
    var allSessions = TM_Db.getAllRecords('Sessions');
    var candidateSessions = [];
    var sessionMap = {};

    for (var i = 0; i < allSessions.length; i++) {
      var s = allSessions[i];
      if (s.Status !== TM_CONFIG.SESSION_STATUS.SELESAI || s.DeletedAt) continue;
      var sDate = TM_Utils.normalizeDateStr(s.InspectionDate) || String(s.InspectionDate);
      if (dateFrom && sDate < dateFrom) continue;
      if (dateTo && sDate > dateTo) continue;
      if (trainerIds.length > 0 && trainerIds.indexOf(s.TrainerID) === -1) continue;
      if (amIds.length > 0 && amIds.indexOf(s.AM_ID) === -1) continue;
      if (mumIds.length > 0 && mumIds.indexOf(s.MUM_ID) === -1) continue;

      var canonical = resolveCanonical(s.OutletID, s.OutletNameSnapshot);
      if (outletIds.length > 0 && outletIds.indexOf(canonical.OutletID) === -1 && outletIds.indexOf(s.OutletID) === -1) {
        continue;
      }

      var enrichedSession = Object.assign({}, s, {
        CanonicalOutletID: canonical.OutletID,
        CanonicalOutletCode: canonical.OutletCode,
        CanonicalOutletName: canonical.CanonicalName,
        TrainerName: trainerNameById[s.TrainerID] || s.TrainerID
      });
      candidateSessions.push(enrichedSession);
      sessionMap[s.SessionID] = enrichedSession;
    }

    // 2. Ambil seluruh foto aktif
    var allPhotos = TM_Db.getAllRecords('Photos');
    var photosByFinding = {};
    for (var p = 0; p < allPhotos.length; p++) {
      var ph = allPhotos[p];
      if (ph.DeletedAt || ph.PurgedAt || ph.Status !== 'Berhasil') continue;
      if (!photosByFinding[ph.FindingID]) photosByFinding[ph.FindingID] = [];
      photosByFinding[ph.FindingID].push({
        PhotoID: ph.PhotoID,
        FindingID: ph.FindingID,
        SessionID: ph.SessionID,
        DriveFileID: ph.DriveFileID,
        FileName: ph.FileName,
        MimeType: ph.MimeType,
        FileSize: ph.FileSize,
        PhotoComment: ph.PhotoComment,
        Status: ph.Status,
        UploadedAt: ph.UploadedAt
      });
    }

    // 3. Ambil seluruh temuan aktif pada sesi kandidat yang lolos filter Category & Section
    var allFindings = TM_Db.getAllRecords('Findings');
    var matchedFindings = [];
    var findingsBySession = {};

    for (var j = 0; j < allFindings.length; j++) {
      var fnd = allFindings[j];
      if (fnd.DeletedAt) continue;
      var parentSes = sessionMap[fnd.SessionID];
      if (!parentSes) continue;
      if (categoryIds.length > 0 && categoryIds.indexOf(fnd.CategoryID) === -1) continue;
      if (sectionIds.length > 0 && sectionIds.indexOf(fnd.SectionID) === -1) continue;

      var enrichedFnd = Object.assign({}, fnd, {
        InspectionDate: parentSes.InspectionDate,
        ReportNumber: parentSes.ReportNumber,
        CanonicalOutletID: parentSes.CanonicalOutletID,
        CanonicalOutletCode: parentSes.CanonicalOutletCode,
        CanonicalOutletName: parentSes.CanonicalOutletName,
        OutletNameSnapshot: parentSes.OutletNameSnapshot,
        TrainerID: parentSes.TrainerID,
        TrainerName: parentSes.TrainerName,
        AM_ID: parentSes.AM_ID,
        AM_Name_Snapshot: parentSes.AM_Name_Snapshot,
        MUM_ID: parentSes.MUM_ID,
        MUM_Name_Snapshot: parentSes.MUM_Name_Snapshot,
        PIC_Name: parentSes.PIC_Name,
        Photos: photosByFinding[fnd.FindingID] || []
      });

      matchedFindings.push(enrichedFnd);
      if (!findingsBySession[fnd.SessionID]) findingsBySession[fnd.SessionID] = [];
      findingsBySession[fnd.SessionID].push(enrichedFnd);
    }

    // Jika filter Category/Section aktif, sesi yang dihitung adalah sesi yang memiliki minimal 1 temuan cocok;
    // jika tidak aktif, sesi Selesai tanpa temuan tetap dihitung (PRD 7.4 & 22.6).
    var matchedSessions = hasFindingLevelFilter
      ? candidateSessions.filter(function (s) { return Boolean(findingsBySession[s.SessionID]); })
      : candidateSessions;

    // 4. Hitung KPI & Recurring Issue (PRD 10.3 & 10.6)
    var uniqueOutletsMap = {};
    for (var m = 0; m < matchedSessions.length; m++) {
      uniqueOutletsMap[matchedSessions[m].CanonicalOutletID] = true;
    }

    var pairMap = {};
    for (var k = 0; k < matchedFindings.length; k++) {
      var item = matchedFindings[k];
      var pairKey = item.CanonicalOutletID + '::' + item.CategoryID;
      if (!pairMap[pairKey]) {
        pairMap[pairKey] = {
          pairKey: pairKey,
          canonicalOutletId: item.CanonicalOutletID,
          outletCode: item.CanonicalOutletCode,
          outletName: item.CanonicalOutletName,
          categoryId: item.CategoryID,
          categoryName: item.CategoryNameSnapshot,
          sessionsMap: {},
          findingCount: 0,
          lastInspectionDate: item.InspectionDate
        };
      }
      pairMap[pairKey].sessionsMap[item.SessionID] = item.InspectionDate;
      pairMap[pairKey].findingCount++;
      if (String(item.InspectionDate) > String(pairMap[pairKey].lastInspectionDate)) {
        pairMap[pairKey].lastInspectionDate = item.InspectionDate;
      }
    }

    var recurringIssues = [];
    var recurringAffectedOutlets = {};
    var pairKeys = Object.keys(pairMap);
    for (var pk = 0; pk < pairKeys.length; pk++) {
      var entry = pairMap[pairKeys[pk]];
      var sessionIds = Object.keys(entry.sessionsMap);
      // Definisi PRD 10.6: Kategori yang sama ditemukan minimal dalam 2 sesi pemeriksaan berbeda pada Outlet yang sama
      if (sessionIds.length >= 2) {
        recurringAffectedOutlets[entry.canonicalOutletId] = true;
        recurringIssues.push({
          canonicalOutletId: entry.canonicalOutletId,
          outletCode: entry.outletCode,
          outletName: entry.outletName,
          categoryId: entry.categoryId,
          categoryName: entry.categoryName,
          sessionCount: sessionIds.length,
          findingCount: entry.findingCount,
          lastInspectionDate: entry.lastInspectionDate,
          label: 'Perlu perhatian khusus'
        });
      }
    }

    recurringIssues.sort(function (a, b) {
      if (b.sessionCount !== a.sessionCount) return b.sessionCount - a.sessionCount;
      return b.findingCount - a.findingCount;
    });

    var kpi = {
      totalInspections: matchedSessions.length,
      totalActiveFindings: matchedFindings.length,
      inspectedOutlets: Object.keys(uniqueOutletsMap).length,
      recurringIssuesCount: recurringIssues.length,
      recurringAffectedOutletsCount: Object.keys(recurringAffectedOutlets).length
    };

    // 5. Grafik & Analisis (PRD 10.4 & 10.5)
    // 5a. Trend berdasarkan tanggal pemeriksaan
    var trendMap = {};
    for (var sIdx = 0; sIdx < matchedSessions.length; sIdx++) {
      var dStr = matchedSessions[sIdx].InspectionDate;
      if (!trendMap[dStr]) trendMap[dStr] = { date: dStr, sessionCount: 0, findingCount: 0 };
      trendMap[dStr].sessionCount++;
    }
    for (var fIdx = 0; fIdx < matchedFindings.length; fIdx++) {
      var fdStr = matchedFindings[fIdx].InspectionDate;
      if (!trendMap[fdStr]) trendMap[fdStr] = { date: fdStr, sessionCount: 0, findingCount: 0 };
      trendMap[fdStr].findingCount++;
    }
    var trendByDate = Object.keys(trendMap)
      .sort()
      .map(function (d) { return trendMap[d]; });

    // 5b. Top 10 Master Category
    var catAgg = {};
    for (var cIdx = 0; cIdx < matchedFindings.length; cIdx++) {
      var fc = matchedFindings[cIdx];
      if (!catAgg[fc.CategoryID]) {
        catAgg[fc.CategoryID] = {
          categoryId: fc.CategoryID,
          categoryName: fc.CategoryNameSnapshot,
          findingCount: 0,
          sessionsMap: {}
        };
      }
      catAgg[fc.CategoryID].findingCount++;
      catAgg[fc.CategoryID].sessionsMap[fc.SessionID] = true;
    }
    var topCategories = Object.keys(catAgg)
      .map(function (id) {
        return {
          categoryId: catAgg[id].categoryId,
          categoryName: catAgg[id].categoryName,
          findingCount: catAgg[id].findingCount,
          sessionCount: Object.keys(catAgg[id].sessionsMap).length
        };
      })
      .sort(function (a, b) { return b.findingCount - a.findingCount; })
      .slice(0, 10);

    // 5c. Top Section
    var secAgg = {};
    for (var scIdx = 0; scIdx < matchedFindings.length; scIdx++) {
      var fs = matchedFindings[scIdx];
      if (!secAgg[fs.SectionID]) {
        secAgg[fs.SectionID] = {
          sectionId: fs.SectionID,
          sectionName: fs.SectionNameSnapshot,
          findingCount: 0,
          sessionsMap: {}
        };
      }
      secAgg[fs.SectionID].findingCount++;
      secAgg[fs.SectionID].sessionsMap[fs.SessionID] = true;
    }
    var topSections = Object.keys(secAgg)
      .map(function (id) {
        return {
          sectionId: secAgg[id].sectionId,
          sectionName: secAgg[id].sectionName,
          findingCount: secAgg[id].findingCount,
          sessionCount: Object.keys(secAgg[id].sessionsMap).length
        };
      })
      .sort(function (a, b) { return b.findingCount - a.findingCount; });

    // 5d. Analisis Keseluruhan Top Issue (Pasangan Category + Section)
    var comboAgg = {};
    for (var cbIdx = 0; cbIdx < matchedFindings.length; cbIdx++) {
      var fcb = matchedFindings[cbIdx];
      var cbKey = fcb.CategoryID + '::' + fcb.SectionID;
      if (!comboAgg[cbKey]) {
        comboAgg[cbKey] = {
          categoryId: fcb.CategoryID,
          categoryName: fcb.CategoryNameSnapshot,
          sectionId: fcb.SectionID,
          sectionName: fcb.SectionNameSnapshot,
          findingCount: 0,
          sessionsMap: {},
          outletsMap: {}
        };
      }
      comboAgg[cbKey].findingCount++;
      comboAgg[cbKey].sessionsMap[fcb.SessionID] = true;
      comboAgg[cbKey].outletsMap[fcb.CanonicalOutletID] = true;
    }
    var overallTopIssues = Object.keys(comboAgg)
      .map(function (k2) {
        var row = comboAgg[k2];
        return {
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          sectionId: row.sectionId,
          sectionName: row.sectionName,
          findingCount: row.findingCount,
          sessionCount: Object.keys(row.sessionsMap).length,
          outletCount: Object.keys(row.outletsMap).length
        };
      })
      .sort(function (a, b) { return b.findingCount - a.findingCount; });

    // 5e. Top Issue per Outlet
    var outletAgg = {};
    for (var osIdx = 0; osIdx < matchedSessions.length; osIdx++) {
      var ms = matchedSessions[osIdx];
      var oid = ms.CanonicalOutletID;
      if (!outletAgg[oid]) {
        outletAgg[oid] = {
          canonicalOutletId: oid,
          outletCode: ms.CanonicalOutletCode,
          outletName: ms.CanonicalOutletName,
          sessionCount: 0,
          findingCount: 0,
          catCount: {},
          secCount: {}
        };
      }
      outletAgg[oid].sessionCount++;
    }
    for (var ofIdx = 0; ofIdx < matchedFindings.length; ofIdx++) {
      var mf = matchedFindings[ofIdx];
      var oid2 = mf.CanonicalOutletID;
      if (!outletAgg[oid2]) {
        outletAgg[oid2] = {
          canonicalOutletId: oid2,
          outletCode: mf.CanonicalOutletCode,
          outletName: mf.CanonicalOutletName,
          sessionCount: 0,
          findingCount: 0,
          catCount: {},
          secCount: {}
        };
      }
      outletAgg[oid2].findingCount++;
      outletAgg[oid2].catCount[mf.CategoryNameSnapshot] = (outletAgg[oid2].catCount[mf.CategoryNameSnapshot] || 0) + 1;
      outletAgg[oid2].secCount[mf.SectionNameSnapshot] = (outletAgg[oid2].secCount[mf.SectionNameSnapshot] || 0) + 1;
    }

    function pickTopKey(counterObj) {
      var keys = Object.keys(counterObj);
      if (keys.length === 0) return '-';
      keys.sort(function (a, b) { return counterObj[b] - counterObj[a]; });
      return keys[0] + ' (' + counterObj[keys[0]] + ')';
    }

    var topIssuesByOutlet = Object.keys(outletAgg)
      .map(function (oid3) {
        var oRow = outletAgg[oid3];
        return {
          canonicalOutletId: oRow.canonicalOutletId,
          outletCode: oRow.outletCode,
          outletName: oRow.outletName,
          sessionCount: oRow.sessionCount,
          findingCount: oRow.findingCount,
          topCategory: pickTopKey(oRow.catCount),
          topSection: pickTopKey(oRow.secCount)
        };
      })
      .sort(function (a, b) {
        if (b.findingCount !== a.findingCount) return b.findingCount - a.findingCount;
        return b.sessionCount - a.sessionCount;
      });

    // 5f. Analisis berdasarkan AM & MUM
    var amAgg = {};
    var mumAgg = {};
    for (var amIdx = 0; amIdx < matchedSessions.length; amIdx++) {
      var sesRow = matchedSessions[amIdx];
      var aKey = sesRow.AM_ID || 'UNASSIGNED';
      if (!amAgg[aKey]) {
        amAgg[aKey] = { amId: sesRow.AM_ID, amName: sesRow.AM_Name_Snapshot || '-', sessionCount: 0, findingCount: 0, outletsMap: {} };
      }
      amAgg[aKey].sessionCount++;
      amAgg[aKey].outletsMap[sesRow.CanonicalOutletID] = true;

      var mKey = sesRow.MUM_ID || 'UNASSIGNED';
      if (!mumAgg[mKey]) {
        mumAgg[mKey] = { mumId: sesRow.MUM_ID, mumName: sesRow.MUM_Name_Snapshot || '-', sessionCount: 0, findingCount: 0, outletsMap: {} };
      }
      mumAgg[mKey].sessionCount++;
      mumAgg[mKey].outletsMap[sesRow.CanonicalOutletID] = true;
    }
    for (var afIdx = 0; afIdx < matchedFindings.length; afIdx++) {
      var fRow = matchedFindings[afIdx];
      var aKey2 = fRow.AM_ID || 'UNASSIGNED';
      if (amAgg[aKey2]) amAgg[aKey2].findingCount++;
      var mKey2 = fRow.MUM_ID || 'UNASSIGNED';
      if (mumAgg[mKey2]) mumAgg[mKey2].findingCount++;
    }

    var analysisByAM = Object.keys(amAgg).map(function (k3) {
      return {
        amId: amAgg[k3].amId,
        amName: amAgg[k3].amName,
        sessionCount: amAgg[k3].sessionCount,
        findingCount: amAgg[k3].findingCount,
        outletCount: Object.keys(amAgg[k3].outletsMap).length
      };
    }).sort(function (a, b) { return b.findingCount - a.findingCount; });

    var analysisByMUM = Object.keys(mumAgg).map(function (k4) {
      return {
        mumId: mumAgg[k4].mumId,
        mumName: mumAgg[k4].mumName,
        sessionCount: mumAgg[k4].sessionCount,
        findingCount: mumAgg[k4].findingCount,
        outletCount: Object.keys(mumAgg[k4].outletsMap).length
      };
    }).sort(function (a, b) { return b.findingCount - a.findingCount; });

    // 6. Detail Pemeriksaan (Sesi beserta temuan & foto yang lolos filter)
    var detailedSessions = matchedSessions.slice().sort(function (a, b) {
      var cmp = String(b.InspectionDate).localeCompare(String(a.InspectionDate));
      if (cmp !== 0) return cmp;
      return String(b.SubmittedAt).localeCompare(String(a.SubmittedAt));
    }).map(function (sRow) {
      return Object.assign({}, sRow, {
        Findings: findingsBySession[sRow.SessionID] || []
      });
    });

    return {
      kpi: kpi,
      trendByDate: trendByDate,
      topCategories: topCategories,
      topSections: topSections,
      overallTopIssues: overallTopIssues,
      topIssuesByOutlet: topIssuesByOutlet,
      analysisByAM: analysisByAM,
      analysisByMUM: analysisByMUM,
      recurringIssues: recurringIssues,
      detailedSessions: detailedSessions,
      matchedFindings: matchedFindings
    };
  }

  function getDashboardData(token, filters) {
    TM_Auth.requireAuth(token);
    var result = computeDashboardDataset(filters);
    return {
      kpi: result.kpi,
      trendByDate: result.trendByDate,
      topCategories: result.topCategories,
      topSections: result.topSections,
      overallTopIssues: result.overallTopIssues,
      topIssuesByOutlet: result.topIssuesByOutlet,
      analysisByAM: result.analysisByAM,
      analysisByMUM: result.analysisByMUM,
      recurringIssues: result.recurringIssues,
      detailedSessions: result.detailedSessions
    };
  }

  return {
    getFilterOptions: getFilterOptions,
    computeDashboardDataset: computeDashboardDataset,
    getDashboardData: getDashboardData
  };
})();



/* ==================== FILE: Drafts.gs ==================== */
/**
 * Drafts.gs — Monitoring Draft Super Admin, Detail 3-Tab Read-Only, Penghapusan Draft oleh Admin,
 * Permintaan Pemulihan (7x24 jam), Locking Persetujuan/Penolakan, & Pemulihan Draft.
 */

var TM_Drafts = (function () {
  var DAY_MS = 24 * 3600000;

  function createInAppNotification(userId, type, title, message, relatedEntityId, metadataObj) {
    if (typeof TM_Notifications !== 'undefined' && TM_Notifications.dispatchNotification) {
      return TM_Notifications.dispatchNotification({
        userId: userId,
        type: type,
        title: title,
        message: message,
        relatedEntityId: relatedEntityId || '',
        metadata: metadataObj || {}
      });
    }
    var ts = TM_Utils.formatWibIso();
    var rec = {
      NotificationID: TM_Utils.generateId('NTF'),
      UserID: userId,
      Type: type,
      Title: title,
      Message: message,
      RelatedEntityID: relatedEntityId || '',
      MetadataJSON: metadataObj ? JSON.stringify(metadataObj) : '',
      ReadAt: '',
      CreatedAt: ts
    };
    return TM_Db.insertRecord('Notifications', rec);
  }

  function computeDraftAgeInfo(createdAtStr, nowMs) {
    var createdMs = new Date(createdAtStr).getTime();
    var diffMs = isNaN(createdMs) ? 0 : Math.max(0, nowMs - createdMs);
    var daysFloat = diffMs / DAY_MS;
    var bucket = 'UNDER_3_DAYS';
    if (daysFloat > 7) {
      bucket = 'OVER_7_DAYS';
    } else if (daysFloat >= 3) {
      bucket = '3_TO_7_DAYS';
    }
    var totalHours = Math.floor(diffMs / 3600000);
    var days = Math.floor(totalHours / 24);
    var remHours = totalHours % 24;
    var relativeText = days > 0
      ? (days + ' hari ' + remHours + ' jam')
      : (totalHours > 0 ? (totalHours + ' jam') : (Math.max(1, Math.floor(diffMs / 60000)) + ' menit'));

    return {
      ageMs: diffMs,
      ageDays: Number(daysFloat.toFixed(2)),
      ageBucket: bucket,
      relativeAge: relativeText
    };
  }

  function getActiveDraftsCount(token) {
    var ctx = TM_Auth.requireAuth(token);
    if (ctx.user.Role !== TM_CONFIG.ROLES.SUPER_ADMIN) {
      return { totalActiveDrafts: 0 };
    }
    var drafts = TM_Db.filterRecords('Sessions', function (s) {
      return s.Status === TM_CONFIG.SESSION_STATUS.DRAFT && !s.DeletedAt;
    });
    return { totalActiveDrafts: drafts.length };
  }

  function listMonitoringDrafts(token, filters) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var f = filters || {};
    var trainerFilter = TM_Utils.sanitizeText(f.trainerId);
    var createdFrom = TM_Utils.sanitizeText(f.createdDateFrom);
    var createdTo = TM_Utils.sanitizeText(f.createdDateTo);
    var search = TM_Utils.sanitizeText(f.search).toLowerCase();

    var users = TM_Db.getAllRecords('Users');
    var userMap = {};
    for (var u = 0; u < users.length; u++) {
      userMap[users[u].UserID] = users[u];
    }

    var allFindings = TM_Db.getAllRecords('Findings');
    var findingCountMap = {};
    for (var i = 0; i < allFindings.length; i++) {
      if (!allFindings[i].DeletedAt) {
        var sid = allFindings[i].SessionID;
        findingCountMap[sid] = (findingCountMap[sid] || 0) + 1;
      }
    }

    var allActiveDrafts = TM_Db.filterRecords('Sessions', function (s) {
      return s.Status === TM_CONFIG.SESSION_STATUS.DRAFT && !s.DeletedAt;
    });

    var nowMs = TM_Utils.now().getTime();
    var summary = {
      totalActiveDrafts: allActiveDrafts.length,
      under3Days: 0,
      days3To7: 0,
      over7Days: 0,
      uniqueTrainers: 0
    };
    var trainerSet = {};

    var enrichedAll = allActiveDrafts.map(function (d) {
      var age = computeDraftAgeInfo(d.CreatedAt, nowMs);
      if (age.ageBucket === 'UNDER_3_DAYS') summary.under3Days++;
      else if (age.ageBucket === '3_TO_7_DAYS') summary.days3To7++;
      else summary.over7Days++;
      trainerSet[d.TrainerID] = true;

      var trainer = userMap[d.TrainerID];
      var trainerName = trainer ? trainer.Name : d.TrainerID;
      return Object.assign({}, d, {
        TrainerName: trainerName,
        TrainerUsername: trainer ? trainer.Username : '',
        FindingCount: findingCountMap[d.SessionID] || 0,
        AgeBucket: age.ageBucket,
        AgeDays: age.ageDays,
        RelativeAge: age.relativeAge
      });
    });

    summary.uniqueTrainers = Object.keys(trainerSet).length;

    var filtered = enrichedAll.filter(function (d) {
      if (trainerFilter && d.TrainerID !== trainerFilter) return false;
      var createdDate = String(d.CreatedAt || '').slice(0, 10);
      if (createdFrom && createdDate < createdFrom) return false;
      if (createdTo && createdDate > createdTo) return false;
      if (search) {
        var hay = (d.TrainerName + ' ' + d.TrainerUsername + ' ' + (d.OutletNameSnapshot || '')).toLowerCase();
        if (hay.indexOf(search) === -1) return false;
      }
      return true;
    });

    // Terbaru di atas berdasarkan CreatedAt (PRD 7.5)
    filtered.sort(function (a, b) {
      return String(b.CreatedAt).localeCompare(String(a.CreatedAt));
    });

    return {
      summary: summary,
      items: filtered
    };
  }

  function getMonitoringDraftDetail(token, sessionId) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
    if (!session) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Draft tidak ditemukan.');
    }

    var trainer = TM_Db.findById('Users', 'UserID', session.TrainerID);
    var age = computeDraftAgeInfo(session.CreatedAt, TM_Utils.now().getTime());

    var findings = TM_Db.filterRecords('Findings', function (f) {
      return f.SessionID === sessionId && !f.DeletedAt;
    });
    var photos = TM_Db.filterRecords('Photos', function (ph) {
      return ph.SessionID === sessionId && !ph.DeletedAt && !ph.PurgedAt;
    });

    var photosByFinding = {};
    for (var i = 0; i < photos.length; i++) {
      var fid = photos[i].FindingID;
      if (!photosByFinding[fid]) photosByFinding[fid] = [];
      photosByFinding[fid].push(photos[i]);
    }

    var findingsTab = findings.map(function (f) {
      var fPhotos = photosByFinding[f.FindingID] || [];
      var uploadedCount = fPhotos.filter(function (p) { return p.Status === 'Berhasil'; }).length;
      var isComplete = Boolean(
        f.CategoryID &&
        f.SectionID &&
        TM_Utils.sanitizeText(f.Masalah) &&
        TM_Utils.sanitizeText(f.Mengapa) &&
        uploadedCount >= 1
      );
      return Object.assign({}, f, {
        PhotoCount: fPhotos.length,
        UploadedPhotoCount: uploadedCount,
        IsComplete: isComplete
      });
    });

    return {
      readOnly: true,
      inspectionInfo: Object.assign({}, session, {
        TrainerName: trainer ? trainer.Name : session.TrainerID,
        TrainerUsername: trainer ? trainer.Username : '',
        RelativeAge: age.relativeAge,
        AgeDays: age.ageDays
      }),
      findings: findingsTab,
      photos: photos
    };
  }

  function adminDeleteDraft(token, sessionId, reason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var delReason = TM_Utils.sanitizeText(reason);
    if (!delReason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan penghapusan Draft wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Draft tidak ditemukan.');
      }
      if (session.DeletedAt || session.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Draft ini sudah dalam status terhapus.');
      }
      if (session.Status !== TM_CONFIG.SESSION_STATUS.DRAFT) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Sesi ini sudah selesai; gunakan fungsi hapus sesi pemeriksaan.');
      }

      var before = Object.assign({}, session);
      var ts = TM_Utils.formatWibIso();
      var nextVersion = String(parseInt(session.Version || '1', 10) + 1);

      var updated = TM_Db.updateRecordById('Sessions', 'SessionID', sessionId, function (rec) {
        rec.Status = TM_CONFIG.SESSION_STATUS.DELETED;
        rec.Version = nextVersion;
        rec.DeletedAt = ts;
        rec.DeletedBy = ctx.user.UserID;
        rec.DeleteReason = delReason;
        rec.UpdatedAt = ts;
        return rec;
      });

      // Soft-delete temuan & arsipkan foto server yang sudah masuk
      var findings = TM_Db.filterRecords('Findings', function (f) {
        return f.SessionID === sessionId && !f.DeletedAt;
      });
      for (var i = 0; i < findings.length; i++) {
        TM_Db.updateRecordById('Findings', 'FindingID', findings[i].FindingID, function (rec) {
          rec.DeletedAt = ts;
          rec.DeletedBy = ctx.user.UserID;
          rec.DeleteReason = 'Draft dihapus Super Admin: ' + delReason;
          rec.DeletionSource = 'ADMIN_DRAFT_DELETE';
          return rec;
        });
        TM_Photos.archivePhotosForFinding(findings[i].FindingID, ctx.user.UserID);
      }

      // Periksa metadata sinkronisasi jika ada data lokal tertahan
      var syncMeta = TM_Db.findRecord('SyncMetadata', function (sm) {
        return sm.SessionID === sessionId;
      });
      var hasUnsyncedLocal = Boolean(
        syncMeta &&
        (syncMeta.SyncStatus === 'PENDING' || parseInt(syncMeta.LocalVersion || '0', 10) > parseInt(syncMeta.ServerVersion || '0', 10))
      );

      if (syncMeta) {
        TM_Db.updateRecordById('SyncMetadata', 'SyncID', syncMeta.SyncID, function (rec) {
          rec.SyncStatus = 'DELETED_LOCKED';
          rec.LastSyncAt = ts;
          return rec;
        });
      }

      // Kirim notifikasi in-app ke Trainer pemilik Draft (PRD 7.8)
      var outletLabel = session.OutletNameSnapshot || 'Outlet belum diisi';
      var msg =
        'Draft "' + sessionId + '" (' + outletLabel + ', Tanggal: ' + session.InspectionDate + ') telah dihapus oleh Super Admin ' +
        ctx.user.Name + ' pada ' + ts + '. Alasan: ' + delReason + '.' +
        (hasUnsyncedLocal ? ' Terdapat data lokal yang belum tersinkronisasi dan telah dikunci di perangkat asal.' : '');

      var notification = createInAppNotification(
        session.TrainerID,
        'DRAFT_DELETED_BY_ADMIN',
        'Draft Pemeriksaan Dihapus oleh Super Admin',
        msg,
        sessionId,
        {
          sessionId: sessionId,
          outletName: outletLabel,
          inspectionDate: session.InspectionDate,
          deletedAt: ts,
          deletedByAdminId: ctx.user.UserID,
          deletedByAdminName: ctx.user.Name,
          deleteReason: delReason,
          hasUnsyncedLocal: hasUnsyncedLocal
        }
      );

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'ADMIN_DRAFT_DELETED',
        entityType: 'Sessions',
        entityId: sessionId,
        beforeData: before,
        afterData: {
          deletedAt: ts,
          reason: delReason,
          hasUnsyncedLocal: hasUnsyncedLocal,
          notificationId: notification.NotificationID
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Super Admin menghapus Draft ' + sessionId + ' milik Trainer ' + session.TrainerID + ': ' + delReason
      });

      return {
        session: updated,
        notification: notification
      };
    });
  }

  function listMyDeletedDrafts(token) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var nowMs = TM_Utils.now().getTime();
    var windowMs = TM_CONFIG.DEFAULTS.RESTORE_REQUEST_WINDOW_DAYS * DAY_MS;

    var deletedSessions = TM_Db.filterRecords('Sessions', function (s) {
      return (
        s.TrainerID === ctx.user.UserID &&
        s.DeletedAt &&
        !s.SubmittedAt &&
        s.DeletedBy !== ctx.user.UserID
      );
    });

    var requests = TM_Db.filterRecords('DraftRestoreRequests', function (r) {
      return r.TrainerID === ctx.user.UserID;
    });
    var latestReqBySession = {};
    for (var i = 0; i < requests.length; i++) {
      var req = requests[i];
      var prev = latestReqBySession[req.SessionID];
      if (!prev || String(req.RequestedAt) > String(prev.RequestedAt)) {
        latestReqBySession[req.SessionID] = req;
      }
    }

    var users = TM_Db.getAllRecords('Users');
    var userMap = {};
    for (var u = 0; u < users.length; u++) {
      userMap[users[u].UserID] = users[u].Name;
    }

    return deletedSessions.map(function (s) {
      var delMs = new Date(s.DeletedAt).getTime();
      var withinWindow = !isNaN(delMs) && (nowMs - delMs) <= windowMs;
      var reqRec = latestReqBySession[s.SessionID] || null;
      var canRequest = withinWindow && (!reqRec);
      return Object.assign({}, s, {
        DeletedByName: userMap[s.DeletedBy] || s.DeletedBy,
        Within7DaysWindow: withinWindow,
        CanRequestRestore: canRequest,
        RestoreRequest: reqRec
      });
    }).sort(function (a, b) {
      return String(b.DeletedAt).localeCompare(String(a.DeletedAt));
    });
  }

  function requestDraftRestore(token, sessionId, requestReason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var reason = TM_Utils.sanitizeText(requestReason);
    if (!reason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan pengajuan pemulihan wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
      if (!session || !session.DeletedAt || session.SubmittedAt) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Draft terhapus tidak ditemukan.');
      }
      if (session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda hanya dapat mengajukan pemulihan untuk Draft milik Anda sendiri.');
      }
      if (session.DeletedBy === ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_VALIDATION', 'Draft yang dihapus sendiri oleh Trainer tidak melalui mekanisme pemulihan Super Admin.');
      }

      var nowMs = TM_Utils.now().getTime();
      var deletedMs = new Date(session.DeletedAt).getTime();
      var windowMs = TM_CONFIG.DEFAULTS.RESTORE_REQUEST_WINDOW_DAYS * DAY_MS;
      if (isNaN(deletedMs) || (nowMs - deletedMs) > windowMs) {
        throw TM_Utils.AppError('ERR_RESTORE_WINDOW_EXPIRED', 'Batas waktu pengajuan pemulihan 7 × 24 jam sejak penghapusan telah berakhir.');
      }

      var existingReq = TM_Db.findRecord('DraftRestoreRequests', function (r) {
        return r.SessionID === sessionId && (r.Status === 'Menunggu' || r.Status === 'Disetujui');
      });
      if (existingReq) {
        throw TM_Utils.AppError('ERR_DUPLICATE_REQUEST', 'Permintaan pemulihan untuk Draft ini sudah pernah diajukan.');
      }

      var ts = TM_Utils.formatWibIso();
      var reqRecord = {
        RequestID: TM_Utils.generateId('DRR'),
        SessionID: sessionId,
        TrainerID: ctx.user.UserID,
        RequestReason: reason,
        Status: 'Menunggu',
        RequestedAt: ts,
        ProcessedBy: '',
        ProcessedAt: '',
        DecisionReason: ''
      };
      TM_Db.insertRecord('DraftRestoreRequests', reqRecord);

      // PRD 7.9: Setiap permintaan baru mengirim 1 notifikasi kepada semua Super Admin aktif (status baca masing-masing)
      var activeAdmins = TM_Db.filterRecords('Users', function (u) {
        return u.Role === TM_CONFIG.ROLES.SUPER_ADMIN && u.Status === TM_CONFIG.STATUS.ACTIVE;
      });
      for (var i = 0; i < activeAdmins.length; i++) {
        createInAppNotification(
          activeAdmins[i].UserID,
          'DRAFT_RESTORE_REQUESTED',
          'Permintaan Pemulihan Draft Baru',
          'Trainer ' + ctx.user.Name + ' mengajukan pemulihan untuk Draft ' + sessionId +
            ' (' + (session.OutletNameSnapshot || 'Outlet belum diisi') + '). Alasan: ' + reason,
          reqRecord.RequestID,
          {
            requestId: reqRecord.RequestID,
            sessionId: sessionId,
            trainerId: ctx.user.UserID,
            trainerName: ctx.user.Name,
            requestReason: reason
          }
        );
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'DRAFT_RESTORE_REQUESTED',
        entityType: 'DraftRestoreRequests',
        entityId: reqRecord.RequestID,
        afterData: reqRecord,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Trainer mengajukan pemulihan Draft ' + sessionId + ': ' + reason
      });

      return reqRecord;
    });
  }

  function listDraftRestoreRequests(token) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var requests = TM_Db.getAllRecords('DraftRestoreRequests');
    var users = TM_Db.getAllRecords('Users');
    var sessions = TM_Db.getAllRecords('Sessions');

    var userMap = {};
    for (var i = 0; i < users.length; i++) userMap[users[i].UserID] = users[i].Name;
    var sesMap = {};
    for (var j = 0; j < sessions.length; j++) sesMap[sessions[j].SessionID] = sessions[j];

    var enriched = requests.map(function (r) {
      var s = sesMap[r.SessionID] || {};
      return Object.assign({}, r, {
        TrainerName: userMap[r.TrainerID] || r.TrainerID,
        ProcessedByName: r.ProcessedBy ? (userMap[r.ProcessedBy] || r.ProcessedBy) : '',
        OutletName: s.OutletNameSnapshot || 'Outlet belum diisi',
        InspectionDate: s.InspectionDate || '',
        DeleteReason: s.DeleteReason || ''
      });
    });

    // PRD 7.9: Setiap kelompok diurutkan dari permintaan terlama (RequestedAt ascending)
    function sortOldestFirst(arr) {
      return arr.slice().sort(function (a, b) {
        return String(a.RequestedAt).localeCompare(String(b.RequestedAt));
      });
    }

    return {
      menunggu: sortOldestFirst(enriched.filter(function (x) { return x.Status === 'Menunggu'; })),
      disetujui: sortOldestFirst(enriched.filter(function (x) { return x.Status === 'Disetujui'; })),
      ditolak: sortOldestFirst(enriched.filter(function (x) { return x.Status === 'Ditolak'; }))
    };
  }

  function processDraftRestoreRequest(token, requestId, decision, decisionReason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var normDecision = TM_Utils.sanitizeText(decision);
    var reason = TM_Utils.sanitizeText(decisionReason);

    if (normDecision !== 'Disetujui' && normDecision !== 'Ditolak') {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Keputusan harus "Disetujui" atau "Ditolak".');
    }
    if (!reason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan keputusan (persetujuan maupun penolakan) wajib diisi.');
    }

    // PRD 7.9: Backend menggunakan locking untuk mencegah pemrosesan ganda oleh Super Admin lain
    return TM_Db.withLock(function () {
      var reqRec = TM_Db.findById('DraftRestoreRequests', 'RequestID', requestId);
      if (!reqRec) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Permintaan pemulihan tidak ditemukan.');
      }
      if (reqRec.Status !== 'Menunggu') {
        throw TM_Utils.AppError(
          'ERR_ALREADY_PROCESSED',
          'Permintaan ini sudah diproses sebelumnya dengan status "' + reqRec.Status + '".'
        );
      }

      var session = TM_Db.findById('Sessions', 'SessionID', reqRec.SessionID);
      if (!session) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Data sesi Draft tidak ditemukan.');
      }

      var ts = TM_Utils.formatWibIso();
      var updatedReq = TM_Db.updateRecordById('DraftRestoreRequests', 'RequestID', requestId, function (rec) {
        rec.Status = normDecision;
        rec.ProcessedBy = ctx.user.UserID;
        rec.ProcessedAt = ts;
        rec.DecisionReason = reason;
        return rec;
      });

      var restoredSession = null;
      if (normDecision === 'Disetujui') {
        // PRD 7.10: Label Dipulihkan tampil selama 7 x 24 jam
        var restoredUntil = TM_Utils.addHoursIso(TM_Utils.now(), 7 * 24);
        var nextVersion = String(parseInt(session.Version || '1', 10) + 1);

        restoredSession = TM_Db.updateRecordById('Sessions', 'SessionID', session.SessionID, function (rec) {
          rec.Status = TM_CONFIG.SESSION_STATUS.DRAFT;
          rec.Version = nextVersion;
          rec.IsRestoredFlagUntil = restoredUntil;
          rec.DeletedAt = '';
          rec.DeletedBy = '';
          rec.DeleteReason = '';
          rec.UpdatedAt = ts;
          return rec;
        });

        var findings = TM_Db.filterRecords('Findings', function (f) {
          return f.SessionID === session.SessionID && f.DeletedAt &&
                 (f.DeletionSource === 'ADMIN_DRAFT_DELETE' || f.DeletionSource === 'SESSION');
        });
        for (var i = 0; i < findings.length; i++) {
          TM_Db.updateRecordById('Findings', 'FindingID', findings[i].FindingID, function (rec) {
            rec.DeletedAt = '';
            rec.DeletedBy = '';
            rec.DeleteReason = '';
            rec.DeletionSource = '';
            return rec;
          });
          TM_Photos.restorePhotosForFinding(findings[i].FindingID);
        }
      }

      // Kirim notifikasi keputusan & alasan kepada Trainer (PRD 7.9 & 7.10)
      var notifTitle = normDecision === 'Disetujui'
        ? 'Permintaan Pemulihan Draft Disetujui'
        : 'Permintaan Pemulihan Draft Ditolak';
      var notifMsg = normDecision === 'Disetujui'
        ? ('Draft "' + session.SessionID + '" (' + (session.OutletNameSnapshot || 'Outlet belum diisi') + ') telah dipulihkan oleh Super Admin ' +
           ctx.user.Name + '. Alasan: ' + reason + '. Periksa kembali kelengkapan data dan foto sebelum melanjutkan.')
        : ('Permintaan pemulihan Draft "' + session.SessionID + '" ditolak oleh Super Admin ' + ctx.user.Name +
           '. Alasan: ' + reason + '. Data lokal terkait (jika ada) akan disimpan selama 30 × 24 jam sebelum dihapus otomatis.');

      createInAppNotification(
        reqRec.TrainerID,
        normDecision === 'Disetujui' ? 'DRAFT_RESTORE_APPROVED' : 'DRAFT_RESTORE_REJECTED',
        notifTitle,
        notifMsg,
        session.SessionID,
        {
          requestId: requestId,
          sessionId: session.SessionID,
          decision: normDecision,
          decisionReason: reason,
          processedBy: ctx.user.Name,
          processedAt: ts
        }
      );

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: normDecision === 'Disetujui' ? 'DRAFT_RESTORE_APPROVED' : 'DRAFT_RESTORE_REJECTED',
        entityType: 'DraftRestoreRequests',
        entityId: requestId,
        afterData: {
          sessionId: session.SessionID,
          decision: normDecision,
          decisionReason: reason
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Super Admin memproses permintaan pemulihan Draft ' + session.SessionID + ' (' + normDecision + '): ' + reason
      });

      return {
        request: updatedReq,
        session: restoredSession
      };
    });
  }

  function listMyNotifications(token) {
    var ctx = TM_Auth.requireAuth(token);
    var items = TM_Db.filterRecords('Notifications', function (n) {
      return n.UserID === ctx.user.UserID;
    });
    items.sort(function (a, b) {
      return String(b.CreatedAt).localeCompare(String(a.CreatedAt));
    });
    var unreadCount = items.filter(function (n) { return !n.ReadAt; }).length;
    return {
      items: items,
      unreadCount: unreadCount
    };
  }

  function markNotificationRead(token, notificationId) {
    var ctx = TM_Auth.requireAuth(token);
    var n = TM_Db.findById('Notifications', 'NotificationID', notificationId);
    if (!n || n.UserID !== ctx.user.UserID) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Notifikasi tidak ditemukan.');
    }
    if (n.ReadAt) return n;
    var ts = TM_Utils.formatWibIso();
    return TM_Db.updateRecordById('Notifications', 'NotificationID', notificationId, function (rec) {
      rec.ReadAt = ts;
      return rec;
    });
  }

  return {
    createInAppNotification: createInAppNotification,
    getActiveDraftsCount: getActiveDraftsCount,
    listMonitoringDrafts: listMonitoringDrafts,
    getMonitoringDraftDetail: getMonitoringDraftDetail,
    adminDeleteDraft: adminDeleteDraft,
    listMyDeletedDrafts: listMyDeletedDrafts,
    requestDraftRestore: requestDraftRestore,
    listDraftRestoreRequests: listDraftRestoreRequests,
    processDraftRestoreRequest: processDraftRestoreRequest,
    listMyNotifications: listMyNotifications,
    markNotificationRead: markNotificationRead
  };
})();



/* ==================== FILE: Sync.gs ==================== */
/**
 * Sync.gs — Sinkronisasi Offline/Online Idempotent, Deteksi & Resolusi Konflik,
 * Multi-Device Tracking, Prioritas Penghapusan Super Admin saat Sync, & Kebijakan Retensi Lokal.
 */

var TM_Sync = (function () {
  var DAY_MS = 24 * 3600000;

  function upsertSyncMetadata(sessionId, deviceId, updaterFn) {
    var existing = TM_Db.findRecord('SyncMetadata', function (sm) {
      return sm.SessionID === sessionId;
    });
    var ts = TM_Utils.formatWibIso();
    if (existing) {
      return TM_Db.updateRecordById('SyncMetadata', 'SyncID', existing.SyncID, function (rec) {
        var next = updaterFn(rec) || rec;
        next.LastSyncAt = ts;
        return next;
      });
    }
    var initial = {
      SyncID: TM_Utils.generateId('SYNC'),
      SessionID: sessionId,
      DeviceID: deviceId || 'UNKNOWN_DEVICE',
      LocalVersion: '1',
      ServerVersion: '1',
      SyncStatus: 'SYNCED',
      LastSyncAt: ts,
      ConflictData: '',
      LastIdempotencyKey: ''
    };
    var created = updaterFn(initial) || initial;
    return TM_Db.insertRecord('SyncMetadata', created);
  }

  function computeRetentionPolicy(session, latestRestoreReq, nowMs) {
    if (!session || !session.DeletedAt) {
      return null;
    }
    var deletedMs = new Date(session.DeletedAt).getTime();
    var reqWindowEndMs = deletedMs + (TM_CONFIG.DEFAULTS.RESTORE_REQUEST_WINDOW_DAYS * DAY_MS);
    var retentionDays = TM_CONFIG.DEFAULTS.LOCAL_DELETED_RETENTION_DAYS || 30;
    var retentionMs = retentionDays * DAY_MS;
    var warningLeadMs = 7 * DAY_MS;

    // 1. Jika ada permintaan pemulihan berstatus Menunggu -> ditahan tanpa batas waktu (PRD 7.11)
    if (latestRestoreReq && latestRestoreReq.Status === 'Menunggu') {
      return {
        state: 'WAITING_DECISION',
        label: 'Draft Dihapus — Menunggu Pemulihan',
        unlimitedRetention: true,
        retentionDeleteAt: '',
        warningStartAt: '',
        show7DayWarning: false,
        shouldPurgeLocal: false
      };
    }

    // 2. Jika permintaan pemulihan Ditolak -> 30 x 24 jam sejak penolakan (PRD 7.11)
    if (latestRestoreReq && latestRestoreReq.Status === 'Ditolak') {
      var rejectedMs = new Date(latestRestoreReq.ProcessedAt || session.DeletedAt).getTime();
      var purgeAtMs = rejectedMs + retentionMs;
      var warnAtMs = purgeAtMs - warningLeadMs;
      return {
        state: 'REJECTED_RETENTION',
        label: 'Pemulihan Ditolak — Retensi Lokal 30 Hari',
        unlimitedRetention: false,
        retentionDeleteAt: TM_Utils.formatWibIso(new Date(purgeAtMs)),
        warningStartAt: TM_Utils.formatWibIso(new Date(warnAtMs)),
        show7DayWarning: nowMs >= warnAtMs && nowMs < purgeAtMs,
        shouldPurgeLocal: nowMs >= purgeAtMs
      };
    }

    // 3. Jika belum mengajukan pemulihan:
    //    - Dalam 7 x 24 jam pertama: menunggu pengajuan
    //    - Lewat 7 x 24 jam tanpa pengajuan: masuk retensi 30 x 24 jam setelah batas pengajuan berakhir (PRD 7.11)
    if (nowMs <= reqWindowEndMs) {
      var purgeIfNoReqMs = reqWindowEndMs + retentionMs;
      return {
        state: 'DELETED_WITHIN_REQUEST_WINDOW',
        label: 'Draft Dihapus — Menunggu Pemulihan',
        unlimitedRetention: false,
        requestDeadlineAt: TM_Utils.formatWibIso(new Date(reqWindowEndMs)),
        retentionDeleteAt: TM_Utils.formatWibIso(new Date(purgeIfNoReqMs)),
        warningStartAt: TM_Utils.formatWibIso(new Date(purgeIfNoReqMs - warningLeadMs)),
        show7DayWarning: false,
        shouldPurgeLocal: false
      };
    }

    var finalPurgeMs = reqWindowEndMs + retentionMs;
    var finalWarnMs = finalPurgeMs - warningLeadMs;
    return {
      state: 'NO_REQUEST_RETENTION',
      label: 'Draft Dihapus — Masa Retensi Lokal',
      unlimitedRetention: false,
      retentionDeleteAt: TM_Utils.formatWibIso(new Date(finalPurgeMs)),
      warningStartAt: TM_Utils.formatWibIso(new Date(finalWarnMs)),
      show7DayWarning: nowMs >= finalWarnMs && nowMs < finalPurgeMs,
      shouldPurgeLocal: nowMs >= finalPurgeMs
    };
  }

  function buildServerDraftSnapshot(sessionId) {
    var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
    if (!session) return null;
    var findings = TM_Db.filterRecords('Findings', function (f) {
      return f.SessionID === sessionId && !f.DeletedAt;
    });
    var photos = TM_Db.filterRecords('Photos', function (ph) {
      return ph.SessionID === sessionId && !ph.DeletedAt && !ph.PurgedAt;
    });
    return {
      session: session,
      findings: findings,
      photos: photos
    };
  }

  function hasMeaningfulDifference(serverSnap, draftPayload) {
    if (!serverSnap || !serverSnap.session || !draftPayload) return false;
    var s = serverSnap.session;
    var pDate = TM_Utils.normalizeDateStr(draftPayload.inspectionDate) || draftPayload.inspectionDate;
    var sDate = TM_Utils.normalizeDateStr(s.InspectionDate) || s.InspectionDate;
    if (pDate && pDate !== sDate) return true;
    if (draftPayload.outletName && TM_Outlets.cleanDisplayName(draftPayload.outletName) !== s.OutletNameSnapshot) return true;
    if (draftPayload.amId !== undefined && String(draftPayload.amId) !== String(s.AM_ID)) return true;
    if (draftPayload.mumId !== undefined && String(draftPayload.mumId) !== String(s.MUM_ID)) return true;
    if (draftPayload.picName !== undefined && TM_Utils.sanitizeText(draftPayload.picName) !== String(s.PIC_Name)) return true;

    var incomingFindings = Array.isArray(draftPayload.findings) ? draftPayload.findings : null;
    if (incomingFindings) {
      if (incomingFindings.length !== serverSnap.findings.length) return true;
      for (var i = 0; i < incomingFindings.length; i++) {
        var inf = incomingFindings[i];
        var match = serverSnap.findings.find(function (sf) { return sf.FindingID === inf.findingId; });
        if (!match) return true;
        if (
          String(inf.categoryId || '') !== String(match.CategoryID || '') ||
          String(inf.sectionId || '') !== String(match.SectionID || '') ||
          TM_Utils.sanitizeText(inf.masalah) !== String(match.Masalah || '') ||
          TM_Utils.sanitizeText(inf.mengapa) !== String(match.Mengapa || '') ||
          TM_Utils.sanitizeText(inf.solusi) !== String(match.Solusi || '')
        ) {
          return true;
        }
      }
    }
    return false;
  }

  function applyDraftFindingsList(token, sessionId, findingsArray) {
    if (!Array.isArray(findingsArray)) return [];
    var savedFindings = [];
    for (var i = 0; i < findingsArray.length; i++) {
      var fDto = findingsArray[i];
      var saved = TM_Findings.saveFindingDraft(token, sessionId, {
        findingId: fDto.findingId || '',
        categoryId: fDto.categoryId || '',
        sectionId: fDto.sectionId || '',
        masalah: fDto.masalah || '',
        mengapa: fDto.mengapa || '',
        solusi: fDto.solusi || ''
      });
      savedFindings.push(saved);
    }
    return savedFindings;
  }

  /**
   * Sinkronisasi satu operasi Draft dari antrean offline client.
   * Menangani:
   * 1. Idempotency (mencegah duplikasi saat retry)
   * 2. Prioritas penghapusan Super Admin (PRD 7.12: hentikan sync, kunci lokal, tidak buat ulang Draft)
   * 3. Deteksi konflik versi & multi-perangkat (PRD 8.3 & 8.4)
   * 4. Pemeriksaan konflik pasca-pemulihan Draft (PRD 7.10)
   */
  function syncDraftOperation(token, payload) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var p = payload || {};
    var sessionId = TM_Utils.sanitizeText(p.sessionId);
    var deviceId = TM_Utils.sanitizeText(p.deviceId) || ctx.session.DeviceInfo || 'DEFAULT_DEVICE';
    var idempotencyKey = TM_Utils.sanitizeText(p.idempotencyKey) || TM_Utils.generateId('SYNCKEY');
    var localVersion = parseInt(p.localVersion || '1', 10);
    var baseServerVersion = parseInt(p.baseServerVersion !== undefined ? p.baseServerVersion : '0', 10);
    var draftData = p.draft || {};

    if (!sessionId) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'SessionID wajib disertakan dalam operasi sinkronisasi.');
    }

    var existingSyncMeta = TM_Db.findRecord('SyncMetadata', function (sm) {
      return sm.SessionID === sessionId;
    });

    // 1. Cek Idempotency Key agar retry otomatis tidak menduplikasi transaksi
    if (existingSyncMeta && existingSyncMeta.LastIdempotencyKey === idempotencyKey && existingSyncMeta.SyncStatus === 'SYNCED') {
      var snapIdemp = buildServerDraftSnapshot(sessionId);
      return {
        status: 'SYNCED',
        idempotentReplay: true,
        sessionId: sessionId,
        serverVersion: snapIdemp && snapIdemp.session ? parseInt(snapIdemp.session.Version || '1', 10) : 1,
        snapshot: snapIdemp
      };
    }

    var existingSession = TM_Db.findById('Sessions', 'SessionID', sessionId);

    // 2. Prioritas Penghapusan Super Admin saat Sinkronisasi Berjalan (PRD 7.12)
    if (existingSession && (existingSession.DeletedAt || existingSession.Status === TM_CONFIG.SESSION_STATUS.DELETED)) {
      var latestReq = TM_Db.findRecord('DraftRestoreRequests', function (r) {
        return r.SessionID === sessionId;
      });
      var retention = computeRetentionPolicy(existingSession, latestReq, TM_Utils.now().getTime());
      var originDevice = existingSyncMeta ? existingSyncMeta.DeviceID : deviceId;

      upsertSyncMetadata(sessionId, originDevice, function (rec) {
        rec.LocalVersion = String(localVersion);
        rec.ServerVersion = String(existingSession.Version || '1');
        rec.SyncStatus = 'DELETED_LOCKED';
        return rec;
      });

      // Kirim notifikasi lengkap dengan info data lokal tertahan & tautan Lihat Data Lokal (PRD 7.12)
      TM_Drafts.createInAppNotification(
        ctx.user.UserID,
        'SYNC_STOPPED_DRAFT_DELETED',
        'Sinkronisasi Dihentikan — Draft Telah Dihapus Super Admin',
        'Sinkronisasi untuk Draft "' + sessionId + '" dihentikan karena Draft telah dihapus oleh Super Admin (' +
          (existingSession.DeleteReason || '-') + '). Data lokal Anda yang belum tersinkronisasi tetap tersimpan dalam kondisi terkunci (Hanya Baca) di perangkat asal. Gunakan tombol "Lihat Data Lokal" pada halaman Input.',
        sessionId,
        {
          sessionId: sessionId,
          deletedAt: existingSession.DeletedAt,
          deleteReason: existingSession.DeleteReason,
          originDeviceId: originDevice,
          actionLink: 'VIEW_LOCAL_DATA'
        }
      );

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'SYNC_ABORTED_DRAFT_DELETED',
        entityType: 'Sessions',
        entityId: sessionId,
        afterData: {
          deviceId: deviceId,
          originDeviceId: originDevice,
          localVersion: localVersion,
          deletedAt: existingSession.DeletedAt
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Menghentikan sinkronisasi tertunda karena Draft telah dihapus oleh Super Admin (mencegah pembuatan ulang Draft)'
      });

      return {
        status: 'DELETED_LOCKED',
        sessionId: sessionId,
        deletedAt: existingSession.DeletedAt,
        deletedBy: existingSession.DeletedBy,
        deleteReason: existingSession.DeleteReason,
        originDeviceId: originDevice,
        isOriginDevice: originDevice === deviceId,
        retention: retention
      };
    }

    // 3. Cek Kepemilikan jika sesi sudah ada di server
    if (existingSession && existingSession.TrainerID !== ctx.user.UserID) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak dapat menyinkronkan Draft milik Trainer lain.');
    }

    // 4. Deteksi Konflik Versi / Lintas Perangkat / Pasca-Pemulihan Draft (PRD 7.10, 8.3, 8.4)
    if (existingSession) {
      var currentServerVer = parseInt(existingSession.Version || '1', 10);
      var serverSnap = buildServerDraftSnapshot(sessionId);
      var isRestoredNeedsCheck = Boolean(p.hasUnsyncedPreDeleteChanges);
      var versionMismatch = baseServerVersion < currentServerVer;

      if ((versionMismatch && hasMeaningfulDifference(serverSnap, draftData)) || isRestoredNeedsCheck) {
        var conflictPayload = {
          detectedAt: TM_Utils.formatWibIso(),
          deviceId: deviceId,
          baseServerVersion: baseServerVersion,
          currentServerVersion: currentServerVer,
          localDraft: draftData,
          serverSnapshot: serverSnap
        };

        upsertSyncMetadata(sessionId, existingSyncMeta ? existingSyncMeta.DeviceID : deviceId, function (rec) {
          rec.LocalVersion = String(localVersion);
          rec.ServerVersion = String(currentServerVer);
          rec.SyncStatus = 'CONFLICT';
          rec.ConflictData = JSON.stringify(conflictPayload);
          return rec;
        });

        TM_Drafts.createInAppNotification(
          ctx.user.UserID,
          'SYNC_CONFLICT',
          'Perlu Tindakan: Konflik Sinkronisasi Draft',
          'Terdapat perbedaan versi antara perangkat Anda dan server pada Draft "' + sessionId + '". Silakan tinjau dan pilih resolusi konflik.',
          sessionId,
          { sessionId: sessionId, currentServerVersion: currentServerVer }
        );

        TM_Audit.logEvent({
          userId: ctx.user.UserID,
          action: 'SYNC_CONFLICT_DETECTED',
          entityType: 'Sessions',
          entityId: sessionId,
          afterData: {
            deviceId: deviceId,
            baseServerVersion: baseServerVersion,
            currentServerVersion: currentServerVer
          },
          deviceInfo: ctx.session.DeviceInfo,
          description: 'Konflik sinkronisasi terdeteksi pada Draft ' + sessionId
        });

        return {
          status: 'CONFLICT',
          sessionId: sessionId,
          serverVersion: currentServerVer,
          serverSnapshot: serverSnap,
          localDraft: draftData
        };
      }
    }

    // 5. Aman untuk disinkronkan secara otomatis
    var savedSession = TM_Sessions.saveDraft(token, {
      sessionId: sessionId,
      inspectionDate: draftData.inspectionDate,
      outletId: draftData.outletId,
      outletName: draftData.outletName,
      amId: draftData.amId,
      mumId: draftData.mumId,
      picName: draftData.picName
    });

    applyDraftFindingsList(token, savedSession.SessionID, draftData.findings);

    var updatedSnap = buildServerDraftSnapshot(savedSession.SessionID);
    var newServerVer = parseInt(updatedSnap.session.Version || '1', 10);

    upsertSyncMetadata(savedSession.SessionID, existingSyncMeta ? existingSyncMeta.DeviceID : deviceId, function (rec) {
      rec.LocalVersion = String(localVersion);
      rec.ServerVersion = String(newServerVer);
      rec.SyncStatus = 'SYNCED';
      rec.ConflictData = '';
      rec.LastIdempotencyKey = idempotencyKey;
      return rec;
    });

    return {
      status: 'SYNCED',
      idempotentReplay: false,
      sessionId: savedSession.SessionID,
      serverVersion: newServerVer,
      snapshot: updatedSnap
    };
  }

  function syncBatch(token, batchPayload) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var b = batchPayload || {};
    var deviceId = TM_Utils.sanitizeText(b.deviceId);
    var ops = Array.isArray(b.operations) ? b.operations : [];
    var results = [];

    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      try {
        var res = syncDraftOperation(token, Object.assign({}, op, {
          deviceId: op.deviceId || deviceId
        }));
        results.push(res);
      } catch (err) {
        results.push({
          status: 'ERROR',
          sessionId: op.sessionId || '',
          error: {
            code: err && err.code ? err.code : 'ERR_SYNC_OP',
            message: err && err.message ? err.message : String(err)
          }
        });
      }
    }

    return {
      deviceId: deviceId,
      results: results
    };
  }

  function resolveSyncConflict(token, sessionId, resolutionDto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER]);
    var r = resolutionDto || {};
    var strategy = TM_Utils.sanitizeText(r.strategy); // USE_SERVER | APPLY_LOCAL
    var deviceId = TM_Utils.sanitizeText(r.deviceId) || ctx.session.DeviceInfo;

    if (strategy !== 'USE_SERVER' && strategy !== 'APPLY_LOCAL') {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Strategi resolusi konflik harus USE_SERVER atau APPLY_LOCAL.');
    }

    var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
    if (!session) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Draft tidak ditemukan di server.');
    }
    if (session.TrainerID !== ctx.user.UserID) {
      throw TM_Utils.AppError('ERR_FORBIDDEN', 'Anda tidak berhak menyelesaikan konflik untuk Draft Trainer lain.');
    }
    if (session.DeletedAt || session.Status === TM_CONFIG.SESSION_STATUS.DELETED) {
      throw TM_Utils.AppError('ERR_DRAFT_DELETED_BY_ADMIN', 'Draft telah dihapus oleh Super Admin.');
    }

    var beforeSnap = buildServerDraftSnapshot(sessionId);

    if (strategy === 'APPLY_LOCAL' && r.localDraft) {
      TM_Sessions.saveDraft(token, {
        sessionId: sessionId,
        inspectionDate: r.localDraft.inspectionDate,
        outletId: r.localDraft.outletId,
        outletName: r.localDraft.outletName,
        amId: r.localDraft.amId,
        mumId: r.localDraft.mumId,
        picName: r.localDraft.picName
      });
      applyDraftFindingsList(token, sessionId, r.localDraft.findings);
    }

    var afterSnap = buildServerDraftSnapshot(sessionId);
    var finalVer = parseInt(afterSnap.session.Version || '1', 10);

    upsertSyncMetadata(sessionId, deviceId, function (rec) {
      rec.ServerVersion = String(finalVer);
      rec.SyncStatus = 'SYNCED';
      rec.ConflictData = '';
      return rec;
    });

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'SYNC_CONFLICT_RESOLVED',
      entityType: 'Sessions',
      entityId: sessionId,
      beforeData: beforeSnap.session,
      afterData: {
        strategy: strategy,
        finalServerVersion: finalVer,
        session: afterSnap.session
      },
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Trainer menyelesaikan konflik sinkronisasi Draft ' + sessionId + ' dengan strategi ' + strategy
    });

    return {
      status: 'SYNCED',
      strategy: strategy,
      sessionId: sessionId,
      serverVersion: finalVer,
      snapshot: afterSnap
    };
  }

  function getDraftSyncAndRetentionStatus(token, sessionIds, deviceId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.TRAINER, TM_CONFIG.ROLES.SUPER_ADMIN]);
    var ids = Array.isArray(sessionIds) ? sessionIds : [sessionIds];
    var nowMs = TM_Utils.now().getTime();
    var allSessions = TM_Db.getAllRecords('Sessions');
    var allSync = TM_Db.getAllRecords('SyncMetadata');
    var allReqs = TM_Db.getAllRecords('DraftRestoreRequests');

    var sesMap = {};
    for (var i = 0; i < allSessions.length; i++) sesMap[allSessions[i].SessionID] = allSessions[i];
    var syncMap = {};
    for (var j = 0; j < allSync.length; j++) syncMap[allSync[j].SessionID] = allSync[j];

    var latestReqMap = {};
    for (var k = 0; k < allReqs.length; k++) {
      var req = allReqs[k];
      var prev = latestReqMap[req.SessionID];
      if (!prev || String(req.RequestedAt) > String(prev.RequestedAt)) {
        latestReqMap[req.SessionID] = req;
      }
    }

    var out = [];
    for (var idx = 0; idx < ids.length; idx++) {
      var sid = ids[idx];
      var s = sesMap[sid];
      if (!s) continue;
      if (ctx.user.Role === TM_CONFIG.ROLES.TRAINER && s.TrainerID !== ctx.user.UserID) continue;
      var sm = syncMap[sid] || null;
      var reqRec = latestReqMap[sid] || null;
      var originDev = sm ? sm.DeviceID : '';
      var isOrigin = !originDev || originDev === deviceId;

      out.push({
        sessionId: sid,
        status: s.Status,
        serverVersion: parseInt(s.Version || '1', 10),
        deletedAt: s.DeletedAt || '',
        deleteReason: s.DeleteReason || '',
        originDeviceId: originDev,
        isOriginDevice: isOrigin,
        otherDeviceNotice: (!isOrigin && s.DeletedAt)
          ? 'Data lokal yang belum tersinkronisasi untuk Draft ini tertahan di perangkat asal (' + originDev + ').'
          : '',
        restoreRequest: reqRec,
        retention: computeRetentionPolicy(s, reqRec, nowMs)
      });
    }

    return out;
  }

  return {
    computeRetentionPolicy: computeRetentionPolicy,
    syncDraftOperation: syncDraftOperation,
    syncBatch: syncBatch,
    resolveSyncConflict: resolveSyncConflict,
    getDraftSyncAndRetentionStatus: getDraftSyncAndRetentionStatus
  };
})();



/* ==================== FILE: Reporting.gs ==================== */
/**
 * Reporting.gs — Pembuatan PDF Laporan (PDF per Sesi A4, Summary Report, Full Report),
 * Penomoran Versi PDF (PDFHistory), & Pengiriman Email Satu Penerima (EmailLogs).
 */

var TM_Reporting = (function () {
  var EMAIL_REGEX = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

  function escHtml(val) {
    return String(val === null || val === undefined ? '' : val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function validateSingleEmail(emailStr) {
    var raw = TM_Utils.sanitizeText(emailStr);
    if (!raw) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alamat email penerima wajib diisi.');
    }
    if (raw.indexOf(',') !== -1 || raw.indexOf(';') !== -1 || /\s/.test(raw)) {
      throw TM_Utils.AppError(
        'ERR_VALIDATION',
        'PDF sesi hanya dapat dikirim ke satu alamat email penerima (tidak mendukung CC atau banyak penerima).'
      );
    }
    if (!EMAIL_REGEX.test(raw)) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Format alamat email penerima tidak valid.');
    }
    return raw.toLowerCase();
  }

  function nextPdfVersionNumber(sessionId, reportType) {
    var existing = TM_Db.filterRecords('PDFHistory', function (p) {
      return String(p.SessionID) === String(sessionId) && String(p.ReportType) === String(reportType);
    });
    var maxVer = 0;
    for (var i = 0; i < existing.length; i++) {
      var v = parseInt(existing[i].VersionNumber || '0', 10);
      if (v > maxVer) maxVer = v;
    }
    return maxVer + 1;
  }

  function normalizeImageMime(mime, fallbackMime, fileName) {
    var m = String(mime || '').toLowerCase().trim();
    if (m === 'image/png') return 'image/png';
    if (m === 'image/jpeg' || m === 'image/jpg') return 'image/jpeg';
    var fb = String(fallbackMime || '').toLowerCase().trim();
    if (fb === 'image/png') return 'image/png';
    if (fb === 'image/jpeg' || fb === 'image/jpg') return 'image/jpeg';
    if (/\.png$/i.test(String(fileName || ''))) return 'image/png';
    return 'image/jpeg';
  }

  function loadPhotoDataUrlSafe(driveFileId, fallbackMime, fileName) {
    if (!driveFileId) return '';
    try {
      var file = DriveApp.getFileById(driveFileId);
      var blob = file.getBlob();
      var bytes = blob.getBytes();
      if (!bytes || bytes.length === 0) return '';
      var mime = normalizeImageMime(blob.getContentType(), fallbackMime, fileName);
      var b64 = String(Utilities.base64Encode(bytes)).replace(/\s+/g, '');
      return 'data:' + mime + ';base64,' + b64;
    } catch (_) {
      return '';
    }
  }

  /**
   * Merender blok foto dengan aturan PRD 11.3:
   * - Maksimal 2 foto per baris; jika > 2 lanjut ke baris berikutnya
   * - Komentar berada tepat di bawah masing-masing foto dalam sel tabel yang sama
   * - Tidak boleh terpotong atau terlepas saat berpindah halaman (page-break-inside: avoid)
   * - Menggunakan atribut width eksplisit & tabel murni agar kompatibel 100% dengan konverter PDF Google Apps Script
   */
  function buildPhotoRowsHtml(photos) {
    if (!photos || photos.length === 0) {
      return '<div class="no-photo-note">Tidak ada foto bukti terlampir.</div>';
    }
    var rowsHtml = '';
    for (var i = 0; i < photos.length; i += 2) {
      var pair = photos.slice(i, i + 2);
      var cellsHtml = pair.map(function (ph, idxInPair) {
        var photoNum = i + idxInPair + 1;
        var dataUrl = ph.dataUrl || loadPhotoDataUrlSafe(ph.DriveFileID, ph.MimeType, ph.FileName);
        var imgTag = dataUrl
          ? '<div class="pdf-photo-img-box"><img class="pdf-photo-img" width="210" src="' + dataUrl + '" alt="' + escHtml(ph.FileName || ('Foto ' + photoNum)) + '"></div>'
          : '<div class="pdf-photo-placeholder">Foto #' + photoNum + ': ' + escHtml(ph.FileName || ph.PhotoID || 'Tidak tersedia') + '</div>';
        return (
          '<td class="pdf-photo-cell" width="50%" valign="top" align="center">' +
            '<table class="pdf-photo-card" width="100%" cellspacing="0" cellpadding="0" role="presentation">' +
              '<tr><td align="center" class="pdf-photo-card-inner">' +
                imgTag +
                '<div class="pdf-photo-comment"><strong>Foto #' + photoNum + ':</strong> ' + escHtml(ph.PhotoComment || 'Tanpa keterangan tambahan') + '</div>' +
              '</td></tr>' +
            '</table>' +
          '</td>'
        );
      }).join('');
      if (pair.length === 1) {
        cellsHtml += '<td class="pdf-photo-cell pdf-photo-cell-empty" width="50%" valign="top"></td>';
      }
      rowsHtml += '<tr class="pdf-photo-row">' + cellsHtml + '</tr>';
    }
    return '<table class="pdf-photo-table" width="100%" cellspacing="0" cellpadding="0" role="presentation">' + rowsHtml + '</table>';
  }

  /**
   * Membangun HTML A4 Print-Friendly untuk PDF per Sesi (PRD 11.2 & 11.3).
   * PENTING: Tidak menampilkan AM, MUM, Nomor Laporan, dan Waktu Generate PDF pada isi PDF per sesi!
   */
  function buildSessionPdfHtml(branding, session, trainerName, activeFindings) {
    var logoHtml = branding.logoDataUrl
      ? '<img class="brand-logo" width="90" src="' + branding.logoDataUrl + '" alt="Logo">'
      : '<div class="brand-badge">TM</div>';

    var findingsHtml = '';
    if (!activeFindings || activeFindings.length === 0) {
      findingsHtml =
        '<div class="empty-findings-box">' +
          'Pemeriksaan diselesaikan tanpa temuan masalah operasional.' +
        '</div>';
    } else {
      findingsHtml = activeFindings.map(function (f, idx) {
        return (
          '<table class="finding-block" width="100%" cellspacing="0" cellpadding="0" role="presentation">' +
            '<tr class="finding-header-row">' +
              '<td class="finding-header-left" align="left">Temuan #' + (idx + 1) + '</td>' +
              '<td class="finding-header-right" align="right">' + escHtml(f.CategoryNameSnapshot) + ' &bull; ' + escHtml(f.SectionNameSnapshot) + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td colspan="2" class="finding-details-section">' +
                '<table class="finding-fields-table" width="100%" cellspacing="0" cellpadding="0" role="presentation">' +
                  '<tr><td class="field-label-col" width="22%">Masalah</td><td class="field-val-col" width="78%">' + escHtml(f.Masalah) + '</td></tr>' +
                  '<tr><td class="field-label-col" width="22%">Mengapa</td><td class="field-val-col" width="78%">' + escHtml(f.Mengapa) + '</td></tr>' +
                  '<tr><td class="field-label-col" width="22%">Solusi / Tindakan</td><td class="field-val-col" width="78%">' + escHtml(f.Solusi || '-') + '</td></tr>' +
                '</table>' +
              '</td>' +
            '</tr>' +
            '<tr>' +
              '<td colspan="2" class="finding-photos-section">' +
                '<div class="photos-section-label">Dokumentasi Foto Bukti (' + ((f.Photos && f.Photos.length) || 0) + ' Foto)</div>' +
                buildPhotoRowsHtml(f.Photos || []) +
              '</td>' +
            '</tr>' +
          '</table>'
        );
      }).join('');
    }

    return (
      '<!DOCTYPE html>' +
      '<html lang="id">' +
      '<head>' +
        '<meta charset="UTF-8">' +
        '<title>Laporan Pemeriksaan Outlet</title>' +
        '<style>' +
          '@page { size: A4 portrait; margin: 12mm; }' +
          '* { box-sizing: border-box; }' +
          'body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 10pt; line-height: 1.45; margin: 0; padding: 0; }' +
          '.report-header-table { width: 100%; border-collapse: collapse; border-bottom: 2.5px solid #991b1b; padding-bottom: 10px; margin-bottom: 14px; }' +
          '.report-header-table td { vertical-align: middle; padding-bottom: 8px; }' +
          '.brand-logo { max-height: 46px; max-width: 110px; height: auto; width: auto; display: block; }' +
          '.brand-badge { width: 38px; height: 38px; line-height: 38px; text-align: center; background: #991b1b; color: #ffffff; font-weight: bold; border-radius: 6px; font-size: 12pt; }' +
          '.company-name { font-size: 12.5pt; font-weight: bold; color: #111827; }' +
          '.report-title { font-size: 14.5pt; font-weight: bold; color: #991b1b; margin: 2px 0 0; }' +
          '.meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; background: #f9fafb; border: 1px solid #d1d5db; }' +
          '.meta-table td { padding: 8px 12px; border: 1px solid #d1d5db; font-size: 9.5pt; width: 50%; vertical-align: top; }' +
          '.meta-label { font-weight: bold; color: #4b5563; display: block; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.03em; }' +
          '.meta-value { font-weight: bold; color: #111827; font-size: 10.5pt; margin-top: 2px; }' +
          '.finding-block { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid; background: #ffffff; }' +
          '.finding-header-row td { background: #fef2f2; border-bottom: 1px solid #fecaca; padding: 8px 12px; }' +
          '.finding-header-left { font-weight: bold; color: #991b1b; font-size: 10.5pt; width: 35%; }' +
          '.finding-header-right { font-weight: bold; color: #1f2937; font-size: 9.5pt; width: 65%; }' +
          '.finding-details-section { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }' +
          '.finding-fields-table { width: 100%; border-collapse: collapse; }' +
          '.finding-fields-table td { padding: 4px 6px; vertical-align: top; border-bottom: 1px dashed #e5e7eb; font-size: 9.5pt; }' +
          '.finding-fields-table tr:last-child td { border-bottom: none; }' +
          '.field-label-col { font-weight: bold; color: #4b5563; width: 22%; }' +
          '.field-val-col { color: #111827; white-space: pre-wrap; width: 78%; }' +
          '.finding-photos-section { padding: 10px 12px; background: #f8fafc; page-break-inside: avoid; break-inside: avoid; }' +
          '.photos-section-label { font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 6px; letter-spacing: 0.03em; }' +
          '.pdf-photo-table { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: avoid; break-inside: avoid; }' +
          '.pdf-photo-row { page-break-inside: avoid; break-inside: avoid; }' +
          '.pdf-photo-cell { width: 50%; vertical-align: top; padding: 5px; page-break-inside: avoid; break-inside: avoid; }' +
          '.pdf-photo-card { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; background: #ffffff; page-break-inside: avoid; break-inside: avoid; }' +
          '.pdf-photo-card-inner { padding: 8px; text-align: center; vertical-align: top; }' +
          '.pdf-photo-img-box { text-align: center; margin-bottom: 6px; }' +
          '.pdf-photo-img { max-width: 215px; max-height: 155px; width: auto; height: auto; display: inline-block; border: 1px solid #e2e8f0; }' +
          '.pdf-photo-placeholder { padding: 24px 8px; text-align: center; background: #f1f5f9; color: #64748b; font-size: 8.5pt; margin-bottom: 6px; border: 1px dashed #cbd5e1; }' +
          '.pdf-photo-comment { font-size: 8.5pt; color: #334155; text-align: center; word-wrap: break-word; line-height: 1.35; padding-top: 4px; border-top: 1px solid #f1f5f9; }' +
          '.no-photo-note { font-size: 9pt; color: #64748b; font-style: italic; padding: 4px 0; }' +
          '.empty-findings-box { padding: 18px; border: 1px solid #cbd5e1; text-align: center; color: #374151; background: #f9fafb; font-weight: bold; }' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<table class="report-header-table" role="presentation">' +
          '<tr>' +
            '<td width="52">' + logoHtml + '</td>' +
            '<td>' +
              '<div class="company-name">' + escHtml(branding.companyName) + '</div>' +
              '<div class="report-title">Laporan Pemeriksaan Operasional Outlet</div>' +
            '</td>' +
            '<td align="right" style="font-size:9pt;color:#4b5563;">' +
              '<strong>Total Temuan:</strong> ' + ((activeFindings && activeFindings.length) || 0) + ' Temuan' +
            '</td>' +
          '</tr>' +
        '</table>' +
        '<table class="meta-table" role="presentation">' +
          '<tr>' +
            '<td><span class="meta-label">Tanggal Pemeriksaan</span><div class="meta-value">' + escHtml(session.InspectionDate) + '</div></td>' +
            '<td><span class="meta-label">Nama Outlet</span><div class="meta-value">' + escHtml(session.OutletNameSnapshot) + '</div></td>' +
          '</tr>' +
          '<tr>' +
            '<td><span class="meta-label">Trainer Pemeriksa</span><div class="meta-value">' + escHtml(trainerName) + '</div></td>' +
            '<td><span class="meta-label">PIC Outlet</span><div class="meta-value">' + escHtml(session.PIC_Name) + '</div></td>' +
          '</tr>' +
        '</table>' +
        findingsHtml +
      '</body>' +
      '</html>'
    );
  }

  function convertHtmlToPdfBase64(html, fileName) {
    if (typeof HtmlService !== 'undefined' && HtmlService.createHtmlOutput) {
      var out = HtmlService.createHtmlOutput(html);
      if (out && typeof out.getAs === 'function') {
        var pdfBlob = out.getAs('application/pdf');
        if (pdfBlob && typeof pdfBlob.setName === 'function') {
          pdfBlob.setName(fileName);
        }
        return {
          blob: pdfBlob,
          base64Data: Utilities.base64Encode(pdfBlob.getBytes())
        };
      }
    }
    var bytes = Utilities.base64Decode(Utilities.base64Encode(Buffer.from(html, 'utf8')));
    var fallbackBlob = Utilities.newBlob(bytes, 'application/pdf', fileName);
    return {
      blob: fallbackBlob,
      base64Data: Utilities.base64Encode(bytes)
    };
  }

  function collectActiveSessionReportPayload(sessionId) {
    var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
    if (!session || session.DeletedAt) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi pemeriksaan tidak ditemukan atau telah dihapus.');
    }
    if (session.Status !== TM_CONFIG.SESSION_STATUS.SELESAI) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'PDF hanya dapat dibuat untuk sesi pemeriksaan yang telah Selesai.');
    }
    var trainer = TM_Db.findById('Users', 'UserID', session.TrainerID);
    var trainerName = trainer ? trainer.Name : session.TrainerID;
    var trainerEmail = trainer ? trainer.Email : '';

    var findings = TM_Db.filterRecords('Findings', function (f) {
      return f.SessionID === sessionId && !f.DeletedAt;
    });
    var photos = TM_Db.filterRecords('Photos', function (p) {
      return p.SessionID === sessionId && !p.DeletedAt && !p.PurgedAt;
    });

    var enrichedFindings = findings.map(function (f) {
      var fPhotos = photos.filter(function (ph) { return ph.FindingID === f.FindingID; });
      return Object.assign({}, f, { Photos: fPhotos });
    });

    return {
      session: session,
      trainerName: trainerName,
      trainerEmail: trainerEmail,
      findings: enrichedFindings
    };
  }

  /**
   * Generate PDF per Sesi (A4) secara on-demand & mencatat versi baru ke PDFHistory (PRD 11.2, 11.6).
   */
  function generateSessionPdf(token, sessionId) {
    var ctx = TM_Auth.requireAuth(token, [
      TM_CONFIG.ROLES.SUPER_ADMIN,
      TM_CONFIG.ROLES.TRAINER,
      TM_CONFIG.ROLES.MANAJEMEN
    ]);

    return TM_Db.withLock(function () {
      var data = collectActiveSessionReportPayload(sessionId);
      var branding = TM_Settings.getPublicBranding();
      var html = buildSessionPdfHtml(branding, data.session, data.trainerName, data.findings);
      var versionNum = nextPdfVersionNumber(sessionId, 'SESSION_A4');
      var fileName = (data.session.ReportNumber || sessionId) + '-v' + versionNum + '.pdf';
      var pdfObj = convertHtmlToPdfBase64(html, fileName);

      var pdfVersion = TM_Db.insertRecord('PDFHistory', {
        PDFVersionID: TM_Utils.generateId('PDF'),
        SessionID: sessionId,
        ReportType: 'SESSION_A4',
        VersionNumber: String(versionNum),
        GeneratedAt: TM_Utils.formatWibIso(),
        GeneratedBy: ctx.user.UserID,
        RecipientEmail: '',
        SendStatus: 'GENERATED_ONLY'
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'GENERATE_SESSION_PDF',
        entityType: 'PDFHistory',
        entityId: pdfVersion.PDFVersionID,
        afterData: {
          sessionId: sessionId,
          versionNumber: versionNum,
          reportType: 'SESSION_A4'
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Generate PDF per sesi versi #' + versionNum + ' untuk ' + sessionId
      });

      return {
        pdfVersion: pdfVersion,
        fileName: fileName,
        mimeType: 'application/pdf',
        base64Data: pdfObj.base64Data,
        htmlPreview: html,
        defaultRecipientEmail: data.trainerEmail
      };
    });
  }

  /**
   * Kirim / Kirim Ulang Email PDF Sesi ke 1 alamat penerima (PRD 11.7).
   * - Trainer hanya dapat mengirim sesi miliknya sendiri.
   * - Super Admin dapat mengirim semua sesi.
   * - Manajemen tidak dapat mengirim / mengirim ulang.
   * - Kegagalan pengiriman email tidak membatalkan status Selesai sesi.
   */
  function sendSessionPdfEmail(token, sessionId, recipientEmail, isResend) {
    var ctx = TM_Auth.requireAuth(token, [
      TM_CONFIG.ROLES.SUPER_ADMIN,
      TM_CONFIG.ROLES.TRAINER
    ]);

    return TM_Db.withLock(function () {
      var data = collectActiveSessionReportPayload(sessionId);
      if (ctx.user.Role === TM_CONFIG.ROLES.TRAINER && data.session.TrainerID !== ctx.user.UserID) {
        throw TM_Utils.AppError('ERR_FORBIDDEN', 'Trainer hanya dapat mengirim atau mengirim ulang PDF sesi miliknya sendiri.');
      }

      var targetEmail = recipientEmail
        ? validateSingleEmail(recipientEmail)
        : validateSingleEmail(data.trainerEmail);

      var branding = TM_Settings.getPublicBranding();
      var html = buildSessionPdfHtml(branding, data.session, data.trainerName, data.findings);
      var versionNum = nextPdfVersionNumber(sessionId, 'SESSION_A4');
      var fileName = (data.session.ReportNumber || sessionId) + '-v' + versionNum + '.pdf';
      var pdfObj = convertHtmlToPdfBase64(html, fileName);

      var pdfVersionId = TM_Utils.generateId('PDF');
      var nowIso = TM_Utils.formatWibIso();
      var sendStatus = 'Menunggu';
      var failureReason = '';

      try {
        MailApp.sendEmail({
          to: targetEmail,
          subject: '[' + branding.companyName + '] Laporan Pemeriksaan Outlet — ' + data.session.OutletNameSnapshot + ' (' + data.session.InspectionDate + ')',
          body:
            'Halo,\n\n' +
            'Terlampir PDF Laporan Pemeriksaan Operasional Outlet:\n' +
            '- Outlet: ' + data.session.OutletNameSnapshot + '\n' +
            '- Tanggal Pemeriksaan: ' + data.session.InspectionDate + '\n' +
            '- Trainer: ' + data.trainerName + '\n' +
            '- PIC Outlet: ' + data.session.PIC_Name + '\n\n' +
            'Salam,\n' + branding.companyName,
          attachments: [pdfObj.blob]
        });
        sendStatus = 'Berhasil';
      } catch (mailErr) {
        sendStatus = 'Gagal';
        failureReason = mailErr && mailErr.message ? mailErr.message : String(mailErr);
      }

      var pdfHistoryRow = TM_Db.insertRecord('PDFHistory', {
        PDFVersionID: pdfVersionId,
        SessionID: sessionId,
        ReportType: 'SESSION_A4',
        VersionNumber: String(versionNum),
        GeneratedAt: nowIso,
        GeneratedBy: ctx.user.UserID,
        RecipientEmail: targetEmail,
        SendStatus: sendStatus
      });

      var emailLogRow = TM_Db.insertRecord('EmailLogs', {
        EmailLogID: TM_Utils.generateId('EML'),
        SessionID: sessionId,
        Recipient: targetEmail,
        PDFVersionID: pdfVersionId,
        AttemptAt: nowIso,
        Status: sendStatus,
        FailureReason: failureReason
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: isResend ? 'RESEND_SESSION_PDF_EMAIL' : 'SEND_SESSION_PDF_EMAIL',
        entityType: 'EmailLogs',
        entityId: emailLogRow.EmailLogID,
        afterData: {
          sessionId: sessionId,
          pdfVersionId: pdfVersionId,
          versionNumber: versionNum,
          recipient: targetEmail,
          status: sendStatus,
          failureReason: failureReason
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: (isResend ? 'Kirim ulang' : 'Kirim') + ' email PDF sesi ' + sessionId + ' ke ' + targetEmail + ' (' + sendStatus + ')'
      });

      return {
        pdfVersion: pdfHistoryRow,
        emailLog: emailLogRow,
        status: sendStatus,
        failureReason: failureReason
      };
    });
  }

  function getSessionPdfHistory(token, sessionId) {
    TM_Auth.requireAuth(token, [
      TM_CONFIG.ROLES.SUPER_ADMIN,
      TM_CONFIG.ROLES.TRAINER,
      TM_CONFIG.ROLES.MANAJEMEN
    ]);
    var session = TM_Db.findById('Sessions', 'SessionID', sessionId);
    if (!session) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Sesi tidak ditemukan.');
    }
    var trainer = TM_Db.findById('Users', 'UserID', session.TrainerID);
    var pdfVersions = TM_Db.filterRecords('PDFHistory', function (p) {
      return p.SessionID === sessionId;
    }).sort(function (a, b) {
      return parseInt(b.VersionNumber || '0', 10) - parseInt(a.VersionNumber || '0', 10);
    });
    var emailLogs = TM_Db.filterRecords('EmailLogs', function (e) {
      return e.SessionID === sessionId;
    }).sort(function (a, b) {
      return String(b.AttemptAt).localeCompare(String(a.AttemptAt));
    });

    return {
      sessionId: sessionId,
      defaultRecipientEmail: trainer ? trainer.Email : '',
      pdfVersions: pdfVersions,
      emailLogs: emailLogs
    };
  }

  function listEmailLogsForAdmin(token, statusFilter) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var logs = TM_Db.getAllRecords('EmailLogs');
    if (statusFilter) {
      logs = logs.filter(function (l) { return l.Status === statusFilter; });
    }
    logs.sort(function (a, b) {
      return String(b.AttemptAt).localeCompare(String(a.AttemptAt));
    });
    return logs;
  }

  /**
   * Generate Dashboard Report PDF: SUMMARY Report atau FULL Report (PRD 11.1 & 12.4).
   */
  function generateDashboardReportPdf(token, reportType, filters) {
    var ctx = TM_Auth.requireAuth(token, [
      TM_CONFIG.ROLES.SUPER_ADMIN,
      TM_CONFIG.ROLES.TRAINER,
      TM_CONFIG.ROLES.MANAJEMEN
    ]);

    var normType = String(reportType || 'SUMMARY').toUpperCase() === 'FULL' ? 'FULL' : 'SUMMARY';

    return TM_Db.withLock(function () {
      var ds = TM_Dashboard.computeDashboardDataset(filters || {});
      var branding = TM_Settings.getPublicBranding();
      var logoHtml = branding.logoDataUrl
        ? '<img class="brand-logo" width="90" src="' + branding.logoDataUrl + '" alt="Logo">'
        : '<div class="brand-badge">TM</div>';

      var fObj = filters || {};
      var periodLabel = (fObj.dateFrom || fObj.dateTo)
        ? ((fObj.dateFrom || 'Awal') + ' s/d ' + (fObj.dateTo || 'Sekarang'))
        : 'Semua Tanggal Pemeriksaan';

      var outletSummaryRows = (ds.topIssuesByOutlet || []).map(function (o, i) {
        return (
          '<tr>' +
            '<td align="center">' + (i + 1) + '</td>' +
            '<td><strong>' + escHtml(o.outletCode || '-') + '</strong></td>' +
            '<td><strong>' + escHtml(o.outletName) + '</strong></td>' +
            '<td align="center">' + o.sessionCount + '</td>' +
            '<td align="center"><strong>' + o.findingCount + '</strong></td>' +
            '<td>' + escHtml(o.topCategory) + '</td>' +
            '<td>' + escHtml(o.topSection) + '</td>' +
          '</tr>'
        );
      }).join('') || '<tr><td colspan="7" align="center">Tidak ada data pemeriksaan outlet pada filter ini.</td></tr>';

      var amSummaryRows = (ds.analysisByAM || []).map(function (a, i) {
        return '<tr><td align="center">' + (i + 1) + '</td><td><strong>' + escHtml(a.amName) + '</strong></td><td align="center">' + a.outletCount + '</td><td align="center">' + a.sessionCount + '</td><td align="center"><strong>' + a.findingCount + '</strong></td></tr>';
      }).join('') || '<tr><td colspan="5" align="center">Tidak ada data AM</td></tr>';

      var mumSummaryRows = (ds.analysisByMUM || []).map(function (m, i) {
        return '<tr><td align="center">' + (i + 1) + '</td><td><strong>' + escHtml(m.mumName) + '</strong></td><td align="center">' + m.outletCount + '</td><td align="center">' + m.sessionCount + '</td><td align="center"><strong>' + m.findingCount + '</strong></td></tr>';
      }).join('') || '<tr><td colspan="5" align="center">Tidak ada data MUM</td></tr>';

      var topCatRows = ds.topCategories.map(function (c, i) {
        return '<tr><td align="center">' + (i + 1) + '</td><td>' + escHtml(c.categoryName) + '</td><td align="center">' + (c.sessionCount || '-') + '</td><td align="center"><strong>' + c.findingCount + '</strong></td></tr>';
      }).join('') || '<tr><td colspan="4" align="center">Tidak ada data</td></tr>';

      var topSecRows = ds.topSections.map(function (s, i) {
        return '<tr><td align="center">' + (i + 1) + '</td><td>' + escHtml(s.sectionName) + '</td><td align="center">' + (s.sessionCount || '-') + '</td><td align="center"><strong>' + s.findingCount + '</strong></td></tr>';
      }).join('') || '<tr><td colspan="4" align="center">Tidak ada data</td></tr>';

      var recRows = ds.recurringIssues.map(function (r) {
        return (
          '<tr>' +
            '<td><strong>' + escHtml(r.outletName) + '</strong> (' + escHtml(r.outletCode) + ')</td>' +
            '<td>' + escHtml(r.categoryName) + '</td>' +
            '<td align="center">' + r.sessionCount + ' sesi</td>' +
            '<td align="center"><strong>' + r.findingCount + ' temuan</strong></td>' +
            '<td align="center">' + escHtml(r.lastInspectionDate || '-') + '</td>' +
            '<td><span class="rec-badge">Perlu perhatian khusus</span></td>' +
          '</tr>'
        );
      }).join('') || '<tr><td colspan="6" align="center">Tidak ada masalah berulang (Recurring Issue) pada filter aktif.</td></tr>';

      var fullDetailsHtml = '';
      if (normType === 'FULL') {
        fullDetailsHtml = '<h2 class="sec-title">6. Rincian Pemeriksaan per Outlet &amp; Dokumentasi Bukti Temuan</h2>' +
          (ds.detailedSessions.map(function (s, sIdx) {
            var fList = (s.Findings || []).map(function (f, idx) {
              return (
                '<table class="finding-block" width="100%" cellspacing="0" cellpadding="0" role="presentation">' +
                  '<tr class="finding-header-row">' +
                    '<td class="finding-header-left" align="left">Temuan #' + (idx + 1) + '</td>' +
                    '<td class="finding-header-right" align="right">' + escHtml(f.CategoryNameSnapshot) + ' &bull; ' + escHtml(f.SectionNameSnapshot) + '</td>' +
                  '</tr>' +
                  '<tr>' +
                    '<td colspan="2" class="finding-details-section">' +
                      '<table class="finding-fields-table" width="100%" cellspacing="0" cellpadding="0" role="presentation">' +
                        '<tr><td class="field-label-col" width="22%">Masalah</td><td class="field-val-col" width="78%">' + escHtml(f.Masalah) + '</td></tr>' +
                        '<tr><td class="field-label-col" width="22%">Mengapa</td><td class="field-val-col" width="78%">' + escHtml(f.Mengapa) + '</td></tr>' +
                        '<tr><td class="field-label-col" width="22%">Solusi / Tindakan</td><td class="field-val-col" width="78%">' + escHtml(f.Solusi || '-') + '</td></tr>' +
                      '</table>' +
                    '</td>' +
                  '</tr>' +
                  '<tr>' +
                    '<td colspan="2" class="finding-photos-section">' +
                      '<div class="photos-section-label">Dokumentasi Foto Bukti (' + ((f.Photos && f.Photos.length) || 0) + ' Foto)</div>' +
                      buildPhotoRowsHtml(f.Photos || []) +
                    '</td>' +
                  '</tr>' +
                '</table>'
              );
            }).join('') || '<div class="empty-findings-box">Pemeriksaan selesai tanpa temuan masalah operasional.</div>';

            return (
              '<div class="session-section">' +
                '<table class="session-bar-table" width="100%" cellspacing="0" cellpadding="0" role="presentation">' +
                  '<tr>' +
                    '<td class="session-bar-main">' +
                      '<div class="session-outlet-title">' + (sIdx + 1) + '. ' + escHtml(s.CanonicalOutletName) + (s.CanonicalOutletCode ? ' (' + escHtml(s.CanonicalOutletCode) + ')' : '') + '</div>' +
                      '<div class="session-meta-line">' +
                        '<strong>No. Laporan:</strong> ' + escHtml(s.ReportNumber || s.SessionID) +
                        ' &nbsp;|&nbsp; <strong>Tanggal:</strong> ' + escHtml(s.InspectionDate) +
                        ' &nbsp;|&nbsp; <strong>Trainer:</strong> ' + escHtml(s.TrainerName) +
                        ' &nbsp;|&nbsp; <strong>PIC Outlet:</strong> ' + escHtml(s.PIC_Name) +
                      '</div>' +
                      '<div class="session-meta-line">' +
                        '<strong>Area Manager (AM):</strong> ' + escHtml(s.AM_Name_Snapshot || '-') +
                        ' &nbsp;|&nbsp; <strong>MUM:</strong> ' + escHtml(s.MUM_Name_Snapshot || '-') +
                      '</div>' +
                    '</td>' +
                    '<td class="session-bar-badge" align="right" valign="top">' +
                      '<span class="session-count-pill">' + ((s.Findings && s.Findings.length) || 0) + ' Temuan</span>' +
                    '</td>' +
                  '</tr>' +
                '</table>' +
                fList +
              '</div>'
            );
          }).join('') || '<p>Tidak ada sesi pemeriksaan pada filter ini.</p>');
      }

      var nowPrintWib = TM_Utils.formatWibIso().slice(0, 16).replace('T', ' ') + ' WIB';

      var html =
        '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">' +
        '<style>' +
          '@page { size: A4 portrait; margin: 12mm; }' +
          '* { box-sizing: border-box; }' +
          'body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #1f2937; line-height: 1.4; margin: 0; padding: 0; }' +
          '.hdr-table { width: 100%; border-collapse: collapse; border-bottom: 2.5px solid #991b1b; margin-bottom: 12px; }' +
          '.hdr-table td { vertical-align: middle; padding-bottom: 8px; }' +
          '.brand-logo { max-height: 44px; max-width: 110px; width: auto; height: auto; display: block; }' +
          '.brand-badge { width: 36px; height: 36px; line-height: 36px; text-align: center; background: #991b1b; color: #ffffff; font-weight: bold; border-radius: 6px; font-size: 11pt; }' +
          '.sec-title { font-size: 11pt; color: #991b1b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 0.02em; }' +
          '.kpi-grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; }' +
          '.kpi-grid td { width: 25%; border: 1px solid #cbd5e1; padding: 8px; background: #f8fafc; text-align: center; vertical-align: middle; }' +
          '.kpi-lbl { font-size: 8.5pt; font-weight: bold; color: #475569; text-transform: uppercase; }' +
          '.kpi-num { font-size: 14pt; font-weight: bold; color: #991b1b; margin-top: 2px; }' +
          '.tbl { width: 100%; border-collapse: collapse; margin-bottom: 12px; page-break-inside: auto; }' +
          '.tbl tr { page-break-inside: avoid; break-inside: avoid; }' +
          '.tbl th, .tbl td { border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 9pt; vertical-align: top; }' +
          '.tbl th { background: #f1f5f9; color: #1e293b; font-weight: bold; text-transform: uppercase; font-size: 8pt; }' +
          '.rec-badge { color: #991b1b; font-weight: bold; }' +
          '.session-section { margin-bottom: 18px; }' +
          '.session-bar-table { width: 100%; border-collapse: collapse; background: #f1f5f9; border: 1px solid #cbd5e1; border-left: 4px solid #991b1b; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; }' +
          '.session-bar-main { padding: 8px 10px; }' +
          '.session-bar-badge { padding: 8px 10px; width: 95px; }' +
          '.session-outlet-title { font-size: 11pt; font-weight: bold; color: #0f172a; margin-bottom: 3px; }' +
          '.session-meta-line { font-size: 8.5pt; color: #334155; margin-top: 2px; }' +
          '.session-count-pill { display: inline-block; background: #991b1b; color: #ffffff; font-weight: bold; font-size: 8.5pt; padding: 3px 8px; border-radius: 4px; }' +
          '.finding-block { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; background: #ffffff; }' +
          '.finding-header-row td { background: #fef2f2; padding: 6px 10px; border-bottom: 1px solid #fecaca; }' +
          '.finding-header-left { font-weight: bold; color: #991b1b; font-size: 9.5pt; width: 35%; }' +
          '.finding-header-right { font-weight: bold; color: #1f2937; font-size: 9pt; width: 65%; }' +
          '.finding-details-section { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }' +
          '.finding-fields-table { width: 100%; border-collapse: collapse; }' +
          '.finding-fields-table td { padding: 4px 6px; vertical-align: top; border-bottom: 1px dashed #e5e7eb; font-size: 9pt; }' +
          '.finding-fields-table tr:last-child td { border-bottom: none; }' +
          '.field-label-col { font-weight: bold; color: #4b5563; width: 22%; }' +
          '.field-val-col { color: #111827; white-space: pre-wrap; width: 78%; }' +
          '.finding-photos-section { padding: 8px 10px; background: #f8fafc; page-break-inside: avoid; break-inside: avoid; }' +
          '.photos-section-label { font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 5px; }' +
          '.pdf-photo-table { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: avoid; break-inside: avoid; }' +
          '.pdf-photo-row, .pdf-photo-cell, .pdf-photo-card { page-break-inside: avoid; break-inside: avoid; }' +
          '.pdf-photo-cell { width: 50%; padding: 4px; vertical-align: top; }' +
          '.pdf-photo-card { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; background: #ffffff; }' +
          '.pdf-photo-card-inner { padding: 6px; text-align: center; vertical-align: top; }' +
          '.pdf-photo-img-box { text-align: center; margin-bottom: 5px; }' +
          '.pdf-photo-img { max-width: 210px; max-height: 150px; width: auto; height: auto; display: inline-block; border: 1px solid #e2e8f0; }' +
          '.pdf-photo-placeholder { padding: 20px 8px; text-align: center; background: #f1f5f9; color: #64748b; font-size: 8.5pt; margin-bottom: 4px; border: 1px dashed #cbd5e1; }' +
          '.pdf-photo-comment { font-size: 8pt; color: #334155; text-align: center; word-wrap: break-word; line-height: 1.35; padding-top: 3px; border-top: 1px solid #f1f5f9; }' +
          '.no-photo-note { font-size: 8.5pt; color: #64748b; font-style: italic; }' +
          '.empty-findings-box { padding: 12px; border: 1px solid #cbd5e1; text-align: center; color: #475569; background: #f8fafc; font-style: italic; margin-bottom: 10px; }' +
        '</style></head><body>' +
          '<table class="hdr-table" role="presentation">' +
            '<tr>' +
              '<td width="48">' + logoHtml + '</td>' +
              '<td>' +
                '<div style="font-weight:bold;font-size:11.5pt;color:#0f172a;">' + escHtml(branding.companyName) + '</div>' +
                '<div style="font-size:14pt;font-weight:bold;color:#991b1b;">' + (normType === 'FULL' ? 'Laporan Lengkap Pemeriksaan Outlet' : 'Laporan Ringkasan Pemeriksaan Outlet') + '</div>' +
              '</td>' +
              '<td align="right" style="font-size:8.5pt;color:#475569;">' +
                '<div><strong>Periode:</strong> ' + escHtml(periodLabel) + '</div>' +
                '<div><strong>Dicetak:</strong> ' + escHtml(nowPrintWib) + '</div>' +
              '</td>' +
            '</tr>' +
          '</table>' +
          '<table class="kpi-grid" role="presentation"><tr>' +
            '<td><div class="kpi-lbl">Total Pemeriksaan</div><div class="kpi-num">' + ds.kpi.totalInspections + '</div></td>' +
            '<td><div class="kpi-lbl">Total Temuan Aktif</div><div class="kpi-num">' + ds.kpi.totalActiveFindings + '</div></td>' +
            '<td><div class="kpi-lbl">Outlet Diperiksa</div><div class="kpi-num">' + ds.kpi.inspectedOutlets + '</div></td>' +
            '<td><div class="kpi-lbl">Masalah Berulang</div><div class="kpi-num">' + ds.kpi.recurringIssuesCount + ' (' + ds.kpi.recurringAffectedOutletsCount + ' outlet)</div></td>' +
          '</tr></table>' +
          '<h2 class="sec-title">1. Ringkasan Pemeriksaan per Outlet</h2>' +
          '<table class="tbl"><thead><tr><th width="6%">No</th><th width="12%">Kode</th><th width="26%">Nama Outlet</th><th width="10%">Sesi</th><th width="10%">Temuan</th><th width="18%">Kategori Terbanyak</th><th width="18%">Bagian Terbanyak</th></tr></thead><tbody>' + outletSummaryRows + '</tbody></table>' +
          '<h2 class="sec-title">2. Rekapitulasi Area Manager (AM) &amp; MUM</h2>' +
          '<table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="margin-bottom:6px;"><tr>' +
            '<td width="49%" valign="top">' +
              '<table class="tbl"><thead><tr><th>#</th><th>Nama AM</th><th>Outlet</th><th>Sesi</th><th>Temuan</th></tr></thead><tbody>' + amSummaryRows + '</tbody></table>' +
            '</td>' +
            '<td width="2%"></td>' +
            '<td width="49%" valign="top">' +
              '<table class="tbl"><thead><tr><th>#</th><th>Nama MUM</th><th>Outlet</th><th>Sesi</th><th>Temuan</th></tr></thead><tbody>' + mumSummaryRows + '</tbody></table>' +
            '</td>' +
          '</tr></table>' +
          '<h2 class="sec-title">3. 10 Kategori Temuan Terbanyak</h2>' +
          '<table class="tbl"><thead><tr><th width="8%">#</th><th>Kategori Temuan</th><th width="18%">Jumlah Sesi</th><th width="18%">Jumlah Temuan</th></tr></thead><tbody>' + topCatRows + '</tbody></table>' +
          '<h2 class="sec-title">4. Bagian (Section) Temuan Terbanyak</h2>' +
          '<table class="tbl"><thead><tr><th width="8%">#</th><th>Bagian / Section</th><th width="18%">Jumlah Sesi</th><th width="18%">Jumlah Temuan</th></tr></thead><tbody>' + topSecRows + '</tbody></table>' +
          '<h2 class="sec-title">5. Masalah Berulang (Recurring Issue — Perlu Perhatian Khusus)</h2>' +
          '<table class="tbl"><thead><tr><th>Outlet</th><th>Kategori</th><th>Sesi Unik</th><th>Total Temuan</th><th>Pemeriksaan Terakhir</th><th>Status</th></tr></thead><tbody>' + recRows + '</tbody></table>' +
          fullDetailsHtml +
        '</body></html>';

      var versionNum = nextPdfVersionNumber('DASHBOARD', normType);
      var fileName = 'TM-' + normType + '-REPORT-v' + versionNum + '.pdf';
      var pdfObj = convertHtmlToPdfBase64(html, fileName);

      var pdfVer = TM_Db.insertRecord('PDFHistory', {
        PDFVersionID: TM_Utils.generateId('PDF'),
        SessionID: 'DASHBOARD',
        ReportType: normType,
        VersionNumber: String(versionNum),
        GeneratedAt: TM_Utils.formatWibIso(),
        GeneratedBy: ctx.user.UserID,
        RecipientEmail: '',
        SendStatus: 'GENERATED_ONLY'
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'EXPORT_DATA',
        entityType: 'PDFHistory',
        entityId: pdfVer.PDFVersionID,
        afterData: {
          format: 'PDF',
          reportType: normType,
          filters: filters || {},
          versionNumber: versionNum
        },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Ekspor PDF ' + normType + ' Report sesuai filter Dashboard'
      });

      return {
        pdfVersion: pdfVer,
        fileName: fileName,
        mimeType: 'application/pdf',
        base64Data: pdfObj.base64Data,
        htmlPreview: html
      };
    });
  }

  return {
    generateSessionPdf: generateSessionPdf,
    sendSessionPdfEmail: sendSessionPdfEmail,
    getSessionPdfHistory: getSessionPdfHistory,
    listEmailLogsForAdmin: listEmailLogsForAdmin,
    generateDashboardReportPdf: generateDashboardReportPdf
  };
})();



/* ==================== FILE: Export.gs ==================== */
/**
 * Export.gs — Ekspor Data Excel (.xlsx) dan CSV (.csv) dalam Mode Simple (1 Tabel Gabungan)
 * dan Mode Structured (5 Bagian), mengikuti Filter Dashboard & Audit Log Ekspor (PRD Bagian 12).
 */

var TM_Export = (function () {
  function escXml(val) {
    return String(val === null || val === undefined ? '' : val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function escapeCsvCell(val) {
    var str = String(val === null || val === undefined ? '' : val);
    // Cegah CSV formula injection sambil menjaga keterbacaan
    if (/^[=+\-@]/.test(str)) {
      str = "'" + str;
    }
    if (str.indexOf('"') !== -1 || str.indexOf(',') !== -1 || str.indexOf('\n') !== -1 || str.indexOf('\r') !== -1) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function rowsToCsvString(headers, rows) {
    var lines = [];
    lines.push(headers.map(escapeCsvCell).join(','));
    for (var i = 0; i < rows.length; i++) {
      lines.push(rows[i].map(escapeCsvCell).join(','));
    }
    return lines.join('\r\n');
  }

  function colIndexToLetter(colIdxZeroBased) {
    var n = colIdxZeroBased + 1;
    var s = '';
    while (n > 0) {
      var mod = (n - 1) % 26;
      s = String.fromCharCode(65 + mod) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function buildWorksheetXml(headers, rows) {
    var allRows = [headers].concat(rows);
    var sheetDataXml = '';
    for (var r = 0; r < allRows.length; r++) {
      var rowNum = r + 1;
      var cells = allRows[r];
      var cellsXml = '';
      for (var c = 0; c < cells.length; c++) {
        var cellRef = colIndexToLetter(c) + rowNum;
        var val = cells[c];
        if (typeof val === 'number' && !isNaN(val)) {
          cellsXml += '<c r="' + cellRef + '"><v>' + val + '</v></c>';
        } else {
          cellsXml += '<c r="' + cellRef + '" t="inlineStr"><is><t>' + escXml(val) + '</t></is></c>';
        }
      }
      sheetDataXml += '<row r="' + rowNum + '">' + cellsXml + '</row>';
    }
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<sheetData>' + sheetDataXml + '</sheetData>' +
      '</worksheet>'
    );
  }

  // Generator ZIP tanpa kompresi (STORE) murni JS untuk membangun file .xlsx OpenXML standar
  var CRC_TABLE = (function () {
    var table = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) {
        out.push(code);
      } else if (code < 0x800) {
        out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        i++;
        code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        out.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f)
        );
      }
    }
    return out;
  }

  function crc32Bytes(byteArr) {
    var crc = 0xffffffff;
    for (var i = 0; i < byteArr.length; i++) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byteArr[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function pushUint16LE(arr, val) {
    arr.push(val & 0xff, (val >>> 8) & 0xff);
  }

  function pushUint32LE(arr, val) {
    arr.push(val & 0xff, (val >>> 8) & 0xff, (val >>> 16) & 0xff, (val >>> 24) & 0xff);
  }

  function buildZipArchiveBytes(entries) {
    var localParts = [];
    var centralParts = [];
    var offset = 0;

    for (var i = 0; i < entries.length; i++) {
      var nameBytes = utf8Bytes(entries[i].path);
      var dataBytes = utf8Bytes(entries[i].content);
      var crc = crc32Bytes(dataBytes);
      var size = dataBytes.length;

      var localHeader = [];
      pushUint32LE(localHeader, 0x04034b50); // Local file header signature
      pushUint16LE(localHeader, 20);         // Version needed
      pushUint16LE(localHeader, 0);          // Flags
      pushUint16LE(localHeader, 0);          // Compression method: 0 (STORE)
      pushUint16LE(localHeader, 0);          // Mod time
      pushUint16LE(localHeader, 0);          // Mod date
      pushUint32LE(localHeader, crc);
      pushUint32LE(localHeader, size);
      pushUint32LE(localHeader, size);
      pushUint16LE(localHeader, nameBytes.length);
      pushUint16LE(localHeader, 0);          // Extra field len

      var centralHeader = [];
      pushUint32LE(centralHeader, 0x02014b50); // Central directory signature
      pushUint16LE(centralHeader, 20);         // Version made by
      pushUint16LE(centralHeader, 20);         // Version needed
      pushUint16LE(centralHeader, 0);          // Flags
      pushUint16LE(centralHeader, 0);          // Compression: STORE
      pushUint16LE(centralHeader, 0);          // Mod time
      pushUint16LE(centralHeader, 0);          // Mod date
      pushUint32LE(centralHeader, crc);
      pushUint32LE(centralHeader, size);
      pushUint32LE(centralHeader, size);
      pushUint16LE(centralHeader, nameBytes.length);
      pushUint16LE(centralHeader, 0);          // Extra len
      pushUint16LE(centralHeader, 0);          // Comment len
      pushUint16LE(centralHeader, 0);          // Disk number
      pushUint16LE(centralHeader, 0);          // Internal attrs
      pushUint32LE(centralHeader, 0);          // External attrs
      pushUint32LE(centralHeader, offset);     // Relative offset

      localParts.push(localHeader, nameBytes, dataBytes);
      centralParts.push(centralHeader, nameBytes);

      offset += localHeader.length + nameBytes.length + dataBytes.length;
    }

    var centralSize = 0;
    for (var j = 0; j < centralParts.length; j++) {
      centralSize += centralParts[j].length;
    }

    var eocd = [];
    pushUint32LE(eocd, 0x06054b50); // End of central directory signature
    pushUint16LE(eocd, 0);          // Disk number
    pushUint16LE(eocd, 0);          // Start disk
    pushUint16LE(eocd, entries.length);
    pushUint16LE(eocd, entries.length);
    pushUint32LE(eocd, centralSize);
    pushUint32LE(eocd, offset);
    pushUint16LE(eocd, 0);          // Comment length

    var finalBytes = [];
    for (var a = 0; a < localParts.length; a++) {
      for (var b = 0; b < localParts[a].length; b++) finalBytes.push(localParts[a][b]);
    }
    for (var c = 0; c < centralParts.length; c++) {
      for (var d = 0; d < centralParts[c].length; d++) finalBytes.push(centralParts[c][d]);
    }
    for (var e = 0; e < eocd.length; e++) finalBytes.push(eocd[e]);
    return finalBytes;
  }

  function buildXlsxBase64(sheetsSpec) {
    var entries = [];
    var overrideTags = '';
    var sheetsTags = '';
    var workbookRelsTags = '';

    for (var i = 0; i < sheetsSpec.length; i++) {
      var idx = i + 1;
      var sheetPath = 'xl/worksheets/sheet' + idx + '.xml';
      entries.push({
        path: sheetPath,
        content: buildWorksheetXml(sheetsSpec[i].headers, sheetsSpec[i].rows)
      });
      overrideTags +=
        '<Override PartName="/' + sheetPath + '" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      sheetsTags +=
        '<sheet name="' + escXml(sheetsSpec[i].name.slice(0, 31)) + '" sheetId="' + idx + '" r:id="rId' + idx + '"/>';
      workbookRelsTags +=
        '<Relationship Id="rId' + idx + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + idx + '.xml"/>';
    }

    entries.push({
      path: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          overrideTags +
        '</Types>'
    });

    entries.push({
      path: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'
    });

    entries.push({
      path: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          '<sheets>' + sheetsTags + '</sheets>' +
        '</workbook>'
    });

    entries.push({
      path: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          workbookRelsTags +
        '</Relationships>'
    });

    var zipBytes = buildZipArchiveBytes(entries);
    return Utilities.base64Encode(zipBytes);
  }

  /**
   * Membangun dataset ekspor berdasarkan hasil filter Dashboard (PRD 12.1, 12.2, 12.3):
   * - Mengikuti filter Dashboard dan hak akses
   * - Draft dan data soft-deleted tidak masuk ekspor aktif
   * - Foto tidak ditanam sebagai gambar; hanya metadata / referensi yang aman (tanpa public URL)
   */
  function buildExportTables(filters) {
    var ds = TM_Dashboard.computeDashboardDataset(filters || {});

    // Tabel Simple (Satu Tabel Gabungan)
    var simpleHeaders = [
      'ReportNumber', 'SessionID', 'InspectionDate', 'OutletCode', 'OutletName',
      'TrainerName', 'AM_Name', 'MUM_Name', 'PIC_Name',
      'FindingID', 'CategoryName', 'SectionName', 'Masalah', 'Mengapa', 'Solusi',
      'PhotoCount', 'PhotoIDs', 'PhotoFileNames', 'PhotoComments'
    ];
    var simpleRows = [];

    for (var i = 0; i < ds.detailedSessions.length; i++) {
      var s = ds.detailedSessions[i];
      var fList = s.Findings || [];
      if (fList.length === 0) {
        simpleRows.push([
          s.ReportNumber, s.SessionID, s.InspectionDate, s.CanonicalOutletCode, s.CanonicalOutletName,
          s.TrainerName, s.AM_Name_Snapshot, s.MUM_Name_Snapshot, s.PIC_Name,
          '', 'Tanpa Temuan', '', '', '', '',
          0, '', '', ''
        ]);
      } else {
        for (var j = 0; j < fList.length; j++) {
          var f = fList[j];
          var phs = f.Photos || [];
          simpleRows.push([
            s.ReportNumber, s.SessionID, s.InspectionDate, s.CanonicalOutletCode, s.CanonicalOutletName,
            s.TrainerName, s.AM_Name_Snapshot, s.MUM_Name_Snapshot, s.PIC_Name,
            f.FindingID, f.CategoryNameSnapshot, f.SectionNameSnapshot, f.Masalah, f.Mengapa, f.Solusi || '',
            phs.length,
            phs.map(function (p) { return p.PhotoID; }).join('; '),
            phs.map(function (p) { return p.FileName; }).join('; '),
            phs.map(function (p) { return p.PhotoComment || '-'; }).join(' | ')
          ]);
        }
      }
    }

    // 5 Bagian Terstruktur (PRD 12.1 & 12.2):
    // 1. Ringkasan KPI
    var part1Kpi = {
      name: '1_Ringkasan_KPI',
      headers: ['Metrik KPI', 'Nilai', 'Keterangan'],
      rows: [
        ['Total Pemeriksaan', ds.kpi.totalInspections, 'Sesi Selesai aktif (termasuk sesi selesai tanpa temuan)'],
        ['Total Temuan Aktif', ds.kpi.totalActiveFindings, 'Temuan aktif pada sesi Selesai'],
        ['Outlet Diperiksa', ds.kpi.inspectedOutlets, 'Jumlah Outlet unik yang telah diperiksa'],
        ['Masalah Berulang (Recurring Issue)', ds.kpi.recurringIssuesCount, 'Pasangan unik Outlet + Kategori pada >= 2 sesi berbeda'],
        ['Outlet Terdampak Masalah Berulang', ds.kpi.recurringAffectedOutletsCount, 'Jumlah Outlet yang mengalami masalah berulang']
      ]
    };

    // 2. Data Sesi Pemeriksaan
    var part2Sessions = {
      name: '2_Data_Sesi_Pemeriksaan',
      headers: [
        'SessionID', 'ReportNumber', 'InspectionDate', 'CanonicalOutletID', 'OutletCode', 'OutletName',
        'TrainerID', 'TrainerName', 'AM_ID', 'AM_Name', 'MUM_ID', 'MUM_Name', 'PIC_Name', 'FindingCount', 'SubmittedAt'
      ],
      rows: ds.detailedSessions.map(function (s) {
        return [
          s.SessionID, s.ReportNumber, s.InspectionDate, s.CanonicalOutletID, s.CanonicalOutletCode, s.CanonicalOutletName,
          s.TrainerID, s.TrainerName, s.AM_ID, s.AM_Name_Snapshot, s.MUM_ID, s.MUM_Name_Snapshot, s.PIC_Name,
          (s.Findings || []).length, s.SubmittedAt
        ];
      })
    };

    // 3. Detail Temuan
    var part3FindingsRows = [];
    // 4. Data Foto Bukti (Hanya metadata/referensi aman tanpa gambar & tanpa public Drive link)
    var part4PhotosRows = [];

    for (var si = 0; si < ds.detailedSessions.length; si++) {
      var ses = ds.detailedSessions[si];
      var findings = ses.Findings || [];
      for (var fi = 0; fi < findings.length; fi++) {
        var fnd = findings[fi];
        var photos = fnd.Photos || [];
        part3FindingsRows.push([
          fnd.FindingID, ses.SessionID, ses.ReportNumber, ses.InspectionDate,
          ses.CanonicalOutletCode, ses.CanonicalOutletName, ses.TrainerName,
          ses.AM_Name_Snapshot || '', ses.MUM_Name_Snapshot || '', ses.PIC_Name || '',
          fnd.CategoryID, fnd.CategoryNameSnapshot, fnd.SectionID, fnd.SectionNameSnapshot,
          fnd.Masalah, fnd.Mengapa, fnd.Solusi || '', photos.length,
          photos.map(function (p) { return p.PhotoComment || '-'; }).join(' | ')
        ]);
        for (var pi = 0; pi < photos.length; pi++) {
          var ph = photos[pi];
          part4PhotosRows.push([
            ph.PhotoID, fnd.FindingID, ses.SessionID, ses.ReportNumber,
            ses.InspectionDate, ses.CanonicalOutletCode, ses.CanonicalOutletName,
            fnd.CategoryNameSnapshot, fnd.SectionNameSnapshot,
            ph.FileName, ph.MimeType, Number(ph.FileSize || 0),
            ph.PhotoComment || '', ph.Status || 'Berhasil', ph.UploadedAt
          ]);
        }
      }
    }

    var part3Findings = {
      name: '3_Detail_Temuan',
      headers: [
        'FindingID', 'SessionID', 'ReportNumber', 'InspectionDate',
        'OutletCode', 'OutletName', 'TrainerName',
        'AM_Name', 'MUM_Name', 'PIC_Name',
        'CategoryID', 'CategoryName', 'SectionID', 'SectionName',
        'Masalah', 'Mengapa', 'Solusi', 'PhotoCount', 'PhotoComments'
      ],
      rows: part3FindingsRows
    };

    var part4Photos = {
      name: '4_Data_Foto_Bukti',
      headers: [
        'PhotoID', 'FindingID', 'SessionID', 'ReportNumber',
        'InspectionDate', 'OutletCode', 'OutletName',
        'CategoryName', 'SectionName',
        'FileName', 'MimeType', 'FileSizeBytes',
        'PhotoComment', 'UploadStatus', 'UploadedAt'
      ],
      rows: part4PhotosRows
    };

    // 5. Top Issue dan Recurring Issue
    var part5Rows = [];
    for (var ti = 0; ti < ds.overallTopIssues.length; ti++) {
      var top = ds.overallTopIssues[ti];
      part5Rows.push([
        'TOP_ISSUE', '', '', top.categoryName, top.sectionName,
        top.sessionCount, top.findingCount, 'Normal'
      ]);
    }
    for (var ri = 0; ri < ds.recurringIssues.length; ri++) {
      var rec = ds.recurringIssues[ri];
      part5Rows.push([
        'RECURRING_ISSUE', rec.outletCode, rec.outletName, rec.categoryName, '',
        rec.sessionCount, rec.findingCount, rec.label || 'Perlu perhatian khusus'
      ]);
    }

    var part5TopAndRecurring = {
      name: '5_Top_Dan_Recurring',
      headers: [
        'TipeAnalisis', 'OutletCode', 'OutletName', 'CategoryName', 'SectionName',
        'JumlahSesiUnik', 'TotalTemuan', 'PenandaStatus'
      ],
      rows: part5Rows
    };

    return {
      simple: {
        name: 'Data_Pemeriksaan_Gabungan',
        headers: simpleHeaders,
        rows: simpleRows
      },
      structured: [
        part1Kpi,
        part2Sessions,
        part3Findings,
        part4Photos,
        part5TopAndRecurring
      ]
    };
  }

  /**
   * Ekspor Data ke Excel (.xlsx) atau CSV (.csv) dengan Mode SIMPLE atau STRUCTURED (PRD Bagian 12).
   */
  function exportData(token, format, mode, filters) {
    var ctx = TM_Auth.requireAuth(token, [
      TM_CONFIG.ROLES.SUPER_ADMIN,
      TM_CONFIG.ROLES.TRAINER,
      TM_CONFIG.ROLES.MANAJEMEN
    ]);

    var normFormat = String(format || 'EXCEL').toUpperCase() === 'CSV' ? 'CSV' : 'EXCEL';
    var normMode = String(mode || 'SIMPLE').toUpperCase() === 'STRUCTURED' ? 'STRUCTURED' : 'SIMPLE';
    var tables = buildExportTables(filters || {});
    var dateStamp = TM_Utils.formatWibIso().slice(0, 10).replace(/-/g, '');

    var resultPayload = null;

    if (normFormat === 'EXCEL') {
      var sheetsToBuild = normMode === 'STRUCTURED' ? tables.structured : [tables.simple];
      var b64Xlsx = buildXlsxBase64(sheetsToBuild);
      var fileName = 'TM-Export-' + normMode + '-' + dateStamp + '.xlsx';
      resultPayload = {
        format: 'EXCEL',
        mode: normMode,
        fileName: fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        base64Data: b64Xlsx,
        sheetNames: sheetsToBuild.map(function (s) { return s.name; }),
        previewTables: sheetsToBuild
      };
    } else {
      // CSV: SIMPLE -> 1 file gabungan; STRUCTURED -> 5 file terpisah untuk setiap bagian (PRD 12.2)
      if (normMode === 'SIMPLE') {
        var csvText = rowsToCsvString(tables.simple.headers, tables.simple.rows);
        resultPayload = {
          format: 'CSV',
          mode: 'SIMPLE',
          files: [
            {
              partName: tables.simple.name,
              fileName: 'TM-Export-SIMPLE-' + dateStamp + '.csv',
              mimeType: 'text/csv;charset=utf-8;',
              csvContent: csvText
            }
          ]
        };
      } else {
        var csvFiles = tables.structured.map(function (part) {
          return {
            partName: part.name,
            fileName: 'TM-Export-' + part.name + '-' + dateStamp + '.csv',
            mimeType: 'text/csv;charset=utf-8;',
            csvContent: rowsToCsvString(part.headers, part.rows)
          };
        });
        resultPayload = {
          format: 'CSV',
          mode: 'STRUCTURED',
          files: csvFiles
        };
      }
    }

    // Catat Audit Ekspor (PRD 12.4: Pengguna, Waktu, Format, Filter, Jenis Laporan)
    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'EXPORT_DATA',
      entityType: 'Export',
      entityId: normFormat + '_' + normMode + '_' + dateStamp,
      afterData: {
        userId: ctx.user.UserID,
        timestamp: TM_Utils.formatWibIso(),
        format: normFormat,
        reportType: normMode,
        filters: filters || {}
      },
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Ekspor data ' + normFormat + ' (' + normMode + ') sesuai filter Dashboard'
    });

    return resultPayload;
  }

  return {
    buildExportTables: buildExportTables,
    exportData: exportData
  };
})();



/* ==================== FILE: Notifications.gs ==================== */
/**
 * Notifications.gs — Pusat Notifikasi (In-App & Email), Status Read/Unread,
 * Preferensi Pengguna (NotificationPreferences), Kebijakan Notifikasi Wajib Super Admin,
 * & Pemantauan / Retry Kegagalan Pengiriman Email (PRD Bagian 14).
 */

var TM_Notifications = (function () {
  var MANDATORY_SETTING_KEY = 'MANDATORY_NOTIFICATION_TYPES';

  var CATALOG = [
    {
      type: 'SESSION_ACTIVITY',
      label: 'Aktivitas Penyimpanan & Finalisasi Sesi',
      description: 'Pemberitahuan ketika sesi pemeriksaan berhasil difinalisasi.',
      systemLockedMandatory: false,
      defaultMandatory: false,
      defaultInApp: true,
      defaultEmail: false
    },
    {
      type: 'DATA_MODIFICATION_DELETION',
      label: 'Perubahan atau Penghapusan Data',
      description: 'Pemberitahuan ketika sesi, temuan, atau Draft diubah/dihapus.',
      systemLockedMandatory: false,
      defaultMandatory: true,
      defaultInApp: true,
      defaultEmail: false
    },
    {
      type: 'DRAFT_RESTORE_WORKFLOW',
      label: 'Permintaan & Keputusan Pemulihan Draft',
      description: 'Pemberitahuan pengajuan pemulihan Draft oleh Trainer serta keputusan Super Admin.',
      systemLockedMandatory: false,
      defaultMandatory: true,
      defaultInApp: true,
      defaultEmail: true
    },
    {
      type: 'ACCOUNT_SECURITY',
      label: 'Aktivitas Keamanan Akun (Wajib & Kritis)',
      description: 'Pemberitahuan lockout akun, reset password, dan perubahan keamanan penting.',
      systemLockedMandatory: true,
      defaultMandatory: true,
      defaultInApp: true,
      defaultEmail: true
    },
    {
      type: 'BACKUP_RESULT',
      label: 'Hasil Backup',
      description: 'Pemberitahuan ketika backup harian atau manual berhasil dijalankan.',
      systemLockedMandatory: false,
      defaultMandatory: false,
      defaultInApp: true,
      defaultEmail: false
    },
    {
      type: 'BACKUP_FAILURE',
      label: 'Kegagalan Backup (Wajib & Kritis)',
      description: 'Peringatan kritis kepada Super Admin ketika proses backup atau restore mengalami kegagalan.',
      systemLockedMandatory: true,
      defaultMandatory: true,
      defaultInApp: true,
      defaultEmail: true
    },
    {
      type: 'REPORT_DELIVERY_STATUS',
      label: 'Status Pengiriman Laporan',
      description: 'Pemberitahuan status pengiriman atau kegagalan pengiriman email laporan PDF.',
      systemLockedMandatory: false,
      defaultMandatory: false,
      defaultInApp: true,
      defaultEmail: false
    }
  ];

  // Pemetaan alias tipe lama (dari Phase 5/6) ke kategori standar PRD 14.3
  var LEGACY_TYPE_MAP = {
    DRAFT_DELETED_BY_ADMIN: 'DATA_MODIFICATION_DELETION',
    SYNC_STOPPED_DRAFT_DELETED: 'DATA_MODIFICATION_DELETION',
    SYNC_CONFLICT: 'DATA_MODIFICATION_DELETION',
    DRAFT_RESTORE_REQUESTED: 'DRAFT_RESTORE_WORKFLOW',
    DRAFT_RESTORE_APPROVED: 'DRAFT_RESTORE_WORKFLOW',
    DRAFT_RESTORE_REJECTED: 'DRAFT_RESTORE_WORKFLOW'
  };

  function resolveCatalogItem(rawType) {
    var mapped = LEGACY_TYPE_MAP[rawType] || rawType;
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].type === mapped) return CATALOG[i];
    }
    return null;
  }

  function getMandatoryTypesMap() {
    var map = {};
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].defaultMandatory || CATALOG[i].systemLockedMandatory) {
        map[CATALOG[i].type] = true;
      }
    }
    var settingRec = TM_Db.findById('AppSettings', 'SettingKey', MANDATORY_SETTING_KEY);
    if (settingRec && settingRec.SettingValue) {
      try {
        var customArr = JSON.parse(settingRec.SettingValue);
        if (Array.isArray(customArr)) {
          map = {};
          for (var j = 0; j < customArr.length; j++) {
            map[customArr[j]] = true;
          }
        }
      } catch (_) {}
    }
    // Pastikan notifikasi keamanan & backup kritis tidak pernah bisa dinonaktifkan (PRD 14.2)
    for (var k = 0; k < CATALOG.length; k++) {
      if (CATALOG[k].systemLockedMandatory) {
        map[CATALOG[k].type] = true;
      }
    }
    return map;
  }

  function getEffectiveUserPreference(userId, rawType) {
    var catItem = resolveCatalogItem(rawType);
    var canonicalType = catItem ? catItem.type : rawType;
    var mandatoryMap = getMandatoryTypesMap();
    var isMandatory = Boolean(mandatoryMap[canonicalType] || (catItem && catItem.systemLockedMandatory));

    var prefRec = TM_Db.findRecord('NotificationPreferences', function (p) {
      return p.UserID === userId && p.NotificationType === canonicalType;
    });

    var inApp = catItem ? catItem.defaultInApp : true;
    var email = catItem ? catItem.defaultEmail : false;

    if (prefRec) {
      inApp = String(prefRec.InAppEnabled).toUpperCase() === 'TRUE';
      email = String(prefRec.EmailEnabled).toUpperCase() === 'TRUE';
    }

    // Jika wajib, kanal In-App wajib aktif, dan untuk keamanan/backup kritis kedua kanal wajib aktif
    if (isMandatory) {
      inApp = true;
      if (catItem && catItem.systemLockedMandatory) {
        email = true;
      }
    }

    return {
      type: canonicalType,
      isMandatory: isMandatory,
      systemLockedMandatory: Boolean(catItem && catItem.systemLockedMandatory),
      inAppEnabled: inApp,
      emailEnabled: email
    };
  }

  /**
   * Mengirim notifikasi sesuai kanal dan preferensi (PRD 14.1 - 14.4).
   * - Menolak tegas pembuatan pengingat berkala khusus untuk Draft (PRD 14.3).
   */
  function dispatchNotification(opts) {
    var o = opts || {};
    var userId = TM_Utils.sanitizeText(o.userId);
    var rawType = TM_Utils.sanitizeText(o.type) || 'SESSION_ACTIVITY';
    var title = TM_Utils.sanitizeText(o.title);
    var message = TM_Utils.sanitizeText(o.message);
    var relatedEntityId = TM_Utils.sanitizeText(o.relatedEntityId);
    var metadata = o.metadata || {};

    // PRD 14.3: Tidak ada pengingat email atau pengingat berkala khusus untuk Draft
    if (rawType === 'DRAFT_REMINDER' || rawType === 'DRAFT_PERIODIC_REMINDER') {
      throw TM_Utils.AppError('ERR_FORBIDDEN_NOTIFICATION_TYPE', 'Pengingat berkala atau email khusus Draft tidak diizinkan oleh kebijakan sistem.');
    }

    if (!userId || !title) return null;

    var user = TM_Db.findById('Users', 'UserID', userId);
    var pref = getEffectiveUserPreference(userId, rawType);
    var nowIso = TM_Utils.formatWibIso();
    var createdNotif = null;

    if (pref.inAppEnabled || o.forceInApp) {
      createdNotif = TM_Db.insertRecord('Notifications', {
        NotificationID: TM_Utils.generateId('NTF'),
        UserID: userId,
        Type: rawType,
        Title: title,
        Message: message,
        RelatedEntityID: relatedEntityId,
        MetadataJSON: JSON.stringify(metadata),
        ReadAt: '',
        CreatedAt: nowIso
      });
    }

    if ((pref.emailEnabled || o.forceEmail) && user && user.Email && user.Status === TM_CONFIG.STATUS.ACTIVE) {
      var branding = TM_Settings.getPublicBranding();
      var subject = '[' + branding.companyName + '] ' + title;
      var bodyText =
        'Halo ' + user.Name + ',\n\n' +
        message + '\n\n' +
        'Waktu: ' + nowIso + '\n' +
        'Salam,\n' + branding.companyName;

      var emailStatus = 'Berhasil';
      var failureReason = '';
      try {
        MailApp.sendEmail({
          to: user.Email,
          subject: subject,
          body: bodyText
        });
      } catch (err) {
        emailStatus = 'Gagal';
        failureReason = err && err.message ? err.message : String(err);
      }

      TM_Db.insertRecord('EmailLogs', {
        EmailLogID: TM_Utils.generateId('EML'),
        SessionID: relatedEntityId || (createdNotif ? createdNotif.NotificationID : 'NOTIF'),
        Recipient: user.Email,
        PDFVersionID: 'NOTIF::' + pref.type + '::' + encodeURIComponent(subject),
        AttemptAt: nowIso,
        Status: emailStatus,
        FailureReason: failureReason
      });
    }

    return createdNotif;
  }

  /**
   * Mengambil daftar notifikasi pengguna beserta filter status baca & jenis (PRD 14.3).
   */
  function listMyNotificationsCenter(token, filterDto) {
    var ctx = TM_Auth.requireAuth(token);
    var f = filterDto || {};
    var statusFilter = String(f.status || 'ALL').toUpperCase(); // ALL | UNREAD | READ
    var typeFilter = TM_Utils.sanitizeText(f.type);

    var allMine = TM_Db.filterRecords('Notifications', function (n) {
      return n.UserID === ctx.user.UserID;
    });

    var unreadCount = 0;
    for (var i = 0; i < allMine.length; i++) {
      if (!allMine[i].ReadAt) unreadCount++;
    }

    var filtered = allMine.filter(function (n) {
      if (statusFilter === 'UNREAD' && n.ReadAt) return false;
      if (statusFilter === 'READ' && !n.ReadAt) return false;
      if (typeFilter) {
        var cat = resolveCatalogItem(n.Type);
        var canon = cat ? cat.type : n.Type;
        if (n.Type !== typeFilter && canon !== typeFilter) return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      return String(b.CreatedAt).localeCompare(String(a.CreatedAt));
    });

    return {
      unreadCount: unreadCount,
      totalCount: allMine.length,
      items: filtered
    };
  }

  function setNotificationReadStatus(token, notificationId, isRead) {
    var ctx = TM_Auth.requireAuth(token);
    var notif = TM_Db.findById('Notifications', 'NotificationID', notificationId);
    if (!notif || notif.UserID !== ctx.user.UserID) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Notifikasi tidak ditemukan.');
    }
    var updated = TM_Db.updateRecordById('Notifications', 'NotificationID', notificationId, function (rec) {
      rec.ReadAt = isRead ? TM_Utils.formatWibIso() : '';
      return rec;
    });
    return updated;
  }

  function markAllMyNotificationsRead(token) {
    var ctx = TM_Auth.requireAuth(token);
    var nowIso = TM_Utils.formatWibIso();
    var allMineUnread = TM_Db.filterRecords('Notifications', function (n) {
      return n.UserID === ctx.user.UserID && !n.ReadAt;
    });
    for (var i = 0; i < allMineUnread.length; i++) {
      TM_Db.updateRecordById('Notifications', 'NotificationID', allMineUnread[i].NotificationID, function (rec) {
        rec.ReadAt = nowIso;
        return rec;
      });
    }
    return { markedCount: allMineUnread.length };
  }

  /**
   * Mengambil preferensi notifikasi pengguna & kebijakan notifikasi wajib saat ini (PRD 14.2).
   */
  function getMyNotificationPreferences(token) {
    var ctx = TM_Auth.requireAuth(token);
    var mandatoryMap = getMandatoryTypesMap();

    var items = CATALOG.map(function (cat) {
      var eff = getEffectiveUserPreference(ctx.user.UserID, cat.type);
      return {
        type: cat.type,
        label: cat.label,
        description: cat.description,
        isMandatory: Boolean(mandatoryMap[cat.type] || cat.systemLockedMandatory),
        systemLockedMandatory: cat.systemLockedMandatory,
        inAppEnabled: eff.inAppEnabled,
        emailEnabled: eff.emailEnabled
      };
    });

    return {
      userId: ctx.user.UserID,
      preferences: items
    };
  }

  /**
   * Menyimpan preferensi notifikasi pengguna (PRD 14.2).
   * Menolak upaya menonaktifkan notifikasi wajib / keamanan / backup kritis!
   */
  function updateMyNotificationPreference(token, prefDto) {
    var ctx = TM_Auth.requireAuth(token);
    var d = prefDto || {};
    var type = TM_Utils.sanitizeText(d.type);
    var catItem = resolveCatalogItem(type);
    if (!catItem) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Jenis notifikasi tidak dikenal.');
    }

    var mandatoryMap = getMandatoryTypesMap();
    var isMandatory = Boolean(mandatoryMap[catItem.type] || catItem.systemLockedMandatory);
    var wantInApp = Boolean(d.inAppEnabled);
    var wantEmail = Boolean(d.emailEnabled);

    if (catItem.systemLockedMandatory && (!wantInApp || !wantEmail)) {
      throw TM_Utils.AppError(
        'ERR_MANDATORY_NOTIFICATION',
        'Notifikasi keamanan dan backup kritis bersifat wajib dan tidak boleh dinonaktifkan.'
      );
    }
    if (isMandatory && !wantInApp) {
      throw TM_Utils.AppError(
        'ERR_MANDATORY_NOTIFICATION',
        'Notifikasi "' + catItem.label + '" ditetapkan sebagai notifikasi wajib oleh Super Admin dan tidak dapat dinonaktifkan.'
      );
    }

    return TM_Db.withLock(function () {
      var existing = TM_Db.findRecord('NotificationPreferences', function (p) {
        return p.UserID === ctx.user.UserID && p.NotificationType === catItem.type;
      });

      var saved = null;
      if (existing) {
        saved = TM_Db.updateRecordById('NotificationPreferences', 'PreferenceID', existing.PreferenceID, function (rec) {
          rec.InAppEnabled = wantInApp ? 'TRUE' : 'FALSE';
          rec.EmailEnabled = wantEmail ? 'TRUE' : 'FALSE';
          return rec;
        });
      } else {
        saved = TM_Db.insertRecord('NotificationPreferences', {
          PreferenceID: TM_Utils.generateId('PRF'),
          UserID: ctx.user.UserID,
          NotificationType: catItem.type,
          InAppEnabled: wantInApp ? 'TRUE' : 'FALSE',
          EmailEnabled: wantEmail ? 'TRUE' : 'FALSE'
        });
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'UPDATE_NOTIFICATION_PREFERENCE',
        entityType: 'NotificationPreferences',
        entityId: saved.PreferenceID,
        beforeData: existing,
        afterData: saved,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Mengubah preferensi notifikasi ' + catItem.type
      });

      return getEffectiveUserPreference(ctx.user.UserID, catItem.type);
    });
  }

  /**
   * Super Admin mengatur jenis notifikasi mana saja yang menjadi Notifikasi Wajib (PRD 14.2).
   * ACCOUNT_SECURITY dan BACKUP_FAILURE selalu dikunci sebagai wajib.
   */
  function updateMandatoryNotificationPolicy(token, mandatoryTypesArray) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var incoming = Array.isArray(mandatoryTypesArray) ? mandatoryTypesArray : [];
    var finalSet = {};

    for (var i = 0; i < incoming.length; i++) {
      var c = resolveCatalogItem(incoming[i]);
      if (c) finalSet[c.type] = true;
    }
    // Pastikan keamanan & backup kritis tidak pernah bisa dimatikan
    for (var j = 0; j < CATALOG.length; j++) {
      if (CATALOG[j].systemLockedMandatory) {
        finalSet[CATALOG[j].type] = true;
      }
    }

    var finalList = Object.keys(finalSet);
    return TM_Db.withLock(function () {
      var existing = TM_Db.findById('AppSettings', 'SettingKey', MANDATORY_SETTING_KEY);
      var nowIso = TM_Utils.formatWibIso();
      if (existing) {
        TM_Db.updateRecordById('AppSettings', 'SettingKey', MANDATORY_SETTING_KEY, function (rec) {
          rec.SettingValue = JSON.stringify(finalList);
          rec.UpdatedAt = nowIso;
          rec.UpdatedBy = ctx.user.UserID;
          return rec;
        });
      } else {
        TM_Db.insertRecord('AppSettings', {
          SettingKey: MANDATORY_SETTING_KEY,
          SettingValue: JSON.stringify(finalList),
          UpdatedAt: nowIso,
          UpdatedBy: ctx.user.UserID
        });
      }

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'UPDATE_MANDATORY_NOTIFICATION_POLICY',
        entityType: 'AppSettings',
        entityId: MANDATORY_SETTING_KEY,
        beforeData: existing,
        afterData: { mandatoryTypes: finalList },
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Super Admin memperbarui kebijakan jenis notifikasi wajib'
      });

      return { mandatoryTypes: finalList };
    });
  }

  /**
   * Super Admin mencoba ulang (retry) pengiriman email yang gagal pada EmailLogs (PRD 14.4).
   */
  function retryFailedEmailLog(token, emailLogId) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var logRec = TM_Db.findById('EmailLogs', 'EmailLogID', emailLogId);
    if (!logRec) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Catatan log email tidak ditemukan.');
    }
    if (logRec.Status === 'Berhasil') {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Email ini sudah berstatus Berhasil.');
    }

    // Jika email tersebut adalah email PDF sesi, gunakan alur pengiriman ulang PDF sesi
    if (logRec.PDFVersionID && String(logRec.PDFVersionID).indexOf('NOTIF::') !== 0) {
      return TM_Reporting.sendSessionPdfEmail(token, logRec.SessionID, logRec.Recipient, true);
    }

    // Jika email tersebut adalah email notifikasi
    var parts = String(logRec.PDFVersionID || '').split('::');
    var subject = parts[2] ? decodeURIComponent(parts[2]) : '[Trainer Monitoring] Pemberitahuan Sistem (Pengiriman Ulang)';
    var nowIso = TM_Utils.formatWibIso();
    var newStatus = 'Berhasil';
    var newFailReason = '';

    try {
      MailApp.sendEmail({
        to: logRec.Recipient,
        subject: subject,
        body: 'Pemberitahuan ulang otomatis dari sistem Trainer Monitoring untuk referensi: ' + logRec.SessionID
      });
    } catch (err) {
      newStatus = 'Gagal';
      newFailReason = err && err.message ? err.message : String(err);
    }

    var updated = TM_Db.updateRecordById('EmailLogs', 'EmailLogID', emailLogId, function (rec) {
      rec.AttemptAt = nowIso;
      rec.Status = newStatus;
      rec.FailureReason = newFailReason;
      return rec;
    });

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'RETRY_FAILED_EMAIL',
      entityType: 'EmailLogs',
      entityId: emailLogId,
      beforeData: logRec,
      afterData: updated,
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Retry pengiriman email ' + emailLogId + ' ke ' + logRec.Recipient + ' (' + newStatus + ')'
    });

    return {
      status: newStatus,
      emailLog: updated,
      failureReason: newFailReason
    };
  }

  return {
    CATALOG: CATALOG,
    dispatchNotification: dispatchNotification,
    listMyNotificationsCenter: listMyNotificationsCenter,
    setNotificationReadStatus: setNotificationReadStatus,
    markAllMyNotificationsRead: markAllMyNotificationsRead,
    getMyNotificationPreferences: getMyNotificationPreferences,
    updateMyNotificationPreference: updateMyNotificationPreference,
    updateMandatoryNotificationPolicy: updateMandatoryNotificationPolicy,
    retryFailedEmailLog: retryFailedEmailLog
  };
})();



/* ==================== FILE: Backup.gs ==================== */
/**
 * Backup.gs — Backup Otomatis Harian & Manual, Label Important, Retensi 90 Hari,
 * 8 Langkah Safe Restore (Pre-Restore Backup, Validasi Integritas/Relasi/Foto, & Rollback Otomatis),
 * serta Manajemen Arsip Foto & Purge Manual dengan Alasan Wajib (PRD Bagian 13 & 15).
 */

var TM_Backup = (function () {
  var DAY_MS = 24 * 3600000;

  var DATA_SHEETS_TO_BACKUP = [
    'Users',
    'AuthSessions',
    'Categories',
    'Sections',
    'Master_AM',
    'Master_MUM',
    'Outlets',
    'OutletAliases',
    'Sessions',
    'Findings',
    'Photos',
    'AuditLogs',
    'Notifications',
    'NotificationPreferences',
    'DraftRestoreRequests',
    'SyncMetadata',
    'PDFHistory',
    'EmailLogs',
    'AppSettings'
  ];

  function notifyAllSuperAdmins(type, title, message, relatedId, metadata) {
    if (typeof TM_Notifications === 'undefined' || !TM_Notifications.dispatchNotification) return;
    var admins = TM_Db.filterRecords('Users', function (u) {
      return u.Role === TM_CONFIG.ROLES.SUPER_ADMIN && u.Status === TM_CONFIG.STATUS.ACTIVE;
    });
    for (var i = 0; i < admins.length; i++) {
      TM_Notifications.dispatchNotification({
        userId: admins[i].UserID,
        type: type,
        title: title,
        message: message,
        relatedEntityId: relatedId || '',
        metadata: metadata || {}
      });
    }
  }

  function buildFullSystemSnapshot() {
    var tables = {};
    for (var i = 0; i < DATA_SHEETS_TO_BACKUP.length; i++) {
      var sName = DATA_SHEETS_TO_BACKUP[i];
      tables[sName] = TM_Db.getAllRecords(sName);
    }

    // Sertakan manifest & salinan biner foto di Drive (PRD 15.2 & 24.7)
    var photos = tables.Photos || [];
    var drivePhotos = {};
    for (var p = 0; p < photos.length; p++) {
      var ph = photos[p];
      if (ph.DriveFileID && !ph.PurgedAt) {
        try {
          var f = DriveApp.getFileById(ph.DriveFileID);
          if (!f.isTrashed || !f.isTrashed()) {
            var blob = f.getBlob();
            drivePhotos[ph.DriveFileID] = {
              driveFileId: ph.DriveFileID,
              photoId: ph.PhotoID,
              fileName: ph.FileName || blob.getName(),
              mimeType: ph.MimeType || blob.getContentType(),
              base64Data: Utilities.base64Encode(blob.getBytes())
            };
          }
        } catch (_) {}
      }
    }

    var props = TM_Db.getProps();
    var metadata = {
      schemaVersion: props.getProperty(TM_CONFIG.PROP_KEYS.SCHEMA_VERSION) || TM_CONFIG.SCHEMA_VERSION,
      bootstrapCompletedAt: props.getProperty(TM_CONFIG.PROP_KEYS.BOOTSTRAP_COMPLETED_AT) || '',
      createdAt: TM_Utils.formatWibIso(),
      summary: {
        usersCount: (tables.Users || []).length,
        outletsCount: (tables.Outlets || []).length,
        sessionsCount: (tables.Sessions || []).length,
        findingsCount: (tables.Findings || []).length,
        photosCount: (tables.Photos || []).length,
        auditLogsCount: (tables.AuditLogs || []).length
      }
    };

    return {
      metadata: metadata,
      tables: tables,
      drivePhotos: drivePhotos
    };
  }

  function performBackupInternal(userId, deviceInfo, backupType, isImportant, description) {
    var nowIso = TM_Utils.formatWibIso();
    var backupId = TM_Utils.generateId('BKP');
    var props = TM_Db.getProps();
    var backupsFolderId = props.getProperty(TM_CONFIG.PROP_KEYS.DRIVE_BACKUPS_ID);

    try {
      if (!backupsFolderId) {
        throw TM_Utils.AppError('ERR_BACKUP_STORAGE', 'Folder Drive Backups belum terkonfigurasi.');
      }
      var snapshot = buildFullSystemSnapshot();
      snapshot.metadata.backupId = backupId;
      snapshot.metadata.backupType = backupType;
      snapshot.metadata.important = Boolean(isImportant);
      snapshot.metadata.description = description || '';

      var serialized = JSON.stringify(snapshot);
      var bytes = Utilities.base64Decode(Utilities.base64Encode(
        typeof Buffer !== 'undefined' ? Buffer.from(serialized, 'utf8') : serialized.split('').map(function (c) { return c.charCodeAt(0); })
      ));
      var fileName = backupId + '-' + backupType + '.json';
      var blob = Utilities.newBlob(bytes, 'application/json', fileName);
      var folder = DriveApp.getFolderById(backupsFolderId);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

      var row = TM_Db.insertRecord('BackupHistory', {
        BackupID: backupId,
        BackupType: backupType,
        BackupDate: nowIso,
        Status: 'Berhasil',
        Size: String(serialized.length),
        Important: isImportant ? 'TRUE' : 'FALSE',
        Result: description
          ? ('Berhasil (' + description + ') — ' + snapshot.metadata.summary.sessionsCount + ' sesi, ' + snapshot.metadata.summary.photosCount + ' foto')
          : ('Berhasil — ' + snapshot.metadata.summary.sessionsCount + ' sesi, ' + snapshot.metadata.summary.photosCount + ' foto'),
        StorageReference: file.getId()
      });

      TM_Audit.logEvent({
        userId: userId || 'SYSTEM',
        action: 'CREATE_BACKUP',
        entityType: 'BackupHistory',
        entityId: backupId,
        afterData: {
          backupType: backupType,
          important: Boolean(isImportant),
          sizeBytes: serialized.length,
          summary: snapshot.metadata.summary
        },
        deviceInfo: deviceInfo || 'SYSTEM',
        description: 'Membuat backup ' + backupType + (isImportant ? ' [IMPORTANT]' : '')
      });

      if (backupType !== 'PRE_RESTORE') {
        notifyAllSuperAdmins(
          'BACKUP_RESULT',
          'Backup ' + backupType + ' Berhasil',
          'Backup "' + backupId + '" (' + backupType + ') berhasil disimpan pada ' + nowIso + '.',
          backupId,
          { backupId: backupId, backupType: backupType }
        );
      }

      return {
        backup: row,
        summary: snapshot.metadata.summary
      };
    } catch (err) {
      var errMsg = err && err.message ? err.message : String(err);
      var failedRow = TM_Db.insertRecord('BackupHistory', {
        BackupID: backupId,
        BackupType: backupType,
        BackupDate: nowIso,
        Status: 'Gagal',
        Size: '0',
        Important: isImportant ? 'TRUE' : 'FALSE',
        Result: 'Gagal: ' + errMsg,
        StorageReference: ''
      });

      TM_Audit.logEvent({
        userId: userId || 'SYSTEM',
        action: 'BACKUP_FAILED',
        entityType: 'BackupHistory',
        entityId: backupId,
        afterData: { backupType: backupType, error: errMsg },
        deviceInfo: deviceInfo || 'SYSTEM',
        description: 'Gagal membuat backup ' + backupType + ': ' + errMsg
      });

      notifyAllSuperAdmins(
        'BACKUP_FAILURE',
        'KRITIS: Kegagalan Backup Sistem',
        'Proses backup "' + backupType + '" mengalami kegagalan: ' + errMsg,
        backupId,
        { backupId: backupId, error: errMsg }
      );

      throw TM_Utils.AppError('ERR_BACKUP_FAILED', 'Gagal membuat backup: ' + errMsg, { backupRecord: failedRow });
    }
  }

  /**
   * Membuat Backup Manual oleh Super Admin, dengan opsi label Important (PRD 15.1).
   */
  function createManualBackup(token, optionsDto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var opts = optionsDto || {};
    var isImp = Boolean(opts.important);
    var desc = TM_Utils.sanitizeText(opts.description);
    return TM_Db.withLock(function () {
      return performBackupInternal(ctx.user.UserID, ctx.session.DeviceInfo, 'MANUAL', isImp, desc);
    });
  }

  /**
   * Menjalankan Backup Harian Otomatis & Pembersihan Retensi 90 Hari (PRD 15.1).
   */
  function runDailyAutomatedBackup(tokenOrNull) {
    var userId = 'SYSTEM_CRON';
    var devInfo = 'TIME_TRIGGER';
    if (tokenOrNull) {
      var ctx = TM_Auth.requireAuth(tokenOrNull, [TM_CONFIG.ROLES.SUPER_ADMIN]);
      userId = ctx.user.UserID;
      devInfo = ctx.session.DeviceInfo;
    }
    return TM_Db.withLock(function () {
      var res = performBackupInternal(userId, devInfo, 'DAILY_AUTO', false, 'Backup otomatis harian');
      var cleaned = cleanupExpiredBackupsUnlocked(userId, devInfo);
      return {
        backup: res.backup,
        summary: res.summary,
        expiredCleanedCount: cleaned.cleanedCount
      };
    });
  }

  /**
   * Mengubah status label Important pada suatu Backup (PRD 15.1).
   */
  function toggleBackupImportant(token, backupId, isImportant) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var existing = TM_Db.findById('BackupHistory', 'BackupID', backupId);
    if (!existing) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Catatan backup tidak ditemukan.');
    }
    var updated = TM_Db.updateRecordById('BackupHistory', 'BackupID', backupId, function (rec) {
      rec.Important = isImportant ? 'TRUE' : 'FALSE';
      return rec;
    });

    TM_Audit.logEvent({
      userId: ctx.user.UserID,
      action: 'TOGGLE_BACKUP_IMPORTANT',
      entityType: 'BackupHistory',
      entityId: backupId,
      beforeData: existing,
      afterData: updated,
      deviceInfo: ctx.session.DeviceInfo,
      description: 'Mengubah label Important backup ' + backupId + ' menjadi ' + (isImportant ? 'TRUE' : 'FALSE')
    });

    return updated;
  }

  function getRetentionDays() {
    var rec = TM_Db.findById('AppSettings', 'SettingKey', 'BACKUP_RETENTION_DAYS');
    var parsed = rec ? parseInt(rec.SettingValue, 10) : NaN;
    return (!isNaN(parsed) && parsed > 0) ? parsed : (TM_CONFIG.DEFAULTS.BACKUP_RETENTION_DAYS || 90);
  }

  function cleanupExpiredBackupsUnlocked(userId, deviceInfo) {
    var retentionDays = getRetentionDays();
    var cutoffMs = TM_Utils.now().getTime() - (retentionDays * DAY_MS);
    var allBackups = TM_Db.getAllRecords('BackupHistory');
    var cleanedIds = [];

    for (var i = 0; i < allBackups.length; i++) {
      var b = allBackups[i];
      if (b.Status !== 'Berhasil') continue;
      // Backup Important TIDAK IKUT pembersihan otomatis (PRD 15.1 & 22.8)
      if (String(b.Important).toUpperCase() === 'TRUE') continue;

      var bTime = new Date(b.BackupDate).getTime();
      if (!isNaN(bTime) && bTime < cutoffMs) {
        if (b.StorageReference) {
          try {
            var file = DriveApp.getFileById(b.StorageReference);
            if (file && typeof file.setTrashed === 'function') {
              file.setTrashed(true);
            }
          } catch (_) {}
        }
        TM_Db.updateRecordById('BackupHistory', 'BackupID', b.BackupID, function (rec) {
          rec.Status = 'EXPIRED_CLEANED';
          rec.Result = rec.Result + ' [Dibersihkan otomatis > ' + retentionDays + ' hari]';
          return rec;
        });
        cleanedIds.push(b.BackupID);
      }
    }

    if (cleanedIds.length > 0) {
      TM_Audit.logEvent({
        userId: userId || 'SYSTEM',
        action: 'CLEANUP_EXPIRED_BACKUPS',
        entityType: 'BackupHistory',
        entityId: cleanedIds.join(','),
        afterData: { retentionDays: retentionDays, cleanedIds: cleanedIds },
        deviceInfo: deviceInfo || 'SYSTEM',
        description: 'Membersihkan ' + cleanedIds.length + ' backup otomatis yang melewati masa retensi ' + retentionDays + ' hari'
      });
    }

    return {
      retentionDays: retentionDays,
      cleanedCount: cleanedIds.length,
      cleanedIds: cleanedIds
    };
  }

  function cleanupExpiredBackups(token) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    return TM_Db.withLock(function () {
      return cleanupExpiredBackupsUnlocked(ctx.user.UserID, ctx.session.DeviceInfo);
    });
  }

  function listBackups(token) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var items = TM_Db.getAllRecords('BackupHistory');
    items.sort(function (a, b) {
      return String(b.BackupDate).localeCompare(String(a.BackupDate));
    });
    return {
      retentionDays: getRetentionDays(),
      items: items
    };
  }

  function loadBackupSnapshotFromDrive(backupRec) {
    if (!backupRec || !backupRec.StorageReference) {
      throw TM_Utils.AppError('ERR_BACKUP_CORRUPT', 'Referensi penyimpanan file backup tidak ditemukan.');
    }
    var file = null;
    try {
      file = DriveApp.getFileById(backupRec.StorageReference);
    } catch (_) {
      throw TM_Utils.AppError('ERR_BACKUP_CORRUPT', 'File paket backup di Google Drive tidak ditemukan.');
    }
    if (file.isTrashed && file.isTrashed()) {
      throw TM_Utils.AppError('ERR_BACKUP_CORRUPT', 'File paket backup telah dihapus/dibersihkan.');
    }
    var bytes = file.getBlob().getBytes();
    var jsonStr = typeof Buffer !== 'undefined'
      ? Buffer.from(bytes).toString('utf8')
      : String.fromCharCode.apply(null, bytes);
    var parsed = null;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (_) {
      throw TM_Utils.AppError('ERR_BACKUP_CORRUPT', 'Isi paket backup rusak (bukan JSON valid).');
    }
    return parsed;
  }

  /**
   * Memvalidasi integritas struktur, relasi antar entitas, dan referensi foto dalam snapshot backup
   * (Langkah 4 & 5 dari Safe Restore — PRD 15.4 & 22.8).
   */
  function validateSnapshotIntegrityAndRelations(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || !snapshot.metadata || !snapshot.tables) {
      throw TM_Utils.AppError('ERR_RESTORE_INTEGRITY', 'Struktur paket backup tidak lengkap (metadata/tables hilang).');
    }

    for (var i = 0; i < DATA_SHEETS_TO_BACKUP.length; i++) {
      var sName = DATA_SHEETS_TO_BACKUP[i];
      if (!Array.isArray(snapshot.tables[sName])) {
        throw TM_Utils.AppError('ERR_RESTORE_INTEGRITY', 'Tabel wajib "' + sName + '" tidak ditemukan dalam paket backup.');
      }
    }

    var t = snapshot.tables;
    if (t.Users.length === 0) {
      throw TM_Utils.AppError('ERR_RESTORE_INTEGRITY', 'Paket backup tidak memiliki data pengguna (Users kosong).');
    }

    var userIds = {};
    for (var u = 0; u < t.Users.length; u++) userIds[t.Users[u].UserID] = true;

    var outletIds = {};
    for (var o = 0; o < t.Outlets.length; o++) outletIds[t.Outlets[o].OutletID] = true;

    var catIds = {};
    for (var c = 0; c < t.Categories.length; c++) catIds[t.Categories[c].CategoryID] = true;

    var secIds = {};
    for (var sc = 0; sc < t.Sections.length; sc++) secIds[t.Sections[sc].SectionID] = true;

    var sessionIds = {};
    for (var s = 0; s < t.Sessions.length; s++) {
      var ses = t.Sessions[s];
      sessionIds[ses.SessionID] = ses;
      if (!ses.TrainerID || !userIds[ses.TrainerID]) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Sesi "' + ses.SessionID + '" mereferensikan TrainerID "' + ses.TrainerID + '" yang tidak ada di tabel Users.'
        );
      }
      if (ses.Status === TM_CONFIG.SESSION_STATUS.SELESAI && (!ses.OutletID || !outletIds[ses.OutletID])) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Sesi Selesai "' + ses.SessionID + '" mereferensikan OutletID "' + ses.OutletID + '" yang tidak ada di tabel Outlets.'
        );
      }
    }

    var findingIds = {};
    for (var f = 0; f < t.Findings.length; f++) {
      var fnd = t.Findings[f];
      findingIds[fnd.FindingID] = fnd;
      if (!fnd.SessionID || !sessionIds[fnd.SessionID]) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Temuan "' + fnd.FindingID + '" mereferensikan SessionID "' + fnd.SessionID + '" yang tidak ada di tabel Sessions.'
        );
      }
      if (fnd.CategoryID && !catIds[fnd.CategoryID]) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Temuan "' + fnd.FindingID + '" mereferensikan CategoryID "' + fnd.CategoryID + '" yang tidak ditemukan.'
        );
      }
      if (fnd.SectionID && !secIds[fnd.SectionID]) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Temuan "' + fnd.FindingID + '" mereferensikan SectionID "' + fnd.SectionID + '" yang tidak ditemukan.'
        );
      }
    }

    var drivePhotosMap = snapshot.drivePhotos || {};
    for (var p = 0; p < t.Photos.length; p++) {
      var ph = t.Photos[p];
      if (!ph.SessionID || !sessionIds[ph.SessionID]) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Foto "' + ph.PhotoID + '" mereferensikan SessionID "' + ph.SessionID + '" yang tidak ditemukan.'
        );
      }
      if (!ph.FindingID || !findingIds[ph.FindingID]) {
        throw TM_Utils.AppError(
          'ERR_RESTORE_RELATION',
          'Relasi tidak valid: Foto "' + ph.PhotoID + '" mereferensikan FindingID "' + ph.FindingID + '" yang tidak ditemukan.'
        );
      }
      if (!ph.PurgedAt) {
        if (!ph.DriveFileID) {
          throw TM_Utils.AppError(
            'ERR_RESTORE_PHOTO_REF',
            'Referensi foto tidak valid: Foto aktif "' + ph.PhotoID + '" tidak memiliki DriveFileID.'
          );
        }
        var existsInDrive = false;
        try {
          var df = DriveApp.getFileById(ph.DriveFileID);
          existsInDrive = Boolean(df && (!df.isTrashed || !df.isTrashed()));
        } catch (_) {
          existsInDrive = false;
        }
        var existsInBackupBundle = Boolean(drivePhotosMap[ph.DriveFileID] && drivePhotosMap[ph.DriveFileID].base64Data);
        if (!existsInDrive && !existsInBackupBundle) {
          throw TM_Utils.AppError(
            'ERR_RESTORE_PHOTO_REF',
            'Referensi foto rusak: File Drive "' + ph.DriveFileID + '" untuk foto "' + ph.PhotoID + '" tidak ditemukan di Drive maupun paket backup.'
          );
        }
      }
    }

    return true;
  }

  /**
   * Langkah 1 Safe Restore: Menampilkan tanggal dan ringkasan backup sebelum eksekusi (PRD 15.4).
   */
  function getBackupSummaryForRestore(token, backupId) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var rec = TM_Db.findById('BackupHistory', 'BackupID', backupId);
    if (!rec) {
      throw TM_Utils.AppError('ERR_NOT_FOUND', 'Data backup tidak ditemukan.');
    }
    var snapshot = loadBackupSnapshotFromDrive(rec);
    return {
      backupId: rec.BackupID,
      backupType: rec.BackupType,
      backupDate: rec.BackupDate,
      important: rec.Important === 'TRUE',
      sizeBytes: Number(rec.Size || 0),
      schemaVersion: snapshot.metadata && snapshot.metadata.schemaVersion,
      summary: snapshot.metadata && snapshot.metadata.summary
    };
  }

  function applySnapshotTablesToDatabase(snapshot, options) {
    var opts = options || {};
    var currentAuditLogs = TM_Db.getAllRecords('AuditLogs');

    // Pulihkan foto yang tidak ada di Drive dari salinan biner paket backup
    var props = TM_Db.getProps();
    var photosFolderId = props.getProperty(TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ID);
    var drivePhotosMap = snapshot.drivePhotos || {};
    var restoredPhotosTable = (snapshot.tables.Photos || []).map(function (ph) {
      var copy = Object.assign({}, ph);
      if (!copy.PurgedAt && copy.DriveFileID) {
        var driveOk = false;
        try {
          var f = DriveApp.getFileById(copy.DriveFileID);
          driveOk = Boolean(f && (!f.isTrashed || !f.isTrashed()));
        } catch (_) {
          driveOk = false;
        }
        if (!driveOk && drivePhotosMap[copy.DriveFileID] && photosFolderId) {
          var bInfo = drivePhotosMap[copy.DriveFileID];
          var blob = Utilities.newBlob(
            Utilities.base64Decode(bInfo.base64Data),
            bInfo.mimeType || 'image/jpeg',
            bInfo.fileName || 'restored.jpg'
          );
          var newFile = DriveApp.getFolderById(photosFolderId).createFile(blob);
          newFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
          copy.DriveFileID = newFile.getId();
        }
      }
      return copy;
    });

    for (var i = 0; i < DATA_SHEETS_TO_BACKUP.length; i++) {
      var sName = DATA_SHEETS_TO_BACKUP[i];
      if (sName === 'AuditLogs') {
        // Gabungkan AuditLogs agar bersifat append-only (tidak menghilangkan jejak audit)
        var seenLogs = {};
        var mergedLogs = [];
        var snapLogs = snapshot.tables.AuditLogs || [];
        for (var a = 0; a < snapLogs.length; a++) {
          seenLogs[snapLogs[a].LogID] = true;
          mergedLogs.push(snapLogs[a]);
        }
        for (var b = 0; b < currentAuditLogs.length; b++) {
          if (!seenLogs[currentAuditLogs[b].LogID]) {
            seenLogs[currentAuditLogs[b].LogID] = true;
            mergedLogs.push(currentAuditLogs[b]);
          }
        }
        TM_Db.replaceSheetRecords('AuditLogs', mergedLogs);
        continue;
      }

      if (sName === 'Photos') {
        TM_Db.replaceSheetRecords('Photos', restoredPhotosTable);
      } else {
        TM_Db.replaceSheetRecords(sName, snapshot.tables[sName] || []);
      }

      // Mendukung simulasi kegagalan di tengah proses tulis untuk menguji rollback otomatis (Langkah 7)
      if (opts.simulateFailureAfterSheet && opts.simulateFailureAfterSheet === sName) {
        throw new Error('Simulasi kegagalan tulis di tengah proses restore setelah tabel ' + sName);
      }
    }

    TM_Db.invalidateCache('APP_SETTINGS');
  }

  /**
   * Menjalankan 8 Langkah Safe Restore (PRD 15.4 & 22.8):
   * 1. Mengambil tanggal & ringkasan backup
   * 2. Membuat pre-restore backup
   * 3. Memverifikasi konfirmasi eksplisit Super Admin
   * 4. Memvalidasi integritas data
   * 5. Memvalidasi relasi dan referensi foto
   * 6. Menjalankan restore di bawah ScriptLock
   * 7. Melakukan rollback otomatis menggunakan pre-restore backup jika gagal
   * 8. Mencatat aktivitas lengkap pada Audit Log
   */
  function executeSafeRestore(token, backupId, confirmationDto) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var conf = confirmationDto || {};

    // Langkah 3: Konfirmasi eksplisit Super Admin
    if (conf.confirmRestore !== true || String(conf.confirmationText || '').trim().toUpperCase() !== 'RESTORE') {
      throw TM_Utils.AppError(
        'ERR_CONFIRMATION_REQUIRED',
        'Konfirmasi eksplisit Super Admin diperlukan (ketik "RESTORE" untuk menjalankan Safe Restore).'
      );
    }

    return TM_Db.withLock(function () {
      // Langkah 1: Ambil catatan backup target
      var targetBackupRec = TM_Db.findById('BackupHistory', 'BackupID', backupId);
      if (!targetBackupRec) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Backup yang dipilih tidak ditemukan.');
      }

      // Langkah 4 & 5: Muat dan validasi integritas data, relasi antar tabel, serta referensi foto
      var targetSnapshot = loadBackupSnapshotFromDrive(targetBackupRec);
      validateSnapshotIntegrityAndRelations(targetSnapshot);

      // Langkah 2: Buat Pre-Restore Backup sebelum menyentuh tabel mana pun
      var preRestore = performBackupInternal(
        ctx.user.UserID,
        ctx.session.DeviceInfo,
        'PRE_RESTORE',
        true,
        'Pre-restore backup otomatis sebelum memulihkan ' + backupId
      );
      var preRestoreSnapshot = loadBackupSnapshotFromDrive(preRestore.backup);

      try {
        // Langkah 6: Jalankan restore
        applySnapshotTablesToDatabase(targetSnapshot, {
          simulateFailureAfterSheet: conf.simulateFailureAfterSheet || ''
        });

        // Langkah 8: Catat keberhasilan Safe Restore pada Audit Log
        TM_Audit.logEvent({
          userId: ctx.user.UserID,
          action: 'SAFE_RESTORE_COMPLETED',
          entityType: 'BackupHistory',
          entityId: backupId,
          afterData: {
            restoredBackupId: backupId,
            backupDate: targetBackupRec.BackupDate,
            preRestoreBackupId: preRestore.backup.BackupID,
            summary: targetSnapshot.metadata.summary
          },
          deviceInfo: ctx.session.DeviceInfo,
          description: 'Safe Restore berhasil dijalankan dari backup ' + backupId + ' (Pre-restore: ' + preRestore.backup.BackupID + ')'
        });

        return {
          status: 'RESTORED',
          restoredBackupId: backupId,
          preRestoreBackupId: preRestore.backup.BackupID,
          backupDate: targetBackupRec.BackupDate,
          summary: targetSnapshot.metadata.summary
        };
      } catch (restoreErr) {
        // Langkah 7: Rollback otomatis menggunakan pre-restore backup jika gagal!
        var errMsg = restoreErr && restoreErr.message ? restoreErr.message : String(restoreErr);
        applySnapshotTablesToDatabase(preRestoreSnapshot, {});

        TM_Audit.logEvent({
          userId: ctx.user.UserID,
          action: 'SAFE_RESTORE_ROLLED_BACK',
          entityType: 'BackupHistory',
          entityId: backupId,
          afterData: {
            failedBackupId: backupId,
            rolledBackToPreRestoreId: preRestore.backup.BackupID,
            error: errMsg
          },
          deviceInfo: ctx.session.DeviceInfo,
          description: 'Safe Restore gagal dan berhasil di-rollback otomatis ke kondisi pra-restore (' + preRestore.backup.BackupID + '): ' + errMsg
        });

        notifyAllSuperAdmins(
          'BACKUP_FAILURE',
          'KRITIS: Safe Restore Gagal & Telah Di-Rollback Otomatis',
          'Proses Safe Restore dari "' + backupId + '" gagal (' + errMsg + '). Sistem telah mengembalikan seluruh data ke Pre-Restore Backup "' + preRestore.backup.BackupID + '".',
          backupId,
          { failedBackupId: backupId, preRestoreBackupId: preRestore.backup.BackupID }
        );

        throw TM_Utils.AppError(
          'ERR_RESTORE_ROLLED_BACK',
          'Restore gagal dan sistem telah melakukan rollback otomatis ke Pre-Restore Backup (' + preRestore.backup.BackupID + '): ' + errMsg,
          { preRestoreBackupId: preRestore.backup.BackupID }
        );
      }
    });
  }

  /**
   * Memeriksa apakah sebuah foto direferensikan oleh backup yang masih harus dipertahankan
   * (yaitu backup berstatus 'Berhasil' yang Important ATAU masih dalam masa retensi 90 hari).
   */
  function getRetainedBackupsReferencingPhoto(photoId, driveFileId) {
    var retentionDays = getRetentionDays();
    var cutoffMs = TM_Utils.now().getTime() - (retentionDays * DAY_MS);
    var allBackups = TM_Db.getAllRecords('BackupHistory');
    var referencingIds = [];

    for (var i = 0; i < allBackups.length; i++) {
      var b = allBackups[i];
      if (b.Status !== 'Berhasil') continue;
      var isImportant = String(b.Important).toUpperCase() === 'TRUE';
      var bTime = new Date(b.BackupDate).getTime();
      var isWithinRetention = isNaN(bTime) || bTime >= cutoffMs;
      if (!isImportant && !isWithinRetention) continue;

      try {
        var snap = loadBackupSnapshotFromDrive(b);
        var bPhotos = (snap.tables && snap.tables.Photos) || [];
        var found = bPhotos.some(function (p) {
          return (p.PhotoID === photoId || (driveFileId && p.DriveFileID === driveFileId)) && !p.PurgedAt;
        });
        if (found) {
          referencingIds.push(b.BackupID);
        }
      } catch (_) {}
    }

    return referencingIds;
  }

  /**
   * Menampilkan daftar foto arsip (foto dari temuan/sesi yang dihapus atau foto yang dihapus)
   * beserta status kelayakan purge (PRD Bagian 13).
   */
  function listArchivedPhotos(token) {
    TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var sessions = TM_Db.getAllRecords('Sessions');
    var findings = TM_Db.getAllRecords('Findings');
    var photos = TM_Db.getAllRecords('Photos');

    var sesMap = {};
    for (var i = 0; i < sessions.length; i++) sesMap[sessions[i].SessionID] = sessions[i];
    var fndMap = {};
    for (var j = 0; j < findings.length; j++) fndMap[findings[j].FindingID] = findings[j];

    var archived = [];
    for (var k = 0; k < photos.length; k++) {
      var ph = photos[k];
      var ses = sesMap[ph.SessionID];
      var fnd = fndMap[ph.FindingID];
      var isArchived = Boolean(ph.DeletedAt || (fnd && fnd.DeletedAt) || (ses && ses.DeletedAt));
      if (!isArchived) continue;

      var retainedBackupRefs = ph.PurgedAt ? [] : getRetainedBackupsReferencingPhoto(ph.PhotoID, ph.DriveFileID);
      archived.push({
        PhotoID: ph.PhotoID,
        SessionID: ph.SessionID,
        FindingID: ph.FindingID,
        OutletName: ses ? ses.OutletNameSnapshot : '-',
        InspectionDate: ses ? ses.InspectionDate : '-',
        FileName: ph.FileName,
        FileSize: Number(ph.FileSize || 0),
        PhotoComment: ph.PhotoComment || '',
        UploadedAt: ph.UploadedAt,
        DeletedAt: ph.DeletedAt || (fnd && fnd.DeletedAt) || (ses && ses.DeletedAt) || '',
        PurgedAt: ph.PurgedAt || '',
        PurgeReason: ph.PurgeReason || '',
        ReferencedByRetainedBackups: retainedBackupRefs,
        CanPurge: !ph.PurgedAt && retainedBackupRefs.length === 0
      });
    }

    archived.sort(function (a, b) {
      return String(b.DeletedAt).localeCompare(String(a.DeletedAt));
    });

    return archived;
  }

  /**
   * Purge manual foto arsip oleh Super Admin (PRD Bagian 13 & 22.8):
   * - Hanya berlaku untuk foto arsip yang tidak aktif digunakan
   * - Memerlukan alasan wajib
   * - Tidak boleh menghapus foto yang masih direferensikan data aktif atau backup yang harus dipertahankan
   * - Dicatat pada Audit Log
   */
  function purgeArchivedPhoto(token, photoId, purgeReason) {
    var ctx = TM_Auth.requireAuth(token, [TM_CONFIG.ROLES.SUPER_ADMIN]);
    var reason = TM_Utils.sanitizeText(purgeReason);
    if (!reason) {
      throw TM_Utils.AppError('ERR_VALIDATION', 'Alasan purge foto arsip wajib diisi.');
    }

    return TM_Db.withLock(function () {
      var photo = TM_Db.findById('Photos', 'PhotoID', photoId);
      if (!photo) {
        throw TM_Utils.AppError('ERR_NOT_FOUND', 'Foto tidak ditemukan.');
      }
      if (photo.PurgedAt) {
        throw TM_Utils.AppError('ERR_ALREADY_PURGED', 'Foto ini sudah pernah di-purge sebelumnya.');
      }

      var session = TM_Db.findById('Sessions', 'SessionID', photo.SessionID);
      var finding = TM_Db.findById('Findings', 'FindingID', photo.FindingID);

      var isArchived = Boolean(photo.DeletedAt || (finding && finding.DeletedAt) || (session && session.DeletedAt));
      if (!isArchived) {
        throw TM_Utils.AppError(
          'ERR_PHOTO_ACTIVE_REFERENCED',
          'Foto masih direferensikan oleh data pemeriksaan aktif dan tidak boleh di-purge.'
        );
      }

      var retainedRefs = getRetainedBackupsReferencingPhoto(photo.PhotoID, photo.DriveFileID);
      if (retainedRefs.length > 0) {
        throw TM_Utils.AppError(
          'ERR_PHOTO_REFERENCED_BY_BACKUP',
          'Foto tidak dapat di-purge karena masih direferensikan oleh backup yang harus dipertahankan (' + retainedRefs.join(', ') + ').'
        );
      }

      if (photo.DriveFileID) {
        try {
          var driveFile = DriveApp.getFileById(photo.DriveFileID);
          if (driveFile && typeof driveFile.setTrashed === 'function') {
            driveFile.setTrashed(true);
          }
        } catch (_) {}
      }

      var nowIso = TM_Utils.formatWibIso();
      var updated = TM_Db.updateRecordById('Photos', 'PhotoID', photoId, function (rec) {
        rec.PurgedAt = nowIso;
        rec.PurgeReason = reason;
        rec.Status = 'Purged';
        return rec;
      });

      TM_Audit.logEvent({
        userId: ctx.user.UserID,
        action: 'PURGE_ARCHIVED_PHOTO',
        entityType: 'Photos',
        entityId: photoId,
        beforeData: photo,
        afterData: updated,
        deviceInfo: ctx.session.DeviceInfo,
        description: 'Purge permanen foto arsip ' + photoId + ': ' + reason
      });

      return updated;
    });
  }

  return {
    createManualBackup: createManualBackup,
    runDailyAutomatedBackup: runDailyAutomatedBackup,
    toggleBackupImportant: toggleBackupImportant,
    cleanupExpiredBackups: cleanupExpiredBackups,
    listBackups: listBackups,
    getBackupSummaryForRestore: getBackupSummaryForRestore,
    executeSafeRestore: executeSafeRestore,
    listArchivedPhotos: listArchivedPhotos,
    purgeArchivedPhoto: purgeArchivedPhoto
  };
})();



/* ==================== FILE: Main.gs ==================== */
/**
 * Main.gs — Entry point Web App (doGet), HTML partial loader, & RPC handlers google.script.run.
 */

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var template;
  try {
    template = HtmlService.createTemplateFromFile('client/index');
  } catch (_) {
    template = HtmlService.createTemplateFromFile('index');
  }
  template.initialMode = params.mode ? String(params.mode) : '';
  template.initialResetToken = params.token ? String(params.token) : '';

  return template
    .evaluate()
    .setTitle(TM_CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=5')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (_) {
    var baseName = String(filename || '').split('/').pop();
    return HtmlService.createHtmlOutputFromFile(baseName).getContent();
  }
}

function executeRpc(fn) {
  try {
    return TM_Utils.okResponse(fn());
  } catch (err) {
    return TM_Utils.errorResponse(err);
  }
}

/* ==================== BOOTSTRAP & PUBLIC ==================== */

function api_getBootstrapStatus() {
  return executeRpc(function () {
    return TM_Bootstrap.getBootstrapStatus();
  });
}

function api_runInitialBootstrap(payload) {
  return executeRpc(function () {
    return TM_Bootstrap.runInitialBootstrap(payload);
  });
}

/* ==================== AUTHENTICATION ==================== */

function api_login(username, password, deviceInfo) {
  return executeRpc(function () {
    return TM_Auth.login(username, password, deviceInfo);
  });
}

function api_validateSession(token) {
  return executeRpc(function () {
    var ctx = TM_Auth.requireAuth(token, null, { allowMustChangePassword: true });
    return {
      user: ctx.user,
      expiresAt: ctx.session.ExpiresAt,
      mustChangePassword: ctx.user.MustChangePassword
    };
  });
}

function api_logout(token) {
  return executeRpc(function () {
    return TM_Auth.logout(token);
  });
}

function api_requestPasswordReset(email, appUrl) {
  return executeRpc(function () {
    return TM_Auth.requestPasswordReset(email, appUrl);
  });
}

function api_confirmPasswordReset(resetToken, newPassword) {
  return executeRpc(function () {
    return TM_Auth.confirmPasswordReset(resetToken, newPassword);
  });
}

function api_changePasswordRequired(token, currentPassword, newPassword) {
  return executeRpc(function () {
    return TM_Auth.changePasswordRequired(token, currentPassword, newPassword);
  });
}

/* ==================== USER MANAGEMENT (SUPER ADMIN) ==================== */

function api_listUsers(token) {
  return executeRpc(function () {
    return TM_Users.listUsers(token);
  });
}

function api_createUser(token, dto) {
  return executeRpc(function () {
    return TM_Users.createUser(token, dto);
  });
}

function api_updateUser(token, userId, dto) {
  return executeRpc(function () {
    return TM_Users.updateUser(token, userId, dto);
  });
}

function api_setUserStatus(token, userId, status) {
  return executeRpc(function () {
    return TM_Users.setUserStatus(token, userId, status);
  });
}

function api_unlockUser(token, userId) {
  return executeRpc(function () {
    return TM_Users.unlockUser(token, userId);
  });
}

function api_adminResetPassword(token, userId, tempPassword) {
  return executeRpc(function () {
    return TM_Users.adminResetPassword(token, userId, tempPassword);
  });
}

/* ==================== APP SETTINGS ==================== */

function api_getAppSettings(token) {
  return executeRpc(function () {
    return TM_Settings.getAppSettings(token);
  });
}

function api_updateAppSettings(token, dto, logoPayload) {
  return executeRpc(function () {
    return TM_Settings.updateAppSettings(token, dto, logoPayload);
  });
}

/* ==================== AUDIT LOG (SUPER ADMIN) ==================== */

function api_queryAuditLogs(token, filters) {
  return executeRpc(function () {
    return TM_Audit.queryAuditLogs(token, filters);
  });
}

/* ==================== MASTER DATA & OUTLETS ==================== */

function api_getMasterBundle(token) {
  return executeRpc(function () {
    return TM_MasterData.getMasterBundle(token);
  });
}

function api_saveMasterItem(token, entityType, dto) {
  return executeRpc(function () {
    return TM_MasterData.saveMasterItem(token, entityType, dto);
  });
}

function api_setMasterStatus(token, entityType, id, status) {
  return executeRpc(function () {
    return TM_MasterData.setMasterStatus(token, entityType, id, status);
  });
}

function api_deleteMasterItem(token, entityType, id) {
  return executeRpc(function () {
    return TM_MasterData.deleteMasterItem(token, entityType, id);
  });
}

function api_listOutlets(token) {
  return executeRpc(function () {
    return TM_Outlets.listOutlets(token);
  });
}

function api_suggestOutlets(token, rawQuery) {
  return executeRpc(function () {
    return TM_Outlets.suggestOutlets(token, rawQuery);
  });
}

function api_resolveOrCreateOutlet(token, rawName) {
  return executeRpc(function () {
    return TM_Outlets.resolveOrCreateOutlet(token, rawName);
  });
}

function api_updateOutlet(token, outletId, dto) {
  return executeRpc(function () {
    return TM_Outlets.updateOutlet(token, outletId, dto);
  });
}

function api_setOutletStatus(token, outletId, status) {
  return executeRpc(function () {
    return TM_Outlets.setOutletStatus(token, outletId, status);
  });
}

function api_deleteOutlet(token, outletId) {
  return executeRpc(function () {
    return TM_Outlets.deleteOutlet(token, outletId);
  });
}

function api_mergeOutlets(token, primaryOutletId, duplicateOutletIds, reason) {
  return executeRpc(function () {
    return TM_Outlets.mergeOutlets(token, primaryOutletId, duplicateOutletIds, reason);
  });
}

function api_unmergeOutlet(token, duplicateOutletId, reason) {
  return executeRpc(function () {
    return TM_Outlets.unmergeOutlet(token, duplicateOutletId, reason);
  });
}

/* ==================== SESSIONS, FINDINGS & PHOTOS ==================== */

function api_saveDraft(token, draftDto) {
  return executeRpc(function () {
    return TM_Sessions.saveDraft(token, draftDto);
  });
}

function api_listMyDrafts(token) {
  return executeRpc(function () {
    return TM_Sessions.listMyDrafts(token);
  });
}

function api_deleteMyDraft(token, sessionId) {
  return executeRpc(function () {
    return TM_Sessions.deleteMyDraft(token, sessionId);
  });
}

function api_finalizeSession(token, sessionId, confirmNoFindings) {
  return executeRpc(function () {
    return TM_Sessions.finalizeSession(token, sessionId, confirmNoFindings);
  });
}

function api_getSessionDetail(token, sessionId) {
  return executeRpc(function () {
    return TM_Sessions.getSessionDetail(token, sessionId);
  });
}

function api_listCompletedSessions(token, limit) {
  return executeRpc(function () {
    return TM_Sessions.listCompletedSessions(token, limit);
  });
}

function api_listDeletedCompletedSessions(token) {
  return executeRpc(function () {
    return TM_Sessions.listDeletedCompletedSessions(token);
  });
}

function api_deleteSession(token, sessionId, reason) {
  return executeRpc(function () {
    return TM_Sessions.deleteSession(token, sessionId, reason);
  });
}

function api_restoreSession(token, sessionId) {
  return executeRpc(function () {
    return TM_Sessions.restoreSession(token, sessionId);
  });
}

function api_saveFindingDraft(token, sessionId, dto) {
  return executeRpc(function () {
    return TM_Findings.saveFindingDraft(token, sessionId, dto);
  });
}

function api_deleteFindingInDraft(token, findingId) {
  return executeRpc(function () {
    return TM_Findings.deleteFindingInDraft(token, findingId);
  });
}

function api_updateFinding(token, findingId, dto) {
  return executeRpc(function () {
    return TM_Findings.updateFinding(token, findingId, dto);
  });
}

function api_deleteFinding(token, findingId, reason) {
  return executeRpc(function () {
    return TM_Findings.deleteFinding(token, findingId, reason);
  });
}

function api_restoreFinding(token, findingId) {
  return executeRpc(function () {
    return TM_Findings.restoreFinding(token, findingId);
  });
}

function api_uploadPhoto(token, payload) {
  return executeRpc(function () {
    return TM_Photos.uploadPhoto(token, payload);
  });
}

function api_updatePhotoComment(token, photoId, comment) {
  return executeRpc(function () {
    return TM_Photos.updatePhotoComment(token, photoId, comment);
  });
}

function api_deletePhoto(token, photoId) {
  return executeRpc(function () {
    return TM_Photos.deletePhoto(token, photoId);
  });
}

function api_getPhotoData(token, photoId, isDownload) {
  return executeRpc(function () {
    return TM_Photos.getPhotoData(token, photoId, isDownload);
  });
}

/* ==================== DASHBOARD & ANALYTICS ==================== */

function api_getDashboardFilterOptions(token) {
  return executeRpc(function () {
    return TM_Dashboard.getFilterOptions(token);
  });
}

function api_getDashboardData(token, filters) {
  return executeRpc(function () {
    return TM_Dashboard.getDashboardData(token, filters);
  });
}

/* ==================== DRAFT MONITORING & RESTORE ==================== */

function api_getActiveDraftsCount(token) {
  return executeRpc(function () {
    return TM_Drafts.getActiveDraftsCount(token);
  });
}

function api_listMonitoringDrafts(token, filters) {
  return executeRpc(function () {
    return TM_Drafts.listMonitoringDrafts(token, filters);
  });
}

function api_getMonitoringDraftDetail(token, sessionId) {
  return executeRpc(function () {
    return TM_Drafts.getMonitoringDraftDetail(token, sessionId);
  });
}

function api_adminDeleteDraft(token, sessionId, reason) {
  return executeRpc(function () {
    return TM_Drafts.adminDeleteDraft(token, sessionId, reason);
  });
}

function api_listMyDeletedDrafts(token) {
  return executeRpc(function () {
    return TM_Drafts.listMyDeletedDrafts(token);
  });
}

function api_requestDraftRestore(token, sessionId, requestReason) {
  return executeRpc(function () {
    return TM_Drafts.requestDraftRestore(token, sessionId, requestReason);
  });
}

function api_listDraftRestoreRequests(token) {
  return executeRpc(function () {
    return TM_Drafts.listDraftRestoreRequests(token);
  });
}

function api_processDraftRestoreRequest(token, requestId, decision, decisionReason) {
  return executeRpc(function () {
    return TM_Drafts.processDraftRestoreRequest(token, requestId, decision, decisionReason);
  });
}

function api_listMyNotifications(token) {
  return executeRpc(function () {
    return TM_Drafts.listMyNotifications(token);
  });
}

function api_markNotificationRead(token, notificationId) {
  return executeRpc(function () {
    return TM_Drafts.markNotificationRead(token, notificationId);
  });
}

/* ==================== OFFLINE & SYNC ==================== */

function api_syncDraftOperation(token, payload) {
  return executeRpc(function () {
    return TM_Sync.syncDraftOperation(token, payload);
  });
}

function api_syncBatch(token, batchPayload) {
  return executeRpc(function () {
    return TM_Sync.syncBatch(token, batchPayload);
  });
}

function api_resolveSyncConflict(token, sessionId, resolutionDto) {
  return executeRpc(function () {
    return TM_Sync.resolveSyncConflict(token, sessionId, resolutionDto);
  });
}

function api_getDraftSyncAndRetentionStatus(token, sessionIds, deviceId) {
  return executeRpc(function () {
    return TM_Sync.getDraftSyncAndRetentionStatus(token, sessionIds, deviceId);
  });
}

/* ==================== REPORTING (PDF & EMAIL) & EXPORT ==================== */

function api_generateSessionPdf(token, sessionId) {
  return executeRpc(function () {
    return TM_Reporting.generateSessionPdf(token, sessionId);
  });
}

function api_sendSessionPdfEmail(token, sessionId, recipientEmail, isResend) {
  return executeRpc(function () {
    return TM_Reporting.sendSessionPdfEmail(token, sessionId, recipientEmail, Boolean(isResend));
  });
}

function api_getSessionPdfHistory(token, sessionId) {
  return executeRpc(function () {
    return TM_Reporting.getSessionPdfHistory(token, sessionId);
  });
}

function api_listEmailLogsForAdmin(token, statusFilter) {
  return executeRpc(function () {
    return TM_Reporting.listEmailLogsForAdmin(token, statusFilter);
  });
}

function api_generateDashboardReportPdf(token, reportType, filters) {
  return executeRpc(function () {
    return TM_Reporting.generateDashboardReportPdf(token, reportType, filters);
  });
}

function api_exportData(token, format, mode, filters) {
  return executeRpc(function () {
    return TM_Export.exportData(token, format, mode, filters);
  });
}

/* ==================== NOTIFICATION CENTER & PREFERENCES ==================== */

function api_listMyNotificationsCenter(token, filterDto) {
  return executeRpc(function () {
    return TM_Notifications.listMyNotificationsCenter(token, filterDto);
  });
}

function api_setNotificationReadStatus(token, notificationId, isRead) {
  return executeRpc(function () {
    return TM_Notifications.setNotificationReadStatus(token, notificationId, Boolean(isRead));
  });
}

function api_markAllMyNotificationsRead(token) {
  return executeRpc(function () {
    return TM_Notifications.markAllMyNotificationsRead(token);
  });
}

function api_getMyNotificationPreferences(token) {
  return executeRpc(function () {
    return TM_Notifications.getMyNotificationPreferences(token);
  });
}

function api_updateMyNotificationPreference(token, prefDto) {
  return executeRpc(function () {
    return TM_Notifications.updateMyNotificationPreference(token, prefDto);
  });
}

function api_updateMandatoryNotificationPolicy(token, mandatoryTypesArray) {
  return executeRpc(function () {
    return TM_Notifications.updateMandatoryNotificationPolicy(token, mandatoryTypesArray);
  });
}

function api_retryFailedEmailLog(token, emailLogId) {
  return executeRpc(function () {
    return TM_Notifications.retryFailedEmailLog(token, emailLogId);
  });
}

/* ==================== BACKUP, SAFE RESTORE & PHOTO ARCHIVE (SUPER ADMIN) ==================== */

function api_createManualBackup(token, optionsDto) {
  return executeRpc(function () {
    return TM_Backup.createManualBackup(token, optionsDto);
  });
}

function api_runDailyAutomatedBackup(token) {
  return executeRpc(function () {
    return TM_Backup.runDailyAutomatedBackup(token);
  });
}

function cron_runDailyAutomatedBackup() {
  return TM_Backup.runDailyAutomatedBackup(null);
}

function api_toggleBackupImportant(token, backupId, isImportant) {
  return executeRpc(function () {
    return TM_Backup.toggleBackupImportant(token, backupId, Boolean(isImportant));
  });
}

function api_cleanupExpiredBackups(token) {
  return executeRpc(function () {
    return TM_Backup.cleanupExpiredBackups(token);
  });
}

function api_listBackups(token) {
  return executeRpc(function () {
    return TM_Backup.listBackups(token);
  });
}

function api_getBackupSummaryForRestore(token, backupId) {
  return executeRpc(function () {
    return TM_Backup.getBackupSummaryForRestore(token, backupId);
  });
}

function api_executeSafeRestore(token, backupId, confirmationDto) {
  return executeRpc(function () {
    return TM_Backup.executeSafeRestore(token, backupId, confirmationDto);
  });
}

function api_listArchivedPhotos(token) {
  return executeRpc(function () {
    return TM_Backup.listArchivedPhotos(token);
  });
}

function api_purgeArchivedPhoto(token, photoId, purgeReason) {
  return executeRpc(function () {
    return TM_Backup.purgeArchivedPhoto(token, photoId, purgeReason);
  });
}

/* ==================== CLOUDFLARE MIGRATION & PDF/EMAIL BRIDGE ==================== */

var CF_BRIDGE_KEY = 'TM_CF_BRIDGE_2026_SECURE_KEY';

function jsonBridgeResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function exportFullStateForCloudflare() {
  var propsObj = {};
  try {
    propsObj = PropertiesService.getScriptProperties().getProperties() || {};
  } catch (_) {}

  var sheetsData = {};
  var sheetNames = Object.keys(TM_CONFIG.SHEETS);
  if (propsObj[TM_CONFIG.PROP_KEYS.SPREADSHEET_ID]) {
    for (var i = 0; i < sheetNames.length; i++) {
      var sName = sheetNames[i];
      try {
        sheetsData[sName] = TM_Db.getAllRecords(sName);
      } catch (_) {
        sheetsData[sName] = [];
      }
    }
  }

  var fileMap = {};
  function collectDriveFile(fileId, folderHint) {
    if (!fileId || fileMap[fileId]) return;
    try {
      var f = DriveApp.getFileById(fileId);
      var blob = f.getBlob();
      fileMap[fileId] = {
        FileID: String(fileId),
        FolderID: String(folderHint || ''),
        FileName: String(blob.getName() || fileId),
        MimeType: String(blob.getContentType() || 'application/octet-stream'),
        Base64Data: Utilities.base64Encode(blob.getBytes()),
        Trashed: f.isTrashed() ? 1 : 0,
        CreatedAt: TM_Utils.formatWibIso()
      };
    } catch (_) {}
  }

  var photos = sheetsData.Photos || [];
  for (var p = 0; p < photos.length; p++) {
    if (photos[p].DriveFileID && !photos[p].PurgedAt) {
      var fHint = photos[p].Status === 'Archived'
        ? propsObj[TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ARCHIVE_ID]
        : propsObj[TM_CONFIG.PROP_KEYS.DRIVE_PHOTOS_ACTIVE_ID];
      collectDriveFile(photos[p].DriveFileID, fHint);
    }
  }

  var settings = sheetsData.AppSettings || [];
  for (var s = 0; s < settings.length; s++) {
    if (settings[s].SettingKey === 'COMPANY_LOGO_FILE_ID' && settings[s].SettingValue) {
      collectDriveFile(settings[s].SettingValue, propsObj[TM_CONFIG.PROP_KEYS.DRIVE_BRANDING_ID]);
    }
  }

  var backups = sheetsData.BackupHistory || [];
  for (var b = 0; b < backups.length; b++) {
    if (backups[b].StorageReference && backups[b].Status === 'Berhasil') {
      collectDriveFile(backups[b].StorageReference, propsObj[TM_CONFIG.PROP_KEYS.DRIVE_BACKUPS_ID]);
    }
  }

  return {
    exportedAt: TM_Utils.formatWibIso(),
    properties: propsObj,
    sheets: sheetsData,
    files: Object.keys(fileMap).map(function (k) { return fileMap[k]; })
  };
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(raw);
    if (!body || body.bridgeKey !== CF_BRIDGE_KEY) {
      return jsonBridgeResponse({ ok: false, error: 'Unauthorized bridge request' });
    }

    if (body.action === 'EXPORT_ALL') {
      return jsonBridgeResponse({ ok: true, data: exportFullStateForCloudflare() });
    }

    if (body.action === 'RENDER_PDF') {
      var out = HtmlService.createHtmlOutput(String(body.html || ''));
      var pdfBlob = out.getAs('application/pdf').setName(String(body.fileName || 'report.pdf'));
      return jsonBridgeResponse({
        ok: true,
        data: {
          base64Data: Utilities.base64Encode(pdfBlob.getBytes()),
          mimeType: 'application/pdf'
        }
      });
    }

    if (body.action === 'SEND_EMAIL') {
      var mailOpts = {
        to: String(body.to || ''),
        subject: String(body.subject || ''),
        body: String(body.body || '')
      };
      if (body.pdfHtml) {
        var hOut = HtmlService.createHtmlOutput(String(body.pdfHtml));
        var pBlob = hOut.getAs('application/pdf').setName(String(body.pdfFileName || 'report.pdf'));
        mailOpts.attachments = [pBlob];
      } else if (body.pdfBase64) {
        var bytes = Utilities.base64Decode(String(body.pdfBase64));
        var bBlob = Utilities.newBlob(bytes, 'application/pdf', String(body.pdfFileName || 'report.pdf'));
        mailOpts.attachments = [bBlob];
      }
      MailApp.sendEmail(mailOpts);
      return jsonBridgeResponse({ ok: true });
    }

    return jsonBridgeResponse({ ok: false, error: 'Unknown bridge action' });
  } catch (err) {
    return jsonBridgeResponse({
      ok: false,
      error: (err && err.message) ? err.message : String(err)
    });
  }
}







  return {
    TM_CONFIG,
    TM_Utils,
    TM_Db,
    rpc: {
      api_getBootstrapStatus,
      api_runInitialBootstrap,
      api_login,
      api_validateSession,
      api_logout,
      api_requestPasswordReset,
      api_confirmPasswordReset,
      api_changePasswordRequired,
      api_listUsers,
      api_createUser,
      api_updateUser,
      api_setUserStatus,
      api_unlockUser,
      api_adminResetPassword,
      api_getAppSettings,
      api_updateAppSettings,
      api_queryAuditLogs,
      api_getMasterBundle,
      api_saveMasterItem,
      api_setMasterStatus,
      api_deleteMasterItem,
      api_listOutlets,
      api_suggestOutlets,
      api_resolveOrCreateOutlet,
      api_updateOutlet,
      api_setOutletStatus,
      api_deleteOutlet,
      api_mergeOutlets,
      api_unmergeOutlet,
      api_saveDraft,
      api_listMyDrafts,
      api_deleteMyDraft,
      api_finalizeSession,
      api_getSessionDetail,
      api_listCompletedSessions,
      api_listDeletedCompletedSessions,
      api_deleteSession,
      api_restoreSession,
      api_saveFindingDraft,
      api_deleteFindingInDraft,
      api_updateFinding,
      api_deleteFinding,
      api_restoreFinding,
      api_uploadPhoto,
      api_updatePhotoComment,
      api_deletePhoto,
      api_getPhotoData,
      api_getDashboardFilterOptions,
      api_getDashboardData,
      api_getActiveDraftsCount,
      api_listMonitoringDrafts,
      api_getMonitoringDraftDetail,
      api_adminDeleteDraft,
      api_listMyDeletedDrafts,
      api_requestDraftRestore,
      api_listDraftRestoreRequests,
      api_processDraftRestoreRequest,
      api_listMyNotifications,
      api_markNotificationRead,
      api_syncDraftOperation,
      api_syncBatch,
      api_resolveSyncConflict,
      api_getDraftSyncAndRetentionStatus,
      api_generateSessionPdf,
      api_sendSessionPdfEmail,
      api_getSessionPdfHistory,
      api_listEmailLogsForAdmin,
      api_generateDashboardReportPdf,
      api_exportData,
      api_listMyNotificationsCenter,
      api_setNotificationReadStatus,
      api_markAllMyNotificationsRead,
      api_getMyNotificationPreferences,
      api_updateMyNotificationPreference,
      api_updateMandatoryNotificationPolicy,
      api_retryFailedEmailLog,
      api_createManualBackup,
      api_runDailyAutomatedBackup,
      api_toggleBackupImportant,
      api_cleanupExpiredBackups,
      api_listBackups,
      api_getBackupSummaryForRestore,
      api_executeSafeRestore,
      api_listArchivedPhotos,
      api_purgeArchivedPhoto
    },
    cron: {
      cron_runDailyAutomatedBackup
    }
  };
}

async function callGasBridge(env, payload) {
  const bridgeUrl = (env && env.GAS_BRIDGE_URL) ? env.GAS_BRIDGE_URL : DEFAULT_GAS_BRIDGE_URL;
  if (!bridgeUrl) return null;
  try {
    const resp = await fetch(bridgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bridgeKey: CF_BRIDGE_KEY,
        ...payload
      }),
      redirect: 'follow'
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json;
  } catch (_) {
    return null;
  }
}

async function importSnapshotIntoD1(db, snapshot) {
  await ensureD1Schema(db);
  const stmts = [
    db.prepare('DELETE FROM "tm_sys_properties"'),
    db.prepare('DELETE FROM "tm_sys_files"')
  ];

  const props = snapshot.properties || {};
  for (const [k, v] of Object.entries(props)) {
    stmts.push(
      db.prepare('INSERT OR REPLACE INTO "tm_sys_properties" ("PropKey", "PropValue") VALUES (?, ?)').bind(String(k), String(v))
    );
  }

  const sheets = snapshot.sheets || {};
  for (const sName of SHEET_NAMES) {
    const headers = SHEETS_SCHEMA[sName];
    stmts.push(db.prepare(`DELETE FROM "${sName}"`));
    const rows = Array.isArray(sheets[sName]) ? sheets[sName] : [];
    if (rows.length > 0) {
      const colListSql = headers.map((c) => `"${c}"`).join(', ');
      const maxRowsPerInsert = Math.max(1, Math.floor(90 / headers.length));
      for (let i = 0; i < rows.length; i += maxRowsPerInsert) {
        const slice = rows.slice(i, i + maxRowsPerInsert);
        const placeholders = slice.map(() => `(${headers.map(() => '?').join(', ')})`).join(', ');
        const flat = [];
        for (const rObj of slice) {
          for (const h of headers) {
            const val = rObj[h];
            flat.push(val === undefined || val === null ? '' : String(val));
          }
        }
        stmts.push(
          db.prepare(`INSERT INTO "${sName}" (${colListSql}) VALUES ${placeholders}`).bind(...flat)
        );
      }
    }
  }

  // Eksekusi batch tabel utama terlebih dahulu
  await db.batch(stmts);

  // Masukkan file satu per satu agar ukuran payload per batch aman untuk foto base64
  const files = Array.isArray(snapshot.files) ? snapshot.files : [];
  for (const f of files) {
    await db
      .prepare('INSERT OR REPLACE INTO "tm_sys_files" ("FileID", "FolderID", "FileName", "MimeType", "Base64Data", "Trashed", "CreatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(
        String(f.FileID || ''),
        String(f.FolderID || ''),
        String(f.FileName || ''),
        String(f.MimeType || 'image/jpeg'),
        String(f.Base64Data || ''),
        f.Trashed ? 1 : 0,
        String(f.CreatedAt || new Date().toISOString())
      )
      .run();
  }

  ISOLATE_CACHE.clear();
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Endpoint Migrasi Otomatis dari Google Spreadsheet & Drive -> Cloudflare D1
    if (url.pathname === '/api/migrate-from-gas' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        let snapshot = body.snapshot;
        if (!snapshot) {
          const bridgeRes = await callGasBridge(env, { action: 'EXPORT_ALL' });
          if (!bridgeRes || !bridgeRes.ok || !bridgeRes.data) {
            return Response.json({ ok: false, error: 'Gagal mengambil snapshot dari Google Apps Script.' }, { status: 502 });
          }
          snapshot = bridgeRes.data;
        }
        await importSnapshotIntoD1(env.DB, snapshot);
        return Response.json({
          ok: true,
          migratedAt: new Date().toISOString(),
          sheetsCount: Object.keys(snapshot.sheets || {}).length,
          filesCount: (snapshot.files || []).length
        });
      } catch (err) {
        return Response.json({ ok: false, error: err && err.message ? err.message : String(err) }, { status: 500 });
      }
    }

    // 2. Endpoint Utama RPC (/api/rpc) pengganti google.script.run
    if (url.pathname === '/api/rpc' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const fnName = String(payload.fn || '');
        const args = Array.isArray(payload.args) ? payload.args : [];

        let state = await loadStateFromD1(env.DB, fnName, args);

        // Auto-mutasi otomatis pada boot pertama jika database D1 masih kosong
        if (fnName === 'api_getBootstrapStatus' && state.scriptProps.get('APP_INITIALIZED') !== 'true') {
          const bridgeRes = await callGasBridge(env, { action: 'EXPORT_ALL' });
          if (bridgeRes && bridgeRes.ok && bridgeRes.data && bridgeRes.data.properties && bridgeRes.data.properties.APP_INITIALIZED === 'true') {
            await importSnapshotIntoD1(env.DB, bridgeRes.data);
            state = await loadStateFromD1(env.DB, fnName, args);
          }
        }

        const runtime = createGasContext(state, url.origin);

        if (!runtime.rpc[fnName]) {
          return Response.json({
            ok: false,
            error: { code: 'ERR_NOT_FOUND', message: 'Fungsi RPC tidak ditemukan: ' + fnName }
          }, { status: 404 });
        }

        const result = runtime.rpc[fnName].apply(null, args);

        // Jika RPC membuat PDF (Session PDF atau Dashboard PDF), konversi HTML ke binary PDF asli via GAS Bridge
        if (
          result &&
          result.ok &&
          result.data &&
          result.data.htmlPreview &&
          (fnName === 'api_generateSessionPdf' || fnName === 'api_generateDashboardReportPdf')
        ) {
          const pdfBridge = await callGasBridge(env, {
            action: 'RENDER_PDF',
            html: result.data.htmlPreview,
            fileName: result.data.fileName || 'report.pdf'
          });
          if (pdfBridge && pdfBridge.ok && pdfBridge.data && pdfBridge.data.base64Data) {
            result.data.base64Data = pdfBridge.data.base64Data;
          }
        }

        // Jika ada email yang dikirim selama eksekusi RPC (mis. Reset Password atau Kirim PDF Sesi)
        if (state.pendingEmails.length > 0) {
          for (const mail of state.pendingEmails) {
            let pdfHtml = '';
            let pdfFileName = 'report.pdf';
            if (mail.attachments && mail.attachments.length > 0) {
              const att = mail.attachments[0];
              if (att && typeof att.getBytes === 'function') {
                pdfHtml = new TextDecoder().decode(new Uint8Array(att.getBytes()));
                pdfFileName = typeof att.getName === 'function' ? att.getName() : 'report.pdf';
              }
            }
            await callGasBridge(env, {
              action: 'SEND_EMAIL',
              to: mail.to,
              subject: mail.subject,
              body: mail.body,
              pdfHtml,
              pdfFileName
            });
          }
        }

        await commitStateToD1(env.DB, state);

        return Response.json(result);
      } catch (err) {
        return Response.json({
          ok: false,
          error: {
            code: 'ERR_SERVER',
            message: err && err.message ? err.message : String(err)
          }
        }, { status: 500 });
      }
    }

    // 3. Halaman Utama Aplikasi Web (GET /)
    const mode = url.searchParams.get('mode') || '';
    const token = url.searchParams.get('token') || '';
    const safeMode = mode.replace(/["'<>\\]/g, '');
    const safeToken = token.replace(/["'<>\\]/g, '');

    const html = CLIENT_HTML_TEMPLATE
      .replace('__TM_INITIAL_MODE__', safeMode)
      .replace('__TM_INITIAL_RESET_TOKEN__', safeToken);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });
  },

  // 4. Cloudflare Cron Trigger (menjalankan pengingat Draft & Backup Harian otomatis)
  async scheduled(event, env, ctx) {
    try {
      const state = await loadStateFromD1(env.DB, 'cron_runDailyAutomatedBackup', []);
      const runtime = createGasContext(state, '');
      runtime.cron.cron_checkStaleDraftsAndNotify();
      runtime.cron.cron_runDailyAutomatedBackup();
      await commitStateToD1(env.DB, state);
    } catch (err) {
      console.error('Scheduled cron error:', err);
    }
  }
};
