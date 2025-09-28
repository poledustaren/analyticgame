document.addEventListener('DOMContentLoaded', () => {
    // --- Адрес бэкенда ---
    const API_BASE_URL = 'http://127.0.0.1:5001/api';

    // --- Элементы DOM ---
    const metricsDisplay = document.getElementById('metrics-display');
    const eventsContainer = document.getElementById('events-container');
    const logContainer = document.createElement('div');
    logContainer.id = 'log-container';
    document.getElementById('game-container').appendChild(logContainer);


    /**
     * Главная функция рендеринга. Принимает состояние игры и обновляет весь UI.
     */
    function render(state) {
        renderMetrics(state);
        renderEvents(state.active_events);
        renderJiraBoard(state.tasks);
        renderGanttChart(state.tasks, state.week);
        renderLog(state.chat_history);
    }

    /**
     * Обновляет отображение метрик на экране.
     */
    function renderMetrics(state) {
        const getColorClass = (value, good, bad) => {
            if (value >= good) return 'metric-good';
            if (value <= bad) return 'metric-bad';
            return 'metric-ok';
        };

        const stabilityColor = getColorClass(state.stability, 80, 40);
        const moraleColor = getColorClass(state.morale, 75, 45);
        const unplannedColor = getColorClass(100 - state.unplanned_work, 60, 20); // Чем меньше, тем лучше

        metricsDisplay.innerHTML = `
            <div class="metric-item">
                <span class="label">Неделя</span>
                <span class="value">${state.week}</span>
            </div>
            <div class="metric-item">
                <span class="label">Бюджет</span>
                <span class="value ${state.budget < 0 ? 'metric-bad' : ''}">$${state.budget.toLocaleString()}</span>
            </div>
            <div class="metric-item">
                <span class="label">Мораль</span>
                <span class="value ${moraleColor}">${state.morale}%</span>
            </div>
            <div class="metric-item">
                <span class="label">Стабильность</span>
                <span class="value ${stabilityColor}">${state.stability}%</span>
            </div>
            <div class="metric-item">
                <span class="label">Незаплан. работа</span>
                <span class="value ${unplannedColor}">${state.unplanned_work}%</span>
            </div>
            <div class="metric-item">
                <span class="label">Прогресс 'Феникса'</span>
                <span class="value">${state.phoenix_progress}%</span>
            </div>
        `;
    }

    /**
     * Рендерит активные события (кризисы, квизы).
     */
    function renderEvents(events) {
        eventsContainer.innerHTML = '<h2>Активные события</h2>';
        if (!events || events.length === 0) {
            eventsContainer.innerHTML += '<p>Все спокойно... пока.</p>';
            return;
        }

        events.forEach(event => {
            const card = document.createElement('div');
            card.className = 'event-card ' + event.type; // e.g., 'crisis' or 'quiz'

            let choicesHtml = '';
            event.choices.forEach(choice => {
                choicesHtml += `<button data-event-id="${event.id}" data-choice-id="${choice.id}" class="choice-button">${choice.text}</button>`;
            });

            card.innerHTML = `
                <h3>${event.title}</h3>
                <p>${event.text}</p>
                <div class="event-choices">${choicesHtml}</div>
            `;
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
     * Универсальная функция для отправки любого действия на бэкенд.
     */
    async function sendAction(actionData) {
        try {
            const response = await fetch(`${API_BASE_URL}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(actionData),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const newState = await response.json();
            render(newState);
        } catch (error) {
            console.error("Ошибка при отправке действия:", error);
            eventsContainer.innerHTML = "<h2>Ошибка</h2><p>Ошибка связи с сервером. Попробуйте обновить страницу.</p>";
        }
    }

    /**
     * Обрабатывает клики по кнопкам действий.
     */
    function handleActionClick(e) {
        if (e.target.classList.contains('choice-button')) {
            const button = e.target;
            const eventId = button.dataset.eventId;
            const choiceId = button.dataset.choiceId;
            const eventCard = button.closest('.event-card');

            let actionType = eventCard.classList.contains('quiz') ? 'quiz_answer' : 'event_choice';

            sendAction({ type: actionType, event_id: eventId, choice_id: choiceId });
        }
    }

    /**
     * Загружает начальное состояние игры с сервера.
     */
    async function initializeGame() {
        try {
            const response = await fetch(`${API_BASE_URL}/state`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const initialState = await response.json();
            render(initialState);
        } catch (error) {
            console.error("Не удалось загрузить состояние игры:", error);
            eventsContainer.innerHTML = "<h2>Ошибка</h2><p>Не удалось подключиться к серверу игры. Убедитесь, что он запущен.</p>";
        }
    }

    // --- Логика Jira-доски (Drag-and-Drop) ---

    function renderJiraBoard(tasks) {
        const columns = document.querySelectorAll('.jira-column');
        columns.forEach(column => {
            while (column.children.length > 1) column.removeChild(column.lastChild);
        });

        for (const columnId in tasks) {
            const columnElement = document.getElementById(columnId);
            if (columnElement) {
                tasks[columnId].forEach(task => {
                    const card = document.createElement('div');
                    card.className = 'task-card';
                    card.draggable = true;
                    card.dataset.taskId = task.id;
                    card.innerHTML = `<div class="title">${task.title}</div><div class="points">Points: ${task.points}</div>`;
                    columnElement.appendChild(card);
                });
            }
        }
    }

    let draggedItem = null;
    let oldColumnId = null;

    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task-card')) {
            draggedItem = e.target;
            oldColumnId = e.target.closest('.jira-column').dataset.columnId;
            setTimeout(() => e.target.style.display = 'none', 0);
        }
    });

    document.addEventListener('dragend', (e) => {
        if (draggedItem) {
            setTimeout(() => {
                draggedItem.style.display = 'block';
                draggedItem = null;
                oldColumnId = null;
            }, 0);
        }
    });

    document.querySelectorAll('.jira-column').forEach(column => {
        column.addEventListener('dragover', (e) => e.preventDefault());

        column.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedItem && e.currentTarget.classList.contains('jira-column')) {
                const newColumnId = e.currentTarget.dataset.columnId;
                if (oldColumnId !== newColumnId) {
                    sendAction({
                        type: 'task_move',
                        task_id: draggedItem.dataset.taskId,
                        new_column_id: newColumnId,
                        old_column_id: oldColumnId
                    });
                }
            }
        });
    });

    // --- Логика графика Ганта ---

    function renderGanttChart(tasks, currentWeek) {
        if (typeof google === 'undefined' || typeof google.charts === 'undefined') {
            return; // Не рендерим, если библиотека не загружена
        }
        google.charts.load('current', {'packages':['gantt']});
        google.charts.setOnLoadCallback(drawChart);

        function drawChart() {
            const data = new google.visualization.DataTable();
            data.addColumn('string', 'Task ID');
            data.addColumn('string', 'Task Name');
            data.addColumn('date', 'Start Date');
            data.addColumn('date', 'End Date');
            data.addColumn('number', 'Duration');
            data.addColumn('number', 'Percent Complete');
            data.addColumn('string', 'Dependencies');

            const allTasks = [ ...tasks.backlog, ...tasks.in_progress, ...tasks.review, ...tasks.done ];
            const rows = [];

            allTasks.forEach(task => {
                if (task.start_week !== null) {
                    const startDate = new Date();
                    startDate.setDate(startDate.getDate() + (task.start_week - 1) * 7);
                    const endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + task.duration * 7);

                    let percentComplete = 0;
                    if (tasks.done.some(t => t.id === task.id)) percentComplete = 100;
                    else if (tasks.review.some(t => t.id === task.id)) percentComplete = 75;
                    else if (tasks.in_progress.some(t => t.id === task.id)) percentComplete = 25;

                    rows.push([ task.id, task.title, startDate, endDate, null, percentComplete, null ]);
                }
            });

            const chartElement = document.getElementById('gantt-chart');
            if (rows.length === 0) {
                chartElement.innerHTML = '<p style="text-align:center; color:#999;">Начните работу над задачами, чтобы увидеть график.</p>';
                return;
            }

            data.addRows(rows);
            const options = { height: 350, gantt: { trackHeight: 30 } };
            const chart = new google.visualization.Gantt(chartElement);
            chart.draw(data, options);
        }
    }

    // --- Инициализация ---
    eventsContainer.addEventListener('click', handleActionClick);
    initializeGame();
});