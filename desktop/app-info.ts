/** App version history shown in Cài đặt — keep in sync with README / package.json. */

export const VERSION_NOTES: { version: string; note: string }[] = [
  {
    version: '1.0.15',
    note: 'Lấy danh sách luôn ghi companies.csv; Cài đặt hiện phiên bản; job 0 website báo tiếng Việt và cho lấy lại.',
  },
  {
    version: '1.0.14',
    note: 'Lấy danh sách: Chrome profile bận thì báo rõ, không fallback bundled rồi lấy 0 hãng.',
  },
  {
    version: '1.0.13',
    note: 'Nút Lấy danh sách / --collect-only — dừng sau Trustpilot, ghi companies.csv.',
  },
  {
    version: '1.0.12',
    note: 'Windows-parity; stagger / nav-failure / profile-lock.',
  },
  {
    version: '1.0.11',
    note: 'Quét đường dẫn song song (tắt mặc định); isolation profile; goto domcontentloaded.',
  },
  {
    version: '1.0.10',
    note: 'Mở CSV / thư mục theo job đang chọn; xem job khác khi đang quét.',
  },
];
