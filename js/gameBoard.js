class GameBoard {
    constructor(size = 8) {
        this.size = size;
        this.board = Array(size).fill().map(() => Array(size).fill(null));
        this.element = document.getElementById('gameBoard');
        this.blockGenerator = null;
        this.currentDragData = null;
        this.gameStarted = false;
        this.isTouchDevice = 'ontouchstart' in window;
        this.setupBoard();
        this.setupTouchEvents();
        
        // Добавляем контейнер для логов
        this.logContainer = document.createElement('div');
        this.logContainer.className = 'log-container';
        document.body.appendChild(this.logContainer);
        
        this.element.addEventListener('dragenter', (e) => {
            e.preventDefault();
        });
        
        this.element.addEventListener('dragstart', (e) => {
            if (e.target.closest('.block')) {
                try {
                    this.currentDragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                } catch (error) {
                    // Игнорируем ошибку, данные будут установлены позже
                }
            }
        });

        // Изменяем проверку окончания игры
        this.checkGameOverInterval = setInterval(() => {
            if (this.gameStarted && this.blockGenerator) {
                // Проверяем наличие пустых ячеек
                const hasEmptyCells = this.hasEmptyCells();
                
                // Если есть пустые ячейки, игра не может быть окончена
                if (hasEmptyCells) {
                    return;
                }

                // Проверяем возможность размещения текущих блоков
                const hasValidMoves = this.blockGenerator.generatedBlocks.some(block => {
                    return this.canPlaceBlockAnywhere(block);
                });

                // Игра заканчивается только если нет пустых ячеек И нет возможных ходов
                if (!hasValidMoves) {
                    this.handleGameOver();
                }
            }
        }, 1000);

        // Добавляем функцию testMatch в глобальную область видимости
        window.testMatch = (row, col, length, color) => {
            this.testMatchSequence(row, col, length, color);
        };
    }

    setBlockGenerator(blockGenerator) {
        this.blockGenerator = blockGenerator;
    }

    setupBoard() {
        this.element.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                cell.addEventListener('dragover', this.handleDragOver.bind(this));
                cell.addEventListener('drop', this.handleDrop.bind(this));
                
                this.element.appendChild(cell);
            }
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        const cell = e.target.closest('.cell');
        if (!cell || !this.currentDragData) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }

        const shape = this.currentDragData.shape;
        const boardRect = this.element.getBoundingClientRect();
        const cellSize = boardRect.width / this.size;

        // Более точное определение позиции
        const x = e.clientX - boardRect.left;
        const y = e.clientY - boardRect.top;
        
        // Учитываем смещение для центрирования блока относительно курсора
        const offsetX = (shape[0].length * cellSize) / 2;
        const offsetY = (shape.length * cellSize) / 2;
        
        const nearestRow = Math.floor((y - offsetY + cellSize/2) / cellSize);
        const nearestCol = Math.floor((x - offsetX + cellSize/2) / cellSize);

        this.clearHighlight();

        // Ищем ближайшую валидную позицию
        const validPosition = this.findNearestValidPosition(nearestRow, nearestCol, shape);
        
        if (validPosition) {
            this.highlightCells(validPosition.row, validPosition.col, shape);
            e.dataTransfer.dropEffect = 'move';
            
            // Сохраняем текущую валидную позицию
            this.currentValidPosition = validPosition;
        } else {
            e.dataTransfer.dropEffect = 'none';
            this.currentValidPosition = null;
        }
    }

    findNearestValidPosition(row, col, shape) {
        // Проверяем текущую позицию
        if (this.isValidMove(row, col, shape)) {
            return { row, col };
        }

        // Проверяем ближайшие позиции по спирали
        for (let radius = 1; radius <= 2; radius++) {
            for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    // Пропускаем уже проверенные позиции
                    if (Math.abs(dr) < radius && Math.abs(dc) < radius) continue;
                    
                    const newRow = row + dr;
                    const newCol = col + dc;
                    
                    if (this.isValidMove(newRow, newCol, shape)) {
                        return { row: newRow, col: newCol };
                    }
                }
            }
        }
        return null;
    }

    highlightCells(row, col, shape) {
        this.clearHighlight();
        if (!shape || !this.currentDragData) return;

        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[0].length; j++) {
                if (shape[i][j] === 1) {
                    const cellIndex = this.getCellIndex(row + i, col + j);
                    const cell = this.element.children[cellIndex];
                    if (cell) {
                        cell.classList.add('highlight');
                        
                        // Создаем призрачный блок
                        const ghostBlock = document.createElement('div');
                        ghostBlock.className = 'ghost-block';
                        
                        // Создаем сегмент блока с нужным цветом
                        const segment = document.createElement('div');
                        segment.className = `block-segment ${this.currentDragData.color}`;
                        
                        ghostBlock.appendChild(segment);
                        cell.appendChild(ghostBlock);
                    }
                }
            }
        }
    }

    clearHighlight() {
        const highlightedCells = this.element.querySelectorAll('.cell.highlight');
        highlightedCells.forEach(cell => {
            cell.classList.remove('highlight');
            // Удаляем призрачные блоки
            const ghostBlock = cell.querySelector('.ghost-block');
            if (ghostBlock) {
                ghostBlock.remove();
            }
        });
    }

    log(message) {
        console.log(message);
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = message;
        this.logContainer.appendChild(logEntry);
        
        // Удаляем старые логи
        setTimeout(() => {
            logEntry.remove();
        }, 3000);
    }

    handleDrop(e) {
        e.preventDefault();
        if (!this.currentDragData || !this.currentValidPosition) {
            return false;
        }

        const color = this.currentDragData.color;
        const shape = this.currentDragData.shape;
        const { row, col } = this.currentValidPosition;

        if (this.isValidMove(row, col, shape)) {
            this.placeBlock(row, col, color, shape);
            const draggedBlock = document.querySelector('.block.dragging');
            if (draggedBlock && this.blockGenerator) {
                this.blockGenerator.removeBlock(draggedBlock);
            }
            this.currentValidPosition = null;

            // Проверяем возможность продолжения игры после небольшой задержки
            // чтобы дать время на генерацию новых блоков
            setTimeout(() => {
                if (this.blockGenerator && this.blockGenerator.generatedBlocks.length > 0) {
                    this.checkGameCanContinue();
                }
            }, 300);

            return true;
        }

        this.currentValidPosition = null;
        return false;
    }

    isValidMove(row, col, shape) {
        // Базовые проверки границ
        if (!shape || row < 0 || col < 0) return false;
        if (row + shape.length > this.size) return false;
        if (col + shape[0].length > this.size) return false;

        // Проверка на пересечение с существующими блоками
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[0].length; j++) {
                if (shape[i][j] === 1 && this.board[row + i][col + j] !== null) {
                    return false;
                }
            }
        }

        return true; // Разрешаем размещение если все проверки пройдены
    }

    isNearCenter(row, col, shape) {
        const centerRow = Math.floor(this.size / 2);
        const centerCol = Math.floor(this.size / 2);
        
        // Вычисляем центр блока
        const blockCenterRow = row + Math.floor(shape.length / 2);
        const blockCenterCol = col + Math.floor(shape[0].length / 2);
        
        // Проверяем расстояние от центра блока до центра поля
        const distance = Math.sqrt(
            Math.pow(blockCenterRow - centerRow, 2) + 
            Math.pow(blockCenterCol - centerCol, 2)
        );
        
        // Разрешаем размещение, если блок находится не слишком далеко от центра
        return distance <= this.size / 2;
    }

    isFirstBlock() {
        let blockCount = 0;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.board[i][j] !== null) {
                    blockCount++;
                }
            }
        }
        // Разрешаем свободное размещение для первых 5 блоков
        return blockCount < 5;
    }

    placeBlock(row, col, color, shape) {
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[0].length; j++) {
                if (shape[i][j] === 1) {
                    const cell = this.element.children[this.getCellIndex(row + i, col + j)];
                    const block = document.createElement('div');
                    block.className = `block-segment ${color}`;
                    cell.appendChild(block);
                    this.board[row + i][col + j] = color;
                }
            }
        }
        // Проверяем совпадения после размещения блока
        setTimeout(() => this.checkMatches(), 100);
    }

    getCellIndex(row, col) {
        return row * this.size + col;
    }

    checkMatches() {
        this.log("Начинаем проверку совпадений...");
        const matches = this.findMatches();
        this.log(`Найдено совпадений: ${matches.length}`);
        
        if (matches.length > 0) {
            // Предотвращаем срабатывание Game Over во время анимации совпадений
            const wasGameStarted = this.gameStarted;
            this.gameStarted = false;

            matches.forEach(match => {
                this.log(`Совпадение в позиции [${match.row}, ${match.col}], цвет: ${this.board[match.row][match.col]}`);
            });

            // Запускаем анимацию и удаление
            setTimeout(() => {
                this.removeMatches(matches);
                
                // Проверяем, есть ли пустые ячейки после удаления совпадений
                const hasEmptyCells = this.hasEmptyCells();
                
                // Восстанавливаем состояние игры только если есть пустые ячейки
                if (hasEmptyCells) {
                    this.gameStarted = wasGameStarted;
                }
                
                if (window.game) {
                    const points = matches.length * 10;
                    const currentScore = parseInt(window.game.score) || 0;
                    const newScore = currentScore + points;
                    window.game.score = newScore;
                    
                    const scoreElement = document.getElementById('score');
                    if (scoreElement) {
                        scoreElement.textContent = newScore;
                        scoreElement.classList.add('updating');
                        setTimeout(() => {
                            scoreElement.classList.remove('updating');
                        }, 500);
                    }
                    this.log(`Начислено очков: ${points}, всего: ${newScore}`);
                }
            }, 600); // Даем время на анимацию

            return matches.length;
        }
        return 0;
    }

    findMatches() {
        const matches = new Set();
        
        // Проверяем горизонтальные совпадения
        for (let row = 0; row < this.size; row++) {
            let startCol = 0;
            let count = 0;
            
            for (let col = 0; col <= this.size; col++) {
                const hasBlock = col < this.size ? this.board[row][col] !== null : false;
                
                if (hasBlock) {
                    count++;
                } else {
                    if (count >= 8) { // Если есть 8 или более блоков подряд
                        for (let i = 0; i < count; i++) {
                            matches.add(`${row},${startCol + i}`);
                            const cell = this.element.children[this.getCellIndex(row, startCol + i)];
                            if (cell) {
                                const block = cell.querySelector('.block-segment');
                                if (block) {
                                    block.style.border = '2px solid white';
                                    block.classList.add('matching');
                                }
                            }
                        }
                    }
                    startCol = col;
                    count = 0;
                }
            }
        }
        
        // Проверяем вертикальные совпадения
        for (let col = 0; col < this.size; col++) {
            let startRow = 0;
            let count = 0;
            
            for (let row = 0; row <= this.size; row++) {
                const hasBlock = row < this.size ? this.board[row][col] !== null : false;
                
                if (hasBlock) {
                    count++;
                } else {
                    if (count >= 8) { // Если есть 8 или более блоков подряд
                        for (let i = 0; i < count; i++) {
                            matches.add(`${startRow + i},${col}`);
                            const cell = this.element.children[this.getCellIndex(startRow + i, col)];
                            if (cell) {
                                const block = cell.querySelector('.block-segment');
                                if (block) {
                                    block.style.border = '2px solid white';
                                    block.classList.add('matching');
                                }
                            }
                        }
                    }
                    startRow = row;
                    count = 0;
                }
            }
        }

        const matchesArray = Array.from(matches).map(pos => {
            const [row, col] = pos.split(',').map(Number);
            return { row, col };
        });

        if (matchesArray.length > 0) {
            this.log(`Всего найдено совпадающих блоков: ${matchesArray.length}`);
            matchesArray.forEach(match => {
                const color = this.board[match.row][match.col];
                this.log(`Совпадение: [${match.row}, ${match.col}], цвет: ${color}`);
            });
        }

        return matchesArray;
    }

    async animateMatches(matches) {
        const animations = matches.map(match => {
            const cell = this.element.children[this.getCellIndex(match.row, match.col)];
            const block = cell.querySelector('.block-segment');
            if (block) {
                block.classList.add('matching');
                
                return new Promise(resolve => {
                    block.addEventListener('animationend', () => {
                        resolve();
                    }, { once: true });
                });
            }
            return Promise.resolve();
        });
        
        await Promise.all(animations);
    }

    removeMatches(matches) {
        this.log("Начинаем удаление совпавших блоков...");
        matches.forEach(match => {
            const cell = this.element.children[this.getCellIndex(match.row, match.col)];
            const block = cell.querySelector('.block-segment');
            if (block) {
                const color = this.board[match.row][match.col];
                this.log(`Удаляем блок: [${match.row}, ${match.col}], цвет: ${color}`);
                block.classList.remove('matching');
                block.remove();
            }
            this.board[match.row][match.col] = null;
        });
        
        this.log(`Удалено всего блоков: ${matches.length}`);
    }

    applyGravity() {
        // Временно отключаем гравитацию
        return;
    }

    hasEmptyCells() {
        let emptyCount = 0;
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] === null) {
                    emptyCount++;
                }
            }
        }
        return emptyCount > 0;
    }

    hasAnyValidMoves() {
        if (!this.blockGenerator || !this.blockGenerator.generatedBlocks) {
            return true;
        }

        // Проверяем каждый доступный блок
        return this.blockGenerator.generatedBlocks.some(block => {
            return this.canPlaceBlockAnywhere(block);
        });
    }

    canPlaceBlockAnywhere(block) {
        if (!block || !block.shape) return false;

        // Проверяем каждую позицию на доске
        for (let row = 0; row <= this.size - block.shape.length; row++) {
            for (let col = 0; col <= this.size - block.shape[0].length; col++) {
                // Проверяем все возможные повороты блока
                if (this.isValidMove(row, col, block.shape)) {
                    return true;
                }
            }
        }
        return false;
    }

    checkGameCanContinue() {
        if (!this.blockGenerator || !this.gameStarted) return true;

        // Проверяем наличие пустых ячеек
        if (!this.hasEmptyCells()) {
            // Если нет пустых ячеек, проверяем возможность размещения блоков
            const canPlaceAnyBlock = this.blockGenerator.generatedBlocks.some(block => {
                return this.canPlaceBlockAnywhere(block);
            });

            if (!canPlaceAnyBlock) {
                this.handleGameOver();
                return false;
            }
        }

        // Проверяем, можно ли разместить хотя бы один из имеющихся блоков
        const hasAnyValidMove = this.blockGenerator.generatedBlocks.some(block => {
            return this.canPlaceBlockAnywhere(block);
        });

        // Завершаем игру только если нет возможности разместить ни один блок
        if (!hasAnyValidMove) {
            this.handleGameOver();
            return false;
        }

        return true;
    }

    handleGameOver() {
        if (!this.gameStarted) return;

        this.gameStarted = false;
        clearInterval(this.checkGameOverInterval);

        const gameOverModal = document.getElementById('gameOver');
        const finalScoreElement = document.getElementById('finalScore');
        
        if (window.game) {
            const finalScore = parseInt(window.game.score) || 0;
            finalScoreElement.textContent = finalScore;
            window.game.score = finalScore;
        }
        
        if (gameOverModal) {
            gameOverModal.style.display = 'flex';
        }
    }

    // Метод для тестирования окна проигрыша
    testGameOver() {
        this.handleGameOver();
    }

    // Добавляем метод для старта игры
    startGame() {
        this.gameStarted = true;
    }

    // Обновляем метод resetGame
    resetGame() {
        this.board = Array(this.size).fill().map(() => Array(this.size).fill(null));
        this.gameStarted = true;
        
        // Очищаем поле
        const cells = this.element.getElementsByClassName('cell');
        Array.from(cells).forEach(cell => {
            while (cell.firstChild) {
                cell.firstChild.remove();
            }
        });

        // Сбрасываем счет
        if (window.game) {
            window.game.score = 0;
            const scoreElement = document.getElementById('score');
            if (scoreElement) {
                scoreElement.textContent = '0';
            }
        }

        // Скрываем модальное окно
        const gameOverModal = document.getElementById('gameOver');
        if (gameOverModal) {
            gameOverModal.style.display = 'none';
        }

        // Перезапускаем интервал проверки окончания игры
        if (this.checkGameOverInterval) {
            clearInterval(this.checkGameOverInterval);
        }
        this.checkGameOverInterval = setInterval(() => {
            if (this.gameStarted && this.blockGenerator) {
                const hasEmptyCells = this.hasEmptyCells();
                const hasValidMoves = this.blockGenerator.generatedBlocks.some(block => {
                    return this.canPlaceBlockAnywhere(block);
                });

                if (!hasEmptyCells && !hasValidMoves) {
                    this.handleGameOver();
                }
            }
        }, 1000);
    }

    setupTouchEvents() {
        if (!this.isTouchDevice) return;

        let touchBlock = null;
        let lastHighlightedPosition = null;
        let startX, startY;

        // Обработчик начала касания
        this.element.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const block = e.target.closest('.block');
            
            if (block) {
                e.preventDefault();
                startX = touch.clientX;
                startY = touch.clientY;
                touchBlock = block;
                
                // Сразу начинаем перетаскивание
                touchBlock.classList.add('dragging');
                touchBlock.style.opacity = '0.7';
                
                try {
                    this.currentDragData = JSON.parse(block.dataset.blockData || '{}');
                    if (!this.currentDragData.shape) {
                        this.currentDragData = {
                            color: block.dataset.color,
                            shape: JSON.parse(block.dataset.shape || '[[1]]')
                        };
                    }
                } catch (error) {
                    console.error('Ошибка при получении данных блока:', error);
                }
            }
        }, { passive: false });

        // Обработчик перемещения
        this.element.addEventListener('touchmove', (e) => {
            if (!touchBlock || !this.currentDragData) return;
            
            e.preventDefault();
            const touch = e.touches[0];
            const boardRect = this.element.getBoundingClientRect();
            
            // Вычисляем позицию относительно игрового поля
            const x = touch.clientX - boardRect.left;
            const y = touch.clientY - boardRect.top;
            
            // Определяем ячейку под пальцем с учетом размера блока
            const cellSize = boardRect.width / this.size;
            const shape = this.currentDragData.shape;
            
            // Учитываем смещение для центрирования блока
            const offsetX = (shape[0].length * cellSize) / 2;
            const offsetY = (shape.length * cellSize) / 2;
            
            const row = Math.floor((y - offsetY + cellSize/2) / cellSize);
            const col = Math.floor((x - offsetX + cellSize/2) / cellSize);
            
            // Проверяем, изменилась ли позиция
            const newPosition = `${row},${col}`;
            if (lastHighlightedPosition !== newPosition) {
                this.clearHighlight();
                
                // Ищем ближайшую валидную позицию
                const validPosition = this.findNearestValidPosition(row, col, shape);
                if (validPosition) {
                    this.highlightCells(validPosition.row, validPosition.col, shape);
                    lastHighlightedPosition = newPosition;
                    this.currentValidPosition = validPosition;
                } else {
                    this.currentValidPosition = null;
                }
            }
        }, { passive: false });

        // Обработчик окончания касания
        this.element.addEventListener('touchend', (e) => {
            if (!touchBlock || !this.currentDragData) return;
            
            if (this.currentValidPosition) {
                const { row, col } = this.currentValidPosition;
                this.placeBlock(row, col, this.currentDragData.color, this.currentDragData.shape);
                if (this.blockGenerator) {
                    this.blockGenerator.removeBlock(touchBlock);
                }
            }

            // Очищаем состояние
            this.clearHighlight();
            if (touchBlock) {
                touchBlock.style.opacity = '1';
                touchBlock.classList.remove('dragging');
            }
            this.currentDragData = null;
            this.currentValidPosition = null;
            lastHighlightedPosition = null;
            touchBlock = null;
        });

        // Обработчик отмены касания
        this.element.addEventListener('touchcancel', () => {
            this.clearHighlight();
            if (touchBlock) {
                touchBlock.style.opacity = '1';
                touchBlock.classList.remove('dragging');
            }
            this.currentDragData = null;
            this.currentValidPosition = null;
            lastHighlightedPosition = null;
            touchBlock = null;
        });
    }

    // Добавляем новый метод для тестирования
    testMatchSequence(row, col, length, color) {
        this.log(`Тестовое заполнение: ряд ${row}, начиная с колонки ${col}, длина ${length}, цвет ${color}`);
        
        // Проверяем валидность параметров
        if (row < 0 || row >= this.size || col < 0 || col + length > this.size) {
            this.log('Ошибка: невалидные координаты');
            return;
        }

        // Заполняем ряд блоками
        for (let i = 0; i < length; i++) {
            const cell = this.element.children[this.getCellIndex(row, col + i)];
            // Удаляем существующий блок, если есть
            while (cell.firstChild) {
                cell.firstChild.remove();
            }
            const block = document.createElement('div');
            block.className = `block-segment ${color}`;
            cell.appendChild(block);
            this.board[row][col + i] = color;
        }

        // Проверяем совпадения
        setTimeout(() => this.checkMatches(), 100);
    }

    isEmptyBoard() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.board[row][col] !== null) {
                    return false;
                }
            }
        }
        return true;
    }
}

export { GameBoard }; 