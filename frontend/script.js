document.addEventListener('DOMContentLoaded', () => {
    // --- Localization (i18n) ---
    const i18n = {
        workItems: {
            business: "Бизнес-проект",
            internal: "Внутренний проект",
            change: "Изменение",
            unplanned: "Незапланированная работа"
        },
        defectSuffix: " (Дефект!)",
        purchasedSuffix: " - Куплено!",
        notifications: {
            unplannedWork: "Появилась незапланированная работа! Пора тушить пожары!",
            win: 'Поздравляем! Вы успешно завершили "Проект Феникс"!',
            loss: "Игра окончена! Слишком много дефектов попало к заказчику.",
            defectLeaked: "ДЕФЕКТ попал к заказчику! Это создаёт ещё больше незапланированной работы!",
            projectDelivered: "Бизнес-проект успешно сдан!",
            upgraded: "Улучшено: "
        },
        upgradeNames: {
            'automated-testing': 'Автоматизированное тестирование',
            'ci-cd-pipeline': 'CI/CD Конвейер',
            'monitoring': 'Мониторинг'
        }
    };

    // --- DOM Elements ---
    const addBusinessProjectBtn = document.getElementById('add-business-project-btn');
    const addInternalProjectBtn = document.getElementById('add-internal-project-btn');
    const restartBtn = document.getElementById('restart-btn');
    const upgrades = document.querySelectorAll('.upgrade');
    const deliveredCountSpan = document.getElementById('delivered-count');
    const dayCountSpan = document.getElementById('day-count');
    const leakedCountSpan = document.getElementById('leaked-count');
    const notificationsContainer = document.getElementById('notifications');
    const stageContainers = {
        dev: document.getElementById('dev').querySelector('.work-items'),
        ops: document.getElementById('ops').querySelector('.work-items'),
        customer: document.getElementById('customer').querySelector('.work-items')
    };

    // --- Game Flow ---
    async function initGame() {
        const response = await fetch('/api/game_state');
        const gameState = await response.json();
        renderState(gameState);
    }

    function renderState(state) {
        // Render stats
        deliveredCountSpan.innerText = state.stats.deliveredCount;
        leakedCountSpan.innerText = state.stats.leakedCount;
        dayCountSpan.innerText = state.stats.day;

        // Clear the board
        Object.values(stageContainers).forEach(c => c.innerHTML = '');

        // Render work items
        state.stages.forEach(stage => {
            stage.work_items.forEach(itemId => {
                const workItemData = state.work_items[itemId];
                const workItemEl = createWorkItemElement(workItemData);
                stageContainers[stage.id].appendChild(workItemEl);
            });
        });

        // Render tooling
        upgrades.forEach(u => {
            const toolId = u.id;
            u.classList.toggle('purchased', state.tooling[toolId].purchased);
            if (state.tooling[toolId].purchased) {
                u.innerText = `${i18n.upgradeNames[toolId]}${i18n.purchasedSuffix}`;
            } else {
                u.innerText = i18n.upgradeNames[toolId];
            }
        });
    }

    // --- Core Functions ---
    function createWorkItemElement(itemData) {
        const workItem = document.createElement('div');
        workItem.className = `work-item ${itemData.type}`;
        workItem.setAttribute('draggable', 'true');
        workItem.id = itemData.id;
        workItem.innerText = `${i18n.workItems[itemData.type]} #${itemData.numeric_id}`;
        if (itemData.is_defect) {
            workItem.classList.add('defect');
            workItem.innerText += i18n.defectSuffix;
            workItem.style.border = '3px solid red';
        }
        workItem.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', e.target.id));
        return workItem;
    }

    function showNotification(message, type = 'info') {
        const msgDiv = document.createElement('div');
        msgDiv.className = `notification-message ${type}`;
        msgDiv.innerText = message;
        notificationsContainer.prepend(msgDiv);
        setTimeout(() => msgDiv.remove(), config.DAY_INTERVAL_MS - 100);
    }

    // --- Drag and Drop ---
    [devStage, opsStage, customerStage].forEach(stage => {
        stage.addEventListener('dragover', e => e.preventDefault());
        stage.addEventListener('drop', handleStageDrop);
    });
    upgrades.forEach(upgrade => {
        upgrade.addEventListener('dragover', e => e.preventDefault());
        upgrade.addEventListener('drop', handleUpgradeDrop);
    });

    function handleStageDrop(e) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const draggable = document.getElementById(id);
        const dropzone = e.target.closest('.stage');
        if (!draggable || !dropzone) return;

        dropzone.querySelector('.work-items').appendChild(draggable);

        if (dropzone.id === 'customer') {
            if (draggable.classList.contains('defect')) {
                leakedCount++;
                leakedCountSpan.innerText = leakedCount;
                draggable.remove();
                showNotification(i18n.notifications.defectLeaked, 'error');
                createAndAddWorkItem('unplanned');
                createAndAddWorkItem('unplanned');
            } else if (draggable.classList.contains('business')) {
                deliveredCount++;
                deliveredCountSpan.innerText = deliveredCount;
                draggable.remove();
                showNotification(i18n.notifications.projectDelivered, 'success');
            }
        }
        checkGameOver();
    }

    function handleUpgradeDrop(e) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const draggable = document.getElementById(id);
        const upgradeDiv = e.target.closest('.upgrade');
        if (draggable.classList.contains('internal') && !toolState[upgradeDiv.id]) {
            draggable.remove();
            toolState[upgradeDiv.id] = true;
            upgradeDiv.classList.add('purchased');
            upgradeDiv.innerText += i18n.purchasedSuffix;
            applyUpgradeEffect(upgradeDiv.id);
            showNotification(`${i18n.notifications.upgraded}${i18n.upgradeNames[upgradeDiv.id]}!`, 'info');
        }
    }

    function applyUpgradeEffect(toolId) {
        if (toolId === 'automated-testing') defectChance = config.IMPROVED_DEFECT_CHANCE;
        if (toolId === 'monitoring') unplannedWorkChance = config.IMPROVED_UNPLANNED_WORK_CHANCE;
    }

    function checkGameOver() {
        if (deliveredCount >= config.TARGET_DELIVERIES) endGame(true);
        else if (leakedCount >= config.MAX_LEAKED_DEFECTS) endGame(false);
    }

    // --- Event Listeners ---
    addBusinessProjectBtn.addEventListener('click', () => addWorkItem('business'));
    addInternalProjectBtn.addEventListener('click', () => addWorkItem('internal'));
    // restartBtn.addEventListener('click', initGame); // Will be re-enabled later

    async function addWorkItem(type) {
        const response = await fetch('/api/add_work', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: type }),
        });
        const newState = await response.json();
        renderState(newState);
    }

    // --- Drag and Drop ---
    Object.values(stageContainers).forEach(stageEl => {
        stageEl.addEventListener('dragover', e => e.preventDefault());
        stageEl.addEventListener('drop', handleStageDrop);
    });
    upgrades.forEach(upgrade => {
        upgrade.addEventListener('dragover', e => e.preventDefault());
        upgrade.addEventListener('drop', handleUpgradeDrop);
    });

    async function handleUpgradeDrop(e) {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('text/plain');
        const toolId = e.target.closest('.upgrade').id;

        // Basic frontend validation to prevent obviously wrong API calls
        const itemEl = document.getElementById(itemId);
        if (!itemEl || !itemEl.classList.contains('internal')) {
            showNotification("Только 'Внутренние проекты' могут быть использованы для улучшений!", 'error');
            return;
        }

        const response = await fetch('/api/purchase_upgrade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, toolId }),
        });

        if (response.ok) {
            const newState = await response.json();
            renderState(newState);
            showNotification(`${i18n.notifications.upgraded}${i18n.upgradeNames[toolId]}!`, 'success');
        } else {
            const error = await response.json();
            showNotification(`Не удалось улучшить: ${error.error}`, 'error');
        }
    }

    async function handleStageDrop(e) {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('text/plain');
        const targetStageEl = e.target.closest('.stage');
        if (!itemId || !targetStageEl) return;

        const targetStageId = targetStageEl.id;

        const response = await fetch('/api/move_work', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, targetStageId }),
        });

        if (response.ok) {
            const newState = await response.json();
            renderState(newState);
        } else {
            const error = await response.json();
            // This is a placeholder for a more specific notification
            showNotification(`Невозможно переместить: ${error.error}`, 'error');
        }
    }


    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');

    // --- Event Listeners ---
    chatSendBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });

    async function handleSendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Display user message
        addChatMessage(message, 'user');
        chatInput.value = '';

        // Display thinking message
        const thinkingMessage = addChatMessage('Думаю...', 'ai');

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });

        const data = await response.json();
        if (response.ok) {
            thinkingMessage.innerText = data.reply;
        } else {
            thinkingMessage.innerText = `Ошибка: ${data.error}`;
            thinkingMessage.style.color = 'red';
        }
    }

    function addChatMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}`;
        msgDiv.innerText = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
        return msgDiv;
    }

    // --- Start Game ---
    initGame();

    // --- Frontend Game Loop ---
    // Poll the backend for updates every 2 seconds
    setInterval(async () => {
        const response = await fetch('/api/game_state');
        const gameState = await response.json();
        renderState(gameState);
    }, 2000);
});
