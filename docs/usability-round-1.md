# Confirmed usability changes — 2026-10-23

The UI remains based on commit 0e5f0be. The v1.2 document is advisory; only individually confirmed changes are applied.

- Empty categories without capacity/religion filters show “当前分类暂无产品” and “联系代理”. Empty filtered results retain the reset action.
- Mobile contact form field spacing is consistent. Callback choices, phone links and relevant catalog actions have at least 44px touch height. Narrow-screen filter and toolbar rows may wrap.
- Catalog keyboard focus uses the existing green; primary actions have readable white text.
- Invalid callback phone values receive an inline error and focus. Valid corrections or disabling callback clear the error. Form action, GET, WhatsApp navigation and message composition are unchanged.
- Fonts, theme, card appearance, image ratios, placeholders, questionnaire branches, admin and database remain unchanged. Funeral services remain completely photo-free.

Validation: 76 frontend tests, type checking and production build passed. Seven routes were checked in a 390px frame with no document overflow. Browser interaction confirmed required-phone errors, focused input, error clearing, and keyboard access to the 44px callback choice. No message was sent and no product was modified.
