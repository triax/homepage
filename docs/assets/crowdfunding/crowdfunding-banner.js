/**
 * クラウドファンディング告知カード（画面右下に固定表示）
 * - 設定は index.json（url, title, description, thumbnail, endsAt）で管理
 * - ページ読み込みから少し遅れてスライドイン表示
 * - 「×」で閉じるとそのセッション中は非表示（sessionStorage）。リロードで再表示
 * - endsAt（YYYY-MM-DD）を過ぎたら表示しない（計測用リンクは index.json の url を差し替える）
 */
(function () {
    const CONFIG_URL = './assets/crowdfunding/index.json';
    const STORAGE_KEY = 'triax_hideCrowdfundingBanner';
    const SHOW_DELAY = 1500; // ファーストペイントと競合しないよう少し遅らせる

    function isExpired(endsAt) {
        return Boolean(endsAt) && new Date() > new Date(`${endsAt}T23:59:59+09:00`);
    }

    function createBanner({ url, title, description, thumbnail }) {
        const banner = document.createElement('div');
        banner.id = 'crowdfunding-banner';
        banner.className = 'fixed bottom-4 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] translate-y-8 opacity-0 transition-all duration-500 ease-out motion-reduce:transition-none';
        banner.innerHTML = `
            <a href="${url}" target="_blank" rel="noopener"
               class="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                <img src="${thumbnail}" alt="" class="w-16 h-16 rounded-lg object-cover flex-shrink-0">
                <div class="min-w-0 flex-1">
                    <p class="font-bold text-sm text-gray-900 leading-tight">${title}</p>
                    <p class="text-xs text-gray-600 truncate mt-1">${description}</p>
                    <p class="text-xs font-semibold text-red-600 mt-1">支援する →</p>
                </div>
            </a>
            <button type="button" aria-label="閉じる"
                    class="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-gray-800 text-white text-sm leading-none flex items-center justify-center shadow hover:bg-gray-600 transition-colors">
                &times;
            </button>
        `;
        banner.querySelector('button').addEventListener('click', () => {
            sessionStorage.setItem(STORAGE_KEY, 'true');
            banner.remove();
        });
        return banner;
    }

    function showBanner(config) {
        const banner = createBanner(config);
        document.body.appendChild(banner);
        // 挿入直後の初期スタイルを確定させてから解除し、スライドインのトランジションを発火させる
        void banner.offsetHeight;
        banner.classList.remove('translate-y-8', 'opacity-0');
    }

    async function init() {
        if (sessionStorage.getItem(STORAGE_KEY) === 'true') return;
        try {
            const response = await fetch(CONFIG_URL);
            const config = await response.json();
            if (isExpired(config.endsAt)) return;
            setTimeout(() => showBanner(config), SHOW_DELAY);
        } catch (error) {
            console.error('Failed to load crowdfunding config:', error);
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
