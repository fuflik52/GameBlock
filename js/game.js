import { BlockGenerator } from './blockGenerator.js';
import { GameBoard } from './gameBoard.js';

class Game {
    constructor() {
        this.score = 0;
        this.highScore = 0;
        this.isGameActive = false;
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.gameStartTime = null;
        this.userId = this.generateUserId();
        this.telegramUsername = null;
        this.username = this.generateUsername();
        
        // Инициализация Telegram Web App
        this.tg = window.Telegram.WebApp;
        
        // Загружаем сохраненный рекорд
        const savedHighScore = localStorage.getItem('highScore');
        if (savedHighScore) {
            this.highScore = parseInt(savedHighScore);
            this.updateHighScore();
        }
        
        // Загружаем настройки из localStorage
        this.loadSettings();
        
        // Инициализируем игровые компоненты
        this.blockGenerator = new BlockGenerator();
        this.gameBoard = new GameBoard();
        
        // Устанавливаем двустороннюю связь между GameBoard и BlockGenerator
        this.gameBoard.setBlockGenerator(this.blockGenerator);
        this.blockGenerator.setGameBoard(this.gameBoard);
        
        // Добавляем глобальную ссылку на экземпляр игры
        window.game = this;

        // Автоматически подключаем Telegram если это Telegram Web App
        if (this.tg.initDataUnsafe?.user) {
            this.connectTelegramWebApp();
        }

        // Отправляем информацию о подключении
        this.updateStats({
            connect: true,
            new_user: !localStorage.getItem('userId')
        });

        // Добавляем обработчик закрытия окна
        window.addEventListener('beforeunload', () => {
            this.updateStats({
                disconnect: true
            });
        });
    }

    loadSettings() {
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        this.musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
    }

    saveSettings() {
        localStorage.setItem('soundEnabled', this.soundEnabled);
        localStorage.setItem('musicEnabled', this.musicEnabled);
    }

    initializeElements() {
        // Инициализируем элементы DOM после полной загрузки
        this.mainMenu = document.getElementById('mainMenu');
        this.gameBoardContainer = document.querySelector('.game-board-container');
        this.scoreElement = document.getElementById('score');
        this.gameOverModal = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        this.settingsIcon = document.querySelector('.settings-icon');

        // Добавляем инициализацию элементов настроек
        this.settingsModal = document.getElementById('settingsModal');
        this.soundToggle = document.getElementById('soundEffects');
        this.musicToggle = document.getElementById('backgroundMusic');
        this.closeSettingsBtn = document.getElementById('closeSettings');
        this.restartGameBtn = document.getElementById('restartGame');
        this.returnToMenuBtn = document.getElementById('returnToMenu');
        this.telegramStatus = document.getElementById('telegramStatus');

        // Устанавливаем начальные значения переключателей
        if (this.soundToggle) this.soundToggle.checked = this.soundEnabled;
        if (this.musicToggle) this.musicToggle.checked = this.musicEnabled;

        // Проверяем, что все элементы найдены
        const allElementsFound = this.mainMenu && this.gameBoardContainer && 
                               this.scoreElement && this.gameOverModal && 
                               this.finalScoreElement && this.settingsIcon &&
                               this.settingsModal && this.soundToggle &&
                               this.musicToggle && this.closeSettingsBtn &&
                               this.restartGameBtn && this.returnToMenuBtn &&
                               this.telegramStatus;

        if (!allElementsFound) {
            console.error('Не все DOM элементы найдены');
            return false;
        }
        return true;
    }

    setupEventListeners() {
        // Обработчики для кнопок меню
        const classicBtn = document.querySelector('.classic');
        const adventureBtn = document.querySelector('.adventure');
        const playAgainBtn = document.getElementById('playAgain');
        const deleteUserBtn = document.getElementById('deleteUser');
        
        if (!classicBtn || !adventureBtn || !playAgainBtn || !deleteUserBtn) {
            console.error('Не найдены кнопки управления');
            return false;
        }

        classicBtn.addEventListener('click', () => this.startGame('classic'));
        adventureBtn.addEventListener('click', () => this.startGame('adventure'));
        playAgainBtn.addEventListener('click', this.handlePlayAgain.bind(this));
        deleteUserBtn.addEventListener('click', this.handleDeleteUser.bind(this));

        // Добавляем обработчики для настроек
        const settingsIcons = document.querySelectorAll('.settings-icon');
        settingsIcons.forEach(icon => {
            icon.addEventListener('click', () => {
                this.showSettings();
            });
        });

        if (this.closeSettingsBtn) {
            this.closeSettingsBtn.addEventListener('click', () => {
                this.hideSettings();
            });
        }

        if (this.soundToggle) {
            this.soundToggle.addEventListener('change', (e) => {
                this.soundEnabled = e.target.checked;
                this.saveSettings();
                this.playSound('click');
            });
        }

        if (this.musicToggle) {
            this.musicToggle.addEventListener('change', (e) => {
                this.musicEnabled = e.target.checked;
                this.saveSettings();
                if (this.musicEnabled) {
                    this.startBackgroundMusic();
                } else {
                    this.stopBackgroundMusic();
                }
            });
        }

        if (this.restartGameBtn) {
            this.restartGameBtn.addEventListener('click', () => {
                this.hideSettings();
                this.resetGame();
                this.playSound('click');
            });
        }

        if (this.returnToMenuBtn) {
            this.returnToMenuBtn.addEventListener('click', () => {
                this.hideSettings();
                this.returnToMainMenu();
                this.playSound('click');
            });
        }

        return true;
    }

    checkGameCanContinue() {
        // Проверяем, есть ли свободные ячейки на поле
        const hasEmptyCells = this.gameBoard.hasEmptyCells();
        
        // Проверяем, можно ли разместить текущие блоки
        const currentBlocks = this.blockGenerator.generatedBlocks || [];
        const canPlaceAnyBlock = currentBlocks.some(block => 
            this.gameBoard.canPlaceBlockAnywhere(block)
        );

        // Если нет возможности разместить блоки, завершаем игру
        if (!canPlaceAnyBlock) {
            this.endGame();
            return false;
        }

        return hasEmptyCells && canPlaceAnyBlock;
    }

    handlePlayAgain() {
        // Переинициализируем элементы перед перезапуском
        if (!this.initializeElements()) {
            console.error('Ошибка реинициализации элементов');
            return;
        }

        if (this.gameOverModal) {
            this.gameOverModal.style.display = 'none';
        }
        this.resetGame();
    }

    startGame(mode) {
        this.gameStartTime = Date.now();
        this.score = 0;
        this.gameMode = mode;
        
        // Переинициализируем элементы перед стартом
        if (!this.initializeElements()) {
            console.error('Ошибка инициализации элементов при старте игры');
            return;
        }

        // Скрываем главное меню и показываем игровое поле
        this.mainMenu.style.display = 'none';
        this.gameBoardContainer.style.display = 'flex';
        
        // Обновляем отображение
        this.updateScore(0);
        
        // Активируем игровое поле
        this.gameBoard.startGame();
        
        // Генерируем начальные блоки
        this.blockGenerator.generateBlocks();
    }

    updateScore(points) {
        // Переинициализируем элементы перед обновлением счета
        this.initializeElements();
        
        if (!this.scoreElement) {
            console.error('Элемент счета не найден');
            return;
        }
        
        this.score += points;
        this.scoreElement.textContent = this.score;
        
        // Добавляем анимацию обновления
        this.scoreElement.classList.add('updating');
        setTimeout(() => {
            this.scoreElement.classList.remove('updating');
        }, 300);
        
        // Обновляем рекорд если текущий счет больше
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
            // Сразу обновляем отображение рекорда
            const highScoreElement = document.getElementById('highScore');
            if (highScoreElement) {
                highScoreElement.textContent = this.highScore;
            }
        }
    }

    resetGame() {
        // Переинициализируем элементы перед сбросом
        if (!this.initializeElements()) {
            console.error('Ошибка реинициализации элементов при сбросе');
            return;
        }

        this.score = 0;
        if (this.scoreElement) {
            this.scoreElement.textContent = this.score;
        }
        
        // Очищаем и активируем игровое поле
        this.gameBoard.resetGame();
        
        // Генерируем новые блоки
        this.blockGenerator.generateBlocks(3);
    }

    handleGameOver() {
        // Переинициализируем элементы перед показом окна Game Over
        this.initializeElements();
        
        if (!this.gameOverModal || !this.finalScoreElement) {
            console.error('Элементы Game Over не найдены');
            return;
        }
        
        this.finalScoreElement.textContent = this.score;
        this.gameOverModal.style.display = 'flex';
    }

    showSettings() {
        if (this.settingsModal) {
            this.settingsModal.style.display = 'flex';
            this.playSound('click');
            this.updateTelegramStatus();
        }
    }

    hideSettings() {
        if (this.settingsModal) {
            this.settingsModal.style.display = 'none';
            this.playSound('click');
        }
    }

    returnToMainMenu() {
        if (this.mainMenu && this.gameBoardContainer) {
            this.gameBoardContainer.style.display = 'none';
            this.mainMenu.style.display = 'flex';
            this.resetGame();
        }
    }

    playSound(soundName) {
        if (!this.soundEnabled) return;
        
        const sounds = {
            click: 'click.mp3',
            match: 'match.mp3',
            place: 'place.mp3'
        };

        if (sounds[soundName]) {
            const audio = new Audio(`sounds/${sounds[soundName]}`);
            audio.play().catch(error => console.log('Error playing sound:', error));
        }
    }

    startBackgroundMusic() {
        if (!this.musicEnabled) return;
        
        if (!this.backgroundMusic) {
            this.backgroundMusic = new Audio('sounds/background.mp3');
            this.backgroundMusic.loop = true;
        }
        
        this.backgroundMusic.play().catch(error => console.log('Error playing music:', error));
    }

    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
    }

    generateUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
        }
        return userId;
    }

    generateUsername() {
        // Проверяем, есть ли сохраненное имя
        let username = localStorage.getItem('blockBlastUsername');
        if (!username) {
            // Генерируем случайное имя
            const adjectives = ['Веселый', 'Быстрый', 'Ловкий', 'Умный', 'Храбрый'];
            const nouns = ['Игрок', 'Мастер', 'Герой', 'Чемпион', 'Воин'];
            username = adjectives[Math.floor(Math.random() * adjectives.length)] + 
                      ' ' + 
                      nouns[Math.floor(Math.random() * nouns.length)];
            localStorage.setItem('blockBlastUsername', username);
        }
        return username;
    }

    endGame() {
        const gameEndTime = Date.now();
        const playTimeMinutes = Math.floor((gameEndTime - this.gameStartTime) / 60000);

        // Отправляем статистику игры
        this.updateStats({
            game_complete: true,
            score: this.score,
            playtime: playTimeMinutes
        });

        // Показываем окно с результатами
        const gameOverModal = document.getElementById('gameOver');
        const finalScoreElement = document.getElementById('finalScore');
        finalScoreElement.textContent = this.score;
        gameOverModal.style.display = 'flex';
    }

    async updateStats(data) {
        try {
            const response = await fetch('/api/update_stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.userId,
                    username: this.telegramUsername || this.username,
                    ...data
                })
            });
            
            await response.json();
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    updateHighScore() {
        document.getElementById('highScore').textContent = this.highScore;
    }

    async connectTelegramWebApp() {
        const user = this.tg.initDataUnsafe?.user;
        if (user) {
            try {
                const response = await fetch('/api/connect_telegram', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: this.userId,
                        telegram_username: user.username
                    })
                });
                
                const data = await response.json();
                if (data.status === 'success') {
                    this.telegramUsername = user.username;
                    localStorage.setItem('telegramUsername', user.username);
                    this.updateTelegramStatus();
                }
            } catch (error) {
                console.error('Error connecting Telegram:', error);
            }
        }
    }

    updateTelegramStatus() {
        const statusElement = document.getElementById('telegramStatus');
        if (!statusElement) return;

        if (this.tg.initDataUnsafe?.user) {
            const user = this.tg.initDataUnsafe.user;
            statusElement.textContent = `Подключен как @${user.username}`;
            statusElement.style.color = '#4CAF50';
        } else {
            statusElement.textContent = 'Запустите игру через Telegram';
            statusElement.style.color = '#888';
        }
    }

    handleDeleteUser() {
        if (confirm('Вы уверены, что хотите удалить свой профиль? Это действие нельзя отменить.')) {
            // Удаляем все данные пользователя
            localStorage.removeItem('userId');
            localStorage.removeItem('blockBlastUsername');
            localStorage.removeItem('highScore');
            localStorage.removeItem('soundEnabled');
            localStorage.removeItem('musicEnabled');
            
            // Обновляем UI
            this.score = 0;
            this.highScore = 0;
            this.updateHighScore();
            this.updateScore(0);
            
            // Генерируем новый ID и имя пользователя
            this.userId = this.generateUserId();
            this.username = this.generateUsername();
            
            // Закрываем настройки и возвращаемся в главное меню
            this.hideSettings();
            this.returnToMainMenu();
            
            // Показываем уведомление
            alert('Профиль успешно удален');
        }
    }
}

// Создаем и инициализируем игру только после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    if (!game.initializeElements()) {
        console.error('Ошибка инициализации элементов');
        return;
    }
    if (!game.setupEventListeners()) {
        console.error('Ошибка установки обработчиков событий');
        return;
    }

    // Добавляем функцию тестирования в глобальную область
    window.testMatch = (row, col, length, color) => {
        if (game && game.gameBoard) {
            game.gameBoard.testMatchSequence(row, col, length, color);
        } else {
            console.error('Игра не инициализирована');
        }
    };
});

export { Game }; 