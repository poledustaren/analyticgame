/**
 * Cheats & Debug Mode Module
 * Доступ по /chita или ?debug=true
 */

// Состояние режима отладки
let debugMode = false;

// Показать модальное окно отладки
function showDebugModal() {
    const modal = document.createElement('div');
    modal.id = 'debug-modal';
    modal.className = 'debug-modal';
    modal.innerHTML = `
        <div class="debug-modal-content">
            <div class="debug-modal-header">
                <h2>🛠️ РЕЖИМ ОТЛАДКИ</h2>
                <button class="debug-close" onclick="closeDebugModal()">×</button>
            </div>

            <div class="debug-modal-body">
                <section class="debug-section">
                    <h3>📊 Выбор уровня</h3>
                    <div class="debug-level-grid">
                        ${[1, 2, 3, 4, 5, 6].map(level => `
                            <button class="debug-level-btn" data-level="${level}" onclick="setDebugLevel(${level})">
                                <span class="level-num">${level}</span>
                                <span class="level-name">${getLevelName(level)}</span>
                            </button>
                        `).join('')}
                    </div>
                </section>

                <section class="debug-section">
                    <h3>💰 Ресурсы</h3>
                    <div class="debug-controls">
                        <div class="debug-control">
                            <label>Budget:</label>
                            <input type="number" id="debug-budget" value="500000" step="10000">
                            <button onclick="setDebugBudget()">Установить</button>
                        </div>
                        <div class="debug-control">
                            <label>Stability:</label>
                            <input type="range" id="debug-stability" min="0" max="100" value="80">
                            <span id="debug-stability-val">80%</span>
                        </div>
                        <div class="debug-control">
                            <label>Morale:</label>
                            <input type="range" id="debug-morale" min="0" max="100" value="70">
                            <span id="debug-morale-val">70%</span>
                        </div>
                        <div class="debug-control">
                            <label>Unplanned Work:</label>
                            <input type="range" id="debug-unplanned" min="0" max="100" value="80">
                            <span id="debug-unplanned-val">80%</span>
                        </div>
                    </div>
                </section>

                <section class="debug-section">
                    <h3>⚡ Быстрые действия</h3>
                    <div class="debug-actions">
                        <button onclick="debugAddResource('developer')">+ Добавить разработчика</button>
                        <button onclick="debugAddResource('senior')">+ Добавить Senior</button>
                        <button onclick="debugCompleteAllTasks()">✅ Завершить все задачи</button>
                        <button onclick="debugSkipWeek()">⏭️ Пропустить неделю</button>
                        <button onclick="debugMaxMetrics()">🚀 Максимум всех метрик</button>
                        <button onclick="debugTriggerEvent()">🎲 Случайное событие</button>
                    </div>
                </section>

                <section class="debug-section">
                    <h3>📈 Level 4-6 метрики</h3>
                    <div class="debug-controls">
                        <div class="debug-control">
                            <label>Learning Rate:</label>
                            <input type="range" id="debug-learning" min="0" max="100" value="10">
                            <span id="debug-learning-val">10%</span>
                        </div>
                        <div class="debug-control">
                            <label>Experiment Velocity:</label>
                            <input type="range" id="debug-experiment" min="0" max="100" value="5">
                            <span id="debug-experiment-val">5</span>
                        </div>
                        <div class="debug-control">
                            <label>Bus Factor:</label>
                            <input type="range" id="debug-bus-factor" min="1" max="5" value="1">
                            <span id="debug-bus-factor-val">1</span>
                        </div>
                        <div class="debug-control">
                            <label>Knowledge:</label>
                            <input type="range" id="debug-knowledge" min="0" max="100" value="10">
                            <span id="debug-knowledge-val">10%</span>
                        </div>
                        <div class="debug-control">
                            <label>Process Efficiency:</label>
                            <input type="range" id="debug-efficiency" min="0" max="100" value="20">
                            <span id="debug-efficiency-val">20%</span>
                        </div>
                        <div class="debug-control">
                            <label>VSM Ratio (waste):</label>
                            <input type="range" id="debug-vsm" min="0" max="100" value="90">
                            <span id="debug-vsm-val">90%</span>
                        </div>
                    </div>
                </section>
            </div>

            <div class="debug-modal-footer">
                <button class="debug-apply-btn" onclick="applyDebugSettings()">✓ ПРИМЕНИТЬ</button>
                <button class="debug-close-btn" onclick="closeDebugModal()">Закрыть</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Обновить значения слайдеров
    updateDebugSliders();

    // Добавить обработчики для слайдеров
    document.querySelectorAll('#debug-modal input[type="range"]').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const valSpan = document.getElementById(e.target.id + '-val');
            if (valSpan) valSpan.textContent = e.target.value + (e.target.id.includes('knowledge') || e.target.id.includes('learning') || e.target.id.includes('efficiency') || e.target.id.includes('vsm') ? '%' : '');
        });
    });
}

function getLevelName(level) {
    const names = {
        1: 'The Stabilizer',
        2: 'The Visualizer',
        3: 'The Third Way',
        4: 'Knowledge Sharing',
        5: 'Continuous Improvement',
        6: 'Experimentation'
    };
    return names[level] || 'Unknown';
}

function closeDebugModal() {
    const modal = document.getElementById('debug-modal');
    if (modal) modal.remove();
}

function setDebugLevel(level) {
    // Подсветить выбранный уровень
    document.querySelectorAll('.debug-level-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (parseInt(btn.dataset.level) === level) {
            btn.classList.add('selected');
        }
    });

    // Сохранить выбранный уровень
    window.debugSelectedLevel = level;
}

function updateDebugSliders() {
    // Обновить слайдеры из текущего состояния
    fetch('/api/state')
        .then(r => r.json())
        .then(state => {
            if (state.budget) document.getElementById('debug-budget').value = state.budget;
            if (state.stability) {
                document.getElementById('debug-stability').value = state.stability;
                document.getElementById('debug-stability-val').textContent = state.stability + '%';
            }
            if (state.morale) {
                document.getElementById('debug-morale').value = state.morale;
                document.getElementById('debug-morale-val').textContent = state.morale + '%';
            }
            if (state.unplanned_work) {
                document.getElementById('debug-unplanned').value = state.unplanned_work;
                document.getElementById('debug-unplanned-val').textContent = state.unplanned_work + '%';
            }
            if (state.learning_rate) {
                document.getElementById('debug-learning').value = state.learning_rate;
                document.getElementById('debug-learning-val').textContent = state.learning_rate + '%';
            }
            if (state.experiment_velocity) {
                document.getElementById('debug-experiment').value = state.experiment_velocity;
                document.getElementById('debug-experiment-val').textContent = state.experiment_velocity;
            }
            if (state.bus_factor) {
                document.getElementById('debug-bus-factor').value = state.bus_factor;
                document.getElementById('debug-bus-factor-val').textContent = state.bus_factor;
            }
            if (state.knowledge) {
                document.getElementById('debug-knowledge').value = state.knowledge;
                document.getElementById('debug-knowledge-val').textContent = state.knowledge + '%';
            }
            if (state.process_efficiency) {
                document.getElementById('debug-efficiency').value = state.process_efficiency;
                document.getElementById('debug-efficiency-val').textContent = state.process_efficiency + '%';
            }
            if (state.vsm_ratio) {
                document.getElementById('debug-vsm').value = state.vsm_ratio;
                document.getElementById('debug-vsm-val').textContent = state.vsm_ratio + '%';
            }

            // Выбрать текущий уровень
            if (state.level) {
                setDebugLevel(state.level);
            }
        });
}

// Применить настройки отладки
async function applyDebugSettings() {
    const settings = {
        level: window.debugSelectedLevel || 1,
        budget: parseInt(document.getElementById('debug-budget').value),
        stability: parseInt(document.getElementById('debug-stability').value),
        morale: parseInt(document.getElementById('debug-morale').value),
        unplanned_work: parseInt(document.getElementById('debug-unplanned').value),
        learning_rate: parseInt(document.getElementById('debug-learning').value),
        experiment_velocity: parseInt(document.getElementById('debug-experiment').value),
        bus_factor: parseInt(document.getElementById('debug-bus-factor').value),
        knowledge: parseInt(document.getElementById('debug-knowledge').value),
        process_efficiency: parseInt(document.getElementById('debug-efficiency').value),
        vsm_ratio: parseInt(document.getElementById('debug-vsm').value)
    };

    const response = await fetch('/api/debug/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    });

    const result = await response.json();
    if (result.success) {
        closeDebugModal();
        // Перезагрузить состояние
        window.location.reload();
    } else {
        alert('Ошибка: ' + result.error);
    }
}

// Быстрые действия
async function setDebugBudget() {
    const budget = parseInt(document.getElementById('debug-budget').value);
    await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'debug_set_budget', budget })
    });
}

async function debugAddResource(type) {
    await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'debug_add_resource', resource_type: type })
    });
    window.location.reload();
}

async function debugCompleteAllTasks() {
    await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'debug_complete_all' })
    });
    window.location.reload();
}

async function debugSkipWeek() {
    await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'advance_week' })
    });
    window.location.reload();
}

async function debugMaxMetrics() {
    const settings = {
        level: 6,
        budget: 1000000,
        stability: 100,
        morale: 100,
        unplanned_work: 0,
        learning_rate: 100,
        experiment_velocity: 100,
        bus_factor: 5,
        knowledge: 100,
        process_efficiency: 100,
        vsm_ratio: 10
    };

    await fetch('/api/debug/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    });
    window.location.reload();
}

async function debugTriggerEvent() {
    await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'debug_trigger_event' })
    });
    window.location.reload();
}

// Проверка URL при загрузке
function checkDebugMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    if (path === '/chita' || path === '/debug' || urlParams.get('debug') === 'true') {
        debugMode = true;
        // Ждём загрузки состояния
        setTimeout(showDebugModal, 500);
    }
}

// Горячая клавиша для отладки
document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+D
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        showDebugModal();
    }
});

// Экспортируем функции
window.showDebugModal = showDebugModal;
window.closeDebugModal = closeDebugModal;
window.setDebugLevel = setDebugLevel;
window.applyDebugSettings = applyDebugSettings;
window.setDebugBudget = setDebugBudget;
window.debugAddResource = debugAddResource;
window.debugCompleteAllTasks = debugCompleteAllTasks;
window.debugSkipWeek = debugSkipWeek;
window.debugMaxMetrics = debugMaxMetrics;
window.debugTriggerEvent = debugTriggerEvent;

export { checkDebugMode, debugMode };
