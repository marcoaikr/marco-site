const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        ImageRun, Header, Footer, AlignmentType, ExternalHyperlink,
        HeadingLevel, BorderStyle, WidthType, ShadingType,
        VerticalAlign, PageBreak } = require("docx");

// ── 브랜드 컬러 ──
const C = {
  purple: "7c3aed", purpleLight: "ede9fe", purpleMid: "ddd6fe",
  black: "111111", white: "ffffff",
  text: "1a1a1a", text2: "4b5563", text3: "6b7280",
  green: "16a34a", greenLight: "dcfce7",
  red: "dc2626", redLight: "fee2e2",
  amber: "d97706", amberLight: "fef3c7",
  bg2: "f9fafb", border: "e5e7eb",
};

// ── 헬퍼 ──
const EMPTY_BORDER = { style: BorderStyle.NONE, size: 0, color: C.white };
const NO_BORDERS = { top: EMPTY_BORDER, bottom: EMPTY_BORDER, left: EMPTY_BORDER, right: EMPTY_BORDER };

function txt(text, opts = {}) {
  return new TextRun({ text, font: "Noto Sans CJK KR", size: opts.size || 20, bold: opts.bold || false,
    color: opts.color || C.text, italics: opts.italics || false });
}
function para(runs, opts = {}) {
  const children = Array.isArray(runs) ? runs : [runs];
  return new Paragraph({ children, spacing: { before: opts.before || 80, after: opts.after || 80 },
    alignment: opts.align || AlignmentType.LEFT });
}
function heading(text, level = 2) {
  return new Paragraph({ children: [new TextRun({ text, font: "Noto Sans CJK KR", size: level === 1 ? 32 : 26,
    bold: true, color: C.black })], spacing: { before: 300, after: 160 } });
}
function sectionLabel(num, label) {
  return para([txt(`PART ${num}`, { size: 16, color: C.purple, bold: true }), txt(`  ${label}`, { size: 16, color: C.text3 })], { before: 200 });
}
function callout(text, borderColor = C.purple, bgColor = C.purpleLight) {
  return new Table({ rows: [new TableRow({ children: [new TableCell({
    children: [para([txt(text, { size: 19, color: C.text })], { before: 40, after: 40 })],
    borders: { top: EMPTY_BORDER, bottom: EMPTY_BORDER, right: EMPTY_BORDER,
      left: { style: BorderStyle.SINGLE, size: 8, color: borderColor } },
    shading: { type: ShadingType.CLEAR, fill: bgColor }, width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 120, bottom: 120, left: 200, right: 200 }
  })] })], width: { size: 100, type: WidthType.PERCENTAGE } });
}
// 점수 바를 20칸 그리드로 표현 — 점수만큼 색칠, 나머지 회색
function scoreBlock(label, score, max, question, rationale) {
  const isLow = score <= 8;
  const color = isLow ? C.red : score <= 13 ? C.amber : C.green;
  const tag = isLow ? "매출 차단" : score <= 13 ? "성장 제한" : "성장 가능";
  const tagBg = isLow ? C.redLight : score <= 13 ? C.amberLight : C.greenLight;

  // 라벨 + 점수 + 등급 (한 줄)
  const headerRow = new Table({ rows: [new TableRow({ children: [
    new TableCell({ children: [para([txt(label, { size: 20, bold: true })], { before: 40, after: 20 })],
      width: { size: 25, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, margins: { left: 80 } }),
    new TableCell({ children: [para([txt(`${score}/${max}`, { size: 22, bold: true, color })], { before: 40, after: 20, align: AlignmentType.CENTER })],
      width: { size: 50, type: WidthType.PERCENTAGE }, borders: NO_BORDERS }),
    new TableCell({ children: [para([txt(tag, { size: 16, bold: true, color })], { before: 40, after: 20, align: AlignmentType.RIGHT })],
      width: { size: 25, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: tagBg },
      borders: NO_BORDERS, margins: { right: 80 } })
  ] })], width: { size: 100, type: WidthType.PERCENTAGE } });

  // 20칸 그리드 바 (각 칸 동일 크기, 점수만큼 색칠)
  const cells = [];
  for (let i = 0; i < max; i++) {
    const isFilled = i < score;
    cells.push(new TableCell({
      children: [para([txt(" ")], { before: 0, after: 0 })],
      width: { size: 5, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: isFilled ? color : "e8e8e8" },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: C.white },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: C.white },
        left: { style: BorderStyle.SINGLE, size: 1, color: C.white },
        right: { style: BorderStyle.SINGLE, size: 1, color: C.white }
      }
    }));
  }
  const gridBar = new Table({
    rows: [new TableRow({ children: cells, height: { value: 340, rule: "exact" } })],
    width: { size: 100, type: WidthType.PERCENTAGE }
  });

  const detailColor = color === C.red ? C.red : C.amber;
  const detailBg = color === C.red ? C.redLight : C.amberLight;
  const detail = callout(`${question}\n${rationale}`, detailColor, detailBg);

  return [headerRow, gridBar, detail, divider()];
}
function twoColRow(key, val, opts = {}) {
  return new TableRow({ children: [
    new TableCell({ children: [para([txt(key, { size: 18, bold: true, color: C.text2 })], { before: 40, after: 40 })],
      width: { size: 30, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: opts.keyBg || C.bg2 },
      borders: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border }, bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border },
        left: EMPTY_BORDER, right: EMPTY_BORDER },
      margins: { left: 120, right: 80 }, verticalAlign: VerticalAlign.CENTER }),
    new TableCell({ children: [para([txt(val, { size: 18 })], { before: 40, after: 40 })],
      width: { size: 70, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border }, bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border },
        left: EMPTY_BORDER, right: EMPTY_BORDER },
      margins: { left: 120, right: 80 }, verticalAlign: VerticalAlign.CENTER })
  ] });
}
function divider() { return para([txt(" ")], { before: 40, after: 40 }); }
function paidBadge() {
  return new Table({ rows: [new TableRow({ children: [new TableCell({
    children: [para([txt("  PAID  ", { size: 14, bold: true, color: C.white })], { before: 20, after: 20, align: AlignmentType.CENTER })],
    shading: { type: ShadingType.CLEAR, fill: C.purple }, borders: NO_BORDERS,
    width: { size: 12, type: WidthType.PERCENTAGE }, margins: { top: 40, bottom: 40, left: 60, right: 60 }
  })] })], width: { size: 100, type: WidthType.PERCENTAGE } });
}

// ── 배너 이미지 ──
const bannerData = fs.readFileSync("/home/claude/banner_paid.png");

// ════════════════════════════════════════════════
//  리포트 콘텐츠 생성
// ════════════════════════════════════════════════

const children = [];

// ─── 표지 ───
children.push(
  new Paragraph({ children: [new ImageRun({ data: bannerData, transformation: { width: 500, height: 44 }, type: "png" })],
    spacing: { before: 0, after: 200 } }),
  new Paragraph({ children: [new TextRun({ text: "유료 진단 리포트", font: "Noto Sans CJK KR", size: 14,
    bold: true, color: C.purple })], spacing: { before: 0, after: 40 } }),
  new Paragraph({ children: [new TextRun({ text: "바나로(VANARO) 마케팅 진단", font: "Noto Sans CJK KR",
    size: 36, bold: true, color: C.black })], spacing: { before: 0, after: 80 } }),
  para([txt("웰니스 라이프스타일 매거진의 성장을 막는 구조적 병목과 해결 방향", { size: 20, color: C.text2 })]),
  divider(),
  new Table({ rows: [
    twoColRow("클라이언트", "VANARO 바나로"),
    twoColRow("업종", "웰니스 라이프스타일 웹매거진"),
    twoColRow("진단 일자", "2026년 6월"),
    twoColRow("진단 유형", "유료 — 건당 / Pro"),
    twoColRow("병목", "RT 전환 (6/20) — 매출 차단"),
    twoColRow("진단 총점", "46/100"),
  ], width: { size: 100, type: WidthType.PERCENTAGE } }),
  para([txt("이 리포트는 클라이언트의 진단이지만, 동시에 담당자님이 클라이언트 앞에서 꺼낼 수 있는 근거입니다. '내 판단이 옳았다'는 확인, 혹은 '내가 놓친 것' -- 마르코가 데이터로 대신 찾아드립니다.", { size: 18, italics: true, color: C.text2 })], { before: 160 })
);

// ─── 실측 확인표 ───
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(
  heading("실측 확인표 -- 진단 전 숫자부터 확인하세요"),
  para([txt("아래 숫자가 맞는지 먼저 확인해 주세요. 이 데이터 위에서 진단이 시작됩니다.", { size: 18, color: C.text2, italics: true })]),
  new Table({ rows: [
    new TableRow({ children: ["채널","지표","수치","상태"].map(h => new TableCell({
      children: [para([txt(h, { size: 16, bold: true, color: C.white })], { before: 25, after: 25 })],
      shading: { type: ShadingType.CLEAR, fill: C.black },
      borders: NO_BORDERS, margins: { left: 80, right: 80 } })) }),
    ...[
      ["인스타그램","팔로워","1,614명","적음"],
      ["인스타그램","팔로잉","3,695명","팔로잉 > 팔로워 (역전)"],
      ["인스타그램","게시물","146개","콘텐츠 양은 확보됨"],
      ["네이버 블로그","이웃","11명","매우 적음"],
      ["홈페이지","콘텐츠","다수 업로드","네이버 노출 안 됨"],
      ["공통","월 매출","0원","전환 구조 부재"],
      ["공통","월 광고비","100만원 내외","ROI 측정 불가 상태"]
    ].map(([ch,metric,val,status]) => new TableRow({ children: [ch,metric,val,status].map((t,i) => new TableCell({
      children: [para([txt(t, { size: 17, bold: i === 2, color: status.includes("적음") || status.includes("역전") || status.includes("부재") ? C.red : C.text })], { before: 25, after: 25 })],
      borders: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border }, bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border }, left: EMPTY_BORDER, right: EMPTY_BORDER },
      margins: { left: 80, right: 80 } })) }))
  ], width: { size: 100, type: WidthType.PERCENTAGE } }),
  divider()
);

// ─── PART 1: 시장 분석 ───
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(
  sectionLabel("01", "시장 분석"),
  heading("웰니스 미디어 시장 -- 어떻게 돈을 버는가"),
  para([txt("국내 웰니스 시장 규모 15조원(2025), 연 8~10% 성장. 그러나 웰니스 '미디어'의 수익 모델은 광고·협업·커머스·이벤트 4가지로 나뉘며, 순수 콘텐츠 매거진으로 독자적 매출을 만드는 곳은 극소수입니다.", { size: 19 })]),
  callout("시장의 승자들(뉴뉴매거진 42만, 어텐션, 달램)은 콘텐츠를 직접 팔지 않습니다. 콘텐츠로 청중을 모으고, 브랜드 협업과 큐레이션 커머스로 수익을 만듭니다. 바나로도 이 구조를 따라야 합니다."),
  divider()
);

// ─── PART 2: 타깃 분석 ───
children.push(
  sectionLabel("02", "타깃 분석"),
  heading("진짜 고객은 누구인가 -- 데이터가 답했다"),
  para([txt("B2C 타깃: 네이버 '웰니스' 검색자 — 여성 68.9%, 30대 중심, 상업성 64%(구매 의도). 이 사람들은 정보를 찾는 것이 아니라 '검증된 제품/프로그램'을 찾고 있습니다.", { size: 19 })]),
  para([txt("B2B 타깃: 웰니스 브랜드 마케팅 담당자. 이들은 새 매거진보다 '검증된 미디어 채널'을 찾습니다. 바나로의 진짜 고객은 웰니스 브랜드이고, 독자는 그 브랜드에게 전달하는 청중입니다.", { size: 19 })]),
  callout("마르코 3단계 렌즈로 보면, 바나로는 '사람 이해(1단계)'는 있는데 '개념 이해(2단계) -- 내가 파는 것의 본질'을 정의하지 못한 상태입니다. 매거진인가, 큐레이터인가, 에이전시인가?"),
  divider()
);

// ─── PART 3: 5대 진단 점수 ───
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(
  sectionLabel("03", "5대 진단 점수"),
  heading("총점 46/100 -- 항목별 근거"),

  ...scoreBlock("FC 유입", 8, 20,
    "핵심 질문: 충분한 양의 잠재 고객이 들어오고 있는가?",
    "근거: 인스타 팔로워 1,614명, 블로그 이웃 11명. 웰니스 미디어치고 유입 모수 자체가 작습니다. 블로그 이웃 11명은 검색 유입이 사실상 없다는 뜻이에요. 콘텐츠 146개를 만들었지만 네이버에 노출되지 않아 발견되지 않고 있습니다."
  ),
  ...scoreBlock("TG 타깃", 10, 20,
    "핵심 질문: 들어오는 사람이 진짜 고객인가?",
    "근거: 팔로잉 3,695명 > 팔로워 1,614명 -- 맞팔 유입 비중이 높아 타깃 정합성이 의심됩니다. B2C(독자)와 B2B(웰니스 브랜드)를 분리하지 않아, 누구를 위한 콘텐츠인지 흐릿합니다."
  ),
  ...scoreBlock("TR 신뢰", 13, 20,
    "핵심 질문: 믿고 살 수 있다고 느낄 근거가 있는가?",
    "근거: 브랜드 인터뷰, eBook, 협업 경험, 일관된 비주얼 -- 5개 항목 중 가장 강한 자산입니다. 다만 이 신뢰 자산이 구독이나 매출로 연결되지 않고 있어요. 리뷰 320건 같은 외부 증거는 아직 없습니다."
  ),
  ...scoreBlock("MS 메시지", 9, 20,
    "핵심 질문: 왜 여기서 사야 하는지 한 문장으로 설명되는가?",
    "근거: '웰니스 라이프스타일 웹매거진' -- 이 한 줄로는 올리브영, 엘르, 수천 개 웰니스 계정과 구별이 안 됩니다. 게시물에 CTA(행동 유도)가 없고, 카피의 목표가 정보 전달에 머물러 있어 '지금 뭘 해라'가 없습니다."
  ),
  ...scoreBlock("RT 전환", 6, 20,
    "핵심 질문: 관심이 실제 행동(문의, 구매, 예약)으로 바뀌는 경로가 있는가?",
    "근거: 판매 페이지, CTA, 구매 동선이 전무합니다. 협업 브랜드 관심이 있지만 인바운드 문의 경로가 없어 바나로가 먼저 제안하는 구조. 뉴스레터 수집, 구매 링크, 문의 폼이 어디에도 없습니다."
  ),

  para([txt("총점 46/100 | 병목: RT 전환 (6/20) -- 매출 차단", { size: 22, bold: true, color: C.red })], { before: 120 }),
  callout("RT가 6점인 이유: 팔로워 1,614명, 블로그 이웃 11명, 협업 브랜드 관심이 있지만 '관심을 행동(매출)으로 바꾸는 문' 자체가 없습니다. 판매 페이지, CTA, 전환 동선이 부재합니다.", C.red, C.redLight),
  divider()
);

// ─── PART 4: 9블록 구조 진단 ───
children.push(
  sectionLabel("04", "9블록 구조 진단"),
  heading("구조적으로 왜 -- 9블록 마케팅 블록 시스템"),
  new Table({ rows: [
    new TableRow({ children: ["블록","상태","핵심 문제"].map(h => new TableCell({
      children: [para([txt(h, { size: 16, bold: true, color: C.white })], { before: 30, after: 30 })],
      shading: { type: ShadingType.CLEAR, fill: C.black },
      borders: { top: EMPTY_BORDER, bottom: EMPTY_BORDER, left: EMPTY_BORDER, right: { style: BorderStyle.SINGLE, size: 1, color: C.text2 } },
      margins: { left: 80, right: 80 } })) }),
    ...[ ["1 상품(가치)", "문제", "매거진으로 정의 -- 큐레이터/허브로 재정의 필요"],
         ["2 고객", "주의", "B2C/B2B 미분리. 진짜 결제자(브랜드) 타깃 부재"],
         ["3 욕구", "주의", "독자 욕구는 파악했으나 브랜드 욕구 미파악"],
         ["4 목표", "문제", "매출 0 상태에서 전환 목표 수치 없음"],
         ["5 포지셔닝", "문제", "검증된 웰니스 큐레이터로 좁히지 못함"],
         ["6 콘텐츠", "주의", "자체 콘텐츠 반응 없음. 협업 콘텐츠만 반응"],
         ["7 미디어", "양호", "인스타+블로그+홈페이지 보유"],
         ["8 전환", "문제", "판매 페이지, CTA, 구매 동선 전무"],
         ["9 데이터", "문제", "전환율, 유입 경로, 고객 DB 미수집"]
    ].map(([block, status, issue]) => {
      const sc = status === "문제" ? C.red : status === "주의" ? C.amber : C.green;
      const bg = status === "문제" ? C.redLight : status === "주의" ? C.amberLight : C.greenLight;
      return new TableRow({ children: [
        new TableCell({ children: [para([txt(block, { size: 17, bold: true })], { before: 30, after: 30 })],
          borders: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border }, bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border }, left: EMPTY_BORDER, right: EMPTY_BORDER },
          margins: { left: 80, right: 60 }, width: { size: 22, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [para([txt(status, { size: 16, bold: true, color: sc })], { before: 30, after: 30, align: AlignmentType.CENTER })],
          shading: { type: ShadingType.CLEAR, fill: bg },
          borders: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border }, bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border }, left: EMPTY_BORDER, right: EMPTY_BORDER },
          margins: { left: 40, right: 40 }, width: { size: 12, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [para([txt(issue, { size: 17 })], { before: 30, after: 30 })],
          borders: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border }, bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border }, left: EMPTY_BORDER, right: EMPTY_BORDER },
          margins: { left: 80, right: 80 }, width: { size: 66, type: WidthType.PERCENTAGE } })
      ] });
    })
  ], width: { size: 100, type: WidthType.PERCENTAGE } }),
  divider()
);

// ─── PART 5: 키워드 + 채널 데이터 ───
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(
  sectionLabel("05", "채널 실측 + 키워드 분석"),
  heading("네이버 '웰니스' 검색 데이터 (실측)"),
  new Table({ rows: [
    new TableRow({ children: ["지표","수치","의미"].map(h => new TableCell({
      children: [para([txt(h, { size: 16, bold: true, color: C.white })], { before: 30, after: 30 })],
      shading: { type: ShadingType.CLEAR, fill: C.purple },
      borders: NO_BORDERS, margins: { left: 80, right: 80 } })) }),
    ...[["월 검색량","20,500+","관심은 충분함"],
        ["콘텐츠 포화","273,000 문서 (500%+)","일반 웰니스 콘텐츠로는 노출 불가"],
        ["상업성","64%","검색자 10명 중 6명은 구매 의도"],
        ["주요 연령","30대 여성 (68.9%)","바나로의 실제 청중과 일치"]
    ].map(([k,v,m]) => new TableRow({ children: [k,v,m].map((t,i) => new TableCell({
      children: [para([txt(t, { size: 17, bold: i === 1 })], { before: 30, after: 30 })],
      borders: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border }, bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border }, left: EMPTY_BORDER, right: EMPTY_BORDER },
      margins: { left: 80, right: 80 } })) }))
  ], width: { size: 100, type: WidthType.PERCENTAGE } }),
  divider(),
  heading("인스타 해시태그 (블루오션 vs 레드오션)"),
  new Table({ rows: [
    new TableRow({ children: ["해시태그","게시물 수","연관도","전략"].map(h => new TableCell({
      children: [para([txt(h, { size: 16, bold: true, color: C.white })], { before: 25, after: 25 })],
      shading: { type: ShadingType.CLEAR, fill: C.black },
      borders: NO_BORDERS, margins: { left: 60, right: 60 } })) }),
    ...[["#웰니스","27.1만","높음","브랜딩 (경쟁 극심)"],
        ["#웰니스루틴","5,000+","매우 높음","블루오션 -- 선점 기회"],
        ["#웰니스솔루션","5,000+","매우 높음","블루오션 -- 선점 기회"],
        ["#웰니스라이프","1.2만","높음","중간 경쟁"],
        ["#마음챙김","8.5만","중간","보조 태그"]
    ].map(([tag,cnt,rel,strat]) => new TableRow({ children: [tag,cnt,rel,strat].map(t => new TableCell({
      children: [para([txt(t, { size: 17 })], { before: 25, after: 25 })],
      borders: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border }, bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border }, left: EMPTY_BORDER, right: EMPTY_BORDER },
      margins: { left: 60, right: 60 } })) }))
  ], width: { size: 100, type: WidthType.PERCENTAGE } }),
  divider()
);

// ─── 채널별 정밀 분석 ───
children.push(
  heading("채널별 정밀 분석"),

  para([txt("인스타그램 (@vanaro_official)", { size: 21, bold: true, color: C.purple })], { before: 200 }),
  para([txt("팔로워 1,614명 | 팔로잉 3,695명 | 게시물 146개", { size: 18, bold: true })]),
  para([txt("팔로잉이 팔로워의 2.3배 -- 맞팔 역효과로 타깃 정합성이 흐려진 상태입니다. 자체 웰니스 콘텐츠는 반응이 거의 없고, 브랜드 협업·인터뷰 콘텐츠만 반응이 옵니다. 시장이 말하고 있어요: 바나로는 콘텐츠 매거진이 아니라 큐레이터일 때 관심을 받습니다.", { size: 18 })]),
  para([txt("벤치마크: 뉴뉴매거진(42만)·어텐션(16.6만)은 큐레이션+릴스 조합으로 성장했고, 난달라는 루틴 콘텐츠+저장 유도로 팔로워를 모았습니다. 바나로는 카드형 정보 콘텐츠에 머물러 있어 저장·공유가 일어나지 않습니다.", { size: 17, color: C.text2 })]),
  divider(),

  para([txt("네이버 블로그 (vanaro_official)", { size: 21, bold: true, color: C.purple })], { before: 200 }),
  para([txt("이웃 11명 | 누적 조회 미미", { size: 18, bold: true })]),
  para([txt("콘텐츠 포화(500%+)된 '웰니스' 일반 키워드로는 검색 노출이 불가능합니다. 블로그 글 제목이 정보 나열형이라 검색 의도(구매 의도 64%)와 맞지 않습니다. '웰니스 브랜드 추천', '웰니스 루틴 제품' 같은 구매 의도 롱테일로 전환해야 검색 유입이 시작됩니다.", { size: 18 })]),
  divider(),

  para([txt("홈페이지 (vanaro.co.kr)", { size: 21, bold: true, color: C.purple })], { before: 200 }),
  para([txt("콘텐츠 다수 업로드 | 네이버 노출 안 됨", { size: 18, bold: true })]),
  para([txt("웰니스 브랜드·피플 인터뷰 등 풍부한 콘텐츠가 있지만, 네이버 검색에 노출되지 않아 유입이 거의 없습니다. SEO 최적화가 안 된 상태이고, 더 중요한 건 방문자가 왔을 때 뭘 해야 하는지(CTA) 동선이 없다는 겁니다. 홈페이지가 아카이브일 뿐 전환 도구가 아닌 상태.", { size: 18 })]),
  divider()
);

// ═══ PART 6: 경쟁사 분석 (★ 유료 전용) ═══
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(
  paidBadge(),
  sectionLabel("06", "경쟁사 분석"),
  heading("바나로가 뛰는 시장의 경쟁 지형"),
  para([txt("웰니스 미디어 시장에서 바나로가 벤치마크하거나 차별화해야 할 주요 경쟁자를 분석했습니다. 경쟁사의 강점에서 배우고, 약점에서 기회를 찾습니다.", { size: 19 })]),
  divider(),
  new Table({ rows: [
    new TableRow({ children: ["경쟁사","채널·규모","강점","약점","바나로의 기회"].map(h => new TableCell({
      children: [para([txt(h, { size: 15, bold: true, color: C.white })], { before: 25, after: 25 })],
      shading: { type: ShadingType.CLEAR, fill: C.purple },
      borders: NO_BORDERS, margins: { left: 60, right: 60 } })) }),
    ...[
      ["뉴뉴매거진","인스타 42만+","MZ 라이프스타일 큐레이션. 협업·이벤트 수익 모델 확립","웰니스 전문이 아닌 종합 라이프스타일. 깊이 부족","웰니스로 좁혀 '전문 큐레이터' 포지션 확보"],
      ["어텐션","인스타 16.6만","비주얼 강점. 브랜드 콜라보 경험 풍부","콘텐츠가 트렌드 소비에 편중. 교육·신뢰 약함","검증 기반 콘텐츠(리뷰·인터뷰)로 신뢰 차별화"],
      ["달램","뉴스레터 중심","웰니스 뉴스레터 선도. 충성 구독자 확보","인스타·검색 유입 약함. 시각 콘텐츠 부족","멀티채널(인스타+블로그+뉴스레터) 통합 가능"],
      ["난달라","유튜브+인스타","건강식·루틴 콘텐츠 인기. 인플루언서 모델","개인 중심이라 브랜드 협업 확장에 한계","미디어 브랜드로서의 조직적 접근 가능"]
    ].map(row => new TableRow({ children: row.map((t,i) => new TableCell({
      children: [para([txt(t, { size: 16, bold: i === 0 })], { before: 30, after: 30 })],
      borders: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border }, bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border }, left: EMPTY_BORDER, right: EMPTY_BORDER },
      margins: { left: 60, right: 60 },
      width: { size: i === 0 ? 14 : i === 1 ? 16 : i === 4 ? 24 : 23, type: WidthType.PERCENTAGE }
    })) }))
  ], width: { size: 100, type: WidthType.PERCENTAGE } }),
  divider(),
  callout("경쟁 요약: 웰니스 미디어 시장에 '전문 큐레이터'를 명확히 잡은 플레이어가 없습니다. 뉴뉴는 종합, 달램은 뉴스레터, 난달라는 개인. 바나로가 '검증된 웰니스 브랜드 큐레이터'를 선점하면 유일한 포지션이 됩니다."),
  divider()
);

// ─── PART 7: 핵심 병목 상세 ───
children.push(
  sectionLabel("07", "핵심 병목 상세 분석"),
  heading("왜 전환이 막혔나 -- 퍼널 진단"),
  callout("퍼널 6단계(인지 -> 고려 -> 호감 -> 구매 -> 안심 -> 팬덤) 중 바나로는 인지는 있는데 고려-호감-구매 단계가 통째로 비어 있습니다. 관심이 행동으로 흐르는 문이 없습니다.", C.red, C.redLight),
  para([txt("예상 손실: 현재 유입 중 전환으로 연결되는 비율이 사실상 0%입니다. 협업 문의조차 바나로가 먼저 제안하는 구조이며, 인바운드 전환 동선이 존재하지 않습니다.", { size: 19, color: C.red, bold: true })]),
  divider()
);

// ─── PART 8: 전략과 전술 ───
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(
  sectionLabel("08", "전략과 전술"),
  heading("큰 그림 + 그래서 정확히 뭘 어떻게"),
  callout("전략을 실행하는 데 가장 큰 장애물은 클라이언트의 관성입니다. 마르코의 진단은 그 관성을 깨는 데이터 근거입니다."),

  para([txt("전략 1 | 정체성 재정의 [1블록-5블록]", { size: 21, bold: true, color: C.purple })], { before: 200 }),
  callout("왜 이 전략인가: 자체 콘텐츠는 반응이 없고 브랜드 협업만 반응이 온다는 건 시장이 '매거진'이 아니라 '큐레이터'를 원한다는 신호입니다. 정체성을 시장이 가리키는 방향으로 먼저 좁혀야 나머지 전략이 작동합니다.", C.amber, C.amberLight),
  para([txt("'웰니스 매거진'을 버리고 '검증된 웰니스 브랜드 큐레이터'로 좁힙니다. 콘텐츠는 큐레이터의 도구이지 상품이 아닙니다.", { size: 19 })]),
  para([txt("전술: (1) 바이오를 '웰니스 브랜드를 발굴하고 검증합니다'로 교체 (2) 콘텐츠 비율을 브랜드 큐레이션 70% + 독자 교육 30%로 전환 (3) 한 문장 컨셉 확정: '믿고 따를 수 있는 웰니스 가이드'", { size: 18, color: C.text2 })]),

  para([txt("전략 2 | 전환 동선 구축 [8블록-RT]", { size: 21, bold: true, color: C.purple })], { before: 200 }),
  callout("왜 이 전략인가: RT가 6점인 이유는 '쉽게 행동할 경로'가 없기 때문입니다. 전환은 설득보다 마찰 제거에서 옵니다. CTA 하나, 링크 하나가 없는 것이 매출 0의 직접 원인입니다.", C.amber, C.amberLight),
  para([txt("관심을 행동으로 바꾸는 문을 만듭니다. 마찰을 없애는 것이 설득보다 먼저입니다.", { size: 19 })]),
  para([txt("전술: (1) 홈페이지에 '추천 제품/브랜드' 큐레이션 페이지 신설 + 제휴 링크 (2) 인스타 모든 게시물 마지막 줄에 CTA 고정 (3) 브랜드 협업 미디어킷 1장 제작 + 문의 CTA", { size: 18, color: C.text2 })]),

  para([txt("전략 3 | 블루오션 검색 선점 [7블록-FC]", { size: 21, bold: true, color: C.purple })], { before: 200 }),
  callout("왜 이 전략인가: 일반 '웰니스' 키워드는 273,000 문서(포화 500%+)로 정면승부 불가입니다. 그러나 '#웰니스루틴'(5,000+), '웰니스 브랜드 추천' 같은 롱테일은 비어 있고, 상업성(64%)이 높습니다. 여기를 먼저 잡으면 경쟁 없이 유입이 시작됩니다.", C.amber, C.amberLight),
  para([txt("콘텐츠 포화(500%+)된 일반 키워드를 피하고, 블루오션 롱테일로 검색 유입을 만듭니다.", { size: 19 })]),
  para([txt("전술: (1) 블로그 제목에 구매 의도 롱테일 사용 ('웰니스 브랜드 추천', '웰니스 루틴 제품') (2) #웰니스루틴 + #웰니스솔루션 블루오션 태그 고정 (3) 인스타 카드형 콘텐츠 + 릴스 전환", { size: 18, color: C.text2 })]),

  para([txt("전략 4 | 팬덤 구조 -- 첫 전환에서 반복 전환으로 [9블록-RT]", { size: 21, bold: true, color: C.purple })], { before: 200 }),
  callout("왜 이 전략인가: 전환(전략 2)이 1회성으로 끝나면 매출이 지속되지 않습니다. 뉴스레터·재방문 구조가 있어야 한 번 온 사람이 다시 옵니다. 바나로의 협업 브랜드가 '다시 하자'고 한 건 팬덤의 씨앗이지만 아직 시스템화되지 않았습니다.", C.amber, C.amberLight),
  para([txt("한 번 관심 가진 사람이 반복적으로 돌아오는 구조를 만듭니다.", { size: 19 })]),
  para([txt("전술: (1) 뉴스레터 수집 시작 (웰니스 위클리 큐레이션) (2) 협업 브랜드 구매자에게 다음 큐레이션 알림 (3) 지표를 팔로워에서 뉴스레터 구독·재방문율·협업 재문의로 교체", { size: 18, color: C.text2 })]),
  divider()
);

// ─── PART 9: 미션 3개 ───
children.push(
  sectionLabel("09", "오늘부터 실행할 미션 3가지"),
  heading("미션 -- 지금 시작할 수 있는 것"),

  callout("미션 1 [오늘 10분] 인스타 바이오 재작성\n바이오를 '웰니스 브랜드를 발굴하고 검증합니다 | 브랜드 협업 문의 -> DM'으로 교체하세요. 링크를 홈페이지 큐레이션 페이지(없으면 링크트리)로 변경하세요.", C.green, C.greenLight),
  para([txt("왜 이게 먼저: 바이오는 프로필 방문자가 0.5초 만에 보는 첫 문장입니다. 지금 바이오로는 '아, 매거진이구나' 하고 지나가지만, 큐레이터 바이오로 바꾸면 '어, 뭔가 도움이 되겠다'로 바뀝니다. 10분이면 끝나고, 오늘부터 모든 프로필 방문자에게 적용됩니다.", { size: 17, color: C.text2, italics: true })]),
  callout("미션 2 [이번 주 30분] 브랜드 협업 미디어킷 1장 제작\n바나로 채널 실적(팔로워, 콘텐츠 수, 협업 사례) + 가격표 + 문의 방법을 1장 PDF로. 이전 협업 브랜드에 '미디어킷 만들었어요' 메일을 보내세요.", C.green, C.greenLight),
  para([txt("왜 이게 먼저: 바나로에게 가장 검증된 수익 모델은 브랜드 협업인데, 지금은 미디어킷이 없어 제안을 못 합니다. 미디어킷 1장이 생기면 이전 협업 브랜드에 재접촉하고, 새 브랜드에 아웃리치할 수 있는 무기가 됩니다.", { size: 17, color: C.text2, italics: true })]),

  callout("미션 3 [이번 달] 큐레이션 콘텐츠 4개 발행\n자체 콘텐츠 대신, '이번 주 주목할 웰니스 브랜드' 큐레이션 카드를 주 1개씩 발행. 각 카드 마지막에 '자세히 보기 -> 프로필 링크' CTA 고정.", C.green, C.greenLight),
  para([txt("왜 이게 먼저: 자체 콘텐츠는 반응이 없었지만 협업 콘텐츠는 반응이 있었습니다. 큐레이션은 협업의 씨앗이면서 동시에 독자에게 가치 있는 콘텐츠입니다. 4개를 만들면 '이 형식이 되는지'를 데이터로 검증할 수 있습니다.", { size: 17, color: C.text2, italics: true })]),

  divider(),
  callout("이 세 미션을 실행하면 다음 달 상황이 달라집니다. 그러면 새로운 병목이 생깁니다. 클라이언트는 매달 다른 곳에서 막힙니다. 그때마다 처음부터 다시 분석해야 할까요? 아니면 마르코가 히스토리를 기억하고 다음 병목을 먼저 짚어줄까요?"),
  divider()
);

// ═══ PART 10: 실행물 1종 (★ 유료 전용) ═══
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(
  paidBadge(),
  sectionLabel("10", "실행물 -- 바로 쓸 수 있는 카피"),
  heading("병목(RT 전환) 맞춤 실행물: 인스타 프로필 카피 3종"),
  para([txt("바나로의 현재 병목(전환 부재)에 맞춰, 내일 바로 교체할 수 있는 인스타 프로필 카피를 3종 만들었습니다. 복사해서 바로 쓰시거나, 어울리는 것을 골라 수정하세요.", { size: 19 })]),
  divider(),

  callout("버전 A -- 큐레이터 포지션 강조\n\n검증된 웰니스 브랜드를 발굴합니다\n직접 써보고 인정한 브랜드만 소개해요\n브랜드 협업 -> DM / 구독자 추천 제품 -> 아래 링크", C.purple, C.purpleLight),

  callout("버전 B -- 독자 니즈 중심\n\n당신의 웰니스 루틴, 뭐부터 시작할지 모르겠다면\n매주 검증된 브랜드와 루틴을 골라드려요\n이번 주 추천 -> 아래 링크", C.purple, C.purpleLight),

  callout("버전 C -- 데이터 신뢰 강조\n\n웰니스 브랜드 리뷰 & 큐레이션\n146개 콘텐츠, 20+ 브랜드 협업 경험\n검증된 추천 -> 아래 링크 | 협업 문의 -> DM", C.purple, C.purpleLight),

  para([txt("팁: A는 B2B(브랜드) 유치에 강하고, B는 팔로워 증가에 강하고, C는 신뢰에 강합니다. 지금 바나로에게 가장 급한 건 전환 동선이라 A 또는 C를 추천합니다.", { size: 18, color: C.text2, italics: true })]),
  divider()
);

// ─── PART 11: 3개월 로드맵 ───
children.push(
  sectionLabel("11", "3개월 로드맵"),
  heading("미션을 실행하면 3개월 후"),
  new Table({ rows: [
    new TableRow({ children: ["1개월 -- 지금 시작","2개월 (Pro)","3개월 (Pro)"].map(h => new TableCell({
      children: [para([txt(h, { size: 16, bold: true, color: C.white })], { before: 30, after: 30 })],
      shading: { type: ShadingType.CLEAR, fill: C.purple },
      borders: NO_BORDERS, margins: { left: 80, right: 80 },
      width: { size: 33, type: WidthType.PERCENTAGE } })) }),
    new TableRow({ children: [
      "바이오+CTA 교체\n미디어킷 제작\n큐레이션 콘텐츠 전환\n블루오션 태그 선점",
      "큐레이션 페이지 완성\n뉴스레터 런칭\n협업 2건 확보\n전환율 측정 시작",
      "뉴스레터 1,000명\n커머스 첫 매출\n블로그 검색 유입 확보\n팬덤 구조 가동"
    ].map(t => new TableCell({
      children: t.split("\n").map(line => para([txt(line, { size: 17 })], { before: 20, after: 20 })),
      borders: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border }, bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border }, left: EMPTY_BORDER, right: EMPTY_BORDER },
      margins: { left: 80, right: 80 }, width: { size: 33, type: WidthType.PERCENTAGE } })) })
  ], width: { size: 100, type: WidthType.PERCENTAGE } }),
  callout("이 세 미션을 실행하면 다음 달 상황이 달라집니다. 그러면 새로운 병목이 생깁니다. 클라이언트는 매달 다른 곳에서 막힙니다. 그때마다 처음부터 다시 분석해야 할까요? 아니면 마르코가 히스토리를 기억하고 다음 병목을 먼저 짚어줄까요?"),
  divider()
);

// ═══ PART 12: 미팅 스크립트 (★ 유료 전용) ═══
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(
  paidBadge(),
  sectionLabel("12", "미팅 스크립트"),
  heading("클라이언트 미팅에서 바로 꺼내는 대화 가이드"),
  para([txt("바나로 담당자님이 클라이언트(또는 내부 의사결정자)에게 진단 결과를 설명할 때, 아래 흐름으로 이야기하면 설득력이 올라갑니다.", { size: 19 })]),
  divider(),

  para([txt("1단계: 현황 인정 (30초)", { size: 20, bold: true, color: C.purple })], { before: 160 }),
  callout("\"현재 인스타 팔로워 1,614명, 블로그·홈페이지도 운영하고 계시고, 콘텐츠 146개를 꾸준히 만들고 계십니다. 노력을 안 하시는 게 아닙니다.\""),

  para([txt("2단계: 문제 정의 (1분)", { size: 20, bold: true, color: C.purple })], { before: 160 }),
  callout("\"그런데 데이터를 보니까, 문제는 콘텐츠 양이 아니라 '관심이 행동으로 바뀌는 구조'가 없다는 겁니다. 팔로워가 보고 좋아하지만, 뭘 사거나 문의하는 경로가 없어요. 5가지 진단에서 전환(RT)이 6점으로 매출을 완전히 막고 있습니다.\""),

  para([txt("3단계: 경쟁 맥락 (30초)", { size: 20, bold: true, color: C.purple })], { before: 160 }),
  callout("\"비슷한 웰니스 미디어들(뉴뉴, 달램)은 콘텐츠로 청중을 모으고 협업과 큐레이션으로 수익을 만드는 구조를 이미 갖추고 있습니다. 바나로는 콘텐츠 역량은 있는데 그 수익 구조가 빠져 있는 거예요.\""),

  para([txt("4단계: 제안 방향 (1분)", { size: 20, bold: true, color: C.purple })], { before: 160 }),
  callout("\"이번 달 집중할 건 세 가지입니다. 첫째, 정체성을 '매거진'에서 '검증된 웰니스 큐레이터'로 좁힙니다. 둘째, 전환 동선을 만듭니다 -- CTA, 협업 미디어킷, 큐레이션 페이지. 셋째, 블루오션 태그(#웰니스루틴)를 선점합니다.\""),

  para([txt("5단계: 다음 약속 (30초)", { size: 20, bold: true, color: C.purple })], { before: 160 }),
  callout("\"한 달 뒤에 이 미션의 결과를 마르코가 측정해서, 다음 병목과 새 미션을 드릴 겁니다. 그래서 이번 달은 이 세 가지에만 집중하시면 됩니다.\""),
  divider()
);

// ═══ PART 13: 제안서 초안 (★ 유료 전용) ═══
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(
  paidBadge(),
  sectionLabel("13", "제안서 초안"),
  heading("이번 달 실행 방향 -- 1장 요약"),
  para([txt("클라이언트(또는 대표)에게 보고할 때 이 페이지를 그대로 첨부하거나, 내용을 복사해 제안서에 붙여넣으세요.", { size: 19 })]),
  divider(),

  new Table({ rows: [
    twoColRow("클라이언트", "VANARO 바나로"),
    twoColRow("진단 결과", "총점 46/100 | 병목: RT 전환 (6/20)"),
    twoColRow("핵심 문제", "관심이 행동(매출)으로 연결되는 구조 부재"),
    twoColRow("경쟁 기회", "웰니스 전문 큐레이터 포지션이 비어 있음"),
    twoColRow("이번 달 방향", "정체성 재정의 + 전환 동선 구축 + 블루오션 선점"),
  ], width: { size: 100, type: WidthType.PERCENTAGE } }),
  divider(),

  para([txt("이번 달 실행 계획", { size: 21, bold: true, color: C.purple })], { before: 160 }),
  new Table({ rows: [
    new TableRow({ children: ["실행 항목","기한","담당","예상 결과"].map(h => new TableCell({
      children: [para([txt(h, { size: 16, bold: true, color: C.white })], { before: 25, after: 25 })],
      shading: { type: ShadingType.CLEAR, fill: C.black },
      borders: NO_BORDERS, margins: { left: 60, right: 60 } })) }),
    ...[["인스타 바이오+CTA 교체","금주 내","담당자","프로필 방문 -> 링크 클릭률 측정 시작"],
        ["브랜드 협업 미디어킷 제작","1주 내","담당자","기존 협업 브랜드 3곳에 재발송"],
        ["큐레이션 콘텐츠 주 1회 발행","월 4회","담당자","저장률·공유율 vs 기존 콘텐츠 비교"],
        ["블루오션 해시태그 고정","즉시","담당자","#웰니스루틴 게시물 노출 추적"]
    ].map(row => new TableRow({ children: row.map((t,i) => new TableCell({
      children: [para([txt(t, { size: 17 })], { before: 25, after: 25 })],
      borders: { top: { style: BorderStyle.SINGLE, size: 1, color: C.border }, bottom: { style: BorderStyle.SINGLE, size: 1, color: C.border }, left: EMPTY_BORDER, right: EMPTY_BORDER },
      margins: { left: 60, right: 60 } })) }))
  ], width: { size: 100, type: WidthType.PERCENTAGE } }),
  divider(),
  para([txt("다음 진단 예정: 1개월 후 | 마르코가 결과를 확인하고 다음 병목·미션을 제공합니다.", { size: 18, color: C.text2, italics: true })]),
  divider()
);

// ═══ PART 14: 업셀링 블록 (★ 유료 전용) ═══
children.push(
  paidBadge(),
  sectionLabel("14", "대행사 활용 -- 역제안 블록"),
  heading("이 미션을 대행하기 위한 우리의 제안"),
  para([txt("아래 칸에 담당자님의 추가 대행 제안을 작성해서 광고주에게 함께 제출하세요. 마르코 진단을 근거로, 대행사의 실행력을 어필하는 역제안 도구입니다.", { size: 19 })]),
  divider(),
  new Table({ rows: [new TableRow({ children: [new TableCell({
    children: [
      para([txt("[대행사명]이 이번 달 제안드리는 추가 실행:", { size: 18, bold: true, color: C.purple })], { before: 60 }),
      para([txt(" ")]),
      para([txt("예시: 큐레이션 콘텐츠 주 2회 제작 대행 (월 OO만원)", { size: 17, color: C.text3, italics: true })]),
      para([txt("예시: 인스타 릴스 촬영+편집 월 4편 (월 OO만원)", { size: 17, color: C.text3, italics: true })]),
      para([txt("예시: 브랜드 협업 아웃리치 대행 (월 OO만원)", { size: 17, color: C.text3, italics: true })]),
      para([txt(" ")]),
      para([txt("(이 칸을 채워서 광고주에게 제출하세요)", { size: 16, color: C.text3 })]),
      para([txt(" ")], { after: 60 }),
    ],
    borders: { top: { style: BorderStyle.DASHED, size: 2, color: C.purple },
               bottom: { style: BorderStyle.DASHED, size: 2, color: C.purple },
               left: { style: BorderStyle.DASHED, size: 2, color: C.purple },
               right: { style: BorderStyle.DASHED, size: 2, color: C.purple } },
    shading: { type: ShadingType.CLEAR, fill: C.purpleLight },
    margins: { top: 80, bottom: 80, left: 200, right: 200 },
    width: { size: 100, type: WidthType.PERCENTAGE }
  })] })], width: { size: 100, type: WidthType.PERCENTAGE } }),
  divider()
);

// ─── 마르코의 한 마디 ───
children.push(
  heading("마르코의 한 마디"),
  callout("바나로의 무기는 이미 있습니다. 146개의 콘텐츠, 브랜드 협업 경험, 그리고 시장이 원하는 '검증된 웰니스 큐레이터'라는 빈 자리. 부족한 건 콘텐츠가 아니라 그 콘텐츠를 매출로 바꾸는 문입니다. 이번 달 그 문을 만들면, 다음 달 마르코가 다음 병목을 찾아드립니다."),
  divider(),
  para([txt("같은 고민을 하는 동료에게 마르코를 소개해 주세요.", { size: 18, color: C.text2 })]),
  para([txt("무료 진단 신청: https://jztyy3xlul.zite.so", { size: 17, color: C.purple })]),
  divider(),
  para([txt("MARCO | 마케터의 세 번째 뇌 | hello@marcoai.kr", { size: 16, color: C.text3 })], { before: 200 }),
  para([txt("AI와 마르코 팀이 직접 분석한 리포트입니다. 클라이언트 광고 계정이나 비밀번호를 요구하지 않으며, 공개 데이터와 입력 정보만으로 진단합니다.", { size: 15, color: C.text3 })]),
);

// ════════════════════════════════════════════════
//  문서 생성
// ════════════════════════════════════════════════

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Noto Sans CJK KR", size: 20 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1100, right: 1200, bottom: 1100, left: 1200 }
      }
    },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  const out = "/home/claude/vanaro_paid_report.docx";
  fs.writeFileSync(out, buf);
  console.log("생성 완료:", out, buf.length, "bytes");
});
