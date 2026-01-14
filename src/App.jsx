import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Extension } from '@tiptap/core'
import * as Diff from 'diff'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import { jsPDF } from 'jspdf'
import * as htmlToImage from 'html-to-image'
import AppAnalysis from './AppAnalysis'

// Custom FontSize Extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
          renderHTML: attributes => {
            if (!attributes.fontSize) return {}
            return { style: `font-size: ${attributes.fontSize}` }
          },
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
      },
    }
  },
})

function App() {
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [showDocSettings, setShowDocSettings] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView] = useState('main') // 'main' 또는 'editor'
  const [originalContent, setOriginalContent] = useState({
    prompt: '',  // 사용자가 입력한 프롬프트
    files: []    // [{name: string, content: string}] 파일명과 추출된 텍스트
  })
  const [editorData, setEditorData] = useState({
    personalInfo: [
      { id: 'name', label: '성명', value: '', placeholder: '성명을 입력하세요' },
      { id: 'idNumber', label: '주민등록번호', value: '', placeholder: '000000-0000000' },
      { id: 'address', label: '주소', value: '', placeholder: '상세 주소를 입력하세요' },
      { id: 'job', label: '직업', value: '', placeholder: '직업을 입력하세요' },
      { id: 'officeAddress', label: '사무실 주소', value: '', placeholder: '해당 시 입력' },
      { id: 'phone', label: '전화', value: '', placeholder: '전화번호를 입력하세요' },
      { id: 'email', label: '이메일', value: '', placeholder: '이메일을 입력하세요' },
    ],
    accusedInfo: [
      { id: 'acc_name', label: '성명', value: '', placeholder: '피고소인 성명' },
      { id: 'acc_phone', label: '연락처', value: '', placeholder: '피고소인 연락처' },
      { id: 'acc_address', label: '주소', value: '', placeholder: '피고소인 주소' },
    ],
    purpose: '',
    facts: '',
    reasons: '',
    date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
    policeStation: 'OO 경찰서 귀중'
  })

  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files)
    addFiles(selectedFiles)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }

  const addFiles = (newFiles) => {
    const validExtensions = ['.pdf', '.docx', '.xlsx', '.pptx']
    const filteredFiles = newFiles.filter(file => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      return validExtensions.includes(ext)
    })

    setFiles(prev => [...prev, ...filteredFiles])
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const previewRef = useRef(null)

  const handleGeneratePdf = async () => {
    setIsPdfGenerating(true);
    try {
      if (!previewRef.current) return;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = Array.from(previewRef.current.children);

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        // Use html-to-image which handles modern CSS (like oklch in Tailwind v4) better
        const dataUrl = await htmlToImage.toPng(page, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#ffffff'
        });

        const pdfWidth = 210; // A4 width in mm
        const pdfHeight = 297; // A4 height in mm

        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      const pdfBlob = pdf.output('bloburl');
      setPdfUrl(pdfBlob);

      // Artificial delay for UX
      setTimeout(() => {
        setView('analysis');
        setIsPdfGenerating(false);
      }, 1000);

    } catch (error) {
      console.error("PDF Generation failed", error);
      alert("PDF 생성 중 오류가 발생했습니다.");
      setIsPdfGenerating(false);
    }
  };

  const handleCreateDocument = async () => {
    const promptValue = document.querySelector('textarea')?.value;
    if (!promptValue && files.length === 0) {
      alert('지시어를 입력하거나 자료를 첨부해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // 파일 데이터를 Base64로 변환
      const filePromises = files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              name: file.name,
              type: file.type,
              data: e.target.result.split(',')[1] // base64 부분만 추출
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const fileData = await Promise.all(filePromises);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptValue,
          files: fileData,
          options: { showDocSettings }
        })
      });

      const data = await response.json();

      if (data.success) {
        // 원문 데이터 저장 (프롬프트 + 파일 추출 내용)
        setOriginalContent({
          prompt: promptValue || '',
          files: data.extractedFiles || fileData.map(f => ({ name: f.name, content: '' }))
        });

        // AI 응답을 동적 배열 구조로 매핑
        const mappedData = {
          personalInfo: [
            { id: 'name', label: '성명', value: data.data.name || '' },
            { id: 'idNumber', label: '주민등록번호', value: data.data.idNumber || '' },
            { id: 'address', label: '주소', value: data.data.address || '' },
            { id: 'job', label: '직업', value: data.data.job || '' },
            { id: 'officeAddress', label: '사무실 주소', value: data.data.officeAddress || '' },
            { id: 'phone', label: '전화', value: data.data.phone || '' },
            { id: 'email', label: '이메일', value: data.data.email || '' },
          ],
          accusedInfo: [
            { id: 'acc_name', label: '성명', value: data.data.accusedName || '' },
            { id: 'acc_phone', label: '연락처', value: data.data.accusedPhone || '' },
            { id: 'acc_address', label: '주소', value: data.data.accusedAddress || '' },
          ],
          purpose: data.data.purpose || '',
          facts: data.data.facts || '',
          reasons: data.data.reasons || '',
          date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
          policeStation: 'OO 경찰서 귀중'
        };
        setEditorData(mappedData);
        setView('editor');
      } else {
        alert('분석 실패: ' + data.error);
      }
    } catch (error) {
      console.error('API Error:', error);
      alert('문서 분석 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateSection = async (sectionKey) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'regenerate',
          section: sectionKey, // 'purpose', 'facts', 'reasons'
          currentContent: editorData[sectionKey],
          context: {
            purpose: editorData.purpose,
            facts: editorData.facts,
            reasons: editorData.reasons
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setEditorData(prev => ({
          ...prev,
          [sectionKey]: data.data[sectionKey] || prev[sectionKey]
        }));
      } else {
        alert('재작성 실패: ' + data.error);
      }
    } catch (error) {
      console.error('Regenerate Error:', error);
      alert('AI 재작성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const addPersonalInfoField = () => {
    const newField = { id: Date.now(), label: '입력', value: '', placeholder: '내용을 입력하세요' };
    setEditorData({
      ...editorData,
      personalInfo: [...editorData.personalInfo, newField]
    });
  };

  const removePersonalInfoField = (id) => {
    setEditorData({
      ...editorData,
      personalInfo: editorData.personalInfo.filter(f => f.id !== id)
    });
  };

  const updatePersonalInfoField = (id, key, val) => {
    setEditorData({
      ...editorData,
      personalInfo: editorData.personalInfo.map(f => f.id === id ? { ...f, [key]: val } : f)
    });
  };

  const addAccusedInfoField = () => {
    const newField = { id: Date.now(), label: '항목', value: '', placeholder: '내용을 입력하세요' };
    setEditorData({
      ...editorData,
      accusedInfo: [...editorData.accusedInfo, newField]
    });
  };

  const removeAccusedInfoField = (id) => {
    setEditorData({
      ...editorData,
      accusedInfo: editorData.accusedInfo.filter(f => f.id !== id)
    });
  };

  const updateAccusedInfoField = (id, key, val) => {
    setEditorData({
      ...editorData,
      accusedInfo: editorData.accusedInfo.map(f => f.id === id ? { ...f, [key]: val } : f)
    });
  };

  const docRef = useRef(null);
  const [totalPages, setTotalPages] = useState(1);

  // Chat Modal State
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatModalSection, setChatModalSection] = useState(''); // 'purpose' | 'facts' | 'reasons'
  const [chatMessages, setChatMessages] = useState([]); // [{role: 'user'|'ai', content: string}]
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const sectionLabels = {
    purpose: '고소취지',
    facts: '범죄사실',
    reasons: '고소이유'
  };

  // Editor Modal State
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editorModalSection, setEditorModalSection] = useState(null);
  const [fullscreenColumn, setFullscreenColumn] = useState(null); // 'original', 'ai', 'editor'

  // 에디터 임시 상태 (저장 전까지 원본 데이터 보호)
  const [tempEditorContent, setTempEditorContent] = useState('');

  // AI 프롬프트 원문 (Diff 비교용)
  const [aiPromptContent, setAiPromptContent] = useState('');

  // 모달 상태
  const [formatConfirmModalOpen, setFormatConfirmModalOpen] = useState(false); // 모달 오픈시 저장되는 원본 내용
  const [columnVisibility, setColumnVisibility] = useState({
    original: true,
    ai: true,
    editor: true
  });
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showVisualDiff, setShowVisualDiff] = useState(false);
  const [savedEditorContent, setSavedEditorContent] = useState('');

  const toggleVisualDiff = () => {
    if (showDiff) {
      // 인라인 Diff 모드가 켜져 있다면 끄기
      toggleDiff();
    }
    setShowVisualDiff(!showVisualDiff);
  };

  const toggleDiff = () => {
    if (showVisualDiff) {
      // 비주얼 Diff 끄기
      setShowVisualDiff(false);
    }
    if (!editor) return;

    if (!showDiff) {
      // Diff 모드 켜기
      // TipTap의 getText()는 텍스트만 반환하지만, 줄바꿈 처리가 다를 수 있음
      // 원문(oldValue)과 에디터 내용(newValue) 모두 HTML 태그를 제거하고 비교하거나, 텍스트만 비교

      // HTML 태그 제거 및 공백 정규화 함수
      const stripHtml = (html) => {
        if (!html) return '';
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
      }

      const currentText = stripHtml(editor.getHTML()).trim();
      const originalText = stripHtml(aiPromptContent || '').trim();


      const diff = Diff.diffChars(originalText, currentText);
      let html = '';

      diff.forEach((part) => {
        const color = part.added ? 'red' : 'inherit';
        const fontWeight = part.added ? 'bold' : 'normal';

        if (part.removed) {
          return; // 삭제된 부분은 표시하지 않음
        }

        let value = part.value.replace(/\n/g, '<br>');

        if (part.added) {
          html += `<span style="color: ${color}; font-weight: ${fontWeight}">${value}</span>`;
        } else {
          html += value;
        }
      });

      // 줄바꿈 보존을 위해 스타일 적용 (하지만 setContent는 HTML을 넣으므로 <br>이 중요)
      // 전체를 pre-wrap으로 감싸서 공백과 줄바꿈이 보이도록 함.
      // TipTap setContent는 block node를 기대하므로, p 태그 등으로 감싸주는 것이 좋음.
      // 하지만 단순 비교를 위해 div로 감싸고 스타일 지정
      // 현재 상태 저장 (복구용)
      setSavedEditorContent(editor.getHTML());

      editor.commands.setContent(`<div style="white-space: pre-wrap;">${html}</div>`);
      editor.setEditable(false);
    } else {
      // Diff 모드 끄기
      // 저장된 내용으로 복구
      if (savedEditorContent) {
        editor.commands.setContent(savedEditorContent);
      }
      editor.setEditable(true);
    }
    setShowDiff(!showDiff);
  };

  const formatParagraphs = () => {
    if (!editor) return;
    setFormatConfirmModalOpen(true);
  };

  const executeFormatParagraphs = () => {
    if (!editor) return;

    const text = editor.getText();

    // 1. 마침표(.) 뒤에 공백이 있거나 줄바꿈이 있는 경우를 기준으로 문단 분리
    // 2. 각 문장을 <br> 태그로 연결하여 줄바꿈(Soft Break, Shift+Enter) 처리
    // 이렇게 하면 문단 간격이 벌어지지 않고 줄만 바뀜
    const paragraphs = text
      .replace(/([.?!])\s+/g, '$1|') // 문장 끝 부호(.?!) 뒤 공백을 구분자로 변경
      .split('|')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    // <p> 태그 하나에 모든 문장을 넣고 <br><br>로 구분 (엔터값 추가)
    // 원문과 비교하기 기능과 충돌 방지를 위해 HTML 태그 제거된 텍스트 기반으로 재구성되므로 주의 필요
    const newHtml = `<p>${paragraphs.join('<br><br>')}</p>`;

    editor.commands.setContent(newHtml);
    setFormatConfirmModalOpen(false);
  };

  const toggleColumnVisibility = (column) => {
    const visibleCount = Object.values(columnVisibility).filter(Boolean).length;

    // 1개만 남았을 때 끄려고 하면 경고
    if (visibleCount === 1 && columnVisibility[column]) {
      setWarningModalOpen(true);
      return;
    }

    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // TipTap Editor Setup
  // useMemo를 사용하여 extensions 배열을 메모이제이션 (불필요한 재생성 방지)
  const extensions = useMemo(() => [
    StarterKit,
    TextStyle,
    Color,
    FontSize, // 커스텀 확장
    Underline,
    Link.configure({
      openOnClick: false,
    }),
  ], []);

  const editor = useEditor({
    extensions,
    content: '',
    onUpdate: ({ editor }) => {
      // 에디터 내용 변경 시 임시 상태 업데이트 (실시간 원본 반영 X)
      setTempEditorContent(editor.getHTML());
    },
  }); // 의존성 배열 제거 (한 번만 초기화)

  // 섹션 변경 시 에디터 내용 업데이트
  useEffect(() => {
    // This useEffect is no longer needed to set content on section change
    // as openEditorModal now handles initial content setting.
    // It might be useful for other editor-related side effects if any.
  }, [editorModalSection, editor]);

  const toggleFullscreen = (column) => {
    setFullscreenColumn(prev => prev === column ? null : column);
  };

  // 에디터 모달 열기
  const openEditorModal = (section) => {
    // 1. 현재 섹션 설정
    setEditorModalSection(section);

    // 2. 현재 데이터로 임시 상태 초기화
    const initialContent = editorData[section] || '';
    setTempEditorContent(initialContent);

    // 3. TipTap 에디터에 내용 주입
    if (editor) {
      editor.commands.setContent(initialContent);
    }

    // 4. 모달 열기
    setEditorModalOpen(true);

    // 5. 원문(AI Prompt output) 가져오기 (가상)
    // 실제로는 API 응답 시 저장해둔 원문을 가져와야 함.
    // 여기서는 현재 값이 곧 원문이라고 가정하거나, 별도의 originalData가 필요함.
    // 일단 현재 수정 전 값을 원문으로 설정
    setAiPromptContent(initialContent);
  };

  // 에디터 저장 (적용)
  // 저장 시 Diff 모드가 켜져 있다면, 원본(수정본) 내용(savedEditorContent)을 저장해야 함 (Diff 태그 제외)
  const saveEditorContent = () => {
    if (editorModalSection) {
      const contentToSave = showDiff ? savedEditorContent : tempEditorContent;

      setEditorData(prev => ({
        ...prev,
        [editorModalSection]: contentToSave
      }));
    }
    closeEditorModal();
  };

  // 에디터 모달 닫기 (저장 없이 닫힘)
  const closeEditorModal = () => {
    setEditorModalOpen(false);
    setEditorModalSection(null);
    setFullscreenColumn(null);
    setAiPromptContent('');
    setShowDiff(false);
    setShowVisualDiff(false);
    setTempEditorContent('');

    // 에디터 초기화
    if (editor) {
      editor.commands.clearContent();
      editor.setEditable(true);
    }
  };

  const openChatModal = (section) => {
    // 다른 섹션으로 전환할 때만 대화 초기화
    if (section !== chatModalSection) {
      setChatMessages([]);
      setChatInput('');
    }
    setChatModalSection(section);
    setChatModalOpen(true);
  };

  const closeChatModal = () => {
    setChatModalOpen(false);
    // 대화 내용은 유지 (같은 섹션 재진입 시 이어서 대화 가능)
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          section: chatModalSection,
          message: userMessage,
          history: chatMessages,
          context: {
            purpose: editorData.purpose,
            facts: editorData.facts,
            reasons: editorData.reasons
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'ai', content: data.data.response }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'ai', content: '죄송합니다. 오류가 발생했습니다: ' + data.error }]);
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setChatMessages(prev => [...prev, { role: 'ai', content: '네트워크 오류가 발생했습니다. 다시 시도해 주세요.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const applyAiResponse = (content) => {
    setEditorData(prev => ({
      ...prev,
      [chatModalSection]: content
    }));
    closeChatModal();
  };

  // 채팅 스크롤 자동 이동
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // 컨텐츠 높이 측정 및 페이지 수 계산
  useEffect(() => {
    if (view === 'editor' && docRef.current) {
      const updatePageCount = () => {
        const height = docRef.current.scrollHeight;
        const pageHeight = 1122; // 297mm at 96dpi
        const count = Math.ceil(height / pageHeight);
        setTotalPages(1 + count);
      };

      // 이미지 로드나 텍스트 렌더링 후 측정을 위해 약간의 지연
      const timer = setTimeout(updatePageCount, 100);
      window.addEventListener('resize', updatePageCount);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updatePageCount);
      };
    }
  }, [view, editorData]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 border-b border-border-light bg-white sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <span className="material-symbols-outlined text-3xl">auto_awesome</span>
            <span>AI STUDIO</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
            <a className="hover:text-primary transition-colors" href="#">홈</a>
            <a className="hover:text-primary transition-colors" href="#">창작마켓</a>
            <div className="relative">
              <a className="text-primary py-5 inline-block" href="#">창작작업실</a>
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>
            </div>
            <a className="hover:text-primary transition-colors" href="#">요금제</a>
            <a className="hover:text-primary transition-colors" href="#">고객센터</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <span className="material-symbols-outlined">shopping_cart</span>
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-border-light">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-slate-400">person</span>
            </div>
            <span className="text-sm font-medium text-slate-700">사용자님</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-20 border-r border-border-light bg-white flex flex-col items-center py-6 gap-8">
          <button className="p-2 text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <div className="flex flex-col gap-6">
            <button className="group flex flex-col items-center gap-1">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined">dashboard</span>
              </div>
            </button>
            <button className="group flex flex-col items-center gap-1">
              <div className="p-2 text-slate-400 hover:bg-slate-50 hover:text-primary rounded-xl transition-all">
                <span className="material-symbols-outlined">folder</span>
              </div>
            </button>
            <button className="group flex flex-col items-center gap-1">
              <div className="p-2 text-slate-400 hover:bg-slate-50 hover:text-primary rounded-xl transition-all">
                <span className="material-symbols-outlined">analytics</span>
              </div>
            </button>
            <button className="group flex flex-col items-center gap-1">
              <div className="p-2 text-slate-400 hover:bg-slate-50 hover:text-primary rounded-xl transition-all">
                <span className="material-symbols-outlined">settings</span>
              </div>
            </button>
          </div>
          <div className="mt-auto">
            <button className="p-2 text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </aside>

        {view === 'main' ? (
          <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              <nav className="flex text-xs text-slate-400 items-center gap-2">
                <span className="material-symbols-outlined text-sm">home</span>
                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                <span>창작작업실</span>
                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                <span className="text-slate-800 font-semibold">문서 만들기</span>
              </nav>
              <div className="flex justify-between items-end">
                <h1 className="text-2xl font-bold text-slate-900">창작작업실</h1>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                {[
                  { icon: 'play_circle', label: '유튜브 영상만들기', desc: '텍스트, 영상, 음성 활용' },
                  { icon: 'description', label: '문서 만들기', desc: '문서 에디터, 텍스트 생성 AI', active: true },
                  { icon: 'bar_chart', label: '리서치&분석', desc: '리서치, 분석, 통계 생성' },
                  { icon: 'code', label: '프로그래밍', desc: '코드 생성 AI 활용' },
                  { icon: 'image', label: '이미지, 디자인', desc: '포스터, 로고 디자인' },
                  { icon: 'music_note', label: '음악', desc: '배경음악, 효과음 생성' },
                  { icon: 'mic', label: '음성', desc: '시내레이션, 클로닝' },
                  { icon: 'more_horiz', label: '기타', desc: '프로세스, PPT 등' },
                ].map((item, i) => (
                  <div key={i} className={`${item.active ? 'bg-primary text-white shadow-lg shadow-primary/20 transform hover:scale-[1.02]' : 'bg-white border border-border-light hover:border-primary/50 hover:shadow-sm'} p-5 rounded-2xl cursor-pointer transition-all`}>
                    <span className={`material-symbols-outlined text-3xl mb-3 ${item.active ? '' : 'text-slate-300'}`}>{item.icon}</span>
                    <div className={`font-bold text-[15px] ${item.active ? '' : 'text-slate-900'}`}>{item.label}</div>
                    <div className={`text-xs mt-1.5 leading-tight ${item.active ? 'opacity-90' : 'text-slate-500 font-medium'}`}>{item.desc}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button className="px-5 py-2 rounded-full border border-border-light bg-white hover:bg-slate-50 text-sm text-slate-600 transition-colors">보유한 양식에 텍스트 입력</button>
                <button className="px-5 py-2 rounded-full border border-border-light bg-white hover:bg-slate-50 text-sm text-slate-600 transition-colors">나만의 양식 만들기</button>
                <button className="px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold shadow-sm">양식 생성 후 내용 작성</button>
                <button className="px-5 py-2 rounded-full border border-border-light bg-white hover:bg-slate-50 text-sm text-slate-600 transition-colors">양식 만들기</button>
                <button className="px-5 py-2 rounded-full border border-border-light bg-white hover:bg-slate-50 text-sm text-slate-600 transition-colors">내용 작성 후 검수 받기</button>
                <button className="px-5 py-2 rounded-full border border-border-light bg-white/50 text-sm text-slate-400 cursor-not-allowed">관련 서비스 표시 영역</button>
              </div>

              <div className="bg-white border border-border-light rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border-light bg-slate-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <div className="flex gap-3">
                      <select className="bg-white border-slate-300 rounded-lg text-sm font-medium py-2 px-3 focus:ring-primary focus:border-primary outline-none" defaultValue="법률">
                        <option>문서 유형</option>
                        <option>법률</option>
                        <option>기획서</option>
                        <option>계약서</option>
                      </select>
                      <select className="bg-white border-slate-300 rounded-lg text-sm font-medium py-2 px-3 focus:ring-primary focus:border-primary outline-none" defaultValue="국내 법률">
                        <option>전문 분야</option>
                        <option>국내 법률</option>
                        <option>IT/기술</option>
                        <option>법률</option>
                        <option>마케팅</option>
                      </select>
                      <select className="bg-white border-slate-300 rounded-lg text-sm font-medium py-2 px-3 focus:ring-primary focus:border-primary outline-none" defaultValue="고소장">
                        <option>고소장</option>
                        <option>표준 양식</option>
                      </select>
                      <button className="bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">프리셋</button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDocSettings(!showDocSettings)}
                    className="flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    문서 설정 <span className="material-symbols-outlined text-xl transition-transform duration-300" style={{ transform: showDocSettings ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                  </button>
                </div>

                {showDocSettings && (
                  <div className="px-6 py-5 border-b border-border-light bg-slate-50/30 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col gap-4">
                      <span className="text-sm font-bold text-slate-900">휴먼 작업 요청</span>
                      <div className="flex items-center gap-3">
                        <select className="bg-white border-slate-200 rounded-xl text-sm font-medium py-2.5 px-4 focus:ring-primary focus:border-primary outline-none shadow-sm min-w-[150px]">
                          <option>감수 요청</option>
                          <option>번역 요청</option>
                          <option>디자인 요청</option>
                        </select>
                        <select className="bg-white border-slate-200 rounded-xl text-sm font-medium py-2.5 px-4 focus:ring-primary focus:border-primary outline-none shadow-sm min-w-[150px]">
                          <option>고급전문가</option>
                          <option>일반전문가</option>
                          <option>초급전문가</option>
                        </select>
                        <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm ms-2">
                          <input className="rounded-full text-primary focus:ring-primary w-4.5 h-4.5 border-slate-300" type="checkbox" />
                          <span className="text-sm font-bold text-slate-700">긴급</span>
                        </label>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors ms-1">
                          <span className="material-symbols-outlined">help</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="px-6 py-5 border-b border-border-light flex items-center gap-10">
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">사용 AI</span>
                  <div className="flex flex-wrap gap-8 text-sm font-semibold">
                    {['ChatGPT', 'Claude 3.5', 'Gemini Pro', 'wrtn.'].map((model) => (
                      <label key={model} className={`flex items-center gap-2.5 ${model === 'ChatGPT' ? 'cursor-pointer text-slate-800' : 'cursor-not-allowed text-slate-400'}`}>
                        <input
                          name="ai-model"
                          type="radio"
                          defaultChecked={model === 'ChatGPT'}
                          disabled={model !== 'ChatGPT'}
                          className="rounded-full border-slate-300 text-primary focus:ring-primary w-4.5 h-4.5 disabled:bg-slate-100"
                        /> {model}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-[450px]">
                  <div className={`flex-1 flex flex-col p-6 transition-all relative ${isDragging ? 'bg-primary/5' : 'bg-white'}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}>

                    {/* Unified Input Container */}
                    <div className="flex-1 flex flex-col bg-slate-50/50 rounded-3xl p-6 border border-slate-200 focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                      <div className="flex-1 flex mb-4">
                        <textarea
                          className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-base text-slate-700 placeholder:text-slate-400 resize-none min-h-[120px]"
                          placeholder="입력하세요"
                          value={originalContent.prompt}
                          onChange={(e) => setOriginalContent(prev => ({ ...prev, prompt: e.target.value }))}
                        ></textarea>
                      </div>

                      <div className="mt-auto pt-6 flex flex-col gap-5">
                        {files.length > 0 && (
                          <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 border-b border-slate-100 pb-5">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">첨부파일 사용 방식</span>
                            <div className="flex items-center gap-6">
                              <label className="flex items-center gap-2.5 cursor-not-allowed text-sm font-semibold text-slate-400">
                                <input
                                  name="attach-mode"
                                  type="radio"
                                  disabled
                                  className="rounded-full border-slate-300 text-slate-300 w-4.5 h-4.5"
                                />
                                첨부파일 그대로 사용
                              </label>
                              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                                <input
                                  name="attach-mode"
                                  type="radio"
                                  defaultChecked
                                  className="rounded-full border-slate-300 text-primary focus:ring-primary w-4.5 h-4.5 shadow-sm"
                                />
                                첨부파일 참조
                              </label>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex flex-wrap gap-2 items-center">
                            {files.map((file, i) => (
                              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-xs font-medium text-slate-600 group hover:border-primary/50 transition-all">
                                <span className="material-symbols-outlined text-sm text-primary">description</span>
                                <span className="max-w-[120px] truncate">{file.name}</span>
                                <button onClick={() => removeFile(i)} className="ml-1 text-slate-400 hover:text-red-500 transition-colors">
                                  <span className="material-symbols-outlined text-sm">cancel</span>
                                </button>
                              </div>
                            ))}
                            {files.length === 0 && isDragging && (
                              <div className="text-sm font-bold text-primary animate-pulse">파일을 여기에 놓아주세요</div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <input type="file" id="fileInput" multiple accept=".pdf,.docx,.xlsx,.pptx" className="hidden" onChange={handleFileUpload} />
                            <button
                              onClick={() => document.getElementById('fileInput').click()}
                              className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                            >
                              파일 올리기
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              <div className="flex justify-center items-center pt-4 pb-16">
                <button
                  onClick={handleCreateDocument}
                  disabled={isLoading}
                  className={`flex items-center gap-3 px-16 py-4 rounded-2xl bg-primary text-white font-black text-lg shadow-2xl shadow-primary/30 transition-all scale-105 ${isLoading ? 'opacity-70 cursor-wait' : 'hover:bg-blue-700 hover:scale-110 active:scale-100'}`}
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span className="material-symbols-outlined text-2xl">edit_document</span>
                  )}
                  {isLoading ? '분석 중...' : '문서 생성'}
                </button>
              </div>
            </div>
          </main>
        ) : view === 'editor' ? (
          /* Editor View */
          <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Editor Column */}
              <div className="w-3/5 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setView('main')}
                      className="flex items-center gap-1 text-slate-400 hover:text-primary transition-colors group"
                    >
                      <span className="material-symbols-outlined text-xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
                      <span className="text-xs font-bold">뒤로가기</span>
                    </button>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <div className="flex items-center gap-2 group cursor-pointer">
                      <span className="material-symbols-outlined text-primary text-2xl group-hover:scale-110 transition-transform">edit_note</span>
                      <h2 className="text-sm font-black text-slate-800 tracking-widest uppercase">Editor</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><span className="material-symbols-outlined text-xl">description</span></button>
                    <button className="p-2 bg-primary text-white rounded-lg shadow-md shadow-primary/20"><span className="material-symbols-outlined text-xl">edit</span></button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><span className="material-symbols-outlined text-xl">add_box</span></button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-lg shadow-primary/30">1</div>
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">고소인 인적사항</h3>
                    </div>

                    <div className="space-y-4">
                      {editorData.personalInfo.map((field) => (
                        <div key={field.id} className="flex items-center gap-4 group">
                          <div className="w-28 shrink-0">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => updatePersonalInfoField(field.id, 'label', e.target.value)}
                              className="w-full text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 uppercase tracking-tight outline-none focus:border-primary/50 transition-all text-center"
                            />
                          </div>
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => updatePersonalInfoField(field.id, 'value', e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full bg-slate-50/50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none"
                            />
                            <button
                              onClick={() => removePersonalInfoField(field.id)}
                              className="absolute -right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center shadow-lg z-10"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={addPersonalInfoField}
                        className="w-full py-3.5 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 font-bold text-sm hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 mt-4"
                      >
                        <span className="material-symbols-outlined">add</span> 항목 추가
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-slate-800/30">2</div>
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">피고소인 인적사항</h3>
                    </div>

                    <div className="space-y-3">
                      {editorData.accusedInfo.map((field) => (
                        <div key={field.id} className="flex items-center gap-4 group">
                          <div className="w-28 shrink-0">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => updateAccusedInfoField(field.id, 'label', e.target.value)}
                              className="w-full text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 uppercase tracking-tight outline-none focus:border-slate-800/50 transition-all text-center"
                            />
                          </div>
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => updateAccusedInfoField(field.id, 'value', e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full bg-slate-50/50 border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:ring-4 focus:ring-slate-800/5 focus:border-slate-800 transition-all outline-none"
                            />
                            <button
                              onClick={() => removeAccusedInfoField(field.id)}
                              className="absolute -right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center shadow-lg z-10"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={addAccusedInfoField}
                        className="w-full py-3.5 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 font-bold text-sm hover:border-slate-800 hover:text-slate-800 hover:bg-slate-800/5 transition-all flex items-center justify-center gap-2 mt-4"
                      >
                        <span className="material-symbols-outlined">add</span> 항목 추가
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-lg shadow-primary/30">3</div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">고소취지</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRegenerateSection('purpose')}
                          className="px-3 py-1.5 bg-white border border-primary text-primary rounded-full font-bold text-xs hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">refresh</span> AI재요청
                        </button>
                        <button
                          onClick={() => openChatModal('purpose')}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-full font-bold text-xs hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">chat</span> AI대화후 적용
                        </button>
                        <button
                          onClick={() => openEditorModal('purpose')}
                          className="px-3 py-1.5 bg-primary text-white rounded-full font-bold text-xs hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span> 에디터편집
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newContent = e.currentTarget.innerHTML;
                          setEditorData(prev => ({ ...prev, purpose: newContent }));
                        }}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-3xl p-8 pb-12 text-sm font-medium text-slate-700 min-h-[160px] cursor-text hover:bg-slate-100 transition-all leading-relaxed [&>p]:mb-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        dangerouslySetInnerHTML={{ __html: editorData.purpose || '<span class="text-slate-400">고소의 목적과 취지를 입력하세요.</span>' }}
                      />
                      <div className="absolute bottom-5 right-8 text-[11px] font-bold text-slate-400 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                        {editorData.purpose?.replace(/<[^>]*>/g, '').length || 0}자
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-lg shadow-primary/30">4</div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">범죄사실 <span className="text-red-500 font-bold text-xs">* 필수항목</span></h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRegenerateSection('facts')}
                          className="px-3 py-1.5 bg-white border border-primary text-primary rounded-full font-bold text-xs hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">refresh</span> AI재요청
                        </button>
                        <button
                          onClick={() => openChatModal('facts')}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-full font-bold text-xs hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">chat</span> AI대화후 적용
                        </button>
                        <button
                          onClick={() => openEditorModal('facts')}
                          className="px-3 py-1.5 bg-primary text-white rounded-full font-bold text-xs hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span> 에디터편집
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newContent = e.currentTarget.innerHTML;
                          setEditorData(prev => ({ ...prev, facts: newContent }));
                        }}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-3xl p-8 pb-12 text-sm font-medium text-slate-700 min-h-[200px] cursor-text hover:bg-slate-100 transition-all leading-relaxed [&>p]:mb-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        dangerouslySetInnerHTML={{ __html: editorData.facts || '<span class="text-slate-400">범죄 행위에 대한 구체적인 사실 관계를 입력하세요.</span>' }}
                      />
                      <div className="absolute bottom-5 right-8 text-[11px] font-bold text-slate-400 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                        {editorData.facts?.replace(/<[^>]*>/g, '').length || 0}자
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-lg shadow-primary/30">5</div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">고소이유</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRegenerateSection('reasons')}
                          className="px-3 py-1.5 bg-white border border-primary text-primary rounded-full font-bold text-xs hover:bg-primary/5 transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">refresh</span> AI재요청
                        </button>
                        <button
                          onClick={() => openChatModal('reasons')}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-full font-bold text-xs hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">chat</span> AI대화후 적용
                        </button>
                        <button
                          onClick={() => openEditorModal('reasons')}
                          className="px-3 py-1.5 bg-primary text-white rounded-full font-bold text-xs hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span> 에디터편집
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newContent = e.currentTarget.innerHTML;
                          setEditorData(prev => ({ ...prev, reasons: newContent }));
                        }}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-3xl p-8 pb-12 text-sm font-medium text-slate-700 min-h-[160px] cursor-text hover:bg-slate-100 transition-all leading-relaxed [&>p]:mb-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        dangerouslySetInnerHTML={{ __html: editorData.reasons || '<span class="text-slate-400">내용을 입력하세요.</span>' }}
                      />
                      <div className="absolute bottom-5 right-8 text-[11px] font-bold text-slate-400 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                        {editorData.reasons?.replace(/<[^>]*>/g, '').length || 0}자
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Preview Column */}
              <div className="w-2/5 h-full bg-slate-200/60 border-l border-slate-200 flex flex-col overflow-hidden relative">
                <div className="flex items-center justify-between px-10 py-6 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10">
                  <div className="flex items-center gap-2 group cursor-pointer">
                    <span className="material-symbols-outlined text-primary text-2xl group-hover:scale-110 transition-transform">visibility</span>
                    <h2 className="text-sm font-black text-slate-800 tracking-widest uppercase">Preview</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full uppercase tracking-tighter">A4 Standard</span>
                    <span className="text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm">Page 1 / {totalPages}</span>
                  </div>
                </div>

                <div ref={previewRef} className="flex-1 overflow-y-auto p-12 scroll-smooth custom-scrollbar flex flex-col items-center gap-10">
                  {/* Page 1: Personal Info */}
                  <div className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] w-[210mm] h-[297mm] p-[25mm] space-y-12 text-[12px] leading-[1.8] relative flex flex-col shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center pb-12">
                      <h1 className="text-5xl font-black tracking-[1.2em] text-slate-900 ml-[1.2em] pt-4">고소장</h1>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2 border-b-2 border-slate-900 pb-1">
                        <h4 className="text-[14px] font-black text-slate-900 tracking-tighter">1. 고소인</h4>
                      </div>
                      <table className="w-full border-collapse border-2 border-slate-900">
                        <tbody>
                          {editorData.personalInfo.map((field) => (
                            <tr key={field.id}>
                              <td className="w-[120px] bg-slate-50 border border-slate-300 px-4 py-3 font-bold text-slate-700 text-[11px] leading-tight">{field.label}</td>
                              <td className="border border-slate-300 px-4 py-3 text-slate-900 text-[11px] break-all font-medium whitespace-pre-wrap">{field.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-6 pt-4">
                      <div className="flex items-center gap-2 mb-2 border-b-2 border-slate-900 pb-1">
                        <h4 className="text-[14px] font-black text-slate-900 tracking-tighter">2. 피고소인</h4>
                      </div>
                      <table className="w-full border-collapse border-2 border-slate-900">
                        <tbody>
                          {editorData.accusedInfo.map((field) => (
                            <tr key={field.id}>
                              <td className="w-[120px] bg-slate-50 border border-slate-300 px-4 py-3 font-bold text-slate-700 text-[11px] leading-tight">{field.label}</td>
                              <td className="border border-slate-300 px-4 py-3 text-slate-900 text-[11px] break-all font-medium whitespace-pre-wrap">{field.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Page 2+: Document Content */}
                  <div
                    ref={docRef}
                    className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] w-[210mm] min-h-[297mm] h-fit p-[25mm] space-y-12 text-[12px] leading-[1.8] relative flex flex-col mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700 overflow-hidden"
                    style={{
                      backgroundImage: 'linear-gradient(to bottom, transparent 296.5mm, rgba(148, 163, 184, 0.3) 296.5mm, rgba(148, 163, 184, 0.3) 297mm)',
                      backgroundSize: '100% 297mm'
                    }}
                  >
                    <div className="space-y-6">
                      <h4 className="text-[14px] font-black text-slate-900 tracking-tighter border-b-2 border-slate-900 pb-1 w-fit pr-4">3. 고소취지</h4>
                      <div
                        className="text-[11px] leading-[2.2] text-slate-800 font-serif italic pl-4 border-l-4 border-slate-100 [&>p]:mb-2"
                        dangerouslySetInnerHTML={{ __html: editorData.purpose }}
                      />
                    </div>

                    <div className="space-y-6 pt-8">
                      <h4 className="text-[14px] font-black text-slate-900 tracking-tighter border-b-2 border-slate-900 pb-1 w-fit pr-4">4. 범죄사실</h4>
                      <div
                        className="text-[11px] leading-[2.2] text-slate-800 font-medium [&>p]:mb-2"
                        dangerouslySetInnerHTML={{ __html: editorData.facts }}
                      />
                    </div>

                    <div className="space-y-6 pt-8">
                      <h4 className="text-[14px] font-black text-slate-900 tracking-tighter border-b-2 border-slate-900 pb-1 w-fit pr-4">5. 고소이유</h4>
                      <div
                        className="text-[11px] leading-[2.2] text-slate-800 font-medium [&>p]:mb-2"
                        dangerouslySetInnerHTML={{ __html: editorData.reasons }}
                      />
                    </div>

                    <div className="mt-auto pt-20 space-y-8 pb-10">
                      <div className="text-center text-[14px] font-bold text-slate-900 tracking-widest">
                        {editorData.date}
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <div className="text-[16px] font-bold text-slate-900">
                          고소인 : {editorData.personalInfo.find(f => f.id === 'name')?.value || '                  '} (인)
                        </div>
                      </div>

                      <div className="pt-8 text-[18px] font-black text-slate-900 text-center tracking-widest">
                        <input
                          type="text"
                          value={editorData.policeStation}
                          onChange={(e) => setEditorData({ ...editorData, policeStation: e.target.value })}
                          className="w-full text-center outline-none bg-transparent hover:bg-slate-50 focus:bg-slate-50 rounded-xl py-2 transition-colors border-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Action Bar */}
            <div className="absolute bottom-0 left-0 w-full h-24 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-end px-10 shadow-[0_-10px_50px_-15px_rgba(0,0,0,0.1)] z-50">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleGeneratePdf}
                  className="flex items-center gap-2.5 px-12 py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-xl shadow-primary/30 scale-105"
                >
                  <span className="material-symbols-outlined text-xl">bolt</span> AI분석
                </button>
              </div>
            </div>
            {/* Saving Loading Overlay */}
            {isPdfGenerating && (
              <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
                <div className="text-center text-white flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">저장중 입니다...</h2>
                    <p className="text-white/70 text-sm">PDF 문서를 생성하고 있습니다.</p>
                  </div>
                </div>
              </div>
            )}
          </main>
        ) : view === 'analysis' ? (
          <AppAnalysis setView={setView} originalContent={originalContent} editorData={editorData} pdfUrl={pdfUrl} />
        ) : null}

        {view === 'main' && (
          <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4">
            <button className="w-12 h-12 rounded-2xl bg-white border border-border-light flex items-center justify-center text-slate-500 shadow-lg hover:text-primary hover:border-primary transition-all group" title="파일 업로드">
              <span className="material-symbols-outlined text-2xl">upload</span>
            </button>
            <button className="w-12 h-12 rounded-2xl bg-white border border-border-light flex items-center justify-center text-slate-500 shadow-lg hover:text-primary hover:border-primary transition-all group" title="노트 작성">
              <span className="material-symbols-outlined text-2xl">edit_note</span>
            </button>
            <button className="w-12 h-12 rounded-2xl bg-white border border-border-light flex items-center justify-center text-slate-500 shadow-lg hover:text-primary hover:border-primary transition-all group" title="번역">
              <span className="material-symbols-outlined text-2xl">g_translate</span>
            </button>
            <button className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-blue-700 transition-all scale-110" title="AI 채팅">
              <span className="material-symbols-outlined text-2xl">chat_bubble</span>
            </button>
          </div>
        )}
      </div >

      <footer className="h-14 border-t border-border-light bg-white px-8 flex items-center justify-between text-xs text-slate-500 font-semibold">
        <div className="flex items-center gap-8">
          <span>© 2026 AI STUDIO. Unified Professional Platform.</span>
          <div className="flex gap-6">
            <a className="hover:text-slate-700 transition-colors" href="#">이용약관</a>
            <a className="hover:text-slate-700 transition-colors" href="#">개인정보처리방침</a>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined text-lg!">play_arrow</span></a>
          <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined text-lg!">share</span></a>
          <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined text-lg!">alternate_email</span></a>
        </div>
      </footer>

      {/* Chat Modal */}
      {chatModalOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg h-[600px] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-primary to-blue-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white">smart_toy</span>
                </div>
                <div>
                  <h3 className="font-black text-sm">{sectionLabels[chatModalSection]} 작성 도우미</h3>
                  <p className="text-xs font-medium opacity-80">AI와 대화하며 내용을 작성하세요</p>
                </div>
              </div>
              <button
                onClick={closeChatModal}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-linear-to-b from-primary/5 to-white">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <span className="material-symbols-outlined text-5xl">chat</span>
                  <p className="text-sm font-medium text-center">
                    {sectionLabels[chatModalSection]}에 대해<br />무엇이든 물어보세요!
                  </p>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-xs text-white">smart_toy</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500">AI 도우미</span>
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
                      }`}>
                      <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    {msg.role === 'ai' && (
                      <button
                        onClick={() => applyAiResponse(msg.content)}
                        className="mt-2 px-4 py-2 bg-primary text-white rounded-full text-xs font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                        {sectionLabels[chatModalSection]}에 적용하기
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 px-4 py-3 bg-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  disabled={chatLoading}
                />
                <button
                  onClick={handleChatSend}
                  disabled={chatLoading || !chatInput.trim()}
                  className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {editorModalOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-8">
          <div className="bg-white rounded-3xl w-[90%] h-[85%] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-primary"
                      checked={columnVisibility.original}
                      onChange={() => toggleColumnVisibility('original')}
                    /> 원문
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-primary"
                      checked={columnVisibility.ai}
                      onChange={() => toggleColumnVisibility('ai')}
                    /> AI 프롬프트
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-primary"
                      checked={columnVisibility.editor}
                      onChange={() => toggleColumnVisibility('editor')}
                    /> 에디터
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={saveEditorContent}
                  className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
                >
                  적용
                </button>
                <button
                  onClick={closeEditorModal}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-xl text-slate-500">close</span>
                </button>
              </div>
            </div>

            {/* 3-Column Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Column 1: 원문 */}
              {columnVisibility.original && (fullscreenColumn === null || fullscreenColumn === 'original') && (
                <div className={`flex flex-col border-r border-slate-200 ${fullscreenColumn === 'original' ? 'flex-3' : 'flex-1'}`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-amber-50">
                    <span className="font-bold text-sm text-slate-700">원문</span>
                    <button
                      onClick={() => toggleFullscreen('original')}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {fullscreenColumn === 'original' ? 'close_fullscreen' : 'fullscreen'}
                      </span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 text-sm text-slate-700 leading-relaxed space-y-6">
                    {/* 프롬프트 섹션 */}
                    {originalContent.prompt && (
                      <div>
                        <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">edit_note</span>
                          사용자 입력 지시어
                        </h4>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="whitespace-pre-wrap text-slate-600">{originalContent.prompt}</p>
                        </div>
                      </div>
                    )}

                    {/* 첨부 파일 섹션 */}
                    {originalContent.files && originalContent.files.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-bold text-primary flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">attach_file</span>
                          첨부 파일 내용 ({originalContent.files.length}개)
                        </h4>
                        {originalContent.files.map((file, idx) => (
                          <div key={idx} className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-slate-500">description</span>
                              <span className="font-bold text-xs text-slate-700 truncate">{file.name}</span>
                            </div>
                            <div className={`p-4 overflow-y-auto ${fullscreenColumn === 'original' ? 'max-h-none' : 'max-h-[300px]'}`}>
                              <p className="whitespace-pre-wrap text-slate-600 text-xs leading-relaxed">{file.content || '(내용 없음)'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 내용 없음 안내 */}
                    {!originalContent.prompt && (!originalContent.files || originalContent.files.length === 0) && (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                        <span className="material-symbols-outlined text-4xl">article</span>
                        <p className="text-sm font-medium">원문 데이터가 없습니다</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Column 2: AI 프롬프트 */}
              {columnVisibility.ai && (fullscreenColumn === null || fullscreenColumn === 'ai') && (
                <div className={`flex flex-col border-r border-slate-200 ${fullscreenColumn === 'ai' ? 'flex-3' : 'flex-1'}`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-amber-50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-700">AI 프롬프트</span>
                      <select
                        value={editorModalSection}
                        onChange={(e) => setEditorModalSection(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-medium"
                      >
                        <option value="purpose">고소취지</option>
                        <option value="facts">범죄사실</option>
                        <option value="reasons">고소이유</option>
                      </select>
                    </div>
                    <button
                      onClick={() => toggleFullscreen('ai')}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {fullscreenColumn === 'ai' ? 'close_fullscreen' : 'fullscreen'}
                      </span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1 px-4 py-2.5 border-b border-slate-100 bg-white h-[44px]">
                    <span className="px-2 py-1.5 bg-slate-100 rounded text-xs font-bold text-slate-600">@ChatGPT</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 text-slate-700 leading-relaxed">
                    <p className="whitespace-pre-wrap text-slate-600">{aiPromptContent || '(내용 없음)'}</p>
                  </div>
                </div>
              )}

              {/* Column 3: 에디터 */}
              {columnVisibility.editor && (fullscreenColumn === null || fullscreenColumn === 'editor') && (
                <div className={`flex flex-col ${fullscreenColumn === 'editor' ? 'flex-3' : 'flex-1'}`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
                    <span className="font-bold text-sm text-slate-700">에디터</span>
                    <button
                      onClick={() => toggleFullscreen('editor')}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {fullscreenColumn === 'editor' ? 'close_fullscreen' : 'fullscreen'}
                      </span>
                    </button>
                  </div>
                  {/* Editor Toolbar */}
                  <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-100 bg-white h-[44px]">
                    <button
                      onClick={() => editor?.chain().focus().undo().run()}
                      disabled={!editor?.can().undo()}
                      title="실행 취소 (Undo)"
                      className={`p-1.5 hover:bg-slate-100 rounded ${editor?.can().undo() ? 'text-slate-400 hover:text-slate-600' : 'text-slate-200'}`}
                    >
                      <span className="material-symbols-outlined text-lg">undo</span>
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().redo().run()}
                      disabled={!editor?.can().redo()}
                      title="다시 실행 (Redo)"
                      className={`p-1.5 hover:bg-slate-100 rounded ${editor?.can().redo() ? 'text-slate-400 hover:text-slate-600' : 'text-slate-200'}`}
                    >
                      <span className="material-symbols-outlined text-lg">redo</span>
                    </button>
                    <div className="w-px h-5 bg-slate-200 mx-1"></div>
                    {/* Font Size Selector */}
                    <select
                      onChange={(e) => {
                        const size = e.target.value;
                        if (size === 'normal') {
                          editor?.chain().focus().unsetFontSize().run();
                        } else {
                          editor?.chain().focus().setFontSize(size).run();
                        }
                      }}
                      title="글자 크기"
                      className="text-xs bg-white border border-slate-200 rounded px-1.5 py-1 text-slate-600 font-medium"
                    >
                      <option value="normal">기본</option>
                      <option value="12px">12px</option>
                      <option value="14px">14px</option>
                      <option value="16px">16px</option>
                      <option value="18px">18px</option>
                      <option value="20px">20px</option>
                      <option value="24px">24px</option>
                    </select>
                    <div className="w-px h-5 bg-slate-200 mx-1"></div>
                    <button
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      title="굵게 (Bold)"
                      className={`p-1.5 hover:bg-slate-100 rounded ${editor?.isActive('bold') ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <span className="material-symbols-outlined text-lg">format_bold</span>
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      title="기울임 (Italic)"
                      className={`p-1.5 hover:bg-slate-100 rounded ${editor?.isActive('italic') ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <span className="material-symbols-outlined text-lg">format_italic</span>
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleUnderline().run()}
                      title="밑줄 (Underline)"
                      className={`p-1.5 hover:bg-slate-100 rounded ${editor?.isActive('underline') ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <span className="material-symbols-outlined text-lg">format_underlined</span>
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleStrike().run()}
                      title="취소선 (Strikethrough)"
                      className={`p-1.5 hover:bg-slate-100 rounded ${editor?.isActive('strike') ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <span className="material-symbols-outlined text-lg">strikethrough_s</span>
                    </button>
                    <div className="w-px h-5 bg-slate-200 mx-1"></div>
                    <button
                      onClick={() => {
                        const url = window.prompt('링크 URL을 입력하세요:');
                        if (url) editor?.chain().focus().setLink({ href: url }).run();
                      }}
                      title="링크 삽입 (Link)"
                      className={`p-1.5 hover:bg-slate-100 rounded ${editor?.isActive('link') ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <span className="material-symbols-outlined text-lg">link</span>
                    </button>
                    <button
                      onClick={() => {
                        const text = editor?.getHTML();
                        if (text) navigator.clipboard.writeText(text.replace(/<[^>]*>/g, ''));
                      }}
                      title="복사 (Copy)"
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                    >
                      <span className="material-symbols-outlined text-lg">content_copy</span>
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                      title="인용구 (Blockquote)"
                      className={`p-1.5 hover:bg-slate-100 rounded ${editor?.isActive('blockquote') ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      <span className="material-symbols-outlined text-lg">format_quote</span>
                    </button>
                    <button
                      onClick={toggleVisualDiff}
                      title={showVisualDiff ? "편집 모드로 돌아가기" : "상세 비교 (Split View)"}
                      className={`p-1.5 hover:bg-slate-100 rounded ${showVisualDiff ? 'text-white bg-blue-500 hover:bg-blue-600 hover:text-white' : 'text-slate-400 hover:text-blue-500'}`}
                    >
                      <span className="material-symbols-outlined text-lg">splitscreen</span>
                    </button>
                    <button
                      onClick={toggleDiff}
                      title={showDiff ? "편집 모드로 돌아가기" : "원문과 비교하기 (Inline)"}
                      className={`p-1.5 hover:bg-slate-100 rounded ${showDiff ? 'text-white bg-red-500 hover:bg-red-600 hover:text-white' : 'text-slate-400 hover:text-red-500'}`}
                    >
                      <span className="material-symbols-outlined text-lg">difference</span>
                    </button>
                    <div className="w-px h-5 bg-slate-200 mx-1"></div>
                    <button
                      onClick={formatParagraphs}
                      title="문단 자동 나누기 (Auto Paragraph)"
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-lg">segment</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 relative">
                    {showVisualDiff ? (
                      <div className="absolute inset-0 bg-white z-10 overflow-auto">
                        <ReactDiffViewer
                          oldValue={(aiPromptContent || '').replace(/<[^>]*>?/gm, '').trim()} // HTML 태그 제거
                          newValue={(editor?.getText() || '').trim()}
                          splitView={true}
                          useDarkTheme={false}
                          showDiffOnly={false}
                          leftTitle="원문 (AI 프롬프트)"
                          rightTitle="현재 수정본"
                          styles={{
                            variables: {
                              dark: {
                                highlightBackground: '#fef2f2',
                                highlightGutterBackground: '#fee2e2',
                              },
                            },
                            line: {
                              fontSize: '14px',
                              lineHeight: '1.5',
                              fontFamily: 'inherit',
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <EditorContent
                        editor={editor}
                        className="prose prose-sm max-w-none h-full text-slate-700 leading-relaxed focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:h-full [&_.ProseMirror]:overflow-y-auto"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Format Confirmation Modal */}
      {formatConfirmModalOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-w-sm mx-4">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-2">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">문단 나누기 확인</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  문단 나누기를 실행하면 <b>기존 텍스트 서식</b>(굵게, 기울임 등)이 <b className="text-red-500">초기화</b>될 수 있습니다.<br /><br />계속하시겠습니까?
                </p>
              </div>
              <div className="flex items-center gap-3 w-full mt-2">
                <button
                  onClick={() => setFormatConfirmModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                >
                  취소
                </button>
                <button
                  onClick={executeFormatParagraphs}
                  className="flex-1 py-3 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm shadow-lg shadow-primary/30"
                >
                  실행하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-w-sm mx-4">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-amber-600">warning</span>
              </div>
              <p className="text-slate-700 font-medium">최소 1개는 유지 되어야 합니다</p>
              <button
                onClick={() => setWarningModalOpen(false)}
                className="px-6 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-10 flex flex-col items-center gap-6 shadow-2xl scale-110 animate-in zoom-in duration-300">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary animate-pulse text-2xl">auto_awesome</span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">AI 분석 중입니다</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">최적의 문서 초안을 작성하고 있습니다.<br />잠시만 기다려 주세요.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
