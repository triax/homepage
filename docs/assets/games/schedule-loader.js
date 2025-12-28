// 試合スケジュール情報を読み込んで表示する
async function loadSchedule() {
    try {
        const response = await fetch('./assets/games/2025.json');
        const data = await response.json();

        // タイトルを更新（例: "2025 SCHEDULE"）
        const titleElement = document.getElementById('schedule-title');
        if (titleElement && data.year) {
            titleElement.textContent = `${data.year} SCHEDULE`;
        }

        const container = document.getElementById('schedule-container');
        if (!container) return;

        container.innerHTML = '';

        // シーズンの順序を定義（表示したい順）
        const seasons = ['preseason', 'regularseason', 'postseason'];

        seasons.forEach(seasonKey => {
            const season = data[seasonKey];
            if (!season) return;

            // 試合データがあるか確認
            const games = season.games || (season.game ? [season.game] : []);
            if (games.length === 0) return;

            // シーズンタイトルを追加
            if (season.title) {
                const sectionHeader = createSeasonHeader(season.title);
                container.appendChild(sectionHeader);
            }

            // 試合カードを追加
            const ticketUrl = season.ticket;
            const isOpen = season.status === 'open';
            games.forEach(game => {
                const gameCard = createGameCard(game, ticketUrl, isOpen);
                container.appendChild(gameCard);
            });
        });

    } catch (error) {
        console.error('Failed to load schedule:', error);
    }
}

// シーズンヘッダーを作成
function createSeasonHeader(title) {
    const header = document.createElement('div');
    header.className = 'text-lg font-semibold text-gray-700 text-center mb-4 mt-6 first:mt-0';
    header.textContent = title;
    return header;
}

// 試合カードを作成
function createGameCard(game, ticketUrl, isOpen) {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-lg shadow hover:shadow-lg transition-shadow fade-in';

    // 日付をフォーマット (2025-09-07 -> 9/7)
    const dateObj = new Date(game.date);
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();

    // 曜日と祝日表示
    let dayLabel = game.dayOfWeek;
    if (game.holiday) {
        dayLabel += game.holiday;
    }

    // 試合結果があるかチェック
    const hasResult = game.result !== null;

    div.innerHTML = `
        <div class="flex flex-col sm:flex-row items-center p-4 gap-4">
            <div class="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div class="text-center sm:text-left sm:w-40">
                    <p class="font-bold text-lg">${month}/${day}(${dayLabel})</p>
                    <p class="text-sm text-gray-600">${game.kickoff} キックオフ</p>
                </div>
                <div class="flex-1 text-center sm:text-left">
                    ${hasResult ? createResultDisplay(game) : `<p class="font-semibold">vs ${game.opponent}</p>`}
                    <p class="text-sm text-gray-600">${game.venue.name}</p>
                </div>
            </div>
            <div class="flex gap-2">
                ${createMapButton(game.venue.mapsQuery)}
                ${createCalendarButton(game)}
                ${game.result?.stats?.url ? createStatsButton(game.result.stats.url) : ''}
                ${!hasResult && isOpen && ticketUrl ? createTicketButton(ticketUrl) : ''}
            </div>
        </div>
    `;

    return div;
}

// 試合結果表示を作成
function createResultDisplay(game) {
    const result = game.result;
    const winClass = result.win === true ? 'text-green-600' : result.win === false ? 'text-red-600' : 'text-gray-600';
    const winLabel = result.win === true ? 'WIN' : result.win === false ? 'LOSE' : 'DRAW';

    return `
        <div>
            <div class="flex items-center justify-center sm:justify-start gap-1 sm:gap-2">
                <span class="font-bold text-lg sm:text-xl w-6 sm:w-8 text-right tabular-nums">${result.score.team}</span>
                <span class="text-gray-400">-</span>
                <span class="font-bold text-lg sm:text-xl w-6 sm:w-8 text-left tabular-nums">${result.score.opponent}</span>
                <span class="font-semibold ${winClass} text-xs sm:text-sm w-10 sm:w-12">${winLabel}</span>
                <span class="hidden sm:inline text-gray-600">vs ${game.opponent}</span>
            </div>
            <p class="sm:hidden text-gray-600 text-sm text-center mt-0.5">vs ${game.opponent}</p>
        </div>
    `;
}

// Google Mapsボタン
function createMapButton(mapsQuery) {
    return `
        <button onclick="openGoogleMaps('${mapsQuery}')" class="p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors" title="会場マップ">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"></path>
            </svg>
        </button>
    `;
}

// Google Calendarボタン
function createCalendarButton(game) {
    return `
        <button onclick="addToGoogleCalendar('${game.date}', '${game.kickoff}', '${game.opponent}', '${game.venue.name}')" class="p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors" title="カレンダー追加">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"></path>
            </svg>
        </button>
    `;
}

// チケット購入ボタン
function createTicketButton(ticketUrl) {
    return `
        <a href="${ticketUrl}" target="_blank" class="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors" title="チケット購入">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"></path>
            </svg>
        </a>
    `;
}

// スタッツボタン
function createStatsButton(statsUrl) {
    return `
        <a href="${statsUrl}" target="_blank" class="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors" title="試合スタッツ">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"></path>
            </svg>
        </a>
    `;
}

// DOMContentLoadedイベントで実行
document.addEventListener('DOMContentLoaded', loadSchedule);
