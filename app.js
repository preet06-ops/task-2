// ==========================================================================
// 1. STATE MANAGEMENT & STORAGE PREFERENCE INITIALIZATION
// ==========================================================================
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentTheme = localStorage.getItem('theme') || 'light';
let generatedPlan = null;

// Document Elements Query Mapping
const todoForm = document.querySelector('#todo-form');
const todoInput = document.querySelector('#todo-input');
const todoList = document.querySelector('#todo-list');
const themeToggle = document.querySelector('#theme-toggle');
const backToTopBtn = document.querySelector('#back-to-top');
const itemsLeftSpan = document.querySelector('#items-left');
const clearCompletedBtn = document.querySelector('#clear-completed');
const progressBar = document.querySelector('#progress-bar');
const taskView = document.querySelector('#task-view');
const plannerView = document.querySelector('#planner-view');
const openPlannerBtn = document.querySelector('#open-planner');
const backToTasksBtn = document.querySelector('#back-to-tasks');
const dayChecklist = document.querySelector('#day-checklist');
const wakeTimeInput = document.querySelector('#wake-time');
const sleepTimeInput = document.querySelector('#sleep-time');
const energyLevelInput = document.querySelector('#energy-level');
const mainFocusInput = document.querySelector('#main-focus');
const generatePlanBtn = document.querySelector('#generate-plan');
const planOutput = document.querySelector('#plan-output');

// ==========================================================================
// 2. MAIN APPLICATION LOGIC & RENDERING
// ==========================================================================

// Initialize Application Configuration Lifecycle
function initApp() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    renderTodos();
    renderPlanner();
    setupEventListeners();
}

// Render DOM lists dynamically from state engine data structures
function renderTodos() {
    todoList.innerHTML = '';

    if (todos.length === 0) {
        todoList.innerHTML = `<li class="empty-state">No missions active. Add a task above!</li>`;
        updateMetrics();
        return;
    }

    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.setAttribute('data-id', todo.id);

        li.innerHTML = `
            <div class="todo-item-left">
                <label class="checkbox-wrapper">
                    <input type="checkbox" ${todo.completed ? 'checked' : ''} onclick="toggleTask(${todo.id})">
                    <span class="custom-checkmark">
                        <svg viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </span>
                </label>
                <span class="todo-text">${escapeHTML(todo.text)}</span>
            </div>
            <button type="button" class="delete-btn" data-delete-id="${todo.id}" aria-label="Delete item">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
        `;
        todoList.appendChild(li);
    });

    updateMetrics();
}

function renderPlanner() {
    const orderedTodos = generatedPlan?.tasks?.length ? generatedPlan.tasks : [...todos];

    if (orderedTodos.length === 0) {
        dayChecklist.innerHTML = '<li class="empty-state">Add tasks or type a main focus, then open the planner.</li>';
        planOutput.textContent = 'Type a main focus like study, ride bike, airport pickup, then generate a plan.';
        return;
    }

    dayChecklist.innerHTML = orderedTodos.map((todo, index) => `
        <li class="planner-item ${todo.completed ? 'checked' : ''}" data-id="${todo.id ?? index}">
            <label class="planner-check">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} ${todo.id ? `onchange="toggleTask(${todo.id})"` : ''}>
                <span class="planner-box"></span>
            </label>
            <div class="planner-item-body">
                <span class="planner-step">${index + 1}</span>
                <span class="planner-emoji">${getTaskEmoji(todo.text)}</span>
                <span class="planner-text">${escapeHTML(todo.text)}</span>
            </div>
        </li>
    `).join('');

}

// Add Item Execution Logic 
function addTodo(text) {
    const cleanText = text.trim();
    if (!cleanText) return;

    const newTodo = {
        id: Date.now(),
        text: cleanText,
        completed: false
    };

    todos.unshift(newTodo); // Add new tasks to the top of the stack
    saveAndRefresh();
}

// Toggle Task Status Class Modification
window.toggleTask = function (id) {
    todos = todos.map(todo => {
        if (todo.id === id) {
            return { ...todo, completed: !todo.completed };
        }
        return todo;
    });

    // Find item UI node in real-time to trigger animations instantly before general state sync
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
        element.classList.toggle('completed');
    }

    saveAndRefresh();
};

// Graceful element destruction pattern utilizing CSS transitions
window.deleteTask = function (id) {
    todos = todos.filter(todo => todo.id !== id);
    saveAndRefresh();
};

// ==========================================================================
// 3. AUXILIARY / COMPUTE SYSTEMS & METRICS TRACKING
// ==========================================================================

function updateMetrics() {
    const remainingTasks = todos.filter(t => !t.completed).length;
    const completedTasks = todos.filter(t => t.completed).length;
    const totalTasks = todos.length;

    // Remaining Task Counter Text
    itemsLeftSpan.textContent = `${remainingTasks} task${remainingTasks !== 1 ? 's' : ''} remaining`;

    // Dynamic Progress Percentage Calculation
    const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    progressBar.style.width = `${percentage}%`;
}

function saveAndRefresh() {
    localStorage.setItem('todos', JSON.stringify(todos));
    updateMetrics();
    renderTodos();
    renderPlanner();
}

function toMinutes(timeValue) {
    const [hours, minutes] = timeValue.split(':').map(Number);
    return (hours * 60) + minutes;
}

function toTimeString(totalMinutes) {
    const safeMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hours = Math.floor(safeMinutes / 60).toString().padStart(2, '0');
    const minutes = (safeMinutes % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function cleanFocusText(text) {
    return text
        .replace(/[.!?]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function createSuggestedTasks(focusText) {
    const normalized = cleanFocusText(focusText.toLowerCase());
    const suggestions = [];

    const addTask = (text, duration, emoji) => {
        if (!suggestions.some(task => task.text === text)) {
            suggestions.push({ id: null, text, completed: false, duration, emoji });
        }
    };

    if (/study|learn|exam|class|read|course|assignment|research/.test(normalized)) {
        addTask('Study block with notes and revision', 90, '📚');
        addTask('Quick practice or recap session', 60, '📝');
    }

    if (/ride bike|bike|cycle|cycling/.test(normalized)) {
        addTask('Bike ride and warm-up', 60, '🚴');
    }

    if (/airport|pick up|pickup|collect|drop off|drive/.test(normalized)) {
        addTask('Travel buffer and airport pickup', 120, '✈️');
    }

    if (/work|job|office|meeting|project|client|business|sales/.test(normalized)) {
        addTask('Focus work block and replies', 90, '💼');
    }

    if (/gym|fitness|workout|run|walk|sport|training|exercise|health/.test(normalized)) {
        addTask('Fitness session and recovery', 75, '💪');
    }

    if (/home|family|clean|cook|errand|shopping|organize|chore/.test(normalized)) {
        addTask('Home errands and personal admin', 60, '🏠');
    }

    const rawParts = normalized
        .split(/\b(?:and|then|after|before|,|&)\b/)
        .map(part => part.trim())
        .filter(Boolean)
        .filter(part => part.length > 2);

    rawParts.forEach(part => {
        if (/study|ride bike|bike|airport|pickup|pick up|work|gym|clean|cook|call|meeting|project|read|learn/.test(part)) {
            return;
        }

        const label = part.charAt(0).toUpperCase() + part.slice(1);
        addTask(label, 45, '✨');
    });

    if (suggestions.length === 0) {
        addTask('Main focus planning block', 75, '🎯');
    }

    return suggestions;
}

function buildSuggestedSchedule(tasks, wake, sleep, energyLevel, focusProfile) {
    const blocks = [];
    let cursor = wake + 30;

    blocks.push(`Wake up at ${toTimeString(wake)} and do a 30 minute start-up routine.`);
    blocks.push(`Focus mode: ${focusProfile.label} ${focusProfile.emoji} for ${focusProfile.priorities.join(', ')}.`);

    const energyDurations = {
        high: [90, 75, 60],
        medium: [75, 60, 45],
        low: [60, 45, 30]
    };
    const breakMinutes = {
        high: 15,
        medium: 20,
        low: 25
    };

    const durations = energyDurations[energyLevel] || energyDurations.medium;

    tasks.forEach((task, index) => {
        const duration = task.duration || durations[index % durations.length];
        const end = cursor + duration;
        blocks.push(`${toTimeString(cursor)} - ${toTimeString(end)}: ${task.emoji || getTaskEmoji(task.text)} ${task.text}`);
        cursor = end + (breakMinutes[energyLevel] || 20);
    });

    const lunchStart = wake + 180;
    const afternoonStart = Math.max(cursor, lunchStart + 60);
    const windDownStart = Math.max(afternoonStart + 180, sleep - 60);

    blocks.push(`${toTimeString(lunchStart)} - ${toTimeString(lunchStart + 60)}: lunch and reset.`);
    blocks.push(`${toTimeString(afternoonStart)} - ${toTimeString(Math.max(afternoonStart + 120, windDownStart))}: handle lighter tasks, commute, or buffers.`);
    blocks.push(`${toTimeString(windDownStart)} - ${toTimeString(sleep)}: review, prepare, and shut down.`);

    return blocks;
}

function getFocusProfile(focusText) {
    const normalized = focusText.toLowerCase();

    if (/study|learn|exam|class|read|course|assignment|research/.test(normalized)) {
        return {
            label: 'Study mode',
            emoji: '📚',
            energizer: 'Use calm focus blocks, short breaks, and one review slot in the evening.',
            priorities: ['deep reading', 'note review', 'practice questions'],
            vibe: 'sharp'
        };
    }

    if (/work|job|office|meeting|project|client|business|sales/.test(normalized)) {
        return {
            label: 'Work mode',
            emoji: '💼',
            energizer: 'Front-load deep work, keep a communication block, and end with planning.',
            priorities: ['deep work', 'messages', 'follow-ups'],
            vibe: 'productive'
        };
    }

    if (/gym|fitness|workout|run|walk|sport|training|exercise|health/.test(normalized)) {
        return {
            label: 'Fitness mode',
            emoji: '💪',
            energizer: 'Begin with movement, keep meals on time, and add recovery windows.',
            priorities: ['warm-up', 'training', 'recovery'],
            vibe: 'active'
        };
    }

    if (/home|family|clean|cook|errand|shopping|organize|chore/.test(normalized)) {
        return {
            label: 'Home mode',
            emoji: '🏠',
            energizer: 'Group errands together and leave one flexible block for the unexpected.',
            priorities: ['chores', 'errands', 'reset time'],
            vibe: 'steady'
        };
    }

    return {
        label: 'Focus mode',
        emoji: '🎯',
        energizer: 'Mix a strong first block with lighter tasks later in the day.',
        priorities: ['main priority', 'support task', 'cleanup'],
        vibe: 'balanced'
    };
}

function getTaskEmoji(taskText) {
    const normalized = taskText.toLowerCase();

    if (/study|read|learn|research|course|exam/.test(normalized)) return '📘';
    if (/work|email|meeting|project|office|client/.test(normalized)) return '💼';
    if (/gym|run|walk|sport|exercise|workout/.test(normalized)) return '🏃';
    if (/cook|food|meal|eat|lunch|dinner/.test(normalized)) return '🍽️';
    if (/clean|organize|home|room|laundry/.test(normalized)) return '🧹';
    if (/call|message|reply|follow/.test(normalized)) return '📞';
    return '✨';
}

function buildFocusBlocks(tasks, startMinutes, energyLevel) {
    const blockWeights = {
        high: [90, 75, 60],
        medium: [75, 60, 45],
        low: [60, 45, 30]
    };

    const breaks = {
        high: 15,
        medium: 20,
        low: 25
    };

    const weights = blockWeights[energyLevel] || blockWeights.medium;
    const breakMinutes = breaks[energyLevel] || breaks.medium;
    let cursor = startMinutes;

    return tasks.map((task, index) => {
        const duration = weights[index % weights.length];
        const end = cursor + duration;
        const entry = `${toTimeString(cursor)} - ${toTimeString(end)}: ${task.text}`;
        cursor = end + breakMinutes;
        return entry;
    });
}

function renderSuggestedProgram() {
    const focusText = cleanFocusText(mainFocusInput.value || '');
    const suggestedTasks = createSuggestedTasks(focusText);
    const shouldUseGeneratedPlan = focusText.length > 0;

    generatedPlan = shouldUseGeneratedPlan ? {
        focusText,
        tasks: suggestedTasks,
        profile: getFocusProfile(focusText)
    } : null;

    const wake = toMinutes(wakeTimeInput.value || '07:00');
    const sleep = toMinutes(sleepTimeInput.value || '22:00');
    const energyLevel = energyLevelInput.value;
    const mainFocus = focusText || 'your priorities';
    const orderedTasks = generatedPlan?.tasks?.length ? generatedPlan.tasks : [...todos].map(todo => ({ ...todo, duration: 60, emoji: getTaskEmoji(todo.text) }));
    const focusProfile = generatedPlan?.profile || getFocusProfile(mainFocus);

    const focusBlocks = buildSuggestedSchedule(orderedTasks, wake, sleep, energyLevel, focusProfile);
    const lunchStart = wake + 180;
    const eveningStart = Math.max(lunchStart + 180, sleep - 180);

    const summary = [
        `${focusProfile.emoji} ${focusProfile.label}: ${mainFocus}.`,
        `Wake up at ${toTimeString(wake)} and spend the first 30 minutes on water, planning, and light movement.`,
        focusProfile.energizer,
        `Use the generated checklist below and complete the highest-priority items first.`,
        `Take a reset around ${toTimeString(lunchStart)} for lunch and a short walk.`,
        `Close the day with review, prep for tomorrow, and a calm shutdown before ${toTimeString(sleep)}.`
    ];

    const programLines = focusBlocks.map((line, index) => `Task block ${index + 1}: ${line}`);

    if (!generatedPlan) {
        programLines.unshift(`AI focus signal: ${focusProfile.label} with ${focusProfile.priorities.join(', ')}.`);
    }

    planOutput.innerHTML = `
        <div class="plan-title-row"><span class="plan-title-emoji">${focusProfile.emoji}</span><strong>Suggested day program</strong><span class="plan-title-chip">${escapeHTML(focusProfile.label)}</span></div>
        <ul>
            ${summary.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
        </ul>
        <div class="program-lines">${programLines.map(item => `<p>${escapeHTML(item)}</p>`).join('')}</div>
    `;

    renderPlanner();
}

function showPlannerView() {
    renderPlanner();
    taskView.classList.add('hidden');
    plannerView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showTaskView() {
    plannerView.classList.add('hidden');
    taskView.classList.remove('hidden');
}

// Prevent injection cross-site scripting vulnerabilities
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// ==========================================================================
// 4. INTERACTIVE EVENT BINDINGS (Theme / Scroll Setup)
// ==========================================================================

function setupEventListeners() {
    // Intercept form routing to process values without layout reloads
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addTodo(todoInput.value);
        todoInput.value = '';
    });

    todoList.addEventListener('click', (event) => {
        const deleteButton = event.target.closest('.delete-btn');
        if (!deleteButton) return;

        const deleteId = Number(deleteButton.dataset.deleteId);
        if (!Number.isNaN(deleteId)) {
            deleteTask(deleteId);
        }
    });

    todoList.addEventListener('click', (event) => {
        const deleteButton = event.target.closest('.delete-btn');
        if (!deleteButton) return;

        const item = deleteButton.closest('.todo-item');
        if (!item) return;

        window.deleteTask(Number(item.dataset.id));
    });

    // Bulk deletion targeting complete nodes
    clearCompletedBtn.addEventListener('click', () => {
        const completedElements = document.querySelectorAll('.todo-item.completed');
        if (completedElements.length === 0) return;

        completedElements.forEach(el => el.classList.add('removing'));

        // Wait for removal animations to execute fully
        setTimeout(() => {
            todos = todos.filter(todo => !todo.completed);
            saveAndRefresh();
            renderTodos();
        }, 300);
    });

    // Adaptive Theme Switcher Toggle Control Trigger
    themeToggle.addEventListener('click', () => {
        currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
    });

    openPlannerBtn.addEventListener('click', () => {
        renderSuggestedProgram();
        showPlannerView();
    });
    backToTasksBtn.addEventListener('click', showTaskView);
    generatePlanBtn.addEventListener('click', () => {
        renderSuggestedProgram();
        showPlannerView();
    });

    [wakeTimeInput, sleepTimeInput, energyLevelInput, mainFocusInput].forEach(input => {
        input.addEventListener('input', renderSuggestedProgram);
        input.addEventListener('change', renderSuggestedProgram);
    });

    // Detect Page Scroll offset windows to reveal "Back to Top" configuration
    window.addEventListener('scroll', () => {
        if (window.scrollY > 250) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    // Linear Target Smooth Scroll Action
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Ignite Execution Sequence
document.addEventListener('DOMContentLoaded', initApp);