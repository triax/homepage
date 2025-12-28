/**
 * メンバー募集ダイアログの表示制御
 * - 初回訪問時: 大きいダイアログを表示
 * - 「もう表示しない」チェック時: localStorageに保存し、次回以降は自動表示しない
 * - 最小化バッジは常に表示（クリックでダイアログ再表示）
 * - アニメーション: 最小化時はバッジに収束、展開時はバッジから展開
 */
(function() {
    const STORAGE_KEY = 'triax_hideRecruitDialog';
    const ANIMATION_DURATION = 400; // CSSと同期（0.4s = 400ms）

    const dialog = document.getElementById('recruit-dialog');
    const badge = document.getElementById('recruit-badge');
    const minimizeBtn = document.getElementById('minimize-dialog-btn');
    const checkbox = document.getElementById('hide-dialog-checkbox');

    if (!dialog || !badge || !minimizeBtn || !checkbox) {
        console.warn('recruit-dialog: Required elements not found');
        return;
    }

    let isAnimating = false;

    /**
     * 初期表示
     */
    function init() {
        const shouldHideDialog = localStorage.getItem(STORAGE_KEY) === 'true';

        // バッジは常に表示
        badge.classList.remove('hidden');

        // 「もう表示しない」が設定されていなければダイアログを表示
        if (!shouldHideDialog) {
            showDialog(false); // 初回はアニメーションなし
        }
    }

    /**
     * ダイアログを表示（バッジから展開）
     * @param {boolean} animate - アニメーションするか
     */
    function showDialog(animate = true) {
        if (isAnimating) return;

        if (animate) {
            isAnimating = true;

            // 初期状態: 縮小位置から
            dialog.classList.remove('hidden');
            dialog.classList.add('dialog-expanding');

            // 次フレームで展開開始
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    dialog.classList.remove('dialog-expanding');
                    dialog.classList.add('dialog-visible');

                    setTimeout(() => {
                        isAnimating = false;
                    }, ANIMATION_DURATION);
                });
            });
        } else {
            // アニメーションなし（初回表示）
            dialog.classList.remove('hidden');
            dialog.classList.add('dialog-visible');
        }
    }

    /**
     * ダイアログを閉じる（バッジへ収束）
     */
    function hideDialog() {
        if (isAnimating) return;
        isAnimating = true;

        // 収束アニメーション開始
        dialog.classList.remove('dialog-visible');
        dialog.classList.add('dialog-minimizing');

        // アニメーション完了後に非表示
        setTimeout(() => {
            dialog.classList.add('hidden');
            dialog.classList.remove('dialog-minimizing');
            isAnimating = false;
        }, ANIMATION_DURATION);
    }

    // 最小化ボタンクリック
    minimizeBtn.addEventListener('click', function() {
        // チェックボックスがONなら次回以降非表示
        if (checkbox.checked) {
            localStorage.setItem(STORAGE_KEY, 'true');
        }
        hideDialog();
    });

    // バッジクリック → ダイアログ再表示
    badge.addEventListener('click', function() {
        showDialog(true);
    });

    // オーバーレイ（背景）クリックで閉じる
    dialog.addEventListener('click', function(e) {
        // ダイアログ自体（オーバーレイ部分）をクリックした場合のみ閉じる
        if (e.target === this || e.target.classList.contains('bg-opacity-[0.8]')) {
            hideDialog();
        }
    });

    // DOMContentLoaded後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
