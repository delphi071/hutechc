import React from 'react';

export default function AppAnalysis({ setView, originalContent, editorData, pdfUrl }) {
    return (
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-50">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">AI분석결과</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <h2 className="font-semibold text-sm flex items-center gap-2">
                                요청 내용
                            </h2>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {originalContent?.prompt || (
                                    <span className="text-slate-400">입력된 요청 내용이 없습니다.</span>
                                )}
                            </div>
                            {originalContent?.files?.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">첨부 파일</p>
                                    <div className="flex flex-wrap gap-2">
                                        {originalContent.files.map((file, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs font-medium text-slate-600 border border-slate-200">
                                                <span className="material-symbols-outlined text-[14px] text-slate-400">attachment</span>
                                                {file.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative h-[400px]">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <h2 className="font-semibold text-sm flex items-center gap-2">
                                최종 결과물
                            </h2>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-2 bg-slate-50 inline-block px-2 py-1 rounded">1. 고소 취지</h3>
                                <div className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: editorData?.purpose || '<span class="text-slate-400">내용 없음</span>' }} />
                            </div>
                            <hr className="border-slate-100" />
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-2 bg-slate-50 inline-block px-2 py-1 rounded">2. 범죄 사실</h3>
                                <div className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: editorData?.facts || '<span class="text-slate-400">내용 없음</span>' }} />
                            </div>
                            <hr className="border-slate-100" />
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-2 bg-slate-50 inline-block px-2 py-1 rounded">3. 고소 이유</h3>
                                <div className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: editorData?.reasons || '<span class="text-slate-400">내용 없음</span>' }} />
                            </div>
                        </div>
                        {pdfUrl ? (
                            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
                                <a
                                    href={pdfUrl}
                                    download="legal_document.pdf"
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-lg">download</span>
                                    PDF 다운로드
                                </a>
                            </div>
                        ) : (
                            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                                <button className="w-10 h-10 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:scale-110 hover:bg-primary-hover transition-all">
                                    <span className="material-symbols-outlined">edit</span>
                                </button>
                                <button className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-500 shadow-md flex items-center justify-center hover:scale-110 transition-all">
                                    <span className="material-symbols-outlined">content_copy</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="font-semibold text-sm">질문 구성 보기</h2>
                            <button className="text-slate-400 hover:text-primary text-xs flex items-center gap-1 transition-colors">
                                전체보기 <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] flex items-center justify-center font-bold">01</span>
                                    <div className="flex-1">
                                        <p className="text-xs font-medium mb-1">사건 개요 매칭</p>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full">
                                            <div className="bg-primary h-1.5 rounded-full" style={{ width: '85%' }}></div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-primary">85%</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] flex items-center justify-center font-bold">02</span>
                                    <div className="flex-1">
                                        <p className="text-xs font-medium mb-1">법적 키워드 추출</p>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full">
                                            <div className="bg-primary h-1.5 rounded-full" style={{ width: '70%' }}></div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-primary">70%</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] flex items-center justify-center font-bold">03</span>
                                    <div className="flex-1">
                                        <p className="text-xs font-medium mb-1">문체 최적화 (격식)</p>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full">
                                            <div className="bg-primary h-1.5 rounded-full" style={{ width: '95%' }}></div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-primary">95%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="font-semibold text-sm">AI 작성 매칭 결과 요약 사항</h2>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-6">
                                <div className="flex-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                                            <p className="text-[10px] text-blue-600 uppercase tracking-wider font-bold mb-1">적합도</p>
                                            <p className="text-lg font-bold text-slate-900">94.2%</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">매칭 단어</p>
                                            <p className="text-lg font-bold text-slate-900">128개</p>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                                        AI 모델 GPT-4o가 법률 데이터베이스의 판례 1,200건을 실시간 분석하여 가장 적합한 문장을 추천했습니다.
                                    </p>
                                </div>
                                <div className="hidden sm:block">
                                    <div className="w-24 h-24 border-4 border-primary rounded-full flex flex-col items-center justify-center">
                                        <span className="text-xs font-bold text-slate-400">Score</span>
                                        <span className="text-xl font-black text-primary">A+</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 p-6 bg-slate-900 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary">support_agent</span>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">전문가의 도움이 필요하신가요?</h3>
                            <p className="text-slate-400 text-sm">현재 작성 중인 문서를 기반으로 전문 변호사의 피드백을 받아보세요.</p>
                        </div>
                    </div>
                    <button className="relative z-10 px-8 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg">
                        전문가 찾기
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                </div>
            </div>
        </main >
    );
}
