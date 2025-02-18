class GameBoard {
    constructor(size = 8) {
        this.size = size;
        this.board = Array(size).fill().map(() => Array(size).fill(null));
        this.element = document.getElementById('gameBoard');
        this.setupBoard();
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
        const cell = e.target;
        if (!cell.classList.contains('cell')) return;

        const blockData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const shape = blockData.shape;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (this.isValidMove(row, col, shape)) {
            e.dataTransfer.dropEffect = 'move';
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const cell = e.target;
        if (!cell.classList.contains('cell')) return;

        const blockData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const color = blockData.color;
        const shape = blockData.shape;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (this.isValidMove(row, col, shape)) {
            this.placeBlock(row, col, color, shape);
            this.checkMatches();
            return true;
        }
        return false;
    }

    isValidMove(row, col, shape) {
        // Проверяем, не выходит ли блок за пределы поля
        if (row < 0 || col < 0) return false;
        if (row + shape.length > this.size) return false;
        if (col + shape[0].length > this.size) return false;

        // Проверяем, свободны ли все ячейки под блоком
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[0].length; j++) {
                if (shape[i][j] === 1 && this.board[row + i][col + j] !== null) {
                    return false;
                }
            }
        }

        return true;
    }

    placeBlock(row, col, color, shape) {
        // Размещаем блок на поле
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[0].length; j++) {
                if (shape[i][j] === 1) {
                    const cell = this.element.children[this.getCellIndex(row + i, col + j)];
                    const block = document.createElement('div');
                    block.className = `block ${color}`;
                    cell.appendChild(block);
                    this.board[row + i][col + j] = color;
                }
            }
        }
    }

    getCellIndex(row, col) {
        return row * this.size + col;
    }

    // ... остальной код остается без изменений ...
}

// Экспорт класса
export { GameBoard };
// ... existing code ... 