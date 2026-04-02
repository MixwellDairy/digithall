## 2025-05-15 - [Kiosk Visual Feedback]
**Learning:** In a high-traffic environment like a school kiosk, a static time display can lead to confusion if the application hangs. Adding a live clock with visible seconds provides immediate, reassuring feedback that the system is functioning correctly.
**Action:** Always include a dynamic "heartbeat" element (like a clock with seconds or a subtle pulse animation) in kiosk-mode interfaces.

## 2025-05-15 - [Form Accessibility in Tailwind Apps]
**Learning:** Modern utility-first designs often omit explicit labels in favor of placeholders or icons. This breaks screen reader support and keyboard navigation.
**Action:** Ensure every input has a hidden or visible `<label>` with a matching `htmlFor` and `id`, even when using stylistic icons.
