// Nhãn hiển thị tiếng Việt (vi-first). Giá trị enum bên trong (verdict/confidence/
// loadStatus) GIỮ NGUYÊN tiếng Anh để không phá schema/export — chỉ đổi phần
// HIỂN THỊ. Tập trung ở đây để popup + trang options (Đợt 2) dùng chung (DRY).

import type { Verdict, Confidence, LoadStatus } from './types';

export const VERDICT_LABEL: Record<Verdict, string> = {
  affiliate: 'Có affiliate',
  partner_trade: 'Partner/Trade',
  none: 'Không có',
  unknown: 'Chưa rõ',
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'cao',
  medium: 'vừa',
  low: 'thấp',
  blocked: 'bị chặn',
};

export const LOAD_STATUS_LABEL: Record<LoadStatus, string> = {
  ok: 'Tải OK',
  blocked: 'Bị chặn',
  timeout: 'Quá giờ',
  error: 'Lỗi',
};

export const METHOD_LABEL: Record<'link' | 'platform' | 'path' | '', string> = {
  link: 'liên kết',
  platform: 'nền tảng',
  path: 'đường dẫn',
  '': '—',
};

/** Ý nghĩa + hành động khuyến nghị cho từng verdict — dùng cho bảng chú giải. */
export const VERDICT_LEGEND: Record<Verdict, { meaning: string; action: string }> = {
  affiliate: {
    meaning: 'Dấu hiệu chương trình affiliate RÕ RÀNG (từ khoá mạnh, nền tảng affiliate, hoặc đường dẫn /affiliate).',
    action: 'Ưu tiên liên hệ. Mở bằng chứng để tự xác minh.',
  },
  partner_trade: {
    meaning: 'Có dấu hiệu partner / B2B / trade / đại lý — CHƯA chắc là affiliate.',
    action: 'Cần review thủ công (có thể là kênh sỉ/đối tác, không phải affiliate).',
  },
  none: {
    meaning: 'Đã tải trang và quét đủ 3 lớp, KHÔNG thấy dấu hiệu nào.',
    action: 'Coi là không có (true negative, đã xác nhận).',
  },
  unknown: {
    meaning: 'KHÔNG quét được (site chặn bot / quá giờ / lỗi). ⚠ Đây KHÔNG phải "không có".',
    action: 'Tự mở site kiểm tra thủ công — đừng loại bỏ vội.',
  },
};

/** Ghi chú mức độ tin cậy. */
export const CONFIDENCE_NOTE =
  'Độ tin cậy: cao = bằng chứng mạnh trực tiếp; vừa = suy ra từ đường dẫn; thấp = 1 dấu hiệu yếu; bị chặn = không kết luận được.';

/** Các bước dùng nhanh — hiển thị trong mục Hướng dẫn. */
export const USAGE_STEPS: string[] = [
  'Nhập từ khoá ngành (vd: design) và số công ty muốn quét.',
  'Bấm "Bắt đầu". Công cụ tự lấy danh sách từ Trustpilot rồi quét từng website (mỗi lúc 1 tab, có độ trễ để lịch sự).',
  'Xem kết quả realtime: mỗi dòng có Kết quả + Độ tin + trạng thái Tải + Bằng chứng.',
  'Bấm vào "Bằng chứng" để mở đúng trang/đường dẫn đã phát hiện và tự xác minh.',
  'Xuất CSV/JSON để đưa vào CRM/Sheet. Có thể Tạm dừng/Tiếp tục; đóng popup vẫn chạy nền.',
];

export function verdictLabel(v: Verdict): string {
  return VERDICT_LABEL[v];
}
export function confidenceLabel(c: Confidence): string {
  return CONFIDENCE_LABEL[c];
}
export function loadStatusLabel(s: LoadStatus): string {
  return LOAD_STATUS_LABEL[s];
}
