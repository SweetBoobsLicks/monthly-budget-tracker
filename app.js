const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const listEl = document.getElementById('transaction-list');
const form = document.getElementById('transaction-form');
const typeEl = document.getElementById('type');
const categoryEl = document.getElementById('category');
const dateEl = document.getElementById('date');
const amountEl = document.getElementById('amount');
const descEl = document.getElementById('description');
const currentMonthEl = document.getElementById('current-month');
const themeToggleEl = document.getElementById('theme-toggle');

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let expenseChart;

const categories = {
    expense: ['Housing', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Other'],
    income: ['Salary', 'Freelance', 'Investments', 'Gifts', 'Refunds', 'Other']
};

function init() {
    setCurrentMonth();
    setDefaultDate();
    populateCategories();
    applyStoredTheme();
    updateUI();
    setTimeout(hideLoadingScreen, 900);
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const appContainer = document.querySelector('.container');

    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }

    if (appContainer) {
        appContainer.classList.add('is-ready');
    }
}

function applyStoredTheme() {
    const savedTheme = localStorage.getItem('budget-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    document.body.classList.toggle('dark', isDark);
    updateThemeToggle(isDark);
}

function updateThemeToggle(isDark) {
    const icon = themeToggleEl.querySelector('i');
    const label = themeToggleEl.querySelector('span');

    icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    label.textContent = isDark ? 'Light' : 'Dark';
    themeToggleEl.setAttribute('aria-pressed', String(isDark));
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('budget-theme', isDark ? 'dark' : 'light');
    updateThemeToggle(isDark);
}

themeToggleEl.addEventListener('click', toggleTheme);

function setCurrentMonth() {
    const date = new Date();
    const options = { month: 'long', year: 'numeric' };
    currentMonthEl.innerText = date.toLocaleDateString('en-US', options);
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    dateEl.value = today;
}

function populateCategories() {
    const selectedType = typeEl.value;
    categoryEl.innerHTML = '';
    categories[selectedType].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.innerText = cat;
        categoryEl.appendChild(option);
    });
}

typeEl.addEventListener('change', populateCategories);

function updateUI() {
    updateDashboard();
    renderTransactions();
    updateChart();
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(value);
}

function updateDashboard() {
    const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);

    const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0).toFixed(2);
    const expense = (amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1).toFixed(2);

    balanceEl.innerText = formatCurrency(Number(total));
    incomeEl.innerText = `+${formatCurrency(Number(income))}`;
    expenseEl.innerText = `-${formatCurrency(Number(expense))}`;

    balanceEl.style.color = total < 0 ? 'var(--expense)' : 'var(--text-main)';
}

function renderTransactions() {
    listEl.innerHTML = '';

    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedTransactions.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No transactions yet.</p>';
        return;
    }

    sortedTransactions.forEach(t => {
        const sign = t.type === 'income' ? '+' : '-';
        const item = document.createElement('li');

        item.classList.add('transaction-item', `border-${t.type}`);

        item.innerHTML = `
            <div class="transaction-info">
                <span class="transaction-desc">${t.description}</span>
                <span class="transaction-meta">
                    <i class="fa-regular fa-calendar"></i> ${t.date} |
                    <i class="fa-solid fa-tag"></i> ${t.category}
                </span>
            </div>
            <div class="transaction-right">
                <span class="transaction-amount amt-${t.type}">${sign}${formatCurrency(Number(t.amount))}</span>
                <button class="btn-delete" onclick="deleteTransaction('${t.id}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        listEl.appendChild(item);
    });
}

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const newTransaction = {
        id: crypto.randomUUID(),
        type: typeEl.value,
        date: dateEl.value,
        category: categoryEl.value,
        amount: parseFloat(amountEl.value),
        description: descEl.value
    };

    transactions.push(newTransaction);

    updateUI();

    descEl.value = '';
    amountEl.value = '';
});

window.deleteTransaction = function(id) {
    transactions = transactions.filter(t => t.id !== id);
    updateUI();
};

function updateChart() {
    const expenses = transactions.filter(t => t.type === 'expense');

    const categoryTotals = expenses.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
    }, {});

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    const ctx = document.getElementById('expenseChart').getContext('2d');

    if (expenseChart) {
        expenseChart.destroy();
    }

    if (labels.length === 0) {
        return;
    }

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40', '#c9cbcf'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        font: { family: "'Inter', sans-serif" }
                    }
                }
            }
        }
    });
}

init();
