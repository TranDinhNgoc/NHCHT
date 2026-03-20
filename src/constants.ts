import { PlanItem } from "./types";

export const TEMPLATE_PLAN: Omit<PlanItem, 'personInCharge' | 'stt'>[] = [
  {
    stage: "Triển khai",
    time: "20-21/3",
    content: "Họp tổ, thống nhất cấu trúc.",
    output: "Biên bản họp tổ",
    notes: "Mẫu KT05"
  },
  {
    stage: "Biên soạn",
    time: "20-24/3",
    content: "GV biên soạn câu hỏi + đáp án.",
    output: "Bản thảo câu hỏi + đáp án",
    notes: "Mẫu KT05"
  },
  {
    stage: "Rà soát nội bộ",
    time: "23-24/3",
    content: "Tổ ra đề kiểm tra trùng lặp, lỗi.",
    output: "Bản rà soát",
    notes: "Mẫu KT05"
  },
  {
    stage: "Phản biện",
    time: "24-25/3",
    content: "Tổ phản biện đánh giá mẫu KT05.",
    output: "Phiếu phản biện (KT05)",
    notes: "Mẫu KT05"
  },
  {
    stage: "Chỉnh sửa",
    time: "25-26/3",
    content: "Tiếp thu góp ý, hoàn thiện bản Final.",
    output: "Bản Final",
    notes: "Mẫu KT06"
  },
  {
    stage: "Bàn giao",
    time: "27/3",
    content: "Nộp bản mềm + cứng.",
    output: "Bản mềm + cứng",
    notes: "Mẫu KT06"
  },
  {
    stage: "Kiểm tra kỹ thuật",
    time: "27-28/3",
    content: "Phòng KT&ĐBCL xác nhận.",
    output: "Xác nhận kỹ thuật",
    notes: "Phòng KT&ĐBCL"
  },
  {
    stage: "Xác nhận khối lượng",
    time: "28/3",
    content: "Chốt số câu thanh toán.",
    output: "Biên bản xác nhận",
    notes: "KT07"
  },
  {
    stage: "Hồ sơ thanh toán",
    time: "28-29/3",
    content: "Lập KT07 và danh sách nhận tiền.",
    output: "Hồ sơ KT07 + Danh sách",
    notes: "Quyết toán"
  }
];
