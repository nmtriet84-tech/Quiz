// QuizGame App Logic
let manifest = [
    {
        "id": "English8Vocabulary",
        "title": "English 8 Vocabulary",
        "description": "Làm chủ 530+ từ vựng Tiếng Anh 8 phong cách Gen Z. Học cực nhanh, nhớ cực lâu!",
        "category": "Vocabulary",
        "icon": "📝",
        "stats": { "questions": 3642, "lessons": 530, "units": 8 },
        "path": "data/English8Vocabulary"
    },
    {
        "id": "English9Vocabulary",
        "title": "Từ vựng tiếng anh 9 Global Success",
        "description": "Chinh phục toàn bộ 269 từ vựng trọng tâm lớp 9 qua 1883 câu hỏi trắc nghiệm chuyên sâu.",
        "category": "Vocabulary",
        "icon": "🎓",
        "stats": { "questions": 1883, "lessons": 269, "units": 6 },
        "path": "data/English9Vocabulary"
    }
];
let userData = { name: "" };
let currentQuizData = [];
let currentVocabData = {}; // Bảng tra cứu từ vựng tối ưu
let currentInfo = {};
let filteredQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let totalQuestionsToPlay = 20;
let timerInterval;
let timeLeft = 60;

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

function updateSlogan(text) {
    const sloganEl = document.querySelector('.slogan');
    if (sloganEl) sloganEl.innerText = text;
}

function updateRandomSlogan() {
    const randomSlogan = slogans[Math.floor(Math.random() * slogans.length)];
    updateSlogan(randomSlogan);
}

// Elements
const screens = {
    loading: document.getElementById('loading-screen'),
    home: document.getElementById('home-screen'),
    intro: document.getElementById('intro-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen')
};

// Init app
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('manifest.json');
        if (response.ok) {
            manifest = await response.json();
        }
        renderHomeScreen();
    } catch (err) {
        console.warn("Chạy offline: Sử dụng manifest dự phòng.");
        renderHomeScreen();
    }
});

function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenId].classList.remove('hidden');
}

// Home Screen
function renderHomeScreen() {
    updateRandomSlogan(); // Đổi slogan ngẫu nhiên mỗi khi về Home
    const list = document.getElementById('quiz-set-list');
    list.innerHTML = '';
    
    manifest.forEach(set => {
        const card = document.createElement('div');
        card.className = 'quiz-card';
        card.innerHTML = `
            <div class="quiz-icon">${set.icon}</div>
            <h3>${set.title}</h3>
            <p>${set.stats.lessons} từ | ${set.stats.questions} câu</p>
        `;
        card.onclick = () => {
            const nameInput = document.getElementById('user-name-input');
            const nameValue = nameInput.value.trim();
            
            if (!nameValue) {
                alert("Vui lòng nhập Họ tên và Lớp của bạn trước khi chọn bộ thử thách nhé! 😊");
                nameInput.focus();
                nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            
            userData.name = nameValue;
            loadQuizSet(set);
        };
        list.appendChild(card);
    });
    
    showScreen('home');
}

// Load Quiz Set
async function loadQuizSet(set) {
    showScreen('loading');
    console.log(`Đang nạp bộ đề: ${set.id} từ đường dẫn: ${set.path}`);
    
    try {
        const [infoRes, quizRes] = await Promise.all([
            fetch(`${set.path}/${set.id}_info.json?v=${Date.now()}`),
            fetch(`${set.path}/${set.id}_quiz.json?v=${Date.now()}`)
        ]);
        
        if (!infoRes.ok || !quizRes.ok) {
            throw new Error(`Không thể tải file dữ liệu (Status: ${infoRes.status}/${quizRes.status})`);
        }

        currentInfo = await infoRes.json();
        const rawData = await quizRes.json();

        // Xử lý dữ liệu
        currentQuizData = [];
        currentVocabData = {};
        
        // Kiểm tra cấu trúc phân tầng (Hierarchy)
        if (Array.isArray(rawData) && rawData[0]?.questions) {
            rawData.forEach(item => {
                currentVocabData[item.id] = item.hint;
                
                // Phân loại Unit từ ID (e.g., "e9u1_artisan" -> "Unit 1")
                const unitMatch = item.id.match(/u(\d+)/);
                const unitLabel = unitMatch ? `Unit ${unitMatch[1]}` : "General";

                item.questions.forEach(q => {
                    currentQuizData.push({
                        ...q,
                        unit: unitLabel,
                        word: item.hint.word
                    });
                });
            });
        } else {
            // Định dạng phẳng hoặc cũ
            currentQuizData = rawData.questions || rawData;
            currentVocabData = rawData.vocabulary || null;
        }
        
        console.log(`Nạp thành công ${currentQuizData.length} câu hỏi.`);
        setupIntroScreen(set);
    } catch (err) {
        console.error("Lỗi nạp dữ liệu:", err);
        alert(`Lỗi hệ thống: ${err.message}\nVui lòng kiểm tra đường dẫn hoặc kết nối mạng.`);
        showScreen('home');
    }
}

function setupIntroScreen(set) {
    updateSlogan(`${userData.name} - ${set.title}`); // Thay slogan thành Tên - Bộ đề
    document.getElementById('current-quiz-title').innerText = set.title;
    document.getElementById('current-quiz-desc').innerText = set.description;
    
    // Render Unit Checkboxes
    const checkboxGroup = document.getElementById('unit-checkboxes');
    checkboxGroup.innerHTML = '';
    
    currentInfo.units.forEach(u => {
        const unitId = typeof u === 'object' ? u.id : u;
        const unitTitle = typeof u === 'object' ? u.title : u;
        
        const label = document.createElement('label');
        label.className = 'checkbox-item';
        label.innerHTML = `
            <input type="checkbox" name="unit" value="${unitId}" checked>
            <span>${unitTitle}</span>
        `;
        checkboxGroup.appendChild(label);
    });
    
    showScreen('intro');
}

// Start Game Logic
document.getElementById('btn-start-game').onclick = () => {
    const selectedUnits = Array.from(document.querySelectorAll('input[name="unit"]:checked')).map(cb => cb.value);
    
    if (selectedUnits.length === 0) {
        alert("Vui lòng chọn ít nhất một Unit để bắt đầu!");
        return;
    }
    
    filteredQuestions = pickBalancedQuestions(selectedUnits, 20);
    
    if (filteredQuestions.length < 20) {
        alert("Không đủ câu hỏi để tạo đề (Cần ít nhất 20 câu). Hãy chọn thêm Unit!");
        return;
    }
    
    startGame();
};

function pickBalancedQuestions(units, total) {
    const questionsByLevel = { 1: [], 2: [], 3: [], 4: [] };
    
    // Group questions by level and unit
    currentQuizData.forEach(q => {
        const parts = q.id.split('_');
        const unit = parts[0];
        const level = parts[parts.length - 1].charAt(1);
        
        // Lấy word chính xác (bao gồm cả dấu gạch dưới nếu là từ ghép)
        const word = parts.slice(1, -1).join('_');
        
        if (units.includes(unit)) {
            if (!questionsByLevel[level]) questionsByLevel[level] = [];
            questionsByLevel[level].push({ ...q, unit, word: word });
        }
    });

    let finalSelection = [];
    const questionsPerLevel = total / 4; // 20 / 4 = 5 câu mỗi level

    // Mỗi level cần bốc 5 câu
    for (let level = 1; level <= 4; level++) {
        let pool = questionsByLevel[level];
        if (pool.length < questionsPerLevel) return []; // Không đủ câu cho level này

        // Xáo trộn pool
        pool.sort(() => Math.random() - 0.5);

        // Thuật toán bốc đều theo Unit cho từng level
        let levelSelected = [];
        let unitIndex = 0;
        
        // Cố gắng bốc sao cho các Unit trong level này cũng được chia đều
        while (levelSelected.length < questionsPerLevel && pool.length > 0) {
            const targetUnit = units[unitIndex % units.length];
            const qIdx = pool.findIndex(q => q.unit === targetUnit);
            
            if (qIdx !== -1) {
                const picked = pool.splice(qIdx, 1)[0];
                // Kiểm tra xem từ vựng này đã có trong đề chưa để đảm bảo "mỗi từ 1 câu"
                if (!finalSelection.some(s => s.word === picked.word)) {
                    levelSelected.push(picked);
                } else {
                    // Nếu từ đã tồn tại, vẫn lấy nếu không còn lựa chọn nào khác của Unit đó
                    levelSelected.push(picked);
                }
            }
            unitIndex++;
            
            // Nếu đã duyệt hết các Unit mà chưa đủ câu, lấy đại trong pool còn lại
            if (unitIndex > units.length * 2 && levelSelected.length < questionsPerLevel) {
                levelSelected.push(pool.splice(0, 1)[0]);
            }
        }
        finalSelection = finalSelection.concat(levelSelected);
    }

    return finalSelection.sort(() => Math.random() - 0.5);
}

function startGame() {
    currentQuestionIndex = 0;
    score = 0;
    showScreen('game');
    renderQuestion();
}

function renderQuestion() {
    const q = filteredQuestions[currentQuestionIndex];
    
    // Reset UI
    document.getElementById('btn-next').disabled = true; // Khóa nút Tiếp cho đến khi trả lời
    document.getElementById('btn-next').style.opacity = "0.5";
    document.getElementById('hint-container').classList.add('hidden');
    document.getElementById('timer-box').classList.remove('warning');
    
    document.getElementById('question-counter').innerText = `Câu: ${currentQuestionIndex + 1}/${filteredQuestions.length}`;
    document.getElementById('score-display').innerText = `Điểm: ${score}`;
    document.getElementById('progress-bar').style.width = `${((currentQuestionIndex) / filteredQuestions.length) * 100}%`;
    
    document.getElementById('question-text').innerText = q.question;
    
    const optionsBox = document.getElementById('options-container');
    optionsBox.innerHTML = '';
    
    const originalOptions = [...q.options];
    const correctText = originalOptions[0];
    const shuffledOptions = [...originalOptions].sort(() => Math.random() - 0.5);
    
    shuffledOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(opt === correctText, btn);
        optionsBox.appendChild(btn);
    });

    startTimer(q.id);
}

function startTimer(questionId) {
    clearInterval(timerInterval);
    const level = questionId.split('_').pop().charAt(1);
    
    // Logic đếm ngược: L1=30s, L2=45s, L3&L4=60s
    if (level == 1) timeLeft = 30;
    else if (level == 2) timeLeft = 45;
    else timeLeft = 60;

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 5) {
            document.getElementById('timer-box').classList.add('warning');
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleAnswer(false, null); // Hết giờ coi như sai
        }
    }, 1000);
}

function updateTimerDisplay() {
    document.getElementById('timer-box').innerText = `${timeLeft}s`;
}

function handleAnswer(isCorrect, btn) {
    try {
        clearInterval(timerInterval);
        
        const btns = document.querySelectorAll('.option-btn');
        btns.forEach(b => b.disabled = true);
        
        const q = filteredQuestions[currentQuestionIndex];
        const correctText = q.options[0];

        if (isCorrect) {
            score++;
            if (btn) btn.classList.add('correct');
        } else {
            if (btn) btn.classList.add('wrong');
            btns.forEach(b => {
                if (b.innerText === correctText) b.classList.add('correct');
            });
            
            // LOGIC: SAI 1 TẶNG 2
            addExtraQuestions(q);
        }
        
        // HIỆN HINT (Tự động phân giải)
        const hint = getHintForQuestion(q);
        showHint(hint);
    } catch (err) {
        console.error("Lỗi trong handleAnswer:", err);
    } finally {
        // Cập nhật lại thanh tiến trình vì số lượng câu hỏi có thể đã tăng lên
        updateProgress();
        
        const nextBtn = document.getElementById('btn-next');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.style.opacity = "1";
        }
    }
}

function updateProgress() {
    document.getElementById('question-counter').innerText = `Câu: ${currentQuestionIndex + 1}/${filteredQuestions.length}`;
    document.getElementById('progress-bar').style.width = `${((currentQuestionIndex + 1) / filteredQuestions.length) * 100}%`;
}

function addExtraQuestions(failedQuestion) {
    const parts = failedQuestion.id.split('_');
    const unit = failedQuestion.unit;
    const level = parseInt(parts[parts.length - 1].charAt(1));

    // Tìm các câu hỏi chưa có trong filteredQuestions
    const existingIds = new Set(filteredQuestions.map(q => q.id));
    
    // Lọc các câu cùng Unit, độ khó >= level hiện tại
    const pool = currentQuizData.filter(q => {
        const qParts = q.id.split('_');
        const qUnit = qParts[0];
        const qLevel = parseInt(qParts[qParts.length - 1].charAt(1));
        return qUnit === unit && qLevel >= level && !existingIds.has(q.id);
    });

    // Lấy ngẫu nhiên 2 câu
    const extras = pool.sort(() => Math.random() - 0.5).slice(0, 2);
    
    if (extras.length > 0) {
        // Gán thêm thông tin cần thiết và đẩy vào danh sách
        const processedExtras = extras.map(q => {
            const qParts = q.id.split('_');
            return { ...q, unit: qParts[0], word: qParts.slice(1, -1).join('_') };
        });
        filteredQuestions.push(...processedExtras);
        console.log(`Đã thêm ${processedExtras.length} câu hỏi mới do trả lời sai.`);
    }
}

// Hàm chuẩn hóa để so khớp từ vựng (loại bỏ _ và khoảng trắng, viết thường)
function normalizeKey(str) {
    return str ? str.toLowerCase().replace(/[_\s-]/g, '') : '';
}

function getHintForQuestion(q) {
    // 1. Nếu có bảng vocab tập trung (Định dạng mới)
    if (currentVocabData) {
        const wordId = q.id.split('_').slice(0, -1).join('_');
        return currentVocabData[wordId];
    }
    // 2. Nếu không, dùng hint tích hợp (Định dạng cũ)
    return q.lesson_hint;
}

function showHint(hint) {
    const hintContainer = document.getElementById('hint-container');
    const hintText = document.getElementById('hint-text');
    
    if (hint) {
        // Hỗ trợ cả định dạng mới (phẳng) và định dạng cũ (nesting meanings)
        const word = hint.word || "";
        const phonetics = hint.phonetics || "";
        const type = hint.type || (hint.meanings ? hint.meanings[0].pos : "Vocab");
        const meaning_vn = hint.meaning || (hint.meanings ? hint.meanings[0].meaning_vn : "");
        const example = hint.example || (hint.meanings && hint.meanings[0].examples ? hint.meanings[0].examples[0] : "");
        
        hintText.innerHTML = `
            <div class="hint-header">
                <span class="hint-word">${word}</span>
                <span class="hint-ipa">${phonetics}</span>
            </div>
            <div class="hint-body">
                <span class="hint-type">[${type}]</span> ${meaning_vn}
                <div class="hint-example">${example ? '<em>Ví dụ: ' + example + '</em>' : ''}</div>
            </div>
        `;
        hintContainer.classList.remove('hidden');
    } else {
        hintContainer.classList.add('hidden');
    }
}

// Controls
document.getElementById('btn-next').onclick = () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < filteredQuestions.length) {
        renderQuestion();
    } else {
        showResult();
    }
};

document.getElementById('btn-finish').onclick = () => {
    if (confirm("Bạn có chắc chắn muốn nộp bài sớm không?")) {
        clearInterval(timerInterval);
        showResult();
    }
};

function showResult() {
    // Tính điểm hệ 10: (Số câu đúng / Tổng số câu) * 10
    const finalScore = (score / filteredQuestions.length) * 10;
    
    // Hiển thị tên người chơi và thông điệp cá nhân hóa
    document.getElementById('result-title').innerHTML = `Chúc mừng, <br><span style="color: var(--accent-color)">${userData.name}</span>!`;
    document.getElementById('final-score-val').innerText = finalScore.toFixed(2);
    showScreen('result');
}

// Navigation
document.querySelector('.btn-back').onclick = () => showScreen('home');
document.getElementById('btn-home').onclick = () => showScreen('home');
document.getElementById('btn-replay').onclick = () => startGame();
