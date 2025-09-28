document.addEventListener('DOMContentLoaded', () => {
    // --- Адрес бэкенда ---
    const API_BASE_URL = 'http://127.0.0.1:5001/api';

    // --- Элементы DOM ---
    const metricsDisplay = document.getElementById('metrics-display');
    const eventsContainer = document.getElementById('events-container');
    const wipLimitDisplay = document.getElementById('wip-limit-display');
    const wipLimitInput = document.getElementById('wip-limit-input');
    const setWipLimitBtn = document.getElementById('set-wip-limit-btn');
    const minigameModal = document.getElementById('minigame-modal');
    const logContainer = document.createElement('div');
    logContainer.id = 'log-container';
    document.getElementById('game-container').appendChild(logContainer);

    /**
     * Главная функция рендеринга.
     */
    function render(state) {
        renderMetrics(state);
        renderEvents(state.active_events);
        renderJiraBoard(state);
        renderGanttChart(state.tasks, state.week);
        renderLog(state.chat_history);
    }

    /**
     * Обновляет метрики.
     */
    function renderMetrics(state) {
        const getColor = (val, good, bad) => (val >= good ? 'metric-good' : (val <= bad ? 'metric-bad' : 'metric-ok'));
        metricsDisplay.innerHTML = `
            <div class="metric-item"><span class="label">Неделя</span><span class="value">${state.week}</span></div>
            <div class="metric-item"><span class="label">Бюджет</span><span class="value ${state.budget < 0 ? 'metric-bad' : ''}">$${state.budget.toLocaleString()}</span></div>
            <div class="metric-item"><span class="label">Мораль</span><span class="value ${getColor(state.morale, 75, 45)}">${state.morale}%</span></div>
            <div class="metric-item"><span class="label">Стабильность</span><span class="value ${getColor(state.stability, 80, 40)}">${state.stability}%</span></div>
            <div class="metric-item"><span class="label">Незаплан. работа</span><span class="value ${getColor(100 - state.unplanned_work, 60, 20)}">${state.unplanned_work}%</span></div>
            <div class="metric-item"><span class="label">Прогресс 'Феникса'</span><span class="value">${state.phoenix_progress}%</span></div>`;
    }

    /**
     * Рендерит активные события.
     */
    function renderEvents(events) {
        eventsContainer.innerHTML = '<h2>Активные события</h2>';
        if (!events || events.length === 0) {
            eventsContainer.innerHTML += '<p>Все спокойно... пока.</p>';
            return;
        }
        events.forEach(event => {
            const card = document.createElement('div');
            card.className = 'event-card ' + event.type;
            let choicesHtml = event.choices.map(c => `<button data-event-id="${event.id}" data-choice-id="${c.id}" class="choice-button">${c.text}</button>`).join('');
            card.innerHTML = `<h3>${event.title}</h3><p>${event.text}</p><div class="event-choices">${choicesHtml}</div>`;
            eventsContainer.appendChild(card);
        });
    }

    /**
     * Рендерит лог событий.
     */
    function renderLog(chatHistory) {
        logContainer.innerHTML = '<h3>Лог событий</h3>';
        const logContent = document.createElement('div');
        logContent.className = 'log-content';
        logContent.innerHTML = chatHistory.map(msg => `<p><b>${msg.sender}:</b> ${msg.text}</p>`).join('');
        logContainer.appendChild(logContent);
        logContent.scrollTop = logContent.scrollHeight;
    }

    /**
     * Универсальная функция для отправки действий на бэкенд.
     */
    async function sendAction(actionData) {
        try {
            const response = await fetch(`${API_BASE_URL}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(actionData),
            });
            if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
            const newState = await response.json();
            render(newState);
        } catch (error) {
            console.error("Ошибка при отправке действия:", error);
            eventsContainer.innerHTML = "<h2>Ошибка</h2><p>Ошибка связи с сервером.</p>";
        }
    }

    /**
     * Обрабатывает клики по кнопкам действий (рефакторинг для ясности).
     */
    function handleActionClick(e) {
        const button = e.target.closest('.choice-button');
        if (!button) return;

        const eventId = button.dataset.eventId;
        const choiceId = button.dataset.choiceId;
        const eventCard = button.closest('.event-card');

        // Используем if/else if для определения типа действия
        if (eventCard.classList.contains('minigame')) {
            showMinigame(); // Мини-игра запускается на клиенте
        } else if (eventCard.classList.contains('quiz')) {
            sendAction({ type: 'quiz_answer', event_id: eventId, choice_id: choiceId });
        } else {
            // По умолчанию считаем, что это обычный выбор в событии (кризисе)
            sendAction({ type: 'event_choice', event_id: eventId, choice_id: choiceId });
        }
    }

    /**
     * Загружает начальное состояние игры.
     */
    async function initializeGame() {
        try {
            const response = await fetch(`${API_BASE_URL}/state`);
            if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
            const initialState = await response.json();
            render(initialState);
        } catch (error) {
            console.error("Не удалось загрузить состояние игры:", error);
            eventsContainer.innerHTML = "<h2>Ошибка</h2><p>Не удалось подключиться к серверу.</p>";
        }
    }

    // --- Логика Jira и Ганта ---
    function renderJiraBoard(state) {
        wipLimitDisplay.textContent = state.wip_limit;
        const columns = document.querySelectorAll('.jira-column');
        columns.forEach(c => { while (c.children.length > 1) c.removeChild(c.lastChild); });
        for (const colId in state.tasks) {
            const colEl = document.getElementById(colId);
            if (colEl) {
                state.tasks[colId].forEach(task => {
                    const card = document.createElement('div');
                    card.className = 'task-card'; card.draggable = true; card.dataset.taskId = task.id;
                    card.innerHTML = `<div class="title">${task.title}</div><div class="points">Points: ${task.points}</div>`;
                    colEl.appendChild(card);
                });
            }
        }
    }

    function renderGanttChart(tasks, currentWeek) {
        if (typeof google === 'undefined' || !google.charts) return;
        google.charts.load('current', {'packages':['gantt']});
        google.charts.setOnLoadCallback(() => {
            const data = new google.visualization.DataTable();
            ['string', 'string', 'date', 'date', 'number', 'number', 'string'].forEach((type, i) => data.addColumn(type, ['ID', 'Name', 'Start', 'End', 'Duration', '% Complete', 'Deps'][i]));
            const rows = Object.values(tasks).flat().filter(t => t.start_week !== null).map(t => {
                const start = new Date(); start.setDate(start.getDate() + (t.start_week - 1) * 7);
                const end = new Date(start); end.setDate(end.getDate() + t.duration * 7);
                let p = 0;
                if (tasks.done.some(d => d.id === t.id)) p = 100;
                else if (tasks.review.some(r => r.id === t.id)) p = 75;
                else if (tasks.in_progress.some(i => i.id === t.id)) p = 25;
                return [t.id, t.title, start, end, null, p, null];
            });
            const chartEl = document.getElementById('gantt-chart');
            if (rows.length === 0) { chartEl.innerHTML = '<p style="text-align:center; color:#999;">Начните работу над задачами.</p>'; return; }
            data.addRows(rows);
            new google.visualization.Gantt(chartEl).draw(data, { height: 350, gantt: { trackHeight: 30 } });
        });
    }

    // --- Логика мини-игры ---
    let minigameInterval; let timerInterval;
    function showMinigame() {
        minigameModal.style.display = 'flex';
        const queue = document.getElementById('minigame-queue');
        const timerSpan = document.querySelector('#minigame-timer span');
        const closeBtn = document.getElementById('minigame-close-btn');
        queue.innerHTML = '';
        timerSpan.textContent = '30';
        closeBtn.style.display = 'none';

        let timeLeft = 30;
        minigameInterval = setInterval(() => {
            const task = document.createElement('div');
            task.className = 'minigame-task';
            task.textContent = 'Task';
            task.onclick = () => task.remove();
            queue.prepend(task);
            if (queue.children.length > 6) {
                endMinigame(false); // Провал
            }
        }, 1200);

        timerInterval = setInterval(() => {
            timeLeft--;
            timerSpan.textContent = timeLeft;
            if (timeLeft <= 0) {
                endMinigame(true); // Успех
            }
        }, 1000);

        closeBtn.onclick = () => minigameModal.style.display = 'none';
    }

    function endMinigame(success) {
        clearInterval(minigameInterval);
        clearInterval(timerInterval);
        document.getElementById('minigame-close-btn').style.display = 'block';
        sendAction({ type: 'minigame_result', result: success ? 'success' : 'failure' });
    }

    // --- Инициализация и обработчики событий ---
    setWipLimitBtn.onclick = () => {
        const limit = parseInt(wipLimitInput.value, 10);
        if (limit > 0) sendAction({ type: 'set_wip_limit', limit: limit });
    };

    let draggedItem = null, oldColumnId = null;
    document.addEventListener('dragstart', e => {
        if (e.target.classList.contains('task-card')) {
            draggedItem = e.target; oldColumnId = e.target.closest('.jira-column').dataset.columnId;
            setTimeout(() => e.target.style.display = 'none', 0);
        }
    });
    document.addEventListener('dragend', () => {
        if (draggedItem) {
            setTimeout(() => { draggedItem.style.display = 'block'; draggedItem = null; oldColumnId = null; }, 0);
        }
    });
    document.querySelectorAll('.jira-column').forEach(c => {
        c.addEventListener('dragover', e => e.preventDefault());
        c.addEventListener('drop', e => {
            e.preventDefault();
            if (draggedItem && e.currentTarget.classList.contains('jira-column')) {
                const newColumnId = e.currentTarget.dataset.columnId;
                if (oldColumnId !== newColumnId) sendAction({ type: 'task_move', task_id: draggedItem.dataset.taskId, new_column_id: newColumnId, old_column_id: oldColumnId });
            }
        });
    });

    eventsContainer.addEventListener('click', handleActionClick);
    initializeGame();

    // --- Экспонируем функции для тестирования ---
    window.endMinigame = endMinigame;
});