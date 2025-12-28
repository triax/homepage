/**
 * メンバー募集ダイアログの表示制御
 * - 初回訪問時: 大きいダイアログを表示
 * - 「もう表示しない」チェック時: localStorageに保存し、次回以降は自動表示しない
 * - 最小化バッジは常に表示（クリックでダイアログ再表示）
 */
(function() {
    const STORAGE_KEY = 'triax_hideRecruitDialog';

    const dialog = document.getElementById('recruit-dialog');
    const badge = document.getElementById('recruit-badge');
    const minimizeBtn = document.getElementById('minimize-dialog-btn');
    const checkbox = document.getElementById('hide-dialog-checkbox');

    if (!dialog || !badge || !minimizeBtn || !checkbox) {
        console.warn('recruit-dialog: Required elements not found');
        return;
    }

    /**
     * 初期表示
     */
    function init() {
        const shouldHideDialog = localStorage.getItem(STORAGE_KEY) === 'true';

        // バッジは常に表示
        badge.classList.remove('hidden');

        // 「もう表示しない」が設定されていなければダイアログを表示
        if (!shouldHideDialog) {
            dialog.classList.remove('hidden');
        }
    }

    /**
     * ダイアログを閉じる
     */
    function closeDialog() {
        dialog.classList.add('hidden');
    }

    /**
     * ダイアログを開く
     */
    function openDialog() {
        dialog.classList.remove('hidden');
    }

    // 最小化ボタンクリック
    minimizeBtn.addEventListener('click', function() {
        // チェックボックスがONなら次回以降非表示
        if (checkbox.checked) {
            localStorage.setItem(STORAGE_KEY, 'true');
        }
        closeDialog();
    });

    // バッジクリック → ダイアログ再表示
    badge.addEventListener('click', function() {
        openDialog();
    });

    // オーバーレイ（背景）クリックで閉じる
    dialog.addEventListener('click', function(e) {
        // ダイアログ自体（オーバーレイ部分）をクリックした場合のみ閉じる
        if (e.target === this || e.target.classList.contains('bg-opacity-60')) {
            closeDialog();
        }
    });

    // DOMContentLoaded後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
