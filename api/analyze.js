import OpenAI from 'openai';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const body = req.body || {};
        const prompt = body.prompt || '';
        const files = body.files || []; // [{name, type, data}, ...]
        const type = body.type || 'create'; // 'create' or 'regenerate'
        const section = body.section || '';
        const currentContent = body.currentContent || '';
        const context = body.context || {};

        // 파일 내용 추출 로직
        let combinedFilesContent = '';
        const fileNames = [];
        const extractedFiles = []; // 원문 표시용 추출 파일 데이터

        for (const file of files) {
            fileNames.push(file.name);
            if (file.data && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
                try {
                    console.log(`📄 PDF 파일 분석 중: ${file.name}`);
                    const buffer = Buffer.from(file.data, 'base64');
                    const data = await pdf(buffer);
                    console.log(`✅ ${file.name} 추출 성공 (글자수: ${data.text.length})`);
                    combinedFilesContent += `\n[파일명: ${file.name}]\n${data.text}\n`;
                    extractedFiles.push({ name: file.name, content: data.text });
                } catch (err) {
                    console.error(`❌ PDF 파싱 오류 (${file.name}):`, err);
                    combinedFilesContent += `\n[파일명: ${file.name}] (내용 추출 실패)\n`;
                    extractedFiles.push({ name: file.name, content: '(내용 추출 실패)' });
                }
            } else if (file.data) {
                // PDF 외 다른 파일 형식은 현재 텍스트 추출 미지원 (필요 시 확장)
                combinedFilesContent += `\n[파일명: ${file.name}] (미지원 파일 형식, 이름만 참조)\n`;
                extractedFiles.push({ name: file.name, content: '(미지원 파일 형식)' });
            }
        }

        if (process.env.OPENAI_API_KEY) {
            console.log(`🚀 OpenAI API 호출 중... (Type: ${type}, Model: gpt-4o-mini)`);
            const startTime = Date.now();
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
                timeout: 90000, // 90초로 확장
            });

            let messages = [];

            if (type === 'chat') {
                // Chat-style conversation for section writing
                const sectionLabels = {
                    purpose: '고소취지',
                    facts: '범죄사실',
                    reasons: '고소이유'
                };
                const userMessage = body.message || '';
                const history = body.history || [];

                // Build conversation history
                const conversationHistory = history.map(msg => ({
                    role: msg.role === 'ai' ? 'assistant' : 'user',
                    content: msg.content
                }));

                messages = [
                    {
                        role: "system",
                        content: `당신은 대한민국 전문 변호사이자 고소장 작성 전문가입니다. 현재 사용자가 고소장의 '${sectionLabels[section]}' 섹션을 작성하려고 합니다.

[역할]
- 사용자와 대화하며 해당 섹션에 필요한 정보를 수집하세요.
- 사용자의 상황을 이해하고, 전문적인 법률 용어를 사용하여 '${sectionLabels[section]}' 내용을 작성해 주세요.

[문맥 정보]
- 현재 고소취지: ${context.purpose || '(미작성)'}
- 현재 범죄사실: ${context.facts || '(미작성)'}
- 현재 고소이유: ${context.reasons || '(미작성)'}

[응답 규칙 - 매우 중요]
1. 응답은 반드시 법률 문서에 바로 적용할 수 있는 형식으로 작성하세요.
2. "네, 알겠습니다", "도움이 될 것입니다" 같은 대화체 표현을 절대 사용하지 마세요.
3. 응답 전체가 고소장의 '${sectionLabels[section]}' 본문으로 사용될 수 있어야 합니다.
4. 전문적이고 격식 있는 법률 문서 문체만 사용하세요.
5. 사용자가 정보를 제공하면, 그 정보를 바탕으로 즉시 법률 문서 형태의 '${sectionLabels[section]}' 내용을 작성하세요.

[좋은 응답 예시]
"피고소인의 위 행위는 형법 제347조 사기죄에 해당하는바, 피고소인을 사기죄로 고소하오니 엄벌에 처해주시기 바랍니다."

[나쁜 응답 예시]
"네, 말씀해주신 내용을 바탕으로 고소취지를 작성해 드리겠습니다. 다음과 같이 작성하면 좋을 것 같습니다:"`
                    },
                    ...conversationHistory,
                    { role: "user", content: userMessage }
                ];

                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: messages
                });

                const elapsedMs = Date.now() - startTime;
                console.log(`✅ OpenAI Chat 응답 수신 완료! (소요시간: ${elapsedMs}ms)`);

                return res.status(200).json({
                    success: true,
                    data: { response: completion.choices[0].message.content }
                });
            } else if (type === 'regenerate') {
                messages = [
                    {
                        role: "system",
                        content: `당신은 대한민국 전문 변호사입니다. 사용자가 작성 중인 고소장의 특정 섹션('${section}')을 다시 작성해달라고 요청했습니다.
                        
[재작성 가이드라인]
1. 문맥 유지: 제공된 다른 섹션들의 내용(context)과 일관성을 유지하세요.
2. 전문성 강화: 기존 내용('${currentContent}')을 바탕으로 더 논리적이고 전문적인 법률 용어를 사용하여 분량을 대폭 늘리세요.
3. 독립성: 다른 섹션의 내용은 수정하지 말고, 오직 '${section}' 섹션에 들어갈 내용만 생성하세요.
4. 응답 형식: 반드시 JSON 형식으로 응답하며, 키 이름은 '${section}' 하나만 사용하세요.`
                    },
                    {
                        role: "user",
                        content: `[전체 문서 문맥]\n고소취지: ${context.purpose}\n범죄사실: ${context.facts}\n고소이유: ${context.reasons}\n\n[현재 재작성 대상 섹션: ${section}]\n기존 내용: ${currentContent}\n\n위 문맥과 기존 내용을 바탕으로 '${section}' 부분을 더 풍성하고 전문적으로 재작성해줘.`
                    }
                ];
            } else {
                messages = [
                    {
                        role: "system",
                        content: `당신은 대한민국 법조계에서 수십 년간 경험을 쌓은 전문 변호사입니다. 사용자의 요청과 첨부파일 내용을 바탕으로, 법원에 즉시 제출해도 손색없는 수준의 '완성도 높은 고소장'을 작성하세요.

[섹션별 상세 작성 지침]
1. 고소취지: 단순히 죄명을 나열하는 것이 아니라, 피고소인의 행위가 어떤 법률 조항을 위반했는지 명확히 적시하고 '엄벌에 처해달라'는 취지를 법률적 용어를 사용하여 단호하게 서술하세요.
2. 범죄사실: 사건의 발단부터 전개, 결과에 이르기까지 시간순으로 매우 상세하게 서술하세요. 피고소인의 구체적인 행위, 범행의 수단과 방법, 고소인에게 입힌 직간접적 피해 등을 육하원칙에 입각하여 법률 실무 양식에 맞춰 풍성하게 작성하세요. (최소 10문장 이상)
3. 고소이유: 범행의 중대성, 피고소인의 악의성, 현재까지의 정황(사과 부재, 증거 인멸 시도 등), 고소인이 겪고 있는 육체적/정신적/경제적 고통을 논리적으로 서술하여 고소의 절박함을 부각하세요.

[JSON 응답 스키마 - 반드시 다음 키 이름을 사용하세요]
{
  "name": "고소인 성명",
  "idNumber": "고소인 주민번호",
  "address": "고소인 주소",
  "job": "고소인 직업",
  "officeAddress": "고소인 사무실주소",
  "phone": "고소인 전화번호",
  "email": "고소인 이메일",
  "accusedName": "피고소인 성명",
  "accusedPhone": "피고소인 연락처",
  "accusedAddress": "피고소인 주소",
  "purpose": "고소취지 내용",
  "facts": "범죄사실 내용",
  "reasons": "고소이유 내용"
}

[핵심 규칙]
- 모든 텍스트 필드는 반드시 한 페이지를 충분히 채울 수 있을 정도의 방대한 분량으로 작성하세요.
- 첨부파일의 내용(증거, 정황 등)을 최대한 구체적으로 반영하여 작성하세요. 파일 속에 구체적인 인명, 지명, 금액 등이 있다면 이를 누락 없이 포함하세요.
- 전문적인 법률 용어(예: 기망행위, 위계, 부작위, 법익 침해 등)를 적극 사용하여 문서의 공신력을 높이세요.`
                    },
                    { role: "user", content: `사용자 지시어: ${prompt}\n\n[첨부파일 내용 분석 자료]\n${combinedFilesContent || '첨부된 파일 내용이 없습니다.'}\n\n위 내용을 바탕으로 고소장을 상세히 작성해줘.` }
                ];
            }

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: messages,
                response_format: { type: "json_object" }
            });

            const elapsedMs = Date.now() - startTime;
            console.log(`✅ OpenAI 응답 수신 완료! (소요시간: ${elapsedMs}ms)`);
            const result = JSON.parse(completion.choices[0].message.content);
            console.log('📦 AI Response Data:', JSON.stringify(result, null, 2));

            return res.status(200).json({
                success: true,
                data: result,
                extractedFiles: extractedFiles
            });
        }

        // API 키가 없으면 이전 모의 데이터 반환
        console.warn('⚠️ OPENAI_API_KEY 환경 변수가 없습니다. 모의 데이터를 반환합니다.');

        let mockData = {
            name: '홍길동(모의)',
            idNumber: '900101-1234567',
            address: '서울특별시 강남구 테헤란로 123',
            job: '회사원',
            officeAddress: '강남구 역삼동 솔루션 빌딩',
            accusedName: '임꺽정(모의)',
            accusedPhone: '010-9876-5432',
            accusedAddress: '인천광역시 남동구...',
            purpose: `[AI 재작성 모의 데이터] 고소인은 피고소인을 엄벌에 처해주시기 바랍니다.`,
            facts: '[AI 재작성 모의 데이터] 피고소인은 고소인을 기망하여 금원을 편취하였습니다.',
            reasons: '[AI 재작성 모의 데이터] 피고소인의 죄질이 불량하며 증거 인멸의 우려가 있습니다.'
        };

        if (type === 'regenerate' && section) {
            mockData = {
                [section]: `[AI ${section} 재작성 모의 데이터] 해당 섹션이 문맥에 맞춰 다시 작성되었습니다. (API 키 미설정)`
            };
        }

        return res.status(200).json({
            success: true,
            data: mockData
        });
    } catch (error) {
        console.error('❌ OpenAI API Error Detail:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
        }
        return res.status(500).json({ success: false, error: error.message });
    }
}
