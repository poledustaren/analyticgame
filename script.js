document.addEventListener('DOMContentLoaded', () => {
    // --- Config ---
    const config = {
        TARGET_DELIVERIES: 10,
        MAX_LEAKED_DEFECTS: 5,
        DAY_INTERVAL_MS: 5000,
        INITIAL_DEFECT_CHANCE: 0.40,
        IMPROVED_DEFECT_CHANCE: 0.05,
        INITIAL_UNPLANNED_WORK_CHANCE: 0.30,
        IMPROVED_UNPLANNED_WORK_CHANCE: 0.05,
        CHANGE_CHANCE_PER_DAY: 0.5
    };

    // --- DOM Elements ---
    const addBusinessProjectBtn = document.getElementById('add-business-project-btn');
    const addInternalProjectBtn = document.getElementById('add-internal-project-btn');
    const restartBtn = document.getElementById('restart-btn');
    const devStage = document.getElementById('dev').querySelector('.work-items');
    const opsStage = document.getElementById('ops').querySelector('.work-items');
    const customerStage = document.getElementById('customer').querySelector('.work-items');
    const upgrades = document.querySelectorAll('.upgrade');
    const deliveredCountSpan = document.getElementById('delivered-count');
    const dayCountSpan = document.getElementById('day-count');
    const leakedCountSpan = document.getElementById('leaked-count');
    const notificationsContainer = document.getElementById('notifications');

    // --- Game State ---
    let workItemId, deliveredCount, leakedCount, dayCount, gameLoop, toolState, defectChance, unplannedWorkChance;

    // --- Game Flow ---
    function initGame() {
        workItemId = 0;
        deliveredCount = 0;
        leakedCount = 0;
        dayCount = 1;
        toolState = { 'automated-testing': false, 'ci-cd-pipeline': false, 'monitoring': false };
        defectChance = config.INITIAL_DEFECT_CHANCE;
        unplannedWorkChance = config.INITIAL_UNPLANNED_WORK_CHANCE;

        // Reset UI
        [devStage, opsStage, customerStage].forEach(s => s.innerHTML = '');
        deliveredCountSpan.innerText = deliveredCount;
        leakedCountSpan.innerText = leakedCount;
        dayCountSpan.innerText = dayCount;
        notificationsContainer.innerHTML = '';
        upgrades.forEach(u => {
            u.classList.remove('purchased');
            u.innerText = u.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        });

        // Enable controls
        addBusinessProjectBtn.disabled = false;
        addInternalProjectBtn.disabled = false;
        restartBtn.style.display = 'none';

        // Start game loop
        gameLoop = setInterval(tickDay, config.DAY_INTERVAL_MS);
    }

    function tickDay() {
        dayCount++;
        dayCountSpan.innerText = dayCount;
        if (Math.random() < config.CHANGE_CHANCE_PER_DAY) createAndAddWorkItem('change');
        if (Math.random() < unplannedWorkChance) {
            createAndAddWorkItem('unplanned');
            showNotification('Unplanned work has arrived! The fires are spreading!', 'error');
        }
        if (toolState['ci-cd-pipeline']) {
            const itemsInDev = devStage.querySelectorAll('.work-item:not(.defect):not(.internal)');
            itemsInDev.forEach(item => opsStage.appendChild(item));
        }
        checkGameOver();
    }

    function endGame(isWin) {
        clearInterval(gameLoop);
        addBusinessProjectBtn.disabled = true;
        addInternalProjectBtn.disabled = true;
        restartBtn.style.display = 'inline-block';
        if (isWin) {
            showNotification('Congratulations! You completed The Phoenix Project!', 'win');
        } else {
            showNotification('Game Over! Too many defects reached the customer.', 'loss');
        }
    }

    // --- Core Functions ---
    function createAndAddWorkItem(type) {
        const workItem = document.createElement('div');
        workItem.classList.add('work-item', type);
        workItem.setAttribute('draggable', 'true');
        workItem.id = `work-item-${workItemId++}`;
        workItem.innerText = `${type.charAt(0).toUpperCase() + type.slice(1)} #${workItemId}`;
        if (Math.random() < defectChance) {
            workItem.classList.add('defect');
            workItem.innerText += ' (Defect!)';
            workItem.style.border = '3px solid red';
        }
        workItem.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', e.target.id));
        devStage.appendChild(workItem);
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
                showNotification('A DEFECT reached the customer! This generates more unplanned work!', 'error');
                createAndAddWorkItem('unplanned');
                createAndAddWorkItem('unplanned');
            } else if (draggable.classList.contains('business')) {
                deliveredCount++;
                deliveredCountSpan.innerText = deliveredCount;
                draggable.remove();
                showNotification('Business project delivered!', 'success');
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
            upgradeDiv.innerText += ' - Purchased!';
            applyUpgradeEffect(upgradeDiv.id);
            showNotification(`Upgraded ${upgradeDiv.id.replace(/-/g, ' ')}!`, 'info');
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
    restartBtn.addEventListener('click', initGame);
    addBusinessProjectBtn.addEventListener('click', () => createAndAddWorkItem('business'));
    addInternalProjectBtn.addEventListener('click', () => createAndAddWorkItem('internal'));

    // --- Start Game ---
    initGame();
});
