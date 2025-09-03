// グローバル変数
let allMembers = [];
let currentPosition = 'ALL';
let extensionAttempts = {};
let imageMapping = {};

// Google Maps リンクを開く
function openGoogleMaps(venue) {
    const venueMap = {
        '富士通スタジアム川崎': 'https://www.google.com/maps/search/富士通スタジアム川崎',
        'アミノバイタルフィールド': 'https://www.google.com/maps/search/アミノバイタルフィールド'
    };

    const url = venueMap[venue] || `https://www.google.com/maps/search/${encodeURIComponent(venue)}`;
    window.open(url, '_blank');
}

// Google カレンダーに追加
function addToGoogleCalendar(date, time, opponent, venue) {
    // 日付と時間をパース
    const [hours, minutes] = time.split(':');
    const startDateTime = new Date(`${date}T${hours}:${minutes}:00+09:00`);
    const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000); // 3時間後を終了時刻とする

    // Google Calendar用のフォーマット (YYYYMMDDTHHmmss)
    const formatDateTime = (date) => {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const startStr = formatDateTime(startDateTime);
    const endStr = formatDateTime(endDateTime);

    // イベントの詳細
    const title = `Club TRIAX vs ${opponent}`;
    const details = `Club TRIAXの試合\n対戦相手: ${opponent}\n会場: ${venue}\nキックオフ: ${time}`;
    const location = venue;

    // Google Calendar URL作成
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: `${startStr}/${endStr}`,
        details: details,
        location: location,
        ctz: 'Asia/Tokyo'
    });

    const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
    window.open(url, '_blank');
}

// 画像マッピングを読み込む
async function loadImageMapping() {
    try {
        const response = await fetch('image-mapping.json');
        if (response.ok) {
            imageMapping = await response.json();
            console.log('Image mapping loaded:', Object.keys(imageMapping).length, 'entries');
        }
    } catch (error) {
        console.warn('Could not load image mapping:', error);
    }
}

// Google Drive IDを抽出
function extractGoogleDriveId(url) {
    const match = url.match(/id=([^&]+)/);
    return match ? match[1] : null;
}

// 画像エラーハンドリング
function handleImageError(img) {
    const googleDriveId = img.dataset.googleDriveId;
    if (!googleDriveId) {
        img.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23e5e7eb%22 width=%22100%22 height=%22100%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%239ca3af%22 font-family=%22sans-serif%22 font-size=%2216%22>No Image</text></svg>';
        return;
    }

    // 試した拡張子を記録
    if (!extensionAttempts[googleDriveId]) {
        extensionAttempts[googleDriveId] = [];
    }

    const extensions = ['jpg', 'png', 'gif', 'webp', 'heif', 'heic'];
    const currentSrc = img.src;
    const currentExt = currentSrc.split('.').pop();

    extensionAttempts[googleDriveId].push(currentExt);

    // 次の拡張子を試す
    const nextExt = extensions.find(ext => !extensionAttempts[googleDriveId].includes(ext));
    if (nextExt) {
        img.src = `assets/members/${googleDriveId}.${nextExt}`;
    } else {
        // すべての拡張子を試した場合はプレースホルダー
        img.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23e5e7eb%22 width=%22100%22 height=%22100%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%239ca3af%22 font-family=%22sans-serif%22 font-size=%2216%22>No Image</text></svg>';
    }
}

// MIMEタイプから拡張子を取得
function getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/heif': 'heif',
        'image/heic': 'heic'
    };
    return mimeToExt[mimeType] || 'jpg';
}

// Google Drive URLを画像表示用に変換（新しいAPI形式対応）
function convertGoogleDriveUrl(urlOrObject) {
    // 新しいAPI形式（オブジェクト）の場合
    if (typeof urlOrObject === 'object' && urlOrObject.url) {
        const googleDriveId = extractGoogleDriveId(urlOrObject.url);
        if (googleDriveId) {
            const extension = getExtensionFromMimeType(urlOrObject.mime_type);
            return `assets/members/${googleDriveId}.${extension}`;
        }
        return urlOrObject.url;
    }

    // 旧形式（文字列URL）の場合
    const googleDriveId = extractGoogleDriveId(urlOrObject);
    if (googleDriveId && imageMapping[googleDriveId]) {
        // マッピングから正しいファイル名を取得
        return `assets/members/${imageMapping[googleDriveId]}`;
    } else if (googleDriveId) {
        // マッピングがない場合はデフォルトでjpgを試す
        return `assets/members/${googleDriveId}.jpg`;
    }
    return urlOrObject;
}

// メンバーデータ取得
async function fetchRoster() {
    try {
        const response = await fetch('assets/roster.json');
        const data = await response.json();

        // 画像URLを変換
        if (data && data.members) {
            data.members.forEach(member => {
                if (member.photos) {
                    if (member.photos.serious) {
                        member.photos.serious = convertGoogleDriveUrl(member.photos.serious);
                    }
                    if (member.photos.casual && Array.isArray(member.photos.casual)) {
                        member.photos.casual = member.photos.casual.map(photo =>
                            convertGoogleDriveUrl(photo)
                        );
                    }
                }
            });
        }

        return data;
    } catch (error) {
        console.error('Failed to fetch roster:', error);
        return null;
    }
}

// メンバーカード作成
function createMemberCard(member) {
    const card = document.createElement('div');
    const hasCasualPhotos = member.photos.casual && member.photos.casual.length > 0;
    card.className = `member-card bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow fade-in ${hasCasualPhotos ? 'flip-card' : ''}`;
    // member.photos.seriousは既に文字列に変換されている
    const seriousPhotoUrl = member.photos.serious;
    const googleDriveId = extractGoogleDriveId(seriousPhotoUrl);

    if (hasCasualPhotos) {
        // casual写真がある場合はflip対応カード（写真部分のみflip）
        const casualPhoto = member.photos.casual[Math.floor(Math.random() * member.photos.casual.length)];
        // casualPhotoは既に文字列に変換されている
        const casualPhotoUrl = casualPhoto;
        const casualGoogleDriveId = extractGoogleDriveId(casualPhotoUrl);

        card.innerHTML = `
                    <!-- 写真部分（flip対象） -->
                    <div class="aspect-square bg-gray-200 relative overflow-hidden flip-container">
                        <div class="flip-card-inner">
                            <!-- 表面: serious写真 -->
                            <div class="flip-card-front">
                                <img data-src="${member.photos.serious}"
                                     data-google-drive-id="${googleDriveId || ''}"
                                     alt="${member.name.default}"
                                     class="lazy-load w-full h-full object-cover member-image"
                                     onerror="handleImageError(this)">
                            </div>
                            <!-- 裏面: casual写真 -->
                            <div class="flip-card-back">
                                <img data-src="${casualPhoto}"
                                     data-google-drive-id="${casualGoogleDriveId || ''}"
                                     alt="${member.name.default} casual"
                                     class="lazy-load w-full h-full object-cover member-image"
                                     onerror="handleImageError(this)">
                            </div>
                        </div>
                        <!-- 背番号（flipの外側に配置） -->
                        ${member.jersey ? `<div class="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm z-10">
                            #${member.jersey}
                        </div>` : ''}
                    </div>
                    <!-- 情報部分（常に表示） -->
                    <div class="p-4">
                        <h3 class="font-bold text-lg mb-1">${member.name.default}</h3>
                        <p class="text-primary font-semibold">${member.position}</p>
                        ${member.role ? `<p class="text-sm text-gray-600 mt-1">${member.role}</p>` : ''}
                    </div>
                `;

        // flip対応カードは詳細モーダルを別途処理
        card.addEventListener('click', (e) => {
            if (!card.classList.contains('flipped')) {
                e.stopPropagation();
                showMemberDetail(member);
            }
        });
    } else {
        // casual写真がない場合は従来のカード
        card.innerHTML = `
                    <div class="aspect-square bg-gray-200 relative overflow-hidden">
                        <img data-src="${member.photos.serious}"
                             data-google-drive-id="${googleDriveId || ''}"
                             alt="${member.name.default}"
                             class="lazy-load w-full h-full object-cover member-image"
                             onerror="handleImageError(this)">
                        ${member.jersey ? `<div class="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                            #${member.jersey}
                        </div>` : ''}
                    </div>
                    <div class="p-4">
                        <h3 class="font-bold text-lg mb-1">${member.name.default}</h3>
                        <p class="text-primary font-semibold">${member.position}</p>
                        ${member.role ? `<p class="text-sm text-gray-600 mt-1">${member.role}</p>` : ''}
                    </div>
                `;

        // クリックイベント
        card.addEventListener('click', () => showMemberDetail(member));
    }

    return card;
}

// メンバー詳細モーダル表示
function showMemberDetail(member) {
    const modalContent = document.getElementById('modal-content');

    // すべての画像を統合（serious + casual）
    let allPhotos = [];
    if (member.photos.serious) {
        allPhotos.push(member.photos.serious);
    }
    if (member.photos.casual && Array.isArray(member.photos.casual)) {
        allPhotos = allPhotos.concat(member.photos.casual);
    }

    // カルーセル用の変数
    let currentPhotoIndex = 0;
    const hasMultiplePhotos = allPhotos.length > 1;

    // HTMLを生成
    modalContent.innerHTML = `
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <!-- カルーセルコンテナ -->
                        <div class="relative" id="carousel-container">
                            <!-- 画像表示エリア -->
                            <div class="relative overflow-hidden rounded-lg bg-gray-200">
                                <img id="carousel-image"
                                     src="${allPhotos[0]}"
                                     data-google-drive-id="${extractGoogleDriveId(allPhotos[0]) || ''}"
                                     alt="${member.name.default}"
                                     class="w-full h-full object-cover transition-opacity duration-300"
                                     onerror="handleImageError(this)">

                                ${hasMultiplePhotos ? `
                                    <!-- ナビゲーションボタン -->
                                    <button id="carousel-prev" class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                        </svg>
                                    </button>
                                    <button id="carousel-next" class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                        </svg>
                                    </button>

                                    <!-- インジケーター -->
                                    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                        ${allPhotos.map((_, index) => `
                                            <button class="carousel-indicator w-2 h-2 rounded-full transition-all ${index === 0 ? 'bg-white w-6' : 'bg-white/50'}" data-index="${index}"></button>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>

                            ${hasMultiplePhotos ? `
                                <!-- 画像カウンター -->
                                <div class="text-center mt-2 text-sm text-gray-600">
                                    <span id="carousel-counter">1 / ${allPhotos.length}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold mb-2">${member.name.default}</h3>
                        ${member.name.hiragana ? `<p class="text-gray-600 mb-1">${member.name.hiragana}</p>` : ''}
                        ${member.name.alphabet ? `<p class="text-gray-600 mb-4">${member.name.alphabet}</p>` : ''}

                        <div class="flex items-center gap-4 mb-6">
                            ${member.jersey ? `<span class="bg-red-600 text-white px-3 py-1 rounded-full font-bold">#${member.jersey}</span>` : ''}
                            <span class="font-semibold text-lg">${member.position}</span>
                            ${member.role ? `<span class="text-gray-600">${member.role}</span>` : ''}
                        </div>

                        <dl class="space-y-3">
                            ${member.university ? `
                                <div>
                                    <dt class="font-semibold text-gray-700">出身大学</dt>
                                    <dd>${member.university}</dd>
                                </div>
                            ` : ''}
                            ${member.enthusiasm ? `
                                <div>
                                    <dt class="font-semibold text-gray-700">意気込み</dt>
                                    <dd>${member.enthusiasm}</dd>
                                </div>
                            ` : ''}
                            ${member.watchme ? `
                                <div>
                                    <dt class="font-semibold text-gray-700">注目ポイント</dt>
                                    <dd>${member.watchme}</dd>
                                </div>
                            ` : ''}
                            ${member.hobbies ? `
                                <div>
                                    <dt class="font-semibold text-gray-700">趣味</dt>
                                    <dd>${member.hobbies}</dd>
                                </div>
                            ` : ''}
                            ${member.favorite ? `
                                <div>
                                    <dt class="font-semibold text-gray-700">最近の推し</dt>
                                    <dd>${member.favorite}</dd>
                                </div>
                            ` : ''}
                            ${member.what_i_like_about_triax ? `
                                <div>
                                    <dt class="font-semibold text-gray-700">TRIAXの好きなところ</dt>
                                    <dd>${member.what_i_like_about_triax}</dd>
                                </div>
                            ` : ''}
                        </dl>
                    </div>
                </div>
            `;

    // カルーセル機能を初期化（複数画像がある場合のみ）
    if (hasMultiplePhotos) {
        // 画像切り替え関数
        function updateCarouselImage(index) {
            currentPhotoIndex = index;
            const image = document.getElementById('carousel-image');
            const counter = document.getElementById('carousel-counter');
            const indicators = document.querySelectorAll('.carousel-indicator');

            // 画像を更新
            image.style.opacity = '0';
            setTimeout(() => {
                image.src = allPhotos[index];
                image.dataset.googleDriveId = extractGoogleDriveId(allPhotos[index]) || '';
                image.style.opacity = '1';
            }, 150);

            // カウンターを更新
            if (counter) {
                counter.textContent = `${index + 1} / ${allPhotos.length}`;
            }

            // インジケーターを更新
            indicators.forEach((indicator, i) => {
                if (i === index) {
                    indicator.classList.add('bg-white', 'w-6');
                    indicator.classList.remove('bg-white/50');
                } else {
                    indicator.classList.remove('bg-white', 'w-6');
                    indicator.classList.add('bg-white/50');
                }
            });
        }

        // イベントリスナーを設定（少し遅延させて確実にDOMが生成されてから）
        setTimeout(() => {
            // 前へボタン
            const prevBtn = document.getElementById('carousel-prev');
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    const newIndex = currentPhotoIndex === 0 ? allPhotos.length - 1 : currentPhotoIndex - 1;
                    updateCarouselImage(newIndex);
                });
            }

            // 次へボタン
            const nextBtn = document.getElementById('carousel-next');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    const newIndex = currentPhotoIndex === allPhotos.length - 1 ? 0 : currentPhotoIndex + 1;
                    updateCarouselImage(newIndex);
                });
            }

            // インジケーター
            document.querySelectorAll('.carousel-indicator').forEach((indicator, index) => {
                indicator.addEventListener('click', () => {
                    updateCarouselImage(index);
                });
            });

            // タッチ/スワイプ対応
            const container = document.getElementById('carousel-container');
            let touchStartX = 0;
            let touchEndX = 0;

            container.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            });

            container.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            });

            function handleSwipe() {
                const swipeThreshold = 50;
                const diff = touchStartX - touchEndX;

                if (Math.abs(diff) > swipeThreshold) {
                    if (diff > 0) {
                        // 左スワイプ → 次の画像
                        const newIndex = currentPhotoIndex === allPhotos.length - 1 ? 0 : currentPhotoIndex + 1;
                        updateCarouselImage(newIndex);
                    } else {
                        // 右スワイプ → 前の画像
                        const newIndex = currentPhotoIndex === 0 ? allPhotos.length - 1 : currentPhotoIndex - 1;
                        updateCarouselImage(newIndex);
                    }
                }
            }

            // キーボードナビゲーション（モーダルが開いている時のみ）
            function handleKeyPress(e) {
                if (!document.getElementById('member-modal').classList.contains('hidden')) {
                    if (e.key === 'ArrowLeft') {
                        const newIndex = currentPhotoIndex === 0 ? allPhotos.length - 1 : currentPhotoIndex - 1;
                        updateCarouselImage(newIndex);
                    } else if (e.key === 'ArrowRight') {
                        const newIndex = currentPhotoIndex === allPhotos.length - 1 ? 0 : currentPhotoIndex + 1;
                        updateCarouselImage(newIndex);
                    }
                }
            }

            document.addEventListener('keydown', handleKeyPress);

            // モーダルが閉じられたときにイベントリスナーを削除
            const modal = document.getElementById('member-modal');
            const closeModalBtn = document.getElementById('close-modal');
            const removeKeyListener = () => {
                document.removeEventListener('keydown', handleKeyPress);
            };

            closeModalBtn.addEventListener('click', removeKeyListener, { once: true });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    removeKeyListener();
                }
            }, { once: true });
        }, 0);
    }

    document.getElementById('member-modal').classList.remove('hidden');
}

// ポジションフィルター
function filterByPosition(position) {
    currentPosition = position;
    displayMembers();

    // ボタンのスタイル更新
    document.querySelectorAll('.position-filter').forEach(btn => {
        if (btn.dataset.position === position) {
            btn.className = 'position-filter px-4 py-2 rounded-full bg-red-600 text-white';
        } else {
            btn.className = 'position-filter px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300';
        }
    });
}

// メンバー表示
function displayMembers() {
    const container = document.getElementById('members-container');
    container.innerHTML = '';
    const filteredMembers = currentPosition === 'ALL'
        ? allMembers
        : allMembers.filter(m => m.position === currentPosition);
    filteredMembers.forEach(member => {
        const card = createMemberCard(member);
        // フィルター時にもvisibleクラスを追加して表示されるようにする
        card.classList.add('visible');
        container.appendChild(card);
    });

    // 遅延読み込みを再初期化
    initLazyLoad();

    // flip機能を再初期化（既存のintervalはクリアされる）
    startRandomFlips();
}

// 遅延読み込み
function initLazyLoad() {
    const images = document.querySelectorAll('.lazy-load');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;

                // 画像の読み込み完了時にloadedクラスを追加（フェードイン効果）
                img.onload = function() {
                    img.classList.add('loaded');
                };

                // エラーハンドリングを追加
                img.onerror = function () {
                    console.error(`Failed to load image: ${img.dataset.src}`);
                    this.onerror = null;
                    this.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23e5e7eb%22 width=%22100%22 height=%22100%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%239ca3af%22 font-family=%22sans-serif%22 font-size=%2216%22>No Image</text></svg>';
                    // エラーの場合もloadedクラスを追加（プレースホルダーを表示）
                    img.classList.add('loaded');
                };

                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// フェードインアニメーション
function initFadeIn() {
    const elements = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    elements.forEach(el => observer.observe(el));
}

// flip用のinterval IDを保存
let flipIntervals = [];

// ランダムflipアニメーション（写真部分のみ）
function startRandomFlips() {
    // 既存のintervalをクリア
    flipIntervals.forEach(intervalId => clearInterval(intervalId));
    flipIntervals = [];

    const flipContainers = document.querySelectorAll('.flip-container');

    flipContainers.forEach(container => {
        // 各写真にランダムな間隔でflip
        const randomDelay = Math.random() * 6000 + 6000; // 6-12秒のランダム間隔

        const intervalId = setInterval(() => {
            // 30%の確率でflip
            if (Math.random() > 0.7) {
                container.classList.toggle('flipped');

                // 2.5秒後に元に戻す
                setTimeout(() => {
                    container.classList.toggle('flipped');
                }, 2500);
            }
        }, randomDelay);

        // interval IDを保存
        flipIntervals.push(intervalId);
    });
}

// ランダムメンバーピックアップ機能
function displayRandomMemberPickup(members) {
    const container = document.getElementById('pickup-member-container');
    const infoContainer = document.getElementById('pickup-member-pickup-info');
    if (!container || !members || members.length === 0) return;

    // ランダムにメンバーを選択
    const randomMember = members[Math.floor(Math.random() * members.length)];

    // そのメンバーの写真を集める（serious + casual）
    let allPhotos = [];
    if (randomMember.photos) {
        if (randomMember.photos.serious) {
            allPhotos.push(randomMember.photos.serious);
        }
        if (randomMember.photos.casual && Array.isArray(randomMember.photos.casual)) {
            allPhotos = allPhotos.concat(randomMember.photos.casual);
        }
    }

    // 写真がない場合は何も表示しない
    if (allPhotos.length === 0) return;

    // ランダムに写真を選択
    const randomPhoto = allPhotos[Math.floor(Math.random() * allPhotos.length)];
    const googleDriveId = extractGoogleDriveId(randomPhoto);

    // 画像を表示（円形でクリック可能）
    container.innerHTML = `
        <div class="pickup-member cursor-pointer hover:scale-105 transition-transform">
            <img src="${randomPhoto}"
                 data-google-drive-id="${googleDriveId || ''}"
                 alt="${randomMember.name.default}"
                 class="w-40 h-40 md:w-64 md:h-64 rounded-full object-cover border-2 border-white shadow-lg"
                 onerror="handleImageError(this)"
                 title="${randomMember.name.default} #${randomMember.jersey || ''} ${randomMember.position}">
        </div>
    `;

    // クリックで詳細モーダルを表示
    container.querySelector('.pickup-member').addEventListener('click', () => {
        showMemberDetail(randomMember);
    });

    // メンバー情報をランダムに表示
    if (infoContainer) {
        const infoOptions = [
            { key: 'enthusiasm', label: '意気込み' },
            { key: 'watchme', label: '注目ポイント' },
            { key: 'hobbies', label: '趣味' },
            { key: 'favorite', label: '最近の推し' },
            { key: 'what_i_like_about_triax', label: 'TRIAXの好きなところ' }
        ];

        // 値が存在するオプションのみフィルター
        const availableOptions = infoOptions.filter(option => randomMember[option.key]);

        if (availableOptions.length > 0) {
            // ランダムに一つ選択
            const selectedOption = availableOptions[Math.floor(Math.random() * availableOptions.length)];

            // ラベルと値を表示
            const labelElement = document.getElementById('pickup-info-label');
            const valueElement = document.getElementById('pickup-info-value');

            if (labelElement && valueElement) {
                // 吹き出し風のデザインを追加
                const infoContainer = document.getElementById('pickup-member-pickup-info');
                infoContainer.className = 'relative mt-4 bg-white/95 backdrop-blur text-gray-800 px-8 py-4 rounded-2xl shadow-xl max-w-md mx-auto';
                infoContainer.style.cssText = `
                    position: relative;
                    animation: fadeInUp 0.5s ease-out;
                `;

                // 吹き出しの三角形を追加（CSS）
                const style = document.createElement('style');
                style.textContent = `
                    #pickup-member-pickup-info::before {
                        content: '';
                        position: absolute;
                        top: -10px;
                        right: 30%;
                        width: 0;
                        height: 0;
                        border-left: 12px solid transparent;
                        border-right: 12px solid transparent;
                        border-bottom: 12px solid rgba(255, 255, 255, 0.95);
                        transform: translateX(50%);
                    }
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                `;
                if (!document.querySelector('#pickup-speech-bubble-style')) {
                    style.id = 'pickup-speech-bubble-style';
                    document.head.appendChild(style);
                }

                labelElement.innerHTML = `
                    <span class="text-xs md:text-sm text-gray-600 mb-1 block font-medium">
                        私の${selectedOption.label}
                    </span>
                `;
                valueElement.textContent = randomMember[selectedOption.key];
                valueElement.className = 'text-base md:text-xl font-bold text-gray-900 leading-relaxed';
            }
        } else {
            // デフォルトのキャッチフレーズを表示（吹き出しスタイルなし）
            const infoContainer = document.getElementById('pickup-member-pickup-info');
            const labelElement = document.getElementById('pickup-info-label');
            const valueElement = document.getElementById('pickup-info-value');

            // 吹き出しスタイルをリセット
            infoContainer.className = '';
            infoContainer.style.cssText = '';

            if (labelElement) {
                labelElement.innerHTML = '';
            }

            if (valueElement) {
                valueElement.textContent = '';
                valueElement.className = 'text-3xl md:text-5xl font-bold mb-4 text-center';
            }
        }
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', async function () {
    // 画像マッピングを最初に読み込む
    await loadImageMapping();
    // メニュートグル
    document.getElementById('menu-toggle').addEventListener('click', function () {
        document.getElementById('mobile-menu').classList.toggle('hidden');
    });

    // モバイルメニューのリンククリックで閉じる
    document.querySelectorAll('#mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            document.getElementById('mobile-menu').classList.add('hidden');
        });
    });

    // モーダル閉じる
    document.getElementById('close-modal').addEventListener('click', function () {
        document.getElementById('member-modal').classList.add('hidden');
    });

    // マイナスボタン（中立）のアクション
    document.getElementById('neutral-modal').addEventListener('click', function () {
        // シンプルにモーダルを閉じる
        document.getElementById('member-modal').classList.add('hidden');
    });

    // ハートボタン（いいね）のアクション
    document.getElementById('like-modal').addEventListener('click', function () {
        // アニメーション効果を追加
        const button = this;
        button.classList.add('animate-pulse');

        // ハートを赤くする
        const svg = button.querySelector('svg');
        svg.classList.remove('text-green-500');
        svg.classList.add('text-red-500');

        // 少し待ってからモーダルを閉じる
        setTimeout(() => {
            document.getElementById('member-modal').classList.add('hidden');
            // 元の状態に戻す
            button.classList.remove('animate-pulse');
            svg.classList.remove('text-red-500');
            svg.classList.add('text-green-500');
        }, 500);
    });

    document.getElementById('member-modal').addEventListener('click', function (e) {
        if (e.target === this) {
            this.classList.add('hidden');
        }
    });

    // ポジションフィルター
    document.querySelectorAll('.position-filter').forEach(btn => {
        btn.addEventListener('click', () => filterByPosition(btn.dataset.position));
    });

    // メンバーデータ取得
    const rosterData = await fetchRoster();
    if (rosterData && rosterData.members) {
        allMembers = rosterData.members;

        // ランダムメンバーピックアップを表示
        displayRandomMemberPickup(allMembers);

        displayMembers();
    } else {
        document.getElementById('members-container').innerHTML = `
                    <div class="col-span-full text-center py-8">
                        <p class="text-gray-500">メンバー情報の取得に失敗しました</p>
                    </div>
                `;
    }

    // アニメーション初期化
    initFadeIn();

    // ランダムflipアニメーション開始（3秒後）
    setTimeout(() => {
        startRandomFlips();
    }, 3000);

    // ギャラリー機能を初期化
    initGallery();

    initInstagram();
});

async function initInstagram() {
    const response = await fetch("./assets/instagram/posts.json");
    const data = await response.json();
    (data?.posts || []).forEach(post => {
        // デスクトップ用
        const postItem = createInstagramPostItem(post);
        document.getElementById('instagram-feed').insertAdjacentHTML('beforeend', postItem);

        // モバイル用
        const mobilePostItem = createInstagramPostItemMobile(post);
        document.getElementById('instagram-feed-mobile').insertAdjacentHTML('beforeend', mobilePostItem);
    });

    // モバイル用の「もっと見る」カードを最後に追加
    const moreCard = createMoreCard();
    document.getElementById('instagram-feed-mobile').insertAdjacentHTML('beforeend', moreCard);

    // Instagram要素に対してfade-inアニメーションを適用
    const instagramItems = document.querySelectorAll('#instagram-feed .fade-in, #instagram-feed-mobile .fade-in');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    instagramItems.forEach(el => observer.observe(el));
}

function createInstagramPostItem({ caption, media_type, permalink, timestamp, thumbnail_url, media_url }) {
    // 日付をフォーマット
    const postDate = new Date(timestamp);
    const dateStr = postDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // キャプションを短縮（最大150文字）
    const shortCaption = caption ?
        (caption.length > 150 ? caption.substring(0, 150) + '...' : caption) : '';

    // サムネイルまたはメディアURLを使用（動画の場合はサムネイル優先）
    const displayUrl = thumbnail_url || media_url;

    return `
    <div class="bg-white rounded-lg shadow-lg overflow-hidden fade-in hover:shadow-xl transition-shadow">
        <a href="${permalink}" target="_blank" rel="noopener noreferrer" class="block">
            <!-- メディア表示エリア -->
            <div class="relative aspect-[3/4] sm:aspect-[3/4] md:aspect-square bg-gray-100">
                ${displayUrl ? `
                    <img src="${displayUrl}"
                         alt="Instagram投稿"
                         class="w-full h-full object-cover"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23e5e7eb%22 width=%22100%22 height=%22100%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%239ca3af%22 font-family=%22sans-serif%22 font-size=%2212%22>画像を読み込めません</text></svg>';">
                ` : `
                    <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-orange-400">
                        <svg class="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                        </svg>
                    </div>
                `}

                <!-- 動画の場合のみ再生アイコンを表示 -->
                ${media_type === 'VIDEO' ? `
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div class="bg-white/10 backdrop-blur-sm rounded-full p-4">
                            <svg class="w-16 h-16 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                ` : ''}

                <!-- Instagramアイコン -->
                <div class="absolute bottom-2 right-2 bg-white/90 p-1.5 rounded-full">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="url(#instagram-gradient)">
                        <defs>
                            <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                                <stop offset="0%" style="stop-color:#feda75" />
                                <stop offset="20%" style="stop-color:#fa7e1e" />
                                <stop offset="40%" style="stop-color:#d62976" />
                                <stop offset="60%" style="stop-color:#962fbf" />
                                <stop offset="100%" style="stop-color:#4f5bd5" />
                            </linearGradient>
                        </defs>
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                    </svg>
                </div>
            </div>

            <!-- コンテンツエリア -->
            <div class="p-4">
                <!-- 日付 -->
                <div class="text-xs text-gray-500 mb-2">${dateStr}</div>

                <!-- キャプション -->
                <p class="text-sm text-gray-700 line-clamp-3 mb-3">
                    ${shortCaption || 'Club TRIAXの投稿をチェック！'}
                </p>

                <!-- アクションボタン -->
                <div class="flex items-center justify-between">
                    <span class="text-xs text-primary font-medium flex items-center gap-1">
                        Instagramで見る
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                    </span>
                </div>
            </div>
        </a>
    </div>`;
}

// モバイル用のコンパクトなInstagram投稿アイテム作成
function createInstagramPostItemMobile({ caption, media_type, permalink, timestamp, thumbnail_url, media_url }) {
    // 日付をフォーマット
    const postDate = new Date(timestamp);
    const dateStr = postDate.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric'
    });

    // キャプションを短縮（最大80文字）
    const shortCaption = caption ?
        (caption.length > 80 ? caption.substring(0, 80) + '...' : caption) : '';

    // サムネイルまたはメディアURLを使用（動画の場合はサムネイル優先）
    const displayUrl = thumbnail_url || media_url;

    return `
    <div class="flex-shrink-0 w-[67vw] sm:w-48 md:w-40 fade-in">
        <a href="${permalink}" target="_blank" rel="noopener noreferrer" class="block">
            <!-- メディア表示エリア -->
            <div class="relative aspect-[3/4] sm:aspect-[3/4] md:aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-md">
                ${displayUrl ? `
                    <img src="${displayUrl}"
                         alt="Instagram投稿"
                         class="w-full h-full object-cover"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23e5e7eb%22 width=%22100%22 height=%22100%22/></svg>';">
                ` : `
                    <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-orange-400">
                        <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                        </svg>
                    </div>
                `}

                <!-- 動画の場合のみ再生アイコンを表示 -->
                ${media_type === 'VIDEO' ? `
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div class="bg-white/10 backdrop-blur-sm rounded-full p-3 sm:p-2">
                            <svg class="w-12 h-12 sm:w-10 md:w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                ` : ''}

                <!-- 日付バッジ -->
                <div class="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-xs font-medium">
                    ${dateStr}
                </div>

                <!-- Instagramアイコン -->
                <div class="absolute bottom-2 right-2 bg-white/90 p-1 rounded-full">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="url(#instagram-gradient-mobile)">
                        <defs>
                            <linearGradient id="instagram-gradient-mobile" x1="0%" y1="100%" x2="100%" y2="0%">
                                <stop offset="0%" style="stop-color:#feda75" />
                                <stop offset="20%" style="stop-color:#fa7e1e" />
                                <stop offset="40%" style="stop-color:#d62976" />
                                <stop offset="60%" style="stop-color:#962fbf" />
                                <stop offset="100%" style="stop-color:#4f5bd5" />
                            </linearGradient>
                        </defs>
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                    </svg>
                </div>
            </div>

            <!-- コンパクトなテキストエリア -->
            <div class="p-2">
                <p class="text-xs text-gray-700 line-clamp-2">
                    ${shortCaption || 'Club TRIAXの投稿'}
                </p>
            </div>
        </a>
    </div>`;
}

// 「もっと見る」カードを作成
function createMoreCard() {
    return `
    <div class="flex-shrink-0 w-[67vw] sm:w-48 md:w-40 fade-in">
        <a href="https://www.instagram.com/clubtriax/" target="_blank" rel="noopener noreferrer" class="block h-full">
            <!-- カード全体 -->
            <div class="relative aspect-[3/4] sm:aspect-[3/4] md:aspect-square bg-gradient-to-br from-purple-400 via-pink-500 to-orange-400 rounded-lg overflow-hidden shadow-md flex flex-col items-center justify-center">
                <!-- Instagramアイコン -->
                <svg class="w-16 h-16 text-white mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                </svg>
                <!-- テキスト -->
                <p class="text-white font-bold text-lg">もっと見る</p>
                <p class="text-white/90 text-sm mt-1">@clubtriax</p>
                <!-- 矢印アイコン -->
                <svg class="w-6 h-6 text-white mt-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"></path>
                </svg>
            </div>
        </a>
    </div>`;
}

// フォトギャラリー機能
function initGallery() {
    // デバイス判定（複数の方法を組み合わせ）
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth < 1024;

    // モバイルデバイスまたは小画面の場合はLightbox無効
    const isDesktop = !isMobile && !isSmallScreen;

    if (!isDesktop) {
        // モバイル/タブレットではLightbox無効
        return;
    }

    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const closeBtn = document.getElementById('close-lightbox');
    const prevBtn = document.getElementById('prev-image');
    const nextBtn = document.getElementById('next-image');

    if (!galleryItems.length || !lightbox) return;

    let currentImageIndex = 0;
    const images = Array.from(galleryItems).map(item => item.querySelector('img').src);

    // PCのみ：ギャラリーアイテムにカーソルポインターを追加
    galleryItems.forEach(item => {
        item.style.cursor = 'pointer';
    });

    // ギャラリーアイテムクリックイベント
    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            // 再度デバイスチェック
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const isSmallScreen = window.innerWidth < 1024;

            if (!isMobile && !isSmallScreen) {
                currentImageIndex = index;
                showImage(currentImageIndex);
                lightbox.classList.remove('hidden');
                lightbox.classList.add('flex');
            }
        });
    });

    // Lightbox閉じる
    function closeLightbox() {
        lightbox.classList.add('hidden');
        lightbox.classList.remove('flex');
    }

    // 画像表示
    function showImage(index) {
        if (index < 0) {
            currentImageIndex = images.length - 1;
        } else if (index >= images.length) {
            currentImageIndex = 0;
        } else {
            currentImageIndex = index;
        }
        lightboxImage.src = images[currentImageIndex];
    }

    // イベントリスナー
    closeBtn?.addEventListener('click', closeLightbox);

    prevBtn?.addEventListener('click', () => {
        showImage(currentImageIndex - 1);
    });

    nextBtn?.addEventListener('click', () => {
        showImage(currentImageIndex + 1);
    });

    // 背景クリックで閉じる
    lightbox?.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // キーボードナビゲーション
    document.addEventListener('keydown', (e) => {
        if (lightbox?.classList.contains('flex')) {
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                showImage(currentImageIndex - 1);
            } else if (e.key === 'ArrowRight') {
                showImage(currentImageIndex + 1);
            }
        }
    });
}

// ウィンドウリサイズ時に再初期化
window.addEventListener('resize', () => {
    // モバイル→PCに変わった場合の対応
    const lightbox = document.getElementById('lightbox');
    if (window.innerWidth < 1024 && lightbox) {
        // モバイルサイズになったらLightboxを閉じる
        lightbox.classList.add('hidden');
        lightbox.classList.remove('flex');
    }
});
