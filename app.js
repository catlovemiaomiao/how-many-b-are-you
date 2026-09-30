(function () {
  "use strict";

  const app = document.getElementById("app");
  const modal = document.getElementById("poster-modal");
  const QUESTIONS = Array.isArray(window.BRAIN_QUESTIONS) ? window.BRAIN_QUESTIONS : [];
  const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  const categories = [
    { id: "logic", name: "逻辑推理", short: "逻辑", avatar: "assets/proctor-star.jpg", soft: "#eee7ff", ink: "#7057bc", bar: "#ab91ec", whisper: "先别急，我的耳朵也竖起来了。" },
    { id: "numeric", name: "数量与数据", short: "数感", avatar: "assets/proctor-flower.jpg", soft: "#ffede2", ink: "#bd7550", bar: "#f4aa83", whisper: "我在认真数花瓣，真的。" },
    { id: "reading", name: "中文理解", short: "阅读", avatar: "assets/proctor-blue.jpg", soft: "#eaf3ff", ink: "#5278ad", bar: "#87aee7", whisper: "字里行间，有没有小尾巴？" },
    { id: "rules", name: "规则执行", short: "规则", avatar: "assets/proctor-crown.jpg", soft: "#fff0e6", ink: "#a16b61", bar: "#e7a8a2", whisper: "小皇冠宣布：规则要看完整！" },
  ];
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const avatars = [
    { file: "assets/proctor-star.jpg", className: "star", label: "星星监考员" },
    { file: "assets/proctor-crown.jpg", className: "crown", label: "皇冠监考员" },
    { file: "assets/proctor-flower.jpg", className: "flower", label: "小花监考员" },
    { file: "assets/proctor-blue.jpg", className: "blue", label: "蓝蓝监考员" },
    { file: "assets/proctor-moon.jpg", className: "moon", label: "月角监考员" },
  ];
  const packs = [
    { id: "A", name: "星屑开场", note: "日常小脑洞", avatar: avatars[0].file },
    { id: "B", name: "糖果夜班", note: "拐个温柔的弯", avatar: avatars[2].file },
    { id: "C", name: "月球来信", note: "多想一小步", avatar: avatars[4].file },
    { id: "D", name: "蓝莓值班", note: "顺着线索找找看", avatar: avatars[3].file },
    { id: "E", name: "皇冠谜语", note: "认真读到最后", avatar: avatars[1].file },
  ];
  const tiers = [
    { min: 0, value: "0.6", name: "萌芽", line: "脑洞刚发芽，下一题说不定就开花。" },
    { min: 35, value: "1.7", name: "灵感", line: "已经接住了不少藏在句子里的线索。" },
    { min: 55, value: "4", name: "火花", line: "有几题绕了弯，你还是抓到了重点。" },
    { min: 70, value: "8", name: "星群", line: "这轮的思路，连成了一串亮晶晶的星。" },
    { min: 82, value: "14", name: "星云", line: "不少细节题都被你稳稳接住了。" },
    { min: 92, value: "32", name: "银河", line: "监考团围观完这轮，集体眨了眨眼。" },
  ];
  const STORE_ACTIVE = "brain-b-quiz-active-v2";
  const STORE_RESULT = "brain-b-quiz-result-v2";
  let selectedMode = "quick";
  let selectedPack = "A";
  let active = readStore(STORE_ACTIVE);
  let result = readStore(STORE_RESULT);
  let currentView = "home";
  let previousFocus = null;

  function readStore(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* In-memory play still works. */ }
  }
  function removeStore(key) {
    try { localStorage.removeItem(key); } catch (_) { /* Ignore blocked local storage. */ }
  }
  function esc(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function pct(correct, total) { return total ? (correct / total) * 100 : 0; }
  function tierFor(percent) {
    return [...tiers].reverse().find((t) => percent >= t.min) || tiers[0];
  }
  function modeName(mode) { return mode === "deep" ? "认真局" : "轻快局"; }
  function packName(pack) { return (packs.find((p) => p.id === pack) || packs[0]).name; }
  function safeRun(run) {
    return run && Array.isArray(run.questionIds) && Array.isArray(run.answers)
      && run.questionIds.length === run.answers.length
      && run.questionIds.every((id) => byId[id])
      && Number.isInteger(run.index) && run.index >= 0 && run.index < run.questionIds.length;
  }
  if (!safeRun(active)) { active = null; removeStore(STORE_ACTIVE); }
  if (result && (!Array.isArray(result.questionIds) || result.questionIds.some((id) => !byId[id]))) {
    result = null; removeStore(STORE_RESULT);
  }

  function tierCountRange(index, total) {
    const first = Math.ceil(tiers[index].min * total / 100);
    const last = index + 1 < tiers.length
      ? Math.ceil(tiers[index + 1].min * total / 100) - 1
      : total;
    return first === last ? `${first} 题` : `${first}–${last} 题`;
  }
  function tierTableHTML() {
    return `<div class="score-table-wrap"><table class="score-table"><thead><tr><th scope="col">趣味档位</th><th scope="col">16 题答对</th><th scope="col">32 题答对</th></tr></thead><tbody>${tiers.map((tier, i) => `<tr><th scope="row"><strong>${tier.value}B</strong><span>${tier.name}</span></th><td>${tierCountRange(i, 16)}</td><td>${tierCountRange(i, 32)}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function methodHTML() {
    return `<section class="home-section method-section" id="method" aria-labelledby="method-title">
      <div class="section-heading"><div><span class="section-kicker">HOW THIS LITTLE TEST WORKS</span><h2 id="method-title">先说清楚：我们在测什么？</h2></div></div>
      <div class="method-intro"><span class="method-badge">1B = 10 亿参数</span><p>这个项目借用模型参数量的“B”来给答题表现起趣味称号：做题，看看自己今天落在哪一档。<strong>它不是人脑参数量，也没有用模型实测结果换算你。</strong></p></div>
      <div class="basis-grid">
        <div class="basis-card"><span>✦ 逻辑推理</span><p>多步条件与反例，参考 <a href="https://arxiv.org/abs/2406.01574" target="_blank" rel="noopener noreferrer">MMLU-Pro</a> 的推理取向。</p></div>
        <div class="basis-card"><span>✿ 数量与数据</span><p>生活场景里的计算，参考 <a href="https://arxiv.org/abs/2110.14168" target="_blank" rel="noopener noreferrer">GSM8K</a> 的应用题思路。</p></div>
        <div class="basis-card"><span>✧ 中文理解</span><p>理解语气、条件和结论；借鉴 <a href="https://cevalbenchmark.com/" target="_blank" rel="noopener noreferrer">C-Eval</a> 的中文语境。</p></div>
        <div class="basis-card"><span>☾ 规则执行</span><p>按先后和例外条件做选择；借鉴 <a href="https://arxiv.org/abs/2311.07911" target="_blank" rel="noopener noreferrer">IFEval</a> 的可核对规则。</p></div>
      </div>
      <div class="score-board"><div class="score-board-heading"><span>✎ 评分标准</span><strong>答对数 ÷ 总题数 = 正确率</strong></div>
        <p>四类题平均分配，每题 1 分；跳过算未答对，不计时，也没有隐藏加权。用下表的固定正确率区间换算趣味 B 档；表内列出两种局数的实际答对题数。</p>
        ${tierTableHTML()}
        <p class="method-foot">五套卷共 80 道原创四选一题，交卷后可查解析。B 标签借用 <a href="https://qwenlm.github.io/blog/qwen3/" target="_blank" rel="noopener noreferrer">Qwen3 公布的六种稠密模型尺寸</a>；没有调用模型做题，也没有借用基准榜单的分数。不同卷的难度尚未通过真人样本等值校准，适合娱乐和自我观察，不适合跨卷排行。</p>
      </div>
    </section>`;
  }

  function homeHTML() {
    const heroStickers = avatars.map((a) => `<img class="hero-sticker ${a.className}" src="${a.file}" alt="${a.label}">`).join("");
    const proctors = avatars.map((a, i) => `<div class="proctor-card"><img src="${a.file}" alt=""><span>${["眨眼也在监考", "皇冠有点歪", "悄悄给你打气", "蓝色小记录员", "今天不查小抄"][i]}</span></div>`).join("");
    const modeCards = [
      { id: "quick", icon: "✦", name: "轻快局", note: "16 题 · 约 7–10 分钟 · 适合朋友接力" },
      { id: "deep", icon: "☾", name: "认真局", note: "32 题 · 约 15–20 分钟 · 看四项表现" },
    ].map((m) => `<button class="mode-card" type="button" data-mode="${m.id}" aria-pressed="${selectedMode === m.id}"><span class="mode-icon" aria-hidden="true">${m.icon}</span><span><strong>${m.name}</strong><small>${m.note}</small></span><span class="mode-check" aria-hidden="true">✓</span></button>`).join("");
    const packCards = packs.map((p) => `<button class="pack-card" type="button" data-pack="${p.id}" aria-pressed="${selectedPack === p.id}"><span class="pack-star" aria-hidden="true">✦</span><img src="${p.avatar}" alt=""><strong>${p.name}</strong><small>${p.note}</small></button>`).join("");
    return `
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <span class="eyebrow">✦ 脑力小测 · 呆萌监考中</span>
          <h1 id="hero-title">你今天<br><span class="b-line">有几 <span class="b-word">B</span>？</span></h1>
          <p>把“人脑大概几 B”变成一场趣味小测：答几道生活化的推理题，看看今天能拿到几 B 称号。五位呆萌监考员陪你开卷！</p>
          <div class="hero-meta"><span class="mini-tag">不登录</span><span class="mini-tag">不催时间</span><span class="mini-tag">答完看解析</span></div>
        </div>
        <div class="hero-art" aria-label="五位呆萌监考员贴纸印花">${heroStickers}<span class="art-spark one" aria-hidden="true">✦</span><span class="art-spark two" aria-hidden="true">✧</span><span class="art-spark three" aria-hidden="true">✿</span><span class="art-note">监考团：我们准备好啦！</span></div>
      </section>
      <section class="home-section" aria-labelledby="team-title">
        <div class="section-heading"><div><span class="section-kicker">MEET THE PROCTORS</span><h2 id="team-title">今天的监考团</h2></div></div>
        <div class="proctor-row">${proctors}</div>
      </section>
      ${methodHTML()}
      <section class="home-section" aria-labelledby="start-title">
        <div class="section-heading"><div><span class="section-kicker">PICK YOUR GAME</span><h2 id="start-title">挑一局，开动脑袋</h2></div><p>手机上一题一页，随时可以续答。</p></div>
        <div class="play-panel">
          <div><p class="control-title">① 先选节奏</p><div class="mode-list">${modeCards}</div></div>
          <div><p class="control-title">② 选一套印花卷 <em>${selectedMode === "deep" ? "（认真局会加上下一套）" : ""}</em></p><div class="pack-list">${packCards}</div></div>
          <div class="play-bottom"><p>五套原创卷任你挑。交卷后会看到真实答对数、四项表现和每题解释。</p><button class="primary-button" id="start-button" type="button">监考团，开卷！ <span aria-hidden="true">→</span></button></div>
        </div>
        ${active ? `<div class="resume-card"><img src="assets/proctor-moon.jpg" alt=""><p><strong>上次那局还在等你</strong>${esc(modeName(active.mode))} · ${esc(packName(active.pack))} · 已到第 ${active.index + 1} / ${active.questionIds.length} 题</p><button class="secondary-button" id="resume-button" type="button">继续答题</button></div>` : ""}
        ${result ? `<div class="resume-card"><img src="assets/proctor-star.jpg" alt=""><p><strong>上次的脑力卡还在</strong>${esc(modeName(result.mode))} · 答对 ${scoreRun(result).correct} / ${result.questionIds.length}</p><button class="secondary-button" id="last-result-button" type="button">查看结果</button></div>` : ""}
        <div class="about-card"><span class="about-icon" aria-hidden="true">✎</span><div><strong>小纸条</strong>：答题进度和最近一次结果只保存在你当前的浏览器里。交卷后可以下载海报，再发到朋友圈或小红书；朋友打开测试网址，就能做自己的那一局。</div></div>
      </section>`;
  }

  function renderHome(scrollTop = false) {
    currentView = "home";
    app.innerHTML = homeHTML();
    document.body.className = "view-home";
    app.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
      selectedMode = button.dataset.mode;
      renderHome(false);
    }));
    app.querySelectorAll("[data-pack]").forEach((button) => button.addEventListener("click", () => {
      selectedPack = button.dataset.pack;
      renderHome(false);
    }));
    document.getElementById("start-button").addEventListener("click", startRun);
    document.getElementById("resume-button")?.addEventListener("click", () => renderQuiz(true));
    document.getElementById("last-result-button")?.addEventListener("click", () => renderResult(true));
    if (scrollTop) window.scrollTo({ top: 0, behavior: "instant" });
  }

  function questionIdsFor(mode, pack) {
    const packIndex = packs.findIndex((p) => p.id === pack);
    const included = mode === "deep" ? [pack, packs[(packIndex + 1) % packs.length].id] : [pack];
    const ids = [];
    const rounds = mode === "deep" ? 8 : 4;
    for (let round = 0; round < rounds; round++) {
      for (const category of categories) {
        const items = included.flatMap((packId) => QUESTIONS.filter((q) => q.pack === packId && q.category === category.id));
        ids.push(items[round].id);
      }
    }
    return ids;
  }
  function startRun() {
    const questionIds = questionIdsFor(selectedMode, selectedPack);
    active = { mode: selectedMode, pack: selectedPack, questionIds, answers: questionIds.map(() => null), index: 0, startedAt: Date.now() };
    writeStore(STORE_ACTIVE, active);
    renderQuiz(true);
  }
  function renderQuiz(scrollTop = false) {
    if (!safeRun(active)) { renderHome(true); return; }
    currentView = "quiz";
    document.body.className = "view-quiz";
    const q = byId[active.questionIds[active.index]];
    const cat = categoryById[q.category];
    const selected = active.answers[active.index];
    const fraction = ((active.index + 1) / active.questionIds.length) * 100;
    const options = q.options.map((value, i) => `<button class="choice" type="button" data-choice="${i}" aria-pressed="${selected === i}"><span class="choice-letter">${"ABCD"[i]}</span><span>${esc(value)}</span></button>`).join("");
    app.innerHTML = `<section class="quiz-shell" aria-labelledby="question-title">
      <div class="quiz-top"><button class="quiet-button" id="quit-button" type="button">← 暂停，回首页</button><span class="quiz-count">${esc(modeName(active.mode))} · 第 ${active.index + 1} / ${active.questionIds.length} 题</span></div>
      <div class="progress-track" role="progressbar" aria-label="答题进度" aria-valuemin="0" aria-valuemax="${active.questionIds.length}" aria-valuenow="${active.index + 1}"><div class="progress-fill" style="width:${fraction}%"></div></div>
      <div class="quiz-card" style="--cat-soft:${cat.soft};--cat-ink:${cat.ink}">
        <div class="question-head"><img class="question-proctor" src="${cat.avatar}" alt=""><div class="question-meta"><span class="category-pill">${cat.name}</span><span class="proctor-whisper">${cat.whisper}</span></div></div>
        <h1 class="question-prompt" id="question-title" tabindex="-1">${esc(q.prompt)}</h1>
        <div class="choice-list" role="group" aria-label="请选择一个答案">${options}</div>
      </div>
      <div class="quiz-actions"><button class="quiet-button" id="prev-button" type="button" ${active.index === 0 ? "disabled" : ""}>← 上一题</button><div class="right-actions"><button class="quiet-button" id="skip-button" type="button">跳过</button><button class="primary-button" id="next-button" type="button" ${selected === null || selected === -1 ? "disabled" : ""}>${active.index === active.questionIds.length - 1 ? "交卷看结果" : "下一题 →"}</button></div></div>
      <p class="quiz-footnote">可以慢慢想；切到别的页面再回来，进度还在。</p>
    </section>`;
    app.querySelectorAll("[data-choice]").forEach((button) => button.addEventListener("click", () => chooseAnswer(Number(button.dataset.choice))));
    document.getElementById("quit-button").addEventListener("click", () => renderHome(true));
    document.getElementById("prev-button").addEventListener("click", previousQuestion);
    document.getElementById("skip-button").addEventListener("click", skipQuestion);
    document.getElementById("next-button").addEventListener("click", nextQuestion);
    if (scrollTop) { window.scrollTo({ top: 0, behavior: "instant" }); document.getElementById("question-title").focus({ preventScroll: true }); }
  }
  function chooseAnswer(answer) {
    active.answers[active.index] = answer;
    writeStore(STORE_ACTIVE, active);
    app.querySelectorAll("[data-choice]").forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.choice) === answer)));
    document.getElementById("next-button").disabled = false;
  }
  function previousQuestion() {
    if (active.index > 0) { active.index--; writeStore(STORE_ACTIVE, active); renderQuiz(true); }
  }
  function skipQuestion() {
    active.answers[active.index] = -1;
    advanceQuestion();
  }
  function nextQuestion() {
    if (active.answers[active.index] === null || active.answers[active.index] === -1) return;
    advanceQuestion();
  }
  function advanceQuestion() {
    if (active.index === active.questionIds.length - 1) { finishRun(); return; }
    active.index++;
    writeStore(STORE_ACTIVE, active);
    renderQuiz(true);
  }
  function scoreRun(run) {
    const cats = Object.fromEntries(categories.map((c) => [c.id, { correct: 0, total: 0 }]));
    let correct = 0;
    run.questionIds.forEach((id, i) => {
      const q = byId[id];
      const hit = run.answers[i] === q.answer;
      cats[q.category].total++;
      if (hit) { correct++; cats[q.category].correct++; }
    });
    return { correct, total: run.questionIds.length, percent: pct(correct, run.questionIds.length), cats };
  }
  function finishRun() {
    result = { ...active, finishedAt: Date.now() };
    active = null;
    removeStore(STORE_ACTIVE);
    writeStore(STORE_RESULT, result);
    renderResult(true);
  }
  function reviewHTML(run) {
    return run.questionIds.map((id, i) => {
      const q = byId[id];
      const answer = run.answers[i];
      const hit = answer === q.answer;
      const status = answer === -1 ? "skipped" : hit ? "right" : "wrong";
      const label = answer === -1 ? "跳过" : hit ? "答对" : "再看看";
      const yourAnswer = answer === -1 ? "你跳过了这题" : `${"ABCD"[answer]}. ${q.options[answer]}`;
      return `<details class="review-item"><summary><span class="review-status ${status}">${hit ? "✓" : answer === -1 ? "·" : "!"}</span><span>${i + 1}. ${esc(q.prompt)}</span><span class="sr-only">${label}</span></summary><div class="review-content"><p>你的答案：${esc(yourAnswer)}</p><p><strong>正确答案：${"ABCD"[q.answer]}. ${esc(q.options[q.answer])}</strong></p><p>${esc(q.explanation)}</p></div></details>`;
    }).join("");
  }
  function renderResult(scrollTop = false) {
    if (!result) { renderHome(true); return; }
    currentView = "result";
    document.body.className = "view-result";
    const score = scoreRun(result);
    const tier = tierFor(score.percent);
    const best = [...categories].sort((a, b) => {
      const ar = pct(score.cats[a.id].correct, score.cats[a.id].total);
      const br = pct(score.cats[b.id].correct, score.cats[b.id].total);
      return br - ar;
    })[0];
    const abilityCards = categories.map((c) => {
      const data = score.cats[c.id];
      const percent = pct(data.correct, data.total);
      const note = data.correct === data.total ? "这项本轮全对 ✦" : data.correct === 0 ? "看看解析，再来一轮" : percent >= 70 ? "这项思路挺稳" : "还有线索可以捡";
      return `<div class="ability-card" style="--bar:${c.bar}"><div class="ability-heading"><img src="${c.avatar}" alt=""><strong>${c.name}</strong><span>${data.correct} / ${data.total}</span></div><div class="ability-track" aria-hidden="true"><span style="width:${percent}%"></span></div><p>${note}</p></div>`;
    }).join("");
    const alternateAvatars = avatars.filter((a) => a.file !== best.avatar);
    app.innerHTML = `<section class="result-shell" aria-labelledby="result-title">
      <div class="result-banner"><div class="result-copy"><span class="result-kicker">✦ 呆萌监考团 · 趣味 B 档位</span><h1 class="result-title" id="result-title" tabindex="-1">你的脑力星图已出炉</h1><div class="result-number">${tier.value}<small>B</small></div><p><strong>${tier.name}档</strong> · ${tier.line}<br>本轮答对 ${score.correct} / ${score.total} 题。</p></div><div class="result-art" aria-hidden="true"><img class="main-proctor" src="${best.avatar}" alt=""><img class="mini-proctor" src="${alternateAvatars[0].file}" alt=""><img class="mini-proctor second" src="${alternateAvatars[1].file}" alt=""><span class="yay">✿</span></div></div>
      <div class="result-summary"><span class="summary-chip">📘 ${esc(modeName(result.mode))}</span><span class="summary-chip">✦ ${esc(packName(result.pack))}${result.mode === "deep" ? "＋下一套" : ""}</span><span class="summary-chip">答对 <strong>${score.correct} / ${score.total}</strong></span></div>
      <section class="result-section" aria-labelledby="ability-title"><h2 id="ability-title">四项能力小星图</h2><p class="section-note">这里先看实际答对数。${result.mode === "quick" ? "轻快局每项只有 4 题，不单独换算 B。" : "认真局每项 8 题，仍只适合趣味观察。"}</p><div class="ability-grid">${abilityCards}</div></section>
      <p class="result-percent">本轮正确率 <strong>${Math.round(score.percent * 10) / 10}%</strong>（${score.correct} ÷ ${score.total}）。每题 1 分，跳过也计入总题数；不计时、不加权。</p>
      <details class="score-detail"><summary>看看六个 B 档位怎么划分 ▾</summary>${tierTableHTML()}</details>
      <div class="result-disclaimer"><span aria-hidden="true">✎</span><div><strong>这张卡说的 B 是娱乐称号。</strong>它按本轮正确率落档，题型参考公开 benchmark；没有让对应大小的模型做这些题，因此不能解读为“你的大脑相当于某 B 模型”。也不是智商或心理测量结果。</div></div>
      <div class="result-buttons"><button class="primary-button" id="poster-button" type="button">做一张可爱结果海报 ✦</button><button class="secondary-button" id="copy-link-button" type="button">复制测试网址</button><button class="secondary-button" id="replay-button" type="button">再来一局</button><button class="quiet-button" id="home-button" type="button">回首页</button></div>
      <section class="result-section" aria-labelledby="review-title"><h2 id="review-title">翻翻这局的题</h2><p class="section-note">点开能看你的选择、标准答案和解释。监考团交卷后才公布答案。</p><div class="review-list">${reviewHTML(result)}</div></section>
    </section>`;
    document.getElementById("poster-button").addEventListener("click", () => makePoster(result, score, tier));
    document.getElementById("copy-link-button").addEventListener("click", async (event) => {
      const url = new URL(".", location.href).href;
      try {
        await navigator.clipboard.writeText(url);
        event.currentTarget.textContent = "网址已复制 ✓";
      } catch (_) {
        window.prompt("复制这条网址，发给朋友来答题：", url);
      }
    });
    document.getElementById("replay-button").addEventListener("click", () => { selectedMode = result.mode; selectedPack = result.pack; renderHome(true); });
    document.getElementById("home-button").addEventListener("click", () => renderHome(true));
    if (scrollTop) { window.scrollTo({ top: 0, behavior: "instant" }); document.getElementById("result-title").focus({ preventScroll: true }); }
  }

  function rounded(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius); ctx.closePath();
  }
  function fillRound(ctx, x, y, w, h, r, color) { ctx.fillStyle = color; rounded(ctx, x, y, w, h, r); ctx.fill(); }
  function loadImage(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }
  function squareImage(ctx, image, x, y, size, radius = 25) {
    if (!image) return;
    ctx.save(); rounded(ctx, x, y, size, size, radius); ctx.clip();
    const side = Math.min(image.width, image.height);
    ctx.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, x, y, size, size);
    ctx.restore();
    ctx.strokeStyle = "#fff4e8"; ctx.lineWidth = 7; rounded(ctx, x, y, size, size, radius); ctx.stroke();
  }
  async function makePoster(run, score, tier) {
    const button = document.getElementById("poster-button");
    button.disabled = true; button.textContent = "监考团正在贴贴纸…";
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080; canvas.height = 1440;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("无法创建画布");
      const imageFiles = [...new Set(avatars.map((a) => a.file))];
      const images = Object.fromEntries(await Promise.all(imageFiles.map(async (file) => [file, await loadImage(file)])));
      ctx.fillStyle = "#faf3ff"; ctx.fillRect(0, 0, 1080, 1440);
      for (let i = 0; i < 22; i++) {
        ctx.fillStyle = i % 2 ? "#e5daf5" : "#f7dfe6";
        ctx.beginPath(); ctx.arc(35 + (i * 211) % 1010, 40 + (i * 307) % 1360, i % 3 === 0 ? 8 : 5, 0, Math.PI * 2); ctx.fill();
      }
      const grad = ctx.createLinearGradient(50, 55, 1000, 650);
      grad.addColorStop(0, "#342a60"); grad.addColorStop(1, "#6e5ba4");
      fillRound(ctx, 48, 50, 984, 620, 48, grad);
      ctx.fillStyle = "#ffe4aa"; ctx.font = "900 34px -apple-system, PingFang SC, sans-serif";
      ctx.fillText("✦  呆萌监考团 · 趣味小测", 105, 125);
      ctx.fillStyle = "#fff7ec"; ctx.font = "900 62px -apple-system, PingFang SC, sans-serif";
      ctx.fillText("我今天的脑力档位", 102, 225);
      ctx.fillStyle = "#ffd1e1"; ctx.font = "1000 182px -apple-system, PingFang SC, sans-serif";
      ctx.fillText(`${tier.value}B`, 92, 420);
      ctx.fillStyle = "#fbe6bf"; ctx.font = "900 48px -apple-system, PingFang SC, sans-serif";
      ctx.fillText(`${tier.name}档  ·  答对 ${score.correct}/${score.total}`, 105, 493);
      const mainAvatar = [...categories].sort((a, b) => pct(score.cats[b.id].correct, score.cats[b.id].total) - pct(score.cats[a.id].correct, score.cats[a.id].total))[0].avatar;
      squareImage(ctx, images[mainAvatar], 744, 266, 215, 42);
      avatars.forEach((avatar, i) => squareImage(ctx, images[avatar.file], 135 + i * 163, 540, 86, 20));
      ctx.fillStyle = "#463a62"; ctx.font = "900 52px -apple-system, PingFang SC, sans-serif";
      ctx.fillText("四项能力小星图", 80, 755);
      categories.forEach((cat, i) => {
        const data = score.cats[cat.id];
        const y = 790 + i * 123;
        fillRound(ctx, 76, y, 928, 105, 26, "#ffffff");
        ctx.fillStyle = cat.ink; ctx.font = "900 35px -apple-system, PingFang SC, sans-serif";
        ctx.fillText(cat.name, 113, y + 65);
        ctx.fillStyle = "#726784"; ctx.font = "800 31px -apple-system, PingFang SC, sans-serif";
        ctx.fillText(`${data.correct} / ${data.total}`, 826, y + 65);
        fillRound(ctx, 430, y + 45, 340, 17, 9, "#ece6f4");
        const width = 340 * pct(data.correct, data.total) / 100;
        if (width > 0) fillRound(ctx, 430, y + 45, width, 17, 9, cat.bar);
      });
      fillRound(ctx, 76, 1299, 928, 96, 21, "#fff7e7");
      ctx.fillStyle = "#715f75"; ctx.font = "800 27px -apple-system, PingFang SC, sans-serif";
      ctx.fillText("✎ 趣味 B 档位 · 非模型实测等效 · 非智商测试", 110, 1341);
      ctx.font = "700 25px -apple-system, PingFang SC, sans-serif";
      ctx.fillText(`来试试：${new URL(".", location.href).href}`, 110, 1376, 850);
      const dataUrl = canvas.toDataURL("image/png");
      showPoster(dataUrl);
    } catch (error) {
      window.alert("海报生成失败。你可以直接截取结果页保存。" + (error?.message ? ` (${error.message})` : ""));
    } finally {
      button.disabled = false; button.textContent = "做一张可爱结果海报 ✦";
    }
  }
  function showPoster(dataUrl) {
    previousFocus = document.activeElement;
    modal.innerHTML = `<div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="poster-title"><button class="modal-close" id="modal-close" type="button" aria-label="关闭">×</button><h2 id="poster-title">小海报贴好啦 ✦</h2><p>手机可长按图片保存；也可以下载 PNG，再发给朋友。</p><img src="${dataUrl}" alt="你的趣味 B 档位结果海报"><div class="modal-actions"><a class="primary-button" id="download-poster" href="${dataUrl}" download="今天几B-呆萌监考团.png">下载 PNG</a><button class="secondary-button" id="share-poster" type="button" hidden>系统分享</button></div></div>`;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("modal-close").addEventListener("click", closePoster);
    modal.addEventListener("click", clickOutsideModal);
    document.getElementById("modal-close").focus();
    const share = document.getElementById("share-poster");
    if (navigator.share && navigator.canShare) {
      fetch(dataUrl).then((response) => response.blob()).then((blob) => {
        const file = new File([blob], "今天几B-呆萌监考团.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          share.hidden = false;
          share.addEventListener("click", async () => {
            try { await navigator.share({ files: [file], title: "今天几 B？" }); } catch (_) { /* User may cancel. */ }
          });
        }
      }).catch(() => {});
    }
  }
  function clickOutsideModal(event) { if (event.target === modal) closePoster(); }
  function closePoster() {
    modal.hidden = true; modal.innerHTML = ""; modal.removeEventListener("click", clickOutsideModal);
    document.body.style.overflow = "";
    previousFocus?.focus?.();
  }

  document.getElementById("brand-home").addEventListener("click", () => renderHome(true));
  document.addEventListener("keydown", (event) => {
    if (!modal.hidden) { if (event.key === "Escape") closePoster(); return; }
    if (currentView !== "quiz" || event.altKey || event.ctrlKey || event.metaKey) return;
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    if (/^[1-4]$/.test(event.key)) chooseAnswer(Number(event.key) - 1);
    if (event.key === "Enter" && active.answers[active.index] !== null && active.answers[active.index] !== -1 && document.activeElement?.tagName !== "BUTTON") nextQuestion();
  });

  if (QUESTIONS.length !== 80) {
    app.innerHTML = '<div class="error-box"><h1>题卡没有加载完整</h1><p>请重新打开页面；如果仍然失败，运行本机启动脚本后再试。</p></div>';
  } else {
    renderHome();
  }
})();
