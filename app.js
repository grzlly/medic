document.addEventListener('DOMContentLoaded', () => {
    const questionsList = document.getElementById('questions-list');
    const searchInput = document.getElementById('search-input');
    const questionCount = document.getElementById('question-count');
    const noResults = document.getElementById('no-results');
    const template = document.getElementById('question-template');
    
    const caseDetailView = document.getElementById('case-detail-view');
    const caseDetailContent = document.getElementById('case-detail-content');
    const btnBackToList = document.getElementById('btn-back-to-list');
    const btnPrevCase = document.getElementById('btn-prev-case');
    const btnNextCase = document.getElementById('btn-next-case');
    const caseDetailCounter = document.getElementById('case-detail-counter');
    
    const modeTestsBtn = document.getElementById('mode-tests');
    const modeCasesBtn = document.getElementById('mode-cases');
    
    const modeSubnav = document.getElementById('mode-subnav');
    const submodeDirectory = document.getElementById('submode-directory');
    const submodeTrainer = document.getElementById('submode-trainer');
    const trainerView = document.getElementById('trainer-view');
    const trainerCardContainer = document.getElementById('trainer-card-container');
    const trainerQueueCount = document.getElementById('trainer-queue-count');
    const trainerSolvedCount = document.getElementById('trainer-solved-count');
    const trainerErrorCount = document.getElementById('trainer-error-count');
    const btnTrainerReset = document.getElementById('btn-trainer-reset');
    const btnTrainerRetry = document.getElementById('btn-trainer-retry');
    const trainerFinished = document.getElementById('trainer-finished');
    const mainSearchContainer = document.getElementById('main-search-container');
    const statBoxErrors = document.getElementById('stat-box-errors');

    // Auto-collapsing header logic for mobile
    const header = document.querySelector('.header');
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        if (window.innerWidth <= 768) {
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                header.classList.add('header--hidden');
            } else {
                header.classList.remove('header--hidden');
            }
        } else {
            header.classList.remove('header--hidden');
        }
        lastScrollY = currentScrollY;
    }, { passive: true });

    let allTests = [];
    let allCases = [];
    let currentMode = 'tests'; // 'tests' or 'cases'
    let currentSubmode = 'directory'; // 'directory' or 'trainer'
    let currentFilter = 'all'; // 'all' or 'errors'
    let currentCaseDetailIndex = -1;

    let solvedTests = JSON.parse(localStorage.getItem('fmzaSolvedTests') || '[]');
    let errorTests = JSON.parse(localStorage.getItem('fmzaErrorTests') || '[]');
    let trainerQueue = [];
    let currentTrainerQuestion = null;

    let casesSolved = JSON.parse(localStorage.getItem('fmzaCasesSolved') || '[]');
    let casesErrors = JSON.parse(localStorage.getItem('fmzaCasesErrors') || '[]');
    let casesTrainerQueue = [];
    let currentTrainerCase = null;

    function saveTrainerState() {
        if (currentMode === 'tests') {
            localStorage.setItem('fmzaSolvedTests', JSON.stringify(solvedTests));
            localStorage.setItem('fmzaErrorTests', JSON.stringify(errorTests));
        } else {
            localStorage.setItem('fmzaCasesSolved', JSON.stringify(casesSolved));
            localStorage.setItem('fmzaCasesErrors', JSON.stringify(casesErrors));
        }
    }

    function loadScript(src) {
        return new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = src + '?t=' + Date.now();
            s.onload = () => { resolve(true); setTimeout(() => s.remove(), 1000); };
            s.onerror = () => { resolve(false); setTimeout(() => s.remove(), 1000); };
            document.body.appendChild(s);
        });
    }

    async function loadData() {
        await Promise.all([
            loadScript('data.js'),
            loadScript('cases_data.js')
        ]);
        
        let updated = false;
        if (typeof testData !== 'undefined' && testData.length > allTests.length) {
            allTests = testData;
            updated = true;
        }
        if (typeof casesData !== 'undefined' && casesData.length > allCases.length) {
            allCases = casesData;
            updated = true;
        }
        return updated;
    }

    // Initial load
    loadData().then(() => {
        renderCurrentMode();
        
        // Polling for updates (useful if scraper is running)
        setInterval(async () => {
            const updated = await loadData();
            if (updated) {
                const scrollY = window.scrollY;
                renderCurrentMode(searchInput.value.toLowerCase().trim());
                window.scrollTo(0, scrollY);
            }
        }, 10000);
    });

    modeTestsBtn.addEventListener('click', () => {
        currentMode = 'tests';
        currentFilter = 'all';
        modeTestsBtn.classList.add('active');
        modeCasesBtn.classList.remove('active');
        searchInput.value = '';
        renderCurrentMode();
    });

    modeCasesBtn.addEventListener('click', () => {
        currentMode = 'cases';
        currentFilter = 'all';
        modeCasesBtn.classList.add('active');
        modeTestsBtn.classList.remove('active');
        searchInput.value = '';
        renderCurrentMode();
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        renderCurrentMode(query);
    });

    btnBackToList.addEventListener('click', () => {
        caseDetailView.classList.add('hidden');
        questionsList.classList.remove('hidden');
    });

    btnPrevCase.addEventListener('click', () => {
        if (currentCaseDetailIndex > 0) {
            openCaseDetail(currentCaseDetailIndex - 1);
        }
    });

    btnNextCase.addEventListener('click', () => {
        if (currentCaseDetailIndex < filteredItems.length - 1) {
            openCaseDetail(currentCaseDetailIndex + 1);
        }
    });

    submodeDirectory.addEventListener('click', () => {
        currentSubmode = 'directory';
        currentFilter = 'all';
        submodeDirectory.classList.add('active');
        submodeTrainer.classList.remove('active');
        renderCurrentMode(searchInput.value.toLowerCase().trim());
    });

    submodeTrainer.addEventListener('click', () => {
        currentSubmode = 'trainer';
        currentFilter = 'all';
        submodeTrainer.classList.add('active');
        submodeDirectory.classList.remove('active');
        renderCurrentMode(searchInput.value.toLowerCase().trim());
    });

    btnTrainerReset.addEventListener('click', () => {
        if (currentMode === 'tests') {
            solvedTests = [];
        } else {
            casesSolved = [];
        }
        saveTrainerState();
        if (currentSubmode === 'trainer') initTrainer();
    });

    btnTrainerRetry.addEventListener('click', (e) => {
        e.stopPropagation();
        currentFilter = 'errors';
        currentSubmode = 'trainer';
        submodeTrainer.classList.add('active');
        submodeDirectory.classList.remove('active');
        renderCurrentMode(searchInput.value.toLowerCase().trim());
    });

    statBoxErrors.addEventListener('click', () => {
        currentFilter = 'errors';
        currentSubmode = 'directory';
        submodeDirectory.classList.add('active');
        submodeTrainer.classList.remove('active');
        renderCurrentMode(searchInput.value.toLowerCase().trim());
    });

    let filteredItems = [];
    let currentRenderCount = 0;
    const ITEMS_PER_PAGE = 50;
    
    // Intersection Observer for infinite scrolling
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            renderMore();
        }
    }, { rootMargin: '200px' });

    function renderCurrentMode(query = '') {
        questionsList.innerHTML = '';
        currentRenderCount = 0;
        
        caseDetailView.classList.add('hidden');
        trainerView.classList.add('hidden');
        
        modeSubnav.classList.add('active');
        mainSearchContainer.style.display = currentSubmode === 'directory' ? 'block' : 'none';

        if (currentMode === 'tests') {
            let baseTests = query ? allTests.filter(q => 
                q.question.toLowerCase().includes(query) || 
                (q.correct_answer && q.correct_answer.toLowerCase().includes(query)) ||
                (q.wrong_answers && q.wrong_answers.some(opt => opt.toLowerCase().includes(query)))
            ) : allTests;

            if (currentFilter === 'errors') {
                baseTests = baseTests.filter(q => errorTests.includes(q.question));
            }

            filteredItems = baseTests;
            questionCount.textContent = currentFilter === 'errors' ? `${filteredItems.length} ошибок` : `${filteredItems.length} вопросов`;

            if (currentSubmode === 'directory') {
                questionsList.classList.remove('hidden');
                questionsList.classList.remove('cases-grid');
            } else {
                questionsList.classList.add('hidden');
                trainerView.classList.remove('hidden');
                initTrainer();
                return;
            }
        } else {
            let baseCases = query ? allCases.filter(c => {
                const combinedText = c.conditions.map(cond => cond.text).join(' ').toLowerCase();
                const combinedQuestions = c.questions.map(q => q.text + ' ' + q.answers.map(a => a.text).join(' ')).join(' ').toLowerCase();
                return combinedText.includes(query) || combinedQuestions.includes(query);
            }) : allCases;
            
            if (currentFilter === 'errors') {
                baseCases = baseCases.filter(c => casesErrors.includes(c.conditions[0].text));
            }
            
            filteredItems = baseCases;
            questionCount.textContent = currentFilter === 'errors' ? `${filteredItems.length} ошибок` : `${filteredItems.length} кейсов`;
            
            if (currentSubmode === 'directory') {
                questionsList.classList.remove('hidden');
                questionsList.classList.add('cases-grid');
            } else {
                questionsList.classList.add('hidden');
                trainerView.classList.remove('hidden');
                initTrainer();
                return;
            }
        }
        
        if (filteredItems.length === 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
            renderMore();
        }
    }

    function renderMore() {
        if (currentRenderCount >= filteredItems.length) return;
        
        const fragment = document.createDocumentFragment();
        const endIndex = Math.min(currentRenderCount + ITEMS_PER_PAGE, filteredItems.length);
        
        for (let i = currentRenderCount; i < endIndex; i++) {
            if (currentMode === 'tests') {
                fragment.appendChild(createTestCard(filteredItems[i]));
            } else {
                fragment.appendChild(createCaseSummaryCard(filteredItems[i], i));
            }
        }
        
        // Remove existing observer target if any
        const oldTarget = document.getElementById('scroll-target');
        if (oldTarget) {
            observer.unobserve(oldTarget);
            oldTarget.remove();
        }
        
        questionsList.appendChild(fragment);
        currentRenderCount = endIndex;
        
        // Add new observer target if there are more items
        if (currentRenderCount < filteredItems.length) {
            const target = document.createElement('div');
            target.id = 'scroll-target';
            target.style.height = '20px';
            questionsList.appendChild(target);
            observer.observe(target);
        }
    }

    const asciidoctor = (typeof Asciidoctor !== 'undefined') ? Asciidoctor() : null;
    function parseText(text) {
        if (!text) return '';
        if (asciidoctor) {
            try {
                return asciidoctor.convert(text);
            } catch(e) {}
        }
        return text.replace(/\n/g, '<br/>');
    }

    // --- Trainer Mode Logic ---
    function shuffleArray(array) {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }

    let currentTrainerCaseHadError = false;
    let currentTrainerCaseQuestionIndex = 0;

    function initTrainer() {
        if (currentMode === 'tests') {
            if (currentFilter === 'errors') {
                trainerQueue = filteredItems.filter(q => errorTests.includes(q.question));
            } else {
                trainerQueue = filteredItems.filter(q => 
                    !solvedTests.includes(q.question) && !errorTests.includes(q.question)
                );
            }
            trainerQueue = shuffleArray(trainerQueue);
        } else {
            if (currentFilter === 'errors') {
                casesTrainerQueue = filteredItems.filter(c => casesErrors.includes(c.conditions[0].text));
            } else {
                casesTrainerQueue = filteredItems.filter(c => 
                    !casesSolved.includes(c.conditions[0].text) && !casesErrors.includes(c.conditions[0].text)
                );
            }
            casesTrainerQueue = shuffleArray(casesTrainerQueue);
            currentTrainerCaseHadError = false;
            currentTrainerCaseQuestionIndex = 0;
        }
        updateTrainerStats();
        renderTrainerCard();
    }

    function updateTrainerStats() {
        if (currentMode === 'tests') {
            trainerQueueCount.innerText = trainerQueue.length;
            trainerSolvedCount.innerText = solvedTests.length;
            trainerErrorCount.innerText = errorTests.length;
        } else {
            trainerQueueCount.innerText = casesTrainerQueue.length;
            trainerSolvedCount.innerText = casesSolved.length;
            trainerErrorCount.innerText = casesErrors.length;
        }
    }

    function renderTrainerCard() {
        trainerCardContainer.innerHTML = '';
        if (currentMode === 'cases') {
            renderCaseTrainerCard();
            return;
        }
        
        if (trainerQueue.length === 0) {
            if (currentFilter === 'errors') {
                currentFilter = 'all';
                renderCurrentMode(searchInput.value.toLowerCase().trim());
                return;
            }
            trainerFinished.classList.remove('hidden');
            return;
        }
        trainerFinished.classList.add('hidden');
        
        currentTrainerQuestion = trainerQueue[0];
        
        const card = document.createElement('div');
        card.className = 'trainer-card';
        
        const qText = document.createElement('div');
        qText.className = 'question-text';
        qText.innerHTML = parseText(currentTrainerQuestion.question);
        card.appendChild(qText);

        const answers = [
            { text: currentTrainerQuestion.correct_answer, isCorrect: true },
            ...currentTrainerQuestion.wrong_answers.map(a => ({ text: a, isCorrect: false }))
        ];
        
        const shuffledAnswers = shuffleArray(answers);
        let answered = false;

        shuffledAnswers.forEach(ans => {
            const btn = document.createElement('div');
            btn.className = 'trainer-answer';
            btn.innerHTML = parseText(ans.text);
            
            btn.addEventListener('click', () => {
                if (answered) return;
                answered = true;
                
                if (ans.isCorrect) {
                    btn.classList.add('selected-correct');
                    
                    const errIdx = errorTests.indexOf(currentTrainerQuestion.question);
                    if (errIdx > -1) {
                        errorTests.splice(errIdx, 1);
                    }

                    if (!solvedTests.includes(currentTrainerQuestion.question)) {
                        solvedTests.push(currentTrainerQuestion.question);
                    }
                    saveTrainerState();
                    updateTrainerStats();
                    setTimeout(() => {
                        trainerQueue.shift();
                        renderTrainerCard();
                    }, 1200);
                } else {
                    btn.classList.add('selected-wrong');
                    if (!errorTests.includes(currentTrainerQuestion.question)) {
                        errorTests.push(currentTrainerQuestion.question);
                        saveTrainerState();
                    }
                    updateTrainerStats();
                    
                    Array.from(card.querySelectorAll('.trainer-answer')).forEach(a => {
                        if (a.dataset.correct === 'true') {
                            a.classList.add('show-correct');
                        }
                    });
                    
                    const nextBtn = document.createElement('button');
                    nextBtn.className = 'action-btn';
                    nextBtn.innerText = 'Дальше →';
                    nextBtn.onclick = () => {
                        trainerQueue.shift();
                        renderTrainerCard();
                    };
                    
                    const controls = document.createElement('div');
                    controls.className = 'trainer-controls';
                    controls.appendChild(nextBtn);
                    card.appendChild(controls);
                }
            });
            
            if (ans.isCorrect) {
                btn.dataset.correct = 'true';
            }
            
            card.appendChild(btn);
        });
        
        trainerCardContainer.appendChild(card);
    }

    function renderCaseTrainerCard() {
        if (casesTrainerQueue.length === 0) {
            if (currentFilter === 'errors') {
                currentFilter = 'all';
                renderCurrentMode(searchInput.value.toLowerCase().trim());
                return;
            }
            trainerFinished.classList.remove('hidden');
            return;
        }
        trainerFinished.classList.add('hidden');

        currentTrainerCase = casesTrainerQueue[0];
        const caseId = currentTrainerCase.conditions[0].text;

        const card = document.createElement('div');
        card.className = 'trainer-card';
        
        const conditionDiv = document.createElement('div');
        conditionDiv.className = 'case-condition-text';
        conditionDiv.style.marginBottom = '2rem';
        conditionDiv.innerHTML = currentTrainerCase.conditions.map(c => `<div class="condition-section"><b>${c.name}</b><br/>${parseText(c.text)}</div>`).join('');
        card.appendChild(conditionDiv);

        const qData = currentTrainerCase.questions[currentTrainerCaseQuestionIndex];
        const qTitle = document.createElement('div');
        qTitle.className = 'case-question-title';
        qTitle.style.marginBottom = '1rem';
        qTitle.style.fontWeight = '600';
        qTitle.style.fontSize = '1.1rem';
        qTitle.innerHTML = `Вопрос ${currentTrainerCaseQuestionIndex + 1} из ${currentTrainerCase.questions.length}: ${parseText(qData.text)}`;
        card.appendChild(qTitle);

        const answersContainer = document.createElement('div');
        answersContainer.className = 'answers-container';

        const answers = [...qData.answers];
        const shuffledAnswers = shuffleArray(answers);
        let answered = false;

        shuffledAnswers.forEach(ans => {
            const btn = document.createElement('div');
            btn.className = 'trainer-answer';
            btn.innerHTML = parseText(ans.text);

            btn.addEventListener('click', () => {
                if (answered) return;
                answered = true;

                if (ans.is_correct) {
                    btn.classList.add('selected-correct');
                } else {
                    btn.classList.add('selected-wrong');
                    currentTrainerCaseHadError = true;
                    
                    if (!casesErrors.includes(caseId)) {
                        casesErrors.push(caseId);
                        saveTrainerState();
                        updateTrainerStats();
                    }

                    Array.from(answersContainer.querySelectorAll('.trainer-answer')).forEach(a => {
                        if (a.dataset.correct === 'true') {
                            a.classList.add('show-correct');
                        }
                    });
                }

                const controls = document.createElement('div');
                controls.className = 'trainer-controls';
                const nextBtn = document.createElement('button');
                nextBtn.className = 'action-btn';
                
                if (currentTrainerCaseQuestionIndex < currentTrainerCase.questions.length - 1) {
                    nextBtn.innerText = 'Дальше →';
                    nextBtn.onclick = () => {
                        currentTrainerCaseQuestionIndex++;
                        renderTrainerCard();
                    };
                } else {
                    nextBtn.innerText = 'Следующий кейс →';
                    if (!currentTrainerCaseHadError) {
                        const errIdx = casesErrors.indexOf(caseId);
                        if (errIdx > -1) casesErrors.splice(errIdx, 1);
                        
                        if (!casesSolved.includes(caseId)) {
                            casesSolved.push(caseId);
                        }
                        saveTrainerState();
                        updateTrainerStats();
                    }

                    nextBtn.onclick = () => {
                        casesTrainerQueue.shift();
                        currentTrainerCaseQuestionIndex = 0;
                        currentTrainerCaseHadError = false;
                        renderTrainerCard();
                    };
                }

                if (ans.is_correct && currentTrainerCaseQuestionIndex < currentTrainerCase.questions.length - 1) {
                    setTimeout(() => {
                        currentTrainerCaseQuestionIndex++;
                        renderTrainerCard();
                    }, 1200);
                } else if (ans.is_correct) {
                    // last question correct
                    if (!currentTrainerCaseHadError) {
                        const errIdx = casesErrors.indexOf(caseId);
                        if (errIdx > -1) casesErrors.splice(errIdx, 1);
                        if (!casesSolved.includes(caseId)) {
                            casesSolved.push(caseId);
                        }
                        saveTrainerState();
                        updateTrainerStats();
                    }
                    setTimeout(() => {
                        casesTrainerQueue.shift();
                        currentTrainerCaseQuestionIndex = 0;
                        currentTrainerCaseHadError = false;
                        renderTrainerCard();
                    }, 1200);
                } else {
                    controls.appendChild(nextBtn);
                    card.appendChild(controls);
                }
            });

            if (ans.is_correct) {
                btn.dataset.correct = 'true';
            }
            answersContainer.appendChild(btn);
        });

        card.appendChild(answersContainer);
        trainerCardContainer.appendChild(card);
    }

    function createTestCard(q) {
        const clone = template.content.cloneNode(true);
        const textEl = clone.querySelector('.question-text');
        const correctTextEl = clone.querySelector('.correct-text');
        const container = clone.querySelector('.answers-container');

        textEl.innerHTML = parseText(q.question);
        correctTextEl.innerHTML = parseText(q.correct_answer);

        if (Array.isArray(q.wrong_answers)) {
            q.wrong_answers.forEach(opt => {
                const wrongDiv = document.createElement('div');
                wrongDiv.className = 'answer wrong';
                wrongDiv.innerHTML = `
                    <div class="answer-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                    <div class="answer-text">${parseText(opt)}</div>
                `;
                container.appendChild(wrongDiv);
            });
        }
        
        return clone;
    }

    function createCaseSummaryCard(caseData, filterIndex) {
        const card = document.createElement('div');
        card.className = 'case-summary-card';
        card.addEventListener('click', () => openCaseDetail(filterIndex));

        const originalIndex = allCases.indexOf(caseData);
        
        const title = document.createElement('div');
        title.className = 'case-summary-title';
        title.innerText = `Кейс #${originalIndex + 1}`;
        
        const preview = document.createElement('div');
        preview.className = 'case-summary-preview';
        const rawText = caseData.conditions.map(c => c.text).join(' ');
        preview.innerHTML = parseText(rawText);

        card.appendChild(title);
        card.appendChild(preview);
        return card;
    }

    function openCaseDetail(filterIndex) {
        currentCaseDetailIndex = filterIndex;
        const caseData = filteredItems[filterIndex];
        const originalIndex = allCases.indexOf(caseData);

        questionsList.classList.add('hidden');
        caseDetailView.classList.remove('hidden');
        window.scrollTo(0, 0);

        caseDetailContent.innerHTML = '';
        caseDetailContent.appendChild(createCaseCard(caseData, originalIndex));

        updateCaseDetailNav();
    }

    function updateCaseDetailNav() {
        btnPrevCase.disabled = currentCaseDetailIndex <= 0;
        btnNextCase.disabled = currentCaseDetailIndex >= filteredItems.length - 1;
        caseDetailCounter.innerText = `${currentCaseDetailIndex + 1} из ${filteredItems.length}`;
    }

    function createCaseCard(caseData, index) {
        const article = document.createElement('article');
        article.className = 'case-card';
        
        const conditionDiv = document.createElement('div');
        conditionDiv.className = 'case-condition';
        
        const h3 = document.createElement('h3');
        h3.innerText = `Кейс #${index + 1}`;
        conditionDiv.appendChild(h3);
        
        const conditionsText = document.createElement('div');
        conditionsText.className = 'case-condition-text';
        conditionsText.innerHTML = caseData.conditions.map(c => `<div class="condition-section"><b>${c.name}</b><br/>${parseText(c.text)}</div>`).join('');
        conditionDiv.appendChild(conditionsText);
        
        article.appendChild(conditionDiv);
        
        const questionsContainer = document.createElement('div');
        questionsContainer.className = 'case-questions';
        
        caseData.questions.forEach((q, qIndex) => {
            const qDiv = document.createElement('div');
            qDiv.className = 'case-question';
            
            const qTitle = document.createElement('div');
            qTitle.className = 'case-question-title';
            qTitle.style.marginBottom = '1rem';
            qTitle.style.fontWeight = '600';
            qTitle.style.fontSize = '1.1rem';
            qTitle.innerHTML = `${qIndex + 1}. ${parseText(q.text)}`;
            qDiv.appendChild(qTitle);
            
            const answersContainer = document.createElement('div');
            answersContainer.className = 'answers-container';
            
            let justificationText = '';
            
            q.answers.forEach(ans => {
                const ansDiv = document.createElement('div');
                ansDiv.className = ans.is_correct ? 'answer correct' : 'answer wrong';
                
                const iconSvg = ans.is_correct 
                    ? '<polyline points="20 6 9 17 4 12"></polyline>' 
                    : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
                
                ansDiv.innerHTML = `
                    <div class="answer-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>
                    </div>
                    <div class="answer-text ${ans.is_correct ? 'correct-text' : ''}">${parseText(ans.text)}</div>
                `;
                
                if (ans.is_correct) {
                    answersContainer.prepend(ansDiv);
                } else {
                    answersContainer.appendChild(ansDiv);
                }
                
                if (ans.justification) {
                    justificationText = ans.justification;
                }
            });
            
            qDiv.appendChild(answersContainer);
            
            if (justificationText) {
                const justDiv = document.createElement('div');
                justDiv.className = 'justification-block';
                justDiv.innerHTML = `
                    <div class="justification-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        Обоснование ответа
                    </div>
                    ${parseText(justificationText)}
                `;
                qDiv.appendChild(justDiv);
            }
            
            questionsContainer.appendChild(qDiv);
        });
        
        article.appendChild(questionsContainer);
        
        return article;
    }
});
