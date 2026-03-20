/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import ExcelJS from 'exceljs';
import { 
  Upload, 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  User,
  BookOpen,
  Loader2,
  Table as TableIcon,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TEMPLATE_PLAN } from './constants';
import { SubjectData, PlanItem, IndividualPlan } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [fileContent, setFileContent] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [subjectData, setSubjectData] = useState<SubjectData | null>(null);
  const [detailedPlan, setDetailedPlan] = useState<PlanItem[]>([]);
  const [individualPlans, setIndividualPlans] = useState<IndividualPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      processWithGemini(content);
    };
    reader.readAsText(file);
  };

  const processWithGemini = async (content: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          Trích xuất thông tin từ nội dung sau đây về quy trình biên soạn ngân hàng câu hỏi thi.
          Nội dung: ${content}
          
          Lưu ý quan trọng về cách gọi tên trong tài liệu:
          - "Tên môn học" (subjectName) chính là "Tên học phần".
          - "Tổ biên soạn" (compilationTeam) chính là "Tổ ra đề" hoặc "Danh sách tổ ra đề".
          - "Tổ phản biện" (reviewTeam) chính là "Danh sách tổ phản biện".
          - "Trưởng bộ môn" (departmentHead) chính là "Phụ trách bộ môn" (người sẽ ký văn bản).
          
          Yêu cầu trích xuất:
          1. Tên môn học (subjectName)
          2. Danh sách giảng viên biên soạn (compilationTeam) - Trích xuất danh sách tên thật.
          3. Danh sách giảng viên phản biện/thẩm định (reviewTeam) - Trích xuất danh sách tên thật.
          4. Trưởng bộ môn (departmentHead) - Trích xuất tên thật.
          
          Trả về định dạng JSON.
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subjectName: { type: Type.STRING },
              compilationTeam: { type: Type.ARRAY, items: { type: Type.STRING } },
              reviewTeam: { type: Type.ARRAY, items: { type: Type.STRING } },
              departmentHead: { type: Type.STRING },
            },
            required: ["subjectName", "compilationTeam", "reviewTeam", "departmentHead"],
          },
        },
      });

      const data = JSON.parse(response.text) as SubjectData;
      setSubjectData(data);
      generatePlans(data);
    } catch (err) {
      console.error(err);
      setError("Không thể trích xuất dữ liệu từ file. Vui lòng kiểm tra lại định dạng file hoặc nội dung.");
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePlans = (data: SubjectData) => {
    // Generate Detailed Plan
    const fullPlan: PlanItem[] = TEMPLATE_PLAN.map((item, index) => {
      let person = "";
      if (item.stage === "Biên soạn" || item.stage === "Rà soát nội bộ" || item.stage === "Chỉnh sửa" || item.stage === "Bàn giao") {
        person = data.compilationTeam.join(", ");
      } else if (item.stage === "Phản biện") {
        person = data.reviewTeam.join(", ");
      } else if (item.stage === "Xác nhận khối lượng" || item.stage === "Hồ sơ thanh toán" || item.stage === "Triển khai") {
        person = data.departmentHead;
      } else {
        person = "Phòng KT&ĐBCL";
      }

      return {
        stt: index + 1,
        ...item,
        personInCharge: person
      };
    });
    setDetailedPlan(fullPlan);

    // Generate Individual Plans
    const allLecturers = Array.from(new Set([...data.compilationTeam, ...data.reviewTeam, data.departmentHead]));
    const indPlans: IndividualPlan[] = allLecturers.map(name => {
      const items = fullPlan.filter(item => item.personInCharge.includes(name));
      return { lecturerName: name, items };
    });
    setIndividualPlans(indPlans);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const exportToCSV = (items: PlanItem[], title: string) => {
    const header = "STT,Giai đoạn,Thời gian,Nội dung,Cá nhân phụ trách,Sản phẩm đầu ra,Ghi chú\n";
    const rows = items.map(item => 
      `${item.stt},"${item.stage}","${item.time}","${item.content}","${item.personInCharge}","${item.output}","${item.notes}"`
    ).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllToExcel = async () => {
    if (!subjectData) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ke hoach');

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    const applyTableStyles = (startRow: number, endRow: number) => {
      for (let i = startRow; i <= endRow; i++) {
        const row = worksheet.getRow(i);
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = borderStyle;
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          if (i === startRow) {
            cell.font = { bold: true };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE0E0E0' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          }
        });
      }
    };

    // Set column widths
    worksheet.columns = [
      { width: 8 },  // STT
      { width: 25 }, // Giai đoạn
      { width: 20 }, // Thời gian
      { width: 50 }, // Nội dung
      { width: 35 }, // Phụ trách
      { width: 30 }, // Sản phẩm
      { width: 20 }  // Ghi chú
    ];

    let currentRow = 1;

    // Overall Plan Title
    const titleRow = worksheet.addRow(["KẾ HOẠCH TỔNG THỂ - " + subjectData.subjectName.toUpperCase()]);
    titleRow.font = { bold: true, size: 14 };
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    currentRow++;

    // Overall Plan Header
    const headerRow = worksheet.addRow(["STT", "Giai đoạn", "Thời gian", "Nội dung", "Cá nhân phụ trách", "Sản phẩm đầu ra", "Ghi chú"]);
    const headerRowNum = currentRow;
    currentRow++;

    // Overall Plan Data
    detailedPlan.forEach(item => {
      worksheet.addRow([item.stt, item.stage, item.time, item.content, item.personInCharge, item.output, item.notes]);
      currentRow++;
    });

    applyTableStyles(headerRowNum, currentRow - 1);
    currentRow += 2; // Spacer

    // Individual Plans
    individualPlans.forEach(plan => {
      const indTitleRow = worksheet.addRow(["KẾ HOẠCH CÁ NHÂN - " + plan.lecturerName.toUpperCase()]);
      indTitleRow.font = { bold: true, size: 12 };
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      currentRow++;

      const indHeaderRow = worksheet.addRow(["STT", "Giai đoạn", "Thời gian", "Nội dung", "Cá nhân phụ trách", "Sản phẩm đầu ra", "Ghi chú"]);
      const indHeaderRowNum = currentRow;
      currentRow++;

      plan.items.forEach((item, idx) => {
        worksheet.addRow([idx + 1, item.stage, item.time, item.content, item.personInCharge, item.output, item.notes]);
        currentRow++;
      });

      applyTableStyles(indHeaderRowNum, currentRow - 1);
      currentRow += 2; // Spacer
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${subjectData.subjectName}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const handlePasteSubmit = () => {
    if (pastedText.trim()) {
      processWithGemini(pastedText);
      setShowPasteArea(false);
      setPastedText("");
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-[#141414] p-2 rounded-lg">
            <BookOpen className="text-[#E4E3E0] w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase italic font-serif">NHCHT Manager</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 font-mono">Quản lý Ngân hàng Câu hỏi Thi v1.0</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowPasteArea(!showPasteArea)}
            className="flex items-center gap-2 px-4 py-2 border border-[#141414]/20 hover:border-[#141414] transition-all duration-200 text-sm font-medium"
          >
            <Copy size={16} />
            Dán văn bản
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-[#141414] bg-[#141414] text-[#E4E3E0] hover:bg-opacity-90 transition-all duration-200 text-sm font-medium"
          >
            <Upload size={16} />
            Tải lên file
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".txt,.csv,.json,.doc,.docx"
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Paste Area Modal-like */}
        <AnimatePresence>
          {showPasteArea && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 bg-white border border-[#141414] shadow-[4px_4px_0px_0px_#141414] space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-widest">Dán nội dung từ Excel/PDF/Text</h3>
                  <button onClick={() => setShowPasteArea(false)} className="text-xs opacity-50 hover:opacity-100">Đóng</button>
                </div>
                <textarea 
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Dán danh sách giảng viên, môn học tại đây..."
                  className="w-full h-40 p-4 border border-[#141414]/20 focus:border-[#141414] outline-none font-mono text-sm resize-none"
                />
                <button 
                  onClick={handlePasteSubmit}
                  disabled={!pastedText.trim() || isProcessing}
                  className="w-full py-3 bg-[#141414] text-[#E4E3E0] uppercase tracking-widest text-xs font-bold hover:bg-opacity-90 disabled:opacity-50 transition-all"
                >
                  {isProcessing ? "Đang xử lý..." : "Xác nhận & Phân tích"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Welcome / Empty State */}
        {!subjectData && !isProcessing && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-6"
          >
            <div className="w-24 h-24 border-2 border-dashed border-[#141414] rounded-full flex items-center justify-center opacity-20">
              <FileText size={48} />
            </div>
            <div className="max-w-md">
              <h2 className="text-2xl font-serif italic mb-2">Bắt đầu lập kế hoạch</h2>
              <p className="text-sm opacity-60">Tải lên file chứa thông tin môn học và danh sách giảng viên để hệ thống tự động phân rã kế hoạch chi tiết.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
              {[
                { icon: <Users size={20} />, title: "Tổ biên soạn", desc: "Danh sách giảng viên ra đề" },
                { icon: <CheckCircle2 size={20} />, title: "Tổ phản biện", desc: "Giảng viên thẩm định NHCHT" },
                { icon: <Calendar size={20} />, title: "Kế hoạch khung", desc: "Tự động áp dụng mốc 20-29/3" }
              ].map((item, i) => (
                <div key={i} className="p-4 border border-[#141414]/10 bg-white/30 rounded-lg text-left">
                  <div className="mb-2 opacity-60">{item.icon}</div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-1">{item.title}</h3>
                  <p className="text-[10px] opacity-50 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="animate-spin w-8 h-8 opacity-50" />
            <p className="text-sm font-mono uppercase tracking-widest opacity-50">Đang phân tích dữ liệu...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3"
          >
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        {/* Results */}
        {subjectData && !isProcessing && (
          <div className="space-y-12">
            {/* Subject Overview */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-8 border border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-50 font-mono mb-2">
                  <BookOpen size={12} />
                  Thông tin môn học
                </div>
                <h2 className="text-4xl font-serif italic mb-6">{subjectData.subjectName}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-[10px] uppercase tracking-widest opacity-50 font-mono mb-3">Tổ biên soạn</h3>
                    <div className="space-y-2">
                      {subjectData.compilationTeam.map((name, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <User size={14} className="opacity-40" />
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] uppercase tracking-widest opacity-50 font-mono mb-3">Tổ phản biện</h3>
                    <div className="space-y-2">
                      {subjectData.reviewTeam.map((name, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <User size={14} className="opacity-40" />
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[#141414] text-[#E4E3E0] p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest opacity-50 font-mono mb-4">Trưởng bộ môn</h3>
                  <p className="text-2xl font-serif italic">{subjectData.departmentHead}</p>
                </div>
                <div className="mt-8 pt-8 border-t border-[#E4E3E0]/20">
                  <p className="text-[10px] uppercase tracking-widest opacity-50 font-mono mb-2">Trạng thái</p>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Đã lập kế hoạch chi tiết
                  </div>
                </div>
              </div>
            </section>

            {/* Detailed Plan Table */}
            <section className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-2xl font-serif italic">Kế hoạch chi tiết môn học</h3>
                  <p className="text-xs opacity-50 uppercase tracking-wider">Tổng hợp 9 giai đoạn triển khai</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={exportAllToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-[#E4E3E0] hover:bg-opacity-90 transition-all text-xs font-bold uppercase tracking-widest"
                  >
                    <Download size={16} />
                    Xuất tất cả Excel
                  </button>
                  <button 
                    onClick={() => exportToCSV(detailedPlan, subjectData.subjectName)}
                    className="p-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
                    title="Xuất CSV"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-[#141414]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#141414] text-[#E4E3E0] text-[10px] uppercase tracking-widest font-mono">
                      <th className="p-4 border-r border-[#E4E3E0]/20">STT</th>
                      <th className="p-4 border-r border-[#E4E3E0]/20">Giai đoạn</th>
                      <th className="p-4 border-r border-[#E4E3E0]/20">Thời gian</th>
                      <th className="p-4 border-r border-[#E4E3E0]/20">Nội dung</th>
                      <th className="p-4 border-r border-[#E4E3E0]/20">Phụ trách</th>
                      <th className="p-4 border-r border-[#E4E3E0]/20">Sản phẩm</th>
                      <th className="p-4">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {detailedPlan.map((item) => (
                      <tr key={item.stt} className="border-b border-[#141414]/10 hover:bg-[#141414]/5 transition-colors group">
                        <td className="p-4 text-xs font-mono opacity-50 border-r border-[#141414]/10">{item.stt}</td>
                        <td className="p-4 text-sm font-bold border-r border-[#141414]/10">{item.stage}</td>
                        <td className="p-4 text-sm font-mono border-r border-[#141414]/10">{item.time}</td>
                        <td className="p-4 text-sm border-r border-[#141414]/10 leading-relaxed">{item.content}</td>
                        <td className="p-4 text-sm border-r border-[#141414]/10 italic">{item.personInCharge}</td>
                        <td className="p-4 text-sm border-r border-[#141414]/10">{item.output}</td>
                        <td className="p-4 text-[10px] uppercase tracking-wider opacity-60">{item.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Individual Plans */}
            <section className="space-y-6">
              <div className="border-b border-[#141414] pb-4">
                <h3 className="text-2xl font-serif italic">Phân rã kế hoạch cá nhân</h3>
                <p className="text-xs opacity-50 uppercase tracking-wider">Nhiệm vụ cụ thể cho từng giảng viên</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {individualPlans.map((plan, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white border border-[#141414] overflow-hidden flex flex-col"
                  >
                    <div className="p-4 bg-[#141414] text-[#E4E3E0] flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <User size={16} />
                        <span className="text-sm font-bold uppercase tracking-widest">{plan.lecturerName}</span>
                      </div>
                      <button 
                        onClick={() => exportToCSV(plan.items, `Ke_hoach_${plan.lecturerName}`)}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                        title="Tải kế hoạch cá nhân"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                    <div className="p-0 flex-grow">
                      {plan.items.map((item, i) => (
                        <div key={i} className="p-4 border-b border-[#141414]/10 last:border-0 hover:bg-[#141414]/5 transition-all group">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono bg-[#141414]/10 px-2 py-0.5 rounded uppercase">{item.time}</span>
                            <span className="text-[10px] opacity-40 uppercase font-mono">{item.stage}</span>
                          </div>
                          <p className="text-sm mb-2 leading-relaxed">{item.content}</p>
                          <div className="flex items-center gap-2 text-[10px] opacity-60 italic">
                            <ChevronRight size={10} />
                            Sản phẩm: {item.output}
                          </div>
                        </div>
                      ))}
                      {plan.items.length === 0 && (
                        <div className="p-8 text-center opacity-30 italic text-sm">
                          Không có nhiệm vụ trực tiếp trong kế hoạch này.
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-[#141414] p-10 bg-white/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="opacity-40" />
            <span className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-mono">Hệ thống Quản lý NHCHT © 2026</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity font-mono">Hướng dẫn</a>
            <a href="#" className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity font-mono">Mẫu biểu</a>
            <a href="#" className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity font-mono">Liên hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
