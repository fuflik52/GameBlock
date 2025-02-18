// Функции для тестирования
window.testMatch = async (row, col, length, color) => {
    if (window.game && window.game.gameBoard) {
        const board = window.game.gameBoard;
        
        // Заполняем ряд блоками напрямую
        for (let i = 0; i < length; i++) {
            const cellIndex = board.getCellIndex(row, col + i);
            const cell = board.element.children[cellIndex];
            
            // Удаляем существующий блок, если есть
            while (cell.firstChild) {
                cell.firstChild.remove();
            }
            
            // Создаем новый блок
            const block = document.createElement('div');
            block.className = `block-segment ${color}`;
            cell.appendChild(block);
            board.board[row][col + i] = color;
        }
        
        // Проверяем совпадения и ждем завершения анимации
        const matches = board.findMatches();
        if (matches.length > 0) {
            // Добавляем класс анимации для совпадающих блоков
            matches.forEach(match => {
                const cell = board.element.children[board.getCellIndex(match.row, match.col)];
                const block = cell.querySelector('.block-segment');
                if (block) {
                    block.classList.add('matching');
                }
            });

            // Ждем завершения анимации
            await new Promise(resolve => setTimeout(resolve, 600));

            // Удаляем блоки и обновляем счет
            matches.forEach(match => {
                const cell = board.element.children[board.getCellIndex(match.row, match.col)];
                const block = cell.querySelector('.block-segment');
                if (block) {
                    block.remove();
                }
                board.board[match.row][match.col] = null;
            });

            // Обновляем счет с анимацией
            if (window.game) {
                const points = matches.length * 10;
                const scoreElement = document.getElementById('score');
                const currentScore = parseInt(scoreElement.textContent);
                const targetScore = currentScore + points;
                
                // Добавляем класс анимации
                scoreElement.classList.add('updating');
                
                // Анимируем изменение счета
                const duration = 1000; // 1 секунда
                const start = performance.now();
                
                const animate = (currentTime) => {
                    const elapsed = currentTime - start;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    const currentValue = Math.floor(currentScore + (points * progress));
                    scoreElement.textContent = currentValue;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        // Убираем класс анимации
                        setTimeout(() => {
                            scoreElement.classList.remove('updating');
                        }, 200);
                    }
                };
                
                requestAnimationFrame(animate);
                window.game.score = targetScore;
            }
        }
    } else {
        console.error('Игра не инициализирована. Пожалуйста, начните игру, нажав кнопку Classic');
    }
};

// Добавляем функцию для тестирования разных цветов
window.testColors = async (row) => {
    const colors = ['red', 'blue', 'yellow', 'purple', 'green'];
    for (let i = 0; i < colors.length; i++) {
        await testMatch(row, i * 3, 3, colors[i]);
        // Небольшая задержка между созданием групп блоков
        await new Promise(resolve => setTimeout(resolve, 200));
    }
};

window.testGameOver = () => {
    if (window.game && window.game.gameBoard) {
        window.game.gameBoard.handleGameOver();
    } else {
        console.error('Игра не инициализирована');
    }
}; 