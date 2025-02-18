const COLORS = {
    red: 'rgb(255, 68, 68)',
    blue: 'rgb(68, 68, 255)',
    green: 'rgb(68, 255, 68)',
    yellow: 'rgb(255, 255, 68)',
    purple: 'rgb(255, 68, 255)',
    orange: 'rgb(255, 165, 0)',
    cyan: 'rgb(68, 255, 255)',
    lime: 'rgb(204, 255, 68)'
};

class BlockGenerator {
    constructor() {
        this.container = document.getElementById('blocksGenerator');
        this.generatedBlocks = [];
        this.colors = Object.keys(COLORS);
        this.blockSize = 40;
        this.gameBoard = null;
        
        // Определяем различные типы блоков
        this.blockTypes = [
            // Маленькие блоки
            { shape: [[1]], size: 1 },  // одиночный
            { shape: [[1, 1]], size: 2 },  // горизонтальный из 2
            { shape: [[1], [1]], size: 2 },  // вертикальный из 2
            
            // Средние блоки
            { shape: [[1, 1, 1]], size: 3 },  // горизонтальный из 3
            { shape: [[1], [1], [1]], size: 3 },  // вертикальный из 3
            { shape: [[1, 1], [1, 1]], size: 4 },  // квадрат 2x2
            
            // L-образные блоки
            { shape: [[1, 0], [1, 1]], size: 3 },  // L-форма
            { shape: [[0, 1], [1, 1]], size: 3 },  // обратная L-форма
            { shape: [[1, 1], [1, 0]], size: 3 },  // перевернутая L-форма
            { shape: [[1, 1], [0, 1]], size: 3 },  // перевернутая обратная L-форма
            
            // T-образные блоки
            { shape: [[1, 1, 1], [0, 1, 0]], size: 4 },  // T-форма
            { shape: [[0, 1, 0], [1, 1, 1]], size: 4 },  // перевернутая T-форма
            
            // Большие блоки
            { shape: [[1, 1, 1, 1]], size: 4 },  // горизонтальный из 4
            { shape: [[1], [1], [1], [1]], size: 4 },  // вертикальный из 4
        ];

        this.setupStyles();
    }

    setupStyles() {
        // Добавляем стили для блоков
        const style = document.createElement('style');
        style.textContent = Object.entries(COLORS).map(([name, rgb]) => `
            .block-segment.${name} {
                background-color: ${rgb};
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
        `).join('\n');
        document.head.appendChild(style);
    }

    setGameBoard(gameBoard) {
        this.gameBoard = gameBoard;
    }

    generateBlocks(count = 3) {
        this.generatedBlocks = [];
        this.container.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const block = document.createElement('div');
            const color = this.getRandomColor();
            const blockType = this.getRandomBlockType();
            
            block.className = 'block pop-in';
            block.dataset.color = color;
            block.dataset.shape = JSON.stringify(blockType.shape);
            
            // Устанавливаем размер блока в зависимости от его формы
            const blockWidth = this.blockSize * blockType.shape[0].length;
            const blockHeight = this.blockSize * blockType.shape.length;
            
            block.style.width = `${blockWidth}px`;
            block.style.height = `${blockHeight}px`;
            block.style.display = 'grid';
            block.style.gridTemplateColumns = `repeat(${blockType.shape[0].length}, 1fr)`;
            block.style.gap = '1px';
            
            // Создаем сегменты блока согласно форме
            for (let row = 0; row < blockType.shape.length; row++) {
                for (let col = 0; col < blockType.shape[0].length; col++) {
                    if (blockType.shape[row][col] === 1) {
                        const segment = document.createElement('div');
                        segment.className = `block-segment ${color}`;
                        block.appendChild(segment);
                    } else {
                        // Создаем пустой сегмент для сохранения формы
                        const empty = document.createElement('div');
                        empty.style.visibility = 'hidden';
                        block.appendChild(empty);
                    }
                }
            }
            
            block.draggable = true;
            block.addEventListener('dragstart', this.handleDragStart.bind(this));
            block.addEventListener('dragend', this.handleDragEnd.bind(this));
            
            this.container.appendChild(block);
            this.generatedBlocks.push({
                element: block,
                color: color,
                shape: blockType.shape
            });
        }
    }

    getRandomColor() {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    getRandomBlockType() {
        return this.blockTypes[Math.floor(Math.random() * this.blockTypes.length)];
    }

    handleDragStart(e) {
        const block = e.target.closest('.block');
        if (!block) return;

        block.classList.add('dragging');
        const blockData = {
            color: block.dataset.color,
            shape: JSON.parse(block.dataset.shape || '[[1]]')
        };

        // Устанавливаем данные для перетаскивания
        e.dataTransfer.setData('text/plain', JSON.stringify(blockData));
        
        // Устанавливаем данные в gameBoard
        if (this.gameBoard) {
            this.gameBoard.currentDragData = blockData;
        }
        
        // Устанавливаем изображение для перетаскивания
        const dragImage = block.cloneNode(true);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        document.body.appendChild(dragImage);
        
        // Центрируем точку перетаскивания
        const rect = block.getBoundingClientRect();
        e.dataTransfer.setDragImage(
            dragImage,
            rect.width / 2,
            rect.height / 2
        );
        
        // Удаляем клон после начала перетаскивания
        setTimeout(() => {
            document.body.removeChild(dragImage);
        }, 0);
        
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        const block = e.target.closest('.block');
        if (block) {
            block.classList.remove('dragging');
        }
        
        // Очищаем данные перетаскивания в gameBoard
        if (this.gameBoard) {
            this.gameBoard.currentDragData = null;
            this.gameBoard.clearHighlight();
        }
    }

    removeBlock(block) {
        const index = this.generatedBlocks.findIndex(b => b.element === block);
        if (index !== -1) {
            block.remove();
            this.generatedBlocks.splice(index, 1);
            
            // Если все блоки использованы, генерируем новые
            if (this.generatedBlocks.length === 0) {
                setTimeout(() => {
                    this.generateBlocks(3);
                }, 300); // Небольшая задержка для анимации
            }
        }
    }

    hasAvailableBlocks() {
        return this.generatedBlocks.length > 0;
    }

    getAvailableColors() {
        return this.generatedBlocks.map(block => block.color);
    }
}

export { BlockGenerator }; 