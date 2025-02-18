import { BlockGenerator } from './blockGenerator.js';

class BlockBlast {
    constructor() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        this.score = 0;
        this.level = 1;
        this.isGameActive = false;
        
        // DOM элементы
        this.gameBoard = document.getElementById('gameBoard');
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.gameBoardContainer = document.querySelector('.game-board-container');
        
        // Инициализация генератора блоков
        this.blockGenerator = new BlockGenerator();
    }

    init() {
        // Привязка обработчиков событий
        document.querySelector('.adventure').addEventListener('click', () => this.startGame('adventure'));
        document.querySelector('.classic').addEventListener('click', () => this.startGame('classic'));

        // Обработчики для игрового поля
        this.gameBoard.addEventListener('dragover', this.handleDragOver.bind(this));
        this.gameBoard.addEventListener('drop', this.handleDrop.bind(this));
    }

    startGame(mode) {
        this.isGameActive = true;
        this.score = 0;
        this.level = 1;
        this.gameMode = mode;
        
        // Показываем игровое поле
        this.gameBoardContainer.style.display = 'block';
        
        // Обновляем отображение
        this.scoreElement.textContent = this.score;
        this.levelElement.textContent = this.level;
        
        // Очищаем поле
        this.clearBoard();
        
        // Генерируем начальные блоки
        this.blockGenerator.generateBlocks();
    }

    clearBoard() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        this.renderBoard();
    }

    renderBoard() {
        this.gameBoard.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                if (this.board[i][j]) {
                    const block = document.createElement('div');
                    block.className = `block ${this.board[i][j]}`;
                    cell.appendChild(block);
                }
                
                this.gameBoard.appendChild(cell);
            }
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDrop(e) {
        e.preventDefault();
        const color = e.dataTransfer.getData('text/plain');
        const cell = e.target.closest('.cell');
        
        if (cell && !cell.hasChildNodes()) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            // Проверяем, можно ли поместить блок в эту ячейку
            if (this.isValidMove(row, col)) {
                this.placeBlock(row, col, color);
                
                // Удаляем использованный блок из генератора
                const draggedBlock = document.querySelector('.block.dragging');
                if (draggedBlock) {
                    this.blockGenerator.removeBlock(draggedBlock);
                }
                
                // Проверяем совпадения
                this.checkMatches();
            }
        }
    }

    isValidMove(row, col) {
        // Проверяем, пуста ли ячейка
        if (this.board[row][col]) return false;
        
        // Проверяем, есть ли поддержка снизу
        if (row < 7 && !this.board[row + 1][col]) return false;
        
        return true;
    }

    placeBlock(row, col, color) {
        this.board[row][col] = color;
        this.renderBoard();
    }

    checkMatches() {
        const matches = this.findAllMatches();
        if (matches.length > 0) {
            this.removeMatches(matches);
            this.updateScore(matches.length);
            this.applyGravity();
        }
    }

    findAllMatches() {
        const matches = new Set();
        
        // Проверяем горизонтальные совпадения
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 6; j++) {
                if (this.board[i][j] &&
                    this.board[i][j] === this.board[i][j + 1] &&
                    this.board[i][j] === this.board[i][j + 2]) {
                    matches.add(`${i},${j}`);
                    matches.add(`${i},${j + 1}`);
                    matches.add(`${i},${j + 2}`);
                }
            }
        }
        
        // Проверяем вертикальные совпадения
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 8; j++) {
                if (this.board[i][j] &&
                    this.board[i][j] === this.board[i + 1][j] &&
                    this.board[i][j] === this.board[i + 2][j]) {
                    matches.add(`${i},${j}`);
                    matches.add(`${i + 1},${j}`);
                    matches.add(`${i + 2},${j}`);
                }
            }
        }
        
        return Array.from(matches).map(pos => {
            const [row, col] = pos.split(',').map(Number);
            return { row, col };
        });
    }

    removeMatches(matches) {
        matches.forEach(({ row, col }) => {
            const cell = this.gameBoard.children[row * 8 + col];
            if (cell.firstChild) {
                cell.firstChild.classList.add('disappear');
            }
            setTimeout(() => {
                this.board[row][col] = null;
                this.renderBoard();
            }, 300);
        });
    }

    updateScore(matchCount) {
        this.score += matchCount * 10 * this.level;
        this.scoreElement.textContent = this.score;
        
        // Проверяем условия повышения уровня
        if (this.score >= this.level * 1000) {
            this.levelUp();
        }
    }

    applyGravity() {
        for (let col = 0; col < 8; col++) {
            let writePos = 7;
            for (let row = 7; row >= 0; row--) {
                if (this.board[row][col]) {
                    if (writePos !== row) {
                        this.board[writePos][col] = this.board[row][col];
                        this.board[row][col] = null;
                    }
                    writePos--;
                }
            }
        }
        this.renderBoard();
    }

    levelUp() {
        this.level++;
        this.levelElement.textContent = this.level;
        // Добавляем эффект перехода на новый уровень
        this.gameBoard.classList.add('level-up');
        setTimeout(() => {
            this.gameBoard.classList.remove('level-up');
        }, 1000);
    }
}

// Запуск игры после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const game = new BlockBlast();
    // Инициализируем игру после полной загрузки DOM
    setTimeout(() => game.init(), 0);
}); 