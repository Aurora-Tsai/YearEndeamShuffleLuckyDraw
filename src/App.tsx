/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  RefreshCw, 
  UsersRound, 
  Dices, 
  UserCircle,
  X,
  Shuffle,
  FileUp,
  FileSpreadsheet
} from 'lucide-react';

interface Person {
  id: string; // Employee ID
  name: string;
  department: string;
}

interface Group {
  id: number;
  members: Person[];
}

export default function App() {
  const [names, setNames] = useState<Person[]>([]);
  const [newPerson, setNewPerson] = useState({ id: '', name: '', dept: '' });
  const [groups, setGroups] = useState<Group[]>([]);
  const [numGroups, setNumGroups] = useState(2);
  const [winner, setWinner] = useState<Person | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Test Data
  const loadTestData = () => {
    const testData = [
      { id: 't10001', name: '陳大文', department: '研發部' },
      { id: 't10002', name: '林小慧', department: '人事部' },
      { id: 't10003', name: '王志明', department: '業務部' },
      { id: 't10004', name: '張美玲', department: '行銷部' },
      { id: 't10005', name: '李家豪', department: '研發部' },
      { id: 't10006', name: '黃雅君', department: '財務部' },
      { id: 't10007', name: '曾健平', department: '行政部' },
      { id: 't10008', name: '吳佩珊', department: '業務部' },
      { id: 't10009', name: '趙子龍', department: '安保部' },
      { id: 't10010', name: '孫尚香', department: '行銷部' },
    ];
    setNames(testData);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (groups.length === 0 && !winner) {
      alert('無資料可匯出');
      return;
    }

    let csvContent = '\uFEFF'; // BOM for Excel encoding
    
    // 1. Grouping Results
    if (groups.length > 0) {
      csvContent += '智慧分組結果\n';
      csvContent += '組別,員工編號,姓名,部門\n';
      groups.forEach(group => {
        group.members.forEach(m => {
          csvContent += `${group.id},${m.id},${m.name},${m.department}\n`;
        });
      });
      csvContent += '\n';
    }

    // 2. Winner Results
    if (winner) {
      csvContent += '幸運抽獎結果\n';
      csvContent += '獎項,員工編號,姓名,部門\n';
      csvContent += `頭獎,${winner.id},${winner.name},${winner.department}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `分組與抽籤結果_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      return;
    }

    const reader = new FileReader();
    if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
      reader.onload = (evt) => {
        const bstream = evt.target?.result;
        const wb = XLSX.read(bstream, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        const extracted: Person[] = [];
        // Assume format: [ID, Name, Dept]
        data.slice(1).forEach(row => {
          if (row[0] && row[1]) {
            extracted.push({
              id: String(row[0]).trim(),
              name: String(row[1]).trim(),
              department: String(row[2] || '未分類').trim()
            });
          }
        });

        if (extracted.length > 0) {
          setNames(prev => [...prev, ...extracted]);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        const lines = content.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
        const newPeople = lines.map(line => {
          const parts = line.split(/[,，\t]+/).map(p => p.trim());
          return {
            id: parts[0] || crypto.randomUUID().slice(0, 8),
            name: parts[1] || parts[0],
            department: parts[2] || '未分類'
          };
        });
        setNames(prev => [...prev, ...newPeople]);
      };
      reader.readAsText(file);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  // Add Name
  const addPerson = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newPerson.id && newPerson.name) {
      setNames(prev => [...prev, { ...newPerson, department: newPerson.dept || '未分類' }]);
      setNewPerson({ id: '', name: '', dept: '' });
    }
  };

  // Remove Name
  const removeName = (id: string) => {
    setNames(prev => prev.filter(n => n.id !== id));
  };

  // Clear All
  const clearAll = () => {
    setNames([]);
    setGroups([]);
    setWinner(null);
    setPdfUrl(null);
  };

  // Grouping Logic
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const createGroups = () => {
    if (names.length < numGroups) return;
    
    const shuffled = shuffleArray(names);
    const newGroups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
      id: i + 1,
      members: []
    }));

    shuffled.forEach((person, index) => {
      newGroups[index % numGroups].members.push(person);
    });

    setGroups(newGroups);
  };

  // Drawing Logic
  const drawWinner = () => {
    if (names.length === 0) return;
    setIsDrawing(true);
    setWinner(null);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * names.length);
      setWinner(names[randomIndex]);
      setIsDrawing(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-slate-800 font-sans p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl vibrant-shadow">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <UsersRound className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">歲末大獎分組抽籤</h1>
              <p className="text-sm text-slate-500 font-medium">Year-End Team Shuffle & Lucky Draw</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".xlsx,.xls,.csv,.txt,.pdf"
            />
            <button 
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-5 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-bold hover:bg-indigo-100 transition-all border border-indigo-100"
            >
              <FileUp className="w-5 h-5 rotate-180" />
              <span>匯出結果</span>
            </button>
            <button 
              onClick={triggerFileInput}
              className="flex items-center space-x-2 px-5 py-3 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
            >
              <FileUp className="w-5 h-5" />
              <span>匯入文件</span>
            </button>
            <button 
              onClick={loadTestData}
              className="flex items-center space-x-2 px-5 py-3 bg-teal-500 text-white rounded-2xl font-bold hover:bg-teal-600 transition-all shadow-lg shadow-teal-100"
            >
              <RefreshCw className="w-5 h-5" />
              <span>載入測試名單</span>
            </button>
            <button 
              onClick={clearAll}
              className="flex items-center space-x-2 px-5 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all"
            >
              <Trash2 className="w-5 h-5" />
              <span>全部清除</span>
            </button>
          </div>
        </header>

        {/* TOP STATUS BAR (Move to top) */}
        <section className="bg-white rounded-2xl vibrant-shadow flex items-center px-6 py-4 justify-between border border-white">
          <div className="flex items-center space-x-6 text-sm font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">總人數：</span>
              <span className="text-indigo-600 text-lg">{names.length}</span>
            </div>
            <span className="w-px h-4 bg-slate-200"></span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">分組總數：</span>
              <span className="text-indigo-600 text-lg">{groups.length}</span>
            </div>
            <span className="w-px h-4 bg-slate-200"></span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">平均每組：</span>
              <span className="text-indigo-600 text-lg">{groups.length > 0 ? (names.length / groups.length).toFixed(1) : 0} 人</span>
            </div>
          </div>
          <div className="hidden md:block text-indigo-600 font-black text-sm uppercase tracking-widest opacity-50">
            System Overview
          </div>
        </section>

        <main className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Left Column: Personnel Management (COL 1-3) */}
          <aside className="xl:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl vibrant-shadow flex flex-col p-6 h-full max-h-[800px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-700">待分組名單</h2>
              </div>
              
              <form onSubmit={addPerson} className="space-y-2 mb-6">
                <input 
                  type="text" 
                  value={newPerson.id}
                  onChange={(e) => setNewPerson(p => ({...p, id: e.target.value}))}
                  placeholder="員工編號..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                />
                <input 
                  type="text" 
                  value={newPerson.name}
                  onChange={(e) => setNewPerson(p => ({...p, name: e.target.value}))}
                  placeholder="員工姓名..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                />
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newPerson.dept}
                    onChange={(e) => setNewPerson(p => ({...p, dept: e.target.value}))}
                    placeholder="部門..."
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                  />
                  <button 
                    type="submit"
                    className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                </div>
              </form>

              <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {names.map((person, index) => (
                    <motion.div 
                      key={`person-${person.id}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100 group relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">{person.id}</span>
                        <button 
                          onClick={() => removeName(person.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-slate-800 font-bold text-sm leading-tight">{person.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{person.department}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {names.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-sm font-medium italic">
                    尚未導入人員名單
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Middle/Right Columns (COL 4-12) */}
          <div className="xl:col-span-9 space-y-6">
            
            {/* Split row for PDF Preview and Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* PDF Preview Area */}
              <section className="bg-white p-6 rounded-3xl vibrant-shadow flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-teal-500" />
                    <h2 className="text-xl font-black text-slate-800">抽籤規則與規範</h2>
                  </div>
                  {pdfUrl && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => window.open(pdfUrl, '_blank')}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 px-2 py-1 rounded-lg"
                      >
                        在新分頁開啟
                      </button>
                      <button 
                        onClick={() => {
                          URL.revokeObjectURL(pdfUrl);
                          setPdfUrl(null);
                        }}
                        className="text-xs font-bold text-red-400 hover:text-red-600"
                      >
                        關閉
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden relative">
                  {pdfUrl ? (
                    <div className="w-full h-full flex flex-col">
                      <iframe 
                        src={`${pdfUrl}#toolbar=0`} 
                        className="flex-1 w-full border-none" 
                        title="Rules Preview"
                      />
                      <div className="p-2 bg-slate-100 flex justify-center border-t border-slate-200">
                        <p className="text-[10px] text-slate-500 font-bold">若無法預覽，請點擊上方按鈕在新分頁開啟</p>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                      <FileUp className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-wider">請匯入 PDF 文件</p>
                      <p className="text-[10px] mt-2 leading-relaxed">上傳分組抽籤規範 PDF 以在此預覽內容</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Drawing Module */}
              <section className="bg-white p-6 rounded-3xl vibrant-shadow flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <Dices className="w-6 h-6 text-orange-500" />
                  <h2 className="text-xl font-black text-slate-800">隨機幸運抽獎</h2>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <div className="absolute inset-0 bg-slate-50 rounded-full border border-slate-100 shadow-inner"></div>
                    <AnimatePresence mode="wait">
                      {isDrawing ? (
                        <motion.div 
                          key="drawing"
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
                          className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full"
                        />
                      ) : winner ? (
                        <motion.div 
                          key="winner"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex flex-col items-center z-10 text-center"
                        >
                          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2">
                            <UserCircle className="w-10 h-10" />
                          </div>
                          <span className="text-[10px] font-black text-orange-400">{winner.id}</span>
                          <span className="text-2xl font-black text-slate-800">{winner.name}</span>
                          <span className="text-xs text-slate-500 font-bold">{winner.department}</span>
                        </motion.div>
                      ) : (
                        <motion.div key="idle" className="text-slate-300 flex flex-col items-center z-10">
                          <Dices className="w-16 h-16 mb-2 opacity-10" />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">READY</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button 
                    onClick={drawWinner}
                    disabled={names.length === 0 || isDrawing}
                    className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-lg hover:bg-orange-600 shadow-xl shadow-orange-100 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                  >
                    {isDrawing ? '正在抽選...' : '立即抽出獲勝者'}
                  </button>
                </div>
              </section>
            </div>

            {/* Grouping Module (Full width of right area) */}
            <section className="bg-white p-6 rounded-3xl vibrant-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800">智慧自動分組</h2>
                  <div className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2 flex-shrink-0"></span>
                    系統狀態：已就緒
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-black ml-2 uppercase">期望組數</span>
                  <input 
                    type="number" 
                    min="2" 
                    max={names.length || 2}
                    value={numGroups}
                    onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)}
                    className="w-16 h-10 bg-white border border-slate-200 rounded-xl text-center font-black text-slate-700 focus:outline-none"
                  />
                  <button 
                    onClick={createGroups}
                    disabled={names.length < 2}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    <Shuffle className="w-5 h-5" />
                    <span>立即分組</span>
                  </button>
                </div>
              </div>

              {groups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groups.map((group, index) => (
                    <motion.div 
                      key={group.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-5 bg-slate-50 rounded-2xl border border-slate-100 group-card-${(index % 6) + 1}`}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-slate-700 text-lg">第 {group.id} 小組</h3>
                        <span className="text-xs font-bold text-slate-400">{group.members.length} 人</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {group.members.map((m, i) => (
                          <div key={`group-member-${group.id}-${m.id}-${i}`} className="bg-white p-2 rounded-lg text-center font-black text-slate-600 shadow-sm text-[11px] border border-slate-100/50" title={m.name}>
                            {m.id}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 font-bold bg-slate-50/50">
                  請先匯入人員名單並設定組數
                </div>
              )}
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
