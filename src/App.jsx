import { useState } from 'react'

function App() {
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
            <span className="text-xs font-medium text-slate-700">사용자님</span>
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

        <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <nav className="flex text-xs text-slate-400 items-center gap-2">
              <span className="material-symbols-outlined text-sm">home</span>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span>창작작업실</span>
              <span className="material-symbols-outlined text-[10px]">chevron_right</span>
              <span className="text-slate-700 font-medium">문서 만들기</span>
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
                  <div className={`font-bold text-sm ${item.active ? '' : 'text-slate-800'}`}>{item.label}</div>
                  <div className={`text-[10px] mt-1.5 leading-tight ${item.active ? 'opacity-80' : 'text-slate-400'}`}>{item.desc}</div>
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
                    <select className="bg-white border-border-light rounded-lg text-xs py-1.5 px-3 focus:ring-primary focus:border-primary">
                      <option>문서 유형</option>
                      <option>기획서</option>
                      <option>계약서</option>
                    </select>
                    <select className="bg-white border-border-light rounded-lg text-xs py-1.5 px-3 focus:ring-primary focus:border-primary">
                      <option>전문 분야</option>
                      <option>IT/기술</option>
                      <option>법률</option>
                      <option>마케팅</option>
                    </select>
                    <select className="bg-white border-border-light rounded-lg text-xs py-1.5 px-3 focus:ring-primary focus:border-primary">
                      <option>표준 양식</option>
                    </select>
                    <button className="bg-slate-800 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">프리셋</button>
                  </div>
                  <div className="h-5 w-px bg-slate-200"></div>
                  <div className="flex items-center gap-4">
                    <span className="px-4 py-1.5 bg-white border border-border-light text-slate-700 rounded-lg text-xs font-semibold">스마트 에디터</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-600">
                        <input defaultChecked className="text-primary focus:ring-primary h-4 w-4 border-slate-300" name="editor" type="radio" /> 인터랙티브 모드
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-600">
                        <input className="text-primary focus:ring-primary h-4 w-4 border-slate-300" name="editor" type="radio" /> 정적 편집
                      </label>
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600">
                  문서 설정 <span className="material-symbols-outlined text-lg">expand_more</span>
                </button>
              </div>

              <div className="px-6 py-4 border-b border-border-light flex items-center gap-8">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">분석 AI 모델</span>
                <div className="flex flex-wrap gap-6 text-xs font-medium">
                  {['GPT-4o', 'Claude 3.5', 'Gemini Pro', 'HyperCLOVA X'].map((model) => (
                    <label key={model} className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input defaultChecked={model !== 'HyperCLOVA X'} className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4" type="checkbox" /> {model}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex h-[400px]">
                <div className="w-1/3 border-r border-border-light flex flex-col bg-slate-50/30">
                  <div className="p-4 border-b border-border-light flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">참고 자료 첨부</span>
                    <button className="text-[10px] font-bold text-primary hover:underline">자료 설정</button>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-primary text-4xl">upload_file</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-6 font-medium">분석할 원본 문서나 자료를 올려주세요</p>
                    <div className="flex gap-2.5 mb-8">
                      {['PDF', 'DOCX', 'XLSX', 'PPTX'].map((type) => (
                        <div key={type} className="w-9 h-11 bg-white border border-border-light rounded-lg shadow-sm flex flex-col items-center justify-center gap-0.5">
                          <span className={`text-[9px] font-bold ${type === 'PDF' ? 'text-red-500' : type === 'DOCX' ? 'text-blue-500' : type === 'XLSX' ? 'text-emerald-500' : 'text-amber-500'}`}>{type}</span>
                          <div className={`w-4 h-0.5 rounded-full ${type === 'PDF' ? 'bg-red-100' : type === 'DOCX' ? 'bg-blue-100' : type === 'XLSX' ? 'bg-emerald-100' : 'bg-amber-100'}`}></div>
                        </div>
                      ))}
                    </div>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-white border border-border-light rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
                      <span className="material-symbols-outlined text-base">add</span>
                      파일 불러오기
                    </button>
                  </div>
                  <div className="p-4 border-t border-border-light flex justify-between items-center bg-slate-50/50">
                    <span className="text-[11px] font-bold text-slate-400">첨부된 자료 목록 (0)</span>
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div>
                  </div>
                </div>

                <div className="w-2/3 flex flex-col p-6 bg-white">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">문서 작성 지시어 (Prompt)</span>
                    <button className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">history</span></button>
                  </div>
                  <div className="flex-1 relative border border-border-light rounded-2xl p-5 mb-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    <textarea className="w-full h-full resize-none border-none focus:ring-0 p-0 text-sm text-slate-700 placeholder-slate-400" placeholder="예: '첨부된 데이터를 바탕으로 2024년 시장 분석 보고서를 작성해줘. 톤앤매너는 전문적이고 설득력 있게.'"></textarea>
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                      <button className="p-2 text-slate-300 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">mic</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border-light text-[11px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                      <span className="material-symbols-outlined text-base text-primary">auto_fix_high</span> 개요 자동 생성
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border-light text-[11px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                      <span className="material-symbols-outlined text-base text-primary">translate</span> 다국어 번역 초안
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border-light text-[11px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                      <span className="material-symbols-outlined text-base text-primary">history_edu</span> 스타일 가이드 적용
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center gap-3 pt-4 pb-16">
              <button className="flex items-center gap-2 px-8 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors">
                <span className="material-symbols-outlined text-lg">replay</span> 초기화
              </button>
              <button className="flex items-center gap-2 px-8 py-3 rounded-xl border border-border-light bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-lg">save</span> 초안 저장
              </button>
              <button className="flex items-center gap-2 px-10 py-3 rounded-xl bg-slate-800 text-white font-bold text-sm hover:bg-slate-900 transition-colors">
                <span className="material-symbols-outlined text-lg">download</span> 내보내기
              </button>
              <button className="flex items-center gap-2 px-12 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-xl shadow-primary/20 hover:bg-blue-700 transition-all scale-105">
                <span className="material-symbols-outlined text-lg">edit_document</span> 문서 생성
              </button>
            </div>
          </div>
        </main>

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
      </div>

      <footer className="h-12 border-t border-border-light bg-white px-8 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <div className="flex items-center gap-8">
          <span>© 2024 AI STUDIO. Unified Professional Platform.</span>
          <div className="flex gap-6">
            <a className="hover:text-slate-700 transition-colors" href="#">이용약관</a>
            <a className="hover:text-slate-700 transition-colors" href="#">개인정보처리방침</a>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined !text-lg">play_arrow</span></a>
          <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined !text-lg">share</span></a>
          <a className="hover:text-primary transition-colors" href="#"><span className="material-symbols-outlined !text-lg">alternate_email</span></a>
        </div>
      </footer>
    </div>
  )
}

export default App
