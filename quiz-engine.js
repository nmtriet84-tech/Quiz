(function () {
    const TYPE_RATIOS = {
        normal: { M: 0.7, C: 0.2, S: 0.1 },
        hard: { M: 0.2, C: 0.6, S: 0.2 }
    };
    const TYPE_ORDER = ["M", "C", "S"];

    function generateQuiz({ questions, selectedUnits, totalQuestions, mode = "normal", seed = "" }) {
        const random = seed ? seededRandom(hashString(seed)) : Math.random;
        const units = selectedUnits && selectedUnits.length
            ? [...selectedUnits]
            : unique(questions.map(q => q.unitCode));
        const unitQuota = allocateEvenly(totalQuestions, units, random);
        const typeQuota = allocateByRatio(totalQuestions, TYPE_RATIOS[mode] || TYPE_RATIOS.normal);
        const typeSlots = shuffleWithRandom(expandPlan(typeQuota), random);
        const state = {
            selected: [],
            usedIds: new Set(),
            usedTypeWords: { M: new Set(), S: new Set() }
        };

        units.forEach(unitCode => {
            const count = unitQuota.get(unitCode) || 0;
            const unitQuestions = questions.filter(q => q.unitCode === unitCode);
            const unitWords = unique(unitQuestions.map(q => q.wordId));
            const wordSlots = makeWordSlots(unitWords, count, random);

            for (let i = 0; i < count; i += 1) {
                const preferredType = typeSlots.shift() || pickMostNeededType(typeQuota, state.selected);
                const wordId = wordSlots[i];
                const picked = pickQuestion(unitQuestions, wordId, preferredType, state, random)
                    || pickQuestion(unitQuestions, wordId, null, state, random)
                    || pickQuestion(unitQuestions, null, preferredType, state, random)
                    || pickQuestion(unitQuestions, null, null, state, random);

                if (picked) takeQuestion(picked, state);
            }
        });

        if (state.selected.length < totalQuestions) {
            const pool = questions.filter(q => units.includes(q.unitCode));
            while (state.selected.length < totalQuestions) {
                const preferredType = pickMostNeededType(typeQuota, state.selected);
                const picked = pickQuestion(pool, null, preferredType, state, random)
                    || pickQuestion(pool, null, null, state, random);
                if (!picked) break;
                takeQuestion(picked, state);
            }
        }

        return shuffleWithRandom(state.selected, random).slice(0, totalQuestions);
    }

    function pickQuestion(pool, wordId, preferredType, state, random) {
        const candidates = pool.filter(question => {
            if (state.usedIds.has(question.id)) return false;
            if (wordId && question.wordId !== wordId) return false;
            if (preferredType && question.type !== preferredType) return false;
            if ((question.type === "M" || question.type === "S") && state.usedTypeWords[question.type].has(question.wordId)) {
                return false;
            }
            return true;
        });

        return shuffleWithRandom(candidates, random)[0] || null;
    }

    function takeQuestion(question, state) {
        state.selected.push(question);
        state.usedIds.add(question.id);
        if (question.type === "M" || question.type === "S") {
            state.usedTypeWords[question.type].add(question.wordId);
        }
    }

    function allocateByRatio(total, ratios) {
        const counts = new Map();
        let used = 0;
        TYPE_ORDER.forEach((type, index) => {
            const count = index === TYPE_ORDER.length - 1
                ? total - used
                : Math.round(total * (ratios[type] || 0));
            counts.set(type, count);
            used += count;
        });
        return counts;
    }

    function allocateEvenly(total, keys, random) {
        const plan = new Map(keys.map(key => [key, 0]));
        if (!keys.length || total <= 0) return plan;
        const base = Math.floor(total / keys.length);
        keys.forEach(key => plan.set(key, base));
        shuffleWithRandom([...keys], random).slice(0, total - base * keys.length).forEach(key => {
            plan.set(key, (plan.get(key) || 0) + 1);
        });
        return plan;
    }

    function makeWordSlots(words, count, random) {
        if (!words.length) return [];
        const slots = [];
        while (slots.length < count) {
            slots.push(...shuffleWithRandom([...words], random));
        }
        return slots.slice(0, count);
    }

    function pickMostNeededType(typeQuota, selected) {
        const current = selected.reduce((map, question) => {
            map[question.type] = (map[question.type] || 0) + 1;
            return map;
        }, {});
        return TYPE_ORDER
            .map(type => ({ type, need: (typeQuota.get(type) || 0) - (current[type] || 0) }))
            .sort((a, b) => b.need - a.need)[0].type;
    }

    function expandPlan(plan) {
        const values = [];
        plan.forEach((count, key) => {
            for (let index = 0; index < count; index += 1) values.push(key);
        });
        return values;
    }

    function unique(values) {
        return [...new Set(values.filter(Boolean))];
    }

    function hashString(value) {
        let hash = 2166136261;
        for (let i = 0; i < String(value).length; i += 1) {
            hash ^= String(value).charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function seededRandom(seed) {
        let value = seed >>> 0;
        return () => {
            value += 0x6D2B79F5;
            let t = value;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function shuffleWithRandom(array, random) {
        for (let i = array.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    window.QuizEngine = {
        TYPE_RATIOS,
        TYPE_ORDER,
        generateQuiz,
        allocateByRatio,
        hashString,
        seededRandom,
        shuffleWithRandom
    };
})();
