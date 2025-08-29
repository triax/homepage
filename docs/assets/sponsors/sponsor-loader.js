// スポンサー情報を読み込んで表示する
async function loadSponsors() {
    try {
        const response = await fetch('./assets/sponsors/index.json');
        const sponsors = await response.json();
        
        // Gold sponsors
        const goldContainer = document.getElementById('sponsor-gold');
        if (goldContainer) {
            goldContainer.innerHTML = '';
            sponsors.gold.forEach(sponsor => {
                const div = document.createElement('div');
                div.className = 'sponsor-t1 w-full p-8';
                // リンクがある場合とない場合で分岐
                if (sponsor.link) {
                    div.innerHTML = `
                        <a href="${sponsor.link}" target="_blank" rel="noopener noreferrer">
                            <img src="${sponsor.logo}" class="w-full h-auto" />
                        </a>
                    `;
                } else {
                    div.innerHTML = `
                        <img src="${sponsor.logo}" class="w-full h-auto" />
                    `;
                }
                goldContainer.appendChild(div);
            });
        }
        
        // Silver sponsors
        const silverContainer = document.getElementById('sponsor-silver');
        if (silverContainer) {
            silverContainer.innerHTML = '';
            sponsors.silver.forEach(sponsor => {
                const div = document.createElement('div');
                div.className = 'sponsor-t2 w-5/12 max-w-sm p-2';
                // リンクがある場合とない場合で分岐
                if (sponsor.link) {
                    div.innerHTML = `
                        <a href="${sponsor.link}" target="_blank" rel="noopener noreferrer">
                            <img src="${sponsor.logo}" class="w-full h-auto" />
                        </a>
                    `;
                } else {
                    div.innerHTML = `
                        <img src="${sponsor.logo}" class="w-full h-auto" />
                    `;
                }
                silverContainer.appendChild(div);
            });
        }
        
        // Bronze sponsors
        const bronzeContainer = document.getElementById('sponsor-bronze');
        if (bronzeContainer) {
            bronzeContainer.innerHTML = '';
            sponsors.bronze.forEach(sponsor => {
                const div = document.createElement('div');
                div.className = 'sponsor-t3 w-1/4 max-w-[200px] p-2';
                // リンクがある場合とない場合で分岐
                if (sponsor.link) {
                    div.innerHTML = `
                        <a href="${sponsor.link}" target="_blank" rel="noopener noreferrer">
                            <img src="${sponsor.logo}" class="w-full h-auto" />
                        </a>
                    `;
                } else {
                    div.innerHTML = `
                        <img src="${sponsor.logo}" class="w-full h-auto" />
                    `;
                }
                bronzeContainer.appendChild(div);
            });
        }
    } catch (error) {
        console.error('Failed to load sponsors:', error);
    }
}

// DOMContentLoadedイベントで実行
document.addEventListener('DOMContentLoaded', loadSponsors);