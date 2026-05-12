// QuizGame App Logic
let manifest = [
    createFallbackManifestItem("English8Vocabulary", "Từ vựng tiếng Anh 8", "📘", 3731, 533, 8),
    createFallbackManifestItem("English9Vocabulary", "Từ vựng tiếng Anh 9", "🎓", 1883, 269, 6)
];

let userData = { name: "" };
let currentQuizData = [];
let currentVocabData = {};
let currentInfo = {};
let filteredQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let currentUnitLabels = {};
let gameHistory = []; // Lưu lịch sử làm bài
let timerInterval;
let timeLeft = 60;
let correctCount = 0;
let wrongCount = 0;

const surrenderTexts = ["Đầu hàng 🏳️", "Em xin thua 🏳️", "Em xin dừng 🏳️", "Thôi em chịu 🏳️"];

const QUESTIONS_PER_GAME = 20;
const LEADERBOARD_URL = "https://script.google.com/macros/s/AKfycbxwb3BJGz73Tx8sEb-ihuI5rFmXbuFmSXmP1GfGCKulV5lrfJCNGxzbE4XDdCqTEk6yVw/exec";

let currentQuizSet = null;
let selectedUnitsForGame = [];
let gameStartedAt = 0;
let currentQuizMode = "normal";
let currentLeaderboardMode = "normal";

const slogans = [
    "Học hết mình, chơi nhiệt tình - Tự tin chinh phục tiếng Anh!",
    "Chinh phục từ vựng, mở cửa tương lai!",
    "Chơi mà học, học mà chơi - Đỉnh cao tri thức!",
    "Đừng để tiếng Anh làm khó bạn, hãy làm khó tiếng Anh!",
    "Mỗi ngày một ít, tích tiểu thành đại!",
    "Học tiếng Anh phong cách Gen Z - Cực chất, cực cool!",
    "Trùm từ vựng là đây, bạn đã sẵn sàng?",
    "Vượt qua thử thách, khẳng định bản thân!",
    "Tiếng Anh là chuyện nhỏ, quan trọng là phải vui!",
    "Học cùng QuizGame - Không lo nhàm chán!"
];

const screens = {
    loading: document.getElementById("loading-screen"),
    home: document.getElementById("home-screen"),
    intro: document.getElementById("intro-screen"),
    game: document.getElementById("game-screen"),
    result: document.getElementById("result-screen")
};

function createFallbackManifestItem(id, title, icon, questions, lessons, units) {
    return {
        id,
        title,
        description: title,
        category: "Vocabulary",
        icon,
        stats: { questions, lessons, units },
        path: `data/${id}`
    };
}

window.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("manifest.json");
        if (response.ok) {
            const loadedManifest = await response.json();
            manifest = loadedManifest;
        }
    } catch (err) {
        console.warn("Không tải được manifest, dùng cấu hình dự phòng.", err);
    }

    renderHomeScreen();
});

function showScreen(screenId) {
    Object.values(screens).forEach(screen => screen.classList.add("hidden"));
    screens[screenId].classList.remove("hidden");
}

function updateSlogan(text) {
    const sloganEl = document.querySelector(".slogan");
    if (sloganEl) sloganEl.innerText = text;
}

function updateRandomSlogan() {
    updateSlogan(slogans[Math.floor(Math.random() * slogans.length)]);
}

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function unitCodeFromId(id) {
    return id.match(/^(e\d+u\d+)/)?.[1] || id.split("_")[0];
}

function unitCodeFromLabel(value) {
    if (/^e\d+u\d+$/i.test(String(value))) {
        return String(value).toLowerCase();
    }

    return String(value).toLowerCase();
}

function unitLabelFromCode(code) {
    const unitMatch = code.match(/u(\d+)$/i);
    return unitMatch ? `Unit ${unitMatch[1]}` : code;
}

function questionMeta(questionId) {
    const match = questionId.match(/_([A-Z])(\d)(\d{2})$/);
    return {
        type: normalizeQuestionType(match?.[1] || "C"),
        level: Number(match?.[2] || 1)
    };
}

function normalizeQuestionType(type) {
    return type === "P" ? "S" : type;
}

function modeSuffix(mode) {
    return mode === "hard" ? "kho" : "thuong";
}

function modeLabel(mode) {
    return mode === "hard" ? "Đề khó" : "Đề thường";
}

function leaderboardQuizId(baseQuizId, mode) {
    return `${baseQuizId}_${modeSuffix(mode)}`;
}

function startOfCurrentWeek(date = new Date()) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start;
}

function isInCurrentWeek(value) {
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) return false;
    const start = startOfCurrentWeek();
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return timestamp >= start && timestamp < end;
}

function wordIdFromQuestionId(questionId) {
    return questionId.split("_").slice(0, -1).join("_");
}

function renderHomeScreen() {
    updateRandomSlogan();
    const list = document.getElementById("quiz-set-list");
    list.innerHTML = "";

    manifest.forEach(set => {
        const card = document.createElement("div");
        card.className = "quiz-card";
        card.innerHTML = `
            <div class="quiz-icon">${set.icon}</div>
            <h3>${set.title}</h3>
            <p>${set.stats.lessons} từ | ${set.stats.questions} câu</p>
        `;
        card.onclick = () => {
            const nameInput = document.getElementById("user-name-input");
            const nameValue = nameInput.value.trim();

            if (!nameValue) {
                alert("Vui lòng nhập Họ tên và Lớp trước khi chọn bộ thử thách nhé!");
                nameInput.focus();
                nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
            }

            userData.name = nameValue;
            loadQuizSet(set);
        };
        list.appendChild(card);
    });

    showScreen("home");
}

async function loadQuizSet(set) {
    showScreen("loading");

    try {
        const [infoRes, quizRes] = await Promise.all([
            fetch(`${set.path}/${set.id}_info.json?v=${Date.now()}`),
            fetch(`${set.path}/${set.id}_quiz.json?v=${Date.now()}`)
        ]);

        if (!infoRes.ok || !quizRes.ok) {
            throw new Error(`Không thể tải file dữ liệu (${infoRes.status}/${quizRes.status})`);
        }

        currentInfo = await infoRes.json();
        const rawData = await quizRes.json();
        normalizeQuizData(rawData);
        setupIntroScreen(set);
    } catch (err) {
        console.error("Lỗi nạp dữ liệu:", err);
        alert(`Lỗi tải dữ liệu: ${err.message}\nHãy chạy qua web server hoặc kiểm tra lại đường dẫn data.`);
        showScreen("home");
    }
}

function normalizeQuizData(rawData) {
    currentQuizData = [];
    currentVocabData = {};
    currentUnitLabels = {};

    if (Array.isArray(rawData) && rawData[0]?.questions) {
        rawData.forEach(item => {
            const unitCode = unitCodeFromId(item.id);
            const unitNumber = unitCode.match(/u(\d+)$/i)?.[1];
            if (unitNumber && !currentUnitLabels[unitCode]) {
                currentUnitLabels[unitCode] = `Unit ${unitNumber}`;
            }
            currentVocabData[item.id] = item.hint;

            item.questions.forEach(question => {
                const meta = questionMeta(question.id);
                currentQuizData.push({
                    ...question,
                    unit: unitCode,
                    unitCode,
                    unitLabel: unitLabelFromCode(unitCode),
                    wordId: item.id,
                    word: item.hint?.word || item.id,
                    type: meta.type,
                    level: meta.level
                });
            });
        });
    } else {
        const questions = rawData.questions || rawData;
        currentQuizData = questions.map(question => {
            const unitCode = unitCodeFromId(question.id);
            const meta = questionMeta(question.id);
            const unitNumber = unitCode.match(/u(\d+)$/i)?.[1];
            if (unitNumber && !currentUnitLabels[unitCode]) {
                currentUnitLabels[unitCode] = `Unit ${unitNumber}`;
            }
            return {
                ...question,
                unit: unitCode,
                unitCode,
                unitLabel: unitLabelFromCode(unitCode),
                wordId: wordIdFromQuestionId(question.id),
                word: wordIdFromQuestionId(question.id),
                type: meta.type,
                level: meta.level
            };
        });
        currentVocabData = rawData.vocabulary || {};
    }

    console.log(`Đã nạp ${currentQuizData.length} câu hỏi.`);
}

function setupIntroScreen(set) {
    currentQuizSet = set;
    currentQuizMode = "normal";
    currentLeaderboardMode = "normal";
    updateLeaderboardTabs();
    updateSlogan(`${userData.name} - ${set.title}`);
    document.getElementById("current-quiz-desc").innerText = set.description;

    const chipGroup = document.getElementById("unit-checkboxes");
    chipGroup.innerHTML = "";
    chipGroup.className = "chip-container";

    const units = getUnitsForIntro();
    
    // Add "All" button
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "chip all-chip";
    allBtn.innerText = "Tất cả 📚";
    allBtn.onclick = () => {
        const isActivating = !allBtn.classList.contains("active");
        allBtn.classList.toggle("active", isActivating);
        document.querySelectorAll(".unit-chip").forEach(c => c.classList.toggle("active", isActivating));
    };
    chipGroup.appendChild(allBtn);

    units.forEach(unit => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip unit-chip";
        btn.dataset.unitId = unit.id;
        btn.innerText = unit.title;
        
        // Default ONLY Unit 1 to active (avoiding Unit 10, 11, 12...)
        const isUnit1 = /^unit\s+1$/i.test(unit.title.trim()) || unit.id.toLowerCase().endsWith("u1");
        if (isUnit1) {
            btn.classList.add("active");
        }

        btn.onclick = () => {
            btn.classList.toggle("active");
            if (!btn.classList.contains("active")) {
                allBtn.classList.remove("active");
            }
        };
        chipGroup.appendChild(btn);
    });

    showScreen("intro");
    loadLeaderboard(set.id, currentLeaderboardMode);
}

function getUnitsForIntro() {
    if (Array.isArray(currentInfo.units) && currentInfo.units.length > 0) {
        return currentInfo.units.map(unit => {
            const rawId = typeof unit === "object" ? unit.id : unit;
            const title = typeof unit === "object" ? unit.title : String(unit);
            const explicitCode = unitCodeFromLabel(rawId);
            const unitNumber = title.match(/unit\s*(\d+)/i)?.[1] || String(rawId).match(/unit\s*(\d+)/i)?.[1];
            const unitCode = currentQuizData.some(q => q.unitCode === explicitCode)
                ? explicitCode
                : findUnitCodeByNumber(unitNumber) || explicitCode;
            const displayTitle = /^unit\s*\d+/i.test(title)
                ? title
                : `${unitLabelFromCode(unitCode)} - ${title}`;

            currentUnitLabels[unitCode] = displayTitle;
            return { id: unitCode, title: displayTitle };
        });
    }

    return Object.keys(currentUnitLabels)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map(unitCode => ({ id: unitCode, title: currentUnitLabels[unitCode] || unitLabelFromCode(unitCode) }));
}

function findUnitCodeByNumber(unitNumber) {
    if (!unitNumber) return "";
    return Object.keys(currentUnitLabels).find(unitCode => {
        return unitCode.match(/u(\d+)$/i)?.[1] === String(unitNumber);
    }) || "";
}

function handleStartClick(mode) {
    const selectedUnits = Array.from(document.querySelectorAll('.unit-chip.active')).map(btn => btn.dataset.unitId);

    if (selectedUnits.length === 0) {
        alert("Vui lòng chọn ít nhất một Unit để bắt đầu!");
        return;
    }

    currentQuizMode = mode;

    filteredQuestions = QuizEngine.generateQuiz({
        questions: currentQuizData,
        selectedUnits,
        totalQuestions: QUESTIONS_PER_GAME,
        mode
    });

    if (filteredQuestions.length < QUESTIONS_PER_GAME) {
        alert(`Không đủ câu hỏi để tạo đề ${QUESTIONS_PER_GAME} câu. Hãy chọn thêm Unit!`);
        return;
    }

    selectedUnitsForGame = selectedUnits;
    startGame();
}

document.getElementById("btn-start-normal").onclick = () => handleStartClick("normal");
document.getElementById("btn-start-hard").onclick = () => handleStartClick("hard");

function startGame() {
    currentQuestionIndex = 0;
    score = 0;
    correctCount = 0;
    wrongCount = 0;
    gameHistory = [];
    gameStartedAt = Date.now();
    
    // Randomize surrender button text
    const finishBtn = document.getElementById("btn-finish");
    if (finishBtn) {
        finishBtn.innerText = surrenderTexts[Math.floor(Math.random() * surrenderTexts.length)];
    }
    
    showScreen("game");
    renderQuestion();
}

function renderQuestion() {
    if (!filteredQuestions || filteredQuestions.length === 0) {
        console.error("No questions found!");
        return;
    }
    
    const q = filteredQuestions[currentQuestionIndex];
    if (!q) return;

    // Safety checks for elements
    const nextBtn = document.getElementById("btn-next");
    const hintBox = document.getElementById("hint-container");
    const timerBox = document.getElementById("timer-box");
    const qCounter = document.getElementById("question-counter");
    const cCount = document.getElementById("correct-count");
    const wCount = document.getElementById("wrong-count");
    const sDisplay = document.getElementById("score-display");
    const qText = document.getElementById("question-text");

    if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = "0.5";
    }
    if (hintBox) hintBox.classList.add("hidden");
    if (timerBox) timerBox.classList.remove("warning");

    if (qCounter) qCounter.innerText = `Câu: ${currentQuestionIndex + 1}/${filteredQuestions.length}`;
    if (cCount) cCount.innerText = correctCount;
    if (wCount) wCount.innerText = wrongCount;
    if (sDisplay) sDisplay.innerText = `Điểm: ${formattedScoreOnScale10()}`;
    if (qText) qText.innerText = q.question;

    const optionsBox = document.getElementById("options-container");
    if (optionsBox) {
        optionsBox.innerHTML = "";
        const correctText = q.options[0];
        shuffle(q.options).forEach(option => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            btn.innerText = option;
            btn.onclick = () => handleAnswer(option === correctText, btn);
            optionsBox.appendChild(btn);
        });
    }

    startTimer(q.level);
}

function startTimer(level) {
    clearInterval(timerInterval);
    timeLeft = level === 1 ? 30 : level === 2 ? 45 : 60;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 5) {
            document.getElementById("timer-box").classList.add("warning");
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleAnswer(false, null);
        }
    }, 1000);
}

function updateTimerDisplay() {
    document.getElementById("timer-box").innerText = `${timeLeft}s`;
}

function handleAnswer(isCorrect, btn) {
    clearInterval(timerInterval);

    const buttons = document.querySelectorAll(".option-btn");
    buttons.forEach(button => {
        button.disabled = true;
    });

    const q = filteredQuestions[currentQuestionIndex];
    
    if (isCorrect) correctCount++;
    else wrongCount++;
    
    document.getElementById("correct-count").innerText = correctCount;
    document.getElementById("wrong-count").innerText = wrongCount;

    const correctText = q.options[0];
    const userAnswer = btn ? btn.innerText : "(Hết giờ)";

    // Lưu vào lịch sử
    gameHistory.push({
        question: q.question,
        userAnswer: userAnswer,
        correctAnswer: correctText,
        isCorrect: isCorrect,
        explanation: q.explanation || ""
    });

    if (isCorrect) {
        score++;
        if (btn) btn.classList.add("correct");
    } else {
        if (btn) btn.classList.add("wrong");
        buttons.forEach(button => {
            if (button.innerText === correctText) button.classList.add("correct");
        });
        addExtraQuestions(q);
    }

    showHint(getHintForQuestion(q), q.explanation);
    updateProgress();

    const nextBtn = document.getElementById("btn-next");
    if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.style.opacity = "1";
    }
}

function updateProgress() {
    document.getElementById("question-counter").innerText = `Câu: ${currentQuestionIndex + 1}/${filteredQuestions.length}`;
    document.getElementById("score-display").innerText = `Điểm: ${formattedScoreOnScale10()}`;
}

function addExtraQuestions(failedQuestion) {
    const existingIds = new Set(filteredQuestions.map(q => q.id));
    const pool = currentQuizData.filter(q => {
        return q.unitCode === failedQuestion.unitCode
            && q.level >= failedQuestion.level
            && !existingIds.has(q.id);
    });

    const extras = shuffle(pool).slice(0, 2);
    filteredQuestions.push(...extras);
}

function getHintForQuestion(q) {
    return currentVocabData[q.wordId] || q.lesson_hint || null;
}

function showHint(hint, explanation) {
    const hintContainer = document.getElementById("hint-container");
    const hintText = document.getElementById("hint-text");

    if (!hint && !explanation) {
        hintContainer.classList.add("hidden");
        return;
    }

    let html = "";
    
    if (hint) {
        const word = hint.word || "";
        const phonetics = hint.phonetics || "";
        const type = hint.type || "Grammar";
        const meaning = hint.meaning || "";
        const example = hint.example || "";
        
        html += `
            <div class="hint-header">
                <span class="hint-word">${word}</span>
                <span class="hint-ipa">${phonetics}</span>
            </div>
            <div class="hint-body">
                <span class="hint-type">[${type}]</span> ${meaning}
                <div class="hint-example">${example ? `<em>Ví dụ: ${example}</em>` : ""}</div>
            </div>
        `;
    }

    if (explanation) {
        html += `
            <div class="explanation-box">
                <strong>📝 Giải thích:</strong> ${explanation}
            </div>
        `;
    }

    hintText.innerHTML = html;
    hintContainer.classList.remove("hidden");
}

function updateLeaderboardTabs() {
    document.querySelectorAll(".leaderboard-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.leaderboardMode === currentLeaderboardMode);
    });
}

function loadLeaderboard(quizId, mode = currentLeaderboardMode) {
    const status = document.getElementById("leaderboard-status");
    const body = document.getElementById("leaderboard-body");
    if (!status || !body) return;

    currentLeaderboardMode = mode;
    updateLeaderboardTabs();

    const params = new URLSearchParams({
        action: "top",
        quizId,
        bank: quizId,
        mode,
        period: "week",
        limit: "5000",
    });

    status.innerText = `Đang tải TOP 10 ${modeLabel(mode).toLowerCase()} trong tuần...`;
    body.innerHTML = "";

    fetch(`${LEADERBOARD_URL}?${params.toString()}`, { cache: "no-store" })
        .then(response => response.text())
        .then(text => renderLeaderboard(parseLeaderboardResponse(text)))
        .catch(err => {
            console.warn("Không tải được bảng xếp hạng:", err);
            status.innerText = "Chưa tải được TOP 10. Hãy kiểm tra Web App đã deploy quyền Anyone và URL có đúng không.";
        });
}

function renderLeaderboard(payload) {
    const status = document.getElementById("leaderboard-status");
    const body = document.getElementById("leaderboard-body");
    const targetQuizId = currentQuizSet
        ? leaderboardQuizId(currentQuizSet.id, currentLeaderboardMode)
        : "";
    const scores = rankLeaderboardRows(
        normalizeLeaderboardRows(payload?.scores || payload?.top10 || [])
            .filter(row => row.quizId === targetQuizId)
            .filter(row => isInCurrentWeek(row.timestamp))
    ).slice(0, 10);

    body.innerHTML = "";

    if (!payload?.ok) {
        status.innerText = payload?.error || "Không tải được bảng xếp hạng.";
        return;
    }

    if (scores.length === 0) {
        status.innerText = `Chưa có điểm ${modeLabel(currentLeaderboardMode).toLowerCase()} trong tuần này. Bạn có thể là người mở bảng!`;
        body.innerHTML = `<tr><td class="leaderboard-empty" colspan="6">Chưa có dữ liệu</td></tr>`;
        return;
    }

    status.innerText = `Đang hiển thị ${scores.length} kết quả cao nhất của ${modeLabel(currentLeaderboardMode).toLowerCase()} trong tuần.`;
    body.innerHTML = scores.map(row => `
        <tr>
            <td>${row.rank || ""}</td>
            <td>${escapeHtml(row.playerName || "")}</td>
            <td>${escapeHtml(row.className || "")}</td>
            <td>${Number(row.score || 0).toFixed(2)}</td>
            <td>${Number(row.correct || 0)}/${Number(row.total || 0)}</td>
            <td>${formatDuration(row.durationSeconds || 0)}</td>
        </tr>
    `).join("");
}

function parseLeaderboardResponse(text) {
    const trimmed = text.trim();
    const jsonpMatch = trimmed.match(/^[\w.$]+\((.*)\);?$/s);
    return JSON.parse(jsonpMatch ? jsonpMatch[1] : trimmed);
}

function normalizeLeaderboardRows(rows) {
    return rows.map((row, index) => ({
        rank: row.rank ?? row.hang ?? row.rankNo ?? index + 1,
        timestamp: row.timestamp ?? row.timeStamp ?? row.createdAt ?? "",
        quizId: row.quizId ?? row.bank ?? "",
        playerName: row.playerName ?? row.name ?? row.student ?? row.ten ?? "",
        className: row.className ?? row.class ?? row.lop ?? "",
        score: row.score ?? row.point ?? row.diem ?? 0,
        correct: row.correct ?? row.correctCount ?? row.dung ?? 0,
        total: row.total ?? row.totalQuestions ?? row.tong ?? 0,
        percent: row.percent ?? row.rate ?? 0,
        durationSeconds: row.durationSeconds ?? row.duration ?? row.time ?? 0
    }));
}

function rankLeaderboardRows(rows) {
    const sorted = [...rows].sort((a, b) => {
        return Number(b.score || 0) - Number(a.score || 0)
            || Number(b.percent || 0) - Number(a.percent || 0)
            || Number(b.correct || 0) - Number(a.correct || 0)
            || Number(a.durationSeconds || 0) - Number(b.durationSeconds || 0)
            || new Date(a.timestamp) - new Date(b.timestamp);
    });

    let currentRank = 0;
    let previousKey = "";
    return sorted.map((row, index) => {
        const key = [
            Number(row.score || 0),
            Number(row.percent || 0),
            Number(row.correct || 0),
            Number(row.durationSeconds || 0)
        ].join("|");

        if (key !== previousKey) {
            currentRank = index + 1;
            previousKey = key;
        }

        return { ...row, rank: currentRank };
    });
}

function splitPlayerInfo(value) {
    const parts = String(value || "").split(/\s+-\s+/);
    return {
        playerName: (parts[0] || value || "").trim(),
        className: parts.slice(1).join(" - ").trim()
    };
}

function selectedUnitLabels() {
    return selectedUnitsForGame.map(unit => currentUnitLabels[unit] || unitLabelFromCode(unit)).join(", ");
}

function scoreOnScale10() {
    const total = filteredQuestions.length || QUESTIONS_PER_GAME;
    return total ? (score / total) * 10 : 0;
}

function formattedScoreOnScale10() {
    return scoreOnScale10().toFixed(2);
}

function buildResultStats(finalScore) {
    const player = splitPlayerInfo(userData.name);
    const total = filteredQuestions.length;
    const percent = total ? (score / total) * 100 : 0;
    const durationSeconds = gameStartedAt ? Math.round((Date.now() - gameStartedAt) / 1000) : 0;

    return {
        timestamp: new Date(),
        quizId: leaderboardQuizId(currentQuizSet?.id || "", currentQuizMode),
        baseQuizId: currentQuizSet?.id || "",
        quizMode: currentQuizMode,
        quizModeLabel: modeLabel(currentQuizMode),
        quizTitle: currentQuizSet?.title || "",
        playerName: player.playerName,
        className: player.className,
        units: selectedUnitLabels(),
        score: Number(finalScore.toFixed(2)),
        correct: score,
        total,
        percent: Number(percent.toFixed(2)),
        durationSeconds,
        extraQuestions: Math.max(0, total - QUESTIONS_PER_GAME),
        history: [...gameHistory]
    };
}

function saveScore(stats) {
    const status = document.getElementById("save-score-status");
    if (!currentQuizSet || !status) return;

    const payload = new URLSearchParams({
        action: "submit",
        quizId: stats.quizId,
        bank: stats.baseQuizId,
        baseQuizId: stats.baseQuizId,
        mode: stats.quizMode,
        quizMode: stats.quizMode,
        quizTitle: `${stats.quizTitle} - ${stats.quizModeLabel}`,
        playerName: stats.playerName,
        className: stats.className,
        units: stats.units,
        score: stats.score.toFixed(2),
        correct: String(stats.correct),
        total: String(stats.total),
        percent: stats.percent.toFixed(2),
        durationSeconds: String(stats.durationSeconds),
        extraQuestions: String(stats.extraQuestions),
        userAgent: navigator.userAgent,
        nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}`
    });

    status.innerText = "Đang lưu điểm lên bảng xếp hạng...";

    fetch(LEADERBOARD_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: payload.toString()
    })
        .then(() => {
            status.innerText = "Đã gửi điểm lên bảng xếp hạng.";
            loadLeaderboard(currentQuizSet.id, stats.quizMode);
        })
        .catch(err => {
            console.warn("Không gửi được điểm:", err);
            status.innerText = "Chưa gửi được điểm. Kiểm tra lại Apps Script Web App.";
        });
}

function showSummaryModal(stats) {
    const modal = document.getElementById("summary-modal");
    const grid = document.getElementById("summary-grid");
    if (!modal || !grid) return;

    // Clear old grid content
    grid.innerHTML = "";

    // 1. Highlights (Score, Correct, Time)
    const highlights = document.createElement("div");
    highlights.className = "summary-highlights";
    highlights.innerHTML = `
        <div class="highlight-item">
            <span class="highlight-label">ĐIỂM SỐ</span>
            <span class="highlight-value">${stats.score.toFixed(2)}</span>
        </div>
        <div class="highlight-item">
            <span class="highlight-label">ĐÚNG</span>
            <span class="highlight-value">${stats.correct}/${stats.total}</span>
        </div>
        <div class="highlight-item">
            <span class="highlight-label">THỜI GIAN</span>
            <span class="highlight-value">${formatDuration(stats.durationSeconds)}</span>
        </div>
    `;
    grid.appendChild(highlights);

    // 2. Meta Info (Name, Units)
    const meta = document.createElement("div");
    meta.className = "summary-meta";
    meta.innerHTML = `
        <div class="meta-row"><span class="meta-label">Thí sinh:</span> <span>${escapeHtml(stats.playerName)}</span></div>
        <div class="meta-row"><span class="meta-label">Lớp:</span> <span>${escapeHtml(stats.className || "---")}</span></div>
        <div class="meta-row" style="grid-column: 1 / -1;"><span class="meta-label">Bài học:</span> <span>${escapeHtml(stats.units || "Tất cả")}</span></div>
    `;
    grid.appendChild(meta);

    // 3. Review List
    if (stats.history && stats.history.length > 0) {
        const reviewTitle = document.createElement("h3");
        reviewTitle.className = "review-title";
        reviewTitle.innerText = "🔍 Xem lại các câu đã làm:";
        grid.appendChild(reviewTitle);

        const reviewList = document.createElement("div");
        reviewList.className = "review-list";
        reviewList.innerHTML = stats.history.map((item, idx) => `
            <div class="review-item ${item.isCorrect ? "correct" : "wrong"}">
                <div class="review-q"><strong>${idx + 1}.</strong> ${escapeHtml(item.question)}</div>
                <div class="review-a">
                    ${item.isCorrect ? `✅ <strong class="correct-ans">${escapeHtml(item.correctAnswer)}</strong>` : 
                    `❌ <strong class="user-ans">${escapeHtml(item.userAnswer)}</strong> | ✅ <strong class="correct-ans">${escapeHtml(item.correctAnswer)}</strong>`}
                </div>
                ${item.explanation ? `<div class="review-explanation">💡 <strong>Giải thích:</strong> ${escapeHtml(item.explanation)}</div>` : ""}
            </div>
        `).join("");
        grid.appendChild(reviewList);
    }

    modal.classList.remove("hidden");
}

function closeSummaryModal() {
    document.getElementById("summary-modal")?.classList.add("hidden");
}

function formatDuration(seconds) {
    const total = Number(seconds) || 0;
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return minutes > 0 ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}s`;
}

function formatDateTime(date) {
    return new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).format(date);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.getElementById("btn-next").onclick = () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < filteredQuestions.length) {
        renderQuestion();
    } else {
        showResult();
    }
};

document.getElementById("btn-finish").onclick = () => {
    if (confirm("Bạn có chắc chắn muốn nộp bài sớm không?")) {
        clearInterval(timerInterval);
        showResult();
    }
};

function showResult() {
    clearInterval(timerInterval);
    const finalScore = scoreOnScale10();
    const stats = buildResultStats(finalScore);
    document.getElementById("result-title").innerHTML = `Chúc mừng,<br><span style="color: var(--accent-color)">${userData.name}</span>!`;
    document.getElementById("final-score-val").innerText = finalScore.toFixed(2);
    showSummaryModal(stats);
    saveScore(stats);
    showScreen("result");
}

document.querySelector(".btn-back").onclick = () => showScreen("home");
document.getElementById("btn-home").onclick = () => {
    closeSummaryModal();
    showScreen("home");
};
document.getElementById("btn-replay").onclick = () => {
    closeSummaryModal();
    startGame();
};
document.getElementById("btn-refresh-leaderboard").onclick = () => {
    if (currentQuizSet) loadLeaderboard(currentQuizSet.id);
};
document.querySelectorAll(".leaderboard-tab").forEach(tab => {
    tab.onclick = () => {
        if (!currentQuizSet) return;
        loadLeaderboard(currentQuizSet.id, tab.dataset.leaderboardMode || "normal");
    };
});
document.getElementById("btn-close-summary").onclick = closeSummaryModal;
document.getElementById("btn-summary-home").onclick = () => {
    closeSummaryModal();
    showScreen("home");
};
document.getElementById("btn-summary-replay").onclick = () => {
    closeSummaryModal();
    startGame();
};
document.getElementById("summary-modal").onclick = event => {
    if (event.target.id === "summary-modal") closeSummaryModal();
};
